# Offline Cache Audit Report

> **Note:** This audit captures the pre-change state (Phase 1) before implementing the Phase 2 fixes. It documents the baseline behavior that motivated the updates.

## 1. Current architecture

- **Framework/build tool**: Static site with vanilla HTML/CSS/JS and no build system. Each app is a self-contained HTML file, with a shared service worker (`sw.js`) for offline support. GitHub Pages is the stated hosting target. The service worker is registered inline in each entry HTML page. (Sources: `CLAUDE.md`, `README.md`, `index.html`.)
- **Routing mode**: Multi-page static routing (each tool/simulation is a separate HTML file). There is no SPA router; navigations are full page loads to `*.html` files. (Sources: `index.html` and file structure in `CLAUDE.md`.)
- **Asset generation & references**:
  - HTML pages reference local JS/CSS and remote CDNs directly (no bundling). Local assets are referenced by non-hashed filenames such as `/tools/markdown_editor/js/main.js` and `/tools/panphyplot/css/panphyplot.css`. (Source: `tools/markdown_editor.html`, `tools/panphyplot.html`.)
  - The service worker precaches a long list of HTML pages and assets, including CDN scripts and styles. (Source: `sw.js`.)
- **Cache headers configuration**: No cache-control configuration files are present in the repo (no `_headers`, `netlify.toml`, etc.). Caching policies are therefore dictated by the hosting platform defaults. (Source: repo root listing.)

## 2. Service worker deep inspection

- **Registration flow and scope**:
  - Each page registers `/sw.js` from inline `<script>` blocks. That means scope is the site root (`/`) and applies to all pages. (Source: multiple HTML files including `index.html`.)
- **Install/activate/fetch/message handlers**:
  - **Install**: Opens a fixed cache (`CACHE_NAME`) and prefetches every URL in `ASSETS_TO_CACHE`, including CDN resources and app HTML. Errors are caught and ignored to allow the install to continue. Calls `self.skipWaiting()` immediately. (Source: `sw.js`.)
  - **Activate**: Deletes `RUNTIME_CACHE` and any cache name not equal to the static `CACHE_NAME` or `RUNTIME_CACHE`, then `clients.claim()`. (Source: `sw.js`.)
  - **Fetch**:
    - Non-GET requests bypass the SW.
    - Supabase API calls and the dodge game paths are always fetched from network.
    - **Navigation** (`req.mode === 'navigate'`): Network-first with fallback to cache (match request), then fallback to `/index.html` if offline.
    - **Other assets**: Cache-first with runtime cache, then network fetch and cache on miss. (Source: `sw.js`.)
  - **Message handler**: None at present. No `postMessage`-driven update flow. (Source: `sw.js`.)
- **Cache names, versioning strategy, and eviction behavior**:
  - Cache names are hardcoded `panphy-labs-2026-02-04-v4` and `panphy-labs-runtime-2026-02-04-v4`. Versioning is manual and only bumps when the file is edited. (Source: `sw.js`.)
  - On activation, old caches are deleted, but only if the SW actually updates and activates.
- **Which routes/resources are cached & strategy**:
  - Almost every HTML page in the site is precached (including tools/simulations). Many CDN assets are precached as opaque responses. (Source: `ASSETS_TO_CACHE` in `sw.js`.)
  - Navigations are network-first, but cached HTML can be served when offline.
- **How SW updates are detected and applied**:
  - The registration scripts do not explicitly call `registration.update()` or set `updateViaCache: 'none'`. The SW update cadence relies on browser defaults. (Source: HTML registration snippets.)
  - `skipWaiting()` forces immediate activation when a new SW is installed, potentially taking over open pages without a user-controlled update moment.
- **`skipWaiting`, `clientsClaim`, navigation preload**:
  - `skipWaiting()` is used during install; `clients.claim()` is used on activate. There is no navigation preload usage. (Source: `sw.js`.)
- **Risk analysis for stale HTML/app-shell trapping users on old builds**:
  - Because SW updates depend on browser revalidation of `/sw.js`, a long-lived cached SW script can prevent cache updates. In that case, old precached HTML (app shell) persists even after a new deploy.
  - If a user is offline or in intermittent network conditions during a deploy, the cached HTML can be served repeatedly without fetching newer versions.
  - Immediate `skipWaiting()` without user coordination can also cause inconsistent updates if the new SW precaches a mix of old/new assets during partial deploys. (Source: `sw.js` and registration snippets.)

## 3. HTTP caching audit

### Attempted header inspection
A direct header check against the deployed GitHub Pages URL was attempted, but the environment returned a 403 via the network proxy (`curl -I https://panphy.github.io/`). Because of this restriction, actual production headers cannot be verified here and must be validated on the live site by the deploy owner. (Source: command output in this audit step.)

### Repository-level evidence
- There are **no explicit header configuration files** in the repo (no `_headers`, `netlify.toml`, or similar). Therefore, cache-control headers are presumed to be default GitHub Pages (or other hosting) behavior, which is outside of the repository’s direct control. (Source: repo root listing.)

### Required header checks (to be run post-deploy)
The following should be verified against the live deployment using curl or browser devtools:
- **HTML entry pages** (`/`, `/index.html`, `/tools/*.html`): should be `Cache-Control: no-cache, must-revalidate` to ensure fresh HTML is revalidated and not stuck.
- **Hashed JS/CSS bundles**: should be `Cache-Control: public, max-age=31536000, immutable` to maximize cache efficiency.
- **Images/fonts**: cacheable with long max-age if hashed; otherwise moderate caching.
- **Service worker script** (`/sw.js`): should be `Cache-Control: no-cache` or `max-age=0` to allow frequent update checks.

## 4. Failure-mode reproduction (current setup)

1. **Stale SW script on iPad WebKit**
   - If `/sw.js` is cached aggressively by the browser or intermediary, the device may not fetch the new SW script. The old SW keeps serving old precached HTML and assets indefinitely.
   - iPad Safari/Chrome (WebKit) is notorious for delayed SW updates and aggressive caching, especially on low-memory devices or when backgrounded for long periods.

2. **Offline return after deploy**
   - A user loads the site once, then goes offline. Navigations are served from cached HTML and assets. If a new deploy happens while offline, the user continues to see the previous build because no new SW is installed and no new cache is populated.

3. **Partial/atomic deploy mismatch**
   - Because precaching includes HTML and assets by fixed filenames, a deploy that changes a JS/CSS file could lead to the old SW caching a mix of assets if it installs while files are in flux. This can create a stale app-shell that references assets not yet updated or removed.

## 5. Minimal fix plan (proposed)

1. **Introduce a build identifier**
   - Add a build ID (timestamp/commit) shared by SW and client to version caches and expose in console UI.

2. **Asset fingerprinting**
   - Rename local JS/CSS (and practical static assets) to content-hashed filenames and update HTML references. This makes long-term caching safe and ensures new deploys reference new assets.

3. **Cache name versioning + cleanup**
   - Use build ID in cache names (precache + runtime) and delete old caches during activate.

4. **Service worker update flow**
   - Remove automatic `skipWaiting()` on install; instead, wait and provide user-controlled update prompt. Add message handler to trigger `skipWaiting()` when the user chooses to refresh.
   - Register SW with `updateViaCache: 'none'` and periodic `registration.update()` to reduce stale SWs (especially on iOS).

5. **Runtime caching strategies**
   - Keep **network-first** for navigation/HTML with offline fallback.
   - Use **cache-first** for hashed assets, falling back to network and caching new assets in runtime.

6. **Cache-Control policies (hosting)**
   - Configure hosting (or CDN in front of GitHub Pages) so HTML and SW scripts are revalidated (`no-cache, must-revalidate`), while hashed assets are immutable (`max-age=31536000, immutable`).

7. **Verification plan**
   - Provide a detailed test matrix and header checks in a dedicated verification document.

> **No implementation is included in this report.** The plan is included solely to guide Phase 2 changes.
