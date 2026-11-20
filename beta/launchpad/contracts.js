// Launch contracts and how a delivery is judged. Pure data and functions, no DOM.
// Money is in millions of dollars; altitudes are meters above the surface.
import { MU, R_EARTH, ATMO_TOP, SPACE_EDGE } from './physics.js';
import { analyze, designFor } from './rocket.js';

const km = (value) => value * 1000;
export const GEO = km(35786);

// rank is the number of different contracts delivered before this one is offered.
export const CONTRACTS = [
  {
    id: 'aurora', rank: 0, customer: 'Polar Sky Institute', fee: 1.5,
    payload: { name: 'Aurora instruments', mass: 200, diameter: 0.9, length: 1.6 },
    target: { kind: 'space' }
  },
  {
    id: 'cubesats', rank: 1, customer: 'Tern Imaging', fee: 12,
    payload: { name: 'Imaging cubesats', mass: 600, diameter: 1.5, length: 2.2 },
    target: { ap: km(250), pe: km(250), apTol: km(80), peTol: km(80) }
  },
  {
    id: 'ocean', rank: 2, customer: 'Blue Current Lab', fee: 15,
    payload: { name: 'Ocean color satellite', mass: 800, diameter: 1.6, length: 2.6 },
    target: { ap: km(400), pe: km(400), apTol: km(30), peTol: km(30) }
  },
  {
    id: 'broadband', rank: 3, customer: 'Meshline', fee: 40,
    payload: { name: 'Broadband satellites', mass: 3500, diameter: 2.8, length: 4.5 },
    target: { ap: km(550), pe: km(550), apTol: km(25), peTol: km(25) }
  },
  {
    id: 'weather', rank: 4, customer: 'National Weather Office', fee: 44,
    payload: { name: 'Weather satellite', mass: 2500, diameter: 2.6, length: 4.2 },
    target: { ap: km(800), pe: km(800), apTol: km(20), peTol: km(20) }
  },
  {
    id: 'cargo', rank: 5, customer: 'Orbital Works', fee: 48,
    payload: { name: 'Station cargo', mass: 4000, diameter: 2.8, length: 5 },
    target: { ap: km(400), pe: km(400), apTol: km(10), peTol: km(10) }
  },
  {
    id: 'module', rank: 6, customer: 'Orbital Works', fee: 100,
    payload: { name: 'Station module', mass: 12000, diameter: 4.2, length: 8 },
    target: { ap: km(420), pe: km(420), apTol: km(15), peTol: km(15) }
  },
  {
    id: 'comsat', rank: 7, customer: 'Pacific Relay', fee: 115,
    payload: { name: 'Communications satellite', mass: 3000, diameter: 3.6, length: 6 },
    target: { ap: GEO, pe: km(250), apTol: km(600), peTol: km(80) }
  },
  {
    id: 'navigation', rank: 8, customer: 'Waypoint Navigation', fee: 135,
    payload: { name: 'Navigation satellite', mass: 1500, diameter: 2.6, length: 4 },
    target: { ap: km(20200), pe: km(20200), apTol: km(150), peTol: km(150) }
  },
  {
    id: 'geostationary', rank: 9, customer: 'Pacific Relay', fee: 240,
    payload: { name: 'Broadcast satellite', mass: 3000, diameter: 3.2, length: 5 },
    target: { ap: GEO, pe: GEO, apTol: km(100), peTol: km(100) }
  }
];

const speedAt = (r, other) => Math.sqrt(MU * (2 / r - 2 / (r + other)));

// Roughly what a rocket must be able to change its speed by to reach a target, in m/s:
// a low parking orbit with its losses to gravity and air, then a transfer.
export function dvRequired(target) {
  if (target.kind === 'space') return 2000;
  const park = R_EARTH + km(200), ap = R_EARTH + target.ap, pe = R_EARTH + Math.max(target.pe, km(200));
  return 9500 + (speedAt(park, ap) - speedAt(park, park)) + (speedAt(ap, pe) - speedAt(ap, park));
}

export function rocketFits(rocket, contract) {
  const info = analyze(designFor(rocket, contract.payload));
  return info.canLiftOff && info.totalDv >= dvRequired(contract.target);
}

// How a release is paid. released is flight.deployed, or null when the rocket was lost.
export function judge(contract, released) {
  const target = contract.target;
  const result = { grade: 'lost', accuracy: 0, pay: 0, bonus: 0 };
  if (!released) return result;
  if (target.kind === 'space') {
    if (released.altitude >= SPACE_EDGE) Object.assign(result, { grade: 'delivered', accuracy: 1, pay: contract.fee });
    return result;
  }
  if (!released.bound || released.periapsis < ATMO_TOP) return result;
  const error = orbitError(target, released);
  result.accuracy = Math.max(0, 1 - error);
  if (error <= 1) {
    result.grade = 'delivered';
    result.pay = contract.fee;
    result.bonus = Math.round(contract.fee * 0.2 * (1 - error) * 10) / 10;
  } else if (error <= 3) {
    result.grade = 'off';
    result.pay = contract.fee * 0.5;
  } else {
    result.grade = 'stranded';
    result.pay = contract.fee * 0.2;
  }
  return result;
}

// Miss distance as a fraction of the tolerance: 1 is the edge of the target.
export function orbitError(target, orbit) {
  return Math.max(Math.abs(orbit.apoapsis - target.ap) / target.apTol, Math.abs(orbit.periapsis - target.pe) / target.peTol);
}
