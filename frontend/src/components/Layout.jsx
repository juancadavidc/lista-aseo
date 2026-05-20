import { useState, useEffect, useRef } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { authClient } from '../lib/auth'
import { getActiveHouse, clearActiveHouse } from '../lib/house'
import { fetchHouseProfile, checkSuperAdmin } from '../lib/api'
import { setStoredHomeScreen } from '../lib/homeScreen'
import InstallPrompt from './InstallPrompt'

export default function Layout() {
  const navigate = useNavigate()
  const house = getActiveHouse()
  const { data: session } = authClient.useSession()
  const [profile, setProfile] = useState(null)
  const [showDropdown, setShowDropdown] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)
  const dropdownRef = useRef(null)

  useEffect(() => {
    fetchHouseProfile().then(p => {
      setProfile(p)
      if (p?.home_screen && house?.id) setStoredHomeScreen(house.id, p.home_screen)
    }).catch(() => {})
    checkSuperAdmin().then(r => setIsSuperAdmin(r.isSuperAdmin)).catch(() => {})
  }, [house?.id])

  useEffect(() => {
    function handleProfileUpdated(e) {
      setProfile(e.detail)
      if (e.detail?.home_screen && house?.id) setStoredHomeScreen(house.id, e.detail.home_screen)
    }
    window.addEventListener('profileUpdated', handleProfileUpdated)
    return () => window.removeEventListener('profileUpdated', handleProfileUpdated)
  }, [house?.id])

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    function handleKey(e) {
      if (e.key === 'Escape') setShowMenu(false)
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [])

  useEffect(() => {
    if (showMenu) {
      const prev = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return () => { document.body.style.overflow = prev }
    }
  }, [showMenu])

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
          <div className="flex items-center gap-2 min-w-0">
            <button
              type="button"
              onClick={() => setShowMenu(true)}
              aria-label="Abrir menu"
              aria-expanded={showMenu}
              className="w-11 h-11 rounded-xl flex items-center justify-center transition-all active:scale-95 hover:shadow-sm flex-shrink-0"
              style={{ background: 'var(--surface-elevated)', border: '1px solid rgba(196,184,166,0.25)' }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" style={{ color: 'var(--bark-700)' }}>
                <path d="M4 6h16" />
                <path d="M4 12h16" />
                <path d="M4 18h16" />
              </svg>
            </button>
            <NavLink to="/" className="flex items-center gap-2 group min-w-0" end>
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-transform group-hover:scale-105 flex-shrink-0"
                style={{ background: 'linear-gradient(135deg, #6a9960 0%, #4d7a44 100%)' }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M9 22V12h6v10" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <h1 className="font-display text-base sm:text-lg leading-none truncate" style={{ color: 'var(--bark-700)' }}>
                {house?.name || 'Casa Limpia'}
              </h1>
            </NavLink>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
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

      {/* Hamburger menu drawer */}
      {showMenu && (
        <>
          <div
            className="fixed inset-0 z-40 modal-backdrop fade-in"
            onClick={() => setShowMenu(false)}
            aria-hidden="true"
          />
          <aside
            role="dialog"
            aria-label="Menu de navegacion"
            className="fixed top-0 left-0 bottom-0 z-50 w-[82vw] max-w-xs flex flex-col drawer-slide-in"
            style={{ background: 'var(--surface-card)', borderRight: '1px solid rgba(196,184,166,0.25)', boxShadow: '4px 0 24px rgba(0,0,0,0.08)' }}
          >
            <div className="flex items-center justify-between px-5 h-14 flex-shrink-0" style={{ borderBottom: '1px solid rgba(196,184,166,0.2)' }}>
              <div className="flex items-center gap-2 min-w-0">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg, #6a9960 0%, #4d7a44 100%)' }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M9 22V12h6v10" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <h2 className="font-display text-base leading-none truncate" style={{ color: 'var(--bark-700)' }}>
                  {house?.name || 'Casa Limpia'}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowMenu(false)}
                aria-label="Cerrar menu"
                className="w-9 h-9 rounded-lg flex items-center justify-center transition-all active:scale-95 hover:opacity-70 flex-shrink-0"
                style={{ color: 'var(--bark-500)' }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                  <path d="M6 6l12 12" />
                  <path d="M18 6L6 18" />
                </svg>
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto py-2 px-2">
              {navItems.map(item => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  onClick={() => setShowMenu(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-3 rounded-xl font-body text-[15px] font-medium transition-all min-h-[44px] ${
                      isActive ? 'shadow-sm' : 'hover:opacity-80'
                    }`
                  }
                  style={({ isActive }) => isActive
                    ? { background: 'var(--surface-elevated)', color: item.activeColor, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }
                    : { color: 'var(--bark-700)' }
                  }
                >
                  {({ isActive }) => (
                    <>
                      <span
                        className="w-1 h-6 rounded-full transition-all"
                        style={{ background: isActive ? item.activeColor : 'transparent' }}
                      />
                      <span>{item.label}</span>
                    </>
                  )}
                </NavLink>
              ))}
            </nav>
          </aside>
        </>
      )}

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
