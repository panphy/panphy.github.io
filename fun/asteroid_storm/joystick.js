// A pixel-art touch pad for narrow touch screens (see style.css). It works like dragging the
// ship: every finger movement on it is passed straight to onDrag in screen pixels, so the ship
// moves at once, and the finger may slide past the pad's edge. The knob follows the finger
// for feedback and springs back to the centre on release.
import { PAL } from './art.js?v=20261124-pilothole';

const SIZE = 48; // drawn at 48 x 48 pixels; the page scales it up
const C = SIZE / 2;
const TRAVEL = 13; // px the knob can move from the centre
const KNOB = 8; // knob radius

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
    // Ticks at the eight directions.
    ctx.fillStyle = active ? PAL.mint : '#3e7f63';
    for (let k = 0; k < 8; k += 1) {
      const a = (k / 8) * Math.PI * 2;
      for (const r of [17, 18]) ctx.fillRect(Math.round(C - 0.5 + Math.cos(a) * r), Math.round(C - 0.5 + Math.sin(a) * r), 1, 1);
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
    pointer = e.pointerId;
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

  return {
    reset() { pointer = null; kx = 0; ky = 0; draw(); },
  };
}
