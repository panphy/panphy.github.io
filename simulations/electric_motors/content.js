// Text content for the electric motors explorer: mode descriptions, part readouts
// and control settings. Kept separate from the 3D scene code.

export const MODE_ORDER = ['force', 'dc', 'ac'];

export const MODES = {
  force: {
    title: 'THE MOTOR EFFECT',
    date: 'F = BIL · A WIRE IN A MAGNETIC FIELD',
    level: 'GCSE · A LEVEL · IB DP',
    heading: 'A current in a magnetic field feels a force.',
    description: 'A copper rod rests on two metal rails between the poles of a strong magnet. When a current flows through the rod, the magnetic field of the current and the field of the magnet push on each other, so the rod is pushed along the rails. This is the motor effect. The force is biggest when the wire is at 90° to the field, and zero when the wire is parallel to it.',
    look: 'Press “Switch on current” and watch which way the rod rolls. Reverse the current, then flip the magnet: each one reverses the force. Now step the angle down to 0° and watch the force in the graph shrink to nothing. Make the field stronger and the field lines crowd closer together.',
    evidence: 'Use Fleming’s left-hand rule: First finger = Field (N to S), seCond finger = Current (+ to −), thuMb = Motion (force). The three arrows on the rod show the same thing. The size of the force is F = BIL when the wire is at 90° to the field, where B is the magnetic flux density in tesla.',
    deeper: 'For any angle θ between the wire and the field, F = BIL sin θ. Only the component of B at right angles to the wire matters. In vector form F = IL × B, which is why the force is always at right angles to both the current and the field.',
    hint: 'Switch the current on, then change one thing at a time: current, field, angle or direction.'
  },
  dc: {
    title: 'DC MOTOR',
    date: 'SPLIT-RING COMMUTATOR',
    level: 'GCSE · A LEVEL · IB DP',
    heading: 'Two forces turn a coil. A split ring keeps it turning.',
    description: 'A coil of wire sits between two magnetic poles. Current flows one way along one side of the coil and the opposite way along the other side, so the two sides are pushed in opposite directions: up on one side, down on the other. This pair of forces makes a turning effect (a moment) that spins the coil. Every half turn, the split-ring commutator swaps the connections, so the current in the coil reverses and the coil keeps turning the same way.',
    look: 'Switch the motor on and watch the end view. Half-ring A (purple) is joined to coil side A, and half-ring B (green) to side B. Turn on “Pause at each swap” to stop the motor just as the halves change brushes. Compare the side on the right before and after each swap. Then switch to plain rings (no commutator): the coil rocks to a stop instead of spinning. Finally, try “Turn coil to vertical” before switching on: the motor cannot start from that dead spot until you nudge it.',
    evidence: 'Each half-ring touches the + brush for half a turn, then the − brush for the next half. So whichever side of the coil is on the right always gets current in the same direction and is always pushed the same way. That keeps the turning effect in one direction. The swap happens when the coil is vertical: there the forces point straight through the axle and have no turning effect, and the coil’s momentum carries it past. The turning effect is greatest when the plane of the coil is parallel to the field. More current, more turns or a stronger magnet make the motor turn faster.',
    deeper: 'The torque on a coil of N turns and area A is T = BANI cos θ, where θ is the angle between the plane of the coil and the field. The spinning coil also acts as a generator: it produces a back emf that opposes the supply. A motor draws a large current when it starts and a smaller one at full speed.',
    hint: 'Switch the motor on, then change the turns, current or field and compare the speed.'
  },
  ac: {
    title: 'AC MOTOR',
    date: 'SLIP RINGS · SYNCHRONOUS MOTOR',
    level: 'GCSE EXTENSION · A LEVEL · IB DP',
    heading: 'Alternating current reverses by itself.',
    description: 'An alternating current changes direction many times a second. If it reverses at just the right moments, the coil keeps turning without a commutator. The coil is connected through two complete slip rings, so each end of the coil always touches the same brush. This kind of AC motor turns exactly once for every cycle of the supply: it runs in step (synchronous) with the supply.',
    look: 'Switch on the supply with the coil at rest: it shakes, and a big current may even swing it over, but it never keeps turning, because the force keeps reversing. Press “Give it a spin”: the coil is spun up to the supply’s speed and let go at the right moment in the cycle, so it locks in step. Then raise the frequency one step at a time and see how far it can keep up. Turn the peak current down, or hold the frequency button, and watch it drop out of step.',
    evidence: 'Once in step, the current reverses once every half turn, at the same point in each turn. So the turning effect acts one way on average, which is the job the split ring did in the DC motor. With little friction to beat, the reversals come soon after the coil lies along the field, and the coil is pushed forwards and backwards almost equally. The harder the motor has to work, the further the coil lags behind the supply and the nearer the reversals move to vertical, where the split ring made them. That is the most turning effect it can give. This simple motor cannot start itself. It stays in step only while the current gives enough turning effect to beat friction and air resistance, which grow with speed. If the frequency rises too far or too quickly, or the current is too small, it drops out of step and slows to a stop.',
    deeper: 'With I = I₀ sin(2πft), the torque is T = BANI₀ sin(2πft) cos θ. It only averages to a steady turning effect when the coil turns at the supply frequency f, so the motor’s speed is fixed by the supply, not by the load. A bigger load makes the coil lag further behind the supply; beyond the greatest turning effect, ½BANI₀, it drops out of step. Mains at 50 Hz would turn a two-pole synchronous motor at 3000 revolutions per minute.',
    hint: 'Switch the supply on, give the coil a spin, then step the frequency or peak current up or down.'
  },
};

// Tap a part of the apparatus to read its job.
export const PARTS = {
  north: 'NORTH POLE · One end of the magnet. Field lines leave a north pole and go towards a south pole. Every magnet has a north and a south pole: cut one in half and each piece still has both.',
  south: 'SOUTH POLE · The other end of the same magnet. Field lines enter a south pole. Between flat, close poles the field is nearly uniform, so the lines are parallel and evenly spaced.',
  magnet: 'MAGNET · One magnet, bent so its two ends face each other across the gap. The colours mark its ends: north (red) and south (blue). The middle is not a pole. There is no such thing as a magnet with only one pole.',
  field: 'MAGNETIC FIELD · The arrows point from north to south. The closer the lines, the stronger the field (the bigger the flux density B). Change B and count the lines.',
  rod: 'COPPER ROD · A conductor carrying a current across a magnetic field feels a force, F = BIL sin θ. Copper is used because it is a good conductor and is not magnetic.',
  supply: 'DC SUPPLY · Drives a current one way round the circuit. Conventional current flows from + to −.',
  rails: 'RAILS · Carry current to the rod, which can roll along them. The rails are outside the strong field region, so the force on them is tiny.',
  coil: 'COIL · Many turns of insulated copper wire. Each turn feels the same pair of forces, so more turns give a bigger turning effect.',
  axle: 'AXLE · The coil turns about this axis. A force that points straight through the axle has no turning effect.',
  commutator: 'SPLIT-RING COMMUTATOR · Two half-rings, each joined to one end of the coil: A (purple) to side A, B (green) to side B. Every half turn they swap brushes, reversing the current in the coil.',
  sliprings: 'SLIP RINGS · Two complete rings. Each end of the coil always touches the same brush, so the coil gets whatever current the supply gives it.',
  brush: 'BRUSH · A carbon block that presses on the rotating ring to carry current in and out. Carbon conducts and slides smoothly.',
  ac: 'AC SUPPLY · The current changes direction twice every cycle. Its screen works like an oscilloscope (CRO), plotting the supply emf against time: a higher frequency fits more cycles on the screen, and a bigger peak makes a taller wave. In the UK, mains electricity has a frequency of 50 Hz.',
  force: 'FORCE · At right angles to both the current and the field (Fleming’s left-hand rule).',
  current: 'CURRENT · Orange arrows show conventional current direction, from + to − through the external circuit. Optional moving markers show direction, not the speed of individual charges.'
};

// Steppers for each mode. Values are in the units in the label. The buttons move in whole steps;
// a typed value is kept to `precision` decimal places.
export const STEPPERS = {
  current: { label: 'Current I (A)', min: 0, max: 5, step: 0.5, value: 2, decimals: 1, precision: 2, aria: 'Current in amps' },
  field: { label: 'Field B (T)', min: 0.05, max: 0.5, step: 0.05, value: 0.2, decimals: 2, precision: 3, aria: 'Magnetic flux density in tesla' },
  angle: { label: 'Angle θ to field (°)', min: 0, max: 90, step: 15, value: 90, decimals: 0, precision: 1, aria: 'Angle between the wire and the field in degrees' },
  turns: { label: 'Turns N', min: 10, max: 100, step: 10, value: 50, decimals: 0, precision: 0, aria: 'Number of turns on the coil' },
  peak: { label: 'Peak current I₀ (A)', min: 0.5, max: 5, step: 0.5, value: 3, decimals: 1, precision: 2, aria: 'Peak current in amps' },
  frequency: { label: 'Frequency f (Hz, slowed)', min: 0.5, max: 1.5, step: 0.1, value: 0.6, decimals: 1, precision: 2, aria: 'Supply frequency in hertz, slowed down' },
};

export const CONTROLS = {
  force: { steppers: ['current', 'field', 'angle'], toggles: [['reverse', 'Reverse current'], ['flip', 'Flip the magnet']], actions: [] },
  dc: { steppers: ['current', 'turns', 'field'], toggles: [['commutator', 'Split-ring commutator'], ['pauseSwap', 'Pause at each swap'], ['endView', 'End view'], ['reverse', 'Reverse current']], actions: [['vertical', 'Turn coil to vertical']] },
  ac: { steppers: ['peak', 'frequency'], toggles: [], actions: [['vertical', 'Turn coil to vertical']] },
};
