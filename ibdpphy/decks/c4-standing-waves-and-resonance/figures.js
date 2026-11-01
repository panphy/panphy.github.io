// Diagrams for the C.4 Standing waves and resonance deck, added to the shared set in
// ../assets/figures.js. A standing wave is teal, the two traveling waves that make it are
// apricot and slate, and nodes are marked in the text color. Nothing here is terracotta,
// because C.4 has no additional higher level content.
window.DeckFigures.add(P => {
  const { svg, arrow, text, sub, both, through, sampled, labeled, track, anim, twoState, f, TAU } = P;
  const line = (d, color, width = 5, extra = '') => `<path d="${d}" style="fill:none;stroke:var(--${color});stroke-width:${width};stroke-linecap:round;stroke-linejoin:round" ${extra}/>`;
  const F = 24, frames = fn => Array.from({ length: F + 1 }, (_, i) => fn(i / F * TAU));
  // A standing wave between x0 and x1 with `loops` half wavelengths (it may be a half-integer,
  // for a free or open end), at a moment when its displacement is `scale` of the greatest.
  const shape = (x0, x1, y, amp, loops, scale, fn = Math.sin) => sampled(t => [x0 + (x1 - x0) * t, y - amp * scale * fn(Math.PI * loops * t)], 80);
  const moving = (x0, x1, y, amp, loops, color, T, fn = Math.sin, width = 5) => `<path style="fill:none;stroke:var(--${color});stroke-width:${width};stroke-linecap:round" d="${shape(x0, x1, y, amp, loops, 1, fn)}">${anim('d', frames(a => shape(x0, x1, y, amp, loops, Math.cos(a), fn)), T)}</path>`;
  const envelope = (x0, x1, y, amp, loops, fn = Math.sin) => line(shape(x0, x1, y, amp, loops, 1, fn), 'brand-primary', 2, 'stroke-dasharray="8 7" opacity=".6"') + line(shape(x0, x1, y, amp, loops, -1, fn), 'brand-primary', 2, 'stroke-dasharray="8 7" opacity=".6"');
  const post = (x, y) => `<rect x="${x - 7}" y="${y - 44}" width="14" height="88" rx="4" style="fill:var(--brand-accent-strong)"/>`;
  const axes = (x0, y0, x1, y1, xl, yl) => arrow(x0, y0, x0, y1, 'text-secondary', 2.5) + arrow(x0, y0, x1, y0, 'text-secondary', 2.5) + text(x1 - 6, y0 + 40, xl, 'lbl mono', 'end') + text(x0 + 16, y1 + 14, yl, 'lbl mono', 'start');
  // The steady amplitude of a driven oscillator, for a driving frequency r times the natural frequency.
  const response = (r, z) => 1 / Math.sqrt((1 - r * r) ** 2 + (2 * z * r) ** 2);

  return {
    // A standing wave on a string fixed at both ends. data-n sets the number of loops. Also the title picture.
    'c4-string': el => {
      const on = labeled(el), n = Number(el.dataset.n || 3), x0 = 110, x1 = 750, y = 250, amp = 90, T = 1.6;
      let s = `<line x1="${x0}" y1="${y}" x2="${x1}" y2="${y}" class="guide"/>` + envelope(x0, x1, y, amp, n) + post(x0, y) + post(x1, y);
      if (on) {
        for (let k = 0; k <= n; k++) s += `<circle cx="${f(x0 + (x1 - x0) * k / n)}" cy="${y}" r="8" style="fill:var(--text-main)"/>` + text(f(x0 + (x1 - x0) * k / n), y + 150, 'N', 'lbl mono strong');
        for (let k = 0; k < n; k++) s += text(f(x0 + (x1 - x0) * (k + 0.5) / n), y - 120, 'A', 'lbl mono strong', 'middle', 'style="fill:var(--brand-primary)"');
        s += both(x0, y + 190, x0 + (x1 - x0) / n, y + 190) + text(x0 + (x1 - x0) / n / 2, y + 230, 'λ/2', 'lbl mono strong') + text(x1, y + 230, 'N: node, A: antinode', 'lbl', 'end');
      }
      return svg(on ? '70 90 720 410' : '80 130 700 240', s + twoState(line(shape(x0, x1, y, amp, n, 0.8), 'brand-primary', 5), moving(x0, x1, y, amp, n, 'brand-primary', T)), `A standing wave on a string fixed at both ends, with ${n} loops. The points that never move are nodes; the points half way between, where the amplitude is greatest, are antinodes. Neighboring nodes are half a wavelength apart`);
    },

    // Two identical waves traveling in opposite directions, and their sum: a standing wave.
    'c4-formation': () => {
      const x0 = 150, x1 = 770, amp = 44, lam = 248, T = 2.4;
      const run = (y, dir, ph) => sampled(t => { const x = x0 + (x1 - x0) * t; return [x, y - amp * Math.sin(TAU * (x - x0) / lam - dir * ph)]; }, 80);
      const sum = (y, ph) => sampled(t => { const x = x0 + (x1 - x0) * t; return [x, y - 2 * amp * Math.sin(TAU * (x - x0) / lam) * Math.cos(ph)]; }, 80);
      let s = [100, 230, 400].map(y => `<line x1="${x0}" y1="${y}" x2="${x1}" y2="${y}" class="guide"/>`).join('') + arrow(390, 40, 530, 40, 'brand-accent', 5) + arrow(530, 170, 390, 170, 'brand-accent-strong', 5);
      s += text(x0 - 14, 110, 'wave 1', 'lbl', 'end') + text(x0 - 14, 240, 'wave 2', 'lbl', 'end') + text(x0 - 14, 410, 'sum', 'lbl strong', 'end') + [0, 1, 2, 3, 4, 5].map(k => `<circle cx="${x0 + k * lam / 2}" cy="400" r="7" style="fill:var(--text-main)"/>`).join('');
      const live = (y, fn, color, w) => `<path style="fill:none;stroke:var(--${color});stroke-width:${w};stroke-linecap:round" d="${fn(y, 0)}">${anim('d', frames(ph => fn(y, ph)), T)}</path>`;
      const still = line(run(100, 1, 0.6), 'brand-accent', 4) + line(run(230, -1, 0.6), 'brand-accent-strong', 4) + line(sum(400, 0.6), 'brand-primary', 6);
      const mover = live(100, (y, ph) => run(y, 1, ph), 'brand-accent', 4) + live(230, (y, ph) => run(y, -1, ph), 'brand-accent-strong', 4) + live(400, sum, 'brand-primary', 6);
      return svg('20 10 780 500', s + twoState(still, mover), 'Two identical waves traveling in opposite directions and, below them, their sum. The sum does not travel: it oscillates in place, with fixed points of no motion, the nodes, half a wavelength apart');
    },

    // Phase along a standing wave: every point in one loop moves together; neighboring loops move oppositely.
    'c4-phase': () => {
      const x0 = 110, x1 = 750, y = 250, amp = 100, n = 3, w = (x1 - x0) / n;
      let s = `<line x1="${x0}" y1="${y}" x2="${x1}" y2="${y}" class="guide"/>` + envelope(x0, x1, y, amp, n) + line(shape(x0, x1, y, amp, n, 0.55), 'brand-primary', 6) + post(x0, y) + post(x1, y);
      for (let k = 0; k < n; k++) { const up = k % 2 === 0; [0.25, 0.5, 0.75].forEach(u => { const x = x0 + w * (k + u), h = 0.55 * amp * Math.sin(Math.PI * u), len = 46 * Math.sin(Math.PI * u), yy = y + (up ? -h : h); s += arrow(x, yy + (up ? -8 : 8), x, yy + (up ? -8 - len : 8 + len), 'brand-accent', 4); }); s += text(x0 + w * (k + 0.5), y + (up ? 190 : -150), up ? 'moving up' : 'moving down', 'lbl'); }
      s += text(430, 480, 'within a loop: in phase, next loop: in antiphase', 'lbl strong');
      return svg('70 70 720 430', s, 'A standing wave with three loops at one instant. All the points within one loop are moving in the same direction, in phase with each other but with different amplitudes. The points in the next loop are moving in the opposite direction, in antiphase');
    },

    // The first three standing wave patterns. data-kind: string (two fixed ends), open (pipe open at both ends) or closed (pipe closed at one end).
    'c4-harmonics': el => {
      const kind = el.dataset.kind || 'string', x0 = 150, x1 = 540, amp = 40, T = 1.6, rows = [90, 240, 390];
      const modes = kind === 'closed' ? [[0.5, 'first harmonic', 'λ = 4L', 'f₁'], [1.5, 'third harmonic', 'λ = 4L/3', '3f₁'], [2.5, 'fifth harmonic', 'λ = 4L/5', '5f₁']] : [[1, 'first harmonic', 'λ = 2L', 'f₁'], [2, 'second harmonic', 'λ = L', '2f₁'], [3, 'third harmonic', 'λ = 2L/3', '3f₁']];
      // A string is drawn with sine (nodes at both ends); a pipe closed at the left with sine; a pipe open at both ends with cosine (antinodes at both ends).
      const fn = kind === 'open' ? Math.cos : Math.sin;
      let s = '', still = '', mover = '';
      rows.forEach((y, i) => {
        const [loops, name, lam, freq] = modes[i];
        if (kind === 'string') s += post(x0, y) + post(x1, y);
        else s += `<path d="M${x0},${y - 52} H${x1} M${x0},${y + 52} H${x1}${kind === 'closed' ? ` M${x0},${y - 52} V${y + 52}` : ''}" style="fill:none;stroke:var(--text-secondary);stroke-width:5;stroke-linecap:round"/>`;
        s += envelope(x0, x1, y, amp, loops, fn) + text(x1 + 30, y - 12, name, 'lbl strong', 'start') + text(x1 + 30, y + 24, `${lam}, ${freq}`, 'lbl mono', 'start');
        still += line(shape(x0, x1, y, amp, loops, 0.8, fn), 'brand-primary', 5); mover += moving(x0, x1, y, amp, loops, 'brand-primary', T / (2 * loops) * (kind === 'closed' ? 1 : 2), fn);
      });
      s += both(x0, 462, x1, 462) + text((x0 + x1) / 2, 498, 'L', 'lbl display italic');
      const what = { string: 'a string fixed at both ends, with a node at each end', open: 'the air in a pipe open at both ends, with a displacement antinode at each end', closed: 'the air in a pipe closed at one end, with a displacement node at the closed end and an antinode at the open end' }[kind];
      return svg('120 20 700 490', s + twoState(still, mover), `The first three standing wave patterns for ${what}. ${kind === 'closed' ? 'The wavelengths are 4 L, 4 L over 3 and 4 L over 5: only odd harmonics are possible' : 'The wavelengths are 2 L, L and 2 L over 3, and the frequencies are one, two and three times that of the first harmonic'}`);
    },

    // Amplitude against driving frequency. data-kind: single, or damped (three amounts of damping).
    'c4-resonance': el => {
      const damped = el.dataset.kind === 'damped', x0 = 120, base = 420, X = r => x0 + 320 * r, top = damped ? response(1, 0.07) : response(1, 0.1), Y = a => base - 330 * a / top;
      const curve = (z, color, w = 5) => line(sampled(t => { const r = 0.02 + 1.98 * t; return [X(r), Y(response(r, z))]; }, 160), color, w);
      let s = axes(x0, base, 800, 50, 'driving frequency', 'amplitude') + `<line x1="${X(1)}" y1="${base}" x2="${X(1)}" y2="70" class="guide accent"/>` + text(X(1), 56, 'natural frequency', 'lbl mono');
      if (damped) s += curve(0.07, 'brand-primary') + curve(0.16, 'brand-accent') + curve(0.4, 'brand-accent-strong') + text(X(1) + 30, Y(response(1, 0.07)) + 30, 'light damping', 'lbl strong halo', 'start', 'style="fill:var(--brand-primary)"') + text(X(1) + 66, Y(response(1, 0.16)) + 30, 'more damping', 'lbl strong halo', 'start') + text(X(1) + 130, Y(response(1, 0.4)) - 2, 'most damping', 'lbl strong halo', 'start');
      else s += curve(0.1, 'brand-primary', 6) + text(X(1) + 40, Y(response(1, 0.1)) + 40, 'resonance', 'lbl strong halo', 'start') + text(X(0.3), Y(1) - 50, 'follows the driver', 'lbl small halo') + text(X(1.75), Y(0.5) - 50, 'cannot keep up', 'lbl small halo');
      return svg('60 30 780 450', s, damped ? 'Graphs of amplitude against driving frequency for three amounts of damping. With light damping the peak at the natural frequency is tall and sharp. With more damping the peak is lower and broader, and it moves to a slightly lower frequency' : 'A graph of the amplitude of a driven oscillator against the driving frequency. The amplitude rises to a sharp peak when the driving frequency equals the natural frequency: resonance');
    },

    // Displacement against time after release, for light, critical and heavy damping.
    'c4-damping': () => {
      const x0 = 120, y0 = 250, x1 = 770, amp = 180, tmax = 8;
      const light = t => Math.exp(-0.35 * t) * Math.cos(TAU * t / 1.6), critical = t => (1 + 3.2 * t) * Math.exp(-3.2 * t), heavy = t => 1.07 * Math.exp(-0.42 * t) - 0.07 * Math.exp(-6 * t);
      const curve = (fn, color) => line(sampled(u => [x0 + (x1 - x0) * u, y0 - amp * fn(u * tmax)], 200), color, 5);
      let s = arrow(x0, 460, x0, 40, 'text-secondary', 2.5) + arrow(x0, y0, x1 + 30, y0, 'text-secondary', 2.5) + text(x0 + 16, 54, 'displacement', 'lbl mono', 'start') + text(x1 + 30, y0 + 40, 'time', 'lbl mono', 'end');
      s += line(sampled(u => [x0 + (x1 - x0) * u, y0 - amp * Math.exp(-0.35 * u * tmax)], 60), 'brand-primary', 2, 'stroke-dasharray="8 7" opacity=".6"') + curve(light, 'brand-primary') + curve(heavy, 'brand-accent-strong') + curve(critical, 'brand-accent');
      s += text(330, 430, 'light: oscillates, dying away', 'lbl strong halo', 'start', 'style="fill:var(--brand-primary)"') + text(330, 150, 'heavy: creeps back slowly', 'lbl strong halo', 'start') + text(400, 90, 'critical: quickest, no overshoot', 'lbl strong halo', 'start', 'style="fill:var(--brand-accent)"');
      return svg('60 20 780 460', s, 'Graphs of displacement against time for an oscillator released from rest with three amounts of damping. With light damping it oscillates with an amplitude that dies away gradually. With critical damping it returns to equilibrium in the shortest time without oscillating. With heavy damping it also does not oscillate, but takes much longer to return');
    }
  };
});
