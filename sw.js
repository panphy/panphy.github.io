const BUILD_ID = '2026-08-26T12:31:05Z';
const APP_VERSIONS = {
  core: BUILD_ID,
  panphymd: BUILD_ID,
  panphyplot: BUILD_ID,
  motion_tracker: BUILD_ID,
  sound_analyzer: BUILD_ID,
  tone_generator: BUILD_ID,
  ripple_tank: BUILD_ID,
  superposition: BUILD_ID,
  standing_wave: BUILD_ID,
  states: BUILD_ID,
  lorentz: BUILD_ID,
  collision: BUILD_ID,
  timer: BUILD_ID,
  visualizer: BUILD_ID,
  year9phy_unit01: BUILD_ID
};
const CACHE_PREFIX = 'panphy-labs';
const PRECACHE_NAME = `${CACHE_PREFIX}-precache-${BUILD_ID}`;
const RUNTIME_CACHE = `${CACHE_PREFIX}-runtime-${BUILD_ID}`;
const YEAR9_UNIT01_PATH_PREFIX = '/year9phy/unit01';
const YEAR9_UNIT01_ENTRY_PATHS = [
  '/year9phy/unit01/',
  '/year9phy/unit01/index.html'
];
const CORS_REQUIRED_ASSETS = new Set([
  'https://cdn.jsdelivr.net/npm/three@0.161.0/build/three.module.js',
  'https://cdn.jsdelivr.net/npm/three@0.161.0/examples/jsm/controls/OrbitControls.js'
]);

const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/assets/favicon.png',
  '/assets/apple-touch-icon.png',
  '/assets/panphy.png',
  '/assets/theme-toggle.css',
  '/assets/theme-toggle.js',
  '/assets/fullscreen-button.css',
  '/assets/fullscreen-button.js',
  '/manifest.json',

  // Tools
  '/tools/panphymd.html',
  '/assets/sw-register.js',
  '/tools/panphymd/css/panphymd.css',
  '/tools/panphymd/js/state.js',
  '/tools/panphymd/js/utils.js',
  '/tools/panphymd/js/rendering.js',
  '/tools/panphymd/js/copy.js',
  '/tools/panphymd/js/ui.js',
  '/tools/panphymd/js/main.js',
  '/tools/panphymd/sample_doc.md',
  '/tools/panphymd/templates/math-basic.md',
  '/tools/panphymd/templates/math-calculus.md',
  '/tools/panphymd/templates/math-matrices.md',
  '/tools/panphymd/templates/math-table.md',
  '/tools/panphyplot.html',
  '/tools/panphyplot/css/panphyplot.css',
  '/tools/panphyplot/js/curve-fitting.js',
  '/tools/panphyplot/js/data-processing.js',
  '/tools/panphyplot/js/fit-core.js',
  '/tools/panphyplot/js/fit-worker.js',
  '/tools/panphyplot/js/latex-rendering.js',
  '/tools/panphyplot/js/main.js',
  '/tools/panphyplot/js/plotting.js',
  '/tools/panphyplot/js/state.js',
  '/tools/panphyplot/js/ui.js',
  'https://cdn.plot.ly/plotly-basic-2.29.1.min.js',
  '/tools/panphyplot/js/vendor/math.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/mathjax/2.7.5/MathJax.js?config=TeX-AMS-MML_SVG.js',
  'https://cdnjs.cloudflare.com/ajax/libs/mathjax/2.7.5/config/TeX-AMS-MML_SVG.js?V=2.7.5',
  'https://cdnjs.cloudflare.com/ajax/libs/mathjax/2.7.5/jax/output/SVG/jax.js?V=2.7.5',
  'https://cdnjs.cloudflare.com/ajax/libs/mathjax/2.7.5/jax/output/SVG/fonts/TeX/fontdata.js?V=2.7.5',
  'https://cdnjs.cloudflare.com/ajax/libs/mathjax/2.7.5/jax/output/SVG/fonts/TeX/Main/Regular/GreekAndCoptic.js?V=2.7.5',
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
  '/simulations/ripple_tank.html',
  '/simulations/superposition.html',
  '/simulations/standing_wave.html',
  '/simulations/states.html',
  '/simulations/lorentz.html',
  '/simulations/lorentz_learn.html',
  '/simulations/collision.html',
  '/simulations/collision/styles.css',
  '/simulations/collision/app.js',
  'https://cdn.jsdelivr.net/npm/three@0.161.0/build/three.module.js',
  'https://cdn.jsdelivr.net/npm/three@0.161.0/examples/jsm/controls/OrbitControls.js',
  '/simulations/collision/collision_assets/models/hand_landmarker.task',
  '/simulations/collision/collision_assets/mediapipe/tasks-vision-0.10.32/vision_bundle.mjs',
  '/simulations/collision/collision_assets/mediapipe/tasks-vision-0.10.32/wasm/vision_wasm_internal.js',
  '/simulations/collision/collision_assets/mediapipe/tasks-vision-0.10.32/wasm/vision_wasm_internal.wasm',
  '/simulations/collision/collision_assets/mediapipe/tasks-vision-0.10.32/wasm/vision_wasm_nosimd_internal.js',
  '/simulations/collision/collision_assets/mediapipe/tasks-vision-0.10.32/wasm/vision_wasm_nosimd_internal.wasm',

  // For Teachers
  '/for_teachers/timer.html',
  '/for_teachers/visualizer.html',

  // Year 9 Physics companion site
  '/year9phy/unit01/index.html',
  '/year9phy/unit01/exam-zone/index.html',
  '/year9phy/unit01/lesson/trust-the-data/index.html',
  '/year9phy/unit01/lesson/variables-and-graphs/index.html',
  '/year9phy/unit01/lesson/shock-absorber/index.html',
  '/year9phy/unit01/lesson/ramp-line-graph/index.html',
  '/year9phy/unit01/lesson/best-fit-outliers/index.html',
  '/year9phy/unit01/lesson/solo-flight/index.html',
  '/year9phy/unit01/lesson/research-project/index.html',
  '/year9phy/unit01/assets/styles.css',
  '/year9phy/unit01/assets/lessons.js',
  '/year9phy/unit01/assets/site.js',
  '/year9phy/unit01/assets/exam-questions.js',
  '/year9phy/unit01/assets/exam-zone.js',
  '/year9phy/unit01/assets/og.png',
  '/year9phy/unit01/Work Like a Physicist - Year 9 Student Workbook.pdf',

];

async function cachePrecacheAsset(cache, url, onlyMissing) {
  try {
    const resolvedUrl = new URL(url, self.location.origin);
    if (onlyMissing && await cache.match(resolvedUrl.href)) {
      return true;
    }

    const isSameOrigin = resolvedUrl.origin === self.location.origin;
    const isCorsRequired = CORS_REQUIRED_ASSETS.has(resolvedUrl.href);
    const requestModes = isSameOrigin
      ? ['same-origin']
      : (isCorsRequired ? ['cors'] : ['cors', 'no-cors']);

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
          return true;
        }
      } catch (fetchErr) {
        // Try fallback mode (if available) before reporting the failure.
      }
    }
  } catch (error) {
    // Report the URL below so a malformed entry cannot abort the whole repair.
  }

  console.warn('Precache failed:', url);
  return false;
}

async function cachePrecacheAssets(onlyMissing = false) {
  const cache = await caches.open(PRECACHE_NAME);
  const results = await Promise.all(
    ASSETS_TO_CACHE.map(async (url) => ({
      url,
      cached: await cachePrecacheAsset(cache, url, onlyMissing)
    }))
  );
  const failed = results.filter((result) => !result.cached).map((result) => result.url);
  return {
    cached: results.length - failed.length,
    failed
  };
}

let precacheRepairPromise = null;

function repairPrecache() {
  if (!precacheRepairPromise) {
    precacheRepairPromise = cachePrecacheAssets(true)
      .finally(() => {
        precacheRepairPromise = null;
      });
  }
  return precacheRepairPromise;
}

let legacyYear9RefreshNeeded = false;

async function hasLegacyYear9Cache() {
  const cacheNames = await caches.keys();
  const oldPanPhyCaches = cacheNames.filter((cacheName) => (
    cacheName.startsWith(CACHE_PREFIX) && cacheName !== PRECACHE_NAME
  ));

  for (const cacheName of oldPanPhyCaches) {
    const cache = await caches.open(cacheName);
    for (const entryPath of YEAR9_UNIT01_ENTRY_PATHS) {
      const cachedPage = await cache.match(entryPath);
      if (!cachedPage || cachedPage.type === 'opaque') {
        continue;
      }

      try {
        const html = await cachedPage.clone().text();
        if (!html.includes('/assets/sw-register.js')) {
          return true;
        }
      } catch {
        // Ignore unreadable entries and continue checking the remaining caches.
      }
    }
  }

  return false;
}

async function refreshLegacyYear9Clients() {
  const windowClients = await self.clients.matchAll({
    type: 'window',
    includeUncontrolled: true
  });

  await Promise.all(windowClients.map(async (client) => {
    try {
      const clientUrl = new URL(client.url);
      if (clientUrl.origin === self.location.origin
        && clientUrl.pathname.startsWith(YEAR9_UNIT01_PATH_PREFIX)
        && typeof client.navigate === 'function') {
        await client.navigate(client.url);
      }
    } catch {
      // A client may close or navigate away while the new worker activates.
    }
  }));
}

// Install: pre-cache your core pages. Individual failures do not block the
// worker; the landing page can ask it to repair only the missing entries.
self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    await cachePrecacheAssets();

    // Companion pages cached before they registered the service worker cannot
    // display the update prompt. Activate immediately only for that legacy
    // state; normal future updates continue to wait for the user's approval.
    legacyYear9RefreshNeeded = await hasLegacyYear9Cache();
    if (legacyYear9RefreshNeeded) {
      await self.skipWaiting();
    }
  })());
});

self.addEventListener('message', (event) => {
  if (event && event.data) {
    if (event.data.type === 'SKIP_WAITING') {
      self.skipWaiting();
    } else if (event.data.type === 'REPAIR_PRECACHE') {
      const replyPort = event.ports && event.ports[0];
      event.waitUntil(
        repairPrecache()
          .then((result) => {
            if (replyPort) {
              replyPort.postMessage({ ok: result.failed.length === 0, ...result });
            }
          })
          .catch((error) => {
            console.warn('Precache repair failed:', error);
            if (replyPort) {
              replyPort.postMessage({ ok: false, cached: 0, failed: ASSETS_TO_CACHE });
            }
          })
      );
    } else if (event.data.type === 'GET_VERSION_MAP') {
      if (event.ports && event.ports[0]) {
        event.ports[0].postMessage({
          buildId: BUILD_ID,
          appVersions: APP_VERSIONS
        });
      }
    }
  }
});

// Activate: clear old caches, then claim clients.
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    // Recheck because a browser may restart the worker between install and
    // activate, which would clear the in-memory migration flag.
    legacyYear9RefreshNeeded = legacyYear9RefreshNeeded || await hasLegacyYear9Cache();

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

    if (legacyYear9RefreshNeeded) {
      await refreshLegacyYear9Clients();
    }
  })());
});

function getNavigationCandidates(requestUrl) {
  const candidates = [];
  const pathname = requestUrl.pathname;

  // Try exact route, then route with trailing slash handling.
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
  const isMiscPath = isSameOrigin && (url.pathname === '/misc' || url.pathname.startsWith('/misc/'));

  // Keep all beta routes/assets network-only (no SW cache reads/writes).
  if (isBetaPath) {
    event.respondWith(fetch(req));
    return;
  }
  // Keep all misc routes/assets network-only (no SW cache reads/writes).
  if (isMiscPath) {
    event.respondWith(fetch(req));
    return;
  }
  // All /fun/* routes are network-only (no SW cache reads/writes).
  const isFunPath = isSameOrigin && (url.pathname === '/fun' || url.pathname.startsWith('/fun/'));
  if (isFunPath) {
    event.respondWith(fetch(req));
    return;
  }
  // Ensure leaderboards and other Supabase API calls stay fresh.
  if (isSupabaseApi) {
    event.respondWith(fetch(req));
    return;
  }

  // Navigations: Cache first, network next, cached homepage only as offline fallback
  if (req.mode === 'navigate') {
    // Preserve the directory URL GitHub Pages normally enforces. Serving the
    // cached index at the slashless path makes relative assets resolve from
    // /year9phy/ instead of /year9phy/unit01/ in some browsers.
    if (isSameOrigin && url.pathname === YEAR9_UNIT01_PATH_PREFIX) {
      const canonicalUrl = new URL(url.href);
      canonicalUrl.pathname = `${YEAR9_UNIT01_PATH_PREFIX}/`;
      event.respondWith(Response.redirect(canonicalUrl.href, 308));
      return;
    }

    event.respondWith((async () => {
      const navigationCandidates = getNavigationCandidates(url);

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
        const homeFallback = await matchCurrentCaches('/index.html');
        if (homeFallback) return homeFallback;
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
