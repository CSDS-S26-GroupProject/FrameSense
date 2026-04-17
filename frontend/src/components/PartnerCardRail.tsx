import { ArrowUpRight, MapPin } from 'lucide-react'
import type { Frame } from '@/data/frames'

interface Props {
  frame: Frame | null
}

export default function PartnerCardRail({ frame }: Props) {
  if (!frame) return null
  const list = frame.partners ?? []
  if (list.length === 0) return null

  return (
    <div className="absolute left-0 right-0 bottom-0 px-4 pb-4 pointer-events-none">
      <div className="flex items-end gap-3 overflow-x-auto no-scrollbar pointer-events-auto pb-1">
        <div className="shrink-0 self-stretch flex flex-col justify-end pb-2 pr-1">
          <p className="text-[10px] uppercase tracking-[0.18em] text-white/70">Available at</p>
          <p className="font-display text-sm text-white">
            {list.length} {list.length === 1 ? 'maker' : 'makers'}
          </p>
        </div>
        {list.map((p, i) => (
          <article
            key={p.url}
            style={{ animationDelay: `${i * 60}ms` }}
            className="glass rounded-xl p-4 w-[260px] shrink-0 shadow-float animate-fade-in-up"
          >
            <div className="flex items-start justify-between gap-2 mb-1">
              <h3 className="font-display text-[15px] font-semibold leading-tight">{p.name}</h3>
              <span className="text-xs tabular-nums text-foreground shrink-0">${frame.priceFrom}</span>
            </div>
            {p.location && (
              <p className="flex items-center gap-1 text-[11px] text-muted-foreground mb-2">
                <MapPin className="h-3 w-3" /> {p.location}
              </p>
            )}
            <a
              href={p.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-medium text-foreground hover:text-accent transition-colors"
            >
              Visit shop <ArrowUpRight className="h-3.5 w-3.5" />
            </a>
          </article>
        ))}
      </div>
    </div>
  )
}
