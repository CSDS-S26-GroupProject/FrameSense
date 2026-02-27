import { Suspense, useEffect, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { useFSStore } from '../store/useFSStore'

// ── Glasses mesh: loads GLB and tracks face each frame ──────────────────────

interface GlassesMeshProps {
  modelPath: string
}

function GlassesMesh({ modelPath }: GlassesMeshProps) {
  const { scene } = useGLTF(modelPath)
  const meshRef = useRef<THREE.Group>(null)
  const { size } = useThree()

  const noseBridge = useFSStore((s) => s.noseBridge)
  const headPose = useFSStore((s) => s.headPose)

  // log bounding box once so Team 3 can read real model dimensions
  useEffect(() => {
    const box = new THREE.Box3().setFromObject(scene)
    const dimensions = new THREE.Vector3()
    box.getSize(dimensions)
    console.log(`[GlassesCanvas] ${modelPath} bounding box (units):`, dimensions)
    console.log(`[GlassesCanvas] Assuming 1 unit = 1m → width: ${(dimensions.x * 1000).toFixed(1)}mm`)
  }, [scene, modelPath])

  useFrame(() => {
    if (!meshRef.current || !noseBridge || !headPose) return

    // MediaPipe gives normalized [0,1] coords with origin top-left.
    // Three.js canvas has origin center, y-axis up.
    // Map: x: [0,1] → [-aspect/2, aspect/2], y: [0,1] → [0.5, -0.5]
    const aspect = size.width / size.height
    const x = (noseBridge.x - 0.5) * aspect
    const y = -(noseBridge.y - 0.5) - 0.06

    // z depth: bring glasses slightly in front of the "face plane"
    const z = 0.3 + noseBridge.z * -1.5

    meshRef.current.position.set(x, y, z)

    // apply head rotation from MediaPipe transformation matrix
    meshRef.current.rotation.set(
      THREE.MathUtils.degToRad(headPose.pitch),
      THREE.MathUtils.degToRad(headPose.yaw),
      THREE.MathUtils.degToRad(headPose.roll)
    )
  })

  return <primitive ref={meshRef} object={scene} scale={1.0} />
}

// ── Fallback shown while GLB is loading ────────────────────────────────────

function LoadingFallback() {
  return (
    <mesh>
      <boxGeometry args={[0.3, 0.05, 0.01]} />
      <meshBasicMaterial color="#00aaff" wireframe />
    </mesh>
  )
}

// ── Main canvas: overlaid on top of the video feed ─────────────────────────

export default function GlassesCanvas() {
  const selectedId = useFSStore((s) => s.selectedGlassesId)
  const catalog = useFSStore((s) => s.catalog)
  const noseBridge = useFSStore((s) => s.noseBridge)

  const selectedFrame = catalog.find((f) => f.id === selectedId)

  // don't render canvas at all if no glasses selected or no face detected
  if (!selectedFrame || !noseBridge) return null

  return (
    <Canvas
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        transform: 'scaleX(-1)',
      }}
      camera={{ fov: 60, near: 0.01, far: 100, position: [0, 0, 1] }}
    >
      <ambientLight intensity={1.2} />
      <directionalLight position={[0, 2, 2]} intensity={1} />
      <Suspense fallback={<LoadingFallback />}>
        <GlassesMesh modelPath={selectedFrame.modelPath} />
      </Suspense>
    </Canvas>
  )
}
