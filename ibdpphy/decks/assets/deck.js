// Slide navigation shared by the IB DP Physics decks: scaling, keyboard /
// touch / button controls, step reveals, URL hash and fullscreen.
(() => {
  const SLIDE_W = 1600;
  const SLIDE_H = 900;
  const state = { index: 0, slides: [], orbitFrame: 0, scatter: null, loops: [], clocks: [] };

  const deck = document.getElementById('deck');
  const stage = document.getElementById('stage');
  const counter = document.getElementById('counter');
  const progress = document.getElementById('progress-bar');
  const prevButton = document.getElementById('prev');
  const nextButton = document.getElementById('next');
  const fullscreenButton = document.getElementById('fullscreen');
  const thumbs = document.getElementById('thumbs');
  const thumbsToggle = document.getElementById('thumbs-toggle');
  const THUMBS_KEY = 'ibdp-deck-thumbs-hidden';
  const DECK_TITLE = document.title;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  // A landscape phone fills the screen with the slide, as when presenting.
  const LANDSCAPE_PHONE = window.matchMedia('screen and (orientation: landscape) and (max-height: 500px)');

  function fit() {
    const box = stage.getBoundingClientRect();
    const pad = document.body.classList.contains('is-fullscreen') || LANDSCAPE_PHONE.matches ? 0 : 16;
    const scale = Math.min((box.width - pad * 2) / SLIDE_W, (box.height - pad * 2) / SLIDE_H);
    const left = (box.width - SLIDE_W * scale) / 2;
    const top = (box.height - SLIDE_H * scale) / 2;
    deck.style.transform = `translate(${left}px, ${top}px) scale(${scale})`;
    // Where the slide sits on screen, for the HL bar and flag drawn at the screen edges when presenting.
    const root = document.documentElement.style;
    root.setProperty('--deck-scale', scale.toFixed(4));
    root.setProperty('--deck-gap-x', `${Math.max(0, box.left + left).toFixed(1)}px`);
  }

  // A figure's numbered builds (data-build) are steps run by its Play button, not by clicks.
  const CLICK_STEP = '.step:not([data-build])';
  const hiddenSteps = slide => [...slide.querySelectorAll(`${CLICK_STEP}:not(.shown)`)];

  function show(index, { fromEnd = false } = {}) {
    state.index = Math.max(0, Math.min(state.slides.length - 1, index));
    state.slides.forEach((slide, i) => {
      const active = i === state.index;
      slide.classList.toggle('active', active);
      slide.setAttribute('aria-hidden', String(!active));
      slide.inert = !active;
    });
    const slide = state.slides[state.index];
    slide.querySelectorAll(CLICK_STEP).forEach(step => step.classList.toggle('shown', fromEnd));
    syncPlays(slide);
    state.loops.forEach(loop => { if (loop.slide !== slide) loop.reset(); });
    const n = state.index + 1;
    const total = state.slides.length;
    counter.innerHTML = `<b>${String(n).padStart(2, '0')}</b> / ${String(total).padStart(2, '0')}`;
    progress.style.width = `${(n / total) * 100}%`;
    prevButton.disabled = state.index === 0;
    nextButton.disabled = state.index === total - 1 && !hiddenSteps(slide).length;
    // Keyboard focus in the sidebar follows the current slide, so no ring is left on the old thumbnail.
    const thumbFocused = thumbs.contains(document.activeElement);
    thumbs.querySelectorAll('.thumb').forEach((thumb, i) => {
      const current = i === state.index;
      thumb.setAttribute('aria-current', String(current));
      if (current && thumbFocused && document.activeElement !== thumb) thumb.focus({ preventScroll: true });
      if (current && document.body.classList.contains('show-thumbs')) thumb.scrollIntoView({ block: 'center' });
    });
    if (window.DeckNotes) window.DeckNotes.show(slide);
    if (location.hash !== `#${n}`) history.replaceState(null, '', `#${n}`);
    document.title = slide.dataset.title && !DECK_TITLE.startsWith(slide.dataset.title) ? `${slide.dataset.title} — ${DECK_TITLE}` : DECK_TITLE;
    setScatterActive();
  }

  // Figures that play once: SMIL animations with begin="indefinite" start when the figure's empty
  // .step.play is shown. Hiding that step again swaps in a fresh copy, back at the start.
  function syncPlays(slide) {
    slide.querySelectorAll('svg:has(.step.play)').forEach(figure => {
      const on = !!figure.querySelector('.step.play.shown');
      if (on && !figure.dataset.played) {
        figure.dataset.played = '1';
        figure.querySelectorAll('[begin="indefinite"]').forEach(node => node.beginElement?.());
      } else if (!on && figure.dataset.played) {
        // Parsed afresh from its markup: a clone can keep the frozen end state of an animation.
        delete figure.dataset.played;
        const holder = document.createElement('div');
        holder.innerHTML = figure.outerHTML;
        figure.replaceWith(holder.firstElementChild);
      }
    });
  }

  // Every moving figure on a content slide waits at the start with Play/Pause and Reset (icons)
  // under it, so a teacher runs it when ready; leaving the slide puts it back at the start. Small
  // pictures (data-plain, data-still, title and section slides) keep moving on their own, and
  // data-controls="off" opts a figure out, and data-controls="run" also shows all its numbered
  // builds at once, running from when the slide opens. A 3D model over a figure with controls
  // takes its time from the figure's clock (fig.deckClock), and calls fig.deckDone when a run
  // with an end finishes. Kinds, any of which a figure may combine:
  //   loops: SMIL animations that repeat, run by the SVG's own clock;
  //   orbits: [data-orbit] nodes moved by animateOrbits, run by a clock of the figure's own;
  //   builds: the figure's numbered steps (k1, k2, ...), with the CSS transitions and animations
  //     they set off (wipes, A.2's collisions). Play shows them in order, each once the last has
  //     run and been held for a moment; steps of the same number show together;
  //   play: SMIL animations with begin="indefinite", begun when its empty .step.play is shown.
  // The numbered and play steps leave the click order: the Play button shows them instead.
  const ICONS = {
    play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l10.5-6.5z"/></svg>',
    pause: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5.5h3.6v13H7zM13.4 5.5H17v13h-3.6z"/></svg>',
    reset: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12a7 7 0 1 0 2.05-4.95" style="fill:none;stroke:currentColor;stroke-width:2.4;stroke-linecap:round"/><path d="M5.5 3.5v4.5H10" style="fill:none;stroke:currentColor;stroke-width:2.4;stroke-linecap:round;stroke-linejoin:round"/></svg>',
  };
  const LOOPING = 'animate[repeatCount="indefinite"], animateTransform[repeatCount="indefinite"], animateMotion[repeatCount="indefinite"], [data-orbit]';
  const orbitClocks = new WeakMap();
  const BUILD_HOLD = 900;
  const buildNumber = node => +((node.getAttribute('class') || '').match(/(?:^|\s)k(\d+)(?=\s|$)/) || [])[1] || 0;

  function buildLoopControls() {
    if (reduceMotion.matches) return;
    deck.querySelectorAll('.fig').forEach(fig => {
      if (fig.dataset.controls === 'run') {
        fig.querySelectorAll('svg .step').forEach(node => { const k = buildNumber(node); if (k) { node.dataset.build = k; node.classList.add('shown'); } });
        return;
      }
      if (fig.dataset.controls === 'off' || 'plain' in fig.dataset || 'still' in fig.dataset || fig.closest('.slide.title, .slide.section')) return;
      const svgOf = () => fig.querySelector('svg');
      if (!svgOf() || !svgOf().pauseAnimations) return;
      // Numbered steps are marked data-build, which survives the fresh copy a reset makes.
      fig.querySelectorAll('svg .step').forEach(node => { const k = buildNumber(node); if (k) node.dataset.build = k; });
      const hasBuilds = !!fig.querySelector('[data-build]');
      const isPlay = !!fig.querySelector('.step.play');
      if (!hasBuilds && !isPlay && !fig.querySelector(LOOPING)) return;
      if (isPlay) fig.querySelector('.step.play').classList.remove('step');
      const clock = { t: 0, playing: false };
      if (fig.querySelector('[data-orbit]')) orbitClocks.set(fig, clock);
      fig.deckClock = clock;
      // A 3D model whose run has an end (model3d.js `once`) stops the figure there.
      fig.deckDone = () => done();
      state.clocks.push({ slide: fig.closest('.slide'), clock });

      const row = document.createElement('div');
      row.className = 'sim-buttons loop-buttons';
      row.innerHTML = `<button type="button" class="sim-button" data-k="play"></button><button type="button" class="sim-button" data-k="reset" aria-label="Reset" title="Reset">${ICONS.reset}</button>`;
      const play = row.querySelector('[data-k="play"]');
      let playing = false, started = false, finished = false, run = 0, stage = 0, hold = null, buildsDone = false, smilDone = false;
      const label = on => {
        playing = on;
        clock.playing = on;
        play.innerHTML = on ? ICONS.pause : ICONS.play;
        play.setAttribute('aria-label', on ? 'Pause' : 'Play');
        play.title = on ? 'Pause' : 'Play';
      };
      const css = () => fig.getAnimations({ subtree: true });
      const done = () => { if (playing) label(false); finished = true; };
      const settle = () => { if (buildsDone && smilDone && !fig.querySelector(LOOPING)) done(); };
      const stages = () => {
        const groups = new Map();
        fig.querySelectorAll('[data-build]').forEach(node => { const k = +node.dataset.build; groups.set(k, [...(groups.get(k) || []), node]); });
        return [...groups.keys()].sort((a, b) => a - b).map(k => groups.get(k));
      };
      // The pause between builds runs only while playing.
      const resumeHold = () => {
        if (!hold || hold.id) return;
        hold.since = performance.now();
        hold.id = setTimeout(() => { const { then } = hold; hold = null; then(); }, Math.max(0, hold.left));
      };
      const pauseHold = () => {
        if (!hold?.id) return;
        clearTimeout(hold.id);
        hold.id = 0;
        hold.left -= performance.now() - hold.since;
      };
      const nextBuild = mine => {
        if (mine !== run) return;
        const groups = stages();
        if (stage >= groups.length) { buildsDone = true; settle(); return; }
        const before = new Set(css()); // also settles the styles, so each transition starts afresh
        groups[stage].forEach(node => node.classList.add('shown'));
        stage += 1;
        const parts = css().filter(anim => !before.has(anim) && anim.effect?.getComputedTiming().endTime !== Infinity);
        Promise.all(parts.map(anim => anim.finished)).then(() => {
          if (mine !== run) return;
          if (stage >= groups.length) { buildsDone = true; settle(); return; }
          hold = { left: BUILD_HOLD, id: 0, then: () => nextBuild(mine) };
          if (playing) resumeHold();
        }, () => {});
      };
      const reset = () => {
        label(false);
        run += 1;
        started = false;
        finished = false;
        stage = 0;
        if (hold?.id) clearTimeout(hold.id);
        hold = null;
        clock.t = 0;
        fig.querySelectorAll('[data-build].shown').forEach(node => node.classList.remove('shown'));
        // Straight back to the start, without fading out.
        css().forEach(anim => { if (anim instanceof CSSTransition) anim.finish(); });
        if (isPlay && fig.querySelector('.play.shown')) {
          // Parsed afresh from its markup: a played SMIL animation keeps its begin time.
          fig.querySelector('.play.shown').classList.remove('shown');
          const holder = document.createElement('div');
          holder.innerHTML = svgOf().outerHTML;
          svgOf().replaceWith(holder.firstElementChild);
        }
        svgOf().pauseAnimations();
        svgOf().setCurrentTime(0);
      };
      const start = () => {
        started = true;
        const mine = run;
        buildsDone = !hasBuilds;
        smilDone = !isPlay;
        svgOf().unpauseAnimations();
        if (hasBuilds) nextBuild(mine);
        if (isPlay) {
          fig.querySelector('.play').classList.add('shown');
          const once = [...svgOf().querySelectorAll('[begin="indefinite"]')];
          let left = once.length;
          once.forEach(node => {
            node.addEventListener('endEvent', () => { left -= 1; if (!left && mine === run && !fig.querySelector('[repeatCount="indefinite"]')) { smilDone = true; settle(); } }, { once: true });
            node.beginElement?.();
          });
        }
      };
      play.addEventListener('click', () => {
        if (playing) {
          svgOf().pauseAnimations();
          css().forEach(anim => anim.pause());
          pauseHold();
          label(false);
          return;
        }
        if (finished) reset();
        label(true);
        if (!started) start();
        else { svgOf().unpauseAnimations(); css().forEach(anim => anim.play()); resumeHold(); }
      });
      row.querySelector('[data-k="reset"]').addEventListener('click', reset);
      label(false);
      reset();
      // data-controls="head": in the panel's heading, for a panel of fixed height.
      const head = fig.dataset.controls === 'head' && fig.closest('.panel')?.querySelector('.panel-head');
      if (head) head.append(row); else fig.after(row);
      state.loops.push({ slide: fig.closest('.slide'), reset });
    });
  }

  function next() {
    const slide = state.slides[state.index];
    const pending = hiddenSteps(slide);
    if (pending.length) {
      pending[0].classList.add('shown');
      syncPlays(slide);
      nextButton.disabled = state.index === state.slides.length - 1 && pending.length === 1;
      return;
    }
    if (state.index < state.slides.length - 1) show(state.index + 1);
  }

  function prev() {
    const slide = state.slides[state.index];
    const shown = slide.querySelectorAll(`${CLICK_STEP}.shown`);
    if (shown.length) {
      shown[shown.length - 1].classList.remove('shown');
      syncPlays(slide);
      nextButton.disabled = false;
      return;
    }
    if (state.index > 0) show(state.index - 1, { fromEnd: true });
  }

  function onKey(event) {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    if (thumbs.contains(event.target) && (event.key === 'ArrowUp' || event.key === 'ArrowDown')) {
      event.preventDefault();
      const index = state.index + (event.key === 'ArrowDown' ? 1 : -1);
      if (index >= 0 && index < state.slides.length) show(index);
      return;
    }
    if (event.target.closest('a, button') && (event.key === 'Enter' || event.key === ' ')) return;
    switch (event.key) {
      case 'ArrowRight': case 'ArrowDown': case 'PageDown': case ' ': case 'Enter':
        event.preventDefault(); next(); break;
      case 'ArrowLeft': case 'ArrowUp': case 'PageUp': case 'Backspace':
        event.preventDefault(); prev(); break;
      case 'Home': event.preventDefault(); show(0); break;
      case 'End': event.preventDefault(); show(state.slides.length - 1); break;
      case 'f': case 'F': toggleFullscreen(); break;
      case 'Escape': if (document.body.classList.contains('is-window-fullscreen')) setPresenting(false); break;
      case 't': case 'T': setThumbs(!document.body.classList.contains('show-thumbs')); break;
      default: break;
    }
  }

  // A thumbnail holds its photos only while it is near the visible part of the sidebar. Otherwise
  // every photo in the deck stays decoded at once, and iPad browsers (all WebKit) run short of
  // memory and paint some photos on the slides as blank white boxes.
  function holdThumbImages(holder, near) {
    holder.querySelectorAll('img').forEach(img => {
      if (near && img.dataset.thumbSrc) {
        img.src = img.dataset.thumbSrc;
        delete img.dataset.thumbSrc;
      } else if (!near && img.getAttribute('src')) {
        img.dataset.thumbSrc = img.getAttribute('src');
        img.removeAttribute('src');
      }
    });
  }

  // Thumbnails are scaled copies of each slide, with steps shown and motion removed.
  function buildThumbs() {
    const scale = 184 / SLIDE_W;
    const nearView = 'IntersectionObserver' in window && new IntersectionObserver(entries => {
      entries.forEach(entry => holdThumbImages(entry.target.querySelector('.thumb-slide'), entry.isIntersecting));
    }, { root: thumbs, rootMargin: '400px 0px' });
    state.slides.forEach((slide, i) => {
      const button = document.createElement('button');
      button.type = 'button';
      const hl = slide.classList.contains('hl');
      button.className = hl ? 'thumb hl' : 'thumb';
      button.setAttribute('aria-label', `Slide ${i + 1}${hl ? ' (HL only)' : ''}: ${slide.dataset.title || ''}`);
      const copy = slide.cloneNode(true);
      copy.classList.remove('active');
      copy.removeAttribute('aria-hidden');
      copy.querySelectorAll('.mover, [id]').forEach(node => (node.classList.contains('mover') ? node.remove() : node.removeAttribute('id')));
      copy.querySelectorAll('.pulse, .draw').forEach(node => node.classList.remove('pulse', 'draw'));
      button.innerHTML = `<span class="thumb-num">${i + 1}</span><span class="thumb-frame" aria-hidden="true"><span class="thumb-slide" style="transform: scale(${scale})"></span></span>`;
      const holder = button.querySelector('.thumb-slide');
      holder.appendChild(copy);
      holder.inert = true;
      if (nearView) {
        holdThumbImages(holder, false);
        nearView.observe(button);
      }
      button.addEventListener('click', () => {
        // Focus explicitly: Safari does not focus buttons on pointer clicks.
        button.focus({ preventScroll: true });
        show(i);
      });
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

  // iPhone has no Fullscreen API, so presenting there fills the browser window
  // instead and shows a button to leave.
  const fullscreenElement = () => document.fullscreenElement || document.webkitFullscreenElement;
  const requestFullscreen = document.documentElement.requestFullscreen || document.documentElement.webkitRequestFullscreen;
  const exitButton = document.createElement('button');
  function setPresenting(on, inWindow = false) {
    document.body.classList.toggle('is-fullscreen', on);
    document.body.classList.toggle('is-window-fullscreen', on && inWindow);
    fullscreenButton.setAttribute('aria-pressed', String(on));
    fullscreenButton.setAttribute('aria-label', on ? 'Exit fullscreen' : 'Present fullscreen');
    requestAnimationFrame(fit);
  }
  function toggleFullscreen() {
    if (fullscreenElement()) {
      (document.exitFullscreen || document.webkitExitFullscreen).call(document);
    } else if (requestFullscreen) {
      requestFullscreen.call(document.documentElement);
    } else {
      setPresenting(!document.body.classList.contains('is-fullscreen'), true);
    }
  }
  function onFullscreenChange() {
    setPresenting(!!fullscreenElement());
  }
  function buildExitButton() {
    exitButton.type = 'button';
    exitButton.className = 'exit-present';
    exitButton.setAttribute('aria-label', 'Exit fullscreen');
    exitButton.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M6 6l12 12M18 6L6 18"/></svg>';
    exitButton.addEventListener('click', () => setPresenting(false));
    document.body.appendChild(exitButton);
  }

  // iOS can keep a stale or over-tall layout viewport after the phone is
  // turned, which cuts the slide off with no way to scroll. Pin the layout to
  // the visible viewport and refit whenever the stage really changes size.
  function syncViewport() {
    const viewport = window.visualViewport;
    if (viewport && viewport.scale < 1.01) {
      const gap = Math.round(document.documentElement.clientHeight - viewport.offsetTop - viewport.height);
      document.documentElement.style.setProperty('--vv-bottom', `${gap > 1 ? gap : 0}px`);
      if (window.scrollX || window.scrollY) window.scrollTo(0, 0);
    }
    fit();
  }

  const SVG_NS = 'http://www.w3.org/2000/svg';
  const SCATTER_INTERVAL = 420;

  function setScatterActive() {
    const scatter = state.scatter;
    if (!scatter) return;
    const active = scatter.svg.closest('.slide').classList.contains('active') && !reduceMotion.matches;
    if (active === scatter.active) return;
    scatter.active = active;
    scatter.svg.classList.toggle('scatter-playing', active);
    scatter.group.replaceChildren();
    scatter.labels.replaceChildren();
    scatter.particles = [];
    scatter.lastSpawn = null;
  }

  function spawnAlpha(time) {
    const scatter = state.scatter;
    const slot = scatter.count++ % 20;
    const kind = slot === 19 ? 'bounce' : [4, 11, 17].includes(slot) ? 'deflect' : 'straight';
    const startY = 210 + Math.random() * 40;
    let d, labelX, labelY, turnLength = 0;
    if (kind === 'straight') {
      d = `M140,${startY} L720,${startY}`;
    } else if (kind === 'deflect') {
      const direction = Math.random() < .5 ? -1 : 1;
      const endY = startY + direction * (28 + Math.random() * 48);
      const endX = 700 + Math.random() * 20;
      d = `M140,${startY} L520,${startY} L${endX},${endY}`;
      turnLength = 380;
      labelX = (520 + endX) / 2;
      labelY = (startY + endY) / 2 + direction * 30;
    } else {
      const direction = Math.random() < .5 ? -1 : 1;
      const endY = startY + direction * (70 + Math.random() * 35);
      const turnX = 490 + Math.random() * 25;
      const endX = 315 + Math.random() * 55;
      d = `M140,${startY} L${turnX},${startY} L${endX},${endY}`;
      turnLength = turnX - 140;
      labelX = endX;
      labelY = endY + direction * 25;
    }
    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('d', d);
    path.setAttribute('class', `alpha-path ${kind}`);
    const particle = document.createElementNS(SVG_NS, 'circle');
    particle.setAttribute('r', '7');
    particle.setAttribute('fill', 'url(#g-alpha)');
    scatter.group.append(path, particle);
    let label = null;
    if (kind !== 'straight') {
      label = document.createElementNS(SVG_NS, 'text');
      label.setAttribute('x', labelX);
      label.setAttribute('y', labelY);
      label.setAttribute('text-anchor', 'middle');
      label.setAttribute('class', 'lbl scatter-label halo');
      label.textContent = kind === 'bounce' ? 'bounce back' : 'small deflection';
      label.style.visibility = 'hidden';
      scatter.labels.append(label);
    }
    const length = path.getTotalLength();
    path.style.strokeDasharray = String(length);
    path.style.strokeDashoffset = String(length);
    scatter.particles.push({ path, particle, label, length, turnLength, born: time, kind, travel: kind === 'bounce' ? 2900 : 2400 });
  }

  function animateScatter(time) {
    const scatter = state.scatter;
    if (!scatter?.active) return;
    if (scatter.lastSpawn === null || time - scatter.lastSpawn >= SCATTER_INTERVAL) {
      spawnAlpha(time);
      scatter.lastSpawn = time;
    }
    scatter.particles = scatter.particles.filter(item => {
      const age = time - item.born;
      const hold = item.kind === 'straight' ? 500 : 1400;
      const fade = item.kind === 'straight' ? 800 : 1500;
      if (age >= item.travel + hold + fade) {
        item.path.remove();
        item.particle.remove();
        item.label?.remove();
        return false;
      }
      const progress = Math.min(age / item.travel, 1);
      const point = item.path.getPointAtLength(item.length * progress);
      item.path.style.strokeDashoffset = String(item.length * (1 - progress));
      item.particle.setAttribute('cx', point.x);
      item.particle.setAttribute('cy', point.y);
      item.particle.style.visibility = progress < 1 ? 'visible' : 'hidden';
      const fadeProgress = Math.max(0, (age - item.travel - hold) / fade);
      const opacity = String((item.kind === 'straight' ? .55 : .95) * (1 - fadeProgress));
      item.path.style.opacity = opacity;
      if (item.label) {
        item.label.style.visibility = item.length * progress >= item.turnLength ? 'visible' : 'hidden';
        item.label.style.opacity = opacity;
      }
      return true;
    });
  }

  // Move electrons around their orbits on the visible slide only.
  function animateOrbits(time) {
    state.orbitFrame = requestAnimationFrame(animateOrbits);
    if (reduceMotion.matches) return;
    animateScatter(time);
    const slide = state.slides[state.index];
    // A figure with Play/Pause keeps its own time, which runs only while it plays.
    const step = time - (state.orbitLast ?? time);
    state.orbitLast = time;
    const nodes = [...slide.querySelectorAll('[data-orbit]')];
    state.clocks.forEach(({ slide: home, clock }) => { if (home === slide && clock.playing) clock.t += step; });
    nodes.forEach(node => {
      const clock = orbitClocks.get(node.closest('.fig'));
      const at = clock ? clock.t : time;
      const [cx, cy, rx, ry, phase, period, tilt] = node.dataset.orbit.split(',').map(Number);
      const [x, y] = window.DeckFigures.orbitPoint(cx, cy, rx, ry, phase + (at / 1000) * (Math.PI * 2 / period), tilt);
      node.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)})`);
    });
  }

  // Unicode superscripts and subscripts (m s⁻¹, CO₂) are missing from the deck fonts, so the browser
  // borrows mismatched glyphs. Set them as <sup>/<sub> with ordinary digits and a true minus sign,
  // as the figures already do for their labels.
  const SCRIPT = { '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4', '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9', '⁺': '+', '⁻': '−', '₀': '0', '₁': '1', '₂': '2', '₃': '3', '₄': '4', '₅': '5', '₆': '6', '₇': '7', '₈': '8', '₉': '9', '₊': '+', '₋': '−' };
  const SCRIPT_RUN = /([⁰¹²³⁴-⁹⁺⁻]+)|([₀-₉₊₋]+)/g;
  function setScripts(root) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: node => (/[⁰¹²³⁴-⁹⁺⁻₀-₉₊₋]/.test(node.data) && !node.parentElement.closest('svg, mjx-container, script, style, code, textarea') ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT),
    });
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(node => {
      const frag = document.createDocumentFragment();
      let last = 0;
      node.data.replace(SCRIPT_RUN, (run, sup, sub, at) => {
        frag.append(node.data.slice(last, at));
        const el = document.createElement(sup ? 'sup' : 'sub');
        el.textContent = [...run].map(c => SCRIPT[c]).join('');
        frag.append(el);
        last = at + run.length;
        return run;
      });
      frag.append(node.data.slice(last));
      node.replaceWith(frag);
    });
  }

  function init() {
    setScripts(deck);
    window.DeckFigures.render();
    state.slides = [...deck.querySelectorAll('.slide')];
    // Decode photos as they are painted: WebKit's background decoding can leave a slide's photo blank.
    deck.querySelectorAll('img').forEach(img => { img.decoding = 'sync'; });
    if (window.DeckNotes) window.DeckNotes.collect(state.slides);
    const scatterSvg = deck.querySelector('[data-fig="scatter"] svg');
    if (scatterSvg) state.scatter = { svg: scatterSvg, group: scatterSvg.querySelector('.scatter-live'), labels: scatterSvg.querySelector('.scatter-labels'), particles: [], lastSpawn: null, count: 0, active: false };
    state.slides.forEach((slide, i) => {
      const foot = slide.querySelector('.slide-foot [data-page]');
      if (foot) foot.textContent = String(i + 1).padStart(2, '0');
    });
    buildThumbs();
    buildLoopControls();
    let thumbsHidden = false;
    try { thumbsHidden = !!localStorage.getItem(THUMBS_KEY); } catch (error) {}
    setThumbs(!thumbsHidden, false);
    const fromHash = parseInt(location.hash.slice(1), 10);
    show(Number.isFinite(fromHash) ? fromHash - 1 : 0);
    syncViewport();

    prevButton.addEventListener('click', prev);
    nextButton.addEventListener('click', next);
    fullscreenButton.addEventListener('click', toggleFullscreen);
    thumbsToggle.addEventListener('click', () => setThumbs(!document.body.classList.contains('show-thumbs')));
    buildExitButton();
    document.addEventListener('keydown', onKey);
    document.addEventListener('fullscreenchange', onFullscreenChange);
    document.addEventListener('webkitfullscreenchange', onFullscreenChange);
    stage.addEventListener('touchstart', onTouchStart, { passive: true });
    stage.addEventListener('touchend', onTouchEnd, { passive: true });
    window.addEventListener('resize', syncViewport);
    window.addEventListener('orientationchange', () => [0, 300, 800].forEach(delay => setTimeout(syncViewport, delay)));
    if (window.visualViewport) window.visualViewport.addEventListener('resize', syncViewport);
    if (window.ResizeObserver) new ResizeObserver(fit).observe(stage);
    reduceMotion.addEventListener('change', setScatterActive);
    window.addEventListener('hashchange', () => {
      const n = parseInt(location.hash.slice(1), 10);
      if (Number.isFinite(n) && n - 1 !== state.index) show(n - 1);
    });
    window.addEventListener('beforeprint', () => state.slides.forEach(slide => slide.querySelectorAll('.step').forEach(step => step.classList.add('shown'))));
    state.orbitFrame = requestAnimationFrame(animateOrbits);
  }

  // Slides are typeset first, so thumbnails and notes are built with the finished math.
  // Without MathJax (offline) the deck still opens, showing the LaTeX source.
  Promise.resolve(window.MathJax?.startup?.promise).then(init, init);
})();
