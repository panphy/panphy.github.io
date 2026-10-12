// SVG diagrams for the IB DP Physics decks (E.1 Structure of the atom and
// E.2 Quantum physics). The atom figures began as copies of those in
// gcsephy/decks/atoms-and-radiation and use the same particle colours and
// glossy-sphere look as the Atomic Models and Nuclear Decay simulations.
// Each <div data-fig="name"> is filled from FIGURES.
(() => {
  const SYMBOL = { proton: '+', neutron: '0', electron: '−', alpha: 'α', positive: '+', solid: '' };
  const GRADIENTS = ['proton', 'neutron', 'electron', 'alpha', 'positive', 'solid'];
  const MARKERS = ['text-secondary', 'alpha', 'electron', 'photon', 'brand-accent', 'brand-primary'];
  const TAU = Math.PI * 2;
  const f = n => Math.round(n * 10) / 10;

  function sharedDefs() {
    const stops = key => `<stop offset="0" style="stop-color:color-mix(in srgb, var(--${key}) 42%, #fff)"/><stop offset=".55" style="stop-color:var(--${key})"/><stop offset="1" style="stop-color:color-mix(in srgb, var(--${key}) 70%, #000)"/>`;
    const grads = GRADIENTS.map(key => `<radialGradient id="g-${key}" cx="38%" cy="32%" r="72%">${stops(key)}</radialGradient>`).join('');
    const markers = MARKERS.map(key => `<marker id="m-${key}" viewBox="0 0 10 10" refX="7" refY="5" markerUnits="userSpaceOnUse" markerWidth="16" markerHeight="16" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" style="fill:var(--${key})"/></marker>`).join('');
    return `<svg class="svg-defs" aria-hidden="true" focusable="false"><defs>${grads}${markers}
      <radialGradient id="g-glow"><stop offset="0" style="stop-color:var(--photon);stop-opacity:.45"/><stop offset="1" style="stop-color:var(--photon);stop-opacity:0"/></radialGradient>
      <radialGradient id="g-pudding" cx="42%" cy="38%" r="70%"><stop offset="0" style="stop-color:var(--positive);stop-opacity:.22"/><stop offset="1" style="stop-color:var(--positive);stop-opacity:.42"/></radialGradient>
      <linearGradient id="g-spectrum">${SPECTRUM.map(([nm, colour]) => `<stop offset="${f((nm - 380) / 3.7)}%" stop-color="${colour}"/>`).join('')}</linearGradient>
      <radialGradient id="g-shadow"><stop offset="0" style="stop-color:#000;stop-opacity:.16"/><stop offset="1" style="stop-color:#000;stop-opacity:0"/></radialGradient>
    </defs></svg>`;
  }

  // Visible spectrum, 380 to 750 nm, for the spectrum strips.
  const SPECTRUM = [[380, '#1B0030'], [400, '#5A00B5'], [420, '#6A00FF'], [450, '#0033FF'], [480, '#00A2FF'], [500, '#00E08A'], [530, '#4DFF00'], [560, '#B6FF00'], [580, '#FFE600'], [600, '#FFA200'], [620, '#FF5A00'], [650, '#FF0000'], [700, '#B00000'], [750, '#3A0000']];
  function spectrumColour(nm) {
    const i = Math.max(1, SPECTRUM.findIndex(([stop]) => stop >= nm));
    const [n1, c1] = SPECTRUM[i - 1], [n2, c2] = SPECTRUM[i], t = (nm - n1) / (n2 - n1);
    const mix = k => Math.round(parseInt(c1.slice(k, k + 2), 16) * (1 - t) + parseInt(c2.slice(k, k + 2), 16) * t).toString(16).padStart(2, '0');
    return `#${mix(1)}${mix(3)}${mix(5)}`;
  }
  // Wavelengths in nm of the strong visible lines.
  const LINES = { H: [410.2, 434.0, 486.1, 656.3], He: [447.1, 471.3, 492.2, 501.6, 587.6, 667.8], Na: [589.0, 589.6] };
  const SPECTRA = {
    continuous: { label: 'CONTINUOUS SPECTRUM · hot, dense source' },
    'h-emit': { label: 'EMISSION SPECTRUM · hot hydrogen gas', dark: true, lines: LINES.H, name: true },
    'h-absorb': { label: 'ABSORPTION SPECTRUM · white light through cool hydrogen', lines: LINES.H },
    'he-emit': { label: 'HELIUM · emission', dark: true, lines: LINES.He },
    'na-emit': { label: 'SODIUM · emission', dark: true, lines: LINES.Na },
    star: { label: 'LIGHT FROM A STAR · absorption', lines: [...LINES.H, ...LINES.Na] }
  };
  // Hydrogen energy levels in eV, and where the level diagram draws them (not to scale).
  const H_LEVEL = n => n === 'inf' || n === Infinity ? 0 : -13.6 / (n * n);
  const LEVELS = { 1: { y: 470, eV: '−13.6' }, 2: { y: 300, eV: '−3.40' }, 3: { y: 215, eV: '−1.51' }, 4: { y: 165, eV: '−0.85' }, inf: { y: 100, eV: '0' } };

  const svg = (viewBox, body, label) => `<svg viewBox="${viewBox}" role="img" aria-label="${label}">${body}</svg>`;

  function ball(x, y, r, kind, sym = SYMBOL[kind] ?? '') {
    const text = sym && r >= 7 ? `<text x="${f(x)}" y="${f(y)}" class="sym" font-size="${f(r * 1.15)}">${sym}</text>` : '';
    return `<g><circle cx="${f(x)}" cy="${f(y)}" r="${r}" fill="url(#g-${kind})"/>${text}</g>`;
  }

  // Nucleons packed like the sims: random points in 3D relaxed until the
  // spheres just touch, turned to a random angle, then drawn back to front.
  function packNucleus(count, rand) {
    const points = count > 40 ? latticeBall(count, rand) : relaxedBall(count, rand);
    const centre = [0, 1, 2].map(k => points.reduce((sum, point) => sum + point[k], 0) / count);
    const turn = (a, b) => points.map(point => {
      let [x, y, z] = point.map((v, k) => v - centre[k]);
      [x, z] = [x * Math.cos(a) + z * Math.sin(a), -x * Math.sin(a) + z * Math.cos(a)];
      [y, z] = [y * Math.cos(b) - z * Math.sin(b), y * Math.sin(b) + z * Math.cos(b)];
      return [x, y, z];
    });
    if (count > 7) return turn(rand() * TAU, rand() * TAU);
    // Tiny clusters (alpha, lithium): choose a view where no nucleon hides behind another.
    let best = null, bestGap = -1;
    for (let t = 0; t < 40; t++) {
      const view = turn(rand() * TAU, rand() * TAU);
      let gap = Infinity;
      for (let i = 0; i < count; i++) for (let j = i + 1; j < count; j++) gap = Math.min(gap, Math.hypot(view[i][0] - view[j][0], view[i][1] - view[j][1]));
      if (gap > bestGap) { bestGap = gap; best = view; }
    }
    return best;
  }

  // Heavy nuclei (hundreds of nucleons) are too slow to relax from scratch, so
  // start from a close packing, shake it so no rows show, then push apart.
  function latticeBall(count, rand) {
    const n = Math.ceil(Math.cbrt(count)) + 2, grid = [];
    for (let i = -n; i <= n; i++) for (let j = -n; j <= n; j++) for (let k = -n; k <= n; k++) {
      if ((i + j + k) % 2 === 0) grid.push([i, j, k].map(v => v * Math.SQRT2 * 1.04));
    }
    const points = grid.sort((p, q) => Math.hypot(...p) - Math.hypot(...q)).slice(0, count)
      .map(point => point.map(v => v + (rand() - 0.5) * 0.9));
    for (let step = 0; step < 24; step++) {
      for (let i = 0; i < count; i++) {
        const p = points[i];
        for (let j = i + 1; j < count; j++) {
          const q = points[j], dx = q[0] - p[0], dy = q[1] - p[1], dz = q[2] - p[2];
          const d2 = dx * dx + dy * dy + dz * dz;
          if (d2 >= 4) continue;
          const len = Math.sqrt(d2) || 1e-6, push = ((2 - len) / 2 + 1e-4) / len;
          q[0] += dx * push; q[1] += dy * push; q[2] += dz * push;
          p[0] -= dx * push; p[1] -= dy * push; p[2] -= dz * push;
        }
      }
    }
    return points;
  }

  function relaxedBall(count, rand) {
    const points = Array.from({ length: count }, () => {
      const z = rand() * 2 - 1, phi = rand() * TAU, s = Math.sqrt(1 - z * z), m = 2.4 * Math.cbrt(rand());
      return [s * Math.cos(phi) * m, s * Math.sin(phi) * m, z * m];
    });
    for (let step = 0; step < 300; step++) {
      for (let i = 0; i < count; i++) {
        for (let j = i + 1; j < count; j++) {
          const g = [0, 1, 2].map(k => points[j][k] - points[i][k]);
          const len = Math.hypot(...g) || 1e-6;
          const overlap = 2 - len;
          if (overlap > 0) {
            const push = (overlap / 2 + 1e-4) / len;
            for (let k = 0; k < 3; k++) { points[j][k] += g[k] * push; points[i][k] -= g[k] * push; }
          }
        }
      }
      points.forEach(point => { for (let k = 0; k < 3; k++) point[k] *= 0.985; });
    }
    return points;
  }

  // Spread protons evenly from front to back so the visible face shows a fair mix.
  function depthMixedKinds(order, protons, neutrons, rand) {
    const kinds = [];
    let placed = 0;
    order.forEach((index, k) => {
      const target = (k + 0.3 + rand() * 0.4) * protons / (protons + neutrons);
      const isProton = placed < protons && (target >= placed + 0.5 || order.length - k === protons - placed);
      if (isProton) placed++;
      kinds[index] = isProton ? 'proton' : 'neutron';
    });
    return kinds;
  }

  // base: [protons, neutrons] of a parent nucleus to reuse, so a beta daughter
  // keeps the parent's arrangement with front neutrons turned into protons.
  function cluster(cx, cy, protons, neutrons, r, { base = [protons, neutrons], highlight = false } = {}) {
    const count = base[0] + base[1];
    const rand = seeded(base[0] * 131 + base[1] * 17 + 5);
    const points = packNucleus(count, rand);
    const order = points.map((point, i) => i).sort((i, j) => points[i][2] - points[j][2]);
    const kinds = depthMixedKinds([...order].reverse(), base[0], base[1], rand);
    const changed = new Set();
    for (let k = order.length - 1; k >= 0 && changed.size < protons - base[0]; k--) {
      if (kinds[order[k]] === 'neutron') { kinds[order[k]] = 'proton'; changed.add(order[k]); }
    }
    const depth = 16;
    const back = Math.min(...points.map(point => point[2])) || -1;
    return order.map(i => {
      const [x, y, z] = points[i];
      const scale = depth / (depth - z);
      const px = cx + x * r * scale, py = cy + y * r * scale, pr = f(r * scale);
      const ring = highlight && changed.has(i) ? `<circle cx="${f(px)}" cy="${f(py)}" r="${f(pr + 4)}" class="changed"/>` : '';
      const shade = z < 0 ? `<circle cx="${f(px)}" cy="${f(py)}" r="${pr}" class="depth" style="opacity:${f(0.28 * z / back * 100) / 100}"/>` : '';
      return ball(px, py, pr, kinds[i]) + shade + ring;
    }).join('');
  }

  const shadow = (x, y, rx) => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${f(rx * 0.16)}" fill="url(#g-shadow)"/>`;

  function arrow(x1, y1, x2, y2, color = 'text-secondary', width = 3, extra = '') {
    return `<line x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}" style="stroke:var(--${color})" stroke-width="${width}" stroke-linecap="round" marker-end="url(#m-${color})" ${extra}/>`;
  }

  function wave(x1, y1, x2, y2, { amp = 9, cycles = 4, color = 'photon', head = true, opacity = 1 } = {}) {
    const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy);
    const ux = dx / len, uy = dy / len, nx = -uy, ny = ux;
    const body = len - (head ? 14 : 0);
    const steps = cycles * 18;
    let d = '';
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const s = Math.sin(t * cycles * TAU) * amp;
      d += `${i ? 'L' : 'M'}${f(x1 + ux * body * t + nx * s)},${f(y1 + uy * body * t + ny * s)}`;
    }
    if (head) d += `L${f(x2)},${f(y2)}`;
    return `<path d="${d}" class="wave" style="stroke:var(--${color});opacity:${opacity}" ${head ? `marker-end="url(#m-${color})"` : ''}/>`;
  }

  const text = (x, y, content, cls = 'lbl', anchor = 'middle', extra = '') => `<text x="${x}" y="${y}" class="${cls}" text-anchor="${anchor}" ${extra}>${content}</text>`;

  // An electron that the deck script moves around an (optionally tilted) ellipse.
  function orbitPoint(cx, cy, rx, ry, phase, tilt) {
    const a = tilt * Math.PI / 180, x = rx * Math.cos(phase), y = ry * Math.sin(phase);
    return [cx + x * Math.cos(a) - y * Math.sin(a), cy + x * Math.sin(a) + y * Math.cos(a)];
  }

  function orbiter(cx, cy, rx, ry, phase, period, tilt = 0, r = 12, kind = 'electron') {
    const [x, y] = orbitPoint(cx, cy, rx, ry, phase, tilt);
    return `<g data-orbit="${cx},${cy},${rx},${ry},${phase},${period},${tilt}" transform="translate(${f(x)} ${f(y)})">${ball(0, 0, r, kind)}</g>`;
  }

  const ring = (cx, cy, r, extra = '') => `<circle cx="${cx}" cy="${cy}" r="${r}" class="orbit" ${extra}/>`;
  const ellipse = (cx, cy, rx, ry, tilt) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" class="orbit" transform="rotate(${tilt} ${cx} ${cy})"/>`;

  // Seeded random numbers so the "random" decay grids look the same every time.
  function seeded(seed) {
    return () => {
      seed |= 0; seed = seed + 0x6D2B79F5 | 0;
      let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  // Click-through builds for the deck: a figure's div opts in with data-animate.
  // Without it the markup is the finished diagram, which the workbooks print.
  const animated = el => 'animate' in el.dataset;
  const stepG = (on, k, body, cls = '') => on ? `<g class="step k${k}${cls && ' ' + cls}">${body}</g>` : body;
  // Starts (dx, dy) away from where it is drawn, then travels there when its step shows.
  const fly = (on, dx, dy, body) => on ? `<g class="fly" style="--fx:${f(dx)}px;--fy:${f(dy)}px">${body}</g>` : body;

  function bohrAtom(cx, cy, labels) {
    let s = shadow(cx, cy + 250, 170);
    s += ring(cx, cy, 120) + ring(cx, cy, 225);
    if (labels) s += text(cx + 128, cy - 96, 'n = 1', 'lbl mono', 'start') + text(cx + 190, cy - 170, 'n = 2', 'lbl mono', 'start');
    s += cluster(cx, cy, 6, 6, 22);
    [0, Math.PI].forEach(p => { s += orbiter(cx, cy, 120, 120, p, 9); });
    [0.25, 0.75, 1.25, 1.75].forEach(p => { s += orbiter(cx, cy, 225, 225, p * Math.PI, 18); });
    return s;
  }

  function plumPudding(cx, cy, r, er, plusSize) {
    let s = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#g-pudding)" style="stroke:var(--positive);stroke-opacity:.55" stroke-width="2"/>`;
    const step = r / 3.2;
    for (let y = -r; y <= r; y += step) {
      for (let x = -r; x <= r; x += step) {
        const ox = x + ((Math.round(y / step) % 2) ? step / 2 : 0);
        if (Math.hypot(ox, y) < r * 0.86) s += text(f(cx + ox), f(cy + y), '+', 'plus', 'middle', `font-size="${plusSize}"`);
      }
    }
    [[-0.38, -0.42], [0.36, -0.46], [-0.58, 0.14], [0.05, -0.02], [0.52, 0.26], [-0.12, 0.55]].forEach(([x, y]) => {
      s += ball(cx + x * r, cy + y * r, er, 'electron');
    });
    return s;
  }

  function nuclearAtom(cx, cy, rx, ry, nr, er, animate) {
    let s = [0, 60, -60].map(t => ellipse(cx, cy, rx, ry, t)).join('');
    s += ball(cx, cy, nr, 'positive');
    [0, 60, -60].forEach((tilt, i) => {
      [0, 1].forEach(p => {
        // Start at the orbit ends, evenly spaced so none look paired (and stay so with reduced motion).
        const phase = p * Math.PI;
        // A negative period runs the middle orbit the other way: Rutherford gave no direction.
        if (animate) s += orbiter(cx, cy, rx, ry, phase, (i === 1 ? -1 : 1) * (7 + i * 1.5), tilt, er);
        else s += ball(...orbitPoint(cx, cy, rx, ry, phase, tilt), er, 'electron');
      });
    });
    return s;
  }

  const FIGURES = {
    hero: () => svg('0 0 560 560', bohrAtom(280, 270, false), 'Carbon atom: a nucleus of protons and neutrons with electrons in two energy levels'),

    ball: el => svg('0 0 60 60', ball(30, 30, 24, el.dataset.kind), el.dataset.kind),

    scale: () => {
      let s = `<circle cx="250" cy="230" r="200" style="fill:color-mix(in srgb, var(--electron) 7%, transparent);stroke:var(--electron);stroke-opacity:.45" stroke-width="2" stroke-dasharray="6 6"/>`;
      s += ellipse(250, 230, 160, 60, 25) + ellipse(250, 230, 160, 60, -35);
      s += orbiter(250, 230, 160, 60, 0.4, 10, 25, 11) + orbiter(250, 230, 160, 60, 2.6, 12, -35, 11) + orbiter(250, 230, 160, 60, 4.2, 11, 25, 11);
      s += `<line x1="250" y1="230" x2="545" y2="80" class="guide"/><line x1="250" y1="230" x2="560" y2="178" class="guide"/>`;
      s += ball(250, 230, 5, 'proton');
      s += arrow(262, 300, 440, 300, 'text-secondary', 2.5) + `<line x1="250" y1="290" x2="250" y2="310" class="tick"/>`;
      s += text(345, 288, 'radius ≈ 1 × 10⁻¹⁰ m', 'lbl mono halo');
      s += text(250, 372, 'mostly empty space', 'lbl italic halo');
      s += `<circle cx="645" cy="130" r="100" class="inset"/>` + cluster(645, 130, 3, 4, 24);
      s += text(645, 262, 'the nucleus', 'lbl strong') + text(645, 288, 'radius ≈ 10⁻¹⁵ m', 'lbl mono') + text(645, 310, '10⁵ times smaller', 'lbl mono');
      return svg('0 0 760 460', s, 'An atom of radius about 1 times 10 to the minus 10 metres, with a nucleus about 100 000 times smaller at the centre');
    },

    notation: () => {
      let s = text(372, 262, 'C', 'big-symbol', 'start');
      s += text(356, 162, '12', 'big-num a', 'end') + text(356, 262, '6', 'big-num z', 'end');
      s += text(30, 60, 'NUCLEON NUMBER A', 'lbl mono strong a', 'start') + text(30, 86, 'protons + neutrons', 'lbl', 'start');
      s += arrow(190, 96, 250, 128, 'brand-primary', 2.5);
      s += text(30, 322, 'PROTON NUMBER Z', 'lbl mono strong z', 'start') + text(30, 348, 'number of protons', 'lbl', 'start');
      s += arrow(200, 320, 262, 272, 'brand-accent', 2.5);
      s += text(560, 176, 'carbon-12', 'lbl display', 'start') + text(560, 210, '6 p, 6 n, 6 e', 'lbl mono', 'start');
      return svg('0 0 760 380', s, 'Nuclear notation for carbon-12: nucleon number 12 at the top left, proton number 6 at the bottom left');
    },

    'mini-solid': () => svg('0 0 160 160', shadow(80, 146, 50) + ball(80, 80, 54, 'solid'), 'A solid sphere'),
    'mini-plum': () => svg('0 0 160 160', plumPudding(80, 80, 64, 9, 16), 'Plum pudding model'),
    'mini-nuclear': () => svg('0 0 160 160', nuclearAtom(80, 80, 70, 24, 10, 6, false), 'Nuclear model'),
    'mini-bohr': () => {
      let s = ring(80, 80, 40) + ring(80, 80, 70) + cluster(80, 80, 6, 6, 11);
      [0, Math.PI].forEach(p => { s += ball(80 + 40 * Math.cos(p + 0.6), 80 + 40 * Math.sin(p + 0.6), 7, 'electron'); });
      [0.25, 0.75, 1.25, 1.75].forEach(p => { s += ball(80 + 70 * Math.cos(p * Math.PI), 80 + 70 * Math.sin(p * Math.PI), 7, 'electron'); });
      return svg('0 0 160 160', s, 'Bohr model');
    },
    'mini-neutron': () => svg('0 0 160 160', cluster(80, 80, 6, 6, 21), 'Protons and neutrons in the nucleus'),

    plum: () => svg('0 0 500 500', shadow(250, 470, 180) + plumPudding(250, 245, 200, 20, 30), 'Plum pudding model: electrons embedded in a sphere of spread-out positive charge'),

    scatter: () => {
      const goldArc = 'M' + [170, -170].map(deg => {
        const a = deg * Math.PI / 180;
        return `${f(520 + 200 * Math.cos(a))},${f(230 + 200 * Math.sin(a))}`;
      }).join(' A200,200 0 1 0 ');
      let s = `<path d="${goldArc}" class="detector"/>`;
      s += text(700, 440, 'detector moves around the foil', 'lbl', 'middle');
      s += `<rect x="30" y="185" width="110" height="90" rx="10" style="fill:var(--lead)"/>` + ball(130, 230, 9, 'alpha');
      s += text(85, 170, 'alpha source', 'lbl strong');
      const paths = [
        ['M140,214 L720,214', 'straight'], ['M140,246 L720,246', 'straight'], ['M140,222 L720,222', 'straight'], ['M140,238 L720,238', 'straight'],
        ['M140,226 L520,226 L712,170', 'deflect'], ['M140,234 L520,234 L706,306', 'deflect'], ['M140,230 L520,230 L338,148', 'bounce']
      ];
      s += '<g class="scatter-static">';
      paths.forEach(([d, kind]) => {
        s += `<path d="${d}" class="alpha-path ${kind}" marker-end="url(#m-alpha)"/>`;
      });
      s += text(330, 132, 'bounce back', 'lbl', 'middle', 'style="fill:var(--alpha)"');
      s += text(760, 164, 'small', 'lbl', 'start', 'style="fill:var(--alpha)"') + text(760, 186, 'deflection', 'lbl', 'start', 'style="fill:var(--alpha)"');
      s += '</g><g class="scatter-live"></g>';
      s += `<rect x="516" y="96" width="8" height="268" rx="3" style="fill:var(--gold)"/>` + text(520, 84, 'thin gold foil', 'lbl strong');
      s += text(760, 236, 'straight', 'lbl', 'start', 'style="fill:var(--alpha)"') + text(760, 258, 'through', 'lbl', 'start', 'style="fill:var(--alpha)"');
      return svg('0 0 900 460', s, 'Alpha scattering: alpha particles fired at thin gold foil. Most pass straight through, some are deflected, a very few bounce back');
    },

    'scatter-zoom': el => {
      const on = animated(el);
      let s = ball(350, 230, 42, 'positive') + text(350, 318, 'gold nucleus (+)', 'lbl strong');
      const paths = [
        ['M20,410 L600,410', 'far away: straight on', 600, 396, 'end'],
        ['M20,168 L220,168 C300,168 330,146 380,104 L470,32', 'close: repelled, deflected', 462, 22, 'end'],
        // A still picture needs the return leg drawn to one side; on the live slide the
        // alpha particle slows, stops and goes straight back along the line it came in on.
        [on ? 'M20,230 L292,230 L40,230' : 'M20,236 L278,236 Q306,229 278,222 L40,190', 'head-on: bounces back', 20, 272, 'start']
      ];
      // The head-on particle fades out on its way back and the track stays empty for a moment,
      // so the next one coming in does not look like the same particle bouncing off the left edge.
      const slowTurn = 'calcMode="spline" keyPoints="0;0.52;1;1" keyTimes="0;0.375;0.75;1" keySplines="0 0 .4 1;.6 0 1 1;0 0 1 1"';
      const fadeOut = begin => `<animate attributeName="opacity" dur="4s" begin="${begin}" repeatCount="indefinite" values="0;1;1;0;0" keyTimes="0;0.05;0.7;0.75;1"/>`;
      paths.forEach(([d, label, x, y, anchor], i) => {
        // Head-on, live: the particle runs straight in and back, inside a thin U-shaped arrow.
        const drawn = on && i === 2 ? 'M20,236 H286 A6,6 0 0 0 286,224 H40' : d;
        let track = `<path d="${drawn}" class="alpha-path" marker-end="url(#m-alpha)"/>`;
        const headOn = on && i === 2;
        const begin = `-${i * 0.9}s`;
        track += `<g class="mover"><circle r="10" fill="url(#g-alpha)"/><animateMotion dur="${headOn ? 4 : 3}s" begin="${begin}" repeatCount="indefinite" path="${d}"${headOn ? ' ' + slowTurn : ''}/>${headOn ? fadeOut(begin) : ''}</g>`;
        track += text(x, y, label, 'lbl', anchor, 'style="fill:var(--alpha)"');
        // In the deck each track appears with its row of the observation table.
        s += on ? `<g class="with-row with-row-${i}">${track}</g>` : track;
      });
      return svg('0 0 640 460', s, 'Close-up: alpha particles far from a nucleus pass straight through; close ones are repelled; a head-on one bounces back');
    },

    rutherford: () => svg('0 0 540 500', shadow(270, 470, 170) + nuclearAtom(270, 245, 220, 80, 24, 13, true), 'Nuclear model: a tiny positive nucleus with electrons outside it'),

    bohr: () => svg('0 0 560 560', bohrAtom(280, 270, true), 'Bohr model of carbon: 2 electrons in energy level n = 1 and 4 in n = 2'),

    levels: el => {
      const on = animated(el);
      let s = '';
      [[240, true], [720, false]].forEach(([cx, absorb]) => {
        const cy = 215, a = -0.75;
        const p1 = [cx + 75 * Math.cos(a), cy + 75 * Math.sin(a)], p2 = [cx + 150 * Math.cos(a), cy + 150 * Math.sin(a)];
        s += ring(cx, cy, 75) + ring(cx, cy, 150) + ball(cx, cy, 16, 'proton');
        s += text(cx - 75, cy + 5, 'n=1', 'lbl mono small', 'middle') + text(cx - 150, cy + 5, 'n=2', 'lbl mono small', 'middle');
        const [from, to] = absorb ? [p1, p2] : [p2, p1];
        const ghost = `<circle cx="${f(from[0])}" cy="${f(from[1])}" r="12" class="ghost"/>`;
        const electron = ball(to[0], to[1], 12, 'electron');
        const k = absorb ? 1 : -1;
        const jump = arrow(from[0] + 13 * k * Math.cos(a), from[1] + 13 * k * Math.sin(a), to[0] - 16 * k * Math.cos(a), to[1] - 16 * k * Math.sin(a), 'brand-accent', 3);
        // Leave to the lower right so the wave stays clear of the electron's path inward.
        const radiation = absorb ? wave(cx - 200, cy - 170, p1[0] - 16, p1[1] - 10, { cycles: 5 }) : wave(p1[0] + 15, p1[1] + 7, cx + 225, cy + 30, { cycles: 5 });
        const title = text(cx, 38, absorb ? 'ABSORBS A PHOTON' : 'EMITS A PHOTON', 'lbl mono strong a');
        const result = text(cx, 402, absorb ? 'up to a higher level' : 'down to a lower level', 'lbl display') + text(cx, 432, 'photon energy = E₂ − E₁', 'lbl mono');
        if (!on) { s += ghost + electron + jump + radiation + title + result; return; }
        // Deck build: radiation arrives, the electron jumps out; then an electron drops back and emits.
        const hop = `<g class="hop until-k${absorb ? 2 : 3}" style="--fx:${f(from[0] - to[0])}px;--fy:${f(from[1] - to[1])}px">${electron}</g>`;
        s += title;
        if (absorb) s += stepG(on, 1, radiation, 'wipe spent-k2') + stepG(on, 2, ghost + jump + result) + hop;
        else s += stepG(on, 3, ghost + jump + result + `<g class="wipe late">${radiation}</g>`) + hop;
      });
      return svg('0 0 960 450', s, 'Hydrogen atom: an electron absorbs a photon and moves to a higher energy level; it emits a photon when it moves to a lower level');
    },

    'carbon-nucleus': () => svg('0 0 460 420', shadow(230, 392, 150) + cluster(230, 200, 6, 6, 44), 'Carbon-12 nucleus: 6 protons and 6 neutrons'),

    cycle: () => {
      const nodes = [[310, 60, 'Model'], [520, 230, 'Prediction'], [310, 400, 'Experiment'], [100, 230, 'New evidence']];
      let s = '';
      const r = 175, cx = 310, cy = 230;
      [[-70, -20], [20, 70], [110, 160], [200, 250]].forEach(([a1, a2]) => {
        const p = d => [cx + r * Math.cos(d * Math.PI / 180), cy + r * Math.sin(d * Math.PI / 180)];
        const [x1, y1] = p(a1), [x2, y2] = p(a2);
        s += `<path d="M${f(x1)},${f(y1)} A${r},${r} 0 0 1 ${f(x2)},${f(y2)}" class="flow" marker-end="url(#m-brand-accent)"/>`;
      });
      nodes.forEach(([x, y, label], i) => {
        s += `<rect x="${x - 90}" y="${y - 28}" width="180" height="56" rx="16" class="node ${i === 3 ? 'hot' : ''}"/>`;
        s += text(x, y + 7, label, 'lbl strong node-text');
      });
      s += text(310, 222, 'model kept', 'lbl mono') + text(310, 248, 'or changed', 'lbl mono');
      return svg('0 0 620 460', s, 'Cycle: model, prediction, experiment, new evidence, back to the model');
    },

    // ---- E.1: energy levels and spectra ----

    // data-arrows lists transitions as "from-to" (3-2 emits, 1-3 absorbs); data-values="off" hides the energies.
    'level-diagram': el => {
      const arrows = (el.dataset.arrows || '').split(',').filter(Boolean).map(pair => pair.split('-').map(Number));
      const values = el.dataset.values !== 'off';
      let s = arrow(36, 480, 36, 70, 'text-secondary', 2.5) + text(22, 280, 'energy', 'lbl mono', 'middle', 'transform="rotate(-90 22 280)"');
      Object.entries(LEVELS).forEach(([n, level]) => {
        const free = n === 'inf';
        s += `<line x1="150" y1="${level.y}" x2="520" y2="${level.y}" class="${free ? 'guide' : 'level'}"/>`;
        s += text(132, level.y + 8, free ? 'n = ∞' : `n = ${n}`, 'lbl mono', 'end');
        if (values) s += text(540, level.y + 8, `${level.eV} eV`, 'lbl mono strong', 'start');
      });
      s += text(335, 86, 'electron free of the atom', 'lbl italic small');
      s += text(335, 500, 'ground state', 'lbl italic small');
      arrows.forEach(([from, to], i) => {
        const x = 200 + i * (280 / Math.max(arrows.length - 1, 1)) * (arrows.length > 1 ? 1 : 0.5);
        const up = LEVELS[to].y < LEVELS[from].y;
        s += arrow(x, LEVELS[from].y + (up ? -4 : 4), x, LEVELS[to].y + (up ? 14 : -14), up ? 'photon' : 'brand-accent', 4);
        const gap = Math.abs(H_LEVEL(from) - H_LEVEL(to));
        if (values) s += text(x + 12, Math.max(LEVELS[from].y, LEVELS[to].y) - 30, `${gap.toFixed(gap < 10 ? 2 : 1)} eV`, 'lbl mono small halo', 'start');
      });
      return svg('0 0 700 520', s, 'Energy level diagram for hydrogen: n = 1 at minus 13.6 electronvolts, n = 2 at minus 3.40, n = 3 at minus 1.51, n = 4 at minus 0.85, and zero for a free electron');
    },

    // data-rows: names from SPECTRA, top to bottom.
    spectra: el => {
      const rows = (el.dataset.rows || 'continuous').split(',');
      const x0 = 60, width = 840, stripH = 64;
      const xAt = nm => x0 + (nm - 380) / 370 * width;
      let s = '', y = 44;
      rows.forEach(name => {
        const row = SPECTRA[name];
        s += text(x0, y - 12, row.label, 'lbl mono strong', 'start');
        s += `<rect x="${x0}" y="${y}" width="${width}" height="${stripH}" rx="8" style="fill:${row.dark ? 'var(--spectrum-bg)' : 'url(#g-spectrum)'}"/>`;
        (row.lines || []).forEach(nm => {
          s += `<rect x="${f(xAt(nm) - 2.5)}" y="${y}" width="5" height="${stripH}" style="fill:${row.dark ? spectrumColour(nm) : 'var(--spectrum-bg)'}"/>`;
          if (row.name) s += text(f(xAt(nm)), y + stripH + 24, String(Math.round(nm)), 'lbl mono small');
        });
        // Rows that name their wavelengths need room for the numbers underneath.
        y += stripH + (row.name ? 76 : 50);
      });
      const base = y - 30;
      [400, 500, 600, 700].forEach(nm => {
        s += `<line x1="${f(xAt(nm))}" y1="${base}" x2="${f(xAt(nm))}" y2="${base + 10}" class="tick"/>` + text(f(xAt(nm)), base + 36, `${nm} nm`, 'lbl mono small');
      });
      s += `<line x1="${x0}" y1="${base}" x2="${x0 + width}" y2="${base}" class="tick"/>`;
      return svg(`0 0 960 ${base + 50}`, s, rows.map(name => SPECTRA[name].label).join('; '));
    },

    // ---- E.1 additional higher level ----

    'nuclei-sizes': () => {
      const data = [[105, 2, 2, 'helium-4', '1.90'], [285, 6, 6, 'carbon-12', '2.75'], [510, 26, 30, 'iron-56', '4.59'], [790, 79, 118, 'gold-197', '6.98']];
      let s = '';
      data.forEach(([x, p, n, name, radius]) => {
        s += cluster(x, 170, p, n, 12);
        s += text(x, 330, name, 'lbl display') + text(x, 364, `R = ${radius} fm`, 'lbl mono');
      });
      return svg('0 0 960 390', s, 'Nuclei of helium-4, carbon-12, iron-56 and gold-197 drawn to the same scale: radii 1.90, 2.75, 4.59 and 6.98 femtometres');
    },

    'closest-approach': () => {
      let s = `<line x1="70" y1="210" x2="760" y2="210" class="guide"/>`;
      s += ball(740, 210, 46, 'positive') + text(740, 118, 'gold nucleus', 'lbl strong') + text(740, 146, 'charge +79e', 'lbl mono small');
      s += ball(90, 210, 16, 'alpha') + arrow(116, 210, 230, 210, 'alpha', 4);
      s += text(150, 118, 'far away', 'lbl strong') + text(150, 146, 'all kinetic energy', 'lbl mono small') + text(90, 262, 'alpha, +2e', 'lbl mono small');
      s += `<circle cx="430" cy="210" r="22" class="ghost" style="stroke:var(--alpha)"/>` + ball(430, 210, 16, 'alpha');
      s += text(430, 118, 'closest approach', 'lbl strong') + text(430, 146, 'kinetic energy = 0', 'lbl mono small');
      s += `<line x1="430" y1="244" x2="430" y2="318" class="tick"/><line x1="740" y1="268" x2="740" y2="318" class="tick"/>`;
      s += arrow(445, 302, 728, 302, 'brand-accent', 3) + arrow(725, 302, 442, 302, 'brand-accent', 3);
      s += text(585, 346, 'distance of closest approach, r', 'lbl mono') + text(585, 376, 'all electric potential energy', 'lbl mono small');
      return svg('0 80 860 320', s, 'An alpha particle heading straight for a gold nucleus slows, stops at the distance of closest approach, where all its kinetic energy has become electric potential energy, and returns');
    },

    deviation: () => {
      let s = arrow(90, 400, 90, 50, 'text-secondary', 2.5) + arrow(90, 400, 690, 400, 'text-secondary', 2.5);
      s += text(390, 446, 'energy of the alpha particles', 'lbl mono');
      s += text(40, 225, 'counted, as a fraction of predicted', 'lbl mono small', 'middle', 'transform="rotate(-90 40 225)"');
      s += `<rect x="430" y="60" width="260" height="340" style="fill:var(--hl);opacity:.09"/>`;
      s += `<line x1="90" y1="150" x2="690" y2="150" class="guide"/>` + text(76, 157, '1', 'lbl mono', 'end') + text(104, 134, 'matches Rutherford’s formula', 'lbl small', 'start');
      s += `<path d="M90,150 L430,150 C480,150 500,190 530,250 C560,310 600,360 680,384" class="curve" style="stroke:var(--alpha)"/>`;
      s += `<line x1="430" y1="60" x2="430" y2="400" class="guide accent"/>`;
      s += text(260, 190, 'agrees:', 'lbl strong') + text(260, 220, 'electric repulsion only', 'lbl small');
      s += text(562, 92, 'falls below:', 'lbl strong', 'middle', 'style="fill:var(--hl)"') + text(562, 120, 'alpha reaches the nucleus', 'lbl small');
      return svg('0 0 720 460', s, 'Graph: at low energies the number of alpha particles counted at a fixed angle matches the number Rutherford’s formula predicts; above a certain energy it falls below the prediction');
    },

    'bohr-orbits': () => {
      const cx = 250, cy = 270, r1 = 24;
      let s = '';
      [1, 2, 3].forEach(n => { s += ring(cx, cy, r1 * n * n); });
      s += ball(cx, cy, 11, 'proton');
      s += orbiter(cx, cy, r1 * 4, r1 * 4, 0.9, 10);
      [[1, 'r₁', 'h/2π'], [2, '4r₁', '2h/2π'], [3, '9r₁', '3h/2π']].forEach(([n, radius, momentum], i) => {
        const y = 150 + i * 110, a = [-0.5, -0.25, 0.12][i], r = r1 * n * n;
        s += `<line x1="${f(cx + r * Math.cos(a))}" y1="${f(cy + r * Math.sin(a))}" x2="528" y2="${y - 8}" class="guide"/>`;
        s += text(540, y - 14, `n = ${n}`, 'lbl display', 'start');
        s += text(540, y + 16, `radius ${radius}`, 'lbl mono small', 'start') + text(540, y + 42, `mvr = ${momentum}`, 'lbl mono small', 'start');
      });
      return svg('0 0 760 520', s, 'Bohr orbits of hydrogen for n = 1, 2 and 3: radii in the ratio 1 to 4 to 9, angular momentum 1, 2 and 3 times h over 2 pi');
    },

    // ---- E.2: quantum physics ----

    'photo-setup': () => {
      let s = `<rect x="120" y="330" width="660" height="70" rx="10" style="fill:var(--aluminium)"/>` + text(450, 374, 'clean metal surface', 'lbl strong', 'middle', 'style="fill:#1B1B1B"');
      [[150, 40, 300, 318], [280, 40, 430, 318], [410, 40, 560, 318]].forEach(([x1, y1, x2, y2]) => { s += wave(x1, y1, x2, y2, { cycles: 7, amp: 10 }); });
      s += text(150, 28, 'light: photons of energy hf', 'lbl mono', 'start', 'style="fill:var(--photon)"');
      [[330, 300, 400, 150], [460, 300, 600, 190], [590, 300, 760, 120]].forEach(([x1, y1, x2, y2]) => {
        s += arrow(x1, y1, x2 - 14, y2 + 12, 'electron', 3) + ball(x1, y1, 13, 'electron');
      });
      s += text(770, 96, 'photoelectrons', 'lbl mono', 'middle', 'style="fill:var(--electron)"');
      return svg('0 0 900 420', s, 'Light falling on a clean metal surface releases electrons, called photoelectrons');
    },

    // One photon's energy as a bar: it pays the work function and the rest is kinetic energy.
    // Below the threshold the bar falls short of the work function, so nothing escapes.
    'photon-budget': () => {
      const sub = t => `<tspan dy="7" font-size="70%">${t}</tspan><tspan dy="-7"> </tspan>`;
      const bar = (x, y, w, colour, label, note) => `<rect x="${x}" y="${y}" width="${w}" height="68" rx="10" style="fill:var(--${colour})"/>` + text(x + w / 2, y + 31, label, 'lbl strong', 'middle', 'style="fill:#fff"') + text(x + w / 2, y + 56, note, 'lbl small', 'middle', 'style="fill:#fff"');
      const sign = (x, y, t) => text(x, y, t, 'lbl display', 'middle', 'font-size="44"');
      let s = text(90, 38, 'Above the threshold: the photon has more than Φ', 'lbl strong a', 'start');
      s += bar(90, 54, 760, 'photon', 'photon energy hf', 'all of it goes to one electron');
      s += sign(54, 187, '=') + bar(90, 138, 430, 'lead', 'work function Φ', 'used up escaping the metal');
      s += sign(545, 187, '+') + bar(570, 138, 280, 'electron', `kinetic energy E${sub('max')}`, 'what is left over');
      s += text(90, 286, 'Below the threshold: the photon has less than Φ', 'lbl strong a', 'start');
      s += `<rect x="90" y="302" width="430" height="68" rx="10" style="fill:none;stroke:var(--lead);stroke-width:3;stroke-dasharray:8 7"/>`;
      s += bar(90, 302, 290, 'photon', 'photon energy hf', 'not enough') + text(450, 344, 'short', 'lbl italic small');
      s += `<line x1="90" y1="380" x2="90" y2="404" class="tick"/><line x1="520" y1="380" x2="520" y2="404" class="tick"/>` + arrow(100, 392, 512, 392, 'text-secondary', 2.5) + arrow(510, 392, 98, 392, 'text-secondary', 2.5);
      s += text(305, 428, 'work function Φ needed to escape', 'lbl small');
      s += text(700, 330, 'no electron escapes,', 'lbl strong') + text(700, 360, 'however bright the light', 'lbl');
      return svg('0 0 900 440', s, 'Energy of one photon: above the threshold frequency it equals the work function plus the kinetic energy of the electron; below the threshold it is less than the work function, so no electron escapes');
    },

    'emax-graph': () => {
      let s = arrow(110, 440, 110, 40, 'text-secondary', 2.5) + arrow(110, 300, 720, 300, 'text-secondary', 2.5);
      s += text(700, 336, 'frequency f', 'lbl mono', 'end') + text(126, 52, 'E<tspan dy="6" font-size="70%">max</tspan>', 'lbl mono', 'start');
      s += `<line x1="110" y1="420" x2="300" y2="300" class="guide"/><path d="M300,300 L660,72" class="curve" style="stroke:var(--electron)"/>`;
      s += `<path d="M470,300 L700,154" class="curve" style="stroke:var(--neutron);stroke-width:3;stroke-dasharray:10 8"/>`;
      s += `<circle cx="300" cy="300" r="8" style="fill:var(--hl)"/>` + text(300, 338, 'f₀', 'lbl display', 'middle', 'style="fill:var(--hl)"') + text(300, 366, 'threshold', 'lbl mono small');
      s += `<circle cx="110" cy="420" r="8" style="fill:var(--hl)"/>` + text(96, 428, '−Φ', 'lbl display', 'end', 'style="fill:var(--hl)"');
      s += `<path d="M430,218 H560 V135" class="guide accent"/>` + text(574, 184, 'gradient = h', 'lbl strong', 'start');
      s += text(596, 262, 'another metal:', 'lbl small', 'start') + text(596, 288, 'same gradient', 'lbl small', 'start');
      s += text(205, 280, 'no emission', 'lbl italic small');
      return svg('0 0 800 460', s, 'Graph of maximum kinetic energy against frequency: a straight line of gradient h that meets the frequency axis at the threshold frequency and, extended back, the energy axis at minus the work function');
    },

    stopping: () => {
      let s = `<rect x="170" y="60" width="520" height="190" rx="95" class="inset"/>` + text(430, 48, 'evacuated tube', 'lbl mono small', 'middle');
      s += `<rect x="240" y="100" width="16" height="110" rx="4" style="fill:var(--aluminium)"/>` + text(226, 196, 'metal', 'lbl small', 'end');
      s += `<rect x="604" y="100" width="16" height="110" rx="4" style="fill:var(--lead)"/>` + text(634, 196, 'collector', 'lbl small', 'start');
      s += wave(90, 20, 232, 130, { cycles: 6, amp: 8 }) + text(60, 22, 'light', 'lbl mono small', 'middle', 'style="fill:var(--photon)"');
      [[280, 130, 430], [280, 155, 520], [280, 180, 370]].forEach(([x, y, x2]) => { s += arrow(x, y, x2, y, 'electron', 3) + ball(x, y, 9, 'electron'); });
      s += text(290, 108, 'slowed by the reverse p.d.', 'lbl small', 'start');
      s += `<path d="M248,210 V360 H330 M400,360 H520 M580,360 H612 V210" class="cable"/>`;
      s += `<line x1="330" y1="336" x2="330" y2="384" class="tick" style="stroke-width:5"/><line x1="346" y1="346" x2="346" y2="374" class="tick"/><line x1="384" y1="336" x2="384" y2="384" class="tick" style="stroke-width:5"/><line x1="400" y1="346" x2="400" y2="374" class="tick"/><line x1="350" y1="360" x2="380" y2="360" class="guide"/>`;
      s += text(365, 414, 'variable supply', 'lbl small') + text(318, 326, '+', 'lbl strong') + text(412, 326, '−', 'lbl strong');
      s += `<circle cx="550" cy="360" r="30" class="node"/>` + text(550, 369, 'μA', 'lbl strong') + text(550, 414, 'zero at V<tspan dy="6" font-size="70%">s</tspan>', 'lbl small');
      return svg('0 0 800 430', s, 'Photocell with a reversed variable supply: the collector is made negative until even the fastest photoelectrons are stopped and the microammeter reads zero');
    },

    'ediff-setup': () => {
      let s = `<path d="M40,150 H250 L640,60 V360 L250,270 H40 Z" class="inset"/>`;
      s += `<rect x="70" y="180" width="90" height="60" rx="8" style="fill:var(--lead)"/>` + text(115, 268, 'electron gun', 'lbl small');
      s += text(115, 140, 'accelerating p.d. V', 'lbl mono small');
      s += `<line x1="160" y1="210" x2="300" y2="210" style="stroke:var(--electron)" stroke-width="4" stroke-dasharray="3 9" stroke-linecap="round"/>`;
      s += `<rect x="298" y="170" width="8" height="80" rx="3" style="fill:var(--text-main)"/>` + text(302, 300, 'thin graphite', 'lbl small');
      [-1, 1].forEach(k => { [52, 96].forEach(dy => { s += `<line x1="306" y1="210" x2="640" y2="${210 + k * dy}" style="stroke:var(--electron)" stroke-width="2" opacity=".5"/>`; }); });
      s += `<ellipse cx="640" cy="210" rx="26" ry="150" style="fill:color-mix(in srgb, var(--electron) 12%, var(--card-bg));stroke:var(--card-border)" stroke-width="2"/>`;
      s += `<circle cx="820" cy="210" r="120" style="fill:var(--spectrum-bg)"/>`;
      [44, 82].forEach(r => { s += `<circle cx="820" cy="210" r="${r}" style="fill:none;stroke:#7CFFB2" stroke-width="9" opacity=".8"/>`; });
      s += `<circle cx="820" cy="210" r="9" style="fill:#7CFFB2"/>` + text(820, 366, 'screen, seen face on', 'lbl small') + text(820, 394, 'bright rings', 'lbl strong');
      return svg('0 0 960 410', s, 'Electron diffraction tube: electrons from a gun pass through thin graphite and form bright rings on a fluorescent screen');
    },

    'diff-min': () => {
      const x0 = 380, y0 = 380, scale = 82, height = 300;
      let d = '';
      for (let i = -300; i <= 300; i++) {
        const u = i / 100 * Math.PI, value = i === 0 ? 1 : (Math.sin(u) / u) ** 2;
        d += `${i === -300 ? 'M' : 'L'}${f(x0 + i / 100 * scale)},${f(y0 - value * height)}`;
      }
      let s = arrow(80, y0, 700, y0, 'text-secondary', 2.5) + arrow(x0, y0, x0, 40, 'text-secondary', 2.5);
      s += text(690, y0 + 40, 'angle θ', 'lbl mono', 'end') + text(x0 + 16, 54, 'number of particles', 'lbl mono small', 'start');
      s += `<path d="${d}" class="curve" style="stroke:var(--electron)"/>`;
      [-1, 1].forEach(k => { s += `<circle cx="${x0 + k * scale}" cy="${y0}" r="8" style="fill:var(--hl)"/>`; });
      s += `<line x1="${x0 + scale}" y1="${y0}" x2="${x0 + scale + 60}" y2="${y0 - 110}" class="guide"/>`;
      s += text(x0 + scale + 66, y0 - 150, 'first minimum', 'lbl strong', 'start', 'style="fill:var(--hl)"') + text(x0 + scale + 66, y0 - 120, 'sin θ ≈ λ / D', 'lbl mono', 'start');
      s += text(x0, y0 + 40, '0', 'lbl mono small');
      return svg('0 0 760 440', s, 'Graph of the number of scattered particles against angle: a tall central peak, falling to a first minimum where the sine of the angle is about the wavelength divided by the width of the obstacle');
    },

    compton: () => {
      const a = -40 * Math.PI / 180, ex = 400, ey = 250;
      let s = `<line x1="60" y1="${ey}" x2="820" y2="${ey}" class="guide"/>`;
      s += wave(70, ey, ex - 24, ey, { cycles: 9, amp: 12 }) + text(210, ey - 44, 'incoming photon', 'lbl strong') + text(210, ey + 56, 'wavelength λ<tspan dy="6" font-size="70%">i</tspan>', 'lbl mono small');
      s += wave(ex + 22 * Math.cos(a), ey + 22 * Math.sin(a), ex + 300 * Math.cos(a), ey + 300 * Math.sin(a), { cycles: 5, amp: 12 });
      s += text(650, 50, 'scattered photon', 'lbl strong', 'start') + text(650, 78, 'longer wavelength λ<tspan dy="6" font-size="70%">f</tspan>', 'lbl mono small', 'start');
      s += `<path d="M${ex + 110},${ey} A110,110 0 0 0 ${f(ex + 110 * Math.cos(a))},${f(ey + 110 * Math.sin(a))}" class="guide accent"/>` + text(ex + 134, ey - 34, 'θ', 'lbl greek');
      s += arrow(ex + 18, ey + 12, ex + 250, ey + 130, 'electron', 4) + ball(ex, ey, 18, 'electron');
      s += text(884, ey + 166, 'recoiling electron', 'lbl strong', 'end') + text(884, ey + 194, 'gains kinetic energy', 'lbl mono small', 'end');
      s += text(ex, ey + 56, 'electron, at rest', 'lbl small');
      return svg('0 0 900 460', s, 'Compton scattering: a photon hits an electron at rest; the photon leaves at an angle theta with a longer wavelength and the electron recoils');
    },

    'matter-wave': () => {
      let s = ball(130, 110, 30, 'electron') + arrow(176, 110, 380, 110, 'electron', 5) + text(280, 70, 'momentum p', 'lbl mono');
      s += text(260, 196, 'travels as', 'lbl italic');
      s += wave(40, 290, 480, 290, { cycles: 5, amp: 30, color: 'electron', head: false });
      s += `<line x1="150" y1="340" x2="150" y2="386" class="tick"/><line x1="238" y1="340" x2="238" y2="386" class="tick"/>` + arrow(158, 370, 230, 370, 'brand-accent', 2.5) + arrow(230, 370, 158, 370, 'brand-accent', 2.5);
      s += text(262, 380, 'wavelength λ = h / p', 'lbl mono strong', 'start');
      return svg('0 0 620 420', s, 'A particle of momentum p travels as a wave of de Broglie wavelength equal to the Planck constant divided by p');
    }
  };

  function render() {
    document.body.insertAdjacentHTML('afterbegin', sharedDefs());
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    document.querySelectorAll('[data-fig]').forEach(el => {
      const make = FIGURES[el.dataset.fig];
      if (!make) return;
      el.innerHTML = make(el);
      if (reduce) el.querySelectorAll('.mover').forEach(node => node.remove());
    });
  }

  window.DeckFigures = { render, orbitPoint };
})();
