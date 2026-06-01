(() => {
  const BUILD_ID = '2026-06-01T09:00:00Z';
  window.__BUILD_ID__ = BUILD_ID;
  console.info(`[PanPhy Labs] Build ${BUILD_ID}`);

  if (!('serviceWorker' in navigator)) {
    return;
  }

  let updateBanner;
  let refreshing = false;
  let newWorker;
  let currentRegistration = null;
  let updateFallbackTimer = 0;
  let updateNeeded = false;

  const getAppGroup = (pathname) => {
    if (pathname === '/' || pathname === '/index.html') return 'core';
    if (pathname.startsWith('/tools/panphymd')) return 'panphymd';
    if (pathname.startsWith('/tools/panphyplot')) return 'panphyplot';
    if (pathname.startsWith('/simulations/collision')) return 'collision';
    if (pathname.startsWith('/simulations/lorentz')) return 'lorentz';

    const match = pathname.match(/\/([^/]+)\.html$/);
    if (match) {
      return match[1];
    }
    return 'core';
  };

  const currentAppGroup = getAppGroup(window.location.pathname);

  const getWorkerVersions = (worker) => {
    return new Promise((resolve) => {
      if (!worker) {
        resolve(null);
        return;
      }
      const channel = new MessageChannel();
      channel.port1.onmessage = (event) => {
        resolve(event.data);
      };
      worker.postMessage({ type: 'GET_VERSION_MAP' }, [channel.port2]);
      setTimeout(() => resolve(null), 1000);
    });
  };

  const checkUpdateNeeded = async (waitingWorker) => {
    if (!navigator.serviceWorker.controller) {
      return false;
    }

    try {
      const [activeInfo, newInfo] = await Promise.all([
        getWorkerVersions(navigator.serviceWorker.controller),
        getWorkerVersions(waitingWorker)
      ]);

      if (!newInfo) {
        return true;
      }

      const activeVersions = activeInfo ? activeInfo.appVersions : {};
      const activeBuild = activeInfo ? activeInfo.buildId : '';

      const newVersions = newInfo.appVersions || {};
      const newBuild = newInfo.buildId;

      const activeVer = activeVersions[currentAppGroup] || activeBuild;
      const newVer = newVersions[currentAppGroup] || newBuild;

      console.info(`[PanPhy Labs] App: ${currentAppGroup}, Active Version: ${activeVer}, New Version: ${newVer}`);

      return activeVer !== newVer;
    } catch (e) {
      console.warn('[PanPhy Labs] Failed to compare version maps', e);
      return true;
    }
  };

  const handleUpdate = async (waitingWorker) => {
    const needed = await checkUpdateNeeded(waitingWorker);
    if (needed) {
      updateNeeded = true;
      showUpdateBanner(waitingWorker);
    } else {
      console.info(`[PanPhy Labs] Background update available but not required for current app (${currentAppGroup}).`);
    }
  };

  const completeRefresh = () => {
    if (refreshing) {
      return;
    }
    refreshing = true;
    if (updateFallbackTimer) {
      window.clearTimeout(updateFallbackTimer);
      updateFallbackTimer = 0;
    }
    removeUpdateBanner();
    window.location.reload();
  };

  const startUpdateFallback = () => {
    if (updateFallbackTimer) {
      window.clearTimeout(updateFallbackTimer);
    }

    updateFallbackTimer = window.setTimeout(() => {
      // Some browser/tab states may not emit controllerchange in-place.
      // Fall back to a hard reload so users are never stuck on "Updating...".
      completeRefresh();
    }, 5000);
  };

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
      if (refreshing) {
        return;
      }
      button.disabled = true;
      button.textContent = 'Updating...';

      const waitingWorker = (currentRegistration && currentRegistration.waiting) || newWorker;
      if (!waitingWorker) {
        completeRefresh();
        return;
      }

      // If the worker has already activated (e.g. from another tab or fast transition),
      // reload immediately instead of waiting for statechange or fallback timer.
      if (waitingWorker.state === 'activated') {
        completeRefresh();
        return;
      }

      waitingWorker.addEventListener('statechange', () => {
        if (waitingWorker.state === 'activated') {
          completeRefresh();
        }
      });

      startUpdateFallback();
      waitingWorker.postMessage({ type: 'SKIP_WAITING' });
    });

    updateBanner.append(message, button);
    document.body.appendChild(updateBanner);
  };

  const listenForUpdates = (registration) => {
    // If a worker is already waiting, it's ready to take over
    if (registration.waiting) {
      handleUpdate(registration.waiting);
    }

    registration.addEventListener('updatefound', () => {
      const installingWorker = registration.installing;
      if (!installingWorker) return;

      installingWorker.addEventListener('statechange', () => {
        // Once installed, check if there's an existing controller.
        // If there's no controller, this is the very first install, so we don't need to prompt.
        if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
          handleUpdate(registration.waiting || installingWorker);
        }
      });
    });
  };

  const registerServiceWorker = async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        updateViaCache: 'none'
      });
      currentRegistration = registration;

      listenForUpdates(registration);

      // When the new worker takes over (activation completes and it claims clients),
      // we reload the page if this specific app needs the update.
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (updateNeeded) {
          completeRefresh();
        } else {
          console.info(`[PanPhy Labs] Service Worker updated in background. No reload needed for app: ${currentAppGroup}`);
        }
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
