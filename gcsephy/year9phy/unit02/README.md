# Energy: Stores and Transfers

**Year 9 Physics, AQA GCSE energy, nine lessons**

A student workbook in three parts and a Unit review (each with an answer edition), a teaching deck and nine lesson plans. There is no companion website; [`index.html`](index.html) is a short page linking the workbook, the Unit review, their answers, the deck and the five Preps. The lesson plans are not linked there.

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
| 9 | Efficiency | 5 | Bounce efficiency from input and rebound energies |

The second lesson of week 5 is for revision and catch-up; the end-of-unit test is planned for week 6.

The student hub uses `/gcsephy/assets/workbook-hub.css`, shared by all six workbook hubs: navy headers, bold headings and square cards, with the landing page’s stronger year accent (orange for Year 9, green for Year 10, yellow for Year 11). This stylesheet does not affect the printed workbooks.

## Files

| Path | What it is |
|---|---|
| `index.html` | Student hub, linked from the GCSE landing page and the deck |
| `pdf/Y09 - Unit 02 - Energy (Part 1).pdf`, `(Part 2)`, `(Part 3)` | The A4 student workbook in three booklets: Lessons 1–3, 4–6 and 7–9, one set per student. Each part has a cover listing its lessons, the lessons, the equation toolkit with formula triangles for every equation so far, key words and quick answers |
| `pdf/… (Ans).pdf` | Each part with answers filled in, so page numbers match |
| `pdf/… (Unit Review).pdf`, `… (Unit Review) (Ans).pdf` | Unit review after Lesson 9: 40 marks of mixed AQA-style questions, the equation toolkit and all the key words; the answer edition has the same pages |
| `pdf/… (Revision Exercises).pdf`, `… (Revision Exercises) (2-up).pdf` | Revision exercises on every topic in the deck: 45 marks, about 45 minutes, name fields and equations on page 1, the mark scheme on the last page; the 2-up copy puts two pages on each landscape A4 sheet. Not linked from the hub |
| `workbook.html`, `assets/`, `build-pdfs.sh` | Workbook source; see below |
| `lesson-plans/` | Nine lesson plans (`pdf/… - Lesson Plan 01.pdf` to `09`) and their Markdown source; see its README |
| `prep/` | One-page Prep (homework) sheets, one per week (Prep 5 follows Lesson 9), each out of 10, with answer editions: `content.js` (questions), `prep.html` (preview, `?n=2&answers`) and `pdf/`. The hub links the sheets, not the answer editions. See [`../../assets/prep/README.md`](../../assets/prep/README.md). Maths is LaTeX for MathJax, as in the workbook |
| [`../../decks/energy-stores-and-transfers/`](../../decks/energy-stores-and-transfers/) | 78-slide teaching deck |

## Workbook source

| File | Use |
|---|---|
| `workbook.html` | Print preview; `?part=1` (2, 3) for one part as printed (with no part, the whole booklet), `&answers` for the answer edition, `?review` for the Unit review, `?revision` for the Revision exercises. The parts are `parts` in `assets/book.js` and `PARTS` in `build-pdfs.sh` |
| `assets/lessons-a.js`, `lessons-b.js`, `lessons-c.js` | Lessons 1–2, 3–5 and 6–9: all the words and questions |
| `assets/content.js` | Joins the lessons and holds the equation toolkit and key words |
| `assets/review.js` | The Unit review questions (`window.UNIT.review`), in the Exam corner format; `t: "part"` gives an unnumbered part |
| `assets/revision.js` | The Revision exercises (`UNIT.revision`, `workbook.html?revision`): new questions and numbers, each part with its mark scheme entry (`ms`) |
| `assets/book.js` | Settings for the shared renderer ([`../../assets/workbook/README.md`](../../assets/workbook/README.md)): file names, parts, cover and the equation toolkit's example and unit conversions |
| `assets/figures.js`, `figures.css` | Line drawings, shared with the deck |
| `build-pdfs.sh` | Rebuilds the three workbook parts, the Unit review and their answer editions into `pdf/` with headless Chrome (`ONLY_PART=2` for one part, `ONLY_REVIEW=1` for the review only), and the Revision exercises with their 2-up copy (`ONLY_REVISION=1` for those only; the 2-up copy needs `pdfjam`), then shrinks each with Ghostscript (`gcsephy/assets/compress-pdfs.sh`) |

Maths is LaTeX between `\(` and `\)`, typeset by MathJax from a CDN, so previews and builds need a network connection; text is written as `String.raw` templates so backslashes survive. In sentences, `[[answer|a / b / c]]` prints a blank followed by its options and `{{a|b*|c}}` prints an AQA-style ring box with `*` on the answer: every gap shows its choices. Every worked example on a deck slide is a `follow` block at the same point in Learn it (`slide` gives its number): the same question, printed blank with the slide's step labels for students to fill in as the teacher models it, beside a “Your turn” with numbers that appear on no slide. Each lesson's Quick check slide is its `quick` field, a box before the Exam corner, numbered on its own so lesson question numbers do not move. Answers to both are in the answer editions only. When a slide example or Quick check changes, change its workbook copy, and keep practice questions from repeating their numbers. Content examined only in GCSE Physics (8463), not Combined Science: Trilogy, carries `<span class="triple-tag">Triple only</span>` (the cooling cups practical). The workbook marks no Higher-tier content: both courses are taught at Higher. Every page after the cover prints 1.2× larger; the toolkit prints at normal size so it fits on one page.

To rebuild: serve the repository root (`python3 -m http.server 8000`), then run `sh build-pdfs.sh` here. Check that each part and its answer edition have the same page count and that the toolkit is still one page. Practical and Exam corner cards print whole (`break-inside: avoid`), moving to the next page rather than splitting; keep each card shorter than a page, splitting a long practical into two cards as in Lesson 4.

## Deck

`index.html` in the deck folder holds the slides and revision notes; `figures.js` draws the figures (reusing the workbook's `figures.js`) and interactive models: a half-pipe and a pendulum with live energy bars, a kinetic-energy explorer, a spring lab that plots both graphs, an elastic-energy explorer, two motors lifting the same load, a ball-drop efficiency practical and a conduction experiment. The bounce practical calculates the initial and rebound gravitational potential energies separately before dividing useful output by input. The Eco House uses a labelled cutaway illustration in `images/eco-house-illustration.webp`, including print and reduced motion; its generation prompt is recorded in `images/eco-house-illustration.md`. News slides (“In the news” and “From the archive”, an ask-and-discuss case in most lessons) and the photo banners on the Lesson 1, 2, 5 and 9 dividers use Wikimedia Commons photographs and drawings in `images/`, credited under each picture. Story facts were checked against: gov.wales and ITV Wales (20&nbsp;mph default from 17 September 2023); MacTutor and Wikipedia (Hooke’s anagram printed in 1676); the ChemTeam transcription of Joule’s 1845 paper “On the Mechanical Equivalent of Heat”; Live Science (horsepower, about 746&nbsp;W, and the watt named in 1882); Wikipedia and Grace’s Guide (Sankey’s 1898 diagram in the Minutes of Proceedings of the Institution of Civil Engineers, vol. 134).

The teaching deck uses the shared calm GCSE style with a light-orange Year 9 accent and the GCSE section theme preference. See [`../../decks/README.md`](../../decks/README.md) for shared styling and controls.
