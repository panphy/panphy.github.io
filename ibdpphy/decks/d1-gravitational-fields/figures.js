// Diagrams for the D.1 Gravitational fields deck, added to the shared set in ../assets/figures.js.
// Forces and field lines are teal, velocities apricot, the Sun amber, planets teal and small
// orbiting bodies slate. Terracotta appears only in the additional higher level figures.
window.DeckFigures.add(P => {
  const { svg, ball, arrow, fline, text, sub, dot, axes, plot, shade, both, through, sampled, labeled, track, anim, spin, twoState, f, TAU } = P;
  const sun = (x, y, r) => ball(x, y, r, 'positive', '');
  const planet = (x, y, r) => ball(x, y, r, 'brand-primary', '');
  const craft = (x, y, r = 13) => ball(x, y, r, 'brand-accent-strong', '');
  const polar = (cx, cy, r, deg) => [cx + r * Math.cos(deg * Math.PI / 180), cy + r * Math.sin(deg * Math.PI / 180)];
  // n field lines running inwards from radius r1 and ending on the body at radius r0 (draw the
  // body afterwards, over their ends). Each arrowhead sits at radius `head`, part of the way in.
  const radial = (cx, cy, r0, r1, n, width = 3.5, turn = 0, head = (r0 + r1) / 2) => Array.from({ length: n }, (_, i) => {
    const deg = turn + i * 360 / n, [x1, y1] = polar(cx, cy, r1, deg), [x2, y2] = polar(cx, cy, r0, deg);
    return fline(x1, y1, x2, y2, 'brand-primary', width, (r1 - head) / (r1 - r0));
  }).join('');
  const hlLine = 'style="fill:none;stroke:var(--hl);stroke-width:2.5"';

  // The orbit used for Kepler's laws: semi-major axis 300, eccentricity 0.5, Sun at the left focus.
  const ORBIT = { cx: 410, cy: 250, a: 300, e: 0.5 };
  ORBIT.b = ORBIT.a * Math.sqrt(1 - ORBIT.e ** 2);
  ORBIT.sun = [ORBIT.cx - ORBIT.a * ORBIT.e, ORBIT.cy];
  // Where the planet is after a fraction t of its period, from Kepler's equation M = E − e sin E.
  function keplerPoint(t) {
    const M = t * TAU;
    let E = M;
    for (let i = 0; i < 12; i++) E -= (E - ORBIT.e * Math.sin(E) - M) / (1 - ORBIT.e * Math.cos(E));
    return [ORBIT.cx - ORBIT.a * Math.cos(E), ORBIT.cy - ORBIT.b * Math.sin(E)];
  }
  const sector = (t1, t2) => `M${ORBIT.sun.join(',')} L${through(Array.from({ length: 25 }, (_, i) => keplerPoint(t1 + (t2 - t1) * i / 24))).slice(1)} Z`;
  const orbitPath = `<ellipse cx="${ORBIT.cx}" cy="${ORBIT.cy}" rx="${ORBIT.a}" ry="${f(ORBIT.b)}" class="orbit" style="stroke-opacity:.6;stroke-width:2.5"/>`;

  return {
    // Kepler's first law. Also drawn small, with data-plain.
    'd1-ellipse': el => {
      const on = labeled(el), [sx, sy] = ORBIT.sun, [px, py] = keplerPoint(0.3);
      let s = orbitPath + `<line x1="110" y1="250" x2="710" y2="250" class="guide"/>` + sun(sx, sy, 34) + craft(px, py, 16);
      s += `<path d="M${ORBIT.cx + 150 - 9},241 l18,18 m0,-18 l-18,18" class="tick"/>`;
      if (on) {
        s += `<line x1="${sx}" y1="${sy}" x2="${f(px)}" y2="${f(py)}" class="guide accent"/>`;
        s += text(sx, sy + 76, 'Sun', 'lbl strong') + text(sx, sy + 108, 'at one focus', 'lbl') + text(ORBIT.cx + 150, 308, 'empty focus', 'lbl');
        s += text(f(px) + 26, f(py) - 18, 'planet', 'lbl strong', 'start');
        s += text(124, 232, 'closest', 'lbl', 'start') + text(696, 232, 'furthest', 'lbl', 'end');
        s += both(ORBIT.cx + 4, 540, 706, 540) + text(ORBIT.cx + 150, 574, 'semi-major axis a', 'lbl mono') + `<line x1="${ORBIT.cx}" y1="250" x2="${ORBIT.cx}" y2="554" class="guide"/><line x1="710" y1="250" x2="710" y2="554" class="guide"/>`;
      }
      return svg(on ? '0 -20 820 610' : '90 -30 640 560', s, 'An elliptical orbit with the Sun at one of the two foci. The planet is closest to the Sun at one end of the long axis and furthest at the other; half the long axis is the semi-major axis a');
    },

    // Kepler's second law: the planet moves as Kepler's equation says, so the line from the Sun
    // sweeps equal areas in equal times. Also the title picture, with data-plain.
    'd1-kepler2': el => {
      const on = labeled(el), [sx, sy] = ORBIT.sun, n = 180;
      const points = Array.from({ length: n + 1 }, (_, i) => keplerPoint(i / n));
      let s = shade(sector(-0.06, 0.06), 'brand-accent', 0.45) + shade(sector(0.44, 0.56), 'brand-accent', 0.45) + orbitPath;
      if (on) {
        s += text(-30, 30, 'fastest', 'lbl strong', 'start') + text(-30, 62, 'near the Sun', 'lbl', 'start');
        s += text(850, 30, 'slowest', 'lbl strong', 'end') + text(850, 62, 'far from the Sun', 'lbl', 'end');
        s += text(560, 262, 'equal areas', 'lbl strong halo') + text(560, 296, 'in equal times', 'lbl halo');
      }
      const [px, py] = keplerPoint(0.2);
      const still = `<line x1="${sx}" y1="${sy}" x2="${f(px)}" y2="${f(py)}" class="guide accent"/>` + craft(px, py, 16);
      const mover = `<line x1="${sx}" y1="${sy}" x2="${f(px)}" y2="${f(py)}" class="guide accent">${anim('x2', points.map(p => f(p[0])), 9)}${anim('y2', points.map(p => f(p[1])), 9)}</line><g>${track(points, 9)}${craft(0, 0, 16)}</g>`;
      return svg(on ? '-40 -20 900 550' : '90 -30 640 560', s + twoState(still, mover) + sun(sx, sy, 34), 'A planet on an elliptical orbit round the Sun. Two shaded sectors, one near the Sun and one far from it, have equal areas: the planet sweeps each in the same time, so it moves fastest when it is closest to the Sun');
    },

    // Newton's law of gravitation. Each force acts at the center of mass of the body it pulls.
    'd1-two-masses': el => {
      const on = labeled(el);
      let s = planet(190, 190, 78) + craft(610, 190, 46);
      s += arrow(190, 190, 372, 190, 'brand-primary', 6) + arrow(610, 190, 428, 190, 'brand-primary', 6) + dot(190, 190) + dot(610, 190);
      if (on) {
        s += text(300, 164, 'F', 'lbl display') + text(500, 164, 'F', 'lbl display');
        s += text(190, 308, sub('m', '1'), 'lbl display') + text(610, 276, sub('m', '2'), 'lbl display');
        s += `<line x1="190" y1="300" x2="190" y2="372" class="guide"/><line x1="610" y1="260" x2="610" y2="372" class="guide"/>` + both(196, 358, 604, 358) + text(400, 344, 'r', 'lbl display') + text(400, 394, 'between the centers', 'lbl small');
      }
      return svg('0 0 800 410', s, 'Two spherical masses m 1 and m 2 with their centers a distance r apart. Each attracts the other with a force F of the same size, drawn from the center of the body it acts on towards the other body');
    },

    'd1-inverse-square': () => {
      const at = r => [110 + 150 * r, 400 - 320 / (r * r)];
      let s = axes(110, 400, 770, 40, 'separation', 'force');
      [1, 2, 3].forEach(r => { const [x, y] = at(r); s += `<path d="M110,${f(y)} H${x} V400" class="guide"/>` + text(x, 436, r === 1 ? 'r' : `${r}r`, 'lbl mono'); });
      s += plot(sampled(t => at(0.94 + 3.3 * t)));
      [[1, 'F'], [2, 'F / 4'], [3, 'F / 9']].forEach(([r, label]) => { const [x, y] = at(r); s += `<circle cx="${x}" cy="${f(y)}" r="9" style="fill:var(--brand-accent-strong)"/>` + text(x + 20, f(y) - 14, label, 'lbl mono strong', 'start'); });
      return svg('0 0 800 460', s, 'Graph of gravitational force against separation, falling steeply and then leveling off. At separation r the force is F, at 2 r it is a quarter of F and at 3 r it is one ninth of F');
    },

    // Outside a uniform sphere the field is the same as that of a point mass at its center.
    'd1-sphere-point': () => {
      let s = radial(220, 220, 60, 196, 8, 3.5, 0, 142) + planet(220, 220, 84) + text(220, 452, 'uniform sphere, mass M', 'lbl');
      s += text(450, 232, '=', 'lbl display') + radial(680, 220, 0, 196, 8, 3.5, 0, 142) + `<circle cx="680" cy="220" r="84" class="guide"/>` + dot(680, 220, 12) + text(680, 452, 'point mass M at its center', 'lbl');
      return svg('0 0 900 470', s, 'The gravitational field outside a uniform sphere of mass M is the same as the field of a point mass M placed at its center: outside the surface of the sphere, shown dashed round the point mass, the field lines are identical');
    },

    // data-kind="radial" gives the small picture; the default shows a radial and a uniform field.
    'd1-field-lines': el => {
      const on = labeled(el);
      if (el.dataset.kind === 'radial') return svg('0 0 460 460', radial(230, 230, 50, 216, 12, 3.5, 0, 146) + planet(230, 230, 70), 'Radial gravitational field lines pointing in towards a planet');
      let s = radial(240, 232, 50, 216, 12, 3.5, 0, 148) + planet(240, 232, 72);
      s += `<rect x="560" y="388" width="350" height="40" rx="6" style="fill:var(--brand-primary);opacity:.3"/><line x1="560" y1="388" x2="910" y2="388" class="tick" style="stroke-width:4"/>`;
      [600, 667, 735, 802, 870].forEach(x => { s += fline(x, 70, x, 388, 'brand-primary', 3.5); });
      if (on) s += text(240, 486, 'radial field', 'lbl strong') + text(240, 518, 'lines spread out: weaker', 'lbl') + text(735, 486, 'uniform field', 'lbl strong') + text(735, 518, 'close to the surface', 'lbl');
      return svg('0 0 960 530', s, 'Two gravitational fields. Round a planet the field lines are radial, pointing to its center and spreading apart further out. Close to the surface they are parallel and evenly spaced: a uniform field');
    },

    'd1-g-graph': () => {
      const at = r => [110 + 140 * r, 400 - 34 * 9.8 / (r * r)];
      let s = `<rect x="110" y="50" width="140" height="350" style="fill:var(--brand-primary);opacity:.12"/>` + text(180, 240, 'inside', 'lbl small') + text(180, 268, 'the Earth', 'lbl small');
      s += axes(110, 400, 780, 30, '', '') + text(445, 484, 'distance from the center', 'lbl mono') + text(96, 8, 'g / N kg⁻¹', 'lbl mono', 'start');
      [[1, '9.8'], [2, '2.5'], [3, '1.1']].forEach(([r, g]) => { const [x, y] = at(r); s += `<path d="M110,${f(y)} H${x} V400" class="guide"/>` + text(x, 436, r === 1 ? 'R' : `${r}R`, 'lbl mono') + `<circle cx="${x}" cy="${f(y)}" r="9" style="fill:var(--brand-accent-strong)"/>` + text(x + 18, f(y) - 14, g, 'lbl mono strong', 'start'); });
      s += plot(sampled(t => at(1 + 3.6 * t)));
      return svg('0 -24 800 524', s, 'Graph of the gravitational field strength of the Earth against distance from its center, starting at the surface. It is 9.8 newtons per kilogram at the surface, distance R, 2.5 at 2 R and 1.1 at 3 R');
    },

    // Not to scale: the point where the fields cancel is really nine tenths of the way to the Moon.
    'd1-two-body': () => {
      let s = `<line x1="120" y1="200" x2="720" y2="200" class="guide"/>` + planet(120, 200, 62) + ball(720, 200, 30, 'neutron', '');
      s += arrow(560, 200, 462, 200, 'brand-primary', 5) + arrow(560, 200, 658, 200, 'brand-primary', 5) + dot(560, 200, 8);
      s += text(120, 300, 'Earth', 'lbl strong') + text(720, 268, 'Moon', 'lbl strong') + text(560, 164, 'P', 'lbl display');
      s += text(500, 244, sub('g', 'E'), 'lbl display') + text(622, 244, sub('g', 'M'), 'lbl display');
      s += `<line x1="120" y1="320" x2="120" y2="372" class="guide"/><line x1="560" y1="216" x2="560" y2="372" class="guide"/><line x1="720" y1="284" x2="720" y2="372" class="guide"/>`;
      s += both(126, 358, 554, 358) + both(566, 358, 714, 358) + text(340, 344, 'x', 'lbl display') + text(640, 344, 'd − x', 'lbl mono');
      return svg('0 0 800 400', s, 'The Earth and the Moon on a line, a distance d apart. At a point P between them, a distance x from the Earth, the field of the Earth points towards the Earth and the field of the Moon points towards the Moon. Where the two are equal in size the resultant field is zero');
    },

    // ---- Additional higher level ----

    // Potential against distance for the Earth. data-quantity="Ep" gives the unnumbered energy
    // version and data-tangent adds the tangent at 2R.
    'd1-potential': el => {
      const energy = el.dataset.quantity === 'Ep', at = r => [110 + 140 * r, 70 + 325 / r];
      let s = arrow(110, 70, 110, 440, 'text-secondary', 2.5) + arrow(110, 70, 780, 70, 'text-secondary', 2.5) + text(774, 12, 'distance from the center', 'lbl mono', 'end');
      s += text(20, 478, energy ? 'potential energy' : 'potential / MJ kg⁻¹', 'lbl mono', 'start') + text(96, 78, '0', 'lbl mono', 'end');
      [[1, '−62.5'], [2, '−31.3'], [3, '−20.8']].forEach(([r, v]) => {
        const [x, y] = at(r);
        s += `<path d="M110,${f(y)} H${x} V70" class="guide"/>` + text(x, 50, r === 1 ? 'R' : `${r}R`, 'lbl mono');
        if (!energy) s += text(x + 18, f(y) + 34, v, 'lbl mono strong', 'start');
      });
      s += `<path d="${sampled(t => at(1 + 3.7 * t))}" class="curve" style="stroke:var(--hl)"/>`;
      [1, 2, 3].forEach(r => { const [x, y] = at(r); s += `<circle cx="${x}" cy="${f(y)}" r="9" style="fill:var(--brand-accent-strong)"/>`; });
      if (energy) s += text(268, 408, 'at the surface', 'lbl small', 'start') + text(760, 180, 'rises towards zero', 'lbl small', 'end') + text(760, 208, 'far away', 'lbl small', 'end');
      if ('tangent' in el.dataset) s += `<line x1="250" y1="313.7" x2="560" y2="133.9" class="guide accent" style="stroke-dasharray:none;stroke-width:3.5"/>` + text(470, 310, 'gradient here = −g', 'lbl strong', 'start');
      return svg('0 -20 800 510', s, energy ? 'Graph of gravitational potential energy against distance from the center of a planet. It is most negative at the surface and rises towards zero far away' : 'Graph of the gravitational potential of the Earth against distance from its center. It is minus 62.5 megajoules per kilogram at the surface, minus 31.3 at twice the radius and minus 20.8 at three times the radius, rising towards zero far away');
    },

    // Equipotentials of the Earth at equal steps of 10 MJ per kg, with the field lines crossing
    // them at right angles. Also the small picture for the higher level part, with data-plain.
    'd1-equipotentials': el => {
      const on = labeled(el), cx = 300, cy = 300, R = 70;
      const rings = [[-50, 1.25, 30], [-40, 1.56, 150], [-30, 2.08, -150], [-20, 3.13, -30]];
      let s = radial(cx, cy, R - 20, 288, 12, 3, 15, 255);
      rings.forEach(([v, k, deg]) => {
        s += `<circle cx="${cx}" cy="${cy}" r="${f(R * k)}" ${hlLine}/>`;
        if (on) { const [x, y] = polar(cx, cy, R * k, deg); s += text(f(x), f(y) + 9, `−${-v}`, 'lbl mono strong halo'); }
      });
      s += planet(cx, cy, R);
      if (on) s += `<line x1="610" y1="120" x2="660" y2="120" ${hlLine}/>` + text(672, 112, 'equipotential', 'lbl', 'start') + text(672, 144, 'in MJ kg⁻¹', 'lbl', 'start') + fline(660, 210, 610, 210, 'brand-primary', 3) + text(672, 219, 'field line', 'lbl', 'start');
      return svg(on ? '0 0 860 600' : '0 0 600 600', s, 'Equipotential surfaces round the Earth, drawn as circles at minus 50, minus 40, minus 30 and minus 20 megajoules per kilogram. They get further apart further out. The field lines point inwards and cross every equipotential at right angles');
    },

    // Two satellites in circular orbits, turning with periods in the ratio Kepler's third law gives.
    'd1-orbits': () => {
      const cx = 300, cy = 290, sat = (r, dur, label, y) => {
        const body = arrow(cx, cy - r, cx, cy - r + 62, 'brand-primary', 4.5) + arrow(cx, cy - r, cx + (r < 200 ? 104 : 74), cy - r, 'brand-accent', 4.5) + craft(cx, cy - r, 14);
        return { ring: `<circle cx="${cx}" cy="${cy}" r="${r}" class="orbit" style="stroke-opacity:.6;stroke-width:2.5"/>`, still: body, mover: `<g>${spin(cx, cy, dur)}${body}</g>`, note: text(570, y, label, 'lbl strong', 'start') };
      };
      const inner = sat(120, 4.5, 'smaller r: faster', 250), outer = sat(240, 12.7, 'larger r: slower', 130);
      let s = inner.ring + outer.ring + planet(cx, cy, 56) + inner.note + outer.note;
      s += arrow(578, 420, 640, 420, 'brand-accent', 4.5) + text(654, 429, 'velocity', 'lbl', 'start') + arrow(578, 470, 640, 470, 'brand-primary', 4.5) + text(654, 479, 'gravitational', 'lbl', 'start') + text(654, 511, 'force', 'lbl', 'start');
      return svg('0 0 900 580', s + twoState(inner.still + outer.still, inner.mover + outer.mover), 'Two satellites in circular orbits round a planet. On each, the gravitational force points to the center of the planet and the velocity is along the tangent. The satellite in the smaller orbit moves faster and takes less time for each orbit');
    },

    'd1-orbit-energy': () => {
      const x = r => 110 + 140 * r, line = (k, color) => `<path d="${sampled(t => [x(1 + 3.6 * t), 230 + k / (1 + 3.6 * t)])}" class="curve" style="stroke:var(--${color})"/>`;
      let s = `<rect x="110" y="30" width="140" height="420" style="fill:var(--brand-primary);opacity:.12"/>` + arrow(110, 450, 110, 26, 'text-secondary', 2.5) + arrow(110, 230, 790, 230, 'text-secondary', 2.5);
      s += text(812, 240, 'r', 'lbl display') + text(126, 44, 'energy', 'lbl mono', 'start') + text(96, 238, '0', 'lbl mono', 'end') + text(250, 214, 'R', 'lbl mono');
      s += line(-100, 'brand-accent') + line(200, 'brand-primary') + line(100, 'hl');
      s += text(420, 168, 'kinetic', 'lbl strong', 'start') + text(420, 300, 'total', 'lbl strong', 'start', 'style="fill:var(--hl-text)"') + text(330, 400, 'potential', 'lbl strong', 'start');
      return svg('0 0 840 470', s, 'Graph of the energies of a satellite against the radius of its circular orbit. The kinetic energy is positive and falls with radius. The potential energy is negative and twice as large. The total energy is negative, equal in size to the kinetic energy, and rises towards zero for larger orbits');
    },

    // Launched horizontally from the same point at four speeds, after Newton's picture.
    'd1-escape': () => {
      const cx = 300, cy = 270, q = 84;
      const parabola = sampled(t => { const a = t * 2.27, r = 2 * q / (1 + Math.cos(a)); return [cx + r * Math.sin(a), cy - r * Math.cos(a)]; }, 50);
      let s = `<path d="M${cx},${cy - q} Q352,186 357.6,225" class="curve" style="stroke:var(--text-secondary);stroke-width:3.5"/>`;
      s += `<circle cx="${cx}" cy="${cy}" r="${q}" class="curve" style="stroke:var(--brand-primary);stroke-width:3.5"/>`;
      s += `<ellipse cx="${cx}" cy="${cy + 73}" rx="${f(Math.sqrt(q * 230))}" ry="157" class="curve" style="stroke:var(--brand-accent);stroke-width:3.5"/>`;
      s += `<path d="${parabola}" class="curve" style="stroke:var(--hl);stroke-width:4.5" marker-end="url(#m-hl)"/>` + planet(cx, cy, 70) + craft(cx, cy - q, 10);
      const key = (x, y, color, label) => `<line x1="${x}" y1="${y - 9}" x2="${x + 44}" y2="${y - 9}" style="stroke:var(--${color})" stroke-width="5" stroke-linecap="round"/>` + text(x + 56, y, label, 'lbl strong', 'start');
      s += key(20, 566, 'text-secondary', 'too slow: falls back') + key(20, 612, 'brand-primary', 'orbital speed: circle') + key(372, 566, 'brand-accent', 'faster: ellipse') + key(372, 612, 'hl', 'escape speed: leaves');
      return svg('0 30 740 600', s, 'A body launched horizontally from just above a planet at four speeds. Too slow and it falls back to the surface. At the orbital speed it follows a circular orbit. Faster, it follows an elliptical orbit. At the escape speed or more it leaves and never returns');
    },

    // A small drag makes the orbit shrink slowly; the satellite speeds up as it comes in.
    'd1-drag': () => {
      const cx = 300, cy = 290, r0 = 250, r1 = 96, turns = 3.5, radius = a => r0 - (r0 - r1) * a / (turns * TAU);
      const at = a => [cx + radius(a) * Math.cos(-a), cy + radius(a) * Math.sin(-a)];
      const spiral = sampled(t => at(t * turns * TAU), 240);
      // Equal time steps: the angular speed rises as r^(-3/2), as it does for a circular orbit.
      const points = [];
      for (let a = 0; a < turns * TAU; a += 0.035 * (r0 / radius(a)) ** 1.5) points.push(at(a));
      let s = `<circle cx="${cx}" cy="${cy}" r="${r1 + 12}" style="fill:var(--brand-primary);opacity:.14"/><path d="${spiral}" class="guide accent" style="stroke-dasharray:none;stroke-width:2.5"/>` + planet(cx, cy, 70);
      s += text(590, 150, 'drag removes energy', 'lbl strong', 'start') + text(590, 230, 'the orbit shrinks', 'lbl strong', 'start') + text(590, 310, 'the speed rises', 'lbl strong', 'start', 'style="fill:var(--hl-text)"') + text(590, 430, 'thin upper', 'lbl', 'start') + text(590, 462, 'atmosphere', 'lbl', 'start') + `<line x1="420" y1="350" x2="580" y2="428" class="guide"/>`;
      const [px, py] = at(4.2);
      return svg('0 0 900 580', s + twoState(craft(px, py, 14), `<g>${track(points, 14)}${craft(0, 0, 14)}</g>`), 'A satellite in a low orbit meets a small drag from the thin upper atmosphere. It loses energy, its orbit slowly shrinks in a spiral and its speed rises as it comes closer to the planet');
    }
  };
});
