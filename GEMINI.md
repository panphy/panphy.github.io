# PanPhy Labs Project Context

## Project Overview
PanPhy Labs is a collection of browser-based physics tools, simulations, and educational mini-apps. It is designed to be accessible (no installation), interactive, and offline-friendly. The project prioritizes simplicity and resilience for classroom environments where devices may be locked down or internet access is unreliable.

### Core Technologies
- **Frontend:** HTML5, CSS3 (Vanilla), Vanilla JavaScript.
- **Architecture:** Static site hosted on GitHub Pages. No framework, no bundler, no build step.
- **Offline Support:** Service Worker (`sw.js`) with manual cache management.
- **Key Libraries:**
  - **Visualization:** Plotly.js, Three.js, Chart.js.
  - **Math/Physics:** Math.js, MathJax (LaTeX rendering), MediaPipe (Hand Landmarker for interactive sims).
  - **Content:** Marked (Markdown), DOMPurify (Security), highlight.js.
- **Backend (Optional):** Supabase for specific features like leaderboards.

## Project Structure
- `/index.html`: Main landing page and portal.
- `/tools/`: Productivity apps (e.g., `panphyplot.html`, `motion_tracker.html`, `markdown_editor.html`, `sound_analyzer.html`, `tone_generator.html`).
- `/simulations/`: Physics simulations (`superposition.html`, `standing_wave.html`, `interference.html`, `states.html`, `lorentz.html`, `lorentz_learn.html`, `collision.html`).
- `/for_teachers/`: Utility apps for educators (`timer.html`, `visualizer.html`).
- `/fun/`: Games and demos (`dodge.html`, `react.html`, `ascii_cam.html`).
- `/misc/`: Unlisted/legacy pages (`digitizer.html`, `gcse_phy/` flashcards, `ising_model.html`, `phyclub_showcase.html`, `scoreboard.html`).
- `/assets/`: Shared assets, icons, and `sw-register.js`.
- `/beta/`: Staging area for work-in-progress features (never SW-cached).
- `sw.js`: Service Worker for offline caching and PWA functionality.

## Development Guidelines & Conventions

### 1. File Modification & Caching
- **Service Worker:** When modifying any file listed in the `ASSETS_TO_CACHE` array in `sw.js`, you **MUST** bump the `BUILD_ID` constant at the top of `sw.js` as your **final step** before finishing. This is easy to forget — do not skip it. Without this, returning users will continue to be served the old cached version.
- **Self-Contained Pages:** Each HTML entry point should be as independent as possible. Shared logic should be placed in subdirectories (e.g., `tools/panphyplot/js/`) or `assets/`.
- **New pages default to `/beta`:** Unless explicitly asked to publish and list on `index.html`, create new pages in `/beta`. Do not add `/beta/*` paths to `ASSETS_TO_CACHE` or include `sw-register.js` in `/beta` pages.
- **Route exceptions matter:** `/misc/*` is also kept out of service-worker caching while pages remain there. `fun/dodge.html` is a published exception that stays network-only because its leaderboard depends on live Supabase data. Public support pages can exist outside the `index.html` card grid.

### 2. UI/UX Principles
- **Classroom Ready:** Interfaces must be mobile-friendly and touch-friendly.
- **Three.js Canvas Resize:** Always call `renderer.setSize(w, h, false)` (the `false` prevents inline CSS that causes resize loops on mobile). Set `height: 0` on the canvas CSS alongside `flex: 1; min-height: 0` so flexbox controls sizing.
- **Theme Support:** Follow the existing light/dark theme pattern using CSS variables and `data-theme` attributes on `<html>`. See **UI Design System** below for the full palette.
- **Low Friction:** Avoid mandatory logins or complex setup steps.

### UI Design System

All new pages should follow the design language established across the site. The collision sim is a special case (camera-based, dark-only Three.js) and does not follow this pattern.

#### Typography
Three Google Fonts via a single `@import`: **Manrope** (`--font-body`: body/labels/buttons), **DM Serif Display** (`--font-display`: titles/headings), **IBM Plex Mono** (`--font-mono`: data values/readouts).

#### Color Palette

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

#### Background Pattern
Dotted texture on `body`: `radial-gradient(var(--bg-pattern) 1px, transparent 1px)` at `30px 30px`.

#### Theme Flash Prevention
An inline IIFE in `<head>` reads localStorage and sets `data-theme`, `<meta name="theme-color">`, and `apple-mobile-web-app-status-bar-style` before first paint.

#### Layout
- **App shell**: `#app` — full-viewport flex column.
- **Content max-width**: `1360px` with `width: calc(100% - 40px)`.
- **Workspace**: CSS Grid (sim canvas + controls side panel), collapses to single column at ≤900px.
- **Panels**: 18px rounded cards with `1px solid var(--border)` and subtle shadow.

#### Banner (Title Bar)
Floating pill-shaped bar: 3-column grid (logo | gradient title | actions), `border-radius: 20px`, frosted glass (`backdrop-filter: blur(12px)`). Title uses `--font-display` with gradient text (`--brand-primary` to `--brand-accent`).

#### Controls & Inputs
- **Range sliders**: 18px circular thumb, 6px track, custom webkit/moz styling.
- **Slider labels**: Uppercase, 0.76rem, `--text-secondary`; values in `--font-mono`.
- **Buttons**: 12px border-radius, 44px min-height. Hover: `translateY(-1px)`.
- **Toggle switches**: 44×22px pill with sliding 18px circle.

#### Responsive Breakpoints

| Breakpoint | Behavior |
|------------|----------|
| `pointer: coarse` | Buttons/sliders enlarge to 48px min |
| `max-width: 900px` | Workspace collapses to single column; body scrollable |
| `max-width: 640px` | Banner narrows, logo shrinks to 28px, title to 1.2rem |

### 3. Code Quality
- **Vanilla JS:** Prefer clean, readable Vanilla JavaScript over adding new external dependencies.
- **Error Handling:** Ensure robust error handling, especially for hardware-dependent features like camera or microphone access.
- **Performance:** Optimize for low-end school devices. Avoid heavy computations on the main thread where possible (use Web Workers for tasks like curve fitting).
- **PanPhyPlot Fitting Modules:** Keep shared fit math logic in `tools/panphyplot/js/fit-core.js`; `curve-fitting.js` and `fit-worker.js` should consume that shared module rather than duplicating numerical helpers.

## Common Tasks

### Adding a New App
1. Unless explicitly asked to publish, create the page in `/beta` first.
2. For a published page: create the HTML/JS/CSS in the appropriate directory (`tools/`, `simulations/`, etc.).
3. Add `<script src="/assets/sw-register.js" defer></script>` in `<head>`.
4. Add the new entry point to the grid in `index.html`.
5. Add the new app and its dependencies to the `ASSETS_TO_CACHE` array in `sw.js`.
6. Update `OFFLINE_CARD_REQUIREMENTS` in `index.html` to enable the "Offline Ready" pill.
7. Add the page URL to `sitemap.xml`.
8. Bump `BUILD_ID` in `sw.js`.

### Running the Project
Since there is no build step, you can serve the project using any local HTTP server:
- `python3 -m http.server 8000`
- `npx serve .`
- Prefer a local HTTP server over opening `index.html` directly, because root-relative paths and service-worker behavior expect an actual site origin.

## Interaction Context
When assisting with this project:
- Always consider the offline-first requirement.
- Prioritize Vanilla JS solutions.
- Always bump `BUILD_ID` in `sw.js` as your final step after modifying any cached asset.
- New pages go in `/beta` by default unless explicitly asked to publish.
- For security, never show the full absolute file path when summarizing code changes. Use repo-relative paths instead.
