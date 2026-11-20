// Missions, in the order they unlock. Pure data and checks, no DOM.
import { ATMO_TOP } from './physics.js';

const km = (value) => value * 1000;

export const MISSIONS = [
  {
    id: 'space',
    title: 'Touch space',
    goal: 'Climb above 100 km.',
    brief: 'Space starts 100 km up. Going straight up is enough to get there, but not to stay.',
    payload: 'probe',
    design: { payload: 'probe', stages: [{ engine: 'spark', count: 1, prop: 1000 }] },
    done: (flight) => flight.reachedSpace
  },
  {
    id: 'orbit',
    title: 'Reach orbit',
    goal: 'Raise your periapsis above 150 km.',
    brief: 'Staying up means going sideways at nearly 8 km/s. Tilt east as you climb, coast to the top of your arc, then burn along your path.',
    payload: 'satellite',
    design: {
      payload: 'satellite',
      stages: [{ engine: 'torch', count: 1, prop: 45000 }, { engine: 'wisp', count: 9, prop: 12000 }]
    },
    done: (flight, tel) => tel.orbit.bound && tel.periapsis >= km(150) && tel.altitude > ATMO_TOP
  },
  {
    id: 'circular',
    title: 'Circularize',
    goal: 'Hold a circular orbit at 400 km: apoapsis and periapsis both between 380 and 420 km.',
    brief: 'A burn at one side of an orbit changes the height of the other side. Burn at apoapsis to lift periapsis, and at periapsis to move apoapsis.',
    payload: 'observatory',
    target: km(400),
    tolerance: km(20),
    design: {
      payload: 'observatory',
      stages: [{ engine: 'torch', count: 3, prop: 130000 }, { engine: 'halo', count: 1, prop: 30000 }]
    },
    done: (flight, tel) => tel.orbit.bound && tel.periapsis >= km(380) && tel.apoapsis <= km(420)
  }
];

export const SANDBOX = {
  id: 'sandbox',
  title: 'Free flight',
  goal: 'Build anything and fly it anywhere.',
  brief: '',
  payload: null,
  design: {
    payload: 'satellite',
    stages: [{ engine: 'torch', count: 1, prop: 45000 }, { engine: 'wisp', count: 9, prop: 12000 }]
  },
  done: () => false
};
