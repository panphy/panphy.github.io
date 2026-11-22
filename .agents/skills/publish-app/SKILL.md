---
name: publish-app
description: Checklist for adding a new general published app to PanPhy Labs (tools/, sandboxes/, simulations/, for_teachers/) or promoting one out of beta/. Use when creating, moving or promoting an app page, or when adding a page to index.html or sitemap.xml.
---

# Publishing an app

General published apps live in `tools/`, `sandboxes/`, `simulations/` or `for_teachers/`, are listed on the homepage and in `sitemap.xml`, and work offline by default. Promote an app out of `beta/` only when the user asks or approves.

## Checklist

1. Place it in the right directory and update the inventory it left (`beta/index.html` or `misc/index.html`).
2. Link it from `index.html` and add it to `sitemap.xml` with today's `<lastmod>`. Give it a `<title>` naming what it is in search terms (such as "Electric Motor Simulation: DC and AC Motors in 3D — PanPhy Labs"), a meta description and a `<link rel="canonical">` to its `https://panphy.app/` address.
3. Support light and dark themes through the shared theme controls (root `AGENTS.md`, Code and interface conventions), load the fonts and Spectrum design system, link `/assets/standalone-top.css`, and show the copyright line.
4. For offline use, include `<script src="/assets/sw-register.js" defer></script>`, add the page and its assets to `ASSETS_TO_CACHE` (`sw.js`), and add its requirements to `OFFLINE_CARD_REQUIREMENTS` in `index.html`. Cache URLs must match exactly, CDN versions and query strings included.
5. Name the page `<section>/<app>.html` with supporting files in `<section>/<app>/`, so that `getAssetGroup` (`sw.js`) and `getAppGroup` (`assets/sw-register.js`) give them one app name; otherwise add a matching rule to both.
6. Bump `BUILD_ID` as the last code change (skill `service-worker`).

Network-only apps (`fun/`) skip steps 4 to 6. Public support or reference pages may use the service worker without a homepage listing.

## Verify

- `node .github/scripts/check.mjs --base origin/main` checks the wiring: cached files exist, homepage offline requirements are cached, `BUILD_ID` changed, catalog and sitemap links resolve, and sitemap pages have their canonical, description, `standalone-top.css`, status-bar style, font order and `<lastmod>`.
- `node .github/scripts/a11y-smoke.mjs <page>` for the phone-size layout and accessibility checks.
- Load the page from a clean browser context, then offline, and check the update prompt (skill `service-worker`).
