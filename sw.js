const CACHE_NAME = 'panphy-v2'; // <--- I changed this to v2 to force an update!

const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/favicon.png',
  '/panphy.png',
  '/manifest.json',
  
  // Tools
  '/tools/markdown_editor.html',
  '/tools/panphyplot.html',
  '/tools/digitizer.html',
  '/tools/motion_tracker.html',
  '/tools/sound_analyzer.html',
  '/tools/tone_generator.html',
  '/tools/quadratic.html',

  // Simulations
  '/simulations/superposition.html',
  '/simulations/standing_wave.html',
  '/simulations/lorentz.html',
  '/simulations/Ising_model.html',

  // For Teachers
  '/for_teachers/timer.html',
  '/for_teachers/visualizer.html',

  // Fun
  '/fun/dodge.html',
  '/fun/ascii_cam.html'
];

// 1. Install Event: The "Safe" Caching Strategy
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      // We try to cache files one by one.
      // If one fails, we log it but don't stop the others!
      for (const url of ASSETS_TO_CACHE) {
        try {
          const response = await fetch(url);
          if (!response.ok) {
             throw new Error(`Failed to fetch ${url} (Status: ${response.status})`);
          }
          await cache.put(url, response);
        } catch (error) {
          console.error(`⚠️ Could not cache: ${url}`, error);
        }
      }
    })
  );
  // Force this new service worker to become active immediately
  self.skipWaiting();
});

// 2. Activate Event: Clean up old caches (v1)
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('Service Worker: Clearing old cache');
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// 3. Fetch Event: Serve from cache, fall back to network
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
