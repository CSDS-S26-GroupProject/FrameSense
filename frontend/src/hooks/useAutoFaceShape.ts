import { useEffect, useRef, useState, type RefObject } from 'react'
import { useFSStore } from '../store/useFSStore'
import type { FaceShape } from '../types/contract'

export type AutoFaceShapeStatus = 'detecting' | 'capturing' | 'done' | 'error'

const API_URL = 'http://localhost:5001/predict-image'
// Landmarks update ~30x/s. 60 consecutive stable frames ≈ 2s of tracked face.
const REQUIRED_STABLE_FRAMES = 60

export function useAutoFaceShape(videoRef: RefObject<HTMLVideoElement | null>) {
  const [trigger, setTrigger] = useState(0)
  const [status, setStatus] = useState<AutoFaceShapeStatus>('detecting')
  const videoRefLatest = useRef(videoRef)
  videoRefLatest.current = videoRef

  useEffect(() => {
    setStatus('detecting')
    let stableFrames = 0
    let captured = false

    const unsubscribe = useFSStore.subscribe((state, prev) => {
      if (captured) return
      if (!state.rawLandmarks) {
        stableFrames = 0
        return
      }
      if (state.rawLandmarks === prev.rawLandmarks) return
      stableFrames += 1
      if (stableFrames >= REQUIRED_STABLE_FRAMES) {
        captured = true
        captureAndPredict()
      }
    })

    async function captureAndPredict() {
      const video = videoRefLatest.current.current
      if (!video || !video.videoWidth || !video.videoHeight) {
        setStatus('error')
        return
      }
      setStatus('capturing')

      const canvas = document.createElement('canvas')
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        setStatus('error')
        return
      }
      ctx.drawImage(video, 0, 0)

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, 'image/jpeg', 0.9)
      )
      if (!blob) {
        setStatus('error')
        return
      }

      try {
        const formData = new FormData()
        formData.append('image', blob, 'capture.jpg')
        const res = await fetch(API_URL, { method: 'POST', body: formData })
        if (!res.ok) throw new Error(`API ${res.status}`)
        const data = (await res.json()) as { faceShape: string }
        useFSStore.getState().setFaceShape(data.faceShape.toLowerCase() as FaceShape)
        setStatus('done')
      } catch (err) {
        console.warn('[autoFaceShape] prediction failed — Flask API offline?', err)
        setStatus('error')
      }
    }

    return () => {
      unsubscribe()
    }
  }, [trigger])

  return {
    rescan: () => setTrigger((t) => t + 1),
    status,
  }
}
