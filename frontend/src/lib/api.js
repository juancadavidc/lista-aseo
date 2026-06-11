import { getActiveHouse } from './house'

const API_BASE = import.meta.env.VITE_API_URL || '/api'

async function request(path, options = {}) {
  const house = getActiveHouse()
  const headers = {
    'Content-Type': 'application/json',
    ...(house ? { 'x-house-id': house.id } : {}),
    ...options.headers,
  }

  const res = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    headers,
    ...options,
  })

  if (res.status === 401) {
    window.location.hash = '#/login'
    throw new Error('Sesion expirada')
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || `HTTP ${res.status}`)
  }
  return res.json()
}

// --- Tasks ---

export async function fetchActiveTasks() {
  return request('/tasks?active=true')
}

export async function fetchPendingTasks() {
  return request('/tasks/pending')
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

// --- Completions ---

export async function fetchCompletions() {
  return request('/completions')
}

export async function completeTask(taskId) {
  return request('/completions', {
    method: 'POST',
    body: JSON.stringify({ task_id: taskId, completed_at: new Date().toISOString() }),
  })
}

export async function resetTask(taskId) {
  return request(`/tasks/${taskId}/reset`, { method: 'POST' })
}

export async function fetchTaskHistory(taskId, limit = 10) {
  return request(`/completions/${taskId}/history?limit=${limit}`)
}

// --- Visitas (rol externo) ---

export async function fetchActiveVisit() {
  return request('/visits/active')
}

export async function markVisit(visited_on) {
  return request('/visits', { method: 'POST', body: JSON.stringify({ visited_on }) })
}

// --- Product images ---

export async function uploadProductImage(file) {
  const house = getActiveHouse()
  const formData = new FormData()
  formData.append('image', file)
  const res = await fetch(`${API_BASE}/uploads`, {
    method: 'POST',
    credentials: 'include',
    headers: house ? { 'x-house-id': house.id } : {},
    body: formData,
  })
  if (res.status === 401) {
    window.location.hash = '#/login'
    throw new Error('Sesion expirada')
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || `HTTP ${res.status}`)
  }
  return res.json()
}

export async function deleteProductImage(filename) {
  return request(`/uploads/${filename}`, { method: 'DELETE' })
}

export function getImageUrl(filename) {
  if (!filename) return null
  return `${API_BASE}/uploads/${filename}`
}

// --- Products ---

export async function fetchProducts(category) {
  const params = category ? `?category=${encodeURIComponent(category)}` : ''
  return request(`/products${params}`)
}

export async function fetchOutOfStockProducts() {
  return request('/products?out_of_stock=true')
}

export async function createProduct(product) {
  return request('/products', { method: 'POST', body: JSON.stringify(product) })
}

export async function updateProduct(id, updates) {
  return request(`/products/${id}`, { method: 'PATCH', body: JSON.stringify(updates) })
}

export async function purchaseProduct(id) {
  return request(`/products/${id}/purchase`, { method: 'POST' })
}

export async function deleteProduct(id) {
  return request(`/products/${id}`, { method: 'DELETE' })
}

// --- Shopping Categories ---

export async function fetchShoppingCategories() {
  return request('/shopping-categories')
}

export async function createShoppingCategory(category) {
  return request('/shopping-categories', { method: 'POST', body: JSON.stringify(category) })
}

export async function updateShoppingCategory(id, updates) {
  return request(`/shopping-categories/${id}`, { method: 'PATCH', body: JSON.stringify(updates) })
}

export async function deleteShoppingCategory(id) {
  return request(`/shopping-categories/${id}`, { method: 'DELETE' })
}

// --- Shopping List ---

export async function fetchShoppingItems() {
  return request('/shopping-items')
}

export async function createShoppingItem(item) {
  return request('/shopping-items', { method: 'POST', body: JSON.stringify(item) })
}

export async function updateShoppingItem(id, updates) {
  return request(`/shopping-items/${id}`, { method: 'PATCH', body: JSON.stringify(updates) })
}

export async function deleteShoppingItem(id) {
  return request(`/shopping-items/${id}`, { method: 'DELETE' })
}

export async function clearPurchasedItems() {
  return request('/shopping-items/clear-purchased', { method: 'DELETE' })
}

export async function fetchShoppingHistory(limit = 100) {
  return request(`/shopping-items/history?limit=${limit}`)
}

export async function fetchShoppingRecommendations() {
  return request('/shopping-items/recommendations')
}

// --- Plants ---

export async function fetchPlants() {
  return request('/plants')
}

export async function createPlant(plant) {
  return request('/plants', { method: 'POST', body: JSON.stringify(plant) })
}

export async function updatePlant(id, updates) {
  return request(`/plants/${id}`, { method: 'PATCH', body: JSON.stringify(updates) })
}

export async function deletePlant(id) {
  return request(`/plants/${id}`, { method: 'DELETE' })
}

export async function waterPlant(id) {
  return request(`/plants/${id}/water`, { method: 'POST' })
}

export async function fetchPlantHistory(id, limit = 20) {
  return request(`/plants/${id}/history?limit=${limit}`)
}

// --- Stats ---

export async function fetchParticipationStats(period = 'month') {
  return request(`/stats/participation?period=${period}`)
}

// --- Push Notifications ---

export async function fetchVapidKey() {
  return request('/push/vapid-key')
}

export async function subscribePush(subscription) {
  return request('/push/subscribe', { method: 'POST', body: JSON.stringify({ subscription }) })
}

export async function unsubscribePush(endpoint) {
  return request('/push/subscribe', { method: 'DELETE', body: JSON.stringify({ endpoint }) })
}

export async function fetchPushStatus() {
  return request('/push/status')
}

// --- Super Admin ---

export async function checkSuperAdmin() {
  return request('/super-admin/check')
}

export async function fetchSuperAdminStats() {
  return request('/super-admin/stats')
}

// --- House ---

export async function fetchHouseMembers() {
  return request('/houses/members')
}

export async function setMemberType(userId, member_type) {
  return request(`/houses/members/${userId}/type`, { method: 'PATCH', body: JSON.stringify({ member_type }) })
}

export async function fetchHouseProfile() {
  return request('/houses/profile')
}

export async function updateHouseProfile(data) {
  return request('/houses/profile', { method: 'PUT', body: JSON.stringify(data) })
}

export async function seedHouse(template = 'small', tasks = null) {
  const body = { template }
  if (tasks) body.tasks = tasks
  return request('/houses/seed', { method: 'POST', body: JSON.stringify(body) })
}

export async function deleteHouse(houseId) {
  return request(`/houses/${houseId}`, { method: 'DELETE' })
}

// --- Invitations ---

export async function fetchInvitations() {
  return request('/invitations')
}

export async function deleteInvitation(id) {
  return request(`/invitations/${id}`, { method: 'DELETE' })
}

export async function renewInvitation(id) {
  return request(`/invitations/${id}/renew`, { method: 'POST' })
}
