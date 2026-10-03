# Do Now starters

Lesson starters for AQA GCSE Physics (Higher). The teacher picks topics, then either sets a number of questions to be drawn at random (spread across the chosen topics) or ticks the exact questions to show ("Pick my own"). The board shows them large enough to read from the back of the room. Each question has its own answer button, and there is a Show ALL answers button.

## Files

| Path | Purpose |
|---|---|
| `index.html`, `do_now.css`, `do_now.js` | The page. No build step. |
| `questions.csv` | The question bank. The page reads it on every load, so editing this file is all that is needed to change a question. |
| `images/*.svg` | Diagrams, named in the `Image` column. |
| `review-changes.csv` | Every change made to the original bank (old and new wording, with a reason). For review only; the page does not use it and it can be deleted. |

## Question bank columns

| Column | Notes |
|---|---|
| `Number` | Stable ID. 1–635 are the original numbers; 636 onwards are new. Gaps are removed questions. |
| `Unit` | AQA unit, used to group topics on the landing page (and to show Paper 1 or 2). |
| `Topic` | Topics that are entirely Separate Physics start with `(S) `. Row order sets the order on the page. |
| `Course` | `Combined` or `Separate`, following the "(physics only)" markers in the AQA 8463 specification (version 1.1). "Combined only" hides every `Separate` row, including the few inside otherwise Combined topics. |
| `Type` | `Recall` or `Extended`. `Extended` (long "outline a method" answers) is left out of random draws unless the teacher ticks the box; it is always listed in "Pick my own". |
| `Question`, `Answer` | Plain text. A line break inside the cell is shown as a line break. |
| `Image` | A file name in `images/`, or empty. Several questions can share one image. |

Save the CSV as UTF-8 (in Excel: "CSV UTF-8 (Comma delimited)"), or symbols such as Ω and Δθ will be garbled. Questions with the same wording and image are treated as one, so a repeated question (such as the unit of force) never appears twice on the board.

## Worksheet

"Worksheet PDF" builds an A4 sheet from the questions on the board: name, class and date lines, then a two-column table of questions and answer spaces. "Save as PDF / Print" opens the browser's print dialog; choose "Save as PDF" there. Ticking "Fill in the answers" gives a teacher copy.

## Board shortcuts

`1`–`9`, `0`: show or hide that answer. `A`: all answers. `N`: new questions. `W`: worksheet. `F`: fullscreen. `Esc`: back to topics.

## Moving to `gcsephy/`

All paths inside the folder are relative, and shared assets use site-root paths that already exist, so the folder can be moved as it is.

1. `git mv beta/do_now gcsephy/do-now` (or another name).
2. Add `<script src="/gcsephy/sw-register.js" defer></script>` to the `<head>` of `index.html`.
3. Add an entry to `gcsephy/index.html` and remove the one in `beta/index.html`.
4. Update the link in the root `README.md`, and delete `review-changes.csv` if it is no longer wanted.
