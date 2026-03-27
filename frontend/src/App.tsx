import { useRef, useState } from 'react'
import './App.css'
import { useMediaPipe } from './hooks/useMediaPipe'
import { useFirebase } from './hooks/useFirebase'
import { useAuthStore } from './store/useAuthStore'
import CameraFeed from './components/CameraFeed'
import GlassesSidebar from './components/GlassesSidebar'
import LandmarkDebug from './components/LandmarkDebug'
import DistanceIndicator from './components/DistanceIndicator'
import LandmarkMesh from './components/LandmarkMesh'

import AuthModal from './components/AuthModal'

function App() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const { user } = useAuthStore()

  useMediaPipe(videoRef)
  useFirebase()

  return (
    <div className="app">
      <header className="app-header">
        <h1>FrameSense</h1>
        <button
          className="auth-button"
          onClick={() => setShowAuthModal(true)}
          title={user ? `Logged in as ${user.email}` : 'Sign in to save sessions'}
        >
          {user ? '👤' : '🔓'}
        </button>
      </header>
      <main className="app-main">
        <div className="camera-container">  {/** wraps the stuff laid on the camera image since there is a dimension difference from the logo at the top and the glasses sidebar (from the app.css file) */}
            <CameraFeed videoRef={videoRef} />
        </div>
        <GlassesSidebar />
        <DistanceIndicator />
      </main>
      {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} />}
    </div>
  )
}

export default App