/* Revision exercises for the whole unit, Lessons 1–9 (workbook.html?revision): AQA-style questions on every
   topic in the teaching deck, about 45 minutes, Combined Science content (the Triple-only cooling cups practical
   is left out). All questions and numbers are original and appear nowhere else in the workbook, Unit review,
   Preps or deck. The renderer (/gcsephy/assets/workbook/workbook.js) prints the name fields and equations first
   and the mark scheme (`ms`) last. Marks sit on each part. Maths is LaTeX for MathJax. */
(function () {
  "use strict";

  const R = String.raw;
  const F = window.EnergyFigures;
  const frame3 = [["Equation"], ["Substitute"], ["Answer", "unit:"]];
  const frameRe = [["Equation"], ["Rearrange"], ["Substitute"], ["Answer", "unit:"]];
  const frameCv = [["Convert"], ["Equation"], ["Substitute"], ["Answer", "unit:"]];
  const G = "Gravitational field strength = 9.8 N/kg";

  // Force against extension for the spring in Question 4: k = 32 N/m up to 0.125 m, then it bends.
  const springCurve = (e) => (e <= 0.125 ? 32 * e : 4 + 32 * (e - 0.125) - 1500 * (e - 0.125) ** 2);

  const questions = [
    // Lesson 1: stores, transfers and systems
    { p: "A student throws a ball straight up into the air.",
      after: [
        { t: "part", p: "(a) As the ball rises, energy is transferred from the {{chemical|kinetic*|thermal}} store of the ball to its {{elastic potential|gravitational potential*|thermal}} store.", marks: 2, ms: "kinetic (1)<br>gravitational potential (1)" },
        { t: "part", p: "(b) Ignoring air resistance, the ball and the Earth form a closed system. State what is meant by a closed system.", marks: 1, lines: 1, ms: "A system that no energy enters or leaves (so its total energy stays the same) (1)" },
        { t: "part", p: "(c) A phone is charging. Energy is transferred to the phone {{mechanically|electrically*|by heating|by waves}}.", marks: 1, ms: "electrically (1)" },
      ] },

    // Lesson 2: the kinetic store (and speed = distance ÷ time)
    { p: "A cyclist rides 144 m along a flat road in 16 s at a steady speed. The mass of the cyclist and the bicycle is 64 kg.",
      after: [
        { t: "part", p: R`(a) Calculate the speed of the cyclist. Use \(\text{speed} = \dfrac{\text{distance}}{\text{time}}\)`, marks: 2, frame: frame3, ms: R`\(\text{speed} = \dfrac{144}{16}\) (1)<br>speed = 9.0 m/s (1)` },
        { t: "part", p: R`(b) Calculate the energy in the kinetic store of the cyclist and the bicycle. Use \(E_k = \tfrac{1}{2}\,m\,v^2\)`, marks: 2, frame: frame3, ms: R`\(E_k = \tfrac{1}{2} \times 64 \times 9.0^2\) (1)<br>\(E_k = 2592\) J (accept 2600 J) (1)<br>Allow ecf from (a).` },
      ] },

    // Lesson 3: the gravitational potential store
    { p: "A crane lifts a crate of mass 180 kg. The energy in the gravitational potential store of the crate increases by 8820 J. " + G,
      after: [
        { t: "part", p: "(a) Calculate the height the crate is lifted.", marks: 3, frame: frameRe, ms: R`\(E_p = m\,g\,h\), so \(h = \dfrac{E_p}{m\,g}\) (1)<br>\(h = \dfrac{8820}{180 \times 9.8}\) (1)<br>\(h = 5.0\) m (1)` },
        { t: "part", p: "(b) State what a gravitational field strength of 9.8 N/kg means.", marks: 1, lines: 1, ms: "Each kilogram is pulled down with a force of 9.8 N (1)" },
      ] },

    // Lessons 4 and 5: springs, Hooke's law and the elastic potential store
    { p: "A student stretches a spring and plots a graph of force against extension.",
      graph: { w: 140, h: 50, x: [0.01, 2], y: [1, 1], xLabel: "Extension / m", yLabel: "Force / N", givenFit: springCurve, givenRange: [0, 0.14] },
      after: [
        { t: "part", p: "(a) With no load the spring is 2.8 cm long. With a load it is 8.0 cm long. Calculate the extension.", marks: 1, lines: 1, ms: "8.0 − 2.8 = 5.2 cm (1)" },
        { t: "part", p: R`(b) Use the graph to determine the spring constant. Use \(F = k\,e\)`, marks: 3, frame: frameRe, ms: R`A correct pair of readings from the straight part, e.g. \(F = 3.2\) N at \(e = 0.10\) m (1)<br>\(k = \dfrac{F}{e} = \dfrac{3.2}{0.10}\) (1)<br>\(k = 32\) N/m (1)` },
        { t: "part", p: "(c) Name the point where the line stops being straight.", marks: 1, lines: 1, ms: "The limit of proportionality (1)" },
        { t: "part", p: R`(d) Calculate the energy in the elastic potential store of the spring when the extension is 0.070 m. Use \(E_e = \tfrac{1}{2}\,k\,e^2\)`, marks: 2, frame: frame3, ms: R`\(E_e = \tfrac{1}{2} \times 32 \times 0.070^2\) (1)<br>\(E_e = 0.0784\) J (accept 0.078 J) (1)<br>Allow ecf from (b).` },
      ] },

    // Lesson 4: planning the spring investigation (ordering the method)
    { p: "A student investigates how the extension of a spring depends on the force on it.",
      after: [
        { t: "part", p: "(a) The steps of the method are in the wrong order. Number the steps 1–6 to put them in the correct order.", marks: 4,
          order: [
            ["3", "Hang one 100 g mass on the spring."],
            ["6", "Plot a graph of force against extension."],
            ["1", "Clamp the spring and a vertical ruler to a stand."],
            ["5", "Add another 100 g mass and repeat, one mass at a time."],
            ["2", "Measure the length of the spring with no mass on it."],
            ["4", "Measure the new length at eye level and calculate the extension."],
          ],
          ms: "Correct order from the top: 3, 6, 1, 5, 2, 4<br>All six correct (4)<br>Four or five correct (3)<br>Two or three correct (2)<br>One correct (1)" },
        { t: "part", p: "(b) Suggest one safety precaution for this investigation. Give a reason for your answer.", marks: 2, lines: 2, ms: "A precaution (1) with a matching reason (1), e.g.<br>wear eye protection (1) because the spring could snap or fly off (1)<br>or: put a soft tray under the masses / keep feet clear (1) because the masses could fall (1)" },
      ] },

    // Lesson 6: conservation of energy
    { p: "A pendulum bob of mass 0.35 kg is released from rest at A. It swings down through B, its lowest point, to C. A is 0.18 m higher than B. " + G,
      fig: F.pendulum(), figCls: "fig-small",
      after: [
        { t: "part", p: "(a) Calculate the energy transferred from the gravitational potential store of the bob as it swings from A to B.", marks: 2, frame: frame3, ms: R`\(E_p = m\,g\,h = 0.35 \times 9.8 \times 0.18\) (1)<br>\(E_p = 0.6174\) J (accept 0.62 J) (1)` },
        { t: "part", p: "(b) Ignoring air resistance, state the energy in the kinetic store of the bob at B.", marks: 1, lines: 1, ms: "0.62 J (the same as the energy transferred from the gravitational potential store) (1)<br>Allow ecf from (a)." },
        { t: "part", p: "(c) Each swing, the bob reaches a little lower than before. Explain why, using the idea of conservation of energy.", marks: 2, lines: 3, ms: "Energy cannot be created or destroyed, but some is dissipated (1)<br>to the thermal store of the surroundings, by air resistance / friction at the pivot (1)" },
      ] },

    // Lesson 7: power
    { p: "A student of mass 45 kg runs up a flight of stairs 4.0 m high in 7.0 s. " + G,
      after: [
        { t: "part", p: "(a) Calculate the energy transferred to the student's gravitational potential store.", marks: 2, frame: frame3, ms: R`\(E_p = m\,g\,h = 45 \times 9.8 \times 4.0\) (1)<br>\(E_p = 1764\) J (1)` },
        { t: "part", p: R`(b) Calculate the student's power. Use \(P = \dfrac{E}{t}\)`, marks: 2, frame: frame3, ms: R`\(P = \dfrac{1764}{7.0}\) (1)<br>\(P = 252\) W (1)<br>Allow ecf from (a).` },
        { t: "part", p: "(c) A lift motor has a power of 1.2 kW. Calculate the energy it transfers in 2.5 minutes.", marks: 3, frame: frameCv, ms: R`\(P = 1200\) W and \(t = 150\) s (1)<br>\(E = P\,t = 1200 \times 150\) (1)<br>\(E = 180\,000\) J (1)` },
      ] },

    // Lesson 8: wasted energy
    { p: "Some energy transferred by a machine is always wasted.",
      after: [
        { t: "part", p: "(a) Explain how oiling the moving parts of a machine reduces the energy wasted.", marks: 2, lines: 2, ms: "Oil reduces friction between the moving parts (1)<br>so less energy is dissipated to the thermal store (1)" },
        { t: "part", p: "(b) Walls that keep a house warm are made of materials with a {{high|low*}} thermal conductivity. The thicker the walls, the {{higher|lower*}} the rate of energy transfer through them.", marks: 2, ms: "low (1)<br>lower (1)" },
      ] },

    // Lesson 9: efficiency and Sankey diagrams
    { p: "The Sankey diagram shows the energy transfers in an electric motor each second.",
      fig: F.sankey({ blend: true, input: 75, useful: 54, wasted: 21, s: 1.0, useLabel: "kinetic", wasteLabel: "thermal" }), figCls: "fig-small",
      after: [
        { t: "part", p: "(a) Calculate the efficiency of the motor.", marks: 2, frame: frame3, ms: R`\(\text{efficiency} = \dfrac{\text{useful output}}{\text{total input}} = \dfrac{54}{75}\) (1)<br>efficiency = 0.72 or 72% (1)` },
        { t: "part", p: "(b) A lamp has an efficiency of 0.40. Its useful power output is 18 W. Calculate its total power input.", marks: 2, frame: frameRe, ms: R`\(\text{total input} = \dfrac{\text{useful output}}{\text{efficiency}} = \dfrac{18}{0.40}\) (1)<br>total input = 45 W (1)` },
      ] },
  ];

  // Keep each value on the same line as its unit in prompt text (not inside the maths).
  const NB = /(\d) (?=(?:kg|kW|N\/kg|N\/m|m\/s|cm|m|s|J|W|N|g|minutes)(?![A-Za-z]))/g;
  const fix = (p) => p.split(/(\\\(.*?\\\))/).map((x, i) => (i % 2 ? x : x.replace(NB, "$1 "))).join("");
  const nb = (b) => Object.assign(b, { p: fix(b.p) }, b.after ? { after: b.after.map(nb) } : {});
  questions.forEach(nb);

  window.UNIT.revision = { eyebrow: "Energy: Stores and Transfers, Lessons 1–9", title: "Revision exercises", minutes: 45, upTo: 9, questions };
})();
