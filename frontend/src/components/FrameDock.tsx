import { useMemo, useState } from 'react'
import { ChevronDown, Search, RotateCcw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { faceShapes, frames as allFrames, type FaceShape, type Frame } from '@/data/frames'
import GlassesOverlay from './GlassesOverlay'

interface Props {
  faceShape: FaceShape | null
  selectedId: string | null
  onSelect: (f: Frame) => void
  onRescan: () => void
}

const MATERIALS = ['all', 'acetate', 'titanium', 'wood', 'recycled'] as const

export default function FrameDock({ faceShape, selectedId, onSelect, onRescan }: Props) {
  const [query, setQuery] = useState('')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [material, setMaterial] = useState<(typeof MATERIALS)[number]>('all')
  const [maxPrice, setMaxPrice] = useState<number>(400)

  const shape = faceShape ? faceShapes[faceShape] : null

  const filtered = useMemo(() => {
    return allFrames
      .filter((f) => (material === 'all' ? true : f.material === material))
      .filter((f) => f.priceFrom <= maxPrice)
      .filter((f) =>
        query.trim() === ''
          ? true
          : (f.name + ' ' + f.maker).toLowerCase().includes(query.toLowerCase()),
      )
      .sort((a, b) => {
        if (!faceShape) return 0
        const aRec = a.recommendedShapes.includes(faceShape) ? 0 : 1
        const bRec = b.recommendedShapes.includes(faceShape) ? 0 : 1
        return aRec - bRec
      })
  }, [query, material, maxPrice, faceShape])

  return (
    <aside className="h-full w-full bg-background border-l hairline flex flex-col">
      {/* Face shape card */}
      <div className="p-5 border-b hairline">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-1">Your face shape</p>
            <h2 className="font-display text-2xl font-semibold leading-tight">
              {shape?.name ?? 'Not scanned'}
            </h2>
          </div>
          {faceShape && <FaceShapeGlyph shape={faceShape} />}
        </div>
        <p className="text-sm text-muted-foreground mt-3 leading-relaxed">
          {shape?.description ?? 'Run a face scan to personalize frame recommendations.'}
        </p>
        <button
          onClick={onRescan}
          className="mt-4 inline-flex items-center gap-1.5 text-xs text-foreground hover:text-accent transition-colors"
        >
          <RotateCcw className="h-3 w-3" /> {faceShape ? 'Re-scan' : 'Scan face'}
        </button>
      </div>

      {/* Search + filters */}
      <div className="p-4 border-b hairline space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search frames or makers"
            className="w-full h-9 pl-9 pr-3 rounded-md bg-secondary text-sm placeholder:text-muted-foreground border border-transparent focus:bg-background focus:border-border focus:outline-none transition-colors"
          />
        </div>
        <button
          onClick={() => setFiltersOpen((v) => !v)}
          className="w-full flex items-center justify-between text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <span className="uppercase tracking-[0.16em]">Filters</span>
          <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', filtersOpen && 'rotate-180')} />
        </button>
        {filtersOpen && (
          <div className="space-y-3 pt-1 animate-fade-in">
            <div>
              <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground mb-1.5">Material</p>
              <div className="flex flex-wrap gap-1.5">
                {MATERIALS.map((m) => (
                  <button
                    key={m}
                    onClick={() => setMaterial(m)}
                    className={cn(
                      'px-2.5 py-1 text-xs rounded-full border transition-colors',
                      material === m
                        ? 'bg-foreground text-background border-foreground'
                        : 'bg-background text-muted-foreground border-border hover:text-foreground',
                    )}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div className="flex justify-between text-[10px] uppercase tracking-[0.16em] text-muted-foreground mb-1.5">
                <span>Max price</span>
                <span className="text-foreground tabular-nums">${maxPrice}</span>
              </div>
              <input
                type="range"
                min={150}
                max={400}
                step={5}
                value={maxPrice}
                onChange={(e) => setMaxPrice(Number(e.target.value))}
                className="w-full accent-foreground"
              />
            </div>
          </div>
        )}
      </div>

      {/* Frame list */}
      <div className="flex-1 overflow-y-auto p-3 no-scrollbar">
        <p className="px-2 py-2 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          {faceShape
            ? `Recommended for you · ${filtered.filter((f) => f.recommendedShapes.includes(faceShape)).length}`
            : `All frames · ${filtered.length}`}
        </p>
        <ul className="space-y-1.5">
          {filtered.map((f) => {
            const recommended = faceShape ? f.recommendedShapes.includes(faceShape) : false
            const active = f.id === selectedId
            return (
              <li key={f.id}>
                <button
                  onClick={() => onSelect(f)}
                  className={cn(
                    'w-full text-left flex items-center gap-3 p-2.5 rounded-lg border transition-all group',
                    active
                      ? 'bg-secondary border-foreground/20'
                      : 'bg-background border-transparent hover:border-border hover:bg-secondary/50',
                  )}
                >
                  <div className="h-12 w-16 flex items-center justify-center rounded-md bg-secondary/70 shrink-0">
                    <GlassesOverlay frame={f} width={56} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-medium truncate">{f.name}</p>
                      {recommended && (
                        <span className="text-[9px] uppercase tracking-[0.14em] text-accent font-semibold shrink-0">
                          · Recommended
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{f.maker}</p>
                  </div>
                  <span className="text-xs text-muted-foreground tabular-nums shrink-0">${f.priceFrom}</span>
                </button>
              </li>
            )
          })}
        </ul>
      </div>
    </aside>
  )
}

function FaceShapeGlyph({ shape }: { shape: FaceShape }) {
  const paths: Record<FaceShape, string> = {
    oval: 'M24,8 C36,8 42,20 42,28 C42,40 34,48 24,48 C14,48 6,40 6,28 C6,20 12,8 24,8 Z',
    round: 'M24,6 C34,6 44,16 44,28 C44,40 34,50 24,50 C14,50 4,40 4,28 C4,16 14,6 24,6 Z',
    square: 'M10,10 L38,10 Q42,10 42,14 L42,40 Q42,46 36,48 L12,48 Q6,46 6,40 L6,14 Q6,10 10,10 Z',
    heart: 'M8,10 Q24,4 40,10 Q44,18 38,30 Q32,44 24,50 Q16,44 10,30 Q4,18 8,10 Z',
  }
  return (
    <svg width="36" height="42" viewBox="0 0 48 56" className="text-foreground/70">
      <path d={paths[shape]} fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}
