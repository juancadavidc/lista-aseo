const API_BASE = import.meta.env.VITE_API_URL || '/api'

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || `HTTP ${res.status}`)
  }
  return res.json()
}

export async function fetchActiveTasks() {
  return request('/tasks?active=true')
}

export async function fetchAllTasks() {
  return request('/tasks')
}

export async function createTask(task) {
  return request('/tasks', { method: 'POST', body: JSON.stringify(task) })
}

export async function updateTask(id, updates) {
  return request(`/tasks/${id}`, { method: 'PATCH', body: JSON.stringify(updates) })
}

export async function deleteTask(id) {
  return request(`/tasks/${id}`, { method: 'DELETE' })
}

export async function fetchCompletions() {
  return request('/completions')
}

export async function completeTask(taskId, completedBy) {
  return request('/completions', {
    method: 'POST',
    body: JSON.stringify({ task_id: taskId, completed_at: new Date().toISOString(), completed_by: completedBy || null }),
  })
}

export async function resetTask(taskId) {
  return request(`/completions?task_id=${taskId}`, { method: 'DELETE' })
}

export async function fetchTaskHistory(taskId, limit = 10) {
  return request(`/completions/${taskId}/history?limit=${limit}`)
}

// --- Profiles ---

export async function fetchProfiles() {
  return request('/profiles')
}

export async function createProfile(profile) {
  return request('/profiles', { method: 'POST', body: JSON.stringify(profile) })
}

export async function updateProfile(id, updates) {
  return request(`/profiles/${id}`, { method: 'PATCH', body: JSON.stringify(updates) })
}

export async function deleteProfile(id) {
  return request(`/profiles/${id}`, { method: 'DELETE' })
}
