import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import './index.css'
import Home from './pages/Home'
import Admin from './pages/Admin'
import Products from './pages/Products'
import Plants from './pages/Plants'
import ShoppingList from './pages/ShoppingList'
import ShoppingAdmin from './pages/ShoppingAdmin'
import ShoppingHistory from './pages/ShoppingHistory'
import Login from './pages/Login'
import Register from './pages/Register'
import HouseSelect from './pages/HouseSelect'
import HouseSettings from './pages/HouseSettings'
import SuperAdmin from './pages/SuperAdmin'
import Stats from './pages/Stats'
import Layout from './components/Layout'
import { authClient } from './lib/auth'
import { getActiveHouse } from './lib/house'
import { getStoredHomeScreen, routeForHomeScreen } from './lib/homeScreen'

function RequireAuth({ children }) {
  const { data: session, isPending } = authClient.useSession()

  if (isPending) {
    return (
      <div className="min-h-dvh flex items-center justify-center" style={{ background: 'var(--surface-base)' }}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-full border-[3px] border-t-transparent animate-spin" style={{ borderColor: 'var(--moss-200)', borderTopColor: 'transparent' }} />
          <p className="font-body text-sm" style={{ color: 'var(--bark-300)' }}>Cargando...</p>
        </div>
      </div>
    )
  }

  if (!session) return <Navigate to="/login" replace />
  return children
}

function RequireHouse({ children }) {
  const house = getActiveHouse()
  if (!house) return <Navigate to="/houses" replace />
  return children
}

function HomeRedirect() {
  const house = getActiveHouse()
  const preferred = getStoredHomeScreen(house?.id)
  return <Navigate to={routeForHomeScreen(preferred)} replace />
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HashRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Authenticated, no house selected */}
        <Route path="/houses" element={<RequireAuth><HouseSelect /></RequireAuth>} />

        {/* Authenticated + house selected */}
        <Route element={<RequireAuth><RequireHouse><Layout /></RequireHouse></RequireAuth>}>
          <Route path="/" element={<HomeRedirect />} />
          <Route path="/tasks" element={<Home />} />
          <Route path="/products" element={<Products />} />
          <Route path="/plants" element={<Plants />} />
          <Route path="/shopping" element={<ShoppingList />} />
          <Route path="/shopping/admin" element={<ShoppingAdmin />} />
          <Route path="/shopping/history" element={<ShoppingHistory />} />
          <Route path="/stats" element={<Stats />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/house-settings" element={<HouseSettings />} />
          <Route path="/super-admin" element={<SuperAdmin />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  </React.StrictMode>,
)
