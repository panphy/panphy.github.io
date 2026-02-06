Welcome to PanPhy Labs. The tools, simulations, and games here are built with AI and designed to be interactive and educational. While there are many great web tools and physics simulations online, not all meet my needs. With school devices locked down, installing software is a hassle, so I build my own web apps: simple, browser-based, and ready for everyone to explore and enjoy.

Most importantly, the site is offline-friendly (apart from the game "Asteroid Storm" and "EAL Learning Companion," which is a Streamlit app). Once you open it in a browser, you can keep using the tools, simulations, and games even without an internet connection.

## Tech Stack
- **HTML/CSS:** Lightweight, fast-loading UI with a consistent look and feel  
- **Vanilla JavaScript:** Framework-free interactive logic (simulations, controls, rendering, state)  
- **Supabase:** Powers the online leaderboard for the game "Asteroid Storm"  
- **Offline support:** Service Worker caching for offline use after the first visit

## Offline & App Behavior
- `manifest.json` defines the Progressive Web App (PWA) metadata: app name, icons, start URL, and display mode. It lets browsers offer "install to home screen" and ensures the app launches with the correct branding and colors.
- `sw.js` is the service worker that pre-caches core assets and manages runtime caching. It serves cached pages and assets when offline and updates caches when online, enabling the offline-friendly experience described above.

## Versioning & Deployment

### How updates reach users

The site is deployed directly via **GitHub Pages** from the `main` branch -- every push to `main` goes live immediately.

However, because the service worker serves assets **cache-first**, returning users won't see updates unless the service worker cache is invalidated. This is controlled by two mechanisms:

1. **`BUILD_ID` in `sw.js`** -- A timestamp at the top of `sw.js` (e.g. `2026-02-06T12:00:00Z`) that is embedded into the cache name. When the browser detects that `sw.js` has changed, the new service worker installs, re-downloads all assets in `ASSETS_TO_CACHE` into a fresh cache, and deletes the old one on activation. **This must be bumped whenever any cached asset is modified**, otherwise users will keep getting stale files from the old cache.

2. **Content-hashed filenames** (e.g. `copy.99554e82.js`) -- Module files for complex tools include a hash in their filename. This busts the browser's HTTP cache when a file's contents change and the filename is updated to a new hash. These hashes are managed manually (there is no build system). Note: even if the filename hash is updated, the `BUILD_ID` still needs to be bumped so the service worker re-caches the new file.

### Update flow in practice

```
Code changed on main
  └─> GitHub Pages serves new files
        └─> Browser detects sw.js changed (BUILD_ID bumped)
              └─> New service worker installs
                    └─> Pre-caches fresh copies of all assets
                          └─> Old cache deleted on activation
                                └─> User sees updated content on next visit
```

### Summary for contributors

When modifying the site:
- **Changing an existing cached file**: Bump `BUILD_ID` in `sw.js`
- **Adding a new page**: Add its path to `ASSETS_TO_CACHE` in `sw.js` and bump `BUILD_ID`
- **Renaming a module file** (new hash): Update the `<script>` / `<link>` reference in the HTML entry point, update the path in `ASSETS_TO_CACHE`, and bump `BUILD_ID`
