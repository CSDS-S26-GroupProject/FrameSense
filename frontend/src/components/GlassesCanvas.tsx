import { Suspense, useRef, useMemo } from 'react'
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
  const { scene: originalScene } = useGLTF(modelPath)
  const scene = useMemo(() => originalScene.clone(true), [originalScene])
  const meshRef = useRef<THREE.Group>(null)
  const { size } = useThree()

  const noseBridge = useFSStore((s) => s.noseBridge)
  const headPose = useFSStore((s) => s.headPose)
  const leftPupil = useFSStore((s) => s.leftPupil)
  const rightPupil = useFSStore((s) => s.rightPupil)

  const modelWidth = useMemo(() => {
    const box = new THREE.Box3().setFromObject(scene)
    return box.getSize(new THREE.Vector3()).x
  }, [scene])

  const CAM_FOV_DEG = 60
  const CAM_Z = 1
  const Z_PLANE = 0
  const AVG_IPD_MM = 63

  useFrame(() => {
    if (!meshRef.current || !noseBridge || !headPose) return

    const aspect = size.width / size.height
    const fovRad = THREE.MathUtils.degToRad(CAM_FOV_DEG)
    const dist = CAM_Z - Z_PLANE
    const visH = 2 * Math.tan(fovRad / 2) * dist
    const visW = visH * aspect

    const x = (noseBridge.x - 0.5) * visW
    const y = -(noseBridge.y - 0.5) * visH

    meshRef.current.rotation.set(
      THREE.MathUtils.degToRad(headPose.pitch),
      THREE.MathUtils.degToRad(headPose.yaw),
      THREE.MathUtils.degToRad(-headPose.roll)
    )

    // IPD-based scaling: measure pupil distance in world units,
    // compare to average human IPD (63mm) to get a mm→world ratio,
    // then scale the model so its width matches the catalog frameWidthMm.
    if (leftPupil && rightPupil) {
      const ipdWorld = Math.hypot(
        (rightPupil.x - leftPupil.x) * visW,
        (rightPupil.y - leftPupil.y) * visH
      )
      const targetWidth = (selectedFrame.frameWidthMm / AVG_IPD_MM) * ipdWorld
      meshRef.current.scale.setScalar(targetWidth / modelWidth)
    }

    const NOSE_BRIDGE_OFFSET_FRACTION = 0.25
    const box = new THREE.Box3().setFromObject(meshRef.current)
    const modelHeight = box.max.y - box.min.y
    const offsetY = modelHeight * NOSE_BRIDGE_OFFSET_FRACTION

    meshRef.current.position.set(x, y + offsetY, Z_PLANE)
  })

  return <primitive ref={meshRef} object={scene} scale={1} />
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
