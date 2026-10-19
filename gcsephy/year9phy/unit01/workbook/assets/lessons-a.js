/* Lessons 1-2 of the Work Like a Physicist workbook (assets/workbook.js): Part 1.
   In sentences: [[answer|a / b / c]] is a blank followed by its options; {{a|b*|c}} is an AQA-style
   ring box with * on the answer. `a` holds the answer shown only in the answer edition.
   Block and question types are documented in workbook.js. Data match the teaching deck. */
(function () {
  "use strict";

  const F = window.WLPFigures;
  const RS = ["random", "systematic"];

  const lessons = [
    // ============================================================ 1
    {
      n: 1, accent: "spark", title: "Can this data be trusted?", practical: true, practicalName: "Measure one thing three times",
      spec: "AQA Working scientifically WS 2.6, 3.4, 3.7 · Physics and Combined Science",
      mapLine: "Precision and accuracy, random and systematic error, uncertainty, resolution",
      big: "Thousands of repeat measurements agreed perfectly, and the result was still wrong. How can that happen?",
      goals: ["tell the difference between precise and accurate", "describe random and systematic errors, and say why repeats only help with one of them", "calculate a mean and an uncertainty from repeat readings", "say what the resolution of an instrument is"],
      keywords: ["precise", "accurate", "random error", "systematic error", "uncertainty", "resolution"],
      story: { year: 2011, title: "The loose cable that broke physics", text: "Physicists in Italy timed neutrinos travelling 730 km from Switzerland. They seemed to arrive about 60 nanoseconds before light could. Thousands of repeats agreed. Months later the team found a fibre-optic cable that was not properly connected. It shifted every reading by the same amount, so repeating could never reveal it, and the result was withdrawn.", punch: "Consistent does not mean correct." },
      doNow: [
        ["You time a toy car rolling down a ramp three times and get three different times. Give one reason why.", "Any sensible reason, e.g. your reaction time when starting and stopping the stopwatch is different each time, or the car is released slightly differently."],
        ["Calculate the mean of 4 cm, 5 cm and 6 cm.", "(4 + 5 + 6) ÷ 3 = 15 ÷ 3 = 5 cm"],
        ["Which ruler can measure more finely? [[the one marked in millimetres|the one marked in centimetres / the one marked in millimetres]]", "The one marked in millimetres."],
      ],
      learnTitle: "Can you trust a measurement?",
      learn: [
        { t: "p", h: "Every measurement has some doubt in it. Measure the same thing three times and you rarely get the same number three times. A physicist asks: <strong>how far can I trust this result?</strong>" },
        { t: "sub", h: "Precise and accurate are different words" },
        { t: "compare", head: ["Word", "Meaning", "How you can tell"], rows: [
          ["Precise", "repeat readings are <strong>close to each other</strong>", "look at the spread of the readings"],
          ["Accurate", "a reading is <strong>close to the true value</strong>", "compare with the true value, e.g. weigh a known 100 g mass"],
        ] },
        { t: "fig", h: F.targets() },
        { t: "key", h: "<strong>You can be perfectly precise and completely wrong.</strong> A tight group of readings looks trustworthy, so nobody checks it. That is why precise-but-wrong is the dangerous one." },
        { t: "sub", h: "Two kinds of error" },
        { t: "fig", h: F.errors() },
        { t: "compare", head: ["Error", "What it does", "Example", "What to do"], rows: [
          ["Random", "spreads readings out unpredictably: some too high, some too low", "reaction time with a stopwatch; judging a bounce height by eye", "repeat and take a mean; use better equipment, such as light gates"],
          ["Systematic", "shifts every reading by the same amount, in the same direction", "a balance that reads 0.2 g with nothing on it (a <strong>zero error</strong>); measuring from the end of a ruler, not the zero mark", "find the cause: check the zero, check against a known value. Repeats do <strong>not</strong> help"],
        ] },
        { t: "model", title: "How to tell which kind you have", h: "Ask: would this make the reading wrong by the same amount, in the same direction, every time? <strong>Yes:</strong> systematic. <strong>Up one time and down the next:</strong> random. A known systematic error can be corrected: if the balance reads 0.2 g with nothing on it, subtract 0.2 g from every reading." },
        { t: "sub", h: "Uncertainty: put a number on the doubt" },
        { t: "fig", h: F.uncertainty() },
        { t: "worked", q: "Three readings: 1.20 s, 1.25 s, 1.21 s. Find the mean and the uncertainty.",
          steps: [["Mean", "(1.20 + 1.25 + 1.21) ÷ 3 = 3.66 ÷ 3 = 1.22 s"], ["Largest − smallest", "1.25 − 1.20 = 0.05 s"], ["Uncertainty", "0.05 ÷ 2 = 0.025 s, about 0.03 s"], ["Result", "1.22 s ± 0.03 s"]],
          yt: { q: "Three readings: 4.6 cm, 5.0 cm, 4.8 cm. Find the mean and the uncertainty.", steps: [["Mean", "(4.6 + 5.0 + 4.8) ÷ 3 = 14.4 ÷ 3 = 4.8 cm"], ["Largest − smallest", "5.0 − 4.6 = 0.4 cm"], ["Uncertainty", "0.4 ÷ 2 = 0.2 cm"], ["Result", "4.8 cm ± 0.2 cm"]] } },
        { t: "key", h: "<strong>uncertainty = (largest − smallest) ÷ 2.</strong> Why divide by 2? Largest − smallest is the whole width of the spread. The mean sits near the middle, so the readings reach about half that width above it and half below. Read “1.22 s ± 0.03 s” as “about 1.22 s, give or take 0.03 s”. The <strong>range</strong> of these readings is from 1.20 s to 1.25 s: a range is stated “from … to …”, never as one number." },
        { t: "sub", h: "Resolution: what can the instrument see?" },
        { t: "split", left: [
          { t: "p", h: "The <strong>resolution</strong> of an instrument is the smallest change it can detect. A ruler marked in millimetres has a resolution of 1 mm. A stopwatch that reads to 0.01 s has a resolution of 0.01 s." },
          { t: "p", h: "Match the instrument to the job: 1 mm is tiny next to the length of a desk, but it is half the thickness of a coin." },
          { t: "warn", h: "<strong>Trap.</strong> Better resolution gives you more decimal places. It does <em>not</em> remove a systematic error: a balance with a zero error gives a precise wrong answer to two decimal places." },
        ], right: [{ t: "fig", h: F.rulers() }] },
        { t: "p", h: "<strong>Repeatable:</strong> you do it again with the same method and equipment and get similar results. <strong>Reproducible:</strong> another person, or different equipment, gets similar results. Reproducible is the stronger test." },
      ],
      tryTitle: "Measurement detective",
      try: [
        { t: "q", p: "Three students timed the same toy car rolling down the same ramp.", table: { head: ["Set", "Trial 1 / s", "Trial 2 / s", "Trial 3 / s", "Mean / s"], rows: [["A", "1.20", "1.23", "1.19", "1.21"], ["B", "1.05", "1.47", "1.12", "1.21"], ["C", "0.90", "0.93", "0.89", "0.91"]] },
          after: [
            { t: "part", p: "<b>a</b> Sets A and B have the same mean. The more precise set is {{A*|B}} Explain how you can tell.", lines: 1, a: "A: its readings are close together (1.19 s to 1.23 s); B's are spread from 1.05 s to 1.47 s." },
            { t: "part", p: "<b>b</b> The true time is about 1.21 s. Set C is precise but {{accurate|not accurate*}} Suggest what could shift every reading in set C by the same amount.", lines: 2, a: "A systematic error, e.g. the stopwatch was stopped too early every time, or the car was started from a different point each time by the same amount." },
            { t: "part", p: "<b>c</b> What is the point of taking three readings instead of one?", lines: 1, a: "You can see how much the readings vary, spot an odd one, and calculate a mean, which reduces the effect of random error." },
          ] },
        { t: "q", p: "A balance is used to weigh a mass of exactly 50.0 g three times. Draw <strong>one</strong> line from each set of readings to the description that fits.", match: { left: ["50.1 g, 49.9 g, 50.0 g", "52.4 g, 52.5 g, 52.4 g", "47.0 g, 53.1 g, 49.8 g", "44.2 g, 46.9 g, 41.7 g"], right: ["precise but not accurate", "neither precise nor accurate", "precise and accurate", "accurate on average, not precise"], a: [[0, 2], [1, 0], [2, 3], [3, 1]] } },
        { t: "q", p: "The neutrino readings in <em>The case</em> were {{precise and accurate|precise but not accurate*|accurate but not precise}} Explain your choice.", lines: 2, a: "The readings agreed closely (precise), but all were wrong by the same amount because of the loose cable: a systematic error, so not accurate." },
        { t: "q", type: "Supported", p: "Complete the table. All the readings are in cm. Then answer the questions below it.", table: { head: ["Set", "Trial 1", "Trial 2", "Trial 3", "Mean", "Largest − smallest", "Uncertainty"], rows: [["A", "12.0", "12.4", "12.1", null, null, null], ["B", "8.4", "9.1", "8.6", null, null, null], ["C", "24.9", "25.1", "25.1", null, null, null], ["D", "3.20", "3.65", "3.25", null, null, null]], ans: [[0, 0, 0, 0, "12.2", "0.4", "0.2"], [0, 0, 0, 0, "8.7", "0.7", "0.35 (0.4)"], [0, 0, 0, 0, "25.0", "0.2", "0.1"], [0, 0, 0, 0, "3.37", "0.45", "0.23"]] },
          after: [
            { t: "part", p: "<b>a</b> Show your working for the mean of one set.", lines: 1, a: "e.g. A: (12.0 + 12.4 + 12.1) ÷ 3 = 36.5 ÷ 3 = 12.17, about 12.2 cm" },
            { t: "part", p: "<b>b</b> The most precise set is {{A|B|C*|D}} The set with the largest uncertainty is {{A|B*|C|D}}" },
            { t: "part", p: "<b>c</b> One reading in set D may be a mistake. Which one? What would you do before using the mean?", lines: 2, a: "3.65 cm: it is far from 3.20 and 3.25. Check how it was recorded and repeat that measurement before trusting the mean." },
          ] },
        { t: "q", p: "Is each problem a random or a systematic error? Draw a ring around one word in each row.", ring: [
          ["Reaction time: the stopwatch is started sometimes early, sometimes late.", RS, 0],
          ["The ruler is read from its very end, not from the zero mark.", RS, 1],
          ["A balance reads 0.2 g with nothing on it.", RS, 1],
          ["The height of a fast bounce is judged by eye.", RS, 0],
          ["A draught from an open window comes and goes.", RS, 0],
          ["A scale is always read from above, at the same angle.", RS, 1],
        ] },
        { t: "q", p: "Explain why taking more repeats cannot remove a systematic error.", lines: 2, a: "A systematic error shifts every reading by the same amount in the same direction, so the mean of many repeats is shifted by that amount too. Random errors go both ways, so they partly cancel in a mean." },
        { t: "q", p: "Complete the table.", table: { head: ["Instrument", "Resolution", "Could it show a change of 0.5 mm?"], rows: [["Ruler marked every 1 cm", { opts: "1 cm / 1 mm / 0.1 mm", a: "1 cm" }, { opts: "yes / no", a: "no" }], ["Ruler marked every 1 mm", { opts: "1 cm / 1 mm / 0.1 mm", a: "1 mm" }, { opts: "yes / no", a: "no" }], ["Digital calipers reading to 0.1 mm", { opts: "1 cm / 1 mm / 0.1 mm", a: "0.1 mm" }, { opts: "yes / no", a: "yes" }]] },
          after: [{ t: "part", p: "A stopwatch reads to 0.01 s. Its resolution is {{0.01 s*|0.1 s|1 s}}" }] },
        { t: "q", say: ["Sam", "My digital balance shows two decimal places, so my results must be accurate."], p: "Explain what is wrong with what Sam says.", lines: 2, a: "More decimal places means a finer resolution, not accuracy. A balance with a zero error gives precise but wrong readings; check it with a known mass." },
        { t: "q", type: "Challenge", p: "Data detective. For each claim, write what you would need to know before believing it, and the error you suspect.", table: { head: ["The claim", "What I would need to know first", "Error I suspect"], widths: ["38%", "42%", "20%"], rh: 16, rows: [
          ["“Our reaction times improved after training.” The two tests were timed by different people.", null, { opts: "random / systematic", a: "systematic" }],
          ["“The room is exactly 6.000 m long.” Measured once, with the tape held slightly slack.", null, { opts: "random / systematic", a: "systematic" }],
          ["“This spring stretches 4.0 cm for each 100 g.” One reading was taken for each mass.", null, { opts: "random / systematic", a: "random" }],
        ], ans: [[0, "Was the timing done the same way? How big is the change compared with the spread of repeats?"], [0, "Was the tape tight and straight? Can a tape really read to 1 mm (6.000 m)?"], [0, "How much do repeat readings vary? One reading cannot show or reduce random error."]] } },
        { t: "q", p: "Checkpoint. Complete the sentences.", bank: ["precise", "accurate", "random", "systematic", "resolution"], fill: [
          "A set of results that are close together is [[precise|30]].",
          "A result that is close to the true value is [[accurate|30]].",
          "Repeats reduce the effect of [[random|30]] errors, but not [[systematic|30]] errors.",
          "The smallest change an instrument can detect is its [[resolution|30]].",
        ] },
      ],
      lab: { title: "Measure one thing three times", aside: "Your teacher gives you one task: a dropped-ruler reaction test, a toy car on a ramp, the bounce of a ball, or one object measured with different rulers.", blocks: [
        { t: "lab", blocks: [
          { t: "steps", items: ["Agree exactly what you will measure, and from where to where.", "Take three readings. Write each one down as soon as you take it.", "Calculate the mean and the uncertainty."] },
          { t: "table", head: ["What I measured (with unit)", "Trial 1", "Trial 2", "Trial 3", "Mean", "Uncertainty"], rh: 11, widths: ["30%", "12%", "12%", "12%", "14%", "20%"], rows: [[null, null, null, null, null, null]], ans: [["catch distance / cm (sample)", "14.0", "17.5", "15.5", "15.7", "1.8"]] },
          { t: "vars", rows: [["Instrument I used", "", "e.g. 30 cm ruler"], ["Its resolution", "", "e.g. 1 mm"]] },
          { t: "q", p: "Name one random error that affected you. How do you know it was random?", lines: 2, a: "e.g. reaction time catching the ruler: the readings went up and down (14.0, 17.5, 15.5 cm) with no pattern." },
          { t: "q", p: "Name one possible systematic error. How would you look for it?", lines: 2, a: "e.g. the zero of the ruler was not level with the fingers each time. Check the zero, or swap the person or equipment and see whether the whole set shifts." },
          { t: "q", p: "One thing I would do differently to make my readings more repeatable:", lines: 1, a: "e.g. the same person drops the ruler each time from the same starting position." },
        ] },
      ] },
      exam: [
        { tip: "Show the sum before you divide. Give the answer to the same number of decimal places as the readings.", p: "A student times a pendulum swinging 10 times. The readings are 15.2 s, 15.6 s and 15.3 s. Calculate the mean time.", marks: 2, lines: 2, a: "(15.2 + 15.6 + 15.3) ÷ 3 = 46.1 ÷ 3 (1)<br>= 15.4 s (1)" },
        { p: "Calculate the uncertainty in the mean. Use uncertainty = (largest − smallest) ÷ 2", marks: 2, lines: 2, a: "(15.6 − 15.2) ÷ 2 (1)<br>= 0.2 s (1)" },
        { p: "The student always starts the stopwatch late, by about the same amount. What type of error is this? Tick <strong>one</strong> box.", marks: 1, mcq: { o: ["random error", "systematic error", "anomalous result"], c: 1, cols: 3 } },
        { p: "Explain why repeating the measurement would not reduce this error.", marks: 1, lines: 2, a: "Every reading is shifted by the same amount in the same direction, so the mean is shifted too (1)." },
      ],
      home: { title: "Take it home", blocks: [{ t: "q", p: "Find a claim with a number in it: an advert, a headline or a sports statistic. Write it down, then write one question you would have to ask before you believed it. Bring it to Lesson 2.", lines: 3, a: "Open. A good question asks what is missing: how many people or trials, how it was measured, or what it was compared with." }] },
      summary: ["<strong>Precise:</strong> repeat readings close together. <strong>Accurate:</strong> close to the true value.", "<strong>Random error</strong> spreads readings both ways; repeats and a mean reduce it.", "<strong>Systematic error</strong> shifts every reading the same way; repeats do not help.", "uncertainty = (largest − smallest) ÷ 2. Write the result as mean ± uncertainty.", "<strong>Resolution:</strong> the smallest change an instrument can detect."],
      recall: [["What does precise mean?", "Repeat readings are close to each other."], ["What does accurate mean?", "Close to the true value."], ["How do you calculate the uncertainty from repeats?", "(largest − smallest) ÷ 2"], ["Which kind of error do repeats reduce?", "Random error."], ["A balance reads 0.2 g with nothing on it. What kind of error?", "Systematic (a zero error)."], ["What is the resolution of a ruler with mm marks?", "1 mm"]],
      cando: ["tell precision from accuracy", "calculate a mean and an uncertainty from repeats", "tell random from systematic error and say how to deal with each", "state the resolution of an instrument"],
    },

    // ============================================================ 2
    {
      n: 2, accent: "cyan", title: "What are you actually changing?", practicalName: "Class demo: which surface slows the car most?",
      spec: "AQA Working scientifically WS 2.2, 3.1 · Physics and Combined Science",
      mapLine: "Independent, dependent and control variables; continuous and categoric data; choosing a graph",
      big: "An advert says a drink makes you smarter. What would you need to know before you believed it?",
      goals: ["identify the independent, dependent and control variables in any investigation", "decide whether data is continuous or categoric", "choose a line graph or a bar chart, and give the reason"],
      keywords: ["independent variable", "dependent variable", "control variable", "continuous", "categoric", "fair test"],
      story: { title: "The study that proved nothing", text: "An invented example. A drinks company says students who drank its product scored higher in a maths test. But the drinkers sat the test in the morning and the others after lunch, in a different room. Two things changed at once, so the result cannot tell you which one made the difference.", punch: "Change one thing. Measure one thing. Keep everything else the same." },
      doNow: [
        ["Precise means repeat readings are [[close to each other|close to each other / close to the true value]].", "close to each other"],
        ["Repeats and a mean reduce the effect of [[random|random / systematic]] errors.", "random"],
        ["Calculate the uncertainty for 3.2 s, 3.6 s and 3.4 s.", "(3.6 − 3.2) ÷ 2 = 0.2 s"],
      ],
      learnTitle: "Take the question apart",
      learn: [
        { t: "p", h: "Every investigation answers one question: <strong>How does X affect Y?</strong> X is what you change. Y is what you measure." },
        { t: "fig", h: F.variables() },
        { t: "compare", head: ["Variable", "Meaning", "Example: the ramp"], rows: [
          ["Independent", "the <strong>one</strong> thing you change on purpose", "ramp height"],
          ["Dependent", "the thing you <strong>measure</strong>", "distance the trolley travels"],
          ["Control", "everything you <strong>keep the same</strong>, so it cannot affect the result", "same trolley, same start line, same floor, no push"],
        ] },
        { t: "key", h: "<strong>Change only one thing at a time.</strong> Test a longer pendulum with a heavier bob, and the swing takes longer: was it the length or the mass? You cannot say. “Keep it a fair test” earns nothing on its own: name the variable and how you keep it the same, such as “use the same bob each time”." },
        { t: "sub", h: "Two kinds of data" },
        { t: "fig", h: F.dataTypes() },
        { t: "p", h: "<strong>Test: is there a value in between?</strong> Between 10 cm and 20 cm there is 15 cm, and it means something: length is <strong>continuous</strong>. There is nothing halfway between sponge and cardboard: material is <strong>categoric</strong>. The same thing can be recorded either way: “hot, warm, cold” is categoric, but “60 °C, 40 °C, 20 °C” is continuous and tells you much more. When you can, measure." },
        { t: "sub", h: "Which graph?" },
        { t: "fig", h: F.graphChoice() },
        { t: "rule", head: "The rule that decides your graph", h: "Continuous independent variable → line graph. Categoric independent variable → bar chart.", foot: "A line says something about the values between your points, which only makes sense if in-between values exist. Separate bars show separate things." },
        { t: "warn", h: "<strong>The mistake almost everyone makes:</strong> “My results are numbers, so it’s a line graph.” In “Which surface gives the most friction?” you measure a distance in centimetres, but surface type is what you changed, and surfaces are categories. So it is a bar chart. Look only at the independent variable." },
      ],
      tryTitle: "Decode any investigation",
      try: [
        { t: "q", p: "Fill in all three columns. Take care with the controls: they are the column people rush.", table: { head: ["Investigation question", "I change (independent)", "I measure (dependent)", "I keep the same (two controls)"], widths: ["31%", "21%", "21%", "27%"], rh: 15, rows: [
          ["How does ramp height affect the speed of a trolley?", null, null, null],
          ["Which material is the best thermal insulator?", null, null, null],
          ["How does the number of elastic bands affect launch distance?", null, null, null],
          ["Which drink contains the most sugar?", null, null, null],
        ], ans: [[0, "ramp height", "speed of the trolley", "same trolley; same release point"], [0, "insulating material", "temperature drop in a set time", "same starting temperature; same volume of water"], [0, "number of elastic bands", "launch distance", "same projectile; same pull-back"], [0, "type of drink", "mass of sugar", "same volume of drink; same test method"]] },
          after: [{ t: "part", p: "Pick one of the four. If you did not keep your controls the same, what would go wrong with your conclusion?", lines: 2, a: "e.g. ramp height: if the trolley were released from a different point each time, a change in speed could be caused by that, not by the height, so you could not say what caused it." }] },
        { t: "q", p: "Is each variable continuous or categoric? Draw a ring around one word in each row.", ring: [
          ["The mass of a ball", ["continuous", "categoric"], 0],
          ["The colour of a car", ["continuous", "categoric"], 1],
          ["The time a ball takes to fall", ["continuous", "categoric"], 0],
          ["The type of metal in a wire", ["continuous", "categoric"], 1],
          ["The temperature of the water", ["continuous", "categoric"], 0],
        ] },
        { t: "q", p: "Sort the investigations. Both columns are needed for full credit.", table: { head: ["Investigation", "Graph", "The independent variable is…"], widths: ["48%", "18%", "34%"], rows: [
          ["How does temperature affect dissolving time?", { opts: "line / bar", a: "line" }, { opts: "continuous / categoric", a: "temperature: continuous" }],
          ["Which surface gives the most friction?", { opts: "line / bar", a: "bar" }, { opts: "continuous / categoric", a: "surface: categoric" }],
          ["How does mass affect the stretch of a spring?", { opts: "line / bar", a: "line" }, { opts: "continuous / categoric", a: "mass: continuous" }],
          ["Which paper towel absorbs the most water?", { opts: "line / bar", a: "bar" }, { opts: "continuous / categoric", a: "brand: categoric" }],
          ["How does pendulum length affect the time of a swing?", { opts: "line / bar", a: "line" }, { opts: "continuous / categoric", a: "length: continuous" }],
          ["Which material is the best sound absorber?", { opts: "line / bar", a: "bar" }, { opts: "continuous / categoric", a: "material: categoric" }],
        ] } },
        { t: "q", type: "Challenge", p: "Fix the broken plan. A student writes: <em>“I will test whether expensive tennis balls bounce better. I’ll drop an expensive ball from the window and a cheap one from my hand, and see which bounces higher.”</em>", after: [
          { t: "part", p: "<b>a</b> Name two things wrong with this plan.", lines: 2, a: "Any two: two things change (the ball and the drop height); “better” is vague: measure the bounce height in cm; only one drop of each, so no repeats; the release is different." },
          { t: "part", p: "<b>b</b> Rewrite it as a question in the form “How does X affect Y?”", lines: 1, a: "How does the type of tennis ball affect its bounce height when it is dropped from 1.0 m?" },
          { t: "part", p: "<b>c</b> Your question needs a {{bar chart*|line graph}} because the independent variable is {{continuous|categoric*}}" },
        ] },
        { t: "q", p: "Checkpoint. Complete the sentences.", bank: ["change", "measure", "keep the same", "continuous", "categoric"], fill: [
          "The independent variable is the thing I [[change|30]].",
          "The dependent variable is the thing I [[measure|30]].",
          "Control variables are the things I [[keep the same|30]].",
          "Use a line graph when the independent variable is [[continuous|30]].",
          "Use a bar chart when the independent variable is [[categoric|30]].",
        ] },
        { t: "q", type: "Explain", p: "Explain to someone who missed the lesson why the choice of graph depends on the independent variable and not on the dependent one.", lines: 3, a: "The independent variable goes along the x-axis, so it decides whether the x-axis is a number scale (line graph) or a row of separate labels (bar chart). The dependent variable is nearly always a number, so it cannot tell the two cases apart." },
      ],
      lab: { title: "Demo: which surface slows the car most?", aside: "Your teacher rolls the same car down the same ramp onto different surfaces: bench, carpet, rubber mat, sandpaper.", blocks: [
        { t: "lab", blocks: [
          { t: "vars", rows: [["Independent variable", "", "type of surface"], ["Dependent variable (with unit)", "", "distance the car travels / cm"], ["Graph type", "{{line graph|bar chart*}}"]] },
          { t: "q", p: "List three control variables. Put a star by the one that would be hardest to keep the same.", lines: 3, a: "Same car; same ramp height; same release point, with no push*. The release is hardest: it is easy to give a small push or start from a slightly different spot." },
        ] },
      ] },
      exam: [
        { tip: "The independent variable is the one the student chooses to change.", p: "A student investigates how the length of a wire affects its resistance. Complete the sentence.", marks: 1, fill: "The independent variable is {{the length of the wire*|the resistance|the temperature}}" },
        { p: "Give <strong>one</strong> control variable for this investigation.", marks: 1, lines: 1, a: "Any one: the thickness of the wire; the material of the wire; the temperature (1)." },
        { p: "Complete the sentence.", marks: 1, fill: "The results should be shown on a {{bar chart|line graph*}} because the length of the wire is {{categoric|continuous*}}", a: "Both needed (1)." },
        { p: "Which investigation should be shown on a bar chart? Tick <strong>one</strong> box.", marks: 1, mcq: { o: ["how the height of a drop affects the time a ball takes to fall", "how the type of shoe affects grip", "how temperature affects how fast sugar dissolves", "how mass affects the stretch of a spring"], c: 1, cols: 1 } },
      ],
      home: { title: "Take it home", blocks: [{ t: "q", p: "Write five investigation questions of your own in the form “How does X affect Y?”: at least two that need a bar chart and two that need a line graph. For each, name the independent variable and say whether it is continuous or categoric.", lines: 5, a: "Open. Check that each question changes one thing and measures one thing, and that the independent variable is correctly labelled continuous or categoric." }] },
      summary: ["<strong>Independent:</strong> the one thing you change. <strong>Dependent:</strong> what you measure. <strong>Control:</strong> what you keep the same.", "Change only one thing, or you cannot tell what caused the result.", "<strong>Continuous:</strong> any value on a scale. <strong>Categoric:</strong> names or groups.", "Continuous independent variable → line graph. Categoric → bar chart."],
      recall: [["What is the dependent variable?", "The variable that is measured."], ["Why must control variables be kept the same?", "If two things change, you cannot tell which one caused the result."], ["Is surface type continuous or categoric?", "Categoric."], ["Which variable decides the type of graph?", "The independent variable."]],
      cando: ["identify the independent, dependent and control variables", "say whether data is continuous or categoric", "choose a line graph or a bar chart and give the reason"],
    },
  ];

  window.UNIT_LESSONS = (window.UNIT_LESSONS || []).concat(lessons);
})();
