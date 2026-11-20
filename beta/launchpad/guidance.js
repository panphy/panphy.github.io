// Flight guidance: where to point and when to burn to reach a contract's orbit.
// It only advises; the display shows its marker and the test pilot follows it.
import { MU, R_EARTH, G0, SPACE_EDGE } from './physics.js';
import { orbitError } from './contracts.js';

const DEG = Math.PI / 180;
const clamp = (value, low, high) => Math.min(high, Math.max(low, value));
const DIRECT_LIMIT = 1000e3;     // up to here, climb straight to the target's height
const EASE_TIME = 8;             // s: how long before the end of a burn the throttle starts to come down
// Speed at radius r on an orbit whose other end is at radius `other`.
const speedAt = (r, other) => Math.sqrt(MU * (2 / r - 2 / (r + other)));

export class Guidance {
  constructor(target) {
    this.target = target;
    this.step = 'ascent';         // 'ascent' | 'coast' | 'insert' | 'transfer' | 'deliver'
    this.leg = 0;                 // 0: reaching the first orbit, 1: after the transfer burn
    if (target.kind === 'space') return;
    this.direct = target.ap <= DIRECT_LIMIT;
    // Higher targets start from a low parking orbit.
    this.firstAp = this.direct ? target.ap : clamp(target.pe, 200e3, 250e3);
    this.firstPe = this.direct ? target.pe : this.firstAp;
    this.circularize = !this.direct && target.pe - this.firstAp > target.peTol;
  }

  // Returns { heading, throttle, cue, burnIn, ready }: heading is an inertial angle,
  // burnIn the seconds until the next burn should start, ready true when the payload can go.
  update(flight, tel) {
    const target = this.target;
    const up = flight.angle;
    const out = { heading: null, throttle: 0, cue: '', burnIn: null, ready: false };
    if (flight.deployed) return out;
    if (flight.phase === 'pad') return { ...out, heading: up, throttle: 1, cue: 'Press Space to launch' };
    if (target.kind === 'space') {
      out.heading = up;
      out.throttle = 1;
      out.ready = tel.altitude >= SPACE_EDGE;
      out.cue = out.ready ? 'In space: deploy the payload' : 'Fly straight up to 100 km';
      return out;
    }
    const r = R_EARTH + tel.altitude;
    const stage = flight.prop[flight.stage] > 0 ? flight.stageInfo : flight.info.stages[flight.stage + 1] || flight.stageInfo;
    const accel = stage.thrustVac / flight.mass;
    const kmText = (meters) => `${Math.round(meters / 1000).toLocaleString('en-US')} km`;

    if (this.step === 'ascent') {
      // Ease off as apoapsis nears its goal: close to orbital speed it climbs very fast.
      if (this.last && flight.t > this.last.t && flight.thrust > 0 && Number.isFinite(tel.apoapsis)) {
        this.apRate = (tel.apoapsis - this.last.ap) / (flight.t - this.last.t) / Math.max(0.05, flight.throttle);
      }
      this.last = { t: flight.t, ap: tel.apoapsis };
      const lead = (this.firstAp - tel.apoapsis) / Math.max(1, this.apRate || 0);   // seconds away at full throttle
      out.throttle = clamp(Math.min(lead / EASE_TIME, (this.firstAp - tel.apoapsis) / 4e4), 0.05, 1);
      if (tel.altitude < 1000) out.heading = up;
      else if (tel.altitude < 12000) {
        // Tilt over gently, then let the airflow line the rocket up.
        const pitch = 90 - 12 * Math.min(1, (tel.altitude - 1000) / 5000);
        out.heading = Math.max(up + (90 - pitch) * DEG, flight.progradeAngle());
      } else if (tel.altitude < 40000) out.heading = flight.progradeAngle();
      else {
        // Keep apoapsis a steady time ahead while building sideways speed.
        const pitch = clamp(8 + (50 - tel.toAp) * 0.8, 0, 40);
        out.heading = up + (90 - pitch) * DEG;
      }
      out.cue = out.throttle < 1
        ? `Ease the throttle, and cut the engines when apoapsis reaches ${kmText(this.firstAp)}`
        : `Follow the marker until apoapsis reaches ${kmText(this.firstAp)}`;
      if (tel.apoapsis >= this.firstAp) this.step = 'coast';
      else return out;
    }

    if (this.step === 'coast') {
      const goalPe = this.leg === 0 ? this.firstPe : target.pe;
      const rAp = R_EARTH + tel.apoapsis;
      const need = speedAt(rAp, Math.min(R_EARTH + goalPe, rAp)) - Math.sqrt(Math.max(0, 2 * (tel.orbit.energy + MU / rAp)));
      const burn = flight.mass * (1 - Math.exp(-need / (stage.engine.ispVac * G0))) / stage.massFlow;
      out.heading = flight.progradeAngle();
      out.burnIn = Math.max(0, tel.toAp - burn / 2);
      out.cue = flight.thrusting() ? 'Cut the engines' : `Coast to apoapsis. Next burn in ${clock(out.burnIn)}`;
      const passed = tel.verticalSpeed < 0 && tel.altitude < tel.apoapsis * 0.98;
      if ((tel.altitude > SPACE_EDGE && tel.toAp <= burn / 2) || passed) this.step = 'insert';
      else return out;
    }

    if (this.step === 'insert') {
      const goalPe = this.leg === 0 ? this.firstPe : target.pe;
      const sideways = (flight.x * flight.vy - flight.y * flight.vx) / r;
      const need = speedAt(r, Math.min(R_EARTH + goalPe, r)) - sideways;
      out.throttle = clamp(need / (accel * EASE_TIME), 0.03, 1);
      // Hold the horizon, nudging up or down to stay at this height.
      out.heading = up + (90 - clamp(-tel.verticalSpeed * 0.12, -8, 8)) * DEG;
      out.cue = `${out.throttle < 1 ? 'Ease the throttle, and cut the engines when' : 'Burn along the marker until'} periapsis reaches ${kmText(Math.min(goalPe, tel.apoapsis))}`;
      if (need <= 0) this.step = this.direct || this.leg === 1 ? 'deliver' : 'transfer';
      else return out;
    }

    if (this.step === 'transfer') {
      const need = speedAt(r, R_EARTH + target.ap) - tel.orbitalSpeed;
      out.throttle = clamp(need / (accel * EASE_TIME), 0.03, 1);
      out.heading = flight.progradeAngle();
      out.cue = `${out.throttle < 1 ? 'Ease the throttle, and cut the engines when' : 'Burn along the marker until'} apoapsis reaches ${kmText(target.ap)}`;
      if (tel.apoapsis >= target.ap - 0.05 * target.apTol) {
        this.leg = 1;
        this.step = this.circularize ? 'coast' : 'deliver';
        out.throttle = 0;
        out.cue = 'Cut the engines';
      }
      return out;
    }

    // Delivery: on target, or a hint about what to fix.
    out.throttle = 0;
    out.heading = flight.progradeAngle();
    if (orbitError(target, tel) <= 1) {
      out.ready = true;
      out.cue = flight.thrusting() ? 'Cut the engines' : 'On target: deploy the payload';
      return out;
    }
    const apMiss = (tel.apoapsis - target.ap) / target.apTol, peMiss = (tel.periapsis - target.pe) / target.peTol;
    if (Math.abs(apMiss) >= Math.abs(peMiss)) {
      out.cue = `Apoapsis is too ${apMiss > 0 ? 'high' : 'low'}: burn ${apMiss > 0 ? 'retrograde' : 'prograde'} at periapsis`;
    } else out.cue = `Periapsis is too ${peMiss > 0 ? 'high' : 'low'}: burn ${peMiss > 0 ? 'retrograde' : 'prograde'} at apoapsis`;
    return out;
  }
}

function clock(seconds) {
  const s = Math.max(0, Math.floor(seconds));
  const pad = (value) => String(value).padStart(2, '0');
  return s >= 3600 ? `${Math.floor(s / 3600)}:${pad(Math.floor(s / 60) % 60)}:${pad(s % 60)}` : `${pad(Math.floor(s / 60))}:${pad(s % 60)}`;
}
