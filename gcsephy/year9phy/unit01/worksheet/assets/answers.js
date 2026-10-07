/* Answer key for the Lesson 5 worksheet: one A4 page. Model lines are drawn in orange on the same graphs. */
(function () {
  "use strict";
  const { DATA, fit, graph } = window.WSG;
  const task = (n, title, tag) => ({ type: "task", n, title, tag });
  const note = (html) => ({ type: "html", html: `<p class="ans-note">${html}</p>` });
  const g = (o) => ({ type: "html", html: graph({ h: 62, ...o }) });
  const line = (pts, x0, x1) => { const f = fit(pts); return [[x0, f.m * x0 + f.c], [x1, f.m * x1 + f.c]]; };
  const cooling = [];
  for (let t = 0; t <= 14.01; t += 0.5) cooling.push([t, 25 + 65 * Math.exp(-t / 6.5)]);
  const rampTrend = DATA.ramp.filter((p) => p[0] !== 20);

  window.WORKBOOK = {
    title: "Work Like a Physicist - Lesson 5 Worksheet (Answers)",
    footer: "Work Like a Physicist · Lesson 5 Worksheet · Answers",
    pages: [{
      run: ["LESSON 5 WORKSHEET", "ANSWERS"],
      lead: { badge: "TEACHER COPY", title: "Lesson 5 worksheet: answers", subtitle: "Orange lines are model answers; accept any sensible line that balances the points." },
      blocks: [
        { type: "split", cols: "1fr 1fr", gap: 6,
          left: [
            task(1, "A straight line", "Spring"),
            g({ xmax: 800, ymax: 18, xstep: 100, ystep: 2, xlabel: "Mass added / g", ylabel: "Extension / cm", pts: DATA.spring, line: line(DATA.spring, 0, 800), marks: [{ dot: [350, 0.168 + 0.0197 * 350] }] }),
            note("<b>a</b> About 7 cm (accept 6.5–7.5), read from the line, not a point. <b>b</b> About 4 / 4; the exact split matters less than the balance. Ruler, one thin line, no zig-zag."),
          ],
          right: [
            task(2, "A curve", "Cooling"),
            g({ xmax: 14, ymax: 100, xstep: 2, ystep: 10, xlabel: "Time / min", ylabel: "Temperature / °C", pts: DATA.cooling, curve: cooling }),
            note("<b>a</b> About 55 °C (accept 52–58). <b>b</b> The points fall quickly then level off, so a straight line would sit above the points in the middle and below them at the ends. Cooling slows as the water gets nearer room temperature."),
          ] },
        task(3, "Good line or not?", "Judge it"),
        note("<b>C only</b> is good: a straight line with the points balanced either side. <b>A</b> is dot-to-dot, so it treats every measurement as exact; <b>B</b> is too shallow, so the points drift above the line and miss the trend; <b>D</b> is a wobbly curve through every point, which follows the scatter instead of the trend."),
        { type: "split", cols: "1fr 1fr", gap: 6,
          left: [
            task(4, "The point that does not fit", "Anomalous result"),
            g({ xmax: 32, ymax: 140, xstep: 4, ystep: 20, xlabel: "Ramp height / cm", ylabel: "Mean distance / cm", pts: DATA.ramp, line: line(rampTrend, 0, 32), marks: [{ circle: [20, 52] }] }),
            note("<b>a</b> Anomalous result at (20, 52); the line follows the other seven points, so it passes well above it. <b>b</b> Neither: do not delete it or bend the line to it. First check the record, then repeat the 20 cm run. <b>c</b> A repeat near 76 cm suggests a measuring or release mistake: note it on the graph and use the repeat. <b>d</b> If it stays near 52 cm, it may be real physics (a bump or a sticking wheel). Report it, investigate, and do not hide it."),
          ],
          right: [
            task(5, "Directly proportional?", "Think"),
            g({ xmax: 140, ymax: 200, xstep: 20, ystep: 20, xlabel: "Volume of water / cm³", ylabel: "Mass of beaker + water / g", pts: DATA.water, line: line(DATA.water, 0, 140), marks: [{ dot: [0, 51] }] }),
            note("<b>a</b> About 50 g (accept 45–55). <b>b</b> About 90 g and 130 g: 130 is not double 90, so no. <b>c</b> No. The line is straight but does not pass through the origin. <b>d</b> The intercept is the mass of the empty beaker. Zero the balance with the beaker on (tare it), or subtract 50 g from every reading; then the line passes through (0, 0)."),
          ] },
        note("<b>Talk about it:</b> an anomalous result is left out of the <i>line</i> only when there is a reason, such as a recorded mistake, and it stays circled on the graph. A straight line with an intercept still shows a linear pattern and supports predictions; it just is not proportional, and the intercept often points to a systematic error or an extra fixed quantity."),
      ],
    }],
  };
})();
