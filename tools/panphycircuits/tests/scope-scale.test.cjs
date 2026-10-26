const test = require('node:test');
const assert = require('node:assert/strict');
const { scopeScale } = require('../js/units.js');
const circuit = require('../js/circuit.js');
require('../js/registry.js');
require('../js/art-common.js');
const realistic = require('../js/art-realistic.js').art;
const props = { autoScale: true, tdiv: '0.1', v1: '1', v2: '2' };

test('auto scale fits both channels independently with headroom and keeps manual settings', () => {
  const trace = { t: [0, 0.5, 1], ch1: [-26.5, 0, 26.5], ch2: [0.2, 0, -0.2] };
  const before = JSON.stringify(props);
  const scale = scopeScale(props, trace);
  assert.deepEqual(scale, { v1: 10, v2: 0.1 });
  assert.ok(26.5 < 4 * scale.v1);
  assert.ok(0.2 < 4 * scale.v2);
  assert.equal(JSON.stringify(props), before);
  assert.deepEqual(scopeScale({ ...props, autoScale: false }, trace), { v1: 1, v2: 2 });
});

test('only visible finite samples affect the scale; empty and zero channels keep manual scales', () => {
  assert.deepEqual(scopeScale(props, { t: [0, 5, 6], ch1: [1000, -26.5, 20], ch2: [1000, NaN, NaN] }), { v1: 10, v2: 2 });
  assert.deepEqual(scopeScale(props, { t: [0, 1], ch1: [0, 0], ch2: [NaN, NaN] }), { v1: 1, v2: 2 });
  assert.deepEqual(scopeScale(props, { t: [], ch1: [], ch2: [] }), { v1: 1, v2: 2 });
  assert.deepEqual(scopeScale(props, undefined), { v1: 1, v2: 2 });
});

test('negative DC and small signals fit without changing the time base', () => {
  const settings = { ...props, tdiv: '0.5' };
  assert.deepEqual(scopeScale(settings, { t: [1], ch1: [-12], ch2: [0.003] }), { v1: 5, v2: 0.001 });
  assert.equal(settings.tdiv, '0.5');
});

test('scope artwork reports the same auto scale and saved documents preserve the toggle', () => {
  const doc = circuit.createDoc();
  const c = circuit.addComponent(doc, 'scope');
  assert.equal(c.props.autoScale, false);
  c.props.autoScale = true;
  const trace = { t: [0, 1], ch1: [-26.5, 26.5], ch2: [0.2, -0.2] };
  const svg = realistic.scope.draw({ p: c.props, scope: trace, uid: 'test', r: 0, f: false });
  assert.ok(svg.includes('1: 10 V/div'));
  assert.ok(svg.includes('2: 100 mV/div'));
  assert.equal(circuit.importDoc(circuit.exportDoc(doc)).doc.components[0].props.autoScale, true);
});

const { scopeTimeDiv, scopeTraceIndices } = require('../js/units.js');
const solver = require('../js/solver.js');
const schematic = require('../js/art-schematic.js').art;

function scopeCircuit(frequency = 44, scopeProps = {}) {
  const doc = circuit.createDoc();
  const supply = circuit.addComponent(doc, 'acsupply', { props: { freq: frequency, peak: 9.5 } });
  const load = circuit.addComponent(doc, 'resistor', { props: { R: 100 } });
  const scope = circuit.addComponent(doc, 'scope', { props: scopeProps });
  for (const [a, b] of [
    [[supply.id, 'p'], [load.id, 'a']], [[supply.id, 'n'], [load.id, 'b']],
    [[scope.id, 'ch1'], [load.id, 'a']], [[scope.id, 'com'], [load.id, 'b']]
  ]) circuit.addWire(doc, { c: a[0], t: a[1] }, { c: b[0], t: b[1] });
  const sim = solver.createSim(); sim.setDoc(doc);
  return { doc, supply, load, scope, sim };
}

test('automatic time base shows a few cycles, preserves manual settings, and uses each scope network', () => {
  for (const frequency of [0.1, 1, 44, 440, 1000]) {
    const f = scopeCircuit(frequency);
    const trace = f.sim.scopes[f.scope.id];
    const timeDiv = scopeTimeDiv(f.scope.props, trace);
    assert.ok(timeDiv * 10 * frequency >= 1.5 && timeDiv * 10 * frequency <= 5);
    assert.equal(f.scope.props.tdiv, '0.5');
    assert.equal(scopeTimeDiv({ ...f.scope.props, autoTime: false }, trace), 0.5);
  }
  const f = scopeCircuit(44);
  circuit.addComponent(f.doc, 'acsupply', { props: { freq: 0.1 } });
  f.sim.setDoc(f.doc);
  assert.equal(f.sim.scopes[f.scope.id].frequency, 44);
  assert.equal(scopeTimeDiv(f.scope.props, f.sim.scopes[f.scope.id]), 0.005);
  assert.equal(scopeTimeDiv(f.scope.props, { frequency: null }), 0.5);
});

test('44 Hz acquisition retains the correct sine voltage and a readable window', () => {
  const f = scopeCircuit();
  for (let i = 0; i < 500; i++) f.sim.step();
  const trace = f.sim.scopes[f.scope.id];
  assert.ok(trace.t.length > 200 && trace.t.length < 225);
  assert.ok(trace.t.at(-1) - trace.t[0] <= 0.05 + 1e-9);
  for (let i = 0; i < trace.t.length; i++) {
    assert.ok(Math.abs(trace.ch1[i] - 9.5 * Math.sin(2 * Math.PI * 44 * trace.t[i])) < 1e-7);
    assert.ok(Number.isNaN(trace.ch2[i]));
  }
  const svg = realistic.scope.draw({ p: f.scope.props, scope: trace, uid: 'sine', r: 0, f: false });
  assert.ok(svg.includes('5 ms/div'));
  const diagram = schematic.scope.draw({ p: f.scope.props, scope: trace, uid: 'sine-sch', r: 0, f: false });
  assert.ok(diagram.includes('stroke="#E0B400"'));
  assert.ok(!diagram.includes('NaN'));
  // There is no artificial alias: all displayed vertices are real solver samples.
  const indices = scopeTraceIndices(trace, 'ch1', 0.05, 240);
  assert.ok(indices.length > 200);
});

test('dense traces retain positive and negative peaks instead of aliasing to zero', () => {
  const trace = { t: [], ch1: [], ch2: [] };
  for (let i = 0; i < 16001; i++) {
    trace.t.push(i / 16000);
    trace.ch1.push(Math.sin(2 * Math.PI * i / 16));
    trace.ch2.push(Math.cos(2 * Math.PI * i / 16));
  }
  // Old every-Nth-point rendering picked zero crossings at this density.
  for (const channel of ['ch1', 'ch2']) {
    const indices = scopeTraceIndices(trace, channel, 1, 100);
    assert.ok(indices.length <= 501);
    for (let bucket = 0; bucket < 100; bucket++) {
      const values = indices.filter((i) => trace.t[i] >= bucket / 100 && trace.t[i] < (bucket + 1) / 100).map((i) => trace[channel][i]);
      assert.ok(Math.max(...values) > 0.99);
      assert.ok(Math.min(...values) < -0.99);
    }
  }
});

test('manual long acquisitions remain bounded and keep actual voltages after repeated compression', () => {
  const f = scopeCircuit(44, { autoTime: false });
  for (let i = 0; i < 25000; i++) f.sim.step();
  const trace = f.sim.scopes[f.scope.id];
  assert.ok(trace.t.length <= 8000);
  assert.ok(trace.t.at(-1) - trace.t[0] > 4.9);
  for (let i = 0; i < trace.t.length; i++) {
    assert.ok(Math.abs(trace.ch1[i] - 9.5 * Math.sin(2 * Math.PI * 44 * trace.t[i])) < 1e-7);
    if (i) assert.ok(trace.t[i] > trace.t[i - 1]);
  }
});

test('circuit edits discard old waveforms and auto-time selection survives saved files', () => {
  const f = scopeCircuit(); f.sim.step();
  assert.equal(f.sim.scopes[f.scope.id].t.length, 1);
  f.supply.props.freq = 440; f.sim.setDoc(f.doc);
  assert.equal(f.sim.scopes[f.scope.id].t.length, 0);
  assert.equal(f.sim.scopes[f.scope.id].frequency, 440);
  f.scope.props.autoTime = false; f.scope.props.tdiv = '0.0002';
  const saved = circuit.importDoc(circuit.exportDoc(f.doc)).doc.components.find((c) => c.type === 'scope');
  assert.equal(saved.props.autoTime, false);
  assert.equal(saved.props.tdiv, '0.0002');
});

test('trace reduction keeps undefined-channel gaps', () => {
  const trace = { t: [0, 0.1, 0.2, 0.3, 0.4], ch1: [0, 1, NaN, -1, 0] };
  const indices = scopeTraceIndices(trace, 'ch1', 1, 1);
  assert.ok(indices.includes(2));
  assert.deepEqual(indices, [0, 1, 2, 3, 4]);
});
