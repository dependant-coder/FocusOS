// FocusOS Service Worker — stub for Phase 13 polish
const CACHE_NAME = 'focusos-v1'
const SHELL_ASSETS = ['/']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_ASSETS))
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
  // Network-first strategy — always try network, fallback to cache
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  )
})

// Push notification handler (Phase 12)
self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? { title: 'FocusOS', body: 'Time to check your tasks!' }
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      vibrate: [100, 50, 100],
    })
  )
})
