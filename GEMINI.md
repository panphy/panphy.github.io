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
- `/tools/`: Productivity apps (e.g., `panphyplot.html`, `motion_tracker.html`, `markdown_editor.html`).
- `/simulations/`: Educational physics simulations (e.g., `collision.html`, `lorentz.html`).
- `/for_teachers/`: Utility apps for educators (e.g., `timer.html`, `visualizer.html`).
- `/fun/`: Engagement-focused demos and mini-games.
- `/assets/`: Shared assets, icons, and `sw-register.js`.
- `/beta/`: Staging area for work-in-progress features.
- `sw.js`: Service Worker for offline caching and PWA functionality.

## Development Guidelines & Conventions

### 1. File Modification & Caching
- **Service Worker:** When modifying any file listed in the `ASSETS_TO_CACHE` array in `sw.js`, you **MUST** bump the `BUILD_ID` constant at the top of `sw.js` as your **final step** before finishing. This is easy to forget — do not skip it. Without this, returning users will continue to be served the old cached version.
- **Self-Contained Pages:** Each HTML entry point should be as independent as possible. Shared logic should be placed in subdirectories (e.g., `tools/panphyplot/js/`) or `assets/`.

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
1. Create the HTML/JS/CSS files in the appropriate directory (`tools/`, `simulations/`, etc.).
2. Add the new entry point to the grid in `index.html`.
3. Add the new app and its dependencies to the `ASSETS_TO_CACHE` array in `sw.js`.
4. Update `OFFLINE_CARD_REQUIREMENTS` in `index.html` to enable the "Offline Ready" pill.
5. Bump `BUILD_ID` in `sw.js`.

### Running the Project
Since there is no build step, you can serve the project using any local HTTP server:
- `python3 -m http.server 8000`
- `npx serve .`
- Or simply open `index.html` in a browser (though some features like Service Workers and certain API calls may require a local server).

## Interaction Context
When assisting with this project:
- Always consider the offline-first requirement.
- Prioritize Vanilla JS solutions.
- Remember to mention bumping the `BUILD_ID` in `sw.js` if modifications affect cached assets.
- If asked to create a new simulation or tool, follow the "New Applications" workflow in the system prompt.
