// Diagrams for the C.1 Simple harmonic motion deck, added to the shared set in ../assets/figures.js.
// Displacement is teal, velocity apricot and acceleration slate; kinetic energy is apricot and
// potential energy teal. Terracotta is kept for what is higher level only.
window.DeckFigures.add(P => {
  const { svg, arrow, text, sub, both, through, sampled, labelled, track, anim, spin, twoState, f, TAU } = P;
  const line = (d, colour, width = 5, extra = '') => `<path d="${d}" style="fill:none;stroke:var(--${colour});stroke-width:${width};stroke-linecap:round;stroke-linejoin:round" ${extra}/>`;
  const N = 48, cyc = fn => Array.from({ length: N + 1 }, (_, i) => fn(i / N * TAU));
  // The path of a coiled spring lying along y from x1 to x2.
  const zig = (x1, x2, y, turns = 8, amp = 22) => { const lead = 14, n = turns * 2, w = (x2 - x1 - 2 * lead) / n; let d = `M${f(x1)},${y} H${f(x1 + lead)}`; for (let i = 0; i < n; i++) d += ` L${f(x1 + lead + w * (i + 0.5))},${y + (i % 2 ? amp : -amp)}`; return d + ` L${f(x2 - lead)},${y} H${f(x2)}`; };
  const block = (x, y, w = 80, h = 70) => `<rect x="${f(x - w / 2)}" y="${y - h / 2}" width="${w}" height="${h}" rx="10" style="fill:color-mix(in srgb, var(--brand-accent-strong) 35%, var(--viewer-bg));stroke:var(--brand-accent-strong);stroke-width:3"/>`;
  const axes = (x0, y0, x1, yTop, yBottom, xl, yl) => arrow(x0, yBottom, x0, yTop, 'text-secondary', 2.5) + arrow(x0, y0, x1, y0, 'text-secondary', 2.5) + text(x1 - 4, y0 + 36, xl, 'lbl mono', 'end') + text(x0 + 14, yTop + 14, yl, 'lbl mono', 'start');
  const wave = (x0, x1, y0, amp, cycles, phase, n = 120) => sampled(t => [x0 + (x1 - x0) * t, y0 - amp * Math.sin(phase + t * cycles * TAU)], n);

  return {
    // A mass on a horizontal spring. Labelled, it shows the quantities that describe an oscillation. Also the title picture.
    'c1-spring': el => {
      const on = labelled(el), wall = 110, eq = 470, A = 130, y = 250, T = 2.4;
      let s = `<rect x="${wall - 24}" y="${y - 90}" width="24" height="180" style="fill:var(--text-secondary);opacity:.7"/><line x1="60" y1="${y + 36}" x2="740" y2="${y + 36}" class="tick" style="stroke-width:4"/>`;
      if (on) s += `<line x1="${eq}" y1="130" x2="${eq}" y2="${y + 70}" class="guide accent"/>` + text(eq, 110, 'equilibrium position', 'lbl') + both(eq - A, y + 100, eq, y + 100) + both(eq, y + 100, eq + A, y + 100) + text(eq - A / 2, y + 140, sub('x', '0'), 'lbl display') + text(eq + A / 2, y + 140, sub('x', '0'), 'lbl display') + text(eq, y + 190, 'amplitude: the greatest displacement', 'lbl');
      const xs = cyc(a => eq + A * Math.cos(a));
      const still = line(zig(wall, eq + 80 - 40, y), 'text-secondary', 3) + block(eq + 80, y) + (on ? arrow(eq, y - 60, eq + 80, y - 60, 'brand-primary', 5) + text(eq + 40, y - 76, 'x', 'lbl display') : '');
      const mover = `<path style="fill:none;stroke:var(--text-secondary);stroke-width:3;stroke-linejoin:round" d="${zig(wall, xs[0] - 40, y)}">${anim('d', xs.map(x => zig(wall, x - 40, y)), T)}</path><g>${track(xs.map(x => [x - eq, 0]), T)}${block(eq, y)}</g>`;
      return svg(on ? '50 80 720 380' : '60 130 700 190', s + twoState(still, mover), 'A block on a horizontal spring fixed to a wall, oscillating either side of its equilibrium position. The amplitude is the greatest displacement from equilibrium');
    },

    // The defining equation as a graph: acceleration against displacement.
    'c1-ax': () => {
      const cx = 430, cy = 250;
      let s = arrow(110, cy, 770, cy, 'text-secondary', 2.5) + arrow(cx, 460, cx, 40, 'text-secondary', 2.5) + line(`M${cx - 240},${cy - 170} L${cx + 240},${cy + 170}`, 'brand-accent-strong', 6);
      s += `<path d="M${cx - 240},${cy} V${cy - 170} M${cx + 240},${cy} V${cy + 170}" class="guide"/>` + text(cx + 16, 54, 'a', 'lbl display', 'start') + text(766, cy - 16, 'x', 'lbl display', 'end') + text(cx - 240, cy + 40, sub('−x', '0'), 'lbl mono') + text(cx + 240, cy - 22, sub('x', '0'), 'lbl mono');
      s += text(cx + 60, cy - 110, 'gradient = −ω²', 'lbl strong halo', 'start') + text(cx - 30, cy - 190, 'displaced left: accelerates right', 'lbl small', 'end') + text(cx + 170, cy + 210, 'displaced right: accelerates left', 'lbl small', 'middle');
      return svg('40 0 780 490', s, 'A graph of acceleration against displacement for simple harmonic motion: a straight line through the origin with a negative gradient equal to minus omega squared. It runs only between minus the amplitude and plus the amplitude');
    },

    // Simple harmonic motion as the shadow of circular motion. Also drawn plain.
    'c1-circle': el => {
      const on = labelled(el), cx = 260, cy = 260, R = 150, px = 560, T = 3.2;
      let s = `<circle cx="${cx}" cy="${cy}" r="${R}" class="orbit"/><line x1="${px}" y1="${cy - R - 30}" x2="${px}" y2="${cy + R + 30}" class="tick"/><line x1="${px - 16}" y1="${cy}" x2="${px + 16}" y2="${cy}" class="tick"/>`;
      if (on) s += text(cx, cy + R + 60, 'steady circular motion,', 'lbl') + text(cx, cy + R + 94, 'angular speed ω', 'lbl') + text(px + 30, cy - R - 10, sub('+x', '0'), 'lbl mono', 'start') + text(px + 30, cy + R + 26, sub('−x', '0'), 'lbl mono', 'start') + text(px + 30, cy + 10, '0', 'lbl mono', 'start') + text(px + 150, cy + R + 74, 'its shadow:', 'lbl') + text(px + 150, cy + R + 108, 'simple harmonic motion', 'lbl strong');
      const dot = `<circle r="15" style="fill:var(--brand-accent)"/>`, shadow = `<circle r="15" style="fill:var(--brand-primary)"/>`;
      const a0 = 0.7, ys = cyc(a => cy - R * Math.sin(a));
      const still = `<line x1="${cx}" y1="${cy}" x2="${f(cx + R * Math.cos(a0))}" y2="${f(cy - R * Math.sin(a0))}" class="tick"/><line x1="${f(cx + R * Math.cos(a0))}" y1="${f(cy - R * Math.sin(a0))}" x2="${px}" y2="${f(cy - R * Math.sin(a0))}" class="guide accent"/><g transform="translate(${f(cx + R * Math.cos(a0))} ${f(cy - R * Math.sin(a0))})">${dot}</g><g transform="translate(${px} ${f(cy - R * Math.sin(a0))})">${shadow}</g>`;
      const mover = `<g>${`<animateTransform attributeName="transform" type="rotate" from="0 ${cx} ${cy}" to="-360 ${cx} ${cy}" dur="${T}s" repeatCount="indefinite"/>`}<line x1="${cx}" y1="${cy}" x2="${cx + R}" y2="${cy}" class="tick"/><g transform="translate(${cx + R} ${cy})">${dot}</g></g><line x2="${px}" class="guide accent" x1="${cx + R}" y1="${cy}" y2="${cy}">${anim('x1', cyc(a => f(cx + R * Math.cos(a))), T)}${anim('y1', ys.map(f), T)}${anim('y2', ys.map(f), T)}</line><g>${track(ys.map(y => [px, y]), T)}${shadow}</g>`;
      return svg(on ? '70 70 800 470' : '90 90 520 340', s + twoState(still, mover) + `<circle cx="${cx}" cy="${cy}" r="6" style="fill:var(--text-main)"/>`, 'A point moves steadily round a circle. Its shadow on a vertical line moves up and down with simple harmonic motion: the amplitude equals the radius of the circle and the angular frequency equals the angular speed of the point');
    },

    // Displacement, velocity and acceleration against time, one above the other.
    'c1-xva': () => {
      const x0 = 120, x1 = 760, rows = [[110, 'displacement', 'brand-primary', Math.PI / 2], [270, 'velocity', 'brand-accent', Math.PI], [430, 'acceleration', 'brand-accent-strong', -Math.PI / 2]];
      let s = rows.map(([y, name, colour, ph]) => arrow(x0, y, x1 + 30, y, 'text-secondary', 2.5) + `<line x1="${x0}" y1="${y - 62}" x2="${x0}" y2="${y + 62}" class="tick"/>` + line(wave(x0, x1, y, 54, 2, ph), colour) + text(x0 - 14, y + 9, name, 'lbl strong', 'end', `style="fill:var(--${colour})"`)).join('');
      s += [0.25, 0.5, 0.75, 1].map(k => `<line x1="${x0 + 320 * k}" y1="40" x2="${x0 + 320 * k}" y2="500" class="guide"/>`).join('') + text(x1 + 30, 536, 'time', 'lbl mono', 'end') + text(x0, 536, '0', 'lbl mono') + text(x0 + 160, 536, 'T/2', 'lbl mono') + text(x0 + 320, 536, 'T', 'lbl mono');
      return svg('-130 20 940 530', s, 'Three graphs against time for simple harmonic motion starting from the greatest displacement. Displacement is a cosine curve. Velocity is zero when the displacement is greatest and greatest when the displacement is zero. Acceleration is always opposite to the displacement: greatest and negative when the displacement is greatest and positive');
    },

    // A simple pendulum swinging through a small angle. Also drawn plain.
    'c1-pendulum': el => {
      const on = labelled(el), px = 400, py = 70, L = 320, max = 14, T = 2.6;
      let s = `<line x1="${px - 110}" y1="${py}" x2="${px + 110}" y2="${py}" class="tick" style="stroke-width:6"/><line x1="${px}" y1="${py}" x2="${px}" y2="${py + L + 60}" class="guide"/>`;
      if (on) s += both(px + 150, py + 6, px + 150, py + L - 4) + text(px + 170, py + L / 2 + 10, 'l', 'lbl display italic', 'start') + text(px, py + L + 110, 'small swings: the period does not depend', 'lbl') + text(px, py + L + 144, 'on the amplitude or on the mass', 'lbl');
      const bob = `<line x1="${px}" y1="${py}" x2="${px}" y2="${py + L}" class="cable"/><circle cx="${px}" cy="${py + L}" r="26" style="fill:var(--brand-accent-strong)"/>`;
      const still = `<g transform="rotate(${max} ${px} ${py})">${bob}</g>`;
      const mover = `<g><animateTransform attributeName="transform" type="rotate" values="${cyc(a => `${f(max * Math.cos(a))} ${px} ${py}`).join(';')}" dur="${T}s" repeatCount="indefinite"/>${bob}</g>`;
      return svg(on ? '110 30 600 530' : '230 40 340 400', s + twoState(still, mover) + `<circle cx="${px}" cy="${py}" r="6" style="fill:var(--text-main)"/>`, 'A simple pendulum: a small bob on a light string of length l, swinging through a small angle either side of the vertical');
    },

    // Period squared against length for a pendulum: a straight line through the origin.
    'c1-t2': () => {
      let s = P.axes(130, 420, 790, 50, 'length l / m', 'T² / s²') + line('M130,420 L720,110', 'brand-primary', 6) + [0.2, 0.4, 0.6, 0.8, 1].map(k => `<circle cx="${130 + 560 * k}" cy="${f(420 - 294 * k + (k === 0.4 ? 5 : k === 0.8 ? -6 : 0))}" r="8" style="fill:var(--brand-accent-strong)"/>`).join('');
      s += text(250, 150, 'gradient = 4π² / g', 'lbl strong halo', 'start');
      return svg('70 30 760 440', s, 'A graph of the square of the period against the length of a pendulum. The readings lie on a straight line through the origin whose gradient is 4 pi squared divided by g');
    },

    // Kinetic and potential energy as bars beside the oscillating block. Also drawn plain.
    'c1-energy': el => {
      const on = labelled(el), wall = 80, eq = 330, A = 110, y = 190, T = 2.8, bx = 620, base = 420, H = 280;
      let s = `<rect x="${wall - 20}" y="${y - 70}" width="20" height="140" style="fill:var(--text-secondary);opacity:.7"/><line x1="50" y1="${y + 36}" x2="500" y2="${y + 36}" class="tick" style="stroke-width:4"/><line x1="${eq}" y1="${y - 80}" x2="${eq}" y2="${y + 60}" class="guide accent"/><line x1="${bx - 30}" y1="${base}" x2="${bx + 250}" y2="${base}" class="tick"/><line x1="${bx - 30}" y1="${base - H}" x2="${bx + 250}" y2="${base - H}" class="guide"/>`;
      if (on) s += text(bx + 40, base + 40, 'kinetic', 'lbl') + text(bx + 180, base + 40, 'potential', 'lbl') + text(bx + 250, base - H - 14, 'total', 'lbl strong', 'end') + text(eq, y + 110, 'fastest at the centre', 'lbl') + text(eq, y + 144, 'at rest at each end', 'lbl');
      const xs = cyc(a => eq + A * Math.cos(a)), ke = cyc(a => H * Math.sin(a) ** 2), pe = cyc(a => H * Math.cos(a) ** 2);
      const bar = (x, h, colour, extra = '') => `<rect x="${x}" y="${f(base - h)}" width="80" height="${f(h)}" style="fill:var(--${colour})">${extra}</rect>`;
      const still = line(zig(wall, eq + 66 - 40, y, 7, 18), 'text-secondary', 3) + block(eq + 66, y) + bar(bx, H * 0.64, 'brand-accent') + bar(bx + 140, H * 0.36, 'brand-primary');
      const mover = `<path style="fill:none;stroke:var(--text-secondary);stroke-width:3;stroke-linejoin:round" d="${zig(wall, xs[0] - 40, y, 7, 18)}">${anim('d', xs.map(x => zig(wall, x - 40, y, 7, 18)), T)}</path><g>${track(xs.map(x => [x - eq, 0]), T)}${block(eq, y)}</g>` + bar(bx, 0, 'brand-accent', anim('height', ke.map(f), T) + anim('y', ke.map(h => f(base - h)), T)) + bar(bx + 140, H, 'brand-primary', anim('height', pe.map(f), T) + anim('y', pe.map(h => f(base - h)), T));
      return svg(on ? '30 80 870 400' : '40 90 850 350', s + twoState(still, mover), 'A block oscillating on a spring beside two bars showing its kinetic energy and its potential energy. At each end of the motion all the energy is potential; at the centre it is all kinetic. The two bars always add up to the same total');
    },

    // Energy against displacement: two parabolas that add up to a constant.
    'c1-energy-x': () => {
      const cx = 430, base = 420, top = 110, A = 280, H = base - top;
      let s = arrow(110, base, 780, base, 'text-secondary', 2.5) + arrow(cx, base, cx, 50, 'text-secondary', 2.5) + line(`M${cx - A},${top} H${cx + A}`, 'text-main', 4) + line(sampled(t => { const u = -1 + 2 * t; return [cx + A * u, base - H * u * u]; }, 60), 'brand-primary', 6) + line(sampled(t => { const u = -1 + 2 * t; return [cx + A * u, base - H * (1 - u * u)]; }, 60), 'brand-accent', 6);
      s += `<path d="M${cx - A},${base} V${top} M${cx + A},${base} V${top}" class="guide"/>` + text(cx + 16, 64, 'energy', 'lbl mono', 'start') + text(784, base - 16, 'displacement', 'lbl mono', 'end') + text(cx - A, base + 40, sub('−x', '0'), 'lbl mono') + text(cx + A, base + 40, sub('x', '0'), 'lbl mono') + text(cx, base + 40, '0', 'lbl mono');
      s += text(cx + A + 14, top + 8, 'total', 'lbl strong', 'start') + text(cx + 206, top + 190, 'potential', 'lbl strong halo', 'start', 'style="fill:var(--brand-primary)"') + text(cx - 60, top + 50, 'kinetic', 'lbl strong halo', 'end', 'style="fill:var(--brand-accent)"');
      return svg('90 30 800 460', s, 'A graph of energy against displacement for simple harmonic motion. The potential energy is a parabola, zero at the centre and greatest at each end. The kinetic energy is an upside-down parabola, greatest at the centre and zero at each end. Their sum, the total energy, is a horizontal line');
    },

    // Kinetic and potential energy against time: each goes through two cycles in one period.
    'c1-energy-t': () => {
      const x0 = 120, x1 = 760, base = 420, H = 280;
      let s = P.axes(x0, base, 800, 60, '', 'energy') + text(800, base - 16, 'time', 'lbl mono', 'end') + line(`M${x0},${base - H} H${x1}`, 'text-main', 4) + line(sampled(t => [x0 + (x1 - x0) * t, base - H * Math.cos(t * TAU) ** 2], 120), 'brand-primary', 6) + line(sampled(t => [x0 + (x1 - x0) * t, base - H * Math.sin(t * TAU) ** 2], 120), 'brand-accent', 6);
      s += [0.5, 1].map(k => `<line x1="${x0 + (x1 - x0) * k}" y1="${base}" x2="${x0 + (x1 - x0) * k}" y2="${base - H}" class="guide"/>`).join('') + text(x0 + (x1 - x0) / 2, base + 40, 'T/2', 'lbl mono') + text(x1, base + 40, 'T', 'lbl mono') + text(x1 + 10, base - H + 8, 'total', 'lbl strong', 'start') + text(x0 + 30, base - H - 16, 'potential', 'lbl strong', 'start', 'style="fill:var(--brand-primary)"') + text(x0 + 190, base - H - 16, 'kinetic', 'lbl strong', 'start', 'style="fill:var(--brand-accent)"');
      return svg('60 40 820 440', s, 'A graph of kinetic and potential energy against time over one period, starting from the greatest displacement. Each varies between zero and the total energy and goes through two complete cycles in one period of the oscillation. When one is greatest the other is zero, and their sum is constant');
    },

    // Two oscillations with a phase difference (HL).
    'c1-phase': () => {
      const x0 = 120, x1 = 760, y0 = 250, amp = 150, phi = Math.PI / 3, per = (x1 - x0) / 1.5;
      let s = arrow(x0, 460, x0, 40, 'text-secondary', 2.5) + arrow(x0, y0, x1 + 40, y0, 'text-secondary', 2.5) + line(wave(x0, x1, y0, amp, 1.5, 0), 'brand-primary', 6) + line(wave(x0, x1, y0, amp, 1.5, phi), 'hl', 6);
      const lead = per * phi / TAU;
      s += `<line x1="${f(x0 + per - lead)}" y1="${y0}" x2="${f(x0 + per - lead)}" y2="${y0 + 190}" class="guide"/><line x1="${f(x0 + per)}" y1="${y0}" x2="${f(x0 + per)}" y2="${y0 + 190}" class="guide"/>` + both(f(x0 + per - lead), y0 + 176, f(x0 + per), y0 + 176) + text(f(x0 + per - lead / 2), y0 + 216, 'φ = π/3: a sixth of a cycle', 'lbl', 'middle');
      s += text(x0 + 16, 54, 'x', 'lbl display', 'start') + text(x1 + 40, y0 + 40, 'time', 'lbl mono', 'end') + text(350, 60, 'x₀ sin(ωt + φ)', 'lbl mono strong halo', 'start', 'style="fill:var(--hl-text)"') + text(350, 100, 'x₀ sin ωt', 'lbl mono strong halo', 'start', 'style="fill:var(--brand-primary)"');
      return svg('80 20 760 470', s, 'Two sine curves of the same amplitude and period. The second reaches each peak a sixth of a cycle before the first: it leads by a phase angle of pi over 3 radians');
    }
  };
});
