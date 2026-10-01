# Lesson 5 worksheet: best-fit lines (source)

A 2-page A4 practice sheet for Lesson 5, styled like the workbook, plus a 1-page teacher answer key. Page 1: best-fit straight line, best-fit curve, judging four lines. Page 2: an outlier to discuss, and a "directly proportional?" question where the best-fit line has a y-intercept.

| File | Use |
|---|---|
| `Lesson 5 - best-fit lines worksheet.pdf`, `… (Answers).pdf` | Printable sheets (2 pages, 1 page) |
| `worksheet.html`, `assets/content.js` | The worksheet: preview page and its words/graphs. Edit here |
| `answers.html`, `assets/answers.js` | Answer key, with model lines drawn on the same graphs |
| `assets/graphs.js` | Data sets and the SVG graph-paper helper shared by both |
| `assets/worksheet.css` | Graph and mini-graph styles; the rest comes from `../workbook/assets/` |
| `build-pdf.sh` | Prints both PDFs with headless Chrome |

To edit: serve the repository root (`python3 -m http.server 8000`), open <http://localhost:8000/gcsephy/year9phy/unit01/worksheet/worksheet.html>, edit, reload (a red outline marks an overflowing page), then run `sh build-pdf.sh` here (set `CHROME` if Chrome is not at the macOS default). Block types are described in `../workbook/README.md`. If a data set in `graphs.js` changes, recheck the numbers quoted in `answers.js`.
