# Prep sheets (shared renderer)

Prep is the school's word for homework. Each GCSE unit has one A4 Prep sheet for every two lessons, out of 10 so it is quick to mark: up to three 1-mark questions from the [Do Now bank](../../do-now/questions.csv) on earlier learning (shown with their bank number, `DN 852`), then short questions on the key ideas of the two latest lessons. Each sheet has an answer edition with the same layout, and the unit's workbook hub links both.

| File | Use |
|---|---|
| `prep.js` | Builds the sheets from a unit's `prep/content.js` (`window.PREP`); the comment at the top lists the fields and the inline marks for blanks, ring boxes and tick boxes |
| `prep.css` | A4 print styles; the year accent (orange, green, yellow) follows the GCSE landing page |
| `graph.js` | `PrepGraph` graph paper (model lines and read-offs appear only in the answer edition) and `PrepTable` |
| `build-pdfs.sh` | Prints every sheet and answer edition of the named units to `<unit>/prep/pdf/` |

Each unit's `prep/` folder holds `content.js`, `prep.html` and `pdf/`. Preview at `<unit>/prep/prep.html` (`?n=2` for one sheet, `&answers` for its answers); a sheet whose content overflows the page gets a red outline, and the console warns when a sheet is not out of 10. Spare space at the foot of a page is shared out as taller writing lines.

To rebuild: serve the repository root (`python3 -m http.server 8000`), then from the root run `sh gcsephy/assets/prep/build-pdfs.sh gcsephy/year9phy/unit01` (any unit folders; `ONLY=2` for one sheet). The Year 9 Energy sheets typeset maths with MathJax from a CDN, so their build needs a network connection. Check each PDF is one page. If you rename a sheet or change its title or lessons, update the cards in the unit's hub too: the PDF names come from `file`, the prep number and `lessons`.
