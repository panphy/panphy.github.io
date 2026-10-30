const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

test('clicking a library part and then dragging it drops once without rearming on the synthetic click', () => {
  const source = fs.readFileSync(require.resolve('../js/ui.js'), 'utf8');
  const start = source.indexOf('    function buildLibrary()');
  const end = source.indexOf('\n    buildLibrary();', start);
  const listeners = new Map(); let drops = 0, ghosts = 0;
  const btn = { dataset: { part: 'box' }, setPointerCapture() {}, addEventListener: (name, fn) => listeners.set(name, fn) };
  const list = { innerHTML: '', querySelectorAll: () => [btn] };
  const editor = { armed: null, arm(kind) { this.armed = kind; }, dropBody() { drops++; } };
  vm.runInNewContext('(' + source.slice(start, end) + ')()', {
    $: () => list, PART_GROUPS: [{ title: 'Objects', items: ['box'] }], S: { BODY_KINDS: { box: { label: 'Box' } } },
    esc: x => x, PART_TITLES: { box: 'Box' }, partSvg: () => '', app: { editor }, ui: { closePanels() {} },
    document: { body: { appendChild() { ghosts++; } }, createElement: () => ({ style: {}, remove() { ghosts--; } }) }
  });
  listeners.get('click')(); assert.equal(editor.armed, 'box');
  const event = { button: 0, pointerId: 1, clientX: 0, clientY: 0 };
  listeners.get('pointerdown')(event);
  listeners.get('pointermove')({ ...event, clientX: 100 });
  assert.equal(editor.armed, null, 'only the drag ghost remains visible');
  listeners.get('pointerup')({ ...event, type: 'pointerup', clientX: 100 });
  listeners.get('click')();
  assert.equal(drops, 1); assert.equal(ghosts, 0); assert.equal(editor.armed, null);
});

test('a drop that throws still leaves the part unarmed after the click that follows', () => {
  const source = fs.readFileSync(require.resolve('../js/ui.js'), 'utf8');
  const start = source.indexOf('    function buildLibrary()');
  const end = source.indexOf('\n    buildLibrary();', start);
  const listeners = new Map();
  const btn = { dataset: { part: 'box' }, setPointerCapture() {}, addEventListener: (name, fn) => listeners.set(name, fn) };
  const list = { innerHTML: '', querySelectorAll: () => [btn] };
  const editor = { armed: null, arm(kind) { this.armed = kind; }, dropBody() { throw new Error('inspector failed'); } };
  vm.runInNewContext('(' + source.slice(start, end) + ')()', {
    $: () => list, PART_GROUPS: [{ title: 'Objects', items: ['box'] }], S: { BODY_KINDS: { box: { label: 'Box' } } },
    esc: x => x, PART_TITLES: { box: 'Box' }, partSvg: () => '', app: { editor }, ui: { closePanels() {} },
    document: { body: { appendChild() {} }, createElement: () => ({ style: {}, remove() {} }) }
  });
  const event = { button: 0, pointerId: 1, clientX: 0, clientY: 0 };
  listeners.get('pointerdown')(event);
  listeners.get('pointermove')({ ...event, clientX: 100 });
  assert.throws(() => listeners.get('pointerup')({ ...event, type: 'pointerup', clientX: 100 }));
  listeners.get('click')();
  assert.equal(editor.armed, null);
});
