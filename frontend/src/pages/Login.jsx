import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { authClient } from '../lib/auth'

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!email.trim() || !password) return
    setLoading(true)
    setError(null)

    try {
      const result = await authClient.signIn.email({ email: email.trim(), password })
      if (result.error) {
        setError(result.error.message || 'Error al iniciar sesion')
      } else {
        navigate('/houses')
      }
    } catch (err) {
      setError(err.message || 'Error al iniciar sesion')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-4" style={{ background: 'var(--surface-base)' }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: 'linear-gradient(135deg, #6a9960 0%, #4d7a44 100%)' }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M9 22V12h6v10" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h1 className="font-display text-[28px] mb-1" style={{ color: 'var(--bark-700)' }}>
            Casa Limpia
          </h1>
          <p className="font-body text-sm" style={{ color: 'var(--bark-300)' }}>
            Inicia sesion para continuar
          </p>
        </div>

        {error && (
          <div className="rounded-xl p-3 mb-4 font-body text-[13px] text-center" style={{ background: 'rgba(184,90,58,0.08)', color: 'var(--clay-500)', border: '1px solid rgba(184,90,58,0.15)' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="font-body text-[12px] font-semibold uppercase tracking-wider mb-1.5 block" style={{ color: 'var(--bark-400)' }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="tu@email.com"
              required
              className="w-full px-3.5 py-2.5 rounded-xl font-body text-[14px] outline-none transition-all"
              style={{ background: 'var(--surface-elevated)', border: '1.5px solid rgba(196,184,166,0.3)', color: 'var(--bark-700)' }}
              onFocus={e => e.target.style.borderColor = 'var(--moss-400)'}
              onBlur={e => e.target.style.borderColor = 'rgba(196,184,166,0.3)'}
              autoFocus
            />
          </div>

          <div>
            <label className="font-body text-[12px] font-semibold uppercase tracking-wider mb-1.5 block" style={{ color: 'var(--bark-400)' }}>
              Contrasena
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Tu contrasena"
              required
              className="w-full px-3.5 py-2.5 rounded-xl font-body text-[14px] outline-none transition-all"
              style={{ background: 'var(--surface-elevated)', border: '1.5px solid rgba(196,184,166,0.3)', color: 'var(--bark-700)' }}
              onFocus={e => e.target.style.borderColor = 'var(--moss-400)'}
              onBlur={e => e.target.style.borderColor = 'rgba(196,184,166,0.3)'}
            />
          </div>

          <button
            type="submit"
            disabled={loading || !email.trim() || !password}
            className="w-full py-3 rounded-xl font-body font-semibold text-[14px] text-white transition-all active:scale-[0.98] disabled:opacity-50"
            style={{ background: 'var(--moss-500)', boxShadow: '0 2px 8px rgba(77,122,68,0.25)' }}
          >
            {loading ? 'Iniciando sesion...' : 'Iniciar sesion'}
          </button>
        </form>

        <div className="flex items-center gap-3 my-6">
          <div className="flex-1 h-px" style={{ background: 'rgba(196,184,166,0.3)' }} />
          <span className="font-body text-[12px]" style={{ color: 'var(--bark-300)' }}>o</span>
          <div className="flex-1 h-px" style={{ background: 'rgba(196,184,166,0.3)' }} />
        </div>

        <button
          type="button"
          onClick={async () => {
            setLoading(true)
            setError(null)
            try {
              await authClient.signIn.social({ provider: 'google', callbackURL: '/houses' })
            } catch (err) {
              setError(err.message || 'Error con Google')
              setLoading(false)
            }
          }}
          disabled={loading}
          className="w-full py-3 rounded-xl font-body font-semibold text-[14px] transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
          style={{ background: 'var(--surface-elevated)', border: '1.5px solid rgba(196,184,166,0.3)', color: 'var(--bark-700)' }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Continuar con Google
        </button>

        <p className="text-center mt-6 font-body text-[13px]" style={{ color: 'var(--bark-300)' }}>
          No tienes cuenta?{' '}
          <Link to="/register" className="font-semibold" style={{ color: 'var(--moss-500)' }}>
            Crear cuenta
          </Link>
        </p>
      </div>
    </div>
  )
}
