// Homepage navigations must never fall back to a previously deployed UI.
// The old app-shell cache stored '/' indefinitely and could resurface stale
// desktop/mobile markup when the connection failed during a refresh.
const LEGACY_SHELL_CACHE_PREFIX = 'slbi-shell-evergreen-'

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((key) => key.startsWith(LEGACY_SHELL_CACHE_PREFIX))
          .map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  if (event.request.mode !== 'navigate') return
  const url = new URL(event.request.url)
  if (url.origin !== self.location.origin || url.pathname !== '/') return
  // Only the public Home route opts out of cached navigation documents.
  event.respondWith(fetch(event.request, { cache: 'no-store' }))
})

self.addEventListener('push', (event) => {
  if (!event.data) return
  let payload
  try {
    payload = event.data.json()
  } catch {
    payload = { title: 'SLBI', body: event.data.text(), url: '/' }
  }
  event.waitUntil(
    self.registration.showNotification(payload.title || 'SL Business Index', {
      body: payload.body || '',
      icon: '/icons/pwa-192.png',
      badge: '/icons/pwa-192.png',
      data: { url: payload.url || '/' },
      tag: payload.tag || 'slbi-notification',
      requireInteraction: false,
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const targetUrl = event.notification.data?.url || '/'
  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        const existing = clientList.find((c) => c.url === targetUrl && 'focus' in c)
        if (existing) return existing.focus()
        return self.clients.openWindow(targetUrl)
      })
  )
})
