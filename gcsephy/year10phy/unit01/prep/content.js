/* Prep sheets for Electric Circuits: one per two lessons, 10 marks each.
   Do Now questions are from the Do Now bank (gcsephy/do-now/questions.csv, by Number); the rest checks the key ideas
   of the two lessons. Circuits and I–V sketches come from ../assets/diagrams.js (window.Diagrams).
   Rendered by /gcsephy/assets/prep/prep.js, which documents the fields. */
(function () {
  "use strict";
  const D = window.Diagrams, T = window.PrepTable;
  const fig = (svg, w) => `<div style="max-width:${w}mm;margin:0 auto">${svg}</div>`;
  const iv = (kind, label) => `<div class="iv"><b>${label}</b>${D.ivSketch(kind)}</div>`;

  window.PREP = {
    year: 10,
    unit: "Electric Circuits",
    file: "Electric Circuits - Year 10",
    preps: [
      /* 1 */
      { lessons: "1–2", title: "Complete circuits and current", subtitle: "Circuit symbols · ammeters · current as a flow of charge · Q = I t",
        doNow: [
          [2, "State the law of conservation of energy.", "Energy can be transferred usefully, stored or dissipated, but it cannot be created or destroyed."],
          [31, "Define power.", "The rate at which energy is transferred (or work is done)."],
          [893, "Describe how a line of best fit should be drawn.", "One thin straight line or smooth curve, close to the points, with about as many above it as below."],
        ],
        questions: [
          { stem: "Look at this circuit.",
            side: fig(D.circuit({ w: 360, h: 160, wires: ["M40 40 H320 V130 H40 Z"], parts: [["battery", 120, 40, "h"], ["switchClosed", 240, 40, "h"], ["lamp", 130, 130, "h"], ["ammeter", 240, 130, "h"]] }), 62),
            cols: "1.15fr 1fr",
            parts: [
              { q: "The ammeter is connected in {{series*|parallel}} with the lamp.", m: 1, lines: 0 },
              { q: "The switch is opened. Explain why the lamp goes out.", m: 1, lines: 2, a: "The circuit is no longer a complete loop, so there is no current ✓" },
              { q: "Describe the current at different points in this loop.", m: 1, lines: 1, a: "It is the same at every point ✓" },
            ] },
          { stem: "A current of 0.40 A flows through a lamp for 60 s. Use Q = I t",
            q: "Calculate the charge that flows through the lamp.", m: 3, lines: 3,
            a: "Q = I t ✓<br>Q = 0.40 × 60 ✓<br>Q = 24 C ✓" },
          { q: "State what is meant by electric current.", m: 1, lines: 1, a: "The rate of flow of (electrical) charge ✓" },
        ] },

      /* 2 */
      { lessons: "3–4", title: "Potential difference and resistance", subtitle: "Voltmeters · energy per coulomb, E = Q V · resistance, V = I R",
        doNow: [
          [90, "Define electric current.", "The rate of flow of electrical charge."],
          [91, "State the standard units of charge, current and time.", "Charge: coulomb (C); current: ampere (A); time: second (s)"],
          [81, "State the function of a fuse.", "To melt and break the circuit if the current becomes too large."],
        ],
        questions: [
          { q: "A voltmeter is connected in {{series|parallel*}} with the component it measures.", m: 1, lines: 0 },
          { stem: "15 C of charge passes through a lamp. The potential difference across the lamp is 12 V. Use E = Q V",
            q: "Calculate the energy transferred.", m: 2, lines: 2, a: "E = Q V = 15 × 12 ✓<br>E = 180 J ✓" },
          { stem: "The potential difference across a resistor is 6.0 V. The current through it is 0.30 A. Use V = I R",
            q: "Calculate the resistance of the resistor.", m: 3, lines: 3,
            a: "V = I R, so R = V ÷ I ✓<br>R = 6.0 ÷ 0.30 ✓<br>R = 20 Ω ✓" },
          { q: "For an ohmic conductor at a constant temperature, the current is {{directly proportional*|inversely proportional|not related}} to the potential difference.", m: 1, lines: 0 },
        ] },

      /* 3 */
      { lessons: "5–6", title: "Wires, series and parallel", subtitle: "Resistance of a wire (required practical) · rules for series and parallel circuits",
        doNow: [
          [96, "State the standard units of potential difference and resistance.", "Potential difference: volt (V); resistance: ohm (Ω)"],
          [98, "Describe how current depends on potential difference for an ohmic conductor.", "Current is directly proportional to potential difference."],
          [92, "Describe the current at different points in a single closed loop.", "It is the same at every point."],
        ],
        questions: [
          { stem: "A student measures the resistance of a wire at different lengths.",
            fig: T(["Length / cm", "20", "40", "60", "80"], [["Resistance / Ω", "0.8", "1.6", "2.4", "3.2"]]),
            parts: [
              { q: "Describe the relationship between resistance and length.", m: 1, lines: 1, a: "Resistance is directly proportional to length (doubling the length doubles R) ✓" },
              { q: "Name one control variable.", m: 1, lines: 1, a: "Thickness (diameter) of the wire, material, or temperature ✓" },
              { q: "Explain why the potential difference is kept small.", m: 1, lines: 1, a: "So the current is small and the wire does not heat up (its resistance would change) ✓" },
            ] },
          { stem: "Two lamps are connected in series to a 12 V battery.",
            side: fig(D.circuit({ w: 360, h: 218, wires: ["M40 40 H320 V130 H40 Z", "M75 130 V180 H145 V130", "M215 130 V180 H285 V130"], parts: [["battery", 180, 40, "h", "12 V"], ["lamp", 110, 130, "h"], ["lamp", 250, 130, "h"], ["voltmeter", 110, 180, "h", "V₁ = 7.5 V", "b"], ["voltmeter", 250, 180, "h", "V₂ = ?", "b"]], dots: [[75, 130], [145, 130], [215, 130], [285, 130]] }), 58),
            cols: "1.2fr 1fr",
            parts: [
              { q: "Calculate the reading on V₂.", m: 1, lines: 1, a: "12 − 7.5 = 4.5 V ✓" },
              { q: "Two resistors, 4 Ω and 8 Ω, are in series. Total resistance: [[12 Ω|18]]", m: 1, lines: 0 },
              { q: "Describe the potential difference across components in parallel.", m: 1, lines: 1, a: "It is the same across each component ✓" },
              { q: "In a parallel circuit, the total current is 0.90 A. One branch has 0.40 A. The other branch has [[0.50 A|18]]", m: 1, lines: 0 },
            ] },
        ] },

      /* 4 */
      { lessons: "7–8", title: "Combining resistors and I–V graphs", subtitle: "Resistors in series and parallel (required practical) · I–V characteristics",
        doNow: [
          [118, "Describe how to calculate the total resistance of two resistors in series.", "Add the two resistances: R<sub>total</sub> = R₁ + R₂"],
          [129, "Describe the potential difference across components in parallel.", "It is the same across each component."],
          [112, "Describe how the length of a wire affects its resistance.", "The resistance increases (it is directly proportional to length)."],
        ],
        questions: [
          { stem: "Two 10 Ω resistors are connected in parallel.",
            parts: [
              { q: "Their total resistance is {{less than 10 Ω*|10 Ω|20 Ω}}", m: 1, lines: 0 },
              { q: "Explain why adding a resistor in parallel decreases the total resistance.", m: 2, lines: 2,
                a: "Each new branch gives the charge another path ✓<br>so the total current increases for the same p.d. ✓" },
            ] },
          { stem: "These are the I–V characteristics of three components.",
            fig: `<div class="iv-row">${iv("resistor", "A")}${iv("lamp", "B")}${iv("diode", "C")}</div>`,
            parts: [
              { q: "Which graph shows a filament lamp? {{A|B*|C}}", m: 1, lines: 0 },
              { q: "Which component lets current flow in one direction only? {{resistor|filament lamp|diode*}}", m: 1, lines: 0 },
              { q: "Explain why the resistance of a filament lamp increases as the current increases.", m: 2, lines: 2,
                a: "A greater current makes the filament hotter ✓<br>and its resistance increases with temperature ✓" },
            ] },
        ] },

      /* 5 */
      { lessons: "9–10", title: "I–V investigations and sensors", subtitle: "Investigating I–V characteristics (required practical) · thermistors, LDRs and sensing circuits",
        doNow: [
          [102, "Explain why the resistance of a filament lamp increases with current.", "A greater current makes the filament hotter, and its resistance increases with temperature."],
          [77, "State the function of a diode.", "To allow current in one direction only."],
          [636, "Describe the total resistance of two resistors connected in parallel.", "It is less than the resistance of the smaller resistor."],
        ],
        questions: [
          { stem: "A student finds the I–V characteristic of a lamp.",
            parts: [
              { q: "Name the independent and dependent variables.", m: 1, lines: 1, a: "Independent: p.d. across the lamp; dependent: current through it ✓" },
              { q: "State why a variable resistor is included in the circuit.", m: 1, lines: 1, a: "To change the current (and p.d.) so several readings can be taken ✓" },
              { q: "Explain why the student reverses the connections to the lamp.", m: 1, lines: 1, a: "To take readings with negative p.d. and current (the other direction) ✓" },
            ] },
          { q: "As the temperature of a thermistor increases, its resistance {{increases|decreases*|stays the same}}", m: 1, lines: 0 },
          { q: "In the dark, the resistance of an LDR is {{high*|low}}", m: 1, lines: 0 },
          { stem: "A thermistor is connected in series with a fixed resistor and a battery. The circuit switches on a fan when the room gets hot.",
            q: "Explain what happens to the current in the thermistor as the room warms up.", m: 2, lines: 2,
            a: "The resistance of the thermistor decreases ✓<br>so the current increases (and can switch on the fan) ✓" },
        ] },

      /* 6 */
      { lessons: "11–12", title: "Power, mains and the National Grid", subtitle: "P = V I and P = I² R · energy transferred · mains electricity, safety and the Grid",
        doNow: [
          [105, "Describe how the resistance of a thermistor varies with temperature.", "As the temperature increases, the resistance decreases."],
          [106, "Describe how the resistance of an LDR varies with light intensity.", "As the light intensity increases, the resistance decreases."],
          [121, "Finding the I–V characteristic of a component: name the independent and dependent variables.", "Independent: p.d. across the component; dependent: current through it"],
        ],
        questions: [
          { stem: "A kettle is connected to the 230 V mains. The current is 8.0 A. Use P = V I",
            q: "Calculate the power of the kettle.", m: 2, lines: 2, a: "P = V I = 230 × 8.0 ✓<br>P = 1840 W ✓" },
          { stem: "The current in a 15 Ω resistor is 2.0 A. Use P = I² R",
            q: "Calculate the power transferred in the resistor.", m: 2, lines: 2, a: "P = I² R = 2.0² × 15 ✓<br>P = 60 W ✓" },
          { q: "The frequency of the UK mains supply is {{50 Hz*|60 Hz|230 Hz}}", m: 1, lines: 0 },
          { q: "State the function of the earth wire.", m: 1, lines: 1, a: "A safety wire that stops the appliance becoming live ✓" },
          { q: "Explain why step-up transformers are used before electricity is transmitted.", m: 1, lines: 2,
            a: "Higher p.d. means a smaller current, so less energy is wasted heating the cables ✓" },
        ] },
    ],
  };
})();
