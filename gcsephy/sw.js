// GCSE resources service worker (scope: /gcsephy/).
// Keeps pages fresh rather than offline: nothing is stored in Cache Storage.
// Same-origin GETs revalidate with the server on every load (a cheap 304 when
// unchanged), so edits appear immediately instead of after the 10-minute HTTP
// cache window. If the network is down, the browser's HTTP cache is used.

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  if (new URL(req.url).origin !== self.location.origin) return;

  event.respondWith((async () => {
    try {
      return await fetch(req, { cache: 'no-cache' });
    } catch (error) {
      try {
        return await fetch(req, { cache: 'only-if-cached', mode: 'same-origin' });
      } catch {
        throw error;
      }
    }
  })());
});
