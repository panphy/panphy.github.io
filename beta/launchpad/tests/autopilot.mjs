// A simple ascent autopilot, used by the tests to prove each mission's default rocket can do it.
import { R_EARTH, ATMO_TOP, G0, circularSpeed } from '../physics.js';

const DEG = Math.PI / 180;

// Flies to a parking orbit: pitch program to raise apoapsis, coast, burn at apoapsis.
export function flyToOrbit(flight, { apoapsis, periapsis, log = false }) {
  const dt = 0.05;
  flight.activateStage();
  let phase = 'ascent';
  const maxTime = 6000;
  let peakStress = 0, peakHeat = 0;
  while (flight.t < maxTime && !flight.over) {
    const tel = flight.telemetry();
    peakStress = Math.max(peakStress, flight.stress);
    peakHeat = Math.max(peakHeat, flight.heat);
    if (flight.prop[flight.stage] <= 0 && flight.stage < flight.info.stages.length - 1) flight.activateStage();
    if (phase === 'ascent') {
      // Ease off as apoapsis nears its target, so a powerful stage does not overshoot.
      flight.throttle = Math.max(0.05, Math.min(1, (apoapsis - tel.apoapsis) / 4e4));
      if (tel.altitude < 1000) flight.heading = flight.angle;
      else if (tel.altitude < 12000) {
        // Pitch over gently, then let the airflow line the rocket up.
        const pitch = 90 - 12 * Math.min(1, (tel.altitude - 1000) / 5000);
        const programmed = flight.angle + (90 - pitch) * DEG;
        flight.heading = Math.max(programmed, flight.progradeAngle());
      } else if (tel.altitude < 40000) flight.heading = flight.progradeAngle();
      else {
        // Keep apoapsis a steady time ahead while building sideways speed.
        const pitch = Math.max(0, Math.min(40, 8 + (50 - tel.toAp) * 0.8));
        flight.heading = flight.angle + (90 - pitch) * DEG;
      }
      if (tel.apoapsis >= apoapsis) { flight.throttle = 0; phase = 'coast'; }
    } else if (phase === 'coast') {
      flight.throttle = 0;
      flight.heading = flight.progradeAngle();
      const stage = flight.stageInfo;
      const need = circularSpeed(R_EARTH + tel.apoapsis) - Math.sqrt(Math.max(0, 2 * (tel.orbit.energy + 3.986004418e14 / (R_EARTH + tel.apoapsis))));
      const ve = stage.engine.ispVac * G0;
      const burn = flight.mass * (1 - Math.exp(-need / ve)) / stage.massFlow;
      if (tel.altitude > ATMO_TOP && tel.toAp <= burn * 0.5) phase = 'insert';
      if (tel.verticalSpeed < 0 && tel.altitude < apoapsis * 0.98) phase = 'insert';
    } else if (phase === 'insert') {
      flight.throttle = Math.max(0.03, Math.min(1, (periapsis - tel.periapsis) / 4e5));
      // Hold the horizon, nudging up or down to stay near apoapsis altitude.
      const bias = Math.max(-8, Math.min(8, -tel.verticalSpeed * 0.12));
      flight.heading = flight.angle + (90 - bias) * DEG;
      if (tel.periapsis >= periapsis) { flight.throttle = 0; phase = 'done'; break; }
      if (flight.prop[flight.stage] <= 0 && flight.stage === flight.info.stages.length - 1) break;
    }
    // Step with the craft's own attitude control switched off.
    flight.hold = 'off'; flight.pitchInput = 0; flight.turn = 0;
    flight.advance(dt);
    if (log && Math.round(flight.t * 20) % 400 === 0) {
      console.log(`${phase} t=${flight.t.toFixed(0)} h=${(tel.altitude / 1000).toFixed(1)} v=${tel.orbitalSpeed.toFixed(0)} ap=${(tel.apoapsis / 1000).toFixed(0)} pe=${(tel.periapsis / 1000).toFixed(0)} stage=${flight.stage} dv=${tel.dv.toFixed(0)}`);
    }
  }
  return { phase, peakStress, peakHeat, tel: flight.telemetry() };
}
