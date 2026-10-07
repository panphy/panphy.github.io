# Atoms and Nuclear Radiation — Year 11 workbook

Ten 50-minute lessons for AQA GCSE Physics 4.4.1–4.4.2 and Combined Science: Trilogy 6.4.1–6.4.2. They follow the teaching deck, [`../../decks/atoms-and-radiation/`](../../decks/atoms-and-radiation/), and reuse its fonts, colours and particle diagrams.

**Address:** <https://panphy.app/gcsephy/year11phy/unit01/>

## Files

| File | Use |
|---|---|
| `index.html` | Student page linking the eleven booklets and answer editions |
| `pdf/` | One booklet per lesson (10–12 pages), a 16-page Unit review (42 marks, extension pages, key words, tracker) and an answer edition of each with the same page numbers |
| `workbook.html` | PDF source: `?lesson=1`…`10` or `?review`, add `&answers`; with neither it previews the whole unit |
| `assets/content/helpers.js` | Nuclide notation, nuclear equations, diagrams from the deck's drawing parts |
| `assets/content/lessons-1-5.js`, `lessons-6-10.js`, `reference.js` | The lessons; toolkit, review, extension pages and glossary (builds `window.UNIT`) |
| `assets/workbook.js`, `assets/workbook.css` | Renderer (adapted from Year 10) and print styles |
| `assets/figures-print.css` | Deck figure styles for print; keep in step with `../../decks/atoms-and-radiation/deck.css` |
| `build-pdfs.sh` | Rebuilds the PDFs with headless Chrome; name booklets (`3 7 review`) to rebuild only those |

Diagrams come from `/gcsephy/decks/atoms-and-radiation/figures.js` (`window.DeckFigures`); rebuild the PDFs after changing a deck figure the workbook uses. As in Year 10, every page after the cover prints 1.2× larger (12 pt text, ~9.6 mm writing lines), and grid columns use `minmax(0, 1fr)` because Chrome shrinks the whole print if anything overflows.

## Sequence

| # | Lesson | Deck slides | Spec (Physics · Combined) |
|---:|---|---|---|
| 1 | Inside the atom | 3–6 | 4.4.1.1–2 · 6.4.1.1–2 |
| 2 | Isotopes and ions | 7–8 | 4.4.1.2 · 6.4.1.2 |
| 3 | From plum pudding to the nucleus | 9–15 | 4.4.1.3 · 6.4.1.3 |
| 4 | Energy levels and the nucleus | 16–21 | 4.4.1.1–3 · 6.4.1.1–3 |
| 5 | Radioactive decay (Nuclear Decay sim) | 22–26 | 4.4.2.1 · 6.4.2.1 |
| 6 | Nuclear equations | 24–27 | 4.4.2.2 · 6.4.2.2 |
| 7 | Properties and uses of radiation | 28–30 | 4.4.2.1 · 6.4.2.1 |
| 8 | Half-life and random decay (half-life lab) | 31–33 | 4.4.2.3 · 6.4.2.3 |
| 9 | Half-life calculations (HT: net decline) | 32 | 4.4.2.3 · 6.4.2.3 |
| 10 | Contamination and irradiation | 34–36 | 4.4.2.4 · 6.4.2.4 |

The Unit review follows Lesson 10 and adds two GCSE Physics-only extension pages the deck omits: background radiation, half-life hazards and medical uses (4.4.3), and fission and fusion (4.4.4).

## Rebuild

Serve the repository root (`python3 -m http.server 8000`), then run `sh build-pdfs.sh` here. It writes all 22 PDFs to `pdf/` one at a time, retrying any that print blank, lack the deck's display font or carry the wrong title. Check that each booklet and its answer edition have the same page count.

## Hosting

Like the rest of `gcsephy/`: `noindex`, loads `/gcsephy/sw-register.js`, network-only, listed in `gcsephy/index.html`.
