(() => {
  const BUILD_ID = '2026-02-22T16:42:00Z';
  window.__BUILD_ID__ = BUILD_ID;
  console.info(`[PanPhy Labs] Build ${BUILD_ID}`);

  if (!('serviceWorker' in navigator)) {
    return;
  }

  let updateBanner;
  let refreshing = false;
  let newWorker;

  const removeUpdateBanner = () => {
    if (!updateBanner) {
      return;
    }
    updateBanner.remove();
    updateBanner = null;
  };

  const showUpdateBanner = (worker) => {
    if (updateBanner || refreshing) {
      return;
    }

    newWorker = worker;

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
      if (refreshing || !newWorker) {
        return;
      }
      button.disabled = true;
      button.textContent = 'Updating...';
      newWorker.postMessage({ type: 'SKIP_WAITING' });
    });

    updateBanner.append(message, button);
    document.body.appendChild(updateBanner);
  };

  const listenForUpdates = (registration) => {
    // If a worker is already waiting, it's ready to take over
    if (registration.waiting) {
      showUpdateBanner(registration.waiting);
    }

    registration.addEventListener('updatefound', () => {
      const installingWorker = registration.installing;
      if (!installingWorker) return;

      installingWorker.addEventListener('statechange', () => {
        // Once installed, check if there's an existing controller.
        // If there's no controller, this is the very first install, so we don't need to prompt.
        if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
          showUpdateBanner(installingWorker);
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

      // When the new worker takes over (activation completes and it claims clients),
      // we just softly reload the page to start using the new resources.
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (refreshing) return;
        refreshing = true;
        removeUpdateBanner();
        window.location.reload();
      });

      // Periodically check for updates
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
