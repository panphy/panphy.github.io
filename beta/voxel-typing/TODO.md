# Voxel Typing Night — TODO

Educational improvements discussed for making the game more useful for students.
Each item is optional and independent unless noted.

---

## Enhancements

- [x] **[TASK-1] Definition + hint mode** *(highest priority)*
  Replace the plain-word label on medium/hard enemies with a definition prompt and a
  first-letter hint in the form `a_________` (one underscore per remaining character).
  Multi-word terms should preserve word boundaries: `k_______ e______` for "kinetic energy".
  Easy words (wave 1–2) can keep the current plain-word display to ease onboarding.
  Each word in `EASY_WORDS`, `MEDIUM_WORDS`, and `HARD_WORDS` needs a paired definition string.
  > **Mechanic note**: the game uses prefix matching to assign the active target, so the
  > first-letter hint also serves as the targeting cue — do not omit it.

- [ ] **[TASK-2] Post-run glossary card**
  On the game-over screen, show a scrollable list of every term the player encountered
  that run, each with its one-line definition. Terms successfully defeated appear in the
  accent (teal) colour; leaked terms appear in the warning (orange) colour.
  No gameplay change required — pure UI addition to the existing end-screen.

- [ ] **[TASK-3] Topic / chapter selection**
  Add a pre-game topic picker (e.g. Forces, Waves, Electricity, Thermodynamics) so the
  word pool is scoped to what the student is currently revising. The flat word arrays in
  `main.js` should be reorganised by topic, with difficulty tiers preserved within each.

- [ ] **[TASK-4] Custom word lists**
  Add a pre-game "Edit word list" panel (textarea or simple table UI) where teachers or
  students can enter their own term–definition pairs, stored in `localStorage`.
  Falls back to the built-in list when no custom list is saved.
  Depends on: TASK-1 (each entry needs both a term and a definition).

- [ ] **[TASK-5] Unit prompts for medium enemies**
  For medium-wave enemies, append `[unit?]` to the displayed term and require the player
  to type the SI unit instead of the term itself (e.g. `pressure [unit?]` → type `Pa`).
  Can coexist with definition mode by toggling prompt type per enemy on spawn.

- [ ] **[TASK-6] Formula completion for hard enemies**
  Hard-wave enemies show a partial formula with a blank (e.g. `F = ___ × a`) and the
  player types the missing symbol or word (e.g. `m`).
  Requires a separate `FORMULA_PROMPTS` array with `{ display, answer }` pairs.
