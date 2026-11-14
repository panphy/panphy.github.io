# Electric Circuits — Year 10 workbook and teacher guide

Twelve 50-minute lessons for AQA GCSE Combined Science: Trilogy (Higher) and GCSE Physics, sections 6.2.1–6.2.4 / 4.2.1–4.2.4, for students with no prior knowledge of electricity. The booklets are self-contained; students reach [`index.html`](index.html) here from the GCSE landing page.

The student hub uses `/gcsephy/assets/workbook-hub.css`, shared by all five workbook hubs: navy headers, bold headings and square cards, with the landing page’s stronger year accent (orange for Year 9, green for Year 10, yellow for Year 11). This stylesheet does not affect the printed workbooks.

## Files

| File | Use |
|---|---|
| `pdf/` | 12 lesson booklets (9–13 pages), a 14-page Unit review, an answer edition of each with the same page numbers, and `Electric Circuits - Year 10 Teacher Guide.pdf` (hosted but not linked from any page) |
| `index.html` | Student page linking the thirteen booklets, the booklets' answer editions and the six Preps (`../prep/`, not their answers) |
| `workbook.html` | PDF source: `?lesson=1`…`12` or `?review`, add `&answers`; `?labs` is the virtual labs booklet |
| `teacher-guide.html` | Guide source (`?lesson=N` for one plan) |
| `assets/content.js`, `assets/plans-data.js` | All workbook content; teacher notes per lesson |
| `assets/labs-content.js` | Virtual labs booklet: three labs and their answer key, printed at the back |
| `assets/workbook.js`, `assets/plans.js` | Renderers |
| `assets/workbook.css`, `assets/diagrams-print.css` | Print styles; the latter holds the diagram styles for `../assets/diagrams.js` |
| `build-pdfs.sh` | Rebuilds all PDFs with headless Chrome; name booklets (`3 7 review labs guide`) to rebuild only those |

Diagrams use `../assets/diagrams.js`. Each booklet is self-contained: cover, how-to page, lesson, toolkit so far, key words and quick answers. The Unit review adds static electricity (Triple Science only), the full toolkit, all key words and a progress tracker. Every page after the cover prints 1.2× larger (12 pt body text, 1.45 line spacing, ~9.6 mm writing lines) for students with additional learning needs; graph paper is scaled back to keep 2 mm and 1 cm squares, and grid columns use `minmax(0, 1fr)` because Chrome shrinks the whole print if anything overflows. Check body text is still 12 pt after changing a layout.

## Sequence

| # | Lesson |
|---:|---|
| 1 | Complete circuits and symbols |
| 2 | Current and charge, Virtual Lab 1 |
| 3 | Potential difference, Virtual Lab 2 |
| 4 | Resistance and V = I R, Virtual Lab 3 |
| 5 | RP: resistance of a wire |
| 6 | Series and parallel circuits |
| 7 | RP: resistors in series and parallel |
| 8 | I–V graphs |
| 9 | RP: I–V characteristics |
| 10 | Thermistors, LDRs and sensors |
| 11 | Power and energy transfer |
| 12 | Mains, safety and the National Grid |

After Lesson 12: the Unit review (41 marks). The teacher guide sets a Prep as homework after every second lesson.

Each lesson runs: opener → Do now → Learn it (models, diagrams, slide examples to fill in and worked examples, each with "Your turn") → Try it (supported → independent → challenge) → Lab where relevant → Exam corner → Revise it.

**Slides and workbook match.** Every worked example on a deck slide (slides 10, 11, 16, 20, 31, 43, 44 and 47) is a `follow` block at the same point in Learn it (`slide` gives its number): the same question, printed blank with the slide's step labels for students to fill in as the teacher models it, beside a "Your turn" with numbers that appear on no slide. Each Quick check slide is a lesson's `quick` field, a box before the Exam corner, numbered on its own: slide 14 after Lesson 2, 25 after Lesson 5, 31 after Lesson 7, 40 after Lesson 10, and 47 and 53 after Lesson 12 (`quick` may be a list). Answers to both are in the answer editions only. When a slide example or Quick check changes, change its workbook copy, and keep practice questions from repeating their numbers. The other worked examples are not on a slide and stay printed (`worked`).

## Design notes

- Lesson 1 teaches circuits and symbols before testing; Q = I t comes in Lesson 2 and the voltmeter in Lesson 3.
- AQA provides the full equation sheet in every paper, including from 2028 (evidence and links: [`../README.md`](../README.md#equation-sheet)). The toolkit still teaches each equation, with triangles as rearranging help; R_total = R₁ + R₂ is not on the sheet.
- The student edition reserves the space answers take up, with answers hidden, so both editions have identical page numbers. Each lesson starts on a new page, so some end with white space.

## Rebuild

Serve the repository root (`python3 -m http.server 8000`), then run `sh build-pdfs.sh` here. It writes 27 PDFs to `pdf/` and the virtual labs booklet to `../Y10 Electricity Virtual Labs.pdf`, one at a time (parallel headless Chrome runs can truncate PDFs). Check that each booklet and its answer edition have the same page count.
