import type { Frame } from '@/data/frames'

interface Props {
  frame: Frame | null
  /** Width in px, scales the overlay around the eye area. */
  width?: number
}

/**
 * Lightweight SVG glasses — used as thumbnails in the FrameDock.
 * On /try-on the real AR overlay is drawn by Jeeliz, not this component.
 */
export default function GlassesOverlay({ frame, width = 260 }: Props) {
  if (!frame) return null
  const c = frame.color
  const stroke = 6
  const h = 90
  const w = 260
  const lensFill = 'rgba(20,20,20,0.18)'

  const renderLenses = () => {
    switch (frame.svgStyle) {
      case 'round':
        return (
          <>
            <circle cx="70" cy="48" r="42" fill={lensFill} stroke={c} strokeWidth={stroke} />
            <circle cx="190" cy="48" r="42" fill={lensFill} stroke={c} strokeWidth={stroke} />
          </>
        )
      case 'rect':
        return (
          <>
            <rect x="20" y="14" width="100" height="68" rx="14" fill={lensFill} stroke={c} strokeWidth={stroke} />
            <rect x="140" y="14" width="100" height="68" rx="14" fill={lensFill} stroke={c} strokeWidth={stroke} />
          </>
        )
      case 'cat':
        return (
          <>
            <path d="M14,52 Q22,14 70,14 Q120,14 122,42 Q120,84 70,82 Q24,82 14,52 Z" fill={lensFill} stroke={c} strokeWidth={stroke} strokeLinejoin="round" />
            <path d="M138,42 Q140,14 190,14 Q238,14 246,52 Q236,82 190,82 Q140,84 138,42 Z" fill={lensFill} stroke={c} strokeWidth={stroke} strokeLinejoin="round" />
          </>
        )
      case 'aviator':
        return (
          <>
            <path d="M16,30 Q22,16 70,16 Q118,16 124,40 L118,76 Q90,90 60,86 Q30,80 18,60 Z" fill={lensFill} stroke={c} strokeWidth={stroke} strokeLinejoin="round" />
            <path d="M136,40 Q142,16 190,16 Q238,16 244,30 L242,60 Q230,80 200,86 Q170,90 142,76 Z" fill={lensFill} stroke={c} strokeWidth={stroke} strokeLinejoin="round" />
          </>
        )
      case 'browline':
        return (
          <>
            <path d="M14,32 Q24,12 70,12 Q116,12 124,32" fill="none" stroke={c} strokeWidth={stroke + 4} strokeLinecap="round" />
            <path d="M136,32 Q144,12 190,12 Q236,12 246,32" fill="none" stroke={c} strokeWidth={stroke + 4} strokeLinecap="round" />
            <path d="M18,34 Q22,80 70,82 Q118,80 122,40" fill={lensFill} stroke={c} strokeWidth={stroke - 2} />
            <path d="M138,40 Q142,80 190,82 Q238,80 242,34" fill={lensFill} stroke={c} strokeWidth={stroke - 2} />
          </>
        )
      case 'geo':
        return (
          <>
            <polygon points="20,18 122,18 116,80 26,80" fill={lensFill} stroke={c} strokeWidth={stroke} strokeLinejoin="round" />
            <polygon points="140,18 242,18 236,80 146,80" fill={lensFill} stroke={c} strokeWidth={stroke} strokeLinejoin="round" />
          </>
        )
      default:
        return null
    }
  }

  return (
    <svg
      width={width}
      height={(width * h) / w}
      viewBox={`0 0 ${w} ${h}`}
      className="pointer-events-none drop-shadow-[0_4px_8px_rgba(0,0,0,0.18)]"
      aria-hidden
    >
      <line x1="118" y1="46" x2="142" y2="46" stroke={c} strokeWidth={stroke} strokeLinecap="round" />
      <line x1="6" y1="44" x2="-2" y2="38" stroke={c} strokeWidth={stroke} strokeLinecap="round" />
      <line x1="254" y1="44" x2="262" y2="38" stroke={c} strokeWidth={stroke} strokeLinecap="round" />
      {renderLenses()}
    </svg>
  )
}
