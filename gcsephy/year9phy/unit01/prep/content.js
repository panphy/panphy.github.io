/* Prep sheets for Work Like a Physicist: one per two lessons, 10 marks each.
   Do Now questions are from the Do Now bank (gcsephy/do-now/questions.csv, by Number); the rest checks the key ideas
   of the two lessons. Rendered by /gcsephy/assets/prep/prep.js, which documents the fields. */
(function () {
  "use strict";
  const G = window.PrepGraph, T = window.PrepTable;

  // Prep 3: paper helicopter, fall time against wing length; 8 cm is the anomalous result.
  const heli = [[4, 1.2], [6, 1.5], [8, 1.4], [10, 2.1], [12, 2.4]];

  window.PREP = {
    year: 9,
    unit: "Work Like a Physicist",
    file: "Work Like a Physicist - Year 9",
    preps: [
      /* 1 */
      { lessons: "1–2", title: "Can this data be trusted?", subtitle: "Mean and uncertainty · random and systematic errors · variables and choosing a graph",
        doNow: [
          [852, "Define the resolution of a measuring instrument.", "The smallest change the instrument can detect."],
          [860, "Describe the effect of a random error on a set of readings.", "It scatters the readings unpredictably (some too high, some too low)."],
          [864, "State how the effect of random error can be reduced.", "Take more repeats and calculate a mean."],
        ],
        questions: [
          { stem: "A student times a toy car rolling down a ramp three times: <b>2.31 s</b>, <b>2.45 s</b> and <b>2.38 s</b>.",
            parts: [
              { q: "Calculate the mean time.", m: 2, lines: 2, a: "mean = total ÷ number of trials = (2.31 + 2.45 + 2.38) ÷ 3 = 7.14 ÷ 3 ✓<br>= 2.38 s ✓" },
              { q: "Calculate the uncertainty in the mean. Use uncertainty = (largest − smallest) ÷ 2", m: 1, lines: 1, a: "(2.45 − 2.31) ÷ 2 = 0.14 ÷ 2 = 0.07 s ✓" },
            ] },
          { stem: "A balance reads 0.2 g when nothing is on it. The student uses it to measure the mass of a ball five times.",
            parts: [
              { q: "This causes a {{random|systematic*}} error.", m: 1, lines: 0 },
              { q: "Explain why taking more repeats will not fix this error.", m: 1, lines: 1, a: "Every reading is shifted by the same amount (0.2 g too high), so the mean is shifted too ✓" },
            ] },
          { stem: "A student investigates how the <b>type of surface</b> affects the <b>distance</b> a toy car travels.",
            parts: [
              { q: "The dependent variable is [[the distance travelled|50]] <span class=\"opts\">(the type of surface / the distance travelled / the mass of the car)</span>", m: 1, lines: 0 },
              { q: "Draw a ring around the correct graph: {{bar chart*|line graph}} Give the reason.", m: 1, lines: 1, a: "The independent variable (type of surface) is categoric ✓" },
            ] },
        ] },

      /* 2 */
      { lessons: "3–4", title: "Drop tests and ramps", subtitle: "Repeats and means · bar charts · choosing a scale · plotting a line graph",
        doNow: [
          [851, "Define accuracy.", "How close a measurement is to the true value."],
          [870, "What is the independent variable?", "The one variable that is deliberately changed."],
          [882, "Name the type of graph used when the independent variable is continuous.", "A line graph"],
        ],
        questions: [
          { stem: "A ball is dropped onto three materials. The table shows its bounce height.",
            fig: T(["Material", "Trial 1 / cm", "Trial 2 / cm", "Trial 3 / cm", "Mean / cm"], [["Foam", "12", "14", "13", "13"], ["Bubble wrap", "20", "23", "20", "[[21|16]]"], ["Carpet", "31", "28", "31", "30"]]),
            parts: [
              { q: "Calculate the mean bounce height for bubble wrap. Write it in the table.", m: 1, lines: 1, a: "(20 + 23 + 20) ÷ 3 = 63 ÷ 3 = 21 cm ✓" },
              { q: "Which material is the best shock absorber? Give the reason.", m: 1, lines: 1, a: "Foam, because it gives the lowest (mean) bounce ✓" },
              { q: "Explain why these results are shown on a bar chart.", m: 1, lines: 1, a: "The independent variable (material) is categoric ✓" },
            ] },
          { stem: "In the ramp practical, a trolley leaves a ramp and travels across the floor.",
            fig: T(["Ramp height / cm", "5", "10", "15", "20", "25"], [["Mean distance / cm", "22", "41", "63", "80", "101"]]),
            side: G({ xmax: 30, ymax: 120, xstep: 5, ystep: 20, h: 62, xlabel: "Ramp height / cm", ylabel: "Mean distance / cm", pts: [[5, 22], [10, 41], [15, 63]], ansPts: [[20, 80], [25, 101]], alt: "Mean distance against ramp height, three points plotted" }),
            cols: "1.05fr 1fr",
            parts: [
              { q: "Plot the last two points on the graph.", m: 2, lines: 0, a: "(20, 80) ✓ (25, 101) ✓" },
              { q: "On a different graph, the largest value on the y-axis is 118 cm and there are 10 big squares. Draw a ring around the best value for each big square: {{10 cm|15 cm|20 cm*|50 cm}}", m: 1, lines: 0 },
              { q: "Name one control variable in the ramp practical.", m: 1, lines: 1, a: "e.g. same trolley, same floor surface ✓" },
            ] },
        ] },

      /* 3 */
      { lessons: "5–6", title: "The point that does not fit", subtitle: "Best-fit lines · anomalous results · conclusions · directly proportional",
        doNow: [
          [861, "Describe the effect of a systematic error on a set of readings.", "It shifts every reading in the same direction by the same amount."],
          [885, "State which variable is plotted on the x-axis of a graph.", "The independent variable"],
          [887, "State two things every axis of a graph must have.", "A label (the quantity) and a unit"],
        ],
        questions: [
          { stem: "A student drops paper helicopters with different wing lengths and times how long each takes to fall. The graph shows the mean fall times.",
            side: G({ xmax: 14, ymax: 3, xstep: 2, ystep: 0.5, h: 66, xlabel: "Wing length / cm", ylabel: "Mean fall time / s", pts: heli, rings: [[8, 1.4]], line: [[2, 0.9], [13, 2.55]], alt: "Mean fall time against wing length with one point below the trend" }),
            cols: "1fr 1fr",
            parts: [
              { q: "Draw a ring around the anomalous result.", m: 1, lines: 0, a: "(8 cm, 1.4 s) ✓" },
              { q: "Draw a best-fit line.", m: 1, lines: 0, a: "One ruled straight line through the other four points, ignoring 8 cm ✓" },
              { q: "What should the student do about the anomalous result?", m: 1, lines: 2, a: "Check it and repeat the 8 cm drops; if it is still odd, leave it out of the best-fit line ✓" },
              { q: "Is fall time directly proportional to wing length? {{yes|no*}} Explain.", m: 1, lines: 1, a: "The line does not pass through the origin (0, 0) ✓" },
            ] },
          { q: "Write a conclusion for this investigation. Use values from the graph.", m: 2, lines: 2,
            a: "As the wing length increases, the fall time increases ✓<br>e.g. from 1.2 s at 4 cm to 2.4 s at 12 cm (values with units) ✓" },
          { q: "The student timed each drop with a stopwatch. Name one random error and how to reduce it.", m: 1, lines: 1, a: "Reaction time starting or stopping the watch; take repeats and calculate a mean ✓" },
        ] },

      /* 4 */
      { lessons: "7–8", title: "Your investigation", subtitle: "Planning a fair test · dealing with odd repeats · evaluating and improving a method",
        doNow: [
          [873, "Explain why control variables must be kept the same.", "If two variables change together, you cannot tell which one caused the result."],
          [856, "State how uncertainty is calculated from a set of repeated readings.", "Uncertainty = (largest reading − smallest reading) ÷ 2"],
          [895, "What is an anomalous result?", "A result that does not fit the pattern of the others."],
        ],
        questions: [
          { stem: "A group investigates how the <b>length of a pendulum</b> affects the <b>time for 10 swings</b>.",
            parts: [
              { q: "Name two control variables.", m: 1, lines: 1, a: "Any two: mass of the bob, starting angle (how far it is pulled back), the same person timing ✓" },
              { q: "Explain why they time 10 swings instead of one.", m: 1, lines: 2, a: "One swing is very short; the reaction-time error is a much smaller part of a longer time (so the result is more accurate) ✓" },
            ] },
          { stem: "One row of their results:",
            fig: T(["Length / cm", "Trial 1 / s", "Trial 2 / s", "Trial 3 / s", "Mean / s"], [["40", "12.6", "12.8", "15.9", "[[12.7|16]]"]]),
            parts: [
              { q: "Which trial is anomalous? {{Trial 1|Trial 2|Trial 3*}}", m: 1, lines: 0 },
              { q: "Calculate the mean, leaving out the anomalous result. Write it in the table.", m: 1, lines: 1, a: "(12.6 + 12.8) ÷ 2 = 25.4 ÷ 2 = 12.7 s ✓" },
            ] },
          { q: "Evaluate the method: give <b>one</b> improvement, and explain how it makes the results better.", m: 2, lines: 3,
            a: "Improvement, e.g. use a fiducial (marker) line at the centre of the swing / use a light gate / take more repeats ✓<br>Why, e.g. easier to see when to start and stop the watch, so less random error ✓" },
          { q: "Their graph is a curve. Should they join the points dot-to-dot? {{yes|no*}} Give the reason.", m: 1, lines: 1, a: "No: draw one smooth best-fit curve showing the trend, not every reading ✓" },
        ] },
    ],
  };
})();
