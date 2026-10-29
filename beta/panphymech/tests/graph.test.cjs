const test = require('node:test');
const assert = require('node:assert/strict');
require('../../../assets/graph-range.js');
require('../js/scene.js');
require('../js/graph.js');
const { scene: S, graph: G } = globalThis.PPM;
function setup() {
  const scene = S.createScene(), body = S.makeBody(scene, 'ball', 0, 1); scene.bodies.push(body);
  const t = Array.from({ length: 10001 }, (_, i) => i / 100);
  const cols = new Map(['x','y','vx','vy','KE','GPE','EPE'].map(q=>[body.id+':'+q,t.map((v,i)=>i+0.125)]));
  return { scene, track: { type: 'body', id: body.id }, recorder: { t, cols }, graphGroup: 'position', graphRange: null };
}
const payload = app => JSON.parse(decodeURIComponent(G.panPhyPlotUrl(app).split('#import=')[1]));
test('Mech CSV and PanPhyPlot use the selected original samples across every quantity', () => {
  const app = setup(); app.graphRange = { start: 25.25, end: 25.75 };
  const csv = G.toCSV(app).trim().split('\n');
  assert.equal(csv.length, 52); assert.match(csv[1], /^"25.25","2525.13"/); assert.match(csv.at(-1), /^"25.75"/);
  const p = payload(app); assert.equal(p.columns[0].cells.length, 51);
  assert.equal(p.columns[0].cells[0], '25.25'); assert.equal(p.columns[0].cells.at(-1), '25.75');
  assert.ok(p.columns.some(c=>c.unit==='J')); assert.equal(app.recorder.t.length, 10001);
  app.graphRange = null;
  assert.equal(G.toCSV(app).trim().split('\n').length, 10002);
  assert.equal(payload(app).columns[0].cells.at(-1), '100');
});
test('Mech export of an empty recording contains no invented sample or negative index', () => {
  const app = setup(); app.recorder.t=[];
  assert.equal(G.toCSV(app).trim().split('\n').length, 1);
  assert.deepEqual(payload(app).columns[0].cells, []);
});
