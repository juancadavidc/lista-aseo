import { describe, it, expect } from 'vitest'
import { normalizeText, suggestCategory } from './smartTags'

// Mock categories simulating a typical house setup
const MOCK_CATEGORIES = [
  { id: '1', name: 'Limpieza', emoji: '🧹' },
  { id: '2', name: 'Frutas y Verduras', emoji: '🍎' },
  { id: '3', name: 'Despensa', emoji: '🏪' },
  { id: '4', name: 'Lácteos', emoji: '🥛' },
  { id: '5', name: 'Carnes', emoji: '🥩' },
  { id: '6', name: 'Bebidas', emoji: '🥤' },
  { id: '7', name: 'Higiene', emoji: '🧴' },
  { id: '8', name: 'Snacks', emoji: '🍿' },
  { id: '9', name: 'Papel', emoji: '🧻' },
  { id: '10', name: 'Herramientas', emoji: '🧰' },
  { id: '11', name: 'Bebé', emoji: '👶' },
  { id: '12', name: 'Mascotas', emoji: '🐾' },
  { id: '13', name: 'Salud', emoji: '💊' },
  { id: '14', name: 'Congelados', emoji: '🧊' },
  { id: '15', name: 'Panadería', emoji: '🍞' },
  { id: '16', name: 'Hogar', emoji: '🏠' },
  { id: '17', name: 'Oficina', emoji: '📎' },
]

// ─── normalizeText ───────────────────────────────────────────

describe('normalizeText', () => {
  it('converts to lowercase', () => {
    expect(normalizeText('JABÓN')).toBe('jabon')
  })

  it('removes accents/diacritics', () => {
    expect(normalizeText('lácteos')).toBe('lacteos')
    expect(normalizeText('panadería')).toBe('panaderia')
    expect(normalizeText('bebé')).toBe('bebe')
  })

  it('trims whitespace', () => {
    expect(normalizeText('  leche  ')).toBe('leche')
  })

  it('handles combined transformations', () => {
    expect(normalizeText('  CAFÉ con Léche  ')).toBe('cafe con leche')
  })

  it('returns empty string for empty input', () => {
    expect(normalizeText('')).toBe('')
    expect(normalizeText('   ')).toBe('')
  })
})

// ─── suggestCategory — null/edge cases ───────────────────────

describe('suggestCategory — edge cases', () => {
  it('returns null for empty input', () => {
    expect(suggestCategory('', MOCK_CATEGORIES)).toBeNull()
  })

  it('returns null for null input', () => {
    expect(suggestCategory(null, MOCK_CATEGORIES)).toBeNull()
  })

  it('returns null for undefined input', () => {
    expect(suggestCategory(undefined, MOCK_CATEGORIES)).toBeNull()
  })

  it('returns null when categories is empty', () => {
    expect(suggestCategory('jabón', [])).toBeNull()
  })

  it('returns null when categories is null', () => {
    expect(suggestCategory('jabón', null)).toBeNull()
  })

  it('returns null for unrecognized input', () => {
    expect(suggestCategory('xyzzy', MOCK_CATEGORIES)).toBeNull()
  })

  it('returns null for whitespace-only input', () => {
    expect(suggestCategory('   ', MOCK_CATEGORIES)).toBeNull()
  })
})

// ─── suggestCategory — keyword matching ──────────────────────

describe('suggestCategory — keyword matching', () => {
  it('matches "jabón" → Limpieza', () => {
    const result = suggestCategory('jabón', MOCK_CATEGORIES)
    expect(result).toEqual({ id: '1', name: 'Limpieza', emoji: '🧹' })
  })

  it('matches "detergente" → Limpieza', () => {
    const result = suggestCategory('detergente', MOCK_CATEGORIES)
    expect(result).toEqual({ id: '1', name: 'Limpieza', emoji: '🧹' })
  })

  it('matches "leche" → Lácteos', () => {
    const result = suggestCategory('leche', MOCK_CATEGORIES)
    expect(result).toEqual({ id: '4', name: 'Lácteos', emoji: '🥛' })
  })

  it('matches "manzana" → Frutas y Verduras', () => {
    const result = suggestCategory('manzana', MOCK_CATEGORIES)
    expect(result).toEqual({ id: '2', name: 'Frutas y Verduras', emoji: '🍎' })
  })

  it('matches "pollo" → Carnes', () => {
    const result = suggestCategory('pollo', MOCK_CATEGORIES)
    expect(result).toEqual({ id: '5', name: 'Carnes', emoji: '🥩' })
  })

  it('matches "coca cola" → Bebidas', () => {
    const result = suggestCategory('coca cola', MOCK_CATEGORIES)
    expect(result).toEqual({ id: '6', name: 'Bebidas', emoji: '🥤' })
  })

  it('matches "shampoo" → Higiene', () => {
    const result = suggestCategory('shampoo', MOCK_CATEGORIES)
    expect(result).toEqual({ id: '7', name: 'Higiene', emoji: '🧴' })
  })

  it('matches "papel higiénico" → Papel', () => {
    const result = suggestCategory('papel higiénico', MOCK_CATEGORIES)
    expect(result).toEqual({ id: '9', name: 'Papel', emoji: '🧻' })
  })

  it('matches "escoba" → Herramientas', () => {
    const result = suggestCategory('escoba', MOCK_CATEGORIES)
    expect(result).toEqual({ id: '10', name: 'Herramientas', emoji: '🧰' })
  })

  it('matches "arroz" → Despensa', () => {
    const result = suggestCategory('arroz', MOCK_CATEGORIES)
    expect(result).toEqual({ id: '3', name: 'Despensa', emoji: '🏪' })
  })

  it('matches "pañales" → Higiene (generic diapers)', () => {
    const result = suggestCategory('pañales', MOCK_CATEGORIES)
    expect(result).toEqual({ id: '7', name: 'Higiene', emoji: '🧴' })
  })

  it('matches "comida para perro" → Mascotas', () => {
    const result = suggestCategory('comida para perro', MOCK_CATEGORIES)
    expect(result).toEqual({ id: '12', name: 'Mascotas', emoji: '🐾' })
  })

  it('matches "aspirina" → Salud', () => {
    const result = suggestCategory('aspirina', MOCK_CATEGORIES)
    expect(result).toEqual({ id: '13', name: 'Salud', emoji: '💊' })
  })

  it('matches "pizza congelada" → Congelados', () => {
    const result = suggestCategory('pizza congelada', MOCK_CATEGORIES)
    expect(result).toEqual({ id: '14', name: 'Congelados', emoji: '🧊' })
  })

  it('matches "pan" → Despensa (bread as pantry staple)', () => {
    const result = suggestCategory('pan', MOCK_CATEGORIES)
    expect(result).toEqual({ id: '3', name: 'Despensa', emoji: '🏪' })
  })
})

// ─── suggestCategory — case/accent insensitivity ─────────────

describe('suggestCategory — case and accent insensitivity', () => {
  it('handles uppercase input "JABÓN"', () => {
    const result = suggestCategory('JABÓN', MOCK_CATEGORIES)
    expect(result).not.toBeNull()
    expect(result.name).toBe('Limpieza')
  })

  it('handles mixed case "Leche"', () => {
    const result = suggestCategory('Leche', MOCK_CATEGORIES)
    expect(result).not.toBeNull()
    expect(result.name).toBe('Lácteos')
  })

  it('handles input without accents "jabon"', () => {
    const result = suggestCategory('jabon', MOCK_CATEGORIES)
    expect(result).not.toBeNull()
    expect(result.name).toBe('Limpieza')
  })

  it('handles input with extra spaces', () => {
    const result = suggestCategory('  arroz  ', MOCK_CATEGORIES)
    expect(result).not.toBeNull()
    expect(result.name).toBe('Despensa')
  })
})

// ─── suggestCategory — flexible category name matching ───────

describe('suggestCategory — flexible category name matching', () => {
  it('matches when house category is a substring of dictionary name', () => {
    // House has "Frutas" instead of "Frutas y Verduras"
    const customCategories = [
      { id: '99', name: 'Frutas', emoji: '🍎' },
    ]
    const result = suggestCategory('manzana', customCategories)
    expect(result).toEqual({ id: '99', name: 'Frutas', emoji: '🍎' })
  })

  it('matches when dictionary name is a substring of house category', () => {
    // House has "Productos de Limpieza" instead of "Limpieza"
    const customCategories = [
      { id: '99', name: 'Productos de Limpieza', emoji: '🧹' },
    ]
    const result = suggestCategory('jabón', customCategories)
    expect(result).toEqual({ id: '99', name: 'Productos de Limpieza', emoji: '🧹' })
  })

  it('returns null when house has no matching category at all', () => {
    // House only has categories that don't match "Limpieza"
    const customCategories = [
      { id: '99', name: 'Frutas y Verduras', emoji: '🍎' },
      { id: '100', name: 'Carnes', emoji: '🥩' },
    ]
    const result = suggestCategory('jabón', customCategories)
    expect(result).toBeNull()
  })

  it('matches with accented house category names', () => {
    const customCategories = [
      { id: '99', name: 'Lácteos y Derivados', emoji: '🥛' },
    ]
    const result = suggestCategory('leche', customCategories)
    expect(result).toEqual({ id: '99', name: 'Lácteos y Derivados', emoji: '🥛' })
  })
})

// ─── suggestCategory — bidirectional matching ────────────────

describe('suggestCategory — bidirectional keyword matching', () => {
  it('matches when input is a substring of a keyword (partial typing)', () => {
    // User types "deter" which is contained in the keyword "detergente"
    const result = suggestCategory('deter', MOCK_CATEGORIES)
    // The keyword "detergente" includes "deter", so it should match
    expect(result).not.toBeNull()
  })

  it('matches when input contains a keyword', () => {
    // User types "jabón de manos" which contains keyword "jabón"
    const result = suggestCategory('jabón de manos', MOCK_CATEGORIES)
    expect(result).not.toBeNull()
    expect(result.name).toBe('Limpieza')
  })

  it('matches compound items containing a keyword', () => {
    const result = suggestCategory('leche deslactosada', MOCK_CATEGORIES)
    expect(result).not.toBeNull()
    expect(result.name).toBe('Lácteos')
  })
})

// ─── suggestCategory — return shape ──────────────────────────

describe('suggestCategory — return shape', () => {
  it('returns object with id, name, and emoji', () => {
    const result = suggestCategory('jabón', MOCK_CATEGORIES)
    expect(result).toHaveProperty('id')
    expect(result).toHaveProperty('name')
    expect(result).toHaveProperty('emoji')
    expect(typeof result.id).toBe('string')
    expect(typeof result.name).toBe('string')
    expect(typeof result.emoji).toBe('string')
  })

  it('does not leak extra fields from the category object', () => {
    const categoriesWithExtra = [
      { id: '1', name: 'Limpieza', emoji: '🧹', secret: 'should-not-leak' },
    ]
    const result = suggestCategory('jabón', categoriesWithExtra)
    expect(Object.keys(result)).toEqual(['id', 'name', 'emoji'])
  })
})
