// Diagrams for the E.3 Radioactive decay deck, added to the shared set in ../assets/figures.js.
// The isotope, alpha, gamma, penetration, half-life and random-decay figures began as copies of
// those in gcsephy/decks/atoms-and-radiation; the two decks are separate, so a change to one does
// not reach the other. Particle colours are those of the other decks. Terracotta appears only in
// the additional higher level figures.
window.DeckFigures.add(P => {
  const { svg, ball, cluster, shadow, arrow, wave, text, sub, seeded, animated, stepG, fly, through, sampled, f } = P;

  return {
    'e3-isotopes': () => {
      const data = [[160, 6, '12'], [480, 7, '13'], [800, 8, '14']];
      let s = '';
      data.forEach(([x, n, a]) => {
        s += shadow(x, 290, 90) + cluster(x, 170, 6, n, 30);
        s += text(x, 334, `carbon-${a}`, 'lbl display');
        s += `<text x="${x}" y="366" class="lbl mono" text-anchor="middle"><tspan class="t-proton">6 p</tspan>, <tspan class="t-neutron">${n} n</tspan></text>`;
      });
      return svg('40 60 880 320', s, 'Nuclei of carbon-12, carbon-13 and carbon-14: all have 6 protons but 6, 7 and 8 neutrons');
    },

    'e3-alpha': el => {
      const on = animated(el);
      let s = shadow(150, 300, 100) + cluster(150, 190, 95, 146, 10);
      const parentLabels = text(150, 344, 'americium-241', 'lbl display') + text(150, 372, '95 p, 146 n', 'lbl mono');
      let after = arrow(260, 190, 330, 190, 'text-secondary', 3);
      after += shadow(440, 300, 95) + cluster(440, 200, 93, 144, 10);
      after += `<line x1="530" y1="160" x2="598" y2="112" class="trail" style="stroke:var(--alpha)"/>` + fly(on, -106, 74, cluster(636, 86, 2, 2, 10));
      const afterLabels = text(440, 344, 'neptunium-237', 'lbl display') + text(440, 372, '93 p, 144 n', 'lbl mono')
        + text(680, 162, 'alpha particle', 'lbl display') + text(680, 190, '2 p, 2 n', 'lbl mono');
      s += on ? parentLabels + stepG(on, 1, after + afterLabels) : after + parentLabels + afterLabels;
      return svg('0 0 790 400', s, 'Alpha decay: americium-241 emits an alpha particle of 2 protons and 2 neutrons and becomes neptunium-237');
    },

    'e3-gamma': el => {
      const on = animated(el);
      let s = `<circle cx="150" cy="180" r="140" fill="url(#g-glow)" class="pulse"/>` + cluster(150, 180, 43, 56, 14);
      const parentLabels = text(150, 334, 'technetium-99m', 'lbl display') + text(150, 362, 'extra energy', 'lbl mono');
      const ray = wave(540, 150, 700, 56, { cycles: 5, amp: 10 });
      let after = arrow(262, 180, 330, 180, 'text-secondary', 3);
      after += shadow(440, 290, 90) + cluster(440, 180, 43, 56, 14);
      after += (on ? `<g class="wipe late">${ray}</g>` : ray) + text(640, 66, 'gamma ray', 'lbl strong', 'end', 'style="fill:var(--photon)"');
      const afterLabels = text(440, 334, 'technetium-99', 'lbl display') + text(440, 362, 'same p and n', 'lbl mono');
      s += on ? parentLabels + stepG(on, 1, after + afterLabels) : after + parentLabels + afterLabels;
      return svg('0 0 720 400', s, 'Gamma emission: an excited technetium-99m nucleus gives out a gamma ray; its protons and neutrons do not change');
    },

    'e3-penetration': el => {
      const on = animated(el);
      let s = `<rect x="20" y="70" width="64" height="290" rx="12" style="fill:var(--lead)"/>` + text(52, 392, 'SOURCE', 'lbl mono small');
      s += `<rect x="300" y="52" width="7" height="326" rx="2" style="fill:var(--paper);stroke:var(--input-border)"/>`;
      s += `<rect x="520" y="52" width="18" height="326" rx="3" style="fill:var(--aluminium)"/>`;
      s += `<rect x="730" y="52" width="52" height="326" rx="4" style="fill:var(--lead)"/>`;
      s += text(303, 38, 'paper', 'lbl mono strong') + text(529, 6, 'aluminium', 'lbl mono strong') + text(529, 38, 'few mm', 'lbl mono') + text(756, 6, 'lead', 'lbl mono strong') + text(756, 38, 'several cm', 'lbl mono');
      // Deck build: each radiation streams from the source for as long as its step is shown.
      // The drawn particles and waves ("still") stand in on thumbnails, in print and with reduced motion.
      const still = body => on ? `<g class="still">${body}</g>` : body;
      // Particles wait out of sight behind the source (redrawn on top below) and come out through its face (x = 84)
      // one at a time once their step is shown (deck.css runs them), so the stream starts at
      // the source on the click.
      const stream = (y, endX, r, kind, seconds, count) => {
        if (!on) return '';
        const balls = Array.from({ length: count }, (_, i) =>
          `<g class="stream-ball" style="--time:${seconds}s;--delay:${(i * seconds / count).toFixed(3)}s;--travel:${endX - 84}px">${ball(84 - r, y, r, kind)}</g>`).join('');
        return `<g class="mover">${balls}</g>`;
      };
      // A wave one wavelength longer than its window, sliding along by that wavelength. The
      // window opens from its left edge when the step is shown, so the wave front sets off
      // from the source (and from the far side of the lead once it has got there).
      // The two windows start a whole number of wavelengths apart, so the wave beyond the
      // lead keeps the wavelength, frequency and phase of the wave before it: only the
      // amplitude is smaller. The wavelength is longer than in the still picture: at this
      // speed a short wave moves too large a part of itself each frame and looks jerky.
      const LAMBDA = 87, PERIOD = 0.21;
      const running = (id, x1, x2, amp, opacity, wait) => {
        const cycles = Math.ceil((x2 - x1) / LAMBDA) + 1, cross = (x2 - x1) / LAMBDA * PERIOD;
        return `<clipPath id="${id}"><rect x="${x1}" y="270" width="${x2 - x1}" height="70" class="wave-window" style="--cross:${cross.toFixed(2)}s;--wait:${wait}s"/></clipPath>`
          + `<g clip-path="url(#${id})"><g class="wave-run" style="--shift:${LAMBDA}px;--time:${PERIOD}s">${wave(x1 - LAMBDA, 305, x1 + (cycles - 1) * LAMBDA, 305, { cycles, amp, head: false, opacity })}</g></g>`;
      };
      // "stopped" and "reduced" appear when the first of the stream gets that far.
      const onArrival = (seconds, body) => on ? `<g class="on-arrival" style="--wait:${seconds}s">${body}</g>` : body;
      const greek = (y, sym, color) => text(112, y, sym, 'lbl greek', 'start', `style="fill:var(--${color})"`);
      // The lane lines belong to the printed figure only.
      const lane = (x2, y, color) => on ? '' : `<line x1="90" y1="${y}" x2="${x2}" y2="${y}" class="lane" style="stroke:var(--${color})"/>`;
      const alpha = lane(294, 125, 'alpha') + still(ball(150, 125, 14, 'alpha') + ball(232, 125, 14, 'alpha')) + stream(125, 300, 14, 'alpha', 1.6, 4)
        + onArrival(1.4, text(318, 110, 'stopped', 'lbl small', 'start', 'style="fill:var(--alpha)"'));
      const beta = lane(514, 215, 'electron') + still([160, 290, 420].map(x => ball(x, 215, 10, 'electron')).join('')) + stream(215, 520, 10, 'electron', 1.2, 4)
        + onArrival(1.0, text(550, 200, 'stopped', 'lbl small', 'start', 'style="fill:var(--electron)"'));
      // On the slide the wave beyond the lead has no arrowhead and the same wavelength as before it.
      const beyond = on ? wave(786, 305, 931, 305, { cycles: 2.5, amp: 6, head: false, opacity: .45 }) : wave(786, 305, 940, 305, { cycles: 3, amp: 6, opacity: .45 });
      let gamma = still(wave(90, 305, 728, 305, { cycles: 11, amp: 10, head: false }) + beyond);
      if (on) gamma += `<g class="mover">${running('gamma-in', 90, 728, 10, 1, 0)}${running('gamma-out', 786, 940, 6, .45, 1.65)}</g>`;
      gamma += onArrival(1.8, text(860, 340, 'reduced', 'lbl small', 'middle', 'style="fill:var(--photon)"'));
      const labels = [greek(100, 'α', 'alpha'), greek(196, 'β', 'electron'), greek(282, 'γ', 'photon')];
      s += on ? [alpha, beta, gamma].map((lane, i) => stepG(on, i + 1, lane + labels[i])).join('') + `<rect x="20" y="70" width="64" height="290" rx="12" style="fill:var(--lead)"/>` : alpha + beta + gamma + labels.join('');
      return svg('0 -24 960 434', s, 'Penetration: paper stops alpha, a few millimetres of aluminium stops beta, several centimetres of lead reduce gamma');
    },

    'e3-half-life': el => {
      const on = animated(el);
      const X = t => 90 + t * 18.75, Y = n => 400 - n * 0.85;
      let s = `<line x1="90" y1="400" x2="700" y2="400" class="axis"/><line x1="90" y1="400" x2="90" y2="44" class="axis"/>`;
      [0, 8, 16, 24, 32].forEach(t => { s += `<line x1="${X(t)}" y1="400" x2="${X(t)}" y2="408" class="axis"/>` + text(X(t), 432, t, 'lbl mono small'); });
      [0, 100, 200, 300, 400].forEach(n => { s += `<line x1="82" y1="${Y(n)}" x2="90" y2="${Y(n)}" class="axis"/>` + text(74, Y(n) + 6, n, 'lbl mono small', 'end'); });
      s += text(395, 462, 'time (days)', 'lbl');
      s += text(22, 222, 'undecayed nuclei', 'lbl', 'middle', 'transform="rotate(-90 22 222)"');
      // Deck build: one halving per click, read across from the axis and then down.
      [[8, 200, '½'], [16, 100, '¼'], [24, 50, '⅛']].forEach(([t, n, frac], i) => {
        let mark = `<path d="M90,${Y(n)} H${X(t)} V400" class="guide accent"/>` + `<circle cx="${X(t)}" cy="${Y(n)}" r="6" style="fill:var(--brand-accent)"/>`;
        mark += text(X(t) + 14, Y(n) - 12, frac, 'lbl strong', 'start', 'style="fill:var(--brand-accent-strong)"');
        s += stepG(on, i + 1, mark, 'wipe');
      });
      let d = '';
      for (let t = 0; t <= 32; t += 0.5) d += `${t ? 'L' : 'M'}${f(X(t))},${f(Y(400 * Math.pow(2, -t / 8)))}`;
      s += `<path d="${d}" class="curve draw"/>`;
      return svg('0 0 720 480', s, 'Decay curve: 400 undecayed nuclei fall to 200 after 8 days, 100 after 16 days and 50 after 24 days');
    },

    'e3-random': el => {
      const on = animated(el);
      const rand = seeded(7);
      const order = Array.from({ length: 64 }, (_, i) => i).sort(() => rand() - 0.5);
      const decayed = [new Set(), new Set(order.slice(0, 31)), new Set(order.slice(0, 49))];
      const labels = [['start', '64 undecayed'], ['after 1 half-life', '33 undecayed (≈ 32)'], ['after 2 half-lives', '15 undecayed (≈ 16)']];
      let s = '';
      [40, 368, 696].forEach((x0, g) => {
        let grid = '';
        for (let i = 0; i < 64; i++) {
          const x = x0 + (i % 8) * 28 + 14, y = 40 + Math.floor(i / 8) * 28 + 14;
          grid += ball(x, y, 11, decayed[g].has(i) ? 'decayed' : 'undecayed');
        }
        grid += text(x0 + 112, 310, labels[g][0], 'lbl mono strong') + text(x0 + 112, 340, labels[g][1], 'lbl');
        // Deck build: each later grid appears complete on its own click.
        s += g ? stepG(on, g, grid) : grid;
      });
      return svg('0 0 960 360', s, 'Random decay of 64 nuclei: 33 remain after one half-life and 15 after two, close to but not exactly half each time');
    },

    // Beta decay with its neutrino: data-kind="plus" for beta-plus (fluorine-18), otherwise beta-minus (carbon-14).
    'e3-beta': el => {
      const on = animated(el), plus = el.dataset.kind === 'plus';
      const parent = plus ? [9, 9, 'fluorine-18'] : [6, 8, 'carbon-14'], child = plus ? [8, 10, 'oxygen-18'] : [7, 7, 'nitrogen-14'], lepton = plus ? 'positive' : 'electron';
      let s = shadow(140, 262, 100) + cluster(140, 150, parent[0], parent[1], plus ? 24 : 26);
      const parentLabels = text(140, 300, parent[2], 'lbl display') + text(140, 328, `${parent[0]} p, ${parent[1]} n`, 'lbl mono');
      let after = arrow(250, 150, 320, 150, 'text-secondary', 3) + shadow(430, 262, 100) + cluster(430, 150, child[0], child[1], plus ? 24 : 26, { base: [parent[0], parent[1]], highlight: true });
      after += `<line x1="528" y1="120" x2="616" y2="78" class="trail" style="stroke:var(--${lepton})"/>` + fly(on, -112, 52, ball(640, 68, 14, lepton, plus ? '+' : '−')) + text(640, 30, plus ? 'positron' : 'electron', 'lbl strong');
      after += `<line x1="530" y1="176" x2="620" y2="208" class="trail" style="stroke:var(--neutron)"/>` + fly(on, -112, -40, `<circle cx="644" cy="216" r="9" style="fill:var(--card-bg);stroke:var(--neutron);stroke-width:3"/>`) + text(644, 258, plus ? 'neutrino' : 'antineutrino', 'lbl strong');
      const afterLabels = text(430, 300, child[2], 'lbl display') + text(430, 328, `${child[0]} p, ${child[1]} n`, 'lbl mono');
      let inside = `<rect x="60" y="356" width="640" height="96" rx="18" class="inset"/>` + text(86, 412, 'IN THE NUCLEUS', 'lbl mono', 'start');
      inside += ball(342, 404, 20, plus ? 'proton' : 'neutron') + arrow(368, 404, 404, 404, 'text-secondary', 2.5) + ball(432, 404, 20, plus ? 'neutron' : 'proton') + text(480, 414, '+', 'lbl display') + ball(528, 404, 14, lepton, plus ? '+' : '−') + text(576, 414, '+', 'lbl display') + `<circle cx="624" cy="404" r="9" style="fill:var(--card-bg);stroke:var(--neutron);stroke-width:3"/>`;
      s += on ? parentLabels + stepG(on, 1, inside) + stepG(on, 2, after + afterLabels) : after + parentLabels + afterLabels + inside;
      return svg('0 0 760 460', s, plus ? 'Beta-plus decay: a proton turns into a neutron, a positron and a neutrino; fluorine-18 becomes oxygen-18' : 'Beta-minus decay: a neutron turns into a proton, an electron and an antineutrino; carbon-14 becomes nitrogen-14');
    },

    // The forces between two protons a distance apart: a sketch, not to scale.
    'e3-strong': () => {
      const x = r => 110 + 180 * r;
      let s = arrow(110, 440, 110, 30, 'text-secondary', 2.5) + arrow(110, 240, 780, 240, 'text-secondary', 2.5) + text(774, 214, 'separation / fm', 'lbl mono', 'end') + text(126, 48, 'repulsion', 'lbl mono', 'start') + text(126, 432, 'attraction', 'lbl mono', 'start');
      [1, 2, 3].forEach(r => { s += `<line x1="${x(r)}" y1="234" x2="${x(r)}" y2="246" class="tick"/>` + text(x(r), 278, r, 'lbl mono halo'); });
      s += `<path d="${sampled(t => { const r = 0.56 + 3.1 * t; return [x(r), 240 - 60 / (r * r)]; })}" class="curve" style="stroke:var(--proton)"/>`;
      s += `<path d="${sampled(t => { const r = 0.7 + 2.9 * t, u = Math.exp(-3 * (r - 1)); return [x(r), 240 + 180 * (2 * u - u * u)]; }, 120)}" class="curve" style="stroke:var(--brand-primary)"/>`;
      s += text(330, 120, 'electric repulsion: long range', 'lbl strong', 'start', 'style="fill:var(--proton)"') + text(470, 344, 'strong nuclear force:', 'lbl strong', 'start', 'style="fill:var(--brand-primary)"') + text(470, 378, 'only within about 3 fm', 'lbl', 'start');
      return svg('40 10 780 450', s, 'Sketch graph of the forces between two protons against their separation in femtometres. The electric repulsion falls slowly with distance. The strong nuclear force is a much larger attraction at about 1 femtometre, becomes negligible beyond about 3 femtometres, and is repulsive at very small separations');
    },

    // Four separate nucleons have more mass than the helium nucleus they make.
    'e3-mass-defect': () => {
      const pan = (x, label, mass) => `<rect x="${x - 140}" y="250" width="280" height="14" rx="6" style="fill:var(--text-secondary)"/>` + text(x, 310, label, 'lbl strong') + text(x, 346, mass, 'lbl mono');
      let s = pan(200, '2 protons + 2 neutrons', '4.0319 u') + pan(620, 'helium-4 nucleus', '4.0015 u');
      s += ball(110, 216, 30, 'proton') + ball(172, 216, 30, 'neutron') + ball(234, 216, 30, 'proton') + ball(296, 216, 30, 'neutron') + cluster(620, 204, 2, 2, 30);
      s += arrow(370, 200, 480, 200, 'text-secondary', 3) + wave(620, 150, 700, 60, { cycles: 4 }) + text(712, 56, 'energy', 'lbl strong', 'start', 'style="fill:var(--photon)"') + text(712, 88, 'released', 'lbl', 'start');
      s += text(410, 420, 'mass defect 0.0304 u', 'lbl strong') + text(410, 456, 'binding energy 28.3 MeV', 'lbl mono');
      return svg('40 30 800 440', s, 'Two protons and two neutrons, separate, have a total mass of 4.0319 atomic mass units. The helium-4 nucleus they form has a mass of 4.0015. The difference, 0.0304 atomic mass units, is the mass defect, equivalent to the binding energy of 28.3 mega electronvolts released when the nucleus forms');
    },

    // Binding energy per nucleon against nucleon number, from measured values. data-arrows adds fusion and fission.
    'e3-be-curve': el => {
      const data = [[2, 1.11], [3, 2.57], [4, 7.07], [6, 5.33], [7, 5.61], [9, 6.46], [12, 7.68], [14, 7.48], [16, 7.98], [20, 8.03], [24, 8.26], [28, 8.45], [32, 8.49], [40, 8.55], [56, 8.79], [62, 8.79], [84, 8.72], [90, 8.71], [120, 8.5], [132, 8.43], [144, 8.33], [158, 8.2], [174, 8.08], [197, 7.92], [208, 7.87], [235, 7.59], [238, 7.57]];
      const X = a => 110 + 2.7 * a, Y = b => 430 - 42 * b;
      let s = `<line x1="110" y1="430" x2="770" y2="430" class="axis"/><line x1="110" y1="430" x2="110" y2="40" class="axis"/>`;
      [0, 50, 100, 150, 200].forEach(a => { s += `<line x1="${X(a)}" y1="430" x2="${X(a)}" y2="438" class="axis"/>` + text(X(a), 466, a, 'lbl mono'); });
      [2, 4, 6, 8].forEach(b => { s += `<line x1="102" y1="${Y(b)}" x2="110" y2="${Y(b)}" class="axis"/>` + text(94, Y(b) + 9, b, 'lbl mono', 'end'); });
      s += text(440, 506, 'nucleon number A', 'lbl') + text(40, 236, 'binding energy per nucleon / MeV', 'lbl', 'middle', 'transform="rotate(-90 40 236)"');
      s += `<path d="${through(data.map(([a, b]) => [X(a), Y(b)]))}" class="curve draw" style="stroke:var(--brand-primary);stroke-width:4"/>` + data.map(([a, b]) => `<circle cx="${f(X(a))}" cy="${f(Y(b))}" r="5" style="fill:var(--brand-accent-strong)"/>`).join('');
      s += `<line x1="${X(4) + 6}" y1="${Y(7.07) + 6}" x2="${X(22)}" y2="${Y(7.4)}" class="guide"/>` + text(X(24), Y(7.1), 'helium-4', 'lbl', 'start') + text(X(56), Y(8.79) - 18, 'iron-56', 'lbl strong') + text(X(235) - 4, Y(7.59) + 40, 'uranium-235', 'lbl', 'end') + text(X(2) + 16, Y(1.11) + 8, 'hydrogen-2', 'lbl', 'start');
      if ('arrows' in el.dataset) {
        // Match the steep hydrogen-to-helium rise and the shallow heavy-nucleus slope.
        // Offset the arrows from the data; keep the helium leader above the fusion arrow.
        const fusionSlope = (4 - 2) / (7.07 - 1.11);
        s += arrow(X(2.4) + 36, Y(2.2), X(2.4 + 4.5 * fusionSlope) + 36, Y(6.7), 'brand-accent', 5) + text(X(24), Y(4), 'fusion', 'lbl strong', 'start') + arrow(X(235), Y(7.59) - 22, X(174), Y(8.08) - 22, 'brand-accent', 5) + text(X(200), Y(9.0), 'fission', 'lbl strong');
      }
      return svg('0 20 800 500', s, 'Graph of binding energy per nucleon against nucleon number. It rises steeply for light nuclei, with a sharp peak at helium-4, reaches a maximum of about 8.8 mega electronvolts near iron-56 and then falls slowly to about 7.6 for uranium');
    },

    // Count rate against time with the background still included, and the corrected curve.
    'e3-count-graph': () => {
      const X = t => 110 + 80 * t, Y = c => 430 - 0.7 * c, raw = t => 30 + 480 * Math.pow(0.5, t / 2);
      let s = `<line x1="110" y1="430" x2="770" y2="430" class="axis"/><line x1="110" y1="430" x2="110" y2="40" class="axis"/>`;
      [0, 2, 4, 6, 8].forEach(t => { s += `<line x1="${X(t)}" y1="430" x2="${X(t)}" y2="438" class="axis"/>` + text(X(t), 466, t, 'lbl mono'); });
      [0, 200, 400].forEach(c => { s += `<line x1="102" y1="${Y(c)}" x2="110" y2="${Y(c)}" class="axis"/>` + text(94, Y(c) + 9, c, 'lbl mono', 'end'); });
      s += text(440, 506, 'time / hours', 'lbl') + text(40, 236, 'count rate / counts per minute', 'lbl', 'middle', 'transform="rotate(-90 40 236)"');
      s += `<line x1="110" y1="${Y(30)}" x2="770" y2="${Y(30)}" class="guide accent"/>` + `<line x1="${X(6.4)}" y1="${Y(30)}" x2="${X(6.4)}" y2="${Y(236)}" class="guide"/>` + text(X(6.4), Y(250), 'background: 30', 'lbl');
      s += `<path d="${sampled(t => [X(8 * t), Y(raw(8 * t))])}" class="curve" style="stroke:var(--neutron)"/><path d="${sampled(t => [X(8 * t), Y(raw(8 * t) - 30)])}" class="curve"/>`;
      s += text(X(1.3), Y(390), 'measured', 'lbl strong', 'start', 'style="fill:var(--neutron)"') + text(X(0.5), Y(250) + 60, 'corrected', 'lbl strong', 'start', 'style="fill:var(--undecayed)"');
      [[2, 240], [4, 120]].forEach(([t, c]) => { s += `<path d="M110,${Y(c)} H${X(t)} V430" class="guide"/><circle cx="${X(t)}" cy="${Y(c)}" r="7" style="fill:var(--brand-accent-strong)"/>`; });
      return svg('0 20 800 500', s, 'Graph of count rate against time for a radioactive source. The measured count rate levels off at the background rate of 30 counts per minute and not at zero. With the background subtracted, the corrected count rate halves from 480 to 240 in 2 hours and to 120 after 4 hours');
    },

    // ---- Additional higher level ----

    // Neutron number against proton number: the band of stable nuclides and the decays that lead towards it.
    'e3-nz': () => {
      // N and Z share one scale, so the line N = Z runs at 45° and the band visibly bends away from it.
      const u = 2.9, X = z => 110 + u * z, Y = n => 440 - u * n, band = z => z + 0.0062 * z * z;
      let s = `<line x1="110" y1="440" x2="${X(104)}" y2="440" class="axis"/><line x1="110" y1="440" x2="110" y2="${Y(142)}" class="axis"/>`;
      [0, 20, 40, 60, 80, 100].forEach(z => { s += `<line x1="${X(z)}" y1="440" x2="${X(z)}" y2="448" class="axis"/>` + text(X(z), 476, z, 'lbl mono'); });
      [0, 20, 40, 60, 80, 100, 120, 140].forEach(n => { s += `<line x1="102" y1="${Y(n)}" x2="110" y2="${Y(n)}" class="axis"/>` + text(94, Y(n) + 9, n, 'lbl mono', 'end'); });
      s += text(X(50), 516, 'proton number Z', 'lbl') + text(36, Y(70), 'neutron number N', 'lbl', 'middle', `transform="rotate(-90 36 ${Y(70)})"`);
      s += `<line x1="${X(0)}" y1="${Y(0)}" x2="${X(104)}" y2="${Y(104)}" class="guide"/>` + text(X(104) + 10, Y(104) + 8, 'N = Z', 'lbl mono', 'start');
      s += `<path d="${sampled(t => [X(83 * t), Y(band(83 * t))])}" style="fill:none;stroke:var(--hl);stroke-width:18;stroke-linecap:round;opacity:.75"/>` + text(X(83) + 22, Y(band(83)) + 44, 'stable', 'lbl strong', 'start', 'style="fill:var(--hl-text)"');
      // Each decay as a short arrow of its own slope: beta-minus (Z + 1, N − 1), beta-plus (Z − 1, N + 1), alpha (Z − 2, N − 2).
      s += text(X(4), Y(134), 'too many', 'lbl strong', 'start') + text(X(4), Y(134) + 32, 'neutrons:', 'lbl strong', 'start') + text(X(4), Y(134) + 64, 'beta-minus', 'lbl', 'start', 'style="fill:var(--electron)"') + text(X(4), Y(134) + 96, 'decay', 'lbl', 'start', 'style="fill:var(--electron)"') + arrow(X(32), Y(68), X(44), Y(56), 'electron', 5);
      s += text(X(52), Y(34), 'too few neutrons:', 'lbl strong', 'start') + text(X(52), Y(34) + 32, 'beta-plus decay', 'lbl', 'start', 'style="fill:var(--positive)"') + arrow(X(70), Y(60), X(58), Y(72), 'positive', 5);
      s += text(X(92), Y(140), 'too heavy:', 'lbl strong', 'start') + text(X(92), Y(140) + 32, 'alpha decay', 'lbl', 'start', 'style="fill:var(--alpha)"') + arrow(X(95), Y(132), X(87), Y(124), 'alpha', 5);
      return svg('0 0 580 530', s, 'Graph of neutron number against proton number, with both axes on the same scale so that the line N equals Z is at 45 degrees. The stable nuclides lie in a narrow band that follows the line N equals Z for light nuclei and curves above it for heavier ones. Nuclides above the band have too many neutrons and decay by beta-minus emission. Those below it have too few and decay by beta-plus emission. The heaviest nuclides decay by alpha emission');
    },

    // An alpha decay that can leave the daughter nucleus in an excited state, followed by a gamma photon.
    'e3-levels': () => {
      const level = (x1, x2, y) => `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" class="level"/>`;
      let s = level(80, 300, 90) + level(440, 720, 300) + level(440, 720, 410) + text(190, 70, 'parent nucleus', 'lbl strong') + text(580, 446, 'daughter: ground state', 'lbl') + text(726, 290, 'excited', 'lbl', 'start') + text(726, 322, 'state', 'lbl', 'start');
      s += arrow(250, 96, 470, 292, 'alpha', 5) + arrow(180, 96, 480, 402, 'alpha', 5) + text(396, 180, sub('α', '1'), 'lbl display', 'start', 'style="fill:var(--alpha)"') + text(270, 290, sub('α', '2'), 'lbl display', 'end', 'style="fill:var(--alpha)"');
      s += wave(620, 306, 620, 404, { cycles: 4, amp: 8 }) + text(644, 366, 'γ', 'lbl greek', 'start', 'style="fill:var(--photon)"');
      s += text(190, 380, 'two alpha energies,', 'lbl', 'middle') + text(190, 414, 'one gamma energy', 'lbl', 'middle');
      return svg('40 30 800 440', s, 'Energy level diagram for an alpha decay. The parent nucleus can decay to the ground state of the daughter nucleus, giving an alpha particle of higher energy, or to an excited state, giving an alpha particle of lower energy. The excited daughter then drops to its ground state by emitting a gamma photon whose energy equals the difference');
    },

    // The energies of beta particles from one nuclide: a continuous spread up to a maximum.
    'e3-beta-spectrum': () => {
      const at = t => [110 + 560 * t, 420 - 1900 * t * (1 - t) ** 2.2 * (0.35 + t)];
      let s = arrow(110, 420, 110, 40, 'text-secondary', 2.5) + arrow(110, 420, 780, 420, 'text-secondary', 2.5) + text(126, 456, 'kinetic energy', 'lbl mono', 'start') + text(126, 54, 'number of beta particles', 'lbl mono', 'start');
      s += `<path d="${sampled(at, 100)} L110,420 Z" style="fill:var(--electron);opacity:.16"/><path d="${sampled(at, 100)}" class="curve" style="stroke:var(--electron)"/>`;
      s += `<line x1="670" y1="420" x2="670" y2="150" style="stroke:var(--hl);stroke-width:4;stroke-dasharray:10 7"/>` + text(660, 136, 'expected:', 'lbl', 'end') + text(660, 168, 'one energy', 'lbl strong', 'end', 'style="fill:var(--hl-text)"') + text(700, 460, sub('E', 'max'), 'lbl display') + text(150, 120, 'observed:', 'lbl', 'start') + text(150, 152, 'a continuous spread', 'lbl strong', 'start', 'style="fill:var(--electron)"');
      return svg('40 20 780 470', s, 'Graph of the number of beta particles against their kinetic energy. The beta particles have a continuous spread of energies from zero up to a maximum, where a single sharp energy had been expected');
    },

    // The natural logarithm of the activity against time: a straight line of gradient −λ.
    'e3-ln-graph': () => {
      let s = arrow(110, 430, 110, 40, 'text-secondary', 2.5) + arrow(110, 430, 780, 430, 'text-secondary', 2.5) + text(774, 466, 'time', 'lbl mono', 'end') + text(126, 54, 'ln A', 'lbl mono', 'start');
      const pts = [[150, 98], [230, 136], [310, 170], [390, 212], [470, 244], [550, 286], [630, 318], [710, 358]];
      s += `<line x1="110" y1="80" x2="750" y2="376" class="curve" style="stroke:var(--hl);stroke-width:4"/>` + pts.map(([x, y]) => `<path d="M${x - 8},${y - 8} l16,16 m0,-16 l-16,16" class="tick" style="stroke-width:3"/>`).join('');
      s += `<path d="M300,168 H560 V288" class="guide accent"/>` + text(430, 150, 'Δt', 'lbl mono strong') + text(574, 236, 'Δ(ln A)', 'lbl mono strong', 'start') + text(96, 88, sub('ln A', '0'), 'lbl mono', 'end') + text(430, 340, 'gradient = −λ', 'lbl strong', 'end');
      return svg('0 20 800 460', s, 'Graph of the natural logarithm of activity against time. The measured points lie on a straight line that slopes downwards. Its gradient is minus the decay constant, and its intercept is the logarithm of the initial activity');
    }
  };
});
