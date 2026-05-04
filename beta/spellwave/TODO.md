# Spellwave — TODO

The game's goal is to give students fun, low-pressure **exposure** to physics keywords — familiarity and curiosity, not deep recall. It is not intended as a full revision tool.

---

## Completed

- [x] **[TASK-1] Definition + hint mode**
  Boss enemies show a one-line definition and a masked hint (`P_` style) instead of the plain term. Unit enemies also show a unit question with a masked hint; other normal enemies keep plain words for ease of onboarding.

- [x] **[TASK-2] Boss wave structure**
  Each wave ends with 3 definition bosses. A "Wave Clear" screen shows a mini-glossary of all 3 boss terms. State machine: `wavePhase = 'normal' | 'boss'`.

- [x] **[TASK-3] Remove monster names from labels**
  Enemy names ("Mudlug", "Glowmite", etc.) are not shown in-game; mesh shape and colour provide visual variety only.

- [x] **[TASK-4] Unit prompts**
  Unit questions now appear as normal enemies tagged `unit`, using `UNIT_WORDS` in `question-bank.js`. Bosses are all definition bosses.

---

## Pending

- [ ] **[TASK-5] Post-run glossary** *(low priority)*
  On the game-over screen, show a scrollable list of every term encountered that run. Defeated terms in teal, leaked terms in orange. The wave-clear screen already shows a per-wave mini-glossary; this would be a cumulative full-run list.

- [ ] **[TASK-6] Topic / chapter selection**
  Pre-game topic picker (Forces, Waves, Electricity, Thermodynamics, …) so the word pool is scoped to what the student is currently studying.

- [ ] **[TASK-7] Formula completion**
  Hard-wave enemies show a partial formula with a blank (e.g. `F = ___ × a`) and the player types the missing symbol (`m`). Requires a `FORMULA_PROMPTS` array with `{ display, answer }` pairs.
