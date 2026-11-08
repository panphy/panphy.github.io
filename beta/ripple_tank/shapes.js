// Barriers and shallow blocks for the ripple tank: geometry, outlines, presets
// and the grid mask the wave solver reads. Lengths in cm, angles in degrees.
// A shape has a kind, a center (x, y), an angle, a length and (for some kinds)
// a width, and acts either as a 'barrier' (waves reflect) or 'shallow' (waves slow down).
(function (root) {
  const TANK = 16;
  const HALF = TANK / 2;
  const DEG = Math.PI / 180;

  const KINDS = {
    bar: { label: 'Bar', length: 6, width: 0.5, lengthLabel: 'Length', widthLabel: 'Width' },
    semicircle: { label: 'Semicircle', length: 2.5, lengthLabel: 'Radius' },
    cylinder: { label: 'Cylinder', length: 1.5, lengthLabel: 'Radius' },
    convex: { label: 'Convex', length: 6, width: 2, lengthLabel: 'Length', widthLabel: 'Thickness' },
    concave: { label: 'Concave', length: 6, width: 2.4, lengthLabel: 'Length', widthLabel: 'Edge thickness' }
  };
  const CONCAVE_CENTER = 0.5; // thickness of a concave block at its middle

  let nextId = 1;
  function makeShape(kind, props = {}) {
    const k = KINDS[kind];
    return { id: nextId++, kind, role: 'barrier', x: 0, y: 0, angle: 0, length: k.length, width: k.width ?? 0, ...props };
  }

  // Point (x, y) in the shape's own frame: u along its angle, v across it.
  function toLocal(s, x, y) {
    const c = Math.cos(s.angle * DEG);
    const n = Math.sin(s.angle * DEG);
    const dx = x - s.x;
    const dy = y - s.y;
    return [dx * c + dy * n, -dx * n + dy * c];
  }

  // Radius of the arcs on a lens of chord `h` and sagitta `sag`.
  const arcRadius = (h, sag) => ((h / 2) ** 2 + sag * sag) / (2 * sag);

  // Is (x, y) inside the shape? `margin` (cm) widens it, for picking thin shapes.
  function inside(s, x, y, margin = 0) {
    const [u, v] = toLocal(s, x, y);
    switch (s.kind) {
      case 'bar':
        return Math.abs(u) <= s.length / 2 + margin && Math.abs(v) <= s.width / 2 + margin;
      case 'cylinder':
        return u * u + v * v <= (s.length + margin) ** 2;
      case 'semicircle': // flat side faces the shape's −u direction
        return u >= -margin && u * u + v * v <= (s.length + margin) ** 2;
      case 'convex': { // biconvex lens: chord along v, thickness along u
        const sag = s.width / 2;
        const R = arcRadius(s.length, sag);
        const d = R - sag;
        return Math.hypot(u - d, v) <= R + margin && Math.hypot(u + d, v) <= R + margin;
      }
      case 'concave': { // biconcave: a slab with a circular hollow in each face
        const sag = (s.width - CONCAVE_CENTER) / 2;
        if (Math.abs(u) > s.width / 2 + margin || Math.abs(v) > s.length / 2 + margin) return false;
        if (sag <= 0.01) return true;
        const R = arcRadius(s.length, sag);
        const cx = CONCAVE_CENTER / 2 + R;
        return Math.hypot(u - cx, v) >= R - margin && Math.hypot(u + cx, v) >= R - margin;
      }
      default:
        return false;
    }
  }

  // Largest distance from the center to any part of the shape.
  function reach(s) {
    if (s.kind === 'bar') return Math.hypot(s.length, s.width) / 2;
    if (s.kind === 'cylinder' || s.kind === 'semicircle') return s.length;
    return Math.hypot(s.length, s.width) / 2;
  }

  // Outline as tank points, for drawing.
  function outline(s) {
    const local = [];
    const arc = (cx, cy, r, a0, a1, n = 24) => {
      for (let i = 0; i <= n; i++) {
        const a = a0 + ((a1 - a0) * i) / n;
        local.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
      }
    };
    if (s.kind === 'bar') {
      const a = s.length / 2;
      const b = s.width / 2;
      local.push([-a, -b], [a, -b], [a, b], [-a, b], [-a, -b]);
    } else if (s.kind === 'cylinder') {
      arc(0, 0, s.length, 0, 2 * Math.PI, 48);
    } else if (s.kind === 'semicircle') {
      arc(0, 0, s.length, -Math.PI / 2, Math.PI / 2, 32);
      local.push([0, -s.length]);
    } else if (s.kind === 'convex') {
      const sag = s.width / 2;
      const R = arcRadius(s.length, sag);
      const d = R - sag;
      const half = Math.asin(Math.min(1, s.length / 2 / R));
      arc(-d, 0, R, -half, half); // right face, centered on the left
      arc(d, 0, R, Math.PI - half, Math.PI + half); // left face
      local.push(local[0]);
    } else if (s.kind === 'concave') {
      const w = s.width / 2;
      const h = s.length / 2;
      const sag = (s.width - CONCAVE_CENTER) / 2;
      if (sag <= 0.01) {
        local.push([-w, -h], [w, -h], [w, h], [-w, h], [-w, -h]);
      } else {
        const R = arcRadius(s.length, sag);
        const cx = CONCAVE_CENTER / 2 + R;
        const half = Math.asin(Math.min(1, h / R));
        local.push([-w, -h], [w, -h]);
        arc(cx, 0, R, Math.PI + half, Math.PI - half); // right hollow, from bottom to top
        local.push([w, h], [-w, h]);
        arc(-cx, 0, R, half, -half); // left hollow, from top to bottom
        local.push([-w, -h]);
      }
    }
    const c = Math.cos(s.angle * DEG);
    const n = Math.sin(s.angle * DEG);
    return local.map(([u, v]) => [s.x + u * c - v * n, s.y + u * n + v * c]);
  }

  // Which shape is at (x, y)? The last one added wins.
  function pick(shapes, x, y) {
    for (let i = shapes.length - 1; i >= 0; i--) {
      if (inside(shapes[i], x, y, 0.3)) return shapes[i];
    }
    return null;
  }

  // Grid mask for the solver, N×N RGBA bytes. Row j runs along the tank's −y
  // direction so that texture coordinates match the water mesh:
  // u = x/16 + 0.5, v = 0.5 − y/16. R = barrier, G = shallow water.
  function buildMask(shapes, N, out = new Uint8Array(N * N * 4)) {
    out.fill(0);
    const cell = TANK / N;
    for (const s of shapes) {
      const r = reach(s) + cell;
      const i0 = Math.max(0, Math.floor((s.x - r + HALF) / cell));
      const i1 = Math.min(N - 1, Math.ceil((s.x + r + HALF) / cell));
      const j0 = Math.max(0, Math.floor((HALF - s.y - r) / cell));
      const j1 = Math.min(N - 1, Math.ceil((HALF - s.y + r) / cell));
      const channel = s.role === 'barrier' ? 0 : 1;
      for (let j = j0; j <= j1; j++) {
        const y = HALF - (j + 0.5) * cell;
        for (let i = i0; i <= i1; i++) {
          const x = (i + 0.5) * cell - HALF;
          if (inside(s, x, y)) out[(j * N + i) * 4 + channel] = 255;
        }
      }
    }
    for (let k = 0; k < N * N; k++) {
      if (out[k * 4] === 255) out[k * 4 + 1] = 0; // barriers win over shallow water
      out[k * 4 + 3] = 255;
    }
    return out;
  }

  // Ready-made demonstrations. The straight waves start on the left.
  function preset(name) {
    const wall = (y0, y1, x = 0) => makeShape('bar', { x, y: (y0 + y1) / 2, angle: 90, length: y1 - y0, width: 0.5 });
    switch (name) {
      case 'single-slit': {
        const g = 2;
        return { source: 'straight', shapes: [wall(g / 2, HALF + 0.5), wall(-HALF - 0.5, -g / 2)] };
      }
      case 'double-slit': {
        const gap = 1.2;
        const sep = 5;
        const a = sep / 2 - gap / 2;
        const b = sep / 2 + gap / 2;
        return { source: 'straight', shapes: [wall(b, HALF + 0.5), wall(-a, a), wall(-HALF - 0.5, -b)] };
      }
      case 'concave-mirror':
        return { source: 'straight', waveform: 'pulse', shapes: [makeShape('concave', { x: 4.5, length: 9, width: 2.6 })] };
      case 'convex-lens':
        return { source: 'straight', shapes: [makeShape('convex', { role: 'shallow', x: -1.5, length: 9, width: 3 })] };
      case 'edge':
        return { source: 'straight', shapes: [wall(-HALF - 0.5, 0)] };
      default:
        return { source: 'straight', shapes: [] };
    }
  }

  const api = { TANK, KINDS, makeShape, inside, outline, pick, buildMask, preset, reach };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.RippleShapes = api;
})(typeof window !== 'undefined' ? window : globalThis);
