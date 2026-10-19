/* Lessons 3-5 of the Work Like a Physicist workbook (assets/workbook.js): Part 2.
   Same marks as lessons-a.js. Sample results are the deck's: drop test from 50 cm; ramp means
   20, 37, 52, 66, 80 cm (Lesson 5's anomalous copy has 96 cm at 20 cm). */
(function () {
  "use strict";

  const F = window.WLPFigures;
  const RAMP = F.RAMP;
  const DROP = [["sponge", "12", "15", "12", "13"], ["cardboard", "31", "32", "27", "30"], ["cloth", "22", "25", "22", "23"], ["rubber mat", "39", "35", "40", "38"], ["bubble wrap", "18", "14", "19", "17"]];
  const XY = ["x-axis", "y-axis"];

  const lessons = [
    // ============================================================ 3
    {
      n: 3, accent: "copper", title: "The drop test", practical: true, practicalName: "Drop test: which material absorbs the shock?",
      spec: "AQA Working scientifically WS 2.4, 3.1, 3.3 · Physics and Combined Science",
      mapLine: "Shock absorber practical: three trials and a mean, results tables, bar charts",
      big: "Which material makes the best shock absorber, and how would you prove it to someone who was not there?",
      goals: ["recognise a categoric independent variable and what follows from it", "collect three trials for each material and calculate a mean", "build a results table with correct headings and units", "draw a bar chart that would satisfy a strict marker", "name a random and a systematic error in your own practical"],
      keywords: ["trial", "mean", "results table", "bar chart", "shock absorber"],
      story: { title: "Why your helmet is made of foam", text: "A cycle helmet is mostly foam that is meant to be crushed. In a crash the foam squashes, so the head stops over a longer time and the force on the skull is smaller. Before a helmet is sold, it is fitted to a head-shaped weight with sensors inside and dropped onto a steel anvil, helmet after helmet. One lucky drop proves nothing.", punch: "Same ball. Same height. Only the material changes." },
      doNow: [
        ["A categoric independent variable needs [[a bar chart|a bar chart / a line graph]].", "a bar chart"],
        ["The variable you change is the [[independent|independent / dependent / control]] variable.", "independent"],
        ["A balance reads 0.3 g with nothing on it. This is a [[systematic|random / systematic]] error.", "systematic (a zero error)"],
      ],
      learnTitle: "Bouncing balls into evidence",
      learn: [
        { t: "p", h: "Drop a ball onto different materials and measure how high it bounces. The question: <strong>How does the type of material affect the bounce height of a ball?</strong>" },
        { t: "split", cls: "wide-fig", left: [
          { t: "compare", head: ["Variable", "In the drop test"], rows: [["Independent", "material (categoric)"], ["Dependent", "bounce height / cm"], ["Control", "same ball; dropped from 50 cm; released, never pushed; ruler in the same place"]] },
          { t: "p", h: "State control variables with their values: “dropped from 50 cm each time”, not just “same height”." },
        ], right: [{ t: "fig", h: F.dropTest() }] },
        { t: "warn", h: "<strong>Decide before you start.</strong> A good shock absorber soaks up the ball's energy instead of giving it back. A ball that barely bounces has left most of its energy in the material. So the best shock absorber gives the {{highest|lowest*}} bounce." },
        { t: "sub", h: "Why each step of the method matters" },
        { t: "compare", head: ["Step", "Reason"], rows: [
          ["Ruler vertical, 0 cm at the surface", "A leaning ruler reads every height too long. A ruler with its zero in the wrong place makes every height wrong by the same amount: a zero error."],
          ["Read at eye level", "Looking down at the ball lines it up with the wrong mark on the ruler behind it."],
          ["First bounce only", "Each bounce is lower than the last, so compare the same one every time."],
          ["Three trials for each material", "One drop could be a fluke. Three show how much the readings vary and give a mean."],
        ] },
        { t: "sub", h: "Results table and the mean" },
        { t: "table", head: ["Material", "Trial 1 / cm", "Trial 2 / cm", "Trial 3 / cm", "Mean / cm"], rows: DROP },
        { t: "list", items: ["The independent variable goes in the first column.", "Units go in the headings, after a slash, not next to every number.", "One column for each trial, then the mean.", "Write each reading down the moment you take it."] },
        { t: "worked", q: "Cloth: 22 cm, 25 cm, 22 cm. Calculate the mean.", steps: [["Add", "22 + 25 + 22 = 69 cm"], ["Divide", "69 ÷ 3 = 23 cm"], ["Check", "23 lies between 22 and 25 ✓"]],
          yt: { q: "Bubble wrap: 18 cm, 14 cm, 19 cm. Calculate the mean.", steps: [["Add", "18 + 14 + 19 = 51 cm"], ["Divide", "51 ÷ 3 = 17 cm"], ["Check", "17 lies between 14 and 19 ✓"]] } },
        { t: "key", h: "<strong>Why a mean?</strong> Each trial is a little off, some high and some low. Those differences partly cancel, so the mean is a better estimate than any single trial. A mean must lie between the smallest and largest trial; if yours does not, the arithmetic is wrong. Look across each row first: if one trial is far from the others, repeat it." },
        { t: "sub", h: "A bar chart that satisfies a marker" },
        { t: "split", left: [
          { t: "list", items: ["Title: what against what.", "Material on the x-axis; mean bounce height / cm on the y-axis.", "The y-axis starts at 0: the height of a bar is its value.", "Bars of equal width, with equal gaps: the materials are separate things.", "Each bar's height is the <strong>mean</strong>, not trial 1."] },
          { t: "p", h: "Sponge has the lowest mean bounce, 13 cm, so it is the best shock absorber of the five." },
        ], right: [{ t: "fig", h: F.barChart() }] },
        { t: "sub", h: "Name the error, match the fix" },
        { t: "compare", head: ["Error", "In the drop test", "Fix"], rows: [
          ["Random", "judging the top of a fast bounce by eye, so readings vary", "film it against the ruler with a fixed camera and pause at the top; take more repeats"],
          ["Systematic", "ruler zero not at the surface, so every height is wrong by the same amount", "check that 0 cm is at the surface before you start; repeats do not help"],
        ] },
        { t: "warn", h: "“There was human error” earns nothing. Name the mechanism: “the top of the bounce was judged by eye”. A zero error makes every bar too short by the same amount, so the <em>order</em> of the materials stays the same. Random error could swap two materials whose means are close." },
      ],
      lab: { title: "The drop test", aside: "Groups of three: one drops, one reads, one records. Then swap jobs.", blocks: [
        { t: "lab", blocks: [
          { t: "steps", items: ["Choose 4 or 5 materials and write them in the table.", "Clamp the ruler vertical, with 0 cm at the surface of the material.", "Hold the ball at 50 cm and release it. Do not throw it or push it down.", "Read the top of the first bounce, with your eye level with it.", "Do three trials for each material, then work out each mean."] },
          { t: "safety", items: ["Drop the ball vertically; never throw it.", "Make sure the tray and the materials are stable before you release.", "Keep the drop zone clear and do not crowd round it."] },
        ] },
        { t: "lab", title: "Results", blocks: [
          { t: "q", p: "Record every reading as you take it, never from memory at the end.", table: { head: ["Material", "Trial 1 / cm", "Trial 2 / cm", "Trial 3 / cm", "Mean / cm"], rh: 10, rows: DROP.map(() => [null, null, null, null, null]), ans: DROP } },
          { t: "q", p: "Show one mean calculation in full.", lines: 1, a: "e.g. sponge: (12 + 15 + 12) ÷ 3 = 39 ÷ 3 = 13 cm" },
          { t: "q", p: "Did any reading make you look twice? Which one, and what did you do about it?", lines: 2, a: "e.g. cardboard trial 3 (27 cm) was lower than 31 and 32, so we checked it and repeated the drop, recording both." },
        ] },
      ] },
      lab2: { title: "Draw your bar chart", aside: "Use the checklist before your teacher sees it.", blocks: [
        { t: "lab", blocks: [
          { t: "p", h: "Material on the x-axis, mean bounce height on the y-axis. Choose your own scale. Add a title." },
          { t: "graph", w: 150, h: 90, blank: true, x: [1, 1], y: [5, 1], xLabel: "Material", yLabel: "Mean bounce height / cm", barStep: 28, barW: 16, bars: [["sponge", 13], ["card", 30], ["cloth", 23], ["rubber", 38], ["bubble", 17]] },
          { t: "checks", title: "Check your bar chart", head: ["✓"], items: ["Title says what against what", "Material on the x-axis", "y-axis labelled with the unit, starting at 0", "Scale goes up in equal steps and uses most of the space", "Bars all the same width, with equal gaps", "Bar heights match the means, not trial 1"] },
        ] },
      ] },
      flow: ["doNow", "learn", "lab", "lab2", "try", "exam", "revise"],
      tryTitle: "What the data says",
      try: [
        { t: "q", p: "Which material was the best shock absorber? Quote numbers from your results to back it up.", lines: 2, a: "Sample: sponge, with the lowest mean bounce, 13 cm, compared with 38 cm for the rubber mat." },
        { t: "q", p: "Why did you repeat each drop three times instead of once?", lines: 2, a: "One drop could be a fluke. Repeats show how much readings vary, let an odd one be spotted, and give a mean that reduces the effect of random error." },
        { t: "q", p: "Pin down the errors in <em>your</em> practical. Be specific: “human error” earns nothing.", table: { head: ["Error", "What went wrong in our practical", "How we would reduce it"], widths: ["18%", "41%", "41%"], rh: 14, rows: [["Random", null, null], ["Systematic", null, null]], ans: [[0, "judging the top of the bounce by eye", "film it against the ruler and pause at the top"], [0, "0 cm on the ruler was not at the surface", "check the zero before starting"]] } },
        { t: "q", p: "Would ten more repeats fix the systematic error you named? {{yes|no*}} Explain.", lines: 2, a: "No. A systematic error shifts every reading by the same amount, so the mean of more repeats is shifted too. The cause has to be found and fixed." },
        { t: "q", say: ["Leo", "The rubber mat is the best shock absorber because it has the tallest bar."], p: "Explain what is wrong with what Leo says.", lines: 2, a: "The best shock absorber gives the lowest bounce, because it keeps the most energy. The tallest bar shows the worst shock absorber." },
        { t: "q", type: "Challenge", p: "Another group tested the same materials and got quite different numbers. Give two reasons why, without either group having done anything wrong.", lines: 2, a: "Any two: a different ball; a different drop height; a different thickness or sample of each material; a different surface under the materials." },
        { t: "q", type: "Challenge", p: "You test foam that is 1 cm, 2 cm, 3 cm and 4 cm thick instead of different materials. You would now need a {{bar chart|line graph*}} because thickness is {{continuous*|categoric}} What has changed?", lines: 1, a: "The independent variable is now continuous (a number on a scale), not categoric." },
      ],
      exam: [
        { tip: "Show the sum, then divide by the number of trials.", p: "A student drops a ball onto three surfaces.", marks: 2, table: { head: ["Surface", "Trial 1 / cm", "Trial 2 / cm", "Trial 3 / cm", "Mean / cm"], rows: [["Carpet", "14", "16", "15", "15"], ["Wood", "42", "40", "44", null], ["Grass", "25", "31", "22", "26"]], ans: [0, [0, 0, 0, 0, "42"]] },
          after: [{ t: "part", p: "Calculate the mean bounce height for wood. Write it in the table.", lines: 1, a: "(42 + 40 + 44) ÷ 3 = 126 ÷ 3 (1) = 42 cm (1)" }] },
        { p: "Which surface absorbs the most energy from the ball? Give a reason.", marks: 2, lines: 2, a: "Carpet (1); it has the lowest mean bounce height (1)." },
        { p: "The student judged the bounce height by eye. Suggest <strong>one</strong> improvement to the method.", marks: 1, lines: 1, a: "Film the bounce against the ruler and read the height from the paused video (1)." },
      ],
      summary: ["A categoric independent variable (material) → bar chart.", "Three trials for each value; mean = total ÷ number of trials.", "Units go in the table headings: “Trial 1 / cm”.", "Bar chart: equal bars, equal gaps, y-axis from 0, bar = the mean.", "Name the error and match the fix; never just “human error”."],
      recall: [["16 cm, 21 cm, 17 cm. What is the mean?", "54 ÷ 3 = 18 cm"], ["Does the best shock absorber give the highest or lowest bounce?", "The lowest."], ["Why is the drop test shown on a bar chart?", "Material is categoric."], ["What does the height of each bar show?", "The mean, not one trial."]],
      cando: ["calculate a mean from three trials", "draw a results table with units in the headings", "draw a bar chart a marker would accept", "name a random and a systematic error and how to reduce each"],
    },

    // ============================================================ 4
    {
      n: 4, accent: "leaf", title: "Higher ramp, further travel?", practical: true, practicalName: "Ramp: distance travelled",
      spec: "AQA Working scientifically WS 2.6, 3.1 · Physics and Combined Science",
      mapLine: "Ramp practical: continuous data, choosing a scale, plotting a line graph",
      big: "Can a few measurements tell you about heights you never tested?",
      goals: ["recognise a continuous independent variable and what follows from it", "record five values with three trials each and a mean", "choose a scale that uses most of the grid", "plot points accurately as small crosses", "label both axes with the quantity and the unit"],
      keywords: ["continuous", "line graph", "scale", "axis", "plot"],
      story: { title: "Nobody guesses a stunt jump", text: "A stunt team does not find the right speed by trying the real jump. They run the car at several speeds, measure where it lands each time and plot the results. A line through the points gives the speed for a distance nobody has tested. One measurement on its own is not a pattern.", punch: "Five points and a line tell you about the gaps in between." },
      doNow: [
        ["Calculate the mean of 51 cm, 53 cm and 58 cm.", "162 ÷ 3 = 54 cm"],
        ["Material is [[categoric|continuous / categoric]], so the drop test needs a bar chart.", "categoric"],
        ["Each bar in a bar chart shows [[the mean|trial 1 / the mean / the largest reading]].", "the mean"],
      ],
      learnTitle: "Make a pattern visible",
      learn: [
        { t: "p", h: "The question: <strong>How does the height of a ramp affect the distance a trolley travels?</strong> Ramp height is a number on a scale, so it is continuous, and the results go on a line graph." },
        { t: "fig", h: F.ramp() },
        { t: "compare", head: ["Variable", "In the ramp practical"], rows: [["Independent", "ramp height / cm (continuous)"], ["Dependent", "distance travelled / cm, from the bottom of the ramp to where the trolley stops"], ["Control", "same trolley; same ramp; same start line; same floor; released with no push"]] },
        { t: "key", h: "<strong>Why five heights?</strong> Two points can always be joined by a straight line, so two tell you nothing about the shape of the pattern. Five evenly spaced heights, 5 cm to 25 cm, show whether it is straight or curved. The <strong>range</strong> of ramp heights is from 5 cm to 25 cm." },
        { t: "sub", h: "Choose the scale first" },
        { t: "steps", items: ["Find the largest value that has to fit on the axis.", "Count the big squares along that axis.", "Divide, then round <strong>up</strong> to 1, 2, 5, 10, 20 or 50 per big square.", "Check that the largest value still fits."] },
        { t: "worked", q: "Largest mean: 80 cm. There are 9 big squares up the y-axis.", steps: [["Divide", "80 ÷ 9 ≈ 8.9 cm per big square"], ["Round up", "10 cm per big square"], ["Check", "9 × 10 = 90 cm, more than 80 cm ✓"]],
          yt: { q: "Largest value: 45 cm. There are 10 big squares along the axis.", steps: [["Divide", "45 ÷ 10 = 4.5 cm per big square"], ["Round up", "5 cm per big square"], ["Check", "10 × 5 = 50 cm, more than 45 cm ✓"]] } },
        { t: "fig", h: F.scales() },
        { t: "key", h: "<strong>Why 1, 2, 5 or 10?</strong> A big square is ten small squares. If a big square is worth 10, each small square is worth 1; if it is worth 5, each is 0.5. If a big square is worth 3, each small square is 0.3, and plotting 7 means counting 23⅓ small squares. Fill the grid: on a bigger graph, a small slip of the pencil is a smaller error." },
        { t: "sub", h: "Plot precisely" },
        { t: "list", items: ["Independent variable on the x-axis, dependent variable on the y-axis.", "Label each axis with the quantity and the unit: “Ramp height / cm”.", "Plot the <strong>means</strong>, as small crosses: the centre of a × is an exact point; a blob covers several small squares.", "No bars and no dot-to-dot. The line comes in Lesson 5.", "Read each cross back off the graph and compare it with the table. It catches most plotting slips."] },
      ],
      lab: { title: "The ramp", aside: "Record each number the moment you read it: redoing a height because nobody wrote down trial 2 is the biggest time-waster.", blocks: [
        { t: "lab", blocks: [
          { t: "vars", rows: [["Independent variable", "", "ramp height / cm"], ["Dependent variable", "", "distance travelled / cm"], ["Continuous or categoric?", "{{continuous*|categoric}}"], ["Graph type", "{{line graph*|bar chart}}"]] },
          { t: "q", p: "Four control variables. Tick each one off as your group agrees on it.", lines: 2, a: "Same trolley; same start line on the ramp; same floor surface; release with no push (also: same ramp)." },
          { t: "steps", items: ["Set the ramp to 5 cm.", "Put the trolley at the marked start line.", "Release it. Do not push: a push adds energy you cannot measure or repeat.", "Measure the distance from the bottom of the ramp to where the trolley stops.", "Do three trials, then change the height: 10, 15, 20 and 25 cm."] },
          { t: "safety", items: ["Check the ramp is stable before every release.", "Never aim the trolley at a person; keep the lane clear of bags and stools.", "Collect the trolley by hand: do not chase it."] },
        ] },
        { t: "lab", title: "Results", blocks: [
          { t: "table", head: ["Ramp height / cm", "Distance 1 / cm", "Distance 2 / cm", "Distance 3 / cm", "Mean distance / cm"], rh: 10, rows: RAMP.map(([h]) => [String(h), null, null, null, null]), ans: [[0, "18", "21", "21", "20"], [0, "36", "39", "36", "37"], [0, "51", "54", "51", "52"], [0, "64", "69", "65", "66"], [0, "81", "78", "81", "80"]] },
          { t: "q", p: "Choose your scales before you plot. You need your largest mean first.", after: [
            { t: "vars", rows: [["My largest mean", "", "80 cm (sample)"], ["y-axis: each big square is worth", "[[10|1 / 2 / 5 / 10 / 20]] cm"], ["x-axis: each big square is worth", "[[2|1 / 2 / 5 / 10]] cm"]] },
          ] },
        ] },
      ] },
      lab2: { title: "Plot your line graph", aside: "Leave the line until Lesson 5.", blocks: [
        { t: "lab", blocks: [
          { t: "p", h: "Ramp height on the x-axis, mean distance on the y-axis. Plot each mean as a small ×. Label both axes with units, and add a title." },
          { t: "graph", w: 150, h: 100, blank: true, x: [2, 1], y: [10, 1], xLabel: "Ramp height / cm", yLabel: "Mean distance / cm", points: RAMP },
        ] },
        { t: "lab", title: "Mistake hunt", blocks: [
          { t: "checks", title: "Check yours, then swap with a partner", head: ["Mine", "Partner's"], items: ["Units missing from one or both axes", "Scale nobody can read, or not in equal steps", "Graph crammed into one corner of the grid", "Dependent variable on the x-axis by mistake", "Bars drawn instead of plotted points", "Points joined dot-to-dot"] },
          { t: "q", p: "One thing my partner's graph does better than mine:", lines: 1, a: "Open, e.g. “their scale fills the whole grid”." },
        ] },
      ] },
      flow: ["doNow", "learn", "lab", "lab2", "try", "exam", "revise"],
      tryTitle: "Scales and axes",
      try: [
        { t: "q", p: "Draw a ring around the correct answer in each row.", ring: [
          ["Ramp height goes on the", XY, 0],
          ["The mean distance goes on the", XY, 1],
          ["A line graph is right because ramp height is", ["continuous", "categoric"], 0],
        ] },
        { t: "q", p: "Choose the best value for each big square. Draw a ring around one value in each row.", ring: [
          ["Largest value 64 cm, 8 big squares:", ["5 cm", "8 cm", "10 cm"], 2],
          ["Largest value 3.6 s, 8 big squares:", ["0.4 s", "0.45 s", "0.5 s"], 2],
          ["Largest value 170 g, 10 big squares:", ["17 g", "20 g", "50 g"], 1],
        ] },
        { t: "q", say: ["Mia", "I labelled my y-axis 20, 37, 52, 66, 80, the same as my results."], p: "Explain what is wrong with Mia's axis.", lines: 2, a: "An axis must go up in equal steps (e.g. 0, 10, 20 …). Mia's steps are 17, 15, 14, 14, so the points' positions mean nothing." },
        { t: "q", p: "Look at the sample means: 20, 37, 52, 66, 80 cm. For each extra 5 cm of height, the distance goes up by 17, 15, 14 and then 14 cm. Will the graph be a straight line or a curve? Commit to an answer and give your reason.", lines: 2, a: "A gentle curve: the distance keeps rising, but by slightly smaller steps each time." },
      ],
      exam: [
        { tip: "Plot each point as a small × to within half a small square.", p: "A student measures how the temperature of water affects the time for sugar to dissolve. Three points are plotted.", marks: 2,
          table: { head: ["Temperature / °C", "20", "30", "40", "50", "60"], rows: [["Time / s", "80", "62", "48", "38", "31"]] },
          graph: { w: 140, h: 90, x: [5, 2], y: [10, 1], xLabel: "Temperature / °C", yLabel: "Time / s", given: [[20, 80], [30, 62], [40, 48]], points: [[50, 38], [60, 31]] },
          after: [{ t: "part", p: "Plot the results for 50 °C and 60 °C.", a: "(50, 38) (1); (60, 31) (1)" }] },
        { p: "Explain why the temperature is plotted on the x-axis.", marks: 1, lines: 1, a: "It is the independent variable (the one the student changes) (1)." },
        { p: "Why is a line graph the right choice for these results?", marks: 1, lines: 1, a: "Temperature is continuous (1)." },
      ],
      summary: ["Continuous independent variable (ramp height) → line graph.", "Five values, evenly spaced, show the shape of a pattern.", "Scale: largest value ÷ big squares, rounded up to 1, 2, 5, 10, 20 or 50.", "Independent on the x-axis, dependent on the y-axis, units on both.", "Plot the means as small crosses; no dot-to-dot."],
      recall: [["What goes on the x-axis?", "The independent variable (ramp height / cm)."], ["Largest value 45 cm, 10 big squares. Value of each square?", "4.5 → round up to 5 cm."], ["Why plot crosses, not blobs?", "The centre of a cross is an exact point."], ["The trolley veers sideways on some runs. What kind of error?", "Random; use a marked lane."]],
      cando: ["choose a scale that fills the grid", "label axes with quantity and unit", "plot means accurately as small crosses", "explain why ramp height needs a line graph"],
    },

    // ============================================================ 5
    {
      n: 5, accent: "violet", title: "The point that does not fit", practicalName: "None: you analyse your Lesson 4 graph",
      spec: "AQA Working scientifically WS 3.5, 3.6 · Physics and Combined Science",
      mapLine: "Best-fit lines, anomalous results, writing a conclusion with numbers",
      big: "One point is far from all the others. Do you delete it?",
      goals: ["draw a best-fit line, straight or curved, that shows the trend", "explain why dot-to-dot is wrong for measured data", "identify a possible anomalous result and say what to do about it", "write a conclusion supported by numbers"],
      keywords: ["best-fit line", "trend", "anomalous result", "conclusion", "correlation"],
      story: { year: 1985, title: "The readings too strange to believe", text: "British Antarctic Survey scientists found, from measurements on the ground, that the ozone above Antarctica fell sharply every spring. A satellite had recorded the same very low values, but its software flagged them as readings it could not trust. The odd values were not thrown away, and not believed straight away either: they were checked. The ozone hole was real.", punch: "An odd result is a question, not rubbish." },
      doNow: [
        ["The independent variable goes on the [[x-axis|x-axis / y-axis]].", "x-axis"],
        ["Largest value 64 cm, 8 big squares. Each big square should be worth [[10 cm|8 cm / 10 cm / 15 cm]].", "10 cm (64 ÷ 8 = 8, rounded up)"],
        ["Why plot small crosses instead of blobs?", "The centre of a cross marks an exact point; a blob covers several small squares."],
      ],
      learnTitle: "Find the signal",
      learn: [
        { t: "sub", h: "Show the trend with a best-fit line" },
        { t: "fig", h: F.fitTypes() },
        { t: "compare", head: ["Do", "Do not"], plainFirst: true, rows: [
          ["Draw one thin, smooth line: straight (with a ruler) or curved", "Zig-zag from point to point"],
          ["Balance the points: about as many above the line as below", "Force the line through the first and last points"],
          ["Draw it across the range of your data", "Let an anomalous result drag the line towards it"],
        ] },
        { t: "p", h: "<strong>Why may a best-fit line touch none of the points?</strong> Every measurement has some uncertainty, so each point is a little off, some high and some low. The line averages them all at once, the way a mean averages three trials. A dot-to-dot line claims every reading is exactly right, which you proved untrue in Lesson 1." },
        { t: "p", h: "<strong>Straight or curved?</strong> Hold a ruler along the points. If they sit either side of it at random, draw a straight line. If they are above it in the middle and below it at both ends, draw a curve." },
        { t: "sub", h: "Spot the anomalous result" },
        { t: "split", left: [
          { t: "table", head: ["Ramp height / cm", "Mean distance / cm"], rows: [["5", "20"], ["10", "37"], ["15", "52"], ["20", "96"], ["25", "80"]] },
          { t: "p", h: "An <strong>anomalous result</strong> does not fit the pattern of the others. 96 cm is about 30 cm above the line, and it says the trolley went further from a 20 cm ramp than from a 25 cm ramp." },
        ], right: [{ t: "fig", h: F.anomaly() }] },
        { t: "sub", h: "What to do with an anomalous result" },
        { t: "steps", items: ["<strong>Spot it:</strong> it is far from the trend.", "<strong>Check</strong> the recording, the arithmetic and the plotting. Was 66 written as 96?", "<strong>Check</strong> the method and the equipment. Was the trolley pushed? Look at the three trials: often only one is wrong.", "<strong>Repeat</strong> the measurement if you can. Plot as you go, so you can repeat while the equipment is still set up.", "<strong>Mistake found:</strong> correct it and use the corrected value. <strong>No cause found:</strong> keep it, circle it on the graph, report it, and leave it out of the best-fit line."] },
        { t: "warn", h: "<strong>Never silently delete evidence.</strong> The odd point might be real, as the ozone readings were. And if you remove every point that does not fit your line, the line proves nothing." },
        { t: "sub", h: "A conclusion needs a number" },
        { t: "list", items: ["Name both variables, and give the direction: increase or decrease.", "Quote two values with units from your results.", "Say whether the pattern is a straight line or a curve.", "Name any possible anomalous result, or say there is none."] },
        { t: "model", title: "Example conclusion", h: "As the ramp height increased, the mean distance increased: at 5 cm it was 20 cm and at 25 cm it was 80 cm. The height went up 5 times but the distance only 4 times, so the distance is <strong>not directly proportional</strong> to the height; the graph is a gentle curve. Both increase together: a <strong>positive correlation</strong>. Possible anomalous result: 96 cm at 20 cm, far above the line.", breaks: "Directly proportional means a straight line through the origin: double one quantity and the other doubles." },
      ],
      tryTitle: "Best fit and odd points",
      try: [
        { t: "q", p: "Another class got these means in the ramp practical: 5 cm → 20 cm, 10 cm → 37 cm, 15 cm → 52 cm, 20 cm → 96 cm, 25 cm → 80 cm. Plot them and draw a best-fit line through the trend.", graph: { w: 150, h: 100, x: [2.5, 2], y: [10, 1], xLabel: "Ramp height / cm", yLabel: "Mean distance / cm", points: [[5, 20], [10, 37], [15, 52], [20, 96], [25, 80]], curve: [[2, 9], [5, 20], [10, 37], [15, 52], [20, 66], [25, 80], [27, 85]], rings: [[20, 96]] },
          after: [
            { t: "part", p: "<b>a</b> The anomalous result is at {{5 cm|10 cm|15 cm|20 cm*|25 cm}}" },
            { t: "part", p: "<b>b</b> Your best-fit line gives a distance at 20 cm of about [[66|50 / 66 / 80 / 96]] cm." },
          ] },
        { t: "q", p: "Look again at the anomalous result at 20 cm.", after: [
            { t: "part", p: "<b>a</b> Should the class delete it? Write what they should do first, and why.", lines: 2, a: "No. First check how it was recorded and calculated (66 written as 96?) and check the method; repeat it if possible. It might be real, so it is not deleted without a reason." },
            { t: "part", p: "<b>b</b> Give two things that could cause a reading like this in the ramp practical.", lines: 2, a: "Any two: the trolley was pushed; it was released from higher up the ramp; the ramp was set to the wrong height; 66 was written down as 96." },
          ] },
        { t: "q", p: "What is a dot-to-dot line claiming about the measurements? Why is that claim untrue?", lines: 2, a: "It claims every measurement is exactly right. Every measurement has some uncertainty (random error), so the points scatter around the true pattern." },
        { t: "q", type: "Challenge", p: "Mark someone else's graph. A student plotted the spring results below. Tick the <strong>four</strong> problems with the graph.", after: [
          { t: "split", left: [
            { t: "checks", title: "Problem", head: ["✓"], a: [0, 0, 0, 0], items: ["Axes not labelled", "No units", "Points joined dot-to-dot", "Scale squashes the data into one corner", "Too few points", "Dependent variable on the x-axis"] },
          ], right: [
            { t: "table", head: ["Mass / g", "Extension / cm"], rows: [["100", "2.1"], ["200", "4.0"], ["300", "6.2"], ["400", "7.9"], ["500", "10.1"]] },
            { t: "fig", h: F.faultyGraph() },
          ] },
          { t: "part", p: "Redraw the graph properly, with a title, labelled axes, a sensible scale and a best-fit line.", graph: { w: 130, h: 60, blank: true, x: [50, 2], y: [2, 1], xLabel: "Mass / g", yLabel: "Extension / cm", points: [[100, 2.1], [200, 4.0], [300, 6.2], [400, 7.9], [500, 10.1]], fit: [[0, 0], [600, 12]] } },
        ] },
        { t: "q", p: "Which conclusion is best? Tick <strong>one</strong> box.", mcq: { o: ["It went up.", "The distance increased.", "As the ramp height increased, the mean distance increased, from 20 cm at 5 cm to 80 cm at 25 cm.", "The results were good."], c: 2, cols: 1 } },
      ],
      lab: { title: "Finish your own ramp graph", aside: "Go back to your Lesson 4 graph.", blocks: [
        { t: "lab", blocks: [
          { t: "p", h: "Add the best-fit line. Circle any point that is far from it and write a short note beside it. If there are none, write “no anomalous results: all points lie close to the line”. Saying so is worth marks." },
          { t: "checks", title: "Before you call it finished", head: ["✓"], items: ["Title included", "x-axis labelled with the unit", "y-axis labelled with the unit", "Sensible scale, using most of the grid", "Points plotted accurately as small crosses", "One best-fit line, not dot-to-dot", "Anomalous results circled and noted, or “none” written"] },
        ] },
        { t: "lab", title: "Write the conclusion", blocks: [
          { t: "vars", cls: "tall", rows: [["The trend: as the ramp height increased, the distance…", "{{increased*|decreased|stayed the same}}"], ["Evidence: two values from my results, with units", "", "at 5 cm, 20 cm; at 25 cm, 80 cm (sample)"], ["The shape of my graph", "{{straight line|curve}}"], ["A possible source of random error", "", "judging where the trolley stopped; the trolley veering sideways"], ["Possible anomalous result (or “none”), and why", "", "none: all points lie close to the line (sample)"]] },
        ] },
        { t: "lab", title: "Peer review", blocks: [
          { t: "p", h: "Swap booklets. Check your partner's graph against the list above, then give one specific improvement: not “make it neater”." },
          { t: "vars", rows: [["Reviewed by", ""], ["Strongest thing about this graph", ""], ["One specific improvement", "", "e.g. “your x-axis goes up in 3s: use 5s”"]] },
        ] },
      ] },
      flow: ["doNow", "learn", "try", "lab", "exam", "home", "revise"],
      exam: [
        { tip: "A best-fit line shows the trend; it does not have to pass through any point.", p: "A student's best-fit line passes through none of the plotted points. A friend says the line must be wrong. Is the friend right? Explain.", marks: 2, lines: 2, a: "No: a best-fit line shows the overall trend (1); the points should be balanced on either side, and it need not touch any of them (1)." },
        { p: "Give <strong>two</strong> reasons why an anomalous result should not simply be deleted.", marks: 2, lines: 2, a: "It might be a real effect (1); it should be checked and repeated first / deleting inconvenient data is dishonest (1)." },
      ],
      home: { title: "Take it home", blocks: [{ t: "q", p: "Find a graph outside school: a news site, a sports app or an advert. Run it through the graph checklist on the last page.", after: [
        { t: "vars", cls: "tall", rows: [["Where it came from, and what it shows", ""], ["Two things it does well", ""], ["One thing that would lose marks in Year 9", "", "e.g. no units; a y-axis that does not start at zero; uneven scale"]] },
      ] }] },
      summary: ["A best-fit line shows the trend: one smooth line, straight or curved, points balanced either side.", "Dot-to-dot claims every reading is exact: never use it for measured data.", "Anomalous result: check, repeat, then correct it or keep and circle it. Never silently delete.", "A conclusion names both variables, the direction, and quotes values with units."],
      recall: [["What is a best-fit line?", "One smooth line showing the overall trend of the data."], ["Why avoid dot-to-dot?", "It claims every reading is exact."], ["What is an anomalous result?", "A result that does not fit the pattern."], ["What is the first step with an anomalous result?", "Check the recording and plotting, then repeat it."]],
      cando: ["draw a best-fit line, straight or curved", "spot an anomalous result and say what to do about it", "write a conclusion with numbers as evidence"],
    },
  ];

  window.UNIT_LESSONS = (window.UNIT_LESSONS || []).concat(lessons);
})();
