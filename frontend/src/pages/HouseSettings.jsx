import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { authClient } from '../lib/auth'
import { getActiveHouse, setActiveHouse, clearActiveHouse, AVATARS, COLORS } from '../lib/house'
import { fetchHouseMembers, fetchHouseProfile, updateHouseProfile } from '../lib/api'

export default function HouseSettings() {
  const navigate = useNavigate()
  const house = getActiveHouse()
  const [members, setMembers] = useState([])
  const [myProfile, setMyProfile] = useState(null)
  const [myRole, setMyRole] = useState('member')
  const [loading, setLoading] = useState(true)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('member')
  const [inviting, setInviting] = useState(false)
  const [toast, setToast] = useState(null)
  const [showProfileEdit, setShowProfileEdit] = useState(false)
  const [removingId, setRemovingId] = useState(null)
  const [editingName, setEditingName] = useState(false)
  const [houseName, setHouseName] = useState(house?.name || '')
  const [savingName, setSavingName] = useState(false)
  const { data: session } = authClient.useSession()

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  async function loadData() {
    try {
      const [membersData, profileData] = await Promise.all([
        fetchHouseMembers(),
        fetchHouseProfile(),
      ])
      setMembers(membersData)
      setMyProfile(profileData)
      const me = membersData.find(m => m.userId === session?.user?.id)
      if (me) setMyRole(me.role)
    } catch {
      showToast('Error al cargar datos', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (session?.user) loadData()
  }, [session?.user?.id])

  const isOwnerOrAdmin = myRole === 'owner' || myRole === 'admin'

  async function handleInvite(e) {
    e.preventDefault()
    if (!inviteEmail.trim()) return
    setInviting(true)
    try {
      const result = await authClient.organization.inviteMember({
        email: inviteEmail.trim(),
        role: inviteRole,
        organizationId: house.id,
      })
      if (result.error) {
        showToast(result.error.message || 'Error al invitar', 'error')
      } else {
        showToast('Invitacion enviada')
        setInviteEmail('')
      }
    } catch (err) {
      showToast(err.message || 'Error al invitar', 'error')
    } finally {
      setInviting(false)
    }
  }

  async function handleRemoveMember(userId) {
    if (removingId === userId) {
      try {
        await authClient.organization.removeMember({
          memberIdOrEmail: userId,
          organizationId: house.id,
        })
        showToast('Miembro eliminado', 'warning')
        loadData()
      } catch {
        showToast('Error al eliminar miembro', 'error')
      } finally {
        setRemovingId(null)
      }
    } else {
      setRemovingId(userId)
      setTimeout(() => setRemovingId(null), 3000)
    }
  }

  async function handleProfileSave(avatar, color) {
    try {
      const updated = await updateHouseProfile({ avatar, color })
      setMyProfile(updated)
      setShowProfileEdit(false)
      window.dispatchEvent(new CustomEvent('profileUpdated', { detail: updated }))
      showToast('Perfil actualizado')
    } catch {
      showToast('Error al guardar perfil', 'error')
    }
  }

  function handleLeaveHouse() {
    clearActiveHouse()
    navigate('/houses')
  }

  async function handleRenameSave() {
    const trimmed = houseName.trim()
    if (!trimmed || trimmed === house?.name) {
      setEditingName(false)
      setHouseName(house?.name || '')
      return
    }
    setSavingName(true)
    try {
      const result = await authClient.organization.update({
        data: { name: trimmed },
        organizationId: house.id,
      })
      if (result.error) {
        showToast(result.error.message || 'Error al renombrar', 'error')
      } else {
        setActiveHouse({ ...house, name: trimmed })
        showToast('Nombre actualizado')
      }
    } catch (err) {
      showToast(err.message || 'Error al renombrar', 'error')
    } finally {
      setSavingName(false)
      setEditingName(false)
    }
  }

  const roleLabel = (role) => {
    if (role === 'owner') return 'Dueño'
    if (role === 'admin') return 'Admin'
    return 'Miembro'
  }

  const roleColor = (role) => {
    if (role === 'owner') return { bg: 'rgba(184,90,58,0.1)', color: 'var(--clay-500)' }
    if (role === 'admin') return { bg: 'rgba(91,130,184,0.1)', color: '#5b82b8' }
    return { bg: 'rgba(106,153,96,0.1)', color: 'var(--moss-500)' }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 fade-in">
        <div className="w-10 h-10 rounded-full border-[3px] border-t-transparent animate-spin" style={{ borderColor: 'var(--moss-200)', borderTopColor: 'transparent' }} />
        <p className="font-body text-sm font-medium" style={{ color: 'var(--bark-300)' }}>Cargando...</p>
      </div>
    )
  }

  return (
    <div className="fade-in">
      {/* Toast */}
      {toast && (
        <div
          className="fixed top-20 left-1/2 z-50 px-4 py-2.5 rounded-xl font-body font-semibold text-[13px] toast-enter"
          style={{
            background: toast.type === 'success' ? 'var(--moss-500)' : toast.type === 'warning' ? 'var(--clay-500)' : '#9e4a2e',
            color: 'white', minWidth: 180, textAlign: 'center',
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)', transform: 'translateX(-50%)',
          }}
        >
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="mb-6">
        <p className="font-body text-[11px] font-semibold uppercase tracking-[0.1em] mb-1.5" style={{ color: 'var(--bark-300)' }}>
          Configuracion
        </p>
        {editingName ? (
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={houseName}
              onChange={e => setHouseName(e.target.value)}
              maxLength={50}
              autoFocus
              className="font-display text-[28px] leading-none outline-none px-2 py-1 rounded-xl flex-1 min-w-0"
              style={{ color: 'var(--bark-700)', background: 'var(--surface-elevated)', border: '1.5px solid var(--moss-400)' }}
              onKeyDown={e => {
                if (e.key === 'Enter') handleRenameSave()
                if (e.key === 'Escape') { setEditingName(false); setHouseName(house?.name || '') }
              }}
            />
            <button
              onClick={handleRenameSave}
              disabled={savingName}
              className="px-3 py-1.5 rounded-lg font-body font-semibold text-[12px] text-white transition-all active:scale-95 disabled:opacity-50"
              style={{ background: 'var(--moss-500)' }}
            >
              {savingName ? '...' : 'Guardar'}
            </button>
            <button
              onClick={() => { setEditingName(false); setHouseName(house?.name || '') }}
              className="px-3 py-1.5 rounded-lg font-body font-semibold text-[12px] transition-all active:scale-95"
              style={{ color: 'var(--bark-400)' }}
            >
              Cancelar
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <h2 className="font-display text-[28px] leading-none" style={{ color: 'var(--bark-700)' }}>
              {houseName || 'Casa'}
            </h2>
            {isOwnerOrAdmin && (
              <button
                onClick={() => setEditingName(true)}
                className="p-1.5 rounded-lg transition-all active:scale-90"
                style={{ color: 'var(--bark-300)' }}
                title="Renombrar casa"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
              </button>
            )}
          </div>
        )}
      </div>

      {/* My profile section */}
      <div className="rounded-xl p-4 mb-6" style={{ background: 'var(--surface-card)', border: '1px solid rgba(196,184,166,0.25)' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center text-xl"
              style={{ background: (myProfile?.color || '#6a9960') + '22', border: `3px solid ${myProfile?.color || '#6a9960'}` }}
            >
              {myProfile?.avatar || '🧑'}
            </div>
            <div>
              <p className="font-body font-semibold text-[14px]" style={{ color: 'var(--bark-700)' }}>
                {session?.user?.name || 'Tu'}
              </p>
              <span
                className="inline-block px-2 py-0.5 rounded-full text-[10px] font-body font-semibold"
                style={{ ...roleColor(myRole) }}
              >
                {roleLabel(myRole)}
              </span>
            </div>
          </div>
          <button
            onClick={() => setShowProfileEdit(true)}
            className="px-3 py-1.5 rounded-lg font-body font-semibold text-[12px] transition-all active:scale-95"
            style={{ color: 'var(--moss-500)', background: 'rgba(106,153,96,0.08)' }}
          >
            Editar perfil
          </button>
        </div>
      </div>

      {/* Members */}
      <div className="mb-6">
        <h3 className="font-display text-lg mb-3" style={{ color: 'var(--bark-700)' }}>
          Miembros ({members.length})
        </h3>
        <div className="flex flex-col gap-2">
          {members.map(m => (
            <div
              key={m.userId}
              className="flex items-center gap-3 p-3 rounded-xl"
              style={{ background: 'var(--surface-card)', border: '1px solid rgba(196,184,166,0.25)' }}
            >
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-base"
                style={{ background: m.color + '22', border: `2px solid ${m.color}` }}
              >
                {m.avatar}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-body font-semibold text-[13px] truncate" style={{ color: 'var(--bark-700)' }}>
                  {m.name}
                  {m.userId === session?.user?.id && (
                    <span className="font-normal text-[11px] ml-1" style={{ color: 'var(--bark-300)' }}>(tu)</span>
                  )}
                </p>
                <p className="font-body text-[11px]" style={{ color: 'var(--bark-300)' }}>{m.email}</p>
              </div>
              <span
                className="px-2 py-0.5 rounded-full text-[10px] font-body font-semibold flex-shrink-0"
                style={{ ...roleColor(m.role) }}
              >
                {roleLabel(m.role)}
              </span>
              {isOwnerOrAdmin && m.userId !== session?.user?.id && m.role !== 'owner' && (
                <button
                  onClick={() => handleRemoveMember(m.userId)}
                  className="flex-shrink-0 w-7 h-7 rounded-md flex items-center justify-center transition-all"
                  style={{
                    color: removingId === m.userId ? 'var(--clay-500)' : 'var(--bark-300)',
                    background: removingId === m.userId ? 'rgba(184,90,58,0.08)' : 'transparent',
                  }}
                >
                  {removingId === m.userId ? (
                    <span className="font-body font-bold text-[9px]">?</span>
                  ) : (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <path d="M18 6L6 18M6 6l12 12"/>
                    </svg>
                  )}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Invite section */}
      {isOwnerOrAdmin && (
        <div className="mb-6">
          <h3 className="font-display text-lg mb-3" style={{ color: 'var(--bark-700)' }}>
            Invitar miembro
          </h3>
          <form onSubmit={handleInvite} className="rounded-xl p-4" style={{ background: 'var(--surface-card)', border: '1px solid rgba(196,184,166,0.25)' }}>
            <div className="mb-3">
              <label className="font-body text-[12px] font-semibold uppercase tracking-wider mb-1.5 block" style={{ color: 'var(--bark-400)' }}>
                Email
              </label>
              <input
                type="email"
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                placeholder="email@ejemplo.com"
                required
                className="w-full px-3.5 py-2.5 rounded-xl font-body text-[14px] outline-none transition-all"
                style={{ background: 'var(--surface-elevated)', border: '1.5px solid rgba(196,184,166,0.3)', color: 'var(--bark-700)' }}
                onFocus={e => e.target.style.borderColor = 'var(--moss-400)'}
                onBlur={e => e.target.style.borderColor = 'rgba(196,184,166,0.3)'}
              />
            </div>
            <div className="mb-4">
              <label className="font-body text-[12px] font-semibold uppercase tracking-wider mb-1.5 block" style={{ color: 'var(--bark-400)' }}>
                Rol
              </label>
              <div className="flex gap-2">
                {[
                  { value: 'member', label: 'Miembro' },
                  { value: 'admin', label: 'Admin' },
                ].map(r => (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => setInviteRole(r.value)}
                    className="px-3 py-2 rounded-xl font-body text-[13px] font-medium transition-all"
                    style={{
                      background: inviteRole === r.value ? 'var(--moss-400)' : 'var(--surface-elevated)',
                      color: inviteRole === r.value ? 'white' : 'var(--bark-400)',
                      border: inviteRole === r.value ? 'none' : '1.5px solid rgba(196,184,166,0.3)',
                    }}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>
            <button
              type="submit"
              disabled={inviting || !inviteEmail.trim()}
              className="w-full py-2.5 rounded-xl font-body font-semibold text-[13px] text-white transition-all active:scale-[0.98] disabled:opacity-50"
              style={{ background: 'var(--moss-500)' }}
            >
              {inviting ? 'Invitando...' : 'Enviar invitacion'}
            </button>
          </form>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col gap-2">
        <button
          onClick={handleLeaveHouse}
          className="w-full py-2.5 rounded-xl font-body font-semibold text-[13px] transition-all active:scale-[0.98]"
          style={{ color: 'var(--bark-400)', border: '1.5px solid rgba(196,184,166,0.3)' }}
        >
          Cambiar de casa
        </button>
      </div>

      {/* Profile edit modal */}
      {showProfileEdit && (
        <ProfileEditModal
          avatar={myProfile?.avatar || '🧑'}
          color={myProfile?.color || '#6a9960'}
          onSave={handleProfileSave}
          onClose={() => setShowProfileEdit(false)}
        />
      )}
    </div>
  )
}

function ProfileEditModal({ avatar: initialAvatar, color: initialColor, onSave, onClose }) {
  const [avatar, setAvatar] = useState(initialAvatar)
  const [color, setColor] = useState(initialColor)

  function handleSubmit(e) {
    e.preventDefault()
    onSave(avatar, color)
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4 modal-backdrop" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-t-2xl sm:rounded-2xl p-5 fade-in"
        style={{ background: 'var(--surface-card)', border: '1px solid rgba(196,184,166,0.25)' }}
        onClick={e => e.stopPropagation()}
      >
        <h3 className="font-display text-xl mb-5" style={{ color: 'var(--bark-700)' }}>
          Tu perfil en esta casa
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
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl font-body font-semibold text-[13px] transition-all active:scale-95"
              style={{ color: 'var(--bark-400)', border: '1.5px solid rgba(196,184,166,0.3)' }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 px-5 py-2.5 rounded-xl font-body font-semibold text-[13px] text-white transition-all active:scale-95"
              style={{ background: 'var(--moss-500)' }}
            >
              Guardar
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  )
}
