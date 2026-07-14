/*
 * Nova Music Lab service worker.
 * The app is fully static and client-side, so offline support is simple:
 * - navigations: network-first (deploys show up), cached shell offline
 * - hashed Vite assets: cache-first (their filenames are immutable)
 * - public files without hashes: network-first so CV, icons and artwork update
 * - cross-origin (fonts, art CDNs): never intercepted or cached here
 */
const CACHE = 'nova-music-lab-v3';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((resp) => {
          const copy = resp.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
          return resp;
        })
        .catch(() =>
          caches.match(request).then((hit) => hit ?? caches.match('./index.html')),
        ),
    );
    return;
  }

  const isHashedViteAsset = /\/assets\/[^/]+-[A-Za-z0-9_-]{8,}\.[A-Za-z0-9]+$/.test(url.pathname);
  if (isHashedViteAsset) {
    event.respondWith(
      caches.match(request).then(
        (hit) => hit ?? fetch(request).then((resp) => {
          if (resp.ok) caches.open(CACHE).then((cache) => cache.put(request, resp.clone()));
          return resp;
        }),
      ),
    );
    return;
  }

  event.respondWith(
    fetch(request)
      .then((resp) => {
        if (resp.ok) caches.open(CACHE).then((cache) => cache.put(request, resp.clone()));
        return resp;
      })
      .catch(() => caches.match(request)),
  );
});
