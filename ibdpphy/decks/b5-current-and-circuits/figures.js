// Diagrams for the B.5 Current and circuits deck, added to the shared set in ../assets/figures.js.
// Wires and symbols are drawn in the text colour, conventional current is apricot, electrons
// blue and potential differences teal. Nothing here is terracotta: B.5 has no additional HL content.
window.DeckFigures.add(P => {
  const { svg, arrow, text, sub, both, through, sampled, labelled, seeded, track, anim, twoState, f, TAU } = P;
  const line = (d, colour, width = 5, extra = '') => `<path d="${d}" style="fill:none;stroke:var(--${colour});stroke-width:${width};stroke-linecap:round;stroke-linejoin:round" ${extra}/>`;
  const INK = 'fill:none;stroke:var(--text-main);stroke-width:4;stroke-linecap:round;stroke-linejoin:round';
  const BOX = 'fill:var(--card-bg);stroke:var(--text-main);stroke-width:4;stroke-linejoin:round';
  const head = `<path d="M0,0 L-13,-7 V7 Z" style="fill:var(--text-main)"/>`;
  // Circuit symbols as in the data booklet, drawn along the x axis and centred on the origin:
  // h is half the length of wire that the symbol replaces. The longer plate of a cell is its
  // positive terminal and is drawn on the side the branch starts from.
  const box = `<rect x="-38" y="-14" width="76" height="28" style="${BOX}"/>`;
  const SYMBOLS = {
    cell: { h: 8, body: `<path d="M-8,-28 V28" style="${INK}"/><path d="M8,-14 V14" style="${INK};stroke-width:8;stroke-linecap:butt"/>` },
    battery: { h: 30, body: `<path d="M-30,-28 V28 M8,-28 V28" style="${INK}"/><path d="M-14,-14 V14 M24,-14 V14" style="${INK};stroke-width:8;stroke-linecap:butt"/><path d="M-8,0 H2" style="${INK};stroke-dasharray:3 4"/>` },
    resistor: { h: 38, body: box },
    variable: { h: 38, body: box + `<path d="M-30,30 L28,-28" style="${INK}"/><g transform="translate(30 -30) rotate(-45)">${head}</g>` },
    thermistor: { h: 38, body: box + `<path d="M-40,30 L22,-28 H40" style="${INK}"/>` },
    ldr: { h: 38, body: box + `<path d="M-34,-52 L-16,-34 M-14,-56 L4,-38" style="${INK}"/><g transform="translate(-14 -32) rotate(45)">${head}</g><g transform="translate(6 -36) rotate(45)">${head}</g>` },
    pot: { h: 38, body: box + `<path d="M0,-60 V-20" style="${INK}"/><g transform="translate(0 -15) rotate(90)">${head}</g>` },
    heater: { h: 44, body: `<rect x="-44" y="-14" width="88" height="28" style="${BOX}"/><path d="M-22,-14 V14 M0,-14 V14 M22,-14 V14" style="${INK}"/>` },
    lamp: { h: 24, body: `<circle r="24" style="${BOX}"/><path d="M-17,-17 L17,17 M17,-17 L-17,17" style="${INK}"/>` },
    ammeter: { h: 24, body: `<circle r="24" style="${BOX}"/>`, letter: 'A' },
    voltmeter: { h: 24, body: `<circle r="24" style="${BOX}"/>`, letter: 'V' },
    open: { h: 24, body: `<path d="M-24,0 L20,-20" style="${INK}"/><circle cx="-24" r="5" style="fill:var(--text-main)"/><circle cx="24" r="5" style="fill:var(--text-main)"/>` },
    closed: { h: 24, body: `<path d="M-24,0 H24" style="${INK}"/><circle cx="-24" r="5" style="fill:var(--text-main)"/><circle cx="24" r="5" style="fill:var(--text-main)"/>` },
    gap: { h: 10, body: `<circle cx="-10" r="6" style="${BOX}"/><circle cx="10" r="6" style="${BOX}"/>` }
  };
  // A straight wire from (x1, y1) to (x2, y2) carrying the listed symbols: { kind, at (0 to 1),
  // label, side (which side of the wire the label sits: −1 or 1), flip (turn the symbol round) }.
  function branch(x1, y1, x2, y2, items = [], on = true) {
    const len = Math.hypot(x2 - x1, y2 - y1), ux = (x2 - x1) / len, uy = (y2 - y1) / len, deg = Math.atan2(uy, ux) * 180 / Math.PI;
    let wires = '', bodies = '', labels = '', from = 0;
    [...items].sort((a, b) => a.at - b.at).forEach(item => {
      const sym = SYMBOLS[item.kind], pos = item.at * len, cx = x1 + ux * pos, cy = y1 + uy * pos, side = item.side || -1;
      wires += `M${f(from)},0 H${f(pos - sym.h)} `; from = pos + sym.h;
      bodies += `<g transform="translate(${f(pos)} 0)${item.flip ? ' scale(-1 1)' : ''}">${sym.body}</g>`;
      if (sym.letter) labels += text(f(cx), f(cy) + 11, sym.letter, 'lbl strong', 'middle', 'style="font-size:30px"');
      if (item.label && on) { const d = item.gap || 54, lx = cx + uy * d * side * -1, ly = cy + ux * d * side; labels += text(f(lx), f(ly) + 10, item.label, 'lbl mono strong', Math.abs(ux) > 0.5 ? 'middle' : (lx > cx ? 'start' : 'end')); }
    });
    wires += `M${f(from)},0 H${f(len)}`;
    return `<g transform="translate(${x1} ${y1}) rotate(${f(deg)})"><path d="${wires}" style="${INK}"/>${bodies}</g>${labels}`;
  }
  const node = (x, y) => `<circle cx="${x}" cy="${y}" r="6" style="fill:var(--text-main)"/>`;
  // An arrowhead on a wire showing conventional current, pointing along `deg`.
  const flow = (x, y, deg, label = '', dx = 0, dy = -22) => `<g transform="translate(${x} ${y}) rotate(${deg})"><path d="M12,0 L-10,-11 V11 Z" style="fill:var(--brand-accent)"/></g>` + (label ? text(x + dx, y + dy, label, 'lbl mono strong', 'middle', 'style="fill:var(--brand-accent)"') : '');
  // Points at equal steps round a closed path given by its corners.
  const round = (corners, step = 8) => { const out = []; corners.forEach(([x1, y1], i) => { const [x2, y2] = corners[(i + 1) % corners.length], n = Math.round(Math.hypot(x2 - x1, y2 - y1) / step); for (let j = 0; j < n; j++) out.push([x1 + (x2 - x1) * j / n, y1 + (y2 - y1) * j / n]); }); return out; };
  const electron = `<circle r="8" style="fill:var(--electron)"/>`;
  const electrons = (corners, n, dur) => { const pts = round(corners); return Array.from({ length: n }, (_, k) => { const s = Math.round(k * pts.length / n), loop = [...pts.slice(s), ...pts.slice(0, s)]; loop.push(loop[0]); return `<g>${track(loop, dur)}${electron}</g>`; }).join(''); };
  const axes = (x0, y0, x1, y1, xl, yl) => arrow(x0, y0, x0, y1, 'text-secondary', 2.5) + arrow(x0, y0, x1, y0, 'text-secondary', 2.5) + text(x1 - 6, y0 + 40, xl, 'lbl mono', 'end') + text(x0 + 16, y1 + 14, yl, 'lbl mono', 'start');
  // A bracket showing a potential difference between two points beside the circuit.
  let clips = 0;
  const pd = (x1, y1, x2, y2, label, lx, ly, anchor = 'middle') => both(x1, y1, x2, y2, 'brand-primary', 3) + text(lx, ly, label, 'lbl mono strong', anchor, 'style="fill:var(--brand-primary)"');

  return {
    // A cell, a switch and a lamp, with electrons going round. Also the title picture, with data-plain.
    'b5-circuit': el => {
      const on = labelled(el), L = 180, R = 620, T = 130, B = 390;
      let s = branch(L, B, L, T, [{ kind: 'cell', at: 0.5, flip: true, label: on ? 'cell' : '', side: 1, gap: 70 }], on) + branch(L, T, R, T, [{ kind: 'closed', at: 0.5 }], on) + branch(R, T, R, B, [{ kind: 'lamp', at: 0.5, label: 'lamp', side: -1, gap: 76 }], on) + branch(R, B, L, B, [], on);
      if (on) s += flow(300, T, 0, 'conventional current', 30, -28) + flow(480, B, 180) + text(400, B + 50, 'electrons move the other way', 'lbl', 'middle', 'style="fill:var(--electron)"') + text(L - 36, T + 86, '+', 'lbl display', 'end') + text(L - 36, B - 60, '−', 'lbl display', 'end');
      // Electrons leave the negative terminal: anticlockwise here.
      const way = [[L, B], [R, B], [R, T], [L, T]];
      const still = round(way, 90).map(([x, y]) => `<g transform="translate(${f(x)} ${f(y)})">${electron}</g>`).join('');
      return svg(on ? '40 60 760 400' : '120 80 560 360', s + twoState(still, electrons(way, 14, 16)), 'A circuit of a cell, a closed switch and a lamp joined in a single loop. Conventional current goes from the positive terminal of the cell round to the negative terminal; the electrons move the other way');
    },

    // Inside a metal wire: fixed positive ions and free electrons drifting. Also drawn plain.
    'b5-wire': el => {
      const on = labelled(el), rand = seeded(8), x1 = 110, x2 = 770, y1 = 170, y2 = 350;
      let s = `<rect x="${x1}" y="${y1}" width="${x2 - x1}" height="${y2 - y1}" rx="14" style="fill:color-mix(in srgb, var(--brand-accent) 16%, var(--viewer-bg));stroke:var(--text-secondary);stroke-width:3"/>`;
      s += Array.from({ length: 24 }, (_, i) => { const x = x1 + 55 + (i % 8) * 79, y = y1 + 32 + Math.floor(i / 8) * 58; return `<circle cx="${x}" cy="${y}" r="17" style="fill:var(--proton);opacity:.85"/>` + text(x, y + 9, '+', 'lbl strong', 'middle', 'style="fill:#fff;font-size:26px"'); }).join('');
      if (on) s += arrow(330, 110, 550, 110, 'brand-accent', 6) + text(440, 86, 'conventional current', 'lbl strong') + arrow(550, 410, 330, 410, 'electron', 6) + text(440, 456, 'electrons drift', 'lbl strong') + text(100, 150, 'fixed positive ions', 'lbl', 'start');
      const rows = Array.from({ length: 12 }, (_, k) => ({ y: y1 + 18 + (k % 4) * 49 + rand() * 12, start: rand(), wob: rand() * TAU }));
      const at = (e, t) => { const u = ((e.start - t) % 1 + 1) % 1; return [x1 - 20 + (x2 - x1 + 40) * u, e.y + 9 * Math.sin(e.wob + t * TAU * 9)]; };
      const still = rows.map(e => `<g transform="translate(${at(e, 0.2).map(f).join(' ')})">${electron}</g>`).join('');
      // Each electron crosses the wire once in a cycle and jumps back to the start outside the clipped area.
      const clip = `b5-wire-clip-${++clips}`, mover = `<clipPath id="${clip}"><rect x="${x1 + 3}" y="${y1}" width="${x2 - x1 - 6}" height="${y2 - y1}" rx="12"/></clipPath><g clip-path="url(#${clip})">` + rows.map(e => { const n = 120, pts = Array.from({ length: n + 1 }, (_, i) => [x2 + 20 - (x2 - x1 + 40) * i / n, e.y + 9 * Math.sin(e.wob + i / n * TAU * 9)]); return `<g>${track(pts, 12, { extra: `begin="-${f(e.start * 12)}s"` })}${electron}</g>`; }).join('') + '</g>';
      return svg(on ? '80 50 720 430' : '90 150 700 220', s + twoState(still, mover), 'A piece of metal wire. Its positive ions are fixed in a regular pattern; free electrons wander between them and drift slowly towards the positive end of the wire. Conventional current is in the opposite direction to the drift of the electrons');
    },

    // The circuit symbols needed for the course.
    'b5-symbols': () => {
      const items = [['cell', 'cell'], ['battery', 'battery'], ['closed', 'switch'], ['resistor', 'resistor'], ['variable', 'variable resistor'], ['pot', 'potentiometer'], ['thermistor', 'thermistor'], ['ldr', 'LDR'], ['lamp', 'lamp'], ['ammeter', 'ammeter'], ['voltmeter', 'voltmeter'], ['heater', 'heating element']];
      const s = items.map(([kind, name], i) => { const x = 70 + (i % 6) * 225, y = 90 + Math.floor(i / 6) * 170; return branch(x, y, x + 150, y, [{ kind: kind === 'closed' ? 'open' : kind, at: 0.5 }]) + text(x + 75, y + 70, name, 'lbl'); }).join('');
      return svg('30 20 1380 330', s, 'Twelve circuit symbols: cell, battery, switch, resistor, variable resistor, potentiometer, thermistor, light-dependent resistor, lamp, ammeter, voltmeter and heating element');
    },

    // Current against potential difference. data-kind: ohmic or lamp. Also drawn plain.
    'b5-iv': el => {
      const on = labelled(el), lamp = el.dataset.kind === 'lamp', cx = 430, cy = 250;
      const curve = lamp ? sampled(t => { const v = -1 + 2 * t; return [cx + 300 * v, cy - 190 * Math.tanh(1.9 * v) / Math.tanh(1.9)]; }, 80) : `M${cx - 300},${cy + 190} L${cx + 300},${cy - 190}`;
      let s = arrow(90, cy, 800, cy, 'text-secondary', 2.5) + arrow(cx, 470, cx, 30, 'text-secondary', 2.5) + line(curve, 'brand-primary', 6);
      if (on) s += text(cx + 16, 46, 'I', 'lbl display', 'start') + text(794, cy + 44, 'V', 'lbl display', 'end') + (lamp ? text(600, 120, 'hot filament:', 'lbl halo', 'start') + text(600, 154, 'higher resistance', 'lbl strong halo', 'start') : text(590, 200, 'straight, through', 'lbl halo', 'start') + text(590, 234, 'the origin', 'lbl strong halo', 'start'));
      return svg(on ? '70 10 760 480' : '90 30 720 440', s, lamp ? 'A graph of current against potential difference for a filament lamp. It passes through the origin but curves over at larger potential differences in both directions: the current rises less and less steeply as the filament heats up' : 'A graph of current against potential difference for an ohmic conductor: a straight line through the origin, in both directions');
    },

    // Resistors in series and in parallel. data-kind: series, parallel or combo (the worked example). Also drawn plain.
    'b5-combine': el => {
      const on = labelled(el), kind = el.dataset.kind || 'series', L = 150, R = 690, T = 110, B = 400;
      const cell = volts => branch(L, B, L, T, [{ kind: 'cell', at: 0.5, flip: true, label: volts, side: 1, gap: 70 }], on);
      let s = '';
      if (kind === 'series') {
        s = cell('V') + branch(L, T, R, T, [], on) + branch(R, T, R, B, [], on) + branch(R, B, L, B, [{ kind: 'resistor', at: 0.3, label: sub('R', '2'), side: 1 }, { kind: 'resistor', at: 0.7, label: sub('R', '1'), side: 1 }], on);
        if (on) s += flow(420, T, 0, 'I', 0, -26) + pd(L + 110, B - 50, L + 320, B - 50, sub('V', '1'), L + 215, B - 68) + pd(R - 320, B - 50, R - 110, B - 50, sub('V', '2'), R - 215, B - 68) + text(420, 250, 'the same current in both', 'lbl');
      } else if (kind === 'parallel') {
        s = cell('V') + branch(L, T, R, T, [], on) + branch(L, B, R, B, [], on) + branch(450, T, 450, B, [{ kind: 'resistor', at: 0.5, label: sub('R', '1'), side: 1, gap: 64 }], on) + branch(R, T, R, B, [{ kind: 'resistor', at: 0.5, label: sub('R', '2'), side: -1, gap: 64 }], on) + node(450, T) + node(450, B);
        if (on) s += flow(300, T, 0, 'I', 0, -26) + flow(450, T + 60, 90, sub('I', '1'), -40, 10) + flow(R, T + 60, 90, sub('I', '2'), -40, 10) + text(420, 460, 'the same p.d. across both', 'lbl');
      } else {
        s = cell('9.0 V') + branch(L, T, R, T, [{ kind: 'resistor', at: 0.3, label: '6.0 Ω' }], on) + branch(L, B, R, B, [], on) + branch(520, T, 520, B, [{ kind: 'resistor', at: 0.5, label: '4.0 Ω', side: 1, gap: 64 }], on) + branch(R, T, R, B, [{ kind: 'resistor', at: 0.5, label: '12 Ω', side: -1, gap: 64 }], on) + node(520, T) + node(520, B);
        if (on) s += flow(420, T, 0);
      }
      return svg(on ? '10 30 830 450' : '100 60 640 380', s, kind === 'series' ? 'Two resistors joined in series with a cell: the same current passes through both, and the potential difference of the cell is shared between them' : kind === 'parallel' ? 'Two resistors joined in parallel across a cell: each has the full potential difference of the cell across it, and the current from the cell divides between them' : 'A 9.0 volt cell joined to a 6.0 ohm resistor in series with a parallel pair of 4.0 ohm and 12 ohm resistors');
    },

    // A potential divider. data-kind: plain, thermistor, ldr or pot. Also drawn plain.
    'b5-divider': el => {
      const on = labelled(el), kind = el.dataset.kind || 'plain', L = 180, M = 440, T = 90, B = 430, mid = 260;
      let s = branch(L, B, L, T, [{ kind: 'battery', at: 0.5, flip: true, label: sub('V', 'in'), side: 1, gap: 76 }], on) + branch(L, T, M, T, [], on) + branch(L, B, M, B, [], on);
      if (kind === 'pot') {
        s += `<rect x="${M - 14}" y="${mid - 110}" width="28" height="220" style="${BOX}"/><path d="M${M},${T} V${mid - 110} M${M},${mid + 110} V${B}" style="${INK}"/>`;
        s += `<path d="M700,300 H${M + 44}" style="${INK}"/><g transform="translate(${M + 20} 300)"><g transform="rotate(180)">${head}</g></g><path d="M${M},${B} H700" style="${INK}"/>` + SYMBOLS.gap.body.replace(/cx="-10"/, 'cx="700" cy="300"').replace(/cx="10"/, 'cx="700" cy="430"');
        if (on) s += pd(740, 312, 740, 418, sub('V', 'out'), 760, 376, 'start') + text(M + 60, 270, 'sliding contact', 'lbl', 'start') + both(M - 40, 240, M - 40, 360, 'brand-accent', 3);
      } else {
        const top = kind === 'thermistor' ? 'thermistor' : kind === 'ldr' ? 'ldr' : 'resistor';
        s += branch(M, T, M, mid, [{ kind: top, at: 0.5, label: on ? sub('R', '1') : '', side: 1, gap: 70 }], on) + branch(M, mid, M, B, [{ kind: 'resistor', at: 0.5, label: on ? sub('R', '2') : '', side: 1, gap: 70 }], on) + node(M, mid) + `<path d="M${M},${mid} H700 M${M},${B} H700" style="${INK}"/>` + SYMBOLS.gap.body.replace(/cx="-10"/, `cx="700" cy="${mid}"`).replace(/cx="10"/, `cx="700" cy="${B}"`);
        if (on) s += pd(740, mid + 12, 740, B - 12, sub('V', 'out'), 760, (mid + B) / 2 + 10, 'start');
      }
      return svg(on ? '40 40 820 440' : '100 50 660 420', s, kind === 'pot' ? 'A potentiometer joined across a battery. The output is taken between the sliding contact and one end, so moving the contact changes the output potential difference smoothly from zero to the full input' : 'A potential divider: two resistors in series across a battery share its potential difference. The output is taken across the lower resistor' + (kind === 'thermistor' ? '; the upper resistor is a thermistor' : kind === 'ldr' ? '; the upper resistor is a light-dependent resistor' : ''));
    },

    // Where the meters go: an ammeter in series, a voltmeter in parallel.
    'b5-meters': () => {
      const L = 150, R = 690, T = 130, B = 400;
      let s = branch(L, B, L, T, [{ kind: 'cell', at: 0.5, flip: true }]) + branch(L, T, R, T, [{ kind: 'ammeter', at: 0.5, label: 'in series', gap: 60 }]) + branch(R, T, R, B, []) + branch(R, B, L, B, [{ kind: 'resistor', at: 0.5 }]);
      s += `<path d="M300,${B} V${B - 100} M540,${B} V${B - 100}" style="${INK}"/>` + branch(300, B - 100, 540, B - 100, [{ kind: 'voltmeter', at: 0.5, label: 'in parallel', gap: 60 }]) + node(300, B) + node(540, B);
      return svg('90 40 660 410', s, 'A circuit with a cell and a resistor. The ammeter is connected in series with the resistor, so the current passes through it. The voltmeter is connected in parallel, across the resistor');
    },

    // A real cell: an emf with an internal resistance, joined to a load. Also drawn plain.
    'b5-internal': el => {
      const on = labelled(el), L = 200, R = 660, T = 130, B = 400;
      let s = `<rect x="${L - 90}" y="${T + 10}" width="180" height="${B - T - 20}" rx="16" style="fill:color-mix(in srgb, var(--brand-accent) 14%, transparent);stroke:var(--brand-accent);stroke-width:3;stroke-dasharray:12 8"/>`;
      s += branch(L, B, L, T, [{ kind: 'cell', at: 0.28, flip: true, label: 'ε', side: 1, gap: 60 }, { kind: 'resistor', at: 0.7, label: 'r', side: 1, gap: 44 }], on) + branch(L, T, R, T, [], on) + branch(R, T, R, B, [{ kind: 'resistor', at: 0.5, label: 'R', side: -1, gap: 52 }], on) + branch(R, B, L, B, [], on);
      if (on) s += flow(430, T, 0, 'I', 0, -26) + pd(R - 110, T + 20, R - 110, B - 20, 'V = IR', R - 128, 276, 'end') + text(430, 470, 'the terminal p.d. V is less than ε when a current flows', 'lbl');
      return svg(on ? '60 60 760 430' : '90 90 640 340', s, 'A real cell drawn as an ideal cell of emf epsilon in series with an internal resistance r, inside a dashed box. It drives a current I through an external resistor R. The potential difference across R, the terminal potential difference, is less than the emf');
    },

    // Terminal p.d. against current for a cell: the intercept is the emf and the gradient is minus r.
    'b5-cell-graph': () => {
      let s = axes(130, 420, 800, 50, 'current I', 'terminal p.d. V') + line('M130,120 L700,360', 'brand-primary', 6) + [200, 330, 460, 590].map(x => `<circle cx="${x}" cy="${f(120 + (x - 130) * 240 / 570)}" r="8" style="fill:var(--brand-primary)"/>`).join('');
      s += `<circle cx="130" cy="120" r="9" style="fill:var(--proton)"/>` + text(150, 108, 'intercept = ε', 'lbl strong halo', 'start') + text(480, 220, 'gradient = −r', 'lbl strong halo', 'start') + `<path d="M700,360 L842,420" class="guide accent"/>`;
      return svg('60 30 780 440', s, 'A graph of the terminal potential difference of a cell against the current it supplies: a straight line sloping downwards. Its intercept on the potential difference axis is the emf, and its gradient is minus the internal resistance');
    },

    // How the resistance of a thermistor and of an LDR changes.
    'b5-sensor-curves': () => {
      const one = (x0, xl, name, kind) => axes(x0, 400, x0 + 330, 90, xl, 'R') + line(sampled(t => [x0 + 14 + 300 * t, 380 - 270 * Math.exp(-3.4 * t)], 50), 'brand-primary', 6) + branch(x0 + 90, 50, x0 + 250, 50, [{ kind, at: 0.5 }]) + text(x0 + 170, 480, name, 'lbl strong');
      return svg('40 0 880 500', one(90, 'temperature', 'thermistor (NTC)', 'thermistor') + one(540, 'light intensity', 'LDR', 'ldr'), 'Two graphs. The resistance of a thermistor falls steeply, then more gently, as its temperature rises. The resistance of a light-dependent resistor falls in the same way as the light falling on it gets brighter');
    }
  };
});
