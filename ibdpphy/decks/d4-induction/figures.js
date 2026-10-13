// Diagrams for the D.4 Induction deck (higher level only), added to the shared set in
// ../assets/figures.js. Magnetic field lines and symbols are slate, velocities and currents
// apricot, forces teal; flux curves are teal and emf curves terracotta.
window.DeckFigures.add(P => {
  const { svg, arrow, text, sub, axes, both, through, sampled, labelled, spring, track, anim, spin, twoState, PLAY, f, TAU } = P;
  const cross = (x, y, s = 9) => `<path d="M${x - s},${y - s} l${2 * s},${2 * s} m0,${-2 * s} l${-2 * s},${2 * s}" style="stroke:var(--brand-accent-strong);stroke-width:3;stroke-linecap:round;opacity:.5"/>`;
  const fieldGrid = (x0, y0, nx, ny, step) => Array.from({ length: nx * ny }, (_, i) => cross(x0 + (i % nx) * step, y0 + Math.floor(i / nx) * step)).join('');
  // A bar magnet with its north pole at the end given by `north` ('left', 'right', 'up' or 'down').
  const magnet = (x, y, w, h, north) => {
    const flat = w > h, first = north === 'left' || north === 'up', a = first ? 'proton' : 'electron', b = first ? 'electron' : 'proton', la = first ? 'N' : 'S', lb = first ? 'S' : 'N';
    const half = flat ? `<rect x="${x}" y="${y}" width="${w / 2}" height="${h}" style="fill:var(--${a})"/><rect x="${x + w / 2}" y="${y}" width="${w / 2}" height="${h}" style="fill:var(--${b})"/>` : `<rect x="${x}" y="${y}" width="${w}" height="${h / 2}" style="fill:var(--${a})"/><rect x="${x}" y="${y + h / 2}" width="${w}" height="${h / 2}" style="fill:var(--${b})"/>`;
    const label = (lx, ly, s) => text(lx, ly + 11, s, 'lbl display', 'middle', 'style="fill:#fff;font-size:30px"');
    return half + (flat ? label(x + w / 4, y + h / 2, la) + label(x + 3 * w / 4, y + h / 2, lb) : label(x + w / 2, y + h / 4, la) + label(x + w / 2, y + 3 * h / 4, lb));
  };
  // A coil seen from the side: n turns between x1 and x2 round the axis y.
  const coil = (x1, x2, y, n, ry = 70) => Array.from({ length: n }, (_, i) => `<ellipse cx="${f(x1 + (x2 - x1) * i / (n - 1))}" cy="${y}" rx="15" ry="${ry}" style="fill:none;stroke:var(--brand-accent);stroke-width:5"/>`).join('');
  const meter = (x, y, needle) => `<circle cx="${x}" cy="${y}" r="46" style="fill:var(--card-bg);stroke:var(--text-secondary);stroke-width:3"/><path d="M${x - 30},${y - 8} A32,32 0 0 1 ${x + 30},${y - 8}" class="guide"/>${needle}<circle cx="${x}" cy="${y + 14}" r="5" style="fill:var(--text-main)"/>`;
  const pointer = (x, y) => `<line x1="${x}" y1="${y + 14}" x2="${x}" y2="${y - 26}" style="stroke:var(--hl);stroke-width:4;stroke-linecap:round"/>`;
  const wave = (x0, x1, y0, amp, cycles, phase = 0, n = 120) => sampled(t => [x0 + (x1 - x0) * t, y0 - amp * Math.sin(phase + t * cycles * TAU)], n);
  const line = (d, colour, width = 5) => `<path d="${d}" style="fill:none;stroke:var(--${colour});stroke-width:${width};stroke-linecap:round;stroke-linejoin:round"/>`;

  return {
    // A magnet moved in and out of a coil joined to a sensitive meter. Also the title picture, with data-plain.
    'd4-magnet-coil': el => {
      const on = labelled(el), steps = 48, shift = i => 70 * Math.sin(i / steps * TAU), turn = i => 34 * Math.cos(i / steps * TAU);
      let s = coil(470, 640, 220, 7) + `<path d="M470,290 V400 H544 M640,290 V400 H636" style="fill:none;stroke:var(--brand-accent);stroke-width:4"/>`;
      if (on) s += text(555, 120, 'coil', 'lbl') + text(590, 480, 'meter', 'lbl') + text(250, 320, 'moving magnet', 'lbl');
      const bar = magnet(150, 185, 220, 70, 'right');
      const still = bar + meter(590, 400, `<g transform="rotate(28 590 414)">${pointer(590, 400)}</g>`) + arrow(200, 150, 300, 150, 'brand-accent', 5);
      const mover = `<g>${track(Array.from({ length: steps + 1 }, (_, i) => [shift(i), 0]), 4)}${bar}</g>` + meter(590, 400, `<g>${`<animateTransform attributeName="transform" type="rotate" values="${Array.from({ length: steps + 1 }, (_, i) => `${f(turn(i))} 590 414`).join(';')}" dur="4s" repeatCount="indefinite"/>`}${pointer(590, 400)}</g>`);
      return svg(on ? '100 80 640 420' : '120 100 580 380', s + twoState(still, mover), 'A bar magnet is moved in and out of a coil connected to a sensitive meter. The meter deflects one way as the magnet goes in and the other way as it comes out, and reads zero when the magnet is at rest');
    },

    // Flux through a loop whose normal makes an angle θ with the field.
    'd4-flux': () => {
      let s = [110, 180, 250, 320, 390].map(y => arrow(80, y, 740, y, 'brand-accent-strong', 3, 'opacity=".55"')).join('');
      s += `<ellipse cx="400" cy="250" rx="60" ry="150" transform="rotate(-30 400 250)" style="fill:color-mix(in srgb, var(--brand-primary) 22%, transparent);stroke:var(--brand-primary);stroke-width:4"/>`;
      s += arrow(400, 250, 573, 150, 'hl', 5) + `<line x1="400" y1="250" x2="600" y2="250" class="guide"/><path d="M490,250 A90,90 0 0 0 478,205" class="guide accent"/>`;
      s += text(516, 238, 'θ', 'lbl greek') + text(590, 136, 'normal', 'lbl strong', 'start') + text(748, 100, 'B', 'lbl display', 'start') + text(300, 440, 'area A', 'lbl strong');
      return svg('60 60 740 400', s, 'A loop of area A in a uniform magnetic field B. The normal to the loop makes an angle theta with the field lines, so fewer field lines pass through the loop than if it faced the field directly');
    },

    // Flux against time above, induced emf below: the emf is minus the gradient.
    'd4-flux-graphs': () => {
      let s = axes(110, 210, 760, 40, 'time', 'flux') + line('M110,210 L290,80 H500 L590,210 H720', 'brand-primary');
      s += arrow(110, 470, 110, 250, 'text-secondary', 2.5) + arrow(110, 380, 760, 380, 'text-secondary', 2.5) + text(126, 264, 'emf', 'lbl mono', 'start') + text(754, 416, 'time', 'lbl mono', 'end');
      s += line('M110,410 H290 V380 H500 V320 H590 V380 H720', 'hl') + `<path d="M290,40 V470 M500,40 V470 M590,40 V470" class="guide"/>`;
      s += text(200, 450, 'small emf', 'lbl halo') + text(395, 360, 'zero', 'lbl halo') + text(600, 306, 'large emf,', 'lbl halo', 'start') + text(600, 338, 'opposite sign', 'lbl halo', 'start');
      return svg('0 0 800 480', s, 'Two graphs against the same time axis. The flux rises steadily, stays constant, then falls quickly to zero. The induced emf is small and constant while the flux rises, zero while the flux is constant, and larger and of opposite sign while the flux falls');
    },

    // Lenz's law for a magnet approaching and leaving a coil.
    'd4-lenz': () => {
      const one = (y, away) => {
        const d = away ? -1 : 1;
        let s = magnet(120, y - 34, 190, 68, 'right') + arrow(215 - d * 50, y - 62, 215 + d * 50, y - 62, 'brand-accent', 5) + arrow(215 + d * 50, y + 62, 215 - d * 50, y + 62, 'brand-primary', 5);
        s += coil(480, 620, y, 6, 56) + text(440, y + 12, away ? 'S' : 'N', 'lbl display', 'middle', `style="fill:var(--${away ? 'electron' : 'proton'})"`);
        return s + text(215, y - 78, away ? 'pulled away' : 'pushed in', 'lbl', 'middle') + text(215, y + 98, 'force on the magnet', 'lbl', 'middle') + text(670, y - 6, away ? 'this end becomes S:' : 'this end becomes N:', 'lbl', 'start') + text(670, y + 28, away ? 'attracts the magnet' : 'repels the magnet', 'lbl strong', 'start');
      };
      return svg('60 30 910 500', one(150, false) + one(400, true), 'Lenz’s law for a magnet and a coil. When the north pole is pushed towards the coil, the induced current makes the near end of the coil a north pole, which repels the magnet. When the magnet is pulled away, the near end becomes a south pole, which attracts it. Either way the force on the magnet opposes its motion');
    },

    // A magnet dropped through a plastic tube and through a copper tube. Played with →.
    'd4-tube': () => {
      const tube = (x, colour, label) => `<rect x="${x - 44}" y="80" width="88" height="380" style="fill:color-mix(in srgb, var(--${colour}) 22%, var(--viewer-bg));stroke:var(--${colour});stroke-width:4"/>` + text(x, 56, label, 'lbl strong');
      const drop = magnet(-22, -34, 44, 68, 'up');
      let s = tube(230, 'neutron', 'plastic tube') + tube(570, 'brand-accent', 'copper tube');
      s += [180, 250, 320, 390].map(y => `<ellipse cx="570" cy="${y}" rx="44" ry="10" style="fill:none;stroke:var(--hl);stroke-width:3;opacity:.7"/>`).join('') + text(640, 280, 'induced', 'lbl', 'start') + text(640, 314, 'currents', 'lbl', 'start');
      s += text(230, 510, 'falls freely', 'lbl') + text(570, 510, 'falls slowly', 'lbl');
      const fast = Array.from({ length: 21 }, (_, i) => [230, 110 + 330 * (i / 20) ** 2]), slow = Array.from({ length: 21 }, (_, i) => [570, 110 + 330 * i / 20]);
      const still = `<g transform="translate(230 400)">${drop}</g><g transform="translate(570 220)">${drop}</g>` + arrow(596, 200, 596, 130, 'brand-primary', 5) + arrow(596, 240, 596, 310, 'brand-primary', 5);
      const mover = `<g transform="translate(230 110)">${track(fast, 0.8, { loop: false })}${drop}</g><g transform="translate(570 110)">${track(slow, 4, { loop: false })}${drop}</g>` + PLAY;
      return svg('120 20 660 510', s + twoState(still, mover), 'A magnet dropped through two vertical tubes. In the plastic tube it falls freely. In the copper tube the moving magnet induces currents in the tube walls, whose magnetic fields oppose its motion, so it falls slowly at a steady speed');
    },

    // A rod sliding along two rails in a field into the page: the area of the circuit grows.
    'd4-rod': el => {
      const on = labelled(el);
      const rails = `<path d="M150,150 H740 M150,370 H740 M150,150 V225 M150,295 V370" style="fill:none;stroke:var(--text-secondary);stroke-width:5"/><rect x="132" y="225" width="36" height="70" rx="6" style="fill:var(--card-bg);stroke:var(--text-secondary);stroke-width:3"/>`;
      const rod = x => `<rect x="${x - 8}" y="130" width="16" height="260" rx="6" style="fill:var(--brand-accent)"/>`;
      const area = (x, extra = '') => `<rect x="152" y="152" width="${x - 152}" height="216" style="fill:var(--brand-primary);opacity:.18">${extra}</rect>`;
      let s = fieldGrid(200, 110, 8, 5, 76) + rails;
      if (on) s += text(96, 268, 'R', 'lbl display') + both(780, 156, 780, 364) + text(796, 270, 'L', 'lbl display', 'start') + text(450, 462, 'field B into the page', 'lbl');
      const labels = x => arrow(x + 16, 260, x + 110, 260, 'brand-accent', 5) + arrow(x - 28, 330, x - 28, 196, 'hl', 4) + (on ? text(x + 66, 236, 'v', 'lbl display') + text(x - 46, 270, 'I', 'lbl display', 'end') : '');
      const still = area(460) + rod(460) + labels(460);
      const xs = Array.from({ length: 25 }, (_, i) => 300 + 300 * i / 24);
      const mover = area(300, anim('width', xs.map(x => x - 152), 4)) + `<g>${track(xs.map(x => [x - 300, 0]), 4)}${rod(300)}${labels(300)}</g>`;
      return svg(on ? '60 90 780 390' : '110 90 660 320', s + twoState(still, mover), 'A metal rod of length L slides at speed v along two rails joined by a resistor R, in a magnetic field into the page. As the rod moves, the area of the circuit and the flux through it increase, and a current I is induced upwards through the rod');
    },

    // A rectangular coil pulled through a region of field, with the emf it produces.
    'd4-coil-through': () => {
      const T = 6, n = 60, left = i => 60 + 620 * i / n, gx = xl => 110 + (xl - 60) / 620 * 620;
      let s = `<rect x="300" y="50" width="260" height="170" style="fill:var(--brand-accent-strong);opacity:.08"/>` + fieldGrid(330, 76, 4, 3, 66) + text(430, 36, 'region of uniform field', 'lbl');
      const emf = xl => (xl > 180 && xl < 300 ? 1 : xl > 440 && xl < 560 ? -1 : 0);
      s += arrow(110, 470, 110, 270, 'text-secondary', 2.5) + arrow(110, 380, 770, 380, 'text-secondary', 2.5) + text(126, 284, 'emf', 'lbl mono', 'start') + text(764, 416, 'time', 'lbl mono', 'end');
      s += line(`M${gx(60)},380 H${gx(180)} V320 H${gx(300)} V380 H${gx(440)} V440 H${gx(560)} V380 H${gx(680)}`, 'hl');
      s += text(gx(240), 304, 'entering', 'lbl halo') + text(gx(370), 350, 'all inside: zero', 'lbl halo') + text(gx(500), 470, 'leaving', 'lbl halo');
      const loop = `<rect x="0" y="86" width="120" height="98" style="fill:none;stroke:var(--brand-accent);stroke-width:6"/>` + arrow(126, 135, 196, 135, 'brand-accent', 4) + text(160, 112, 'v', 'lbl display');
      const marker = `<circle r="10" style="fill:var(--hl)"/>`;
      const still = `<g transform="translate(240 0)">${loop}</g><g transform="translate(${gx(240)} 320)">${marker}</g>`;
      const mover = `<g>${track(Array.from({ length: n + 1 }, (_, i) => [left(i), 0]), T)}${loop}</g><g>${track(Array.from({ length: n + 1 }, (_, i) => [gx(left(i)), 380 - 60 * emf(left(i))]), T)}${marker}</g>`;
      return svg('40 0 760 490', s + twoState(still, mover), 'A rectangular coil is pulled at constant speed through a region of uniform magnetic field. An emf is induced while the coil is entering the field and an emf of the opposite sign while it is leaving. While the whole coil is inside the field the flux through it is not changing and the emf is zero');
    },

    // A magnet bouncing on a spring above a coil, and the alternating emf it induces.
    'd4-spring-magnet': () => {
      const steps = 24, y = i => 190 + 46 * Math.sin(i / steps * TAU), body = magnet(-26, 0, 52, 90, 'down');
      const coilShape = Array.from({ length: 5 }, (_, i) => `<ellipse cx="200" cy="${400 + i * 18}" rx="74" ry="14" style="fill:none;stroke:var(--brand-accent);stroke-width:5"/>`).join('');
      let s = `<line x1="110" y1="40" x2="290" y2="40" class="tick" style="stroke-width:6"/>` + coilShape + `<path d="M274,400 H330 M274,472 H330" style="fill:none;stroke:var(--brand-accent);stroke-width:4"/>` + text(200, 524, 'coil', 'lbl');
      s += arrow(430, 420, 430, 100, 'text-secondary', 2.5) + arrow(430, 260, 830, 260, 'text-secondary', 2.5) + text(446, 114, 'emf', 'lbl mono', 'start') + text(830, 222, 'time', 'lbl mono', 'end');
      s += line(sampled(t => [430 + 380 * t, 260 - 110 * Math.exp(-1.6 * t) * Math.sin(t * 4.5 * TAU)], 200), 'hl', 4) + text(640, 440, 'the oscillation dies away:', 'lbl') + text(640, 474, 'energy goes to the coil circuit', 'lbl');
      const springs = Array.from({ length: steps + 1 }, (_, i) => spring(200, 40, y(i), 8, 18).match(/d="([^"]+)"/)[1]);
      const still = spring(200, 40, 190, 8, 18) + `<g transform="translate(200 190)">${body}</g>`;
      const mover = `<path class="cable" stroke-linejoin="round" d="${springs[0]}">${anim('d', springs, 1.6)}</path><g>${track(Array.from({ length: steps + 1 }, (_, i) => [200, y(i)]), 1.6)}${body}</g>`;
      return svg('80 10 780 530', s + twoState(still, mover), 'A magnet hangs from a spring and oscillates up and down above a coil. The flux through the coil changes as the magnet moves, so an alternating emf is induced. The graph of emf against time is a sine curve whose amplitude dies away, because the induced current takes energy from the oscillation');
    },

    // A coil turning in a uniform field, seen end on, with the emf it produces. Also drawn small, with data-plain.
    'd4-generator': el => {
      const on = labelled(el), T = 4, n = 72, cx = 230, cy = 250;
      let s = `<rect x="20" y="150" width="60" height="200" rx="6" style="fill:var(--proton)"/><rect x="380" y="150" width="60" height="200" rx="6" style="fill:var(--electron)"/>` + text(50, 262, 'N', 'lbl display', 'middle', 'style="fill:#fff"') + text(410, 262, 'S', 'lbl display', 'middle', 'style="fill:#fff"');
      s += [180, 250, 320].map(y => arrow(88, y, 372, y, 'brand-accent-strong', 3, 'opacity=".5"')).join('');
      const blade = `<line x1="${cx}" y1="${cy - 96}" x2="${cx}" y2="${cy + 96}" style="stroke:var(--brand-accent);stroke-width:9;stroke-linecap:round"/><circle cx="${cx}" cy="${cy - 96}" r="13" style="fill:var(--brand-accent)"/><circle cx="${cx}" cy="${cy + 96}" r="13" style="fill:var(--brand-accent)"/>` + arrow(cx, cy, cx + 80, cy, 'hl', 4);
      const gx = t => 520 + 330 * t, gy = t => 250 - 110 * Math.sin(t * TAU);
      if (on) {
        s += arrow(520, 400, 520, 100, 'text-secondary', 2.5) + arrow(520, 250, 880, 250, 'text-secondary', 2.5) + text(536, 114, 'emf', 'lbl mono', 'start') + text(880, 226, 'time', 'lbl mono', 'end') + line(sampled(t => [gx(t), gy(t)], 120), 'hl');
        s += text(230, 420, 'coil seen end on', 'lbl') + text(230, 110, 'normal to the coil', 'lbl', 'middle', 'style="fill:var(--hl-text)"') + text(700, 440, 'one turn of the coil', 'lbl');
      }
      const dot = `<circle r="11" style="fill:var(--brand-accent-strong)"/>`;
      const still = `<g transform="rotate(50 ${cx} ${cy})">${blade}</g>` + (on ? `<g transform="translate(${f(gx(50 / 360))} ${f(gy(50 / 360))})">${dot}</g>` : '');
      const mover = `<g>${spin(cx, cy, T)}${blade}</g>` + (on ? `<g>${track(Array.from({ length: n + 1 }, (_, i) => [gx(i / n), gy(i / n)]), T)}${dot}</g>` : '');
      return svg(on ? '0 80 900 380' : '0 110 460 280', s + twoState(still, mover) + `<circle cx="${cx}" cy="${cy}" r="7" style="fill:var(--text-main)"/>`, 'A coil rotating between the poles of a magnet, seen end on. As it turns, the emf across it varies as a sine curve: zero when the plane of the coil is at right angles to the field, and greatest when the plane of the coil lies along the field');
    },

    // Flux linkage and emf for one rotation: the emf is greatest when the flux is zero.
    'd4-ac-graphs': () => {
      let s = arrow(110, 440, 110, 40, 'text-secondary', 2.5) + arrow(110, 240, 770, 240, 'text-secondary', 2.5) + text(764, 276, 'time', 'lbl mono', 'end');
      s += line(wave(110, 710, 240, 150, 1.5, Math.PI / 2), 'brand-primary') + line(wave(110, 710, 240, 150, 1.5), 'hl');
      s += `<path d="M210,60 V430 M410,60 V430" class="guide"/>` + text(150, 70, 'flux', 'lbl strong', 'start', 'style="fill:var(--brand-primary)"') + text(250, 70, 'emf', 'lbl strong', 'start', 'style="fill:var(--hl-text)"');
      s += text(210, 470, 'flux zero, emf greatest', 'lbl') + text(540, 470, 'flux greatest, emf zero', 'lbl') + `<line x1="510" y1="90" x2="510" y2="430" class="guide"/>`;
      return svg('60 20 740 470', s, 'Graphs of the flux through a rotating coil and of the induced emf against time. Both are sine curves of the same frequency, a quarter of a cycle apart: the emf is greatest when the flux is zero and changing fastest, and zero when the flux is greatest');
    },

    // Doubling the rotation frequency doubles the peak emf and halves the period.
    'd4-frequency': () => {
      let s = arrow(110, 450, 110, 30, 'text-secondary', 2.5) + arrow(110, 240, 770, 240, 'text-secondary', 2.5) + text(764, 276, 'time', 'lbl mono', 'end') + text(126, 44, 'emf', 'lbl mono', 'start');
      s += line(wave(110, 710, 240, 90, 1.5), 'brand-primary') + line(wave(110, 710, 240, 180, 3), 'hl');
      s += text(470, 190, 'frequency f', 'lbl strong halo', 'start', 'style="fill:var(--brand-primary)"') + text(560, 70, 'frequency 2f', 'lbl strong halo', 'start', 'style="fill:var(--hl-text)"');
      return svg('60 10 740 460', s, 'Two graphs of induced emf against time. Doubling the frequency of rotation gives a curve with twice the peak emf and half the period');
    }
  };
});
