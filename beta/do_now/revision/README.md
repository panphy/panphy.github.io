# Revision sheets

Printable PDFs for students to revise from, and the page that lists them. `index.html` groups them by unit under folding headings (every unit starts folded) and links each PDF.

- **AO1 revision sheets:** every Do Now question with its answer, one PDF per topic.
- **Required practical method sheets:** one A4 page per practical in `../methods.csv`, with a diagram for every step, so a sheet can also be used as the lab procedure.

| File | Use |
|---|---|
| `index.html`, `assets/revision.js` | The student page. It reads `../questions.csv` and `../methods.csv`, so its lists are always current |
| `pdf/` | `AO1 revision - <topic>.pdf` and `Required practical - <practical>.pdf` |
| `sheet.html`, `assets/sheet.js` | Question sheet source: `sheet.html?topic=<topic name>` |
| `practical.html`, `assets/practical.js` | Method sheet source: `practical.html?practical=<number, e.g. M3>` |
| `assets/sheet.css` | Styles for both sheets |
| `assets/shared.js` | CSV parser, topic and practical lists and PDF file names, shared by the pages, the sheets and the build |
| `practicals/` | One SVG per practical step, named `<number>-<step>.svg` (`M3-2.svg` is step 2 of practical M3) |
| `build-pdfs.sh` | Rebuilds the PDFs with headless Chrome |

Each question sheet has the questions on the left, the answers on the right and a tick box per question; diagrams come from `../images/`.

## Practical diagrams

The `practicals/` diagrams are plain SVG files, one per step, matched to a step by its position in the `Steps` cell of `../methods.csv`. If a practical's steps are edited, added or reordered, redraw the diagrams to match and rebuild its PDF. Keep the style of the existing diagrams (400 × 270 canvas, circuit symbols as in `../images/symbols-*.svg`, red for annotations, blue for what is new in a step). Label any apparatus a student may not recognise, and tag a diagram "view from above" where it could be read as a side view.

## Rebuild

The PDFs do not update by themselves. After editing `../questions.csv` or `../methods.csv`, serve the repository root (`python3 -m http.server 8000`) and run `sh build-pdfs.sh` here (needs Node and Chrome). It rebuilds every sheet one at a time; to rebuild a few, give words from their names or a practical's number: `sh build-pdfs.sh density "half-lives" m3`. A full rebuild clears `pdf/` first, so sheets of renamed topics and practicals do not linger. Look over each rebuilt method sheet: a diagram that fails to load prints as "Diagram for step … is missing". This happens with the single-threaded server above; a threaded server avoids it: serve the root with one on another port and set `BASE`, e.g. `BASE=http://localhost:8137/beta/do_now/revision sh build-pdfs.sh m9`.

A PDF's name comes from its topic or practical name (`fileName` and `practicalFileName` in `assets/shared.js`), so renaming one renames its PDF.
