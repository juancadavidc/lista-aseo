// Recomendador de compras por periodicidad detectada.
// Analiza items archivados (con purchased_at) agrupados por nombre normalizado
// y predice la proxima compra usando la mediana de los intervalos historicos.

const DEFAULT_INTERVAL_DAYS = 30
const TOLERANCE_DAYS = 3
const MIN_TIMES_BOUGHT = 2

export function normalizeName(name) {
  return (name || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
}

function median(sortedNumbers) {
  if (sortedNumbers.length === 0) return null
  const mid = Math.floor(sortedNumbers.length / 2)
  if (sortedNumbers.length % 2 === 1) return sortedNumbers[mid]
  return (sortedNumbers[mid - 1] + sortedNumbers[mid]) / 2
}

/**
 * buildRecommendations
 * - archivedItems: filas de shopping_items archivadas (archived_at IS NOT NULL),
 *   con purchased_at no nulo. Cada fila: { id, name, category_id, category_name,
 *   category_emoji, purchased_at }.
 * - activeItems: filas activas en la lista actual (archived_at IS NULL).
 *   Cada fila: { name }.
 * - now: instante de referencia (Date), parametrizable para tests deterministas.
 *
 * Devuelve un array de sugerencias ordenado por urgencia (mas vencidas primero).
 */
export function buildRecommendations(archivedItems, activeItems, now = new Date()) {
  const groups = new Map()
  for (const item of archivedItems) {
    if (!item.purchased_at) continue
    const key = normalizeName(item.name)
    if (!key) continue
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(item)
  }

  const activeNames = new Set(
    activeItems.map(i => normalizeName(i.name)).filter(Boolean)
  )

  const nowMs = now.getTime()
  const recommendations = []

  for (const [key, items] of groups) {
    if (activeNames.has(key)) continue
    if (items.length < MIN_TIMES_BOUGHT) continue

    items.sort((a, b) => new Date(b.purchased_at) - new Date(a.purchased_at))

    const intervals = []
    for (let i = 0; i < items.length - 1; i++) {
      const diffMs = new Date(items[i].purchased_at) - new Date(items[i + 1].purchased_at)
      const diffDays = diffMs / (1000 * 60 * 60 * 24)
      if (diffDays > 0) intervals.push(diffDays)
    }

    intervals.sort((a, b) => a - b)
    const intervalDays = intervals.length > 0 ? median(intervals) : DEFAULT_INTERVAL_DAYS

    const last = items[0]
    const lastMs = new Date(last.purchased_at).getTime()
    const predictedMs = lastMs + intervalDays * 86400000
    const daysUntilNext = (predictedMs - nowMs) / 86400000

    if (daysUntilNext > TOLERANCE_DAYS) continue

    recommendations.push({
      name: last.name,
      category_id: last.category_id || null,
      category_name: last.category_name || null,
      category_emoji: last.category_emoji || null,
      times_bought: items.length,
      avg_interval_days: Math.max(1, Math.round(intervalDays)),
      last_purchased_at: last.purchased_at,
      predicted_next: new Date(predictedMs).toISOString(),
      days_until_next: Math.round(daysUntilNext),
    })
  }

  recommendations.sort((a, b) => a.days_until_next - b.days_until_next)

  return recommendations
}

export const RECOMMENDATIONS_CONSTANTS = {
  DEFAULT_INTERVAL_DAYS,
  TOLERANCE_DAYS,
  MIN_TIMES_BOUGHT,
}
