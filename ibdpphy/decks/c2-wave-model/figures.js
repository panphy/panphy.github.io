// Diagrams for the C.2 Wave model deck, added to the shared set in ../assets/figures.js. The
// particles of a medium are teal, the direction a wave travels apricot, and one marked particle
// slate. Nothing here is terracotta, because C.2 has no additional higher level content.
window.DeckFigures.add(P => {
  const { svg, arrow, text, sub, both, through, sampled, labeled, track, anim, twoState, f, TAU } = P;
  const line = (d, color, width = 5, extra = '') => `<path d="${d}" style="fill:none;stroke:var(--${color});stroke-width:${width};stroke-linecap:round;stroke-linejoin:round" ${extra}/>`;
  const F = 24, frames = fn => Array.from({ length: F + 1 }, (_, i) => fn(i / F * TAU));
  const dot = (r, color = 'brand-primary') => `<circle r="${r}" style="fill:var(--${color})"/>`;
  const at = (x, y, body) => `<g transform="translate(${f(x)} ${f(y)})">${body}</g>`;
  const sine = (x0, x1, y0, amp, lambda, phase = 0, n = 120) => sampled(t => { const x = x0 + (x1 - x0) * t; return [x, y0 - amp * Math.sin(TAU * (x - x0) / lambda - phase)]; }, n);
  const graphAxes = (x0, y0, x1, top, bottom, xl, yl) => arrow(x0, bottom, x0, top, 'text-secondary', 2.5) + arrow(x0, y0, x1, y0, 'text-secondary', 2.5) + text(x1, y0 + 40, xl, 'lbl mono', 'end') + text(x0 + 14, top + 14, yl, 'lbl mono', 'start');

  return {
    // A transverse wave on a line of particles: each moves up and down while the pattern moves along. Also the title picture.
    'c2-transverse': el => {
      const on = labeled(el), x0 = 90, x1 = 770, y0 = 250, amp = 80, lambda = 280, n = 30, T = 2.4, step = (x1 - x0) / (n - 1), marked = 13;
      const yAt = (x, ph) => y0 - amp * Math.sin(TAU * (x - x0) / lambda - ph);
      let s = `<line x1="${x0}" y1="${y0}" x2="${x1}" y2="${y0}" class="guide"/>`;
      if (on) s += arrow(330, 110, 510, 110, 'brand-accent', 6) + text(420, 86, 'the wave travels this way', 'lbl strong') + text(420, 420, 'each particle only moves up and down', 'lbl') + both(x0 + marked * step + 34, y0 - amp, x0 + marked * step + 34, y0 + amp, 'brand-accent-strong', 3);
      const still = line(sine(x0, x1, y0, amp, lambda, 1), 'brand-primary', 2, 'opacity=".45"') + Array.from({ length: n }, (_, i) => at(x0 + i * step, yAt(x0 + i * step, 1), dot(i === marked ? 13 : 9, i === marked ? 'brand-accent-strong' : 'brand-primary'))).join('');
      const mover = `<path style="fill:none;stroke:var(--brand-primary);stroke-width:2;opacity:.45" d="${sine(x0, x1, y0, amp, lambda, 0)}">${anim('d', frames(ph => sine(x0, x1, y0, amp, lambda, ph, 60)), T)}</path>` + Array.from({ length: n }, (_, i) => { const x = x0 + i * step; return `<g>${track(frames(ph => [x, yAt(x, ph)]), T)}${dot(i === marked ? 13 : 9, i === marked ? 'brand-accent-strong' : 'brand-primary')}</g>`; }).join('');
      return svg(on ? '60 50 740 400' : '70 140 720 220', s + twoState(still, mover), 'A transverse wave on a line of particles. The wave pattern moves steadily to the right, but each particle only moves up and down about its own place, at right angles to the direction the wave travels');
    },

    // A longitudinal wave: particles move to and fro along the direction of travel. Also drawn plain.
    'c2-longitudinal': el => {
      const on = labeled(el), x0 = 90, x1 = 770, lambda = 280, amp = 34, cols = 34, rows = 5, T = 2.4, step = (x1 - x0) / (cols - 1);
      const xAt = (x, ph) => x + amp * Math.sin(TAU * (x - x0) / lambda - ph);
      let s = '';
      if (on) s += arrow(330, 90, 510, 90, 'brand-accent', 6) + text(420, 66, 'the wave travels this way', 'lbl strong') + text(420, 420, 'each particle moves to and fro along the same line', 'lbl');
      const make = fn => Array.from({ length: cols * rows }, (_, k) => fn(x0 + (k % cols) * step, 170 + Math.floor(k / cols) * 40, k)).join('');
      const mark = k => k === 2 * cols + 15;
      const still = make((x, y, k) => at(xAt(x, 1), y, dot(mark(k) ? 13 : 8, mark(k) ? 'brand-accent-strong' : 'brand-primary')));
      const mover = make((x, y, k) => `<g>${track(frames(ph => [xAt(x, ph), y]), T)}${dot(mark(k) ? 13 : 8, mark(k) ? 'brand-accent-strong' : 'brand-primary')}</g>`);
      return svg(on ? '40 30 780 420' : '50 150 760 220', s + twoState(still, mover), 'A longitudinal wave in a block of particles. Regions where the particles are crowded together, compressions, and regions where they are spread out, rarefactions, move steadily to the right. Each particle only moves to and fro about its own place, along the direction the wave travels');
    },

    // The parts of a wave, on a snapshot.
    'c2-parts': () => {
      const x0 = 110, y0 = 250, amp = 120, lambda = 300;
      let s = arrow(x0, y0, 800, y0, 'text-secondary', 2.5) + line(sine(x0, 760, y0, amp, lambda), 'brand-primary', 6);
      s += both(x0 + lambda / 4, y0 - amp - 30, x0 + 5 * lambda / 4, y0 - amp - 30) + text(x0 + 3 * lambda / 4, y0 - amp - 46, 'wavelength λ', 'lbl strong') + both(x0 + 3 * lambda / 4, y0 + amp + 30, x0 + 7 * lambda / 4, y0 + amp + 30) + text(x0 + 5 * lambda / 4, y0 + amp + 74, 'wavelength λ', 'lbl strong');
      s += both(x0 + 5 * lambda / 4, y0, x0 + 5 * lambda / 4, y0 - amp, 'brand-accent', 3) + text(x0 + 5 * lambda / 4 + 14, y0 - amp / 2 + 10, 'amplitude', 'lbl halo', 'start') + text(x0 + lambda / 4, y0 - amp + 50, 'crest', 'lbl halo') + text(x0 + 3 * lambda / 4, y0 + amp - 34, 'trough', 'lbl halo');
      return svg('80 60 740 440', s, 'A snapshot of a wave. The wavelength is the distance from one crest to the next, or from one trough to the next. The amplitude is the height of a crest above the undisturbed level');
    },

    // The two graphs of a wave. data-kind: position (a snapshot) or time (one particle).
    'c2-graph': el => {
      const time = el.dataset.kind === 'time', x0 = 120, y0 = 250, amp = 130, lambda = 280;
      let s = graphAxes(x0, y0, 800, 60, 440, '', 'displacement') + text(800, y0 - 16, time ? 'time' : 'position', 'lbl mono', 'end') + line(sine(x0, x0 + 2 * lambda, y0, amp, lambda), time ? 'brand-accent-strong' : 'brand-primary', 6);
      s += both(x0 + 3 * lambda / 4, y0 + amp + 26, x0 + 7 * lambda / 4, y0 + amp + 26) + text(x0 + 5 * lambda / 4, y0 + amp + 66, time ? 'period T' : 'wavelength λ', 'lbl strong') + `<line x1="${x0}" y1="${y0 - amp}" x2="${x0 + lambda / 4}" y2="${y0 - amp}" class="guide"/>` + text(x0 - 12, y0 - amp + 9, sub('x', '0'), 'lbl mono', 'end');
      return svg('40 40 780 440', s, time ? 'A graph of displacement against time for one particle of the medium: a sine curve. The time from one peak to the next is the period' : 'A graph of displacement against position along the wave at one instant: a sine curve. The distance from one peak to the next is the wavelength');
    },

    // Which way each particle is moving: the wave now and a moment later.
    'c2-moving': () => {
      const x0 = 110, y0 = 250, amp = 110, lambda = 300, shift = 0.9;
      let s = arrow(x0, y0, 800, y0, 'text-secondary', 2.5) + line(sine(x0, 760, y0, amp, lambda, shift), 'brand-primary', 3, 'stroke-dasharray="10 9" opacity=".7"') + line(sine(x0, 760, y0, amp, lambda), 'brand-primary', 6);
      const yAt = (x, ph) => y0 - amp * Math.sin(TAU * (x - x0) / lambda - ph);
      [0.5, 1, 1.5, 2].forEach(k => { const x = x0 + k * lambda / 2; const y1 = yAt(x, 0), y2 = yAt(x, shift); s += `<circle cx="${x}" cy="${f(y1)}" r="10" style="fill:var(--brand-accent-strong)"/>` + (Math.abs(y2 - y1) > 12 ? arrow(x, y1 + Math.sign(y2 - y1) * 14, x, y2, 'brand-accent', 5) : ''); });
      s += arrow(560, 70, 700, 70, 'brand-accent', 6) + text(540, 80, 'wave', 'lbl strong', 'end') + text(430, 440, 'dashed: the same wave a moment later', 'lbl') + text(x0 + lambda / 4, y0 - amp - 20, 'at a crest: at rest', 'lbl small halo');
      return svg('80 30 740 430', s, 'A wave traveling to the right, drawn now as a solid curve and a moment later as a dashed curve. Comparing the two shows which way each particle is moving: particles just ahead of a crest are moving up, particles just behind it are moving down, and a particle at a crest or trough is momentarily at rest');
    },

    // A longitudinal wave shown as displacements: where the graph falls through zero, particles crowd together.
    'c2-long-graph': () => {
      const x0 = 110, x1 = 770, lambda = 330, amp = 40, n = 21, step = (x1 - x0) / (n - 1), gy = 370, row = 110;
      const d = x => amp * Math.sin(TAU * (x - x0) / lambda);
      let s = Array.from({ length: n }, (_, i) => { const x = x0 + i * step; return `<line x1="${x}" y1="${row - 26}" x2="${x}" y2="${row + 26}" class="guide"/><circle cx="${f(x + d(x))}" cy="${row}" r="10" style="fill:var(--brand-primary)"/>`; }).join('');
      s += graphAxes(x0, gy, 800, 250, 480, 'position', 'displacement') + line(sampled(t => { const x = x0 + (x1 - x0) * t; return [x, gy - 2 * d(x)]; }, 100), 'brand-primary', 6);
      const comp = x0 + lambda / 2, rare = x0 + lambda;
      s += `<line x1="${comp}" y1="${row + 36}" x2="${comp}" y2="${gy}" class="guide accent"/><line x1="${rare}" y1="${row + 36}" x2="${rare}" y2="${gy}" class="guide accent"/>` + text(comp, row - 44, 'compression', 'lbl strong') + text(rare, row + 70, 'rarefaction', 'lbl strong halo');
      return svg('60 30 780 480', s, 'A longitudinal wave. Above, each particle is shown displaced to the right or left of its undisturbed position, marked by a dashed line. Below, a graph of displacement against position. A compression lies where the displacement falls through zero, because the particles on either side have moved towards it; a rarefaction lies where it rises through zero');
    },

    // An electromagnetic wave: electric and magnetic fields at right angles to each other and to the direction of travel.
    'c2-em': el => {
      const on = labeled(el), x0 = 110, x1 = 630, y0 = 250, lambda = 260, E = 120, bx = -0.5, by = 0.45, B = 110;
      let s = arrow(x0 - 30, y0, x1 + 170, y0, 'text-secondary', 2.5);
      const eCurve = sampled(t => { const x = x0 + (x1 - x0) * t; return [x, y0 - E * Math.sin(TAU * (x - x0) / lambda)]; }, 120), bCurve = sampled(t => { const x = x0 + (x1 - x0) * t, b = B * Math.sin(TAU * (x - x0) / lambda); return [x + bx * b, y0 + by * b]; }, 120);
      for (let k = 0; k <= 38; k++) { const x = x0 + (x1 - x0) * k / 38, v = Math.sin(TAU * (x - x0) / lambda); s += `<line x1="${f(x)}" y1="${y0}" x2="${f(x)}" y2="${f(y0 - E * v)}" style="stroke:var(--brand-primary);stroke-width:2;opacity:.45"/><line x1="${f(x)}" y1="${y0}" x2="${f(x + bx * B * v)}" y2="${f(y0 + by * B * v)}" style="stroke:var(--brand-accent);stroke-width:2;opacity:.55"/>`; }
      s += line(bCurve, 'brand-accent', 5) + line(eCurve, 'brand-primary', 5);
      if (on) s += text(x0 + lambda / 4, y0 - E - 18, 'electric field', 'lbl strong', 'middle', 'style="fill:var(--brand-primary)"') + text(x0 + lambda / 4 - 30, y0 + 110, 'magnetic field', 'lbl strong', 'middle', 'style="fill:var(--brand-accent)"') + text(x1 + 30, y0 + 40, 'direction', 'lbl', 'start') + text(x1 + 30, y0 + 72, 'of travel', 'lbl', 'start');
      return svg(on ? '50 90 770 320' : '60 100 760 300', s, 'An electromagnetic wave: an oscillating electric field and an oscillating magnetic field, in step with each other, at right angles to each other and both at right angles to the direction in which the wave travels');
    },

    // The electromagnetic spectrum on a logarithmic wavelength scale, as in the data booklet.
    'c2-spectrum': () => {
      const X = p => 80 + (3 - p) * 51, bands = [['radio', 3, -0.3, 'brand-accent-strong'], ['microwaves', -0.3, -3.7, 'brand-primary'], ['infrared', -3.7, -6.15, 'proton'], ['visible', -6.15, -6.4, 'sand'], ['ultraviolet', -6.4, -8, 'photon'], ['X-rays', -8, -11, 'electron'], ['gamma rays', -11, -13, 'neutron']];
      const above = { visible: 84, ultraviolet: 132 };
      let s = bands.map(([name, a, b, color]) => { const mid = f((X(a) + X(b)) / 2); return `<rect x="${f(X(a))}" y="150" width="${f(X(b) - X(a))}" height="90" style="fill:var(--${color});opacity:.8"/>` + (above[name] ? `<line x1="${mid}" y1="150" x2="${mid}" y2="${above[name] + 10}" class="tick"/>` + text(name === 'ultraviolet' ? mid + 8 : mid, above[name], name, 'lbl strong', name === 'ultraviolet' ? 'start' : 'end') : text(mid, 206, name === 'gamma rays' ? 'gamma' : name, 'lbl strong', 'middle', 'style="fill:#fff"')); }).join('');
      s += [3, 0, -3, -6, -9, -12].map(p => `<line x1="${X(p)}" y1="240" x2="${X(p)}" y2="256" class="tick"/>` + text(X(p), 290, p === 0 ? '1 m' : `10<tspan dy="-12" font-size="20">${String(p).replace('-', '−')}</tspan><tspan dy="12"> m</tspan>`, 'lbl mono')).join('');
      s += arrow(300, 344, 100, 344, 'text-secondary', 3) + text(320, 354, 'longer wavelength', 'lbl', 'start') + arrow(690, 344, 890, 344, 'text-secondary', 3) + text(670, 354, 'shorter wavelength', 'lbl', 'end');
      return svg('40 60 900 310', s, 'The electromagnetic spectrum on a scale of wavelength, from radio waves longer than a meter, through microwaves, infrared, the narrow band of visible light near 5 times 10 to the minus 7 meters, ultraviolet and X-rays, to gamma rays shorter than 10 to the minus 11 meters');
    }
  };
});
