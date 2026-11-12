# Electric Circuits

**Year 10 Physics, AQA GCSE electricity, twelve lessons**

The Year 10 electricity unit: a workbook in one booklet per lesson with a Unit review and a teacher guide (`workbook/`), the teaching deck, the *Electric circuits virtual labs* worksheet and six Preps. The student hub is `workbook/index.html`.

**Address:** <https://panphy.app/gcsephy/year10phy/unit01/workbook/>

## Scope

Written for AQA GCSE Combined Science: Trilogy (Higher) 6.2.1–6.2.4, which matches Physics (separate science) 4.2.1–4.2.4. Static electricity (Physics 4.2.5) is not covered.

The deck is organised in missions; the workbook teaches them in twelve lessons, with a full lesson for each required practical (Lessons 5, 7 and 9). Required-practical numbers differ by course: resistance is RP 15 (Trilogy) / RP 3 (Physics); I–V characteristics is RP 16 / RP 4.

## Equation sheet

AQA gives every student the full Physics Equations Sheet as an insert with each physics paper (Physics 8463 and Combined Science 8464/8465), so equations do not have to be memorised for the exam. Ofqual first required this for 2025–2027 and has since made it permanent for exams from 2028 onwards.

- Evidence: [AQA notice, 1 September 2026: formulae and equation sheets for 2027 and 2028 onwards](https://www.aqa.org.uk/news/gcse-maths-sciences-formulae-equation-sheets-2027-28), which links the [Ofqual decision](https://www.gov.uk/government/consultations/proposed-changes-to-the-assessment-of-mathematics-physics-and-combined-science-gcses/outcome/decisions-proposed-changes-to-the-assessment-of-mathematics-physics-and-combined-science-gcses) and the [sheet itself](https://www.aqa.org.uk/filestore/physics/AQA-GCSE-Science-8463-INS-AI-V2.3.pdf).
- The sheet has Q = I t, V = I R, P = V I, P = I² R, E = P t, E = Q V and (HT) V_p I_p = V_s I_s. It does **not** have R_total = R₁ + R₂, which students must learn.
- So the deck and workbook label equations "on the equation sheet" (and R_total "learn it"), while still teaching each one. If AQA changes this, update those labels, the deck's revision note on its Equation toolkit slide, `workbook/assets/workbook.js` and `plans.js`, the equations sheet notes in both course summaries (`gcsephy/course-summary/`), and this section.

## Files

| Path | Purpose |
|---|---|
| `workbook/` | Twelve-lesson workbook, Unit review, answer editions, teacher guide and the student hub (`workbook/index.html`). See [`workbook/README.md`](workbook/README.md) |
| `assets/diagrams.js`, `assets/practical-diagrams.js` | Circuit, graph and symbol helpers and pictorial practical diagrams, used by the workbook, the Preps and the teaching deck. Rebuild the workbook and Prep PDFs after changing a circuit symbol |
| `assets/components/` | Component photos for the deck's "What they look like" slide; renaming one means updating `../../decks/electric-circuits/index.html` too. The LDR picture is a generated redraw based on an ORP12 reference photo; see [`assets/components/ldr-source.md`](assets/components/ldr-source.md) |
| `Y10 Electricity Virtual Labs.pdf` | Class worksheet with its answers at the back, built from `workbook/workbook.html?labs`. If its pages move, update the page references in `workbook/assets/content.js` and `plans-data.js` |
| `Y10 Electricity Virtual Labs Teacher Guide.pdf` | Hosted but not linked; no source in this repository |
| `prep/` | One-page Prep (homework) sheets, one per two lessons, each out of 10, with answer editions: `content.js` (questions), `prep.html` (preview, `?n=2&answers`) and `pdf/`. The hub links the sheets, not the answer editions. See [`../../assets/prep/README.md`](../../assets/prep/README.md). Circuits and I–V sketches come from `assets/diagrams.js` |

The 62-slide teaching deck (`../../decks/electric-circuits/`) uses the shared calm GCSE style with a lime Year 10 accent and the GCSE section theme preference; see [`../../decks/README.md`](../../decks/README.md). Slides 56–62 (Mission 9, static electricity) are GCSE Physics only and come after the Key words slide; the workbook does not cover them. It has three photo slides, the components, the National Grid and the inside of a UK plug, and a news-page story of Coulomb’s torsion balance (slide 59, an engraving shared with the IB D.2 deck). The Grid, plug and Coulomb pictures are in the deck's `images/` folder, each with a credit on the slide linking to its source; change a photo and its credit together, and use only public domain or Creative Commons images that allow reuse.

## Hosting

Under `gcsephy/`: network-only, loads `/gcsephy/sw-register.js`, available by direct link; the GCSE landing page links the teaching deck and the workbook hub. There is no page at the unit folder itself.

---

*Prepared by YPL. Adapt, improve and share.*
