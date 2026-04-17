import { useFSStore } from '../store/useFSStore'
import JeelizVTOCanvas from './JeelizVTOCanvas'
import PartnerStoresOverlay from './PartnerStoresOverlay'


interface CameraFeedProps {
    videoRef: React.RefObject<HTMLVideoElement | null>
}

function getFitColor(score: number): string {
    if (score >= 80) return 'fit-good'
    if (score >= 50) return 'fit-ok'
    return 'fit-poor'
}

export default function CameraFeed({ videoRef }: CameraFeedProps) {
    const fitScore = useFSStore((s) => s.fitScore)

    return (
        <div className="camera-container">
            {/* Hidden video — still fed by useMediaPipe for Fit Score landmarks. */}
            <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="camera-video-hidden"
            />

            {/* Jeeliz owns the visible webcam + AR glasses overlay. */}
            <JeelizVTOCanvas />

            {fitScore !== null && (
                <div className="fit-badge">
                    <span className="fit-label">Fit</span>
                    <span className={`fit-value ${getFitColor(fitScore)}`}>
                        {fitScore}
                    </span>
                    <span className="fit-max">/ 100</span>
                </div>
            )}

            <PartnerStoresOverlay />
        </div>
    )
}
