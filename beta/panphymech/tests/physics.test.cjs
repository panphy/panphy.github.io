// PanPhyMech physics checks against textbook results: node --test beta/panphymech/tests/*.test.cjs
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

globalThis.planck = require(path.join(__dirname, '../js/vendor/planck.min.js'));
require(path.join(__dirname, '../js/scene.js'));
require(path.join(__dirname, '../js/physics.js'));
require(path.join(__dirname, '../js/examples.js'));
const { scene: S, physics: P, examples: E } = globalThis.PPM;

function emptyScene(floor = false) {
  const scene = S.createScene();
  scene.world.floor = floor;
  return scene;
}

function run(sim, seconds, onStep) {
  while (sim.t < seconds - 1e-12) {
    sim.step();
    if (onStep) onStep(sim);
  }
}

// Times when y passes upward through its mean value, linearly interpolated.
function upwardCrossings(samples, mean) {
  const out = [];
  for (let i = 1; i < samples.length; i++) {
    const [t0, y0] = samples[i - 1];
    const [t1, y1] = samples[i];
    if (y0 < mean && y1 >= mean) out.push(t0 + ((mean - y0) / (y1 - y0)) * (t1 - t0));
  }
  return out;
}

// Semi-implicit Euler lags the exact position by ½·g·h·t (a few cm), which leaves fitted accelerations exact.
test('free fall matches s = ½gt² and v = gt', () => {
  const scene = emptyScene();
  scene.bodies.push(S.makeBody(scene, 'ball', 0, 100));
  const sim = P.createSim(scene);
  run(sim, 2);
  const r = sim.readBody(scene.bodies[0].id);
  assert.ok(Math.abs(r.vy + 9.81 * sim.t) < 1e-6, `vy ${r.vy}`);
  assert.ok(Math.abs(100 - 0.5 * 9.81 * sim.t * sim.t - r.y) < 0.05, `y ${r.y}`);
});

test('projectile range matches v² sin 2θ / g', () => {
  const scene = emptyScene();
  const b = S.makeBody(scene, 'ball', 0, 0);
  b.r = 0.05;
  b.vx = 10 * Math.cos(Math.PI / 4);
  b.vy = 10 * Math.sin(Math.PI / 4);
  scene.bodies.push(b);
  const sim = P.createSim(scene);
  let last = sim.readBody(b.id);
  let range = null;
  run(sim, 3, () => {
    const r = sim.readBody(b.id);
    if (range === null && last.y > 0 && r.y <= 0) range = last.x + ((0 - last.y) / (r.y - last.y)) * (r.x - last.x);
    last = r;
  });
  assert.ok(Math.abs(range - 100 / 9.81) < 0.05, `range ${range}`);
});

test('mass on a spring has period 2π√(m/k) and conserves energy', () => {
  const scene = emptyScene();
  const box = S.makeBody(scene, 'box', 0, 2);
  box.mass = 0.5;
  scene.bodies.push(box);
  const spring = S.makeLink(scene, 'spring', null, { x: 0, y: 4 }, box.id, { x: 0, y: 0 });
  spring.k = 20; spring.rest = 1.5;
  scene.links.push(spring);
  const sim = P.createSim(scene);
  const samples = [];
  const e0 = sim.totals().E;
  let drift = 0;
  run(sim, 6, () => {
    const r = sim.readBody(box.id);
    samples.push([sim.t, r.y]);
    drift = Math.max(drift, Math.abs(sim.totals().E - e0));
  });
  const eq = 4 - 1.5 - (0.5 * 9.81) / 20;
  const cross = upwardCrossings(samples, eq);
  const period = (cross[cross.length - 1] - cross[0]) / (cross.length - 1);
  const expected = 2 * Math.PI * Math.sqrt(0.5 / 20);
  assert.ok(Math.abs(period - expected) / expected < 0.005, `period ${period} vs ${expected}`);
  assert.ok(drift / Math.abs(e0 || 1) < 0.01, `energy drift ${drift}`);
});

test('simple pendulum on a rod has period close to 2π√(L/g) for small swings', () => {
  const scene = emptyScene();
  const L = 2;
  const theta = 5 * Math.PI / 180;
  const bob = S.makeBody(scene, 'ball', L * Math.sin(theta), 5 - L * Math.cos(theta));
  bob.r = 0.05;
  scene.bodies.push(bob);
  const rod = S.makeLink(scene, 'rod', null, { x: 0, y: 5 }, bob.id, { x: 0, y: 0 });
  rod.length = L;
  scene.links.push(rod);
  const sim = P.createSim(scene);
  const samples = [];
  run(sim, 12, () => samples.push([sim.t, sim.readBody(bob.id).x]));
  const cross = upwardCrossings(samples, 0);
  const period = (cross[cross.length - 1] - cross[0]) / (cross.length - 1);
  const expected = 2 * Math.PI * Math.sqrt(L / 9.81) * (1 + theta * theta / 16);
  assert.ok(Math.abs(period - expected) / expected < 0.01, `period ${period} vs ${expected}`);
});

test('elastic collision of carts conserves momentum and kinetic energy', () => {
  const scene = emptyScene(true);
  scene.world.floorFriction = 0;
  const a = S.makeBody(scene, 'box', -2, 0.25);
  const b = S.makeBody(scene, 'box', 2, 0.25);
  [a, b].forEach((x) => { x.friction = 0; x.restitution = 1; x.lockRotation = true; });
  a.mass = 1; b.mass = 2; a.vx = 3; b.vx = -1;
  scene.bodies.push(a, b);
  const sim = P.createSim(scene);
  run(sim, 3);
  const ra = sim.readBody(a.id);
  const rb = sim.readBody(b.id);
  const p = ra.px + rb.px;
  assert.ok(Math.abs(p - (3 - 2)) < 0.02, `momentum ${p}`);
  // 1-D elastic result: v1 = -7/3 m/s, v2 = 5/3 m/s.
  assert.ok(Math.abs(ra.vx + 7 / 3) < 0.05, `va ${ra.vx}`);
  assert.ok(Math.abs(rb.vx - 5 / 3) < 0.05, `vb ${rb.vx}`);
});

test('block on a ramp accelerates at g(sin θ − μ cos θ)', () => {
  const scene = emptyScene();
  const theta = 30 * Math.PI / 180;
  const ramp = S.makeBody(scene, 'plank', 0, 0);
  ramp.w = 20; ramp.h = 0.5; ramp.fixed = true; ramp.angle = -theta; ramp.friction = 0.2;
  const block = S.makeBody(scene, 'box', 0, 0);
  block.friction = 0.2; block.restitution = 0; block.angle = -theta;
  // Rest the block on the ramp's top surface, 6 m up the slope.
  const n = { x: Math.sin(theta), y: Math.cos(theta) };
  const along = { x: -Math.cos(theta), y: Math.sin(theta) };
  block.x = n.x * 0.5 + along.x * 6; block.y = n.y * 0.5 + along.y * 6;
  scene.bodies.push(ramp, block);
  const sim = P.createSim(scene);
  run(sim, 0.5);
  const v0 = sim.readBody(block.id).speed; const t0 = sim.t;
  run(sim, 1.5);
  const a = (sim.readBody(block.id).speed - v0) / (sim.t - t0);
  const expected = 9.81 * (Math.sin(theta) - 0.2 * Math.cos(theta));
  assert.ok(Math.abs(a - expected) / expected < 0.02, `a ${a} vs ${expected}`);
});

test('quadratic drag gives terminal velocity √(mg/k)', () => {
  const scene = emptyScene();
  const b = S.makeBody(scene, 'ball', 0, 500);
  b.mass = 0.2; b.drag = 0.05;
  scene.bodies.push(b);
  const sim = P.createSim(scene);
  run(sim, 8);
  const vt = Math.sqrt((0.2 * 9.81) / 0.05);
  assert.ok(Math.abs(-sim.readBody(b.id).vy - vt) / vt < 0.01, `v ${sim.readBody(b.id).vy}`);
});

test('every example builds and runs without errors', () => {
  E.list.forEach((ex) => {
    const { scene } = S.parse(S.serialize(ex.build()));
    const sim = P.createSim(scene);
    run(sim, 1);
    scene.bodies.forEach((b) => {
      const r = sim.readBody(b.id);
      assert.ok(Number.isFinite(r.x) && Number.isFinite(r.y), `${ex.title}: ${b.name}`);
    });
  });
});

test('scene files round-trip and reject other files', () => {
  const scene = E.list[0].build();
  const { scene: back, skipped } = S.parse(S.serialize(scene));
  assert.equal(skipped, 0);
  assert.equal(back.bodies.length, scene.bodies.length);
  assert.equal(back.links.length, scene.links.length);
  assert.throws(() => S.parse('{"format":"other"}'));
});

test('objects resting in the examples do not pop up when time starts', () => {
  ['ramp', 'collision', 'horizontal-spring', 'dominoes'].forEach((id) => {
    const scene = E.list.find((e) => e.id === id).build();
    const sim = P.createSim(scene);
    const start = new Map(scene.bodies.map((b) => [b.id, sim.readBody(b.id)]));
    run(sim, 0.05);
    scene.bodies.forEach((b) => {
      if (b.fixed || b.vx || b.vy) return;
      const r = sim.readBody(b.id);
      const s = start.get(b.id);
      // Free fall over 0.05 s would be 12 mm; a pop out of a surface would be about 15 mm upward.
      assert.ok(r.y - s.y < 0.001, `${id}: ${b.name} rose ${((r.y - s.y) * 1000).toFixed(1)} mm`);
    });
  });
});

test('fitting the view leaves out an object far from the rest', () => {
  const scene = E.list.find((e) => e.id === 'pendulum').build();
  const runaway = S.makeBody(scene, 'ball', 800, 40);
  runaway.name = 'Runaway';
  scene.bodies.push(runaway);
  const { box, far } = S.fitBox(scene);
  assert.deepEqual(far.map((f) => f.name), ['Runaway']);
  assert.ok(box.maxX < 10 && box.minY === 0, JSON.stringify(box));
});
