(() => {
  const BUILD_ID = '2026-02-21T17:10:00Z';
  const UPDATE_ACK_KEY = 'panphy-sw-update-ack';
  window.__BUILD_ID__ = BUILD_ID;
  console.info(`[PanPhy Labs] Build ${BUILD_ID}`);

  if (!('serviceWorker' in navigator)) {
    return;
  }

  let updateBanner;
  let isReloadingForUpdate = false;
  let isUpdateInProgress = false;

  const removeUpdateBanner = () => {
    if (!updateBanner) {
      return;
    }
    updateBanner.remove();
    updateBanner = null;
  };

  const requestActivation = async (registration) => {
    if (!registration) {
      return false;
    }

    let waitingWorker = registration.waiting;
    if (!waitingWorker) {
      try {
        await registration.update();
      } catch (error) {
        console.warn('Service Worker update check failed', error);
      }
      waitingWorker = registration.waiting;
    }

    if (!waitingWorker) {
      return false;
    }

    waitingWorker.postMessage({ type: 'SKIP_WAITING' });
    return true;
  };

  const showUpdateBanner = (registration) => {
    if (updateBanner || !registration?.waiting || isUpdateInProgress || sessionStorage.getItem(UPDATE_ACK_KEY) === '1') {
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

    button.addEventListener('click', async () => {
      if (isUpdateInProgress) {
        return;
      }

      isUpdateInProgress = true;
      button.disabled = true;
      button.textContent = 'Updating...';

      const activationRequested = await requestActivation(registration);
      if (!activationRequested) {
        isUpdateInProgress = false;
        button.disabled = false;
        button.textContent = 'Update';
        return;
      }

      sessionStorage.setItem(UPDATE_ACK_KEY, '1');

      removeUpdateBanner();

      window.setTimeout(async () => {
        if (isReloadingForUpdate) {
          return;
        }

        try {
          await registration.update();
        } catch (error) {
          console.warn('Service Worker update retry failed', error);
        }

        isReloadingForUpdate = true;
        const nextUrl = new URL(window.location.href);
        nextUrl.searchParams.set('sw-refresh', BUILD_ID);
        window.location.replace(nextUrl.toString());
      }, 4000);
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

      if (sessionStorage.getItem(UPDATE_ACK_KEY) === '1') {
        if (registration.waiting) {
          await requestActivation(registration);
        } else {
          sessionStorage.removeItem(UPDATE_ACK_KEY);
        }
      }

      navigator.serviceWorker.addEventListener('controllerchange', () => {
        isUpdateInProgress = false;
        sessionStorage.removeItem(UPDATE_ACK_KEY);
        removeUpdateBanner();
        if (!isReloadingForUpdate) {
          isReloadingForUpdate = true;
          window.location.reload();
        }
      });

      const update = () => registration.update();
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
