# Electric Circuits

**Year 10 Physics, AQA GCSE electricity, twelve lessons**

The Year 10 electricity unit: a workbook in six part booklets with a Unit review, lesson plans, the teaching deck and six Preps. The student hub is `index.html`.

**Address:** <https://panphy.app/gcsephy/year10phy/unit01/>

## Scope

Written for AQA GCSE Combined Science: Trilogy (Higher) 6.2.1–6.2.4, which matches Physics (separate science) 4.2.1–4.2.4, for students with no prior knowledge of electricity. Static electricity (Physics 4.2.5) is on the Triple Science only page of the Unit review.

The deck is organised in missions; the workbook teaches them in twelve lessons, with a full lesson for each required practical (Lessons 5, 7 and 9). Lessons 2–4 and 10 have a lab in PanPhyCircuits (`/sandboxes/panphycircuits.html`), printed in the workbook; Lessons 7 and 9 say how to run their practicals there without kit. The answers to those labs are the app's own readings: if its models change, rerun the circuits and update the answer editions. Required-practical numbers differ by course: resistance is RP 15 (Trilogy) / RP 3 (Physics); I–V characteristics is RP 16 / RP 4.

## Equation sheet

AQA gives every student the full Physics Equations Sheet as an insert with each physics paper (Physics 8463 and Combined Science 8464/8465), so equations do not have to be memorised for the exam. Ofqual first required this for 2025–2027 and has since made it permanent for exams from 2028 onwards.

- Evidence: [AQA notice, 1 September 2026: formulae and equation sheets for 2027 and 2028 onwards](https://www.aqa.org.uk/news/gcse-maths-sciences-formulae-equation-sheets-2027-28), which links the [Ofqual decision](https://www.gov.uk/government/consultations/proposed-changes-to-the-assessment-of-mathematics-physics-and-combined-science-gcses/outcome/decisions-proposed-changes-to-the-assessment-of-mathematics-physics-and-combined-science-gcses) and the [sheet itself](https://www.aqa.org.uk/filestore/physics/AQA-GCSE-Science-8463-INS-AI-V2.3.pdf).
- The sheet has Q = I t, V = I R, P = V I, P = I² R, E = P t, E = Q V and (HT) V_p I_p = V_s I_s. It does **not** have R_total = R₁ + R₂, which students must learn.
- So the deck labels equations "on the equation sheet" (and R_total "learn it"), while the deck and workbook still teach each one. If AQA changes this, update those labels, the deck's revision note on its Equation toolkit slide, `assets/plans.js`, the equations sheet notes in both course summaries (`gcsephy/course-summary/`), and this section.

## Files

| Path | Purpose |
|---|---|
| `index.html` | Student hub, linked from the GCSE landing page and the deck: the six parts, the Unit review, their answer editions and the six Preps (not their answers). It uses `/gcsephy/assets/workbook-hub.css`, shared by all six workbook hubs, which does not affect the printed workbooks |
| `pdf/` | `Y10 - Unit 01 - Electric Circuits (Part 1).pdf` to `(Part 6)`, two lessons each, the `(Unit Review)` and an `(Ans)` edition of each with the same page numbers |
| `workbook.html` | PDF source: `?part=1`…`6` (`parts` in `assets/book.js`) or `?review`, add `&answers`; `?lesson=N` previews one lesson, and with none it previews the whole unit |
| `assets/content.js` | All workbook content |
| `assets/book.js` | Settings for the shared renderer ([`../../assets/workbook/README.md`](../../assets/workbook/README.md)): file names, parts, cover, equation triangles, the toolkit's unit conversions, the static electricity pages, the review's equation recall and the circuit-symbol blocks |
| `assets/diagrams.js`, `assets/practical-diagrams.js`, `assets/diagrams-print.css` | Circuit, graph and symbol helpers and pictorial practical diagrams, used by the workbook, the lesson plans, the Preps and the teaching deck, with their print styles. Rebuild the workbook and Prep PDFs after changing a circuit symbol |
| `assets/components/` | Component photos for the deck's "What they look like" slide; renaming one means updating `../../decks/electric-circuits/index.html` too. The LDR picture is a generated redraw based on an ORP12 reference photo; see [`assets/components/ldr-source.md`](assets/components/ldr-source.md) |
| `build-pdfs.sh` | Rebuilds the workbook PDFs with headless Chrome, then shrinks each with Ghostscript (`gcsephy/assets/compress-pdfs.sh`); name booklets (`p1 p3 review`) to rebuild only those |
| `lesson-plans/` | One lesson plan per lesson (`pdf/… - Lesson Plan 01.pdf` to `12`), not linked from any page. `plan.html` renders them from `assets/content.js`, `assets/plans-data.js` (teacher notes per lesson) and `assets/plans.js` (`?lesson=N` for one plan, with none an overview and every plan); `build-pdfs.sh` there rebuilds them |
| `prep/` | One-page Prep (homework) sheets, one per two lessons, each out of 10, with answer editions: `content.js` (questions), `prep.html` (preview, `?n=2&answers`) and `pdf/`. See [`../../assets/prep/README.md`](../../assets/prep/README.md) |

Each part is self-contained: cover, two lessons, toolkit so far, key words and quick answers. The Unit review adds static electricity (Triple Science only), the full toolkit and all key words. Every page after the cover prints 1.2× larger (12 pt body text, 1.45 line spacing, ~9.6 mm writing lines) for students with additional learning needs; graph paper is scaled back to keep 2 mm and 1 cm squares, and grid columns use `minmax(0, 1fr)` because Chrome shrinks the whole print if anything overflows. Check body text is still 12 pt after changing a layout.

The 66-slide teaching deck (`../../decks/electric-circuits/`) uses the shared calm GCSE style with a lime Year 10 accent and the GCSE section theme preference; see [`../../decks/README.md`](../../decks/README.md). Slides 59–66 (Mission 9, static electricity) are GCSE Physics only and come after the Key words slide; the workbook does not cover them. It has three photo slides, the components, the National Grid and the inside of a UK plug, photographs on six mission dividers (8, 15, 19, 33, 43 and 59), and a news-page story of Coulomb’s torsion balance (slide 62, an engraving shared with the IB D.2 deck). The Grid, plug, divider and Coulomb pictures are in the deck's `images/` folder, each with a credit on the slide linking to its source; change a photo and its credit together, and use only public domain or Creative Commons images that allow reuse.

## Sequence

| Part | # | Lesson |
|---:|---:|---|
| 1 | 1 | Complete circuits and symbols |
| 1 | 2 | Current and charge |
| 2 | 3 | Potential difference |
| 2 | 4 | Resistance and V = I R |
| 3 | 5 | RP: resistance of a wire |
| 3 | 6 | Series and parallel circuits |
| 4 | 7 | RP: resistors in series and parallel |
| 4 | 8 | I–V graphs |
| 5 | 9 | RP: I–V characteristics |
| 5 | 10 | Thermistors, LDRs and sensors |
| 6 | 11 | Power and energy transfer |
| 6 | 12 | Mains, safety and the National Grid |

After Lesson 12: the Unit review (41 marks). A Prep follows every second lesson, matching the parts.

Each lesson runs: opener → Do now → Learn it (models, diagrams, slide examples to fill in and worked examples, each with "Your turn") → Try it (supported → independent → challenge) → Lab where relevant → Exam corner → Revise it.

**Slides and workbook match.** Every worked example on a deck slide (slides 10, 11, 16, 20, 31, 44, 45 and 48) is a `follow` block at the same point in Learn it (`slide` gives its number): the same question, printed blank with the slide's step labels for students to fill in as the teacher models it, beside a "Your turn" with numbers that appear on no slide. Each Quick check slide is a lesson's `quick` field, a box before the Exam corner, numbered on its own: slide 14 after Lesson 2, 26 after Lesson 5, 32 after Lesson 7, 42 after Lesson 10, and 49 and 55 after Lesson 12 (`quick` may be a list). Answers to both are in the answer editions only. When a slide example or Quick check changes, change its workbook copy, and keep practice questions from repeating their numbers. The other worked examples are not on a slide and stay printed (`worked`).

## Design notes

- Lesson 1 teaches circuits and symbols before testing; Q = I t comes in Lesson 2 and the voltmeter in Lesson 3.
- The toolkit teaches each equation, with triangles as rearranging help, although AQA provides the equation sheet (see [Equation sheet](#equation-sheet)).
- The student edition reserves the space answers take up, with answers hidden, so both editions have identical page numbers. Each lesson starts on a new page, so some end with white space.

## Rebuild

Serve the repository root (`python3 -m http.server 8000`), then run `sh build-pdfs.sh` here (and in `lesson-plans/` for the plans). PDFs are written one at a time, because parallel headless Chrome runs can truncate them. Check that each booklet and its answer edition have the same page count.

## Hosting

Under `gcsephy/`: network-only, loads `/gcsephy/sw-register.js`, available by direct link; the GCSE landing page links the teaching deck and the student hub.

---

*Prepared by YPL. Adapt, improve and share.*
