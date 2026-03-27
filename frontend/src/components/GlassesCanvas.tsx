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

  // log bounding box once so Team 3 can read real model dimensions
  const scale = useMemo(() => {
    const box = new THREE.Box3().setFromObject(scene)
    const dimensions = new THREE.Vector3()
    box.getSize(dimensions)
    const modelWidthUnits = dimensions.x          // bounding box width
    const targetWidthM = selectedFrame.frameWidthMm / 1000  // mm → meters
    return targetWidthM / modelWidthUnits
  }, [scene, selectedFrame.frameWidthMm])

  /*useEffect(() => {
    const box = new THREE.Box3().setFromObject(scene)
    const dimensions = new THREE.Vector3()
    box.getSize(dimensions)
    console.log(`[GlassesCanvas] ${modelPath} bounding box (units):`, dimensions)
    console.log(`[GlassesCanvas] Assuming 1 unit = 1m → width: ${(dimensions.x * 1000).toFixed(1)}mm`)
  }, [scene, modelPath])*/


  // Camera FOV must match the <Canvas camera={{ fov }}> value
  const CAM_FOV_DEG = 60
  const CAM_Z = 1 // camera position on z-axis
  const Z_PLANE = 0 // place glasses on the z=0 focal plane

  // Camera FOV must match the <Canvas camera={{ fov }}> value
  const CAM_FOV_DEG = 60
  const CAM_Z = 1 // camera position on z-axis
  const Z_PLANE = 0 // place glasses on the z=0 focal plane

  useFrame(() => {
    if (!meshRef.current || !noseBridge || !headPose) return

    // FOV-aware mapping from MediaPipe normalized [0,1] to Three.js world.
    // At z=Z_PLANE the camera frustum spans visH × visW world units.
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

    if (leftEarTop && rightEarTop) {
      const earDistNormalized = Math.sqrt(
        Math.pow(rightEarTop.x - leftEarTop.x, 2) +
        Math.pow(rightEarTop.y - leftEarTop.y, 2)
      )
      const earDistThree = earDistNormalized * visW
      const modelEarSpan = 0.08
      const s = earDistThree / modelEarSpan
      meshRef.current.scale.setScalar(s)
    }

    const NOSE_BRIDGE_OFFSET_FRACTION = 0.25
    const box = new THREE.Box3().setFromObject(meshRef.current)
    const modelHeight = box.max.y - box.min.y
    const offsetY = modelHeight * NOSE_BRIDGE_OFFSET_FRACTION

    meshRef.current.position.set(x, y + offsetY, Z_PLANE)
  })


/*//Scale in the z direction
if (leftPupil && rightPupil) {
const ipd = Math.sqrt(
    Math.pow(rightPupil.x - leftPupil.x, 2) +
    Math.pow(rightPupil.y - leftPupil.y, 2)
)
const BASE_IPD = 0.18
meshRef.current.scale.setScalar(scale * (ipd / BASE_IPD))
}
})
return <primitive ref={meshRef} object={scene} scale={scale} />
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
