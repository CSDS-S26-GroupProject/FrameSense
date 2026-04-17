import type { FaceShape, GlassesFrame } from '@/types/contract'

const FACE_SHAPE_AVG: Record<FaceShape, { faceWidthMm: number; bridgeWidthMm: number }> = {
  oval: { faceWidthMm: 138, bridgeWidthMm: 18 },
  round: { faceWidthMm: 142, bridgeWidthMm: 17 },
  square: { faceWidthMm: 145, bridgeWidthMm: 19 },
  heart: { faceWidthMm: 136, bridgeWidthMm: 17 },
}

function penalty(deviationMm: number): number {
  const d = Math.abs(deviationMm)
  if (d <= 3) return d * (5 / 3)
  if (d <= 6) return 5 + (d - 3) * 5
  if (d <= 12) return 20 + (d - 6) * 5
  return Math.min(100, 50 + (d - 12) * 5)
}

export function estimateFit(frame: GlassesFrame, shape: FaceShape | null): number {
  const s = shape ?? 'oval'
  const avg = FACE_SHAPE_AVG[s]
  const widthSub = Math.max(0, 100 - penalty(frame.frameWidthMm - avg.faceWidthMm))
  const bridgeSub = Math.max(0, 100 - penalty(frame.bridgeWidthMm - avg.bridgeWidthMm))
  const base = widthSub * 0.6 + bridgeSub * 0.4
  const bonus = frame.recommendedShapes.includes(s) ? 4 : 0
  return Math.min(98, Math.round(base + bonus))
}
