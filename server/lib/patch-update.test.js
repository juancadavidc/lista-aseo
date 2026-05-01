import { describe, it, expect } from 'vitest'
import {
  buildPatchUpdate,
  TASK_UPDATABLE_COLUMNS,
  PRODUCT_UPDATABLE_COLUMNS,
  SHOPPING_CATEGORY_UPDATABLE_COLUMNS,
  SHOPPING_ITEM_UPDATABLE_COLUMNS,
} from './patch-update.js'

describe('buildPatchUpdate', () => {
  it('construye SET con columnas validas y placeholders desde $3', () => {
    const result = buildPatchUpdate(
      'tasks',
      { name: 'Lavar', is_active: false },
      TASK_UPDATABLE_COLUMNS,
    )
    expect(result.sql).toBe(
      'UPDATE tasks SET name = $3, is_active = $4 WHERE id = $1 AND organization_id = $2 RETURNING *',
    )
    expect(result.values).toEqual(['Lavar', false])
    expect(result.error).toBeUndefined()
  })

  it('rechaza body vacio con error "No fields to update"', () => {
    const result = buildPatchUpdate('tasks', {}, TASK_UPDATABLE_COLUMNS)
    expect(result).toEqual({ error: 'No fields to update' })
  })

  it('rechaza key fuera del whitelist y enumera las desconocidas', () => {
    const result = buildPatchUpdate(
      'tasks',
      { name: 'ok', evil_column: 1 },
      TASK_UPDATABLE_COLUMNS,
    )
    expect(result.sql).toBeUndefined()
    expect(result.error).toBe('Campos no permitidos: evil_column')
  })

  it('rechaza intentos de inyeccion via key con SQL crudo', () => {
    const malicious = "name = 'pwned' WHERE 1=1; -- "
    const result = buildPatchUpdate(
      'tasks',
      { [malicious]: 'x' },
      TASK_UPDATABLE_COLUMNS,
    )
    expect(result.sql).toBeUndefined()
    expect(result.error).toContain('Campos no permitidos')
    expect(result.error).toContain(malicious)
  })

  it('rechaza tabla fuera del whitelist', () => {
    const result = buildPatchUpdate(
      'super_admins',
      { name: 'x' },
      new Set(['name']),
    )
    expect(result).toEqual({ error: 'Tabla no permitida' })
  })

  it('valida products con su whitelist y mantiene orden de keys', () => {
    const fields = {
      is_out_of_stock: true,
      last_out_of_stock_at: '2026-05-01T00:00:00Z',
      units: 3,
    }
    const result = buildPatchUpdate('products', fields, PRODUCT_UPDATABLE_COLUMNS)
    expect(result.sql).toBe(
      'UPDATE products SET is_out_of_stock = $3, last_out_of_stock_at = $4, units = $5 WHERE id = $1 AND organization_id = $2 RETURNING *',
    )
    expect(result.values).toEqual([true, '2026-05-01T00:00:00Z', 3])
  })

  it('valida shopping_categories con su whitelist', () => {
    const result = buildPatchUpdate(
      'shopping_categories',
      { name: 'Bano', emoji: '🚿' },
      SHOPPING_CATEGORY_UPDATABLE_COLUMNS,
    )
    expect(result.sql).toBe(
      'UPDATE shopping_categories SET name = $3, emoji = $4 WHERE id = $1 AND organization_id = $2 RETURNING *',
    )
    expect(result.values).toEqual(['Bano', '🚿'])
  })

  it('valida shopping_items con su whitelist y permite null en category_id', () => {
    const result = buildPatchUpdate(
      'shopping_items',
      { is_purchased: true, category_id: null },
      SHOPPING_ITEM_UPDATABLE_COLUMNS,
    )
    expect(result.sql).toBe(
      'UPDATE shopping_items SET is_purchased = $3, category_id = $4 WHERE id = $1 AND organization_id = $2 RETURNING *',
    )
    expect(result.values).toEqual([true, null])
  })

  it('reporta multiples keys desconocidas separadas por coma', () => {
    const result = buildPatchUpdate(
      'shopping_items',
      { name: 'ok', foo: 1, bar: 2 },
      SHOPPING_ITEM_UPDATABLE_COLUMNS,
    )
    expect(result.error).toBe('Campos no permitidos: foo, bar')
  })
})

describe('whitelists exportados', () => {
  it('TASK_UPDATABLE_COLUMNS incluye los campos editables del schema tasks', () => {
    const expected = [
      'name', 'description', 'frequency_type', 'frequency_value',
      'is_active', 'product_name', 'product_image', 'last_reset_at',
    ]
    for (const col of expected) expect(TASK_UPDATABLE_COLUMNS.has(col)).toBe(true)
    expect(TASK_UPDATABLE_COLUMNS.has('organization_id')).toBe(false)
    expect(TASK_UPDATABLE_COLUMNS.has('id')).toBe(false)
  })

  it('PRODUCT_UPDATABLE_COLUMNS no permite organization_id ni id', () => {
    expect(PRODUCT_UPDATABLE_COLUMNS.has('organization_id')).toBe(false)
    expect(PRODUCT_UPDATABLE_COLUMNS.has('id')).toBe(false)
  })

  it('SHOPPING_CATEGORY_UPDATABLE_COLUMNS no permite organization_id ni id', () => {
    expect(SHOPPING_CATEGORY_UPDATABLE_COLUMNS.has('organization_id')).toBe(false)
    expect(SHOPPING_CATEGORY_UPDATABLE_COLUMNS.has('id')).toBe(false)
  })

  it('SHOPPING_ITEM_UPDATABLE_COLUMNS no permite organization_id ni id', () => {
    expect(SHOPPING_ITEM_UPDATABLE_COLUMNS.has('organization_id')).toBe(false)
    expect(SHOPPING_ITEM_UPDATABLE_COLUMNS.has('id')).toBe(false)
  })
})
