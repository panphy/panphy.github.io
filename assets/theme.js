(function () {
  const STORAGE_KEY = 'panphy-theme';
  const root = document.documentElement;
  const legacy = document.currentScript ? document.currentScript.dataset : {};

  function isTheme(value) {
    return value === 'light' || value === 'dark';
  }

  function read(key) {
    try {
      return key ? localStorage.getItem(key) : null;
    } catch (error) {
      return null;
    }
  }

  function save(theme) {
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch (error) {
      // Theme controls still work for this page when storage is blocked.
    }
  }

  function deviceTheme() {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark' : 'light';
  }

  function get() {
    return root.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
  }

  function apply(theme) {
    const changed = get() !== theme;
    root.setAttribute('data-theme', theme);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', theme === 'dark' ? '#111110' : '#F8F6F1');
    if (changed) {
      window.dispatchEvent(new CustomEvent('panphy:theme-change', { detail: { theme } }));
    }
  }

  function set(theme) {
    if (!isTheme(theme)) return;
    save(theme);
    apply(theme);
  }

  // Migrate the first visited page's explicit choice, then the old homepage
  // preference. Once a shared choice exists, stale app preferences cannot win.
  let initial = read(STORAGE_KEY);
  if (!isTheme(initial)) {
    const oldTheme = read(legacy.legacyTheme);
    if (isTheme(oldTheme)) initial = oldTheme;
    else if (oldTheme === 'markdown-dark') initial = 'dark';
    else if (oldTheme === 'markdown-light') initial = 'light';
    else if (read(legacy.legacyDark)) initial = 'dark';
    else if (read(legacy.legacyLight)) initial = 'light';
    else if (read('panphy-dark')) initial = 'dark';
    else if (read('panphy-light')) initial = 'light';
    if (isTheme(initial)) save(initial);
    else initial = deviceTheme();
  }

  window.PanPhyTheme = { get, set, toggle: () => set(get() === 'dark' ? 'light' : 'dark') };
  apply(initial);

  function refresh() {
    const saved = read(STORAGE_KEY);
    if (isTheme(saved)) apply(saved);
  }

  window.addEventListener('storage', (event) => {
    // Ignore sessionStorage and unrelated preferences.
    try {
      if (event.storageArea !== localStorage) return;
    } catch (error) {
      return;
    }
    if (event.key === STORAGE_KEY || event.key === null) {
      apply(isTheme(event.newValue) ? event.newValue : deviceTheme());
    }
  });
  window.addEventListener('pageshow', refresh);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') refresh();
  });
})();
