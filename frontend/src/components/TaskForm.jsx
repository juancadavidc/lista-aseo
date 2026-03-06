import { useState, useEffect } from 'react'
import { FREQUENCY_LABELS, FREQUENCY_DEFAULTS } from '../lib/tasks'

const FREQ_ICONS = {
  daily: '☀️',
  weekly: '📅',
  biweekly: '📆',
  monthly: '🗓️',
}

const DEFAULT_FORM = {
  name: '',
  description: '',
  frequency_type: 'daily',
  frequency_value: '',
  is_active: true,
}

export default function TaskForm({ task, onSave, onCancel }) {
  const [form, setForm] = useState(DEFAULT_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (task) {
      setForm({
        name: task.name || '',
        description: task.description || '',
        frequency_type: task.frequency_type || 'daily',
        frequency_value: task.frequency_value !== null && task.frequency_value !== undefined ? String(task.frequency_value) : '',
        is_active: task.is_active ?? true,
      })
    } else {
      setForm(DEFAULT_FORM)
    }
  }, [task])

  function set(field, value) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim()) { setError('El nombre es obligatorio'); return }
    setSaving(true)
    setError(null)
    try {
      await onSave({
        name: form.name.trim(),
        description: form.description.trim() || null,
        frequency_type: form.frequency_type,
        frequency_value: form.frequency_value ? parseInt(form.frequency_value) : FREQUENCY_DEFAULTS[form.frequency_type],
        is_active: form.is_active,
      })
    } catch (err) {
      setError('Error al guardar: ' + err.message)
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <label className="block font-body font-semibold text-[12px] uppercase tracking-wider mb-1.5" style={{ color: 'var(--bark-400)' }}>
          Nombre *
        </label>
        <input
          type="text"
          value={form.name}
          onChange={e => set('name', e.target.value)}
          placeholder="ej: Barrer la cocina"
          className="w-full px-3.5 py-2.5 rounded-xl font-body text-[14px] focus:outline-none transition-all"
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
        <label className="block font-body font-semibold text-[12px] uppercase tracking-wider mb-1.5" style={{ color: 'var(--bark-400)' }}>
          Descripcion <span style={{ color: 'var(--bark-300)', fontWeight: 400, textTransform: 'none' }}>(opcional)</span>
        </label>
        <textarea
          value={form.description}
          onChange={e => set('description', e.target.value)}
          placeholder="Instrucciones adicionales..."
          rows={2}
          className="w-full px-3.5 py-2.5 rounded-xl font-body text-[14px] focus:outline-none resize-none transition-all"
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
        <label className="block font-body font-semibold text-[12px] uppercase tracking-wider mb-1.5" style={{ color: 'var(--bark-400)' }}>
          Frecuencia
        </label>
        <div className="grid grid-cols-4 gap-1.5">
          {Object.entries(FREQUENCY_LABELS).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => { set('frequency_type', value); set('frequency_value', '') }}
              className="py-2.5 px-2 rounded-xl font-body font-medium text-[12px] transition-all active:scale-95 flex flex-col items-center gap-1"
              style={{
                background: form.frequency_type === value ? 'var(--moss-400)' : 'var(--surface-elevated)',
                color: form.frequency_type === value ? 'white' : 'var(--bark-400)',
                border: `1.5px solid ${form.frequency_type === value ? 'var(--moss-400)' : 'rgba(196,184,166,0.3)'}`,
              }}
            >
              <span className="text-base">{FREQ_ICONS[value]}</span>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block font-body font-semibold text-[12px] uppercase tracking-wider mb-1.5" style={{ color: 'var(--bark-400)' }}>
          Dias <span style={{ color: 'var(--bark-300)', fontWeight: 400, textTransform: 'none' }}>(default: {FREQUENCY_DEFAULTS[form.frequency_type]})</span>
        </label>
        <input
          type="number"
          value={form.frequency_value}
          onChange={e => set('frequency_value', e.target.value)}
          placeholder={`${FREQUENCY_DEFAULTS[form.frequency_type]}`}
          min={1}
          max={365}
          className="w-full px-3.5 py-2.5 rounded-xl font-body text-[14px] focus:outline-none"
          style={{
            background: 'var(--surface-elevated)',
            border: '1.5px solid rgba(196,184,166,0.3)',
            color: 'var(--bark-700)',
          }}
          onFocus={e => e.target.style.borderColor = 'var(--moss-400)'}
          onBlur={e => e.target.style.borderColor = 'rgba(196,184,166,0.3)'}
        />
      </div>

      {/* Active toggle */}
      <div
        className="flex items-center justify-between px-3.5 py-3 rounded-xl cursor-pointer"
        style={{ background: 'var(--surface-elevated)', border: '1.5px solid rgba(196,184,166,0.3)' }}
        onClick={() => set('is_active', !form.is_active)}
      >
        <div>
          <p className="font-body font-semibold text-[13px]" style={{ color: 'var(--bark-700)' }}>Tarea activa</p>
          <p className="font-body text-[11px]" style={{ color: 'var(--bark-300)' }}>Solo las activas aparecen en la lista</p>
        </div>
        <div
          className="relative w-11 h-6 rounded-full transition-colors duration-200 flex-shrink-0"
          style={{ background: form.is_active ? 'var(--moss-400)' : 'var(--bark-200)' }}
        >
          <div
            className="absolute top-[3px] w-[18px] h-[18px] rounded-full bg-white shadow-sm transition-all duration-200"
            style={{ left: form.is_active ? '23px' : '3px' }}
          />
        </div>
      </div>

      {error && (
        <div className="px-3.5 py-2.5 rounded-xl text-[13px] font-body" style={{ background: 'rgba(184,90,58,0.06)', color: 'var(--clay-500)', border: '1px solid rgba(184,90,58,0.15)' }}>
          {error}
        </div>
      )}

      <div className="flex gap-2.5 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-2.5 rounded-xl font-body font-semibold text-[13px] transition-all active:scale-95"
          style={{ background: 'transparent', color: 'var(--bark-400)', border: '1.5px solid rgba(196,184,166,0.3)' }}
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={saving}
          className="flex-1 py-2.5 rounded-xl font-body font-semibold text-[13px] text-white transition-all active:scale-95 disabled:opacity-60"
          style={{ background: 'var(--moss-400)', boxShadow: '0 2px 8px rgba(106,153,96,0.2)' }}
        >
          {saving ? 'Guardando...' : task ? 'Actualizar' : 'Crear'}
        </button>
      </div>
    </form>
  )
}
