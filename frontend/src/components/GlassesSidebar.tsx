import { useFSStore } from '../store/useFSStore'

export default function GlassesSidebar() {
    const catalog = useFSStore((s) => s.catalog)
    const selectedId = useFSStore((s) => s.selectedGlassesId)
    const selectGlasses = useFSStore((s) => s.selectGlasses)

    return (
        <aside className="sidebar">
            <div className="sidebar-header">Glasses</div>
            <div className="glasses-list">
                {catalog.map((frame) => (
                    <button
                        key={frame.id}
                        className={`glass-card ${selectedId === frame.id ? 'selected' : ''}`}
                        onClick={() => selectGlasses(frame.id)}
                    >
                        <img
                            src={frame.thumbnailPath}
                            alt={frame.name}
                            className="glass-thumb"
                        />
                        <div className="glass-info">
                            <span className="glass-name">{frame.name}</span>
                            <span className="glass-meta">
                                {frame.style} · {frame.colors[0]}
                            </span>
                        </div>
                    </button>
                ))}
            </div>
        </aside>
    )
}