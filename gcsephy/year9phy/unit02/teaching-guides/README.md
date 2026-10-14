# Year 9 Energy teaching guides

The nine lesson plans for *Energy: Stores and Transfers* as printable A4 PDFs, plus their source.

| File | Use |
|---|---|
| `Lesson 1 - …pdf` to `Lesson 9 - …pdf` | The guides to read before teaching |
| `source/*.md` | Editable text, one file per lesson |
| `guide.html` | Browser preview: `guide.html?lesson=3` (1 to 9) |
| `assets/guide.css`, `assets/guide.js` | Print styles and the small Markdown renderer (copied from Unit 1) |
| `build-pdf.sh` | Prints all nine PDFs with headless Chrome |

To edit: serve the repository root (`python3 -m http.server 8000`), edit `source/`, preview at <http://localhost:8000/gcsephy/year9phy/unit02/teaching-guides/guide.html?lesson=1>, then run `sh build-pdf.sh` here (needs Chrome).

The renderer supports `#`–`###` headings, paragraphs, `-` and `1.` lists, `>` quote boxes (two trailing spaces for a line break) and `|` tables with `:---:` / `---:` alignment. Equations are plain text with Unicode (Eₖ, v², ÷); there is no MathJax.
