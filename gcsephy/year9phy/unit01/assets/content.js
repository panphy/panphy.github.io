/* Assembles the Work Like a Physicist workbook (assets/workbook.js) from the lesson files
   (lessons-a.js, lessons-b.js, lessons-c.js) and adds the Physicist's toolkit, the key words and the
   "phrases that pick up marks". Key words and phrases carry the lesson that introduces them, so each
   part lists only those met so far (Lessons 7-8 are lesson 7). */
(function () {
  "use strict";

  const glossary = [
    ["Accurate", "Close to the true value", 1],
    ["Precise", "Repeat readings are close to each other: little spread about the mean", 1],
    ["Trial", "One repeat of a measurement", 1],
    ["Mean", "The total of the trials divided by the number of trials", 1],
    ["Uncertainty", "The interval within which the true value can be expected to lie. From repeats: (largest − smallest) ÷ 2", 1],
    ["Range", "The maximum and minimum values of the independent or dependent variables, stated “from … to …”", 1],
    ["Resolution", "The smallest change a measuring instrument can detect", 1],
    ["Random error", "Unpredictable spread between repeats. Repeats and a mean reduce it", 1],
    ["Systematic error", "An error that shifts every reading by the same amount in the same direction. Repeats do not fix it", 1],
    ["Zero error", "An instrument reads a value when it should read zero: a systematic error", 1],
    ["Repeatable", "The same person, method and equipment give similar results again", 1],
    ["Reproducible", "Another person, or different equipment or method, gives similar results", 1],
    ["Independent variable", "The one thing you change", 2],
    ["Dependent variable", "The thing you measure", 2],
    ["Control variable", "Something you keep the same so it cannot affect the result", 2],
    ["Fair test", "Only the independent variable changes; all the control variables are kept the same", 2],
    ["Continuous data", "Numbers that can take any value on a scale, such as length, time or mass", 2],
    ["Categoric data", "Names or groups, such as material, colour or brand", 2],
    ["Line graph", "The graph to use when the independent variable is continuous", 2],
    ["Bar chart", "The graph to use when the independent variable is categoric", 2],
    ["Scale", "The numbers along an axis, going up in equal steps", 4],
    ["Best-fit line", "One straight or curved line showing the overall trend, with points balanced on either side", 5],
    ["Anomalous result", "A result that does not fit the pattern of the others", 5],
    ["Positive correlation", "As one variable increases, the other increases too", 5],
    ["Directly proportional", "Double one, and the other doubles: a straight line through the origin", 5],
    ["Conclusion", "What the results show overall, with numbers as evidence", 5],
    ["Prediction", "A statement of what you expect to happen, with a reason", 6],
    ["Evaluation", "A judgement of how good the method and results were, with improvements", 6],
    ["Peer review", "Checking someone else's work to find its weaknesses before it is shared", 7],
  ];

  // [instead of, write, lesson]
  const phrases = [
    ["“It was human error.”", "“Reaction time when starting the stopwatch caused random error.”", 1],
    ["“The results were good.”", "“The repeats were close together, so the data is precise.”", 1],
    ["“It's a bar chart.”", "“A bar chart was used because material type is categoric.”", 2],
    ["“Keep it a fair test.”", "“Use the same trolley and the same start line each time.”", 2],
    ["“We did it three times.”", "“Three trials were taken at each value so that a mean could be calculated.”", 3],
    ["“It went up.”", "“As the ramp height increased, the mean distance increased from 20 cm to 80 cm.”", 5],
    ["“One result was weird.”", "“The value at 20 cm is a possible anomalous result: it is far above the trend.”", 5],
    ["“Be more careful.”", "“Film the drops and time them from the video, so reaction time does not matter.”", 6],
  ];

  const table = (rows) => `<table>${rows.map(([a, b]) => `<tr><td>${a}</td><td>${b}</td></tr>`).join("")}</table>`;
  const toolkit = {
    cards: [
      { title: "The three variables", h: table([["Independent", "the one thing you change"], ["Dependent", "the thing you measure"], ["Control", "everything you keep the same"]]) + "<p>Ask: “How does <em>independent</em> affect <em>dependent</em>?”</p>" },
      { title: "Two kinds of data", h: table([["Continuous", "any value on a scale: length, time, mass → <strong>line graph</strong>"], ["Categoric", "names or groups: material, colour → <strong>bar chart</strong>"]]) + "<p>Test: is there a value in between?</p>" },
      { title: "The two calculations", h: '<div class="calc">mean = total of the trials ÷ number of trials</div><div class="calc">uncertainty = (largest − smallest) ÷ 2</div><p>Write the result as mean ± uncertainty, e.g. 1.22 s ± 0.03 s.</p>' },
      { title: "Precise or accurate?", h: table([["Precise", "repeats close <em>to each other</em>"], ["Accurate", "close <em>to the true value</em>"], ["Resolution", "the smallest change an instrument can detect"]]) + "<p>You can be precise and still wrong.</p>" },
      { title: "The two errors", h: table([["Random", "scatters repeats both ways. <strong>Repeat and take a mean.</strong>"], ["Systematic", "shifts every reading the same way. <strong>Find the cause; repeats do not help.</strong>"]]) },
      { title: "Choosing a scale", h: "<p>Largest value ÷ number of big squares, then round <strong>up</strong> to 1, 2, 5, 10, 20 or 50 per big square. Equal steps. Use most of the grid.</p>" },
      { title: "Anomalous results", h: "<p><strong>Spot</strong> it (far from the trend) → <strong>check</strong> the recording, maths and method → <strong>repeat</strong> if you can. Mistake found: correct it. No cause: keep it, circle it, report it, and leave it out of the best-fit line. Never delete it silently.</p>" },
      { title: "Conclusion and evaluation", h: "<p><strong>Conclude:</strong> “As X increased, Y increased”, with two values and units. Straight or curved?</p><p><strong>Evaluate:</strong> a strength, a weakness, a named error, and an improvement that fixes it. Never just “human error”.</p>" },
      { title: "Graph checklist", cls: "wide", h: "<ul><li>Title: what against what</li><li>Independent variable on the x-axis</li><li>Both axes labelled, with units: “Ramp height / cm”</li><li>Scale in equal steps that fills the grid</li><li>Means plotted as small, accurate crosses</li><li>One best-fit line: never dot-to-dot</li><li>Bar chart: equal bars, equal gaps, axis from 0</li><li>Anomalous results circled, or “none”</li></ul>" },
    ],
  };

  window.UNIT = { lessons: (window.UNIT_LESSONS || []).sort((a, b) => a.n - b.n), glossary, phrases, toolkit };
})();
