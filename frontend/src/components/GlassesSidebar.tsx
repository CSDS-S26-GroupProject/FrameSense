import { useState } from 'react'
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
    const faceShape = useFSStore((s) => s.faceShape)
    const [showAll, setShowAll] = useState(false)

    const recommended = faceShape ? catalog.filter((f) => isRecommended(f.style, faceShape)) : []
    const other = faceShape ? catalog.filter((f) => !isRecommended(f.style, faceShape)) : catalog

    const visible = faceShape && !showAll ? recommended : [...recommended, ...other]

    return (
        <aside className="sidebar">
            <div className="sidebar-header">
                Frames
                {faceShape && (
                    <span style={{
                        fontWeight: 'normal',
                        marginLeft: '0.5rem',
                        color: 'var(--text-secondary)',
                        textTransform: 'capitalize',
                    }}>
                        · for {faceShape} face
                    </span>
                )}
            </div>
            <div className="glasses-list">
                {visible.map((frame) => {
                    const rec = isRecommended(frame.style, faceShape)
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
                                {rec && (
                                    <span style={{
                                        fontSize: '0.7rem',
                                        color: 'var(--fit-good, #4ade80)',
                                        fontWeight: 600,
                                    }}>
                                        ✓ Recommended
                                    </span>
                                )}
                            </div>
                        </button>
                    )
                })}

                {faceShape && !showAll && other.length > 0 && (
                    <button className="view-more-btn" onClick={() => setShowAll(true)}>
                        View more ({other.length})
                    </button>
                )}
                {faceShape && showAll && other.length > 0 && (
                    <button className="view-more-btn" onClick={() => setShowAll(false)}>
                        Show less
                    </button>
                )}
            </div>
        </aside>
    )
}
