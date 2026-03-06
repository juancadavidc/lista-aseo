import {
  fetchActiveTasks, fetchAllTasks as apiFetchAllTasks,
  createTask as apiCreateTask, updateTask as apiUpdateTask,
  deleteTask as apiDeleteTask, completeTask as apiCompleteTask,
  resetTask as apiResetTask, fetchCompletions, fetchTaskHistory as apiFetchTaskHistory,
} from './api'

// --- Frequency helpers ---

export const FREQUENCY_LABELS = {
  daily: 'Diario',
  weekly: 'Semanal',
  biweekly: 'Quincenal',
  monthly: 'Mensual',
}

export const FREQUENCY_DEFAULTS = {
  daily: 1,
  weekly: 7,
  biweekly: 14,
  monthly: 30,
}

export function frequencyToHours(type, value) {
  const days = value || FREQUENCY_DEFAULTS[type] || 1
  return days * 24
}

export function isTaskPending(task, lastCompletedAt) {
  if (!task.is_active) return false
  if (!lastCompletedAt) return true

  const hours = frequencyToHours(task.frequency_type, task.frequency_value)
  const nextDue = new Date(lastCompletedAt).getTime() + hours * 3600 * 1000
  return Date.now() >= nextDue
}

export function overdueLabel(task, lastCompletedAt) {
  if (!lastCompletedAt) return 'nunca completada'

  const hours = frequencyToHours(task.frequency_type, task.frequency_value)
  const dueSince = Date.now() - (new Date(lastCompletedAt).getTime() + hours * 3600 * 1000)
  const h = Math.floor(dueSince / 3600000)
  const d = Math.floor(h / 24)

  if (d >= 2) return `hace ${d} días`
  if (d === 1) return `desde ayer`
  if (h >= 2) return `hace ${h} horas`
  return `hace poco`
}

export function frequencyLabel(task) {
  const base = FREQUENCY_LABELS[task.frequency_type] || task.frequency_type
  if (task.frequency_value && task.frequency_value !== FREQUENCY_DEFAULTS[task.frequency_type]) {
    return `Cada ${task.frequency_value} días`
  }
  return base
}

// --- API queries ---

export async function fetchPendingTasks() {
  const [tasks, completions] = await Promise.all([
    fetchActiveTasks(),
    fetchCompletions(),
  ])

  const lastCompletion = {}
  for (const c of completions) {
    if (!lastCompletion[c.task_id]) {
      lastCompletion[c.task_id] = c.completed_at
    }
  }

  return tasks
    .filter(t => isTaskPending(t, lastCompletion[t.id]))
    .map(t => ({ ...t, lastCompletedAt: lastCompletion[t.id] || null }))
}

export async function completeTask(taskId, completedBy) {
  return apiCompleteTask(taskId, completedBy)
}

export async function fetchAllTasks() {
  return apiFetchAllTasks()
}

export async function createTask(task) {
  return apiCreateTask(task)
}

export async function updateTask(id, updates) {
  return apiUpdateTask(id, updates)
}

export async function deleteTask(id) {
  return apiDeleteTask(id)
}

export async function resetTask(taskId) {
  return apiResetTask(taskId)
}

export async function fetchTaskHistory(taskId, limit = 10) {
  return apiFetchTaskHistory(taskId, limit)
}
