// SVG diagrams for the Atoms and Nuclear Radiation deck. They use the same
// particle colours and glossy-sphere look as the Atomic Models and Nuclear
// Decay simulations. Each <div data-fig="name"> is filled from FIGURES.
(() => {
  const SYMBOL = { proton: '+', neutron: '0', electron: '−', alpha: 'α', positive: '+', undecayed: '', decayed: '', solid: '' };
  const GRADIENTS = ['proton', 'neutron', 'electron', 'alpha', 'positive', 'solid', 'undecayed', 'decayed', 'object'];
  const MARKERS = ['text-secondary', 'alpha', 'electron', 'photon', 'brand-accent', 'brand-primary', 'neutron'];
  const TAU = Math.PI * 2;
  const f = n => Math.round(n * 10) / 10;

  function sharedDefs() {
    const stops = key => `<stop offset="0" style="stop-color:color-mix(in srgb, var(--${key}) 42%, #fff)"/><stop offset=".55" style="stop-color:var(--${key})"/><stop offset="1" style="stop-color:color-mix(in srgb, var(--${key}) 70%, #000)"/>`;
    const grads = GRADIENTS.map(key => `<radialGradient id="g-${key}" cx="38%" cy="32%" r="72%">${stops(key)}</radialGradient>`).join('');
    const markers = MARKERS.map(key => `<marker id="m-${key}" viewBox="0 0 10 10" refX="7" refY="5" markerUnits="userSpaceOnUse" markerWidth="16" markerHeight="16" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" style="fill:var(--${key})"/></marker>`).join('');
    return `<svg class="svg-defs" aria-hidden="true" focusable="false"><defs>${grads}${markers}
      <radialGradient id="g-glow"><stop offset="0" style="stop-color:var(--photon);stop-opacity:.45"/><stop offset="1" style="stop-color:var(--photon);stop-opacity:0"/></radialGradient>
      <radialGradient id="g-pudding" cx="42%" cy="38%" r="70%"><stop offset="0" style="stop-color:var(--positive);stop-opacity:.22"/><stop offset="1" style="stop-color:var(--positive);stop-opacity:.42"/></radialGradient>
      <radialGradient id="g-shadow"><stop offset="0" style="stop-color:#000;stop-opacity:.16"/><stop offset="1" style="stop-color:#000;stop-opacity:0"/></radialGradient>
    </defs></svg>`;
  }

  const svg = (viewBox, body, label) => `<svg viewBox="${viewBox}" role="img" aria-label="${label}">${body}</svg>`;

  function ball(x, y, r, kind, sym = SYMBOL[kind] ?? '') {
    const text = sym && r >= 7 ? `<text x="${f(x)}" y="${f(y)}" class="sym" font-size="${f(r * 1.15)}">${sym}</text>` : '';
    return `<g><circle cx="${f(x)}" cy="${f(y)}" r="${r}" fill="url(#g-${kind})"/>${text}</g>`;
  }

  // Nucleons packed like the sims: random points in 3D relaxed until the
  // spheres just touch, turned to a random angle, then drawn back to front.
  function packNucleus(count, rand) {
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
    const centre = [0, 1, 2].map(k => points.reduce((sum, point) => sum + point[k], 0) / count);
    const turn = (a, b) => points.map(point => {
      let [x, y, z] = point.map((v, k) => v - centre[k]);
      [x, z] = [x * Math.cos(a) + z * Math.sin(a), -x * Math.sin(a) + z * Math.cos(a)];
      [y, z] = [y * Math.cos(b) - z * Math.sin(b), y * Math.sin(b) + z * Math.cos(b)];
      return [x, y, z];
    });
    if (count > 6) return turn(rand() * TAU, rand() * TAU);
    // Tiny clusters (an alpha particle): choose a view where no nucleon hides behind another.
    let best = null, bestGap = -1;
    for (let t = 0; t < 40; t++) {
      const view = turn(rand() * TAU, rand() * TAU);
      let gap = Infinity;
      for (let i = 0; i < count; i++) for (let j = i + 1; j < count; j++) gap = Math.min(gap, Math.hypot(view[i][0] - view[j][0], view[i][1] - view[j][1]));
      if (gap > bestGap) { bestGap = gap; best = view; }
    }
    return best;
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
      [0.3, 1.3].forEach(p => {
        const phase = (p + i * 0.4) * Math.PI;
        if (animate) s += orbiter(cx, cy, rx, ry, phase, 7 + i * 1.5, tilt, er);
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
      s += `<circle cx="645" cy="130" r="100" class="inset"/>` + cluster(645, 130, 5, 6, 24);
      s += text(645, 262, 'the nucleus', 'lbl strong') + text(645, 288, 'radius < 1/10 000', 'lbl mono') + text(645, 310, 'of the atom’s radius', 'lbl mono');
      return svg('0 0 760 460', s, 'An atom of radius about 1 times 10 to the minus 10 metres, with a tiny nucleus at the centre');
    },

    notation: () => {
      let s = text(372, 262, 'C', 'big-symbol', 'start');
      s += text(356, 162, '12', 'big-num a', 'end') + text(356, 262, '6', 'big-num z', 'end');
      s += text(30, 60, 'MASS NUMBER', 'lbl mono strong a', 'start') + text(30, 86, 'protons + neutrons', 'lbl', 'start');
      s += arrow(190, 96, 250, 128, 'brand-primary', 2.5);
      s += text(30, 322, 'ATOMIC NUMBER', 'lbl mono strong z', 'start') + text(30, 348, 'number of protons', 'lbl', 'start');
      s += arrow(200, 320, 262, 272, 'brand-accent', 2.5);
      s += text(560, 176, 'carbon-12', 'lbl display', 'start') + text(560, 210, '6 p · 6 n · 6 e', 'lbl mono', 'start');
      return svg('0 0 760 380', s, 'Nuclear notation for carbon-12: mass number 12 at the top left, atomic number 6 at the bottom left');
    },

    isotopes: () => {
      const data = [[160, 6, '12'], [480, 7, '13'], [800, 8, '14']];
      let s = '';
      data.forEach(([x, n, a]) => {
        s += shadow(x, 290, 90) + cluster(x, 170, 6, n, 30);
        s += text(x, 334, `carbon-${a}`, 'lbl display');
        s += `<text x="${x}" y="366" class="lbl mono" text-anchor="middle"><tspan class="t-proton">6 p</tspan> · <tspan class="t-neutron">${n} n</tspan></text>`;
      });
      return svg('0 0 960 390', s, 'Nuclei of carbon-12, carbon-13 and carbon-14: all have 6 protons but 6, 7 and 8 neutrons');
    },

    ion: () => {
      let s = '';
      [[230, false], [730, true]].forEach(([cx, ion]) => {
        s += ring(cx, 200, 85) + ring(cx, 200, 150, ion ? 'stroke-dasharray="6 7" opacity=".45"' : '');
        s += cluster(cx, 200, 3, 4, 20);
        s += orbiter(cx, 200, 85, 85, 0.2, 8) + orbiter(cx, 200, 85, 85, 0.2 + Math.PI, 8);
        if (!ion) s += orbiter(cx, 200, 150, 150, 3.9, 14);
      });
      s += ball(905, 60, 12, 'electron') + arrow(845, 118, 890, 74, 'electron', 2.5);
      s += text(905, 32, 'outer e⁻ lost', 'lbl', 'end');
      s += arrow(410, 200, 540, 200, 'text-secondary', 3) + text(475, 182, 'loses 1 e⁻', 'lbl mono');
      s += text(230, 400, 'lithium atom', 'lbl display') + text(230, 432, '3 p · 3 e → charge 0', 'lbl mono');
      s += text(730, 400, 'lithium ion, Li⁺', 'lbl display') + text(730, 432, '3 p · 2 e → charge +1', 'lbl mono');
      return svg('0 0 960 450', s, 'A lithium atom loses its outer electron to become a positive ion');
    },

    'mini-solid': () => svg('0 0 160 160', shadow(80, 146, 50) + ball(80, 80, 54, 'solid'), 'A solid sphere'),
    'mini-plum': () => svg('0 0 160 160', plumPudding(80, 80, 64, 9, 16), 'Plum pudding model'),
    'mini-nuclear': () => svg('0 0 160 160', nuclearAtom(80, 80, 70, 24, 10, 6, false), 'Nuclear model'),
    'mini-bohr': () => {
      let s = ring(80, 80, 40) + ring(80, 80, 70) + cluster(80, 80, 3, 3, 11);
      [0, Math.PI].forEach(p => { s += ball(80 + 40 * Math.cos(p + 0.6), 80 + 40 * Math.sin(p + 0.6), 7, 'electron'); });
      [0.25, 0.75, 1.25, 1.75].forEach(p => { s += ball(80 + 70 * Math.cos(p * Math.PI), 80 + 70 * Math.sin(p * Math.PI), 7, 'electron'); });
      return svg('0 0 160 160', s, 'Bohr model');
    },
    'mini-proton': () => svg('0 0 160 160', cluster(80, 80, 6, 0, 24), 'Protons in the nucleus'),
    'mini-neutron': () => svg('0 0 160 160', cluster(80, 80, 6, 6, 21), 'Protons and neutrons in the nucleus'),

    'mini-decay': () => {
      let s = `<circle cx="80" cy="92" r="72" fill="url(#g-glow)" class="pulse"/>` + cluster(80, 92, 6, 7, 14);
      s += arrow(122, 64, 146, 48, 'alpha', 2) + cluster(170, 34, 2, 2, 10);
      s += wave(120, 118, 192, 146, { cycles: 3, amp: 5 });
      return svg('0 0 200 170', s, 'An unstable nucleus emitting radiation');
    },

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
      paths.forEach(([d, kind], i) => {
        s += `<path d="${d}" class="alpha-path ${kind}" marker-end="url(#m-alpha)"/>`;
        s += `<g class="mover"><circle r="7" fill="url(#g-alpha)"/><animateMotion dur="${kind === 'bounce' ? 3.2 : 2.6}s" begin="-${f(i * 0.45)}s" repeatCount="indefinite" path="${d}"/></g>`;
      });
      s += `<rect x="516" y="96" width="8" height="268" rx="3" style="fill:var(--gold)"/>` + text(520, 84, 'thin gold foil', 'lbl strong');
      s += text(330, 132, 'bounce back', 'lbl', 'middle', 'style="fill:var(--alpha)"');
      s += text(760, 164, 'small', 'lbl', 'start', 'style="fill:var(--alpha)"') + text(760, 186, 'deflection', 'lbl', 'start', 'style="fill:var(--alpha)"');
      s += text(760, 236, 'straight', 'lbl', 'start', 'style="fill:var(--alpha)"') + text(760, 258, 'through', 'lbl', 'start', 'style="fill:var(--alpha)"');
      return svg('0 0 900 460', s, 'Alpha scattering: alpha particles fired at thin gold foil. Most pass straight through, some are deflected, a very few bounce back');
    },

    'scatter-zoom': () => {
      let s = cluster(350, 230, 8, 10, 18) + text(350, 318, 'gold nucleus (+)', 'lbl strong');
      const paths = [
        ['M20,410 L600,410', 'far away: straight on', 600, 396, 'end'],
        ['M20,168 L220,168 C300,168 330,146 380,104 L470,32', 'close: repelled, deflected', 482, 40, 'start'],
        ['M20,236 L278,236 Q306,229 278,222 L40,190', 'head-on: bounces back', 20, 272, 'start']
      ];
      paths.forEach(([d, label, x, y, anchor], i) => {
        s += `<path d="${d}" class="alpha-path" marker-end="url(#m-alpha)"/>`;
        s += `<g class="mover"><circle r="10" fill="url(#g-alpha)"/><animateMotion dur="3s" begin="-${i * 0.9}s" repeatCount="indefinite" path="${d}"/></g>`;
        s += text(x, y, label, 'lbl', anchor, 'style="fill:var(--alpha)"');
      });
      return svg('0 0 640 460', s, 'Close-up: alpha particles far from a nucleus pass straight through; close ones are repelled; a head-on one bounces back');
    },

    rutherford: () => svg('0 0 540 500', shadow(270, 470, 170) + nuclearAtom(270, 245, 220, 80, 24, 13, true), 'Nuclear model: a tiny positive nucleus with electrons outside it'),

    bohr: () => svg('0 0 560 560', bohrAtom(280, 270, true), 'Bohr model of carbon: 2 electrons in energy level n = 1 and 4 in n = 2'),

    'bohr-then-now': () => {
      let s = '';
      [[200, false], [640, true]].forEach(([cx, modern]) => {
        const cy = 190;
        s += ring(cx, cy, 82) + ring(cx, cy, 158);
        s += modern ? cluster(cx, cy, 6, 6, 18) : ball(cx, cy, 26, 'positive');
        [0.6, 0.6 + Math.PI].forEach(p => { s += ball(cx + 82 * Math.cos(p), cy + 82 * Math.sin(p), 12, 'electron'); });
        [0.25, 0.75, 1.25, 1.75].forEach(p => { s += ball(cx + 158 * Math.cos(p * Math.PI), cy + 158 * Math.sin(p * Math.PI), 12, 'electron'); });
        s += text(cx, 392, modern ? 'today' : 'Bohr, 1913', 'lbl display');
        s += text(cx, 422, modern ? '6 protons + 6 neutrons' : 'one positive nucleus', 'lbl mono');
      });
      s += arrow(378, 190, 462, 190, 'text-secondary', 3) + text(420, 172, 'later', 'lbl mono small');
      return svg('0 0 840 440', s, 'Carbon atom as Bohr pictured it in 1913, with one positive nucleus, and today, with 6 protons and 6 neutrons');
    },

    levels: () => {
      let s = '';
      [[240, true], [720, false]].forEach(([cx, absorb]) => {
        const cy = 215, a = -0.75;
        const p1 = [cx + 75 * Math.cos(a), cy + 75 * Math.sin(a)], p2 = [cx + 150 * Math.cos(a), cy + 150 * Math.sin(a)];
        s += ring(cx, cy, 75) + ring(cx, cy, 150) + cluster(cx, cy, 3, 3, 14);
        s += text(cx - 75, cy + 5, 'n=1', 'lbl mono small', 'middle') + text(cx - 150, cy + 5, 'n=2', 'lbl mono small', 'middle');
        const [from, to] = absorb ? [p1, p2] : [p2, p1];
        s += `<circle cx="${f(from[0])}" cy="${f(from[1])}" r="12" class="ghost"/>`;
        s += ball(to[0], to[1], 12, 'electron');
        const k = absorb ? 1 : -1;
        s += arrow(from[0] + 13 * k * Math.cos(a), from[1] + 13 * k * Math.sin(a), to[0] - 16 * k * Math.cos(a), to[1] - 16 * k * Math.sin(a), 'brand-accent', 3);
        if (absorb) s += wave(cx - 200, cy - 170, p1[0] - 16, p1[1] - 10, { cycles: 5 });
        else s += wave(p1[0] + 14, p1[1] - 12, cx + 215, cy - 185, { cycles: 5 });
        s += text(cx, 38, absorb ? 'ABSORBS EM RADIATION' : 'EMITS EM RADIATION', 'lbl mono strong a');
        s += text(cx, 402, absorb ? 'moves further out' : 'moves closer in', 'lbl display');
        s += text(cx, 432, absorb ? 'higher energy level' : 'lower energy level', 'lbl mono');
      });
      return svg('0 0 960 450', s, 'An electron absorbs electromagnetic radiation and moves to a higher energy level; it emits radiation when it moves to a lower level');
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

    'decay-intro': () => {
      let s = `<circle cx="210" cy="210" r="150" fill="url(#g-glow)"/>` + cluster(210, 210, 14, 18, 24);
      s += cluster(395, 80, 2, 2, 14) + arrow(300, 150, 362, 100, 'alpha', 2.5) + text(395, 42, 'α', 'lbl greek', 'middle', 'style="fill:var(--alpha)"');
      s += ball(415, 210, 11, 'electron') + arrow(315, 210, 395, 210, 'electron', 2.5) + text(415, 180, 'β', 'lbl greek', 'middle', 'style="fill:var(--electron)"');
      s += wave(305, 262, 420, 330, { cycles: 4 }) + text(446, 350, 'γ', 'lbl greek', 'middle', 'style="fill:var(--photon)"');
      s += ball(318, 382, 11, 'neutron') + arrow(270, 318, 306, 368, 'neutron', 2.5) + text(346, 402, 'n', 'lbl greek', 'start', 'style="fill:var(--neutron)"');
      s += wave(470, 210, 560, 210, { cycles: 3, amp: 6, color: 'text-secondary', opacity: .6 });
      s += `<rect x="560" y="186" width="200" height="48" rx="24" style="fill:var(--aluminium)"/><rect x="560" y="190" width="16" height="40" rx="6" style="fill:var(--lead)"/>`;
      s += text(660, 272, 'Geiger–Müller tube', 'lbl strong');
      s += `<path d="M760,210 C790,210 790,210 818,210" class="cable"/>`;
      s += `<rect x="818" y="150" width="124" height="120" rx="16" class="node"/>` + text(880, 182, 'COUNT RATE', 'lbl mono small') + text(880, 228, '124', 'lbl readout') + text(880, 254, 'counts/s', 'lbl mono small');
      return svg('0 0 960 420', s, 'An unstable nucleus emits alpha, beta, gamma or a neutron; a Geiger-Müller tube and counter record the count rate');
    },

    alpha: () => {
      let s = shadow(150, 300, 100) + cluster(150, 190, 12, 16, 21);
      s += arrow(260, 190, 330, 190, 'text-secondary', 3);
      s += shadow(440, 300, 95) + cluster(440, 200, 10, 14, 21);
      s += `<line x1="530" y1="160" x2="598" y2="112" class="trail" style="stroke:var(--alpha)"/>` + cluster(636, 86, 2, 2, 19);
      s += text(150, 344, 'americium-241', 'lbl display') + text(150, 372, '95 p · 146 n', 'lbl mono');
      s += text(440, 344, 'neptunium-237', 'lbl display') + text(440, 372, '93 p · 144 n', 'lbl mono');
      s += text(636, 162, 'alpha particle', 'lbl display') + text(636, 190, '2 p · 2 n', 'lbl mono');
      return svg('0 0 720 400', s, 'Alpha decay: americium-241 emits an alpha particle of 2 protons and 2 neutrons and becomes neptunium-237');
    },

    beta: () => {
      let s = shadow(140, 262, 100) + cluster(140, 150, 6, 8, 26);
      s += arrow(250, 150, 320, 150, 'text-secondary', 3);
      s += shadow(430, 262, 100) + cluster(430, 150, 7, 7, 26, { base: [6, 8], highlight: true });
      s += `<line x1="528" y1="120" x2="616" y2="78" class="trail" style="stroke:var(--electron)"/>` + ball(640, 68, 14, 'electron') + text(640, 30, 'beta particle', 'lbl strong');
      s += text(140, 300, 'carbon-14', 'lbl display') + text(140, 328, '6 p · 8 n', 'lbl mono');
      s += text(430, 300, 'nitrogen-14', 'lbl display') + text(430, 328, '7 p · 7 n', 'lbl mono');
      s += `<rect x="120" y="356" width="480" height="96" rx="18" class="inset"/>` + text(150, 410, 'IN THE NUCLEUS', 'lbl mono small', 'start');
      s += ball(342, 404, 20, 'neutron') + arrow(368, 404, 404, 404, 'text-secondary', 2.5) + ball(432, 404, 20, 'proton') + text(480, 414, '+', 'lbl display') + ball(528, 404, 14, 'electron');
      return svg('0 0 720 460', s, 'Beta decay: a neutron turns into a proton and a fast electron; carbon-14 becomes nitrogen-14');
    },

    gamma: () => {
      let s = `<circle cx="150" cy="180" r="140" fill="url(#g-glow)" class="pulse"/>` + cluster(150, 180, 10, 13, 22);
      s += arrow(262, 180, 330, 180, 'text-secondary', 3);
      s += shadow(440, 290, 90) + cluster(440, 180, 10, 13, 22);
      s += wave(540, 150, 700, 56, { cycles: 5, amp: 10 }) + text(650, 140, 'gamma ray', 'lbl strong', 'middle', 'style="fill:var(--photon)"');
      s += text(150, 334, 'technetium-99m', 'lbl display') + text(150, 362, 'extra energy', 'lbl mono');
      s += text(440, 334, 'technetium-99', 'lbl display') + text(440, 362, 'same p and n', 'lbl mono');
      return svg('0 0 720 400', s, 'Gamma emission: an excited technetium-99m nucleus gives out a gamma ray; its protons and neutrons do not change');
    },

    penetration: () => {
      let s = `<rect x="20" y="70" width="64" height="290" rx="12" style="fill:var(--lead)"/>` + text(52, 392, 'SOURCE', 'lbl mono small');
      s += `<rect x="300" y="52" width="7" height="326" rx="2" style="fill:var(--paper);stroke:var(--input-border)"/>`;
      s += `<rect x="520" y="52" width="18" height="326" rx="3" style="fill:var(--aluminium)"/>`;
      s += `<rect x="730" y="52" width="52" height="326" rx="4" style="fill:var(--lead)"/>`;
      s += text(303, 36, 'paper', 'lbl mono strong') + text(529, 36, 'aluminium · few mm', 'lbl mono strong') + text(756, 36, 'lead · several cm', 'lbl mono strong');
      s += `<line x1="90" y1="125" x2="294" y2="125" class="lane" style="stroke:var(--alpha)"/>` + ball(150, 125, 14, 'alpha') + ball(232, 125, 14, 'alpha');
      s += text(318, 110, 'stopped', 'lbl small', 'start', 'style="fill:var(--alpha)"');
      s += `<line x1="90" y1="215" x2="514" y2="215" class="lane" style="stroke:var(--electron)"/>` + [160, 290, 420].map(x => ball(x, 215, 10, 'electron')).join('');
      s += text(550, 200, 'stopped', 'lbl small', 'start', 'style="fill:var(--electron)"');
      s += wave(90, 305, 728, 305, { cycles: 11, amp: 10, head: false });
      s += wave(786, 305, 940, 305, { cycles: 3, amp: 6, opacity: .45 });
      s += text(860, 340, 'reduced', 'lbl small', 'middle', 'style="fill:var(--photon)"');
      s += text(112, 100, 'α', 'lbl greek', 'start', 'style="fill:var(--alpha)"') + text(112, 196, 'β', 'lbl greek', 'start', 'style="fill:var(--electron)"') + text(112, 282, 'γ', 'lbl greek', 'start', 'style="fill:var(--photon)"');
      return svg('0 0 960 410', s, 'Penetration: paper stops alpha, a few millimetres of aluminium stops beta, several centimetres of lead reduce gamma');
    },

    'use-smoke': () => {
      let s = `<circle cx="120" cy="92" r="78" class="inset"/><rect x="62" y="52" width="116" height="10" rx="3" style="fill:var(--aluminium)"/><rect x="62" y="124" width="116" height="10" rx="3" style="fill:var(--aluminium)"/>`;
      s += ball(120, 93, 9, 'alpha') + [[82, 78], [158, 104], [96, 108], [146, 78]].map(([x, y], i) => text(x, y + 6, i % 2 ? '−' : '+', 'lbl strong')).join('');
      return svg('0 0 240 180', s, 'Smoke alarm: alpha source ionises air between two plates');
    },
    'use-gauge': () => {
      let s = `<circle cx="60" cy="62" r="20" class="roller"/><circle cx="60" cy="118" r="20" class="roller"/><rect x="20" y="84" width="200" height="12" rx="2" style="fill:var(--paper);stroke:var(--input-border)"/>`;
      s += `<rect x="140" y="140" width="40" height="30" rx="6" style="fill:var(--lead)"/><rect x="138" y="14" width="44" height="30" rx="8" style="fill:var(--aluminium)"/>`;
      s += arrow(160, 138, 160, 104, 'electron', 2.5) + `<line x1="160" y1="78" x2="160" y2="52" style="stroke:var(--electron)" stroke-width="2.5" stroke-dasharray="4 4" marker-end="url(#m-electron)"/>`;
      return svg('0 0 240 180', s, 'Thickness gauge: beta source below the sheet, detector above');
    },
    'use-tracer': () => {
      let s = `<circle cx="70" cy="40" r="22" class="body"/><rect x="38" y="68" width="64" height="100" rx="26" class="body"/>`;
      s += `<circle cx="70" cy="110" r="7" style="fill:var(--photon)"/>` + wave(80, 106, 190, 76, { cycles: 4, amp: 5 }) + wave(80, 116, 190, 140, { cycles: 4, amp: 5 });
      s += `<rect x="198" y="40" width="22" height="120" rx="6" style="fill:var(--aluminium)"/>`;
      return svg('0 0 240 180', s, 'Medical tracer: gamma rays pass out of the body to a detector');
    },

    'half-life': () => {
      const X = t => 90 + t * 18.75, Y = n => 400 - n * 0.85;
      let s = `<line x1="90" y1="400" x2="700" y2="400" class="axis"/><line x1="90" y1="400" x2="90" y2="44" class="axis"/>`;
      [0, 8, 16, 24, 32].forEach(t => { s += `<line x1="${X(t)}" y1="400" x2="${X(t)}" y2="408" class="axis"/>` + text(X(t), 432, t, 'lbl mono small'); });
      [0, 100, 200, 300, 400].forEach(n => { s += `<line x1="82" y1="${Y(n)}" x2="90" y2="${Y(n)}" class="axis"/>` + text(74, Y(n) + 6, n, 'lbl mono small', 'end'); });
      s += text(395, 462, 'time (days)', 'lbl');
      s += text(22, 222, 'undecayed nuclei', 'lbl', 'middle', 'transform="rotate(-90 22 222)"');
      [[8, 200, '½'], [16, 100, '¼'], [24, 50, '⅛']].forEach(([t, n, frac]) => {
        s += `<path d="M90,${Y(n)} H${X(t)} V400" class="guide accent"/>` + `<circle cx="${X(t)}" cy="${Y(n)}" r="6" style="fill:var(--brand-accent)"/>`;
        s += text(X(t) + 14, Y(n) - 12, frac, 'lbl strong', 'start', 'style="fill:var(--brand-accent-strong)"');
      });
      let d = '';
      for (let t = 0; t <= 32; t += 0.5) d += `${t ? 'L' : 'M'}${f(X(t))},${f(Y(400 * Math.pow(2, -t / 8)))}`;
      s += `<path d="${d}" class="curve draw"/>`;
      return svg('0 0 720 480', s, 'Decay curve: 400 undecayed nuclei fall to 200 after 8 days, 100 after 16 days and 50 after 24 days');
    },

    random: () => {
      const rand = seeded(7);
      const order = Array.from({ length: 64 }, (_, i) => i).sort(() => rand() - 0.5);
      const decayed = [new Set(), new Set(order.slice(0, 31)), new Set(order.slice(0, 49))];
      const labels = [['start', '64 undecayed'], ['after 1 half-life', '33 undecayed (≈ 32)'], ['after 2 half-lives', '15 undecayed (≈ 16)']];
      let s = '';
      [40, 368, 696].forEach((x0, g) => {
        for (let i = 0; i < 64; i++) {
          const x = x0 + (i % 8) * 28 + 14, y = 40 + Math.floor(i / 8) * 28 + 14;
          s += ball(x, y, 11, decayed[g].has(i) ? 'decayed' : 'undecayed');
        }
        s += text(x0 + 112, 310, labels[g][0], 'lbl mono strong') + text(x0 + 112, 340, labels[g][1], 'lbl');
      });
      return svg('0 0 960 360', s, 'Random decay of 64 nuclei: 33 remain after one half-life and 15 after two, close to but not exactly half each time');
    },

    exposure: () => {
      const apple = (cx, cy) => `<circle cx="${cx}" cy="${cy}" r="62" fill="url(#g-object)"/><path d="M${cx},${cy - 60} q4,-22 16,-30" class="stem"/>`;
      let s = text(230, 36, 'IRRADIATION', 'lbl mono strong a') + text(730, 36, 'CONTAMINATION', 'lbl mono strong a');
      s += `<rect x="36" y="150" width="80" height="84" rx="12" style="fill:var(--lead)"/>` + text(76, 262, 'source', 'lbl small');
      s += [168, 192, 216].map((y, i) => wave(122, y, 250, 170 + i * 22, { cycles: 4, amp: 5 })).join('');
      s += apple(330, 190);
      s += text(230, 330, 'exposed to radiation', 'lbl display') + text(230, 360, 'does NOT become radioactive', 'lbl mono');
      s += `<line x1="480" y1="60" x2="480" y2="360" class="divider"/>`;
      s += apple(730, 190);
      [[-38, -22], [22, -38], [40, 18], [-18, 34], [-46, 22], [10, 4]].forEach(([dx, dy]) => {
        const x = 730 + dx, y = 190 + dy, len = Math.hypot(dx, dy) || 1;
        s += arrow(x + dx / len * 10, y + dy / len * 10, x + dx / len * 44, y + dy / len * 44, 'text-secondary', 2) + `<circle cx="${x}" cy="${y}" r="6" style="fill:var(--undecayed);stroke:#fff" stroke-width="1.5"/>`;
      });
      s += text(730, 330, 'radioactive atoms on or in it', 'lbl display') + text(730, 360, 'keeps emitting until removed', 'lbl mono');
      return svg('0 0 960 380', s, 'Irradiation: an object exposed to radiation does not become radioactive. Contamination: radioactive atoms on or in the object keep emitting radiation');
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
