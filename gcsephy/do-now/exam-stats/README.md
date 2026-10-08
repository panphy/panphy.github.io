# Exam statistics deck

A slide deck showing where the recall (AO1) marks were in AQA GCSE Physics (8463) and Combined Science: Trilogy (8464) Higher papers, from November 2020 onwards. It is linked from the Do Now top bar and uses the shared teaching-deck layout (`/gcsephy/decks/assets/`) in the Do Now colours.

Every slide is drawn from the CSV files below when the page loads, so updating the files updates the deck. Nothing of a paper's wording is stored.

| File | Purpose |
|---|---|
| `index.html`, `deck.css`, `deck.js` | The deck. `deck.js` builds the slides, then loads the shared deck script |
| `marks.csv` | One row per question part of every paper counted |
| `sections.csv` | Which unit and topic each specification section belongs to. A reference uses the longest `Section` it starts with |
| `facts.csv` | Facts asked in more than one series, with the series, separated by `;`. Written by hand |
| `practicals.csv` | Required practical numbers and names (1–10 in Physics, 14–21 in Trilogy) |
| `add-paper.py` | Adds one paper to `marks.csv` from its question paper and mark scheme PDFs |

## `marks.csv` columns

| Column | Notes |
|---|---|
| `Series` | `YYYY-06` or `YYYY-11` |
| `Paper` | `8463/1H`, `8463/2H`, `8464/P/1H` or `8464/P/2H` |
| `Part` | Question part, e.g. `03.2` |
| `Marks` | From the question paper |
| `Recall` | The AO1 marks. Where a part has several assessment objectives, its marks are shared equally between them. `0` for a write-down-the-equation part, because the equations sheet is provided |
| `Equation` | `1` for a write-down-the-equation part |
| `Levels` | `1` for an extended answer marked in levels |
| `Sections` | Specification references from the mark scheme, separated by `;`. Trilogy references (6.x) are renumbered to the Physics specification (4.x) |
| `Practicals` | Required practical numbers from the mark scheme, separated by `;` |

## Adding a year

AQA releases papers and mark schemes to the public about a year after the exam; teachers can get them earlier from Centre Services. Do not add the PDFs to the repository.

1. For each of the four Higher papers run, for example, `python3 add-paper.py 2026-06 8463/1H question-paper.pdf mark-scheme.pdf`. It needs macOS (it reads PDFs through `swift`) or `pdftotext`.
2. Act on each `CHECK` line it prints: the marks must add up to 100 (Physics) or 70 (Trilogy), and a part it could not read is typed into `marks.csv` by hand from the mark scheme.
3. Read the new recall questions and add the series to any fact in `facts.csv` that was asked again, or add a new row once a fact has been asked twice.
4. Open the deck and look through it. Then review the `Target` column of `../questions.csv` against the new figures, as described in [the Do Now README](../README.md#how-the-target-7-questions-were-chosen).
