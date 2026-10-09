// Text content for the nuclear decay explorer: mode descriptions, particle
// readouts and isotopes. Kept separate from the 3D scene code.

export const MODE_ORDER = ['alpha', 'beta', 'gamma', 'halflife'];

// A nuclide is written as mass number A over atomic number Z.
export const MODES = {
  alpha: {
    title: 'ALPHA DECAY',
    date: 'α · AMERICIUM-241',
    heading: 'The nucleus throws out a helium nucleus.',
    description: 'An alpha particle is two protons and two neutrons: a helium nucleus. The nucleus loses 4 from its mass number and 2 from its atomic number, so it becomes a different element. Americium-241 is the source inside many smoke alarms.',
    look: 'Press “Decay this nucleus”. Watch two protons and two neutrons group together and leave. Then read the equation: the top numbers and the bottom numbers both still add up. The new nucleus recoils a little the other way.',
    evidence: 'Alpha particles are large and have a +2 charge, so they collide with many atoms and are strongly ionising. That also means they lose energy fast: a few centimetres of air or a sheet of paper stops them. Try “Test penetration”.',
    hint: 'Decay the nucleus, then test which material stops alpha radiation.',
    parent: { symbol: 'Am', name: 'americium-241', A: 241, Z: 95 },
    daughter: { symbol: 'Np', name: 'neptunium-237', A: 237, Z: 93 },
    emitted: { symbol: 'He', A: 4, Z: 2, label: 'alpha particle' },
    halfLife: '432 years'
  },
  beta: {
    title: 'BETA DECAY',
    date: 'β⁻ · CARBON-14',
    heading: 'A neutron turns into a proton.',
    description: 'In beta-minus decay a neutron in the nucleus changes into a proton and a fast electron. The electron (the beta particle) is created in the nucleus and shoots out. The mass number stays the same; the atomic number goes up by 1. Carbon-14 becomes nitrogen-14.',
    look: 'Press “Decay this nucleus”. One grey neutron glows, then becomes a red proton as a blue electron leaves. Count the protons before and after: 6 becomes 7, so carbon becomes nitrogen. The faint particle leaving in another direction is an antineutrino: you do not need to know about antineutrinos for GCSE.',
    evidence: 'Beta particles are small, fast electrons with a −1 charge. They are less ionising than alpha particles, so they travel further: several metres of air, stopped by a few millimetres of aluminium.',
    hint: 'Decay the nucleus and count the protons, then test penetration.',
    parent: { symbol: 'C', name: 'carbon-14', A: 14, Z: 6 },
    daughter: { symbol: 'N', name: 'nitrogen-14', A: 14, Z: 7 },
    emitted: { symbol: 'e', A: 0, Z: -1, label: 'beta particle (electron)' },
    halfLife: '5730 years'
  },
  gamma: {
    title: 'GAMMA EMISSION',
    date: 'γ · TECHNETIUM-99m',
    heading: 'The nucleus sheds energy, not particles.',
    description: 'Gamma rays are electromagnetic waves emitted from the nucleus. A nucleus with extra energy (an excited, “m” state) gives it out as a gamma ray. No particles leave, so the mass number and the atomic number do not change. Technetium-99m is used as a medical tracer.',
    look: 'The glowing, jittery nucleus has extra energy. Press “Decay this nucleus” and watch a gamma ray leave. The nucleus calms down but keeps all 43 protons and 56 neutrons.',
    evidence: 'Gamma rays have no mass and no charge, so they are weakly ionising and very penetrating. Several centimetres of lead or metres of concrete reduce them a lot, but never stop all of them. This lets doctors detect them outside the body.',
    hint: 'Compare the nucleon counts before and after, then test penetration.',
    parent: { symbol: 'Tc', name: 'technetium-99m', A: '99m', Z: 43, nucleons: 99 },
    daughter: { symbol: 'Tc', name: 'technetium-99', A: 99, Z: 43 },
    emitted: { symbol: 'γ', A: 0, Z: 0, label: 'gamma ray' },
    halfLife: '6.0 hours'
  },
  halflife: {
    title: 'HALF-LIFE',
    date: 'RANDOM · BUT PREDICTABLE',
    heading: 'Each nucleus is random. A sample is predictable.',
    description: 'You cannot predict when one nucleus will decay. But in a large sample, half of the unstable nuclei decay in a fixed time, whatever the starting number. That time is the half-life.',
    look: 'Press “Start” and watch the graph. After one half-life about half the nuclei remain; after two, about a quarter. Use “Run one half-life” to predict each step first. Try a sample of 100: the graph is much more ragged.',
    evidence: 'Decay is random, so counts wobble around the expected curve. Larger samples wobble less, which is why half-life is measured with huge numbers of nuclei. A count rate falls in the same way, so a Geiger counter can measure half-life.',
    hint: 'Choose an isotope and sample size, then run it one half-life at a time.'
  }
};

// Half-lives in the unit shown on the graph.
export const ISOTOPES = {
  radon: { name: 'Radon-220', daughter: 'polonium-216', halfLife: 55.6, unit: 's', unitName: 'seconds', emits: 'alpha' },
  iodine: { name: 'Iodine-131', daughter: 'xenon-131', halfLife: 8.02, unit: 'days', unitName: 'days', emits: 'beta' },
  cobalt: { name: 'Cobalt-60', daughter: 'nickel-60', halfLife: 5.27, unit: 'years', unitName: 'years', emits: 'beta' },
  carbon: { name: 'Carbon-14', daughter: 'nitrogen-14', halfLife: 5730, unit: 'years', unitName: 'years', emits: 'beta' }
};

export const PARTICLES = {
  proton: 'PROTON · Charge +1 · Relative mass 1. The number of protons (atomic number) decides the element.',
  neutron: 'NEUTRON · Charge 0 · Relative mass 1. Protons + neutrons = the mass number.',
  alpha: 'ALPHA PARTICLE · 2 protons + 2 neutrons, a helium nucleus · Charge +2 · Strongly ionising, stopped by paper or a few cm of air.',
  electron: 'BETA PARTICLE · A fast electron made when a neutron turns into a proton · Charge −1 · Stopped by a few mm of aluminium.',
  antineutrino: 'ANTINEUTRINO · Also made in beta decay. It has no charge and almost no mass, and hardly interacts with anything. You do not need to know about antineutrinos for GCSE.',
  gamma: 'GAMMA RAY · An electromagnetic wave from the nucleus · No mass, no charge · Weakly ionising, reduced by thick lead or concrete.',
  paper: 'PAPER · One sheet stops alpha particles.',
  aluminium: 'ALUMINIUM · A few millimetres stop beta particles.',
  lead: 'LEAD · Several centimetres reduce gamma rays a lot, but some still get through.'
};
