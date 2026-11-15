# Year 9 teaching guides

The seven lesson plans for *Work Like a Physicist* as printable A4 PDFs (lessons 7 and 8 share one plan), plus their source.

| File | Use |
|---|---|
| `Lesson 1 - …pdf` to `Lessons 7-8 - …pdf` | The guides to read before teaching |
| `source/*.md` | Editable text, one file per guide |
| `guide.html` | Browser preview: `guide.html?lesson=3` (1 to 7) |
| `assets/guide.css`, `assets/guide.js` | Print styles and the small Markdown renderer |
| `build-pdf.sh` | Prints all seven PDFs with headless Chrome |

To edit: serve the repository root (`python3 -m http.server 8000`), edit `source/`, preview at <http://localhost:8000/gcsephy/year9phy/unit01/teaching-guides/guide.html?lesson=1>, then run `sh build-pdf.sh` here (needs Chrome).

The renderer supports `#`–`###` headings, paragraphs, `-` and `1.` lists, `>` quote boxes (two trailing spaces for a line break) and `|` tables with `:---:` / `---:` alignment. Add support in `assets/guide.js` before using anything else.
