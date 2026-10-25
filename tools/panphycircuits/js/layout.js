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

  // Local -> world for a placement {x, y, r (quarter turns), f (mirror x)}.
  function xform(pl, x, y) {
    if (pl.f) x = -x;
    let X = x, Y = y;
    switch (pl.r & 3) {
      case 1: X = -y; Y = x; break;
      case 2: X = -x; Y = -y; break;
      case 3: X = y; Y = -x; break;
      default: break;
    }
    return { x: pl.x + X, y: pl.y + Y };
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
    const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y);
    return { x: Math.min(...xs), y: Math.min(...ys), x2: Math.max(...xs), y2: Math.max(...ys) };
  }

  function svgTransform(pl) {
    return `translate(${pl.x} ${pl.y}) rotate(${(pl.r & 3) * 90}) scale(${pl.f ? -1 : 1} 1)`;
  }

  // ---------- Wire routes ----------

  function wirePoints(doc, view, wire) {
    const lay = doc.layouts[view].wires[wire.id];
    return lay && lay.pts ? lay.pts : [];
  }

  const isH = (d) => d && Math.abs(d.x) > Math.abs(d.y);
  const isZero = (d) => !d || (Math.abs(d.x) < 1e-9 && Math.abs(d.y) < 1e-9);

  // Orthogonal route through the control points. d0/d1 are the outward
  // directions of the terminals at each end.
  function orthoRoute(p0, d0, pts, p1, d1) {
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
        if (col) { out[out.length - 1] = { x: p.x, y: p.y }; continue; }
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
      if (c.type === 'junction') continue;
      const b = compBounds(doc, view, c.id);
      if (b) out.push({ id: c.id, x: b.x + 3, y: b.y + 3, x2: b.x2 - 3, y2: b.y2 - 3 });
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

  function routeCost(poly, A, dA, B, dB, obstacles, avoid) {
    let cost = 0;
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
    const S = 20;
    const a1 = isZero(dA) ? { x: A.x, y: A.y } : { x: A.x + dA.x * S, y: A.y + dA.y * S };
    const b1 = isZero(dB) ? { x: B.x, y: B.y } : { x: B.x + dB.x * S, y: B.y + dB.y * S };
    const xs = new Set([snap((a1.x + b1.x) / 2), a1.x, b1.x]);
    const ys = new Set([snap((a1.y + b1.y) / 2), a1.y, b1.y]);
    const box = { x: Math.min(A.x, B.x) - 120, y: Math.min(A.y, B.y) - 120, x2: Math.max(A.x, B.x) + 120, y2: Math.max(A.y, B.y) + 120 };
    for (const r of obstacles) {
      if (!overlaps(r, box, 0)) continue;
      xs.add(snap(r.x - 17)); xs.add(snap(r.x2 + 17)); ys.add(snap(r.y - 17)); ys.add(snap(r.y2 + 17));
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
      const r = wireRoute(doc, view, w, null, { obstacles, avoid });
      if (!r) continue;
      out.set(w.id, r);
      if (view === 'schematic') for (let i = 0; i < r.poly.length - 1; i++) avoid.push({ a: r.poly[i], b: r.poly[i + 1] });
    }
    return out;
  }

  // Route of a wire in a view: { d (SVG path), poly (sampled points), segIndex (per poly point: control interval) }.
  function wireRoute(doc, view, wire, override, ctx) {
    const A = override && override.a ? override.a : termWorld(doc, view, wire.a);
    const B = override && override.b ? override.b : termWorld(doc, view, wire.b);
    if (!A || !B) return null;
    const pts = override && override.pts ? override.pts : wirePoints(doc, view, wire);
    const d0 = { x: A.dx, y: A.dy }, d1 = { x: B.dx, y: B.dy };
    if (view === 'schematic') {
      const auto = !pts.length && !override;
      const poly = auto ? autoOrtho(A, d0, B, d1, (ctx && ctx.obstacles) || obstacleRects(doc, view), (ctx && ctx.avoid) || []) : orthoRoute(A, d0, pts, B, d1);
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
      const poly = quickPoly(view, A, B, obstacles, cache);
      routes.push({ w, poly, box: polyBox(poly) });
      for (let i = 0; i < poly.length - 1; i++) cost += Math.hypot(poly[i + 1].x - poly[i].x, poly[i + 1].y - poly[i].y);
      if (view === 'schematic') cost += 30 * Math.max(0, poly.length - 2);
      else if (Math.abs(A.x - B.x) < 0.5 || Math.abs(A.y - B.y) < 0.5) cost -= 20;
      const u = unit(B.x - A.x, B.y - A.y);
      if (!isZero({ x: A.dx, y: A.dy }) && A.dx * u.x + A.dy * u.y < -0.2) { cost += 120; rep.backwards++; }
      if (!isZero({ x: B.dx, y: B.dy }) && -(B.dx * u.x + B.dy * u.y) < -0.2) { cost += 120; rep.backwards++; }
      for (const s of solid) {
        if (!overlaps(s.body, routes[routes.length - 1].box, 0)) continue;
        for (let i = 0; i < poly.length - 1; i++) if (segHitsRect(poly[i], poly[i + 1], s.body)) { cost += 900; rep.overParts++; break; }
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
        if (!isJunction(id)) for (const o of orients) if ((o.r !== pl.r || o.f !== pl.f) && tryState(pl, o)) improved = true;
        for (const [dx, dy] of shifts) if (tryState(pl, { x: pl.x + dx, y: pl.y + dy })) improved = true;
        if (!isJunction(id)) {
          // A move and a turn together, for parts that only fit once turned.
          const x0 = pl.x, y0 = pl.y;
          for (const o of orients) for (const [dx, dy] of shifts) {
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
    for (const c of doc.components) {
      const pl = lay.comps[c.id];
      if (pl) { pl.x = snap(pl.x); pl.y = snap(pl.y); }
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
    for (const step of [() => alignParts(doc, view, tol), () => resolveOverlaps(doc, view, doc.components.map((c) => c.id), [], 4)]) {
      const saved = JSON.stringify(lay.comps), cost = tidyCost(doc, view);
      step();
      if (tidyCost(doc, view) > cost + 0.5) lay.comps = JSON.parse(saved);
    }
    for (const w of doc.wires) lay.wires[w.id] = { pts: [] };
    return JSON.stringify(lay) !== before;
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
    GRID, VIEWS, artFor, snap, xform, xdir, placement, termWorld, terminalsLocal, localBounds, compBounds, svgTransform,
    wireRoute, routeAll, wirePoints, orthoRoute, nearestOnPoly, pointAtFraction, splitWire, generateLayout, placeInOtherViews,
    resolveOverlaps, viewBounds, overlaps, tidy, tidyCost
  };
  PPC.layout = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof globalThis === 'object' ? globalThis : this);
