// Test helper: the example scenes read from ../examples/. Each entry gets an id
// (its file name without .ppmech) and build(), which returns a fresh scene.
const fs = require('node:fs');
const path = require('node:path');

// Merged and cut shapes (the Motor car's chassis) need the shape library to load.
globalThis.earcut = globalThis.earcut || require('../js/vendor/earcut.min.js');
globalThis.polygonClipping = globalThis.polygonClipping || require('../js/vendor/polygon-clipping.min.js');
if (!globalThis.PPM.shapes) require('../js/shapes.js');

const DIR = path.join(__dirname, '../examples');
const S = globalThis.PPM.scene;
const list = JSON.parse(fs.readFileSync(path.join(DIR, 'index.json'), 'utf8')).map((ex) => {
  const text = fs.readFileSync(path.join(DIR, ex.file), 'utf8');
  return { ...ex, id: ex.file.replace(/\.ppmech$/, ''), text, build: () => S.parse(text).scene };
});

globalThis.PPM.examples = { list };
module.exports = globalThis.PPM.examples;
