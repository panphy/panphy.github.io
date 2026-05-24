(function () {
  const SELECTOR = '[data-panphy-theme-toggle]';
  const observedButtons = new WeakSet();

  const ICONS = {
    light: `
      <svg class="panphy-theme-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <circle class="panphy-theme-icon__fill" cx="12" cy="12" r="5.2"></circle>
        <path d="M12 3.4v1.8M12 18.8v1.8M3.4 12h1.8M18.8 12h1.8M5.9 5.9l1.2 1.2M16.9 16.9l1.2 1.2M5.9 18.1l1.2-1.2M16.9 7.1l1.2-1.2"></path>
      </svg>`,
    dark: `
      <svg class="panphy-theme-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path class="panphy-theme-icon__fill" d="M18.8 15.5a7.7 7.7 0 0 1-10.3-10 8 8 0 1 0 10.3 10Z"></path>
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
