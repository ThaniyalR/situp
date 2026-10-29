const CACHE_NAME = 'party-play-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/manifest.json',
  '/static/manifest.json',
  '/static/css/styles.css',
  '/static/css/style.css',
  '/static/js/sound.js',
  '/static/js/confetti.js',
  '/static/js/game-animal.js',
  '/static/js/game-imposter.js',
  '/static/js/game-movie.js',
  '/static/js/game-song.js',
  '/static/js/game-party.js',
  '/static/js/main.js',
  '/static/img/logo.png',
  '/static/img/logo-192.png',
  '/static/img/logo-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE).catch((err) => {
        console.warn('Some cache assets failed to fetch', err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // For API or SSE requests, don't cache
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  // Network first with cache fallback
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) return cachedResponse;
          if (event.request.mode === 'navigate') {
            return caches.match('/');
          }
        });
      })
  );
});

