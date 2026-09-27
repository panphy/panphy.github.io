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
    // Page 8 introduces moving charge in a complete loop; page 9 measures it at one point.
    chargeIntro: () => {
      let s = `<path d="M95 52 H445 V210 H95 Z" class="intro-wire"/>`;
      s += `<g transform="translate(270 52)"><rect class="mask" x="-25" y="-8" width="50" height="16"/><g class="body"><line x1="-15" y1="-20" x2="-15" y2="20"/><line class="thick" x1="-5" y1="-12" x2="-5" y2="12"/><line x1="9" y1="-20" x2="9" y2="20"/><line class="thick" x1="17" y1="-12" x2="17" y2="12"/></g></g>`;
      s += `<g transform="translate(445 132)"><rect class="mask" x="-18" y="-18" width="36" height="36"/><g class="body"><circle r="17"/><path d="M-11 -11 L11 11 M-11 11 L11 -11"/></g></g>`;
      s += txt(270, 22, 'battery', 'diagram-label');
      s += txt(476, 132, 'lamp', 'diagram-label', 'start');
      [[150, 52], [382, 52], [445, 185], [328, 210], [195, 210], [95, 133]].forEach(([x, y]) => {
        s += `<circle cx="${x}" cy="${y}" r="7" class="e-dot"/><path d="M${x-4} ${y} h8" class="e-minus"/>`;
      });
      s += `<path d="M135 178 V105" class="electron-line"/>` + head(135, 102, -90, 'electron');
      s += txt(156, 146, 'moving', 'diagram-label cool', 'start') + txt(156, 164, 'charge', 'diagram-label cool', 'start');
      s += `<path d="M270 210 V240" class="gate"/>` + txt(270, 261, 'count charge passing here', 'diagram-label hot');
      return svg(540, 280, s, 'A battery drives moving electrons around a complete loop through a lamp. Current can be found by counting charge passing one point each second.');
    },
    chargeRate: () => {
      let s = `<rect x="24" y="72" width="490" height="112" rx="54" class="wire-fill"/>`;
      s += `<path d="M269 48 V205" class="gate"/>` + txt(269, 32, 'one point in the wire', 'diagram-label hot');
      [[70, 111], [100, 150], [135, 112], [165, 150], [200, 111], [228, 150], [312, 111], [345, 151], [379, 112], [413, 151], [464, 112]].forEach(([x, y]) => {
        s += `<circle cx="${x}" cy="${y}" r="10" class="e-dot"/><path d="M${x-5} ${y} h10" class="e-minus"/>`;
      });
      s += `<path d="M418 217 H315" class="electron-line"/>` + head(306, 217, 180, 'electron') + txt(365, 240, 'electrons drift', 'diagram-label cool');
      s += `<path d="M269 188 V227" class="gate"/>` + txt(269, 271, 'If 1 C passes in 1 s  →  1 A', 'diagram-equation');
      return svg(540, 290, s, 'Current is measured at one point in a wire. If one coulomb of charge passes that point in one second, the current is one ampere.');
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
    ions: () => {
      const panel = (x0, hot) => {
        let p = `<rect x="${x0}" y="54" width="220" height="150" rx="10" class="${hot ? 'hot-metal' : 'cool-metal'}"/>`;
        for (let row = 0; row < 3; row += 1) {
          for (let col = 0; col < 4; col += 1) {
            const x = x0 + 32 + col * 52;
            const y = 85 + row * 47;
            if (hot) p += `<path d="M${x-15} ${y-8} q-5 8 0 16 M${x+15} ${y-8} q5 8 0 16" class="ion-vibration"/>`;
            p += `<circle cx="${x}" cy="${y}" r="12" class="metal-ion"/>` + txt(x, y + 5, '+', 'ion-plus');
          }
        }
        if (hot) {
          p += `<path d="M${x0+9} 132 L${x0+45} 132 L${x0+77} 153 L${x0+111} 114 L${x0+145} 151 L${x0+180} 116 L${x0+211} 126" class="electron-track"/>`;
          [[x0+77,153],[x0+111,114],[x0+145,151]].forEach(([x,y]) => p += `<circle cx="${x}" cy="${y}" r="5" class="collision-dot"/>`);
        } else {
          p += `<path d="M${x0+9} 108 H${x0+211}" class="electron-track"/>`;
        }
        p += `<circle cx="${x0+11}" cy="${hot ? 132 : 108}" r="8" class="e-dot"/><path d="M${x0+7} ${hot ? 132 : 108} h8" class="e-minus"/>`;
        p += txt(x0 + 110, 36, hot ? 'HOT METAL' : 'COOL METAL', 'diagram-label');
        p += txt(x0 + 110, 231, hot ? 'more collisions → higher R' : 'fewer collisions → lower R', 'diagram-label ' + (hot ? 'hot' : 'cool'));
        return p;
      };
      const s = panel(18, false) + panel(268, true) + txt(253, 132, '→', 'diagram-arrow');
      return svg(510, 250, s, 'Comparison of cool and hot metal: electrons pass through a lattice of positive ions. Hot ions vibrate more, causing more collisions and higher resistance.');
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
      let s = `<defs><pattern id="deck-earth" width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(40)"><rect width="14" height="14" fill="#258044"/><rect width="7" height="14" fill="#f7d83b"/></pattern></defs>`;
      s += `<rect x="300" y="43" width="185" height="188" rx="11" class="case"/>`;
      s += txt(392, 30, 'earthed metal case', 'diagram-label');
      // The intact appliance circuit runs from live, through the heater, to neutral.
      s += `<path d="M25 83 H320 V118 H349" class="w-live"/>`;
      s += `<path d="M25 157 H455 V118 H426" class="w-neutral"/>`;
      s += `<rect x="349" y="103" width="77" height="30" class="heater"/>`;
      s += txt(387, 127, 'heater', 'diagram-label');
      s += `<g transform="translate(155 83)"><rect class="mask" x="-22" y="-8" width="44" height="16"/><g class="body"><rect x="-21" y="-8" width="42" height="16"/><path d="M-17 0 H17"/></g></g>`;
      s += txt(155, 63, 'fuse', 'diagram-label');
      // A fault puts live in contact with the case. The protective earth offers a low-resistance return.
      s += `<path d="M320 83 V61 H325" class="fault-contact"/>`;
      s += `<path d="M320 61 l8 -13 l2 10 l12 -5 l-6 10 l12 5 l-13 3 l3 12 l-10 -8 l-8 9 l1 -13 l-12 -3 z" class="spark"/>`;
      s += `<path d="M300 209 H82" class="w-earth" style="stroke:url(#deck-earth)"/>`;
      s += `<circle cx="300" cy="209" r="6" class="dot"/>`;
      s += `<path d="M82 209 V235 M65 235 H99 M71 243 H93 M77 251 H87"/>`;
      s += txt(25, 69, 'LIVE', 'diagram-label', 'start') + txt(25, 146, 'NEUTRAL', 'diagram-label', 'start') + txt(82, 194, 'EARTH', 'diagram-label', 'start');
      s += `<path d="M225 83 H294 M332 70 H463 V209 H306 M285 209 H126" class="fault-flow"/>`;
      [[259,83,0],[463,148,90],[238,209,180]].forEach(([x,y,a]) => s += head(x,y,a));
      s += txt(255, 277, 'Fault current → earth → fuse melts', 'diagram-equation hot');
      return svg(510, 295, s, 'A live wire faults against the earthed metal case of a heater. A large fault current runs through the case and protective earth, causing the fuse in the live wire to melt.');
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
