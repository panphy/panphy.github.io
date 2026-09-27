# Atoms and Nuclear Radiation — Year 11 workbook

Ten 50-minute lessons for AQA GCSE Physics 4.4.1–4.4.2 and Combined Science: Trilogy 6.4.1–6.4.2, written for Year 11 students to work in during lessons and revise from afterwards. The lessons follow the teaching deck, [`../../decks/atoms-and-radiation/`](../../decks/atoms-and-radiation/), and the workbook looks like it: the deck's fonts, colours and particle diagrams.

**Address:** <https://panphy.app/gcsephy/year11phy/unit01/>

## Files

| File | Use |
|---|---|
| `index.html` | Student-facing page linking the eleven booklets and their answer editions |
| `pdf/… Lesson 01 - Inside the atom.pdf` … `Lesson 10 - Contamination and irradiation.pdf` | One booklet per lesson · 10–12 pages each |
| `pdf/… Unit review.pdf` | Mixed exam practice (42 marks), fix-it log, separate-Physics extension pages, all key words, progress tracker · 16 pages |
| `pdf/… (Answers).pdf` | Answer edition of each booklet, with the same page numbers |
| `workbook.html` | Source of the PDFs: `?lesson=1`…`10` or `?review`, add `&answers` for the answer edition; with neither it shows the whole unit (preview only) |
| `assets/content/helpers.js` | Nuclide notation, nuclear equations and diagrams built from the deck's drawing parts |
| `assets/content/lessons-1-5.js`, `lessons-6-10.js` | The lessons |
| `assets/content/reference.js` | Toolkit, unit review, extension pages and glossary; builds `window.UNIT` |
| `assets/workbook.js` | Renderer (adapted from the Year 10 Electric Circuits workbook) |
| `assets/workbook.css` | Print styles in the deck's look |
| `assets/figures-print.css` | The deck's figure styles for print; keep in step with `../../decks/atoms-and-radiation/deck.css` |
| `build-pdfs.sh` | Rebuilds all the PDFs with headless Chrome; name booklets (`3 7 review`) to rebuild only those |

Diagrams come from the deck itself: `workbook.html` loads `/gcsephy/decks/atoms-and-radiation/figures.js`, which exports its figures and drawing parts as `window.DeckFigures`. Rebuild the PDFs after changing a deck figure the workbook uses.

Each lesson booklet prints on its own: cover, how-to page with the route through the unit, the lesson, the toolkit so far, the lesson's key words and quick answers. As in the Year 10 workbook, every page after the cover is printed 1.2 times larger (12 pt body text, writing lines about 9.6 mm apart), and grid columns use `minmax(0, 1fr)` because Chrome shrinks the whole print if anything is wider than the page.

## Sequence

| # | Lesson | Deck slides | Spec (Physics · Combined) |
|---:|---|---|---|
| 1 | Inside the atom | 3–6 | 4.4.1.1–2 · 6.4.1.1–2 |
| 2 | Isotopes and ions | 7–8 | 4.4.1.2 · 6.4.1.2 |
| 3 | From plum pudding to the nucleus | 9–15 | 4.4.1.3 · 6.4.1.3 |
| 4 | Energy levels and the nucleus | 16–21 | 4.4.1.2–3 · 6.4.1.2–3 |
| 5 | Radioactive decay (virtual lab: Nuclear Decay sim) | 22–26 | 4.4.2.1 · 6.4.2.1 |
| 6 | Nuclear equations | 24–27 | 4.4.2.2 · 6.4.2.2 |
| 7 | Properties and uses of radiation | 28–30 | 4.4.2.1 · 6.4.2.1 |
| 8 | Half-life and random decay (virtual lab: half-life) | 31–33 | 4.4.2.3 · 6.4.2.3 |
| 9 | Half-life calculations (HT: net decline) | 32 | 4.4.2.3 · 6.4.2.3 |
| 10 | Contamination and irradiation | 34–36 | 4.4.2.4 · 6.4.2.4 |

After Lesson 10: Unit review. It also holds two extension pages for GCSE Physics (separate science) only, which the deck does not cover: background radiation, half-life hazards and medical uses (4.4.3), and fission and fusion (4.4.4).

Each lesson runs: opener (big question, goals, key words, deck slides and simulation) → Do now → Learn it (explanation, deck diagrams, a model with its limitation, worked example with a “Your turn”) → Try it (supported → on your own → challenge, with student claims to correct) → Lab where relevant → Exam corner (with a mark tip) → Revise it (summary, cover-and-answer questions, “I can” check).

## Rebuild

Serve the repository root (`python3 -m http.server 8000`), then run `sh build-pdfs.sh` in this folder. It writes all 22 PDFs to `pdf/`, one at a time. Headless Chrome sometimes prints before the page is ready, so the script checks each PDF and retries: it must be larger than a blank page, embed the deck's display font (not a Georgia fallback) and carry the right booklet in its title. Check that each booklet and its answer edition have the same page count.

## Hosting notes

Like the rest of `gcsephy/`, the pages are `noindex`, load `/gcsephy/sw-register.js`, and are network-only: nothing here is in the root service worker's cache. The workbook is listed in `gcsephy/index.html`.
