import { useState, useEffect, useCallback } from 'react'
import {
  fetchAllTasks, createTask, updateTask, deleteTask, resetTask,
  frequencyLabel, FREQUENCY_LABELS,
} from '../lib/tasks'
import { getProfiles, saveProfiles, getActiveProfile, clearActiveProfile, AVATARS, COLORS } from '../lib/profiles'
import TaskForm from '../components/TaskForm'
import HistoryModal from '../components/HistoryModal'

const FREQ_ICONS = {
  daily: (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
      <circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
    </svg>
  ),
  weekly: (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
      <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>
    </svg>
  ),
  biweekly: (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
      <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/><path d="M8 14h8" strokeWidth="2"/>
    </svg>
  ),
  monthly: (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 1118 0z"/><circle cx="12" cy="10" r="3"/>
    </svg>
  ),
}

export default function Admin() {
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [editingTask, setEditingTask] = useState(null)
  const [deletingId, setDeletingId] = useState(null)
  const [resettingId, setResettingId] = useState(null)
  const [historyTask, setHistoryTask] = useState(null)
  const [toast, setToast] = useState(null)
  const [profiles, setProfilesList] = useState(getProfiles)
  const [editingProfileId, setEditingProfileId] = useState(null)
  const [deletingProfileId, setDeletingProfileId] = useState(null)

  function handleDeleteProfile(id) {
    if (deletingProfileId === id) {
      const updated = profiles.filter(p => p.id !== id)
      saveProfiles(updated)
      setProfilesList(updated)
      const active = getActiveProfile()
      if (active?.id === id) clearActiveProfile()
      setDeletingProfileId(null)
      showToast('Perfil eliminado', 'warning')
    } else {
      setDeletingProfileId(id)
      setTimeout(() => setDeletingProfileId(null), 3000)
    }
  }

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const loadTasks = useCallback(async () => {
    try {
      setError(null)
      const data = await fetchAllTasks()
      setTasks(data)
    } catch {
      setError('No se pudo cargar la lista de tareas.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadTasks() }, [loadTasks])

  async function handleSave(payload) {
    if (editingTask) {
      await updateTask(editingTask.id, payload)
      showToast('Tarea actualizada')
    } else {
      await createTask(payload)
      showToast('Tarea creada')
    }
    setShowForm(false)
    setEditingTask(null)
    loadTasks()
  }

  function openCreate() { setEditingTask(null); setShowForm(true) }
  function openEdit(task) { setEditingTask(task); setShowForm(true) }

  async function handleDelete(task) {
    if (deletingId === task.id) {
      try {
        await deleteTask(task.id)
        showToast('Tarea eliminada', 'warning')
        loadTasks()
      } catch { showToast('Error al eliminar', 'error') }
      finally { setDeletingId(null) }
    } else {
      setDeletingId(task.id)
      setTimeout(() => setDeletingId(null), 3000)
    }
  }

  async function handleReset(task) {
    setResettingId(task.id)
    try {
      await resetTask(task.id)
      showToast(`"${task.name}" aparecera hoy`)
    } catch { showToast('Error al resetear', 'error') }
    finally { setResettingId(null) }
  }

  async function handleToggleActive(task) {
    try {
      await updateTask(task.id, { is_active: !task.is_active })
      loadTasks()
    } catch { showToast('Error al actualizar', 'error') }
  }

  const activeCount = tasks.filter(t => t.is_active).length
  const inactiveCount = tasks.filter(t => !t.is_active).length

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 fade-in">
        <div className="w-10 h-10 rounded-full border-[3px] border-t-transparent animate-spin" style={{ borderColor: 'rgba(184,90,58,0.2)', borderTopColor: 'transparent' }} />
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
            color: 'white',
            minWidth: 180,
            textAlign: 'center',
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
            transform: 'translateX(-50%)',
          }}
        >
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="font-body text-[11px] font-semibold uppercase tracking-[0.1em] mb-1.5" style={{ color: 'var(--bark-300)' }}>
            Administracion
          </p>
          <h2 className="font-display text-[28px] leading-none" style={{ color: 'var(--bark-700)' }}>
            Tareas
          </h2>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-body font-semibold text-[13px] text-white transition-all active:scale-95"
          style={{ background: 'var(--clay-500)', boxShadow: '0 2px 8px rgba(184,90,58,0.25)' }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
            <path d="M12 5v14M5 12h14"/>
          </svg>
          Nueva
        </button>
      </div>

      {error && (
        <div className="rounded-xl p-4 mb-4 font-body text-[13px]" style={{ background: 'rgba(184,90,58,0.06)', color: 'var(--clay-500)', border: '1px solid rgba(184,90,58,0.15)' }}>
          {error}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 mb-6">
        {[
          { label: 'Total', value: tasks.length, color: 'var(--bark-700)', bg: 'var(--surface-card)', border: 'rgba(196,184,166,0.25)' },
          { label: 'Activas', value: activeCount, color: 'var(--moss-500)', bg: 'rgba(106,153,96,0.06)', border: 'rgba(106,153,96,0.15)' },
          { label: 'Inactivas', value: inactiveCount, color: 'var(--bark-300)', bg: 'rgba(158,139,114,0.06)', border: 'rgba(158,139,114,0.15)' },
        ].map(stat => (
          <div key={stat.label} className="rounded-xl px-3 py-3 text-center" style={{ background: stat.bg, border: `1px solid ${stat.border}` }}>
            <div className="font-display text-xl leading-none mb-0.5" style={{ color: stat.color }}>{stat.value}</div>
            <div className="font-body text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--bark-300)' }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Profiles section */}
      <div className="mb-8">
        <h3 className="font-display text-lg mb-3" style={{ color: 'var(--bark-700)' }}>Perfiles</h3>
        {profiles.length === 0 ? (
          <p className="font-body text-sm" style={{ color: 'var(--bark-300)' }}>
            No hay perfiles. Crea uno desde la pantalla de inicio.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {profiles.map(p => (
              <div
                key={p.id}
                className="flex items-center gap-2 px-3 py-2 rounded-xl"
                style={{ background: 'var(--surface-card)', border: '1px solid rgba(196,184,166,0.25)' }}
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-sm"
                  style={{ background: p.color + '22', border: `2px solid ${p.color}` }}
                >
                  {p.avatar}
                </div>
                <span className="font-body font-semibold text-[13px]" style={{ color: 'var(--bark-700)' }}>{p.name}</span>
                <button
                  onClick={() => handleDeleteProfile(p.id)}
                  className="ml-1 w-6 h-6 rounded-md flex items-center justify-center transition-all"
                  style={{ color: deletingProfileId === p.id ? 'var(--clay-500)' : 'var(--bark-300)', background: deletingProfileId === p.id ? 'rgba(184,90,58,0.08)' : 'transparent' }}
                  title={deletingProfileId === p.id ? 'Confirmar' : 'Eliminar'}
                >
                  {deletingProfileId === p.id ? (
                    <span className="font-body font-bold text-[9px]">?</span>
                  ) : (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <path d="M18 6L6 18M6 6l12 12"/>
                    </svg>
                  )}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Task list */}
      {tasks.length === 0 ? (
        <div className="text-center py-12 fade-in">
          <div className="w-14 h-14 mx-auto mb-4 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(184,90,58,0.08)' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--clay-500)" strokeWidth="2" strokeLinecap="round">
              <path d="M12 5v14M5 12h14"/>
            </svg>
          </div>
          <p className="font-display text-xl mb-1" style={{ color: 'var(--bark-700)' }}>Sin tareas</p>
          <p className="font-body text-sm mb-5" style={{ color: 'var(--bark-300)' }}>Crea tu primera tarea para empezar</p>
          <button onClick={openCreate} className="px-5 py-2.5 rounded-xl font-body font-semibold text-[13px] text-white" style={{ background: 'var(--clay-500)' }}>
            Crear primera tarea
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5 stagger">
          {tasks.map(task => (
            <TaskAdminCard
              key={task.id}
              task={task}
              deletingId={deletingId}
              resettingId={resettingId}
              onEdit={openEdit}
              onDelete={handleDelete}
              onReset={handleReset}
              onToggleActive={handleToggleActive}
              onHistory={setHistoryTask}
            />
          ))}
        </div>
      )}

      {/* Form modal */}
      {showForm && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4 modal-backdrop"
          onClick={() => { setShowForm(false); setEditingTask(null) }}
        >
          <div
            className="w-full max-w-lg rounded-t-2xl sm:rounded-2xl p-5 max-h-[92dvh] overflow-y-auto fade-in"
            style={{ background: 'var(--surface-card)', border: '1px solid rgba(196,184,166,0.25)' }}
            onClick={e => e.stopPropagation()}
          >
            <h3 className="font-display text-xl mb-5" style={{ color: 'var(--bark-700)' }}>
              {editingTask ? 'Editar tarea' : 'Nueva tarea'}
            </h3>
            <TaskForm
              task={editingTask}
              onSave={handleSave}
              onCancel={() => { setShowForm(false); setEditingTask(null) }}
            />
          </div>
        </div>
      )}

      {/* History modal */}
      {historyTask && (
        <HistoryModal task={historyTask} onClose={() => setHistoryTask(null)} />
      )}
    </div>
  )
}

function TaskAdminCard({ task, deletingId, resettingId, onEdit, onDelete, onReset, onToggleActive, onHistory }) {
  const isDeleting = deletingId === task.id
  const isResetting = resettingId === task.id

  return (
    <div
      className="rounded-xl overflow-hidden task-enter relative"
      style={{
        background: task.is_active ? 'var(--surface-card)' : 'rgba(244,241,236,0.6)',
        border: '1px solid',
        borderColor: task.is_active ? 'rgba(196,184,166,0.25)' : 'rgba(196,184,166,0.15)',
        boxShadow: task.is_active ? '0 1px 3px rgba(26,22,20,0.04)' : 'none',
      }}
    >
      {/* Left accent */}
      <div
        className="absolute left-0 top-0 bottom-0 w-[3px]"
        style={{
          background: task.is_active ? 'var(--moss-400)' : 'rgba(196,184,166,0.3)',
          borderRadius: '3px 0 0 3px',
        }}
      />

      <div className="pl-5 pr-3 pt-3.5 pb-3">
        <div className="flex items-start gap-2.5">
          {/* Toggle */}
          <button
            onClick={() => onToggleActive(task)}
            className="mt-0.5 flex-shrink-0 w-[18px] h-[18px] rounded-md border-[1.5px] flex items-center justify-center transition-all"
            style={{
              background: task.is_active ? 'var(--moss-400)' : 'transparent',
              borderColor: task.is_active ? 'var(--moss-400)' : 'var(--bark-200)',
            }}
          >
            {task.is_active && (
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 13l4 4L19 7"/>
              </svg>
            )}
          </button>

          <div className="flex-1 min-w-0">
            <h4
              className="font-body font-semibold text-[14px] leading-tight"
              style={{ color: task.is_active ? 'var(--bark-700)' : 'var(--bark-300)' }}
            >
              {task.name}
            </h4>
            {task.description && (
              <p className="font-body text-[12px] mt-0.5 truncate" style={{ color: 'var(--bark-300)' }}>
                {task.description}
              </p>
            )}
            <div className="flex items-center gap-1.5 mt-1.5">
              <span
                className="freq-badge"
                style={{
                  background: task.is_active ? 'rgba(106,153,96,0.1)' : 'rgba(158,139,114,0.1)',
                  color: task.is_active ? 'var(--moss-500)' : 'var(--bark-300)',
                }}
              >
                {FREQ_ICONS[task.frequency_type] || FREQ_ICONS.weekly}
                {frequencyLabel(task)}
              </span>
              {!task.is_active && (
                <span className="text-[10px] font-body font-medium px-2 py-0.5 rounded-full"
                  style={{ background: 'rgba(158,139,114,0.1)', color: 'var(--bark-300)' }}>
                  inactiva
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div
        className="flex items-center justify-end gap-0.5 px-2 pb-2 pt-0.5"
        style={{ borderTop: '1px solid rgba(196,184,166,0.12)' }}
      >
        <AdminBtn onClick={() => onHistory(task)} title="Historial">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/>
          </svg>
        </AdminBtn>
        <AdminBtn onClick={() => onReset(task)} title="Resetear" disabled={isResetting}>
          {isResetting ? (
            <div className="w-3.5 h-3.5 rounded-full border-[1.5px] border-t-transparent animate-spin" style={{ borderColor: 'var(--moss-200)', borderTopColor: 'transparent' }} />
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M1 4v6h6M23 20v-6h-6"/>
              <path d="M20.49 9A9 9 0 005.64 5.64L1 10M23 14l-4.64 4.36A9 9 0 013.51 15"/>
            </svg>
          )}
        </AdminBtn>
        <AdminBtn onClick={() => onEdit(task)} title="Editar">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
        </AdminBtn>
        <AdminBtn
          onClick={() => onDelete(task)}
          title={isDeleting ? 'Confirmar' : 'Eliminar'}
          danger={isDeleting}
        >
          {isDeleting ? (
            <span className="font-body font-bold text-[10px]" style={{ color: 'var(--clay-500)' }}>Seguro?</span>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
            </svg>
          )}
        </AdminBtn>
      </div>
    </div>
  )
}

function AdminBtn({ onClick, title, disabled, danger, children }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="min-w-[36px] h-8 px-2 rounded-lg flex items-center justify-center transition-all active:scale-90 disabled:opacity-40"
      style={{
        color: danger ? 'var(--clay-500)' : 'var(--bark-300)',
        background: danger ? 'rgba(184,90,58,0.06)' : 'transparent',
      }}
      onMouseEnter={e => {
        if (!danger) e.currentTarget.style.background = 'rgba(196,184,166,0.15)'
      }}
      onMouseLeave={e => {
        if (!danger) e.currentTarget.style.background = 'transparent'
      }}
    >
      {children}
    </button>
  )
}
