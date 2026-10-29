// Keep each standalone guide available inside its app without losing the workspace.
(() => {
  'use strict';

  document.querySelectorAll('a[data-manual-overlay]').forEach(opener => {
    let dialog;
    let frame;
    let newTab;
    const manualUrl = new URL(opener.href);
    const appPath = location.pathname;

    function prepareGuide() {
      const guide = frame.contentDocument;
      if (!guide) return;
      guide.documentElement.classList.add('manual-embedded');
      const styles = guide.createElement('link');
      styles.rel = 'stylesheet';
      styles.href = '/assets/manual-overlay.css';
      guide.head.append(styles);

      // Escape belongs to the guide's own dialogs first, then the outer overlay.
      guide.addEventListener('keydown', event => {
        if (event.key !== 'Escape' || guide.querySelector('dialog[open]')) return;
        event.preventDefault();
        event.stopPropagation();
        dialog.close();
      });
      guide.addEventListener('click', event => {
        const link = event.target.closest('a[href]');
        if (!link) return;
        const url = new URL(link.href);
        if (url.origin === location.origin && url.pathname === appPath && !url.search && !url.hash && link.target !== '_blank') {
          if (event.button || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
          event.preventDefault();
          dialog.close();
        } else if (url.origin !== manualUrl.origin || url.pathname !== manualUrl.pathname || url.search !== manualUrl.search) {
          // Tours and other destinations must not replace the guide or workspace.
          link.target = '_blank';
          link.rel = 'noopener';
        }
      });
      function updateNewTab() {
        newTab.href = frame.contentWindow.location.href;
      }
      frame.contentWindow.addEventListener('hashchange', updateNewTab);
      updateNewTab();
    }

    function createOverlay() {
      dialog = document.createElement('dialog');
      dialog.className = 'manual-overlay';
      dialog.id = 'manual-overlay';
      dialog.setAttribute('aria-labelledby', 'manual-overlay-title');
      const header = document.createElement('div');
      header.className = 'manual-overlay-header';
      const title = document.createElement('h2');
      title.id = 'manual-overlay-title';
      title.textContent = `${opener.dataset.manualOverlay || 'App'} manual`;
      newTab = document.createElement('a');
      newTab.href = manualUrl.href;
      newTab.target = '_blank';
      newTab.rel = 'noopener';
      newTab.textContent = 'Open in new tab';
      const close = document.createElement('button');
      close.type = 'button';
      close.textContent = 'Close';
      close.autofocus = true;
      close.setAttribute('aria-label', 'Close manual');
      close.addEventListener('click', () => dialog.close());
      header.append(title, newTab, close);
      frame = document.createElement('iframe');
      frame.title = title.textContent;
      frame.addEventListener('load', prepareGuide);
      dialog.append(header, frame);
      document.body.append(dialog);
      frame.src = manualUrl.href;
      dialog.addEventListener('close', () => {
        document.documentElement.classList.remove('manual-overlay-open');
        opener.focus({ preventScroll: true });
      });
      dialog.addEventListener('click', event => {
        if (event.target !== dialog) return;
        const bounds = dialog.getBoundingClientRect();
        if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
      });
    }

    opener.setAttribute('aria-haspopup', 'dialog');
    opener.setAttribute('aria-controls', 'manual-overlay');
    opener.addEventListener('click', event => {
      // Preserve the link's normal modified-click and no-JavaScript behavior.
      if (event.button || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      if (!dialog) createOverlay();
      document.documentElement.classList.add('manual-overlay-open');
      dialog.showModal();
    });
  });
})();
