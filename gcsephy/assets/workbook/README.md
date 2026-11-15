# GCSE unit workbooks: shared renderer

Every unit workbook (`gcsephy/yearNphy/unitNN/workbook.html`) is printed by the same three files:

| File | Use |
|---|---|
| `workbook.js` | Builds the booklet from the unit's content (`window.UNIT`) and settings (`window.WORKBOOK`, in the unit's `assets/book.js`) |
| `workbook.css` | A4 print styles: calm pastel accents, thin soft outlines, rounded cards; covers in a pale tint of the year colour (Year 9 orange, 10 green, 11 yellow) |
| `cover-art.js` | The cover drawing for each topic (`window.CoverArt.graph`, `energy`, `circuit`, `particles`, `atom`) |

A unit's `workbook.html` loads its figure styles and scripts, its content, `cover-art.js`, its `book.js`, then `workbook.js`. Unit figure styles stay in the unit (`figures.css`, `diagrams-print.css`, `figures-print.css`). Links carry `?v=`: bump it when a page needs a matching change to these files, because Cloudflare can serve stale copies for hours.

## Booklets

- `?part=N`: a part booklet (`parts` in `book.js`): cover with its contents, the lessons, the toolkit so far, key words and quick answers.
- `?review`: the Unit review: cover, mixed exam practice and a fix-it log, any Triple Science only pages, the toolkit, all the key words and the progress tracker.
- `?lesson=N`: one lesson, as a booklet (Particle Model prints its required practicals this way).
- No query: the whole unit, for previewing. Add `&answers` for the answer edition, which has the same page numbers: answers print only in it, in space the student edition keeps blank.

Each lesson runs opener, Do now, Learn it, Try it, Practical, Quick check, Exam corner, Revise it (`order` or `flow` in a lesson changes the order, and `newPage: ["learn"]` starts the listed parts on a new page; any block with `newPage: true` starts a new page); questions are numbered in print order. Section headings carry no notes or labels: a lab's `safety` text prints as a Stay safe box under its heading.

## Content

Block types (`t`): `p`, `html`, `sub`, `key`, `warn`, `tip`, `say`, `model`, `rule`, `eq`, `split`, `fig`, `figs`, `compare`, `worked`, `follow`, `steps`, `list`, `safety`, `vars`, `checks`, `graph`, `table`, `q`, `part`, `lab`, `home`; a unit adds its own with the `block` hook. An unknown type stops the page with an error rather than printing nothing. Question fields and graph options are listed in `workbook.js`. In sentences, `[[answer|a / b / c]]` prints a blank with its options and `{{a|b*|c}}` an AQA-style ring box.

## Unit settings (`assets/book.js`)

`file` (PDF name stem), `name`, `year`, `coverTitle`, `coverArt`, `lede`, `parts`, optional `booklets`, `deck`, `quote`, `firstDoNow`, `triangles`, `extension`, and hooks `toolkit`, `side`, `reviewStart`, `trackerFoot`, `block`, `question` and `beforeRender`. `W.equationToolkit()` prints the standard equation toolkit with formula triangles.
