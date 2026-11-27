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
- `?review`: the Unit review: cover, mixed exam practice, any Triple Science only pages, the toolkit and all the key words.
- `?revision`: Revision exercises, when the unit sets `UNIT.revision` (fields in `workbook.js`); a unit with more sets lists them all in `UNIT.revisions`, and `?revision=2` prints the second, its title suffix and footer taken from the set's `file` and `title`: no cover; page 1 has name, class, teacher, date and score fields and the equations met so far, then the questions, with marks on each part; the mark scheme (each part's `ms`) prints in two columns on the last page. One PDF, with no answer edition.
- `?lesson=N`: one lesson, as a booklet (Particle Model prints its required practicals this way).
- No query: the whole unit, for previewing. Add `&answers` for the answer edition, which has the same page numbers: answers print only in it, in space the student edition keeps blank.

Each lesson runs opener, Do now, Learn it, Try it, Practical, Quick check, Exam corner, Revise it (`order` or `flow` in a lesson changes the order, and `newPage: ["learn"]` starts the listed parts on a new page; any block with `newPage: true` starts a new page); questions are numbered in print order. Section headings carry no notes or labels: a lab's `safety` text prints as a Stay safe box under its heading.

Page breaks: a heading (section, sub-heading or lab title) never ends a page; it stays with its first block, and a one-paragraph lead (`p`, `list` or `steps`) also keeps the block it introduces. Steps lists and question prompts never split. Where that still leaves an awkward break, use `newPage`.

Writing space: working and written answers get `lines`; a dotted `box` with `grid: true` is only for drawings (circuit diagrams, sketched graphs, Sankey diagrams).

## Content

Block types (`t`): `p`, `html`, `sub`, `key`, `warn`, `tip`, `model`, `rule`, `eq`, `split`, `fig`, `figs`, `compare`, `worked`, `follow`, `steps`, `list`, `safety`, `vars`, `checks` (`cols: 2` sets the items in two columns), `graph`, `table`, `q`, `part`, `lab`, `home`; a unit adds its own with the `block` hook. An unknown type stops the page with an error rather than printing nothing. Question fields and graph options are listed in `workbook.js`. In sentences, `[[answer|a / b / c]]` prints a blank with its options and `{{a|b*|c}}` an AQA-style ring box.

## Unit settings (`assets/book.js`)

`file` (PDF name stem), `name`, `year`, `coverTitle`, `coverArt`, `lede`, `parts`, optional `booklets`, `quote`, `firstDoNow`, `triangles`, `extension`, and hooks `toolkit`, `side` (the panel beside the goals; without it, a lesson's `story` prints there), `reviewStart`, `block`, `question` and `beforeRender`. `W.equationToolkit()` prints the standard equation toolkit with formula triangles.
