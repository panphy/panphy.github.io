// Diagrams for the C.3 Wave phenomena deck, added to the shared set in ../assets/figures.js.
// Wavefronts are teal, rays apricot, and a second wave or medium slate. Terracotta is kept for
// what is higher level only (the single slit, the modulated pattern and gratings).
window.DeckFigures.add(P => {
  const { svg, arrow, text, sub, both, through, sampled, labelled, track, anim, twoState, f, TAU } = P;
  const line = (d, colour, width = 5, extra = '') => `<path d="${d}" style="fill:none;stroke:var(--${colour});stroke-width:${width};stroke-linecap:round;stroke-linejoin:round" ${extra}/>`;
  const rad = deg => deg * Math.PI / 180;
  let clips = 0;
  // Clips whatever it wraps to a rectangle; every use gets an id of its own. The rectangle is
  // marked visible so that the clip still works in a thumbnail, whose slide on the deck is hidden.
  const clipped = (x, y, w, h, body) => { const id = `c3-clip-${++clips}`; return `<clipPath id="${id}"><rect x="${x}" y="${y}" width="${w}" height="${h}" style="visibility:visible"/></clipPath><g clip-path="url(#${id})">${body}</g>`; };
  const ray = (x1, y1, x2, y2, colour = 'brand-accent', width = 5) => arrow(x1, y1, x2, y2, colour, width);
  // A ray with its arrowhead half way along, for long rays that end on a surface.
  const midRay = (x1, y1, x2, y2, colour = 'brand-accent', width = 5, at = 0.55) => { const a = Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI, mx = x1 + (x2 - x1) * at, my = y1 + (y2 - y1) * at; return `<line x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}" style="stroke:var(--${colour});stroke-width:${width};stroke-linecap:round"/><path d="M11,0 L-11,-9 V9 Z" transform="translate(${f(mx)} ${f(my)}) rotate(${f(a)})" style="fill:var(--${colour})"/>`; };
  const glass = (x, y, w, h) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" style="fill:color-mix(in srgb, var(--electron) 22%, transparent)"/>`;
  const arc = (cx, cy, r, a1, a2) => { const p = a => [cx + r * Math.cos(rad(a)), cy + r * Math.sin(rad(a))], [x1, y1] = p(a1), [x2, y2] = p(a2); return `<path d="M${f(x1)},${f(y1)} A${r},${r} 0 0 ${a2 > a1 ? 1 : 0} ${f(x2)},${f(y2)}" class="guide accent"/>`; };
  // Intensity patterns against angle: u runs from −1 to 1 across the picture.
  const sinc2 = x => (Math.abs(x) < 1e-6 ? 1 : (Math.sin(x) / x) ** 2);
  const slits = (delta, N) => { const s = Math.sin(delta / 2); return Math.abs(s) < 1e-6 ? 1 : (Math.sin(N * delta / 2) / (N * s)) ** 2; };
  const pattern = (fn, x0, x1, base, height, colour, n = 400, width = 4) => line(sampled(t => [x0 + (x1 - x0) * t, base - height * fn(-1 + 2 * t)], n), colour, width);
  const patternAxes = (x0, x1, base, top, label = 'position on the screen') => arrow((x0 + x1) / 2, base, (x0 + x1) / 2, top, 'text-secondary', 2.5) + `<line x1="${x0}" y1="${base}" x2="${x1}" y2="${base}" class="tick"/>` + text((x0 + x1) / 2 + 14, top + 12, 'intensity', 'lbl mono', 'start') + text(x1, base + 40, label, 'lbl mono', 'end');
  const RAINBOW = ['#7B2FBE', '#3F4FD1', '#2F9FE0', '#3FB54A', '#F2D43D', '#F08A2E', '#D93A2B'];

  return {
    // Wavefronts and rays for a point source and for a distant source. Also drawn plain.
    'c3-wavefronts': el => {
      const on = labelled(el), cx = 220, cy = 250, T = 1.6, gap = 44;
      let s = [0, 60, 120, 180, 240, 300].map(a => ray(cx + 18 * Math.cos(rad(a)), cy + 18 * Math.sin(rad(a)), cx + 170 * Math.cos(rad(a)), cy + 170 * Math.sin(rad(a)), 'brand-accent', 3)).join('') + `<circle cx="${cx}" cy="${cy}" r="10" style="fill:var(--brand-accent-strong)"/>` + [150, 250, 350].map(y => ray(520, y, 800, y, 'brand-accent', 3)).join('');
      if (on) s += text(cx, 470, 'point source', 'lbl') + text(660, 470, 'distant source', 'lbl') + text(660, 80, 'rays cross wavefronts at 90°', 'lbl strong');
      const ringsStill = [1, 2, 3, 4].map(k => `<circle cx="${cx}" cy="${cy}" r="${k * gap}" style="fill:none;stroke:var(--brand-primary);stroke-width:4;opacity:${1.05 - k * 0.2}"/>`).join(''), planeStill = [0, 1, 2, 3, 4, 5].map(k => `<line x1="${540 + k * gap}" y1="110" x2="${540 + k * gap}" y2="390" style="stroke:var(--brand-primary);stroke-width:4"/>`).join('');
      const rings = [0, 1, 2, 3].map(k => `<circle cx="${cx}" cy="${cy}" r="${k * gap + 4}" style="fill:none;stroke:var(--brand-primary);stroke-width:4" opacity="${f(1 - k * 0.24)}">${anim('r', [k * gap + 4, (k + 1) * gap + 4], T)}${anim('opacity', [f(1 - k * 0.24), f(1 - (k + 1) * 0.24)], T)}</circle>`).join('');
      const planes = clipped(520, 100, 290, 300, `<g>${track([[0, 0], [gap, 0]], T)}${[-1, 0, 1, 2, 3, 4, 5, 6].map(k => `<line x1="${540 + k * gap}" y1="110" x2="${540 + k * gap}" y2="390" style="stroke:var(--brand-primary);stroke-width:4"/>`).join('')}</g>`);
      return svg(on ? '10 40 840 450' : '20 60 800 380', s + twoState(ringsStill + planeStill, rings + planes), 'Wavefronts and rays. Round a point source the wavefronts are circles and the rays spread out along radii. Far from a source the wavefronts are straight and parallel and the rays are parallel. In both cases the rays cross the wavefronts at right angles');
    },

    // A ray meeting a boundary: part is reflected and part is transmitted, refracted towards the normal.
    'c3-boundary': el => {
      const on = labelled(el), bx = 420, by = 250, t1 = 50, t2 = 30.7, L = 230;
      let s = glass(100, by, 640, 220) + `<line x1="100" y1="${by}" x2="740" y2="${by}" class="tick" style="stroke-width:4"/><line x1="${bx}" y1="40" x2="${bx}" y2="460" class="guide"/>`;
      s += midRay(bx - L * Math.sin(rad(t1)), by - L * Math.cos(rad(t1)), bx, by) + midRay(bx, by, bx + L * Math.sin(rad(t1)), by - L * Math.cos(rad(t1)), 'brand-accent', 3) + midRay(bx, by, bx + L * Math.sin(rad(t2)), by + L * Math.cos(rad(t2)));
      if (on) s += arc(bx, by, 70, -90 - t1, -90) + arc(bx, by, 70, -90, -90 + t1) + arc(bx, by, 80, 90 - t2, 90) + text(bx - 40, by - 86, sub('θ', '1'), 'lbl greek', 'end') + text(bx + 40, by - 86, sub('θ', '1'), 'lbl greek', 'start') + text(bx + 30, by + 124, sub('θ', '2'), 'lbl greek', 'start') + text(120, by - 20, 'medium 1: faster', 'lbl', 'start') + text(120, by + 44, 'medium 2: slower', 'lbl', 'start') + text(bx + 8, 62, 'normal', 'lbl small', 'start') + text(200, 110, 'incident', 'lbl strong') + text(650, 110, 'reflected', 'lbl strong') + text(600, 420, 'transmitted', 'lbl strong');
      return svg(on ? '80 30 680 450' : '120 50 600 400', s, 'A ray meets the boundary between two media. Part is reflected at the same angle to the normal as it arrived. Part is transmitted into the second medium, where the wave is slower, and is bent towards the normal');
    },

    // Plane wavefronts crossing a boundary into a slower medium: they turn and bunch up. Also drawn plain.
    'c3-refraction': el => {
      const on = labelled(el), by = 250, t1 = rad(50), n = 1.6, t2 = Math.asin(Math.sin(t1) / n), l1 = 60, l2 = l1 / n, T = 1.6;
      // Wavefronts are lines at right angles to the ray direction (sin t, cos t), spaced one wavelength apart.
      const fronts = (t, lam, count) => Array.from({ length: count }, (_, k) => { const d = (k - count / 2) * lam, cx = 420 + d * Math.sin(t), cy = by + d * Math.cos(t); return `<line x1="${f(cx - 700 * Math.cos(t))}" y1="${f(cy + 700 * Math.sin(t))}" x2="${f(cx + 700 * Math.cos(t))}" y2="${f(cy - 700 * Math.sin(t))}" style="stroke:var(--brand-primary);stroke-width:4"/>`; }).join('');
      let s = glass(100, by, 640, 220) + `<line x1="100" y1="${by}" x2="740" y2="${by}" class="tick" style="stroke-width:4"/>`;
      const upper = move => clipped(100, 60, 640, by - 60, `<g>${move ? track([[0, 0], [l1 * Math.sin(t1), l1 * Math.cos(t1)]], T) : ''}${fronts(t1, l1, 30)}</g>`), lower = move => clipped(100, by, 640, 220, `<g>${move ? track([[0, 0], [l2 * Math.sin(t2), l2 * Math.cos(t2)]], T) : ''}${fronts(t2, l2, 44)}</g>`);
      const rays = ray(420 - 190 * Math.sin(t1), by - 190 * Math.cos(t1), 420 - 30 * Math.sin(t1), by - 30 * Math.cos(t1), 'brand-accent', 5) + ray(420 + 40 * Math.sin(t2), by + 40 * Math.cos(t2), 420 + 190 * Math.sin(t2), by + 190 * Math.cos(t2), 'brand-accent', 5);
      if (on) s += text(100, 44, 'faster: longer wavelength', 'lbl strong', 'start') + text(100, 506, 'slower: shorter wavelength', 'lbl strong', 'start');
      return svg(on ? '80 10 680 510' : '120 50 600 400', s + twoState(upper(false) + lower(false), upper(true) + lower(true)) + rays, 'Plane wavefronts crossing a boundary at an angle into a medium where the wave travels more slowly. Each wavefront stays joined across the boundary, so in the slower medium the wavefronts are closer together and turned: the wave has a shorter wavelength and travels in a direction closer to the normal');
    },

    // Three rays inside glass meeting the surface: refracted, at the critical angle, and totally reflected.
    'c3-tir': () => {
      const by = 200, n = 1.5, one = (bx, deg, title) => {
        const t = rad(deg), L = 190, sinOut = n * Math.sin(t);
        let g = `<line x1="${bx}" y1="60" x2="${bx}" y2="430" class="guide"/>` + midRay(bx - L * Math.sin(t), by + L * Math.cos(t), bx, by);
        if (sinOut < 0.999) { const o = Math.asin(sinOut); g += midRay(bx, by, bx + 150 * Math.sin(o), by - 150 * Math.cos(o)) + midRay(bx, by, bx + L * Math.sin(t), by + L * Math.cos(t), 'brand-accent', 2, 0.6); }
        else if (deg < 43) g += midRay(bx, by, bx + 150, by) + midRay(bx, by, bx + L * Math.sin(t), by + L * Math.cos(t), 'brand-accent', 3, 0.6);
        else g += midRay(bx, by, bx + L * Math.sin(t), by + L * Math.cos(t));
        return g + text(bx, 478, title, 'lbl strong');
      };
      let s = glass(40, by, 920, 240) + `<line x1="40" y1="${by}" x2="960" y2="${by}" class="tick" style="stroke-width:4"/>` + one(190, 28, 'below the critical angle') + one(500, 41.8, 'at the critical angle') + one(810, 56, 'above: total reflection');
      s += text(60, by - 20, 'air', 'lbl', 'start') + text(60, by + 44, 'glass', 'lbl', 'start') + text(500 + 14, by + 110, sub('θ', 'c'), 'lbl greek', 'start');
      return svg('20 70 960 420', s, 'Three rays inside glass meeting its surface with air. Below the critical angle the ray is mostly refracted out, bending away from the normal, with a weak reflection. At the critical angle the refracted ray runs along the surface. Above the critical angle there is no refracted ray: all the light is reflected back into the glass');
    },

    // Diffraction through a gap: wide compared with the wavelength, and about one wavelength wide.
    'c3-gap': () => {
      const gap = 30, one = (ox, half, title) => {
        let g = [0, 1, 2, 3, 4].map(k => `<line x1="${ox + 30 + k * gap}" y1="90" x2="${ox + 30 + k * gap}" y2="410" style="stroke:var(--brand-primary);stroke-width:4"/>`).join('');
        g += `<rect x="${ox + 172}" y="70" width="16" height="${180 - half}" style="fill:var(--brand-accent-strong)"/><rect x="${ox + 172}" y="${250 + half}" width="16" height="${180 - half}" style="fill:var(--brand-accent-strong)"/>`;
        // Beyond the gap: a straight middle the width of the gap, with quarter circles at each end.
        g += [1, 2, 3, 4, 5, 6].map(k => { const r = k * gap, x = ox + 188; return `<path d="M${x},${250 - half - r} A${r},${r} 0 0 1 ${x + r},${250 - half} V${250 + half} A${r},${r} 0 0 1 ${x},${250 + half + r}" style="fill:none;stroke:var(--brand-primary);stroke-width:4"/>`; }).join('');
        return clipped(ox, 60, 400, 380, g) + text(ox + 200, 480, title, 'lbl strong');
      };
      return svg('20 40 880 460', one(40, 80, 'wide gap: little spreading') + one(470, 14, 'gap ≈ λ: spreads right round'), 'Plane wavefronts passing through a gap in a barrier. When the gap is much wider than the wavelength, the wave carries straight on with only slight curving at the edges. When the gap is about one wavelength wide, the wave spreads out in semicircles beyond it. The wavelength is the same on both sides');
    },

    // Diffraction round the edge of a body: the wave bends into the shadow.
    'c3-edge': () => {
      const gap = 34;
      let s = [0, 1, 2, 3, 4].map(k => `<line x1="${110 + k * gap}" y1="70" x2="${110 + k * gap}" y2="430" style="stroke:var(--brand-primary);stroke-width:4"/>`).join('') + `<rect x="272" y="250" width="16" height="190" style="fill:var(--brand-accent-strong)"/>`;
      s += clipped(288, 60, 480, 380, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(k => { const r = k * gap, x = 288; return `<path d="M${x + r},70 V250 A${r},${r} 0 0 1 ${x},${250 + r}" style="fill:none;stroke:var(--brand-primary);stroke-width:4"/>`; }).join(''));
      s += text(280, 480, 'obstacle', 'lbl');
      return svg('80 40 700 460', s, 'Plane wavefronts passing the edge of an obstacle. Beyond the edge the wavefronts curve round into the region behind the obstacle, the geometrical shadow');
    },

    // Two pulses meeting on a string. data-kind: same (both up) or opposite. Played in a loop.
    'c3-pulses': el => {
      const opposite = el.dataset.kind === 'opposite', x0 = 90, x1 = 770, y0 = 250, w = 46, h = 90, F = 48;
      const bump = (x, c, sign) => sign * h * Math.exp(-(((x - c) / w) ** 2));
      const shape = (c1, c2, y) => sampled(t => { const x = x0 + (x1 - x0) * t; return [x, y - bump(x, c1, 1) - bump(x, c2, opposite ? -1 : 1)]; }, 110);
      const row = (c1, c2, y, label) => `<line x1="${x0}" y1="${y}" x2="${x1}" y2="${y}" class="guide"/>` + line(shape(c1, c2, y), 'brand-primary', 5) + text(x0 - 14, y + 10, label, 'lbl', 'end');
      const still = row(230, 630, 120, 'before') + row(430, 430, 280, 'meeting') + row(630, 230, 440, 'after') + arrow(250, 60, 330, 60, 'brand-accent', 4) + arrow(610, 60, 530, 60, 'brand-accent', 4);
      const mover = `<line x1="${x0}" y1="${y0}" x2="${x1}" y2="${y0}" class="guide"/><path style="fill:none;stroke:var(--brand-primary);stroke-width:5;stroke-linejoin:round" d="${shape(150, 710, y0)}">${anim('d', Array.from({ length: F + 1 }, (_, i) => shape(150 + 560 * i / F, 710 - 560 * i / F, y0)), 5)}</path>`;
      return svg('-40 30 830 460', twoState(still, mover), opposite ? 'Two pulses travelling towards each other on a string, one upwards and one downwards. Where they overlap they cancel and the string is momentarily flat; afterwards each carries on unchanged' : 'Two upward pulses travelling towards each other on a string. Where they overlap the displacement is the sum of the two, a pulse twice as high; afterwards each carries on unchanged');
    },

    // Two waves and their sum. data-kind: in (in phase) or anti (in antiphase).
    'c3-superpose': el => {
      const anti = el.dataset.kind === 'anti', x0 = 110, x1 = 770, amp = 46, wave = (y, a, ph, colour, width = 5) => line(sampled(t => [x0 + (x1 - x0) * t, y - a * Math.sin(t * 2.5 * TAU + ph)], 120), colour, width);
      let s = [110, 250, 410].map(y => `<line x1="${x0}" y1="${y}" x2="${x1}" y2="${y}" class="guide"/>`).join('') + wave(110, amp, 0, 'brand-primary') + wave(250, amp, anti ? Math.PI : 0, 'brand-accent-strong') + (anti ? line(`M${x0},410 H${x1}`, 'brand-accent', 6) : wave(410, 2 * amp, 0, 'brand-accent', 6));
      s += text(x0 - 14, 120, 'wave 1', 'lbl', 'end') + text(x0 - 14, 260, 'wave 2', 'lbl', 'end') + text(x0 - 14, 420, 'sum', 'lbl strong', 'end') + text(440, 330, '+', 'lbl display');
      return svg('-30 30 820 480', s, anti ? 'Two waves of the same amplitude in antiphase: each crest of one meets a trough of the other. Their sum is zero everywhere: destructive interference' : 'Two waves of the same amplitude in phase: crest meets crest. Their sum is a wave of twice the amplitude: constructive interference');
    },

    // The pattern of two coherent sources. Also the title picture, with data-plain.
    'c3-two-sources': el => {
      const on = labelled(el), sx = 160, y1 = 200, y2 = 300, lam = 40, T = 1.6, d = y2 - y1;
      // Lines of constructive interference: points whose distances from the two sources differ by a whole number of wavelengths.
      const hyper = m => { const a = m * lam / 2, c = d / 2, b2 = c * c - a * a; return sampled(t => { const x = 2 + 620 * t, y = a * Math.sqrt(1 + x * x / b2); return [sx + x, 250 + y]; }, 40); };
      let s = [0, 1, 2].map(m => m === 0 ? line(`M${sx},250 H790`, 'brand-accent', 3, 'stroke-dasharray="10 8"') : line(hyper(m), 'brand-accent', 3, 'stroke-dasharray="10 8"') + line(hyper(-m), 'brand-accent', 3, 'stroke-dasharray="10 8"')).join('');
      const rings = (cy, move) => Array.from({ length: 15 }, (_, k) => `<circle cx="${sx}" cy="${cy}" r="${k * lam + 20}" style="fill:none;stroke:var(--brand-primary);stroke-width:3;opacity:.7">${move ? anim('r', [k * lam + 20, (k + 1) * lam + 20], T) : ''}</circle>`).join('');
      const dots = `<circle cx="${sx}" cy="${y1}" r="9" style="fill:var(--brand-accent-strong)"/><circle cx="${sx}" cy="${y2}" r="9" style="fill:var(--brand-accent-strong)"/>`;
      const labels = on ? text(sx - 18, y1 + 8, sub('S', '1'), 'lbl mono strong', 'end') + text(sx - 18, y2 + 8, sub('S', '2'), 'lbl mono strong', 'end') + text(700, 236, 'n = 0', 'lbl mono strong halo') + text(480, 96, 'n = 1', 'lbl mono strong halo') + text(480, 418, 'n = 1', 'lbl mono strong halo') + text(460, 492, 'dashed: lines of constructive interference', 'lbl') : '';
      return svg(on ? '80 20 720 490' : '120 60 660 380', clipped(sx, 20, 640, 450, s + twoState(rings(y1, false) + rings(y2, false), rings(y1, true) + rings(y2, true))) + dots + labels, 'Circular waves spreading from two sources that oscillate in step. Along certain lines the waves always arrive in phase and reinforce each other: lines of constructive interference, where the path difference is a whole number of wavelengths. Between them lie lines where the waves always cancel');
    },

    // Path difference to a point from two sources.
    'c3-path': () => {
      const sx = 150, y1 = 190, y2 = 330, px = 720, py = 150;
      let s = midRay(sx, y1, px, py, 'brand-primary', 4) + midRay(sx, y2, px, py, 'brand-accent-strong', 4) + `<circle cx="${sx}" cy="${y1}" r="10" style="fill:var(--text-main)"/><circle cx="${sx}" cy="${y2}" r="10" style="fill:var(--text-main)"/><circle cx="${px}" cy="${py}" r="10" style="fill:var(--brand-accent)"/>`;
      s += text(sx - 20, y1 + 8, sub('S', '1'), 'lbl mono strong', 'end') + text(sx - 20, y2 + 8, sub('S', '2'), 'lbl mono strong', 'end') + text(px + 20, py + 8, 'P', 'lbl display', 'start') + text(430, 150, sub('S', '1') + 'P', 'lbl mono halo') + text(460, 290, sub('S', '2') + 'P', 'lbl mono halo') + text(440, 420, 'path difference = S₂P − S₁P', 'lbl strong') + text(440, 460, 'the extra distance one wave has travelled', 'lbl');
      return svg('70 80 720 400', s, 'Two sources S 1 and S 2 and a point P. The path difference at P is the difference between the two distances S 2 P and S 1 P: the extra distance travelled by the wave from the further source');
    },

    // Young's double slit: the arrangement and the fringes. Also drawn plain.
    'c3-young': el => {
      const on = labelled(el), sx = 250, scr = 700, cy = 250, d = 50;
      let s = `<rect x="${sx - 8}" y="60" width="16" height="${cy - d / 2 - 68}" style="fill:var(--brand-accent-strong)"/><rect x="${sx - 8}" y="${cy - d / 2 + 8}" width="16" height="${d - 16}" style="fill:var(--brand-accent-strong)"/><rect x="${sx - 8}" y="${cy + d / 2 + 8}" width="16" height="${440 - cy - d / 2 - 8}" style="fill:var(--brand-accent-strong)"/>`;
      s += [130, 170, 210].map(x => `<line x1="${x - 60}" y1="150" x2="${x - 60}" y2="350" style="stroke:var(--brand-primary);stroke-width:4"/>`).join('') + `<rect x="${scr}" y="60" width="14" height="380" style="fill:var(--text-secondary);opacity:.5"/>`;
      // Fringes on the screen: bright bands evenly spaced.
      s += Array.from({ length: 9 }, (_, k) => `<rect x="${scr + 22}" y="${cy - 4 * 42 + k * 42 - 11}" width="46" height="22" rx="6" style="fill:var(--brand-accent);opacity:${f(1 - Math.abs(k - 4) * 0.13)}"/>`).join('');
      s += line(`M${sx},${cy - d / 2} L${scr},${cy - 84} M${sx},${cy + d / 2} L${scr},${cy - 84}`, 'brand-primary', 2.5);
      if (on) s += both(sx - 40, cy - d / 2, sx - 40, cy + d / 2) + text(sx - 56, cy + 10, 'd', 'lbl display italic', 'end') + both(sx + 10, 470, scr - 4, 470) + text((sx + scr) / 2, 506, 'D', 'lbl display italic') + both(scr + 90, cy - 42, scr + 90, cy) + text(scr + 106, cy - 12, 's', 'lbl display italic', 'start') + text(scr + 44, 40, 'screen', 'lbl') + text(sx, 40, 'double slit', 'lbl') + text(110, 400, 'light', 'lbl');
      return svg(on ? '30 10 830 510' : '50 40 760 420', s, 'Young’s double-slit experiment. Light falls on two narrow slits a distance d apart. The light from the two slits overlaps on a screen a distance D away and makes evenly spaced bright and dark fringes, a distance s apart');
    },

    // Intensity patterns. data-kind: double, single, widths, modulated or slits.
    'c3-intensity': el => {
      const kind = el.dataset.kind || 'double', x0 = 90, x1 = 810, base = 410, H = 300;
      let s = patternAxes(x0, x1, base, 60, kind === 'slits' ? 'angle' : 'position on the screen'), label = '';
      if (kind === 'double') { s += pattern(u => Math.cos(Math.PI * 4.5 * u) ** 2, x0, x1, base, H * 0.8, 'brand-primary'); s += both(450, base + 62, 530, base + 62) + text(490, base + 100, 's', 'lbl display italic'); label = 'The intensity pattern of an ideal double slit: bright fringes of equal brightness, evenly spaced a distance s apart, with dark fringes between them'; }
      if (kind === 'single') { s += pattern(u => sinc2(Math.PI * 3.2 * u), x0, x1, base, H, 'hl'); const w = 720 / 6.4; s += both(450 - w, base + 62, 450 + w, base + 62) + text(450, base + 100, 'central maximum: twice as wide', 'lbl') + `<path d="M${450 - w},${base} v20 M${450 + w},${base} v20" class="guide"/>` + text(450 + w + 6, base - 14, 'first minimum', 'lbl small', 'start'); label = 'The intensity pattern of a single slit: a broad, bright central maximum, twice as wide as the faint maxima on either side, which fall off quickly in brightness. The first minimum lies at an angle of lambda over b from the centre'; }
      if (kind === 'widths') { s += pattern(u => sinc2(Math.PI * 4.6 * u), x0, x1, base, H, 'hl') + pattern(u => 0.3 * sinc2(Math.PI * 2 * u), x0, x1, base, H, 'brand-accent-strong'); s += text(480, 120, 'wider slit', 'lbl strong halo', 'start', 'style="fill:var(--hl-text)"') + text(560, 330, 'narrower slit', 'lbl strong halo', 'start'); label = 'Single-slit patterns for two slit widths. The narrower slit gives a wider and fainter central maximum; the wider slit gives a narrower and brighter one'; }
      if (kind === 'modulated') { const env = u => sinc2(Math.PI * 2.4 * u); s += pattern(u => env(u) * Math.cos(Math.PI * 9.6 * u) ** 2, x0, x1, base, H, 'brand-primary') + line(sampled(t => [x0 + (x1 - x0) * t, base - H * env(-1 + 2 * t)], 200), 'hl', 3, 'stroke-dasharray="10 8"'); s += text(530, 130, 'single-slit envelope', 'lbl strong halo', 'start', 'style="fill:var(--hl-text)"') + text(530, 164, 'fringes inside it', 'lbl halo', 'start'); label = 'The pattern of a real double slit: evenly spaced fringes whose brightness follows the single-slit pattern of one slit, drawn as a dashed envelope. Fringes are brightest near the centre, and a fringe is missing wherever it falls on a minimum of the envelope'; }
      if (kind === 'slits') { const row = (N, y, colour, name) => line(sampled(t => [x0 + (x1 - x0) * t, y - 100 * slits(TAU * 2.5 * (-1 + 2 * t), N)], 700), colour, 3.5) + `<line x1="${x0}" y1="${y}" x2="${x1}" y2="${y}" class="tick"/>` + text(x0 - 12, y - 40, name, 'lbl strong', 'end'); s = row(2, 160, 'brand-primary', '2 slits') + row(5, 300, 'brand-accent-strong', '5 slits') + row(20, 440, 'hl', '20 slits') + text(x1, 480, 'angle', 'lbl mono', 'end') + text(450, 40, 'same slit spacing: the maxima stay put and sharpen', 'lbl'); label = 'Intensity against angle for two, five and twenty slits with the same spacing. The main maxima stay at the same angles but become narrower and sharper as the number of slits increases, with almost nothing between them'; }
      return svg(kind === 'slits' ? '-60 10 890 490' : '60 30 780 500', s, label);
    },

    // A diffraction grating sending light out at definite angles.
    'c3-grating': () => {
      const gx = 240, cy = 250, L = 380;
      let s = `<rect x="${gx - 7}" y="80" width="14" height="340" style="fill:var(--brand-accent-strong)"/>` + Array.from({ length: 16 }, (_, k) => `<line x1="${gx - 7}" y1="${92 + k * 21}" x2="${gx + 7}" y2="${92 + k * 21}" style="stroke:var(--viewer-bg);stroke-width:5"/>`).join('') + [200, 250, 300].map(y => ray(60, y, gx - 20, y, 'brand-accent', 4)).join('');
      [[0, 'n = 0'], [18, 'n = 1'], [-18, 'n = 1'], [38, 'n = 2'], [-38, 'n = 2']].forEach(([deg, name]) => { const ex = gx + L * Math.cos(rad(deg)), ey = cy - L * Math.sin(rad(deg)); s += midRay(gx + 8, cy, ex, ey, 'hl', deg === 0 ? 5 : 4, 0.7) + text(ex + 14, ey + 9, name, 'lbl mono strong', 'start'); });
      s += arc(gx, cy, 150, -18, 0) + text(gx + 164, cy - 18, 'θ', 'lbl greek', 'start') + text(gx, 458, 'grating: slit spacing d', 'lbl') + text(120, 170, 'light', 'lbl');
      return svg('40 0 820 480', s, 'Light falling on a diffraction grating at right angles. Beyond the grating, bright beams leave only at certain angles: the zero order straight on, the first order at an angle theta on each side, the second order at a larger angle, and so on');
    },

    // White light through a grating: a white centre with a spectrum on each side in each order.
    'c3-grating-white': () => {
      const cx = 450, y = 190, h = 110, unit = 150;
      let s = `<rect x="60" y="${y - 20}" width="780" height="${h + 40}" rx="10" style="fill:var(--spectrum-bg)"/><rect x="${cx - 8}" y="${y}" width="16" height="${h}" style="fill:#fff"/>`;
      // In order n the colours run from violet (0.4 μm) nearest the centre to red (0.7 μm) furthest out.
      [1, 2].forEach(n => [-1, 1].forEach(side => RAINBOW.forEach((colour, k) => { const a = n * unit * (0.4 + 0.05 * k) / 0.4 * 0.62, w = n * unit * 0.05 / 0.4 * 0.62 + 1; s += `<rect x="${f(side > 0 ? cx + a : cx - a - w)}" y="${y}" width="${f(w)}" height="${h}" style="fill:${colour};opacity:${n === 1 ? 1 : 0.7}"/>`; })));
      s += text(cx, y - 44, 'n = 0: white', 'lbl strong') + text(cx + 142, y - 44, 'n = 1', 'lbl mono strong') + text(cx - 142, y - 44, 'n = 1', 'lbl mono strong') + text(cx + 284, y - 44, 'n = 2', 'lbl mono strong') + text(cx - 284, y - 44, 'n = 2', 'lbl mono strong') + text(cx, y + h + 70, 'in every order: violet nearest the centre, red furthest out', 'lbl');
      return svg('40 100 820 290', s, 'The pattern from white light passing through a diffraction grating. In the centre is a white line, the zero order. On each side is a first-order spectrum with violet nearest the centre and red furthest out, then a wider second-order spectrum');
    }
  };
});
