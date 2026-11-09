import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  N, HALF_WIDTH, LID_MIN, LID_MAX, T_MIN, WALL_CONTACT,
  createSim, resetSim, stepSim, temperatureOf, kineticEnergy, analyzeStructure
} from '../physics.js';

const DT = 0.004;
function run(sim, time) {
  for (let i = 0; i < Math.round(time / DT); i += 1) stepSim(sim, DT);
}
function checkFinite(sim, label) {
  for (let i = 0; i < N * 3; i += 1) {
    assert.ok(Number.isFinite(sim.pos[i]) && Number.isFinite(sim.vel[i]), `${label}: positions and velocities stay finite`);
  }
  assert.ok(sim.lid >= LID_MIN && sim.lid <= LID_MAX, `${label}: the lid stays inside its limits`);
}

test('the sample starts as a cold, complete crystal resting on the floor', () => {
  const sim = createSim();
  assert.equal(N, 256);
  assert.ok(Math.abs(temperatureOf(sim) - T_MIN) < 1e-9, 'starts at the lowest temperature');
  assert.ok(Math.abs(2 * kineticEnergy(sim) / (3 * N - 3) - T_MIN) < 1e-9);
  let lowest = Infinity;
  for (let i = 0; i < N; i += 1) {
    lowest = Math.min(lowest, sim.pos[i * 3 + 1]);
    assert.ok(Math.abs(sim.pos[i * 3]) < HALF_WIDTH && Math.abs(sim.pos[i * 3 + 2]) < HALF_WIDTH, 'inside the side walls');
  }
  assert.ok(lowest >= WALL_CONTACT, 'above the floor');
  assert.ok(sim.potential / N < -5, 'bound as a close-packed solid');
});

test('a cold solid stays a solid: ordered, in place, at the set temperature', () => {
  const sim = createSim();
  sim.targetT = 0.1;
  run(sim, 12);
  checkFinite(sim, 'solid');
  assert.ok(Math.abs(temperatureOf(sim) - 0.1) < 0.02, `temperature holds near 0.1 (got ${temperatureOf(sim).toFixed(3)})`);
  const structure = analyzeStructure(sim, null);
  assert.ok(structure.isolatedFraction < 0.02, 'no gas');
  assert.ok(structure.mobileFraction < 0.1, 'particles vibrate about fixed places');
  assert.ok(structure.crystalFraction > 0.25, 'the interior keeps its twelve neighbors');
  // The horizontal drift is removed every step.
  let vx = 0, vz = 0;
  for (let i = 0; i < N; i += 1) { vx += sim.vel[i * 3]; vz += sim.vel[i * 3 + 2]; }
  assert.ok(Math.abs(vx / N) < 1e-9 && Math.abs(vz / N) < 1e-9, 'no sideways drift');
});

test('a hot sample becomes a gas that lifts the lid', () => {
  const sim = createSim();
  const coldLid = sim.lid;
  resetSim(sim, 1.6);
  run(sim, 30);
  checkFinite(sim, 'gas');
  assert.ok(Math.abs(temperatureOf(sim) - 1.6) < 0.25, `temperature holds near 1.6 (got ${temperatureOf(sim).toFixed(3)})`);
  assert.ok(sim.lid > coldLid + 3, `the lid rises as the sample boils (from ${coldLid.toFixed(2)} to ${sim.lid.toFixed(2)})`);
  const structure = analyzeStructure(sim, null);
  assert.ok(structure.crystalFraction < 0.02, 'no crystal is left');
  assert.ok(structure.isolatedFraction > 0.3, 'many particles are far from any neighbor');
});

test('bonds are reported as pairs of end points', () => {
  const sim = createSim();
  const buffer = new Float32Array(6 * 4000);
  const { bonds } = analyzeStructure(sim, buffer);
  // A face-centered cubic block of 256 has 12 neighbors inside and fewer on its faces.
  assert.ok(bonds > 1000 && bonds < 256 * 6 + 1, `a plausible number of bonds (${bonds})`);
  const dx = buffer[3] - buffer[0], dy = buffer[4] - buffer[1], dz = buffer[5] - buffer[2];
  const length = Math.hypot(dx, dy, dz);
  assert.ok(length > 1 && length < 1.35, `a bond is about one particle diameter long (${length.toFixed(3)})`);
});
