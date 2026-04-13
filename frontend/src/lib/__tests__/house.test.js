import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  getActiveHouse,
  setActiveHouse,
  clearActiveHouse,
  AVATARS,
  COLORS,
} from '../house'

describe('house storage helpers', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    localStorage.clear()
  })

  describe('getActiveHouse', () => {
    it('retorna null cuando no hay casa guardada', () => {
      expect(getActiveHouse()).toBeNull()
    })

    it('retorna la casa guardada como objeto', () => {
      const house = { id: 'h1', name: 'Casa' }
      localStorage.setItem('casalimpia_active_house', JSON.stringify(house))
      expect(getActiveHouse()).toEqual(house)
    })

    it('retorna null cuando el JSON es invalido', () => {
      localStorage.setItem('casalimpia_active_house', 'not-json{')
      expect(getActiveHouse()).toBeNull()
    })

    it('retorna null cuando el valor guardado es "null"', () => {
      localStorage.setItem('casalimpia_active_house', 'null')
      expect(getActiveHouse()).toBeNull()
    })
  })

  describe('setActiveHouse', () => {
    it('guarda la casa serializada en localStorage', () => {
      const house = { id: 'h1', name: 'Mi casa' }
      setActiveHouse(house)
      expect(localStorage.getItem('casalimpia_active_house')).toBe(JSON.stringify(house))
    })

    it('sobrescribe la casa anterior', () => {
      setActiveHouse({ id: 'a' })
      setActiveHouse({ id: 'b' })
      expect(getActiveHouse()).toEqual({ id: 'b' })
    })
  })

  describe('clearActiveHouse', () => {
    it('borra la casa guardada', () => {
      setActiveHouse({ id: 'h1' })
      clearActiveHouse()
      expect(getActiveHouse()).toBeNull()
    })

    it('no falla cuando no hay nada guardado', () => {
      expect(() => clearActiveHouse()).not.toThrow()
    })
  })
})

describe('AVATARS y COLORS', () => {
  it('AVATARS es un array de strings no vacio', () => {
    expect(Array.isArray(AVATARS)).toBe(true)
    expect(AVATARS.length).toBeGreaterThan(0)
    expect(AVATARS.every((a) => typeof a === 'string' && a.length > 0)).toBe(true)
  })

  it('COLORS es un array de hex colors validos', () => {
    expect(Array.isArray(COLORS)).toBe(true)
    expect(COLORS.length).toBeGreaterThan(0)
    expect(COLORS.every((c) => /^#[0-9a-fA-F]{6}$/.test(c))).toBe(true)
  })
})
