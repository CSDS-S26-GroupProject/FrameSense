import { useFSStore } from '../store/useFSStore'
import styleMappings from '../data/frame_style_mappings.json'

const frameStyleMap = styleMappings as Record<string, { compatibleFaceShapes: string[] }>

function isRecommended(style: string, faceShape: string | null): boolean {
    if (!faceShape) return false
    const mapping = frameStyleMap[style.toLowerCase()]
    if (!mapping) return false
    return mapping.compatibleFaceShapes.includes(faceShape.toLowerCase())
}

export default function GlassesSidebar() {
    const catalog = useFSStore((s) => s.catalog)
    const selectedId = useFSStore((s) => s.selectedGlassesId)
    const selectGlasses = useFSStore((s) => s.selectGlasses)
    const faceShape    = useFSStore((s) => s.faceShape)

    //sorted is the sorting for whether or not a user's face shape has been analyzed
    //if faceShape exists, sort the recommended frames by the style 
    //if no faceShape, keep standard catalog order
    const sorted = faceShape
        ? [...catalog].sort((a, b) => {
            const aMatch = isRecommended(a.style, faceShape) ? -1 : 1
            const bMatch = isRecommended(b.style, faceShape) ? -1 : 1
            return aMatch - bMatch
        })
        : catalog

       return (
        <aside className="sidebar">
            <div className="sidebar-header">
                Frames
                {faceShape && (
                    <span style={{
                        fontWeight: 'normal',
                        marginLeft: '0.5rem',
                        color: 'var(--text-secondary)',
                        textTransform: 'capitalize'
                    }}>
                        · {faceShape} face
                    </span>
                )}
            </div>
            <div className="glasses-list">
                {sorted.map((frame) => {
                    const recommended = isRecommended(frame.style, faceShape)
                    return (
                        <button
                            key={frame.id}
                            className={`glass-card ${selectedId === frame.id ? 'selected' : ''}`}
                            onClick={() => selectGlasses(frame.id)}
                        >
                            <div className="glass-thumb" aria-hidden="true">
                                {frame.style.slice(0, 3).toUpperCase()}
                            </div>
                            <div className="glass-info">
                                <span className="glass-name">{frame.name}</span>
                                <span className="glass-meta">
                                    {frame.style} · {frame.colors[0]}
                                </span>
                                {recommended && (
                                    <span style={{
                                        fontSize: '0.7rem',
                                        color: 'var(--fit-good, #4ade80)',
                                        fontWeight: 600,
                                    }}>
                                        ✓ Recommended for {faceShape} face
                                    </span>
                                )}
                            </div>
                        </button>
                    )
                })}
            </div>
        </aside>
    )
}