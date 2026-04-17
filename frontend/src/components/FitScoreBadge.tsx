import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Info } from 'lucide-react'

interface Props {
  score: number
}

const verdict = (s: number) => (s >= 88 ? 'Excellent' : s >= 72 ? 'Good' : s >= 58 ? 'Fair' : 'Tight')

export default function FitScoreBadge({ score }: Props) {
  const v = verdict(score)
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="glass rounded-xl px-4 py-3 shadow-float flex items-center gap-3 cursor-help animate-scale-in">
            <div className="flex items-baseline gap-1">
              <span className="font-display text-3xl font-semibold leading-none tabular-nums text-foreground">
                {score}
              </span>
              <span className="text-xs text-muted-foreground">/100</span>
            </div>
            <div className="h-8 w-px bg-border" />
            <div className="flex flex-col">
              <span className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Fit</span>
              <span className="text-sm font-medium text-foreground flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                {v}
              </span>
            </div>
            <Info className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs text-xs leading-relaxed">
          Fit Score blends your measurements — interpupillary distance, temple width, and bridge — against this frame's specs. Above 80 means it should sit comfortably without pinching or sliding.
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
