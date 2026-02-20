import { useRef, useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import { useFSStore } from './store/useFSStore'
import { useMediaPipe } from './hooks/useMediaPipe'

function App() {
  const videoRef = useRef<HTMLVideoElement>(null)
  useMediaPipe(videoRef)

  const yaw = useFSStore((state) => state.headPose?.yaw?.toFixed(1) ?? 'waiting...')
  const [count, setCount] = useState(0)

  return (
    <>
      {/* hidden video element — MediaPipe reads frames from this */}
      <video ref={videoRef} style={{ display: 'none' }} playsInline muted />

      <div>
        <a href="https://vite.dev" target="_blank">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>Vite + React</h1>
      <div className="card">
        <button onClick={() => setCount((count) => count + 1)}>
          count is {count}
        </button>
        <p>
          Edit <code>src/App.tsx</code> and save to test HMR
        </p>
      </div>
      <p className="read-the-docs">
        Click on the Vite and React logos to learn more
      </p>
      <p>Yaw: {yaw}°</p>
    </>
  )
}

export default App