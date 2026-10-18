// Figures for the Energy: Stores and Transfers deck. Static drawings come from the workbook's
// EnergyFigures (gcsephy/year9phy/unit02/workbook/assets/figures.js), so slides and workbook
// match. <div data-fig="name"> is filled with a drawing; <div data-widget="name"> becomes an
// interactive model with its own buttons. Models only move on the live slide, and only when a
// button is pressed, so thumbnails and print show the starting picture.
// Diagram labels with maths, typeset by ../assets/deck-math.js (plain label: label with LaTeX).
// The drawings are shared with the workbook, which prints the plain labels.
window.DeckSvgTex = {
  'h': '\\(h\\)',
  'h = 1.5 m': '\\(h = 1.5\\) m',
  'h = 300 m': '\\(h = 300\\) m',
  'h = height of one step × number of steps': '\\(h =\\) height of one step \\(\\times\\) number of steps',
  '1.00 m': '\\(1.00\\) m',
  '0.65 m': '\\(0.65\\) m',
  'h1 = 1.00 m': '\\(h_1 = 1.00\\) m',
  'h2 = 0.65 m': '\\(h_2 = 0.65\\) m',
  'G.P.E. gained = 2.0 × 9.8 × 1.5 = 29.4 J': 'G.P.E. gained \\(= 2.0 \\times 9.8 \\times 1.5 = 29.4\\) J',
  'springLimit|force F / N': 'force \\(F\\) / N',
  'springLimit|extension e / m': 'extension \\(e\\) / m',
  'springLimit|F = ke': '\\(F = k\\,e\\)'
};
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

  // Runs step(dt) on each frame while the slide is live, until step returns false.
  function animate(host, step) {
    let last = null;
    const frame = time => {
      if (!isLive(host)) { last = null; requestAnimationFrame(frame); return; }
      const dt = last === null ? 0 : Math.min(0.05, (time - last) / 1000);
      last = time;
      if (step(dt) !== false) requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }
  const dimV = (x, y1, y2, label, side = 1) => `<path class="dk-dim" d="M${x} ${y1 + 12}V${y2 - 12}"/><path class="dk-head" d="M${x} ${y1}l-8 14h16Z"/><path class="dk-head" d="M${x} ${y2}l-8 -14h16Z"/>` +
    t(x + side * 14, (y1 + y2) / 2 + 9, label, 'dk-label', side > 0 ? 'start' : 'end');
  const dimH = (x1, x2, y, label) => `<path class="dk-dim" d="M${x1 + 12} ${y}H${x2 - 12}"/><path class="dk-head" d="M${x1} ${y}l14 -8v16Z"/><path class="dk-head" d="M${x2} ${y}l-14 -8v16Z"/>` + t((x1 + x2) / 2, y + 36, label, 'dk-label');

  // ---------- 2. Kinetic energy: a car passing trees, and its energy ----------
  // The car stays in the middle of the view; the trees and road markings stream past it, faster
  // at higher speed. Headlight and windscreen at the right: the car drives to the right.
  function kinetic(host) {
    const speeds = [10, 20, 30], max = 900000, x0 = 540, y0 = 50, w = 340, h = 300;
    const TREES = 6, SPAN = 480;
    let trees = '';
    for (let i = 0; i < TREES; i++) trees += `<g class="dk-tree" data-tree="${i}"><rect class="dk-trunk" x="-6" y="-34" width="12" height="34"/><circle class="dk-canopy" cx="0" cy="-62" r="${i % 2 ? 30 : 36}"/></g>`;
    let dashes = '';
    for (let i = 0; i < 8; i++) dashes += `<rect class="dk-roadline" data-dash="${i}" x="0" y="333" width="34" height="6"/>`;
    host.innerHTML = `<div class="dk-stage"><svg class="dk one-store" viewBox="0 0 920 470" role="img" aria-label="A car driving to the right past trees, and a bar chart of the energy in its kinetic store at 10, 20 and 30 metres per second">
      <rect class="dk-sky" x="0" y="20" width="480" height="270"/><g class="dk-trees">${trees}</g>
      <rect class="dk-road" x="0" y="290" width="480" height="90"/><svg x="0" y="290" width="480" height="90" viewBox="0 290 480 90" overflow="hidden">${dashes}</svg>
      <g class="dk-car">
        <path class="dk-body" d="M92 300V262q0-14 14-16l40-6 34-34h96l44 34 44 8q16 3 16 18V300Z"/>
        <path class="dk-window" d="M188 214h38v30h-66ZM236 214h36l34 30h-70Z"/>
        <circle class="dk-headlight" cx="372" cy="270" r="8"/><rect class="dk-taillight" x="92" y="262" width="10" height="16"/>
        <circle class="dk-wheel" cx="148" cy="302" r="24"/><circle class="dk-hub" cx="148" cy="302" r="9"/>
        <circle class="dk-wheel" cx="320" cy="302" r="24"/><circle class="dk-hub" cx="320" cy="302" r="9"/>
      </g>
      <path class="dk-dim" d="M150 70H330"/><path class="dk-head" d="M346 70l-18 -10v20Z"/>${t(240, 54, 'direction of travel', 'dk-small')}
      ${bars(x0, y0, w, h, ['10 m/s', '20 m/s', '30 m/s'])}${t(x0 + 6, 36, 'energy in the kinetic store', 'dk-small', 'start')}
    </svg></div>` + buttons([['v0', '10 m/s'], ['v1', '20 m/s'], ['v2', '30 m/s'], ['m', 'Mass: 1000 kg', 'aria-pressed="false"']]) + '<p class="dk-readout" aria-live="polite"></p>';
    const root = host.querySelector('svg'), out = host.querySelector('.dk-readout');
    const treeEls = [...root.querySelectorAll('[data-tree]')], dashEls = [...root.querySelectorAll('[data-dash]')];
    let mass = 1000, speed = 0, offset = 0, running = false;
    const shown = new Set();
    function scenery() {
      treeEls.forEach((g, i) => {
        const x = ((i * SPAN / TREES - offset * 0.6) % SPAN + SPAN) % SPAN - 20;
        g.setAttribute('transform', `translate(${x.toFixed(1)} 250)`);
        g.style.visibility = x > 440 || x < 30 ? 'hidden' : 'visible';
      });
      dashEls.forEach((r, i) => {
        const x = ((i * 70 - offset) % 560 + 560) % 560 - 40;
        r.setAttribute('x', x.toFixed(1)); r.style.visibility = x > 446 ? 'hidden' : 'visible';
      });
    }
    function pick(i) {
      shown.add(i); speed = speeds[i];
      speeds.forEach((v, j) => setBar(root, j, shown.has(j) ? 0.5 * mass * v * v / max : 0, y0, h));
      root.querySelectorAll('.dk-bar').forEach((r, j) => r.classList.toggle('on', j === i));
      const e = 0.5 * mass * speed * speed;
      out.innerHTML = String.raw`\(E_k = \tfrac{1}{2}\,m\,v^2 = 0.5 \times ${mass} \times ${speed}^2 = ${fmt(e).replace(/\u2009/g, '\\,')}\ \text{J}\)` + (i ? ` <b>\\(= ${(i + 1) ** 2} \\times\\) the energy at 10 m/s</b>` : '');
      typeset(out);
      if (!running && !reduced()) { running = true; animate(host, dt => { offset += speed * 14 * dt; scenery(); return running; }); }
    }
    speeds.forEach((_, i) => host.querySelector(`[data-act="v${i}"]`).addEventListener('click', () => pick(i)));
    const mb = host.querySelector('[data-act="m"]');
    mb.addEventListener('click', () => { mass = mass === 1000 ? 2000 : 1000; mb.textContent = `Mass: ${mass} kg`; mb.setAttribute('aria-pressed', String(mass === 2000)); if (speed) pick(speeds.indexOf(speed)); });
    scenery();
    out.textContent = 'Choose a speed. The trees stream past faster as the car goes faster.';
  }

  // ---------- 3. Spring lab: add masses, read the extension, plot either graph ----------
  // The sample spring of Lesson 4: about 4.0 cm per newton up to 6 N, then past its limit.
  // Both graphs use the same scales (0 to 8 N, 0 to 0.40 m), so swapping the axes reflects the line:
  // graph 1 (extension against force) is shallow, graph 2 (force against extension) is steep.
  const SPRING = [0, 4.0, 8.1, 12.0, 16.0, 20.1, 24.0, 29.5];
  function graphAxes(gx, gy, gw, gh, g1) {
    const xs = g1 ? [0, 8, 1] : [0, 0.4, 0.05], ys = g1 ? [0, 0.4, 0.05] : [0, 8, 1];
    const X = v => gx + (v - xs[0]) / (xs[1] - xs[0]) * gw, Y = v => gy + gh - (v - ys[0]) / (ys[1] - ys[0]) * gh;
    const lab = v => (g1 ? [String(v), v.toFixed(2)] : [v.toFixed(2), String(v)]);
    let s = '';
    for (let i = 0, v = xs[0]; v <= xs[1] + 1e-9; i++, v += xs[2]) s += `<path class="dk-grid" d="M${X(v)} ${gy}V${gy + gh}"/>` + (i % 2 ? '' : t(X(v), gy + gh + 28, lab(v)[0], 'dk-tick'));
    for (let i = 0, v = ys[0]; v <= ys[1] + 1e-9; i++, v += ys[2]) s += `<path class="dk-grid" d="M${gx} ${Y(v)}H${gx + gw}"/>` + (i % 2 || !v ? '' : t(gx - 10, Y(v) + 7, lab(v)[1], 'dk-tick', 'end'));
    s += `<path class="dk-ink" d="M${gx} ${gy - 8}V${gy + gh}H${gx + gw + 8}"/>`;
    s += t(gx + gw, gy + gh + 60, g1 ? 'force / N' : 'extension / m', 'dk-label', 'end') + t(gx + 4, gy - 18, g1 ? 'extension / m' : 'force / N', 'dk-label', 'start');
    const pt = i => (g1 ? [X(i), Y(SPRING[i] / 100)] : [X(SPRING[i] / 100), Y(i)]);
    const fit = g1 ? [X(0), Y(0), X(8), Y(0.32)] : [X(0), Y(0), X(0.32), Y(8)];
    return { s, pt, fit };
  }
  function springLab(host) {
    const top = 50, pxcm = 9, L0 = 5.0, x = 160;
    let ticks = '';
    for (let c = 0; c <= 40; c++) ticks += `<path class="dk-ink thin" d="M262 ${top + c * pxcm}h${c % 5 ? 8 : 16}"/>` + (c % 5 ? '' : t(296, top + c * pxcm + 7, c, 'dk-tick', 'start'));
    const gx = 420, gy = 50, gw = 440, gh = 330;
    host.innerHTML = `<div class="dk-stage"><svg class="dk" viewBox="0 0 920 470" role="img" aria-label="A spring hanging beside a ruler, with a graph of the results">
      <path class="dk-ink thick" d="M40 ${top}H230M60 ${top}V455M30 455H200"/>
      <rect class="dk-ruler" x="258" y="${top - 10}" width="34" height="${40 * pxcm + 20}"/>${ticks}${t(275, top - 18, 'cm', 'dk-tick')}
      <g class="dk-spring"></g><g class="dk-graph"></g>
    </svg></div>` + buttons([['minus', '− 100 g'], ['plus', '+ 100 g'], ['swap', 'Show graph 2'], ['fit', 'Best-fit line', 'aria-pressed="false"'], ['clear', 'Clear']]) + '<p class="dk-readout" aria-live="polite"></p>';
    const root = host.querySelector('svg'), sp = root.querySelector('.dk-spring'), gr = root.querySelector('.dk-graph'), out = host.querySelector('.dk-readout');
    const swapBtn = host.querySelector('[data-act="swap"]');
    let n = 0, g1 = true, fit = false;
    const done = new Set([0]);
    function drawSpring() {
      // The pointer is fixed to the hanger's bar, so it marks the bottom of the spring on the ruler.
      const e = SPRING[n], bar = top + (L0 + e) * pxcm, len = bar - top - 8, turns = 5, step = (len - 12) / turns, w = 18;
      let d = `M${x} ${top}V${top + 6}`;
      for (let i = 0; i < turns; i++) d += `L${x + w} ${top + 6 + step * (i + 0.25)}L${x - w} ${top + 6 + step * (i + 0.75)}`;
      let masses = '';
      for (let i = 0; i < n; i++) masses += `<rect class="dk-mass" x="${x - 32}" y="${bar + 10 + i * 8}" width="64" height="7" rx="2"/>`;
      sp.innerHTML = `<path class="dk-ink" d="${d}L${x} ${bar - 8}V${bar}"/><path class="dk-ink" d="M${x} ${bar}v${n * 8 + 14}"/>${masses}` +
        `<path class="dk-pointer" d="M${x - 24} ${bar}H262"/>`;
      out.innerHTML = `Mass added <b>${n * 100} g</b> · force <b>${n} N</b> · pointer at <b>${(L0 + e).toFixed(1)} cm</b> · extension <b>${e.toFixed(1)} cm</b>, or <b>${(e / 100).toFixed(3)} m</b>`;
    }
    function drawGraph() {
      const a = graphAxes(gx, gy, gw, gh, g1);
      let s = a.s;
      if (fit) s += `<path class="dk-fit" d="M${a.fit[0]} ${a.fit[1]}L${a.fit[2]} ${a.fit[3]}"/>` + t(gx + gw / 2, gy + 30, g1 ? 'gradient = 0.04 m per N' : 'gradient = k = 25 N/m', 'dk-label hot');
      done.forEach(i => { const [px, py] = a.pt(i); s += `<path class="dk-cross${i === 7 ? ' odd' : ''}" d="M${px - 9} ${py - 9}l18 18m0 -18l-18 18"/>`; });
      s += t(gx + gw, gy - 18, g1 ? 'Graph 1' : 'Graph 2', 'dk-label', 'end');
      gr.innerHTML = s;
    }
    const update = () => { done.add(n); drawSpring(); drawGraph(); };
    host.querySelector('[data-act="plus"]').addEventListener('click', () => { if (n < 7) { n++; update(); } });
    host.querySelector('[data-act="minus"]').addEventListener('click', () => { if (n > 0) { n--; update(); } });
    swapBtn.addEventListener('click', () => { g1 = !g1; swapBtn.textContent = g1 ? 'Show graph 2' : 'Show graph 1'; drawGraph(); });
    const fb = host.querySelector('[data-act="fit"]');
    fb.addEventListener('click', () => { fit = !fit; fb.setAttribute('aria-pressed', String(fit)); drawGraph(); });
    host.querySelector('[data-act="clear"]').addEventListener('click', () => { done.clear(); n = 0; fit = false; fb.setAttribute('aria-pressed', 'false'); update(); });
    update();
  }

  // ---------- 4. Elastic potential energy: a block on a smooth surface, pulled out ----------
  function elastic(host) {
    const es = [0.04, 0.08, 0.12], k = 50, max = 0.4, x0 = 580, y0 = 50, w = 300, h = 300;
    const wall = 50, rest = 270, scale = 900, floor = 300, bw = 70;
    host.innerHTML = `<div class="dk-stage"><svg class="dk one-store elastic" viewBox="0 0 920 470" role="img" aria-label="A spring fixed to a wall holds a block on a smooth surface; the block is pulled out by 0.04, 0.08 or 0.12 metres; a bar chart shows the energy stored">
      <rect class="dk-wall" x="20" y="150" width="${wall - 20}" height="${floor - 150}"/><path class="dk-ink thick" d="M${wall} 150V${floor}"/>
      <path class="dk-ink thick" d="M20 ${floor}H550"/>${t(290, floor + 34, 'smooth surface: no friction', 'dk-small')}
      <path class="dk-guide" d="M${rest} 120V${floor}"/>${t(rest, 110, 'end of the spring, unstretched', 'dk-small')}
      <g class="dk-hspring"></g>
      ${bars(x0, y0, w, h, ['0.04 m', '0.08 m', '0.12 m'])}${t(x0 + 6, 36, 'elastic potential energy', 'dk-small', 'start')}
    </svg></div>` + buttons([['e0', 'Stretch 0.04 m'], ['e1', 'Stretch 0.08 m'], ['e2', 'Stretch 0.12 m'], ['r', 'Reset']]) + '<p class="dk-readout" aria-live="polite"></p>';
    const root = host.querySelector('svg'), hs = root.querySelector('.dk-hspring'), out = host.querySelector('.dk-readout');
    const shown = new Set();
    let pos = 0, target = 0, moving = false;
    function draw() {
      const end = rest + pos * scale, turns = 10, step = (end - wall - 20) / turns, cy = floor - bw / 2;
      let d = `M${wall} ${cy}H${wall + 10}`;
      for (let i = 0; i < turns; i++) d += `L${wall + 10 + step * (i + 0.25)} ${cy - 18}L${wall + 10 + step * (i + 0.75)} ${cy + 18}`;
      hs.innerHTML = `<path class="dk-ink" d="${d}L${end - 10} ${cy}H${end}"/><rect class="dk-block" x="${end}" y="${floor - bw}" width="${bw}" height="${bw}"/>` +
        (pos > 0.001 ? `<path class="dk-pull" d="M${end + bw} ${cy}H${end + bw + 70}"/><path class="dk-head hot" d="M${end + bw + 86} ${cy}l-18 -10v20Z"/>${t(end + bw + 44, cy - 18, 'pull', 'dk-label hot')}` +
          dimH(rest, end, floor + 70, `e = ${(Math.round(pos * 100) / 100).toFixed(2)} m`) : '');
    }
    function moveTo(e) {
      target = e;
      if (reduced()) { pos = e; draw(); return; }
      if (moving) return;
      moving = true;
      animate(host, dt => { const step = Math.sign(target - pos) * Math.min(Math.abs(target - pos), 0.15 * dt); pos += step; draw(); if (Math.abs(target - pos) < 1e-4) { pos = target; draw(); moving = false; return false; } return true; });
    }
    function pick(i) {
      shown.add(i);
      es.forEach((e, j) => setBar(root, j, shown.has(j) ? 0.5 * k * e * e / max : 0, y0, h));
      moveTo(es[i]);
      const e = es[i], E = 0.5 * k * e * e;
      out.innerHTML = String.raw`\(E_e = \tfrac{1}{2}\,k\,e^2 = 0.5 \times ${k} \times ${e}^2 = ${E.toFixed(2)}\ \text{J}\)` + (i ? ` <b>\\(= ${(i + 1) ** 2} \\times\\) the energy at 0.04 m</b>` : '');
      typeset(out);
    }
    es.forEach((_, i) => host.querySelector(`[data-act="e${i}"]`).addEventListener('click', () => pick(i)));
    const intro = () => { out.innerHTML = 'Spring constant \\(k = 50\\)&nbsp;N/m. Choose an extension.'; typeset(out); };
    host.querySelector('[data-act="r"]').addEventListener('click', () => { moveTo(0); intro(); });
    draw();
    intro();
  }

  // ---------- 5. Two motors lift the same load through the same height ----------
  function motors(host) {
    const H = 210, base = 400, bwid = 80, bh = 60;
    const rig = (x, name) => `<path class="dk-ink thick" d="M${x} ${base}V70H${x + 150}"/><circle class="dk-pulley" cx="${x + 140}" cy="78" r="10"/>
      <rect class="dk-motor" x="${x - 34}" y="44" width="68" height="50" rx="6"/>${t(x, 78, name, 'dk-label')}
      <line class="dk-string m-${name}" x1="${x + 140}" y1="88" x2="${x + 140}" y2="${base - bh}"/><rect class="dk-mass m-${name}" x="${x + 140 - bwid / 2}" y="${base - bh}" width="${bwid}" height="${bh}" rx="4"/>
      ${t(x + 140, base - bh / 2 + 9, '2.0 kg', 'dk-small m-label-' + name)}
      ${dimV(x + 140 + bwid / 2 + 30, base - H, base, '1.5 m')}
      ${t(x + 140, 450, '0.0 s', `dk-clock clock-${name}`)}`;
    host.innerHTML = `<div class="dk-stage"><svg class="dk" viewBox="0 0 920 470" role="img" aria-label="Two motors, A and B, each lift a 2.0 kilogram load through 1.5 metres; A takes 2 seconds and B takes 6 seconds">
      <path class="dk-ink" d="M20 ${base}H900"/>${rig(80, 'A')}${rig(520, 'B')}
    </svg></div>` + buttons([['go', 'Start'], ['reset', 'Reset']]) + '<p class="dk-readout" aria-live="polite"></p>';
    const root = host.querySelector('svg'), out = host.querySelector('.dk-readout');
    const parts = { A: 2, B: 6 };
    let sec = 0, running = false;
    function paint() {
      Object.entries(parts).forEach(([name, T]) => {
        const f = Math.min(1, sec / T), y = base - bh - f * H;
        root.querySelector(`rect.m-${name}`).setAttribute('y', y.toFixed(1));
        root.querySelector(`line.m-${name}`).setAttribute('y2', y.toFixed(1));
        root.querySelector(`.m-label-${name}`).setAttribute('y', (y + bh / 2 + 9).toFixed(1));
        root.querySelector(`.clock-${name}`).textContent = `${Math.min(sec, T).toFixed(1)} s`;
      });
      const msg = sec >= 6 ? 'Both loads gain <b>29.4 J</b>. A: \\(29.4 \\div 2 =\\) <b>14.7 W</b>. B: \\(29.4 \\div 6 =\\) <b>4.9 W</b>. Same energy, different power.' : 'Each motor lifts a 2.0 kg load through 1.5 m. Press Start.';
      if (out.dataset.msg !== msg) { out.dataset.msg = msg; out.innerHTML = msg; typeset(out); }
    }
    host.querySelector('[data-act="go"]').addEventListener('click', () => {
      sec = 0;
      if (reduced()) { sec = 6; paint(); return; }
      if (running) return;
      running = true;
      animate(host, dt => { sec += dt; paint(); if (sec >= 6) { running = false; return false; } return running; });
    });
    host.querySelector('[data-act="reset"]').addEventListener('click', () => { running = false; sec = 0; paint(); });
    paint();
  }

  // ---------- 6. Lift a book onto a shelf: straight up, then across ----------
  function lift(host) {
    const floor = 380, shelfTop = 150, bookW = 90, bookH = 34, x0 = 120, shelfX = 360, xEnd = 420;
    host.innerHTML = `<div class="dk-stage"><svg class="dk" viewBox="0 0 640 430" role="img" aria-label="A 2.0 kilogram book is lifted straight up through 1.5 metres and slid onto a shelf">
      <path class="dk-ink thick" d="M20 ${floor}H620"/><rect class="dk-wall" x="590" y="40" width="30" height="${floor - 40}"/>
      <rect class="dk-shelf" x="${shelfX}" y="${shelfTop}" width="${590 - shelfX}" height="14"/><path class="dk-ink" d="M560 ${shelfTop + 14}L590 ${shelfTop + 54}"/>
      <path class="dk-guide" d="M${shelfX - 70} ${shelfTop}H${shelfX}"/>${dimV(shelfX - 40, shelfTop, floor, 'h = 1.5 m', -1)}
      <rect class="dk-ghost" x="${x0}" y="${floor - bookH}" width="${bookW}" height="${bookH}" rx="3"/>
      <g class="dk-book"><rect class="dk-bookbody" x="0" y="0" width="${bookW}" height="${bookH}" rx="3"/>${t(bookW / 2, bookH / 2 + 8, '2.0 kg', 'dk-small')}</g>
      <text x="320" y="${floor + 40}" class="dk-label dk-gain" text-anchor="middle"></text>
    </svg></div>` + buttons([['go', 'Lift the book'], ['reset', 'Reset']]);
    const root = host.querySelector('svg'), book = root.querySelector('.dk-book'), gain = root.querySelector('.dk-gain');
    let s = 0, running = false;
    const UP = 1.2, ACROSS = 0.6;
    function paint() {
      const up = Math.min(1, s / UP), across = Math.max(0, Math.min(1, (s - UP) / ACROSS));
      const ease = u => u * u * (3 - 2 * u);
      const y = floor - bookH - ease(up) * (floor - shelfTop), x = x0 + ease(across) * (xEnd - x0);
      book.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)})`);
      gain.textContent = up >= 1 ? 'G.P.E. gained = 2.0 × 9.8 × 1.5 = 29.4 J' : '';
    }
    const go = () => {
      if (reduced()) { s = UP + ACROSS; paint(); return; }
      if (running) return;
      s = 0; running = true;
      animate(host, dt => { s += dt; paint(); if (s >= UP + ACROSS) { running = false; return false; } return true; });
    };
    host.querySelector('[data-act="go"]').addEventListener('click', go);
    host.querySelector('[data-act="reset"]').addEventListener('click', () => { running = false; s = 0; paint(); });
    paint();
  }

  // ---------- 7. Bounce: the ball falls and rises on the same vertical line ----------
  function bounce(host) {
    const floor = 430, m = 400, h1 = 1.0, h2 = 0.65, r = 18, bx = 250;  // 400 px per metre
    const yOf = hgt => floor - r - hgt * m;
    let ticks = '';
    for (let c = 0; c <= 100; c += 5) ticks += `<path class="dk-ink thin" d="M300 ${floor - c * 4}h${c % 10 ? 10 : 20}"/>` + (c % 20 || !c ? '' : t(336, floor - c * 4 + 7, (c / 100).toFixed(1), 'dk-tick', 'start'));
    host.innerHTML = `<div class="dk-stage"><svg class="dk" viewBox="0 0 720 470" role="img" aria-label="A ball dropped from 1.00 metre beside a metre rule falls straight down and bounces straight back up to 0.65 metres">
      <path class="dk-ink thick" d="M20 ${floor}H700"/><rect class="dk-ruler" x="296" y="${floor - m - 10}" width="34" height="${m + 10}"/>${ticks}${t(316, floor - m - 20, 'm', 'dk-tick')}
      <circle class="dk-ghost" cx="${bx}" cy="${yOf(h1)}" r="${r}"/>
      <path class="dk-guide" d="M${bx - 40} ${floor - h1 * m}H296M376 ${floor - h1 * m}H640"/>${dimV(620, floor - h1 * m, floor, '1.00 m', -1)}
      <g class="dk-bounce-mark"><path class="dk-guide" d="M${bx - 40} ${floor - h2 * m}H296M376 ${floor - h2 * m}H460"/>${dimV(420, floor - h2 * m, floor, '0.65 m')}</g>
      <circle class="dk-ball" cx="${bx}" cy="${yOf(h1)}" r="${r}"/>
    </svg></div>` + buttons([['go', 'Drop the ball'], ['reset', 'Reset']]) + '<p class="dk-readout" aria-live="polite">Released from rest at 1.00 m, measured from the bottom of the ball.</p>';
    const root = host.querySelector('svg'), ball = root.querySelector('.dk-ball'), mark = root.querySelector('.dk-bounce-mark'), out = host.querySelector('.dk-readout');
    // Times scaled up 1.6× so the fall can be followed by eye.
    const g = 9.8, slow = 1.6, tFall = Math.sqrt(2 * h1 / g), tRise = Math.sqrt(2 * h2 / g);
    let s = 0, running = false;
    function paint() {
      const tt = s / slow;
      const hgt = tt < tFall ? h1 - 0.5 * g * tt * tt : tt < tFall + tRise ? (() => { const u = tt - tFall, v = g * tRise; return v * u - 0.5 * g * u * u; })() : h2;
      ball.setAttribute('cy', yOf(Math.max(0, hgt)).toFixed(1));
      const done = tt >= tFall + tRise;
      mark.style.visibility = done ? 'visible' : 'hidden';
      out.innerHTML = done ? String.raw`\(E_{p1} = 0.98\) J; \(E_{p2} = 0.637\) J. Efficiency: 65%.` : 'Released from rest at 1.00 m, measured from the bottom of the ball.';
      if (done) typeset(out);
    }
    host.querySelector('[data-act="go"]').addEventListener('click', () => {
      s = 0;
      if (reduced()) { s = slow * (tFall + tRise); paint(); return; }
      if (running) return;
      running = true;
      animate(host, dt => { s += dt; paint(); if (s >= slow * (tFall + tRise)) { running = false; return false; } return true; });
    });
    host.querySelector('[data-act="reset"]').addEventListener('click', () => { running = false; s = 0; paint(); });
    paint();
  }

  // ---------- 8. Wax-and-pin rods: heat spreads from the flame, pins drop as it arrives ----------
  // The heated region grows at a rate set by each rod's conductivity. A pin falls once the heat
  // reaches it, so copper loses all five, aluminium three, steel one and glass none by the end.
  function rodsLab(host) {
    const mats = [['copper', 1], ['aluminium', 0.6], ['steel', 0.25], ['glass', 0.05]];
    const end = 540, len = 374, T = 6, FALL = 0.7;
    let s = '';
    mats.forEach(([m, k], i) => {
      const y = 50 + i * 70;
      s += `<rect class="dk-rod" x="${end - len}" y="${y}" width="${len}" height="20" rx="4"/><rect class="dk-rod-hot" data-rod="${i}" x="${end}" y="${y + 1.5}" width="0" height="17" rx="3"/>` + t(156, y + 16, m, 'dk-label', 'end');
      for (let p = 0; p < 5; p++) { const x = 205 + p * 74; s += `<g class="dk-pin-g" data-rod="${i}" data-d="${end - x}"><path class="dk-pin" d="M${x} ${y + 20}v16"/><circle class="dk-wax" cx="${x}" cy="${y + 22}" r="6"/></g>`; }
    });
    s += `<g class="dk-flame-g"><path class="dk-flame" d="M560 330c-30-40 10-60 0-100 30 30 40 60 20 100Z"/><path class="dk-flame-core" d="M563 328c-14-20 2-34 0-56 14 18 20 36 9 56Z"/></g>` + t(560, 360, 'heated end', 'dk-small');
    s += `<path class="dk-ink" d="M540 60V330"/>`;
    host.innerHTML = `<div class="dk-stage"><svg class="dk" viewBox="0 0 640 380" role="img" aria-label="Rods of copper, aluminium, steel and glass heated at one end; heat spreads fastest along copper, so its wax melts and pins drop first, and glass last">${s}</svg></div>` +
      buttons([['go', 'Heat the rods'], ['reset', 'Reset']]);
    const root = host.querySelector('svg'), hot = [...root.querySelectorAll('.dk-rod-hot')], pins = [...root.querySelectorAll('.dk-pin-g')], flame = root.querySelector('.dk-flame-g');
    const front = (i, tt) => mats[i][1] * len * Math.min(tt, T) / T;
    let tt = 0, running = false;
    function paint() {
      hot.forEach((r, i) => { const w = front(i, tt); r.setAttribute('x', (end - w).toFixed(1)); r.setAttribute('width', w.toFixed(1)); });
      pins.forEach(g => {
        const k = mats[g.dataset.rod][1], d = +g.dataset.d, at = k ? d * T / (k * len) : Infinity;
        const u = at <= T ? Math.max(0, tt - at) : 0;
        g.setAttribute('transform', `translate(0 ${(0.5 * 400 * u * u).toFixed(1)})`);
        g.style.opacity = u ? Math.max(0, 1 - u / FALL).toFixed(2) : '';
      });
      // The flame flickers and sways about its base while the rods are heating.
      const lit = running && tt < stop, sy = lit ? 1 + 0.1 * Math.sin(17 * tt) + 0.05 * Math.sin(29 * tt) : 1;
      const sx = lit ? 1 - 0.05 * Math.sin(23 * tt) : 1, sk = lit ? 4 * Math.sin(7 * tt) : 0;
      flame.setAttribute('transform', `translate(560 330) skewX(${sk.toFixed(2)}) scale(${sx.toFixed(3)} ${sy.toFixed(3)}) translate(-560 -330)`);
      flame.classList.toggle('lit', lit);
    }
    const stop = T + FALL;
    host.querySelector('[data-act="go"]').addEventListener('click', () => {
      if (reduced()) { tt = stop; paint(); return; }
      if (running) return;
      tt = 0; running = true;
      animate(host, dt => { if (!running) return false; tt += dt; if (tt >= stop) running = false; paint(); return running; });
    });
    host.querySelector('[data-act="reset"]').addEventListener('click', () => { running = false; tt = 0; paint(); });
    paint();
  }

  // ---------- static drawings made for the deck, with labels large enough for the back row ----------
  function twoGraphs() {
    const one = (gx, g1) => { const a = graphAxes(gx, 90, 300, 240, g1); let s = a.s + `<path class="dk-fit" d="M${a.fit[0]} ${a.fit[1]}L${a.fit[2]} ${a.fit[3]}"/>`; for (let i = 0; i <= 6; i++) { const [x, y] = a.pt(i); s += `<path class="dk-cross" d="M${x - 7} ${y - 7}l14 14m0 -14l-14 14"/>`; } return s + t(gx + 150, 30, g1 ? 'Graph 1' : 'Graph 2', 'dk-big'); };
    return `<svg class="dk" viewBox="0 0 900 420" role="img" aria-label="The same spring results on the same scales: graph 1, extension against force, has a shallow line; graph 2, force against extension, has a steep line">${one(110, true)}${one(560, false)}</svg>`;
  }
  function springLimit() {
    return `<svg class="dk" viewBox="0 0 780 490" role="img" aria-label="A force–extension graph is a straight line through the origin up to the marked limit of proportionality, then curves away from the straight-line continuation">
      <path class="dk-axis" d="M110 65V400H740"/>
      ${t(110, 38, 'force F / N', 'dk-big', 'start')}${t(738, 454, 'extension e / m', 'dk-big', 'end')}${t(92, 433, '0', 'dk-label', 'end')}
      <path class="dk-guide" d="M400 180L590 36"/>
      <path class="dk-fit" d="M110 400L400 180C470 127 560 110 710 90"/>
      <circle class="dk-dot" cx="400" cy="180" r="9"/>
      ${F.arrow(458, 236, 410, 188, 'thin', 8)}
      ${t(225, 230, 'F = ke', 'dk-big')}${t(525, 270, 'limit of', 'dk-big')}${t(525, 308, 'proportionality', 'dk-big')}
    </svg>`;
  }
  function hikeBig() {
    return `<svg class="dk" viewBox="0 0 780 400" role="img" aria-label="A hiker climbs from a car park 120 m above sea level to a summit 420 m above sea level: a height gain of 300 m">
      <rect class="dk-sea" x="10" y="360" width="760" height="22"/>${t(760, 348, 'sea level', 'dk-small', 'end')}
      <path class="dk-hill" d="M10 360L90 290L200 282L400 70L560 360Z"/>
      <path class="dk-guide" d="M150 286H640M400 70H640"/><circle class="dk-dot" cx="150" cy="286" r="9"/><circle class="dk-dot" cx="400" cy="70" r="9"/>
      ${t(250, 334, 'car park: 120 m', 'dk-big')}${t(400, 44, 'summit: 420 m', 'dk-big')}
      ${dimV(610, 70, 286, 'h = 300 m', 1)}
    </svg>`;
  }
  function extensionBig() {
    const coil = (x, y1, y2, turns = 7, w = 20) => { const st = (y2 - y1 - 16) / turns; let d = `M${x} ${y1}V${y1 + 8}`; for (let i = 0; i < turns; i++) d += `L${x + w} ${y1 + 8 + st * (i + 0.25)}L${x - w} ${y1 + 8 + st * (i + 0.75)}`; return `<path class="dk-ink" d="${d}L${x} ${y2 - 8}V${y2}"/>`; };
    return `<svg class="dk" viewBox="0 0 760 400" role="img" aria-label="The same spring with no load and with a load: the extension is the stretched length minus the original length">
      <path class="dk-ink thick" d="M60 30H640"/>${coil(270, 30, 170)}${coil(490, 30, 280)}<rect class="dk-mass" x="452" y="280" width="76" height="40" rx="4"/>
      <path class="dk-guide" d="M230 170H600"/>
      ${dimV(200, 30, 170, '', -1)}${t(186, 94, 'original', 'dk-big', 'end')}${t(186, 128, 'length', 'dk-big', 'end')}
      ${dimV(580, 170, 280, 'extension', 1)}
      ${t(270, 380, 'no load', 'dk-big')}${t(490, 380, 'with a load', 'dk-big')}
    </svg>`;
  }
  function stairsBig() {
    let d = 'M60 420', x = 60, y = 420;
    for (let i = 0; i < 8; i++) { y -= 30; d += `V${y}`; x += 64; d += `H${x}`; }
    const person = (px, py) => `<g transform="translate(${px} ${py})"><circle class="dk-head-c" cx="0" cy="-74" r="11"/><path class="dk-ink" d="M0 -63V-30M0 -54L-14 -38M0 -54L14 -38M0 -30L-11 0M0 -30L11 0"/></g>`;
    return `<svg class="dk" viewBox="0 0 820 470" role="img" aria-label="A student walks up a flight of eight steps; the vertical height h is the height of one step times the number of steps">
      <path class="dk-steps" d="${d}V420Z"/><path class="dk-ink thick" d="M30 420H800"/>${person(100, 390)}${person(560, 180)}
      <path class="dk-guide" d="M572 180H770"/>${dimV(740, 180, 420, 'h', -1)}
      ${t(410, 458, 'h = height of one step × number of steps', 'dk-label')}
    </svg>`;
  }
  function coolingChart() {
    const data = [['none', 13], ['newspaper', 8], ['felt', 7], ['bubble wrap', 6], ['cotton wool', 5]];
    const x0 = 80, y0 = 30, w = 620, h = 280, bw = w / data.length;
    let s = `<path class="dk-ink" d="M${x0} ${y0 - 6}V${y0 + h}H${x0 + w}"/>`;
    for (let v = 0; v <= 14; v += 2) s += `<path class="dk-grid" d="M${x0} ${y0 + h - v / 14 * h}H${x0 + w}"/>` + t(x0 - 10, y0 + h - v / 14 * h + 6, v, 'dk-tick', 'end');
    data.forEach(([m, d], i) => { const bh = d / 14 * h, cx = x0 + i * bw + bw / 2; s += `<rect class="dk-bar b1" x="${x0 + i * bw + 18}" y="${y0 + h - bh}" width="${bw - 36}" height="${bh}"/>` + m.split(' ').map((w, j) => t(cx, y0 + h + 30 + j * 26, w, 'dk-small')).join(''); });
    s += t(24, y0 + h / 2, 'drop / °C', 'dk-label', 'middle').replace('<text', `<text transform="rotate(-90 24 ${y0 + h / 2})"`);
    return `<svg class="dk" viewBox="0 0 720 360" role="img" aria-label="Bar chart of the temperature drop in 10 minutes for each wrapping: none 13, newspaper 8, felt 7, bubble wrap 6, cotton wool 5 degrees">${s}</svg>`;
  }

  const FIGURES = {
    shelf: () => F.shelf(), hike: hikeBig, twoForces: () => F.twoForces(), extension: extensionBig,
    springRig: () => F.springRig(3), pendulum: () => F.pendulum(), stairs: stairsBig, house: () => F.house(false),
    houseMarks: () => F.house(true), bounce: () => F.bounce(), cups: () => F.cups(['none', 'newspaper', 'bubble wrap', 'cotton wool', 'felt']),
    barsTop: () => F.barChart({ title: 'released', values: [20, 0, 0] }), barsMid: () => F.barChart({ title: 'half-way down', values: [10, 10, 0] }), barsLow: () => F.barChart({ title: 'just before landing', values: [0, 20, 0] }),
    sankeyLamp: () => F.sankey({ blend: true, input: 100, useful: 10, wasted: 90, s: 1.6, useLabel: 'by light', wasteLabel: 'heating the room' }),
    sankeyLed: () => F.sankey({ blend: true, input: 100, useful: 40, wasted: 60, s: 1.6, useLabel: 'by light', wasteLabel: 'heating the room' }),
    sankeyLesson: () => F.sankey({ blend: true, input: 100, useful: 20, wasted: 80, s: 1.6, useLabel: 'by light', wasteLabel: 'heating the room' }),
    twoGraphs, springLimit, coolingChart, story: () => F.storyStrip(),
    // The motion arrow sits just above the ball, clear of the track, with the label lifted above it.
    coverArt: () => F.coverArt()
      .replace('<text x="300" y="150"', '<text x="300" y="124"')
      .replace('</svg>', `<g aria-label="The ball is moving to the right">${F.arrow(280, 145, 326, 145, '', 10)}</g></svg>`),
  };
  const WIDGETS = { ramp: h => swing(h, 'ramp'), pendulum: h => swing(h, 'pendulum'), kinetic, springLab, elastic, motors, lift, bounce, rods: rodsLab };

  function render() {
    document.querySelectorAll('#deck [data-fig]').forEach(el => { if (!el.firstElementChild && FIGURES[el.dataset.fig]) el.innerHTML = FIGURES[el.dataset.fig](); });
    document.querySelectorAll('#deck [data-widget]').forEach(el => { if (!el.firstElementChild && WIDGETS[el.dataset.widget]) WIDGETS[el.dataset.widget](el); });
  }
  window.DeckFigures = { render };
})();
