import { useState, useEffect } from 'react'
import { fetchParticipationStats } from '../lib/api'

const PERIODS = [
  { key: 'week', label: '7 dias' },
  { key: 'month', label: '30 dias' },
  { key: 'all', label: 'Todo' },
]

export default function Stats() {
  const [stats, setStats] = useState(null)
  const [period, setPeriod] = useState('month')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetchParticipationStats(period)
      .then(setStats)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [period])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 fade-in">
        <div
          className="w-10 h-10 rounded-full border-[3px] border-t-transparent animate-spin"
          style={{ borderColor: 'var(--moss-200)', borderTopColor: 'transparent' }}
        />
        <p className="font-body text-sm font-medium" style={{ color: 'var(--bark-300)' }}>
          Cargando estadisticas...
        </p>
      </div>
    )
  }

  if (!stats) return null

  const maxCompletions = Math.max(...stats.members.map(m => m.completions), 1)

  return (
    <div className="fade-in">
      {/* Header */}
      <div className="mb-6">
        <p className="font-body text-[11px] font-semibold uppercase tracking-[0.1em] mb-1.5" style={{ color: 'var(--bark-300)' }}>
          Estadisticas
        </p>
        <h2 className="font-display text-[28px] leading-none" style={{ color: 'var(--bark-700)' }}>
          Participacion
        </h2>
      </div>

      {/* Period selector */}
      <div className="flex gap-1 p-1 rounded-xl mb-6" style={{ background: 'rgba(196,184,166,0.15)' }}>
        {PERIODS.map(p => (
          <button
            key={p.key}
            onClick={() => setPeriod(p.key)}
            className="flex-1 py-2 rounded-lg font-body text-[12px] font-medium transition-all"
            style={period === p.key
              ? { background: 'var(--surface-elevated)', color: 'var(--moss-500)', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }
              : { color: 'var(--bark-300)' }
            }
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Total */}
      <div
        className="rounded-2xl p-5 mb-6"
        style={{ background: 'var(--surface-card)', border: '1px solid rgba(196,184,166,0.15)' }}
      >
        <p className="font-body text-[11px] font-semibold uppercase tracking-[0.1em] mb-1" style={{ color: 'var(--bark-300)' }}>
          Tareas completadas
        </p>
        <p className="font-display text-[42px] leading-none" style={{ color: 'var(--moss-500)' }}>
          {stats.total}
        </p>
      </div>

      {/* Member distribution */}
      {stats.members.length > 0 ? (
        <div className="mb-6">
          <h3 className="font-body text-[13px] font-semibold mb-3" style={{ color: 'var(--bark-700)' }}>
            Por miembro
          </h3>
          <div className="flex flex-col gap-3">
            {stats.members.map(member => (
              <MemberBar key={member.userId} member={member} maxCompletions={maxCompletions} />
            ))}
          </div>
        </div>
      ) : (
        <div className="rounded-2xl p-6 text-center mb-6" style={{ background: 'var(--surface-card)', border: '1px solid rgba(196,184,166,0.15)' }}>
          <p className="font-body text-sm" style={{ color: 'var(--bark-300)' }}>
            No hay tareas completadas en este periodo
          </p>
        </div>
      )}

      {/* Activity chart */}
      {stats.daily.length > 0 && (
        <div className="mb-6">
          <h3 className="font-body text-[13px] font-semibold mb-3" style={{ color: 'var(--bark-700)' }}>
            Actividad diaria
          </h3>
          <DailyChart data={stats.daily} />
        </div>
      )}

      {/* Top tasks */}
      {stats.topTasks.length > 0 && (
        <div>
          <h3 className="font-body text-[13px] font-semibold mb-3" style={{ color: 'var(--bark-700)' }}>
            Tareas mas frecuentes
          </h3>
          <div
            className="rounded-2xl overflow-hidden"
            style={{ background: 'var(--surface-card)', border: '1px solid rgba(196,184,166,0.15)' }}
          >
            {stats.topTasks.map((task, i) => (
              <div
                key={task.name}
                className="flex items-center justify-between px-4 py-3"
                style={i < stats.topTasks.length - 1 ? { borderBottom: '1px solid rgba(196,184,166,0.12)' } : {}}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="font-body text-[12px] font-semibold w-5 text-center" style={{ color: 'var(--bark-300)' }}>
                    {i + 1}
                  </span>
                  <span className="font-body text-[13px] font-medium truncate" style={{ color: 'var(--bark-700)' }}>
                    {task.name}
                  </span>
                </div>
                <span className="font-body text-[13px] font-semibold flex-shrink-0 ml-2" style={{ color: 'var(--moss-500)' }}>
                  {task.completions}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function MemberBar({ member, maxCompletions }) {
  const barWidth = (member.completions / maxCompletions) * 100

  return (
    <div
      className="rounded-2xl p-4"
      style={{ background: 'var(--surface-card)', border: '1px solid rgba(196,184,166,0.15)' }}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0"
            style={{ background: member.color + '22', border: `2px solid ${member.color}` }}
          >
            {member.avatar}
          </div>
          <span className="font-body text-[13px] font-semibold truncate" style={{ color: 'var(--bark-700)' }}>
            {member.name}
          </span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="font-body text-[18px] font-semibold" style={{ color: member.color }}>
            {member.completions}
          </span>
          <span className="font-body text-[11px] font-medium px-1.5 py-0.5 rounded-md" style={{ background: member.color + '15', color: member.color }}>
            {member.percentage}%
          </span>
        </div>
      </div>
      {/* Progress bar */}
      <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(196,184,166,0.15)' }}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${barWidth}%`, background: member.color }}
        />
      </div>
    </div>
  )
}

function DailyChart({ data }) {
  const maxCount = Math.max(...data.map(d => d.count), 1)
  const barCount = data.length

  return (
    <div
      className="rounded-2xl p-4"
      style={{ background: 'var(--surface-card)', border: '1px solid rgba(196,184,166,0.15)' }}
    >
      <div className="flex items-end gap-[2px]" style={{ height: 100 }}>
        {data.map((d, i) => {
          const height = (d.count / maxCount) * 100
          const date = new Date(d.date)
          const isWeekend = date.getDay() === 0 || date.getDay() === 6
          return (
            <div
              key={d.date}
              className="flex-1 rounded-t transition-all group relative"
              style={{
                height: `${Math.max(height, 4)}%`,
                background: isWeekend ? 'var(--clay-500)' : 'var(--moss-400)',
                opacity: 0.7 + (height / 100) * 0.3,
                minWidth: barCount > 30 ? 2 : 4,
              }}
              title={`${date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}: ${d.count}`}
            />
          )
        })}
      </div>
      <div className="flex justify-between mt-2">
        <span className="font-body text-[10px]" style={{ color: 'var(--bark-300)' }}>
          {new Date(data[0].date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
        </span>
        <span className="font-body text-[10px]" style={{ color: 'var(--bark-300)' }}>
          {new Date(data[data.length - 1].date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
        </span>
      </div>
    </div>
  )
}
