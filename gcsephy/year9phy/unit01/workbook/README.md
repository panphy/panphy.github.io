# Work Like a Physicist — Year 9 student workbook (source)

Editable source for the A4 student workbook, printed in three parts (`../Work Like a Physicist - Year 9 Student Workbook - Part 1 - Lessons 1-2.pdf`, `Part 2 - Lessons 3-5`, `Part 3 - Lessons 6-8`), the Unit review, and an answer edition of each with the same page numbers. It uses the same engine and look as the Year 9 Energy workbook (`../../unit02/workbook/`): each lesson runs Do now → Learn it → Practical → Try it → Exam corner → Revise it, and each part ends with key words, a progress tracker, quick answers and the Physicist's toolkit.

The student hub, `index.html`, uses `/gcsephy/assets/workbook-hub.css`, shared by all four workbook hubs. That stylesheet does not affect the printed workbooks.

## Files

| File | Use |
|---|---|
| `workbook.html` | Print preview: `?part=1` (2, 3) for one part as printed, `&answers` for the answer edition, `?review` for the Unit review; with no part, the whole booklet. The parts are `PARTS` in `workbook.js` and `build-pdfs.sh` |
| `assets/lessons-a.js`, `lessons-b.js`, `lessons-c.js` | Lessons 1–2, 3–5 and 6–8: all the words, questions and answers. Lessons 7–8 are one entry (`n: 7, last: 8`) |
| `assets/content.js` | Joins the lessons; holds the key words and the “phrases that pick up marks” (each tagged with its lesson) and the Physicist's toolkit |
| `assets/review.js` | Unit review questions (`window.UNIT.review`), 40 marks, in the Exam corner format; `part: true` continues a question without a new number |
| `assets/workbook.js`, `workbook.css` | Renderer and print styles, adapted from the Year 9 Energy workbook (no MathJax: maths is plain text, with ÷) |
| `assets/figures.js`, `figures.css` | Line drawings for the workbook. Sample data match the teaching deck |
| `build-pdfs.sh` | Rebuilds the three parts, the Unit review and their answer editions with headless Chrome (`ONLY_PART=2` for one part, `ONLY_REVIEW=1` for the review) and warns if an answer edition's page count differs from its student edition |
| `index.html` | Student hub linking the parts, the review, their answers, the slide deck and the four Preps (`../prep/`) |

## Editing

In sentences, `[[answer|a / b / c]]` prints a blank followed by its options and `{{a|b*|c}}` prints an AQA-style ring box with `*` on the answer: every gap shows its choices. Personal results (own data, own graph) use labelled rows (`vars`) or writing lines instead of blanks. An answer (`a`, table `ans`, graph `points`, `fit`, `bars`) prints only in the answer edition; the student edition keeps its space, so both paginate identically. Block types are listed in `workbook.js`.

To rebuild: serve the repository root (`python3 -m http.server 8000`), then run `sh build-pdfs.sh` here (needs Chrome; Ghostscript for the page-count check). Practical, Exam corner and question cards print whole, moving to the next page rather than splitting; keep each card shorter than a page (about 224 mm on screen, since pages print 1.2× larger), splitting a long one into two cards. The toolkit must stay on one page.

The companion site (`../assets/lessons.js`: `workbookPart`, `pageStart`, `pageRange`) links each lesson to its part and pages; update them if pages move.
