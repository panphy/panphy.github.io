// Diagrams for the C.5 Doppler effect deck, added to the shared set in ../assets/figures.js.
// Wavefronts are teal, the source slate and the observer apricot. Terracotta is kept for what
// is higher level only, which in this deck is in the equations, not in the diagrams.
window.DeckFigures.add(P => {
  const { svg, arrow, text, sub, both, labelled, track, anim, twoState, f } = P;
  const ring = (cx, cy, r, extra = '') => `<circle cx="${f(cx)}" cy="${cy}" r="${f(r)}" style="fill:none;stroke:var(--brand-primary);stroke-width:3.5" ${extra}/>`;
  const person = (x, y) => `<circle cx="${x}" cy="${y - 34}" r="13" style="fill:var(--brand-accent)"/><path d="M${x},${y - 20} V${y + 16} M${x - 16},${y - 6} H${x + 16} M${x},${y + 16} L${x - 12},${y + 44} M${x},${y + 16} L${x + 12},${y + 44}" style="fill:none;stroke:var(--brand-accent);stroke-width:5;stroke-linecap:round"/>`;
  const RAINBOW = ['#7B2FBE', '#3F4FD1', '#2F9FE0', '#3FB54A', '#F2D43D', '#F08A2E', '#D93A2B'];
  let clips = 0;
  const clipped = (x, y, w, h, body) => { const id = `c5-clip-${++clips}`; return `<clipPath id="${id}"><rect x="${x}" y="${y}" width="${w}" height="${h}" style="visibility:visible"/></clipPath><g clip-path="url(#${id})">${body}</g>`; };

  return {
    // A source moving to the right: the wavefronts bunch up ahead of it and spread out behind. Also the title picture.
    'c5-source': el => {
      const on = labelled(el), N = 7, lam = 40, d = 20, xs = 330, cy = 250, T = 0.9;
      // Wavefront k was emitted when the source was at xs + k·d; at the end of the run it has radius (N − k)·λ.
      const still = Array.from({ length: N }, (_, k) => ring(xs + k * d, cy, (N - k) * lam)).join('') + `<circle cx="${xs + N * d}" cy="${cy}" r="14" style="fill:var(--brand-accent-strong)"/>`;
      const mover = Array.from({ length: N }, (_, k) => `<circle cx="${xs + k * d}" cy="${cy}" r="0" style="fill:none;stroke:var(--brand-primary);stroke-width:3.5">${anim('r', [0, 0, (N - k) * lam, (N - k) * lam], N * T / 0.8, { extra: `keyTimes="0;${f(k / N * 800) / 1000};0.8;1"` })}</circle>`).join('') + `<g>${track([[xs, cy], [xs + N * d, cy], [xs + N * d, cy]], N * T / 0.8, { extra: 'keyTimes="0;0.8;1"' })}<circle r="14" style="fill:var(--brand-accent-strong)"/></g>`;
      let s = '';
      if (on) s += arrow(xs + N * d + 24, cy - 40, xs + N * d + 104, cy - 40, 'brand-accent-strong', 5) + person(110, cy) + person(790, cy) + text(110, cy + 90, 'behind:', 'lbl') + text(110, cy + 124, 'longer λ, lower f', 'lbl strong') + text(790, cy + 90, 'ahead:', 'lbl') + text(790, cy + 124, 'shorter λ, higher f', 'lbl strong');
      return svg(on ? '-20 -40 950 560' : '30 -40 760 580', clipped(-20, -40, 950, 580, twoState(still, mover)) + s, 'A source of waves moving to the right. Each wavefront is a circle centred on the place where the source was when it was emitted, so the wavefronts are crowded together ahead of the source and spread out behind it. An observer ahead receives a shorter wavelength and a higher frequency; an observer behind receives a longer wavelength and a lower frequency');
    },

    // A stationary source and a moving observer: the wavefronts are evenly spaced, but the observer meets them more often.
    'c5-observer': () => {
      const sx = 250, cy = 250, lam = 44, T = 1.2;
      const rings = move => Array.from({ length: 13 }, (_, k) => `<circle cx="${sx}" cy="${cy}" r="${k * lam + 6}" style="fill:none;stroke:var(--brand-primary);stroke-width:3.5">${move ? anim('r', [k * lam + 6, (k + 1) * lam + 6], T) : ''}</circle>`).join('');
      let s = `<circle cx="${sx}" cy="${cy}" r="14" style="fill:var(--brand-accent-strong)"/>` + text(sx, cy + 60, 'source at rest', 'lbl halo');
      const walker = person(0, 0) + arrow(-24, -70, -100, -70, 'brand-accent', 5);
      return svg('20 0 860 500', clipped(20, 0, 860, 500, twoState(rings(false), rings(true))) + s + twoState(`<g transform="translate(640 ${cy})">${walker}</g>`, `<g>${track([[800, cy], [480, cy]], 7)}${walker}</g>`), 'A stationary source sending out evenly spaced circular wavefronts, and an observer moving towards it. The wavelength is unchanged, but the observer crosses the wavefronts more often than if standing still, and so receives a higher frequency');
    },

    // The same spectral lines in the laboratory and from a receding galaxy.
    'c5-lines': () => {
      const x0 = 110, w = 700, band = (y, shift, name) => RAINBOW.map((c, i) => `<rect x="${x0 + i * w / 7}" y="${y}" width="${w / 7 + 1}" height="90" style="fill:${c}"/>`).join('') + [0.14, 0.31, 0.36, 0.74].map(u => `<rect x="${f(x0 + (u + shift) * w - 3)}" y="${y}" width="6" height="90" style="fill:#0B0B10"/>`).join('') + text(x0, y - 16, name, 'lbl strong', 'start');
      let s = band(110, 0, 'the element in the laboratory') + band(300, 0.07, 'the same lines from a distant galaxy');
      s += [0.14, 0.31, 0.36, 0.74].map(u => `<path d="M${f(x0 + u * w)},200 L${f(x0 + (u + 0.07) * w)},300" class="guide accent"/>`).join('') + arrow(430, 440, 610, 440, 'proton', 5) + text(410, 450, 'shifted towards the red', 'lbl strong', 'end') + text(x0, 240, 'violet', 'lbl small', 'start') + text(x0 + w, 240, 'red', 'lbl small', 'end');
      return svg('80 50 760 420', s, 'Two spectra. The upper one shows the dark lines of an element measured in the laboratory. The lower one shows the same pattern of lines in the light from a distant galaxy: every line has moved the same fraction of its wavelength towards the red end, showing that the galaxy is moving away');
    },

    // Radar measuring speed: waves out and back from a moving car.
    'c5-radar': () => {
      let s = `<rect x="90" y="250" width="70" height="110" rx="10" style="fill:var(--brand-accent-strong)"/><rect x="160" y="286" width="34" height="38" rx="6" style="fill:var(--brand-accent-strong)"/>` + `<rect x="600" y="270" width="210" height="76" rx="22" style="fill:color-mix(in srgb, var(--brand-accent) 55%, var(--viewer-bg));stroke:var(--brand-accent);stroke-width:3"/><circle cx="650" cy="350" r="24" style="fill:var(--text-main)"/><circle cx="760" cy="350" r="24" style="fill:var(--text-main)"/>`;
      s += [0, 1, 2, 3, 4, 5, 6].map(k => `<path d="M${230 + k * 48},196 q20,34 0,68" style="fill:none;stroke:var(--brand-primary);stroke-width:4"/>`).join('') + [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(k => `<path d="M${560 - k * 34},352 q-20,34 0,68" style="fill:none;stroke:var(--proton);stroke-width:4"/>`).join('');
      s += arrow(600, 240, 500, 240, 'brand-accent', 5) + text(550, 216, 'v', 'lbl display') + text(400, 170, 'sent out: frequency f', 'lbl strong') + text(400, 462, 'reflected back: higher frequency', 'lbl strong') + text(125, 400, 'radar', 'lbl') + text(705, 220, 'car approaching', 'lbl');
      return svg('60 130 780 360', s, 'A radar unit sends microwaves of frequency f towards an approaching car. The waves reflected from the car return with a shorter wavelength and a higher frequency, and the change in frequency gives the speed of the car');
    }
  };
});
