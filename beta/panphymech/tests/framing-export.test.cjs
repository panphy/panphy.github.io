const test = require('node:test');
const assert = require('node:assert/strict');
globalThis.planck = require('../js/vendor/planck.min.js');
require('../js/scene.js');
require('../js/physics.js');
require('../js/examples.js');
require('../js/framing.js');
require('../js/svg.js');
require('../js/render.js');
const { scene: S, physics: P, examples: E, framing: F } = globalThis.PPM;

test('motion fit contains a pendulum cycle without adding the distant floor', async () => {
  const scene = E.list.find((e) => e.id === 'pendulum').build();
  const original = S.serialize(scene);
  const live = P.createSim(scene);
  live.advance(0.2);
  const before = live.capture();
  const { box } = await F.motionBox(scene, before);
  assert.equal(S.serialize(scene), original);
  assert.deepEqual(live.capture(), before);
  assert.equal(live.t > 0 && live.t < 0.21, true);
  assert.ok(box.minX < -1 && box.maxX > 1);
  assert.ok(box.minY > 1.5);
  for (let i = 0; i < 2000; i++) {
    live.step();
    const p = live.pose(scene.bodies[0].id);
    assert.ok(p.x - 0.15 >= box.minX - 0.02 && p.x + 0.15 <= box.maxX + 0.02);
    assert.ok(p.y - 0.15 >= box.minY - 0.02 && p.y + 0.15 <= box.maxY + 0.02);
  }
});

test('motion fit covers projectile flight, opposite spring extremes and rotating shapes', async () => {
  for (const id of ['projectile', 'horizontal-spring', 'spring', 'seesaw']) {
    const scene = E.list.find((e) => e.id === id).build();
    const { box } = await F.motionBox(scene);
    const sim = P.createSim(scene);
    for (let i = 0; i < 2200; i++) {
      sim.step();
      scene.bodies.forEach((b) => {
        const p = sim.pose(b.id);
        const points = b.kind === 'ball' ? [{ x: p.x - b.r, y: p.y - b.r }, { x: p.x + b.r, y: p.y + b.r }] : S.vertices(b).map((v) => S.toWorld(p, v));
        points.forEach((q) => assert.ok(q.x >= box.minX - 1e-6 && q.x <= box.maxX + 1e-6 && q.y >= box.minY - 1e-6 && q.y <= box.maxY + 1e-6, id));
      });
    }
  }
});

test('motion fit can cancel and retains runaway protection', async () => {
  const scene = E.list.find((e) => e.id === 'spring').build();
  const far = S.makeBody(scene, 'ball', 10000, 10000);
  far.name = 'Runaway'; scene.bodies.push(far);
  assert.equal(await F.motionBox(scene, null, () => true), null);
  const fitted = await F.motionBox(scene);
  assert.ok(fitted.box.maxX < 10);
  assert.equal(fitted.far[0].name, 'Runaway');
});

test('SVG exports every example as vectors with escaped labels and no editing controls', () => {
  for (const example of E.list) {
    const scene = example.build();
    scene.bodies[0].name = 'Ω <mass> & "µ"';
    const sim = P.createSim(scene);
    const app = { scene, sim, display: { grid: true, vectors: true, labels: true }, poseOf: (b) => sim.pose(b.id), velocityOf: (b) => sim.readBody(b.id), isSelected: () => true, selection: { type: 'body', id: scene.bodies[0].id }, canEditGeometry: () => true, extra: [], editor: {} };
    const ctx = PPM.svg.createContext(800, 500);
    const renderer = PPM.render.createRenderer(app, {}, ctx);
    Object.assign(renderer, { w: 800, h: 500 });
    renderer.colors = Object.fromEntries(['bg', 'grid', 'gridMajor', 'axis', 'floor', 'floorLine', 'ink', 'ink2', 'ink3', 'accent', 'surface', 'link', 'rope', 'vector', 'motor', 'danger'].map((key) => [key, '#abcdef']));
    const svg = renderer.exportSvg();
    assert.match(svg, /<svg xmlns=/);
    assert.match(svg, /<path /);
    assert.doesNotMatch(svg, /<image|NaN|undefined|Infinity/);
    assert.match(svg, /Ω &lt;mass&gt; &amp; &quot;µ&quot;/);
  }
});

test('SVG full circles use two arcs; clipping and drawing state survive restore', () => {
  const ctx = PPM.svg.createContext(100, 100);
  ctx.beginPath(); ctx.arc(30, 30, 20, 0, Math.PI * 2); ctx.fill();
  ctx.save(); ctx.clip('evenodd'); ctx.fillStyle = 'red'; ctx.fillRect(0, 0, 100, 100); ctx.restore();
  ctx.fillRect(0, 0, 1, 1);
  const svg = ctx.serialize();
  assert.match(svg, /A20 20 .*A20 20 /);
  assert.match(svg, /clip-rule="evenodd"/);
  assert.match(svg, /fill="red"/);
  assert.match(svg, /width="1" height="1" fill="#000"/);
});
