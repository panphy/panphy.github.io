// PanPhyMech: custom shapes made by merging objects or cutting one out of others.
// A custom shape stores its outline as polygons with holes (local coordinates about
// its centroid). Box2D needs convex pieces, so outlines are triangulated with earcut
// and the triangles merged back into convex pieces of at most 8 corners
// (Hertel–Mehlhorn). Outline booleans use polygon-clipping.
(function (root) {
  const PPM = root.PPM = root.PPM || {};

  const MAX_PIECE_VERTICES = 8;
  const MIN_PIECE_AREA = 1e-6; // m²; slivers smaller than this are dropped
  const MIN_PART_AREA = 1e-4; // m²; disconnected crumbs smaller than this are dropped

  const earcutLib = () => root.earcut;
  const clipLib = () => root.polygonClipping;

  // ---------- Outlines ----------

  // Points round a circle: about 3 cm apart, between 24 and 64 of them.
  function circlePoints(r) {
    const n = Math.max(24, Math.min(64, Math.round((2 * Math.PI * r) / 0.03)));
    const out = [];
    for (let i = 0; i < n; i++) {
      const a = (2 * Math.PI * i) / n;
      out.push([r * Math.cos(a), r * Math.sin(a)]);
    }
    return out;
  }

  // The object's outline in local coordinates, as a multipolygon of [x, y] rings.
  function localOutline(b) {
    const S = PPM.scene;
    if (b.kind === 'custom') return b.paths;
    if (b.kind === 'ball') return [[circlePoints(b.r)]];
    return [[S.vertices(b).map((p) => [p.x, p.y])]];
  }

  function worldOutline(b, pose = b) {
    const c = Math.cos(pose.angle);
    const s = Math.sin(pose.angle);
    return localOutline(b).map((poly) => poly.map((ring) => ring.map(([x, y]) => [pose.x + c * x - s * y, pose.y + s * x + c * y])));
  }

  // ---------- Convex decomposition ----------

  const cache = new WeakMap();

  function ringArea(pts) {
    let s = 0;
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      const q = pts[(i + 1) % pts.length];
      s += p[0] * q[1] - q[0] * p[1];
    }
    return s / 2;
  }

  function isConvex(pts) {
    const n = pts.length;
    for (let i = 0; i < n; i++) {
      const a = pts[i];
      const b = pts[(i + 1) % n];
      const c = pts[(i + 2) % n];
      if ((b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]) < -1e-12) return false;
    }
    return true;
  }

  // One polygon (outer ring, then holes) → convex pieces as index lists into verts.
  function decomposePolygon(poly) {
    const verts = [];
    const holes = [];
    poly.forEach((ring, i) => {
      if (i > 0) holes.push(verts.length);
      ring.forEach((p) => verts.push(p));
    });
    const flat = [];
    verts.forEach((p) => flat.push(p[0], p[1]));
    const tri = earcutLib().default(flat, holes, 2);
    let pieces = [];
    for (let i = 0; i < tri.length; i += 3) {
      let t = [tri[i], tri[i + 1], tri[i + 2]];
      const area = ringArea(t.map((k) => verts[k]));
      if (Math.abs(area) < 1e-12) continue;
      if (area < 0) t = [t[0], t[2], t[1]];
      pieces.push(t);
    }
    // Merge neighbours across shared edges while the result stays convex and small enough.
    let merged = true;
    while (merged) {
      merged = false;
      const edges = new Map();
      pieces.forEach((p, pi) => p.forEach((v, k) => edges.set(v + ',' + p[(k + 1) % p.length], pi)));
      for (let pi = 0; pi < pieces.length && !merged; pi++) {
        const p = pieces[pi];
        for (let k = 0; k < p.length && !merged; k++) {
          const i = p[k];
          const j = p[(k + 1) % p.length];
          const qi = edges.get(j + ',' + i);
          if (qi === undefined || qi === pi) continue;
          const q = pieces[qi];
          if (p.length + q.length - 2 > MAX_PIECE_VERTICES) continue;
          // Walk p from j round to i, then q from i round to j (skipping the shared edge).
          const ring = [];
          for (let m = 0; m < p.length; m++) ring.push(p[(k + 1 + m) % p.length]);
          const qs = q.indexOf(i);
          for (let m = 1; m < q.length - 1; m++) ring.push(q[(qs + m) % q.length]);
          if (!isConvex(ring.map((v) => verts[v]))) continue;
          pieces[pi] = ring;
          pieces.splice(qi, 1);
          merged = true;
        }
      }
    }
    pieces = pieces.map((p) => p.map((v) => verts[v]));
    return pieces.filter((p) => Math.abs(ringArea(p)) >= MIN_PIECE_AREA);
  }

  // Convex pieces, area and centroid of a multipolygon of [x, y] rings.
  function decompose(paths) {
    if (cache.has(paths)) return cache.get(paths);
    const pieces = [];
    let area = 0;
    let cx = 0;
    let cy = 0;
    paths.forEach((poly) => {
      decomposePolygon(poly).forEach((piece) => {
        const a = ringArea(piece);
        // Centroid of a convex polygon by fanning triangles from its first corner.
        let px = 0; let py = 0;
        for (let i = 1; i < piece.length - 1; i++) {
          const t = ringArea([piece[0], piece[i], piece[i + 1]]);
          px += t * (piece[0][0] + piece[i][0] + piece[i + 1][0]) / 3;
          py += t * (piece[0][1] + piece[i][1] + piece[i + 1][1]) / 3;
        }
        cx += px; cy += py; area += a;
        pieces.push(piece);
      });
    });
    const out = { pieces, area, cx: area > 0 ? cx / area : 0, cy: area > 0 ? cy / area : 0 };
    cache.set(paths, out);
    return out;
  }

  // ---------- Building custom objects ----------

  // Drop closing points and crumbs from a polygon-clipping result.
  function clean(multi) {
    return multi.map((poly) => poly.map((ring) => {
      const r = ring.slice();
      const a = r[0];
      const z = r[r.length - 1];
      if (r.length > 1 && a[0] === z[0] && a[1] === z[1]) r.pop();
      return r;
    }).filter((ring) => ring.length >= 3))
      .filter((poly) => poly.length && Math.abs(ringArea(poly[0])) - poly.slice(1).reduce((s, h) => s + Math.abs(ringArea(h)), 0) >= MIN_PART_AREA);
  }

  // Turn a world-coordinate multipolygon into body fields: centroid position and local paths.
  function placeOutline(multi) {
    const d = decompose(multi);
    if (!(d.area > 0) || !d.pieces.length) return null;
    const paths = multi.map((poly) => poly.map((ring) => ring.map(([x, y]) => [x - d.cx, y - d.cy])));
    return { kind: 'custom', x: d.cx, y: d.cy, angle: 0, paths, area: d.area };
  }

  function union(bodies, poseOf) {
    const geoms = bodies.map((b) => worldOutline(b, poseOf ? poseOf(b) : b));
    return clean(clipLib().union(...geoms));
  }

  function difference(base, cutter, poseOf) {
    const g = (b) => worldOutline(b, poseOf ? poseOf(b) : b);
    return clean(clipLib().difference(g(base), g(cutter)));
  }

  function outlineArea(multi) {
    return multi.reduce((s, poly) => s + Math.abs(ringArea(poly[0])) - poly.slice(1).reduce((h, r) => h + Math.abs(ringArea(r)), 0), 0);
  }

  // Point in a multipolygon (even–odd over all rings).
  function inside(paths, x, y) {
    let inPoly = false;
    paths.forEach((poly) => poly.forEach((ring) => {
      for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        const [xi, yi] = ring[i];
        const [xj, yj] = ring[j];
        if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inPoly = !inPoly;
      }
    }));
    return inPoly;
  }

  function distanceToEdges(paths, x, y) {
    let best = Infinity;
    paths.forEach((poly) => poly.forEach((ring) => {
      for (let i = 0; i < ring.length; i++) {
        const a = ring[i];
        const b = ring[(i + 1) % ring.length];
        const dx = b[0] - a[0]; const dy = b[1] - a[1];
        const L2 = dx * dx + dy * dy;
        const t = L2 > 0 ? Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / L2)) : 0;
        best = Math.min(best, Math.hypot(x - (a[0] + t * dx), y - (a[1] + t * dy)));
      }
    }));
    return best;
  }

  function scalePaths(paths, k) {
    return paths.map((poly) => poly.map((ring) => ring.map(([x, y]) => [x * k, y * k])));
  }

  PPM.shapes = { circlePoints, localOutline, worldOutline, decompose, placeOutline, union, difference, outlineArea, inside, distanceToEdges, scalePaths, ringArea, MAX_PIECE_VERTICES };
})(typeof window !== 'undefined' ? window : globalThis);
