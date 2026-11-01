const test = require('node:test');
const assert = require('node:assert/strict');
globalThis.planck = require('../js/vendor/planck.min.js');
require('../js/scene.js');
require('../js/physics.js');
const { scene: S, physics: P } = PPM;

test('maximum spring damping at minimum mass dissipates energy without reversing into a runaway', () => {
  for (const k of [50, 100000]) for (const kind of ['direct', 'rod', 'rope']) {
    const scene = S.createScene(); scene.world.floor = false; scene.world.gravity = 0;
    const ball = Object.assign(S.makeBody(scene, 'ball', kind === 'direct' ? 0 : -0.01, 0), { mass: 0.001, vx: -1 }); scene.bodies.push(ball);
    const spring = Object.assign(S.makeLink(scene, 'spring', ball.id, { x: 0, y: 0 }, null, { x: 1, y: 0 }), { k, rest: 1, damping: 1000 });
    scene.links.push(spring);
    if (kind !== 'direct') {
      const top = S.makeLink(scene, kind, null, { x: 2, y: 0 }, null, { x: 1, y: 0 }); top.length = 1;
      scene.links.push(top); S.joinLinks(scene, top, 'b', spring, 'b');
    }
    const sim = P.createSim(scene), initial = sim.totals().E;
    for (let i = 0; i < 500; i++) {
      sim.step();
      assert.ok(Number.isFinite(sim.totals().E));
      assert.ok(sim.totals().E <= initial + 1e-10, `${kind}, k=${k}: energy ${sim.totals().E}`);
      assert.ok(Math.abs(sim.readBody(ball.id).vx) <= 1);
    }
    // A rope may release the contracting mass to coast once the pair goes slack.
    if (kind !== 'rope') assert.ok(Math.abs(sim.readBody(ball.id).vx) < 0.001);
  }
});

test('multiple off-center damped springs keep translation and rotation bounded', () => {
  const scene = S.createScene(); scene.world.floor = false; scene.world.gravity = 0;
  const box = Object.assign(S.makeBody(scene, 'box', 0, 0), { mass: 0.001, vx: 1, omega: 1 }); scene.bodies.push(box);
  for (const y of [-0.25, 0.25]) {
    scene.links.push(Object.assign(S.makeLink(scene, 'spring', box.id, { x: 0, y }, null, { x: 1, y }), { k: 100000, rest: 1, damping: 1000 }));
  }
  const sim = P.createSim(scene), initial = sim.totals().E;
  for (let i = 0; i < 1000; i++) {
    sim.step();
    assert.ok(Number.isFinite(sim.totals().E));
    assert.ok(sim.totals().E <= initial + 1e-8, `energy ${sim.totals().E}`);
  }
});
