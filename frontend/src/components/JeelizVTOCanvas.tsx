import { useRef, useEffect } from 'react'
// @ts-expect-error — jeelizvtowidget ships no type definitions
import { JEELIZVTOWIDGET } from 'jeelizvtowidget'
import { useFSStore } from '../store/useFSStore'

const DEFAULT_SKU = 'rayban_aviator_or_vertFlash'

export default function JeelizVTOCanvas() {
  const placeHolderRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const isStartedRef = useRef(false)

  const selectedId = useFSStore((s) => s.selectedGlassesId)
  const catalog = useFSStore((s) => s.catalog)

  useEffect(() => {
    if (isStartedRef.current) return
    if (!placeHolderRef.current || !canvasRef.current) return
    isStartedRef.current = true

    JEELIZVTOWIDGET.start({
      placeHolder: placeHolderRef.current,
      canvas: canvasRef.current,
      sku: DEFAULT_SKU,
      searchImageColor: 0xeeeeee,
      searchImageRotationSpeed: -0.001,
      callbacks: {
        ADJUST_START: null,
        ADJUST_END: null,
        LOADING_START: null,
        LOADING_END: null,
      },
      callbackReady: () => console.log('[Jeeliz] widget ready'),
      onError: (errorLabel: string) => console.error('[Jeeliz]', errorLabel),
    })

    return () => {
      isStartedRef.current = false
      JEELIZVTOWIDGET.destroy()
    }
  }, [])

  useEffect(() => {
    if (!isStartedRef.current || !selectedId) return
    const frame = catalog.find((f) => f.id === selectedId)
    if (frame?.jeelizSku) JEELIZVTOWIDGET.load(frame.jeelizSku)
  }, [selectedId, catalog])

  return (
    <div ref={placeHolderRef} className="jeeliz-widget">
      <canvas ref={canvasRef} className="jeeliz-canvas" />
    </div>
  )
}
