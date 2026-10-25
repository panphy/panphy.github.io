// Run with: node --test beta/panphycircuits/tests/*.test.cjs
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

test('tidy up never makes a layout worse, keeps every connection and leaves no overlaps', () => {
  let seed = 7;
  const rand = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const otherView = (v) => (v === 'realistic' ? 'schematic' : 'realistic');
  const check = (doc, view, label) => {
    const wiresBefore = JSON.stringify(doc.wires);
    const other = JSON.stringify(doc.layouts[otherView(view)]);
    const before = layout.tidyCost(doc, view);
    layout.tidy(doc, view);
    assert.equal(JSON.stringify(doc.wires), wiresBefore, `${label}: connections unchanged`);
    assert.equal(JSON.stringify(doc.layouts[otherView(view)]), other, `${label}: other view untouched`);
    assert.ok(doc.wires.every((w) => doc.layouts[view].wires[w.id].pts.length === 0), `${label}: bends removed`);
    const report = {};
    const after = layout.tidyCost(doc, view, null, null, report);
    assert.ok(after <= before + 0.5, `${label}: cost ${before} -> ${after}`);
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
      assert.ok(r.after < r.before * 0.75, `${ex.title} (${view}): messy layout clearly improved (${r.before} -> ${r.after})`);
    }
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
