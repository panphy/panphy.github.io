# Asteroid Storm 3D

Beta-only Three.js remake of `fun/dodge.html`, with the same Supabase-backed top-survivors flow.

Run it from the repository root with Vite:

```bash
npx vite --host 127.0.0.1 .
```

Then open `/beta/dodge3d.html` on the Vite dev server.

This page intentionally avoids service-worker registration, published navigation, and `sw.js` cache entries because everything under `/beta` is excluded from the production offline cache.

Supporting source files live in `beta/dodge3d/`. Scores are stored in the PanPhy Games Supabase project in `public.dodge3d_leaderboard` and submitted through `public.submit_dodge3d_score`.
