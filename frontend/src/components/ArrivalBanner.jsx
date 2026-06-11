import { useState } from 'react'
import { markVisit } from '../lib/api'

function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function formatVisitDate(str) {
  if (!str) return ''
  const [y, m, d] = str.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })
}

function dayDiff(str) {
  if (!str) return null
  const [y, m, d] = str.split('-').map(Number)
  const visit = new Date(y, m - 1, d)
  const today = new Date()
  visit.setHours(0, 0, 0, 0)
  today.setHours(0, 0, 0, 0)
  return Math.round((today - visit) / 86400000)
}

export default function ArrivalBanner({ visit, onMarked }) {
  const today = todayStr()
  const [editing, setEditing] = useState(!visit)
  const [date, setDate] = useState(visit?.visited_on || today)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  async function handleMark() {
    setSaving(true)
    setError(null)
    try {
      const v = await markVisit(date)
      onMarked(v)
      setEditing(false)
    } catch (err) {
      setError(err.message || 'No se pudo marcar la llegada')
    } finally {
      setSaving(false)
    }
  }

  const diff = visit ? dayDiff(visit.visited_on) : null
  const diffLabel = diff === 0 ? 'Hoy' : diff === 1 ? 'Ayer' : diff > 1 ? `Hace ${diff} días` : ''

  // Estado: ya hay visita y no se está editando -> resumen compacto
  if (visit && !editing) {
    return (
      <div
        className="rounded-2xl p-4 mb-6 flex items-center gap-3"
        style={{ background: 'rgba(106,153,96,0.08)', border: '1px solid rgba(106,153,96,0.25)' }}
      >
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: 'rgba(106,153,96,0.15)', color: 'var(--moss-500)' }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-body text-[11px] font-semibold uppercase tracking-[0.1em]" style={{ color: 'var(--bark-300)' }}>
            Visita registrada {diffLabel && `· ${diffLabel}`}
          </p>
          <p className="font-body font-semibold text-[14px] capitalize truncate" style={{ color: 'var(--bark-700)' }}>
            {formatVisitDate(visit.visited_on)}
          </p>
        </div>
        <button
          onClick={() => { setDate(visit.visited_on); setEditing(true) }}
          className="px-3 py-1.5 rounded-lg font-body font-semibold text-[12px] transition-all active:scale-95 flex-shrink-0"
          style={{ color: 'var(--moss-500)', background: 'rgba(106,153,96,0.1)' }}
        >
          Cambiar
        </button>
      </div>
    )
  }

  // Estado: marcar o ajustar la fecha de la visita
  return (
    <div
      className="rounded-2xl p-4 mb-6"
      style={{ background: 'var(--surface-card)', border: '1px solid rgba(184,90,58,0.25)' }}
    >
      <div className="flex items-center gap-2 mb-2">
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: 'rgba(184,90,58,0.1)', color: 'var(--clay-500)' }}
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
        </div>
        <div>
          <h3 className="font-display text-[17px] leading-none" style={{ color: 'var(--bark-700)' }}>
            Marca tu llegada
          </h3>
        </div>
      </div>
      <p className="font-body text-[12px] mb-3 leading-relaxed" style={{ color: 'var(--bark-300)' }}>
        Las tareas que completes quedarán con la fecha de tu visita. Si registras otro día, ajusta la fecha. No puedes elegir una fecha futura.
      </p>
      <label className="font-body text-[11px] font-semibold uppercase tracking-wider mb-1.5 block" style={{ color: 'var(--bark-400)' }}>
        Fecha de la visita
      </label>
      <input
        type="date"
        value={date}
        max={today}
        onChange={e => setDate(e.target.value)}
        className="w-full px-3.5 py-2.5 rounded-xl font-body text-[16px] outline-none transition-all mb-3"
        style={{ background: 'var(--surface-elevated)', border: '1.5px solid rgba(196,184,166,0.3)', color: 'var(--bark-700)' }}
      />
      {error && (
        <p className="font-body text-[12px] mb-2" style={{ color: 'var(--clay-500)' }}>{error}</p>
      )}
      <div className="flex gap-2">
        {visit && (
          <button
            onClick={() => { setEditing(false); setError(null) }}
            className="flex-1 py-2.5 rounded-xl font-body font-semibold text-[13px] transition-all active:scale-[0.98]"
            style={{ color: 'var(--bark-400)', border: '1.5px solid rgba(196,184,166,0.3)' }}
          >
            Cancelar
          </button>
        )}
        <button
          onClick={handleMark}
          disabled={saving || !date}
          className="flex-1 py-2.5 rounded-xl font-body font-semibold text-[13px] text-white transition-all active:scale-[0.98] disabled:opacity-50"
          style={{ background: 'var(--moss-500)' }}
        >
          {saving ? 'Marcando...' : 'Marcar llegada'}
        </button>
      </div>
    </div>
  )
}
