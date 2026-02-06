# Cache Update Verification Guide

## 1. Test matrix (step-by-step)

### A. Desktop (Chrome/Firefox/Edge)
1. **First visit online**
   - Load `/index.html`.
   - Confirm service worker is installed (Application/Storage tab).
   - Confirm build ID logs to console (`[PanPhy Labs] Build ...`).
2. **Offline navigation**
   - Toggle offline mode in DevTools.
   - Reload `/index.html` and a tool page like `/tools/markdown_editor.html`.
   - Expect cached HTML/assets to load.
3. **Deploy update simulation**
   - Deploy a new build (build ID + asset hashes change).
   - Reload while online.
   - Expect update banner (“A new version is ready.”) after SW installs.
   - Click **Update** → page reloads → new build ID appears.
4. **Cache cleanup**
   - Inspect Cache Storage.
   - Old `panphy-labs-*` caches should be deleted after activation.

### B. iPad Safari / iPad Chrome (WebKit)
1. **First visit online**
   - Load `/index.html` and a tool page.
   - Confirm SW is installed (Settings → Safari → Advanced → Website Data, or use remote debugging).
2. **Background + return**
   - Close the tab or background Safari for several minutes.
   - Return and ensure the page still loads and the build ID is shown in console (via remote debug).
3. **Deploy update**
   - While online, revisit the site after a deploy.
   - Confirm update banner appears and the update completes when tapped.

### C. Flaky network / offline-first
1. **Flaky network**
   - Use DevTools throttling or iOS Low Data Mode.
   - Reload pages to verify navigation is network-first but falls back to cached HTML when network fails.
2. **Hard offline**
   - Completely offline (airplane mode).
   - Verify previously visited pages are available offline.

## 2. Repro + verify scripts

> Run these after deployment from a machine with network access.

### Check cache-control headers
```
# HTML should be no-cache
curl -I https://<your-domain>/index.html

# Hashed assets should be immutable
curl -I https://<your-domain>/tools/markdown_editor/js/main.<hash>.js
curl -I https://<your-domain>/tools/panphyplot/css/panphyplot.<hash>.css

# Service worker should be revalidated frequently
curl -I https://<your-domain>/sw.js
```

### Verify service worker state
- Open DevTools → Application → Service Workers.
- Confirm:
  - `skipWaiting` only happens after clicking **Update**.
  - `updateViaCache: 'none'` is used (shown in registration code).
  - The active SW corresponds to the latest build ID.

### Confirm old cache eviction
- DevTools → Application → Cache Storage.
- Only the latest `panphy-labs-precache-<build-id>` and `panphy-labs-runtime-<build-id>` should remain after activation.

## 3. Pass/fail criteria

### Pass
- New deploy triggers update banner within a normal browsing session.
- Clicking **Update** reloads the page into the new build ID.
- Offline mode still loads previously visited content.
- Only the latest cache pair remains after activation.
- HTML is revalidated (no long-lived cache), hashed assets are immutable.

### Fail
- Users remain on an old build after deploy without an update prompt.
- HTML navigations are always served from stale cache even when online.
- Service worker update never activates or old caches persist indefinitely.
- Offline mode fails for previously visited pages.
