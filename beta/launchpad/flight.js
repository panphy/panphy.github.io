// One flight from the pad: staging, attitude, warp, failures. No DOM, so tests can fly it.
import {
  MU, R_EARTH, OMEGA, G0, ATMO_TOP, SPACE_EDGE, SOUND_SPEED,
  airDensity, pressureRatio, rk4Step, keplerStep, orbitOf, deltaV
} from './physics.js';
import { analyze } from './rocket.js';

export const WARPS = [1, 2, 4, 10, 50, 100, 1000];
export const MAX_PHYSICS_WARP = 4;
const STEP = 0.02;                       // s, fixed physics step
const TURN_RATE = 14 * Math.PI / 180;    // rad/s under manual control
const HOLD_RATE = 20 * Math.PI / 180;    // rad/s when holding a direction
const BREAKUP_STRESS = 9000;             // Pa: dynamic pressure x sine of the angle of attack
const CRASH_SPEED = 12;                  // m/s relative to the ground
const HEAT_SCALE = 250e3;                // W/m^2 of stagnation heating that destroys the craft
const SURFACE_FRAME_TOP = 45000;         // m: below this, prograde means along the airflow

const wrapAngle = (angle) => Math.atan2(Math.sin(angle), Math.cos(angle));

export class Flight {
  constructor(design) {
    this.design = design;
    this.info = analyze(design);
    this.t = 0;
    this.x = R_EARTH;
    this.y = 0;
    this.vx = 0;
    this.vy = OMEGA * R_EARTH;
    this.heading = 0;                  // inertial direction of the nose, rad
    this.turn = 0;                     // smoothed manual turn input
    this.throttle = 1;
    this.pitchInput = 0;               // +1 tilts east
    this.hold = 'off';                 // 'off' | 'prograde' | 'retrograde'
    this.stage = 0;
    this.prop = this.info.stages.map((stage) => stage.prop);
    this.phase = 'pad';                // 'pad' | 'flying' | 'landed' | 'crashed' | 'breakup' | 'burnup'
    this.warpIndex = 0;
    this.accumulator = 0;
    this.liftoffTime = null;
    this.maxAltitude = 0;
    this.reachedSpace = false;
    this.heat = 0;
    this.stress = 0;
    this.thrust = 0;
    this.gForce = 1;
    this.debris = [];
    this.events = [];
    this.updateMass();
  }

  get altitude() { return Math.hypot(this.x, this.y) - R_EARTH; }
  get angle() { return Math.atan2(this.y, this.x); }
  get warp() { return WARPS[this.warpIndex]; }
  get over() { return this.phase === 'crashed' || this.phase === 'breakup' || this.phase === 'burnup'; }
  get stageInfo() { return this.info.stages[this.stage]; }

  updateMass() {
    let mass = this.info.payload.mass;
    let diameter = this.info.payload.diameter;
    for (let i = this.stage; i < this.info.stages.length; i += 1) {
      mass += this.info.stages[i].dry + this.prop[i];
      diameter = Math.max(diameter, this.info.stages[i].diameter);
    }
    this.mass = mass;
    this.area = Math.PI * diameter * diameter / 4;
  }

  emit(type, data = {}) { this.events.push({ type, t: this.t, ...data }); }

  // Space bar: lift off, then drop the spent stage and light the next.
  activateStage() {
    if (this.over) return;
    if (this.phase === 'pad') {
      this.phase = 'flying';
      this.liftoffTime = this.t;
      if (this.throttle === 0) this.throttle = 1;
      this.emit('liftoff');
      return;
    }
    if (this.stage >= this.info.stages.length - 1) return;
    const dropped = this.info.stages[this.stage];
    // The spent stage is pushed back a little so it falls clear.
    const push = 2;
    this.debris.push({
      stage: this.stage, x: this.x, y: this.y,
      vx: this.vx - push * Math.cos(this.heading), vy: this.vy - push * Math.sin(this.heading),
      mass: dropped.dry + this.prop[this.stage], area: Math.PI * dropped.diameter ** 2 / 4 * 3,
      heading: this.heading, spin: (Math.random() - 0.5) * 0.5, age: 0
    });
    this.stage += 1;
    this.updateMass();
    this.emit('stage', { dropped: this.stage - 1 });
  }

  setWarp(index) {
    const clamped = Math.max(0, Math.min(WARPS.length - 1, index));
    if (WARPS[clamped] > MAX_PHYSICS_WARP && !this.canRailsWarp()) {
      this.warpIndex = Math.min(clamped, WARPS.indexOf(MAX_PHYSICS_WARP));
      this.emit('warp-limited');
      return;
    }
    this.warpIndex = clamped;
  }

  thrusting() {
    return this.phase === 'flying' && this.throttle > 0 && this.prop[this.stage] > 0;
  }

  canRailsWarp() {
    return this.phase === 'flying' && !this.thrusting() && this.altitude > ATMO_TOP;
  }

  // Direction of travel: through the air low down, along the orbit higher up.
  progradeAngle() {
    let vx = this.vx, vy = this.vy;
    if (this.altitude < SURFACE_FRAME_TOP) { vx += OMEGA * this.y; vy -= OMEGA * this.x; }
    if (Math.hypot(vx, vy) < 1) return this.angle;
    return Math.atan2(vy, vx);
  }

  holdTarget() {
    if (this.hold === 'prograde') return this.progradeAngle();
    if (this.hold === 'retrograde') return this.progradeAngle() + Math.PI;
    return null;
  }

  // Advance by a frame of real time, at the current warp.
  advance(realDt) {
    if (this.over) return;
    if (this.warp > MAX_PHYSICS_WARP) {
      if (this.canRailsWarp()) { this.coast(realDt * this.warp); return; }
      this.warpIndex = 0;
      this.emit('warp-stop');
    }
    this.accumulator += Math.min(realDt, 0.1) * this.warp;
    while (this.accumulator >= STEP && !this.over) {
      this.physicsStep(STEP);
      this.accumulator -= STEP;
    }
  }

  // Coast on rails, stopping at the top of the atmosphere.
  coast(dt) {
    const orbit = orbitOf(this);
    const dips = orbit.periapsis < R_EARTH + ATMO_TOP;
    let next = keplerStep(this, dt);
    let stopped = false;
    if (dips && (Math.hypot(next.x, next.y) < R_EARTH + ATMO_TOP || orbit.toPe < dt)) {
      let low = 0, high = Math.min(dt, orbit.toPe);
      for (let i = 0; i < 40; i += 1) {
        const mid = (low + high) / 2;
        const trial = keplerStep(this, mid);
        if (Math.hypot(trial.x, trial.y) > R_EARTH + ATMO_TOP) low = mid; else high = mid;
      }
      dt = low;
      next = keplerStep(this, dt);
      stopped = true;
    }
    Object.assign(this, next);
    this.t += dt;
    const target = this.holdTarget();
    // A free craft keeps its attitude in space; a held one follows the orbit round.
    this.heading = wrapAngle(target === null ? this.heading : target);
    this.thrust = 0;
    this.gForce = 0;
    this.stress = 0;
    this.heat = Math.max(0, this.heat - dt * 0.5);
    this.maxAltitude = Math.max(this.maxAltitude, this.altitude);
    this.debris.length = 0;
    if (stopped) { this.warpIndex = 0; this.emit('warp-stop', { reason: 'atmosphere' }); }
  }

  steer(dt) {
    const target = this.holdTarget();
    if (target !== null && this.pitchInput === 0) {
      const error = wrapAngle(target - this.heading);
      this.heading = wrapAngle(this.heading + Math.sign(error) * Math.min(Math.abs(error), HOLD_RATE * dt));
      this.turn = 0;
      return;
    }
    if (this.pitchInput !== 0 && this.hold !== 'off') { this.hold = 'off'; this.emit('hold-off'); }
    this.turn += (this.pitchInput - this.turn) * Math.min(1, dt * 8);
    this.heading = wrapAngle(this.heading + this.turn * TURN_RATE * dt);
  }

  physicsStep(dt) {
    if (this.phase === 'pad' || this.phase === 'landed') {
      // Carried round with the ground.
      const angle = this.angle + OMEGA * dt;
      this.x = R_EARTH * Math.cos(angle);
      this.y = R_EARTH * Math.sin(angle);
      this.vx = -OMEGA * this.y;
      this.vy = OMEGA * this.x;
      if (this.phase === 'pad') this.heading = angle;
      this.t += dt;
      this.thrust = 0;
      this.gForce = 1;
      return;
    }
    this.steer(dt);
    const altitude = this.altitude;
    const stage = this.stageInfo;
    let thrust = 0, massFlow = 0;
    if (this.thrusting()) {
      const ratio = pressureRatio(altitude);
      const isp = stage.engine.ispVac - (stage.engine.ispVac - stage.engine.ispSL) * ratio;
      massFlow = Math.min(stage.massFlow * this.throttle, this.prop[this.stage] / dt);
      thrust = massFlow * G0 * isp;
    }
    this.thrust = thrust;
    const tx = thrust * Math.cos(this.heading), ty = thrust * Math.sin(this.heading);

    // Standing on the pad until thrust beats weight.
    const r = Math.hypot(this.x, this.y);
    const onGround = altitude <= 0.01;
    const radialThrust = (tx * this.x + ty * this.y) / r;
    if (onGround && radialThrust <= this.mass * MU / (r * r)) {
      this.prop[this.stage] -= massFlow * dt;
      this.updateMass();
      const angle = this.angle + OMEGA * dt;
      this.x = R_EARTH * Math.cos(angle);
      this.y = R_EARTH * Math.sin(angle);
      this.vx = -OMEGA * this.y;
      this.vy = OMEGA * this.x;
      this.t += dt;
      this.gForce = 1;
      this.checkBurnout(massFlow);
      return;
    }

    const vxBefore = this.vx, vyBefore = this.vy;
    rk4Step(this, dt, tx, ty, massFlow, this.area);
    this.prop[this.stage] = Math.max(0, this.prop[this.stage] - massFlow * dt);
    this.updateMass();
    this.t += dt;
    this.checkBurnout(massFlow);

    // What the crew would feel: acceleration without gravity's share.
    const gx = -MU * this.x / r ** 3, gy = -MU * this.y / r ** 3;
    this.gForce = Math.hypot((this.vx - vxBefore) / dt - gx, (this.vy - vyBefore) / dt - gy) / G0;

    const newAltitude = this.altitude;
    this.maxAltitude = Math.max(this.maxAltitude, newAltitude);
    if (!this.reachedSpace && newAltitude >= SPACE_EDGE) { this.reachedSpace = true; this.emit('space'); }

    // Air loads and heating.
    const rvx = this.vx + OMEGA * this.y, rvy = this.vy - OMEGA * this.x;
    const airspeed = Math.hypot(rvx, rvy);
    const rho = airDensity(newAltitude);
    const q = 0.5 * rho * airspeed * airspeed;
    let attack = 0;
    if (airspeed > 30) attack = Math.abs(wrapAngle(this.heading - Math.atan2(rvy, rvx)));
    this.stress = q * Math.sin(Math.min(attack, Math.PI / 2));
    const heating = 1.74e-4 * Math.sqrt(rho) * airspeed ** 3;
    this.heat = Math.max(0, this.heat + 0.5 * (heating / HEAT_SCALE - this.heat) * dt);
    if (this.stress > BREAKUP_STRESS) { this.fail('breakup'); return; }
    if (this.heat >= 1) { this.fail('burnup'); return; }

    if (newAltitude <= 0 && this.t - this.liftoffTime > 1) {
      if (airspeed > CRASH_SPEED) { this.fail('crashed'); return; }
      this.phase = 'landed';
      this.emit('landed');
    }
    this.stepDebris(dt);
  }

  checkBurnout(massFlow) {
    if (massFlow > 0 && this.prop[this.stage] <= 1e-6) {
      this.prop[this.stage] = 0;
      this.emit('burnout', { stage: this.stage, last: this.stage === this.info.stages.length - 1 });
    }
  }

  fail(phase) {
    this.phase = phase;
    this.thrust = 0;
    this.warpIndex = 0;
    this.emit(phase);
  }

  stepDebris(dt) {
    for (let i = this.debris.length - 1; i >= 0; i -= 1) {
      const piece = this.debris[i];
      rk4Step(piece, dt, 0, 0, 0, piece.area);
      piece.heading += piece.spin * dt;
      piece.age += dt;
      if (piece.age > 240 || Math.hypot(piece.x, piece.y) < R_EARTH) this.debris.splice(i, 1);
    }
  }

  // Everything the display needs, computed on demand.
  telemetry() {
    const r = Math.hypot(this.x, this.y);
    const rvx = this.vx + OMEGA * this.y, rvy = this.vy - OMEGA * this.x;
    const orbit = orbitOf(this);
    const rho = airDensity(r - R_EARTH);
    const surfaceSpeed = Math.hypot(rvx, rvy);
    let dv = 0, massAbove = this.info.payload.mass;
    for (let i = this.info.stages.length - 1; i >= this.stage; i -= 1) {
      const stage = this.info.stages[i];
      const wet = massAbove + stage.dry + this.prop[i];
      dv += deltaV(stage.engine.ispVac, wet, massAbove + stage.dry);
      massAbove = wet;
    }
    return {
      altitude: r - R_EARTH,
      orbitalSpeed: Math.hypot(this.vx, this.vy),
      surfaceSpeed,
      verticalSpeed: (this.vx * this.x + this.vy * this.y) / r,
      apoapsis: orbit.apoapsis - R_EARTH,
      periapsis: orbit.periapsis - R_EARTH,
      toAp: orbit.toAp, toPe: orbit.toPe,
      orbit,
      q: 0.5 * rho * surfaceSpeed * surfaceSpeed,
      mach: surfaceSpeed / SOUND_SPEED,
      density: rho,
      twr: this.thrust / (this.mass * MU / (r * r)),
      dv,
      // Angle of the nose above the local horizon, positive toward the east.
      pitch: Math.PI / 2 - wrapAngle(this.heading - this.angle),
      propFraction: this.stageInfo.prop > 0 ? this.prop[this.stage] / this.stageInfo.prop : 0
    };
  }
}
