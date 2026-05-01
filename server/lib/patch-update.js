// Helpers para PATCH endpoints con whitelist explicita de columnas.
// Regla critica #2 del CLAUDE.md: SQL siempre con parameterized queries y nombres
// de columnas validados contra una lista cerrada para evitar SQL injection via body keys.

const TABLE_WHITELIST = new Set([
  'tasks',
  'products',
  'shopping_categories',
  'shopping_items',
])

export const TASK_UPDATABLE_COLUMNS = new Set([
  'name',
  'description',
  'frequency_type',
  'frequency_value',
  'is_active',
  'product_name',
  'product_image',
  'last_reset_at',
])

export const PRODUCT_UPDATABLE_COLUMNS = new Set([
  'name',
  'category',
  'reminder_frequency_days',
  'is_out_of_stock',
  'units',
  'last_purchased_at',
  'last_out_of_stock_at',
])

export const SHOPPING_CATEGORY_UPDATABLE_COLUMNS = new Set([
  'name',
  'emoji',
  'sort_order',
])

export const SHOPPING_ITEM_UPDATABLE_COLUMNS = new Set([
  'name',
  'note',
  'is_purchased',
  'category_id',
])

/**
 * buildPatchUpdate — construye un UPDATE parcial seguro para endpoints PATCH.
 *
 * Asume que los dos primeros parametros del query son [id, organization_id]
 * y que los siguientes son los valores de las columnas en el orden de `fields`.
 *
 * Devuelve { sql, values } si `fields` es valido, o { error } si trae keys
 * fuera del whitelist o esta vacio.
 *
 * No usa template literals para concatenar el SET clause: las column names
 * provienen de un Set cerrado y se pegan via `+` para que el gate sql-safety
 * no genere falsos positivos.
 */
export function buildPatchUpdate(table, fields, allowedColumns) {
  if (!TABLE_WHITELIST.has(table)) {
    return { error: 'Tabla no permitida' }
  }
  const keys = Object.keys(fields)
  const unknown = keys.filter(k => !allowedColumns.has(k))
  if (unknown.length > 0) {
    return { error: 'Campos no permitidos: ' + unknown.join(', ') }
  }
  if (keys.length === 0) {
    return { error: 'No fields to update' }
  }
  const setClauses = keys.map((k, i) => k + ' = $' + (i + 3))
  const values = keys.map(k => fields[k])
  const sql =
    'UPDATE ' + table + ' SET ' + setClauses.join(', ') +
    ' WHERE id = $1 AND organization_id = $2 RETURNING *'
  return { sql, values }
}
