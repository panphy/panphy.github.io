/* Unit review: mixed AQA-style exam practice from all nine lessons (workbook.html?review).
   Question fields are those of the lesson Exam corners (see workbook.js, question()); marks in the
   answers follow AQA mark schemes, one (1) per mark point. Adds window.UNIT.review. */
(function () {
  "use strict";
  const R = String.raw;
  const frame3 = [["Equation"], ["Substitute"], ["Answer", "unit:"]];
  const frameRe = [["Equation"], ["Rearrange"], ["Substitute"], ["Answer", "unit:"]];

  window.UNIT.review = [
    { p: "Draw <strong>one</strong> line from each object to the energy store that is filling up.", marks: 3,
      match: { left: ["a book being lifted onto a shelf", "a bow being pulled back", "a cup of tea being heated"], right: ["elastic potential store", "thermal store", "gravitational potential store"], a: [[0, 2], [1, 0], [2, 1]] },
      a: "All three correct (3); two correct (2); one correct (1)." },

    { p: "A battery-powered fan is switched on. Describe the useful energy transfer.", marks: 2, lines: 2,
      a: "Energy is transferred electrically from the chemical store of the battery (1) to the kinetic store of the fan blades (1)." },

    { p: R`A car of mass 1200 kg travels at 15 m/s. Calculate the energy in the kinetic store of the car. Use \(E_k = \tfrac{1}{2}\,m\,v^2\)`, marks: 3,
      frame: frame3, frameA: [R`\(E_k = \tfrac{1}{2}\,m\,v^2\) (1)`, R`\(E_k = \tfrac{1}{2} \times 1200 \times 15^2\) (1)`, "135 000 J (1)"] },

    { p: "A climber of mass 60 kg climbs 12 m up a rock face. Calculate the energy transferred to the climber's gravitational potential store. Gravitational field strength = 9.8 N/kg", marks: 3,
      frame: frame3, frameA: [R`\(E_p = m\,g\,h\) (1)`, R`\(E_p = 60 \times 9.8 \times 12\) (1)`, "7056 J (accept 7100 J) (1)"] },

    { p: "A student hangs weights on a spring and measures its extension.", marks: 6,
      table: { head: ["Force / N", "0", "1.0", "2.0", "3.0", "4.0", "5.0"], rows: [["Extension / cm", "0", "2.0", "4.0", "6.0", "8.0", "10.9"]] },
      after: [
        { t: "part", p: R`(a) Calculate the spring constant. Use the reading at 2.0 N, and \(F = k\,e\)`, frame: frameRe, frameA: [R`\(F = k\,e\)`, R`\(k = \dfrac{F}{e}\) (1)`, R`\(k = \dfrac{2.0}{0.040}\) (extension in metres) (1)`, "50 N/m (1)"] },
        { t: "part", p: R`(b) Calculate the energy in the elastic potential store when the extension is 0.060 m. Use \(E_e = \tfrac{1}{2}\,k\,e^2\)`, frame: frame3, frameA: [R`\(E_e = \tfrac{1}{2}\,k\,e^2\)`, R`\(E_e = \tfrac{1}{2} \times 50 \times 0.060^2\) (1)`, "0.09 J (1)"] },
        { t: "part", p: "(c) Explain what the result at 5.0 N shows.", lines: 2, a: "The extension is no longer proportional to the force (it should be 10.0 cm): the limit of proportionality has been exceeded (1)." },
      ] },

    { p: "A ball of mass 0.50 kg is dropped from a height of 3.2 m. Gravitational field strength = 9.8 N/kg", marks: 6,
      after: [
        { t: "part", p: "(a) Calculate the energy in the ball's gravitational potential store before it is dropped.", frame: frame3, frameA: [R`\(E_p = m\,g\,h\)`, R`\(E_p = 0.50 \times 9.8 \times 3.2\) (1)`, "15.68 J (15.7 J) (1)"] },
        { t: "part", p: "(b) Ignoring air resistance, how much energy is in the ball's kinetic store just before it hits the ground?", lines: 1, a: "15.7 J (the same as the gravitational potential energy lost) (1)" },
        { t: "part", p: "(c) The ball bounces back to a height of only 2.4 m. Explain why, using the idea of conservation of energy.", lines: 2, a: "Energy is not destroyed, but some is dissipated (1) to the thermal store of the ball and surroundings / transferred by sound when it hits the ground (1)." },
        { t: "part", p: R`(d) Calculate the efficiency of the bounce. Use \(\text{efficiency} = \dfrac{\text{bounce height}}{\text{drop height}}\)`, lines: 1, a: R`\(\dfrac{2.4}{3.2} = 0.75\) (75%) (1)` },
      ] },

    { p: "A motor lifts a load. It transfers 4800 J to the load in 12 s.", marks: 4,
      after: [
        { t: "part", p: R`(a) Calculate the power of the motor. Use \(P = \dfrac{E}{t}\)`, frame: frame3, frameA: [R`\(P = \dfrac{E}{t}\)`, R`\(P = \dfrac{4800}{12}\) (1)`, "400 W (1)"] },
        { t: "part", p: "(b) A 600 W motor transfers the same 4800 J. Calculate how long it takes.", frame: frameRe, frameA: [R`\(P = \dfrac{E}{t}\)`, R`\(t = \dfrac{E}{P}\) (1)`, R`\(t = \dfrac{4800}{600}\)`, "8.0 s (1)"] },
      ] },

    { p: "Efficiency.", marks: 4,
      after: [
        { t: "part", p: "(a) A kettle is supplied with 2000 J. It transfers 1700 J to the thermal store of the water. Calculate its efficiency.", frame: frame3, frameA: [R`\(\text{efficiency} = \dfrac{\text{useful output}}{\text{total input}}\)`, R`\(\text{efficiency} = \dfrac{1700}{2000}\) (1)`, "0.85 or 85% (1)"] },
        { t: "part", p: "(b) A lamp is 20% efficient. Its useful power output is 6.0 W. Calculate its total power input.", frame: frameRe, frameA: [R`\(\text{efficiency} = \dfrac{\text{useful}}{\text{total}}\)`, R`\(\text{total} = \dfrac{\text{useful}}{\text{efficiency}}\) (1)`, R`\(\text{total} = \dfrac{6.0}{0.20}\)`, "30 W (1)"] },
      ] },

    { p: "A family wants to waste less energy heating their house. Describe how energy is transferred out of the house, and explain <strong>three</strong> ways to reduce the energy wasted.", marks: 6, type: "6-mark question", lines: 9,
      a: "Level 3 (5–6): a clear description of how energy leaves, and three ways, each linked to how it reduces the rate of transfer. Level 2 (3–4): two ways with some explanation. Level 1 (1–2): ways listed with little or no explanation. Points: energy is transferred by heating from the warm house to the colder surroundings (through walls, roof, windows, gaps); it is dissipated to the thermal store of the surroundings; loft insulation / cavity-wall insulation / double glazing use materials with low thermal conductivity (or trapped air), so the rate of energy transfer is lower; thicker walls or insulation reduce the rate further; draught excluders stop warm air escaping; thermostats or lower settings mean less energy is needed." },

    { p: "Draw a ring around the correct unit in each box.", marks: 3,
      ring: [["The unit of power is", ["J", "W", "N"], 1], ["The unit of spring constant is", ["N/m", "N", "J/s"], 0], ["The unit of energy is", ["W", "kg", "J"], 2]] },
  ];
})();
