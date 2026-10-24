// Diagrams for the C.5 Doppler effect deck, added to the shared set in ../assets/figures.js.
// Wavefronts are teal, the source slate and the observer apricot; reflected waves are red.
// Terracotta is kept for what is higher level only, which in this deck is in the equations.
//
// Each figure is one physical model drawn at a time t (seconds). The still picture (thumbnails,
// print, reduced motion, lesson map) is the model at a chosen moment; on screen the script at the
// end redraws the model every frame on the visible slide, from t = 0 when the slide is shown.
// Everything is worked out from t, so nothing drifts: a wavefront emitted at time kT has radius
// c(t − kT), and an observer hears one more wave each time a wavefront reaches it.
// The model behind each moving figure, by name, for the redraw at the end of this file.
const MODELS = {};
window.DeckFigures.add(P => {
  const { svg, arrow, text, labeled, twoState, PLAY, f, TAU } = P;
  const ease = s => (s <= 0 ? 0 : s >= 1 ? 1 : s * s * (3 - 2 * s));
  const ring = (cx, cy, r, op) => `<circle cx="${f(cx)}" cy="${cy}" r="${f(r)}" style="fill:none;stroke:var(--brand-primary);stroke-width:3.5;opacity:${f(op * 100) / 100}"/>`;
  const dot = (x, y, r, color, op = 1) => `<circle cx="${f(x)}" cy="${f(y)}" r="${r}" style="fill:var(--${color});opacity:${f(op * 100) / 100}"/>`;
  // An observer, with a glow round the head that flashes (flash 0 to 1) as each wavefront arrives.
  const person = (x, y, op = 1, flash = 0) => `<g style="opacity:${f(op * 100) / 100}">${flash > 0.02 ? `<circle cx="${f(x)}" cy="${y - 34}" r="30" style="fill:var(--brand-accent);opacity:${f(flash * 55) / 100}"/>` : ''}<circle cx="${f(x)}" cy="${y - 34}" r="13" style="fill:var(--brand-accent)"/><path d="M${f(x)},${y - 20} V${y + 16} M${f(x - 16)},${y - 6} H${f(x + 16)} M${f(x)},${y + 16} L${f(x - 12)},${y + 44} M${f(x)},${y + 16} L${f(x + 12)},${y + 44}" style="fill:none;stroke:var(--brand-accent);stroke-width:5;stroke-linecap:round"/></g>`;
  // How long ago the last wavefront arrived, from the number of waves received so far (phase)
  // and the rate at which they arrive; the glow fades over about a tenth of a second.
  const flashOf = (phase, rate) => (phase < 0 ? 0 : Math.exp(-(phase - Math.floor(phase)) / rate / 0.1));
  // What an observer hears over the last `span` seconds, newest on the right: one cycle for each
  // wavefront received. phase(τ) is the number of wavefronts received by time τ (null: none yet),
  // or [phase, loudness from 0 to 1] for a wave that dies away and starts again.
  function trace(x, y, w, h, t, span, phase, color = 'brand-primary') {
    const n = 180, pts = [];
    for (let i = 0; i <= n; i++) {
      const v = phase(t - span + span * i / n), [p, amp] = v === null ? [0, 0] : Array.isArray(v) ? v : [v, 1];
      pts.push(`${f(x + 12 + (w - 24) * i / n)},${f(y + h / 2 - amp * (h / 2 - 12) * Math.cos(TAU * p))}`);
    }
    return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="14" style="fill:var(--viewer-bg);stroke:var(--card-border);stroke-width:2"/><polyline points="${pts.join(' ')}" style="fill:none;stroke:var(--${color});stroke-width:3.5;stroke-linejoin:round"/>`;
  }
  // Opacity of a wavefront of radius r. Plain copies (no labels) fade out sooner, before the edge of the picture.
  const fadeOf = (r, on) => (on ? 1 - 0.6 * Math.min(1, r / 650) : Math.max(0, 1 - r / 350) ** 0.7);
  let clips = 0;
  const clipped = (x, y, w, h, body) => { const id = `c5-clip-${++clips}`; return `<clipPath id="${id}"><rect x="${x}" y="${y}" width="${w}" height="${h}" style="visibility:visible"/></clipPath><g clip-path="url(#${id})">${body}</g>`; };

  // A source moving to the right at half the wave speed. Each pass lasts PASS seconds; the next
  // begins while the last wavefronts of the one before are fading. Ahead the wavefronts are λ/2
  // apart and arrive at 2f; behind they are 3λ/2 apart and arrive at 2f/3.
  const SRC = { c: 100, T: 0.5, u: 50, x0: 250, y: 190, run: 8, PASS: 10.6, behind: 90, ahead: 810 };
  function sourceAt(t, on, still) {
    const { c, T, u, x0, y, run, PASS, behind, ahead } = SRC, n = Math.floor(t / PASS);
    let rings = '', dots = '', flashes = [0, 0];
    for (const m of still ? [n] : [n - 1, n]) {
      const tl = t - m * PASS, fade = still ? 1 : 1 - ease((tl - 9.6) / 1.6);
      if (tl < 0 || fade <= 0) continue;
      for (let k = 0; k * T < run && k * T <= tl; k++) {
        const age = tl - k * T, r = c * age, cx = x0 + u * k * T, op = fade * fadeOf(r, on);
        if (r > 0.5) rings += ring(cx, y, r, op);
        dots += dot(cx, y, 4.5, 'brand-accent-strong', 0.7 * op);
        // The wavefront reaches each observer once its radius equals the distance to it.
        [behind, ahead].forEach((xo, i) => {
          const since = age - Math.abs(xo - cx) / c;
          if (since >= 0 && op > 0.2) flashes[i] = Math.max(flashes[i], Math.exp(-since / 0.1));
        });
      }
    }
    const tl = t - n * PASS, sx = x0 + u * Math.min(tl, run), sop = still ? 1 : ease(tl / 0.4) * (1 - ease((tl - run) / 0.5));
    let s = rings + dots + `<g style="opacity:${f(sop * 100) / 100}">${dot(sx, y, 14, 'brand-accent-strong')}${arrow(sx + 26, y - 40, sx + 96, y - 40, 'brand-accent-strong', 5)}</g>`;
    if (on) s += person(behind, y, 1, still ? 0 : flashes[0]) + person(ahead, y, 1, still ? 0 : flashes[1]);
    return s;
  }

  // A source at rest, and two observers: one standing still, one walking towards the source at
  // half the wave speed. The walker meets 1.5 times as many wavefronts each second.
  // The walker's path in the labeled figure and, shorter, in the plain copy. Each loop is a
  // whole number of periods T, so the wavefronts look the same every time the walker starts.
  const OBS = { c: 100, T: 0.5, xs: 300, y: 170, still: 90, u: 50 }, WALK = { x0: 860, walk: 7.5, LOOP: 8 }, PLAIN_WALK = { x0: 610, walk: 4, LOOP: 5 };
  const walkerAt = (tau, { x0, walk, LOOP }) => { const tl = ((tau % LOOP) + LOOP) % LOOP; return tl < walk ? { x: x0 - OBS.u * tl, op: ease(tl / 0.4) * (1 - ease((tl - walk + 0.5) / 0.5)), moving: true } : { x: x0, op: 0, moving: false }; };
  function observerAt(t, on, still) {
    const { c, T, xs, y } = OBS, lam = c * T;
    let s = '';
    for (let k = Math.floor((t - 7.5) / T); k <= Math.floor(t / T); k++) {
      const r = c * (t - k * T);
      if (r > 0.5) s += ring(xs, y, r, fadeOf(r, on));
    }
    s += dot(xs, y, 14, 'brand-accent-strong');
    // Waves received by time τ: wavefronts emitted up to τ, less those still on their way.
    const path = on ? WALK : PLAIN_WALK;
    const heardStill = tau => (c * tau - (xs - OBS.still)) / lam;
    // The walker sets off again from the same place every loop, and each loop moves them on by a
    // whole number of wavelengths (u × LOOP), so the waves they meet carry on without a jump.
    const heardWalker = tau => ((c + OBS.u) * tau - (path.x0 - xs)) / lam;
    const w = walkerAt(t, path);
    if (on) s += person(OBS.still, y, 1, still ? 0 : flashOf(heardStill(t), c / lam));
    s += person(w.x, y, w.op, still ? 0 : flashOf(heardWalker(t), (c + OBS.u) / lam)) + `<g style="opacity:${f(w.op * 100) / 100}">${arrow(w.x - 26, y - 76, w.x - 100, y - 76, 'brand-accent', 5)}</g>`;
    if (!on) return s;
    // The readouts sit on a clear band below the wavefronts.
    s += `<rect x="0" y="284" width="900" height="200" style="fill:var(--viewer-bg)"/>` + trace(20, 316, 250, 76, t, 2.4, heardStill) + trace(560, 316, 330, 76, t, 2.4, heardWalker);
    return s;
  }

  // Radar: waves sent from the radar, reflected by a car approaching at a quarter of the wave
  // speed (much exaggerated), and received back at (1 + ¼)/(1 − ¼) = 5/3 of the frequency sent.
  // Between passes the hidden car waits beyond the right edge, so the waves run on out of the picture.
  const RAD = { c: 160, T: 0.35, u: 40, xr: 182, x0: 860, run: 9, LOOP: 9.5, out: 236, back: 296 };
  const carAt = tau => { const tl = ((tau % RAD.LOOP) + RAD.LOOP) % RAD.LOOP; return tl < RAD.run ? { x: RAD.x0 - RAD.u * tl, op: ease(tl / 0.4) * (1 - ease((tl - 8.5) / 0.5)) } : { x: 1000, op: 0 }; };
  const hits = new Map();
  // When and where wavefront k meets the car, found by stepping forward and then halving the step.
  function hitOf(k) {
    if (hits.has(k)) return hits.get(k);
    const te = k * RAD.T, gap = tau => RAD.xr + RAD.c * (tau - te) - carAt(tau).x;
    let a = te, b = te + 0.05;
    while (gap(b) < 0) { a = b; b += 0.05; }
    for (let i = 0; i < 24; i++) { const mid = (a + b) / 2; if (gap(mid) < 0) a = mid; else b = mid; }
    const car = carAt(b), hit = { t: b, x: car.x, op: car.op, back: b + (car.x - RAD.xr) / RAD.c };
    if (hits.size > 400) hits.clear();
    hits.set(k, hit);
    return hit;
  }
  function radarAt(t, on, still) {
    const { c, T, xr, out, back } = RAD;
    const arc = (x, yc, dir, color, op) => `<path d="M${f(x - dir * 9)},${yc - 22} Q${f(x + dir * 9)},${yc} ${f(x - dir * 9)},${yc + 22}" style="fill:none;stroke:var(--${color});stroke-width:4;stroke-linecap:round;opacity:${f(op * 100) / 100}"/>`;
    const car = carAt(t), cx = car.x;
    let s = `<rect x="70" y="200" width="78" height="132" rx="12" style="fill:var(--brand-accent-strong)"/><path d="M148,214 L${xr - 6},204 V328 L148,318 Z" style="fill:var(--brand-accent-strong)"/>`;
    s += `<g style="opacity:${f(car.op * 100) / 100}"><path d="M${cx + 46},228 L${cx + 74},184 H${cx + 168} L${cx + 196},228 Z" style="fill:color-mix(in srgb, var(--brand-accent) 30%, var(--viewer-bg));stroke:var(--brand-accent);stroke-width:3;stroke-linejoin:round"/><rect x="${f(cx)}" y="222" width="230" height="84" rx="26" style="fill:color-mix(in srgb, var(--brand-accent) 55%, var(--viewer-bg));stroke:var(--brand-accent);stroke-width:3"/><circle cx="${f(cx + 56)}" cy="310" r="25" style="fill:var(--text-main)"/><circle cx="${f(cx + 176)}" cy="310" r="25" style="fill:var(--text-main)"/>${arrow(cx + 150, 160, cx + 70, 160, 'brand-accent', 5)}</g>`;
    const times = [];
    for (let k = Math.max(0, Math.floor((t - 9) / T)); k * T <= t; k++) {
      const te = k * T, hit = hitOf(k);
      if (t < hit.t) s += arc(xr + c * (t - te), out, 1, 'brand-primary', 1);
      else if (t < hit.back) s += arc(hit.x - c * (t - hit.t), back, -1, 'proton', hit.op);
      if (hit.op > 0.2) times.push(hit.back);
    }
    if (!on) return s;
    // Waves received back by τ: count the returns, sharing each interval evenly between two of
    // them. Between one car and the next nothing comes back: the wave dies away after the last
    // return and grows again before the next, carried on at the rate of its neighbors.
    times.sort((p, q) => p - q);
    const heardBack = tau => {
      const i = times.findIndex(tb => tb > tau);
      if (i > 0 && times[i] - times[i - 1] <= 2 * T) return i - 1 + (tau - times[i - 1]) / (times[i] - times[i - 1]);
      const end = i < 0 ? times.length : i, before = end >= 2 ? [end - 1 + (tau - times[end - 1]) / (times[end - 1] - times[end - 2]), 1 - ease((tau - times[end - 1]) / 0.3)] : null;
      const after = i >= 0 && i + 1 < times.length ? [i - (times[i] - tau) / (times[i + 1] - times[i]), 1 - ease((times[i] - tau) / 0.3)] : null;
      return [before, after].filter(Boolean).sort((p, q) => q[1] - p[1])[0] ?? null;
    };
    s += trace(60, 404, 360, 72, t, 2, tau => tau / T) + trace(500, 404, 360, 72, t, 2, still ? tau => tau / T * 5 / 3 : heardBack, 'proton');
    return s;
  }

  // Hydrogen lines in the laboratory and from a galaxy moving away (z = 0.08). Every wavelength
  // is stretched by the same fraction, so the lines at the red end move furthest.
  const H = [410.2, 434.0, 486.1, 656.3], Z = 0.08, X0 = 110, W = 700, xOf = nm => X0 + (nm - 380) / 370 * W;
  // Looping, the lines glide across, hold and start again; played once (data-play), they glide
  // across from the moment of the press and stay.
  function linesAt(t, on, still, once) {
    const tl = t % 7, z = still ? Z : once ? Z * ease((t - 0.2) / 1.8) : Z * ease((tl - 0.8) / 1.8), op = still || once ? 1 : ease(tl / 0.3) * (1 - ease((tl - 6.2) / 0.5));
    const strip = y => `<rect x="${X0}" y="${y}" width="${W}" height="80" rx="4" fill="url(#g-spectrum)"/>`;
    const line = (x, y, o = 1) => `<rect x="${f(x - 3)}" y="${y}" width="6" height="80" style="fill:#0B0B10;opacity:${f(o * 100) / 100}"/>`;
    let s = strip(110) + strip(300) + H.map(nm => line(xOf(nm), 110)).join('');
    s += `<g style="opacity:${f(op * 100) / 100}">` + H.map(nm => `<path d="M${f(xOf(nm))},190 L${f(xOf(nm * (1 + z)))},300" class="guide accent"/>` + line(xOf(nm * (1 + z)), 300)).join('');
    // The shift of the shortest and the longest line, to compare.
    if (on && z > 0.02) [H[0], H[3]].forEach(nm => { s += arrow(xOf(nm), 408, xOf(nm * (1 + z)), 408, 'proton', 4) + text(f((xOf(nm) + xOf(nm * (1 + z))) / 2), 448, 'Δλ', 'lbl strong'); });
    return s + '</g>';
  }

  // The still and the moving copy of one model. The moving group starts drawn at t = startT; with
  // once, it waits at t = 0 for the figure's PLAY step and then plays once.
  const live = (name, model, on, stillT, startT = 0, once = false) => twoState(model(stillT, on, true), `<g data-live="${name}" data-start="${once ? 0 : startT}"${on ? ' data-on=""' : ''}${once ? ' data-play=""' : ''}>${model(once ? 0 : startT, on, false, once)}</g>`) + (once ? PLAY : '');
  Object.assign(MODELS, { 'c5-source': sourceAt, 'c5-observer': observerAt, 'c5-radar': radarAt, 'c5-lines': linesAt });

  return {
    // Also the title picture and part 1 picture (data-plain: the wavefronts alone).
    'c5-source': el => {
      const on = labeled(el), y = SRC.y;
      const view = on ? [0, 0, 900, 380] : [150, -70, 600, 520];
      let s = clipped(...view, live('c5-source', sourceAt, on, 3, 2.5));
      if (on) s += text(SRC.behind, y + 90, 'behind:', 'lbl halo') + text(SRC.behind, y + 124, 'longer λ, lower f', 'lbl strong halo') + text(SRC.ahead, y + 90, 'ahead:', 'lbl halo') + text(SRC.ahead, y + 124, 'shorter λ, higher f', 'lbl strong halo');
      return svg(view.join(' '), s, 'A source of waves moving to the right at half the wave speed. Each wavefront is a circle centered on the place, marked with a dot, where the source was when it was emitted, so the wavefronts are crowded together ahead of the source and spread out behind it. The observer ahead is reached by wavefronts more often, at a higher frequency, than the observer behind');
    },

    // Also the part 3 picture and the lesson map, with data-plain: the wavefronts alone.
    'c5-observer': el => {
      const on = labeled(el), y = OBS.y;
      const view = on ? [0, 0, 900, 450] : [-60, -190, 720, 720];
      let s = clipped(...view, live('c5-observer', observerAt, on, on ? 13.4 : 11.5, 10));
      if (on) s += text(OBS.xs, y + 62, 'source at rest', 'lbl halo') + text(20, 302, 'standing still', 'lbl halo', 'start') + text(560, 302, 'walking towards the source', 'lbl halo', 'start') + text(20, 432, 'frequency heard: f', 'lbl strong', 'start') + text(560, 432, 'frequency heard: 1.5 f', 'lbl strong', 'start');
      if (!on) return svg(view.join(' '), s, 'A stationary source sending out evenly spaced circular wavefronts, and an observer walking towards it');
      return svg(view.join(' '), s, 'A stationary source sending out evenly spaced circular wavefronts, an observer standing still and an observer walking towards the source at half the wave speed. The wavelength is the same everywhere, but the walker meets the wavefronts more often: the traces of what each one hears show the walker receiving one and a half times the frequency');
    },

    // The same spectral lines in the laboratory and from a receding galaxy. data-play: the lines
    // move on a press of →, not in a loop.
    'c5-lines': el => {
      const on = labeled(el);
      let s = live('c5-lines', linesAt, on, 0, 0, 'play' in el.dataset) + text(X0, 94, 'hydrogen in the laboratory', 'lbl strong', 'start') + text(X0, 284, 'the same lines from a galaxy moving away', 'lbl strong', 'start');
      s += text(X0, 232, 'violet', 'lbl small', 'start') + text(X0 + W, 232, 'red', 'lbl small', 'end');
      if (on) s += text(460, 492, 'every λ grows by the same fraction', 'lbl small');
      return svg(on ? '80 60 760 450' : '80 60 760 340', s, 'Two spectra. The upper one shows the four visible lines of hydrogen measured in the laboratory. The lower one shows the same lines in the light from a galaxy moving away: every wavelength is stretched by the same fraction, so every line moves towards the red end, and the lines at the red end move furthest');
    },

    // Radar measuring speed: waves out and back from a moving car.
    'c5-radar': el => {
      const on = labeled(el);
      let s = clipped(40, 140, 880, 380, live('c5-radar', radarAt, on, 6.2, 5));
      s += text(109, 362, 'radar', 'lbl') + text(300, 214, 'sent out', 'lbl halo a', 'start') + text(300, 344, 'reflected back', 'lbl halo', 'start', 'style="fill:var(--proton)"');
      if (on) s += text(60, 394, 'sent: frequency f', 'lbl strong', 'start') + text(500, 394, 'received: higher frequency', 'lbl strong', 'start') + text(860, 510, 'speed of the car much exaggerated', 'lbl small', 'end');
      return svg('40 140 880 380', s, 'A radar unit sends microwaves of frequency f towards an approaching car. The waves reflected from the car return closer together, at a higher frequency; the traces compare the wave sent with the wave received, and the change in frequency gives the speed of the car');
    }
  };
});

// Redraw the moving figures on the visible slide each frame. A figure's clock starts at its
// data-start when its slide is shown, or, with data-play, when its PLAY step is shown.
(() => {
  const started = new Map();
  function frame(now) {
    requestAnimationFrame(frame);
    const shown = new Set(document.querySelectorAll('#deck .slide.active [data-live]'));
    started.forEach((at, g) => { if (!shown.has(g)) started.delete(g); });
    shown.forEach(g => {
      const once = 'play' in g.dataset;
      if (once && !g.closest('svg').querySelector('.step.play.shown')) {
        started.delete(g);
        g.innerHTML = MODELS[g.dataset.live](0, 'on' in g.dataset, false, true);
        return;
      }
      if (!started.has(g)) started.set(g, now);
      const t = Number(g.dataset.start) + (now - started.get(g)) / 1000;
      g.innerHTML = MODELS[g.dataset.live](t, 'on' in g.dataset, false, once);
    });
  }
  requestAnimationFrame(frame);
})();
