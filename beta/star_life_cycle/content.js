// Stage descriptions, interior layers and number formatting for the star life cycle sim.
import {
  AU_IN_RSUN, SUN_RADIUS_KM, LATE_FUELS, SN_COLLAPSE_END, SN_BREAKOUT,
  HELIUM_IGNITION_MASS, CHANDRASEKHAR_MASS, NEUTRON_STAR_RADIUS_KM, schwarzschildKm
} from './physics.js';

const SUPERSCRIPT = { '-': '⁻', 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' };
const superscript = n => String(n).split('').map(c => SUPERSCRIPT[c]).join('');

function sig(x, digits = 2) {
  if (x === 0) return '0';
  const value = Number(x.toPrecision(digits));
  return Math.abs(value) >= 1000 ? value.toLocaleString('en-GB') : String(value);
}

function sci(x, digits = 2) {
  const exponent = Math.floor(Math.log10(Math.abs(x)));
  const mantissa = x / 10 ** exponent;
  const rounded = Number(mantissa.toPrecision(digits));
  if (rounded === 10) return `1.0 × 10${superscript(exponent + 1)}`;
  return `${rounded.toFixed(digits - 1)} × 10${superscript(exponent)}`;
}

function years(y) {
  if (y === 0) return '0 years';
  if (y < 1 / 365 / 24 / 3600 * 60) return `${sig(y * 3.156e7)} s`;
  if (y < 1 / 365 / 24) return `${sig(y * 365 * 24 * 60)} minutes`;
  if (y < 2 / 365) return `${sig(y * 365 * 24)} hours`;
  if (y < 0.2) return `${sig(y * 365)} days`;
  if (y < 1) return `${sig(y * 12)} months`;
  if (y < 1e4) return `${sig(y, 3)} years`;
  if (y < 1e6) return `${sig(y / 1e3, 3)} thousand years`;
  if (y < 1e9) return `${sig(y / 1e6, 3)} million years`;
  if (y < 1e12) return `${sig(y / 1e9, 3)} billion years`;
  return `${sig(y / 1e12, 3)} trillion years`;
}

function temp(kelvin) {
  if (kelvin === null) return '—';
  if (kelvin >= 1e9) return `${sig(kelvin / 1e9)} billion K`;
  if (kelvin >= 1e6) return `${sig(kelvin / 1e6)} million K`;
  if (kelvin >= 100) return `${Number(kelvin.toPrecision(kelvin >= 1e4 ? 2 : 3)).toLocaleString('en-GB')} K`;
  return `${sig(kelvin)} K`;
}

function lum(L) {
  if (L === null) return '—';
  if (L === 0) return '0';
  if (L >= 1e5 || L < 0.001) return `${sci(L)} L☉`;
  return `${sig(L, L >= 100 ? 2 : 3)} L☉`;
}

function radius(R) {
  if (R === null) return '—';
  const km = R * SUN_RADIUS_KM;
  if (km < 1000) return `${sig(km, 3)} km`;
  if (R < 0.05) return `${sig(km, 2)} km`;
  if (R < 300) return `${sig(R, R < 10 ? 2 : 3)} R☉`;
  const au = R / AU_IN_RSUN;
  if (au < 20) return `${sig(R, 2)} R☉ (${sig(au, 2)} AU)`;
  return `${sig(au, 2)} AU`;
}

const mass = m => `${m < 10 ? m.toFixed(2) : m.toFixed(1)} M☉`;

export const fmt = { sig, sci, years, temp, lum, radius, mass };

export function spectral(T) {
  if (T >= 30000) return { cls: 'O', colour: 'blue' };
  if (T >= 10000) return { cls: 'B', colour: 'blue-white' };
  if (T >= 7500) return { cls: 'A', colour: 'white' };
  if (T >= 6000) return { cls: 'F', colour: 'yellow-white' };
  if (T >= 5200) return { cls: 'G', colour: 'yellow' };
  if (T >= 3700) return { cls: 'K', colour: 'orange' };
  return { cls: 'M', colour: 'orange-red' };
}

// One colour per element, shared by every cutaway and its key.
export const ELEMENT = {
  H: '#F59E42', He: '#2DD4BF', C: '#A78BFA', Ne: '#F472B6', O: '#60A5FA', Si: '#FDE68A', Fe: '#9AA3AF', n: '#E2E8F0', q: '#C4B5FD'
};

const orbitComparison = R => {
  const au = R / AU_IN_RSUN;
  if (au > 5.2) return 'wider than the orbit of Jupiter';
  if (au > 1.52) return 'wider than the orbit of Mars';
  if (au > 1) return 'wider than the orbit of the Earth';
  if (au > 0.72) return 'wider than the orbit of Venus';
  if (au > 0.39) return 'wider than the orbit of Mercury';
  return `${sig(R, 2)} times the width of the Sun`;
};

const onion = (stageIndex, ironGrowth = 0) => {
  const H = { name: 'Hydrogen envelope', el: 'H', kind: 'convective', info: 'The huge outer layers, still mostly hydrogen and helium. They do not know what the core is doing: heat takes thousands of years to work its way out, and the core now changes faster than that.' };
  const shell = (el, name, info) => ({ name, el, kind: 'shell', info });
  const heShell = shell('He', 'Helium layer', 'Helium fuses to carbon and oxygen at its base. Hydrogen fuses to helium at its top.');
  const cShell = shell('C', 'Carbon and oxygen layer', 'Carbon fuses to neon and magnesium at the base of this layer.');
  const neShell = shell('Ne', 'Neon, oxygen and magnesium layer', 'Neon is broken up by gamma rays and rebuilt into oxygen and magnesium at the base of this layer.');
  const oShell = shell('O', 'Oxygen layer', 'Oxygen fuses to silicon and sulfur at the base of this layer.');
  const siShell = shell('Si', 'Silicon and sulfur layer', 'Silicon is turned into iron and nickel at the base of this layer.');
  const core = (el, fuel) => ({
    name: `${fuel.fuel}-fusing core`, el, kind: 'fusion',
    info: `${fuel.fuel} is fusing into ${fuel.makes} at ${temp(fuel.coreT)}. This fuel lasts ${fuel.lasts}.`
  });
  const iron = {
    name: 'Iron core', el: 'Fe', kind: 'inert',
    info: 'Iron and nickel: the end of the line. Their nuclei are the most tightly bound of all, so fusing them takes energy in instead of giving it out. The core is held up only by electron degeneracy pressure, and it is growing towards 1.4 M☉.'
  };
  const sets = [
    [[core('C', LATE_FUELS[0]), 0.2], [heShell, 0.3], [H, 1]],
    [[core('Ne', LATE_FUELS[1]), 0.16], [cShell, 0.24], [heShell, 0.32], [H, 1]],
    [[core('O', LATE_FUELS[2]), 0.14], [neShell, 0.2], [cShell, 0.27], [heShell, 0.34], [H, 1]],
    [[iron, 0.05 + 0.07 * ironGrowth], [{ ...core('Si', LATE_FUELS[3]), name: 'Silicon-fusing shell' }, 0.17], [oShell, 0.22], [neShell, 0.27], [cShell, 0.32], [heShell, 0.38], [H, 1]]
  ];
  return sets[stageIndex].map(([layer, r]) => ({ ...layer, r }));
};

export const STAGES = {
  cloud: {
    name: 'Nebula',
    tagline: 'A cold, dark cloud of gas and dust starts to fall in on itself.',
    balance: () => ({ v: -0.8, text: 'Gravity wins: the cloud collapses' }),
    body: c => `
      <p>A nebula is a giant cloud of gas and dust: about three quarters hydrogen and one quarter helium by mass, with a sprinkling of dust. It is very cold, about 10 K (−263 °C), so its particles move slowly and the gas pressure is low.</p>
      <p>In the densest clumps, <b>gravity</b> pulls the particles together more strongly than the gas pressure can push them apart. A clump of ${mass(c.M)} begins to collapse. As it falls inward, gravitational potential energy is transferred to kinetic energy, so the gas heats up.</p>
      <p>The clump was turning very slowly. As it shrinks it has to spin faster, like an ice skater pulling in their arms, and it flattens into a spinning disc with a hot, dense centre.</p>`,
    look: c => `The clump starts about ${sig(2 * c.life.cloudRadius / AU_IN_RSUN, 2)} AU across. Neptune's orbit is only 60 AU across. Watch the particles speed up and the disc form as the clump shrinks.`,
    deeper: c => `
      <p><b>Jeans mass.</b> A clump collapses when its mass is greater than M<sub>J</sub> ∝ T<sup>3/2</sup> ρ<sup>−1/2</sup>. Cold and dense is what matters.</p>
      <p><b>Free-fall time.</b> t<sub>ff</sub> = √(3π / 32Gρ). For 10⁴ hydrogen molecules per cm³ this is ${years(c.life.freeFallYears)}. It depends only on density, not on the mass of the clump.</p>
      <p>While the cloud is transparent to infrared, the heat escapes as fast as it is released and the gas stays near 10 K. Once the centre is dense enough to trap that radiation, it heats up fast and a protostar is born.</p>
      <p><b>Angular momentum</b> L = Iω is conserved. As the moment of inertia I falls, ω rises.</p>`
  },

  proto: {
    name: 'Protostar',
    tagline: 'A hot ball of gas, heated by gravity alone. There is no fusion yet.',
    balance: () => ({ v: -0.35, text: 'Gravity just ahead: slow contraction' }),
    body: c => `
      <p>The centre is now dense enough to trap heat. It glows at about ${temp(c.stage.keys[0].T)}, but the energy comes from <b>gravitational collapse</b>, not from fusion.</p>
      <p>Gas keeps spiralling inward through the disc. Some of it is thrown out along the spin axis in two narrow <b>jets</b>. Planets may form from what is left of the disc.</p>
      <p>The protostar keeps shrinking, and its core keeps getting hotter. When the core reaches about <b>10 million K</b>, hydrogen nuclei move fast enough to overcome their electrostatic repulsion and fuse. For this star that takes ${years(c.stage.years)}.</p>`,
    look: () => 'Watch the jets, then the disc clearing as the star shrinks. In the cutaway the whole interior is churning: a protostar is convective all the way through. Follow the dot on the HR diagram as it heads for the main sequence.',
    deeper: c => `
      <p><b>Virial theorem.</b> Half of the gravitational potential energy released heats the gas. The other half is radiated away, which is why the protostar shines.</p>
      <p><b>Kelvin–Helmholtz time.</b> t ≈ GM² / RL, about ${years(c.life.kelvinHelmholtzYears)} here. Massive protostars are far more luminous, so they contract much faster.</p>
      <p><b>Hayashi track.</b> A fully convective protostar stays near 4000 K, so as R shrinks, L = 4πR²σT⁴ falls: the track drops almost straight down the HR diagram. Later the star heats up and moves left to the main sequence.</p>
      <p>Protons need about 10⁷ K to get close enough to tunnel through their electrostatic barrier. Below about 0.08 M☉ the core never gets that hot and the object becomes a <b>brown dwarf</b>.</p>`,
    layers: () => [
      { name: 'Core (no hydrogen fusion yet)', el: 'H', kind: 'inert', r: 0.28, info: 'Getting hotter and denser as the protostar shrinks, but still below the 10 million K needed for hydrogen fusion.' },
      { name: 'Convective interior', el: 'H', kind: 'convective', r: 1, info: 'Hot gas rises, cools at the surface and sinks again, carrying heat outward. The whole protostar is stirred like a pan of boiling water.' }
    ]
  },

  ms: {
    name: 'Main sequence',
    tagline: 'Hydrogen fuses to helium in the core. The star is stable for most of its life.',
    balance: () => ({ v: 0, text: 'Balanced: gravity = pressure' }),
    body: c => {
      const s = spectral(c.ms.T);
      const life = c.life.outlivesUniverse
        ? `That will last ${years(c.ms.years)}, far longer than the present age of the universe (13.8 billion years). Every star like this that has ever formed is still on the main sequence.`
        : `That will last ${years(c.ms.years)}.`;
      const compare = c.M > 1.2
        ? 'Massive stars have much more fuel than the Sun, but they burn it so much faster that they live much shorter lives.'
        : c.M < 0.8
          ? 'Small stars have less fuel than the Sun, but they burn it so slowly that they live much longer.'
          : 'The Sun is about 4.6 billion years old: roughly halfway through this stage.';
      return `
      <p>In the core, hydrogen nuclei fuse to make helium. About 0.7% of the mass is transferred to energy (E = mc²).</p>
      <p>The hot gas pushes outward. Gravity pulls inward. The two are <b>balanced</b>, so the star stays the same size. ${life}</p>
      <p>This star is a ${s.colour} class ${s.cls} star: surface ${temp(c.ms.T)}, ${lum(c.ms.L)}. ${compare}</p>`;
    },
    look: c => (c.M >= 1.3
      ? 'The surface is smooth: energy leaves this star by radiation, not by boiling. Open the cutaway to see the churning core. On the HR diagram the dot barely moves for millions of years.'
      : 'The speckled surface is the tops of convection cells, hot gas rising and sinking. Open the cutaway and tap each layer. On the HR diagram the dot barely moves for billions of years.'),
    deeper: c => `
      <p><b>Mass decides everything.</b> L ∝ M<sup>3.5</sup> roughly, so lifetime ∝ M / L ∝ M<sup>−2.5</sup>.</p>
      <p><b>Which fusion?</b> ${c.M < 1.3
        ? 'Below about 1.3 M☉ the proton–proton chain dominates (rate ∝ T⁴).'
        : 'Above about 1.3 M☉ the CNO cycle dominates. Carbon, nitrogen and oxygen act as catalysts and the rate is very sensitive to temperature (∝ T¹⁷), so the energy is released in a small region and the core has to convect.'} Either way 4 ¹H → ⁴He + 2e⁺ + 2ν + 26.7 MeV.</p>
      <p><b>A built-in thermostat.</b> If fusion speeds up, the core expands and cools, and fusion slows again. Hydrostatic equilibrium: dP/dr = −GMρ / r².</p>
      <p>As helium builds up, the core slowly contracts and heats, so the star brightens: the Sun is about 30% brighter now than when it formed.</p>`,
    layers: c => {
      const core = c.M < 1.3 ? 'proton–proton chain' : 'CNO cycle';
      if (c.M < 0.35) return [
        { name: 'Core: hydrogen fusion', el: 'H', kind: 'fusion', r: 0.26, info: `Hydrogen fuses to helium by the ${core} at ${temp(c.ms.coreT)}.` },
        { name: 'Convective interior', el: 'H', kind: 'convective', r: 1, info: 'A red dwarf convects all the way through. Fresh hydrogen is carried down to the core and helium is carried away, so the star can use nearly all of its fuel. That is one reason it lives so long.' }
      ];
      if (c.M < 1.3) return [
        { name: 'Core: hydrogen fusion', el: 'H', kind: 'fusion', r: 0.25, info: `Hydrogen fuses to helium by the ${core} at ${temp(c.ms.coreT)}. Only this inner region is hot enough.` },
        { name: 'Radiative zone', el: 'H', kind: 'radiative', r: 0.7, info: 'Energy travels outward as light, but each photon is absorbed and re-emitted in a random direction countless times. The journey takes of the order of 100 000 years.' },
        { name: 'Convective zone', el: 'H', kind: 'convective', r: 1, info: 'Cooler gas is more opaque, so radiation gets stuck. Instead, hot gas rises, releases its energy at the surface and sinks again.' }
      ];
      return [
        { name: 'Convective core: hydrogen fusion', el: 'H', kind: 'fusion', r: 0.3, info: `Hydrogen fuses to helium by the ${core} at ${temp(c.ms.coreT)}. So much energy is released in such a small region that the core churns.` },
        { name: 'Radiative envelope', el: 'H', kind: 'radiative', r: 1, info: 'The hot outer layers are transparent enough for energy to flow out as radiation, so they do not convect and the surface looks smooth.' }
      ];
    }
  },

  blue: {
    name: 'Blue dwarf',
    tagline: 'The fuel runs low. The star never swells; it shrinks and gets hotter.',
    balance: () => ({ v: -0.15, text: 'Slow contraction as the fuel runs low' }),
    body: () => `
      <p>A red dwarf this small is stirred all the way through, so it has turned nearly <b>all</b> of its hydrogen into helium. There is no leftover shell of hydrogen around a dead core, so it never becomes a red giant.</p>
      <p>Instead the star slowly contracts and its surface gets hotter and bluer. When fusion finally stops, what is left cools as a white dwarf made of helium.</p>
      <p>This stage is a prediction. The universe is far too young for any star to have got this far.</p>`,
    look: () => 'On the HR diagram the dot moves left (hotter) instead of up and right towards the giants.',
    deeper: () => '<p>The core never reaches the 100 million K needed for helium fusion: the star is too light to squeeze it hard enough before electron degeneracy pressure stops the contraction.</p>',
    layers: () => [
      { name: 'Core: last hydrogen fusion', el: 'H', kind: 'fusion', r: 0.3, info: 'The last of the hydrogen is fusing.' },
      { name: 'Helium-rich interior', el: 'He', kind: 'convective', r: 1, info: 'Mostly helium now, mixed evenly through the star by convection.' }
    ]
  },

  rgb: {
    name: 'Red giant',
    tagline: 'The core has run out of hydrogen. The core shrinks and the outside swells.',
    balance: () => ({ v: 0.3, text: 'Core shrinks, outer layers expand' }),
    body: c => {
      const tip = c.stage.keys[c.stage.keys.length - 1];
      const end = c.M < HELIUM_IGNITION_MASS
        ? 'This star is too light: its core never reaches the 100 million K needed to fuse helium. It will lose its outer layers and leave a white dwarf made of helium.'
        : c.M < 2
          ? 'When the core reaches about 100 million K, helium ignites everywhere in the core within minutes: the <b>helium flash</b>.'
          : 'When the core reaches about 100 million K, helium fusion begins.';
      return `
      <p>With no fusion in the core, nothing holds it up. Gravity squeezes the helium core, and it gets hotter.</p>
      <p>Hydrogen now fuses in a <b>shell</b> around the core, faster than before. The extra energy pushes the outer layers outward until the star is about ${sig(tip.R, 2)} times the width of the Sun (${orbitComparison(tip.R)}).</p>
      <p>The energy is spread over a huge surface, so the surface cools to about ${temp(tip.T)} and glows red, even though the star is now ${sig(tip.L / c.ms.L, 2)} times brighter.</p>
      <p>${end}</p>`;
    },
    look: () => 'Giants have a few enormous convection cells instead of fine speckles. Gas drifts away from the weakly held surface. The cutaway shows a dead helium core with a thin burning shell around it (the real core is only about the size of the Earth).',
    deeper: c => `
      <p><b>Stefan–Boltzmann law.</b> L = 4πR²σT⁴. A star that is cool yet very luminous must be enormous.</p>
      <p>The core is so dense that it is held up by <b>electron degeneracy pressure</b>, which does not depend on temperature. ${c.M < 2 && c.M >= HELIUM_IGNITION_MASS ? 'So when helium ignites, the core cannot expand and cool to steady itself. Fusion runs away, briefly releasing 10¹¹ L☉. All of it goes into expanding the core, so nothing is seen from outside.' : ''}</p>
      <p>The convective envelope reaches deep enough to carry fusion products up to the surface (the first dredge-up).</p>`,
    layers: c => [
      { name: 'Helium core (no fusion)', el: 'He', kind: 'inert', r: 0.11, info: 'Helium "ash" from the main sequence. It is contracting and heating up, held up by electron degeneracy pressure. In reality it is about the size of the Earth.' },
      { name: 'Hydrogen-fusing shell', el: 'H', kind: 'fusion', r: 0.17, info: `Hydrogen fuses to helium in a thin shell at ${temp(Math.max(3e7, c.st.coreT * 0.5))}, adding more helium to the core below.` },
      { name: 'Convective envelope', el: 'H', kind: 'convective', r: 1, info: 'A vast, thin, churning envelope. Its average density is less than a thousandth of the density of air.' }
    ]
  },

  he: {
    name: 'Helium burning',
    tagline: 'The core is hot enough to fuse helium into carbon and oxygen.',
    balance: () => ({ v: 0, text: 'Balanced again' }),
    body: c => `
      <p>At 100 million K, three helium nuclei can fuse to make <b>carbon</b>. Add one more and you get <b>oxygen</b>.</p>
      <p>With energy released in the core again, the star settles down: it shrinks to about ${sig(c.stage.keys[0].R, 2)} R☉ and its surface warms up a little.</p>
      <p>This lasts ${years(c.stage.years)}, far shorter than the main sequence. Helium fusion releases only about a tenth as much energy per kilogram as hydrogen fusion, and the star is now much brighter.</p>
      ${c.M >= 4 ? '<p>A star of this mass pulses in and out here as a <b>Cepheid variable</b>. The pulse period reveals its true brightness, which astronomers use to measure distances to other galaxies.</p>' : ''}
      <p class="note">At GCSE this stage is counted as part of the red giant stage.</p>`,
    look: () => 'The star has shrunk since the red giant stage. On the HR diagram it has dropped back down. Open the cutaway: there are now two regions of fusion.',
    deeper: () => `
      <p><b>Triple-alpha process.</b> ⁴He + ⁴He ⇌ ⁸Be, which falls apart in about 10⁻¹⁶ s. Just occasionally a third ⁴He hits it first and makes ¹²C. This only works because carbon has an excited state at exactly the right energy (the Hoyle state). The rate goes as T⁴⁰.</p>
      <p>Then ¹²C + ⁴He → ¹⁶O + γ. Nearly all the carbon and oxygen in your body was made this way.</p>`,
    layers: () => [
      { name: 'Helium-fusing core', el: 'He', kind: 'fusion', r: 0.14, info: 'Helium fuses to carbon and oxygen at 100 to 200 million K.' },
      { name: 'Helium layer', el: 'He', kind: 'inert', r: 0.22, info: 'Helium that is not hot enough to fuse.' },
      { name: 'Hydrogen-fusing shell', el: 'H', kind: 'fusion', r: 0.28, info: 'Hydrogen still fuses to helium in a shell.' },
      { name: 'Convective envelope', el: 'H', kind: 'convective', r: 1, info: 'The outer layers, still mostly hydrogen.' }
    ]
  },

  agb: {
    name: 'Red giant again',
    tagline: 'The core runs out of helium too. Two burning shells swell the star to its largest size.',
    balance: () => ({ v: 0.6, text: 'Outer layers pushed away' }),
    body: c => {
      const tip = c.stage.keys[c.stage.keys.length - 1];
      return `
      <p>The core is now carbon and oxygen. To fuse carbon it would need 600 million K, and this star is not massive enough to squeeze its core that hard. Fusion in the core stops for good.</p>
      <p>Helium and hydrogen fuse in two thin shells around the dead core. The star swells to about ${sig(tip.R, 2)} R☉ (${orbitComparison(tip.R)}) and shines ${lum(tip.L)}.</p>
      <p>Gravity at this bloated surface is so weak that the star pulses and blows its outer layers into space. It goes from ${mass(c.stage.mass[0])} to ${mass(c.stage.mass[1])} in this stage.</p>
      <p class="note">Astronomers call this the asymptotic giant branch (AGB). At GCSE it is counted as part of the red giant stage.</p>`;
    },
    look: () => 'The star slowly pulses in and out, and a dense wind streams away. The cutaway shows a dead carbon–oxygen core wrapped in two burning shells.',
    deeper: () => `
      <p><b>Thermal pulses.</b> The helium shell switches on in a flash every 10⁴ to 10⁵ years. Each pulse mixes carbon up to the surface.</p>
      <p><b>s-process.</b> Free neutrons are captured slowly by nuclei, building elements heavier than iron such as strontium, barium and lead.</p>
      <p>The "superwind" removes up to 10⁻⁴ M☉ per year. Carbon and silicate dust forms in the cool outflow: this is where most of the dust in the galaxy comes from.</p>`,
    layers: () => [
      { name: 'Carbon–oxygen core (no fusion)', el: 'C', kind: 'inert', r: 0.1, info: 'Dead "ash" from helium fusion, held up by electron degeneracy pressure. This will become the white dwarf.' },
      { name: 'Helium-fusing shell', el: 'He', kind: 'fusion', r: 0.14, info: 'Helium fuses to carbon in a thin shell. It switches on in violent flashes.' },
      { name: 'Helium layer', el: 'He', kind: 'inert', r: 0.19, info: 'Helium made by the hydrogen shell above, waiting to fuse.' },
      { name: 'Hydrogen-fusing shell', el: 'H', kind: 'fusion', r: 0.23, info: 'Hydrogen fuses to helium in a second thin shell.' },
      { name: 'Convective envelope', el: 'H', kind: 'convective', r: 1, info: 'Enormous and barely held by gravity. It is being blown away as a stellar wind.' }
    ]
  },

  pn: {
    name: 'Planetary nebula',
    tagline: 'The outer layers drift away as a glowing shell, uncovering the hot core.',
    balance: () => ({ v: 0.8, text: 'Outer layers escape; the core holds' }),
    body: c => `
      <p>The star has pushed off its outer layers at about 20 km/s. There is no explosion: the core is only ${mass(c.life.remnant)}, well below the 1.4 M☉ needed for a collapse.</p>
      <p>The bare core is tiny and extremely hot, over 100 000 K. Its ultraviolet light makes the shell of gas glow: green-blue from oxygen and red from hydrogen.</p>
      <p>The shell fades in about 20 000 years as it spreads out. Its carbon, nitrogen and oxygen mix into space and end up in new stars and planets.</p>
      <p class="note">It has nothing to do with planets. Through early telescopes these shells looked like the discs of planets.</p>`,
    look: () => 'Watch the central star shrink and turn from red to blue-white as its last layers lift off. On the HR diagram it races to the left, then drops.',
    deeper: () => `
      <p>The colours are emission lines: doubly ionised oxygen [O III] at 500.7 nm and hydrogen Hα at 656.3 nm.</p>
      <p>The core crosses the HR diagram at nearly constant luminosity. As its last thin envelope shrinks, R falls and T rises with L = 4πR²σT⁴ fixed. Then the burning shells go out and it fades.</p>`,
    layers: () => [
      { name: 'Carbon–oxygen core', el: 'C', kind: 'degenerate', r: 0.86, info: 'The dead core of the star, about the size of the Earth and held up by electron degeneracy pressure.' },
      { name: 'Helium layer', el: 'He', kind: 'inert', r: 0.95, info: 'A thin leftover layer of helium.' },
      { name: 'Hydrogen layer', el: 'H', kind: 'inert', r: 1, info: 'The last trace of the envelope.' }
    ]
  },

  wd: {
    name: 'White dwarf',
    tagline: 'A dead core the size of the Earth. No fusion: it just cools and fades.',
    balance: () => ({ v: 0, text: 'Held up by electron degeneracy pressure' }),
    body: c => {
      const km = c.stage.keys[0].R * SUN_RADIUS_KM;
      const helium = c.M < HELIUM_IGNITION_MASS;
      return `
      <p>What is left is ${mass(c.life.remnant)} of ${helium ? 'helium' : 'carbon and oxygen'} squeezed into a ball ${sig(2 * km, 2)} km across (the Earth is 12 700 km). A teaspoonful would have a mass of several tonnes.</p>
      <p>There is no fusion. It shines only because it is hot, so it cools: from white, through yellow and red, until it is a cold, dark <b>black dwarf</b>.</p>
      <p>That takes far longer than the present age of the universe. No black dwarfs exist yet.</p>`;
    },
    look: c => `Scrub through this stage to watch the colour change as it cools. On the HR diagram it slides down a line of constant radius.${c.life.stages.some(s => s.id === 'pn') ? ' The planetary nebula fades away around it.' : ''}`,
    deeper: c => `
      <p><b>Electron degeneracy pressure.</b> The Pauli exclusion principle stops electrons sharing a quantum state. Squeezed together, they are forced into high-momentum states and push back, whatever the temperature. So a white dwarf does not shrink as it cools.</p>
      <p><b>More massive means smaller:</b> R ∝ M<sup>−1/3</sup>.</p>
      <p><b>Chandrasekhar limit.</b> Above ${CHANDRASEKHAR_MASS} M☉ the electrons would have to move at the speed of light and the pressure fails. A white dwarf pushed over the limit by gas from a companion star explodes as a Type Ia supernova. This one is ${mass(c.life.remnant)}.</p>
      <p>As it cools, the interior freezes from the centre outward into a crystal lattice.</p>`,
    layers: c => {
      const helium = c.M < HELIUM_IGNITION_MASS;
      return [
        { name: helium ? 'Helium interior' : 'Carbon–oxygen interior', el: helium ? 'He' : 'C', kind: 'degenerate', r: 0.93, info: 'Nuclei packed about a million times more densely than water, in a sea of degenerate electrons. As it cools it slowly crystallises.' },
        ...(helium ? [] : [{ name: 'Helium layer', el: 'He', kind: 'inert', r: 0.98, info: 'A thin layer of helium floating on the denser interior.' }]),
        { name: 'Hydrogen atmosphere', el: 'H', kind: 'inert', r: 1, info: 'A very thin skin of the lightest element. Gravity here is about 100 000 times stronger than on Earth, so elements separate by weight.' }
      ];
    }
  },

  sg: {
    name: 'Supergiant',
    tagline: 'The core runs out of hydrogen in a cosmic blink and moves on to helium.',
    balance: () => ({ v: 0.3, text: 'Core shrinks, outer layers expand' }),
    body: c => {
      const end = c.stage.keys[c.stage.keys.length - 1];
      const shape = c.stage.staysBlue
        ? `This star is so luminous (${lum(end.L)}) that its own light blows its outer layers off into space. Instead of swelling into a red supergiant it stays blue, shedding mass in outbursts, until only a bare, hot core is left (a Wolf–Rayet star). It goes from ${mass(c.stage.mass[0])} to ${mass(c.stage.mass[1])}.`
        : `The outer layers swell enormously, to about ${sig(end.R, 2)} R☉ (${orbitComparison(end.R)}), and cool to ${temp(end.T)}: a <b>red supergiant</b> like Betelgeuse.`;
      return `
      <p>After only ${years(c.ms.years)} the core hydrogen is gone. The core contracts and heats until helium begins to fuse into carbon and oxygen. Hydrogen keeps fusing in a shell around it.</p>
      <p>${shape}</p>
      <p>This stage lasts ${years(c.stage.years)}.</p>`;
    },
    look: c => (c.stage.staysBlue
      ? 'The star stays hot and blue while a fierce wind strips it. On the HR diagram the track stays on the left.'
      : 'On the HR diagram the dot moves almost straight to the right: much cooler, much bigger, about the same brightness. The surface is covered by a few giant convection cells.'),
    deeper: () => `
      <p>The core is not degenerate, so helium ignites gently: there is no helium flash.</p>
      <p><b>Eddington limit.</b> Above about 3 × 10⁴ L☉ per solar mass, radiation pressure on the gas beats gravity. The brightest stars sit close to this limit, which is why they lose so much mass.</p>
      <p>The luminosity hardly changes as the star crosses the diagram, so R must rise as T falls: L = 4πR²σT⁴.</p>`,
    layers: c => [
      { name: 'Helium-fusing core', el: 'He', kind: 'fusion', r: 0.16, info: 'Helium fuses to carbon and oxygen at about 200 million K.' },
      { name: 'Hydrogen-fusing shell', el: 'H', kind: 'fusion', r: 0.22, info: 'Hydrogen still fuses to helium in a shell around the core.' },
      c.stage.staysBlue
        ? { name: 'Thinning envelope', el: 'H', kind: 'radiative', r: 1, info: 'What is left of the outer layers, being blown away by the pressure of the star\'s own light.' }
        : { name: 'Convective envelope', el: 'H', kind: 'convective', r: 1, info: 'A vast, thin, churning envelope hundreds of times wider than the Sun.' }
    ]
  },

  late: {
    name: 'Final burning',
    tagline: 'The core fuses heavier and heavier elements, faster and faster, until it is iron.',
    balance: () => ({ v: -0.2, text: 'Core shrinks each time a fuel runs out' }),
    live: c => {
      const f = LATE_FUELS[Math.min(3, Math.floor(c.st.p * 4))];
      return `<b>In the core now:</b> ${f.fuel.toLowerCase()} → ${f.makes}, at ${temp(f.coreT)}. This fuel lasts ${f.lasts}.`;
    },
    body: () => `
      <p>Each time the core runs out of fuel, it contracts and heats up until the "ash" of the last stage begins to fuse: carbon, then neon, then oxygen, then silicon.</p>
      <p>Each new fuel releases less energy and is used up faster. Carbon lasts about 1000 years. Silicon lasts about a day. The star builds up layers like an onion.</p>
      <p>The last product is <b>iron</b>. Fusing iron takes energy in instead of releasing it, so the iron core produces nothing to hold itself up.</p>
      <p>From outside, nothing seems to change. The surface is too far away to notice.</p>`,
    look: () => 'Open the cutaway and scrub slowly through this stage. Watch a new shell appear each time the core changes fuel.',
    deeper: () => `
      <p><b>Binding energy per nucleon</b> peaks near ⁵⁶Fe and ⁶²Ni. Fusion releases energy only on the way up to that peak.</p>
      <p>Above about 5 × 10⁸ K most of the energy leaves as neutrinos, which escape straight through the star. The core has to burn fuel faster and faster to keep up, which is why the stages get so short.</p>
      <p>The iron core is held up by electron degeneracy pressure. It grows until it reaches about ${CHANDRASEKHAR_MASS} M☉.</p>`,
    layers: (c, p) => {
      const i = Math.min(3, Math.floor(p * 4));
      return onion(i, i === 3 ? p * 4 - 3 : 0);
    }
  },

  sn: {
    name: 'Supernova',
    tagline: 'The iron core collapses in a quarter of a second. The star blows itself apart.',
    balance: c => (c.st.p < SN_COLLAPSE_END
      ? { v: -1, text: 'Gravity wins: the core collapses' }
      : { v: 1, text: 'Explosion: the outer layers are blown away' }),
    live: c => {
      const p = c.st.p;
      if (p < SN_COLLAPSE_END) return '<b>Act 1, core collapse.</b> The iron core, the size of the Earth, falls inward at up to a quarter of the speed of light.';
      if (p < SN_BREAKOUT) return '<b>Act 2, the shock.</b> The core has bounced. A shock wave is tearing outward through the star. From outside, nothing has changed yet.';
      return '<b>Act 3, the explosion.</b> The shock has reached the surface. The star outshines billions of Suns as its remains fly out at 10 000 km/s.';
    },
    body: c => `
      <p>The iron core reaches about 1.4 M☉ and electron pressure can no longer hold it up. It collapses from the size of the Earth to about 30 km across in a quarter of a second. Protons and electrons are crushed together to make <b>neutrons</b>.</p>
      <p>When the centre is as dense as an atomic nucleus it suddenly stiffens. The infalling material bounces off it, sending a <b>shock wave</b> outward that blows the rest of the star into space.</p>
      <p>For weeks the supernova can outshine a whole galaxy. Elements heavier than iron are made in the explosion and scattered through space, where they end up in new stars, planets and people.</p>
      ${c.life.fate === 'blackHole' ? '<p>In a star this massive, so much material falls back on to the core that it cannot survive as a neutron star. In some cases the explosion fails and the star simply vanishes.</p>' : ''}`,
    look: () => 'Open the cutaway before you press play: watch the core fall in and the shock travel outward before anything shows at the surface. Then watch the brightness readout.',
    deeper: () => `
      <p><b>Energy.</b> The collapse releases about 3 × 10⁴⁶ J of gravitational potential energy. About 99% leaves as neutrinos, 1% as kinetic energy of the debris and only 0.01% as light.</p>
      <p><b>Electron capture.</b> p + e⁻ → n + ν<sub>e</sub>. Neutrinos from supernova 1987A were detected about three hours before its light arrived: the shock takes hours to reach the surface.</p>
      <p>After the first flash, the glow is powered by radioactive decay: ⁵⁶Ni → ⁵⁶Co → ⁵⁶Fe (half-lives 6 days and 77 days).</p>
      <p>Many of the very heaviest elements, such as gold, are now thought to come mainly from collisions of neutron stars.</p>`,
    layers: (c, p) => {
      const layers = onion(3, 1);
      const collapse = Math.min(1, p / SN_COLLAPSE_END);
      layers[0] = {
        ...layers[0],
        r: 0.12 - 0.09 * collapse ** 2,
        name: p < SN_COLLAPSE_END ? 'Collapsing iron core' : 'Newborn neutron star',
        el: p < SN_COLLAPSE_END ? 'Fe' : 'n',
        kind: p < SN_COLLAPSE_END ? 'inert' : 'degenerate',
        info: p < SN_COLLAPSE_END
          ? 'Electron degeneracy pressure has failed. The core is in free fall, and its protons and electrons are merging into neutrons.'
          : 'The centre has been crushed to the density of an atomic nucleus and has stopped collapsing. Everything still falling in bounces off it.'
      };
      return layers;
    }
  },

  ns: {
    name: 'Neutron star',
    tagline: 'A ball of neutrons the size of a city, spinning many times a second.',
    balance: () => ({ v: 0, text: 'Held up by neutron degeneracy pressure' }),
    body: c => `
      <p>The collapsed core survives: ${mass(c.life.remnant)} packed into a ball only ${sig(2 * NEUTRON_STAR_RADIUS_KM, 2)} km across. It is as dense as an atomic nucleus. A teaspoonful would have a mass of a few billion tonnes.</p>
      <p>It is made almost entirely of <b>neutrons</b>, and it is the pressure of those neutrons that stops gravity crushing it further.</p>
      <p>When the core shrank, it spun up, just as the cloud did. It also has an intense magnetic field. Beams of radio waves leave its magnetic poles and sweep around like a lighthouse. If a beam crosses the Earth we detect regular pulses: a <b>pulsar</b>.</p>`,
    look: () => 'The magnetic axis is tilted away from the spin axis, so the beams sweep around. The debris of the supernova is still spreading out around it. The star is drawn far too large: at this scale it would be invisible.',
    deeper: c => `
      <p><b>Neutron degeneracy pressure</b> works like electron degeneracy pressure, with help from the repulsive core of the strong force. It fails above about 2.2 M☉ (the Tolman–Oppenheimer–Volkoff limit).</p>
      <p>Surface gravity is about 10¹² N/kg and the escape speed is over half the speed of light.</p>
      <p>Conserving angular momentum: shrinking the radius by a factor of 500 makes the core spin about 250 000 times faster. Magnetic flux is also conserved, so B ∝ 1/R² and the field reaches about 10⁸ T.</p>
      <p>The first pulsar was discovered by Jocelyn Bell Burnell in 1967. Pulsars slow down over millions of years as they radiate their rotational energy away.</p>
      <p>This one is ${mass(c.life.remnant)}.</p>`,
    layers: () => [
      { name: 'Inner core', el: 'q', kind: 'degenerate', r: 0.45, info: 'Several times denser than an atomic nucleus. Nobody knows what matter does here: it may dissolve into a soup of quarks.' },
      { name: 'Outer core', el: 'n', kind: 'radiative', r: 0.88, info: 'A liquid of neutrons with a few protons and electrons. It flows with no friction at all (a superfluid).' },
      { name: 'Crust', el: 'Fe', kind: 'inert', r: 0.98, info: 'About a kilometre of iron-like nuclei in a rigid lattice, far stronger than steel. When it cracks, the star "quakes".' },
      { name: 'Atmosphere', el: 'H', kind: 'inert', r: 1, info: 'A layer of hot plasma only a few centimetres deep, held down by gravity 100 billion times stronger than on Earth.' }
    ]
  },

  bh: {
    name: 'Black hole',
    tagline: 'Gravity wins completely. Not even light can escape.',
    balance: () => ({ v: -1, text: 'Gravity wins: nothing can stop the collapse' }),
    body: c => `
      <p>The collapsed core is ${mass(c.life.remnant)}, too massive for neutrons to hold it up. Nothing known can stop the collapse.</p>
      <p>Around it is the <b>event horizon</b>, ${sig(2 * schwarzschildKm(c.life.remnant), 2)} km across. Inside it the escape speed is greater than the speed of light, so nothing that crosses it can come back out.</p>
      <p>A black hole on its own gives out no light. We detect black holes by their gravity: stars orbiting something invisible, X-rays from gas heated as it falls in, gravitational waves when two of them merge, and the bending of light from whatever is behind them.</p>`,
    look: () => 'Drag to move around the black hole and watch the background stars. Their light is bent as it passes, so they smear into arcs and a ring. The dark disc is the hole\'s "shadow", about 2.6 times wider than the event horizon, because light that passes too close is captured.',
    deeper: c => `
      <p><b>Schwarzschild radius.</b> r<sub>s</sub> = 2GM / c² = 2.95 km for each solar mass: ${sig(schwarzschildKm(c.life.remnant), 3)} km here.</p>
      <p><b>Bending of light.</b> A ray passing at distance b is deflected by α = 4GM / c²b. Light can orbit at 1.5 r<sub>s</sub> (the photon sphere).</p>
      <p><b>Hawking radiation.</b> A black hole has a temperature T = ħc³ / 8πGMk, here ${sci(6.17e-8 / c.life.remnant)} K. That is colder than the 2.7 K glow left over from the Big Bang, so it absorbs more than it emits. Left alone it would take about ${sci(2.1e67 * c.life.remnant ** 3)} years to evaporate.</p>`
  }
};
