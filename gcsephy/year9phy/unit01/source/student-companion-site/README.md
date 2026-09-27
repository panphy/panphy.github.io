# Archived Work Like a Physicist companion site

This is the original Sites/React source for the Year 9 student companion. It contains seven lessons and 28 questions. The published, build-free GitHub Pages edition is maintained in [the unit's static site](../../index.html), [lesson pages](../../lesson/) and [assets](../../assets/). Edit those files for current student-facing content; this directory is preserved as source history.

See the [source archive README](../README.md) for the history bundle and other archive notes.

## Source map

| Path | Purpose |
|---|---|
| `app/page.tsx` | Original homepage and mission cards |
| `app/lesson/[slug]/page.tsx` | Lesson route and question UI |
| `app/data.ts` | Seven lessons and their questions |
| `app/globals.css` | Original styling |
| `public/og.png` | Social preview image |
| `app/chatgpt-auth.ts`, `db/`, `examples/d1/` | Unused starter helpers and optional database examples |

## Run the archived source

Use Node.js 22.13 or newer. From this directory:

```sh
npm install
npm run dev
```

`npm run build` checks whether the archived source builds with its pinned dependencies. The included `npm test` script runs starter-scaffold checks for preview files that are absent from the finished project, so it is not a test of the student companion. The published static edition needs no Node.js build step.
