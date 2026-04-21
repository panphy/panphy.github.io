# AGENTS.md - AI Agent Guide for PanPhy Labs

## Project Overview

**PanPhy Labs** is a Progressive Web App (PWA) providing interactive physics tools, simulations, and educational games. The site is a static site with no build system, deployed via GitHub Pages.

- **Tech Stack**: Vanilla JavaScript, HTML5, CSS3 (no frameworks, no bundler)
- **Deployment**: GitHub Pages (direct file serving)
- **External Services**: Supabase (leaderboards) - API calls are NOT cached


## Critical Rules

### Service Worker Cache (`sw.js`)

The site uses a service worker for offline support. Assets are served **cache-first**, so users won't see updates unless the cache is invalidated.

**Every time you modify a file listed in `ASSETS_TO_CACHE` in `sw.js`, you MUST bump the `BUILD_ID` timestamp at the top of `sw.js` as your final step before finishing. This is easy to forget — do not skip it.** Without this, returning users will continue to be served the old cached version.

```javascript
// sw.js - update this timestamp whenever any cached asset changes
const BUILD_ID = 'YYYY-MM-DDTHH:MM:SSZ';
```

When adding a new published page, also add its path to the `ASSETS_TO_CACHE` array.

**Cache URLs are exact-match keys.** If an HTML file changes any CDN script/style URL, update the exact same URL in `ASSETS_TO_CACHE` (including version/path/query string), then bump `BUILD_ID`.

If a cached page depends on local media assets (audio/video/images/fonts) for core UX, add those file paths to `ASSETS_TO_CACHE` as well.

Any file under `/beta` is intentionally excluded from service-worker caching. Do not add `/beta/*` paths to `ASSETS_TO_CACHE`.

### No Build System

Edit files directly. There is no npm, webpack, or any compilation step. Do not introduce one.

### Self-Contained Pages

Each HTML file in the repo is a complete, standalone application. Complex tools (PanPhyPlot, Markdown Editor) split their JS/CSS into modules under a subfolder, but the entry point is always a single HTML file.

PanPhyPlot curve fitting now uses a shared numeric helper module at `tools/panphyplot/js/fit-core.js`, consumed by both `curve-fitting.js` (main-thread fallback) and `fit-worker.js` (worker path).

### Filename Hashes

Module files must use **stable, unhashed filenames** (e.g. `copy.js`, not `copy.ab12.js`). Cache busting is handled exclusively via the `BUILD_ID` in `sw.js`. Do not rely on file hash changes for updates.

### Published vs Unlisted Pages

Not every HTML file in the repo is currently part of the published navigation.

- **Published landing-page apps** are linked from `index.html` and usually listed in `sitemap.xml`
- **Public support/reference pages** may also be service-worker registered and pre-cached even if they are not linked from `index.html` (for example PanPhyPlot's manual/reference pages)
- Only public pages that should participate in the site's service-worker update flow should include `<script src="/assets/sw-register.js" defer></script>`
- New pages should be created in `/beta` by default unless explicitly requested to publish and list on `index.html`
- `/beta/*` and `/misc/*` are intentionally excluded from service-worker caching (pre-cache and runtime cache)
- `fun/dodge.html` is a published exception: it is linked from `index.html` and listed in `sitemap.xml`, but remains network-only because the leaderboard depends on live Supabase data
- **Current unlisted/legacy pages** include:
  - `misc/digitizer.html`
  - `misc/gcse_phy/phy_flashcard.html`
  - `misc/gcse_phy/phy_flashcard_cs.html`
  - `misc/gcse_phy/phy_flashcard_ss.html`
  - `misc/ising_model.html`
  - `misc/phyclub_showcase.html`
  - `misc/scoreboard.html`
- Unlisted/internal pages should stay outside service-worker registration and pre-cache lists unless explicitly promoted

If you promote an unlisted page to production, treat it as a full launch task:
1. If the page lives in `/beta` or `/misc`, move it to the correct public directory first
2. Add `<script src="/assets/sw-register.js" defer></script>` if missing
3. Add route + required assets to `ASSETS_TO_CACHE`
4. Bump `BUILD_ID` in `sw.js`
5. Link it from `index.html`
6. Add the page to `OFFLINE_CARD_REQUIREMENTS` in `index.html` to enable the "Offline Ready" pill
7. Add it to `sitemap.xml`

## Coding Conventions

- **Variables/functions**: camelCase
- **Constants**: UPPER_SNAKE_CASE
- **CSS theming**: Use CSS custom properties; see **UI Design System** below for the full palette
- **Theme toggle**: `data-theme` attribute on `<html>`, persisted to localStorage
- **Mobile-first**: Touch targets 48px+, responsive design

## UI Design System

All new pages should follow the design language established across the site. The collision sim is a special case (camera-based, dark-only Three.js) and does not follow this pattern.

### Typography

Three Google Fonts loaded via a single `@import`:
- `--font-body`: **Manrope** — body text, labels, buttons
- `--font-display`: **DM Serif Display** — page titles, section headings
- `--font-mono`: **IBM Plex Mono** — data values, readouts, code

### Color Palette

| Variable | Light | Dark |
|----------|-------|------|
| `--bg-color` | `#F8F6F1` | `#111110` |
| `--bg-pattern` | `#EDE9E0` | `#1A1A18` |
| `--text-main` | `#1B1B1B` | `#EDEBE8` |
| `--text-secondary` | `#6B6560` | `#9C9890` |
| `--brand-primary` | `#C2410C` (burnt orange) | `#E8734A` |
| `--brand-secondary` | `#EA580C` | `#F4845F` |
| `--brand-accent` | `#0D9488` (teal) | `#2DD4BF` |
| `--surface` / `--card-bg` | `#ffffff` | `#1E1E1C` |
| `--border` / `--card-border` | `#E8E4DD` | `#2E2E2A` |
| `--slider-track` | `#E8E4DD` | `#3A3A36` |
| `--slider-thumb` | `#C2410C` | `#E8734A` |
| `--nav-bg` | `rgba(248,246,241,0.92)` | `rgba(17,17,16,0.92)` |
| `--nav-border` | `#E8E4DD` | `#2E2E2A` |

### Background Pattern

Dotted texture on `body`: `radial-gradient(var(--bg-pattern) 1px, transparent 1px)` at `30px 30px`.

### Theme Flash Prevention

An inline IIFE in `<head>` reads localStorage and sets `data-theme`, `<meta name="theme-color">`, and `apple-mobile-web-app-status-bar-style` before first paint.

### Layout

- **App shell**: `#app` — full-viewport flex column
- **Content max-width**: `1360px` with `width: calc(100% - 40px)`
- **Workspace**: CSS Grid (sim canvas + controls side panel), collapses to single column at ≤900px
- **Panels**: 18px rounded cards with `1px solid var(--border)` and subtle shadow

### Banner (Title Bar)

Floating pill-shaped bar: 3-column grid (logo | gradient title | actions), `border-radius: 20px`, frosted glass (`backdrop-filter: blur(12px)`). Title uses `--font-display` with gradient text (`--brand-primary` to `--brand-accent`).

### Controls & Inputs

- **Range sliders**: 18px circular thumb, 6px track, `--slider-thumb`/`--slider-track` colors
- **Slider labels**: Uppercase, 0.76rem, `--text-secondary`; value readouts in `--font-mono`
- **Buttons**: 12px border-radius, 44px min-height. Hover: `translateY(-1px)` + `brightness(1.02)`
- **Toggle switches**: 44×22px pill with sliding 18px circle

### Responsive Breakpoints

| Breakpoint | Behavior |
|------------|----------|
| `pointer: coarse` | Buttons/sliders enlarge to 48px min |
| `max-width: 900px` | Workspace collapses to single column; body scrollable |
| `max-width: 640px` | Banner narrows, logo shrinks to 28px, title to 1.2rem |

### Three.js Canvas Resize Pattern

Always use `renderer.setSize(w, h, false)` (prevents inline CSS causing resize loops on iPhone). Canvas CSS needs `height: 0; flex: 1; min-height: 0` so flexbox controls sizing.

## General Notes

- **Offline-first**: New features must work without network
- **External libraries**: Loaded from CDNs (Plotly, MathJax, etc.), not bundled
- **No absolute paths in output**: For security, never show the full absolute file path when summarizing code changes. Use repo-relative paths instead (e.g. `tools/markdown_editor/js/main.js`)

## Directory Layout

```
/
├── index.html              # Landing page
├── sw.js                   # Service Worker (update BUILD_ID on changes!)
├── manifest.json           # PWA config
├── assets/                 # Icons, logos, sw-register.js
├── beta/                   # Unpublished WIP pages/assets (never SW-cached)
├── tools/                  # Educational tools
│   ├── panphyplot.html     # Entry point → panphyplot/ (modular JS/CSS)
│   ├── markdown_editor.html # Entry point → markdown_editor/ (ES modules)
│   └── *.html              # motion_tracker, sound_analyzer, tone_generator
├── simulations/            # Physics simulations
│   ├── *.html              # superposition, standing_wave, interference, states, lorentz, lorentz_learn
│   └── collision.html      # Entry point → collision/ (modular JS/CSS/assets)
├── fun/                    # Games (dodge.html excluded from SW cache)
├── for_teachers/           # Teacher utilities
└── misc/                   # Unlisted/legacy (digitizer, gcse_phy flashcards, etc.)
```

## Testing Locally

Run a simple HTTP server to test service workers and absolute paths:

```bash
python3 -m http.server 8000
# Open http://localhost:8000
```

## Adding a New Page

1. Unless explicitly requested to publish and list on `index.html`, create the page in `/beta`
2. For `/beta` pages, do not include service worker registration and do not add any `/beta/*` path to `ASSETS_TO_CACHE`
3. If the page will be published, place it in the appropriate public directory and include service worker registration via shared loader: `<script src="/assets/sw-register.js" defer></script>`
4. Use the standard CSS theme variables
5. If published, add the path to `ASSETS_TO_CACHE` in `sw.js`
6. Bump the `BUILD_ID` in `sw.js` after published/cached asset changes
7. Add a link from `index.html`
8. Add a `<loc>` entry to `sitemap.xml` if the page is public

## Git Workflow

- **Main branch**: Production (auto-deployed to GitHub Pages)
- **Feature branches**: Use `claude/` or `codex/` prefixes for AI-generated code
- **Pull requests**: Required for merging to main
