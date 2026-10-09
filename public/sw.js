// public/sw.js
const CACHE_NAME = 'slbi-shell-v1'
const OFFLINE_URL = '/'

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.add(OFFLINE_URL))
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(OFFLINE_URL))
    )
  }
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
