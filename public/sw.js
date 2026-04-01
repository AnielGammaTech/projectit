// ProjectIT Service Worker — network-first for pages & assets, offline fallback
const CACHE_NAME = 'projectit-v2';

// Install: skip waiting to activate immediately
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// Activate: clean ALL old caches, take control immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Fetch: network-first for everything, cache as fallback for offline
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip API requests and third-party requests
  if (url.pathname.startsWith('/api/') || url.hostname.includes('api-production') || url.origin !== self.location.origin) {
    return;
  }

  // Network-first: always try fresh content, fall back to cache for offline
  event.respondWith(
    fetch(request)
      .then((response) => {
        // Cache successful responses for offline fallback
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      })
      .catch(() => caches.match(request).then((r) => r || (request.mode === 'navigate' ? caches.match('/') : undefined)))
  );
});
