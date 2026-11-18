/* Revision exercises for Lessons 1–11 (workbook.html?revision): AQA-style questions, about 45 minutes,
   Higher tier, Combined Science content only (no mains, National Grid or static electricity). All questions
   and numbers are original and appear nowhere else in the workbook, Preps or deck. The renderer
   (/gcsephy/assets/workbook/workbook.js) prints the name fields and equations first and the mark scheme
   (`ms`) last. Marks sit on each part. */
(function () {
  "use strict";

  const D = window.Diagrams;
  const frame3 = [["Equation"], ["Substitute"], ["Answer", "unit:"]];
  const frame4 = [["Equation"], ["Rearrange"], ["Substitute"], ["Answer", "unit:"]];

  // An I–V curve for a filament lamp that passes through (4.0 V, 0.50 A).
  const lampCurve = (v) => (0.5 / Math.tanh(4 / 3.5)) * Math.tanh(v / 3.5);

  const questions = [
    // Lessons 1 and 3: symbols and meters
    { p: "A student draws this circuit diagram.",
      fig: D.circuit({ w: 400, h: 215, wires: ["M40 40 H360 V150 H40 Z"],
        parts: [["battery", 120, 40, "h"], ["switchOpen", 260, 40, "h", "Y"], ["lamp", 120, 150, "h"], ["variable", 260, 150, "h", "X", "b"], ["ammeter", 360, 95, "v"]] }),
      figCls: "fig-mid",
      after: [
        { t: "part", p: "(a) Draw a voltmeter on the diagram to measure the potential difference across the lamp.", marks: 1, ms: "Voltmeter symbol connected in parallel across the lamp only (1)" },
        { t: "part", p: "(b) Name components X and Y.", marks: 2, lines: 2, ms: "X: variable resistor (1)<br>Y: switch (open) (1)" },
      ] },

    // Lessons 2 and 3: Q = I t, E = Q V
    { p: "A phone charger supplies a current of 1.6 A to a phone battery for 45 minutes.",
      after: [
        { t: "part", p: "(a) Calculate the charge that flows.", marks: 3, frame: [["Convert"], ["Equation"], ["Substitute"], ["Answer", "unit:"]], ms: "t = 45 × 60 = 2700 s (1)<br>Q = I t = 1.6 × 2700 (1)<br>Q = 4320 C (1)" },
        { t: "part", p: "(b) The potential difference across the battery is 5.0 V. Calculate the energy transferred to the battery. Use your answer to (a).", marks: 2, frame: frame3, ms: "E = Q V = 4320 × 5.0 (1)<br>E = 21 600 J (1)<br>Allow ecf from (a)." },
      ] },

    // Lessons 4 and 5: V = I R; required practical, resistance of a wire
    { p: "A student investigates how the resistance of a wire depends on its length. The table shows the results.",
      table: { head: ["Length / cm", "p.d. / V", "Current / A", "Resistance / Ω"], rows: [["20", "0.44", "0.50", "0.88"], ["40", "0.85", "0.49", "1.73"], ["60", "1.30", "0.50", null], ["80", "1.68", "0.49", "3.43"], ["100", "2.10", "0.49", "4.29"]] },
      after: [
        { t: "part", p: "(a) Calculate the resistance of the 60 cm length of wire.", marks: 2, frame: frame4, ms: "R = V ÷ I = 1.30 ÷ 0.50 (1)<br>R = 2.60 Ω (1)" },
        { t: "part", p: "(b) Three of the results are plotted on the graph. Plot the other two results. Draw a line of best fit.", marks: 2,
          graph: { w: 110, h: 50, x: [10, 2], y: [1, 1], xLabel: "Length / cm", yLabel: "Resistance / Ω", given: [[20, 0.88], [40, 1.73], [80, 3.43]] },
          ms: "Points at (60, 2.60) and (100, 4.29) plotted to within half a small square (1)<br>A single straight line of best fit, close to all the points (1)<br>Allow ecf from (a)." },
        { t: "part", p: "(c) Describe the relationship between the resistance and the length of the wire. Give a reason for your answer.", marks: 2, lines: 2, ms: "Resistance is directly proportional to length (1)<br>The graph is a straight line through the origin (1)" },
      ] },

    // Lesson 6: series and parallel rules
    { p: "An 18 Ω resistor and a 12 Ω resistor are connected in series to a 12 V battery.",
      fig: D.circuit({ w: 340, h: 170, wires: ["M40 40 H300 V130 H40 Z"],
        parts: [["battery", 170, 40, "h", "12 V"], ["resistor", 110, 130, "h", "18 Ω", "b"], ["resistor", 230, 130, "h", "12 Ω", "b"]] }),
      figCls: "fig-small",
      after: [
        { t: "part", p: "(a) Calculate the total resistance of the circuit.", marks: 1, lines: 1, ms: "R<sub>total</sub> = 18 + 12 = 30 Ω (1)" },
        { t: "part", p: "(b) Calculate the current in the circuit.", marks: 2, frame: frame4, ms: "I = V ÷ R = 12 ÷ 30 (1)<br>I = 0.40 A (1)<br>Allow ecf from (a)." },
        { t: "part", p: "(c) Calculate the potential difference across the 18 Ω resistor.", marks: 2, frame: frame3, ms: "V = I R = 0.40 × 18 (1)<br>V = 7.2 V (1)<br>Allow ecf from (b)." },
        { t: "part", p: "(d) A third resistor is connected in parallel with the 18 Ω resistor. Explain what happens to the current from the battery.", marks: 2, lines: 3, ms: "The current from the battery increases (1)<br>The parallel branch gives the charge another path, so the total resistance decreases (1)" },
        { t: "part", p: "(e) The resistors become warm. Which energy store of the resistors increases? {{chemical|kinetic|thermal*}}", marks: 1, ms: "thermal (1)" },
      ] },

    // Lesson 7: required practical, resistors in series and in parallel (ordering the method)
    { p: "A student has two resistors, a battery, an ammeter, a voltmeter, a switch and connecting leads. The student wants to find out whether the total resistance of the two resistors is greater when they are connected in series or in parallel.",
      after: [
        { t: "part", p: "(a) The steps of the method are in the wrong order. Number the steps 1–6 to put them in the correct order.", marks: 4,
          order: [
            ["5", "Reconnect the two resistors in parallel and take the readings again."],
            ["2", "Connect the voltmeter across both resistors."],
            ["4", "Calculate the total resistance using R&nbsp;=&nbsp;V&nbsp;÷&nbsp;I."],
            ["1", "Connect the two resistors in series with the battery, the switch and the ammeter."],
            ["6", "Compare the total resistance in series with the total resistance in parallel."],
            ["3", "Close the switch, record the ammeter and voltmeter readings, then open the switch."],
          ],
          ms: "Correct order from the top: 5, 2, 4, 1, 6, 3<br>All six correct (4)<br>Four or five correct (3)<br>Two or three correct (2)<br>One correct (1)" },
        { t: "part", p: "(b) Explain why the student opens the switch after taking each set of readings.", marks: 2, lines: 2, ms: "So the resistors do not heat up (1)<br>A higher temperature would increase their resistance and change the readings (1)" },
      ] },

    // Lessons 8 and 9: I–V graphs
    { p: "The graph shows how the current through a filament lamp changes with the potential difference across it.",
      graph: { w: 120, h: 60, x: [0.5, 2], y: [0.1, 1], xLabel: "Potential difference / V", yLabel: "Current / A", givenFit: lampCurve, givenRange: [0, 6] },
      after: [
        { t: "part", p: "(a) Determine the current through the lamp when the potential difference is 4.0 V.", marks: 1, lines: 1, ms: "0.50 A (allow 0.49–0.51 A) (1)" },
        { t: "part", p: "(b) Calculate the resistance of the lamp when the potential difference is 4.0 V.", marks: 2, frame: frame4, ms: "R = V ÷ I = 4.0 ÷ 0.50 (1)<br>R = 8.0 Ω (1)<br>Allow ecf from (a)." },
        { t: "part", p: "(c) Explain why the resistance of the lamp increases as the potential difference increases.", marks: 3, lines: 4, ms: "A bigger current makes the filament hotter (1)<br>The ions in the metal vibrate more (1)<br>So the electrons collide with the ions more often (1)" },
        { t: "part", p: "(d) The lamp is replaced by a diode. When the diode is connected the other way round, its resistance is very {{high*|low}}.", marks: 1, ms: "high (1)" },
      ] },

    // Lesson 10: thermistors and LDRs
    { p: "A light-dependent resistor (LDR) and a 300 Ω resistor are connected in series to a 12 V battery.",
      fig: D.circuit({ w: 340, h: 162, wires: ["M40 40 H300 V130 H40 Z"],
        parts: [["battery", 170, 40, "h", "12 V"], ["ldr", 100, 130, "h"], ["resistor", 200, 130, "h", "300 Ω", "b"], ["ammeter", 300, 85, "v"]] }),
      figCls: "fig-small fig-xs",
      after: [
        { t: "part", p: "(a) In brighter light, the resistance of the LDR {{increases|decreases*|stays the same}}.", marks: 1, ms: "decreases (1)" },
        { t: "part", p: "(b) In the dark, the resistance of the LDR is 4.7 kΩ. Calculate the current in the circuit.", marks: 3, frame: [["Total R"], ["Equation"], ["Substitute"], ["Answer", "unit:"]], ms: "R<sub>total</sub> = 4700 + 300 = 5000 Ω (1)<br>I = V ÷ R = 12 ÷ 5000 (1)<br>I = 0.0024 A (2.4 mA) (1)" },
      ] },

    // Lesson 11: power and energy transfer
    { p: "The heating element in the rear window of a car has a resistance of 1.5 Ω. Its power is 96 W.",
      after: [
        { t: "part", p: "(a) Calculate the current in the heating element.", marks: 3, frame: frame4, ms: "P = I² R, so I = √(P ÷ R) (1)<br>I = √(96 ÷ 1.5) = √64 (1)<br>I = 8.0 A (1)" },
        { t: "part", p: "(b) The heater is switched on for 15 minutes. Calculate the energy transferred.", marks: 3, frame: [["Convert"], ["Equation"], ["Substitute"], ["Answer", "unit:"]], ms: "t = 15 × 60 = 900 s (1)<br>E = P t = 96 × 900 (1)<br>E = 86 400 J (1)" },
      ] },
  ];

  // Keep each value on the same line as its unit in the prompts.
  const NB = /(\d) (?=(?:kΩ|Ω|V|A|W|J|C|s|cm|minutes)(?![A-Za-z]))/g;
  const nb = (b) => Object.assign(b, { p: b.p.replace(NB, "$1 ") }, b.after ? { after: b.after.map(nb) } : {});
  questions.forEach(nb);

  window.UNIT.revision = { eyebrow: "Electric Circuits, Lessons 1–11", title: "Revision exercises", minutes: 45, upTo: 11, questions };
})();
