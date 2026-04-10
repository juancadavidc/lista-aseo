import { describe, it, expect } from 'vitest'
import { normalizeText, suggestCategory } from '../smartTags'

// Fake categories that a typical house might have.
// NOTE: The dictionary uses categories like "Higiene" and "Bebé" that must be
// present here for keywords like "jabon" or "shampoo" to resolve correctly.
const CATEGORIES = [
  { id: 'cat-1', name: 'Limpieza', emoji: '🧹' },
  { id: 'cat-2', name: 'Frutas y Verduras', emoji: '🥬' },
  { id: 'cat-3', name: 'Despensa', emoji: '🏪' },
  { id: 'cat-4', name: 'Lácteos', emoji: '🥛' },
  { id: 'cat-5', name: 'Carnes', emoji: '🥩' },
  { id: 'cat-6', name: 'Bebidas', emoji: '🍺' },
  { id: 'cat-7', name: 'Herramientas', emoji: '🧰' },
  { id: 'cat-8', name: 'Papel', emoji: '🧻' },
  { id: 'cat-9', name: 'Salud', emoji: '💊' },
  { id: 'cat-10', name: 'Mascotas', emoji: '🐾' },
  { id: 'cat-11', name: 'Higiene', emoji: '🧴' },
]

describe('normalizeText', () => {
  it('convierte a minúsculas', () => {
    expect(normalizeText('DETERGENTE')).toBe('detergente')
  })

  it('elimina acentos', () => {
    expect(normalizeText('jabón')).toBe('jabon')
    expect(normalizeText('lácteos')).toBe('lacteos')
    expect(normalizeText('plátano')).toBe('platano')
  })

  it('trimea espacios', () => {
    expect(normalizeText('  arroz  ')).toBe('arroz')
  })

  it('maneja string vacío', () => {
    expect(normalizeText('')).toBe('')
  })
})

describe('suggestCategory', () => {
  describe('keyword exacto', () => {
    it('cloro → Limpieza', () => {
      const result = suggestCategory('cloro', CATEGORIES)
      expect(result).toEqual({ id: 'cat-1', name: 'Limpieza', emoji: '🧹' })
    })

    it('detergente → Limpieza', () => {
      const result = suggestCategory('detergente', CATEGORIES)
      expect(result).toEqual({ id: 'cat-1', name: 'Limpieza', emoji: '🧹' })
    })

    it('lechuga → Frutas y Verduras', () => {
      const result = suggestCategory('lechuga', CATEGORIES)
      expect(result).toEqual({ id: 'cat-2', name: 'Frutas y Verduras', emoji: '🥬' })
    })

    it('arroz → Despensa', () => {
      const result = suggestCategory('arroz', CATEGORIES)
      expect(result).toEqual({ id: 'cat-3', name: 'Despensa', emoji: '🏪' })
    })

    it('leche → Lácteos', () => {
      const result = suggestCategory('leche', CATEGORIES)
      expect(result).toEqual({ id: 'cat-4', name: 'Lácteos', emoji: '🥛' })
    })

    it('pollo → Carnes', () => {
      const result = suggestCategory('pollo', CATEGORIES)
      expect(result).toEqual({ id: 'cat-5', name: 'Carnes', emoji: '🥩' })
    })

    it('cerveza → Bebidas', () => {
      const result = suggestCategory('cerveza', CATEGORIES)
      expect(result).toEqual({ id: 'cat-6', name: 'Bebidas', emoji: '🍺' })
    })

    it('escoba → Herramientas', () => {
      const result = suggestCategory('escoba', CATEGORIES)
      expect(result).toEqual({ id: 'cat-7', name: 'Herramientas', emoji: '🧰' })
    })

    it('papel higienico → Papel', () => {
      const result = suggestCategory('papel higienico', CATEGORIES)
      expect(result).toEqual({ id: 'cat-8', name: 'Papel', emoji: '🧻' })
    })

    it('vitaminas → Salud', () => {
      const result = suggestCategory('vitaminas', CATEGORIES)
      expect(result).toEqual({ id: 'cat-9', name: 'Salud', emoji: '💊' })
    })

    it('comida para perro → Mascotas', () => {
      const result = suggestCategory('comida para perro', CATEGORIES)
      expect(result).toEqual({ id: 'cat-10', name: 'Mascotas', emoji: '🐾' })
    })
  })

  describe('match parcial (el input es substring del keyword)', () => {
    it('"det" matchea keyword que contiene "det" → Limpieza', () => {
      const result = suggestCategory('det', CATEGORIES)
      expect(result).not.toBeNull()
      expect(result.name).toBe('Limpieza')
    })

    it('"aspira" matchea con "aspiradora" → Herramientas', () => {
      const result = suggestCategory('aspira', CATEGORIES)
      expect(result).not.toBeNull()
      expect(result.name).toBe('Herramientas')
    })
  })

  describe('match directo tiene prioridad sobre match inverso', () => {
    it('"jabon" matchea directamente "jabon" (Limpieza), no "jabon de bano" (Higiene)', () => {
      // Two-pass: direct match (input contains keyword) wins over inverse
      const result = suggestCategory('jabon', CATEGORIES)
      expect(result).toEqual({ id: 'cat-1', name: 'Limpieza', emoji: '🧹' })
    })

    it('"manzana" matchea directamente "manzana" (Frutas), no "jugo de manzana" (Bebidas)', () => {
      const result = suggestCategory('manzana', CATEGORIES)
      expect(result).toEqual({ id: 'cat-2', name: 'Frutas y Verduras', emoji: '🥬' })
    })

    it('"jugo de manzana" sigue matcheando Bebidas (input contiene ambos keywords)', () => {
      const result = suggestCategory('jugo de manzana', CATEGORIES)
      expect(result).toEqual({ id: 'cat-6', name: 'Bebidas', emoji: '🍺' })
    })
  })

  describe('normalización de acentos y mayúsculas', () => {
    it('"plátano" (con acento) → Frutas y Verduras', () => {
      const result = suggestCategory('plátano', CATEGORIES)
      expect(result).toEqual({ id: 'cat-2', name: 'Frutas y Verduras', emoji: '🥬' })
    })

    it('"ARROZ" (mayúsculas) → Despensa', () => {
      const result = suggestCategory('ARROZ', CATEGORIES)
      expect(result).toEqual({ id: 'cat-3', name: 'Despensa', emoji: '🏪' })
    })

    it('"Desinfectante" (capitalizado) → Limpieza', () => {
      const result = suggestCategory('Desinfectante', CATEGORIES)
      expect(result).toEqual({ id: 'cat-1', name: 'Limpieza', emoji: '🧹' })
    })
  })

  describe('sin match', () => {
    it('palabra sin sentido retorna null', () => {
      expect(suggestCategory('asdfgh', CATEGORIES)).toBeNull()
    })

    it('string vacío retorna null', () => {
      expect(suggestCategory('', CATEGORIES)).toBeNull()
    })

    it('solo espacios retorna null', () => {
      expect(suggestCategory('   ', CATEGORIES)).toBeNull()
    })
  })

  describe('categoría no existe en la casa', () => {
    it('keyword matchea pero la casa no tiene esa categoría → null', () => {
      const limitedCategories = [
        { id: 'cat-1', name: 'Limpieza', emoji: '🧹' },
      ]
      // "arroz" matchea Despensa, pero no existe en limitedCategories
      expect(suggestCategory('arroz', limitedCategories)).toBeNull()
    })
  })

  describe('edge cases', () => {
    it('null input retorna null', () => {
      expect(suggestCategory(null, CATEGORIES)).toBeNull()
    })

    it('categorías vacías retorna null', () => {
      expect(suggestCategory('detergente', [])).toBeNull()
    })

    it('null categorías retorna null', () => {
      expect(suggestCategory('detergente', null)).toBeNull()
    })
  })
})
