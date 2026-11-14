// Text content for the atomic models explorer: model descriptions, particle
// readouts. Kept separate from the 3D scene code.

export const MODEL_ORDER = ['plum', 'rutherford', 'bohr', 'cloud'];

export const MODELS = {
  plum: {
    title: 'PLUM PUDDING MODEL',
    heading: 'A positive sphere, with electrons inside.',
    description: 'Negative electrons are embedded in a spread of positive charge, like fruit in a pudding. There is no nucleus in this model.',
    look: 'Zoom inside the sphere. The blue electrons sit inside it, not on an outer shell, and can only vibrate about fixed places. The + marks show positive charge spread through the whole atom.',
    evidence: 'Some alpha particles bounced back in the gold-foil experiment. Spread-out positive charge could not explain these large deflections. Try “Fire alpha particles” to see what this model predicts.',
    positiveLabel: 'Positive charge (spread)'
  },
  rutherford: {
    title: 'RUTHERFORD MODEL',
    heading: 'A tiny nucleus. Mostly empty space.',
    description: 'Positive charge and most of the mass are concentrated in a tiny central nucleus. Electrons are outside it. This model did not specify fixed electron energy levels.',
    look: 'Find the orange nucleus, then the blue electrons around it. The orbit lines show the paths used in this animation; Rutherford’s model did not specify them. The nucleus is hugely enlarged: a real one is about 1/100 000 of the atom’s width.',
    evidence: 'Most alpha particles passed straight through gold foil; a few turned sharply or bounced back. This supported a small, dense, positive nucleus. The nuclear model alone did not explain atoms’ discrete light spectra.',
    positiveLabel: 'Nucleus (positive)'
  },
  bohr: {
    title: 'BOHR MODEL',
    heading: 'Electrons occupy fixed energy levels.',
    description: 'Bohr added allowed energy levels around the nucleus. Our carbon-12 classroom adaptation has six protons, six neutrons and six electrons (2 in the first level, 4 in the second). Neutrons were discovered later, in 1932.',
    look: 'Follow the rings labeled \\(n = 1\\) and \\(n = 2\\). Each is an allowed energy level, not a solid track. Electrons in the outer level move more slowly. Press “Excite an electron” to watch a level change.',
    evidence: 'Bohr’s energy levels helped explain hydrogen’s line spectrum: electrons absorb or emit specific amounts of energy when changing levels. More complex atoms needed a later quantum model.',
    positiveLabel: 'Proton (positive)'
  },
  cloud: {
    title: 'ELECTRON CLOUD MODEL',
    heading: 'Electrons as clouds of probability.',
    description: 'The quantum model keeps Bohr’s energy levels but drops fixed paths. Each electron is described by a wavefunction \\(\\psi\\), and \\(|\\psi|^2\\) gives the probability of finding it at each place. Carbon’s six electrons fill the orbitals \\(\\mathrm{1s^2\\,2s^2\\,2p^2}\\).',
    look: 'Press “Measure the position” a few times: each result is one dot, and no path joins them. Thousands of results build the cloud. Then pick an orbital to see its shape, and compare the graph of \\(P(r)\\) with the cloud.',
    evidence: 'Bohr’s model worked for hydrogen but failed for atoms with more electrons, and it could not say why only some orbits were allowed. Treating the electron as a standing wave explains the allowed energies, and quantum mechanics went on to predict the spectra and chemistry of all atoms.',
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
  pudding: 'POSITIVE CHARGE · Spread evenly through the whole atom. There is no nucleus in this model.',
  noNucleus: 'NO NUCLEUS · You are inside the atom now. Positive charge fills the whole pudding. That is the big difference from the later models.',
  alpha: 'ALPHA PARTICLE · Charge +2 · A helium nucleus, about 7300 times the electron’s mass. Fast and heavy, so only strong forces can turn it.',
  farElectrons: 'TO SCALE · If the nucleus were as big as it looks here, the electrons would be hundreds of meters away. Electrons are so light that they barely affect the alpha particles, so they are moved out of view while the beam runs.'
};

export const ORBITALS = {
  all: 'CARBON · \\(\\mathrm{1s^2\\,2s^2\\,2p^2}\\) · Each dot is a place where one of the six electrons could be found. Press “Measure the position” to see where the cloud comes from, or pick one or more orbitals to see their shapes.',
  '1s': '1s ORBITAL · \\(n = 1\\), \\(l = 0\\) · 2 electrons with opposite spins. A sphere. The dots are densest at the nucleus, yet the most likely distance is the peak of \\(P(r)\\), further out: a wider shell has more room.',
  '2s': '2s ORBITAL · \\(n = 2\\), \\(l = 0\\) · 2 electrons. A larger sphere with a radial node: a spherical surface where the probability is zero, seen as the gap in \\(P(r)\\).',
  '2px': '\\(\\mathrm{2p}_x\\) ORBITAL · \\(n = 2\\), \\(l = 1\\) · 1 electron. Two lobes along the x axis. The plane between them, through the nucleus, is a node: the electron is never found there.',
  '2py': '\\(\\mathrm{2p}_y\\) ORBITAL · \\(n = 2\\), \\(l = 1\\) · 1 electron. The same shape and energy as \\(\\mathrm{2p}_x\\), along the y axis. Carbon’s two 2p electrons occupy different orbitals (Hund’s rule).',
  '2pz': '\\(\\mathrm{2p}_z\\) ORBITAL · \\(n = 2\\), \\(l = 1\\) · Empty in carbon’s ground state, so there is nothing to measure and no count. The gray dots show where an electron would be found if it were excited into this orbital.'
};
