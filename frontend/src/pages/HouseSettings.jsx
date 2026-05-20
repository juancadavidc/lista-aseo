import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { authClient } from '../lib/auth'
import { getActiveHouse, setActiveHouse, clearActiveHouse, AVATARS, COLORS } from '../lib/house'
import { fetchHouseMembers, fetchHouseProfile, updateHouseProfile, fetchVapidKey, subscribePush, unsubscribePush, fetchPushStatus, deleteHouse, fetchInvitations, deleteInvitation, renewInvitation } from '../lib/api'
import { HOME_SCREENS, setStoredHomeScreen, DEFAULT_HOME_SCREEN } from '../lib/homeScreen'

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
  const [pushSupported, setPushSupported] = useState(false)
  const [pushEnabled, setPushEnabled] = useState(false)
  const [pushLoading, setPushLoading] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [deletingHouse, setDeletingHouse] = useState(false)
  const [invitations, setInvitations] = useState([])
  const [confirmingDeleteInvId, setConfirmingDeleteInvId] = useState(null)
  const [actingInvId, setActingInvId] = useState(null)
  const [savingHomeScreen, setSavingHomeScreen] = useState(false)
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
      if (me) {
        setMyRole(me.role)
        if (me.role === 'owner' || me.role === 'admin') {
          loadInvitations()
        }
      }
    } catch {
      showToast('Error al cargar datos', 'error')
    } finally {
      setLoading(false)
    }
  }

  async function loadInvitations() {
    try {
      const data = await fetchInvitations()
      setInvitations(data)
    } catch {
      // Silently ignore - non-admins won't have access
    }
  }

  async function handleRenewInvitation(id) {
    setActingInvId(id)
    try {
      await renewInvitation(id)
      showToast('Invitacion renovada 7 dias mas')
      loadInvitations()
    } catch (err) {
      showToast(err.message || 'Error al renovar invitacion', 'error')
    } finally {
      setActingInvId(null)
    }
  }

  async function handleDeleteInvitation(id) {
    if (confirmingDeleteInvId !== id) {
      setConfirmingDeleteInvId(id)
      setTimeout(() => setConfirmingDeleteInvId(null), 3000)
      return
    }
    setActingInvId(id)
    try {
      await deleteInvitation(id)
      showToast('Invitacion eliminada', 'warning')
      loadInvitations()
    } catch (err) {
      showToast(err.message || 'Error al eliminar invitacion', 'error')
    } finally {
      setActingInvId(null)
      setConfirmingDeleteInvId(null)
    }
  }

  function formatExpiry(expiresAt) {
    if (!expiresAt) return ''
    const exp = new Date(expiresAt)
    const now = new Date()
    const diffMs = exp - now
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    if (diffMs < 0) return 'Expirada'
    if (diffDays === 0) {
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
      if (diffHours <= 0) return 'Expira pronto'
      return `Expira en ${diffHours}h`
    }
    if (diffDays === 1) return 'Expira manana'
    return `Expira en ${diffDays} dias`
  }

  useEffect(() => {
    if (session?.user) loadData()
  }, [session?.user?.id])

  useEffect(() => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      setPushSupported(true)
      fetchPushStatus().then(r => setPushEnabled(r.subscribed)).catch(() => {})
    }
  }, [])

  async function handleTogglePush() {
    setPushLoading(true)
    try {
      if (pushEnabled) {
        const reg = await navigator.serviceWorker.ready
        const sub = await reg.pushManager.getSubscription()
        if (sub) {
          await unsubscribePush(sub.endpoint)
          await sub.unsubscribe()
        }
        setPushEnabled(false)
        showToast('Notificaciones desactivadas')
      } else {
        const permission = await Notification.requestPermission()
        if (permission !== 'granted') {
          showToast('Permiso de notificaciones denegado', 'error')
          setPushLoading(false)
          return
        }
        const { publicKey } = await fetchVapidKey()
        const reg = await navigator.serviceWorker.ready
        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        })
        await subscribePush(sub.toJSON())
        setPushEnabled(true)
        showToast('Notificaciones activadas')
      }
    } catch (err) {
      showToast(err.message || 'Error con notificaciones', 'error')
    } finally {
      setPushLoading(false)
    }
  }

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
        loadInvitations()
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

  async function handleHomeScreenChange(value) {
    const previous = myProfile?.home_screen || DEFAULT_HOME_SCREEN
    if (value === previous) return
    setMyProfile(p => ({ ...(p || {}), home_screen: value }))
    if (house?.id) setStoredHomeScreen(house.id, value)
    setSavingHomeScreen(true)
    try {
      const updated = await updateHouseProfile({ home_screen: value })
      setMyProfile(updated)
      window.dispatchEvent(new CustomEvent('profileUpdated', { detail: updated }))
      showToast('Pantalla de inicio actualizada')
    } catch (err) {
      setMyProfile(p => ({ ...(p || {}), home_screen: previous }))
      if (house?.id) setStoredHomeScreen(house.id, previous)
      showToast(err.message || 'Error al guardar', 'error')
    } finally {
      setSavingHomeScreen(false)
    }
  }

  function handleLeaveHouse() {
    clearActiveHouse()
    navigate('/houses')
  }

  async function handleDeleteHouse() {
    if (!confirmingDelete) {
      setConfirmingDelete(true)
      setTimeout(() => setConfirmingDelete(false), 3000)
      return
    }
    setDeletingHouse(true)
    try {
      await deleteHouse(house.id)
      clearActiveHouse()
      navigate('/houses')
    } catch (err) {
      showToast(err.message || 'Error al eliminar la casa', 'error')
      setConfirmingDelete(false)
    } finally {
      setDeletingHouse(false)
    }
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

      {/* Home screen preference */}
      <div className="mb-6">
        <h3 className="font-display text-lg mb-1" style={{ color: 'var(--bark-700)' }}>
          Pantalla de inicio
        </h3>
        <p className="font-body text-[12px] mb-3" style={{ color: 'var(--bark-300)' }}>
          Elige la pantalla que ves al abrir esta casa.
        </p>
        <div
          className="rounded-xl p-2 flex flex-wrap gap-2"
          style={{ background: 'var(--surface-card)', border: '1px solid rgba(196,184,166,0.25)' }}
        >
          {HOME_SCREENS.map(s => {
            const active = (myProfile?.home_screen || DEFAULT_HOME_SCREEN) === s.value
            return (
              <button
                key={s.value}
                type="button"
                onClick={() => handleHomeScreenChange(s.value)}
                disabled={savingHomeScreen}
                className="px-3.5 py-2 rounded-xl font-body text-[13px] font-medium transition-all active:scale-95 disabled:opacity-60"
                style={{
                  background: active ? 'var(--moss-400)' : 'var(--surface-elevated)',
                  color: active ? 'white' : 'var(--bark-500)',
                  border: active ? 'none' : '1.5px solid rgba(196,184,166,0.3)',
                }}
              >
                {s.label}
              </button>
            )
          })}
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
                className="w-full px-3.5 py-2.5 rounded-xl font-body text-[16px] outline-none transition-all"
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

      {/* Pending invitations */}
      {isOwnerOrAdmin && invitations.length > 0 && (
        <div className="mb-6">
          <h3 className="font-display text-lg mb-3" style={{ color: 'var(--bark-700)' }}>
            Invitaciones pendientes ({invitations.length})
          </h3>
          <div className="flex flex-col gap-2">
            {invitations.map(inv => {
              const expired = inv.expiresAt && new Date(inv.expiresAt) < new Date()
              const acting = actingInvId === inv.id
              const confirmingDelete = confirmingDeleteInvId === inv.id
              return (
                <div
                  key={inv.id}
                  className="flex items-center gap-3 p-3 rounded-xl"
                  style={{ background: 'var(--surface-card)', border: '1px solid rgba(196,184,166,0.25)' }}
                >
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: 'rgba(196,184,166,0.15)', color: 'var(--bark-400)' }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                      <polyline points="22,6 12,13 2,6"/>
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-body font-semibold text-[13px] truncate" style={{ color: 'var(--bark-700)' }}>
                      {inv.email}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span
                        className="px-1.5 py-0.5 rounded text-[10px] font-body font-semibold"
                        style={{ ...roleColor(inv.role) }}
                      >
                        {roleLabel(inv.role)}
                      </span>
                      <span
                        className="font-body text-[11px]"
                        style={{ color: expired ? 'var(--clay-500)' : 'var(--bark-300)' }}
                      >
                        {formatExpiry(inv.expiresAt)}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleRenewInvitation(inv.id)}
                    disabled={acting}
                    title="Renovar 7 dias"
                    className="flex-shrink-0 w-8 h-8 rounded-md flex items-center justify-center transition-all active:scale-90 disabled:opacity-50"
                    style={{ color: 'var(--moss-500)', background: 'rgba(106,153,96,0.08)' }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="23 4 23 10 17 10"/>
                      <polyline points="1 20 1 14 7 14"/>
                      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDeleteInvitation(inv.id)}
                    disabled={acting}
                    title="Eliminar invitacion"
                    className="flex-shrink-0 w-8 h-8 rounded-md flex items-center justify-center transition-all active:scale-90 disabled:opacity-50"
                    style={{
                      color: confirmingDelete ? 'white' : 'var(--clay-500)',
                      background: confirmingDelete ? 'var(--clay-500)' : 'rgba(184,90,58,0.08)',
                    }}
                  >
                    {confirmingDelete ? (
                      <span className="font-body font-bold text-[10px]">?</span>
                    ) : (
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <path d="M18 6L6 18M6 6l12 12"/>
                      </svg>
                    )}
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Notifications */}
      {pushSupported && (
        <div className="mb-6">
          <h3 className="font-display text-lg mb-3" style={{ color: 'var(--bark-700)' }}>
            Notificaciones
          </h3>
          <div
            className="rounded-xl p-4 flex items-center justify-between"
            style={{ background: 'var(--surface-card)', border: '1px solid rgba(196,184,166,0.25)' }}
          >
            <div>
              <p className="font-body font-semibold text-[13px]" style={{ color: 'var(--bark-700)' }}>
                Notificaciones push
              </p>
              <p className="font-body text-[11px]" style={{ color: 'var(--bark-300)' }}>
                Recibe avisos cuando alguien complete una tarea
              </p>
            </div>
            <button
              onClick={handleTogglePush}
              disabled={pushLoading}
              className="w-12 h-7 rounded-full transition-all flex-shrink-0 relative disabled:opacity-50"
              style={{ background: pushEnabled ? 'var(--moss-500)' : 'rgba(196,184,166,0.3)' }}
            >
              <div
                className="w-5 h-5 rounded-full bg-white absolute top-1 transition-all shadow-sm"
                style={{ left: pushEnabled ? 26 : 4 }}
              />
            </button>
          </div>
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

      {/* Zona de peligro - solo owner */}
      {myRole === 'owner' && (
        <div className="mt-8">
          <h3 className="font-display text-lg mb-3" style={{ color: 'var(--clay-500)' }}>
            Zona de peligro
          </h3>
          <div
            className="rounded-xl p-4"
            style={{ background: 'rgba(184,90,58,0.04)', border: '1px solid rgba(184,90,58,0.2)' }}
          >
            <p className="font-body font-semibold text-[13px] mb-1" style={{ color: 'var(--bark-700)' }}>
              Eliminar esta casa
            </p>
            <p className="font-body text-[12px] mb-3" style={{ color: 'var(--bark-300)' }}>
              Se borraran todas las tareas, productos, lista de compras y miembros. Esta accion es permanente.
            </p>
            <button
              onClick={handleDeleteHouse}
              disabled={deletingHouse}
              className="w-full py-2.5 rounded-xl font-body font-semibold text-[13px] transition-all active:scale-[0.98] disabled:opacity-60"
              style={{
                color: confirmingDelete ? 'white' : 'var(--clay-500)',
                background: confirmingDelete ? 'var(--clay-500)' : 'rgba(184,90,58,0.08)',
                border: '1.5px solid rgba(184,90,58,0.3)',
              }}
            >
              {deletingHouse
                ? 'Eliminando...'
                : confirmingDelete
                  ? 'Seguro? Toca de nuevo para confirmar'
                  : 'Eliminar casa'}
            </button>
          </div>
        </div>
      )}

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

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}
