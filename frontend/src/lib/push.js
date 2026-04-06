import { getActiveHouse } from './house'

const API_BASE = import.meta.env.VITE_API_URL || '/api'

function getHeaders() {
  const house = getActiveHouse()
  return {
    'Content-Type': 'application/json',
    ...(house ? { 'x-house-id': house.id } : {}),
  }
}

export function isPushSupported() {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}

export async function getVapidKey() {
  const res = await fetch(`${API_BASE}/push/vapid-key`)
  const data = await res.json()
  return data.publicKey
}

export async function getPushStatus() {
  const res = await fetch(`${API_BASE}/push/status`, {
    credentials: 'include',
    headers: getHeaders(),
  })
  const data = await res.json()
  return data.subscribed
}

export async function subscribeToPush() {
  const registration = await navigator.serviceWorker.ready
  const vapidKey = await getVapidKey()
  if (!vapidKey) throw new Error('VAPID key not configured on server')

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') throw new Error('Permiso de notificaciones denegado')

  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidKey),
  })

  const subJson = subscription.toJSON()

  const res = await fetch(`${API_BASE}/push/subscribe`, {
    method: 'POST',
    credentials: 'include',
    headers: getHeaders(),
    body: JSON.stringify({
      endpoint: subJson.endpoint,
      keys: subJson.keys,
    }),
  })

  if (!res.ok) throw new Error('Error al guardar suscripcion')
  return true
}

export async function unsubscribeFromPush() {
  const registration = await navigator.serviceWorker.ready
  const subscription = await registration.pushManager.getSubscription()

  if (subscription) {
    const endpoint = subscription.endpoint
    await subscription.unsubscribe()

    await fetch(`${API_BASE}/push/subscribe`, {
      method: 'DELETE',
      credentials: 'include',
      headers: getHeaders(),
      body: JSON.stringify({ endpoint }),
    })
  }

  return true
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}
