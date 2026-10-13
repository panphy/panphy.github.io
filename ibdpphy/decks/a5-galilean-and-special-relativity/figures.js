// Diagrams for the A.5 Galilean and special relativity deck (higher level only), added to the
// shared set in ../assets/figures.js. The frame S (the platform, the Earth) is slate and teal;
// the frame S′ that moves relative to it is terracotta, the colour of this higher level topic;
// light is apricot. On space–time diagrams the time axis is ct and light travels at 45°.
window.DeckFigures.add(P => {
  const { svg, arrow, text, sub, both, through, sampled, labelled, track, anim, twoState, f, TAU } = P;
  const line = (d, colour, width = 5, extra = '') => `<path d="${d}" style="fill:none;stroke:var(--${colour});stroke-width:${width};stroke-linecap:round;stroke-linejoin:round" ${extra}/>`;
  const at = (x, y, body) => `<g transform="translate(${f(x)} ${f(y)})">${body}</g>`;
  const car = (w, h, colour = 'hl') => `<rect x="${-w / 2}" y="${-h}" width="${w}" height="${h}" rx="10" style="fill:color-mix(in srgb, var(--${colour}) 16%, var(--viewer-bg));stroke:var(--${colour});stroke-width:3"/><circle cx="${-w / 2 + 34}" cy="6" r="13" style="fill:var(--text-secondary)"/><circle cx="${w / 2 - 34}" cy="6" r="13" style="fill:var(--text-secondary)"/>`;
  const flash = (x, y, r = 11) => `<circle cx="${x}" cy="${y}" r="${r}" style="fill:var(--brand-accent)"/>`;
  // Space–time diagram geometry: origin at (OX, OY), one unit is U pixels, x to the right and ct upwards.
  const OX = 150, OY = 440, U = 76, SX = x => OX + U * x, SY = t => OY - U * t;
  const stAxes = (on, n = 5) => arrow(OX, OY, OX, SY(n) - 10, 'text-secondary', 3) + arrow(OX, OY, SX(n + 0.3), OY, 'text-secondary', 3) + (on ? text(OX - 14, SY(n) + 6, 'ct', 'lbl display italic', 'end') + text(SX(n + 0.3), OY + 40, 'x', 'lbl display italic', 'end') : '');
  const lightLine = (n = 4.9) => line(`M${OX},${OY} L${SX(n)},${SY(n)}`, 'brand-accent', 3, 'stroke-dasharray="10 8"');
  const event = (x, t, name, dx = 14, dy = -12, colour = 'text-main') => `<circle cx="${f(SX(x))}" cy="${f(SY(t))}" r="9" style="fill:var(--${colour})"/>` + (name ? text(f(SX(x)) + dx, f(SY(t)) + dy, name, 'lbl strong halo', dx < 0 ? 'end' : 'start') : '');

  return {
    // Two reference frames: the platform S and a carriage S′ moving past it. Also drawn plain.
    'a5-frames': el => {
      const on = labelled(el), gy = 400, T = 6;
      let s = `<line x1="40" y1="${gy + 20}" x2="860" y2="${gy + 20}" class="tick" style="stroke-width:5"/>` + arrow(90, gy + 20, 90, 110, 'brand-primary', 3) + arrow(90, gy + 20, 300, gy + 20, 'brand-primary', 3);
      if (on) s += text(74, 120, 'y', 'lbl display italic', 'end') + text(300, gy + 60, 'x', 'lbl display italic', 'end') + text(100, 90, 'frame S: the platform', 'lbl strong', 'start', 'style="fill:var(--brand-primary)"');
      const moving = car(280, 150) + arrow(-140, 0, -140, -220, 'hl', 3) + arrow(-140, 0, 60, 0, 'hl', 3) + flash(60, -90) + (on ? text(-156, -212, 'y′', 'lbl display italic', 'end') + text(56, 40, 'x′', 'lbl display italic', 'end') + text(40, -82, 'event', 'lbl halo', 'end') + arrow(150, -180, 230, -180, 'brand-accent', 5) + text(190, -196, 'v', 'lbl display italic') + text(-130, -250, 'frame S′: the carriage', 'lbl strong', 'start', 'style="fill:var(--hl-text)"') : '');
      return svg(on ? '20 60 860 420' : '40 110 800 340', s + twoState(at(520, gy, moving), `<g>${track([[330, gy], [640, gy], [640, gy]], T, { extra: 'keyTimes="0;0.8;1"' })}${moving}</g>`), 'Two reference frames. Frame S is fixed to a railway platform. Frame S prime is fixed to a carriage moving along the platform at velocity v. An event, such as a flash of light inside the carriage, has coordinates in both frames');
    },

    // The Lorentz factor against speed.
    'a5-gamma': () => {
      const X = b => 130 + 620 * b, Y = g => 430 - 60 * (g - 1) - 30, gamma = b => 1 / Math.sqrt(1 - b * b);
      let s = arrow(130, 430, 130, 40, 'text-secondary', 2.5) + arrow(130, 430, 800, 430, 'text-secondary', 2.5) + `<line x1="${X(1)}" y1="430" x2="${X(1)}" y2="50" class="guide accent"/>` + line(sampled(t => { const b = 0.99 * t; return [X(b), Y(gamma(b))]; }, 160), 'hl', 6);
      s += text(150, 76, 'γ', 'lbl greek', 'start') + text(800, 500, 'v / c', 'lbl mono', 'end') + [0, 0.2, 0.4, 0.6, 0.8, 1].map(b => `<line x1="${X(b)}" y1="430" x2="${X(b)}" y2="442" class="tick"/>` + text(X(b), 470, b.toFixed(1), 'lbl mono')).join('') + [1, 2, 3, 4, 5, 6, 7].map(g => `<line x1="118" y1="${Y(g)}" x2="130" y2="${Y(g)}" class="tick"/>` + text(108, Y(g) + 9, g, 'lbl mono', 'end')).join('');
      s += [[0.6, '1.25'], [0.8, '1.67'], [0.95, '3.20']].map(([b, name]) => `<circle cx="${X(b)}" cy="${f(Y(gamma(b)))}" r="9" style="fill:var(--text-main)"/>` + text(X(b) - 14, f(Y(gamma(b))) - 14, name, 'lbl mono strong halo', 'end')).join('') + text(300, 300, 'everyday speeds: γ = 1', 'lbl halo');
      return svg('60 20 780 500', s, 'A graph of the Lorentz factor gamma against speed as a fraction of the speed of light. Gamma stays very close to 1 up to about a third of the speed of light, is 1.25 at 0.6 c and 1.67 at 0.8 c, then climbs steeply and without limit as the speed approaches c');
    },

    // Two flashes sent from the middle of a carriage, seen in the carriage frame and in the platform frame.
    'a5-simultaneity': () => {
      const w = 260, c = 150, v = 60, T = 3.2;
      const row = (y, moving, title) => {
        const x0 = moving ? 330 : 430, tL = (w / 2) / (c + (moving ? v : 0)), tR = (w / 2) / (c - (moving ? v : 0)), end = Math.max(tL, tR), shift = t => (moving ? v * t : 0);
        const k = t => f(t / T * 1000) / 1000;
        const body = car(w, 110, moving ? 'brand-accent-strong' : 'hl') + `<line x1="0" y1="-110" x2="0" y2="-86" style="stroke:var(--text-main);stroke-width:5"/>`;
        const hit = (x, t) => `<circle cx="${f(x)}" cy="${y - 55}" r="20" style="fill:none;stroke:var(--brand-accent);stroke-width:5" opacity="0">${anim('opacity', [0, 0, 1, 1], T, { extra: `keyTimes="0;${k(t)};${k(t) + 0.01};1"` })}</circle>`;
        const still = at(x0 + shift(end), y, body) + flash(x0 - c * tL, y - 55) + flash(x0 + c * tR, y - 55);
        const mover = `<g>${track([[x0, y], [x0 + shift(end), y], [x0 + shift(end), y]], T, { extra: `keyTimes="0;${k(end)};1"` })}${body}</g>` + `<g>${track([[x0, y - 55], [x0 - c * tL, y - 55], [x0 - c * tL, y - 55]], T, { extra: `keyTimes="0;${k(tL)};1"` })}${flash(0, 0)}</g><g>${track([[x0, y - 55], [x0 + c * tR, y - 55], [x0 + c * tR, y - 55]], T, { extra: `keyTimes="0;${k(tR)};1"` })}${flash(0, 0)}</g>` + hit(x0 - c * tL, tL) + hit(x0 + c * tR, tR);
        return twoState(still, mover) + `<line x1="60" y1="${y + 20}" x2="820" y2="${y + 20}" class="tick"/>` + text(70, y - 130, title, 'lbl strong', 'start');
      };
      return svg('40 20 800 500', row(200, false, 'in the carriage frame: both ends at the same time') + row(450, true, 'in the platform frame: the back end first'), 'A lamp at the centre of a railway carriage sends a flash towards each end. In the frame of the carriage the two flashes reach the ends at the same time. In the frame of the platform the carriage is moving: the back wall moves to meet its flash and the front wall moves away from its flash, so the flash reaches the back first. Events that are simultaneous in one frame are not simultaneous in the other');
    },

    // A light clock at rest and the same clock moving: the moving light has further to go.
    'a5-light-clock': el => {
      const on = labelled(el), h = 160, top = 150, bot = top + h, T0 = 1, g = 1.25, c = 2 * h / T0, v = 0.6 * c, K = 1.2, xs = 120, xm = 300;
      const mirrors = `<line x1="-44" y1="${top}" x2="44" y2="${top}" style="stroke:var(--text-main);stroke-width:7;stroke-linecap:round"/><line x1="-44" y1="${bot}" x2="44" y2="${bot}" style="stroke:var(--text-main);stroke-width:7;stroke-linecap:round"/>`;
      // Each loop is two ticks of its own clock, so both pulses move at c and the moving clock takes γ times as long.
      const rest = [[xs, bot], [xs, top], [xs, bot], [xs, top], [xs, bot]], Tr = 2 * T0 * K, Tm = 2 * g * T0 * K;
      const half = g * T0 / 2, zig = [0, 1, 2, 3, 4].map(i => [xm + v * half * i, i % 2 ? top : bot]);
      let s = at(xs, 0, mirrors) + line(through(zig), 'brand-accent', 2, 'stroke-dasharray="8 7" opacity=".7"');
      if (on) s += text(xs, 100, 'at rest', 'lbl strong') + text(xm + 250, 100, 'moving at 0.6 c', 'lbl strong', 'middle', 'style="fill:var(--hl-text)"') + text(xs, bot + 60, 'one tick:', 'lbl') + text(xs, bot + 94, sub('Δt', '0'), 'lbl mono strong') + text(xm + 250, bot + 60, 'the light goes further at the same speed c:', 'lbl') + text(xm + 250, bot + 94, 'one tick takes γ ' + sub('Δt', '0'), 'lbl strong') + arrow(xm + 410, top - 30, xm + 490, top - 30, 'hl', 5);
      const still = flash(xs, top + 50) + at(zig[1][0] + 40, 0, mirrors) + flash(zig[1][0] + 40, top + 40);
      const mover = `<g>${track(rest, Tr)}${flash(0, 0)}</g><g>${track([[xm, 0], [zig[4][0], 0]], Tm)}${mirrors}</g><g>${track(zig, Tm)}${flash(0, 0)}</g>`;
      return svg(on ? '40 60 840 420' : '60 120 800 220', s + twoState(still, mover), 'Two identical light clocks, each a pulse of light bouncing between two mirrors. In the clock at rest the light goes straight up and down. In the clock moving sideways at 0.6 c, the light follows a longer zigzag path at the same speed c, so each tick takes longer: gamma times as long');
    },

    // Muons from the upper atmosphere, in the Earth frame and in the muon frame.
    'a5-muons': () => {
      const ground = (x, y) => `<line x1="${x - 150}" y1="${y}" x2="${x + 150}" y2="${y}" class="tick" style="stroke-width:5"/>`;
      const mountain = (x, y, hgt) => `<path d="M${x - 120},${y} L${x - 20},${y - hgt} L${x + 60},${y} Z" style="fill:color-mix(in srgb, var(--neutron) 30%, var(--viewer-bg));stroke:var(--text-secondary);stroke-width:3"/>`;
      const muon = (x, y) => `<circle cx="${x}" cy="${y}" r="13" style="fill:var(--hl)"/>` + text(x, y + 8, 'μ', 'lbl strong', 'middle', 'style="fill:#fff;font-size:22px"');
      let s = ground(230, 440) + mountain(230, 440, 300) + muon(310, 140) + arrow(310, 162, 310, 260, 'hl', 5) + both(380, 140, 380, 440) + text(396, 280, '1920 m', 'lbl mono', 'start') + text(396, 314, 'takes 6.4 μs', 'lbl mono', 'start') + text(230, 80, 'Earth frame', 'lbl strong') + text(230, 492, 'the muon’s clock runs slow:', 'lbl') + text(230, 526, 'it lives 22 μs', 'lbl strong');
      s += ground(680, 440) + mountain(680, 440, 30) + muon(760, 396) + arrow(680, 396, 680, 330, 'brand-accent', 5) + both(830, 410, 830, 440) + text(846, 420, '192 m', 'lbl mono', 'start') + text(846, 454, '0.64 μs', 'lbl mono', 'start') + text(680, 80, 'muon frame', 'lbl strong', 'middle', 'style="fill:var(--hl-text)"') + text(680, 492, 'the mountain is contracted:', 'lbl') + text(680, 526, 'it lives 2.2 μs', 'lbl strong') + `<line x1="480" y1="60" x2="480" y2="540" class="divider"/>`;
      return svg('40 40 940 510', s, 'Muons travelling down from the height of a mountain top to sea level at 0.995 c, seen in two frames. In the Earth frame the distance is 1920 metres and takes 6.4 microseconds, but the muon’s lifetime is stretched from 2.2 to 22 microseconds, so most survive. In the muon’s frame its lifetime is 2.2 microseconds, but the mountain is contracted to 192 metres and passes in 0.64 microseconds. Both frames agree that most muons reach the ground');
    },

    // Space–time diagrams. data-kind: basic, angle, axes, simultaneity or scale. Also drawn plain.
    'a5-st': el => {
      const on = labelled(el), kind = el.dataset.kind || 'basic', b = 0.6;
      let s = stAxes(on) + lightLine();
      if (on && kind !== 'scale') s += text(SX(4.9) + 8, SY(4.9) + 4, 'light', 'lbl small', 'start', 'style="fill:var(--brand-accent)"');
      if (kind === 'basic') {
        s += line(`M${SX(1.2)},${OY} V${SY(4.8)}`, 'brand-primary', 5) + line(`M${OX},${OY} L${SX(4.8 * b)},${SY(4.8)}`, 'hl', 5) + event(3.4, 2.2, on ? 'an event' : '');
        if (on) s += text(SX(1.2) + 12, SY(4.4), 'at rest', 'lbl strong halo', 'start', 'style="fill:var(--brand-primary)"') + text(SX(3.9 * b) + 14, SY(3.8), 'moving at 0.6 c', 'lbl strong halo', 'start', 'style="fill:var(--hl-text)"') + text(SX(2.6), OY + 80, 'a world line: the history of one object', 'lbl');
      } else if (kind === 'angle') {
        const th = Math.atan(b);
        s += line(`M${OX},${OY} L${SX(4.8 * b)},${SY(4.8)}`, 'hl', 5) + `<path d="M${OX},${SY(1.8)} A${1.8 * U},${1.8 * U} 0 0 1 ${f(OX + 1.8 * U * Math.sin(th))},${f(OY - 1.8 * U * Math.cos(th))}" class="guide accent"/>` + text(OX + 40, SY(2.1), 'θ', 'lbl greek', 'start') + `<path d="M${SX(4 * b)},${SY(4)} H${OX} " class="guide"/>` + both(OX, SY(4) - 22, SX(4 * b), SY(4) - 22) + text((OX + SX(4 * b)) / 2, SY(4) - 38, 'x = vt', 'lbl mono') + text(SX(3.4 * b) + 14, SY(3.3), 'world line', 'lbl strong halo', 'start', 'style="fill:var(--hl-text)"') + text(SX(3.3), SY(1.2), 'tan θ = v / c', 'lbl mono strong');
      } else {
        // The axes of the moving frame: ct′ along x = βct and x′ along ct = βx, each tilted towards the light line.
        s += arrow(OX, OY, SX(4.9 * b), SY(4.9), 'hl', 4) + arrow(OX, OY, SX(4.9), SY(4.9 * b), 'hl', 4);
        if (on) s += text(SX(4.9 * b) - 16, SY(4.9) + 24, 'ct′', 'lbl display italic', 'end', 'style="fill:var(--hl-text)"') + text(SX(4.9) + 10, SY(4.9 * b) + 10, 'x′', 'lbl display italic', 'start', 'style="fill:var(--hl-text)"');
        if (kind === 'simultaneity') {
          // Events A and B happen at the same ct. Lines parallel to x′ through each give their times in S′.
          const A = [1, 2.6], B = [3.6, 2.6], onPrime = ([x, t]) => { const tp = (t - b * x) / (1 - b * b); return [b * tp, tp]; };
          [A, B].forEach(P2 => { const [qx, qt] = onPrime(P2); s += line(`M${f(SX(P2[0]))},${f(SY(P2[1]))} L${f(SX(qx))},${f(SY(qt))}`, 'hl', 2.5, 'stroke-dasharray="8 7"') + `<circle cx="${f(SX(qx))}" cy="${f(SY(qt))}" r="6" style="fill:var(--hl)"/>`; });
          s += `<line x1="${OX}" y1="${SY(2.6)}" x2="${SX(4.4)}" y2="${SY(2.6)}" class="guide"/>` + event(...A, 'A', -14, -12) + event(...B, 'B');
          if (on) s += text(SX(2.6), OY + 80, 'same ct, different ct′: B happens first in S′', 'lbl');
        } else if (kind === 'scale') {
          // The curve (ct)² − x² = 1 marks one unit of time on every frame's time axis.
          const g = 1 / Math.sqrt(1 - b * b);
          s += line(sampled(u => { const x = -0.2 + 2.6 * u; return [SX(x), SY(Math.sqrt(1 + x * x))]; }, 60), 'brand-primary', 3) + line(sampled(u => { const t = -0.2 + 2.6 * u; return [SX(Math.sqrt(1 + t * t)), SY(t)]; }, 60), 'brand-primary', 3);
          s += `<circle cx="${OX}" cy="${SY(1)}" r="8" style="fill:var(--text-main)"/><circle cx="${f(SX(b * g))}" cy="${f(SY(g))}" r="8" style="fill:var(--hl)"/><circle cx="${SX(1)}" cy="${OY}" r="8" style="fill:var(--text-main)"/><circle cx="${f(SX(g))}" cy="${f(SY(b * g))}" r="8" style="fill:var(--hl)"/>`;
          if (on) s += text(OX - 14, SY(1) + 8, '1', 'lbl mono strong', 'end') + text(SX(1), OY + 36, '1', 'lbl mono strong') + text(f(SX(b * g)) - 14, f(SY(g)) - 10, '1′', 'lbl mono strong', 'end', 'style="fill:var(--hl-text)"') + text(f(SX(g)) + 12, f(SY(b * g)) + 26, '1′', 'lbl mono strong', 'start', 'style="fill:var(--hl-text)"') + text(SX(2.5), SY(0.95), 'curves of constant', 'lbl halo', 'start') + text(SX(2.5), SY(0.95) + 34, 'space–time interval', 'lbl strong halo', 'start');
        } else if (on) s += text(SX(2.6), OY + 80, 'both axes tilt towards the light line', 'lbl');
      }
      return svg(on ? '60 30 780 510' : '110 40 500 430', s, { basic: 'A space–time diagram: position x across and c t upwards. An object at rest has a vertical world line; an object moving at 0.6 c has a world line tilted towards the dashed line at 45 degrees along which light travels. A single dot is an event', angle: 'A space–time diagram with the world line of an object moving at constant velocity. The angle theta between the world line and the c t axis obeys tan theta equals v over c', axes: 'A space–time diagram showing the axes of a second frame moving at 0.6 c. Its c t prime axis is tilted away from the c t axis towards the light line, and its x prime axis is tilted up from the x axis towards the light line by the same angle', simultaneity: 'A space–time diagram with two events A and B at the same c t, so simultaneous in frame S. Lines through each event parallel to the x prime axis meet the c t prime axis at different points: in the moving frame B happens before A', scale: 'A space–time diagram with two curves of constant space–time interval. Where they cross the c t and c t prime axes they mark one unit of time in each frame, and where they cross the x and x prime axes one unit of length: the unit marks on the primed axes are further from the origin' }[kind]);
    }
  };
});
