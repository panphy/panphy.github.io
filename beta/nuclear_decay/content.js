// Text content for the nuclear decay explorer: mode descriptions, particle
// readouts, isotopes and quiz questions. Kept separate from the 3D scene code.

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
    look: 'Press “Decay this nucleus”. One grey neutron glows, then becomes a red proton as a blue electron leaves. Count the protons before and after: 6 becomes 7, so carbon becomes nitrogen.',
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
  antineutrino: 'ANTINEUTRINO · Also made in beta decay. It has no charge and almost no mass, and hardly interacts with anything. (Beyond GCSE.)',
  gamma: 'GAMMA RAY · An electromagnetic wave from the nucleus · No mass, no charge · Weakly ionising, reduced by thick lead or concrete.',
  paper: 'PAPER · One sheet stops alpha particles.',
  aluminium: 'ALUMINIUM · A few millimetres stop beta particles.',
  lead: 'LEAD · Several centimetres reduce gamma rays a lot, but some still get through.'
};

export const QUESTIONS = {
  alpha: [
    { q: 'What is an alpha particle made of?', choices: ['One electron', '2 protons and 2 neutrons', 'A gamma ray'], correct: 1, why: 'It is a helium nucleus: mass number 4, atomic number 2.', hint: 'Decay the nucleus and tap the particle that leaves.' },
    { q: 'After alpha decay, what happens to the mass number and atomic number?', choices: ['Mass number −4, atomic number −2', 'Both stay the same', 'Mass number stays the same, atomic number +1'], correct: 0, why: '241 − 4 = 237 and 95 − 2 = 93, so americium becomes neptunium.', hint: 'Read the top and bottom numbers in the equation.' },
    { q: 'Which material stops alpha particles?', choices: ['Only thick lead', 'A few mm of aluminium, but not paper', 'A sheet of paper'], correct: 2, why: 'Alpha particles are strongly ionising, so they lose their energy very quickly.', hint: 'Press “Test penetration”.' }
  ],
  beta: [
    { q: 'Where does the electron in beta decay come from?', choices: ['A neutron in the nucleus changes into a proton and an electron', 'An electron shell around the atom', 'It was hiding inside a proton'], correct: 0, why: 'The electron is created in the nucleus when a neutron changes.', hint: 'Watch which particle glows before the electron leaves.' },
    { q: 'Carbon-14 (6 protons) beta decays. How many protons does the new nucleus have?', choices: ['5', '6', '7'], correct: 2, why: 'A neutron became a proton: 6 + 1 = 7, which is nitrogen.', hint: 'Count the protons before and after.' },
    { q: 'Why does the mass number stay at 14?', choices: ['The electron has a mass number of 4', 'One neutron is replaced by one proton, so the nucleon total is unchanged', 'A proton leaves the nucleus'], correct: 1, why: 'Mass number counts protons + neutrons: 8 + 6 = 7 + 7.', hint: 'Add protons and neutrons before and after.' }
  ],
  gamma: [
    { q: 'What is a gamma ray?', choices: ['A fast electron', 'A helium nucleus', 'An electromagnetic wave'], correct: 2, why: 'Gamma rays are high-energy electromagnetic radiation from the nucleus.', hint: 'Tap the wavy packet that leaves the nucleus.' },
    { q: 'What happens to the nucleus when it emits a gamma ray?', choices: ['It loses energy; its protons and neutrons stay the same', 'It becomes a different element', 'Its mass number falls by 4'], correct: 0, why: 'Gamma emission only carries away energy: A and Z do not change.', hint: 'Compare the equation numbers before and after.' },
    { q: 'Why can a gamma tracer be detected outside the body?', choices: ['It is strongly ionising', 'It is very penetrating', 'It is stopped by skin'], correct: 1, why: 'Gamma rays are weakly ionising, so most pass through the body.', hint: 'Press “Test penetration” and see what gets through.' }
  ],
  halflife: [
    { q: 'What is the half-life of a radioactive isotope?', choices: ['Half the time it takes for every nucleus to decay', 'The time for the number of unstable nuclei to halve', 'The age of the sample'], correct: 1, why: 'Half-life is the time for the number of undecayed nuclei, or the count rate, to fall to half.', hint: 'Look where the graph reaches half its starting height.' },
    { q: 'A sample starts with 400 undecayed nuclei. About how many remain after two half-lives?', choices: ['100', '200', '0'], correct: 0, why: '400 → 200 after one half-life → 100 after two.', hint: 'Halve it, then halve it again.' },
    { q: 'Why does the graph wobble around the dashed curve, especially for small samples?', choices: ['The simulation is broken', 'The half-life keeps changing', 'Radioactive decay is random'], correct: 2, why: 'Each nucleus decays at a random moment. Only large numbers follow the curve closely.', hint: 'Run a sample of 100, then 900.' }
  ],
  final: [
    { q: 'Which decay changes neither the mass number nor the atomic number?', choices: ['Alpha', 'Beta', 'Gamma'], correct: 2, why: 'Gamma rays carry energy only.', hint: 'Compare the three equations.' },
    { q: 'Which radiation is the most strongly ionising?', choices: ['Alpha', 'Beta', 'Gamma'], correct: 0, why: 'Alpha particles are large and doubly charged, which is also why they are stopped so easily.', hint: 'Which one is stopped by paper?' },
    { q: 'Complete: ²²⁶₈₈Ra → ²²²₈₆Rn + ?', choices: ['⁰₋₁e (beta)', '⁴₂He (alpha)', 'γ (gamma)'], correct: 1, why: '226 − 222 = 4 and 88 − 86 = 2: a helium nucleus.', hint: 'Subtract the top numbers, then the bottom numbers.' },
    { q: 'A source has a half-life of 8 days. What fraction of the undecayed nuclei remain after 24 days?', choices: ['1/3', '1/8', '1/16'], correct: 1, why: '24 days is three half-lives: ½ × ½ × ½ = 1/8.', hint: 'How many half-lives fit into 24 days?' }
  ]
};
