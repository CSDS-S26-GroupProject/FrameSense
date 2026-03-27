// frontend/src/components/LandmarkMesh.tsx
// Draws all 468 MediaPipe landmarks on the camera feed using useFrame for performance
//
// IMPORTANT - placement in App.tsx:
// LandmarkMesh must be placed INSIDE the camera container div, not in app-main.
// It uses ResizeObserver to match its size to whatever container it lives in,
// so it will automatically account for the sidebar and header.
//
// Example App.tsx layout:
//   <div className="camera-container">
//     <CameraFeed videoRef={videoRef} />
//     <GlassesCanvas />
//     <LandmarkMesh />   ← inside camera-container, not app-main
//   </div>
//   <GlassesSidebar />

import { useRef, useEffect } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useFSStore } from '../store/useFSStore'
import type { Point3D } from '../types/contract'

// ── Same coordinate helpers as GlassesCanvas.tsx ─────────────────────────

function toThreeCoords(point: Point3D, aspect: number) {
    const x = (point.x - 0.5) * aspect
    const y = -(point.y - 0.5) * aspect
    const z = point.z
    return new THREE.Vector3(x, y, z)
}

function toCanvasPixels(vec: THREE.Vector3, camera: THREE.Camera, width: number, height: number) {
    const projected = vec.clone().project(camera)
    return {
        x: (projected.x * 0.5 + 0.5) * width,
        y: (-projected.y * 0.5 + 0.5) * height,
    }
}

// ── Named landmarks to highlight on top of the mesh ──────────────────────

const NAMED_LANDMARKS: { index: number; color: string; label: string }[] = [
    { index: 6,   color: '#00ff99', label: 'Nose #6'      },
    { index: 468, color: '#ff4444', label: 'L Pupil #468' },
    { index: 473, color: '#4488ff', label: 'R Pupil #473' },
]

// ── Inner renderer: runs inside R3F Canvas so useThree/useFrame work ──────

function MeshRenderer({ canvasRef }: { canvasRef: React.RefObject<HTMLCanvasElement | null> }) {
    const { size, camera } = useThree()
    const rawLandmarks = useFSStore((s) => s.rawLandmarks)

    useFrame(() => {
        const canvas = canvasRef.current
        if (!canvas || !rawLandmarks) return
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        const aspect = size.width / size.height

        ctx.clearRect(0, 0, canvas.width, canvas.height)

        // ── Draw all 468 landmarks as small white dots ────────────────
        for (let i = 0; i < rawLandmarks.length; i++) {
            const point = rawLandmarks[i]
            const world = toThreeCoords(point, aspect)
            const px = toCanvasPixels(world, camera, canvas.width, canvas.height)

            ctx.beginPath()
            ctx.arc(px.x, px.y, 1.5, 0, Math.PI * 2)
            ctx.fillStyle = 'rgba(255, 255, 255, 0.5)'
            ctx.fill()
        }

        // ── Highlight named landmarks on top ──────────────────────────
        for (const { index, color, label } of NAMED_LANDMARKS) {
            const point = rawLandmarks[index]
            if (!point) continue

            const world = toThreeCoords(point, aspect)
            const px = toCanvasPixels(world, camera, canvas.width, canvas.height)

            // outer ring
            ctx.beginPath()
            ctx.arc(px.x, px.y, 9, 0, Math.PI * 2)
            ctx.strokeStyle = color
            ctx.lineWidth = 1.5
            ctx.stroke()

            // filled dot
            ctx.beginPath()
            ctx.arc(px.x, px.y, 5, 0, Math.PI * 2)
            ctx.fillStyle = color
            ctx.fill()

            // label
            ctx.font = '11px monospace'
            ctx.fillStyle = color
            ctx.fillText(label, px.x + 12, px.y + 4)
        }

        // ── IPD line between pupils ───────────────────────────────────
        const lp = rawLandmarks[468]
        const rp = rawLandmarks[473]
        if (lp && rp) {
            const lWorld = toThreeCoords(lp, aspect)
            const rWorld = toThreeCoords(rp, aspect)
            const lPx = toCanvasPixels(lWorld, camera, canvas.width, canvas.height)
            const rPx = toCanvasPixels(rWorld, camera, canvas.width, canvas.height)

            ctx.beginPath()
            ctx.moveTo(lPx.x, lPx.y)
            ctx.lineTo(rPx.x, rPx.y)
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)'
            ctx.lineWidth = 1
            ctx.setLineDash([4, 4])
            ctx.stroke()
            ctx.setLineDash([])

            const ipd = Math.sqrt(
                Math.pow(rp.x - lp.x, 2) +
                Math.pow(rp.y - lp.y, 2)
            ).toFixed(4)
            const mx = (lPx.x + rPx.x) / 2
            const my = (lPx.y + rPx.y) / 2
            ctx.font = '10px monospace'
            ctx.fillStyle = 'rgba(255,255,255,0.7)'
            ctx.fillText(`IPD: ${ipd}`, mx + 6, my - 6)
        }
    })

    return null
}

// ── Outer component ───────────────────────────────────────────────────────

export default function LandmarkMesh() {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const wrapperRef = useRef<HTMLDivElement>(null)

    // Use ResizeObserver to keep the canvas resolution in sync with
    // the actual pixel size of its container — no hardcoded 640x480
    useEffect(() => {
        const wrapper = wrapperRef.current
        const canvas = canvasRef.current
        if (!wrapper || !canvas) return

        const observer = new ResizeObserver((entries) => {
            for (const entry of entries) {
                const { width, height } = entry.contentRect
                canvas.width = width
                canvas.height = height
            }
        })

        observer.observe(wrapper)
        return () => observer.disconnect()
    }, [])

    return (
        // wrapper div fills whatever container it is placed in
        <div
            ref={wrapperRef}
            style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                pointerEvents: 'none',
            }}
        >
            {/* 2D canvas where dots are drawn — resolution set by ResizeObserver */}
            <canvas
                ref={canvasRef}
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    pointerEvents: 'none',
                    transform: 'scaleX(-1)',
                    zIndex: 9998,
                }}
            />
            {/* Hidden R3F Canvas — only used to access useThree camera/size */}
            <Canvas
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    pointerEvents: 'none',
                    opacity: 0,
                }}
                camera={{ fov: 60, near: 0.01, far: 100, position: [0, 0, 1] }}
            >
                <MeshRenderer canvasRef={canvasRef} />
            </Canvas>
        </div>
    )
}