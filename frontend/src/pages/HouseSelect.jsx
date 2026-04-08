import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { authClient } from '../lib/auth'
import { setActiveHouse } from '../lib/house'
import { seedHouse } from '../lib/api'

export default function HouseSelect() {
  const navigate = useNavigate()
  const [houses, setHouses] = useState([])
  const [invitations, setInvitations] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [error, setError] = useState(null)

  async function loadData() {
    try {
      setError(null)
      const orgs = await authClient.organization.list()
      setHouses(orgs.data || [])

      try {
        const res = await fetch('/api/auth/organization/list-user-invitations', { credentials: 'include' })
        if (res.ok) {
          const invs = await res.json()
          setInvitations((invs || []).filter(i => i.status === 'pending'))
        } else {
          setInvitations([])
        }
      } catch {
        setInvitations([])
      }
    } catch (err) {
      setError('Error al cargar las casas')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [])

  function handleSelect(house) {
    setActiveHouse({ id: house.id, name: house.name, slug: house.slug })
    navigate('/')
  }

  async function handleCreate(name, template) {
    try {
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'casa'
      const result = await authClient.organization.create({ name, slug: slug + '-' + Date.now() })
      if (result.error) {
        setError(result.error.message || 'Error al crear la casa')
        return
      }
      const newHouse = result.data
      setActiveHouse({ id: newHouse.id, name: newHouse.name, slug: newHouse.slug })

      // Seed with selected template
      try {
        await seedHouse(template)
      } catch {
        // Seed is optional, don't block on error
      }

      setShowCreate(false)
      navigate('/')
    } catch (err) {
      setError(err.message || 'Error al crear la casa')
    }
  }

  async function handleAcceptInvitation(invitationId) {
    try {
      await authClient.organization.acceptInvitation({ invitationId })
      loadData()
    } catch {
      setError('Error al aceptar la invitacion')
    }
  }

  async function handleRejectInvitation(invitationId) {
    try {
      await authClient.organization.rejectInvitation({ invitationId })
      setInvitations(prev => prev.filter(i => i.id !== invitationId))
    } catch {
      setError('Error al rechazar la invitacion')
    }
  }

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center" style={{ background: 'var(--surface-base)' }}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-full border-[3px] border-t-transparent animate-spin" style={{ borderColor: 'var(--moss-200)', borderTopColor: 'transparent' }} />
          <p className="font-body text-sm" style={{ color: 'var(--bark-300)' }}>Cargando...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-4" style={{ background: 'var(--surface-base)' }}>
      <div className="w-full max-w-md">
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
            Tus casas
          </h1>
          <p className="font-body text-sm" style={{ color: 'var(--bark-300)' }}>
            Selecciona una casa o crea una nueva
          </p>
        </div>

        {error && (
          <div className="rounded-xl p-3 mb-4 font-body text-[13px] text-center" style={{ background: 'rgba(184,90,58,0.08)', color: 'var(--clay-500)', border: '1px solid rgba(184,90,58,0.15)' }}>
            {error}
          </div>
        )}

        {/* Pending invitations */}
        {invitations.length > 0 && (
          <div className="mb-6">
            <p className="font-body text-[12px] font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--bark-300)' }}>
              Invitaciones pendientes
            </p>
            <div className="flex flex-col gap-2">
              {invitations.map(inv => (
                <div
                  key={inv.id}
                  className="flex items-center justify-between p-3.5 rounded-xl"
                  style={{ background: 'rgba(106,153,96,0.06)', border: '1px solid rgba(106,153,96,0.15)' }}
                >
                  <div>
                    <p className="font-body font-semibold text-[14px]" style={{ color: 'var(--bark-700)' }}>
                      {inv.organization?.name || 'Casa'}
                    </p>
                    <p className="font-body text-[12px]" style={{ color: 'var(--bark-300)' }}>
                      Rol: {inv.role === 'owner' ? 'Dueño' : inv.role === 'admin' ? 'Admin' : 'Miembro'}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleRejectInvitation(inv.id)}
                      className="px-3 py-1.5 rounded-lg font-body font-semibold text-[12px] transition-all active:scale-95"
                      style={{ color: 'var(--bark-400)' }}
                    >
                      Rechazar
                    </button>
                    <button
                      onClick={() => handleAcceptInvitation(inv.id)}
                      className="px-3 py-1.5 rounded-lg font-body font-semibold text-[12px] text-white transition-all active:scale-95"
                      style={{ background: 'var(--moss-500)' }}
                    >
                      Aceptar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* House grid */}
        <div className="grid grid-cols-2 gap-3 mb-8">
          {houses.map(house => (
            <button
              key={house.id}
              onClick={() => handleSelect(house)}
              className="flex flex-col items-center gap-3 p-5 rounded-2xl transition-all active:scale-95 hover:shadow-md group"
              style={{ background: 'var(--surface-card)', border: '1px solid rgba(196,184,166,0.25)' }}
            >
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl transition-transform group-hover:scale-110"
                style={{ background: 'linear-gradient(135deg, rgba(106,153,96,0.15) 0%, rgba(77,122,68,0.1) 100%)' }}
              >
                🏠
              </div>
              <span className="font-body font-semibold text-[14px] truncate w-full text-center" style={{ color: 'var(--bark-700)' }}>
                {house.name}
              </span>
            </button>
          ))}

          {/* Create new house button */}
          <button
            onClick={() => setShowCreate(true)}
            className="flex flex-col items-center justify-center gap-3 p-5 rounded-2xl transition-all active:scale-95 hover:shadow-md"
            style={{ background: 'rgba(196,184,166,0.08)', border: '2px dashed rgba(196,184,166,0.3)' }}
          >
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(196,184,166,0.12)' }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--bark-300)" strokeWidth="2" strokeLinecap="round">
                <path d="M12 5v14M5 12h14"/>
              </svg>
            </div>
            <span className="font-body font-medium text-[14px]" style={{ color: 'var(--bark-300)' }}>
              Nueva casa
            </span>
          </button>
        </div>

        {/* Logout */}
        <div className="text-center">
          <button
            onClick={async () => {
              await authClient.signOut()
              navigate('/login')
            }}
            className="font-body text-[13px] font-medium transition-all"
            style={{ color: 'var(--bark-300)' }}
          >
            Cerrar sesion
          </button>
        </div>
      </div>

      {/* Create house modal */}
      {showCreate && (
        <CreateHouseModal
          onSave={handleCreate}
          onClose={() => setShowCreate(false)}
        />
      )}
    </div>
  )
}

const TEMPLATES = [
  {
    key: 'small',
    emoji: '🏢',
    title: 'Apartamento',
    description: '8 tareas basicas + 9 productos esenciales',
  },
  {
    key: 'family',
    emoji: '🏡',
    title: 'Casa familiar',
    description: '16 tareas completas + 14 productos',
  },
  {
    key: 'empty',
    emoji: '📝',
    title: 'Personalizado',
    description: 'Empezar desde cero, tu configuras todo',
  },
]

function CreateHouseModal({ onSave, onClose }) {
  const [name, setName] = useState('')
  const [template, setTemplate] = useState('small')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    await onSave(name.trim(), template)
    setLoading(false)
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4 modal-backdrop" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-t-2xl sm:rounded-2xl p-5 fade-in max-h-[90dvh] overflow-y-auto"
        style={{ background: 'var(--surface-card)', border: '1px solid rgba(196,184,166,0.25)' }}
        onClick={e => e.stopPropagation()}
      >
        <h3 className="font-display text-xl mb-5" style={{ color: 'var(--bark-700)' }}>
          Nueva casa
        </h3>

        <form onSubmit={handleSubmit}>
          <div className="mb-5">
            <label className="font-body text-[12px] font-semibold uppercase tracking-wider mb-1.5 block" style={{ color: 'var(--bark-400)' }}>
              Nombre de la casa
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Ej: Mi Hogar, Casa de la playa..."
              maxLength={50}
              required
              className="w-full px-3.5 py-2.5 rounded-xl font-body text-[14px] outline-none transition-all"
              style={{ background: 'var(--surface-elevated)', border: '1.5px solid rgba(196,184,166,0.3)', color: 'var(--bark-700)' }}
              onFocus={e => e.target.style.borderColor = 'var(--moss-400)'}
              onBlur={e => e.target.style.borderColor = 'rgba(196,184,166,0.3)'}
              autoFocus
            />
          </div>

          <div className="mb-6">
            <label className="font-body text-[12px] font-semibold uppercase tracking-wider mb-2 block" style={{ color: 'var(--bark-400)' }}>
              Plantilla inicial
            </label>
            <div className="flex flex-col gap-2">
              {TEMPLATES.map(t => (
                <button
                  type="button"
                  key={t.key}
                  onClick={() => setTemplate(t.key)}
                  className="flex items-center gap-3 p-3 rounded-xl text-left transition-all active:scale-[0.98]"
                  style={template === t.key
                    ? { background: 'rgba(106,153,96,0.08)', border: '1.5px solid var(--moss-400)' }
                    : { background: 'var(--surface-elevated)', border: '1.5px solid rgba(196,184,166,0.2)' }
                  }
                >
                  <span className="text-xl flex-shrink-0">{t.emoji}</span>
                  <div className="min-w-0">
                    <p className="font-body text-[13px] font-semibold" style={{ color: 'var(--bark-700)' }}>
                      {t.title}
                    </p>
                    <p className="font-body text-[11px]" style={{ color: 'var(--bark-300)' }}>
                      {t.description}
                    </p>
                  </div>
                  {template === t.key && (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="flex-shrink-0 ml-auto">
                      <circle cx="12" cy="12" r="10" fill="var(--moss-400)"/>
                      <path d="M8 12l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl font-body font-semibold text-[13px] transition-all"
              style={{ color: 'var(--bark-400)', border: '1.5px solid rgba(196,184,166,0.3)' }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!name.trim() || loading}
              className="flex-1 px-4 py-2.5 rounded-xl font-body font-semibold text-[13px] text-white transition-all active:scale-[0.98] disabled:opacity-50"
              style={{ background: 'var(--moss-500)', boxShadow: '0 2px 8px rgba(77,122,68,0.25)' }}
            >
              {loading ? 'Creando...' : 'Crear casa'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  )
}
