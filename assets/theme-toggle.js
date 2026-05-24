(function () {
  const DEFAULTS = {
    darkStorageKey: 'panphy-dark',
    lightThemeColor: '#F8F6F1',
    darkThemeColor: '#111110'
  };

  const ICON_SVG = `
    <svg class="panphy-theme-icon" viewBox="0 0 64 64" aria-hidden="true" focusable="false">
      <g class="panphy-theme-icon__sun">
        <g class="panphy-theme-icon__sun-rays" fill="var(--panphy-theme-button-sun-ray)">
          <rect x="29" y="4" width="6" height="12" rx="3"></rect>
          <rect x="29" y="48" width="6" height="12" rx="3"></rect>
          <rect x="4" y="29" width="12" height="6" rx="3"></rect>
          <rect x="48" y="29" width="12" height="6" rx="3"></rect>
          <rect x="11.2" y="11.2" width="6" height="12" rx="3" transform="rotate(-45 14.2 17.2)"></rect>
          <rect x="46.8" y="40.8" width="6" height="12" rx="3" transform="rotate(-45 49.8 46.8)"></rect>
          <rect x="46.8" y="11.2" width="6" height="12" rx="3" transform="rotate(45 49.8 17.2)"></rect>
          <rect x="11.2" y="40.8" width="6" height="12" rx="3" transform="rotate(45 14.2 46.8)"></rect>
        </g>
        <circle class="panphy-theme-icon__sun-core" cx="32" cy="32" r="13" fill="var(--panphy-theme-button-sun)"></circle>
        <circle cx="27.5" cy="27" r="3.2" fill="#fed7aa" opacity="0.72"></circle>
      </g>
      <g class="panphy-theme-icon__moon">
        <g class="panphy-theme-icon__moon-body">
          <circle cx="31" cy="32" r="17" fill="var(--panphy-theme-button-moon)"></circle>
          <circle cx="39" cy="27" r="16.5" fill="var(--panphy-theme-button-moon-shadow)"></circle>
          <circle cx="24" cy="24" r="2.4" fill="#e0f2fe" opacity="0.88"></circle>
          <circle cx="21" cy="36" r="1.8" fill="#e0f2fe" opacity="0.7"></circle>
        </g>
        <circle class="panphy-theme-icon__star" cx="47" cy="17" r="2.6" fill="var(--panphy-theme-button-star)"></circle>
        <circle class="panphy-theme-icon__star" cx="51" cy="36" r="1.9" fill="var(--panphy-theme-button-star)"></circle>
        <circle class="panphy-theme-icon__star" cx="39" cy="49" r="1.6" fill="var(--panphy-theme-button-star)"></circle>
      </g>
    </svg>`;

  function getStoredTheme(storageKey) {
    try {
      return localStorage.getItem(storageKey) ? 'dark' : null;
    } catch (error) {
      return null;
    }
  }

  function getInitialTheme(storageKey) {
    return getStoredTheme(storageKey) || document.documentElement.getAttribute('data-theme') || 'light';
  }

  function persistTheme(theme, storageKey) {
    try {
      if (theme === 'dark') {
        localStorage.setItem(storageKey, '1');
      } else {
        localStorage.removeItem(storageKey);
      }
    } catch (error) {
      // Theme still works for this page when storage is unavailable.
    }
  }

  function updateAppChrome(theme, options) {
    const themeColorMeta = document.querySelector('meta[name="theme-color"]');
    const statusBarMeta = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');

    if (themeColorMeta) {
      themeColorMeta.setAttribute('content', theme === 'dark' ? options.darkThemeColor : options.lightThemeColor);
    }

    if (statusBarMeta) {
      statusBarMeta.setAttribute('content', theme === 'dark' ? 'black-translucent' : 'default');
    }
  }

  function updateButton(button, theme) {
    const isDark = theme === 'dark';
    button.classList.toggle('is-dark', isDark);
    button.setAttribute('aria-pressed', String(isDark));
    button.setAttribute('title', isDark ? 'Switch to light theme' : 'Switch to dark theme');
    button.setAttribute('aria-label', isDark ? 'Switch to light theme' : 'Switch to dark theme');
  }

  function applyTheme(theme, options) {
    document.documentElement.setAttribute('data-theme', theme);
    persistTheme(theme, options.darkStorageKey);
    updateAppChrome(theme, options);

    document.querySelectorAll('[data-panphy-theme-toggle]').forEach(function (button) {
      updateButton(button, theme);
    });

    window.dispatchEvent(new CustomEvent('panphy:theme-change', { detail: { theme: theme } }));
  }

  function mountThemeToggle(button, config) {
    const options = Object.assign({}, DEFAULTS, config || {});
    const initialTheme = getInitialTheme(options.darkStorageKey);

    if (!button.hasAttribute('type')) {
      button.setAttribute('type', 'button');
    }

    button.classList.add('panphy-theme-button');
    button.dataset.panphyThemeToggle = 'ready';
    button.innerHTML = ICON_SVG;
    updateButton(button, initialTheme);

    button.addEventListener('click', function () {
      const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
      applyTheme(currentTheme === 'dark' ? 'light' : 'dark', options);
    });

    return {
      setTheme: function (theme) {
        applyTheme(theme === 'dark' ? 'dark' : 'light', options);
      },
      getTheme: function () {
        return document.documentElement.getAttribute('data-theme') || 'light';
      }
    };
  }

  function initThemeToggles() {
    const theme = getInitialTheme(DEFAULTS.darkStorageKey);
    document.documentElement.setAttribute('data-theme', theme);
    updateAppChrome(theme, DEFAULTS);

    document.querySelectorAll('[data-panphy-theme-toggle]').forEach(function (button) {
      if (button.dataset.panphyThemeToggle === 'ready') return;
      mountThemeToggle(button);
    });
  }

  window.PanPhyThemeToggle = {
    mount: mountThemeToggle,
    setTheme: function (theme) {
      applyTheme(theme === 'dark' ? 'dark' : 'light', DEFAULTS);
    },
    getTheme: function () {
      return document.documentElement.getAttribute('data-theme') || 'light';
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initThemeToggles);
  } else {
    initThemeToggles();
  }
})();
