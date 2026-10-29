// PanPhyMech physics checks against textbook results: node --test sandboxes/panphymech/tests/*.test.cjs
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
  b.mass = 0.2; b.drag = 0.05; b.dragModel = 'quadratic';
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

// ---------- Merged and cut shapes ----------

globalThis.earcut = require(path.join(__dirname, '../js/vendor/earcut.min.js'));
globalThis.polygonClipping = require(path.join(__dirname, '../js/vendor/polygon-clipping.min.js'));
require(path.join(__dirname, '../js/shapes.js'));
const SH = globalThis.PPM.shapes;

function customFrom(scene, multi, props = {}) {
  const placed = SH.placeOutline(multi);
  const b = S.makeBody(scene, 'box', 0, 0);
  ['w', 'h'].forEach((k) => delete b[k]);
  Object.assign(b, placed, props);
  delete b.area;
  scene.bodies.push(b);
  return b;
}

test('merging two overlapping boxes gives the union area, total mass and the right centroid', () => {
  const scene = emptyScene();
  const a = S.makeBody(scene, 'box', 0, 0); a.w = 2; a.h = 1;
  const b = S.makeBody(scene, 'box', 1, 0.5); b.w = 1; b.h = 2;
  const multi = SH.union([a, b]);
  const placed = SH.placeOutline(multi);
  // The boxes overlap where x is 0.5 to 1 and y is −0.5 to 0.5, so the union is 2 + 2 − 0.5 m².
  assert.ok(Math.abs(placed.area - 3.5) < 1e-9, `area ${placed.area}`);
  const m = customFrom(scene, multi, { mass: 3 });
  const sim = P.createSim(scene);
  const pb = sim.bodies.get(m.id);
  assert.ok(Math.abs(pb.getMass() - 3) < 1e-9, `mass ${pb.getMass()}`);
  assert.ok(Math.hypot(pb.getLocalCenter().x, pb.getLocalCenter().y) < 1e-6, 'centroid at the body origin');
});

test('a hollow box cut with subtract holds a ball inside it', () => {
  const scene = emptyScene(true);
  const outer = S.makeBody(scene, 'box', 0, 1.015); outer.w = 2; outer.h = 2;
  const inner = S.makeBody(scene, 'box', 0, 1.1); inner.w = 1.6; inner.h = 1.6;
  const frame = SH.difference(outer, inner);
  assert.equal(frame.length, 1);
  assert.equal(frame[0].length, 2, 'outer ring and one hole');
  const box = customFrom(scene, frame, { mass: 5 });
  const ball = S.makeBody(scene, 'ball', 0, 1.5); ball.r = 0.2; ball.vx = 6; ball.restitution = 0.8;
  scene.bodies.push(ball);
  const sim = P.createSim(scene);
  for (let i = 0; i < 240 * 3; i++) {
    sim.step();
    const r = sim.readBody(ball.id);
    const bx = sim.readBody(box.id);
    assert.ok(Math.abs(r.x - bx.x) < 0.8 && r.y - bx.y < 0.8 && r.y - bx.y > -0.8, `ball escaped at t = ${sim.t.toFixed(2)}`);
  }
});

test('custom shapes survive saving and opening', () => {
  const scene = emptyScene();
  const ring = SH.difference(Object.assign(S.makeBody(scene, 'ball', 0, 2), { r: 1 }), Object.assign(S.makeBody(scene, 'ball', 0, 2), { r: 0.7 }));
  customFrom(scene, ring, { name: 'Ring' });
  const { scene: back, skipped } = S.parse(S.serialize(scene));
  assert.equal(skipped, 0);
  const r = back.bodies.find((b) => b.name === 'Ring');
  assert.ok(r && r.kind === 'custom' && Math.abs(S.area(r) - Math.PI * (1 - 0.49)) < 0.02, 'ring area');
  assert.ok(!S.containsPoint(r, { x: 0, y: 2 }), 'the hole is empty');
  assert.ok(S.containsPoint(r, { x: 0.85, y: 2 }), 'the ring is solid');
});

// ---------- Solid rods and ropes ----------

function bridge(solid) {
  const scene = emptyScene();
  const left = S.makeBody(scene, 'wall', -1.5, 1); left.fixed = true;
  const right = S.makeBody(scene, 'wall', 1.5, 1); right.fixed = true;
  const pin = S.makeBody(scene, 'ball', -1.2, 2); pin.r = 0.05; pin.mass = 0.1;
  scene.bodies.push(left, right, pin);
  // A rod from the background at (-1.2, 2) to the background at (1.2, 2) needs one body end,
  // so pin one end to a small ball hinged to the background.
  const hinge = S.makeLink(scene, 'hinge', pin.id, { x: 0, y: 0 }, null, { x: -1.2, y: 2 });
  const rod = S.makeLink(scene, 'rod', pin.id, { x: 0, y: 0 }, null, { x: 1.2, y: 2 });
  rod.length = 2.4; rod.solid = solid; rod.mass = 1;
  scene.links.push(hinge, rod);
  const ball = S.makeBody(scene, 'ball', 0, 3); ball.r = 0.15;
  scene.bodies.push(ball);
  return { scene, ball };
}

test('a ball lands on a solid rod but falls through an ideal one', () => {
  [true, false].forEach((solid) => {
    const { scene, ball } = bridge(solid);
    const sim = P.createSim(scene);
    run(sim, 1.5);
    const y = sim.readBody(ball.id).y;
    if (solid) assert.ok(y > 2, `ball should rest on the rod, y = ${y}`);
    else assert.ok(y < 1.5, `ball should fall through, y = ${y}`);
  });
});

test('a solid rod pivoted at one end swings with period 2π√(2L/3g)', () => {
  const scene = emptyScene();
  const L = 1.5;
  const theta = 4 * Math.PI / 180;
  const tip = S.makeBody(scene, 'ball', L * Math.sin(theta), 5 - L * Math.cos(theta)); tip.r = 0.01; tip.mass = 0.0001;
  scene.bodies.push(tip);
  const rod = S.makeLink(scene, 'rod', null, { x: 0, y: 5 }, tip.id, { x: 0, y: 0 });
  rod.length = L; rod.solid = true; rod.mass = 2;
  scene.links.push(rod);
  const sim = P.createSim(scene);
  const samples = [];
  run(sim, 10, () => samples.push([sim.t, sim.readBody(tip.id).x]));
  const cross = upwardCrossings(samples, 0);
  const period = (cross[cross.length - 1] - cross[0]) / (cross.length - 1);
  const expected = 2 * Math.PI * Math.sqrt((2 * L) / (3 * 9.81));
  assert.ok(Math.abs(period - expected) / expected < 0.01, `period ${period} vs ${expected}`);
});

test('a hanging solid rope keeps its length and counts its own energy', () => {
  const scene = emptyScene();
  const weight = S.makeBody(scene, 'box', 0.8, 3.5); weight.mass = 1;
  scene.bodies.push(weight);
  const rope = S.makeLink(scene, 'rope', null, { x: 0, y: 4 }, weight.id, { x: 0, y: 0 });
  rope.length = 2; rope.solid = true; rope.mass = 0.5;
  scene.links.push(rope);
  const sim = P.createSim(scene);
  run(sim, 4);
  const r = sim.readBody(weight.id);
  const d = Math.hypot(r.x, r.y - 4);
  assert.ok(d <= 2 * 1.01, `rope stretched to ${d}`);
  assert.ok(sim.solidPoints(rope.id).length > 10, 'made of many links');
  const e = sim.connectorEnergy();
  assert.ok(e.GPE !== 0, 'the rope has gravitational energy of its own');
});

test('a solid rope slung between two fixed pegs catches a falling ball', () => {
  const scene = emptyScene(true);
  const p1 = S.makeBody(scene, 'ball', -2, 3); p1.r = 0.1; p1.fixed = true;
  const p2 = S.makeBody(scene, 'ball', 2, 3); p2.r = 0.1; p2.fixed = true;
  const ball = S.makeBody(scene, 'ball', 0.3, 4.5); ball.r = 0.3; ball.mass = 1;
  scene.bodies.push(p1, p2, ball);
  const rope = S.makeLink(scene, 'rope', p1.id, { x: 0, y: 0 }, p2.id, { x: 0, y: 0 });
  rope.length = 4.6; rope.solid = true; rope.mass = 0.3;
  scene.links.push(rope);
  const sim = P.createSim(scene);
  run(sim, 4);
  assert.ok(sim.readBody(ball.id).y > 1, `ball should hang in the rope, y = ${sim.readBody(ball.id).y}`);
});

test('objects attached to the background still land on the floor', () => {
  ['rope', 'rod', 'hinge'].forEach((kind) => {
    const scene = emptyScene(true);
    const box = S.makeBody(scene, 'box', 2.5, 1); box.w = 0.6; box.h = 0.6;
    scene.bodies.push(box);
    // Hung from a point whose reach (3 m) goes below the floor, so the swing must hit it.
    const l = kind === 'hinge'
      ? S.makeLink(scene, 'hinge', box.id, { x: -0.3, y: 0.3 }, null, { x: 2.2, y: 1.3 })
      : S.makeLink(scene, kind, null, { x: 0, y: 2.5 }, box.id, { x: 0, y: 0 });
    if (kind !== 'hinge') l.length = 3;
    scene.links.push(l);
    const sim = P.createSim(scene);
    let lowest = Infinity;
    run(sim, 3, () => {
      const pose = sim.pose(box.id);
      S.vertices(box).forEach((v) => { lowest = Math.min(lowest, S.toWorld(pose, v).y); });
    });
    assert.ok(lowest > -0.02, `${kind}: went ${(-lowest).toFixed(2)} m below the floor`);
  });
});

test('world viscosity defaults to zero and old files preserve drag-free motion', () => {
  const scene = emptyScene(); scene.world.gravity = 0;
  assert.equal(scene.world.viscosity, 0);
  const b = S.makeBody(scene, 'ball', 0, 0); b.vx = 2; scene.bodies.push(b);
  delete scene.world.viscosity;
  const restored = S.parse(S.serialize(scene)).scene;
  assert.equal(restored.world.viscosity, 0);
  const sim = P.createSim(restored); run(sim, 1);
  assert.ok(Math.abs(sim.readBody(b.id).vx - 2) < 1e-9);
});

test('Stokes drag gives terminal speed mg/(6πrη) and the expected velocity decay', () => {
  const scene = emptyScene(); scene.world.dragModel = 'linear'; scene.world.linearDragSource = 'stokes'; scene.world.viscosity = 0.2;
  const b = S.makeBody(scene, 'ball', 0, 500); b.r = 0.2; b.mass = 0.2; scene.bodies.push(b);
  const sim = P.createSim(scene); run(sim, 5);
  const vt = b.mass * scene.world.gravity / (6 * Math.PI * b.r * scene.world.viscosity);
  assert.ok(Math.abs(-sim.readBody(b.id).vy - vt) / vt < 0.001);
  const free = emptyScene(); free.world.gravity = 0; free.world.dragModel = 'linear'; free.world.linearDragSource = 'stokes'; free.world.viscosity = 0.05;
  const ball = S.makeBody(free, 'ball', 0, 0); ball.r = 0.25; ball.mass = 1; ball.vx = 3; free.bodies.push(ball);
  const decay = P.createSim(free); run(decay, 1);
  const expected = 3 * Math.exp(-6 * Math.PI * ball.r * free.world.viscosity / ball.mass * decay.t);
  assert.ok(Math.abs(decay.readBody(ball.id).vx - expected) / expected < 0.001);
});

test('maximum Stokes viscosity is stable and inactive quadratic settings do not interfere', () => {
  for (const drag of [0, S.LIMITS.drag[1]]) {
    const scene = emptyScene(); scene.world.gravity = 0; scene.world.dragModel = 'linear'; scene.world.linearDragSource = 'stokes'; scene.world.viscosity = S.LIMITS.viscosity[1];
    const b = S.makeBody(scene, 'ball', 0, 0); b.r = S.LIMITS.r[1]; b.mass = S.LIMITS.mass[0]; b.vx = 500; b.drag = drag;
    scene.bodies.push(b); const sim = P.createSim(scene); let previous = b.vx;
    for (let i = 0; i < 240; i++) {
      sim.step(); const r = sim.readBody(b.id);
      assert.ok(Number.isFinite(r.x) && Number.isFinite(r.vx));
      assert.ok(r.vx >= 0 && r.vx <= previous); previous = r.vx;
    }
  }
});

test('viscosity updates live without resetting time and tracks mass changes', () => {
  const scene = emptyScene(); scene.world.gravity = 0;
  const b = S.makeBody(scene, 'box', 0, 0); b.vx = 2; scene.bodies.push(b);
  const sim = P.createSim(scene); run(sim, 0.1); const time = sim.t;
  scene.world.dragModel = 'linear'; scene.world.linearDragSource = 'stokes'; scene.world.viscosity = 0.5; sim.syncParams(); assert.equal(sim.t, time);
  const c = 6 * Math.PI * Math.sqrt(S.area(b) / Math.PI) * scene.world.viscosity;
  assert.ok(Math.abs(sim.bodies.get(b.id).getLinearDamping() - c / b.mass) < 1e-9);
  b.mass *= 2; sim.syncParams();
  assert.ok(Math.abs(sim.bodies.get(b.id).getLinearDamping() - c / b.mass) < 1e-9);
  run(sim, sim.t + 0.1); assert.ok(sim.readBody(b.id).vx < 2);
  scene.world.viscosity = 0; sim.syncParams(); const vx = sim.readBody(b.id).vx;
  run(sim, sim.t + 0.1); assert.ok(Math.abs(sim.readBody(b.id).vx - vx) < 1e-9);
});

test('viscosity files round-trip and invalid or out-of-range values are normalized', () => {
  for (const [value, expected] of [[0.123, 0.123], [-1, 0], [100, 1], ['bad', 0], [null, 0]]) {
    const scene = emptyScene(); scene.world.viscosity = value;
    assert.equal(S.parse(S.serialize(scene)).scene.world.viscosity, expected);
  }
});

test('solid connectors receive world drag and update it live', () => {
  const { scene } = bridge(true); scene.world.dragModel = 'linear'; scene.world.linearDragSource = 'stokes'; scene.world.viscosity = 1;
  const sim = P.createSim(scene);
  let coefficient = 0;
  for (let pb = sim.world.getBodyList(); pb; pb = pb.getNext()) {
    if (pb.isDynamic() && !pb.getUserData()) coefficient += pb.getLinearDamping() * pb.getMass();
  }
  const rod = scene.links.find(l => l.kind === 'rod');
  const expected = 6 * Math.PI * Math.sqrt(rod.length * 0.06 / Math.PI);
  assert.ok(Math.abs(coefficient - expected) < 1e-9);
  run(sim, 0.5);
  scene.world.viscosity = 0; sim.syncParams();
  for (let pb = sim.world.getBodyList(); pb; pb = pb.getNext()) assert.equal(pb.getLinearDamping(), 0);
});

test('terminal-velocity example reaches 99% speed after about one-third of the drop', () => {
  const example = E.list.find(ex => ex.id === 'terminal-velocity');
  const scene = example.build();
  assert.equal(scene.bodies.length, 2); assert.equal(scene.links.length, 0);
  const [free, drag] = scene.bodies;
  const physicalProperties = b => Object.fromEntries(Object.entries(b).filter(([key]) => !['id', 'name', 'x', 'dragModel'].includes(key)));
  assert.deepEqual(physicalProperties(free), physicalProperties(drag), 'only their positions, names, IDs and drag choices differ');
  assert.equal(free.dragModel, 'none'); assert.equal(drag.dragModel, 'world');
  assert.equal(scene.world.dragModel, 'quadratic');
  assert.equal(example.track.name, drag.name); assert.equal(example.track.group, 'velocity');
  const terminalSpeed = Math.sqrt(drag.mass * scene.world.gravity / scene.world.drag);
  assert.equal(terminalSpeed, 4);
  const height = drag.y - drag.r - S.REST_GAP.ball;
  assert.equal(height, 10);
  const sim = P.createSim(scene);
  let thresholdFraction = null, atThird = null, checkedPlateau = false;
  while (sim.t < 4) {
    sim.step(); const d = sim.readBody(drag.id), f = sim.readBody(free.id);
    const fraction = (drag.y - d.y) / height;
    if (thresholdFraction === null && -d.vy >= 0.99 * terminalSpeed) thresholdFraction = fraction;
    if (!atThird && fraction >= 1 / 3) atThird = { drag: d.vy, free: f.vy };
    if (fraction > 0.5 && fraction < 0.9) {
      assert.ok(Math.abs(-d.vy - terminalSpeed) / terminalSpeed < 0.002);
      checkedPlateau = true;
    }
  }
  assert.ok(thresholdFraction > 0.29 && thresholdFraction < 0.36, `99% reached at ${thresholdFraction} of the drop`);
  assert.ok(Math.abs(-atThird.drag - terminalSpeed) / terminalSpeed < 0.01);
  assert.ok(-atThird.free > 2 * terminalSpeed, 'the drag-free ball is still accelerating');
  assert.equal(checkedPlateau, true);
  for (const b of [free, drag]) {
    const reading = sim.readBody(b.id);
    assert.ok(Math.abs(reading.vy) < 0.01, `${b.name} should stop after landing`);
    assert.ok(reading.y < b.r + 0.03);
  }
});
