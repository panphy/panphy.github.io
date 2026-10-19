const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../js/embedded-images.js'), 'utf8').replace(/export /g, '');
const { createEmbeddedImageModel, createEmbeddedImageEditor } = vm.runInNewContext(`${source}\n({createEmbeddedImageModel, createEmbeddedImageEditor})`, {
  crypto: { randomUUID: () => 'test-session' }, Event
});
const png = 'data:image/png;base64,' + 'Ab12+/'.repeat(1000) + '==';
const svg = 'data:image/svg+xml;base64,PHN2Zy8+';
const documentText = `# Lesson\n<img src="${png}" width="60%" />\n\n![Diagram](${svg})\nText after.`;

test('HTML and Markdown images collapse and round-trip byte for byte', () => {
  const model = createEmbeddedImageModel('test');
  const compact = model.collapse(documentText).value;
  assert.ok(compact.length < 200);
  assert.ok(!compact.includes('base64'));
  assert.equal(model.expand(compact), documentText);
  assert.equal(model.collapse(model.expand(compact)).value, compact);
});

test('ordinary links, unknown references and non-image data URLs remain unchanged', () => {
  const model = createEmbeddedImageModel('test');
  const text = '![x](https://example.com/x.png) data:text/plain;base64,abc panphy-image:other:1';
  assert.equal(model.collapse(text).value, text);
  assert.equal(model.expand(text), text);
});

test('editing around, deleting, duplicating and undoing image references preserves images', () => {
  const model = createEmbeddedImageModel('test');
  const reference = model.collapse(png).value;
  assert.equal(model.collapse(png).value, reference);
  assert.equal(model.expand(`Before ${reference} after ${reference}`), `Before ${png} after ${png}`);
  assert.equal(model.expand('Deleted'), 'Deleted');
  assert.equal(model.expand(reference), png);
  const reopened = createEmbeddedImageModel('new');
  assert.equal(reopened.expand(reopened.collapse(model.expand(reference)).value), png);
});

test('caret positions before, within and after multiple collapsed images map correctly', () => {
  const model = createEmbeddedImageModel('test');
  const text = `A${png}B${svg}C`;
  const result = model.collapse(text, [0, 1, 15, png.length + 1, text.length]);
  const firstReference = model.collapse(png).value;
  assert.deepEqual(Array.from(result.positions), [0, 1, 1 + firstReference.length, 1 + firstReference.length, result.value.length]);
});

function harness() {
  const events = {};
  const input = {
    value: '', selectionStart: 0, selectionEnd: 0, selectionDirection: 'none', scrollTop: 10,
    addEventListener(type, callback) { events[type] = callback; },
    setSelectionRange(start, end) { this.selectionStart = start; this.selectionEnd = end; },
    setRangeText(text, start, end) { this.value = this.value.slice(0, start) + text + this.value.slice(end); this.setSelectionRange(start, start); },
    dispatchEvent() { editor.compactInput(); }
  };
  let click;
  const notice = { hidden: true };
  const toggle = { addEventListener(type, callback) { click = callback; }, setAttribute() {} };
  let changes = 0;
  const editor = createEmbeddedImageEditor(input, notice, toggle, () => changes++);
  return { input, notice, toggle, editor, events, click: () => click(), changes: () => changes };
}

test('editor setters and view toggle keep saved content identical', () => {
  const h = harness();
  h.editor.value = documentText;
  assert.equal(h.notice.hidden, false);
  assert.ok(h.input.value.length < 220);
  assert.equal(h.editor.value, documentText);
  h.click();
  assert.equal(h.input.value, documentText);
  assert.equal(h.toggle.textContent, 'Hide image data');
  h.click();
  assert.equal(h.editor.value, documentText);
  assert.ok(h.input.value.length < 220);
  assert.equal(h.changes(), 2);
  h.editor.value = '';
  assert.equal(h.notice.hidden, true);
});

test('pasted image data folds while retaining caret and scroll position', () => {
  const h = harness();
  h.input.value = documentText;
  h.input.selectionStart = h.input.selectionEnd = documentText.length;
  h.editor.compactInput();
  assert.equal(h.input.selectionStart, h.input.value.length);
  assert.equal(h.input.scrollTop, 10);
  assert.equal(h.editor.value, documentText);
});

test('copy and cut export actual image data instead of temporary references', () => {
  for (const type of ['copy', 'cut']) {
    const h = harness();
    h.editor.value = documentText;
    h.input.selectionEnd = h.input.value.length;
    let clipboard;
    let prevented = false;
    h.events[type]({ preventDefault() { prevented = true; }, clipboardData: { setData(mime, text) { assert.equal(mime, 'text/plain'); clipboard = text; } } });
    assert.equal(prevented, true);
    assert.equal(clipboard, documentText);
    assert.equal(h.editor.value, type === 'cut' ? '' : documentText);
  }
});
