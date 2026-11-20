// Engines, the fleet of ready-made rockets and their analysis. Pure functions, SI units, no DOM.
import { G0, deltaV } from './physics.js';

// thrust is the vacuum thrust in newtons; isp in seconds at sea level and in vacuum.
export const ENGINES = {
  spark: { name: 'Spark', role: 'Small booster', thrust: 30e3, ispSL: 270, ispVac: 305, mass: 40, bell: 0.28, vacuum: false },
  wisp: { name: 'Wisp', role: 'Small vacuum engine', thrust: 28e3, ispSL: 100, ispVac: 343, mass: 45, bell: 0.5, vacuum: true },
  torch: { name: 'Torch', role: 'Booster', thrust: 900e3, ispSL: 283, ispVac: 312, mass: 480, bell: 0.95, vacuum: false },
  halo: { name: 'Halo', role: 'Vacuum engine', thrust: 950e3, ispSL: 110, ispVac: 348, mass: 550, bell: 2.2, vacuum: true },
  colossus: { name: 'Colossus', role: 'Heavy booster', thrust: 2300e3, ispSL: 327, ispVac: 350, mass: 1700, bell: 1.3, vacuum: false }
};

// Ready-made rockets, smallest first. cost is the price of one launch and price the
// one-time license, both in millions of dollars. Stages are listed from the ground up.
export const FLEET = [
  { id: 'wren', name: 'Wren', role: 'Sounding rocket', cost: 0.4, price: 0,
    stages: [{ engine: 'spark', count: 1, prop: 1000 }] },
  { id: 'kestrel', name: 'Kestrel', role: 'Small launcher', cost: 6, price: 0,
    stages: [{ engine: 'torch', count: 1, prop: 45000 }, { engine: 'wisp', count: 9, prop: 12000 }] },
  { id: 'osprey', name: 'Osprey', role: 'Medium launcher', cost: 18, price: 30,
    stages: [{ engine: 'torch', count: 3, prop: 130000 }, { engine: 'halo', count: 1, prop: 30000 }] },
  { id: 'condor', name: 'Condor', role: 'Heavy launcher', cost: 45, price: 100,
    stages: [{ engine: 'torch', count: 9, prop: 400000 }, { engine: 'halo', count: 1, prop: 95000 }] },
  { id: 'albatross', name: 'Albatross', role: 'Super heavy, three stages', cost: 90, price: 200,
    stages: [{ engine: 'colossus', count: 5, prop: 620000 }, { engine: 'halo', count: 2, prop: 140000 }, { engine: 'wisp', count: 3, prop: 12000 }] }
];

// A rocket of the fleet carrying a payload {name, mass, diameter, length}.
export function designFor(rocket, payload) {
  return { payload, stages: rocket.stages };
}

export const PROPELLANT_DENSITY = 1000;   // kg/m^3, bulk
const STRUCTURE_FRACTION = 0.065;
const STRUCTURE_FIXED = 50;               // kg of avionics and interstage per stage

export function stageDryMass(stage) {
  return STRUCTURE_FRACTION * stage.prop + STRUCTURE_FIXED + ENGINES[stage.engine].mass * stage.count;
}

function tankSize(prop) {
  const volume = prop / PROPELLANT_DENSITY;
  const diameter = Math.min(7, Math.max(0.8, Math.round(Math.cbrt(4 * volume / (5 * Math.PI)) * 10) / 10));
  return { diameter, length: volume / (Math.PI * diameter * diameter / 4) };
}

// Engines of one stage arranged to fit under it: returns the radius of the ring they sit on.
export function engineRing(count) {
  if (count === 1) return { center: 1, ring: 0 };
  if (count <= 6) return { center: 0, ring: count };
  return { center: 1, ring: count - 1 };
}

// Stages are listed from the ground up: design.stages[0] fires first.
export function analyze(design) {
  const payload = design.payload;
  const stages = [];
  let massAbove = payload.mass;
  for (let i = design.stages.length - 1; i >= 0; i -= 1) {
    const stage = design.stages[i];
    const engine = ENGINES[stage.engine];
    const dry = stageDryMass(stage);
    const wet = dry + stage.prop;
    const m0 = wet + massAbove;
    const mf = dry + massAbove;
    const thrustVac = engine.thrust * stage.count;
    const thrustSL = thrustVac * engine.ispSL / engine.ispVac;
    const massFlow = thrustVac / (G0 * engine.ispVac);
    const first = i === 0;
    const size = tankSize(stage.prop);
    stages[i] = {
      index: i, engine, count: stage.count, prop: stage.prop, dry, wet, m0, mf,
      thrustVac, thrustSL, massFlow,
      dv: deltaV(first ? (engine.ispSL + 2 * engine.ispVac) / 3 : engine.ispVac, m0, mf),
      dvVac: deltaV(engine.ispVac, m0, mf),
      twr: (first ? thrustSL : thrustVac) / (m0 * G0),
      burnTime: stage.prop / massFlow,
      diameter: size.diameter, length: size.length
    };
    massAbove = m0;
  }
  // A stage is never drawn wider than the one below it.
  for (let i = 1; i < stages.length; i += 1) {
    if (stages[i].diameter > stages[i - 1].diameter) {
      stages[i].diameter = stages[i - 1].diameter;
      stages[i].length = stages[i].prop / PROPELLANT_DENSITY / (Math.PI * stages[i].diameter ** 2 / 4);
    }
  }
  const maxDiameter = Math.max(payload.diameter, ...stages.map((stage) => stage.diameter));
  return {
    payload, stages,
    liftoffMass: massAbove,
    totalDv: stages.reduce((sum, stage) => sum + stage.dv, 0),
    maxDiameter,
    canLiftOff: stages.length > 0 && stages[0].twr > 1
  };
}
