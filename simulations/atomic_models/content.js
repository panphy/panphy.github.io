// Text content for the atomic models explorer: model descriptions, particle
// readouts. Kept separate from the 3D scene code.

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
    hint: 'Fire alpha particles: most pass straight through, but a few bounce back.',
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
  alpha: 'ALPHA PARTICLE · Charge +2 · A helium nucleus, about 7300 times the electron’s mass. Fast and heavy, so only strong forces can turn it.',
  farElectrons: 'TO SCALE · If the nucleus were as big as it looks here, the electrons would be hundreds of metres away. Electrons are so light that they barely affect the alpha particles, so they are moved out of view while the beam runs.'
};

export const ORBITALS = {
  '1s': '1s ORBITAL · 2 electrons · A sphere close to the nucleus: the lowest energy level (n = 1).',
  '2s': '2s ORBITAL · 2 electrons · A larger sphere with an empty shell inside it (a node). Energy level n = 2.',
  '2p': '2p ORBITALS · 2 electrons · One in each of two dumbbell-shaped orbitals (teal and violet), at right angles. Also energy level n = 2.'
};
