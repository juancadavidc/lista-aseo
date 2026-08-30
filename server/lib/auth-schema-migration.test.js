import { describe, it, expect, vi } from 'vitest'
import { migrateAccountIssuer } from './auth-schema-migration.js'

// Pool falso: responde a las dos queries de introspeccion segun el estado
// declarado y registra el resto de sentencias ejecutadas.
function makePool({ hasTable = true, hasColumn = false } = {}) {
  const queries = []
  const query = vi.fn(async (sql) => {
    queries.push(sql)
    if (sql.includes('information_schema.tables')) {
      return { rows: hasTable ? [{ '?column?': 1 }] : [] }
    }
    if (sql.includes('information_schema.columns')) {
      return { rows: hasColumn ? [{ '?column?': 1 }] : [] }
    }
    return { rows: [] }
  })
  return { query, queries }
}

function writes(pool) {
  return pool.queries.filter(sql => !sql.includes('information_schema'))
}

describe('migrateAccountIssuer', () => {
  it('no hace nada si la tabla account no existe', async () => {
    const pool = makePool({ hasTable: false })
    expect(await migrateAccountIssuer(pool, () => {})).toBe(false)
    expect(writes(pool)).toEqual([])
  })

  it('es idempotente: no hace nada si la columna issuer ya existe', async () => {
    const pool = makePool({ hasColumn: true })
    expect(await migrateAccountIssuer(pool, () => {})).toBe(false)
    expect(writes(pool)).toEqual([])
  })

  it('agrega la columna, backfillea, la marca NOT NULL y crea el indice unico', async () => {
    const pool = makePool()
    const log = vi.fn()
    expect(await migrateAccountIssuer(pool, log)).toBe(true)

    const sql = writes(pool)
    expect(sql).toHaveLength(4)
    expect(sql[0]).toContain('ADD COLUMN "issuer" TEXT')
    expect(sql[1]).toContain('UPDATE "account"')
    expect(sql[2]).toContain('SET NOT NULL')
    expect(sql[3]).toContain('CREATE UNIQUE INDEX IF NOT EXISTS "account_issuer_accountId_uidx"')
    expect(sql[3]).toContain('("issuer", "accountId")')
    expect(log).toHaveBeenCalledOnce()
  })

  it('mapea cada providerId al issuer que espera better-auth 1.7', async () => {
    const pool = makePool()
    await migrateAccountIssuer(pool, () => {})

    const backfill = writes(pool)[1]
    expect(backfill).toContain("WHEN 'credential' THEN 'local:credential'")
    expect(backfill).toContain("WHEN 'google'     THEN 'https://accounts.google.com'")
    expect(backfill).toContain(`ELSE 'local:oauth:' || "providerId"`)
  })

  it('el backfill corre antes del NOT NULL para no romper con filas existentes', async () => {
    const pool = makePool()
    await migrateAccountIssuer(pool, () => {})

    const sql = writes(pool)
    expect(sql.findIndex(s => s.includes('UPDATE "account"')))
      .toBeLessThan(sql.findIndex(s => s.includes('SET NOT NULL')))
  })
})
