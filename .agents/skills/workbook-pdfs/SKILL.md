---
name: workbook-pdfs
description: Rebuilding the printed PDFs (GCSE workbooks, unit reviews, revision exercises, prep sheets, lesson plans, DP worksheets) after their source changes. Use when a workbook, its shared figures or a deck example it copies changes, or when asked to rebuild or check PDFs in a pdf/ folder.
---

# Rebuilding printed PDFs

Printed resources are HTML pages printed to PDF with headless Chrome and kept in each unit's `pdf/` folder, such as `gcsephy/year9phy/unit02/pdf/`. Each unit's README says what is printed and how. DP worksheets (`ibdpphy/worksheets/`) have their own `build.mjs` and rules in that folder's README.

## When a rebuild is needed

- The workbook's own source changed (`workbook.html`, `assets/*.js`, `assets/*.css`).
- A shared figure it draws changed (for example `sankey()` in `gcsephy/year9phy/unit02/assets/figures.js`).
- A deck's worked example or Quick check changed: its `follow` or `quick` copy in the workbook must change too, then that part is rebuilt.

Work out which parts contain the change (a unit's `parts` in `assets/book.js` maps lessons to parts) and rebuild only those, with their answer editions.

## Build

- Build on a Mac. The PDFs embed Arial and Arial Black; a Linux container lacks them and would print substitute fonts, so do not rebuild there. Say which PDFs are stale instead.
- Serve the repository root: `python3 -m http.server 8000`. MathJax comes from a CDN, so the build needs a network connection.
- From the unit folder, run `sh build-pdfs.sh`. Some scripts can build less; read the script's header for its options. Year 9's take `ONLY_PART=2` (one part and its answer edition) and `ONLY_REVIEW=1`, and Year 9 Energy's also `ONLY_REVISION=1` (the revision exercises and their 2-up copy, which needs `pdfjam`). The others rebuild the whole unit. The scripts shrink each PDF with Ghostscript when it is installed.

## Check

- Each part and its answer edition have the same page count, and the equation toolkit is still one page.
- No practical or Exam corner card is split across pages.
- Compare page counts with the previous PDFs (`git show main:<path> | pdfinfo -`) and report any change.
- Open a page of each to confirm the fonts and MathJax.

Commit the rebuilt PDFs with the source change, or in their own PR if the source has already merged.
