// A.2 deck slides 31–46: momentum, impulse, F = Δp/Δt, collisions and explosions (no 2D collisions). About 30 minutes.
Worksheet({
  header: 'Year 12 / DP Physics',
  kind: 'Classwork',
  title: 'Momentum and collisions',
  file: 'Y12 - A.2 - Momentum and Collisions',
  footer: 'Momentum and Collisions, Year 12: Classwork',
  endLabel: 'End of classwork',
  minutes: 30,
  instructions: [
    'Answer all questions. Show your working and include units where appropriate.',
    'You may use a calculator and a clean copy of the DP Physics data booklet. Use *g* = 9.8~m~s^{-2}.'
  ],
  sections: [
    {
      title: 'Multiple choice',
      minutes: 9,
      items: [
        {
          text: 'Which unit is equivalent to the unit of momentum?',
          options: ['N~s^{-1}', 'N~s', 'kg~m~s^{-2}', 'J~s'],
          columns: 2,
          answer: 'B',
          scheme: '*p* = *mv* has unit kg~m~s^{-1}, and *F*Δ*t* gives N~s = kg~m~s^{-2} × s.'
        },
        {
          text: 'A tennis ball of mass 0.060~kg moving at 20~m~s^{-1} is hit by a racket. It leaves along the same line in the opposite direction at 30~m~s^{-1}. What is the magnitude of the change in momentum of the ball?',
          options: ['0.60~N~s', '1.2~N~s', '1.8~N~s', '3.0~N~s'],
          columns: 2,
          answer: 'D',
          scheme: 'Δ*p* = 0.060 × (30 − (−20)) = 3.0~N~s: the velocities are opposite.'
        },
        {
          text: 'Sand falls vertically onto a horizontal conveyor belt at a rate of 8.0~kg~s^{-1}. The belt moves at a constant speed of 0.60~m~s^{-1}. What horizontal force is needed to keep the belt moving at constant speed?',
          options: ['1.4~N', '4.8~N', '13~N', '78~N'],
          columns: 2,
          answer: 'B',
          scheme: '*F* = \\frac{Δ*p*}{Δ*t*} = 8.0 × 0.60 = 4.8~N: each second 8.0~kg of sand gains 0.60~m~s^{-1}.'
        },
        {
          text: 'Trolley X of mass 2*m* moves with speed *v* towards a stationary trolley Y of mass *m*. The trolleys collide and stick together. What fraction of the initial kinetic energy is transferred to other forms?',
          options: ['0', '\\frac{1}{3}', '\\frac{1}{2}', '\\frac{2}{3}'],
          columns: 2,
          answer: 'B',
          scheme: 'Final speed \\frac{2*v*}{3}. *E*_{k} falls from *mv*² to \\frac{2*mv*²}{3}, so \\frac{1}{3} is transferred.'
        },
        'break',
        {
          text: 'Which quantities are conserved in an inelastic collision between two bodies with no external force?',
          optionHead: ['Momentum', 'Kinetic energy', 'Total energy'],
          options: [
            ['conserved', 'conserved', 'conserved'],
            ['conserved', 'not conserved', 'conserved'],
            ['not conserved', 'not conserved', 'conserved'],
            ['conserved', 'not conserved', 'not conserved']
          ],
          answer: 'B',
          scheme: 'Momentum and total energy are always conserved; kinetic energy decreases.'
        },
        {
          text: 'An object at rest explodes into two pieces, P of mass *m* and Q of mass 3*m*. What is \\frac{kinetic energy of P}{kinetic energy of Q}?',
          options: ['\\frac{1}{3}', '1', '3', '9'],
          columns: 2,
          answer: 'C',
          scheme: 'Equal and opposite momenta, so the lighter piece moves 3 times as fast: \\frac{½*m*(3*v*)²}{½(3*m*)*v*²} = 3.'
        }
      ]
    },
    {
      title: 'Structured questions',
      minutes: 21,
      items: [
        {
          text: 'A small rocket of total mass 640~kg is launched vertically. Its engine ejects 3.2~kg of exhaust gas each second at a speed of 2500~m~s^{-1} relative to the rocket. Air resistance is negligible.',
          body: [
            {
              part: 'Show that the thrust on the rocket is about 8000~N.',
              marks: 2, lines: 3,
              scheme: ['*F* = \\frac{Δ*p*}{Δ*t*} for the gas: \\frac{3.2 × 2500}{1.0} (1); = **8.0 × 10^{3}~N** (1)']
            },
            {
              part: 'Calculate the acceleration of the rocket just after launch.',
              marks: 2, lines: 4,
              scheme: ['Resultant force = 8000 − 640 × 9.8 = 1728~N upward (1); *a* = \\frac{1728}{640} = **2.7~m~s^{-2}** (1)']
            }
          ]
        },
        'break',
        {
          text: 'A football of mass 0.25~kg is at rest. A player kicks the ball. The graph shows how the force on the ball varies with time during the kick.',
          body: [
            {
              figure: 'graph', size: [120, 55],
              x: { min: 0, max: 12, major: 2, minor: 4, label: 'Time / ms', decimals: 0 },
              y: { min: 0, max: 700, major: 100, minor: 5, label: 'Force / N', decimals: 0 },
              path: [[0, 0], [4, 600], [10, 0]]
            },
            {
              part: 'Determine the impulse on the ball.',
              marks: 2, lines: 3,
              scheme: ['Area under the graph: ½ × 600 × (10 × 10^{-3}) (1); = **3.0~N~s** (1)']
            },
            {
              part: 'Calculate the speed of the ball as it leaves the player’s foot.',
              marks: 1, lines: 2,
              scheme: '\\frac{3.0}{0.25} = **12~m~s^{-1}** (1). Allow ecf from (a).'
            },
            {
              part: 'The player kicks an identical ball with a softer boot. The ball leaves with the same speed but the time of contact is longer. Explain the effect on the maximum force on the ball.',
              marks: 2, lines: 4,
              scheme: ['Same change in momentum, so the same impulse or area under the graph (1)', 'Over a longer time, so the average and maximum force are **smaller** (1)']
            }
          ]
        },
        'break',
        {
          text: 'Trolley A of mass 1.5~kg moves at 4.0~m~s^{-1} along a horizontal frictionless track. It collides with trolley B of mass 0.50~kg, which is at rest. After the collision, trolley A moves at 2.5~m~s^{-1} in its original direction.',
          body: [
            {
              part: 'Calculate the velocity of trolley B after the collision.',
              marks: 2, lines: 3,
              scheme: ['1.5 × 4.0 = 1.5 × 2.5 + 0.50*v*_{B} (1); *v*_{B} = **4.5~m~s^{-1}** in the original direction of A (1)']
            },
            {
              part: 'Determine whether the collision is elastic.',
              marks: 2, lines: 4,
              scheme: ['Kinetic energy before 12.0~J; after 4.69 + 5.06 = 9.75~J (1)', 'Kinetic energy decreases, so the collision is **inelastic** (1). Allow ecf from (a).']
            },
            { p: 'The trolleys are now held at rest with a compressed spring between them. When they are released, trolley A moves to the left at 0.80~m~s^{-1}.' },
            {
              part: 'Determine the velocity of trolley B.',
              marks: 2, lines: 3,
              scheme: ['Total momentum stays zero: 0 = 1.5 × (−0.80) + 0.50*v*_{B} (1); *v*_{B} = **2.4~m~s^{-1} to the right** (1)']
            },
            {
              part: 'Calculate the energy that was stored in the spring.',
              marks: 2, lines: 3,
              scheme: ['½ × 1.5 × 0.80² + ½ × 0.50 × 2.4² (1); = 0.48 + 1.44 = **1.9~J** (1). Allow ecf from (c).']
            }
          ]
        }
      ]
    }
  ]
});
