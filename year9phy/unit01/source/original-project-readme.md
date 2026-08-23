# Work Like a Physicist

**Year 9 Physics · Collecting, Processing and Presenting Data · eight lessons**

A complete unit on how to produce evidence other people will accept. Lesson plans, a student booklet, a teaching deck and an online companion site — ready to pick up and run, or to pull apart and rebuild for your own classes.

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
| `Work Like a Physicist - Year 9 Teaching Deck.pptx` | 65-slide teaching deck covering all eight lessons | **Open the speaker notes before you teach.** The slides are deliberately sparse; the teaching is in the notes |
| `Work Like a Physicist - Year 9 Student Workbook.pdf` | 40-page A4 student workbook, one per student for the whole unit | Print double-sided. Students keep the same workbook for all eight lessons |
| `Lesson 1 …` to `Lessons 7-8 …` (seven PDFs) | The lesson plans, formatted for reading | Read before teaching. This is the detail behind each lesson |
| `md files/` | The same seven lesson plans in Markdown | The plain-text master. Edit these if you are changing a plan, then re-export the PDF |
| `student-companion-site/` | Source code for the online student companion | You do not need this to teach the unit. See **The companion site** below |

The Markdown files and the lesson-plan PDFs are word-for-word identical. The Markdown exists so the content stays readable, searchable and diffable without needing any particular software — if you revise a lesson, revise the `.md` and keep the pair in step.

### How the parts fit together

- **Lesson plans** — the full detail: objectives, vocabulary, activities, expected answers, teacher notes.
- **Teaching deck** — what goes on the board, plus roughly a thousand words of teaching notes per slide: what to say, what to ask, the common wrong answer, and the booklet answers.
- **Student booklet** — where students actually write. Slides refer to booklet task numbers, so the two are designed to be used together.
- **Companion site** — optional, for students: revision, practice questions and catch-up outside the lesson.

You can teach from the deck alone in a pinch. You cannot teach it well without the booklet in students' hands, because every task assumes they are writing into it. The site is a bonus, not a dependency — the unit works completely without it.

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

**Address: `<paste the site URL here>`**

An optional student-facing website covering the same seven lessons. Students can use it for revision, for catching up after an absence, or for extra practice at home. Nothing in the taught unit depends on it.

**What is on it**

- A page per lesson, matching the seven lesson plans, with the mission, the key rule and what the lesson unlocks.
- **28 questions in total, four per lesson** — 14 practice questions and 14 AQA-style questions with mark allocations.
- Every question has a **hint** and a **full worked answer**, both hidden behind a click.
- A typing area for each question, so students write their own attempt before revealing anything.

**How students are meant to use it**

The intended sequence is printed on each lesson page: *attempt → hint if stuck → answer → improve your answer.* It is worth saying this out loud the first time you point a class at it. The answers show the working and where the marks fall, so it rewards attempting first and punishes nothing.

**A note for teachers**

The answers are visible to students by design — this is a revision tool, not an assessment. If you want to set questions from it as unseen homework, copy the prompts out rather than sending the link.

**The source code** in `student-companion-site/` is only needed if you want to change the site's content. The questions live in `app/data.ts`. Running it locally needs Node 22 or newer and `npm install` then `npm run dev`.

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

**What it feeds into.** Every required practical from Year 10 onwards. When students write an evaluation next year and reach for "human error", send them back to this booklet — the structure does not change, only the context. The glossary and the graph checklist at the back are designed to stay useful long after the unit ends.

**Assessment points.** Lesson 6 and Lessons 7–8 both carry success-criteria checklists in the student booklet, written in the same words a marker would use. Students self-assess against them first; that conversation is usually more useful than the mark itself. Lesson 6 is the natural point to collect books if you want a formal assessment.

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
- **The case studies** opening each lesson. They are there to buy two minutes of attention. If you have a better story, tell yours. (If you swap one out, drop the photo and its credit line with it.)
- **The timings.** There are none printed on the slides, deliberately — pacing is your call and a visible clock only adds pressure. Suggested timings sit in the speaker notes and are meant to be ignored freely.
- **Individual tasks.** Most lessons have more material than fifty minutes allows. Cutting a task is expected, not a failure.

**Differentiation already built in**

- Support: scaffolded tables are printed in the booklet for Lessons 3, 4 and 7–8.
- Stretch: every lesson has a marked stretch task; Lesson 6 asks students to design their own table from nothing, and to read a prediction off their own best-fit line.

**If you revise a lesson plan**, edit the Markdown in `md files/` and re-export the PDF so the pair stays in step. The Markdown is the master copy.

---

## A note on the student booklet

One booklet per student, kept for all eight lessons. It is designed so that everything a student needs is inside it:

- **Page 3, The Physicist's Toolkit** — every rule, formula and checklist on one page. Tell them to fold the corner; they will come back to it constantly.
- Each lesson follows the same four-part shape: **The Case → Your Mission → the numbered Tasks → Checkpoint.** Students always know where they are.
- Printed grid paper wherever a graph is needed, so no separate graph paper is required.
- A glossary, a "write this instead of that" phrase table, and a progress tracker at the back.

Answers to the booklet tasks are in the deck's speaker notes only — nothing is revealed on the board unless you choose to reveal it.

---

## Images in the deck

Each lesson opens with a real case study, and seven of those slides carry a photograph. Four are real photographs of the events described, credited on the slide itself:

| Slide | Image | Credit |
|---|---|---|
| 4 | The OPERA detector under construction, 2005 | MhieR / Wikimedia Commons, **CC BY-SA 3.0** |
| 37 | Farman, Gardiner and Shanklin with a Dobson ozone spectrophotometer | Chris Gilbert / British Antarctic Survey |
| 46 | NASA's Ingenuity helicopter on Mars | NASA/JPL-Caltech/ASU/MSSS |
| 53 | LIGO Hanford from the air | Caltech/MIT/LIGO Lab |

The remaining three case slides (13, 21, 29 — the energy-drink study, the helmet drop test, the stunt ramp) use **AI-generated illustrations**, not photographs of real events. They are there to set a scene, and it is worth being straight with a class about that if anyone asks.

**If you redistribute the deck**, keep the credit lines on the slides. The Wikimedia image is CC BY-SA, which requires attribution and share-alike; the BAS, NASA and LIGO images are used with credit as educational material. Full source URLs are recorded in `.codex-work/case-images/source-notes.txt`.

---

## Before you upload this to a shared folder

Some of what is in here is working material, not teaching material. **Share these:**

- the seven lesson-plan PDFs and the `md files/` folder
- the student booklet PDF
- the teaching deck
- this README

**Leave these behind.** They are large, regenerable, or of no use to anyone teaching the unit:

| Folder | Size | What it is |
|---|---|---|
| `student-companion-site/node_modules/` | ~467 MB | Downloaded packages. Rebuilt by `npm install` |
| `student-companion-site/dist/`, `.next/`, `.wrangler/` | ~4 MB | Build output |
| `.venv/` | ~59 MB | A Python environment left over from building the booklet |
| `.codex-work/` | — | Working files from producing the deck images. Keep your own copy: it holds the photo sourcing records |

If you are sharing the companion site's source as well, send `student-companion-site/` **without** `node_modules` — anyone who wants to run it will regenerate that themselves.

---

*Prepared by YPL. Adapt, improve and share.*
