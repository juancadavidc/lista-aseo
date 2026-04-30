import { useState, useEffect, useRef } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { authClient } from '../lib/auth'
import { getActiveHouse, clearActiveHouse } from '../lib/house'
import { fetchHouseProfile, checkSuperAdmin } from '../lib/api'
import InstallPrompt from './InstallPrompt'

export default function Layout() {
  const navigate = useNavigate()
  const house = getActiveHouse()
  const { data: session } = authClient.useSession()
  const [profile, setProfile] = useState(null)
  const [showDropdown, setShowDropdown] = useState(false)
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)
  const dropdownRef = useRef(null)

  useEffect(() => {
    fetchHouseProfile().then(setProfile).catch(() => {})
    checkSuperAdmin().then(r => setIsSuperAdmin(r.isSuperAdmin)).catch(() => {})
  }, [house?.id])

  useEffect(() => {
    function handleProfileUpdated(e) {
      setProfile(e.detail)
    }
    window.addEventListener('profileUpdated', handleProfileUpdated)
    return () => window.removeEventListener('profileUpdated', handleProfileUpdated)
  }, [])

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  async function handleLogout() {
    clearActiveHouse()
    await authClient.signOut()
    navigate('/login')
  }

  function handleSwitchHouse() {
    clearActiveHouse()
    navigate('/houses')
  }

  const navItems = [
    { to: '/', label: 'Tareas', end: true, activeColor: 'var(--moss-500)' },
    { to: '/stats', label: 'Stats', activeColor: 'var(--moss-500)' },
    { to: '/products', label: 'Productos', activeColor: 'var(--clay-500)' },
    { to: '/plants', label: 'Plantas', activeColor: 'var(--moss-500)' },
    { to: '/shopping', label: 'Compras', activeColor: 'var(--clay-500)' },
    { to: '/admin', label: 'Admin', activeColor: 'var(--clay-500)' },
    { to: '/house-settings', label: 'Casa', activeColor: 'var(--moss-500)' },
  ]

  return (
    <div className="min-h-dvh flex flex-col bg-grain" style={{ background: 'var(--surface-base)' }}>
      {/* Subtle gradient orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div
          className="absolute -top-32 -right-32 w-96 h-96 rounded-full opacity-[0.07]"
          style={{ background: 'radial-gradient(circle, #6a9960 0%, transparent 70%)' }}
        />
        <div
          className="absolute -bottom-48 -left-24 w-[500px] h-[500px] rounded-full opacity-[0.05]"
          style={{ background: 'radial-gradient(circle, #b85a3a 0%, transparent 70%)' }}
        />
      </div>

      {/* Header */}
      <header className="glass-header sticky top-0 z-20 px-4">
        <div className="max-w-lg mx-auto flex items-center justify-between h-14 gap-2">
          <NavLink to="/" className="flex items-center gap-2 group flex-shrink-0" end>
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-transform group-hover:scale-105"
              style={{ background: 'linear-gradient(135deg, #6a9960 0%, #4d7a44 100%)' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M9 22V12h6v10" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div className="hidden sm:block">
              <h1 className="font-display text-lg leading-none" style={{ color: 'var(--bark-700)' }}>
                {house?.name || 'Casa Limpia'}
              </h1>
            </div>
          </NavLink>

          <div className="flex items-center gap-2 min-w-0">
            <nav className="nav-scroll flex items-center gap-0.5 p-1 rounded-xl overflow-x-auto" style={{ background: 'rgba(196,184,166,0.15)', WebkitOverflowScrolling: 'touch' }}>
              {navItems.map(item => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `px-2 sm:px-3 py-1.5 rounded-lg text-[11px] sm:text-[12px] font-medium font-body transition-all duration-200 whitespace-nowrap ${
                      isActive ? 'shadow-sm' : 'hover:opacity-80'
                    }`
                  }
                  style={({ isActive }) => isActive
                    ? { background: 'var(--surface-elevated)', color: item.activeColor, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }
                    : { color: 'var(--bark-300)' }
                  }
                  end={item.end}
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>

            {/* User avatar with dropdown */}
            <div className="relative flex-shrink-0" ref={dropdownRef}>
              <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="flex items-center gap-1.5 pl-1 pr-1 sm:pr-2.5 py-1 rounded-xl transition-all active:scale-95 hover:shadow-sm"
                style={{ background: 'var(--surface-elevated)', border: '1px solid rgba(196,184,166,0.2)' }}
              >
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-sm"
                  style={{ background: (profile?.color || '#6a9960') + '22', border: `2px solid ${profile?.color || '#6a9960'}` }}
                >
                  {profile?.avatar || '🧑'}
                </div>
                <span className="font-body text-[12px] font-semibold hidden sm:inline" style={{ color: 'var(--bark-500)' }}>
                  {session?.user?.name || ''}
                </span>
              </button>

              {showDropdown && (
                <div
                  className="absolute right-0 top-full mt-2 w-48 rounded-xl overflow-hidden shadow-lg fade-in z-30"
                  style={{ background: 'var(--surface-card)', border: '1px solid rgba(196,184,166,0.25)' }}
                >
                  <button
                    onClick={() => { setShowDropdown(false); navigate('/house-settings') }}
                    className="w-full px-4 py-2.5 text-left font-body text-[13px] font-medium transition-all hover:opacity-80"
                    style={{ color: 'var(--bark-700)' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(196,184,166,0.1)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    Mi perfil
                  </button>
                  {isSuperAdmin && (
                    <button
                      onClick={() => { setShowDropdown(false); navigate('/super-admin') }}
                      className="w-full px-4 py-2.5 text-left font-body text-[13px] font-medium transition-all hover:opacity-80"
                      style={{ color: 'var(--moss-600)' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(106,153,96,0.06)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      Super Admin
                    </button>
                  )}
                  <button
                    onClick={() => { setShowDropdown(false); handleSwitchHouse() }}
                    className="w-full px-4 py-2.5 text-left font-body text-[13px] font-medium transition-all hover:opacity-80"
                    style={{ color: 'var(--bark-700)' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(196,184,166,0.1)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    Cambiar casa
                  </button>
                  <div style={{ borderTop: '1px solid rgba(196,184,166,0.2)' }} />
                  <button
                    onClick={() => { setShowDropdown(false); handleLogout() }}
                    className="w-full px-4 py-2.5 text-left font-body text-[13px] font-medium transition-all hover:opacity-80"
                    style={{ color: 'var(--clay-500)' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(184,90,58,0.04)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    Cerrar sesion
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Page content */}
      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-6 relative">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="max-w-lg mx-auto w-full px-4 py-5 text-center relative">
        <p className="text-[11px] font-body font-medium tracking-wide uppercase" style={{ color: 'var(--bark-300)', letterSpacing: '0.08em' }}>
          {house?.name || 'Casa Limpia'}
        </p>
      </footer>

      <InstallPrompt />
    </div>
  )
}
