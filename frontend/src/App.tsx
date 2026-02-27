import { useRef } from 'react'
import './App.css'
import { useMediaPipe } from './hooks/useMediaPipe'
import CameraFeed from './components/CameraFeed'
import GlassesSidebar from './components/GlassesSidebar'
import LandmarkDebug from './components/LandmarkDebug'


function App() {
  const videoRef = useRef<HTMLVideoElement>(null)
  useMediaPipe(videoRef)

  return (
    <div className="app">
      <header className="app-header">
        <h1>FrameSense</h1>
      </header>
      <main className="app-main">
        <LandmarkDebug />
        <CameraFeed videoRef={videoRef} />
        <GlassesSidebar />
      </main>
    </div>
  )
}

export default App