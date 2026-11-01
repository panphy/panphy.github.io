const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
globalThis.planck = require('../js/vendor/planck.min.js');
require('../js/scene.js');
require('../js/physics.js');
require('../js/graph.js');
const S = PPM.scene;

// Run the application state and edit methods without mounting its browser UI.
function createApp() {
  const source = fs.readFileSync(require.resolve('../js/app.js'), 'utf8');
  const element = { textContent: '', style: {} };
  const window = { PPM: { ...PPM } };
  vm.runInNewContext(source.slice(0, source.indexOf('  (function graphResizer()')) + 'PPM.app = app; })(window);', {
    window, document: { getElementById: () => element },
    localStorage: { getItem: () => null, setItem() {} },
    performance: { now: () => 0 }, setTimeout: () => 0, clearTimeout() {}
  });
  const app = window.PPM.app;
  app.ui = new Proxy({}, { get: () => () => {} });
  app.scene.world.floor = false;
  app.scene.world.gravity = 0;
  return app;
}

function start(app) {
  app.sim = PPM.physics.createSim(app.scene);
  app.recorder.reset(app.scene, app.sim);
  app.sim.advance(0.1, sim => app.recorder.sample(sim));
  app.running = true;
}

test('live undo and redo retain joined-pair references, forces, energies and recordings', () => {
  for (const kind of ['spring', 'rod', 'rope']) {
    const app = createApp(), scene = app.scene;
    const ball = S.makeBody(scene, 'ball', 0, 2.5);
    scene.bodies.push(ball);
    const spring = Object.assign(S.makeLink(scene, 'spring', ball.id, { x: 0, y: 0 }, null, { x: 0, y: 4 }), { k: 50, rest: 1, damping: 0 });
    const top = S.makeLink(scene, kind, null, { x: 0, y: 5 }, null, { x: 0, y: 4 });
    if (kind === 'spring') Object.assign(top, { k: 50, rest: 1, damping: 0 });
    else top.length = 1;
    scene.links.push(spring, top);
    S.joinLinks(scene, top, 'b', spring, 'b');
    start(app);
    const sim = app.sim, time = sim.t, samples = app.recorder.t.length;
    app.editParam(() => { spring.k = 100; }, null);
    for (const [action, k] of [['undo', 50], ['redo', 100], ['undo', 50]]) {
      app[action]();
      assert.equal(app.sim, sim);
      assert.equal(sim.t, time);
      assert.equal(app.running, true);
      assert.equal(app.recorder.t.length, samples);
      assert.equal(scene.links[0], spring);
      assert.equal(spring.k, k);
      const reading = sim.readLink(spring.id);
      assert.ok(Number.isFinite(reading.extension));
      assert.ok(Number.isFinite(reading.EPE));
      assert.ok(Math.abs(reading.tension - k * reading.extension) < 1e-8);
      assert.ok(Number.isFinite(sim.totals().E));
    }
    // The restored connector remains live for later edits and recorded samples too.
    app.editParam(() => { spring.rest = 0.8; }, null);
    sim.advance(0.02, s => app.recorder.sample(s));
    assert.ok(app.recorder.cols.get(`${spring.id}:EPE`).every(Number.isFinite));
  }
});

test('motor direction undo/redo preserve time, pose, running state and samples', () => {
  const app = createApp(), scene = app.scene;
  const ball = S.makeBody(scene, 'ball', 0, 3); scene.bodies.push(ball);
  const motor = S.makeLink(scene, 'motor', ball.id, { x: 0, y: 0 }, null, { x: 0, y: 3 }); scene.links.push(motor);
  start(app);
  const sim = app.sim, time = sim.t, samples = app.recorder.t.length;
  const pose = sim.pose(ball.id), dir = motor.dir;
  app.editParam(() => { motor.dir *= -1; motor.speed *= -1; }, null);
  for (const [action, expected] of [['undo', dir], ['redo', -dir]]) {
    app[action]();
    assert.equal(app.sim, sim);
    assert.equal(sim.t, time);
    assert.deepEqual(sim.pose(ball.id), pose);
    assert.equal(app.running, true);
    assert.equal(app.recorder.t.length, samples);
    assert.equal(motor.dir, expected);
  }
});

test('PNG export encodes the clean export canvas instead of the editor canvas', () => {
  const app = createApp();
  let encoded = false;
  app.renderer = { exportCanvas: () => ({ toBlob(callback, type) { assert.equal(type, 'image/png'); encoded = true; callback(null); } }) };
  app.exportPng();
  assert.equal(encoded, true);
});
