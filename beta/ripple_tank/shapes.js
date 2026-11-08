// Barriers for the ripple tank's Diffraction tab: the demonstrations and the
// grid mask the wave solver reads. Lengths in cm, angles in degrees.
// A barrier is a straight wall with a center (x, y), an angle, a length and a width.
(function (root) {
  const TANK = 16;
  const HALF = TANK / 2;
  const DEG = Math.PI / 180;

  function makeBar(props) {
    return { x: 0, y: 0, angle: 0, length: 6, width: 0.5, ...props };
  }

  // Is (x, y) inside the barrier?
  function inside(s, x, y) {
    const c = Math.cos(s.angle * DEG);
    const n = Math.sin(s.angle * DEG);
    const dx = x - s.x;
    const dy = y - s.y;
    const u = dx * c + dy * n;
    const v = -dx * n + dy * c;
    return Math.abs(u) <= s.length / 2 && Math.abs(v) <= s.width / 2;
  }

  const reach = (s) => Math.hypot(s.length, s.width) / 2;

  // Grid mask for the solver, N×N RGBA bytes, red = barrier. Row j runs along
  // the tank's −y direction so that texture coordinates match the water mesh:
  // u = x/16 + 0.5, v = 0.5 − y/16.
  function buildMask(shapes, N, out = new Uint8Array(N * N * 4)) {
    out.fill(0);
    const cell = TANK / N;
    for (const s of shapes) {
      const r = reach(s) + cell;
      const i0 = Math.max(0, Math.floor((s.x - r + HALF) / cell));
      const i1 = Math.min(N - 1, Math.ceil((s.x + r + HALF) / cell));
      const j0 = Math.max(0, Math.floor((HALF - s.y - r) / cell));
      const j1 = Math.min(N - 1, Math.ceil((HALF - s.y + r) / cell));
      for (let j = j0; j <= j1; j++) {
        const y = HALF - (j + 0.5) * cell;
        for (let i = i0; i <= i1; i++) {
          const x = (i + 0.5) * cell - HALF;
          if (inside(s, x, y)) out[(j * N + i) * 4] = 255;
        }
      }
    }
    for (let k = 0; k < N * N; k++) out[k * 4 + 3] = 255;
    return out;
  }

  // Demonstrations: a wall across the middle of the tank, with straight waves from the left.
  function preset(name) {
    const wall = (y0, y1) => makeBar({ y: (y0 + y1) / 2, angle: 90, length: y1 - y0 });
    switch (name) {
      case 'double-slit': {
        const gap = 1.2;
        const sep = 5;
        const a = sep / 2 - gap / 2;
        const b = sep / 2 + gap / 2;
        return [wall(b, HALF + 0.5), wall(-a, a), wall(-HALF - 0.5, -b)];
      }
      case 'edge':
        return [wall(-HALF - 0.5, 0)];
      default: { // single slit
        const g = 2;
        return [wall(g / 2, HALF + 0.5), wall(-HALF - 0.5, -g / 2)];
      }
    }
  }

  const api = { TANK, inside, buildMask, preset };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.RippleShapes = api;
})(typeof window !== 'undefined' ? window : globalThis);
