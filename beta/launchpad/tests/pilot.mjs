// A test pilot that does what the guidance says, to prove a rocket can fly a contract.
export function flyContract(flight, guidance, { log = false } = {}) {
  flight.activateStage();
  let peakStress = 0, peakHeat = 0, steps = 0;
  while (flight.t < 3e5 && !flight.over && steps < 4e6) {
    steps += 1;
    const tel = flight.telemetry();
    const advice = guidance.update(flight, tel);
    peakStress = Math.max(peakStress, flight.stress);
    peakHeat = Math.max(peakHeat, flight.heat);
    if (advice.ready && !flight.thrusting()) { flight.deployPayload(); break; }
    if (flight.prop[flight.stage] <= 0 && flight.stage < flight.info.stages.length - 1) flight.activateStage();
    flight.hold = 'guide';
    flight.guideAngle = advice.heading;
    flight.throttle = advice.throttle;
    if (log && steps % 400 === 0) {
      console.log(`${guidance.step} t=${flight.t.toFixed(0)} h=${(tel.altitude / 1000).toFixed(1)} v=${tel.orbitalSpeed.toFixed(0)} ap=${(tel.apoapsis / 1000).toFixed(0)} pe=${(tel.periapsis / 1000).toFixed(0)} stage=${flight.stage} dv=${tel.dv.toFixed(0)} thr=${advice.throttle.toFixed(2)}`);
    }
    // Long coasts go on rails, as a player would use time warp.
    if (advice.burnIn > 60 && flight.canRailsWarp()) flight.coast(Math.min(advice.burnIn - 30, 2000));
    else flight.advance(0.05);
    if (flight.prop[flight.stage] <= 0 && flight.stage === flight.info.stages.length - 1 && ['insert', 'transfer', 'deliver'].includes(guidance.step)) break;
  }
  return { peakStress, peakHeat, tel: flight.telemetry() };
}
