import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { RotateCcw } from 'lucide-react'
import AppHeader from '@/components/AppHeader'
import JeelizVTOCanvas from '@/components/JeelizVTOCanvas'
import FrameDock from '@/components/FrameDock'
import FitScoreBadge from '@/components/FitScoreBadge'
import PartnerCardRail from '@/components/PartnerCardRail'
import { faceShapes, frames, type Frame } from '@/data/frames'
import { useFSStore } from '@/store/useFSStore'
import { estimateFit } from '@/lib/estimateFit'
import type { FaceShape } from '@/types/contract'

const TryOn = () => {
  const navigate = useNavigate()

  const faceShape = useFSStore((s) => s.faceShape)
  const selectedId = useFSStore((s) => s.selectedGlassesId)
  const selectGlasses = useFSStore((s) => s.selectGlasses)

  const [guideVisible, setGuideVisible] = useState(true)

  useEffect(() => {
    const saved = sessionStorage.getItem('framesense.faceShape') as FaceShape | null
    if (saved && faceShapes[saved]) {
      useFSStore.getState().setFaceShape(saved)
    }
    const shape = useFSStore.getState().faceShape
    const initial =
      shape !== null
        ? (frames.find((f) => f.recommendedShapes.includes(shape)) ?? frames[0])
        : frames[0]
    useFSStore.getState().selectGlasses(initial.id)

    const t = window.setTimeout(() => setGuideVisible(false), 2400)
    return () => window.clearTimeout(t)
  }, [])

  const selected: Frame | null = frames.find((f) => f.id === selectedId) ?? frames[0] ?? null
  const shapeForUi: FaceShape = faceShape ?? 'oval'
  const fitScore = useMemo(() => (selected ? estimateFit(selected, faceShape) : null), [selected, faceShape])

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      <AppHeader />

      <main className="flex-1 pt-16 flex min-h-0">
        <section className="relative flex-1 min-w-0 p-4">
          <div className="relative h-full w-full rounded-2xl overflow-hidden shadow-soft bg-[#111]">
            <div className="absolute inset-0">
              <JeelizVTOCanvas />
            </div>

            <div className="absolute top-4 left-4 z-10">
              <button
                type="button"
                onClick={() => navigate('/scan')}
                className="glass-dark rounded-full pl-3 pr-2 py-1.5 text-[11px] uppercase tracking-[0.18em] text-white/90 flex items-center gap-2 hover:bg-black/60 transition-colors"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                {faceShapes[shapeForUi].name}
                <span className="text-white/40">·</span>
                <span className="inline-flex items-center gap-1 text-white/70">
                  <RotateCcw className="h-3 w-3" /> Re-scan
                </span>
              </button>
            </div>

            <div className="absolute top-4 right-4 z-10">
              {fitScore !== null ? (
                <FitScoreBadge score={fitScore} />
              ) : (
                <div className="glass rounded-xl px-4 py-3 shadow-float text-xs text-muted-foreground">
                  Measuring fit…
                </div>
              )}
            </div>

            <div
              className={`pointer-events-none absolute inset-0 z-[4] flex items-center justify-center transition-opacity duration-1000 ${
                guideVisible ? 'opacity-100' : 'opacity-0'
              }`}
            >
              <div
                className="rounded-[50%] border border-white/25"
                style={{ width: 'min(54vh, 360px)', height: 'min(68vh, 460px)' }}
              />
            </div>

            <PartnerCardRail frame={selected} />
          </div>
        </section>

        <div className="w-[340px] shrink-0 hidden lg:block h-[calc(100vh-4rem)]">
          <FrameDock
            faceShape={faceShape}
            selectedId={selectedId}
            onSelect={(f) => selectGlasses(f.id)}
            onRescan={() => navigate('/scan')}
          />
        </div>
      </main>
    </div>
  )
}

export default TryOn
