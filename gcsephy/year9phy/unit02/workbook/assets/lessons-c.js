/* Lessons 6-9 of the Year 9 Energy workbook. Format as in lessons-a.js. */
(function () {
  "use strict";

  const R = String.raw;
  const F = window.EnergyFigures;
  const A = new URLSearchParams(location.search).has("answers");
  const frame3 = [["Equation"], ["Substitute"], ["Answer", "unit:"]];
  const frame4 = [["Convert"], ["Equation"], ["Substitute"], ["Answer", "unit:"]];
  const frameRe = [["Equation"], ["Rearrange"], ["Substitute"], ["Answer", "unit:"]];
  const bars = (title, values) => F.barChart({ max: 20, step: 5, title, values: A ? values : null });

  const lessons = [
    // ============================================================ 6
    {
      n: 6, accent: "spark", week: "3", title: "Conservation of energy",
      spec: "AQA Physics 4.1.2.1, 4.1.1.1; Combined Science 6.1.2.1, 6.1.1.1",
      mapLine: "Closed systems, falling and swinging, energy bar charts, dissipation",
      big: "A heavy pendulum is pulled back to touch your nose and let go. When it swings back, will it hit you?",
      goals: ["state the principle of conservation of energy", "follow energy from one store to another in a closed system", "use conservation of energy in calculations", "draw energy bar charts", "explain why real systems lose some useful energy"],
      keywords: ["conservation of energy", "closed system", "dissipated", "energy bar chart"],
      kit: "Practical: clamp stand, string, pendulum bob, metre rule, a phone to film the swing.",
      doNow: [
        ["A 1.0 kg ball is lifted 2.0 m. Calculate the energy transferred to its gravitational potential store.", R`\(E_p = 1.0 \times 9.8 \times 2.0\)<br>\(E_p = 19.6\) J`],
        ["A 2.0 kg ball moves at 3.0 m/s. Calculate the energy in its kinetic store.", R`\(E_k = 0.5 \times 2.0 \times 3.0^2\)<br>\(E_k = 9.0\) J`],
        [R`A stretched spring stores energy in its [[elastic potential|kinetic / elastic potential]] store.`, "elastic potential"],
      ],
      learnTitle: "Energy is never lost",
      learn: [
        { t: "key", h: "<strong>Conservation of energy:</strong> energy can be transferred usefully, stored or dissipated, but it cannot be created or destroyed." },
        { t: "p", h: "In a <strong>closed system</strong>, the total energy never changes. Energy only moves from one store to another." },
        { t: "sub", h: "A falling ball" },
        { t: "p", h: "As a ball falls, energy is transferred from its gravitational potential (G.P.E.) store to its kinetic store. If we ignore air resistance, all the energy that leaves the G.P.E. store arrives in the kinetic store. An <strong>energy bar chart</strong> shows this: the bars change, but the total stays the same." },
        { t: "figs", cols: 3, items: [F.barChart({ max: 20, step: 5, title: "released", values: [20, 0, 0] }), F.barChart({ max: 20, step: 5, title: "half-way down", values: [10, 10, 0] }), F.barChart({ max: 20, step: 5, title: "just before landing", values: [0, 20, 0] })] },
        { t: "worked", q: "A 0.50 kg ball is dropped from 3.0 m. Calculate the energy in its kinetic store just before it lands. Ignore air resistance.", steps: [["Idea", R`energy gained by the kinetic store = energy lost from the G.P.E. store`], ["Equation", R`\(E_p = m\,g\,h\)`], ["Substitute", R`\(E_p = 0.50 \times 9.8 \times 3.0 = 14.7\) J`], ["Answer", R`\(E_k = 14.7\) J`]],
          yt: { q: "A 2.0 kg rock falls 5.0 m. Calculate the energy in its kinetic store just before it lands. Ignore air resistance.", steps: [["Idea", "energy gained by the kinetic store = energy lost from the G.P.E. store"], ["Equation", R`\(E_p = m\,g\,h\)`], ["Substitute", R`\(E_p = 2.0 \times 9.8 \times 5.0 = 98\) J`], ["Answer", R`\(E_k = 98\) J`]] } },
        { t: "sub", h: "Finding a height" },
        { t: "worked", q: "A 0.25 kg ball is thrown straight up with 20 J in its kinetic store. Calculate the greatest height it reaches. Ignore air resistance.", steps: [["Idea", R`at the top, all 20 J is in the G.P.E. store`], ["Rearrange", R`\(h = \dfrac{E_p}{m\,g}\)`], ["Substitute", R`\(h = \dfrac{20}{0.25 \times 9.8}\)`], ["Answer", "h = 8.2 m"]],
          yt: { q: "A 0.10 kg ball is thrown straight up with 4.9 J in its kinetic store. How high does it go? Ignore air resistance.", steps: [["Idea", R`at the top, all 4.9 J is in the G.P.E. store`], ["Rearrange", R`\(h = \dfrac{E_p}{m\,g}\)`], ["Substitute", R`\(h = \dfrac{4.9}{0.10 \times 9.8}\)`], ["Answer", "h = 5.0 m"]] } },
        { t: "sub", h: "Real systems: some energy is dissipated" },
        { t: "p", h: "In real life, air resistance and friction transfer some energy to the <strong>thermal store</strong> of the surroundings. This energy is not destroyed, but it is spread out and we cannot use it again. We say it is <strong>dissipated</strong>. That is why a pendulum swings a little lower each time, and why it will not hit your nose." },
      ],
      lab: { title: "Practical: does the pendulum keep its energy?", aside: "Every reading is a height, so you do not need fast timing.", blocks: [
        { t: "split", cls: "narrow-fig", left: [
          { t: "safety", items: ["Clamp the stand firmly so it cannot tip.", "Let the bob go from rest; never push it.", "Keep clear of the swing."] },
          { t: "steps", items: ["Hang the bob. Note the height of its lowest point on the metre rule.", "Pull the bob to the side until it is 0.20 m higher than its lowest point (A). Let go.", "Read the height it reaches on the other side (C). Filming helps.", "Let it keep swinging. Read the height it reaches after 10 swings."] },
        ], right: [{ t: "fig", h: F.pendulum() }] },
        { t: "lab", blocks: [
          { t: "q", p: "Mass of the bob = [[0.20|16]] kg. Record the heights and calculate the energy in the G.P.E. store each time.", table: { head: ["Moment", "Height above lowest point / m", R`\(E_p\) / J`], rows: [["Released", "0.20", null], ["After 1 swing", null, null], ["After 10 swings", null, null]], ans: [[null, null, "0.39"], [null, "0.19", "0.37"], [null, "0.12", "0.24"]] }, box: 18, grid: true },
          { t: "q", p: "On the first swing, how much energy is in the bob's kinetic store at the lowest point B? Explain.", lines: 2, a: "About 0.39 J (sample): all the energy lost from the G.P.E. store goes to the kinetic store (a little less in real life)." },
          { t: "q", p: R`After 10 swings, the energy has been {{created|destroyed|dissipated*}}. Where has it gone?`, lines: 2, a: "To the thermal store of the air and the surroundings, through air resistance and friction at the support." },
        ] },
      ] },
      try: [
        { t: "q", p: "A ball has 20 J in its G.P.E. store at the top. Ignore air resistance. Draw the bars at each moment.", after: [{ t: "figs", cols: 3, items: [bars("at the top", [20, 0, 0]), bars("half-way down", [10, 10, 0]), bars("just before landing", [0, 20, 0])] }] },
        { t: "q", p: "Complete the sentences. The choices are after each gap.", fill: [R`At the top of its swing, a pendulum has most energy in its [[gravitational potential|kinetic / gravitational potential]] store.`, R`At the bottom of its swing, it has most energy in its [[kinetic|kinetic / gravitational potential]] store.`, R`The total energy [[stays the same|goes up / goes down / stays the same]] if we ignore air resistance.`] },
        { t: "q", type: "On your own", p: "A 0.20 kg apple falls 2.5 m from a tree. Calculate the energy in its kinetic store just before it lands. Ignore air resistance.", lines: 3, a: R`\(E_k = E_p = 0.20 \times 9.8 \times 2.5 = 4.9\) J` },
        { t: "q", type: "Challenge", p: "A toy launcher has a spring with k = 200 N/m, squashed by 0.050 m. It fires a 10 g ball straight up. Calculate the greatest height the ball could reach.", lines: 4, a: R`\(E_e = 0.5 \times 200 \times 0.050^2 = 0.25\) J. At the top, \(E_p = 0.25\) J. \(h = \dfrac{0.25}{0.010 \times 9.8} = 2.6\) m` },
        { t: "q", say: ["Mo", "The pendulum swings lower each time, so energy is being destroyed."], p: "Explain why Mo is wrong.", lines: 2, a: "Energy cannot be destroyed. It is dissipated: transferred to the thermal store of the surroundings by air resistance and friction." },
      ],
      exam: [
        { tip: "In part (b), say why the two energies are equal.", p: "A diver of mass 60 kg stands on a board 10 m above the water. Gravitational field strength = 9.8 N/kg.<br>(a) Calculate the energy in the diver's gravitational potential store.", marks: 2, frame: frame3, frameA: [R`\(E_p = m\,g\,h\)`, R`\(E_p = 60 \times 9.8 \times 10\) (1)`, "5880 J (1)"] },
        { p: "(b) The diver falls into the water. Ignoring air resistance, how much energy is in the diver's kinetic store just before they reach the water? Give a reason.", marks: 2, lines: 2, a: "5880 J (1). All the energy lost from the gravitational potential store is transferred to the kinetic store (1)." },
        { p: "(c) In real life, the energy in the kinetic store is a little less. Explain why.", marks: 2, lines: 2, a: "Air resistance acts on the diver (1), so some energy is transferred to the thermal store of the air / surroundings (1)." },
      ],
      summary: ["Energy cannot be created or destroyed, only transferred, stored or dissipated.", "In a closed system the total energy stays the same.", "Falling: G.P.E. store → kinetic store. Rising: kinetic store → G.P.E. store.", "Energy bar charts: the bars change, the total stays the same.", "Real systems dissipate some energy to the thermal store of the surroundings."],
      recall: [["State the principle of conservation of energy.", "Energy can be transferred usefully, stored or dissipated, but cannot be created or destroyed."], ["A ball falls and loses 12 J of G.P.E. Ignoring air resistance, how much does its kinetic store gain?", "12 J"], ["Why does a pendulum swing lower each time?", "Some energy is dissipated to the thermal store of the surroundings by air resistance and friction."], ["What does an energy bar chart show?", "How much energy is in each store at one moment."]],
      cando: ["state the principle of conservation of energy", "use energy lost = energy gained in calculations", "draw energy bar charts", "explain why real systems dissipate energy"],
    },

    // ============================================================ 7
    {
      n: 7, accent: "cyan", week: "4", title: "Power",
      spec: "AQA Physics 4.1.1.4; Combined Science 6.1.1.4",
      mapLine: R`Power as a rate, watts, \(P = \dfrac{E}{t}\), how powerful are you?`,
      big: "Two students carry the same bag up the same stairs. One runs and one walks. Who transferred more energy? Who was more powerful?",
      goals: ["say what power means", "state that 1 watt is 1 joule per second", R`calculate power with \(P = \dfrac{E}{t}\), and find \(E\) or \(t\)`, "convert kW to W, kJ to J and minutes to seconds"],
      keywords: ["power", "watt (W)", "kilowatt (kW)", "rate"],
      kit: "Practical: stopwatch, tape measure or metre rule, a flight of stairs.",
      doNow: [
        ["A 50 kg student climbs 3.0 m of stairs. Calculate the energy transferred to their G.P.E. store.", R`\(E_p = 50 \times 9.8 \times 3.0\)<br>\(E_p = 1470\) J`],
        ["Convert 2.0 minutes to seconds.", "120 s"],
        ["State the principle of conservation of energy.", "Energy can be transferred usefully, stored or dissipated, but cannot be created or destroyed."],
      ],
      learnTitle: "How fast is energy transferred?",
      learn: [
        { t: "p", h: "<strong>Power</strong> is how fast energy is transferred: the energy transferred <strong>each second</strong>. Two motors can lift the same load through the same height, so they transfer the same energy. The motor that does it faster is more powerful." },
        { t: "eq", eq: R`\(P = \dfrac{E}{t}\)`, words: "power = energy transferred ÷ time", units: R`\(P\) in watts (W), \(E\) in joules (J), \(t\) in seconds (s)`, re: R`Rearranged: \(E = P\,t\) and \(t = \dfrac{E}{P}\)`, tri: { top: "E", bottom: ["P", "t"] } },
        { t: "key", h: "<strong>1 watt (W) = 1 joule per second.</strong> 1 kilowatt (kW) = 1000 W. A 60 W lamp transfers 60 J every second." },
        { t: "compare", head: ["", "Energy transferred", "Time", "Power"], rows: [["Motor A", "29.4 J", "2.0 s", "29.4 ÷ 2.0 = 14.7 W"], ["Motor B", "29.4 J", "6.0 s", "29.4 ÷ 6.0 = 4.9 W"]] },
        { t: "worked", q: "A motor transfers 600 J in 4.0 s. Calculate its power.", steps: [["Know", "E = 600 J, t = 4.0 s"], ["Equation", R`\(P = \dfrac{E}{t}\)`], ["Substitute", R`\(P = \dfrac{600}{4.0}\)`], ["Answer", "P = 150 W"]],
          yt: { q: "A lamp transfers 900 J in 15 s. Calculate its power.", steps: [["Know", "E = 900 J, t = 15 s"], ["Equation", R`\(P = \dfrac{E}{t}\)`], ["Substitute", R`\(P = \dfrac{900}{15}\)`], ["Answer", "P = 60 W"]] } },
        { t: "worked", q: "A 2.0 kW kettle is switched on for 2.0 minutes. Calculate the energy transferred.", steps: [["Convert", "P = 2000 W, t = 120 s"], ["Rearrange", R`\(E = P\,t\)`], ["Substitute", R`\(E = 2000 \times 120\)`], ["Answer", "E = 240 000 J"]],
          yt: { q: "A 1500 W motor must transfer 45 000 J. How long does it take?", steps: [["Know", "P = 1500 W, E = 45 000 J"], ["Rearrange", R`\(t = \dfrac{E}{P}\)`], ["Substitute", R`\(t = \dfrac{45\,000}{1500}\)`], ["Answer", "t = 30 s"]] } },
      ],
      lab: { title: "Practical: how powerful are you?", aside: "Everyone uses a mass of 50 kg, so nobody is weighed.", blocks: [
        { t: "split", cls: "narrow-fig", left: [
          { t: "safety", items: ["Walk briskly. Do not run. Hold the handrail.", "One person on the stairs at a time.", "Use dry, clear stairs."] },
          { t: "steps", items: ["Measure the height of one step. Count the steps. Height h = step height × number of steps.", "Your partner times you walking briskly up the stairs.", R`Calculate the energy transferred: \(E = m\,g\,h\), with \(m = 50\) kg.`, R`Calculate your power: \(P = \dfrac{E}{t}\).`] },
        ], right: [{ t: "fig", h: F.stairs() }] },
        { t: "lab", blocks: [
          { t: "vars", rows: [["Height of one step / m", "", "0.17"], ["Number of steps", "", "18"], ["Height h / m", "", "3.06"], ["Mass / kg", "50", ""], ["Time / s", "", "5.0"]] },
          { t: "q", p: "Calculate the energy transferred to your G.P.E. store.", frame: frame3, frameA: [R`\(E_p = m\,g\,h\)`, R`\(E_p = 50 \times 9.8 \times 3.06\)`, "1500 J (sample)"] },
          { t: "q", p: "Calculate your power.", frame: frame3, frameA: [R`\(P = \dfrac{E}{t}\)`, R`\(P = \dfrac{1500}{5.0}\)`, "300 W (sample)"] },
          { t: "q", p: R`Is your real power output {{higher*|lower}} than your answer? Explain.`, lines: 2, a: "Higher: you also transferred energy to your kinetic store and to the thermal store of your body and the air, not only to your G.P.E. store." },
        ] },
      ] },
      try: [
        { t: "q", p: "Draw a ring around the correct answer in each box.", ring: [["Power is measured in", ["joules", "watts", "newtons"], 1], ["A more powerful motor transfers energy", ["faster", "slower"], 0], ["1 W is the same as", ["1 J per second", "1 J per minute", "1 N per metre"], 0]] },
        { t: "q", type: "Supported", p: "A 40 W fan runs for 5.0 minutes. Calculate the energy transferred. <em>Convert the time first!</em>", frame: frame4, frameA: ["t = 5.0 × 60 = 300 s", R`\(E = P\,t\)`, R`\(E = 40 \times 300\)`, "12 000 J"] },
        { t: "q", p: "Complete the table. Show your working underneath.", table: { head: ["Appliance", "Energy / J", "Time / s", "Power / W"], rows: [["Fan", "1200", "30", null], ["Kettle", null, "60", "2000"], ["Lamp", "5000", null, "100"]], ans: [[null, null, null, "40"], [null, "120 000", null, null], [null, null, "50", null]] }, box: 22, grid: true },
        { t: "q", type: "Challenge", p: "A 3.0 kW heater transfers 540 kJ. How many minutes was it on for?", lines: 3, a: R`\(t = \dfrac{E}{P} = \dfrac{540\,000}{3000} = 180\) s = 3.0 minutes` },
      ],
      exam: [
        { tip: "Two steps: find the energy first, then the power.", p: "A lift motor raises a 600 kg lift through 15 m in 20 s. Gravitational field strength = 9.8 N/kg.<br>(a) Calculate the energy transferred to the lift's gravitational potential store.", marks: 2, frame: frame3, frameA: [R`\(E_p = m\,g\,h\)`, R`\(E_p = 600 \times 9.8 \times 15\) (1)`, "88 200 J (1)"] },
        { p: "(b) Calculate the useful power output of the motor.", marks: 2, frame: frame3, frameA: [R`\(P = \dfrac{E}{t}\)`, R`\(P = \dfrac{88\,200}{20}\) (1)`, "4410 W (1)"] },
        { p: "Motor A lifts a load in 5 s. Motor B lifts the same load through the same height in 10 s. Complete the sentence.", marks: 2, fill: R`Motor A transfers [[the same|more / less / the same]] energy as motor B, and has [[a greater|a greater / a smaller / the same]] power.` },
      ],
      summary: ["Power is the rate of energy transfer: the energy transferred each second.", R`\(P = \dfrac{E}{t}\); \(E = P\,t\); \(t = \dfrac{E}{P}\).`, "1 W = 1 J/s; 1 kW = 1000 W.", "Time in seconds: minutes × 60."],
      recall: [["What is power?", "The rate of energy transfer (energy transferred per second)."], ["What is 1 watt?", "1 joule per second."], ["A lamp transfers 600 J in 10 s. What is its power?", "60 W"], ["Write the equation to find energy from power and time.", R`\(E = P\,t\)`]],
      cando: ["define power as the rate of energy transfer", R`calculate \(P = \dfrac{E}{t}\) and find \(E\) or \(t\)`, "convert kW, kJ and minutes", "measure my own power"],
    },

    // ============================================================ 8
    {
      n: 8, accent: "copper", week: "4", title: "Wasted energy",
      spec: "AQA Physics 4.1.2.1; Combined Science 6.1.2.1",
      mapLine: "Dissipation, lubrication, thermal conductivity, insulation, design an Eco House",
      big: "A hot chocolate always goes cold. Where does the energy go, and how can you slow it down?",
      goals: ["explain what “dissipated” means and where the energy ends up", "explain how lubrication reduces unwanted energy transfers", "explain how thermal conductivity and wall thickness affect how fast a house cools", "suggest and explain ways to insulate a home"],
      keywords: ["dissipated", "friction", "lubrication", "conduction", "thermal conductivity", "thermal insulator"],
      story: { title: "Seeing heat", text: "A thermal camera shows warm things as bright colours. Point one at a house in winter and the windows, the roof and the gaps round the door glow: that is where energy is escaping into the cold air outside." },
      doNow: [
        ["A fan transfers 600 J in 20 s. Calculate its power.", "P = 600 ÷ 20 = 30 W"],
        [R`Dissipated energy usually ends up in the [[thermal|thermal / chemical / nuclear]] store of the surroundings.`, "thermal"],
        ["A pendulum swings lower each time. Why?", "Some energy is dissipated by air resistance and friction."],
      ],
      learnTitle: "Reducing unwanted energy transfers",
      learn: [
        { t: "p", h: "In every real energy transfer, some energy goes to stores where it is not useful, usually the <strong>thermal store of the surroundings</strong>. This energy is <strong>dissipated</strong> (spread out). People often call it “wasted” energy. It is not destroyed, but we cannot use it again." },
        { t: "compare", head: ["Unwanted transfer", "How to reduce it", "Why it works"], rows: [
          ["Friction between moving parts", "Lubricate with oil or grease", "The surfaces slide past each other more easily, so less energy goes to the thermal store"],
          ["Air resistance on a vehicle", "A streamlined shape", "The air pushes back less, so less energy goes to the thermal store of the air"],
          ["Conduction through walls and roofs", "Thermal insulation", "Materials with a low thermal conductivity slow the transfer"],
        ] },
        { t: "sub", h: "Conduction and thermal conductivity" },
        { t: "p", h: "Energy is transferred through a solid by <strong>conduction</strong>, from the hotter side to the colder side. A material with a <strong>higher thermal conductivity</strong> transfers energy <strong>faster</strong>. Metals have a high thermal conductivity. Air, wool and plastic foam have a low thermal conductivity, so they are good <strong>thermal insulators</strong>. Many insulators work because they trap air." },
        { t: "key", h: "A house cools <strong>more slowly</strong> if its walls are <strong>thicker</strong> and have a <strong>lower thermal conductivity</strong>." },
      ],
      lab: { title: 'Practical: cooling cups <span class="triple-tag">Triple only</span>', aside: "Your teacher pours the hot water.", blocks: [
        { t: "fig", h: F.cups(["none", "newspaper", "bubble wrap", "cotton wool", "felt"]), cls: "fig-small" },
        { t: "p", h: "<strong>Question:</strong> which material is the best thermal insulator?" },
        { t: "vars", rows: [["Independent variable", "", "the insulating material"], ["Dependent variable", "", "the temperature drop in 10 minutes"], ["Control variables (two)", "", "volume of water, starting temperature, type of cup, thickness of wrapping, lid"]] },
        { t: "safety", items: ["The water is about 60 °C: hot enough to scald. Do not move the cups.", "Stand the cups in a tray. Report any spill straight away."] },
        { t: "lab", blocks: [
          { t: "q", p: "Record your results.", table: { head: ["Material", "Start / °C", "After 10 min / °C", "Drop / °C"], rows: [["none", null, null, null], ["newspaper", null, null, null], ["bubble wrap", null, null, null], ["cotton wool", null, null, null], ["felt", null, null, null]], ans: [[null, "60", "47", "13"], [null, "60", "52", "8"], [null, "60", "54", "6"], [null, "60", "55", "5"], [null, "60", "53", "7"]] } },
          { t: "q", p: R`The material is a categoric variable, so draw a {{line graph|bar chart*}} of the temperature drop. Draw it here.`, box: 52, grid: true, a: "Bar chart: one bar per material, temperature drop / °C on the y-axis." },
          { t: "q", p: "Complete the conclusion.", fill: [R`The best insulator is the material whose cup had the [[smallest|biggest / smallest]] temperature drop.`, R`In my results, the best insulator was [[cotton wool (sample)|none / newspaper / bubble wrap / cotton wool / felt]].`, R`Good insulators trap air, which has a [[low|high / low]] thermal conductivity.`] },
        ] },
      ] },
      try: [
        { t: "q", p: "Draw a line from each unwanted energy transfer to the best way to reduce it.", match: { left: ["Friction in a bike chain", "Air resistance on a lorry", "Conduction through a loft", "Draughts under a door"], right: ["a draught excluder", "oil on the chain", "a streamlined shape", "thick loft insulation"], a: [[0, 1], [1, 2], [2, 3], [3, 0]] } },
        { t: "q", p: "Draw a ring around the correct answer in each box.", ring: [["Copper has a high thermal conductivity, so copper is a good", ["thermal insulator", "thermal conductor"], 1], ["Making a wall twice as thick makes the house cool", ["faster", "more slowly"], 1]] },
        { t: "q", say: ["Lily", "Insulation keeps the cold out."], p: "Explain what insulation really does.", lines: 2, a: "Insulation slows down the transfer of energy from the warm inside of the house to the colder outside." },
        { t: "q", type: "Design", p: "<strong>Design an Eco House.</strong> For each numbered place on the house, name a feature that reduces energy transfer out of the house, and explain why it works. Where they fit, use the words <em>thermal conductivity</em> or <em>thickness</em>. For gaps, explain how the feature stops warm air escaping.", fig: F.house(), figCls: "fig-mid", after: [{ t: "compare", head: ["Place", "Feature", "Why it works"], rows: [
          ["1 Roof", { a: "thick loft insulation" }, { a: "a thick layer of trapped air with a low thermal conductivity" }],
          ["2 Walls", { a: "cavity wall insulation" }, { a: "foam fills the gap; it has a low thermal conductivity" }],
          ["3 Window", { a: "double glazing" }, { a: "trapped air or gas between the panes has a low thermal conductivity" }],
          ["4 Floor", { a: "carpet or floor insulation" }, { a: "low thermal conductivity slows conduction into the ground" }],
          ["5 Door", { a: "draught excluder / insulated door" }, { a: "stops warm air escaping through gaps" }],
        ] }] },
      ],
      exam: [
        { tip: "Say what the lubricant does to friction, and then what that does to the energy.", p: "Explain how oiling a bicycle chain reduces the energy wasted when you cycle.", marks: 2, lines: 2, a: "Oil reduces friction between the moving parts (1), so less energy is transferred to the thermal store of the chain and surroundings (1)." },
        { p: "Two houses have walls of the same thickness. The bricks of house A have a higher thermal conductivity than the bricks of house B. Which house cools faster? Explain.", marks: 2, lines: 2, a: "House A (1): a higher thermal conductivity means energy is transferred through the walls by conduction faster (1)." },
      ],
      order: ["doNow", "learn", "lab", "try", "exam", "revise"],
      summary: ["Dissipated (“wasted”) energy usually goes to the thermal store of the surroundings.", "Lubrication reduces friction, so less energy is dissipated.", "Higher thermal conductivity = faster energy transfer by conduction.", "Thicker walls with lower thermal conductivity make a house cool more slowly.", "Many insulators trap air."],
      recall: [["Where does dissipated energy usually end up?", "In the thermal store of the surroundings."], ["How does lubrication reduce wasted energy?", "It reduces friction, so less energy is transferred to the thermal store."], ["What does a high thermal conductivity mean?", "The material transfers energy by conduction quickly."], ["Give two ways to make a house cool more slowly.", "Thicker walls; materials with a lower thermal conductivity (insulation)."]],
      cando: ["explain what dissipated means", "explain how lubrication reduces wasted energy", "explain the effect of thermal conductivity and wall thickness", "design and justify ways to insulate a home"],
    },

    // ============================================================ 9
    {
      n: 9, accent: "violet", week: "5", title: "Efficiency",
      spec: "AQA Physics 4.1.2.2; Combined Science 6.1.2.2",
      mapLine: "Efficiency from energy or power, decimals and percentages, Sankey diagrams",
      big: "An old filament lamp and an LED give out the same light. Why does the LED cost much less to run?",
      goals: ["calculate efficiency as a decimal and as a percentage", "explain why efficiency can never be more than 100%", "find the useful output or the total input from the efficiency", "draw and read Sankey diagrams", "describe ways to increase efficiency"],
      keywords: ["efficiency", "useful output", "wasted output", "total input", "Sankey diagram"],
      story: { title: "Lamps", text: "A filament lamp transfers only about 1 joule in every 10 by light. The rest heats the room. An LED transfers several times more of its energy by light, so it needs much less energy for the same brightness." },
      doNow: [
        ["A 2000 W heater is on for 30 s. Calculate the energy transferred.", "E = P t = 2000 × 30 = 60 000 J"],
        ["Where does most wasted energy end up?", "The thermal store of the surroundings."],
        ["Give one way to reduce friction in a machine.", "Lubricate it with oil or grease."],
      ],
      learnTitle: "How much is useful?",
      learn: [
        { t: "p", h: "<strong>Efficiency</strong> tells you what fraction of the energy put into a device is transferred usefully. The rest is wasted, usually dissipated to the thermal store of the surroundings." },
        { t: "eq", eq: R`\(\text{efficiency} = \dfrac{\text{useful output energy transfer}}{\text{total input energy transfer}}\)`, words: "Energy in joules (J). Efficiency has no unit.", units: R`Answer as a decimal (for example 0.80), or multiply by 100 for a percentage (80%).`, re: R`Rearranged: useful output = efficiency × total input, and \(\text{total input} = \dfrac{\text{useful output}}{\text{efficiency}}\)`, tri: { top: "useful", bottom: ["eff.", "total"] }, stack: true },
        { t: "eq", eq: R`\(\text{efficiency} = \dfrac{\text{useful power output}}{\text{total power input}}\)`, stack: true, words: "The same idea, using power in watts (W).", units: "Use whichever pair the question gives you: energies or powers." },
        { t: "key", h: "Efficiency is <strong>never more than 1</strong> (100%). If your answer is bigger than 1, you have divided the wrong way round. To use a percentage in a calculation, change it to a decimal first: 25% = 0.25." },
        { t: "worked", q: "A motor is supplied with 500 J and transfers 400 J to the kinetic store of its load. Calculate its efficiency.", steps: [["Know", "useful = 400 J, total = 500 J"], ["Equation", R`\(\text{efficiency} = \dfrac{\text{useful}}{\text{total}}\)`], ["Substitute", R`\(\text{efficiency} = \dfrac{400}{500}\)`], ["Answer", "0.80, or 80%"]],
          yt: { q: "A lamp is supplied with 60 J and transfers 12 J by light. Calculate its efficiency.", steps: [["Know", "useful = 12 J, total = 60 J"], ["Equation", R`\(\text{efficiency} = \dfrac{\text{useful}}{\text{total}}\)`], ["Substitute", R`\(\text{efficiency} = \dfrac{12}{60}\)`], ["Answer", "0.20, or 20%"]] } },
        { t: "worked", q: "A 60 W lamp has an efficiency of 25%. Calculate its useful power output.", steps: [["Convert", "efficiency = 25% = 0.25"], ["Rearrange", "useful = efficiency × total"], ["Substitute", "useful = 0.25 × 60"], ["Answer", "15 W"]],
          yt: { q: "A motor is 0.80 efficient. It transfers 400 J usefully. Calculate the total energy supplied.", steps: [["Know", "efficiency = 0.80, useful = 400 J"], ["Rearrange", R`\(\text{total} = \dfrac{\text{useful}}{\text{efficiency}}\)`], ["Substitute", R`\(\text{total} = \dfrac{400}{0.80}\)`], ["Answer", "500 J"]] } },
        { t: "sub", h: "Sankey diagrams" },
        { t: "split", left: [{ t: "steps", items: ["The <strong>width</strong> of each arrow shows the amount of energy.", "Useful energy goes <strong>straight on</strong>. Wasted energy <strong>bends away</strong>, usually downwards.", "Input = useful + wasted. Here: 100 J = 20 J + 80 J.", "Efficiency = 20 ÷ 100 = 0.20 (20%)."] }], right: [{ t: "fig", h: F.sankey({ input: 100, useful: 20, wasted: 80, s: 1.4, useLabel: "by light", wasteLabel: "heating the room" }), cap: "A lamp: 100 J in, 20 J by light." }] },
        { t: "sub", h: "Increasing efficiency" },
        { t: "p", h: "Reduce the wasted energy: <strong>lubricate</strong> moving parts (less friction), <strong>streamline</strong> vehicles (less air resistance), <strong>insulate</strong> hot things (less energy transferred by heating), and choose devices that waste less, such as LEDs instead of filament lamps." },
      ],
      lab: { title: "Practical: how efficient is a bounce?", aside: "Filming the bounce against the ruler makes it much easier to read.", blocks: [
        { t: "split", cls: "narrow-fig", left: [
          { t: "steps", items: ["Measure the mass in kg. Drop the ball from 1.00 m.", "Measure the height of the first bounce.", "Repeat three times and find the mean bounce height.", "Repeat with a different ball."] },
          { t: "p", h: R`Measure both heights from the bottom of the ball. Use \(E_p = m\,g\,h\) with \(g = 9.8\) N/kg for each energy; then \(\text{efficiency} = \dfrac{E_{p2}}{E_{p1}}\). Round only at the end.` },
        ], right: [{ t: "fig", h: F.bounce() }] },
        { t: "lab", blocks: [
          { t: "q", p: "Record your measurements.", table: { head: ["Ball", "Mass / kg", "Drop / m", "Bounce 1 / m", "Bounce 2 / m", "Bounce 3 / m", "Mean / m"], rows: [[null, null, "1.00", null, null, null, null], [null, null, "1.00", null, null, null, null]], ans: [["A", "0.10", null, "0.66", "0.64", "0.65", "0.65"], ["B", "0.10", null, "0.80", "0.78", "0.82", "0.80"]] } },
          { t: "q", p: "Calculate the two energies, then divide useful output by input.", table: { head: ["Ball", R`Input \(E_{p1}\) / J`, R`Useful \(E_{p2}\) / J`, "Efficiency"], rows: [[null, null, null, null], [null, null, null, null]], ans: [["A", R`\(0.10 \times 9.8 \times 1.00 = 0.98\)`, R`\(0.10 \times 9.8 \times 0.65 = 0.637\)`, "0.65 (65%)"], ["B", R`\(0.10 \times 9.8 \times 1.00 = 0.98\)`, R`\(0.10 \times 9.8 \times 0.80 = 0.784\)`, "0.80 (80%)"]] } },
          { t: "q", p: "Where did the rest of the energy go?", lines: 2, a: "To the thermal store of the ball and the floor, and some was transferred by sound (ending in the thermal store of the surroundings)." },
        ] },
      ] },
      try: [
        { t: "q", p: "Draw a ring around the correct answer in each box.", ring: [["An efficiency of 1.4 is", ["possible", "impossible"], 1], ["Efficiency has the unit", ["joules", "watts", "no unit"], 2]] },
        { t: "q", p: "This is the Sankey diagram for an electric motor. Calculate its efficiency.", fig: F.sankey({ input: 200, useful: 50, wasted: 150, s: 0.8, useLabel: "kinetic", wasteLabel: "thermal" }), figCls: "fig-small", frame: frame3, frameA: [R`\(\text{efficiency} = \dfrac{\text{useful}}{\text{total}}\)`, R`\(\text{efficiency} = \dfrac{50}{200}\)`, "0.25 (25%)"] },
        { t: "q", p: "A kettle is supplied with 2000 J. It transfers 1800 J to the thermal store of the water, and 200 J heats the kettle and the room. Draw its Sankey diagram. Let 1 square = 100 J.", box: 56, grid: true, a: "Input arrow 20 squares wide; useful arrow 18 squares wide straight on (water); wasted arrow 2 squares wide bending down (kettle and room)." },
        { t: "q", p: "Complete the table. Show your working underneath.", table: { head: ["Device", "Total input", "Useful output", "Efficiency"], rows: [["TV", "200 J", "60 J", null], ["Electric motor", "1000 J", null, "0.75"], ["Solar panel", null, "30 W", "0.15"]], ans: [[null, null, null, "0.30 (30%)"], [null, null, "750 J", null], [null, "200 W", null, null]] }, box: 24, grid: true },
        { t: "q", p: "Complete the sentences. The choices are after each gap.", fill: [R`Oiling the gears of a machine [[increases|increases / decreases]] its efficiency, because less energy is transferred by [[friction|friction / light]].`, R`An LED is [[more|more / less]] efficient than a filament lamp, because [[less|more / less]] energy is wasted heating the room.`] },
      ],
      exam: [
        { tip: "Check: is your efficiency less than 1 (100%)?", p: "A 1200 W hair dryer has a useful power output of 1080 W. Calculate its efficiency as a percentage.", marks: 3, frame: frame3, frameA: [R`\(\text{efficiency} = \dfrac{\text{useful power output}}{\text{total power input}}\)`, R`\(\dfrac{1080}{1200} = 0.90\) (1)(1)`, "90% (1)"] },
        { p: "Explain why an LED is more efficient than a filament lamp.", marks: 2, lines: 2, a: "An LED wastes less energy heating the surroundings (1), so a bigger fraction of the input energy is transferred usefully by light (1)." },
      ],
      summary: [R`\(\text{efficiency} = \dfrac{\text{useful output}}{\text{total input}}\), using energy or power.`, "As a decimal (at most 1) or a percentage (at most 100%). No unit.", "useful = efficiency × total; total = useful ÷ efficiency.", "Sankey diagrams: arrow width shows energy; wasted energy bends away.", "Higher: lubricate, streamline, insulate to increase efficiency."],
      recall: [["Write the equation for efficiency using energy.", "efficiency = useful output energy transfer ÷ total input energy transfer"], ["A device transfers 30 J usefully from 120 J. What is its efficiency?", "0.25 (25%)"], ["Why can efficiency never be more than 100%?", "Energy cannot be created: the useful output can never be more than the input."], ["On a Sankey diagram, what does the width of an arrow show?", "The amount of energy."]],
      cando: ["calculate efficiency as a decimal and a percentage", "find the useful output or the total input", "draw and read a Sankey diagram", "describe ways to increase efficiency"],
    },
  ];

  window.UNIT_LESSONS = (window.UNIT_LESSONS || []).concat(lessons);
})();
