// Diagrams for the B.2 Greenhouse effect deck, added to the shared set in ../assets/figures.js.
// Sunlight is sand and apricot, infrared is red, the atmosphere teal and the ground slate.
// Nothing here is terracotta, because B.2 has no additional higher level content.
window.DeckFigures.add(P => {
  const { svg, arrow, text, sub, through, sampled, labelled, seeded, track, anim, twoState, f, TAU } = P;
  const line = (d, colour, width = 5, extra = '') => `<path d="${d}" style="fill:none;stroke:var(--${colour});stroke-width:${width};stroke-linecap:round;stroke-linejoin:round" ${extra}/>`;
  // A wavy arrow for infrared, from (x1, y1) to (x2, y2).
  const ir = (x1, y1, x2, y2, colour = 'proton', width = 4) => {
    const len = Math.hypot(x2 - x1, y2 - y1), a = Math.atan2(y2 - y1, x2 - x1), n = Math.max(2, Math.round(len / 34)), body = len - 20;
    const d = sampled(t => [body * t, 9 * Math.sin(t * n * TAU) * Math.min(1, 6 * (1 - t))], 6 * n);
    return `<g transform="translate(${f(x1)} ${f(y1)}) rotate(${f(a * 180 / Math.PI)})">${line(d, colour, width)}<path d="M${f(len - 22)},-10 L${f(len)},0 L${f(len - 22)},10 Z" style="fill:var(--${colour})"/></g>`;
  };
  const planck = (l, T) => 1 / (l ** 5 * (Math.exp(14388 / (l * T)) - 1));
  const ground = (x1, x2, y, h = 40) => `<rect x="${x1}" y="${y}" width="${x2 - x1}" height="${h}" style="fill:color-mix(in srgb, var(--brand-accent-strong) 30%, var(--viewer-bg));stroke:var(--brand-accent-strong);stroke-width:3"/>`;
  const air = (x1, x2, y, h) => `<rect x="${x1}" y="${y}" width="${x2 - x1}" height="${h}" rx="10" style="fill:color-mix(in srgb, var(--brand-primary) 20%, var(--viewer-bg));stroke:var(--brand-primary);stroke-width:3;stroke-dasharray:12 8"/>`;
  // A carbon dioxide molecule drawn at the origin: oxygen, carbon, oxygen, with the ends raised by `bend`.
  const co2 = (bend = 0, stretch = 0) => `<path d="M${-58 + stretch},${-bend} L${stretch * 0.6},${bend} L${58 + stretch},${-bend}" style="fill:none;stroke:var(--text-secondary);stroke-width:7;stroke-linecap:round"/><circle cx="${-58 + stretch}" cy="${-bend}" r="24" style="fill:var(--proton)"/><circle cx="${58 + stretch}" cy="${-bend}" r="24" style="fill:var(--proton)"/><circle cx="${f(stretch * 0.6)}" cy="${bend}" r="19" style="fill:var(--neutron)"/>`;

  return {
    // The planet's energy balance: sunlight in, some reflected, infrared out. Also the title picture, with data-plain.
    'b2-balance': el => {
      const on = labelled(el), cx = 520, cy = 270, r = 120;
      let s = `<circle cx="${cx}" cy="${cy}" r="${r + 26}" style="fill:color-mix(in srgb, var(--brand-primary) 16%, transparent);stroke:var(--brand-primary);stroke-width:2;stroke-dasharray:8 8"/><circle cx="${cx}" cy="${cy}" r="${r}" style="fill:color-mix(in srgb, var(--electron) 45%, var(--viewer-bg));stroke:var(--electron);stroke-width:3"/>`;
      s += [190, 240, 300, 350].map(y => arrow(110, y, cx - Math.sqrt((r + 4) ** 2 - (y - cy) ** 2) - 6, y, 'brand-accent', 6)).join('');
      s += arrow(cx - 96, cy - 96, cx - 230, cy - 200, 'sand', 6) + [[-20, -1], [50, -0.6], [70, 0.5], [0, 1], [-60, 0.86]].map(([deg]) => { const a = deg * Math.PI / 180; return ir(cx + (r + 8) * Math.cos(a), cy + (r + 8) * Math.sin(a), cx + (r + 130) * Math.cos(a), cy + (r + 130) * Math.sin(a)); }).join('');
      if (on) s += text(110, 150, 'sunlight in', 'lbl strong', 'start') + text(250, 60, 'reflected', 'lbl strong') + text(790, 140, 'infrared', 'lbl strong', 'start') + text(790, 174, 'radiated', 'lbl strong', 'start') + text(790, 208, 'to space', 'lbl strong', 'start');
      return svg(on ? '80 20 880 500' : '100 40 700 450', s, 'A planet with a thin atmosphere. Sunlight arrives from one side; part of it is reflected back to space, and the planet radiates infrared in all directions. At a steady temperature the power absorbed equals the power radiated');
    },

    // Why the mean intensity is a quarter of the solar constant: the planet intercepts a disc but radiates from a sphere.
    'b2-quarter': () => {
      const cx = 590, cy = 250, r = 130;
      let s = [140, 195, 250, 305, 360].map(y => arrow(150, y, 320, y, 'brand-accent', 5)).join('');
      s += `<ellipse cx="380" cy="${cy}" rx="34" ry="${r}" style="fill:var(--brand-accent);opacity:.35;stroke:var(--brand-accent);stroke-width:3"/><circle cx="${cx}" cy="${cy}" r="${r}" style="fill:color-mix(in srgb, var(--electron) 40%, var(--viewer-bg));stroke:var(--electron);stroke-width:3"/>`;
      s += `<line x1="380" y1="${cy - r}" x2="${cx}" y2="${cy - r}" class="guide"/><line x1="380" y1="${cy + r}" x2="${cx}" y2="${cy + r}" class="guide"/>` + arrow(cx, cy, cx + 92, cy - 92, 'text-main', 3) + text(cx + 34, cy - 14, 'R', 'lbl display');
      s += text(235, 100, 'intensity S', 'lbl strong') + text(300, 430, 'intercepts a disc,', 'lbl') + text(300, 464, 'area πR²', 'lbl strong') + text(cx + 10, 430, 'shared over a sphere,', 'lbl') + text(cx + 10, 464, 'area 4πR²', 'lbl strong');
      return svg('130 60 640 420', s, 'Parallel rays of sunlight of intensity S fall on a planet of radius R. The planet intercepts the light that would pass through a disc of area pi R squared, but that power is shared over the whole surface of the sphere, of area 4 pi R squared, so the mean intensity is a quarter of S');
    },

    // The spectra of the Sun and of the Earth, each scaled to the same height, on a logarithmic wavelength axis.
    'b2-two-spectra': () => {
      const X = l => 110 + 230 * Math.log10(l / 0.1), curve = (T, colour) => { const top = planck(2898 / T, T); return line(sampled(t => { const l = 0.1 * 10 ** (3 * t); return [X(l), 420 - 320 * planck(l, T) / top]; }, 160), colour); };
      let s = `<rect x="${f(X(0.4))}" y="34" width="${f(X(0.7) - X(0.4))}" height="386" style="fill:var(--sand);opacity:.3"/>` + arrow(110, 420, 110, 40, 'text-secondary', 2.5) + arrow(110, 420, 840, 420, 'text-secondary', 2.5);
      s += curve(5800, 'brand-accent') + curve(288, 'proton') + [0.1, 1, 10, 100].map(l => `<line x1="${X(l)}" y1="420" x2="${X(l)}" y2="432" class="tick"/>` + text(X(l), 462, String(l), 'lbl mono')).join('');
      s += text(126, 54, 'intensity', 'lbl mono', 'start') + text(834, 500, 'wavelength / μm', 'lbl mono', 'end') + text(X(0.53), 22, 'visible', 'lbl small') + text(X(1.1), 130, 'from the Sun,', 'lbl strong halo', 'start') + text(X(1.1), 164, '5800 K', 'lbl mono halo', 'start') + text(X(22), 130, 'from the Earth,', 'lbl strong halo', 'start') + text(X(22), 164, '288 K', 'lbl mono halo', 'start');
      return svg('60 -10 800 530', s, 'Two black-body spectra on a logarithmic wavelength scale, each drawn to the same height. Radiation from the Sun at 5800 kelvin peaks at 0.5 micrometres, in the visible, and lies almost entirely below 3 micrometres. Radiation from the Earth at 288 kelvin peaks at 10 micrometres, in the infrared, and lies almost entirely above 3 micrometres. The two hardly overlap');
    },

    // A molecule's energy levels: an infrared photon of the right energy is absorbed, then one is emitted in any direction.
    'b2-levels': () => {
      const lv = y => `<line x1="330" y1="${y}" x2="570" y2="${y}" style="stroke:var(--text-main);stroke-width:4"/>`;
      let s = lv(380) + lv(280) + lv(210) + lv(160) + text(590, 390, 'lowest level', 'lbl', 'start') + text(590, 290, 'higher vibrational', 'lbl', 'start') + text(590, 324, 'levels', 'lbl', 'start');
      s += ir(90, 330, 320, 330) + text(200, 290, 'infrared photon', 'lbl strong') + text(200, 380, 'energy hf', 'lbl mono') + arrow(410, 374, 410, 290, 'proton', 6);
      s += arrow(490, 286, 490, 372, 'brand-accent', 6) + ir(500, 250, 640, 110, 'brand-accent') + text(660, 100, 'emitted later,', 'lbl strong', 'start') + text(660, 134, 'in any direction', 'lbl strong', 'start');
      s += text(450, 440, 'only a photon whose energy matches the gap is absorbed', 'lbl');
      return svg('60 60 860 400', s, 'An energy level diagram for a molecule. An infrared photon whose energy equals the gap between two vibrational levels is absorbed and raises the molecule to the higher level. The molecule later drops back and emits a photon of the same energy in a random direction');
    },

    // The resonance model: infrared drives a carbon dioxide molecule at its natural frequency. Also drawn plain.
    'b2-molecule': el => {
      const on = labelled(el), steps = 24;
      const frames = Array.from({ length: steps + 1 }, (_, i) => 16 * Math.sin(i / steps * TAU));
      let s = ir(60, 250, 300, 250);
      if (on) s += text(180, 200, 'infrared', 'lbl strong') + text(180, 310, 'frequency f', 'lbl mono') + text(480, 100, 'carbon dioxide', 'lbl strong') + text(480, 400, 'bends at its natural frequency', 'lbl') + text(480, 436, 'when that equals f: resonance', 'lbl strong') + text(422, 330, 'O', 'lbl mono') + text(480, 330, 'C', 'lbl mono') + text(538, 330, 'O', 'lbl mono');
      // Each frame of the bend is its own group, shown in turn.
      const frame = (b, i) => `<g transform="translate(480 250)" opacity="0">${anim('opacity', Array.from({ length: steps }, (_, k) => (k === i ? 1 : 0)), 1.2, { extra: 'calcMode="discrete"' })}${co2(f(b))}</g>`;
      const mover = frames.slice(0, steps).map(frame).join('');
      return svg(on ? '40 60 760 400' : '60 150 620 200', s + twoState(`<g transform="translate(480 250)">${co2(14)}</g>`, mover), 'Infrared radiation falls on a carbon dioxide molecule, drawn as a carbon atom between two oxygen atoms. The molecule bends back and forth at its own natural frequency. When the frequency of the infrared matches it, the molecule resonates and absorbs energy from the radiation');
    },

    // Infrared from the ground is absorbed by molecules and sent out again in random directions. Also drawn plain.
    'b2-reemit': el => {
      const on = labelled(el), rand = seeded(5), top = 80, base = 420;
      const mols = Array.from({ length: 12 }, (_, i) => [150 + (i % 4) * 170 + (rand() - 0.5) * 70, 150 + Math.floor(i / 4) * 85 + (rand() - 0.5) * 30]);
      let s = ground(80, 800, base) + mols.map(([x, y]) => `<circle cx="${f(x)}" cy="${f(y)}" r="13" style="fill:var(--brand-primary)"/>`).join('');
      if (on) s += text(440, 494, 'warm surface', 'lbl') + text(440, 56, 'space', 'lbl');
      // A photon leaves the ground, hops between a few molecules and ends in space or back at the ground.
      const journey = k => {
        const pts = [[130 + k * 82 + rand() * 30, base]]; let m = 8 + (k % 4);
        for (let hop = 0; hop < 3; hop++) { pts.push(mols[m]); const up = rand() < 0.5; const next = m + (up ? -4 : 4) + (rand() < 0.5 ? 0 : (m % 4 < 3 ? 1 : -1)); if (next < 0) { pts.push([mols[m][0] + (rand() - 0.5) * 120, top]); break; } if (next > 11) { pts.push([mols[m][0] + (rand() - 0.5) * 120, base]); break; } m = next; if (hop === 2) pts.push([mols[m][0], up ? top : base]); }
        // Equal time steps along the whole path.
        const out = []; for (let i = 1; i < pts.length; i++) { const [x1, y1] = pts[i - 1], [x2, y2] = pts[i], n = Math.max(2, Math.round(Math.hypot(x2 - x1, y2 - y1) / 16)); for (let j = 0; j < n; j++) out.push([x1 + (x2 - x1) * j / n, y1 + (y2 - y1) * j / n]); }
        out.push(pts[pts.length - 1]); return out;
      };
      const paths = Array.from({ length: 8 }, (_, k) => journey(k));
      const still = ir(250, base - 6, mols[8][0] + 4, mols[8][1] + 18) + ir(mols[8][0], mols[8][1] - 16, mols[5][0] - 8, mols[5][1] + 16) + ir(mols[5][0] + 8, mols[5][1] + 16, 470, base - 6) + ir(600, base - 6, mols[6][0], mols[6][1] + 18) + ir(mols[6][0], mols[6][1] - 16, mols[6][0] + 40, top);
      const mover = paths.map((pts, k) => `<g>${track(pts, f(pts.length * 0.075), { extra: `begin="-${f(k * 0.55)}s"` })}<circle r="9" style="fill:var(--proton)"/></g>`).join('');
      return svg(on ? '60 20 760 490' : '70 60 740 410', s + twoState(still, mover), 'Infrared radiation leaves the warm surface of a planet. Greenhouse gas molecules in the atmosphere absorb it and emit it again in random directions. Some escapes to space, but about half of what each molecule emits heads back towards the surface');
    },

    // A one-layer model of the atmosphere, with the intensity of each flow. Also drawn plain.
    'b2-layer': el => {
      const on = labelled(el);
      let s = ground(100, 780, 430) + air(100, 780, 190, 70);
      s += arrow(200, 40, 200, 422, 'brand-accent', 7) + ir(400, 424, 400, 268) + ir(560, 186, 560, 60, 'brand-primary') + ir(660, 262, 660, 424, 'brand-primary');
      if (on) {
        s += text(140, 234, 'atmosphere', 'lbl strong', 'start') + text(440, 500, 'surface', 'lbl strong');
        s += text(216, 110, 'sunlight absorbed', 'lbl', 'start') + text(216, 144, '(1 − a) S / 4', 'lbl mono strong', 'start');
        s += text(416, 360, 'surface', 'lbl', 'start') + text(416, 394, 'radiates', 'lbl', 'start') + text(576, 110, 'atmosphere', 'lbl', 'start') + text(576, 144, 'radiates up …', 'lbl', 'start') + text(676, 350, '… and', 'lbl', 'start') + text(676, 384, 'down', 'lbl', 'start');
      }
      return svg(on ? '70 20 760 500' : '80 20 720 470', s, 'A model with one layer of atmosphere above the surface. Sunlight passes through the atmosphere and is absorbed by the surface. The surface radiates infrared, which the atmosphere absorbs. The atmosphere radiates infrared both upwards to space and downwards to the surface, so the surface receives more than the sunlight alone');
    },

    // The rise of carbon dioxide at Mauna Loa: a smooth fit to the record with its yearly ripple.
    'b2-keeling': () => {
      const X = year => 130 + (year - 1958) * 10, Y = ppm => 430 - (ppm - 300) * 2.8;
      const ppm = year => { const t = year - 1958; return 315 + 0.819 * t + 0.0125 * t * t + 3 * Math.sin(TAU * (t + 0.1)); };
      let s = arrow(130, 430, 130, 40, 'text-secondary', 2.5) + arrow(130, 430, 830, 430, 'text-secondary', 2.5) + text(146, 54, 'CO₂ / parts per million', 'lbl mono', 'start');
      s += [1960, 1980, 2000, 2020].map(y => `<line x1="${X(y)}" y1="430" x2="${X(y)}" y2="442" class="tick"/>` + text(X(y), 472, y, 'lbl mono')).join('') + [320, 360, 400].map(p => `<line x1="118" y1="${f(Y(p))}" x2="130" y2="${f(Y(p))}" class="tick"/>` + text(108, f(Y(p)) + 9, p, 'lbl mono', 'end')).join('');
      s += line(sampled(t => { const y = 1958 + 66 * t; return [X(y), Y(ppm(y))]; }, 800), 'proton', 3) + text(X(1960), Y(348), 'about 315 in 1958', 'lbl halo', 'start') + text(X(2022), Y(432), 'over 420', 'lbl strong halo', 'end') + text(X(1988), Y(320), 'the ripple: plants take in CO₂', 'lbl small halo', 'start') + text(X(1988), Y(309), 'each northern summer', 'lbl small halo', 'start');
      return svg('40 20 810 480', s, 'A graph of the concentration of carbon dioxide in the air at Mauna Loa against year. It rises from about 315 parts per million in 1958 to over 420 today, more and more steeply, with a small ripple up and down every year');
    }
  };
});
