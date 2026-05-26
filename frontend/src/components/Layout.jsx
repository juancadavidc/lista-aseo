import { useState, useEffect, useRef } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { authClient } from '../lib/auth'
import { getActiveHouse, clearActiveHouse } from '../lib/house'
import { fetchHouseProfile, checkSuperAdmin } from '../lib/api'
import { setStoredHomeScreen } from '../lib/homeScreen'
import InstallPrompt from './InstallPrompt'

function getGreeting() {
  const h = new Date().getHours()
  if (h >= 5 && h < 12) return 'Buenos días'
  if (h >= 12 && h < 19) return 'Buenas tardes'
  return 'Buenas noches'
}

const Icons = {
  tasks: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="5" width="14" height="16" rx="2" />
      <path d="M9 3h6v4H9z" />
      <path d="M9 13l2 2 4-4" />
    </svg>
  ),
  stats: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 20V11" />
      <path d="M10 20V4" />
      <path d="M16 20v-8" />
      <path d="M22 20v-5" />
    </svg>
  ),
  products: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 3h4v3l1.6 2.4a3 3 0 0 1 .4 1.5V19a2 2 0 0 1-2 2H10a2 2 0 0 1-2-2v-9.1c0-.5.1-1 .4-1.5L10 6V3z" />
      <path d="M9 12h6" />
    </svg>
  ),
  plants: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22v-7" />
      <path d="M12 15c-4 0-7-3-7-7 4 0 7 3 7 7z" />
      <path d="M12 15c0-4 3-7 7-7 0 4-3 7-7 7z" />
    </svg>
  ),
  shopping: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 7h12l-1.2 13H7.2L6 7z" />
      <path d="M9 7V5a3 3 0 0 1 6 0v2" />
    </svg>
  ),
  admin: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l8 3v5c0 5-3.5 9-8 10-4.5-1-8-5-8-10V6l8-3z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  ),
  house: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 11l9-7 9 7v9a2 2 0 0 1-2 2h-4v-7H9v7H5a2 2 0 0 1-2-2v-9z" />
    </svg>
  ),
}

const navSections = [
  {
    title: 'Día a día',
    items: [
      { to: '/tasks', label: 'Tareas', end: true, activeColor: 'var(--moss-500)', icon: Icons.tasks },
      { to: '/stats', label: 'Stats', activeColor: 'var(--moss-500)', icon: Icons.stats },
    ],
  },
  {
    title: 'Inventario',
    items: [
      { to: '/products', label: 'Productos', activeColor: 'var(--clay-500)', icon: Icons.products },
      { to: '/plants', label: 'Plantas', activeColor: 'var(--moss-500)', icon: Icons.plants },
      { to: '/shopping', label: 'Compras', activeColor: 'var(--clay-500)', icon: Icons.shopping },
    ],
  },
  {
    title: 'Configuración',
    items: [
      { to: '/admin', label: 'Admin', activeColor: 'var(--clay-500)', icon: Icons.admin },
      { to: '/house-settings', label: 'Casa', activeColor: 'var(--moss-500)', icon: Icons.house },
    ],
  },
]

export default function Layout() {
  const navigate = useNavigate()
  const house = getActiveHouse()
  const { data: session } = authClient.useSession()
  const [profile, setProfile] = useState(null)
  const [showDropdown, setShowDropdown] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)
  const dropdownRef = useRef(null)

  const firstName = (session?.user?.name || '').trim().split(/\s+/)[0]
  const greeting = getGreeting()

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
      <header className="glass-header sticky top-0 z-20 px-3 sm:px-4">
        <div className="max-w-lg mx-auto flex items-center justify-between h-16 gap-2">
          <div className="flex items-center gap-1 min-w-0">
            <button
              type="button"
              onClick={() => setShowMenu(true)}
              aria-label="Abrir menu"
              aria-expanded={showMenu}
              className="w-11 h-11 -ml-1 rounded-xl flex items-center justify-center transition-all active:scale-95 flex-shrink-0 nav-ghost-btn"
              style={{ color: 'var(--bark-500)' }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                <path d="M4 7h16" />
                <path d="M4 12h16" />
                <path d="M4 17h11" />
              </svg>
            </button>
            <NavLink to="/" className="flex items-center gap-2.5 group min-w-0 pl-1" end>
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105 flex-shrink-0 relative overflow-hidden"
                style={{
                  background: 'linear-gradient(140deg, #7aa870 0%, #385c32 100%)',
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.25), 0 1px 2px rgba(56,92,50,0.25), 0 0 0 1px rgba(56,92,50,0.08)'
                }}
              >
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
                  <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M9 22V12h6v10" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div className="flex flex-col min-w-0 justify-center">
                <h1 className="font-display text-[17px] sm:text-[18px] leading-none truncate" style={{ color: 'var(--bark-700)', letterSpacing: '-0.01em' }}>
                  {house?.name || 'Casa Limpia'}
                </h1>
                {firstName && (
                  <span
                    className="font-body text-[10px] font-semibold uppercase truncate mt-1"
                    style={{ color: 'var(--bark-300)', letterSpacing: '0.12em' }}
                  >
                    {greeting}, {firstName}
                  </span>
                )}
              </div>
            </NavLink>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {/* User avatar with dropdown */}
            <div className="relative flex-shrink-0" ref={dropdownRef}>
              <button
                onClick={() => setShowDropdown(!showDropdown)}
                aria-label="Abrir menu de perfil"
                className="flex items-center gap-1.5 pl-1 pr-1 sm:pr-2.5 py-1 rounded-xl transition-all active:scale-95 hover:shadow-sm"
                style={{ background: 'var(--surface-elevated)', border: '1px solid rgba(196,184,166,0.2)' }}
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-base"
                  style={{
                    background: (profile?.color || '#6a9960') + '22',
                    border: `2px solid ${profile?.color || '#6a9960'}`,
                    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.4)'
                  }}
                >
                  {profile?.avatar || '🧑'}
                </div>
                <span className="font-body text-[12px] font-semibold hidden sm:inline" style={{ color: 'var(--bark-500)' }}>
                  {firstName || ''}
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
            className="fixed top-0 left-0 bottom-0 z-50 w-[84vw] max-w-[320px] flex flex-col drawer-slide-in"
            style={{
              background: 'linear-gradient(180deg, var(--surface-card) 0%, var(--surface-base) 100%)',
              borderRight: '1px solid rgba(196,184,166,0.3)',
              boxShadow: '8px 0 32px rgba(26,22,20,0.10), 2px 0 8px rgba(26,22,20,0.04)'
            }}
          >
            {/* Brand row */}
            <div className="flex items-center justify-between px-5 h-14 flex-shrink-0" style={{ borderBottom: '1px solid rgba(196,184,166,0.18)' }}>
              <div className="flex items-center gap-2 min-w-0">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{
                    background: 'linear-gradient(140deg, #7aa870 0%, #385c32 100%)',
                    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.25), 0 1px 2px rgba(56,92,50,0.25)'
                  }}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                    <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M9 22V12h6v10" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <h2 className="font-display text-[16px] leading-none truncate" style={{ color: 'var(--bark-700)', letterSpacing: '-0.01em' }}>
                  {house?.name || 'Casa Limpia'}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowMenu(false)}
                aria-label="Cerrar menu"
                className="w-9 h-9 rounded-lg flex items-center justify-center transition-all active:scale-95 nav-ghost-btn flex-shrink-0"
                style={{ color: 'var(--bark-500)' }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
                  <path d="M6 6l12 12" />
                  <path d="M18 6L6 18" />
                </svg>
              </button>
            </div>

            {/* Welcome card */}
            <div className="px-5 py-4 flex items-center gap-3 flex-shrink-0" style={{ borderBottom: '1px solid rgba(196,184,166,0.18)' }}>
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center text-xl flex-shrink-0"
                style={{
                  background: (profile?.color || '#6a9960') + '1f',
                  border: `2px solid ${profile?.color || '#6a9960'}`,
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.4), 0 1px 3px rgba(26,22,20,0.06)'
                }}
              >
                {profile?.avatar || '🧑'}
              </div>
              <div className="min-w-0 flex flex-col">
                <span
                  className="font-body text-[10px] font-semibold uppercase truncate"
                  style={{ color: 'var(--bark-300)', letterSpacing: '0.14em' }}
                >
                  {greeting}
                </span>
                <span
                  className="font-display text-[19px] leading-tight truncate mt-0.5"
                  style={{ color: 'var(--bark-700)', letterSpacing: '-0.01em' }}
                >
                  {firstName || 'Hola'}
                </span>
              </div>
            </div>

            {/* Nav sections */}
            <nav className="flex-1 overflow-y-auto py-3 px-3">
              {navSections.map((section, idx) => (
                <div key={section.title} className={idx > 0 ? 'mt-5' : ''}>
                  <div
                    className="px-3 mb-1.5 font-body text-[10px] font-semibold uppercase"
                    style={{ color: 'var(--bark-300)', letterSpacing: '0.14em' }}
                  >
                    {section.title}
                  </div>
                  {section.items.map(item => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.end}
                      onClick={() => setShowMenu(false)}
                      className="flex items-center gap-2.5 pl-2 pr-3 py-2.5 rounded-xl font-body text-[15px] font-medium transition-all min-h-[44px] nav-item"
                      style={({ isActive }) => isActive
                        ? {
                            background: 'var(--surface-elevated)',
                            color: item.activeColor,
                            boxShadow: '0 1px 3px rgba(26,22,20,0.06), 0 4px 12px rgba(26,22,20,0.04)'
                          }
                        : { color: 'var(--bark-700)' }
                      }
                    >
                      {({ isActive }) => (
                        <>
                          <span
                            className="w-[3px] h-6 rounded-full transition-all flex-shrink-0"
                            style={{ background: isActive ? item.activeColor : 'transparent' }}
                          />
                          <span
                            className="flex items-center justify-center w-5 h-5 flex-shrink-0 transition-colors"
                            style={{ color: isActive ? item.activeColor : 'var(--bark-400)' }}
                          >
                            {item.icon}
                          </span>
                          <span>{item.label}</span>
                        </>
                      )}
                    </NavLink>
                  ))}
                </div>
              ))}
            </nav>

            {/* Drawer footer */}
            <div className="flex-shrink-0 px-5 py-3 text-center" style={{ borderTop: '1px solid rgba(196,184,166,0.18)' }}>
              <span
                className="font-body text-[10px] font-semibold uppercase"
                style={{ color: 'var(--bark-300)', letterSpacing: '0.18em' }}
              >
                Casa Limpia
              </span>
            </div>
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
