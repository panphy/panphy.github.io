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
      const ns = p.k === 'N' ? p.nodes : [p.a, p.b];
      for (let j = 1; j < ns.length; j++) join(ns[0].n, ns[j].n);
    }
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
      const n0 = p.k === 'N' ? p.nodes[0].n : p.a.n;
      networks[networkOf[n0]].prims.push(p);
    }
    for (const net of networks) {
      const lg = net.nodes.find((i) => nodes[i].global && nodes[i].global.split('+').includes('LG'));
      if (lg !== undefined) { net.ref = lg; net.hasLogic = true; continue; }
      // Prefer the negative terminal of a source as the reference (cosmetic only).
      const src = net.prims.find((p) => p.k === 'V' && p.ideal);
      net.ref = src ? src.b.n : net.nodes[0];
    }

    // Time step suggestion and AC frequencies.
    let dtSuggest = 0.005;
    let acMin = Infinity;
    for (const c of doc.components) {
      const def = registry.get(c.type);
      if (def.timeStep) dtSuggest = Math.min(dtSuggest, def.timeStep(c));
      if (def.acFrequency) acMin = Math.min(acMin, def.acFrequency(c));
    }
    for (const p of prims) {
      if (p.k !== 'C') continue;
      let rMin = Infinity;
      for (const q of prims) {
        if (q.k !== 'G' || q.owner === p.owner) continue;
        if ([q.a.n, q.b.n].some((n) => n === p.a.n || n === p.b.n)) rMin = Math.min(rMin, 1 / q.g);
      }
      if (Number.isFinite(rMin)) dtSuggest = Math.min(dtSuggest, (p.c * rMin) / 100);
    }
    for (const p of prims) {
      if (p.k !== 'L') continue;
      const net = networks[networkOf[p.a.n]];
      // Sum passive series resistances conservatively; meter input resistance is
      // a parallel measurement load, not a winding/discharge resistance.
      const resistance = net.prims.filter((q) => q.k === 'G' && !q.hidden &&
        circuit.getComp(doc, q.owner)?.type !== 'voltmeter')
        .reduce((sum, q) => sum + 1 / q.g, 0);
      if (resistance > 0) dtSuggest = Math.min(dtSuggest, p.l / resistance / 100);
      for (const q of net.prims) if (q.k === 'C') dtSuggest = Math.min(dtSuggest, Math.sqrt(p.l * q.c) / 100);
    }
    dtSuggest = Math.min(0.01, Math.max(1e-6, dtSuggest));

    return { doc, nodes, prims, networks, networkOf, netOf, nets, logicComps, dtSuggest, acMin, notes, hasCaps: prims.some((p) => p.k === 'C'), hasInductors: prims.some((p) => p.k === 'L') };
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
    for (const i of net.nodes) if (i !== net.ref) u.set(i, nU++);
    const loops = analyseVoltageLoops(net, ctx);
    if (loops.conflicts.length) return { ok: false, conflicts: loops.conflicts };
    const vEdges = loops.kept;
    const size = nU + vEdges.length;
    const idx = (n) => (n === net.ref ? -1 : u.get(n));

    // Linear part.
    const Alin = new Float64Array(size * size);
    const zlin = new Float64Array(size);
    const addA = (r, c, v) => { if (r >= 0 && c >= 0) Alin[r * size + c] += v; };
    const addZ = (r, v) => { if (r >= 0) zlin[r] += v; };
    const capInfo = [], indInfo = [];
    for (const p of net.prims) {
      if (p.k === 'G') {
        const a = idx(p.a.n), b = idx(p.b.n);
        addA(a, a, p.g); addA(b, b, p.g); addA(a, b, -p.g); addA(b, a, -p.g);
      } else if (p.k === 'I') {
        const i = valueOf(p.i, ctx, lambda);
        addZ(idx(p.a.n), -i); addZ(idx(p.b.n), i);
      } else if (p.k === 'L') {
        const h = ctx.indHist[p.owner] || { i1: p.i0 };
        const bdf2 = h.i2 !== undefined && ctx.method === 'bdf2';
        const geq = (bdf2 ? 2 / 3 : 1) * ctx.dt / p.l;
        const ihist = bdf2 ? (4 * h.i1 - h.i2) / 3 : h.i1;
        indInfo.push({ p, geq, ihist });
        const a = idx(p.a.n), b = idx(p.b.n);
        addA(a, a, geq); addA(b, b, geq); addA(a, b, -geq); addA(b, a, -geq);
        addZ(a, -ihist); addZ(b, ihist);
      } else if (p.k === 'C') {
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
    vEdges.forEach((p, k) => {
      const row = nU + k, a = idx(p.a.n), b = idx(p.b.n);
      if (a >= 0) { Alin[a * size + row] += 1; Alin[row * size + a] += 1; }
      if (b >= 0) { Alin[b * size + row] -= 1; Alin[row * size + b] -= 1; }
      zlin[row] += valueOf(p.v, ctx, lambda);
    });
    const nl = net.prims.filter((p) => p.k === 'N');

    // Node voltages (ref = 0), warm-started.
    const V = new Float64Array(nodes.length);
    for (const i of net.nodes) V[i] = i === net.ref ? 0 : (warm.get(nodes[i].key) ?? 0);
    for (const p of nl) if (ctx.nlState && ctx.nlState[p.owner + p.kind]) Object.assign(p.st, ctx.nlState[p.owner + p.kind]);
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
      if (p.k === 'G') ia = p.g * (V[p.a.n] - V[p.b.n]);
      else if (p.k === 'I') ia = valueOf(p.i, ctx, lambda);
      else if (p.k === 'V') {
        const k = vEdges.indexOf(p);
        ia = loops.undefinedPrims.has(p) ? NaN : (k >= 0 ? x[nU + k] : NaN);
      } else if (p.k === 'L') {
        const info = indInfo.find((q) => q.p === p);
        ia = info.geq * (V[p.a.n] - V[p.b.n]) + info.ihist;
      } else if (p.k === 'C') {
        const info = capInfo.find((q) => q.p === p);
        ia = info.geq * (V[p.a.n] - V[p.b.n]) - info.ihist;
      }
      if (p.k === 'N') {
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
      const entry = { v: {}, i: {}, net: {} };
      for (const t of def.terminals) {
        const n = netOf.get(c.id + ':' + t.id);
        entry.v[t.id] = nodeV[n];
        entry.net[t.id] = networkOf[n];
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
        const ns = p.k === 'N' ? p.nodes : [p.a, p.b];
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
        if (e.net[a] !== e.net[b]) return NaN;
        return e.v[a] - e.v[b];
      },
      i(t) { return e ? e.i[t] : NaN; },
      vg(t) {
        if (!e || e.net[t] !== result.lgNetwork) return NaN;
        return e.v[t] - result.nodeV[result.lgNode];
      },
      logicIn(id) { return !!(result.inputs[c.id] && result.inputs[c.id][id]); },
      logicOut(id) { return !!(result.logic[c.id] && result.logic[c.id][id]); },
      sameNetwork(a, b) { return !!e && e.net[a] === e.net[b]; }
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

    sim.setDoc = function (doc) {
      sim.doc = doc;
      sim.compiled = compile(doc, { pressed: sim.pressed });
      const ids = new Set(doc.components.map((c) => c.id));
      for (const id of Object.keys(sim.capHist)) if (!ids.has(id)) delete sim.capHist[id];
      for (const id of Object.keys(sim.indHist)) if (!ids.has(id)) delete sim.indHist[id];
      for (const p of sim.compiled.prims) if (p.k === 'L' && !sim.indHist[p.owner]) sim.indHist[p.owner] = { i1: p.i0 };
      for (const p of sim.compiled.prims) if (p.k === 'C' && !sim.capHist[p.owner]) sim.capHist[p.owner] = { v1: p.v0 };
      sim.dt = doc.settings.dt === 'auto' ? sim.compiled.dtSuggest : doc.settings.dt;
      // A new circuit/source setting starts a fresh acquisition, so old source
      // frequencies and voltages cannot masquerade as part of the new waveform.
      sim.scopes = {};
      for (const c of doc.components) {
        if (c.type !== 'scope') continue;
        const network = sim.compiled.networkOf[sim.compiled.netOf.get(c.id + ':com')];
        const connected = ['ch1', 'ch2'].some((terminal) => sim.compiled.networkOf[sim.compiled.netOf.get(c.id + ':' + terminal)] === network);
        const frequencies = connected ? doc.components.filter((source) => source.type === 'acsupply' && source.props.peak > 0 &&
          sim.compiled.networkOf[sim.compiled.netOf.get(source.id + ':p')] === network).map((source) => source.props.freq) : [];
        sim.scopes[c.id] = { t: [], ch1: [], ch2: [], frequency: frequencies.length ? Math.min(...frequencies) : null };
      }
      sim.restart = true;
      sim.editTime = sim.t;
      sim.meterWin = {};
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
    sim.trial = function () {
      if (!sim.compiled) return null;
      const { result, ctx, solved } = run(sim.t, sim.dt, 'be');
      // Logic settling and Newton state carry over; stored charge does not change.
      sim.logic = ctx.logic;
      sim.inputs = ctx.inputs;
      saveWarm(solved);
      sim.result = result;
      return result;
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
          sim.indHist[info.p.owner] = { i1: r.primI.get(info.p)[0], i2: h ? h.i1 : undefined };
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
      tr.count++;
      if (tr.count % tr.every === 0 || tr.t.length === 0) {
        tr.t.push(result.t);
        const n = tr.t.length;
        for (const m of ms) {
          if (!tr.series[m.key]) tr.series[m.key] = new Array(n - 1).fill(NaN);
          tr.series[m.key].push(m.value);
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
      // Meter averaging windows (only when AC sources exist).
      const W = Number.isFinite(sim.compiled.acMin) ? 1 / sim.compiled.acMin : 0;
      if (W > 0) {
        for (const m of ms) {
          // Scope channels already have bounded trace buffers. Only meters use
          // cycle averaging; duplicating scope samples here can stall tiny-step
          // RLC circuits when a full AC cycle starts sliding through the window.
          if (!registry.get(m.comp.type).meter) continue;
          const w = sim.meterWin[m.key] || (sim.meterWin[m.key] = { t: [], v: [] });
          w.t.push(result.t); w.v.push(m.value);
          while (w.t.length > 2 && w.t[1] <= result.t - W) { w.t.shift(); w.v.shift(); }
        }
      }
    }

    // Value shown by a meter: instantaneous with no AC; else the mean (DC mode) or
    // r.m.s. (AC mode) over one cycle once a full cycle has been simulated.
    sim.meterValue = function (c, instantaneous, key) {
      const W = Number.isFinite(sim.compiled.acMin) ? 1 / sim.compiled.acMin : 0;
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

  const api = { compile, solveAll, buildResult, reader, createSim, solveLinear, analyseVoltageLoops };
  PPC.solver = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof globalThis === 'object' ? globalThis : this);
