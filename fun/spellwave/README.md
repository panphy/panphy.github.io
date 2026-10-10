# Spellwave

A typing defence game for AQA GCSE Physics vocabulary. The page is `fun/spellwave.html`; the code is in `src/`. It is network-only (no offline cache), needs no build step, and loads Three.js and two post-processing add-ons from jsDelivr through the import map in the HTML.

The page versions its stylesheet, entry module, difficulty module and prompt utilities with a shared `?v=` value. Bump that value together when changing these files so a new page cannot load incompatible browser-cached code (GitHub Pages caches assets for ten minutes). Filenames remain stable; this is independent of the root service worker.

Run the tests with `node --test fun/spellwave/tests/*.test.mjs`.

## Art style

Everything is low-poly: simple solids with flat shading, so every facet shows, in warm paper-like colours.

- `src/lowpoly.js` builds the scenery: the scrolling faceted ground, trees, rocks and clouds.
- `src/lowpoly-creatures.js` builds every monster and boss from solids on pivots. Each builder also returns an `animate(seconds, enemy)` function that moves those pivots (legs, wings, jaws, tails).
- Season colours are the `SEASON_PALETTES` in `src/main.js`. Keep light levels modest: anything brighter than 1.0 in the rendered frame blooms, so over-lit ground turns the whole scene hazy.
- The sound follows the same idea (`src/audio.js`). Music uses mallet, plucked and music-box voices built from sine partials, with soft percussion; boss music keeps a harder kick, snare and bass on purpose. Every sound effect is built from the same five pieces — `knock`, `mallet`, `bell`, `rustle` and `drum` — so new ones should be too.
- The interface is cream paper cards with brown ink. The colours are the variables at the top of `src/styles.css`, and the "Paper theme" block at the end of that file overrides the older dark-panel rules above it.
- The final wave has its own palette (`FINAL_WAVE_PALETTE`) and its own scenery, the moons and drifting rocks built by `createFinalWaveScenery`.
- A monster must not carry its own light. Use a glow anchor (`createGlowAnchor` in `src/enemy-meshes.js`), which borrows from a fixed pool; adding real lights makes every shader recompile and stalls the game.

## Difficulty design

Difficulty has two separate parts, and a keyword must suit both:

- **Concept difficulty** is the list a keyword sits in (`EASY_WORDS`, `MEDIUM_WORDS`, `HARD_WORDS` in `src/question-bank.js`).
- **Typing length** is capped per wave in `src/difficulty.js`. Length is counted as typed: letters only, without spaces or punctuation.

| Wave | Normal vocabulary | Maximum minion letters | Boss answer letters |
| --- | --- | --- | --- |
| 1 | Easy | 11 | 14 |
| 2 | Easy + one short hard guest | 12 | 14 |
| 3 | Easy + medium + hard guests | 12 | 16 |
| 4 | Easy + medium + hard guests | 13 | 16 |
| 5 | Medium + hard | 13 | 16 |
| 6–9 | Medium + hard | 14 | 16 |
| 10 | Boss finale, with healers and chests | 14 for support | 16 |

- Normal enemies always require the whole displayed term. Long phrases belong to bosses; no preview bypasses the minion cap. Short boss terms and suitable equation quantities can appear as previews. Long terms are introduced in the boss question itself.
- Each ordinary wave has two vocabulary bosses and one equation boss. Bosses show the full phrase or equation structure with one missing content word, revealing its first three letters. The longest meaningful word that fits the answer cap is selected; spaces, operators and given exponents do not need typing.
- Ordinary boss rounds present one boss at a time. The finale allows two active bosses, spaced at least six seconds apart. Boss movement gives 18 seconds plus 0.8 seconds per answer letter after reveal; the entrance takes eight seconds. The first rock attack is delayed according to answer length too.
- Healers and chests use short answers, at most 12 letters. Support prompts obey the wave's minion cap too.
- Typing has no mercy: a wrong letter clears the prefix and breaks the chain. If that letter starts another visible prompt, it immediately starts targeting that enemy instead (also costing accuracy and the chain). Targets follow the matching prefix freely; no explicit switch control is needed. Backspace removes a letter; Escape pauses.
- Normal-wave typing budgets rise from 58 to 152 letters across waves 1–9. Spawning also limits active text, slows longer prompts and leaves a two-second breather after every three normal minions. Later waves retain short prompts while increasing encounter pressure.

These caps and timings are starting points for playtesting, especially waves 5–9. Keep this table aligned with `src/difficulty.js` and pacing in `src/main.js`.

## Adding keywords

- Put each keyword in the list that matches its concept difficulty; follow the comments at the top of `src/question-bank.js` for definitions.
- An easy keyword must be 11 letters or fewer, or wave 1 would never use it. `tests/difficulty.test.mjs` fails if one is longer, and also checks that every capped wave still has a healthy pool.
- A long keyword needs no special handling: the caps keep it out of normal encounters automatically; bosses ask for one bounded word.
