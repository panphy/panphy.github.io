# PanPhy follow-ups (Mac)

From the licence work on 16 Oct 2026 (PRs #1116 and #1117, both merged).

## 1. Delete two leftover branches on GitHub (done: both were already gone on 17 Oct 2026)

- [x] `claude/all-rights-reserved`
- [x] `claude/hub-copyright`

GitHub → panphy.github.io → Branches → bin icon (or "Delete branch" on each PR page).

## 2. Rebuild the PDFs so they show the copyright line (done 17 Oct 2026)

`gcsephy/year10phy/unit01/Y10 Electricity Virtual Labs Teacher Guide.pdf` has no source in the repository, so it was not rebuilt and still lacks the line.

Each PDF's page footer should end with "© 2026 PanPhy Labs. All rights reserved."

Setup, in Terminal:

```sh
cd ~/path/to/panphy.github.io
git checkout main && git pull
python3 -m http.server 8000    # leave this running; use a second tab for the rest
```

Needs Chrome, Node, Ghostscript (`brew install ghostscript`) and an internet connection (for MathJax).

Run each from the repository root:

- [x] Prep sheets, all units
  `sh gcsephy/assets/prep/build-pdfs.sh gcsephy/year9phy/unit01 gcsephy/year9phy/unit02 gcsephy/year10phy/unit01 gcsephy/year11phy/unit01`
- [x] Year 9 Unit 1 workbook, answers and review
  `(cd gcsephy/year9phy/unit01/workbook && sh build-pdf.sh && sh build-answers-pdf.sh && sh build-review-pdf.sh)`
- [x] Year 9 Unit 1 teaching guides
  `(cd gcsephy/year9phy/unit01/teaching-guides && sh build-pdf.sh)`
- [x] Year 9 Unit 2 workbooks
  `(cd gcsephy/year9phy/unit02/workbook && sh build-pdfs.sh)`
- [x] Year 9 Unit 2 teaching guides
  `(cd gcsephy/year9phy/unit02/teaching-guides && sh build-pdf.sh)`
- [x] Year 10 workbooks, virtual labs and teacher guide
  `(cd gcsephy/year10phy/unit01/workbook && sh build-pdfs.sh)`
- [x] Year 11 workbooks
  `(cd gcsephy/year11phy/unit01 && sh build-pdfs.sh)`
- [x] Do Now revision and practical sheets
  `(cd gcsephy/do-now/revision && sh build-pdfs.sh)`

Then:

- [x] Open a few PDFs and check the footer line, and that nothing has moved onto an extra page.
- [x] Look for any `FAILED:` lines in the output; re-run just those.
- [x] Commit on a branch, open a PR, merge when the check passes:
  `git checkout -b claude/rebuild-pdfs && git add gcsephy && git commit -m "Rebuild PDFs with copyright footer" && git push -u origin claude/rebuild-pdfs`
