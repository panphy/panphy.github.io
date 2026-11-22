// Diagrams for the A.4 Rigid body mechanics deck (higher level only), added to the shared set in
// ../assets/figures.js. Forces are teal and velocities apricot, as in A.2, and every force arrow
// starts where the force acts: a weight at the center of mass, a support force at the support,
// a tension where the string is attached. Bodies are slate; terracotta marks the turning
// effect (torques and angular quantities), since the whole topic is higher level only.
window.DeckFigures.add(P => {
  const { svg, arrow, text, sub, both, through, labeled, track, anim, spin, twoState, stepG, PLAY, f, TAU } = P;
  const line = (d, color, width = 5, extra = '') => `<path d="${d}" style="fill:none;stroke:var(--${color});stroke-width:${width};stroke-linecap:round;stroke-linejoin:round" ${extra}/>`;
  const BODY = 'fill:color-mix(in srgb, var(--brand-accent-strong) 30%, var(--viewer-bg));stroke:var(--brand-accent-strong);stroke-width:3';
  const dot = (x, y, r = 7) => `<circle cx="${f(x)}" cy="${f(y)}" r="${r}" style="fill:var(--text-main)"/>`;
  const rad = deg => deg * Math.PI / 180;
  // An arc with an arrowhead, showing the sense of a rotation about (cx, cy). Angles in degrees, measured clockwise from the +x direction as SVG does.
  const turn = (cx, cy, r, a1, a2, color = 'hl', width = 5) => { const p = a => [cx + r * Math.cos(rad(a)), cy + r * Math.sin(rad(a))], [x1, y1] = p(a1), [x2, y2] = p(a2), cw = a2 > a1, t = rad(a2) + (cw ? Math.PI / 2 : -Math.PI / 2); return `<path d="M${f(x1)},${f(y1)} A${r},${r} 0 ${Math.abs(a2 - a1) > 180 ? 1 : 0} ${cw ? 1 : 0} ${f(x2)},${f(y2)}" style="fill:none;stroke:var(--${color});stroke-width:${width};stroke-linecap:round"/><path d="M12,0 L-10,-9 V9 Z" transform="translate(${f(x2)} ${f(y2)}) rotate(${f(t * 180 / Math.PI)})" style="fill:var(--${color})"/>`; };
  // mark: a dot on the rim, for a figure that follows one point of the wheel.
  const wheel = (r, spokes = 6, mark = false) => `<circle r="${r}" style="${BODY}"/>` + Array.from({ length: spokes }, (_, k) => `<line x1="0" y1="0" x2="${f(r * Math.cos(k * TAU / spokes))}" y2="${f(r * Math.sin(k * TAU / spokes))}" style="stroke:var(--brand-accent-strong);stroke-width:4"/>`).join('') + (mark ? `<circle cx="${r}" cy="0" r="11" style="fill:var(--brand-accent)"/>` : '') + `<circle r="9" style="fill:var(--text-main)"/>`;
  const at = (x, y, body) => `<g transform="translate(${x} ${y})">${body}</g>`;

  return {
    // A wheel turning about a fixed axis. Labeled, it shows angular displacement. Also the title picture.
    'a4-wheel': el => {
      const on = labeled(el), cx = 400, cy = 250, r = 150;
      let s = '';
      if (on) s += `<line x1="${cx}" y1="${cy}" x2="${cx + r + 60}" y2="${cy}" class="guide"/><line x1="${cx}" y1="${cy}" x2="${f(cx + (r + 60) * Math.cos(rad(-50)))}" y2="${f(cy + (r + 60) * Math.sin(rad(-50)))}" class="guide"/>` + turn(cx, cy, r + 40, 0, -50) + text(cx + r + 70, cy - 70, 'Δθ', 'lbl greek', 'start') + text(cx, cy + r + 70, 'every point: the same angle', 'lbl');
      return svg(on ? '150 40 560 480' : '220 70 360 360', twoState(at(cx, cy, `<g transform="rotate(-50)">${wheel(r, 6, on)}</g>`), at(cx, cy, `<g><animateTransform attributeName="transform" type="rotate" from="0" to="-360" dur="5s" repeatCount="indefinite"/>${wheel(r, 6, on)}</g>`)) + s, 'A wheel turning about a fixed axis through its center. A mark on the wheel has turned through an angular displacement delta theta; every point of the wheel turns through the same angle in the same time');
    },

    // The torque of a force on a spanner: force, distance from the axis and the angle between them.
    'a4-torque': () => {
      const px = 170, py = 330, L = 420, th = 55, ex = px + L, fx = ex + 150 * Math.cos(rad(-th)), fy = py + 150 * Math.sin(rad(-th));
      let s = `<rect x="${px - 20}" y="${py - 22}" width="${L + 40}" height="44" rx="20" style="${BODY}"/><path d="M${px},${py - 34} l30,17 v34 l-30,17 l-30,-17 v-34 Z" style="fill:var(--text-secondary)"/>` + dot(px, py) + arrow(ex, py, fx, fy, 'brand-primary', 6) + `<line x1="${ex}" y1="${py}" x2="${ex + 190}" y2="${py}" class="guide"/><path d="M${ex + 70},${py} A70,70 0 0 0 ${f(ex + 70 * Math.cos(rad(-th)))},${f(py + 70 * Math.sin(rad(-th)))}" class="guide accent"/>`;
      s += arrow(ex, py, ex, fy, 'brand-primary', 3, 'stroke-dasharray="8 7"') + text(ex + 90, py - 26, 'θ', 'lbl greek', 'start') + text(fx + 14, fy + 6, 'F', 'lbl display', 'start') + text(ex - 16, (py + fy) / 2, 'F sin θ', 'lbl mono', 'end') + both(px, py + 60, ex, py + 60) + text((px + ex) / 2, py + 100, 'r', 'lbl display italic') + text(px - 44, py + 10, 'axis', 'lbl', 'end') + turn(px, py, 76, -20, -150) + text(px - 90, py - 60, 'τ', 'lbl greek', 'end');
      return svg('20 110 780 360', s, 'A spanner turning a nut. A force F is applied at the end of the handle, a distance r from the axis, at an angle theta to the handle. Only the component of the force at right angles to the handle, F sine theta, turns the nut. The torque here is counterclockwise');
    },

    // Bodies in rotational equilibrium. data-kind: seesaw (two weights about a pivot) or plank (a loaded plank on two supports).
    'a4-beam': el => {
      const plank = el.dataset.kind === 'plank', y = 250;
      let s = `<rect x="110" y="${y - 12}" width="620" height="24" rx="6" style="${BODY}"/>`;
      if (plank) {
        s += `<path d="M130,${y + 12} l-26,60 h52 Z M710,${y + 12} l-26,60 h52 Z" style="fill:var(--text-secondary)"/>` + `<rect x="298" y="${y - 72}" width="70" height="60" rx="8" style="${BODY}"/>`;
        s += arrow(130, y + 12, 130, y - 110, 'brand-primary', 6) + arrow(710, y + 12, 710, y - 90, 'brand-primary', 6) + dot(420, y) + arrow(420, y, 420, y + 90, 'brand-primary', 6) + dot(333, y - 42, 6) + arrow(333, y - 42, 333, y + 150, 'brand-primary', 6);
        s += text(130, y - 124, sub('F', '1'), 'lbl display') + text(710, y - 104, sub('F', '2'), 'lbl display') + text(436, y + 96, '60 N', 'lbl mono', 'start') + text(349, y + 156, '200 N', 'lbl mono', 'start') + both(130, y + 200, 333, y + 200) + text(231, y + 236, '1.0 m', 'lbl mono') + both(130, y + 250, 710, y + 250) + text(420, y + 286, '3.0 m', 'lbl mono');
        return svg('60 80 720 470', s, 'A uniform plank 3.0 meters long and of weight 60 newtons rests on a support at each end. A 200 newton load sits 1.0 meter from the left-hand support. The supports push up with forces F 1 and F 2');
      }
      s += `<path d="M420,${y + 12} l-34,80 h68 Z" style="fill:var(--text-secondary)"/>` + `<rect x="240" y="${y - 92}" width="90" height="80" rx="8" style="${BODY}"/><rect x="600" y="${y - 62}" width="60" height="50" rx="8" style="${BODY}"/>`;
      s += dot(285, y - 52, 6) + arrow(285, y - 52, 285, y + 130, 'brand-primary', 6) + dot(630, y - 37, 6) + arrow(630, y - 37, 630, y + 80, 'brand-primary', 6) + arrow(420, y + 12, 420, y - 130, 'brand-primary', 6);
      s += text(301, y + 136, sub('W', '1'), 'lbl display', 'start') + text(646, y + 86, sub('W', '2'), 'lbl display', 'start') + both(285, y + 190, 420, y + 190) + text(352, y + 228, sub('d', '1'), 'lbl display') + both(420, y + 190, 630, y + 190) + text(525, y + 228, sub('d', '2'), 'lbl display') + turn(300, y - 130, 44, -20, -160) + turn(540, y - 130, 44, -160, -20) + text(420, y - 144, 'pivot force', 'lbl small');
      return svg('80 60 680 440', s, 'A seesaw balanced on a pivot. A heavy weight W 1 sits a short distance d 1 to the left of the pivot and a lighter weight W 2 a longer distance d 2 to the right. The counterclockwise torque of W 1 equals the clockwise torque of W 2');
    },

    // Angular velocity against time: the gradient is the angular acceleration and the area is the angular displacement.
    'a4-wt': () => {
      let s = P.shade('M130,420 L130,300 L690,110 L690,420 Z', 'hl', 0.18) + P.axes(130, 420, 790, 50, 'time', 'angular velocity ω', { xGap: 76, yGap: 60 }) + line('M130,300 L690,110', 'hl', 6);
      s += `<path d="M690,110 V420 M130,110 H690" class="guide"/>` + text(116, 308, sub('ω', 'i'), 'lbl mono', 'end') + text(116, 118, sub('ω', 'f'), 'lbl mono', 'end') + text(690, 456, 't', 'lbl mono') + text(410, 330, 'area = Δθ', 'lbl strong halo') + text(330, 190, 'gradient = α', 'lbl strong halo', 'end');
      return svg('40 30 780 490', s, 'A graph of angular velocity against time for a constant angular acceleration: a straight line rising from the initial to the final angular velocity. Its gradient is the angular acceleration, and the area under it is the angular displacement');
    },

    // The same mass, near the axis and far from it. Also drawn plain.
    'a4-inertia': el => {
      const on = labeled(el), one = (cx, r, dur, title, note) => {
        const rod = `<line x1="${-r}" y1="0" x2="${r}" y2="0" style="stroke:var(--text-secondary);stroke-width:6;stroke-linecap:round"/><circle cx="${-r}" cy="0" r="24" style="${BODY}"/><circle cx="${r}" cy="0" r="24" style="${BODY}"/>`;
        return `<circle cx="${cx}" cy="230" r="${r}" class="orbit"/>` + twoState(at(cx, 230, `<g transform="rotate(-25)">${rod}</g>`), at(cx, 230, `<g><animateTransform attributeName="transform" type="rotate" from="0" to="-360" dur="${dur}s" repeatCount="indefinite"/>${rod}</g>`)) + dot(cx, 230) + (on ? text(cx, 430, title, 'lbl strong') + text(cx, 464, note, 'lbl') : '');
      };
      return svg(on ? '30 50 840 440' : '40 60 820 340', one(190, 60, 1.6, 'mass near the axis', 'small I: easy to spin up') + one(600, 150, 6, 'mass far from the axis', 'large I: hard to spin up'), 'Two bodies of the same mass, each a pair of masses on a light rod turning about its center. With the masses near the axis the moment of inertia is small and the body is easy to spin up. With the masses far from the axis the moment of inertia is large');
    },

    // A mass on a string wound round a wheel: the falling mass turns the wheel.
    'a4-falling': () => {
      const cx = 380, cy = 180, r = 100;
      // The radius r from the axle to the rim, halfway between the spoke at 120° and the axle bar at 180°.
      // Each arrowhead reaches 4.8 past its end of the line, so the tips meet the center and the rim.
      const ang = 150 * Math.PI / 180, ux = Math.cos(ang), uy = Math.sin(ang), r0 = 4.8, r1 = r - 4.8;
      // A thin outline in the panel's color keeps the arrow clear of the wheel and its spokes.
      const halo = `<filter id="a4-falling-halo" filterUnits="userSpaceOnUse" x="${cx - r - 20}" y="${cy - 20}" width="${r + 40}" height="${r}"><feMorphology in="SourceAlpha" operator="dilate" radius="1" result="edge"/><feFlood style="flood-color:var(--viewer-bg)"/><feComposite in2="edge" operator="in"/><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge></filter>`;
      const rArrow = halo + `<g filter="url(#a4-falling-halo)">` + both(f(cx + r0 * ux), f(cy + r0 * uy), f(cx + r1 * ux), f(cy + r1 * uy), 'text-secondary', 3) + '</g>' + text(f(cx + (r + 30) * ux), f(cy + (r + 30) * uy) + 10, 'r', 'lbl display italic');
      let s = `<line x1="${cx - 150}" y1="${cy}" x2="${cx + 150}" y2="${cy}" class="tick" style="stroke-width:6"/>` + at(cx, cy, wheel(r)) + `<line x1="${cx + r}" y1="${cy}" x2="${cx + r}" y2="400" class="cable"/><rect x="${cx + r - 34}" y="400" width="68" height="60" rx="8" style="${BODY}"/>`;
      s += arrow(cx + r, 400, cx + r, 310, 'brand-primary', 6) + text(cx + r + 16, 340, 'T', 'lbl display', 'start') + dot(cx + r, 430, 6) + arrow(cx + r, 430, cx + r, 540, 'brand-primary', 6) + text(cx + r + 16, 540, 'mg', 'lbl display', 'start') + arrow(cx + r - 70, 420, cx + r - 70, 480, 'brand-accent', 5) + text(cx + r - 86, 460, 'a', 'lbl display', 'end') + turn(cx, cy, r + 30, -150, -30) + text(cx, cy - r - 44, 'α', 'lbl greek') + rArrow + text(cx - 190, cy + 10, 'wheel,', 'lbl', 'end') + text(cx - 190, cy + 44, 'moment of inertia I', 'lbl', 'end');
      return svg('-120 -10 760 580', s, 'A wheel free to turn on a fixed axle, with a string wound round its rim and a mass hanging from the string. The weight of the mass acts downwards at its center and the tension acts upwards where the string is attached. As the mass accelerates downwards, the tension exerts a torque on the wheel and gives it an angular acceleration');
    },

    // A skater seen from above: arms out, slow; arms in, fast. Also drawn plain.
    'a4-skater': el => {
      const on = labeled(el), cx = 400, cy = 230, T = 6, out = 150, inn = 56;
      const body = r => `<line x1="${-r}" y1="0" x2="${r}" y2="0" style="stroke:var(--text-secondary);stroke-width:14;stroke-linecap:round"/><circle cx="${-r}" r="20" style="${BODY}"/><circle cx="${r}" r="20" style="${BODY}"/><ellipse rx="40" ry="26" style="${BODY}"/><circle r="20" style="fill:var(--brand-accent)"/>`;
      const arms = `<line x1="-150" y1="0" x2="150" y2="0" style="stroke:var(--text-secondary);stroke-width:14;stroke-linecap:round">${anim('x1', [-out, -out, -inn, -inn, -out], T, { extra: 'keyTimes="0;0.44;0.5;0.94;1"' })}${anim('x2', [out, out, inn, inn, out], T, { extra: 'keyTimes="0;0.44;0.5;0.94;1"' })}</line>` + [-1, 1].map(sg => `<circle cx="${sg * out}" r="20" style="${BODY}">${anim('cx', [sg * out, sg * out, sg * inn, sg * inn, sg * out], T, { extra: 'keyTimes="0;0.44;0.5;0.94;1"' })}</circle>`).join('') + `<ellipse rx="40" ry="26" style="${BODY}"/><circle r="20" style="fill:var(--brand-accent)"/>`;
      const mover = at(cx, cy, `<g><animateTransform attributeName="transform" type="rotate" values="0;-360;-1440" keyTimes="0;0.5;1" dur="${T}s" repeatCount="indefinite"/>${arms}</g>`);
      let s = '';
      if (on) s += text(cx, 430, 'arms out: large I, small ω', 'lbl') + text(cx, 464, 'arms in: small I, large ω', 'lbl') + text(cx, 504, 'L = Iω stays the same', 'lbl strong');
      return svg(on ? '120 40 560 480' : '220 60 360 340', twoState(at(cx, cy, `<g transform="rotate(-30)">${body(out)}</g>`), mover) + s, 'A spinning skater seen from above. With the arms stretched out the moment of inertia is large and the skater turns slowly. With the arms pulled in the moment of inertia is small and the skater turns fast. The angular momentum is the same in both cases');
    },

    // A disk at rest dropped onto a spinning disk: afterwards they turn together, more slowly.
    'a4-coupled': () => {
      // The flat picture: what prints, and what shows if disks.js cannot load Three.js. On screen
      // disks.js puts a model of the two disks over it, turning about the dashed axis. Its PLAY step
      // is the press that drops the upper disk.
      const disk = (cx, cy, w, color) => `<ellipse cx="${cx}" cy="${cy}" rx="${w}" ry="26" style="fill:color-mix(in srgb, ${color === 'brand-accent' ? '#E8A66C' : `var(--${color})`} 40%, var(--viewer-bg));stroke:var(--${color});stroke-width:3"/>`;
      const axis = cx => `<line x1="${cx}" y1="140" x2="${cx}" y2="440" class="guide" style="stroke-width:3"/>`;
      let s = disk(220, 340, 130, 'brand-accent-strong') + disk(220, 190, 90, 'brand-accent') + axis(220) + turn(220, 340, 150, 160, 20, 'hl', 5) + text(220, 520, 'before', 'lbl strong') + text(50, 300, sub('ω', '1'), 'lbl greek', 'end') + text(330, 196, 'at rest', 'lbl', 'start');
      s += disk(640, 340, 130, 'brand-accent-strong') + disk(640, 314, 90, 'brand-accent') + axis(640) + turn(640, 340, 150, 160, 80, 'hl', 5) + text(640, 520, 'after', 'lbl strong') + text(480, 300, 'ω', 'lbl greek', 'end') + text(640, 130, 'turning together', 'lbl');
      return svg('-10 90 820 450', s + PLAY, 'Two disks on the same axis of rotation, shown dashed. Before, the lower disk is spinning with angular velocity omega 1 and the upper disk is at rest above it. After the upper disk is dropped onto the lower one, friction makes them turn together with a smaller angular velocity');
    },

    // Rolling as two motions added: turning about the center (the rim moves at ωr, forwards at the top
    // and backwards at the bottom) plus moving along (every point at v). With v = ωr the bottom is at
    // rest and the top moves at 2v. Turning shows first; moving along and rolling follow on clicks.
    'a4-roll-sum': () => {
      const R = 90, L = 120, cy = 200, xs = [170, 620, 1070], top = cy - R, bot = cy + R;
      const LIGHT = BODY.replace('30%', '14%');
      const disk = cx => `<circle cx="${cx}" cy="${cy}" r="${R - 1.5}" style="${LIGHT}"/>` + dot(cx, cy, 8);
      const v = (x, y, len, color, label) => arrow(x, y, x + len, y, color, 6) + text(x + len + (len > 0 ? 16 : -16), y + 11, label, 'lbl display italic', len > 0 ? 'start' : 'end');
      const caption = (cx, words) => text(cx, bot + 96, words, 'lbl strong');
      const ground = cx => `<line x1="${cx - 150}" y1="${bot + 1.5}" x2="${cx + 290}" y2="${bot + 1.5}" style="stroke:var(--text-secondary);stroke-width:3"/>`;
      const [a, b, c] = xs;
      // The ω arc sits at the upper left, clear of both rim arrows.
      const turning = disk(a) + turn(a, cy, R + 26, 190, 262) + text(f(a - (R + 58) * Math.SQRT1_2), f(cy - (R + 58) * Math.SQRT1_2 + 10), 'ω', 'lbl greek') + v(a, top, L, 'hl', 'ωr') + v(a, bot, -L, 'hl', 'ωr') + caption(a, 'turning');
      const moving = text((a + b) / 2 + 20, cy + 26, '+', 'lbl', 'middle', 'style="font-size:84px"') + disk(b) + v(b, top, L, 'brand-accent', 'v') + v(b + 10, cy, L - 10, 'brand-accent', 'v') + v(b, bot, L, 'brand-accent', 'v') + caption(b, 'moving along');
      const rolling = text((b + c) / 2 + 20, cy + 26, '=', 'lbl', 'middle', 'style="font-size:84px"') + ground(c) + disk(c) + v(c, top, 2 * L, 'brand-accent', '2v') + v(c + 10, cy, L - 10, 'brand-accent', 'v') + `<circle cx="${c}" cy="${bot}" r="9" style="fill:var(--brand-primary)"/>` + text(c, bot + 44, '0', 'lbl display') + caption(c, 'rolling');
      return svg('20 40 1380 370', turning + stepG(true, 1, moving) + stepG(true, 2, rolling), 'Rolling shown as two motions added together. Turning: a disk spins with angular velocity omega about its fixed center, so its top moves forwards at omega r and its bottom backwards at omega r. Moving along: every point of the disk moves forwards at v. Rolling: the sum. The top moves at 2v, the center at v, and the bottom point touching the ground is at rest, so v equals omega r');
    },

    // Rolling without slipping: the center moves at v while the body turns at ω, and the point touching
    // the ground is momentarily at rest, so v = ωr.
    'a4-roll': () => {
      const cx = 380, cy = 220, r = 110, ground = cy + r;
      let s = `<line x1="120" y1="${ground + 1.5}" x2="680" y2="${ground + 1.5}" style="stroke:var(--text-secondary);stroke-width:3"/>`;
      // A lighter fill than BODY, so that the velocity arrow drawn across it keeps its contrast.
      s += `<circle cx="${cx}" cy="${cy}" r="${r - 1.5}" style="${BODY.replace('30%', '14%')}"/>` + dot(cx, cy, 8);
      // The radius from the center to the contact point; each arrowhead reaches 4.8 past its end of the line.
      s += both(cx, cy + 4.8, cx, ground - 4.8 - 1.5, 'text-secondary', 3) + text(cx - 18, cy + r / 2 + 12, 'r', 'lbl display italic', 'end');
      s += arrow(cx + 12, cy, cx + 150, cy, 'brand-accent', 6) + text(cx + 160, cy + 12, 'v', 'lbl display italic', 'start');
      s += turn(cx, cy, r + 30, -150, -30) + text(cx, cy - r - 48, 'ω', 'lbl greek');
      s += `<circle cx="${cx}" cy="${ground}" r="9" style="fill:var(--brand-primary)"/>` + text(cx + 22, ground + 44, 'at rest', 'lbl', 'start');
      return svg('100 40 620 400', s, 'A solid disk rolling to the right along level ground without slipping. Its center moves at speed v while it turns clockwise with angular velocity omega. The point touching the ground is momentarily at rest, a distance r below the center, so v equals omega r');
    },

    // A solid disk and a ring of the same mass and radius race down identical slopes. Plays once, on a
    // click (the figure's PLAY step); stepping back puts both at the top again.
    'a4-rolling': () => {
      const x0 = 200, x1 = 740, drop = 170, r = 30, T = 3.4, n = 40, tops = [60, 290];
      const len = Math.hypot(x1 - x0, drop), ux = (x1 - x0) / len, uy = drop / len, s0 = 40, run = len - 50 - s0;
      // A point r above the slope (r is the outer radius, strokes included; the ramp's stroke is 1.5 thick outside).
      const along = (y0, d) => [x0 + ux * d + uy * (r + 1.5), y0 + uy * d - ux * (r + 1.5)];
      // Accelerations down the slope: (2/3)g sin θ for the disk and (1/2)g sin θ for the ring, a ratio of 4 : 3,
      // so the ring has covered 3/4 of the run when the disk arrives.
      const dist = (k, i) => s0 + k * run * (i / n) ** 2;
      const disk = `<circle r="${r - 1.5}" style="${BODY}"/><line x1="${-(r - 1.5)}" y1="0" x2="${r - 1.5}" y2="0" style="stroke:var(--brand-accent-strong);stroke-width:3"/>`;
      const ring = `<circle r="${r - 4}" style="fill:none;stroke:var(--brand-accent);stroke-width:8"/><circle cx="${r - 4}" cy="0" r="7" style="fill:var(--brand-accent-strong)"/>`;
      const PLAYS = 'begin="indefinite" fill="freeze"';
      // The angle turned is the distance rolled divided by the radius, sampled like the path, so nothing slips.
      const racer = (y0, body, k) => {
        const pts = Array.from({ length: n + 1 }, (_, i) => along(y0, dist(k, i)));
        const turns = Array.from({ length: n + 1 }, (_, i) => f((dist(k, i) - s0) / r * 180 / Math.PI));
        return `<g transform="translate(${pts[0].map(f).join(' ')})"><animateTransform attributeName="transform" type="translate" values="${pts.map(p => p.map(f).join(',')).join(';')}" dur="${T}s" ${PLAYS}/><g><animateTransform attributeName="transform" type="rotate" values="${turns.join(';')}" dur="${T}s" ${PLAYS}/>${body}</g></g>`;
      };
      // The finish line passes through the disk's center where it stops.
      const finishX = along(tops[0], s0 + run)[0];
      let s = '';
      tops.forEach(y0 => {
        s += `<path d="M${x0},${y0} L${x1},${y0 + drop} L${x0},${y0 + drop} Z" style="fill:color-mix(in srgb, var(--neutron) 22%, transparent);stroke:var(--text-secondary);stroke-width:3"/>`;
        const yf = y0 + uy / ux * (finishX - x0);
        s += `<line x1="${f(finishX)}" y1="${f(yf - 2 * r - 56)}" x2="${f(finishX)}" y2="${f(yf)}" class="guide" style="stroke-width:3"/>`;
      });
      s += text(x0 + 14, tops[0] + drop - 16, 'solid disk', 'lbl strong', 'start') + text(x0 + 14, tops[1] + drop - 16, 'ring', 'lbl strong', 'start');
      s += both(x0 - 34, tops[0], x0 - 34, tops[0] + drop) + text(x0 - 48, tops[0] + drop / 2 + 10, 'h', 'lbl display italic', 'end');
      const still = at(...along(tops[0], s0 + run).map(f), disk) + at(...along(tops[1], s0 + 0.75 * run).map(f), ring);
      const mover = racer(tops[0], disk, 1) + racer(tops[1], ring, 0.75);
      return svg('110 30 660 450', s + twoState(still, mover) + PLAY, 'A solid disk and a ring of the same mass and radius released together from rest at the top of identical slopes of height h, both rolling without slipping. The disk reaches the bottom first: when it arrives, the ring has covered only three quarters of the way, because more of the ring’s kinetic energy is rotational');
    }
  };
});
