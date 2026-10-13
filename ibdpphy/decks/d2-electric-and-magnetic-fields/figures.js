// Diagrams for the D.2 Electric and magnetic fields deck, added to the shared set in
// ../assets/figures.js. Positive charges are red and negative charges blue, as protons and
// electrons are in the other decks. Electric field lines and forces are teal, magnetic field
// lines slate, currents apricot. Terracotta (equipotentials) appears only in the higher level figures.
window.DeckFigures.add(P => {
  const { svg, ball, arrow, fline, text, sub, dot, axes, plot, both, through, sampled, labelled, animated, stepG, track, anim, spin, twoState, PLAY, f } = P;
  const plus = (x, y, r = 22) => ball(x, y, r, 'proton');
  const minus = (x, y, r = 22) => ball(x, y, r, 'electron');
  const polar = (cx, cy, r, deg) => [cx + r * Math.cos(deg * Math.PI / 180), cy + r * Math.sin(deg * Math.PI / 180)];
  const unit = ([x, y]) => { const m = Math.hypot(x, y) || 1; return [x / m, y / m]; };
  const BOX = [0, 0, 800, 520];

  // Follows the direction field fn from (x, y) in steps of h (backwards if sign is −1) until it
  // leaves the box, reaches one of the stops or comes back to where it started.
  function follow(fn, x, y, { h = 3, max = 3000, box = BOX, stops = [], sign = 1 } = {}) {
    const points = [[x, y]], x0 = x, y0 = y;
    for (let i = 0; i < max; i++) {
      const [ax, ay] = unit(fn(x, y)), [bx, by] = unit(fn(x + sign * h / 2 * ax, y + sign * h / 2 * ay));
      x += sign * h * bx; y += sign * h * by;
      points.push([x, y]);
      if (x < box[0] || x > box[2] || y < box[1] || y > box[3]) { points.left = true; break; }
      if (stops.some(stop => Math.hypot(x - stop.x, y - stop.y) < stop.r)) break;
      if (i > 10 && Math.hypot(x - x0, y - y0) < h * 0.9) { points.push([x0, y0]); break; }
    }
    return points;
  }
  const head = (points, at, colour) => {
    const i = Math.max(2, Math.round((points.length - 1) * at)), [x, y] = points[i], [px, py] = points[i - 2];
    return `<path d="M-10,-8 L8,0 L-10,8 Z" transform="translate(${f(x)} ${f(y)}) rotate(${f(Math.atan2(y - py, x - px) * 180 / Math.PI)})" style="fill:var(--${colour})"/>`;
  };
  const curve = (points, colour, width = 3, extra = '') => `<path d="${through(points)}" style="fill:none;stroke:var(--${colour});stroke-width:${width}" ${extra}/>`;
  const fieldLine = (points, colour = 'brand-primary', at = 0.5) => curve(points, colour) + (at === null ? '' : head(points, at, colour));

  // Electric field of point charges [{ x, y, q, r }] and their potential.
  const eField = charges => (x, y) => charges.reduce(([ex, ey], c) => { const dx = x - c.x, dy = y - c.y, r3 = Math.hypot(dx, dy) ** 3; return [ex + c.q * dx / r3, ey + c.q * dy / r3]; }, [0, 0]);
  const across = fn => (x, y) => { const [ex, ey] = fn(x, y); return [-ey, ex]; };
  // n lines from each charge in from (indices): forwards from a positive one, backwards from a
  // negative one, starting at the given angles.
  function linesFrom(charges, index, angles, colour = 'brand-primary', at = 0.5, box = BOX) {
    const c = charges[index], fn = eField(charges), stops = charges.filter(other => other !== c && Math.sign(other.q) !== Math.sign(c.q));
    return angles.map(deg => {
      const [x, y] = polar(c.x, c.y, c.r + 2, deg), points = follow(fn, x, y, { stops, sign: Math.sign(c.q), box });
      return { deg, left: points.left, svg: fieldLine(c.q > 0 ? points : [...points].reverse(), colour, c.q > 0 ? at : 1 - at) };
    });
  }
  const spread = (n, offset = 0) => Array.from({ length: n }, (_, i) => offset + i * 360 / n);
  const drawCharges = charges => charges.map(c => (c.q > 0 ? plus : minus)(c.x, c.y, c.r)).join('');

  // Magnetic field of long straight wires seen end on: [{ x, y, i }], i positive out of the page.
  const bField = wires => (x, y) => wires.reduce(([bx, by], w) => { const dx = x - w.x, dy = y - w.y, r2 = dx * dx + dy * dy; return [bx + w.i * dy / r2, by - w.i * dx / r2]; }, [0, 0]);
  const wireEnd = (x, y, out, r = 15) => `<circle cx="${x}" cy="${y}" r="${r}" style="fill:var(--card-bg);stroke:var(--brand-accent);stroke-width:4"/>` + (out ? `<circle cx="${x}" cy="${y}" r="${r * 0.3}" style="fill:var(--brand-accent)"/>` : `<path d="M${x - r * 0.5},${y - r * 0.5} l${r},${r} m0,${-r} l${-r},${r}" style="stroke:var(--brand-accent);stroke-width:4;stroke-linecap:round"/>`);
  // Field lines through the given points, traced both ways and joined.
  const loops = (wires, starts, box = BOX) => starts.map(([x, y, at = 0.5]) => {
    const fn = bField(wires), forward = follow(fn, x, y, { box }), back = forward.left ? follow(fn, x, y, { box, sign: -1 }) : [];
    return fieldLine([...back.reverse(), ...forward], 'brand-accent-strong', forward.left ? 0.5 : at);
  }).join('');

  const plate = (x1, x2, y, positive) => `<rect x="${x1}" y="${y - 8}" width="${x2 - x1}" height="16" rx="5" style="fill:var(--${positive ? 'proton' : 'electron'})"/>`;
  const signs = (x1, x2, y, n, sign) => Array.from({ length: n }, (_, i) => text(f(x1 + (x2 - x1) * (i + 0.5) / n), y, sign, 'lbl strong', 'middle', `style="fill:var(--${sign === '+' ? 'proton' : 'electron'})"`)).join('');
  const hlStroke = 'style="fill:none;stroke:var(--hl);stroke-width:2.5;stroke-dasharray:9 6"';

  return {
    // Like charges repel and unlike charges attract. data-plain gives the small picture.
    'd2-charges': el => {
      if (!labelled(el)) return svg('0 0 460 200', plus(150, 100, 40) + minus(310, 100, 40) + arrow(196, 100, 222, 100, 'brand-primary', 6) + arrow(264, 100, 238, 100, 'brand-primary', 6), 'A positive and a negative charge attracting each other');
      const row = (y, a, b, attract, label) => {
        const k = attract ? 1 : -1, x1 = 300, x2 = 500;
        return (a ? plus : minus)(x1, y, 34) + (b ? plus : minus)(x2, y, 34) + arrow(x1 + k * 40, y, x1 + k * 40 + k * 46, y, 'brand-primary', 6) + arrow(x2 - k * 40, y, x2 - k * 40 - k * 46, y, 'brand-primary', 6) + text(630, y + 10, label, 'lbl strong', 'start');
      };
      return svg('0 0 800 460', row(80, true, true, false, 'repel') + row(230, false, false, false, 'repel') + row(380, true, false, true, 'attract') + text(60, 90, 'like', 'lbl', 'start') + text(60, 240, 'like', 'lbl', 'start') + text(60, 390, 'unlike', 'lbl', 'start'), 'Three pairs of charges. Two positive charges repel, two negative charges repel, and a positive and a negative charge attract');
    },

    // Rubbing moves electrons from the cloth to the rod. Played with →.
    'd2-friction': () => {
      const rod = `<rect x="150" y="150" width="500" height="56" rx="28" style="fill:color-mix(in srgb, var(--brand-accent-strong) 16%, var(--viewer-bg));stroke:var(--brand-accent-strong);stroke-width:3"/>`;
      const cloth = `<path d="M250,300 Q330,270 410,300 T570,300 V400 Q490,430 410,400 T250,400 Z" style="fill:color-mix(in srgb, var(--brand-accent) 35%, var(--viewer-bg));stroke:var(--brand-accent);stroke-width:3"/>`;
      const xs = [300, 370, 440, 510], electrons = at => xs.map((x, i) => at(x, i)).join('');
      const labels = text(400, 120, 'polythene rod: gains electrons', 'lbl strong') + text(400, 464, 'cloth: loses electrons', 'lbl strong') + text(690, 188, 'negative', 'lbl', 'start', 'style="fill:var(--electron)"') + text(600, 360, 'positive', 'lbl', 'start', 'style="fill:var(--proton)"');
      const still = electrons(x => minus(x, 178, 15)) + labels;
      const mover = electrons(x => `<g transform="translate(${x} 350)">${track([[x, 350], [x, 178]], 1.1, { loop: false, extra: 'calcMode="spline" keySplines=".3 0 .3 1" keyTimes="0;1"' })}${minus(0, 0, 15)}</g>`) + `<g opacity="0">${anim('opacity', [0, 0, 1], 1.6, { loop: false, extra: 'keyTimes="0;0.7;1"' })}${labels}</g>` + PLAY;
      return svg('0 60 800 430', rod + cloth + twoState(still, mover), 'A polythene rod rubbed with a cloth. Electrons move from the cloth to the rod, so the rod becomes negative and the cloth is left equally positive');
    },

    // Charging a metal sphere by induction in four stages; with data-animate each press of → adds one.
    // The negative rod stays clear of the sphere, to its left. The sphere starts neutral, so stage 1
    // shows as many − as +; from stage 2 the four + that remain are all that is drawn.
    'd2-induction': el => {
      const on = animated(el), cy = 200, R = 56;
      const sign = (x, y, s) => text(f(x), f(y) + 10, s, 'lbl strong', 'middle', `style="fill:var(--${s === '+' ? 'proton' : 'electron'})"`);
      const at = (cx, degs, s, r = 38) => degs.map(deg => { const [x, y] = polar(cx, cy, r, deg); return sign(x, y, s); }).join('');
      const stand = cx => `<path d="M${cx},${cy + R} V360 M${cx - 40},360 H${cx + 40}" class="tick" style="stroke-width:5"/>`;
      const sphere = cx => `<circle cx="${cx}" cy="${cy}" r="${R}" style="fill:color-mix(in srgb, var(--neutron) 22%, var(--viewer-bg));stroke:var(--neutron);stroke-width:3"/>`;
      const rod = cx => `<rect x="${cx - 204}" y="${cy - 22}" width="128" height="44" rx="22" style="fill:color-mix(in srgb, var(--electron) 24%, var(--viewer-bg));stroke:var(--electron);stroke-width:3"/>` + [-180, -152, -124, -96].map(dx => sign(cx + dx, cy, '−')).join('');
      const earth = cx => `<path d="M${cx + 40},${cy + 40} V306 M${cx + 18},306 H${cx + 62} M${cx + 27},319 H${cx + 53} M${cx + 35},332 H${cx + 45}" class="tick" style="fill:none;stroke-width:3.5"/>` + arrow(cx + 76, 250, cx + 76, 300, 'electron', 4) + sign(cx + 76, 226, '−');
      const near = [135, 165, 195, 225], far = [-45, -15, 15, 45], even = [45, 135, 225, 315];
      const stage = (i, cx, body, a, b) => stepG(on && i > 0, i + 1, stand(cx) + sphere(cx) + body + text(cx - (i < 3 ? 40 : 0), 412, a, 'lbl strong') + text(cx - (i < 3 ? 40 : 0), 446, b, 'lbl'));
      let s = stage(0, 240, rod(240) + at(240, near, '+') + at(240, far, '−'), '1 Rod near', 'electrons repelled');
      s += stage(1, 540, rod(540) + at(540, near, '+') + earth(540), '2 Earth it', 'electrons leave');
      s += stage(2, 840, rod(840) + at(840, near, '+'), '3 Earth removed', 'left positive');
      s += stage(3, 1090, at(1090, even, '+'), '4 Rod removed', 'charge spreads out');
      return svg('20 110 1210 350', s, 'Charging a metal sphere by induction in four stages. A negatively charged rod is brought near the left of a neutral sphere without touching it: electrons in the sphere are pushed to the far side, leaving the near side positive. The sphere is earthed and those electrons leave to earth. The earth connection is removed, leaving the sphere positive. Finally the rod is removed and the positive charge spreads evenly over the sphere');
    },

    // Coulomb's law. Also the small picture for part 1, with data-plain.
    'd2-coulomb': el => {
      const on = labelled(el);
      let s = plus(250, 170, 44) + plus(550, 170, 44) + arrow(200, 170, 70, 170, 'brand-primary', 6) + arrow(600, 170, 730, 170, 'brand-primary', 6);
      if (on) {
        s += text(134, 144, 'F', 'lbl display') + text(666, 144, 'F', 'lbl display') + text(250, 258, sub('q', '1'), 'lbl display') + text(550, 258, sub('q', '2'), 'lbl display');
        s += `<line x1="250" y1="276" x2="250" y2="340" class="guide"/><line x1="550" y1="276" x2="550" y2="340" class="guide"/>` + both(256, 326, 544, 326) + text(400, 312, 'r', 'lbl display') + text(400, 364, 'between the centres', 'lbl');
      }
      return svg(on ? '0 80 800 300' : '40 70 720 200', s, 'Two positive point charges q 1 and q 2 a distance r apart. Each repels the other with a force F of the same size, along the line joining them');
    },

    // An oil drop between charged plates. Played with →: it falls, then the field is switched on and holds it.
    'd2-millikan': () => {
      const frame = plate(150, 650, 110, true) + plate(150, 650, 410, false) + signs(170, 630, 96, 7, '+') + signs(170, 630, 446, 7, '−');
      const lines = [220, 310, 400, 490, 580].map(x => fline(x, 118, x, 402, 'brand-primary', 2.5, 0.5, 'opacity=".45"')).join('');
      const forces = arrow(400, 268, 400, 172, 'brand-primary', 6) + arrow(400, 268, 400, 364, 'brand-primary', 6) + text(418, 184, 'qE', 'lbl display', 'start') + text(418, 364, 'mg', 'lbl display', 'start');
      const drop = y => `<circle cx="400" cy="${y}" r="15" style="fill:var(--sand);stroke:var(--text-main);stroke-width:2"/>` + text(400, y + 8, '−', 'lbl strong');
      const notes = text(680, 200, 'uniform field', 'lbl', 'start') + text(680, 234, 'E = V / d', 'lbl mono', 'start') + text(120, 276, 'oil drop', 'lbl', 'end');
      const fall = Array.from({ length: 21 }, (_, i) => [0, 150 + 118 * (1 - (1 - i / 20) ** 2)]);
      const mover = `<g opacity="0">${anim('opacity', [0, 0, 1], 2.6, { loop: false, extra: 'keyTimes="0;0.8;1"' })}${lines}${forces}</g><g transform="translate(0 150)">${track(fall, 2.2, { loop: false })}${drop(0)}</g>` + PLAY;
      return svg('0 60 860 420', frame + notes + twoState(lines + forces + drop(268), mover), 'A negatively charged oil drop between two horizontal charged plates, the upper one positive. The electric force q E upwards balances the weight m g downwards and the drop hangs at rest');
    },

    // Radial fields of a positive and a negative point charge.
    'd2-point-fields': () => {
      const one = (cx, positive) => spread(12).map(deg => { const [x1, y1] = polar(cx, 230, 10, deg), [x2, y2] = polar(cx, 230, 184, deg); return positive ? fline(x1, y1, x2, y2, 'brand-primary', 3.5, 0.55) : fline(x2, y2, x1, y1, 'brand-primary', 3.5, 0.45); }).join('') + (positive ? plus : minus)(cx, 230, 26);
      return svg('0 30 900 460', one(220, true) + one(680, false) + text(220, 462, 'positive: lines point away', 'lbl') + text(680, 462, 'negative: lines point in', 'lbl'), 'The radial electric field lines of a positive point charge point away from it. Those of a negative point charge point towards it');
    },

    // The field of two point charges: data-kind="like" for two positive charges, otherwise one of
    // each. data-equi adds equipotentials (higher level) and data-plain removes the labels.
    'd2-pair-fields': el => {
      const like = el.dataset.kind === 'like', charges = [{ x: 260, y: 260, q: 1, r: 24 }, { x: 540, y: 260, q: like ? 1 : -1, r: 24 }];
      let s = '';
      if (like) s = [0, 1].map(i => linesFrom(charges, i, spread(10, 18 + i * 144), 'brand-primary', 0.45).map(line => line.svg).join('')).join('');
      else {
        const out = linesFrom(charges, 0, spread(14));
        s = out.map(line => line.svg).join('') + linesFrom(charges, 1, out.filter(line => line.left).map(line => 180 - line.deg), 'brand-primary', 0.4).map(line => line.svg).join('');
      }
      if ('equi' in el.dataset) {
        const fn = across(eField(charges));
        s += [170, 205, 232, 288, 322, 356, 512, 568, 595, 630].map(x => `<path d="${through(follow(fn, x, 260, { h: 2 }))}" ${hlStroke}/>`).join('');
        if (!like) s += `<line x1="400" y1="0" x2="400" y2="520" ${hlStroke}/>` + text(412, 38, '0 V', 'lbl mono strong halo', 'start', 'style="font-size:34px"');
      }
      return svg('0 0 800 520', s + drawCharges(charges), like ? 'The electric field of two equal positive charges: the lines leave both charges, bend away from each other and leave a point of zero field midway between them' : 'The electric field of a positive and a negative charge of equal size: field lines leave the positive charge and curve round to end on the negative charge');
    },

    // A charged conducting sphere: no field inside, and outside the field of a point charge at its centre.
    'd2-sphere': () => {
      let s = spread(12, 15).map(deg => { const [x1, y1] = polar(400, 260, 90, deg), [x2, y2] = polar(400, 260, 248, deg); return fline(x1, y1, x2, y2, 'brand-primary', 3.5, 0.55); }).join('');
      s += `<circle cx="400" cy="260" r="100" style="fill:color-mix(in srgb, var(--neutron) 20%, var(--viewer-bg));stroke:var(--neutron);stroke-width:3"/>`;
      s += spread(12).map(deg => { const [x, y] = polar(400, 260, 82, deg); return text(f(x), f(y) + 10, '+', 'lbl strong', 'middle', 'style="fill:var(--proton)"'); }).join('');
      return svg('100 0 600 520', s + text(400, 256, 'E = 0', 'lbl mono strong') + text(400, 288, 'inside', 'lbl'), 'A positively charged conducting sphere. The charge sits on its surface. There is no field inside, and outside the field lines are radial and leave the surface at right angles');
    },

    // Parallel plates: a uniform field between them and curved lines at the edges. data-equi adds
    // equipotentials for the higher level slides; data-plain gives the small picture.
    'd2-plates': el => {
      const on = labelled(el), equi = 'equi' in el.dataset;
      let s = plate(200, 600, 100, true) + plate(200, 600, 420, false) + signs(220, 580, 86, 8, '+') + signs(220, 580, 458, 8, '−');
      s += [250, 310, 370, 430, 490, 550].map(x => fline(x, 108, x, 412, 'brand-primary', 3.5)).join('');
      // The curved lines at the two edges, from the positive plate round to the negative one.
      const bulge = (x, dx, y1, y2) => fieldLine(Array.from({ length: 41 }, (_, i) => { const t = i / 40, u = 1 - t; return [x + 3 * u * t * dx, u * u * u * y1 + 3 * u * u * t * (y1 + (y2 - y1) * 0.18) + 3 * u * t * t * (y2 - (y2 - y1) * 0.18) + t * t * t * y2]; }));
      s += [[-1, 200], [1, 600]].map(([k, x]) => bulge(x, k * 78, 108, 412) + bulge(x, k * 130, 100, 420)).join('');
      if (equi) s += [[164, '300 V'], [228, '200 V'], [292, '100 V']].map(([y, v], i) => `<line x1="204" y1="${y + 32}" x2="596" y2="${y + 32}" ${hlStroke}/>` + text(400, y + 24, v, 'lbl mono strong halo')).join('') + text(722, 110, '400 V', 'lbl mono strong', 'start') + text(722, 430, '0 V', 'lbl mono strong', 'start');
      else if (on) s += both(222, 114, 222, 406) + text(236, 270, 'd', 'lbl display halo', 'start') + text(722, 226, 'weaker,', 'lbl', 'start') + text(722, 260, 'curved field', 'lbl', 'start') + text(722, 294, 'at the edges', 'lbl', 'start');
      return svg(on ? '60 50 860 440' : '80 50 640 440', s, 'Two parallel plates, the upper one positive. Between them the field lines are parallel, evenly spaced and point from the positive plate to the negative plate: a uniform field. At the edges the lines bulge outwards, where the field is weaker');
    },

    // ---- Magnetic fields ----

    // A bar magnet, with its field traced as that of two poles. Also drawn small, with data-plain.
    'd2-bar-magnet': el => {
      const poles = [{ x: 290, y: 260, q: 1, r: 8 }, { x: 510, y: 260, q: -1, r: 8 }];
      const out = linesFrom(poles, 0, [100, 125, 150, 180, 210, 235, 260, 75, 285, 52, 308], 'brand-accent-strong');
      let s = out.map(line => line.svg).join('') + linesFrom(poles, 1, out.filter(line => line.left).map(line => 180 - line.deg), 'brand-accent-strong', 0.4).map(line => line.svg).join('');
      s += `<rect x="260" y="222" width="140" height="76" style="fill:var(--proton)"/><rect x="400" y="222" width="140" height="76" style="fill:var(--electron)"/>` + text(310, 272, 'N', 'lbl display', 'middle', 'style="fill:#fff"') + text(490, 272, 'S', 'lbl display', 'middle', 'style="fill:#fff"');
      return svg('0 0 800 520', s, 'The magnetic field of a bar magnet: field lines leave the north pole, curve round outside the magnet and enter the south pole. They are closest together near the poles');
    },

    // A long straight wire with current upwards: the field lines are circles round it.
    'd2-wire-3d': () => {
      const loop = (y, rx) => {
        const ry = rx * 0.3;
        return `<path d="M${400 - rx},${y} A${rx},${ry} 0 0 1 ${400 + rx},${y}" class="guide" style="stroke:var(--brand-accent-strong);stroke-width:2.5;opacity:.55"/><path d="M${400 - rx},${y} A${rx},${ry} 0 0 0 ${400 + rx},${y}" style="fill:none;stroke:var(--brand-accent-strong);stroke-width:3.5"/><path d="M-10,-8 L8,0 L-10,8 Z" transform="translate(400 ${y + ry})" style="fill:var(--brand-accent-strong)"/>`;
      };
      let s = `<line x1="400" y1="500" x2="400" y2="262" style="stroke:var(--brand-accent);stroke-width:9;stroke-linecap:round"/>` + loop(260, 90) + loop(260, 170) + loop(260, 270);
      s += arrow(400, 258, 400, 40, 'brand-accent', 9) + text(424, 70, 'current I', 'lbl strong', 'start') + text(690, 300, 'field B', 'lbl strong', 'start');
      s += text(120, 440, 'weaker', 'lbl', 'start') + text(120, 474, 'further out', 'lbl', 'start');
      return svg('80 20 720 500', s, 'A long straight vertical wire carrying a current upwards. The magnetic field lines are circles round the wire in planes at right angles to it, anticlockwise when seen from above, and further apart further from the wire');
    },

    // The same field seen along the wire: current out of the page and into the page.
    'd2-wire-end': () => {
      const view = (cx, out) => {
        const radii = [40, 68, 112, 180], heads = radii.map((r, i) => [0, 180].map(a => { const [x, y] = polar(cx, 250, r, a + i * 40); return `<path d="M-10,-8 L8,0 L-10,8 Z" transform="translate(${f(x)} ${f(y)}) rotate(${a + i * 40 + (out ? -90 : 90)})" style="fill:var(--brand-accent-strong)"/>`; }).join('')).join('');
        return radii.map(r => `<circle cx="${cx}" cy="250" r="${r}" style="fill:none;stroke:var(--brand-accent-strong);stroke-width:3"/>`).join('') + heads + wireEnd(cx, 250, out, 17);
      };
      return svg('0 40 880 480', view(215, true) + view(665, false) + text(215, 478, 'out of the page: anticlockwise', 'lbl') + text(665, 478, 'into the page: clockwise', 'lbl'), 'A wire seen end on. With the current coming out of the page, shown by a dot, the field lines are circles pointing anticlockwise. With the current going into the page, shown by a cross, they point clockwise. The circles are further apart further from the wire');
    },

    // A flat circular coil and a solenoid in cross-section. Also drawn small, with data-plain.
    'd2-coil': () => {
      const wires = [{ x: 400, y: 150, i: 1 }, { x: 400, y: 370, i: -1 }];
      const s = loops(wires, [[400, 260], [400, 238], [400, 282], [400, 212], [400, 308], [400, 186, 0.75], [400, 334, 0.75], [400, 100, 0.5], [400, 420, 0.5]]);
      return svg('60 0 680 520', s + wireEnd(400, 150, true) + wireEnd(400, 370, false), 'A flat circular coil seen in cross-section, with the current coming out of the page at the top and going in at the bottom. The field lines pass through the middle of the coil from left to right and loop back round the outside');
    },

    'd2-solenoid': el => {
      const xs = [240, 280, 320, 360, 400, 440, 480, 520, 560], wires = xs.flatMap(x => [{ x, y: 170, i: 1 }, { x, y: 350, i: -1 }]), box = [0, 20, 800, 470];
      let s = loops(wires, [[400, 260], [400, 238], [400, 282], [400, 216], [400, 304], [400, 196], [400, 324]], box);
      s += xs.map(x => wireEnd(x, 170, true, 12) + wireEnd(x, 350, false, 12)).join('');
      if (labelled(el)) s += text(400, 512, 'uniform inside, like a bar magnet outside', 'lbl') + text(690, 236, 'N', 'lbl display halo', 'middle', 'style="fill:var(--proton)"') + text(110, 236, 'S', 'lbl display halo', 'middle', 'style="fill:var(--electron)"');
      return svg('0 20 800 510', s, 'A solenoid seen in cross-section. Inside, the field lines are parallel and evenly spaced: a strong, uniform field. Outside, they spread out and loop back like those of a bar magnet, with a north pole at the end where they leave');
    },

    // ---- Additional higher level ----

    // Potential against distance for a positive and a negative point charge.
    'd2-potential-graph': () => {
      const x = r => 110 + 150 * r, at = k => sampled(t => [x(0.55 + 3.8 * t), 240 - k * 110 / (0.55 + 3.8 * t)]);
      let s = arrow(110, 450, 110, 30, 'text-secondary', 2.5) + arrow(110, 240, 780, 240, 'text-secondary', 2.5) + text(796, 250, 'r', 'lbl display', 'start') + text(126, 44, 'potential', 'lbl mono', 'start') + text(96, 248, '0', 'lbl mono', 'end');
      s += `<path d="${at(1)}" class="curve" style="stroke:var(--proton)"/><path d="${at(-1)}" class="curve" style="stroke:var(--electron)"/>`;
      s += text(300, 110, 'positive charge', 'lbl strong', 'start') + text(300, 142, 'potential is positive', 'lbl', 'start') + text(300, 362, 'negative charge', 'lbl strong', 'start') + text(300, 394, 'potential is negative', 'lbl', 'start');
      return svg('0 0 840 470', s, 'Graph of electric potential against distance from a point charge. For a positive charge the potential is positive and falls towards zero far away. For a negative charge it is negative and rises towards zero');
    },

    // Equipotentials and field lines of a positive point charge, at equal steps of potential.
    'd2-equi-point': el => {
      const on = labelled(el), radii = [72, 108, 216];
      let s = spread(12, 15).map(deg => { const [x1, y1] = polar(300, 260, 10, deg), [x2, y2] = polar(300, 260, 252, deg); return fline(x1, y1, x2, y2, 'brand-primary', 3, 0.62); }).join('');
      s += radii.map((r, i) => `<circle cx="300" cy="260" r="${r}" ${hlStroke}/>` + (on ? text(300, i ? 260 - r - 8 : 260 + r + 30, ['300 V', '200 V', '100 V'][i], 'lbl mono strong halo') : '')).join('') + plus(300, 260, 24);
      if (on) s += `<line x1="590" y1="150" x2="640" y2="150" ${hlStroke}/>` + text(652, 159, 'equipotential', 'lbl', 'start') + fline(590, 220, 640, 220, 'brand-primary', 3) + text(652, 229, 'field line', 'lbl', 'start');
      return svg(on ? '20 0 840 520' : '40 0 520 520', s, 'Equipotential surfaces round a positive point charge, drawn as circles at 300, 200 and 100 volts. They are further apart further out. The field lines point outwards and cross every equipotential at right angles');
    },

    // Equipotentials of four charges at the corners of a square, two positive and two negative.
    'd2-equi-four': () => {
      const charges = [{ x: 280, y: 140, q: 1, r: 22 }, { x: 520, y: 140, q: -1, r: 22 }, { x: 520, y: 380, q: 1, r: 22 }, { x: 280, y: 380, q: -1, r: 22 }], fn = across(eField(charges));
      let s = charges.map(c => [34, 56, 86].map(d => `<path d="${through(follow(fn, c.x + (c.x < 400 ? -d : d), c.y, { h: 2 }))}" ${hlStroke}/>`).join('')).join('');
      s += `<path d="M400,0 V520 M90,260 H710" ${hlStroke}/>` + text(412, 38, '0 V', 'lbl mono strong halo', 'start', 'style="font-size:34px"');
      return svg('80 0 640 520', s + drawCharges(charges), 'The equipotentials of four charges at the corners of a square, positive and negative alternately. Closed curves surround each charge, and the two lines of symmetry between the charges are at zero potential');
    },

    // A charged conducting sphere, solid or hollow: field strength and potential against distance from its centre.
    'd2-sphere-graphs': () => {
      const x = r => 120 + 150 * r, part = (y0, k, label, inside) => {
        let g = arrow(120, y0, 120, y0 - 190, 'text-secondary', 2.5) + arrow(120, y0, 780, y0, 'text-secondary', 2.5) + text(136, y0 - 174, label, 'lbl mono', 'start') + `<line x1="${x(1)}" y1="${y0}" x2="${x(1)}" y2="${y0 - 160}" class="guide"/>`;
        g += `<path d="${inside ? `M120,${y0 - 150} H${x(1)}` : `M120,${y0} H${x(1)} V${y0 - 150}`} ${sampled(t => [x(1 + 3.3 * t), y0 - 150 / (1 + 3.3 * t) ** k]).replace('M', 'L')}" class="curve" style="stroke:var(--hl)"/>`;
        return g;
      };
      let s = `<rect x="120" y="30" width="150" height="460" style="fill:var(--neutron);opacity:.14"/>` + part(230, 2, 'field strength', false) + part(490, 1, 'potential', true);
      s += text(x(1), 520, 'R', 'lbl mono') + text(770, 520, 'distance from the centre', 'lbl mono', 'end') + text(195, 130, 'zero', 'lbl strong') + text(195, 162, 'inside', 'lbl') + text(195, 420, 'constant', 'lbl strong') + text(195, 452, 'inside', 'lbl');
      return svg('0 0 820 540', s, 'Two graphs for a charged conducting sphere of radius R. The field strength is zero inside, jumps to its greatest value at the surface and falls as one over r squared outside. The potential is constant inside, equal to its value at the surface, and falls as one over r outside');
    }
  };
});
