# Energy: Stores and Transfers

**Year 9 Physics · AQA GCSE energy · nine lessons**

A student workbook and a Unit review (each with an answer edition), a teaching deck and nine lesson plans. There is no companion website; [`index.html`](index.html) is a short page linking the workbook, the Unit review, their answers, the deck and the five Preps. The lesson plans are not linked there.

## Scope

From the AQA specification (Physics 8463 / Combined Science 8464 numbering): 4.1.1.1 stores and systems, 4.1.1.2 kinetic, gravitational and elastic potential energy, 4.1.1.4 power (as P = E ÷ t only; work done is left to Forces), 4.1.2.1 conservation, dissipation and insulation, 4.1.2.2 efficiency, and 4.5.3 Hooke's law, taught only to give k for Eₑ = ½ k e². Not included: specific heat capacity, energy resources, required-practical write-ups. Sankey diagrams are not in the specification but are used to picture efficiency.

Rearranging is limited to cases without a square root: h or m from Eₚ, k or e from F = k e, E or t from power, and the useful output or total input from efficiency. Never v or m from Eₖ, nor e from Eₑ.

Weight (W = m g) is taught in Forces. Here g = 9.8 N/kg is "each kilogram is pulled down with 9.8 N", and the bench rule "each 100 g pulls down with about 1 N" is used only in the spring practical.

| # | Lesson | Week | Practical |
|---:|---|---|---|
| 1 | Energy stores and systems | 1 | Energy story; optional circus |
| 2 | The kinetic store | 1 | Trolley over 1.00 m |
| 3 | The gravitational potential store | 2 | Lift it (activity) |
| 4 | Stretching springs | 2 | Force–extension; plots extension–force, then force–extension |
| 5 | The elastic potential store | 3 | Energy of their own spring |
| 6 | Conservation of energy | 3 | Pendulum heights (no fast timing) |
| 7 | Power | 4 | Stair climb, everyone uses 50 kg |
| 8 | Wasted energy | 4 | Cooling cups; Eco House |
| 9 | Efficiency | 5 | Bounce efficiency h₂ ÷ h₁ |

The second lesson of week 5 is for revision and catch-up; the end-of-unit test is planned for week 6.

The student hub uses `/gcsephy/assets/workbook-hub.css`, shared by all four workbook hubs: navy headers, bold headings and square cards, with the landing page’s stronger year accent (orange for Year 9, green for Year 10, yellow for Year 11). This stylesheet does not affect the printed workbooks.

## Files

| Path | What it is |
|---|---|
| `Energy - Year 9 Student Workbook.pdf` | 66-page A4 booklet, one per student: nine lessons, key words, progress tracker, quick answers and the equation toolkit with formula triangles on the last page |
| `Energy - Year 9 Student Workbook (Answers).pdf` | The same pages with answers filled in, so page numbers match |
| `Energy - Year 9 Unit Review.pdf`, `… (Answers).pdf` | 7-page unit review after Lesson 9: 40 marks of mixed AQA-style questions, a fix-it log and the equation toolkit; the answer edition has the same pages |
| `workbook/` | Workbook source; see below |
| `teaching-guides/` | Nine lesson-plan PDFs and their Markdown source; see its README |
| `prep/` | One-page Prep (homework) sheets, one per week (Prep 5 follows Lesson 9), each out of 10, with answer editions: `content.js` (questions), `prep.html` (preview, `?n=2&answers`) and `pdf/`. The hub links the sheets, not the answer editions. See [`../../assets/prep/README.md`](../../assets/prep/README.md). Maths is LaTeX for MathJax, as in the workbook |
| [`../../decks/energy-stores-and-transfers/`](../../decks/energy-stores-and-transfers/) | 64-slide teaching deck |

## Workbook source

| File | Use |
|---|---|
| `workbook/workbook.html` | Print preview; `?answers` for the answer edition, `?review` (with or without `&answers`) for the Unit review |
| `workbook/assets/lessons-a.js`, `lessons-b.js`, `lessons-c.js` | Lessons 1–2, 3–5 and 6–9: all the words and questions |
| `workbook/assets/content.js` | Joins the lessons and holds the equation toolkit and key words |
| `workbook/assets/review.js` | The Unit review questions (`window.UNIT.review`), in the Exam corner format; `t: "part"` gives an unnumbered part |
| `workbook/assets/workbook.js`, `workbook.css` | Renderer and print styles, adapted from the Year 10 workbook |
| `workbook/assets/figures.js`, `figures.css` | Line drawings, shared with the deck |
| `workbook/build-pdfs.sh` | Rebuilds the workbook, the Unit review and their answer editions with headless Chrome (`ONLY_REVIEW=1` for the review only) |

Maths is LaTeX between `\(` and `\)`, typeset by MathJax from a CDN, so previews and builds need a network connection; text is written as `String.raw` templates so backslashes survive. In sentences, `[[answer|a / b / c]]` prints a blank followed by its options and `{{a|b*|c}}` prints an AQA-style ring box with `*` on the answer: every gap shows its choices. Content examined only in GCSE Physics (8463), not Combined Science: Trilogy, carries `<span class="triple-tag">Triple only</span>` (the cooling cups practical). The workbook marks no Higher-tier content: both courses are taught at Higher. Every page after the cover prints 1.2× larger, as in Year 10; the toolkit prints at normal size so it fits on the last page.

To rebuild: serve the repository root (`python3 -m http.server 8000`), then run `sh build-pdfs.sh` in `workbook/`. Check that both PDFs have the same page count and that the toolkit is still one page.

## Deck

`index.html` in the deck folder holds the slides and revision notes; `figures.js` draws the figures (reusing the workbook's `figures.js`) and six interactive models: a half-pipe and a pendulum with live energy bars, a kinetic-energy explorer, a spring lab that plots both graphs, an elastic-energy explorer and two motors lifting the same load. The Eco House uses a labelled cutaway illustration in `images/eco-house-illustration.png`, including print and reduced motion; its generation prompt is recorded in `images/eco-house-illustration.md`. News slides use Wikimedia Commons photographs in `images/`, credited under each photo.

The teaching deck uses the shared calm GCSE style with a light-orange Year 9 accent and the GCSE section theme preference. See [`../../decks/README.md`](../../decks/README.md) for shared styling and controls.
