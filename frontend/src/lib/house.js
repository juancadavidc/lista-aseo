const HOUSE_KEY = 'casalimpia_active_house'

export function getActiveHouse() {
  try {
    return JSON.parse(localStorage.getItem(HOUSE_KEY)) || null
  } catch {
    return null
  }
}

export function setActiveHouse(house) {
  localStorage.setItem(HOUSE_KEY, JSON.stringify(house))
}

export function clearActiveHouse() {
  localStorage.removeItem(HOUSE_KEY)
}

export const AVATARS = ['🧑', '👩', '👨', '🧒', '👧', '👦', '🐱', '🐶', '🌿', '🌸', '🏠', '⭐']

export const COLORS = [
  '#6a9960',
  '#b85a3a',
  '#5b82b8',
  '#b8a55b',
  '#8b5bb8',
  '#b85b8a',
  '#5bb8a5',
  '#b87a5b',
]
