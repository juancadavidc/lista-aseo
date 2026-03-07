import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getProfiles, saveProfile, removeProfile, setActiveProfile, AVATARS, COLORS } from '../lib/profiles'

export default function ProfileSelect() {
  const navigate = useNavigate()
  const [profiles, setProfiles] = useState([])
  const [showCreate, setShowCreate] = useState(false)
  const [editingProfile, setEditingProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getProfiles().then(data => {
      setProfiles(data)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  function handleSelect(profile) {
    setActiveProfile(profile)
    navigate('/')
  }

  async function handleSave(data) {
    try {
      if (editingProfile) {
        const updated = await saveProfile({ id: editingProfile.id, ...data })
        setProfiles(prev => prev.map(p => p.id === editingProfile.id ? updated : p))
      } else {
        const created = await saveProfile(data)
        setProfiles(prev => [...prev, created])
      }
      setShowCreate(false)
      setEditingProfile(null)
    } catch (err) {
      console.error('Error saving profile:', err)
    }
  }

  async function handleDelete(id) {
    try {
      await removeProfile(id)
      setProfiles(prev => prev.filter(p => p.id !== id))
      setEditingProfile(null)
      setShowCreate(false)
    } catch (err) {
      console.error('Error deleting profile:', err)
    }
  }

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center" style={{ background: 'var(--surface-base)' }}>
        <div className="font-body text-sm" style={{ color: 'var(--bark-300)' }}>Cargando...</div>
      </div>
    )
  }

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-4 bg-grain" style={{ background: 'var(--surface-base)' }}>
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
            Quien eres?
          </h1>
          <p className="font-body text-sm" style={{ color: 'var(--bark-300)' }}>
            Selecciona tu perfil para continuar
          </p>
        </div>

        {/* Profile grid */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {profiles.map(profile => (
            <button
              key={profile.id}
              onClick={() => handleSelect(profile)}
              className="flex flex-col items-center gap-2 p-4 rounded-2xl transition-all active:scale-95 hover:shadow-md group"
              style={{ background: 'var(--surface-card)', border: '1px solid rgba(196,184,166,0.25)' }}
            >
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center text-2xl transition-transform group-hover:scale-110"
                style={{ background: profile.color + '22', border: `3px solid ${profile.color}` }}
              >
                {profile.avatar}
              </div>
              <span className="font-body font-semibold text-[13px] truncate w-full text-center" style={{ color: 'var(--bark-700)' }}>
                {profile.name}
              </span>
            </button>
          ))}

          {/* Add new profile button */}
          <button
            onClick={() => { setEditingProfile(null); setShowCreate(true) }}
            className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl transition-all active:scale-95 hover:shadow-md"
            style={{ background: 'rgba(196,184,166,0.08)', border: '2px dashed rgba(196,184,166,0.3)' }}
          >
            <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: 'rgba(196,184,166,0.12)' }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--bark-300)" strokeWidth="2" strokeLinecap="round">
                <path d="M12 5v14M5 12h14"/>
              </svg>
            </div>
            <span className="font-body font-medium text-[13px]" style={{ color: 'var(--bark-300)' }}>
              Nuevo
            </span>
          </button>
        </div>
      </div>

      {/* Create/Edit modal */}
      {(showCreate || editingProfile) && (
        <ProfileFormModal
          profile={editingProfile}
          onSave={handleSave}
          onDelete={editingProfile ? () => handleDelete(editingProfile.id) : null}
          onClose={() => { setShowCreate(false); setEditingProfile(null) }}
        />
      )}
    </div>
  )
}

function ProfileFormModal({ profile, onSave, onDelete, onClose }) {
  const [name, setName] = useState(profile?.name || '')
  const [avatar, setAvatar] = useState(profile?.avatar || AVATARS[0])
  const [color, setColor] = useState(profile?.color || COLORS[0])
  const [confirmDelete, setConfirmDelete] = useState(false)

  function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim()) return
    onSave({ name: name.trim(), avatar, color })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4 modal-backdrop" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-t-2xl sm:rounded-2xl p-5 fade-in"
        style={{ background: 'var(--surface-card)', border: '1px solid rgba(196,184,166,0.25)' }}
        onClick={e => e.stopPropagation()}
      >
        <h3 className="font-display text-xl mb-5" style={{ color: 'var(--bark-700)' }}>
          {profile ? 'Editar perfil' : 'Nuevo perfil'}
        </h3>

        <form onSubmit={handleSubmit}>
          {/* Preview */}
          <div className="flex justify-center mb-5">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center text-3xl"
              style={{ background: color + '22', border: `3px solid ${color}` }}
            >
              {avatar}
            </div>
          </div>

          {/* Name */}
          <div className="mb-4">
            <label className="font-body text-[12px] font-semibold uppercase tracking-wider mb-1.5 block" style={{ color: 'var(--bark-400)' }}>
              Nombre
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Tu nombre"
              maxLength={20}
              className="w-full px-3.5 py-2.5 rounded-xl font-body text-[14px] outline-none transition-all"
              style={{ background: 'var(--surface-elevated)', border: '1px solid rgba(196,184,166,0.3)', color: 'var(--bark-700)' }}
              autoFocus
            />
          </div>

          {/* Avatar selector */}
          <div className="mb-4">
            <label className="font-body text-[12px] font-semibold uppercase tracking-wider mb-1.5 block" style={{ color: 'var(--bark-400)' }}>
              Avatar
            </label>
            <div className="flex flex-wrap gap-2">
              {AVATARS.map(a => (
                <button
                  key={a}
                  type="button"
                  onClick={() => setAvatar(a)}
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-lg transition-all"
                  style={{
                    background: avatar === a ? color + '22' : 'var(--surface-elevated)',
                    border: avatar === a ? `2px solid ${color}` : '1px solid rgba(196,184,166,0.2)',
                    transform: avatar === a ? 'scale(1.1)' : 'scale(1)',
                  }}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>

          {/* Color selector */}
          <div className="mb-6">
            <label className="font-body text-[12px] font-semibold uppercase tracking-wider mb-1.5 block" style={{ color: 'var(--bark-400)' }}>
              Color
            </label>
            <div className="flex flex-wrap gap-2.5">
              {COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className="w-9 h-9 rounded-full transition-all flex items-center justify-center"
                  style={{
                    background: c,
                    transform: color === c ? 'scale(1.2)' : 'scale(1)',
                    boxShadow: color === c ? `0 0 0 3px var(--surface-card), 0 0 0 5px ${c}` : 'none',
                  }}
                >
                  {color === c && (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round">
                      <path d="M5 13l4 4L19 7"/>
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            {onDelete && (
              <button
                type="button"
                onClick={() => {
                  if (confirmDelete) onDelete()
                  else { setConfirmDelete(true); setTimeout(() => setConfirmDelete(false), 3000) }
                }}
                className="px-4 py-2.5 rounded-xl font-body font-semibold text-[13px] transition-all active:scale-95"
                style={{ color: 'var(--clay-500)', background: confirmDelete ? 'rgba(184,90,58,0.1)' : 'transparent' }}
              >
                {confirmDelete ? 'Seguro?' : 'Eliminar'}
              </button>
            )}
            <div className="flex-1" />
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl font-body font-semibold text-[13px] transition-all active:scale-95"
              style={{ color: 'var(--bark-400)' }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className="px-5 py-2.5 rounded-xl font-body font-semibold text-[13px] text-white transition-all active:scale-95 disabled:opacity-40"
              style={{ background: 'var(--moss-500)' }}
            >
              {profile ? 'Guardar' : 'Crear'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
