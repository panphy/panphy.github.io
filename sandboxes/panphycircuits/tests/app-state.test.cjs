const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
require('../js/units.js');
const registry = require('../js/registry.js');
const circuit = require('../js/circuit.js');
const solver = require('../js/solver.js');
require('../js/art-common.js');
require('../js/art-realistic.js');
require('../js/art-schematic.js');
require('../js/layout.js');

// Exercise the application and frame loop with the real solver, without UI mounting.
function setup(doc) {
  const source = fs.readFileSync(require.resolve('../js/app.js'), 'utf8');
  const panel = { hidden: true };
  const ui = new Proxy({}, { get: () => () => {} });
  const context = {
    PPC: { ...globalThis.PPC, testUI: ui },
    localStorage: { getItem: () => null },
    performance: { now: () => 0 }, Date: { now: () => 1000 },
    document: { getElementById: () => panel },
    requestAnimationFrame() {}, setTimeout: () => 0, clearTimeout() {}
  };
  vm.runInNewContext(source.slice(0, source.indexOf('  // ---------- Startup ----------')) +
    'let ui = PPC.testUI; PPC.testFrame = frame; })(globalThis);', context);
  const app = context.PPC.app;
  app.editor = { abortWiring() {} };
  app.renderer = { renderAll() {}, sampleFlow() {}, updateDynamic() {}, updateFlow() {} };
  app.audio = { sample() {}, update() {} };
  app.graph = { draw() {} };
  app.fit = () => {};
  app.renderAll = () => {};
  for (const v of ['realistic', 'schematic']) {
    doc.layouts[v].ready = true;
    doc.components.forEach((c, i) => { doc.layouts[v].comps[c.id] ||= { x: 200 * i, y: 0, r: 0 }; });
  }
  app.loadDoc(doc);
  const uiSource = fs.readFileSync(require.resolve('../js/ui.js'), 'utf8');
  const fields = { app, registry, circuit };
  vm.runInNewContext(uiSource.slice(uiSource.indexOf('    function changeField(e)'), uiSource.indexOf("    insp.addEventListener('change', changeField);")), fields);
  return { app, frame: context.PPC.testFrame, changeField: fields.changeField };
}

function wire(doc, a, at, b, bt) {
  const result = circuit.addWire(doc, { c: a.id, t: at }, { c: b.id, t: bt });
  assert.ok(result.wire, result.error);
}

test('AC fuse overloads are caught inside frames, independently of frame-end phase', () => {
  for (const frameMs of [10, 20, 40]) {
    const doc = circuit.createDoc();
    const source = circuit.addComponent(doc, 'acsupply', { props: { peak: 10, freq: 50 } });
    const fuse = circuit.addComponent(doc, 'fuse', { props: { rating: 5 } });
    const load = circuit.addComponent(doc, 'resistor', { props: { R: 1 } });
    wire(doc, source, 'p', fuse, 'a'); wire(doc, fuse, 'b', load, 'a'); wire(doc, load, 'b', source, 'n');
    const { app, frame } = setup(doc);
    frame(frameMs);
    assert.equal(fuse.props.blown, true, `${frameMs} ms frame`);
    assert.ok(app.sim.result.ok);
    assert.ok(Math.abs(solver.reader(app.sim.result, load).i('a')) < 1e-8);
    assert.ok(app.sim.t >= frameMs / 1000 - app.sim.dt);
  }
});

test('initial-energy slider updates apply the newest signed value without advancing time', () => {
  for (const [type, key, terminalA, terminalB, history, stored] of [
    ['capacitor', 'v0', 'p', 'n', 'capHist', 'v1'],
    ['inductor', 'i0', 'a', 'b', 'indHist', 'i1']
  ]) {
    const doc = circuit.createDoc();
    const part = circuit.addComponent(doc, type);
    const load = circuit.addComponent(doc, 'resistor', { props: { R: 10 } });
    wire(doc, part, terminalA, load, 'a'); wire(doc, part, terminalB, load, 'b');
    const { app } = setup(doc);
    app.paused = true; app.sim.setRunning(false);
    for (const value of [2, -1, 0.5]) {
      part.props[key] = value;
      app.applyInitialEnergy(part.id);
      assert.equal(app.sim[history][part.id][stored], value);
      const r = solver.reader(app.sim.result, part);
      const shown = type === 'capacitor' ? r.v(terminalA, terminalB) : r.i(terminalA);
      assert.ok(Math.abs(shown - value) < 1e-8);
      assert.equal(app.sim.t, 0);
      assert.equal(app.sim.running, false);
    }
    app.commit('Release initial-energy slider');
    assert.equal(app.sim[history][part.id][stored], 0.5);
  }
});

test('new slider edits after undo discard redo and create their own undo step', () => {
  const doc = circuit.createDoc(); const resistor = circuit.addComponent(doc, 'resistor');
  const { app } = setup(doc);
  const set = value => { circuit.getComp(app.doc, resistor.id).props.R = value; app.commit('Resistance', { merge: resistor.id + 'R' }); };
  set(200); set(300);
  assert.equal(app.history.stack.length, 2, 'continuous slider edits still coalesce');
  circuit.addComponent(app.doc, 'cell'); app.commit('Add cell');
  app.undo();
  set(400);
  assert.equal(app.canRedo(), false);
  app.undo();
  assert.equal(circuit.getComp(app.doc, resistor.id).props.R, 300);
  app.redo();
  assert.equal(circuit.getComp(app.doc, resistor.id).props.R, 400);
  set(500);
  app.undo();
  assert.equal(circuit.getComp(app.doc, resistor.id).props.R, 400, 'redo ends the previous slider gesture');
  app.redo();
  assert.equal(circuit.getComp(app.doc, resistor.id).props.R, 500);
});

test('paused scope scale edits and undo retain acquisition; source edits still clear it', () => {
  const doc = circuit.importDoc(fs.readFileSync(require.resolve('../examples/full-wave-bridge-rectifier-and-oscilloscope.ppcir'), 'utf8')).doc;
  const scopeId = doc.components.find(c => c.type === 'scope').id;
  const { app, changeField } = setup(doc);
  app.selection.comps.add(scopeId);
  for (let i = 0; i < 300; i++) app.sim.step();
  app.paused = true; app.sim.setRunning(false);
  const samples = app.sim.scopes[scopeId], time = app.sim.t;
  assert.ok(samples.t.length > 100);
  for (const [key, value] of [['v1', '2'], ['v2', '5'], ['tdiv', '0.01']]) {
    changeField({ target: { dataset: { prop: key }, value } });
    app.undo(); app.redo();
    assert.equal(app.sim.scopes[scopeId], samples);
    assert.equal(app.sim.t, time);
    assert.equal(app.sim.running, false);
  }
  for (const key of ['autoScale', 'autoTime']) {
    changeField({ target: { dataset: { prop: key }, checked: false } });
    assert.equal(app.sim.scopes[scopeId], samples);
  }
  app.doc.components.find(c => c.type === 'acsupply').props.peak = 4;
  app.commit('Source voltage');
  assert.equal(app.sim.scopes[scopeId].t.length, 0);
});
