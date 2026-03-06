import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { getActiveProfile } from '../lib/profiles'

export default function Layout() {
  const profile = getActiveProfile()
  const navigate = useNavigate()

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
        <div className="max-w-lg mx-auto flex items-center justify-between h-14">
          <NavLink to="/" className="flex items-center gap-2.5 group" end>
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-transform group-hover:scale-105"
              style={{ background: 'linear-gradient(135deg, #6a9960 0%, #4d7a44 100%)' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M9 22V12h6v10" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h1 className="font-display text-lg" style={{ color: 'var(--bark-700)' }}>
              Casa Limpia
            </h1>
          </NavLink>

          <div className="flex items-center gap-2">
          <nav className="flex items-center gap-0.5 p-1 rounded-xl" style={{ background: 'rgba(196,184,166,0.15)' }}>
            <NavLink
              to="/"
              className={({ isActive }) =>
                `px-3.5 py-1.5 rounded-lg text-[13px] font-medium font-body transition-all duration-200 ${
                  isActive ? 'shadow-sm' : 'hover:opacity-80'
                }`
              }
              style={({ isActive }) => isActive
                ? { background: 'var(--surface-elevated)', color: 'var(--moss-500)', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }
                : { color: 'var(--bark-300)' }
              }
              end
            >
              Tareas
            </NavLink>
            <NavLink
              to="/admin"
              className={({ isActive }) =>
                `px-3.5 py-1.5 rounded-lg text-[13px] font-medium font-body transition-all duration-200 ${
                  isActive ? 'shadow-sm' : 'hover:opacity-80'
                }`
              }
              style={({ isActive }) => isActive
                ? { background: 'var(--surface-elevated)', color: 'var(--clay-500)', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }
                : { color: 'var(--bark-300)' }
              }
            >
              Admin
            </NavLink>
          </nav>

          {/* Profile avatar */}
          {profile && (
            <button
              onClick={() => navigate('/profiles')}
              className="flex items-center gap-1.5 pl-1 pr-2.5 py-1 rounded-xl transition-all active:scale-95 hover:shadow-sm"
              style={{ background: 'var(--surface-elevated)', border: '1px solid rgba(196,184,166,0.2)' }}
              title="Cambiar perfil"
            >
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-sm"
                style={{ background: profile.color + '22', border: `2px solid ${profile.color}` }}
              >
                {profile.avatar}
              </div>
              <span className="font-body text-[12px] font-semibold hidden sm:inline" style={{ color: 'var(--bark-500)' }}>
                {profile.name}
              </span>
            </button>
          )}
          </div>
        </div>
      </header>

      {/* Page content */}
      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-6 relative z-10">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="max-w-lg mx-auto w-full px-4 py-5 text-center relative z-10">
        <p className="text-[11px] font-body font-medium tracking-wide uppercase" style={{ color: 'var(--bark-300)', letterSpacing: '0.08em' }}>
          Casa Limpia
        </p>
      </footer>
    </div>
  )
}
