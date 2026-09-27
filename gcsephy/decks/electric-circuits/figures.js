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
  const LAT = { top: 56, w: 230, h: 156, ionR: 10, eR: 5, rows: [82, 134, 186], cols: [27, 71, 115, 159, 203] };

  const FIGURES = {
    // Mission 1
    loop: () => D.circuit({ w: 360, h: 200, wires: [LOOP], parts: [['battery', 110, 40, 'h', 'battery'], ['switchClosed', 250, 40, 'h', 'switch'], ['lamp', 180, 150, 'h', 'lamp', 'b']] }),
    symbols: () => D.symbolGrid([
      ['cell', 'Cell'], ['battery', 'Battery'], ['switchOpen', 'Switch (open)'], ['switchClosed', 'Switch (closed)'], ['resistor', 'Resistor'], ['variable', 'Variable resistor'], ['lamp', 'Lamp'],
      ['ammeter', 'Ammeter'], ['voltmeter', 'Voltmeter'], ['fuse', 'Fuse'], ['diode', 'Diode'], ['led', 'LED'], ['thermistor', 'Thermistor'], ['ldr', 'LDR']
    ]),
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
    // Two live panels (see startLattice): ions in hot metal vibrate more, so the
    // electrons collide more often and fewer get through each second.
    ions: () => {
      let s = '';
      [['cool', 14, 'COOL METAL', 'ions vibrate a little'], ['hot', 276, 'HOT METAL', 'ions vibrate a lot']].forEach(([kind, x0, title, sub]) => {
        s += `<g data-panel="${kind}" data-x0="${x0}">`;
        s += txt(x0 + 115, 24, title, `lattice-title ${kind === 'hot' ? 'hot' : 'cool'}`) + txt(x0 + 115, 42, sub, 'note');
        s += `<rect x="${x0}" y="${LAT.top}" width="${LAT.w}" height="${LAT.h}" rx="10" class="lattice-panel ${kind}"/>`;
        LAT.rows.forEach(y => LAT.cols.forEach(cx => {
          s += `<g class="ion" transform="translate(${x0 + cx} ${y})"><circle r="${LAT.ionR}" class="lattice-ion"/><path d="M-5 0 h10 M0 -5 v10" class="lattice-ion-plus"/></g>`;
        }));
        s += `<g class="electrons"></g>`;
        s += txt(x0 + 115, 238, 'electrons through: 0', `lattice-count ${kind === 'hot' ? 'hot' : 'cool'}`);
        s += `</g>`;
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

  // Slide 21: a simple Drude-style picture. Electrons are pushed to the right,
  // bounce off vibrating ions and speed up again; the counters show how many
  // cross each panel. Runs only while its slide is showing.
  function startLattice(fig) {
    const slide = fig.closest('.slide');
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const NS = 'http://www.w3.org/2000/svg';
    const PUSH = 70, THERMAL = 30, N = 7;
    const panels = [...fig.querySelectorAll('[data-panel]')].map(g => {
      const hot = g.dataset.panel === 'hot';
      const x0 = +g.dataset.x0;
      const ions = [...g.querySelectorAll('.ion')].map((el, i) => ({
        el, circle: el.firstChild, bx: x0 + LAT.cols[i % 5], by: LAT.rows[Math.floor(i / 5)],
        px: Math.random() * 6.3, py: Math.random() * 6.3, x: 0, y: 0, hitUntil: 0
      }));
      const layer = g.querySelector('.electrons');
      const electrons = Array.from({ length: N }, () => {
        const el = document.createElementNS(NS, 'g');
        el.innerHTML = `<circle r="${LAT.eR}" class="e-dot"/><line x1="-3" x2="3" class="e-minus"/>`;
        layer.appendChild(el);
        return { el };
      });
      return { hot, x0, amp: hot ? 7.5 : 1, freq: hot ? 7 : 5, ions, electrons, count: 0, label: g.querySelector('.lattice-count') };
    });
    const channels = [64, 108, 160, 204];
    const place = (p, e, x) => {
      e.x = x; e.y = channels[Math.floor(Math.random() * channels.length)] + (Math.random() - .5) * 6;
      e.vx = PUSH; e.vy = (Math.random() - .5) * THERMAL;
    };
    const reset = () => panels.forEach(p => {
      p.count = 0; p.label.textContent = 'electrons through: 0';
      p.electrons.forEach((e, i) => place(p, e, p.x0 + 8 + i * (LAT.w - 16) / N + Math.random() * 20));
    });
    const draw = t => panels.forEach(p => {
      p.ions.forEach(ion => {
        ion.x = ion.bx + p.amp * Math.sin(2 * Math.PI * p.freq * t + ion.px);
        ion.y = ion.by + p.amp * Math.sin(2 * Math.PI * p.freq * 1.3 * t + ion.py);
        ion.el.setAttribute('transform', `translate(${ion.x.toFixed(1)} ${ion.y.toFixed(1)})`);
        ion.circle.classList.toggle('hit', t < ion.hitUntil);
      });
      p.electrons.forEach(e => e.el.setAttribute('transform', `translate(${e.x.toFixed(1)} ${e.y.toFixed(1)})`));
    });
    const step = (t, dt) => panels.forEach(p => {
      const left = p.x0 + LAT.eR, right = p.x0 + LAT.w - LAT.eR;
      const top = LAT.top + LAT.eR, bottom = LAT.top + LAT.h - LAT.eR;
      p.electrons.forEach(e => {
        // The p.d. keeps pushing electrons right; random thermal jiggle up and down.
        e.vx += (PUSH - e.vx) * 2.2 * dt;
        e.vy += ((Math.random() - .5) * 600 - e.vy * 3) * dt;
        e.x += e.vx * dt; e.y += e.vy * dt;
        if (e.y < top) { e.y = top; e.vy = Math.abs(e.vy); }
        if (e.y > bottom) { e.y = bottom; e.vy = -Math.abs(e.vy); }
        p.ions.forEach(ion => {
          const dx = e.x - ion.x, dy = e.y - ion.y, d = Math.hypot(dx, dy), min = LAT.eR + LAT.ionR;
          if (d >= min || d === 0) return;
          const nx = dx / d, ny = dy / d, vn = e.vx * nx + e.vy * ny;
          e.x = ion.x + nx * min; e.y = ion.y + ny * min;
          if (vn < 0) {
            // Bounce off the ion and lose most of the forward speed.
            e.vx = (e.vx - 2 * vn * nx) * 0.6; e.vy = (e.vy - 2 * vn * ny) * 0.6;
            ion.hitUntil = t + 0.18;
          }
        });
        if (e.x > right) {
          p.count += 1;
          p.label.textContent = `electrons through: ${p.count}`;
          place(p, e, left);
        } else if (e.x < left) { e.x = left; e.vx = Math.abs(e.vx); }
      });
    });
    reset();
    draw(0);
    if (reduced || !slide) return;
    let raf = 0, last = 0, t = 0;
    const frame = now => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      // Small sub-steps keep fast bounces from tunnelling through ions.
      for (let k = 0; k < 4; k += 1) { t += dt / 4; step(t, dt / 4); }
      draw(t);
      raf = requestAnimationFrame(frame);
    };
    const sync = () => {
      const on = slide.classList.contains('active');
      if (on && !raf) { reset(); t = 0; last = performance.now(); raf = requestAnimationFrame(frame); }
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

  window.DeckFigures = { render };
})();
