const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

async function loadUnits() {
  const file = path.join(__dirname, '../js/units.js');
  return import(pathToFileURL(file).href);
}

test('SCALE and meter conversions', async () => {
  const u = await loadUnits();
  assert.equal(u.SCALE, 80);
  assert.equal(u.m2px(1), 80);
  assert.equal(u.px2m(80), 1);
});

test('springRestPx is distance times stretch', async () => {
  const u = await loadUnits();
  assert.equal(u.springRestPx(0, 0, 30, 40), 50);
  assert.equal(u.springRestPx(0, 0, 30, 40, 0.5), 25);
});

test('bodyMassFromDensity scales with area', async () => {
  const u = await loadUnits();
  const sphere = u.bodyMassFromDensity('sphere', { r: 1, density: 1000 });
  assert.ok(Math.abs(sphere - 1000 * Math.PI) < 1e-6);
  const box = u.bodyMassFromDensity('block', { w: 2, h: 0.5, density: 800 });
  assert.equal(box, 800);
});
