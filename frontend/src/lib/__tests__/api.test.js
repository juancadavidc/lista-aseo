import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock house.js antes de importar api para que el header x-house-id sea determinista.
vi.mock('../house', () => ({
  getActiveHouse: vi.fn(() => ({ id: 'house-test' })),
}))

import * as api from '../api'
import * as house from '../house'

function mockFetchJSON(payload, { status = 200, ok = true } = {}) {
  return vi.fn().mockResolvedValue({
    status,
    ok,
    json: async () => payload,
  })
}

describe('api.js — request() (via fetchActiveTasks)', () => {
  let originalHash

  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetchJSON([]))
    originalHash = window.location.hash
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    window.location.hash = originalHash
  })

  it('agrega header x-house-id cuando hay casa activa', async () => {
    await api.fetchActiveTasks()
    const call = fetch.mock.calls[0]
    expect(call[0]).toContain('/tasks?active=true')
    expect(call[1].headers['x-house-id']).toBe('house-test')
    expect(call[1].headers['Content-Type']).toBe('application/json')
    expect(call[1].credentials).toBe('include')
  })

  it('no manda x-house-id cuando no hay casa activa', async () => {
    house.getActiveHouse.mockReturnValueOnce(null)
    await api.fetchActiveTasks()
    const headers = fetch.mock.calls[0][1].headers
    expect(headers['x-house-id']).toBeUndefined()
  })

  it('redirige a #/login y lanza error en 401', async () => {
    vi.stubGlobal('fetch', mockFetchJSON({}, { status: 401, ok: false }))
    await expect(api.fetchActiveTasks()).rejects.toThrow('Sesion expirada')
    expect(window.location.hash).toBe('#/login')
  })

  it('lanza error con mensaje del body cuando la respuesta no es ok', async () => {
    vi.stubGlobal('fetch', mockFetchJSON({ error: 'No permitido' }, { status: 403, ok: false }))
    await expect(api.fetchActiveTasks()).rejects.toThrow('No permitido')
  })

  it('lanza error con HTTP <status> cuando no hay body.error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        status: 500,
        ok: false,
        json: async () => { throw new Error('not json') },
      })
    )
    await expect(api.fetchActiveTasks()).rejects.toThrow('HTTP 500')
  })
})

describe('api.js — wrappers de tareas/completions', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetchJSON({}))
  })
  afterEach(() => vi.unstubAllGlobals())

  const cases = [
    ['fetchActiveTasks', [], 'GET', '/tasks?active=true'],
    ['fetchPendingTasks', [], 'GET', '/tasks/pending'],
    ['fetchAllTasks', [], 'GET', '/tasks'],
    ['createTask', [{ name: 'x' }], 'POST', '/tasks', { name: 'x' }],
    ['updateTask', ['id1', { name: 'y' }], 'PATCH', '/tasks/id1', { name: 'y' }],
    ['deleteTask', ['id1'], 'DELETE', '/tasks/id1'],
    ['fetchCompletions', [], 'GET', '/completions'],
    ['resetTask', ['id1'], 'DELETE', '/completions?task_id=id1'],
    ['fetchTaskHistory', ['id1', 5], 'GET', '/completions/id1/history?limit=5'],
    ['fetchTaskHistory', ['id1'], 'GET', '/completions/id1/history?limit=10'],
  ]

  it.each(cases)('%s usa %s %s', async (fn, args, method, path, body) => {
    await api[fn](...args)
    const call = fetch.mock.calls[0]
    expect(call[0]).toContain(path)
    if (method === 'GET') {
      // request() no pone method explicitamente cuando no se pasa
      expect(call[1].method).toBeUndefined()
    } else {
      expect(call[1].method).toBe(method)
    }
    if (body) {
      expect(JSON.parse(call[1].body)).toEqual(body)
    }
  })

  it('completeTask envia task_id y completed_at ISO', async () => {
    await api.completeTask('abc')
    const body = JSON.parse(fetch.mock.calls[0][1].body)
    expect(body.task_id).toBe('abc')
    expect(() => new Date(body.completed_at).toISOString()).not.toThrow()
  })
})

describe('api.js — wrappers de productos, compras, stats, push, admin, casas', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetchJSON({}))
  })
  afterEach(() => vi.unstubAllGlobals())

  const cases = [
    // Products
    ['fetchProducts', [], '/products'],
    ['fetchProducts', ['limpieza'], '/products?category=limpieza'],
    ['fetchOutOfStockProducts', [], '/products?out_of_stock=true'],
    ['createProduct', [{ name: 'p' }], '/products'],
    ['updateProduct', ['id', {}], '/products/id'],
    ['purchaseProduct', ['id'], '/products/id/purchase'],
    ['deleteProduct', ['id'], '/products/id'],
    // Uploads
    ['deleteProductImage', ['pic.png'], '/uploads/pic.png'],
    // Shopping Categories
    ['fetchShoppingCategories', [], '/shopping-categories'],
    ['createShoppingCategory', [{}], '/shopping-categories'],
    ['updateShoppingCategory', ['id', {}], '/shopping-categories/id'],
    ['deleteShoppingCategory', ['id'], '/shopping-categories/id'],
    // Shopping Items
    ['fetchShoppingItems', [], '/shopping-items'],
    ['createShoppingItem', [{}], '/shopping-items'],
    ['updateShoppingItem', ['id', {}], '/shopping-items/id'],
    ['deleteShoppingItem', ['id'], '/shopping-items/id'],
    ['clearPurchasedItems', [], '/shopping-items/clear-purchased'],
    // Stats
    ['fetchParticipationStats', [], '/stats/participation?period=month'],
    ['fetchParticipationStats', ['week'], '/stats/participation?period=week'],
    // Push
    ['fetchVapidKey', [], '/push/vapid-key'],
    ['subscribePush', [{ endpoint: 'x' }], '/push/subscribe'],
    ['unsubscribePush', ['endpoint-1'], '/push/subscribe'],
    ['fetchPushStatus', [], '/push/status'],
    // Super admin
    ['checkSuperAdmin', [], '/super-admin/check'],
    ['fetchSuperAdminStats', [], '/super-admin/stats'],
    // House
    ['fetchHouseMembers', [], '/houses/members'],
    ['fetchHouseProfile', [], '/houses/profile'],
    ['updateHouseProfile', [{}], '/houses/profile'],
    ['seedHouse', [], '/houses/seed'],
    ['seedHouse', ['large', [{ name: 't' }]], '/houses/seed'],
    ['deleteHouse', ['house-9'], '/houses/house-9'],
  ]

  it.each(cases)('%s → %s', async (fn, args, expectedPath) => {
    await api[fn](...args)
    expect(fetch.mock.calls[0][0]).toContain(expectedPath)
  })

  it('seedHouse incluye tasks en el body cuando se pasa', async () => {
    await api.seedHouse('medium', [{ name: 'tarea' }])
    const body = JSON.parse(fetch.mock.calls[0][1].body)
    expect(body).toEqual({ template: 'medium', tasks: [{ name: 'tarea' }] })
  })

  it('seedHouse omite tasks cuando no se pasa', async () => {
    await api.seedHouse('small')
    const body = JSON.parse(fetch.mock.calls[0][1].body)
    expect(body).toEqual({ template: 'small' })
    expect(body.tasks).toBeUndefined()
  })
})

describe('getImageUrl', () => {
  it('retorna null cuando filename es falsy', () => {
    expect(api.getImageUrl(null)).toBeNull()
    expect(api.getImageUrl(undefined)).toBeNull()
    expect(api.getImageUrl('')).toBeNull()
  })

  it('retorna la URL bajo /api/uploads para el filename', () => {
    expect(api.getImageUrl('abc.png')).toContain('/uploads/abc.png')
  })
})

describe('uploadProductImage', () => {
  let originalHash

  beforeEach(() => {
    originalHash = window.location.hash
    house.getActiveHouse.mockReturnValue({ id: 'house-test' })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    window.location.hash = originalHash
  })

  it('envia FormData con el archivo y el header x-house-id', async () => {
    vi.stubGlobal('fetch', mockFetchJSON({ filename: 'x.png' }))
    const file = new File(['contenido'], 'x.png', { type: 'image/png' })
    const result = await api.uploadProductImage(file)
    expect(result).toEqual({ filename: 'x.png' })
    const call = fetch.mock.calls[0]
    expect(call[0]).toContain('/uploads')
    expect(call[1].method).toBe('POST')
    expect(call[1].headers['x-house-id']).toBe('house-test')
    expect(call[1].body).toBeInstanceOf(FormData)
  })

  it('omite x-house-id cuando no hay casa activa', async () => {
    house.getActiveHouse.mockReturnValueOnce(null)
    vi.stubGlobal('fetch', mockFetchJSON({}))
    const file = new File([''], 'a.png', { type: 'image/png' })
    await api.uploadProductImage(file)
    expect(fetch.mock.calls[0][1].headers['x-house-id']).toBeUndefined()
  })

  it('redirige a #/login en 401', async () => {
    vi.stubGlobal('fetch', mockFetchJSON({}, { status: 401, ok: false }))
    const file = new File([''], 'a.png', { type: 'image/png' })
    await expect(api.uploadProductImage(file)).rejects.toThrow('Sesion expirada')
    expect(window.location.hash).toBe('#/login')
  })

  it('lanza error con mensaje del body cuando la respuesta no es ok', async () => {
    vi.stubGlobal('fetch', mockFetchJSON({ error: 'Archivo invalido' }, { status: 400, ok: false }))
    const file = new File([''], 'a.png', { type: 'image/png' })
    await expect(api.uploadProductImage(file)).rejects.toThrow('Archivo invalido')
  })

  it('lanza HTTP <status> cuando el body no es JSON', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      status: 500,
      ok: false,
      json: async () => { throw new Error('boom') },
    }))
    const file = new File([''], 'a.png', { type: 'image/png' })
    await expect(api.uploadProductImage(file)).rejects.toThrow('HTTP 500')
  })
})
