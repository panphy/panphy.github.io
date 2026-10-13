// Diagrams for the A.4 Rigid body mechanics deck (higher level only), added to the shared set in
// ../assets/figures.js. Forces are teal and velocities apricot, as in A.2, and every force arrow
// starts where the force acts: a weight at the centre of mass, a support force at the support,
// a tension where the string is attached. Bodies are slate; terracotta marks the turning
// effect (torques and angular quantities), since the whole topic is higher level only.
window.DeckFigures.add(P => {
  const { svg, arrow, text, sub, both, through, sampled, labelled, track, anim, spin, twoState, f, TAU } = P;
  const line = (d, colour, width = 5, extra = '') => `<path d="${d}" style="fill:none;stroke:var(--${colour});stroke-width:${width};stroke-linecap:round;stroke-linejoin:round" ${extra}/>`;
  const BODY = 'fill:color-mix(in srgb, var(--brand-accent-strong) 30%, var(--viewer-bg));stroke:var(--brand-accent-strong);stroke-width:3';
  const dot = (x, y, r = 7) => `<circle cx="${f(x)}" cy="${f(y)}" r="${r}" style="fill:var(--text-main)"/>`;
  const rad = deg => deg * Math.PI / 180;
  // An arc with an arrowhead, showing the sense of a rotation about (cx, cy). Angles in degrees, measured clockwise from the +x direction as SVG does.
  const turn = (cx, cy, r, a1, a2, colour = 'hl', width = 5) => { const p = a => [cx + r * Math.cos(rad(a)), cy + r * Math.sin(rad(a))], [x1, y1] = p(a1), [x2, y2] = p(a2), cw = a2 > a1, t = rad(a2) + (cw ? Math.PI / 2 : -Math.PI / 2); return `<path d="M${f(x1)},${f(y1)} A${r},${r} 0 ${Math.abs(a2 - a1) > 180 ? 1 : 0} ${cw ? 1 : 0} ${f(x2)},${f(y2)}" style="fill:none;stroke:var(--${colour});stroke-width:${width};stroke-linecap:round"/><path d="M12,0 L-10,-9 V9 Z" transform="translate(${f(x2)} ${f(y2)}) rotate(${f(t * 180 / Math.PI)})" style="fill:var(--${colour})"/>`; };
  const wheel = (r, spokes = 6) => `<circle r="${r}" style="${BODY}"/>` + Array.from({ length: spokes }, (_, k) => `<line x1="0" y1="0" x2="${f(r * Math.cos(k * TAU / spokes))}" y2="${f(r * Math.sin(k * TAU / spokes))}" style="stroke:var(--brand-accent-strong);stroke-width:4"/>`).join('') + `<circle cx="${f(r * 0.72)}" cy="0" r="10" style="fill:var(--brand-accent)"/><circle r="9" style="fill:var(--text-main)"/>`;
  const at = (x, y, body) => `<g transform="translate(${x} ${y})">${body}</g>`;

  return {
    // A wheel turning about a fixed axis. Labelled, it shows angular displacement. Also the title picture.
    'a4-wheel': el => {
      const on = labelled(el), cx = 400, cy = 250, r = 150;
      let s = '';
      if (on) s += `<line x1="${cx}" y1="${cy}" x2="${cx + r + 60}" y2="${cy}" class="guide"/><line x1="${cx}" y1="${cy}" x2="${f(cx + (r + 60) * Math.cos(rad(-50)))}" y2="${f(cy + (r + 60) * Math.sin(rad(-50)))}" class="guide"/>` + turn(cx, cy, r + 40, 0, -50) + text(cx + r + 70, cy - 70, 'Δθ', 'lbl greek', 'start') + text(cx, cy + r + 70, 'every point: the same angle', 'lbl');
      return svg(on ? '150 40 560 480' : '220 70 360 360', twoState(at(cx, cy, `<g transform="rotate(-50)">${wheel(r)}</g>`), at(cx, cy, `<g><animateTransform attributeName="transform" type="rotate" from="0" to="-360" dur="5s" repeatCount="indefinite"/>${wheel(r)}</g>`)) + s, 'A wheel turning about a fixed axis through its centre. A mark on the wheel has turned through an angular displacement delta theta; every point of the wheel turns through the same angle in the same time');
    },

    // The torque of a force on a spanner: force, distance from the axis and the angle between them.
    'a4-torque': () => {
      const px = 170, py = 330, L = 420, th = 55, ex = px + L, fx = ex + 150 * Math.cos(rad(-th)), fy = py + 150 * Math.sin(rad(-th));
      let s = `<rect x="${px - 20}" y="${py - 22}" width="${L + 40}" height="44" rx="20" style="${BODY}"/><path d="M${px},${py - 34} l30,17 v34 l-30,17 l-30,-17 v-34 Z" style="fill:var(--text-secondary)"/>` + dot(px, py) + arrow(ex, py, fx, fy, 'brand-primary', 6) + `<line x1="${ex}" y1="${py}" x2="${ex + 190}" y2="${py}" class="guide"/><path d="M${ex + 70},${py} A70,70 0 0 0 ${f(ex + 70 * Math.cos(rad(-th)))},${f(py + 70 * Math.sin(rad(-th)))}" class="guide accent"/>`;
      s += arrow(ex, py, ex, fy, 'brand-primary', 3, 'stroke-dasharray="8 7"') + text(ex + 90, py - 26, 'θ', 'lbl greek', 'start') + text(fx + 14, fy + 6, 'F', 'lbl display', 'start') + text(ex - 16, (py + fy) / 2, 'F sin θ', 'lbl mono', 'end') + both(px, py + 60, ex, py + 60) + text((px + ex) / 2, py + 100, 'r', 'lbl display italic') + text(px - 44, py + 10, 'axis', 'lbl', 'end') + turn(px, py, 76, -20, -150) + text(px - 90, py - 60, 'τ', 'lbl greek', 'end');
      return svg('20 110 780 360', s, 'A spanner turning a nut. A force F is applied at the end of the handle, a distance r from the axis, at an angle theta to the handle. Only the component of the force at right angles to the handle, F sine theta, turns the nut. The torque here is anticlockwise');
    },

    // Bodies in rotational equilibrium. data-kind: seesaw (two weights about a pivot) or plank (a loaded plank on two supports).
    'a4-beam': el => {
      const plank = el.dataset.kind === 'plank', y = 250;
      let s = `<rect x="110" y="${y - 12}" width="620" height="24" rx="6" style="${BODY}"/>`;
      if (plank) {
        s += `<path d="M130,${y + 12} l-26,60 h52 Z M710,${y + 12} l-26,60 h52 Z" style="fill:var(--text-secondary)"/>` + `<rect x="298" y="${y - 72}" width="70" height="60" rx="8" style="${BODY}"/>`;
        s += arrow(130, y + 12, 130, y - 110, 'brand-primary', 6) + arrow(710, y + 12, 710, y - 90, 'brand-primary', 6) + dot(420, y) + arrow(420, y, 420, y + 90, 'brand-primary', 6) + dot(333, y - 42, 6) + arrow(333, y - 42, 333, y + 150, 'brand-primary', 6);
        s += text(130, y - 124, sub('F', '1'), 'lbl display') + text(710, y - 104, sub('F', '2'), 'lbl display') + text(436, y + 96, '60 N', 'lbl mono', 'start') + text(349, y + 156, '200 N', 'lbl mono', 'start') + both(130, y + 200, 333, y + 200) + text(231, y + 236, '1.0 m', 'lbl mono') + both(130, y + 250, 710, y + 250) + text(420, y + 286, '3.0 m', 'lbl mono');
        return svg('60 80 720 470', s, 'A uniform plank 3.0 metres long and of weight 60 newtons rests on a support at each end. A 200 newton load sits 1.0 metre from the left-hand support. The supports push up with forces F 1 and F 2');
      }
      s += `<path d="M420,${y + 12} l-34,80 h68 Z" style="fill:var(--text-secondary)"/>` + `<rect x="150" y="${y - 92}" width="90" height="80" rx="8" style="${BODY}"/><rect x="600" y="${y - 62}" width="60" height="50" rx="8" style="${BODY}"/>`;
      s += dot(195, y - 52, 6) + arrow(195, y - 52, 195, y + 130, 'brand-primary', 6) + dot(630, y - 37, 6) + arrow(630, y - 37, 630, y + 80, 'brand-primary', 6) + arrow(420, y + 12, 420, y - 130, 'brand-primary', 6);
      s += text(211, y + 136, sub('W', '1'), 'lbl display', 'start') + text(646, y + 86, sub('W', '2'), 'lbl display', 'start') + both(195, y + 190, 420, y + 190) + text(307, y + 228, sub('d', '1'), 'lbl display') + both(420, y + 190, 630, y + 190) + text(525, y + 228, sub('d', '2'), 'lbl display') + turn(300, y - 130, 44, -20, -160) + turn(540, y - 130, 44, -160, -20) + text(420, y - 144, 'pivot force', 'lbl small');
      return svg('80 60 680 440', s, 'A seesaw balanced on a pivot. A heavy weight W 1 sits a short distance d 1 to the left of the pivot and a lighter weight W 2 a longer distance d 2 to the right. The anticlockwise torque of W 1 equals the clockwise torque of W 2');
    },

    // Angular velocity against time: the gradient is the angular acceleration and the area is the angular displacement.
    'a4-wt': () => {
      let s = P.shade('M130,420 L130,300 L690,110 L690,420 Z', 'hl', 0.18) + P.axes(130, 420, 790, 50, 'time', 'angular velocity ω') + line('M130,300 L690,110', 'hl', 6);
      s += `<path d="M690,110 V420 M130,110 H690" class="guide"/>` + text(116, 308, sub('ω', 'i'), 'lbl mono', 'end') + text(116, 118, sub('ω', 'f'), 'lbl mono', 'end') + text(690, 456, 't', 'lbl mono') + text(410, 330, 'area = Δθ', 'lbl strong halo') + text(330, 190, 'gradient = α', 'lbl strong halo', 'end');
      return svg('40 30 780 450', s, 'A graph of angular velocity against time for a constant angular acceleration: a straight line rising from the initial to the final angular velocity. Its gradient is the angular acceleration, and the area under it is the angular displacement');
    },

    // The same mass, near the axis and far from it. Also drawn plain.
    'a4-inertia': el => {
      const on = labelled(el), one = (cx, r, dur, title, note) => {
        const rod = `<line x1="${-r}" y1="0" x2="${r}" y2="0" style="stroke:var(--text-secondary);stroke-width:6;stroke-linecap:round"/><circle cx="${-r}" cy="0" r="24" style="${BODY}"/><circle cx="${r}" cy="0" r="24" style="${BODY}"/>`;
        return `<circle cx="${cx}" cy="230" r="${r}" class="orbit"/>` + twoState(at(cx, 230, `<g transform="rotate(-25)">${rod}</g>`), at(cx, 230, `<g><animateTransform attributeName="transform" type="rotate" from="0" to="-360" dur="${dur}s" repeatCount="indefinite"/>${rod}</g>`)) + dot(cx, 230) + (on ? text(cx, 430, title, 'lbl strong') + text(cx, 464, note, 'lbl') : '');
      };
      return svg(on ? '30 50 840 440' : '40 60 820 340', one(190, 60, 1.6, 'mass near the axis', 'small I: easy to spin up') + one(600, 150, 6, 'mass far from the axis', 'large I: hard to spin up'), 'Two bodies of the same mass, each a pair of masses on a light rod turning about its centre. With the masses near the axis the moment of inertia is small and the body is easy to spin up. With the masses far from the axis the moment of inertia is large');
    },

    // A mass on a string wound round a wheel: the falling mass turns the wheel.
    'a4-falling': () => {
      const cx = 380, cy = 180, r = 100;
      let s = `<line x1="${cx - 150}" y1="${cy}" x2="${cx + 150}" y2="${cy}" class="tick" style="stroke-width:6"/>` + at(cx, cy, `<g transform="rotate(20)">${wheel(r)}</g>`) + `<line x1="${cx + r}" y1="${cy}" x2="${cx + r}" y2="400" class="cable"/><rect x="${cx + r - 34}" y="400" width="68" height="60" rx="8" style="${BODY}"/>`;
      s += arrow(cx + r, 400, cx + r, 310, 'brand-primary', 6) + text(cx + r + 16, 340, 'T', 'lbl display', 'start') + dot(cx + r, 430, 6) + arrow(cx + r, 430, cx + r, 540, 'brand-primary', 6) + text(cx + r + 16, 540, 'mg', 'lbl display', 'start') + arrow(cx + r - 70, 420, cx + r - 70, 480, 'brand-accent', 5) + text(cx + r - 86, 460, 'a', 'lbl display', 'end') + turn(cx, cy, r + 30, -150, -30) + text(cx, cy - r - 44, 'α', 'lbl greek') + both(cx, cy + 30, cx + r, cy + 30) + text(cx + r / 2, cy + 66, 'r', 'lbl display italic') + text(cx - 190, cy + 10, 'wheel,', 'lbl', 'end') + text(cx - 190, cy + 44, 'moment of inertia I', 'lbl', 'end');
      return svg('-120 -10 760 580', s, 'A wheel free to turn on a fixed axle, with a string wound round its rim and a mass hanging from the string. The weight of the mass acts downwards at its centre and the tension acts upwards where the string is attached. As the mass accelerates downwards, the tension exerts a torque on the wheel and gives it an angular acceleration');
    },

    // A skater seen from above: arms out, slow; arms in, fast. Also drawn plain.
    'a4-skater': el => {
      const on = labelled(el), cx = 400, cy = 230, T = 6, out = 150, inn = 56;
      const body = r => `<line x1="${-r}" y1="0" x2="${r}" y2="0" style="stroke:var(--text-secondary);stroke-width:14;stroke-linecap:round"/><circle cx="${-r}" r="20" style="${BODY}"/><circle cx="${r}" r="20" style="${BODY}"/><ellipse rx="40" ry="26" style="${BODY}"/><circle r="20" style="fill:var(--brand-accent)"/>`;
      const arms = `<line x1="-150" y1="0" x2="150" y2="0" style="stroke:var(--text-secondary);stroke-width:14;stroke-linecap:round">${anim('x1', [-out, -out, -inn, -inn, -out], T, { extra: 'keyTimes="0;0.44;0.5;0.94;1"' })}${anim('x2', [out, out, inn, inn, out], T, { extra: 'keyTimes="0;0.44;0.5;0.94;1"' })}</line>` + [-1, 1].map(sg => `<circle cx="${sg * out}" r="20" style="${BODY}">${anim('cx', [sg * out, sg * out, sg * inn, sg * inn, sg * out], T, { extra: 'keyTimes="0;0.44;0.5;0.94;1"' })}</circle>`).join('') + `<ellipse rx="40" ry="26" style="${BODY}"/><circle r="20" style="fill:var(--brand-accent)"/>`;
      const mover = at(cx, cy, `<g><animateTransform attributeName="transform" type="rotate" values="0;-360;-1440" keyTimes="0;0.5;1" dur="${T}s" repeatCount="indefinite"/>${arms}</g>`);
      let s = '';
      if (on) s += text(cx, 430, 'arms out: large I, small ω', 'lbl') + text(cx, 464, 'arms in: small I, large ω', 'lbl') + text(cx, 504, 'L = Iω stays the same', 'lbl strong');
      return svg(on ? '120 40 560 480' : '220 60 360 340', twoState(at(cx, cy, `<g transform="rotate(-30)">${body(out)}</g>`), mover) + s, 'A spinning skater seen from above. With the arms stretched out the moment of inertia is large and the skater turns slowly. With the arms pulled in the moment of inertia is small and the skater turns fast. The angular momentum is the same in both cases');
    },

    // A disc at rest dropped onto a spinning disc: afterwards they turn together, more slowly.
    'a4-coupled': () => {
      const disc = (cx, cy, w, colour) => `<ellipse cx="${cx}" cy="${cy}" rx="${w}" ry="26" style="fill:color-mix(in srgb, var(--${colour}) 40%, var(--viewer-bg));stroke:var(--${colour});stroke-width:3"/>`;
      const axle = cx => `<line x1="${cx}" y1="150" x2="${cx}" y2="430" style="stroke:var(--text-secondary);stroke-width:6"/>`;
      let s = axle(220) + disc(220, 340, 130, 'brand-accent-strong') + disc(220, 190, 90, 'brand-accent') + arrow(220, 226, 220, 296, 'text-secondary', 3) + turn(220, 340, 150, 160, 20, 'hl', 5) + text(220, 520, 'before', 'lbl strong') + text(50, 300, sub('ω', '1'), 'lbl greek', 'end') + text(330, 196, 'at rest', 'lbl', 'start');
      s += axle(640) + disc(640, 340, 130, 'brand-accent-strong') + disc(640, 314, 90, 'brand-accent') + turn(640, 340, 150, 160, 80, 'hl', 5) + text(640, 520, 'after', 'lbl strong') + text(480, 300, 'ω', 'lbl greek', 'end') + text(640, 130, 'turning together', 'lbl');
      return svg('-10 90 820 450', s, 'Two discs on the same axle. Before, the lower disc is spinning with angular velocity omega 1 and the upper disc is at rest above it. After the upper disc is dropped onto the lower one, friction makes them turn together with a smaller angular velocity');
    },

    // A solid sphere and a hoop rolling down the same slope: the sphere wins. Also drawn plain.
    'a4-rolling': el => {
      const on = labelled(el), x0 = 130, y0 = 130, x1 = 730, y1 = 390, T = 3.4, n = 40, r = 30, len = Math.hypot(x1 - x0, y1 - y0), ux = (x1 - x0) / len, uy = (y1 - y0) / len;
      const along = (s, lane) => [x0 + ux * s + uy * (r + lane), y0 + uy * s - ux * (r + lane)];
      // Accelerations in the ratio 5/7 (solid sphere) to 1/2 (hoop): the hoop has covered 0.7 of the slope when the sphere arrives.
      const path = (k, lane) => Array.from({ length: n + 1 }, (_, i) => along(Math.min(1, k * (i / n) ** 2) * (len - 70) + 30, lane));
      const ball = `<circle r="${r}" style="${BODY}"/><line x1="${-r}" y1="0" x2="${r}" y2="0" style="stroke:var(--brand-accent-strong);stroke-width:3"/>`, hoop = `<circle r="${r}" style="fill:none;stroke:var(--brand-accent);stroke-width:8"/><line x1="${-r}" y1="0" x2="${r}" y2="0" style="stroke:var(--brand-accent);stroke-width:3"/>`;
      // The angle turned is the distance rolled divided by the radius, sampled like the path, so nothing slips.
      const rolling = (body, k) => `<g><animateTransform attributeName="transform" type="rotate" values="${Array.from({ length: n + 1 }, (_, i) => f(Math.min(1, k * (i / n) ** 2) * (len - 70) / r * 180 / Math.PI)).join(';')}" dur="${T}s" repeatCount="indefinite"/>${body}</g>`;
      let s = `<path d="M${x0},${y0} L${x1},${y1} L${x0},${y1} Z" style="fill:color-mix(in srgb, var(--neutron) 22%, transparent);stroke:var(--text-secondary);stroke-width:3"/>`;
      if (on) s += text(560, 180, 'solid sphere: in front', 'lbl strong', 'start') + text(560, 214, 'hoop: behind', 'lbl', 'start', 'style="fill:var(--brand-accent)"') + both(x0 - 40, y0, x0 - 40, y1) + text(x0 - 54, (y0 + y1) / 2 + 8, 'h', 'lbl display italic', 'end') + text(430, 450, 'released together, rolling without slipping', 'lbl');
      const still = at(...along(0.6 * (len - 70) + 30, 0).map(f), hoop) + at(...along(0.86 * (len - 70) + 30, 0).map(f), ball);
      const mover = `<g>${track(path(0.7, 0), T)}${rolling(hoop, 0.7)}</g><g>${track(path(1, 0), T)}${rolling(ball, 1)}</g>`;
      return svg(on ? '40 40 800 430' : '80 40 700 370', s + twoState(still, mover), 'A solid sphere and a hoop released together from the top of a slope, both rolling without slipping. The sphere reaches the bottom first: more of the hoop’s kinetic energy is rotational, so less is left for moving down the slope');
    }
  };
});
