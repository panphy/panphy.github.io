/* Words and graphs for the Lesson 5 worksheet (2 pages). Rendered by ../../workbook/assets/workbook.js.
   Block types are listed in ../../workbook/README.md; graphs come from graphs.js. */
(function () {
  "use strict";
  const { DATA, graph } = window.WSG;
  const task = (n, title, tag) => ({ type: "task", n, title, tag });
  const q = (l, html, lines) => ({ type: "q", l, html, lines });
  const p = (html, extra) => ({ type: "p", html, ...extra });
  const g = (o) => ({ type: "html", html: graph(o) });

  const RUN1 = ["LESSON 5 WORKSHEET", "BEST-FIT LINES AND CURVES"];
  const RUN2 = ["LESSON 5 WORKSHEET", "ANOMALOUS RESULTS AND PROPORTIONALITY"];

  const mini = (cap, o) => `<div class="mini"><div class="cap">${cap}</div>${graph({ ...o, mini: true, h: 86, xmax: 8, ymax: 16, xstep: 2, ystep: 4, pts: DATA.trend })}<div class="opts"><span><i></i>Good</span><span><i></i>Not good</span></div><div class="why">Why:</div></div>`;
  const trend = DATA.trend;

  window.WORKBOOK = {
    title: "Work Like a Physicist - Lesson 5 Worksheet",
    footer: "Work Like a Physicist · Lesson 5 Worksheet",
    pages: [
      /* 1 */
      { run: RUN1, lead: { badge: "LESSON 5 WORKSHEET", title: "Draw the trend, not the dots", subtitle: "Practise best-fit straight lines and best-fit curves" },
        blocks: [
          p("<b>Name</b> [[62]] &nbsp; <b>Class</b> [[26]] &nbsp; <b>Date</b> [[26]]", { mb: 3 }),
          { type: "key", big: ["A best-fit line shows the trend, not every measurement."], small: "Straight trend: use a ruler. Curved trend: one smooth freehand curve. Aim for roughly as many points above as below.", style: "padding:9pt 14pt" },
          { type: "split", cols: "1fr 1fr", gap: 6,
            left: [
              task(1, "A straight line", "Spring"),
              p("A spring stretches as masses are added. Draw the best-fit <b>straight line</b> with a ruler."),
              g({ xmax: 800, ymax: 18, xstep: 100, ystep: 2, xlabel: "Mass added / g", ylabel: "Extension / cm", pts: DATA.spring, h: 86, alt: "Extension of a spring against mass added" }),
              q("a", "Predict the extension for 350 g: [[18]] cm", 0),
              q("b", "Points above / below your line: [[12]] / [[12]]", 0),
            ],
            right: [
              task(2, "A curve", "Cooling"),
              p("Hot water cools in a room. The trend bends, so draw one smooth <b>curve</b>, not a ruler line."),
              g({ xmax: 14, ymax: 100, xstep: 2, ystep: 10, xlabel: "Time / min", ylabel: "Temperature / °C", pts: DATA.cooling, h: 86, alt: "Temperature of cooling water against time" }),
              q("a", "Estimate the temperature at 5 min: [[18]] °C", 0),
              q("b", "Why is a ruler line a poor choice here?", 1),
            ] },
          task(3, "Good line or not?", "Judge it"),
          p("Four students drew a line on the same results. Tick <b>Good</b> or <b>Not good</b> for each and give the reason in a few words.", { mb: 2 }),
          { type: "html", html: `<div class="mini-row">${[
            mini("A", { dots: trend }),
            mini("B", { line: [[0, 2], [8, 10]] }),
            mini("C", { line: [[0, 0.1], [8, 15.5]] }),
            mini("D", { wobble: trend }),
          ].join("")}</div>` },
        ] },

      /* 2 */
      { run: RUN2, blocks: [
        { type: "split", cols: "1fr 1fr", gap: 6,
          left: [
            task(4, "The point that does not fit", "Anomalous result"),
            p("A class repeats the ramp practical and plots the mean distance for each height."),
            g({ xmax: 32, ymax: 140, xstep: 4, ystep: 20, xlabel: "Ramp height / cm", ylabel: "Mean distance / cm", pts: DATA.ramp, h: 96, alt: "Distance travelled against ramp height with one point far below the trend" }),
            q("a", "<b>Circle</b> the possible anomalous result, then draw the best-fit line for the trend.", 0),
            q("b", "Priya says “rub it out, it spoils the graph”. Marcus says “draw the line through it”. Who is right? What should happen <i>first</i>?", 3),
            q("c", "Repeating 20 cm gives about 76 cm. What does that suggest, and what do you do with the 52 cm reading?", 2),
            q("d", "If it was still 52 cm after repeating, what might that tell you?", 2),
          ],
          right: [
            task(5, "Directly proportional?", "Think"),
            { type: "box", eyebrow: "Directly proportional", paras: ["Double one quantity and the other doubles. On a graph: a <b>straight line through the origin</b> (0, 0)."], mb: 3 },
            p("A student pours water into a beaker and measures the <b>total mass</b> for each volume. The water alone should be directly proportional to its volume."),
            g({ xmax: 140, ymax: 200, xstep: 20, ystep: 20, xlabel: "Volume of water / cm³", ylabel: "Mass of beaker + water / g", pts: DATA.water, h: 96, alt: "Mass of beaker and water against volume of water" }),
            q("a", "Draw the best-fit line and extend it back to the y-axis. It crosses at [[16]] g.", 0),
            q("b", "From your line, total mass at 40 cm³ is [[10]] g and at 80 cm³ is [[10]] g. Did it double?", 0),
            q("c", "Is total mass directly proportional to volume here? Explain.", 2),
            q("d", "What does the y-intercept represent? How could the student change the method?", 3),
          ] },
        { type: "spacer", mm: 2 },
        { type: "box", kind: "orange", eyebrow: "Talk about it", paras: ["When, if ever, is it honest to leave an anomalous result out when you draw a best-fit line?", "A straight line with a y-intercept is not directly proportional. Is it still a useful pattern? What can you still predict from it?"], mb: 0 },
      ] },
    ],
  };
})();
