// Registers the /gcsephy/ freshness worker (no offline caching; see sw.js) and
// offers a reload when a page that is already open changes on the server.
(() => {
  // A page can list data files it loads with fetch (space-separated, relative to
  // the page) in data-watch on this script tag, so edits to them offer a reload too.
  const extraWatch = ((document.currentScript && document.currentScript.dataset.watch) || '').split(/\s+/).filter(Boolean);

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/gcsephy/sw.js', { scope: '/gcsephy/' }).catch(() => {});
    });
  }

  // Update check: compare the content of the page, its own /gcsephy/ scripts and
  // stylesheets and any data-watch files with what they were when the page opened.
  // It never reloads by itself, so a lesson in progress is not interrupted.
  const CHECK_INTERVAL_MS = 5 * 60 * 1000;
  const MIN_GAP_MS = 60 * 1000;
  const state = { baseline: null, lastCheck: 0, checking: false, dismissed: '', banner: null };

  function watchedUrls() {
    const urls = new Set([location.origin + location.pathname + location.search]);
    const add = (value) => {
      if (!value) return;
      const url = new URL(value, location.href);
      if (url.origin === location.origin && url.pathname.startsWith('/gcsephy/')) {
        urls.add(url.origin + url.pathname + url.search);
      }
    };
    document.querySelectorAll('script[src]').forEach((el) => add(el.getAttribute('src')));
    document.querySelectorAll('link[rel~="stylesheet"][href]').forEach((el) => add(el.getAttribute('href')));
    extraWatch.forEach(add);
    return [...urls];
  }

  // Hash the content, not the ETag: GitHub Pages stamps every file's ETag and
  // Last-Modified with the deploy time, so those change on every deploy.
  // A 'no-cache' GET is usually a cheap 304 answered from the HTTP cache.
  async function fingerprint(url) {
    try {
      const res = await fetch(url, { cache: 'no-cache' });
      if (!res.ok) return null;
      const text = await res.text();
      let hash = 0x811c9dc5; // FNV-1a
      for (let i = 0; i < text.length; i++) {
        hash ^= text.charCodeAt(i);
        hash = Math.imul(hash, 0x01000193);
      }
      return (hash >>> 0).toString(16) + ':' + text.length;
    } catch {
      return null; // offline or blocked: treat as unknown
    }
  }

  async function snapshot() {
    const urls = watchedUrls();
    const tags = await Promise.all(urls.map(fingerprint));
    const map = {};
    urls.forEach((url, i) => { if (tags[i]) map[url] = tags[i]; });
    return map;
  }

  async function check() {
    if (state.checking || (state.baseline && document.visibilityState !== 'visible')) return;
    state.checking = true;
    state.lastCheck = Date.now();
    try {
      const now = await snapshot();
      if (!state.baseline) {
        state.baseline = now;
        return;
      }
      const changed = Object.keys(now).filter((url) => state.baseline[url] && state.baseline[url] !== now[url]);
      if (!changed.length) return;
      const signature = changed.map((url) => url + '=' + now[url]).join('|');
      if (signature !== state.dismissed) showBanner(signature);
    } finally {
      state.checking = false;
    }
  }

  function showBanner(signature) {
    if (state.banner) {
      state.banner.dataset.signature = signature;
      return;
    }
    const style = document.createElement('style');
    style.textContent = `
      .gcse-update { position: fixed; left: max(16px, env(safe-area-inset-left)); bottom: max(16px, env(safe-area-inset-bottom));
        z-index: 2147483000; display: flex; align-items: center; gap: 10px; max-width: min(420px, calc(100vw - 32px));
        padding: 10px 10px 10px 16px; border: 2px solid #0a1326; border-radius: 14px; background: #fffdf6; color: #0a1326;
        box-shadow: 0 8px 24px rgba(10, 19, 38, .25); font: 600 15px/1.35 system-ui, -apple-system, "Segoe UI", sans-serif; }
      .gcse-update p { margin: 0; flex: 1; }
      .gcse-update button { min-height: 44px; border-radius: 10px; font: inherit; cursor: pointer; }
      .gcse-update .gcse-update-reload { padding: 0 16px; border: 2px solid #0a1326; background: #0a1326; color: #fff; font-weight: 800; }
      .gcse-update .gcse-update-close { min-width: 44px; border: 0; background: transparent; color: inherit; font-size: 22px; line-height: 1; }
      .gcse-update button:focus-visible { outline: 3px solid #1479a8; outline-offset: 2px; }
      @media print { .gcse-update { display: none !important; } }`;
    document.head.appendChild(style);

    const banner = document.createElement('div');
    banner.className = 'gcse-update';
    banner.setAttribute('role', 'status');
    banner.dataset.signature = signature;
    banner.innerHTML = '<p>A newer version of this page is available.</p>'
      + '<button type="button" class="gcse-update-reload">Reload</button>'
      + '<button type="button" class="gcse-update-close" aria-label="Dismiss">×</button>';
    banner.querySelector('.gcse-update-reload').addEventListener('click', () => location.reload());
    banner.querySelector('.gcse-update-close').addEventListener('click', () => {
      state.dismissed = banner.dataset.signature; // show again only if something else changes
      banner.remove();
      style.remove();
      state.banner = null;
    });
    document.body.appendChild(banner);
    state.banner = banner;
  }

  function maybeCheck() {
    if (Date.now() - state.lastCheck >= MIN_GAP_MS) check();
  }

  window.addEventListener('load', () => {
    check();
    setInterval(check, CHECK_INTERVAL_MS);
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') maybeCheck(); });
    window.addEventListener('focus', maybeCheck);
    window.addEventListener('online', maybeCheck);
  });
})();
