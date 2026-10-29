const test = require('node:test');
const assert = require('node:assert/strict');
globalThis.planck = require('../js/vendor/planck.min.js');
require('../js/scene.js');
require('../js/physics.js');
require('../js/examples.js');
require('../js/svg.js');
require('../js/render.js');
const { scene: S, physics: P, examples: E } = globalThis.PPM;

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


test('override glow follows the drag setting and is omitted from clean exports', () => {
  const scene = S.createScene(); scene.world.floor = false;
  const b = S.makeBody(scene, 'box', 0, 0); b.dragModel = 'linear'; scene.bodies.push(b);
  const app = { scene, sim: null, display: {}, poseOf: b => b, isSelected: () => false, selection: null, extra: [], editor: { deleteButton: () => null, preview: () => null } };
  function draw(clean) {
    const ctx = PPM.svg.createContext(800, 500), renderer = PPM.render.createRenderer(app, {}, ctx);
    Object.assign(renderer, { w: 800, h: 500 }); renderer.colors = { bg: '#ffffff', floor: '#abcdef', floorLine: '#abcdef' };
    renderer.draw(clean); return ctx.serialize();
  }
  assert.match(draw(false), /#F08C00/);
  assert.doesNotMatch(draw(true), /#F08C00/);
  b.dragModel = 'world'; assert.doesNotMatch(draw(false), /#F08C00/);
});
