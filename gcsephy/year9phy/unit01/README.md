# Work Like a Physicist

**Year 9 Physics · Collecting, Processing and Presenting Data · eight lessons**

A complete unit on how to produce evidence other people will accept. Lesson plans, a student workbook, a teaching deck and an online companion site — ready to pick up and run, or to pull apart and rebuild for your own classes.

---

## What the unit is actually for

Anyone can have an opinion about how the world works. A physicist has to do something harder: produce evidence that convinces people who were not there and who may not want to believe them.

That is the whole unit. Not equations — evidence.

Over eight lessons students learn to take a measurement they can defend, spot the errors hiding inside their own results, and turn a page of messy numbers into a graph that makes the pattern obvious. By the end they design, run and defend an investigation of their own.

The skills are the ones every required practical from here to Year 13 will lean on: variables, repeats, means, uncertainty, precision versus accuracy, random versus systematic error, graph choice, best-fit lines, outliers, conclusions and evaluations. Teaching them properly once, in a unit of their own, is far cheaper than re-teaching them badly inside every practical that follows.

---

## What is in this folder

| File | What it is | What to do with it |
|---|---|---|
| [`../../decks/work-like-a-physicist/index.html`](../../decks/work-like-a-physicist/index.html) | 50-slide HTML teaching deck covering all eight lessons | Present in a browser; advance to reveal answers and teaching points |
| `Work Like a Physicist - Year 9 Student Workbook.pdf` | 40-page A4 student workbook, one per student for the whole unit | Print double-sided. Students keep the same workbook for all eight lessons |
| `workbook/` | Editable source of the student workbook (HTML, CSS, JavaScript) | Edit `workbook/assets/content.js`, then run `sh build-pdf.sh` to re-export the PDF. See `workbook/README.md` |
| `Lesson 1 …` to `Lessons 7-8 …` (seven PDFs) | The lesson plans, formatted for reading | Read before teaching. This is the detail behind each lesson |
| `md files/` | The same seven lesson plans in editable Markdown | Edit these master copies when revising a plan, then re-export the matching PDF |
| `index.html`, `lesson/` and `assets/` | Static online student companion | Open `index.html`, or visit this folder's published web address |
| `source/` | Original Sites/React companion-site source and its Git history | Keep this when moving or backing up the project |

## Working copy and source of truth

This repository is the working copy of the unit. The lesson plans, workbook and student companion are here; the teaching deck is maintained in `gcsephy/decks/work-like-a-physicist/`.

- The files in `md files/` are the editable masters for the lesson plans. Keep each Markdown file and its exported PDF in step.
- The HTML and JavaScript in `../../decks/work-like-a-physicist/` are the editable teaching-deck source.
- `index.html`, `lesson/` and `assets/` are the editable source for the static companion website.
- `source/` preserves the original Sites/React companion site and its Git history.
- `workbook/` is the editable source of the student workbook. It was rebuilt from the published PDF after the original source was lost; edit `workbook/assets/content.js` and re-export with `workbook/build-pdf.sh`, and keep the PDF and its source in step.

### How the parts fit together

- **Lesson plans** — the full detail: objectives, vocabulary, activities, expected answers, teacher notes.
- **Teaching deck** — browser-based slides with diagrams, questions and reveal steps for classroom discussion.
- **Student workbook** — where students actually write. The lesson plans and workbook tasks are designed to be used together.
- **Companion site** — optional, for students: revision, practice questions and catch-up outside the lesson.

You can teach from the deck alone in a pinch. You cannot teach it well without the workbook in students' hands, because every task assumes they are writing into it. The site is a bonus, not a dependency — the unit works completely without it.

---

## The eight lessons

| Lesson | Title | Focus | Practical |
|---|---|---|---|
| 1 | Can this data be trusted? | Uncertainty, precision, accuracy, resolution, random and systematic error | Short: repeat one measurement three times |
| 2 | What are you actually changing? | Independent, dependent and control variables; continuous vs categoric; graph choice | Optional demo |
| 3 | The drop test | Categoric data, repeats, means, bar charts | Shock absorber — ball dropped onto different materials |
| 4 | Higher ramp, further flight? | Continuous data, scales, plotting a line graph | Ramp — trolley distance against ramp height |
| 5 | The point that does not fit | Best-fit lines, outliers, graph quality, conclusions | None — analysis of Lesson 4 data |
| 6 | Solo flight | The whole process, unaided. Light-touch assessment | Paper helicopter |
| 7–8 | Your investigation | Student-designed investigation, in pairs or threes | Their choice, from a pooled equipment set |

The shape is deliberate: **Lessons 1–2 build the language, 3–5 build the technique on structured practicals, 6 is a solo run, 7–8 removes the scaffolding entirely.**

---

## The companion site

**Address: <https://panphy.app/gcsephy/year9phy/unit01/>**

A student-facing lesson companion and revision hub covering the same seven lesson sections. Students can use it alongside the workbook in class, to catch up after an absence, to revise independently, or to prepare for the end-of-unit test. Nothing in the taught unit depends on it.

**What is on it**

- A page per lesson with **workbook-matched revision notes**, key vocabulary and a direct link to the relevant workbook pages.
- The notes cover the same variables, calculations, practical methods, graph rules, conclusions and evaluation language as workbook pages 4–38.
- **40 questions in total** — four questions in each of the seven missions, plus 12 separate AQA-style Exam Zone questions worth 50 marks. The Exam Zone uses fresh contexts and does not repeat mission questions.
- Every question has a **hint** and a **full worked answer**, both hidden behind a click.
- A typing area for each question, so students write their own attempt before revealing anything.

**How students are meant to use it**

The intended sequence is printed on each lesson page: *review the notes → use the matching workbook pages → attempt the questions → hint if stuck → check → improve.* The answers show the working and where the marks fall, so it rewards attempting first and punishes nothing.

**A note for teachers**

The answers are visible to students by design — this is a revision tool, not an assessment. If you want to set questions from it as unseen homework, copy the prompts out rather than sending the link.

This hosted copy is a static site and does not need a build step or server-side runtime. It lives under `gcsephy/`, which is network-only and uses a separate freshness worker without offline caching.

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
Worth nothing, every time. Push for the mechanism: *"we judged the bounce height by eye and the ball moved too fast to read the ruler reliably."* The random/systematic distinction from Lesson 1 is what makes a specific answer possible.

**"Just ignore the weird result."**
Students want a rule for discarding data. The rule is: find out why first. Check the recording, check the method, repeat it if you can. An outlier you cannot explain gets reported and circled, not deleted. This is the closest the unit gets to teaching scientific honesty and it deserves the time.

**Dot-to-dot lines.**
They reappear under time pressure even after being taught against. A zig-zag line claims every reading is perfect — which students have already disproved themselves in Lesson 1.

**Scales.**
More marks are lost to bad scales than to bad measuring. Make students write down what one big square is worth *before* they draw an axis. Ninety seconds of this prevents thirty ruined graphs.

**The best shock absorber gives the *lowest* bounce.**
Lesson 3. Several groups every year draw a perfect bar chart and then invert the conclusion. Settle it before they collect any data.

---

## Where this sits in the curriculum

This is a **working scientifically** unit rather than a content unit. It carries no new physics — the practicals are vehicles for the skills.

It covers, at Year 9 level, the investigative skills that GCSE specifications assess across every required practical:

- identifying independent, dependent and control variables
- planning a fair test and judging whether a question is testable
- repeat readings, means, and why repeats are taken at all
- **uncertainty estimated as half the range** — the AQA-style treatment, deliberately kept simple
- precision, accuracy and resolution as distinct ideas
- random versus systematic error, and why repeats fix only one of them
- selecting and drawing the correct graph, with scales, labels and units
- best-fit lines, anomalies and outliers
- conclusions supported by evidence, and evaluations naming realistic improvements

**What it feeds into.** Every required practical from Year 10 onwards. When students write an evaluation next year and reach for "human error", send them back to this workbook — the structure does not change, only the context. The glossary and the graph checklist at the back are designed to stay useful long after the unit ends.

**Assessment points.** Lesson 6 and Lessons 7–8 both carry success-criteria checklists in the student workbook, written in the same words a marker would use. Students self-assess against them first; that conversation is usually more useful than the mark itself. Lesson 6 is the natural point to collect books if you want a formal assessment.

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

**If you revise a lesson plan**, edit its Markdown master in `md files/` and re-export the matching PDF so the pair stays in step.

---

## A note on the student workbook

One workbook per student, kept for all eight lessons. It is designed so that everything a student needs is inside it:

- **Page 3, The Physicist's Toolkit** — every rule, formula and checklist on one page. Tell them to fold the corner; they will come back to it constantly.
- Each lesson follows the same four-part shape: **The Case → Your Mission → the numbered Tasks → Checkpoint.** Students always know where they are.
- Printed grid paper wherever a graph is needed, so no separate graph paper is required.
- A glossary, a "write this instead of that" phrase table, and a progress tracker at the back.

Use the lesson plans for teaching guidance. The HTML deck reveals selected answers only when you advance its steps.

---

## What is included in this repository

- the seven lesson-plan PDFs
- the seven editable Markdown lesson-plan masters
- the student workbook PDF and its editable source in `workbook/`
- the HTML teaching deck in `../../decks/work-like-a-physicist/`
- this overview
- the static student companion site, including seven workbook-matched revision guides, all seven missions and 40 questions
- the original Sites/React companion-site source and its four-commit Git history

Dependency folders, build output, caches and rendered production previews are intentionally not included because they can be regenerated. Any future editable source or production record needed to maintain the unit should be added to this repository before its separate working copy is removed.

---

*Prepared by YPL. Adapt, improve and share.*
