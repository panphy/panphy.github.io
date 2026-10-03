# Do Now starters

Lesson starters for AQA GCSE Physics (Higher). The teacher picks topics, then either sets a number of questions to be drawn at random (spread across the chosen topics) or ticks the exact questions to show ("Pick my own"). The board shows them large enough to read from the back of the room. Optional required practical methods, listed below the topic units, show the steps of a practical jumbled for students to put in order. Each question has its own answer button, and there is a Show ALL answers button.

## Files

| Path | Purpose |
|---|---|
| `index.html`, `do_now.css`, `do_now.js` | The page. No build step. |
| `questions.csv` | The question bank. The page reads it on every load, so editing this file is all that is needed to change a question. |
| `images/*.svg` | Diagrams, named in the `Image` column. |
| `methods.csv` | The "Required practicals" tasks: one row per method, with the steps in the correct order, one per line in the `Steps` cell. The page jumbles and letters them. `Note` is added to the answer (e.g. two steps that may be swapped). |
| `review-changes.csv` | Every change made to the original bank (old and new wording, with a reason). For review only; the page does not use it and it can be deleted. |

## Question bank columns

| Column | Notes |
|---|---|
| `Number` | Stable ID. 1–635 are the original numbers; 636 onwards are new. Gaps are removed questions. |
| `Unit` | AQA unit, used to group topics on the landing page (and to show Paper 1 or 2). |
| `Topic` | Separate Physics only topics start with `(S) `. Row order sets the order on the page. |
| `Course` | `Combined` or `Separate`, following the "(physics only)" markers in the AQA 8463 specification (version 1.1). Every topic is wholly one or the other, so keep all rows of a topic the same. "Combined only" hides the `Separate` topics. |
| `Question`, `Answer` | Plain text. A line break inside the cell is shown as a line break. |
| `Image` | A file name in `images/`, or empty. Several questions can share one image. |

Save the CSV as UTF-8 (in Excel: "CSV UTF-8 (Comma delimited)"), or symbols such as Ω and Δθ will be garbled. Questions with the same wording and image are treated as one, so a repeated question (such as the unit of force) never appears twice on the board.

## Flashcards

"Flashcards" on the landing page is for students revising on their own. It makes a shuffled deck of every question in the chosen topics (or the hand-picked questions), shown one at a time: "Show answer", then "Got it" retires the card and "Still learning" sends it to the back of the deck. Keys: `↓` show answer, `→` got it, `←` still learning, `Esc` back.

## Worksheet

"Worksheet PDF" builds an A4 sheet from the questions on the board: name, class and date lines, then a two-column table of questions and answer spaces. "Save both PDFs" opens the browser's print dialog twice, first for the worksheet and then for a separate answer key; choose "Save as PDF" each time (cancel either dialog to skip that file). The preview can be switched between the two.

## Board shortcuts

`1`–`9`, `0`: show or hide that answer. `A`: all answers. `N`: new questions. `W`: worksheet. `F`: fullscreen. `Esc`: back to topics. Clicking "Do Now" in the top bar also goes back.

## Moving to `gcsephy/`

All paths inside the folder are relative, and shared assets use site-root paths that already exist, so the folder can be moved as it is.

1. `git mv beta/do_now gcsephy/do-now` (or another name).
2. Add `<script src="/gcsephy/sw-register.js" defer></script>` to the `<head>` of `index.html`.
3. Add an entry to `gcsephy/index.html` and remove the one in `beta/index.html`.
4. Update the link in the root `README.md`, and delete `review-changes.csv` if it is no longer wanted.
