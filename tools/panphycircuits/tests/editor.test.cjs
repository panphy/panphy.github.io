// Gesture regression checks with deterministic pointer events and hold timers.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function setup(type = 'resistor') {
  const listeners = new Map(), timers = new Map(), calls = [];
  let timerId = 0;
  const comp = { id: 'c1', type, label: 'R1', props: { closed: false } };
  const def = { props: [{ key: 'value' }], actuator: { kind: type === 'pushswitch' ? 'momentary' : 'toggle', prop: 'closed' } };
  const layout = {
    GRID: 20, VIEWS: ['realistic', 'schematic'], snap: x => x, canMove: () => true,
    artFor: () => ({ actuator: () => def.actuator }),
    termWorld: () => ({ x: 0, y: 0, dx: 1, dy: 0 }),
    wirePoints: () => [], wireRoute: () => ({ d: 'M 0 0' })
  };
  const svg = {
    addEventListener: (name, fn) => listeners.set(name, [...(listeners.get(name) || []), fn]),
    removeEventListener() {}, setPointerCapture() {},
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 600, height: 400 })
  };
  const host = { focus() {}, contains: () => false, classList: { add() {}, remove() {} } };
  const app = {
    doc: { view: 'realistic', components: [comp], wires: [], layouts: { realistic: { comps: { c1: { x: 0, y: 0, r: 0 } }, wires: {} } } },
    cameras: { realistic: { tx: 0, ty: 0, z: 1 } }, tool: 'select', snap: false,
    selection: { comps: new Set(), wires: new Set() }, sim: { pressed: {} },
    renderer: { renderTerminals() {}, setPreview() {}, renderMove: () => calls.push('move') },
    setSelection(comps, wires, reveal = true) { this.selection.comps = new Set(comps); this.selection.wires = new Set(wires); calls.push(['select', reveal]); },
    showQuickSettings: (...args) => calls.push(['menu', ...args]),
    commit: label => calls.push(['commit', label]),
    operationalChanged: () => calls.push('operate'), electricalChanged: () => calls.push('electrical'),
    setHint() {}, announce() {}
  };
  const context = { PPC: { registry: { get: () => def }, circuit: { getComp: (doc, id) => doc.components.find(c => c.id === id) }, layout },
    document: { addEventListener() {} },
    setTimeout(fn) { timers.set(++timerId, fn); return timerId; }, clearTimeout: id => timers.delete(id)
  };
  vm.runInNewContext(fs.readFileSync(require.resolve('../js/editor.js'), 'utf8'), context);
  const editor = context.PPC.editor.createEditor(app, svg, host);
  app.editor = editor;
  function emit(name, options = {}) {
    const { hit = 'comp', ...rest } = options;
    const dataset = hit === 'term' ? { hit, c: 'c1', t: 'a' } : { hit, id: 'c1' };
    const event = { button: 0, pointerId: 1, pointerType: 'touch', clientX: 100, clientY: 100,
      target: { closest: () => ({ dataset }) }, preventDefault() {}, ...rest };
    for (const fn of [...(listeners.get(name) || [])]) fn(event);
  }
  function hold() { for (const [id, fn] of [...timers]) { timers.delete(id); fn(); } }
  const menus = () => calls.filter(c => Array.isArray(c) && c[0] === 'menu');
  return { app, comp, editor, calls, emit, hold, menus };
}

test('touch and pen holds open settings without moving or operating on release', () => {
  for (const pointerType of ['touch', 'pen']) {
    const h = setup();
    h.emit('pointerdown', { pointerType });
    assert.equal(h.calls.length, 0, 'selection waits so the inspector cannot cover the hold');
    h.hold();
    assert.deepEqual(h.calls[0], ['select', false]);
    assert.equal(h.menus().length, 1);
    h.emit('pointerup');
    assert.equal(h.editor.drag, null);
    assert.equal(h.calls.some(c => c[0] === 'commit'), false);
  }
});

test('short taps retain normal selection and do not open settings later', () => {
  const h = setup(); h.emit('pointerdown'); h.emit('pointerup'); h.hold();
  assert.deepEqual(h.calls, [['select', true]]);
});

test('movement cancels the hold and continues component dragging', () => {
  const h = setup(); h.emit('pointerdown');
  h.emit('pointermove', { clientX: 120 }); h.hold(); h.emit('pointerup', { clientX: 120 });
  assert.equal(h.menus().length, 0);
  assert.equal(h.app.doc.layouts.realistic.comps.c1.x, 20);
  assert.ok(h.calls.some(c => c[0] === 'commit' && c[1] === 'Move component'));
});

test('holding a switch actuator opens settings without toggling; tapping still toggles', () => {
  const h = setup('switch'); h.emit('pointerdown', { hit: 'act' }); h.hold(); h.emit('pointerup');
  assert.equal(h.menus().length, 1); assert.equal(h.comp.props.closed, false);
  const tap = setup('switch'); tap.emit('pointerdown', { hit: 'act' }); tap.emit('pointerup'); tap.hold();
  assert.equal(tap.comp.props.closed, true); assert.equal(tap.menus().length, 0);
});

test('momentary push buttons still press immediately and release normally', () => {
  const h = setup('pushswitch'); h.emit('pointerdown', { hit: 'act' });
  assert.equal(h.app.sim.pressed.c1, true); h.hold(); h.emit('pointerup');
  assert.equal(h.app.sim.pressed.c1, undefined); assert.equal(h.menus().length, 0);
});

test('terminal holds retain click-to-wire behavior', () => {
  const h = setup(); h.emit('pointerdown', { hit: 'term' }); h.hold(); h.emit('pointerup');
  assert.equal(h.menus().length, 0); assert.equal(h.editor.wiring.from.c, 'c1');
});

test('a second finger or pointer cancellation prevents the hold menu', () => {
  for (const cancel of [h => h.emit('pointerdown', { pointerId: 2 }), h => h.emit('pointercancel')]) {
    const h = setup(); h.emit('pointerdown'); cancel(h); h.hold();
    assert.equal(h.menus().length, 0);
  }
});

test('native touch contextmenu opens the pending hold once and consumes its release', () => {
  const h = setup('switch'); h.emit('pointerdown', { hit: 'act' }); h.emit('contextmenu'); h.hold(); h.emit('pointerup');
  assert.equal(h.menus().length, 1); assert.equal(h.comp.props.closed, false);
});

test('mouse selection and right-click settings remain immediate', () => {
  const h = setup(); h.emit('pointerdown', { pointerType: 'mouse' });
  assert.deepEqual(h.calls[0], ['select', true]); h.emit('pointerup');
  h.emit('contextmenu', { pointerType: 'mouse' }); assert.equal(h.menus().length, 1);
});

test('a document replacement invalidates a pending hold', () => {
  const h = setup(); h.emit('pointerdown'); h.app.doc = { ...h.app.doc }; h.hold();
  assert.equal(h.menus().length, 0); assert.equal(h.editor.drag, null);
});
