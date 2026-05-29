# Implementation Plan: Spellwave Bug-Fix & Cleanup Pass

A review of `src/main.js`, `src/potions.js`, and `src/prompt-utils.js` surfaced two
gameplay-affecting bugs (live in the published `fun/spellwave` copy), one performance
issue, and minor cleanup. All changes are mirrored into both source trees:
`beta/spellwave2/src/` and `fun/spellwave/src/` (byte-identical).

## Fixes

### 1. Escaping Mimic Chests must not punish the player — `main.js` `leakEnemy()`
The `isMimic` branch fell through into the damage path (missing `return`), so a missed
chest dealt `MINION_DAMAGE`, broke an active A.T. Field shield (`blockLeak()`), reset the
streak, and fired the damage flash/sound. This contradicted the documented spec
(`todo.md`: "reward target only, never a damage threat"; "On escape: remove without
damaging the player"). Fix: give the mimic branch an early `return` mirroring the medic —
record the term as not-defeated, drop debris, remove the enemy, and clear the buffer if it
was the active target. No damage, no shield loss, no streak reset.

### 2. `idkfa` potion cheat must not persist across runs — `potions.js` `clear()` + `main.js` `startGame()`
`clear()` reset every potion state except `potionCheatActive`, while `startGame()` reset
`godMode`. The cheat therefore stayed active across runs (infinite auto-refilling potions)
and silently marked subsequent runs unranked. Fix: reset `potionCheatActive = false` in
`clear()` (called from both `startGame()` and `endGame()`), and set
`potionCheatUsedThisRun = false` at the start of a run so a fresh run is ranked unless the
cheat is re-entered mid-run — symmetric with god mode.

### 3. Remove per-label forced reflow in `updateLabels()` — `main.js`
Every frame the layout pass read `label.offsetWidth`/`offsetHeight` for each visible label
after writing label styles, forcing a synchronous reflow that scaled with enemy count. The
unscaled label box only changes when its text or the viewport changes, so dimensions are
now cached on the enemy and re-measured only when `lastPromptHtml` changes or a resize
bumps `labelMeasureGen` (incremented in `resizeRenderer()`). Safe because the only class
that alters box metrics (`is-boss`) is set once at spawn; all per-frame toggled classes
change color/shadow/transform only.

### 4. Drop dead code in `defeatEnemy()` — `main.js`
The `isNeutral`/`isChain` parameters were never passed (the only callers use defaults and
the potion-system wrapper is never invoked), so the `isNeutral` branch and the always-true
`isChainTarget` were unreachable. Removed; the potion-system `defeatEnemy` wrapper was
simplified to match.

### 5. Generalize `wrapSups()` — `prompt-utils.js`
Previously wrapped only `²`. Now wraps any run of superscript digits so extracted exponents
(e.g. `³`) render with the same `<sup class="given-sup">` styling. Future-proofing; the
current question bank only uses `²`.

## Verification
- `node --check` passes on all three edited files.
- `beta/spellwave2/src/` and `fun/spellwave/src/` confirmed byte-identical after edits.
- Behavior reasoned from code paths; mimic fix cross-checked against the `todo.md` spec.
- Recommended follow-up: in-browser playtest of a missed Mimic with an active shield, a
  fresh run after using `idkfa`, and label rendering during a busy wave / on resize.
- No `BUILD_ID` bump required: `/beta` is never service-worker cached, and `/fun` is
  intentionally network-only (per `CLAUDE.md`).
