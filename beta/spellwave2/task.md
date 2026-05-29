# Spellwave Bug-Fix & Cleanup Pass - Tasks

- `[x]` Stop escaping Mimic Chests from dealing damage / breaking shield (`leakEnemy()` early return)
- `[x]` Reset `potionCheatActive` in `potions.js` `clear()` so `idkfa` doesn't persist across runs
- `[x]` Set `potionCheatUsedThisRun = false` at run start (symmetric with god mode)
- `[x]` Cache label dimensions in `updateLabels()`; invalidate via `labelMeasureGen` on resize
- `[x]` Remove unreachable `isNeutral`/`isChain` code in `defeatEnemy()` and its wrapper
- `[x]` Generalize `wrapSups()` to all superscript digits
- `[x]` Mirror all edits into both `beta/spellwave2/src/` and `fun/spellwave/src/`
- `[x]` `node --check` all edited files; confirm both source trees are in sync
- `[x]` Shield effect shouldn't carry on to the next wave (deactivate shield on wave advance)
- `[x]` Prevent duplicate potion activation if effect is already active (check time freeze, chain lightning, and shield active status before activation)
- `[x]` Add "skip" button on the lower right in the ending scene (styled premium/retro, triggers stats screen immediately, hidden once stats are shown)
- `[x]` Remove WPM and GCSE Grade from ending stats, highlight Final Score and Run Time (added highlighted class and styling, removed WPM/Grade)
- `[x]` Rename replay button to "Another Attempt"
- `[x]` Mirror all these changes to `/fun/spellwave`
- `[x]` Remove ending subtitle and summary texts from the ending scene
- `[x]` Rearrange summary cards into a 2x3 grid with Final Score and Run Time in the 1st column
- `[x]` Add visual blocked-active feedback (red glow + shake) when trying to activate a duplicate potion of an already active type
- `[x]` Add "BOSS LEAKED!" slow-motion banner screen and Instant Defeat screen on boss leak, delaying `endGame()` by 2.5s
- `[x]` Update startup message panel instruction copy to be simple, concise, and text-only: "Type to kill. Type to heal. Type to loot. Just don't let the bosses leak!"
- `[x]` Increase game difficulty in spellwave2: leaked normal monster causes -1 heart, boss projectile damage is unchanged (still 1/2 heart on every 2nd hit), and leaked boss causes instant kill (ordinary Game Over for death via projectile/minion leak)

