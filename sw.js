const BUILD_ID = '2026-02-08T17:58:00Z';
const CACHE_PREFIX = 'panphy-labs';
const PRECACHE_NAME = `${CACHE_PREFIX}-precache-${BUILD_ID}`;
const RUNTIME_CACHE = `${CACHE_PREFIX}-runtime-${BUILD_ID}`;

const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/assets/favicon.png',
  '/assets/apple-touch-icon.png',
  '/assets/panphy.png',
  '/manifest.json',

  // Tools
  '/tools/markdown_editor.html',
  '/assets/sw-register.js',
  '/tools/markdown_editor/css/markdown_editor.css',
  '/tools/markdown_editor/js/state.js',
  '/tools/markdown_editor/js/rendering.js',
  '/tools/markdown_editor/js/copy.js',
  '/tools/markdown_editor/js/ui.js',
  '/tools/markdown_editor/js/main.js',
  '/tools/markdown_editor/sample_doc.md',
  '/tools/markdown_editor/sample_pic.webp',
  '/tools/panphyplot.html',
  '/tools/panphyplot/css/panphyplot.css',
  '/tools/panphyplot/js/curve-fitting.js',
  '/tools/panphyplot/js/latex-rendering.js',
  '/tools/panphyplot/js/main.js',
  '/tools/panphyplot/js/plotting.js',
  '/tools/panphyplot/js/state.js',
  '/tools/panphyplot/js/ui.js',
  'https://cdn.plot.ly/plotly-2.29.1.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/mathjs/11.5.0/math.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/mathjax/2.7.5/MathJax.js?config=TeX-AMS-MML_SVG.js',
  '/tools/panphyplot/panphyplot_manual.html',
  'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.8.0/highlight.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.8.0/styles/default.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.8.0/styles/monokai.min.css',
  'https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-svg.js',
  'https://cdn.jsdelivr.net/npm/marked@4.3.0/marked.min.js',
  'https://cdn.jsdelivr.net/npm/dompurify@2.3.4/dist/purify.min.js',
  '/tools/digitizer.html',
  '/tools/motion_tracker.html',
  'https://cdn.jsdelivr.net/npm/chart.js',
  '/tools/sound_analyzer.html',
  '/tools/tone_generator.html',

  // Simulations
  '/simulations/superposition.html',
  '/simulations/standing_wave.html',
  '/simulations/lorentz.html',

  // For Teachers
  '/for_teachers/timer.html',
  '/for_teachers/visualizer.html',

  // Fun
  '/fun/react.html',
  '/fun/ascii_cam.html'
];

// Install: pre-cache your core pages
self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(PRECACHE_NAME);
    for (const url of ASSETS_TO_CACHE) {
      try {
        const resolvedUrl = new URL(url, self.location.origin);
        const isSameOrigin = resolvedUrl.origin === self.location.origin;
        const res = await fetch(
          new Request(resolvedUrl.href, {
            cache: 'reload',
            mode: isSameOrigin ? 'same-origin' : 'no-cors'
          })
        );
        if (res.ok || res.type === 'opaque') {
          await cache.put(resolvedUrl.href, res);
        }
      } catch (e) {
        // keep going even if one file fails
        console.warn('Precache failed:', url, e);
      }
    }
  })());
});

self.addEventListener('message', (event) => {
  if (event?.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Activate: clear old caches
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    if ('navigationPreload' in self.registration) {
      await self.registration.navigationPreload.enable();
    }
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => {
      if (k.startsWith(CACHE_PREFIX) && k !== PRECACHE_NAME && k !== RUNTIME_CACHE) {
        return caches.delete(k);
      }
      return null;
    }));
  })());
  self.clients.claim();
});

// Fetch: network-first for navigations, cache-first for other assets
self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Don’t try to cache non-GET (POST, etc.)
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  const isSameOrigin = url.origin === self.location.origin;
  const isSupabaseApi = !isSameOrigin && url.hostname.endsWith('.supabase.co');

  // Never cache the dodge game or provide offline fallback for it.
  if (isSameOrigin && (url.pathname === '/fun/dodge.html' || url.pathname.startsWith('/fun/dodge_assets/'))) {
    event.respondWith(fetch(req));
    return;
  }
  // Ensure leaderboards and other Supabase API calls stay fresh.
  if (isSupabaseApi) {
    event.respondWith(fetch(req));
    return;
  }

  // Navigations: fetch fresh when online, fall back to cache/offline
  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const preload = await event.preloadResponse;
        const fresh = preload || await fetch(req);
        if (fresh && (fresh.ok || fresh.type === 'opaque')) {
          const cache = await caches.open(RUNTIME_CACHE);
          cache.put(req, fresh.clone());
        }
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
      if (fresh && (fresh.ok || fresh.type === 'opaque')) {
        const cache = await caches.open(RUNTIME_CACHE);
        cache.put(req, fresh.clone());
      }
      return fresh;
    } catch {
      return Response.error();
    }
  })());
});
