// Navigation and screenshot inspection for the manual. Links still work without this script.
(() => {
  'use strict';

  const contentsDialog = document.getElementById('contents-dialog');
  const imageDialog = document.getElementById('image-dialog');
  const image = document.getElementById('image-full');
  const scrollArea = document.getElementById('image-scroll');
  const zoomLevel = document.getElementById('zoom-level');
  let opener = null;
  let activeFigure = null;
  let imageWidth = 0;
  let scale = 1;

  window.PanPhyThemeToggle.mount(document.getElementById('theme-button'));

  function openDialog(dialog, source) {
    opener = source;
    dialog.showModal();
    document.body.classList.add('dialog-open');
  }

  document.getElementById('contents-button').addEventListener('click', (event) => {
    openDialog(contentsDialog, event.currentTarget);
  });

  document.querySelectorAll('[data-close-dialog]').forEach(button => {
    button.addEventListener('click', () => document.getElementById(button.dataset.closeDialog).close());
  });

  [contentsDialog, imageDialog].forEach(dialog => {
    dialog.addEventListener('click', event => {
      if (event.target === dialog) {
        const bounds = dialog.getBoundingClientRect();
        if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
      }
    });
    dialog.addEventListener('close', () => {
      document.body.classList.remove('dialog-open');
      opener?.focus({ preventScroll: true });
      if (dialog === imageDialog) activeFigure = null;
    });
  });

  function revealHashTarget() {
    const id = location.hash.slice(1);
    const target = document.getElementById(id === 'quick-start' ? 'walkthrough' : id);
    if (!target) return;
    for (let parent = target; parent; parent = parent.parentElement) {
      if (parent instanceof HTMLDetailsElement) parent.open = true;
    }
    requestAnimationFrame(() => {
      target.scrollIntoView({ block: 'start' });
      const focusTarget = target instanceof HTMLDetailsElement ? target.querySelector('summary') : target;
      focusTarget.focus({ preventScroll: true });
    });
  }

  contentsDialog.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      contentsDialog.close();
      // A link to the current hash does not fire hashchange.
      requestAnimationFrame(revealHashTarget);
    });
  });
  window.addEventListener('hashchange', revealHashTarget);
  if (location.hash) revealHashTarget();

  function setScale(nextScale, keepCenter = true) {
    const centerX = (scrollArea.scrollLeft + scrollArea.clientWidth / 2) / scale;
    const centerY = (scrollArea.scrollTop + scrollArea.clientHeight / 2) / scale;
    scale = Math.min(3, Math.max(0.1, nextScale));
    image.style.width = `${imageWidth * scale}px`;
    zoomLevel.value = `${Math.round(scale * 100)}%`;
    document.getElementById('zoom-out').disabled = scale <= 0.1;
    document.getElementById('zoom-in').disabled = scale >= 3;
    if (keepCenter) {
      scrollArea.scrollLeft = centerX * scale - scrollArea.clientWidth / 2;
      scrollArea.scrollTop = centerY * scale - scrollArea.clientHeight / 2;
    } else {
      scrollArea.scrollTo(0, 0);
    }
  }

  function fitImage() {
    const height = Number(image.getAttribute('height'));
    setScale(Math.min(1, scrollArea.clientWidth / imageWidth, scrollArea.clientHeight / height), false);
  }

  function loadFigure(figure) {
    const theme = window.PanPhyTheme.get();
    const source = figure.querySelector(`.screenshot-${theme} img`);
    image.src = source.src;
    image.alt = source.alt;
    imageWidth = Number(source.getAttribute('width'));
    image.width = imageWidth;
    image.height = Number(source.getAttribute('height'));
    document.getElementById('image-title').textContent = figure.querySelector('figcaption strong')?.textContent.replace(/\.$/, '') || 'Screenshot';
  }

  document.querySelectorAll('.screenshot-link').forEach(link => {
    link.setAttribute('aria-haspopup', 'dialog');
    link.setAttribute('aria-controls', 'image-dialog');
    link.addEventListener('click', event => {
      if (event.button || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      activeFigure = link.closest('figure');
      loadFigure(activeFigure);
      openDialog(imageDialog, link);
      fitImage();
    });
  });
  document.getElementById('zoom-in').addEventListener('click', () => setScale(scale * 1.25));
  document.getElementById('zoom-out').addEventListener('click', () => setScale(scale / 1.25));
  document.getElementById('zoom-actual').addEventListener('click', () => setScale(1, false));
  document.getElementById('zoom-fit').addEventListener('click', fitImage);
  window.addEventListener('panphy:theme-change', () => {
    if (activeFigure && imageDialog.open) {
      loadFigure(activeFigure);
      opener = activeFigure.querySelector(`.screenshot-${window.PanPhyTheme.get()}`);
      setScale(scale);
    }
  });
})();
