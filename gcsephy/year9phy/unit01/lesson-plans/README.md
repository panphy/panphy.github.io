# Year 9 lesson plans

The seven lesson plans for *Work Like a Physicist* as printable A4 PDFs (lessons 7 and 8 share one plan), plus their source.

| File | Use |
|---|---|
| `pdf/Y09 - Unit 01 - Work Like a Physicist - Lesson Plan 01.pdf` to `… - Lesson Plan 07-08.pdf` | The plans to read before teaching |
| `source/*.md` | Editable text, one file per plan |
| `plan.html` | Browser preview: `plan.html?lesson=3` (1 to 7) |
| `assets/plan.css`, `assets/plan.js` | Print styles and the small Markdown renderer |
| `build-pdfs.sh` | Prints all seven PDFs into `pdf/` with headless Chrome, then shrinks each with Ghostscript (`gcsephy/assets/compress-pdfs.sh`) |

To edit: serve the repository root (`python3 -m http.server 8000`), edit `source/`, preview at <http://localhost:8000/gcsephy/year9phy/unit01/lesson-plans/plan.html?lesson=1>, then run `sh build-pdfs.sh` here (needs Chrome).

The renderer supports `#`–`###` headings, paragraphs, `-` and `1.` lists, `>` quote boxes (two trailing spaces for a line break) and `|` tables with `:---:` / `---:` alignment. Add support in `assets/plan.js` before using anything else.
