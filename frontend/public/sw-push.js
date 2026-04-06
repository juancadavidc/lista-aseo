// Push notification handler for Casa Limpia PWA
self.addEventListener('push', (event) => {
  let data = { title: 'Casa Limpia', body: 'Tienes una nueva notificacion' }
  try {
    if (event.data) {
      data = event.data.json()
    }
  } catch {
    // Use defaults
  }

  const options = {
    body: data.body,
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    data: data.url || '/',
    vibrate: [200, 100, 200],
  }

  event.waitUntil(self.registration.showNotification(data.title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus()
        }
      }
      return clients.openWindow(event.notification.data || '/')
    })
  )
})
