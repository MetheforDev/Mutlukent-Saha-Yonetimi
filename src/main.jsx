import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Login from './pages/Login'
import ModulSecimi from './pages/ModulSecimi'
import SubeSecimi from './pages/SubeSecimi'
import CizelgePage from './modules/cizelge/CizelgePage'
import SubeAyarlari from './modules/cizelge/SubeAyarlari'
import PuantajPage from './modules/puantaj/PuantajPage'
import './index.css'

function Guard({ children }) {
  const { session, loading } = useAuth()
  if (loading) return <div className="p-8 text-mute">Yükleniyor…</div>
  return session ? children : <Navigate to="/login" replace />
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Guard><ModulSecimi /></Guard>} />
          <Route path="/cizelge" element={<Guard><SubeSecimi /></Guard>} />
          <Route path="/cizelge/:subeId" element={<Guard><CizelgePage /></Guard>} />
          <Route path="/cizelge/:subeId/ayarlar" element={<Guard><SubeAyarlari /></Guard>} />
          <Route path="/puantaj" element={<Guard><SubeSecimi modul="puantaj" /></Guard>} />
          <Route path="/puantaj/:subeId" element={<Guard><PuantajPage /></Guard>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  </React.StrictMode>
)
