// Slide navigation for the Atoms and Nuclear Radiation deck: scaling,
// keyboard / touch / button controls, step reveals, URL hash and fullscreen.
(() => {
  const SLIDE_W = 1600;
  const SLIDE_H = 900;
  const state = { index: 0, slides: [], orbitFrame: 0 };

  const deck = document.getElementById('deck');
  const stage = document.getElementById('stage');
  const counter = document.getElementById('counter');
  const progress = document.getElementById('progress-bar');
  const prevButton = document.getElementById('prev');
  const nextButton = document.getElementById('next');
  const fullscreenButton = document.getElementById('fullscreen');
  const thumbs = document.getElementById('thumbs');
  const thumbsToggle = document.getElementById('thumbs-toggle');
  const THUMBS_KEY = 'atoms-radiation-deck-thumbs-hidden';
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  function fit() {
    const box = stage.getBoundingClientRect();
    const pad = document.body.classList.contains('is-fullscreen') ? 0 : 16;
    const scale = Math.min((box.width - pad * 2) / SLIDE_W, (box.height - pad * 2) / SLIDE_H);
    const left = (box.width - SLIDE_W * scale) / 2;
    const top = (box.height - SLIDE_H * scale) / 2;
    deck.style.transform = `translate(${left}px, ${top}px) scale(${scale})`;
  }

  const hiddenSteps = slide => [...slide.querySelectorAll('.step:not(.shown)')];

  function show(index, { fromEnd = false } = {}) {
    state.index = Math.max(0, Math.min(state.slides.length - 1, index));
    state.slides.forEach((slide, i) => {
      const active = i === state.index;
      slide.classList.toggle('active', active);
      slide.setAttribute('aria-hidden', String(!active));
      slide.inert = !active;
    });
    const slide = state.slides[state.index];
    slide.querySelectorAll('.step').forEach(step => step.classList.toggle('shown', fromEnd));
    const n = state.index + 1;
    const total = state.slides.length;
    counter.innerHTML = `<b>${String(n).padStart(2, '0')}</b> / ${String(total).padStart(2, '0')}`;
    progress.style.width = `${(n / total) * 100}%`;
    prevButton.disabled = state.index === 0;
    nextButton.disabled = state.index === total - 1 && !hiddenSteps(slide).length;
    thumbs.querySelectorAll('.thumb').forEach((thumb, i) => {
      const current = i === state.index;
      thumb.setAttribute('aria-current', String(current));
      if (current && document.body.classList.contains('show-thumbs')) thumb.scrollIntoView({ block: 'center' });
    });
    if (location.hash !== `#${n}`) history.replaceState(null, '', `#${n}`);
    document.title = `${slide.dataset.title || 'Atoms and Nuclear Radiation'} · GCSE Physics`;
  }

  function next() {
    const slide = state.slides[state.index];
    const pending = hiddenSteps(slide);
    if (pending.length) {
      pending[0].classList.add('shown');
      nextButton.disabled = state.index === state.slides.length - 1 && pending.length === 1;
      return;
    }
    if (state.index < state.slides.length - 1) show(state.index + 1);
  }

  function prev() {
    const slide = state.slides[state.index];
    const shown = slide.querySelectorAll('.step.shown');
    if (shown.length) {
      shown[shown.length - 1].classList.remove('shown');
      nextButton.disabled = false;
      return;
    }
    if (state.index > 0) show(state.index - 1, { fromEnd: true });
  }

  function onKey(event) {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.target.closest('a, button') && (event.key === 'Enter' || event.key === ' ')) return;
    switch (event.key) {
      case 'ArrowRight': case 'ArrowDown': case 'PageDown': case ' ': case 'Enter':
        event.preventDefault(); next(); break;
      case 'ArrowLeft': case 'ArrowUp': case 'PageUp': case 'Backspace':
        event.preventDefault(); prev(); break;
      case 'Home': event.preventDefault(); show(0); break;
      case 'End': event.preventDefault(); show(state.slides.length - 1); break;
      case 'f': case 'F': toggleFullscreen(); break;
      case 't': case 'T': setThumbs(!document.body.classList.contains('show-thumbs')); break;
      default: break;
    }
  }

  // Thumbnails are scaled copies of each slide, with steps shown and motion removed.
  function buildThumbs() {
    const scale = 184 / SLIDE_W;
    state.slides.forEach((slide, i) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'thumb';
      button.setAttribute('aria-label', `Slide ${i + 1}: ${slide.dataset.title || ''}`);
      const copy = slide.cloneNode(true);
      copy.classList.remove('active');
      copy.removeAttribute('aria-hidden');
      copy.querySelectorAll('.mover, [id]').forEach(node => (node.classList.contains('mover') ? node.remove() : node.removeAttribute('id')));
      copy.querySelectorAll('.pulse, .draw').forEach(node => node.classList.remove('pulse', 'draw'));
      button.innerHTML = `<span class="thumb-num">${i + 1}</span><span class="thumb-frame" aria-hidden="true"><span class="thumb-slide" style="transform: scale(${scale})"></span></span>`;
      const holder = button.querySelector('.thumb-slide');
      holder.appendChild(copy);
      holder.inert = true;
      button.addEventListener('click', () => show(i));
      thumbs.appendChild(button);
    });
  }

  function setThumbs(visible, remember = true) {
    document.body.classList.toggle('show-thumbs', visible);
    thumbsToggle.setAttribute('aria-pressed', String(visible));
    thumbsToggle.setAttribute('aria-label', visible ? 'Hide slide thumbnails' : 'Show slide thumbnails');
    if (remember) {
      try { if (visible) localStorage.removeItem(THUMBS_KEY); else localStorage.setItem(THUMBS_KEY, '1'); } catch (error) {}
    }
    fit();
    if (visible) thumbs.querySelector('[aria-current="true"]')?.scrollIntoView({ block: 'center' });
  }

  // Swipe left / right on touch screens.
  let touchStart = null;
  function onTouchStart(event) {
    if (event.touches.length !== 1) { touchStart = null; return; }
    touchStart = { x: event.touches[0].clientX, y: event.touches[0].clientY };
  }
  function onTouchEnd(event) {
    if (!touchStart) return;
    const dx = event.changedTouches[0].clientX - touchStart.x;
    const dy = event.changedTouches[0].clientY - touchStart.y;
    touchStart = null;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.4) {
      if (dx < 0) next(); else prev();
    }
  }

  const fullscreenElement = () => document.fullscreenElement || document.webkitFullscreenElement;
  function toggleFullscreen() {
    const root = document.documentElement;
    if (fullscreenElement()) {
      (document.exitFullscreen || document.webkitExitFullscreen).call(document);
    } else {
      const request = root.requestFullscreen || root.webkitRequestFullscreen;
      if (request) request.call(root);
    }
  }
  function onFullscreenChange() {
    const on = !!fullscreenElement();
    document.body.classList.toggle('is-fullscreen', on);
    fullscreenButton.setAttribute('aria-pressed', String(on));
    fullscreenButton.setAttribute('aria-label', on ? 'Exit fullscreen' : 'Present fullscreen');
    requestAnimationFrame(fit);
  }

  // Move electrons around their orbits on the visible slide only.
  function animateOrbits(time) {
    state.orbitFrame = requestAnimationFrame(animateOrbits);
    if (reduceMotion.matches) return;
    const slide = state.slides[state.index];
    slide.querySelectorAll('[data-orbit]').forEach(node => {
      const [cx, cy, rx, ry, phase, period, tilt] = node.dataset.orbit.split(',').map(Number);
      const [x, y] = window.DeckFigures.orbitPoint(cx, cy, rx, ry, phase + (time / 1000) * (Math.PI * 2 / period), tilt);
      node.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)})`);
    });
  }

  function init() {
    window.DeckFigures.render();
    state.slides = [...deck.querySelectorAll('.slide')];
    state.slides.forEach((slide, i) => {
      const foot = slide.querySelector('.slide-foot [data-page]');
      if (foot) foot.textContent = String(i + 1).padStart(2, '0');
    });
    buildThumbs();
    let thumbsHidden = false;
    try { thumbsHidden = !!localStorage.getItem(THUMBS_KEY); } catch (error) {}
    setThumbs(!thumbsHidden, false);
    const fromHash = parseInt(location.hash.slice(1), 10);
    show(Number.isFinite(fromHash) ? fromHash - 1 : 0);
    fit();

    prevButton.addEventListener('click', prev);
    nextButton.addEventListener('click', next);
    fullscreenButton.addEventListener('click', toggleFullscreen);
    thumbsToggle.addEventListener('click', () => setThumbs(!document.body.classList.contains('show-thumbs')));
    if (!(document.documentElement.requestFullscreen || document.documentElement.webkitRequestFullscreen)) fullscreenButton.hidden = true;
    document.addEventListener('keydown', onKey);
    document.addEventListener('fullscreenchange', onFullscreenChange);
    document.addEventListener('webkitfullscreenchange', onFullscreenChange);
    stage.addEventListener('touchstart', onTouchStart, { passive: true });
    stage.addEventListener('touchend', onTouchEnd, { passive: true });
    window.addEventListener('resize', fit);
    window.addEventListener('hashchange', () => {
      const n = parseInt(location.hash.slice(1), 10);
      if (Number.isFinite(n) && n - 1 !== state.index) show(n - 1);
    });
    window.addEventListener('beforeprint', () => state.slides.forEach(slide => slide.querySelectorAll('.step').forEach(step => step.classList.add('shown'))));
    state.orbitFrame = requestAnimationFrame(animateOrbits);
  }

  init();
})();
