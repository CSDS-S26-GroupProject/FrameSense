// frontend/src/hooks/useMediaPipe.ts
import { useEffect, useRef } from 'react'
import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision'
import { useFSStore } from '../store/useFSStore'
import type { Point3D, HeadPose } from '../types/contract'

interface Options {
    /** Acquire the webcam stream inside the hook (default true).
     *  Set to false when the caller (e.g. WebcamView) already owns the stream
     *  and has attached it to videoRef.current.srcObject. */
    acquireStream?: boolean
}

export function useMediaPipe(videoRef: React.RefObject<HTMLVideoElement | null>, options?: Options) {
    const acquireStream = options?.acquireStream ?? true
    const setLandmarks = useFSStore((state) => state.setLandmarks)
    const setHeadPose = useFSStore((state) => state.setHeadPose)
    const setRawTransformMatrix = useFSStore((state) => state.setRawTransformMatrix)
    const landmarkerRef = useRef<FaceLandmarker | null>(null)
    const animFrameRef = useRef<number>(0)

    useEffect(() => {
        let active = true

        async function init() {
            const vision = await FilesetResolver.forVisionTasks(
                'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm'
            )

            landmarkerRef.current = await FaceLandmarker.createFromOptions(vision, {
                baseOptions: {
                    modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
                    delegate: 'GPU',
                },
                outputFaceBlendshapes: false,
                outputFacialTransformationMatrixes: true,
                runningMode: 'VIDEO',
                numFaces: 1,
            })

            if (acquireStream) {
                const stream = await navigator.mediaDevices.getUserMedia({ video: true })
                if (!videoRef.current || !active) return
                videoRef.current.srcObject = stream
                await videoRef.current.play()
            } else {
                // Wait for the external owner (WebcamView) to attach a stream.
                while (active && !videoRef.current?.srcObject) {
                    await new Promise((r) => setTimeout(r, 80))
                }
                if (!active) return
                await videoRef.current?.play().catch(() => {})
            }

            detect()
        }

        function detect() {
            if (!landmarkerRef.current || !videoRef.current || !active) return

            if (videoRef.current.readyState < 2 || videoRef.current.videoWidth === 0) {
                animFrameRef.current = requestAnimationFrame(detect)
                return
            }

            const results = landmarkerRef.current.detectForVideo(
                videoRef.current,
                performance.now()
            )

            if (results.faceLandmarks?.[0]) {
                const landmarks = results.faceLandmarks[0] as Point3D[]
                setLandmarks(landmarks)

                if (results.facialTransformationMatrixes?.[0]) {
                    const matrix = new Float32Array(results.facialTransformationMatrixes[0].data)
                    setRawTransformMatrix(matrix)
                    const pose = extractHeadPose(matrix)
                    setHeadPose(pose)
                }
            }

            animFrameRef.current = requestAnimationFrame(detect)
        }

        init()

        return () => {
            active = false
            cancelAnimationFrame(animFrameRef.current)
            landmarkerRef.current?.close()
        }
    }, [setLandmarks, setHeadPose, setRawTransformMatrix, videoRef, acquireStream])
}

function extractHeadPose(matrix: Float32Array): HeadPose {
    const pitch = Math.atan2(-matrix[9], matrix[10]) * (180 / Math.PI)
    const yaw = Math.atan2(matrix[8], matrix[0]) * (180 / Math.PI)
    const roll = Math.asin(matrix[4]) * (180 / Math.PI)
    return { pitch, yaw, roll }
}
