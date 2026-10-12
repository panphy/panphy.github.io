// Text content for the charges in fields explorer: mode descriptions, particle data,
// control settings and part readouts. Kept separate from the scene code.

export const MODE_ORDER = ['efield', 'bfield', 'selector', 'cyclotron'];

export const MODES = {
  efield: {
    title: 'CHARGE IN AN ELECTRIC FIELD',
    date: 'F = qE · BETWEEN PARALLEL PLATES',
    level: 'GCSE EXTENSION · A LEVEL · IB DP',
    heading: 'A uniform electric field bends a beam into a parabola.',
    description: 'Two parallel plates with a voltage across them make a uniform electric field, E = V/d, pointing from the positive plate to the negative plate. A charged particle between the plates feels a constant force F = qE along the field (positive charges) or against it (negative charges). The particle keeps its horizontal speed, but speeds up steadily across the field: exactly like a ball thrown sideways in gravity.',
    look: 'Fire an electron, then a proton and an alpha particle. Which way does each bend, and why? Raise the voltage or bring the plates closer together and watch the spot on the screen move. Then fire a faster particle: does it bend more or less?',
    evidence: 'Look at the time-lapse dots: they stay evenly spaced across the screen but spread out more and more towards the plate. The horizontal velocity is constant and the vertical velocity grows steadily, as the graph shows. A faster particle spends less time between the plates, so it is deflected less.',
    deeper: 'Between the plates a = qV/(md), the time spent there is t = L/v and the sideways deflection is y = ½at² = qVL²/(2mdv²). The electric field does work on the particle, so its kinetic energy increases. This is how the beam in an old cathode-ray oscilloscope was steered.',
    hint: 'Choose a particle and press “Fire”. Change one setting at a time and compare the tracks.'
  },
  bfield: {
    title: 'CHARGE IN A MAGNETIC FIELD',
    date: 'F = qvB · CIRCLES AND HELICES',
    level: 'A LEVEL · IB DP',
    heading: 'A magnetic force bends the path but never changes the speed.',
    description: 'A charge moving across a magnetic field feels a force F = qvB, at right angles to both its velocity and the field. Because the force is always at right angles to the motion, it changes the direction but not the speed: the particle moves in a circle. The magnetic force provides the centripetal force.',
    look: 'Fire a proton into the field (the field points into the screen). Watch the force arrow: it always points to the centre of the circle. Now try an electron: it circles the other way. Change the speed or the field and see how the radius changes. Then set the angle to 45° to get a helix.',
    evidence: 'Faster particles make bigger circles, and stronger fields make smaller ones, because r = mv/(qB). The kinetic energy graph stays flat: a magnetic force does no work. Any velocity along the field is unaffected, which is why the particle spirals along the field lines: this traps charged particles in Earth’s magnetic field and makes the aurora.',
    deeper: 'Setting qvB = mv²/r gives r = mv/(qB). The time for one orbit, T = 2πm/(qB), does not depend on the speed: faster particles make bigger circles in the same time. This fact makes the cyclotron possible. For a helix only the perpendicular part of the velocity, v sin θ, sets the radius.',
    hint: 'Fire a proton, then change the speed, the field or the particle. Try an angle of 45° for a helix.'
  },
  selector: {
    title: 'VELOCITY SELECTOR',
    date: 'CROSSED E AND B FIELDS',
    level: 'A LEVEL · IB DP',
    heading: 'Only one speed goes straight through.',
    description: 'Here an electric field and a magnetic field act at right angles to each other and to the beam. The electric force qE is the same for every particle, but the magnetic force qvB grows with speed. For one speed, v = E/B, the two forces are equal and opposite, so those particles go straight through the slit. Slower particles are pulled one way, faster ones the other.',
    look: 'Start the beam: particles are coloured by speed, slow (blue) to fast (orange). Which colour passes through the slit? Change the voltage or the field and predict which speed will be selected. Try protons, then alpha particles: does the selected speed change?',
    evidence: 'The selected speed v = E/B does not depend on the charge or the mass, so every kind of particle with that speed passes. Velocity selectors are used at the start of mass spectrometers, so that every ion entering the magnetic field has the same speed.',
    deeper: 'Balance: qE = qvB, so v = E/B = V/(Bd). A particle that is a little too fast feels a larger magnetic force, so it curves towards the magnetic-force side; too slow and the electric force wins. The width of the slit sets how precise the selection is.',
    hint: 'Start the beam, then change the voltage or the field until a different colour passes.'
  },
  cyclotron: {
    title: 'CYCLOTRON',
    date: 'A PARTICLE ACCELERATOR',
    level: 'A LEVEL · IB DP · BEYOND',
    heading: 'Speed up in the gap, turn round in the dees.',
    description: 'A cyclotron has two hollow D-shaped electrodes (dees) between the poles of a large magnet. Inside a dee there is no electric field, so the magnetic field turns the particle in a semicircle. Each time it crosses the gap between the dees, an alternating voltage accelerates it. Faster particles move in bigger semicircles, so the path spirals outwards until the particle leaves at the edge.',
    look: 'Inject a proton and watch the spiral grow. The dees glow red (+) and blue (−) as the voltage alternates. Is every semicircle completed in the same time? Now switch off auto-tuning and change the frequency a little: the particle drifts out of step and stops gaining energy.',
    evidence: 'The time for half a turn, πm/(qB), does not depend on the speed, so a fixed-frequency voltage stays in step with the particle. Each crossing adds qV of kinetic energy, so a bigger gap voltage means fewer turns, but the final energy is set by the magnetic field and the radius of the dees.',
    deeper: 'The cyclotron frequency is f = qB/(2πm). At the edge, r = R, so v = qBR/m and the maximum kinetic energy is Eₖ = q²B²R²/(2m), whatever the gap voltage. At high speeds relativity makes the particle’s orbit period grow, so it falls out of step: synchrocyclotrons and synchrotrons solve this.',
    hint: 'Inject a proton, then compare a stronger field, a bigger gap voltage, or a mistuned frequency.'
  }
};

const E = 1.602177e-19;
// Ranges are in the units shown in each label.
export const PARTICLES = {
  electron: {
    name: 'Electron', symbol: 'e⁻', q: -E, m: 9.109e-31, colour: 'negative',
    speed: { min: 2, max: 40, step: 1, value: 20, unit: 1e6, label: 'Speed v (×10⁶ m/s)' },
    field: { min: 0.5, max: 10, step: 0.5, value: 5 },
    selectorVoltage: { min: 0, max: 200, step: 5, value: 80 },
    selectorField: { min: 0.1, max: 1, step: 0.02, value: 0.4 }
  },
  proton: {
    name: 'Proton', symbol: 'p', q: E, m: 1.6726e-27, colour: 'positive',
    speed: { min: 1, max: 10, step: 0.5, value: 4, unit: 1e5, label: 'Speed v (×10⁵ m/s)' },
    field: { min: 20, max: 500, step: 10, value: 100 },
    selectorVoltage: { min: 0, max: 500, step: 10, value: 200 },
    selectorField: { min: 5, max: 60, step: 1, value: 25 }
  },
  alpha: {
    name: 'Alpha particle', symbol: 'α', q: 2 * E, m: 6.6447e-27, colour: 'alpha',
    speed: { min: 1, max: 10, step: 0.5, value: 4, unit: 1e5, label: 'Speed v (×10⁵ m/s)' },
    field: { min: 20, max: 500, step: 10, value: 200 },
    selectorVoltage: { min: 0, max: 500, step: 10, value: 200 },
    selectorField: { min: 5, max: 60, step: 1, value: 25 }
  }
};

// Particles offered in each mode (electrons are not accelerated in cyclotrons).
export const MODE_PARTICLES = {
  efield: ['electron', 'proton', 'alpha'],
  bfield: ['electron', 'proton', 'alpha'],
  selector: ['electron', 'proton', 'alpha'],
  cyclotron: ['proton', 'alpha']
};

// Steppers. A spec with `from` takes its range from the chosen particle.
export const STEPPERS = {
  voltage: { label: 'Voltage V (V)', min: 0, max: 500, step: 25, value: 200, decimals: 0, aria: 'Plate voltage in volts' },
  separation: { label: 'Plate gap d (cm)', min: 2, max: 8, step: 1, value: 4, decimals: 0, aria: 'Plate separation in centimetres' },
  speed: { label: 'Speed v', from: 'speed', decimals: 1, aria: 'Particle speed' },
  field: { label: 'Field B (mT)', from: 'field', decimals: 1, aria: 'Magnetic flux density in millitesla' },
  angle: { label: 'Angle to field (°)', min: 0, max: 90, step: 15, value: 90, decimals: 0, aria: 'Angle between the velocity and the field in degrees' },
  selectorVoltage: { label: 'Voltage V (V)', from: 'selectorVoltage', decimals: 0, aria: 'Plate voltage in volts' },
  selectorField: { label: 'Field B (mT)', from: 'selectorField', decimals: 2, aria: 'Magnetic flux density in millitesla' },
  cycField: { label: 'Field B (T)', min: 0.2, max: 1.5, step: 0.1, value: 0.5, decimals: 1, aria: 'Magnetic flux density in tesla' },
  gap: { label: 'Gap voltage (kV)', min: 20, max: 200, step: 20, value: 100, decimals: 0, aria: 'Peak gap voltage in kilovolts' },
  frequency: { label: 'Oscillator f (MHz)', min: 1, max: 25, step: 0.1, value: 7.6, decimals: 2, aria: 'Oscillator frequency in megahertz' }
};

export const CONTROLS = {
  efield: { steppers: ['voltage', 'separation', 'speed'], toggles: [['swap', 'Swap plate polarity']] },
  bfield: { steppers: ['speed', 'field', 'angle'], toggles: [['reverseB', 'Reverse the field']] },
  selector: { steppers: ['selectorVoltage', 'selectorField'], toggles: [] },
  cyclotron: { steppers: ['cycField', 'gap', 'frequency'], toggles: [['autotune', 'Auto-tune frequency']] }
};

export const PARTS = {
  plus: 'POSITIVE PLATE · Connected to the + terminal. Field lines start on positive charge.',
  minus: 'NEGATIVE PLATE · Connected to the − terminal. Field lines end on negative charge.',
  efield: 'ELECTRIC FIELD · Uniform between the plates, pointing from + to −. Its strength is E = V/d (in V/m, the same as N/C).',
  bfield: 'MAGNETIC FIELD · Uniform in the shaded region. Seen from the front, the field lines point into the screen, away from you.',
  bfieldOut: 'MAGNETIC FIELD · Uniform in the shaded region. Reversed: seen from the front, the field lines now point out of the screen, towards you.',
  bfieldUp: 'MAGNETIC FIELD · Uniform and vertical through both dees. The field lines run up from the N pole to the S pole.',
  particle: 'PARTICLE · Tap Fire again to send another. The arrows show its velocity (blue) and the force on it (magenta).',
  particleSelector: 'PARTICLE · The arrows show its velocity (blue), the electric force qE (magenta) and the magnetic force qvB (pink).',
  screen: 'FLUORESCENT SCREEN · Glows where a particle lands, marking how far the beam was deflected.',
  gun: 'PARTICLE SOURCE · Sends particles out at a chosen speed. For electrons this would be an electron gun.',
  slit: 'SLIT · Only particles that travel in a straight line through the fields get through.',
  detector: 'DETECTOR · Counts the particles that make it through the slit.',
  dee: 'DEE · A hollow D-shaped electrode. Inside it there is no electric field, so only the magnetic field acts on the particle.',
  gapRegion: 'GAP · The alternating voltage between the dees makes an electric field here that accelerates the particle each time it crosses. The field lines reverse every half cycle.',
  pole: 'MAGNET POLE · The large magnet makes a uniform vertical field through both dees.',
  oscillator: 'OSCILLATOR · Applies an alternating voltage to the dees. It must match the cyclotron frequency f = qB/(2πm).',
  track: 'TRACK · The dots are placed at equal time intervals, so wider spacing means a faster particle.'
};
