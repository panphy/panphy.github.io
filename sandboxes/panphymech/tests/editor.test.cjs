// Real editor gestures with deterministic hold timers and pointer events.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
require('../js/scene.js');
const S = globalThis.PPM.scene;

function setup(withLink = false) {
  const timers = new Map(); const listeners = new Map(); const menus = [];
  let timerId = 0;
  const scene = S.createScene();
  scene.world.floor = false;
  scene.camera.scale = 100;
  const body = S.makeBody(scene, 'box', 0, 0);
  scene.bodies.push(body);
  if (withLink) scene.links.push(S.makeLink(scene, 'spring', null, { x: -1, y: 0 }, body.id, { x: 0, y: 0 }));
  const canvas = { dataset: {}, style: {}, focus() {}, setPointerCapture() {}, releasePointerCapture() {}, getBoundingClientRect: () => ({ left: 0, right: 600, top: 0, bottom: 400 }), addEventListener: (type, fn) => listeners.set(type, fn) };
  const app = {
    scene, selection: null, extra: [], running: false, snap: false, emptyDismissed: true,
    renderer: { w: 600, h: 400, toWorld: (x, y) => ({ x: (x - 300) / 100, y: (200 - y) / 100 }), toScreen: (p) => ({ x: 300 + p.x * 100, y: 200 - p.y * 100 }) },
    ui: { syncToolbar() {}, syncTools() {}, closeQuick() {}, showQuick: (...args) => menus.push(args) },
    poseOf: (b) => b, canEditGeometry: () => true, isSelected: () => false, selectedBodies: () => [body.id],
    select(sel) { this.selection = sel; }, edit(fn) { fn(); }, setHint() {}, requestDraw() {}, toast() {},
    beginGesture() {}, gestureChanged() {}, endGesture() {}, cancelGesture() {}, cameraChanged() {}
  };
  const context = { PPM: { scene: S }, setTimeout(fn) { timers.set(++timerId, fn); return timerId; }, clearTimeout(id) { timers.delete(id); } };
  vm.runInNewContext(fs.readFileSync(require.resolve('../js/editor.js'), 'utf8'), context);
  const ed = app.editor = context.PPM.editor.createEditor(app, canvas);
  const emit = (type, options = {}) => listeners.get(type)({ pointerId: 1, pointerType: 'touch', button: 0, clientX: withLink ? 250 : 300, clientY: 200, preventDefault() {}, ...options });
  const hold = () => { for (const [id, fn] of [...timers]) { timers.delete(id); fn(); } };
  return { app, ed, body, emit, hold, menus };
}

test('every connector can be dropped directly without choosing a tool first', () => {
  for (const type of ['spring', 'rod', 'rope', 'hinge', 'motor', 'weld']) {
    const h = setup();
    assert.equal(h.ed.dropConnector(type, 300, 200), true);
    if (['spring', 'rod', 'rope'].includes(type)) {
      assert.equal(h.ed.pending.a, h.body.id);
      h.emit('pointerdown', { clientX: 400, pointerType: 'mouse' });
      h.emit('pointerup', { clientX: 400, pointerType: 'mouse' });
    }
    assert.equal(h.app.scene.links.length, 1, type);
    assert.equal(h.ed.tool, 'select');
    assert.equal(h.app.scene.links[0].kind, type === 'motor' ? 'hinge' : type);
  }
});

test('dropping outside the canvas preserves the active tool and pending endpoint', () => {
  const h = setup(); h.ed.setTool('rope');
  h.ed.dropConnector('rope', 300, 200);
  const pending = h.ed.pending;
  assert.equal(h.ed.dropConnector('spring', -1, 200), false);
  assert.equal(h.ed.tool, 'rope');
  assert.equal(h.ed.pending, pending);
  h.ed.cancel(); assert.equal(h.ed.pending, null);
});

test('library drag previews the exact snapped starting point without placing or selecting', () => {
  for (const kind of ['spring', 'rod', 'rope', 'hinge', 'motor', 'weld']) {
    const h = setup();
    h.ed.previewConnectorDrop(kind, 305, 200);
    const preview = h.ed.preview();
    assert.equal(preview.point.x, 0, 'marker snaps to the body center');
    assert.equal(preview.point.y, 0);
    assert.equal(preview.link, undefined, 'only the starting point is shown');
    assert.equal(h.app.selection, null);
    assert.equal(h.app.scene.links.length, 0);
    h.ed.dropConnector(kind, 305, 200);
    const point = h.ed.pending ? h.ed.pending.world : S.endPoint(h.app.scene, h.app.scene.links[0].a, h.app.scene.links[0].la);
    assert.equal(point.x, preview.point.x);
    assert.equal(point.y, preview.point.y);
  }
});

test('leaving the canvas hides the endpoint marker and cancellation restores the previous preview', () => {
  const h = setup();
  h.ed.arm('ball'); h.ed.cursorWorld = { x: 1, y: 1 };
  h.ed.previewConnectorDrop('spring', 300, 200);
  assert.ok(h.ed.preview().point);
  h.ed.previewConnectorDrop('spring', -1, 200);
  assert.equal(h.ed.preview(), null);
  h.ed.clearConnectorDropPreview();
  assert.ok(h.ed.preview().body);
  assert.equal(h.app.scene.links.length, 0);
});

test('touch and pen holds open object, connector and selected endpoint settings', () => {
  for (const pointerType of ['touch', 'pen']) for (const target of ['body', 'link', 'endpoint']) {
    const h = setup(target !== 'body');
    if (target === 'endpoint') h.app.selection = { type: 'link', id: h.app.scene.links[0].id };
    h.emit('pointerdown', { pointerType, clientX: target === 'link' ? 250 : 300 });
    h.hold(); h.emit('pointerup');
    assert.equal(h.menus.length, 1, `${pointerType} ${target}`);
    assert.equal(h.menus[0][0].type, target === 'body' ? 'body' : 'link');
    assert.equal(h.ed.isDragging(), false);
  }
});

test('short taps, mouse presses, movement, cancellation and pinch do not open hold menus', () => {
  for (const action of ['tap', 'mouse', 'move', 'cancel', 'pinch']) {
    const h = setup();
    h.emit('pointerdown', { pointerType: action === 'mouse' ? 'mouse' : 'touch' });
    if (action === 'tap') h.emit('pointerup');
    if (action === 'move') h.emit('pointermove', { clientX: 320 });
    if (action === 'cancel') h.emit('pointercancel');
    if (action === 'pinch') h.emit('pointerdown', { pointerId: 2, clientX: 330 });
    h.hold();
    assert.equal(h.menus.length, 0, action);
  }
});

test('native contextmenu opens once and ends the pending touch gesture', () => {
  const h = setup(true);
  h.emit('pointerdown'); h.emit('contextmenu'); h.hold();
  h.emit('pointermove', { clientX: 280 }); h.emit('pointerup');
  assert.equal(h.menus.length, 1);
  assert.equal(h.ed.isDragging(), false);
  assert.equal(h.app.scene.links[0].la.x, -1);
});

test('a fresh primary press recovers after a lost release; stale scenes cannot open menus', () => {
  const h = setup();
  h.emit('pointerdown');
  h.emit('pointerdown', { pointerId: 9, isPrimary: true }); h.hold();
  assert.equal(h.menus.length, 1);
  h.emit('pointerup', { pointerId: 9 });
  h.emit('pointerdown'); h.app.scene = S.createScene(); h.hold();
  assert.equal(h.menus.length, 1);
});

test('dragging snaps surfaces before the grid, and Snap off retains free placement', () => {
  for (const snap of [true, false]) {
    const h = setup(); h.app.snap = snap; h.body.w = 1; h.body.h = 1;
    const target = S.makeBody(h.app.scene, 'box', 2, 0); target.w = target.h = 1;
    h.app.scene.bodies.push(target);
    h.emit('pointerdown', { pointerType: 'mouse', clientX: 300 });
    h.emit('pointermove', { pointerType: 'mouse', clientX: 403 });
    h.emit('pointerup', { pointerType: 'mouse', clientX: 403 });
    assert.ok(Math.abs(h.app.scene.bodies[0].x - (snap ? 1 : 1.03)) < 1e-8);
  }
});

test('connector previews and placement snap to edges from outside the hit-test padding', () => {
  const h = setup(); h.app.snap = true; h.body.w = h.body.h = 1;
  h.ed.setTool('spring'); h.ed.cursorWorld = { x: 0.57, y: 0.2 };
  const p = h.ed.preview().point;
  assert.ok(Math.abs(p.x - 0.5) < 1e-8); assert.ok(Math.abs(p.y - 0.2) < 1e-8);
  h.emit('pointerdown', { clientX: 357, clientY: 180, pointerType: 'mouse' });
  h.emit('pointerup', { clientX: 357, clientY: 180, pointerType: 'mouse' });
  assert.equal(h.ed.pending.a, h.body.id);
  assert.ok(Math.abs(h.ed.pending.la.x - 0.5) < 1e-8);
});

test('placement preview and dropped bodies share precise contact and floor positions', () => {
  const h = setup(); h.app.snap = true; h.body.w = h.body.h = 1;
  h.ed.arm('box'); h.ed.cursorWorld = { x: 0.02, y: 0.79 };
  const preview = h.ed.preview().body;
  h.ed.placeBody('box', h.ed.cursorWorld);
  const placed = h.app.scene.bodies.at(-1);
  assert.ok(Math.abs(placed.x - preview.x) < 1e-8);
  assert.ok(Math.abs(placed.y - preview.y) < 1e-8);
  assert.ok(Math.abs(placed.y - placed.h / 2 - 0.5) < 1e-8);
  h.app.scene.world.floor = true;
  h.ed.cursorWorld = { x: 4, y: -1 };
  const floorPreview = h.ed.preview().body;
  h.ed.placeBody('box', h.ed.cursorWorld);
  assert.ok(Math.abs(h.app.scene.bodies.at(-1).y - floorPreview.y) < 1e-8);
  assert.ok(Math.abs(floorPreview.y - floorPreview.h / 2) < 1e-8);
});

test('dropping an already-armed library body creates one object and clears the placement preview', () => {
  const h = setup(); h.ed.arm('box'); h.ed.cursorWorld = { x: 1, y: 0 };
  assert.equal(h.ed.dropBody('box', 400, 200), true);
  assert.equal(h.app.scene.bodies.length, 2);
  assert.equal(h.ed.armed, null); assert.equal(h.ed.preview(), null);
  h.emit('pointerdown', { pointerType: 'mouse', clientX: 400 });
  h.emit('pointerup', { pointerType: 'mouse', clientX: 400 });
  assert.equal(h.app.scene.bodies.length, 2, 'the next press selects instead of placing another body');
  h.ed.arm('ball');
  assert.equal(h.ed.dropBody('ball', -1, 200), false);
  assert.equal(h.ed.armed, 'ball'); assert.equal(h.app.scene.bodies.length, 2);
});

test('a pulley is placed with three clicks (wheel, first end, second end), and dragging it moves the wheel', () => {
  const h = setup(); const toasts = []; h.app.toast = (t) => toasts.push(t);
  const click = (clientX, clientY) => { h.emit('pointerdown', { pointerType: 'mouse', clientX, clientY }); h.emit('pointerup', { pointerType: 'mouse', clientX, clientY }); };
  // Dropped from the library: the drop places the wheel at (0, 1.5).
  assert.equal(h.ed.dropConnector('pulley', 300, 50), true);
  assert.deepEqual([h.ed.pending.c.x, h.ed.pending.c.y], [0, 1.5]);
  assert.equal(h.ed.preview().pulley.c.y, 1.5);
  click(300, 45); // inside the wheel: refused
  assert.match(toasts.pop(), /outside the wheel/);
  click(300, 200); // on the box
  assert.equal(h.ed.pending.a, h.body.id);
  assert.ok(h.ed.preview().pulley.from, 'the rope runs from the first end over the wheel to the pointer');
  click(450, 150); // the background at (1.5, 0.5)
  assert.equal(h.app.scene.links.length, 1);
  const l = h.app.scene.links[0];
  assert.equal(l.kind, 'pulley'); assert.equal(l.a, h.body.id); assert.equal(l.b, null);
  assert.deepEqual([l.px, l.py, l.lb.x, l.lb.y], [0, 1.5, 1.5, 0.5]);
  assert.ok(Math.abs(l.length - S.linkLength(h.app.scene, l)) < 1e-12, 'a new rope is taut');
  assert.equal(h.ed.tool, 'select'); assert.deepEqual([h.app.selection.type, h.app.selection.id], ['link', l.id]);
  // Dragging the wheel moves it; the ends stay attached and the rope refits.
  h.emit('pointerdown', { pointerType: 'mouse', clientX: 300, clientY: 50 });
  h.emit('pointermove', { pointerType: 'mouse', clientX: 350, clientY: 30 });
  h.emit('pointerup', { pointerType: 'mouse', clientX: 350, clientY: 30 });
  const moved = h.app.scene.links[0];
  assert.ok(Math.abs(moved.px - 0.5) < 1e-9 && Math.abs(moved.py - 1.7) < 1e-9, `${moved.px}, ${moved.py}`);
  assert.equal(moved.a, h.body.id);
  assert.ok(Math.abs(moved.length - S.linkLength(h.app.scene, moved)) < 1e-12);
  // Both ends on the background, or both on one object, are refused.
  h.ed.setTool('pulley'); click(300, 0); click(100, 300); click(500, 300);
  assert.match(toasts.pop(), /at least one end/);
});

test('a rope or spring end clicked on a spring’s free end joins it; the pair rests as drawn', () => {
  const h = setup(true);
  const toasts = []; h.app.toast = (m) => toasts.push(m);
  const spring = h.app.scene.links[0];
  const click = (x, y) => { h.emit('pointerdown', { clientX: x, clientY: y, pointerType: 'mouse' }); h.emit('pointerup', { clientX: x, clientY: y, pointerType: 'mouse' }); };
  h.ed.setTool('rope');
  click(203, 202); // within a few pixels of the spring's free end at (−1, 0)
  assert.equal(h.ed.pending.join.link, spring);
  click(200, 100); // the background at (−1, 1)
  const rope = h.app.scene.links[1];
  assert.equal(rope.a, spring.id);
  assert.equal(spring.a, rope.id);
  assert.ok(Math.abs(rope.length - (Math.SQRT2 - spring.rest)) < 1e-9, 'rope takes up the gap with the spring at rest');
  assert.deepEqual(toasts, []);
  // A rod is never offered a rope end, and the joined rope offers nothing to another spring.
  h.ed.setTool('rod');
  click(200, 100);
  assert.equal(h.ed.pending.join, null);
  h.ed.cancel();
  h.ed.setTool('spring');
  click(200, 100);
  assert.equal(h.ed.pending.join, null);
  h.ed.cancel();
  // Dragging the spring's joined end away would strand the rope, so the drag is refused.
  h.app.selection = { type: 'link', id: spring.id };
  const node = h.app.renderer.toScreen(S.endPoint(h.app.scene, spring.a, spring.la));
  h.emit('pointerdown', { clientX: node.x, clientY: node.y, pointerType: 'mouse' });
  h.emit('pointermove', { clientX: node.x + 60, clientY: node.y + 60, pointerType: 'mouse' });
  h.emit('pointerup', { clientX: node.x + 60, clientY: node.y + 60, pointerType: 'mouse' });
  assert.match(toasts.pop(), /would have no end on an object/);
  const s2 = S.linkById(h.app.scene, spring.id);
  assert.equal(s2.a, rope.id, 'still joined');
});

test('two springs join in series with no damping; joins need a spring and an object in the pair', () => {
  const h = setup(true);
  const toasts = []; h.app.toast = (m) => toasts.push(m);
  const spring = h.app.scene.links[0];
  spring.damping = 3;
  const click = (x, y) => { h.emit('pointerdown', { clientX: x, clientY: y, pointerType: 'mouse' }); h.emit('pointerup', { clientX: x, clientY: y, pointerType: 'mouse' }); };
  h.ed.setTool('spring');
  click(200, 200);
  click(100, 200); // background at (−2, 0)
  const second = h.app.scene.links[1];
  assert.equal(second.a, spring.id);
  assert.equal(spring.damping, 0);
  assert.equal(second.damping, 0);
  assert.ok(Math.abs(second.rest - 1) < 1e-9, 'the new spring rests at its drawn length');
  // A pulley end may join a spring's free end, but not both of its ends.
  const h2 = setup(true);
  h2.app.toast = (m) => toasts.push(m);
  const c2 = (x, y) => { h2.emit('pointerdown', { clientX: x, clientY: y, pointerType: 'mouse' }); h2.emit('pointerup', { clientX: x, clientY: y, pointerType: 'mouse' }); };
  h2.ed.setTool('pulley');
  c2(200, 50); // wheel at (−1, 1.5)
  c2(200, 200); // first end: the spring's free end
  c2(150, 200); // second end: the background
  const pulley = h2.app.scene.links[1];
  assert.equal(pulley.kind, 'pulley');
  assert.equal(pulley.a, h2.app.scene.links[0].id);
  assert.equal(S.pulleyProblem(h2.app.scene, pulley), '');
});

test('Shift-drag or Select several draws a selection box from empty space or a connector line', () => {
  const h = setup(true);
  const found = [];
  h.app.addBoxToSelection = (f) => found.push(f);
  const drag = (from, to, opts = {}) => {
    h.emit('pointerdown', { clientX: from[0], clientY: from[1], pointerType: 'mouse', ...opts });
    h.emit('pointermove', { clientX: to[0], clientY: to[1], pointerType: 'mouse', ...opts });
    const box = h.ed.selectionDrag();
    h.emit('pointerup', { clientX: to[0], clientY: to[1], pointerType: 'mouse', ...opts });
    return box;
  };
  // Shift-drag from empty space: the box covers the box object and the spring's fixed end.
  const box = drag([100, 100], [400, 300], { shiftKey: true });
  assert.equal(JSON.stringify(box), JSON.stringify({ minX: 100, maxX: 400, minY: 100, maxY: 300 }));
  assert.equal(found.length, 1);
  assert.equal(JSON.stringify(found[0].bodies), JSON.stringify([h.body.id]));
  assert.equal(JSON.stringify(found[0].ends), JSON.stringify([{ id: h.app.scene.links[0].id, end: 'a' }]));
  assert.equal(h.ed.selectionDrag(), null, 'the box goes when released');
  // Shift-drag starting on the spring's line still draws a box rather than moving the spring.
  drag([240, 200], [100, 100], { shiftKey: true });
  assert.equal(found.length, 2);
  assert.equal(h.app.selection, null);
  // Without Shift, a drag from empty space pans as before.
  const cam = { ...h.app.scene.camera };
  drag([100, 100], [150, 120]);
  assert.equal(found.length, 2);
  assert.notDeepEqual(h.app.scene.camera, cam);
  // In Select several mode a plain drag draws the box.
  h.app.multiMode = true;
  drag([100, 100], [400, 300]);
  assert.equal(found.length, 3);
});

test('dragging a selected object carries the connector ends a selection box caught', () => {
  const h = setup(true);
  const spring = h.app.scene.links[0];
  h.app.selection = { type: 'body', id: h.body.id };
  h.app.isSelected = (type, id) => type === 'body' && id === h.body.id;
  h.app.anchors = { ends: [{ id: spring.id, end: 'a' }], wheels: [] };
  // As in the app, selecting afresh drops what a selection box caught.
  h.app.select = function select(sel) { this.selection = sel; this.anchors = { ends: [], wheels: [] }; };
  h.emit('pointerdown', { clientX: 300, clientY: 200, pointerType: 'mouse' });
  h.emit('pointermove', { clientX: 350, clientY: 150, pointerType: 'mouse' });
  h.emit('pointerup', { clientX: 350, clientY: 150, pointerType: 'mouse' });
  const moved = S.linkById(h.app.scene, spring.id);
  const body = S.bodyById(h.app.scene, h.body.id);
  assert.ok(Math.abs(body.x - 0.5) < 1e-9 && Math.abs(body.y - 0.5) < 1e-9);
  assert.ok(Math.abs(moved.la.x - -0.5) < 1e-9 && Math.abs(moved.la.y - 0.5) < 1e-9, 'the fixed end moved with the object');
});

test('with objects selected, dragging a connector attached to them moves the group; a click selects it', () => {
  const h = setup(true);
  const spring = h.app.scene.links[0];
  // A second connector, between the background and a point away from the group.
  const other = S.makeLink(h.app.scene, 'rope', null, { x: -2, y: 1.5 }, null, { x: 1, y: 1.5 });
  h.app.scene.links.push(other);
  const selectGroup = () => {
    h.app.selection = { type: 'body', id: h.body.id };
    h.app.isSelected = (type, id) => type === 'body' && id === h.body.id;
    h.app.anchors = { ends: [{ id: spring.id, end: 'a' }], wheels: [] };
    h.app.isAnchorSelected = (id, end) => h.app.anchors.ends.some((e) => e.id === id && e.end === end);
  };
  const press = (from, to) => {
    h.emit('pointerdown', { clientX: from[0], clientY: from[1], pointerType: 'mouse' });
    if (to) h.emit('pointermove', { clientX: to[0], clientY: to[1], pointerType: 'mouse' });
    h.emit('pointerup', { clientX: (to || from)[0], clientY: (to || from)[1], pointerType: 'mouse' });
  };
  selectGroup();
  press([240, 200], [240, 150]); // drag the spring's line up 0.5 m
  const body = S.bodyById(h.app.scene, h.body.id);
  const s1 = S.linkById(h.app.scene, spring.id);
  assert.ok(Math.abs(body.y - 0.5) < 1e-9, 'the object moved');
  assert.ok(Math.abs(s1.la.x + 1) < 1e-9 && Math.abs(s1.la.y - 0.5) < 1e-9, 'the caught fixed end moved with it');
  assert.equal(h.app.selection.type, 'body', 'the group stays selected');
  // A click on the spring (now 0.5 m higher) without dragging selects the spring, as before.
  press([240, 150]);
  assert.equal(h.app.selection.type, 'link');
  assert.equal(h.app.selection.id, spring.id);
  // A connector not attached to the group is picked up on its own.
  selectGroup();
  press([300, 50], [300, 30]);
  assert.equal(h.app.selection.id, other.id);
  assert.ok(Math.abs(S.bodyById(h.app.scene, h.body.id).y - 0.5) < 1e-9, 'the group stayed put');
});
