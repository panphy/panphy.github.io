# GCSE Physics teaching decks

Four browser presentations, available by direct link from the GCSE hub:

| Deck | Year | Slides | Accent |
| --- | --- | ---: | --- |
| `work-like-a-physicist/` | 9 | 57 | Light orange |
| `energy-stores-and-transfers/` | 9 | 63 | Light orange |
| `electric-circuits/` | 10 | 62 | Lime |
| `atoms-and-radiation/` | 11 | 56 | Light yellow |

Serve the repository root and open a deck's `index.html`. Edit that file for slides and revision notes, and the deck's `figures.js` for diagrams. No build step is needed. Preserve slide order when lesson guides or workbook links refer to slide numbers.

Year 11 slides 34, 43 and 46 use generated source-use, background-radiation and medical illustrations from `atoms-and-radiation/images/`; prompts are in `source-illustrations.md`, `background-illustrations.md` and `medical-illustrations.md` alongside the PNGs. Slide 43 retains SVG labels and its dose chart; source-use and medical illustrations are slide-only assets, with the shared workbook diagrams remaining in `figures.js`. Slides 34 and 46 share the cartoon medical tracer.

`assets/teaching-deck.css` provides the shared calm typography, year accents, light/dark palettes and diagram contrast overrides. Load it after the deck's layout and figure styles. `assets/teaching-deck.js` adds year labels, table scrolling, persistent grid borders during answer reveals and the theme control before the viewer builds thumbnails. Both viewers retain answer reveals, keyboard and touch navigation, fullscreen and print layouts. Portrait phones show a readable scrolling slide; presentation mode retains 16:9.

Maths is LaTeX between `\(` and `\)`, typeset by MathJax as in the IB decks; ÷ (`\div`) is allowed. `assets/deck-math.js` holds the MathJax set-up (load it in the head, and MathJax before the viewer). Diagram labels are SVG text drawn by code the workbooks share, so each deck's `figures.js` lists its maths labels in `window.DeckSvgTex` (plain label, or `figure|label`, mapped to the label with LaTeX). The viewer typesets them before building thumbnails and again whenever a figure redraws; the workbooks keep the plain labels. Add any new maths label to that list.

A slide examined only in GCSE Physics (8463), not Combined Science: Trilogy, takes the `triple` class, which adds a "Triple Science only" flag at the bottom edge (the top holds the year badge). Mark a single item on a mixed slide with `<span class="triple-tag">Triple only</span>`. Check new content against the "(physics only)" headings and statements in the AQA specification. A whole physics-only topic goes in its own flagged part after the deck's Key words slide (Electric Circuits Mission 9, static electricity; Atoms and Nuclear Radiation Part 4, hazards, uses, fission and fusion), so Combined Science classes stop at Key words and the slide numbers that workbooks cite do not move. The banner's Workbook button opens the unit's workbook hub.

All four decks use `/assets/theme.js` with `data-theme-scope="gcsephy"`, so their preference follows the GCSE hub and remains independent of the main site and IB section. Keep essential labels and outlines high contrast; pastel year colours belong to accents and soft fills. Check both themes, including labels drawn over coloured shapes and 3D models.

`assets/companion-deck.css` and `companion-deck.js` provide the Year 9/10 layouts and navigation. Year 11 retains its own `deck.css` and `deck.js`; its history slides have a distinct background to mark non-exam enrichment. `assets/deck-notes.js` and `deck-notes.css` provide the Note panel (N). `assets/model3d.js` supports the 3D models and refreshes their colours and thumbnails when the theme changes.

The decks are network-only and load `/gcsephy/sw-register.js` for freshness notifications. They are outside the root catalogue and offline cache. The approved design sample remains in [`../../beta/gcse-deck-sample/`](../../beta/gcse-deck-sample/).
