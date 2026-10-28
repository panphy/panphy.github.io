const test = require('node:test');
const assert = require('node:assert/strict');
const fluid = require('../js/fluid.js');

test('Stokes force is −6πηrv', () => {
  const eta = 1.5, r = 0.2, vx = 0.4, vy = -0.1;
  const f = fluid.stokesForce(eta, r, vx, vy);
  const k = -6 * Math.PI * eta * r;
  assert.ok(Math.abs(f.fx - k * vx) < 1e-12);
  assert.ok(Math.abs(f.fy - k * vy) < 1e-12);
});

test('Stokes force is zero for η = 0 or r = 0', () => {
  assert.deepEqual(fluid.stokesForce(0, 1, 2, 3), { fx: 0, fy: 0 });
  assert.deepEqual(fluid.stokesForce(1, 0, 2, 3), { fx: 0, fy: 0 });
});

test('buoyancy points opposite +y-down gravity', () => {
  const f = fluid.buoyancyForce(1000, 0.05, 9.81, +1);
  assert.equal(f.fx, 0);
  assert.ok(f.fy < 0);
  assert.ok(Math.abs(f.fy + 1000 * 0.05 * 9.81) < 1e-9);
});

test('fully submerged circle overlap is about πr²', () => {
  const r = 0.5;
  const area = fluid.circleAabbOverlapArea(0, 0, r, -2, -2, 2, 2);
  assert.ok(Math.abs(area - Math.PI * r * r) / (Math.PI * r * r) < 0.03);
});

test('circle outside fluid has zero overlap', () => {
  assert.equal(fluid.circleAabbOverlapArea(5, 5, 0.3, -1, -1, 1, 1), 0);
});

test('box overlap area matches AABB intersection', () => {
  const a = fluid.rectAabbOverlapArea(0, 0, 2, 1, 1, 0, 3, 2);
  assert.equal(a, 1);
});

test('fluidForcesForCircle combines buoyancy and Stokes', () => {
  const region = { left: -1, top: -1, right: 1, bottom: 1, rho: 1000, eta: 1 };
  const body = { cx: 0, cy: 0, r: 0.4, vx: 0.2, vy: 0.1, area: Math.PI * 0.16 };
  const out = fluid.fluidForcesForCircle(region, body, 9.81, +1);
  assert.ok(out.submergedArea > 0.4);
  assert.ok(out.fy < 0); // net buoyancy up (negative y) dominates light Stokes
  const stokes = fluid.stokesForce(1, 0.4, 0.2, 0.1);
  assert.ok(Math.abs(out.fx - stokes.fx) < 1e-9);
});

test('equivalent radius matches disk of same area', () => {
  const area = 2.5;
  assert.ok(Math.abs(fluid.equivalentRadius(area) - Math.sqrt(area / Math.PI)) < 1e-12);
});
