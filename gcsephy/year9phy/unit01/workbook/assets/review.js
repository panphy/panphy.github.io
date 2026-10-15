/* Unit review for Work Like a Physicist: mixed AQA-style exam practice (40 marks), a fix-it log and
   the toolkit page from content.js. Rendered by workbook.js from review.html (add ?answers for the
   answer edition). One entry per printed page, as in content.js; block types are in ../README.md.
   Answers: q's `a` (printed over its lines), [[w|answer]] in a blank, or ans()/tick()/ring() in text. */
(function () {
  "use strict";
  const answers = new URLSearchParams(location.search).has("answers");
  const G = window.PrepGraph;
  const toolkit = window.WORKBOOK.pages.find((pg) => pg.run && pg.run[1] === "THE PHYSICIST'S TOOLKIT");

  const task = (n, title, marks) => ({ type: "task", n, title, tag: `[${marks} marks]` });
  const mk = (n) => `<span class="mk">[${n}]</span>`;
  const q = (l, html, m, lines, a) => ({ type: "q", l, html: mk(m) + html, lines, a });
  const p = (html, extra) => ({ type: "p", html, ...extra });
  const ans = (html) => `<span class="ans">${html}</span>`;
  const box = (on) => `<div class="box-cell${on ? " on" : ""}"></div>`;
  const ring = (opts) => `<span class="ring-box">${opts.map((o) => (o.endsWith("*") ? `<span class="correct">${o.slice(0, -1)}</span>` : `<span>${o}</span>`)).join("")}</span>`;
  const scheme = (html) => ({ type: "html", html: `<div class="mark-note">${html}</div>` });
  const RUN = ["UNIT REVIEW", "MIXED EXAM PRACTICE"];

  // Question 5: deflection of a loaded beam. 400 g is the anomalous result (the trend gives 16 mm).
  const beam = [[100, 4.1], [200, 7.9], [300, 12.2], [400, 13.0], [500, 20.1], [600, 23.9]];

  window.WORKBOOK = {
    title: `Work Like a Physicist - Year 9 Unit Review${answers ? " (Answers)" : ""}`,
    footer: `Work Like a Physicist · Year 9 Unit review${answers ? " · Answers" : ""}`,
    pages: [
      /* 1 */
      { cover: {
        eyebrow: `Year 9 Physics · Unit review${answers ? " · Answer edition" : ""}`,
        title: "Work Like<br>a Physicist",
        lede: "Unit review after Lesson 8: mixed exam-style questions from the whole unit, then a fix-it log for every lost mark.",
        quote: "It doesn’t matter how beautiful your theory is … If it doesn’t agree with experiment, it’s wrong.",
        by: "Richard Feynman, physicist",
        fields: ["Name", "Class", "Teacher", "Score / 40"],
        note: "About 45 minutes · Use the toolkit on the next page only after you have tried every question",
      } },

      /* 2 */
      toolkit,

      /* 3 */
      { run: RUN, lead: { badge: "UNIT REVIEW", title: "Mixed exam practice", subtitle: "40 marks · about 45 minutes · show your working in every calculation" }, blocks: [
        task(1, "Timing a toy car", 6),
        p("A student times how long a toy car takes to roll down a ramp from two different heights."),
        { type: "table", cls: "num bf", align: ["", "r", "r", "r", "r"], head: ["Ramp height / cm", "Trial 1 / s", "Trial 2 / s", "Trial 3 / s", "Mean / s"], rows: [["10", "1.52", "1.48", "1.50", "1.50"], ["20", "1.10", "1.14", "1.12", { html: ans("1.12") }]] },
        q("a", "Calculate the mean time for the 20 cm ramp. Write it in the table.", 2, 2, "mean = (1.10 + 1.14 + 1.12) ÷ 3 = 3.36 ÷ 3 (1)<br>= 1.12 s (1)"),
        q("b", "Calculate the uncertainty in the mean time for the 20 cm ramp. Use: uncertainty = (largest − smallest) ÷ 2", 2, 2, "(1.14 − 1.10) ÷ 2 (1)<br>= 0.02 s (1)"),
        q("c", "The stopwatch reads to 0.01 s. State its resolution. [[30|0.01 s]]", 1, 0),
        q("d", "Suggest why using light gates would give more accurate times than a stopwatch.", 1, 2, "There is no human reaction time when starting and stopping the timer (1)"),
        task(2, "Keeping it warm", 5),
        p("A student investigates how the <b>thickness of insulation</b> around a beaker of hot water affects the <b>temperature drop</b> in 10 minutes."),
        q("a", "Name the independent variable. [[60|thickness of insulation]]", 1, 0),
        q("b", "Name the dependent variable. [[60|temperature drop (in 10 minutes)]]", 1, 0),
        q("c", "Name <b>two</b> control variables.", 2, 2, "Any two (1 each): volume of water, starting temperature, type of insulation, room temperature, size of beaker"),
        q("d", `The thickness of insulation is ${ring(["categoric", "continuous*"])} so the results should be shown on a ${ring(["bar chart", "line graph*"])}`, 1, 0, "both needed (1)"),
      ] },

      /* 4 */
      { run: RUN, blocks: [
        task(3, "Random or systematic?", 4),
        q("a", "Tick <b>one</b> box in each row.", 3, 0),
        { type: "table", cls: "checks", widths: ["", "26mm", "26mm"], align: ["", "c", "c"], head: ["Problem", "Random error", "Systematic error"], rows: [
          ["A newtonmeter reads 0.5 N with nothing hanging on it.", box(false), box(true)],
          ["The person timing reacts a little differently in each trial.", box(true), box(false)],
          ["A scale is always read from slightly above, at the same angle.", box(false), box(true)],
        ] },
        q("b", "How should the student correct every reading from the newtonmeter?", 1, 1, "Subtract 0.5 N from each reading (or zero the newtonmeter first) (1)"),
        task(4, "Precise or accurate?", 4),
        p("Three students measure the length of a rod. Its true length is <b>50.0 cm</b>."),
        { type: "table", cls: "num bf", align: ["", "r", "r", "r"], head: ["Student", "Reading 1 / cm", "Reading 2 / cm", "Reading 3 / cm"], rows: [["A", "49.9", "50.1", "50.0"], ["B", "48.2", "48.3", "48.2"], ["C", "47.0", "52.5", "50.4"]] },
        q("a", `Whose readings are precise but <b>not</b> accurate? ${ring(["A", "B*", "C"])}`, 1, 0),
        q("b", `Whose readings are both precise and accurate? ${ring(["A*", "B", "C"])}`, 1, 0),
        q("c", "The mean of C’s readings is 49.97 cm, very close to the true length. Explain why C’s readings are still not precise.", 2, 4,
          "The readings are spread out, from 47.0 cm to 52.5 cm (1)<br>so they are not close to each other; random errors cancel out in the mean (1)"),
      ] },

      /* 5 */
      { run: RUN, blocks: [
        task(5, "A sagging beam", 9),
        p("A student hangs masses on the middle of a wooden beam and measures how far it sags (the deflection)."),
        { type: "table", cls: "num bf", align: ["", "r", "r", "r", "r", "r", "r"], head: ["Mass / g", "100", "200", "300", "400", "500", "600"], rows: [["Deflection / mm", "4.1", "7.9", "12.2", "13.0", "20.1", "23.9"]] },
        { type: "html", html: `<div style="width:125mm;margin:0 auto">${G({ xmax: 700, ymax: 28, xstep: 100, ystep: 4, h: 68, xlabel: "Mass / g", ylabel: "Deflection / mm", pts: beam.slice(0, 4), ansPts: beam.slice(4), rings: [[400, 13.0]], line: [[0, 0], [700, 28]], guides: [[250, 10]], alt: "Deflection against mass, four points plotted" })}</div>` },
        q("a", "Plot the results for 500 g and 600 g on the graph.", 2, 0, "(500, 20.1) (1); (600, 23.9) (1), each within half a small square"),
        q("b", "Draw a ring around the anomalous result.", 1, 0, "400 g, 13.0 mm (1)"),
        q("c", "Draw a line of best fit.", 1, 0, "One ruled straight line through the origin and the other points, ignoring 400 g (1)"),
        q("d", "Use your graph to find the deflection for a mass of 250 g. [[24|10 mm]] mm", 1, 0),
        q("e", "What should the student do about the anomalous result?", 1, 1, "Repeat the 400 g measurement (and leave it out of the line if it is still anomalous) (1)"),
        q("f", "Write a conclusion. Use the shape of the graph.", 2, 2, "The deflection is directly proportional to the mass (1)<br>because the graph is a straight line through the origin (1)"),
        q("g", "Explain why a line graph is the right choice for these results.", 1, 1, "Mass (the independent variable) is continuous (1)"),
      ] },

      /* 6 */
      { run: RUN, blocks: [
        task(6, "Choosing a graph", 3),
        p("Tick <b>one</b> box in each row to show how the results should be presented."),
        { type: "table", cls: "checks", widths: ["", "26mm", "26mm"], align: ["", "c", "c"], head: ["Investigation", "Bar chart", "Line graph"], rows: [
          ["How the type of ball affects its bounce height", box(true), box(false)],
          ["How the temperature of a wire affects its resistance", box(false), box(true)],
          ["How the colour of a surface affects its temperature rise in sunlight", box(true), box(false)],
        ] },
        { type: "p", html: ans("One mark for each correct row (3)"), mb: 2 },
        task(7, "Plan an investigation", 6),
        p("A student wants to find out how the <b>height</b> a ball is dropped from affects the <b>height it bounces</b>. Describe a method the student could use. Include how to make it a fair test and how to make the results repeatable."),
        { type: "lines", n: 11 },
        scheme("<b>Mark scheme.</b> Level 3 (5–6): a clear, logical method a stranger could follow, with the variables controlled and repeats used. Level 2 (3–4): a method with some detail, missing a step or a control. Level 1 (1–2): simple statements, not in a logical order. Points: drop the ball from a measured height using a metre rule held vertically; measure the bounce height at eye level (or film it against the rule); change the drop height, at least five values (e.g. 20 to 100 cm); same ball, same surface, release without pushing; repeat each height three times and calculate a mean; check any anomalous result; plot bounce height against drop height."),
      ] },

      /* 7 */
      { run: RUN, blocks: [
        task(8, "Whose results can you trust?", 3),
        p("Two groups did the bounce investigation. Group A took one reading for each drop height. Group B took three readings and calculated a mean."),
        q("a", "Explain why Group B’s results are more trustworthy.", 2, 2, "Repeats show whether the readings are close together / let anomalous results be spotted (1)<br>the mean reduces the effect of random errors (1)"),
        q("b", "Group B publishes their results so that other scientists can check them. What is this called? [[50|peer review]]", 1, 0),
        { type: "spacer", mm: 4 },
        { type: "task", n: "✓", title: "Fix-it log", tag: "Turn every lost mark into a target" },
        p("Mark your answers with your teacher. For each mark you lost, write what went wrong and the correct physics, then the lesson to look back at."),
        { type: "table", cls: "bf", widths: ["12mm", "", "", "26mm"], head: ["Q", "What went wrong?", "The correct physics (or method) is…", "Lesson to revisit"], rh: 15, rows: Array.from({ length: 9 }, () => ["", "", "", ""]) },
        { type: "box", eyebrow: "Score", paras: ["My score: [[16]] / 40 &nbsp;&nbsp; Two things I will practise before the next test: [[90]]"] },
      ] },
    ],
  };
})();
