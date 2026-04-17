import { useEffect, useState } from 'react'
import { useFSStore } from '../store/useFSStore'

const VISIBLE_COUNT = 3

export default function PartnerStoresOverlay() {
    const selectedId = useFSStore((s) => s.selectedGlassesId)
    const catalog = useFSStore((s) => s.catalog)
    const [startIndex, setStartIndex] = useState(0)

    const frame = catalog.find((f) => f.id === selectedId)
    const partners = frame?.partners ?? []

    useEffect(() => {
        setStartIndex(0)
    }, [selectedId])

    if (!frame) {
        return (
            <div className="partners-overlay partners-overlay-empty">
                Select a frame to see partner stores
            </div>
        )
    }

    if (partners.length === 0) return null

    const canPage = partners.length > VISIBLE_COUNT
    const maxStart = Math.max(0, partners.length - VISIBLE_COUNT)
    const visible = partners.slice(startIndex, startIndex + VISIBLE_COUNT)

    const prev = () => setStartIndex((i) => Math.max(0, i - 1))
    const next = () => setStartIndex((i) => Math.min(maxStart, i + 1))

    return (
        <div className="partners-overlay">
            <button
                type="button"
                className="partners-arrow"
                onClick={prev}
                disabled={!canPage || startIndex === 0}
                aria-label="Previous partner stores"
            >
                ‹
            </button>

            <div className="partners-cards">
                {visible.map((p) => (
                    <a
                        key={p.url}
                        href={p.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="partner-card"
                    >
                        <span className="partner-name">{p.name}</span>
                        {p.location && <span className="partner-location">{p.location}</span>}
                        <span className="partner-cta">Shop →</span>
                    </a>
                ))}
            </div>

            <button
                type="button"
                className="partners-arrow"
                onClick={next}
                disabled={!canPage || startIndex >= maxStart}
                aria-label="Next partner stores"
            >
                ›
            </button>
        </div>
    )
}
