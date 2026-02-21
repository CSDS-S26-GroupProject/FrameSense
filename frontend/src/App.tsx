import { useRef } from 'react'
import './App.css'
import { useMediaPipe } from './hooks/useMediaPipe'
import CameraFeed from './components/CameraFeed'
import GlassesSidebar from './components/GlassesSidebar'

function App() {
  const videoRef = useRef<HTMLVideoElement>(null)
  useMediaPipe(videoRef)

  return (
    <div className="app">
      <header className="app-header">
        <h1>FrameSense</h1>
      </header>
      <main className="app-main">
        <CameraFeed videoRef={videoRef} />
        <GlassesSidebar />
      </main>
    </div>
  )
}

export default App