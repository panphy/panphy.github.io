// Diagrams for the B.4 Thermodynamics deck (higher level only), added to the shared set in
// ../assets/figures.js. On the pressure–volume diagrams an isothermal change is apricot, an
// adiabatic one terracotta, an isobaric one teal and an isovolumetric one slate; a hot reservoir
// is red and a cold one blue.
window.DeckFigures.add(P => {
  const { svg, arrow, text, sub, through, sampled, labelled, seeded, track, anim, twoState, PLAY, f } = P;
  // Pressure–volume axes, in arbitrary units: X(V) and Y(P) place a point.
  const X = v => 110 + 190 * v, Y = p => 420 - 60 * p;
  const pvAxes = on => arrow(110, 420, 110, 30, 'text-secondary', 2.5) + arrow(110, 420, 790, 420, 'text-secondary', 2.5) + (on ? text(126, 46, 'pressure', 'lbl mono', 'start') + text(784, 492, 'volume', 'lbl mono', 'end') : '');
  const path = (points, colour, width = 5) => `<path d="${through(points)}" style="fill:none;stroke:var(--${colour});stroke-width:${width};stroke-linecap:round;stroke-linejoin:round"/>`;
  // n points along PV^gamma = constant from volume v1 to v2, starting at pressure p1.
  const curve = (v1, p1, v2, gamma, n = 40) => Array.from({ length: n + 1 }, (_, i) => { const v = v1 + (v2 - v1) * i / n; return [X(v), Y(p1 * (v1 / v) ** gamma)]; });
  const head = (points, at, colour) => { const i = Math.max(1, Math.round((points.length - 1) * at)), [x, y] = points[i], [px, py] = points[i - 1]; return `<path d="M-11,-9 L9,0 L-11,9 Z" transform="translate(${f(x)} ${f(y)}) rotate(${f(Math.atan2(y - py, x - px) * 180 / Math.PI)})" style="fill:var(--${colour})"/>`; };
  const point = (v, p, label, dx = 14, dy = -12) => `<circle cx="${f(X(v))}" cy="${f(Y(p))}" r="8" style="fill:var(--text-main)"/>` + (label ? text(f(X(v)) + dx, f(Y(p)) + dy, label, 'lbl display', dx < 0 ? 'end' : 'start') : '');
  const once = { loop: false };

  // The Carnot cycle used on the slides: A→B and C→D are isothermal, B→C and D→A adiabatic.
  const G = 5 / 3, A = [0.8, 6.2], B = [2, 2.48], C = [3.4, 2.48 * (2 / 3.4) ** G], D = [1.36, 6.2 * (0.8 / 1.36) ** G];
  const CARNOT = [curve(A[0], A[1], B[0], 1), curve(B[0], B[1], C[0], G), curve(C[0], C[1], D[0], 1), curve(D[0], D[1], A[0], G)];

  return {
    // A gas in a cylinder pushes a piston out. Played with →. Also drawn small, with data-plain.
    'b4-piston': el => {
      const on = labelled(el), rand = seeded(11);
      const dots = Array.from({ length: 26 }, () => [150 + 300 * rand(), 170 + 180 * rand()]).map(([x, y]) => `<circle cx="${f(x)}" cy="${f(y)}" r="7" style="fill:var(--brand-primary)"/>`).join('');
      let s = `<path d="M130,150 H700 M130,370 H700 M130,150 V370" style="fill:none;stroke:var(--text-secondary);stroke-width:6;stroke-linecap:round"/>`;
      const gas = (w, extra = '') => `<rect x="134" y="154" width="${w}" height="212" style="fill:var(--brand-primary);opacity:.16">${extra}</rect>`;
      const piston = `<rect x="460" y="156" width="26" height="208" rx="4" style="fill:var(--brand-accent-strong)"/><rect x="486" y="250" width="200" height="20" style="fill:var(--brand-accent-strong)"/>`;
      const force = arrow(486, 210, 590, 210, 'brand-primary', 6) + (on ? text(540, 190, 'F = PA', 'lbl mono strong') : '');
      if (on) s += text(300, 130, 'gas at pressure P', 'lbl') + `<line x1="473" y1="380" x2="473" y2="440" class="guide"/><line x1="613" y1="380" x2="613" y2="440" class="guide"/>` + arrow(479, 426, 607, 426, 'brand-accent', 4) + text(543, 462, 'Δx', 'lbl display') + text(300, 462, 'piston of area A', 'lbl');
      const still = gas(466) + dots + `<g transform="translate(140 0)">${piston}${force}</g>`;
      const mover = gas(326, anim('width', [326, 466], 2.4, { loop: false, extra: 'calcMode="spline" keySplines=".3 0 .3 1" keyTimes="0;1"' })) + dots + `<g>${track([[0, 0], [140, 0]], 2.4, { loop: false, extra: 'calcMode="spline" keySplines=".3 0 .3 1" keyTimes="0;1"' })}${piston}${force}</g>` + PLAY;
      return svg(on ? '100 100 720 380' : '100 120 640 280', s + twoState(still, mover), 'A gas at pressure P in a cylinder pushes a piston of area A outwards through a distance delta x. The force on the piston is P times A, so the work done by the gas is P times the change in volume');
    },

    // The work done by a gas is the area under its path on a pressure–volume diagram.
    'b4-pv-area': () => {
      const pts = curve(0.8, 5.6, 3, 1.1);
      let s = `<path d="${through(pts)} L${X(3)},420 L${X(0.8)},420 Z" style="fill:var(--brand-primary);opacity:.2"/>` + pvAxes(true) + path(pts, 'brand-primary') + head(pts, 0.5, 'brand-primary');
      s += `<path d="M${X(0.8)},${f(pts[0][1])} V420 M${X(3)},${f(pts[40][1])} V420" class="guide"/>` + text(X(0.8), 456, sub('V', '1'), 'lbl mono') + text(X(3), 456, sub('V', '2'), 'lbl mono') + text(X(1.9), 360, 'area = work done', 'lbl strong halo') + text(X(1.9), 394, 'by the gas', 'lbl halo');
      return svg('40 20 780 490', s, 'A pressure–volume diagram for a gas expanding from volume V 1 to volume V 2 while its pressure falls. The shaded area under the curve is the work done by the gas');
    },

    // Four changes from the same starting state. data-show limits which are drawn; data-plain removes labels.
    'b4-processes': el => {
      const on = labelled(el), show = (el.dataset.show || 'isobaric,isovolumetric,isothermal,adiabatic').split(',');
      const start = [1.2, 5], kinds = {
        isobaric: { pts: [[X(1.2), Y(5)], [X(3.2), Y(5)]], colour: 'brand-primary', label: ['isobaric', X(3.2) - 6, Y(5) - 18, 'end'] },
        isovolumetric: { pts: [[X(1.2), Y(5)], [X(1.2), Y(1.2)]], colour: 'brand-accent-strong', label: ['isovolumetric', X(1.2) + 20, Y(1.3), 'start'] },
        isothermal: { pts: curve(1.2, 5, 3.2, 1), colour: 'brand-accent', label: ['isothermal', X(3.2) - 4, Y(1.875) - 20, 'end'] },
        adiabatic: { pts: curve(1.2, 5, 3.2, G), colour: 'hl', label: ['adiabatic', X(3.2) - 4, Y(0.975) + 44, 'end'] }
      };
      let s = pvAxes(on);
      show.forEach(name => { const k = kinds[name]; s += path(k.pts, k.colour) + head(k.pts, 0.55, k.colour) + (on ? text(f(k.label[1]), f(k.label[2]), k.label[0], 'lbl strong halo', k.label[3], `style="fill:var(--${k.colour === 'hl' ? 'hl-text' : k.colour})"`) : ''); });
      return svg('40 20 780 490', s + point(start[0], start[1], ''), 'A pressure–volume diagram showing four changes from the same starting state: an isobaric expansion along a horizontal line, an isovolumetric fall in pressure down a vertical line, an isothermal expansion along a curve, and an adiabatic expansion along a steeper curve');
    },

    // A rectangular cycle: the area enclosed is the net work done in one cycle.
    'b4-cycle': () => {
      const a = [1, 5], b = [3, 5], c = [3, 2], d = [1, 2], corners = [a, b, c, d].map(([v, p]) => [X(v), Y(p)]);
      let s = `<path d="${through(corners)} Z" style="fill:var(--brand-primary);opacity:.2"/>` + pvAxes(true) + `<path d="M110,${Y(5)} H${X(1)} M110,${Y(2)} H${X(1)} M${X(1)},${Y(2)} V420 M${X(3)},${Y(2)} V420" class="guide"/>`;
      [[a, b], [b, c], [c, d], [d, a]].forEach(([p, q]) => { const seg = [[X(p[0]), Y(p[1])], [(X(p[0]) + X(q[0])) / 2, (Y(p[1]) + Y(q[1])) / 2], [X(q[0]), Y(q[1])]]; s += path(seg, 'brand-primary') + head(seg, 0.6, 'brand-primary'); });
      s += point(1, 5, 'A', -14, -12) + point(3, 5, 'B') + point(3, 2, 'C', 14, 36) + point(1, 2, 'D', -14, 36);
      s += text(98, Y(5) + 9, '3.0', 'lbl mono', 'end') + text(98, Y(2) + 9, '1.0', 'lbl mono', 'end') + text(X(1), 456, '1.0', 'lbl mono') + text(X(3), 456, '4.0', 'lbl mono') + text(X(2), Y(3.5) + 10, 'net work', 'lbl strong');
      return svg('20 20 800 490', s, 'A pressure–volume diagram of a cycle A B C D round a rectangle, clockwise. The pressure is 3.0 along the top and 1.0 along the bottom, in units of 10 to the 5 pascals; the volume is 1.0 on the left and 4.0 on the right, in units of 10 to the minus 3 cubic metres. The shaded area inside the rectangle is the net work done by the gas in one cycle');
    },

    // A gas released into the empty half of a box. Played with →.
    'b4-expand': () => {
      const rand = seeded(5), n = 36;
      const from = Array.from({ length: n }, () => [110 + 250 * rand(), 110 + 260 * rand()]), to = Array.from({ length: n }, () => [110 + 560 * rand(), 110 + 260 * rand()]);
      const ball = `<circle r="9" style="fill:var(--brand-primary)"/>`;
      const frame = `<rect x="90" y="90" width="600" height="300" rx="8" style="fill:none;stroke:var(--text-secondary);stroke-width:5"/>`;
      const still = to.map(([x, y]) => `<g transform="translate(${f(x)} ${f(y)})">${ball}</g>`).join('') + `<line x1="390" y1="90" x2="390" y2="390" class="guide"/>`;
      const mover = from.map(([x, y], i) => `<g transform="translate(${f(x)} ${f(y)})">${track([[x, y], to[i]], 1.6 + rand(), once)}${ball}</g>`).join('') + `<line x1="390" y1="92" x2="390" y2="388" style="stroke:var(--text-secondary);stroke-width:5">${anim('opacity', [1, 0], 0.4, once)}</line>` + PLAY;
      return svg('60 60 660 420', frame + twoState(still, mover) + text(390, 440, 'It never goes back by itself', 'lbl strong'), 'A box with a partition down the middle and all the gas molecules in the left half. When the partition is removed the molecules spread out to fill the whole box, and they never gather in one half again by themselves');
    },

    // Four coins: the number of microstates for each number of heads. Also drawn small, with data-plain.
    'b4-coins': el => {
      const on = labelled(el), counts = [1, 4, 6, 4, 1];
      let s = `<line x1="90" y1="400" x2="760" y2="400" class="axis"/>`;
      counts.forEach((c, i) => {
        const x = 120 + i * 130;
        s += `<rect x="${x}" y="${400 - c * 50}" width="90" height="${c * 50}" rx="8" style="fill:var(--${i === 2 ? 'hl' : 'brand-primary'});opacity:${i === 2 ? 1 : 0.75}"/>`;
        if (on) s += text(x + 45, 388 - c * 50, c, 'lbl mono strong') + text(x + 45, 436, i, 'lbl mono');
      });
      if (on) s += text(425, 480, 'number of heads', 'lbl') + text(90, 60, 'number of microstates Ω', 'lbl', 'start') + text(770, 110, 'most likely:', 'lbl', 'end') + text(770, 144, '2 heads, 2 tails', 'lbl strong', 'end');
      return svg(on ? '60 20 760 480' : '90 80 690 340', s, 'Bar chart for four coins. There is 1 way to get no heads, 4 ways to get one head, 6 ways to get two heads, 4 ways to get three heads and 1 way to get four heads: 16 microstates in all, with two heads and two tails the most likely');
    },

    // A heat engine between a hot and a cold reservoir. Also drawn small, with data-plain.
    'b4-engine': el => {
      const on = labelled(el);
      let s = `<rect x="250" y="40" width="300" height="80" rx="12" style="fill:var(--proton)"/><rect x="250" y="440" width="300" height="80" rx="12" style="fill:var(--electron)"/>`;
      s += `<path d="M340,120 V226 H460 V120 Z" style="fill:var(--proton);opacity:.55"/><path d="M364,334 V416 L340,416 L400,446 L460,416 L436,416 V334 Z" style="fill:var(--electron);opacity:.6"/>`;
      s += `<path d="M470,256 H600 V236 L650,280 L600,324 V304 H470 Z" style="fill:var(--brand-primary)"/>` + `<circle cx="400" cy="280" r="74" style="fill:var(--card-bg);stroke:var(--text-main);stroke-width:4"/>`;
      if (on) {
        s += text(400, 92, 'hot reservoir', 'lbl strong', 'middle', 'style="fill:#fff"') + text(400, 492, 'cold reservoir', 'lbl strong', 'middle', 'style="fill:#fff"') + text(400, 290, 'engine', 'lbl strong');
        s += text(236, 92, sub('T', 'h'), 'lbl display', 'end') + text(236, 492, sub('T', 'c'), 'lbl display', 'end') + text(320, 184, sub('Q', 'h'), 'lbl display', 'end') + text(320, 396, sub('Q', 'c'), 'lbl display', 'end') + text(664, 292, 'W', 'lbl display', 'start') + text(560, 360, 'useful work', 'lbl', 'middle');
      }
      return svg(on ? '150 20 620 520' : '220 20 460 520', s, 'A heat engine. Thermal energy Q h flows from a hot reservoir at temperature T h into the engine. The engine does useful work W and rejects a smaller amount of thermal energy Q c to a cold reservoir at temperature T c');
    },

    // The Carnot cycle, with a marker that goes round it. Also the title picture, with data-plain.
    'b4-carnot': el => {
      const on = labelled(el), colours = ['brand-accent', 'hl', 'brand-accent', 'hl'], all = CARNOT.flat();
      let s = `<path d="${through(all)} Z" style="fill:var(--brand-primary);opacity:.18"/>` + pvAxes(on);
      CARNOT.forEach((pts, i) => { s += path(pts, colours[i]) + head(pts, 0.55, colours[i]); });
      if (on) {
        s += point(A[0], A[1], 'A') + point(B[0], B[1], 'B') + point(C[0], C[1], 'C', 14, 34) + point(D[0], D[1], 'D', -14, 34);
        s += text(f(CARNOT[0][20][0]) + 18, f(CARNOT[0][20][1]) - 14, sub('T', 'h'), 'lbl display', 'start') + text(f(CARNOT[2][20][0]) - 14, f(CARNOT[2][20][1]) + 42, sub('T', 'c'), 'lbl display', 'end') + `<line x1="${X(1.7)}" y1="${Y(2.3)}" x2="${X(2.5)}" y2="${Y(3.5)}" class="guide"/>` + text(X(2.55), Y(3.6), 'area = net work', 'lbl strong', 'start');
        s += `<line x1="560" y1="80" x2="610" y2="80" style="stroke:var(--brand-accent);stroke-width:5"/>` + text(622, 89, 'isothermal', 'lbl', 'start') + `<line x1="560" y1="124" x2="610" y2="124" style="stroke:var(--hl);stroke-width:5"/>` + text(622, 133, 'adiabatic', 'lbl', 'start');
      }
      const marker = `<circle r="12" style="fill:var(--text-main);stroke:var(--viewer-bg);stroke-width:3"/>`;
      const [mx, my] = CARNOT[0][24];
      return svg(on ? '40 0 780 510' : '150 0 660 440', s + twoState(`<g transform="translate(${f(mx)} ${f(my)})">${marker}</g>`, `<g>${track(all, 8)}${marker}</g>`), 'The Carnot cycle on a pressure–volume diagram. From A to B the gas expands isothermally at the hot temperature. From B to C it expands adiabatically and cools. From C to D it is compressed isothermally at the cold temperature. From D to A it is compressed adiabatically and warms. The area enclosed is the net work done');
    }
  };
});
