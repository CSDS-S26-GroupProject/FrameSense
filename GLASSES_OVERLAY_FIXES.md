# Glasses Overlay Fixes — Priority Order

Fixes for FrameSense AR glasses overlay accuracy, ordered from most critical to polish.

---

## Fix 0: Correct the Coordinate Mapping (Foundation)

**Problem:** The mapping from MediaPipe normalized `[0,1]` coordinates to Three.js world space has three bugs:

1. `y` is missing the `aspect` multiplier (but `x` has it), so vertical positioning is in a different coordinate space than horizontal.
2. Neither axis accounts for the camera's FOV — with `fov=60` at `z=1`, the visible height at `z=0` is ~1.155 units, not 1.0.
3. `z = noseBridge.z - 1` is an arbitrary offset that changes the effective visible area and compounds the x/y errors.

**Why it matters:** Every other fix (rotation, scaling, occlusion) depends on the glasses being positioned at the correct point in 3D space. Without this, all downstream fixes build on a broken foundation.

**Current code (`GlassesCanvas.tsx`):**
```ts
const aspect = size.width / size.height
const x = (noseBridge.x - 0.5) * aspect
const y = -(noseBridge.y - 0.5)          // BUG: no aspect multiplier
const z = noseBridge.z - 1               // BUG: arbitrary offset
```

**Fix:**
```ts
const aspect = size.width / size.height
const fovRad = THREE.MathUtils.degToRad(60)  // match Canvas camera fov
const zPlane = 0                              // place glasses at z=0
const dist = 1 - zPlane                       // camera is at z=1
const visH = 2 * Math.tan(fovRad / 2) * dist // visible height at this z
const visW = visH * aspect                    // visible width at this z

const x = (noseBridge.x - 0.5) * visW
const y = -(noseBridge.y - 0.5) * visH
const z = zPlane
```

**Files:** `frontend/src/components/GlassesCanvas.tsx`

---

## Fix 0.5: Fix `object-fit: cover` Video/Canvas Mismatch

**Problem:** The video element uses `object-fit: cover`, which crops the webcam feed to fill the container. But MediaPipe analyzes the full uncropped frame. So normalized `[0,1]` landmarks map to the full video, while the user sees a cropped subset — creating a systematic offset.

**Why it matters:** If the container aspect ratio doesn't match the webcam's native aspect ratio (e.g., 4:3 webcam in a 16:9 container), the glasses will be consistently offset from the face.

**Fix (option A — simplest):** Switch to `object-fit: contain` so the full video is visible:
```css
.camera-video {
  object-fit: contain;  /* was: cover */
}
```

**Fix (option B — keeps cover, compensates in code):** Compute the crop offset from the video's `videoWidth`/`videoHeight` vs the container dimensions, and apply it to the coordinate mapping before converting to Three.js space.

**Files:** `frontend/src/App.css`, optionally `frontend/src/components/GlassesCanvas.tsx`

---

## Fix 1: Apply the MediaPipe Transformation Matrix Directly

**Problem:** `extractHeadPose()` manually decomposes the 4×4 matrix into Euler angles (pitch, yaw, roll), then `GlassesCanvas` re-applies them via `.rotation.set()`. This loses information and introduces gimbal lock at large yaw angles.

**Why it matters:** Glasses rotate incorrectly during head turns, especially combined pitch+yaw movements.

**Fix:** Store the raw `Float32Array` matrix in the Zustand store and apply it directly as a quaternion.

**In `useMediaPipe.ts`** — pass the raw matrix through:
```ts
if (results.facialTransformationMatrixes?.[0]) {
  const matrix = new Float32Array(results.facialTransformationMatrixes[0].data)
  setRawTransformMatrix(matrix)  // new store action
}
```

**In `GlassesCanvas.tsx`** — replace Euler rotation with quaternion from matrix:
```ts
const rawMatrix = useFSStore((s) => s.rawTransformMatrix)

// inside useFrame:
if (rawMatrix) {
  const m = new THREE.Matrix4()
  m.fromArray(rawMatrix)

  // Flip from MediaPipe (y-down) to Three.js (y-up)
  const flipY = new THREE.Matrix4().makeScale(1, -1, -1)
  m.premultiply(flipY)

  const tempPos = new THREE.Vector3()
  const tempScale = new THREE.Vector3()
  m.decompose(tempPos, meshRef.current.quaternion, tempScale)
  // position is still set from nose bridge landmark, only rotation is from the matrix
}
```

**Note:** The y-axis flip is needed because MediaPipe uses y-down while Three.js uses y-up. Test one axis at a time (slow pitch, then yaw, then roll) to verify the signs are correct. Adjust the flip matrix if needed.

**Store changes (`useFSStore.ts`):**
```ts
rawTransformMatrix: Float32Array | null  // add to state
setRawTransformMatrix: (m: Float32Array) => void  // add action
```

**Files:** `useMediaPipe.ts`, `GlassesCanvas.tsx`, `useFSStore.ts`, `contract.ts`

---

## Fix 2: EMA Smoothing on Key Landmarks

**Problem:** Raw MediaPipe landmarks fluctuate frame-to-frame, causing visible jitter in the glasses position.

**Why it matters:** Even with perfect positioning math, jitter makes the overlay feel unpolished and distracting.

**Fix:** Apply exponential moving average (α ≈ 0.4) to the 5 key landmarks before storing them.

**In `useMediaPipe.ts`:**
```ts
const ALPHA = 0.4
const prevLandmarks = useRef<Map<number, Point3D>>(new Map())
const KEY_INDICES = [6, 127, 356, 468, 473]

function smoothLandmark(index: number, raw: Point3D): Point3D {
  const prev = prevLandmarks.current.get(index)
  if (!prev) {
    prevLandmarks.current.set(index, { ...raw })
    return raw
  }
  const smoothed = {
    x: ALPHA * raw.x + (1 - ALPHA) * prev.x,
    y: ALPHA * raw.y + (1 - ALPHA) * prev.y,
    z: ALPHA * raw.z + (1 - ALPHA) * prev.z,
  }
  prevLandmarks.current.set(index, smoothed)
  return smoothed
}
```

Apply before calling `setLandmarks()` — replace the raw landmarks at indices 6, 127, 356, 468, 473 with their smoothed versions.

**Edge case — face loss:** If MediaPipe loses the face for >3 frames and regains it, snap to the new position instead of interpolating from the stale one:
```ts
if (framesSinceLastDetection > 3) {
  prevLandmarks.current.clear()
}
```

**Files:** `frontend/src/hooks/useMediaPipe.ts`

---

## Fix 3: Unify Scaling (Remove Dual Scale Conflict)

**Problem:** Two scaling mechanisms fight each other:
1. A `useMemo` scale from catalog `frameWidthMm` / model bounding box → applied via JSX `scale={scale}`
2. An ear-based `setScalar()` in `useFrame` with a magic `modelEarSpan = 0.08` → overwrites the above every frame

**Why it matters:** The ear-based scale uses a hardcoded constant that doesn't generalize across models, and silently overrides the more principled catalog scale.

**Fix:** Use IPD (interpupillary distance) as the face-size reference and the catalog `frameWidthMm` for the target size. Remove the ear-based branch entirely.

```ts
if (leftPupil && rightPupil) {
  const ipdWorld = Math.hypot(
    (rightPupil.x - leftPupil.x) * visW,
    (rightPupil.y - leftPupil.y) * visH
  )
  // Average human IPD ≈ 63mm
  const pxPerMm = ipdWorld / 63
  const targetWidth = selectedFrame.frameWidthMm * pxPerMm
  const box = new THREE.Box3().setFromObject(scene)
  const modelWidth = box.getSize(new THREE.Vector3()).x
  const s = targetWidth / modelWidth
  meshRef.current.scale.setScalar(s)
}
```

Remove the `useMemo` catalog scale from JSX (set `scale={1}` on the primitive) — the `useFrame` loop now owns all scaling.

**Files:** `frontend/src/components/GlassesCanvas.tsx`

---

## Fix 4: Improve Vertical Alignment Anchor

**Problem:** `NOSE_BRIDGE_OFFSET_FRACTION = 0.25` is a magic number tuned for one model that drifts for others.

**Why it matters:** Different GLB models have different origin points relative to the nose bridge, so a single fraction can't work universally.

**Fix (best):** Re-export each GLB from Blender with the origin set to the nose bridge/pad point. Then `position.set(x, y, z)` works with zero offset. This is a one-time investment per model.

**Fix (code fallback):** Use two landmarks to define the nose bridge region and anchor to their midpoint:
- Landmark #6 — nose bridge top
- Midpoint of #195 and #197 — nose bridge bottom

```ts
const noseTop = smoothedLandmarks[6]
const noseBot = {
  x: (landmarks[195].x + landmarks[197].x) / 2,
  y: (landmarks[195].y + landmarks[197].y) / 2,
  z: (landmarks[195].z + landmarks[197].z) / 2,
}
const anchorY = -(((noseTop.y + noseBot.y) / 2) - 0.5) * visH
```

This makes vertical alignment data-driven from the face, not dependent on model geometry.

**Files:** `frontend/src/components/GlassesCanvas.tsx`, optionally `frontend/src/store/useFSStore.ts`

---

## Fix 5: Ear Occlusion via Depth-Buffer Occluder Mesh

**Problem:** The R3F canvas renders glasses on top of everything. When the face turns sideways, glasses appear on top of the ear instead of the temple sliding behind it.

**Why it matters:** Breaks the AR illusion on any non-frontal head pose.

**Prerequisites:** Fixes 0, 1, and 3 must be solid first. The occluder must share the exact same 3D coordinate system as the glasses, or it will clip incorrectly — which looks worse than no occlusion.

**Approach:** Render an invisible face shell mesh from MediaPipe landmarks that writes to the depth buffer but not the color buffer. Glasses behind this shell are discarded, revealing the transparent canvas (which shows the video).

**Implementation:**

1. Define a static triangle index array for the face outline (manually authored once, ~36 landmarks → ~60 triangles).
2. Add a `FaceOccluder` component inside the R3F Canvas, rendered before the glasses:
```tsx
<FaceOccluder />        {/* renderOrder: 0 */}
<GlassesMesh ... />     {/* renderOrder: 1 */}
```

3. Each frame, update vertex positions from current landmarks using the same coordinate transform as the glasses:
```ts
// Reuse geometry, only update positions
const positions = geometry.attributes.position.array as Float32Array
for (let i = 0; i < OUTLINE_INDICES.length; i++) {
  const lm = landmarks[OUTLINE_INDICES[i]]
  positions[i * 3]     = (lm.x - 0.5) * visW
  positions[i * 3 + 1] = -(lm.y - 0.5) * visH
  positions[i * 3 + 2] = lm.z * depthScale
}
geometry.attributes.position.needsUpdate = true
```

4. Material: invisible but writes depth:
```ts
new THREE.MeshBasicMaterial({
  colorWrite: false,
  depthWrite: true,
  side: THREE.FrontSide,
})
```

**Key face outline landmark indices:**
```
10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288,
397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136,
172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109
```

**Simpler alternative (if occluder is too complex):** Use a yaw-based clipping plane:
- When `|yaw| > 25°`, add a `THREE.Plane` that clips the far-side temple of the glasses
- 80% of the visual benefit with 20% of the complexity

**Files:** `frontend/src/components/GlassesCanvas.tsx` (new `FaceOccluder` component)

---

## Verification Checklist

After implementing each fix, test:

- [ ] **Fix 0:** Glasses center on nose bridge in a frontal pose with no drift
- [ ] **Fix 0.5:** Glasses align correctly regardless of browser window aspect ratio
- [ ] **Fix 1:** Slow head turns (pitch, yaw, roll separately) — glasses rotate with the face, no gimbal snap
- [ ] **Fix 2:** Glasses don't jitter when holding still; no "slide-in" after face re-detection
- [ ] **Fix 3:** All 5 catalog glasses are proportionally sized to the face without per-model tuning
- [ ] **Fix 4:** Bridge of glasses sits on the nose, not above/below, for all models
- [ ] **Fix 5:** At ~45° yaw, temple appears to go behind the ear, not float in front
