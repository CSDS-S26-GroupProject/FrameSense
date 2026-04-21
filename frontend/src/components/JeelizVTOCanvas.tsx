import { useRef, useEffect, useState } from 'react'
// @ts-expect-error — jeelizvtowidget ships no type definitions
import { JEELIZVTOWIDGET } from 'jeelizvtowidget'
import { useFSStore } from '../store/useFSStore'

const FALLBACK_SKU = 'rayban_aviator_or_vertFlash'

// Jeeliz' start() is a SINGLETON. If we call start() twice (HMR, React 19
// strict-mode double-mount, or navigating back to /try-on), the second call
// silently calls resume() without firing callbackReady/LOADING_END/onError.
// That is why the component gets stuck on "Starting camera…" forever.
//
// We keep module-level state so re-mounts can short-circuit safely.
let widgetStarted = false
let startPromise: Promise<void> | null = null

// Errors from Jeeliz that genuinely block the camera / widget from running.
// INVALID_SKU is NOT fatal — the camera still works; it just means the
// requested glasses model wasn't in the catalog.
const FATAL_ERRORS = new Set([
  'PLACEHOLDER_NULL_WIDTH',
  'PLACEHOLDER_NULL_HEIGHT',
  'WEBCAM_UNAVAILABLE',
  'GL_INCOMPATIBLE',
  'GL_CONTEXT_LOST',
  'NO_ERROR_LABEL',
])

export default function JeelizVTOCanvas() {
  const placeHolderRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const [ready, setReady] = useState(widgetStarted)
  const [fatalError, setFatalError] = useState<string | null>(null)

  const selectedId = useFSStore((s) => s.selectedGlassesId)
  const catalog = useFSStore((s) => s.catalog)

  useEffect(() => {
    if (!placeHolderRef.current || !canvasRef.current) return

    let cancelled = false

    const firstFrame = selectedId ? catalog.find((f) => f.id === selectedId) : null
    const startSku = firstFrame?.jeelizSku ?? FALLBACK_SKU

    // If the widget is already alive from a previous mount, just make sure it
    // is resumed and we display the canvas. No need to call start() again.
    if (widgetStarted) {
      setReady(true)
      try {
        JEELIZVTOWIDGET.resume?.().catch(() => {})
      } catch {
        /* older jeeliz builds may not expose resume — safe to ignore */
      }
      if (firstFrame?.jeelizSku) {
        try {
          JEELIZVTOWIDGET.load(firstFrame.jeelizSku)
        } catch {
          /* ignore load errors here — they'll surface via onError next time */
        }
      }
      return
    }

    // First-time boot. Run once globally.
    if (!startPromise) {
      startPromise = new Promise<void>((resolve) => {
        JEELIZVTOWIDGET.start({
          placeHolder: placeHolderRef.current,
          canvas: canvasRef.current,
          sku: startSku,
          searchImageColor: 0x111111,
          searchImageRotationSpeed: -0.001,
          callbacks: {
            ADJUST_START: null,
            ADJUST_END: null,
            LOADING_START: null,
            LOADING_END: () => {
              widgetStarted = true
              if (!cancelled) setReady(true)
              resolve()
            },
          },
          callbackReady: () => {
            console.log('[Jeeliz] widget ready')
            widgetStarted = true
            if (!cancelled) setReady(true)
            resolve()
          },
          onError: (errorLabel: string) => {
            console.warn('[Jeeliz]', errorLabel)
            if (FATAL_ERRORS.has(errorLabel)) {
              if (!cancelled) setFatalError(errorLabel)
              resolve()
              return
            }
            // Non-fatal (INVALID_SKU etc.): camera still works.
            widgetStarted = true
            if (!cancelled) setReady(true)
            resolve()
          },
        })
      })
    }

    // Safety net: if Jeeliz never fires any callback (e.g. permission prompt
    // dismissed, WebGL context issue), release the spinner after 12s so the
    // user isn't stuck on "Starting camera…".
    const fallbackTimer = window.setTimeout(() => {
      if (!widgetStarted && !cancelled) {
        console.warn('[Jeeliz] startup timed out — releasing spinner')
        setReady(true)
      }
    }, 12_000)

    return () => {
      cancelled = true
      window.clearTimeout(fallbackTimer)
    }
  }, [selectedId, catalog])

  // Load the selected SKU whenever it changes (and the widget is actually up).
  useEffect(() => {
    if (!widgetStarted || !selectedId) return
    const frame = catalog.find((f) => f.id === selectedId)
    if (!frame?.jeelizSku) return
    try {
      JEELIZVTOWIDGET.load(frame.jeelizSku)
    } catch (err) {
      console.warn('[Jeeliz] load failed', err)
    }
  }, [selectedId, catalog, ready])

  return (
    <div ref={placeHolderRef} className="jeeliz-widget relative">
      <canvas ref={canvasRef} className="jeeliz-canvas" />

      {!ready && !fatalError && (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-3 text-white/80">
          <div className="h-10 w-10 rounded-full border border-white/30 border-t-white/90 animate-spin" />
          <p className="text-sm tracking-wide">Starting camera…</p>
        </div>
      )}

      {fatalError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white/80 px-6 text-center bg-black/70">
          <p className="font-display text-lg">Camera couldn&apos;t start</p>
          <p className="text-xs text-white/60 max-w-sm">
            Allow camera access in your browser, make sure no other app is using it, then reload the page.
          </p>
          <p className="text-[10px] text-white/40 mt-1 uppercase tracking-[0.18em]">{fatalError}</p>
        </div>
      )}
    </div>
  )
}
