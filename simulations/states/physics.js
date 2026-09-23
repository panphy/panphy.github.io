// States of Matter physics engine.
//
// 256 Lennard-Jones particles in a container with a fixed square floor and a
// movable piston lid. A constant outside pressure pushes the lid down, so the
// sample is held at constant pressure: the lid rests on a solid or liquid, and
// rises when the liquid boils and the vapour needs room. Weak gravity keeps
// the condensed sample on the floor. Everything is in reduced LJ units
// (sigma = epsilon = mass = 1); the page converts temperature to kelvin with a
// single proportional factor.
//
// The module has no DOM or three.js dependencies so it can be run in Node.

export const N_CELLS = 4;
export const N = N_CELLS * N_CELLS * N_CELLS * 4;

export const LJ_CUTOFF = 2.5;
const LJ_SHIFT = 4 * (Math.pow(LJ_CUTOFF, -12) - Math.pow(LJ_CUTOFF, -6));
const MIN_R2 = 0.36;
const LATTICE_CONST = Math.sqrt(2) * Math.pow(2, 1 / 6);

export const BOX_WIDTH = 18;
export const HALF_WIDTH = BOX_WIDTH / 2;
export const LID_MIN = 2;
export const LID_MAX = 30;
export const WALL_CONTACT = 0.5;
const WALL_K = 800;
export const OUTSIDE_PRESSURE = 0.03;
const LID_AREA = BOX_WIDTH * BOX_WIDTH;
const LID_MASS = 2;
const LID_DAMPING = 1.5;
export const GRAVITY = 0.02;

export const T_MIN = 0.02;
export const T_MAX = 2.0;
const THERMOSTAT_TAU = 0.25;
const SPEED_LIMIT = 10;

export const BOND_CUTOFF = 1.35;
const CRYSTAL_COORDINATION = 11;
const ISOLATED_COORDINATION = 1;
// Mobility: how far each particle has moved over the last few time units.
// Particles in a solid only vibrate; in a liquid or gas they wander off.
const SNAPSHOT_INTERVAL = 0.5;
const SNAPSHOT_COUNT = 9; // window = 8 intervals = 4 time units
const MOBILE_DISPLACEMENT_SQ = 0.7 * 0.7;

// Horizontal centre-of-mass drift and spin about the vertical axis are removed.
const DOF = 3 * N - 3;

export function createSim() {
  const sim = {
    pos: new Float64Array(N * 3),
    vel: new Float64Array(N * 3),
    force: new Float64Array(N * 3),
    lid: 0,
    lidVel: 0,
    lidForce: 0,
    time: 0,
    targetT: T_MIN,
    kinetic: 0,
    potential: 0,
    coordination: new Uint8Array(N),
    snapshots: [],
    snapshotTimer: 0,
    // cell list scratch
    cellHead: new Int32Array(1),
    cellNext: new Int32Array(N),
    cellDims: [1, 1, 1]
  };
  for (let i = 0; i < SNAPSHOT_COUNT; i++) sim.snapshots.push(new Float64Array(N * 3));
  resetSim(sim);
  return sim;
}

export function resetSim(sim, temperature = T_MIN) {
  const a = LATTICE_CONST;
  const span = N_CELLS * a;
  const originX = -span / 2 + a / 4;
  const originZ = -span / 2 + a / 4;
  const originY = WALL_CONTACT + 0.12;
  const basis = [[0, 0, 0], [0.5, 0.5, 0], [0.5, 0, 0.5], [0, 0.5, 0.5]];
  let index = 0;
  for (let x = 0; x < N_CELLS; x++) {
    for (let y = 0; y < N_CELLS; y++) {
      for (let z = 0; z < N_CELLS; z++) {
        for (const b of basis) {
          sim.pos[index * 3] = originX + (x + b[0]) * a;
          sim.pos[index * 3 + 1] = originY + (y + b[1]) * a;
          sim.pos[index * 3 + 2] = originZ + (z + b[2]) * a;
          sim.vel[index * 3] = gaussian();
          sim.vel[index * 3 + 1] = gaussian();
          sim.vel[index * 3 + 2] = gaussian();
          index++;
        }
      }
    }
  }
  let top = 0;
  for (let i = 0; i < N; i++) top = Math.max(top, sim.pos[i * 3 + 1]);
  sim.lid = top + WALL_CONTACT + 0.05;
  sim.lidVel = 0;
  sim.time = 0;
  sim.targetT = temperature;
  removeBulkMotion(sim);
  scaleToTemperature(sim, temperature);
  computeForces(sim);
  sim.kinetic = kineticEnergy(sim);
  sim.coordination.fill(12);
  for (const snapshot of sim.snapshots) snapshot.set(sim.pos);
  sim.snapshotTimer = 0;
}

function gaussian() {
  const u = 1 - Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * Math.random());
}

export function kineticEnergy(sim) {
  let ke = 0;
  const v = sim.vel;
  for (let i = 0; i < N * 3; i++) ke += v[i] * v[i];
  return 0.5 * ke;
}

export function temperatureOf(sim) {
  return (2 * sim.kinetic) / DOF;
}

function scaleToTemperature(sim, temperature) {
  const ke = kineticEnergy(sim);
  if (ke <= 1e-12) return;
  const scale = Math.sqrt((DOF * temperature) / (2 * ke));
  for (let i = 0; i < N * 3; i++) sim.vel[i] *= scale;
}

// The thermostat rescales every velocity, which slowly pumps energy into any
// whole-sample sliding or spinning. Removing horizontal drift and spin about
// the vertical axis keeps the crystal from skating or turning on the floor.
function removeBulkMotion(sim) {
  const pos = sim.pos;
  const vel = sim.vel;
  let vx = 0;
  let vz = 0;
  let cx = 0;
  let cz = 0;
  for (let i = 0; i < N; i++) {
    vx += vel[i * 3];
    vz += vel[i * 3 + 2];
    cx += pos[i * 3];
    cz += pos[i * 3 + 2];
  }
  vx /= N;
  vz /= N;
  cx /= N;
  cz /= N;
  let angular = 0;
  let inertia = 0;
  for (let i = 0; i < N; i++) {
    const b = i * 3;
    vel[b] -= vx;
    vel[b + 2] -= vz;
    const rx = pos[b] - cx;
    const rz = pos[b + 2] - cz;
    angular += rz * vel[b] - rx * vel[b + 2];
    inertia += rx * rx + rz * rz;
  }
  if (inertia < 1e-9) return;
  const omega = angular / inertia;
  for (let i = 0; i < N; i++) {
    const b = i * 3;
    vel[b] -= omega * (pos[b + 2] - cz);
    vel[b + 2] += omega * (pos[b] - cx);
  }
}

function buildCellList(sim, cutoff) {
  const nx = Math.max(1, Math.floor(BOX_WIDTH / cutoff));
  const ny = Math.max(1, Math.floor(sim.lid / cutoff));
  const sx = BOX_WIDTH / nx;
  const sy = sim.lid / ny;
  const total = nx * ny * nx;
  if (sim.cellHead.length < total) sim.cellHead = new Int32Array(total);
  const head = sim.cellHead;
  const next = sim.cellNext;
  for (let c = 0; c < total; c++) head[c] = -1;
  const pos = sim.pos;
  for (let i = 0; i < N; i++) {
    const ix = Math.min(nx - 1, Math.max(0, Math.floor((pos[i * 3] + HALF_WIDTH) / sx)));
    const iy = Math.min(ny - 1, Math.max(0, Math.floor(pos[i * 3 + 1] / sy)));
    const iz = Math.min(nx - 1, Math.max(0, Math.floor((pos[i * 3 + 2] + HALF_WIDTH) / sx)));
    const c = ix + nx * (iy + ny * iz);
    next[i] = head[c];
    head[c] = i;
  }
  sim.cellDims[0] = nx;
  sim.cellDims[1] = ny;
  sim.cellDims[2] = nx;
}

// Calls visit(i, j, dx, dy, dz, r2) once for every pair closer than cutoff.
function forEachPair(sim, cutoff, visit) {
  buildCellList(sim, cutoff);
  const [nx, ny, nz] = sim.cellDims;
  const head = sim.cellHead;
  const next = sim.cellNext;
  const pos = sim.pos;
  const cutSq = cutoff * cutoff;
  for (let cz = 0; cz < nz; cz++) {
    for (let cy = 0; cy < ny; cy++) {
      for (let cx = 0; cx < nx; cx++) {
        const ci = cx + nx * (cy + ny * cz);
        for (let dz = -1; dz <= 1; dz++) {
          const z = cz + dz;
          if (z < 0 || z >= nz) continue;
          for (let dy = -1; dy <= 1; dy++) {
            const y = cy + dy;
            if (y < 0 || y >= ny) continue;
            for (let dx = -1; dx <= 1; dx++) {
              const x = cx + dx;
              if (x < 0 || x >= nx) continue;
              const cj = x + nx * (y + ny * z);
              if (cj < ci) continue;
              const same = ci === cj;
              for (let i = head[ci]; i !== -1; i = next[i]) {
                const px = pos[i * 3];
                const py = pos[i * 3 + 1];
                const pz = pos[i * 3 + 2];
                for (let j = same ? next[i] : head[cj]; j !== -1; j = next[j]) {
                  const ddx = pos[j * 3] - px;
                  const ddy = pos[j * 3 + 1] - py;
                  const ddz = pos[j * 3 + 2] - pz;
                  const r2 = ddx * ddx + ddy * ddy + ddz * ddz;
                  if (r2 < cutSq) visit(i, j, ddx, ddy, ddz, r2);
                }
              }
            }
          }
        }
      }
    }
  }
}

function computeForces(sim) {
  const force = sim.force;
  const pos = sim.pos;
  force.fill(0);
  let potential = 0;

  forEachPair(sim, LJ_CUTOFF, (i, j, dx, dy, dz, r2) => {
    if (r2 < MIN_R2) r2 = MIN_R2;
    const inv2 = 1 / r2;
    const inv6 = inv2 * inv2 * inv2;
    const inv12 = inv6 * inv6;
    potential += 4 * (inv12 - inv6) - LJ_SHIFT;
    const fOverR = 24 * inv2 * (2 * inv12 - inv6);
    const fx = fOverR * dx;
    const fy = fOverR * dy;
    const fz = fOverR * dz;
    force[j * 3] += fx;
    force[j * 3 + 1] += fy;
    force[j * 3 + 2] += fz;
    force[i * 3] -= fx;
    force[i * 3 + 1] -= fy;
    force[i * 3 + 2] -= fz;
  });

  // Gravity, soft side walls and floor, and the piston lid.
  const wallLo = -HALF_WIDTH + WALL_CONTACT;
  const wallHi = HALF_WIDTH - WALL_CONTACT;
  const lidContact = sim.lid - WALL_CONTACT;
  let lidPush = 0;
  for (let i = 0; i < N; i++) {
    const b = i * 3;
    force[b + 1] -= GRAVITY;
    const x = pos[b];
    const y = pos[b + 1];
    const z = pos[b + 2];
    if (x < wallLo) force[b] += WALL_K * (wallLo - x);
    else if (x > wallHi) force[b] -= WALL_K * (x - wallHi);
    if (z < wallLo) force[b + 2] += WALL_K * (wallLo - z);
    else if (z > wallHi) force[b + 2] -= WALL_K * (z - wallHi);
    if (y < WALL_CONTACT) force[b + 1] += WALL_K * (WALL_CONTACT - y);
    if (y > lidContact) {
      const push = WALL_K * (y - lidContact);
      force[b + 1] -= push;
      lidPush += push;
    }
  }

  sim.potential = potential;
  sim.lidForce = lidPush - OUTSIDE_PRESSURE * LID_AREA - LID_DAMPING * sim.lidVel;
}

function clampLid(sim) {
  if (sim.lid > LID_MAX) {
    sim.lid = LID_MAX;
    if (sim.lidVel > 0) sim.lidVel = 0;
  } else if (sim.lid < LID_MIN) {
    sim.lid = LID_MIN;
    if (sim.lidVel < 0) sim.lidVel = 0;
  }
}

// Advance the simulation by one small time step (velocity Verlet).
export function stepSim(sim, dt) {
  const pos = sim.pos;
  const vel = sim.vel;
  const force = sim.force;
  const halfDt = 0.5 * dt;

  for (let i = 0; i < N * 3; i++) {
    vel[i] += force[i] * halfDt;
    pos[i] += vel[i] * dt;
  }
  sim.lidVel += (sim.lidForce / LID_MASS) * halfDt;
  sim.lid += sim.lidVel * dt;
  clampLid(sim);

  computeForces(sim);

  for (let i = 0; i < N * 3; i++) vel[i] += force[i] * halfDt;
  sim.lidVel += (sim.lidForce / LID_MASS) * halfDt;
  clampLid(sim);

  capSpeeds(sim);
  removeBulkMotion(sim);

  // Weak Berendsen thermostat towards the target temperature.
  const before = kineticEnergy(sim);
  const current = (2 * before) / DOF;
  const coupling = Math.min(1, dt / THERMOSTAT_TAU);
  const after = before * Math.max(0.05, 1 + coupling * (sim.targetT / Math.max(current, 1e-9) - 1));
  if (before > 1e-12 && after !== before) {
    const scale = Math.sqrt(after / before);
    for (let i = 0; i < N * 3; i++) vel[i] *= scale;
  }
  sim.kinetic = after;
  sim.time += dt;

  sim.snapshotTimer += dt;
  if (sim.snapshotTimer >= SNAPSHOT_INTERVAL) {
    sim.snapshotTimer -= SNAPSHOT_INTERVAL;
    const oldest = sim.snapshots.shift();
    oldest.set(pos);
    sim.snapshots.push(oldest);
  }
}

function capSpeeds(sim) {
  const vel = sim.vel;
  const limitSq = SPEED_LIMIT * SPEED_LIMIT;
  for (let i = 0; i < N; i++) {
    const b = i * 3;
    const s2 = vel[b] * vel[b] + vel[b + 1] * vel[b + 1] + vel[b + 2] * vel[b + 2];
    if (s2 > limitSq) {
      const s = SPEED_LIMIT / Math.sqrt(s2);
      vel[b] *= s;
      vel[b + 1] *= s;
      vel[b + 2] *= s;
    }
  }
}

// Count close neighbours for every particle. Optionally
// writes bond line segments (pairs of endpoints) into bondBuffer and returns
// how many bonds were written.
export function analyseStructure(sim, bondBuffer) {
  const coordination = sim.coordination;
  const pos = sim.pos;
  coordination.fill(0);
  const maxBonds = bondBuffer ? Math.floor(bondBuffer.length / 6) : 0;
  let bonds = 0;
  forEachPair(sim, BOND_CUTOFF, (i, j) => {
    if (coordination[i] < 255) coordination[i]++;
    if (coordination[j] < 255) coordination[j]++;
    if (bonds < maxBonds) {
      const o = bonds * 6;
      bondBuffer[o] = pos[i * 3];
      bondBuffer[o + 1] = pos[i * 3 + 1];
      bondBuffer[o + 2] = pos[i * 3 + 2];
      bondBuffer[o + 3] = pos[j * 3];
      bondBuffer[o + 4] = pos[j * 3 + 1];
      bondBuffer[o + 5] = pos[j * 3 + 2];
      bonds++;
    }
  });

  // A particle deep inside a crystal has 12 touching neighbours; in a liquid
  // the count drops to about 7-9 and a gas particle has at most one.
  let crystalLike = 0;
  let isolated = 0;
  let condensed = 0;
  let mobileCondensed = 0;
  const reference = sim.snapshots[0];
  for (let i = 0; i < N; i++) {
    if (coordination[i] >= CRYSTAL_COORDINATION) crystalLike++;
    else if (coordination[i] <= ISOLATED_COORDINATION) {
      isolated++;
      continue;
    }
    const b = i * 3;
    const dx = pos[b] - reference[b];
    const dy = pos[b + 1] - reference[b + 1];
    const dz = pos[b + 2] - reference[b + 2];
    condensed++;
    if (dx * dx + dy * dy + dz * dz > MOBILE_DISPLACEMENT_SQ) mobileCondensed++;
  }

  return {
    bonds,
    crystalFraction: crystalLike / N,
    isolatedFraction: isolated / N,
    // Share of the non-gas particles that have wandered from their place.
    mobileFraction: condensed > 0 ? mobileCondensed / condensed : 1
  };
}

export function volumeOf(sim) {
  return LID_AREA * sim.lid;
}

// True when the potential energy is as low as a well-ordered crystal at this
// temperature. A quickly frozen (amorphous) solid sits about 0.4 epsilon per
// particle higher, so this separates a regrown crystal from a glass.
export function isWellOrdered(sim, temperature, margin = 0.25) {
  return sim.potential / N <= -5.53 + 1.4 * temperature + margin;
}
