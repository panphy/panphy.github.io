# Exam statistics deck

A slide deck showing where the recall (AO1) marks were in AQA GCSE Physics (8463) and Combined Science: Trilogy (8464) Higher papers, from November 2020 onwards. It is linked from the Do Now top bar and uses the shared teaching-deck layout (`/gcsephy/decks/assets/`) in the Do Now colours.

The deck shows one course at a time, each counted from its own papers: `?course=physics` (the default) or `?course=trilogy`. The switch is in the top bar, the last choice is remembered, and the Do Now link opens the Trilogy view when "Combined only" is selected there. The Trilogy view leaves out the Separate Physics topics. The repeated-facts slides use both courses' papers, because the shared content is the same; a ring marks a series in which only the other course's paper asked the fact.

Every slide is drawn from the CSV files below when the page loads, so updating the files updates the deck. Nothing of a paper's wording is stored.

| File | Purpose |
|---|---|
| `index.html`, `deck.css`, `deck.js` | The deck. `deck.js` builds the slides, then loads the shared deck script |
| `marks.csv` | One row per question part of every paper counted |
| `sections.csv` | Which unit and topic each specification section belongs to. A reference uses the longest `Section` it starts with |
| `corrections.csv` | Parts where the mark scheme's reference is not used as printed. `Sections` replaces the part's sections for the deck; `Status` `Discounted` marks a question AQA discounted (it is still counted as printed, and the deck says so); `Reason` says why. `marks.csv` keeps what the mark scheme prints |
| `facts.csv` | Facts asked as recall in more than one series: one row for each time, with the series, paper and part. Written by hand; the deck shows a fact once it has rows in two series |
| `practicals.csv` | Required practical numbers and names, with the qualification each number belongs to (1–10 in Physics 8463, 14–21 in Trilogy 8464) |
| `add-paper.py` | Adds one paper to `marks.csv` from its question paper and mark scheme PDFs |
| `audit-prompt.py` | Prints a prompt, with the current figures filled in, that asks another AI model to check the statistics independently |
| `audits/` | A short record of each audit: what was checked, what it found and what was done |

## `marks.csv` columns

| Column | Notes |
|---|---|
| `Series` | `YYYY-06` or `YYYY-11` |
| `Paper` | `8463/1H`, `8463/2H`, `8464/P/1H` or `8464/P/2H` |
| `Part` | Question part, e.g. `03.2` |
| `Marks` | From the question paper |
| `Recall` | The AO1 marks (knowledge and understanding, which includes describing a practical method). Mark schemes usually print one objective per mark, so this is the share of the part's printed labels that are AO1: a 5-mark part labelled AO2 four times and AO1 once has `1`. For an answer marked in levels this is an estimate. `0` for an equation part, because the full equations sheet is now provided (it was not in 2020 and 2021) |
| `Equation` | `1` for a part that asks the student to write down or choose an equation |
| `Levels` | `1` for an extended answer marked in levels |
| `Sections` | Specification references from the mark scheme, separated by `;`. Trilogy references (6.x) are renumbered to the Physics specification (4.x) |
| `Practicals` | Required practical numbers from the mark scheme, separated by `;` |

## Adding a year

AQA releases papers and mark schemes to the public about a year after the exam; teachers can get them earlier from Centre Services. Do not add the PDFs to the repository. Only Higher tier papers are counted. The November 2020 and 2021 papers are printed with June dates; they are recorded as `2020-11` and `2021-11`.

1. For each of the four Higher papers run, for example, `python3 add-paper.py 2026-06 8463/1H question-paper.pdf mark-scheme.pdf`. It needs macOS (it reads PDFs through `swift`) or `pdftotext`.
2. Act on each `CHECK` line it prints: the marks must add up to 100 (Physics) or 70 (Trilogy), and a part it could not read is typed into `marks.csv` by hand from the mark scheme.
3. Read the new recall questions. For each one that asks a fact already in `facts.csv`, add a row with its series, paper and part; start a new fact when one has been asked in two series. Every row must point at a part with recall marks.
4. If a mark scheme's reference is plainly wrong for the question, or the examiner report says a question was discounted, add a row to `corrections.csv` rather than changing `marks.csv`.
5. Open both views of the deck and look through them.
6. Commit and push, then have the figures audited independently (below). Then review the `Target` column of `../questions.csv` against the new figures, as described in [the Do Now README](../README.md#how-the-target-7-questions-were-chosen).

## Independent audit

The figures are counted by one AI model, so they are checked by a different one before being relied on. After a year's papers are added and pushed:

1. Run `python3 audit-prompt.py > prompt.txt` and paste the result into a model that can browse the web and run code (not the one that added the data). The prompt gives it the public CSV files, the papers and the claimed figures, and asks it to recompute everything, sample parts against the mark schemes, question references that do not fit the question, read the examiner reports and check every row of `facts.csv`.
2. Check that its report says which files and papers it actually read, and that its row counts match.
3. Test each finding against the data and the papers before acting on it: an auditor can be wrong too. Put source corrections in `corrections.csv`, not `marks.csv`.
4. Re-check the Target 7 bands if a topic's figures moved, and add a record to `audits/` like the existing one.
