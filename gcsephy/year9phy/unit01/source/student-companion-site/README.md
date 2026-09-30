# Archived Work Like a Physicist companion site

Original Sites/React source for the Year 9 student companion (seven lessons, 28 questions), kept as history. The published edition is the build-free static site in [`../../index.html`](../../index.html), [`../../lesson/`](../../lesson/) and [`../../assets/`](../../assets/); edit those for current content. See the [archive README](../README.md).

| Path | Purpose |
|---|---|
| `app/page.tsx`, `app/lesson/[slug]/page.tsx` | Homepage and lesson route |
| `app/data.ts`, `app/globals.css` | Lessons and questions; styling |
| `public/og.png` | Social preview image |
| `app/chatgpt-auth.ts`, `db/`, `examples/d1/` | Unused starter helpers |

Run with Node.js 22.13+: `npm install`, then `npm run dev`. Use `npm run build` as the check; `npm test` covers starter-scaffold files that are absent here.
