// Diagrams for the A.3 Work, energy and power deck, added to the shared set in
// ../assets/figures.js. As in A.2, forces are teal and velocities or displacements apricot, and a
// force arrow starts where the force acts. Kinetic energy is apricot, potential energy teal and
// the total slate. Nothing here is terracotta: A.3 has no additional higher level content.
window.DeckFigures.add(P => {
  const { svg, arrow, text, sub, box, dot, surface, axes, plot, shade, both, through, sampled, labelled, spring, track, anim, twoState, PLAY, f } = P;
  const bar = (x, y, w, h, colour, extra = '') => `<rect x="${x}" y="${f(y)}" width="${w}" height="${f(h)}" rx="6" style="fill:var(--${colour})">${extra}</rect>`;

  // The roller-coaster track: height above the lowest point, in pixels, at horizontal position x.
  const TRACK = { x0: 60, x1: 620, base: 420, top: 300 };
  const trackY = x => { const t = (x - TRACK.x0) / (TRACK.x1 - TRACK.x0); return TRACK.base - TRACK.top * (0.5 + 0.5 * Math.cos(t * Math.PI * 3)) * (1 - 0.45 * t); };
  // The cart at equal time steps: its speed follows from the height it has lost, plus a small push at the start.
  const RIDE = (() => {
    const points = [], h0 = TRACK.base - trackY(TRACK.x0) + 6;
    let x = TRACK.x0;
    while (x < TRACK.x1) {
      const y = trackY(x), v = Math.sqrt(h0 - (TRACK.base - y)), slope = (trackY(x + 1) - y);
      points.push({ x, y, ke: (h0 - (TRACK.base - y)) / h0, pe: (TRACK.base - y) / h0 });
      x += 3.2 * v / 17.5 / Math.hypot(1, slope);
    }
    return points;
  })();

  return {
    // Work done by a force at an angle to the displacement. Also drawn small, with data-plain.
    'a3-work': el => {
      const on = labelled(el);
      let s = surface(60, 360, 760, 360) + box(250, 310, 150, 96) + `<line x1="325" y1="300" x2="560" y2="300" class="guide"/>`;
      s += arrow(325, 300, 533, 180, 'brand-primary', 6) + arrow(325, 300, 533, 300, 'brand-primary', 4, 'stroke-dasharray="10 7"') + `<line x1="539" y1="180" x2="539" y2="300" class="guide"/>` + dot(325, 300, 6);
      s += arrow(180, 420, 600, 420, 'brand-accent', 5);
      if (on) s += `<path d="M405,300 A80,80 0 0 0 394,260" class="guide accent"/>` + text(424, 286, 'θ', 'lbl greek', 'start') + text(430, 196, 'F', 'lbl display', 'end') + text(440, 338, 'F cos θ', 'lbl mono strong', 'middle') + text(390, 460, 'displacement s', 'lbl mono strong');
      return svg(on ? '40 130 740 350' : '100 150 560 300', s, 'A block is pulled along the ground by a force F at an angle theta above the horizontal and moves through a displacement s. Only the component of the force along the displacement, F cosine theta, does work');
    },

    // The area under a force–displacement graph is the work done: data-kind="spring" for a spring.
    'a3-fs-graph': el => {
      const on = labelled(el), isSpring = el.dataset.kind === 'spring';
      let s = '';
      if (isSpring) {
        s = shade('M110,400 L620,120 V400 Z', 'brand-primary', 0.22) + axes(110, 400, 760, 40, '', on ? 'force' : '') + plot('M110,400 L620,120') + `<path d="M110,120 H620 V400" class="guide"/>`;
        if (on) s += text(360, 436, 'extension', 'lbl mono') + text(620, 436, 'Δx', 'lbl mono strong') + text(98, 128, 'kΔx', 'lbl mono strong', 'end') + text(470, 330, 'area = ½ k(Δx)²', 'lbl strong halo');
      } else {
        const at = t => [110 + 560 * t, 400 - 250 * Math.sin(Math.PI * (0.12 + 0.76 * t)) - 30 * Math.sin(t * 9)];
        s = shade(`M110,400 L${sampled(at).slice(1)} L670,400 Z`, 'brand-primary', 0.22) + axes(110, 400, 760, 40, on ? 'displacement' : '', on ? 'force' : '') + plot(sampled(at)) + `<line x1="670" y1="${f(at(1)[1])}" x2="670" y2="400" class="guide"/>`;
        if (on) s += text(390, 320, 'area = work done', 'lbl strong halo');
      }
      return svg('40 20 760 440', s, isSpring ? 'Graph of force against extension for a spring: a straight line through the origin. The area of the triangle under it, half of k times the extension squared, is the elastic potential energy stored' : 'Graph of a varying force against displacement. The shaded area under the curve is the work done by the force');
    },

    // The same gain in height by two routes: straight up, and along a ramp.
    'a3-gpe': () => {
      let s = surface(60, 400, 760, 400) + `<path d="M210,400 L560,170 H740 V400" class="tick" style="fill:color-mix(in srgb, var(--text-secondary) 10%, transparent);stroke-width:4"/>`;
      s += box(130, 366, 80, 64) + box(650, 136, 80, 64, 'opacity=".45"') + arrow(240, 356, 520, 172, 'brand-accent', 5) + arrow(130, 320, 130, 120, 'brand-accent', 5) + arrow(150, 104, 596, 104, 'brand-accent', 5);
      s += `<line x1="770" y1="170" x2="790" y2="170" class="tick"/><line x1="770" y1="400" x2="790" y2="400" class="tick"/>` + both(780, 176, 780, 394) + text(796, 296, 'Δh', 'lbl display', 'start');
      s += text(340, 232, 'up the ramp', 'lbl halo', 'end') + text(116, 220, 'lifted', 'lbl', 'end') + text(440, 460, 'same Δh, so the same gain in potential energy', 'lbl strong');
      return svg('20 70 840 410', s, 'A block is raised onto a platform by two routes: lifted straight up and then moved across, or pushed up a ramp. The change in height is the same, so the gain in gravitational potential energy is the same');
    },

    // A cart on a frictionless track, with its kinetic and potential energy. Also the title picture, with data-plain.
    'a3-coaster': el => {
      const on = labelled(el), H = 260, base = 420;
      const rail = `<path d="${sampled(t => { const x = TRACK.x0 + (TRACK.x1 - TRACK.x0) * t; return [x, trackY(x) + 16]; }, 120)}" style="fill:none;stroke:var(--text-secondary);stroke-width:6;stroke-linecap:round"/><line x1="40" y1="${base + 16}" x2="640" y2="${base + 16}" class="guide"/>`;
      const cart = `<circle r="16" style="fill:color-mix(in srgb, var(--brand-accent-strong) 30%, var(--viewer-bg));stroke:var(--brand-accent-strong);stroke-width:4"/>`;
      const at = RIDE[Math.round(RIDE.length * 0.36)];
      let s = rail, still = `<g transform="translate(${f(at.x)} ${f(at.y)})">${cart}</g>`, mover = `<g>${track(RIDE.map(p => [p.x, p.y]), 7)}${cart}</g>`;
      if (on) {
        s += `<line x1="690" y1="${base}" x2="920" y2="${base}" class="tick"/>` + text(735, base + 40, 'kinetic', 'lbl') + text(735, base + 72, 'energy', 'lbl') + text(875, base + 40, 'potential', 'lbl') + text(875, base + 72, 'energy', 'lbl') + `<line x1="690" y1="${base - H}" x2="920" y2="${base - H}" class="guide accent"/>` + text(805, base - H - 14, 'total', 'lbl strong');
        still += bar(700, base - H * at.ke, 70, H * at.ke, 'brand-accent') + bar(840, base - H * at.pe, 70, H * at.pe, 'brand-primary');
        mover += bar(700, base, 70, 0, 'brand-accent', anim('y', RIDE.map(p => f(base - H * p.ke)), 7) + anim('height', RIDE.map(p => f(H * p.ke)), 7)) + bar(840, base, 70, 0, 'brand-primary', anim('y', RIDE.map(p => f(base - H * p.pe)), 7) + anim('height', RIDE.map(p => f(H * p.pe)), 7));
      }
      return svg(on ? '20 80 920 430' : '30 90 620 370', s + twoState(still, mover), 'A cart rolls along a frictionless track with a high hill, a dip and a lower hill. Two bars show its kinetic and potential energy. As it descends, potential energy falls and kinetic energy rises by the same amount; as it climbs, the reverse. The total stays the same');
    },

    // A compressed spring launching a ball: the spring, drawn horizontally.
    'a3-launcher': () => {
      // The spring lies along the line through the ball's centre and touches it. Played once on a press: the
      // spring pushes the ball out to the natural length (a quarter of an oscillation), then the ball leaves at v.
      const wall = 96, cy = 298, r = 30, L0 = 192, Ln = 350, n = 80, hold = 0.3, tq = 1.2, w = Math.PI / (2 * tq), vx = (Ln - L0) * w, T = hold + tq + (800 - wall - Ln - r) / vx;
      const coil = L => spring(0, 0, L, 9, 28).match(/d="([^"]+)"/)[1];
      const lengthAt = t => t < hold ? L0 : t < hold + tq ? L0 + (Ln - L0) * (1 - Math.cos(w * (t - hold))) : Ln;
      const ballAt = t => t < hold + tq ? wall + lengthAt(t) + r : wall + Ln + r + vx * (t - hold - tq);
      const times = Array.from({ length: n + 1 }, (_, i) => i / n * T);
      const ball = `<circle r="${r}" style="fill:color-mix(in srgb, var(--brand-accent-strong) 30%, var(--viewer-bg));stroke:var(--brand-accent-strong);stroke-width:4"/>`;
      const vArrow = arrow(42, 0, 202, 0, 'brand-accent', 5) + text(222, 10, 'v', 'lbl display', 'start');
      let s = surface(60, 330, 760, 330) + `<rect x="70" y="210" width="26" height="120" style="fill:var(--text-secondary)"/>`;
      s += `<line x1="${wall + L0}" y1="180" x2="${wall + L0}" y2="330" class="guide"/><line x1="${wall + Ln}" y1="180" x2="${wall + Ln}" y2="330" class="guide"/>` + both(wall + L0 + 6, 196, wall + Ln - 6, 196) + text(wall + (L0 + Ln) / 2, 180, 'Δx', 'lbl display') + text(wall + Ln, 372, 'natural length', 'lbl strong');
      // The still shows the ball at rest against the compressed spring, and faintly where it leaves at v.
      const still = `<g transform="translate(${wall} ${cy}) rotate(-90)"><path class="cable" stroke-linejoin="round" d="${coil(L0)}"/></g><g transform="translate(${wall + L0 + r} ${cy})">${ball}</g><g transform="translate(${wall + Ln + r} ${cy})"><g opacity=".4">${ball}</g>${vArrow}</g>`;
      const mover = `<g transform="translate(${wall} ${cy}) rotate(-90)"><path class="cable" stroke-linejoin="round" d="${coil(L0)}">${anim('d', times.map(t => coil(f(lengthAt(t)))), T, { loop: false })}</path></g>` +
        `<g transform="translate(${wall + L0 + r} ${cy})">${track(times.map(t => [ballAt(t), cy]), T, { loop: false })}${ball}<g opacity="0">${anim('opacity', [0, 0, 1, 1], T, { loop: false, extra: `keyTimes="0;${f((hold + tq) / T * 1000) / 1000};${f((hold + tq) / T * 1000 + 1) / 1000};1"` })}${vArrow}</g></g>`;
      return svg('40 140 740 250', s + twoState(still, mover) + PLAY, 'A ball rests against a spring that has been compressed by a distance delta x from its natural length. When released, the spring pushes the ball until the spring reaches its natural length, and the elastic potential energy of the spring becomes the kinetic energy of the ball, which then moves off at speed v');
    },

    // A Sankey diagram for a petrol engine: the width of each arrow shows the energy. Also drawn small, with data-plain.
    'a3-sankey': el => {
      const on = labelled(el);
      let s = `<path d="M80,140 H430 V260 H80 Z" style="fill:var(--brand-accent-strong);opacity:.75"/>`;
      s += `<path d="M430,140 H660 L700,158 L660,176 H430 Z" style="fill:var(--brand-primary)"/>`;
      s += `<path d="M430,176 H470 C540,176 564,220 564,300 V380 L606,380 L522,430 L438,380 L480,380 V300 C480,268 470,260 430,260 Z" style="fill:var(--brand-accent)"/>`;
      if (on) s += text(250, 210, '100 J in', 'lbl strong', 'middle', 'style="fill:#fff"') + text(250, 120, 'chemical energy of the fuel', 'lbl') + text(720, 150, '30 J useful', 'lbl strong', 'start') + text(720, 184, 'kinetic energy', 'lbl', 'start') + text(626, 330, '70 J wasted', 'lbl strong', 'start') + text(626, 364, 'thermal energy', 'lbl', 'start');
      return svg(on ? '60 90 880 360' : '60 110 660 340', s, 'Sankey diagram for a petrol engine. An arrow 100 units wide, the chemical energy input, splits into a narrow arrow of 30 units going straight on, the useful kinetic energy, and a wide arrow of 70 units turning downwards, the wasted thermal energy');
    }
  };
});
