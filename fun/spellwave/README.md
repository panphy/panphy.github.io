# Spellwave

A typing defence game for AQA GCSE Physics vocabulary. The page is `fun/spellwave.html`; the code is in `src/`. It is network-only (no offline cache), needs no build step, and loads Three.js and two post-processing add-ons from jsDelivr through the import map in the HTML.

The page versions its stylesheet, entry module, word bank, difficulty module, prompt utilities, visuals module and boss modules (`boss-choices.js`, `boss-options.js`) with a shared `?v=` value. Bump that value together when changing these files so a new page cannot load incompatible browser-cached code (GitHub Pages caches assets for ten minutes). Filenames remain stable; this is independent of the root service worker.

Run the tests with `node --test fun/spellwave/tests/*.test.mjs`.

## Spelling

The UI, displayed terms, definitions and boss options use British English. Typed answers accept both British and American spellings, including mixed spellings within a phrase. `src/prompt-utils.js` lists the recognised variants and matches whole words, so measuring instruments such as `ammeter` never acquire invalid alternatives such as `ammetre`. These variants also apply to boss options and the checks that prevent typing targets from clashing.

## Art style

Everything is low-poly: simple solids with flat shading, so every facet shows, in warm paper-like colours.

- `src/lowpoly.js` builds the scenery: the scrolling faceted ground, trees, rocks and clouds.
- `src/lowpoly-creatures.js` builds every monster and boss from solids on pivots. Each builder also returns an `animate(seconds, enemy)` function that moves those pivots (legs, wings, jaws, tails).
- `monster-gallery.html` is a development page, not linked from the site, that shows every monster and boss with its animation under each season's lighting. Serve the repository and open `/fun/spellwave/monster-gallery.html` to review a model after changing it. The gallery shows each boss at its listed scale; the game draws bosses `BOSS_SIZE` (1.35) times bigger so they dominate boss waves, and places each boss card beyond the boss's measured width; it has no bloom, so glowing parts look flatter than in the game.
- Season colours are the `SEASON_PALETTES` in `src/main.js`. Keep light levels modest: anything brighter than 1.0 in the rendered frame blooms, so over-lit ground turns the whole scene hazy.
- Power use: play is capped at about 60 frames a second (`MIN_FRAME_MS`), the 3D scene renders at no more than 1.5× pixel density with 2× multisampling (`src/visuals.js`), and menus and pauses drop to 10 frames a second. Battery Saver goes further by turning off post-processing and shadows.
- The sound follows the same idea (`src/audio.js`). Music uses mallet, plucked and music-box voices built from sine partials, with soft percussion; boss music keeps a harder kick, snare and bass on purpose. Every sound effect is built from the same five pieces — `knock`, `mallet`, `bell`, `rustle` and `drum` — so new ones should be too.
- The interface is cream paper cards with brown ink. The colours are the variables at the top of `src/styles.css`, and the "Paper theme" block at the end of that file overrides the older dark-panel rules above it.
- The final wave has its own palette (`FINAL_WAVE_PALETTE`) and its own scenery, the moons and drifting rocks built by `createFinalWaveScenery`.
- A monster must not carry its own light. Use a glow anchor (`createGlowAnchor` in `src/enemy-meshes.js`), which borrows from a fixed pool; adding real lights makes every shader recompile and stalls the game.

## Leaderboard

The "Hall of Wizards" is a top-five score list stored in Supabase; all of its code is in `src/leaderboard.js`.

- Scores are read from the `spellwave_leaderboard` table and written only through the `submit_spellwave_score` function. The table, the function and the score-range check live in the Supabase project, not in this repository.
- `MAX_SCORE` in `src/leaderboard.js` must match the server's range check. Raise both together if a scoring change makes a legitimate run exceed it, or high scores will be rejected.
- A run that used a cheat (god mode, the potion cheat or the final-wave skip) is never submitted.
- The page loads the Supabase client from jsDelivr and falls back to plain REST calls if it never loads. The last list fetched is kept in localStorage and shown while the live one loads; the status reads "Offline" when the fetch fails.
- `.github/workflows/supabase-keepalive.yml` queries the table twice a week so that the free-tier project is not paused. It carries a copy of the public anon key, so update it there too if the key or project changes.

## Difficulty design

Difficulty has two separate parts, and a keyword must suit both:

- **Concept difficulty** is the list a keyword sits in (`EASY_WORDS`, `MEDIUM_WORDS`, `HARD_WORDS` in `src/question-bank.js`).
- **Typing length** is capped per wave in `src/difficulty.js`. Length is counted as typed: letters only, without spaces or punctuation.

| Wave | Normal vocabulary | Maximum minion letters | Boss option letters |
| --- | --- | --- | --- |
| 1 | Easy | 11 | 14 |
| 2 | Easy + one short hard guest | 12 | 14 |
| 3 | Easy + medium + hard guests | 12 | 16 |
| 4 | Easy + medium + hard guests | 13 | 16 |
| 5 | Medium + hard | 13 | 16 |
| 6–9 | Medium + hard | 14 | 16 |
| 10 | Boss finale, with healers and chests | 14 for support | 16 |

- Normal enemies always require the whole displayed term. Long phrases belong to bosses; no preview bypasses the minion cap. Short boss terms and suitable equation quantities can appear as previews. Long terms are introduced in the boss question itself.
- Each ordinary wave has two vocabulary bosses and one equation boss. Vocabulary bosses use medium terms of 14 letters or fewer on waves 1–2, then any medium or hard term on waves 3–4; from wave 5 each is drawn from the hard list 70% of the time (`HARD_BOSS_SHARE` in `src/difficulty.js`). Terms marked `noBoss` in the word bank never become bosses.
- Bosses are multiple choice. A boss shows its clue (a definition, or an equation's symbol form) and the term or equation with the answer replaced by one fixed-width slot, so the letter count is not given away, then the options from `src/boss-options.js` in random order: the answer and one wrong option on waves 1–3, two from wave 4 and in the finale. The player types a whole option to find out whether it is right; options that match the letters typed so far all highlight the same way. `src/boss-choices.js` builds the options and the line.
- A finished wrong option is struck out, costs half a heart (a shield absorbs it) and breaks the chain; the boss stays until it is answered or reaches the wall. A boss scores in full when answered first time, half after one wrong option, and only its typing points after two or more. A boss that reaches the wall costs three hearts; the run ends only if that empties the life bar.
- No option on screen may be the same as, or start, another word that can be typed at the same time: bosses in a wave, finale bosses and the healers and chests alongside them are chosen so their words never clash.
- Bosses spawn on a 2.8-second timer without an active-boss cap or waiting for earlier bosses to be defeated. On waves 1–3 the timer waits until the previous boss is gone, so bosses come one at a time; from wave 4 all three can be active at once. The finale interleaves healers and chests and keeps at most three bosses alive at once (`FINAL_WAVE_MAX_LIVE_BOSSES`); the next boss waits for a free slot. Boss movement uses a base budget of 18 seconds plus 0.8 seconds per letter of the answer and the longest wrong option after reveal. Bosses walk 5% faster than that baseline in wave 1, increasing by 2 percentage points per wave to 23% faster in wave 10; divide the base budget by that speed multiplier for the time available. Before that comes an eight-second walk-in, during which the question already shows and can be answered but the boss throws nothing; this is the reading time. The first rock attack is delayed by the same letter count after reveal.
- Healers and chests use short answers, at most 12 letters. Support prompts obey the wave's minion cap too.
- Typing has no mercy: a wrong letter clears the prefix and breaks the chain. If that letter starts another visible prompt, it immediately starts targeting that enemy instead (also costing accuracy and the chain). Targets follow the matching prefix freely; no explicit switch control is needed. Backspace removes a letter; Escape pauses.
- Normal-wave typing budgets rise from 58 to 152 letters across waves 1–9. Spawning also limits active text, slows longer prompts and leaves a two-second breather after every three normal minions. Later waves retain short prompts while increasing encounter pressure.

These caps and timings are starting points for playtesting, especially waves 5–9. Keep this table aligned with `src/difficulty.js` and pacing in `src/main.js`.

## Adding keywords

- Put each keyword in the list that matches its concept difficulty; follow the comments at the top of `src/question-bank.js` for definitions.
- An easy keyword must be 11 letters or fewer, or wave 1 would never use it. `tests/difficulty.test.mjs` fails if one is longer, and also checks that every capped wave still has a healthy pool.
- A long keyword needs no special handling: the caps keep it out of normal encounters automatically, and its boss asks for a bounded answer.
- A new medium or hard keyword or equation needs an entry in `src/boss-options.js` (or `noBoss: true`): the answer, which may be one word of the term or all of it, and three wrong options, best first, that fit the same gap but not the clue. No wrong option may be defensible as correct. `tests/boss-options.test.mjs` checks the rules a test can: no option printed in the clue or line, none starting another, and every option within the letter caps.
