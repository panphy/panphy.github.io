const test = require('node:test');
const assert = require('node:assert/strict');
const R = require('../../../assets/graph-range.js');

function setup() {
  const handlers = {};
  let times = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10], range = null, source = {}, redraws = 0;
  const canvas = { addEventListener: (key, fn) => { handlers[key] = fn; }, getBoundingClientRect: () => ({ left: 20, top: 30 }), focus() {}, setPointerCapture() {}, releasePointerCapture() {} };
  const selection = R.mount(canvas, { getTimes: () => times, getSource: () => source, getRange: () => range, setRange: (r) => { range = r; }, redraw: () => redraws++ });
  selection.setPlot({ left: 50, top: 10, width: 500, height: 200, t0: 0, t1: 10 });
  const emit = (type, x = 170, extra = {}) => handlers[type]({ button: 0, pointerId: 1, isPrimary: true, clientX: x + 20, clientY: 80, preventDefault() {}, ...extra });
  return { selection, emit, get range() { return range; }, times, get redraws() { return redraws; }, replaceSource() { source = {}; times = [0]; } };
}

test('time selection snaps to original irregular sample times in either direction', () => {
  const times = [0.03, 0.08, 0.21, 0.47, 0.92];
  assert.deepEqual(R.select(times, 0.19, 0.5), { start: 0.21, end: 0.47 });
  assert.deepEqual(R.select(times, 0.5, 0.19), { start: 0.21, end: 0.47 });
  assert.deepEqual(R.indices(times, { start: 0.21, end: 0.47 }), [2, 3]);
  assert.equal(R.select(times, 0.2, 0.22), null);
  assert.deepEqual(R.bounds([], null), { t0: 0, t1: 1 });
  assert.deepEqual(R.indices(times, null), [0, 1, 2, 3, 4]);
});

test('mouse, touch and pen select and progressively zoom without deleting samples', () => {
  for (const pointerType of ['mouse', 'touch', 'pen']) {
    const h = setup();
    h.emit('pointerdown', 150, { pointerType }); h.emit('pointermove', 450, { pointerType }); h.emit('pointerup', 450, { pointerType });
    assert.deepEqual(h.range, { start: 2, end: 8 });
    h.selection.setPlot({ left: 50, top: 10, width: 500, height: 200, t0: 2, t1: 8 });
    h.emit('pointerdown', 450); h.emit('pointerup', 150);
    assert.deepEqual(h.range, { start: 3, end: 7 });
    assert.equal(h.times.length, 11);
    h.selection.reset(); assert.equal(h.range, null);
  }
});

test('taps, right clicks, cancelled drags and second fingers leave the range unchanged', () => {
  for (const action of ['tap', 'right', 'cancel', 'lostcapture', 'second']) {
    const h = setup();
    h.emit('pointerdown', 150, { button: action === 'right' ? 2 : 0 });
    if (action === 'tap') h.emit('pointerup', 152);
    else {
      h.emit('pointermove', 450);
      if (action === 'cancel') h.emit('pointercancel');
      if (action === 'lostcapture') h.emit('lostpointercapture');
      if (action === 'second') h.emit('pointerdown', 200, { pointerId: 2, isPrimary: false });
      h.emit('pointerup', 450);
    }
    assert.equal(h.range, null, action);
  }
});

test('axis is frozen during a live drag; out-of-plot releases clamp to its edges', () => {
  const h = setup();
  h.emit('pointerdown', 150); h.times.push(11, 12, 13);
  assert.deepEqual(h.selection.viewBounds(h.times, null), { t0: 0, t1: 10 });
  h.emit('pointerup', 900);
  assert.deepEqual(h.range, { start: 2, end: 10 });
  h.replaceSource(); h.selection.sync(); assert.equal(h.range, null);
});

test('keyboard zoom, pan, and Escape recover the full recording', () => {
  const h = setup();
  h.emit('keydown', 0, { key: '+' }); assert.deepEqual(h.range, { start: 2, end: 7 });
  h.emit('keydown', 0, { key: 'ArrowRight' }); assert.deepEqual(h.range, { start: 3, end: 8 });
  h.emit('keydown', 0, { key: '-' }); assert.deepEqual(h.range, { start: 0, end: 10 });
  h.emit('keydown', 0, { key: 'Escape' }); assert.equal(h.range, null);
});
