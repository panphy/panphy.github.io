// Animation samples the real solver, but never changes its time or state.
const test = require('node:test');
const assert = require('node:assert/strict');
require('../js/units.js');
require('../js/registry.js');
const circuit = require('../js/circuit.js');
const solver = require('../js/solver.js');
require('../js/art-common.js');
require('../js/render.js');
const { createFlowAnimation, wireCurrents } = globalThis.PPC.render;

function fixture({ frequency = 50, rectifier = false, speed = 1 } = {}) {
  const doc = circuit.createDoc();
  doc.settings.speed = speed;
  doc.settings.currentFlow = true;
  const source = circuit.addComponent(doc, 'acsupply', { props: { peak: 5, freq: frequency } });
  const load = circuit.addComponent(doc, 'resistor', { props: { R: 100 } });
  const dc = circuit.addComponent(doc, 'battery', { props: { emf: 6 } });
  const dcLoad = circuit.addComponent(doc, 'resistor', { props: { R: 200 } });
  const dcWire = circuit.addWire(doc, { c: dc.id, t: 'p' }, { c: dcLoad.id, t: 'a' }).wire;
  circuit.addWire(doc, { c: dcLoad.id, t: 'b' }, { c: dc.id, t: 'n' });
  let supplyEnd = { c: source.id, t: 'p' };
  if (rectifier) {
    const diode = circuit.addComponent(doc, 'diode');
    circuit.addWire(doc, supplyEnd, { c: diode.id, t: 'a' });
    supplyEnd = { c: diode.id, t: 'k' };
  }
  const wire = circuit.addWire(doc, supplyEnd, { c: load.id, t: 'a' }).wire;
  circuit.addWire(doc, { c: load.id, t: 'b' }, { c: source.id, t: 'n' });
  const sim = solver.createSim(); sim.setDoc(doc); sim.setRunning(true);
  const app = { doc, sim }, animation = createFlowAnimation(app);
  const acquire = (seconds = .1) => sim.advance(seconds, Infinity, () => 0, animation.sample);
  return { app, animation, source, wire, dcWire, acquire };
}

function cycle(f) {
  return Array.from({ length: 240 }, () => f.animation.update(1 / 120).get(f.wire.id));
}

test('50 Hz and 1 kHz flow replay at 1 visual Hz without changing the solver or DC network', () => {
  for (const frequency of [50, 1000]) {
    const f = fixture({ frequency }); f.acquire();
    const { sim } = f.app;
    const time = sim.t, result = sim.result, history = JSON.stringify([sim.capHist, sim.traces, sim.scopes]);
    const values = cycle(f);
    assert.ok(f.animation.slowed);
    assert.ok(values.some(v => v > .04) && values.some(v => v < -.04));
    for (let i = 0; i < 120; i++) assert.ok(Math.abs(values[i] - values[i + 120]) < 1e-9, 'one-second period');
    const reversals = values.slice(1).filter((v, i) => Math.sign(v) !== Math.sign(values[i])).length;
    assert.equal(reversals, 4, 'two direction changes per visual second');
    assert.equal(f.animation.update(0).get(f.dcWire.id), wireCurrents(f.app).get(f.dcWire.id));
    assert.equal(sim.t, time); assert.equal(sim.result, result);
    assert.equal(JSON.stringify([sim.capHist, sim.traces, sim.scopes]), history);
  }
});

test('half-wave rectification stays one-way and includes a nonconducting half-cycle', () => {
  const f = fixture({ rectifier: true }); f.acquire();
  const values = cycle(f);
  assert.ok(f.animation.slowed);
  assert.ok(Math.min(...values) > -1e-6, 'never invent reverse conduction');
  assert.ok(Math.max(...values) > .03);
  assert.ok(values.filter(v => Math.abs(v) < 1e-6).length > 100, 'retain blocked half-cycle');
});

test('low frequencies and intentional slow motion keep instantaneous currents', () => {
  for (const options of [{ frequency: .5 }, { frequency: 1 }, { frequency: 50, speed: .01 }]) {
    const f = fixture(options); f.acquire();
    assert.deepEqual(f.animation.update(.02), wireCurrents(f.app));
    assert.equal(f.animation.slowed, false);
  }
});

test('zero visual time freezes replay; circuit edits and display Off discard old waveforms', () => {
  const f = fixture(); f.acquire(); f.animation.update(.1);
  const frozen = f.animation.update(0);
  assert.deepEqual(f.animation.update(0), frozen);
  f.source.props.peak = 0;
  f.app.sim.setDoc(f.app.doc);
  assert.deepEqual(f.animation.update(0), wireCurrents(f.app));
  assert.equal(f.animation.slowed, false);
  f.source.props.peak = 5; f.app.sim.setDoc(f.app.doc); f.acquire(); f.animation.update(.1);
  assert.ok(f.animation.slowed);
  f.app.doc.settings.currentFlow = false;
  f.animation.update(0);
  assert.equal(f.animation.slowed, false);
});

test('mixed-frequency networks and insufficient solver resolution keep live flow', () => {
  const f = fixture();
  const second = circuit.addComponent(f.app.doc, 'acsupply', { props: { peak: 1, freq: 60 } });
  // Insert the second source in series with the first.
  const returnWire = f.app.doc.wires.find(w => w.b.c === f.source.id && w.b.t === 'n');
  returnWire.b = { c: second.id, t: 'p' };
  circuit.addWire(f.app.doc, { c: second.id, t: 'n' }, { c: f.source.id, t: 'n' });
  f.app.sim.setDoc(f.app.doc); f.acquire();
  assert.deepEqual(f.animation.update(.02), wireCurrents(f.app));
  assert.equal(f.animation.slowed, false);
  const coarse = fixture(); coarse.app.doc.settings.dt = .01; coarse.app.sim.setDoc(coarse.app.doc); coarse.acquire();
  assert.deepEqual(coarse.animation.update(.02), wireCurrents(coarse.app));
  assert.equal(coarse.animation.slowed, false);
});

test('independent AC networks slow separately while a low-frequency neighbor stays live', () => {
  const f = fixture();
  const doc = f.app.doc;
  const extras = [10, .5].map(freq => {
    const source = circuit.addComponent(doc, 'acsupply', { props: { peak: 3, freq } });
    const load = circuit.addComponent(doc, 'resistor', { props: { R: 100 } });
    const wire = circuit.addWire(doc, { c: source.id, t: 'p' }, { c: load.id, t: 'a' }).wire;
    circuit.addWire(doc, { c: load.id, t: 'b' }, { c: source.id, t: 'n' });
    return wire.id;
  });
  f.app.sim.setDoc(doc); f.acquire(); f.acquire();
  const first = f.animation.update(.25);
  const second = f.animation.update(1);
  for (const id of [f.wire.id, extras[0]]) {
    assert.ok(Math.abs(first.get(id) - second.get(id)) < 1e-9, 'each fast network has a one-second visual period');
  }
  assert.equal(first.get(extras[1]), wireCurrents(f.app).get(extras[1]));
  assert.equal(second.get(extras[1]), first.get(extras[1]));
});
