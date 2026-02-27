# CLAUDE.md - AI Assistant Guide for PanPhy Labs

## Project Overview

**PanPhy Labs** is a Progressive Web App (PWA) providing interactive physics tools, simulations, and educational games for teachers and students. The site is designed to work offline after the first visit.

- **Repository**: `panphy.github.io` (GitHub Pages)
- **Type**: Static site / PWA with no build system
- **Tech Stack**: Vanilla JavaScript, HTML5, CSS3
- **Deployment**: GitHub Pages (direct file serving)

## Directory Structure

```
/
├── index.html              # Main landing page
├── sw.js                   # Service Worker for offline support
├── manifest.json           # PWA configuration
├── _headers                # HTTP headers configuration
├── robots.txt              # Search engine crawl rules
├── sitemap.xml             # Site sitemap
│
├── assets/
│   ├── favicon.png             # Site favicon (48x48)
│   ├── panphy.png              # App icon (512x512)
│   ├── apple-touch-icon.png    # iOS icon (180x180)
│   └── sw-register.js          # Service Worker registration script
│
├── beta/                   # Unpublished WIP pages/assets (never SW-cached)
│
├── tools/                  # Educational data analysis tools
│   ├── panphyplot.html     # Advanced plotting tool (entry point)
│   ├── panphyplot/         # Modular JS/CSS for PanPhyPlot
│   │   ├── css/panphyplot.css
│   │   ├── js/             # state.js, main.js, plotting.js, fit-core.js, curve-fitting.js,
│   │   │                   # data-processing.js, fit-worker.js, latex-rendering.js, ui.js
│   │   ├── panphyplot_manual.html  # User manual
│   │   └── math_ref.html          # Math reference
│   ├── markdown_editor.html # Markdown & LaTeX editor (entry point)
│   ├── markdown_editor/    # Modular JS/CSS for Markdown Editor
│   │   ├── css/markdown_editor.css
│   │   ├── js/             # state.js, main.js, rendering.js, copy.js, ui.js
│   │   ├── sample_doc.md   # Sample/tutorial document
│   │   └── templates/      # Math template documents
│   │       ├── math-basic.md
│   │       ├── math-calculus.md
│   │       ├── math-matrices.md
│   │       └── math-table.md
│   ├── motion_tracker.html
│   ├── sound_analyzer.html
│   └── tone_generator.html
│
├── simulations/            # Physics simulations
│   ├── superposition.html
│   ├── standing_wave.html
│   ├── lorentz.html
│   ├── lorentz_learn.html  # Lorentz sim learning companion
│   ├── collision.html      # 3D collision sim (entry point)
│   └── collision/          # Modular JS/CSS/assets for Collision sim
│       ├── app.js
│       ├── styles.css
│       └── collision_assets/  # MediaPipe models & WASM
│
├── fun/                    # Interactive games
│   ├── dodge.html          # Asteroid Storm (requires network for leaderboard)
│   ├── dodge_assets/       # Game sprites and audio
│   ├── react.html
│   └── ascii_cam.html
│
├── for_teachers/           # Teacher utilities
│   ├── timer.html
│   ├── timer_beep.mp3       # Timer audio alert
│   └── visualizer.html
│
└── misc/                   # Miscellaneous physics tools
    ├── digitizer.html
    ├── gcse_phy/           # GCSE exam preparation flashcards
    │   ├── phy_flashcard.html
    │   ├── phy_flashcard_cs.html
    │   ├── phy_flashcard_ss.html
    │   ├── phy_cs.csv       # Combined Science flashcard data
    │   └── phy_ss.csv       # Separate Science flashcard data
    ├── ising_model.html
    └── phyclub_showcase.html
```

## Published vs Unlisted Routes

Not every HTML file in the repo is currently treated as a published page.

- **Published pages** are linked from `index.html` and listed in `sitemap.xml`
- Only published pages should include `<script src="/assets/sw-register.js" defer></script>` and be included in `sw.js` `ASSETS_TO_CACHE`
- New pages should be created in `/beta` by default unless explicitly requested to publish and list on `index.html`
- `/beta/*` is intentionally excluded from service-worker caching (pre-cache and runtime cache)
- **Current unlisted/legacy pages**:
  - `misc/digitizer.html`
  - `misc/gcse_phy/phy_flashcard.html`
  - `misc/gcse_phy/phy_flashcard_cs.html`
  - `misc/gcse_phy/phy_flashcard_ss.html`
  - `misc/ising_model.html`
  - `misc/phyclub_showcase.html`
  - `simulations/lorentz_backup.html`
- Unlisted/internal pages should remain outside SW registration and pre-cache unless intentionally promoted

If you promote an unlisted page to production, do all of the following:
1. If the page lives in `/beta`, move it to the correct public directory first
2. Add `<script src="/assets/sw-register.js" defer></script>` if missing
3. Add page path + required assets to `ASSETS_TO_CACHE` in `sw.js`
4. Bump `BUILD_ID` in `sw.js`
5. Add a card/link in `index.html`
6. Add the page URL to `sitemap.xml`

## Tech Stack & Dependencies

### Core Technologies
- **HTML5**: Semantic markup, inline styles
- **CSS3**: CSS custom properties for theming
- **Vanilla JavaScript**: No frameworks (React, Vue, etc.)
- **Service Workers**: Offline functionality

### External Libraries (CDN)
- `Plotly.js` (2.29.1) - Graphing and data visualization
- `Math.js` (11.5.0) - Mathematical computations
- `MathJax` (2.7.5 in PanPhyPlot, 3.x in Markdown Editor) - LaTeX equation rendering
- `Highlight.js` (11.8.0) - Code syntax highlighting
- `DOMPurify` (2.3.4) - HTML sanitization
- `Marked` (4.3.0) - Markdown parsing
- `Chart.js` - Data visualization
- `html2canvas` (1.4.1) - HTML-to-canvas screenshots
- `Three.js` (0.161.0) - 3D rendering (Collision sim)
- `MediaPipe` (0.10.32) - Hand tracking (Collision sim)
- `Supabase.js` - Backend for leaderboards

## Coding Conventions

### HTML File Structure
Each application is self-contained in a single HTML file:

```html
<!DOCTYPE html>
<html data-theme="light">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>App Title</title>
    <!-- Include only for published pages -->
    <script src="/assets/sw-register.js" defer></script>
    <style>/* CSS with variables for theming */</style>
</head>
<body>
    <!-- HTML content -->
    <script src="https://cdn..."></script>
    <script>/* App logic */</script>
</body>
</html>
```

### CSS Theming System
All apps use CSS custom properties for light/dark theme support:

```css
:root {
  --bg-color: #f8f9fa;
  --text-main: #2d3436;
  --brand-primary: #6c5ce7;
  --brand-accent: #00cec9;
}

[data-theme="dark"] {
  --bg-color: #0f1014;
  --text-main: #dfe6e9;
}
```

Theme is toggled via `data-theme` attribute on `<html>` and persisted to localStorage.

### JavaScript Naming Conventions
- **Variables**: camelCase (`rawData`, `activeSet`)
- **Functions**: camelCase (`fitCurve()`, `plotGraph()`)
- **Constants**: UPPER_SNAKE_CASE (`CACHE_NAME`, `STORAGE_KEY`)
- **State objects**: Centralized global objects

### Modular Architecture
For complex tools, code is split into modules:

**PanPhyPlot:**
```
panphyplot.html (imports scripts)
├── js/state.js            # State management & localStorage
├── js/main.js             # App initialization
├── js/plotting.js         # Rendering logic
├── js/fit-core.js         # Shared fit math helpers (used by main thread + worker)
├── js/curve-fitting.js    # Fit orchestration and main-thread fallback
├── js/data-processing.js  # Data import/export
├── js/fit-worker.js       # Web Worker for curve fitting
├── js/latex-rendering.js  # LaTeX output
├── js/ui.js               # UI interactions
└── css/panphyplot.css     # Styling
```

**Markdown Editor:**
```
markdown_editor.html (imports scripts via ES modules)
├── js/state.js          # State management & localStorage
├── js/main.js           # App initialization & event handlers
├── js/rendering.js      # Markdown preprocessing & rendering
├── js/copy.js           # Copy-to-clipboard (equations, tables, code)
├── js/ui.js             # Theme, scroll sync, modals
├── css/markdown_editor.css  # Styling
├── sample_doc.md        # Tutorial document
└── templates/           # Math template documents
    ├── math-basic.md
    ├── math-calculus.md
    ├── math-matrices.md
    └── math-table.md
```

## Service Worker & Caching

**File**: `sw.js`
**Cache Version**: `panphy-labs-<BUILD_ID>` where `BUILD_ID` is a timestamp string

### Caching Strategy
- **Install**: Pre-caches core assets listed in `ASSETS_TO_CACHE`
- **Navigations**: Network-first, fallback to cache
- **Assets**: Cache-first, then fetch and update
- **Exclusions**: `/beta/*`, Dodge game routes, and Supabase API calls (always fetch fresh)

### When Modifying Any Cached Asset
Any time you change a file listed in `ASSETS_TO_CACHE`, **bump the `BUILD_ID` timestamp** at the top of `sw.js`. Without this, returning users will keep getting the old cached version.

```javascript
const BUILD_ID = 'YYYY-MM-DDTHH:MM:SSZ';  // Update this on every change
```

### Cache-Manifest Accuracy Rules
1. External CDN URLs must match exactly between HTML and `ASSETS_TO_CACHE` (version/path/query included)
2. If a cached page depends on local media assets (`.mp3`, `.webm`, images, fonts) for core UX, add those assets to `ASSETS_TO_CACHE`
3. If `assets/sw-register.js` is updated (it is cached), bump `BUILD_ID` in `sw.js`
4. Never add `/beta/*` paths to `ASSETS_TO_CACHE`

### When Adding New Pages
1. Unless explicitly requested to publish and list on `index.html`, create the new page under `/beta`
2. Keep `/beta` pages out of SW registration and `ASSETS_TO_CACHE`
3. For published pages, add the new page path to `ASSETS_TO_CACHE` array in `sw.js`
4. Bump the `BUILD_ID` timestamp for published/cached additions

```javascript
const ASSETS_TO_CACHE = [
  // ... existing assets ...
  '/tools/new_tool.html',  // Add new pages here
];
```

## Development Workflow

### No Build System
This is a pure static site. Changes are made directly to HTML/CSS/JS files with no compilation or bundling step.

### Git Workflow
- **Main branch**: Production (deployed to GitHub Pages)
- **Feature branches**: Use `claude/` or `codex/` prefixes for AI-generated code
- **Pull requests**: Required for merging changes

### Testing Changes Locally
Serve the files with any static server:
```bash
python3 -m http.server 8000
# or
npx serve .
```

Then open `http://localhost:8000` in a browser.

## Common Tasks

### Adding a New Tool/Page
1. Unless explicitly requested to publish/list on `index.html`, create new HTML in `/beta`
2. For `/beta` pages, do not include `<script src="/assets/sw-register.js" defer></script>` and do not add `/beta/*` paths to `sw.js` `ASSETS_TO_CACHE`
3. If it will be published, create/move it in the appropriate public directory (`tools/`, `simulations/`, etc.)
4. If it will be published from `index.html`, include `<script src="/assets/sw-register.js" defer></script>` in `<head>`
5. Use the standard theming CSS variables
6. If published, add to `sw.js` `ASSETS_TO_CACHE` array and bump `BUILD_ID`
7. Add link to `index.html` in the appropriate section
8. Add URL to `sitemap.xml` if page is public

### Updating the Theme System
Theme colors are defined in CSS `:root` and `[data-theme="dark"]` selectors. Key variables:
- `--bg-color`: Background
- `--text-main`: Primary text
- `--brand-primary`: Primary accent (#6c5ce7 indigo)
- `--brand-accent`: Secondary accent (#00cec9 teal)

### Working with PanPhyPlot
The most complex tool has modular architecture:
- State management in `js/state.js` with debounced localStorage persistence
- Plotting in `js/plotting.js` using Plotly
- Shared fitting primitives in `js/fit-core.js`
- Curve fitting orchestration in `js/curve-fitting.js` (with `js/fit-worker.js` for heavy tasks)

### Touch/Mobile Considerations
- Prevent double-tap zoom: Already implemented in dodge game
- Touch targets should be 48px+ for accessibility
- Use `viewport-fit: cover` for edge-to-edge on notched devices

## Important Files Reference

| File | Purpose |
|------|---------|
| `index.html` | Main landing page with links to all tools |
| `sw.js` | Service Worker - update cache list when adding pages |
| `manifest.json` | PWA metadata (name, icons, display mode) |
| `tools/panphyplot/` | Complex plotting tool, good reference for modular patterns |
| `tools/markdown_editor/` | Markdown/LaTeX editor with ES module architecture |

## Key Patterns

### State Persistence
```javascript
const STORAGE_KEY = 'app-state';
function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  return saved ? JSON.parse(saved) : defaultState;
}
```

### Theme Toggle
```javascript
function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('theme', next);
}
```

### Service Worker Registration
```html
<script src="/assets/sw-register.js" defer></script>
```
Use this only on published pages (not on `/beta/*` pages).

## Offline Behavior

- **Guaranteed offline after install**: Pages/assets explicitly listed in `sw.js` `ASSETS_TO_CACHE`
- **May work offline after first online visit**: Other same-origin GET resources (runtime cache), except `/beta/*`
- **Requires network**: `/beta/*`, `fun/dodge.html`, `fun/dodge_assets/*`, and any `*.supabase.co` API calls

## External Services

### Supabase
Used for leaderboards in the dodge game. API calls go to `*.supabase.co` and are excluded from caching.

## Notes for AI Assistants

1. **No build step**: Edit files directly, no npm/webpack/etc.
2. **Self-contained pages**: Each HTML file is a complete application
3. **New pages default to `/beta`**: Unless explicitly asked to publish/list in `index.html`, create under `/beta`
4. **Always bump `BUILD_ID` in `sw.js` after code changes**: Any time you modify a file that is listed in `ASSETS_TO_CACHE`, bump the `BUILD_ID` timestamp as your **final step** before finishing. This is easy to forget — do not skip it
5. **Never cache `/beta/*`**: Keep `/beta` files out of SW registration and `ASSETS_TO_CACHE`
6. **CDN URL exactness**: Keep CDN script/style URLs in HTML exactly aligned with `ASSETS_TO_CACHE`
7. **Theme awareness**: Always use CSS variables, not hardcoded colors
8. **Mobile-first**: Consider touch interactions and responsive design
9. **Offline-first**: Ensure new features work without network
10. **CDN dependencies**: External libraries are loaded from CDNs, not bundled
11. **Keep it simple**: Avoid adding frameworks or build complexity
12. **No absolute paths in output**: For security, never show the full absolute file path when summarizing code changes. Use repo-relative paths instead (e.g. `tools/markdown_editor/js/main.js`, not `/Users/.../main.js`)
