// PanPhyCircuits: per-view geometry.
// Positions, rotations and wire bends are stored separately for each view. Wire
// ends are always computed from the registry's terminal coordinates, transformed
// by the component's placement, so connections never depend on pixel proximity.
(function (root) {
  const PPC = root.PPC = root.PPC || {};
  const circuit = PPC.circuit || (typeof require === 'function' ? require('./circuit.js') : null);
  const artR = PPC.artRealistic || (typeof require === 'function' ? require('./art-realistic.js') : null);
  const artS = PPC.artSchematic || (typeof require === 'function' ? require('./art-schematic.js') : null);

  const GRID = 10;
  const VIEWS = ['realistic', 'schematic'];

  function artFor(view, type) {
    return (view === 'schematic' ? artS.art : artR.art)[type];
  }

  function snap(v, step = GRID) { return Math.round(v / step) * step; }

  // Rotation r counts clockwise quarter turns in half-quarter (45°) steps: 0, 0.5 … 3.5.
  // Exact [cos, sin] values keep the right angles exact and diagonal ties stable.
  const S = Math.SQRT1_2;
  const ROT = [[1, 0], [S, S], [0, 1], [-S, S], [-1, 0], [-S, -S], [0, -1], [S, -S]];
  function rotStep(r) { return ((Math.round((r || 0) * 2) % 8) + 8) % 8; }
  function cosSin(r) { return ROT[rotStep(r)]; }
  function normRot(r) { return rotStep(r) / 2; }
  // Nearest quarter turn (0–3), for placing labels and badges.
  function quarterTurn(r) { return Math.round(normRot(r)) & 3; }

  // Local -> world for a placement {x, y, r (quarter turns), f (mirror x)}.
  function xform(pl, x, y) {
    if (pl.f) x = -x;
    const [c, s] = cosSin(pl.r);
    return { x: pl.x + c * x - s * y, y: pl.y + s * x + c * y };
  }
  // World -> local, the inverse of xform.
  function toLocal(pl, x, y) {
    const [c, s] = cosSin(pl.r);
    const dx = x - pl.x, dy = y - pl.y;
    const X = c * dx + s * dy, Y = -s * dx + c * dy;
    return { x: pl.f ? -X : X, y: Y };
  }
  function xdir(pl, dx, dy) {
    const p = xform({ x: 0, y: 0, r: pl.r, f: pl.f }, dx, dy);
    return { x: p.x, y: p.y };
  }

  function placement(doc, view, id) {
    return doc.layouts[view].comps[id] || null;
  }

  function terminalsLocal(view, comp) {
    return artFor(view, comp.type).terms(comp.props);
  }

  // World position and outward direction of a terminal.
  function termWorld(doc, view, end) {
    const comp = circuit.getComp(doc, end.c);
    const pl = comp && placement(doc, view, end.c);
    if (!pl) return null;
    const t = terminalsLocal(view, comp)[end.t];
    if (!t) return null;
    const p = xform(pl, t[0], t[1]);
    const d = xdir(pl, t[2], t[3]);
    return { x: p.x, y: p.y, dx: d.x, dy: d.y };
  }

  function localBounds(view, comp) {
    return artFor(view, comp.type).bounds(comp.props);
  }

  function compBounds(doc, view, id) {
    const comp = circuit.getComp(doc, id);
    const pl = comp && placement(doc, view, id);
    if (!pl) return null;
    const [x, y, w, h] = localBounds(view, comp);
    const pts = [xform(pl, x, y), xform(pl, x + w, y), xform(pl, x, y + h), xform(pl, x + w, y + h)];
    // Upright pills do not rotate with the artwork's rectangular bounds.
    const art = artFor(view, comp.type);
    const act = art.actuator && art.actuator(comp.props, pl);
    if (act && act.upright) {
      const center = xform(pl, act.cx, act.cy);
      const [ax, ay, aw, ah] = act.rect;
      pts.push({ x: center.x + ax, y: center.y + ay }, { x: center.x + ax + aw, y: center.y + ay + ah });
    }
    const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y);
    return { x: Math.min(...xs), y: Math.min(...ys), x2: Math.max(...xs), y2: Math.max(...ys) };
  }

  function svgTransform(pl) {
    return `translate(${pl.x} ${pl.y}) rotate(${normRot(pl.r) * 90}) scale(${pl.f ? -1 : 1} 1)`;
  }

  // ---------- Wire routes ----------

  function wirePoints(doc, view, wire) {
    const lay = doc.layouts[view].wires[wire.id];
    return lay && lay.pts ? lay.pts : [];
  }

  const isH = (d) => d && Math.abs(d.x) > Math.abs(d.y);
  const isZero = (d) => !d || (Math.abs(d.x) < 1e-9 && Math.abs(d.y) < 1e-9);

  // A terminal of a part turned 45° points along a diagonal. Its wire first runs
  // a short way along that diagonal, to a grid point, then continues square to
  // the grid along whichever axis heads toward the far end.
  const ZERO = { x: 0, y: 0 };
  const isDiag = (d) => !!d && Math.abs(d.x) > 1e-6 && Math.abs(d.y) > 1e-6;
  function diagStub(p, d) {
    const sx = Math.sign(d.x), sy = Math.sign(d.y);
    const MIN = 8;
    // Shortest run of at least MIN that lands x on the grid.
    let k = (Math.ceil((p.x + sx * MIN) * sx / GRID - 1e-6) * GRID) * sx - p.x;
    k = Math.abs(k);
    return { x: p.x + sx * k, y: p.y + sy * k };
  }
  function stubAxis(d, from, to) {
    const dx = to.x - from.x, dy = to.y - from.y;
    const okX = Math.sign(d.x) * dx > 1e-6, okY = Math.sign(d.y) * dy > 1e-6;
    if (okX && (!okY || Math.abs(dx) >= Math.abs(dy))) return { x: Math.sign(d.x), y: 0 };
    if (okY) return { x: 0, y: Math.sign(d.y) };
    return ZERO;
  }
  // Calls route(p0, d0, p1, d1) between the ends of any diagonal stubs.
  function withDiagStubs(p0, d0, p1, d1, route, towards0, towards1) {
    const a = isDiag(d0) ? diagStub(p0, d0) : p0;
    const b = isDiag(d1) ? diagStub(p1, d1) : p1;
    const da = isDiag(d0) ? stubAxis(d0, a, towards0 || b) : d0;
    const db = isDiag(d1) ? stubAxis(d1, b, towards1 || a) : d1;
    const mid = route(a, da, b, db);
    return simplify((isDiag(d0) ? [{ x: p0.x, y: p0.y }] : []).concat(mid, isDiag(d1) ? [{ x: p1.x, y: p1.y }] : []));
  }

  // Orthogonal route through the control points. d0/d1 are the outward
  // directions of the terminals at each end.
  function orthoRoute(p0, d0, pts, p1, d1) {
    if (isDiag(d0) || isDiag(d1)) {
      const first = pts.length ? { x: pts[0][0], y: pts[0][1] } : null;
      const last = pts.length ? { x: pts[pts.length - 1][0], y: pts[pts.length - 1][1] } : null;
      return withDiagStubs(p0, d0, p1, d1, (a, da, b, db) => orthoRoute(a, da, pts, b, db), first, last);
    }
    const all = [p0].concat(pts.map(([x, y]) => ({ x, y })), [p1]);
    const out = [{ x: p0.x, y: p0.y }];
    const STUB = 10;
    for (let i = 0; i < all.length - 1; i++) {
      const a = out[out.length - 1], b = all[i + 1];
      const first = i === 0, last = i === all.length - 2;
      if (Math.abs(a.x - b.x) < 1e-6 || Math.abs(a.y - b.y) < 1e-6) { out.push({ x: b.x, y: b.y }); continue; }
      let h0;
      if (first && !isZero(d0)) h0 = isH(d0);
      else if (!first) { const pa = out[out.length - 2]; h0 = !(Math.abs(pa.y - a.y) < 1e-6); }
      else h0 = last && !isZero(d1) ? isH(d1) : Math.abs(b.x - a.x) >= Math.abs(b.y - a.y);
      const h1 = last && !isZero(d1) ? isH(d1) : null;
      if (last && h1 !== null && h0 === h1) {
        if (h0) {
          // Leave horizontally, cross over, arrive horizontally.
          let mx = snap((a.x + b.x) / 2);
          if (first && d0.x * (mx - a.x) < 0) mx = a.x + Math.sign(d0.x) * STUB;
          if (d1.x * (mx - b.x) < 0) mx = b.x + Math.sign(d1.x) * STUB;
          out.push({ x: mx, y: a.y }, { x: mx, y: b.y }, { x: b.x, y: b.y });
        } else {
          let my = snap((a.y + b.y) / 2);
          if (first && d0.y * (my - a.y) < 0) my = a.y + Math.sign(d0.y) * STUB;
          if (d1.y * (my - b.y) < 0) my = b.y + Math.sign(d1.y) * STUB;
          out.push({ x: a.x, y: my }, { x: b.x, y: my }, { x: b.x, y: b.y });
        }
        continue;
      }
      if (last && h1 !== null) {
        // Arrive along the terminal's own direction.
        out.push(h1 ? { x: a.x, y: b.y } : { x: b.x, y: a.y }, { x: b.x, y: b.y });
        continue;
      }
      out.push(h0 ? { x: b.x, y: a.y } : { x: a.x, y: b.y }, { x: b.x, y: b.y });
    }
    return simplify(out);
  }

  function simplify(pts) {
    const out = [];
    for (const p of pts) {
      const q = out[out.length - 1];
      if (q && Math.abs(q.x - p.x) < 1e-6 && Math.abs(q.y - p.y) < 1e-6) continue;
      if (out.length >= 2) {
        const o = out[out.length - 2];
        const col = (Math.abs(o.x - q.x) < 1e-6 && Math.abs(q.x - p.x) < 1e-6) || (Math.abs(o.y - q.y) < 1e-6 && Math.abs(q.y - p.y) < 1e-6);
        // Keep reversals: collapsing them hides a wire doubling back over a lead.
        if (col && (q.x - o.x) * (p.x - q.x) + (q.y - o.y) * (p.y - q.y) >= 0) { out[out.length - 1] = { x: p.x, y: p.y }; continue; }
      }
      out.push({ x: p.x, y: p.y });
    }
    return out;
  }

  // Smooth route for the realistic view: cubic Bézier segments through the
  // control points, leaving and entering terminals along their directions.
  function smoothRoute(p0, d0, pts, p1, d1) {
    const all = [p0].concat(pts.map(([x, y]) => ({ x, y })), [p1]);
    const segs = [];
    const dist = (a, b) => Math.hypot(b.x - a.x, b.y - a.y);
    const tangent = (i) => {
      if (i === 0) return isZero(d0) ? unit(all[1].x - all[0].x, all[1].y - all[0].y) : d0;
      if (i === all.length - 1) return isZero(d1) ? unit(all[i].x - all[i - 1].x, all[i].y - all[i - 1].y) : { x: -d1.x, y: -d1.y };
      return unit(all[i + 1].x - all[i - 1].x, all[i + 1].y - all[i - 1].y);
    };
    for (let i = 0; i < all.length - 1; i++) {
      const a = all[i], b = all[i + 1];
      const L = dist(a, b);
      const k = Math.min(110, Math.max(12, L * 0.4));
      const ta = tangent(i), tb = tangent(i + 1);
      segs.push([a, { x: a.x + ta.x * k, y: a.y + ta.y * k }, { x: b.x - tb.x * k, y: b.y - tb.y * k }, b]);
    }
    return segs;
  }
  function unit(x, y) { const L = Math.hypot(x, y) || 1; return { x: x / L, y: y / L }; }

  function bez(seg, t) {
    const [a, b, c, d] = seg, u = 1 - t;
    return {
      x: u * u * u * a.x + 3 * u * u * t * b.x + 3 * u * t * t * c.x + t * t * t * d.x,
      y: u * u * u * a.y + 3 * u * u * t * b.y + 3 * u * t * t * c.y + t * t * t * d.y
    };
  }

  // ---------- Automatic orthogonal routing (circuit diagram) ----------
  // Wires without user bends are routed by scoring candidate paths: crossing a
  // component body or running along another wire is heavily penalized (either
  // would make the diagram ambiguous), then bends and length are minimized.

  function obstacleRects(doc, view) {
    const out = [];
    for (const c of doc.components) {
      const b = compBounds(doc, view, c.id);
      if (!b) continue;
      if (c.type !== 'junction') out.push({ id: c.id, x: b.x + 3, y: b.y + 3, x2: b.x2 - 3, y2: b.y2 - 3 });
      // Reserve every terminal, including unconnected ones and junctions. An
      // earlier wire must not occupy a later wire's unavoidable endpoint.
      for (const t of Object.keys(terminalsLocal(view, c))) {
        const p = termWorld(doc, view, { c: c.id, t });
        out.push({ terminal: p, x: p.x - 4, y: p.y - 4, x2: p.x + 4, y2: p.y + 4 });
      }
    }
    return out;
  }

  function segHitsRect(a, b, r) {
    const x1 = Math.min(a.x, b.x), x2 = Math.max(a.x, b.x), y1 = Math.min(a.y, b.y), y2 = Math.max(a.y, b.y);
    return x1 < r.x2 && x2 > r.x && y1 < r.y2 && y2 > r.y;
  }

  function overlapLen(a, b, c, d) {
    const h1 = Math.abs(a.y - b.y) < 1e-6, h2 = Math.abs(c.y - d.y) < 1e-6;
    const v1 = Math.abs(a.x - b.x) < 1e-6, v2 = Math.abs(c.x - d.x) < 1e-6;
    if (h1 && h2 && Math.abs(a.y - c.y) < 1e-6) return Math.max(0, Math.min(Math.max(a.x, b.x), Math.max(c.x, d.x)) - Math.max(Math.min(a.x, b.x), Math.min(c.x, d.x)));
    if (v1 && v2 && Math.abs(a.x - c.x) < 1e-6) return Math.max(0, Math.min(Math.max(a.y, b.y), Math.max(c.y, d.y)) - Math.max(Math.min(a.y, b.y), Math.min(c.y, d.y)));
    return 0;
  }

  function samePoint(a, b) { return Math.hypot(a.x - b.x, a.y - b.y) < 1e-6; }

  function onSegment(p, a, b) {
    const dx = b.x - a.x, dy = b.y - a.y, len2 = dx * dx + dy * dy;
    if (len2 < 1e-12) return samePoint(p, a);
    const t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2;
    return t >= -1e-9 && t <= 1 + 1e-9 && Math.abs((p.x - a.x) * dy - (p.y - a.y) * dx) < 1e-6;
  }

  // Interior crossings can use a hop. A corner or end touching another line
  // looks like a junction, so only an explicitly shared terminal may do that.
  function touchesWire(a, b, s) {
    const allowed = (p) => (s.shared || []).some((q) => samePoint(p, q));
    return [a, b].some((p) => onSegment(p, s.a, s.b) && !allowed(p)) ||
      [s.a, s.b].some((p) => onSegment(p, a, b) && !allowed(p));
  }

  // Invalid geometry must outweigh cosmetic gains in length or bend count.
  // Also check explicit bends: moving a part can turn a previously good route
  // into a return loop, a wire through a symbol, or an apparent short circuit.
  function routeConflicts(poly, dA, dB, obstacles, avoid) {
    let conflicts = 0;
    const outward = (a, b, d) => isZero(d) || (b.x - a.x) * d.x + (b.y - a.y) * d.y > 1e-6;
    if (poly.length < 2) return 1;
    if (!outward(poly[0], poly[1], dA)) conflicts++;
    if (!outward(poly[poly.length - 1], poly[poly.length - 2], dB)) conflicts++;
    for (let i = 0; i < poly.length - 1; i++) {
      const a = poly[i], b = poly[i + 1];
      for (const r of obstacles) {
        // Rotated artwork has rectangular world bounds. Its outward diagonal
        // stub may start inside that box even though it is outside the symbol.
        const inside = (p) => p.x >= r.x && p.x <= r.x2 && p.y >= r.y && p.y <= r.y2;
        const diagonalStub = isDiag({ x: b.x - a.x, y: b.y - a.y }) &&
          ((i === 0 && isDiag(dA) && inside(a) && outward(a, b, dA)) ||
           (i === poly.length - 2 && isDiag(dB) && inside(b) && outward(b, a, dB)));
        if (!diagonalStub && segHitsRect(a, b, r)) conflicts++;
      }
      for (const s of avoid) if (overlapLen(a, b, s.a, s.b) > 1 || touchesWire(a, b, s)) conflicts++;
      for (let j = 0; j < i; j++) if (overlapLen(a, b, poly[j], poly[j + 1]) > 1) conflicts++;
    }
    return conflicts;
  }

  function obstaclesForEnds(obstacles, A, B) {
    return obstacles.filter((r) => !r.terminal || (!samePoint(r.terminal, A) && !samePoint(r.terminal, B)));
  }

  function routeCost(poly, A, dA, B, dB, obstacles, avoid) {
    let cost = 1000000 * routeConflicts(poly, dA, dB, obstacles, avoid);
    for (let i = 0; i < poly.length - 1; i++) {
      const a = poly[i], b = poly[i + 1];
      const L = Math.abs(b.x - a.x) + Math.abs(b.y - a.y);
      cost += L;
      if (Math.abs(a.x - b.x) > 1e-6 && Math.abs(a.y - b.y) > 1e-6) cost += 5000;
      for (const r of obstacles) if (segHitsRect(a, b, r)) cost += 1000;
      for (const s of avoid) { const o = overlapLen(a, b, s.a, s.b); if (o > 1) cost += 300 + o * 4; }
    }
    cost += 25 * Math.max(0, poly.length - 2);
    // Leaving or entering a terminal against its lead direction looks wrong.
    const first = poly.length > 1 ? unit(poly[1].x - poly[0].x, poly[1].y - poly[0].y) : null;
    const last = poly.length > 1 ? unit(poly[poly.length - 2].x - B.x, poly[poly.length - 2].y - B.y) : null;
    if (first && !isZero(dA) && first.x * dA.x + first.y * dA.y < 0.5) cost += 220;
    if (last && !isZero(dB) && last.x * dB.x + last.y * dB.y < 0.5) cost += 220;
    return cost;
  }

  function autoOrtho(A, dA, B, dB, obstacles, avoid) {
    obstacles = obstaclesForEnds(obstacles, A, B);
    if (isDiag(dA) || isDiag(dB)) return withDiagStubs(A, dA, B, dB, (a, da, b, db) => autoOrtho(a, da, b, db, obstacles, avoid));
    const S = GRID;
    const a1 = isZero(dA) ? { x: A.x, y: A.y } : { x: A.x + dA.x * S, y: A.y + dA.y * S };
    const b1 = isZero(dB) ? { x: B.x, y: B.y } : { x: B.x + dB.x * S, y: B.y + dB.y * S };
    const xs = new Set([snap((a1.x + b1.x) / 2), a1.x, b1.x]);
    const ys = new Set([snap((a1.y + b1.y) / 2), a1.y, b1.y]);
    const box = { x: Math.min(A.x, B.x) - 120, y: Math.min(A.y, B.y) - 120, x2: Math.max(A.x, B.x) + 120, y2: Math.max(A.y, B.y) + 120 };
    for (const r of obstacles) {
      if (!overlaps(r, box, 0)) continue;
      xs.add(snap(r.x - 17)); xs.add(snap(r.x2 + 17)); ys.add(snap(r.y - 17)); ys.add(snap(r.y2 + 17));
    }
    for (const s of avoid) {
      const r = polyBox([s.a, s.b]);
      if (!overlaps(r, box, GRID)) continue;
      for (const p of [s.a, s.b]) {
        xs.add(snap(p.x - GRID)); xs.add(snap(p.x + GRID));
        ys.add(snap(p.y - GRID)); ys.add(snap(p.y + GRID));
      }
    }
    const P = (x, y) => ({ x, y });
    const cands = [
      orthoRoute(A, dA, [], B, dB),
      [A, a1, P(a1.x, b1.y), b1, B],
      [A, a1, P(b1.x, a1.y), b1, B]
    ];
    for (const mx of xs) cands.push([A, a1, P(mx, a1.y), P(mx, b1.y), b1, B]);
    for (const my of ys) cands.push([A, a1, P(a1.x, my), P(b1.x, my), b1, B]);
    for (const mx of xs) for (const my of ys) {
      cands.push([A, a1, P(a1.x, my), P(mx, my), P(mx, b1.y), b1, B]);
      cands.push([A, a1, P(mx, a1.y), P(mx, my), P(b1.x, my), b1, B]);
    }
    let best = null, bestCost = Infinity;
    for (const c of cands) {
      const poly = simplify(c);
      const cost = routeCost(poly, A, dA, B, dB, obstacles, avoid);
      if (cost < bestCost - 1e-9) { bestCost = cost; best = poly; }
    }
    return best;
  }

  // Routes for every wire in a view, computed in order so later wires avoid
  // running along earlier ones. Used for drawing, hit-testing and splitting.
  function routeAll(doc, view) {
    const out = new Map();
    const obstacles = view === 'schematic' ? obstacleRects(doc, view) : null;
    const avoid = [];
    for (const w of doc.wires) {
      const sameEnd = (a, b) => a && b && a.c === b.c && a.t === b.t;
      const wireAvoid = avoid.map((s) => ({ ...s, shared: [
        sameEnd(s.start, w.a) || sameEnd(s.start, w.b) ? s.a : null,
        sameEnd(s.end, w.a) || sameEnd(s.end, w.b) ? s.b : null
      ].filter(Boolean) }));
      const r = wireRoute(doc, view, w, null, { obstacles, avoid: wireAvoid });
      if (!r) continue;
      out.set(w.id, r);
      if (view === 'schematic') for (let i = 0; i < r.poly.length - 1; i++) avoid.push({ a: r.poly[i], b: r.poly[i + 1], start: i === 0 ? w.a : null, end: i === r.poly.length - 2 ? w.b : null });
    }
    return out;
  }

  // Dots describe actual terminal connections, never incidental wire contact.
  function branchPoints(doc, routes) {
    const ends = new Map();
    const add = (end, terminal, neighbor) => {
      const key = `${end.c}:${end.t}`;
      if (!ends.has(key)) ends.set(key, { p: terminal, dirs: new Set() });
      const entry = ends.get(key);
      const direction = (dx, dy) => `${Math.round(((Math.atan2(dy, dx) + 2 * Math.PI) % (2 * Math.PI)) * 1e6)}`;
      if (!samePoint(terminal, neighbor)) entry.dirs.add(direction(neighbor.x - terminal.x, neighbor.y - terminal.y));
      if (Math.hypot(terminal.dx, terminal.dy) > 0.5) entry.dirs.add(direction(-terminal.dx, -terminal.dy));
    };
    for (const w of doc.wires) {
      const r = routes.get(w.id);
      if (!r || r.poly.length < 2) continue;
      add(w.a, r.a, r.poly[1]);
      add(w.b, r.b, r.poly[r.poly.length - 2]);
    }
    return [...ends.values()].filter((e) => e.dirs.size >= 3).map((e) => ({ x: e.p.x, y: e.p.y }));
  }

  // Route of a wire in a view: { d (SVG path), poly (sampled points), segIndex (per poly point: control interval) }.
  function wireRoute(doc, view, wire, override, ctx) {
    const A = override && override.a ? override.a : termWorld(doc, view, wire.a);
    const B = override && override.b ? override.b : termWorld(doc, view, wire.b);
    if (!A || !B) return null;
    let pts = override && override.pts ? override.pts : wirePoints(doc, view, wire);
    const d0 = { x: A.dx, y: A.dy }, d1 = { x: B.dx, y: B.dy };
    if (view === 'schematic') {
      const obstacles = obstaclesForEnds((ctx && ctx.obstacles) || obstacleRects(doc, view), A, B);
      const avoid = (ctx && ctx.avoid) || [];
      let poly = orthoRoute(A, d0, pts, B, d1);
      if (!override && (!pts.length || routeConflicts(poly, d0, d1, obstacles, avoid))) {
        poly = autoOrtho(A, d0, B, d1, obstacles, avoid);
        // Expose the effective route to hit-testing, splitting and bend handles.
        // Keep saved bends intact so moving back (or Undo) restores their shape.
        pts = [];
      }
      return { poly, d: 'M ' + poly.map((p) => `${r2(p.x)} ${r2(p.y)}`).join(' L '), a: A, b: B, pts };
    }
    const segs = smoothRoute(A, d0, pts, B, d1);
    const poly = [];
    const segIndex = [];
    segs.forEach((s, i) => {
      for (let k = i === 0 ? 0 : 1; k <= 16; k++) { poly.push(bez(s, k / 16)); segIndex.push(i); }
    });
    const d = 'M ' + r2(segs[0][0].x) + ' ' + r2(segs[0][0].y) + segs.map((s) => ` C ${r2(s[1].x)} ${r2(s[1].y)} ${r2(s[2].x)} ${r2(s[2].y)} ${r2(s[3].x)} ${r2(s[3].y)}`).join('');
    return { poly, d, segIndex, a: A, b: B, pts };
  }
  function r2(v) { return Math.round(v * 100) / 100; }

  // Nearest point on a polyline: { x, y, dist, index (segment), along (arc length), total }.
  function nearestOnPoly(poly, p) {
    let best = { dist: Infinity };
    let acc = 0, total = 0;
    for (let i = 0; i < poly.length - 1; i++) total += Math.hypot(poly[i + 1].x - poly[i].x, poly[i + 1].y - poly[i].y);
    for (let i = 0; i < poly.length - 1; i++) {
      const a = poly[i], b = poly[i + 1];
      const L2 = (b.x - a.x) ** 2 + (b.y - a.y) ** 2;
      let t = L2 ? ((p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y)) / L2 : 0;
      t = Math.max(0, Math.min(1, t));
      const q = { x: a.x + t * (b.x - a.x), y: a.y + t * (b.y - a.y) };
      const d = Math.hypot(q.x - p.x, q.y - p.y);
      const L = Math.sqrt(L2);
      if (d < best.dist) best = { x: q.x, y: q.y, dist: d, index: i, along: acc + t * L, total };
      acc += L;
    }
    return best;
  }

  function pointAtFraction(poly, frac) {
    let total = 0;
    for (let i = 0; i < poly.length - 1; i++) total += Math.hypot(poly[i + 1].x - poly[i].x, poly[i + 1].y - poly[i].y);
    let target = total * frac, acc = 0;
    for (let i = 0; i < poly.length - 1; i++) {
      const L = Math.hypot(poly[i + 1].x - poly[i].x, poly[i + 1].y - poly[i].y);
      if (acc + L >= target || i === poly.length - 2) {
        const t = L ? Math.min(1, (target - acc) / L) : 0;
        return { x: poly[i].x + t * (poly[i + 1].x - poly[i].x), y: poly[i].y + t * (poly[i + 1].y - poly[i].y), index: i };
      }
      acc += L;
    }
    return { x: poly[0].x, y: poly[0].y, index: 0 };
  }

  // Which control interval (between waypoints) a point on the route lies in.
  function controlInterval(doc, view, wire, route, at) {
    const pts = route.pts;
    if (!pts.length) return 0;
    if (view !== 'schematic') return route.segIndex[Math.min(at.index, route.segIndex.length - 1)];
    // Schematic: find the interval whose sub-route passes nearest the point.
    const ctrl = [route.a].concat(pts.map(([x, y]) => ({ x, y })), [route.b]);
    let best = 0, bestD = Infinity;
    for (let i = 0; i < ctrl.length - 1; i++) {
      const sub = orthoRoute(ctrl[i], i === 0 ? { x: route.a.dx, y: route.a.dy } : { x: 0, y: 0 }, [], ctrl[i + 1], i === ctrl.length - 2 ? { x: route.b.dx, y: route.b.dy } : { x: 0, y: 0 });
      const d = nearestOnPoly(sub, at).dist;
      if (d < bestD) { bestD = d; best = i; }
    }
    return best;
  }

  // Split a wire at a point (world, in `view`) with a new junction. Updates both
  // views and returns the junction id.
  function splitWire(doc, wireId, view, point) {
    const wire = circuit.getWire(doc, wireId);
    if (!wire) return null;
    const routes = {};
    for (const v of VIEWS) if (doc.layouts[v].ready === true || v === view) routes[v] = routeAll(doc, v).get(wire.id);
    const route = routes[view];
    const at = nearestOnPoly(route.poly, point);
    const frac = at.total ? at.along / at.total : 0.5;
    const j = circuit.addComponent(doc, 'junction');
    for (const v of VIEWS) {
      const r = routes[v];
      if (!r) continue;
      let pos, interval;
      if (v === view) {
        pos = { x: point.x, y: point.y };
        if (v === 'schematic') pos = { x: snap(at.x), y: snap(at.y) };
        interval = controlInterval(doc, v, wire, r, at);
      } else {
        const q = pointAtFraction(r.poly, frac);
        pos = v === 'schematic' ? { x: snap(q.x), y: snap(q.y) } : { x: q.x, y: q.y };
        interval = controlInterval(doc, v, wire, r, q);
      }
      doc.layouts[v].comps[j.id] = { x: pos.x, y: pos.y, r: 0, f: false };
      r.split = { before: r.pts.slice(0, interval), after: r.pts.slice(interval) };
    }
    // Add the new wires before removing the old one, so the junction is never empty.
    const w1 = circuit.addWire(doc, wire.a, { c: j.id, t: 'j' }, { color: wire.color }).wire;
    const w2 = circuit.addWire(doc, { c: j.id, t: 'j' }, wire.b, { color: wire.color }).wire;
    circuit.removeWires(doc, [wireId]);
    for (const v of VIEWS) {
      const r = routes[v];
      if (!r) continue;
      if (!doc.layouts[v].comps[j.id]) continue;
      doc.layouts[v].wires[w1.id] = { pts: r.split.before.map((p) => p.slice()) };
      doc.layouts[v].wires[w2.id] = { pts: r.split.after.map((p) => p.slice()) };
    }
    return { junction: j.id, wires: [w1.id, w2.id] };
  }

  // ---------- Layout generation and synchronization ----------

  function sizeOf(view, comp) {
    const [, , w, h] = localBounds(view, comp);
    return Math.hypot(w, h);
  }

  function overlaps(a, b, margin) {
    return a.x < b.x2 + margin && b.x < a.x2 + margin && a.y < b.y2 + margin && b.y < a.y2 + margin;
  }

  // Generate a layout for `target` from `source`, scaling positions so the
  // spacing suits the target artwork, then pushing apart any overlaps.
  function generateLayout(doc, target, source) {
    const src = doc.layouts[source], dst = doc.layouts[target];
    const comps = doc.components;
    const placed = comps.filter((c) => src.comps[c.id]);
    let ratio = 1;
    const real = placed.filter((c) => c.type !== 'junction');
    if (real.length) {
      const st = real.reduce((s, c) => s + sizeOf(target, c), 0), ss = real.reduce((s, c) => s + sizeOf(source, c), 0);
      ratio = ss ? Math.min(2.5, Math.max(0.4, st / ss)) : 1;
    }
    dst.comps = {};
    for (const c of placed) {
      const e = src.comps[c.id];
      dst.comps[c.id] = { x: snap(e.x * ratio), y: snap(e.y * ratio), r: e.r, f: e.f };
    }
    // Anything without a source position goes in a row below.
    let maxY = 0, x = 0;
    for (const c of placed) { const b = compBounds(doc, target, c.id); if (b) maxY = Math.max(maxY, b.y2); }
    for (const c of comps) {
      if (dst.comps[c.id]) continue;
      dst.comps[c.id] = { x: snap(x), y: snap(maxY + 80), r: 0, f: false };
      x += 140;
    }
    resolveOverlaps(doc, target, comps.map((c) => c.id), []);
    dst.wires = {};
    for (const w of doc.wires) dst.wires[w.id] = { pts: [] };
    dst.ready = true;
  }

  // Keep diagram symbols apart during pointer and keyboard moves. Check the
  // whole selection at its proposed offset without mutating either layout.
  function canMove(doc, view, ids, dx, dy) {
    if (view !== 'schematic') return true;
    const moving = new Set(ids);
    const parts = doc.components.filter((c) => c.type !== 'junction').map((c) => {
      const b = compBounds(doc, view, c.id);
      if (!b) return null;
      const mx = moving.has(c.id) ? dx : 0, my = moving.has(c.id) ? dy : 0;
      return { id: c.id, b: { x: b.x + mx, x2: b.x2 + mx, y: b.y + my, y2: b.y2 + my } };
    }).filter(Boolean);
    for (let i = 0; i < parts.length; i++) for (let j = i + 1; j < parts.length; j++) {
      if ((moving.has(parts[i].id) || moving.has(parts[j].id)) && overlaps(parts[i].b, parts[j].b, 4)) return false;
    }
    return true;
  }

  // Nudge `movable` components apart (and away from `fixed` ones).
  function resolveOverlaps(doc, view, movable, fixed, gap = 12) {
    const lay = doc.layouts[view];
    const ids = movable.filter((id) => circuit.getComp(doc, id) && circuit.getComp(doc, id).type !== 'junction');
    for (let iter = 0; iter < 60; iter++) {
      let moved = false;
      const all = ids.concat(fixed);
      for (const id of ids) {
        const a = compBounds(doc, view, id);
        for (const other of all) {
          if (other === id) continue;
          const oc = circuit.getComp(doc, other);
          if (!oc || oc.type === 'junction') continue;
          const b = compBounds(doc, view, other);
          if (!b || !overlaps(a, b, gap)) continue;
          const dx1 = b.x2 + gap - a.x, dx2 = a.x2 + gap - b.x, dy1 = b.y2 + gap - a.y, dy2 = a.y2 + gap - b.y;
          const m = Math.min(dx1, dx2, dy1, dy2);
          const pl = lay.comps[id];
          if (m === dx1) pl.x += snap(dx1 + 5); else if (m === dx2) pl.x -= snap(dx2 + 5); else if (m === dy1) pl.y += snap(dy1 + 5); else pl.y -= snap(dy2 + 5);
          moved = true;
          break;
        }
      }
      if (!moved) break;
    }
  }

  // Place new components in every other ready view, mapping their source
  // positions through a fit of existing shared components (scale + offset).
  function placeInOtherViews(doc, ids, sourceView) {
    const idSet = new Set(ids);
    for (const view of VIEWS) {
      if (view === sourceView || doc.layouts[view].ready !== true) continue;
      const src = doc.layouts[sourceView].comps, dst = doc.layouts[view].comps;
      const common = doc.components.filter((c) => !idSet.has(c.id) && src[c.id] && dst[c.id] && c.type !== 'junction');
      let s, tx, ty;
      const realNew = ids.map((id) => circuit.getComp(doc, id)).filter((c) => c && c.type !== 'junction');
      const sizeRatio = realNew.length ? realNew.reduce((a, c) => a + sizeOf(view, c), 0) / realNew.reduce((a, c) => a + sizeOf(sourceView, c), 0) : 1;
      if (common.length >= 2) {
        const ma = mean(common.map((c) => src[c.id])), mb = mean(common.map((c) => dst[c.id]));
        let num = 0, den = 0;
        for (const c of common) {
          const ax = src[c.id].x - ma.x, ay = src[c.id].y - ma.y;
          num += ax * (dst[c.id].x - mb.x) + ay * (dst[c.id].y - mb.y);
          den += ax * ax + ay * ay;
        }
        s = den > 1e-6 ? num / den : sizeRatio;
        if (!(s > 0.25 && s < 4)) s = sizeRatio;
        tx = mb.x - s * ma.x; ty = mb.y - s * ma.y;
      } else if (common.length === 1) {
        const c = common[0];
        s = sizeRatio; tx = dst[c.id].x - s * src[c.id].x; ty = dst[c.id].y - s * src[c.id].y;
      } else {
        s = sizeRatio; tx = 0; ty = 0;
      }
      for (const id of ids) {
        const e = src[id];
        if (!e) continue;
        dst[id] = { x: snap(s * e.x + tx), y: snap(s * e.y + ty), r: e.r, f: e.f };
      }
      // Move the new group as a whole until it does not overlap existing parts.
      const existing = doc.components.filter((c) => !idSet.has(c.id) && dst[c.id] && c.type !== 'junction').map((c) => compBounds(doc, view, c.id));
      const group = () => ids.map((id) => compBounds(doc, view, id)).filter(Boolean);
      const clash = () => group().some((g) => existing.some((b) => overlaps(g, b, 10)));
      if (clash()) {
        const base = ids.map((id) => ({ id, x: dst[id].x, y: dst[id].y }));
        let found = false;
        for (let ring = 1; ring <= 30 && !found; ring++) {
          for (let k = 0; k < 8 * ring && !found; k++) {
            const ang = (k / (8 * ring)) * Math.PI * 2;
            const ox = snap(Math.cos(ang) * ring * 30), oy = snap(Math.sin(ang) * ring * 30);
            for (const b of base) { dst[b.id].x = b.x + ox; dst[b.id].y = b.y + oy; }
            if (!clash()) found = true;
          }
        }
        if (!found) for (const b of base) { dst[b.id].x = b.x; dst[b.id].y = b.y; }
      }
    }
  }

  // ---------- Tidy up ----------
  // Tidy one view in three stages, never changing a connection:
  // 1. Improve the arrangement by local search: try moving each part a few grid
  //    steps, rotating and mirroring it, and swapping two parts, keeping any
  //    change that lowers the layout cost (see tidyCost).
  // 2. Line up parts whose connected terminals nearly line up, so the wires
  //    between them run straight.
  // 3. Separate any remaining overlap and clear every bend so wires are routed
  //    afresh. Returns true if anything in the view changed.

  // Route of a wire without bends, as drawn: in the circuit diagram it steers
  // around parts; in the realistic view it is a smooth curve.
  // `cache` (optional) remembers diagram routes by their ends and the parts near
  // them, since one move during a search changes only a few routes.
  function quickPoly(view, A, B, obstacles, cache) {
    const d0 = { x: A.dx, y: A.dy }, d1 = { x: B.dx, y: B.dy };
    if (view === 'schematic') {
      if (!cache) return autoOrtho(A, d0, B, d1, obstacles, []);
      const box = { x: Math.min(A.x, B.x) - 160, y: Math.min(A.y, B.y) - 160, x2: Math.max(A.x, B.x) + 160, y2: Math.max(A.y, B.y) + 160 };
      const near = obstacles.filter((r) => overlaps(r, box, 0));
      const key = [A.x, A.y, A.dx, A.dy, B.x, B.y, B.dx, B.dy].join(',') + '|' + near.map((r) => `${r.x},${r.y},${r.x2},${r.y2}`).join(';');
      let poly = cache.get(key);
      if (!poly) { poly = autoOrtho(A, d0, B, d1, near, []); cache.set(key, poly); }
      return poly;
    }
    const seg = smoothRoute(A, d0, [], B, d1)[0];
    const out = [];
    for (let k = 0; k <= 10; k++) out.push(bez(seg, k / 10));
    return out;
  }

  // Route of a wire through its bends, as drawn.
  function routedPoly(view, A, B, pts) {
    const d0 = { x: A.dx, y: A.dy }, d1 = { x: B.dx, y: B.dy };
    if (view === 'schematic') return orthoRoute(A, d0, pts, B, d1);
    const out = [];
    smoothRoute(A, d0, pts, B, d1).forEach((seg, i) => { for (let k = i === 0 ? 0 : 1; k <= 8; k++) out.push(bez(seg, k / 8)); });
    return out;
  }

  function segsCross(a, b, c, d) {
    const o = (p, q, r) => (q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x);
    const d1 = o(c, d, a), d2 = o(c, d, b), d3 = o(a, b, c), d4 = o(a, b, d);
    return ((d1 > 1e-9 && d2 < -1e-9) || (d1 < -1e-9 && d2 > 1e-9)) && ((d3 > 1e-9 && d4 < -1e-9) || (d3 < -1e-9 && d4 > 1e-9));
  }

  function polyBox(poly) {
    const b = { x: Infinity, y: Infinity, x2: -Infinity, y2: -Infinity };
    for (const p of poly) { b.x = Math.min(b.x, p.x); b.y = Math.min(b.y, p.y); b.x2 = Math.max(b.x2, p.x); b.y2 = Math.max(b.y2, p.y); }
    return b;
  }

  // Layout cost: lower is tidier. Crossing wires, wires over parts and
  // overlapping parts cost most; then leads that leave a part backwards, bends
  // and wire length. `home` (optional) holds each part's starting placement, so
  // parts are not turned or moved without a reason. `report` (optional)
  // receives the counts behind the cost.
  function tidyCost(doc, view, home, cache, report) {
    const lay = doc.layouts[view];
    let cost = 0;
    const rep = report || {};
    rep.overlaps = 0; rep.crossings = 0; rep.overParts = 0; rep.backwards = 0;
    const solid = [];
    for (const c of doc.components) {
      if (c.type === 'junction' || !lay.comps[c.id]) continue;
      const b = compBounds(doc, view, c.id);
      solid.push({ id: c.id, b, body: { x: b.x + 10, y: b.y + 10, x2: b.x2 - 10, y2: b.y2 - 10 } });
    }
    for (let i = 0; i < solid.length; i++) for (let j = i + 1; j < solid.length; j++) {
      if (overlaps(solid[i].b, solid[j].b, 0)) { cost += 4000; rep.overlaps++; }
      // Realistic parts need room for their wires; diagram symbols may sit in a row.
      else if (overlaps(solid[i].b, solid[j].b, view === 'schematic' ? 8 : 36)) cost += 250;
    }
    const routes = [];
    const obstacles = view === 'schematic' ? obstacleRects(doc, view) : null;
    for (const w of doc.wires) {
      const A = termWorld(doc, view, w.a), B = termWorld(doc, view, w.b);
      if (!A || !B) continue;
      const pts = wirePoints(doc, view, w);
      const poly = pts.length ? routedPoly(view, A, B, pts) : quickPoly(view, A, B, obstacles, cache);
      routes.push({ w, poly, box: polyBox(poly) });
      for (let i = 0; i < poly.length - 1; i++) cost += Math.hypot(poly[i + 1].x - poly[i].x, poly[i + 1].y - poly[i].y);
      if (view === 'schematic') cost += 30 * Math.max(0, poly.length - 2);
      else if (Math.abs(A.x - B.x) < 0.5 || Math.abs(A.y - B.y) < 0.5) cost -= 20;
      const u = unit(B.x - A.x, B.y - A.y);
      if (!isZero({ x: A.dx, y: A.dy }) && A.dx * u.x + A.dy * u.y < -0.2) { cost += 120; rep.backwards++; }
      if (!isZero({ x: B.dx, y: B.dy }) && -(B.dx * u.x + B.dy * u.y) < -0.2) { cost += 120; rep.backwards++; }
      for (const s of solid) {
        if (!overlaps(s.body, routes[routes.length - 1].box, 0)) continue;
        // A wire may leave its own part's socket (meters take their leads on
        // the front), so near its own ends it is not "over" that part.
        const own = [];
        if (s.id === w.a.c) own.push(A);
        if (s.id === w.b.c) own.push(B);
        const nearOwn = (p) => own.some((e) => Math.hypot(p.x - e.x, p.y - e.y) < 30);
        for (let i = 0; i < poly.length - 1; i++) {
          if (own.length && (nearOwn(poly[i]) || nearOwn(poly[i + 1]))) continue;
          if (segHitsRect(poly[i], poly[i + 1], s.body)) { cost += 900; rep.overParts++; break; }
        }
      }
    }
    const same = (e, f) => e.c === f.c && e.t === f.t;
    for (let i = 0; i < routes.length; i++) for (let j = i + 1; j < routes.length; j++) {
      const p = routes[i], q = routes[j];
      if (!overlaps(p.box, q.box, 0)) continue;
      if (same(p.w.a, q.w.a) || same(p.w.a, q.w.b) || same(p.w.b, q.w.a) || same(p.w.b, q.w.b)) continue;
      let n = 0;
      for (let a = 0; a < p.poly.length - 1; a++) for (let b = 0; b < q.poly.length - 1; b++) if (segsCross(p.poly[a], p.poly[a + 1], q.poly[b], q.poly[b + 1])) n++;
      cost += 350 * n;
      rep.crossings += n;
    }
    if (home) {
      for (const [id, h] of home) {
        const pl = lay.comps[id];
        if (!pl) continue;
        if (pl.r !== h.r || pl.f !== h.f) cost += 25;
        cost += 0.05 * (Math.abs(pl.x - h.x) + Math.abs(pl.y - h.y));
      }
    }
    return cost;
  }

  // Tidy never turns these: meters on the bench (so their displays read
  // normally) and the oscilloscope in either view (its screen and inputs).
  const UPRIGHT_ON_BENCH = ['ammeter', 'voltmeter', 'scope'];
  function keepsUpright(doc, view, id) {
    const c = circuit.getComp(doc, id);
    if (!c) return false;
    return c.type === 'scope' || (view === 'realistic' && UPRIGHT_ON_BENCH.includes(c.type));
  }

  function improveLayout(doc, view, opts = {}) {
    const lay = doc.layouts[view];
    const ids = doc.components.filter((c) => lay.comps[c.id] && doc.wires.some((w) => w.a.c === c.id || w.b.c === c.id)).map((c) => c.id);
    if (ids.length < 2) return;
    const isJunction = (id) => circuit.getComp(doc, id).type === 'junction';
    const home = new Map(ids.map((id) => [id, Object.assign({}, lay.comps[id])]));
    const cache = new Map();
    const cost = () => { if (cache.size > 20000) cache.clear(); return tidyCost(doc, view, home, cache); };
    let best = cost();
    // The circuit diagram routes every wire around parts, which is slower to
    // score, so it searches fewer, nearer positions per pass.
    const STEP = 20, reach = view === 'schematic' ? 2 : 3, turnReach = view === 'schematic' ? 1 : 2;
    const shifts = [];
    for (let i = -reach; i <= reach; i++) for (let j = -reach; j <= reach; j++) if (i || j) shifts.push([i * STEP, j * STEP]);
    const orients = [];
    for (let r = 0; r < 4; r++) for (const f of [false, true]) orients.push({ r, f });
    const tryState = (pl, state) => {
      const old = { x: pl.x, y: pl.y, r: pl.r, f: pl.f };
      Object.assign(pl, state);
      const c = cost();
      if (c < best - 0.5) { best = c; return true; }
      Object.assign(pl, old);
      return false;
    };
    const maxPasses = opts.passes || 8;
    for (let pass = 0; pass < maxPasses; pass++) {
      let improved = false;
      for (const id of ids) {
        const pl = lay.comps[id];
        const turns = keepsUpright(doc, view, id) ? orients.filter((o) => o.r === 0) : orients;
        if (!isJunction(id)) for (const o of turns) if ((o.r !== pl.r || o.f !== pl.f) && tryState(pl, o)) improved = true;
        for (const [dx, dy] of shifts) if (tryState(pl, { x: pl.x + dx, y: pl.y + dy })) improved = true;
        if (!isJunction(id)) {
          // A move and a turn together, for parts that only fit once turned.
          const x0 = pl.x, y0 = pl.y;
          for (const o of turns) for (const [dx, dy] of shifts) {
            if (Math.abs(dx) > turnReach * STEP || Math.abs(dy) > turnReach * STEP || (o.r === pl.r && o.f === pl.f)) continue;
            if (tryState(pl, { x: x0 + dx, y: y0 + dy, r: o.r, f: o.f })) { improved = true; break; }
          }
        }
      }
      // Swap two parts of a similar kind, keeping each one's orientation.
      for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) {
        if (isJunction(ids[i]) || isJunction(ids[j])) continue;
        const p = lay.comps[ids[i]], q = lay.comps[ids[j]];
        const px = p.x, py = p.y;
        p.x = q.x; p.y = q.y; q.x = px; q.y = py;
        const c = cost();
        if (c < best - 0.5) { best = c; improved = true; }
        else { q.x = p.x; q.y = p.y; p.x = px; p.y = py; }
      }
      if (!improved) break;
    }
  }

  function tidy(doc, view, opts = {}) {
    const lay = doc.layouts[view];
    const tol = opts.tolerance || 30;
    const before = JSON.stringify(lay);
    const untidyNow = () => { const r = {}; tidyCost(doc, view, null, null, r); return r.overlaps + r.crossings + r.overParts; };
    const untidyBefore = opts.untidyBefore !== undefined ? opts.untidyBefore : untidyNow();
    for (const c of doc.components) {
      const pl = lay.comps[c.id];
      if (pl) { pl.x = snap(pl.x); pl.y = snap(pl.y); }
      if (pl && keepsUpright(doc, view, c.id)) pl.r = 0;
    }
    // Circuits made of series and parallel parts get the textbook layout.
    const sp = opts.noSeriesParallel ? null : seriesParallel(doc, view);
    if (sp) {
      const saved = JSON.stringify(lay);
      const untidy = () => { const r = {}; tidyCost(doc, view, null, null, r); return r.overlaps + r.crossings + r.overParts; };
      if (layoutSeriesParallel(doc, view, sp) && untidy() === 0) return JSON.stringify(lay) !== before;
      doc.layouts[view] = JSON.parse(saved);
      return tidy(doc, view, Object.assign({}, opts, { noSeriesParallel: true, untidyBefore }));
    }
    improveLayout(doc, view, opts);
    for (const w of doc.wires) lay.wires[w.id] = { pts: [] };
    {
      const untidy = () => { const r = {}; tidyCost(doc, view, null, null, r); return r.overlaps + r.crossings + r.overParts; };
      const saved = JSON.stringify(lay.comps), was = untidy();
      for (let i = 0; i < 3; i++) ensureMinimumSize(doc, view);
      if (untidy() > was) lay.comps = JSON.parse(saved);
    }
    // Keep each finishing step only if it does not make the layout worse.
    // Spreading parts along a run keeps total wire length, so it is judged
    // only on overlaps, crossings and wires over parts.
    const untidyCount = () => { const r = {}; tidyCost(doc, view, null, null, r); return r.overlaps + r.crossings + r.overParts; };
    const steps = [
      [() => alignParts(doc, view, tol), () => tidyCost(doc, view)],
      [() => distributeRuns(doc, view), untidyCount],
      [() => resolveOverlaps(doc, view, doc.components.map((c) => c.id), [], 4), () => tidyCost(doc, view)]
    ];
    for (const [step, measure] of steps) {
      const saved = JSON.stringify(lay.comps), was = measure();
      step();
      if (measure() > was + 0.5) lay.comps = JSON.parse(saved);
    }
    for (const w of doc.wires) lay.wires[w.id] = { pts: [] };
    // Never leave a layout with more overlaps, crossings or wires over parts
    // than it had: keep the original instead.
    if (untidyNow() > untidyBefore) { doc.layouts[view] = JSON.parse(before); return false; }
    return JSON.stringify(doc.layouts[view]) !== before;
  }

  // ---------- Series-parallel layout ----------
  // Most school circuits are sources in loops with parts in series and in
  // parallel. Those are drawn the textbook way: each circuit is a rectangle with
  // its source centered along the top and the rest along the bottom (in a
  // series loop of three or more, single parts at the ends go on the sides),
  // parallel branches stacked between two rails, and every gap along a side
  // equal. Separate circuits sit side by side. Anything else (parts with three
  // or more terminals, bridges, loose ends) returns null and is left to the search.

  const SOURCE_TYPES = ['battery', 'cell', 'dcsupply', 'acsupply'];
  const SP_SIZES = {
    schematic: { gap: 40, rail: 30, branch: 30, labelUp: 24, minW: 280, minH: 200, apart: 100 },
    realistic: { gap: 60, rail: 40, branch: 36, labelUp: 20, minW: 400, minH: 280, apart: 140 }
  };

  function reverseTree(t) {
    if (t.kind === 'leaf') return Object.assign({}, t, { from: t.to, to: t.from });
    if (t.kind === 'series') return { kind: 'series', parts: t.parts.slice().reverse().map(reverseTree) };
    return { kind: 'parallel', parts: t.parts.map(reverseTree) };
  }

  function seriesParallel(doc, view) {
    const comps = doc.components.filter((c) => c.type !== 'junction');
    if (comps.length < 2) return null;
    const { netOf } = circuit.buildNets(doc);
    const edges = [];
    for (const c of comps) {
      const ids = Object.keys(terminalsLocal(view, c));
      if (ids.length !== 2 || !doc.layouts[view].comps[c.id]) return null;
      const a = netOf.get(c.id + ':' + ids[0]), b = netOf.get(c.id + ':' + ids[1]);
      if (a === undefined || b === undefined || a === b) return null;
      edges.push({ c, ids, nodes: [a, b] });
    }
    const degree = new Map();
    for (const e of edges) for (const nd of e.nodes) degree.set(nd, (degree.get(nd) || 0) + 1);
    for (const d of degree.values()) if (d < 2) return null;
    for (const c of doc.components) if (c.type === 'junction' && !degree.has(netOf.get(c.id + ':j'))) return null;
    // Separate circuits: edges joined through shared nets.
    const groups = [];
    const seen = new Set();
    for (const e of edges) {
      if (seen.has(e)) continue;
      const group = [], stack = [e];
      seen.add(e);
      while (stack.length) {
        const x = stack.pop();
        group.push(x);
        for (const y of edges) if (!seen.has(y) && y.nodes.some((nd) => x.nodes.includes(nd))) { seen.add(y); stack.push(y); }
      }
      groups.push(group);
    }
    const loops = [];
    for (const group of groups) {
      const src = group.find((e) => SOURCE_TYPES.includes(e.c.type)) || group[0];
      const pi = src.ids.indexOf('p') >= 0 ? src.ids.indexOf('p') : 0;
      const sNode = src.nodes[pi], tNode = src.nodes[1 - pi];
      let items = group.filter((e) => e !== src).map((e) => ({ u: e.nodes[0], v: e.nodes[1], t: { kind: 'leaf', c: e.c, from: e.ids[0], to: e.ids[1] } }));
      if (!items.length) return null;
      const orient = (it, u) => (it.u === u ? it.t : reverseTree(it.t));
      const flat = (t, kind) => (t.kind === kind ? t.parts : [t]);
      for (let guard = 0; items.length > 1 && guard < 500; guard++) {
        let merged = false;
        for (let i = 0; i < items.length && !merged; i++) {
          for (let j = i + 1; j < items.length; j++) {
            const a = items[i], b = items[j];
            if ((a.u === b.u && a.v === b.v) || (a.u === b.v && a.v === b.u)) {
              const t = { kind: 'parallel', parts: flat(a.t, 'parallel').concat(flat(orient(b, a.u), 'parallel')) };
              items = items.filter((x) => x !== a && x !== b).concat([{ u: a.u, v: a.v, t }]);
              merged = true;
              break;
            }
          }
        }
        if (merged) continue;
        const count = new Map();
        for (const it of items) for (const nd of [it.u, it.v]) count.set(nd, (count.get(nd) || 0) + 1);
        for (const [nd, k] of count) {
          if (k !== 2 || nd === sNode || nd === tNode) continue;
          const [a, b] = items.filter((it) => it.u === nd || it.v === nd);
          const x = a.u === nd ? a.v : a.u, y = b.u === nd ? b.v : b.u;
          if (x === y) continue;
          const t = { kind: 'series', parts: flat(orient(a, x), 'series').concat(flat(orient(b, nd), 'series')) };
          items = items.filter((it) => it !== a && it !== b).concat([{ u: x, v: y, t }]);
          merged = true;
          break;
        }
        if (!merged) break;
      }
      if (items.length !== 1) return null;
      const it = items[0];
      if (!((it.u === sNode && it.v === tNode) || (it.u === tNode && it.v === sNode))) return null;
      loops.push({ src: { kind: 'leaf', c: src.c, from: src.ids[pi], to: src.ids[1 - pi] }, tree: orient(it, sNode) });
    }
    return { netOf, loops };
  }

  // Places every part of a series-parallel circuit and gives each wire bends at
  // the corners of the drawing (on the bench they become smooth curves, so
  // wires run round the loop instead of across parts). Returns false if a part
  // cannot be lined up.
  function layoutSeriesParallel(doc, view, sp) {
    const cfg = SP_SIZES[view] || SP_SIZES.schematic;
    const lay = doc.layouts[view];
    const net = (c, t) => sp.netOf.get(c.id + ':' + t);
    const termAt = new Map();
    const segs = new Map();
    const addSeg = (nt, p, q) => {
      if (Math.abs(p.x - q.x) < 1e-6 && Math.abs(p.y - q.y) < 1e-6) return;
      if (!segs.has(nt)) segs.set(nt, []);
      segs.get(nt).push([p, q]);
    };
    // Orientation that puts terminal `from` left of (or above) terminal `to`.
    // `outward` (−1 left, +1 right) turns a side part so its underside, where
    // a meter shows its reading, faces out of the rectangle.
    function orientLeaf(leaf, vertical, outward = 0) {
      const local = terminalsLocal(view, leaf.c);
      const along = vertical ? 'y' : 'x', cross = vertical ? 'x' : 'y';
      let best = null;
      for (const r of keepsUpright(doc, view, leaf.c.id) ? [0] : [0, 1, 2, 3]) {
        for (const f of [false, true]) {
          const pl = { x: 0, y: 0, r, f };
          const ta = local[leaf.from], tb = local[leaf.to];
          const A = xform(pl, ta[0], ta[1]), B = xform(pl, tb[0], tb[1]);
          if (Math.abs(A[cross] - B[cross]) > 0.5 || B[along] - A[along] < 1) continue;
          const dA = xdir(pl, ta[2], ta[3]), dB = xdir(pl, tb[2], tb[3]);
          let score = (dA[along] < -0.5 ? 0 : 4) + (dB[along] > 0.5 ? 0 : 4) + (f ? 0.5 : 0);
          score += vertical ? (r % 2 === 1 ? 0 : 2) : (r === 0 ? 0 : r === 2 ? 1 : 2);
          if (outward && xdir(pl, 0, 1).x * outward < 0) score += 3;
          if (!best || score < best.score) best = { r, f, A, B, score };
        }
      }
      if (!best) return null;
      const [bx, by, bw, bh] = localBounds(view, leaf.c);
      const pl = { x: 0, y: 0, r: best.r, f: best.f };
      const corners = [xform(pl, bx, by), xform(pl, bx + bw, by), xform(pl, bx, by + bh), xform(pl, bx + bw, by + bh)];
      best.minX = Math.min(...corners.map((p) => p.x)); best.maxX = Math.max(...corners.map((p) => p.x));
      best.minY = Math.min(...corners.map((p) => p.y)); best.maxY = Math.max(...corners.map((p) => p.y));
      return best;
    }
    const leftNet = (t) => (t.kind === 'leaf' ? net(t.c, t.from) : leftNet(t.parts[0]));
    const rightNet = (t) => (t.kind === 'leaf' ? net(t.c, t.to) : t.kind === 'series' ? rightNet(t.parts[t.parts.length - 1]) : rightNet(t.parts[0]));
    // Size of a tree laid along a horizontal line: width between its end
    // terminals, and room above and below the line (labels included).
    function measure(t) {
      if (t.kind === 'leaf') {
        const o = orientLeaf(t, false);
        if (!o) return false;
        t.o = o; t.w = o.B.x - o.A.x;
        t.up = o.A.y - o.minY + cfg.labelUp; t.down = o.maxY - o.A.y;
        t.ext = Math.max(0, o.A.x - o.minX, o.maxX - o.B.x);
        return true;
      }
      if (!t.parts.every(measure)) return false;
      // Meters connected across something hang below it, as in textbooks.
      if (t.kind === 'parallel') {
        const isMeter = (p) => p.kind === 'leaf' && (p.c.type === 'voltmeter' || p.c.type === 'scope');
        t.parts.sort((p, q) => isMeter(p) - isMeter(q));
      }
      if (t.kind === 'series') {
        t.w = t.parts.reduce((a, p) => a + p.w, 0) + cfg.gap * (t.parts.length - 1);
        t.up = Math.max(...t.parts.map((p) => p.up)); t.down = Math.max(...t.parts.map((p) => p.down));
      } else {
        t.w = Math.max(...t.parts.map((p) => p.w)) + 2 * cfg.rail;
        t.up = t.parts[0].up;
        let y = 0;
        t.lines = [0];
        for (let i = 1; i < t.parts.length; i++) { y += t.parts[i - 1].down + cfg.branch + t.parts[i].up; t.lines.push(y); }
        t.down = y + t.parts[t.parts.length - 1].down;
      }
      t.ext = 0;
      return true;
    }
    function putLeaf(t, o, X, Y) {
      lay.comps[t.c.id] = { x: X - o.A.x, y: Y - o.A.y, r: o.r, f: o.f };
      termAt.set(t.c.id + ':' + t.from, { x: X, y: Y });
      termAt.set(t.c.id + ':' + t.to, { x: X + o.B.x - o.A.x, y: Y + o.B.y - o.A.y });
    }
    // Lay a tree out from its left terminal at (X, Y).
    function put(t, X, Y) {
      if (t.kind === 'leaf') { putLeaf(t, t.o, X, Y); return; }
      if (t.kind === 'series') {
        let x = X;
        t.parts.forEach((p, i) => {
          put(p, x, Y);
          if (i < t.parts.length - 1) addSeg(rightNet(p), { x: x + p.w, y: Y }, { x: x + p.w + cfg.gap, y: Y });
          x += p.w + cfg.gap;
        });
        return;
      }
      const xl = X, xr = X + t.w, nl = leftNet(t), nr = rightNet(t);
      t.parts.forEach((p, i) => {
        const y = Y + t.lines[i], off = (t.w - p.w) / 2;
        put(p, X + off, y);
        addSeg(nl, { x: xl, y: Y }, { x: xl, y }); addSeg(nl, { x: xl, y }, { x: X + off, y });
        addSeg(nr, { x: xr, y: Y }, { x: xr, y }); addSeg(nr, { x: X + off + p.w, y }, { x: xr, y });
      });
    }

    let originX = 0;
    for (const loop of sp.loops) {
      const so = orientLeaf(loop.src, false);
      if (!so) return false;
      // A part can stand on a side if turning it reads well: any symbol, but on
      // the bench only parts with a lead at each end (not meters or supplies).
      const canStand = (t) => {
        if (t.kind !== 'leaf') return false;
        if (view === 'schematic') return true;
        const local = terminalsLocal(view, t.c);
        return local[t.from][2] * local[t.to][2] < 0;
      };
      let bottom = loop.tree, sideL = null, sideR = null;
      if (bottom.kind === 'series' && bottom.parts.length >= 3 && canStand(bottom.parts[0]) && canStand(bottom.parts[bottom.parts.length - 1])) {
        sideL = bottom.parts[0]; sideR = bottom.parts[bottom.parts.length - 1];
        const mid = bottom.parts.slice(1, -1);
        bottom = mid.length === 1 ? mid[0] : { kind: 'series', parts: mid };
      }
      const row = bottom.kind === 'series' ? bottom.parts : [bottom];
      if (!row.every(measure)) return false;
      const oL = sideL && orientLeaf(sideL, true, -1);
      const oR = sideR && orientLeaf(reverseTree(sideR), true, 1);
      if ((sideL && !oL) || (sideR && !oR)) return false;
      const sideW = Math.max(oL ? oL.maxX - oL.minX : 0, oR ? oR.maxX - oR.minX : 0);
      // Every gap (all equal) must clear the bodies on both sides of it.
      let need = Math.max(cfg.gap, row[0].ext + 20, row[row.length - 1].ext + 20);
      for (let i = 0; i < row.length - 1; i++) need = Math.max(need, row[i].ext + row[i + 1].ext + 20);
      const W = Math.max(cfg.minW, (so.B.x - so.A.x) + 2 * cfg.gap + sideW, row.reduce((a, p) => a + p.w, 0) + need * (row.length + 1) + sideW);
      const lenL = oL ? oL.B.y - oL.A.y : 0, lenR = oR ? oR.B.y - oR.A.y : 0;
      const H = Math.max(cfg.minH, (so.maxY - so.A.y) + Math.max(...row.map((p) => p.up)) + cfg.gap, Math.max(lenL, lenR) + 2 * cfg.gap + cfg.labelUp);
      const XL = originX, XR = originX + W;
      // Source, centered along the top.
      const xs = XL + (W - (so.B.x - so.A.x)) / 2;
      putLeaf(loop.src, so, xs, 0);
      const sN = net(loop.src.c, loop.src.from), tN = net(loop.src.c, loop.src.to);
      addSeg(sN, { x: XL, y: 0 }, { x: xs, y: 0 });
      addSeg(tN, { x: xs + so.B.x - so.A.x, y: 0 }, { x: XR, y: 0 });
      // Sides: a single part centered, or a plain wire.
      const lNet = leftNet(bottom), rNet = rightNet(bottom);
      if (oL) {
        const y0 = (H - lenL) / 2;
        lay.comps[sideL.c.id] = { x: XL - oL.A.x, y: y0 - oL.A.y, r: oL.r, f: oL.f };
        termAt.set(sideL.c.id + ':' + sideL.from, { x: XL, y: y0 }); termAt.set(sideL.c.id + ':' + sideL.to, { x: XL, y: y0 + lenL });
        addSeg(sN, { x: XL, y: 0 }, { x: XL, y: y0 }); addSeg(lNet, { x: XL, y: y0 + lenL }, { x: XL, y: H });
      } else addSeg(sN, { x: XL, y: 0 }, { x: XL, y: H });
      if (oR) {
        const y0 = (H - lenR) / 2;
        lay.comps[sideR.c.id] = { x: XR - oR.A.x, y: y0 - oR.A.y, r: oR.r, f: oR.f };
        termAt.set(sideR.c.id + ':' + sideR.to, { x: XR, y: y0 }); termAt.set(sideR.c.id + ':' + sideR.from, { x: XR, y: y0 + lenR });
        addSeg(tN, { x: XR, y: 0 }, { x: XR, y: y0 }); addSeg(rNet, { x: XR, y: y0 + lenR }, { x: XR, y: H });
      } else addSeg(tN, { x: XR, y: 0 }, { x: XR, y: H });
      // The rest along the bottom, with equal gaps from corner to corner.
      // Equal lengths of wire between corners and parts (W leaves room for
      // bodies that reach past their terminals).
      const gap = (W - row.reduce((a, p) => a + p.w, 0)) / (row.length + 1);
      let x = XL;
      row.forEach((p, i) => {
        addSeg(i === 0 ? lNet : leftNet(p), { x, y: H }, { x: x + gap, y: H });
        put(p, x + gap, H);
        x += gap + p.w;
      });
      addSeg(rNet, { x, y: H }, { x: XR, y: H });
      originX = XR + cfg.apart + sideW;
    }
    for (const pl of Object.values(lay.comps)) { pl.x = Math.round(pl.x * 100) / 100; pl.y = Math.round(pl.y * 100) / 100; }

    // Wires follow the drawing: each runs along its net's lines from one
    // terminal to the other. Junction parts sit at the busiest point of their net.
    const keyOf = (p) => `${Math.round(p.x * 10)},${Math.round(p.y * 10)}`;
    const graphs = new Map();
    for (const [nt, list] of segs) {
      const g = new Map();
      const node = (p) => { const k = keyOf(p); if (!g.has(k)) g.set(k, { p, nb: new Set() }); return k; };
      // Split segments where another segment's end lies on them.
      const pts = [];
      for (const [p, q] of list) pts.push(p, q);
      for (const [p, q] of list) {
        const on = pts.filter((r) => (Math.abs(r.x - p.x) < 1e-6 && Math.abs(r.x - q.x) < 1e-6 && (r.y - p.y) * (r.y - q.y) < 0) || (Math.abs(r.y - p.y) < 1e-6 && Math.abs(r.y - q.y) < 1e-6 && (r.x - p.x) * (r.x - q.x) < 0));
        const chain = [p].concat(on.sort((a, b) => (Math.abs(a.x - p.x) + Math.abs(a.y - p.y)) - (Math.abs(b.x - p.x) + Math.abs(b.y - p.y))), [q]);
        for (let i = 0; i < chain.length - 1; i++) {
          const a = node(chain[i]), b = node(chain[i + 1]);
          if (a !== b) { g.get(a).nb.add(b); g.get(b).nb.add(a); }
        }
      }
      graphs.set(nt, g);
    }
    for (const c of doc.components) {
      if (c.type !== 'junction') continue;
      const g = graphs.get(sp.netOf.get(c.id + ':j'));
      let best = null;
      if (g) for (const n of g.values()) if (!best || n.nb.size > best.nb.size) best = n;
      const p = best ? best.p : null;
      if (!p) return false;
      lay.comps[c.id] = { x: p.x, y: p.y, r: 0, f: false };
      termAt.set(c.id + ':j', p);
    }
    for (const w of doc.wires) {
      lay.wires[w.id] = { pts: [] };
      const P = termAt.get(w.a.c + ':' + w.a.t), Q = termAt.get(w.b.c + ':' + w.b.t);
      const g = graphs.get(sp.netOf.get(w.a.c + ':' + w.a.t));
      if (!P || !Q || !g) continue;
      const start = keyOf(P), goal = keyOf(Q);
      if (!g.has(start) || !g.has(goal)) continue;
      const prev = new Map([[start, null]]);
      const queue = [start];
      while (queue.length && !prev.has(goal)) {
        const k = queue.shift();
        for (const nb of g.get(k).nb) if (!prev.has(nb)) { prev.set(nb, k); queue.push(nb); }
      }
      if (!prev.has(goal)) continue;
      const path = [];
      for (let k = goal; k; k = prev.get(k)) path.unshift(g.get(k).p);
      // Keep only the corners between the two ends.
      const corners = [];
      for (let i = 1; i < path.length - 1; i++) {
        const a = path[i - 1], b = path[i], c = path[i + 1];
        const straight = (Math.abs(a.x - b.x) < 1e-6 && Math.abs(b.x - c.x) < 1e-6) || (Math.abs(a.y - b.y) < 1e-6 && Math.abs(b.y - c.y) < 1e-6);
        if (!straight) corners.push([b.x, b.y]);
      }
      lay.wires[w.id] = { pts: corners };
    }
    lay.ready = true;
    return true;
  }

  // Spread the parts along each straight run evenly: equal gaps between
  // neighbors and to the corner at each end, so a lone part sits in the middle
  // of its side. A run is a chain of two-terminal parts joined end to end, each
  // with both terminals on one line; its ends are the terminals it connects to.
  function distributeRuns(doc, view) {
    const lay = doc.layouts[view];
    const key = (e) => e.c + ':' + e.t;
    const links = new Map();
    for (const w of doc.wires) {
      for (const [p, q] of [[w.a, w.b], [w.b, w.a]]) {
        if (!links.has(key(p))) links.set(key(p), []);
        links.get(key(p)).push(q);
      }
    }
    const only = (end) => { const l = links.get(key(end)) || []; return l.length === 1 ? l[0] : null; };
    for (const axis of ['x', 'y']) {
      const cross = axis === 'x' ? 'y' : 'x';
      const info = new Map();
      for (const c of doc.components) {
        if (c.type === 'junction' || !lay.comps[c.id]) continue;
        const ids = Object.keys(terminalsLocal(view, c));
        if (ids.length !== 2) continue;
        const A = termWorld(doc, view, { c: c.id, t: ids[0] }), B = termWorld(doc, view, { c: c.id, t: ids[1] });
        if (!A || !B || Math.abs(A[cross] - B[cross]) > 0.5 || Math.abs(A[axis] - B[axis]) < 1) continue;
        info.set(c.id, A[axis] < B[axis] ? { lo: ids[0], hi: ids[1], line: A[cross] } : { lo: ids[1], hi: ids[0], line: A[cross] });
      }
      // The next part along the run from one end of a part, if any.
      const next = (id, end) => {
        const me = info.get(id);
        const nb = only({ c: id, t: me[end] });
        const ni = nb && info.get(nb.c);
        if (!ni || nb.t !== ni[end === 'lo' ? 'hi' : 'lo'] || Math.abs(ni.line - me.line) > 0.5) return null;
        return nb.c;
      };
      const done = new Set();
      for (const id of info.keys()) {
        if (done.has(id)) continue;
        let start = id;
        const seen = new Set([id]);
        for (let p = next(start, 'lo'); p && !seen.has(p); p = next(start, 'lo')) { seen.add(p); start = p; }
        const chain = [start];
        done.add(start);
        for (let p = next(start, 'hi'); p && !done.has(p); p = next(chain[chain.length - 1], 'hi')) { chain.push(p); done.add(p); }
        const last = chain[chain.length - 1];
        const loEnd = only({ c: chain[0], t: info.get(chain[0]).lo }), hiEnd = only({ c: last, t: info.get(last).hi });
        if (!loEnd || !hiEnd || chain.includes(loEnd.c) || chain.includes(hiEnd.c)) continue;
        const P = termWorld(doc, view, loEnd), Q = termWorld(doc, view, hiEnd);
        if (!P || !Q) continue;
        const spans = chain.map((cid) => {
          const lo = termWorld(doc, view, { c: cid, t: info.get(cid).lo }), hi = termWorld(doc, view, { c: cid, t: info.get(cid).hi });
          return { cid, len: hi[axis] - lo[axis], off: lo[axis] - lay.comps[cid][axis], lo: lo[axis], hi: hi[axis] };
        });
        if (!(P[axis] < spans[0].lo && Q[axis] > spans[spans.length - 1].hi)) continue;
        const gap = (Q[axis] - P[axis] - spans.reduce((t, sp) => t + sp.len, 0)) / (chain.length + 1);
        if (gap < 20) continue;
        let pos = P[axis] + gap;
        for (const sp of spans) {
          lay.comps[sp.cid][axis] = snap(pos - sp.off);
          pos += sp.len + gap;
        }
      }
    }
  }

  // The search favors short wires, which can squeeze a small circuit into a
  // tiny knot. Spread it evenly about its center until it is at least the size
  // of a hand-drawn example; spreading keeps its shape, so nothing new crosses.
  const MIN_SIZE = { schematic: [280, 200], realistic: [360, 240] };
  function ensureMinimumSize(doc, view) {
    const lay = doc.layouts[view];
    const ids = doc.components.filter((c) => lay.comps[c.id]).map((c) => c.id);
    if (ids.length < 2) return;
    const b = viewBounds(doc, view);
    if (!b) return;
    const [minW, minH] = MIN_SIZE[view] || MIN_SIZE.schematic;
    const cx = (b.x + b.x2) / 2, cy = (b.y + b.y2) / 2;
    // Scale the spread of the parts' centers, not their sizes.
    const xs = ids.map((id) => lay.comps[id].x), ys = ids.map((id) => lay.comps[id].y);
    const spreadX = Math.max(...xs) - Math.min(...xs), spreadY = Math.max(...ys) - Math.min(...ys);
    const w = b.x2 - b.x, h = b.y2 - b.y;
    const sx = w < minW && spreadX > 1 ? (spreadX + (minW - w)) / spreadX : 1;
    const sy = h < minH && spreadY > 1 ? (spreadY + (minH - h)) / spreadY : 1;
    if (sx === 1 && sy === 1) return;
    for (const id of ids) {
      const pl = lay.comps[id];
      pl.x = snap(cx + (pl.x - cx) * sx);
      pl.y = snap(cy + (pl.y - cy) * sy);
    }
  }

  function alignParts(doc, view, tol) {
    const lay = doc.layouts[view];
    const isJunction = (id) => { const c = circuit.getComp(doc, id); return !!c && c.type === 'junction'; };
    const degree = new Map();
    for (const w of doc.wires) for (const e of [w.a, w.b]) degree.set(e.c, (degree.get(e.c) || 0) + 1);
    const solid = doc.components.filter((c) => c.type !== 'junction' && lay.comps[c.id]).map((c) => c.id);
    const clashes = (id) => {
      if (isJunction(id)) return false;
      const a = compBounds(doc, view, id);
      return solid.some((o) => o !== id && overlaps(a, compBounds(doc, view, o), 4));
    };
    const ends = (w) => {
      const A = termWorld(doc, view, w.a), B = termWorld(doc, view, w.b);
      return A && B ? { A, B } : null;
    };
    // Lining up two ends helps when their leads face each other along the run
    // (a straight wire), or point the same way across it (a neat U-shaped link).
    const faces = (T, U, axis) => {
      const d = { x: T.dx, y: T.dy };
      if (isZero(d)) return true;
      if (axis === 'y' ? !isH(d) : isH(d)) return false;
      return d.x * (U.x - T.x) + d.y * (U.y - T.y) >= 0;
    };
    const suits = (A, B, axis) => {
      if (faces(A, B, axis) && faces(B, A, axis)) return true;
      const across = (T) => !isZero({ x: T.dx, y: T.dy }) && (axis === 'y' ? !isH({ x: T.dx, y: T.dy }) : isH({ x: T.dx, y: T.dy }));
      return across(A) && across(B) && A.dx * B.dx + A.dy * B.dy > 0.5;
    };
    for (const axis of ['y', 'x']) {
      const along = axis === 'y' ? 'x' : 'y';
      const items = [];
      // Wires that are already straight keep their parts in place.
      const locked = new Set();
      for (const w of doc.wires) {
        if (w.a.c === w.b.c) continue;
        const e = ends(w);
        if (!e) continue;
        const off = Math.abs(e.B[axis] - e.A[axis]);
        if (off > tol || Math.abs(e.B[along] - e.A[along]) < 1e-6) continue;
        if (off < 1e-6) { locked.add(w.a.c); locked.add(w.b.c); continue; }
        if (!suits(e.A, e.B, axis)) continue;
        items.push({ w, off });
      }
      items.sort((p, q) => p.off - q.off);
      for (const { w } of items) {
        const e = ends(w);
        const off = e.B[axis] - e.A[axis];
        if (Math.abs(off) < 1e-6) { locked.add(w.a.c); locked.add(w.b.c); continue; }
        if (Math.abs(off) > tol) continue;
        // Move a junction before a part, and a part with fewer connections first.
        const movable = [w.b.c, w.a.c].filter((id) => !locked.has(id) && lay.comps[id])
          .sort((p, q) => (isJunction(q) - isJunction(p)) || ((degree.get(p) || 0) - (degree.get(q) || 0)));
        for (const id of movable) {
          const pl = lay.comps[id];
          const shift = id === w.b.c ? -off : off;
          pl[axis] += shift;
          if (!clashes(id)) { locked.add(w.a.c); locked.add(w.b.c); break; }
          pl[axis] -= shift;
        }
      }
    }
  }

  function mean(list) {
    const m = { x: 0, y: 0 };
    for (const p of list) { m.x += p.x; m.y += p.y; }
    m.x /= list.length; m.y /= list.length;
    return m;
  }

  // Bounding box of everything in a view.
  function viewBounds(doc, view) {
    let b = null;
    const grow = (x, y) => {
      if (!b) b = { x, y, x2: x, y2: y };
      else { b.x = Math.min(b.x, x); b.y = Math.min(b.y, y); b.x2 = Math.max(b.x2, x); b.y2 = Math.max(b.y2, y); }
    };
    for (const c of doc.components) {
      const cb = compBounds(doc, view, c.id);
      if (cb) { grow(cb.x, cb.y); grow(cb.x2, cb.y2); }
    }
    for (const w of doc.wires) for (const [x, y] of wirePoints(doc, view, w)) grow(x, y);
    return b;
  }

  const api = {
    GRID, VIEWS, artFor, snap, xform, toLocal, xdir, normRot, quarterTurn, placement, termWorld, terminalsLocal, localBounds, compBounds, svgTransform,
    wireRoute, routeAll, branchPoints, canMove, wirePoints, orthoRoute, nearestOnPoly, pointAtFraction, splitWire, generateLayout, placeInOtherViews,
    resolveOverlaps, viewBounds, overlaps, tidy, tidyCost, distributeRuns, seriesParallel, layoutSeriesParallel
  };
  PPC.layout = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof globalThis === 'object' ? globalThis : this);
