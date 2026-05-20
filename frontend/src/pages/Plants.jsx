import { useState, useEffect, useMemo, useCallback } from 'react'
import { createPortal } from 'react-dom'
import {
  fetchPlants, createPlant, updatePlant, deletePlant, waterPlant, fetchPlantHistory,
} from '../lib/api'
import SearchInput from '../components/SearchInput'

function wateringStatus(plant) {
  if (!plant.last_watered_at) return { key: 'pending', label: 'Sin regar' }
  const last = new Date(plant.last_watered_at).getTime()
  const next = last + plant.watering_frequency_days * 24 * 3600 * 1000
  const days = Math.ceil((next - Date.now()) / (24 * 3600 * 1000))

  if (days < 0) {
    const overdue = Math.abs(days)
    return { key: 'overdue', label: overdue === 1 ? 'Vencido hace 1 dia' : `Vencido hace ${overdue} dias` }
  }
  if (days === 0) return { key: 'due', label: 'Regar hoy' }
  if (days === 1) return { key: 'soon', label: 'Regar manana' }
  return { key: 'ok', label: `Faltan ${days} dias` }
}

const STATUS_STYLES = {
  pending:  { stripe: 'var(--clay-500)',     bg: 'rgba(184,90,58,0.1)',  color: 'var(--clay-500)' },
  overdue:  { stripe: '#9e4a2e',             bg: 'rgba(158,74,46,0.1)',  color: '#9e4a2e' },
  due:      { stripe: 'var(--clay-500)',     bg: 'rgba(184,90,58,0.1)',  color: 'var(--clay-500)' },
  soon:     { stripe: '#d4944c',             bg: 'rgba(212,148,76,0.1)', color: '#b87d3a' },
  ok:       { stripe: 'var(--moss-400)',     bg: 'rgba(106,153,96,0.1)', color: 'var(--moss-500)' },
}

const STATUS_ORDER = { overdue: 0, due: 1, pending: 2, soon: 3, ok: 4 }

const SORT_OPTIONS = [
  { value: 'urgency', label: 'Urgencia' },
  { value: 'name',    label: 'Nombre (A-Z)' },
]

export default function Plants() {
  const [plants, setPlants] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [deletingId, setDeletingId] = useState(null)
  const [toast, setToast] = useState(null)
  const [historyPlant, setHistoryPlant] = useState(null)
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState('urgency')

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const load = useCallback(async () => {
    try {
      setError(null)
      const data = await fetchPlants()
      setPlants(data)
    } catch {
      setError('No se pudo cargar la lista de plantas.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function handleSave(payload) {
    try {
      if (editing) {
        await updatePlant(editing.id, payload)
        showToast('Planta actualizada')
      } else {
        await createPlant(payload)
        showToast('Planta agregada')
      }
      setShowForm(false)
      setEditing(null)
      load()
    } catch {
      showToast('Error al guardar', 'error')
    }
  }

  async function handleDelete(plant) {
    if (deletingId === plant.id) {
      try {
        await deletePlant(plant.id)
        showToast('Planta eliminada', 'warning')
        load()
      } catch { showToast('Error al eliminar', 'error') }
      finally { setDeletingId(null) }
    } else {
      setDeletingId(plant.id)
      setTimeout(() => setDeletingId(null), 3000)
    }
  }

  async function handleWater(plant) {
    try {
      await waterPlant(plant.id)
      showToast(`"${plant.name}" regada`)
      load()
    } catch { showToast('Error al registrar riego', 'error') }
  }

  function openEdit(plant) { setEditing(plant); setShowForm(true) }
  function openCreate() { setEditing(null); setShowForm(true) }

  const needsWaterCount = plants.filter(p => {
    const s = wateringStatus(p).key
    return s === 'overdue' || s === 'due' || s === 'pending'
  }).length

  const visiblePlants = useMemo(() => {
    const q = query.trim().toLowerCase()
    const filtered = q
      ? plants.filter(p =>
          (p.name || '').toLowerCase().includes(q) ||
          (p.notes || '').toLowerCase().includes(q)
        )
      : plants.slice()
    if (sort === 'name') {
      filtered.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'es', { sensitivity: 'base' }))
    } else {
      filtered.sort((a, b) => {
        const sa = STATUS_ORDER[wateringStatus(a).key]
        const sb = STATUS_ORDER[wateringStatus(b).key]
        if (sa !== sb) return sa - sb
        return (a.name || '').localeCompare(b.name || '', 'es', { sensitivity: 'base' })
      })
    }
    return filtered
  }, [plants, query, sort])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 fade-in">
        <div className="w-10 h-10 rounded-full border-[3px] border-t-transparent animate-spin" style={{ borderColor: 'rgba(106,153,96,0.2)', borderTopColor: 'transparent' }} />
        <p className="font-body text-sm font-medium" style={{ color: 'var(--bark-300)' }}>Cargando plantas...</p>
      </div>
    )
  }

  return (
    <div className="fade-in">
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

      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="font-body text-[11px] font-semibold uppercase tracking-[0.1em] mb-1.5" style={{ color: 'var(--bark-300)' }}>
            Hogar
          </p>
          <h2 className="font-display text-[28px] leading-none" style={{ color: 'var(--bark-700)' }}>
            Plantas
          </h2>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-body font-semibold text-[13px] text-white transition-all active:scale-95"
          style={{ background: 'var(--moss-500)', boxShadow: '0 2px 8px rgba(77,122,68,0.25)' }}
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

      <div className="grid grid-cols-2 gap-2 mb-5">
        <div className="rounded-xl px-3 py-3 text-center" style={{ background: 'var(--surface-card)', border: '1px solid rgba(196,184,166,0.25)' }}>
          <div className="font-display text-xl leading-none mb-0.5" style={{ color: 'var(--bark-700)' }}>{plants.length}</div>
          <div className="font-body text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--bark-300)' }}>Total</div>
        </div>
        <div className="rounded-xl px-3 py-3 text-center" style={{ background: 'rgba(184,90,58,0.06)', border: '1px solid rgba(184,90,58,0.15)' }}>
          <div className="font-display text-xl leading-none mb-0.5" style={{ color: 'var(--clay-500)' }}>{needsWaterCount}</div>
          <div className="font-body text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--bark-300)' }}>Necesitan riego</div>
        </div>
      </div>

      {plants.length >= 4 && (
        <div className="flex gap-2 mb-5">
          <div className="flex-1 min-w-0">
            <SearchInput
              value={query}
              onChange={setQuery}
              placeholder="Buscar planta..."
            />
          </div>
          <div className="relative flex-shrink-0">
            <select
              value={sort}
              onChange={e => setSort(e.target.value)}
              aria-label="Ordenar"
              className="appearance-none pl-8 pr-7 py-2.5 rounded-xl font-body text-[16px] font-semibold outline-none transition-all cursor-pointer"
              style={{
                background: 'var(--surface-elevated)',
                border: '1.5px solid rgba(196,184,166,0.3)',
                color: 'var(--bark-700)',
              }}
              onFocus={e => e.target.style.borderColor = 'var(--moss-400)'}
              onBlur={e => e.target.style.borderColor = 'rgba(196,184,166,0.3)'}
            >
              {SORT_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--bark-400)' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M3 6h18M7 12h10M11 18h2"/>
              </svg>
            </span>
            <span className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--bark-300)' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                <path d="M6 9l6 6 6-6"/>
              </svg>
            </span>
          </div>
        </div>
      )}

      {plants.length === 0 ? (
        <div className="text-center py-12 fade-in">
          <div className="w-14 h-14 mx-auto mb-4 rounded-2xl flex items-center justify-center text-2xl" style={{ background: 'rgba(106,153,96,0.1)' }}>
            🌱
          </div>
          <p className="font-display text-xl mb-1" style={{ color: 'var(--bark-700)' }}>Sin plantas</p>
          <p className="font-body text-sm mb-5" style={{ color: 'var(--bark-300)' }}>Agrega plantas para llevar el control del riego</p>
          <button onClick={openCreate} className="px-5 py-2.5 rounded-xl font-body font-semibold text-[13px] text-white" style={{ background: 'var(--moss-500)' }}>
            Agregar primera planta
          </button>
        </div>
      ) : visiblePlants.length === 0 ? (
        <div className="text-center py-10 fade-in">
          <p className="font-body font-semibold text-[14px]" style={{ color: 'var(--bark-400)' }}>
            Sin resultados para "{query}"
          </p>
          <p className="font-body text-[12px] mt-0.5" style={{ color: 'var(--bark-300)' }}>
            Probá con otro nombre
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5 stagger">
          {visiblePlants.map(plant => (
            <PlantCard
              key={plant.id}
              plant={plant}
              deletingId={deletingId}
              onEdit={openEdit}
              onDelete={handleDelete}
              onWater={handleWater}
              onShowHistory={setHistoryPlant}
            />
          ))}
        </div>
      )}

      {showForm && createPortal(
        <div
          className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4 modal-backdrop"
          onClick={() => { setShowForm(false); setEditing(null) }}
        >
          <div
            className="w-full max-w-lg rounded-t-2xl sm:rounded-2xl p-5 max-h-[92dvh] overflow-y-auto fade-in"
            style={{ background: 'var(--surface-card)', border: '1px solid rgba(196,184,166,0.25)' }}
            onClick={e => e.stopPropagation()}
          >
            <h3 className="font-display text-xl mb-5" style={{ color: 'var(--bark-700)' }}>
              {editing ? 'Editar planta' : 'Nueva planta'}
            </h3>
            <PlantForm
              plant={editing}
              onSave={handleSave}
              onCancel={() => { setShowForm(false); setEditing(null) }}
            />
          </div>
        </div>,
        document.body
      )}

      {historyPlant && createPortal(
        <PlantHistoryModal plant={historyPlant} onClose={() => setHistoryPlant(null)} />,
        document.body
      )}
    </div>
  )
}

function PlantCard({ plant, deletingId, onEdit, onDelete, onWater, onShowHistory }) {
  const isDeleting = deletingId === plant.id
  const status = wateringStatus(plant)
  const styles = STATUS_STYLES[status.key]

  return (
    <div
      className="rounded-xl overflow-hidden task-enter relative"
      style={{
        background: 'var(--surface-card)',
        border: '1px solid rgba(196,184,166,0.25)',
        boxShadow: '0 1px 3px rgba(26,22,20,0.04)',
      }}
    >
      <div
        className="absolute left-0 top-0 bottom-0 w-[3px]"
        style={{ background: styles.stripe, borderRadius: '3px 0 0 3px' }}
      />

      <div className="pl-5 pr-3 pt-3.5 pb-3">
        <div className="flex items-start gap-2.5">
          <div className="mt-0.5 flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-sm"
            style={{ background: 'rgba(106,153,96,0.12)' }}>
            🌿
          </div>

          <div className="flex-1 min-w-0">
            <h4 className="font-body font-semibold text-[14px] leading-tight" style={{ color: 'var(--bark-700)' }}>
              {plant.name}
            </h4>

            {plant.notes && (
              <p className="font-body text-[12px] mt-0.5" style={{ color: 'var(--bark-400)' }}>
                {plant.notes}
              </p>
            )}

            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
              <span
                className="freq-badge"
                style={{ background: styles.bg, color: styles.color }}
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                  <path d="M12 2.69l5.66 5.66a8 8 0 11-11.31 0z"/>
                </svg>
                {status.label}
              </span>

              <span
                className="freq-badge"
                style={{ background: 'rgba(106,153,96,0.1)', color: 'var(--moss-500)' }}
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                  <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>
                </svg>
                Cada {plant.watering_frequency_days}d
              </span>
            </div>
          </div>
        </div>
      </div>

      <div
        className="flex items-center justify-end gap-0.5 px-2 pb-2 pt-0.5"
        style={{ borderTop: '1px solid rgba(196,184,166,0.12)' }}
      >
        <ActionBtn onClick={() => onWater(plant)} title="Regué esta planta">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--moss-500)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2.69l5.66 5.66a8 8 0 11-11.31 0z"/>
          </svg>
        </ActionBtn>

        <ActionBtn onClick={() => onShowHistory(plant)} title="Historial">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/>
          </svg>
        </ActionBtn>

        <ActionBtn onClick={() => onEdit(plant)} title="Editar">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
        </ActionBtn>

        <ActionBtn
          onClick={() => onDelete(plant)}
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
        </ActionBtn>
      </div>
    </div>
  )
}

function ActionBtn({ onClick, title, disabled, danger, children }) {
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

function PlantForm({ plant, onSave, onCancel }) {
  const [name, setName] = useState(plant?.name || '')
  const [notes, setNotes] = useState(plant?.notes || '')
  const [frequencyDays, setFrequencyDays] = useState(plant?.watering_frequency_days || 7)

  function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim()) return
    onSave({
      name: name.trim(),
      notes: notes.trim() || null,
      watering_frequency_days: Math.max(1, parseInt(frequencyDays) || 7),
    })
  }

  const freqPresets = [
    { label: 'Diario', value: 1 },
    { label: 'Cada 3 dias', value: 3 },
    { label: 'Semanal', value: 7 },
    { label: 'Quincenal', value: 14 },
  ]

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <label className="block font-body text-[12px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--bark-300)' }}>
          Nombre
        </label>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Ej: Monstera del salon"
          required
          className="w-full px-3.5 py-2.5 rounded-xl font-body text-[16px] outline-none transition-all"
          style={{
            background: 'var(--surface-elevated)',
            border: '1.5px solid rgba(196,184,166,0.3)',
            color: 'var(--bark-700)',
          }}
          onFocus={e => e.target.style.borderColor = 'var(--moss-400)'}
          onBlur={e => e.target.style.borderColor = 'rgba(196,184,166,0.3)'}
        />
      </div>

      <div>
        <label className="block font-body text-[12px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--bark-300)' }}>
          Notas (opcional)
        </label>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Ubicacion, especie, cuidados especiales..."
          rows={2}
          className="w-full px-3.5 py-2.5 rounded-xl font-body text-[16px] outline-none transition-all resize-none"
          style={{
            background: 'var(--surface-elevated)',
            border: '1.5px solid rgba(196,184,166,0.3)',
            color: 'var(--bark-700)',
          }}
          onFocus={e => e.target.style.borderColor = 'var(--moss-400)'}
          onBlur={e => e.target.style.borderColor = 'rgba(196,184,166,0.3)'}
        />
      </div>

      <div>
        <label className="block font-body text-[12px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--bark-300)' }}>
          Frecuencia de riego
        </label>
        <div className="flex gap-2 flex-wrap mb-2">
          {freqPresets.map(preset => (
            <button
              key={preset.value}
              type="button"
              onClick={() => setFrequencyDays(preset.value)}
              className="px-3 py-2 rounded-xl font-body text-[13px] font-medium transition-all"
              style={{
                background: frequencyDays === preset.value ? 'var(--moss-400)' : 'var(--surface-elevated)',
                color: frequencyDays === preset.value ? 'white' : 'var(--bark-400)',
                border: frequencyDays === preset.value ? 'none' : '1.5px solid rgba(196,184,166,0.3)',
              }}
            >
              {preset.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min="1"
            max="365"
            value={frequencyDays}
            onChange={e => setFrequencyDays(e.target.value)}
            className="w-20 px-3 py-2 rounded-xl font-body text-[16px] text-center outline-none"
            style={{
              background: 'var(--surface-elevated)',
              border: '1.5px solid rgba(196,184,166,0.3)',
              color: 'var(--bark-700)',
            }}
          />
          <span className="font-body text-[13px]" style={{ color: 'var(--bark-300)' }}>dias entre riegos</span>
        </div>
      </div>

      <div className="flex gap-2 mt-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 px-4 py-2.5 rounded-xl font-body font-semibold text-[13px] transition-all"
          style={{ color: 'var(--bark-400)', border: '1.5px solid rgba(196,184,166,0.3)' }}
        >
          Cancelar
        </button>
        <button
          type="submit"
          className="flex-1 px-4 py-2.5 rounded-xl font-body font-semibold text-[13px] text-white transition-all active:scale-[0.98]"
          style={{ background: 'var(--moss-500)', boxShadow: '0 2px 8px rgba(77,122,68,0.25)' }}
        >
          {plant ? 'Guardar' : 'Agregar'}
        </button>
      </div>
    </form>
  )
}

function PlantHistoryModal({ plant, onClose }) {
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPlantHistory(plant.id, 20)
      .then(setHistory)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [plant.id])

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4 modal-backdrop"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-t-2xl sm:rounded-2xl p-5 max-h-[80dvh] overflow-y-auto fade-in"
        style={{ background: 'var(--surface-card)', border: '1px solid rgba(196,184,166,0.25)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-display text-lg" style={{ color: 'var(--bark-700)' }}>
              Historial de riego
            </h3>
            <p className="font-body text-[12px] font-medium" style={{ color: 'var(--bark-300)' }}>{plant.name}</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
            style={{ background: 'rgba(196,184,166,0.15)' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--bark-400)" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="w-8 h-8 rounded-full border-[3px] border-t-transparent animate-spin" style={{ borderColor: 'var(--moss-200)', borderTopColor: 'transparent' }} />
          </div>
        ) : history.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-12 h-12 mx-auto mb-3 rounded-xl flex items-center justify-center" style={{ background: 'rgba(196,184,166,0.1)' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--bark-300)" strokeWidth="2" strokeLinecap="round">
                <circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/>
              </svg>
            </div>
            <p className="font-body text-sm" style={{ color: 'var(--bark-300)' }}>Aun no se ha regado</p>
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            {history.map((item, i) => (
              <div
                key={item.id}
                className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl fade-in"
                style={{
                  background: i === 0 ? 'rgba(106,153,96,0.06)' : 'var(--surface-elevated)',
                  border: '1px solid',
                  borderColor: i === 0 ? 'rgba(106,153,96,0.15)' : 'rgba(196,184,166,0.15)',
                  animationDelay: `${i * 0.04}s`,
                  opacity: 0,
                  animationFillMode: 'forwards',
                }}
              >
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: i === 0 ? 'var(--moss-400)' : 'rgba(196,184,166,0.12)' }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={i === 0 ? 'white' : 'var(--bark-300)'} strokeWidth="2.2" strokeLinecap="round">
                    <path d="M12 2.69l5.66 5.66a8 8 0 11-11.31 0z"/>
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="font-body text-[13px] font-medium" style={{ color: 'var(--bark-700)' }}>
                    {new Date(item.watered_at).toLocaleDateString('es-ES', {
                      weekday: 'long', day: 'numeric', month: 'long',
                    })}
                  </p>
                  <p className="font-body text-[11px]" style={{ color: 'var(--bark-300)' }}>
                    {new Date(item.watered_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                    {item.watered_by && (
                      <span className="ml-1.5 font-semibold" style={{ color: 'var(--bark-500)' }}>
                        &middot; {item.watered_by}
                      </span>
                    )}
                    {i === 0 && <span className="ml-1.5 font-semibold" style={{ color: 'var(--moss-500)' }}>reciente</span>}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
