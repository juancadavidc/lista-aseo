import { useState, useEffect, useCallback } from 'react'
import { fetchPendingTasks, completeTask, overdueLabel, frequencyLabel } from '../lib/tasks'
import { getActiveProfile } from '../lib/profiles'
import TaskCard from '../components/TaskCard'
import ProgressRing from '../components/ProgressRing'

export default function Home() {
  const [tasks, setTasks] = useState([])
  const [totalActive, setTotalActive] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const loadTasks = useCallback(async () => {
    try {
      setError(null)
      const pending = await fetchPendingTasks()
      setTotalActive(pending.length)
      setTasks(
        pending.map(t => ({
          ...t,
          overdueLabel: overdueLabel(t, t.lastCompletedAt),
          frequencyLabel: frequencyLabel(t),
        }))
      )
    } catch (err) {
      console.error(err)
      setError('No se pudo conectar con el servidor. Verifica que los servicios estén corriendo.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadTasks() }, [loadTasks])

  const [completed, setCompleted] = useState(0)

  async function handleComplete(taskId) {
    try {
      const profile = getActiveProfile()
      await completeTask(taskId, profile?.name)
      setCompleted(prev => prev + 1)
      setTasks(prev => prev.filter(t => t.id !== taskId))
    } catch (err) {
      console.error(err)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 fade-in">
        <div className="relative">
          <div
            className="w-10 h-10 rounded-full border-[3px] border-t-transparent animate-spin"
            style={{ borderColor: 'var(--moss-200)', borderTopColor: 'transparent' }}
          />
        </div>
        <p className="font-body text-sm font-medium" style={{ color: 'var(--bark-300)' }}>
          Cargando tareas...
        </p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-2xl p-6 text-center fade-in" style={{ background: 'rgba(184,90,58,0.06)', border: '1px solid rgba(184,90,58,0.15)' }}>
        <div className="w-12 h-12 mx-auto mb-3 rounded-xl flex items-center justify-center" style={{ background: 'rgba(184,90,58,0.1)' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--clay-500)" strokeWidth="2" strokeLinecap="round">
            <circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>
          </svg>
        </div>
        <p className="font-body font-semibold text-sm mb-1" style={{ color: 'var(--clay-500)' }}>
          Sin conexion
        </p>
        <p className="font-body text-[13px] mb-4" style={{ color: 'var(--bark-300)' }}>{error}</p>
        <button
          onClick={loadTasks}
          className="px-5 py-2 rounded-xl font-body font-semibold text-[13px] text-white transition-all active:scale-95"
          style={{ background: 'var(--clay-500)' }}
        >
          Reintentar
        </button>
      </div>
    )
  }

  return (
    <div className="fade-in">
      {/* Header with progress */}
      <div className="flex items-start justify-between mb-7">
        <div>
          <p className="font-body text-[11px] font-semibold uppercase tracking-[0.1em] mb-1.5" style={{ color: 'var(--bark-300)' }}>
            {new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
          <h2 className="font-display text-[28px] leading-none" style={{ color: 'var(--bark-700)' }}>
            {tasks.length === 0 ? 'Todo al dia' : `${tasks.length} pendiente${tasks.length !== 1 ? 's' : ''}`}
          </h2>
        </div>
        {totalActive > 0 && (
          <ProgressRing completed={completed} total={totalActive} />
        )}
      </div>

      {/* Task list */}
      {tasks.length > 0 ? (
        <div className="flex flex-col gap-3 stagger">
          {tasks.map(task => (
            <TaskCard key={task.id} task={task} onComplete={handleComplete} />
          ))}
        </div>
      ) : (
        <EmptyState />
      )}

      {/* Refresh */}
      {tasks.length > 0 && (
        <div className="mt-8 flex justify-center">
          <button
            onClick={loadTasks}
            className="flex items-center gap-2 px-4 py-2 rounded-xl font-body text-[13px] font-medium transition-all active:scale-95 hover:shadow-sm"
            style={{ color: 'var(--bark-300)', border: '1px solid rgba(196,184,166,0.3)', background: 'rgba(250,248,245,0.5)' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M1 4v6h6M23 20v-6h-6"/>
              <path d="M20.49 9A9 9 0 005.64 5.64L1 10M23 14l-4.64 4.36A9 9 0 013.51 15"/>
            </svg>
            Actualizar
          </button>
        </div>
      )}
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center fade-in">
      {/* SVG illustration */}
      <div className="mb-6 relative" style={{ width: 120, height: 120 }}>
        <svg viewBox="0 0 120 120" fill="none" className="w-full h-full" style={{ animation: 'float 6s ease-in-out infinite' }}>
          {/* Pot */}
          <ellipse cx="60" cy="100" rx="28" ry="6" fill="rgba(158,139,114,0.15)"/>
          <path d="M40 68h40v20c0 8-8 14-20 14s-20-6-20-14V68z" fill="#c4b49e" opacity="0.6"/>
          <path d="M38 65h44a3 3 0 010 6H38a3 3 0 010-6z" fill="#9e8b72" opacity="0.5"/>
          {/* Plant stem */}
          <path d="M60 65V35" stroke="#6a9960" strokeWidth="2.5" strokeLinecap="round"/>
          <path d="M60 55c-8-2-14-10-12-18" stroke="#6a9960" strokeWidth="2" strokeLinecap="round" fill="none"/>
          <path d="M60 45c8-2 16-8 14-16" stroke="#94b78c" strokeWidth="2" strokeLinecap="round" fill="none"/>
          {/* Leaves */}
          <path d="M48 37c-4-8 0-16 8-18 2 10-2 16-8 18z" fill="#6a9960" opacity="0.8"/>
          <path d="M74 29c4-6 0-14-8-16-2 8 2 14 8 16z" fill="#94b78c" opacity="0.7"/>
          <path d="M56 25c-2-6 2-12 8-14 1 8-3 12-8 14z" fill="#c3d6be" opacity="0.6"/>
          {/* Sparkles */}
          <circle cx="82" cy="30" r="2" fill="#b85a3a" opacity="0.4" style={{ animation: 'pulseSoft 2s ease-in-out infinite' }}/>
          <circle cx="36" cy="42" r="1.5" fill="#6a9960" opacity="0.4" style={{ animation: 'pulseSoft 2s ease-in-out infinite 0.5s' }}/>
          <circle cx="78" cy="52" r="1" fill="#b85a3a" opacity="0.3" style={{ animation: 'pulseSoft 2s ease-in-out infinite 1s' }}/>
        </svg>
      </div>

      <h3 className="font-display text-2xl mb-2" style={{ color: 'var(--bark-700)' }}>
        Todo al dia
      </h3>
      <p className="font-body text-sm max-w-[260px] leading-relaxed" style={{ color: 'var(--bark-300)' }}>
        No hay tareas pendientes. Las tareas apareceran automaticamente cuando sea su hora.
      </p>
    </div>
  )
}
