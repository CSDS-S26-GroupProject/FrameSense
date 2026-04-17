import { BrowserRouter, Route, Routes } from 'react-router-dom'
import Index from './pages/Index'
import Scan from './pages/Scan'
import TryOn from './pages/TryOn'
import NotFound from './pages/NotFound'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/scan" element={<Scan />} />
        <Route path="/try-on" element={<TryOn />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  )
}
