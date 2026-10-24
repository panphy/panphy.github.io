// Diagrams for the E.4 Fission deck, added to the shared set in ../assets/figures.js. Protons
// are red and neutrons gray, as in E.1 and E.3; a nucleus drawn nucleon by nucleon has exactly
// the numbers its label gives, and one drawn as a plain sphere stands for the whole nucleus.
// Hot water and steam are red, cool water blue. Nothing here is terracotta: E.4 has no additional HL content.
window.DeckFigures.add(P => {
  const { svg, ball, cluster, arrow, text, sub, both, through, sampled, labeled, animated, stepG, track, anim, spin, twoState, PLAY, f, TAU } = P;
  const line = (d, color, width = 5, extra = '') => `<path d="${d}" style="fill:none;stroke:var(--${color});stroke-width:${width};stroke-linecap:round;stroke-linejoin:round" ${extra}/>`;
  const once = { loop: false };
  const neutron = (x, y, r = 11) => ball(x, y, r, 'neutron', '');
  // Shown or hidden from a given fraction of the run onwards.
  const appear = (at, dur) => anim('opacity', [0, 0, 1, 1], dur, { loop: false, extra: `keyTimes="0;${at};${at + 0.01};1"` });
  const vanish = (at, dur) => anim('opacity', [1, 1, 0, 0], dur, { loop: false, extra: `keyTimes="0;${at};${at + 0.01};1"` });
  // Stays put until `at`, then moves by (dx, dy).
  const leave = (dx, dy, at, dur) => track([[0, 0], [0, 0], [dx, dy]], dur, { loop: false, extra: `keyTimes="0;${at};1"` });
  // Binding energy per nucleon from the semi-empirical mass formula, in MeV, for the most stable nucleus of mass number A.
  const bind = A => { const Z = A / (2 + 0.015 * A ** (2 / 3)); return 15.75 - 17.8 / A ** (1 / 3) - 0.711 * Z * Z / A ** (4 / 3) - 23.7 * (A - 2 * Z) ** 2 / (A * A); };

  return {
    // Neutron-induced fission of uranium-235 into barium-141 and krypton-92. Played with →. Also the title picture.
    'e4-fission': el => {
      const on = labeled(el), cx = 330, cy = 250, T = 3.2, r = 11;
      const uranium = cluster(cx, cy, 92, 143, r), barium = cluster(0, 0, 56, 85, r), krypton = cluster(0, 0, 36, 56, r);
      const flights = [[230, -150], [250, 10], [210, 150]];
      let s = '';
      if (on) s += text(cx, 440, '²³⁵U', 'lbl strong') + text(cx, 476, 'absorbs a slow neutron', 'lbl');
      const after = `<g transform="translate(${cx - 150} ${cy - 60})">${barium}</g><g transform="translate(${cx + 150} ${cy + 70})">${krypton}</g>` + flights.map(([dx, dy]) => neutron(cx + dx * 0.9, cy + dy * 0.9)).join('');
      const still = after + (on ? text(cx - 150, cy + 60, '¹⁴¹Ba', 'lbl strong') + text(cx + 150, cy + 170, '⁹²Kr', 'lbl strong') + text(cx + 300, cy - 190, '3 neutrons', 'lbl', 'middle') + arrow(cx - 190, cy - 150, cx - 260, cy - 180, 'brand-accent', 5) + arrow(cx + 200, cy + 150, cx + 270, cy + 180, 'brand-accent', 5) : '');
      const mover = `<g transform="translate(40 ${cy})">${track([[40, cy], [cx - 90, cy], [cx - 90, cy]], T, { loop: false, extra: 'keyTimes="0;0.3;1"' })}${vanish(0.3, T)}${neutron(0, 0)}</g>` + `<g>${vanish(0.36, T)}${uranium}</g>`
        + `<g opacity="0">${appear(0.36, T)}<g transform="translate(${cx - 40} ${cy - 16})"><g>${leave(-110, -44, 0.36, T)}${barium}</g></g><g transform="translate(${cx + 40} ${cy + 20})"><g>${leave(110, 50, 0.36, T)}${krypton}</g></g>${flights.map(([dx, dy]) => `<g transform="translate(${cx} ${cy})"><g>${leave(dx * 0.9, dy * 0.9, 0.36, T)}${neutron(0, 0)}</g></g>`).join('')}</g>`
        + (on ? `<g opacity="0">${appear(0.9, T)}${text(cx - 150, cy + 60, '¹⁴¹Ba', 'lbl strong')}${text(cx + 150, cy + 170, '⁹²Kr', 'lbl strong')}${text(cx + 300, cy - 190, '3 neutrons', 'lbl', 'middle')}</g>` : '') + PLAY;
      return svg(on ? '20 30 680 470' : '60 50 600 420', s + twoState(still, mover), 'A slow neutron is absorbed by a uranium-235 nucleus, which splits into two smaller nuclei, barium-141 and krypton-92, moving apart at high speed, together with three fast neutrons');
    },

    // Binding energy per nucleon against nucleon number: fission moves a heavy nucleus up the curve,
    // shown by an arrow running parallel to the curve just above it.
    'e4-curve': () => {
      const X = A => 110 + 2.75 * A, Y = b => 430 - 44 * (b - 0.5);
      let s = arrow(110, 430, 110, 30, 'text-secondary', 2.5) + arrow(110, 430, 810, 430, 'text-secondary', 2.5) + line(sampled(t => { const A = 6 + 236 * t; return [X(A), Y(bind(A))]; }, 120), 'brand-primary', 6);
      s += text(126, 46, 'binding energy per nucleon / MeV', 'lbl mono', 'start') + text(806, 506, 'nucleon number A', 'lbl mono', 'end') + [50, 100, 150, 200].map(A => `<line x1="${X(A)}" y1="430" x2="${X(A)}" y2="442" class="tick"/>` + text(X(A), 470, A, 'lbl mono')).join('') + [2, 4, 6, 8].map(b => `<line x1="98" y1="${Y(b)}" x2="110" y2="${Y(b)}" class="tick"/>` + text(88, Y(b) + 9, b, 'lbl mono', 'end')).join('');
      const mark = (A, color) => `<circle cx="${f(X(A))}" cy="${f(Y(bind(A)))}" r="11" style="fill:var(--${color})"/>`;
      s += mark(235, 'proton') + mark(141, 'brand-accent') + mark(92, 'brand-accent') + arrow(X(229), Y(bind(229)) - 34, X(147), Y(bind(147)) - 34, 'brand-accent', 4) + text(X(235), Y(bind(235)) + 50, '²³⁵U', 'lbl strong') + text(X(141), Y(bind(141)) + 50, '¹⁴¹Ba', 'lbl strong') + text(X(92), Y(bind(92)) + 50, '⁹²Kr', 'lbl strong') + text(X(150), 250, 'fission: the fragments are', 'lbl halo') + text(X(150), 284, 'more tightly bound', 'lbl strong halo');
      return svg('40 10 800 510', s, 'The curve of binding energy per nucleon against nucleon number. It rises steeply for light nuclei, peaks at about 8.8 MeV near nucleon number 60 and falls slowly to about 7.6 MeV for uranium. The two fragments of a fission lie higher on the curve than the uranium nucleus, at about 8.4 MeV: they are more tightly bound');
    },

    // A chain reaction, as in the Year 11 deck: each fission gives out three neutrons; two go on to
    // split more uranium-235 nuclei and one escapes. A whole sphere is uranium-235, a pair has just
    // split. Each press of → adds a generation. Also drawn plain.
    'e4-chain': el => {
      const on = animated(el), named = labeled(el);
      const whole = (x, y) => ball(x, y, 20, 'proton', '');
      const split = (x, y) => `<circle cx="${x}" cy="${y}" r="40" fill="url(#g-glow)"/>` + ball(x - 9, y - 11, 14, 'proton', '') + ball(x + 9, y + 12, 12, 'proton', '');
      const shot = (x1, y1, x2, y2, gap = 30) => {
        const len = Math.hypot(x2 - x1, y2 - y1), ux = (x2 - x1) / len, uy = (y2 - y1) / len;
        return arrow(x1 + ux * 28, y1 + uy * 28, x2 - ux * gap, y2 - uy * gap, 'neutron', 2.5) + ball(x1 + ux * len * 0.5, y1 + uy * len * 0.5, 7, 'neutron');
      };
      const escape = (x, y, dy) => `<g opacity=".55">${shot(x, y, x + 50, y + dy, 6)}</g>`;
      const g0 = [[130, 260]], g1 = [[360, 140], [360, 380]], g2 = [[590, 80], [590, 200], [590, 320], [590, 440]];
      const g3 = Array.from({ length: 8 }, (_, i) => [800, 50 + i * 60]);
      const next = (from, to) => to.map((p, i) => shot(...from[Math.floor(i / 2)], ...p)).join('');
      const label = (x, words) => named ? text(x, 512, words, 'lbl mono small') : '';
      let s = ball(28, 260, 8, 'neutron') + arrow(38, 260, 98, 260, 'neutron', 2.5) + split(...g0[0]) + escape(130, 260, -70) + label(130, '1 splits');
      const gen1 = next(g0, g1) + g1.map(p => split(...p) + escape(p[0], p[1], p[1] < 260 ? -60 : 60)).join('') + label(360, '2 split');
      const gen2 = next(g1, g2) + g2.map(p => split(...p)).join('') + label(590, '4 split');
      const gen3 = next(g2, g3) + g3.map(p => whole(...p)).join('') + label(800, '8 hit next');
      s += stepG(on, 1, gen1, 'wipe') + stepG(on, 2, gen2, 'wipe') + stepG(on, 3, gen3, 'wipe');
      return svg(named ? '0 20 860 510' : '0 20 860 480', s, 'A chain reaction: one uranium-235 nucleus splits and gives out three neutrons. Two of them split two more nuclei, whose neutrons split four, then eight; the third neutron from each fission escapes');
    },

    // A fast neutron losing speed in collisions with the nuclei of the moderator.
    'e4-moderator': () => {
      const pts = [[90, 250], [250, 150], [400, 320], [520, 200], [640, 300], [770, 250]], widths = [7, 5.5, 4.5, 3.5, 2.5];
      let s = `<rect x="200" y="70" width="480" height="360" rx="14" style="fill:color-mix(in srgb, var(--electron) 16%, transparent);stroke:var(--electron);stroke-width:3;stroke-dasharray:12 8"/>`;
      pts.slice(0, -1).forEach(([x, y], i) => { const [x2, y2] = pts[i + 1]; s += arrow(x, y, x2 - (x2 - x) * 0.08, y2 - (y2 - y) * 0.08, 'brand-accent', widths[i]); });
      s += pts.slice(1, -1).map(([x, y]) => ball(x, y, 22, 'electron', '')).join('') + neutron(pts[0][0], pts[0][1]) + neutron(pts[5][0], pts[5][1]);
      s += text(90, 200, 'fast', 'lbl strong') + text(90, 310, '~1 MeV', 'lbl mono') + text(770, 200, 'slow', 'lbl strong') + text(770, 310, '~0.03 eV', 'lbl mono') + text(440, 470, 'moderator: each collision takes some of the kinetic energy', 'lbl');
      return svg('20 40 840 450', s, 'A fast neutron enters the moderator and collides with one light nucleus after another. Each collision takes away some of its kinetic energy, so it leaves as a slow, thermal neutron');
    },

    // A pressurized-water reactor with its two water loops. Loop 1 is sealed and stays liquid under pressure: hot water
    // leaves the core, cools as it passes through the coil of the heat exchanger and is pumped back. Loop 2 boils round
    // the coil; its steam drives the turbine, is condensed by cooling water and is pumped back. On screen liquid water
    // flows as close dashes and steam as sparse, fast puffs; bubbles rise in the heat exchanger and the turbine turns.
    // The still picture keeps the arrowheads. Also drawn plain.
    'e4-reactor': el => {
      const on = labeled(el);
      const pipe = (d, paint, w = 14) => `<path d="${d}" style="fill:none;stroke:${paint};stroke-width:${w};stroke-opacity:.3;stroke-linecap:round;stroke-linejoin:round"/>`;
      const head = (x, y, deg, paint) => `<path d="M-9,-9 L8,0 L-9,9 Z" transform="translate(${x} ${y}) rotate(${deg})" style="fill:${paint}"/>`;
      // Dashes that run along a path: [dash, gap] and the time one pattern takes to pass.
      const flow = (d, paint, [dash, gap], dur, w = 7) => `<path d="${d}" style="fill:none;stroke:${paint};stroke-width:${w};stroke-linecap:round;stroke-dasharray:${dash} ${gap}">${anim('stroke-dashoffset', [dash + gap, 0], dur)}</path>`;
      const hot = 'var(--proton)', cool = 'var(--electron)', coil = 'url(#e4-coil)';
      const loop1 = through([[250, 250], [445, 250], [445, 295], [375, 295], [375, 340], [445, 340], [445, 385], [300, 385], [300, 445], [170, 445], [170, 420]]);
      const steam = 'M405,120 V92 H640 V170', exhaust = 'M640,290 V330', feed = 'M640,400 V445 H455 V418', cooling = 'M780,350 H605 V385 H780';
      // The coil fades from hot to cool as the water in it gives its energy to loop 2.
      let s = `<defs><linearGradient id="e4-coil" gradientUnits="userSpaceOnUse" x1="0" y1="255" x2="0" y2="380"><stop offset="0" style="stop-color:var(--proton)"/><stop offset="1" style="stop-color:var(--electron)"/></linearGradient></defs>`;
      // Shielding round the reactor vessel and heat exchanger.
      s += `<rect x="50" y="70" width="470" height="400" rx="18" style="fill:color-mix(in srgb, var(--neutron) 22%, transparent);stroke:var(--neutron);stroke-width:10"/>`;
      // Reactor vessel full of water (coolant and moderator), with fuel rods and control rods.
      s += `<rect x="90" y="170" width="160" height="250" rx="16" style="fill:color-mix(in srgb, var(--electron) 28%, var(--viewer-bg));stroke:var(--text-secondary);stroke-width:4"/>` + [115, 150, 185, 220].map(x => `<rect x="${x - 8}" y="260" width="16" height="130" rx="4" style="fill:var(--proton)"/>`).join('') + [132, 167, 202].map(x => `<rect x="${x - 6}" y="130" width="12" height="190" rx="3" style="fill:var(--text-main)"/>`).join('');
      // Heat exchanger: loop 2 water fills the lower part round the coil; steam collects above it.
      s += `<rect x="340" y="120" width="130" height="300" rx="30" style="fill:var(--viewer-bg);stroke:var(--text-secondary);stroke-width:4"/><path d="M342,215 H468 V390 A28,28 0 0 1 440,418 H370 A28,28 0 0 1 342,390 Z" style="fill:color-mix(in srgb, var(--electron) 22%, var(--viewer-bg))"/><line x1="342" y1="215" x2="468" y2="215" style="stroke:var(--electron);stroke-width:2"/>`;
      // Turbine, generator and condenser with its cooling water.
      s += `<path d="M600,170 H680 L700,290 H580 Z" style="fill:var(--card-bg);stroke:var(--text-secondary);stroke-width:4"/><rect x="720" y="196" width="140" height="70" rx="10" style="fill:var(--card-bg);stroke:var(--text-secondary);stroke-width:4"/><line x1="696" y1="230" x2="720" y2="230" style="stroke:var(--text-secondary);stroke-width:8"/><rect x="585" y="330" width="110" height="70" rx="10" style="fill:var(--card-bg);stroke:var(--text-secondary);stroke-width:4"/>`;
      s += pipe(loop1, coil) + pipe(steam, hot, 18) + pipe(exhaust, hot, 18) + pipe(feed, cool) + pipe(cooling, cool, 10);
      // Pumps drive both loops.
      const pump = (x, y, deg, paint) => `<circle cx="${x}" cy="${y}" r="17" style="fill:var(--card-bg);stroke:var(--text-secondary);stroke-width:4"/>` + head(x, y, deg, paint);
      s += pump(235, 445, 180, cool) + pump(560, 445, 180, cool);
      const blades = [0, 90, 180, 270].map(deg => `<ellipse cx="640" cy="212" rx="6" ry="17" transform="rotate(${deg} 640 230)" style="fill:var(--text-secondary)"/>`).join('') + '<circle cx="640" cy="230" r="6" style="fill:var(--text-main)"/>';
      const still = head(300, 250, 0, hot) + head(170, 445, 180, cool) + head(520, 92, 0, hot) + head(640, 312, 90, hot) + head(400, 445, 180, cool) + head(700, 385, 0, cool) + blades;
      const bubbles = [[358, 0], [392, 1.1], [425, 0.5], [455, 1.6], [408, 2.1], [374, 0.8]].map(([x, t]) => `<circle cx="${x}" cy="0" r="5" style="fill:var(--viewer-bg);stroke:var(--electron);stroke-width:2">${anim('cy', [395, 222], 2.4, { extra: `begin="-${t}s"` })}${anim('opacity', [0, 1, 1, 0], 2.4, { extra: `begin="-${t}s" keyTimes="0;0.15;0.85;1"` })}</circle>`).join('');
      const mover = flow(loop1, coil, [16, 12], 0.9) + flow(feed, cool, [16, 12], 0.9) + flow(cooling, cool, [12, 12], 1.2, 5) + flow(steam, hot, [7, 33], 0.35, 9) + flow(exhaust, hot, [7, 33], 0.35, 9) + bubbles + `<g>${spin(640, 230, 1.6)}${blades}</g>`;
      if (on) s += text(167, 115, 'control rods', 'lbl strong') + text(170, 505, 'fuel in moderator', 'lbl') + text(285, 54, 'shielding', 'lbl strong') + text(405, 505, 'heat exchanger', 'lbl') + text(295, 228, 'loop 1', 'lbl mono small', 'middle', 'style="fill:var(--proton)"') + text(700, 470, 'loop 2', 'lbl mono small', 'start', 'style="fill:var(--electron)"')
        + text(655, 128, 'steam', 'lbl', 'start', 'style="fill:var(--proton)"') + text(700, 162, 'turbine', 'lbl small', 'start') + text(790, 240, 'generator', 'lbl small') + text(705, 318, 'condenser', 'lbl small', 'start') + text(790, 362, 'cooling', 'lbl small', 'start') + text(790, 390, 'water', 'lbl small', 'start') + text(560, 495, 'water', 'lbl', 'middle', 'style="fill:var(--electron)"');
      return svg(on ? '30 20 850 500' : '40 50 840 440', s + twoState(still, mover), 'A pressurized-water reactor and its two separate water loops. Inside thick shielding, fuel rods sit in water, the moderator, in the reactor vessel, with control rods that can be lowered between them. In loop 1, water kept under high pressure so that it does not boil leaves the core hot, passes through a coil in the heat exchanger, cools as it heats the water round the coil and is pumped back to the core. In loop 2, the water round the coil boils; the steam drives a turbine joined to a generator, is turned back into water in a condenser cooled by outside water, and is pumped back to the heat exchanger. The two loops never mix');
    },

    // The activity of spent fuel falling with time: fission products first, then long-lived heavy nuclei.
    'e4-waste': () => {
      const X = p => 130 + 130 * p, Y = v => 420 - 330 * v;
      const fp = p => 0.92 * Math.exp(-(10 ** p) / 45), act = p => 0.08 * Math.exp(-(10 ** p) / 30000);
      let s = arrow(130, 420, 130, 40, 'text-secondary', 2.5) + arrow(130, 420, 810, 420, 'text-secondary', 2.5) + line(sampled(t => { const p = 5 * t; return [X(p), Y(fp(p) + act(p))]; }, 140), 'proton', 6) + line(sampled(t => { const p = 5 * t; return [X(p), Y(act(p))]; }, 100), 'brand-accent-strong', 3, 'stroke-dasharray="10 8"');
      s += text(146, 54, 'activity', 'lbl mono', 'start') + text(806, 496, 'time since removal / years', 'lbl mono', 'end') + [[0, '1'], [1, '10'], [2, '100'], [3, '1000'], [4, '10 000'], [5, '100 000']].map(([p, name]) => `<line x1="${X(p)}" y1="420" x2="${X(p)}" y2="432" class="tick"/>` + text(X(p), 460, name, 'lbl mono')).join('');
      s += text(X(1.2), Y(0.86), 'fission products:', 'lbl strong halo', 'start') + text(X(1.2), Y(0.86) + 34, 'most gone in a few centuries', 'lbl halo', 'start') + text(832, Y(0.22), 'plutonium and other heavy nuclei:', 'lbl strong halo', 'end') + text(832, Y(0.22) + 34, 'tens of thousands of years', 'lbl halo', 'end');
      return svg('60 20 780 500', s, 'A sketch of the activity of spent nuclear fuel against time on a logarithmic time axis from 1 year to 100 000 years. The activity is very high at first and falls quickly over the first few centuries as the fission products decay. A much smaller activity from long-lived heavy nuclei such as plutonium remains for tens of thousands of years');
    }
  };
});
