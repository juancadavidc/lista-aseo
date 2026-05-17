import { describe, it, expect } from 'vitest'
import {
  buildRecommendations,
  normalizeName,
  RECOMMENDATIONS_CONSTANTS,
} from './shopping-recommendations.js'

const DAY = 86400000

function daysAgo(now, days) {
  return new Date(now.getTime() - days * DAY).toISOString()
}

describe('normalizeName', () => {
  it('quita acentos, mayusculas y espacios', () => {
    expect(normalizeName('  Café  ')).toBe('cafe')
    expect(normalizeName('Jabón Líquido')).toBe('jabon liquido')
  })

  it('maneja nulls y vacios', () => {
    expect(normalizeName(null)).toBe('')
    expect(normalizeName(undefined)).toBe('')
    expect(normalizeName('')).toBe('')
  })
})

describe('buildRecommendations', () => {
  const now = new Date('2026-05-17T10:00:00Z')

  it('no recomienda items con menos de 2 compras historicas', () => {
    const archived = [
      { id: '1', name: 'Papel higienico', purchased_at: daysAgo(now, 35) },
    ]
    const result = buildRecommendations(archived, [], now)
    expect(result).toEqual([])
  })

  it('recomienda items cuyo intervalo predicho llego a la ventana de tolerancia', () => {
    const archived = [
      // 3 compras cada ~30 dias; ultima hace 28 dias -> proxima en 2 dias (dentro de 3 de tolerancia)
      { id: '1', name: 'Papel higienico', purchased_at: daysAgo(now, 28), category_id: 'c1', category_name: 'Bano', category_emoji: '🧻' },
      { id: '2', name: 'Papel higienico', purchased_at: daysAgo(now, 58), category_id: 'c1', category_name: 'Bano', category_emoji: '🧻' },
      { id: '3', name: 'Papel higienico', purchased_at: daysAgo(now, 88), category_id: 'c1', category_name: 'Bano', category_emoji: '🧻' },
    ]
    const result = buildRecommendations(archived, [], now)
    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      name: 'Papel higienico',
      category_id: 'c1',
      category_emoji: '🧻',
      times_bought: 3,
      avg_interval_days: 30,
    })
    expect(result[0].days_until_next).toBeLessThanOrEqual(3)
  })

  it('no recomienda si todavia falta mas que la tolerancia', () => {
    const archived = [
      // ultima hace 5 dias, intervalo 30 -> proxima en 25 dias (fuera de tolerancia)
      { id: '1', name: 'Cafe', purchased_at: daysAgo(now, 5) },
      { id: '2', name: 'Cafe', purchased_at: daysAgo(now, 35) },
    ]
    const result = buildRecommendations(archived, [], now)
    expect(result).toEqual([])
  })

  it('excluye items que ya estan en la lista activa (no archivados)', () => {
    const archived = [
      { id: '1', name: 'Leche', purchased_at: daysAgo(now, 8) },
      { id: '2', name: 'Leche', purchased_at: daysAgo(now, 15) },
      { id: '3', name: 'Leche', purchased_at: daysAgo(now, 22) },
    ]
    const active = [{ name: 'leche' }]
    const result = buildRecommendations(archived, active, now)
    expect(result).toEqual([])
  })

  it('exclusion por nombre activo ignora acentos y mayusculas', () => {
    const archived = [
      { id: '1', name: 'Café', purchased_at: daysAgo(now, 8) },
      { id: '2', name: 'Café', purchased_at: daysAgo(now, 15) },
      { id: '3', name: 'Café', purchased_at: daysAgo(now, 22) },
    ]
    const active = [{ name: '  CAFE  ' }]
    const result = buildRecommendations(archived, active, now)
    expect(result).toEqual([])
  })

  it('agrupa por nombre normalizado (sin acentos / case)', () => {
    const archived = [
      { id: '1', name: 'Jabón', purchased_at: daysAgo(now, 25) },
      { id: '2', name: 'jabon', purchased_at: daysAgo(now, 50) },
      { id: '3', name: 'JABON', purchased_at: daysAgo(now, 75) },
    ]
    const result = buildRecommendations(archived, [], now)
    expect(result).toHaveLength(1)
    expect(result[0].times_bought).toBe(3)
    expect(result[0].name).toBe('Jabón')
  })

  it('ordena por urgencia ascendente (mas vencidos primero)', () => {
    const archived = [
      // A: ultimo hace 45, intervalo 30 -> -15 dias (muy vencido)
      { id: 'a1', name: 'A', purchased_at: daysAgo(now, 45) },
      { id: 'a2', name: 'A', purchased_at: daysAgo(now, 75) },
      // B: ultimo hace 30, intervalo 30 -> 0 dias (exacto hoy)
      { id: 'b1', name: 'B', purchased_at: daysAgo(now, 30) },
      { id: 'b2', name: 'B', purchased_at: daysAgo(now, 60) },
    ]
    const result = buildRecommendations(archived, [], now)
    expect(result.map(r => r.name)).toEqual(['A', 'B'])
    expect(result[0].days_until_next).toBeLessThan(result[1].days_until_next)
  })

  it('usa mediana, no media, para resistir outliers', () => {
    const archived = [
      // Intervalos: 7, 7, 7, 60. Mediana = 7, media = ~20.
      { id: '1', name: 'Pan', purchased_at: daysAgo(now, 8) },
      { id: '2', name: 'Pan', purchased_at: daysAgo(now, 15) },
      { id: '3', name: 'Pan', purchased_at: daysAgo(now, 22) },
      { id: '4', name: 'Pan', purchased_at: daysAgo(now, 29) },
      { id: '5', name: 'Pan', purchased_at: daysAgo(now, 89) },
    ]
    const result = buildRecommendations(archived, [], now)
    expect(result).toHaveLength(1)
    expect(result[0].avg_interval_days).toBe(7)
  })

  it('ignora archivados sin purchased_at', () => {
    const archived = [
      { id: '1', name: 'Sin fecha', purchased_at: null },
      { id: '2', name: 'Sin fecha', purchased_at: null },
    ]
    const result = buildRecommendations(archived, [], now)
    expect(result).toEqual([])
  })

  it('expone constantes para tuning', () => {
    expect(RECOMMENDATIONS_CONSTANTS.MIN_TIMES_BOUGHT).toBe(2)
    expect(RECOMMENDATIONS_CONSTANTS.TOLERANCE_DAYS).toBe(3)
  })
})
