// SVG diagrams for the IB DP Physics decks: the drawing helpers every deck uses, and the figures
// of A.1 Kinematics, A.2 Forces and momentum, E.1 Structure of the atom and E.2 Quantum physics.
// The other decks add their own figures from a figures.js beside their index.html (see
// DeckFigures.add at the end of this file). The atom figures began as copies of those in
// gcsephy/decks/atoms-and-radiation and use the same particle colours and
// glossy-sphere look as the Atomic Models and Nuclear Decay simulations.
// Each <div data-fig="name"> is filled from FIGURES.
(() => {
  const SYMBOL = { proton: '+', neutron: '0', electron: '−', alpha: 'α', positive: '+', solid: '' };
  const GRADIENTS = ['proton', 'neutron', 'electron', 'alpha', 'positive', 'solid', 'brand-accent-strong', 'brand-primary', 'decayed', 'undecayed'];
  const MARKERS = ['text-secondary', 'alpha', 'electron', 'photon', 'brand-accent', 'brand-primary', 'brand-accent-strong', 'hl', 'proton', 'neutron'];
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
    // Fewer protons than the parent (beta-plus decay): front protons become neutrons.
    for (let k = order.length - 1; k >= 0 && changed.size < base[0] - protons; k--) {
      if (kinds[order[k]] === 'proton') { kinds[order[k]] = 'neutron'; changed.add(order[k]); }
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

  // A straight field line from (x1, y1) to (x2, y2): one unbroken line that ends on the body,
  // with its arrowhead part of the way along (at), never at the tip.
  function fline(x1, y1, x2, y2, color = 'brand-primary', width = 3.5, at = 0.5, extra = '') {
    const hx = x1 + (x2 - x1) * at, hy = y1 + (y2 - y1) * at, deg = Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI;
    return `<g ${extra}><line x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}" style="stroke:var(--${color})" stroke-width="${width}" stroke-linecap="round"/><path d="M-10,-8 L8,0 L-10,8 Z" transform="translate(${f(hx)} ${f(hy)}) rotate(${f(deg)})" style="fill:var(--${color})"/></g>`;
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

  // ---- A.1: kinematics helpers ----
  // Graph axes from the origin (x0, y0), a plotted line in a palette colour, and the moving body.
  const axes = (x0, y0, x1, y1, xLabel, yLabel) => arrow(x0, y0, x0, y1, 'text-secondary', 2.5) + arrow(x0, y0, x1, y0, 'text-secondary', 2.5) + text(x1 - 6, y0 + 36, xLabel, 'lbl mono', 'end') + text(x0 + 16, y1 + 14, yLabel, 'lbl mono', 'start');
  const plot = (d, colour = 'brand-primary', extra = '') => `<path d="${d}" class="curve" style="stroke:var(--${colour})" ${extra}/>`;
  const shade = (d, colour = 'brand-primary', opacity = 0.16) => `<path d="${d}" style="fill:var(--${colour});opacity:${opacity}"/>`;
  const body = (x, y, r = 15) => ball(x, y, r, 'brand-accent-strong', '');
  const both = (x1, y1, x2, y2, colour = 'text-secondary', width = 2.5) => arrow(x1, y1, x2, y2, colour, width) + arrow(x2, y2, x1, y1, colour, width);
  // Points at equal time steps on a projectile path from (x0, y0) to (x1, y0) that rises by h.
  const arcPoints = (x0, y0, x1, h, n) => Array.from({ length: n + 1 }, (_, i) => [x0 + (x1 - x0) * i / n, y0 - 4 * h * (i / n) * (1 - i / n)]);
  const through = points => points.map(([x, y], i) => `${i ? 'L' : 'M'}${f(x)},${f(y)}`).join('');
  const sampled = (fn, n = 60) => through(Array.from({ length: n + 1 }, (_, i) => fn(i / n)));

  // ---- A.2: forces and momentum helpers ----
  // A subscripted symbol, a block, a point on a body, a surface and a coiled spring. Forces are
  // teal, velocities and components apricot. A force arrow starts where the force acts: weight
  // at the centre of mass (marked with a dot), a normal force or friction at the surface in
  // contact, a tension where the string is attached, an applied force where it is applied. data-plain leaves the labels off a small copy.
  const sub = (a, b) => `${a}<tspan dy="9" font-size="24">${b}</tspan><tspan dy="-9">​</tspan>`;
  const box = (cx, cy, w, h, extra = '') => `<rect x="${f(cx - w / 2)}" y="${f(cy - h / 2)}" width="${w}" height="${h}" rx="10" style="fill:color-mix(in srgb, var(--brand-accent-strong) 18%, var(--viewer-bg));stroke:var(--brand-accent-strong);stroke-width:3" ${extra}/>`;
  const dot = (x, y, r = 7) => `<circle cx="${f(x)}" cy="${f(y)}" r="${r}" style="fill:var(--text-main)"/>`;
  const surface = (x1, y1, x2, y2) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="tick" style="stroke-width:4"/>`;
  const labelled = el => !('plain' in el.dataset);
  function spring(x, y1, y2, turns = 9, amp = 16) {
    const lead = 14, step = (y2 - y1 - 2 * lead) / (turns * 2);
    let d = `M${x},${y1} V${y1 + lead}`;
    for (let i = 0; i < turns * 2; i++) d += ` L${x + (i % 2 ? -amp : amp)},${f(y1 + lead + step * (i + 0.5))}`;
    return `<path d="${d} L${x},${y2 - lead} V${y2}" class="cable" stroke-linejoin="round"/>`;
  }
  // Collision pictures. Each body has its own colour, used for its block and its velocity arrow.
  // A body lists its three positions along the track (before, at the moment of contact, after)
  // and what is written above it before (pre) and after (post): a velocity, or rest.
  const BODY_COLOURS = ['brand-accent-strong', 'brand-primary'];
  const block = (x, y, w, colour) => `<rect x="${x - w / 2}" y="${y - 72}" width="${w}" height="70" rx="10" style="fill:color-mix(in srgb, var(--${colour}) 45%, var(--viewer-bg));stroke:var(--${colour});stroke-width:3"/>`;
  const velocity = (x, y, v, colour, on = true) => {
    if (!v) return '';
    const { label, dir = 1, len = 100, rest, ax = 0 } = v;
    if (rest) return on ? text(x + ax, y + 8, 'at rest', 'lbl small') : '';
    return arrow(x + ax - dir * len / 2, y, x + ax + dir * len / 2, y, colour, 5) + (on ? text(x + ax, y - 16, label, 'lbl mono strong') : '');
  };
  // The picture that does not move: one row of the track, before (stage 0) or after (stage 2).
  function trackRow(y, bodies, stage, on) {
    return surface(60, y, 760, y) + bodies.map(({ w = 120, m, x, pre, post }, i) => block(x[stage], y, w, BODY_COLOURS[i]) + (on ? text(x[stage], y + 34, m, 'lbl mono') : '') + velocity(x[stage], y - 100, stage ? post : pre, BODY_COLOURS[i], on)).join('');
  }
  // The picture that moves: one track, each body drawn where it ends and shifted back to where
  // it starts. When step k2 is shown, deck.css slides it to the point of contact and straight on.
  function trackPlay(y, bodies) {
    const approach = bodies.some(({ x }) => x[0] !== x[1]);
    let s = surface(60, y, 760, y) + `<g class="pre">${text(30, 60, 'BEFORE', 'lbl mono', 'start')}</g><g class="post">${text(30, 60, 'AFTER', 'lbl mono', 'start')}</g>`;
    bodies.forEach(({ w = 120, m, x, pre, post }, i) => {
      s += `<g class="cbody" style="--x0:${x[0] - x[2]}px;--x1:${x[1] - x[2]}px">${block(x[2], y, w, BODY_COLOURS[i])}${text(x[2], y + 34, m, 'lbl mono')}<g class="pre">${velocity(x[2], y - 100, pre, BODY_COLOURS[i])}</g><g class="post">${velocity(x[2], y - 100, post, BODY_COLOURS[i])}</g></g>`;
    });
    return `<g style="--t1:${approach ? '1.3s' : '0s'}">${s}</g><g class="step k2"></g>`;
  }
  const COLLISIONS = {
    general: {
      bodies: [{ m: 'm₁', x: [120, 340, 410], pre: { label: 'u₁', len: 130 }, post: { label: 'v₁', len: 60 } }, { m: 'm₂', x: [400, 460, 670], pre: { label: 'u₂', len: 60 }, post: { label: 'v₂', len: 130 } }],
      label: 'Two bodies on a track before and after a collision: masses m 1 and m 2 have velocities u 1 and u 2 before and v 1 and v 2 after'
    },
    stick: {
      bodies: [{ w: 110, m: '800 kg', x: [190, 415, 505], pre: { label: '15 m s⁻¹', len: 130 }, post: { label: 'v = ?', len: 52, ax: 70 } }, { w: 140, m: '1200 kg', x: [540, 540, 630], pre: { rest: true } }],
      label: 'Before: an 800 kilogram car at 15 metres per second approaches a 1200 kilogram car at rest. After: the two move off joined together at an unknown velocity v'
    },
    elastic: {
      bodies: [{ m: '2.0 kg', x: [150, 300, 350], pre: { label: '3.0 m s⁻¹', len: 130 }, post: { label: '1.0 m s⁻¹', len: 50 } }, { w: 90, m: '1.0 kg', x: [405, 405, 605], pre: { rest: true }, post: { label: 'v₂ = ?', len: 150 } }],
      label: 'Before: a 2.0 kilogram trolley at 3.0 metres per second approaches a 1.0 kilogram trolley at rest. After: the 2.0 kilogram trolley moves at 1.0 metre per second and the 1.0 kilogram trolley at an unknown velocity v'
    },
    explode: {
      bodies: [{ m: '60 kg', x: [345, 345, 225], pre: { rest: true, ax: 55 }, post: { label: 'v₁ = ?', dir: -1, len: 80 } }, { w: 100, m: '40 kg', x: [455, 455, 635], post: { label: '3.0 m s⁻¹', len: 120 } }],
      label: 'Before: a 60 kilogram skater and a 40 kilogram skater stand together at rest. After pushing apart, the 40 kilogram skater moves right at 3.0 metres per second and the 60 kilogram skater moves left at an unknown velocity v'
    }
  };

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
      s += text(345, 288, 'radius ≈ 10⁻¹⁰ m', 'lbl mono halo');
      s += text(250, 372, 'mostly empty space', 'lbl italic halo');
      s += `<circle cx="645" cy="130" r="100" class="inset"/>` + cluster(645, 130, 3, 4, 24);
      s += text(645, 262, 'the nucleus', 'lbl strong') + text(645, 298, 'radius ≈ 10⁻¹⁵ m', 'lbl mono') + text(645, 330, '10⁵ times smaller', 'lbl mono');
      return svg('0 0 790 460', s, 'An atom of radius about 1 times 10 to the minus 10 metres, with a nucleus about 100 000 times smaller at the centre');
    },

    notation: () => {
      let s = text(372, 262, 'C', 'big-symbol', 'start');
      s += text(356, 162, '12', 'big-num a', 'end') + text(356, 262, '6', 'big-num z', 'end');
      s += text(30, 60, 'NUCLEON NUMBER A', 'lbl mono strong a', 'start') + text(30, 90, 'protons + neutrons', 'lbl small', 'start');
      s += arrow(204, 104, 250, 130, 'brand-primary', 2.5);
      s += text(30, 322, 'PROTON NUMBER Z', 'lbl mono strong z', 'start') + text(30, 352, 'number of protons', 'lbl small', 'start');
      s += arrow(248, 276, 298, 240, 'brand-accent', 2.5);
      s += text(560, 176, 'carbon-12', 'lbl display', 'start') + text(560, 214, '6 p, 6 n, 6 e', 'lbl mono', 'start');
      return svg('0 0 790 380', s, 'Nuclear notation for carbon-12: nucleon number 12 at the top left, proton number 6 at the bottom left');
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
      s += text(760, 152, 'small', 'lbl', 'start', 'style="fill:var(--alpha)"') + text(760, 182, 'deflection', 'lbl', 'start', 'style="fill:var(--alpha)"');
      s += '</g><g class="scatter-live"></g>';
      s += `<rect x="516" y="96" width="8" height="268" rx="3" style="fill:var(--gold)"/>` + text(520, 84, 'thin gold foil', 'lbl strong');
      s += text(760, 232, 'straight', 'lbl', 'start', 'style="fill:var(--alpha)"') + text(760, 262, 'through', 'lbl', 'start', 'style="fill:var(--alpha)"');
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
        s += `<rect x="${x - 104}" y="${y - 28}" width="208" height="56" rx="16" class="node ${i === 3 ? 'hot' : ''}"/>`;
        s += text(x, y + 7, label, 'lbl strong node-text');
      });
      s += text(310, 220, 'model kept', 'lbl mono') + text(310, 250, 'or changed', 'lbl mono');
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
      const data = [[105, 2, 2, 'helium-4', '1.90'], [315, 6, 6, 'carbon-12', '2.75'], [550, 26, 30, 'iron-56', '4.59'], [820, 79, 118, 'gold-197', '6.98']];
      let s = '';
      data.forEach(([x, p, n, name, radius]) => {
        s += cluster(x, 170, p, n, 12);
        s += text(x, 330, name, 'lbl display') + text(x, 366, `R = ${radius} fm`, 'lbl mono small');
      });
      return svg('0 0 990 390', s, 'Nuclei of helium-4, carbon-12, iron-56 and gold-197 drawn to the same scale: radii 1.90, 2.75, 4.59 and 6.98 femtometres');
    },

    'closest-approach': () => {
      let s = `<line x1="70" y1="210" x2="760" y2="210" class="guide"/>`;
      s += ball(740, 210, 46, 'positive') + text(740, 118, 'gold nucleus', 'lbl strong') + text(740, 146, 'charge +79e', 'lbl mono small');
      s += ball(90, 210, 16, 'alpha') + arrow(116, 210, 230, 210, 'alpha', 4);
      s += text(150, 118, 'far away', 'lbl strong') + text(150, 148, 'all kinetic energy', 'lbl small') + text(90, 262, 'alpha, +2e', 'lbl mono small');
      s += `<circle cx="430" cy="210" r="22" class="ghost" style="stroke:var(--alpha)"/>` + ball(430, 210, 16, 'alpha');
      s += text(430, 118, 'closest approach', 'lbl strong') + text(430, 148, 'kinetic energy = 0', 'lbl small');
      s += `<line x1="430" y1="244" x2="430" y2="318" class="tick"/><line x1="740" y1="268" x2="740" y2="318" class="tick"/>`;
      s += arrow(445, 302, 728, 302, 'brand-accent', 3) + arrow(725, 302, 442, 302, 'brand-accent', 3);
      s += text(585, 346, 'distance of closest approach, r', 'lbl mono') + text(585, 376, 'all electric potential energy', 'lbl mono small');
      return svg('0 80 860 320', s, 'An alpha particle heading straight for a gold nucleus slows, stops at the distance of closest approach, where all its kinetic energy has become electric potential energy, and returns');
    },

    deviation: () => {
      let s = arrow(90, 400, 90, 50, 'text-secondary', 2.5) + arrow(90, 400, 690, 400, 'text-secondary', 2.5);
      s += text(390, 446, 'energy of the alpha particles', 'lbl mono');
      s += text(40, 225, 'fraction of predicted count', 'lbl small', 'middle', 'transform="rotate(-90 40 225)"');
      s += `<rect x="430" y="60" width="260" height="340" style="fill:var(--hl);opacity:.09"/>`;
      s += `<line x1="90" y1="150" x2="690" y2="150" class="guide"/>` + text(76, 157, '1', 'lbl mono', 'end') + text(104, 136, 'matches the formula', 'lbl small', 'start');
      s += `<path d="M90,150 L430,150 C480,150 500,190 530,250 C560,310 600,360 680,384" class="curve" style="stroke:var(--brand-primary)"/>`;
      s += `<line x1="430" y1="60" x2="430" y2="400" class="guide accent"/>`;
      s += text(260, 196, 'agrees:', 'lbl strong') + text(260, 228, 'electric repulsion only', 'lbl small');
      s += text(562, 88, 'falls below:', 'lbl strong', 'middle', 'style="fill:var(--hl)"') + text(562, 114, 'alpha reaches', 'lbl small') + text(562, 138, 'the nucleus', 'lbl small');
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

    // ---- A.1: kinematics ----

    'kin-hero': () => {
      const points = arcPoints(70, 470, 490, 340, 8);
      let s = `<line x1="30" y1="488" x2="530" y2="488" class="tick"/>` + `<path d="${sampled(t => [70 + 420 * t, 470 - 1360 * t * (1 - t)])}" class="guide"/>`;
      s += arrow(70, 470, 100, 373, 'brand-primary', 5) + arrow(280, 130, 372, 130, 'brand-primary', 5);
      points.forEach(([x, y]) => { s += body(x, y, 16); });
      return svg('0 0 560 560', s, 'A ball following a curved projectile path, shown at equal time intervals');
    },

    'path-displacement': () => {
      let s = plot('M120,350 C220,480 380,420 400,300 C420,180 520,40 680,130', 'brand-primary', 'stroke-dasharray="2 12"');
      s += arrow(120, 350, 662, 137, 'brand-accent', 5);
      s += body(120, 350, 14) + body(680, 130, 14);
      s += text(100, 326, 'start', 'lbl mono', 'end') + text(690, 96, 'finish', 'lbl mono');
      s += text(100, 150, 'displacement:', 'lbl strong', 'start') + text(100, 180, 'straight from start to finish', 'lbl', 'start');
      s += text(450, 400, 'distance:', 'lbl strong a', 'start') + text(450, 430, 'the length of the path', 'lbl', 'start');
      return svg('0 0 800 460', s, 'A winding path from start to finish, whose length is the distance, and a straight arrow from start to finish, which is the displacement');
    },

    'chord-tangent': () => {
      const at = t => [110 + 580 * t, 400 - 300 * t * t];
      let s = axes(110, 400, 740, 40, 'time', 'displacement');
      s += `<line x1="338" y1="366.5" x2="598" y2="205" style="stroke:var(--brand-accent-strong);stroke-width:3.5;stroke-dasharray:10 7"/>`;
      s += `<line x1="${at(0.3)[0]}" y1="${at(0.3)[1]}" x2="${at(0.9)[0]}" y2="${at(0.9)[1]}" style="stroke:var(--brand-accent);stroke-width:4"/>`;
      s += plot(sampled(at));
      [0.3, 0.9].forEach(t => { s += `<circle cx="${at(t)[0]}" cy="${at(t)[1]}" r="8" style="fill:var(--brand-accent)"/>`; });
      s += `<circle cx="458" cy="292" r="8" style="fill:var(--brand-accent-strong)"/>`;
      s += text(420, 200, 'gradient of chord', 'lbl strong', 'end') + text(420, 230, '= average velocity', 'lbl', 'end');
      s += text(480, 345, 'gradient of tangent', 'lbl strong', 'start') + text(480, 375, '= instantaneous velocity', 'lbl', 'start');
      return svg('0 0 800 460', s, 'Displacement against time for a body speeding up: the gradient of a chord between two points is the average velocity and the gradient of the tangent at one point is the instantaneous velocity');
    },

    'st-graph': () => {
      let s = axes(110, 400, 740, 40, 'time', 'displacement');
      s += plot('M110,400 L260,280 L400,280 L500,110 L690,330');
      s += text(236, 366, 'constant velocity', 'lbl small', 'start') + text(330, 262, 'at rest', 'lbl small');
      s += text(436, 180, 'steeper:', 'lbl small', 'end') + text(436, 204, 'faster', 'lbl small', 'end');
      s += text(566, 108, 'moving back:', 'lbl small', 'start') + text(566, 136, 'negative gradient', 'lbl small', 'start');
      return svg('0 0 800 460', s, 'Displacement against time in four stages: a straight rising line for constant velocity, a flat line at rest, a steeper line for a higher velocity and a falling line for moving back');
    },

    // Used twice: as the general graph, and with data-numbers as the worked example's journey.
    'vt-graph': el => {
      const numbers = 'numbers' in el.dataset;
      let s = shade('M110,400 L286,130 L550,130 L682,400 Z') + axes(110, 400, 760, 40, numbers ? '' : 'time', numbers ? 'v / m s⁻¹' : 'velocity');
      s += plot('M110,400 L286,130 L550,130 L682,400');
      if (numbers) {
        [[286, '4'], [550, '10'], [682, '13']].forEach(([x, label]) => { s += `<line x1="${x}" y1="400" x2="${x}" y2="412" class="tick"/>` + text(x, 438, label, 'lbl mono'); });
        s += `<line x1="98" y1="130" x2="110" y2="130" class="tick"/>` + text(88, 138, '12', 'lbl mono', 'end') + text(96, 438, '0', 'lbl mono', 'end');
        s += text(772, 408, 't / s', 'lbl mono', 'start');
        s += `<path d="M286,130 V400 M550,130 V400" class="guide"/>`;
        s += text(226, 340, '24 m', 'lbl strong') + text(418, 280, '72 m', 'lbl strong') + text(594, 340, '18 m', 'lbl strong');
      } else {
        s += `<path d="M170,308 H250 V185" class="guide accent"/>` + text(268, 240, 'gradient = acceleration', 'lbl strong', 'start');
        s += text(400, 335, 'area = displacement', 'lbl strong') + text(418, 112, 'constant velocity', 'lbl small');
        s += text(636, 226, 'slowing', 'lbl small', 'start') + text(636, 250, 'down', 'lbl small', 'start');
      }
      return svg(numbers ? '0 0 850 460' : '0 0 800 460', s, numbers ? 'Velocity against time: rising from 0 to 12 metres per second in 4 seconds, steady until 10 seconds, then falling to zero at 13 seconds; the areas are 24, 72 and 18 metres' : 'Velocity against time: the gradient is the acceleration and the area under the graph is the displacement');
    },

    'three-graphs': () => {
      const frame = (ox, title, d) => axes(ox + 30, 330, ox + 250, 96, 't', '') + text(ox + 140, 66, title, 'lbl strong') + plot(d);
      let s = frame(30, 'displacement', sampled(t => [60 + 190 * t, 330 - 200 * t * t]));
      s += frame(330, 'velocity', 'M360,330 L550,130') + frame(630, 'acceleration', 'M660,220 L850,220');
      [[185, 465], [485, 765]].forEach(([x1, x2]) => {
        s += arrow(x1, 412, x2, 412, 'brand-primary', 3) + text((x1 + x2) / 2, 402, 'gradient', 'lbl small a');
        s += arrow(x2, 446, x1, 446, 'brand-accent', 3) + text((x1 + x2) / 2, 472, 'area', 'lbl small');
      });
      return svg('0 0 900 484', s, 'Three graphs against time for the same uniformly accelerated motion: displacement is a curve, velocity a straight line and acceleration a horizontal line. The gradient of each gives the next, and the area under each gives the change in the one before');
    },

    'vt-curve': () => {
      const at = t => [110 + 580 * t, 400 - 270 * (1 - Math.exp(-3 * t))];
      let s = shade(`${sampled(at)} L690,400 L110,400 Z`);
      for (let x = 168; x <= 690; x += 58) s += `<line x1="${x}" y1="${f(at((x - 110) / 580)[1])}" x2="${x}" y2="400" class="guide"/>`;
      for (let y = 346; y > 140; y -= 54) s += `<line x1="${f(110 + 580 * Math.min(1, -Math.log(1 - (400 - y) / 270) / 3))}" y1="${y}" x2="690" y2="${y}" class="guide"/>`;
      s += axes(110, 400, 760, 40, 'time', 'velocity') + plot(sampled(at));
      s += `<line x1="165" y1="316.9" x2="375" y2="178.3" style="stroke:var(--brand-accent-strong);stroke-width:3.5;stroke-dasharray:10 7"/><circle cx="255" cy="257.5" r="8" style="fill:var(--brand-accent-strong)"/>`;
      s += text(300, 90, 'gradient of tangent =', 'lbl strong', 'start') + text(300, 124, 'acceleration at that instant', 'lbl', 'start');
      s += text(500, 322, 'area = displacement', 'lbl strong halo') + text(500, 376, 'count the squares', 'lbl small halo');
      return svg('0 0 800 460', s, 'Velocity against time as a curve that rises more and more slowly: the gradient of the tangent is the acceleration at that instant and the area under the curve, found by counting squares, is the displacement');
    },

    'suvat-area': () => {
      let s = shade('M110,300 H640 V400 H110 Z', 'brand-accent-strong', 0.2) + shade('M110,300 L640,110 V300 Z', 'brand-accent', 0.34);
      s += `<path d="M110,110 H640 M640,110 V400" class="guide"/>` + axes(110, 400, 760, 40, 'time', 'velocity') + plot('M110,300 L640,110');
      s += text(92, 310, 'u', 'lbl display', 'end') + text(92, 120, 'v', 'lbl display', 'end') + text(640, 438, 't', 'lbl display');
      s += text(375, 362, 'area = ut', 'lbl strong') + text(470, 262, 'area = ½ × t × at', 'lbl strong');
      s += both(672, 296, 672, 114, 'text-secondary', 2.5) + text(688, 200, 'v − u', 'lbl mono', 'start') + text(688, 228, '= at', 'lbl mono', 'start');
      return svg('0 0 860 460', s, 'Velocity against time for uniform acceleration from u to v in time t: the area is a rectangle u t plus a triangle of half t times a t');
    },

    'free-fall': () => {
      let s = `<line x1="150" y1="40" x2="150" y2="568" class="guide"/>`;
      ['0', 'T', '2T', '3T', '4T'].forEach((label, k) => {
        const y = 40 + 33 * k * k;
        s += body(150, y, 12) + text(60, y + 8, label, 'lbl mono', 'middle');
        if (k) s += text(210, y + 8, `${k * k === 1 ? '' : k * k}d`, 'lbl mono strong', 'start');
      });
      s += text(60, 612, 'time', 'lbl small') + text(228, 612, 'distance fallen', 'lbl small');
      s += arrow(370, 200, 370, 400, 'brand-accent', 5) + text(370, 446, 'g', 'lbl display') + text(370, 178, 'acceleration', 'lbl small');
      return svg('0 0 460 630', s, 'A falling ball shown at equal time intervals: the distances fallen from rest are in the ratio 1 to 4 to 9 to 16');
    },

    'throw-up': () => {
      let s = shade('M110,70 L390,230 H110 Z') + shade('M390,230 L670,390 V230 Z', 'brand-accent', 0.3);
      s += arrow(110, 430, 110, 30, 'text-secondary', 2.5) + arrow(110, 230, 760, 230, 'text-secondary', 2.5) + text(754, 266, 'time', 'lbl mono', 'end') + text(126, 44, 'velocity', 'lbl mono', 'start');
      s += `<path d="M670,230 V390" class="guide"/>` + plot('M110,70 L670,390');
      s += text(94, 78, '+u', 'lbl display', 'end') + text(684, 398, '−u', 'lbl display', 'start') + text(94, 238, '0', 'lbl mono', 'end');
      s += `<circle cx="390" cy="230" r="9" style="fill:var(--brand-accent-strong)"/>` + text(404, 208, 'top: v = 0', 'lbl strong', 'start');
      s += text(440, 110, 'gradient = −g all the way', 'lbl', 'start');
      s += text(122, 212, 'going up', 'lbl small', 'start') + text(660, 262, 'coming down', 'lbl small', 'end');
      return svg('0 0 800 460', s, 'Velocity against time for a ball thrown straight up: a straight line of gradient minus g from plus u, through zero at the top, to minus u; the areas above and below the time axis are equal');
    },

    'drop-launch': () => {
      const ys = [0, 1, 2, 3].map(k => 60 + 39 * k * k);
      let s = `<line x1="60" y1="436" x2="760" y2="436" class="tick"/>` + `<path d="${sampled(t => [300 + 375 * t, 60 + 351 * t * t])}" class="guide"/><line x1="150" y1="60" x2="150" y2="411" class="guide"/>`;
      ys.forEach((y, k) => { if (k) s += `<line x1="168" y1="${y}" x2="${284 + 125 * k}" y2="${y}" class="guide accent"/>`; });
      ys.forEach((y, k) => { s += body(150, y, 15) + body(300 + 125 * k, y, 15); });
      s += arrow(322, 60, 396, 60, 'brand-primary', 4);
      s += text(150, 28, 'dropped', 'lbl mono') + text(300, 28, 'launched sideways', 'lbl mono', 'start');
      s += text(184, 300, 'same height at', 'lbl small', 'start') + text(184, 324, 'every instant', 'lbl small', 'start');
      s += text(590, 110, 'sideways:', 'lbl small', 'start') + text(590, 134, 'equal steps', 'lbl small', 'start');
      return svg('0 0 800 460', s, 'Two balls released together, one dropped and one launched horizontally, shown at equal time intervals: they are always at the same height, and the launched ball moves equal distances sideways in each interval');
    },

    components: () => {
      let s = `<line x1="60" y1="398" x2="760" y2="398" class="tick"/>` + `<path d="${sampled(t => [140 + 620 * t, 380 - 448 * t + 285 * t * t], 30)}" class="guide"/>`;
      s += `<path d="M230,380 A90,90 0 0 0 213,327.3" class="guide accent"/>` + text(256, 362, 'θ', 'lbl greek');
      s += arrow(140, 380, 494, 380, 'brand-accent', 4) + arrow(500, 380, 500, 128, 'brand-accent', 4) + arrow(140, 380, 494, 124, 'brand-primary', 6);
      s += body(140, 380, 16);
      s += text(296, 226, 'u', 'lbl display', 'end') + text(320, 432, 'u cos θ', 'lbl mono strong') + text(520, 262, 'u sin θ', 'lbl mono strong', 'start');
      s += text(520, 292, 'vertical part', 'lbl small', 'start') + text(320, 456, 'horizontal part', 'lbl small');
      return svg('0 0 800 470', s, 'A launch velocity u at angle theta above the horizontal, resolved into a horizontal component u cos theta and a vertical component u sin theta');
    },

    'projectile-path': () => {
      const at = t => [90 + 700 * t, 380 - 1120 * t * (1 - t)];
      let s = `<line x1="40" y1="398" x2="860" y2="398" class="tick"/>` + `<path d="${sampled(at)}" class="guide"/><line x1="440" y1="116" x2="440" y2="380" class="guide"/>`;
      [0, 0.25, 0.5, 0.75, 1].forEach(t => {
        const [x, y] = at(t), vy = 78 * (2 * t - 1);
        if (Math.abs(vy) > 1) s += arrow(x, y, x, y + vy, 'brand-accent', 4);
        s += arrow(x, y, x + 74, y, 'brand-primary', 4) + body(x, y, 14);
      });
      s += text(440, 70, 'top: vertical velocity = 0', 'lbl strong') + text(456, 270, 'maximum', 'lbl small', 'start') + text(456, 294, 'height', 'lbl small', 'start');
      s += arrow(380, 428, 98, 428, 'text-secondary', 2.5) + arrow(500, 428, 770, 428, 'text-secondary', 2.5) + text(440, 436, 'range', 'lbl mono');
      s += `<line x1="40" y1="30" x2="84" y2="30" style="stroke:var(--brand-primary);stroke-width:5"/>` + text(96, 38, 'horizontal velocity: constant', 'lbl small', 'start');
      s += `<line x1="500" y1="30" x2="544" y2="30" style="stroke:var(--brand-accent);stroke-width:5"/>` + text(556, 38, 'vertical velocity: changes at g', 'lbl small', 'start');
      return svg('0 0 920 470', s, 'A projectile path with velocity components drawn at five points: the horizontal component is the same everywhere, while the vertical component shrinks to zero at the top and then grows downward');
    },

    'drag-path': () => {
      let s = `<line x1="40" y1="400" x2="860" y2="400" class="tick"/>` + `<path d="${sampled(t => [90 + 700 * t, 400 - 1200 * t * (1 - t)])}" class="guide" style="stroke-width:3;opacity:1"/>`;
      s += plot('M90,400 C190,180 330,150 420,190 C500,225 560,300 600,400') + body(90, 400, 14);
      s += text(660, 150, 'no air resistance', 'lbl small', 'start') + text(330, 300, 'with air resistance', 'lbl strong a');
      s += both(440, 108, 440, 190, 'brand-accent', 3) + text(456, 158, 'lower', 'lbl small', 'start');
      s += both(608, 432, 782, 432, 'brand-accent', 3) + text(695, 462, 'shorter range', 'lbl small');
      s += text(624, 318, 'steeper', 'lbl small', 'start') + text(624, 342, 'descent', 'lbl small', 'start');
      return svg('0 0 900 480', s, 'Two paths for the same launch: without air resistance a symmetrical curve; with air resistance a lower maximum height, a shorter range and a steeper descent');
    },

    terminal: () => {
      const at = t => [110 + 600 * t, 400 - 250 * (1 - Math.exp(-4 * t))];
      let s = axes(110, 400, 770, 40, 'time', 'velocity') + `<line x1="110" y1="150" x2="730" y2="150" class="guide accent"/><line x1="110" y1="400" x2="218" y2="220" class="guide"/>`;
      s += plot(sampled(at));
      s += text(724, 132, 'terminal velocity', 'lbl strong', 'end') + text(236, 96, 'at first: gradient = g', 'lbl small', 'start');
      s += text(700, 318, 'gradient falls to zero:', 'lbl small', 'end') + text(700, 344, 'no acceleration', 'lbl small', 'end');
      return svg('0 0 820 460', s, 'Velocity against time for a body falling from rest through a fluid: the curve starts with gradient g, flattens, and levels off at the terminal velocity');
    },

    'g-drop': () => {
      let s = `<line x1="120" y1="30" x2="120" y2="436" class="tick" style="stroke-width:6"/><line x1="70" y1="438" x2="380" y2="438" class="tick" style="stroke-width:6"/><line x1="120" y1="66" x2="250" y2="66" class="tick" style="stroke-width:5"/>`;
      s += `<rect x="250" y="50" width="80" height="32" rx="6" style="fill:var(--lead)"/>` + body(290, 97, 14) + `<line x1="290" y1="116" x2="290" y2="380" class="guide"/>`;
      s += `<line x1="236" y1="392" x2="344" y2="392" class="tick" style="stroke-width:6"/>`;
      s += `<path d="M330,66 H520 V190 M344,392 H520 V262" class="cable"/><rect x="446" y="190" width="150" height="72" rx="12" class="node"/>` + text(521, 235, 'timer', 'lbl strong');
      s += both(396, 114, 396, 384, 'brand-accent', 3) + text(412, 258, 'h', 'lbl display', 'start');
      s += text(290, 36, 'electromagnet', 'lbl small') + text(262, 104, 'steel ball', 'lbl small', 'end') + text(290, 424, 'trapdoor switch', 'lbl small');
      return svg('0 0 620 460', s, 'Apparatus for measuring g: an electromagnet releases a steel ball, which falls a height h onto a trapdoor switch; a timer starts on release and stops when the trapdoor opens');
    },

    // ---- A.2: forces and momentum ----

    // Also the small picture for part 1, with data-plain. data-view crops it for a narrower panel.
    'fbd-block': el => {
      const on = labelled(el);
      let s = `<line x1="90" y1="302" x2="710" y2="302" class="guide"/>` + box(380, 245, 170, 110);
      s += arrow(380, 245, 380, 412, 'brand-primary', 5) + arrow(412, 300, 412, 110, 'brand-primary', 5) + arrow(465, 245, 660, 245, 'brand-primary', 5) + arrow(348, 300, 196, 300, 'brand-primary', 5) + dot(380, 245);
      if (on) {
        s += text(430, 130, sub('F', 'N'), 'lbl display', 'start') + text(488, 128, 'normal force', 'lbl small', 'start');
        s += text(398, 408, sub('F', 'g'), 'lbl display', 'start') + text(452, 406, 'weight', 'lbl small', 'start');
        s += text(572, 224, 'F', 'lbl display') + text(572, 284, 'applied force', 'lbl small');
        s += text(236, 280, sub('F', 'f'), 'lbl display') + text(236, 338, 'friction', 'lbl small');
      }
      return svg(el.dataset.view || '0 0 800 460', s, 'Free-body diagram of a block pulled along a table, each force drawn from where it acts: the weight down from the centre of the block, the normal force up from its base, the applied force forwards from its front face and a smaller friction force backwards along its base');
    },

    resultant: () => {
      let s = `<path d="M580,380 V80 H180" class="guide"/><path d="M250,380 A70,70 0 0 0 236,338" class="guide accent"/>`;
      s += arrow(180, 380, 574, 380, 'brand-primary', 5) + arrow(180, 380, 180, 86, 'brand-primary', 5) + arrow(180, 380, 574, 84.5, 'brand-accent', 6) + dot(180, 380);
      s += text(380, 426, '4.0 N', 'lbl mono strong') + text(160, 240, '3.0 N', 'lbl mono strong', 'end') + text(272, 364, 'θ', 'lbl greek');
      s += text(430, 280, 'resultant', 'lbl strong', 'start') + text(430, 312, '5.0 N', 'lbl mono strong', 'start');
      return svg('0 0 800 460', s, 'Two forces at right angles on one body, 4.0 newtons to the right and 3.0 newtons upwards, and their resultant of 5.0 newtons along the diagonal at angle theta to the 4.0 newton force');
    },

    'hang-two': () => {
      let s = surface(70, 50, 730, 50) + `<path d="M99.5,50 L320,235 M700.5,50 L480,235" class="cable"/><path d="M180,235 H320 M480,235 H620" class="guide"/>`;
      s += `<path d="M260,235 A60,60 0 0 1 274,196.4 M540,235 A60,60 0 0 0 526,196.4" class="guide accent"/>` + box(400, 270, 160, 70);
      s += arrow(320, 235, 220.4, 151.4, 'brand-primary', 5) + arrow(480, 235, 579.6, 151.4, 'brand-primary', 5) + arrow(400, 270, 400, 420, 'brand-primary', 5) + dot(400, 270);
      s += text(262, 148, 'T', 'lbl display', 'start') + text(538, 148, 'T', 'lbl display', 'end') + text(418, 418, '49 N', 'lbl mono strong', 'start');
      s += text(246, 226, '40°', 'lbl mono', 'end') + text(554, 226, '40°', 'lbl mono', 'start');
      return svg('0 0 800 460', s, 'A sign of weight 49 newtons hangs at rest from two strings fixed to its top corners, each at 40 degrees to the horizontal. Each tension T acts from the corner where its string is attached, and the weight acts from the centre of the sign');
    },

    'third-law': () => {
      let s = text(210, 40, 'gravitational pair', 'lbl strong') + text(590, 40, 'contact pair', 'lbl strong');
      s += `<path d="M50,416 Q210,300 370,416 Z" style="fill:color-mix(in srgb, var(--brand-primary) 22%, var(--viewer-bg));stroke:var(--brand-primary);stroke-width:2.5"/>` + text(292, 404, 'Earth', 'lbl small');
      s += box(210, 110, 130, 46) + arrow(210, 110, 210, 232, 'brand-primary', 5) + arrow(210, 400, 210, 268, 'brand-accent', 5) + dot(210, 110, 6);
      s += text(192, 196, 'on the book', 'lbl small', 'end') + text(228, 312, 'on the Earth', 'lbl small', 'start');
      s += `<path d="M440,250 H740 M462,250 V410 M718,250 V410" class="tick" style="stroke-width:6;fill:none"/>` + box(590, 224, 130, 46);
      s += arrow(590, 246, 590, 112, 'brand-primary', 5) + arrow(590, 256, 590, 388, 'brand-accent', 5);
      s += text(572, 150, 'on the book', 'lbl small', 'end') + text(608, 330, 'on the', 'lbl small', 'start') + text(608, 358, 'table', 'lbl small', 'start');
      return svg('0 0 800 460', s, 'Two Newton third law pairs for a book on a table. Gravitational pair: the Earth pulls the book down and the book pulls the Earth up. Contact pair: the table pushes the book up and the book pushes the table down');
    },

    lift: () => {
      let s = `<line x1="230" y1="8" x2="230" y2="60" class="cable"/><rect x="110" y="60" width="240" height="352" rx="10" class="node" style="stroke:var(--text-secondary);stroke-width:3"/>` + box(230, 331, 84, 160);
      s += arrow(208, 410, 208, 222, 'brand-primary', 5) + arrow(230, 331, 230, 478, 'brand-primary', 5) + dot(230, 331);
      s += text(176, 246, sub('F', 'N'), 'lbl display', 'end') + text(248, 476, sub('F', 'g'), 'lbl display', 'start');
      s += arrow(408, 300, 408, 190, 'brand-accent', 5) + text(408, 340, 'a', 'lbl display');
      return svg('0 0 460 500', s, 'A person in a lift that accelerates upwards: the normal force, drawn upwards from the floor under the feet, is larger than the weight, drawn downwards from the centre of the body');
    },

    // Also the title picture and the small picture for part 2, with data-plain. For a worked
    // example, data-angle replaces θ with a value and adds the acceleration, and data-view crops it.
    'slope-fbd': el => {
      const on = labelled(el), angle = el.dataset.angle || 'θ';
      let s = `<path d="M700,120 L100,400 H760" class="tick" style="stroke-width:4;fill:none"/>` + box(507.3, 176.9, 90, 60, 'transform="rotate(-25 507.3 176.9)"');
      s += `<path d="M507.3,366.9 L434.5,210.8 M507.3,366.9 L580.1,333" class="guide"/>`;
      s += arrow(507.3, 176.9, 434.5, 210.8, 'brand-accent', 3.5, 'stroke-dasharray="9 7"') + arrow(507.3, 176.9, 580.1, 333, 'brand-accent', 3.5, 'stroke-dasharray="9 7"');
      s += arrow(507.3, 176.9, 507.3, 361, 'brand-primary', 5) + arrow(520, 204.1, 449, 52, 'brand-primary', 5) + arrow(520, 204.1, 615, 159.8, 'brand-primary', 5) + dot(507.3, 176.9);
      if (on) {
        s += `<path d="M190,400 A90,90 0 0 0 181.6,362" class="guide accent"/>` + (el.dataset.angle ? text(206, 390, angle, 'lbl mono', 'start') + arrow(300, 262, 227.5, 295.8, 'brand-accent', 4) + text(250, 256, 'a', 'lbl display', 'end') : text(216, 390, 'θ', 'lbl greek'));
        s += text(432, 62, sub('F', 'N'), 'lbl display', 'end') + text(612, 134, sub('F', 'f'), 'lbl display', 'start') + text(492, 380, 'mg', 'lbl display', 'end');
        s += text(420, 204, `mg sin ${angle}`, 'lbl mono', 'end') + text(598, 366, `mg cos ${angle}`, 'lbl mono', 'start');
      }
      return svg(el.dataset.view || '0 0 800 460', s, 'A block on a slope at angle theta: the weight m g acts straight down and is resolved into m g sine theta down the slope and m g cosine theta into the slope; the normal force acts at right angles to the slope and friction acts up the slope');
    },

    'friction-graph': () => {
      let s = axes(110, 400, 760, 40, 'applied force', 'friction') + `<line x1="110" y1="140" x2="370" y2="140" class="guide accent"/><line x1="110" y1="178" x2="384" y2="178" class="guide accent"/>`;
      s += plot('M110,400 L370,140 L384,178 L720,178');
      s += text(98, 144, sub('μ', 's') + sub('F', 'N'), 'lbl mono', 'end') + text(98, 190, sub('μ', 'd') + sub('F', 'N'), 'lbl mono', 'end');
      s += text(384, 128, 'starts to slide', 'lbl small', 'start') + text(560, 160, 'dynamic: constant', 'lbl strong');
      s += text(300, 300, 'static', 'lbl strong', 'start') + text(300, 332, 'grows to match the applied force', 'lbl small', 'start');
      return svg('0 0 800 460', s, 'Friction against applied force: static friction rises in step with the applied force up to a maximum of mu s times the normal force, then the body slides and friction drops a little to a constant dynamic value of mu d times the normal force');
    },

    atwood: () => {
      let s = `<line x1="230" y1="8" x2="230" y2="90" class="tick" style="stroke-width:5"/><path d="M180,355 V90 A50,50 0 0 1 280,90 V245" class="cable"/><circle cx="230" cy="90" r="50" class="node" style="stroke:var(--text-secondary);stroke-width:3"/>` + dot(230, 90, 6);
      s += box(180, 400, 90, 90) + box(280, 280, 70, 70);
      s += arrow(180, 355, 180, 250, 'brand-primary', 5) + arrow(180, 400, 180, 536, 'brand-primary', 5) + arrow(280, 245, 280, 140, 'brand-primary', 5) + arrow(280, 280, 280, 386, 'brand-primary', 5) + dot(180, 400) + dot(280, 280);
      s += text(164, 306, 'T', 'lbl display', 'end') + text(296, 196, 'T', 'lbl display', 'start');
      s += text(120, 410, '3.0 kg', 'lbl mono strong', 'end') + text(330, 290, '2.0 kg', 'lbl mono strong', 'start');
      s += text(198, 524, '29.4 N', 'lbl mono', 'start') + text(298, 378, '19.6 N', 'lbl mono', 'start');
      s += arrow(60, 470, 60, 544, 'brand-accent', 4) + text(60, 458, 'a', 'lbl display') + arrow(462, 320, 462, 246, 'brand-accent', 4) + text(462, 358, 'a', 'lbl display');
      return svg('0 0 500 560', s, 'A light string over a pulley joins a 3.0 kilogram mass, weight 29.4 newtons, to a 2.0 kilogram mass, weight 19.6 newtons. The same tension T pulls up on each from the point where the string is attached, and each weight acts from the centre of its mass; the heavier mass accelerates down and the lighter one up');
    },

    hooke: () => {
      let s = surface(60, 40, 330, 40) + spring(130, 40, 240) + spring(260, 40, 330, 9) + box(260, 362, 64, 64);
      s += `<line x1="100" y1="240" x2="340" y2="240" class="guide"/><line x1="290" y1="330" x2="340" y2="330" class="guide"/>` + both(326, 246, 326, 324, 'brand-accent', 3) + text(342, 296, 'x', 'lbl display', 'start');
      s += arrow(260, 330, 260, 246, 'brand-primary', 5) + text(238, 300, sub('F', 'H'), 'lbl display', 'end') + arrow(260, 362, 260, 446, 'brand-primary', 5) + dot(260, 362, 6) + text(278, 446, 'mg', 'lbl display', 'start');
      s += text(130, 270, 'natural', 'lbl small') + text(130, 296, 'length', 'lbl small');
      s += axes(470, 400, 780, 60, 'extension x', 'force') + plot('M470,400 L730,120') + `<path d="M545,319 H640 V217" class="guide accent"/>`;
      s += text(764, 330, 'gradient = k', 'lbl strong', 'end');
      return svg('0 0 800 460', s, 'A spring at its natural length beside the same spring stretched by an extension x by a hanging mass, with the restoring force F H upwards and the weight downwards; and a straight-line graph of force against extension through the origin, whose gradient is the spring constant k');
    },

    // A sphere held under the surface, with its weight and the buoyancy force.
    'sphere-fluid': () => {
      let s = `<rect x="52" y="80" width="356" height="438" style="fill:var(--brand-primary);opacity:.13"/><path d="M50,40 V520 H410 V40" class="tick" style="stroke-width:4;fill:none"/><line x1="52" y1="80" x2="408" y2="80" class="guide accent"/>` + `<circle cx="230" cy="290" r="44" style="fill:color-mix(in srgb, var(--brand-accent-strong) 18%, var(--viewer-bg));stroke:var(--brand-accent-strong);stroke-width:3"/>`;
      s += arrow(230, 290, 230, 474, 'brand-primary', 5) + dot(230, 290, 6) + text(248, 476, sub('F', 'g'), 'lbl display', 'start') + text(248, 440, 'weight', 'lbl small', 'start');
      s += arrow(230, 290, 230, 124, 'brand-primary', 5) + text(248, 136, sub('F', 'b'), 'lbl display', 'start') + text(248, 172, 'buoyancy', 'lbl small', 'start');
      return svg('0 0 460 560', s, 'A sphere under the surface of a fluid: its weight acts downwards and the buoyancy force acts upwards');
    },

    // A sphere falling through a deep column of fluid. The still picture shows it at terminal
    // speed, where buoyancy and drag together equal the weight. Played with →, it is released
    // near the surface: deck.css sinks it, grows the drag and velocity arrows with its speed and
    // draws the speed–time graph beside it in step.
    'sphere-fall': () => {
      const tank = `<rect x="132" y="70" width="196" height="548" style="fill:var(--brand-primary);opacity:.13"/><path d="M130,24 V620 H330 V24" class="tick" style="stroke-width:4;fill:none"/><line x1="132" y1="70" x2="328" y2="70" class="guide accent"/>`;
      // An arrow of the given length from (x, y): up for a force, down for the velocity. With
      // grow, its shaft and head are separate so that the stylesheet can lengthen it.
      const shaft = (x, y, len, colour, grow) => `<line x1="${x}" y1="${y}" x2="${x}" y2="${y - len + Math.sign(len) * 9}" style="stroke:var(--${colour});transform-origin:${x}px ${y}px" stroke-width="5" stroke-linecap="round"${grow ? ' class="grow"' : ''}/>`;
      const head = (x, y, len, colour, grow) => { const d = Math.sign(len), t = y - len; return `<path d="M${x - 8},${t + d * 11} L${x},${t - d * 5} L${x + 8},${t + d * 11} Z" style="fill:var(--${colour});--len:${len}px"${grow ? ' class="grow-head"' : ''}/>`; };
      const vector = (x, y, len, colour, grow) => shaft(x, y, len, colour, grow) + head(x, y, len, colour, grow);
      const sphere = (y, grow) => {
        let s = `<circle cx="230" cy="${y}" r="30" style="fill:color-mix(in srgb, var(--brand-accent-strong) 18%, var(--viewer-bg));stroke:var(--brand-accent-strong);stroke-width:3"/>`;
        s += vector(230, y, -150, 'brand-primary') + vector(218, y, 45, 'brand-primary') + text(246, y + 152, sub('F', 'g'), 'lbl display', 'start') + text(200, y - 34, sub('F', 'b'), 'lbl display', 'end');
        s += `<g${grow ? ' class="with-speed"' : ''}>${vector(242, y, 105, 'brand-primary', grow)}${vector(298, y - 12, -70, 'brand-accent', grow)}</g>`;
        s += `<g${grow ? ' class="with-speed"' : ''}>${text(258, y - 60, sub('F', 'd'), 'lbl display', 'start')}${text(298, y + 96, 'v', 'lbl display')}</g>`;
        return s + dot(230, y, 6);
      };
      // Speed against time for the same fall: 5 s across the time axis, time constant 0.9 s, as in deck.css.
      const curve = plot(sampled(t => [460 + 340 * t, 440 - 190 * (1 - Math.exp(-5 * t / 0.9))], 80));
      const graph = axes(460, 440, 836, 170, '', '') + text(830, 478, 'time', 'lbl', 'end') + text(476, 184, 'velocity', 'lbl', 'start') + `<line x1="460" y1="250" x2="800" y2="250" class="guide accent"/>` + text(800, 230, 'terminal velocity', 'lbl', 'end');
      const marker = `<circle cx="800" cy="250.7" r="8" style="fill:var(--brand-accent-strong)"/>`;
      const play = `<g class="sinker" style="--drop:320px">${sphere(130, true)}</g><g class="trace">${curve}</g><g class="trace-dot" style="--span:340px"><g class="grow-head" style="--len:189.3px">${marker}</g></g><g class="step k2"></g>`;
      return svg('0 0 860 640', `${tank}${graph}<g class="still">${sphere(450, false)}${curve}${marker}</g><g class="mover">${play}</g>`, 'A small sphere falling through a deep column of fluid. Its weight acts downwards; the buoyancy force and the viscous drag act upwards. The drag grows with the speed until buoyancy and drag together equal the weight, and the sphere then falls at a constant terminal velocity. Beside it, a graph of velocity against time rises steeply at first, then curves over and levels off at the terminal velocity');
    },

    // Also the small picture for part 3, with data-plain.
    'impulse-graph': el => {
      const on = labelled(el), at = t => [200 + 400 * t, 400 - 260 * Math.sin(Math.PI * t) ** 2];
      let s = shade(`${sampled(at)} Z`) + axes(110, 400, 760, 40, on ? 'time' : '', on ? 'force' : '') + `<path d="M200,400 V270 H600 V400" class="guide accent"/>` + plot(sampled(at));
      if (on) {
        s += text(400, 350, 'area = impulse', 'lbl strong halo') + text(616, 264, 'average', 'lbl small', 'start') + text(616, 290, 'force', 'lbl small', 'start') + text(400, 116, 'peak force', 'lbl small');
        s += both(206, 428, 594, 428, 'text-secondary', 2.5) + text(400, 456, 'Δt: time of contact', 'lbl small halo');
      }
      return svg('0 0 800 460', s, 'Force against time during a collision: the force rises to a peak and falls back to zero. The area under the curve is the impulse, equal to the area of a rectangle whose height is the average force and whose width is the time of contact');
    },

    bounce: () => {
      let s = `<line x1="650" y1="50" x2="650" y2="390" class="tick" style="stroke-width:10"/>` + text(110, 148, 'before', 'lbl mono', 'start') + text(110, 318, 'after', 'lbl mono', 'start');
      s += body(330, 140, 24) + arrow(366, 140, 500, 140, 'brand-accent', 5) + text(434, 112, '12 m s⁻¹', 'lbl mono strong');
      s += body(520, 310, 24) + arrow(484, 310, 396, 310, 'brand-accent', 5) + text(440, 282, '8.0 m s⁻¹', 'lbl mono strong');
      s += arrow(638, 225, 528, 225, 'brand-primary', 5) + text(584, 200, 'F', 'lbl display') + text(572, 258, 'on the ball', 'lbl small');
      s += arrow(300, 420, 420, 420, 'text-secondary', 2.5) + text(436, 428, 'positive', 'lbl small', 'start');
      return svg('0 0 800 460', s, 'A ball moves towards a wall at 12 metres per second and rebounds at 8.0 metres per second. The force of the wall on the ball points away from the wall. Towards the wall is taken as positive');
    },

    // data-kind chooses the bodies (COLLISIONS); with data-plain it is the small picture for part 4.
    // On its slide the two rows are the still picture (thumbnails, print, reduced motion) and the
    // single track is played by one press of →.
    collide: el => {
      const on = labelled(el), set = COLLISIONS[el.dataset.kind] || COLLISIONS.general;
      const rows = trackRow(180, set.bodies, 0, on) + trackRow(390, set.bodies, 2, on);
      if (!on) return svg('0 0 800 460', rows, set.label);
      const still = rows + `<text x="26" y="110" class="lbl mono" text-anchor="middle" transform="rotate(-90 26 110)">BEFORE</text><text x="26" y="320" class="lbl mono" text-anchor="middle" transform="rotate(-90 26 320)">AFTER</text>`;
      return svg('0 0 800 460', `<g class="still">${still}</g><g class="mover">${trackPlay(300, set.bodies)}</g>`, set.label);
    },

    // Still picture and played picture, as for collide. The arrows stay where they are; the pucks move.
    // The collision is off-centre: at contact the line joining the centres lies along the heavier
    // puck's final velocity, 21.8° below x, because the force on it acts along that line. So the
    // lighter puck comes in along a line 23 above the other's centre (62 sin 21.8°, radii 28 + 34).
    'collide-2d': () => {
      const [a, b] = BODY_COLOURS;
      const puck = (x, y, r, colour) => ball(x, y, r, colour, '');
      let s = `<path d="M60,227 H342.4 M400,250 H770" class="guide"/>` + arrow(144, 227, 304, 227, a, 5) + text(236, 264, '5.0 m s⁻¹', 'lbl mono strong');
      s += arrow(70, 430, 140, 430, 'text-secondary', 2.5) + arrow(70, 430, 70, 360, 'text-secondary', 2.5) + text(154, 438, 'x', 'lbl mono', 'start') + text(70, 344, 'y', 'lbl mono');
      const after = `<path d="M510,250 A110,110 0 0 1 502.1,290.9" class="guide accent"/>` + arrow(342.4, 193, 342.4, 105, a, 5) + arrow(435.3, 264.1, 648, 349, b, 5) + text(362, 156, '2.0 m s⁻¹', 'lbl mono strong', 'start') + text(530, 356, 'v₂ = ?', 'lbl mono strong', 'end') + text(556, 284, 'θ', 'lbl greek');
      const ghost = (x, y, r, colour) => `<circle cx="${x}" cy="${y}" r="${r}" style="fill:none;stroke:var(--${colour});stroke-width:2.5;stroke-dasharray:5 6"/>`;
      let still = after + puck(110, 227, 28, a) + ghost(342.4, 227, 28, a) + ghost(400, 250, 34, b) + puck(342.4, 67, 28, a) + puck(688, 365, 34, b);
      still += text(110, 290, '2.0 kg', 'lbl mono') + text(400, 318, '3.0 kg', 'lbl mono') + text(400, 346, 'at rest', 'lbl small') + text(382, 76, '2.0 kg', 'lbl mono', 'start') + text(688, 428, '3.0 kg', 'lbl mono');
      let play = `<g class="post">${after}</g>`;
      play += `<g class="cbody" style="--x0:-232.4px;--y0:160px;--x1:0px;--y1:160px">${puck(342.4, 67, 28, a)}${text(342.4, 28, '2.0 kg', 'lbl mono')}</g>`;
      play += `<g class="cbody" style="--x0:-288px;--y0:-115px;--x1:-288px;--y1:-115px">${puck(688, 365, 34, b)}${text(688, 428, '3.0 kg', 'lbl mono')}<g class="pre">${text(688, 456, 'at rest', 'lbl small')}</g></g>`;
      play = `<g style="--t2:2.3s">${play}</g><g class="step k2"></g>`;
      return svg('0 0 800 460', `${s}<g class="still">${still}</g><g class="mover">${play}</g>`, 'Seen from above, a 2.0 kilogram puck moving at 5.0 metres per second along x strikes a 3.0 kilogram puck at rest off-centre, touching its upper left side. Afterwards the 2.0 kilogram puck moves at 2.0 metres per second along y, at right angles to its first direction, and the 3.0 kilogram puck moves off at an unknown speed v at angle theta below the x direction, along the line that joined the two centres at contact');
    },

    'ang-vel': () => {
      let s = `<circle cx="280" cy="270" r="190" class="orbit" style="stroke-width:2.5;stroke-opacity:.6"/><path d="M470,270 H280 L402.1,124.5" class="tick" style="fill:none"/>`;
      s += `<path d="M470,270 A190,190 0 0 0 402.1,124.5" style="fill:none;stroke:var(--brand-accent);stroke-width:7;stroke-linecap:round"/><path d="M350,270 A70,70 0 0 0 325,216.4" class="guide accent"/>`;
      s += arrow(402.1, 124.5, 290, 30.5, 'brand-primary', 5) + dot(280, 270) + body(402.1, 124.5, 18);
      s += text(376, 252, 'Δθ', 'lbl mono strong', 'start') + text(390, 304, 'r', 'lbl display') + text(354, 56, 'v', 'lbl display', 'start') + text(470, 180, 'arc = r Δθ', 'lbl mono', 'start');
      return svg('0 0 680 500', s, 'A body moving round a circle of radius r: as the radius turns through an angle delta theta the body moves along an arc of length r times delta theta, and its velocity v is along the tangent');
    },

    // data-vector="F" labels the inward arrow as the force; data-plain is the small picture for part 5.
    'circ-va': el => {
      const on = labelled(el), inward = el.dataset.vector || 'a';
      let s = `<circle cx="280" cy="270" r="180" class="orbit" style="stroke-width:2.5;stroke-opacity:.6"/>` + dot(280, 270);
      [60, 180, 300].forEach(deg => {
        const c = Math.cos(deg * Math.PI / 180), n = Math.sin(deg * Math.PI / 180), x = 280 + 180 * c, y = 270 - 180 * n;
        s += arrow(x, y, x - 110 * n, y - 110 * c, 'brand-accent', 5) + arrow(x, y, x - 92 * c, y + 92 * n, 'brand-primary', 5) + body(x, y, 17);
      });
      if (on) s += text(262, 52, 'v', 'lbl display', 'end') + text(340, 206, inward, 'lbl display', 'start') + text(280, 310, 'centre', 'lbl small');
      return svg('0 0 560 520', s, `A body shown at three points of a circular path: its velocity is along the tangent at each point and its ${inward === 'F' ? 'resultant force' : 'acceleration'} points towards the centre`);
    },

    conical: () => {
      let s = surface(130, 40, 330, 40) + `<line x1="230" y1="40" x2="230" y2="334" class="guide"/><ellipse cx="230" cy="334" rx="170" ry="34" class="guide"/><line x1="230" y1="40" x2="400" y2="334.4" class="cable"/>`;
      s += `<path d="M230,110 A70,70 0 0 0 265,100.6" class="guide accent"/><path d="M318,192.4 H390 M318,192.4 V317.1" class="guide"/>`;
      s += arrow(390, 317.1, 390, 198, 'brand-accent', 3.5, 'stroke-dasharray="9 7"') + arrow(390, 317.1, 324, 317.1, 'brand-accent', 3.5, 'stroke-dasharray="9 7"');
      s += body(400, 334.4, 20) + arrow(390, 317.1, 318, 192.4, 'brand-primary', 5) + arrow(400, 334.4, 400, 476, 'brand-primary', 5) + `<circle cx="400" cy="334.4" r="5" style="fill:var(--viewer-bg)"/>`;
      s += text(296, 214, 'T', 'lbl display', 'end') + text(418, 476, 'mg', 'lbl display', 'start') + text(418, 262, 'T cos θ', 'lbl mono', 'start') + text(330, 398, 'T sin θ', 'lbl mono') + text(254, 150, 'θ', 'lbl greek');
      return svg('0 0 560 520', s, 'A conical pendulum: a bob on a string moves in a horizontal circle with the string at angle theta to the vertical. The tension T is resolved into T cosine theta upwards, which balances the weight m g, and T sine theta towards the centre of the circle');
    },

    'vertical-circle': () => {
      let s = `<circle cx="280" cy="280" r="170" class="guide"/>` + dot(280, 280) + `<line x1="280" y1="110" x2="280" y2="450" class="cable" style="opacity:.35"/>`;
      s += arrow(256, 110, 176, 110, 'brand-accent', 4) + body(280, 110, 20) + arrow(267, 110, 267, 200, 'brand-primary', 5) + arrow(293, 127, 293, 206, 'brand-primary', 5);
      s += arrow(304, 450, 430, 450, 'brand-accent', 4) + body(280, 450, 20) + arrow(280, 430, 280, 306, 'brand-primary', 5) + arrow(280, 450, 280, 548, 'brand-primary', 5) + `<circle cx="280" cy="450" r="5" style="fill:var(--viewer-bg)"/>`;
      s += text(251, 196, 'mg', 'lbl display', 'end') + text(309, 196, sub('T', 'top'), 'lbl display', 'start') + text(298, 372, sub('T', 'bottom'), 'lbl display', 'start') + text(298, 544, 'mg', 'lbl display', 'start');
      s += text(280, 66, 'top', 'lbl small') + text(150, 458, 'bottom', 'lbl small') + text(176, 92, sub('v', 'top'), 'lbl display', 'end') + text(444, 440, sub('v', 'bottom'), 'lbl display', 'start');
      return svg('0 0 560 570', s, 'A ball on a string moving in a vertical circle. At the top the tension T top and the weight both act downwards, towards the centre. At the bottom the larger tension T bottom acts upwards, towards the centre, and the weight downwards; the ball moves faster at the bottom');
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
      // Bars take the deck palette, not the particle colours: they are amounts of energy, not particles.
      const bar = (x, y, w, colour, label, note) => `<rect x="${x}" y="${y}" width="${w}" height="68" rx="10" style="fill:var(--bar-${colour})"/>` + text(x + w / 2, y + 28, label, 'lbl strong', 'middle', `style="fill:var(--on-bar-${colour})"`) + text(x + w / 2, y + 59, note, 'lbl small', 'middle', `style="fill:var(--on-bar-${colour})"`);
      const sign = (x, y, t) => text(x, y, t, 'lbl display', 'middle', 'font-size="44"');
      let s = text(90, 38, 'Above the threshold: the photon has more than Φ', 'lbl strong a', 'start');
      s += bar(90, 54, 760, 'teal', 'photon energy hf', 'all of it goes to one electron');
      s += sign(54, 187, '=') + bar(90, 138, 430, 'slate', 'work function Φ', 'used up escaping the metal');
      s += sign(545, 187, '+') + bar(570, 138, 280, 'apricot', `kinetic energy E${sub('max')}`, 'what is left over');
      s += text(90, 286, 'Below the threshold: the photon has less than Φ', 'lbl strong a', 'start');
      s += `<rect x="90" y="302" width="430" height="68" rx="10" style="fill:none;stroke:var(--bar-slate);stroke-width:3;stroke-dasharray:8 7"/>`;
      s += bar(90, 302, 290, 'teal', 'photon energy hf', 'not enough') + text(450, 344, 'short', 'lbl italic small');
      s += `<line x1="90" y1="380" x2="90" y2="404" class="tick"/><line x1="520" y1="380" x2="520" y2="404" class="tick"/>` + arrow(100, 392, 512, 392, 'text-secondary', 2.5) + arrow(510, 392, 98, 392, 'text-secondary', 2.5);
      s += text(305, 428, 'work function Φ needed to escape', 'lbl small');
      s += text(700, 330, 'no electron escapes,', 'lbl strong') + text(700, 360, 'however bright the light', 'lbl');
      return svg('0 0 900 440', s, 'Energy of one photon: above the threshold frequency it equals the work function plus the kinetic energy of the electron; below the threshold it is less than the work function, so no electron escapes');
    },

    'emax-graph': () => {
      let s = arrow(110, 440, 110, 40, 'text-secondary', 2.5) + arrow(110, 300, 720, 300, 'text-secondary', 2.5);
      s += text(700, 336, 'frequency f', 'lbl mono', 'end') + text(126, 52, 'E<tspan dy="6" font-size="70%">max</tspan>', 'lbl mono', 'start');
      s += `<line x1="110" y1="420" x2="300" y2="300" class="guide"/><path d="M300,300 L660,72" class="curve" style="stroke:var(--brand-primary)"/>`;
      s += `<path d="M470,300 L700,154" class="curve" style="stroke:var(--text-secondary);stroke-width:3;stroke-dasharray:10 8"/>`;
      s += `<circle cx="300" cy="300" r="8" style="fill:var(--hl)"/>` + text(300, 338, 'f₀', 'lbl display', 'middle', 'style="fill:var(--hl)"') + text(300, 366, 'threshold', 'lbl mono small');
      s += `<circle cx="110" cy="420" r="8" style="fill:var(--hl)"/>` + text(96, 428, '−Φ', 'lbl display', 'end', 'style="fill:var(--hl)"');
      s += `<path d="M430,218 H560 V135" class="guide accent"/>` + text(520, 132, 'gradient = h', 'lbl strong', 'end');
      s += text(596, 262, 'another metal:', 'lbl small', 'start') + text(596, 288, 'same gradient', 'lbl small', 'start');
      s += text(205, 280, 'no emission', 'lbl italic small');
      return svg('0 0 800 460', s, 'Graph of maximum kinetic energy against frequency: a straight line of gradient h that meets the frequency axis at the threshold frequency and, extended back, the energy axis at minus the work function');
    },

    stopping: () => {
      let s = `<rect x="170" y="60" width="520" height="190" rx="95" class="inset"/>` + text(430, 48, 'evacuated tube', 'lbl mono small', 'middle');
      s += `<rect x="240" y="100" width="16" height="110" rx="4" style="fill:var(--aluminium)"/>` + text(226, 196, 'metal', 'lbl small', 'end');
      s += `<rect x="604" y="100" width="16" height="110" rx="4" style="fill:var(--lead)"/>` + text(634, 196, 'collector', 'lbl small', 'start');
      s += wave(90, 20, 232, 130, { cycles: 6, amp: 8 }) + text(46, 44, 'light', 'lbl mono small', 'middle', 'style="fill:var(--photon)"');
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
      s += text(115, 112, 'accelerating', 'lbl small') + text(115, 138, 'p.d. V', 'lbl small');
      s += `<line x1="160" y1="210" x2="300" y2="210" style="stroke:var(--electron)" stroke-width="4" stroke-dasharray="3 9" stroke-linecap="round"/>`;
      s += `<rect x="298" y="170" width="8" height="80" rx="3" style="fill:var(--text-main)"/>` + text(302, 300, 'thin graphite', 'lbl small');
      [-1, 1].forEach(k => { [52, 96].forEach(dy => { s += `<line x1="306" y1="210" x2="640" y2="${210 + k * dy}" style="stroke:var(--electron)" stroke-width="2" opacity=".5"/>`; }); });
      s += `<ellipse cx="640" cy="210" rx="26" ry="150" style="fill:color-mix(in srgb, var(--electron) 12%, var(--card-bg));stroke:var(--card-border)" stroke-width="2"/>`;
      s += `<circle cx="820" cy="210" r="120" style="fill:var(--spectrum-bg)"/>`;
      [44, 82].forEach(r => { s += `<circle cx="820" cy="210" r="${r}" style="fill:none;stroke:var(--sage)" stroke-width="9" opacity=".8"/>`; });
      s += `<circle cx="820" cy="210" r="9" style="fill:var(--sage)"/>` + text(820, 366, 'screen, seen face on', 'lbl small') + text(820, 394, 'bright rings', 'lbl strong');
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
      s += `<path d="${d}" class="curve" style="stroke:var(--brand-primary)"/>`;
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
      s += text(650, 50, 'scattered photon', 'lbl strong', 'start') + text(650, 82, 'longer wavelength λ<tspan dy="6" font-size="70%">f</tspan>', 'lbl small', 'start');
      s += `<path d="M${ex + 110},${ey} A110,110 0 0 0 ${f(ex + 110 * Math.cos(a))},${f(ey + 110 * Math.sin(a))}" class="guide accent"/>` + text(ex + 134, ey - 34, 'θ', 'lbl greek');
      s += arrow(ex + 18, ey + 12, ex + 250, ey + 130, 'electron', 4) + ball(ex, ey, 18, 'electron');
      s += text(884, ey + 166, 'recoiling electron', 'lbl strong', 'end') + text(884, ey + 194, 'gains kinetic energy', 'lbl mono small', 'end');
      s += text(ex - 8, ey + 98, 'electron, at rest', 'lbl small', 'end');
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
      // data-still (lesson maps): the still picture only, with nothing to play or press.
      const fixed = 'still' in el.dataset;
      if (reduce || fixed) el.querySelectorAll(fixed ? '.mover, .step.play' : '.mover').forEach(node => node.remove());
      if (fixed) el.querySelectorAll('.still').forEach(node => node.classList.remove('still'));
      // Lines that draw themselves in and shapes that pulse are motion too.
      if (fixed) el.querySelectorAll('.draw, .pulse').forEach(node => node.classList.remove('draw', 'pulse'));
    });
  }

  // Moving pictures drawn with SMIL. A figure shows .still in thumbnails, print and reduced motion
  // and .mover on screen. track() moves a group through points at equal time steps and anim()
  // changes one attribute; both loop unless { loop: false }, which waits for the figure's empty
  // PLAY step to be shown (deck.js then starts every animation with begin="indefinite").
  const timing = (dur, loop, extra) => `dur="${dur}s" ${loop ? 'repeatCount="indefinite"' : 'begin="indefinite" fill="freeze"'} ${extra}`;
  const track = (points, dur, { loop = true, extra = '' } = {}) => `<animateTransform attributeName="transform" type="translate" values="${points.map(([x, y]) => `${f(x)},${f(y)}`).join(';')}" ${timing(dur, loop, extra)}/>`;
  const anim = (attr, values, dur, { loop = true, extra = '' } = {}) => `<animate attributeName="${attr}" values="${values.join(';')}" ${timing(dur, loop, extra)}/>`;
  const spin = (cx, cy, dur, { turns = 1, loop = true, extra = '' } = {}) => `<animateTransform attributeName="transform" type="rotate" from="0 ${cx} ${cy}" to="${360 * turns} ${cx} ${cy}" ${timing(dur, loop, extra)}/>`;
  const twoState = (still, mover) => `<g class="still">${still}</g><g class="mover">${mover}</g>`;
  const PLAY = '<g class="step play"></g>';

  // A deck's own figures.js adds its diagrams with DeckFigures.add(parts => ({ name: el => svg }));
  // the shared drawing helpers arrive as parts. Prefix the names with the topic (d1-…).
  const PARTS = { svg, ball, cluster, shadow, arrow, fline, wave, text, ring, orbiter, seeded, animated, stepG, fly, axes, plot, shade, body, both, arcPoints, through, sampled, sub, box, dot, surface, labelled, spring, track, anim, spin, twoState, PLAY, f, TAU };
  const add = make => Object.assign(FIGURES, make(PARTS));

  window.DeckFigures = { render, orbitPoint, add };
})();
