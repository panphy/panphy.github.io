/* Test revision for Lessons 1–10, deck slides 1–42 (workbook.html?revision=2): a test revision of
   AQA-style questions, about 50 minutes, Higher tier, Combined Science content only (no power, mains or
   static electricity). Questions 1–10 are taken word for word from the Do Now AO1 question bank
   (gcsephy/do-now/questions.csv, numbers in the comments), with its answers as the mark scheme. The other
   questions and their numbers are original and appear nowhere else in the workbook, Preps, deck or
   Revision exercises. Load after revision.js: this sets UNIT.revisions to both sets. */
(function () {
  "use strict";

  const D = window.Diagrams;
  const frame3 = [["Equation"], ["Substitute"], ["Answer", "unit:"]];
  const frame4 = [["Equation"], ["Rearrange"], ["Substitute"], ["Answer", "unit:"]];
  const convert3 = [["Convert"], ["Equation"], ["Substitute"], ["Answer", "unit:"]];

  // A thermistor whose resistance halves for every 20 °C rise: 6.0 kΩ at 0 °C, 3.0 kΩ at 20 °C, 1.5 kΩ at 40 °C.
  const thermistorCurve = (t) => 6 * Math.pow(2, -t / 20);

  const bank = (p, marks, ms, lines) => ({ p, marks, lines: lines || marks, ms });

  const questions = [
    // AO1 question bank, one or more per deck topic 01–06
    bank("State the function of an ammeter.", 1, "To measure current. (1)"), // #84
    bank("Define electric current.", 1, "The rate of flow of electrical charge. (1)"), // #90
    bank("Describe the current at different points in a single closed loop.", 1, "It is the same at every point. (1)"), // #92
    bank("State the standard units of potential difference and resistance.", 2, "Potential difference: volt (V) (1)<br>Resistance: ohm (Ω) (1)"), // #96
    bank("Name the two variables that the current through a component depends on.", 2, "The potential difference across it (1)<br>and its resistance (1)"), // #93
    bank("Describe how current depends on potential difference for an ohmic conductor.", 1, "Current is directly proportional to potential difference. (1)"), // #98
    bank("Explain why the potential difference is kept small when measuring the resistance of a wire.", 2, "So the current is small (1)<br>and the wire does not heat up (1)"), // #114
    bank("State the function of a diode.", 1, "To allow current in one direction only. (1)"), // #77
    bank("Describe the total resistance of two resistors connected in parallel.", 1, "It is less than the resistance of the smaller resistor. (1)"), // #636
    bank("Explain why the resistance of a filament lamp increases with current.", 2, "A greater current makes the filament hotter (1)<br>and its resistance increases with temperature (1)"), // #102

    // Unit conversions
    { p: "A student converts values to the units used in calculations.",
      after: [
        { t: "part", p: "(a) Convert each value to the unit shown. Write your answers in the table.", marks: 5,
          table: { head: ["Value", "Convert to", "Converted value"],
            rows: [["680 mA", "A", null], ["2.7 kΩ", "Ω", null], ["8.0 minutes", "s", null], ["2.5 hours", "s", null], ["0.035 A", "mA", null]],
            ans: [[null, null, "0.68 A"], [null, null, "2700 Ω"], [null, null, "480 s"], [null, null, "9000 s"], [null, null, "35 mA"]] },
          ms: "0.68 A (1)<br>2700 Ω (1)<br>480 s (1)<br>9000 s (1)<br>35 mA (1)" },
        { t: "part", p: "(b) A current of 3.0 mA passes through a 2.7 kΩ resistor. Calculate the potential difference across the resistor.", marks: 3, frame: convert3,
          ms: "I = 0.0030 A and R = 2700 Ω (1)<br>V = I R = 0.0030 × 2700 (1)<br>V = 8.1 V (1)" },
      ] },

    // Q = I t and E = Q V, with conversions
    { p: "A smoke alarm runs from a 9.0 V battery. When the alarm sounds, the current is 15 mA. The alarm sounds for 40 minutes.",
      after: [
        { t: "part", p: "(a) Calculate the charge that flows.", marks: 3, frame: convert3,
          ms: "I = 0.015 A and t = 2400 s (1)<br>Q = I t = 0.015 × 2400 (1)<br>Q = 36 C (1)" },
        { t: "part", p: "(b) Calculate the energy transferred by the battery. Use your answer to (a).", marks: 2, frame: frame3,
          ms: "E = Q V = 36 × 9.0 (1)<br>E = 324 J (1)<br>Allow ecf from (a)." },
      ] },

    // Series circuit
    { p: "A lamp and a 32 Ω resistor are connected in series to a 10 V battery. The voltmeter reads 8.0 V.",
      fig: D.circuit({ w: 340, h: 205, wires: ["M40 40 H300 V130 H40 Z", "M195 130 V175 H265 V130"],
        parts: [["battery", 170, 40, "h", "10 V"], ["lamp", 110, 130, "h"], ["resistor", 230, 130, "h", "32 Ω"], ["voltmeter", 230, 175, "h", "8.0 V", "b"]],
        dots: [[195, 130], [265, 130]] }),
      figCls: "fig-small",
      after: [
        { t: "part", p: "(a) Calculate the current in the circuit.", marks: 2, frame: frame4, ms: "I = V ÷ R = 8.0 ÷ 32 (1)<br>I = 0.25 A (1)" },
        { t: "part", p: "(b) Calculate the potential difference across the lamp.", marks: 1, lines: 1, ms: "10 − 8.0 = 2.0 V (1)" },
        { t: "part", p: "(c) Calculate the resistance of the lamp.", marks: 2, frame: frame4, ms: "R = V ÷ I = 2.0 ÷ 0.25 (1)<br>R = 8.0 Ω (1)<br>Allow ecf from (a) and (b)." },
      ] },

    // Parallel circuit
    { p: "A 12 Ω resistor and a 20 Ω resistor are connected in parallel to a 6.0 V battery.",
      fig: D.circuit({ w: 380, h: 250, wires: ["M40 40 H340 V150 H40 Z", "M110 150 V215 H270 V150"],
        parts: [["battery", 190, 40, "h", "6.0 V"], ["ammeter", 40, 95, "v", "A₁", "r"], ["resistor", 160, 150, "h", "12 Ω"], ["ammeter", 225, 150, "h", "A₂"], ["resistor", 190, 215, "h", "20 Ω", "b"]],
        dots: [[110, 150], [270, 150]] }),
      figCls: "fig-small",
      after: [
        { t: "part", p: "(a) State the potential difference across the 20 Ω resistor. Give a reason for your answer.", marks: 2, lines: 2, ms: "6.0 V (1)<br>Each branch of a parallel circuit has the full supply p.d. across it (1)" },
        { t: "part", p: "(b) Calculate the reading on ammeter A₂.", marks: 2, frame: frame4, ms: "I = V ÷ R = 6.0 ÷ 12 (1)<br>I = 0.50 A (1)" },
        { t: "part", p: "(c) Calculate the current in the 20 Ω resistor.", marks: 2, frame: frame4, ms: "I = V ÷ R = 6.0 ÷ 20 (1)<br>I = 0.30 A (1)" },
        { t: "part", p: "(d) Determine the reading on ammeter A₁.", marks: 1, lines: 1, ms: "0.50 + 0.30 = 0.80 A (1)<br>Allow ecf from (b) and (c)." },
        { t: "part", p: "(e) Calculate the total resistance of the circuit.", marks: 2, frame: frame4, ms: "R = V ÷ I = 6.0 ÷ 0.80 (1)<br>R = 7.5 Ω (1)<br>Allow ecf from (d)." },
      ] },

    // Measuring resistance: circuit drawing
    { p: "A student wants to find the resistance of a thermistor. Draw a circuit diagram the student could use. Include a battery, the thermistor, an ammeter and a voltmeter.", marks: 3, box: 52,
      ms: "Thermistor symbol, in series with the battery (1)<br>Ammeter in series with the thermistor (1)<br>Voltmeter in parallel across the thermistor only (1)" },

    // Graph reading: thermistor
    { p: "The graph shows how the resistance of the thermistor changes with temperature.", newPage: true,
      graph: { w: 80, h: 60, x: [10, 1], y: [1, 1], xLabel: "Temperature / °C", yLabel: "Resistance / kΩ", givenFit: thermistorCurve, givenRange: [0, 80] },
      after: [
        { t: "part", p: "(a) Determine the resistance of the thermistor at 20 °C.", marks: 1, lines: 1, ms: "3.0 kΩ (allow 2.9–3.1 kΩ) (1)" },
        { t: "part", p: "(b) Determine the temperature when the resistance of the thermistor is 1.5 kΩ.", marks: 1, lines: 1, ms: "40 °C (allow 39–41 °C) (1)" },
        { t: "part", p: "(c) Describe how the resistance of the thermistor changes as the temperature increases from 0 °C to 80 °C.", marks: 2, lines: 2, ms: "The resistance decreases (1)<br>It decreases by less for each 10 °C rise / the graph gets less steep (1)" },
        { t: "part", p: "(d) At 20 °C, the thermistor is connected to a 3.6 V supply. Calculate the current in the thermistor. Give your answer in mA.", marks: 3, frame: [["Convert"], ["Equation"], ["Rearrange"], ["Substitute"], ["Answer", "unit:"]],
          ms: "R = 3.0 kΩ = 3000 Ω (1)<br>I = V ÷ R = 3.6 ÷ 3000 = 0.0012 A (1)<br>I = 1.2 mA (1)<br>Allow ecf from (a)." },
      ] },
  ];

  // Keep each value on the same line as its unit in the prompts.
  const NB = /(\d) (?=(?:kΩ|Ω|mA|V|A|J|C|s|°C|cm|minutes|hours)(?![A-Za-z]))/g;
  const nb = (b) => Object.assign(b, { p: b.p.replace(NB, "$1 ") }, b.after ? { after: b.after.map(nb) } : {});
  questions.forEach(nb);

  const set = { eyebrow: "Electric Circuits, Lessons 1–10", title: "Test revision", file: "Test Revision", minutes: 50, upTo: 10, questions };
  window.UNIT.revisions = [window.UNIT.revision, set];
})();
