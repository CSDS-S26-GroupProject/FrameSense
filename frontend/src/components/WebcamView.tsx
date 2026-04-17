import { useEffect, useRef, useState, type RefObject } from 'react'
import { cn } from '@/lib/utils'

interface Props {
  className?: string
  /** Mirror the video like a selfie. */
  mirror?: boolean
  /** Children render on top of the video (overlays). */
  children?: React.ReactNode
  /** Called once the stream is live. */
  onReady?: () => void
  /** When provided, the stream is also attached to this external video element
   *  so downstream hooks (MediaPipe, face-shape capture) can consume it. */
  videoRef?: RefObject<HTMLVideoElement | null>
}

export default function WebcamView({ className, mirror = true, children, onReady, videoRef: externalRef }: Props) {
  const internalRef = useRef<HTMLVideoElement>(null)
  const [status, setStatus] = useState<'idle' | 'ready' | 'denied' | 'error'>('idle')

  useEffect(() => {
    let stream: MediaStream | null = null
    let cancelled = false

    const start = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        })
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        if (internalRef.current) {
          internalRef.current.srcObject = stream
          await internalRef.current.play().catch(() => {})
        }
        // Mirror the stream onto an external ref so MediaPipe / face-shape
        // capture can read frames from the same source.
        if (externalRef?.current) {
          externalRef.current.srcObject = stream
          await externalRef.current.play().catch(() => {})
        }
        setStatus('ready')
        onReady?.()
      } catch (err) {
        const name = (err as DOMException)?.name
        setStatus(name === 'NotAllowedError' ? 'denied' : 'error')
      }
    }

    start()
    return () => {
      cancelled = true
      if (stream) stream.getTracks().forEach((t) => t.stop())
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className={cn('relative overflow-hidden bg-foreground', className)}>
      {/* Dedicated element for MediaPipe / face-capture when parent passes videoRef.
          Without this, the ref stays null and the stream is never attached there. */}
      {externalRef ? (
        <video
          ref={externalRef}
          playsInline
          muted
          className="camera-video-hidden"
          aria-hidden
        />
      ) : null}
      <video
        ref={internalRef}
        playsInline
        muted
        className={cn(
          'absolute inset-0 h-full w-full object-cover transition-opacity duration-700',
          status === 'ready' ? 'opacity-100' : 'opacity-0',
          mirror && 'scale-x-[-1]',
        )}
      />

      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_55%,rgba(0,0,0,0.35)_100%)]" />

      {status !== 'ready' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-white/80 gap-4">
          {status === 'idle' && (
            <>
              <div className="h-10 w-10 rounded-full border border-white/30 border-t-white/90 animate-spin" />
              <p className="text-sm tracking-wide">Waking the camera…</p>
            </>
          )}
          {status === 'denied' && (
            <div className="max-w-sm text-center px-6">
              <p className="font-display text-lg mb-2">Camera permission needed</p>
              <p className="text-sm text-white/60">
                FrameSense uses your webcam locally to show you wearing each pair. Nothing leaves your device.
              </p>
            </div>
          )}
          {status === 'error' && <p className="text-sm text-white/70">Couldn't start your camera.</p>}
        </div>
      )}

      {children}
    </div>
  )
}
