// frontend/src/components/LandmarkDebug.tsx
// Drop this component into App.tsx to display normalized landmark values

import { useFSStore } from '../store/useFSStore'

export default function LandmarkDebug() {
    const noseBridge  = useFSStore((s) => s.noseBridge)
    const leftPupil   = useFSStore((s) => s.leftPupil)
    const rightPupil  = useFSStore((s) => s.rightPupil)
    const headPose    = useFSStore((s) => s.headPose)
    const rawLandmarks = useFSStore((s) => s.rawLandmarks)

    // Derived: interpupillary distance in normalized space
    const ipd = leftPupil && rightPupil
        ? Math.sqrt(
            Math.pow(rightPupil.x - leftPupil.x, 2) +
            Math.pow(rightPupil.y - leftPupil.y, 2)
          ).toFixed(4)
        : null

    const fmt = (v: number) => v.toFixed(4)

    return (
        <div style={{
            position: 'absolute',
            top: 12,
            left: 12,
            zIndex: 9999,
            background: 'rgba(0, 0, 0, 0.72)',
            color: '#00ff99',
            fontFamily: 'monospace',
            fontSize: '11px',
            lineHeight: '1.7',
            padding: '10px 14px',
            borderRadius: '6px',
            border: '1px solid rgba(0,255,153,0.25)',
            pointerEvents: 'none',
            minWidth: '220px',
        }}>
            <div style={{ color: '#ffffff', fontWeight: 'bold', marginBottom: 6, letterSpacing: 1 }}>
                LANDMARK DEBUG
            </div>

            {/* Nose Bridge - Landmark #6 */}
            <div style={{ color: '#aaa', marginTop: 4 }}>NOSE BRIDGE (#6)</div>
            {noseBridge ? (
                <>
                    <div>x: <span style={{ color: '#fff' }}>{fmt(noseBridge.x)}</span></div>
                    <div>y: <span style={{ color: '#fff' }}>{fmt(noseBridge.y)}</span></div>
                    <div>z: <span style={{ color: '#fff' }}>{fmt(noseBridge.z)}</span></div>
                </>
            ) : <div style={{ color: '#ff4444' }}>no face detected</div>}

            {/* Left Pupil - Landmark #468 */}
            <div style={{ color: '#aaa', marginTop: 6 }}>LEFT PUPIL (#468)</div>
            {leftPupil ? (
                <>
                    <div>x: <span style={{ color: '#fff' }}>{fmt(leftPupil.x)}</span></div>
                    <div>y: <span style={{ color: '#fff' }}>{fmt(leftPupil.y)}</span></div>
                    <div>z: <span style={{ color: '#fff' }}>{fmt(leftPupil.z)}</span></div>
                </>
            ) : <div style={{ color: '#ff4444' }}>—</div>}

            {/* Right Pupil - Landmark #473 */}
            <div style={{ color: '#aaa', marginTop: 6 }}>RIGHT PUPIL (#473)</div>
            {rightPupil ? (
                <>
                    <div>x: <span style={{ color: '#fff' }}>{fmt(rightPupil.x)}</span></div>
                    <div>y: <span style={{ color: '#fff' }}>{fmt(rightPupil.y)}</span></div>
                    <div>z: <span style={{ color: '#fff' }}>{fmt(rightPupil.z)}</span></div>
                </>
            ) : <div style={{ color: '#ff4444' }}>—</div>}

            {/* Interpupillary Distance */}
            <div style={{ color: '#aaa', marginTop: 6 }}>IPD (normalized)</div>
            <div>{ipd
                ? <span style={{ color: '#fff' }}>{ipd}</span>
                : <span style={{ color: '#ff4444' }}>—</span>}
            </div>

            {/* Head Pose */}
            <div style={{ color: '#aaa', marginTop: 6 }}>HEAD POSE</div>
            {headPose ? (
                <>
                    <div>pitch: <span style={{ color: '#fff' }}>{fmt(headPose.pitch)}°</span></div>
                    <div>yaw:   <span style={{ color: '#fff' }}>{fmt(headPose.yaw)}°</span></div>
                    <div>roll:  <span style={{ color: '#fff' }}>{fmt(headPose.roll)}°</span></div>
                </>
            ) : <div style={{ color: '#ff4444' }}>—</div>}

            {/* Total landmarks detected */}
            <div style={{ color: '#aaa', marginTop: 6 }}>LANDMARKS DETECTED</div>
            <div>{rawLandmarks
                ? <span style={{ color: '#fff' }}>{rawLandmarks.length}</span>
                : <span style={{ color: '#ff4444' }}>0</span>}
            </div>
        </div>
    )
}
