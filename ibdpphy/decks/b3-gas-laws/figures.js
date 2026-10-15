// Diagrams for the B.3 Gas laws deck, added to the shared set in ../assets/figures.js. Gas
// molecules are teal, pressure and force apricot, hot red and cold blue. Nothing here is
// terracotta, because B.3 has no additional higher level content.
window.DeckFigures.add(P => {
  const { svg, arrow, text, sub, both, through, sampled, labelled, seeded, track, anim, twoState, f, TAU } = P;
  const line = (d, colour, width = 5, extra = '') => `<path d="${d}" style="fill:none;stroke:var(--${colour});stroke-width:${width};stroke-linecap:round;stroke-linejoin:round" ${extra}/>`;
  const tri = u => { const v = ((u % 2) + 2) % 2; return v < 1 ? v : 2 - v; };
  // A box of gas whose molecules never stop, as in the B.4 deck: each one bounces between the
  // walls for ever. With grow ≠ 1 the box breathes between width w and w × grow, and each
  // molecule is squeezed back by the same factor so that it stays round.
  function gas(x0, y0, w, h, n, seed, { grow = 1, dur = 7, r = 8 } = {}) {
    const rand = seeded(seed), T = 10, steps = 100;
    const atoms = Array.from({ length: n }, () => ({ a: 1 + Math.floor(rand() * 3), b: 1 + Math.floor(rand() * 3), p: rand() * 2, q: rand() * 2 }));
    const at = (atom, t, width) => [r + (width - 2 * r) * tri(atom.p + 2 * atom.a * t), y0 + r + (h - 2 * r) * tri(atom.q + 2 * atom.b * t)];
    const dot = `<circle r="${r}" style="fill:var(--brand-primary)"/>`, shade = width => `<rect x="0" y="${y0}" width="${f(width)}" height="${h}" style="fill:var(--brand-primary);opacity:.14"/>`;
    const stretch = (from, to) => grow === 1 ? '' : `<animateTransform attributeName="transform" type="scale" values="${from} 1;${to} 1;${to} 1;${from} 1;${from} 1" keyTimes="0;0.4;0.5;0.9;1" dur="${dur}s" repeatCount="indefinite"/>`;
    const still = `<g transform="translate(${x0} 0)">${shade(w)}${atoms.map(atom => { const [x, y] = at(atom, 0.37, w); return `<g transform="translate(${f(x)} ${f(y)})">${dot}</g>`; }).join('')}</g>`;
    const mover = `<g transform="translate(${x0} 0)"><g>${stretch(1, f(grow * 1000) / 1000)}${shade(w)}${atoms.map(atom => `<g>${track(Array.from({ length: steps + 1 }, (_, i) => at(atom, i / steps, w)), T)}<g>${stretch(1, f(1000 / grow) / 1000)}${dot}</g></g>`).join('')}</g></g>`;
    return { still, mover };
  }
  const carried = (body, dx, dur) => `<g><animateTransform attributeName="transform" type="translate" values="0,0;${dx},0;${dx},0;0,0;0,0" keyTimes="0;0.4;0.5;0.9;1" dur="${dur}s" repeatCount="indefinite"/>${body}</g>`;
  const walls = (x1, y1, x2, y2) => `<rect x="${x1}" y="${y1}" width="${x2 - x1}" height="${y2 - y1}" rx="6" style="fill:none;stroke:var(--text-secondary);stroke-width:6"/>`;
  // Graph axes with the origin at (x0, y0).
  const axes = (x0, y0, x1, y1, xl, yl) => arrow(x0, y0, x0, y1, 'text-secondary', 2.5) + arrow(x0, y0, x1, y0, 'text-secondary', 2.5) + text(x1 - 6, y0 + 40, xl, 'lbl mono', 'end') + text(x0 + 16, y1 + 14, yl, 'lbl mono', 'start');

  return {
    // A closed box of gas. Also the title picture, with data-plain.
    'b3-box': el => {
      const on = labelled(el), box = gas(206, 126, 388, 268, 30, 4);
      let s = walls(200, 120, 600, 400);
      if (on) s += arrow(606, 260, 684, 260, 'brand-accent', 6) + text(700, 248, 'each collision', 'lbl', 'start') + text(700, 282, 'pushes the wall', 'lbl', 'start');
      return svg(on ? '170 90 740 340' : '170 90 460 340', s + twoState(box.still, box.mover), 'A closed box of gas. The molecules move in all directions and bounce off the walls. Each collision pushes on the wall, and the enormous number of collisions each second gives a steady pressure');
    },

    // Boyle's law in action: a piston squeezes a gas and the pressure gauge rises. Also drawn plain.
    'b3-boyle': el => {
      const on = labelled(el), w = 420, grow = 0.5, dur = 7, dx = -w * (1 - grow);
      const box = gas(136, 176, w, 188, 26, 9, { grow, dur });
      const cyl = `<path d="M130,170 H700 M130,370 H700 M130,170 V370" style="fill:none;stroke:var(--text-secondary);stroke-width:6;stroke-linecap:round"/>`;
      const piston = `<rect x="556" y="176" width="26" height="188" rx="4" style="fill:var(--brand-accent-strong)"/><rect x="582" y="260" width="230" height="20" style="fill:var(--brand-accent-strong)"/>`;
      const gauge = `<line x1="250" y1="170" x2="250" y2="126" style="stroke:var(--text-secondary);stroke-width:8"/><circle cx="250" cy="80" r="50" style="fill:var(--card-bg);stroke:var(--text-secondary);stroke-width:4"/><path d="M216,96 A38,38 0 1 1 284,96" class="guide"/>`;
      const needle = `<line x1="250" y1="80" x2="250" y2="46" style="stroke:var(--proton);stroke-width:5;stroke-linecap:round"/>`;
      let s = cyl + gauge;
      if (on) s += text(250, 20, 'pressure gauge', 'lbl') + text(470, 420, 'half the volume: twice the pressure', 'lbl strong') + text(470, 456, 'the temperature is kept constant', 'lbl');
      const still = box.still + piston + `<g transform="rotate(-50 250 80)">${needle}</g>`;
      const turn = `<animateTransform attributeName="transform" type="rotate" values="-50 250 80;50 250 80;50 250 80;-50 250 80;-50 250 80" keyTimes="0;0.4;0.5;0.9;1" dur="${dur}s" repeatCount="indefinite"/>`;
      const mover = box.mover + carried(piston, dx, dur) + `<g>${turn}${needle}</g>` + `<circle cx="250" cy="80" r="6" style="fill:var(--text-main)"/>`;
      return svg(on ? '100 -10 730 480' : '100 20 730 370', s + twoState(still, mover), 'A gas in a cylinder with a piston and a pressure gauge. As the piston is pushed in and the volume halves, the reading on the gauge doubles; as the piston moves out again the pressure falls back. The temperature stays constant');
    },

    // The three gas laws as graphs. data-kind: boyle, pressure or charles.
    'b3-law': el => {
      const kind = el.dataset.kind || 'boyle';
      if (kind === 'boyle') {
        const X = v => 110 + 150 * v, Y = p => 430 - 80 * p, iso = (k, colour) => line(sampled(t => { const v = k / 4 + (4.45 - k / 4) * t; return [X(v), Y(k / v)]; }, 60), colour);
        let s = axes(110, 430, 790, 40, 'volume V', 'pressure P') + iso(1.6, 'electron') + iso(3.2, 'proton');
        s += `<path d="M${X(1)},430 V${Y(3.2)} H110 M${X(2)},430 V${Y(1.6)} H110" class="guide"/>` + `<circle cx="${X(1)}" cy="${Y(3.2)}" r="8" style="fill:var(--text-main)"/><circle cx="${X(2)}" cy="${Y(1.6)}" r="8" style="fill:var(--text-main)"/>`;
        s += text(X(1), 466, 'V', 'lbl mono') + text(X(2), 466, '2V', 'lbl mono') + text(96, Y(3.2) + 9, '2P', 'lbl mono', 'end') + text(96, Y(1.6) + 9, 'P', 'lbl mono', 'end') + text(X(3.3), Y(1.15), 'hotter', 'lbl strong halo', 'start') + text(X(3.3), Y(0.18) - 26, 'cooler', 'lbl strong halo', 'start');
        return svg('40 20 780 470', s, 'A graph of pressure against volume at constant temperature: a curve that falls as the volume increases. Doubling the volume halves the pressure. A second curve for a lower temperature lies below the first');
      }
      const charles = kind === 'charles', yl = charles ? 'volume V' : 'pressure P';
      const X = c => 420 + 1.1 * c, Y = c => 400 - 300 * (c + 273) / 573;
      let s = arrow(110, 400, 800, 400, 'text-secondary', 2.5) + arrow(X(0), 400, X(0), 50, 'text-secondary', 2.5) + text(X(0) + 16, 64, yl, 'lbl mono', 'start') + text(794, 440, 'θ / °C', 'lbl mono', 'end');
      s += line(`M${X(0)},${f(Y(0))} L${X(300)},${f(Y(300))}`, 'brand-primary', 6) + `<path d="M${f(X(-273))},400 L${X(0)},${f(Y(0))}" class="guide accent"/>` + [20, 100, 180, 260].map(c => `<circle cx="${X(c)}" cy="${f(Y(c))}" r="8" style="fill:var(--brand-primary)"/>`).join('');
      s += `<circle cx="${f(X(-273))}" cy="400" r="9" style="fill:var(--proton)"/>` + text(f(X(-273)), 440, '−273', 'lbl mono strong') + text(X(0), 440, '0', 'lbl mono') + text(X(200), 440, '200', 'lbl mono') + `<line x1="${X(200)}" y1="400" x2="${X(200)}" y2="410" class="tick"/>`;
      s += text(76, 480, 'absolute zero', 'lbl strong', 'start') + text(240, 150, 'the line through', 'lbl', 'middle') + text(240, 184, 'the readings,', 'lbl', 'middle') + text(240, 218, 'extended back', 'lbl', 'middle');
      return svg('60 30 760 470', s, `A graph of ${charles ? 'volume' : 'pressure'} against temperature in degrees Celsius for a fixed mass of gas at constant ${charles ? 'pressure' : 'volume'}. The readings lie on a straight line. Extended back, the line reaches zero at minus 273 degrees Celsius, absolute zero`);
    },

    // The three simple changes of an ideal gas, drawn as lines through one state on a P–V diagram:
    // each can go either way, so none has an arrowhead. Also drawn plain.
    'b3-pv': el => {
      const on = labelled(el), X = v => 110 + 150 * v, Y = p => 430 - 80 * p, iso = (k, from, to) => sampled(t => { const v = from + (to - from) * t; return [X(v), Y(k / v)]; }, 50);
      let s = arrow(110, 430, 110, 40, 'text-secondary', 2.5) + arrow(110, 430, 790, 430, 'text-secondary', 2.5);
      s += line(iso(4, 0.9, 4.2), 'brand-accent', 6) + line(`M${X(0.7)},${Y(2)} H${X(4.2)}`, 'brand-primary', 6) + line(`M${X(2)},${Y(4.4)} V${Y(0.4)}`, 'brand-accent-strong', 6) + `<circle cx="${X(2)}" cy="${Y(2)}" r="10" style="fill:var(--text-main)"/>`;
      if (on) s += text(126, 54, 'pressure', 'lbl mono', 'start') + text(784, 470, 'volume', 'lbl mono', 'end') + text(X(3.2), Y(2) - 16, 'constant pressure', 'lbl strong halo', 'middle', 'style="fill:var(--brand-primary)"') + text(X(2) + 16, Y(4.1), 'constant volume', 'lbl strong halo', 'start') + text(X(3.1), Y(0.75), 'constant temperature', 'lbl strong halo', 'middle', 'style="fill:var(--brand-accent)"');
      return svg(on ? '40 20 780 470' : '80 30 730 420', s, 'A pressure–volume diagram with three lines through one state of a gas. A change at constant pressure is a horizontal line, a change at constant volume is a vertical line, and a change at constant temperature is a curve along which pressure times volume stays the same');
    },

    // One molecule bouncing between two walls: its momentum reverses at each collision. Also drawn plain.
    'b3-collision': el => {
      const on = labelled(el), x1 = 170, x2 = 690, y = 250, r = 20, n = 40;
      let s = `<rect x="${x1 - 30}" y="120" width="30" height="260" style="fill:var(--brand-accent-strong);opacity:.8"/><rect x="${x2}" y="120" width="30" height="260" style="fill:var(--brand-accent-strong);opacity:.8"/>`;
      if (on) s += both(x1 + 4, 420, x2 - 4, 420) + text(430, 462, 'L', 'lbl display') + text(430, 80, 'one molecule, mass m, speed v', 'lbl');
      const ball = `<circle r="${r}" style="fill:var(--brand-primary)"/>`;
      const still = `<g transform="translate(520 ${y})">${ball}</g>` + arrow(548, y, 650, y, 'brand-accent', 6) + (on ? text(600, y - 22, 'mv', 'lbl mono strong') + arrow(650, y + 70, 548, y + 70, 'brand-accent', 6) + text(600, y + 112, '−mv after', 'lbl mono') : '');
      const pts = Array.from({ length: 2 * n + 1 }, (_, i) => [x1 + r + (x2 - x1 - 2 * r) * tri(i / n), y]);
      // The arrow flips when the molecule turns round.
      const flip = `<g>${anim('opacity', [1, 0], 2.4, { extra: 'calcMode="discrete"' })}${arrow(-28, -40, 28, -40, 'brand-accent', 6)}${on ? text(0, -62, 'mv', 'lbl mono strong') : ''}</g><g opacity="0">${anim('opacity', [0, 1], 2.4, { extra: 'calcMode="discrete"' })}${arrow(28, -40, -28, -40, 'brand-accent', 6)}${on ? text(0, -62, '−mv', 'lbl mono strong') : ''}</g>`;
      const mover = `<g>${track(pts, 2.4)}${ball}${flip}</g>`;
      return svg(on ? '110 40 640 440' : '110 100 640 300', s + twoState(still, mover), 'One molecule of mass m bouncing back and forth at speed v between two walls a distance L apart. At each collision with a wall its momentum changes from m v to minus m v, a change of 2 m v, so it exerts a force on the wall');
    }
  };
});
