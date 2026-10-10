# Spellwave

A typing defence game for AQA GCSE Physics vocabulary. The page is `fun/spellwave.html`; the code is in `src/`. It is network-only (no offline cache), needs no build step, and loads Three.js and two post-processing add-ons from jsDelivr through the import map in the HTML.

Run the tests with `node --test fun/spellwave/tests/`.

## Art style

Everything is low-poly: simple solids with flat shading, so every facet shows, in warm paper-like colours.

- `src/lowpoly.js` builds the scenery: the scrolling faceted ground, trees, rocks and clouds.
- `src/lowpoly-creatures.js` builds every monster and boss from solids on pivots. Each builder also returns an `animate(seconds, enemy)` function that moves those pivots (legs, wings, jaws, tails).
- Season colours are the `SEASON_PALETTES` in `src/main.js`. Keep light levels modest: anything brighter than 1.0 in the rendered frame blooms, so over-lit ground turns the whole scene hazy.
- The sound follows the same idea (`src/audio.js`): mallet, plucked and music-box voices built from sine partials, with soft percussion. Boss music and the big moments (boss kills, lightning, shockwave, damage) keep harder sounds on purpose.
- A monster must not carry its own light. Use a glow anchor (`createGlowAnchor` in `src/enemy-meshes.js`), which borrows from a fixed pool; adding real lights makes every shader recompile and stalls the game.

## Difficulty design

Difficulty has two separate parts, and a keyword must suit both:

- **Concept difficulty** is the list a keyword sits in (`EASY_WORDS`, `MEDIUM_WORDS`, `HARD_WORDS` in `src/question-bank.js`).
- **Typing length** is capped per wave in `src/difficulty.js`. Length is counted as typed: letters only, without spaces or punctuation.

| Wave | Normal monsters, healers and chests | Longest normal prompt | Hard guests | Boss words |
| --- | --- | --- | --- | --- |
| 1 | Easy | 11 | none | Medium, up to 14 |
| 2 | Easy | 14 | 1 | Medium, up to 14 |
| 3–4 | Easy + medium | 19 | 1–2 | Hard |
| 5–6 | Medium + hard | 26 | — | Medium + hard |
| 7–9 | Medium + hard | no cap | — | Medium + hard |
| 10 | Bosses only, with healers and chests | no cap | — | Medium + hard |

Each wave also has one equation boss, drawn from `EQUATION_WORDS` on every wave.

Rules behind the table:

- **Hard guests** are hard-list words slipped into the second half of an early wave, so players meet harder vocabulary before wave 5. They obey that wave's length cap, so early guests are short terms such as "half life" or "moderator".
- **Boss previews.** Every boss word appears as a normal monster earlier in its wave. This is why wave 1–2 boss words are capped, and it is the one case where a normal prompt may exceed the wave's cap (up to 14 on wave 1).
- **Equation previews.** One quantity from the wave's equation is previewed too. A quantity within the cap is preferred; if the equation has none, a longer one is still shown.
- **Long phrases belong to bosses and late waves.** Bosses hide part of a long term, so only some of its words are typed. Normal monsters need the whole term.
- **Pacing** is separate from keyword choice: each wave has a typing budget, a limit on how much text is on screen at once, and slower movement for long prompts (`NORMAL_TYPING_BUDGETS` and nearby constants in `src/main.js`).

### Why these rules

- A wave's typing budget is small early on (58 letters in wave 1), so a single 26-letter prompt was nearly half the wave. That happened because hard guests were drawn from the whole hard list with no length limit.
- The lists mix long terms with short but conceptually hard ones, so the list alone cannot control typing load. Hence the separate cap.
- The cap values are a judgement, not the result of playtesting. Adjust them in `src/difficulty.js` and update the table here.

## Adding keywords

- Put each keyword in the list that matches its concept difficulty; follow the comments at the top of `src/question-bank.js` for definitions.
- An easy keyword must be 11 letters or fewer, or wave 1 would never use it. `tests/difficulty.test.mjs` fails if one is longer, and also checks that every capped wave still has a healthy pool.
- A long keyword needs no special handling: the caps keep it out of early waves automatically.
