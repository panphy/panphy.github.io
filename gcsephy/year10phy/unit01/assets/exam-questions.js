(function () {
  "use strict";

  const D = window.Diagrams;
  const LOOP = "M40 40 H320 V150 H40 Z";

  window.EXAM_QUESTIONS = [
    // Round 1
    {
      section: "Round 1 · Charge, p.d. and resistance",
      skill: "Recall",
      marks: 1,
      prompt: "Which quantity is defined as the energy transferred per unit charge?",
      options: ["Current", "Potential difference", "Resistance", "Power"],
      hint: "Its unit is equivalent to joules per coulomb.",
      answer: "<strong>B — Potential difference</strong> (1 mark). 1 V = 1 J/C.",
    },
    {
      section: "Round 1 · Charge, p.d. and resistance",
      skill: "Calculation",
      marks: 3,
      prompt: "A torch bulb carries a current of 0.15 A for 4.0 minutes. Calculate the charge that flows through the bulb.",
      hint: "Q = I t, with t in seconds.",
      answer: "t = 4.0 × 60 = 240 s (1 mark). Q = I t = 0.15 × 240 (1 mark) = <strong>36 C</strong> (1 mark).",
    },
    {
      section: "Round 1 · Charge, p.d. and resistance",
      skill: "Multi-step",
      marks: 4,
      prompt: "A 12 Ω resistor has a current of 0.50 A through it for 60 s. Calculate (a) the p.d. across the resistor and (b) the energy transferred to the resistor.",
      hint: "(a) V = I R. (b) Find the charge with Q = I t, then E = Q V.",
      answer: "(a) V = I R = 0.50 × 12 = <strong>6.0 V</strong> (1 mark).<br>(b) Q = I t = 0.50 × 60 = 30 C (1 mark). E = Q V = 30 × 6.0 (1 mark) = <strong>180 J</strong> (1 mark).",
    },
    {
      section: "Round 1 · Charge, p.d. and resistance",
      skill: "Explain",
      marks: 3,
      prompt: "A student says: “Current and potential difference measure the same thing.” Explain why the student is wrong.",
      hint: "Define each quantity in terms of charge. What is each one ‘per’?",
      answer: "Current is the rate of flow of charge / the charge passing a point per second (1 mark). Potential difference is the energy transferred per unit charge between two points (1 mark). So current describes how fast charge flows, while p.d. describes how much energy each coulomb transfers (1 mark).",
    },

    // Round 2
    {
      section: "Round 2 · Components and graphs",
      skill: "Graph reading",
      marks: 3,
      stimulus: D.ivSketch("diode", "I–V graph for component X."),
      prompt: "Identify component X. Describe and explain what the graph shows for negative values of p.d.",
      hint: "What happens to the current when the p.d. is reversed? What does that tell you about the resistance?",
      answer: "Component X is a diode (1 mark). For negative p.d. the current is zero (1 mark) because the diode has a very high resistance in the reverse direction / only lets current flow one way (1 mark).",
    },
    {
      section: "Round 2 · Components and graphs",
      skill: "Data analysis",
      marks: 4,
      stimulus: `<table class="data-table"><caption>Readings for a filament lamp</caption><thead><tr><th>p.d. / V</th><th>1.0</th><th>4.0</th><th>8.0</th></tr></thead><tbody><tr><th>current / A</th><td>0.20</td><td>0.40</td><td>0.50</td></tr></tbody></table>`,
      prompt: "Use the data to show how the resistance of the lamp changes, and explain why it changes.",
      hint: "Calculate R = V ÷ I for each reading. Then link current → temperature → ions → collisions.",
      answer: "R = 5.0 Ω, 10 Ω and 16 Ω, so the resistance increases as the current increases (1 mark for calculations, 1 mark for the trend). A larger current heats the filament (1 mark). The ions vibrate more, so electrons collide with them more often, increasing the resistance (1 mark).",
    },
    {
      section: "Round 2 · Components and graphs",
      skill: "Application",
      marks: 3,
      stimulus: D.circuit({
        w: 360, h: 205,
        wires: [LOOP],
        parts: [["battery", 180, 40, "h", "12 V"], ["ammeter", 40, 95, "v"], ["thermistor", 130, 150, "h", "thermistor", "b"], ["resistor", 250, 150, "h", "fixed resistor", "b"]],
      }),
      prompt: "The circuit is part of a thermostat. Describe and explain what happens to the ammeter reading as the room gets warmer.",
      hint: "Thermistor: temperature ↑ → resistance ? Then total resistance → current.",
      answer: "The resistance of the thermistor decreases as the temperature increases (1 mark). So the total resistance of the series circuit decreases (1 mark). The supply p.d. is unchanged, so the current / ammeter reading increases (1 mark).",
    },

    // Round 3
    {
      section: "Round 3 · Series and parallel",
      skill: "Calculation",
      marks: 4,
      stimulus: D.circuit({
        w: 360, h: 205,
        wires: [LOOP],
        parts: [["battery", 180, 40, "h", "6.0 V"], ["ammeter", 40, 95, "v"], ["resistor", 130, 150, "h", "4.0 Ω", "b"], ["resistor", 250, 150, "h", "8.0 Ω", "b"]],
      }),
      prompt: "Calculate the ammeter reading and the p.d. across the 8.0 Ω resistor.",
      hint: "Add series resistances, find I = V ÷ R_total, then use V = I R for the 8.0 Ω resistor.",
      answer: "R_total = 4.0 + 8.0 = 12 Ω (1 mark). I = 6.0 ÷ 12 = <strong>0.50 A</strong> (1 mark). V = I R = 0.50 × 8.0 (1 mark) = <strong>4.0 V</strong> (1 mark).",
    },
    {
      section: "Round 3 · Series and parallel",
      skill: "Calculation",
      marks: 4,
      stimulus: D.circuit({
        w: 360, h: 225,
        wires: ["M40 40 H320 V185 H40 Z", "M40 115 H320"],
        parts: [["battery", 180, 40, "h", "12 V"], ["ammeter", 40, 77, "v", "A₀", "r"], ["resistor", 200, 115, "h", "6.0 Ω"], ["ammeter", 110, 115, "h", "A₁"], ["resistor", 200, 185, "h", "12 Ω", "b"]],
        dots: [[40, 115], [320, 115]],
      }),
      prompt: "Calculate the readings on ammeters A₁ and A₀.",
      hint: "Each parallel branch has the full 12 V across it. The main current is the sum of the branch currents.",
      answer: "Each branch has 12 V across it (1 mark). A₁ = 12 ÷ 6.0 = <strong>2.0 A</strong> (1 mark). Other branch = 12 ÷ 12 = 1.0 A (1 mark). A₀ = 2.0 + 1.0 = <strong>3.0 A</strong> (1 mark).",
    },
    {
      section: "Round 3 · Series and parallel",
      skill: "Recall",
      marks: 1,
      prompt: "Two 10 Ω resistors are connected in parallel. Which is the total resistance?",
      options: ["20 Ω", "15 Ω", "10 Ω", "5 Ω"],
      hint: "The total resistance in parallel is less than the smallest resistor.",
      answer: "<strong>D — 5 Ω</strong> (1 mark). It is the only option less than 10 Ω.",
    },
    {
      section: "Round 3 · Series and parallel",
      skill: "Required practical",
      marks: 6,
      prompt: "Describe a method to investigate how the total resistance of a circuit changes when identical resistors are added (a) in series and (b) in parallel.",
      hint: "Circuit with meters; how you add resistors; what you record; how you calculate R; what you expect to find.",
      answer: "Indicative content (6 marks, level-marked):<br>• Connect one resistor to a battery/power supply with an ammeter in series and a voltmeter across the resistor combination.<br>• Record the p.d. and current and calculate R = V ÷ I.<br>• Add a second identical resistor in series, record V and I again and calculate R_total; repeat for three and four resistors.<br>• Repeat the whole process, this time adding each resistor in parallel with the others.<br>• Keep the supply p.d. the same and switch off between readings so the resistors do not heat up.<br>• Repeat and find means; plot R_total against number of resistors for each arrangement.<br>• Expected: R_total increases with each resistor in series and decreases with each resistor in parallel.",
    },

    // Round 4
    {
      section: "Round 4 · Mains and power",
      skill: "Recall",
      marks: 3,
      prompt: "Name the wire in a three-core cable that is green and yellow. State its potential and explain its purpose.",
      hint: "It is a safety wire. When does it carry a current?",
      answer: "Earth wire (1 mark). It is at 0 V (1 mark). It is a safety wire that stops the appliance's case becoming live; it only carries a current if there is a fault (1 mark).",
    },
    {
      section: "Round 4 · Mains and power",
      skill: "Graph reading",
      marks: 2,
      stimulus: D.graph({
        w: 380, h: 250, x: [0, 0.04, 0.01], y: [-8, 8, 2],
        xLabel: "time / s", yLabel: "p.d. / V",
        series: [{ fn: (t) => 6 * Math.sin(2 * Math.PI * 50 * t), from: 0, to: 0.04, samples: 200 }],
        caption: "Output of a laboratory power supply.",
      }),
      prompt: "Is this supply ac or dc? Give a reason, and state the maximum p.d.",
      hint: "Does the p.d. ever become negative?",
      answer: "ac, because the p.d. repeatedly reverses direction / becomes negative (1 mark). Maximum p.d. = <strong>6 V</strong> (1 mark).",
    },
    {
      section: "Round 4 · Mains and power",
      skill: "Calculation",
      marks: 5,
      prompt: "A microwave oven has a power of 800 W and runs on the 230 V mains. (a) Calculate the current. (b) Calculate the energy transferred in 4.5 minutes.",
      hint: "(a) Rearrange P = V I. (b) E = P t with t in seconds.",
      answer: "(a) I = P ÷ V = 800 ÷ 230 (1 mark) = <strong>3.5 A</strong> (1 mark).<br>(b) t = 4.5 × 60 = 270 s (1 mark). E = P t = 800 × 270 (1 mark) = <strong>216 000 J</strong> (1 mark).",
    },
    {
      section: "Round 4 · Mains and power",
      skill: "Calculation",
      marks: 3,
      prompt: "A power cable has a resistance of 0.50 Ω and carries a current of 20 A. Calculate the power wasted heating the cable. How would this change if the current were halved?",
      hint: "P = I² R. Then think about what halving I does to I².",
      answer: "P = I² R = 20² × 0.50 (1 mark) = <strong>200 W</strong> (1 mark). Halving the current makes the power a quarter: 10² × 0.50 = <strong>50 W</strong> (1 mark).",
    },
    {
      section: "Round 4 · Mains and power",
      skill: "Explain",
      marks: 4,
      prompt: "Describe the roles of step-up and step-down transformers in the National Grid.",
      hint: "Where is each used, what does it do to the p.d., and why?",
      answer: "Step-up transformers are used between the power station and the transmission cables (1 mark). They increase the p.d. so the current is lower for the same power, which reduces energy losses from heating the cables (1 mark). Step-down transformers are used between the transmission cables and consumers (1 mark). They decrease the p.d. to a much lower, safer value (about 230 V) for use in homes (1 mark).",
    },
    {
      section: "Round 4 · Mains and power",
      skill: "Calculation",
      tier: "HT",
      marks: 3,
      prompt: "A step-down transformer changes 132 000 V to 33 000 V. The current in the secondary coil is 200 A. Calculate the current in the primary coil. Assume the transformer is 100% efficient.",
      hint: "V_p × I_p = V_s × I_s. This equation is on the equation sheet.",
      answer: "I_p = (V_s × I_s) ÷ V_p (1 mark) = (33 000 × 200) ÷ 132 000 (1 mark) = <strong>50 A</strong> (1 mark).",
    },
  ];
})();
