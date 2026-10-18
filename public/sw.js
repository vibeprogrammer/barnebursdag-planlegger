const CACHE = 'bursdag-v6';
const ASSETS = ['/', '/icon.svg', '/manifest.webmanifest'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return; // third-party (e.g. AdSense) goes straight to the network
  if (url.pathname.startsWith('/api/')) return; // never cache API
  if (e.request.method !== 'GET') return;

  // The AI-agent index changes with every content deploy: network first, cached copy only when offline.
  if (url.pathname === '/agentprose.json') {
    e.respondWith(
      fetch(e.request)
        .then(async (response) => {
          if (response.ok) {
            const cache = await caches.open(CACHE);
            await cache.put(e.request, response.clone());
          }
          return response;
        })
        .catch(() => caches.match(e.request).then((hit) => hit || Response.error()))
    );
    return;
  }

  if (e.request.mode === 'navigate') {
    const cacheKey = url.pathname === '/' || url.pathname === '/index.html' ? '/' : e.request;
    e.respondWith(
      fetch(e.request)
        .then(async (response) => {
          if (response.ok) {
            // Home aliases share one key; content documents keep their own URL.
            const cache = await caches.open(CACHE);
            await cache.put(cacheKey, response.clone());
          }
          return response;
        })
        .catch(() => caches.match(cacheKey).then((hit) => hit || caches.match('/')))
    );
    return;
  }

  e.respondWith(
    caches.match(e.request).then(
      (cached) =>
        cached ||
        fetch(e.request)
          .then((r) => {
            const copy = r.clone();
            caches.open(CACHE).then((c) => c.put(e.request, copy));
            return r;
          })
          .catch(() => caches.match('/'))
    )
  );
});
