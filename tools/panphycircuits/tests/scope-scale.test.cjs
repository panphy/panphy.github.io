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
