(() => {
  if (!('serviceWorker' in navigator)) {
    return;
  }

  let updateBanner;
  let updateBannerStyle;
  let dismissedBuild = '';
  let refreshing = false;
  let newWorker;
  let currentRegistration = null;
  let updateFallbackTimer = 0;
  let updateNeeded = false;

  // Keep in step with getAssetGroup in sw.js, which versions each app's files.
  const getAppGroup = (pathname) => {
    if (pathname === '/' || pathname === '/index.html') return 'core';
    if (pathname.startsWith('/simulations/lorentz')) return 'lorentz';
    const match = pathname.match(/^\/[^/]+\/([^/.]+)/);
    return match ? match[1] : 'core';
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
      setTimeout(() => resolve(null), 3000);
    });
  };

  let waitingBuild = '';

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
      waitingBuild = newInfo.buildId || '';

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
    if (needed && waitingBuild && waitingBuild === dismissedBuild) {
      // Dismissing hides the prompt for that build only; a later build asks again.
      return;
    }
    if (needed) {
      updateNeeded = true;
      showUpdateBanner(waitingWorker, waitingBuild);
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
    if (updateBannerStyle) {
      updateBannerStyle.remove();
      updateBannerStyle = null;
    }
  };

  const showUpdateBanner = (worker, build) => {
    if (updateBanner || refreshing) {
      return;
    }

    newWorker = worker;

    updateBannerStyle = document.createElement('style');
    updateBannerStyle.textContent = `
      .panphy-update { position: fixed; left: 50%; bottom: max(16px, env(safe-area-inset-bottom)); transform: translateX(-50%);
        z-index: 2147483000; box-sizing: border-box; display: flex; align-items: center; gap: 10px;
        width: max-content; max-width: min(440px, calc(100vw - 32px));
        padding: 10px 10px 10px 18px; border: 2px solid #1B1B1B; border-radius: 16px; background: #FFFDF8; color: #1B1B1B;
        box-shadow: 0 10px 28px rgba(0, 0, 0, .28); font: 600 15px/1.35 'Manrope', system-ui, -apple-system, "Segoe UI", sans-serif;
        animation: panphy-update-in .28s ease-out; }
      .panphy-update p { margin: 0; flex: 1; }
      .panphy-update button { box-sizing: border-box; flex: none; width: auto; min-height: 48px; margin: 0; border-radius: 12px; box-shadow: none;
        font: inherit; letter-spacing: normal; text-transform: none; transform: none; cursor: pointer; }
      .panphy-update .panphy-update-action { padding: 0 18px; border: 2px solid #C2410C; background: #C2410C; color: #fff; font-weight: 800; white-space: nowrap; }
      .panphy-update .panphy-update-action:disabled { opacity: .75; cursor: progress; }
      .panphy-update .panphy-update-close { min-width: 48px; padding: 0; border: 0; background: transparent; color: inherit; font-size: 26px; font-weight: 700; line-height: 1; }
      .panphy-update button:focus-visible { outline: 3px solid #0D9488; outline-offset: 2px; }
      :root[data-theme="dark"] .panphy-update { border-color: #F8F6F1; background: #1F1D1A; color: #F8F6F1; box-shadow: 0 10px 28px rgba(0, 0, 0, .6); }
      :root[data-theme="dark"] .panphy-update .panphy-update-action { border-color: #EA580C; background: #EA580C; }
      @keyframes panphy-update-in { from { opacity: 0; transform: translate(-50%, 12px); } }
      @media (prefers-reduced-motion: reduce) { .panphy-update { animation: none; } }
      @media print { .panphy-update { display: none !important; } }`;
    document.head.appendChild(updateBannerStyle);

    updateBanner = document.createElement('div');
    updateBanner.className = 'panphy-update';
    updateBanner.setAttribute('role', 'status');
    updateBanner.setAttribute('aria-live', 'polite');

    const message = document.createElement('p');
    message.textContent = 'A new version is ready.';

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'panphy-update-action';
    button.textContent = 'Update';

    const closeButton = document.createElement('button');
    closeButton.type = 'button';
    closeButton.className = 'panphy-update-close';
    closeButton.setAttribute('aria-label', 'Dismiss');
    closeButton.textContent = '×';
    closeButton.addEventListener('click', () => {
      dismissedBuild = build || '';
      // Dismissed: do not reload this tab if another tab applies the update.
      updateNeeded = false;
      removeUpdateBanner();
    });

    button.addEventListener('click', () => {
      if (refreshing) {
        return;
      }
      button.disabled = true;
      closeButton.disabled = true;
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

    updateBanner.append(message, button, closeButton);
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

      // Report the build from the service worker itself so there is no
      // second BUILD_ID constant to keep in sync with sw.js.
      getWorkerVersions(navigator.serviceWorker.controller || registration.active).then((info) => {
        if (info && info.buildId) {
          window.__BUILD_ID__ = info.buildId;
          console.info(`[PanPhy Labs] Build ${info.buildId}`);
        }
      });

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
