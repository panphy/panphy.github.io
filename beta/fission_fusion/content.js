// Text content for the fission and fusion explorer: mode descriptions, particle
// readouts, binding-energy data and quiz questions. Kept separate from the scene code.

export const MODE_ORDER = ['fission', 'chain', 'fusion', 'energy'];

export const MODES = {
  fission: {
    title: 'NUCLEAR FISSION',
    date: 'FISSION · URANIUM-235',
    heading: 'A slow neutron splits a heavy nucleus in two.',
    description: 'Fission means splitting. When a uranium-235 nucleus absorbs a slow neutron it becomes uranium-236, which is unstable. It wobbles, stretches and splits into two smaller nuclei (here barium-141 and krypton-92) and releases 2 or 3 neutrons. The products have a little less mass than the uranium-236 nucleus; the missing mass has become about 170 MeV of energy, mostly the kinetic energy of the fragments.',
    look: 'Press “Fire a neutron”. Watch the neutron join the nucleus, the nucleus wobble and stretch, then split. Count the free neutrons that come out. Then read the equation: the top numbers and the bottom numbers both still add up.',
    evidence: 'The fission fragments fly apart and collide with the atoms around them, heating the fuel: this is the energy a nuclear power station uses. The new neutrons can split other nuclei, which is a chain reaction (next tab). Barium and krypton is only one of many ways uranium can split.',
    hint: 'Fire a neutron, then click a nucleon to see which nucleus it belongs to.'
  },
  chain: {
    title: 'CHAIN REACTION',
    date: 'CHAIN · A BLOCK OF FUEL',
    heading: 'One fission can cause many more.',
    description: 'Each fission releases 2 or 3 neutrons. If, on average, more than one of them goes on to cause another fission, the reaction grows very fast: a chain reaction. Only uranium-235 splits. Uranium-238 (most of natural uranium) absorbs neutrons without splitting, and control rods absorb them too. Fuel nuclei are drawn as plain spheres here; each one splits as in the Fission tab.',
    look: 'Press “Start chain reaction” to fire a burst of neutrons at the block. Watch the fission rate in the graph, then push control rods in one at a time to hold the reaction steady. Try less enriched fuel and see the reaction die away.',
    evidence: 'In a reactor the control rods are set so that, on average, exactly 1 neutron from each fission causes another fission: steady power. In a bomb nothing absorbs the neutrons, and the number of fissions doubles many times in a fraction of a second. Neutrons that escape through the surface are lost, which is why a small lump of fuel cannot sustain a chain reaction.',
    hint: 'Start the reaction, then change the number of control rods and watch k in the graph panel.'
  },
  fusion: {
    title: 'NUCLEAR FUSION',
    date: 'FUSION · DEUTERIUM + TRITIUM',
    heading: 'Light nuclei join, if they can get close enough.',
    description: 'Fusion means joining. Two isotopes of hydrogen, deuterium (1 proton + 1 neutron) and tritium (1 proton + 2 neutrons), can fuse into helium-4 and a fast neutron, releasing 17.6 MeV. Both nuclei are positively charged, so they repel each other. They must move extremely fast, which means the gas must be extremely hot, to get close enough for the strong nuclear force to take over.',
    look: 'Choose a temperature and press “Collide the nuclei”. If it is too cool they slow down, stop and bounce back: watch the energy graph, where the kinetic energy runs out before the top of the barrier. Raise the temperature in steps until they fuse.',
    evidence: 'Stars are fusion reactors: gravity squeezes and heats their cores. On Earth, reactors such as tokamaks hold the very hot gas (a plasma) in magnetic fields, because no solid container could survive it. The fuel is plentiful and the helium product is not radioactive, but getting more energy out than is put in is still a huge engineering challenge.',
    hint: 'Try 50 million °C first, then step the temperature up by 10 until the nuclei fuse.'
  },
  energy: {
    title: 'BINDING ENERGY',
    date: 'ENERGY · WHY BOTH RELEASE ENERGY',
    heading: 'Why do splitting and joining both release energy?',
    description: 'Binding energy per nucleon shows how tightly a nucleus is held together. The curve rises steeply for light nuclei, peaks near iron-56 and falls slowly for heavy nuclei. Moving up the curve means the nucleons end up more tightly bound, and the difference is released as energy. Heavy nuclei split to climb the curve from the right; light nuclei fuse to climb it from the left.',
    look: 'Choose a reaction and watch the arrows: where do the nuclei start and where do they end up? Compare the energy per reaction, per nucleon and per kilogram of fuel. Click a nucleus on the curve to read its binding energy.',
    evidence: 'Fusion climbs a much steeper part of the curve, so it releases more energy per nucleon: about 3.5 MeV per nucleon for deuterium–tritium fusion, against about 0.7 MeV per nucleon for uranium fission. That is roughly five times more energy per kilogram of fuel. Nuclei at the peak, near iron, cannot release energy by fission or by fusion.',
    hint: 'Switch between the two reactions and compare the last row of numbers.'
  }
};

export const PARTICLES = {
  proton: 'PROTON · Charge +1 · Relative mass 1. The number of protons (atomic number) decides the element.',
  neutron: 'NEUTRON · Charge 0 · Relative mass 1. Neutrons can split a heavy nucleus because they are not repelled by its positive charge.',
  gamma: 'GAMMA RAY · An electromagnetic wave from the nucleus, released along with the fragments and neutrons in fission · No mass, no charge · Very penetrating.',
  fuel: 'URANIUM-235 · Unsplit fuel. It splits when it absorbs a neutron.',
  spent: 'SPENT FUEL · A nucleus that has already split. Its radioactive fragments stay in the fuel.',
  u238: 'URANIUM-238 · Absorbs neutrons but does not split, so it slows a chain reaction down.',
  rod: 'CONTROL ROD · Made of a material such as boron or cadmium that absorbs neutrons. Pushing more rods in slows the reaction.'
};

// Total binding energies in MeV (AME) used for the energy tab.
export const NUCLIDES = {
  H2: { name: 'H-2', label: 'deuterium', A: 2, B: 2.224 },
  H3: { name: 'H-3', label: 'tritium', A: 3, B: 8.482 },
  He4: { name: 'He-4', label: 'helium-4', A: 4, B: 28.296 },
  Kr92: { name: 'Kr-92', label: 'krypton-92', A: 92, B: 783.1 },
  Ba141: { name: 'Ba-141', label: 'barium-141', A: 141, B: 1174.0 },
  U236: { name: 'U-236', label: 'uranium-236', A: 236, B: 1790.3 }
};

// Binding energy per nucleon (MeV) against mass number, for well-known nuclei.
export const CURVE = [
  [1, 0], [2, 1.112], [3, 2.827], [4, 7.074], [6, 5.332], [7, 5.606], [9, 6.463], [12, 7.680], [14, 7.476],
  [16, 7.976], [20, 8.032], [24, 8.261], [28, 8.448], [32, 8.493], [40, 8.551], [48, 8.723], [56, 8.790],
  [62, 8.795], [72, 8.731], [90, 8.710], [92, 8.512], [120, 8.505], [141, 8.327], [160, 8.184], [184, 7.936],
  [208, 7.867], [236, 7.586]
];

// Reactions on the energy tab; nuclei are keys of NUCLIDES. `fuelMass` is in atomic mass units.
export const REACTIONS = {
  fission: {
    button: 'Fission of uranium',
    title: 'FISSION',
    from: ['U236'],
    to: ['Ba141', 'Kr92'],
    equation: 'U-235 + n → U-236 → Ba-141 + Kr-92 + 3n',
    fuelMass: 235.04
  },
  fusion: {
    button: 'D–T fusion',
    title: 'FUSION',
    from: ['H2', 'H3'],
    to: ['He4'],
    equation: 'H-2 + H-3 → He-4 + n',
    fuelMass: 5.030
  }
};

export const QUESTIONS = {
  fission: [
    { q: 'What happens to a uranium-235 nucleus when it absorbs a neutron?', choices: ['It becomes unstable uranium-236 and splits into two smaller nuclei', 'It fires out an alpha particle and stays uranium', 'It becomes a larger, stable nucleus'], correct: 0, why: 'Uranium-236 is unstable: it stretches and splits, releasing energy and neutrons.', hint: 'Fire a neutron and watch what happens after it joins the nucleus.' },
    { q: 'In ²³⁵U + ¹n → ¹⁴¹Ba + ⁹²Kr + ? ¹n, how many neutrons come out?', choices: ['1', '2', '3'], correct: 2, why: '235 + 1 = 236 on the left. 141 + 92 = 233, so 3 more nucleons are needed: 3 neutrons.', hint: 'Make the top numbers add up on both sides.' },
    { q: 'Where does the energy released in fission come from?', choices: ['A little of the nuclear mass becomes energy, mostly kinetic energy of the fragments', 'Chemical bonds in uranium breaking', 'Electrons falling into the nucleus'], correct: 0, why: 'The products have slightly less mass than the starting nucleus. E = mc² turns that difference into about 170 MeV.', hint: 'Watch how fast the fragments move apart.' }
  ],
  chain: [
    { q: 'What is a chain reaction?', choices: ['Neutrons from one fission cause more fissions, which release more neutrons', 'A series of alpha decays', 'Nuclei stuck together by chemical bonds'], correct: 0, why: 'Each fission releases neutrons that can trigger further fissions.', hint: 'Start the reaction and watch the graph.' },
    { q: 'What do control rods do in a nuclear reactor?', choices: ['They absorb neutrons so fewer cause fission', 'They release more neutrons', 'They make the fuel hotter'], correct: 0, why: 'Absorbing neutrons keeps the number of fissions steady.', hint: 'Add rods with the + button and watch the fission rate.' },
    { q: 'On average, exactly 1 neutron from each fission causes another fission. What does the reaction do?', choices: ['It runs at a steady rate', 'It grows explosively', 'It stops within a second'], correct: 0, why: 'One new fission per fission keeps the number of fissions per second constant. This is how a reactor is run.', hint: 'Look for k ≈ 1 in the graph panel.' }
  ],
  fusion: [
    { q: 'Why must the nuclei be very hot to fuse?', choices: ['They repel each other, so they need enough kinetic energy to get close together', 'Heat turns protons into neutrons', 'Fusion only happens in gases'], correct: 0, why: 'Both nuclei are positive. Fast, hot nuclei can overcome the repulsion and get close enough for the strong force to bind them.', hint: 'Compare the energy line with the top of the barrier in the graph.' },
    { q: 'In ²H + ³H → ⁴He + ?, what is the missing particle?', choices: ['A proton', 'A neutron', 'An electron'], correct: 1, why: '2 + 3 = 5, and helium-4 has 4, so 1 nucleon is left. The charges balance (1 + 1 = 2 + 0), so it is a neutron.', hint: 'Balance the top and bottom numbers.' },
    { q: 'Where does fusion happen naturally?', choices: ['In the cores of stars such as the Sun', 'In uranium mines', 'In today’s nuclear power stations'], correct: 0, why: 'Stars are hot and dense enough for hydrogen nuclei to fuse.', hint: 'Think about what powers the Sun.' }
  ],
  energy: [
    { q: 'Which nucleus is at the peak of the binding energy per nucleon curve?', choices: ['Hydrogen-2', 'Iron-56', 'Uranium-235'], correct: 1, why: 'Iron-56 (with nickel-62) is the most tightly bound per nucleon.', hint: 'Find the highest point on the curve.' },
    { q: 'Uranium fission releases energy because…', choices: ['the products have more binding energy per nucleon than uranium', 'the products have less binding energy per nucleon than uranium', 'the products are lighter than iron'], correct: 0, why: 'The fragments are higher up the curve, so more binding energy is released as the nucleons become more tightly bound.', hint: 'Compare the heights of U-236, Ba-141 and Kr-92.' },
    { q: 'Compared with fission, fusion releases … per kilogram of fuel.', choices: ['about the same energy', 'more energy', 'far less energy'], correct: 1, why: 'D–T fusion releases about 3.5 MeV per nucleon compared with 0.7 MeV per nucleon for fission.', hint: 'Read the “per kilogram” numbers for both reactions.' }
  ],
  final: [
    { q: 'Which process joins two light nuclei?', choices: ['Fission', 'Fusion', 'Alpha decay'], correct: 1, why: 'Fusion means joining.', hint: 'Fission means splitting.' },
    { q: 'Complete: ²³⁵U + ¹n → ¹⁴⁰Xe + ⁹⁴Sr + ? ¹n', choices: ['1', '2', '3'], correct: 1, why: '236 − (140 + 94) = 2 neutrons. The bottom numbers check: 92 = 54 + 38.', hint: 'Add the top numbers on each side.' },
    { q: 'A power station reactor runs at steady power. On average, how many neutrons from each fission go on to cause another fission?', choices: ['Fewer than 1', 'Exactly 1', 'More than 2'], correct: 1, why: 'Exactly 1 keeps the fission rate constant. The control rods absorb the rest.', hint: 'Recall the chain reaction tab.' },
    { q: 'Why is fusion hard to achieve on Earth?', choices: ['It needs a temperature of about 100 million °C and a way to contain the hot plasma', 'Hydrogen is too radioactive to handle', 'Hydrogen absorbs neutrons too strongly'], correct: 0, why: 'The nuclei must overcome their electrostatic repulsion, and no solid container can hold a plasma that hot.', hint: 'Think about the repulsion between nuclei.' }
  ]
};
