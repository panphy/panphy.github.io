# AGENTS.md - AI Agent Guide for PanPhy Labs

## Project Overview

**PanPhy Labs** is a Progressive Web App (PWA) providing interactive physics tools, simulations, and educational games. The site is a static site with no build system, deployed via GitHub Pages.

- **Tech Stack**: Vanilla JavaScript, HTML5, CSS3 (no frameworks, no bundler)
- **Deployment**: GitHub Pages (direct file serving)
- **External Services**: Supabase (leaderboards) - API calls are NOT cached


## Critical Rules

### Service Worker Cache (`sw.js`)

The site uses a service worker for offline support. Assets are served **cache-first**, so users won't see updates unless the cache is invalidated.

**Every time you modify a file listed in `ASSETS_TO_CACHE` in `sw.js`, you MUST bump the `BUILD_ID` timestamp at the top of `sw.js`.** Without this, returning users will continue to be served the old cached version.

```javascript
// sw.js - update this timestamp whenever any cached asset changes
const BUILD_ID = 'YYYY-MM-DDTHH:MM:SSZ';
```

When adding a new page, also add its path to the `ASSETS_TO_CACHE` array.

**Cache URLs are exact-match keys.** If an HTML file changes any CDN script/style URL, update the exact same URL in `ASSETS_TO_CACHE` (including version/path/query string), then bump `BUILD_ID`.

If a cached page depends on local media assets (audio/video/images/fonts) for core UX, add those file paths to `ASSETS_TO_CACHE` as well.

### No Build System

Edit files directly. There is no npm, webpack, or any compilation step. Do not introduce one.

### Self-Contained Pages

Each HTML file in the repo is a complete, standalone application. Complex tools (PanPhyPlot, Markdown Editor) split their JS/CSS into modules under a subfolder, but the entry point is always a single HTML file.

### Filename Hashes

Module files must use **stable, unhashed filenames** (e.g. `copy.js`, not `copy.ab12.js`). Cache busting is handled exclusively via the `BUILD_ID` in `sw.js`. Do not rely on file hash changes for updates.

## Coding Conventions

- **Variables/functions**: camelCase
- **Constants**: UPPER_SNAKE_CASE
- **CSS theming**: Use CSS custom properties (`--bg-color`, `--text-main`, `--brand-primary`, `--brand-accent`); hardcoded colors are allowed upon request
- **Theme toggle**: `data-theme` attribute on `<html>`, persisted to localStorage
- **Mobile-first**: Touch targets 48px+, responsive design
- **Offline-first**: New features must work without network
- **External libraries**: Loaded from CDNs (Plotly, MathJax, etc.), not bundled


## Directory Layout

```
/
├── index.html              # Landing page
├── sw.js                   # Service Worker (update BUILD_ID on changes!)
├── manifest.json           # PWA config
├── assets/                 # Icons, logos, sw-register.js
├── tools/                  # Educational tools
│   ├── panphyplot.html     # Entry point → panphyplot/ (modular JS/CSS)
│   ├── markdown_editor.html # Entry point → markdown_editor/ (ES modules)
│   └── *.html              # digitizer, motion_tracker, sound_analyzer, tone_generator
├── simulations/            # Physics simulations
├── fun/                    # Games (dodge.html excluded from SW cache)
├── gcse/                   # GCSE flashcards
├── for_teachers/           # Teacher utilities
└── misc/                   # Miscellaneous
```

## Testing Locally

Run a simple HTTP server to test service workers and absolute paths:

```bash
python3 -m http.server 8000
# Open http://localhost:8000
```

## Adding a New Page

1. Create the HTML file in the appropriate directory
2. Include service worker registration via shared loader: `<script src="/assets/sw-register.js" defer></script>`
3. Use the standard CSS theme variables
4. Add the path to `ASSETS_TO_CACHE` in `sw.js`
5. Bump the `BUILD_ID` in `sw.js`
6. Add a link from `index.html`

## Git Workflow

- **Main branch**: Production (auto-deployed to GitHub Pages)
- **Feature branches**: Use `claude/` or `codex/` prefixes for AI-generated code
- **Pull requests**: Required for merging to main
