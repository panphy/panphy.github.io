// Diagrams for the D.3 Motion in electromagnetic fields deck, added to the shared set in
// ../assets/figures.js. Forces are teal, velocities and currents apricot, magnetic field symbols
// slate; a positive particle is red and an electron blue. Nothing here is terracotta: D.3 has no
// additional higher level content.
window.DeckFigures.add(P => {
  const { svg, ball, arrow, fline, text, sub, both, through, sampled, labelled, track, anim, spin, twoState, PLAY, f } = P;
  const positive = (x, y, r = 18) => ball(x, y, r, 'proton');
  const electron = (x, y, r = 16) => ball(x, y, r, 'electron');
  // A magnetic field at right angles to the page: crosses for into the page, dots for out of it.
  // Faint where labels are read over the field.
  const cross = (x, y, faint = false, s = 9) => `<path d="M${x - s},${y - s} l${2 * s},${2 * s} m0,${-2 * s} l${-2 * s},${2 * s}" style="stroke:var(--brand-accent-strong);stroke-width:3;stroke-linecap:round;opacity:${faint ? .22 : .55}"/>`;
  const spot = (x, y) => `<circle cx="${x}" cy="${y}" r="5" style="fill:var(--brand-accent-strong);opacity:.6"/>`;
  const fieldGrid = (x0, y0, nx, ny, step, out = false, faint = false) => Array.from({ length: nx * ny }, (_, i) => (out ? spot : cross)(x0 + (i % nx) * step, y0 + Math.floor(i / nx) * step, faint)).join('');
  const plate = (x, y, w, h, kind) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="5" style="fill:var(--${kind})"/>`;
  const once = { loop: false };
  const wire = (x1, y1, x2, y2) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" style="stroke:var(--brand-accent);stroke-width:10;stroke-linecap:round"/>`;
  const wireEnd = (x, y, out, r = 17) => `<circle cx="${x}" cy="${y}" r="${r}" style="fill:var(--card-bg);stroke:var(--brand-accent);stroke-width:4"/>` + (out ? `<circle cx="${x}" cy="${y}" r="${r * 0.3}" style="fill:var(--brand-accent)"/>` : `<path d="M${x - r * 0.5},${y - r * 0.5} l${r},${r} m0,${-r} l${-r},${r}" style="stroke:var(--brand-accent);stroke-width:4;stroke-linecap:round"/>`);

  return {
    // An electron accelerated from rest between two plates. Played with →.
    'd3-accelerate': el => {
      const on = labelled(el);
      let s = plate(170, 110, 16, 300, 'electron') + plate(600, 110, 16, 120, 'proton') + plate(600, 290, 16, 120, 'proton');
      s += [150, 205, 315, 370].map(y => fline(600, y, 186, y, 'brand-primary', 2.5, 0.5, 'opacity=".45"')).join('') + `<line x1="200" y1="260" x2="780" y2="260" class="guide"/>`;
      if (on) s += text(178, 90, '−', 'lbl display') + text(608, 90, '+', 'lbl display') + text(390, 470, 'potential difference V', 'lbl mono') + both(196, 440, 592, 440) + text(700, 232, 'v', 'lbl display') + text(390, 136, 'field E', 'lbl', 'middle', 'style="fill:var(--brand-primary)"');
      const still = electron(400, 260) + arrow(424, 260, 520, 260, 'brand-primary', 5) + (on ? text(470, 300, 'F = qE', 'lbl mono strong') : '');
      const ride = Array.from({ length: 31 }, (_, i) => { const t = i / 30 * 1.5; return [t < 1 ? 210 + 398 * t * t : 608 + 796 * (t - 1) * 0.5, 260]; });
      const mover = `<g transform="translate(210 260)">${track(ride, 2.4, once)}${electron(0, 0)}</g>` + PLAY;
      return svg('120 60 700 430', s + twoState(still + arrow(640, 260, 760, 260, 'brand-accent', 5), mover + arrow(640, 260, 760, 260, 'brand-accent', 5, 'opacity=".5"')), 'An electron accelerated from rest by the uniform electric field between a negative plate and a positive plate. The force on it is constant, so it gains speed steadily and leaves through a hole in the positive plate with speed v');
    },

    // An electron entering a uniform field at right angles: a parabola inside, a straight line after. Played with →.
    'd3-deflect': () => {
      const x0 = 250, x1 = 550, k = 70 / (300 * 300), slope = 2 * k * 300;
      const path = t => { const x = 100 + 680 * t; return [x, x < x0 ? 260 : x < x1 ? 260 - k * (x - x0) ** 2 : 190 - slope * (x - x1)]; };
      let s = plate(x0, 104, 300, 16, 'proton') + plate(x0, 400, 300, 16, 'electron') + [290, 350, 410, 470, 510].map(x => fline(x, 120, x, 400, 'brand-primary', 2.5, 0.8, 'opacity=".4"')).join('');
      s += `<path d="${sampled(path, 80)}" class="guide accent" style="stroke-width:3"/><line x1="100" y1="260" x2="780" y2="260" class="guide"/>` + arrow(110, 260, 200, 260, 'brand-accent', 5);
      s += text(150, 236, 'v', 'lbl display') + text(400, 88, '+', 'lbl display') + text(400, 452, '−', 'lbl display') + text(400, 320, 'parabola', 'lbl strong halo') + text(770, 200, 'then a', 'lbl', 'end') + text(770, 232, 'straight line', 'lbl', 'end');
      const [px, py] = path(0.42);
      const still = electron(px, py) + arrow(px, py - 20, px, py - 96, 'brand-primary', 5) + text(px + 16, py - 70, 'F', 'lbl display', 'start');
      const points = Array.from({ length: 61 }, (_, i) => path(i / 60));
      return svg('80 50 720 430', s + twoState(still, `<g transform="translate(100 260)">${track(points, 2.6, once)}${electron(0, 0)}</g>` + PLAY), 'An electron enters the uniform field between two horizontal plates, moving parallel to them. Its horizontal velocity stays constant while a constant force accelerates it towards the positive plate, so its path is a parabola. After leaving the plates it travels in a straight line');
    },

    // The force on a positive charge moving at right angles to a field into the page.
    'd3-qvb': () => {
      let s = fieldGrid(140, 90, 8, 5, 76) + positive(400, 300) + arrow(424, 300, 590, 300, 'brand-accent', 6) + arrow(400, 276, 400, 130, 'brand-primary', 6);
      s += text(520, 344, 'v', 'lbl display') + text(424, 150, 'F', 'lbl display', 'start') + text(410, 470, 'field B into the page', 'lbl halo');
      return svg('100 50 620 440', s, 'A positive charge moving to the right through a magnetic field that points into the page. The force on it is upwards, at right angles to both its velocity and the field');
    },

    // Fleming's left-hand rule as three arrows at right angles: the flat picture. On the slide,
    // hand.js draws a hand in three dimensions over it and in the thumbnail; this one stays for print.
    'd3-rule': () => {
      let s = arrow(330, 330, 330, 90, 'brand-primary', 7) + arrow(330, 330, 600, 330, 'brand-accent', 7) + arrow(330, 330, 500, 226, 'brand-accent-strong', 7, 'stroke-dasharray="14 8"') + `<circle cx="330" cy="330" r="9" style="fill:var(--text-main)"/>`;
      s += text(352, 110, 'Thumb', 'lbl strong', 'start') + text(352, 144, 'F: force', 'lbl', 'start');
      s += text(620, 320, 'Middle finger', 'lbl strong', 'start') + text(620, 354, 'I: current', 'lbl', 'start');
      s += text(520, 206, 'Index finger', 'lbl strong', 'start') + text(520, 240, 'B: field (here into the page)', 'lbl', 'start');
      return svg('180 60 760 340', s, 'Fleming’s left-hand rule. The thumb, index finger and middle finger of the left hand are held at right angles to one another: the thumb gives the force F, the index finger the field B and the middle finger the current I, which is the way a positive charge moves');
    },

    // A positive particle circling in a uniform field into the page. Also the title picture, with data-plain.
    'd3-circle': el => {
      const on = labelled(el), cx = 400, cy = 270, r = 150;
      let s = fieldGrid(140, 80, 8, 6, 76, false, true) + `<circle cx="${cx}" cy="${cy}" r="${r}" class="guide accent" style="stroke-width:3"/>`;
      const body = arrow(cx, cy - r + 22, cx, cy - r + 110, 'brand-primary', 5) + arrow(cx - 24, cy - r, cx - 130, cy - r, 'brand-accent', 5) + positive(cx, cy - r);
      if (on) s += text(cx, cy + 62, 'F is always', 'lbl halo') + text(cx, cy + 96, 'towards the centre', 'lbl halo') + both(cx + 6, cy, cx + r - 4, cy) + text(cx + 78, cy - 14, 'r', 'lbl display halo');
      return svg('100 50 620 450', s + twoState(body, `<g>${spin(cx, cy, 5, { turns: -1 })}${body}</g>`), 'A positive particle moving in a circle in a uniform magnetic field that points into the page. The magnetic force is always at right angles to the velocity and points to the centre of the circle, so the speed stays constant');
    },

    // A fine beam tube: electrons from a gun are bent into a circle by a field out of the page.
    'd3-fine-beam': () => {
      const cx = 400, cy = 250, r = 120;
      let s = `<circle cx="${cx}" cy="270" r="215" style="fill:color-mix(in srgb, var(--electron) 7%, var(--viewer-bg));stroke:var(--text-secondary);stroke-width:2.5"/>` + fieldGrid(250, 110, 5, 5, 76, true);
      s += `<circle cx="${cx}" cy="${cy}" r="${r}" style="fill:none;stroke:var(--electron);stroke-width:5;opacity:.8"/><rect x="${cx - 52}" y="${cy + r - 18}" width="52" height="36" rx="6" style="fill:var(--lead)"/>`;
      s += both(cx + 4, cy, cx + r - 6, cy) + text(cx + 60, cy - 14, 'r', 'lbl display halo') + text(cx - 26, cy + r + 52, 'electron gun', 'lbl halo') + text(660, 110, 'field B', 'lbl', 'start') + text(660, 144, 'out of the page', 'lbl', 'start') + text(660, 250, 'accelerating', 'lbl', 'start') + text(660, 284, 'voltage V', 'lbl', 'start');
      const bead = electron(cx, cy + r, 11);
      return svg('170 40 720 460', s + twoState(electron(cx + r, cy, 11), `<g>${spin(cx, cy, 2.2, { turns: -1 })}${bead}</g>`), 'A fine beam tube. Electrons leave an electron gun at the bottom of a glass bulb and a uniform magnetic field out of the page bends them into a circle of radius r');
    },

    // Velocity at an angle to the field: the particle spirals along the field lines.
    'd3-helix': () => {
      const at = t => { const a = t * 5 * 2 * Math.PI; return [120 + 560 * t + 44 * Math.cos(a), 260 - 90 * Math.sin(a)]; };
      let s = [110, 185, 335, 410].map(y => fline(90, y, 760, y, 'brand-accent-strong', 3, 0.94, 'opacity=".5"')).join('') + `<path d="${sampled(at, 300)}" class="guide accent" style="stroke-width:3;stroke-dasharray:none"/>`;
      s += text(770, 100, 'B', 'lbl display', 'start') + text(430, 470, 'along the field: constant velocity', 'lbl') + text(430, 62, 'across the field: a circle', 'lbl');
      const points = Array.from({ length: 151 }, (_, i) => at(i / 150)), [px, py] = at(0.33);
      return svg('60 30 760 460', s + twoState(positive(px, py, 14), `<g>${track(points, 5)}${positive(0, 0, 14)}</g>`), 'A charged particle whose velocity is at an angle to a uniform magnetic field. The part of its velocity along the field is unchanged and the part across the field becomes circular motion, so it follows a helix along the field lines');
    },

    // Crossed electric and magnetic fields. Played with →: only the particle with v = E / B goes straight through.
    'd3-selector': () => {
      let s = fieldGrid(250, 150, 5, 4, 72) + plate(220, 96, 340, 16, 'proton') + plate(220, 408, 340, 16, 'electron') + `<path d="M690,60 V236 M690,284 V460" class="tick" style="stroke-width:10"/>`;
      const straight = [[90, 260], [780, 260]];
      const bend = k => Array.from({ length: 41 }, (_, i) => { const x = 90 + 590 * i / 40, u = Math.max(0, x - 220); return [x, 260 + k * u * u]; });
      const slow = bend(0.00052), fast = bend(-0.00052);
      s += `<path d="${through(slow)} ${through(fast)} ${through(straight)}" class="guide accent" style="stroke-width:2.5"/>`;
      s += text(390, 80, '+', 'lbl display') + text(390, 460, '−', 'lbl display') + text(100, 232, 'v', 'lbl display', 'start') + arrow(96, 260, 190, 260, 'brand-accent', 5);
      s += text(672, 150, 'too fast', 'lbl', 'end') + text(672, 392, 'too slow', 'lbl', 'end') + text(712, 236, 'v = E / B', 'lbl mono strong', 'start');
      const forces = arrow(400, 244, 400, 170, 'brand-primary', 5) + arrow(400, 276, 400, 350, 'brand-primary', 5) + text(416, 186, 'qvB', 'lbl mono strong halo', 'start') + text(416, 346, 'qE', 'lbl mono strong halo', 'start');
      const go = (points, dur) => `<g transform="translate(90 260)">${track(points, dur, once)}${positive(0, 0, 13)}</g>`;
      return svg('70 40 810 440', s + twoState(positive(400, 260, 14) + forces, go(fast, 1.5) + go(straight.concat([[780, 260]]), 2) + go(slow, 2.7) + PLAY), 'A velocity selector: positive particles enter a region with an electric field pointing down and a magnetic field into the page. The electric force is downwards and the magnetic force upwards. Only particles with speed E divided by B feel no resultant force and pass straight through the slit. Faster ones curve upwards and slower ones curve downwards');
    },

    // A wire carrying current out of the page between the poles of a magnet. Also drawn small, with data-plain.
    'd3-wire-force': el => {
      const on = labelled(el);
      let s = `<rect x="80" y="150" width="150" height="220" rx="8" style="fill:var(--proton)"/><rect x="570" y="150" width="150" height="220" rx="8" style="fill:var(--electron)"/>` + text(155, 274, 'N', 'lbl display', 'middle', 'style="fill:#fff"') + text(645, 274, 'S', 'lbl display', 'middle', 'style="fill:#fff"');
      s += [190, 260, 330].map(y => fline(230, y, 570, y, 'brand-accent-strong', 3, 0.3, 'opacity=".6"')).join('') + arrow(400, 238, 400, 96, 'brand-primary', 6) + wireEnd(400, 260, true, 22);
      if (on) s += text(424, 116, 'F', 'lbl display', 'start') + text(400, 420, 'current I out of the page', 'lbl') + text(310, 176, 'B', 'lbl display');
      return svg('60 70 680 370', s, 'A wire carrying a current out of the page sits between the north and south poles of a magnet, where the field points from left to right. The force on the wire is upwards, at right angles to both the current and the field');
    },

    // A pair of long parallel wires: data-kind="opposite" for currents in opposite directions,
    // otherwise the same direction. Each pair waits for a press of → and then moves. On the slide
    // the second figure is itself a step, so one press shows its wires and the next sets them moving.
    'd3-parallel': el => {
      const same = el.dataset.kind !== 'opposite', k = same ? 1 : -1, a = 300, b = 480;
      const one = (wx, up, dir, side) => wire(wx, 410, wx, 100) + (up ? arrow(wx + side * 30, 200, wx + side * 30, 120, 'brand-accent', 5) : arrow(wx + side * 30, 120, wx + side * 30, 200, 'brand-accent', 5)) + text(wx + side * 30, 238, 'I', 'lbl display') + arrow(wx + dir * 8, 320, wx + dir * 54, 320, 'brand-primary', 5);
      const shift = (body, d) => `<g>${track([[0, 0], [d, 0]], 1.2, { loop: false, extra: 'calcMode="spline" keySplines=".3 0 .3 1" keyTimes="0;1"' })}${body}</g>`;
      const note = text(390, 474, same ? 'same direction: attract' : 'opposite directions: repel', 'lbl strong');
      const still = one(a, true, k, -1) + one(b, same, -k, 1), mover = shift(one(a, true, k, -1), k * 20) + shift(one(b, same, -k, 1), -k * 20);
      const label = same ? 'Two long parallel wires carrying currents in the same direction: they attract each other' : 'Two long parallel wires carrying currents in opposite directions: they repel each other';
      return svg('190 80 400 420', note + twoState(still, mover + PLAY), label);
    },

    // Why parallel currents attract: wire 2 sits in the field of wire 1.
    'd3-parallel-end': () => {
      let s = [70, 130, 250].map(r => `<circle cx="280" cy="260" r="${r}" style="fill:none;stroke:var(--brand-accent-strong);stroke-width:3;opacity:.6"/>`).join('');
      s += [[70, 200], [130, 250], [250, 180]].map(([r, deg]) => { const a = deg * Math.PI / 180, x = 280 + r * Math.cos(a), y = 260 + r * Math.sin(a); return `<path d="M-9,-8 L9,0 L-9,8 Z" transform="translate(${f(x)} ${f(y)}) rotate(${deg - 90})" style="fill:var(--brand-accent-strong)"/>`; }).join('');
      s += arrow(530, 260, 530, 150, 'brand-accent-strong', 5) + arrow(506, 260, 400, 260, 'brand-primary', 6) + wireEnd(280, 260, true) + wireEnd(530, 260, true);
      s += text(280, 316, 'wire 1', 'lbl strong halo') + text(560, 316, 'wire 2', 'lbl strong halo', 'start') + text(546, 176, sub('B', '1'), 'lbl display', 'start') + text(440, 236, 'F', 'lbl display');
      s += `<line x1="280" y1="420" x2="280" y2="470" class="guide"/><line x1="530" y1="420" x2="530" y2="470" class="guide"/>` + both(286, 456, 524, 456) + text(405, 444, 'r', 'lbl display halo');
      return svg('10 0 720 500', s, 'Two parallel wires seen end on, both with current out of the page, a distance r apart. Wire 1 makes a circular field which points upwards at wire 2. The force on wire 2 is towards wire 1, so the wires attract');
    }
  };
});
