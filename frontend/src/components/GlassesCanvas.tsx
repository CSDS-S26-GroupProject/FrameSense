import { Suspense, useEffect, useRef, useMemo } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { useFSStore } from '../store/useFSStore'
import type { GlassesFrame } from '../types/contract'

// ── Glasses mesh: loads GLB and tracks face each frame ──────────────────────

interface GlassesMeshProps {
  modelPath: string
  selectedFrame: GlassesFrame
}

function GlassesMesh({ modelPath, selectedFrame }: GlassesMeshProps) {
  const { scene } = useGLTF(modelPath)
  const meshRef = useRef<THREE.Group>(null)
  const { size } = useThree()

  const noseBridge = useFSStore((s) => s.noseBridge)
  const headPose = useFSStore((s) => s.headPose)
  const leftPupil = useFSStore((s) => s.leftPupil)
  const rightPupil = useFSStore((s) => s.rightPupil)
  const leftEarTop  = useFSStore((s) => s.leftEarTop)
  const rightEarTop = useFSStore((s) => s.rightEarTop)


  // log bounding box once so Team 3 can read real model dimensions
  /**const scale = useMemo(() => {
    const box = new THREE.Box3().setFromObject(scene)
    const dimensions = new THREE.Vector3()
    box.getSize(dimensions)
    const modelWidthUnits = dimensions.x          // bounding box width
    const targetWidthM = selectedFrame.frameWidthMm / 1000  // mm → meters
    return targetWidthM / modelWidthUnits
  }, [scene, selectedFrame.frameWidthMm])*/
  
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
    const y = -(noseBridge.y -.5)* aspect//-(noseBridge.y - 0.5) - 0.03

    // z depth: bring glasses slightly in front of the "face plane"
    const z = noseBridge.z//0.3 + noseBridge.z * -1.5

    meshRef.current.position.set(x, y, z)

    // apply head rotation from MediaPipe transformation matrix
    meshRef.current.rotation.set(
      THREE.MathUtils.degToRad(headPose.pitch),
      THREE.MathUtils.degToRad(headPose.yaw),
      THREE.MathUtils.degToRad(-headPose.roll)
    )

    //Scale in the z direction
    if (leftPupil && rightPupil) {
    const dist_away = Math.sqrt(
        Math.pow(rightPupil.x - leftPupil.x, 2) +
        Math.pow(rightPupil.y - leftPupil.y, 2)
    )
    const suggested_dist_away = 0.05
    meshRef.current.scale.setScalar(1.0 * (dist_away/ suggested_dist_away)) //change 1.0 to scale IF useMemo is uncommented. If useEffect is uncommented, use 1.0
    }
  })
  return <primitive ref={meshRef} object={scene} scale={1.0} />
  //return <primitive ref={meshRef} object={scene} scale={1.0} /> //was 1.0
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
        <GlassesMesh modelPath={selectedFrame.modelPath} selectedFrame={selectedFrame} />
      </Suspense>
    </Canvas>
  )
}
