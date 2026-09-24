(function () {
  "use strict";

  const D = window.Diagrams;
  const LOOP = "M40 40 H320 V150 H40 Z";

  window.LESSONS = [
    // ------------------------------------------------------------------ 1
    {
      slug: "charge-and-current",
      number: "01",
      shortTitle: "Charge on the move",
      title: "Charge on the move",
      mission: "Measure the flow",
      intro:
        "Current is not ‘electricity’ in general. It is a rate: how much charge passes a point every second. Learn what moves, which way it goes and why none of it gets used up.",
      colour: "cyan",
      icon: "Q",
      spec: "AQA 6.2.1.2 · Sep 4.2.1.2",
      unlocks: ["current as a rate", "Q = I t", "electrons vs conventional current"],
      keyRule: "Q = I t. Current is the rate of flow of charge, and it is the same at every point in a single loop.",
      lab: { label: "Lab 1", page: 3, range: "3–6" },
      revision: {
        summary:
          "A current is charge flowing. Its size tells you how many coulombs pass a point each second, not how much charge is in the circuit.",
        sections: [
          {
            title: "What is an electric current?",
            paragraphs: [
              "An electric current is a flow of electric charge. The size of the current is the rate of flow of charge: the charge passing a point each second.",
              "In a metal wire the moving charges are free electrons. Each carries a tiny negative charge, and enormous numbers of them drift through the wire together.",
            ],
            points: [
              "Charge Q is measured in coulombs (C).",
              "Current I is measured in amperes (A), often shortened to amps.",
              "1 A means 1 C of charge passes a point every second.",
              "For charge to flow you need a closed loop and a source of potential difference, such as a cell.",
            ],
            remember: "Current is a rate. ‘0.60 A’ means 0.60 C per second, not 0.60 C in the whole circuit.",
          },
          {
            title: "Charge flow = current × time",
            paragraphs: [
              "For a steady current, multiply the current by the time it flows to find the total charge that passes a point.",
            ],
            equation: {
              eq: "Q = I t",
              words: "charge flow = current × time",
              units: "Q in coulombs (C) · I in amperes (A) · t in seconds (s)",
              flag: "Recall and apply",
            },
            points: ["Rearranged: I = Q ÷ t and t = Q ÷ I.", "Always convert time to seconds first: minutes × 60, hours × 3600."],
            formula: "0.25 A for 2.0 minutes → t = 120 s → Q = 0.25 × 120 = 30 C",
          },
          {
            title: "Electrons and conventional current",
            paragraphs: [
              "In the wires outside the cell, electrons move from the negative terminal towards the positive terminal.",
              "Circuit arrows show conventional current, which points from positive to negative. The direction was chosen long before the electron was discovered, and it has stayed as the standard.",
            ],
            figure: D.circuit({
              w: 360, h: 200,
              wires: [LOOP],
              parts: [["cell", 180, 40, "h"], ["resistor", 180, 150, "h", "resistor", "b"]],
              flows: [[100, 40, "h-"], [40, 95, "v"], [110, 150, "h"], [320, 105, "v", "electron"], [260, 40, "h", "electron"], [250, 150, "h-", "electron"]],
              notes: [[170, 20, "+"], [192, 20, "−"], [58, 80, "conventional", "start", "hot"], [58, 96, "current: + → −", "start", "hot"], [302, 80, "electrons:", "end", "cool"], [302, 96, "− → +", "end", "cool"]],
              caption: "Orange arrows: conventional current (+ to −). Blue arrows: electron flow (− to +). They describe the same current.",
            }),
            remember: "Both descriptions give the same size of current. Only the direction of the arrow is different.",
          },
          {
            title: "Current is not used up",
            paragraphs: [
              "In a single closed loop the current is the same at every point. An ammeter before a resistor, after it and next to the cell all give the same reading.",
              "Charge is not destroyed in a component. What the component takes is energy, carried by the charge. If the loop is broken anywhere, the current stops everywhere at once.",
            ],
            figure: D.circuit({
              w: 360, h: 200,
              wires: [LOOP],
              parts: [["cell", 180, 40, "h", "6 V"], ["ammeter", 40, 95, "v", "0.60 A", "r"], ["ammeter", 320, 95, "v", "0.60 A", "l"], ["ammeter", 110, 150, "h", "0.60 A", "b"], ["resistor", 230, 150, "h", "10 Ω", "b"]],
              caption: "Three ammeters in one loop give the same reading.",
            }),
            remember: "Charge is conserved: it goes round. Energy is transferred: it leaves the circuit at the components.",
          },
        ],
        mistakes: [
          ["“The resistor uses up some of the current.”", "The current is the same all the way round a single loop. The resistor transfers energy, not charge."],
          ["“0.60 A means there is 0.60 C in the circuit.”", "0.60 C passes any point in the loop every second."],
          ["Putting minutes straight into Q = I t.", "Convert to seconds first: 3 min = 180 s."],
        ],
        vocabulary: [
          ["Charge (Q)", "A property of particles such as electrons. Measured in coulombs, C."],
          ["Current (I)", "The rate of flow of electric charge. Measured in amperes, A."],
          ["Ampere", "One coulomb of charge passing a point per second."],
          ["Free electrons", "Electrons in a metal that can move between the positive ions and carry charge."],
          ["Conventional current", "The agreed direction of current: from the positive terminal to the negative terminal."],
          ["Closed circuit", "A complete, unbroken loop that charge can flow all the way round."],
        ],
      },
      questions: [
        {
          type: "Practice",
          prompt: "A charge of 45 C flows through a lamp in 30 s. Calculate the current in the lamp.",
          hint: "Current is charge per second, so use I = Q ÷ t.",
          answer: "I = Q ÷ t = 45 ÷ 30 = <strong>1.5 A</strong>.",
        },
        {
          type: "Practice",
          prompt: "A current of 0.40 A flows for 3.0 minutes. Calculate the charge that flows.",
          hint: "Convert 3.0 minutes to seconds before using Q = I t.",
          answer: "t = 3.0 × 60 = 180 s. Q = I t = 0.40 × 180 = <strong>72 C</strong>.",
        },
        {
          type: "Practice",
          prompt: "Jay says: “The ammeter after the lamp will read less than the ammeter before it, because the lamp uses some current up.” Explain why Jay is wrong.",
          hint: "Think about what is conserved in a single loop, and what the lamp actually takes from the charge.",
          answer: "The lamp and the two ammeters are in one single loop, so the current is the same at every point and both ammeters give the same reading. Charge is not used up. The lamp transfers <em>energy</em> carried by the charge, which is why it lights.",
        },
        {
          type: "AQA-style",
          marks: 3,
          prompt: "A phone charger supplies a steady current of 1.2 A. Calculate the time taken for 5400 C of charge to flow. Give your answer in minutes.",
          hint: "Rearrange Q = I t to make t the subject. The equation gives seconds, so convert at the end.",
          answer: "t = Q ÷ I (1 mark) = 5400 ÷ 1.2 = 4500 s (1 mark) = 4500 ÷ 60 = <strong>75 minutes</strong> (1 mark).",
        },
        {
          type: "AQA-style",
          marks: 2,
          prompt: "A student connects a cell, a switch and a lamp in series. Explain why no current flows when the switch is open, even though the cell is still connected.",
          hint: "What two things does a circuit need for charge to flow?",
          answer: "An open switch leaves a gap, so there is no complete (closed) loop (1 mark). Charge cannot flow all the way round the circuit, so the current is zero everywhere in the loop, even though the cell still provides a potential difference (1 mark).",
        },
      ],
    },

    // ------------------------------------------------------------------ 2
    {
      slug: "potential-difference",
      number: "02",
      shortTitle: "Energy per coulomb",
      title: "Energy per coulomb",
      mission: "Follow the energy",
      intro:
        "Current tells you how fast the charge flows. Potential difference tells you how much energy each coulomb transfers. Keep the two ideas separate and circuits start to make sense.",
      colour: "spark",
      icon: "V",
      spec: "AQA 6.2.1.3, 6.2.4.2 · Sep 4.2.1.3, 4.2.4.2",
      unlocks: ["p.d. as energy per coulomb", "E = Q V", "measuring p.d. across"],
      keyRule: "V = E ÷ Q. One volt is one joule of energy transferred per coulomb of charge.",
      lab: { label: "Lab 2", page: 7, range: "7–11" },
      revision: {
        summary:
          "Potential difference is measured between two points. It tells you how much energy is transferred for every coulomb of charge that passes between them.",
        sections: [
          {
            title: "What a volt means",
            paragraphs: [
              "The potential difference (p.d.) between two points is the energy transferred per coulomb of charge that moves between them.",
              "A p.d. of 6 V across a resistor means 6 J of energy is transferred to the resistor for every 1 C of charge that passes through it.",
            ],
            points: [
              "p.d. is measured in volts (V).",
              "1 V = 1 J per coulomb.",
              "AQA questions say ‘potential difference’. ‘Voltage’ also gets credit, but use p.d. when you can.",
            ],
            remember: "Current = charge per second. p.d. = energy per coulomb. They are different quantities.",
          },
          {
            title: "Energy = charge × p.d.",
            paragraphs: ["Multiply the charge that flows by the p.d. to find the energy transferred."],
            equation: {
              eq: "E = Q V",
              words: "energy transferred = charge flow × potential difference",
              units: "E in joules (J) · Q in coulombs (C) · V in volts (V)",
              flag: "Recall and apply",
            },
            points: ["Rearranged: V = E ÷ Q and Q = E ÷ V.", "Two-step questions often give current and time. Find Q = I t first, then use E = Q V."],
            formula: "2.0 A for 10 s at 12 V → Q = 2.0 × 10 = 20 C → E = 20 × 12 = 240 J",
          },
          {
            title: "A p.d. is always across something",
            paragraphs: [
              "A p.d. compares two points, so a voltmeter has two leads. Connect it <strong>across</strong> the component, in parallel, with one lead on each side.",
              "Both probes on the same piece of wire read about 0 V, because almost no energy is transferred along a connecting wire.",
            ],
            figure: D.circuit({
              w: 360, h: 240,
              wires: [LOOP, "M130 150 V205 H230 V150"],
              parts: [["battery", 180, 40, "h", "6 V"], ["ammeter", 40, 95, "v"], ["resistor", 180, 150, "h", "10 Ω"], ["voltmeter", 180, 205, "h", "reads 6 V", "b"]],
              dots: [[130, 150], [230, 150]],
              caption: "The ammeter is in series. The voltmeter is connected across the resistor, in parallel.",
            }),
            remember: "Say “the p.d. across the resistor”, not “the voltage at the resistor”.",
          },
          {
            title: "Energy in, energy out",
            paragraphs: [
              "The cell or battery is the <strong>source</strong>: it transfers energy to the charge. Components such as resistors, lamps and motors are <strong>loads</strong>: energy is transferred from the charge to them, and then on to the surroundings.",
              "In a single loop the energy each coulomb gains in the battery equals the energy it transfers in all the components. That is why the p.d.s across the components add up to the battery p.d.",
            ],
            figure: D.circuit({
              w: 360, h: 200,
              wires: [LOOP],
              parts: [["battery", 180, 40, "h", "6 V: 6 J gained per C"], ["resistor", 110, 150, "h", "R₁: 3 V", "b"], ["resistor", 250, 150, "h", "R₂: 3 V", "b"]],
              caption: "Two equal resistors in series: each coulomb transfers 3 J in R₁ and 3 J in R₂.",
            }),
            remember: "Charge is conserved AND energy is conserved: 6 J supplied per coulomb = 3 J + 3 J transferred.",
          },
        ],
        mistakes: [
          ["“Current and voltage are the same thing.”", "Current is charge per second. p.d. is energy per coulomb."],
          ["“The voltage at the resistor.”", "“The p.d. across the resistor”: always two points."],
          ["“The charge is used up in the lamp.”", "The charge carries on round the loop. Its energy is transferred in the lamp."],
        ],
        vocabulary: [
          ["Potential difference", "The energy transferred per coulomb of charge between two points. Measured in volts."],
          ["Volt", "One joule per coulomb."],
          ["Joule", "The unit of energy."],
          ["Source", "A component that transfers energy to the charge, such as a cell, battery or power supply."],
          ["Load", "A component that transfers energy from the charge, such as a lamp, resistor or motor."],
          ["Voltmeter", "A meter connected in parallel across a component to measure the p.d. across it."],
        ],
      },
      questions: [
        {
          type: "Practice",
          prompt: "A lamp has a p.d. of 12 V across it. Calculate the energy transferred when 5.0 C of charge passes through it.",
          hint: "Energy transferred = charge flow × p.d.",
          answer: "E = Q V = 5.0 × 12 = <strong>60 J</strong>.",
        },
        {
          type: "Practice",
          prompt: "A kettle element transfers 69 000 J of energy when 300 C of charge flows through it. Calculate the p.d. across the element.",
          hint: "Rearrange E = Q V to make V the subject.",
          answer: "V = E ÷ Q = 69 000 ÷ 300 = <strong>230 V</strong>.",
        },
        {
          type: "Practice",
          prompt: "Explain what is meant by “a p.d. of 9 V across a resistor”.",
          hint: "Use the words energy, coulomb and transferred.",
          answer: "For every 1 coulomb of charge that passes through the resistor, 9 J of energy is transferred to the resistor.",
        },
        {
          type: "AQA-style",
          marks: 4,
          prompt: "A 12 V battery drives a steady current of 0.50 A through a motor for 40 s. Calculate the energy transferred to the motor.",
          hint: "Two steps: find the charge from the current and time, then use it with the p.d.",
          answer: "Q = I t = 0.50 × 40 (1 mark) = 20 C (1 mark). E = Q V = 20 × 12 (1 mark) = <strong>240 J</strong> (1 mark).",
        },
        {
          type: "AQA-style",
          marks: 3,
          prompt: "The circuit shows a 9.0 V battery connected in series with a lamp and a resistor. The voltmeter reads 5.5 V. Calculate the p.d. across the resistor, and explain your answer in terms of energy.",
          figure: D.circuit({
            w: 360, h: 245,
            wires: [LOOP, "M90 150 V205 H150 V150"],
            parts: [["battery", 180, 40, "h", "9.0 V"], ["lamp", 120, 150, "h"], ["resistor", 250, 150, "h", "resistor", "b"], ["voltmeter", 120, 205, "h", "5.5 V", "b"]],
            dots: [[90, 150], [150, 150]],
            caption: "The voltmeter is connected across the lamp.",
          }),
          hint: "In a series loop, the p.d.s across the components add up to the battery p.d.",
          answer: "p.d. across resistor = 9.0 − 5.5 = <strong>3.5 V</strong> (1 mark). Each coulomb gains 9.0 J in the battery (1 mark). That energy is shared between the components, so 5.5 J per coulomb is transferred in the lamp and the remaining 3.5 J per coulomb in the resistor (1 mark).",
        },
      ],
    },

    // ------------------------------------------------------------------ 3
    {
      slug: "resistance",
      number: "03",
      shortTitle: "Resistance & V = IR",
      title: "Resistance & V = IR",
      mission: "Control the current",
      intro:
        "Resistance is how strongly a component opposes the current. Put p.d., current and resistance together in one rule and you can predict any simple circuit before you build it.",
      colour: "copper",
      icon: "Ω",
      spec: "AQA 6.2.1.3, 6.2.1.4 · Sep 4.2.1.3, 4.2.1.4",
      unlocks: ["V = I R", "Ohm's law", "why metals have resistance"],
      keyRule: "V = I R. The greater the resistance, the smaller the current for the same p.d.",
      lab: { label: "Lab 3", page: 12, range: "12–16" },
      revision: {
        summary:
          "The current through a component depends on the p.d. across it and on its resistance. For an ohmic conductor at constant temperature, the resistance does not change.",
        sections: [
          {
            title: "Resistance opposes current",
            paragraphs: [
              "The current through a component depends on both the p.d. across it and its resistance. For a given p.d., a larger resistance gives a smaller current.",
            ],
            points: [
              "Resistance R is measured in ohms (Ω).",
              "Resistance is the ratio p.d. ÷ current: R = V ÷ I.",
              "1 Ω means 1 V is needed for each 1 A of current.",
            ],
            remember: "Double the resistance with the same p.d. and the current halves.",
          },
          {
            title: "p.d. = current × resistance",
            paragraphs: ["This is the most used equation in the unit. Learn all three arrangements."],
            equation: {
              eq: "V = I R",
              words: "potential difference = current × resistance",
              units: "V in volts (V) · I in amperes (A) · R in ohms (Ω)",
              flag: "Recall and apply",
            },
            points: [
              "I = V ÷ R and R = V ÷ I.",
              "Convert first: 250 mA = 0.25 A; 2.2 kΩ = 2200 Ω.",
            ],
            formula: "15 Ω resistor, 0.20 A → V = 0.20 × 15 = 3.0 V",
          },
          {
            title: "Ohm's law and ohmic conductors",
            paragraphs: [
              "In 1827 Georg Ohm found that, for a metal wire kept at a constant temperature, the current is directly proportional to the p.d. across it. Components that behave like this are called ohmic conductors.",
              "Directly proportional means the I–V graph is a straight line through the origin, so the resistance stays the same as the current changes.",
            ],
            figure: D.graph({
              w: 360, h: 250, x: [0, 6, 1], y: [0, 0.6, 0.1],
              xLabel: "potential difference / V", yLabel: "current / A",
              series: [{ fn: (x) => 0.1 * x, from: 0, to: 6 }, { points: [[1, 0.1], [2, 0.2], [3, 0.3], [4, 0.4], [5, 0.5], [6, 0.6]] }],
              caption: "A 10 Ω resistor: every point gives V ÷ I = 10 Ω.",
            }),
            remember: "Ohmic only at constant temperature. Heat a wire and its resistance changes.",
          },
          {
            title: "Where resistance comes from",
            paragraphs: [
              "A metal is a lattice of positive ions surrounded by free electrons. A p.d. across the metal makes the electrons drift through it.",
              "As they move, the electrons collide with the vibrating ions. These collisions oppose their flow, which is the resistance, and transfer energy to the ions, so the metal heats up.",
            ],
            points: [
              "Hotter metal → ions vibrate more → more collisions → higher resistance.",
              "Longer wire → more ions to pass → more collisions → higher resistance.",
            ],
            remember: "Resistance explains why wires, heaters and lamp filaments get warm.",
          },
        ],
        mistakes: [
          ["R = V × I", "R = V ÷ I. Check the units: volts ÷ amps = ohms."],
          ["Using 250 mA as 250 in V = I R.", "Convert to amps: 250 mA = 0.25 A."],
          ["“Every component has a fixed resistance.”", "Only ohmic conductors at constant temperature do."],
        ],
        vocabulary: [
          ["Resistance", "The opposition to current; the ratio of p.d. to current. Measured in ohms, Ω."],
          ["Ohm", "The unit of resistance: one volt per ampere."],
          ["Ohmic conductor", "A conductor where current is directly proportional to p.d. at constant temperature."],
          ["Directly proportional", "Doubling one quantity doubles the other; the graph is a straight line through the origin."],
          ["Ion lattice", "The regular arrangement of positive ions in a metal that electrons collide with."],
        ],
      },
      questions: [
        {
          type: "Practice",
          prompt: "A resistor has a current of 0.30 A through it and a p.d. of 4.5 V across it. Calculate its resistance.",
          hint: "R = V ÷ I.",
          answer: "R = V ÷ I = 4.5 ÷ 0.30 = <strong>15 Ω</strong>.",
        },
        {
          type: "Practice",
          prompt: "A 220 Ω resistor has a p.d. of 3.0 V across it. Calculate the current through it in milliamps (mA).",
          hint: "Find I in amps first, then multiply by 1000 to get mA.",
          answer: "I = V ÷ R = 3.0 ÷ 220 = 0.0136 A = <strong>13.6 mA</strong> (about 14 mA).",
        },
        {
          type: "Practice",
          prompt: "A fixed resistor is kept at constant temperature. The p.d. across it is tripled. What happens to the current? Explain.",
          hint: "For an ohmic conductor, how are current and p.d. related?",
          answer: "The current triples. At constant temperature the resistance is constant, so the current is directly proportional to the p.d. (I = V ÷ R).",
        },
        {
          type: "AQA-style",
          marks: 3,
          prompt: "A student measures the p.d. across a component and the current through it. Use the data to decide whether the component is an ohmic conductor. Show your working.",
          stimulus: `<table class="data-table"><caption>Readings for component X</caption><thead><tr><th>p.d. / V</th><th>1.0</th><th>2.0</th><th>3.0</th><th>4.0</th></tr></thead><tbody><tr><th>current / A</th><td>0.10</td><td>0.20</td><td>0.30</td><td>0.40</td></tr></tbody></table>`,
          hint: "Calculate V ÷ I for at least two rows. What does an ohmic conductor's resistance do?",
          answer: "R = V ÷ I, e.g. 1.0 ÷ 0.10 = 10 Ω and 4.0 ÷ 0.40 = 10 Ω (1 mark). The resistance is the same for every reading / current is directly proportional to p.d. (1 mark). So the component is an ohmic conductor, assuming its temperature stayed constant (1 mark).",
        },
        {
          type: "AQA-style",
          marks: 4,
          prompt: "Explain, in terms of electrons and ions, why the resistance of a metal wire increases when its temperature increases.",
          hint: "Describe what the electrons do, what the ions do, and what changes when the metal gets hotter.",
          answer: "Current in the wire is a flow of free electrons (1 mark). The electrons collide with the positive ions in the metal lattice, which opposes their flow (1 mark). At a higher temperature the ions vibrate more (1 mark), so the electrons collide with them more often, so fewer electrons pass per second for the same p.d. and the resistance is higher (1 mark).",
        },
      ],
    },

    // ------------------------------------------------------------------ 4
    {
      slug: "build-and-measure",
      number: "04",
      shortTitle: "Build & measure",
      title: "Build & measure",
      mission: "Wire it like a physicist",
      intro:
        "Read a circuit diagram, place the meters correctly and design an experiment to measure resistance, including the required practical on the length of a wire.",
      colour: "leaf",
      icon: "A",
      spec: "AQA 6.2.1.1, RP 15 · Sep 4.2.1.1, RP 3",
      unlocks: ["standard circuit symbols", "ammeter series · voltmeter parallel", "required practical: wire length"],
      keyRule: "Ammeter in series. Voltmeter in parallel. Resistance = p.d. ÷ current.",
      lab: { label: "Meters", page: 1, range: "1–2" },
      revision: {
        summary:
          "Circuit diagrams use standard symbols so anyone can build your circuit. Meters only give true readings if they are connected the right way.",
        sections: [
          {
            title: "Standard circuit symbols",
            paragraphs: [
              "You need to recognise and draw all of these. On a cell, the longer line is the positive terminal. A battery is two or more cells joined together.",
            ],
            figure: D.symbolGrid([
              ["cell", "Cell"], ["battery", "Battery"], ["switchOpen", "Switch (open)"], ["switchClosed", "Switch (closed)"],
              ["resistor", "Resistor"], ["variable", "Variable resistor"], ["lamp", "Lamp"], ["fuse", "Fuse"],
              ["diode", "Diode"], ["led", "LED"], ["thermistor", "Thermistor"], ["ldr", "LDR"],
              ["ammeter", "Ammeter"], ["voltmeter", "Voltmeter"],
            ]),
            remember: "Draw wires with a ruler, as straight lines with right-angle corners, and leave no gaps.",
          },
          {
            title: "Placing the meters",
            paragraphs: [
              "An <strong>ammeter</strong> measures the current through a component. It goes in <strong>series</strong>, in the same loop, so the same charge flows through it. An ideal ammeter has almost no resistance, so it does not change the current.",
              "A <strong>voltmeter</strong> measures the p.d. across a component. It goes in <strong>parallel</strong>, one lead on each side. An ideal voltmeter has a very high resistance, so almost no current flows through it.",
            ],
            points: [
              "Voltmeter wrongly in series: it blocks the current; the reading is close to the battery p.d. and the current is nearly zero.",
              "Negative reading: the meter's leads are the wrong way round.",
            ],
          },
          {
            title: "A circuit to measure resistance",
            paragraphs: [
              "Measure the current through the component and the p.d. across it at the same time, then calculate R = V ÷ I. A variable resistor lets you change the current to take several readings.",
            ],
            figure: D.circuit({
              w: 380, h: 250,
              wires: ["M40 40 H340 V160 H40 Z", "M140 160 V215 H240 V160"],
              parts: [["battery", 120, 40, "h", "battery"], ["variable", 250, 40, "h", "variable resistor"], ["ammeter", 40, 100, "v"], ["resistor", 190, 160, "h", "component"], ["voltmeter", 190, 215, "h"]],
              dots: [[140, 160], [240, 160]],
              caption: "Ammeter in series with the component; voltmeter across it; variable resistor to change the current.",
            }),
            remember: "Take several pairs of readings, calculate R for each, then find a mean or plot a graph.",
          },
          {
            title: "Required practical: length of a wire",
            paragraphs: [
              "Tape a thin wire along a metre ruler. Connect one crocodile clip at 0 cm and move the other to change the length. Record the ammeter and voltmeter readings at each length and calculate R = V ÷ I.",
            ],
            points: [
              "Independent: length. Dependent: resistance. Control: material, thickness (diameter), temperature.",
              "Use a low p.d. and switch off between readings so the wire does not heat up.",
              "Plot resistance against length. A straight line through the origin shows R is directly proportional to length.",
            ],
            figure: D.graph({
              w: 360, h: 240, x: [0, 100, 20], y: [0, 5, 1],
              xLabel: "length / cm", yLabel: "resistance / Ω",
              series: [{ fn: (x) => 0.05 * x, from: 0, to: 100 }, { points: [[20, 1.0], [40, 2.1], [60, 2.9], [80, 4.1], [100, 5.0]] }],
              caption: "Typical results: resistance is directly proportional to the length of the wire.",
            }),
            remember: "Longer wire → more collisions between electrons and ions → higher resistance.",
          },
        ],
        mistakes: [
          ["Voltmeter connected in series with the lamp.", "Voltmeter in parallel, across the lamp."],
          ["“The results were wrong because of human error.”", "Name the mechanism, e.g. the wire heated up, so its resistance increased."],
          ["Measuring length from the edge of the clip by eye each time.", "Measure to the same contact point of the crocodile clip every time."],
        ],
        vocabulary: [
          ["Ammeter", "Measures current; connected in series; very low resistance."],
          ["Voltmeter", "Measures p.d.; connected in parallel; very high resistance."],
          ["Variable resistor", "A resistor whose resistance can be adjusted to change the current."],
          ["Series", "Connected one after another in the same loop."],
          ["Parallel", "Connected on separate branches between the same two points."],
          ["Control variable", "A variable kept the same so it cannot affect the result."],
        ],
      },
      questions: [
        {
          type: "Practice",
          prompt: "Describe where an ammeter and a voltmeter should be connected to find the resistance of a lamp.",
          hint: "One meter must have the same current flowing through it. The other must compare the two ends of the lamp.",
          answer: "The ammeter goes in series with the lamp, in the same loop. The voltmeter goes in parallel across the lamp, one lead on each side. Then R = V ÷ I.",
        },
        {
          type: "Practice",
          prompt: "A student builds this circuit to measure the p.d. across a lamp. The lamp does not light and the voltmeter reads almost 6 V. Explain what is wrong.",
          figure: D.circuit({
            w: 360, h: 200,
            wires: [LOOP],
            parts: [["battery", 180, 40, "h", "6 V"], ["lamp", 120, 150, "h", "lamp", "b"], ["voltmeter", 240, 150, "h", "voltmeter", "b"]],
          }),
          hint: "What is special about a voltmeter's resistance, and where should it go?",
          answer: "The voltmeter has been connected in series. Its very high resistance lets almost no current flow, so the lamp does not light, and nearly all of the battery p.d. is across the voltmeter. It should be connected in parallel, across the lamp.",
        },
        {
          type: "Practice",
          prompt: "In the wire-length practical, why should the current be kept small and the circuit switched off between readings?",
          hint: "What happens to a wire when a current flows through it, and how does that affect resistance?",
          answer: "A current heats the wire, and a hotter wire has a higher resistance. Keeping the current small and switching off between readings keeps the temperature constant, so length is the only thing changing the resistance.",
        },
        {
          type: "AQA-style",
          marks: 6,
          prompt: "Describe a method a student could use to investigate how the length of a wire affects its resistance. Include how the results should be processed.",
          hint: "Plan the circuit, the lengths, what you record, how you keep it fair, and what you calculate and plot.",
          answer: "Indicative content (6 marks, level-marked):<br>• Attach the wire to a metre ruler and connect it in series with a battery/power supply, an ammeter and a switch.<br>• Connect a voltmeter in parallel across the length of wire being tested, using crocodile clips.<br>• Fix one clip at 0 cm and place the other at a set length, e.g. 10 cm.<br>• Close the switch, record the current and p.d., then open the switch.<br>• Repeat for lengths up to 100 cm in equal steps, e.g. every 10 cm.<br>• Keep the p.d. low / switch off between readings so the temperature stays constant; use the same wire (material and diameter) throughout.<br>• Calculate R = V ÷ I for each length; repeat and find a mean.<br>• Plot resistance (y-axis) against length (x-axis) and draw a line of best fit.",
        },
        {
          type: "AQA-style",
          marks: 3,
          prompt: "Describe the relationship shown by these results and use it to predict the resistance of an 80 cm length of the same wire.",
          stimulus: `<table class="data-table"><caption>Resistance of a constantan wire</caption><thead><tr><th>Length / cm</th><th>20</th><th>40</th><th>60</th></tr></thead><tbody><tr><th>Resistance / Ω</th><td>1.4</td><td>2.8</td><td>4.2</td></tr></tbody></table>`,
          hint: "What happens to the resistance each time the length doubles, or increases by 20 cm?",
          answer: "Resistance is directly proportional to length (1 mark): doubling the length from 20 cm to 40 cm doubles R, and each extra 20 cm adds 1.4 Ω (1 mark). At 80 cm, R = 4 × 1.4 = <strong>5.6 Ω</strong> (1 mark).",
        },
      ],
    },

    // ------------------------------------------------------------------ 5
    {
      slug: "iv-characteristics",
      number: "05",
      shortTitle: "I–V characteristics",
      title: "I–V charac&shy;teristics",
      mission: "Read a component's fingerprint",
      intro:
        "Every component has its own current–p.d. graph. Learn to recognise the resistor, the filament lamp and the diode, and explain how thermistors and LDRs switch real devices on and off.",
      colour: "violet",
      icon: "I–V",
      spec: "AQA 6.2.1.4, RP 16 · Sep 4.2.1.4, RP 4",
      unlocks: ["resistor · lamp · diode graphs", "thermistors and LDRs", "required practical: I–V"],
      keyRule: "Only an ohmic conductor at constant temperature gives a straight line through the origin. For everything else, R changes.",
      revision: {
        summary:
          "An I–V graph shows how the current through a component changes with the p.d. across it. Its shape tells you whether the resistance stays constant.",
        sections: [
          {
            title: "Reading an I–V graph",
            paragraphs: [
              "Current goes on the y-axis and p.d. on the x-axis. Negative values mean the component has been connected the other way round.",
              "Find the resistance at any point with R = V ÷ I, using that point's readings.",
            ],
            figure: D.ivSketch("resistor", "Fixed resistor (constant temperature): a straight line through the origin, so R is constant."),
            points: ["Straight line through the origin → ohmic, constant R.", "Curve → the resistance changes as the current changes."],
          },
          {
            title: "Filament lamp",
            paragraphs: [
              "As the current increases, the filament gets hotter. The metal ions vibrate more, so electrons collide with them more often and the resistance increases.",
              "The graph curves over and gets less steep: each extra volt gives a smaller increase in current. It looks the same with the p.d. reversed.",
            ],
            figure: D.ivSketch("lamp", "Filament lamp: resistance increases as the filament temperature increases."),
            remember: "Explain the curve using temperature, not just ‘the resistance goes up’.",
          },
          {
            title: "Diode (and LED)",
            paragraphs: [
              "A diode lets current flow in one direction only. In the reverse direction it has a very high resistance, so the current is practically zero.",
              "In the forward direction almost no current flows until the p.d. reaches about 0.6 V; after that, the current rises steeply. An LED (light-emitting diode) behaves the same way and emits light when current flows.",
            ],
            figure: D.ivSketch("diode", "Diode: current flows one way only; very high resistance in reverse."),
          },
          {
            title: "Thermistor",
            paragraphs: [
              "The resistance of a thermistor decreases as its temperature increases.",
              "Use: temperature-sensing circuits such as a thermostat. As the room warms, the thermistor's resistance falls, the current changes, and the circuit switches the heating off.",
            ],
            figure: D.graph({
              sketch: true, w: 300, h: 210, x: [0, 1], y: [0, 1],
              xLabel: "temperature", yLabel: "resistance",
              series: [{ fn: (x) => 0.9 * Math.exp(-2.6 * x) + 0.05, from: 0.03, to: 1 }],
              caption: "Hotter thermistor → lower resistance.",
            }),
          },
          {
            title: "Light-dependent resistor (LDR)",
            paragraphs: [
              "The resistance of an LDR decreases as the light intensity increases. In the dark its resistance is very high.",
              "Use: circuits that switch lights on when it gets dark, such as street lights and garden lights. As it gets darker the LDR's resistance rises and the circuit turns the lamp on.",
            ],
            figure: D.graph({
              sketch: true, w: 300, h: 210, x: [0, 1], y: [0, 1],
              xLabel: "light intensity", yLabel: "resistance",
              series: [{ fn: (x) => 0.9 * Math.exp(-2.6 * x) + 0.05, from: 0.03, to: 1 }],
              caption: "Brighter light → lower resistance.",
            }),
          },
          {
            title: "Required practical: I–V characteristics",
            paragraphs: [
              "Connect the component in series with an ammeter, a variable resistor and a power supply, with a voltmeter across the component. Adjust the variable resistor to take readings of current and p.d.; then reverse the power supply connections and repeat to get negative values.",
            ],
            figure: D.circuit({
              w: 380, h: 250,
              wires: ["M40 40 H340 V160 H40 Z", "M140 160 V215 H240 V160"],
              parts: [["battery", 120, 40, "h", "power supply"], ["variable", 250, 40, "h", "variable resistor"], ["ammeter", 40, 100, "v"], ["lamp", 190, 160, "h", "test component"], ["voltmeter", 190, 215, "h"]],
              dots: [[140, 160], [240, 160]],
              caption: "Swap the lamp for a resistor or a diode to test each component.",
            }),
            points: [
              "Keep the resistor's temperature constant (small currents, switch off between readings).",
              "For the diode, add a protective resistor in series and use small p.d. steps near 0.6 V.",
              "Plot current (y-axis) against p.d. (x-axis) for positive and negative values.",
            ],
          },
        ],
        mistakes: [
          ["“The lamp's graph curves because the lamp is faulty.”", "It curves because the filament heats up, increasing its resistance."],
          ["“A thermistor's resistance increases when it gets hot.”", "The resistance of a thermistor decreases as temperature increases."],
          ["“A diode has zero resistance.”", "A diode has a very high resistance in reverse, and conducts well forward only above about 0.6 V."],
        ],
        vocabulary: [
          ["I–V characteristic", "A graph of current against p.d. for a component."],
          ["Filament lamp", "A lamp whose resistance increases as its filament gets hotter."],
          ["Diode", "A component that lets current flow in one direction only."],
          ["Thermistor", "A resistor whose resistance decreases as temperature increases."],
          ["LDR", "Light-dependent resistor: resistance decreases as light intensity increases."],
          ["Linear / non-linear", "A straight-line graph / a curved graph."],
        ],
      },
      questions: [
        {
          type: "Practice",
          prompt: "Which component has this behaviour: no current in one direction, and almost no current in the other direction until the p.d. reaches about 0.6 V?",
          options: ["Filament lamp", "Diode", "Thermistor", "Fixed resistor"],
          hint: "Which component only lets current flow one way?",
          answer: "<strong>B — Diode.</strong> It has a very high resistance in reverse and conducts forward only above about 0.6 V.",
        },
        {
          type: "Practice",
          prompt: "A filament lamp has a current of 0.20 A at 2.0 V and 0.35 A at 6.0 V. Calculate its resistance at each p.d. and explain the difference.",
          hint: "Use R = V ÷ I at each point. Then think about what happens to the filament as the current increases.",
          answer: "At 2.0 V: R = 2.0 ÷ 0.20 = 10 Ω. At 6.0 V: R = 6.0 ÷ 0.35 = 17 Ω. The larger current heats the filament, its ions vibrate more, electrons collide more often, so the resistance increases.",
        },
        {
          type: "Practice",
          prompt: "A thermistor is part of a fire-alarm circuit. What happens to the thermistor's resistance and to the current through it as the room gets hotter?",
          hint: "Thermistor: temperature up → resistance …?",
          answer: "As the temperature increases the thermistor's resistance decreases, so (for the same p.d.) the current through it increases. The larger current can be used to trigger the alarm.",
        },
        {
          type: "AQA-style",
          marks: 6,
          prompt: "Describe a method to obtain the I–V characteristic of a filament lamp for both positive and negative values of p.d.",
          hint: "Circuit, how you change the current, what you record, how you get negative values, what you plot.",
          answer: "Indicative content (6 marks, level-marked):<br>• Connect the lamp in series with an ammeter, a variable resistor and a power supply/battery.<br>• Connect a voltmeter in parallel across the lamp.<br>• Adjust the variable resistor to change the current; record the current and p.d. for each setting.<br>• Take a range of readings, e.g. at least 6–8, from 0 V up to the lamp's rated p.d.<br>• Reverse the connections to the power supply and repeat to obtain negative values.<br>• Repeat readings and calculate means.<br>• Plot current (y-axis) against p.d. (x-axis) and draw a smooth curve of best fit.",
        },
        {
          type: "AQA-style",
          marks: 3,
          prompt: "A garden light uses an LDR to switch its lamp on automatically. Explain how the LDR's resistance changes at dusk and why this makes it useful here.",
          hint: "Link light intensity → resistance → current in the sensing circuit.",
          answer: "As it gets darker the light intensity falls (1 mark), so the resistance of the LDR increases (1 mark). This change in resistance changes the current/p.d. in the sensing circuit, which switches the lamp on when it is dark (1 mark).",
        },
      ],
    },

    // ------------------------------------------------------------------ 6
    {
      slug: "series-and-parallel",
      number: "06",
      shortTitle: "Series & parallel",
      title: "Series & parallel",
      mission: "Crack any network",
      intro:
        "One loop or several branches? The rules for current, p.d. and resistance change completely. Learn both sets and use them to solve multi-step circuit problems.",
      colour: "cyan",
      icon: "⫴",
      spec: "AQA 6.2.2, RP 15 · Sep 4.2.2, RP 3",
      unlocks: ["series rules", "parallel rules", "R_total = R₁ + R₂"],
      keyRule: "Series: same current, p.d. shared, R_total = R₁ + R₂. Parallel: same p.d., currents add, R_total is less than the smallest resistor.",
      lab: { label: "Lab 2", page: 9, range: "9–10" },
      revision: {
        summary:
          "Components can be joined in series (one loop) or in parallel (separate branches). Each arrangement has its own rules for current, p.d. and total resistance.",
        sections: [
          {
            title: "Series circuits",
            paragraphs: [
              "In series, components are joined one after another in a single loop. The same charge flows through every component.",
            ],
            points: [
              "The <strong>current</strong> is the same through each component.",
              "The total <strong>p.d.</strong> of the supply is shared between the components: V = V₁ + V₂.",
              "The total <strong>resistance</strong> is the sum: R_total = R₁ + R₂.",
              "The larger resistor gets the larger share of the p.d.",
            ],
            figure: D.circuit({
              w: 360, h: 205,
              wires: [LOOP],
              parts: [["battery", 180, 40, "h", "12 V"], ["ammeter", 40, 95, "v", "1.0 A", "r"], ["resistor", 120, 150, "h", "4 Ω · 4 V", "b"], ["resistor", 240, 150, "h", "8 Ω · 8 V", "b"]],
              caption: "R_total = 4 + 8 = 12 Ω, so I = 12 ÷ 12 = 1.0 A. p.d.s: 1.0 × 4 = 4 V and 1.0 × 8 = 8 V.",
            }),
          },
          {
            title: "Parallel circuits",
            paragraphs: [
              "In parallel, each component is on its own branch between the same two junctions. Charge splits at a junction and joins again afterwards.",
            ],
            points: [
              "The <strong>p.d.</strong> across each branch is the same.",
              "The total <strong>current</strong> is the sum of the branch currents: I = I₁ + I₂.",
              "The branch with the smaller resistance carries the larger current.",
              "The total <strong>resistance</strong> is less than the smallest individual resistor.",
            ],
            figure: D.circuit({
              w: 360, h: 225,
              wires: ["M40 40 H320 V185 H40 Z", "M40 115 H320"],
              parts: [["battery", 180, 40, "h", "6 V"], ["ammeter", 40, 77, "v", "3 A", "r"], ["resistor", 180, 115, "h", "3 Ω · 2 A"], ["resistor", 180, 185, "h", "6 Ω · 1 A", "b"]],
              dots: [[40, 115], [320, 115]],
              caption: "Each branch has 6 V across it: 6 ÷ 3 = 2 A and 6 ÷ 6 = 1 A. Total current = 2 + 1 = 3 A.",
            }),
          },
          {
            title: "Why series adds and parallel reduces",
            paragraphs: [
              "<strong>Series:</strong> adding a resistor means the charge must pass through both, one after the other. There is more opposition to the flow, so for the same supply p.d. the current is smaller and the total resistance is larger.",
              "<strong>Parallel:</strong> adding a resistor on a new branch gives the charge an extra path. Each branch still has the full supply p.d. across it, so the new branch adds its own current and the total current from the supply increases. More current for the same p.d. means a smaller total resistance.",
            ],
            remember: "Extra checkout lanes in a shop let more people through per minute: extra parallel branches do the same for charge.",
          },
          {
            title: "Solving series problems",
            paragraphs: [
              "Use equivalent resistance: replace the series resistors with one resistor R_total, find the current, then work back to each component.",
            ],
            figure: D.circuit({
              w: 360, h: 245,
              wires: [LOOP, "M210 150 V205 H270 V150"],
              parts: [["battery", 180, 40, "h", "9.0 V"], ["lamp", 110, 150, "h", "lamp", "b"], ["resistor", 240, 150, "h", "10 Ω"], ["voltmeter", 240, 205, "h", "6.0 V", "b"]],
              dots: [[210, 150], [270, 150]],
              caption: "Find the resistance of the lamp.",
            }),
            points: [
              "Current: I = V ÷ R = 6.0 ÷ 10 = 0.60 A (the same everywhere in the loop).",
              "p.d. across the lamp = 9.0 − 6.0 = 3.0 V.",
              "Lamp resistance = 3.0 ÷ 0.60 = 5.0 Ω.",
              "Check: R_total = 10 + 5 = 15 Ω, and 9.0 ÷ 15 = 0.60 A ✓",
            ],
          },
          {
            title: "Required practical: resistor combinations",
            paragraphs: [
              "Measure V and I for one resistor, then for two identical resistors in series, then in parallel. Calculate R_total = V ÷ I each time.",
            ],
            points: [
              "Series: R_total ≈ R₁ + R₂.",
              "Parallel: R_total is less than either resistor (for two identical resistors, about half of one).",
              "Adding more resistors in series keeps increasing R_total; adding more in parallel keeps decreasing it.",
            ],
          },
        ],
        mistakes: [
          ["“Current is shared between components in series.”", "In series the current is the same everywhere; the p.d. is shared."],
          ["“Two resistors in parallel: add them up.”", "Only in series. In parallel the total is less than the smallest one."],
          ["“Each parallel branch gets half the battery p.d.”", "Each parallel branch has the full supply p.d. across it."],
        ],
        goFurther: {
          title: "Calculating parallel resistance",
          kicker: "Go further · beyond the AQA GCSE spec",
          html: `<p>AQA does not ask you to calculate the total resistance of resistors in parallel, but it is a useful tool, especially if you are heading for separate physics or A level.</p>
            <div class="equation-block"><span class="eq">1 / R_total = 1 / R₁ + 1 / R₂</span><span class="eq-words">For two resistors this simplifies to R_total = (R₁ × R₂) ÷ (R₁ + R₂): “product over sum”.</span></div>
            <p><strong>Example:</strong> 3 Ω and 6 Ω in parallel → R_total = (3 × 6) ÷ (3 + 6) = 18 ÷ 9 = 2 Ω.</p>
            <p><strong>Check with currents:</strong> with 6 V across the pair, the branch currents are 2 A and 1 A, so 3 A in total, and 6 V ÷ 3 A = 2 Ω ✓. The answer is less than 3 Ω, the smallest resistor, just as the GCSE rule says.</p>`,
        },
        vocabulary: [
          ["Series", "Components joined one after another in a single loop."],
          ["Parallel", "Components on separate branches between the same two junctions."],
          ["Junction", "A point where the current splits or joins."],
          ["Branch", "One path of a parallel section of a circuit."],
          ["Equivalent resistance", "A single resistance that could replace a combination and give the same current."],
        ],
      },
      questions: [
        {
          type: "Practice",
          prompt: "A 2.0 Ω resistor and a 4.0 Ω resistor are connected in series to a 12 V battery. Calculate the total resistance, the current and the p.d. across each resistor.",
          hint: "Add the resistances, then I = V ÷ R_total. Then V = I R for each resistor.",
          answer: "R_total = 2.0 + 4.0 = 6.0 Ω. I = 12 ÷ 6.0 = 2.0 A. p.d.s: 2.0 × 2.0 = <strong>4.0 V</strong> and 2.0 × 4.0 = <strong>8.0 V</strong> (they add to 12 V ✓).",
        },
        {
          type: "Practice",
          prompt: "Two lamps are connected in parallel to a 9.0 V supply. The branch currents are 0.30 A and 0.60 A. State the p.d. across each lamp and calculate the current from the supply.",
          hint: "What is the same across parallel branches? What happens to the currents at the junction?",
          answer: "Each lamp has <strong>9.0 V</strong> across it. Supply current = 0.30 + 0.60 = <strong>0.90 A</strong>.",
        },
        {
          type: "Practice",
          prompt: "A 20 Ω resistor and a 30 Ω resistor are connected in parallel. Which could be their total resistance?",
          options: ["50 Ω", "25 Ω", "20 Ω", "12 Ω"],
          hint: "In parallel, the total resistance is less than the smallest resistor.",
          answer: "<strong>D — 12 Ω.</strong> It is the only value less than 20 Ω, the smallest resistor. (Using the go-further formula: 600 ÷ 50 = 12 Ω.)",
        },
        {
          type: "AQA-style",
          marks: 3,
          prompt: "The ammeter reads 0.20 A. Calculate the resistance of R₂.",
          figure: D.circuit({
            w: 360, h: 205,
            wires: [LOOP],
            parts: [["battery", 180, 40, "h", "6.0 V"], ["ammeter", 40, 95, "v"], ["resistor", 130, 150, "h", "R₁ = 15 Ω", "b"], ["resistor", 250, 150, "h", "R₂ = ?", "b"]],
          }),
          hint: "Find the total resistance from the supply p.d. and the current, then subtract R₁.",
          answer: "R_total = V ÷ I = 6.0 ÷ 0.20 (1 mark) = 30 Ω (1 mark). R₂ = 30 − 15 = <strong>15 Ω</strong> (1 mark).",
        },
        {
          type: "AQA-style",
          marks: 4,
          prompt: "Explain why adding a resistor in series with another resistor increases the total resistance, but adding it in parallel decreases the total resistance.",
          hint: "Series: how many resistors must each charge pass through? Parallel: what does an extra branch do to the current from the supply?",
          answer: "Series: charge must flow through both resistors one after another (1 mark), so there is more opposition and the current is smaller for the same p.d., meaning a higher total resistance (1 mark). Parallel: the new branch provides an extra path for charge, with the full supply p.d. across it (1 mark), so the total current from the supply increases for the same p.d., meaning a lower total resistance (1 mark).",
        },
        {
          type: "Go further",
          prompt: "Optional stretch: calculate the total resistance of a 4.0 Ω resistor and a 12 Ω resistor connected in parallel.",
          hint: "Product over sum: (R₁ × R₂) ÷ (R₁ + R₂).",
          answer: "R_total = (4.0 × 12) ÷ (4.0 + 12) = 48 ÷ 16 = <strong>3.0 Ω</strong>, which is less than 4.0 Ω as expected.",
        },
      ],
    },

    // ------------------------------------------------------------------ 7
    {
      slug: "mains-electricity",
      number: "07",
      shortTitle: "Mains & safety",
      title: "Mains & safety",
      mission: "Stay safe at 230 V",
      intro:
        "The sockets at home do not behave like a battery. Learn how alternating mains differs from direct current, what each wire in a plug does, and why the live wire is dangerous.",
      colour: "copper",
      icon: "~",
      spec: "AQA 6.2.3 · Sep 4.2.3",
      unlocks: ["ac vs dc", "230 V · 50 Hz", "live · neutral · earth"],
      keyRule: "UK mains is ac at about 230 V and 50 Hz. Live: brown. Neutral: blue. Earth: green and yellow.",
      revision: {
        summary:
          "Cells and batteries supply direct p.d.; the mains supplies alternating p.d. Three-core cables and the earth wire keep people safe from the live wire.",
        sections: [
          {
            title: "Direct and alternating p.d.",
            paragraphs: [
              "A <strong>direct</strong> p.d. (dc) always acts in the same direction, so the current flows one way only. Cells and batteries supply dc.",
              "An <strong>alternating</strong> p.d. (ac) keeps reversing direction, so the current keeps changing direction too. The mains supply is ac.",
            ],
            figure: D.graph({
              sketch: true, w: 340, h: 220, x: [0, 1], y: [-1, 1],
              xLabel: "time", yLabel: "p.d.",
              series: [{ fn: () => 0.45, from: 0, to: 0.8, cls: "curve-2" }, { fn: (x) => 0.85 * Math.sin(2 * Math.PI * 2.5 * x), from: 0, to: 0.8 }],
              notes: [[0.86, 0.41, "dc", "start", "cool"], [0.37, -0.82, "ac", "start", "hot"]],
              caption: "dc (blue) stays positive and constant; ac (orange) keeps reversing direction.",
            }),
          },
          {
            title: "The UK mains supply",
            paragraphs: ["Mains electricity in UK homes is an ac supply."],
            points: [
              "Frequency: <strong>50 Hz</strong>, meaning 50 complete cycles every second.",
              "p.d.: about <strong>230 V</strong>.",
              "Most appliances connect to it through a three-core cable.",
            ],
            remember: "Learn both numbers together: 230 V, 50 Hz.",
          },
          {
            title: "Three-core cable",
            paragraphs: [
              "Each wire has insulation of a set colour, so anyone wiring a plug can identify it.",
            ],
            figure: D.circuit({
              w: 360, h: 170,
              wires: [],
              extra: `<rect class="sheath" x="12" y="38" width="118" height="96" rx="14"/>
                <line class="wire-brown" x1="120" y1="60" x2="340" y2="60"/>
                <line class="wire-blue" x1="120" y1="88" x2="340" y2="88"/>
                <defs><pattern id="earth-stripes" width="16" height="16" patternUnits="userSpaceOnUse" patternTransform="rotate(35)"><rect width="8" height="16" fill="#2f9e44" stroke="none"/><rect x="8" width="8" height="16" fill="#f2c500" stroke="none"/></pattern></defs>
                <rect x="116" y="111.5" width="228" height="9" rx="4.5" fill="url(#earth-stripes)" stroke="none"/>
                <text x="150" y="48">Live · brown · ≈230 V</text>
                <text x="150" y="80" dy="-2">Neutral · blue · ≈0 V</text>
                <text x="150" y="108" dy="-2">Earth · green &amp; yellow · 0 V</text>
                <text class="note" x="71" y="92" text-anchor="middle">cable</text>`,
              caption: "Live (brown), neutral (blue) and earth (green and yellow stripes).",
              label: "Three-core cable with live, neutral and earth wires",
            }),
            points: [
              "<strong>Live</strong> (brown): carries the alternating p.d. from the supply.",
              "<strong>Neutral</strong> (blue): completes the circuit; at, or close to, 0 V.",
              "<strong>Earth</strong> (green and yellow): a safety wire at 0 V that stops the appliance becoming live. It only carries a current if there is a fault.",
            ],
            remember: "The p.d. between the live wire and earth is about 230 V.",
          },
          {
            title: "Why the live wire is dangerous",
            paragraphs: [
              "Your body is at earth potential, 0 V. Touching the live wire puts a p.d. of about 230 V across you, so a current flows through your body to earth: an electric shock that can kill.",
              "This is true <strong>even when the switch is open</strong>. The switch only breaks the circuit through the appliance; the live wire is still connected to the supply and is still at 230 V.",
            ],
            remember: "Switched off does not mean safe. Isolate the supply before touching any wiring.",
          },
          {
            title: "The earth wire keeps you safe",
            paragraphs: [
              "Any connection between the live wire and earth is dangerous. With a low-resistance path, a very large current flows, which can cause heating and fire, or a shock if the path is through a person.",
              "Appliances with metal cases have the case connected to the earth wire. If a fault lets the live wire touch the case, a large current flows through the earth wire instead of through the user. This quickly melts the fuse in the live wire (or trips a circuit breaker), disconnecting the appliance.",
            ],
          },
        ],
        mistakes: [
          ["“The neutral wire never carries current.”", "The neutral completes the circuit and carries current in normal use. It is the earth wire that only carries current in a fault."],
          ["“If the switch is off, the wires are safe.”", "The live wire is still at about 230 V while it is connected to the supply."],
          ["“The earth wire is at 230 V.”", "The earth wire is at 0 V."],
        ],
        vocabulary: [
          ["Direct current (dc)", "Current that flows in one direction only."],
          ["Alternating current (ac)", "Current that repeatedly reverses direction."],
          ["Frequency", "The number of complete cycles per second. Measured in hertz, Hz."],
          ["Live wire", "Brown; carries the alternating p.d. from the supply."],
          ["Neutral wire", "Blue; completes the circuit; at or near 0 V."],
          ["Earth wire", "Green and yellow; safety wire at 0 V; carries current only if there is a fault."],
        ],
      },
      questions: [
        {
          type: "Practice",
          prompt: "Give the colour of the insulation on the live, neutral and earth wires in a three-core cable.",
          hint: "One colour, another colour, and a striped pair.",
          answer: "Live: <strong>brown</strong>. Neutral: <strong>blue</strong>. Earth: <strong>green and yellow stripes</strong>.",
        },
        {
          type: "Practice",
          prompt: "State the frequency and the p.d. of the UK mains supply.",
          hint: "Two numbers, with units.",
          answer: "Frequency <strong>50 Hz</strong>; p.d. about <strong>230 V</strong>.",
        },
        {
          type: "Practice",
          prompt: "Explain the difference between a direct p.d. and an alternating p.d.",
          hint: "Think about the direction of the p.d. and of the current it drives.",
          answer: "A direct p.d. always acts in the same direction, so the current flows in one direction only. An alternating p.d. repeatedly reverses direction, so the current repeatedly changes direction.",
        },
        {
          type: "AQA-style",
          marks: 3,
          prompt: "Explain why touching the live wire of a lamp can be dangerous even when the lamp is switched off.",
          hint: "What is the potential of the live wire, what is the potential of your body, and what does the switch actually do?",
          answer: "The live wire is still connected to the supply, so it is still at about 230 V even when the switch is open (1 mark). The person is at 0 V/earth potential, so there is a large p.d. across their body (1 mark). A current flows through the person to earth, causing an electric shock (1 mark).",
        },
        {
          type: "AQA-style",
          marks: 4,
          prompt: "A toaster has a metal case connected to the earth wire. A fault makes the live wire touch the case. Explain how the earth wire protects someone who touches the toaster.",
          hint: "Where does the current go instead of through the person, and what happens to the fuse?",
          answer: "The earth wire connects the case to earth, at 0 V, so the case cannot stay at a high p.d. (1 mark). The earth wire has a low resistance, so a large current flows from the live wire through the case to earth (1 mark), rather than through the person (1 mark). The large current melts the fuse in the live wire (or trips a circuit breaker), disconnecting the supply (1 mark).",
        },
      ],
    },

    // ------------------------------------------------------------------ 8
    {
      slug: "power-and-national-grid",
      number: "08",
      shortTitle: "Power & the Grid",
      title: "Power & the National Grid",
      mission: "Count the joules",
      intro:
        "Power is how fast energy is transferred. Use it to compare appliances, work out energy costs in joules and explain why the National Grid sends electricity at very high potential differences.",
      colour: "spark",
      icon: "P",
      spec: "AQA 6.2.4 · Sep 4.2.4",
      unlocks: ["P = V I and P = I² R", "E = P t", "step-up · step-down transformers"],
      keyRule: "P = V I = I² R and E = P t. High p.d. means low current, so less energy is wasted heating the cables.",
      revision: {
        summary:
          "Power is the rate of energy transfer. The energy an appliance transfers depends on its power and how long it is on.",
        sections: [
          {
            title: "Power = p.d. × current",
            paragraphs: [
              "Power is the energy transferred per second. It depends on the p.d. across a device and the current through it.",
            ],
            equation: {
              eq: "P = V I",
              words: "power = potential difference × current",
              units: "P in watts (W) · V in volts (V) · I in amperes (A)",
              flag: "Recall and apply",
            },
            points: ["1 W = 1 J transferred per second.", "1 kW = 1000 W."],
            formula: "A toaster on 230 V draws 4.0 A → P = 230 × 4.0 = 920 W",
          },
          {
            title: "Power = current² × resistance",
            paragraphs: [
              "Substituting V = I R into P = V I gives a second power equation. Use it when you know the current and the resistance, for example when calculating the heating in a cable.",
            ],
            equation: {
              eq: "P = I² R",
              words: "power = (current)² × resistance",
              units: "P in watts (W) · I in amperes (A) · R in ohms (Ω)",
              flag: "Recall and apply",
            },
            formula: "2.0 A through 15 Ω → P = 2.0² × 15 = 60 W",
            remember: "Square the current first. Doubling the current makes the power four times as big.",
          },
          {
            title: "Energy transferred",
            paragraphs: [
              "The energy an appliance transfers depends on its power and how long it is switched on. It can also be found from the charge and the p.d.",
            ],
            equation: {
              eq: "E = P t",
              words: "energy transferred = power × time",
              units: "E in joules (J) · P in watts (W) · t in seconds (s)",
              flag: "Recall and apply · also E = Q V",
            },
            formula: "2.0 kW kettle for 3.0 min → E = 2000 × 180 = 360 000 J",
            remember: "Watts and seconds give joules. Convert kW to W and minutes to s first.",
          },
          {
            title: "Energy transfers in appliances",
            paragraphs: [
              "Everyday appliances are designed to transfer energy. Work is done when charge flows in a circuit, and energy is transferred from the mains or a battery to where it is needed.",
            ],
            points: [
              "Kettle, toaster, heater: electrically → thermal energy store of the surroundings or water.",
              "Hairdryer: electrically → kinetic energy store of the fan motor and thermal store of the air.",
              "Battery drill: chemical store of the battery → electrically → kinetic store of the motor.",
              "The power rating tells you the energy transferred per second. A 3 kW kettle transfers energy faster than a 1.5 kW kettle, so it boils the same water in about half the time.",
            ],
          },
          {
            title: "The National Grid",
            paragraphs: [
              "The National Grid is a system of cables and transformers linking power stations to consumers across the country.",
            ],
            figure: `<ol class="grid-flow" aria-label="Stages of the National Grid">
                <li><strong>Power station</strong>Generates electricity at about 25 kV.</li>
                <li class="up"><strong>Step-up transformer</strong>Increases the p.d. to as much as 400 kV.</li>
                <li><strong>Transmission cables</strong>Very high p.d., so a small current: less heating in the cables.</li>
                <li class="down"><strong>Step-down transformer</strong>Decreases the p.d. to a much lower value.</li>
                <li><strong>Homes</strong>A safer 230 V supply.</li>
              </ol>`,
            points: [
              "For a given power, P = V I: raising the p.d. lowers the current.",
              "Heating in the cables is P = I² R: a smaller current means much less energy is wasted.",
              "So transmitting at a high p.d. makes the National Grid an efficient way to transfer energy.",
            ],
          },
          {
            title: "Transformer equation",
            ht: true,
            paragraphs: [
              "For a transformer that is 100% efficient, the power in equals the power out. You do not need to know how a transformer is built.",
            ],
            equation: {
              eq: "V_p I_p = V_s I_s",
              words: "p.d. across primary × current in primary = p.d. across secondary × current in secondary",
              units: "p = primary coil (input) · s = secondary coil (output)",
              flag: "Higher tier · given on the equation sheet",
            },
            formula: "25 kV, 400 A in; 400 kV out → I_s = (25 000 × 400) ÷ 400 000 = 25 A",
            remember: "Step up the p.d. and the current steps down by the same factor.",
          },
        ],
        mistakes: [
          ["“A step-up transformer increases the power.”", "It increases the p.d. and decreases the current; the power stays (ideally) the same."],
          ["Using kW and minutes in E = P t.", "Use W and s: 2.0 kW = 2000 W, 3 min = 180 s."],
          ["P = I × R", "P = I² R: square the current."],
        ],
        vocabulary: [
          ["Power", "The rate of energy transfer. Measured in watts, W."],
          ["Watt", "One joule per second."],
          ["Power rating", "The energy an appliance transfers per second when working normally."],
          ["National Grid", "The system of cables and transformers linking power stations to consumers."],
          ["Step-up transformer", "Increases p.d. (and decreases current) for transmission."],
          ["Step-down transformer", "Decreases p.d. to a safer value for homes."],
        ],
      },
      questions: [
        {
          type: "Practice",
          prompt: "A hairdryer connected to the 230 V mains draws a current of 5.0 A. Calculate its power.",
          hint: "P = V I.",
          answer: "P = V I = 230 × 5.0 = <strong>1150 W</strong> (1.15 kW).",
        },
        {
          type: "Practice",
          prompt: "A current of 3.0 A flows through a 40 Ω heating element. Calculate the power.",
          hint: "You know current and resistance, so use P = I² R.",
          answer: "P = I² R = 3.0² × 40 = 9.0 × 40 = <strong>360 W</strong>.",
        },
        {
          type: "Practice",
          prompt: "A 3.0 kW heater is switched on for 2.0 hours. Calculate the energy it transfers, in joules.",
          hint: "Convert: kW → W and hours → seconds.",
          answer: "P = 3000 W; t = 2.0 × 3600 = 7200 s. E = P t = 3000 × 7200 = <strong>21 600 000 J</strong> (2.16 × 10⁷ J).",
        },
        {
          type: "AQA-style",
          marks: 4,
          prompt: "A kettle has a power rating of 2.2 kW and runs on 230 V mains. Calculate the current through the kettle and the energy it transfers in 150 s.",
          hint: "Rearrange P = V I for the current. Then use E = P t with power in watts.",
          answer: "I = P ÷ V = 2200 ÷ 230 (1 mark) = <strong>9.6 A</strong> (1 mark). E = P t = 2200 × 150 (1 mark) = <strong>330 000 J</strong> (1 mark).",
        },
        {
          type: "AQA-style",
          marks: 4,
          prompt: "Explain why electricity is transmitted through the National Grid at a very high potential difference.",
          hint: "Link P = V I (for a fixed power) with P = I² R (for heating in the cables).",
          answer: "Step-up transformers increase the p.d. (1 mark). For the same power transmitted, a higher p.d. means a lower current (P = V I) (1 mark). A lower current means less heating of the cables / less energy wasted (P = I² R) (1 mark). So energy is transferred more efficiently (1 mark).",
        },
        {
          type: "AQA-style",
          tier: "HT",
          marks: 3,
          prompt: "A step-up transformer has 25 000 V across its primary coil and a current of 800 A in it. The p.d. across the secondary coil is 400 000 V. Calculate the current in the secondary coil. Assume the transformer is 100% efficient.",
          hint: "V_p × I_p = V_s × I_s. Rearrange for I_s.",
          answer: "I_s = (V_p × I_p) ÷ V_s (1 mark) = (25 000 × 800) ÷ 400 000 (1 mark) = <strong>50 A</strong> (1 mark).",
        },
      ],
    },
  ];
})();
