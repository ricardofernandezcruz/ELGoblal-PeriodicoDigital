/* Service worker de El Global: avisos de última hora y una página sin conexión.
   No guarda en caché las noticias (siempre se leen frescas). */
const OFFLINE = '/offline.html'

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open('eg-v1').then((c) => c.addAll([OFFLINE, '/icon-192.png'])))
  self.skipWaiting()
})

self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()))

// Solo para páginas: si no hay red, se muestra el aviso sin conexión.
self.addEventListener('fetch', (e) => {
  if (e.request.mode !== 'navigate') return
  e.respondWith(fetch(e.request).catch(() => caches.match(OFFLINE)))
})

self.addEventListener('push', (e) => {
  let d = {}
  try {
    d = e.data ? e.data.json() : {}
  } catch {}
  e.waitUntil(
    self.registration.showNotification(d.title || 'El Global', {
      body: d.body || '',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: 'eg-breaking',
      renotify: true,
      data: { url: d.url || '/' },
    }),
  )
})

self.addEventListener('notificationclick', (e) => {
  e.notification.close()
  const url = new URL(e.notification.data?.url || '/', self.location.origin).href
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      const open = list.find((c) => c.url.startsWith(self.location.origin))
      if (open) return open.navigate(url).then((c) => c && c.focus())
      return self.clients.openWindow(url)
    }),
  )
})
