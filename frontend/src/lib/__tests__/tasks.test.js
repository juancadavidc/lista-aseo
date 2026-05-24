import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock del modulo de api para poder verificar los wrappers sin red.
vi.mock('../api', () => ({
  fetchActiveTasks: vi.fn(),
  fetchAllTasks: vi.fn(),
  createTask: vi.fn(),
  updateTask: vi.fn(),
  deleteTask: vi.fn(),
  completeTask: vi.fn(),
  resetTask: vi.fn(),
  fetchCompletions: vi.fn(),
  fetchTaskHistory: vi.fn(),
  fetchPendingTasks: vi.fn(),
}))

import * as api from '../api'
import {
  FREQUENCY_LABELS,
  FREQUENCY_DEFAULTS,
  frequencyToHours,
  isTaskPending,
  overdueLabel,
  frequencyLabel,
  fetchPendingTasks,
  completeTask,
  fetchAllTasks,
  createTask,
  updateTask,
  deleteTask,
  resetTask,
  fetchTaskHistory,
} from '../tasks'

describe('frequencyToHours', () => {
  it('convierte dias explicitos a horas', () => {
    expect(frequencyToHours('daily', 3)).toBe(72)
    expect(frequencyToHours('weekly', 7)).toBe(168)
  })

  it('usa el default cuando value es falsy', () => {
    expect(frequencyToHours('daily')).toBe(24)
    expect(frequencyToHours('weekly', 0)).toBe(7 * 24)
    expect(frequencyToHours('monthly', null)).toBe(30 * 24)
  })

  it('cae a 1 dia cuando el tipo es desconocido y no hay value', () => {
    expect(frequencyToHours('unknown')).toBe(24)
  })
})

describe('isTaskPending', () => {
  it('retorna false cuando la tarea no esta activa', () => {
    const task = { is_active: false, frequency_type: 'daily', frequency_value: 1 }
    expect(isTaskPending(task, null)).toBe(false)
  })

  it('retorna true cuando nunca se ha completado', () => {
    const task = { is_active: true, frequency_type: 'daily', frequency_value: 1 }
    expect(isTaskPending(task, null)).toBe(true)
  })

  it('retorna false si el periodo aun no vence', () => {
    const task = { is_active: true, frequency_type: 'daily', frequency_value: 2 }
    const recent = new Date(Date.now() - 1000 * 60 * 60).toISOString() // hace 1h
    expect(isTaskPending(task, recent)).toBe(false)
  })

  it('retorna true cuando el periodo ya vencio', () => {
    const task = { is_active: true, frequency_type: 'daily', frequency_value: 1 }
    const old = new Date(Date.now() - 1000 * 60 * 60 * 30).toISOString() // hace 30h
    expect(isTaskPending(task, old)).toBe(true)
  })

  it('una tarea de una sola vez nunca recurre tras completarse', () => {
    const task = { is_active: true, frequency_type: 'once', frequency_value: 1 }
    const old = new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString() // hace 30 dias
    expect(isTaskPending(task, old)).toBe(false)
  })

  it('una tarea de una sola vez sin completar esta pendiente', () => {
    const task = { is_active: true, frequency_type: 'once', frequency_value: 1 }
    expect(isTaskPending(task, null)).toBe(true)
  })
})

describe('overdueLabel', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-13T12:00:00Z'))
  })
  afterEach(() => vi.useRealTimers())

  it('dice "nunca completada" cuando no hay completion', () => {
    const task = { frequency_type: 'daily', frequency_value: 1 }
    expect(overdueLabel(task, null)).toBe('nunca completada')
  })

  it('retorna "hace poco" cuando el vencimiento es reciente', () => {
    const task = { frequency_type: 'daily', frequency_value: 1 }
    // completada hace 25h (vencio hace 1h)
    const completedAt = new Date(Date.now() - 25 * 3600 * 1000).toISOString()
    expect(overdueLabel(task, completedAt)).toBe('hace poco')
  })

  it('retorna "hace N horas" entre 2h y 23h de vencimiento', () => {
    const task = { frequency_type: 'daily', frequency_value: 1 }
    // completada hace 30h (vencio hace 6h)
    const completedAt = new Date(Date.now() - 30 * 3600 * 1000).toISOString()
    expect(overdueLabel(task, completedAt)).toBe('hace 6 horas')
  })

  it('retorna "desde ayer" para 1 dia vencido', () => {
    const task = { frequency_type: 'daily', frequency_value: 1 }
    // completada hace 48h+1h (vencio hace 25h)
    const completedAt = new Date(Date.now() - 49 * 3600 * 1000).toISOString()
    expect(overdueLabel(task, completedAt)).toBe('desde ayer')
  })

  it('retorna "hace N dias" para varios dias vencida', () => {
    const task = { frequency_type: 'daily', frequency_value: 1 }
    // completada hace 5 dias + 1h (vencio hace 4 dias + 1h)
    const completedAt = new Date(Date.now() - (5 * 24 + 1) * 3600 * 1000).toISOString()
    expect(overdueLabel(task, completedAt)).toBe('hace 4 dias')
  })
})

describe('frequencyLabel', () => {
  it('usa la etiqueta base cuando el value coincide con el default', () => {
    expect(frequencyLabel({ frequency_type: 'daily', frequency_value: 1 })).toBe('Diario')
    expect(frequencyLabel({ frequency_type: 'weekly', frequency_value: 7 })).toBe('Semanal')
    expect(frequencyLabel({ frequency_type: 'biweekly', frequency_value: 14 })).toBe('Quincenal')
    expect(frequencyLabel({ frequency_type: 'monthly', frequency_value: 30 })).toBe('Mensual')
  })

  it('dice "Cada N dias" cuando value difiere del default', () => {
    expect(frequencyLabel({ frequency_type: 'daily', frequency_value: 3 })).toBe('Cada 3 dias')
    expect(frequencyLabel({ frequency_type: 'weekly', frequency_value: 10 })).toBe('Cada 10 dias')
  })

  it('cae al string del tipo si no hay etiqueta', () => {
    expect(frequencyLabel({ frequency_type: 'custom' })).toBe('custom')
  })

  it('una sola vez siempre muestra "Única vez" sin importar el value', () => {
    expect(frequencyLabel({ frequency_type: 'once', frequency_value: 1 })).toBe('Única vez')
    expect(frequencyLabel({ frequency_type: 'once', frequency_value: 5 })).toBe('Única vez')
  })
})

describe('constantes de frecuencia', () => {
  it('FREQUENCY_LABELS incluye las frecuencias recurrentes y la de una sola vez', () => {
    expect(Object.keys(FREQUENCY_LABELS)).toEqual(['daily', 'weekly', 'biweekly', 'monthly', 'once'])
  })

  it('FREQUENCY_DEFAULTS refleja dias correctos', () => {
    expect(FREQUENCY_DEFAULTS).toEqual({ daily: 1, weekly: 7, biweekly: 14, monthly: 30, once: 1 })
  })
})

describe('wrappers de api', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetchPendingTasks mapea last_completed_at → lastCompletedAt', async () => {
    api.fetchPendingTasks.mockResolvedValue([
      { id: 't1', last_completed_at: '2026-01-01T00:00:00Z' },
      { id: 't2', last_completed_at: null },
    ])
    const out = await fetchPendingTasks()
    expect(out).toEqual([
      { id: 't1', last_completed_at: '2026-01-01T00:00:00Z', lastCompletedAt: '2026-01-01T00:00:00Z' },
      { id: 't2', last_completed_at: null, lastCompletedAt: null },
    ])
  })

  it('fetchPendingTasks maneja tareas sin last_completed_at (undefined → null)', async () => {
    api.fetchPendingTasks.mockResolvedValue([{ id: 't3' }])
    const out = await fetchPendingTasks()
    expect(out[0].lastCompletedAt).toBeNull()
  })

  it('completeTask delega a api.completeTask', async () => {
    api.completeTask.mockResolvedValue({ ok: true })
    await completeTask('t1')
    expect(api.completeTask).toHaveBeenCalledWith('t1')
  })

  it('fetchAllTasks, createTask, updateTask, deleteTask, resetTask, fetchTaskHistory delegan a api', async () => {
    api.fetchAllTasks.mockResolvedValue([])
    api.createTask.mockResolvedValue({ id: 'x' })
    api.updateTask.mockResolvedValue({})
    api.deleteTask.mockResolvedValue({})
    api.resetTask.mockResolvedValue({})
    api.fetchTaskHistory.mockResolvedValue([])

    await fetchAllTasks()
    await createTask({ name: 'nueva' })
    await updateTask('id', { name: 'actualizada' })
    await deleteTask('id')
    await resetTask('id')
    await fetchTaskHistory('id', 5)

    expect(api.fetchAllTasks).toHaveBeenCalled()
    expect(api.createTask).toHaveBeenCalledWith({ name: 'nueva' })
    expect(api.updateTask).toHaveBeenCalledWith('id', { name: 'actualizada' })
    expect(api.deleteTask).toHaveBeenCalledWith('id')
    expect(api.resetTask).toHaveBeenCalledWith('id')
    expect(api.fetchTaskHistory).toHaveBeenCalledWith('id', 5)
  })

  it('fetchTaskHistory usa limit=10 por defecto', async () => {
    api.fetchTaskHistory.mockResolvedValue([])
    await fetchTaskHistory('id')
    expect(api.fetchTaskHistory).toHaveBeenCalledWith('id', 10)
  })
})
