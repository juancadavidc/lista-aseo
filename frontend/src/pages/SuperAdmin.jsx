import { useState, useEffect } from 'react'
import { fetchSuperAdminStats } from '../lib/api'

/* ── Icon components ── */
function UsersIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
    </svg>
  )
}

function HouseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
      <polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
  )
}

function TasksIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/>
      <polyline points="10 9 9 9 8 9"/>
    </svg>
  )
}

function CheckCircleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
      <polyline points="22 4 12 14.01 9 11.01"/>
    </svg>
  )
}

function ChartIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10"/>
      <line x1="12" y1="20" x2="12" y2="4"/>
      <line x1="6" y1="20" x2="6" y2="14"/>
    </svg>
  )
}

function MembersIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
    </svg>
  )
}

/* ── StatCard ── */
function StatCard({ label, value, icon, color, bg }) {
  return (
    <div
      className="rounded-2xl p-4 flex flex-col gap-3 transition-all hover:shadow-card-hover task-enter"
      style={{
        background: bg,
        border: `1px solid ${color}22`,
        boxShadow: '0 1px 3px rgba(26,22,20,0.04)',
      }}
    >
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center"
        style={{ background: `${color}18`, color }}
      >
        {icon}
      </div>
      <div>
        <span className="font-display text-[28px] leading-none block" style={{ color }}>
          {value}
        </span>
        <span className="font-body text-[11px] font-semibold uppercase tracking-[0.08em] mt-1 block" style={{ color: 'var(--bark-300)' }}>
          {label}
        </span>
      </div>
    </div>
  )
}

/* ── Insight row ── */
function InsightRow({ label, value, color }) {
  return (
    <div className="flex items-center justify-between py-3" style={{ borderBottom: '1px solid rgba(196,184,166,0.12)' }}>
      <span className="font-body text-[13px] font-medium" style={{ color: 'var(--bark-400)' }}>
        {label}
      </span>
      <span className="font-display text-lg" style={{ color: color || 'var(--bark-700)' }}>
        {value}
      </span>
    </div>
  )
}

/* ── ActivityChart ── */
function ActivityChart({ data }) {
  const [hoveredIdx, setHoveredIdx] = useState(null)

  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-3" style={{ background: 'rgba(158,139,114,0.08)' }}>
          <ChartIcon />
        </div>
        <p className="font-body text-sm" style={{ color: 'var(--bark-300)' }}>
          Sin actividad en los ultimos 30 dias
        </p>
      </div>
    )
  }

  const max = Math.max(...data.map(d => d.count), 1)
  const total = data.reduce((sum, d) => sum + d.count, 0)

  return (
    <div className="flex flex-col gap-3">
      {/* Chart header with total */}
      <div className="flex items-center justify-between">
        <span className="font-body text-[11px] font-semibold uppercase tracking-[0.08em]" style={{ color: 'var(--bark-300)' }}>
          Ultimos 30 dias
        </span>
        <span className="font-body text-[13px] font-semibold" style={{ color: 'var(--moss-500)' }}>
          {total} completadas
        </span>
      </div>

      {/* Bars */}
      <div className="flex items-end gap-[3px] h-32">
        {data.map((d, i) => {
          const height = Math.max((d.count / max) * 100, 4)
          const date = new Date(d.day)
          const label = `${date.getDate()}/${date.getMonth() + 1}`
          const isHovered = hoveredIdx === i
          return (
            <div
              key={d.day}
              className="flex-1 flex flex-col items-center min-w-0 relative"
              onMouseEnter={() => setHoveredIdx(i)}
              onMouseLeave={() => setHoveredIdx(null)}
              onTouchStart={() => setHoveredIdx(i)}
              onTouchEnd={() => setHoveredIdx(null)}
            >
              {/* Tooltip */}
              {isHovered && d.count > 0 && (
                <div
                  className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 rounded-lg whitespace-nowrap z-10 font-body text-[10px] font-semibold"
                  style={{
                    background: 'var(--bark-700)',
                    color: 'white',
                    boxShadow: '0 2px 8px rgba(26,22,20,0.2)',
                  }}
                >
                  {label}: {d.count}
                </div>
              )}
              <div
                className="w-full rounded-t-sm transition-all duration-200"
                style={{
                  height: `${height}%`,
                  background: isHovered ? 'var(--moss-400)' : 'var(--moss-500)',
                  opacity: isHovered ? 1 : 0.75,
                  minHeight: '3px',
                }}
              />
            </div>
          )
        })}
      </div>

      {/* Footer label */}
      <p className="font-body text-[10px] text-right" style={{ color: 'var(--bark-300)' }}>
        Tareas completadas por dia
      </p>
    </div>
  )
}

/* ── OrgCard ── */
function OrgCard({ org }) {
  const completionRate = org.taskCount > 0
    ? Math.round((org.completionCount || 0) / org.taskCount * 100)
    : 0

  return (
    <div
      className="rounded-2xl overflow-hidden transition-all hover:shadow-card-hover task-enter relative"
      style={{
        background: 'var(--surface-card)',
        border: '1px solid rgba(196,184,166,0.2)',
        boxShadow: '0 1px 3px rgba(26,22,20,0.04)',
      }}
    >
      {/* Left accent */}
      <div
        className="absolute left-0 top-0 bottom-0 w-[3px]"
        style={{
          background: org.taskCount > 0 ? 'var(--moss-400)' : 'rgba(196,184,166,0.3)',
          borderRadius: '3px 0 0 3px',
        }}
      />

      <div className="pl-5 pr-4 py-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 font-display text-[15px]"
              style={{
                background: 'rgba(106,153,96,0.08)',
                color: 'var(--moss-500)',
                border: '1px solid rgba(106,153,96,0.12)',
              }}
            >
              {org.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <h4 className="font-body font-semibold text-[14px] leading-tight truncate" style={{ color: 'var(--bark-700)' }}>
                {org.name}
              </h4>
              <span className="font-body text-[11px]" style={{ color: 'var(--bark-300)' }}>
                {org.slug}
              </span>
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-3 mb-3">
          <div className="flex items-center gap-1.5">
            <span style={{ color: 'var(--bark-300)' }}><MembersIcon /></span>
            <span className="font-body text-[12px] font-medium" style={{ color: 'var(--bark-400)' }}>
              {org.memberCount} miembro{org.memberCount !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="w-px h-3" style={{ background: 'rgba(196,184,166,0.3)' }} />
          <span className="font-body text-[12px] font-medium" style={{ color: 'var(--bark-400)' }}>
            {org.taskCount} tarea{org.taskCount !== 1 ? 's' : ''}
          </span>
          {org.lastActivity && (
            <>
              <div className="w-px h-3" style={{ background: 'rgba(196,184,166,0.3)' }} />
              <span className="font-body text-[11px]" style={{ color: 'var(--bark-300)' }}>
                {new Date(org.lastActivity).toLocaleDateString('es')}
              </span>
            </>
          )}
        </div>

        {/* Progress bar */}
        {org.taskCount > 0 && (
          <div className="flex items-center gap-2.5">
            <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(196,184,166,0.15)' }}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${completionRate}%`,
                  background: completionRate > 70 ? 'var(--moss-400)' : completionRate > 30 ? 'var(--clay-400)' : 'var(--bark-300)',
                }}
              />
            </div>
            <span className="font-body text-[10px] font-semibold flex-shrink-0" style={{ color: 'var(--bark-300)' }}>
              {completionRate}%
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

/* ── Main SuperAdmin ── */
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
      <div className="flex flex-col items-center justify-center py-24 gap-4 fade-in">
        <div className="w-10 h-10 rounded-full border-[3px] border-t-transparent animate-spin" style={{ borderColor: 'rgba(106,153,96,0.2)', borderTopColor: 'transparent' }} />
        <p className="font-body text-sm font-medium" style={{ color: 'var(--bark-300)' }}>Cargando panel...</p>
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
        <p className="font-body font-semibold text-sm mb-1" style={{ color: 'var(--clay-500)' }}>Error al cargar</p>
        <p className="font-body text-[13px]" style={{ color: 'var(--bark-300)' }}>{error}</p>
      </div>
    )
  }

  if (!stats) return null

  const avgMembers = stats.totalOrganizations > 0
    ? (stats.totalMembers / stats.totalOrganizations).toFixed(1)
    : 0

  const completionRate = stats.totalTasks > 0
    ? Math.round((stats.totalCompletions / stats.totalTasks) * 100)
    : 0

  return (
    <div className="fade-in">
      {/* Header */}
      <div className="mb-7">
        <p className="font-body text-[11px] font-semibold uppercase tracking-[0.1em] mb-1.5" style={{ color: 'var(--bark-300)' }}>
          Super Admin
        </p>
        <h2 className="font-display text-[28px] leading-none mb-1" style={{ color: 'var(--bark-700)' }}>
          Panel global
        </h2>
        <p className="font-body text-[13px]" style={{ color: 'var(--bark-300)' }}>
          Vista general de toda la plataforma
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3 mb-4 stagger">
        <StatCard
          label="Usuarios"
          value={stats.totalUsers}
          icon={<UsersIcon />}
          color="#4d7a44"
          bg="rgba(106,153,96,0.05)"
        />
        <StatCard
          label="Casas"
          value={stats.totalOrganizations}
          icon={<HouseIcon />}
          color="#b85a3a"
          bg="rgba(184,90,58,0.04)"
        />
        <StatCard
          label="Tareas"
          value={stats.totalTasks}
          icon={<TasksIcon />}
          color="#2a231a"
          bg="var(--surface-card)"
        />
        <StatCard
          label="Completadas"
          value={stats.totalCompletions}
          icon={<CheckCircleIcon />}
          color="#385c32"
          bg="rgba(106,153,96,0.05)"
        />
      </div>

      {/* Insights card */}
      <div
        className="rounded-2xl px-5 py-2 mb-4"
        style={{
          background: 'var(--surface-card)',
          border: '1px solid rgba(196,184,166,0.2)',
          boxShadow: '0 1px 3px rgba(26,22,20,0.04)',
        }}
      >
        <InsightRow label="Promedio miembros/casa" value={avgMembers} color="var(--clay-500)" />
        <InsightRow label="Tasa de completado" value={`${completionRate}%`} color="var(--moss-500)" />
        <div className="flex items-center justify-between py-3">
          <span className="font-body text-[13px] font-medium" style={{ color: 'var(--bark-400)' }}>
            Total miembros
          </span>
          <span className="font-display text-lg" style={{ color: 'var(--bark-700)' }}>
            {stats.totalMembers}
          </span>
        </div>
      </div>

      {/* Activity chart */}
      <div
        className="rounded-2xl p-5 mb-6"
        style={{
          background: 'var(--surface-card)',
          border: '1px solid rgba(196,184,166,0.2)',
          boxShadow: '0 1px 3px rgba(26,22,20,0.04)',
        }}
      >
        <div className="flex items-center gap-2 mb-4">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(106,153,96,0.1)', color: 'var(--moss-500)' }}>
            <ChartIcon />
          </div>
          <h3 className="font-display text-lg" style={{ color: 'var(--bark-700)' }}>
            Actividad
          </h3>
        </div>
        <ActivityChart data={stats.completionsLast30Days} />
      </div>

      {/* Organizations */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h3 className="font-display text-lg" style={{ color: 'var(--bark-700)' }}>
              Casas
            </h3>
            <span
              className="font-body text-[11px] font-semibold px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(184,90,58,0.08)', color: 'var(--clay-500)' }}
            >
              {stats.organizations.length}
            </span>
          </div>
        </div>

        {stats.organizations.length === 0 ? (
          <div className="rounded-2xl p-8 text-center" style={{ background: 'var(--surface-card)', border: '1px solid rgba(196,184,166,0.2)' }}>
            <div className="w-12 h-12 mx-auto mb-3 rounded-xl flex items-center justify-center" style={{ background: 'rgba(158,139,114,0.08)' }}>
              <HouseIcon />
            </div>
            <p className="font-body text-sm" style={{ color: 'var(--bark-300)' }}>
              No hay casas registradas aun
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3 stagger">
            {stats.organizations.map(org => (
              <OrgCard key={org.id} org={org} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
