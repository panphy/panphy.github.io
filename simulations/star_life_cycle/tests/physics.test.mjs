import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  SUN_T, CHANDRASEKHAR_MASS, OPPENHEIMER_VOLKOFF_MASS, mainSequence, fateOf, remnantMass,
  radiusFrom, luminosityFrom, temperatureFrom, buildLife, lifeState, hrTrack
} from '../physics.js';

const close = (actual, expected, tolerance, label) =>
  assert.ok(Math.abs(actual - expected) <= tolerance, `${label}: ${actual} is not within ${tolerance} of ${expected}`);

test('a star of one solar mass is the Sun', () => {
  const sun = mainSequence(1);
  assert.equal(sun.L, 1);
  assert.equal(sun.R, 1);
  close(sun.T, SUN_T, 1e-6, 'surface temperature');
  assert.equal(sun.years, 1e10);
});

test('the mass–luminosity and mass–radius laws join without a jump', () => {
  for (const mass of [0.43, 1, 2, 20]) {
    const below = mainSequence(mass * (1 - 1e-9));
    const above = mainSequence(mass * (1 + 1e-9));
    close(above.L / below.L, 1, 0.04, `luminosity at ${mass}`);
    close(above.R / below.R, 1, 1e-6, `radius at ${mass}`);
  }
});

test('heavier stars are brighter and shorter-lived', () => {
  const masses = [0.1, 0.3, 0.6, 1, 2, 5, 10, 25, 60, 100];
  for (let i = 1; i < masses.length; i += 1) {
    const lighter = mainSequence(masses[i - 1]);
    const heavier = mainSequence(masses[i]);
    assert.ok(heavier.L > lighter.L, `luminosity rises to ${masses[i]}`);
    assert.ok(heavier.years < lighter.years, `lifetime falls to ${masses[i]}`);
  }
});

test('luminosity, radius and temperature follow the Stefan–Boltzmann law', () => {
  close(luminosityFrom(2, 2 * SUN_T), 4 * 16, 1e-9, 'L from R and T');
  close(radiusFrom(64, 2 * SUN_T), 2, 1e-9, 'R from L and T');
  close(temperatureFrom(64, 2), 2 * SUN_T, 1e-6, 'T from L and R');
});

test('the remnant depends on the starting mass, within the two limits', () => {
  assert.equal(fateOf(1), 'whiteDwarf');
  assert.equal(fateOf(7.9), 'whiteDwarf');
  assert.equal(fateOf(8), 'neutronStar');
  assert.equal(fateOf(19.9), 'neutronStar');
  assert.equal(fateOf(20), 'blackHole');
  for (const mass of [0.1, 0.5, 1, 3, 7.9]) {
    assert.ok(remnantMass(mass) <= mass, `a white dwarf is no heavier than its star (${mass})`);
    assert.ok(remnantMass(mass) < CHANDRASEKHAR_MASS, `white dwarf below the Chandrasekhar limit (${mass})`);
  }
  for (const mass of [8, 12, 19.9]) {
    assert.ok(remnantMass(mass) >= CHANDRASEKHAR_MASS && remnantMass(mass) < OPPENHEIMER_VOLKOFF_MASS, `neutron star between the limits (${mass})`);
  }
  for (const mass of [20, 50, 100]) {
    assert.ok(remnantMass(mass) > OPPENHEIMER_VOLKOFF_MASS, `black hole above the limit (${mass})`);
  }
});

test('every life runs forward in time with finite values', () => {
  for (const mass of [0.1, 0.2, 0.4, 1, 3, 8, 15, 25, 40, 100]) {
    const life = buildLife(mass);
    assert.equal(life.stages[0].id, 'cloud');
    assert.equal(life.stages[1].id, 'proto');
    assert.equal(life.stages[2].id, 'ms');
    const last = life.stages[life.stages.length - 1].id;
    assert.equal(last, { whiteDwarf: 'wd', neutronStar: 'ns', blackHole: 'bh' }[life.fate]);
    let age = -Infinity;
    for (let s = 0; s <= life.stages.length - 1e-6; s += 0.05) {
      const now = lifeState(life, s);
      assert.ok(now.age >= age - 1e-6 * Math.abs(age), `age never runs backward (mass ${mass}, position ${s.toFixed(2)})`);
      age = now.age;
      assert.ok(Number.isFinite(now.mass) && now.mass > 0, `mass is finite (mass ${mass}, position ${s.toFixed(2)})`);
      if (now.R !== null) assert.ok(Number.isFinite(now.R) && now.R > 0, `radius is finite (mass ${mass}, position ${s.toFixed(2)})`);
      if (now.L !== null) assert.ok(Number.isFinite(now.L) && now.L > 0, `luminosity is finite (mass ${mass}, position ${s.toFixed(2)})`);
    }
    for (const track of hrTrack(life)) {
      for (const point of track.points) assert.ok(point.T > 0 && point.L > 0, `track point is plottable (mass ${mass}, ${track.id})`);
    }
  }
});

test('the Sun spends about ten billion years on the main sequence and ends as a white dwarf of about 0.5 solar masses', () => {
  const life = buildLife(1);
  assert.equal(life.fate, 'whiteDwarf');
  close(life.remnant, 0.5, 0.05, 'remnant mass');
  assert.equal(life.outlivesUniverse, false);
  assert.equal(buildLife(0.2).outlivesUniverse, true);
});
