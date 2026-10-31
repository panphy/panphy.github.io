// Test helper: the example circuits read from ../examples/, plus build(), which
// also turns a compact test definition into a document. Component entries:
// [label, type, props, realistic [x, y, r, f], schematic [x, y, r, f]].
// Wires: [from, to, color, { r: bends, s: bends }].
const fs = require('node:fs');
const path = require('node:path');
const circuit = require('../js/circuit.js');

const DIR = path.join(__dirname, '../examples');
const list = JSON.parse(fs.readFileSync(path.join(DIR, 'index.json'), 'utf8'))
  .map((ex) => ({ ...ex, text: fs.readFileSync(path.join(DIR, ex.file), 'utf8') }));

function build(ex, view) {
  if (ex.text) {
    const { doc, warnings } = circuit.importDoc(ex.text);
    if (warnings.length) throw new Error(`Example "${ex.title}": ${warnings.join(' ')}`);
    doc.view = view || 'realistic';
    return doc;
  }
  const doc = circuit.createDoc();
  const ids = {};
  for (const [label, type, props, real, sch] of ex.comps) {
    const c = circuit.addComponent(doc, type, { label, props: Object.assign({}, props) });
    ids[label] = c.id;
    doc.layouts.realistic.comps[c.id] = { x: real[0], y: real[1], r: real[2] || 0, f: !!real[3] };
    doc.layouts.schematic.comps[c.id] = { x: sch[0], y: sch[1], r: sch[2] || 0, f: !!sch[3] };
  }
  for (const [from, to, color, bends] of ex.wires) {
    const [la, ta] = from.split('.'), [lb, tb] = to.split('.');
    const r = circuit.addWire(doc, { c: ids[la], t: ta }, { c: ids[lb], t: tb }, { color });
    if (!r.wire) throw new Error(`Example "${ex.title}": ${r.error}`);
    doc.layouts.realistic.wires[r.wire.id] = { pts: (bends && bends.r) || [] };
    doc.layouts.schematic.wires[r.wire.id] = { pts: (bends && bends.s) || [] };
  }
  doc.layouts.realistic.ready = true;
  doc.layouts.schematic.ready = true;
  doc.view = view || 'realistic';
  return doc;
}

module.exports = { list, build };
