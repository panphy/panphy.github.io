/* Lessons 1-4 of the Year 10 Particle Model of Matter workbook: states of matter, gas pressure,
   density and the density required practical. Rendered by workbook.js, which lists the block
   types. Maths is LaTeX between \( and \); text is String.raw so backslashes survive.
   [[answer|a / b / c]] is a blank with its options; {{a|b*|c}} is a ring box (* = answer). */
(function () {
  "use strict";

  const R = String.raw;
  const F = window.ParticleFigures;
  const frame3 = [["Equation"], ["Substitute"], ["Answer", "unit:"]];
  const frame4 = [["Convert"], ["Equation"], ["Substitute"], ["Answer", "unit:"]];
  const frameRe = [["Equation"], ["Rearrange"], ["Substitute"], ["Answer", "unit:"]];

  const lessons = [
    // ============================================================ 1
    {
      n: 1, accent: "cyan", slides: "3–7", title: "Solids, liquids and gases",
      spec: "AQA Physics 4.3.1.1, 4.3.1.2; Combined Science 6.3.1.1, 6.3.1.2",
      mapLine: "Particle diagrams, arrangement and motion, changes of state, mass is conserved",
      big: "An ice cube, a puddle and the steam from a kettle are all water. What is different about them?",
      goals: ["draw particle diagrams for a solid, a liquid and a gas", "describe how the particles are arranged and how they move", "name the six changes of state", "explain why mass is conserved when a substance changes state"],
      keywords: ["particle", "solid", "liquid", "gas", "change of state", "physical change", "conserved"],
      kit: "Demonstration: two sealed syringes (one of air, one of water); a beaker of ice on a balance, covered with cling film.",
      doNow: [
        ["Name the three states of matter.", "Solid, liquid and gas."],
        ["Name the change of state when ice turns to water.", "Melting."],
        ["Name the instrument used to measure mass.", "A balance."],
      ],
      learnTitle: "One model, three states",
      learn: [
        { t: "p", h: "Everything is made of tiny <strong>particles</strong> (atoms or molecules), far too small to see. The <strong>particle model</strong> says that a solid, a liquid and a gas of the same substance contain the <em>same particles</em>. Only two things differ: how the particles are <strong>arranged</strong> and how they <strong>move</strong>." },
        { t: "fig", cls: "fig-wide", h: F.states(), cap: "Each circle is one particle. In a particle diagram, draw the circles the same size in all three states." },
        { t: "compare", head: ["", "Solid", "Liquid", "Gas"], rows: [
          ["Arrangement", "very close together, in a regular pattern", "close together, in a random arrangement", "far apart, in a random arrangement"],
          ["Motion", "vibrate about fixed positions", "move around, sliding past each other", "move quickly in all directions"],
          ["Shape and volume", "fixed shape, fixed volume", "takes the shape of its container, fixed volume", "fills its container"],
          ["Can it be squashed?", "no: the particles are already touching", "no: the particles are already touching", "yes: there is empty space between the particles"],
        ] },
        { t: "tip", h: "Draw a solid with the particles <strong>touching</strong>, in neat rows. Draw a liquid with the particles still <strong>touching</strong>, but in no pattern. Leaving gaps in a liquid is the most common mistake in the exam." },
        { t: "sub", h: "Changes of state" },
        { t: "fig", cls: "fig-wide", h: F.changes(), cap: "Orange arrows: the substance is heated. Blue arrows: it is cooled." },
        { t: "p", h: "A liquid can turn into a gas in two ways. <strong>Boiling</strong> happens only at the boiling point, with bubbles all through the liquid. <strong>Evaporating</strong> happens at any temperature, from the surface only. <strong>Sublimating</strong> is when a solid turns straight into a gas: solid carbon dioxide (“dry ice”) does this." },
        { t: "sub", h: "Mass is conserved" },
        { t: "key", h: "When a substance changes state, <strong>no particles are added or taken away</strong>. They are only rearranged. So the mass stays the same: 50 g of ice melts to make 50 g of water." },
        { t: "p", h: "A change of state is a <strong>physical change</strong>, not a chemical change. No new substance is made. If you reverse the change, the material gets its original properties back: melt ice and freeze it again, and you have ice again." },
      ],
      try: [
        { t: "q", p: "The diagrams show the particles in a solid, a liquid and a gas. Write the state under each letter.", fig: F.states({ labels: false }), figCls: "fig-wide",
          fill: "A is a [[solid|solid / liquid / gas]]. B is a [[liquid|solid / liquid / gas]]. C is a [[gas|solid / liquid / gas]]." },
        { t: "q", p: "Draw a ring around the correct answer in each box.", ring: [
          ["The particles in a solid", ["move quickly in all directions", "vibrate about fixed positions", "slide past each other"], 1],
          ["The particles in a liquid are", ["far apart", "in a regular pattern", "close together"], 2],
          ["A gas can be squashed because its particles", ["are far apart", "are soft", "are small"], 0],
        ] },
        { t: "q", type: "Supported", p: "Complete the sentences.", fill: [
          "When a solid is heated enough, it turns into a liquid. This is called [[melting|melting / freezing / condensing]].",
          "When a gas is cooled enough, it turns into a liquid. This is called [[condensing|boiling / condensing / sublimating]].",
          "When a solid turns straight into a gas, it is called [[sublimating|evaporating / freezing / sublimating]].",
        ] },
        { t: "q", p: "Give two differences between boiling and evaporating.", lines: 3, a: "Boiling happens only at the boiling point; evaporating happens at any temperature. Boiling happens throughout the liquid (bubbles); evaporating happens only at the surface." },
        { t: "q", p: "A sealed bag holds 120 g of water. It is put in a freezer until all the water is ice. State the mass of the ice, and explain your answer.", lines: 3, a: "120 g. The number of particles has not changed: none were added or removed, they were only rearranged." },
        { t: "q", type: "Challenge", p: "Liquid water can be poured, but a block of ice cannot. Use the particle model to explain why.", lines: 3, a: "In a liquid the particles can move around and slide past each other, so the liquid flows. In a solid the particles are held in fixed positions and can only vibrate." },
      ],
      lab: { title: "See it: squash it, melt it", aside: "Your teacher will demonstrate. Write what you see.", blocks: [
        { t: "lab", blocks: [
          { t: "p", h: "<strong>Part 1.</strong> Your teacher blocks the end of a syringe of air and pushes the plunger. Then the same with a syringe of water." },
          { t: "q", p: "Complete the table.", table: { head: ["In the syringe", "Can it be squashed?", "What this tells you about the particles"], rows: [["air (a gas)", null, null], ["water (a liquid)", null, null]], ans: [[null, "yes, easily", "there is a lot of empty space between them"], [null, "no", "they are already touching"]] } },
          { t: "p", h: "<strong>Part 2.</strong> A covered beaker of ice is put on a balance. The mass is read again when all the ice has melted." },
          { t: "q", p: "Record the two readings and write a conclusion.", table: { head: ["", "Mass of beaker and contents / g"], rows: [["all ice", null], ["all water", null]], ans: [[null, "186.4"], [null, "186.4"]] }, lines: 2, a: "The mass does not change when the ice melts, because the number of particles is the same." },
          { t: "q", p: "Why must the beaker be covered?", lines: 2, a: "So that no water evaporates and leaves the beaker, and no water from the air condenses on the cold ice." },
        ] },
      ] },
      exam: [
        { tip: "“Compare” means say something about <strong>both</strong>. Give the arrangement and the motion for each state.", p: "Compare the arrangement and the motion of the particles in a solid with those in a gas.", marks: 4, lines: 6,
          a: "Solid: particles very close together (1) in a regular pattern, vibrating about fixed positions (1). Gas: particles far apart (1), moving quickly in random directions (1)." },
        { p: "A student melts 25 g of solid wax in a sealed tube.<br>(a) State the mass of the liquid wax.<br>(b) Explain why melting is a physical change.", marks: 3, lines: 4,
          a: "(a) 25 g (1). (b) No new substance is made (1); the wax recovers its original properties if the change is reversed, by cooling it (1)." },
      ],
      summary: ["Solid: close together, regular pattern, vibrating about fixed positions.", "Liquid: close together, random arrangement, moving past each other.", "Gas: far apart, random arrangement, moving quickly in all directions.", "Changes of state are physical changes. The mass is conserved because the number of particles stays the same."],
      recall: [["Describe the arrangement of the particles in a liquid.", "Close together, in a random arrangement."], ["Describe the motion of the particles in a solid.", "They vibrate about fixed positions."], ["Name the change of state from gas to liquid.", "Condensing (condensation)."], ["40 g of water boils away completely. What mass of steam is made?", "40 g"]],
      cando: ["draw and recognise particle diagrams for a solid, a liquid and a gas", "describe the arrangement and motion of the particles in each state", "name the changes of state", "explain why mass is conserved in a change of state", "explain why a change of state is a physical change"],
    },

    // ============================================================ 2
    {
      n: 2, accent: "copper", slides: "8–12", title: "Gas particles and pressure",
      spec: "AQA Physics 4.3.3.1; Combined Science 6.3.3.1",
      mapLine: "Random motion, temperature and kinetic energy, what causes gas pressure, heating a gas at constant volume",
      big: "An aerosol can says “Do not expose to temperatures above 50 °C”. What could go wrong?",
      goals: ["describe the motion of the molecules in a gas", "link the temperature of a gas to the average kinetic energy of its molecules", "explain how a gas pushes on the walls of its container", "explain why heating a gas at constant volume increases its pressure"],
      keywords: ["random motion", "kinetic energy", "temperature", "pressure", "collision", "constant volume"],
      kit: "Demonstration: a sealed round-bottomed flask joined to a pressure gauge, a large beaker or water bath, a kettle, a thermometer.",
      doNow: [
        ["Describe the arrangement of the particles in a gas.", "Far apart, in a random arrangement."],
        ["Why can a gas be squashed easily?", "There is a lot of empty space between its particles."],
        [R`Which energy store does a moving object have? Write the equation for it.`, R`The kinetic store. \(E_k = \tfrac{1}{2}\,m\,v^2\)`],
      ],
      learnTitle: "A gas never keeps still",
      learn: [
        { t: "p", h: "The molecules of a gas are in <strong>constant random motion</strong>. “Random” means that they move in all directions and at a range of speeds. They travel in straight lines until they hit each other or a wall, then bounce off." },
        { t: "sub", h: "Temperature and kinetic energy" },
        { t: "key", h: "The <strong>temperature</strong> of a gas is related to the <strong>average kinetic energy</strong> of its molecules. Heat a gas and its molecules move faster: the hotter the gas, the greater their average kinetic energy." },
        { t: "p", h: "We say <em>average</em> because at any moment some molecules are moving fast and some slowly." },
        { t: "sub", h: "What causes gas pressure?" },
        { t: "split", cls: "narrow-fig", left: [
          { t: "steps", items: ["The molecules <strong>collide</strong> with the walls of the container.", "Each collision gives the wall a tiny <strong>push</strong> (a force).", "There are billions of collisions every second, on every part of the wall.", "Together they make a steady force on each square metre of wall: the <strong>pressure</strong> of the gas."] },
        ], right: [{ t: "fig", h: F.gasBox() }] },
        { t: "sub", h: "Heating a gas at constant volume" },
        { t: "p", h: "“Constant volume” means that the container is sealed and cannot get bigger, like a steel can. Follow the chain of reasoning:" },
        { t: "fig", cls: "fig-wide", h: F.gasBox({ pair: true }) },
        { t: "steps", items: ["The gas is heated, so the average kinetic energy of the molecules increases: they move <strong>faster</strong>.", "They hit the walls <strong>more often</strong>.", "Each collision pushes on the wall with a <strong>bigger force</strong>.", "So the <strong>pressure increases</strong>."] },
        { t: "tip", h: "The molecules do <strong>not</strong> get bigger when a gas is heated, and they do not “expand”. They move faster. Never write that particles expand." },
        { t: "p", h: "Cooling does the opposite: the molecules slow down, hit the walls less often and less hard, and the pressure falls." },
      ],
      try: [
        { t: "q", p: "Draw a ring around the correct answer in each box.", ring: [
          ["The molecules of a gas move", ["in circles", "in random directions", "all in the same direction"], 1],
          ["When a gas is heated, its molecules", ["get bigger", "move faster", "move closer together"], 1],
          ["The temperature of a gas is related to the molecules'", ["average kinetic energy", "size", "mass"], 0],
        ] },
        { t: "q", type: "Supported", p: "Complete the sentences.", fill: [
          "Gas pressure is caused by molecules [[colliding with|colliding with / sticking to / passing through]] the walls of the container.",
          "When a gas in a sealed can is cooled, the pressure [[decreases|increases / decreases / stays the same]].",
        ] },
        { t: "q", p: "A gas in a sealed steel can is heated. Put the statements in order, 1 to 4, to explain what happens.", order: [[3, "Each collision with the wall exerts a bigger force."], [1, "The average kinetic energy of the molecules increases, so they move faster."], [4, "The pressure of the gas increases."], [2, "The molecules hit the walls more often."]],
          a: "Order: 3, 1, 4, 2 (reading down the list)." },
        { t: "q", p: "A car is driven for a long time on a hot day. Explain why the pressure of the air in its tyres increases. Assume the volume of a tyre does not change.", lines: 4, a: "The air in the tyre gets hotter, so the molecules move faster (their average kinetic energy increases). They collide with the tyre wall more often and with more force, so the pressure increases." },
        { t: "q", type: "Challenge", p: "A sealed bottle of air is put in a freezer. Mia says, “The pressure falls because some of the air particles disappear.” Explain why Mia is wrong, and give the correct reason.", lines: 4, a: "The bottle is sealed, so the number of particles stays the same. The pressure falls because the molecules move more slowly: they hit the walls less often and with less force." },
      ],
      lab: { title: "See it: pressure and temperature", aside: "Your teacher will demonstrate. The flask is sealed, so its volume stays the same.", blocks: [
        { t: "lab", blocks: [
          { t: "p", h: "A sealed flask of air is joined to a pressure gauge and put in water at different temperatures. Record the readings." },
          { t: "q", p: "Record the results.", table: { head: ["Temperature of the air / °C", "Pressure / kPa"], rows: [[null, null], [null, null], [null, null], [null, null]], ans: [["20", "101"], ["40", "108"], ["60", "115"], ["80", "122"]] } },
          { t: "q", p: "Describe the pattern in the results.", lines: 2, a: "As the temperature of the gas increases, its pressure increases." },
          { t: "q", p: "Which two things were kept the same in this demonstration?", lines: 2, a: "The volume of the gas (the flask is rigid) and the mass (or number of particles) of gas, because the flask is sealed." },
        ] },
      ] },
      exam: [
        { tip: "A 3-mark “explain” about gas pressure needs three linked steps: <strong>faster</strong>, <strong>collisions</strong>, <strong>pressure</strong>.", p: "An aerosol can is left in sunlight and gets hot. Explain, in terms of particles, why the pressure of the gas in the can increases.", marks: 3, lines: 5,
          a: "The molecules gain kinetic energy and move faster (1). They collide with the walls of the can more often (1) and with a greater force, so the pressure increases (1)." },
        { p: "Describe the motion of the molecules in a gas.", marks: 2, lines: 2, a: "They are in constant motion (1), in random directions (and with a range of speeds) (1)." },
      ],
      quick: { slide: 12, covers: "Lessons 1–2", items: [
        ["The particles are close together, in a random arrangement. Which state is this?", "Liquid."],
        ["How do the particles in a solid move?", "They vibrate about fixed positions."],
        ["A gas turns into a liquid. Name the change of state.", "Condensing."],
        ["80 g of wax melts. What is the mass of the liquid wax?", "80 g: the number of particles is the same."],
        ["What causes the pressure of a gas?", "Its molecules colliding with the walls."],
        ["A sealed can of gas is cooled. What happens to the pressure?", "It decreases: the molecules move more slowly."],
      ] },
      summary: ["Gas molecules are in constant random motion.", "The temperature of a gas is related to the average kinetic energy of its molecules.", "Gas pressure is caused by the molecules colliding with the walls.", "Heating a gas at constant volume increases its pressure: faster molecules hit the walls more often and harder."],
      recall: [["What does “random motion” mean?", "The molecules move in all directions, at a range of speeds."], ["What causes the pressure of a gas?", "Its molecules colliding with the walls of the container."], ["A gas is cooled at constant volume. What happens to its pressure?", "It decreases."], ["What is the temperature of a gas related to?", "The average kinetic energy of its molecules."]],
      cando: ["describe the random motion of gas molecules", "link temperature to the average kinetic energy of the molecules", "explain how collisions with the walls cause pressure", "explain why heating a gas at constant volume increases its pressure"],
    },

    // ============================================================ 3
    {
      n: 3, accent: "spark", slides: "13–17", title: "Density",
      spec: "AQA Physics 4.3.1.1; Combined Science 6.3.1.1",
      mapLine: R`\(\rho = \dfrac{m}{V}\), units, density and the particle model, finding a mass or a volume`,
      big: "A gold bar the size of a carton of milk is too heavy for most people to lift with one hand. Why?",
      goals: [R`calculate density with \(\rho = \dfrac{m}{V}\)`, "use the units kg/m³ and g/cm³", "explain differences in density using the particle model", "rearrange the equation to find a mass or a volume"],
      keywords: ["density", "mass", "volume", "kilogram per cubic metre (kg/m³)", "rho (ρ)"],
      kit: "Per pair: calculator. Demonstration: blocks of the same size made of different materials (wood, aluminium, steel) to pass round.",
      doNow: [
        ["Describe the arrangement of the particles in a solid.", "Very close together, in a regular pattern."],
        ["A gas in a sealed can is heated. What happens to its pressure?", "It increases."],
        ["Convert 250 g to kilograms.", "0.250 kg"],
      ],
      learnTitle: "How much mass is packed in?",
      learn: [
        { t: "p", h: "Pick up a block of steel and a block of wood of the same size. The steel has much more mass, because more mass is packed into the same volume. We say that steel has a greater <strong>density</strong>." },
        { t: "key", h: "<strong>Density</strong> is the mass of each unit of volume: the mass of 1 m³ (or of 1 cm³) of the material." },
        { t: "eq", eq: R`\(\rho = \dfrac{m}{V}\)`, words: "density = mass ÷ volume", units: R`\(\rho\) in kg/m³, \(m\) in kg, \(V\) in m³`, re: R`Rearranged: \(m = \rho\,V\) and \(V = \dfrac{m}{\rho}\). The symbol \(\rho\) is the Greek letter rho.`, tri: { top: "m", bottom: ["ρ", "V"] } },
        { t: "follow", slide: 14, q: "A block of aluminium has a mass of 5400 kg and a volume of 2.0 m³. Calculate its density.", steps: [["Equation", R`\(\rho = \dfrac{m}{V}\)`], ["Substitute", R`\(\rho = \dfrac{5400}{2.0}\)`], ["Answer", R`\(\rho = 2700\) kg/m³`]],
          yt: { q: "A tank holds 3.0 m³ of water. The mass of the water is 3000 kg. Calculate the density of water.", steps: [["Equation", R`\(\rho = \dfrac{m}{V}\)`], ["Substitute", R`\(\rho = \dfrac{3000}{3.0}\)`], ["Answer", R`\(\rho = 1000\) kg/m³`]] } },
        { t: "sub", h: "Two sets of units" },
        { t: "p", h: "In the lab it is easier to measure mass in grams and volume in cubic centimetres. Then the density is in <strong>g/cm³</strong>. Use one set of units or the other; never mix them." },
        { t: "compare", head: ["Material", "Density in g/cm³", "Density in kg/m³"], rows: [["air", "0.0012", "1.2"], ["ice", "0.92", "920"], ["water", "1.0", "1000"], ["aluminium", "2.7", "2700"], ["iron", "7.9", "7900"], ["gold", "19.3", "19 300"]] },
        { t: "tip", h: "To change g/cm³ into kg/m³, <strong>multiply by 1000</strong>. To change kg/m³ into g/cm³, divide by 1000. Water is the one to remember: 1.0 g/cm³ = 1000 kg/m³." },
        { t: "sub", h: "Density and the particle model" },
        { t: "p", h: "In a solid and in a liquid the particles are close together, so a lot of mass fits into each cubic centimetre: solids and liquids have high densities. In a gas the particles are far apart, with empty space between them, so a gas has a very low density. Water is about 800 times denser than air." },
        { t: "p", h: "Most substances are a little denser as a solid than as a liquid, because the particles are packed slightly closer. Water is unusual: ice is <em>less</em> dense than liquid water, which is why ice floats." },
        { t: "sub", h: "Finding the mass or the volume" },
        { t: "follow", slide: 17, q: "The density of iron is 7900 kg/m³. Calculate the mass of 0.020 m³ of iron.", steps: [["Equation", R`\(\rho = \dfrac{m}{V}\)`], ["Rearrange", R`\(m = \rho\,V\)`], ["Substitute", R`\(m = 7900 \times 0.020\)`], ["Answer", "m = 158 kg"]],
          yt: { q: "The density of aluminium is 2700 kg/m³. Calculate the mass of 0.050 m³ of aluminium.", steps: [["Equation", R`\(\rho = \dfrac{m}{V}\)`], ["Rearrange", R`\(m = \rho\,V\)`], ["Substitute", R`\(m = 2700 \times 0.050\)`], ["Answer", "m = 135 kg"]] } },
        { t: "follow", slide: 17, q: "The density of gold is 19.3 g/cm³. Calculate the volume of a 965 g gold bar.", steps: [["Equation", R`\(\rho = \dfrac{m}{V}\)`], ["Rearrange", R`\(V = \dfrac{m}{\rho}\)`], ["Substitute", R`\(V = \dfrac{965}{19.3}\)`], ["Answer", "V = 50 cm³"]],
          yt: { q: "The density of aluminium is 2.7 g/cm³. Calculate the volume of a 540 g aluminium block.", steps: [["Equation", R`\(\rho = \dfrac{m}{V}\)`], ["Rearrange", R`\(V = \dfrac{m}{\rho}\)`], ["Substitute", R`\(V = \dfrac{540}{2.7}\)`], ["Answer", "V = 200 cm³"]] } },
      ],
      try: [
        { t: "q", p: "Draw a ring around the correct answer in each box.", ring: [
          ["The unit of density is", ["kg", "kg/m³", "m³/kg"], 1],
          ["A gas has a low density because its particles are", ["very light", "far apart", "moving quickly"], 1],
        ] },
        { t: "q", type: "Supported", p: "A stone has a mass of 240 g and a volume of 80 cm³. Calculate its density in g/cm³.", frame: frame3, frameA: [R`\(\rho = \dfrac{m}{V}\)`, R`\(\rho = \dfrac{240}{80}\)`, "3.0 g/cm³"] },
        { t: "q", type: "Supported", p: "A concrete beam has a mass of 4800 kg and a volume of 2.0 m³. Calculate the density of the concrete.", frame: frame3, frameA: [R`\(\rho = \dfrac{m}{V}\)`, R`\(\rho = \dfrac{4800}{2.0}\)`, "2400 kg/m³"] },
        { t: "q", p: "Complete the table. Show your working underneath.", table: { head: ["Object", "Mass", "Volume", "Density"], rows: [["Wooden block", "360 g", "600 cm³", null], ["Copper pipe", null, "50 cm³", "8.9 g/cm³"], ["Air in a room", "60 kg", null, "1.2 kg/m³"], ["Petrol in a tank", "36 kg", "0.050 m³", null]], ans: [[null, null, null, "0.60 g/cm³"], [null, "445 g", null, null], [null, null, "50 m³", null], [null, null, null, "720 kg/m³"]] }, box: 30, grid: true },
        { t: "q", p: "The density of sea water is 1.03 g/cm³. Write this density in kg/m³.", lines: 1, a: "1.03 × 1000 = 1030 kg/m³" },
        { t: "q", p: "Explain, using the particle model, why 1 cm³ of liquid water has a much greater mass than 1 cm³ of steam.", lines: 3, a: "In liquid water the particles are close together, but in steam they are far apart. So 1 cm³ of water contains many more particles, and more mass, than 1 cm³ of steam." },
        { t: "q", type: "Challenge", p: "A crown has a mass of 1.9 kg and a volume of 120 cm³. The density of gold is 19.3 g/cm³. Is the crown pure gold? Show your working. <em>Convert the mass to grams first.</em>", lines: 4, a: R`m = 1900 g. \(\rho = \dfrac{m}{V} = \dfrac{1900}{120} = 15.8\) g/cm³. This is less than 19.3 g/cm³, so the crown is not pure gold.` },
      ],
      exam: [
        { tip: "Write the equation in symbols first, then the numbers. A correct equation often earns a mark even if the arithmetic goes wrong.", p: "A block of ice has a mass of 2760 kg and a volume of 3.0 m³. Calculate the density of ice.", marks: 2, frame: frame3, frameA: [R`\(\rho = \dfrac{m}{V}\)`, R`\(\rho = \dfrac{2760}{3.0}\) (1)`, "920 kg/m³ (1)"] },
        { p: "A fuel tank holds 0.060 m³ of diesel. The density of diesel is 850 kg/m³. Calculate the mass of the diesel.", marks: 3, frame: frameRe, frameA: [R`\(\rho = \dfrac{m}{V}\)`, R`\(m = \rho\,V\) (1)`, R`\(m = 850 \times 0.060\) (1)`, "51 kg (1)"] },
        { p: "Explain why a gas has a much lower density than a solid.", marks: 2, lines: 3, a: "The particles in a gas are much further apart than in a solid (1), so there is less mass (fewer particles) in the same volume (1)." },
      ],
      summary: [R`Density is the mass per unit volume: \(\rho = \dfrac{m}{V}\).`, "Units: kg/m³, or g/cm³ in the lab. 1 g/cm³ = 1000 kg/m³.", R`Rearranged: \(m = \rho\,V\) and \(V = \dfrac{m}{\rho}\).`, "Solids and liquids are dense because their particles are close together. Gases have low densities because their particles are far apart."],
      recall: [["Write the equation for density.", R`\(\rho = \dfrac{m}{V}\)`], ["State the unit of density.", "kg/m³ (or g/cm³)"], ["What is the density of water in kg/m³?", "1000 kg/m³"], ["A block has a mass of 80 g and a volume of 20 cm³. What is its density?", "4.0 g/cm³"]],
      cando: [R`calculate density with \(\rho = \dfrac{m}{V}\)`, "use kg/m³ and g/cm³ and convert between them", "rearrange the equation to find a mass or a volume", "explain differences in density using the particle model"],
    },

    // ============================================================ 4
    {
      n: 4, accent: "leaf", slides: "18–24", title: "Measuring density (required practical)",
      spec: "AQA Physics 4.3.1.1, required practical 5; Combined Science 6.3.1.1, required practical 17",
      mapLine: "Regular solids, irregular solids by displacement, liquids; resolution and sources of error",
      big: "A jeweller is offered a lump of “gold” with an awkward shape. How could its density be measured?",
      goals: ["measure the density of a regular solid from its dimensions", "measure the volume of an irregular solid by displacement", "measure the density of a liquid", "choose instruments and explain how to make the measurements accurate"],
      keywords: ["displacement", "measuring cylinder", "meniscus", "resolution", "vernier callipers", "balance"],
      kit: "Per group: balance (0.1 g or better), 30 cm ruler, vernier callipers, regular blocks, irregular objects (stones, modelling-clay lumps) on thread, 100 cm³ measuring cylinder, displacement can, beaker, water, a second liquid (salt water or cooking oil), paper towels.",
      doNow: [
        ["Write the equation for density.", R`\(\rho = \dfrac{m}{V}\)`],
        ["How many cubic centimetres are there in 1 millilitre?", "1 ml = 1 cm³"],
        ["How do you calculate the volume of a cuboid?", "volume = length × width × height"],
      ],
      learnTitle: "Two measurements, one calculation",
      learn: [
        { t: "p", h: R`To find a density you always need two measurements: the <strong>mass</strong>, from a balance, and the <strong>volume</strong>. Then \(\rho = \dfrac{m}{V}\). The mass is easy. The method for the volume depends on what you are measuring.` },
        { t: "compare", head: ["", "How to find the volume"], rows: [
          ["Regular solid (cube, cuboid)", "Measure its length, width and height with a ruler or vernier callipers. Volume = length × width × height."],
          ["Irregular solid (stone)", "<strong>Displacement.</strong> Lower it into water. The volume of water it pushes out of the way is equal to its own volume."],
          ["Liquid", "Pour it into a measuring cylinder and read the scale."],
        ] },
        { t: "split", left: [{ t: "fig", h: F.displacement(), cap: "Volume of stone = 68 − 50 = 18 cm³" }], right: [{ t: "fig", h: F.eurekaCan(), cap: "For an object too big for the cylinder" }] },
        { t: "sub", h: "Making it accurate" },
        { t: "list", items: [
          "Read a measuring cylinder at <strong>eye level</strong>, at the <strong>bottom of the meniscus</strong> (the curved surface of the liquid).",
          "<strong>Vernier callipers</strong> read to 0.1 mm or better; a ruler reads to 1 mm. The instrument with the smaller scale division has the better <strong>resolution</strong>.",
          "Measure the mass <strong>before</strong> the object gets wet: water on it would add to the mass.",
          "Check that the balance reads <strong>zero</strong> before you start.",
          "Lower the object gently on a thread so that no water splashes out, and tap away any air bubbles stuck to it.",
        ] },
        { t: "tip", h: "The width of a measuring cylinder matters. A narrow cylinder has scale lines further apart for each cm³, so you can read it more precisely. Use the narrowest one the object will fit into." },
      ],
      lab: { title: "Required practical: density", aside: "Wipe up spills at once. Carry glassware with two hands.", blocks: [
        { t: "safety", items: ["Water on the floor is a slip hazard: mop up spills straight away.", "Do not drop metal blocks: keep them in the middle of the bench.", "Report any broken glass to your teacher. Do not pick it up."] },
        { t: "lab", title: "Part A: regular solids", blocks: [
          { t: "steps", items: ["Measure the length, width and height of each block.", "Calculate its volume.", "Measure its mass on the balance.", "Calculate its density."] },
          { t: "q", p: "Record your results.", table: { cls: "wide", head: ["Material", "Length / cm", "Width / cm", "Height / cm", "Volume / cm³", "Mass / g", "Density / g/cm³"], rows: [[null, null, null, null, null, null, null], [null, null, null, null, null, null, null], [null, null, null, null, null, null, null]], ans: [["aluminium", "4.0", "3.0", "2.0", "24", "64.8", "2.7"], ["steel", "4.0", "2.0", "2.0", "16", "125.6", "7.9"], ["wood (oak)", "5.0", "4.0", "2.0", "40", "28.0", "0.70"]] } },
        ] },
        { t: "lab", title: "Part B: irregular solids", blocks: [
          { t: "steps", items: ["Measure the mass of the dry object.", "Half fill a measuring cylinder with water. Record the volume.", "Lower the object in on a thread until it is completely under water. Record the new volume.", "Volume of object = second volume − first volume. Calculate the density."] },
          { t: "q", p: "Record your results.", table: { cls: "wide", head: ["Object", "Mass / g", "Volume of water / cm³", "Volume of water and object / cm³", "Volume of object / cm³", "Density / g/cm³"], rows: [[null, null, null, null, null, null], [null, null, null, null, null, null]], ans: [["stone", "46.8", "50", "68", "18", "2.6"], ["clay lump", "27.0", "50", "65", "15", "1.8"]] } },
        ] },
        { t: "lab", title: "Part C: a liquid", blocks: [
          { t: "split", left: [{ t: "steps", items: ["Measure the mass of the empty measuring cylinder.", "Pour in about 50 cm³ of the liquid. Record its exact volume.", "Measure the mass of the cylinder and liquid.", "Mass of liquid = second mass − first mass. Calculate the density."] }], right: [{ t: "fig", h: F.liquidDensity() }] },
          { t: "q", p: "Record your results.", table: { cls: "wide", head: ["Liquid", "Mass of empty cylinder / g", "Mass of cylinder and liquid / g", "Mass of liquid / g", "Volume of liquid / cm³", "Density / g/cm³"], rows: [[null, null, null, null, null, null], [null, null, null, null, null, null]], ans: [["water", "62.0", "112.0", "50.0", "50", "1.00"], ["salt water", "62.0", "117.5", "55.5", "50", "1.11"]] } },
        ] },
      ] },
      try: [
        { t: "q", p: "Densities in g/cm³: oak 0.70, aluminium 2.7, iron and steel 7.9, copper 8.9. Suggest what each of your regular blocks is made of. Do your densities match exactly? Suggest one reason why not.", lines: 3, a: "Sample: 2.7 g/cm³ is aluminium and 7.9 g/cm³ is iron (steel). Small differences come from measuring the sides only to the nearest millimetre, or from blocks that are not perfect cuboids." },
        { t: "q", p: "Draw a ring around the correct answer in each box.", ring: [
          ["A measuring cylinder should be read at", ["the top of the meniscus", "the bottom of the meniscus", "the edge of the glass"], 1],
          ["Compared with a ruler, vernier callipers have", ["a better resolution", "a worse resolution", "the same resolution"], 0],
        ] },
        { t: "q", p: "A student measures the volume of a stone by displacement. An air bubble is stuck to the stone. Explain how this affects the density that the student calculates.", lines: 3, a: "The bubble pushes extra water out of the way, so the measured volume is too big. Density = mass ÷ volume, so the calculated density is too small." },
        { t: "q", type: "Challenge", p: "A cork floats, so it cannot be pushed under water by its own weight. Suggest how its volume could still be found by displacement.", lines: 3, a: "Push it just under the surface with a thin pin (or tie it to a small metal sinker whose volume has been measured, and subtract the sinker's volume)." },
      ],
      order: ["doNow", "learn", "lab", "try", "check", "exam", "revise"],
      exam: [
        { tip: "A 6-mark method is marked on <strong>whether someone could follow it</strong>. Name each instrument, say what it measures, and finish with the calculation.", p: "A student has a small, irregularly shaped stone. Describe a method the student could use to determine the density of the stone.", marks: 6, lines: 10,
          a: "Indicative content: measure the mass of the dry stone with a balance; part fill a measuring cylinder with water and record the volume; lower the stone in on a thread until fully submerged; record the new volume; volume of stone = difference between the two readings (or use a displacement can and collect the water); read the scale at eye level, at the bottom of the meniscus; density = mass ÷ volume; repeat and calculate a mean. Level 3 (5–6): a detailed, logically ordered method that would give a valid result." },
        { p: "A metal cube has sides of 2.0 cm and a mass of 71.2 g. Calculate the density of the metal in g/cm³.", marks: 3, frame: [["Volume"], ["Equation"], ["Substitute"], ["Answer", "unit:"]], frameA: [R`\(V = 2.0 \times 2.0 \times 2.0 = 8.0\) cm³ (1)`, R`\(\rho = \dfrac{m}{V}\)`, R`\(\rho = \dfrac{71.2}{8.0}\) (1)`, "8.9 g/cm³ (1)"] },
      ],
      quick: { slide: 23, covers: "Lessons 3–4", items: [
        ["A block has a mass of 150 g and a volume of 60 cm³. Calculate its density.", R`\(\rho = \dfrac{150}{60} = 2.5\) g/cm³`],
        ["Write 2.5 g/cm³ in kg/m³.", "2500 kg/m³"],
        ["A liquid has a density of 800 kg/m³. Calculate the mass of 0.50 m³ of it.", R`\(m = 800 \times 0.50 = 400\) kg`],
        ["Why is a gas much less dense than a liquid?", "Its particles are far apart, so there is less mass in each cm³."],
        ["The water level rises from 40 cm³ to 55 cm³. What is the volume of the object?", "15 cm³"],
        ["Where do you read the scale on a measuring cylinder?", "At the bottom of the meniscus, at eye level."],
      ] },
      summary: ["Density needs a mass (balance) and a volume.", "Regular solid: volume = length × width × height.", "Irregular solid: volume = volume of water displaced.", "Liquid: volume from a measuring cylinder; mass = mass of cylinder and liquid − mass of empty cylinder.", "Read the bottom of the meniscus at eye level."],
      recall: [["Name the method for finding the volume of an irregular object.", "Displacement."], ["Where on the meniscus do you read a measuring cylinder?", "At the bottom, at eye level."], ["How do you find the mass of a liquid in a measuring cylinder?", "Subtract the mass of the empty cylinder from the mass of the cylinder with the liquid."], ["Which has the better resolution: a ruler or vernier callipers?", "Vernier callipers."]],
      cando: ["measure the density of a regular solid", "use displacement to find the volume of an irregular solid", "measure the density of a liquid", "explain how to make the measurements accurate", "describe the method in a 6-mark answer"],
    },
  ];

  window.UNIT_LESSONS = (window.UNIT_LESSONS || []).concat(lessons);
  window.WB_FRAMES = { frame3, frame4, frameRe };
})();
