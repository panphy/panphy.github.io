# GCSE Physics teaching decks

Four browser presentations, available by direct link from the GCSE hub:

| Deck | Year | Slides | Accent |
| --- | --- | ---: | --- |
| `work-like-a-physicist/` | 9 | 57 | Light orange |
| `energy-stores-and-transfers/` | 9 | 63 | Light orange |
| `electric-circuits/` | 10 | 55 | Lime |
| `atoms-and-radiation/` | 11 | 41 | Light yellow |

Serve the repository root and open a deck's `index.html`. Edit that file for slides and revision notes, and the deck's `figures.js` for diagrams. No build step is needed. Preserve slide order when lesson guides or workbook links refer to slide numbers.

`assets/teaching-deck.css` provides the shared calm typography, year accents, light/dark palettes and diagram contrast overrides. Load it after the deck's layout and figure styles. `assets/teaching-deck.js` adds year labels, table scrolling, persistent grid borders during answer reveals and the theme control before the viewer builds thumbnails. Both viewers retain answer reveals, keyboard and touch navigation, fullscreen and print layouts. Portrait phones show a readable scrolling slide; presentation mode retains 16:9.

All four decks use `/assets/theme.js` with `data-theme-scope="gcsephy"`, so their preference follows the GCSE hub and remains independent of the main site and IB section. Keep essential labels and outlines high contrast; pastel year colours belong to accents and soft fills. Check both themes, including labels drawn over coloured shapes and 3D models.

`assets/companion-deck.css` and `companion-deck.js` provide the Year 9/10 layouts and navigation. Year 11 retains its own `deck.css` and `deck.js`; its history slides have a distinct background to mark non-exam enrichment. `assets/deck-notes.js` and `deck-notes.css` provide the Note panel (N). `assets/model3d.js` supports the 3D models and refreshes their colours and thumbnails when the theme changes.

The decks are network-only and load `/gcsephy/sw-register.js` for freshness notifications. They are outside the root catalogue and offline cache. The approved design sample remains in [`../../beta/gcse-deck-sample/`](../../beta/gcse-deck-sample/).
