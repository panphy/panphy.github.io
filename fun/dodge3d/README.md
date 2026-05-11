# Asteroid Storm 3D

Published Three.js remake of `fun/dodge.html`, with the same Supabase-backed top-survivors flow.

Run it from the repository root with Vite:

```bash
npx vite --host 127.0.0.1 .
```

Then open `/fun/dodge3d.html` on the Vite dev server.

This page is linked from `index.html` and listed in `sitemap.xml`, but it remains service-worker network-only because the leaderboard depends on live Supabase data.

Supporting source files live in `fun/dodge3d/`. Scores are stored in the PanPhy Games Supabase project in `public.dodge3d_leaderboard` and submitted through `public.submit_dodge3d_score`.
