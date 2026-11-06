const test = require('node:test');
const assert = require('node:assert/strict');
globalThis.planck = require('../js/vendor/planck.min.js');
require('../js/scene.js');
require('../js/physics.js');
require('../js/svg.js');
require('../js/render.js');
const { scene: S } = globalThis.PPM;

function setup(names) {
  const scene = S.createScene();
  names.forEach((name, i) => scene.bodies.push(Object.assign(S.makeBody(scene, 'ball', i, 1), { name })));
  const renderer = PPM.render.createRenderer({ scene, display: {} }, {}, PPM.svg.createContext(100, 100));
  const ids = scene.bodies.map((b) => b.id);
  const force = (i, label) => ({ body: ids[i], label });
  const vel = (i) => ({ b: scene.bodies[i] });
  return { renderer, force, vel };
}

test('two or three objects: every arrow carries its object letter', () => {
  const { renderer, force, vel } = setup(['Fast ball', 'Slow ball']);
  const forces = [force(0, 'W'), force(0, 'T'), force(1, 'W'), force(1, 'F_s')];
  const L = renderer.arrowLabels(forces, [vel(0), vel(1)]);
  assert.deepEqual(forces.map(L.force), ['W_A', 'T_A', 'W_B', 'F_s,B']);
  assert.equal(L.velocity(vel(1).b), 'v_B');
  assert.equal(L.tags.size, 2);
});

test('several forces of one kind on one object are numbered', () => {
  const { renderer, force } = setup(['Block']);
  const forces = [force(0, 'W'), force(0, 'N'), force(0, 'N'), force(0, 'f')];
  const L = renderer.arrowLabels(forces, []);
  assert.deepEqual(forces.map(L.force), ['W', 'N_1', 'N_2', 'f']);
  assert.equal(L.tags.size, 0);
  const two = setup(['Block', 'Wedge']);
  const f2 = [two.force(0, 'N'), two.force(0, 'N'), two.force(1, 'N')];
  assert.deepEqual(f2.map(two.renderer.arrowLabels(f2, []).force), ['N_A1', 'N_A2', 'N_B']);
});

test('short names are used as tags; letters skip them', () => {
  const { renderer, force, vel } = setup(['B', 'Ball', 'm1']);
  const L = renderer.arrowLabels([force(0, 'N'), force(2, 'N'), force(2, 'N')], [vel(1)]);
  assert.deepEqual(['b', 'Ball', 'm1'].map((_, i) => L.tags.get(force(i, 'W').body)), ['B', 'A', 'm1']);
  assert.deepEqual([force(2, 'N'), force(2, 'N')].map((a, i) => L.force(a, i + 1)), ['N_m1,1', 'N_m1,2']);
});

test('more than three objects keep plain labels', () => {
  const { renderer, force, vel } = setup(['a1', 'a2', 'a3', 'a4']);
  const forces = [0, 1, 2, 3].map((i) => force(i, 'W')).concat([force(0, 'N'), force(0, 'N')]);
  const L = renderer.arrowLabels(forces, [vel(0)]);
  assert.deepEqual(forces.map(L.force), ['W', 'W', 'W', 'W', 'N', 'N']);
  assert.equal(L.velocity(vel(0).b), 'v');
  assert.equal(L.tags.size, 0);
});
