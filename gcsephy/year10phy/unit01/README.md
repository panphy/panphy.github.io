# Electric Circuits

**Year 10 Physics · AQA GCSE electricity · eight missions**

A student companion site for the Year 10 electricity unit: revision notes, worked examples, common mistakes, practice questions and an Exam Zone. It sits alongside the unit workbook (`workbook/`), the teaching deck and the *Electric circuits virtual labs* worksheet.

**Address:** <https://panphy.app/gcsephy/year10phy/unit01/>

## Scope

Written for AQA GCSE Combined Science: Trilogy (Higher) 6.2.1–6.2.4, which matches Physics (separate science) 4.2.1–4.2.4. Static electricity (Physics 4.2.5) is not covered.

| Mission | Title | Spec | Worksheet |
|---|---|---|---|
| 1 | Build & measure | 6.2.1.1: circuits, symbols, drawing rules, ammeter in series | Meters, p. 2 |
| 2 | Charge on the move | 6.2.1.2: current, Q = I t, conventional current | Lab 1, pp. 3–6 |
| 3 | Energy per coulomb | 6.2.1.3, 6.2.4.2: p.d., E = Q V, voltmeter in parallel | Lab 2, pp. 7–10 |
| 4 | Resistance & V = IR | 6.2.1.3–6.2.1.4, RP 15: V = I R, ohmic conductors, wire length | Lab 3, pp. 11–14 |
| 5 | Series & parallel | 6.2.2, RP 15: rules, R_total = R₁ + R₂ | Lab 2, pp. 9–10 |
| 6 | I–V characteristics | 6.2.1.4, RP 16: resistor, lamp, diode, thermistor, LDR | — |
| 7 | Power & the National Grid | 6.2.4: P = V I, P = I² R, E = P t, transformers | — |
| 8 | Mains & safety | 6.2.3: ac/dc, 230 V 50 Hz, three-core cable, earth | — |

Missions follow the workbook's order (each meter is introduced with its quantity). Lesson URLs use slugs, so reordering does not break links. Missions 1–6 link to the PhET Circuit Construction Kit; 7–8 have no simulation. Required-practical numbers differ by course: resistance is RP 15 (Trilogy) / RP 3 (Physics); I–V characteristics is RP 16 / RP 4.

**Required practicals.** `practical/resistance/` (Part A wire length, Part B series and parallel) and `practical/iv-characteristics/` each have aim, apparatus, safety, method with diagrams, fillable tables, graph instructions, analysis and a six-mark question, with hints and answers hidden until clicked. Readings are saved in the student's browser only. The paper version is workbook lessons 5, 7 and 9.

**Go further.** Mission 5 has an optional, clearly labelled beyond-spec panel on 1/R_total = 1/R₁ + 1/R₂.

## Equation sheet

AQA gives every student the full Physics Equations Sheet as an insert with each physics paper (Physics 8463 and Combined Science 8464/8465), so equations do not have to be memorised for the exam. Ofqual first required this for 2025–2027 and has since made it permanent for exams from 2028 onwards.

- Evidence: [AQA notice, 1 September 2026: formulae and equation sheets for 2027 and 2028 onwards](https://www.aqa.org.uk/news/gcse-maths-sciences-formulae-equation-sheets-2027-28), which links the [Ofqual decision](https://www.gov.uk/government/consultations/proposed-changes-to-the-assessment-of-mathematics-physics-and-combined-science-gcses/outcome/decisions-proposed-changes-to-the-assessment-of-mathematics-physics-and-combined-science-gcses) and the [sheet itself](https://www.aqa.org.uk/filestore/physics/AQA-GCSE-Science-8463-INS-AI-V2.3.pdf).
- The sheet has Q = I t, V = I R, P = V I, P = I² R, E = P t, E = Q V and (HT) V_p I_p = V_s I_s. It does **not** have R_total = R₁ + R₂, which students must learn.
- So the site, deck and workbook label equations "on the equation sheet" (and R_total "learn it"), while still teaching each one. If AQA changes this, update those labels, the deck's revision note on its Equation toolkit slide, the equation toolkit text in `index.html`, `workbook/assets/workbook.js` and `plans.js`, and this section.

## Questions

47 practice questions (5–9 per mission), plus 17 Exam Zone questions worth 56 marks in four rounds, none repeated. Every question has a hint and a worked answer, hidden until clicked; answers are visible by design, as this is a revision tool. All questions are original, and diagrams are inline SVG from `assets/diagrams.js`.

## Files

| Path | Purpose |
|---|---|
| `index.html` | Unit home: missions, equation toolkit, Exam Zone link, resources |
| `lesson/<slug>/index.html` | Thin shells; `assets/site.js` renders each mission from `assets/lessons.js` |
| `equation-triangles/index.html` | Interactive rearranging help (`assets/triangles.js`) |
| `exam-zone/index.html` | Shell; `assets/exam-zone.js` renders `assets/exam-questions.js` |
| `practical/<slug>/index.html` | Shells; `assets/practical.js` renders `assets/practicals.js` |
| `assets/practical-diagrams.js`, `assets/diagrams.js` | Pictorial practical diagrams; circuit, graph and symbol helpers |
| `assets/styles.css` | Adapted from the Year 9 companion stylesheet |
| `assets/components/` | Component pictures for the I–V mission; the teaching deck's "What they look like" slide uses the same files, so renaming one means updating `../../decks/electric-circuits/index.html` too |
| `Y10 Electricity Virtual Labs.pdf` | Class worksheet with its answers at the back, built from `workbook/workbook.html?labs`. Missions deep-link to its pages, so if they move, update `lab` in `assets/lessons.js`, the table above, and the page references in `workbook/assets/content.js` and `plans-data.js` |
| `Y10 Electricity Virtual Labs Teacher Guide.pdf` | Hosted but not linked; no source in this repository |
| `workbook/` | Twelve-lesson workbook, unit review, answer editions and teacher guide. See [`workbook/README.md`](workbook/README.md) |

To edit content, change `assets/lessons.js`, `exam-questions.js` or `practicals.js`; there is no build step. The workbook uses `assets/diagrams.js`, so rebuild its PDFs after changing a circuit symbol.

The teaching deck (`../../decks/electric-circuits/`) has three photo slides: the components, the National Grid and the inside of a UK plug. The Grid and plug photos are in the deck's `images/` folder, each with a credit on the slide linking to its source; change a photo and its credit together, and use only public domain or Creative Commons images that allow reuse.

## Hosting

Under `gcsephy/`: `noindex`, network-only, loads `/gcsephy/sw-register.js`, listed in `gcsephy/index.html`.

---

*Prepared by YPL. Adapt, improve and share.*
