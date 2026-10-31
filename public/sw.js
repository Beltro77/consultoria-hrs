// "Kill switch" del service worker viejo de la PWA (next-pwa / Workbox).
// La PWA se desactivó, pero los dispositivos que la tenían instalada siguen
// con ese SW sirviendo código cacheado viejo: como /sw.js devolvía 404, el
// navegador nunca lo reemplazaba. Ahora, al chequear actualizaciones, baja
// este script, que borra los cachés, se desregistra y recarga las pestañas.
// El push vuelve a registrarse solo (push-sw.js) al entrar al dashboard.

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys()
    await Promise.all(keys.map(k => caches.delete(k)))
    await self.registration.unregister()
    const clients = await self.clients.matchAll({ type: 'window' })
    clients.forEach(client => client.navigate(client.url))
  })())
})
