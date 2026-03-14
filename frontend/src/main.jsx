import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import './index.css'
import Home from './pages/Home'
import Admin from './pages/Admin'
import Products from './pages/Products'
import ProfileSelect from './pages/ProfileSelect'
import Layout from './components/Layout'
import { getActiveProfile } from './lib/profiles'

function RequireProfile({ children }) {
  const profile = getActiveProfile()
  if (!profile) return <Navigate to="/profiles" replace />
  return children
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HashRouter>
      <Routes>
        <Route path="/profiles" element={<ProfileSelect />} />
        <Route element={<RequireProfile><Layout /></RequireProfile>}>
          <Route path="/" element={<Home />} />
          <Route path="/products" element={<Products />} />
          <Route path="/admin" element={<Admin />} />
        </Route>
      </Routes>
    </HashRouter>
  </React.StrictMode>,
)
