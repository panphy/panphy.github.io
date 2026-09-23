// Text content for the atomic models explorer: model descriptions, particle
// readouts and quiz questions. Kept separate from the 3D scene code.

export const MODEL_ORDER = ['plum', 'rutherford', 'bohr', 'cloud'];

export const MODELS = {
  plum: {
    title: 'PLUM PUDDING MODEL',
    date: 'THOMSON · 1904',
    heading: 'A positive sphere, with electrons inside.',
    description: 'Negative electrons are embedded in a spread of positive charge, like fruit in a pudding. There is no nucleus in this model.',
    look: 'Zoom inside the sphere. The blue electrons sit inside it, not on an outer shell, and can only vibrate about fixed places. The + marks show positive charge spread through the whole atom.',
    evidence: 'Some alpha particles bounced back in the gold-foil experiment. Spread-out positive charge could not explain these large deflections. Try “Fire alpha particles” to see what this model predicts.',
    hint: 'Try “Fire alpha particles”, then compare with the Rutherford model.',
    positiveLabel: 'Positive charge (spread)'
  },
  rutherford: {
    title: 'RUTHERFORD MODEL',
    date: 'RUTHERFORD · 1911',
    heading: 'A tiny nucleus. Mostly empty space.',
    description: 'Positive charge and most of the mass are concentrated in a tiny central nucleus. Electrons are outside it. This model did not specify fixed electron energy levels.',
    look: 'Find the orange nucleus, then the blue electrons around it. The orbit lines show the paths used in this animation; Rutherford’s model did not specify them. The nucleus is hugely enlarged: a real one is about 1/100 000 of the atom’s width.',
    evidence: 'Most alpha particles passed straight through gold foil; a few turned sharply or bounced back. This supported a small, dense, positive nucleus. The nuclear model alone did not explain atoms’ discrete light spectra.',
    hint: 'Fire alpha particles: most pass straight through. Dashed shots aimed at the nucleus show a bounce-back.',
    positiveLabel: 'Nucleus (positive)'
  },
  bohr: {
    title: 'BOHR MODEL',
    date: 'BOHR · 1913',
    heading: 'Electrons occupy fixed energy levels.',
    description: 'Bohr added allowed energy levels around the nucleus. Our carbon-12 classroom adaptation has six protons, six neutrons and six electrons (2 in the first level, 4 in the second). Neutrons were discovered later, in 1932.',
    look: 'Follow the rings labelled n = 1 and n = 2. Each is an allowed energy level, not a solid track. Electrons in the outer level move more slowly. Press “Excite an electron” to watch a level change.',
    evidence: 'Bohr’s energy levels helped explain hydrogen’s line spectrum: electrons absorb or emit specific amounts of energy when changing levels. More complex atoms needed a later quantum model.',
    hint: 'Tap a proton or neutron, or excite an electron and watch the energy diagram.',
    positiveLabel: 'Proton (positive)'
  },
  cloud: {
    title: 'ELECTRON CLOUD MODEL',
    date: 'SCHRÖDINGER · 1926',
    heading: 'Electrons as clouds of probability.',
    description: 'The modern quantum model keeps Bohr’s energy levels but drops fixed paths. It describes where an electron is likely to be found. Carbon’s six electrons fill the 1s, 2s and 2p orbitals.',
    look: 'Each dot marks a place where an electron could be found; denser regions are more likely. The flicker shows that the position is not fixed. Use “Inspect an orbital” to pick out each shape.',
    evidence: 'Bohr’s model worked for hydrogen but failed for atoms with more electrons. Quantum mechanics, which treats electrons as waves, predicted the spectra and chemistry of all atoms.',
    hint: 'Inspect each orbital to compare the 1s, 2s and 2p shapes.',
    positiveLabel: 'Proton (positive)'
  }
};

export const PARTICLES = {
  electron: 'ELECTRON · Charge −1 · About 1/1836 of a proton’s mass. Marker sizes do not represent mass or actual particle size. Six electrons balance six positive charges in our neutral atom.',
  plumElectron: 'ELECTRON · Charge −1 · In Thomson’s model it sits at a fixed place inside the positive sphere and can only vibrate about that place.',
  proton: 'PROTON · Charge +1 · In the nucleus. Six protons make this atom carbon.',
  neutron: 'NEUTRON · Charge 0 · In the nucleus. Six protons + six neutrons make carbon-12.',
  nucleus: 'NUCLEUS · Small, dense and positive. It contains almost all the atom’s mass.',
  bohrNucleus: 'CARBON-12 NUCLEUS · 6 protons + 6 neutrons in a compact nucleus. It contains almost all the atom’s mass.',
  cloudNucleus: 'NUCLEUS · 6 protons + 6 neutrons. Enlarged here: it is about 1/100 000 of the atom’s width.',
  pudding: 'POSITIVE CHARGE · Spread evenly through the whole atom. There is no nucleus in this model.',
  noNucleus: 'NO NUCLEUS · You are inside the atom now. Positive charge fills the whole pudding. That is the big difference from the later models.',
  alpha: 'ALPHA PARTICLE · Charge +2 · A helium nucleus, about 7300 times the electron’s mass. Fast and heavy, so only strong forces can turn it.'
};

export const ORBITALS = {
  '1s': '1s ORBITAL · 2 electrons · A sphere close to the nucleus: the lowest energy level (n = 1).',
  '2s': '2s ORBITAL · 2 electrons · A larger sphere with an empty shell inside it (a node). Energy level n = 2.',
  '2p': '2p ORBITALS · 2 electrons · One in each of two dumbbell-shaped orbitals (teal and violet), at right angles. Also energy level n = 2.'
};

export const QUESTIONS = {
  plum: [
    { q: 'Does this model have a nucleus?', choices: ['Yes, a small one at the centre', 'No, positive charge is spread through the whole atom', 'Yes, made of electrons'], correct: 1, why: 'Its positive charge is spread throughout the sphere.', hint: 'Zoom inside. Is there a separate central particle?' },
    { q: 'What balances the electrons’ negative charge?', choices: ['Nothing; the atom is negative overall', 'Neutrons around the edge', 'A sphere of spread-out positive charge'], correct: 2, why: 'The positive “pudding” carries the same total charge as the electrons, so the atom is neutral.', hint: 'Look at the + marks.' },
    { q: 'If this model were right, what would happen to alpha particles fired at gold foil?', choices: ['They would pass through with only tiny deflections', 'Many would bounce straight back', 'They would all be absorbed'], correct: 0, why: 'Spread-out charge only produces weak forces, so every alpha particle is deflected by a tiny angle.', hint: 'Press “Fire alpha particles” and watch the paths.' }
  ],
  rutherford: [
    { q: 'Why did most alpha particles pass straight through the gold foil?', choices: ['The nucleus has no charge', 'The atom is mostly empty space', 'Alpha particles are too small to hit anything'], correct: 1, why: 'Most alpha particles did not pass close enough to a nucleus to be strongly deflected.', hint: 'Compare the tiny centre with the space around it.' },
    { q: 'Why did a very few alpha particles bounce back?', choices: ['They came very close to a small, dense, positive nucleus', 'They hit an electron', 'The foil was too thick'], correct: 0, why: 'Only a tiny, concentrated positive charge can push a fast alpha particle back the way it came.', hint: 'Fire alpha particles and watch the dashed shots aimed at the nucleus.' },
    { q: 'Where is almost all of the atom’s mass?', choices: ['Spread evenly through the atom', 'In the electrons', 'In the tiny nucleus'], correct: 2, why: 'The nucleus contains almost all the mass, in a tiny volume.', hint: 'Electrons are very light.' }
  ],
  bohr: [
    { q: 'Can a Bohr electron stay halfway between allowed energy levels?', choices: ['Yes, anywhere between levels', 'No, only at allowed energy levels', 'Only in large atoms'], correct: 1, why: 'In this model an electron must occupy an allowed energy level.', hint: 'The rings represent the allowed energy levels.' },
    { q: 'What happens when an electron absorbs exactly the right amount of energy?', choices: ['It moves to a higher energy level', 'It falls into the nucleus', 'It turns into a proton'], correct: 0, why: 'Absorbing a photon with exactly the energy difference moves it up a level.', hint: 'Press “Excite an electron” and watch the energy diagram.' },
    { q: 'When an electron drops to a lower energy level, what does it emit?', choices: ['A proton', 'Energy as light (a photon)', 'A neutron'], correct: 1, why: 'The energy difference leaves as a photon of one specific colour. This explains line spectra.', hint: 'Watch what leaves the atom after the electron drops back.' }
  ],
  cloud: [
    { q: 'What does a dense region of the cloud show?', choices: ['Where the protons are', 'A solid electron shell', 'Where an electron is most likely to be found'], correct: 2, why: 'The cloud is a map of probability, not a solid object.', hint: 'Each dot is a possible position of an electron.' },
    { q: 'Does this model give each electron a fixed path?', choices: ['No, only the probability of where it is', 'Yes, circular orbits', 'Yes, figure-of-eight paths'], correct: 0, why: 'Quantum mechanics describes likely positions, not paths.', hint: 'Watch the flicker. Is there a track to follow?' },
    { q: 'Which idea from Bohr’s model does it keep?', choices: ['Planetary orbits', 'Electrons have definite energy levels', 'Positive charge spread through the atom'], correct: 1, why: 'Energy levels remain: 1s is level n = 1; 2s and 2p are level n = 2.', hint: 'Inspect the orbitals and read their labels.' }
  ],
  final: [
    { q: 'Which evidence ended the plum pudding model?', choices: ['The discovery of the neutron', 'Alpha particles bouncing back from gold foil', 'Hydrogen’s line spectrum'], correct: 1, why: 'Large deflections needed a small, dense, positive nucleus.', hint: 'Compare the alpha beams in the first two models.' },
    { q: 'Which model first explained hydrogen’s line spectrum?', choices: ['Plum pudding', 'Rutherford', 'Bohr'], correct: 2, why: 'Bohr’s fixed energy levels mean only specific photon energies are emitted.', hint: 'Which model has energy levels and photons?' },
    { q: 'Which order did the models appear in?', choices: ['Rutherford → plum pudding → Bohr → electron cloud', 'Plum pudding → Rutherford → Bohr → electron cloud', 'Bohr → Rutherford → plum pudding → electron cloud'], correct: 1, why: 'Thomson 1904, Rutherford 1911, Bohr 1913, Schrödinger 1926. Each model was changed by new evidence.', hint: 'Check the dates on the model buttons.' }
  ]
};
