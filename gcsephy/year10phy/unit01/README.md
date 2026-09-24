# Electric Circuits

**Year 10 Physics · AQA GCSE electricity · eight missions**

A student companion site for the Year 10 electricity unit: revision notes, worked examples, common mistakes, practice questions and an Exam Zone. It sits alongside the teaching deck and the *Electric circuits virtual labs* worksheet used in class.

**Address:** <https://panphy.app/gcsephy/year10phy/unit01/>

---

## Scope

Written for AQA GCSE Combined Science: Trilogy (Higher), sections 6.2.1–6.2.4. The same content appears in AQA GCSE Physics (separate science), sections 4.2.1–4.2.4, so the site also works for students moving to separate physics. Static electricity (Physics 4.2.5, separate only) is not covered.

| Mission | Title | Spec | Worksheet |
|---|---|---|---|
| 1 | Charge on the move | 6.2.1.2: current, Q = I t, conventional current | Lab 1, pp. 3–6 |
| 2 | Energy per coulomb | 6.2.1.3, 6.2.4.2: p.d. as energy per coulomb, E = Q V | Lab 2, pp. 7–11 |
| 3 | Resistance & V = IR | 6.2.1.3–6.2.1.4: V = I R, ohmic conductors, origin of resistance | Lab 3, pp. 12–16 |
| 4 | Build & measure | 6.2.1.1, RP 15: symbols, meters, measuring resistance, wire length | Meters, pp. 1–2 |
| 5 | I–V characteristics | 6.2.1.4, RP 16: resistor, lamp, diode, thermistor, LDR | — |
| 6 | Series & parallel | 6.2.2, RP 15: rules, R_total = R₁ + R₂, qualitative parallel | Lab 2, pp. 9–10 |
| 7 | Mains & safety | 6.2.3: ac/dc, 230 V 50 Hz, three-core cable, earth wire | — |
| 8 | Power & the National Grid | 6.2.4: P = V I, P = I² R, E = P t, transformers (HT: V_p I_p = V_s I_s) | — |

Missions 1–6 also link to the PhET Circuit Construction Kit (DC). Missions 7–8 cover mains and the National Grid, which the kit cannot model, so they have no simulation link.

Required-practical numbers differ between courses: resistance is RP 15 (Trilogy) / RP 3 (Physics); I–V characteristics is RP 16 (Trilogy) / RP 4 (Physics).

**Go further.** Mission 6 has an optional panel and stretch question on calculating parallel resistance (1/R_total = 1/R₁ + 1/R₂). AQA does not require this for either course; it is clearly labelled as beyond the spec.

## Questions

- 42 practice questions across the eight missions (5–6 each, mixing practice, AQA-style and one go-further stretch question).
- 17 Exam Zone questions worth 56 marks, in four rounds, none repeated from the missions.
- Every question has a hint and a worked answer or marking points, hidden until clicked. As with the Year 9 site, answers are visible to students by design: this is a revision tool, not an assessment.

All questions are original. Circuit diagrams and graphs are drawn as inline SVG by `assets/diagrams.js`. No images from the teaching deck (some of which are third-party) are reused.

## Files

| Path | Purpose |
|---|---|
| `index.html` | Unit home: missions, equation toolkit, Exam Zone link, resources |
| `lesson/<slug>/index.html` | Thin shells; `assets/site.js` renders each mission from `assets/lessons.js` |
| `exam-zone/index.html` | Shell; `assets/exam-zone.js` renders `assets/exam-questions.js` |
| `assets/diagrams.js` | Circuit-symbol, circuit-diagram and graph helpers (`Diagrams.circuit`, `graph`, `ivSketch`, `symbolGrid`) |
| `assets/styles.css` | Adapted from the Year 9 companion stylesheet with an electric palette |
| `Y10 Electricity Virtual Labs.pdf` | The class worksheet; missions deep-link to its pages |

To edit content, change `assets/lessons.js` or `assets/exam-questions.js`. There is no build step.

## Hosting notes

The unit lives under `gcsephy/`, outside the homepage catalogue. It is marked `noindex` and network-only: it does not register the service worker, is not in `ASSETS_TO_CACHE`, and the worker never caches `/gcsephy/` requests. It is listed in `gcsephy/index.html`.

---

*Prepared by YPL. Adapt, improve and share.*
