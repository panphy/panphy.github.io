# Particle Model of Matter — Year 10 workbook, deck and Preps

Eight 50-minute lessons over four weeks for AQA GCSE Physics 4.3 and Combined Science: Trilogy 6.3, with specific heat capacity and its required practical from 4.1.1.3 / 6.1.1.3 (the Year 9 Energy unit leaves them for this unit). The pack is a teaching deck, one workbook booklet per lesson, a Unit review, answer editions, a teacher guide and four Preps. There is no companion website.

**Address:** <https://panphy.app/gcsephy/year10phy/unit02/>

The student hub uses `/gcsephy/assets/workbook-hub.css`, shared by all five workbook hubs: navy headers, bold headings and square cards, with the landing page’s stronger year accent (orange for Year 9, green for Year 10, yellow for Year 11). This stylesheet does not affect the printed workbooks.

## Sequence

| # | Lesson | Deck slides | Spec (Physics; Combined) | Practical |
|---:|---|---|---|---|
| 1 | Solids, liquids and gases | 3–7 | 4.3.1.1–2; 6.3.1.1–2 | Syringes; melting ice on a balance (demonstrations) |
| 2 | Gas particles and pressure | 8–12 | 4.3.3.1; 6.3.3.1 | Sealed flask and pressure gauge (demonstration) |
| 3 | Density | 13–17 | 4.3.1.1; 6.3.1.1 | — |
| 4 | Measuring density | 18–23 | RP 5; RP 17 | Required practical: regular solid, irregular solid, liquid |
| 5 | Internal energy and heating curves | 24–28 | 4.3.2.1, 4.3.2.3; 6.3.2.1, 6.3.2.3 | Cooling curve of stearic acid |
| 6 | Specific latent heat | 29–34 | 4.3.2.3; 6.3.2.3 | Latent heat of fusion of ice (the experiment the specification names) |
| 7 | Specific heat capacity | 35–39 | 4.3.2.2, 4.1.1.3; 6.3.2.2, 6.1.1.3 | Water and oil (demonstration) |
| 8 | Measuring specific heat capacity | 40–44 | RP 1; RP 14 | Required practical: heated metal block |

The Scheme of Work lists P3.1 particle model and motion in gases, P3.2 density and P3.3 internal energy and changes of state for weeks 1–2, then P3.4 specific latent heat and P3.5 specific heat capacity for weeks 3–4. Lessons follow that order; with a full lesson for each required practical, Lesson 5 (P3.3) opens week 3.

**Triple Science only.** Pressure and volume (4.3.3.2, p V = constant) and doing work on a gas (4.3.3.3) are not in Combined Science. They are deck slides 47–52, after the Key words slide, and the two extension pages at the end of the Unit review; a Triple class needs one extra lesson. Nothing else in the unit is Physics only, and Higher-tier content is not marked.

**Specific heat capacity practical.** The lab sheet measures the energy supplied with an ammeter, a voltmeter and a stopwatch (E = V I t, from Electric Circuits) and shows the joulemeter as the alternative. Its sample results (1.00 kg of aluminium, 12.0 V, 4.0 A, 600 s, 20.0 °C to 49.0 °C) give 993 J/kg °C from the totals and 940 J/kg °C from the gradient; the deck's results slide (42) and `shcGraph` in the deck's `figures.js` use the same numbers, so change them together.

## Files

| Path | Use |
|---|---|
| `index.html` | Student page linking the nine booklets, their answer editions and the four Preps (not their answers). Its `BOOKLETS` list holds each booklet's page count: update it after a rebuild changes one |
| `pdf/` | One booklet per lesson, the Unit review, an answer edition of each with the same page numbers, and `Particle Model of Matter - Year 10 Teacher Guide.pdf` (hosted but not linked from any page) |
| `workbook.html` | PDF source: `?lesson=1`…`8` or `?review`, add `&answers`; with neither it previews the whole unit |
| `teacher-guide.html` | Guide source (`?lesson=N` for one plan) |
| `assets/lessons-1-4.js`, `lessons-5-8.js` | The lessons: all the words and questions |
| `assets/reference.js` | Equation toolkit, key words, Unit review and the Triple Science only extension pages; builds `window.UNIT` |
| `assets/plans-data.js`, `assets/plans.js` | Teacher notes for each lesson, and their renderer |
| `assets/workbook.js`, `assets/workbook.css` | Renderer and print styles, adapted from the Year 9 Energy workbook (per-lesson booklets as in Year 11) |
| `assets/figures.js`, `assets/figures.css` | Line drawings (`window.ParticleFigures`), shared with the Preps and the deck |
| `build-pdfs.sh` | Rebuilds the PDFs with headless Chrome; name booklets (`3 7 review guide`) to rebuild only those |
| `prep/` | One-page Prep (homework) sheets, one per two lessons, each out of 10, with answer editions: `content.js` (questions), `prep.html` (preview, `?n=2&answers`) and `pdf/`. See [`../../assets/prep/README.md`](../../assets/prep/README.md) |
| [`../../decks/particle-model/`](../../decks/particle-model/) | 52-slide teaching deck; see [`../../decks/README.md`](../../decks/README.md) for shared styling and controls |

Maths is LaTeX between `\(` and `\)`, typeset by MathJax from a CDN, so previews and builds need a network connection; text is written as `String.raw` templates so backslashes survive. In sentences, `[[answer|a / b / c]]` prints a blank followed by its options and `{{a|b*|c}}` prints an AQA-style ring box with `*` on the answer: every gap shows its choices. Each lesson runs: opener → Do now → Learn it (worked example with “Your turn”) → Try it (supported → independent → challenge) → Practical where relevant → Exam corner → Revise it. In the two required-practical lessons the Practical comes before Try it, because the questions use the students' results. Every page after the cover prints 1.2× larger, as in the other workbooks.

Each lesson's `slides` field (in the lesson files) and the Sequence table above cite deck slide numbers, and the teacher guide repeats them: adding or removing a deck slide before the Key words slide means updating all three and rebuilding the PDFs.

## Rebuild

Serve the repository root (`python3 -m http.server 8000`), then run `sh build-pdfs.sh` here: it writes 19 PDFs to `pdf/`, one at a time. For the Preps, from the repository root run `sh gcsephy/assets/prep/build-pdfs.sh gcsephy/year10phy/unit02`. Check that each booklet and its answer edition have the same page count and that each Prep is one page.

## Equation sheet

AQA prints every equation in this unit on the Physics Equations Sheet (density, change in thermal energy, energy for a change of state and, for Physics, p V = constant), so the toolkit and the deck label them “on the sheet”. Evidence and links are in [`../unit01/README.md`](../unit01/README.md#equation-sheet).
