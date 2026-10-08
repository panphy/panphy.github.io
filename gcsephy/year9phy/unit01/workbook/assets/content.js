/* All the words in the Year 9 workbook, one entry per printed page (40 pages).
   Edit the text here, then rebuild the PDF with build-pdf.sh.
   In any text, [[]] draws a blank to write on and [[24]] a blank 24 mm wide.
   Block types are listed in ../README.md. */
(function () {
  "use strict";

  const task = (n, title, tag) => ({ type: "task", n, title, tag });
  const q = (l, html, lines) => ({ type: "q", l, html, lines });
  const lines = (n) => ({ type: "lines", n });
  const p = (html, extra) => ({ type: "p", html, ...extra });
  const foot = (left, right) => `<div class="tl">${left}</div><div class="r">${right}</div>`;

  /* Every lesson opens with the same page: title, the case, the mission. */
  const opener = (run, lead, caseBox, mission, blocks) => ({ run, lead, blocks: [{ type: "case", ...caseBox }, { type: "mission", ...(Array.isArray(mission) ? { items: mission } : mission) }, ...blocks] });

  const L1 = ["LESSON 1", "CAN THIS DATA BE TRUSTED?"];
  const L2 = ["LESSON 2", "WHAT ARE YOU ACTUALLY CHANGING?"];
  const L3 = ["LESSON 3", "THE DROP TEST"];
  const L4 = ["LESSON 4", "HIGHER RAMP, FURTHER FLIGHT?"];
  const L5 = ["LESSON 5", "THE POINT THAT DOES NOT FIT"];
  const L6 = ["LESSON 6", "SOLO FLIGHT"];
  const L78 = ["LESSONS 7–8", "YOUR INVESTIGATION"];
  const GL = ["GLOSSARY", "EVERY WORD YOU NEED"];

  window.WORKBOOK = {
    title: "Work Like a Physicist - Year 9 Student Workbook",
    footer: "Work Like a Physicist · Year 9 Workbook",
    pages: [
      /* 1 */
      { cover: {
        eyebrow: "Year 9 Physics · Unit booklet",
        title: "Work Like<br>a Physicist",
        lede: "Collecting, processing and presenting data — eight lessons on how to produce evidence that other people can trust.",
        quote: "The first principle is that you must not fool yourself — and you are the easiest person to fool.",
        by: "Richard Feynman, physicist",
        fields: ["Name", "Class", "Teacher", "Lab partner"],
        note: "Keep this booklet for all eight lessons · Bring it to every practical",
      } },

      /* 2 */
      { run: ["START HERE", "WHAT THIS BOOKLET IS FOR"], lead: { badge: "START HERE", title: "What this booklet is for", subtitle: "Read this page once. It explains the whole unit in about two minutes." }, blocks: [
        p("Anyone can have an opinion about how the world works. A physicist has to do something harder: produce evidence that convinces people who were not there and who may not want to believe them.", { mb: 3 }),
        p("That is the real skill in this unit — not equations, evidence. Over eight lessons you will learn to take a measurement you can defend, spot the errors hiding inside your own results, and turn a page of messy numbers into a graph that makes the pattern obvious.", { mb: 4 }),
        { type: "box", eyebrow: "How every lesson works", paras: [
          "Each lesson follows the same four-part shape, so you always know where you are:",
          "The Case — a real story where this skill mattered. · Your Mission — what you should be able to do by the end. · The Tasks — numbered, in order. · Checkpoint — questions to prove you got it.",
        ], mb: 5 },
        { type: "h3", html: "The eight lessons" },
        { type: "html", html: `<table class="lesson-list"><tbody>
          <tr><td>Lesson 1</td><td>Can this data be trusted?</td><td>Uncertainty, precision, accuracy, resolution, errors</td></tr>
          <tr><td>Lesson 2</td><td>What are you actually changing?</td><td>Variables, data types, choosing the right graph</td></tr>
          <tr><td>Lesson 3</td><td>The drop test</td><td>Shock absorber practical · bar charts</td></tr>
          <tr><td>Lesson 4</td><td>Higher ramp, further flight?</td><td>Ramp practical · line graphs</td></tr>
          <tr><td>Lesson 5</td><td>The point that does not fit</td><td>Best-fit lines, anomalous results, graph quality</td></tr>
          <tr><td>Lesson 6</td><td>Solo flight</td><td>Paper helicopter · independent challenge</td></tr>
          <tr><td>Lessons 7–8</td><td>Your investigation</td><td>Design, run, graph and defend your own experiment</td></tr>
          <tr><td>Reference</td><td>The Physicist's Toolkit</td><td>Every rule, formula and checklist in one place — page 3</td></tr>
        </tbody></table>` },
        { type: "box", kind: "orange", eyebrow: "One habit worth building now", paras: ["When something in your results looks wrong, the useful question is never “can I ignore that?” It is “why did that happen?” Almost everything interesting in this unit is hiding inside that question."], mb: 4 },
        { type: "note", html: "There is a progress tracker on the last page of this booklet. Fill in a row at the end of every lesson." },
      ] },

      /* 3 */
      { run: ["REFERENCE", "THE PHYSICIST'S TOOLKIT"], lead: { badge: "REFERENCE", title: "The Physicist's Toolkit", subtitle: "Everything you need for all eight lessons. Fold the corner of this page — you will come back to it." }, blocks: [
        { type: "split", cls: "toolkit", cols: "1fr 1fr", gap: 6,
          left: [
            { type: "h4", html: "The three variables" },
            { type: "table", cls: "plain bf", widths: ["30mm", ""], rows: [["Independent", "The one thing you change"], ["Dependent", "The thing you measure"], ["Control", "Everything you keep the same"]] },
            { type: "h4", html: "Choosing your graph" },
            { type: "p", html: "Look at the independent variable only:", cls: "lead" },
            { type: "table", cls: "plain bf", widths: ["30mm", ""], rows: [["Continuous", "Numbers on a scale — time, length, mass → <b>line graph</b>"], ["Categoric", "Names or groups — material, colour → <b>bar chart</b>"]] },
            { type: "h4", html: "The two calculations" },
            { type: "eq", html: "mean = total of trials ÷ number of trials" },
            { type: "eq", html: "uncertainty = (largest − smallest) ÷ 2" },
            { type: "h4", html: "Words that earn marks" },
            { type: "p", html: "Instead of “it went up”, write “<i>as the ramp height increased, the distance travelled increased</i>”. Instead of “it was wrong”, name the error: <i>random</i> or <i>systematic</i>. Instead of “weird result”, write “<i>possible anomalous result at 20 cm</i>”." },
          ],
          right: [
            { type: "h4", html: "Precision vs accuracy" },
            { type: "table", cls: "plain bf", widths: ["22mm", ""], rows: [["Precise", "Repeats are close <i>to each other</i>"], ["Accurate", "Close <i>to the true value</i>"]] },
            { type: "p", html: "You can be perfectly precise and completely wrong. That is the whole problem.", cls: "note" },
            { type: "h4", html: "The two errors" },
            { type: "table", cls: "plain bf", widths: ["22mm", ""], rows: [["Random", "Scatters repeats unpredictably. <b>Repeats help.</b>"], ["Systematic", "Shifts every reading the same way. <b>Repeats do not help.</b>"]] },
            { type: "h4", html: "Graph quality checklist" },
            { type: "checks", head: null, tickW: "16mm", cls: "one", items: ["Title says what against what", "Independent variable on the x-axis", "Both axes labelled with units", "Sensible scale that fills the space", "Small crosses, plotted accurately", "Best-fit line, not dot-to-dot", "Bars equal width, with gaps", "Any odd point circled and explained"] },
          ] },
        { type: "key", style: "position:absolute;left:43pt;right:43pt;top:705pt;margin:0", label: "The rule that decides your graph", big: ["Continuous independent variable → line graph", "Categoric independent variable → bar chart"], small: "It depends on what you <i>changed</i>, not on what you measured." },
      ] },

      /* ---------------- Lesson 1 ---------------- */
      /* 4 */
      opener(L1, { badge: "LESSON 1", title: "Can this data be trusted?", subtitle: "Uncertainty · precision · accuracy · resolution · random and systematic error" },
        { title: "The loose cable that broke physics", paras: [
          "In September 2011, a team of physicists in Italy announced something that should have been impossible. They had timed neutrinos travelling 730 km from Switzerland, and the particles seemed to arrive about 60 nanoseconds <i>earlier</i> than light would. Nothing is meant to beat light.",
          "The team had repeated the measurement thousands of times and the results were beautifully consistent. Newspapers around the world reported that Einstein had been proved wrong.",
          "A few months later the team traced the problem to their own equipment — including a fibre-optic cable that was not properly connected. Every reading had been shifted by the same tiny amount, in the same direction, so repeating the measurement could never reveal it. The result was withdrawn.",
        ], punch: "Consistent does not mean correct. Today you learn the difference." },
        ["Explain why every measurement carries some uncertainty", "Calculate uncertainty from repeated readings", "Tell the difference between precision and accuracy — and prove it with an example", "Say what the resolution of an instrument is", "Describe random and systematic errors, and explain why repeats only fix one of them"],
        [
          task(1, "Which data would you trust?", "5 min"),
          p("Three students timed the same toy car rolling down the same ramp. All three took three readings."),
          { type: "table", cls: "num bf", align: ["", "r", "r", "r", "r"], head: ["Data set", "Trial 1 / s", "Trial 2 / s", "Trial 3 / s", "Mean / s"], rows: [["A", "1.20", "1.22", "1.21", "1.21"], ["B", "1.05", "1.47", "1.12", "1.21"], ["C", "0.91", "0.92", "0.91", "0.91"]] },
          q("a", "Sets A and B have <i>exactly</i> the same mean. Which one would you rather rely on, and why?", 2),
        ]),

      /* 5 */
      { run: L1, blocks: [
        q("b", "Set C is the tidiest of the three. Explain how it could still be the most wrong.", 2),
        q("c", "What is the point of taking three readings instead of one?", 1),
        task(2, "Precision and accuracy are not the same word", "Key idea"),
        { type: "key", big: ["Precision = how close your repeats are to each other.", "Accuracy = how close you are to the truth."], small: "Four combinations are possible. All four happen in real labs." },
        p("Complete the last column. For each row, invent a one-line example from a school lab."),
        { type: "table", cls: "bf", widths: ["31%", "29%", "40%"], head: ["Situation", "What the results look like", "Example from a school lab"], rows: [["Accurate and precise", "Tight cluster, on the true value", ""], ["Precise but not accurate", "Tight cluster, in the wrong place", ""], ["Accurate on average, not precise", "Widely spread, but the mean is close", ""], ["Neither", "Widely spread and in the wrong place", ""]] },
        q("a", "Which of the four describes the neutrino result in <i>The Case</i>? Justify your choice.", 2),
        task(3, "How big is the doubt?", "Worked example"),
        p("Every measurement has some doubt attached to it. With repeated readings you can put a number on that doubt."),
        { type: "box", eyebrow: "Follow every step", paras: [
          "Three readings: 1.20 s, 1.25 s, 1.22 s",
          "Step 1 — Mean. (1.20 + 1.25 + 1.22) ÷ 3 = 3.67 ÷ 3 = 1.22 s (to 2 d.p.)",
          "Step 2 — Range. maximum and minimum values = from 1.20 s to 1.25 s",
          "Step 3 — Uncertainty. (largest − smallest) ÷ 2 = 0.05 ÷ 2 = 0.025 s, rounded sensibly to 0.03 s",
          "Step 4 — Write it properly. mean time = 1.22 s ± 0.03 s",
          "Read that last line out loud as: <i>“somewhere around 1.22 seconds, give or take 0.03 — and I am being honest about it.”</i>",
        ] },
      ] },

      /* 6 */
      { run: L1, blocks: [
        task(4, "Your turn", "10 min"),
        p("Complete the table, then show one full mean calculation underneath."),
        { type: "table", cls: "num bf", widths: ["10%", "13.5%", "13%", "13.7%", "13%", "18.8%", "18%"], align: ["", "r", "r", "r", "r", "r", "r"], head: ["Set", "Trial 1", "Trial 2", "Trial 3", "Mean", "Range", "Uncertainty"], rows: [["A", "12.0", "12.2", "12.1", "", "", ""], ["B", "8.4", "9.1", "8.7", "", "", ""], ["C", "25.0", "25.0", "25.1", "", "", ""], ["D", "3.20", "3.65", "3.25", "", "", ""]] },
        q("a", "Show your working for one mean:", 1),
        p("<span class=\"ql\">b</span>Most precise set: [[20]] &nbsp;&nbsp; Largest uncertainty: [[20]]"),
        q("c", "Which set would you insist on repeating before using it in a report, and why?", 2),
        task(5, "The two errors", "Key idea"),
        { type: "duo",
          left: { eyebrow: "Random error", paras: ["Pushes readings up and down unpredictably. Your reaction time on a stopwatch is the classic one — sometimes early, sometimes late.", "Repeats and a mean reduce it."] },
          right: { kind: "orange", eyebrow: "Systematic error", paras: ["Shifts every reading the same way. A ruler measured from its end instead of the zero mark. A balance nobody zeroed. A loose cable.", "Repeats do nothing. You have to find it."] } },
        q("a", "Explain, in your own words, why taking more repeats cannot rescue you from a systematic error.", 2),
        p("Label each problem R (random) or S (systematic). One is deliberately arguable — be ready to defend it."),
        { type: "table", cls: "tight", widths: ["29px", "", "29px", ""], head: ["R/S", "Problem", "R/S", "Problem"], rows: [["", "Stopwatch started slightly late each time", "", "Ruler starts measuring from its very end"], ["", "Judging bounce height by eye", "", "Balance reads 0.2 g with nothing on it"], ["", "A draught from an open window", "", "Reading a scale at an angle, always the same side"]] },
      ] },

      /* 7 */
      { run: L1, blocks: [
        task(6, "Resolution: what the instrument can even see", "Key idea"),
        p("Resolution is the smallest change an instrument can detect. A stopwatch reading to 0.01 s cannot tell you about a 0.001 s difference — that information simply does not exist in your data."),
        { type: "table", widths: ["42%", "24%", "34%"], head: ["Instrument", "Resolution", "Could it detect a change of 0.5 mm?"], rows: [["Ruler marked every 1 cm", "", ""], ["Ruler marked every 1 mm", "", ""], ["Stopwatch reading to 0.01 s", "", "not a length"], ["Balance reading to 0.1 g", "", "not a length"]] },
        { type: "box", kind: "orange", eyebrow: "Trap", paras: ["Better resolution gives you more decimal places. It does <i>not</i> make you right. A digital balance with a systematic fault will give you a wonderfully precise wrong answer to three decimal places."], mb: 5 },
        task(7, "Mini practical — measure something three times", "15 min"),
        p("Your teacher will give you one of these: a dropped-ruler reaction test, a toy car on a ramp, the bounce height of a ball, or one object measured with different rulers."),
        { type: "table", widths: ["32%", "11.6%", "12%", "12%", "12%", "20%"], head: ["What I measured (with unit)", "Trial 1", "Trial 2", "Trial 3", "Mean", "Uncertainty"], align: ["", "r", "r", "r", "r", "r"], cls: "num", rh: 11, rows: [["", "", "", "", "", ""]] },
        q("a", "Instrument used, and its resolution:", 1),
        q("b", "Name one random error that affected you, and say how you know it was random:", 2),
        q("c", "Name one possible systematic error. How would you go looking for it?", 2),
      ] },

      /* 8 */
      { run: L1, blocks: [
        task(8, "Data detective", "Stretch"),
        p("Three claims. For each, decide what you would need to know before believing it, and name the error you are most suspicious of."),
        { type: "table", widths: ["38%", "40%", "22%"], head: ["The claim", "What I would need to know first", "Suspected error"], rh: 18.4, rows: [["“Our reaction times improved after training.” The two tests were timed by different people.", "", ""], ["“This spring stretches 4.0 cm per 100 g.” One reading was taken for each mass.", "", ""], ["“The classroom is exactly 6.000 m long.” Measured once, with a tape held slightly slack.", "", ""]] },
        { type: "checkpoint", title: "Checkpoint — Lesson 1", items: [
          "1. A set of results that are close together is [[48]].",
          "2. A result that is close to the true value is [[48]].",
          "3. Uncertainty is calculated using [[48]].",
          { html: "4. Repeats fix [[24]] errors but not [[24]] errors, because", lines: 1 },
          { html: "5. One thing I would do differently to make my data more repeatable:", lines: 2 },
        ] },
        { type: "home", paras: ["Find a claim with a number in it — an advert, a headline, a sports statistic. Write down one question you would have to ask before you believed it, and bring it to Lesson 2."], lines: 2 },
      ] },

      /* ---------------- Lesson 2 ---------------- */
      /* 9 */
      opener(L2, { badge: "LESSON 2", title: "What are you actually changing?", subtitle: "Variables · continuous and categoric data · choosing the right graph" },
        { title: "The study that proved nothing", paras: [
          "Imagine an energy drink company runs a trial. Students who drank their product scored higher in a maths test than students who did not. The advert writes itself: drink this, get smarter.",
          "Except the drinkers took the test in the morning and the non-drinkers took it after lunch. They were different students, in different rooms. One group had been told they were being studied.",
          "The drink was changed — but so was everything else. When more than one thing changes at a time, no result can tell you which change caused what. The study is not weak evidence. It is no evidence.",
        ], punch: "Change one thing. Measure one thing. Nail everything else down." },
        ["Identify the independent, dependent and control variables in any investigation", "Decide whether data is continuous or categoric", "Choose a line graph or a bar chart — and justify it using the right word"],
        [
          task(1, "Take the question apart", "10 min"),
          p("Fill in all three columns. The control variable column is the one people rush — do not rush it."),
          { type: "table", widths: ["32%", "23%", "20.5%", "24.5%"], head: ["Investigation question", "I change<br>(independent)", "I measure<br>(dependent)", "I keep the same<br>(two controls)"], rh: 14.1, rows: [["How does ramp height affect trolley speed?", "", "", ""], ["Which material is the best thermal insulator?", "", "", ""], ["How does the number of elastic bands affect launch distance?", "", "", ""], ["Which drink contains the most sugar?", "", "", ""]] },
          q("a", "Pick one of the four. If you failed to control the variables you listed, what exactly would go wrong with your conclusion?", 2),
        ]),

      /* 10 */
      { run: L2, blocks: [
        task(2, "Two kinds of data", "Key idea"),
        { type: "duo",
          left: { eyebrow: "Continuous", paras: ["Numbers that can take any value on a scale, including the values in between. Length, time, temperature, mass.", "Between 5 and 10 there is a 7.3 — and it means something."] },
          right: { kind: "orange", eyebrow: "Categoric", paras: ["Names, types or groups. Material, colour, brand, surface.", "There is nothing halfway between “sponge” and “cardboard”."] } },
        { type: "key", label: "Look only at what you changed", big: ["Continuous independent variable → line graph", "Categoric independent variable → bar chart"] },
        { type: "box", kind: "orange", eyebrow: "The mistake almost everyone makes", paras: ["Your dependent variable is nearly always a number. That is not the deciding factor. “Which surface gives the most friction?” measures distance in centimetres — but the graph is still a bar chart, because surface type is what you changed, and surfaces are categories."], mb: 5 },
        task(3, "Sort the investigations", "10 min"),
        p("Write LINE or BAR — then, in the last column, name the independent variable and label it continuous or categoric. Both parts are needed for full credit."),
        { type: "table", widths: ["47%", "12%", "41%"], head: ["Investigation", "Graph", "Because the independent variable is…"], rows: [["How does temperature affect dissolving time?", "", ""], ["Which surface gives the most friction?", "", ""], ["How does mass affect the stretch of a spring?", "", ""], ["Which paper towel absorbs the most water?", "", ""], ["How does pendulum length affect its time period?", "", ""], ["Which material is the best sound absorber?", "", ""]] },
        task(4, "Demonstration — which surface slows the car most?", "Class demo"),
        p("Your teacher rolls the same car down the same ramp onto different surfaces: bench, carpet, rubber mat, sandpaper."),
        { type: "fields", labels: ["Independent variable", "Dependent variable", "Graph type"] },
      ] },

      /* 11 */
      { run: L2, blocks: [
        q("a", "List three control variables — and star the one that would be genuinely hard to keep the same:", 2),
        task(5, "Fix the broken investigation", "Stretch"),
        p("A student writes: “I will test whether expensive tennis balls bounce better. I'll drop an expensive ball from the window and a cheap one from my hand, and see which bounces higher.”", { cls: "it", mb: 6 }),
        q("a", "Name two things wrong with this plan:", 2),
        q("b", "Rewrite it as a proper investigation question in the form “How does X affect Y?”", 1),
        q("c", "What graph would your rewritten version need, and why?", 2),
        { type: "checkpoint", title: "Checkpoint — Lesson 2", items: [
          "1. The independent variable is the thing I [[60]].",
          "2. The dependent variable is the thing I [[60]].",
          "3. Use a line graph when [[60]].",
          "4. Use a bar chart when [[60]].",
          { html: "5. Explain to someone who missed the lesson why graph choice depends on the independent variable and not the dependent one:", lines: 2 },
        ] },
        { type: "home", paras: ["Write five investigation questions of your own — at least two needing a bar chart and two needing a line graph. For each, name the independent variable and label it continuous or categoric."] },
      ] },

      /* ---------------- Lesson 3 ---------------- */
      /* 12 */
      opener(L3, { badge: "LESSON 3", title: "The drop test", subtitle: "Shock absorber practical · repeats and means · bar charts" },
        { title: "Why your helmet is made of polystyrene", paras: [
          "A cycle helmet is mostly cheap foam. It is not there to be tough — it is there to be <i>crushed</i>. By squashing over a few thousandths of a second, the foam stretches out the time your head takes to stop, and that lowers the force on your skull.",
          "Nobody takes a manufacturer's word for this. Before a helmet can be sold it is strapped to an instrumented head-shaped weight and dropped onto a steel anvil. Sensors record the impact. The test is repeated on helmet after helmet, because one lucky drop proves nothing.",
          "Today you run the same kind of test, with a ball and a set of materials, and you make the same kind of decision: which material takes the hit best?",
        ], punch: "Same drop. Same ball. Same height. Only the material changes." },
        ["Recognise a categoric independent variable and explain what follows from that", "Collect three trials for each material and calculate a mean", "Build a results table with correct headings and units", "Draw a bar chart that would survive a strict marker", "Name a random and a systematic error in your own practical"],
        [
          task(1, "Before you touch any equipment", "5 min"),
          p("Investigation question: How does the type of material affect the bounce height of a ball?"),
          { type: "kv", rows: ["Independent variable", "Dependent variable (with unit)", "Three control variables", "Continuous or categoric?", "Graph type, and why"] },
        ]),

      /* 13 */
      { run: L3, blocks: [
        { type: "box", kind: "orange", eyebrow: "Think before you answer", paras: ["A good shock absorber soaks up energy instead of returning it. So does the best material give the <i>highest</i> bounce or the <i>lowest</i>? Decide now, and write it here: [[50]]"], mb: 5 },
        task(2, "Method", "Practical"),
        p("Work in your group. One person drops, one measures, one records — then swap so everyone does each job."),
        { type: "steps", items: ["Choose 4 or 5 materials to test. Write them into the results table below.", "Place the first material flat on the bench or in a tray.", "Hold the ball at the same drop height every time — agree on it now: [[24]] cm", "Release the ball. Do not throw it or push it down.", "Measure the height of the first bounce, eye level with the top of the bounce.", "Repeat three times for that material, then move on to the next."] },
        { type: "box", eyebrow: "Safety", paras: ["Do not throw the ball. Drop vertically only. Keep the drop zone clear and stand back — do not crowd. Make sure the tray and materials are stable before you release."], mb: 5 },
        task(3, "Results", "20 min"),
        p("Write your material names in the first column. Record every reading as you take it — never from memory at the end."),
        { type: "table", cls: "num", widths: ["24%", "17%", "17%", "17%", "25%"], align: ["", "r", "r", "r", "r"], head: ["Material", "Bounce 1 / cm", "Bounce 2 / cm", "Bounce 3 / cm", "Mean bounce / cm"], rh: 11, rows: [["", "", "", "", ""], ["", "", "", "", ""], ["", "", "", "", ""], ["", "", "", "", ""], ["", "", "", "", ""]] },
        q("a", "Show one mean calculation in full:", 1),
        q("b", "Did any single reading make you stop and look twice? Which one, and what did you do about it?", 2),
      ] },

      /* 14 */
      { run: L3, blocks: [
        task(4, "Draw your bar chart", "20 min"),
        p("Material on the x-axis, mean bounce height on the y-axis. Equal-width bars, with gaps between them — the gaps are there to show that the categories are separate things, not points on a scale."),
        { type: "draw", h: 137, foot: foot("Title:", "y-axis: mean bounce height / cm · x-axis: material") },
        { type: "spacer", mm: 2 },
        { type: "checks", head: "Check your own bar chart before your teacher sees it", items: ["Title says what against what", "Material type on the x-axis", "y-axis labelled with the unit", "Scale goes up in sensible steps and uses most of the space", "Bars are all the same width, with equal gaps", "Bar heights match the mean values, not trial 1"] },
      ] },

      /* 15 */
      { run: L3, blocks: [
        task(5, "What the data says", "10 min"),
        q("a", "Which material was the best shock absorber? Quote a number from your results to back it up.", 2),
        q("b", "Why did we repeat each drop three times instead of once?", 2),
        p("Now pin down the errors. Be specific about <i>this</i> practical — “human error” earns nothing."),
        { type: "table", cls: "bf", widths: ["20%", "40%", "40%"], head: ["Error type", "What went wrong in our version", "How we would reduce it"], rh: 11.4, rows: [["Random", "", ""], ["Systematic", "", ""]] },
        q("c", "Would repeating the experiment ten more times have fixed the systematic error you named? Explain.", 2),
        task(6, "Push it further", "Stretch"),
        q("a", "Another group tested the <i>same</i> materials and got completely different numbers. Give two reasons why that could happen without either group having done anything wrong.", 2),
        q("b", "Suppose you tested foam of thickness 1 cm, 2 cm, 3 cm and 4 cm instead of different materials. What graph would you need now, and what changed?", 2),
        { type: "checkpoint", title: "Checkpoint — Lesson 3", items: [
          "1. I used a bar chart because the independent variable was [[80]].",
          "2. The best shock absorber was [[30]] because it gave the [[24]] bounce.",
          "3. One possible random error was [[80]].",
          { html: "4. One thing I would change if I ran this again:", lines: 1 },
        ] },
      ] },

      /* ---------------- Lesson 4 ---------------- */
      /* 16 */
      opener(L4, { badge: "LESSON 4", title: "Higher ramp, further flight?", subtitle: "Ramp practical · continuous data · plotting a line graph properly" },
        { title: "Nobody guesses a stunt jump", paras: [
          "When a stunt team sends a car off a ramp, the driver does not find out how fast to go by trying it. They build the ramp, run the car at several different speeds, measure how far it lands each time, and plot the results.",
          "The graph is the point. Once you have a line through five measured points, you can read off the speed needed for a distance you have <i>never actually tested</i>. That is what a line graph buys you: a prediction, from a pattern.",
          "A bar chart cannot do that. A single measurement certainly cannot. One dot on a page is not a pattern — it is an anecdote.",
        ], punch: "Five points and a line will tell you about the gaps in between." },
        ["Recognise a continuous independent variable and explain what follows from it", "Build a results table with five values, three trials each, and a mean", "Choose a scale that uses the whole grid instead of a corner of it", "Plot points accurately as small crosses", "Label both axes with the quantity <i>and</i> the unit"],
        [
          task(1, "Set it up", "5 min"),
          p("Investigation question: How does the height of a ramp affect the distance a trolley travels after it leaves the ramp?"),
          { type: "split", cols: "48% 1fr", gap: 6,
            left: [{ type: "kv", labelW: "46%", rows: ["Independent variable", "Dependent variable", "Continuous or categoric?", "Graph type"] }],
            right: [p("Four control variables. Tick each one off as your group agrees on it.", { cls: "aside" }), lines(4)] },
          { type: "spacer", mm: 2 },
          { type: "box", eyebrow: "Safety", paras: ["Check the ramp is stable before every release. Never aim a trolley at a person. Keep bags and stools well away from the run. Collect the trolley by hand — do not chase it."] },
        ]),

      /* 17 */
      { run: L4, blocks: [
        task(2, "Method", "Practical"),
        { type: "steps", items: ["Set the ramp to your first height. Use five heights — 5, 10, 15, 20 and 25 cm work well.", "Place the trolley at the same marked starting point on the ramp every time.", "Release it. Do not push — a push adds energy you cannot measure or repeat.", "Measure the distance travelled from the bottom of the ramp to where the trolley stops.", "Repeat three times at that height, then change the height and repeat everything."] },
        { type: "box", kind: "orange", eyebrow: "Work fast, but write everything down", paras: ["You have limited time. The single biggest time-waster is having to redo a height because nobody wrote down trial 2. Record each number the moment you read it."], mb: 5 },
        task(3, "Results", "25 min"),
        { type: "table", cls: "num", widths: ["20%", "20%", "20%", "20%", "20%"], align: ["r", "r", "r", "r", "r"], head: ["Ramp height / cm", "Distance 1 / cm", "Distance 2 / cm", "Distance 3 / cm", "Mean distance / cm"], rh: 11.3, rows: [["5", "", "", "", ""], ["10", "", "", "", ""], ["15", "", "", "", ""], ["20", "", "", "", ""], ["25", "", "", "", ""]] },
        p("<span class=\"ql\">a</span>Largest mean: [[24]] cm &nbsp;&nbsp; Smallest mean: [[24]] cm", { mb: 1 }),
        q("b", "You need those two numbers before you can choose a scale. Explain why.", 1),
      ] },

      /* 18 */
      { run: L4, blocks: [
        task(4, "Choose your scale first", "Do not skip"),
        p("More marks are lost to bad scales than to bad measuring. Work this out <i>before</i> you plot a single point.", { mb: 4 }),
        { type: "duo",
          left: { eyebrow: "How to choose a scale", list: ["<b>1.</b> Find your largest value.", "<b>2.</b> Count the big squares available on that axis.", "<b>3.</b> Divide, then round <i>up</i> to something easy: 1, 2, 5, 10, 20, 50 per square.", "<b>4.</b> Check your largest value still fits."] },
          right: { kind: "orange", eyebrow: "Never do this", paras: ["Scales going up in 3s, 7s or 15s — nobody can read them.", "Squeezing all your data into the bottom-left quarter of the grid.", "Changing the size of the steps halfway up an axis."] } },
        p("<span class=\"ql\">a</span>My y-axis will go from 0 to [[19]] cm, with each big square worth [[19]] cm.", { mb: 1 }),
        p("<span class=\"ql\">b</span>My x-axis will go from 0 to [[19]] cm, with each big square worth [[19]] cm.", { mb: 4 }),
        task(5, "Plot your line graph", "20 min"),
        p("Ramp height on the x-axis, mean distance on the y-axis. Mark each point with a small ×, not a blob — a fat dot hides where the point really is. Leave the line until Lesson 5."),
        { type: "draw", h: 137, foot: `<div class="tl">Title:</div><div class="r left">Remember the units on both axes</div>` },
      ] },

      /* 19 */
      { run: L4, blocks: [
        task(6, "Mistake hunt", "10 min"),
        p("These are the six things markers look for first. Check your own graph honestly, then swap with a partner and check theirs."),
        { type: "checks", head: "Common mistake", ticks: ["Mine", "Partner's"], tickW: ["20mm", "24mm"], items: ["Units missing from one or both axes", "Awkward scale nobody can read", "Graph crammed into one corner of the grid", "Dependent variable put on the x-axis by mistake", "Bars drawn instead of plotted points", "Points joined dot-to-dot"] },
        q("a", "One thing my partner's graph does better than mine:", 1),
        { type: "checkpoint", title: "Checkpoint — Lesson 4", items: [
          "1. The independent variable was [[48]], measured in [[30]].",
          "2. The dependent variable was [[48]], measured in [[30]].",
          "3. A line graph was the right choice because [[80]].",
          { html: "4. The control variable that was hardest to keep the same was [[48]], because", lines: 1 },
          { html: "5. Looking at your points so far — do you expect the pattern to be a straight line or a curve? Commit to an answer, and say why.", lines: 1 },
        ] },
      ] },

      /* ---------------- Lesson 5 ---------------- */
      /* 20 */
      opener(L5, { badge: "LESSON 5", title: "The point that does not fit", subtitle: "Best-fit lines · anomalous results · graph quality · writing a conclusion" },
        { title: "The readings that were too strange to believe", paras: [
          "In 1985 three scientists from the British Antarctic Survey published something alarming: every spring, the ozone layer above Antarctica was collapsing. They had spotted it from readings taken on the ground, year after year.",
          "Satellites had been watching the same sky. The values they recorded were so far below anything expected that the processing software had been set up to flag such extreme readings as probable instrument faults — so they were not treated as real. The satellite had, in a sense, been seeing the ozone hole and setting the evidence aside.",
          "Once the ground-based results were published, the satellite data was re-examined, and the hole was there in the record.",
        ], punch: "An odd result is a question, not rubbish. Ask it before you bin it." },
        ["Draw a best-fit line — straight or curved — that shows the trend", "Explain why dot-to-dot is wrong for experimental data", "Identify a possible anomalous result and say what you would do about it", "Improve a graph against a checklist", "Write a conclusion that quotes evidence instead of vibes"],
        [
          task(1, "Which graph is better?", "5 min"),
          p("Your teacher will show you three versions of the same data: dot-to-dot, a best-fit straight line, and a best-fit curve."),
          q("a", "Which one shows the pattern most clearly, and what makes it better?", 2),
          q("b", "What is a dot-to-dot line actually claiming about the measurements? Why is that claim untrue?", 2),
        ]),

      /* 21 */
      { run: L5, blocks: [
        task(2, "How a best-fit line works", "Key idea"),
        { type: "key", big: ["A best-fit line shows the trend, not every measurement."], small: "It should have roughly as many points above it as below it. It does not have to touch a single one of them." },
        { type: "duo",
          left: { eyebrow: "Do", paras: ["Draw one smooth line — straight or gently curved — in pencil, with a ruler if it is straight.", "Aim for a balance of points either side.", "Extend it across the range of your data."] },
          right: { kind: "orange", eyebrow: "Do not", paras: ["Zig-zag from point to point.", "Force the line through the first and last points and ignore the middle.", "Draw a thick, wobbly, double-stroke line — precision matters here too."] } },
        q("a", "Your results are “rarely perfect”. Explain what a best-fit line is admitting about experimental data.", 2),
        task(3, "Spot the anomalous result", "10 min"),
        p("Another class ran the ramp experiment and got these means."),
        { type: "split", cols: "1fr 1fr", gap: 6,
          left: [
            { type: "table", cls: "num", align: ["r", "r"], head: ["Ramp height / cm", "Mean distance / cm"], rh: 9.35, rows: [["5", "20"], ["10", "37"], ["15", "52"], ["20", "96"], ["25", "80"]] },
            { type: "note", html: "Plot these five points on the grid, then draw a best-fit line through the trend." },
          ],
          right: [{ type: "draw", h: 82 }] },
        q("a", "Which value looks wrong, and what exactly makes it look wrong?", 2),
      ] },

      /* 22 */
      { run: L5, blocks: [
        q("b", "Should the class delete it? Write what they should do <i>first</i>, and why.", 2),
        q("c", "Give two things that could have caused a reading like this in the ramp practical:", 2),
        { type: "box", kind: "orange", eyebrow: "The honest answer", paras: ["An anomalous result that turns out to be a measuring mistake gets corrected or repeated. An anomalous result you cannot explain gets reported, not hidden — circled on the graph with a note. Deleting data because it is inconvenient is the one thing a scientist must never do."], mb: 5 },
        task(4, "Finish your own graph", "20 min"),
        p("Go back to your ramp graph from Lesson 4. Add the best-fit line. Circle anything that does not sit near it and write a short note beside it. If there are no anomalous results, write “no anomalous results — all points lie close to the line”. Saying so is worth marks."),
        { type: "checks", head: "Before you call it finished", items: ["Title included", "x-axis labelled with unit", "y-axis labelled with unit", "Sensible scale, using most of the grid", "Points plotted accurately as small crosses", "Best-fit line drawn — not dot-to-dot", "Anomalous results circled and commented on, or their absence stated"] },
        task(5, "Peer review", "10 min"),
        p("Swap booklets. Mark your partner's graph against the list above, then write them one specific improvement — not “make it neater”."),
        { type: "kv", rh: 8.8, rows: ["Reviewed by", "Strongest thing about this graph", "One specific improvement"] },
      ] },

      /* 23 */
      { run: L5, blocks: [
        task(6, "Write the conclusion", "15 min"),
        p("Use these sentence starters. Where it says “the graph shows”, quote a real number from your results — that is the difference between a conclusion and an opinion."),
        { type: "starters", items: [
          "As the ramp height increased, the distance travelled by the trolley [[60]]",
          { html: "I know this because the graph shows [[100]]", lines: 1 },
          "For example, at [[24]] cm the mean distance was [[24]] cm, while at [[24]] cm it was [[24]] cm.",
          "One possible source of random error was [[84]]",
          "One result that may be an anomalous result is [[45]] because [[55]]",
        ] },
        task(7, "Mark someone else's graph", "Stretch"),
        p("A student hands in the graph below for the spring experiment. It has four separate problems. Find them, mark them on the graph, and list them."),
        { type: "split", cols: "48% 1fr", gap: 6,
          left: [
            { type: "table", cls: "num", align: ["r", "r"], head: ["Mass / g", "Extension / cm"], rh: 8.6, rows: [["100", "2.1"], ["200", "4.0"], ["300", "6.2"], ["400", "7.9"], ["500", "10.1"]] },
            { type: "note", html: "Their graph: axes unlabelled, no units, points joined dot-to-dot, and everything squashed into the bottom-left corner." },
          ],
          right: [q("a", "The four problems:", 4), q("b", "Which one costs the most marks, and why?", 1)] },
        p("<span class=\"ql\">c</span>Redraw it properly here, with a best-fit line.", { mb: 2 }),
        { type: "draw", h: 82 },
      ] },

      /* 24 */
      { run: L5, blocks: [
        { type: "checkpoint", title: "Checkpoint — Lesson 5", items: [
          "1. A best-fit line is [[80]].",
          "2. We avoid dot-to-dot lines because [[70]].",
          "3. An anomalous result is [[80]].",
          "4. Before ignoring an anomalous result you should [[70]].",
          { html: "5. Why would deleting an inconvenient result be dishonest rather than just untidy?", lines: 2 },
        ] },
        { type: "home", paras: ["Find a graph somewhere outside school — a news site, a textbook, a sports app, a product advert. Run it through the graph quality checklist on page 3."], qs: [["a", "Where the graph came from, and what it shows:", 2], ["b", "Two things it does well:", 2], ["c", "One thing that would lose marks if a Year 9 student handed it in:", 2]] },
      ] },

      /* ---------------- Lesson 6 ---------------- */
      /* 25 */
      opener(L6, { badge: "LESSON 6", title: "Solo flight", subtitle: "Paper helicopter challenge · the whole process, on your own" },
        { title: "The helicopter that flew on Mars", paras: [
          "In April 2021 a small helicopter called Ingenuity lifted off the surface of Mars. Getting it to fly was brutally hard: the Martian atmosphere is around one per cent as dense as Earth's, so the rotors have almost nothing to push against.",
          "The engineers could not just try it and see. They tested rotor designs in a chamber pumped down to Martian pressure, changing blade size and spin rate, measuring lift, plotting the results, and reading the pattern off the graph. Ingenuity's rotors ended up over a metre across for a craft with a mass under 2 kg.",
          "Today you do a much smaller version of the same job — with paper. But the process is identical, and this time nobody is going to walk you through it.",
        ], punch: "This one is on you. Booklet, ruler, brain." },
        { title: "Your mission — independently, from start to finish", items: ["Identify all three types of variable", "Design your own results table with units", "Collect three trials for each of five values and calculate means", "Choose the correct graph and justify it", "Plot accurately, add a best-fit line, deal with anomalous results", "Write a conclusion supported by your own numbers"] },
        []),

      /* 26 */
      { run: L6, blocks: [
        task(1, "Plan before you cut anything", "10 min"),
        p("Recommended question: How does wing length affect the fall time of a paper helicopter? If your teacher lets you choose, you could instead investigate paperclip mass or drop height."),
        { type: "kv", rh: 10.6, labelW: "44%", rows: ["My research question", "Independent variable (and unit)", "Dependent variable (and unit)", "Three control variables", "Is the independent variable continuous or categoric?", "Which graph will I draw, and why?", "Five values I will test"] },
        { type: "spacer", mm: 2 },
        { type: "box", eyebrow: "Safety", paras: ["Do not climb on chairs, stools or benches to gain drop height. Use a height you can reach standing on the floor and use the same one every time. Take care with scissors. Keep the landing zone clear."] },
      ] },

      /* 27 */
      { run: L6, blocks: [
        task(2, "Design your own results table", "Assessed"),
        p("Draw it yourself in the space below. Nothing is printed for you here on purpose. A good table has: a column for the independent variable, three trial columns, a mean column, and units in every heading."),
        { type: "draw", h: 104 },
        { type: "spacer", mm: 1 },
        task(3, "Fly and record", "25 min"),
        p("Build each helicopter, add the same paperclips every time, and drop from the same height. Time the fall three times before changing anything."),
        { type: "duo",
          left: { eyebrow: "Getting decent timings", paras: ["The same person should time every drop — swapping timers introduces a new error partway through.", "Start the watch as the helicopter is released, not as you let go of the watch.", "Fall times are short, so your reaction time matters a lot. That is exactly why you repeat."] },
          right: { kind: "orange", eyebrow: "If a drop goes wrong", paras: ["If it hits a desk, catches a draught, or somebody knocks your arm — say so, and take that trial again. Note it down. A discarded trial with a written reason is honest. A quietly deleted one is not."] } },
        q("a", "Any trials you repeated, and why:", 2),
      ] },

      /* 28 */
      { run: L6, blocks: [
        task(4, "Graph your results", "Assessed"),
        p("Everything you have learned so far, in one graph. Title, axes, units, scale, accurate points, best-fit line, anomalous results noted."),
        { type: "draw", h: 137, foot: `<div class="tl">Title:</div><div class="r left">Check both axes have units before you hand this in</div>` },
        { type: "spacer", mm: 2 },
        task(5, "Conclusion", "Assessed"),
        { type: "starters", items: [
          "As [[45]] increased, the fall time [[55]]",
          { html: "The evidence for this is [[100]]", lines: 1 },
          "A specific pair of numbers from my results: at [[24]] the mean was [[24]], at [[24]] it was [[24]].",
          "My graph [[24]] contain a possible anomalous result. Details: [[60]]",
        ] },
        q("a", "Try a prediction. Using your best-fit line only, what fall time would you expect for a wing length you did <i>not</i> test? State the value and where you read it from.", 2),
      ] },

      /* 29 */
      { run: L6, blocks: [
        task(6, "Mark yourself", "Self-assessment"),
        p("Be strict. This is the same list your teacher will use."),
        { type: "checks", head: "Success criteria", ticks: ["Not yet", "Done"], tickW: "20mm", cls: "wide", items: ["Independent, dependent and control variables all identified", "Table designed by me, with units in every heading", "Three trials for every value of the independent variable", "Means calculated correctly", "Correct graph type, with a reason given", "Axes labelled, units shown, sensible scale", "Best-fit line rather than dot-to-dot", "Anomalous results identified, or their absence stated", "Conclusion quotes evidence from my own results"] },
        { type: "spacer", mm: 4 },
        { type: "checkpoint", title: "Checkpoint — Lesson 6", items: [
          { html: "1. The most important thing I have learned about drawing graphs is", lines: 1 },
          { html: "2. The most important thing I have learned about collecting data is", lines: 1 },
          { html: "3. One thing I would do differently next time, and the reason:", lines: 1 },
        ] },
        { type: "home", title: "Take it home — evaluation practice", paras: ["Write four sentences about your investigation: one strength of your method, one weakness, one possible random error, and one improvement you would actually make. You will need all four in the project that starts next lesson."], lines: 4 },
      ] },

      /* ---------------- Lessons 7-8 ---------------- */
      /* 30 */
      opener(L78, { badge: "LESSONS 7–8", title: "Your investigation", subtitle: "Design it · run it · graph it · defend it" },
        { title: "The scientists who tried to prove themselves wrong", paras: [
          "In 2015 the LIGO detectors picked up a signal from two black holes colliding a billion light years away. It was the first direct detection of gravitational waves, and it won a Nobel Prize.",
          "The team did not announce it. For months they attacked their own result — checking instruments, ruling out interference, running the analysis again. They had good reason to be careful: the collaboration had previously used <i>blind injections</i>, secret fake signals slipped into the data to test whether the team would spot them and whether they would follow their own procedures properly.",
          "Only once they had failed to break their own result did they publish it.",
        ], punch: "Your job over these two lessons: produce a result you cannot break." },
        ["Write a testable question in the form “How does X affect Y?”", "Plan a safe, fair investigation and get it approved", "Collect repeated measurements and calculate means", "Choose and draw the right graph for your own data", "Write a conclusion backed by evidence and an honest evaluation"],
        [
          task(1, "The rules", "Read first"),
          { type: "duo",
            left: { eyebrow: "Every group must", paras: ["Work in a pair or a three.<br>Ask one question: “How does X affect Y?”<br>Change one independent variable only.<br>Measure one dependent variable.<br>Identify at least three control variables."] },
            right: { eyebrow: "And every group must", paras: ["Test at least four or five values or categories.<br>Take at least three trials of each.<br>Calculate a mean for each.<br>Choose the correct graph type.<br>Write a conclusion <i>and</i> an evaluation."] } },
        ]),

      /* 31 */
      { run: L78, blocks: [
        task(2, "Choose a question that will work", "10 min"),
        p("Some starting points — you may use one of these or invent your own."),
        { type: "table", widths: ["52%", "28%", "20%"], align: ["", "", "c"], head: ["Research question", "Independent variable", "Likely graph"], rh: 9.35, rows: [["How does ramp height affect the distance travelled by a trolley?", "Ramp height", "Line"], ["How does wing length affect the fall time of a paper helicopter?", "Wing length", "Line"], ["How does surface type affect the distance travelled by a toy car?", "Surface type", "Bar"], ["How does material type affect the bounce height of a ball?", "Material type", "Bar"], ["How does the number of elastic bands affect launch distance?", "Number of bands", "Line"]] },
        p("And some that will waste your two lessons. Work out what is wrong with each one before your teacher tells you."),
        { type: "table", widths: ["44%", "56%"], head: ["Rejected question", "What is wrong with it"], rh: 9.35, rows: [["“What is the best paper helicopter?”", ""], ["“How does height affect it?”", ""], ["“How does surface affect speed and distance and time?”", ""], ["“How does throwing force affect distance?”", ""]] },
      ] },

      /* 32 */
      { run: L78, blocks: [
        task(3, "Planning grid", "Lesson 7"),
        { type: "kv", rh: 10.9, labelW: "40%", rows: ["Our research question", "Group members", "Independent variable (and unit)", "Dependent variable (and unit)", "Continuous or categoric?", "Graph we will use, and why", "At least three control variables", "Values or categories we will test (4–5)", "Equipment we need", "Safety risks", "How we will reduce those risks"] },
        { type: "spacer", mm: 1 },
        task(4, "Write your method", "Lesson 7"),
        p("Numbered steps. Someone from another class should be able to follow it without asking you a single question. Include how many trials you will take and how you will keep the control variables the same."),
        { type: "lines", n: 10 },
      ] },

      /* 33 */
      { run: L78, blocks: [
        task(5, "Teacher checkpoint", "Before any equipment"),
        { type: "box", kind: "orange", eyebrow: "Stop here", paras: ["Do not collect any data until your teacher has signed this box. This is not a formality — in a real lab, no experiment runs without approval."], mb: 5 },
        { type: "checks", twinW: ["47%", "12.5mm", "37%", "16mm"], twin: [["Question is clear and testable", "Independent variable is clear", "Dependent variable is measurable", "Control variables are realistic"], ["Method is safe", "Equipment is available", "Repeats are included", "Graph choice is sensible"]], tickW: "14.5mm" },
        { type: "html", html: `<table class="tbl kv"><colgroup><col style="width:40%"><col style="width:22%"><col style="width:16%"><col style="width:22%"></colgroup><tbody><tr><td class="k">Approved by</td><td></td><td class="k">Date</td><td></td></tr></tbody></table>` },
        task(6, "Results table", "Lesson 7"),
        p("Design your own headings. If your independent variable is categoric, replace the first heading with the category name — “Surface type”, “Material”, and so on."),
        { type: "table", cls: "grid", widths: ["24%", "19%", "19%", "19%", "19%"], head: ["&nbsp;", "", "", "", ""], rh: 10.9, rows: [["", "", "", "", ""], ["", "", "", "", ""], ["", "", "", "", ""], ["", "", "", "", ""], ["", "", "", "", ""]] },
        q("a", "Show one mean calculation in full:", 1),
        { type: "box", eyebrow: "While you collect", paras: ["Record results the moment you take them. Put units in the headings, not next to every number. Repeat each measurement at least three times. If a result looks odd, check it now — you will not get the equipment back."] },
      ] },

      /* 34 */
      { run: L78, blocks: [
        task("6b", "Lab notes", "While you work"),
        p("Anything that happened during data collection that a reader would want to know: equipment that misbehaved, a trial you repeated, a control variable that slipped, a surprise. Write it here as it happens — you will not remember next lesson, and this is where your evaluation comes from."),
        { type: "lines", n: 12 },
        { type: "spacer", mm: 2 },
        { type: "checkpoint", title: "Checkpoint — End of Lesson 7", items: [
          "1. Our research question is [[90]].",
          "2. Our independent variable is [[50]] and it is [[30]].",
          "3. Our dependent variable is [[80]].",
          "4. One control variable we genuinely managed to keep the same was [[60]].",
          "5. One result we may need to check next lesson is [[60]].",
        ] },
      ] },

      /* 35 */
      { run: L78, blocks: [
        task(7, "Decide your graph — again", "Lesson 8"),
        p("Do not draw anything yet. Answer these five first."),
        { type: "kv", rh: 9, labelW: "52%", rows: ["Is your independent variable continuous or categoric?", "So: line graph or bar chart?", "What goes on the x-axis?", "What goes on the y-axis?", "What units are needed, and where?"] },
        p("<span class=\"ql\">a</span>Largest mean value: [[26]] So each big square on the y-axis will be worth [[26]]", { mb: 4 }),
        task(8, "Draw your graph", "Lesson 8"),
        { type: "draw", h: 137.5, foot: `<div class="tl">Title:</div><div class="r left">Crosses for a line graph · gaps between bars for a bar chart</div>` },
      ] },

      /* 36 */
      { run: L78, blocks: [
        task(9, "Interrogate your own results", "Lesson 8"),
        q("a", "What pattern does the graph show? Does the dependent variable increase, decrease, or stay about the same?", 2),
        q("b", "Is the pattern strong and clear, or weak and scattered? What in the graph tells you that?", 2),
        q("c", "Any possible anomalous results? Say which, or state clearly that there are none.", 1),
        q("d", "What is the single strongest piece of evidence in your results — the one number a doubter would find hardest to argue with?", 2),
        task(10, "Conclusion", "Assessed"),
        p("Use the version that matches your investigation."),
        { type: "starters", items: [
          "If your graph is a line graph:<br>As [[45]] increased, [[45]] [[45]]<br>I know this because [[100]]",
          "If your graph is a bar chart:<br>The category with the highest [[45]] was [[45]]<br>I know this because [[100]]",
          { html: "Both: the numbers that prove it are [[100]]", lines: 1 },
          "This suggests that [[100]]",
        ] },
        task(11, "Evaluation", "Assessed"),
        p("This is where the marks hide. Be specific — name the actual thing that went wrong, not “human error”."),
        { type: "starters", items: ["One strength of our method was [[100]]", "One weakness of our method was [[100]]", "One possible random error was [[100]]", "One possible systematic error was [[100]]", { html: "If we repeated this investigation we would improve it by [[70]]", lines: 1 }] },
      ] },

      /* 37 */
      { run: L78, blocks: [
        q("a", "How confident are you in your conclusion — and what would it take to make you more confident?", 2),
        task(12, "Peer review", "Lesson 8"),
        p("Swap with another group. Their job is to find the weakness you missed. Yours is to be grateful for it."),
        { type: "checks", twinW: ["48%", "13mm", "36%", "16mm"], twin: [["Question uses “How does X affect Y?”", "Independent variable identified", "Dependent variable identified", "Three or more control variables", "Results table includes units", "At least three trials", "Means calculated", "Conclusion uses evidence"], ["Correct graph type chosen", "Axes labelled correctly", "Units shown on the graph", "Sensible scale used", "Points or bars accurate", "Best-fit line where appropriate", "Anomalous results considered", "Evaluation names an improvement"]], head: "Feature", tickW: "14.5mm" },
        { type: "kv", rh: 9, rows: ["Reviewed by", "The strongest part of this investigation", "The question I would ask this group"] },
        task(13, "Going further", "Stretch"),
        q("a", "Compare your results with another group who investigated something similar. Do you agree? If not, what could explain the difference?", 2),
        q("b", "Is your relationship linear (a straight line) or non-linear (a curve)? What does that tell you?", 2),
        q("c", "What range of values would you test if you had another two lessons, and why that range?", 2),
      ] },

      /* 38 */
      { run: L78, blocks: [
        { type: "checkpoint", title: "Checkpoint — End of the unit", items: [
          "1. The most important decision in our investigation was [[70]].",
          "2. The strongest evidence from our results was [[70]].",
          "3. The biggest source of error was probably [[70]].",
          { html: "4. What I personally contributed to the group:", lines: 1 },
          { html: "5. The hardest part of the whole unit, and what I would tell next year's Year 9 about it:", lines: 2 },
        ] },
        { type: "home", title: "Take it home — individual reflection", paras: ["Answer these on your own, not as a group. Your teacher wants your view, not the group's."], qs: [["1", "What did your group investigate, and what did your graph show?", 2], ["2", "What did you personally contribute?", 1], ["3", "What was the most difficult part, and how did you handle it?", 2], ["4", "If a stranger read your conclusion, what is the first objection they would raise?", 2]] },
      ] },

      /* ---------------- Glossary ---------------- */
      /* 39 */
      { run: GL, lead: { badge: "GLOSSARY", title: "Every word you need", subtitle: "If you use these words correctly, you sound like a physicist. If you avoid them, you lose marks." }, blocks: [
        { type: "table", cls: "gloss bf", widths: ["34%", "66%"], head: ["Word", "What it means"], rows: [
          ["Accuracy", "How close a measurement is to the true value"],
          ["Anomalous result (anomaly)", "A result that does not fit the pattern of the others"],
          ["Bar chart", "The graph you use when the independent variable is categoric"],
          ["Best-fit line", "A single straight or curved line showing the overall trend, with points balanced either side"],
          ["Categoric data", "Data sorted into named groups or types — material, colour, brand"],
          ["Continuous data", "Number data that can take any value on a scale — length, time, mass"],
          ["Control variable", "Something you deliberately keep the same so it cannot affect the result"],
          ["Dependent variable", "The thing you measure"],
          ["Independent variable", "The one thing you change"],
          ["Line graph", "The graph you use when the independent variable is continuous"],
          ["Mean", "The average: the total of the trials divided by the number of trials"],
          ["Precision", "How close repeated measurements are to each other"],
          ["Random error", "Unpredictable variation between repeats. Repeats and a mean reduce it"],
          ["Range", "The maximum and minimum values of the independent or dependent variables"],
          ["Repeatable", "The same person, method and equipment give similar results again"],
          ["Resolution", "The smallest change a measuring instrument can detect"],
          ["Systematic error", "An error that shifts every reading the same way. Repeats do not fix it"],
          ["Trial", "One repeat of a measurement"],
          ["Uncertainty", "The interval within which the true value can be expected to lie"],
        ] },
      ] },

      /* 40 */
      { run: GL, blocks: [
        { type: "h3", html: "Phrases that pick up marks" },
        { type: "table", cls: "phrases", widths: ["44%", "56%"], head: ["Instead of writing…", "Write…"], rows: [
          ["“It went up.”", "“As the ramp height increased, the distance travelled increased.”"],
          ["“It was human error.”", "“Reaction time when starting the stopwatch caused random error.”"],
          ["“One result was weird.”", "“The value at 20 cm is a possible anomalous result — it does not fit the trend.”"],
          ["“The results were good.”", "“The repeats were close together, so the data is precise.”"],
          ["“We did it three times.”", "“Three trials were taken at each value so that a mean could be calculated.”"],
          ["“It's a bar chart.”", "“A bar chart was used because material type is categoric.”"],
        ] },
        { type: "h3", html: "Track your progress" },
        { type: "p", html: "Tick a row at the end of every lesson. Be honest — this is for you, not for a mark.", cls: "sub-note" },
        { type: "table", cls: "rag", widths: ["12mm", "", "36mm"], align: ["c", "", "c"], head: ["L", "I can…", "Not yet / Getting there / Solid"], rh: 9.35, rows: [
          ["1", "Work out uncertainty and tell precision from accuracy", "○ ○ ○"],
          ["2", "Identify all three variables and choose the right graph", "○ ○ ○"],
          ["3", "Take repeat readings, find a mean, draw a bar chart", "○ ○ ○"],
          ["4", "Plot an accurate line graph with labelled axes and units", "○ ○ ○"],
          ["5", "Draw a best-fit line and deal with an anomalous result properly", "○ ○ ○"],
          ["6", "Run a whole investigation on my own", "○ ○ ○"],
          ["7–8", "Design my own experiment and defend the conclusion", "○ ○ ○"],
        ] },
        { type: "html", html: `<div class="sentence"><div class="k">The whole unit in one sentence</div><div class="v">Measure it more than once, be honest about the doubt,<br>show the pattern clearly, and let the evidence decide.</div></div><p class="credit">Work Like a Physicist · Year 9 Physics · Student Workbook</p>` },
      ] },
    ],
  };
})();
