/*
 * Nova Music Lab service worker.
 * The app is fully static and client-side, so offline support is simple:
 * - navigations: network-first (deploys show up), cached shell offline
 * - hashed Vite assets: cache-first (their filenames are immutable)
 * - public files without hashes: network-first so CV, icons and artwork update
 * - cross-origin (fonts, art CDNs): never intercepted or cached here
 */
const CACHE_PREFIX = 'nova-music-lab-';
const CACHE = `${CACHE_PREFIX}v4`;
const SHELL_URL = new URL('index.html', self.registration.scope).href;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.add(SHELL_URL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      // GitHub Pages projects share one origin. Never remove another app's
      // cache; only retire older Nova Music Lab namespaces.
      .then((keys) => Promise.all(keys
        .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE)
        .map((key) => caches.delete(key))))
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
          if (resp.ok) {
            const copy = resp.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy));
          }
          return resp;
        })
        .catch(() =>
          caches.match(request).then((hit) => hit ?? caches.match(SHELL_URL)),
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
