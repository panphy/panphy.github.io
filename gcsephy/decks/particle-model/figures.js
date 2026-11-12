// Diagrams for the Particle Model of Matter deck. The still drawings come from the Year 10
// workbook's helpers (gcsephy/year10phy/unit02/assets/figures.js, window.ParticleFigures), so the
// deck and the booklets match. This file adds three live models: the three states, a gas at
// different temperatures and (Triple Science) a gas squeezed in a syringe.
// Diagram labels with maths, typeset by ../assets/deck-math.js (plain label: label with LaTeX).
// The drawings are shared with the workbook, which prints the plain labels.
window.DeckSvgTex = {
  'V = 60 cm³': '\\(V = 60\\) cm³',
  'V = 30 cm³': '\\(V = 30\\) cm³',
  'V = 20 cm³': '\\(V = 20\\) cm³',
  'p = 100 kPa': '\\(p = 100\\) kPa',
  'p = 200 kPa': '\\(p = 200\\) kPa',
  'p = 300 kPa': '\\(p = 300\\) kPa'
};
(() => {
  const F = window.ParticleFigures;
  const NS = 'http://www.w3.org/2000/svg';
  const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const rng = seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const f = n => Math.round(n * 10) / 10;

  const FIGURES = {
    states: () => F.states(),
    changes: () => F.changes(),
    gasBox: () => F.gasBox(),
    gasPair: () => F.gasBox({ pair: true }),
    cuboid: () => F.cuboid('4.0 cm', '3.0 cm', '2.0 cm'),
    displacement: () => F.displacement(),
    eureka: () => F.eurekaCan(),
    liquidDensity: () => F.liquidDensity(),
    heating: () => F.curve('heat', { values: [[0.26, '0'], [0.74, '100']] }),
    heatingPlain: () => F.curve('heat', { labels: false }),
    cooling: () => F.curve('cool'),
    shcVI: () => F.shc({ meter: 'vi' }),
    shcJoule: () => F.shc(),
    ice: () => F.iceFunnels(),
    syringes: () => F.syringes(),
    pvGraph: () => F.pvGraph(),
    pump: () => F.pump(),
    cover: () => F.coverArt(),
    shcGraph,
    statesLive, gasLive, syringeLive
  };

  // Temperature against energy supplied for the heated block: the sample results in the workbook.
  function shcGraph() {
    const L = 52, T = 12, W = 300, H = 170, B = T + H;
    const pts = [[0, 20], [5760, 24.6], [11520, 30.8], [17280, 37], [23040, 43], [28800, 49]];
    const X = e => L + (e / 30000) * W, Y = c => B - ((c - 15) / 40) * H;
    let b = `<path class="axis" d="M${L} ${T - 6} V${B} H${L + W + 8}"/>`;
    [0, 10000, 20000, 30000].forEach(e => { b += `<text class="sm" x="${f(X(e))}" y="${B + 15}" text-anchor="middle">${e ? e / 1000 + ' 000' : 0}</text>`; });
    [20, 30, 40, 50].forEach(c => { b += `<text class="sm" x="${L - 6}" y="${f(Y(c) + 4)}" text-anchor="end">${c}</text><path class="ink thin dash" d="M${L} ${f(Y(c))} H${L + W}"/>`; });
    b += `<path class="curve" d="M${f(X(2000))} ${f(Y(20.6))} L${f(X(28800))} ${f(Y(49))}"/>` + pts.map(([e, c]) => `<circle class="pt" cx="${f(X(e))}" cy="${f(Y(c))}" r="4.5"/>`).join('');
    b += `<text class="b" x="${L + W / 2}" y="${B + 32}" text-anchor="middle">Energy supplied / J</text><text class="b" text-anchor="middle" transform="translate(14 ${T + H / 2}) rotate(-90)">Temperature / °C</text>`;
    return `<svg class="pf" viewBox="0 0 ${L + W + 16} ${B + 40}" role="img" aria-label="Graph of temperature against energy supplied: a straight line after a curved start">${b}</svg>`;
  }

  // ---------- live models ----------
  // Runs frame(dt) while the figure's slide is the active one. With reduced motion the model
  // is drawn once and left still.
  function live(fig, frame, draw) {
    const slide = fig.closest('.slide');
    draw();
    if (!slide || reduced()) return;
    let raf = 0, last = 0;
    const tick = now => {
      const dt = Math.min((now - last) / 1000, 0.04);
      last = now;
      frame(dt);
      draw();
      raf = requestAnimationFrame(tick);
    };
    const sync = () => {
      const on = slide.classList.contains('active');
      if (on && !raf) { last = performance.now(); raf = requestAnimationFrame(tick); }
      if (!on && raf) { cancelAnimationFrame(raf); raf = 0; }
    };
    new MutationObserver(sync).observe(slide, { attributes: true, attributeFilter: ['class'] });
    sync();
  }
  const circles = (g, n, r, cls) => { g.innerHTML = Array.from({ length: n }, () => `<circle class="p ${cls}" r="${r}"/>`).join(''); return [...g.children]; };
  const place = (els, ps) => els.forEach((el, i) => { el.setAttribute('cx', f(ps[i].x)); el.setAttribute('cy', f(ps[i].y)); });

  // A gas: straight lines between bounces off the walls. speed is in box units per second.
  function gasModel(n, w, h, r, speed, seed) {
    const rand = rng(seed);
    const ps = F.positions.gasPos(w, h, r, n, seed).map(([x, y]) => { const a = rand() * Math.PI * 2, k = 0.55 + rand() * 0.9; return { x, y, vx: Math.cos(a) * k, vy: Math.sin(a) * k }; });
    const m = { ps, w, h, speed, hits: 0 };
    m.step = dt => ps.forEach(p => {
      p.x += p.vx * m.speed * dt; p.y += p.vy * m.speed * dt;
      if (p.x < r) { p.x = r; p.vx = Math.abs(p.vx); m.hits += 1; }
      if (p.x > m.w - r) { p.x = m.w - r; p.vx = -Math.abs(p.vx); m.hits += 1; }
      if (p.y < r) { p.y = r; p.vy = Math.abs(p.vy); m.hits += 1; }
      if (p.y > m.h - r) { p.y = m.h - r; p.vy = -Math.abs(p.vy); m.hits += 1; }
    });
    return m;
  }

  // A liquid: discs that push apart when they overlap and pull together when just apart, so they
  // stay in contact; gravity keeps them at the bottom of the box; and a steady supply of random
  // kicks (with matching drag) keeps them at one temperature, so they never settle into a still
  // pile. Each particle keeps jostling and slowly changes its neighbours.
  function liquidModel(start, w, h, r, seed) {
    const rand = rng(seed), sig = 2 * r, REP = 2000, ATT = 110, G = 90, DRAG = 3, TEMP = 850, DT = 1 / 240;
    const gauss = () => (rand() + rand() + rand() + rand() - 2) * 1.732;
    const ps = start.map(([x, y]) => ({ x, y, vx: 0, vy: 0, ax: 0, ay: 0 }));
    const one = () => {
      ps.forEach(p => { p.ax = 0; p.ay = G; });
      for (let i = 0; i < ps.length; i += 1) for (let j = i + 1; j < ps.length; j += 1) {
        const a = ps[i], b = ps[j], dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 0.01;
        if (d > 1.6 * sig) continue;
        const F = d < sig ? REP * (sig - d) : -ATT * (d - sig) * (1.6 * sig - d) / (0.6 * sig);
        const fx = F * dx / d, fy = F * dy / d;
        a.ax -= fx; a.ay -= fy; b.ax += fx; b.ay += fy;
      }
      const kick = Math.sqrt(2 * DRAG * TEMP * DT);
      ps.forEach(p => {
        p.vx += (p.ax - DRAG * p.vx) * DT + kick * gauss(); p.vy += (p.ay - DRAG * p.vy) * DT + kick * gauss();
        p.x += p.vx * DT; p.y += p.vy * DT;
        if (p.x < r) { p.x = r; p.vx = Math.abs(p.vx); }
        if (p.x > w - r) { p.x = w - r; p.vx = -Math.abs(p.vx); }
        if (p.y > h - r) { p.y = h - r; p.vy = -Math.abs(p.vy); }
        if (p.y < r) { p.y = r; p.vy = Math.abs(p.vy); }
      });
    };
    let owed = 0;
    const step = dt => { owed += dt; while (owed >= DT) { one(); owed -= DT; } };
    step(3); // already settled and moving on the first frame, and in still pictures
    return { ps, step };
  }

  // Slide 4: a solid vibrating in its rows, a liquid whose particles jostle and change places
  // while staying in contact, and a gas flying about, side by side.
  function statesLive(fig) {
    const W = 108, H = 108, r = 6;
    fig.innerHTML = `<svg class="pf" viewBox="0 0 378 146" role="img" aria-label="Moving particle models of a solid, a liquid and a gas">${[0, 1, 2].map(i =>
      `<g transform="translate(${12 + i * 122} 10)"><rect class="ink paper" width="${W}" height="${H}" rx="3"/><g data-box="${i}"></g></g><text class="lg" x="${66 + i * 122}" y="137" text-anchor="middle">${['Solid', 'Liquid', 'Gas'][i]}</text>`).join('')}</svg>`;
    const box = i => fig.querySelector(`[data-box="${i}"]`);
    const rand = rng(99);
    const sites = F.positions.solidPos(W, H, r, 5).map(([x, y]) => ({ x0: x, y0: y, x, y, a: rand() * 6.3, b: rand() * 6.3, k: 11 + rand() * 7 }));
    const liquid = liquidModel(F.positions.liquidPos(W, H, r, sites.length, 7), W, H, r, 7);
    const gas = gasModel(7, W, H, r, 95, 11);
    const els = [circles(box(0), sites.length, r, 'solid'), circles(box(1), liquid.ps.length, r, 'liquid'), circles(box(2), gas.ps.length, r, 'gas')];
    let t = 0;
    const frame = dt => {
      t += dt;
      sites.forEach(s => { s.x = s.x0 + 0.8 * Math.sin(s.k * t + s.a); s.y = s.y0 + 0.8 * Math.cos(s.k * 1.13 * t + s.b); });
      liquid.step(dt);
      gas.step(dt);
    };
    live(fig, frame, () => { place(els[0], sites); place(els[1], liquid.ps); place(els[2], gas.ps); });
  }

  const controls = (label, buttons) => `<div class="pm-controls" role="group" aria-label="${label}">${buttons.map(([act, text]) => `<button type="button" data-act="${act}">${text}</button>`).join('')}</div>`;
  const readout = items => `<div class="pm-readout">${items.map(([key, name]) => `<div><span>${name}</span><b data-out="${key}"></b></div>`).join('')}</div>`;

  // Slide 9: a sealed box of gas with a thermometer in it. The slider changes the temperature
  // smoothly. The particles keep their colour; only their speed changes, in proportion to the
  // square root of the kelvin temperature, and each carries a trail whose length shows its speed.
  function gasLive(fig) {
    const W = 240, H = 150, r = 6, X0 = 12, Y0 = 132, MIN = -200, MAX = 600, BASE = 85, TRAIL = 0.16;
    const tubeX = 216, yOf = T => 120 - ((T - MIN) / (MAX - MIN)) * 104; // scale: MIN at y 120, MAX at y 16
    let T = 20;
    fig.classList.add('pm-live');
    const ticks = [-200, 0, 200, 400, 600].map(v => `<path class="ink thin" d="M${tubeX + 5} ${yOf(v)} h7"/><text class="sm" x="${tubeX + 15}" y="${yOf(v) + 4}" text-anchor="start">${v} °C</text>`).join('');
    fig.innerHTML = `<svg class="pf" viewBox="0 0 284 294" role="img" aria-label="A sealed box of gas particles in random motion, with a thermometer in the gas">` +
      `<rect class="ink paper" x="${X0}" y="${Y0}" width="${W}" height="${H}" rx="3"/><g transform="translate(${X0} ${Y0})"><g data-trails></g><g data-gas></g></g>` +
      `<rect class="ink paper" x="${tubeX - 5}" y="8" width="10" height="${Y0 + 22}" rx="5"/><path class="merc" data-column d=""/><circle class="ink bulb" cx="${tubeX}" cy="${Y0 + 30}" r="8"/>${ticks}` +
      `<text class="sm" x="${X0}" y="${Y0 - 8}" text-anchor="start">sealed box of gas</text><text class="sm" x="${tubeX - 12}" y="16" text-anchor="end">thermometer</text></svg>` +
      `<div class="pm-side">${readout([['temp', 'Temperature'], ['speed', 'Average speed'], ['p', 'Pressure']])}` +
      `<label class="pm-slider"><span>Change the temperature</span><input type="range" min="${MIN}" max="${MAX}" step="1" value="${T}" aria-label="Temperature of the gas in degrees Celsius"></label>` +
      `<p class="pm-note">Sealed box: the volume and the number of particles stay the same. Only the speed of the particles changes. Speeds are compared with the speed at 20 °C.</p></div>`;
    const m = gasModel(14, W, H, r, BASE, 23);
    const els = circles(fig.querySelector('[data-gas]'), m.ps.length, r, 'gas');
    const trailBox = fig.querySelector('[data-trails]');
    trailBox.innerHTML = m.ps.map(() => '<path class="trail"/>').join('');
    const trails = [...trailBox.children];
    const out = key => fig.querySelector(`[data-out="${key}"]`);
    const slider = fig.querySelector('input'), column = fig.querySelector('[data-column]');
    const set = value => {
      T = Math.max(MIN, Math.min(MAX, Math.round(value)));
      const K = T + 273, ratio = Math.sqrt(K / 293);
      m.speed = BASE * ratio;
      slider.value = T;
      column.setAttribute('d', `M${tubeX} ${Y0 + 26} V${f(yOf(T))}`);
      out('temp').textContent = `${T} °C`;
      out('speed').textContent = `× ${ratio.toFixed(2)}`;
      out('p').textContent = `${Math.round(100 * K / 293)} kPa`;
    };
    slider.addEventListener('input', () => set(Number(slider.value)));
    // Arrow keys and swipes on the slider must not also turn the slide.
    ['keydown', 'keyup', 'touchstart', 'touchmove', 'touchend', 'pointerdown', 'mousedown'].forEach(type => slider.addEventListener(type, event => event.stopPropagation()));
    const draw = () => {
      place(els, m.ps);
      // The trail is where the particle was a moment ago: a faster particle leaves a longer one.
      m.ps.forEach((p, i) => trails[i].setAttribute('d', `M${f(p.x)} ${f(p.y)} L${f(Math.max(0, Math.min(W, p.x - p.vx * m.speed * TRAIL)))} ${f(Math.max(0, Math.min(H, p.y - p.vy * m.speed * TRAIL)))}`));
    };
    set(T);
    live(fig, dt => m.step(dt), draw);
  }

  // Triple Science: a fixed mass of gas in a syringe; the piston moves in exact steps.
  function syringeLive(fig) {
    const H = 70, r = 5, FULL = 300, VOLS = [60, 40, 30, 20, 15];
    let at = 0, wall = FULL;
    fig.classList.add('pm-live', 'stack');
    fig.innerHTML = `<svg class="pf" viewBox="0 0 400 110" role="img" aria-label="Gas particles trapped in a syringe by a piston"><rect class="ink paper" x="12" y="20" width="${FULL + 20}" height="${H}" rx="3"/><g transform="translate(12 20)" data-gas></g>` +
      `<g data-piston><rect class="ink mid" x="12" y="22" width="14" height="${H - 4}"/><path class="ink bold" d="M26 55 H100"/><path class="ink bold" d="M100 36 V74"/></g></svg>` +
      `<div class="pm-side">${readout([['v', 'Volume'], ['p', 'Pressure'], ['pv', 'Pressure × volume']])}${controls('Move the piston', [['up', 'Squeeze'], ['down', 'Release']])}<p class="pm-note">Squeezed slowly: the temperature stays the same, so the particles keep the same average speed.</p></div>`;
    const m = gasModel(16, FULL, H, r, 110, 41);
    const els = circles(fig.querySelector('[data-gas]'), m.ps.length, r, 'gas');
    const piston = fig.querySelector('[data-piston]');
    const out = key => fig.querySelector(`[data-out="${key}"]`);
    const set = () => {
      out('v').textContent = `${VOLS[at]} cm³`;
      out('p').textContent = `${6000 / VOLS[at]} kPa`;
      out('pv').textContent = '6000 kPa cm³';
      fig.querySelector('[data-act="down"]').disabled = at === 0;
      fig.querySelector('[data-act="up"]').disabled = at === VOLS.length - 1;
    };
    fig.addEventListener('click', event => {
      const b = event.target.closest('[data-act]');
      if (!b) return;
      at = Math.max(0, Math.min(VOLS.length - 1, at + (b.dataset.act === 'up' ? 1 : -1)));
      set();
      if (reduced()) { wall = FULL * VOLS[at] / 60; m.w = wall; m.ps.forEach(p => { p.x = Math.min(p.x, wall - r); }); draw(); }
    });
    const draw = () => { place(els, m.ps); piston.setAttribute('transform', `translate(${f(wall)} 0)`); };
    const frame = dt => {
      const target = FULL * VOLS[at] / 60;
      wall += Math.max(-140 * dt, Math.min(140 * dt, target - wall));
      m.w = wall;
      m.ps.forEach(p => { if (p.x > wall - r) { p.x = wall - r; p.vx = -Math.abs(p.vx); } });
      m.step(dt);
    };
    set();
    live(fig, frame, draw);
  }

  function render() {
    document.querySelectorAll('[data-fig]').forEach(el => {
      if (el.dataset.drawn) return;
      const make = FIGURES[el.dataset.fig];
      if (!make) return;
      const html = make(el);
      if (typeof html === 'string') el.innerHTML = html;
      el.dataset.drawn = '1';
    });
  }

  window.DeckFigures = { render };
})();
