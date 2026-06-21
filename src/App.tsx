import { Routes, Route } from 'react-router-dom'
import HomeView from '@/views/HomeView'
import EditorView from '@/views/EditorView'
import DirectorView from '@/views/DirectorView'
import CameraView from '@/views/CameraView'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomeView />} />
      <Route path="/editor/:showId" element={<EditorView />} />
      <Route path="/director/:showCode" element={<DirectorView />} />
      <Route path="/camera/:showCode/:camNum" element={<CameraView />} />
    </Routes>
  )
}
