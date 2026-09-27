# Electric Circuits

**Year 10 Physics · AQA GCSE electricity · eight missions**

A student companion site for the Year 10 electricity unit: revision notes, worked examples, common mistakes, practice questions and an Exam Zone. It sits alongside the unit workbook (`workbook/`), the teaching deck and the *Electric circuits virtual labs* worksheet used in class.

**Address:** <https://panphy.app/gcsephy/year10phy/unit01/>

---

## Scope

Written for AQA GCSE Combined Science: Trilogy (Higher), sections 6.2.1–6.2.4. The same content appears in AQA GCSE Physics (separate science), sections 4.2.1–4.2.4, so the site also works for students moving to separate physics. Static electricity (Physics 4.2.5, separate only) is not covered.

| Mission | Title | Spec | Worksheet |
|---|---|---|---|
| 1 | Build & measure | 6.2.1.1: complete circuits, symbols, drawing rules, ammeter in series | Meters, pp. 1–2 |
| 2 | Charge on the move | 6.2.1.2: current, Q = I t, conventional current | Lab 1, pp. 3–6 |
| 3 | Energy per coulomb | 6.2.1.3, 6.2.4.2: p.d. as energy per coulomb, E = Q V, voltmeter in parallel | Lab 2, pp. 7–11 |
| 4 | Resistance & V = IR | 6.2.1.3–6.2.1.4, RP 15: V = I R, ohmic conductors, origin of resistance, measuring resistance, wire length | Lab 3, pp. 12–16 |
| 5 | Series & parallel | 6.2.2, RP 15: rules, R_total = R₁ + R₂, qualitative parallel | Lab 2, pp. 9–10 |
| 6 | I–V characteristics | 6.2.1.4, RP 16: resistor, lamp, diode, thermistor, LDR | — |
| 7 | Power & the National Grid | 6.2.4: P = V I, P = I² R, E = P t, transformers (HT: V_p I_p = V_s I_s) | — |
| 8 | Mains & safety | 6.2.3: ac/dc, 230 V 50 Hz, three-core cable, earth wire | — |

The missions follow the order of the Year 10 electricity workbook: circuits and symbols come first, and each meter is introduced with the quantity it measures (the ammeter in Mission 1, the voltmeter in Mission 3). Lesson URLs use slugs, not numbers, so links from the workbook are unaffected by the order.

Missions 1–6 also link to the PhET Circuit Construction Kit (DC). Missions 7–8 cover mains and the National Grid, which the kit cannot model, so they have no simulation link.

Required-practical numbers differ between courses: resistance is RP 15 (Trilogy) / RP 3 (Physics); I–V characteristics is RP 16 (Trilogy) / RP 4 (Physics).

**Required practicals.** Each required practical has its own page under `practical/`: `resistance/` (Part A wire length, Part B resistors in series and parallel) and `iv-characteristics/` (resistor, filament lamp, diode). Each page has the aim, apparatus, safety, variables, method with circuit diagrams, fillable results tables, graph instructions, analysis questions and a six-mark method question, with hints, example results and answers hidden until clicked. Readings and answers are saved in the student's browser only. The required-practical cards in Missions 4, 5 and 6 open these pages (Mission 5 opens Part B). Each practical also has a downloadable 12-page A4 worksheet PDF and an answer PDF, linked from the practical page and from the unit home Resources section. The worksheets add a "Before you start" page (key words and prediction sketches), tick-box method steps, teaching diagrams (bench layout, graph skills, current paths, reversing the supply, diode direction, hot and cool filament), Equation / Substitute / Answer calculation frames, evaluation questions and a self-check list for the six-mark question. The online practical pages show the same content.

**Go further.** Mission 5 has an optional panel and stretch question on calculating parallel resistance (1/R_total = 1/R₁ + 1/R₂). AQA does not require this for either course; it is clearly labelled as beyond the spec.

## Questions

- 47 practice questions across the eight missions (5–9 each, mixing practice, AQA-style and one go-further stretch question).
- 17 Exam Zone questions worth 56 marks, in four rounds, none repeated from the missions.
- Every question has a hint and a worked answer or marking points, hidden until clicked. As with the Year 9 site, answers are visible to students by design: this is a revision tool, not an assessment.

All questions are original. Circuit diagrams and graphs are drawn as inline SVG by `assets/diagrams.js`. No images from the teaching deck (some of which are third-party) are reused.

## Files

| Path | Purpose |
|---|---|
| `index.html` | Unit home: missions, equation toolkit, Exam Zone link, resources |
| `lesson/<slug>/index.html` | Thin shells; `assets/site.js` renders each mission from `assets/lessons.js` |
| `equation-triangles/index.html` | Optional rearranging help: interactive equation triangles, linked from the toolkit (`assets/triangles.js`) |
| `exam-zone/index.html` | Shell; `assets/exam-zone.js` renders `assets/exam-questions.js` |
| `practical/<slug>/index.html` | Thin shells; `assets/practical.js` renders each required practical from `assets/practicals.js` |
| `practical/worksheet.html` | Printable A4 worksheet built from the same data: `?rp=<slug>` for the student version, add `&answers` for the answers (`assets/practical-print.js`, `assets/practical-print.css`) |
| `Y10 Required Practical - *.pdf` | Worksheet and answer PDFs printed from `practical/worksheet.html`, linked from each practical page |
| `assets/practical-diagrams.js` | Pictorial teaching diagrams for the required practicals (`PracticalDiagrams`), used by the practical pages and the printed worksheets |
| `assets/diagrams.js` | Circuit-symbol, circuit-diagram and graph helpers (`Diagrams.circuit`, `graph`, `ivSketch`, `symbolGrid`) |
| `assets/styles.css` | Adapted from the Year 9 companion stylesheet with an electric palette |
| `Y10 Electricity Virtual Labs.pdf` | The class worksheet; missions deep-link to its pages |
| `Y10 Electricity Virtual Labs (Ans).pdf` | Worksheet answers, linked from the unit home Resources section |
| `Y10 Electricity Virtual Labs Teacher Guide.pdf` | Teacher guide; hosted for direct download, not linked from any page |
| `workbook/` | Twelve-lesson student workbook (one printable booklet per lesson, plus a unit review booklet), answer editions and a teacher guide, linked from the unit home Resources section. See [`workbook/README.md`](workbook/README.md) |

To edit content, change `assets/lessons.js`, `assets/exam-questions.js` or `assets/practicals.js`. There is no build step for the site. The workbook PDFs are printed from `workbook/workbook.html` and `workbook/teacher-guide.html` with `workbook/build-pdfs.sh`; the workbook uses `assets/diagrams.js`, so rebuild its PDFs after changing a circuit symbol.

After editing a practical, regenerate its PDFs so they match the page. Serve the site locally, open `practical/worksheet.html?rp=<slug>` (and again with `&answers`) in Chrome, and print to PDF with paper size A4, default margins and headers and footers turned off. The worksheet sets its own page numbers. Or use headless Chrome, for example:

```bash
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless --no-pdf-header-footer --virtual-time-budget=4000 --print-to-pdf="Y10 Required Practical - Resistance.pdf" "http://localhost:8000/gcsephy/year10phy/unit01/practical/worksheet.html?rp=resistance"
```

Headless Chrome may not exit on its own once the PDF is written; stop it when the file appears. Check that the student and answer versions have the same page count: a longer answer version means an answer has overflowed its page.

## Hosting notes

The unit lives under `gcsephy/`, outside the homepage catalogue. It is marked `noindex` and network-only: it does not register the root service worker (its pages load `/gcsephy/sw-register.js`, which only revalidates requests and offers a Reload banner when an open page changes), is not in `ASSETS_TO_CACHE`, and the worker never caches `/gcsephy/` requests. It is listed in `gcsephy/index.html`.

---

*Prepared by YPL. Adapt, improve and share.*
