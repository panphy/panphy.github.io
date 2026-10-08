# Work Like a Physicist

**Year 9 Physics · Collecting, Processing and Presenting Data · eight lessons**

A complete unit on how to produce evidence other people will accept. Lesson plans, a student workbook, a teaching deck and an online companion site — ready to pick up and run, or to pull apart and rebuild for your own classes.

---

## What the unit is for

Producing evidence that convinces people who were not there. Over eight lessons students learn to take a measurement they can defend, spot errors in their own results, and turn messy numbers into a graph that shows the pattern, then design, run and defend their own investigation. The skills (variables, repeats, means, uncertainty, precision versus accuracy, random versus systematic error, graph choice, best-fit lines, anomalous results, conclusions, evaluations) underpin every required practical to Year 13, so it pays to teach them once, properly.

---

## What is in this folder

| File | What it is | What to do with it |
|---|---|---|
| [`../../decks/work-like-a-physicist/index.html`](../../decks/work-like-a-physicist/index.html) | 50-slide HTML teaching deck covering all eight lessons | Present in a browser; advance to reveal answers and teaching points. A collapsible revision note for students sits beneath most slides (N) |
| `Work Like a Physicist - Year 9 Student Workbook.pdf` | 40-page A4 student workbook, one per student for the whole unit | Print double-sided. Students keep the same workbook for all eight lessons |
| `Work Like a Physicist - Year 9 Student Workbook (Answers).pdf` | Answer key for the workbook, by lesson, task and workbook page; linked from the companion site's Resources section | Mark with it, or let students self-check. Practical tasks give sample data |
| `workbook/` | Editable source of the student workbook and its answers (HTML, CSS, JavaScript) | Edit `workbook/assets/content.js` (or `answers.js` for the answers), then run `sh build-pdf.sh` (or `sh build-answers-pdf.sh`). See `workbook/README.md` |
| `worksheet/` | 2-page Lesson 5 practice sheet (best-fit line and curve, anomalous results, directly proportional) with a 1-page answer key, as editable source and PDFs | Print for Lesson 5 or revision. Edit `worksheet/assets/content.js`, then run `sh build-pdf.sh`. See `worksheet/README.md` |
| `teaching-guides/` | The seven lesson-plan PDFs (`Lesson 1 …` to `Lessons 7-8 …`) and their editable source | Read the PDFs before teaching; they are the detail behind each lesson. Edit `teaching-guides/source/*.md`, then run `sh build-pdf.sh`. See `teaching-guides/README.md` |
| `index.html`, `lesson/` and `assets/` | Static online student companion | Open `index.html`, or visit this folder's published web address |
| `source/` | Original Sites/React companion-site source and its Git history | Keep this when moving or backing up the project |

## Sources and how the parts fit

- `teaching-guides/source/*.md` are the editable masters of the lesson plans; rebuild the PDFs with `teaching-guides/build-pdf.sh` and keep the two in step.
- The teaching deck source is `../../decks/work-like-a-physicist/`.
- `workbook/assets/content.js` is the workbook source (rebuilt from the published PDF after the original was lost); re-export with `workbook/build-pdf.sh` and keep the PDF in step.
- `index.html`, `lesson/` and `assets/` are the static companion site; `source/` archives the original Sites/React version.

Lesson plans give objectives, vocabulary, activities, answers and teacher notes. The deck gives slides and reveal steps. The workbook is where students write, and every task assumes they have it. The companion site is an optional extra; the unit works without it.

---

## The eight lessons

| Lesson | Title | Focus | Practical |
|---|---|---|---|
| 1 | Can this data be trusted? | Uncertainty, precision, accuracy, resolution, random and systematic error | Short: repeat one measurement three times |
| 2 | What are you actually changing? | Independent, dependent and control variables; continuous vs categoric; graph choice | Optional demo |
| 3 | The drop test | Categoric data, repeats, means, bar charts | Shock absorber — ball dropped onto different materials |
| 4 | Higher ramp, further flight? | Continuous data, scales, plotting a line graph | Ramp — trolley distance against ramp height |
| 5 | The point that does not fit | Best-fit lines, anomalous results, graph quality, conclusions | None — analysis of Lesson 4 data |
| 6 | Solo flight | The whole process, unaided. Light-touch assessment | Paper helicopter |
| 7–8 | Your investigation | Student-designed investigation, in pairs or threes | Their choice, from a pooled equipment set |

The shape is deliberate: **Lessons 1–2 build the language, 3–5 build the technique on structured practicals, 6 is a solo run, 7–8 removes the scaffolding entirely.**

---

## The companion site

**Address: <https://panphy.app/gcsephy/year9phy/unit01/>**

A student revision hub for use alongside the workbook, after an absence, or before the end-of-unit test:

- a page per lesson with workbook-matched notes, key vocabulary and a link to the relevant workbook pages
- 40 questions: four in each of seven missions, plus 12 AQA-style Exam Zone questions worth 50 marks with fresh contexts
- a hint and full worked answer for every question, hidden behind a click, and a typing area so students attempt first
- links to the printable workbook and its answers PDF

Answers are visible by design; to set questions as unseen homework, copy the prompts rather than sharing the link. The site is static and lives under `gcsephy/`, which is network-only.

---

## Equipment checklist

Book this in advance. A missing trolley is the most reliable way to lose a lesson.

| Lesson | Per group | Notes |
|---|---|---|
| **1** | Metre rulers, stopwatches, a ball or toy car | Pick **one** task for the whole class rather than letting groups choose — it halves setup. The dropped-ruler reaction test is cheapest and shows random error most clearly |
| **2** | Mini whiteboards. Optional: toy car, ramp, 3–4 surfaces | Front demo only, no class practical |
| **3** | Ball (marble, bouncy or tennis — be consistent across the class), metre ruler, tray or box lid, 4–5 materials: sponge, cardboard, cloth, rubber mat, bubble wrap | Clamp stands make the drop height repeatable and save arguments. Otherwise mark a height on the wall with tape |
| **4** | Ramp, trolley or toy car, metre rule or tape, blocks or books to vary height, tape to mark the start point | Decide beforehand whether groups work on benches or the floor. Mark run lanes if the room is tight |
| **5** | Students' Lesson 4 graphs, rulers, pencils | No equipment. Have spare ramp data on the board for anyone absent in Lesson 4 |
| **6** | Paper (identical weight for everyone), scissors, 2–3 paperclips, stopwatch, metre ruler | Pre-cut templates save five minutes and remove a variable. Template: roughly 20 cm × 10 cm, cut down the middle from the top for two wings |
| **7–8** | A pooled set from all of the above | Put it all out and tell them they may only use what is on the table. It keeps proposals feasible |

**Have the equipment out before students walk in** for Lessons 3, 4 and 6. The 20-minute practical windows are realistic only if setup has already happened.

---

## Common pitfalls

These recur every year. Each one is addressed explicitly somewhere in the deck, but they are worth knowing in advance.

**"Precise means correct."**
The single most persistent misconception in the unit. Students see tightly clustered results and conclude they must be right. Lesson 1 is built around breaking this — the neutrino story exists precisely because a beautifully consistent result was completely wrong.

**"My results are numbers, so it's a line graph."**
Graph choice follows the **independent** variable, never the dependent one. The dependent variable is almost always a number, so it cannot distinguish the two cases. "Which surface gives the most friction?" measures centimetres but needs a bar chart, because surfaces are categories. Attack this head-on in Lesson 2 or it will cost marks in every lesson that follows.

**"Human error."**
Worth nothing, every time. Push for the mechanism: *"we judged the bounce height by eye and the ball moved too fast to read the ruler consistently."* The random/systematic distinction from Lesson 1 is what makes a specific answer possible.

**"Just ignore the weird result."**
Students want a rule for discarding data. The rule is: find out why first. Check the recording, check the method, repeat it if you can. An anomalous result you cannot explain gets reported and circled, not deleted. This is the closest the unit gets to teaching scientific honesty and it deserves the time.

**Dot-to-dot lines.**
They reappear under time pressure even after being taught against. A zig-zag line claims every reading is perfect — which students have already disproved themselves in Lesson 1.

**Scales.**
More marks are lost to bad scales than to bad measuring. Make students write down what one big square is worth *before* they draw an axis. Ninety seconds of this prevents thirty ruined graphs.

**The best shock absorber gives the *lowest* bounce.**
Lesson 3. Several groups every year draw a perfect bar chart and then invert the conclusion. Settle it before they collect any data.

---

## Where this sits in the curriculum

A working-scientifically unit with no new physics; the practicals are vehicles for skills GCSE assesses in every required practical: variables, fair tests, repeats and means, **uncertainty from repeat readings, (largest − smallest) ÷ 2**, precision/accuracy/resolution, random versus systematic error, graph choice with scales and units, best-fit lines, anomalies, conclusions and evaluations. When students write "human error" in Year 10, send them back to this workbook.

**Assessment points.** Lesson 6 and Lessons 7–8 carry success-criteria checklists in the workbook, worded as a marker would. Lesson 6 is the natural point to collect books.

---

## Adapting it

**Please do.** This is a starting point, not a scheme of work to be followed to the letter. Some parts carry more weight than others:

**Load-bearing — changing these breaks something downstream**

- The **order**. Lessons 3, 4 and 5 depend on the vocabulary from 1 and 2. Lesson 5 needs the graphs drawn in Lesson 4. Lessons 7–8 assume everything before.
- **Graph choice following the independent variable.** This one rule is the spine of the unit and recurs in six of the eight lessons.
- **Three trials and a mean**, every time. It is what makes the error discussion possible.
- The **random/systematic distinction**, introduced in Lesson 1 and used in every evaluation afterwards.

**Freely swappable**

- **The practicals.** Any categoric investigation works for Lesson 3; any continuous one works for Lesson 4. Use what your prep room actually has.
- **The case studies** opening each lesson. They are there to buy two minutes of attention. If you have a better story, tell yours, and update any associated image and credit.
- **The timings.** There are none printed on the slides, deliberately — pacing is your call and a visible clock only adds pressure.
- **Individual tasks.** Most lessons have more material than fifty minutes allows. Cutting a task is expected, not a failure.

**Differentiation already built in**

- Support: scaffolded tables are printed in the workbook for Lessons 3, 4 and 7–8.
- Stretch: every lesson has a marked stretch task; Lesson 6 asks students to design their own table from nothing, and to read a prediction off their own best-fit line.

**If you revise a lesson plan**, edit its Markdown master in `teaching-guides/source/` and re-export the PDFs with `teaching-guides/build-pdf.sh` so they stay in step.

---

## The student workbook

One per student for all eight lessons. Page 3, *The Physicist's Toolkit*, holds every rule, formula and checklist. Each lesson follows The Case → Your Mission → numbered Tasks → Checkpoint, with printed grid paper for graphs and a glossary, "write this instead of that" table and progress tracker at the back.

---

*Prepared by YPL. Adapt, improve and share.*
