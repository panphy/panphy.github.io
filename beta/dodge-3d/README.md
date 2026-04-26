# Asteroid Storm 3D

Beta-only Three.js remake of `fun/dodge.html`.

Run it from the repository root with Vite:

```bash
npx vite --host 127.0.0.1 .
```

Then open `/beta/dodge-3d/` on the Vite dev server.

This page intentionally avoids service-worker registration, published navigation, and `sw.js` cache entries because everything under `/beta` is excluded from the production offline cache.
