export const HOME_SCREENS = [
  { value: 'tasks',    label: 'Tareas',    route: '/tasks' },
  { value: 'shopping', label: 'Compras',   route: '/shopping' },
  { value: 'products', label: 'Productos', route: '/products' },
  { value: 'stats',    label: 'Stats',     route: '/stats' },
  { value: 'plants',   label: 'Plantas',   route: '/plants' },
]

const VALID_VALUES = HOME_SCREENS.map(s => s.value)

export const DEFAULT_HOME_SCREEN = 'tasks'

export function routeForHomeScreen(value) {
  const screen = HOME_SCREENS.find(s => s.value === value)
  return screen ? screen.route : '/'
}

function storageKey(houseId) {
  return `casa-limpia:home-screen:${houseId}`
}

export function getStoredHomeScreen(houseId) {
  if (!houseId || typeof window === 'undefined') return DEFAULT_HOME_SCREEN
  try {
    const value = window.localStorage.getItem(storageKey(houseId))
    return VALID_VALUES.includes(value) ? value : DEFAULT_HOME_SCREEN
  } catch {
    return DEFAULT_HOME_SCREEN
  }
}

export function setStoredHomeScreen(houseId, value) {
  if (!houseId || typeof window === 'undefined') return
  if (!VALID_VALUES.includes(value)) return
  try {
    window.localStorage.setItem(storageKey(houseId), value)
  } catch {
    // ignore quota / privacy errors
  }
}
