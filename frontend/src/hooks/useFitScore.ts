import { useEffect } from 'react'
import { useFSStore } from '../store/useFSStore'
import type { Point3D } from '../types/contract'

const AVERAGE_IPD_MM = 63
const IPD_SMOOTHING_WINDOW = 30
const SCORE_SMOOTHING_WINDOW = 30

const WEIGHTS = {
    width: 0.6,
    bridge: 0.4,
}

function dist2D(a: Point3D, b: Point3D): number {
    const dx = a.x - b.x
    const dy = a.y - b.y
    return Math.sqrt(dx * dx + dy * dy)
}

function penalty(deviationMm: number): number {
    const d = Math.abs(deviationMm)
    if (d <= 3) return d * (5 / 3)
    if (d <= 6) return 5 + (d - 3) * 5
    if (d <= 12) return 20 + (d - 6) * 5
    return Math.min(100, 50 + (d - 12) * 5)
}

function rollingAvg(buffer: number[], next: number, windowSize: number): number {
    buffer.push(next)
    if (buffer.length > windowSize) buffer.shift()
    return buffer.reduce((s, x) => s + x, 0) / buffer.length
}

export function useFitScore() {
    useEffect(() => {
        const ipdBuffer: number[] = []
        const scoreBuffer: number[] = []
        let lastFrameId: string | null = null

        const unsubscribe = useFSStore.subscribe((state, prev) => {
            const { selectedGlassesId, rawLandmarks, catalog } = state

            if (!selectedGlassesId || !rawLandmarks) return
            if (rawLandmarks === prev.rawLandmarks && selectedGlassesId === prev.selectedGlassesId) {
                return
            }
            if (selectedGlassesId !== lastFrameId) {
                lastFrameId = selectedGlassesId
                scoreBuffer.length = 0
            }

            const frame = catalog.find((f) => f.id === selectedGlassesId)
            if (!frame) return

            const leftPupil = rawLandmarks[468]
            const rightPupil = rawLandmarks[473]
            const leftTemple = rawLandmarks[454]
            const rightTemple = rawLandmarks[234]
            const leftBridge = rawLandmarks[417]
            const rightBridge = rawLandmarks[193]

            if (!leftPupil || !rightPupil || !leftTemple || !rightTemple || !leftBridge || !rightBridge) {
                return
            }

            const ipdNormRaw = dist2D(leftPupil, rightPupil)
            if (ipdNormRaw <= 0) return
            const ipdNormSmoothed = rollingAvg(ipdBuffer, ipdNormRaw, IPD_SMOOTHING_WINDOW)
            const mmPerUnit = AVERAGE_IPD_MM / ipdNormSmoothed

            const faceWidthMm = dist2D(leftTemple, rightTemple) * mmPerUnit
            const bridgeWidthMm = dist2D(leftBridge, rightBridge) * mmPerUnit

            const subWidth = Math.max(0, 100 - penalty(frame.frameWidthMm - faceWidthMm))
            const subBridge = Math.max(0, 100 - penalty(frame.bridgeWidthMm - bridgeWidthMm))

            const rawScore = WEIGHTS.width * subWidth + WEIGHTS.bridge * subBridge
            const smoothed = rollingAvg(scoreBuffer, rawScore, SCORE_SMOOTHING_WINDOW)
            const rounded = Math.round(smoothed)

            if (state.fitScore !== rounded) {
                useFSStore.getState().setFitScore(rounded, [])
            }
        })

        return unsubscribe
    }, [])
}
