import { useRef } from 'react'
import './App.css'
import { useMediaPipe } from './hooks/useMediaPipe'
import CameraFeed from './components/CameraFeed'
import GlassesSidebar from './components/GlassesSidebar'
import LandmarkDebug from './components/LandmarkDebug'
import DistanceIndicator from './components/DistanceIndicator'
import LandmarkMesh from './components/LandmarkMesh'




function App() {
  const videoRef = useRef<HTMLVideoElement>(null)
  useMediaPipe(videoRef)

  return (
    <div className="app">
      <header className="app-header">
        <h1>FrameSense</h1>
      </header>
      <main className="app-main">
        <div className="camera-container">  {/** wraps the stuff laid on the camera image since there is a dimension difference from the logo at the top and the glasses sidebar (from the app.css file) */}
            <CameraFeed videoRef={videoRef} />
        </div>
        <GlassesSidebar />
        <DistanceIndicator />
      </main>
    </div>
  )
}

export default App