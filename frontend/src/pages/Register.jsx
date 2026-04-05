import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { authClient } from '../lib/auth'

export default function Register() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (password !== confirmPassword) {
      setError('Las contrasenas no coinciden')
      return
    }
    if (password.length < 8) {
      setError('La contrasena debe tener al menos 8 caracteres')
      return
    }
    setLoading(true)
    setError(null)

    try {
      const result = await authClient.signUp.email({
        name: name.trim(),
        email: email.trim(),
        password,
      })
      if (result.error) {
        setError(result.error.message || 'Error al crear cuenta')
      } else {
        navigate('/houses')
      }
    } catch (err) {
      setError(err.message || 'Error al crear cuenta')
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
            Crear cuenta
          </h1>
          <p className="font-body text-sm" style={{ color: 'var(--bark-300)' }}>
            Registrate para gestionar tu hogar
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
              Nombre
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Tu nombre"
              required
              maxLength={50}
              className="w-full px-3.5 py-2.5 rounded-xl font-body text-[14px] outline-none transition-all"
              style={{ background: 'var(--surface-elevated)', border: '1.5px solid rgba(196,184,166,0.3)', color: 'var(--bark-700)' }}
              onFocus={e => e.target.style.borderColor = 'var(--moss-400)'}
              onBlur={e => e.target.style.borderColor = 'rgba(196,184,166,0.3)'}
              autoFocus
            />
          </div>

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
              placeholder="Minimo 8 caracteres"
              required
              minLength={8}
              className="w-full px-3.5 py-2.5 rounded-xl font-body text-[14px] outline-none transition-all"
              style={{ background: 'var(--surface-elevated)', border: '1.5px solid rgba(196,184,166,0.3)', color: 'var(--bark-700)' }}
              onFocus={e => e.target.style.borderColor = 'var(--moss-400)'}
              onBlur={e => e.target.style.borderColor = 'rgba(196,184,166,0.3)'}
            />
          </div>

          <div>
            <label className="font-body text-[12px] font-semibold uppercase tracking-wider mb-1.5 block" style={{ color: 'var(--bark-400)' }}>
              Confirmar contrasena
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="Repite tu contrasena"
              required
              minLength={8}
              className="w-full px-3.5 py-2.5 rounded-xl font-body text-[14px] outline-none transition-all"
              style={{ background: 'var(--surface-elevated)', border: '1.5px solid rgba(196,184,166,0.3)', color: 'var(--bark-700)' }}
              onFocus={e => e.target.style.borderColor = 'var(--moss-400)'}
              onBlur={e => e.target.style.borderColor = 'rgba(196,184,166,0.3)'}
            />
          </div>

          <button
            type="submit"
            disabled={loading || !name.trim() || !email.trim() || !password || !confirmPassword}
            className="w-full py-3 rounded-xl font-body font-semibold text-[14px] text-white transition-all active:scale-[0.98] disabled:opacity-50"
            style={{ background: 'var(--moss-500)', boxShadow: '0 2px 8px rgba(77,122,68,0.25)' }}
          >
            {loading ? 'Creando cuenta...' : 'Crear cuenta'}
          </button>
        </form>

        <p className="text-center mt-6 font-body text-[13px]" style={{ color: 'var(--bark-300)' }}>
          Ya tienes cuenta?{' '}
          <Link to="/login" className="font-semibold" style={{ color: 'var(--moss-500)' }}>
            Iniciar sesion
          </Link>
        </p>
      </div>
    </div>
  )
}
