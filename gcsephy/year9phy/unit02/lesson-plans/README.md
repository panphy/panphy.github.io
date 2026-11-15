# Year 9 Energy lesson plans

The nine lesson plans for *Energy: Stores and Transfers* as printable A4 PDFs, plus their source.

| File | Use |
|---|---|
| `pdf/Y09 - Unit 02 - Energy - Lesson Plan 01.pdf` to `… - Lesson Plan 09.pdf` | The plans to read before teaching |
| `source/*.md` | Editable text, one file per lesson |
| `plan.html` | Browser preview: `plan.html?lesson=3` (1 to 9) |
| `assets/plan.css`, `assets/plan.js` | Print styles and the small Markdown renderer (copied from Unit 1) |
| `build-pdfs.sh` | Prints all nine PDFs into `pdf/` with headless Chrome, then shrinks each with Ghostscript (`gcsephy/assets/compress-pdfs.sh`) |

To edit: serve the repository root (`python3 -m http.server 8000`), edit `source/`, preview at <http://localhost:8000/gcsephy/year9phy/unit02/lesson-plans/plan.html?lesson=1>, then run `sh build-pdfs.sh` here (needs Chrome).

The renderer supports `#`–`###` headings, paragraphs, `-` and `1.` lists, `>` quote boxes (two trailing spaces for a line break) and `|` tables with `:---:` / `---:` alignment. Equations are plain text with Unicode (Eₖ, v², ÷); there is no MathJax.
