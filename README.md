# PanPhy Labs

PanPhy Labs is a static Progressive Web App (PWA) with browser-based physics tools, simulations, and games. The project is deployed directly from this repo to GitHub Pages, with no build system.

## Tech Stack

- **HTML5 / CSS3 / Vanilla JavaScript** (no framework, no bundler)
- **Service Worker** (`sw.js`) for offline support and update lifecycle
- **Supabase** for the Asteroid Storm leaderboard

## Route Status (Reviewed: 2026-02-19)

### Published routes

These are linked from `index.html` and listed in `sitemap.xml`:

- `tools/*` (Markdown Editor, PanPhyPlot, Motion Tracker, Sound Analyzer, Tone Generator, Digitizer)
- `simulations/*` (Superposition, Standing Wave, Lorentz)
- `for_teachers/*` (Timer, Visualizer)
- `fun/*` (Dodge, React, ASCII Cam)

### Unlisted routes in repo

These are present in the repository but not currently linked from `index.html` or `sitemap.xml`:

- `beta/ar.html`
- `misc/gcse_phy/phy_flashcard.html`
- `misc/gcse_phy/phy_flashcard_cs.html`
- `misc/gcse_phy/phy_flashcard_ss.html`
- `misc/ising_model.html`
- `misc/phyclub_showcase.html`

Treat those as legacy/internal unless intentionally promoted.

New work-in-progress pages should be created under `beta/` by default unless there is an explicit request to publish and list them on `index.html`.

Only routes linked from `index.html` are SW-managed by policy. Unlisted/internal pages should not include `/assets/sw-register.js` and should not be added to `ASSETS_TO_CACHE` unless they are being promoted to published status.

## Offline Model

- `sw.js` pre-caches the explicit list in `ASSETS_TO_CACHE`.
- Navigations use **network-first** with cache fallback.
- Other GET assets use **cache-first**.
- `/beta/*`, `/fun/dodge.html`, `/fun/dodge_assets/*`, and `*.supabase.co` requests are always fetched fresh (not cached by SW).

Only pages/assets in `ASSETS_TO_CACHE` are guaranteed to be available offline immediately after SW install. Other same-origin pages may still work offline after they are visited online while the SW is active (runtime cache), except `/beta/*`.

## Cache Versioning Rules

`sw.js` uses a timestamped `BUILD_ID` to version cache names. Because serving is cache-heavy, stale `BUILD_ID` means stale client content.

When changing the site:

- **Modify any cached file** (`ASSETS_TO_CACHE` entry): bump `BUILD_ID` in `sw.js`
- **Add a new unpublished/internal page**: create it under `beta/`, do not add SW registration, and do not add it to `ASSETS_TO_CACHE`
- **Publish a page from beta/internal**: move it to a public directory, add page path to `ASSETS_TO_CACHE`, link it from `index.html`, add it to `sitemap.xml`, then bump `BUILD_ID`
- **Change CDN script/style URL in a cached page**: update the exact same URL in `ASSETS_TO_CACHE`, then bump `BUILD_ID`
- **Add local media required by a cached page**: add media paths to `ASSETS_TO_CACHE`, then bump `BUILD_ID`
- **Edit `assets/sw-register.js`**: bump `BUILD_ID` in `sw.js` (the register script is pre-cached)

## Local Testing

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

Use a real HTTP server (not `file://`) so service workers and absolute paths behave correctly.
