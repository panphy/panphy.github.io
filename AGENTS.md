# AGENTS.md - AI Agent Guide for PanPhy Labs

## Project Overview

PanPhy Labs is a static GitHub Pages PWA for interactive physics tools, simulations, and educational games.

- Stack: vanilla JavaScript, HTML5, CSS3; no framework, bundler, or build step
- Deployment: direct file serving from GitHub Pages
- Offline: service-worker based; Supabase leaderboard/API calls are never cached

## Assistant Instruction Files

`AGENTS.md` and `CLAUDE.md` are both tracked because Codex and Claude Code are both used.

- Treat both files as repo-level instructions.
- When changing workflow, caching, design-system, directory, testing, or AI-assistant rules, update both files in the same change.
- Keep the files technically aligned, even if wording differs.
- Do not remove either file from git or add either to `.gitignore`.
- Keep local tool state directories such as `.agents/` and `.claude/` ignored/local-only.

## Critical Rules

### Service Worker Cache

Assets in `sw.js` `ASSETS_TO_CACHE` are cache-first. Returning users will not receive changes until the service-worker cache version changes.

- After modifying any file listed in `ASSETS_TO_CACHE`, bump `BUILD_ID` at the top of `sw.js` as the final step.
- When adding a published cached page, add its path and required core local media assets to `ASSETS_TO_CACHE`.
- Cache keys are exact URL matches. If an HTML file changes a CDN script/style URL, update the exact URL in `ASSETS_TO_CACHE`, including version/path/query string.
- Never add `/beta/*`, `/misc/*`, or `/fun/*` paths to `ASSETS_TO_CACHE`.
- Published features should work offline unless explicitly network-only.
- Non-precached same-origin GET resources may work offline after runtime caching, except excluded paths.
- Supabase API calls stay network-only.

```javascript
const BUILD_ID = 'YYYY-MM-DDTHH:MM:SSZ';
```

### No Build System

Edit files directly. Do not add npm, webpack, bundlers, build pipelines, `package.json`, lockfiles, or remote-required dev-server metadata.

### Page Structure

Each HTML file is a standalone app. Complex tools may split CSS/JS into subfolders, but the entry point remains a single HTML file.

- Use stable, unhashed module filenames such as `copy.js`; cache busting is only via `BUILD_ID`.
- Load external libraries from CDNs; do not bundle them.
- PanPhyPlot fitting uses `tools/panphyplot/js/fit-core.js`, shared by `curve-fitting.js` and `fit-worker.js`.

## Published vs Unlisted Pages

- Published landing-page apps are linked from `index.html` and usually listed in `sitemap.xml`.
- Public support/reference pages may be service-worker registered and pre-cached without appearing on `index.html`.
- Only public pages that should join the service-worker update flow should include `<script src="/assets/sw-register.js" defer></script>`.
- New pages default to `/beta` unless explicitly requested for publication.
- `/beta`, `/misc`, and `/fun` are excluded from pre-cache and runtime cache.
- All `fun/` apps are network-only, now and in the future.
- Unlisted/internal pages stay outside service-worker registration and pre-cache unless promoted.

Current unlisted/legacy pages:

- `misc/digitizer.html`
- `misc/gcse_phy/phy_flashcard.html`
- `misc/gcse_phy/phy_flashcard_cs.html`
- `misc/gcse_phy/phy_flashcard_ss.html`
- `misc/ising_model.html`
- `misc/phyclub_showcase.html`
- `misc/scoreboard.html`

When promoting an unlisted page:

1. Move it out of `/beta` or `/misc` into the correct public directory.
2. Add `/assets/sw-register.js` if it should participate in SW updates.
3. Add its route and required assets to `ASSETS_TO_CACHE`, unless it is under `fun/` or intentionally network-only.
4. Bump `BUILD_ID` in `sw.js`.
5. Link it from `index.html`.
6. Add it to `OFFLINE_CARD_REQUIREMENTS` unless intentionally network-only.
7. Add it to `sitemap.xml`.

## Coding Conventions

- Variables/functions: camelCase
- Constants: UPPER_SNAKE_CASE
- Theme: `data-theme` on `<html>`, persisted to localStorage
- State: prefer a centralized state object for shared app state
- CSS: use custom properties for published pages
- Mobile: responsive layout, 48px+ touch targets, and `viewport-fit: cover` where edge-to-edge/notched layouts need it
- Output: summarize files with repo-relative paths only, never full absolute paths

## UI Design System

`/beta` pages are exempt. These rules apply to published pages only. The collision sim is a dark, camera-based Three.js exception.

- Fonts: `--font-body` Manrope, `--font-display` DM Serif Display, `--font-mono` IBM Plex Mono, loaded via one Google Fonts `@import`.
- Palette: use the established variables `--bg-color`, `--bg-pattern`, `--text-main`, `--text-secondary`, `--brand-primary`, `--brand-secondary`, `--brand-accent`, `--surface`/`--card-bg`, `--border`/`--card-border`, `--slider-track`, `--slider-thumb`, `--nav-bg`, and `--nav-border`.
- Background: dotted body texture with `radial-gradient(var(--bg-pattern) 1px, transparent 1px)` at `30px 30px`.
- Theme flash prevention: inline head script sets `data-theme`, `theme-color`, and `apple-mobile-web-app-status-bar-style` before first paint.
- Theme transitions: color/background/border changes may use the existing 0.3s global transition pattern.
- Layout: `#app` full-viewport flex column; content max width `1360px` with `width: calc(100% - 40px)`.
- Workspace: grid with canvas plus controls, collapsing to one column at `max-width: 900px`.
- Panels: 18px rounded cards, `1px solid var(--border)`, subtle shadow.
- Banner: floating 3-column pill (logo/title/actions), 20px radius, frosted `var(--nav-bg)`, gradient display title.
- Controls: 18px slider thumbs/6px tracks, uppercase 0.76rem labels, mono readouts, 12px radius buttons with 44px min-height, 44x22px toggles.
- Responsive: enlarge controls on coarse pointers; narrow banner and reduce title/logo sizes below 640px.
- Three.js canvas sizing: use `renderer.setSize(w, h, false)` and CSS `height: 0; flex: 1; min-height: 0`.

## Directory Layout

```text
/
├── index.html              # Landing page
├── sw.js                   # Service worker; bump BUILD_ID for cached changes
├── manifest.json           # PWA config
├── assets/                 # Icons, logos, sw-register.js
├── beta/                   # Unpublished WIP, never SW-cached
├── tools/                  # Educational tools
├── simulations/            # Physics simulations
├── fun/                    # Games, always network-only
├── for_teachers/           # Teacher utilities
└── misc/                   # Unlisted/legacy pages
```

## Testing Locally

Use a simple static server to test service workers and absolute paths:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

## Adding a New Page

1. Create it in `/beta` unless explicitly asked to publish.
2. For `/beta`, do not include service-worker registration or cache entries.
3. For published pages, place it in the correct public directory and include `/assets/sw-register.js` if it should join SW updates.
4. Follow the published-page design system.
5. Add the path and required assets to `ASSETS_TO_CACHE`.
6. Bump `BUILD_ID`.
7. Link it from `index.html`.
8. Add it to `OFFLINE_CARD_REQUIREMENTS` unless intentionally network-only.
9. Add it to `sitemap.xml`.

## Git Workflow

- Main branch: production, auto-deployed to GitHub Pages
- Feature branches: use `claude/` or `codex/` prefixes
- Pull requests are required for merging to main
