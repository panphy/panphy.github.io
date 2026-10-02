// Text content for the electric motors explorer: mode descriptions, part readouts,
// control settings and quiz questions. Kept separate from the 3D scene code.

export const MODE_ORDER = ['force', 'dc', 'ac', 'induction'];

export const MODES = {
  force: {
    title: 'THE MOTOR EFFECT',
    date: 'F = BIL · A WIRE IN A MAGNETIC FIELD',
    level: 'GCSE · A LEVEL · IB DP',
    heading: 'A current in a magnetic field feels a force.',
    description: 'A copper rod rests on two metal rails between the poles of a strong magnet. When a current flows through the rod, the magnetic field of the current and the field of the magnet push on each other, so the rod is pushed along the rails. This is the motor effect. The force is biggest when the wire is at 90° to the field, and zero when the wire is parallel to it.',
    look: 'Press “Switch on current” and watch which way the rod rolls. Reverse the current, then flip the magnet: each one reverses the force. Now step the angle down to 0° and watch the force in the graph shrink to nothing.',
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
    look: 'Switch the motor on and follow the force arrows as the coil turns. When is the turning effect largest? Watch the gaps in the split ring pass the brushes. Then switch to plain rings (no commutator): the coil rocks to a stop instead of spinning.',
    evidence: 'The turning effect is greatest when the plane of the coil is parallel to the field, and zero when the coil is vertical, because then the forces point straight through the axle. The coil’s momentum carries it past this point, and the commutator reverses the current just in time. More current, more turns or a stronger magnet make the motor turn faster.',
    deeper: 'The torque on a coil of N turns and area A is T = BANI cos θ, where θ is the angle between the plane of the coil and the field. The spinning coil also acts as a generator: it produces a back emf that opposes the supply. A motor draws a large current when it starts and a smaller one at full speed.',
    hint: 'Switch the motor on, then change the turns, current or field and compare the speed.'
  },
  ac: {
    title: 'AC MOTOR',
    date: 'SLIP RINGS · SYNCHRONOUS MOTOR',
    level: 'GCSE EXTENSION · A LEVEL · IB DP',
    heading: 'Alternating current reverses by itself.',
    description: 'An alternating current changes direction many times a second. If it reverses at just the right moments, the coil keeps turning without a commutator. The coil is connected through two complete slip rings, so each end of the coil always touches the same brush. This kind of AC motor turns exactly once for every cycle of the supply: it runs in step (synchronous) with the supply.',
    look: 'Switch on the supply with the coil at rest: it just shakes, because the force keeps reversing. Press “Give it a spin” to start it near the right speed. Watch it lock in step with the supply. Then change the frequency and see whether it can keep up.',
    evidence: 'Once in step, the current reverses each time the coil passes the vertical position, which is exactly the job the split ring did in the DC motor. This simple motor cannot start itself, and it stalls if the frequency changes too quickly. Many AC motors use a rotating magnetic field instead (next tab).',
    deeper: 'With I = I₀ sin(2πft), the torque is T = BANI₀ sin(2πft) cos θ. It only averages to a steady turning effect when the coil turns at the supply frequency f, so the motor’s speed is fixed by the supply, not by the load. Mains at 50 Hz would turn a two-pole synchronous motor at 3000 revolutions per minute.',
    hint: 'Switch the supply on, give the coil a spin, then step the frequency up or down.'
  },
  induction: {
    title: 'INDUCTION MOTOR',
    date: 'THREE-PHASE · ROTATING MAGNETIC FIELD',
    level: 'A LEVEL · IB DP · BEYOND',
    heading: 'A rotating field drags the rotor round.',
    description: 'Three pairs of coils around the outside (the stator) carry three alternating currents, each a third of a cycle behind the last. Together they make a magnetic field that rotates. The rotor is a “squirrel cage” of copper bars with no electrical connections at all. The moving field induces currents in the bars, and those currents feel a force in the field, so the rotor is dragged round after the field.',
    look: 'Switch on the supply and watch the big field arrow rotate as the three coil currents rise and fall. The rotor follows, but always a little slower. Add load and watch the slip grow on the graph. Swap two phases to reverse the motor.',
    evidence: 'If the rotor ever caught up with the field, there would be no relative motion, no induced current and no force. So an induction motor always runs slightly slower than the field: this difference is called slip. Induction motors are rugged and cheap, and power most fans, pumps and factory machines.',
    deeper: 'Faraday’s and Lenz’s laws at work: the emf in each bar is proportional to the rate at which it cuts the field, which depends on the slip, s = (nₛ − n)/nₛ. Lenz’s law says the induced currents oppose the relative motion, so they pull the rotor along with the field. With more load the rotor slows, the slip increases and the torque rises to match, until the load passes the peak (pull-out) torque and the motor stalls.',
    hint: 'Switch on the supply, then add load in steps and watch the operating point on the torque–speed graph.'
  }
};

// Tap a part of the apparatus to read its job.
export const PARTS = {
  north: 'NORTH POLE · Magnetic field lines leave a north pole and go towards a south pole.',
  south: 'SOUTH POLE · Field lines enter a south pole. Between flat, close poles the field is nearly uniform.',
  field: 'MAGNETIC FIELD · The arrows point from north to south. The closer the lines, the stronger the field (the bigger the flux density B).',
  rod: 'COPPER ROD · A conductor carrying a current across a magnetic field feels a force, F = BIL sin θ. Copper is used because it is a good conductor and is not magnetic.',
  rails: 'RAILS · Carry current to the rod, which can roll along them. The rails are outside the strong field region, so the force on them is tiny.',
  supply: 'DC SUPPLY · Drives a current one way round the circuit. Conventional current flows from + to −.',
  coil: 'COIL · Many turns of insulated copper wire. Each turn feels the same pair of forces, so more turns give a bigger turning effect.',
  axle: 'AXLE · The coil turns about this axis. A force that points straight through the axle has no turning effect.',
  commutator: 'SPLIT-RING COMMUTATOR · Two half-rings, each joined to one end of the coil. Every half turn they swap brushes, reversing the current in the coil.',
  sliprings: 'SLIP RINGS · Two complete rings. Each end of the coil always touches the same brush, so the coil gets whatever current the supply gives it.',
  brush: 'BRUSH · A carbon block that presses on the rotating ring to carry current in and out. Carbon conducts and slides smoothly.',
  ac: 'AC SUPPLY · The current changes direction twice every cycle. In the UK, mains electricity has a frequency of 50 Hz.',
  stator: 'STATOR · The fixed outer part of the motor: an iron ring with coils on its poles.',
  phase1: 'PHASE 1 COIL PAIR · Fed by one of the three alternating currents. The coils on opposite sides make a north pole and a south pole.',
  phase2: 'PHASE 2 COIL PAIR · Its current is a third of a cycle (120°) behind phase 1.',
  phase3: 'PHASE 3 COIL PAIR · Its current is a third of a cycle behind phase 2. Swapping any two phases reverses the field’s rotation.',
  cage: 'SQUIRREL-CAGE ROTOR · Copper bars joined by end rings. The rotating field induces currents in the bars (bright = current out of the front, blue = into it).',
  resultant: 'RESULTANT FIELD · The fields of the three coil pairs add up to one field of constant strength that rotates once per supply cycle.',
  force: 'FORCE · At right angles to both the current and the field (Fleming’s left-hand rule).',
  current: 'CURRENT · The moving arrows show conventional current, from + to −.'
};

// Steppers for each mode. Values are in the units in the label.
export const STEPPERS = {
  current: { label: 'Current I (A)', min: 0, max: 5, step: 0.5, value: 2, decimals: 1, aria: 'Current in amps' },
  field: { label: 'Field B (T)', min: 0.05, max: 0.5, step: 0.05, value: 0.2, decimals: 2, aria: 'Magnetic flux density in tesla' },
  angle: { label: 'Angle θ to field (°)', min: 0, max: 90, step: 15, value: 90, decimals: 0, aria: 'Angle between the wire and the field in degrees' },
  turns: { label: 'Turns N', min: 10, max: 100, step: 10, value: 50, decimals: 0, aria: 'Number of turns on the coil' },
  peak: { label: 'Peak current I₀ (A)', min: 0.5, max: 5, step: 0.5, value: 3, decimals: 1, aria: 'Peak current in amps' },
  frequency: { label: 'Frequency f (Hz, slowed)', min: 0.5, max: 1.5, step: 0.1, value: 0.6, decimals: 1, aria: 'Supply frequency in hertz, slowed down' },
  supply: { label: 'Frequency f (Hz, slowed)', min: 0.2, max: 1, step: 0.1, value: 0.5, decimals: 1, aria: 'Supply frequency in hertz, slowed down' },
  load: { label: 'Load (% of peak torque)', min: 0, max: 100, step: 10, value: 20, decimals: 0, aria: 'Load torque as a percentage of the peak torque' }
};

export const CONTROLS = {
  force: { steppers: ['current', 'field', 'angle'], toggles: [['reverse', 'Reverse current'], ['flip', 'Flip the magnet']] },
  dc: { steppers: ['current', 'turns', 'field'], toggles: [['commutator', 'Split-ring commutator'], ['reverse', 'Reverse current']] },
  ac: { steppers: ['peak', 'frequency'], toggles: [] },
  induction: { steppers: ['supply', 'load'], toggles: [['swap', 'Swap two phases']] }
};

export const QUESTIONS = {
  force: [
    { q: 'A wire carries a current at right angles to a magnetic field. What happens?', choices: ['It feels a force at right angles to both the current and the field', 'It feels a force along the direction of the current', 'Nothing, unless the wire is made of iron'], correct: 0, why: 'This is the motor effect. Fleming’s left-hand rule gives the direction of the force.', hint: 'Switch on the current and compare the three arrows on the rod.' },
    { q: 'B = 0.20 T, I = 2.0 A and 5.0 cm of wire is in the field, at 90° to it. What is the force?', choices: ['0.020 N', '0.20 N', '2.0 N'], correct: 0, why: 'F = BIL = 0.20 × 2.0 × 0.050 = 0.020 N. Remember to convert 5.0 cm to 0.050 m.', hint: 'Use F = BIL with the length in metres.' },
    { q: 'The wire is turned until it is parallel to the magnetic field. What is the force now?', choices: ['Zero', 'Half as big', 'The biggest possible'], correct: 0, why: 'F = BIL sin θ, and sin 0° = 0. A current along the field lines feels no force.', hint: 'Step the angle down to 0° and watch the graph.' }
  ],
  dc: [
    { q: 'Why do the two sides of the coil move in opposite directions?', choices: ['The current flows in opposite directions along the two sides', 'One side is nearer the north pole', 'The commutator pushes one side'], correct: 0, why: 'Same field, opposite current, so opposite forces. Together they make a turning effect.', hint: 'Follow the current arrows along each long side of the coil.' },
    { q: 'What does the split-ring commutator do?', choices: ['Reverses the current in the coil every half turn', 'Makes the magnetic field stronger', 'Changes direct current into alternating current in the supply'], correct: 0, why: 'Reversing the current each half turn keeps the turning effect in the same direction.', hint: 'Switch to plain rings and see what goes wrong.' },
    { q: 'Which change would NOT make the motor spin faster?', choices: ['Reversing the current', 'Using more turns of wire', 'Using a stronger magnet'], correct: 0, why: 'Reversing the current only reverses the direction of rotation.', hint: 'Try each change and watch the speed in the readout.' }
  ],
  ac: [
    { q: 'Why does a simple AC motor not need a split-ring commutator?', choices: ['The supply current reverses by itself', 'AC produces no force on a coil', 'Slip rings reverse the current'], correct: 0, why: 'Alternating current changes direction on its own. If the coil turns in step, it reverses at the right moments.', hint: 'Watch the current graph while the coil is running in step.' },
    { q: 'A synchronous motor is in step with a 0.6 Hz supply. How many turns does it make each second?', choices: ['0.6', '1.2', '6'], correct: 0, why: 'A two-pole synchronous motor turns once per cycle of the supply.', hint: 'Compare the speed readout with the frequency once it is in step.' },
    { q: 'The coil is at rest when the AC supply is switched on. What happens?', choices: ['It shakes but does not start turning', 'It starts turning at full speed', 'It turns slowly and speeds up'], correct: 0, why: 'The force reverses many times a second, so it averages to zero on a stationary coil. This motor must be started by something else.', hint: 'Reset, then switch on the supply without giving it a spin.' }
  ],
  induction: [
    { q: 'How does current get into the rotor bars of an induction motor?', choices: ['It is induced by the rotating magnetic field', 'Through brushes and slip rings', 'Through a split-ring commutator'], correct: 0, why: 'The bars cut through the moving field, so currents are induced in them. There are no electrical connections to the rotor.', hint: 'Look for any wires going to the rotor.' },
    { q: 'Why can the rotor never quite catch up with the rotating field?', choices: ['At the same speed there would be no induced current and so no force', 'Friction always stops it', 'The field gets weaker as the rotor speeds up'], correct: 0, why: 'Induction needs relative motion. The difference in speed is the slip.', hint: 'Set the load to 0% and watch the slip.' },
    { q: 'The load on an induction motor increases. What happens?', choices: ['It slows a little, the slip rises and the torque increases', 'It speeds up', 'Its speed stays exactly fixed by the supply'], correct: 0, why: 'More slip means bigger induced currents and more torque, until the load is balanced again.', hint: 'Add load in steps and follow the operating point on the graph.' }
  ],
  final: [
    { q: 'In Fleming’s left-hand rule, what does the first finger point along?', choices: ['The magnetic field, from N to S', 'The current', 'The force'], correct: 0, why: 'First finger = Field, seCond finger = Current, thuMb = Motion.', hint: 'F for First, F for Field.' },
    { q: 'A 50-turn coil has sides 4.0 cm long in a 0.20 T field. The current is 2.0 A. What is the force on one side of the coil?', choices: ['0.80 N', '0.016 N', '8.0 N'], correct: 0, why: 'F = BILN = 0.20 × 2.0 × 0.040 × 50 = 0.80 N. Each turn adds its own force.', hint: 'Find F = BIL for one turn, then multiply by the number of turns.' },
    { q: 'Where is the turning effect on a DC motor coil zero?', choices: ['When the plane of the coil is at right angles to the field', 'When the plane of the coil is parallel to the field', 'It is never zero'], correct: 0, why: 'In that position the forces on the two sides point straight through the axle, so they have no moment.', hint: 'Recall where the coil passes the commutator gaps.' },
    { q: 'Which motor’s speed is fixed by the supply frequency, whatever the load (until it stalls)?', choices: ['The synchronous AC motor', 'The induction motor', 'The DC motor'], correct: 0, why: 'A synchronous motor turns exactly once per cycle. An induction motor always slips a little, more under heavier load.', hint: 'Compare the AC motor and induction motor tabs.' }
  ]
};
