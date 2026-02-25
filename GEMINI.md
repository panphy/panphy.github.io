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
- `/simulations/`: Physics simulations (`superposition.html`, `standing_wave.html`, `lorentz.html`, `lorentz_learn.html`, `collision.html`).
- `/for_teachers/`: Utility apps for educators (`timer.html`, `visualizer.html`).
- `/fun/`: Games and demos (`dodge.html`, `react.html`, `ascii_cam.html`).
- `/misc/`: Unlisted/legacy pages (`digitizer.html`, `gcse_phy/` flashcards, `ising_model.html`, `phyclub_showcase.html`).
- `/assets/`: Shared assets, icons, and `sw-register.js`.
- `/beta/`: Staging area for work-in-progress features (never SW-cached).
- `sw.js`: Service Worker for offline caching and PWA functionality.

## Development Guidelines & Conventions

### 1. File Modification & Caching
- **Service Worker:** When modifying any file listed in the `ASSETS_TO_CACHE` array in `sw.js`, you **MUST** bump the `BUILD_ID` constant at the top of `sw.js` as your **final step** before finishing. This is easy to forget — do not skip it. Without this, returning users will continue to be served the old cached version.
- **Self-Contained Pages:** Each HTML entry point should be as independent as possible. Shared logic should be placed in subdirectories (e.g., `tools/panphyplot/js/`) or `assets/`.
- **New pages default to `/beta`:** Unless explicitly asked to publish and list on `index.html`, create new pages in `/beta`. Do not add `/beta/*` paths to `ASSETS_TO_CACHE` or include `sw-register.js` in `/beta` pages.

### 2. UI/UX Principles
- **Classroom Ready:** Interfaces must be mobile-friendly and touch-friendly.
- **Theme Support:** Follow the existing light/dark theme pattern using CSS variables and `data-theme` attributes on `<html>`.
- **Low Friction:** Avoid mandatory logins or complex setup steps.

### 3. Code Quality
- **Vanilla JS:** Prefer clean, readable Vanilla JavaScript over adding new external dependencies.
- **Error Handling:** Ensure robust error handling, especially for hardware-dependent features like camera or microphone access.
- **Performance:** Optimize for low-end school devices. Avoid heavy computations on the main thread where possible (use Web Workers for tasks like curve fitting).

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
- Or simply open `index.html` in a browser (though some features like Service Workers and certain API calls may require a local server).

## Interaction Context
When assisting with this project:
- Always consider the offline-first requirement.
- Prioritize Vanilla JS solutions.
- Always bump `BUILD_ID` in `sw.js` as your final step after modifying any cached asset.
- New pages go in `/beta` by default unless explicitly asked to publish.
- For security, never show the full absolute file path when summarizing code changes. Use repo-relative paths instead.
