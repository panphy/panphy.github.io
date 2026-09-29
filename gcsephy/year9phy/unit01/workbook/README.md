# Work Like a Physicist — Year 9 student workbook (source)

Editable source for `../Work Like a Physicist - Year 9 Student Workbook.pdf`, the 40-page A4 booklet students keep for all eight lessons. The original source was lost, so this was rebuilt from the published PDF: the wording is taken from it, and the fonts, colours, sizes and page breaks were matched to it (see "How closely it matches" below).

## Files

| File | Use |
|---|---|
| `assets/content.js` | **All the words.** One entry per printed page, in reading order. Edit here to change the workbook |
| `assets/workbook.css` | Print styles: A4 sheet, colours, type sizes, tables, boxes |
| `assets/workbook.js` | Renderer: turns `content.js` into A4 pages and flags any page that overflows |
| `workbook.html` | The page that loads the three files above. Open it in a browser to preview all 40 pages |
| `build-pdf.sh` | Prints `workbook.html` to the PDF with headless Chrome and checks the page count |
| `../../../assets/fonts/year9-workbook-fonts.css` | Poppins, Lato and Lora (SIL Open Font License, latin subset), stored beside the site's other fonts |

## Editing

1. Serve the repository root: `python3 -m http.server 8000`.
2. Open <http://localhost:8000/gcsephy/year9phy/unit01/workbook/workbook.html> and edit `assets/content.js`. Reload to see the change.
3. A page whose content is taller than the sheet gets a red outline (and `document.documentElement.dataset.overflow` lists it, with by how many mm). Shorten the text or reduce a `lines` count.
4. Rebuild the PDF: `sh build-pdf.sh` (run from this folder; needs Google Chrome, and Ghostscript for the page-count check). It writes over `../Work Like a Physicist - Year 9 Student Workbook.pdf` and warns if the page count is no longer 40.

The unit README, the lesson plans and the companion site refer to workbook page numbers (for example "pages 4–38" and "the graph quality checklist on page 3"). If you add or remove a page, update those too.

## How `content.js` is laid out

`WORKBOOK.pages` is an array with one object per page. A page is `{ run: [left, right], blocks: [...] }`; the first page of a lesson also has `lead: { badge, title, subtitle }` and starts with `case` and `mission` blocks (the `opener(...)` helper builds these). Page numbers are the array position, so the cover is 1.

In any text, `[[]]` draws a blank to write on and `[[24]]` a blank 24 mm wide. HTML such as `<i>` and `<b>` works. An arrow `→` is drawn with a font that has it.

| Block | What it draws |
|---|---|
| `task {n, title, tag}` | Numbered heading with a small tag on the right ("10 min", "Key idea") |
| `p`, `note`, `h3`, `h4`, `eq` | Paragraph (`cls:"it"` for italic, `mb` for the gap below in mm), small grey note, sub-headings, equation box |
| `q {l, html, lines}` | Lettered question (a, b, c) followed by `lines` writing lines |
| `lines {n}` | Just writing lines |
| `table {head, rows, widths, align, cls, rh}` | Table. `''` is a blank cell to write in. `cls`: `num` (numbers), `bf` (bold first column), `tight`, `plain`. `rh` is the row height in mm; `align` is per column (`r`, `c`) |
| `kv {rows, labelW, rh}` | Navy label column with blank answer cells |
| `steps {items}` | Numbered method table |
| `checks {head, items, ticks, tickW}` | Tick-box table; `twin` puts two lists side by side |
| `box {eyebrow, paras, kind}` | Blue tinted box, or `kind:"orange"` for the warning style; `list` for a numbered list |
| `duo {left, right}` | Two boxes side by side |
| `key {label, big, small}` | The outlined rule box (navy border) |
| `split {left, right, cols}` | Two columns of blocks |
| `draw {h, foot}` | Blank box to draw in, `h` mm high, with an optional footer line |
| `starters {items}` | Sentence starters with a grey bar; an item can add `lines` |
| `checkpoint {title, items}` and `home {title, paras, qs}` | The dashed "Checkpoint" box and the orange "Take it home" box |
| `fields {labels}`, `spacer {mm}`, `html {html}` | Labelled rules, a gap, or raw HTML |

## How closely it matches

Built from the PDF's own text and font metadata: Lato 9.5 pt body, Poppins headings, the navy/orange/blue palette, margins and heading sizes are the originals. Line breaks, table widths and row heights were tuned page by page against the PDF and are within a few points. Known differences:

- The original used Lato semi-bold in one place (the lesson names on page 2); Google's Lato has no semi-bold, so it is bold here.
- The "graph paper" boxes are blank white boxes, as in the original PDF. If you want printed grid lines, add a background to `.draw` in `workbook.css`.
- Page 3's rule box is pinned to the foot of the page (`top:705pt`), as in the original.
