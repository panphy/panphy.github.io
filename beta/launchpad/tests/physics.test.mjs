// Run with: node --test beta/launchpad/tests/*.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MU, R_EARTH, OMEGA, G0, ATMO_TOP, airDensity, rk4Step, keplerStep, orbitOf, circularSpeed, deltaV
} from '../physics.js';
import { FLEET, analyze, designFor } from '../rocket.js';
import { Flight, WARPS } from '../flight.js';
import { CONTRACTS, rocketFits, judge } from '../contracts.js';
import { Guidance } from '../guidance.js';
import { flyContract } from './pilot.mjs';

const SATELLITE = { name: 'Satellite', mass: 1000, diameter: 1.6, length: 2.6 };
const KESTREL = designFor(FLEET.find((rocket) => rocket.id === 'kestrel'), SATELLITE);

const circular = (altitude) => {
  const r = R_EARTH + altitude;
  return { x: r, y: 0, vx: 0, vy: circularSpeed(r), mass: 1000 };
};
const energy = (s) => (s.vx * s.vx + s.vy * s.vy) / 2 - MU / Math.hypot(s.x, s.y);

test('the atmosphere thins with height and ends at its top', () => {
  assert.ok(Math.abs(airDensity(0) - 1.225) < 1e-9);
  assert.ok(airDensity(10000) < 0.5 && airDensity(10000) > 0.3);
  assert.ok(airDensity(100000) < 1e-6);
  assert.equal(airDensity(ATMO_TOP), 0);
});

test('a circular orbit stays circular through a long time warp', () => {
  let s = circular(400000);
  const period = 2 * Math.PI * Math.sqrt((R_EARTH + 400000) ** 3 / MU);
  // 1000x warp at 60 frames a second, for 200 orbits.
  for (let t = 0; t < period * 200; t += 1000 / 60) s = keplerStep(s, 1000 / 60);
  assert.ok(Math.abs(Math.hypot(s.x, s.y) - (R_EARTH + 400000)) < 1, 'radius drifted');
  assert.ok(Math.abs(Math.hypot(s.vx, s.vy) - circularSpeed(R_EARTH + 400000)) < 1e-3, 'speed drifted');
});

test('rails and step-by-step integration agree on an eccentric orbit', () => {
  const start = { x: R_EARTH + 200000, y: 0, vx: 300, vy: 8200, mass: 1000 };
  const stepped = { ...start };
  for (let i = 0; i < 100000; i += 1) rk4Step(stepped, 0.02, 0, 0, 0, 0);
  const rails = keplerStep(start, 2000);
  assert.ok(Math.hypot(stepped.x - rails.x, stepped.y - rails.y) < 5, 'positions differ');
  assert.ok(Math.abs(energy(stepped) - energy(start)) / Math.abs(energy(start)) < 1e-9, 'energy drifted');
});

test('rails handle escape trajectories', () => {
  const start = { x: R_EARTH + 300000, y: 0, vx: 0, vy: 12000 };
  const later = keplerStep(start, 3600);
  assert.ok(Math.abs(energy(later) - energy(start)) / energy(start) < 1e-9);
  assert.ok(Math.hypot(later.x, later.y) > 2e7);
  assert.equal(orbitOf(start).bound, false);
});

test('orbit elements match the orbit they came from', () => {
  const rp = R_EARTH + 200000, ra = R_EARTH + 800000;
  const a = (rp + ra) / 2;
  const state = { x: rp, y: 0, vx: 0, vy: Math.sqrt(MU * (2 / rp - 1 / a)) };
  const orbit = orbitOf(state);
  assert.ok(Math.abs(orbit.periapsis - rp) < 1e-3);
  assert.ok(Math.abs(orbit.apoapsis - ra) < 1e-2);
  assert.ok(Math.abs(orbit.period - 2 * Math.PI * Math.sqrt(a ** 3 / MU)) < 1e-6);
  // A quarter of the way round, apoapsis is still ahead and periapsis behind.
  const quarter = orbitOf(keplerStep(state, orbit.period / 4));
  assert.ok(Math.abs(quarter.toAp - orbit.period / 4) < 1e-3);
  assert.ok(Math.abs(quarter.toPe - orbit.period * 3 / 4) < 1e-3);
});

test('the rocket equation and stage figures are consistent', () => {
  assert.ok(Math.abs(deltaV(300, Math.E * 1000, 1000) - 300 * G0) < 1e-9);
  const info = analyze(KESTREL);
  const [first, second] = info.stages;
  assert.equal(info.liftoffMass, first.m0);
  assert.ok(Math.abs(first.mf - (second.m0 + first.dry)) < 1e-9);
  assert.ok(Math.abs(second.dvVac - deltaV(second.engine.ispVac, second.m0, second.mf)) < 1e-9);
  assert.ok(first.twr > 1.2 && info.totalDv > 9500);
});

test('a rocket too heavy for its engines stays on the pad', () => {
  const flight = new Flight({ payload: { ...SATELLITE, mass: 12000 }, stages: [{ engine: 'spark', count: 1, prop: 20000 }] });
  assert.equal(flight.info.canLiftOff, false);
  flight.activateStage();
  for (let i = 0; i < 100; i += 1) flight.advance(0.1);
  assert.ok(flight.altitude < 0.02);
  assert.ok(Math.abs(Math.hypot(flight.vx, flight.vy) - OMEGA * R_EARTH) < 1e-6);
});

for (const contract of CONTRACTS) {
  test(`contract ${contract.id}: the cheapest rocket that fits delivers it by following the guidance`, () => {
    const rocket = FLEET.find((item) => rocketFits(item, contract));
    assert.ok(rocket, 'no rocket fits');
    const flight = new Flight(designFor(rocket, contract.payload));
    const result = flyContract(flight, new Guidance(contract.target));
    const verdict = judge(contract, flight.deployed);
    assert.equal(flight.over, false);
    assert.equal(verdict.grade, 'delivered', `ap ${result.tel.apoapsis} pe ${result.tel.periapsis}`);
    assert.ok(verdict.accuracy > 0.5, `accuracy ${verdict.accuracy}`);
    assert.ok(result.peakStress < 5000 && result.peakHeat < 0.5);
  });
}

test('each rocket has work and every contract is offered a rocket', () => {
  for (const rocket of FLEET) {
    assert.ok(CONTRACTS.some((contract) => FLEET.find((item) => rocketFits(item, contract)) === rocket), `${rocket.id} is never the cheapest fit`);
  }
});

test('a delivery is paid by how close the orbit is', () => {
  const contract = CONTRACTS.find((item) => item.id === 'ocean');
  const orbit = (apoapsis, periapsis) => ({ altitude: periapsis, apoapsis, periapsis, bound: true });
  const exact = judge(contract, orbit(400e3, 400e3));
  assert.equal(exact.grade, 'delivered');
  assert.equal(exact.pay + exact.bonus, contract.fee * 1.2);
  assert.equal(judge(contract, orbit(425e3, 395e3)).bonus < exact.bonus, true);
  assert.equal(judge(contract, orbit(470e3, 400e3)).pay, contract.fee * 0.5);
  assert.equal(judge(contract, orbit(900e3, 400e3)).pay, contract.fee * 0.2);
  assert.equal(judge(contract, orbit(400e3, 90e3)).pay, 0);
  assert.equal(judge(contract, null).grade, 'lost');
});

test('releasing the payload lightens the rocket and records the orbit', () => {
  const flight = new Flight(KESTREL);
  assert.equal(flight.deployPayload(), false);
  flight.activateStage();
  flight.advance(1);
  const before = flight.mass;
  assert.equal(flight.deployPayload(), true);
  assert.equal(before - flight.mass, SATELLITE.mass);
  assert.equal(flight.throttle, 0);
  assert.ok(flight.deployed.altitude >= 0 && flight.deployed.periapsis < 0);
  assert.equal(flight.deployPayload(), false);
});

test('fast time warp is refused under thrust and stops at the atmosphere', () => {
  const flight = new Flight(KESTREL);
  flight.activateStage();
  flight.advance(1);
  flight.setWarp(WARPS.length - 1);
  assert.equal(flight.warp, 4);
  // A coasting craft whose orbit dips into the air.
  const rp = R_EARTH + 60000, ra = R_EARTH + 500000, a = (rp + ra) / 2;
  Object.assign(flight, { x: -ra, y: 0, vx: 0, vy: -Math.sqrt(MU * (2 / ra - 1 / a)), throttle: 0 });
  flight.setWarp(WARPS.length - 1);
  assert.equal(flight.warp, 1000);
  for (let i = 0; i < 400 && flight.warp > 4; i += 1) flight.advance(1 / 60);
  assert.equal(flight.warp, 1);
  assert.ok(Math.abs(flight.altitude - ATMO_TOP) < 50, `stopped at ${flight.altitude}`);
});

test('flying sideways through thick air breaks the rocket up', () => {
  const flight = new Flight(KESTREL);
  flight.activateStage();
  while (flight.altitude < 6000) flight.advance(0.1);
  flight.heading = flight.angle + Math.PI / 2;
  for (let i = 0; i < 100 && !flight.over; i += 1) { flight.heading = flight.angle + Math.PI / 2; flight.advance(0.1); }
  assert.equal(flight.phase, 'breakup');
});

test('coming back from orbit without a heat shield burns up', () => {
  const flight = new Flight(KESTREL);
  flight.activateStage();
  flight.advance(1);
  const rp = R_EARTH + 40000, ra = R_EARTH + 200000, a = (rp + ra) / 2;
  Object.assign(flight, { x: -ra, y: 0, vx: 0, vy: -Math.sqrt(MU * (2 / ra - 1 / a)), throttle: 0, hold: 'retrograde' });
  for (let i = 0; i < 60000 && !flight.over; i += 1) flight.advance(0.1);
  assert.equal(flight.phase, 'burnup');
});
