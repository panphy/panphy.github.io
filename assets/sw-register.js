(() => {
  const BUILD_ID = '2026-02-22T23:30:00Z';
  window.__BUILD_ID__ = BUILD_ID;
  console.info(`[PanPhy Labs] Build ${BUILD_ID}`);

  if (!('serviceWorker' in navigator)) {
    return;
  }

  let updateBanner;
  let refreshing = false;
  // Track whether the page already had a controlling SW on load.
  // On first install, controllerchange fires when the new SW claims clients,
  // but we don't need to reload because the page is already fresh.
  const hadController = !!navigator.serviceWorker.controller;

  const removeUpdateBanner = () => {
    if (!updateBanner) {
      return;
    }
    updateBanner.remove();
    updateBanner = null;
  };

  const showUpdateBanner = (registration) => {
    if (updateBanner || !registration?.waiting || refreshing) {
      return;
    }

    updateBanner = document.createElement('div');
    updateBanner.setAttribute('role', 'status');
    updateBanner.setAttribute('aria-live', 'polite');
    updateBanner.style.cssText = [
      'position: fixed',
      'bottom: 16px',
      'left: 50%',
      'transform: translateX(-50%)',
      'background: rgba(0, 0, 0, 0.85)',
      'color: #fff',
      'padding: 12px 16px',
      'border-radius: 12px',
      'box-shadow: 0 10px 24px rgba(0,0,0,0.25)',
      'display: flex',
      'gap: 12px',
      'align-items: center',
      'z-index: 9999',
      'font-family: system-ui, -apple-system, sans-serif',
      'font-size: 14px'
    ].join(';');

    const message = document.createElement('span');
    message.textContent = 'A new version is ready.';

    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = 'Update';
    button.style.cssText = [
      'background: #ffffff',
      'border: none',
      'color: #000',
      'padding: 6px 12px',
      'border-radius: 8px',
      'cursor: pointer',
      'font-weight: 600'
    ].join(';');

    button.addEventListener('click', () => {
      if (refreshing) {
        return;
      }

      button.disabled = true;
      button.textContent = 'Updating...';

      const waiting = registration.waiting;
      if (!waiting) {
        // Waiting worker is gone (may have activated from another tab).
        refreshing = true;
        window.location.reload();
        return;
      }

      // Ensure we immediately reload once the new SW takes control. This bypasses the
      // `hadController` check elsewhere, ensuring the update doesn't silently stall.
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (refreshing) return;
        refreshing = true;
        window.location.reload();
      });

      // Ask the waiting SW to activate immediately.
      waiting.postMessage({ type: 'SKIP_WAITING' });

      // The controllerchange listener (below) handles the reload.
      // Retry SKIP_WAITING after 2 s in case the first message was lost.
      setTimeout(() => {
        if (refreshing) {
          return;
        }
        const w = registration.waiting;
        if (w) {
          w.postMessage({ type: 'SKIP_WAITING' });
        }
      }, 2000);

      // Failsafe: if controllerchange still hasn't fired after 8 s,
      // force a reload so the user isn't stuck.
      setTimeout(() => {
        if (!refreshing) {
          refreshing = true;
          window.location.reload();
        }
      }, 8000);
    });

    updateBanner.append(message, button);
    document.body.appendChild(updateBanner);
  };

  const listenForUpdates = (registration) => {
    if (registration.waiting) {
      showUpdateBanner(registration);
    }

    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (!newWorker) {
        return;
      }

      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          showUpdateBanner(registration);
        }
      });
    });
  };

  const registerServiceWorker = async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        updateViaCache: 'none'
      });

      listenForUpdates(registration);

      // When a new SW takes control, reload so every resource is served
      // from the new cache.  Skip the reload on first install (no update).
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!hadController || refreshing) {
          return;
        }
        refreshing = true;
        removeUpdateBanner();
        window.location.reload();
      });

      const update = () => registration.update().catch(() => { });
      update();
      setInterval(update, 60 * 60 * 1000);
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          update();
        }
      });
    } catch (err) {
      console.warn('Service Worker registration failed', err);
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', registerServiceWorker, { once: true });
  } else {
    registerServiceWorker();
  }
})();
