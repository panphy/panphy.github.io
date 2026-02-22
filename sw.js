const BUILD_ID = '2026-02-22T22:35:00Z';
const CACHE_PREFIX = 'panphy-labs';
const PRECACHE_NAME = `${CACHE_PREFIX}-precache-${BUILD_ID}`;
const RUNTIME_CACHE = `${CACHE_PREFIX}-runtime-${BUILD_ID}`;
const CORS_REQUIRED_ASSETS = new Set([
  'https://cdn.jsdelivr.net/npm/three@0.161.0/build/three.module.js'
]);

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
  '/tools/markdown_editor/templates/math-basic.md',
  '/tools/markdown_editor/templates/math-calculus.md',
  '/tools/markdown_editor/templates/math-matrices.md',
  '/tools/markdown_editor/templates/math-table.md',
  '/tools/panphyplot.html',
  '/tools/panphyplot/css/panphyplot.css',
  '/tools/panphyplot/js/curve-fitting.js',
  '/tools/panphyplot/js/data-processing.js',
  '/tools/panphyplot/js/fit-worker.js',
  '/tools/panphyplot/js/latex-rendering.js',
  '/tools/panphyplot/js/main.js',
  '/tools/panphyplot/js/plotting.js',
  '/tools/panphyplot/js/state.js',
  '/tools/panphyplot/js/ui.js',
  'https://cdn.plot.ly/plotly-basic-2.29.1.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/mathjs/11.5.0/math.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/mathjax/2.7.5/MathJax.js?config=TeX-AMS-MML_SVG.js',
  '/tools/panphyplot/panphyplot_manual.html',
  '/tools/panphyplot/math_ref.html',
  'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.8.0/highlight.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.8.0/styles/default.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.8.0/styles/monokai.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.8.0/styles/github.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.8.0/styles/github-dark.min.css',
  'https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-svg.js',
  'https://cdn.jsdelivr.net/npm/marked@4.3.0/marked.min.js',
  'https://cdn.jsdelivr.net/npm/dompurify@2.3.4/dist/purify.min.js',
  'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js',
  '/tools/motion_tracker.html',
  'https://cdn.jsdelivr.net/npm/chart.js',
  '/tools/sound_analyzer.html',
  '/tools/tone_generator.html',

  // Simulations
  '/simulations/superposition.html',
  '/simulations/standing_wave.html',
  '/simulations/lorentz.html',
  '/simulations/lorentz_learn.html',
  '/simulations/collision.html',
  '/simulations/collision/styles.css',
  '/simulations/collision/app.js',
  'https://cdn.jsdelivr.net/npm/three@0.161.0/build/three.module.js',
  '/simulations/collision/collision_assets/models/hand_landmarker.task',
  '/simulations/collision/collision_assets/mediapipe/tasks-vision-0.10.32/vision_bundle.mjs',
  '/simulations/collision/collision_assets/mediapipe/tasks-vision-0.10.32/wasm/vision_wasm_internal.js',
  '/simulations/collision/collision_assets/mediapipe/tasks-vision-0.10.32/wasm/vision_wasm_internal.wasm',
  '/simulations/collision/collision_assets/mediapipe/tasks-vision-0.10.32/wasm/vision_wasm_nosimd_internal.js',
  '/simulations/collision/collision_assets/mediapipe/tasks-vision-0.10.32/wasm/vision_wasm_nosimd_internal.wasm',

  // For Teachers
  '/for_teachers/timer.html',
  '/for_teachers/timer_beep.mp3',
  '/for_teachers/visualizer.html',

  // Fun
  '/fun/react.html',
  '/fun/ascii_cam.html'
];

// Install: pre-cache your core pages
self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(PRECACHE_NAME);
    await Promise.allSettled(ASSETS_TO_CACHE.map(async (url) => {
      try {
        const resolvedUrl = new URL(url, self.location.origin);
        const isSameOrigin = resolvedUrl.origin === self.location.origin;
        const isCorsRequired = CORS_REQUIRED_ASSETS.has(resolvedUrl.href);
        const requestModes = isSameOrigin
          ? ['same-origin']
          : (isCorsRequired ? ['cors'] : ['cors', 'no-cors']);
        let precached = false;

        for (const mode of requestModes) {
          try {
            const fetchUrl = new URL(resolvedUrl.href);
            if (isSameOrigin) {
              fetchUrl.searchParams.set('v', BUILD_ID);
            }
            const res = await fetch(
              new Request(fetchUrl.href, {
                cache: 'no-store',
                mode
              })
            );

            const isOpaque = res.type === 'opaque';
            if (res.ok || isOpaque) {
              if (isCorsRequired && isOpaque) {
                continue;
              }
              await cache.put(resolvedUrl.href, res);
              precached = true;
              break;
            }
          } catch (fetchErr) {
            // Try fallback mode (if available) before logging.
          }
        }

        if (!precached) {
          console.warn('Precache failed:', url);
        }
      } catch (e) {
        console.warn('Precache failed:', url, e);
      }
    }));
  })());
});

self.addEventListener('message', (event) => {
  if (event && event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Activate: clear old caches, then claim clients.
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
    await self.clients.claim();
  })());
});

function getNavigationFallbackCandidates(requestUrl) {
  const candidates = [];
  const pathname = requestUrl.pathname;

  // Try exact route, then route with trailing slash handling, then index fallback.
  if (pathname === '/') {
    candidates.push('/');
    candidates.push('/index.html');
  } else {
    candidates.push(pathname);
    if (pathname.endsWith('/')) {
      candidates.push(`${pathname}index.html`);
    } else {
      candidates.push(`${pathname}/index.html`);
    }
  }

  candidates.push('/index.html');
  return [...new Set(candidates)];
}

// Search only this SW version's caches (precache first, then runtime).
async function matchCurrentCaches(request) {
  const precache = await caches.open(PRECACHE_NAME);
  const hit = await precache.match(request);
  if (hit) return hit;
  const runtime = await caches.open(RUNTIME_CACHE);
  return runtime.match(request);
}

// Fetch: cache-first for navigations and assets
self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Don't try to cache non-GET (POST, etc.)
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  const isSameOrigin = url.origin === self.location.origin;
  const isSupabaseApi = !isSameOrigin && url.hostname.endsWith('.supabase.co');
  const isBetaPath = isSameOrigin && (url.pathname === '/beta' || url.pathname.startsWith('/beta/'));

  // Keep all beta routes/assets network-only (no SW cache reads/writes).
  if (isBetaPath) {
    event.respondWith(fetch(req));
    return;
  }
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

  // Navigations: Cache first
  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      const navigationCandidates = getNavigationFallbackCandidates(url);

      for (const candidate of navigationCandidates) {
        const cachedCandidate = await matchCurrentCaches(candidate);
        if (cachedCandidate) return cachedCandidate;
      }

      try {
        const preload = await event.preloadResponse;
        const fresh = preload || await fetch(req);
        if (fresh && (fresh.ok || fresh.type === 'opaque')) {
          const cache = await caches.open(RUNTIME_CACHE);
          await cache.put(req, fresh.clone());
        }
        return fresh;
      } catch {
        return Response.error();
      }
    })());
    return;
  }

  // Assets (same-origin and cross-origin): cache-first, then fetch and store
  event.respondWith((async () => {
    const cached = await matchCurrentCaches(req);
    if (cached) {
      // Opaque responses cannot satisfy CORS requests (e.g. module scripts).
      if (!(req.mode === 'cors' && cached.type === 'opaque')) {
        return cached;
      }
    }

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
