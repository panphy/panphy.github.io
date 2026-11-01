// Joined connectors against textbook results: node --test sandboxes/panphymech/tests/*.test.cjs
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

globalThis.planck = require(path.join(__dirname, '../js/vendor/planck.min.js'));
require(path.join(__dirname, '../js/scene.js'));
require(path.join(__dirname, '../js/physics.js'));
const { scene: S, physics: P } = globalThis.PPM;
const g = 9.81;

function run(sim, seconds, onStep) {
  while (sim.t < seconds - 1e-12) {
    sim.step();
    if (onStep) onStep(sim);
  }
}
const close = (actual, expected, tol, what) => assert.ok(Math.abs(actual - expected) <= tol, `${what}: ${actual} vs ${expected}`);

function join(scene, l, end, t, tend) {
  assert.equal(S.joinProblem(scene, l, end, t, tend), '');
  S.joinLinks(scene, l, end, t, tend);
}

// A 1 kg ball on a spring from the background at (0, 5), hanging below a second connector.
// kind: what joins the spring above it (a rope, rod or spring of natural length 1 m).
function hanging(kind, opts = {}) {
  const scene = S.createScene();
  scene.world.floor = false;
  const ball = Object.assign(S.makeBody(scene, 'ball', 0, 3), { r: 0.1, mass: 1 }, opts.ball);
  scene.bodies.push(ball);
  const spring = Object.assign(S.makeLink(scene, 'spring', ball.id, { x: 0, y: 0 }, null, { x: 0, y: 4 }), { k: 50, rest: 1, damping: 0 }, opts.spring);
  const top = S.makeLink(scene, kind, null, { x: 0, y: 5 }, null, { x: 0, y: 4 });
  if (kind === 'spring') Object.assign(top, { k: 50, rest: 1, damping: 0 }, opts.top);
  else Object.assign(top, { length: 1 }, opts.top);
  scene.links.push(spring, top);
  join(scene, top, 'b', spring, 'b');
  return { scene, ball, spring, top };
}

// Time between successive upward zero crossings of the ball's vertical velocity, averaged.
function period(sim, id, seconds) {
  const ups = [];
  let prev = sim.readBody(id).vy;
  run(sim, seconds, (s) => {
    const v = s.readBody(id).vy;
    if (prev < 0 && v >= 0) ups.push(s.t - (v / (v - prev)) * s.lastH);
    prev = v;
  });
  return (ups[ups.length - 1] - ups[0]) / (ups.length - 1);
}

test('springs in series: k = k₁k₂/(k₁ + k₂), so T = 2π√(m(k₁ + k₂)/(k₁k₂)), and energy is kept', () => {
  const { scene, ball, spring, top } = hanging('spring', { spring: { k: 30 }, top: { k: 20 } });
  const k = (20 * 30) / 50;
  ball.y = 3 - g / k - 0.2; // 0.2 m below the equilibrium
  const sim = P.createSim(scene);
  const E0 = sim.totals().E;
  close(period(sim, ball.id, 8), 2 * Math.PI * Math.sqrt(1 / k), 0.01, 'period');
  close(sim.totals().E, E0, 0.01 * Math.abs(E0) + 0.01, 'energy');
  // Each spring stretches in inverse proportion to its k; one tension through both.
  const a = sim.readLink(spring.id), b = sim.readLink(top.id);
  close(a.tension, b.tension, 1e-9, 'one tension');
  close(a.extension * 30, b.extension * 20, 1e-9, 'k₁x₁ = k₂x₂');
});

test('bungee (spring + rope): free fall while slack, then rest at mg/k beyond the natural length', () => {
  const { scene, ball, spring, top } = hanging('rope', { spring: { damping: 4 } });
  ball.y = 3.5; // 0.5 m above where the pair goes taut
  const sim = P.createSim(scene);
  run(sim, 0.1);
  close(sim.readBody(ball.id).vy, -g * 0.1, 0.01, 'free fall');
  close(sim.readLink(spring.id).tension, 0, 1e-12, 'slack: no pull');
  run(sim, 15);
  close(sim.readBody(ball.id).y, 3 - g / 50, 0.002, 'rest position');
  close(sim.readLink(top.id).force, g, 0.02, 'rope tension = mg');
  close(sim.readLink(spring.id).extension, g / 50, 0.002, 'spring extension');
});

test('spring + rod: the rod keeps its length and the pair oscillates like the spring alone', () => {
  const { scene, ball, top } = hanging('rod');
  ball.y = 3 - g / 50 - 0.1;
  const sim = P.createSim(scene);
  close(period(sim, ball.id, 6), 2 * Math.PI * Math.sqrt(1 / 50), 0.01, 'period');
  const r = sim.readLink(top.id);
  close(r.length, 1, 1e-9, 'rod length');
});

test('spring balance on a pulley rope reads the hanging weight: extension mg/k', () => {
  const scene = S.createScene();
  scene.world.floor = false;
  const box = Object.assign(S.makeBody(scene, 'box', -0.2, 1.5), { w: 0.2, h: 0.2, mass: 2 });
  scene.bodies.push(box);
  const pulley = Object.assign(S.makeLink(scene, 'pulley', box.id, { x: 0, y: 0.1 }, null, { x: 0.2, y: 1.5 }), { px: 0, py: 3, r: 0.2 });
  const spring = Object.assign(S.makeLink(scene, 'spring', null, { x: 0.2, y: 0.5 }, null, { x: 0.2, y: 1.5 }), { k: 200, rest: 1, damping: 20 });
  scene.links.push(pulley, spring);
  join(scene, spring, 'b', pulley, 'b');
  S.fitJoin(scene, pulley);
  assert.equal(S.pulleyProblem(scene, pulley), '');
  const sim = P.createSim(scene);
  run(sim, 10);
  close(sim.readLink(spring.id).extension, 2 * g / 200, 0.002, 'extension');
  close(sim.readLink(pulley.id).force, 2 * g, 0.05, 'tension = mg');
  close(sim.readBody(box.id).vy, 0, 0.01, 'at rest');
  // Shortening the rope mid-run stretches the spring further; the weight still sets it.
  pulley.length -= 0.2;
  sim.syncParams();
  run(sim, 20);
  close(sim.readLink(spring.id).extension, 2 * g / 200, 0.002, 'extension after shortening');
  close(sim.readBody(box.id).y, 1.5 - 2 * g / 200 + 0.2, 0.005, 'the box rises by the shortening');
});

test('joining: only a spring joins another connector, at a background end, one pair at a time', () => {
  const scene = S.createScene();
  const ball = S.makeBody(scene, 'ball', 0, 1);
  scene.bodies.push(ball);
  const rope = S.makeLink(scene, 'rope', ball.id, { x: 0, y: 0 }, null, { x: 1, y: 1 });
  const rope2 = S.makeLink(scene, 'rope', null, { x: 2, y: 1 }, null, { x: 1, y: 1 });
  const spring = S.makeLink(scene, 'spring', null, { x: 2, y: 2 }, null, { x: 1, y: 1 });
  const hinge = S.makeLink(scene, 'hinge', ball.id, { x: 0, y: 0 }, null, { x: 0, y: 1 });
  scene.links.push(rope, rope2, spring, hinge);
  assert.match(S.joinProblem(scene, rope2, 'b', rope, 'b'), /Only a spring/);
  assert.match(S.joinProblem(scene, spring, 'b', hinge, 'b'), /Only a spring/);
  assert.match(S.joinProblem(scene, spring, 'b', rope, 'a'), /fixed to the background/);
  rope.solid = true;
  assert.match(S.joinProblem(scene, spring, 'b', rope, 'b'), /Solid/);
  rope.solid = false;
  // Both outer ends on the background.
  assert.match(S.joinProblem(scene, spring, 'b', rope2, 'b'), /at least one end/);
  join(scene, spring, 'b', rope, 'b');
  assert.match(S.joinProblem(scene, rope2, 'a', spring, 'a'), /already joined/);
  // The rope's join sits where the pair's geometry puts it.
  const pair = S.joinPair(scene, rope);
  assert.equal(pair.spring, spring);
  assert.deepEqual(S.endPoint(scene, rope.b, rope.lb), S.pairGeometry(scene, pair).node);
});

test('joined pairs survive saving and opening; broken or invalid joins become background ends', () => {
  const { scene, spring, top } = hanging('rope');
  const back = S.parse(S.serialize(scene));
  assert.equal(back.skipped, 0);
  const s2 = S.linkById(back.scene, spring.id), t2 = S.linkById(back.scene, top.id);
  assert.equal(s2.b, top.id);
  assert.equal(t2.b, spring.id);
  assert.ok(S.joinPair(back.scene, s2));
  // A join that does not point back is broken: the spring keeps a background end.
  const data = JSON.parse(S.serialize(scene));
  data.links.find((l) => l.id === top.id).b = null;
  const broken = S.parse(data);
  assert.equal(S.linkById(broken.scene, spring.id).b, null);
  // A rope joined to a rope is not allowed; the rope with no object end left is skipped.
  const bad = JSON.parse(S.serialize(scene));
  bad.links.find((l) => l.id === spring.id).kind = 'rope';
  const out = S.parse(bad);
  assert.equal(out.scene.links.length, 1);
  assert.equal(out.skipped, 1);
});

test('deleting one part leaves the other a background end at the join; copies keep pairs together', () => {
  const made = hanging('rope');
  const { scene, ball, spring, top } = made;
  const node = S.endPoint(scene, spring.b, spring.lb);
  // Deleting the rope: the spring now ends on the background where the join was.
  const one = JSON.parse(JSON.stringify(scene));
  S.removeLink(one, top.id);
  const s1 = S.linkById(one, spring.id);
  assert.equal(s1.b, null);
  close(s1.lb.x, node.x, 1e-12, 'x'); close(s1.lb.y, node.y, 1e-12, 'y');
  // Deleting the spring strands the rope (both ends on the background), so it goes too.
  const two = JSON.parse(JSON.stringify(scene));
  S.removeLink(two, spring.id);
  assert.equal(two.links.length, 0);
  // Deleting the ball removes the spring on it, and with it the stranded rope.
  const three = JSON.parse(JSON.stringify(scene));
  S.removeBody(three, ball.id);
  assert.equal(three.links.length, 0);
  // Copying the ball copies both parts, joined to each other.
  const frag = S.copyFragment(scene, { type: 'body', id: ball.id });
  assert.equal(frag.links.length, 2);
  const added = S.pasteFragment(scene, frag);
  const [p1, p2] = added.links.map((id) => S.linkById(scene, id));
  const pasted = S.joinPair(scene, p1);
  assert.ok(pasted);
  assert.deepEqual(new Set([pasted.spring, pasted.other]), new Set([p1, p2]));
  // Copying the spring alone gives a spring with a background end at the join.
  const lone = S.pasteFragment(scene, S.copyFragment(scene, { type: 'link', id: spring.id }), 0);
  const l3 = S.linkById(scene, lone.links[0]);
  assert.equal(l3.b, null);
  close(l3.lb.y, node.y, 1e-12, 'copied end');
});

test('moving an outer object refits the rope so the spring rests at its natural length', () => {
  const { scene, ball, spring, top } = hanging('rope');
  ball.y = 2.5;
  S.refitLengths(scene, new Set([ball.id]));
  close(top.length, 1.5, 1e-9, 'rope length');
  close(spring.rest, 1, 1e-12, 'spring rest unchanged');
  // A new spring joined to a rope takes up the gap through its natural length.
  const scene2 = S.createScene();
  const b = S.makeBody(scene2, 'ball', 0, 2);
  scene2.bodies.push(b);
  const rope = Object.assign(S.makeLink(scene2, 'rope', null, { x: 0, y: 5 }, null, { x: 0.3, y: 4 }), { length: Math.hypot(0.3, 1) });
  const sp = S.makeLink(scene2, 'spring', b.id, { x: 0, y: 0 }, null, { x: 0.3, y: 4 });
  scene2.links.push(rope, sp);
  join(scene2, sp, 'b', rope, 'b');
  S.fitJoin(scene2, sp);
  close(sp.rest, Math.round((3 - rope.length) * 100) / 100, 1e-9, 'spring rest');
});
