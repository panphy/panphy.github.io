# AGENTS.md - AI Agent Guide for PanPhy Labs

## Project Overview

**PanPhy Labs** is a Progressive Web App (PWA) providing interactive physics tools, simulations, and educational games. The site is a static site with no build system, deployed via GitHub Pages.

- **Tech Stack**: Vanilla JavaScript, HTML5, CSS3 (no frameworks, no bundler)
- **Deployment**: GitHub Pages (direct file serving)

## Critical Rules

### Service Worker Cache (`sw.js`)

The site uses a service worker for offline support. Assets are served **cache-first**, so users won't see updates unless the cache is invalidated.

**Every time you modify a file listed in `ASSETS_TO_CACHE` in `sw.js`, you MUST bump the `BUILD_ID` timestamp at the top of `sw.js`.** Without this, returning users will continue to be served the old cached version.

```javascript
// sw.js - update this timestamp whenever any cached asset changes
const BUILD_ID = 'YYYY-MM-DDTHH:MM:SSZ';
```

When adding a new page, also add its path to the `ASSETS_TO_CACHE` array.

### No Build System

Edit files directly. There is no npm, webpack, or any compilation step. Do not introduce one.

### Self-Contained Pages

Each HTML file in the repo is a complete, standalone application. Complex tools (PanPhyPlot, Markdown Editor) split their JS/CSS into modules under a subfolder, but the entry point is always a single HTML file.

### Filename Hashes

Module files use content hashes in their filenames (e.g. `copy.99554e82.js`). These are for browser HTTP cache-busting. There is no automated tooling to generate them — they were set manually when the files were created.

## Coding Conventions

- **Variables/functions**: camelCase
- **Constants**: UPPER_SNAKE_CASE
- **CSS theming**: Use CSS custom properties (`--bg-color`, `--text-main`, etc.), never hardcoded colors
- **Theme toggle**: `data-theme` attribute on `<html>`, persisted to localStorage
- **Mobile-first**: Touch targets 48px+, responsive design
- **Offline-first**: New features must work without network
- **External libraries**: Loaded from CDNs, not bundled

## Directory Layout

```
/
├── index.html              # Landing page
├── sw.js                   # Service Worker (update BUILD_ID on changes!)
├── manifest.json           # PWA config
├── tools/                  # Educational tools (plotting, markdown editor, etc.)
├── simulations/            # Physics simulations
├── fun/                    # Games
├── gcse/                   # GCSE flashcards
├── for_teachers/           # Teacher utilities
└── misc/                   # Miscellaneous
```

## Adding a New Page

1. Create the HTML file in the appropriate directory
2. Include service worker registration: `if('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js');`
3. Use the standard CSS theme variables
4. Add the path to `ASSETS_TO_CACHE` in `sw.js`
5. Bump the `BUILD_ID` in `sw.js`
6. Add a link from `index.html`

## Git Workflow

- **Main branch**: Production (auto-deployed to GitHub Pages)
- **Feature branches**: Use `claude/` or `codex/` prefixes for AI-generated code
- **Pull requests**: Required for merging to main
