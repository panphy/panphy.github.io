# DP Physics worksheets

Printed classwork and revision worksheets in the IB style, each built from one file in `sheets/` into `pdf/`. Every PDF puts the answers on its last page, and each has a 2-up copy beside it (two A4 pages per landscape A4 sheet).

| Path | Use |
|---|---|
| `sheets/<name>.js` | One worksheet: its questions, answer space and markscheme points together |
| `pdf/` | Built PDFs, `<file>.pdf` and `<file> (2-up).pdf` |
| `worksheet.html` | Build source and preview: `worksheet.html?sheet=<name>`, opened straight from the folder (marked `noindex`) |
| `assets/` | Renderer (`worksheet.js`), A4 styles (`worksheet.css`) and figures (`figures.js`, a copy of the local topic tests' figures) |
| `build.mjs` | Prints the worksheet and its 2-up copy; needs Node and Chrome, and `pdfjam` (TeX Live) for the 2-up. It shrinks both with Ghostscript when installed |

## Rules

- **Scope.** A worksheet covers a stated range of one deck's slides and nothing beyond it. Name the deck and slides in the comment at the top of the sheet file. Leave out HL-only slides unless the class is HL.
- **Length.** Allow about 1.2–1.5 minutes per mark: a 30-minute sheet is about 20–25 marks. Set `minutes`.
- **IB style.** Section A is multiple choice in the Paper 1A style: four options, 1 mark each. Section B is structured questions in the Paper 1B and Paper 2 style. Use IB command terms (state, outline, calculate, determine, show that, explain) and give each part its marks.
- **Fresh questions.** Don't reuse the deck's worked examples or Quick checks. Use new contexts and numbers, check every answer with a short script, and mark error carried forward in later parts.
- **House rules for ibdpphy.**
  - American English.
  - *g* = 9.8 m s⁻².
  - Write division as a fraction (`\frac{a}{b}`), never ÷; the repository checker enforces this.
  - The settled forms: *v*² − *u*² = 2*as*, Δ*U* = *Q* − *W*, terminal velocity.
  - Working in the answers starts from the data booklet equation and leaves the arithmetic until last.
- **Answers.** Mark each marking point with (1). Keep the points short: the answers must fit on one page.
- **Pages.** Pages break only where the sheet file says `'break'`. The questions take an even number of pages, so the answers start a 2-up sheet of their own. The build stops on an overflowing page, an odd number of question pages or answers longer than a page; `ALLOW_OVERFLOW=1 node build.mjs <name>` prints anyway to inspect.
- **Footer.** Every page carries the running footer `<footer>, © PanPhy Labs. All rights reserved.` and the page number, as the GCSE workbooks do.

## Naming

- PDFs: `Y<year> - <topic> - <Title in Title Case>`, the sheet's `file`, such as `Y12 - A.2 - Momentum and Collisions`. Add ` (Part 2)` when a topic has more than one sheet.
- Sheet files: the same in lowercase with hyphens, such as `y12-a2-momentum-and-collisions.js`.

## Making a worksheet

1. Copy a file in `sheets/` to the new name and edit it.
2. Open `worksheet.html?sheet=<name>` in Chrome to check the pages.
3. From this folder, run `node build.mjs <name>`. Run it with no name to rebuild every sheet. Build on a Mac, because the PDFs embed Arial.
4. Look at every page of the PDF, then commit the sheet file and both PDFs.

## The sheet file

It calls `Worksheet({ ... })`. Top level:

| Field | Use |
|---|---|
| `header` | Running head, such as `Year 12 / DP Physics` |
| `kind` | Right of the running head, default "Worksheet" (such as "Classwork" or "Revision") |
| `title` | Shown on the first page |
| `file` | PDF name, without `.pdf` |
| `footer` | Footer text before the copyright, such as `Momentum and Collisions, Year 12: Classwork` |
| `endLabel` | Default "End of worksheet" |
| `minutes` | Optional |
| `instructions` | Paragraphs |
| `schemeNotes` | Optional; replaces the standard marking note |
| `sections` | See below |

A section has `title`, `items` and optionally `newPage`. `items` holds questions and `'break'`.

- **Multiple choice:** `{ text, options: [...], answer: 'B', scheme }`, worth 1 mark.
  - `columns: 2` sets short options in two columns.
  - `optionHead: [...]` takes the options as rows of a table.
- **Structured:** `{ text, body: [...] }`. `schemeBreak: true` on a question starts a new answer page with it. `body` holds, in order:
  - `{ part, marks, lines: 4, scheme: [points], schemeFigure }`: a part with answer lines. Use `box: { height: 120, dot: true }` (mm) instead of `lines` for a drawing space.
  - `{ p }`: a paragraph between parts.
  - A figure such as `{ figure: 'graph', ... }`, or `{ svg: '<svg …>' }`.
  - `{ eq }`: a centered line.
  - `{ table: { head, rows } }`.
  - `'break'`.

Text shorthand:
- `\frac{a}{b}` (write `\\frac` inside a JavaScript string)
- `*italic*` and `**bold**`
- `^{-1}` superscript (hyphens become minus signs) and `_{b}` subscript
- `~` non-breaking space (`2.7~m~s^{-1}`)
- `{{226|88|Ra}}` nuclides

Other HTML passes through, so write `&lt;` for `<`.

## Figures (`assets/figures.js`, drawn in mm)

| Figure | Fields |
|---|---|
| `graph` | `x`, `y`: `{ min, max, major, minor, label, decimals }`; `points`: `[x, y, Δy, Δx]`; `line`: two points; `path`: a polyline through `[x, y]` points; `size`: `[w, h]` |
| `horizontalLaunch` | `height`, `range` (optional), `speed` (optional, by the arrow), `angle` (optional, launches upward from the edge), `label`, `note` (`false` hides "Diagram not to scale") |
| `angledLaunch` | `angle`, `speed` (label by the arrow), `label`, `note`; launched from level ground |
| `incline` | `angle`, `label`, `blockAt` (0–1 along the slope), `motion: false` hides the arrow |
| `fbd` | `forces`: `{ dir` (degrees anticlockwise from right), `len` (mm), `label }` |
| `energyLevels` | `levels`: `[left label, value, right label]`; `arrows`: `[from, to]`; `height`; `even: true` spaces levels evenly; `note: true` adds "Diagram not to scale" |

Add new figure types to `figures.js` and list them here.
