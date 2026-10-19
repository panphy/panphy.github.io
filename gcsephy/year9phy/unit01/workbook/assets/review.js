/* Unit review for Work Like a Physicist: mixed AQA-style exam practice from the whole unit
   (workbook.html?review, 40 marks). Question fields are those of the lesson Exam corners (see
   workbook.js, question()); each part carries its own marks, and the answers give one (1) per
   mark point. Adds window.UNIT.review. */
(function () {
  "use strict";

  // Question 5: deflection of a loaded beam. 400 g is the anomalous result (the trend gives 16 mm).
  const beam = [[100, 4.1], [200, 7.9], [300, 12.2], [400, 13.0], [500, 20.1], [600, 23.9]];

  window.UNIT.review = [
    { p: "<strong>Timing a toy car.</strong> A student times how long a toy car takes to roll down a ramp from two different heights.",
      table: { head: ["Ramp height / cm", "Trial 1 / s", "Trial 2 / s", "Trial 3 / s", "Mean / s"], rows: [["10", "1.52", "1.48", "1.50", "1.50"], ["20", "1.10", "1.14", "1.12", null]], ans: [0, [0, 0, 0, 0, "1.12"]] },
      after: [
        { t: "part", p: "(a) Calculate the mean time for the 20 cm ramp. Write it in the table.", marks: 2, lines: 2, a: "(1.10 + 1.14 + 1.12) ÷ 3 = 3.36 ÷ 3 (1)<br>= 1.12 s (1)" },
        { t: "part", p: "(b) Calculate the uncertainty in the mean time for the 20 cm ramp. Use uncertainty = (largest − smallest) ÷ 2", marks: 2, lines: 2, a: "(1.14 − 1.10) ÷ 2 (1)<br>= 0.02 s (1)" },
        { t: "part", p: "(c) The stopwatch reads to 0.01 s. Its resolution is {{0.01 s*|0.1 s|1 s}}", marks: 1 },
        { t: "part", p: "(d) Suggest <strong>one</strong> advantage of using light gates instead of a hand-operated stopwatch.", marks: 1, lines: 1, a: "There is no human reaction time when starting and stopping the timer (1)." },
      ] },

    { p: "<strong>Keeping it warm.</strong> A student investigates how the <strong>thickness of insulation</strong> around a beaker of hot water affects the <strong>temperature drop</strong> in 10 minutes.",
      after: [
        { t: "part", p: "(a) The independent variable is {{the thickness of insulation*|the temperature drop|the starting temperature}}", marks: 1 },
        { t: "part", p: "(b) The dependent variable is {{the thickness of insulation|the temperature drop*|the volume of water}}", marks: 1 },
        { t: "part", p: "(c) Name <strong>two</strong> control variables.", marks: 2, lines: 2, a: "Any two (1 each): volume of water; starting temperature; type of insulation; room temperature; size of beaker." },
        { t: "part", p: "(d) The thickness of insulation is {{categoric|continuous*}} so the results should be shown on a {{bar chart|line graph*}}", marks: 1, a: "Both needed (1)." },
      ] },

    { p: "<strong>Random or systematic?</strong>",
      after: [
        { t: "part", p: "(a) Tick <strong>one</strong> box in each row.", marks: 3, after: [
          { t: "checks", title: "Problem", head: ["Random error", "Systematic error"], a: [1, 0, 1], items: ["A newtonmeter reads 0.5 N with nothing hanging on it.", "The person timing reacts a little differently in each trial.", "A scale is always read from slightly above, at the same angle."] },
        ], a: "One mark for each correct row (3)." },
        { t: "part", p: "(b) How should the student correct every reading from the newtonmeter?", marks: 1, lines: 1, a: "Subtract 0.5 N from each reading (or zero the newtonmeter first) (1)." },
      ] },

    { p: "<strong>Precise or accurate?</strong> Three students measure the length of a rod. Its true length is <strong>50.0 cm</strong>.",
      table: { head: ["Student", "Reading 1 / cm", "Reading 2 / cm", "Reading 3 / cm"], rows: [["A", "49.9", "50.1", "50.0"], ["B", "48.2", "48.3", "48.2"], ["C", "47.0", "52.5", "50.4"]] },
      after: [
        { t: "part", p: "(a) Whose readings are precise but <strong>not</strong> accurate? {{A|B*|C}}", marks: 1 },
        { t: "part", p: "(b) Whose readings are both precise and accurate? {{A*|B|C}}", marks: 1 },
        { t: "part", p: "(c) The mean of C’s readings is 49.97 cm, very close to the true length. Explain why C’s readings are still not precise.", marks: 2, lines: 3, a: "The readings are spread out, from 47.0 cm to 52.5 cm, so they are not close to each other (1);<br>the random errors happen to cancel out in the mean (1)." },
      ] },

    { p: "<strong>A sagging beam.</strong> A student hangs masses on the middle of a wooden beam and measures how far it sags (the deflection).",
      table: { head: ["Mass / g", "100", "200", "300", "400", "500", "600"], rows: [["Deflection / mm", "4.1", "7.9", "12.2", "13.0", "20.1", "23.9"]] },
      graph: { w: 140, h: 70, x: [50, 2], y: [4, 1], xLabel: "Mass / g", yLabel: "Deflection / mm", given: beam.slice(0, 4), points: beam.slice(4), rings: [[400, 13.0]], fit: [[0, 0], [700, 28]], guide: [250, 10] },
      after: [
        { t: "part", p: "(a) Plot the results for 500 g and 600 g on the graph.", marks: 2, a: "(500, 20.1) (1); (600, 23.9) (1), each within half a small square." },
        { t: "part", p: "(b) Draw a ring around the anomalous result.", marks: 1, a: "400 g, 13.0 mm (1)." },
        { t: "part", p: "(c) Draw a line of best fit.", marks: 1, a: "One ruled straight line through the origin and the other points, ignoring 400 g (1)." },
        { t: "part", p: "(d) Use your graph to find the deflection for a mass of 250 g. Deflection = [[10|20]] mm", marks: 1 },
      ] },
    { part: true, p: "<strong>A sagging beam</strong> (continued).", after: [
        { t: "part", p: "(e) What should the student do about the anomalous result?", marks: 1, lines: 1, a: "Repeat the 400 g measurement (and leave it out of the line if it is still anomalous) (1)." },
        { t: "part", p: "(f) Write a conclusion. Use the shape of the graph.", marks: 2, lines: 2, a: "The deflection is directly proportional to the mass (1)<br>because the graph is a straight line through the origin (1)." },
        { t: "part", p: "(g) Explain why a line graph is the right choice for these results.", marks: 1, lines: 1, a: "Mass, the independent variable, is continuous (1)." },
      ] },

    { p: "<strong>Choosing a graph.</strong> Tick <strong>one</strong> box in each row to show how the results should be presented.", marks: 3, after: [
      { t: "checks", title: "Investigation", head: ["Bar chart", "Line graph"], a: [0, 1, 0], items: ["How the type of ball affects its bounce height", "How the temperature of a wire affects its resistance", "How the colour of a surface affects its temperature rise in sunlight"] },
    ], a: "One mark for each correct row (3)." },

    { p: "<strong>Plan an investigation.</strong> A student wants to find out how the <strong>height</strong> a ball is dropped from affects the <strong>height it bounces</strong>. Describe a method the student could use. Include how to make it a fair test and how to make the results repeatable.", marks: 6, lines: 11,
      a: "<b>Level 3 (5–6):</b> a clear, logical method a stranger could follow, with the variables controlled and repeats used. <b>Level 2 (3–4):</b> a method with some detail, missing a step or a control. <b>Level 1 (1–2):</b> simple statements, not in a logical order. <b>Points:</b> drop the ball from a measured height using a metre rule held vertically; measure the bounce height at eye level (or film it against the rule); change the drop height, at least five values (e.g. 20 to 100 cm); same ball, same surface, release without pushing; repeat each height three times and calculate a mean; check any anomalous result; plot bounce height against drop height." },

    { p: "<strong>Whose results can you trust?</strong> Two groups did the bounce investigation. Group A took one reading for each drop height. Group B took three readings and calculated a mean.",
      after: [
        { t: "part", p: "(a) Explain why Group B’s results are more trustworthy.", marks: 2, lines: 2, a: "Repeats show whether the readings are close together / let anomalous results be spotted (1);<br>the mean reduces the effect of random errors (1)." },
        { t: "part", p: "(b) Group B publish their method and results so that other scientists can check them. This is called {{a fair test|peer review*|a control variable}}", marks: 1 },
      ] },
  ];
})();
