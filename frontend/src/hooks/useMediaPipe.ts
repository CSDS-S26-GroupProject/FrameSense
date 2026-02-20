// frontend/src/hooks/useMediaPipe.ts
import { useEffect, useRef } from 'react'
import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision'
import { useFSStore } from '../store/useFSStore'
import type { Point3D, HeadPose } from '../types/contract'

export function useMediaPipe(videoRef: React.RefObject<HTMLVideoElement | null>) {
    const setLandmarks = useFSStore((state) => state.setLandmarks)
    const setHeadPose = useFSStore((state) => state.setHeadPose)
    const landmarkerRef = useRef<FaceLandmarker | null>(null)
    const animFrameRef = useRef<number>(0)

    useEffect(() => {
        let active = true

        async function init() {
            // 1. load the WASM runtime
            const vision = await FilesetResolver.forVisionTasks(
                'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm'
            )

            // 2. create the face landmarker
            landmarkerRef.current = await FaceLandmarker.createFromOptions(vision, {
                baseOptions: {
                    modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
                    delegate: 'GPU',
                },
                outputFaceBlendshapes: false,
                outputFacialTransformationMatrixes: true, // needed for head pose
                runningMode: 'VIDEO',
                numFaces: 1,
            })

            // 3. request webcam
            const stream = await navigator.mediaDevices.getUserMedia({ video: true })
            if (!videoRef.current || !active) return
            videoRef.current.srcObject = stream
            await videoRef.current.play()

            // 4. start the detection loop
            detect()
        }

        function detect() {
            if (!landmarkerRef.current || !videoRef.current || !active) return

            const results = landmarkerRef.current.detectForVideo(
                videoRef.current,
                performance.now()
            )

            if (results.faceLandmarks?.[0]) {
                const landmarks = results.faceLandmarks[0] as Point3D[]
                setLandmarks(landmarks)

                // extract head pose from the transformation matrix
                if (results.facialTransformationMatrixes?.[0]) {
                    const matrix = new Float32Array(results.facialTransformationMatrixes[0].data)
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
    }, [setLandmarks, setHeadPose, videoRef])
}

function extractHeadPose(matrix: Float32Array): HeadPose {
    // extract euler angles from the 4x4 transformation matrix
    const pitch = Math.atan2(-matrix[9], matrix[10]) * (180 / Math.PI)
    const yaw = Math.atan2(matrix[8], matrix[0]) * (180 / Math.PI)
    const roll = Math.asin(matrix[4]) * (180 / Math.PI)
    return { pitch, yaw, roll }
}