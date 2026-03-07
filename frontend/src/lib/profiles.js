import { fetchProfiles, createProfile, updateProfile, deleteProfile } from './api'

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

export async function getProfiles() {
  return fetchProfiles()
}

export async function saveProfile(profile) {
  if (profile.id) {
    return updateProfile(profile.id, { name: profile.name, avatar: profile.avatar, color: profile.color })
  }
  return createProfile({ name: profile.name, avatar: profile.avatar, color: profile.color })
}

export async function removeProfile(id) {
  return deleteProfile(id)
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
