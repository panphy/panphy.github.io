// A pixel-art touch pad for narrow touch screens (see style.css). It works like dragging the
// ship: every finger movement on it is passed straight to onDrag in screen pixels, so the ship
// moves at once, and the finger may slide past the pad's edge. The knob follows the finger
// for feedback and springs back to the centre on release; between runs it nudges by itself.
import { PAL } from './art.js?v=20261127-pad';

const SIZE = 48; // drawn at 48 x 48 pixels; the page scales it up
const C = SIZE / 2;
const TRAVEL = 13; // px the knob can move from the centre
const KNOB = 8; // knob radius
// Between runs the knob nudges up, right, down and left in turn to show that it moves.
const NUDGE_PERIOD = 3.2; // s between nudges
const NUDGE_OUT = 0.25; // s to glide out
const NUDGE_HOLD = 0.3; // s held at the end
const NUDGE_BACK = 0.25; // s to spring back
const NUDGE_REACH = 9; // px
const NUDGE_DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]];
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

export function createJoystick(canvas, { onPress = () => {}, onDrag = () => {} } = {}) {
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext('2d');
  let pointer = null;
  let kx = 0; // knob offset in pixels
  let ky = 0;
  let startX = 0; // where the finger came down, and where it was last
  let startY = 0;
  let lastX = 0;
  let lastY = 0;
  let nudgeT = 0; // s into the current nudge cycle
  let nudgeN = 0; // which direction comes next

  // Pixel-perfect ring of the given radius; `dash` skips every other run of pixels.
  function ring(radius, color, dash = 0) {
    ctx.fillStyle = color;
    const steps = Math.ceil(radius * 8);
    let last = '';
    for (let k = 0; k < steps; k += 1) {
      const a = (k / steps) * Math.PI * 2;
      if (dash && Math.floor((k / steps) * radius * 2 * Math.PI / dash) % 2) continue;
      const x = Math.round(C - 0.5 + Math.cos(a) * radius);
      const y = Math.round(C - 0.5 + Math.sin(a) * radius);
      const key = `${x},${y}`;
      if (key === last) continue;
      last = key;
      ctx.fillRect(x, y, 1, 1);
    }
  }

  function disc(cx, cy, radius, shade) {
    for (let y = -radius - 1; y <= radius + 1; y += 1) {
      for (let x = -radius - 1; x <= radius + 1; x += 1) {
        const d = Math.hypot(x + 0.5, y + 0.5);
        if (d > radius + 0.5) continue;
        ctx.fillStyle = shade(x, y, d);
        ctx.fillRect(Math.round(cx) + x, Math.round(cy) + y, 1, 1);
      }
    }
  }

  function draw() {
    ctx.clearRect(0, 0, SIZE, SIZE);
    const active = pointer !== null;
    // Base plate with a dark rim.
    disc(C - 0.5, C - 0.5, 22, (x, y, d) => (d > 21 ? PAL.ink : d > 19.5 ? PAL.navy : '#121131'));
    ring(20, active ? PAL.glass : PAL.slate);
    ring(14, active ? '#2a6f8a' : PAL.navy, 2);
    // Chevrons at the four directions say "push this way".
    ctx.fillStyle = active ? PAL.mint : '#46a079';
    for (const [ax, sign] of [[0, -1], [1, 1], [0, 1], [1, -1]]) {
      // Rows from the tip inwards: [distance from the centre, perpendicular offsets].
      for (const [d, vs] of [[18, [-1, 0]], [17, [-2, 1]], [16, [-3, 2]]]) {
        const along = sign > 0 ? C + d : C - 1 - d;
        for (const v of vs) {
          if (ax) ctx.fillRect(along, C + v, 1, 1);
          else ctx.fillRect(C + v, along, 1, 1);
        }
      }
    }
    // Centre mark, under the knob when it rests.
    ctx.fillStyle = PAL.slate;
    ctx.fillRect(C - 3, C - 1, 5, 1);
    ctx.fillRect(C - 1, C - 3, 1, 5);
    // A short trail from the centre towards the knob while steering.
    if (active && Math.hypot(kx, ky) > 2) {
      ctx.fillStyle = PAL.amber;
      for (let s = 0.2; s < 0.9; s += 0.15) ctx.fillRect(Math.round(C - 0.5 + kx * s), Math.round(C - 0.5 + ky * s), 1, 1);
    }
    // The knob: shaded gold with an ink outline and a highlight, lit from the upper left.
    disc(C - 0.5 + kx, C - 0.5 + ky, KNOB, (x, y, d) => {
      if (d > KNOB - 0.6) return PAL.ink;
      const light = -(x + y) / (KNOB * 2) + (1 - d / KNOB) * 0.4;
      if (light > 0.55) return '#fff1c2';
      if (light > 0.15) return PAL.gold;
      if (light > -0.25) return PAL.amber;
      return '#b8641c';
    });
    ctx.fillStyle = PAL.white;
    ctx.fillRect(Math.round(C - 4 + kx), Math.round(C - 4 + ky), 2, 1);
    ctx.fillRect(Math.round(C - 4 + kx), Math.round(C - 3 + ky), 1, 1);
  }

  function follow(e) {
    onDrag(e.clientX - lastX, e.clientY - lastY);
    lastX = e.clientX;
    lastY = e.clientY;
    // The knob shows how far the finger has travelled since it came down, up to the rim.
    const rect = canvas.getBoundingClientRect();
    const scale = SIZE / rect.width;
    let dx = (e.clientX - startX) * scale;
    let dy = (e.clientY - startY) * scale;
    const d = Math.hypot(dx, dy);
    if (d > TRAVEL) { dx *= TRAVEL / d; dy *= TRAVEL / d; }
    kx = dx;
    ky = dy;
    draw();
  }

  function release(e) {
    if (pointer !== e.pointerId) return;
    pointer = null;
    kx = 0;
    ky = 0;
    draw();
  }

  canvas.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    if (pointer !== null) return; // one thumb steers; a second touch is ignored
    pointer = e.pointerId;
    kx = 0; // drop any nudge; the knob now follows the finger
    ky = 0;
    nudgeT = 0;
    try { canvas.setPointerCapture(e.pointerId); } catch {}
    startX = lastX = e.clientX;
    startY = lastY = e.clientY;
    onPress();
    draw();
  }, { passive: false });
  canvas.addEventListener('pointermove', (e) => {
    if (pointer !== e.pointerId) return;
    e.preventDefault();
    follow(e);
  }, { passive: false });
  canvas.addEventListener('pointerup', release);
  canvas.addEventListener('pointercancel', release);

  draw();

  // The knob's offset during a nudge, t seconds into the cycle.
  function nudgeOffset(t) {
    const ease = (u) => 1 - (1 - u) * (1 - u);
    let r = 0;
    if (t < NUDGE_OUT) r = ease(t / NUDGE_OUT);
    else if (t < NUDGE_OUT + NUDGE_HOLD) r = 1;
    else if (t < NUDGE_OUT + NUDGE_HOLD + NUDGE_BACK) r = 1 - ease((t - NUDGE_OUT - NUDGE_HOLD) / NUDGE_BACK);
    const [dx, dy] = NUDGE_DIRS[nudgeN % NUDGE_DIRS.length];
    return [Math.round(dx * r * NUDGE_REACH), Math.round(dy * r * NUDGE_REACH)];
  }

  return {
    // Called every frame; `idle` is true between runs, when the knob may nudge.
    tick(dt, idle) {
      if (pointer !== null) return;
      if (!idle || reduceMotion.matches || !canvas.offsetWidth) {
        nudgeT = 0;
        if (kx || ky) { kx = 0; ky = 0; draw(); }
        return;
      }
      nudgeT += dt;
      if (nudgeT >= NUDGE_PERIOD) { nudgeT -= NUDGE_PERIOD; nudgeN += 1; }
      const [nx, ny] = nudgeOffset(nudgeT);
      if (nx !== kx || ny !== ky) { kx = nx; ky = ny; draw(); }
    },
    reset() {
      if (pointer !== null) { try { canvas.releasePointerCapture(pointer); } catch {} }
      pointer = null; kx = 0; ky = 0; draw();
    },
  };
}
