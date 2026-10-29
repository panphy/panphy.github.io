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
