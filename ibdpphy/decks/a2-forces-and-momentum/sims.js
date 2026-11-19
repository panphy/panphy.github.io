// Interactive figures for the A.2 deck, drawn over the flat pictures of ../assets/figures.js, which
// stay for print. Controls come from ../assets/sim-control.js.
//   data-fig="a2-galileo-ramps"  slide 7  a ball released at height h rolls down one ramp and up a
//                                         second whose angle the viewer sets; with no friction it
//                                         stops at height h, and on the flat it rolls on for ever;
//                                         angle control, Play/Pause and Reset buttons
import { control, playback, typeset, drawn } from '../assets/sim-control.js';

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
  const box = document.createElement('div');
  box.className = 'sim-rows';
  rows.forEach(row => box.appendChild(row));
  holder.append(svg, box);
  fig.querySelector('svg')?.classList.add('still');
  fig.appendChild(holder);
  typeset(box);
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

// ---- Slide 7: Galileo's ramps ----
function galileoRamps(fig) {
  const FLOOR = 330, TOP = 150, H = FLOOR - TOP;    // the floor, the top of the first ramp and its height (px)
  const A = [70, TOP], B = [200, FLOOR], C = [260, FLOOR];
  const G = 600;                                     // gravity along the track scale (px/s²)
  const R = 16;                                      // ball radius
  const VIEW = 900, FOLLOW = 640;                    // view width; the view follows the ball past here
  const FAR = 1e6;                                   // "for ever" along a flat track
  let angle = 30, s = 0, v = 0, playing = false, done = false;

  const buttons = playback({
    onToggle: on => { if (on && done) reset(); playing = on; },
    onReset: () => { playing = false; reset(); }
  });
  const rows = [
    control({ label: 'Angle', name: 'angle of the second ramp', min: 0, max: 60, step: 5, value: angle, format: x => `${x}°`, onChange: x => { angle = x; playing = false; buttons.set(false); build(); reset(); } }),
    buttons
  ];
  const svg = mount(fig, `0 60 ${VIEW} 330`, 'A ball released from height h rolls down a ramp and up a second ramp whose angle you set; with no friction it rises to the same height h, rolling further on a gentler ramp, and on a flat track it rolls on for ever', rows);
  fig.style.setProperty('--sim-label-w', '110px');
  fig.style.setProperty('--sim-value-w', '90px');

  // The track: three straight pieces, measured along their length.
  let pieces = [];
  const piece = (from, dir, length) => ({ from, dir, length, normal: [dir[1], -dir[0]] });
  function track() {
    const down = [B[0] - A[0], B[1] - A[1]], len = Math.hypot(...down);
    const t = angle * Math.PI / 180;
    pieces = [
      piece(A, [down[0] / len, down[1] / len], len),
      piece(B, [1, 0], C[0] - B[0]),
      piece(C, [Math.cos(t), -Math.sin(t)], angle ? (H + 50) / Math.sin(t) : FAR)
    ];
  }
  // Where the ball is at distance d along the track.
  function at(d) {
    for (const p of pieces) {
      if (d <= p.length || p === pieces[pieces.length - 1]) return { p, x: p.from[0] + p.dir[0] * d, y: p.from[1] + p.dir[1] * d };
      d -= p.length;
    }
  }
  // The ball's center starts at LEVEL and, with no friction, rises back to it on the second ramp.
  const LEVEL = TOP - R * (B[0] - A[0]) / Math.hypot(B[0] - A[0], B[1] - A[1]);
  const stopAt = () => {
    const t = angle * Math.PI / 180;
    return pieces[0].length + pieces[1].length + (FLOOR - R * Math.cos(t) - LEVEL) / Math.sin(t);
  };

  const world = document.createElementNS(NS, 'g');
  const fixed = document.createElementNS(NS, 'g');
  svg.append(world, fixed);
  fixed.innerHTML = P.text(16, LEVEL - 16, 'h', 'lbl display', 'start');

  function build() {
    track();
    const end = at(pieces[0].length + pieces[1].length + pieces[2].length);
    let html = `<line x1="-50" y1="${FLOOR}" x2="${FAR}" y2="${FLOOR}" class="tick"/>`;
    // Short marks under the floor show the view moving when it follows the ball.
    html += `<line x1="-50" y1="${FLOOR + 9}" x2="${FAR}" y2="${FLOOR + 9}" style="stroke:var(--text-secondary);stroke-width:14;stroke-dasharray:2.5 57.5;opacity:.45"/>`;
    html += `<line x1="-50" y1="${LEVEL.toFixed(1)}" x2="${FAR}" y2="${LEVEL.toFixed(1)}" class="guide accent"/>`;
    html += `<path d="M${A[0]},${A[1]} L${B[0]},${B[1]} H${C[0]}" class="curve" style="stroke:var(--text-main)"/>`;
    html += `<path d="M${C[0]},${C[1]} L${end.x.toFixed(1)},${end.y.toFixed(1)}" class="curve" style="stroke:var(--brand-primary)"/>`;
    if (angle) {
      const t = angle * Math.PI / 180, r = 78;
      html += `<path d="M${C[0] + r},${FLOOR} A${r},${r} 0 0 0 ${(C[0] + r * Math.cos(t)).toFixed(1)},${(FLOOR - r * Math.sin(t)).toFixed(1)}" class="guide"/>`;
      html += P.text(C[0] + (r + 26) * Math.cos(t / 2), FLOOR - (r + 26) * Math.sin(t / 2) + 9, 'θ', 'lbl');
    }
    html += `<g data-k="ball">${P.body(0, 0, R)}</g>`;
    world.innerHTML = html;
  }

  function draw() {
    const { p, x, y } = at(s);
    world.querySelector('[data-k="ball"]').setAttribute('transform', `translate(${(x + p.normal[0] * R).toFixed(1)} ${(y + p.normal[1] * R).toFixed(1)})`);
    world.setAttribute('transform', `translate(${(-Math.max(0, x - FOLLOW)).toFixed(1)} 0)`);
  }
  function reset() { s = 0; v = 0; done = false; draw(); }

  build();
  reset();
  run(fig, dt => {
    if (!playing) return;
    for (let i = 0; i < 8; i++) {
      v += G * at(s).p.dir[1] * dt / 8;          // the part of gravity along the track
      s += v * dt / 8;
      if (angle && at(s).p === pieces[2] && (v <= 0 || s >= stopAt())) {
        s = stopAt(); v = 0; done = true; playing = false; buttons.set(false); break;
      }
    }
    draw();
  });
}

const live = { 'a2-galileo-ramps': galileoRamps };
Object.entries(live).forEach(([name, make]) => {
  document.querySelectorAll(`#deck [data-fig="${name}"]`).forEach(fig => drawn(fig).then(() => {
    try { make(fig); } catch (error) { console.warn('The interactive figure could not be drawn; the flat picture stays.', error); }
  }));
});
