// PanPhyCircuits: circuit solver and simulation engine.
//
// Modified nodal analysis (MNA) on the shared circuit:
// - Each net (terminals joined by wires) is a node. Components compile into
//   primitives: conductances, ideal voltage sources (V-edges), current sources,
//   capacitors, inductors and nonlinear elements.
// - The circuit is split into networks (groups of nodes joined by primitives).
//   Each network is solved on its own, relative to its own reference node, so a
//   voltage between separate networks is undefined rather than invented.
// - Loops made only of ideal voltage sources, ideal meters, closed switches and
//   zero resistances are found before solving. A loop whose EMFs do not sum to zero
//   is a short circuit or a conflict and is reported; a loop whose EMFs do sum to
//   zero leaves the current around it undefined, so those currents are reported as
//   undefined instead of being made up.
// - Nonlinear elements use Newton-Raphson with junction voltage limiting, with
//   source stepping as a fallback. Failure to converge is reported.
// - Capacitors and inductors use companion models: backward Euler for the first step after a
//   change, then BDF2 (second order, no numerical ringing).
// - Logic modules settle one gate at a time (zero propagation delay).
(function (root) {
  const PPC = root.PPC = root.PPC || {};
  // The shortest automatic time step, which keeps the simulation near real time.
  const MIN_DT = 1e-6;
  // A step this many times longer than a part needs visibly damps oscillations.
  const COARSE_STEP = 10;
  const registry = PPC.registry || (typeof require === 'function' ? require('./registry.js') : null);
  const circuit = PPC.circuit || (typeof require === 'function' ? require('./circuit.js') : null);
  const units = PPC.units || (typeof require === 'function' ? require('./units.js') : null);
  const { LOGIC } = registry;

  const MAX_NEWTON = 120;
  const V_TOL = 1e-7;
  const EMF_TOL = 1e-9;

  // ---------- Compile ----------

  function compile(doc, opts = {}) {
    const pressed = opts.pressed || {};
    const { nets, netOf } = circuit.buildNets(doc);
    const nodes = nets.map((n) => ({ key: n.key, global: n.global }));
    const prims = [];
    const logicComps = [];
    const notes = [];
    let currentOwner = null;
    let internalCount = 0;

    function globalNode(name) {
      let idx = nodes.findIndex((n) => n.global && n.global.split('+').includes(name));
      if (idx < 0) { idx = nodes.length; nodes.push({ key: '@' + name, global: name }); }
      return { n: idx, term: null };
    }

    const b = {
      node() { nodes.push({ key: currentOwner + '#' + (internalCount++), global: null }); return { n: nodes.length - 1, term: null }; },
      global: globalNode,
      R(p, q, R) {
        if (!(R > 0) || R < 1e-9) return b.V(p, q, 0, { short: true, zeroR: true });
        prims.push({ k: 'G', a: p, b: q, g: 1 / R, owner: currentOwner });
      },
      V(p, q, v, o = {}) { prims.push({ k: 'V', a: p, b: q, v, owner: currentOwner, ...o }); },
      I(p, q, i) { prims.push({ k: 'I', a: p, b: q, i, owner: currentOwner }); },
      L(p, q, L, i0) { prims.push({ k: 'L', a: p, b: q, l: L, i0: i0 || 0, owner: currentOwner }); },
      C(p, q, C, v0) { prims.push({ k: 'C', a: p, b: q, c: C, v0: v0 || 0, owner: currentOwner }); },
      transformer(ns, np, nsTurns) {
        const lp = 10 * (np / 100) ** 2, ls = 10 * (nsTurns / 100) ** 2;
        prims.push({ k: 'T', nodes: ns, lp, ls, m: 0.999 * Math.sqrt(lp * ls),
          rp: 0.01 * lp, rs: 0.01 * ls, owner: currentOwner });
      },
      NL(ns, model, kind) { prims.push({ k: 'N', nodes: ns, model, kind, st: {}, owner: currentOwner }); },
      logicIn(p, id) {
        const lg = globalNode('LG');
        prims.push({ k: 'G', a: p, b: lg, g: 1 / LOGIC.pullDown, owner: currentOwner, hidden: true });
        logicCurrent.ins.push({ id, node: p.n });
      },
      logicOut(p, id) {
        const lg = globalNode('LG');
        const owner = currentOwner;
        const g = 1 / LOGIC.outputResistance;
        prims.push({ k: 'G', a: p, b: lg, g, owner, hidden: true });
        prims.push({ k: 'I', a: lg, b: p, i: (ctx) => (ctx.logic[owner] && ctx.logic[owner][id] ? LOGIC.high * g : 0), owner, hidden: true, logicSource: true });
        logicCurrent.outs.push({ id, node: p.n });
      }
    };
    let logicCurrent = null;

    for (const c of doc.components) {
      const def = registry.get(c.type);
      const T = {};
      for (const t of def.terminals) T[t.id] = { n: netOf.get(c.id + ':' + t.id), term: t.id };
      currentOwner = c.id;
      internalCount = 0;
      logicCurrent = def.logic ? { comp: c, def, ins: [], outs: [] } : null;
      def.compile(c, T, b, { pressed });
      if (logicCurrent) logicComps.push(logicCurrent);
    }
    // The hidden logic supply holds +5 V on the VCC rail relative to 0 V.
    if (nodes.some((n) => n.global && n.global.split('+').includes('VCC'))) {
      currentOwner = '@supply';
      const vcc = globalNode('VCC'), lg = globalNode('LG');
      prims.push({ k: 'V', a: vcc, b: lg, v: LOGIC.supply, owner: '@supply', ideal: true, hidden: true });
    }

    // Networks: union-find over primitive connections.
    const parent = nodes.map((_, i) => i);
    const find = (i) => { while (parent[i] !== i) { parent[i] = parent[parent[i]]; i = parent[i]; } return i; };
    const join = (a, b2) => { const ra = find(a), rb = find(b2); if (ra !== rb) parent[ra] = rb; };
    for (const p of prims) {
      const ns = p.nodes || [p.a, p.b];
      if (p.k === 'T') { join(ns[0].n, ns[1].n); join(ns[2].n, ns[3].n); }
      else for (let j = 1; j < ns.length; j++) join(ns[0].n, ns[j].n);
    }
    // Preserve galvanic islands for voltage readings and independent references.
    const galvanicOf = nodes.map((_, i) => find(i));
    for (const p of prims) if (p.k === 'T') join(p.nodes[0].n, p.nodes[2].n);
    const networkOf = new Array(nodes.length);
    const networks = [];
    const rootIndex = new Map();
    nodes.forEach((node, i) => {
      const r = find(i);
      if (!rootIndex.has(r)) { rootIndex.set(r, networks.length); networks.push({ index: networks.length, nodes: [], prims: [], ref: -1 }); }
      const net = networks[rootIndex.get(r)];
      net.nodes.push(i);
      networkOf[i] = net.index;
    });
    for (const p of prims) {
      const n0 = p.nodes ? p.nodes[0].n : p.a.n;
      networks[networkOf[n0]].prims.push(p);
    }
    for (const net of networks) {
      const lg = net.nodes.find((i) => nodes[i].global && nodes[i].global.split('+').includes('LG'));
      if (lg !== undefined) { net.ref = lg; net.hasLogic = true; continue; }
      // Prefer the negative terminal of a source as the reference (cosmetic only).
      const src = net.prims.find((p) => p.k === 'V' && p.ideal);
      net.ref = src ? src.b.n : net.nodes[0];
    }

    for (const net of networks) {
      const refs = new Map([[galvanicOf[net.ref], net.ref]]);
      for (const i of net.nodes) if (!refs.has(galvanicOf[i])) refs.set(galvanicOf[i], i);
      net.refs = new Set(refs.values());
    }

    // Time step suggestion and AC frequencies (per electrical network).
    let dtSuggest = 0.005;
    // The shortest step any oscillation needs (LC circuits and AC supplies), before the 1 µs
    // floor, and the parts that need it. A too-coarse step damps an oscillation, but only
    // speeds up an RC or RL decay that is over within a microsecond anyway.
    let dtNeed = Infinity;
    let dtNeedComps = [];
    const need = (dt, owners, oscillation) => {
      dtSuggest = Math.min(dtSuggest, dt);
      if (oscillation && dt < dtNeed) { dtNeed = dt; dtNeedComps = [...new Set(owners.filter(Boolean))]; }
    };
    let acMin = Infinity;
    for (const net of networks) net.acMin = Infinity;
    for (const c of doc.components) {
      const def = registry.get(c.type);
      const step = def.timeStep && def.timeStep(c);
      if (step > 0) need(step, [c.id], true);
      const freq = def.acFrequency && def.acFrequency(c);
      if (!(freq > 0)) continue;
      acMin = Math.min(acMin, freq);
      // An AC supply joins its two terminals; either terminal's network is fine.
      const terminal = def.terminals[0];
      const ni = networkOf[netOf.get(c.id + ':' + terminal.id)];
      if (ni !== undefined) networks[ni].acMin = Math.min(networks[ni].acMin, freq);
    }
    for (const p of prims) {
      if (p.k !== 'C') continue;
      let rMin = Infinity;
      for (const q of prims) {
        if (q.k !== 'G' || typeof q.g !== 'number' || q.owner === p.owner) continue;
        if ([q.a.n, q.b.n].some((n) => n === p.a.n || n === p.b.n)) rMin = Math.min(rMin, 1 / q.g);
      }
      if (Number.isFinite(rMin)) need((p.c * rMin) / 100, [p.owner]);
    }
    for (const p of prims) {
      if (p.k !== 'L') continue;
      const net = networks[networkOf[p.a.n]];
      // Prefer the series sum of passive resistances (typical RL loops). When the
      // only discharge path is a voltmeter, use that meter's resistance instead.
      const resistors = net.prims.filter((q) => q.k === 'G' && typeof q.g === 'number' && !q.hidden);
      const passive = resistors.filter((q) => circuit.getComp(doc, q.owner)?.type !== 'voltmeter');
      let resistance = passive.reduce((sum, q) => sum + 1 / q.g, 0);
      if (!(resistance > 0)) {
        const gTouch = resistors.filter((q) => [q.a.n, q.b.n].some((n) => n === p.a.n || n === p.b.n))
          .reduce((sum, q) => sum + q.g, 0);
        if (gTouch > 0) resistance = 1 / gTouch;
      }
      if (resistance > 0) need(p.l / resistance / 100, [p.owner]);
      for (const q of net.prims) if (q.k === 'C') need(Math.sqrt(p.l * q.c) / 100, [p.owner, q.owner], true);
    }
    dtSuggest = Math.min(0.01, Math.max(MIN_DT, dtSuggest));

    return { doc, nodes, galvanicOf, prims, networks, networkOf, netOf, nets, logicComps, dtSuggest, dtNeed, dtNeedComps, acMin, notes, hasCaps: prims.some((p) => p.k === 'C'), hasInductors: prims.some((p) => p.k === 'L' || p.k === 'T') };
  }

  // ---------- Linear algebra ----------

  // Solve A x = z in place by Gaussian elimination with partial pivoting.
  // Returns null if the matrix is singular.
  function solveLinear(A, z, n) {
    let scale = 0;
    for (let i = 0; i < n * n; i++) scale = Math.max(scale, Math.abs(A[i]));
    if (scale === 0) scale = 1;
    const tiny = 1e-15 * scale;
    for (let col = 0; col < n; col++) {
      let piv = col, best = Math.abs(A[col * n + col]);
      for (let r = col + 1; r < n; r++) {
        const v = Math.abs(A[r * n + col]);
        if (v > best) { best = v; piv = r; }
      }
      if (best <= tiny) return null;
      if (piv !== col) {
        for (let k = 0; k < n; k++) { const t = A[col * n + k]; A[col * n + k] = A[piv * n + k]; A[piv * n + k] = t; }
        const t = z[col]; z[col] = z[piv]; z[piv] = t;
      }
      const d = A[col * n + col];
      for (let r = col + 1; r < n; r++) {
        const f = A[r * n + col] / d;
        if (f === 0) continue;
        for (let k = col; k < n; k++) A[r * n + k] -= f * A[col * n + k];
        z[r] -= f * z[col];
      }
    }
    const x = new Float64Array(n);
    for (let r = n - 1; r >= 0; r--) {
      let s = z[r];
      for (let k = r + 1; k < n; k++) s -= A[r * n + k] * x[k];
      x[r] = s / A[r * n + r];
    }
    return x;
  }

  function valueOf(v, ctx, lambda) {
    return (typeof v === 'function' ? v(ctx) : v) * lambda;
  }

  // ---------- Ideal loop analysis ----------

  // Find loops of V-edges. Returns { kept, dropped, conflicts, undefinedPrims }.
  function analyseVoltageLoops(net, ctx) {
    const parent = new Map();
    const find = (i) => { if (!parent.has(i)) parent.set(i, i); while (parent.get(i) !== i) i = parent.get(i); return i; };
    const adj = new Map();
    const link = (n, e) => { if (!adj.has(n)) adj.set(n, []); adj.get(n).push(e); };
    const kept = [], conflicts = [], undefinedPrims = new Set();
    for (const p of net.prims) {
      if (p.k !== 'V') continue;
      const a = p.a.n, b = p.b.n;
      const v = valueOf(p.v, ctx, 1);
      if (a === b) {
        if (Math.abs(v) > EMF_TOL) conflicts.push([p]);
        else undefinedPrims.add(p);
        continue;
      }
      if (find(a) !== find(b)) {
        parent.set(find(a), find(b));
        link(a, p); link(b, p);
        kept.push(p);
        continue;
      }
      // Path through the forest from a to b, tracking potentials.
      const phi = new Map([[a, 0]]);
      const via = new Map();
      const queue = [a];
      while (queue.length) {
        const x = queue.shift();
        if (x === b) break;
        for (const e of adj.get(x) || []) {
          const y = e.a.n === x ? e.b.n : e.a.n;
          if (phi.has(y)) continue;
          const ve = valueOf(e.v, ctx, 1);
          phi.set(y, e.a.n === x ? phi.get(x) - ve : phi.get(x) + ve);
          via.set(y, e);
          queue.push(y);
        }
      }
      const loop = [p];
      for (let y = b; y !== a; ) { const e = via.get(y); loop.push(e); y = e.a.n === y ? e.b.n : e.a.n; }
      const mismatch = v - (phi.get(a) - phi.get(b));
      if (Math.abs(mismatch) > EMF_TOL + EMF_TOL * Math.abs(v)) conflicts.push(loop);
      else for (const e of loop) undefinedPrims.add(e);
    }
    return { kept, conflicts, undefinedPrims };
  }

  function describeConflict(loop, doc) {
    const owners = [...new Set(loop.map((p) => p.owner))];
    const comps = owners.filter((o) => o[0] !== '@');
    const names = comps.map((id) => circuit.getComp(doc, id)).filter(Boolean);
    const sources = loop.filter((p) => p.ideal);
    const meters = names.filter((c) => c.type === 'ammeter');
    const list = names.map((c) => c.label).join(', ');
    let msg;
    if (owners.includes('@supply') && sources.length === 1) msg = 'Short circuit across the 5 V logic supply: the +5 V and 0 V rails are joined.';
    else if (sources.length >= 2) msg = `Conflicting ideal sources: ${list} form a loop with no resistance, and their EMFs do not add up to zero.`;
    else if (sources.length === 1) msg = `Short circuit: ${list} form a loop with no resistance, so the current would be infinite.`;
    else msg = `Unsolvable loop with no resistance: ${list}.`;
    if (meters.length && sources.length) msg += ` An ammeter has (almost) no resistance; connect ${meters.map((m) => m.label).join(', ')} in series with a component, not across a source.`;
    else if (sources.length) msg += ' Add resistance, or give the source internal resistance.';
    return { msg, comps };
  }

  // ---------- Network solve ----------

  function solveNetwork(compiled, net, ctx, warm, lambda) {
    const { nodes } = compiled;
    const u = new Map();
    let nU = 0;
    for (const i of net.nodes) if (!net.refs.has(i)) u.set(i, nU++);
    // Frozen time (edits and pause): capacitors hold their stored p.d. as ideal
    // voltage sources; inductors hold their stored current as current sources.
    // That keeps readings at the committed energy state instead of advancing one
    // backward-Euler step on every re-solve. An open transformer winding (only
    // ideal meters) has nowhere for a held current to flow, so it freezes its
    // last p.d. as a voltage source instead — otherwise the matrix is singular.
    const holdCapVs = [];
    const holdT = new Map();
    if (ctx.method === 'hold') {
      for (const p of net.prims) {
        if (p.k === 'C') {
          const h = ctx.capHist[p.owner] || { v1: p.v0 };
          holdCapVs.push({ k: 'V', a: p.a, b: p.b, v: h.v1, owner: p.owner, holdCap: p });
        } else if (p.k === 'T') {
          const h = ctx.indHist[p.owner] || { i1: 0, j1: 0 };
          const ih = [h.i1 || 0, h.j1 || 0];
          const open = [];
          for (let k = 0; k < 2; k++) {
            const na = p.nodes[2 * k], nb = p.nodes[2 * k + 1];
            const g0 = compiled.galvanicOf[na.n];
            const closed = net.prims.some((q) => {
              if (q === p) return false;
              if (!(q.k === 'G' || q.k === 'V' || q.k === 'I' || q.k === 'C' || q.k === 'N' || q.k === 'L')) return false;
              const qns = q.nodes || [q.a, q.b];
              return qns.some((n) => compiled.galvanicOf[n.n] === g0);
            });
            if (closed) { open.push(null); continue; }
            const va = warm.get(nodes[na.n].key) ?? 0;
            const vb = warm.get(nodes[nb.n].key) ?? 0;
            const edge = { k: 'V', a: na, b: nb, v: va - vb, owner: p.owner, holdWind: p };
            holdCapVs.push(edge);
            open.push(edge);
          }
          holdT.set(p, { ih, open });
        }
      }
    }
    const loopNet = holdCapVs.length ? { prims: net.prims.concat(holdCapVs) } : net;
    const loops = analyseVoltageLoops(loopNet, ctx);
    if (loops.conflicts.length) return { ok: false, conflicts: loops.conflicts };
    const vEdges = loops.kept;
    const size = nU + vEdges.length;
    const idx = (n) => (net.refs.has(n) ? -1 : u.get(n));

    // Linear part.
    const Alin = new Float64Array(size * size);
    const zlin = new Float64Array(size);
    const addA = (r, c, v) => { if (r >= 0 && c >= 0) Alin[r * size + c] += v; };
    const addZ = (r, v) => { if (r >= 0) zlin[r] += v; };
    const capInfo = [], indInfo = [];
    for (const p of net.prims) {
      if (p.k === 'G') {
        const a = idx(p.a.n), b = idx(p.b.n);
        const g = valueOf(p.g, ctx, 1);
        addA(a, a, g); addA(b, b, g); addA(a, b, -g); addA(b, a, -g);
      } else if (p.k === 'I') {
        const i = valueOf(p.i, ctx, lambda);
        addZ(idx(p.a.n), -i); addZ(idx(p.b.n), i);
      } else if (p.k === 'L') {
        const h = ctx.indHist[p.owner] || { i1: p.i0 || 0, j1: 0 };
        if (ctx.method === 'hold') {
          // An isolated inductor has nowhere for the current to go; report the
          // stored current without injecting an impossible source.
          const closed = net.prims.some((q) => q !== p && (q.k === 'G' || q.k === 'V' || q.k === 'I' || q.k === 'C' || q.k === 'N' || q.k === 'T' || q.k === 'L'));
          indInfo.push({ p, hold: true, ihist: h.i1 });
          if (closed) { addZ(idx(p.a.n), -h.i1); addZ(idx(p.b.n), h.i1); }
        } else {
          const bdf2 = h.i2 !== undefined && ctx.method === 'bdf2';
          const geq = (bdf2 ? 2 / 3 : 1) * ctx.dt / p.l;
          const ihist = bdf2 ? (4 * h.i1 - h.i2) / 3 : h.i1;
          indInfo.push({ p, geq, ihist });
          const a = idx(p.a.n), b = idx(p.b.n);
          addA(a, a, geq); addA(b, b, geq); addA(a, b, -geq); addA(b, a, -geq);
          addZ(a, -ihist); addZ(b, ihist);
        }
      } else if (p.k === 'T') {
        const h = ctx.indHist[p.owner] || { i1: 0, j1: 0 };
        if (ctx.method === 'hold') {
          const { ih, open } = holdT.get(p);
          indInfo.push({ p, hold: true, ih });
          for (let k = 0; k < 2; k++) {
            if (open[k]) continue;
            const x = idx(p.nodes[2 * k].n), y = idx(p.nodes[2 * k + 1].n);
            addZ(x, -ih[k]); addZ(y, ih[k]);
          }
        } else {
          const bdf2 = h.i2 !== undefined && ctx.method === 'bdf2';
          const a = (bdf2 ? 1.5 : 1) / ctx.dt;
          const ip = bdf2 ? (4 * h.i1 - h.i2) / 3 : h.i1;
          const js = bdf2 ? (4 * h.j1 - h.j2) / 3 : h.j1;
          const A = p.rp + a * p.lp, D = p.rs + a * p.ls, B = a * p.m;
          const det = A * D - B * B;
          const g = [[D / det, -B / det], [-B / det, A / det]];
          const history = [a * (p.lp * ip + p.m * js), a * (p.m * ip + p.ls * js)];
          const ih = g.map((row) => row[0] * history[0] + row[1] * history[1]);
          indInfo.push({ p, g, ih });
          for (let k = 0; k < 2; k++) {
            const x = idx(p.nodes[2 * k].n), y = idx(p.nodes[2 * k + 1].n);
            addZ(x, -ih[k]); addZ(y, ih[k]);
            for (let j = 0; j < 2; j++) {
              const v = idx(p.nodes[2 * j].n), w = idx(p.nodes[2 * j + 1].n);
              addA(x, v, g[k][j]); addA(x, w, -g[k][j]);
              addA(y, v, -g[k][j]); addA(y, w, g[k][j]);
            }
          }
        }
      } else if (p.k === 'C') {
        if (ctx.method === 'hold') {
          const edge = holdCapVs.find((e) => e.holdCap === p);
          capInfo.push({ p, hold: true, edge });
        } else {
          const h = ctx.capHist[p.owner] || { v1: p.v0 };
          let geq, ihist;
          if (h.v2 !== undefined && ctx.method === 'bdf2') { geq = (3 * p.c) / (2 * ctx.dt); ihist = (p.c * (4 * h.v1 - h.v2)) / (2 * ctx.dt); }
          else { geq = p.c / ctx.dt; ihist = geq * h.v1; }
          capInfo.push({ p, geq, ihist });
          const a = idx(p.a.n), b = idx(p.b.n);
          addA(a, a, geq); addA(b, b, geq); addA(a, b, -geq); addA(b, a, -geq);
          addZ(a, ihist); addZ(b, -ihist);
        }
      }
    }
    vEdges.forEach((p, k) => {
      const row = nU + k, a = idx(p.a.n), b = idx(p.b.n);
      if (a >= 0) { Alin[a * size + row] += 1; Alin[row * size + a] += 1; }
      if (b >= 0) { Alin[b * size + row] -= 1; Alin[row * size + b] -= 1; }
      zlin[row] += valueOf(p.v, ctx, lambda);
    });
    const nl = net.prims.filter((p) => p.k === 'N');

    // Node voltages (ref = 0), warm-started.
    const V = new Float64Array(nodes.length);
    for (const i of net.nodes) V[i] = net.refs.has(i) ? 0 : (warm.get(nodes[i].key) ?? 0);
    for (const p of nl) if (ctx.nlState && ctx.nlState[p.owner + p.kind]) Object.assign(p.st, ctx.nlState[p.owner + p.kind]);

    // An isolated inductor in hold mode stamps nothing: report stored current at 0 V.
    let stamped = nl.length > 0;
    if (!stamped) {
      for (let i = 0; i < size * size && !stamped; i++) if (Alin[i] !== 0) stamped = true;
      for (let i = 0; i < size && !stamped; i++) if (zlin[i] !== 0) stamped = true;
    }
    if (!stamped) {
      const primI = new Map();
      for (const p of net.prims) {
        if (p.k === 'L') {
          const info = indInfo.find((q) => q.p === p);
          const ia = info ? info.ihist : 0;
          primI.set(p, [ia, -ia]);
        } else if (p.k === 'T') {
          const info = indInfo.find((q) => q.p === p);
          const ih = info && info.ih ? info.ih : [0, 0];
          primI.set(p, [ih[0], -ih[0], ih[1], -ih[1]]);
        } else {
          const ns = p.nodes || [p.a, p.b];
          primI.set(p, ns.map(() => 0));
        }
      }
      return { ok: true, V, primI, loops, capInfo, indInfo };
    }

    let x = null;
    let converged = nl.length === 0;
    const maxIter = nl.length ? MAX_NEWTON : 1;
    for (let iter = 0; iter < maxIter; iter++) {
      const A = Alin.slice();
      const z = zlin.slice();
      let limited = false;
      for (const p of nl) {
        const vs = p.nodes.map((t) => V[t.n]);
        const res = p.model.eval(vs, p.st);
        if (p.st.limited) limited = true;
        p.nodes.forEach((tk, k) => {
          const r = idx(tk.n);
          if (r < 0) return;
          let lin = res.i[k];
          p.nodes.forEach((tj, j) => {
            const cidx = idx(tj.n);
            lin -= res.J[k][j] * res.v0[j];
            if (cidx >= 0) A[r * size + cidx] += res.J[k][j];
          });
          z[r] -= lin;
        });
      }
      x = solveLinear(A, z, size);
      if (!x) return { ok: false, singular: true };
      let maxDelta = 0;
      for (const [n, r] of u) {
        const d = Math.abs(x[r] - V[n]);
        if (!Number.isFinite(x[r])) return { ok: false, diverged: true };
        if (d > maxDelta) maxDelta = d;
        V[n] = x[r];
      }
      if (nl.length && iter > 0 && !limited && maxDelta < V_TOL * (1 + Math.max(...[...u.values()].map((r) => Math.abs(x[r])), 0))) { converged = true; break; }
    }
    if (!converged) return { ok: false, noConvergence: true };
    if (!x) x = new Float64Array(0);

    // Currents into each primitive at each of its nodes.
    const primI = new Map();
    for (const p of net.prims) {
      let ia;
      if (p.k === 'G') ia = valueOf(p.g, ctx, 1) * (V[p.a.n] - V[p.b.n]);
      else if (p.k === 'I') ia = valueOf(p.i, ctx, lambda);
      else if (p.k === 'V') {
        const k = vEdges.indexOf(p);
        ia = loops.undefinedPrims.has(p) ? NaN : (k >= 0 ? x[nU + k] : NaN);
      } else if (p.k === 'L') {
        const info = indInfo.find((q) => q.p === p);
        ia = info.hold ? info.ihist : info.geq * (V[p.a.n] - V[p.b.n]) + info.ihist;
      } else if (p.k === 'C') {
        const info = capInfo.find((q) => q.p === p);
        if (info.hold) {
          const k = vEdges.indexOf(info.edge);
          ia = k >= 0 ? x[nU + k] : NaN;
        } else {
          ia = info.geq * (V[p.a.n] - V[p.b.n]) - info.ihist;
        }
      }
      if (p.k === 'T') {
        const info = indInfo.find((q) => q.p === p);
        if (info.hold) {
          const [ip, js] = info.ih;
          primI.set(p, [ip, -ip, js, -js]);
        } else {
          const { g, ih } = info;
          const vp = V[p.nodes[0].n] - V[p.nodes[1].n], vs = V[p.nodes[2].n] - V[p.nodes[3].n];
          const ip = g[0][0] * vp + g[0][1] * vs + ih[0];
          const js = g[1][0] * vp + g[1][1] * vs + ih[1];
          primI.set(p, [ip, -ip, js, -js]);
        }
      } else if (p.k === 'N') {
        const vs = p.nodes.map((t) => V[t.n]);
        const st = Object.assign({}, p.st);
        const res = p.model.eval(vs, st);
        primI.set(p, res.i.map((ik, k) => ik + p.nodes.reduce((s, tj, j) => s + res.J[k][j] * (vs[j] - res.v0[j]), 0)));
      } else {
        primI.set(p, [ia, -ia]);
      }
    }
    return { ok: true, V, primI, loops, capInfo, indInfo };
  }

  // Solve every network, with logic settling and source stepping as needed.
  function solveAll(compiled, ctx, warm) {
    const results = new Array(compiled.networks.length);
    const doc = compiled.doc;
    const errors = [];
    const solveOne = (net) => {
      let r = solveNetwork(compiled, net, ctx, warm, 1);
      if (!r.ok && r.noConvergence) {
        // Source stepping: ramp all sources from 10 % to 100 %.
        let w = new Map(warm);
        for (let s = 1; s <= 10; s++) {
          r = solveNetwork(compiled, net, ctx, w, s / 10);
          if (!r.ok) break;
          w = new Map(w);
          for (const i of net.nodes) w.set(compiled.nodes[i].key, r.V[i]);
        }
      }
      return r;
    };
    // Logic settles one module at a time; other networks are solved once.
    for (const net of compiled.networks) if (!net.hasLogic) results[net.index] = solveOne(net);
    const logicNet = compiled.networks.find((n) => n.hasLogic);
    let settled = true;
    if (logicNet) {
      settled = false;
      for (let pass = 0; pass < 4 * compiled.logicComps.length + 8; pass++) {
        const r = solveOne(logicNet);
        results[logicNet.index] = r;
        if (!r.ok) { settled = true; break; }
        const ins = readLogicInputs(compiled, r.V, ctx);
        ctx.inputs = ins;
        let changed = false;
        for (const lc of compiled.logicComps) {
          const inp = ins[lc.comp.id] || {};
          const out = lc.def.logic.eval(inp, lc.comp);
          const cur = ctx.logic[lc.comp.id] || {};
          if (Object.keys(out).some((k) => !!out[k] !== !!cur[k])) {
            ctx.logic = Object.assign({}, ctx.logic, { [lc.comp.id]: out });
            changed = true;
            break;
          }
        }
        if (!changed) { settled = true; break; }
      }
    }
    const warnings = [];
    if (!settled) warnings.push({ msg: 'The logic circuit does not settle: its outputs keep changing (a feedback loop oscillates). Outputs are shown as last calculated.', comps: compiled.logicComps.map((l) => l.comp.id) });
    for (const net of compiled.networks) {
      const r = results[net.index];
      if (r.ok) continue;
      if (r.conflicts) for (const loop of r.conflicts) errors.push(describeConflict(loop, doc));
      else {
        const comps = [...new Set(net.prims.map((p) => p.owner).filter((o) => o[0] !== '@'))];
        errors.push({ msg: r.noConvergence || r.diverged
          ? 'The solver could not find a consistent solution for part of the circuit (Newton iteration did not converge). Readings there are unavailable.'
          : 'Part of the circuit could not be solved (its equations have no unique solution).', comps });
      }
    }
    return { results, errors, warnings };
  }

  function readLogicInputs(compiled, V, ctx) {
    const out = {};
    const lgRef = compiled.networks.find((n) => n.hasLogic).ref;
    for (const lc of compiled.logicComps) {
      const prev = (ctx.inputs && ctx.inputs[lc.comp.id]) || {};
      const cur = {};
      for (const inp of lc.ins) {
        const v = V[inp.node] - V[lgRef];
        cur[inp.id] = v > LOGIC.risingThreshold ? true : v < LOGIC.fallingThreshold ? false : !!prev[inp.id];
      }
      out[lc.comp.id] = cur;
    }
    return out;
  }

  // ---------- Results ----------

  function buildResult(compiled, solved, ctx) {
    const { nodes, networks, networkOf, netOf, doc } = compiled;
    const nodeV = new Float64Array(nodes.length).fill(NaN);
    const netOk = networks.map((n) => solved.results[n.index].ok);
    for (const net of networks) {
      const r = solved.results[net.index];
      if (!r.ok) continue;
      for (const i of net.nodes) nodeV[i] = r.V[i];
    }
    const comp = {};
    for (const c of doc.components) {
      const def = registry.get(c.type);
      const entry = { v: {}, i: {}, net: {}, island: {} };
      for (const t of def.terminals) {
        const n = netOf.get(c.id + ':' + t.id);
        entry.v[t.id] = nodeV[n];
        entry.net[t.id] = networkOf[n];
        entry.island[t.id] = compiled.galvanicOf[n];
        entry.node = entry.node || {};
        entry.node[t.id] = n;
        entry.i[t.id] = 0;
      }
      comp[c.id] = entry;
    }
    const undefinedOwners = new Set();
    for (const net of networks) {
      const r = solved.results[net.index];
      for (const p of net.prims) {
        if (p.owner[0] === '@') continue;
        const entry = comp[p.owner];
        const ns = p.nodes || [p.a, p.b];
        const cur = r.ok ? r.primI.get(p) : ns.map(() => NaN);
        if (r.ok && r.loops.undefinedPrims.has(p)) undefinedOwners.add(p.owner);
        ns.forEach((t, k) => { if (t.term) entry.i[t.term] += cur[k]; });
      }
    }
    const warnings = solved.warnings.slice();
    if (undefinedOwners.size) {
      const labels = [...undefinedOwners].map((id) => circuit.getComp(doc, id)).filter(Boolean);
      warnings.push({ msg: `Undefined current: ${labels.map((c) => c.label).join(', ')} ${labels.length > 1 ? 'are' : 'is'} in a loop with no resistance, so the ideal model cannot say how current divides between the paths. Their current readings show “?”.`, comps: [...undefinedOwners] });
    }
    return {
      ok: solved.errors.length === 0,
      t: ctx.t,
      nodeV, netOk, comp,
      errors: solved.errors,
      warnings,
      logic: ctx.logic,
      inputs: ctx.inputs || {},
      lgNetwork: (networks.find((n) => n.hasLogic) || {}).index,
      lgNode: (networks.find((n) => n.hasLogic) || {}).ref
    };
  }

  // Reader used by component definitions: r.v('p','n'), r.i('p'), r.vg('q').
  function reader(result, c) {
    const e = result && result.comp[c.id];
    return {
      v(a, b) {
        if (!e) return NaN;
        if (e.island[a] !== e.island[b]) return NaN;
        return e.v[a] - e.v[b];
      },
      i(t) { return e ? e.i[t] : NaN; },
      vg(t) {
        if (!e || e.net[t] !== result.lgNetwork) return NaN;
        return e.v[t] - result.nodeV[result.lgNode];
      },
      logicIn(id) { return !!(result.inputs[c.id] && result.inputs[c.id][id]); },
      logicOut(id) { return !!(result.logic[c.id] && result.logic[c.id][id]); },
      sameNetwork(a, b) { return !!e && e.island[a] === e.island[b]; }
    };
  }

  // ---------- Simulation engine ----------

  const TRACE_MAX = 6000;

  function createSim() {
    const sim = {
      doc: null,
      compiled: null,
      t: 0,
      running: false,
      dt: 0.005,
      capHist: {},
      indHist: {},
      logic: {},
      inputs: {},
      warm: new Map(),
      nlState: {},
      pressed: {},
      restart: true,
      result: null,
      lastStepDt: null,
      traces: { t: [], series: {}, every: 1, count: 0 },
      scopes: {},
      meterWin: {},
      editTime: 0,
      behind: false,
      stepCount: 0
    };

    sim.setDoc = function (doc, opts = {}) {
      sim.doc = doc;
      sim.compiled = compile(doc, { pressed: sim.pressed });
      const ids = new Set(doc.components.map((c) => c.id));
      for (const id of Object.keys(sim.capHist)) if (!ids.has(id)) delete sim.capHist[id];
      for (const id of Object.keys(sim.indHist)) if (!ids.has(id)) delete sim.indHist[id];
      for (const p of sim.compiled.prims) if ((p.k === 'L' || p.k === 'T') && !sim.indHist[p.owner]) sim.indHist[p.owner] = { i1: p.i0 || 0, j1: 0 };
      for (const p of sim.compiled.prims) if (p.k === 'C' && !sim.capHist[p.owner]) sim.capHist[p.owner] = { v1: p.v0 };
      sim.dt = doc.settings.dt === 'auto' ? sim.compiled.dtSuggest : doc.settings.dt;
      // Keep scope traces when only display/operational choices changed (plot,
      // sound). Circuit or source edits start a fresh acquisition so old
      // frequencies and voltages cannot masquerade as part of the new waveform.
      if (!opts.keepAcquisition) {
        sim.scopes = {};
        sim.meterWin = {};
        sim.restart = true;
        sim.editTime = sim.t;
      } else {
        for (const id of Object.keys(sim.scopes)) if (!ids.has(id)) delete sim.scopes[id];
        for (const key of Object.keys(sim.meterWin)) {
          const compId = key.split(':')[0];
          if (!ids.has(compId)) delete sim.meterWin[key];
        }
      }
      for (const c of doc.components) {
        if (c.type !== 'scope') continue;
        const network = sim.compiled.networkOf[sim.compiled.netOf.get(c.id + ':com')];
        const connected = ['ch1', 'ch2'].some((terminal) => sim.compiled.networkOf[sim.compiled.netOf.get(c.id + ':' + terminal)] === network);
        const frequencies = connected ? doc.components.filter((source) => source.type === 'acsupply' && source.props.peak > 0 &&
          sim.compiled.networkOf[sim.compiled.netOf.get(source.id + ':p')] === network).map((source) => source.props.freq) : [];
        const frequency = frequencies.length ? Math.min(...frequencies) : null;
        if (sim.scopes[c.id]) sim.scopes[c.id].frequency = frequency;
        else sim.scopes[c.id] = { t: [], ch1: [], ch2: [], frequency };
      }
      // Initial-energy sliders update the document before recompiling it. Read
      // their new values from these primitives, before solving the held state.
      if (opts.initialConditions) sim.applyInitialConditions(opts.initialConditions);
      sim.trial();
    };

    sim.reset = function () {
      sim.t = 0;
      sim.running = false;
      sim.capHist = {};
      sim.indHist = {};
      sim.logic = {};
      sim.inputs = {};
      sim.nlState = {};
      sim.warm = new Map();
      sim.traces = { t: [], series: {}, every: 1, count: 0 };
      sim.scopes = {};
      sim.meterWin = {};
      sim.editTime = 0;
      sim.stepCount = 0;
      if (sim.doc) sim.setDoc(sim.doc);
    };

    function context(t, method, dt) {
      return { t, dt, method, capHist: sim.capHist, indHist: sim.indHist, logic: Object.assign({}, sim.logic), inputs: Object.assign({}, sim.inputs), nlState: sim.nlState };
    }

    function run(t, dt, method) {
      const ctx = context(t, method, dt);
      const solved = solveAll(sim.compiled, ctx, sim.warm);
      const result = buildResult(sim.compiled, solved, ctx);
      return { ctx, solved, result };
    }

    // Solve the present state without advancing time (used while paused and after edits).
    // Capacitors and inductors hold their stored energy; resistive and source
    // changes update immediately around that frozen state.
    sim.trial = function () {
      if (!sim.compiled) return null;
      const method = (sim.compiled.hasCaps || sim.compiled.hasInductors) ? 'hold' : 'be';
      const { result, ctx, solved } = run(sim.t, sim.dt, method);
      // Logic settling and Newton state carry over; stored charge does not change.
      sim.logic = ctx.logic;
      sim.inputs = ctx.inputs;
      saveWarm(solved);
      sim.result = result;
      return result;
    };

    // Apply edited initial conditions to stored history (Reset, or changing v0/i0).
    sim.applyInitialConditions = function (ids) {
      if (!sim.compiled) return;
      const want = ids ? new Set(ids) : null;
      for (const p of sim.compiled.prims) {
        if (want && !want.has(p.owner)) continue;
        if (p.k === 'C') sim.capHist[p.owner] = { v1: p.v0 || 0 };
        if (p.k === 'L') sim.indHist[p.owner] = { i1: p.i0 || 0, j1: 0 };
        if (p.k === 'T') sim.indHist[p.owner] = { i1: 0, j1: 0 };
      }
    };

    function saveWarm(solved) {
      const { nodes, networks } = sim.compiled;
      for (const net of networks) {
        const r = solved.results[net.index];
        if (!r.ok) continue;
        for (const i of net.nodes) sim.warm.set(nodes[i].key, r.V[i]);
        for (const p of net.prims) if (p.k === 'N') sim.nlState[p.owner + p.kind] = Object.assign({}, p.st);
      }
    }

    // Advance one fixed time step and commit the new state.
    sim.step = function () {
      const dt = sim.dt;
      const method = sim.restart || sim.lastStepDt !== dt ? 'be' : 'bdf2';
      const t = sim.t + dt;
      const { result, ctx, solved } = run(t, dt, method);
      for (const net of sim.compiled.networks) {
        const r = solved.results[net.index];
        if (!r.ok) continue;
        for (const info of r.indInfo) {
          const h = sim.indHist[info.p.owner];
          const currents = r.primI.get(info.p);
          sim.indHist[info.p.owner] = { i1: currents[0], i2: h ? h.i1 : undefined,
            j1: currents[2] || 0, j2: h ? h.j1 : undefined };
        }
        for (const info of r.capInfo) {
          const h = sim.capHist[info.p.owner];
          const v = r.V[info.p.a.n] - r.V[info.p.b.n];
          sim.capHist[info.p.owner] = { v1: v, v2: h ? h.v1 : undefined };
        }
      }
      sim.logic = ctx.logic;
      sim.inputs = ctx.inputs;
      saveWarm(solved);
      sim.t = t;
      sim.restart = false;
      sim.lastStepDt = dt;
      sim.result = result;
      sim.stepCount++;
      record(result);
      return result;
    };

    // Run steps for a slice of real time, within a time budget (ms).
    sim.advance = function (realSeconds, budgetMs = 12, now = () => Date.now(), onStep) {
      if (!sim.running || !sim.compiled) return 0;
      const target = Math.min(realSeconds, 0.1) * sim.doc.settings.speed;
      const n = Math.floor((sim.carry + target) / sim.dt);
      sim.carry = (sim.carry + target) - n * sim.dt;
      const start = now();
      let done = 0;
      for (; done < n; done++) {
        const result = sim.step();
        if (onStep) onStep(result);
        if (now() - start > budgetMs) { done++; break; }
      }
      sim.behind = done < n;
      if (sim.behind) sim.carry = 0;
      return done;
    };
    sim.carry = 0;

    sim.setRunning = function (on) {
      sim.running = on;
      sim.carry = 0;
      // Pausing must preserve the exact last solved state, including readings.
    };

    // ---------- Measurements, traces and averaging ----------

    function measurements(result) {
      const out = [];
      for (const c of sim.doc.components) {
        const def = registry.get(c.type);
        const r = reader(result, c);
        if (def.meter) out.push({ key: c.id + ':' + def.meter.quantity, comp: c, value: def.meter.value(r) });
        if (def.channels) for (const ch of def.channels) out.push({ key: c.id + ':' + ch.key, comp: c, value: ch.value(r), channel: ch.key });
      }
      return out;
    }
    sim.measurements = measurements;

    function record(result) {
      const tr = sim.traces;
      const ms = measurements(result);
      // Averaging windows first so the graph can store the same value as the meter face.
      for (const m of ms) {
        if (!registry.get(m.comp.type).meter) continue;
        const W = meterPeriod(m.comp);
        if (!(W > 0)) continue;
        const w = sim.meterWin[m.key] || (sim.meterWin[m.key] = { t: [], v: [] });
        w.t.push(result.t); w.v.push(m.value);
        while (w.t.length > 2 && w.t[1] <= result.t - W) { w.t.shift(); w.v.shift(); }
      }
      tr.count++;
      if (tr.count % tr.every === 0 || tr.t.length === 0) {
        tr.t.push(result.t);
        const n = tr.t.length;
        for (const m of ms) {
          if (!tr.series[m.key]) tr.series[m.key] = new Array(n - 1).fill(NaN);
          const plotted = registry.get(m.comp.type).meter
            ? sim.meterValue(m.comp, m.value, m.key).value
            : m.value;
          tr.series[m.key].push(plotted);
        }
        for (const key of Object.keys(tr.series)) if (tr.series[key].length < n) tr.series[key].push(NaN);
        if (n > TRACE_MAX) {
          tr.t = tr.t.filter((_, i) => i % 2 === 0);
          for (const key of Object.keys(tr.series)) tr.series[key] = tr.series[key].filter((_, i) => i % 2 === 0);
          tr.every *= 2;
        }
      }
      // Scopes keep a fine-grained window of their own.
      for (const c of sim.doc.components) {
        if (c.type !== 'scope') continue;
        const s = sim.scopes[c.id];
        const span = units.scopeTimeDiv(c.props, s) * 10;
        const r = reader(result, c);
        s.t.push(result.t); s.ch1.push(r.v('ch1', 'com')); s.ch2.push(r.v('ch2', 'com'));
        let cut = 0;
        while (cut < s.t.length && s.t[cut] < result.t - span) cut++;
        if (cut > 0) { s.t.splice(0, cut); s.ch1.splice(0, cut); s.ch2.splice(0, cut); }
        if (s.t.length > 8000) {
          const indices = [...new Set(['ch1', 'ch2'].flatMap((channel) => units.scopeTraceIndices(s, channel, span, 512)))].sort((a, b) => a - b);
          for (const key of ['t', 'ch1', 'ch2']) s[key] = indices.map((i) => s[key][i]);
        }
      }
    }

    // Lowest AC period in the meter's own electrical network(s), or 0 if none.
    function meterPeriod(c) {
      const entry = sim.result && sim.result.comp[c.id];
      if (!entry || !sim.compiled) return 0;
      let freq = Infinity;
      for (const ni of Object.values(entry.net)) {
        const net = sim.compiled.networks[ni];
        if (net && net.acMin < freq) freq = net.acMin;
      }
      return Number.isFinite(freq) ? 1 / freq : 0;
    }
    sim.meterPeriod = meterPeriod;

    // Value shown by a meter: instantaneous with no AC in its network; else the
    // mean (DC mode) or r.m.s. (AC mode) over one cycle once a full cycle exists.
    sim.meterValue = function (c, instantaneous, key) {
      const W = meterPeriod(c);
      const mode = c.props.mode || 'dc';
      if (W <= 0) return { value: mode === 'ac' ? Math.abs(instantaneous) : instantaneous, averaged: false, exact: true };
      const w = sim.meterWin[key];
      if (!w || w.t.length < 3 || w.t[w.t.length - 1] - w.t[0] < W * 0.98) return { value: instantaneous, averaged: false, exact: false };
      // Integrate over exactly one period, interpolating into the oldest segment.
      const tEnd = w.t[w.t.length - 1], tStart = tEnd - W;
      let sum = 0, sum2 = 0, total = 0;
      for (let i = 1; i < w.t.length; i++) {
        let t0 = w.t[i - 1], v0 = w.v[i - 1];
        const t1 = w.t[i], v1 = w.v[i];
        if (t1 <= tStart) continue;
        if (t0 < tStart) { v0 = v0 + (v1 - v0) * (tStart - t0) / (t1 - t0); t0 = tStart; }
        const dt = t1 - t0;
        sum += 0.5 * (v0 + v1) * dt;
        sum2 += ((v0 * v0 + v0 * v1 + v1 * v1) / 3) * dt;
        total += dt;
      }
      if (!(total > 0) || !Number.isFinite(sum)) return { value: NaN, averaged: true, exact: false };
      return { value: mode === 'ac' ? Math.sqrt(sum2 / total) : sum / total, averaged: true, exact: true };
    };

    return sim;
  }

  // A warning when the step in use is much longer than an oscillation needs, which happens at the
  // automatic floor (very small L and C) or with a long manual step. Null when the step is fine.
  function stepNote(sim) {
    const c = sim && sim.compiled;
    if (!c || !(c.dtNeed * COARSE_STEP < sim.dt)) return null;
    const names = c.dtNeedComps.map((id) => circuit.getComp(sim.doc, id)?.label).filter(Boolean);
    const who = names.length ? names.join(' and ') : 'Part of the circuit';
    const auto = sim.doc.settings.dt === 'auto';
    // Auto helps unless the circuit needs less than the automatic floor.
    const autoHelps = c.dtNeed * COARSE_STEP >= c.dtSuggest;
    const fix = auto ? 'Use larger values or a lower frequency.'
      : autoHelps ? 'Choose the Auto time step.' : 'Use larger values, a lower frequency or the Auto time step.';
    return {
      msg: `${who} change${names.length === 1 ? 's' : ''} faster than the ${units.fmtSI(sim.dt, 's', 2)} time step can follow, so their oscillations die away too quickly. ${fix}`,
      comps: c.dtNeedComps
    };
  }

  const api = { compile, solveAll, buildResult, reader, createSim, solveLinear, analyseVoltageLoops, stepNote, MIN_DT };
  PPC.solver = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof globalThis === 'object' ? globalThis : this);
