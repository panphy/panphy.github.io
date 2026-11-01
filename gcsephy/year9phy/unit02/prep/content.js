/* Prep sheets for Energy: Stores and Transfers: one per week (two lessons), 10 marks each; Prep 5 follows Lesson 9.
   Do Now questions are from the Do Now bank (gcsephy/do-now/questions.csv, by Number); the rest checks the key ideas
   of the two lessons. Maths is LaTeX for MathJax, as in the workbook, written in String.raw templates (R).
   Rendered by /gcsephy/assets/prep/prep.js, which documents the fields. */
(function () {
  "use strict";
  const R = String.raw;

  window.PREP = {
    year: 9,
    unit: "Energy: Stores and Transfers",
    file: "Energy - Year 9",
    preps: [
      /* 1 */
      { lessons: "1–2", title: "Stores and the kinetic store", subtitle: "Energy stores and transfers; describing a transfer; kinetic energy",
        doNow: [
          [850, "Define precision.", "How close repeated measurements are to each other."],
          [872, "What is a control variable?", "A variable kept the same to make the test fair."],
          [895, "What is an anomalous result?", "A result that does not fit the pattern of the others."],
        ],
        questions: [
          { stem: "A cyclist brakes and stops. Complete the sentence.",
            q: "Energy is transferred [[mechanically|22]] <span class=\"opts\">(mechanically / electrically / by waves)</span> from the [[kinetic|18]] <span class=\"opts\">(kinetic / chemical / thermal)</span> store of the cyclist to the [[thermal|18]] <span class=\"opts\">(elastic / thermal / nuclear)</span> store of the brakes.",
            m: 2, lines: 0, a: R`<span class="alt">All three ✓✓; two ✓</span>` },
          { stem: R`A ball of mass 0.50 kg moves at 4.0 m/s. Use \(E_k = \tfrac{1}{2}\,m\,v^2\)`,
            q: "Calculate the energy in the kinetic store of the ball.", m: 3, lines: 3,
            a: R`\(E_k = \tfrac{1}{2}\,m\,v^2\) ✓<br>\(E_k = \tfrac{1}{2} \times 0.50 \times 4.0^2\) ✓<br>\(E_k = 4.0\) J ✓` },
          { q: "Name the two quantities that kinetic energy depends on.", m: 1, lines: 1, a: "Mass and speed ✓" },
          { q: "A car’s speed doubles. Its kinetic energy becomes {{2 times|4 times*|8 times}} as big.", m: 1, lines: 0 },
        ] },

      /* 2 */
      { lessons: "3–4", title: "Lifting and stretching", subtitle: "Gravitational potential energy; stretching springs; spring constant",
        doNow: [
          [5, "State the standard unit of energy.", "Joule (J)"],
          [16, "Name the four ways energy is transferred between stores.", "Mechanically, electrically, by heating and by waves (or by radiation)"],
          [643, "Name the two quantities that kinetic energy depends on.", "Mass and speed"],
        ],
        questions: [
          { stem: R`A 2.0 kg box is lifted onto a shelf 1.5 m high. Use \(E_p = m\,g\,h\) and \(g = 9.8\) N/kg.`,
            q: "Calculate the energy transferred to the gravitational potential store of the box.", m: 3, lines: 3,
            a: R`\(E_p = m\,g\,h\) ✓<br>\(E_p = 2.0 \times 9.8 \times 1.5\) ✓<br>\(E_p = 29.4\) J (29 J) ✓` },
          { stem: R`A spring is 12.0 cm long. A 3.0 N force stretches it to 18.0 cm. Use \(F = k\,e\)`,
            parts: [
              { q: "Calculate the extension in metres.", m: 1, lines: 1, a: "18.0 − 12.0 = 6.0 cm = 0.060 m ✓" },
              { q: "Calculate the spring constant.", m: 2, lines: 3, a: R`\(k = \dfrac{F}{e}\) ✓ (rearranged)<br>\(k = \dfrac{3.0}{0.060} = 50\) N/m ✓` },
              { q: "Up to the limit of proportionality, extension is {{directly proportional*|inversely proportional|not related}} to force.", m: 1, lines: 0 },
            ] },
        ] },

      /* 3 */
      { lessons: "5–6", title: "Springs, swings and conservation", subtitle: "Elastic potential energy; conservation of energy; energy dissipated",
        doNow: [
          [352, "State the standard unit of spring constant.", "Newton per metre (N/m)"],
          [10, "Name the store of energy associated with changes in height.", "The gravitational potential energy store"],
          [356, "Name the energy store that increases when an elastic object is stretched or compressed.", "The elastic potential energy store"],
        ],
        questions: [
          { stem: R`A spring with spring constant 40 N/m is stretched by 0.10 m. Use \(E_e = \tfrac{1}{2}\,k\,e^2\)`,
            q: "Calculate the energy in the elastic potential store of the spring.", m: 3, lines: 3,
            a: R`\(E_e = \tfrac{1}{2}\,k\,e^2\) ✓<br>\(E_e = \tfrac{1}{2} \times 40 \times 0.10^2\) ✓<br>\(E_e = 0.20\) J ✓` },
          { stem: "A pendulum is pulled to one side and released.",
            parts: [
              { q: "Describe the energy transfer as the pendulum swings down to its lowest point.", m: 2, lines: 2,
                a: "Energy is transferred from the gravitational potential store ✓<br>to the kinetic store of the pendulum ✓" },
              { q: "It never quite reaches its starting height on the other side. Explain why, even though energy is conserved.", m: 2, lines: 2,
                a: "Some energy is dissipated (by air resistance / friction at the pivot) ✓<br>to the thermal store of the surroundings; the total is still the same ✓" },
            ] },
        ] },

      /* 4 */
      { lessons: "7–8", title: "Power and wasted energy", subtitle: "Power as the rate of energy transfer; wasted energy; reducing it",
        doNow: [
          [2, "State the law of conservation of energy.", "Energy can be transferred usefully, stored or dissipated, but it cannot be created or destroyed."],
          [357, "Describe how to find the spring constant from a graph of force (y-axis) against extension (x-axis).", "It is the gradient of the straight section."],
          [12, "Name the store of energy associated with extending and compressing objects.", "The elastic potential energy store"],
        ],
        questions: [
          { stem: R`A student climbs the stairs. They transfer 1500 J to their gravitational potential store in 6.0 s. Use \(P = \dfrac{E}{t}\)`,
            q: "Calculate the student’s power.", m: 3, lines: 3,
            a: R`\(P = \dfrac{E}{t}\) ✓<br>\(P = \dfrac{1500}{6.0}\) ✓<br>\(P = 250\) W ✓` },
          { q: "A 2000 W kettle is switched on for 120 s. Calculate the energy transferred.", m: 2, lines: 2,
            a: R`\(E = P\,t\) ✓ (rearranged)<br>\(E = 2000 \times 120 = 240\,000\) J ✓` },
          { q: "Where does most wasted energy end up? {{the kinetic store of the device|the thermal store of the surroundings*|the chemical store of the fuel}}", m: 1, lines: 0 },
          { q: "Explain how oiling a bicycle chain reduces wasted energy.", m: 1, lines: 1, a: "It reduces friction, so less energy is transferred to the thermal store ✓" },
        ] },

      /* 5 */
      { lessons: "9", title: "How much is useful?", subtitle: "Efficiency as a decimal and a percentage; Sankey diagrams",
        doNow: [
          [31, "Define power.", "The rate at which energy is transferred (or work is done)."],
          [654, "State what is meant by dissipated energy.", "Energy transferred to the surroundings and stored in less useful ways."],
          [656, "Two motors lift the same load through the same height. Motor A is quicker. Which is more powerful, and why?", "Motor A. It transfers the same energy in less time."],
        ],
        questions: [
          { stem: R`A motor is supplied with 800 J. It transfers 600 J usefully. Use \(\text{efficiency} = \dfrac{\text{useful output}}{\text{total input}}\)`,
            q: "Calculate the efficiency of the motor, as a decimal and as a percentage.", m: 3, lines: 3,
            a: R`\(\text{efficiency} = \dfrac{\text{useful output}}{\text{total input}}\) ✓<br>\(\text{efficiency} = \dfrac{600}{800} = 0.75\) ✓<br>= 75% ✓` },
          { q: "A 40 W lamp is 30% efficient. Calculate its useful power output.", m: 2, lines: 2,
            a: R`useful = efficiency × total ✓<br>useful = 0.30 × 40 = 12 W ✓` },
          { q: "A lamp is supplied with 100 J and transfers 20 J by light. In a Sankey diagram, the wasted arrow shows [[80 J|16]] <span class=\"opts\">(20 J / 80 J / 120 J)</span>", m: 1, lines: 0 },
          { q: "Explain why no device can have an efficiency greater than 1 (100%).", m: 1, lines: 1, a: "Energy cannot be created, so the useful output cannot be more than the total input ✓" },
        ] },
    ],
  };
})();
