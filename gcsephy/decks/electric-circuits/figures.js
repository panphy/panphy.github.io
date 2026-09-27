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
    charge: () => {
      let s = `<rect x="20" y="62" width="440" height="72" rx="36" style="fill:#f6e2cf"/>`;
      [[48, 84], [86, 112], [124, 90], [160, 118], [200, 80], [236, 108], [276, 88], [312, 116], [350, 84], [390, 110], [428, 92]].forEach(([x, y]) => {
        s += `<circle cx="${x}" cy="${y}" r="9" class="e-dot"/><line x1="${x - 4}" y1="${y}" x2="${x + 4}" y2="${y}" class="e-minus"/>`;
      });
      s += `<line x1="240" y1="40" x2="240" y2="156" class="gate"/>` + txt(240, 30, 'a point in the wire', 'note hot');
      s += `<line x1="320" y1="172" x2="170" y2="172" class="electron-line"/>` + head(166, 172, 180, 'electron') + txt(245, 196, 'free electrons drift through', 'note cool');
      return svg(480, 210, s, 'Free electrons drifting along a wire past a point; current is the charge passing that point each second');
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
    ions: () => P.filament(),
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
      let s = `<defs><pattern id="deck-earth" width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(40)"><rect width="14" height="14" fill="#258044"/><rect width="7" height="14" fill="#f7d83b"/></pattern></defs>`;
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

  function render() {
    document.querySelectorAll('[data-fig]').forEach(el => {
      const make = FIGURES[el.dataset.fig];
      if (make) el.innerHTML = make(el);
    });
  }

  window.DeckFigures = { render };
})();
