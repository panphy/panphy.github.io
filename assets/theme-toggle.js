(function () {
  const SELECTOR = '[data-panphy-theme-toggle]';
  const observedButtons = new WeakSet();

  const ICONS = {
    light: `
      <svg class="panphy-theme-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <circle cx="12" cy="12" r="4"></circle>
        <path d="M12 2.8v2.4M12 18.8v2.4M4.2 4.2l1.7 1.7M18.1 18.1l1.7 1.7M2.8 12h2.4M18.8 12h2.4M4.2 19.8l1.7-1.7M18.1 5.9l1.7-1.7"></path>
      </svg>`,
    dark: `
      <svg class="panphy-theme-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M18.8 15.4A7.8 7.8 0 0 1 8.6 5.2 8.2 8.2 0 1 0 18.8 15.4Z"></path>
      </svg>`
  };

  function getCurrentTheme() {
    return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
  }

  function syncButton(button, theme) {
    if (!button) return;

    const normalizedTheme = theme === 'dark' ? 'dark' : 'light';
    const isDark = normalizedTheme === 'dark';

    button.classList.add('panphy-theme-button');
    button.classList.toggle('is-dark', isDark);
    button.setAttribute('aria-pressed', String(isDark));
    button.setAttribute('aria-label', isDark ? 'Switch to light theme' : 'Switch to dark theme');
    button.setAttribute('title', isDark ? 'Switch to light theme' : 'Switch to dark theme');

    if (button.dataset.panphyThemeIcon !== normalizedTheme || !button.querySelector('.panphy-theme-icon')) {
      button.innerHTML = ICONS[normalizedTheme];
      button.dataset.panphyThemeIcon = normalizedTheme;
    }

    observeButton(button);
  }

  function syncAll(theme) {
    const currentTheme = theme || getCurrentTheme();
    document.querySelectorAll(SELECTOR).forEach((button) => {
      syncButton(button, currentTheme);
    });
  }

  function observeButton(button) {
    if (observedButtons.has(button)) return;
    observedButtons.add(button);

    const observer = new MutationObserver(() => {
      if (!button.querySelector('.panphy-theme-icon')) {
        syncButton(button, getCurrentTheme());
      }
    });

    observer.observe(button, {
      childList: true,
      characterData: true,
      subtree: true
    });
  }

  function mountAutoToggle(button, config) {
    const options = Object.assign({
      darkStorageKey: 'panphy-dark',
      lightThemeColor: '#F8F6F1',
      darkThemeColor: '#111110'
    }, config || {});

    syncButton(button, getCurrentTheme());

    if (button.dataset.panphyThemeAutoReady === 'true') {
      return;
    }

    button.dataset.panphyThemeAutoReady = 'true';
    button.addEventListener('click', () => {
      const next = getCurrentTheme() === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);

      try {
        if (next === 'dark') {
          localStorage.setItem(options.darkStorageKey, '1');
        } else {
          localStorage.removeItem(options.darkStorageKey);
        }
      } catch (error) {
        // The visible page theme still changes when storage is unavailable.
      }

      const themeColorMeta = document.querySelector('meta[name="theme-color"]');
      const statusBarMeta = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
      if (themeColorMeta) {
        themeColorMeta.setAttribute('content', next === 'dark' ? options.darkThemeColor : options.lightThemeColor);
      }
      if (statusBarMeta) {
        statusBarMeta.setAttribute('content', next === 'dark' ? 'black-translucent' : 'default');
      }

      syncAll(next);
      window.dispatchEvent(new CustomEvent('panphy:theme-change', { detail: { theme: next } }));
    });
  }

  function init() {
    document.querySelectorAll(SELECTOR).forEach((button) => {
      if (button.getAttribute('data-panphy-theme-toggle') === 'auto') {
        mountAutoToggle(button);
      } else {
        syncButton(button, getCurrentTheme());
      }
    });
  }

  function initAddedNodes(node) {
    if (!(node instanceof Element)) return;
    if (node.matches(SELECTOR)) {
      syncButton(node, getCurrentTheme());
    }
    node.querySelectorAll(SELECTOR).forEach((button) => {
      syncButton(button, getCurrentTheme());
    });
  }

  const observer = new MutationObserver((mutations) => {
    if (mutations.some((mutation) => mutation.attributeName === 'data-theme')) {
      syncAll();
    }
  });

  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme']
  });

  if (document.body) {
    new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach(initAddedNodes);
      });
    }).observe(document.body, { childList: true, subtree: true });
  } else {
    document.addEventListener('DOMContentLoaded', () => {
      new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          mutation.addedNodes.forEach(initAddedNodes);
        });
      }).observe(document.body, { childList: true, subtree: true });
    });
  }

  window.PanPhyThemeToggle = {
    mount: mountAutoToggle,
    sync: syncButton,
    syncAll,
    update: syncButton
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
