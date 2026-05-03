# Voxel Typing Night

Beta-only Three.js typing combat prototype with original voxel creatures and block-world scenery.

Run it from the repository root with Vite:

```bash
npx vite --host 127.0.0.1 .
```

Then open `/beta/voxel-typing/` on the Vite dev server.

This page intentionally avoids service-worker registration, published navigation, and `sw.js` cache entries because everything under `/beta` is excluded from the production offline cache.
