/* Equation toolkit, key words, Unit review and the Triple Science only extension pages for the
   Year 10 Particle Model of Matter workbook; builds window.UNIT from the lesson files.
   Review questions use the fields of the lesson Exam corners (see workbook.js, question());
   answers follow AQA mark schemes, one (1) per mark point. */
(function () {
  "use strict";

  const R = String.raw;
  const F = window.ParticleFigures;
  const { frame3, frame4, frameRe } = window.WB_FRAMES;

  // A triangle's labels are plain text. triple: true puts the equation in the Unit review only.
  const equations = [
    { lesson: 3, eq: R`\(\rho = \dfrac{m}{V}\)`, words: "density = mass ÷ volume", units: "kg/m³, kg, m³ (or g/cm³, g, cm³)", re: R`\(m = \rho\,V\) and \(V = \dfrac{m}{\rho}\)`, tri: { top: "m", bottom: ["ρ", "V"] } },
    { lesson: 6, eq: R`\(E = m\,L\)`, words: "energy for a change of state = mass × specific latent heat", units: "J, kg, J/kg", re: R`\(L = \dfrac{E}{m}\) and \(m = \dfrac{E}{L}\)`, tri: { top: "E", bottom: ["m", "L"] } },
    { lesson: 7, eq: R`\(\Delta E = m\,c\,\Delta\theta\)`, words: "change in thermal energy = mass × specific heat capacity × temperature change", units: "J, kg, J/kg °C, °C", re: R`\(c = \dfrac{\Delta E}{m\,\Delta\theta}\) and \(\Delta\theta = \dfrac{\Delta E}{m\,c}\)`, tri: { top: "ΔE", bottom: ["m", "c", "Δθ"] } },
    { lesson: 8, eq: R`\(E = V\,I\,t\)`, words: "energy supplied = potential difference × current × time", units: "J, V, A, s", re: R`From \(P = V\,I\) and \(E = P\,t\) (Electric Circuits)` },
    { triple: true, lesson: 9, eq: R`\(p\,V = \text{constant}\)`, words: "pressure × volume = constant, for a fixed mass of gas at constant temperature", units: "Pa, m³", re: R`Use it as \(p_1\,V_1 = p_2\,V_2\)` },
  ];

  // [word, meaning, lesson]; lesson 9 marks a Triple Science only word.
  const glossary = [
    ["Particle model", "The idea that all matter is made of tiny particles, whose arrangement and motion explain how solids, liquids and gases behave", 1],
    ["Change of state", "Melting, freezing, boiling, evaporating, condensing or sublimating", 1],
    ["Sublimating", "Changing straight from a solid to a gas", 1],
    ["Physical change", "A change in which no new substance is made; the material recovers its original properties if the change is reversed", 1],
    ["Conserved", "Staying the same in total: mass is conserved in a change of state", 1],
    ["Random motion", "Movement in all directions, at a range of speeds", 2],
    ["Gas pressure", "The force on each square metre of a surface, caused by gas molecules colliding with it", 2],
    ["Density (ρ)", "The mass of each unit of volume, in kg/m³ or g/cm³", 3],
    ["Volume", "The amount of space something takes up, in m³ or cm³", 3],
    ["Displacement", "Finding the volume of an object from the volume of water it pushes out of the way", 4],
    ["Meniscus", "The curved surface of a liquid in a tube; read the bottom of it", 4],
    ["Resolution", "The smallest change in a quantity that an instrument can show", 4],
    ["Internal energy", "The total kinetic energy and potential energy of all the particles that make up a system", 5],
    ["Melting point", "The temperature at which a substance changes between solid and liquid", 5],
    ["Boiling point", "The temperature at which a substance boils, or condenses", 5],
    ["Latent heat", "The energy needed for a substance to change state, with no change in temperature", 6],
    ["Specific latent heat (L)", "The energy needed to change the state of 1 kg of a substance with no change in temperature, in J/kg", 6],
    ["Fusion", "Melting: the change from solid to liquid", 6],
    ["Vaporisation", "The change from liquid to vapour", 6],
    ["Specific heat capacity (c)", "The energy needed to raise the temperature of 1 kg of a substance by 1 °C, in J/kg °C", 7],
    ["Temperature change (Δθ)", "Final temperature minus starting temperature, in °C", 7],
    ["Joulemeter", "A meter that measures the energy supplied to an electrical appliance", 8],
    ["Insulation", "Material that reduces energy transfer to the surroundings", 8],
    ["Pascal (Pa)", "The unit of pressure: 1 Pa = 1 N/m²", 9],
    ["Work", "The transfer of energy by a force", 9],
  ];

  const review = [
    { p: "Draw <strong>one</strong> line from each state of matter to the description of its particles.", marks: 3,
      match: { left: ["solid", "liquid", "gas"], right: ["far apart, moving quickly in all directions", "close together in a regular pattern, vibrating", "close together, moving past each other"], a: [[0, 1], [1, 2], [2, 0]] },
      a: "All three correct (3); two correct (2); one correct (1)." },

    { p: "The box shows the particles in a solid. In the empty box, draw the particles of the same substance as a <strong>liquid</strong>.", marks: 2,
      after: [{ t: "split", left: [{ t: "fig", cls: "fig-small", h: F.oneState("solid") }], right: [{ t: "html", h: `<div class="draw-box"><div class="ans-fig">${F.oneState("liquid")}</div></div>` }] }],
      a: "Particles touching (1); in a random arrangement, about as many as in the solid, the same size (1)." },

    { p: "A sealed flask contains 200 g of ice. The ice melts.<br>(a) State the mass of the water in the flask.<br>(b) Explain your answer.", marks: 2, lines: 3,
      a: "(a) 200 g (1). (b) The number of particles does not change: none are added or removed (1)." },

    { p: "The density of aluminium is 2700 kg/m³. Calculate the mass of an aluminium block of volume 0.040 m³.", marks: 3,
      frame: frameRe, frameA: [R`\(\rho = \dfrac{m}{V}\)`, R`\(m = \rho\,V\) (1)`, R`\(m = 2700 \times 0.040\) (1)`, "108 kg (1)"] },

    { p: "A student measures the density of a metal bolt. The bolt has a mass of 93.6 g. The student lowers it into a measuring cylinder of water.", marks: 5,
      fig: F.displacement({ v1: "40 cm³", v2: "52 cm³" }), figCls: "fig-mid",
      after: [
        { t: "part", p: "(a) Calculate the density of the bolt in g/cm³.", frame: [["Volume"], ["Equation"], ["Substitute"], ["Answer", "unit:"]], frameA: [R`\(V = 52 - 40 = 12\) cm³ (1)`, R`\(\rho = \dfrac{m}{V}\)`, R`\(\rho = \dfrac{93.6}{12}\) (1)`, "7.8 g/cm³ (1)"] },
        { t: "part", p: "(b) The student reads the top of the meniscus both times instead of the bottom. Explain how this affects the volume of the bolt that the student calculates.", lines: 3, a: "It makes no difference (1): both readings are too high by the same amount, so their difference is unchanged (1)." },
      ] },

    { p: "A sealed metal can of air is heated. Explain, in terms of particles, what happens to the pressure of the air.", marks: 3, lines: 5,
      a: "The molecules move faster (their average kinetic energy increases) (1). They collide with the walls more often (1) and with more force, so the pressure increases (1)." },

    { p: "A solid is heated at a steady rate. The graph shows how its temperature changes.", marks: 4,
      fig: F.curve("heat", { letters: true }), figCls: "fig-wide",
      after: [
        { t: "part", p: "(a) Which section shows the substance boiling? {{A|B|C|D*|E}}" },
        { t: "part", p: "(b) Explain why the temperature does not change during section B, even though the substance is still being heated.", lines: 4, a: "The substance is melting (1). The energy supplied increases the potential energy of the particles (1), not their kinetic energy (so the temperature stays constant) (1)." },
      ] },

    { p: "State what is meant by the internal energy of a system.", marks: 2, lines: 2,
      a: "The total kinetic energy and potential energy (1) of all the particles in the system (1)." },

    { p: "Calculate the energy needed to melt 0.25 kg of ice at 0 °C. Specific latent heat of fusion of water = 334 000 J/kg", marks: 2,
      frame: frame3, frameA: [R`\(E = m\,L\)`, R`\(E = 0.25 \times 334\,000\) (1)`, "83 500 J (1)"] },

    { p: "500 g of water is heated from 20 °C to 60 °C. Calculate the energy transferred to the water. Specific heat capacity of water = 4200 J/kg °C", marks: 4,
      frame: [["Convert"], ["Temperature change"], ["Equation"], ["Substitute"], ["Answer", "unit:"]], frameA: ["m = 0.500 kg (1)", R`\(\Delta\theta = 60 - 20 = 40\) °C (1)`, R`\(\Delta E = m\,c\,\Delta\theta\)`, R`\(\Delta E = 0.500 \times 4200 \times 40\) (1)`, "84 000 J (1)"] },

    { p: "A student measures the specific heat capacity of a 1.0 kg iron block with an immersion heater.", marks: 7,
      fig: F.shc({ meter: "vi" }), figCls: "fig-small",
      after: [
        { t: "part", p: R`(a) The heater runs at 12 V and 3.0 A for 300 s. Calculate the energy supplied. Use \(E = V\,I\,t\)`, frame: frame3, frameA: [R`\(E = V\,I\,t\)`, R`\(E = 12 \times 3.0 \times 300\) (1)`, "10 800 J (1)"] },
        { t: "part", p: "(b) The temperature of the block rises by 20 °C. Calculate the specific heat capacity of iron given by these results.", frame: frameRe, frameA: [R`\(\Delta E = m\,c\,\Delta\theta\)`, R`\(c = \dfrac{\Delta E}{m\,\Delta\theta}\) (1)`, R`\(c = \dfrac{10\,800}{1.0 \times 20}\) (1)`, "540 J/kg °C (1)"] },
        { t: "part", p: "(c) The accepted value is 450 J/kg °C. Explain why the student's value is higher, and suggest one improvement.", lines: 3, a: "Some of the energy supplied was transferred to the surroundings, so the temperature rise was smaller than it should be (1). Insulate the block (1)." },
      ] },

    { p: "Give one similarity and one difference between specific heat capacity and specific latent heat.", marks: 2, lines: 3,
      a: "Similarity: both are an amount of energy for 1 kg of a substance (1). Difference: specific heat capacity is for a temperature change of 1 °C; specific latent heat is for a change of state with no temperature change (1)." },
  ];

  const extension = [
    {
      eyebrow: "Triple Science only (AQA Physics 4.3.3.2)", title: "Pressure and volume",
      intro: "Only for students taking GCSE Physics (Triple Science). Combined Science students can skip these pages.",
      learn: [
        { t: "p", h: "A gas can be <strong>compressed</strong> (squashed) or allowed to <strong>expand</strong> by changing the pressure on it. The pressure of a gas produces a net force <strong>at right angles</strong> to the wall of its container, or to any surface in the gas." },
        { t: "sub", h: "Squashing a gas at constant temperature" },
        { t: "fig", cls: "fig-wide", h: F.syringes(), cap: "The same trapped gas, squashed slowly so that its temperature stays the same" },
        { t: "p", h: "The temperature is constant, so the molecules move at the same average speed. In a <strong>smaller</strong> volume they are closer together, so they hit each square centimetre of wall <strong>more often</strong>: the pressure is bigger. In a <strong>bigger</strong> volume the molecules are more spread out and hit the walls less often: the pressure is smaller." },
        { t: "eq", eq: R`\(p\,V = \text{constant}\)`, words: "pressure × volume = constant", units: R`\(p\) in Pa, \(V\) in m³. For a fixed mass of gas at constant temperature.`, re: R`Use it as \(p_1\,V_1 = p_2\,V_2\): before and after. Any units will do if they are the same on both sides.` },
        { t: "split", cls: "narrow-fig", left: [{ t: "p", h: "Halve the volume and the pressure doubles. Three times the volume gives a third of the pressure. Pressure is <strong>inversely proportional</strong> to volume, so a graph of pressure against volume is a curve." }], right: [{ t: "fig", h: F.pvGraph() }] },
        { t: "follow", slide: 50, q: "A gas has a volume of 60 cm³ at a pressure of 100 kPa. It is squashed to 20 cm³ at constant temperature. Calculate the new pressure.", steps: [["Equation", R`\(p_1\,V_1 = p_2\,V_2\)`], ["Rearrange", R`\(p_2 = \dfrac{p_1\,V_1}{V_2}\)`], ["Substitute", R`\(p_2 = \dfrac{100 \times 60}{20}\)`], ["Answer", R`\(p_2 = 300\) kPa`]],
          yt: { q: "A gas has a volume of 40 cm³ at a pressure of 120 kPa. It expands to 80 cm³ at constant temperature. Calculate the new pressure.", steps: [["Equation", R`\(p_1\,V_1 = p_2\,V_2\)`], ["Rearrange", R`\(p_2 = \dfrac{p_1\,V_1}{V_2}\)`], ["Substitute", R`\(p_2 = \dfrac{120 \times 40}{80}\)`], ["Answer", R`\(p_2 = 60\) kPa`]] } },
      ],
      questions: [
        { p: "Draw a ring around the correct answer in each box.", ring: [
          ["The force that a gas exerts on a wall acts", ["along the wall", "at right angles to the wall", "in a random direction"], 1],
          ["A gas expands at constant temperature. Its pressure", ["increases", "decreases", "stays the same"], 1],
        ] },
        { p: "A diver's air bubble has a volume of 12 cm³ where the pressure is 300 kPa. It rises to the surface, where the pressure is 100 kPa. Calculate its volume at the surface. Assume the temperature is constant.", marks: 3, frame: frameRe, frameA: [R`\(p_1\,V_1 = p_2\,V_2\)`, R`\(V_2 = \dfrac{p_1\,V_1}{p_2}\) (1)`, R`\(V_2 = \dfrac{300 \times 12}{100}\) (1)`, "36 cm³ (1)"] },
        { p: "Explain, in terms of particles, why the pressure of a gas decreases when its volume is increased at constant temperature.", marks: 3, lines: 3, a: "The molecules are more spread out (1), so they collide with the walls less often (1). The speed of the molecules has not changed (constant temperature), so the total force on each unit area of wall, the pressure, is smaller (1)." },
      ],
    },
    {
      eyebrow: "Triple Science only (AQA Physics 4.3.3.3)", title: "Doing work on a gas",
      intro: "Only for students taking GCSE Physics (Triple Science).",
      learn: [
        { t: "key", h: "<strong>Work</strong> is the transfer of energy by a force. Doing work on a gas increases the <strong>internal energy</strong> of the gas, and can cause its temperature to increase." },
        { t: "split", left: [
          { t: "p", h: "Block the outlet of a bicycle pump and push the handle in quickly. The pump gets warm." },
          { t: "steps", items: ["Your force moves the piston, so you do <strong>work</strong> on the trapped air.", "Energy is transferred to the air: its <strong>internal energy</strong> increases.", "The molecules bounce off the moving piston faster than they arrived, so their average kinetic energy increases.", "The <strong>temperature</strong> of the air rises."] },
        ], right: [{ t: "fig", h: F.pump() }] },
        { t: "tip", h: "The air heats up when it is squashed <strong>quickly</strong>, because the energy has no time to escape. On the pages before this one, the gas was squashed slowly, so it stayed at the temperature of the room." },
      ],
      questions: [
        { p: "Complete the sentences.", fill: ["Work is the transfer of [[energy|energy / force / pressure]] by a [[force|force / current / temperature]].", "When work is done on a gas, its internal energy [[increases|increases / decreases / stays the same]]."] },
        { p: "A cyclist pumps up a tyre. Explain why the end of the pump becomes warm.", marks: 3, lines: 4, a: "The cyclist does work on the air in the pump (a force compresses it) (1). This transfers energy to the air, increasing its internal energy (1), so the temperature of the air (and then the pump) increases (1)." },
      ],
      quick: { slide: 53, covers: "Triple Science pressure and volume", items: [
        ["In which direction does the force of a gas on a wall act?", "At right angles to the wall."],
        ["The volume of a gas is doubled at constant temperature. What happens to its pressure?", "It halves."],
        ["A gas at 200 kPa and 0.50 m³ expands to 2.0 m³ at constant temperature. Calculate the new pressure.", String.raw`\(p_2 = \dfrac{200 \times 0.50}{2.0} = 50\) kPa`],
        [String.raw`Name the two conditions needed for \(p\,V = \text{constant}\).`, "A fixed mass of gas at a constant temperature."],
        ["What is work?", "The transfer of energy by a force."],
        ["Work is done on a gas. What happens to its internal energy?", "It increases, so the gas can get hotter."],
      ] },
    },
  ];

  window.UNIT = { lessons: window.UNIT_LESSONS.sort((a, b) => a.n - b.n), equations, glossary, review, extension };
})();
