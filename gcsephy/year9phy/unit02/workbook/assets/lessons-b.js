/* Lessons 3-5 of the Year 9 Energy workbook. Format as in lessons-a.js. */
(function () {
  "use strict";

  const R = String.raw;
  const F = window.EnergyFigures;
  const frame3 = [["Equation"], ["Substitute"], ["Answer", "unit:"]];
  const frame4 = [["Convert"], ["Equation"], ["Substitute"], ["Answer", "unit:"]];
  const frameRe = [["Equation"], ["Rearrange"], ["Substitute"], ["Answer", "unit:"]];
  // Sample spring results used in Lesson 4: force / N, length / cm, extension / cm.
  const SPRING = [[0, "5.0", "0.0"], [1, "9.0", "4.0"], [2, "13.1", "8.1"], [3, "17.0", "12.0"], [4, "21.0", "16.0"], [5, "25.1", "20.1"], [6, "29.0", "24.0"], [7, "34.5", "29.5"]];

  const lessons = [
    // ============================================================ 3
    {
      n: 3, accent: "copper", week: "2", title: "The gravitational potential store",
      spec: "AQA Physics 4.1.1.2; Combined Science 6.1.1.2",
      mapLine: R`What \(g\) means, \(E_p = m\,g\,h\), height gained, finding \(h\) or \(m\)`,
      big: "Carrying a bag up the stairs is hard work. Where does that energy go, and can you get it back?",
      goals: [R`explain what \(g = 9.8\) N/kg means`, R`calculate energy with \(E_p = m\,g\,h\)`, "use the height gained", "rearrange to find a height or a mass"],
      keywords: ["gravitational potential store", "gravitational field strength", "newton (N)", "height gained"],
      story: { title: "Electric Mountain", text: "At Dinorwig in Wales, water is pumped up into a lake high on a mountain. When the country suddenly needs electricity, the water rushes down through turbines. The energy waits in the water's gravitational potential store until it is needed." },
      doNow: [
        [R`In \(E_k = \tfrac{1}{2}\,m\,v^2\), what does \(v\) stand for? Give its unit.`, "Speed, in metres per second (m/s)."],
        ["Convert 600 g to kilograms.", "0.600 kg"],
        ["A 2.0 kg ball moves at 4.0 m/s. Calculate its kinetic energy.", R`\(E_k = 0.5 \times 2.0 \times 4.0^2\)<br>\(E_k = 16\) J`],
      ],
      learnTitle: "Energy from height",
      learn: [
        { t: "p", h: "Lift an object up and you transfer energy to its <strong>gravitational potential store</strong>. Let it fall and the energy is transferred to its kinetic store. The heavier the object and the higher you lift it, the more energy it stores." },
        { t: "sub", h: R`What \(g\) means` },
        { t: "split", cls: "narrow-fig", left: [{ t: "key", h: R`On Earth, gravity pulls every kilogram down with a force of <strong>9.8 newtons</strong>. We write this as \(g = 9.8\) N/kg (newtons per kilogram). It is called the <strong>gravitational field strength</strong>. On the Moon, \(g = 1.6\) N/kg, so the same lift stores less energy there.` }], right: [{ t: "fig", h: F.shelf() }] },
        { t: "eq", eq: R`\(E_p = m\,g\,h\)`, words: "gravitational potential energy = mass × gravitational field strength × height", units: R`\(E_p\) in J, \(m\) in kg, \(g\) in N/kg, \(h\) in m`, re: R`Rearranged: \(h = \dfrac{E_p}{m\,g}\) and \(m = \dfrac{E_p}{g\,h}\)`, tri: { top: "E_p", bottom: ["m", "g", "h"] } },
        { t: "follow", slide: 21, q: "A 2.0 kg book is lifted onto a shelf 1.5 m high. Calculate the energy transferred to its gravitational potential store.", steps: [["Equation", R`\(E_p = m\,g\,h\)`], ["Substitute", R`\(E_p = 2.0 \times 9.8 \times 1.5\)`], ["Answer", R`\(E_p = 29.4\) J`]],
            yt: { q: "A 10 kg box is lifted onto a table 0.80 m high. Calculate the energy transferred to its gravitational potential store.", steps: [["Equation", R`\(E_p = m\,g\,h\)`], ["Substitute", R`\(E_p = 10 \times 9.8 \times 0.80\)`], ["Answer", R`\(E_p = 78.4\) J`]] } },
        { t: "sub", h: "Use the height gained" },
        { t: "split", left: [{ t: "p", h: R`Only the <strong>change</strong> in height matters. A hiker climbs from a car park 120 m above sea level to a summit 420 m above sea level. Use the height gained, the difference between the two heights, not the height of the summit.` }], right: [{ t: "fig", cls: "fig-small", h: F.hike() }] },
        { t: "follow", slide: 22, q: "A 55 kg hiker climbs from 120 m to 420 m above sea level. Calculate the energy transferred to the hiker's gravitational potential store.", steps: [["Height", R`\(h = 420 - 120 = 300\) m`], ["Equation", R`\(E_p = m\,g\,h\)`], ["Substitute", R`\(E_p = 55 \times 9.8 \times 300\)`], ["Answer", R`\(E_p = 161\,700\) J`]],
          yt: { q: "A 40 kg child climbs from 50 m to 250 m above sea level. Calculate the energy transferred to the child's gravitational potential store.", steps: [["Height", R`\(h = 250 - 50 = 200\) m`], ["Equation", R`\(E_p = m\,g\,h\)`], ["Substitute", R`\(E_p = 40 \times 9.8 \times 200\)`], ["Answer", R`\(E_p = 78\,400\) J`]] } },
        { t: "sub", h: "Finding the height or the mass" },
        { t: "follow", slide: 23, q: "A 60 kg climber gains 17 640 J in their gravitational potential store. How high did they climb?", steps: [["Equation", R`\(E_p = m\,g\,h\)`], ["Rearrange", R`\(h = \dfrac{E_p}{m\,g}\)`], ["Substitute", R`\(h = \dfrac{17\,640}{60 \times 9.8}\)`], ["Answer", "h = 30 m"]],
          yt: { q: "An 80 kg climber gains 15 680 J in their gravitational potential store. How high did they climb?", steps: [["Equation", R`\(E_p = m\,g\,h\)`], ["Rearrange", R`\(h = \dfrac{E_p}{m\,g}\)`], ["Substitute", R`\(h = \dfrac{15\,680}{80 \times 9.8}\)`], ["Answer", "h = 20 m"]] } },
        { t: "follow", slide: 24, q: "A crate is lifted 2.0 m and gains 392 J. Calculate its mass.", steps: [["Equation", R`\(E_p = m\,g\,h\)`], ["Rearrange", R`\(m = \dfrac{E_p}{g\,h}\)`], ["Substitute", R`\(m = \dfrac{392}{9.8 \times 2.0}\)`], ["Answer", "m = 20 kg"]],
          yt: { q: "A sack is lifted 3.0 m and gains 735 J. Calculate its mass.", steps: [["Equation", R`\(E_p = m\,g\,h\)`], ["Rearrange", R`\(m = \dfrac{E_p}{g\,h}\)`], ["Substitute", R`\(m = \dfrac{735}{9.8 \times 3.0}\)`], ["Answer", "m = 25 kg"]] } },
        { t: "tip", h: R`Work out the bottom of the fraction first (\(60 \times 9.8 = 588\)), then divide. Or put brackets round it on your calculator.` },
      ],
      try: [
        { t: "q", p: "Draw a ring around the correct answer in each box.", ring: [
          ["On the Moon, lifting a box 1 m stores", ["more energy than on Earth", "less energy than on Earth", "the same energy as on Earth"], 1],
          ["Lifting a box twice as high makes the energy stored", ["half as big", "twice as big", "four times as big"], 1],
        ] },
        { t: "q", type: "Supported", p: "A 0.50 kg ball is lifted 3.0 m. Calculate the energy transferred to its gravitational potential store.", frame: frame3, frameA: [R`\(E_p = m\,g\,h\)`, R`\(E_p = 0.50 \times 9.8 \times 3.0\)`, "14.7 J"] },
        { t: "q", type: "Supported", p: "A 600 g book is lifted 1.2 m onto a shelf. Calculate the energy transferred. <em>Convert the mass first!</em>", frame: frame4, frameA: ["m = 600 ÷ 1000 = 0.600 kg", R`\(E_p = m\,g\,h\)`, R`\(E_p = 0.600 \times 9.8 \times 1.2\)`, "7.1 J"] },
        { t: "q", p: R`Complete the table. Use \(g = 9.8\) N/kg. Show your working underneath.`, table: { head: ["Object", "Mass / kg", "Height gained / m", R`\(E_p\) / J`], rows: [["Child at the top of a slide", "30", "2.5", null], ["Rock on a cliff", "4.0", null, "196"], ["Crate on a lorry", null, "3.0", "882"], ["Lift with passengers", "800", "12", null]], ans: [[null, null, null, "735"], [null, null, "5.0", null], [null, "30", null, null], [null, null, null, "94 080"]] }, box: 30, grid: true },
        { t: "q", type: "Challenge", p: "A 50 kg student gains 4.9 kJ in their gravitational potential store climbing stairs. How high did they climb? <em>Convert kJ to J first.</em>", lines: 3, a: R`\(E_p = 4900\) J; \(h = \dfrac{E_p}{m\,g} = \dfrac{4900}{50 \times 9.8} = 10\) m` },
      ],
      lab: { title: "Activity: lift it", aside: "Work in pairs. Lift gently and keep the floor clear.", blocks: [
        { t: "lab", blocks: [
          { t: "p", h: "Choose three objects. Measure the mass of each and the height of the shelf or bench you lift it onto. Calculate the energy transferred to each gravitational potential store." },
          { t: "q", p: "Record and calculate.", table: { head: ["Object", "Mass / kg", "Height / m", R`\(E_p\) / J`], rows: [[null, null, null, null], [null, null, null, null], [null, null, null, null]], ans: [["textbook", "1.2", "0.90", "10.6"], ["water bottle", "0.50", "0.90", "4.4"], ["school bag", "4.0", "0.90", "35.3"]] } },
          { t: "q", p: "How high would you need to lift your lightest object so that it stores the same energy as your heaviest object?", lines: 2, a: R`Sample: \(h = \dfrac{E_p}{m\,g} = \dfrac{35.3}{0.50 \times 9.8} = 7.2\) m` },
        ] },
      ] },
      exam: [
        { tip: R`\(g\) is always given in the question. AQA uses 9.8 N/kg.`, p: "A crane lifts a 250 kg load through a height of 12 m. Calculate the energy transferred to the load's gravitational potential store. Gravitational field strength = 9.8 N/kg", marks: 2, frame: frame3, frameA: [R`\(E_p = m\,g\,h\)`, R`\(E_p = 250 \times 9.8 \times 12\) (1)`, "29 400 J (1)"] },
        { p: "A 0.40 kg ball gains 7.84 J in its gravitational potential store when it is thrown upwards. Calculate how high it rises. Gravitational field strength = 9.8 N/kg", marks: 3, frame: frameRe, frameA: [R`\(E_p = m\,g\,h\)`, R`\(h = \dfrac{E_p}{m\,g}\) (1)`, R`\(h = \dfrac{7.84}{0.40 \times 9.8}\) (1)`, "2.0 m (1)"] },
      ],
      quick: { slide: 25, items: [
        [R`What does \(g = 9.8\) N/kg mean?`, "Each kilogram is pulled down with 9.8 N."],
        ["A 5.0 kg mass is lifted 2.0 m. Calculate the energy transferred.", R`\(5.0 \times 9.8 \times 2.0 = 98\) J`],
        ["A 0.50 kg ball gains 24.5 J. Calculate the height it was lifted.", R`\(\dfrac{24.5}{0.50 \times 9.8} = 5.0\) m`],
        ["The same lift is done on the Moon. More, less or the same energy?", R`Less energy: \(g\) is smaller.`],
        [R`Something goes from 30 m to 80 m up. What is \(h\)?`, "50 m"],
        ["The height doubles. What happens to the energy?", R`It is multiplied by 2 (\(\times 2\)).`],
      ] },
      summary: [R`\(g = 9.8\) N/kg: gravity pulls each kilogram down with 9.8 N.`, R`\(E_p = m\,g\,h\), with the height gained in metres.`, R`Rearranged: \(h = \dfrac{E_p}{m\,g}\) and \(m = \dfrac{E_p}{g\,h}\).`, "Twice the height or twice the mass gives twice the energy."],
      recall: [[R`What does \(g = 9.8\) N/kg mean?`, "Gravity pulls each kilogram down with a force of 9.8 N."], ["Write the equation for gravitational potential energy.", R`\(E_p = m\,g\,h\)`], ["A 3.0 kg bag is lifted 1.0 m. How much energy does it gain?", "29.4 J"], [R`Rearrange \(E_p = m\,g\,h\) to find \(h\).`, R`\(h = \dfrac{E_p}{m\,g}\)`]],
      cando: [R`explain what \(g = 9.8\) N/kg means`, R`calculate \(E_p = m\,g\,h\) using the height gained`, R`rearrange \(E_p = m\,g\,h\) to find a height or a mass`],
    },

    // ============================================================ 4
    {
      n: 4, accent: "violet", week: "2", title: "Stretching springs",
      spec: "AQA Physics 4.5.3; Combined Science 6.5.3",
      mapLine: R`Two forces, elastic and inelastic, extension, \(F = k\,e\), two graphs`,
      big: "A trampoline spring stretches a lot when you land on it. A car's suspension spring hardly moves when you sit in the car. What makes one spring stiffer than another?",
      goals: ["explain why two forces are needed to stretch a spring", "tell elastic and inelastic deformation apart", R`use \(F = k\,e\) to find a force, a spring constant or an extension`, "plot two graphs of the same results and find the spring constant"],
      keywords: ["extension", "spring constant (N/m)", "elastic deformation", "inelastic deformation", "limit of proportionality"],
      kit: "Clamp stand, spring, mass hanger, 100 g masses, metre rule, pointer, safety goggles.",
      doNow: [
        [R`In \(E_p = m\,g\,h\), what does \(g\) stand for? Give its value on Earth.`, "Gravitational field strength: 9.8 N/kg."],
        ["A 2.0 kg box is lifted 3.0 m. Calculate the energy transferred to its gravitational potential store.", R`\(E_p = 2.0 \times 9.8 \times 3.0\)<br>\(E_p = 58.8\) J`],
        ["Convert 12 cm to metres.", "0.12 m"],
      ],
      learnTitle: "Stretch, squash, bend",
      learn: [
        { t: "split", cls: "narrow-fig", left: [
          { t: "p", h: "To stretch a spring and keep it still, you need <strong>two forces</strong>, one pulling each end. Here the clamp pulls the top up, and the load pulls the bottom down. With only one force, the spring would just move." },
          { t: "p", h: "<strong>Elastic deformation:</strong> the spring goes back to its original length when the force is removed.<br><strong>Inelastic deformation:</strong> the spring stays stretched." },
        ], right: [{ t: "fig", cls: "fig-small", h: F.twoForces() }] },
        { t: "sub", h: "Extension" },
        { t: "split", cls: "narrow-fig", left: [
          { t: "key", h: "<strong>extension = stretched length − original length</strong><br>Always record the <strong>extension</strong>, not the length." },
          { t: "p", h: "If a spring is 5.0 cm long with no load and 9.0 cm long with a load, its extension is 9.0 − 5.0 = 4.0 cm." },
        ], right: [{ t: "fig", cls: "fig-small", h: F.extension() }] },
        { t: "eq", eq: R`\(F = k\,e\)`, words: "force = spring constant × extension", units: R`\(F\) in newtons (N), \(k\) in newtons per metre (N/m), \(e\) in metres (m)`, re: R`Rearranged: \(k = \dfrac{F}{e}\) and \(e = \dfrac{F}{k}\)`, tri: { top: "F", bottom: ["k", "e"] } },
        { t: "p", h: R`The <strong>spring constant</strong> \(k\) tells you how stiff a spring is: the force needed for each metre of extension. A stiffer spring has a bigger \(k\). In Lesson 5 you will use \(k\) to work out how much energy a stretched spring stores.` },
        { t: "key", h: "<strong>Hooke's law:</strong> the extension of a spring is directly proportional to the force on it, as long as the <strong>limit of proportionality</strong> is not passed. Double the force, double the extension." },
        { t: "follow", slide: 29, q: "A spring stretches by 4.0 cm when a force of 2.0 N acts on it. Calculate its spring constant.", steps: [["Convert", R`\(e = 4.0\ \text{cm} = 0.040\ \text{m}\)`], ["Equation", R`\(F = k\,e\)`], ["Rearrange", R`\(k = \dfrac{F}{e}\)`], ["Substitute", R`\(k = \dfrac{2.0}{0.040}\)`], ["Answer", "k = 50 N/m"]],
          yt: { q: "A spring stretches by 15 cm when a force of 9.0 N acts on it. Calculate its spring constant.", steps: [["Convert", R`\(e = 15\ \text{cm} = 0.15\ \text{m}\)`], ["Equation", R`\(F = k\,e\)`], ["Rearrange", R`\(k = \dfrac{F}{e}\)`], ["Substitute", R`\(k = \dfrac{9.0}{0.15}\)`], ["Answer", "k = 60 N/m"]] } },
        { t: "sub", h: "Masses into forces at the bench" },
        { t: "key", h: "Gravity pulls each kilogram down with 9.8 N, so each 100 g pulls down with 0.98 N. At the bench we round this: <strong>each 100 g pulls down with about 1 N</strong>. A mass is not a force: always record the force in newtons." },
      ],
      lab: { title: "Practical: stretching a spring", aside: "Work in pairs. Stand up while you work.", blocks: [
        { t: "p", h: "Before you start, write the question this practical answers and name its variables." },
        { t: "vars", rows: [["Question", "", "How does the extension of a spring depend on the force pulling it?"], ["Independent variable", "", "the force (the load we add)"], ["Dependent variable", "", "the extension"], ["Control variable", "", "the same spring for every reading"]] },
        { t: "split", cls: "narrow-fig", left: [
          { t: "safety", items: ["Wear safety goggles: a spring that slips off can whip.", "Keep your feet out from under the masses.", "Add masses gently. Do not let them drop."] },
          { t: "steps", items: ["Line the pointer up with the metre rule. Record the original length.", "Add a 100 g mass. Record the new length.", "Repeat in 100 g steps up to 700 g.", "Work out the force and the extension for each load.", "Take the masses off one at a time. Does the spring go back to its original length?"] },
        ], right: [{ t: "fig", h: F.springRig(3) }] },
        { t: "lab", blocks: [
          { t: "q", p: "Record your results. The force is about 1 N for each 100 g.", table: { head: ["Mass added / g", "Force / N", "Length / cm", "Extension / cm"], rows: SPRING.map(([f]) => [String(f * 100), null, null, null]), ans: SPRING.map(([f, len, ext]) => [null, String(f), len, ext]) } },
        ] },
        { t: "lab", title: "Two graphs of the same results", blocks: [
          { t: "q", p: R`<strong>Graph 1: extension against force.</strong> The independent variable goes on the x-axis, so the x-axis shows {{force*|extension}}. Plot the points and draw a best-fit line. This graph answers our question: how does the extension change as the force increases?`, graph: { w: 140, h: 70, x: [0.5, 2], y: [5, 1], xLabel: "force / N", yLabel: "extension / cm", points: SPRING.map(([f, , e]) => [f, Number(e)]), fit: [[0, 0], [6.4, 25.6]] } },
          { t: "q", p: "<strong>Graph 2: force against extension.</strong> Swap the axes, so the dependent variable is now on the x-axis. We draw it this way because its gradient is the spring constant. Convert the extensions to metres first. Plot the points and draw a best-fit line.", graph: { w: 150, h: 80, x: [0.02, 1], y: [1, 1], xLabel: "extension / m", yLabel: "force / N", points: SPRING.map(([f, , e]) => [Number(e) / 100, f]), fit: [[0, 0], [0.26, 6.5]] } },
        ] },
        { t: "lab", title: "What the two graphs tell you", blocks: [
          { t: "q", p: R`Use graph 2 to find the spring constant. On graph 2, \(k\) is the gradient: \(k = \dfrac{\text{change in force}}{\text{change in extension}}\).`, frame: frame3, frameA: [R`\(k = \dfrac{\Delta F}{\Delta e}\)`, R`\(k = \dfrac{6.0}{0.240}\)`, "25 N/m (sample)"] },
          { t: "q", p: "Both graphs show the same results. Complete the table to explain the difference.", after: [{ t: "compare", head: ["", "y-axis", "x-axis", "The gradient tells you"], rows: [
            ["Graph 1", "extension", "force", { opts: "how stretchy the spring is / how stiff the spring is", a: "how stretchy the spring is (extension per newton)" }],
            ["Graph 2", "force", "extension", { opts: "how stretchy the spring is / how stiff the spring is", a: "how stiff the spring is: its spring constant k" }],
          ] }] },
          { t: "q", p: "A stiffer spring is tested. Draw a ring around the correct answer in each box.", ring: [["On graph 1, its line would be", ["steeper", "less steep"], 1], ["On graph 2, its line would be", ["steeper", "less steep"], 0]] },
          { t: "q", p: "Which reading is beyond the limit of proportionality? How can you tell from the graphs?", lines: 2, a: "The 700 g (7 N) reading: its point is off the straight line on both graphs." },
        ] },
      ] },
      try: [
        { t: "q", p: "Draw a ring around the correct answer in each box.", ring: [
          ["Elastic deformation means the object", ["goes back to its original shape", "stays stretched"], 0],
          ["A spring with a bigger spring constant is", ["stiffer", "easier to stretch"], 0],
        ] },
        { t: "q", type: "Supported", p: "A spring is 8.0 cm long. With a load on it, it is 12.5 cm long. Calculate the extension.", frame: [["Equation"], ["Substitute"], ["Answer", "unit:"]], frameA: ["extension = stretched length − original length", "extension = 12.5 − 8.0", "4.5 cm"] },
        { t: "q", type: "Supported", p: "Calculate the force needed to stretch a spring with k = 150 N/m by 0.040 m.", frame: frame3, frameA: [R`\(F = k\,e\)`, R`\(F = 150 \times 0.040\)`, "6.0 N"] },
        { t: "q", type: "On your own", p: "A force of 4.5 N stretches a spring by 15 cm. Calculate its spring constant.", lines: 3, a: R`\(e = 0.15\) m; \(k = \dfrac{F}{e} = \dfrac{4.5}{0.15} = 30\) N/m` },
        { t: "q", type: "On your own", p: "A spring with k = 50 N/m has a force of 3.0 N on it. Calculate the extension. Give your answer in cm.", lines: 3, a: R`\(e = \dfrac{F}{k} = \dfrac{3.0}{50} = 0.060\) m = 6.0 cm` },
      ],
      order: ["doNow", "learn", "lab", "try", "check", "exam", "revise"],
      exam: [
        { tip: "Convert the extension to metres before you divide.", p: "A force of 5.0 N stretches a spring by 25 cm. Calculate the spring constant of the spring.", marks: 3, frame: frame4, frameA: ["e = 25 cm = 0.25 m (1)", R`\(k = \dfrac{F}{e}\)`, R`\(k = \dfrac{5.0}{0.25}\) (1)`, "20 N/m (1)"] },
        { p: "Describe what happens to the extension of a spring when the force on it is doubled. Assume the limit of proportionality is not passed.", marks: 2, lines: 2, a: "The extension doubles (1), because extension is directly proportional to force (1)." },
      ],
      quick: { slide: 35, items: [
        ["A spring is 6.0 cm long, then 9.5 cm long. What is the extension?", "3.5 cm"],
        [R`A 200 N/m spring has \(e = 0.050\) m. Calculate the force.`, R`\(200 \times 0.050 = 10\) N`],
        [R`3.0 N stretches a spring by 10 cm. Calculate \(k\).`, R`\(\dfrac{3.0}{0.10} = 30\) N/m`],
        ["A 40 N/m spring has a 2.0 N force on it. Calculate the extension.", R`\(\dfrac{2.0}{40} = 0.050\) m, or 5.0 cm`],
        ["An object stays stretched when the force is removed. What is this called?", "Inelastic deformation."],
        ["On a force–extension graph, what does the gradient give?", R`The spring constant \(k\).`],
      ] },
      summary: ["Two forces are needed to stretch, squash or bend an object.", "Extension = stretched length − original length.", R`\(F = k\,e\): \(k\) in N/m, \(e\) in metres.`, R`On a force–extension graph (force on the y-axis), the gradient is \(k\).`, "Hooke's law holds up to the limit of proportionality."],
      recall: [["What is the extension of a spring?", "Its stretched length minus its original length."], ["Write the equation linking force, spring constant and extension.", R`\(F = k\,e\)`], ["What is the unit of spring constant?", "Newtons per metre (N/m)."], ["What does inelastic deformation mean?", "The object does not go back to its original shape when the force is removed."]],
      cando: ["explain why two forces are needed to stretch a spring", "calculate an extension from two lengths", R`use \(F = k\,e\) and its rearrangements`, "plot both graphs and find k from the gradient"],
    },

    // ============================================================ 5
    {
      n: 5, accent: "leaf", week: "3", title: "The elastic potential store",
      spec: "AQA Physics 4.1.1.2, 4.5.3; Combined Science 6.1.1.2, 6.5.3",
      mapLine: R`\(E_e = \tfrac{1}{2}\,k\,e^2\); two-step questions; double the stretch, four times the energy`,
      big: "An archer pulls a bowstring back twice as far. Does the arrow get twice as much energy, or more?",
      goals: [R`calculate elastic potential energy with \(E_e = \tfrac{1}{2}\,k\,e^2\)`, R`find \(k\) first when you are given a force`, "explain why doubling the extension gives four times the energy", "say when the equation can be used"],
      keywords: ["elastic potential store", "work done", "compression"],
      story: { title: "Bungee", text: "A bungee cord is a giant elastic band. As the jumper falls, the cord stretches and fills its elastic potential store. That slows the jumper down safely, then springs them back up." },
      doNow: [
        ["A spring has k = 50 N/m. Calculate the force that stretches it by 0.10 m.", R`\(F = k\,e = 50 \times 0.10 = 5.0\) N`],
        ["What is the unit of spring constant?", "N/m"],
        [R`Doubling the speed makes the kinetic energy [[4|2 / 4 / 8]] times bigger.`, "4"],
      ],
      learnTitle: "Energy in a stretched spring",
      learn: [
        { t: "p", h: "When you stretch or squash a spring, you <strong>do work</strong> on it: your force transfers energy to it. The energy is stored in the spring's <strong>elastic potential store</strong>. Let go, and the spring gives the energy back." },
        { t: "eq", eq: R`\(E_e = \tfrac{1}{2}\,k\,e^2\)`, words: "elastic potential energy = 0.5 × spring constant × (extension)²", units: R`\(E_e\) in J, \(k\) in N/m, \(e\) in metres (m)`, re: R`Only the extension is squared. For a squashed spring, \(e\) is how much shorter it is. In this unit you use the equation to calculate the energy.` },
        { t: "key", h: "The equation works only up to the <strong>limit of proportionality</strong>. Beyond it, the spring may be permanently stretched and will not give all the energy back." },
        { t: "follow", slide: 38, q: "A spring with k = 50 N/m is stretched by 0.040 m. Calculate the energy in its elastic potential store.", steps: [["Equation", R`\(E_e = \tfrac{1}{2}\,k\,e^2\)`], ["Substitute", R`\(E_e = 0.5 \times 50 \times 0.040^2\)`], ["Answer", R`\(E_e = 0.04\) J`]],
          yt: { q: "A spring with k = 150 N/m is stretched by 0.040 m. Calculate the energy in its elastic potential store.", steps: [["Equation", R`\(E_e = \tfrac{1}{2}\,k\,e^2\)`], ["Substitute", R`\(E_e = 0.5 \times 150 \times 0.040^2\)`], ["Answer", R`\(E_e = 0.12\) J`]] } },
        { t: "sub", h: R`Given a force? Find \(k\) first` },
        { t: "follow", slide: 39, q: "A force of 3.0 N stretches a spring by 10 cm. Calculate the energy stored.", steps: [["Convert", R`\(e = 10\ \text{cm} = 0.10\ \text{m}\)`], ["Step 1", R`\(k = \dfrac{F}{e} = \dfrac{3.0}{0.10} = 30\) N/m`], ["Step 2", R`\(E_e = \tfrac{1}{2}\,k\,e^2 = 0.5 \times 30 \times 0.10^2\)`], ["Answer", R`\(E_e = 0.15\) J`]],
          yt: { q: "A force of 4.0 N stretches a spring by 16 cm. Calculate the energy stored.", steps: [["Convert", R`\(e = 16\ \text{cm} = 0.16\ \text{m}\)`], ["Step 1", R`\(k = \dfrac{F}{e} = \dfrac{4.0}{0.16} = 25\) N/m`], ["Step 2", R`\(E_e = \tfrac{1}{2}\,k\,e^2 = 0.5 \times 25 \times 0.16^2\)`], ["Answer", R`\(E_e = 0.32\) J`]] } },
        { t: "sub", h: "Double the stretch, four times the energy" },
        { t: "compare", head: ["Extension of a 50 N/m spring", R`\(e^2\)`, R`\(E_e\)`], rows: [["0.040 m", "0.0016", "0.04 J"], ["0.080 m (2 × further)", "0.0064", "0.16 J (4 × more)"], ["0.120 m (3 × further)", "0.0144", "0.36 J (9 × more)"]] },
        { t: "p", h: R`This is the same pattern as kinetic energy, because the extension is squared. <strong>Why?</strong> The further you stretch a spring, the harder you have to pull. So each extra centimetre takes more work than the one before.` },
      ],
      lab: { title: "Your own spring", aside: "Use the spring constant you found in Lesson 4.", blocks: [
        { t: "lab", blocks: [
          { t: "q", p: R`My spring constant from Lesson 4: \(k\) = [[25|20]] N/m. Calculate the energy stored at each extension.`, table: { head: ["Extension / m", R`\(e^2\) / m²`, R`\(E_e\) / J`], rows: [["0.05", null, null], ["0.10", null, null], ["0.20", null, null]], ans: [[null, "0.0025", "0.031"], [null, "0.010", "0.125"], [null, "0.040", "0.50"]] }, box: 20, grid: true },
          { t: "q", p: R`Check: did doubling the extension from 0.10 m to 0.20 m give four times the energy? {{yes*|no}} Show how you know.`, lines: 1, a: "0.50 ÷ 0.125 = 4 (sample)." },
          { t: "q", p: R`Could you use \(E_e = \tfrac{1}{2}\,k\,e^2\) for the 700 g reading in Lesson 4? {{yes|no*}} Explain.`, lines: 2, a: "No: that reading was beyond the limit of proportionality, so k was not constant." },
        ] },
      ] },
      try: [
        { t: "q", p: "Draw a ring around the correct answer in each box.", ring: [
          [R`\(E_e = \tfrac{1}{2}\,k\,e^2\) can only be used up to the`, ["limit of proportionality", "top of the ruler", "point where the spring snaps"], 0],
          ["Tripling the extension makes the energy stored", ["3 times bigger", "6 times bigger", "9 times bigger"], 2],
        ] },
        { t: "q", type: "Supported", p: "A spring with k = 60 N/m is stretched by 0.20 m. Calculate the energy stored.", frame: frame3, frameA: [R`\(E_e = \tfrac{1}{2}\,k\,e^2\)`, R`\(E_e = 0.5 \times 60 \times 0.20^2\)`, "1.2 J"] },
        { t: "q", type: "Supported", p: "A spring in a toy car has k = 500 N/m and is squashed by 30 mm. Calculate the energy stored. <em>Convert mm to m: divide by 1000.</em>", frame: frame4, frameA: ["e = 30 ÷ 1000 = 0.030 m", R`\(E_e = \tfrac{1}{2}\,k\,e^2\)`, R`\(E_e = 0.5 \times 500 \times 0.030^2\)`, "0.225 J"] },
        { t: "q", type: "On your own", p: "A force of 8.0 N stretches a spring by 0.20 m. Calculate the energy stored.", lines: 3, a: R`\(k = \dfrac{8.0}{0.20} = 40\) N/m; \(E_e = 0.5 \times 40 \times 0.20^2 = 0.80\) J` },
        { t: "q", say: ["Raj", "e = 20 cm, so the energy stored is 0.5 × 30 × 20² = 6000 J."], p: "Raj's spring has k = 30 N/m. What did he do wrong? Calculate the correct answer.", lines: 2, a: "He used the extension in cm, not m. e = 0.20 m, so the energy is 0.5 × 30 × 0.20² = 0.60 J." },
        { t: "q", type: "Challenge", p: "Spring A has k = 100 N/m and is stretched by 0.10 m. Spring B has k = 50 N/m and is stretched by 0.20 m. Which spring stores more energy? Show your working.", lines: 3, a: "A: 0.5 × 100 × 0.10² = 0.50 J. B: 0.5 × 50 × 0.20² = 1.0 J. Spring B stores more." },
      ],
      exam: [
        { tip: "Square only the extension. Give the unit.", p: "A catapult has a spring constant of 500 N/m. It is stretched by 0.12 m. Calculate the energy in its elastic potential store.", marks: 2, frame: frame3, frameA: [R`\(E_e = \tfrac{1}{2}\,k\,e^2\)`, R`\(E_e = 0.5 \times 500 \times 0.12^2\) (1)`, "3.6 J (1)"] },
        { p: R`Explain why \(E_e = \tfrac{1}{2}\,k\,e^2\) cannot be used once the spring has passed its limit of proportionality.`, marks: 2, lines: 2, a: "Beyond the limit of proportionality the extension is no longer proportional to the force, so k is not constant (1). The spring may be inelastically deformed and not return all the energy (1)." },
      ],
      quick: { slide: 41, items: [
        [R`\(k = 80\) N/m and \(e = 0.10\) m. Calculate \(E_e\).`, R`\(0.5 \times 80 \times 0.10^2 = 0.40\) J`],
        [R`A spring with \(k = 400\) N/m is squashed by 20 mm. Calculate the energy stored.`, R`\(0.5 \times 400 \times 0.020^2 = 0.08\) J`],
        ["The extension triples. What happens to the energy?", R`It is multiplied by 9 (\(\times 9\)).`],
        ["6.0 N stretches a spring by 0.15 m. Calculate the energy stored.", R`\(k = 40\) N/m; \(E_e = 0.45\) J`],
        [R`When can you not use \(E_e = \tfrac{1}{2}\,k\,e^2\)?`, "Beyond the limit of proportionality."],
        ["Where does the work done stretching a spring go?", "Into the spring's elastic potential store."],
      ] },
      summary: [R`\(E_e = \tfrac{1}{2}\,k\,e^2\): \(k\) in N/m, \(e\) in metres, \(E_e\) in J.`, "The work done stretching a spring is stored in its elastic potential store.", R`Given a force and an extension? Find \(k = \dfrac{F}{e}\) first.`, "2 × the extension gives 4 × the energy.", "Only up to the limit of proportionality."],
      recall: [["Write the equation for elastic potential energy.", R`\(E_e = \tfrac{1}{2}\,k\,e^2\)`], ["What unit must the extension be in?", "Metres (m)."], ["The extension doubles. What happens to the energy stored?", "It becomes 4 times bigger."], ["When can the equation not be used?", "Beyond the limit of proportionality."]],
      cando: [R`calculate \(E_e = \tfrac{1}{2}\,k\,e^2\) with the extension in metres`, R`find \(k\) from a force first, then calculate \(E_e\)`, "explain why doubling the extension gives four times the energy"],
    },
  ];

  window.UNIT_LESSONS = (window.UNIT_LESSONS || []).concat(lessons);
})();
