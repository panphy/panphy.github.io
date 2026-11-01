const test = require('node:test');
const assert = require('node:assert/strict');
require('../js/scene.js');
globalThis.earcut = require('../js/vendor/earcut.min.js');
require('../js/shapes.js');
const S = globalThis.PPM.scene;
const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-8, `${a} != ${b}`);
function setup() {
  const scene = S.createScene(); scene.world.floor = false;
  function body(kind, x, y, props = {}) {
    const b = Object.assign(S.makeBody(scene, kind, x, y), props); scene.bodies.push(b); return b;
  }
  return { scene, body, snap: (b, tolerance = 0.1) => S.contactSnap(scene, new Set([b.id]), tolerance) };
}
test('surface snap closes gaps and shallow overlaps exactly, without attracting distant bodies', () => {
  for (const gap of [0.04, -0.04]) {
    const h = setup(); h.body('box', 0, 0, { w: 2, h: 1 });
    const b = h.body('box', 0.23, 1 + gap, { w: 1, h: 1 });
    const d = h.snap(b); near(d.x, 0); near(b.y + d.y, 1);
    b.y = 2; assert.equal(h.snap(b), null);
  }
});
test('ball snaps accurately to a sloped plank and another ball', () => {
  const h = setup(); const angle = Math.PI / 6;
  h.body('plank', 0, 0, { w: 4, h: 0.2, angle });
  const b = h.body('ball', -Math.sin(angle) * 0.64, Math.cos(angle) * 0.64, { r: 0.5 });
  const d = h.snap(b); near(d.x, Math.sin(angle) * 0.04); near(d.y, -Math.cos(angle) * 0.04);
  const k = setup(); k.body('ball', 0, 0, { r: 0.5 }); const c = k.body('ball', 1.04, 0, { r: 0.5 });
  near(k.snap(c).x, -0.04);
});
test('floor contact does not hide side contact and groups retain their spacing', () => {
  const h = setup(); h.scene.world.floor = true;
  h.body('box', 0, 0.5, { w: 1, h: 1 });
  const b = h.body('box', 1.04, 0.5, { w: 1, h: 1 });
  const c = h.body('box', 2.04, 0.5, { w: 1, h: 1 });
  const ids = new Set([b.id, c.id]); const d = S.contactSnap(h.scene, ids, 0.1);
  near(d.x, -0.04); near(d.y, 0);
  S.transformBodies(h.scene, ids, (p, angle) => ({ x: p.x + d.x, y: p.y + d.y, angle })); near(c.x - b.x, 1);
});
test('cut shapes snap inside a hole without snapping through its walls', () => {
  const h = setup();
  h.body('custom', 0, 0, { paths: [[[[-2,-2],[2,-2],[2,2],[-2,2]], [[-1,-1],[-1,1],[1,1],[1,-1]]]] });
  const b = h.body('box', 0.46, 0, { w: 1, h: 1 });
  const d = h.snap(b); near(d.x, 0.04); near(d.y, 0);
});
test('nearest connector surface follows rotated edges and circles exactly', () => {
  const h = setup(); const b = h.body('box', 0, 0, { w: 2, h: 1, angle: Math.PI / 2 });
  const p = S.closestSurface(b, { x: 0.54, y: 0.3 }); near(p.x, 0.5); near(p.y, 0.3);
  const c = h.body('ball', 0, 0, { r: 1 }); near(S.closestSurface(c, { x: 2, y: 0 }).x, 1);
});
test('copy snapshots a group and paste remaps internal connectors with independent properties', () => {
  const h = setup(); const a = h.body('box', 0, 0); const b = h.body('ball', 2, 0);
  const l = S.makeLink(h.scene, 'spring', a.id, { x: 0, y: 0 }, b.id, { x: 0, y: 0 }); h.scene.links.push(l);
  const f = S.copyFragment(h.scene, { type: 'body', id: a.id }, [b.id]);
  a.mass = 999;
  const added = S.pasteFragment(h.scene, f, 0.3);
  assert.equal(added.bodies.length, 2); assert.equal(added.links.length, 1);
  const copy = S.bodyById(h.scene, added.bodies[0]); near(copy.x, 0.3); assert.notEqual(copy.mass, 999);
  const link = S.linkById(h.scene, added.links[0]); assert.equal(link.a, added.bodies[0]); assert.equal(link.b, added.bodies[1]);
  assert.notEqual(link.la, l.la); assert.notEqual(copy.id, a.id);
  const parsed = S.parse(S.serialize(h.scene)).scene; assert.equal(parsed.links.length, 2);
});
test('connector-only copy keeps attachments and deleted attachments never create invalid links', () => {
  const h = setup(); const a = h.body('box', 0, 0);
  const l = S.makeLink(h.scene, 'spring', a.id, { x: 0, y: 0 }, null, { x: 2, y: 0 }); h.scene.links.push(l);
  const f = S.copyFragment(h.scene, { type: 'link', id: l.id });
  const ids = S.pasteFragment(h.scene, f); const copy = S.linkById(h.scene, ids.links[0]);
  assert.equal(copy.a, a.id); near(copy.lb.x, 2);
  h.scene.bodies = []; h.scene.links = [];
  assert.equal(S.pasteFragment(h.scene, f).links.length, 0);
});


test('diagonal corner snapping closes both coordinates rather than leaving a hidden gap', () => {
  const h = setup(); h.body('box', 0, 0, { w: 1, h: 1 });
  const b = h.body('box', 1.04, 1.03, { w: 1, h: 1 });
  const d = h.snap(b); near(b.x + d.x, 1); near(b.y + d.y, 1);
});

test('mechanics Ctrl/Command C and V route to scene copy/paste and leave text fields alone', () => {
  const fs = require('node:fs'), vm = require('node:vm');
  const source = fs.readFileSync(require.resolve('../js/app.js'), 'utf8');
  const start = source.indexOf("  document.addEventListener('keydown',");
  const end = source.indexOf('\n  });', start) + '\n  });'.length;
  for (const modifier of ['ctrlKey', 'metaKey']) {
    let listener, copies = 0, pastes = 0, prevented = 0;
    vm.runInNewContext(source.slice(start, end), {
      document: { addEventListener: (_, fn) => { listener = fn; }, querySelector: () => null },
      app: { copySelection: () => copies++, pasteSelection: () => pastes++ }
    });
    const event = { [modifier]: true, target: { tagName: 'CANVAS' }, preventDefault() { prevented++; } };
    listener({ ...event, key: 'c' }); listener({ ...event, key: 'V' });
    assert.equal(copies, 1); assert.equal(pastes, 1); assert.equal(prevented, 2);
    for (const tagName of ['INPUT', 'TEXTAREA', 'SELECT']) {
      listener({ ...event, key: 'c', target: { tagName } }); listener({ ...event, key: 'v', target: { tagName } });
    }
    listener({ ...event, key: 'd' }); // Retired shortcut falls through without editing.
    assert.equal(copies, 1); assert.equal(pastes, 1); assert.equal(prevented, 2);
  }
});
test('mirroring reflects shapes, joints, velocities and motors about the object center', () => {
  const h = setup();
  const ramp = h.body('wedge', 1, 1, { angle: 0.3, vx: 2, vy: 1, omega: 0.5 });
  const before = S.vertices(ramp).map((p) => S.toWorld(ramp, p));
  const arm = h.body('box', 3, 1);
  const motor = S.makeLink(h.scene, 'motor', arm.id, { x: 0.1, y: 0.2 }, null, { x: 3.1, y: 1.2 }); h.scene.links.push(motor);
  const glue = S.makeLink(h.scene, 'weld', ramp.id, { x: 0.5, y: 0 }, arm.id, { x: -1.5, y: 0 }); h.scene.links.push(glue);
  const anchor = h.body('ball', -4, 1, { fixed: true });
  const rod = S.makeLink(h.scene, 'rod', ramp.id, { x: 0.4, y: 0.1 }, anchor.id, { x: 0, y: 0 }); h.scene.links.push(rod);
  const ids = S.rigidGroup(h.scene, ramp.id);
  assert.deepEqual([...ids].sort(), [arm.id, ramp.id].sort());
  S.mirrorBodies(h.scene, ids, ramp.x);
  // Every corner lands at its mirror image across x = 1.
  const after = S.vertices(ramp).map((p) => S.toWorld(ramp, p));
  before.forEach((p) => assert.ok(after.some((q) => Math.abs(q.x - (2 - p.x)) < 1e-9 && Math.abs(q.y - p.y) < 1e-9), JSON.stringify(p)));
  near(ramp.x, 1); near(ramp.angle, -0.3); assert.equal(ramp.flip, true);
  near(ramp.vx, -2); near(ramp.vy, 1); near(ramp.omega, -0.5);
  near(arm.x, -1); near(motor.la.x, -0.1); near(motor.lb.x, -1.1); near(motor.lb.y, 1.2);
  assert.equal(motor.dir, 1); near(motor.speed, 3);
  near(glue.la.x, -0.5); near(glue.lb.x, 1.5);
  // The rod keeps its outside end and refits to the new distance.
  near(rod.lb.x, 0); near(rod.la.x, -0.4); near(rod.length, S.linkLength(h.scene, rod));
  assert.equal(anchor.x, -4);
});
test('mirroring a cut shape reflects its outline and keeps ring winding', () => {
  const h = setup();
  const ring = [[0, 0], [2, 0], [0, 1]];
  const b = h.body('custom', 0, 0, { paths: [[ring]] });
  const area = (r) => r.reduce((s, [x, y], i) => { const [u, v] = r[(i + 1) % r.length]; return s + x * v - u * y; }, 0) / 2;
  S.mirrorBodies(h.scene, new Set([b.id]), 0);
  assert.deepEqual(b.paths[0][0].map(([x, y]) => [x + 0, y]).sort(), [[-2, 0], [0, 0], [0, 1]].sort());
  assert.equal(Math.sign(area(b.paths[0][0])), Math.sign(area(ring)));
});
test('an object center near another object edge snaps onto that edge, including hole edges', () => {
  const h = setup();
  h.body('box', 0, 0, { w: 2, h: 1 });
  const ball = h.body('ball', 0.6, 0.47, { r: 0.3 });
  assert.equal(S.contactSnap(h.scene, new Set([ball.id]), 0.1), null, 'deep overlap: no surface contact');
  const d = S.centerSnap(h.scene, new Set([ball.id]), 0.1); near(d.x, 0); near(d.y, 0.03);
  ball.y = 0.2; assert.equal(S.centerSnap(h.scene, new Set([ball.id]), 0.1), null, 'far from every edge');
  const k = setup();
  k.body('custom', 0, 0, { paths: [[[[-2,-2],[2,-2],[2,2],[-2,2]], [[-1,-1],[-1,1],[1,1],[1,-1]]]] });
  const c = k.body('ball', 0.95, 0.3, { r: 0.2 });
  const e = S.centerSnap(k.scene, new Set([c.id]), 0.1); near(e.x, 0.05); near(e.y, 0);
});
