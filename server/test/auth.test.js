import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const betterAuthMock = vi.fn((config) => ({ __config: config, __marker: 'auth-instance' }))
const organizationMock = vi.fn((opts) => ({ __plugin: 'organization', opts }))

vi.mock('better-auth', () => ({
  betterAuth: (config) => betterAuthMock(config),
}))

vi.mock('better-auth/plugins', () => ({
  organization: (opts) => organizationMock(opts),
}))

const { createAuth } = await import('../auth.js')

const ENV_KEYS = [
  'ALLOWED_HOSTS',
  'BETTER_AUTH_URL',
  'BETTER_AUTH_SECRET',
  'FRONTEND_URL',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
]

function clearEnv() {
  for (const k of ENV_KEYS) delete process.env[k]
}

function lastConfig() {
  return betterAuthMock.mock.calls.at(-1)[0]
}

describe('createAuth', () => {
  const pool = { __pool: true }

  beforeEach(() => {
    betterAuthMock.mockClear()
    organizationMock.mockClear()
    clearEnv()
  })

  afterEach(() => {
    clearEnv()
  })

  it('devuelve la instancia que retorna betterAuth', () => {
    const auth = createAuth(pool)

    expect(betterAuthMock).toHaveBeenCalledOnce()
    expect(auth).toEqual({ __config: expect.any(Object), __marker: 'auth-instance' })
  })

  it('inyecta el pool como database y fija basePath en /api/auth', () => {
    createAuth(pool)
    const cfg = lastConfig()

    expect(cfg.database).toBe(pool)
    expect(cfg.basePath).toBe('/api/auth')
  })

  it('usa baseURL string con fallback localhost cuando ALLOWED_HOSTS esta vacio', () => {
    createAuth(pool)

    expect(lastConfig().baseURL).toBe('http://localhost:5173')
  })

  it('usa BETTER_AUTH_URL como baseURL cuando ALLOWED_HOSTS esta vacio', () => {
    process.env.BETTER_AUTH_URL = 'https://app.example.com'

    createAuth(pool)

    expect(lastConfig().baseURL).toBe('https://app.example.com')
  })

  it('construye baseURL objeto cuando ALLOWED_HOSTS tiene valores', () => {
    process.env.ALLOWED_HOSTS = ' app.example.com , admin.example.com ,'
    process.env.BETTER_AUTH_URL = 'https://app.example.com'

    createAuth(pool)

    expect(lastConfig().baseURL).toEqual({
      allowedHosts: ['app.example.com', 'admin.example.com'],
      protocol: 'https',
      fallback: 'https://app.example.com',
    })
  })

  it('baseURL objeto usa fallback localhost cuando BETTER_AUTH_URL no esta definido', () => {
    process.env.ALLOWED_HOSTS = 'app.example.com'

    createAuth(pool)

    expect(lastConfig().baseURL).toEqual({
      allowedHosts: ['app.example.com'],
      protocol: 'https',
      fallback: 'http://localhost:5173',
    })
  })

  it('trustedOrigins se parsea con trim y sin trailing slashes', () => {
    process.env.FRONTEND_URL = ' https://app.example.com/ , https://admin.example.com/// '

    createAuth(pool)

    expect(lastConfig().trustedOrigins).toEqual([
      'https://app.example.com',
      'https://admin.example.com',
    ])
  })

  it('trustedOrigins por defecto es localhost cuando FRONTEND_URL no esta definido', () => {
    createAuth(pool)

    expect(lastConfig().trustedOrigins).toEqual(['http://localhost:5173'])
  })

  it('usa BETTER_AUTH_SECRET cuando esta definido', () => {
    process.env.BETTER_AUTH_SECRET = 'super-secret'

    createAuth(pool)

    expect(lastConfig().secret).toBe('super-secret')
  })

  it('usa secret de desarrollo cuando BETTER_AUTH_SECRET no esta definido', () => {
    createAuth(pool)

    expect(lastConfig().secret).toBe('dev-secret-change-in-production')
  })

  it('emailAndPassword queda habilitado', () => {
    createAuth(pool)

    expect(lastConfig().emailAndPassword).toEqual({ enabled: true })
  })

  it('registra el plugin organization con allowMemberToLeave en true', () => {
    createAuth(pool)

    expect(organizationMock).toHaveBeenCalledWith({ allowMemberToLeave: true })
    expect(lastConfig().plugins).toEqual([
      { __plugin: 'organization', opts: { allowMemberToLeave: true } },
    ])
  })

  it('no registra Google cuando faltan ambas credenciales', () => {
    createAuth(pool)

    expect(lastConfig().socialProviders).toEqual({})
  })

  it('no registra Google cuando solo existe GOOGLE_CLIENT_ID', () => {
    process.env.GOOGLE_CLIENT_ID = 'id'

    createAuth(pool)

    expect(lastConfig().socialProviders).toEqual({})
  })

  it('no registra Google cuando solo existe GOOGLE_CLIENT_SECRET', () => {
    process.env.GOOGLE_CLIENT_SECRET = 'secret'

    createAuth(pool)

    expect(lastConfig().socialProviders).toEqual({})
  })

  it('registra Google cuando existen ambas credenciales', () => {
    process.env.GOOGLE_CLIENT_ID = 'id-123'
    process.env.GOOGLE_CLIENT_SECRET = 'secret-456'

    createAuth(pool)

    expect(lastConfig().socialProviders).toEqual({
      google: { clientId: 'id-123', clientSecret: 'secret-456' },
    })
  })
})
