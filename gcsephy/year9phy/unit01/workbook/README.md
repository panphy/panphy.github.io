# Work Like a Physicist — Year 9 student workbook (source)

Editable source for `../Work Like a Physicist - Year 9 Student Workbook.pdf`, the 40-page A4 booklet. It was rebuilt from the published PDF after the original source was lost, with wording, fonts, colours and page breaks matched to it.

## Files

| File | Use |
|---|---|
| `assets/content.js` | All the words: one entry per printed page. Edit here |
| `assets/workbook.css`, `assets/workbook.js` | Print styles; renderer that builds A4 pages and flags overflow |
| `workbook.html` | Preview of all 40 pages |
| `build-pdf.sh` | Prints the PDF with headless Chrome and checks the page count |
| `../../../assets/fonts/year9-workbook-fonts.css` | Poppins, Lato and Lora (OFL) |

## Editing

1. Serve the repository root (`python3 -m http.server 8000`) and open <http://localhost:8000/gcsephy/year9phy/unit01/workbook/workbook.html>.
2. Edit `assets/content.js` and reload. An overflowing page gets a red outline (`document.documentElement.dataset.overflow` lists it); shorten text or reduce `lines`.
3. Run `sh build-pdf.sh` from this folder (needs Chrome and Ghostscript). It overwrites the PDF and warns if the page count is not 40.

The unit README, lesson plans and companion site cite workbook page numbers (e.g. "pages 4–38"); update them if pages are added or removed.

## `content.js` format

`WORKBOOK.pages` has one object per page, `{ run: [left, right], blocks: [...] }`; the cover is page 1. A lesson's first page also has `lead: { badge, title, subtitle }` and starts with `case` and `mission` blocks (the `opener(...)` helper builds them). In text, `[[]]` draws a blank to write on, `[[24]]` a blank 24 mm wide; `<i>` and `<b>` work.

| Block | Draws |
|---|---|
| `task`, `p`, `note`, `h3`, `h4`, `eq` | Numbered heading with tag; paragraph; small note; sub-headings; equation box |
| `q {l, html, lines}`, `lines {n}` | Lettered question with writing lines; writing lines |
| `table {head, rows, widths, align, cls, rh}` | Table; `''` is a blank cell; `cls` is `num`, `bf`, `tight` or `plain` |
| `kv`, `steps`, `checks`, `fields` | Label/answer rows; numbered method; tick-box lists (`twin` for two); labelled rules |
| `box`, `duo`, `key`, `split` | Tinted box (`kind:"orange"` for warnings); two boxes; navy rule box; two columns |
| `draw {h, foot}`, `starters`, `spacer`, `html` | Blank drawing box; sentence starters; gap; raw HTML |
| `checkpoint`, `home` | Dashed Checkpoint box; orange "Take it home" box |

Known differences from the original: lesson names on page 2 are bold (Google's Lato has no semi-bold), the graph-paper boxes are blank as in the original, and page 3's rule box is pinned at `top:705pt`.
