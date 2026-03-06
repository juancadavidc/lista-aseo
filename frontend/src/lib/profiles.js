const PROFILES_KEY = 'casalimpia_profiles'
const ACTIVE_KEY = 'casalimpia_active_profile'

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

export function getProfiles() {
  try {
    return JSON.parse(localStorage.getItem(PROFILES_KEY)) || []
  } catch {
    return []
  }
}

export function saveProfiles(profiles) {
  localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles))
}

export function getActiveProfile() {
  try {
    return JSON.parse(localStorage.getItem(ACTIVE_KEY)) || null
  } catch {
    return null
  }
}

export function setActiveProfile(profile) {
  localStorage.setItem(ACTIVE_KEY, JSON.stringify(profile))
}

export function clearActiveProfile() {
  localStorage.removeItem(ACTIVE_KEY)
}
