const CACHE_NAME = 'learning-academy-runtime-v1';
const CACHEABLE_ASSET = /\.(?:js|css|woff2?|ttf|svg|png|webp|jpe?g)$/i;

self.addEventListener('install', event => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  const scopeUrl = new URL(self.registration.scope);
  if (url.origin !== self.location.origin || !url.pathname.startsWith(scopeUrl.pathname)) return;

  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      try {
        const response = await fetch(request);
        if (response.ok) {
          try { await cache.put(request, response.clone()); } catch { /* Keep the online response if storage is full. */ }
        }
        return response;
      } catch {
        return await cache.match(request) ?? await cache.match(scopeUrl.href) ??
          new Response('This page is not available offline yet. Open Learning Academy while online first.', {
            status: 503,
            headers: { 'Content-Type': 'text/plain; charset=utf-8' }
          });
      }
    })());
    return;
  }

  if (!CACHEABLE_ASSET.test(url.pathname)) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request);
    if (cached) return cached;

    try {
      const response = await fetch(request);
      if (response.ok && response.type === 'basic') {
        try { await cache.put(request, response.clone()); } catch { /* Keep the online response if storage is full. */ }
      }
      return response;
    } catch {
      return await cache.match(request) ?? new Response('This lesson asset is not available offline yet.', { status: 503 });
    }
  })());
});
