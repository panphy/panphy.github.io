const CACHE_NAME = 'panphy-2025-12-14';
const RUNTIME_CACHE = 'panphy-runtime-2025-12-14';

const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/favicon.png',
  '/panphy.png',
  '/manifest.json',

  // Tools
  '/tools/markdown_editor.html',
  '/tools/mkdwn_sample_doc.md',
  '/tools/mkdwn_sample_pic.webp',
  '/tools/panphyplot.html',
  '/tools/panphyplot_manual.html',
  '/tools/digitizer.html',
  '/tools/motion_tracker.html',
  '/tools/sound_analyzer.html',
  '/tools/tone_generator.html',
  '/tools/quadratic.html',

  // Simulations
  '/simulations/superposition.html',
  '/simulations/standing_wave.html',
  '/simulations/lorentz.html',

  // For Teachers
  '/for_teachers/timer.html',
  '/for_teachers/visualizer.html',

  // Fun
  '/fun/dodge.html',
  '/fun/ascii_cam.html'
];

// Install: pre-cache your core pages
self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    for (const url of ASSETS_TO_CACHE) {
      try {
        const res = await fetch(url, { cache: 'reload' });
        if (res.ok) await cache.put(url, res);
      } catch (e) {
        // keep going even if one file fails
        console.warn('Precache failed:', url, e);
      }
    }
  })());
  self.skipWaiting();
});

// Activate: clear old caches
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => {
      if (k !== CACHE_NAME && k !== RUNTIME_CACHE) return caches.delete(k);
    }));
  })());
  self.clients.claim();
});

// Fetch: network-first for navigations, cache-first for other assets
self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Don’t try to cache non-GET (POST, etc.)
  if (req.method !== 'GET') return;

  // Navigations: fetch fresh when online, fall back to cache/offline
  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(req);
        const cache = await caches.open(RUNTIME_CACHE);
        cache.put(req, fresh.clone());
        return fresh;
      } catch {
        const cached = await caches.match(req);
        if (cached) return cached;
        return (await caches.match('/index.html')) || Response.error();
      }
    })());
    return;
  }

  // Assets (same-origin and cross-origin): cache-first, then fetch and store
  event.respondWith((async () => {
    const cached = await caches.match(req);
    if (cached) return cached;

    try {
      const fresh = await fetch(req);
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(req, fresh.clone());
      return fresh;
    } catch {
      return Response.error();
    }
  })());
});
