import { useEffect } from 'react'
import { useFSStore } from '../store/useFSStore'
import type { Point3D, HeadPose } from '../types/contract'

export function useMockLandmarks() {
    const setLandmarks = useFSStore((state) => state.setLandmarks)
    const setHeadPose = useFSStore((state) => state.setHeadPose)

    useEffect(() => {
        const base: Point3D[] = Array.from({ length: 478 }, () => ({ x: 0, y: 0, z: 0 }))

        base[6] = { x: 0.50, y: 0.50, z: 0.00 }
        base[468] = { x: 0.42, y: 0.42, z: -0.01 }
        base[473] = { x: 0.58, y: 0.42, z: -0.01 }

        let tick = 0
        const interval = setInterval(() => {
            tick += 0.05
            const pose: HeadPose = { pitch: 0, yaw: Math.sin(tick) * 15, roll: 0 }
            setLandmarks([...base])
            setHeadPose(pose)
        }, 33)

        return () => clearInterval(interval)
    }, [setLandmarks, setHeadPose])
}