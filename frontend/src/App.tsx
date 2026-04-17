// frontend/src/App.tsx
import { useRef } from 'react'
import './App.css'
import { useMediaPipe } from './hooks/useMediaPipe'
import { useAutoFaceShape } from './hooks/useAutoFaceShape'
import { useFitScore } from './hooks/useFitScore'
import { useFSStore } from './store/useFSStore'
import CameraFeed from './components/CameraFeed'
import GlassesSidebar from './components/GlassesSidebar'

function App() {
  const videoRef = useRef<HTMLVideoElement>(null)
  useMediaPipe(videoRef)
  useFitScore()
  const { status, rescan } = useAutoFaceShape(videoRef)
  const faceShape = useFSStore((s) => s.faceShape)

  let label: string
  if (faceShape) label = `Detected: ${faceShape} face`
  else if (status === 'detecting') label = 'Looking for your face…'
  else if (status === 'capturing') label = 'Analyzing…'
  else if (status === 'error') label = "Couldn't detect — try rescan"
  else label = ''

  return (
    <div className="app">
      <header className="app-header">
        <h1>FrameSense</h1>
        <div className="face-shape-chip">
          <span className="face-shape-chip-label">{label}</span>
          <button onClick={rescan} className="rescan-btn" title="Rescan face shape">
            ↻ Rescan
          </button>
        </div>
      </header>
      <main className="app-main">
        <CameraFeed videoRef={videoRef} />
        <GlassesSidebar />
      </main>
    </div>
  )
}

export default App
