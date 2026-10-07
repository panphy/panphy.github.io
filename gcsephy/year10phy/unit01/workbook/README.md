# Electric Circuits — Year 10 workbook and teacher guide

Twelve 50-minute lessons for AQA GCSE Combined Science: Trilogy (Higher) and GCSE Physics, sections 6.2.1–6.2.4 / 4.2.1–4.2.4, for students with no prior knowledge of electricity. Part of the unit's companion site ([`../`](../)); students reach it from the unit home's Resources section, which opens [`index.html`](index.html) here.

## Files

| File | Use |
|---|---|
| `pdf/` | 12 lesson booklets (8–12 pages), a 14-page Unit review, an answer edition of each with the same page numbers, and `Electric Circuits - Year 10 Teacher Guide.pdf` (hosted but not linked from any page) |
| `index.html` | Student page linking the thirteen booklets and answer editions |
| `workbook.html` | PDF source: `?lesson=1`…`12` or `?review`, add `&answers`; `?labs` is the virtual labs booklet |
| `teacher-guide.html` | Guide source (`?lesson=N` for one plan) |
| `assets/content.js`, `assets/plans-data.js` | All workbook content; teacher notes per lesson |
| `assets/labs-content.js` | Virtual labs booklet: three labs and their answer key, printed at the back |
| `assets/workbook.js`, `assets/plans.js` | Renderers |
| `assets/workbook.css`, `assets/diagrams-print.css` | Print styles; the latter copies the site's diagram styles, so keep it in step with `../assets/styles.css` |
| `build-pdfs.sh` | Rebuilds all PDFs with headless Chrome; name booklets (`3 7 review labs guide`) to rebuild only those |

Diagrams use the site's `../assets/diagrams.js`. Each booklet is self-contained: cover, how-to page, lesson, toolkit so far, key words and quick answers. The Unit review adds static electricity (Physics only), the full toolkit, all key words and a progress tracker. Every page after the cover prints 1.2× larger (12 pt body text, 1.45 line spacing, ~9.6 mm writing lines) for students with additional learning needs; graph paper is scaled back to keep 2 mm and 1 cm squares, and grid columns use `minmax(0, 1fr)` because Chrome shrinks the whole print if anything overflows. Check body text is still 12 pt after changing a layout.

## Sequence

| # | Lesson | Website |
|---:|---|---|
| 1 | Complete circuits and symbols | Mission 1 |
| 2 | Current and charge · Virtual Lab 1 | Mission 2 |
| 3 | Potential difference · Virtual Lab 2 | Mission 3 |
| 4 | Resistance and V = I R · Virtual Lab 3 | Mission 4 |
| 5 | RP: resistance of a wire | Practical: Resistance, Part A |
| 6 | Series and parallel circuits | Mission 5 |
| 7 | RP: resistors in series and parallel | Practical: Resistance, Part B |
| 8 | I–V graphs | Mission 6 |
| 9 | RP: I–V characteristics | Practical: I–V characteristics |
| 10 | Thermistors, LDRs and sensors | Mission 6 |
| 11 | Power and energy transfer | Mission 7 |
| 12 | Mains, safety and the National Grid | Missions 8 and 7 |

After Lesson 12: the Unit review (41 marks), then the website Exam Zone.

Each lesson runs: opener → Do now → Learn it (models, diagrams, worked example with "Your turn") → Try it (supported → independent → challenge) → Lab where relevant → Exam corner → Revise it.

## Design notes

- Lesson 1 teaches circuits and symbols before testing; Q = I t comes in Lesson 2 and the voltmeter in Lesson 3. The website's missions follow the same order.
- AQA provides the full equation sheet in every paper, including from 2028 (evidence and links: [`../README.md`](../README.md#equation-sheet)). The toolkit still teaches each equation, with triangles as rearranging help; R_total = R₁ + R₂ is not on the sheet.
- No QR codes; students rarely have phones in lessons, so openers give the mission name and address as text.
- The student edition reserves the space answers take up, with answers hidden, so both editions have identical page numbers. Each lesson starts on a new page, so some end with white space.

## Rebuild

Serve the repository root (`python3 -m http.server 8000`), then run `sh build-pdfs.sh` here. It writes 27 PDFs to `pdf/` and the virtual labs booklet to `../Y10 Electricity Virtual Labs.pdf`, one at a time (parallel headless Chrome runs can truncate PDFs). Check that each booklet and its answer edition have the same page count.
