# AGENTS.md — PanPhy Labs

PanPhy Labs is a static GitHub Pages PWA for physics tools, simulations, classroom utilities, and games. See `README.md` for the project map and local setup.

## Working rules

- Edit HTML, CSS, and vanilla JavaScript directly; the served site must need no framework, bundler, or build step. Local development dependencies stay ignored and optional.
- Keep each app independently accessible through an HTML entry point. Split supporting CSS/JS when useful and use stable, unhashed filenames. Follow existing CDN or local-library patterns without adding a build pipeline.
- Keep `AGENTS.md` and `CLAUDE.md` tracked and equivalent; update both when project rules change.
- Preserve unrelated user changes and existing functionality. UI changes and file removals should serve the requested task; ask before destructive changes outside that scope.
- Keep tool state (such as `.agents/` and `.claude/`) local and ignored. Put scratch files outside the repository where practical, and clean up temporary files you created.
- `main` is production and auto-deploys to GitHub Pages. Use `codex/` or `claude/` feature branches and pull requests for merges to `main`.

## Page placement and publishing

| Location | Purpose | Catalogue and offline policy |
| --- | --- | --- |
| `tools/`, `simulations/`, `for_teachers/` | General published apps | Listed on the homepage and in `sitemap.xml`; offline by default |
| `fun/` | Games and playful demos | May be listed publicly; always network-only |
| `beta/` | New work unless publication is requested | Maintain `beta/index.html`; no service-worker registration or caching |
| `misc/` | Unlisted pages and resources | Maintain links and short descriptions in `misc/index.html`; no registration or caching |
| `gcsephy/` | Public school-specific GCSE curriculum resources (`year9phy/`, `year10phy/`) | Direct-link access, outside the root catalogue; maintain `gcsephy/index.html`; network-only in root `sw.js`; pages load `/gcsephy/sw-register.js`, whose `/gcsephy/`-scoped worker revalidates every request and stores nothing |

Keep beta/misc inventories current when adding, moving, renaming, or removing entries. Supporting app files do not need separate entries.

For a new or promoted general published app:

1. Place it in the appropriate directory and update its previous inventory if moved.
2. Link it from `index.html` and add it to `sitemap.xml`.
3. For offline support, include `<script src="/assets/sw-register.js" defer></script>`, add the page and required assets to `ASSETS_TO_CACHE`, and add its homepage requirements to `OFFLINE_CARD_REQUIREMENTS` in `index.html`.
4. For registered apps, add an `APP_VERSIONS` entry in `sw.js` and ensure `getAppGroup` in `assets/sw-register.js` identifies it.
5. Bump `BUILD_ID` after cached-file changes, as below.

Network-only apps omit registration and offline requirements. Public support/reference pages may use the service worker without a homepage listing.

`gcsephy/` is exempt from beta placement, general app styling, and homepage promotion. Do not add it to root `index.html`, `ASSETS_TO_CACHE` or `OFFLINE_CARD_REQUIREMENTS` unless requested. Its absence from the catalogue does not make it private.

## Service worker

- Files in `sw.js` → `ASSETS_TO_CACHE` are cache-first. After changing any of them, update `BUILD_ID` as the final code change using a UTC timestamp: `YYYY-MM-DDTHH:MM:SSZ`.
- Cache URLs must match exactly, including CDN versions, paths, and query strings. Include required local modules and media for offline apps.
- `/beta`, `/misc`, `/fun`, `/gcsephy`, and Supabase API calls remain network-only. Other resources can also be runtime-cached; do not assume an uncached resource is available offline.
- `gcsephy/sw.js` is a separate freshness worker, not an offline cache: it uses `cache: 'no-cache'` fetches, no Cache Storage and no `BUILD_ID`. New `gcsephy/` pages include `<script src="/gcsephy/sw-register.js" defer></script>`.
- Keep `APP_VERSIONS` and app-group detection aligned. Entries currently use `BUILD_ID`, which is also the fallback version.
- Preserve user-approved activation for normal updates. Keep precache repair limited to missing entries and rate-limited by the landing page.

## Code and interface conventions

- Use camelCase for variables/functions, UPPER_SNAKE_CASE for constants, and a shared state object where useful.
- For general published apps, follow the existing design in `tools/panphyplot.html` and `tools/panphyplot/css/panphyplot.css`: Manrope body text, DM Serif Display headings, IBM Plex Mono readouts, theme variables, dotted backgrounds, rounded panels, and a floating banner. Reuse shared controls in `assets/` where appropriate; adapt dimensions to the app.
- Persist the theme through `data-theme` on `<html>` and localStorage. Apply the theme and browser theme metadata before first paint.
- Keep `apple-mobile-web-app-status-bar-style` at `default` in every theme; use `theme-color` for the bar colour. iOS/iPadOS 26+ home-screen apps still blur the top of the screen, so published pages link `/assets/standalone-top.css`, which reserves a flat strip in that mode. Offset anything pinned to the top edge (sticky headers, fixed buttons, fullscreen panes) by `var(--standalone-top)`.
- Make layouts responsive and controls keyboard- and touch-accessible; aim for 48px touch targets. Use `viewport-fit: cover` where needed.
- Physical quantities need precise entry or stepping. Pair sliders with numeric readouts or entry fields.
- Beta and `gcsephy/` pages are exempt from the general visual style; the collision simulation retains its dark camera-based design.
- For flex-based Three.js canvases, use `renderer.setSize(w, h, false)` with CSS `height: 0; flex: 1; min-height: 0` to avoid sizing feedback loops.

## Verification

- Serve locally with `python3 -m http.server 8000` and open `http://localhost:8000`. Use an uncached origin or clean browser context to avoid stale service-worker content.
- Verify affected browser flows and responsive layouts for UI changes; check offline behavior and update prompts when changing caching.
- For PanPhyPlot data handling or fitting changes, run `node --test tools/panphyplot/tests/regression.test.cjs` and check affected browser flows.
- For documentation-only changes, check accuracy, links, and consistency; no app test run or cache-version bump is needed unless cached content also changes.
