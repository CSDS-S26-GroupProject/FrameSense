// frontend/src/App.tsx
import { useRef, useState } from 'react'
import './App.css'
import { useMediaPipe } from './hooks/useMediaPipe'
import CameraFeed from './components/CameraFeed'
import GlassesSidebar from './components/GlassesSidebar'
import DistanceIndicator from './components/DistanceIndicator'
import FaceShapeAnalyzer from './components/FaceShapeAnalyzer'

function App() {
  const videoRef = useRef<HTMLVideoElement>(null)
  useMediaPipe(videoRef)

  const [showAnalyzer, setShowAnalyzer] = useState(false)

  // Show the face shape analyzer page
  if (showAnalyzer) {
    return <FaceShapeAnalyzer onBack={() => setShowAnalyzer(false)} />
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>FrameSense</h1>

        {/* Face Shape Button */}
        <button
          onClick={() => setShowAnalyzer(true)}
          style={{
            marginLeft: 'auto',
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.12)',
            color: '#fff',
            padding: '0.45rem 1rem',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '0.82rem',
            fontFamily: 'inherit',
            fontWeight: 500,
            letterSpacing: '0.01em',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
          }}
        >
          🔍 Find your face shape
        </button>
      </header>

      <main className="app-main">
        <CameraFeed videoRef={videoRef} />
        <GlassesSidebar />
        <DistanceIndicator />
      </main>
    </div>
  )
}

export default App
