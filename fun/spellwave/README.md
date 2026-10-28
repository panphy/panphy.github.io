# Spellwave

A typing defence game for AQA GCSE Physics vocabulary. The page is `fun/spellwave.html`; the code is in `src/`. It is network-only (no offline cache), needs no build step, and loads Three.js and two post-processing add-ons from jsDelivr through the import map in the HTML.

The page versions its stylesheet, entry module, word bank, difficulty module, prompt utilities, visuals module, audio module, potion system, leaderboard, victory cinematic and word decks (`word-decks.js`) with a shared `?v=` value. Bump that value together when changing these files so a new page cannot load incompatible browser-cached code (GitHub Pages caches assets for ten minutes). Filenames remain stable; this is independent of the root service worker.

Run the tests with `node --test fun/spellwave/tests/*.test.mjs`.

## Spelling

The UI, displayed terms and definitions use British English. Typed answers accept both British and American spellings, including mixed spellings within a phrase. `src/prompt-utils.js` lists the recognised variants and matches whole words, so measuring instruments such as `ammeter` never acquire invalid alternatives such as `ammetre`. These variants also apply to boss answers and the checks that prevent typing targets from clashing.

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
- The victory ending is a 40-second Three.js film in `src/ending-cinematic.js`, built from the same low-poly pieces: the defeated words fly into the wands, a wave of light turns the night into spring, and lanterns spell the game's name at sunrise. Its music is the victory score in `src/audio.js`. Both follow the cue times in `ENDING_TIMELINE` (a 90 bpm bar grid), so change them together. Every shot is computed from the film's clock, which follows the audio clock when sound is on; the cinematic's `seek(seconds)` jumps to any moment when tuning a shot.
- The first time a player ever loots a potion, the game pauses once on a guide card that shows how to cast it (its arrow key or a tap) and invites them to try each kind to find out what it does; they can cast it straight away or keep it. The guide is remembered in localStorage (`panphySpellwaveLootGuideSeenV1`); clear that key to see it again.
- A monster must not carry its own light. Use a glow anchor (`createGlowAnchor` in `src/enemy-meshes.js`), which borrows from a fixed pool; adding real lights makes every shader recompile and stalls the game.

## Leaderboard

The "Hall of Wizards" is a top-five score list stored in Supabase; all of its code is in `src/leaderboard.js`.

- Scores are read from the `spellwave_leaderboard` table and written only through the `submit_spellwave_score` function. The table, the function and the score-range check live in the Supabase project, not in this repository.
- `MAX_SCORE` in `src/leaderboard.js` must match the server's range check. Raise both together if a scoring change makes a legitimate run exceed it, or high scores will be rejected.
- A run that used a cheat (god mode, the potion cheat or the final-wave skip) is never submitted.
- **Reset the board after any gameplay change** (speed, timing, damage, rock frequency, scoring, waves, the question bank or boss options), so old scores never compete with new rules. Resetting removes real scores only: the placeholders are in the code and keep filling the board. Once the change is live: copy the table into the `backup` schema, which the API does not expose (`create table backup.spellwave_leaderboard_YYYYMMDD as table public.spellwave_leaderboard;`), check the row counts match, then `delete from public.spellwave_leaderboard;`. In the same pull request as the gameplay change, bump `CACHE_KEY` in `src/leaderboard.js` and add the old key to `OLD_CACHE_KEYS`, so browsers drop their saved copy of the old board. To restore a backup: `insert into public.spellwave_leaderboard select * from backup.spellwave_leaderboard_YYYYMMDD;`.
- Until five real scores exist, `PLACEHOLDER_SCORES` fill the empty places on screen. They never affect who qualifies, and every real score is always shown. They are obvious fillers (AAA 20,000 down to EEE 12,000) so nobody mistakes them for real records.
- The page loads the Supabase client from jsDelivr and falls back to plain REST calls if it never loads. The last list fetched is kept in localStorage and shown while the live one loads; the status reads "Offline" when the fetch fails.
- `.github/workflows/supabase-keepalive.yml` queries the table twice a week so that the free-tier project is not paused. It carries a copy of the public anon key, so update it there too if the key or project changes.

## Difficulty design

Difficulty has two separate parts, and a keyword must suit both:

- **Concept difficulty** is the list a keyword sits in (`EASY_WORDS`, `MEDIUM_WORDS`, `HARD_WORDS` in `src/question-bank.js`).
- **Typing length** is capped per wave in `src/difficulty.js`. Length is counted as typed: letters only, without spaces or punctuation.

| Wave | Normal vocabulary | Max minion letters | Boss answer letters | Max live bosses | Total bosses | Hint letters | Rock damage | Rock interval |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Easy | 11 | 14 | 1 | 3 | 3 | ¼ heart | 3.0 s |
| 2 | Easy + one short hard guest | 12 | 14 | 2 | 3 | 2 | ¼ heart | 3.0 s |
| 3 | Easy + medium + hard guests | 12 | 16 | 2 | 4 | 1 | ¼ heart | 2.8 s |
| 4 | Easy + medium + hard guests | 13 | 16 | 3 | 5 | 1 | ¼ heart | 2.8 s |
| 5–6 | Medium + hard | 13–14 | 16 | 3 | 5 | 1 | ¼ heart | 2.7 s |
| 7–9 | Medium + hard | 14 | 16 | 3 | 6 | 1 | ½ heart | 2.6 s |
| 10 | Boss finale, with healers and chests | 14 for support | 16 | 3 | 12 | 1 | ½ heart | 2.5 s |

Boss live caps, totals, hint letters, rock damage and rock intervals live in `BOSS_WAVE_TABLE` in `src/difficulty.js`. The finale interleaves four healers and three chests with its bosses.

- Normal enemies always require the whole displayed term. Long phrases belong to bosses; no preview bypasses the minion cap. Short boss terms and suitable equation quantities can appear as previews. Long terms are introduced in the boss question itself.
- Each wave has one equation boss and the rest vocabulary bosses (`total − 1`). Vocabulary bosses use medium terms of 14 letters or fewer on waves 1–2, then any medium or hard term on waves 3–4; from wave 5 each is drawn from the hard list 70% of the time (`HARD_BOSS_SHARE` in `src/difficulty.js`). Terms marked `noBoss` in the word bank never become bosses.
- Bosses show the full phrase or equation structure with a missing content word, revealing the wave's hint letters; the blanks show its length. The hidden word is the one that tells the term apart from the rest of the bank: the rarest content word that fits the answer cap, preferring five letters or more, then the longest. Equations never hide a word printed in the symbol clue, repeated in the line, or naming no quantity ("transferred"). An entry's `ask` overrides the rule and may name two words. Bosses in one wave never share an answer; spaces, operators and given exponents do not need typing.
- A boss that reaches the wall costs three hearts; the run ends only if that empties the life bar.
- No answer on screen may be the same as, or start, another word that can be typed at the same time: bosses in a wave, finale bosses and the healers and chests alongside them are chosen so their words never clash.
- Bosses spawn on a 2.8-second timer, held while the wave's live-boss cap is full. The finale interleaves healers and chests under the same live cap. Boss movement uses a base budget of 18 seconds plus 0.8 seconds per answer letter after the boss arms. Bosses walk 5% faster than that baseline in wave 1, increasing by 2 percentage points per wave to 23% faster in wave 10; divide the base budget by that speed multiplier for the time available. Before that comes a four-second approach (`BOSS_APPROACH_TIME`), during which the full question already shows and can be answered, but the boss throws nothing. Answering early is a skill reward. When the boss reaches the arm line it flashes and sounds, then throws its first rock 1.5–2 seconds later (`BOSS_FIRST_ROCK_DELAY`). Rocks across all bosses are still spaced at least 2.0 seconds apart, at most two in the air. Chain lightning is a targeted interrupt, not a global freeze: a cast can affect at most two bosses (a typed boss kill counts), and interrupted bosses are stunned for 5.5 seconds with their rocks cleared and their next throw delayed. Time freeze still pauses the whole field for 3.5 seconds.
- Words come from decks (`src/word-decks.js`): monsters, healers, chests and bosses favour words not yet used this run, then words not used last run, so nothing repeats until a pool runs out and no boss question repeats in a run. Last run's words are kept in localStorage (`panphySpellwaveLastRunTermsV1`), saved at each wave clear and at the end of a run. Short boss terms still appear as monsters before their boss on purpose.
- Healers and chests use short answers, at most 12 letters. Support prompts obey the wave's minion cap too.
- Typing has no mercy: a wrong letter clears the prefix and breaks the chain. If that letter starts another visible prompt, it immediately starts targeting that enemy instead (also costing accuracy and the chain). Targets follow the matching prefix freely; no explicit switch control is needed. Backspace removes a letter; Escape pauses.
- Normal-wave typing budgets rise from 58 to 152 letters across waves 1–9. Spawning also limits active text, slows longer prompts and leaves a two-second breather after every three normal minions. Later waves retain short prompts while increasing encounter pressure.

These caps and timings are starting points for playtesting, especially waves 5–9. Keep this table aligned with `src/difficulty.js` and pacing in `src/main.js`.

## Adding keywords

- Put each keyword in the list that matches its concept difficulty; follow the comments at the top of `src/question-bank.js` for definitions.
- An easy keyword must be 11 letters or fewer, or wave 1 would never use it. `tests/difficulty.test.mjs` fails if one is longer, and also checks that every capped wave still has a healthy pool.
- A long keyword needs no special handling: the caps keep it out of normal encounters automatically; bosses ask for one bounded word, or two short ones.
- After adding a medium or hard keyword or an equation, check which word its boss hides; if the rule picks a word the clue is not about, set `ask`. The clue must not contain the hidden word (`tests/prompt-utils.test.mjs` checks this).
