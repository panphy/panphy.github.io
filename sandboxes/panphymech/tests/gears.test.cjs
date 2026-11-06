// Gear checks against textbook results: node --test sandboxes/panphymech/tests/*.test.cjs
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

globalThis.planck = require(path.join(__dirname, '../js/vendor/planck.min.js'));
require(path.join(__dirname, '../js/scene.js'));
require(path.join(__dirname, '../js/physics.js'));
const { scene: S, physics: P } = globalThis.PPM;

function run(sim, seconds) {
  while (sim.t < seconds - 1e-12) sim.step();
}
const close = (actual, expected, tol, what) => assert.ok(Math.abs(actual - expected) <= tol, `${what}: ${actual} vs ${expected}`);

// A wheel with n teeth at (x, y), on an axle to the background (a motor when given).
function wheel(scene, n, x, y, motor) {
  const b = Object.assign(S.makeBody(scene, 'ball', x, y), { r: S.gearRadius(n), mass: 1 });
  scene.bodies.push(b);
  const axle = S.makeLink(scene, motor ? 'motor' : 'hinge', b.id, { x: 0, y: 0 }, null, { x, y });
  if (motor) Object.assign(axle, motor);
  scene.links.push(axle);
  return b;
}
function gear(scene, a, b, ra = 0, rb = 0) {
  const l = S.makeLink(scene, 'gear', a.id, { x: 0, y: 0 }, b.id, { x: 0, y: 0 });
  Object.assign(l, { ra, rb });
  scene.links.push(l);
  S.tidyLinks(scene);
  return l;
}
function pair(nA, nB, motor) {
  const scene = S.createScene();
  scene.world.floor = false;
  const a = wheel(scene, nA, 0, 2, motor);
  const b = wheel(scene, nB, S.gearRadius(nA) + S.gearRadius(nB), 2);
  const l = gear(scene, a, b);
  return { scene, a, b, l };
}

test('a gear wheel’s radius fits its teeth: r = N·p/(2π), and tidying snaps it', () => {
  const scene = S.createScene();
  const a = Object.assign(S.makeBody(scene, 'ball', 0, 1), { r: 0.5 });
  const b = Object.assign(S.makeBody(scene, 'ball', 1, 1), { r: 0.3 });
  scene.bodies.push(a, b);
  scene.links.push(S.makeLink(scene, 'gear', a.id, { x: 0, y: 0 }, b.id, { x: 0, y: 0 }));
  S.tidyLinks(scene);
  assert.equal(S.rimTeeth(a), 31);
  close(a.r, (31 * S.GEAR_PITCH) / (2 * Math.PI), 1e-12, 'radius of 31 teeth');
  assert.equal(S.rimTeeth(b), 19);
});

test('meshed wheels turn the other way at N_a/N_b of the driver’s speed', () => {
  const { scene, a, b, l } = pair(10, 30, { speed: 3, dir: 1, torque: 50 });
  assert.equal(S.gearProblem(scene, l), '');
  const sim = P.createSim(scene);
  run(sim, 1);
  const r = sim.readLink(l.id);
  assert.ok(r.active);
  close(r.omegaA, 3, 1e-6, 'driver ω');
  close(r.omegaB, -1, 1e-6, 'driven ω = −ω_a·N_a/N_b');
  close(sim.readBody(b.id).omega, -1, 1e-6, 'driven wheel’s own ω');
  assert.equal(r.ratio, 3);
});

test('the driven wheel gets N_b/N_a of the torque, and the teeth push with F = τ/r', () => {
  // A motor turning a 10-tooth gear lifts nothing; a constant 2 N m load on the 30-tooth gear.
  const { scene, a, b, l } = pair(10, 30, { speed: 3, dir: 1, torque: 50 });
  const sim = P.createSim(scene);
  const load = () => sim.bodies.get(b.id).applyTorque(2);
  for (let i = 0; i < 480; i++) { load(); sim.step(); }
  const r = sim.readLink(l.id);
  close(r.torqueB, -2, 1e-6, 'gear torque on the driven wheel balances the load');
  close(r.torqueA, -2 / 3, 1e-6, 'and on the driver it is three times smaller');
  close(r.force, 2 / S.gearRadius(30), 1e-6, 'tooth force');
  const motor = scene.links.find((x) => x.kind === 'hinge' && x.a === a.id);
  close(sim.readLink(motor.id).torque, 2 / 3, 1e-6, 'motor torque');
});

test('freely turning gears keep their kinetic energy', () => {
  const { scene, a, b } = pair(12, 20);
  a.omega = 5;
  // Start meshed: the driven wheel turns to match.
  b.omega = -5 * 12 / 20;
  const sim = P.createSim(scene);
  const ke = () => sim.totals().KE;
  const k0 = ke();
  run(sim, 5);
  close(ke(), k0, 1e-6 * k0 + 1e-9, 'kinetic energy');
});

test('a compound gear multiplies two 3:1 steps into 9:1', () => {
  const scene = S.createScene();
  scene.world.floor = false;
  const r10 = S.gearRadius(10), r30 = S.gearRadius(30);
  const a = wheel(scene, 10, 0, 3, { speed: 9, dir: 1, torque: 100 });
  const b = wheel(scene, 30, r10 + r30, 3);
  b.rings = [10];
  const c = wheel(scene, 30, r10 + r30, 3 - r10 - r30);
  const ab = gear(scene, a, b);
  const bc = gear(scene, b, c, 1, 0);
  assert.equal(S.gearProblem(scene, ab), '');
  assert.equal(S.gearProblem(scene, bc), '');
  const sim = P.createSim(scene);
  run(sim, 1);
  close(sim.readBody(c.id).omega, 1, 1e-6, 'output turns 9 times slower, the same way as the motor');
  for (let i = 0; i < 480; i++) { sim.bodies.get(c.id).applyTorque(-9); sim.step(); }
  close(sim.readLink(scene.links.find((x) => x.kind === 'hinge' && x.a === a.id).id).torque, 1, 1e-6, 'motor gives a ninth of the load torque');
});

test('gears need balls on one axle each, fixed to the same thing, at the meshing distance', () => {
  const { scene, a, b, l } = pair(10, 20);
  b.x += 0.1;
  assert.match(S.gearProblem(scene, l), /don’t mesh/);
  b.x -= 0.1;
  const axle = scene.links.find((x) => x.kind === 'hinge' && x.a === b.id);
  scene.links = scene.links.filter((x) => x !== axle);
  assert.match(S.gearProblem(scene, l), /needs a hinge or motor/);
  const added = S.ensureAxle(scene, b);
  assert.ok(added && added.kind === 'hinge');
  assert.equal(S.gearProblem(scene, l), '');
  b.fixed = true;
  assert.match(S.gearProblem(scene, l), /fixed in place/);
  b.fixed = false;
  // An axle on another object while the other wheel's is on the background.
  const frame = S.makeBody(scene, 'box', b.x, b.y);
  scene.bodies.push(frame);
  added.b = frame.id; added.lb = { x: 0, y: 0 };
  assert.match(S.gearProblem(scene, l), /same thing/);
  // A broken gear builds no joint and the wheels turn freely.
  const sim = P.createSim(scene);
  assert.equal(sim.readLink(l.id).active, false);
});

test('tidying removes gears without two balls, a second gear on one pair, and keeps rings smaller than the rim', () => {
  const { scene, a, b, l } = pair(10, 30);
  gear(scene, a, b);
  assert.equal(scene.links.filter((x) => x.kind === 'gear').length, 1, 'one gear per pair');
  b.rings = [40, 26, 26, 12, 3];
  S.tidyLinks(scene);
  assert.deepEqual(b.rings, [26, 12], 'smaller than 30 − 4, no repeats, at least 6, at most two');
  l.rb = 5;
  S.tidyLinks(scene);
  assert.equal(l.rb, 2, 'ring index stays in range');
  S.removeBody(scene, a.id);
  S.tidyLinks(scene);
  assert.equal(scene.links.some((x) => x.kind === 'gear'), false);
});

test('saving keeps gears and rings; a connector-only paste of a gear adds nothing', () => {
  const { scene, b, l } = pair(10, 30);
  b.rings = [15];
  l.rb = 1;
  b.x = S.gearRadius(10) + S.gearRadius(15);
  const back = S.parse(S.serialize(scene)).scene;
  const g = back.links.find((x) => x.kind === 'gear');
  assert.ok(g);
  assert.equal(g.rb, 1);
  assert.deepEqual(S.bodyById(back, b.id).rings, [15]);
  assert.equal(S.gearProblem(back, g), '');
  const frag = S.copyFragment(scene, { type: 'link', id: l.id });
  S.pasteFragment(scene, frag);
  S.tidyLinks(scene);
  assert.equal(scene.links.filter((x) => x.kind === 'gear').length, 1);
});

test('copying both wheels copies their gear, still meshed', () => {
  const { scene, a, b } = pair(10, 30);
  const frag = S.copyFragment(scene, { type: 'body', id: a.id }, [b.id]);
  const out = S.pasteFragment(scene, frag);
  S.tidyLinks(scene);
  const copy = scene.links.find((x) => x.kind === 'gear' && out.bodies.includes(x.a));
  assert.ok(copy);
  assert.equal(S.gearProblem(scene, copy), '');
});

test('meshGear slides a free wheel into mesh along the line between the axles', () => {
  const { scene, b, l } = pair(10, 30);
  S.transformBodies(scene, new Set([b.id]), (p, angle) => ({ x: p.x + 0.5, y: p.y + 0.2, angle }));
  assert.ok(S.meshGear(scene, l, b.id));
  assert.equal(S.gearProblem(scene, l), '');
  const axle = S.gearAxles(scene, b)[0].link;
  close(axle.lb.x, b.x, 1e-12, 'its axle moves with it');
});

test('tooth phases interleave where rings touch', () => {
  const { scene, a, b, l } = pair(10, 30);
  const ph = S.gearPhases(scene);
  // Wheel a has a tooth pointing at b; b has a gap pointing back at a.
  const pa = ph.get(`${a.id}:0`), pb = ph.get(`${b.id}:0`);
  const frac = (x, n) => { const s = (2 * Math.PI) / n; return ((((x % s) + s) % s) / s); };
  close(frac(pa - 0, 10), 0, 1e-9, 'a tooth faces b');
  close(frac(pb - Math.PI, 30), 0.5, 1e-9, 'a gap faces a');
  assert.ok(l);
});
