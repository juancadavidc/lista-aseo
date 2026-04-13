import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  requireRole,
  createRequireAuth,
  createRequireHouse,
  createRequireSuperAdmin,
  isAllowedImageExtension,
  ALLOWED_IMAGE_EXTENSIONS,
} from './middleware.js'

function mockRes() {
  const res = {}
  res.status = vi.fn(() => res)
  res.json = vi.fn(() => res)
  return res
}

describe('requireRole', () => {
  it('llama next() cuando el rol del usuario esta en la lista permitida', () => {
    const mw = requireRole('owner', 'admin')
    const req = { house: { role: 'owner' } }
    const res = mockRes()
    const next = vi.fn()

    mw(req, res, next)

    expect(next).toHaveBeenCalledOnce()
    expect(res.status).not.toHaveBeenCalled()
  })

  it('responde 403 cuando el rol no esta permitido', () => {
    const mw = requireRole('owner')
    const req = { house: { role: 'member' } }
    const res = mockRes()
    const next = vi.fn()

    mw(req, res, next)

    expect(next).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(403)
    expect(res.json).toHaveBeenCalledWith({ error: 'No tienes permisos para esta accion' })
  })

  it('responde 403 cuando req.house no esta definido', () => {
    const mw = requireRole('owner')
    const req = {}
    const res = mockRes()
    const next = vi.fn()

    mw(req, res, next)

    expect(next).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(403)
  })

  it('acepta multiples roles (varargs)', () => {
    const mw = requireRole('owner', 'admin', 'member')
    const req = { house: { role: 'member' } }
    const res = mockRes()
    const next = vi.fn()

    mw(req, res, next)

    expect(next).toHaveBeenCalledOnce()
  })
})

describe('createRequireAuth', () => {
  let auth, req, res, next

  beforeEach(() => {
    auth = { api: { getSession: vi.fn() } }
    req = { headers: { cookie: 'session=abc' } }
    res = mockRes()
    next = vi.fn()
  })

  it('asigna req.user y req.session cuando hay sesion valida', async () => {
    const session = { user: { id: 'u1' }, session: { id: 's1' } }
    auth.api.getSession.mockResolvedValue(session)

    await createRequireAuth(auth)(req, res, next)

    expect(req.user).toEqual({ id: 'u1' })
    expect(req.session).toEqual({ id: 's1' })
    expect(next).toHaveBeenCalledOnce()
  })

  it('responde 401 cuando no hay sesion', async () => {
    auth.api.getSession.mockResolvedValue(null)

    await createRequireAuth(auth)(req, res, next)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalledWith({ error: 'No autenticado' })
    expect(next).not.toHaveBeenCalled()
  })

  it('responde 401 cuando getSession lanza error', async () => {
    auth.api.getSession.mockRejectedValue(new Error('boom'))

    await createRequireAuth(auth)(req, res, next)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(next).not.toHaveBeenCalled()
  })
})

describe('createRequireHouse', () => {
  let pool, req, res, next

  beforeEach(() => {
    pool = { query: vi.fn() }
    req = { headers: {}, user: { id: 'u1' } }
    res = mockRes()
    next = vi.fn()
  })

  it('responde 400 cuando no hay header x-house-id', async () => {
    await createRequireHouse(pool)(req, res, next)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({ error: 'Casa no seleccionada' })
    expect(next).not.toHaveBeenCalled()
  })

  it('responde 403 cuando el usuario no es miembro', async () => {
    req.headers['x-house-id'] = 'house-1'
    pool.query.mockResolvedValue({ rows: [] })

    await createRequireHouse(pool)(req, res, next)

    expect(res.status).toHaveBeenCalledWith(403)
    expect(next).not.toHaveBeenCalled()
  })

  it('asigna req.house y llama next() cuando es miembro', async () => {
    req.headers['x-house-id'] = 'house-1'
    pool.query.mockResolvedValue({ rows: [{ role: 'owner' }] })

    await createRequireHouse(pool)(req, res, next)

    expect(req.house).toEqual({ id: 'house-1', role: 'owner' })
    expect(next).toHaveBeenCalledOnce()
  })

  it('filtra SIEMPRE por userId y organizationId (multi-tenant)', async () => {
    req.headers['x-house-id'] = 'house-42'
    pool.query.mockResolvedValue({ rows: [{ role: 'member' }] })

    await createRequireHouse(pool)(req, res, next)

    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining('"userId" = $1 AND "organizationId" = $2'),
      ['u1', 'house-42']
    )
  })

  it('responde 500 cuando la query falla', async () => {
    req.headers['x-house-id'] = 'house-1'
    pool.query.mockRejectedValue(new Error('db down'))

    await createRequireHouse(pool)(req, res, next)

    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith({ error: 'db down' })
  })
})

describe('createRequireSuperAdmin', () => {
  let pool, req, res, next

  beforeEach(() => {
    pool = { query: vi.fn() }
    req = { user: { id: 'u1' } }
    res = mockRes()
    next = vi.fn()
  })

  it('llama next() cuando el usuario esta en super_admins', async () => {
    pool.query.mockResolvedValue({ rows: [{ id: 'sa1' }] })

    await createRequireSuperAdmin(pool)(req, res, next)

    expect(next).toHaveBeenCalledOnce()
  })

  it('responde 403 cuando el usuario no es super admin', async () => {
    pool.query.mockResolvedValue({ rows: [] })

    await createRequireSuperAdmin(pool)(req, res, next)

    expect(res.status).toHaveBeenCalledWith(403)
    expect(next).not.toHaveBeenCalled()
  })

  it('usa query parametrizada con el user id', async () => {
    pool.query.mockResolvedValue({ rows: [{ id: 'sa1' }] })

    await createRequireSuperAdmin(pool)(req, res, next)

    expect(pool.query).toHaveBeenCalledWith(
      'SELECT id FROM super_admins WHERE user_id = $1',
      ['u1']
    )
  })

  it('responde 500 cuando la query falla', async () => {
    pool.query.mockRejectedValue(new Error('db down'))

    await createRequireSuperAdmin(pool)(req, res, next)

    expect(res.status).toHaveBeenCalledWith(500)
  })
})

describe('isAllowedImageExtension', () => {
  it.each(['foto.jpg', 'FOTO.JPG', 'img.jpeg', 'img.PNG', 'pic.webp'])(
    'acepta %s',
    (filename) => {
      expect(isAllowedImageExtension(filename)).toBe(true)
    }
  )

  it.each(['archivo.pdf', 'script.js', 'imagen.gif', 'imagen.bmp', 'sin-extension'])(
    'rechaza %s',
    (filename) => {
      expect(isAllowedImageExtension(filename)).toBe(false)
    }
  )

  it('rechaza entradas vacias o no-string', () => {
    expect(isAllowedImageExtension('')).toBe(false)
    expect(isAllowedImageExtension(null)).toBe(false)
    expect(isAllowedImageExtension(undefined)).toBe(false)
    expect(isAllowedImageExtension(123)).toBe(false)
  })

  it('expone la lista de extensiones permitidas', () => {
    expect(ALLOWED_IMAGE_EXTENSIONS).toEqual(['.jpg', '.jpeg', '.png', '.webp'])
  })
})
