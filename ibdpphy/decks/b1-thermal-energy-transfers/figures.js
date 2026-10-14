// Diagrams for the B.1 Thermal energy transfers deck, added to the shared set in
// ../assets/figures.js. Hot is red and cold is blue; particles are teal, energy transfers
// apricot. Nothing here is terracotta, because B.1 has no additional higher level content.
window.DeckFigures.add(P => {
  const { svg, arrow, text, sub, through, sampled, labelled, seeded, track, anim, twoState, PLAY, f, TAU } = P;
  const line = (d, colour, width = 5, extra = '') => `<path d="${d}" style="fill:none;stroke:var(--${colour});stroke-width:${width};stroke-linecap:round;stroke-linejoin:round" ${extra}/>`;
  const atom = (r, colour = 'brand-primary') => `<circle r="${r}" style="fill:var(--${colour})"/>`;
  const at = (x, y, body) => `<g transform="translate(${f(x)} ${f(y)})">${body}</g>`;
  const tri = u => { const v = ((u % 2) + 2) % 2; return v < 1 ? v : 2 - v; };
  // A particle that shakes about its place for ever: amp is the size of the shaking.
  const shaker = (x, y, r, amp, rand, colour, dur = 0.5) => {
    const a = rand() * TAU, pts = Array.from({ length: 9 }, (_, i) => [amp * Math.cos(a + i * 2.4), amp * Math.sin(a * 1.7 + i * 1.9)]);
    pts[8] = pts[0];
    return at(x, y, `<g>${track(pts, f(dur * (0.8 + 0.4 * rand())))}${atom(r, colour)}</g>`);
  };
  const boxOf = (x, y, w, h) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="10" style="fill:var(--card-bg);stroke:var(--text-secondary);stroke-width:3"/>`;
  // Planck's law for wavelength l in micrometres (the axis is labelled in nm) and temperature T in kelvin, in arbitrary units.
  const planck = (l, T) => 1 / (l ** 5 * (Math.exp(14388 / (l * T)) - 1));

  return {
    // Solid, liquid and gas as particles. Also the title picture, with data-plain.
    'b1-states': el => {
      const on = labelled(el), rand = seeded(7), r = 13, w = 230, h = 230, y0 = 110, xs = [40, 310, 580];
      let s = xs.map(x => boxOf(x, y0, w, h)).join('');
      if (on) s += ['solid', 'liquid', 'gas'].map((name, i) => text(xs[i] + w / 2, 80, name, 'lbl strong')).join('') + ['fixed places:', 'close, no pattern:', 'far apart:'].map((t, i) => text(xs[i] + w / 2, 386, t, 'lbl')).join('') + ['they vibrate', 'they slide past', 'fast and free'].map((t, i) => text(xs[i] + w / 2, 420, t, 'lbl')).join('');
      const solid = Array.from({ length: 36 }, (_, i) => [xs[0] + 32 + (i % 6) * 33, y0 + 32 + Math.floor(i / 6) * 33]);
      const liquid = Array.from({ length: 30 }, (_, i) => [xs[1] + 30 + (i % 6) * 34 + (rand() - 0.5) * 16, y0 + 78 + Math.floor(i / 6) * 31 + (rand() - 0.5) * 12]);
      const gas = Array.from({ length: 7 }, () => ({ a: 1 + Math.floor(rand() * 2), b: 1 + Math.floor(rand() * 2), p: rand() * 2, q: rand() * 2 }));
      const gasAt = (g, t) => [xs[2] + r + (w - 2 * r) * tri(g.p + 2 * g.a * t), y0 + r + (h - 2 * r) * tri(g.q + 2 * g.b * t)];
      const still = solid.map(([x, y]) => at(x, y, atom(r))).join('') + liquid.map(([x, y]) => at(x, y, atom(r))).join('') + gas.map(g => at(...gasAt(g, 0.37), atom(r))).join('');
      const drift = ([x, y]) => { const a = rand() * TAU, pts = Array.from({ length: 13 }, (_, i) => [9 * Math.cos(a + i * TAU / 12) + 5 * Math.sin(2 * a + i * TAU / 6), 6 * Math.sin(a + i * TAU / 12)]); return at(x, y, `<g>${track(pts, f(2.4 + rand()))}${atom(r)}</g>`); };
      const mover = solid.map(([x, y]) => shaker(x, y, r, 3, rand, 'brand-primary')).join('') + liquid.map(drift).join('') + gas.map(g => `<g>${track(Array.from({ length: 81 }, (_, i) => gasAt(g, i / 80)), 7)}${atom(r)}</g>`).join('');
      return svg(on ? '20 40 810 400' : '20 90 810 270', s + twoState(still, mover), 'Three boxes of particles. In the solid they sit in a regular pattern and vibrate about fixed places. In the liquid they are just as close but have no pattern and slide past each other. In the gas they are far apart and move quickly in all directions');
    },

    // The Kelvin and Celsius scales side by side.
    'b1-scales': () => {
      const Y = k => 470 - k, marks = [[0, 'absolute zero'], [273, 'ice melts'], [373, 'water boils']];
      let s = `<line x1="330" y1="${Y(0)}" x2="330" y2="50" class="tick" style="stroke-width:5"/><line x1="470" y1="${Y(0)}" x2="470" y2="50" class="tick" style="stroke-width:5"/>` + text(330, 30, 'kelvin', 'lbl strong') + text(470, 30, 'Celsius', 'lbl strong');
      marks.forEach(([k, name]) => { s += `<line x1="310" y1="${Y(k)}" x2="490" y2="${Y(k)}" class="guide accent"/>` + text(296, Y(k) + 10, `${k} K`, 'lbl mono strong', 'end') + text(504, Y(k) + 10, `${k - 273} °C`, 'lbl mono strong', 'start') + text(170, Y(k) + 10, name, 'lbl', 'end'); });
      s += P.both(640, Y(273), 640, Y(373)) + text(656, Y(323) - 6, '100 K apart,', 'lbl', 'start') + text(656, Y(323) + 28, '100 °C apart', 'lbl', 'start');
      return svg('-30 0 880 500', s, 'The Kelvin and Celsius temperature scales side by side. Absolute zero is 0 kelvin and minus 273 degrees Celsius; ice melts at 273 kelvin and 0 degrees Celsius; water boils at 373 kelvin and 100 degrees Celsius. A change of 100 kelvin is the same as a change of 100 degrees Celsius');
    },

    // A hot block and a cold block in contact, and their temperatures against time. Played with →.
    'b1-equilibrium': () => {
      const hot = t => 110 + 80 * (1 - Math.exp(-3 * t)), cold = t => 380 - 190 * (1 - Math.exp(-3 * t)), gx = t => 470 + 380 * t;
      let s = `<rect x="60" y="170" width="150" height="150" rx="8" style="fill:color-mix(in srgb, var(--proton) 55%, var(--viewer-bg));stroke:var(--proton);stroke-width:3"/><rect x="210" y="170" width="150" height="150" rx="8" style="fill:color-mix(in srgb, var(--electron) 45%, var(--viewer-bg));stroke:var(--electron);stroke-width:3"/>`;
      s += text(135, 150, 'hot', 'lbl strong') + text(285, 150, 'cold', 'lbl strong') + arrow(150, 245, 270, 245, 'brand-accent', 7) + text(210, 370, 'thermal energy', 'lbl') + text(210, 404, 'flows hot to cold', 'lbl');
      s += P.axes(470, 420, 880, 60, 'time', 'temperature') + line(sampled(t => [gx(t), hot(t)], 50), 'proton') + line(sampled(t => [gx(t), cold(t)], 50), 'electron') + `<line x1="470" y1="190" x2="860" y2="190" class="guide"/>` + text(870, 300, 'same temperature:', 'lbl', 'end') + text(870, 334, 'thermal equilibrium', 'lbl strong', 'end');
      const dots = (a, b) => `<circle r="10" style="fill:var(--proton)" transform="translate(${f(gx(a))} ${f(hot(a))})"/><circle r="10" style="fill:var(--electron)" transform="translate(${f(gx(b))} ${f(cold(b))})"/>`;
      const run = (fn, colour) => `<g transform="translate(${gx(0)} ${fn(0)})">${track(Array.from({ length: 41 }, (_, i) => [gx(i / 40), fn(i / 40)]), 5, { loop: false })}<circle r="10" style="fill:var(--${colour})"/></g>`;
      return svg('30 30 880 440', s + twoState(dots(1, 1), run(hot, 'proton') + run(cold, 'electron') + PLAY), 'A hot block touching a cold block: thermal energy flows from the hot one to the cold one. A graph of temperature against time shows the hot block cooling and the cold block warming until both reach the same temperature, which is thermal equilibrium');
    },

    // Temperature against energy supplied for ice turned into steam: two flat parts. Also drawn plain.
    'b1-heating-curve': el => {
      const on = labelled(el), pts = [[120, 430], [180, 340], [330, 340], [450, 150], [720, 150], [790, 70]];
      let s = arrow(120, 470, 120, 40, 'text-secondary', 2.5) + arrow(120, 470, 830, 470, 'text-secondary', 2.5) + line(through(pts), 'brand-primary', 6);
      s += line(through(pts.slice(1, 3)), 'brand-accent', 8) + line(through(pts.slice(3, 5)), 'brand-accent', 8);
      if (on) {
        s += text(136, 54, 'temperature', 'lbl mono', 'start') + text(824, 506, 'energy supplied', 'lbl mono', 'end') + `<line x1="120" y1="340" x2="180" y2="340" class="guide"/><line x1="120" y1="150" x2="450" y2="150" class="guide"/>` + text(106, 350, '0 °C', 'lbl mono', 'end') + text(106, 160, '100 °C', 'lbl mono', 'end');
        s += text(255, 320, 'melting', 'lbl strong halo') + text(585, 130, 'boiling', 'lbl strong halo') + text(196, 420, 'ice', 'lbl halo', 'start') + text(410, 270, 'water', 'lbl halo', 'start') + text(770, 130, 'steam', 'lbl halo', 'start');
        s += text(585, 194, 'temperature constant', 'lbl small');
      }
      return svg(on ? '0 20 850 500' : '90 40 760 450', s, 'A graph of temperature against energy supplied for ice heated at a steady rate. The temperature rises while the ice warms, stays constant at 0 degrees Celsius while it melts, rises again as water, stays constant at 100 degrees Celsius while it boils, then rises as steam. The flat part for boiling is much longer than the flat part for melting');
    },

    // Measuring specific heat capacity with an electrical heater.
    'b1-heater': () => {
      let s = `<rect x="250" y="210" width="300" height="230" rx="6" style="fill:color-mix(in srgb, var(--neutron) 30%, var(--viewer-bg));stroke:var(--neutron);stroke-width:3"/>` + `<rect x="232" y="192" width="336" height="266" rx="14" style="fill:none;stroke:var(--brand-accent);stroke-width:5;stroke-dasharray:14 8"/>`;
      s += `<rect x="320" y="150" width="34" height="240" rx="8" style="fill:var(--proton)"/><rect x="452" y="110" width="16" height="270" rx="8" style="fill:var(--card-bg);stroke:var(--text-secondary);stroke-width:3"/><rect x="456" y="230" width="8" height="146" rx="4" style="fill:var(--proton)"/>`;
      s += `<path d="M337,150 V80 H190 V150 M170,150 H210 M180,164 H200 M190,164 V230 H232" class="cable"/>` + text(190, 60, 'power supply', 'lbl') + text(337, 130, 'heater', 'lbl strong halo', 'end') + text(480, 100, 'thermometer', 'lbl strong', 'start') + text(590, 300, 'metal block,', 'lbl', 'start') + text(590, 334, 'mass m', 'lbl', 'start') + text(590, 420, 'insulation', 'lbl', 'start');
      return svg('100 30 650 450', s, 'Apparatus for measuring specific heat capacity: an insulated metal block of known mass with an electrical heater in one hole and a thermometer in another. The energy supplied is the power of the heater times the time');
    },

    // Conduction along a bar between a hot body and a cold body. Also drawn plain.
    'b1-conduction': el => {
      // Animated: at first only the particles touching the hot body vibrate strongly. The strong
      // vibration is passed from each particle to the next, so it spreads along the bar until the
      // vibration falls steadily from the hot end to the cold end; then the loop starts again.
      const on = labelled(el), rand = seeded(3), cols = 12, rows = 3, x0 = 215, step = 34, T = 10, n = 200;
      let s = `<rect x="60" y="150" width="130" height="200" rx="8" style="fill:color-mix(in srgb, var(--proton) 55%, var(--viewer-bg));stroke:var(--proton);stroke-width:3"/><rect x="610" y="150" width="130" height="200" rx="8" style="fill:color-mix(in srgb, var(--electron) 45%, var(--viewer-bg));stroke:var(--electron);stroke-width:3"/><rect x="190" y="194" width="420" height="112" style="fill:var(--card-bg);stroke:var(--text-secondary);stroke-width:3"/>`;
      if (on) s += text(125, 130, 'hot', 'lbl strong') + text(675, 130, 'cold', 'lbl strong') + arrow(290, 150, 510, 150, 'brand-accent', 7) + text(400, 124, 'thermal energy', 'lbl') + P.both(194, 380, 606, 380) + text(400, 420, 'thickness Δx', 'lbl') + text(400, 470, 'particles pass on their vibration to their neighbours', 'lbl');
      const spots = Array.from({ length: cols * rows }, (_, i) => [x0 + (i % cols) * step, 216 + Math.floor(i / cols) * step, i % cols]);
      // The size of a particle's vibration: its final share of the gradient, reached once the front
      // has passed. The front takes 6 s to cross the bar; the last 4 s hold the steady state.
      const final = c => 7 - 5.5 * c / (cols - 1), small = 1.2;
      const size = (c, t) => { const u = Math.min(1, Math.max(0, (t * (cols + 1) / 6 - c) / 2)), k = u * u * (3 - 2 * u); return small + (final(c) - small) * k; };
      const warmth = (c, t) => (size(c, t) - small) / (7 - small);
      const still = spots.map(([x, y, c]) => at(x, y, atom(11) + `<circle r="11" style="fill:var(--proton);opacity:${f(0.7 * warmth(c, T))}"/>`)).join('');
      const mover = spots.map(([x, y, c]) => {
        const a = rand() * TAU, b = rand() * TAU, period = 0.36 + 0.12 * rand();
        const times = Array.from({ length: n + 1 }, (_, i) => i / n * T);
        const pts = times.map((tm, i) => { const A = i === n ? small : size(c, tm), w = TAU * tm / period; return [A * Math.cos(a + w), A * Math.sin(b + 1.3 * w)]; });
        pts[n] = pts[0];
        return at(x, y, `<g>${track(pts, T)}${atom(11)}<circle r="11" style="fill:var(--proton)" opacity="0">${anim('opacity', times.map(tm => f(0.7 * warmth(c, tm))).map((v, i) => (i === n ? 0 : v)), T)}</circle></g>`);
      }).join('');
      return svg(on ? '40 90 720 400' : '40 130 720 240', s + twoState(still, mover), 'A bar joining a hot body to a cold body. At first only the particles next to the hot body vibrate strongly. Each passes some of its vibration to its neighbour, so the strong vibration spreads along the bar towards the cold end while the particles stay in place, until the vibration falls steadily from the hot end to the cold end');
    },

    // A convection current in a heated liquid. Also drawn plain.
    'b1-convection': el => {
      const on = labelled(el);
      // The loop runs up the left side above the heater, across the top and down the right side.
      const way = t => { const a = TAU * t; return [400 - 150 * Math.cos(a), 270 - 120 * Math.sin(a)]; };
      let s = `<path d="M200,110 V420 H600 V110" style="fill:color-mix(in srgb, var(--electron) 14%, var(--viewer-bg));stroke:var(--text-secondary);stroke-width:5;stroke-linejoin:round"/><rect x="215" y="424" width="110" height="22" rx="6" style="fill:var(--proton)"/>`;
      s += `<ellipse cx="400" cy="270" rx="150" ry="120" class="guide"/>`;
      if (on) s += text(270, 482, 'heater', 'lbl') + text(180, 250, 'warm fluid:', 'lbl', 'end') + text(180, 284, 'less dense,', 'lbl', 'end') + text(180, 318, 'rises', 'lbl strong', 'end') + text(620, 250, 'cooler fluid:', 'lbl', 'start') + text(620, 284, 'denser,', 'lbl', 'start') + text(620, 318, 'sinks', 'lbl strong', 'start');
      // How cool the fluid is at a point of the loop (0 warm, 1 cool): warmest as it leaves the heater and
      // starts to rise, cooling gradually across the top and down the far side, coolest at the bottom,
      // then warming quickly as it passes back over the heater.
      const coolness = t => { const u = ((t % 1) + 1) % 1; return u < 0.75 ? u / 0.75 : (1 - u) / 0.25; };
      const n = 10, blob = k => `<circle r="13" style="fill:var(--proton)"/><circle r="13" style="fill:var(--electron);opacity:${f(coolness(k))}"/>`;
      const still = Array.from({ length: n }, (_, k) => at(...way(k / n), blob(k / n))).join('') + arrow(250, 300, 250, 220, 'proton', 5) + arrow(550, 240, 550, 320, 'electron', 5);
      const mover = Array.from({ length: n }, (_, k) => `<g>${track(Array.from({ length: 61 }, (_, i) => way(k / n + i / 60)), 8)}<circle r="13" style="fill:var(--proton)"/><circle r="13" style="fill:var(--electron)">${anim('opacity', Array.from({ length: 61 }, (_, i) => f(coolness(k / n + i / 60))), 8)}</circle></g>`).join('');
      return svg(on ? '-40 90 880 410' : '180 90 440 370', s + twoState(still, mover), 'A convection current in a liquid heated at the bottom on one side. The warm liquid above the heater expands, becomes less dense and rises; cooler, denser liquid sinks on the other side and moves in to take its place, so the liquid circulates');
    },

    // The inverse square law: the same power spread over a sphere of radius d, then 2d.
    'b1-inverse-square': () => {
      let s = `<circle cx="150" cy="260" r="34" style="fill:var(--sand);stroke:var(--brand-accent);stroke-width:4"/>` + text(150, 330, 'source,', 'lbl') + text(150, 362, 'luminosity L', 'lbl');
      const ray = y => `<line x1="150" y1="260" x2="760" y2="${y}" class="guide"/>`;
      s += [80, 200, 320, 440].map(ray).join('');
      // Arcs of the two spheres, radius d and 2d about the source: the power spreads over the whole of each.
      const arc = (r, deg) => { const a = deg * Math.PI / 180; return `<path d="M${f(150 + r * Math.cos(a))},${f(260 - r * Math.sin(a))} A${r},${r} 0 0 1 ${f(150 + r * Math.cos(a))},${f(260 + r * Math.sin(a))}" class="guide accent"/>`; };
      s += arc(270, 62) + arc(540, 26);
      const patch = (x, n) => { const h = (x - 150) * 360 / 610, y = 260 - h / 2; let g = `<rect x="${x - 5}" y="${f(y)}" width="10" height="${f(h)}" style="fill:var(--brand-primary);opacity:.85"/>`; for (let i = 1; i < n; i++) g += `<line x1="${x - 12}" y1="${f(y + h * i / n)}" x2="${x + 12}" y2="${f(y + h * i / n)}" class="tick"/>`; return g; };
      s += patch(420, 1) + patch(690, 2) + P.both(150, 470, 420, 470) + text(285, 506, 'd', 'lbl display') + P.both(150, 540, 690, 540) + text(420, 576, '2d', 'lbl display');
      s += text(420, 150, 'area A', 'lbl strong halo') + text(690, 60, 'area 4A', 'lbl strong halo') + text(420, 620, 'at 2d: a quarter of the brightness', 'lbl');
      return svg('60 20 760 620', s, 'Light spreading out from a source. The power that passes through an area A at a distance d is spread over an area 4A at a distance 2d, so the apparent brightness there is a quarter as great');
    },

    // Black-body spectra at three temperatures, from Planck's law. Also drawn plain.
    'b1-planck': el => {
      const on = labelled(el), temps = [[6000, 'proton'], [5000, 'brand-accent'], [4000, 'brand-primary']], top = planck(2898 / 6000, 6000);
      const X = l => 110 + 230 * l, Y = v => 440 - 380 * v / top;
      let s = `<rect x="${X(0.4)}" y="12" width="${X(0.7) - X(0.4)}" height="428" style="fill:var(--sand);opacity:.28"/>` + arrow(110, 440, 110, 30, 'text-secondary', 2.5) + arrow(110, 440, 840, 440, 'text-secondary', 2.5);
      temps.forEach(([T, colour]) => { s += line(sampled(t => { const l = 0.08 + 2.95 * t; return [X(l), Y(planck(l, T))]; }, 140), colour); if (on) { const l = 2898 / T; s += `<line x1="${f(X(l))}" y1="${f(Y(planck(l, T)))}" x2="${f(X(l))}" y2="440" class="guide"/>` + text(f(X(l)) + 30, f(Y(planck(l, T))) + 26, `${T} K`, 'lbl mono strong halo', 'start'); } });
      if (on) s += text(126, 44, 'intensity', 'lbl mono', 'start') + text(834, 530, 'wavelength / nm', 'lbl mono', 'end') + [0.5, 1, 1.5, 2, 2.5, 3].map(l => `<line x1="${X(l)}" y1="440" x2="${X(l)}" y2="450" class="tick"/>` + text(X(l), 478, l * 1000, 'lbl mono')).join('') + text(X(0.55), 0, 'visible', 'lbl small') + text(600, 300, 'hotter: more at every wavelength,', 'lbl halo') + text(600, 334, 'and a peak at a shorter wavelength', 'lbl halo');
      return svg(on ? '40 -30 820 580' : '90 30 760 420', s, 'Black-body spectra at 4000, 5000 and 6000 kelvin: graphs of intensity against wavelength. Each rises steeply to a peak and falls away slowly. The hotter the body, the higher the whole curve and the shorter the wavelength of its peak: about 720 nanometres at 4000 kelvin, 580 at 5000 and 480 at 6000');
    }
  };
});
