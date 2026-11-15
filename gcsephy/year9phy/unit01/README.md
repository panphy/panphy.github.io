# Work Like a Physicist

**Year 9 Physics, Collecting, Processing and Presenting Data, eight lessons**

A complete unit on how to produce evidence other people will accept. Lesson plans, a student workbook and a teaching deck — ready to pick up and run, or to pull apart and rebuild for your own classes.

---

## What the unit is for

Producing evidence that convinces people who were not there. Over eight lessons students learn to take a measurement they can defend, spot errors in their own results, and turn messy numbers into a graph that shows the pattern, then design, run and defend their own investigation. The skills (variables, repeats, means, uncertainty, precision versus accuracy, random versus systematic error, graph choice, best-fit lines, anomalous results, conclusions, evaluations) underpin every required practical to Year 13, so it pays to teach them once, properly.

---

## What is in this folder

| File | What it is | What to do with it |
|---|---|---|
| [`../../decks/work-like-a-physicist/index.html`](../../decks/work-like-a-physicist/index.html) | 57-slide HTML teaching deck covering all eight lessons | Present in a browser; advance to reveal answers and teaching points. A compact Note pill at the lower right opens student notes above navigation (N), without resizing the slide |
| `index.html` | Student hub, linked from the GCSE landing page: the workbook parts, the review, their answers, the slide deck and the four Preps | Share its address with students |
| `pdf/Y09 - Unit 01 - Work Like a Physicist (Part 1).pdf`, `(Part 2)`, `(Part 3)` | The A4 student workbook in three booklets: Lessons 1–2, 3–5 and 6–8. Each part has a cover listing its lessons, the lessons with diagrams for revision, the Physicist's toolkit, key words and quick answers | Print double-sided; hand out each part as you reach it |
| `pdf/… (Ans).pdf` | Each part with answers filled in, so page numbers match; practical tasks show sample results from the deck | Mark with it, or let students self-check |
| `pdf/… (Unit Review).pdf`, `… (Unit Review) (Ans).pdf` | Unit review after Lesson 8: 40 marks of mixed AQA-style questions, the toolkit and all the key words; the answer edition has the same pages with a mark scheme | Set after Lesson 8, in class or at home |
| `workbook.html`, `assets/`, `build-pdfs.sh` | Editable source of the workbook parts, the Unit review and their answer editions (HTML, CSS, JavaScript) | Edit `assets/lessons-*.js` or `review.js`, then run `sh build-pdfs.sh`. See [Workbook source](#workbook-source) |
| `prep/` | Four one-page Prep (homework) sheets, one per two lessons, each out of 10, with answer editions (`pdf/`); the hub links the sheets, not the answer editions | Set after Lessons 2, 4, 6 and 8. Edit `prep/content.js`, then rebuild; see [`../../assets/prep/README.md`](../../assets/prep/README.md) |
| `lesson-plans/` | The seven lesson plans (`pdf/… - Lesson Plan 01.pdf` to `… - Lesson Plan 07-08.pdf`) and their editable source | Read the PDFs before teaching; they are the detail behind each lesson. Edit `lesson-plans/source/*.md`, then run `sh build-pdfs.sh`. See `lesson-plans/README.md` |

## Sources and how the parts fit

- `lesson-plans/source/*.md` are the editable masters of the lesson plans; rebuild the PDFs with `lesson-plans/build-pdfs.sh` and keep the two in step.
- The teaching deck source is `../../decks/work-like-a-physicist/`; its shared calm style uses the light-orange Year 9 accent. See [`../../decks/README.md`](../../decks/README.md) for styling and controls.
- `assets/lessons-a.js`, `lessons-b.js` and `lessons-c.js` are the workbook source; rebuild the PDFs with `build-pdfs.sh`.

Lesson plans give objectives, vocabulary, activities, answers and teacher notes. The deck gives slides and reveal steps. The workbook is where students write, and every task assumes they have it.

---

## The eight lessons

| Lesson | Title | Focus | Practical |
|---|---|---|---|
| 1 | Can this data be trusted? | Uncertainty, precision, accuracy, resolution, random and systematic error | Short: repeat one measurement three times |
| 2 | What are you actually changing? | Independent, dependent and control variables; continuous vs categoric; graph choice | Optional demo |
| 3 | The drop test | Categoric data, repeats, means, bar charts | Shock absorber — ball dropped onto different materials |
| 4 | Higher ramp, further travel? | Continuous data, scales, plotting a line graph | Ramp — trolley distance against ramp height |
| 5 | The point that does not fit | Best-fit lines, anomalous results, graph quality, conclusions | None — analysis of Lesson 4 data |
| 6 | Solo flight | The whole process, unaided. Light-touch assessment | Paper helicopter |
| 7–8 | Your investigation | Student-designed investigation, in pairs or threes | Their choice, from a pooled equipment set |

The shape is deliberate: **Lessons 1–2 build the language, 3–5 build the technique on structured practicals, 6 is a solo run, 7–8 removes the scaffolding entirely.**

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
- **The case studies** opening each lesson. They are there to buy two minutes of attention. If you have a better story, tell yours, and update any associated image and credit. In the deck each case has a news slide with a photograph (`images/case-*.jpg` in the deck folder); the credit under the photo links to its source and licence, so change both together. Use only public domain or Creative Commons images that allow reuse.
- **The timings.** There are none printed on the slides, deliberately — pacing is your call and a visible clock only adds pressure.
- **Individual tasks.** Most lessons have more material than fifty minutes allows. Cutting a task is expected, not a failure.

**Differentiation already built in**

- Support: scaffolded tables are printed in the workbook for Lessons 3, 4 and 7–8.
- Stretch: every lesson has a marked stretch task; Lesson 6 asks students to design their own table from nothing, and to read a prediction off their own best-fit line.

**If you revise a lesson plan**, edit its Markdown master in `lesson-plans/source/` and re-export the PDFs with `lesson-plans/build-pdfs.sh` so they stay in step.

---

## The student workbook

Three parts, one per stage of the unit: Lessons 1–2 (the language), 3–5 (technique on structured practicals) and 6–8 (on your own). Each lesson follows Do now → Learn it → Practical → Try it → Exam corner → Revise it, with diagrams students can revise from, printed graph paper, and the options printed beside every gap. Each part ends with the Physicist's toolkit, which holds every rule, calculation and checklist, the key words with “phrases that pick up marks”, and quick answers.

---

*Prepared by YPL. Adapt, improve and share.*

---

## Workbook source

The workbook source prints three parts, the Unit review and an answer edition of each with the same page numbers into `pdf/`. It uses the shared GCSE workbook renderer ([`../../assets/workbook/README.md`](../../assets/workbook/README.md)); this unit's settings, cover drawing, case-study panel and Physicist's toolkit are in `assets/book.js`.

The student hub, `index.html`, uses `/gcsephy/assets/workbook-hub.css`, shared by all six workbook hubs. That stylesheet does not affect the printed workbooks.

### Files

| File | Use |
|---|---|
| `workbook.html` | Print preview: `?part=1` (2, 3) for one part as printed, `&answers` for the answer edition, `?review` for the Unit review; with no part, the whole booklet. The parts are `parts` in `assets/book.js` and `PARTS` in `build-pdfs.sh` |
| `assets/lessons-a.js`, `lessons-b.js`, `lessons-c.js` | Lessons 1–2, 3–5 and 6–8: all the words, questions and answers. Lessons 7–8 are one entry (`n: 7, last: 8`) |
| `assets/content.js` | Joins the lessons; holds the key words and the “phrases that pick up marks” (each tagged with its lesson) and the Physicist's toolkit |
| `assets/review.js` | Unit review questions (`window.UNIT.review`), 40 marks, in the Exam corner format; `part: true` continues a question without a new number |
| `assets/book.js` | Settings for the shared renderer: file names, parts, cover, the lesson case-study panel and the Physicist's toolkit. No MathJax: maths is plain text, with ÷ |
| `assets/figures.js`, `figures.css` | Line drawings for the workbook. Sample data match the teaching deck |
| `build-pdfs.sh` | Rebuilds the three parts, the Unit review and their answer editions into `pdf/` with headless Chrome (`ONLY_PART=2` for one part, `ONLY_REVIEW=1` for the review), then shrinks each with Ghostscript (`gcsephy/assets/compress-pdfs.sh`), and warns if an answer edition's page count differs from its student edition |
| `index.html` | Student hub linking the parts, the review, their answers, the slide deck and the four Preps (`prep/`) |

### Editing

In sentences, `[[answer|a / b / c]]` prints a blank followed by its options and `{{a|b*|c}}` prints an AQA-style ring box with `*` on the answer: every gap shows its choices. Personal results (own data, own graph) use labelled rows (`vars`) or writing lines instead of blanks. An answer (`a`, table `ans`, graph `points`, `fit`, `bars`) prints only in the answer edition; the student edition keeps its space, so both paginate identically. Block types are listed in the shared renderer's README.

To rebuild: serve the repository root (`python3 -m http.server 8000`), then run `sh build-pdfs.sh` here (needs Chrome; Ghostscript for the page-count check). Practical, Exam corner and question cards print whole, moving to the next page rather than splitting; keep each card shorter than a page (about 224 mm on screen, since pages print 1.2× larger), splitting a long one into two cards. The toolkit must stay on one page.

Every worked example on a deck slide (slides 7 and 34) is a `follow` block at the same point in Learn it (`slide` gives its number): the same question, printed blank for students to fill in as the teacher models it, beside a “Your turn” that is on no slide. Lessons 1–6 each have a `quick` field: the deck's Quick check slide (12, 20, 29, 36, 44 and 52) as a box before the Exam corner, numbered on its own. Answers to both are in the answer editions only. When a slide example or Quick check changes, change its workbook copy, and keep practice questions from repeating their numbers.
