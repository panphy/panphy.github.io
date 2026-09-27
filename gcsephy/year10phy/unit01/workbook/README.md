# Electric Circuits — Year 10 workbook and teacher guide

Twelve 50-minute lessons for AQA GCSE Combined Science: Trilogy (Higher) and GCSE Physics, sections 6.2.1–6.2.4 / 4.2.1–4.2.4, written for students with **no prior knowledge of electricity**. It sits inside the unit's companion website ([`../`](../)); students reach it from the unit home's resources section, which opens [`index.html`](index.html) in this folder.

## Files

| File | Use |
|---|---|
| `pdf/… Lesson 01 - Complete circuits and symbols.pdf` … `Lesson 12 - Mains, safety and the National Grid.pdf` | One booklet per lesson · 8–12 pages each |
| `pdf/… Unit review.pdf` | Unit review, static electricity (Physics only), all key words, progress tracker · 14 pages |
| `pdf/… (Answers).pdf` | Answer edition of each booklet, with the same page numbers |
| `pdf/Electric Circuits - Year 10 Teacher Guide.pdf` | Overview plus a one-page plan per lesson. Hosted for direct download but not linked from any page, like the Virtual Labs teacher guide |
| `index.html` | Student-facing page linking the thirteen booklets and their answer editions |
| `workbook.html` | Source of the workbook PDFs: `?lesson=1`…`12` or `?review`, add `&answers` for the answer edition; neither prints the whole unit |
| `teacher-guide.html` | Source of the guide (`?lesson=N` for a single plan) |
| `assets/content.js` | All workbook content: lessons, equations, unit review, glossary |
| `assets/plans-data.js` | Teacher notes for each lesson |
| `assets/workbook.js`, `assets/plans.js` | Renderers |
| `assets/workbook.css`, `assets/diagrams-print.css` | Print styles |
| `build-pdfs.sh` | Rebuilds all the PDFs with headless Chrome; name booklets (`3 7 review guide`) to rebuild only those |

Circuit diagrams and graphs use the website's own drawing helper (`../assets/diagrams.js`), so the booklet and the site look the same. `assets/diagrams-print.css` copies the site's diagram styles for print; keep it in step with `../assets/styles.css`. The HTML pages load `/gcsephy/sw-register.js` like the rest of `gcsephy/`.

Each lesson booklet is self-contained, so it can be printed and handed out on its own. It has a cover with the lesson's big question and goals, the how-to page (with the whole route, this lesson highlighted), the lesson, the equation toolkit up to that point (with equation triangles for rearranging), the lesson's key words and quick answers. The Unit review booklet holds the unit review, the static electricity page, the full toolkit, all the key words and the progress tracker.

Many students in this cohort have additional learning needs, so every page after the cover is printed 1.2 times larger than the base styles: 12 pt body text, 1.45 line spacing and writing lines about 9.6 mm apart. Graph paper is scaled back so its squares stay 2 mm and 1 cm. Chrome shrinks the whole print if anything is wider than the page, so grid columns use `minmax(0, 1fr)`; check the body text is 12 pt after changing a layout.

## Sequence

| # | Lesson | Website |
|---:|---|---|
| 1 | Complete circuits and symbols | Mission 1 |
| 2 | Current and charge · Virtual Lab 1 | Mission 2 |
| 3 | Potential difference · Virtual Lab 2 | Mission 3 |
| 4 | Resistance and V = I R · Virtual Lab 3 | Mission 4 |
| 5 | RP: resistance of a wire | Practical: Resistance, Part A (Mission 4) |
| 6 | Series and parallel circuits | Mission 5 |
| 7 | RP: resistors in series and parallel | Practical: Resistance, Part B |
| 8 | I–V graphs | Mission 6 |
| 9 | RP: I–V characteristics | Practical: I–V characteristics |
| 10 | Thermistors, LDRs and sensors | Mission 6 |
| 11 | Power and energy transfer | Mission 7 |
| 12 | Mains, safety and the National Grid | Missions 8 and 7 |

After Lesson 12: Unit review (41 marks, mixed), then the website Exam Zone. A static electricity page is included for separate Physics only (4.2.5).

Each lesson in the workbook runs: opener (big question, goals, key words, website link) → Do now → Learn it (models, diagrams, worked example with a "Your turn" pair) → Try it (supported → independent → challenge) → Lab where relevant → Exam corner (with a mark tip) → Revise it (summary, cover-and-answer questions, "I can" check).

## Design decisions

- **Lesson 1 teaches before it tests.** Students build a real circuit, move from picture to symbol to diagram, and practise the symbols and drawing rules. Q = I t comes in Lesson 2 and the voltmeter in Lesson 3, where p.d. is taught. The website's missions follow the same order.
- **Explanations students can revise from.** Each idea has an explanation, a model with its limitation, and a diagram drawn with the website's helper.
- **Graded practice.** Worked example → your turn → framed calculations → unframed → challenge, with varied formats (spot the mistake, circle the answer, ordering, student claims to correct).
- **Self-checking.** Quick answers at the back of each booklet, answer editions, and links to the website's worked answers.
- **Equations are understood and practised.** [AQA confirms that equation sheets will continue from 2028 for the lifetime of the current GCSE qualifications](https://www.aqa.org.uk/news/gcse-maths-sciences-formulae-equation-sheets-2027-28). The toolkit still teaches each equation in words and symbols, gives equation triangles as rearranging help, and the Unit review includes a recall challenge.
- **No QR codes.** Students do not usually have phones in lessons, so each lesson opener gives the mission name and web address as text.
- **Build.** HTML printed from Chrome, the same approach as the site's practical worksheets. This replaced an earlier ReportLab generator and Markdown lesson plans, which were drafted in `beta/unit01_resources/` and are in the git history.

## Notes

- Each lesson starts on a new page, so some lessons end with white space for notes.
- The student edition keeps the space that answers take up in the answer edition, with the answers hidden and left out of the PDF, so both editions have identical page numbers.

## Rebuild

Serve the repository root (`python3 -m http.server 8000`), then run `sh build-pdfs.sh` in this folder. It writes all 27 PDFs to `pdf/`. Build one booklet at a time (the script does): parallel headless Chrome runs can print truncated PDFs. Check that each booklet and its answer edition have the same page count.
