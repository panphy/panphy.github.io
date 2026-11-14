// Interactive figures for the E.1 deck, drawn over the flat pictures of ../assets/figures.js, which
// stay for print. Controls come from ../assets/sim-control.js.
//   data-fig="closest-approach"  slide 32  a head-on alpha particle slows as it nears a gold nucleus,
//                                          stops at the distance of closest approach and returns;
//                                          Play/Pause and Reset buttons
import { playback, drawn } from '../assets/sim-control.js';

const NS = 'http://www.w3.org/2000/svg';
let P = null;                // the drawing helpers of figures.js
window.DeckFigures.add(parts => { P = parts; return {}; });

// Puts a live drawing and its controls over a flat figure. Returns the drawing.
function mount(fig, viewBox, label, rows) {
  const holder = document.createElement('div');
  holder.className = 'mover sim-live';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', viewBox);
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', label);
  holder.append(svg, ...rows);
  fig.querySelector('svg')?.classList.add('still');
  fig.appendChild(holder);
  return svg;
}

// Calls step(dt) on every frame while the slide is shown.
function run(fig, step) {
  const slide = fig.closest('.slide');
  let last = 0;
  const frame = time => {
    requestAnimationFrame(frame);
    if (!slide.classList.contains('active') || document.hidden) { last = 0; return; }
    const dt = last ? Math.min(0.05, (time - last) / 1000) : 0;
    last = time;
    step(dt);
  };
  requestAnimationFrame(frame);
}

// ---- Slide 32: distance of closest approach ----
function closestApproach(fig) {
  const START = 90, TURN = 430, Y = 210, GAP = START - TURN;   // the alpha's start and turning point (x)
  const VMAX = 220, ARROW = 110;   // speed far away (px/s) and the length of its velocity arrow
  // Not to scale: the start stands for "far away". The fraction of the energy that is still kinetic,
  // with g the distance still to go to the turning point, as a fraction of the whole run. The
  // repulsion barely acts at first and stops the alpha quickly near the nucleus, as 1/r does.
  const C = 5;
  const kinetic = g => (C * g) / (1 - g + C * g);
  let x = START, dir = 1, playing = false;

  const buttons = playback({
    onToggle: on => { if (on && dir < 0 && x <= START) reset(); playing = on; },
    onReset: () => { playing = false; reset(); }
  });
  const svg = mount(fig, '0 80 860 320', 'An alpha particle heading straight for a gold nucleus slows, stops at the distance of closest approach, where all its kinetic energy has become electric potential energy, and returns', [buttons]);

  let s = `<line x1="70" y1="${Y}" x2="760" y2="${Y}" class="guide"/>`;
  s += P.ball(740, Y, 46, 'positive') + P.text(740, 118, 'gold nucleus', 'lbl strong') + P.text(740, 146, 'charge +79e', 'lbl mono small');
  s += P.text(150, 118, 'far away', 'lbl strong') + P.text(150, 148, 'all kinetic energy', 'lbl small') + P.text(90, 262, 'alpha, +2e', 'lbl mono small');
  s += `<circle cx="${TURN}" cy="${Y}" r="22" class="ghost" style="stroke:var(--alpha)"/>`;
  s += P.text(TURN, 118, 'closest approach', 'lbl strong') + P.text(TURN, 148, 'kinetic energy = 0', 'lbl small');
  s += `<line x1="${TURN}" y1="244" x2="${TURN}" y2="318" class="tick"/><line x1="740" y1="268" x2="740" y2="318" class="tick"/>`;
  s += P.arrow(445, 302, 728, 302, 'brand-accent', 3) + P.arrow(725, 302, 442, 302, 'brand-accent', 3);
  s += P.text(585, 346, 'distance of closest approach, r', 'lbl mono') + P.text(585, 376, 'all electric potential energy', 'lbl mono small');
  s += `<g data-k="v"></g><g data-k="alpha">${P.ball(0, 0, 16, 'alpha')}</g>`;
  svg.innerHTML = s;
  const alpha = svg.querySelector('[data-k="alpha"]'), velocity = svg.querySelector('[data-k="v"]');

  function draw() {
    alpha.setAttribute('transform', `translate(${x.toFixed(1)} ${Y})`);
    const len = ARROW * Math.sqrt(kinetic((x - TURN) / GAP));
    velocity.innerHTML = len > 10 ? P.arrow(x + dir * 26, Y, x + dir * (26 + len), Y, 'alpha', 4) : '';
  }
  function reset() { x = START; dir = 1; draw(); }

  reset();
  run(fig, dt => {
    if (!playing) return;
    // Small sub-steps; a floor on the speed carries the alpha through the turning point.
    for (let i = 0; i < 4; i++) {
      const v = VMAX * Math.max(0.06, Math.sqrt(kinetic((x - TURN) / GAP)));
      x += dir * v * dt / 4;
      if (dir > 0 && x >= TURN) { x = TURN; dir = -1; }
      if (dir < 0 && x <= START) { x = START; playing = false; buttons.set(false); break; }
    }
    draw();
  });
}

const live = { 'closest-approach': closestApproach };
Object.entries(live).forEach(([name, make]) => {
  document.querySelectorAll(`#deck [data-fig="${name}"]`).forEach(fig => drawn(fig).then(() => {
    try { make(fig); } catch (error) { console.warn('The interactive figure could not be drawn; the flat picture stays.', error); }
  }));
});
