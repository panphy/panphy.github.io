/* Lessons 1-2 of the Year 9 Energy: Stores and Transfers workbook (assets/workbook.js).
   Maths is LaTeX between \( and \); text is written with String.raw (R`…`) so backslashes stay.
   In sentences: [[answer|a / b / c]] is a blank followed by its options; {{a|b*|c}} is an AQA-style
   ring box with * on the answer. `a` holds the answer shown only in the answer edition.
   Block and question types are documented in workbook.js. All questions are original. */
(function () {
  "use strict";

  const R = String.raw;
  const F = window.EnergyFigures;
  const A = new URLSearchParams(location.search).has("answers");
  const frame3 = [["Equation"], ["Substitute"], ["Answer", "unit:"]];
  const frame4 = [["Convert"], ["Equation"], ["Substitute"], ["Answer", "unit:"]];
  const frameRe = [["Equation"], ["Rearrange"], ["Substitute"], ["Answer", "unit:"]];

  const lessons = [
    // ============================================================ 1
    {
      n: 1, accent: "spark", week: "1", title: "Energy stores and systems",
      spec: "AQA Physics 4.1.1.1; Combined Science 6.1.1.1",
      mapLine: "The energy stores, four ways to transfer energy, systems",
      big: "A skateboarder rolls down one side of a ramp and up the other, but never quite gets back to the starting height. Where did the energy go?",
      goals: ["name the energy stores and give an example of each", "name the four ways energy is transferred", "explain what a system is", "describe the energy transfers when something changes"],
      keywords: ["energy store", "transfer", "system", "closed system", "joule (J)"],
      kit: "This booklet, a pencil and a ruler.",
      doNow: [
        ["Name something that has energy. How can you tell?", "For example, a moving car (it is moving) or a hot drink (it is hot). Any sensible answer."],
        [R`Energy is measured in [[joules|joules / newtons / metres]].`, "joules (J)"],
        [R`Rub your hands together. They get [[warmer|warmer / colder]]. Why?`, "Warmer: rubbing (friction) transfers energy to the thermal store of your hands."],
      ],
      learnTitle: "Stores and transfers",
      learn: [
        { t: "p", h: "Energy is never made and never used up. It is <strong>stored</strong>, and it is <strong>transferred</strong> (moved) from one store to another. Energy is measured in <strong>joules (J)</strong>." },
        { t: "sub", h: "The five main energy stores" },
        { t: "compare", head: ["Store", "Energy is stored because…", "Example"], rows: [
          ["Kinetic", "the object is moving", "a rolling football"],
          ["Gravitational potential", "the object is raised up", "a book on a high shelf"],
          ["Elastic potential", "the object is stretched or squashed", "a stretched spring, a drawn bow"],
          ["Thermal", "the object is hot", "a cup of tea"],
          ["Chemical", "of the substances it is made of", "food, fuel, a battery"],
        ] },
        { t: "p", h: "You may also meet the <strong>magnetic</strong> store (two magnets held apart), the <strong>electrostatic</strong> store (a charged balloon) and the <strong>nuclear</strong> store (uranium fuel), but GCSE questions rarely use them." },
        { t: "sub", h: "Four ways to transfer energy" },
        { t: "compare", head: ["Transferred…", "What happens", "Example"], rows: [
          ["mechanically", "a force moves something", "pushing a trolley"],
          ["electrically", "a current flows", "a battery lighting a lamp"],
          ["by heating", "a hotter object warms a colder one", "a hob heating a pan"],
          ["by waves", "a wave carries it: light, infrared (both called radiation) or sound", "the Sun warming your face; a loudspeaker"],
        ] },
        { t: "key", h: "<strong>Stores hold energy. Transfers move it.</strong> Light, sound and electricity are <strong>not</strong> stores: they are ways energy travels from one store to another." },
        { t: "sub", h: "Systems" },
        { t: "p", h: "A <strong>system</strong> is the object, or group of objects, that we choose to study. In a <strong>closed system</strong>, no energy gets in or out, so the <strong>total</strong> energy stays the same. The energy only moves between stores." },
        { t: "sub", h: "Describe any change in three steps" },
        { t: "steps", items: ["Which store <strong>empties</strong>?", "Which store <strong>fills</strong>?", "<strong>How</strong> is the energy transferred: mechanically, electrically, by heating or by waves?"] },
        { t: "model", title: "Example: a car braking", h: "The kinetic store of the car empties. The thermal store of the brakes fills. Friction is a force, so the energy is transferred mechanically. <strong>Write:</strong> “Energy is transferred mechanically from the kinetic store of the car to the thermal store of the brakes.”" },
      ],
      try: [
        { t: "q", p: "Draw a line from each store to its example.", match: { left: ["Kinetic", "Gravitational potential", "Elastic potential", "Chemical", "Thermal"], right: ["a stretched bow", "a hot bath", "a rolling ball", "a battery", "a book on a high shelf"], a: [[0, 2], [1, 4], [2, 0], [3, 3], [4, 1]] } },
        { t: "q", p: "Draw a ring around the correct answer in each box.", ring: [
          ["Light is", ["an energy store", "a way energy is transferred"], 1],
          ["A battery stores energy in its", ["chemical store", "kinetic store", "thermal store"], 0],
          ["At the top of its flight, a ball has most energy in its", ["kinetic store", "gravitational potential store"], 1],
        ] },
        { t: "q", p: "The pictures tell a story. For each picture, write the store that <strong>empties</strong> and the store that <strong>fills</strong>. Choose from the words under each gap.", after: [
          { t: "html", h: `<div class="story-strip">${F.storyStrip()}</div>` },
          { t: "compare", head: ["Picture", "Store that empties", "Store that fills"], rows: [
            ["A Eating", "chemical (in the food)", "chemical (in the body)"],
            ["B Cycling up", { opts: "chemical / kinetic", a: "chemical (body)" }, { opts: "gravitational potential / elastic potential", a: "gravitational potential (and thermal)" }],
            ["C Freewheeling down", { opts: "gravitational potential / chemical", a: "gravitational potential" }, { opts: "kinetic / nuclear", a: "kinetic" }],
            ["D Braking", { opts: "kinetic / thermal", a: "kinetic" }, { opts: "thermal / chemical", a: "thermal (brakes and surroundings)" }],
          ] },
        ] },
        { t: "q", type: "Supported", p: "Complete each sentence. The choices are after each gap.", fill: [
          R`A ball is thrown upwards. Energy is transferred from the [[kinetic|kinetic / chemical]] store to the [[gravitational potential|gravitational potential / thermal]] store.`,
          R`A fireplace warms a person. Energy is transferred by infrared waves from the [[chemical|chemical / kinetic]] store of the fuel to the [[thermal|thermal / kinetic]] store of the person.`,
          R`A child lands on a trampoline. Energy is transferred mechanically from the child's [[kinetic|kinetic / chemical]] store to the trampoline's [[elastic potential|elastic potential / thermal]] store.`,
        ] },
        { t: "q", type: "On your own", p: "A bungee jumper falls, and the cord stretches until the jumper stops at the bottom. Describe the energy transfers. Use the three steps.", lines: 3, a: "As the jumper falls, energy is transferred from the gravitational potential store of the jumper to the kinetic store. As the cord stretches, energy is transferred from the kinetic store to the elastic potential store of the cord." },
        { t: "q", say: ["Sam", "When the car stopped, its energy was used up."], p: "Explain what is wrong with what Sam says.", lines: 3, a: "Energy cannot be used up (destroyed). The energy in the car's kinetic store was transferred to the thermal store of the brakes and the surroundings." },
      ],
      exam: [
        { tip: "Name both stores and say which one empties and which one fills.", p: R`A student throws a ball straight up. Complete the sentence.`, marks: 2, fill: R`As the ball rises, energy is transferred from the [[kinetic|kinetic / chemical / thermal]] store of the ball to its [[gravitational potential|elastic potential / gravitational potential / nuclear]] store.` },
        { p: "What is the unit of energy? Tick <strong>one</strong> box.", marks: 1, mcq: { o: ["joule", "newton", "watt", "kilogram"], c: 0, cols: 4 } },
        { p: "A child lands on a trampoline. Describe the energy transfer as the mat and springs stretch and the child slows down.", marks: 2, lines: 2, a: "Energy is transferred mechanically from the kinetic store of the child (1) to the elastic potential store of the trampoline (1)." },
      ],
      summary: ["Energy is measured in <strong>joules (J)</strong>. It is never made or destroyed.", "Main stores: kinetic, gravitational potential, elastic potential, thermal, chemical.", "Transfers: mechanically, electrically, by heating, by waves.", "In a closed system, the total energy stays the same."],
      recall: [["What is the unit of energy?", "Joule (J)."], ["Name four energy stores.", "Any four of: kinetic, gravitational potential, elastic potential, thermal, chemical."], ["Is light a store or a way of transferring energy?", "A way of transferring energy (by waves)."], ["What is a closed system?", "A system that no energy enters or leaves, so its total energy stays the same."]],
      cando: ["name the energy stores", "name the four ways energy is transferred", "explain what a system is", "describe energy transfers using “from … to …”"],
    },

    // ============================================================ 2
    {
      n: 2, accent: "cyan", week: "1", title: "The kinetic store",
      spec: "AQA Physics 4.1.1.2; Combined Science 6.1.1.2",
      mapLine: R`\(E_k = \tfrac{1}{2}\,m\,v^2\); grams to kilograms; double the speed, four times the energy`,
      big: "A car travels twice as fast. Does it have twice as much energy in its kinetic store, or more?",
      goals: ["say what the kinetic store depends on", R`calculate kinetic energy with \(E_k = \tfrac{1}{2}\,m\,v^2\)`, "convert grams to kilograms", "explain why doubling the speed gives four times the energy"],
      keywords: ["kinetic store", "mass (kg)", "speed (m/s)", "squared"],
      kit: "Calculator. Practical: trolley, 1.00 m track, stopwatch, balance.",
      doNow: [
        ["Which store does a moving object have energy in?", "The kinetic store."],
        ["A car brakes. Which store fills?", "The thermal store (of the brakes and the surroundings)."],
        [R`Light is [[a way energy is transferred|a store / a way energy is transferred]].`, "A way energy is transferred (by waves)."],
      ],
      learnTitle: "Energy in a moving object",
      learn: [
        { t: "p", h: "Anything that moves has energy in its <strong>kinetic store</strong>. The more <strong>mass</strong> it has, and the faster it moves, the more energy it has." },
        { t: "eq", eq: R`\(E_k = \tfrac{1}{2}\,m\,v^2\)`, words: "kinetic energy = 0.5 × mass × (speed)²", units: R`\(E_k\) in joules (J), \(m\) in kilograms (kg), \(v\) in metres per second (m/s)`, re: "Only the speed is squared. In this unit you use the equation to calculate the energy." },
        { t: "key", h: R`<strong>Square the speed first:</strong> \(v^2 = v \times v\). Then multiply by the mass and by 0.5.` },
        { t: "worked", q: "A 1200 kg car moves at 15 m/s. Calculate the energy in its kinetic store.", steps: [["Know", "m = 1200 kg, v = 15 m/s"], ["Equation", R`\(E_k = \tfrac{1}{2}\,m\,v^2\)`], ["Substitute", R`\(E_k = 0.5 \times 1200 \times 15^2\)`], ["Answer", R`\(E_k = 135\,000\) J`]],
          yt: { q: "A 60 kg runner moves at 5.0 m/s. Calculate the energy in their kinetic store.", steps: [["Know", "m = 60 kg, v = 5.0 m/s"], ["Equation", R`\(E_k = \tfrac{1}{2}\,m\,v^2\)`], ["Substitute", R`\(E_k = 0.5 \times 60 \times 5.0^2\)`], ["Answer", R`\(E_k = 750\) J`]] } },
        { t: "sub", h: "Mass in grams? Convert first" },
        { t: "p", h: R`The mass must be in kilograms. Divide grams by 1000: \(450\ \text{g} = 0.450\ \text{kg}\). A 450 g football kicked at 20 m/s has \(E_k = 0.5 \times 0.450 \times 20^2 = 90\) J.` },
        { t: "sub", h: "Double the speed, four times the energy" },
        { t: "compare", head: ["Speed of a 1200 kg car", R`\(v^2\)`, R`\(E_k\)`], rows: [["15 m/s", "225", "135 000 J"], ["30 m/s (2 × faster)", "900", "540 000 J (4 × more)"], ["45 m/s (3 × faster)", "2025", "1 215 000 J (9 × more)"]] },
        { t: "p", h: R`Twice the speed gives \(2^2 = 4\) times the energy. Three times the speed gives \(3^2 = 9\) times. This is why a crash at high speed does so much more damage, and why the brakes must transfer so much more energy to stop the car. Doubling the <strong>mass</strong> only doubles the energy, because the mass is not squared.` },
      ],
      try: [
        { t: "q", p: "Draw a ring around the correct answer in each box.", ring: [
          ["Doubling the mass makes the kinetic energy", ["stay the same", "2 times bigger", "4 times bigger"], 1],
          ["Doubling the speed makes the kinetic energy", ["stay the same", "2 times bigger", "4 times bigger"], 2],
        ] },
        { t: "q", type: "Supported", p: "A 2.0 kg ball rolls at 3.0 m/s. Calculate the energy in its kinetic store.", frame: frame3, frameA: [R`\(E_k = \tfrac{1}{2}\,m\,v^2\)`, R`\(E_k = 0.5 \times 2.0 \times 3.0^2\)`, "9.0 J"] },
        { t: "q", type: "Supported", p: "A 450 g football is kicked at 20 m/s. Calculate the energy in its kinetic store. <em>Convert the mass first!</em>", frame: frame4, frameA: ["m = 450 ÷ 1000 = 0.450 kg", R`\(E_k = \tfrac{1}{2}\,m\,v^2\)`, R`\(E_k = 0.5 \times 0.450 \times 20^2\)`, "90 J"] },
        { t: "q", p: "Complete the table. Show your working underneath.", table: { head: ["Object", "Mass", "Speed", R`\(E_k\) / J`], rows: [["Lorry", "30 000 kg", "2.0 m/s", null], ["Cyclist and bike", "80 kg", "6.0 m/s", null], ["Tennis ball", "58 g", "50 m/s", null], ["Bullet", "10 g", "400 m/s", null]], ans: [[null, null, null, "60 000"], [null, null, null, "1440"], [null, null, null, "72.5"], [null, null, null, "800"]] }, box: 26, grid: true },
        { t: "q", type: "On your own", p: "A 0.16 kg cricket ball is bowled at 40 m/s. Calculate the energy in its kinetic store.", lines: 2, a: R`\(E_k = 0.5 \times 0.16 \times 40^2 = 128\) J` },
        { t: "q", type: "Challenge", p: "A car speeds up from 10 m/s to 30 m/s. How many times bigger is the energy in its kinetic store? Explain without calculating the energy.", lines: 2, a: R`9 times bigger. The speed is 3 times bigger, and the speed is squared: \(3^2 = 9\).` },
        { t: "q", say: ["Ava", "At 4 m/s my bike has twice as much kinetic energy as at 2 m/s."], p: "Explain what is wrong with what Ava says.", lines: 2, a: R`The speed is squared, so doubling the speed gives \(2^2 = 4\) times as much kinetic energy, not twice as much.` },
      ],
      lab: { title: "Measure the energy of a moving trolley", aside: "Work in a group of three: one pushes, one times, one records.", blocks: [
        { t: "lab", blocks: [
          { t: "steps", items: ["Measure the trolley's mass on the balance in grams. Convert it to kilograms.", "Mark a 1.00 m section of the track with tape.", "Give the trolley a gentle push so it rolls through the section. Time how long it takes to cross the 1.00 m.", "Repeat twice more with the same push, and find the mean time.", "Calculate the speed, then the kinetic energy."] },
          { t: "q", p: "Record your results.", table: { head: ["Mass / g", "Mass / kg", "Time 1 / s", "Time 2 / s", "Time 3 / s", "Mean time / s"], rows: [[null, null, null, null, null, null]], ans: [["500", "0.500", "1.62", "1.55", "1.59", "1.59"]] } },
          { t: "q", p: R`Calculate the speed: \(\text{speed} = \dfrac{\text{distance}}{\text{time}}\).`, frame: frame3, frameA: [R`\(v = \dfrac{s}{t}\)`, R`\(v = \dfrac{1.00}{1.59}\)`, "0.63 m/s (sample)"] },
          { t: "q", p: "Calculate the energy in the trolley's kinetic store.", frame: frame3, frameA: [R`\(E_k = \tfrac{1}{2}\,m\,v^2\)`, R`\(E_k = 0.5 \times 0.500 \times 0.63^2\)`, "0.10 J (sample)"] },
          { t: "q", p: R`Which measurement has the biggest effect on your answer? {{the mass|the time*}} Explain why.`, lines: 2, a: "The time: the speed is worked out from it, and the speed is squared, so any error in the time is made bigger." },
        ] },
      ] },
      exam: [
        { tip: "Write the equation, then substitute, then give the answer with its unit.", p: "A cyclist and bike have a total mass of 70 kg and move at 8.0 m/s. Calculate the energy in their kinetic store.", marks: 2, frame: frame3, frameA: [R`\(E_k = \tfrac{1}{2}\,m\,v^2\)`, R`\(E_k = 0.5 \times 70 \times 8.0^2\) (1)`, "2240 J (1)"] },
        { p: R`Car A and car B have the same mass. Car B moves twice as fast as car A. Complete the sentence.`, marks: 2, fill: R`Car B has [[4|2 / 4 / 8]] times as much energy in its kinetic store as car A, because in the equation the speed is {{halved|squared*|doubled}}.` },
      ],
      summary: [R`\(E_k = \tfrac{1}{2}\,m\,v^2\): mass in kg, speed in m/s, energy in J.`, "Convert grams to kilograms: divide by 1000.", "Only the speed is squared: 2 × the speed gives 4 × the energy.", "2 × the mass gives 2 × the energy."],
      recall: [["What two things does the kinetic store depend on?", "Mass and speed."], ["Write the equation for kinetic energy.", R`\(E_k = \tfrac{1}{2}\,m\,v^2\)`], ["Convert 250 g to kilograms.", "0.250 kg"], ["The speed triples. What happens to the kinetic energy?", "It becomes 9 times bigger."]],
      cando: [R`calculate kinetic energy with \(E_k = \tfrac{1}{2}\,m\,v^2\)`, "convert grams to kilograms", "explain why doubling the speed gives four times the energy"],
    },
  ];

  window.UNIT_LESSONS = (window.UNIT_LESSONS || []).concat(lessons);
})();
