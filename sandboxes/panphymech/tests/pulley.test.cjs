// Fixed pulley checks against textbook results: node --test sandboxes/panphymech/tests/*.test.cjs
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

globalThis.planck = require(path.join(__dirname, '../js/vendor/planck.min.js'));
require(path.join(__dirname, '../js/scene.js'));
require(path.join(__dirname, '../js/physics.js'));
require(path.join(__dirname, 'examples.cjs'));
const { scene: S, physics: P, examples: E } = globalThis.PPM;
const g = 9.81;

function run(sim, seconds, onStep) {
  while (sim.t < seconds - 1e-12) {
    sim.step();
    if (onStep) onStep(sim);
  }
}
const close = (actual, expected, tol, what) => assert.ok(Math.abs(actual - expected) <= tol, `${what}: ${actual} vs ${expected}`);
const byName = (scene, name) => scene.bodies.find((b) => b.name === name);

// Two boxes hanging straight down from a wheel of radius 0.3 m at (0, 3).
function atwood(m1, m2, opts = {}) {
  const scene = S.createScene();
  scene.world.floor = false;
  const a = Object.assign(S.makeBody(scene, 'box', -0.3, 1), { w: 0.2, h: 0.2, mass: m1 }, opts.a);
  const b = Object.assign(S.makeBody(scene, 'box', 0.3, 1), { w: 0.2, h: 0.2, mass: m2 }, opts.b);
  scene.bodies.push(a, b);
  const l = S.makeLink(scene, 'pulley', a.id, opts.la || { x: 0, y: 0.1 }, b.id, { x: 0, y: 0.1 });
  Object.assign(l, { px: 0, py: 3, r: 0.3 });
  l.length = S.linkLength(scene, l);
  scene.links.push(l);
  return { scene, a, b, l };
}

test('pulley geometry: tangent points, wrap and length; the length changes along each straight part', () => {
  const c = { x: 0, y: 0 }; const r = 0.5;
  const pa = { x: -0.5, y: -2 }; const pb = { x: 0.5, y: -3 };
  const geo = S.pulleyGeometry(c, r, pa, pb, S.pulleyWinding(c, pa, pb));
  assert.equal(geo.wind, 1, 'two hanging ends go over the top');
  close(geo.ta.x, -0.5, 1e-12, 'ta.x'); close(geo.ta.y, 0, 1e-12, 'ta.y');
  close(geo.tb.x, 0.5, 1e-12, 'tb.x');
  close(geo.wrap, Math.PI, 1e-12, 'wrap');
  close(geo.total, 2 + 3 + Math.PI * r, 1e-12, 'total');
  // Moving an end changes the total at the rate u · (its velocity), at any angle.
  const qa = { x: -1.7, y: -1.1 }; const qb = { x: 1.2, y: 0.4 };
  const base = S.pulleyGeometry(c, r, qa, qb, 1);
  const h = 1e-6;
  for (const [dx, dy] of [[1, 0], [0, 1]]) {
    const moved = S.pulleyGeometry(c, r, { x: qa.x + dx * h, y: qa.y + dy * h }, qb, 1);
    close((moved.total - base.total) / h, base.ua.x * dx + base.ua.y * dy, 1e-5, 'd total / d a');
  }
});

test('Atwood machine: a = (m₂ − m₁)g/(m₁ + m₂) and T = 2m₁m₂g/(m₁ + m₂), as in the example', () => {
  const scene = E.list.find((e) => e.id === 'atwood').build();
  const light = byName(scene, '2 kg mass'); const heavy = byName(scene, '3 kg mass');
  const pulley = scene.links.find((l) => l.kind === 'pulley');
  const sim = P.createSim(scene);
  run(sim, 1);
  const a = ((heavy.mass - light.mass) * g) / (light.mass + heavy.mass);
  close(sim.readBody(heavy.id).vy, -a * sim.t, 1e-6, 'heavy mass velocity');
  close(sim.readBody(light.id).vy, a * sim.t, 1e-6, 'light mass velocity');
  close(sim.readLink(pulley.id).force, (2 * light.mass * heavy.mass * g) / (light.mass + heavy.mass), 1e-6, 'tension');
  close(sim.readBody(heavy.id).x, heavy.x, 1e-9, 'the vertical rope does not swing');
});

test('cart pulled by a hanging mass: a = m₂g/(m₁ + m₂) and T = m₁m₂g/(m₁ + m₂), as in the example', () => {
  const scene = E.list.find((e) => e.id === 'cart-pulley').build();
  const cart = byName(scene, 'Cart'); const hang = byName(scene, 'Hanging mass');
  const pulley = scene.links.find((l) => l.kind === 'pulley');
  const sim = P.createSim(scene);
  run(sim, 0.4);
  const a = (hang.mass * g) / (cart.mass + hang.mass);
  close(sim.readBody(cart.id).vx, a * sim.t, 1e-6, 'cart velocity');
  close(sim.readBody(hang.id).vy, -a * sim.t, 1e-6, 'hanging mass velocity');
  close(sim.readLink(pulley.id).force, (cart.mass * hang.mass * g) / (cart.mass + hang.mass), 1e-6, 'tension');
  close(sim.readBody(cart.id).y, cart.y, 1e-6, 'the cart stays on the bench');
  // Each end feels the tension along its own side of the rope, where the rope meets it.
  const onCart = sim.forcesOn(cart.id).find((f) => f.label === 'T');
  close(onCart.fx, sim.readLink(pulley.id).force, 1e-6, 'horizontal pull on the cart'); close(onCart.fy, 0, 1e-9, 'no vertical pull');
  assert.ok(onCart.x > sim.readBody(cart.id).x + cart.w / 2 - 0.02, 'it acts at the cart’s front face');
  const onHang = sim.forcesOn(hang.id).find((f) => f.label === 'T');
  close(onHang.fy, sim.readLink(pulley.id).force, 1e-6, 'upward pull on the hanging mass'); close(onHang.fx, 0, 1e-9, 'no sideways pull');
  // When the mass lands, the rope goes slack and the frictionless cart coasts.
  run(sim, 1.4);
  const r = sim.readLink(pulley.id);
  assert.ok(r.slack > 0.05 && r.force === 0, `slack ${r.slack}, tension ${r.force}`);
});

test('equal masses stay at rest and the rope holds each with T = mg', () => {
  const { scene, a, b, l } = atwood(1.5, 1.5);
  const sim = P.createSim(scene);
  run(sim, 2);
  close(sim.readBody(a.id).vy, 0, 1e-9, 'a'); close(sim.readBody(b.id).vy, 0, 1e-9, 'b');
  close(sim.readBody(a.id).y, a.y, 1e-6, 'a stays put');
  close(sim.readLink(l.id).force, 1.5 * g, 1e-6, 'tension');
});

test('a slack rope never pushes, and catches the masses cleanly when it goes taut again', () => {
  // Equal masses; one is thrown upward at 2 m/s, so the rope goes slack until t = v/g.
  const { scene, a, b, l } = atwood(1, 1, { b: { vy: 2 } });
  const sim = P.createSim(scene);
  let minT = Infinity; let maxOver = -Infinity;
  const slackAt = [];
  run(sim, 1.2, () => {
    const r = sim.readLink(l.id);
    minT = Math.min(minT, r.force);
    maxOver = Math.max(maxOver, r.length - l.length);
    if (sim.t < 0.19) slackAt.push([sim.t, r.force, sim.readBody(a.id).vy, sim.readBody(b.id).vy]);
  });
  assert.ok(minT >= 0, 'tension is never negative');
  assert.ok(maxOver <= planck.Settings.linearSlop, `rope stretched by ${maxOver} m`);
  // While slack, both fall freely.
  for (const [t, T, va, vb] of slackAt) {
    if (t > 0.18) continue;
    assert.equal(T, 0, `tension at t = ${t}`);
    close(va, -g * t, 1e-6, `a falls freely at t = ${t}`);
    close(vb, 2 - g * t, 1e-6, `b decelerates freely at t = ${t}`);
  }
  // Taut again at t = 2/(2g): the jerk shares the momentum, and equal masses then move together at 1 m/s.
  close(sim.readBody(a.id).vy, -1, 1e-6, 'a after the jerk'); close(sim.readBody(b.id).vy, 1, 1e-6, 'b after the jerk');
  close(sim.readLink(l.id).force, g, 1e-6, 'tension after the jerk');
});

test('a longer rope starts slack; lengthening it mid-run lets the masses drop until it is taut again', () => {
  const { scene, a, b, l } = atwood(2, 2);
  const sim = P.createSim(scene);
  run(sim, 0.2);
  l.length += 0.1;
  sim.updateLink(l);
  run(sim, 0.25);
  assert.equal(sim.readLink(l.id).force, 0, 'slack');
  close(sim.readBody(a.id).vy, -g * (sim.t - 0.2), 1e-6, 'free fall while slack');
  run(sim, 0.5);
  close(sim.readLink(l.id).slack, 0, planck.Settings.linearSlop, 'taut again');
  assert.ok(sim.readLink(l.id).force > 0, 'pulling again');
  close(sim.readBody(a.id).vy, sim.readBody(b.id).vy, 1e-6, 'both moving together');
});

test('an off-center attachment turns the object: torque = r × T about its center of mass', () => {
  // The light box hangs from its top-right corner, so its weight and the tension form a couple.
  const { scene, a, l } = atwood(1, 2, { la: { x: 0.1, y: 0.1 }, a: { x: -0.4 } });
  const sim = P.createSim(scene);
  sim.step();
  const T = sim.readLink(l.id).force;
  assert.ok(T > 0);
  const pull = sim.forcesOn(a.id).find((f) => f.label === 'T');
  const c = sim.readBody(a.id);
  const torque = (pull.x - c.x) * pull.fy - (pull.y - c.y) * pull.fx;
  const I = (a.mass * (a.w * a.w + a.h * a.h)) / 12;
  assert.ok(torque > 0, 'counterclockwise: the center swings under the corner');
  close(sim.readBody(a.id).omega, (torque / I) * sim.t, 0.05 * Math.abs((torque / I) * sim.t), 'angular velocity after one step');
  // The rope pulls along its own line, from the corner toward the wheel.
  const geo = S.pulleyPath(scene, l, (b) => sim.pose(b.id) || b);
  close(Math.atan2(pull.fy, pull.fx), Math.atan2(-geo.ua.y, -geo.ua.x), 1e-9, 'direction');
});

test('pulleys survive saving and opening; bad values are clamped and pulleys to missing objects skipped', () => {
  const { scene, l } = atwood(1, 2);
  const back = S.parse(S.serialize(scene)).scene.links[0];
  for (const key of ['kind', 'a', 'b', 'px', 'py', 'r', 'length']) assert.equal(back[key], l[key], key);
  assert.deepEqual(back.la, l.la);
  const data = JSON.parse(S.serialize(scene));
  data.links[0].r = 9; delete data.links[0].length;
  data.links.push({ ...data.links[0], id: 'l99', b: 'missing' });
  const parsed = S.parse(data);
  assert.equal(parsed.scene.links.length, 1);
  assert.equal(parsed.skipped, 1);
  assert.equal(parsed.scene.links[0].r, S.LIMITS.wheel[1]);
  assert.equal(parsed.scene.links[0].length, 1);
  // Older scenes without pulleys load unchanged.
  const old = E.list.find((e) => e.id === 'pendulum').build();
  assert.ok(old.links.every((x) => x.kind !== 'pulley'));
});

test('copying a pulley with its objects moves the wheel with them; moving an end refits the rope', () => {
  const { scene, a, b, l } = atwood(1, 2);
  const fragment = S.copyFragment(scene, { type: 'body', id: a.id }, [b.id]);
  const added = S.pasteFragment(scene, fragment, 1);
  const copy = S.linkById(scene, added.links[0]);
  assert.equal(copy.kind, 'pulley');
  assert.equal(copy.px, l.px + 1); assert.equal(copy.py, l.py + 1);
  close(S.linkLength(scene, copy), l.length, 1e-9, 'same rope');
  S.transformBodies(scene, new Set([a.id]), (p, angle) => ({ x: p.x, y: p.y - 0.5, angle }));
  close(l.length, S.linkLength(scene, l), 1e-12, 'refitted');
  assert.equal(S.pulleyProblem(scene, l), '');
  assert.match(S.pulleyProblem(scene, { ...l, r: 2.5 }), /outside the pulley wheel/);
});

test('an end swung over the top of the wheel lets the rope come off it, with no jump in length', () => {
  // Geometry: move one end round from below the right of the wheel, over the top, to the far left.
  const c = { x: 0, y: 0 }; const r = 0.35; const pa = { x: -0.35, y: -2 };
  let turn; let prev = null; let biggest = 0; let off = false;
  for (let i = 0; i <= 400; i++) {
    const angle = -Math.PI / 2 + (i * 1.2 * Math.PI) / 400;
    const geo = S.pulleyGeometry(c, r, pa, { x: 2 * Math.cos(angle), y: 2 * Math.sin(angle) }, 1, turn);
    turn = geo.turn; off = off || geo.offWheel;
    if (prev !== null) biggest = Math.max(biggest, Math.abs(geo.total - prev));
    prev = geo.total;
  }
  assert.ok(off, 'the rope came off the wheel');
  assert.ok(biggest < 0.02, `largest change between 2 cm moves: ${biggest} m`);
  // Simulation: a light ball thrown up and over the wheel. Nothing jumps, and the rope never pushes.
  const scene = S.createScene(); scene.world.floor = false;
  const a = Object.assign(S.makeBody(scene, 'box', -0.35, 1), { w: 0.2, h: 0.2, mass: 1 });
  const b = Object.assign(S.makeBody(scene, 'ball', 0.6, 1.5), { r: 0.1, mass: 0.2, vx: -1.4, vy: 7.5 });
  scene.bodies.push(a, b);
  const l = Object.assign(S.makeLink(scene, 'pulley', a.id, { x: 0, y: 0.1 }, b.id, { x: 0, y: 0 }), { px: 0, py: 3, r: 0.35 });
  l.length = S.linkLength(scene, l) + 0.5;
  scene.links.push(l);
  const sim = P.createSim(scene);
  let last = sim.readLink(l.id).length; let jump = 0; let maxSpeed = 0; let wentOff = false;
  run(sim, 1.5, () => {
    const now = sim.readLink(l.id).length;
    jump = Math.max(jump, Math.abs(now - last)); last = now;
    maxSpeed = Math.max(maxSpeed, sim.readBody(a.id).speed, sim.readBody(b.id).speed);
    wentOff = wentOff || sim.pulleyPath(l.id).offWheel;
    assert.ok(sim.readLink(l.id).force >= 0);
  });
  assert.ok(wentOff, 'the ball crossed over the top');
  assert.ok(jump < 0.1, `path length jumped by ${jump} m in one step`);
  assert.ok(maxSpeed < 20, `speed reached ${maxSpeed} m/s`);
});
