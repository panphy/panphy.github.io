# Spellwave Bug-Fix & Cleanup Pass - Tasks

- `[x]` Stop escaping Mimic Chests from dealing damage / breaking shield (`leakEnemy()` early return)
- `[x]` Reset `potionCheatActive` in `potions.js` `clear()` so `idkfa` doesn't persist across runs
- `[x]` Set `potionCheatUsedThisRun = false` at run start (symmetric with god mode)
- `[x]` Cache label dimensions in `updateLabels()`; invalidate via `labelMeasureGen` on resize
- `[x]` Remove unreachable `isNeutral`/`isChain` code in `defeatEnemy()` and its wrapper
- `[x]` Generalize `wrapSups()` to all superscript digits
- `[x]` Mirror all edits into both `beta/spellwave2/src/` and `fun/spellwave/src/`
- `[x]` `node --check` all edited files; confirm both source trees are in sync
- `[ ]` In-browser playtest: missed Mimic + active shield, fresh run after `idkfa`, busy-wave labels + resize
