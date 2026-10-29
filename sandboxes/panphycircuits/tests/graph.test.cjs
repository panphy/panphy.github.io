// Run with: node --test sandboxes/panphycircuits/tests/*.test.cjs
const test = require('node:test');
const assert = require('node:assert/strict');
require('../js/units.js');
const registry = require('../js/registry.js');
const circuit = require('../js/circuit.js');
const solver = require('../js/solver.js');
require('../../../assets/graph-range.js');
const graph = require('../js/graph.js');

function advance(sim, seconds) {
  sim.advance(seconds, Infinity, () => 0);
}

test('ohmmeter Plot on graph records resistance on the shared time graph', () => {
  const doc = circuit.createDoc();
  const ohm = circuit.addComponent(doc, 'ohmmeter', { props: { plot: true } });
  const r = circuit.addComponent(doc, 'resistor', { props: { R: 2200 } });
  assert.ok(circuit.addWire(doc, { c: ohm.id, t: 'p' }, { c: r.id, t: 'a' }).wire);
  assert.ok(circuit.addWire(doc, { c: ohm.id, t: 'n' }, { c: r.id, t: 'b' }).wire);
  const sim = solver.createSim();
  sim.setDoc(doc);
  sim.setRunning(true);
  advance(sim, 0.05);
  const app = { doc, sim, graphRange: null };
  const series = graph.plottedSeries(app);
  assert.equal(series.length, 1);
  assert.equal(series[0].unit, 'Ω');
  assert.equal(series[0].key, ohm.id + ':R');
  const arr = sim.traces.series[series[0].key];
  assert.ok(arr && arr.length);
  const last = arr[arr.length - 1];
  assert.ok(Math.abs(last - 2200) < 1, `expected ~2200 Ω, got ${last}`);
});

test('oscilloscope Plot on graph adds CH1 and CH2 series', () => {
  const doc = circuit.createDoc();
  const supply = circuit.addComponent(doc, 'acsupply', { props: { peak: 5, freq: 10 } });
  const load = circuit.addComponent(doc, 'resistor', { props: { R: 100 } });
  const scope = circuit.addComponent(doc, 'scope', { props: { plot: true } });
  assert.ok(circuit.addWire(doc, { c: supply.id, t: 'p' }, { c: load.id, t: 'a' }).wire);
  assert.ok(circuit.addWire(doc, { c: supply.id, t: 'n' }, { c: load.id, t: 'b' }).wire);
  assert.ok(circuit.addWire(doc, { c: scope.id, t: 'ch1' }, { c: load.id, t: 'a' }).wire);
  assert.ok(circuit.addWire(doc, { c: scope.id, t: 'com' }, { c: load.id, t: 'b' }).wire);
  const sim = solver.createSim();
  sim.setDoc(doc);
  sim.setRunning(true);
  advance(sim, 0.2);
  const app = { doc, sim, graphRange: null };
  const series = graph.plottedSeries(app);
  assert.equal(series.length, 2);
  assert.deepEqual(series.map((s) => s.channel), ['ch1', 'ch2']);
  assert.ok(series.every((s) => s.unit === 'V'));
  const ch1 = sim.traces.series[scope.id + ':ch1'];
  assert.ok(ch1.some((v) => Number.isFinite(v) && Math.abs(v) > 0.1));
});

test('CSV and PanPhyPlot export include plotted meters and scope channels', () => {
  const doc = circuit.createDoc();
  const battery = circuit.addComponent(doc, 'battery', { props: { emf: 6 } });
  const r = circuit.addComponent(doc, 'resistor', { props: { R: 100 } });
  const a = circuit.addComponent(doc, 'ammeter', { props: { plot: true } });
  const v = circuit.addComponent(doc, 'voltmeter', { props: { plot: true } });
  const scope = circuit.addComponent(doc, 'scope', { props: { plot: true } });
  assert.ok(circuit.addWire(doc, { c: battery.id, t: 'p' }, { c: a.id, t: 'p' }).wire);
  assert.ok(circuit.addWire(doc, { c: a.id, t: 'n' }, { c: r.id, t: 'a' }).wire);
  assert.ok(circuit.addWire(doc, { c: r.id, t: 'b' }, { c: battery.id, t: 'n' }).wire);
  assert.ok(circuit.addWire(doc, { c: v.id, t: 'p' }, { c: r.id, t: 'a' }).wire);
  assert.ok(circuit.addWire(doc, { c: v.id, t: 'n' }, { c: r.id, t: 'b' }).wire);
  assert.ok(circuit.addWire(doc, { c: scope.id, t: 'ch1' }, { c: r.id, t: 'a' }).wire);
  assert.ok(circuit.addWire(doc, { c: scope.id, t: 'com' }, { c: r.id, t: 'b' }).wire);
  const sim = solver.createSim();
  sim.setDoc(doc);
  sim.setRunning(true);
  advance(sim, 0.05);
  const app = { doc, sim, graphRange: null };
  assert.equal(graph.hasExportData(app), true);
  const csv = graph.toCSV(app);
  assert.match(csv, /^"t \(s\)"/);
  assert.match(csv, new RegExp(`"${a.label} \\(A\\)"`));
  assert.match(csv, new RegExp(`"${v.label} \\(V\\)"`));
  assert.match(csv, new RegExp(`"${scope.label} CH1 \\(V\\)"`));
  assert.match(csv, new RegExp(`"${scope.label} CH2 \\(V\\)"`));
  const payload = graph.panPhyPlotPayload(app);
  assert.equal(payload.name, 'PanPhyCircuits');
  assert.equal(payload.columns[0].role, 'X');
  assert.equal(payload.columns[0].name, 't');
  assert.ok(payload.columns.some((c) => c.role === 'Y' && c.name === a.label && c.unit === 'A'));
  assert.ok(payload.columns.some((c) => c.role === 'Y' && c.name === `${scope.label} CH1`));
  assert.match(graph.panPhyPlotUrl(app), /^\/tools\/panphyplot\.html#import=/);
});

test('scope defaults include Plot on graph as an operational property', () => {
  const props = registry.defaultProps('scope');
  assert.equal(props.plot, false);
  const def = registry.get('scope');
  assert.ok(def.props.some((p) => p.key === 'plot' && p.operational));
  assert.ok(def.props.some((p) => p.key === 'autoScale'));
});

test('selected circuit exports exclude earlier and later samples and restore with Full Graph', () => {
  const doc = circuit.createDoc(), meter = circuit.addComponent(doc, 'voltmeter', { props: { plot: true } });
  const key = meter.id + ':V';
  const app = { doc, sim: { traces: { t: [0, 1, 2, 3, 4, 5], series: { [key]: [100, NaN, 2.25, 3.5, 400, 500] } } }, graphRange: { start: 2, end: 3 } };
  assert.deepEqual(graph.sampleRows(app, graph.plottedSeries(app)).rows.map(r=>r.t), [2,3]);
  const p = graph.panPhyPlotPayload(app);
  assert.deepEqual(p.columns[0].cells, ['2','3']); assert.deepEqual(p.columns[1].cells, ['2.25','3.5']);
  assert.equal(graph.toCSV(app).trim().split('\n').length, 3);
  app.graphRange=null; assert.equal(graph.toCSV(app).trim().split('\n').length,7);
  assert.equal(app.sim.traces.t.length,6);
});
