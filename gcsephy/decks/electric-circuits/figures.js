// Diagrams for the Electric Circuits deck. Circuits, graphs, the cable and the
// National Grid come straight from the Year 10 companion site's own helpers
// (gcsephy/year10phy/unit01/assets/diagrams.js and practical-diagrams.js), so
// every symbol matches. A few extra pictures use the same .cd drawing style.
(() => {
  const D = window.Diagrams;
  const P = window.PracticalDiagrams;
  const LOOP = 'M40 40 H320 V150 H40 Z';
  const svg = (w, h, body, label) => `<svg class="cd" viewBox="0 0 ${w} ${h}" role="img" aria-label="${label}" xmlns="http://www.w3.org/2000/svg">${body}</svg>`;
  const txt = (x, y, s, cls = '', anchor = 'middle') => `<text x="${x}" y="${y}" class="${cls}" text-anchor="${anchor}">${s}</text>`;
  const head = (x, y, a, cls = 'flow') => `<g transform="translate(${x} ${y}) rotate(${a})"><path class="${cls}" d="M7 0 L-5 -6 L-5 6 Z"/></g>`;
  const fall = x => 0.9 * Math.exp(-2.6 * x) + 0.05;
  // Lattice geometry for the slide 21 simulation (panel-local units).
  // The panel is one repeating tile of the lattice: electrons leaving one edge
  // come back in at the opposite edge, so there are no walls.
  const LAT = { top: 56, w: 230, h: 156, ionR: 10, eR: 5, rows: [0, 52, 104], cols: [23, 69, 115, 161, 207] };

  const FIGURES = {
    // Mission 1
    loop: () => D.circuit({ w: 360, h: 200, wires: [LOOP], parts: [['battery', 110, 40, 'h', 'battery'], ['switchClosed', 250, 40, 'h', 'switch'], ['lamp', 180, 150, 'h', 'lamp', 'b']] }),
    symbols: () => D.symbolGrid([
      ['cell', 'Cell'], ['battery', 'Battery'], ['switchOpen', 'Switch (open)'], ['switchClosed', 'Switch (closed)'], ['resistor', 'Resistor'], ['variable', 'Variable resistor'], ['lamp', 'Lamp'],
      ['ammeter', 'Ammeter'], ['voltmeter', 'Voltmeter'], ['fuse', 'Fuse'], ['diode', 'Diode'], ['led', 'LED'], ['thermistor', 'Thermistor'], ['ldr', 'LDR']
    ], { scale: { lamp: 22 / 12, ammeter: 22 / 12, voltmeter: 22 / 12, diode: 22 / 12, led: 22 / 12 } }),  // match the LDR's circle
    neat: () => D.circuit({ w: 360, h: 200, wires: [LOOP], parts: [['battery', 110, 40, 'h', '6 V'], ['switchClosed', 250, 40, 'h'], ['lamp', 110, 150, 'h'], ['resistor', 250, 150, 'h', '10 Ω', 'b']], caption: 'Ruler · right angles · no gaps · values labelled.' }),
    ammeter: () => D.circuit({ w: 360, h: 200, wires: [LOOP], parts: [['cell', 180, 40, 'h'], ['lamp', 120, 150, 'h', 'lamp', 'b'], ['ammeter', 240, 150, 'h', '0.20 A', 'b']], caption: 'The ammeter is in the same loop as the lamp.' }),

    // Mission 2
    // A short length of copper wire, cut open at the near end. Free electrons
    // drift through the fixed metal ions (CSS animation) past a marked point.
    charge: () => {
      const ions = [], electrons = [];
      for (let x = 78; x < 440; x += 38) [74, 100, 126].forEach((y, r) => ions.push([x + (r % 2) * 19, y]));
      // One period (380 units) of electrons, drawn twice so the drift loops seamlessly.
      [[10, 80], [52, 116], [96, 92], [140, 128], [182, 72], [226, 108], [270, 84], [312, 122], [352, 96]].forEach(([x, y], i) => {
        [0, 380].forEach(dx => electrons.push(`<g class="e-jig" style="animation-delay:-${(i * 0.37).toFixed(2)}s"><circle cx="${x + dx + 40}" cy="${y}" r="8" class="e-dot"/><line x1="${x + dx + 36}" y1="${y}" x2="${x + dx + 44}" y2="${y}" class="e-minus"/></g>`));
      });
      const body = 'M50 58 H430 A16 42 0 0 1 430 142 H50 Z';
      let s = `<defs><linearGradient id="deck-copper" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#a95b27"/><stop offset=".28" stop-color="#f4c08f"/><stop offset=".55" stop-color="#dc9258"/><stop offset="1" stop-color="#8e4a1d"/></linearGradient><clipPath id="deck-wire-clip"><path d="${body}" style="visibility:visible"/></clipPath></defs>`;
      s += `<path d="${body}" class="wire-body" style="fill:url(#deck-copper)"/>`;
      s += `<g clip-path="url(#deck-wire-clip)">`;
      ions.forEach(([x, y]) => { s += `<circle cx="${x}" cy="${y}" r="5.5" class="wire-ion"/><path d="M${x - 3} ${y} h6 M${x} ${y - 3} v6" class="wire-ion-plus"/>`; });
      s += `<g class="e-drift">${electrons.join('')}</g></g>`;
      s += `<ellipse cx="50" cy="100" rx="16" ry="42" class="wire-face"/>`;
      s += `<ellipse cx="240" cy="100" rx="17" ry="52" class="gate"/>` + txt(240, 34, 'a point in the wire', 'note hot');
      s += `<line x1="330" y1="178" x2="170" y2="178" class="electron-line"/>` + head(164, 178, 180, 'electron') + txt(250, 202, 'free electrons drift along the wire', 'note cool');
      return svg(480, 214, s, 'A length of copper wire containing fixed positive metal ions and free electrons that drift along it past a marked point; current is the charge passing that point each second');
    },
    conventional: () => D.circuit({
      w: 360, h: 200, wires: [LOOP], parts: [['cell', 180, 40, 'h'], ['resistor', 180, 150, 'h', 'resistor', 'b']],
      flows: [[100, 40, 'h-'], [40, 95, 'v'], [110, 150, 'h'], [320, 105, 'v', 'electron'], [260, 40, 'h', 'electron'], [250, 150, 'h-', 'electron']],
      notes: [[170, 20, '+'], [192, 20, '−'], [58, 80, 'conventional', 'start', 'hot'], [58, 96, 'current: + → −', 'start', 'hot'], [302, 80, 'electrons:', 'end', 'cool'], [302, 96, '− → +', 'end', 'cool']],
      caption: 'Orange: conventional current (+ to −). Blue: electron flow (− to +).'
    }),
    threeAmmeters: () => D.circuit({ w: 360, h: 200, wires: [LOOP], parts: [['cell', 180, 40, 'h', '6 V'], ['ammeter', 40, 95, 'v', '0.60 A', 'r'], ['ammeter', 320, 95, 'v', '0.60 A', 'l'], ['ammeter', 110, 150, 'h', '0.60 A', 'b'], ['resistor', 230, 150, 'h', '10 Ω', 'b']], caption: 'Three ammeters in one loop give the same reading.' }),

    // Mission 3
    voltmeter: () => D.circuit({ w: 360, h: 240, wires: [LOOP, 'M130 150 V205 H230 V150'], parts: [['battery', 180, 40, 'h', '6 V'], ['ammeter', 40, 95, 'v'], ['resistor', 180, 150, 'h', '10 Ω'], ['voltmeter', 180, 205, 'h', 'reads 6 V', 'b']], dots: [[130, 150], [230, 150]], caption: 'Ammeter in series. Voltmeter across the resistor, in parallel.' }),
    energy: () => D.circuit({ w: 360, h: 200, wires: [LOOP], parts: [['battery', 180, 40, 'h', '6 V: 6 J gained per C'], ['resistor', 110, 150, 'h', 'R₁: 3 V', 'b'], ['resistor', 250, 150, 'h', 'R₂: 3 V', 'b']], caption: 'Each coulomb transfers 3 J in R₁ and 3 J in R₂.' }),
    wrongVoltmeter: () => D.circuit({ w: 360, h: 200, wires: [LOOP], parts: [['battery', 180, 40, 'h', '6 V'], ['lamp', 120, 150, 'h', 'lamp', 'b'], ['voltmeter', 240, 150, 'h', 'reads ≈ 6 V', 'b']], caption: 'Voltmeter in series: almost no current, lamp stays off.' }),

    // Mission 4
    ohmic: () => D.graph({ w: 360, h: 250, x: [0, 6, 1], y: [0, 0.6, 0.1], xLabel: 'potential difference / V', yLabel: 'current / A', series: [{ fn: x => 0.1 * x, from: 0, to: 6 }, { points: [[1, 0.1], [2, 0.2], [3, 0.3], [4, 0.4], [5, 0.5], [6, 0.6]] }], caption: 'A 10 Ω resistor: every point gives V ÷ I = 10 Ω.' }),
    // Two live panels driven by latticeModel. Same slow vibration rate in both;
    // the hot ions swing further, so electrons hit them more often.
    ions: () => {
      let s = '';
      [['cool', 14, 'COOL METAL', 'ions vibrate a little'], ['hot', 276, 'HOT METAL', 'ions vibrate a lot']].forEach(([kind, x0, title, sub]) => {
        const tone = kind === 'hot' ? 'hot' : 'cool';
        s += txt(x0 + 115, 24, title, `lattice-title ${tone}`) + txt(x0 + 115, 42, sub, 'note');
        s += `<clipPath id="lattice-clip-${kind}"><rect width="${LAT.w}" height="${LAT.h}" rx="10" style="visibility:visible"/></clipPath>`;
        s += `<g data-panel="${kind}" transform="translate(${x0} ${LAT.top})">`;
        s += `<rect width="${LAT.w}" height="${LAT.h}" rx="10" class="lattice-panel ${kind}"/>`;
        s += `<g clip-path="url(#lattice-clip-${kind})">`;
        // The top row is drawn again along the bottom edge (its wrapped copy).
        [...LAT.rows, LAT.h].forEach((y, r) => LAT.cols.forEach((x, c) => {
          s += `<g class="ion" data-ion="${(r % LAT.rows.length) * LAT.cols.length + c}" data-dy="${r === LAT.rows.length ? LAT.h : 0}" transform="translate(${x} ${y})"><circle r="${LAT.ionR}" class="lattice-ion"/><path d="M-5 0 h10 M0 -5 v10" class="lattice-ion-plus"/></g>`;
        }));
        s += `<g class="electrons"></g></g>`;
        s += `<rect width="${LAT.w}" height="${LAT.h}" rx="10" class="lattice-edge"/></g>`;
        s += txt(x0 + 115, 238, 'electrons through: 0', `lattice-count ${tone}`);
      });
      s += `<line x1="200" y1="258" x2="320" y2="258" class="electron-line"/>` + head(326, 258, 0, 'electron') + txt(340, 262, 'electron flow', 'note cool', 'start');
      return svg(520, 272, s, 'Two panels of metal ions with free electrons flowing through. In the cool metal the ions vibrate a little and electrons pass easily. In the hot metal the ions vibrate a lot, electrons collide more often and fewer get through: higher resistance.');
    },
    measureR: () => D.circuit({ w: 380, h: 250, wires: ['M40 40 H340 V160 H40 Z', 'M140 160 V215 H240 V160'], parts: [['battery', 120, 40, 'h', 'battery'], ['variable', 250, 40, 'h', 'variable resistor'], ['ammeter', 40, 100, 'v'], ['resistor', 190, 160, 'h', 'component'], ['voltmeter', 190, 215, 'h']], dots: [[140, 160], [240, 160]], caption: 'Ammeter in series · voltmeter across · variable resistor changes the current.' }),
    wireBench: () => P.wireBench(),
    graphSkills: () => P.graphSkills(),

    // Mission 5
    series: () => D.circuit({ w: 360, h: 205, wires: [LOOP], parts: [['battery', 180, 40, 'h', '12 V'], ['ammeter', 40, 95, 'v', '1.0 A', 'r'], ['resistor', 120, 150, 'h', '4 Ω · 4 V', 'b'], ['resistor', 240, 150, 'h', '8 Ω · 8 V', 'b']], caption: 'R_total = 4 + 8 = 12 Ω · I = 12 ÷ 12 = 1.0 A' }),
    parallel: () => D.circuit({ w: 360, h: 225, wires: ['M40 40 H320 V185 H40 Z', 'M40 115 H320'], parts: [['battery', 180, 40, 'h', '6 V'], ['ammeter', 40, 77, 'v', '3 A', 'r'], ['resistor', 180, 115, 'h', '3 Ω · 2 A'], ['resistor', 180, 185, 'h', '6 Ω · 1 A', 'b']], dots: [[40, 115], [320, 115]], caption: 'Each branch has 6 V across it · 2 A + 1 A = 3 A' }),
    paths: () => P.currentPaths(),
    seriesProblem: () => D.circuit({ w: 360, h: 245, wires: [LOOP, 'M210 150 V205 H270 V150'], parts: [['battery', 180, 40, 'h', '9.0 V'], ['lamp', 110, 150, 'h', 'lamp', 'b'], ['resistor', 240, 150, 'h', '10 Ω'], ['voltmeter', 240, 205, 'h', '6.0 V', 'b']], dots: [[210, 150], [270, 150]], caption: 'Find the resistance of the lamp.' }),

    // Mission 6
    ivResistor: () => D.ivSketch('resistor', 'Fixed resistor: straight line through the origin.'),
    ivLamp: () => D.ivSketch('lamp', 'Filament lamp: curve gets less steep.'),
    ivDiode: () => D.ivSketch('diode', 'Diode: current one way only.'),
    thermistor: () => D.graph({ sketch: true, w: 300, h: 210, x: [0, 1], y: [0, 1], xLabel: 'temperature', yLabel: 'resistance', series: [{ fn: fall, from: 0.03, to: 1 }], caption: 'Hotter → lower resistance.' }),
    ldr: () => D.graph({ sketch: true, w: 300, h: 210, x: [0, 1], y: [0, 1], xLabel: 'light intensity', yLabel: 'resistance', series: [{ fn: fall, from: 0.03, to: 1 }], caption: 'Brighter → lower resistance.' }),
    sensor: () => D.circuit({ w: 360, h: 200, wires: [LOOP], parts: [['battery', 180, 40, 'h', '6.0 V'], ['ldr', 110, 150, 'h', 'LDR', 'b'], ['resistor', 200, 150, 'h', 'fixed', 'b'], ['ammeter', 280, 150, 'h', '', 'b']], caption: 'LDR in series with a fixed resistor and an ammeter.' }),
    ivCircuit: () => D.circuit({ w: 380, h: 250, wires: ['M40 40 H340 V160 H40 Z', 'M140 160 V215 H240 V160'], parts: [['battery', 120, 40, 'h', 'power supply'], ['variable', 250, 40, 'h', 'variable resistor'], ['ammeter', 40, 100, 'v'], ['lamp', 190, 160, 'h', 'test component'], ['voltmeter', 190, 215, 'h']], dots: [[140, 160], [240, 160]], caption: 'Swap the lamp for a resistor or a diode.' }),
    reverse: () => P.reverseSupply(),
    diodeWay: () => P.diodeWay(),

    // Mission 7
    grid: () => D.nationalGrid(),

    // Mission 8
    acdc: () => D.graph({ sketch: true, w: 340, h: 220, x: [0, 1], y: [-1, 1], xLabel: 'time', yLabel: 'p.d.', series: [{ fn: () => 0.45, from: 0, to: 0.8, cls: 'curve-2' }, { fn: x => 0.85 * Math.sin(2 * Math.PI * 2.5 * x), from: 0, to: 0.8 }], notes: [[0.86, 0.41, 'dc', 'start', 'cool'], [0.37, -0.82, 'ac', 'start', 'hot']], caption: 'dc (blue): one direction. ac (orange): keeps reversing.' }),
    cable: () => D.threeCoreCable(),

    // Earth wire in a fault: the current takes the earth path and the fuse melts.
    earthFault: () => {
      const earthStripe = 'stroke:url(#deck-earth)';
      let s = `<defs><pattern id="deck-earth" width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(40)"><rect width="14" height="14" fill="#258044" stroke="none"/><rect width="7" height="14" fill="#f7d83b" stroke="none"/></pattern></defs>`;
      s += `<rect x="300" y="36" width="190" height="200" rx="10" class="case"/>` + txt(395, 26, 'metal case', 'note');
      s += `<path d="M24 76 H300" class="w-live"/><path d="M24 136 H300" class="w-neutral"/><path d="M60 196 H300" style="${earthStripe}" class="w-earth"/>`;
      s += `<g transform="translate(150 76)"><rect class="mask" x="-21" y="-5" width="42" height="10"/><g class="body"><rect x="-20" y="-7" width="40" height="14"/><line x1="-20" y1="0" x2="20" y2="0"/></g></g>` + txt(150, 58, 'fuse', 'note');
      s += txt(24, 64, 'LIVE', 'note', 'start') + txt(24, 124, 'NEUTRAL', 'note', 'start') + txt(60, 184, 'EARTH', 'note', 'start');
      s += `<path d="M300 136 H350 V112 M410 112 V136 H300" class="inner"/><rect x="350" y="100" width="60" height="24" class="heater"/>` + txt(380, 150, 'heater', 'note');
      s += `<path d="M300 76 H340 Q352 76 352 64 V44" class="w-live"/>`;
      s += `<path class="spark" d="M352 40 l6 -12 l2 10 l10 -6 l-5 11 l11 3 l-12 4 l5 10 l-11 -5 l-4 11 l-3 -12 l-11 3 l7 -9 l-9 -7 z"/>`;
      s += `<circle cx="300" cy="196" r="5" class="dot"/><path d="M60 196 V226 M44 226 H76 M50 234 H70 M56 242 H64"/>`;
      [[230, 76, 0], [90, 76, 0], [470, 150, 90], [230, 196, 180], [100, 196, 180]].forEach(([x, y, a]) => { s += head(x, y, a); });
      s += `<path d="M372 56 H470 V196 H310" class="flow-line" style="stroke-dasharray:6 5"/>`;
      s += txt(250, 268, 'Live touches the case → big current to earth', 'note hot');
      s += txt(250, 288, '→ fuse melts → supply cut off', 'note hot');
      return svg(500, 300, s, 'Fault in a metal-cased heater: the live wire touches the case, a large current flows through the earth wire and the fuse in the live wire melts');
    }
  };

  // Slide 21 model, in panel units. Electrons move at a steady speed; the p.d.
  // gradually turns them towards +x. Hitting an ion bounces them off it (in the
  // ion's frame), then their speed settles back to normal as energy is handed
  // to the lattice. Ions vibrate about fixed sites, slowed
  // right down so the class can watch; temperature sets the amplitude.
  const LATTICE_PHYSICS = { speed: 55, turn: 1.4, freq: 0.5 };
  function latticeModel(amp, count = 6) {
    const { w, h, ionR, eR } = LAT;
    const { speed, turn, freq } = LATTICE_PHYSICS;
    const ions = [];
    LAT.rows.forEach(by => LAT.cols.forEach(bx => ions.push({
      bx, by, x: bx, y: by, vx: 0, vy: 0, hitUntil: -1,
      f: freq * (0.8 + Math.random() * 0.4), px: Math.random() * 6.3, py: Math.random() * 6.3
    })));
    const lanes = [h / 6, h / 2, 5 * h / 6];
    const electrons = Array.from({ length: count }, (_, i) => {
      const a = (Math.random() - 0.5) * 0.8;
      return { x: (i + Math.random() * 0.6) * w / count, y: lanes[i % 3] + (Math.random() - 0.5) * 8, vx: speed * Math.cos(a), vy: speed * Math.sin(a) };
    });
    const model = { ions, electrons, through: 0, collisions: 0, t: 0 };
    const wrapDiff = (d, L) => d - L * Math.round(d / L);
    model.step = dt => {
      const t = (model.t += dt);
      ions.forEach(ion => {
        const wx = 2 * Math.PI * ion.f, wy = wx * 1.3;
        ion.x = ion.bx + amp * Math.sin(wx * t + ion.px);
        ion.y = ion.by + amp * Math.sin(wy * t + ion.py);
        ion.vx = amp * wx * Math.cos(wx * t + ion.px);
        ion.vy = amp * wy * Math.cos(wy * t + ion.py);
      });
      electrons.forEach(e => {
        // A steady push along +x at constant speed turns the velocity at a rate
        // proportional to sin(angle): a bounced-back electron turns round slowly.
        // After a bounce the speed settles back to normal as energy passes to the lattice.
        let ang = Math.atan2(e.vy, e.vx);
        ang -= turn * Math.sin(ang) * dt;
        const v = Math.hypot(e.vx, e.vy) + (speed - Math.hypot(e.vx, e.vy)) * 2.5 * dt;
        e.vx = v * Math.cos(ang); e.vy = v * Math.sin(ang);
        e.x += e.vx * dt; e.y += e.vy * dt;
        if (e.x >= w) { e.x -= w; model.through += 1; }
        if (e.x < 0) { e.x += w; model.through -= 1; }
        e.y -= h * Math.floor(e.y / h);
        ions.forEach(ion => {
          const dx = wrapDiff(e.x - ion.x, w), dy = wrapDiff(e.y - ion.y, h);
          const d = Math.hypot(dx, dy), min = eR + ionR;
          if (d >= min || d === 0) return;
          const nx = dx / d, ny = dy / d;
          e.x += nx * (min - d); e.y += ny * (min - d);
          const ux = e.vx - ion.vx, uy = e.vy - ion.vy, un = ux * nx + uy * ny;
          if (un >= 0) return;
          // Bounce off in the ion's frame, then back to the lab frame.
          e.vx = ux - 2 * un * nx + ion.vx; e.vy = uy - 2 * un * ny + ion.vy;
          // Limit the kick from a fast ion so the rebound stays easy to follow.
          const kick = Math.hypot(e.vx, e.vy) / (1.5 * speed);
          if (kick > 1) { e.vx /= kick; e.vy /= kick; }
          ion.hitUntil = t + 0.3;
          model.collisions += 1;
        });
      });
    };
    return model;
  }

  function startLattice(fig) {
    const slide = fig.closest('.slide');
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const NS = 'http://www.w3.org/2000/svg';
    const panels = [...fig.querySelectorAll('[data-panel]')].map(g => {
      const hot = g.dataset.panel === 'hot';
      const ionEls = [...g.querySelectorAll('.ion')].map(el => ({ el, k: +el.dataset.ion, dy: +el.dataset.dy }));
      const layer = g.querySelector('.electrons');
      return { amp: hot ? 8 : 1.5, ionEls, layer, label: g.parentNode.querySelector(`.lattice-count.${hot ? 'hot' : 'cool'}`) };
    });
    const reset = () => panels.forEach(p => {
      p.model = latticeModel(p.amp);
      // Run briefly first so a still frame (thumbnail, print, reduced motion)
      // already shows the hot ions displaced from their sites.
      for (let k = 0; k < 120; k += 1) p.model.step(1 / 120);
      p.model.through = 0;
      p.layer.innerHTML = '';
      // Each electron is drawn at up to four wrapped positions so it slides
      // smoothly off one edge and on at the other.
      p.eEls = p.model.electrons.map(() => [0, 1, 2, 3].map(() => {
        const el = document.createElementNS(NS, 'g');
        el.innerHTML = `<circle r="${LAT.eR}" class="e-dot"/><line x1="-3" x2="3" class="e-minus"/>`;
        p.layer.appendChild(el);
        return el;
      }));
      p.shown = -1;
    });
    const draw = () => panels.forEach(p => {
      const { ions, electrons, t, through } = p.model;
      p.ionEls.forEach(({ el, k, dy }) => {
        const ion = ions[k];
        el.setAttribute('transform', `translate(${ion.x.toFixed(1)} ${(ion.y + dy).toFixed(1)})`);
        el.firstChild.classList.toggle('hit', t < ion.hitUntil);
      });
      electrons.forEach((e, i) => {
        const xs = [e.x, e.x < LAT.eR ? e.x + LAT.w : e.x > LAT.w - LAT.eR ? e.x - LAT.w : null];
        const ys = [e.y, e.y < LAT.eR ? e.y + LAT.h : e.y > LAT.h - LAT.eR ? e.y - LAT.h : null];
        p.eEls[i].forEach((el, k) => {
          const x = xs[k & 1], y = ys[k >> 1];
          el.style.display = x === null || y === null ? 'none' : '';
          if (x !== null && y !== null) el.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)})`);
        });
      });
      if (through !== p.shown) { p.shown = through; p.label.textContent = `electrons through: ${Math.max(0, through)}`; }
    });
    reset();
    draw();
    if (reduced || !slide) return;
    let raf = 0, last = 0;
    const frame = now => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      // Sub-steps stop a fast bounce skipping through an ion.
      for (let k = 0; k < 4; k += 1) panels.forEach(p => p.model.step(dt / 4));
      draw();
      raf = requestAnimationFrame(frame);
    };
    const sync = () => {
      const on = slide.classList.contains('active');
      if (on && !raf) { reset(); last = performance.now(); raf = requestAnimationFrame(frame); }
      if (!on && raf) { cancelAnimationFrame(raf); raf = 0; }
    };
    new MutationObserver(sync).observe(slide, { attributes: true, attributeFilter: ['class'] });
    sync();
  }

  function render() {
    document.querySelectorAll('[data-fig]').forEach(el => {
      const make = FIGURES[el.dataset.fig];
      if (make) el.innerHTML = make(el);
      if (el.dataset.fig === 'ions') startLattice(el);
    });
  }

  window.DeckFigures = { render, latticeModel };
})();
