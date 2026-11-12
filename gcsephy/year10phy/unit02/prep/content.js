/* Prep sheets for Particle Model of Matter: one per two lessons, 10 marks each.
   Do Now questions are from the Do Now bank (gcsephy/do-now/questions.csv, by Number); the rest
   checks the key ideas of the two lessons. Diagrams come from ../assets/figures.js
   (window.ParticleFigures). Maths is LaTeX between \( and \), typeset by MathJax.
   Rendered by /gcsephy/assets/prep/prep.js, which documents the fields. */
(function () {
  "use strict";
  const R = String.raw;
  const F = window.ParticleFigures;
  const fig = (svg, w) => `<div style="max-width:${w}mm;margin:0 auto">${svg}</div>`;

  window.PREP = {
    year: 10,
    unit: "Particle Model of Matter",
    file: "Particle Model of Matter - Year 10",
    preps: [
      /* 1 */
      { lessons: "1–2", title: "Particles and gas pressure", subtitle: "Solids, liquids and gases; changes of state; what causes gas pressure",
        doNow: [
          [132, "State the frequency and potential difference of the UK mains electricity supply.", "50 Hz and about 230 V"],
          [136, "State the function of the earth wire in a three-core cable.", "It is a safety wire that stops the appliance becoming live."],
          [108, "State the two measurements needed to find the resistance of a component.", "The potential difference across it and the current through it"],
        ],
        questions: [
          { stem: "The diagrams show the particles in a solid, a liquid and a gas.",
            fig: fig(F.states({ labels: false }), 92),
            parts: [
              { q: "The diagram that shows a liquid is {{A|B*|C}}", m: 1, lines: 0 },
              { q: "Describe the arrangement and the motion of the particles in a gas.", m: 2, lines: 2, a: "Far apart, in a random arrangement ✓<br>moving quickly in all (random) directions ✓" },
            ] },
          { q: "A 30 g ice cube melts in a sealed bag. The mass of the water is {{less than 30 g|30 g*|more than 30 g}}", m: 1, lines: 0 },
          { q: "A sealed can of gas is heated. Explain, in terms of particles, why the pressure of the gas increases.", m: 3, lines: 3,
            a: "The particles move faster (gain kinetic energy) ✓<br>They hit the walls more often ✓<br>and with a bigger force ✓" },
        ] },

      /* 2 */
      { lessons: "3–4", title: "Density", subtitle: R`\(\rho = \dfrac{m}{V}\); measuring the density of solids and liquids (required practical)`,
        doNow: [
          [148, "State the function of transformers.", "To increase or decrease the potential difference."],
          [170, "Describe the motion of particles in a solid.", "They vibrate around a fixed position."],
          [212, "Describe the cause of gas pressure.", "Gas particles colliding with the walls of the container."],
        ],
        questions: [
          { stem: R`A block of aluminium has a mass of 540 g and a volume of 200 cm³. Use \(\rho = \dfrac{m}{V}\)`,
            q: "Calculate the density of aluminium in g/cm³.", m: 3, lines: 3,
            a: R`\(\rho = \dfrac{m}{V}\) ✓<br>\(\rho = \dfrac{540}{200}\) ✓<br>\(\rho = 2.7\) g/cm³ ✓` },
          { stem: "A student lowers a stone into a measuring cylinder of water.",
            side: fig(F.displacement({ v1: "30 cm³", v2: "45 cm³" }), 70), cols: "1.2fr 1fr",
            parts: [
              { q: "Calculate the volume of the stone.", m: 1, lines: 1, a: "45 − 30 = 15 cm³ ✓" },
              { q: "The scale is read at the {{top|bottom*}} of the meniscus.", m: 1, lines: 0 },
            ] },
          { q: "Explain why a gas has a much lower density than a liquid.", m: 2, lines: 2,
            a: "The particles in a gas are much further apart ✓<br>so there is less mass in the same volume ✓" },
        ] },

      /* 3 */
      { lessons: "5–6", title: "Internal energy and latent heat", subtitle: R`Heating graphs; changes of state at constant temperature; \(E = m\,L\)`,
        doNow: [
          [165, "Define density.", "The mass per unit volume of a substance."],
          [179, "Name the method used to measure the volume of an irregularly shaped object.", "The displacement method"],
          [213, "A gas is heated at constant volume. State what happens to its pressure.", "The pressure increases."],
        ],
        questions: [
          { stem: "A solid is heated at a steady rate until it becomes a gas.",
            side: fig(F.curve("heat", { letters: true, w: 250, h: 130 }), 74), cols: "1fr 1.1fr",
            parts: [
              { q: "The section that shows the substance melting is {{A|B*|C|D|E}}", m: 1, lines: 0 },
              { q: "In section C the substance is a {{solid|liquid*|gas}}", m: 1, lines: 0 },
              { q: "Explain why the temperature does not change while the substance melts.", m: 2, lines: 3, a: "The energy supplied increases the potential energy of the particles ✓<br>not their kinetic energy ✓" },
            ] },
          { stem: R`Specific latent heat of vaporisation of water = 2 260 000 J/kg. Use \(E = m\,L\)`,
            q: "Calculate the energy needed to boil away 0.50 kg of water at 100 °C.", m: 3, lines: 3,
            a: R`\(E = m\,L\) ✓<br>\(E = 0.50 \times 2\,260\,000\) ✓<br>\(E = 1\,130\,000\) J ✓` },
        ] },

      /* 4 */
      { lessons: "7–8", title: "Specific heat capacity", subtitle: R`\(\Delta E = m\,c\,\Delta\theta\); measuring specific heat capacity (required practical)`,
        doNow: [
          [190, "Define internal energy.", "The total energy stored by the particles that make up a system."],
          [202, "Define specific latent heat.", "The energy needed to change the state of 1 kg of a substance with no change in temperature."],
          [698, "Describe how to read a measuring cylinder accurately.", "Read the bottom of the meniscus at eye level."],
        ],
        questions: [
          { stem: R`2.0 kg of water is heated from 20 °C to 50 °C. Specific heat capacity of water = 4200 J/kg °C. Use \(\Delta E = m\,c\,\Delta\theta\)`,
            q: "Calculate the energy transferred to the water.", m: 3, lines: 3,
            a: R`\(\Delta\theta = 50 - 20 = 30\) °C ✓<br>\(\Delta E = 2.0 \times 4200 \times 30\) ✓<br>\(\Delta E = 252\,000\) J ✓` },
          { q: "The unit of specific heat capacity is {{J/kg|J/kg °C*|J/°C}}", m: 1, lines: 0 },
          { stem: "A student heats a metal block with an immersion heater to find its specific heat capacity.",
            parts: [
              { q: "Give the reason why the block is wrapped in insulation.", m: 1, lines: 1, a: "To reduce energy transfer to the surroundings ✓" },
              { q: "The student's value is higher than the true value. Explain why.", m: 2, lines: 2, a: "Some energy is transferred to the surroundings ✓<br>so the temperature rise is smaller than it should be ✓" },
            ] },
        ] },
    ],
  };
})();
