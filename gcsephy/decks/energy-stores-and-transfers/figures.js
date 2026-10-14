// Figures for the Energy: Stores and Transfers deck. Static drawings come from the workbook's
// EnergyFigures (gcsephy/year9phy/unit02/workbook/assets/figures.js), so slides and workbook
// match. <div data-fig="name"> is filled with a drawing; <div data-widget="name"> becomes an
// interactive model with its own buttons. Models only move on the live slide, and only when a
// button is pressed, so thumbnails and print show the starting picture.
(() => {
  const F = window.EnergyFigures;
  const NS = 'http://www.w3.org/2000/svg';
  const fmt = (n, dp = 0) => Number(n).toLocaleString('en-GB', { minimumFractionDigits: dp, maximumFractionDigits: dp }).replace(/,/g, '\u2009');
  const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const typeset = el => { if (window.MathJax?.typesetPromise) window.MathJax.typesetPromise([el]).catch(() => {}); };
  const isLive = el => el.closest('.slide')?.classList.contains('active') && !document.hidden;

  // ---------- small SVG helpers in the deck's own units ----------
  const t = (x, y, s, cls = '', a = 'middle') => `<text x="${x}" y="${y}" class="${cls}" text-anchor="${a}">${s}</text>`;
  function bars(x0, y0, w, h, names) { // empty bar chart: returns markup and the bar rectangles' ids
    let s = `<path class="dk-axis" d="M${x0} ${y0 - 10}V${y0 + h}H${x0 + w}"/>`;
    const bw = w / names.length;
    names.forEach((n, i) => {
      s += `<rect class="dk-bar b${i}" data-bar="${i}" x="${x0 + i * bw + 14}" y="${y0 + h}" width="${bw - 28}" height="0"/>`;
      s += t(x0 + i * bw + bw / 2, y0 + h + 32, n, 'dk-small');
    });
    return s;
  }
  function setBar(svg, i, frac, y0, h) {
    const r = svg.querySelector(`[data-bar="${i}"]`);
    const v = Math.max(0, Math.min(1, frac)) * h;
    r.setAttribute('y', y0 + h - v); r.setAttribute('height', v);
  }
  const buttons = list => `<div class="dk-controls">${list.map(([id, label, extra = '']) => `<button type="button" data-act="${id}" ${extra}>${label}</button>`).join('')}</div>`;

  // ---------- 1. Half-pipe or pendulum, with live energy bars ----------
  // A bob on a circular path of radius R: phi'' = -w² sin(phi) - c phi'. Energies are shown as
  // fractions of the starting energy, so the three bars always add up to the dashed total.
  function swing(host, mode) {
    const pend = mode === 'pendulum';
    const cx = 290, cy = pend ? 40 : 100, R = pend ? 360 : 300, phi0 = pend ? 0.75 : 1.0, w2 = pend ? 5 : 4;
    const lossOn = pend ? 0.12 : 0.22;
    const pos = phi => [cx + R * Math.sin(phi), cy + R * Math.cos(phi)];
    let track = '';
    if (pend) {
      track = `<path class="dk-ink" d="M${cx - 70} ${cy}H${cx + 70}"/><path class="dk-guide" d="M${pos(-phi0)[0] - 40} ${pos(-phi0)[1]}H${pos(phi0)[0] + 40}"/>` +
        t(pos(-phi0)[0], pos(-phi0)[1] - 40, 'release', 'dk-small', 'middle') + `<line class="dk-string" x1="${cx}" y1="${cy}" x2="0" y2="0"/>`;
    } else {
      const a = 1.2, steps = 40;
      let d = '';
      for (let i = 0; i <= steps; i++) { const [x, y] = pos(-a + (2 * a * i) / steps); d += `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`; }
      track = `<path class="dk-ramp" d="${d}L${pos(a)[0]} 470L${pos(-a)[0]} 470Z"/><path class="dk-ink thick" d="${d}"/>` +
        `<path class="dk-guide" d="M${pos(-phi0)[0] - 30} ${pos(-phi0)[1] - 22}H${pos(phi0)[0] + 30}"/>`;
    }
    const bx = 600, by = 70, bw = 310, bh = 330;
    const svg = `<svg class="dk" viewBox="0 0 920 470" role="img" aria-label="${pend ? 'A pendulum' : 'A ball on a half-pipe'} with bars showing the energy in the gravitational potential, kinetic and thermal stores">
      ${track}<circle class="dk-bob" r="${pend ? 26 : 20}" cx="0" cy="0"/>
      ${bars(bx, by, bw, bh, ['G.P.E.', 'kinetic', 'thermal'])}
      <path class="dk-total" d="M${bx} ${by}H${bx + bw}"/>${t(bx + bw, by - 12, 'total energy', 'dk-small', 'end')}
    </svg>`;
    host.innerHTML = `<div class="dk-stage">${svg}</div>` + buttons([['play', 'Play'], ['loss', pend ? 'Air resistance: off' : 'Friction: off', 'aria-pressed="false"'], ['reset', 'Reset']]);
    const root = host.querySelector('svg'), bob = root.querySelector('.dk-bob'), str = root.querySelector('.dk-string');
    let phi = -phi0, om = 0, c = 0, running = false, last = 0;
    const E0 = 1 - Math.cos(phi0);
    function paint() {
      const r = pend ? 0 : 20, [x, y] = pos(phi);
      const nx = (cx - x) / R, ny = (cy - y) / R; // towards the centre: the ball sits on top of the track
      bob.setAttribute('cx', (x + nx * r).toFixed(1)); bob.setAttribute('cy', (y + ny * r).toFixed(1));
      if (str) { str.setAttribute('x2', x.toFixed(1)); str.setAttribute('y2', y.toFixed(1)); }
      const pe = (1 - Math.cos(phi)) / E0, ke = (0.5 * om * om / w2) / E0;
      setBar(root, 0, pe, by, bh); setBar(root, 1, ke, by, bh); setBar(root, 2, 1 - pe - ke, by, bh);
    }
    function tick(time) {
      if (!running) return;
      requestAnimationFrame(tick);
      if (!isLive(host)) { last = time; return; }
      const dt = Math.min(0.05, (time - (last || time)) / 1000); last = time;
      for (let i = 0; i < 20; i++) { om += (-w2 * Math.sin(phi) - c * om) * dt / 20; phi += om * dt / 20; }
      paint();
    }
    const play = host.querySelector('[data-act="play"]');
    play.addEventListener('click', () => {
      running = !running; play.textContent = running ? 'Pause' : 'Play';
      if (running) { last = 0; requestAnimationFrame(tick); }
    });
    const loss = host.querySelector('[data-act="loss"]');
    loss.addEventListener('click', () => {
      c = c ? 0 : lossOn;
      loss.setAttribute('aria-pressed', String(!!c));
      loss.textContent = `${pend ? 'Air resistance' : 'Friction'}: ${c ? 'on' : 'off'}`;
    });
    host.querySelector('[data-act="reset"]').addEventListener('click', () => { phi = -phi0; om = 0; paint(); });
    paint();
  }

  // ---------- 2. Kinetic energy: pick a speed and a mass ----------
  function kinetic(host) {
    const speeds = [10, 20, 30], max = 900000;
    const x0 = 520, y0 = 40, w = 360, h = 330;
    host.innerHTML = `<div class="dk-stage"><svg class="dk" viewBox="0 0 920 430" role="img" aria-label="A car and a bar chart of the energy in its kinetic store at 10, 20 and 30 metres per second">
      <path class="dk-ink" d="M20 300H460"/><g class="dk-car"><rect class="dk-body" x="120" y="226" width="200" height="50" rx="10"/><path class="dk-body" d="M160 226l26-38h80l30 38Z"/>
      <circle class="dk-wheel" cx="165" cy="282" r="18"/><circle class="dk-wheel" cx="280" cy="282" r="18"/></g>
      <g class="dk-lines"><path d="M20 238h70M40 256h60M10 274h80"/></g>
      ${bars(x0, y0, w, h, ['10 m/s', '20 m/s', '30 m/s'])}${t(x0 + 6, 28, 'kinetic energy', 'dk-small', 'start')}
    </svg></div>` + buttons([['v0', '10 m/s'], ['v1', '20 m/s'], ['v2', '30 m/s'], ['m', 'Mass: 1000 kg', 'aria-pressed="false"']]) + '<p class="dk-readout" aria-live="polite"></p>';
    const root = host.querySelector('svg'), out = host.querySelector('.dk-readout'), lines = root.querySelector('.dk-lines');
    let mass = 1000, shown = new Set();
    function pick(i) {
      shown.add(i);
      speeds.forEach((v, j) => setBar(root, j, shown.has(j) ? 0.5 * mass * v * v / max : 0, y0, h));
      root.querySelectorAll('.dk-bar').forEach((r, j) => r.classList.toggle('on', j === i));
      const v = speeds[i], e = 0.5 * mass * v * v;
      lines.style.setProperty('--dur', `${1.2 / (i + 1)}s`);
      out.innerHTML = String.raw`\(E_k = \tfrac{1}{2}\,m\,v^2 = 0.5 \times ${mass} \times ${v}^2 = ${fmt(e).replace(/\u2009/g, '\\,')}\ \text{J}\)` + (i ? ` <b>= ${(i + 1) ** 2} × the energy at 10 m/s</b>` : '');
      typeset(out);
    }
    speeds.forEach((_, i) => host.querySelector(`[data-act="v${i}"]`).addEventListener('click', () => pick(i)));
    const mb = host.querySelector('[data-act="m"]');
    mb.addEventListener('click', () => { mass = mass === 1000 ? 2000 : 1000; mb.textContent = `Mass: ${mass} kg`; mb.setAttribute('aria-pressed', String(mass === 2000)); const last = [...shown].pop(); if (last !== undefined) pick(last); });
    out.textContent = 'Choose a speed.';
  }

  // ---------- 3. Spring lab: add masses, read the extension, plot either graph ----------
  // The sample spring of Lesson 4: about 4.0 cm per newton up to 6 N, then past its limit.
  const SPRING = [0, 4.0, 8.1, 12.0, 16.0, 20.1, 24.0, 29.5];
  function springLab(host) {
    const top = 50, pxcm = 9, L0 = 5.0;
    let ticks = '';
    for (let c = 0; c <= 40; c++) ticks += `<path class="dk-ink thin" d="M262 ${top + c * pxcm}h${c % 5 ? 8 : 16}"/>` + (c % 5 ? '' : t(296, top + c * pxcm + 6, c, 'dk-tick', 'start'));
    const gx = 400, gy = 40, gw = 480, gh = 360;
    host.innerHTML = `<div class="dk-stage"><svg class="dk" viewBox="0 0 920 470" role="img" aria-label="A spring hanging beside a ruler, with a graph of the results">
      <path class="dk-ink thick" d="M40 ${top}H230"/><path class="dk-ink thick" d="M60 ${top}V450M30 450H200"/>
      <rect class="dk-ruler" x="258" y="${top - 10}" width="34" height="${40 * pxcm + 20}"/>${ticks}
      <g class="dk-spring"></g>
      <g class="dk-graph"></g>
    </svg></div>` + buttons([['minus', '− 100 g'], ['plus', '+ 100 g'], ['swap', 'Swap the axes'], ['fit', 'Best-fit line', 'aria-pressed="false"'], ['clear', 'Clear']]) + '<p class="dk-readout" aria-live="polite"></p>';
    const root = host.querySelector('svg'), sp = root.querySelector('.dk-spring'), gr = root.querySelector('.dk-graph'), out = host.querySelector('.dk-readout');
    let n = 0, swapped = false, fit = false;
    const done = new Set([0]);
    function drawSpring() {
      const e = SPRING[n], len = (L0 + e) * pxcm, y2 = top + len, turns = 7, step = (len - 12) / turns, x = 160, w = 14;
      let d = `M${x} ${top}V${top + 6}`;
      for (let i = 0; i < turns; i++) d += `L${x + w} ${top + 6 + step * (i + 0.25)}L${x - w} ${top + 6 + step * (i + 0.75)}`;
      let masses = '';
      for (let i = 0; i < n; i++) masses += `<rect class="dk-mass" x="${x - 32}" y="${y2 + 16 + i * 8}" width="64" height="7" rx="2"/>`;
      sp.innerHTML = `<path class="dk-ink" d="${d}L${x} ${y2 - 6}V${y2}"/><path class="dk-ink" d="M${x} ${y2}v8M${x - 22} ${y2 + 8}h44M${x} ${y2 + 8}v${n * 8 + 10}"/>${masses}` +
        `<path class="dk-pointer" d="M${x + 6} ${y2 + 2}H262"/>`;
      out.innerHTML = `Mass added <b>${n * 100} g</b> · force <b>${n} N</b> · length <b>${(L0 + e).toFixed(1)} cm</b> · extension <b>${e.toFixed(1)} cm = ${(e / 100).toFixed(3)} m</b>`;
    }
    function drawGraph() {
      // Graph 2 (default): force on y against extension in metres on x. Swapped: graph 1.
      const xs = swapped ? [0, 8, 1] : [0, 0.32, 0.04], ys = swapped ? [0, 32, 4] : [0, 8, 1];
      const X = v => gx + (v - xs[0]) / (xs[1] - xs[0]) * gw, Y = v => gy + gh - (v - ys[0]) / (ys[1] - ys[0]) * gh;
      let s = '';
      for (let v = xs[0]; v <= xs[1] + 1e-9; v += xs[2]) s += `<path class="dk-grid" d="M${X(v)} ${gy}V${gy + gh}"/>` + t(X(v), gy + gh + 26, swapped ? v : v.toFixed(2), 'dk-tick');
      for (let v = ys[0]; v <= ys[1] + 1e-9; v += ys[2]) s += `<path class="dk-grid" d="M${gx} ${Y(v)}H${gx + gw}"/>` + (v ? t(gx - 10, Y(v) + 6, v, 'dk-tick', 'end') : '');
      s += `<path class="dk-ink" d="M${gx} ${gy - 8}V${gy + gh}H${gx + gw + 8}"/>`;
      s += t(gx + gw, gy + gh + 56, swapped ? 'force / N' : 'extension / m', 'dk-label', 'end') + t(gx + 4, gy - 16, swapped ? 'extension / cm' : 'force / N', 'dk-label', 'start');
      if (fit) s += swapped ? `<path class="dk-fit" d="M${X(0)} ${Y(0)}L${X(7.5)} ${Y(30)}"/>` : `<path class="dk-fit" d="M${X(0)} ${Y(0)}L${X(0.30)} ${Y(7.5)}"/>`;
      done.forEach(i => { const px = swapped ? X(i) : X(SPRING[i] / 100), py = swapped ? Y(SPRING[i]) : Y(i); s += `<path class="dk-cross${i === 7 ? ' odd' : ''}" d="M${px - 8} ${py - 8}l16 16m0 -16l-16 16"/>`; });
      if (fit && !swapped) s += t(X(0.16), Y(6.9), 'gradient = k = 25 N/m', 'dk-label hot', 'middle');
      if (fit && swapped) s += t(X(4.2), Y(28), 'gradient = 4 cm per N', 'dk-label hot', 'middle');
      gr.innerHTML = s;
    }
    const update = () => { done.add(n); drawSpring(); drawGraph(); };
    host.querySelector('[data-act="plus"]').addEventListener('click', () => { if (n < 7) { n++; update(); } });
    host.querySelector('[data-act="minus"]').addEventListener('click', () => { if (n > 0) { n--; update(); } });
    host.querySelector('[data-act="swap"]').addEventListener('click', () => { swapped = !swapped; drawGraph(); });
    const fb = host.querySelector('[data-act="fit"]');
    fb.addEventListener('click', () => { fit = !fit; fb.setAttribute('aria-pressed', String(fit)); drawGraph(); });
    host.querySelector('[data-act="clear"]').addEventListener('click', () => { done.clear(); n = 0; fit = false; fb.setAttribute('aria-pressed', 'false'); update(); });
    update();
  }

  // ---------- 4. Elastic potential energy: pick an extension ----------
  function elastic(host) {
    const es = [0.04, 0.08, 0.12], k = 50, max = 0.4;
    const x0 = 520, y0 = 40, w = 360, h = 330;
    host.innerHTML = `<div class="dk-stage"><svg class="dk" viewBox="0 0 920 430" role="img" aria-label="A spring stretched by 4, 8 and 12 centimetres and a bar chart of the energy it stores">
      <path class="dk-ink thick" d="M40 120V300"/><g class="dk-hspring"></g>
      ${bars(x0, y0, w, h, ['0.04 m', '0.08 m', '0.12 m'])}${t(x0 + 6, 28, 'elastic potential energy', 'dk-small', 'start')}
    </svg></div>` + buttons([['e0', 'stretch 0.04 m'], ['e1', 'stretch 0.08 m'], ['e2', 'stretch 0.12 m']]) + '<p class="dk-readout" aria-live="polite"></p>';
    const root = host.querySelector('svg'), hs = root.querySelector('.dk-hspring'), out = host.querySelector('.dk-readout');
    const shown = new Set();
    function spring(e) {
      const L = 160 + e * 1800, turns = 10, step = (L - 20) / turns;
      let d = 'M40 210H50';
      for (let i = 0; i < turns; i++) d += `L${50 + step * (i + 0.25)} 190L${50 + step * (i + 0.75)} 230`;
      const end = 50 + L - 20;
      hs.innerHTML = `<path class="dk-ink" d="${d}L${end} 210H${end + 10}"/><circle class="dk-bob" cx="${end + 26}" cy="210" r="16"/>` +
        (e ? `<path class="dk-guide" d="M210 250V290M${end} 250V290"/>` + F.arrow(210, 280, end, 280, '', 9) + t((210 + end) / 2, 316, `e = ${e} m`, 'dk-label') : '');
    }
    function pick(i) {
      shown.add(i);
      es.forEach((e, j) => setBar(root, j, shown.has(j) ? 0.5 * k * e * e / max : 0, y0, h));
      spring(es[i]);
      const e = es[i], E = 0.5 * k * e * e;
      out.innerHTML = String.raw`\(E_e = \tfrac{1}{2}\,k\,e^2 = 0.5 \times ${k} \times ${e}^2 = ${E.toFixed(2)}\ \text{J}\)` + (i ? ` <b>= ${(i + 1) ** 2} × the energy at 0.04 m</b>` : '');
      typeset(out);
    }
    es.forEach((_, i) => host.querySelector(`[data-act="e${i}"]`).addEventListener('click', () => pick(i)));
    spring(0);
    out.textContent = 'Spring constant k = 50 N/m. Choose an extension.';
  }

  // ---------- 5. Two motors lift the same load ----------
  function motors(host) {
    const H = 200, base = 380;
    const rig = (x, name) => `<path class="dk-ink thick" d="M${x} 400V60H${x + 130}"/><path class="dk-ink" d="M${x + 120} 60V80"/><rect class="dk-motor" x="${x - 28}" y="40" width="56" height="40" rx="6"/>${t(x, 66, name, 'dk-label')}
      <line class="dk-string m-${name}" x1="${x + 120}" y1="80" x2="${x + 120}" y2="${base - 34}"/><rect class="dk-mass m-${name}" x="${x + 92}" y="${base - 34}" width="56" height="34" rx="4"/>
      <path class="dk-guide" d="M${x + 160} ${base - H}H${x + 200}M${x + 160} ${base}H${x + 200}"/>${t(x + 210, base - H / 2 + 8, '1.5 m', 'dk-small', 'start')}${t(x + 120, 444, '', `dk-label clock-${name}`)}`;
    host.innerHTML = `<div class="dk-stage"><svg class="dk" viewBox="0 0 920 470" role="img" aria-label="Two motors, A and B, each lift a 2.0 kilogram load through 1.5 metres; A takes 2 seconds and B takes 6 seconds">
      <path class="dk-ink" d="M20 400H900"/>${rig(120, 'A')}${rig(560, 'B')}
    </svg></div>` + buttons([['go', 'Start'], ['reset', 'Reset']]) + '<p class="dk-readout" aria-live="polite"></p>';
    const root = host.querySelector('svg'), out = host.querySelector('.dk-readout');
    const parts = { A: 2, B: 6 };
    let t0 = null, running = false;
    function paint(sec) {
      Object.entries(parts).forEach(([name, T]) => {
        const f = Math.min(1, sec / T), y = base - 34 - f * H;
        root.querySelector(`rect.m-${name}`).setAttribute('y', y.toFixed(1));
        root.querySelector(`line.m-${name}`).setAttribute('y2', y.toFixed(1));
        root.querySelector(`.clock-${name}`).textContent = `${Math.min(sec, T).toFixed(1)} s`;
      });
      out.innerHTML = sec >= 6 ? 'Both loads gain <b>29.4 J</b>. A: 29.4 ÷ 2 = <b>14.7 W</b>. B: 29.4 ÷ 6 = <b>4.9 W</b>. Same energy, different power.' : 'Each motor lifts a 2.0 kg load through 1.5 m.';
    }
    function tick(time) {
      if (!running) return;
      if (!isLive(host)) { requestAnimationFrame(tick); return; }
      if (t0 === null) t0 = time;
      const sec = (time - t0) / 1000;
      paint(sec);
      if (sec < 6) requestAnimationFrame(tick); else running = false;
    }
    host.querySelector('[data-act="go"]').addEventListener('click', () => {
      if (reduced()) { paint(6); return; }
      t0 = null; running = true; requestAnimationFrame(tick);
    });
    host.querySelector('[data-act="reset"]').addEventListener('click', () => { running = false; paint(0); });
    paint(0);
  }

  // ---------- static drawings made for the deck ----------
  function twoGraphs() {
    const g = (ox, swap) => {
      const W = 300, H = 230, pts = [0, 1, 2, 3, 4, 5, 6].map(f => swap ? [f / 7, SPRING[f] / 32] : [SPRING[f] / 32, f / 8]);
      let s = `<path class="dk-ink" d="M${ox} 20V${20 + H}H${ox + W}"/>`;
      s += `<path class="dk-fit" d="M${ox} ${20 + H}L${ox + (swap ? 6.4 / 7 : 25.6 / 32) * W} ${20 + H - (swap ? 25.6 / 32 : 6.4 / 8) * H}"/>`;
      pts.forEach(([a, b]) => { const x = ox + a * W, y = 20 + H - b * H; s += `<path class="dk-cross" d="M${x - 6} ${y - 6}l12 12m0 -12l-12 12"/>`; });
      s += t(ox + W, 20 + H + 34, swap ? 'force / N' : 'extension / m', 'dk-label', 'end') + t(ox + 6, 10, swap ? 'extension / m' : 'force / N', 'dk-label', 'start');
      return s;
    };
    return `<svg class="dk" viewBox="0 0 760 300" role="img" aria-label="Graph 1, extension against force, and graph 2, force against extension, for the same spring">${g(40, true)}${g(420, false)}</svg>`;
  }
  function rods() {
    const mats = [['copper', 1], ['aluminium', 0.6], ['steel', 0.25], ['glass', 0.05]];
    let s = '';
    mats.forEach(([m, k], i) => {
      const y = 50 + i * 70;
      s += `<rect class="dk-rod" x="120" y="${y}" width="420" height="20" rx="4"/>` + t(110, y + 16, m, 'dk-label', 'end');
      for (let p = 0; p < 5; p++) { const x = 180 + p * 80, gone = p < Math.round(k * 5); s += `<path class="dk-pin${gone ? ' gone' : ''}" d="M${x} ${y + 20}v${gone ? 0 : 16}"/>${gone ? '' : `<circle class="dk-wax" cx="${x}" cy="${y + 22}" r="6"/>`}`; }
    });
    s += `<path class="dk-flame" d="M560 330c-30-40 10-60 0-100 30 30 40 60 20 100Z"/>` + t(560, 360, 'heated end', 'dk-small');
    s += `<path class="dk-ink" d="M540 60V330"/>`;
    return `<svg class="dk" viewBox="0 0 640 380" role="img" aria-label="Rods of copper, aluminium, steel and glass heated at one end; wax and pins drop off copper first">${s}</svg>`;
  }
  function coolingChart() {
    const data = [['none', 13], ['newspaper', 8], ['felt', 7], ['bubble wrap', 6], ['cotton wool', 5]];
    const x0 = 80, y0 = 30, w = 620, h = 280, bw = w / data.length;
    let s = `<path class="dk-ink" d="M${x0} ${y0 - 6}V${y0 + h}H${x0 + w}"/>`;
    for (let v = 0; v <= 14; v += 2) s += `<path class="dk-grid" d="M${x0} ${y0 + h - v / 14 * h}H${x0 + w}"/>` + t(x0 - 10, y0 + h - v / 14 * h + 6, v, 'dk-tick', 'end');
    data.forEach(([m, d], i) => { const bh = d / 14 * h; s += `<rect class="dk-bar b1" x="${x0 + i * bw + 18}" y="${y0 + h - bh}" width="${bw - 36}" height="${bh}"/>` + t(x0 + i * bw + bw / 2, y0 + h + 30, m, 'dk-small'); });
    s += t(24, y0 + h / 2, 'drop / °C', 'dk-label', 'middle').replace('<text', `<text transform="rotate(-90 24 ${y0 + h / 2})"`);
    return `<svg class="dk" viewBox="0 0 720 360" role="img" aria-label="Bar chart of the temperature drop in 10 minutes for each wrapping: none 13, newspaper 8, felt 7, bubble wrap 6, cotton wool 5 degrees">${s}</svg>`;
  }

  const FIGURES = {
    shelf: () => F.shelf(), hike: () => F.hike(), twoForces: () => F.twoForces(), extension: () => F.extension(),
    springRig: () => F.springRig(3), pendulum: () => F.pendulum(), stairs: () => F.stairs(), house: () => F.house(false),
    houseMarks: () => F.house(true), bounce: () => F.bounce(), cups: () => F.cups(['none', 'newspaper', 'bubble wrap', 'cotton wool', 'felt']),
    barsTop: () => F.barChart({ title: 'released', values: [20, 0, 0] }), barsMid: () => F.barChart({ title: 'half-way down', values: [10, 10, 0] }), barsLow: () => F.barChart({ title: 'just before landing', values: [0, 20, 0] }),
    sankeyLamp: () => F.sankey({ input: 100, useful: 10, wasted: 90, s: 1.6, useLabel: 'by light', wasteLabel: 'heating the room' }),
    sankeyLed: () => F.sankey({ input: 100, useful: 40, wasted: 60, s: 1.6, useLabel: 'by light', wasteLabel: 'heating the room' }),
    sankeyLesson: () => F.sankey({ input: 100, useful: 20, wasted: 80, s: 1.6, useLabel: 'by light', wasteLabel: 'heating the room' }),
    twoGraphs, rods, coolingChart, story: () => F.storyStrip(), coverArt: () => F.coverArt(),
  };
  const WIDGETS = { ramp: h => swing(h, 'ramp'), pendulum: h => swing(h, 'pendulum'), kinetic, springLab, elastic, motors };

  function render() {
    document.querySelectorAll('#deck [data-fig]').forEach(el => { if (!el.firstElementChild && FIGURES[el.dataset.fig]) el.innerHTML = FIGURES[el.dataset.fig](); });
    document.querySelectorAll('#deck [data-widget]').forEach(el => { if (!el.firstElementChild && WIDGETS[el.dataset.widget]) WIDGETS[el.dataset.widget](el); });
  }
  window.DeckFigures = { render };
})();
