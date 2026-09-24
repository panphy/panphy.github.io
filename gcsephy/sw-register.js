// Registers the /gcsephy/ freshness worker (no offline caching; see sw.js).
(() => {
  if (!('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/gcsephy/sw.js', { scope: '/gcsephy/' }).catch(() => {});
  });
})();
