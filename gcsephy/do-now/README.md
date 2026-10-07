# Do Now starters

Lesson starters for AQA GCSE Physics (Higher). The teacher picks topics, then either sets a number of questions to be drawn at random (spread across the chosen topics) or ticks the exact questions to show ("Pick my own"). The board shows them large enough to read from the back of the room. Optional required practical methods, listed below the topic units, show the steps of a practical jumbled for students to put in order. Each question has its own answer button, and there is a Show ALL answers button. The text is sized so that the questions fill the screen; revealing one answer never shrinks it (the board scrolls, and a "More below" strip says so), but Show ALL answers refits the board, slightly smaller if need be, so that every answer is on screen together. "New questions" asks first when only some of the answers are showing.

The topic search matches topic and unit names, and also the wording of questions and answers (at the start of words, so `electron` finds "electrons" and `rp` does not find "absorption"). Topics found through their questions say how many matched; hover to list them. Required practicals are also matched on their task and steps. The "Pick my own" filter matches question and answer wording the same way; the ticked questions are listed above it in board order, where they can be moved up or down or removed.

The "Target 9 / Target 7" switch beside the course switch sets how much of the bank is used. Target 9 is every question; Target 7 keeps only the priority questions (about 40% of each topic), for students who would be overwhelmed by the whole bank. It applies to the random draw, "Pick my own", flashcards, search and the topic counts, and works together with "Combined only". Required practical methods are never hidden by it.

Between visits the browser remembers only the course switch, the target switch, the number of questions and the board text size. Ticked topics, picked questions and open units are not remembered: every visit starts with nothing selected and every unit folded. The board, flashcards and worksheet are browser history entries, so the Back button returns to the topics (with the selection intact) instead of leaving the page.

## Files

| Path | Purpose |
|---|---|
| `index.html`, `do_now.css`, `do_now.js` | The page. No build step. |
| `questions.csv` | The question bank. The page reads it on every load, so editing this file is all that is needed to change a question. A page that is already open offers a Reload banner within about five minutes of the change (`data-watch` on the `sw-register.js` script tag; the same for `methods.csv`). |
| `images/*.svg` | Diagrams, named in the `Image` column. |
| `methods.csv` | The "Required practicals" tasks: one row per method, with the steps in the correct order, one per line in the `Steps` cell. The page jumbles and letters them. `Note` is added to the answer (e.g. two steps that may be swapped). The same steps drive the method sheets in `revision/`, whose diagrams are matched to steps by position, so redraw them if steps change. |
| `revision/` | Student revision sheets: an index page, one question-and-answer PDF per topic and one method sheet with diagrams per required practical. See [`revision/README.md`](revision/README.md) |
| `review-changes.csv` | Every change made to the original bank (old and new wording, with a reason). For review only; the page does not use it and it can be deleted. |
| `review-target7.csv` | Why each `Target` 7 question was chosen. For review only, as above. |

## Question bank columns

| Column | Notes |
|---|---|
| `Number` | Stable ID. 1–635 are the original numbers; 636 onwards are new. Gaps are removed questions. |
| `Unit` | AQA unit, used to group topics on the landing page (and to show Paper 1 or 2). "Working scientifically" is shown first, in its own bordered block; it is based on the Year 9 unit *Work Like a Physicist* and is labelled "Both papers". |
| `Topic` | Separate Physics only topics start with `(S) `. Row order sets the order on the page. |
| `Course` | `Combined` or `Separate`, following the "(physics only)" markers in the AQA 8463 specification (version 1.1). Every topic is wholly one or the other, so keep all rows of a topic the same. "Combined only" hides the `Separate` topics. |
| `Question`, `Answer` | Plain text. A line break inside the cell is shown as a line break. In a question, a word in square brackets, such as `must [not] be done`, is shown in bold red (board, picker, flashcards and both PDFs); use it only where the negative is the point. Superscript and subscript numbers are typed as Unicode characters (`m/s²`, `R₁`); a subscript of letters is typed after an underscore (`V_p`, `R_total`). Both are drawn as real superscripts and subscripts on the board, flashcards, worksheet and revision PDFs. Nuclide notation is typed with Unicode superscripts then subscripts (`⁴₂He`, `⁰₋₁e`) and is drawn with the mass number stacked over the atomic number. |
| `Image` | A file name in `images/`, or empty. Several questions can share one image. |
| `Target` | `7` for a priority question, shown under both targets; empty for a question shown only under Target 9. Give a repeated question the same value in every topic. The revision sheets star the `7` rows, so rebuild a topic's PDF after changing them. |

Save the CSV as UTF-8 (in Excel: "CSV UTF-8 (Comma delimited)"), or symbols such as Ω and Δθ will be garbled. Questions with the same wording and image are treated as one, so a repeated question (such as the unit of force) never appears twice on the board.

## How the Target 7 questions were chosen

Each topic's share follows how often it earned recall (AO1) marks in the AQA Higher papers for Physics 8463 and Combined Science: Trilogy 8464, November 2020 to June 2023 (16 papers, counted from the specification references in the mark schemes): about half of an often-tested topic, a third of a middling one and a quarter of a rarely tested one, never fewer than two. Within a topic the choice favours facts those papers asked for directly, then units, definitions that mark schemes expect and standard explanations. "State the equation" questions are all left to Target 9, because AQA provides the full Physics Equations Sheet in the exam, for 2027 and from 2028 onwards ([AQA notice, 1 September 2026](https://www.aqa.org.uk/news/gcse-maths-sciences-formulae-equation-sheets-2027-28); more in [the Year 10 README](../year10phy/unit01/README.md#equation-sheet)). Re-check the shares when newer papers are available.

## Flashcards

"Flashcards" on the landing page is for students revising on their own. It makes a shuffled deck of every question in the chosen topics (or the hand-picked questions), shown one at a time: "Show answer" flips the card over, then "Got it" retires it and "Still learning" sends it to the back of the deck. "Undo" takes back the last card. Progress is not saved. Keys: `↓` flip to the answer, `↑` flip back, `→` got it, `←` still learning, `U` undo, `Esc` back.

## Worksheet

"Worksheet PDF" builds an A4 sheet from the questions on the board: name, class and date lines, then a two-column table of questions and answer spaces. "Save both PDFs" opens the browser's print dialog twice, first for the worksheet and then for a separate answer key; choose "Save as PDF" each time (cancel either dialog to skip that file). The preview can be switched between the two.

## Board shortcuts

`1`–`9`, `0`: show or hide that answer. `A`: all answers. `N`: new questions. `W`: worksheet. `F`: fullscreen. `Esc`: back to topics. `?` (or the "?" button): list of shortcuts. Clicking "Do Now" in the top bar also goes back. On a phone the less-used board buttons are behind the "⋯" button.

## Old address

The page used to live at `beta/do_now/`. The four HTML files left there (`index.html`, `revision/index.html`, `revision/sheet.html`, `revision/practical.html`) only forward old links here, keeping any query and hash. Old direct links to a PDF, CSV or image are not forwarded.
