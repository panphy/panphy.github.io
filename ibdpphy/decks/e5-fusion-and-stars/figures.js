// Diagrams for the E.5 Fusion and stars deck, added to the shared set in ../assets/figures.js.
// Protons are red and neutrons gray, as in E.1, E.3 and E.4. On the Hertzsprung–Russell diagram
// luminosity is plotted upwards and temperature falls from left to right, both on logarithmic
// scales. Gravity is slate and outward pressure apricot. Nothing here is terracotta.
window.DeckFigures.add(P => {
  const { svg, ball, cluster, arrow, text, sub, both, through, sampled, labeled, seeded, track, anim, twoState, PLAY, f, TAU } = P;
  const line = (d, color, width = 5, extra = '') => `<path d="${d}" style="fill:none;stroke:var(--${color});stroke-width:${width};stroke-linecap:round;stroke-linejoin:round" ${extra}/>`;
  const appear = (at, dur) => anim('opacity', [0, 0, 1, 1], dur, { loop: false, extra: `keyTimes="0;${at};${at + 0.01};1"` });
  const vanish = (at, dur) => anim('opacity', [1, 1, 0, 0], dur, { loop: false, extra: `keyTimes="0;${at};${at + 0.01};1"` });
  const disk = (x, y, r, color, extra = '') => `<circle cx="${x}" cy="${y}" r="${r}" style="fill:${color}" ${extra}/>`;
  // Measured binding energy per nucleon in MeV for a few nuclei, by nucleon number.
  const BE = [[1, 0], [2, 1.11], [3, 2.83], [4, 7.07], [6, 5.33], [7, 5.61], [9, 6.46], [12, 7.68], [16, 7.98], [20, 8.03], [24, 8.26], [40, 8.55], [56, 8.79], [90, 8.71], [140, 8.38], [208, 7.87], [238, 7.57]];
  // The Hertzsprung–Russell plane: temperature in kelvin and luminosity in units of the Sun's.
  const HX = T => 130 + 640 * (Math.log10(40000) - Math.log10(T)) / (Math.log10(40000) - Math.log10(2500)), HY = L => 440 - 380 * (Math.log10(L) + 4) / 10;
  const hrAxes = on => `<rect x="130" y="60" width="640" height="380" style="fill:var(--spectrum-bg);opacity:.06"/>` + arrow(130, 440, 130, 40, 'text-secondary', 2.5) + arrow(130, 440, 800, 440, 'text-secondary', 2.5) + (on ? text(146, 40, 'luminosity / L☉', 'lbl mono', 'start') + text(800, 506, 'surface temperature / K', 'lbl mono', 'end') + [[1e-4, '10⁻⁴'], [1e-2, '10⁻²'], [1, '1'], [1e2, '10²'], [1e4, '10⁴'], [1e6, '10⁶']].map(([L, name]) => `<line x1="118" y1="${f(HY(L))}" x2="130" y2="${f(HY(L))}" class="tick"/>` + text(108, f(HY(L)) + 9, name, 'lbl mono', 'end')).join('') + [40000, 20000, 10000, 5000, 2500].map(T => `<line x1="${f(HX(T))}" y1="440" x2="${f(HX(T))}" y2="452" class="tick"/>` + text(f(HX(T)), 478, T.toLocaleString('en').replace(',', ' '), 'lbl mono')).join('') : '');
  // A main sequence star's luminosity at temperature T: two straight pieces on the log–log plane, meeting at the Sun.
  const mainSeq = T => { const t = Math.log10(T / 5800); return 10 ** (t < 0 ? 10.3 * t : 6.5 * t); };
  const starColor = T => (T > 15000 ? '#8FB4FF' : T > 8000 ? '#CFE0FF' : T > 6200 ? '#FFF6D8' : T > 5000 ? '#FFE08A' : T > 4000 ? '#FFB45A' : '#FF7A45');
  const stars = () => {
    const rand = seeded(11), out = [], dot = (T, L, r = 5) => out.push(`<circle cx="${f(HX(T))}" cy="${f(HY(L))}" r="${r}" style="fill:${starColor(T)};stroke:var(--text-secondary);stroke-width:.8"/>`);
    for (let i = 0; i < 90; i++) { const T = 10 ** (Math.log10(2800) + rand() * (Math.log10(34000) - Math.log10(2800))); dot(T, mainSeq(T) * 10 ** ((rand() - 0.5) * 0.7)); }
    for (let i = 0; i < 26; i++) dot(3400 + rand() * 1700, 10 ** (1.4 + rand() * 1.5), 6);
    for (let i = 0; i < 14; i++) dot(10 ** (Math.log10(3300) + rand() * 0.8), 10 ** (4 + rand() * 1.6), 7);
    for (let i = 0; i < 18; i++) { const T = 6000 + rand() * 22000; dot(T, 1e-4 * (T / 5800) ** 4 * 10 ** ((rand() - 0.5) * 0.5), 4); }
    return out.join('');
  };

  return {
    // Deuterium and tritium fuse to helium-4 and a neutron. Played with →. Also drawn plain.
    'e5-fusion': el => {
      const on = labeled(el), cy = 240, r = 22, T = 3;
      const d = cluster(0, 0, 1, 1, r), t = cluster(0, 0, 1, 2, r), he = cluster(0, 0, 2, 2, r), n = ball(0, 0, r, 'neutron', '');
      const at = (x, y, body) => `<g transform="translate(${x} ${y})">${body}</g>`;
      const still = at(170, cy - 110, d) + at(170, cy + 110, t) + arrow(250, cy - 80, 330, cy - 30, 'text-secondary', 4) + arrow(250, cy + 80, 330, cy + 30, 'text-secondary', 4) + at(470, cy, he) + at(650, cy, n) + arrow(520, cy - 60, 580, cy - 100, 'brand-accent', 5) + arrow(690, cy + 30, 760, cy + 60, 'brand-accent', 5) + (on ? text(170, cy - 170, '²H', 'lbl strong') + text(170, cy + 190, '³H', 'lbl strong') + text(470, cy + 90, '⁴He', 'lbl strong') + text(650, cy + 70, 'neutron', 'lbl') : '');
      const mover = `<g transform="translate(110 ${cy - 6})">${track([[110, cy - 6], [380, cy - 6], [380, cy - 6]], T, { loop: false, extra: 'keyTimes="0;0.4;1"' })}${vanish(0.42, T)}${d}</g><g transform="translate(700 ${cy + 6})">${track([[700, cy + 6], [430, cy + 6], [430, cy + 6]], T, { loop: false, extra: 'keyTimes="0;0.4;1"' })}${vanish(0.42, T)}${t}</g>`
        + `<g opacity="0">${appear(0.42, T)}<g transform="translate(400 ${cy})">${track([[400, cy], [400, cy], [250, cy - 30]], T, { loop: false, extra: 'keyTimes="0;0.42;1"' })}${he}</g><g transform="translate(420 ${cy})">${track([[420, cy], [420, cy], [720, cy + 50]], T, { loop: false, extra: 'keyTimes="0;0.42;1"' })}${n}</g></g>`
        + (on ? `<g opacity="0">${appear(0.92, T)}${text(250, cy + 60, '⁴He', 'lbl strong')}${text(720, cy + 120, 'neutron', 'lbl')}</g>` + `<g>${vanish(0.1, T)}${text(110, cy - 60, '²H', 'lbl strong')}${text(700, cy + 100, '³H', 'lbl strong')}</g>` : '') + PLAY;
      return svg(on ? '60 30 760 420' : '80 60 720 360', twoState(still, mover), 'A deuterium nucleus, one proton and one neutron, and a tritium nucleus, one proton and two neutrons, fuse to make a helium-4 nucleus and a free neutron, which fly apart with a great deal of kinetic energy');
    },

    // Binding energy per nucleon: light nuclei gain by joining together.
    'e5-curve': () => {
      const X = A => 110 + (A <= 60 ? 6.4 * A : 384 + 1.7 * (A - 60)), Y = b => 430 - 42 * b;
      let s = arrow(110, 430, 110, 30, 'text-secondary', 2.5) + arrow(110, 430, 810, 430, 'text-secondary', 2.5) + line(through(BE.map(([A, b]) => [X(A), Y(b)])), 'brand-primary', 5);
      s += text(126, 46, 'binding energy per nucleon / MeV', 'lbl mono', 'start') + text(806, 506, 'nucleon number A', 'lbl mono', 'end') + [[20, '20'], [40, '40'], [60, '60'], [120, '120'], [240, '240']].map(([A, name]) => `<line x1="${f(X(A))}" y1="430" x2="${f(X(A))}" y2="442" class="tick"/>` + text(f(X(A)), 470, name, 'lbl mono')).join('') + [2, 4, 6, 8].map(b => `<line x1="98" y1="${Y(b)}" x2="110" y2="${Y(b)}" class="tick"/>` + text(88, Y(b) + 9, b, 'lbl mono', 'end')).join('');
      const mark = (A, b, name, dx, dy, color = 'brand-accent') => `<circle cx="${f(X(A))}" cy="${Y(b)}" r="10" style="fill:var(--${color})"/>` + text(f(X(A)) + dx, Y(b) + dy, name, 'lbl strong halo', dx < 0 ? 'end' : 'start');
      s += mark(2, 1.11, '²H', 16, 10) + mark(3, 2.83, '³H', 16, 10) + mark(4, 7.07, '⁴He', 16, -8) + mark(56, 8.79, '⁵⁶Fe: the peak', 10, 44, 'proton') + arrow(X(2) - 30, Y(1.6), X(4) - 34, Y(6.8), 'brand-accent', 5) + text(250, 330, 'fusion: light nuclei', 'lbl halo', 'start') + text(250, 364, 'climb the steep side', 'lbl strong halo', 'start');
      return svg('40 10 800 510', s, 'The curve of binding energy per nucleon against nucleon number, drawn from measured values. It rises very steeply for the lightest nuclei, from about 1 MeV for hydrogen-2 to 7 MeV for helium-4, peaks at 8.8 MeV at iron-56 and then falls slowly. Fusing light nuclei moves them up the steep side of the curve, releasing energy');
    },

    // Two protons approaching: too slow and they are turned back; fast enough and they get close enough to fuse.
    'e5-barrier': () => {
      const p = ball(0, 0, 22, 'proton', '+'), row = (y, reach, dur, title, note) => {
        const still = `<g transform="translate(${400 - reach} ${y})">${p}</g><g transform="translate(${400 + reach} ${y})">${p}</g>`;
        const mover = `<g>${track([[150, y], [400 - reach, y], [150, y]], dur)}${p}</g><g>${track([[650, y], [400 + reach, y], [650, y]], dur)}${p}</g>`;
        return twoState(still, mover) + text(400, y - 60, title, 'lbl strong') + text(400, y + 76, note, 'lbl');
      };
      return svg('100 40 600 440', row(150, 120, 3.2, 'cooler: slower protons', 'repelled before they get close') + row(360, 24, 1.6, 'hotter: faster protons', 'close enough for the strong force: fusion'), 'Two pairs of protons approaching each other. In a cooler gas they move slowly and their electric repulsion turns them back while they are still far apart. In a hotter gas they move fast enough to come within range of the strong nuclear force, and can fuse');
    },

    // The balance in a star: gravity pulling in, pressure pushing out. Also drawn plain.
    'e5-balance': el => {
      const on = labeled(el), cx = 400, cy = 250, R = 150;
      let s = `<circle cx="${cx}" cy="${cy}" r="${R + 34}" style="fill:var(--sand);opacity:.25"/><circle cx="${cx}" cy="${cy}" r="${R}" style="fill:var(--sand);stroke:var(--brand-accent);stroke-width:4"/><circle cx="${cx}" cy="${cy}" r="46" style="fill:var(--brand-accent);opacity:.7"/>`;
      for (let k = 0; k < 8; k++) { const a = k * TAU / 8 + 0.2, c = Math.cos(a), sn = Math.sin(a); s += k % 2 ? arrow(cx + (R + 70) * c, cy + (R + 70) * sn, cx + (R - 20) * c, cy + (R - 20) * sn, 'brand-accent-strong', 6) : arrow(cx + 70 * c, cy + 70 * sn, cx + (R + 50) * c, cy + (R + 50) * sn, 'proton', 6); }
      if (on) s += text(cx, cy + 10, 'fusion', 'lbl strong') + text(680, 150, 'gravity:', 'lbl strong', 'start') + text(680, 184, 'inwards', 'lbl', 'start') + text(680, 330, 'radiation and gas', 'lbl strong', 'start', 'style="fill:var(--proton)"') + text(680, 364, 'pressure: outwards', 'lbl', 'start');
      return svg(on ? '150 20 800 460' : '170 20 460 460', s, 'A star in equilibrium. Gravity pulls every part of the star inwards. The pressure of the hot gas and of the radiation from fusion in the core pushes outwards. When the two balance, the star keeps a steady size');
    },

    // The life of a star. data-kind: low (like the Sun) or high (a massive star). Sizes are not to scale.
    'e5-life': el => {
      const high = el.dataset.kind === 'high', y = 220;
      const stages = high ? [[130, 34, '#CFE0FF', 'main sequence', 'blue-white, brief'], [400, 92, '#FF7A45', 'red supergiant', 'fuses up to iron'], [680, 60, '#FFF6D8', 'supernova', 'the core collapses'], [950, 16, '#8C9AA6', 'neutron star', 'or a black hole']] : [[130, 30, '#FFE08A', 'main sequence', 'about 10¹⁰ years'], [400, 92, '#FF7A45', 'red giant', 'hydrogen runs out'], [680, 62, '#9FD3C7', 'planetary nebula', 'outer layers drift off'], [950, 14, '#EDEBE8', 'white dwarf', 'cools slowly']];
      let s = stages.map(([x, r, color, name, note], i) => (name === 'supernova' ? Array.from({ length: 12 }, (_, k) => `<line x1="${x}" y1="${y}" x2="${f(x + 84 * Math.cos(k * TAU / 12))}" y2="${f(y + 84 * Math.sin(k * TAU / 12))}" style="stroke:var(--brand-accent);stroke-width:4;stroke-linecap:round"/>`).join('') : name === 'planetary nebula' ? `<circle cx="${x}" cy="${y}" r="${r + 16}" style="fill:none;stroke:${color};stroke-width:10;opacity:.5"/>` : '') + `<circle cx="${x}" cy="${y}" r="${name === 'planetary nebula' ? 9 : name === 'supernova' ? 30 : r}" style="fill:${name === 'planetary nebula' ? '#EDEBE8' : color};stroke:var(--text-secondary);stroke-width:1.5"/>` + text(x, y + 136, name, 'lbl strong') + text(x, y + 168, note, 'lbl small') + (i < 3 ? arrow(x + (i === 0 ? 60 : 116), y, stages[i + 1][0] - (i === 0 ? 116 : i === 1 ? 104 : 44), y, 'text-secondary', 3) : '')).join('');
      return svg('0 100 1080 300', s, high ? 'The life of a massive star: a brief time on the main sequence as a hot blue-white star, then a red supergiant that fuses elements up to iron, then a supernova when its core collapses, leaving a neutron star or a black hole' : 'The life of a star like the Sun: about ten thousand million years on the main sequence, then a red giant when the hydrogen in its core runs out, then a planetary nebula as its outer layers drift away, leaving a white dwarf that slowly cools');
    },

    // The Hertzsprung–Russell diagram. data-kind: regions (default), radius (lines of constant radius) or track (the Sun's path). Also drawn plain.
    'e5-hr': el => {
      const on = labeled(el), kind = el.dataset.kind || 'regions';
      let s = hrAxes(on);
      // The instability strip: a narrow band running up and to the right from the main sequence.
      s += `<path d="M${f(HX(8200))},${f(HY(8))} L${f(HX(6600))},${f(HY(8))} L${f(HX(4700))},${f(HY(2e4))} L${f(HX(5900))},${f(HY(2e4))} Z" style="fill:var(--brand-primary);opacity:.22"/>` + stars();
      if (kind === 'radius') {
        [0.01, 1, 100].forEach(R => { const L = T => R * R * (T / 5800) ** 4, hot = Math.min(40000, 5800 * (1e6 / (R * R)) ** 0.25), cool = Math.max(2500, 5800 * (1e-4 / (R * R)) ** 0.25); s += line(`M${f(HX(hot))},${f(HY(L(hot)))} L${f(HX(cool))},${f(HY(L(cool)))}`, 'brand-accent', 3, 'stroke-dasharray="10 8"'); });
        if (on) s += text(HX(12000), HY(1e4 * (12000 / 5800) ** 4) - 14, '100 R☉', 'lbl mono strong halo') + text(HX(22000), HY((22000 / 5800) ** 4) - 14, '1 R☉', 'lbl mono strong halo') + text(HX(30000), HY(1e-4 * (30000 / 5800) ** 4) - 14, '0.01 R☉', 'lbl mono strong halo');
      } else if (kind === 'track') {
        const path = [[5800, 1], [5600, 2], [5000, 4], [4500, 30], [3800, 800], [3500, 2500], [5000, 60], [4300, 400], [3300, 4000], [9000, 3000], [30000, 800], [30000, 3], [14000, 0.01], [7000, 0.0006]];
        const pts = path.map(([T, L]) => [HX(T), HY(L)]), dot = `<circle r="11" style="fill:var(--brand-accent);stroke:var(--text-main);stroke-width:2"/>`;
        s += line(through(pts), 'brand-accent', 3, 'stroke-dasharray="4 8"') + twoState(`<g transform="translate(${f(pts[0][0])} ${f(pts[0][1])})">${dot}</g>`, `<g>${track(pts, 12)}${dot}</g>`);
        if (on) s += text(HX(5800) - 16, HY(1) + 34, 'now', 'lbl strong halo', 'end') + text(HX(3500) + 6, HY(6000), 'red giant', 'lbl strong halo', 'end') + text(HX(9000), HY(5e-4), 'white dwarf', 'lbl strong halo', 'start');
      } else if (on) s += text(HX(20000), HY(40), 'main sequence', 'lbl strong halo', 'middle') + text(HX(3900), HY(18), 'red giants', 'lbl strong halo', 'middle') + text(HX(9000), HY(5e5), 'supergiants', 'lbl strong halo', 'middle') + text(HX(16000), HY(4e-4), 'white dwarfs', 'lbl strong halo', 'middle') + text(HX(8400), HY(1500), 'instability strip', 'lbl small halo', 'middle') + `<circle cx="${f(HX(5800))}" cy="${f(HY(1))}" r="10" style="fill:none;stroke:var(--text-main);stroke-width:3"/>` + text(HX(5800) + 16, HY(1) + 34, 'Sun', 'lbl strong halo', 'start');
      return svg(on ? '10 10 810 510' : '110 40 680 420', s, kind === 'radius' ? 'A Hertzsprung–Russell diagram with dashed lines of constant radius, which slope down from upper left to lower right. White dwarfs lie near the line for a hundredth of the Sun’s radius, the Sun on the line for one solar radius, and red giants and supergiants near and above the line for a hundred solar radii' : kind === 'track' ? 'A Hertzsprung–Russell diagram showing the path of a star like the Sun during its life: from the main sequence, up and to the right to become a red giant, then across to the left and steeply down to end as a white dwarf' : 'A Hertzsprung–Russell diagram: luminosity plotted upwards against surface temperature, which decreases to the right. Most stars lie on the main sequence, a band from hot, luminous stars at the upper left to cool, faint stars at the lower right. Red giants lie above it on the right, supergiants across the top and white dwarfs at the lower left. The instability strip is a narrow band crossing the diagram above the main sequence');
    },

    // Stellar parallax: a nearby star seems to shift against distant stars as the Earth goes round the Sun.
    'e5-parallax': () => {
      const sx = 140, cy = 260, a = 90, star = [520, cy], bg = 820, T = 6;
      const earth = t => [sx + 22 * Math.cos(TAU * t), cy - a * Math.sin(TAU * t)], seen = t => { const [ex, ey] = earth(t); return cy + (cy - ey) * (bg - star[0]) / (star[0] - ex); };
      let s = `<ellipse cx="${sx}" cy="${cy}" rx="22" ry="${a}" class="orbit"/>` + disk(sx, cy, 20, 'var(--sand)', 'stroke="var(--brand-accent)" stroke-width="3"') + disk(star[0], star[1], 11, '#FFE08A', 'stroke="var(--text-secondary)" stroke-width="1.5"') + `<line x1="${bg}" y1="70" x2="${bg}" y2="450" class="tick"/>` + [100, 170, 215, 310, 365, 420].map(y => disk(bg + 26, y, 5, 'var(--text-secondary)')).join('');
      s += line(`M${sx},${cy - a} L${star[0]},${cy} L${sx},${cy + a}`, 'text-secondary', 1.5, 'stroke-dasharray="5 6"') + `<line x1="${sx}" y1="${cy}" x2="${star[0]}" y2="${cy}" class="guide"/>` + `<path d="M${star[0] - 150},${cy} A150,150 0 0 1 ${f(star[0] - 150 * Math.cos(Math.atan2(a, star[0] - sx)))},${f(cy - 150 * Math.sin(Math.atan2(a, star[0] - sx)))}" class="guide accent"/>`;
      s += text(star[0] - 170, cy - 16, 'p', 'lbl display italic', 'end') + both(sx - 50, cy - a, sx - 50, cy) + text(sx - 64, cy - a / 2 + 8, '1 AU', 'lbl mono', 'end') + text(sx, cy + a + 50, 'Sun and Earth’s orbit', 'lbl') + text(star[0], cy + 50, 'nearby star', 'lbl') + text(bg + 20, 44, 'distant stars', 'lbl', 'end') + both(sx, 470, star[0], 470) + text((sx + star[0]) / 2, 506, 'd', 'lbl display italic');
      const planet = disk(0, 0, 9, 'var(--electron)');
      const still = `<g transform="translate(${sx} ${cy - a})">${planet}</g><line x1="${sx}" y1="${cy - a}" x2="${bg}" y2="${f(seen(0.25))}" style="stroke:var(--brand-accent);stroke-width:2.5"/>` + disk(bg, f(seen(0.25)), 8, 'var(--brand-accent)');
      const n = 48, ts = Array.from({ length: n + 1 }, (_, i) => i / n);
      const mover = `<line x2="${bg}" style="stroke:var(--brand-accent);stroke-width:2.5" x1="${sx + 22}" y1="${cy}" y2="${cy}">${anim('x1', ts.map(t => f(earth(t)[0])), T)}${anim('y1', ts.map(t => f(earth(t)[1])), T)}${anim('y2', ts.map(t => f(seen(t))), T)}</line><g>${track(ts.map(earth), T)}${planet}</g><g>${track(ts.map(t => [bg, seen(t)]), T)}${disk(0, 0, 8, 'var(--brand-accent)')}</g>`;
      return svg('-40 0 940 530', s + twoState(still, mover), 'Stellar parallax. As the Earth moves round the Sun, a nearby star is seen from slightly different directions and appears to shift back and forth against the very distant stars behind it. The parallax angle p is the angle at the star between the Sun and the Earth when they are one astronomical unit apart across the line of sight');
    }
  };
});
