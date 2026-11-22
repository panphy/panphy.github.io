---
name: service-worker
description: How PanPhy Labs caches pages offline and prompts for updates (sw.js, assets/sw-register.js, BUILD_ID, STABLE_ASSETS, per-app versions, VERIFY_APP). Use when changing any file listed in ASSETS_TO_CACHE, sw.js, sw-register.js, or offline and update-prompt behavior.
---

# The root service worker

- Files in `ASSETS_TO_CACHE` (`sw.js`) are cache-first. After changing any of them, update `BUILD_ID` as the last code change, to a UTC timestamp `YYYY-MM-DDTHH:MM:SSZ`. `check.mjs --base origin/main` fails if a cached file changed without it.
- Cache URLs must match exactly, including CDN versions, paths and query strings. Include the local modules and media an offline app needs.
- `STABLE_ASSETS` (Collision Lab's MediaPipe engine and hand model, about 30 MB) stay in `ASSETS_TO_CACHE` but live in a cache kept across builds, so a new `BUILD_ID` does not download them again. Change `STABLE_CACHE_VERSION` when any of them changes; the repository checker enforces this.
- `/beta`, `/misc`, `/fun`, `/gcsephy`, `/ibdpphy` and Supabase API calls are network-only. Other resources may be runtime-cached; never assume an uncached resource works offline. (`gcsephy/` and `ibdpphy/` have their own freshness workers; see their `AGENTS.md`.)
- Update prompts are per app: at install the worker hashes each app's precached same-origin files, plus shared `/assets/` files and `manifest.json`, into an app version, and a page prompts only when its app's version changes. Keep `getAssetGroup` (`sw.js`) and `getAppGroup` (`assets/sw-register.js`) aligned; an app missing from the version map falls back to `BUILD_ID` and prompts on every build. The checker compares the two.
- A worker installed while a deployment is still propagating can precache old files under the new `BUILD_ID`. To recover, `sw-register.js` sends `VERIFY_APP` after each update check, and `verifyAppFiles` (`sw.js`) compares the open app's and the shared precached files with the server (at most hourly, never within 15 minutes of install), replaces any that differ and lets the page show the normal prompt. Its requests carry a fresh query string, because Cloudflare keeps scripts and stylesheets (not pages) at its edge for up to four hours. Pages are hashed with `contentHash`, which blanks the email codes Cloudflare rewrites on every request; hash any page content the same way, or identical pages never match.
- Keep normal updates user-approved. The landing page's `REPAIR_PRECACHE` only restores missing entries and is rate-limited by the landing page; replacing changed files is `VERIFY_APP`'s job.

## Verify

Serve with `python3 -m http.server 8000` in a clean browser context, load the app, go offline and reload, then change a cached file, bump `BUILD_ID` and check that only that app prompts. Suites whose tests read `sw.js` or `index.html` run in the PR checks.
