(function () {
  const SELECTOR = '[data-panphy-fullscreen]';

  // Enter fullscreen: 4 outer corner L-shapes (corners of the frame)
  // Exit fullscreen: 4 inner corner L-shapes (folded inward)
  const ICONS = {
    enter: `
      <svg class="panphy-fs-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5"/>
      </svg>`,
    exit: `
      <svg class="panphy-fs-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M9 4v5H4M20 9h-5V4M15 20v-5h5M4 15h5v5"/>
      </svg>`
  };

  function isFullscreen() {
    return !!(document.fullscreenElement || document.webkitFullscreenElement);
  }

  function getCurrentTheme() {
    return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
  }

  function getTarget(button) {
    const val = button.getAttribute('data-panphy-fullscreen');
    if (val) {
      const el = document.querySelector(val);
      if (el) return el;
    }
    return document.documentElement;
  }

  function syncButton(button) {
    if (!button) return;
    const full = isFullscreen();
    const isDark = getCurrentTheme() === 'dark';

    button.classList.add('panphy-fullscreen-button');
    button.classList.toggle('is-fullscreen', full);
    button.classList.toggle('is-dark', isDark);

    button.setAttribute('aria-pressed', String(full));
    button.setAttribute('aria-label', full ? 'Exit fullscreen' : 'Enter fullscreen');
    button.setAttribute('title', full ? 'Exit fullscreen' : 'Enter fullscreen');

    const state = full ? 'exit' : 'enter';
    if (button.dataset.panphyFsState !== state || !button.querySelector('.panphy-fs-icon')) {
      button.innerHTML = ICONS[state];
      button.dataset.panphyFsState = state;
    }
  }

  function syncAll() {
    document.querySelectorAll(SELECTOR).forEach(syncButton);
  }

  function requestFullscreen(el) {
    if (el.requestFullscreen) return el.requestFullscreen();
    if (el.webkitRequestFullscreen) return el.webkitRequestFullscreen();
    return Promise.resolve();
  }

  function exitFullscreen() {
    if (document.exitFullscreen) return document.exitFullscreen();
    if (document.webkitExitFullscreen) return document.webkitExitFullscreen();
    return Promise.resolve();
  }

  function mountButton(button) {
    if (button.dataset.panphyFsReady === 'true') return;
    button.dataset.panphyFsReady = 'true';

    syncButton(button);

    button.addEventListener('click', () => {
      if (isFullscreen()) {
        exitFullscreen().catch(() => {});
      } else {
        requestFullscreen(getTarget(button)).catch(() => {});
      }
    });
  }

  function initAddedNodes(node) {
    if (!(node instanceof Element)) return;
    if (node.matches(SELECTOR)) mountButton(node);
    node.querySelectorAll(SELECTOR).forEach(mountButton);
  }

  function init() {
    document.querySelectorAll(SELECTOR).forEach(mountButton);
  }

  document.addEventListener('fullscreenchange', syncAll);
  document.addEventListener('webkitfullscreenchange', syncAll);
  window.addEventListener('panphy:theme-change', syncAll);

  new MutationObserver(() => syncAll())
    .observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  if (document.body) {
    new MutationObserver((mutations) => {
      mutations.forEach((m) => m.addedNodes.forEach(initAddedNodes));
    }).observe(document.body, { childList: true, subtree: true });
  } else {
    document.addEventListener('DOMContentLoaded', () => {
      new MutationObserver((mutations) => {
        mutations.forEach((m) => m.addedNodes.forEach(initAddedNodes));
      }).observe(document.body, { childList: true, subtree: true });
    });
  }

  window.PanPhyFullscreen = { sync: syncButton, syncAll, isFullscreen };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
