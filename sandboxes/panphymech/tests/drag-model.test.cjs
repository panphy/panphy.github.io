const test = require('node:test');
const assert = require('node:assert/strict');
globalThis.planck = require('../js/vendor/planck.min.js');
require('../js/scene.js'); require('../js/physics.js');
const { scene: S, physics: P } = globalThis.PPM;
function setup() {
  const scene = S.createScene(); scene.world.floor = false; scene.world.gravity = 0;
  const b = S.makeBody(scene, 'ball', 0, 0); b.mass = 1; b.r = 0.25; b.vx = 2; scene.bodies.push(b);
  return { scene, b };
}
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, `${a} != ${b}`);

test('new objects inherit World, and each mode enables exactly one force law', () => {
  const { scene, b } = setup(); assert.equal(b.dragModel, 'world');
  for (const world of ['none', 'linear', 'quadratic']) for (const object of ['world', 'none', 'linear', 'quadratic']) {
    scene.world.dragModel = world; scene.world.linearDrag = 3; scene.world.drag = 4;
    b.dragModel = object; b.linearDrag = 5; b.drag = 6;
    const c = S.dragCoefficients(scene, b), model = object === 'world' ? world : object;
    assert.equal(c.model, model);
    close(c.linear, model === 'linear' ? object === 'world' ? 3 : 5 : 0);
    close(c.quadratic, model === 'quadratic' ? object === 'world' ? 4 : 6 : 0);
    assert.equal(scene.world.dragModel, world, 'an override never changes World');
  }
});

test('linear override suppresses World quadratic drag; None suppresses all drag', () => {
  for (const mode of ['linear', 'none', 'world']) {
    const { scene, b } = setup(); scene.world.dragModel = 'quadratic'; scene.world.drag = 0.4;
    b.dragModel = mode; b.linearDrag = 3;
    const sim = P.createSim(scene); sim.step();
    const expected = mode === 'none' ? 2 : mode === 'linear' ? 2 / (1 + sim.h * 3) : 2 - sim.h * 0.4 * 4;
    close(sim.readBody(b.id).vx, expected);
  }
});

test('quadratic override suppresses World Stokes drag, including after a live switch', () => {
  const { scene, b } = setup(); scene.world.dragModel = 'linear'; scene.world.linearDragSource = 'stokes'; scene.world.viscosity = 1;
  b.dragModel = 'quadratic'; b.drag = 0.5;
  const sim = P.createSim(scene); assert.equal(sim.bodies.get(b.id).getLinearDamping(), 0);
  sim.step(); close(sim.readBody(b.id).vx, 2 - sim.h * 0.5 * 4);
  const t = sim.t; b.dragModel = 'world'; sim.syncParams(); assert.equal(sim.t, t);
  close(sim.bodies.get(b.id).getLinearDamping(), 6 * Math.PI * b.r);
  b.dragModel = 'none'; sim.syncParams(); assert.equal(sim.bodies.get(b.id).getLinearDamping(), 0);
  const v = sim.readBody(b.id).vx; sim.step(); close(sim.readBody(b.id).vx, v);
});

test('only deliberate movable-object overrides produce notes, even if the model matches World', () => {
  const { scene, b } = setup(); scene.world.dragModel = 'linear';
  assert.equal(S.dragOverrideNote(scene, b), '');
  b.dragModel = 'linear'; assert.match(S.dragOverrideNote(scene, b), /doesn’t follow the World drag settings/);
  b.dragModel = 'none'; assert.match(S.dragOverrideNote(scene, b), /World drag/);
  b.fixed = true; assert.equal(S.dragOverrideNote(scene, b), '');
  b.fixed = false; b.dragModel = 'world'; assert.equal(S.dragOverrideNote(scene, b), '');
});

test('drag models and independent parameters round-trip, clamp safely, and migrate old files', () => {
  const { scene, b } = setup(); scene.world.dragModel = 'quadratic'; scene.world.drag = 2;
  b.dragModel = 'linear'; b.linearDragSource = 'stokes'; b.viscosity = 0.001; b.linearDrag = 4;
  const copy = S.parse(S.serialize(scene)).scene;
  assert.equal(copy.world.dragModel, 'quadratic'); close(copy.world.drag, 2);
  assert.equal(copy.bodies[0].dragModel, 'linear'); close(copy.bodies[0].viscosity, 0.001);
  copy.bodies[0].linearDrag = Infinity; copy.bodies[0].viscosity = -1;
  const normalized = S.parse(S.serialize(copy)).scene.bodies[0]; close(normalized.linearDrag, 1); close(normalized.viscosity, 0);
  const legacy = JSON.parse(S.serialize(scene));
  delete legacy.world.dragModel; delete legacy.world.linearDragSource; legacy.world.viscosity = 0.1;
  delete legacy.bodies[0].dragModel; legacy.bodies[0].drag = 0.3;
  const migrated = S.parse(legacy).scene;
  assert.equal(migrated.world.dragModel, 'linear'); assert.equal(migrated.world.linearDragSource, 'stokes');
  assert.equal(migrated.bodies[0].dragModel, 'quadratic');
  assert.match(S.dragOverrideNote(migrated, migrated.bodies[0]), /World drag/);
  legacy.bodies[0].drag = 0; assert.equal(S.parse(legacy).scene.bodies[0].dragModel, 'world');
});

test('World quadratic drag also reaches solid connector segments', () => {
  const { scene, b } = setup(); b.fixed = true;
  scene.world.dragModel = 'quadratic'; scene.world.drag = 0.3;
  const l = S.makeLink(scene, 'rod', b.id, { x: 0, y: 0 }, null, { x: 1, y: 0 });
  l.length = 1; l.solid = true; scene.links.push(l);
  const sim = P.createSim(scene);
  let segment; for (let pb = sim.world.getBodyList(); pb; pb = pb.getNext()) if (pb.isDynamic()) segment = pb;
  segment.setLinearVelocity(planck.Vec2(0, 1));
  let applied;
  const original = segment.applyForceToCenter;
  segment.applyForceToCenter = function (force, wake) { applied = force; return original.call(this, force, wake); };
  sim.step(); close(applied.x, 0); close(applied.y, -0.3);
  assert.equal(segment.getLinearDamping(), 0);
});


test('the largest direct linear coefficient stays stable at minimum mass', () => {
  const { scene, b } = setup(); scene.world.dragModel = 'linear'; scene.world.linearDrag = S.LIMITS.linearDrag[1]; b.mass = S.LIMITS.mass[0];
  const sim = P.createSim(scene); let previous = b.vx;
  for (let i = 0; i < 240; i++) {
    sim.step(); const v = sim.readBody(b.id).vx;
    assert.ok(Number.isFinite(v) && v >= 0 && v <= previous); previous = v;
  }
});
