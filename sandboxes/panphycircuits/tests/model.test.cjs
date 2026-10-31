// Run with: node --test sandboxes/panphycircuits/tests/*.test.cjs
// Document, layout and view-synchronization checks (no browser needed).
const test = require('node:test');
const assert = require('node:assert/strict');
require('../js/units.js');
const registry = require('../js/registry.js');
const circuit = require('../js/circuit.js');
const solver = require('../js/solver.js');
require('../js/art-common.js');
require('../js/art-realistic.js');
require('../js/art-schematic.js');
const layout = require('../js/layout.js');
const examples = require('../js/examples.js');

function place(doc, comp, view, x, y, r = 0, f = false) { doc.layouts[view].comps[comp.id] = { x, y, r, f }; }

test('every component has artwork and the same terminals in both views', () => {
  for (const type of registry.order) {
    const ids = registry.get(type).terminals.map((t) => t.id).sort();
    for (const view of layout.VIEWS) {
      const art = layout.artFor(view, type);
      assert.ok(art, `${view} art for ${type}`);
      assert.deepEqual(Object.keys(art.terms(registry.defaultProps(type))).sort(), ids, `${view} terminals for ${type}`);
    }
  }
});

test('terminal positions follow rotation and mirroring exactly', () => {
  const doc = circuit.createDoc();
  const r = circuit.addComponent(doc, 'resistor');
  for (const [rot, expectA] of [[0, [-40, 0]], [1, [0, -40]], [2, [40, 0]], [3, [0, 40]]]) {
    place(doc, r, 'schematic', 100, 200, rot);
    const a = layout.termWorld(doc, 'schematic', { c: r.id, t: 'a' });
    assert.deepEqual([a.x - 100, a.y - 200], expectA, `rotation ${rot}`);
  }
  place(doc, r, 'schematic', 0, 0, 0, true);
  assert.equal(layout.termWorld(doc, 'schematic', { c: r.id, t: 'a' }).x, 40, 'mirror swaps sides');
});

test('a part placed on a realistic wire or another part moves to the nearest clear spot', () => {
  const doc = circuit.createDoc();
  const a = circuit.addComponent(doc, 'cell'), b = circuit.addComponent(doc, 'lamp');
  place(doc, a, 'realistic', -300, 0);
  place(doc, b, 'realistic', 300, 0);
  circuit.addWire(doc, { c: a.id, t: 'p' }, { c: b.id, t: 'a' });
  const v = circuit.addComponent(doc, 'voltmeter');
  place(doc, v, 'realistic', 0, 0);
  const route = layout.wireRoute(doc, 'realistic', doc.wires[0]);
  const hits = () => { const bb = layout.compBounds(doc, 'realistic', v.id); return route.poly.some((p) => p.x > bb.x && p.x < bb.x2 && p.y > bb.y && p.y < bb.y2); };
  assert.ok(hits(), 'the wire starts under the meter');
  assert.equal(layout.clearSpot(doc, 'realistic', v.id), true);
  assert.ok(!hits(), 'the meter moved off the wire');
  const pl = doc.layouts.realistic.comps[v.id];
  assert.ok(Math.hypot(pl.x, pl.y) <= 240, 'it stays near where it was dropped');
  place(doc, v, 'realistic', 0, 400);
  assert.equal(layout.clearSpot(doc, 'realistic', v.id), false, 'a clear spot is kept');
  assert.deepEqual([doc.layouts.realistic.comps[v.id].x, doc.layouts.realistic.comps[v.id].y], [0, 400]);
  const r2 = circuit.addComponent(doc, 'resistor');
  place(doc, r2, 'realistic', 0, 400);
  assert.equal(layout.clearSpot(doc, 'realistic', r2.id), true, 'parts never land on each other');
});

test('mirroring flips terminals left to right on screen at every rotation and undoes itself', () => {
  for (let step = 0; step < 8; step++) {
    const pl = { x: 100, y: 200, r: step / 2, f: step % 3 === 0 };
    const before = layout.xform(pl, -40, 7);
    const m = layout.mirror({ ...pl });
    const after = layout.xform(m, -40, 7);
    assert.ok(Math.abs(after.x - 100 + (before.x - 100)) < 1e-9 && Math.abs(after.y - before.y) < 1e-9, `rotation ${pl.r}, flip ${pl.f}`);
    assert.deepEqual(layout.mirror(m), pl, `mirror twice at rotation ${pl.r}`);
  }
});

test('45° rotations place terminals on the diagonal, invert exactly and survive a save', () => {
  const doc = circuit.createDoc();
  const r = circuit.addComponent(doc, 'resistor');
  const d = 40 * Math.SQRT1_2;
  for (const [rot, expectA] of [[0.5, [-d, -d]], [1.5, [d, -d]], [2.5, [d, d]], [3.5, [-d, d]]]) {
    place(doc, r, 'schematic', 100, 200, rot);
    const pl = doc.layouts.schematic.comps[r.id];
    const a = layout.termWorld(doc, 'schematic', { c: r.id, t: 'a' });
    assert.ok(Math.abs(a.x - 100 - expectA[0]) < 1e-9 && Math.abs(a.y - 200 - expectA[1]) < 1e-9, `rotation ${rot}`);
    const back = layout.toLocal(pl, a.x, a.y);
    assert.ok(Math.abs(back.x + 40) < 1e-9 && Math.abs(back.y) < 1e-9, `inverse at rotation ${rot}`);
  }
  assert.equal(layout.normRot(-0.5), 3.5);
  assert.equal(layout.normRot(4), 0);
  place(doc, r, 'schematic', 100, 200, 1.5);
  const back = circuit.importDoc(circuit.exportDoc(doc));
  assert.equal(back.doc.layouts.schematic.comps[r.id].r, 1.5, '45° rotation kept on import');
});

test('diagram wires leave a 45° terminal along its diagonal, then run square to the grid', () => {
  const S = Math.SQRT1_2, d = 40 * S;
  const A = { x: 100 - d, y: 200 - d };
  for (const poly of [layout.orthoRoute(A, { x: -S, y: -S }, [], { x: 300, y: 100 }, { x: -1, y: 0 }),
    layout.orthoRoute(A, { x: -S, y: -S }, [], { x: 0, y: 400 }, { x: 0, y: -1 })]) {
    const [p0, p1] = poly;
    assert.ok(Math.abs((p1.x - p0.x) - (p1.y - p0.y)) < 1e-9 && p1.x < p0.x, 'first run is diagonal and outward');
    assert.equal(p1.x % 10, 0, 'diagonal run ends on the grid');
    for (let i = 1; i < poly.length - 1; i++) {
      const a = poly[i], b = poly[i + 1];
      assert.ok(Math.abs(a.x - b.x) < 1e-9 || Math.abs(a.y - b.y) < 1e-9, 'rest of the route is square to the grid');
    }
  }
});

test('transistor pinout changes the realistic leg, never the electrical terminal', () => {
  const doc = circuit.createDoc();
  const q = circuit.addComponent(doc, 'npn');
  place(doc, q, 'realistic', 0, 0);
  const cEbc = layout.termWorld(doc, 'realistic', { c: q.id, t: 'c' });
  q.props.pinout = 'cbe';
  const cCbe = layout.termWorld(doc, 'realistic', { c: q.id, t: 'c' });
  assert.equal(cEbc.x, 20);
  assert.equal(cCbe.x, -20);
});

test('splitting a wire creates one junction in both views and keeps connectivity', () => {
  const doc = circuit.createDoc();
  const b = circuit.addComponent(doc, 'cell'), r = circuit.addComponent(doc, 'resistor');
  place(doc, b, 'realistic', 0, 0); place(doc, r, 'realistic', 300, 0);
  place(doc, b, 'schematic', 0, 0); place(doc, r, 'schematic', 200, 0);
  doc.layouts.schematic.ready = true;
  const w = circuit.addWire(doc, { c: b.id, t: 'p' }, { c: r.id, t: 'a' }).wire;
  const s = layout.splitWire(doc, w.id, 'realistic', { x: 150, y: 0 });
  assert.ok(doc.layouts.realistic.comps[s.junction] && doc.layouts.schematic.comps[s.junction]);
  assert.equal(doc.wires.length, 2);
  const { netOf } = circuit.buildNets(doc);
  assert.equal(netOf.get(b.id + ':p'), netOf.get(r.id + ':a'));
});

test('wires that merely cross are not connected', () => {
  const doc = circuit.createDoc();
  const [r1, r2, r3, r4] = [0, 1, 2, 3].map(() => circuit.addComponent(doc, 'resistor'));
  circuit.addWire(doc, { c: r1.id, t: 'b' }, { c: r2.id, t: 'a' });
  circuit.addWire(doc, { c: r3.id, t: 'b' }, { c: r4.id, t: 'a' });
  // Place them so the two wires cross geometrically in the diagram.
  place(doc, r1, 'schematic', -100, 0); place(doc, r2, 'schematic', 100, 0, 0);
  place(doc, r3, 'schematic', 0, -100, 1); place(doc, r4, 'schematic', 0, 100, 1);
  const { netOf } = circuit.buildNets(doc);
  assert.notEqual(netOf.get(r1.id + ':b'), netOf.get(r3.id + ':b'));
});

test('generating a view lays out every part; new parts are synchronized without moving old ones', () => {
  const ex = examples.list[2];
  const doc = examples.build(ex, 'realistic');
  doc.layouts.schematic = { ready: false, comps: {}, wires: {} };
  layout.generateLayout(doc, 'schematic', 'realistic');
  assert.equal(Object.keys(doc.layouts.schematic.comps).length, doc.components.length);
  const before = JSON.stringify(doc.layouts.schematic.comps);
  const c = circuit.addComponent(doc, 'lamp');
  place(doc, c, 'realistic', 500, 0);
  layout.placeInOtherViews(doc, [c.id], 'realistic');
  assert.ok(doc.layouts.schematic.comps[c.id], 'new lamp placed in diagram');
  const after = JSON.parse(JSON.stringify(doc.layouts.schematic.comps));
  delete after[c.id];
  assert.equal(JSON.stringify(after), before, 'existing diagram positions untouched');
  const nb = layout.compBounds(doc, 'schematic', c.id);
  for (const o of doc.components) if (o.id !== c.id && o.type !== 'junction') assert.ok(!layout.overlaps(nb, layout.compBounds(doc, 'schematic', o.id), 0), 'no overlap with ' + o.label);
});

test('deleting a component removes its wires and empty junctions everywhere', () => {
  const doc = examples.build(examples.list[1], 'realistic');
  const a3 = doc.components.find((c) => c.label === 'A3');
  circuit.removeComponents(doc, [a3.id]);
  assert.ok(!doc.wires.some((w) => w.a.c === a3.id || w.b.c === a3.id));
  for (const v of layout.VIEWS) assert.ok(!doc.layouts[v].comps[a3.id]);
  for (const w of doc.wires) for (const v of layout.VIEWS) assert.ok(doc.layouts[v].wires[w.id]);
});

test('every example builds, solves without errors and round-trips through a file', () => {
  for (const ex of examples.list) {
    const doc = examples.build(ex, 'realistic');
    const sim = solver.createSim();
    sim.setDoc(doc);
    assert.equal(sim.result.errors.length, 0, ex.title + ': ' + JSON.stringify(sim.result.errors));
    const text = JSON.stringify(circuit.exportDoc(doc));
    const back = circuit.importDoc(text);
    assert.equal(back.warnings.length, 0, ex.title);
    assert.equal(JSON.stringify(circuit.exportDoc(back.doc)), text, ex.title);
  }
});

test('the electrical result does not depend on the active view or the layout', () => {
  const doc = examples.build(examples.list[5], 'realistic');
  const read = (d) => { const s = solver.createSim(); s.setDoc(d); return JSON.stringify(Object.values(s.result.comp).map((e) => [e.v, e.i])); };
  const r1 = read(doc);
  const moved = circuit.clone(doc);
  moved.view = 'schematic';
  for (const v of layout.VIEWS) for (const pl of Object.values(moved.layouts[v].comps)) { pl.x += 333; pl.r = (pl.r + 1) & 3; }
  assert.equal(read(moved), r1);
});

test('imports are validated and cannot carry markup', () => {
  assert.throws(() => circuit.importDoc('not json'), /not valid JSON/);
  assert.throws(() => circuit.importDoc('{"format":"other"}'), /not a PanPhyCircuits file/);
  const doc = examples.build(examples.list[0], 'realistic');
  const data = circuit.exportDoc(doc);
  data.components[0].label = '"><script>alert(1)</script>';
  data.components[1].type = 'flux-capacitor';
  data.wires.push({ id: 'w99', a: { c: 'nope', t: 'x' }, b: { c: data.components[0].id, t: 'p' }, color: 'red' });
  const r = circuit.importDoc(JSON.stringify(data));
  assert.ok(!/[<>"]/.test(r.doc.components[0].label));
  assert.ok(r.warnings.some((w) => /unsupported type/.test(w)));
  assert.ok(r.warnings.some((w) => /missing terminal/.test(w)));
});

test('legacy files skip removed parts and attached wires while preserving the supported circuit', () => {
  const original = circuit.exportDoc(examples.build(examples.list[0], 'realistic'));
  const data = circuit.clone(original);
  const source = data.components[0].id;
  data.components.push(
    { id: 'legacyRelay', type: 'relay', label: 'K1', props: { R: 120, L: 0.2, pickup: 0.03 } },
    { id: 'legacyOpamp', type: 'opamp', label: 'U1', props: { gain: 100000 } }
  );
  data.wires.push(
    { id: 'legacyW1', a: { c: source, t: 'p' }, b: { c: 'legacyRelay', t: 'cp' }, color: 'red' },
    { id: 'legacyW2', a: { c: 'legacyRelay', t: 'no' }, b: { c: 'legacyOpamp', t: 'plus' }, color: 'blue' },
    { id: 'legacyW3', a: { c: 'legacyOpamp', t: 'vn' }, b: { c: source, t: 'n' }, color: 'black' }
  );
  for (const view of layout.VIEWS) {
    for (const id of ['legacyRelay', 'legacyOpamp']) data.layouts[view].comps[id] = { x: 400, y: 0, r: 0, f: false };
    for (const id of ['legacyW1', 'legacyW2', 'legacyW3']) data.layouts[view].wires[id] = { pts: [] };
  }
  const result = circuit.importDoc(JSON.stringify(data));
  assert.deepEqual(circuit.exportDoc(result.doc), original);
  assert.equal(result.warnings.filter(w => /unsupported type/.test(w)).length, 2);
  assert.equal(result.warnings.filter(w => /missing terminal/.test(w)).length, 3);
  const sim = solver.createSim();
  sim.setDoc(result.doc);
  assert.equal(sim.result.errors.length, 0);
});

test('tidy up never makes a layout worse, keeps every connection and leaves no overlaps', () => {
  let seed = 7;
  const rand = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const otherView = (v) => (v === 'realistic' ? 'schematic' : 'realistic');
  const check = (doc, view, label) => {
    const wiresBefore = JSON.stringify(doc.wires);
    const other = JSON.stringify(doc.layouts[otherView(view)]);
    const beforeReport = {};
    const before = layout.tidyCost(doc, view, null, null, beforeReport);
    const drawingBefore = view === 'schematic' ? layout.schematicQuality(doc) : null;
    const changed = layout.tidy(doc, view);
    if (drawingBefore) {
      const drawingAfter = layout.schematicQuality(doc);
      assert.ok(drawingAfter.defects <= drawingBefore.defects, `${label}: rendered drawing does not gain crossings or obstructions`);
    }
    assert.equal(JSON.stringify(doc.wires), wiresBefore, `${label}: connections unchanged`);
    assert.equal(JSON.stringify(doc.layouts[otherView(view)]), other, `${label}: other view untouched`);
    // When tidy changes a layout, bends are kept only at the corners of the
    // textbook layout: every step between them is horizontal or vertical.
    // (A tidy that would make things worse keeps the original, bends and all.)
    for (const w of changed ? doc.wires : []) {
      const pts = doc.layouts[view].wires[w.id].pts;
      if (!pts.length) continue;
      const A = layout.termWorld(doc, view, w.a), B = layout.termWorld(doc, view, w.b);
      const chain = [[A.x, A.y]].concat(pts, [[B.x, B.y]]);
      for (let i = 0; i < chain.length - 1; i++) assert.ok(Math.abs(chain[i][0] - chain[i + 1][0]) < 0.5 || Math.abs(chain[i][1] - chain[i + 1][1]) < 0.5, `${label}: square bends`);
    }
    const report = {};
    const after = layout.tidyCost(doc, view, null, null, report);
    // Spreading a small circuit to the minimum size lengthens wires, so the
    // check is on what makes a layout untidy, not on the total cost.
    const untidy = (r) => r.overlaps + r.crossings + r.overParts;
    assert.ok(untidy(report) <= untidy(beforeReport), `${label}: ${JSON.stringify(beforeReport)} -> ${JSON.stringify(report)}`);
    assert.equal(report.overlaps, 0, `${label}: overlapping parts`);
    return { before, after };
  };
  for (const ex of examples.list) {
    for (const view of layout.VIEWS) {
      check(examples.build(ex, view), view, `${ex.title} (${view}, neat)`);
      const doc = examples.build(ex, view);
      for (const pl of Object.values(doc.layouts[view].comps)) { pl.x += Math.round((rand() - 0.5) * 160); pl.y += Math.round((rand() - 0.5) * 160); pl.r = Math.floor(rand() * 4); }
      for (const w of doc.wires) doc.layouts[view].wires[w.id] = { pts: [[rand() * 300, rand() * 300]] };
      const r = check(doc, view, `${ex.title} (${view}, messy)`);
      assert.ok(r.after < r.before, `${ex.title} (${view}): messy layout improved (${r.before} -> ${r.after})`);
    }
  }
});

test('tidy up keeps small circuits at a readable size', () => {
  for (const view of layout.VIEWS) {
    const doc = examples.build(examples.list[0], view);
    for (const pl of Object.values(doc.layouts[view].comps)) { pl.x = Math.round(pl.x * 0.3); pl.y = Math.round(pl.y * 0.3); }
    layout.tidy(doc, view);
    // The drawing's extent: parts and the wires out to the corners.
    const b = layout.viewBounds(doc, view);
    for (const r of layout.routeAll(doc, view).values()) for (const p of r.poly) { b.x = Math.min(b.x, p.x); b.x2 = Math.max(b.x2, p.x); b.y = Math.min(b.y, p.y); b.y2 = Math.max(b.y2, p.y); }
    const [w, h] = view === 'schematic' ? [280, 200] : [360, 240];
    assert.ok(b.x2 - b.x >= w - 20 && b.y2 - b.y >= h - 20, `${view}: ${b.x2 - b.x} x ${b.y2 - b.y}`);
  }
});

test('tidy up untangles a switch dropped on top of a cell', () => {
  // The cell, switch and lamp loop with the switch overlapping the cell and a
  // wire running across the lamp, as reported from the realistic view.
  const doc = examples.build(examples.list[0], 'realistic');
  const byType = (t) => doc.components.find((c) => c.type === t);
  const lay = doc.layouts.realistic.comps;
  const cell = doc.components.find((c) => /cell|battery/.test(c.type)), sw = byType('switch'), lamp = doc.components.find((c) => /lamp/.test(c.type));
  Object.assign(lay[lamp.id], { x: 120, y: 260, r: 0, f: false });
  Object.assign(lay[cell.id], { x: 400, y: 170, r: 0, f: false });
  Object.assign(lay[sw.id], { x: 390, y: 110, r: 1, f: false });
  const messy = {};
  layout.tidyCost(doc, 'realistic', null, null, messy);
  assert.ok(messy.overlaps > 0, 'the starting layout has an overlap');
  layout.tidy(doc, 'realistic');
  const report = {};
  layout.tidyCost(doc, 'realistic', null, null, report);
  assert.deepEqual({ overlaps: report.overlaps, crossings: report.crossings, overParts: report.overParts }, { overlaps: 0, crossings: 0, overParts: 0 });
});

test('tidy up draws a series loop as a textbook rectangle with even spacing', () => {
  for (const view of layout.VIEWS) {
    const doc = circuit.createDoc();
    doc.layouts.schematic.ready = true;
    let seed = 4;
    const rand = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    const add = (t) => { const c = circuit.addComponent(doc, t); for (const v of layout.VIEWS) doc.layouts[v].comps[c.id] = { x: Math.round(rand() * 500), y: Math.round(rand() * 300), r: Math.floor(rand() * 4), f: false }; return c; };
    const B = add('battery'), R1 = add('resistor'), R2 = add('resistor'), R3 = add('resistor'), L1 = add('lamp');
    const chain = [[B, 'p'], [R1, 'a'], [R1, 'b'], [R2, 'a'], [R2, 'b'], [R3, 'a'], [R3, 'b'], [L1, 'a'], [L1, 'b'], [B, 'n']];
    for (let i = 0; i < chain.length; i += 2) circuit.addWire(doc, { c: chain[i][0].id, t: chain[i][1] }, { c: chain[i + 1][0].id, t: chain[i + 1][1] });
    assert.ok(layout.seriesParallel(doc, view), `${view}: recognized as series-parallel`);
    layout.tidy(doc, view);
    const T = (c, t) => layout.termWorld(doc, view, { c: c.id, t });
    // Battery along the top; first and last parts on the sides; the middle two along the bottom.
    assert.equal(T(B, 'p').y, T(B, 'n').y, `${view}: battery horizontal`);
    assert.equal(T(R1, 'a').x, T(R1, 'b').x, `${view}: R1 upright on a side`);
    assert.equal(T(L1, 'a').x, T(L1, 'b').x, `${view}: L1 upright on a side`);
    const yb = T(R2, 'a').y;
    for (const p of [T(R2, 'b'), T(R3, 'a'), T(R3, 'b')]) assert.equal(p.y, yb, `${view}: bottom row on one line`);
    // Equal gaps along the bottom: corner to R2, R2 to R3, R3 to corner.
    const xl = T(R1, 'a').x, xr = T(L1, 'a').x;
    const gaps = [T(R2, 'a').x - xl, T(R3, 'a').x - T(R2, 'b').x, xr - T(R3, 'b').x];
    assert.ok(Math.max(...gaps) - Math.min(...gaps) < 1, `${view}: even gaps ${gaps}`);
    // The battery sits midway between the sides.
    assert.ok(Math.abs((T(B, 'p').x + T(B, 'n').x) / 2 - (xl + xr) / 2) < 1, `${view}: battery centered`);
    const report = {};
    layout.tidyCost(doc, view, null, null, report);
    assert.deepEqual([report.overlaps, report.crossings, report.overParts], [0, 0, 0], view);
  }
});

test('series-parallel recognition: parallel branches yes, transistors and bridges no', () => {
  assert.ok(layout.seriesParallel(examples.build(examples.list[1], 'schematic'), 'schematic'), 'series and parallel example');
  assert.equal(layout.seriesParallel(examples.build(examples.list.findIndex((e) => /NPN/.test(e.title)) >= 0 ? examples.list[examples.list.findIndex((e) => /NPN/.test(e.title))] : examples.list[7], 'schematic'), 'schematic'), null, 'transistor circuits use the search');
  // A Wheatstone bridge is not series-parallel.
  const doc = circuit.createDoc();
  const ids = {};
  for (const [k, t] of [['B', 'battery'], ['R1', 'resistor'], ['R2', 'resistor'], ['R3', 'resistor'], ['R4', 'resistor'], ['R5', 'resistor']]) {
    const c = circuit.addComponent(doc, t);
    ids[k] = c.id;
    for (const v of layout.VIEWS) doc.layouts[v].comps[c.id] = { x: 0, y: 0, r: 0, f: false };
  }
  const w = (a, at, b, bt) => circuit.addWire(doc, { c: ids[a], t: at }, { c: ids[b], t: bt });
  w('B', 'p', 'R1', 'a'); w('B', 'p', 'R2', 'a'); w('R1', 'b', 'R3', 'a'); w('R2', 'b', 'R4', 'a');
  w('R3', 'b', 'B', 'n'); w('R4', 'b', 'B', 'n'); w('R5', 'a', 'R1', 'b'); w('R5', 'b', 'R2', 'b');
  assert.equal(layout.seriesParallel(doc, 'schematic'), null, 'bridge');
});

test('tidy up keeps meters and AC/DC supplies upright on the bench', () => {
  let seed = 21;
  const rand = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  for (const ex of examples.list) {
    const doc = examples.build(ex, 'realistic');
    const meters = doc.components.filter((c) => ['ammeter', 'voltmeter', 'scope', 'acsupply', 'dcsupply'].includes(c.type));
    if (!meters.length) continue;
    for (const pl of Object.values(doc.layouts.realistic.comps)) { pl.x += Math.round((rand() - 0.5) * 200); pl.y += Math.round((rand() - 0.5) * 200); pl.r = Math.floor(rand() * 4); }
    for (const w of doc.wires) doc.layouts.realistic.wires[w.id] = { pts: [] };
    layout.tidy(doc, 'realistic');
    for (const m of meters) assert.equal(doc.layouts.realistic.comps[m.id].r, 0, `${ex.title}: ${m.label} upright`);
  }
});

test('tidy up never turns the oscilloscope in the circuit diagram', () => {
  let seed = 33;
  const rand = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  for (const ex of examples.list) {
    const doc = examples.build(ex, 'schematic');
    const scopes = doc.components.filter((c) => c.type === 'scope');
    if (!scopes.length) continue;
    for (const pl of Object.values(doc.layouts.schematic.comps)) { pl.x += Math.round((rand() - 0.5) * 200); pl.y += Math.round((rand() - 0.5) * 200); pl.r = Math.floor(rand() * 4); }
    for (const w of doc.wires) doc.layouts.schematic.wires[w.id] = { pts: [] };
    layout.tidy(doc, 'schematic');
    for (const s of scopes) assert.equal(doc.layouts.schematic.comps[s.id].r, 0, `${ex.title}: ${s.label} upright`);
  }
});

test('sensor bounds contain upright slider pills clear of the body in every orientation', () => {
  for (const type of ['ldr', 'thermistor']) {
    const doc = circuit.createDoc();
    const c = circuit.addComponent(doc, type);
    const art = layout.artFor('realistic', type);
    const bodyRadius = type === 'ldr' ? 17.5 : 14;
    for (const r of [0, 1, 2, 3]) for (const f of [false, true]) {
      place(doc, c, 'realistic', 100, 200, r, f);
      const pl = doc.layouts.realistic.comps[c.id];
      const act = art.actuator(c.props, pl);
      const center = layout.xform(pl, act.cx, act.cy);
      const [x, y, w, h] = act.rect;
      const pill = { x: center.x + x, y: center.y + y, x2: center.x + x + w, y2: center.y + y + h };
      const bounds = layout.compBounds(doc, 'realistic', c.id);
      assert.ok(bounds.x <= pill.x && bounds.y <= pill.y && bounds.x2 >= pill.x2 && bounds.y2 >= pill.y2, `${type}, rotation ${r}, flip ${f}: pill inside bounds`);
      assert.ok(pill.x >= pl.x + bodyRadius + 4 || pill.x2 <= pl.x - bodyRadius - 4 || pill.y >= pl.y + bodyRadius + 1 || pill.y2 <= pl.y - bodyRadius - 1, `${type}, rotation ${r}, flip ${f}: pill clear of sensor`);
    }
  }
});

test('vertical meter reading pills leave a gap from the symbol for every reading width', () => {
  for (const type of ['ammeter', 'voltmeter']) {
    const art = layout.artFor('schematic', type);
    for (const r of [1, 3]) for (const f of [false, true]) {
      for (const display of ['0.00 A', '935 mV', '−999.999 mA', '—', '?']) {
        const reading = art.readingPill({ r, f, display });
        const center = layout.xform({ x: 0, y: 0, r, f }, reading.cx, reading.cy);
        assert.ok(Math.abs(center.x) - reading.width / 2 >= 24 - 1e-9, `${type}, ${display}, rotation ${r}, flip ${f}: gap from 16-unit symbol`);
      }
    }
  }
});

test('moving diagram parts reroutes stale corners instead of drawing apparent shorts', () => {
  const doc = examples.build({
    comps: [
      ['B1', 'battery', { emf: 6 }, [0, -130, 0], [0, -100, 2]],
      ['R1', 'rheostat', {}, [220, 0, 0], [-100, 100, 0]],
      ['L1', 'lamp', {}, [0, 130, 0], [100, 100, 0]]
    ],
    wires: [
      ['B1.p', 'R1.a', 'red', { s: [[-200, -100], [-200, 100]] }],
      ['R1.b', 'L1.a', 'blue'],
      ['L1.b', 'B1.n', 'black', { s: [[200, 100], [200, -100]] }]
    ]
  }, 'schematic');
  const savedWires = JSON.stringify(doc.wires), savedBends = JSON.stringify(doc.layouts.schematic.wires);
  const bench = JSON.stringify(doc.layouts.realistic);
  const rheostat = doc.components.find((c) => c.type === 'rheostat');
  const lamp = doc.components.find((c) => c.type === 'lamp');
  const check = () => {
    const routes = [...layout.routeAll(doc, 'schematic').values()];
    const segments = [];
    for (const r of routes) {
      const a = r.poly[1], b = r.poly[r.poly.length - 2];
      assert.ok((a.x - r.a.x) * r.a.dx + (a.y - r.a.y) * r.a.dy > 0, 'leaves along the outward lead');
      assert.ok((b.x - r.b.x) * r.b.dx + (b.y - r.b.y) * r.b.dy > 0, 'arrives from outside the lead');
      for (let i = 1; i < r.poly.length; i++) {
        const a = r.poly[i - 1], b = r.poly[i];
        assert.ok(a.x === b.x || a.y === b.y, 'orthogonal wire');
        for (const c of doc.components) {
          const box = layout.compBounds(doc, 'schematic', c.id);
          assert.ok(!(Math.min(a.x, b.x) < box.x2 - 3 && Math.max(a.x, b.x) > box.x + 3 &&
            Math.min(a.y, b.y) < box.y2 - 3 && Math.max(a.y, b.y) > box.y + 3), 'wire clears symbol and leads');
        }
        for (const [c, d] of segments) {
          if (a.y === b.y && c.y === d.y && a.y === c.y) {
            assert.ok(Math.min(Math.max(a.x, b.x), Math.max(c.x, d.x)) <= Math.max(Math.min(a.x, b.x), Math.min(c.x, d.x)), `no horizontal retracing: ${JSON.stringify([a,b,c,d])}`);
          }
          if (a.x === b.x && c.x === d.x && a.x === c.x) {
            assert.ok(Math.min(Math.max(a.y, b.y), Math.max(c.y, d.y)) <= Math.max(Math.min(a.y, b.y), Math.min(c.y, d.y)), 'no vertical retracing');
          }
        }
        segments.push([a, b]);
      }
    }
    assert.equal(JSON.stringify(doc.wires), savedWires, 'connections unchanged');
    assert.equal(JSON.stringify(doc.layouts.schematic.wires), savedBends, 'saved bends are not mutated by rendering');
    assert.equal(JSON.stringify(doc.layouts.realistic), bench, 'bench unchanged');
    return routes;
  };
  const original = check();
  assert.ok(original.some((r) => r.pts.length), 'valid manual corners are retained');
  for (const [rx, ry, lx, ly] of [[-220, 100, 100, 110], [-240, 100, 100, 110], [-220, 100, 200, 60], [-100, 100, 130, -100]]) {
    place(doc, rheostat, 'schematic', rx, ry);
    place(doc, lamp, 'schematic', lx, ly);
    check();
  }
  place(doc, rheostat, 'schematic', -100, 100);
  place(doc, lamp, 'schematic', 100, 100);
  assert.deepEqual(check(), original, 'returning parts restores valid manual corners');
});

test('diagram routing clears other terminals and corners even without a collinear overlap', () => {
  const doc = examples.build({
    comps: [
      ['B1', 'battery', { emf: 6 }, [0, -130, 0], [0, -100, 2]],
      ['R1', 'rheostat', {}, [220, 0, 0], [-180, -20, 0]],
      ['L1', 'lamp', {}, [0, 130, 0], [160, 30, 0]]
    ],
    wires: [
      ['B1.p', 'R1.a', 'red', { s: [[-140, -100], [-140, 100], [-230, 100], [-230, -20]] }],
      ['R1.b', 'L1.a', 'blue'],
      ['L1.b', 'B1.n', 'black', { s: [[210, 30], [210, -100]] }]
    ]
  }, 'schematic');
  const before = JSON.stringify(doc);
  const on = (p, a, b) => layout.nearestOnPoly([a, b], p).dist < 1e-6;
  // Both wire orderings must work: the first wire must reserve terminals that
  // later wires will use, and later wires must avoid earlier corners.
  for (const wires of [doc.wires.slice(), doc.wires.slice().reverse()]) {
    doc.wires = wires;
    const routes = layout.routeAll(doc, 'schematic');
    assert.deepEqual(layout.branchPoints(doc, routes), [], 'a series loop has no junction dots');
    const list = [...routes.values()];
    for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
      for (const p of list[i].poly) for (let k = 1; k < list[j].poly.length; k++) {
        assert.ok(!on(p, list[j].poly[k - 1], list[j].poly[k]), 'a vertex must not touch another wire');
      }
      for (const p of list[j].poly) for (let k = 1; k < list[i].poly.length; k++) {
        assert.ok(!on(p, list[i].poly[k - 1], list[i].poly[k]), 'an earlier corner must not lie on a later wire');
      }
    }
  }
  doc.wires.reverse();
  assert.equal(JSON.stringify(doc), before, 'routing does not mutate the circuit');
});

test('junction dots require an explicit shared terminal and three distinct directions', () => {
  const doc = circuit.createDoc();
  const j = circuit.addComponent(doc, 'junction');
  place(doc, j, 'schematic', 0, 0);
  const routes = new Map();
  for (const [x, y] of [[-140, 0], [140, 0], [0, 140]]) {
    const r = circuit.addComponent(doc, 'resistor');
    place(doc, r, 'schematic', x, y, x ? 0 : 1);
    const w = circuit.addWire(doc, { c: j.id, t: 'j' }, { c: r.id, t: 'a' }).wire;
    routes.set(w.id, layout.wireRoute(doc, 'schematic', w));
  }
  assert.deepEqual(layout.branchPoints(doc, layout.routeAll(doc, 'schematic')), [{ x: 0, y: 0 }], 'real three-way junction retained');
  // An unrelated wire touching the middle of another route used to fabricate
  // a dot. The dot calculation must never infer a connection from those pixels.
  const r = circuit.addComponent(doc, 'resistor');
  place(doc, r, 'schematic', 300, 300);
  const w = circuit.addWire(doc, { c: r.id, t: 'a' }, { c: r.id, t: 'b' }).wire;
  const a = layout.termWorld(doc, 'schematic', w.a), b = layout.termWorld(doc, 'schematic', w.b);
  routes.set(w.id, { a, b, poly: [a, { x: -70, y: 0 }, { x: -70, y: 200 }, b], pts: [] });
  assert.deepEqual(layout.branchPoints(doc, routes), [{ x: 0, y: 0 }], 'incidental bend contact never adds a dot');
});

test('diagram moves reject overlapping symbols while preserving group moves and the realistic view', () => {
  const doc = circuit.createDoc();
  const battery = circuit.addComponent(doc, 'battery'), lamp = circuit.addComponent(doc, 'lamp');
  place(doc, battery, 'schematic', 0, -100);
  place(doc, lamp, 'schematic', 160, 30);
  const before = JSON.stringify(doc);
  assert.equal(layout.canMove(doc, 'schematic', [lamp.id], -130, -130), false, 'lamp cannot cover battery');
  assert.equal(layout.canMove(doc, 'schematic', [lamp.id], 0, -130), true, 'clear position on the same row remains allowed');
  assert.equal(layout.canMove(doc, 'schematic', [battery.id, lamp.id], 300, 100), true, 'group spacing is preserved');
  assert.equal(layout.canMove(doc, 'realistic', [lamp.id], -130, -130), true, 'bench behavior is unchanged');
  assert.equal(JSON.stringify(doc), before, 'collision checks never mutate placements');
});

test('independent wire corners cannot touch, while ordinary interior crossings remain available', () => {
  const doc = circuit.createDoc();
  const ends = [[0, 0], [100, 100], [200, 0], [100, -100]].map(([x, y]) => {
    const j = circuit.addComponent(doc, 'junction');
    place(doc, j, 'schematic', x, y);
    return { c: j.id, t: 'j' };
  });
  const w1 = circuit.addWire(doc, ends[0], ends[1]).wire;
  const w2 = circuit.addWire(doc, ends[2], ends[3]).wire;
  for (const w of [w1, w2]) doc.layouts.schematic.wires[w.id] = { pts: [[100, 0]] };
  const routes = layout.routeAll(doc, 'schematic');
  const first = routes.get(w1.id), second = routes.get(w2.id);
  for (const p of first.poly) assert.ok(layout.nearestOnPoly(second.poly, p).dist > 0.5, 'second wire avoids the first corner');
  for (const p of second.poly) assert.ok(layout.nearestOnPoly(first.poly, p).dist > 0.5, 'new corners avoid the first wire');
  assert.deepEqual(layout.branchPoints(doc, routes), []);
  // Two straight wires crossing in their interiors can still be drawn with a
  // hop by the renderer, rather than needing a long detour or a junction dot.
  place(doc, doc.components[0], 'schematic', -100, 0);
  place(doc, doc.components[1], 'schematic', 100, 0);
  place(doc, doc.components[2], 'schematic', 0, -100);
  place(doc, doc.components[3], 'schematic', 0, 100);
  for (const w of [w1, w2]) doc.layouts.schematic.wires[w.id].pts = [];
  const crossing = layout.routeAll(doc, 'schematic');
  assert.equal(crossing.get(w1.id).poly.length, 2);
  assert.equal(crossing.get(w2.id).poly.length, 2);
  assert.deepEqual(layout.branchPoints(doc, crossing), []);
});

test('diagram wires cannot cross or touch their own earlier segments', () => {
  const doc = examples.build({
    comps: [
      ['B1', 'battery', { emf: 6 }, [0, -130, 0], [0, -100, 2]],
      ['R1', 'rheostat', {}, [220, 0, 0], [-200, -10, 0]],
      ['L1', 'lamp', {}, [0, 130, 0], [-110, -20, 0]]
    ],
    wires: [
      ['B1.p', 'R1.a', 'red', { s: [[-250, -100], [-250, -10]] }],
      ['R1.b', 'L1.a', 'blue', { s: [[-150, -10], [-150, -30], [-160, -30], [-160, -20]] }],
      ['L1.b', 'B1.n', 'black', { s: [[70, -20], [70, -100]] }]
    ]
  }, 'schematic');
  const before = JSON.stringify(doc);
  const assertSimple = (poly) => {
    for (let i = 1; i < poly.length; i++) for (let j = 1; j < i - 1; j++) {
      const a = poly[i - 1], b = poly[i], c = poly[j - 1], d = poly[j];
      const on = (p, q, r) => layout.nearestOnPoly([q, r], p).dist < 1e-6;
      assert.ok(!on(a, c, d) && !on(b, c, d) && !on(c, a, b) && !on(d, a, b), 'nonadjacent segments never touch');
      const orient = (p, q, r) => (q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x);
      assert.ok(!(orient(a, b, c) * orient(a, b, d) < 0 && orient(c, d, a) * orient(c, d, b) < 0), 'a wire never crosses itself');
    }
  };
  for (const r of layout.routeAll(doc, 'schematic').values()) assertSimple(r.poly);
  assert.equal(JSON.stringify(doc), before, 'rendering keeps the saved circuit intact');
  const w = doc.wires[1];
  // A proper interior crossing, rather than an end landing on an earlier run.
  doc.layouts.schematic.wires[w.id].pts = [[-140, -10], [-140, -40], [-170, -40], [-170, -20]];
  assertSimple(layout.wireRoute(doc, 'schematic', w).poly);
  // Exercise automatic candidates around the close, slightly offset leads too.
  doc.layouts.schematic.wires[w.id].pts = [];
  for (const y of [-30, -20, 0, 10]) {
    place(doc, doc.components[2], 'schematic', -110, y);
    for (const r of layout.routeAll(doc, 'schematic').values()) assertSimple(r.poly);
  }
});

test('diagram routes stay clear and simple across 1,569 valid lamp positions, including narrow lead gaps', () => {
  const doc = examples.build({
    comps: [
      ['B1', 'battery', { emf: 6 }, [0, -130, 0], [0, -100, 2]],
      ['R1', 'rheostat', {}, [220, 0, 0], [-180, 100, 0]],
      ['L1', 'lamp', {}, [0, 130, 0], [110, -100, 0]]
    ],
    wires: [
      ['B1.p', 'R1.a', 'red', { s: [[-240, -100], [-240, 100]] }],
      ['R1.b', 'L1.a', 'blue'],
      ['L1.b', 'B1.n', 'black', { s: [[200, 100], [200, -100]] }]
    ]
  }, 'schematic');
  const on = (p, a, b) => layout.nearestOnPoly([a, b], p).dist < 1e-6;
  const orient = (p, q, r) => (q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x);
  let count = 0;
  for (let x = -290; x <= 240; x += 10) for (let y = -160; y <= 180; y += 10) {
    place(doc, doc.components[2], 'schematic', x, y);
    if (!layout.canMove(doc, 'schematic', [doc.components[2].id], 0, 0)) continue;
    count++;
    const routes = [...layout.routeAll(doc, 'schematic').values()];
    const where = `lamp at ${x}, ${y}`;
    for (const r of routes) {
      const next = r.poly[1], prev = r.poly[r.poly.length - 2];
      assert.ok((next.x - r.a.x) * r.a.dx + (next.y - r.a.y) * r.a.dy > 0, `leaves outward: ${where}`);
      assert.ok((prev.x - r.b.x) * r.b.dx + (prev.y - r.b.y) * r.b.dy > 0, `arrives from outside: ${where}`);
      for (let i = 1; i < r.poly.length; i++) {
        const a = r.poly[i - 1], b = r.poly[i];
        for (const c of doc.components) {
          const box = layout.compBounds(doc, 'schematic', c.id);
          assert.ok(!(Math.min(a.x, b.x) < box.x2 - 3 && Math.max(a.x, b.x) > box.x + 3 &&
            Math.min(a.y, b.y) < box.y2 - 3 && Math.max(a.y, b.y) > box.y + 3), `clears ${c.type}: ${where}`);
        }
        for (let j = 1; j < i - 1; j++) {
          const c = r.poly[j - 1], d = r.poly[j];
          assert.ok(!on(a, c, d) && !on(b, c, d) && !on(c, a, b) && !on(d, a, b), `no self-contact: ${where}`);
          assert.ok(!(orient(a, b, c) * orient(a, b, d) < 0 && orient(c, d, a) * orient(c, d, b) < 0), `no self-crossing: ${where}`);
        }
      }
    }
    for (let i = 0; i < routes.length; i++) for (let j = 0; j < routes.length; j++) if (i !== j) {
      for (const p of routes[i].poly) for (let k = 1; k < routes[j].poly.length; k++) {
        assert.ok(!on(p, routes[j].poly[k - 1], routes[j].poly[k]), `no accidental wire contact: ${where}`);
      }
    }
  }
  assert.equal(count, 1569);
});

test('saved AC supplies below 1 Hz open at the supported minimum with a warning', () => {
  const doc = circuit.createDoc();
  circuit.addComponent(doc, 'acsupply', { props: { freq: 0.1 } });
  const opened = circuit.importDoc(circuit.exportDoc(doc));
  assert.equal(opened.doc.components[0].props.freq, 1);
  assert.ok(opened.warnings.some(w => w.includes('Frequency') && w.includes('outside')));
});

test('Tidy preserves clean AND and bridge diagrams, including symmetry and diagonal routes, on every click', () => {
  for (const title of ['Logic gate: AND', 'Full-wave bridge rectifier and oscilloscope']) {
    const doc = examples.build(examples.list.find(ex => ex.title === title), 'schematic');
    const before = JSON.stringify(doc);
    const routes = JSON.stringify([...layout.routeAll(doc, 'schematic')].map(([id, route]) => [id, route.poly]));
    for (let click = 0; click < 3; click++) {
      assert.equal(layout.tidy(doc, 'schematic'), false, title);
      assert.equal(JSON.stringify(doc), before, 'preserve both layouts and every connection');
      assert.equal(JSON.stringify([...layout.routeAll(doc, 'schematic')].map(([id, route]) => [id, route.poly])), routes);
    }
  }
});

test('parallel-resistor example has straight meter leads and positive branch readings', () => {
  const doc = examples.build(examples.list.find(ex => ex.title === 'Series and parallel resistors'), 'schematic');
  const byLabel = Object.fromEntries(doc.components.map(c => [c.label, c]));
  const routes = layout.routeAll(doc, 'schematic');
  const branch = doc.wires.filter(w => w.a.c === byLabel.A3.id || w.b.c === byLabel.A3.id);
  for (const wire of branch) assert.equal(routes.get(wire.id).poly.length, 2, 'no turn-back loop around the branch meter');
  const sim = solver.createSim(); sim.setDoc(doc);
  for (const [label, expected] of [['A1', .02], ['A2', .09], ['A3', .06]]) {
    const current = solver.reader(sim.result, byLabel[label]).i('p');
    assert.ok(Math.abs(current - expected) < 1e-9, label + ' keeps the correct polarity and current');
  }
  const quality = layout.schematicQuality(doc);
  assert.equal(quality.overParts, 0);
  assert.equal(quality.crossings, 0);
});


test('old rotated supply boxes open upright without rotating schematic symbols or changing connections', () => {
  for (const type of ['acsupply', 'dcsupply']) {
    const doc = circuit.createDoc();
    const supply = circuit.addComponent(doc, type);
    const load = circuit.addComponent(doc, 'resistor');
    for (const view of layout.VIEWS) {
      place(doc, supply, view, -200, 0, 3);
      place(doc, load, view, 100, 0);
      doc.layouts[view].ready = true;
    }
    const wire = circuit.addWire(doc, { c: supply.id, t: 'p' }, { c: load.id, t: 'a' }).wire;
    for (const view of layout.VIEWS) doc.layouts[view].wires[wire.id] = { pts: [[-100, -100]] };
    const restored = circuit.importDoc(circuit.exportDoc(doc)).doc;
    assert.equal(restored.layouts.realistic.comps[supply.id].r, 0);
    assert.equal(restored.layouts.schematic.comps[supply.id].r, 3);
    assert.deepEqual(restored.wires, doc.wires);
    assert.deepEqual(restored.layouts.realistic.wires[wire.id].pts, [], 'reroute only the straightened box leads');
    assert.deepEqual(restored.layouts.schematic.wires[wire.id].pts, [[-100, -100]]);
  }
});

test('generating or extending a bench view keeps supplies upright despite rotated schematic sources', () => {
  for (const type of ['acsupply', 'dcsupply']) {
    const doc = circuit.createDoc();
    const source = circuit.addComponent(doc, type);
    place(doc, source, 'schematic', 0, 0, 3);
    doc.layouts.schematic.ready = true;
    layout.generateLayout(doc, 'realistic', 'schematic');
    assert.equal(doc.layouts.realistic.comps[source.id].r, 0);
    const second = circuit.addComponent(doc, type);
    place(doc, second, 'schematic', 300, 0, 1.5);
    layout.placeInOtherViews(doc, [second.id], 'schematic');
    assert.equal(doc.layouts.realistic.comps[second.id].r, 0);
    assert.equal(doc.layouts.schematic.comps[second.id].r, 1.5);
  }
});


test('old yellow wires become purple on import and copy while connections are preserved', () => {
  const doc = circuit.createDoc();
  const supply = circuit.addComponent(doc, 'acsupply');
  const load = circuit.addComponent(doc, 'resistor');
  const wire = circuit.addWire(doc, { c: supply.id, t: 'p' }, { c: load.id, t: 'a' }, { color: 'yellow' }).wire;
  assert.equal(wire.color, 'purple', 'copy/add cannot reintroduce yellow wires');
  const old = circuit.exportDoc(doc);
  old.wires[0].color = 'yellow';
  const opened = circuit.importDoc(old).doc;
  assert.equal(opened.wires[0].color, 'purple');
  assert.deepEqual(opened.wires[0].a, wire.a);
  assert.deepEqual(opened.wires[0].b, wire.b);
  assert.ok(circuit.WIRE_COLORS.includes(opened.wires[0].color));
  assert.equal(circuit.WIRE_COLORS.includes('yellow'), false);
});

function scopedRlcLayout(channel = 'ch1') {
  const doc = circuit.createDoc(), parts = {};
  for (const [name, type, props, x, y] of [
    ['B', 'acsupply', { freq: 1 }, 0, -180], ['R', 'resistor', { R: 100 }, -180, 0],
    ['L', 'inductor', { L: 1 }, 0, 0], ['C', 'capacitor', { C: 1e-7 }, 180, 0],
    ['S1', 'scope', {}, -180, 200], ['S2', 'scope', {}, 0, 240], ['S3', 'scope', {}, 220, 200]
  ]) {
    parts[name] = circuit.addComponent(doc, type, { props });
    for (const view of layout.VIEWS) place(doc, parts[name], view, x, y);
  }
  for (const [from, to] of [
    ['B.p', 'R.a'], ['R.b', 'L.a'], ['L.b', 'C.p'], ['C.n', 'B.n'],
    [`S1.${channel}`, 'R.a'], ['S1.com', 'R.b'], [`S2.${channel}`, 'L.a'], ['S2.com', 'L.b'],
    [`S3.${channel}`, 'C.p'], ['S3.com', 'C.n']
  ]) {
    const [a, at] = from.split('.'), [b, bt] = to.split('.');
    circuit.addWire(doc, { c: parts[a].id, t: at }, { c: parts[b].id, t: bt });
  }
  return { doc, parts };
}

function assertScopeWireClearance(doc) {
  const routes = layout.routeAll(doc, 'schematic');
  for (const scope of doc.components.filter(c => c.type === 'scope')) {
    const pl = doc.layouts.schematic.comps[scope.id];
    // The rendered screen box is [-50,-34] to [50,30]; require space outside
    // its full stroke, including the border adjacent to its own socket leads.
    const corners = [[-52, -36], [52, -36], [-52, 32], [52, 32]].map(([x, y]) => layout.xform(pl, x, y));
    const box = { x: Math.min(...corners.map(p => p.x)), y: Math.min(...corners.map(p => p.y)),
      x2: Math.max(...corners.map(p => p.x)), y2: Math.max(...corners.map(p => p.y)) };
    for (const route of routes.values()) for (let i = 1; i < route.poly.length; i++) {
      const a = route.poly[i - 1], b = route.poly[i];
      assert.ok(!(Math.min(a.x, b.x) < box.x2 && Math.max(a.x, b.x) > box.x &&
        Math.min(a.y, b.y) < box.y2 && Math.max(a.y, b.y) > box.y), `wire clears all of ${scope.label}'s frame: ${JSON.stringify([a, b])}`);
    }
  }
}

for (const channel of ['ch1', 'ch2']) test(`single-channel ${channel} scopes use the series-parallel layout and clear their frames`, () => {
  for (const view of layout.VIEWS) {
    const { doc, parts } = scopedRlcLayout(channel);
    const wires = JSON.stringify(doc.wires), other = view === 'schematic' ? 'realistic' : 'schematic';
    const otherBefore = JSON.stringify(doc.layouts[other]);
    assert.ok(layout.seriesParallel(doc, view), 'probe branches take the fast path');
    assert.ok(layout.tidy(doc, view));
    assert.equal(JSON.stringify(doc.wires), wires, 'connections are unchanged');
    assert.equal(JSON.stringify(doc.layouts[other]), otherBefore, 'other view is unchanged');
    for (const name of ['S1', 'S2', 'S3']) assert.equal(doc.layouts[view].comps[parts[name].id].r, 0);
    if (view === 'schematic') {
      assertScopeWireClearance(doc);
      assert.equal(layout.schematicQuality(doc).defects, 0);
      const once = JSON.stringify(doc.layouts[view]);
      assert.equal(layout.tidy(doc, view), false);
      assert.equal(JSON.stringify(doc.layouts[view]), once, 'repeated Tidy is stable');
      assertScopeWireClearance(doc);
    }
  }
});

test('a scope with both channels connected retains the general layout path', () => {
  const { doc, parts } = scopedRlcLayout();
  circuit.addWire(doc, { c: parts.S1.id, t: 'ch2' }, { c: parts.L.id, t: 'b' });
  assert.equal(layout.seriesParallel(doc, 'schematic'), null);
});

test('routing and Tidy scoring reject wires on every oscilloscope frame edge', () => {
  for (const [a, b] of [
    [[-50, -100], [-50, 100]], [[50, -100], [50, 100]],
    [[-120, -34], [120, -34]], [[-120, 30], [120, 30]]
  ]) {
    const doc = circuit.createDoc();
    const scope = circuit.addComponent(doc, 'scope');
    const j1 = circuit.addComponent(doc, 'junction'), j2 = circuit.addComponent(doc, 'junction');
    place(doc, scope, 'schematic', 0, 0);
    place(doc, j1, 'schematic', ...a); place(doc, j2, 'schematic', ...b);
    const wire = circuit.addWire(doc, { c: j1.id, t: 'j' }, { c: j2.id, t: 'j' }).wire;
    doc.layouts.schematic.wires[wire.id] = { pts: [[(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]] };
    const report = {};
    layout.tidyCost(doc, 'schematic', null, null, report);
    assert.ok(report.overParts > 0, 'candidate scoring includes the entire frame');
    const before = JSON.stringify(doc);
    assertScopeWireClearance(doc);
    assert.equal(layout.routeAll(doc, 'schematic').get(wire.id).pts.length, 0, 'overlapping saved bends are rerouted');
    assert.equal(JSON.stringify(doc), before, 'rendering preserves stored layout and wiring');
  }
});

function directlyWiredParallel() {
  // Lamp and voltmeter wired straight onto the resistor's terminals, with no
  // junction parts, as students often build it.
  const doc = circuit.createDoc(), parts = {};
  for (const [name, type, x, y, r] of [['B', 'battery', 0, -100, 0], ['R', 'resistor', 0, 100, 0], ['A', 'ammeter', 150, 0, 1], ['V', 'voltmeter', 30, 200, 0], ['L', 'lamp', -200, 60, 1]]) {
    parts[name] = circuit.addComponent(doc, type);
    for (const view of layout.VIEWS) place(doc, parts[name], view, x, y, r);
  }
  for (const view of layout.VIEWS) doc.layouts[view].ready = true;
  for (const [from, to] of [['B.p', 'A.p'], ['A.n', 'R.b'], ['R.a', 'B.n'], ['V.p', 'R.b'], ['V.n', 'R.a'], ['L.a', 'R.a'], ['L.b', 'R.b']]) {
    const [a, at] = from.split('.'), [b, bt] = to.split('.');
    circuit.addWire(doc, { c: parts[a].id, t: at }, { c: parts[b].id, t: bt });
  }
  return { doc, parts };
}

test('Tidy draws branches wired straight onto terminals as a textbook diagram with junction dots', () => {
  const { doc } = directlyWiredParallel();
  const wires = JSON.stringify(doc.wires);
  assert.ok(layout.tidy(doc, 'schematic'));
  assert.equal(JSON.stringify(doc.wires), wires, 'connections unchanged');
  const quality = layout.schematicQuality(doc);
  assert.equal(quality.defects, 0, JSON.stringify(quality));
  const routes = layout.routeAll(doc, 'schematic');
  for (const w of doc.wires) assert.deepEqual(routes.get(w.id).pts, doc.layouts.schematic.wires[w.id].pts, 'the textbook bends are drawn as planned');
  assert.equal(layout.branchPoints(doc, routes).length, 4, 'a dot where each branch leaves the rail');
  assert.equal(layout.tidy(doc, 'schematic'), false, 'a second click changes nothing');
});

test('wires from one terminal may share a trunk and split at a dot; other wires may not run along it', () => {
  const make = (shareTerminal) => {
    const doc = circuit.createDoc();
    const r = circuit.addComponent(doc, 'resistor'), up = circuit.addComponent(doc, 'junction'), down = circuit.addComponent(doc, 'junction');
    const other = circuit.addComponent(doc, 'resistor');
    place(doc, r, 'schematic', 0, 0); place(doc, up, 'schematic', 100, -100); place(doc, down, 'schematic', 100, 100);
    place(doc, other, 'schematic', 0, 200);
    const w1 = circuit.addWire(doc, { c: r.id, t: 'b' }, { c: up.id, t: 'j' }).wire;
    const w2 = circuit.addWire(doc, shareTerminal ? { c: r.id, t: 'b' } : { c: other.id, t: 'b' }, { c: down.id, t: 'j' }).wire;
    doc.layouts.schematic.wires[w1.id] = { pts: [[100, 0]] };
    doc.layouts.schematic.wires[w2.id] = { pts: shareTerminal ? [[100, 0]] : [[60, 200], [60, 0], [100, 0]] };
    return { doc, w2 };
  };
  const shared = make(true);
  const routes = layout.routeAll(shared.doc, 'schematic');
  assert.deepEqual(routes.get(shared.w2.id).pts, [[100, 0]], 'the shared trunk is kept');
  assert.deepEqual(layout.branchPoints(shared.doc, routes), [{ x: 100, y: 0 }]);
  assert.equal(layout.schematicQuality(shared.doc).wireConflicts, 0);
  const unrelated = make(false);
  assert.equal(layout.routeAll(unrelated.doc, 'schematic').get(unrelated.w2.id).pts.length, 0, 'an unrelated wire along it is rerouted');
});

test('Tidy gives each junction of a series chain of parallel groups its own point', () => {
  const doc = circuit.createDoc(), p = {};
  for (const name of ['B', 'R1', 'R2', 'R3', 'R4', 'J1', 'J2', 'J3', 'J4']) {
    p[name] = circuit.addComponent(doc, name === 'B' ? 'battery' : name[0] === 'J' ? 'junction' : 'resistor');
    for (const view of layout.VIEWS) place(doc, p[name], view, (Object.keys(p).length * 70) % 400, Object.keys(p).length * 37);
  }
  for (const [from, to] of [['B.p', 'J1.j'], ['J1.j', 'R1.a'], ['J1.j', 'R2.a'], ['R1.b', 'J2.j'], ['R2.b', 'J2.j'], ['J2.j', 'J3.j'],
    ['J3.j', 'R3.a'], ['J3.j', 'R4.a'], ['R3.b', 'J4.j'], ['R4.b', 'J4.j'], ['J4.j', 'B.n']]) {
    const [a, at] = from.split('.'), [b, bt] = to.split('.');
    circuit.addWire(doc, { c: p[a].id, t: at }, { c: p[b].id, t: bt });
  }
  layout.tidy(doc, 'schematic');
  const at = (id) => doc.layouts.schematic.comps[id];
  assert.ok(at(p.J2.id).x !== at(p.J3.id).x || at(p.J2.id).y !== at(p.J3.id).y, 'J2 and J3 apart');
  assert.equal(layout.schematicQuality(doc).defects, 0);
});

test('Tidy finishes promptly and a second click leaves a tidied diagram alone', () => {
  let seed = 11;
  const rand = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  for (const ex of examples.list) {
    const doc = examples.build(ex, 'schematic');
    for (const pl of Object.values(doc.layouts.schematic.comps)) { pl.x += Math.round((rand() - 0.5) * 200); pl.y += Math.round((rand() - 0.5) * 200); pl.r = Math.floor(rand() * 4); }
    for (const w of doc.wires) doc.layouts.schematic.wires[w.id] = { pts: [] };
    const start = Date.now();
    layout.tidy(doc, 'schematic');
    assert.ok(Date.now() - start < 5000, `${ex.title}: ${Date.now() - start} ms`);
    // The search on the bridge may still find more after its time runs out.
    if (/bridge/.test(ex.title)) continue;
    const once = JSON.stringify(doc.layouts.schematic);
    assert.equal(layout.tidy(doc, 'schematic'), false, ex.title);
    assert.equal(JSON.stringify(doc.layouts.schematic), once, ex.title);
  }
});

test('display settings missing from a file match a new circuit; saved ones are kept', () => {
  const def = circuit.createDoc().settings;
  const bare = circuit.exportDoc(circuit.createDoc());
  delete bare.settings;
  const s = circuit.importDoc(bare).doc.settings;
  for (const key of ['showLabels', 'showValues', 'wireColorsInDiagram', 'currentFlow']) assert.equal(s[key], def[key], key);
  const saved = circuit.exportDoc(circuit.createDoc());
  saved.settings = { showLabels: true, showValues: false, currentFlow: false, wireColorsInDiagram: true };
  const t = circuit.importDoc(saved).doc.settings;
  assert.deepEqual([t.showLabels, t.showValues, t.currentFlow, t.wireColorsInDiagram], [true, false, false, true]);
  const old = circuit.exportDoc(circuit.createDoc());
  old.settings = { showLabels: false };
  assert.equal(circuit.importDoc(old).doc.settings.showValues, false, 'older files used one switch for labels and values');
});
