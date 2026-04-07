import { useState, useEffect } from 'react'
import { fetchSuperAdminStats } from '../lib/api'

function StatCard({ label, value, color }) {
  return (
    <div
      className="rounded-xl p-4 flex flex-col gap-1"
      style={{ background: 'var(--surface-card)', border: '1px solid rgba(196,184,166,0.15)' }}
    >
      <span className="font-body text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--bark-300)' }}>
        {label}
      </span>
      <span className="font-display text-2xl" style={{ color: color || 'var(--bark-700)' }}>
        {value}
      </span>
    </div>
  )
}

function ActivityChart({ data }) {
  if (!data || data.length === 0) {
    return (
      <p className="font-body text-sm" style={{ color: 'var(--bark-300)' }}>
        Sin actividad en los ultimos 30 dias
      </p>
    )
  }

  const max = Math.max(...data.map(d => d.count), 1)

  return (
    <div className="flex items-end gap-[3px] h-28">
      {data.map(d => {
        const height = Math.max((d.count / max) * 100, 4)
        const date = new Date(d.day)
        const label = `${date.getDate()}/${date.getMonth() + 1}`
        return (
          <div key={d.day} className="flex-1 flex flex-col items-center gap-1 min-w-0" title={`${label}: ${d.count}`}>
            <div
              className="w-full rounded-t-sm transition-all"
              style={{
                height: `${height}%`,
                background: 'var(--moss-500)',
                opacity: 0.8,
                minHeight: '3px',
              }}
            />
          </div>
        )
      })}
    </div>
  )
}

export default function SuperAdmin() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchSuperAdminStats()
      .then(setStats)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 rounded-full border-[3px] border-t-transparent animate-spin" style={{ borderColor: 'var(--moss-200)', borderTopColor: 'transparent' }} />
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-xl p-6 text-center" style={{ background: 'var(--surface-card)', border: '1px solid rgba(196,184,166,0.15)' }}>
        <p className="font-body text-sm" style={{ color: 'var(--clay-500)' }}>{error}</p>
      </div>
    )
  }

  if (!stats) return null

  const avgMembers = stats.totalOrganizations > 0
    ? (stats.totalMembers / stats.totalOrganizations).toFixed(1)
    : 0

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <h2 className="font-display text-xl" style={{ color: 'var(--bark-700)' }}>
          Panel Super Admin
        </h2>
        <p className="font-body text-sm mt-1" style={{ color: 'var(--bark-300)' }}>
          Vista global de la aplicacion
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Usuarios" value={stats.totalUsers} color="var(--moss-500)" />
        <StatCard label="Casas" value={stats.totalOrganizations} color="var(--clay-500)" />
        <StatCard label="Tareas creadas" value={stats.totalTasks} color="var(--bark-700)" />
        <StatCard label="Completions" value={stats.totalCompletions} color="var(--moss-600)" />
      </div>

      {/* Derived stat */}
      <div
        className="rounded-xl p-4 flex items-center justify-between"
        style={{ background: 'var(--surface-card)', border: '1px solid rgba(196,184,166,0.15)' }}
      >
        <span className="font-body text-sm font-medium" style={{ color: 'var(--bark-300)' }}>
          Promedio miembros por casa
        </span>
        <span className="font-display text-lg" style={{ color: 'var(--clay-500)' }}>
          {avgMembers}
        </span>
      </div>

      {/* Activity chart */}
      <div
        className="rounded-xl p-4 flex flex-col gap-3"
        style={{ background: 'var(--surface-card)', border: '1px solid rgba(196,184,166,0.15)' }}
      >
        <h3 className="font-body text-sm font-semibold" style={{ color: 'var(--bark-700)' }}>
          Actividad ultimos 30 dias
        </h3>
        <ActivityChart data={stats.completionsLast30Days} />
        <p className="font-body text-[11px] text-right" style={{ color: 'var(--bark-300)' }}>
          Tareas completadas por dia
        </p>
      </div>

      {/* Organizations list */}
      <div className="flex flex-col gap-3">
        <h3 className="font-body text-sm font-semibold" style={{ color: 'var(--bark-700)' }}>
          Casas ({stats.organizations.length})
        </h3>
        {stats.organizations.map(org => (
          <div
            key={org.id}
            className="rounded-xl p-4 flex flex-col gap-2"
            style={{ background: 'var(--surface-card)', border: '1px solid rgba(196,184,166,0.15)' }}
          >
            <div className="flex items-center justify-between">
              <span className="font-body text-sm font-semibold" style={{ color: 'var(--bark-700)' }}>
                {org.name}
              </span>
              <span className="font-body text-[11px] px-2 py-0.5 rounded-full" style={{ background: 'var(--moss-100)', color: 'var(--moss-600)' }}>
                {org.slug}
              </span>
            </div>
            <div className="flex items-center gap-4">
              <span className="font-body text-xs" style={{ color: 'var(--bark-300)' }}>
                {org.memberCount} miembro{org.memberCount !== 1 ? 's' : ''}
              </span>
              <span className="font-body text-xs" style={{ color: 'var(--bark-300)' }}>
                {org.taskCount} tarea{org.taskCount !== 1 ? 's' : ''}
              </span>
              {org.lastActivity && (
                <span className="font-body text-xs" style={{ color: 'var(--bark-300)' }}>
                  Ultima act: {new Date(org.lastActivity).toLocaleDateString('es')}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
