# Year 9 teaching guides

The seven lesson plans for *Work Like a Physicist*, as printable A4 PDFs, with the source they are built from.

| File | Use |
|---|---|
| `Lesson 1 - …pdf` to `Lessons 7-8 - …pdf` | The guides to read before teaching (lesson 7 and 8 share one plan) |
| `source/*.md` | **All the words.** One Markdown file per guide. Edit these to change a guide |
| `guide.html` | Renders one guide in the browser: `guide.html?lesson=3` (1 to 7) |
| `assets/guide.css`, `assets/guide.js` | Print styles (A4, Helvetica/Arial, navy headings, footer "Prepared by YPL" and page number) and the small Markdown renderer |
| `build-pdf.sh` | Prints all seven pages to PDF with headless Chrome |

## Editing

1. Serve the repository root: `python3 -m http.server 8000`.
2. Edit a file in `source/` and preview it at <http://localhost:8000/gcsephy/year9phy/unit01/teaching-guides/guide.html?lesson=1> (change the number for the other guides).
3. Rebuild the PDFs: run `sh build-pdf.sh` from this folder (needs Google Chrome). It overwrites the seven PDFs beside it.

The renderer supports the Markdown the guides use: `#`/`##`/`###` headings, paragraphs, `-` and `1.` lists, `>` quote boxes (end a line with two spaces for a line break) and `|` tables with `:---:` / `---:` alignment. Add support in `assets/guide.js` before using anything else.

## History

The guides were originally generated from these Markdown files with ReportLab, and that generator was not kept. They were rebuilt in HTML/CSS with the same look; the wording is unchanged.
