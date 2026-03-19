import { useFSStore } from '../store/useFSStore'

export default function DistanceIndicator() {
  const leftPupil = useFSStore((s) => s.leftPupil)
  const rightPupil = useFSStore((s) => s.rightPupil)

  if (!leftPupil || !rightPupil) return null

  // Average interpupillary distance is ~63mm
  const REAL_IPD_MM = 63
  // Calibrated at ~0.05 normalized units = ~60cm from camera
  const REFERENCE_DIST = 0.05
  const REFERENCE_CM = 60

  const ipd = Math.sqrt(
    Math.pow(rightPupil.x - leftPupil.x, 2) +
    Math.pow(rightPupil.y - leftPupil.y, 2)
  )

  const distanceCm = Math.round((REFERENCE_DIST / ipd) * REFERENCE_CM)

  const getColor = () => {
    if (distanceCm < 40) return '#ff4444'   // too close
    if (distanceCm > 90) return '#ff4444'   // too far
    return '#44ff88'                         // good range
  }

  return (
    <div style={{
      position: 'absolute',
      bottom: 20,
      left: '50%',
      transform: 'translateX(-50%)',
      background: 'rgba(0,0,0,0.6)',
      color: getColor(),
      padding: '8px 16px',
      borderRadius: 8,
      fontFamily: 'monospace',
      fontSize: 16,
      pointerEvents: 'none',
      backdropFilter: 'blur(4px)',
    }}>
      📏 {distanceCm} cm away (have to verify distance) 
          (comes from DistanceIndicatorFile)
    </div>
  )
}