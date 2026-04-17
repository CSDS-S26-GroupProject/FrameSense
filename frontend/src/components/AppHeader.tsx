import { Link, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'

interface AppHeaderProps {
  variant?: 'light' | 'overlay'
}

export default function AppHeader({ variant = 'light' }: AppHeaderProps) {
  const { pathname } = useLocation()
  const overlay = variant === 'overlay'

  return (
    <header
      className={cn(
        'fixed top-0 left-0 right-0 z-50 h-16 px-6 md:px-10 flex items-center justify-between',
        overlay ? 'glass border-b border-white/40' : 'bg-background/80 backdrop-blur border-b hairline',
      )}
    >
      <Link to="/" className="flex items-center gap-2 group">
        <span className="font-display text-lg font-semibold tracking-tight">FrameSense</span>
        <span className="hidden sm:inline-block text-[10px] uppercase tracking-[0.18em] text-muted-foreground mt-0.5">
          Eyewear, fitted.
        </span>
      </Link>

      <nav className="flex items-center gap-1 text-sm">
        {pathname !== '/try-on' && (
          <Link
            to="/try-on"
            className="hidden sm:inline-flex px-3 py-1.5 text-muted-foreground hover:text-foreground transition-colors"
          >
            Browse frames
          </Link>
        )}
      </nav>
    </header>
  )
}
