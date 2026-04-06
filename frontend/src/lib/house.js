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

export const AVATARS = [
  '🧑', '👩', '👨', '🧒', '👧', '👦',
  '🐱', '🐶', '🐰', '🐻', '🦊', '🐸',
  '🌿', '🌸', '🌻', '🍀', '🌈', '🔥',
  '🏠', '⭐', '🌙', '💎', '🎵', '🦋',
  '🍕', '☕', '🎨', '🚀', '👑', '🎯',
]

export const COLORS = [
  '#6a9960',  // moss green
  '#b85a3a',  // clay/rust
  '#5b82b8',  // blue
  '#b8a55b',  // gold/olive
  '#8b5bb8',  // purple
  '#b85b8a',  // rose
  '#5bb8a5',  // teal
  '#b87a5b',  // warm orange
  '#e07b4c',  // bright orange
  '#4a8c6f',  // emerald
  '#c25d7e',  // raspberry
  '#6b7fb8',  // periwinkle
  '#9b8a5e',  // khaki
  '#7b6aa0',  // lavender
  '#d4915e',  // peach
  '#5a9ca0',  // ocean
]
