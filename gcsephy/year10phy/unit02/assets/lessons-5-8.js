/* Lessons 5-8 of the Year 10 Particle Model of Matter workbook: internal energy and heating
   curves, specific latent heat, specific heat capacity and its required practical.
   Format as in lessons-1-4.js. Values used throughout: water c = 4200 J/kg °C,
   L (fusion) = 334 000 J/kg, L (vaporisation) = 2 260 000 J/kg; aluminium c = 900 J/kg °C. */
(function () {
  "use strict";

  const R = String.raw;
  const F = window.ParticleFigures;
  const { frame3, frame4, frameRe } = window.WB_FRAMES;
  // Sample results for the specific heat capacity practical: a 1.00 kg aluminium block, 12.0 V, 4.0 A.
  const SHC = [[0, 0, "20.0"], [120, 5760, "24.6"], [240, 11520, "30.8"], [360, 17280, "37.0"], [480, 23040, "43.0"], [600, 28800, "49.0"]];
  // Sample cooling results for stearic acid: time / min, temperature / °C.
  const COOL = [[0, 90], [1, 80], [2, 73], [3, 70], [4, 69], [5, 69], [6, 69], [7, 69], [8, 67], [9, 62], [10, 56]];

  const lessons = [
    // ============================================================ 5
    {
      n: 5, accent: "violet", slides: "25–29", title: "Internal energy and heating curves",
      spec: "AQA Physics 4.3.2.1, 4.3.2.3; Combined Science 6.3.2.1, 6.3.2.3",
      mapLine: "Internal energy, the two things heating can do, heating and cooling graphs",
      big: "A pan of water boils on the hob for ten minutes. The hob keeps supplying energy, but the water never gets hotter than 100 °C. Where does the energy go?",
      goals: ["state what internal energy is", "describe the two things that can happen when a substance is heated", "explain the flat sections of a heating or cooling graph", "read melting and boiling points from a graph"],
      keywords: ["internal energy", "kinetic energy", "potential energy", "melting point", "boiling point", "heating curve"],
      kit: "Per group: boiling tube of molten stearic acid (from a hot water bath), thermometer, clamp stand, stopwatch. Or use the sample results.",
      doNow: [
        ["Write the equation for density.", R`\(\rho = \dfrac{m}{V}\)`],
        ["What is the temperature of a gas related to?", "The average kinetic energy of its molecules."],
        ["Name the change of state from liquid to solid.", "Freezing."],
      ],
      learnTitle: "The energy inside",
      learn: [
        { t: "p", h: "The particles of a substance store energy in two ways. They are moving (or vibrating), so they have <strong>kinetic energy</strong>. They also have <strong>potential energy</strong>, which depends on how far apart they are: energy has to be supplied to pull particles away from each other." },
        { t: "key", h: "<strong>Internal energy</strong> is the total kinetic energy and potential energy of all the particles (atoms and molecules) that make up a system." },
        { t: "sub", h: "Heating does one of two things" },
        { t: "p", h: "Heating a substance increases the energy of its particles, so its internal energy goes up. This <strong>either</strong> raises the temperature <strong>or</strong> changes the state. It does not do both at once." },
        { t: "compare", head: ["", "The temperature rises", "The state changes"], rows: [
          ["What the particles do", "move or vibrate faster", "break away from their neighbours and move further apart"],
          ["Which energy increases", "kinetic energy", "potential energy"],
          ["Temperature", "increases", "stays constant"],
        ] },
        { t: "sub", h: "A heating graph" },
        { t: "fig", cls: "fig-wide", h: F.curve("heat", { values: [[0.26, "0"], [0.74, "100"]] }), cap: "Ice from the freezer, heated at a steady rate until it is steam" },
        { t: "list", items: [
          "<strong>Sloping sections:</strong> the substance is in one state and is getting hotter. The kinetic energy of the particles is increasing.",
          "<strong>Flat sections:</strong> the substance is changing state. The energy supplied increases the potential energy of the particles, so the temperature does not change.",
          "The first flat section is at the <strong>melting point</strong> (0 °C for water). The second is at the <strong>boiling point</strong> (100 °C for water).",
        ] },
        { t: "tip", h: "On a flat section, heating has <strong>not</strong> stopped. Energy is still being supplied. It is being used to change the state, not to raise the temperature." },
        { t: "sub", h: "A cooling graph" },
        { t: "p", h: "Cooling is the reverse. As a liquid cools, its particles slow down and the temperature falls. While it <strong>freezes</strong>, the particles move closer into fixed positions and their potential energy decreases: energy is transferred to the surroundings, but the temperature stays constant. Then the solid cools." },
        { t: "fig", cls: "fig-mid", h: F.curve("cool") },
      ],
      try: [
        { t: "q", p: "Complete the sentences.", fill: [
          "Internal energy is the total [[kinetic|kinetic / thermal / elastic]] energy and [[potential|chemical / potential / nuclear]] energy of all the particles in a system.",
          "While a substance is melting, its temperature [[stays the same|increases / decreases / stays the same]].",
        ] },
        { t: "q", p: "A solid is heated at a steady rate until it has become a gas. The graph shows how its temperature changes.", fig: F.curve("heat", { letters: true, values: [[0.26, "80"], [0.74, "218"]] }), figCls: "fig-wide",
          after: [
            { t: "part", p: "(a) Which section shows the substance melting? {{A|B*|C|D|E}}" },
            { t: "part", p: "(b) Which section shows the liquid getting hotter? {{A|B|C*|D|E}}" },
            { t: "part", p: "(c) State the melting point and the boiling point of the substance.", lines: 1, a: "Melting point 80 °C; boiling point 218 °C." },
            { t: "part", p: "(d) In which state is the substance at 150 °C?", lines: 1, a: "Liquid." },
          ] },
        { t: "q", p: "Draw a ring around the correct answer in each box.", ring: [
          ["When water at 50 °C is heated to 60 °C, its particles gain", ["kinetic energy", "potential energy", "no energy"], 0],
          ["When water boils at 100 °C, its particles gain", ["kinetic energy", "potential energy", "no energy"], 1],
        ] },
        { t: "q", type: "Challenge", p: "1 kg of steam at 100 °C and 1 kg of water at 100 °C are at the same temperature. Explain which has the greater internal energy.", lines: 3, a: "The steam. The particles have the same average kinetic energy (same temperature), but the particles in the steam are much further apart, so they have more potential energy." },
      ],
      lab: { title: "Practical: a cooling curve", aside: "Hot liquid: wear eye protection and do not touch the tube.", blocks: [
        { t: "safety", items: ["Wear eye protection.", "The tube and the water bath are hot: leave the tube in its clamp.", "Do not stir with the thermometer once the acid starts to set: it may break."] },
        { t: "lab", blocks: [
          { t: "p", h: "A tube of melted stearic acid (a waxy solid at room temperature) is left to cool in air. Record its temperature every minute. If you are not doing the practical, use the sample results your teacher gives you." },
          { t: "q", p: "Record the temperature.", table: { cls: "wide", head: ["Time / min", ...COOL.map(([m]) => String(m))], rows: [["Temperature / °C", ...COOL.map(() => null)]], ans: [[null, ...COOL.map(([, c]) => String(c))]] } },
          { t: "q", p: "Plot a graph of temperature against time. Draw a smooth line through your points.", graph: { w: 110, h: 100, xLabel: "Time / min", yLabel: "Temperature / °C", x: [1, 1], y: [10, 1], points: COOL } },
          { t: "q", p: "Use your graph to find the freezing point of stearic acid.", lines: 1, a: "About 69 °C: the temperature of the flat section." },
          { t: "q", p: "Explain why the temperature stays the same while the stearic acid freezes, even though it is still transferring energy to the air.", lines: 3, a: "The particles are moving closer together into fixed positions, so their potential energy is decreasing. Their kinetic energy does not change, so the temperature stays constant." },
        ] },
      ] },
      exam: [
        { tip: "For a flat section, name the change of state, say that energy is still being supplied, and say which energy of the particles changes.", p: "A block of ice at 0 °C is heated. Its temperature does not change until all the ice has melted. Explain why.", marks: 3, lines: 5,
          a: "The energy supplied is used to change the state (melt the ice) (1). It increases the potential energy of the particles (as they break away from their fixed positions) (1), not their kinetic energy, so the temperature stays the same (1)." },
        { p: "State what is meant by the internal energy of a system.", marks: 2, lines: 2, a: "The total kinetic energy and potential energy (1) of all the particles that make up the system (1)." },
      ],
      summary: ["Internal energy = total kinetic + potential energy of all the particles.", "Heating increases internal energy: the temperature rises or the state changes.", "Temperature rise: the particles gain kinetic energy.", "Change of state: the particles gain potential energy, and the temperature stays constant.", "Flat sections of a heating or cooling graph are changes of state."],
      recall: [["Define internal energy.", "The total kinetic and potential energy of all the particles in a system."], ["What are the two things that heating a substance can do?", "Raise its temperature or change its state."], ["What does a flat section on a heating graph show?", "A change of state (melting or boiling)."], ["Which energy of the particles increases when a substance melts?", "Potential energy."]],
      cando: ["state what internal energy is", "describe what heating does to the particles", "explain why the temperature is constant during a change of state", "interpret heating and cooling graphs"],
    },

    // ============================================================ 6
    {
      n: 6, accent: "cyan", slides: "30–35", title: "Specific latent heat",
      spec: "AQA Physics 4.3.2.3; Combined Science 6.3.2.3",
      mapLine: R`Latent heat, \(E = m\,L\), fusion and vaporisation, measuring \(L\) for melting ice`,
      big: "A scald from steam at 100 °C is far worse than a scald from water at 100 °C. Why?",
      goals: ["state what specific latent heat means", R`calculate with \(E = m\,L\)`, "tell fusion from vaporisation", "describe an experiment to measure the specific latent heat of fusion of water"],
      keywords: ["latent heat", "specific latent heat", "fusion", "vaporisation", "joule per kilogram (J/kg)"],
      kit: "Per group, or as a demonstration: two funnels of crushed ice over beakers, 12 V immersion heater, joulemeter, power supply, balance, stopwatch.",
      doNow: [
        ["Define internal energy.", "The total kinetic and potential energy of all the particles in a system."],
        ["What happens to the temperature of a substance while it changes state?", "It stays constant."],
        ["Convert 250 g to kilograms.", "0.250 kg"],
      ],
      learnTitle: "The hidden energy",
      learn: [
        { t: "p", h: "The energy needed for a substance to change state is called <strong>latent heat</strong>. “Latent” means hidden: the energy goes in, the internal energy increases, but a thermometer shows no change." },
        { t: "key", h: "The <strong>specific latent heat</strong> of a substance is the amount of energy required to change the state of <strong>one kilogram</strong> of the substance with <strong>no change in temperature</strong>." },
        { t: "eq", eq: R`\(E = m\,L\)`, words: "energy for a change of state = mass × specific latent heat", units: R`\(E\) in J, \(m\) in kg, \(L\) in J/kg`, re: R`Rearranged: \(L = \dfrac{E}{m}\) and \(m = \dfrac{E}{L}\)`, tri: { top: "E", bottom: ["m", "L"] } },
        { t: "sub", h: "Two kinds" },
        { t: "compare", head: ["", "Change of state", "Value for water"], rows: [
          ["Specific latent heat of <strong>fusion</strong>", "solid to liquid (melting), or liquid to solid (freezing)", "334 000 J/kg"],
          ["Specific latent heat of <strong>vaporisation</strong>", "liquid to vapour (boiling), or vapour to liquid (condensing)", "2 260 000 J/kg"],
        ] },
        { t: "p", h: "Boiling needs much more energy than melting, because the particles must be pulled completely apart. When the change goes the other way, the same amount of energy is <strong>given out</strong>. Steam that condenses on your skin transfers 2 260 000 J for every kilogram, <em>before</em> it starts to cool as hot water. That is why steam scalds so badly." },
        { t: "follow", slide: 32, q: "Calculate the energy needed to melt 0.50 kg of ice at 0 °C. Specific latent heat of fusion of water = 334 000 J/kg", steps: [["Equation", R`\(E = m\,L\)`], ["Substitute", R`\(E = 0.50 \times 334\,000\)`], ["Answer", R`\(E = 167\,000\) J`]],
          yt: { q: "Calculate the energy needed to boil away 0.20 kg of water at 100 °C. Specific latent heat of vaporisation of water = 2 260 000 J/kg", steps: [["Equation", R`\(E = m\,L\)`], ["Substitute", R`\(E = 0.20 \times 2\,260\,000\)`], ["Answer", R`\(E = 452\,000\) J`]] } },
        { t: "follow", slide: 32, q: "A heater transfers 90 000 J to a block of wax at its melting point. The specific latent heat of fusion of the wax is 150 000 J/kg. Calculate the mass of wax that melts.", steps: [["Equation", R`\(E = m\,L\)`], ["Rearrange", R`\(m = \dfrac{E}{L}\)`], ["Substitute", R`\(m = \dfrac{90\,000}{150\,000}\)`], ["Answer", "m = 0.60 kg"]],
          yt: { q: "It takes 50 400 J to melt 0.40 kg of a metal at its melting point. Calculate the specific latent heat of fusion of the metal.", steps: [["Equation", R`\(E = m\,L\)`], ["Rearrange", R`\(L = \dfrac{E}{m}\)`], ["Substitute", R`\(L = \dfrac{50\,400}{0.40}\)`], ["Answer", R`\(L = 126\,000\) J/kg`]] } },
        { t: "tip", h: "There is no temperature in this equation. If a question gives a temperature change, you need a different equation (Lesson 7)." },
      ],
      try: [
        { t: "q", p: "Draw a ring around the correct answer in each box.", ring: [
          ["The unit of specific latent heat is", ["J", "J/kg", "J/kg °C"], 1],
          ["Ice melting uses the specific latent heat of", ["fusion", "vaporisation"], 0],
          ["Steam condensing uses the specific latent heat of", ["fusion", "vaporisation"], 1],
        ] },
        { t: "q", type: "Supported", p: "Calculate the energy needed to melt 1.5 kg of ice at 0 °C. Specific latent heat of fusion of water = 334 000 J/kg", frame: frame3, frameA: [R`\(E = m\,L\)`, R`\(E = 1.5 \times 334\,000\)`, "501 000 J"] },
        { t: "q", type: "Supported", p: "A kettle boils away 150 g of water at 100 °C. Calculate the energy transferred to the water. Specific latent heat of vaporisation of water = 2 260 000 J/kg <em>Convert the mass first!</em>", frame: frame4, frameA: ["m = 150 ÷ 1000 = 0.150 kg", R`\(E = m\,L\)`, R`\(E = 0.150 \times 2\,260\,000\)`, "339 000 J"] },
        { t: "q", p: "Complete the table. Show your working underneath.", table: { head: ["Change of state", "Mass / kg", "Specific latent heat / J/kg", "Energy / J"], rows: [["Lead melting", "2.0", "23 000", null], ["Ethanol boiling", null, "850 000", "425 000"], ["Aluminium melting", "0.50", null, "200 000"]], ans: [[null, null, null, "46 000"], [null, "0.50", null, null], [null, null, "400 000", null]] }, box: 28, grid: true },
        { t: "q", type: "Challenge", p: "A freezer removes 66 800 J from water at 0 °C. Calculate the mass of ice that forms. Specific latent heat of fusion of water = 334 000 J/kg", lines: 3, a: R`\(m = \dfrac{E}{L} = \dfrac{66\,800}{334\,000} = 0.20\) kg` },
      ],
      lab: { title: "Practical: melting ice", aside: "Measure the specific latent heat of fusion of water.", blocks: [
        { t: "safety", items: ["The heater gets hot: switch it on only when it is surrounded by ice.", "Keep water away from the power supply and wipe up spills."] },
        { t: "lab", blocks: [
          { t: "split", cls: "narrow-fig", left: [{ t: "steps", items: ["Fill two funnels with the same mass of crushed ice. Put a beaker under each.", "Put the heater in one funnel. The other is the <strong>control</strong>: it shows how much ice melts just because the room is warm.", "Switch on the heater and the joulemeter for 5 minutes.", "Measure the mass of water in each beaker.", "Mass melted by the heater = mass from the heated funnel − mass from the control."] }], right: [{ t: "fig", h: F.iceFunnels() }] },
          { t: "q", p: "Record your results.", table: { head: ["Measurement", "Value"], rows: [["Energy supplied (joulemeter) / J", null], ["Mass of water from the heated funnel / g", null], ["Mass of water from the control funnel / g", null], ["Mass melted by the heater / kg", null]], ans: [[null, "12 000"], [null, "42.0"], [null, "6.0"], [null, "0.0360"]] } },
          { t: "q", p: R`Calculate the specific latent heat of fusion of water from your results. Use \(E = m\,L\)`, frame: frameRe, frameA: [R`\(E = m\,L\)`, R`\(L = \dfrac{E}{m}\)`, R`\(L = \dfrac{12\,000}{0.0360}\)`, "333 000 J/kg"] },
          { t: "q", p: "Explain why the control funnel is needed.", lines: 2, a: "Some ice melts because energy is transferred from the warm room. The control measures this, so it can be subtracted to find the mass melted by the heater alone." },
        ] },
      ] },
      exam: [
        { tip: "“Calculate” with a mass in grams: convert to kilograms before you substitute.", p: "A 60 g ice cube at 0 °C melts in a drink. Calculate the energy transferred to the ice cube as it melts. Specific latent heat of fusion of water = 334 000 J/kg", marks: 3, frame: frame4, frameA: ["m = 0.060 kg (1)", R`\(E = m\,L\)`, R`\(E = 0.060 \times 334\,000\) (1)`, "20 040 J (accept 20 000 J) (1)"] },
        { p: "State what is meant by the specific latent heat of vaporisation of a substance.", marks: 2, lines: 3, a: "The energy needed to change 1 kg of the substance from liquid to vapour (1) with no change in temperature (1)." },
      ],
      quick: { slide: 35, covers: "Lessons 5–6", items: [
        ["Internal energy is the total of which two energies?", "The kinetic energy and potential energy of the particles."],
        ["What does a flat section of a heating graph show?", "A change of state."],
        ["Which energy of the particles increases while ice melts?", "Their potential energy."],
        ["State the unit of specific latent heat.", "J/kg"],
        ["Calculate the energy needed to melt 2.0 kg of ice. L = 334 000 J/kg", R`\(E = 2.0 \times 334\,000 = 668\,000\) J`],
        ["Liquid to vapour: latent heat of fusion or of vaporisation?", "Vaporisation."],
      ] },
      summary: ["Latent heat is the energy needed for a change of state. The temperature does not change.", R`Specific latent heat \(L\): the energy to change the state of 1 kg, in J/kg.`, R`\(E = m\,L\); rearranged, \(L = \dfrac{E}{m}\) and \(m = \dfrac{E}{L}\).`, "Fusion: solid and liquid. Vaporisation: liquid and vapour.", "The same energy is given out when the change is reversed (freezing, condensing)."],
      recall: [["Define specific latent heat.", "The energy needed to change the state of 1 kg of a substance with no change in temperature."], ["Write the equation for the energy for a change of state.", R`\(E = m\,L\)`], ["State the unit of specific latent heat.", "J/kg"], ["Which change of state does “fusion” describe?", "Solid to liquid (melting)."]],
      cando: ["define specific latent heat", R`calculate energy, mass or \(L\) with \(E = m\,L\)`, "tell fusion from vaporisation", "describe how to measure the specific latent heat of fusion of water"],
    },

    // ============================================================ 7
    {
      n: 7, accent: "copper", slides: "36–40", title: "Specific heat capacity",
      spec: "AQA Physics 4.3.2.2, 4.1.1.3; Combined Science 6.3.2.2, 6.1.1.3",
      mapLine: R`What a temperature rise depends on, \(\Delta E = m\,c\,\Delta\theta\), rearranging, heat capacity or latent heat?`,
      big: "On a sunny beach the sand burns your feet but the sea is still cold. Both have had the same sunshine. Why?",
      goals: ["state the three things a temperature rise depends on", "state what specific heat capacity means", R`calculate with \(\Delta E = m\,c\,\Delta\theta\)`, "decide whether a problem needs specific heat capacity or specific latent heat"],
      keywords: ["specific heat capacity", "temperature change (Δθ)", "thermal energy", "joule per kilogram per degree Celsius (J/kg °C)"],
      kit: "Per pair: calculator. Demonstration: two beakers on identical hotplates, one with 200 g of water and one with 200 g of cooking oil, each with a thermometer.",
      doNow: [
        ["Write the equation for the energy needed for a change of state.", R`\(E = m\,L\)`],
        ["Which energy of the particles increases when the temperature of a substance rises?", "Kinetic energy."],
        ["Water is heated from 18 °C to 63 °C. Calculate the temperature change.", "63 − 18 = 45 °C"],
      ],
      learnTitle: "How hard is it to heat?",
      learn: [
        { t: "p", h: "Heat a substance without changing its state and its temperature rises. How much it rises depends on three things:" },
        { t: "list", items: ["the <strong>energy</strong> transferred to it: more energy, bigger rise", "its <strong>mass</strong>: more mass, smaller rise", "the <strong>material</strong> it is made of: the same energy warms 1 kg of copper far more than 1 kg of water"] },
        { t: "key", h: "The <strong>specific heat capacity</strong> of a substance is the amount of energy required to raise the temperature of <strong>one kilogram</strong> of the substance by <strong>one degree Celsius</strong>." },
        { t: "eq", stack: true, eq: R`\(\Delta E = m\,c\,\Delta\theta\)`, words: "change in thermal energy = mass × specific heat capacity × temperature change", units: R`\(\Delta E\) in J, \(m\) in kg, \(c\) in J/kg °C, \(\Delta\theta\) in °C`, re: R`Rearranged: \(c = \dfrac{\Delta E}{m\,\Delta\theta}\) and \(\Delta\theta = \dfrac{\Delta E}{m\,c}\). \(\Delta\) (delta) means “change in”; \(\theta\) (theta) is temperature.`, tri: { top: "ΔE", bottom: ["m", "c", "Δθ"] } },
        { t: "compare", head: ["Material", "Specific heat capacity in J/kg °C"], rows: [["water", "4200"], ["cooking oil", "2000"], ["aluminium", "900"], ["iron", "450"], ["copper", "390"], ["lead", "130"]] },
        { t: "p", h: "Water has a very high specific heat capacity: it takes a lot of energy to warm it up, and it gives out a lot as it cools. That is why the sea stays cool on a hot day, and why water is used in radiators and to cool car engines." },
        { t: "follow", slide: 38, q: "Calculate the energy needed to heat 2.0 kg of water from 20 °C to 100 °C. Specific heat capacity of water = 4200 J/kg °C", steps: [["Change", R`\(\Delta\theta = 100 - 20 = 80\) °C`], ["Equation", R`\(\Delta E = m\,c\,\Delta\theta\)`], ["Substitute", R`\(\Delta E = 2.0 \times 4200 \times 80\)`], ["Answer", R`\(\Delta E = 672\,000\) J`]],
          yt: { q: "Calculate the energy needed to heat a 0.50 kg aluminium pan from 20 °C to 50 °C. Specific heat capacity of aluminium = 900 J/kg °C", steps: [["Change", R`\(\Delta\theta = 50 - 20 = 30\) °C`], ["Equation", R`\(\Delta E = m\,c\,\Delta\theta\)`], ["Substitute", R`\(\Delta E = 0.50 \times 900 \times 30\)`], ["Answer", R`\(\Delta E = 13\,500\) J`]] } },
        { t: "sub", h: "Finding the temperature change or the specific heat capacity" },
        { t: "follow", slide: 39, q: "7800 J is transferred to a 0.50 kg block of copper. Calculate its temperature rise. Specific heat capacity of copper = 390 J/kg °C", steps: [["Equation", R`\(\Delta E = m\,c\,\Delta\theta\)`], ["Rearrange", R`\(\Delta\theta = \dfrac{\Delta E}{m\,c}\)`], ["Substitute", R`\(\Delta\theta = \dfrac{7800}{0.50 \times 390}\)`], ["Answer", R`\(\Delta\theta = 40\) °C`]],
          yt: { q: "5400 J is transferred to a 0.20 kg block of aluminium. Calculate its temperature rise. Specific heat capacity of aluminium = 900 J/kg °C", steps: [["Equation", R`\(\Delta E = m\,c\,\Delta\theta\)`], ["Rearrange", R`\(\Delta\theta = \dfrac{\Delta E}{m\,c}\)`], ["Substitute", R`\(\Delta\theta = \dfrac{5400}{0.20 \times 900}\)`], ["Answer", R`\(\Delta\theta = 30\) °C`]] } },
        { t: "follow", slide: 39, q: "27 000 J raises the temperature of a 1.5 kg metal block by 20 °C. Calculate the specific heat capacity of the metal.", steps: [["Equation", R`\(\Delta E = m\,c\,\Delta\theta\)`], ["Rearrange", R`\(c = \dfrac{\Delta E}{m\,\Delta\theta}\)`], ["Substitute", R`\(c = \dfrac{27\,000}{1.5 \times 20}\)`], ["Answer", "c = 900 J/kg °C"]],
          yt: { q: "12 600 J raises the temperature of 0.60 kg of a liquid by 10 °C. Calculate the specific heat capacity of the liquid.", steps: [["Equation", R`\(\Delta E = m\,c\,\Delta\theta\)`], ["Rearrange", R`\(c = \dfrac{\Delta E}{m\,\Delta\theta}\)`], ["Substitute", R`\(c = \dfrac{12\,600}{0.60 \times 10}\)`], ["Answer", "c = 2100 J/kg °C"]] } },
        { t: "tip", h: R`\(\Delta\theta\) is the <strong>change</strong> in temperature, not the final temperature. From 20 °C to 100 °C is a change of 80 °C. If the question asks for the final temperature, add your \(\Delta\theta\) to the starting temperature.` },
        { t: "sub", h: "Heat capacity or latent heat?" },
        { t: "compare", head: ["", "Specific heat capacity", "Specific latent heat"], rows: [["What happens", "the temperature changes", "the state changes"], ["Temperature", "changes", "stays constant"], ["Equation", R`\(\Delta E = m\,c\,\Delta\theta\)`, R`\(E = m\,L\)`], ["Unit", "J/kg °C", "J/kg"]] },
      ],
      try: [
        { t: "q", p: "Draw a ring around the correct answer in each box.", ring: [
          ["The unit of specific heat capacity is", ["J/kg", "J/kg °C", "J/°C"], 1],
          ["The same energy is given to 1 kg of water and to 1 kg of copper. The bigger temperature rise is in the", ["water", "copper"], 1],
        ] },
        { t: "q", type: "Supported", p: "Calculate the energy needed to raise the temperature of 4.0 kg of iron by 25 °C. Specific heat capacity of iron = 450 J/kg °C", frame: frame3, frameA: [R`\(\Delta E = m\,c\,\Delta\theta\)`, R`\(\Delta E = 4.0 \times 450 \times 25\)`, "45 000 J"] },
        { t: "q", type: "Supported", p: "250 g of water is heated from 15 °C to 75 °C. Calculate the energy transferred to the water. Specific heat capacity of water = 4200 J/kg °C", frame: [["Convert"], ["Temperature change"], ["Equation"], ["Substitute"], ["Answer", "unit:"]], frameA: ["m = 0.250 kg", R`\(\Delta\theta = 75 - 15 = 60\) °C`, R`\(\Delta E = m\,c\,\Delta\theta\)`, R`\(\Delta E = 0.250 \times 4200 \times 60\)`, "63 000 J"] },
        { t: "q", p: "Complete the table. Show your working underneath.", table: { head: ["Substance", "Mass / kg", R`\(c\) / J/kg °C`, R`\(\Delta\theta\) / °C`, R`\(\Delta E\) / J`], rows: [["Cooking oil", "0.50", "2000", "60", null], ["Lead", "2.0", "130", null, "5200"], ["Unknown metal", "4.0", null, "10", "18 000"]], ans: [[null, null, null, null, "60 000"], [null, null, null, "20", null], [null, null, "450", null, null]] }, box: 30, grid: true },
        { t: "q", p: "For each change, write the equation you would use.", table: { head: ["Change", "Equation"], rows: [["Heating water from 20 °C to 80 °C", null], ["Melting ice at 0 °C", null], ["Boiling water at 100 °C", null], ["Cooling a hot iron bar", null]], ans: [[null, R`\(\Delta E = m\,c\,\Delta\theta\)`], [null, R`\(E = m\,L\)`], [null, R`\(E = m\,L\)`], [null, R`\(\Delta E = m\,c\,\Delta\theta\)`]] } },
        { t: "q", type: "Challenge", p: "A kettle heats 0.20 kg of water from 20 °C to 100 °C, and then boils all of it away. Calculate the total energy transferred to the water. Use c = 4200 J/kg °C and L = 2 260 000 J/kg", lines: 5, a: R`Heating: \(\Delta E = m\,c\,\Delta\theta = 0.20 \times 4200 \times 80 = 67\,200\) J. Boiling: \(E = m\,L = 0.20 \times 2\,260\,000 = 452\,000\) J. Total = 519 200 J.` },
      ],
      exam: [
        { tip: R`Work out \(\Delta\theta\) first and write it down. It is the step most often missed.`, p: "A hot-water bottle holds 0.80 kg of water. The water cools from 70 °C to 30 °C. Calculate the energy transferred from the water. Specific heat capacity of water = 4200 J/kg °C", marks: 3, frame: [["Temperature change"], ["Equation"], ["Substitute"], ["Answer", "unit:"]], frameA: [R`\(\Delta\theta = 70 - 30 = 40\) °C (1)`, R`\(\Delta E = m\,c\,\Delta\theta\)`, R`\(\Delta E = 0.80 \times 4200 \times 40\) (1)`, "134 400 J (1)"] },
        { p: "A heater transfers 36 000 J to a 2.0 kg block of aluminium. Calculate the temperature rise of the block. Specific heat capacity of aluminium = 900 J/kg °C", marks: 3, frame: frameRe, frameA: [R`\(\Delta E = m\,c\,\Delta\theta\)`, R`\(\Delta\theta = \dfrac{\Delta E}{m\,c}\) (1)`, R`\(\Delta\theta = \dfrac{36\,000}{2.0 \times 900}\) (1)`, "20 °C (1)"] },
        { p: "Give one difference between specific heat capacity and specific latent heat.", marks: 2, lines: 3, a: "Specific heat capacity is about a change in temperature (energy to raise 1 kg by 1 °C) (1); specific latent heat is about a change of state at constant temperature (energy to change the state of 1 kg) (1)." },
      ],
      summary: ["A temperature rise depends on the energy supplied, the mass and the material.", R`Specific heat capacity \(c\): the energy to raise the temperature of 1 kg by 1 °C, in J/kg °C.`, R`\(\Delta E = m\,c\,\Delta\theta\); rearranged, \(c = \dfrac{\Delta E}{m\,\Delta\theta}\) and \(\Delta\theta = \dfrac{\Delta E}{m\,c}\).`, "Temperature changing: specific heat capacity. State changing: specific latent heat."],
      recall: [["Define specific heat capacity.", "The energy needed to raise the temperature of 1 kg of a substance by 1 °C."], ["Write the equation for a change in thermal energy.", R`\(\Delta E = m\,c\,\Delta\theta\)`], ["State the unit of specific heat capacity.", "J/kg °C"], [R`What does \(\Delta\theta\) stand for?`, "The change in temperature."]],
      cando: ["state what a temperature rise depends on", "define specific heat capacity", R`calculate with \(\Delta E = m\,c\,\Delta\theta\)`, R`rearrange to find \(c\) or \(\Delta\theta\)`, "choose between specific heat capacity and specific latent heat"],
    },

    // ============================================================ 8
    {
      n: 8, accent: "leaf", slides: "41–45", title: "Measuring specific heat capacity (required practical)",
      spec: "AQA Physics 4.1.1.3, required practical 1; Combined Science 6.1.1.3, required practical 14",
      mapLine: R`Heating a metal block, \(E = V\,I\,t\) or a joulemeter, the graph method, why the answer comes out too high`,
      big: "How could you find out which metal a block is made of, using only a heater and a thermometer?",
      goals: ["describe how to measure the specific heat capacity of a metal block", R`calculate the energy supplied with \(E = V\,I\,t\), or read it from a joulemeter`, "calculate the specific heat capacity from the results", "explain why the result is usually too high, and how to improve it"],
      keywords: ["immersion heater", "joulemeter", "insulation", "energy supplied", "gradient", "systematic error"],
      kit: "Per group: 1 kg metal block with two holes, 12 V immersion heater, thermometer, insulation jacket and heatproof mat, power supply, ammeter, voltmeter, leads, stopwatch, balance. A joulemeter if you have one. A drop of oil for the thermometer hole.",
      doNow: [
        ["Define specific heat capacity.", "The energy needed to raise the temperature of 1 kg of a substance by 1 °C."],
        [R`Write the two equations for electrical power and energy from Electric Circuits.`, R`\(P = V\,I\) and \(E = P\,t\)`],
        ["Convert 10 minutes to seconds.", "10 × 60 = 600 s"],
      ],
      learnTitle: "Energy in, temperature up",
      learn: [
        { t: "p", h: R`To find a specific heat capacity you need three measurements: the <strong>mass</strong> of the block, its <strong>temperature rise</strong> and the <strong>energy supplied</strong> to it. Then \(c = \dfrac{\Delta E}{m\,\Delta\theta}\).` },
        { t: "p", h: "An electric heater is used, not a Bunsen burner, because the energy that an electric heater supplies can be measured." },
        { t: "sub", h: "Two ways to measure the energy supplied" },
        { t: "split", left: [{ t: "fig", h: F.shc({ meter: "vi" }), cap: R`Ammeter in series, voltmeter across the heater` }], right: [{ t: "fig", h: F.shc(), cap: "A joulemeter reads the energy directly" }] },
        { t: "eq", eq: R`\(E = V\,I\,t\)`, words: "energy supplied = potential difference × current × time", units: R`\(E\) in J, \(V\) in V, \(I\) in A, \(t\) in s`, re: R`This joins two equations you know: \(P = V\,I\) and \(E = P\,t\).` },
        { t: "worked", q: "A heater runs at 12 V and 4.0 A for 5.0 minutes. Calculate the energy supplied.", steps: [["Convert", R`\(t = 5.0 \times 60 = 300\) s`], ["Equation", R`\(E = V\,I\,t\)`], ["Substitute", R`\(E = 12 \times 4.0 \times 300\)`], ["Answer", R`\(E = 14\,400\) J`]],
          yt: { q: "A heater runs at 12 V and 3.0 A for 10 minutes. Calculate the energy supplied.", steps: [["Convert", R`\(t = 10 \times 60 = 600\) s`], ["Equation", R`\(E = V\,I\,t\)`], ["Substitute", R`\(E = 12 \times 3.0 \times 600\)`], ["Answer", R`\(E = 21\,600\) J`]] } },
        { t: "sub", h: "Why the answer comes out too high" },
        { t: "p", h: R`Not all of the energy supplied stays in the block. Some is transferred to the surroundings, and some heats the heater itself. So the temperature rise is <strong>smaller</strong> than it should be, and \(c = \dfrac{\Delta E}{m\,\Delta\theta}\) comes out <strong>too big</strong>.` },
        { t: "list", items: ["<strong>Insulate</strong> the block (sides, top and underneath) to reduce energy transfer to the surroundings.", "Put a drop of <strong>oil</strong> in the thermometer hole, so the thermometer is in good thermal contact with the block.", "After switching off, keep watching: record the <strong>highest</strong> temperature the thermometer reaches."] },
      ],
      lab: { title: "Required practical: specific heat capacity", aside: "The heater and block get hot. Do not touch them until they have cooled.", blocks: [
        { t: "safety", items: ["The immersion heater gets very hot: never switch it on outside the block.", "Stand the block on a heatproof mat and leave it to cool before you move it.", "Do not exceed 12 V. Switch off at the power supply before you change the circuit."] },
        { t: "lab", title: "Method", blocks: [
          { t: "steps", items: ["Measure the mass of the block with a balance.", "Wrap the block in insulation. Put the heater in the large hole and the thermometer, with a drop of oil, in the small hole.", "Connect the ammeter in series with the heater and the voltmeter across it (or connect a joulemeter).", "Record the starting temperature. Switch on and start the stopwatch.", "Record the potential difference and the current. Record the temperature every 2 minutes for 10 minutes.", "Switch off. Record the highest temperature reached."] },
          { t: "q", p: "Record your measurements.", table: { head: ["Material of block", "Mass / kg", "Potential difference / V", "Current / A"], rows: [[null, null, null, null]], ans: [["aluminium", "1.00", "12.0", "4.0"]] } },
          { t: "q", p: R`Complete the table. Energy supplied = \(V\,I\,t\), or read the joulemeter.`, table: { cls: "wide", head: ["Time / s", ...SHC.map(([s]) => String(s))], rows: [["Energy supplied / J", ...SHC.map(() => null)], ["Temperature / °C", ...SHC.map(() => null)]], ans: [[null, ...SHC.map(([, e]) => String(e))], [null, ...SHC.map(([, , c]) => c)]] } },
        ] },
        { t: "lab", title: "Results: from the totals", blocks: [
          { t: "q", p: "Calculate the specific heat capacity of the block from the total energy supplied and the total temperature rise.", frame: [["Temperature rise"], ["Equation"], ["Rearrange"], ["Substitute"], ["Answer", "unit:"]], frameA: [R`\(\Delta\theta = 49.0 - 20.0 = 29.0\) °C`, R`\(\Delta E = m\,c\,\Delta\theta\)`, R`\(c = \dfrac{\Delta E}{m\,\Delta\theta}\)`, R`\(c = \dfrac{28\,800}{1.00 \times 29.0}\)`, "993 J/kg °C (about 990)"] },
        ] },
        { t: "lab", title: "Results: from a graph", blocks: [
          { t: "q", p: "Plot temperature against energy supplied. Draw a straight line of best fit through the part of the graph that is straight.", graph: { w: 120, h: 100, xLabel: "Energy supplied / J", yLabel: "Temperature / °C", x: [2500, 2], y: [5, 1], points: SHC.map(([, e, c]) => [e, Number(c)]), fit: [[0, 18.5], [28800, 49.0]] } },
        ] },
        { t: "lab", blocks: [
          { t: "q", p: R`Find the gradient of your line. Then use \(c = \dfrac{1}{m \times \text{gradient}}\)`, lines: 4, a: R`Gradient \(= \dfrac{49.0 - 24.6}{28\,800 - 5760} = 0.00106\) °C/J. \(c = \dfrac{1}{1.00 \times 0.00106} = 940\) J/kg °C` },
          { t: "q", p: "The graph curves at the start. Suggest why.", lines: 2, a: "At first the heater itself is warming up, and it takes time for energy to spread through the block to the thermometer." },
        ] },
      ] },
      try: [
        { t: "q", p: "The accepted specific heat capacity of aluminium is 900 J/kg °C. Is your value higher or lower? Explain why.", lines: 3, a: "Higher. Some of the energy supplied was transferred to the surroundings instead of the block, so the temperature rise was smaller than it should have been. Dividing by a smaller temperature rise gives a bigger value." },
        { t: "q", p: "Draw a ring around the correct answer in each box.", ring: [
          ["The ammeter is connected", ["in series with the heater", "in parallel with the heater"], 0],
          ["Insulation makes the measured specific heat capacity", ["further from the true value", "closer to the true value"], 1],
          ["Energy transferred to the surroundings is", ["a random error", "a systematic error"], 1],
        ] },
        { t: "q", p: "Explain why the gradient method gives a better value than using only the first and last readings.", lines: 3, a: "The line of best fit uses all the readings, and it leaves out the curved start, where the heater and block were still warming up unevenly." },
        { t: "q", type: "Challenge", p: "A student repeats the practical with 1.0 kg of water in an insulated beaker, with the same heater for the same time. Predict how the temperature rise compares with that of the aluminium block, and explain.", lines: 3, a: "The temperature rise of the water is much smaller (about a fifth), because water has a much higher specific heat capacity (4200 compared with 900 J/kg °C): more energy is needed for each degree." },
      ],
      order: ["doNow", "learn", "lab", "try", "check", "exam", "revise"],
      exam: [
        { tip: "Name what is measured and with what: mass (balance), temperature (thermometer), energy (joulemeter, or ammeter, voltmeter and stopwatch).", p: "Describe a method to determine the specific heat capacity of a metal block. You should include the measurements needed and how they are used.", marks: 6, lines: 10,
          a: "Indicative content: measure the mass of the block with a balance; insulate the block; put an immersion heater and a thermometer in the block; record the starting temperature; switch on the heater for a measured time; measure the energy supplied with a joulemeter (or measure p.d., current and time and use E = V I t); record the highest temperature and calculate the temperature rise; use c = ΔE ÷ (m Δθ); repeat, or plot temperature against energy and use the gradient. Level 3 (5–6): a detailed, logically ordered method that would give a valid result." },
        { p: "A 2.0 kg copper block is heated with an immersion heater. The joulemeter reads 16 400 J and the temperature of the block rises from 21 °C to 41 °C. Calculate the specific heat capacity of copper given by these results.", marks: 4, frame: [["Temperature rise"], ["Equation"], ["Rearrange"], ["Substitute"], ["Answer", "unit:"]], frameA: [R`\(\Delta\theta = 41 - 21 = 20\) °C (1)`, R`\(\Delta E = m\,c\,\Delta\theta\)`, R`\(c = \dfrac{\Delta E}{m\,\Delta\theta}\) (1)`, R`\(c = \dfrac{16\,400}{2.0 \times 20}\) (1)`, "410 J/kg °C (1)"] },
      ],
      quick: { slide: 45, covers: "Lessons 7–8", items: [
        ["State the unit of specific heat capacity.", "J/kg °C"],
        [R`Water is heated from 15 °C to 95 °C. Calculate \(\Delta\theta\).`, "80 °C"],
        ["Calculate the energy to heat 3.0 kg of iron by 50 °C. c = 450 J/kg °C", R`\(3.0 \times 450 \times 50 = 67\,500\) J`],
        ["A heater runs at 12 V and 3.0 A for 300 s. Calculate the energy supplied.", R`\(E = V\,I\,t = 10\,800\) J`],
        ["Why is the metal block insulated?", "So that less energy is transferred to the surroundings."],
        [R`Ice melting at 0 °C: do you use \(c\) or \(L\)?`, R`\(L\): the state changes, not the temperature.`],
      ] },
      summary: ["Measure the mass (balance), the temperature rise (thermometer) and the energy supplied.", R`Energy supplied: a joulemeter, or \(E = V\,I\,t\) with an ammeter, a voltmeter and a stopwatch.`, R`\(c = \dfrac{\Delta E}{m\,\Delta\theta}\), or from the gradient of a temperature–energy graph.`, "Energy transferred to the surroundings makes the result too high. Insulation reduces this."],
      recall: [["Which three measurements are needed to find a specific heat capacity?", "Mass, temperature rise and energy supplied."], ["Why is the block wrapped in insulation?", "To reduce energy transfer to the surroundings."], ["Why is the measured value usually too high?", "Some of the energy supplied goes to the surroundings, so the temperature rise is too small."], ["Write the equation for the energy supplied by a heater, using V, I and t.", R`\(E = V\,I\,t\)`]],
      cando: ["describe the method for measuring specific heat capacity", R`calculate the energy supplied with \(E = V\,I\,t\)`, "calculate specific heat capacity from results", "use the gradient of a temperature–energy graph", "explain why the result is too high and how to improve it"],
    },
  ];

  window.UNIT_LESSONS = (window.UNIT_LESSONS || []).concat(lessons);
})();
