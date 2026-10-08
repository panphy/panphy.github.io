// Stellar evolution model for the star life cycle sim.
// Pure functions only: no DOM, no Three.js. Units are solar (M☉, R☉, L☉), kelvin and years.
// Main-sequence values come from standard mass–luminosity and mass–radius power laws,
// timescales from free-fall, Kelvin–Helmholtz and nuclear estimates. Tracks after the main
// sequence are schematic keyframes with the right shape and realistic end points.

export const SUN_T = 5772;
export const SUN_RADIUS_KM = 695700;
export const AU_IN_RSUN = 215.032;
export const MASS_MIN = 0.1;
export const MASS_MAX = 100;
// Approximate boundaries: real ones are blurred by composition, rotation and companions.
export const HELIUM_IGNITION_MASS = 0.5;
export const WHITE_DWARF_MAX_MASS = 8;
export const NEUTRON_STAR_MAX_MASS = 20;
export const CHANDRASEKHAR_MASS = 1.44;

const G = 6.674e-11;
const SOLAR_MASS_KG = 1.989e30;
const YEAR_S = 3.156e7;
const DAY_S = 86400;
const PROTON_MASS_KG = 1.673e-27;

const clamp = (x, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, x));
const lerp = (a, b, t) => a + (b - a) * t;
const logLerp = (a, b, t) => Math.exp(lerp(Math.log(a), Math.log(b), t));

export const radiusFrom = (L, T) => Math.sqrt(L) / (T / SUN_T) ** 2;
export const luminosityFrom = (R, T) => R * R * (T / SUN_T) ** 4;
export const temperatureFrom = (L, R) => SUN_T * (L / (R * R)) ** 0.25;

export function mainSequence(M) {
  let L;
  if (M < 0.43) L = 0.23 * M ** 2.3;
  else if (M < 2) L = M ** 4;
  else if (M < 20) L = 1.4 * M ** 3.5;
  else L = 1.4 * 20 ** 3.5 * (M / 20) ** 2.2;
  const R = M < 1 ? M ** 0.8 : M ** 0.57;
  // Fully convective red dwarfs and massive stars with big convective cores burn more of their hydrogen.
  const mixing = M < 0.5 ? 1 + 7 * clamp((0.5 - M) / 0.4) : M > 10 ? 1 + 3.3 * Math.log10(M / 10) : 1;
  return {
    L,
    R,
    T: temperatureFrom(L, R),
    years: 1e10 * (M / L) * mixing,
    coreT: 1.57e7 * M ** (M < 1 ? 0.43 : 0.3)
  };
}

// Tanner Helland's fit to the blackbody locus, returned as linear-ish 0–1 sRGB.
export function blackbodyRGB(kelvin) {
  const t = clamp(kelvin, 1000, 40000) / 100;
  let r, g, b;
  if (t <= 66) {
    r = 255;
    g = 99.4708025861 * Math.log(t) - 161.1195681661;
    b = t <= 19 ? 0 : 138.5177312231 * Math.log(t - 10) - 305.0447927307;
  } else {
    r = 329.698727446 * (t - 60) ** -0.1332047592;
    g = 288.1221695283 * (t - 60) ** -0.0755148492;
    b = 255;
  }
  return [clamp(r / 255), clamp(g / 255), clamp(b / 255)];
}

export function fateOf(M) {
  if (M < WHITE_DWARF_MAX_MASS) return 'whiteDwarf';
  return M < NEUTRON_STAR_MAX_MASS ? 'neutronStar' : 'blackHole';
}

export function remnantMass(M) {
  const fate = fateOf(M);
  // Initial–final mass relation (Kalirai et al. 2008); the lightest stars keep nearly all their mass.
  if (fate === 'whiteDwarf') return Math.min(0.96 * M, 0.109 * M + 0.394);
  if (fate === 'neutronStar') return 1.2 + 0.05 * (M - WHITE_DWARF_MAX_MASS);
  return 5 + 0.3 * (M - NEUTRON_STAR_MAX_MASS);
}

export const whiteDwarfRadius = mass => 0.0126 * (mass / 0.6) ** (-1 / 3);
export const NEUTRON_STAR_RADIUS_KM = 11.5;
export const schwarzschildKm = mass => 2.953 * mass;

function resolveKey(key) {
  let { T, L, R } = key;
  if (T === undefined) T = temperatureFrom(L, R);
  if (L === undefined) L = luminosityFrom(R, T);
  if (R === undefined) R = radiusFrom(L, T);
  return { T, L, R };
}

function interpolateKeys(keys, p) {
  const x = clamp(p) * (keys.length - 1);
  const i = Math.min(keys.length - 2, Math.floor(x));
  const t = x - i;
  const T = logLerp(keys[i].T, keys[i + 1].T, t);
  const L = logLerp(keys[i].L, keys[i + 1].L, t);
  return { T, L, R: radiusFrom(L, T) };
}

// The four last fuels of a massive star's core. Durations are for a star of about 20 M☉.
export const LATE_FUELS = [
  { fuel: 'Carbon', makes: 'neon and magnesium', coreT: 8e8, years: 1000, lasts: 'about 1000 years' },
  { fuel: 'Neon', makes: 'oxygen and magnesium', coreT: 1.6e9, years: 1, lasts: 'about 1 year' },
  { fuel: 'Oxygen', makes: 'silicon and sulfur', coreT: 2e9, years: 0.5, lasts: 'about 6 months' },
  { fuel: 'Silicon', makes: 'iron and nickel', coreT: 3.3e9, years: 1 / 365, lasts: 'about 1 day' }
];

// Supernova stage: fraction of the stage spent on each act.
export const SN_COLLAPSE_END = 0.18;
export const SN_BREAKOUT = 0.32;

function supernovaSeconds(p) {
  if (p < SN_COLLAPSE_END) return 0.25 * (p / SN_COLLAPSE_END);
  if (p < SN_BREAKOUT) return logLerp(0.25, DAY_S, (p - SN_COLLAPSE_END) / (SN_BREAKOUT - SN_COLLAPSE_END));
  return logLerp(DAY_S, YEAR_S, (p - SN_BREAKOUT) / (1 - SN_BREAKOUT));
}

export function buildLife(M) {
  const ms = mainSequence(M);
  const fate = fateOf(M);
  const remnant = remnantMass(M);
  const stages = [];
  const add = stage => {
    (stage.phases || [stage]).forEach(part => { if (part.keys) part.keys = part.keys.map(resolveKey); });
    if (stage.phases) {
      // The stage's years and mass span its phases. Each phase remembers the years that came before it.
      stage.years = 0;
      stage.phases.forEach(phase => { phase.before = stage.years; stage.years += phase.years; });
      stage.mass = [stage.phases[0].mass[0], stage.phases[stage.phases.length - 1].mass[1]];
    }
    stages.push(stage);
    return stage;
  };
  const lastKey = () => {
    const stage = stages[stages.length - 1];
    const k = (stage.phases ? stage.phases[stage.phases.length - 1] : stage).keys;
    return k[k.length - 1];
  };

  // A dense molecular cloud core: 10⁴ hydrogen molecules per cm³ at 10 K.
  const cloudDensity = 1e10 * 2.33 * PROTON_MASS_KG;
  const freeFallYears = Math.sqrt(3 * Math.PI / (32 * G * cloudDensity)) / YEAR_S;
  const cloudRadius = Math.cbrt(3 * M * SOLAR_MASS_KG / (4 * Math.PI * cloudDensity)) / (SUN_RADIUS_KM * 1000);
  add({
    id: 'cloud', type: 'cloud', years: freeFallYears, mass: [M, M], coreT: [10, 2000],
    radius: p => logLerp(cloudRadius, 100 * AU_IN_RSUN, p * p), surfaceT: () => 10
  });

  // Pre-main sequence: down the Hayashi track (cool, shrinking), then left along the Henyey track.
  const hayashiT = clamp(3300 + 700 * Math.log10(M / 0.1), 3000, 4600);
  const kelvinHelmholtzYears = 3e7 * M * M / (ms.R * ms.L);
  const zams = { L: 0.78 * ms.L, R: 0.9 * ms.R };
  let protoKeys;
  if (M < 0.5) protoKeys = [{ L: 40 * ms.L, T: 0.97 * ms.T }, { L: 5 * ms.L, T: 0.98 * ms.T }, zams];
  else if (M < 3) protoKeys = [{ L: 12 * ms.L ** 0.6, T: hayashiT }, { L: 0.55 * ms.L, T: hayashiT * 1.04 }, zams];
  // Massive protostars are still gathering gas when they ignite, so they never get very cool or very large.
  else protoKeys = [{ R: 4 * ms.R, T: Math.max(hayashiT, 0.35 * ms.T) }, { R: 2 * ms.R, T: 0.65 * ms.T }, zams];
  add({ id: 'proto', type: 'proto', years: kelvinHelmholtzYears, keys: protoKeys, mass: [M, M], coreT: [1e5, ms.coreT] });

  const massive = fate !== 'whiteDwarf';
  // Hot massive stars lose mass in fast winds throughout their lives.
  const preSupernovaMass = M * (1 - 0.5 * clamp((M - 10) / 50));
  const msEndMass = massive ? lerp(M, preSupernovaMass, 0.4) : M;
  add({
    id: 'ms', type: 'star', years: ms.years, mass: [M, msEndMass], coreT: [ms.coreT, 1.25 * ms.coreT],
    keys: [zams, { L: ms.L, R: ms.R }, { L: 1.7 * ms.L, R: 1.45 * ms.R }]
  });

  if (!massive) {
    const whiteDwarfR = whiteDwarfRadius(remnant);
    const lost = M - remnant;
    if (M < 0.25) {
      // Fully convective: the whole star becomes helium, so it never swells. It just gets hotter.
      add({
        id: 'blue', type: 'star', years: 0.1 * ms.years, mass: [M, remnant], coreT: [1.25 * ms.coreT, 2 * ms.coreT],
        keys: [lastKey(), { L: 8 * ms.L, T: 1.6 * ms.T }, { L: 3 * ms.L, T: 2.2 * ms.T }]
      });
    } else {
      const heliumIgnites = M >= HELIUM_IGNITION_MASS;
      const tipL = heliumIgnites ? Math.max(2500, 4 * ms.L) : 800;
      const tipT = clamp(3400 + 100 * M, 3400, 4200);
      const giantFraction = M <= 1.5 ? 0.13 : 0.13 * (1.5 / M) ** 1.2;
      // One red giant stage, as at GCSE and A level. Astronomers split it into three phases: the red giant
      // branch (hydrogen shell only), core helium fusion (the star shrinks for a while) and the asymptotic
      // giant branch (two shells). Each phase takes a fixed share of the stage so that the short ones can be seen.
      const tip = { L: tipL, T: tipT };
      const phases = [{
        id: 'rgb', share: 1, years: giantFraction * ms.years, mass: [M, M - 0.2 * lost],
        // Below 0.5 M☉ the core never gets hot enough to fuse helium.
        coreT: [1.3 * ms.coreT, heliumIgnites ? 1e8 : 6e7],
        keys: [lastKey(), { L: 2.6 * ms.L, T: 5000 }, { L: Math.sqrt(2.6 * ms.L * tipL), T: 4400 }, tip]
      }];
      let agbL;
      if (heliumIgnites) {
        const heL = Math.max(45, 1.6 * ms.L);
        const heT = M < 2 ? 4800 : Math.min(6800, 5000 + 300 * (M - 2));
        const heYears = Math.min(1.2e8, 0.15 * ms.years);
        const heEnd = { L: 1.5 * heL, T: 0.96 * heT };
        agbL = 3000 * M ** 1.2;
        phases[0].share = 0.45;
        phases.push({
          id: 'he', share: 0.3, years: heYears, mass: [M - 0.2 * lost, M - 0.25 * lost], coreT: [1e8, 2e8],
          // The star shrinks back from the tip of the red giant branch, then settles.
          keys: [tip, { L: heL, T: heT }, { L: 1.25 * heL, T: 0.98 * heT }, heEnd]
        }, {
          id: 'agb', share: 0.25, years: 0.15 * heYears, mass: [M - 0.25 * lost, remnant + 0.15 * lost], coreT: [2e8, 3e8],
          keys: [heEnd, { L: 0.3 * agbL, T: 3600 }, { L: agbL, T: 3000 }]
        });
      }
      add({ id: 'rgb', type: 'star', phases });
      if (heliumIgnites) {
        add({
          id: 'pn', type: 'star', years: 2e4, mass: [remnant + 0.15 * lost, remnant], coreT: [3e8, 1.5e8],
          keys: [lastKey(), { L: 0.8 * agbL, T: 8000 }, { L: 0.6 * agbL, T: 45000 }, { L: 0.3 * agbL, T: 120000 }, { T: 110000, R: 1.3 * whiteDwarfR }]
        });
      }
    }
    // A blue dwarf has no envelope to throw off, so it becomes a white dwarf at the brightness it already has.
    const startT = M < 0.25 ? temperatureFrom(lastKey().L, whiteDwarfR) : M < HELIUM_IGNITION_MASS ? 40000 : 100000;
    const startCoreT = M < 0.25 ? 2 * ms.coreT : 8e7;
    const cooling = [25000, 10000, 5500, 3500].filter(T => T < 0.8 * startT);
    const whiteDwarf = add({
      id: 'wd', type: 'star', years: 1.5e10, mass: [remnant, remnant],
      keys: [startT, ...cooling].map(T => ({ T, R: whiteDwarfR }))
    });
    // Mestel cooling: the surface luminosity falls as the interior temperature to the power 3.5.
    whiteDwarf.coreT = p => startCoreT * (interpolateKeys(whiteDwarf.keys, p).L / whiteDwarf.keys[0].L) ** (2 / 7);
  } else {
    // Stars above about 35 M☉ blow off their envelopes and stay blue (luminous blue variable, then Wolf–Rayet).
    const staysBlue = M > 35;
    const supergiantKeys = staysBlue
      ? [lastKey(), { L: 1.9 * ms.L, T: 9000 }, { L: 1.4 * ms.L, T: 30000 }, { L: 1.2 * ms.L, T: 60000 }]
      : [lastKey(), { L: 1.85 * ms.L, T: 10000 }, { L: 2 * ms.L, T: 3600 }];
    add({
      id: 'sg', type: 'star', years: 0.1 * ms.years, staysBlue, mass: [msEndMass, lerp(M, preSupernovaMass, 0.95)],
      coreT: [1.5e8, 3e8], keys: supergiantKeys
    });
    const end = lastKey();
    const lateYears = LATE_FUELS.reduce((sum, f) => sum + f.years, 0);
    add({
      id: 'late', type: 'star', years: lateYears, staysBlue, keys: [end, end], mass: [lerp(M, preSupernovaMass, 0.95), preSupernovaMass],
      coreT: p => LATE_FUELS[Math.min(3, Math.floor(p * 4))].coreT,
      elapsed: p => {
        const i = Math.min(3, Math.floor(p * 4));
        let years = 0;
        for (let k = 0; k < i; k += 1) years += LATE_FUELS[k].years;
        return years + LATE_FUELS[i].years * (p * 4 - i);
      }
    });
    add({
      id: 'sn', type: 'sn', years: 1, staysBlue, pre: end, mass: [preSupernovaMass, remnant],
      seconds: supernovaSeconds,
      coreT: p => (p < SN_COLLAPSE_END ? logLerp(5e9, 1e11, p / SN_COLLAPSE_END) : null),
      elapsed: p => supernovaSeconds(p) / YEAR_S,
      radius: p => (p < SN_BREAKOUT ? end.R : end.R + 1e4 * supernovaSeconds(p) / SUN_RADIUS_KM),
      surfaceT: p => (p < SN_BREAKOUT ? end.T : logLerp(2e5, 4500, clamp((p - SN_BREAKOUT) / 0.35) ** 0.5)),
      luminosity: p => {
        if (p < SN_BREAKOUT) return end.L;
        const t = (p - SN_BREAKOUT) / (1 - SN_BREAKOUT);
        // Shock-breakout flash, a plateau of about 100 days, then the radioactive tail.
        return t < 0.08 ? logLerp(end.L, 3e9, t / 0.08) : logLerp(3e9, 3e7, ((t - 0.08) / 0.92) ** 1.6);
      }
    });
    if (fate === 'neutronStar') {
      const R = NEUTRON_STAR_RADIUS_KM / SUN_RADIUS_KM;
      add({
        id: 'ns', type: 'ns', years: 1e7, mass: [remnant, remnant],
        // Neutrinos cool the interior from 10¹¹ K to about 10⁹ K within days.
        coreT: p => logLerp(1e11, 3e7, p ** 0.15),
        keys: [3e6, 1e6, 6e5, 3e5].map(T => ({ T, R }))
      });
    } else {
      add({
        id: 'bh', type: 'bh', years: 1e10, mass: [remnant, remnant], coreT: () => null,
        radius: () => schwarzschildKm(remnant) / SUN_RADIUS_KM, surfaceT: () => null
      });
    }
  }

  let start = 0;
  stages.forEach((stage, index) => {
    stage.index = index;
    stage.start = start;
    start += stage.years;
  });
  // Stars only shine from the protostar onward, and the stellar life ends at the remnant.
  const remnantStage = stages[stages.length - 1];
  return {
    mass: M, ms, fate, remnant, stages, preSupernovaMass,
    yearsToRemnant: remnantStage.start,
    cloudRadius, freeFallYears, kelvinHelmholtzYears,
    outlivesUniverse: ms.years > 1.38e10
  };
}

// The phase of a stage at progress p, and the progress q through that phase. A stage without phases is its own phase.
function phaseAt(stage, p) {
  if (!stage.phases) return { phase: stage, q: p };
  let from = 0;
  for (const phase of stage.phases) {
    if (p < from + phase.share) return { phase, q: (p - from) / phase.share };
    from += phase.share;
  }
  return { phase: stage.phases[stage.phases.length - 1], q: 1 };
}

// Everything the display needs at timeline position s (stage index + progress through that stage).
export function lifeState(life, s) {
  const count = life.stages.length;
  const index = clamp(Math.floor(s), 0, count - 1);
  const p = clamp(s - index);
  const stage = life.stages[index];
  const { phase, q } = phaseAt(stage, p);
  let T = null, L = null, R = null;
  if (phase.keys) ({ T, L, R } = interpolateKeys(phase.keys, q));
  if (stage.radius) R = stage.radius(p);
  if (stage.surfaceT) T = stage.surfaceT(p);
  if (stage.luminosity) L = stage.luminosity(p);
  const coreT = typeof phase.coreT === 'function' ? phase.coreT(q) : logLerp(phase.coreT[0], phase.coreT[1], q);
  const elapsed = stage.elapsed ? stage.elapsed(p) : (phase.before || 0) + phase.years * q;
  return {
    stage, index, p, phase, q, T, L, R, coreT,
    // A supernova keeps its mass until the shock reaches the surface.
    mass: lerp(phase.mass[0], phase.mass[1], stage.id === 'sn' ? clamp((p - SN_BREAKOUT) / (1 - SN_BREAKOUT)) : q),
    age: stage.start + elapsed,
    elapsed,
    seconds: stage.seconds ? stage.seconds(p) : null,
    onChart: phase.keys !== undefined && T < 250000
  };
}

// The whole Hertzsprung–Russell track, one polyline per stage that has a surface to plot.
export function hrTrack(life, samples = 24) {
  // A neutron star's surface is far too hot to fall on the diagram.
  return life.stages.filter(stage => (stage.keys || stage.phases) && stage.id !== 'ns').map(stage => {
    const points = [];
    const count = samples * (stage.phases ? stage.phases.length : 1);
    for (let i = 0; i <= count; i += 1) {
      const { phase, q } = phaseAt(stage, i / count);
      const { T, L } = interpolateKeys(phase.keys, q);
      points.push({ T, L });
    }
    return { id: stage.id, points };
  });
}
