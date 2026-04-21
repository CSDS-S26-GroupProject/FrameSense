import { useCallback, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, RotateCcw } from 'lucide-react'
import AppHeader from '@/components/AppHeader'
import WebcamView from '@/components/WebcamView'
import { faceShapes } from '@/data/frames'
import { useMediaPipe } from '@/hooks/useMediaPipe'
import { useAutoFaceShape } from '@/hooks/useAutoFaceShape'
import { useFSStore } from '@/store/useFSStore'

const Scan = () => {
  const navigate = useNavigate()
  const videoRef = useRef<HTMLVideoElement>(null)
  useMediaPipe(videoRef, { acquireStream: false })
  const { status, rescan } = useAutoFaceShape(videoRef)
  const faceShape = useFSStore((s) => s.faceShape)

  useEffect(() => {
    useFSStore.getState().setFaceShape(null)
  }, [])

  const handleRescan = useCallback(() => {
    useFSStore.getState().setFaceShape(null)
    rescan()
  }, [rescan])

  const scanning = status === 'detecting' || status === 'capturing'
  const done = status === 'done' && faceShape !== null
  const failed = status === 'error'

  const handleStart = () => {
    const shape = useFSStore.getState().faceShape
    if (!shape) return
    sessionStorage.setItem('framesense.faceShape', shape)
    navigate('/try-on')
  }

  return (
    <div className="h-screen flex flex-col bg-foreground">
      <AppHeader variant="overlay" />

      <main className="flex-1 pt-16 relative">
        <WebcamView className="absolute inset-0" mirror videoRef={videoRef}>
          {/* Hidden video element MediaPipe reads from; WebcamView shares its stream here */}
          <video ref={videoRef} autoPlay playsInline muted className="camera-video-hidden" />
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="relative" style={{ width: 'min(58vh, 380px)', height: 'min(72vh, 480px)' }}>
              <div className="absolute inset-0 rounded-[50%] border border-white/40" />
              <div className="absolute -inset-2 rounded-[50%] border border-white/10" />
              {[
                'top-0 left-1/2 -translate-x-1/2 -translate-y-1/2',
                'bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2',
                'left-0 top-1/2 -translate-y-1/2 -translate-x-1/2',
                'right-0 top-1/2 -translate-y-1/2 translate-x-1/2',
              ].map((c, i) => (
                <span key={i} className={`absolute h-2 w-2 bg-white/80 ${c}`} />
              ))}
              {scanning && (
                <div className="absolute inset-0 rounded-[50%] overflow-hidden">
                  <div className="absolute inset-0 scan-sweep" />
                </div>
              )}
            </div>
          </div>

          <div className="absolute top-24 left-1/2 -translate-x-1/2">
            <div className="glass-dark rounded-full px-4 py-1.5 text-[11px] uppercase tracking-[0.22em] text-white/90 flex items-center gap-2">
              {status === 'capturing' ? (
                <>
                  <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
                  Analyzing…
                </>
              ) : scanning ? (
                <>
                  <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
                  Reading your face
                </>
              ) : done ? (
                <>
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  Scan complete
                </>
              ) : failed ? (
                <>
                  <span className="h-1.5 w-1.5 rounded-full bg-destructive" />
                  Scan failed
                </>
              ) : (
                <>
                  <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
                  Reading your face
                </>
              )}
            </div>
          </div>

          {done && faceShape && (
            <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-[min(560px,calc(100%-2rem))] animate-fade-in-up">
              <div className="bg-background rounded-2xl shadow-float p-6 md:p-8">
                <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-2">Detected face shape</p>
                <div className="flex items-end justify-between gap-4 mb-4">
                  <h2 className="font-display text-4xl md:text-5xl font-semibold tracking-tight">
                    {faceShapes[faceShape].name}
                  </h2>
                  <span className="text-xs text-muted-foreground tabular-nums pb-2">confidence · high</span>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed mb-2">
                  {faceShapes[faceShape].description}
                </p>
                <p className="text-sm text-foreground leading-relaxed mb-6">
                  <span className="text-accent font-medium">Recommended:</span> {faceShapes[faceShape].recommends}
                </p>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={handleStart}
                    className="group flex-1 inline-flex items-center justify-center gap-2 h-11 px-5 rounded-full bg-foreground text-background text-sm font-medium hover:bg-foreground/90 transition-all"
                  >
                    Start trying on
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </button>
                  <button
                    type="button"
                    onClick={handleRescan}
                    className="inline-flex items-center justify-center gap-2 h-11 px-5 rounded-full border hairline text-sm text-foreground hover:bg-secondary transition-colors"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Re-scan
                  </button>
                </div>
              </div>
            </div>
          )}

          {failed && (
            <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-[min(560px,calc(100%-2rem))] animate-fade-in-up">
              <div className="bg-background rounded-2xl shadow-float p-6 md:p-8 text-left">
                <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-2">Face shape</p>
                <h2 className="font-display text-2xl font-semibold tracking-tight mb-2">Couldn&apos;t analyze</h2>
                <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                  Start the face-shape API on{' '}
                  <code className="text-xs bg-secondary px-1 py-0.5 rounded">localhost:5001</code> and try again.
                </p>
                <button
                  type="button"
                  onClick={handleRescan}
                  className="inline-flex items-center justify-center gap-2 h-11 px-5 rounded-full bg-foreground text-background text-sm font-medium hover:bg-foreground/90 transition-all"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Try again
                </button>
              </div>
            </div>
          )}
        </WebcamView>
      </main>
    </div>
  )
}

export default Scan
