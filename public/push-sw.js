// Service worker mínimo solo para Web Push (no es un PWA instalable:
// no hay manifest.json vinculado, así que no dispara el prompt de instalación).

// Fuerza que este SW pase a controlar la página de inmediato. Sin esto, un
// dispositivo que ya tenía el service worker viejo de la PWA (de antes de
// desactivarla) lo deja "esperando" para siempre y nunca llegan los push.
self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('push', (event) => {
  let data = {}
  try { data = event.data ? event.data.json() : {} } catch { /* payload no era JSON */ }

  const title = data.title || 'Nuevo aviso'
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || '',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      data: { url: data.url || '/' },
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url || '/'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) return client.focus()
      }
      if (self.clients.openWindow) return self.clients.openWindow(url)
    })
  )
})
