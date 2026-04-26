# Markdown Editor — Bug Fix & Improvement Checklist

All tasks are in `tools/markdown_editor/`. After completing any task that touches a
file listed in `ASSETS_TO_CACHE` (sw.js), bump `BUILD_ID` in `sw.js` as a final step.

---

## Bugs

- [x] **[TASK A — do together with TASK B]** Extract `isCurrencyLike` into a shared module
  - **Why together:** Tasks A and B both touch `isCurrencyLike`. Extracting it first (A)
    and then fixing it once (B) avoids patching the same logic in two files separately
    and risking divergence.
  - Create `js/utils.js` and move `isCurrencyLike` there as a named export.
  - Remove the duplicate definitions from `js/rendering.js` (lines 31–48) and
    `js/copy.js` (lines 47–64).
  - Add `import { isCurrencyLike } from './utils.js';` in both files.
  - Verify rendering and copy-to-clipboard still work end-to-end after the refactor.
  - Add `tools/markdown_editor/js/utils.js` to `ASSETS_TO_CACHE` in `sw.js`.

- [x] **[TASK B — do together with TASK A]** Fix currency heuristic false-positives on physics units
  - **Why together:** Fix the shared function in `js/utils.js` (created in Task A)
    so the correction applies everywhere at once.
  - **Root cause:** The pattern `/^\d+(?:[.,]\d+)?\s+[A-Za-z]/` in `isCurrencyLike`
    matched any digit-space-letter sequence, so `5 N` (Newtons), `3 A` (Amperes),
    `2 W` (Watts), `9.8 m` (metres) were all wrongly classified as currency and
    rendered as plain text instead of math.
  - **Fix:** Replaced the broad `[A-Za-z]` in that branch with a whitelist of
    currency-context words (`per`, `a`, `an`, `each`, `month`, `months`, `day`,
    `days`, `year`, `years`, `week`, `weeks`, `hour`, `hours`, `unit`, `units`,
    `piece`, `pieces`), implemented in `js/utils.js`.

- [x] **[TASK C — independent]** Replace `window.confirm` in `showImageModal` with `showConfirmationModal`
  - File: `js/ui.js`, `submitModal` function.
  - Made `submitModal` async and replaced `window.confirm(...)` with
    `await showConfirmationModal(..., { allowSuppress: false })`.

- [x] **[TASK D — independent]** Fix premature feedback removal in `showCopyFeedback` / `showCopyFailedFeedback`
  - File: `js/copy.js`.
  - Added `clearTimeout(element._copyTimer)` before scheduling a new timer in
    both functions, and store the timer ID on `element._copyTimer`.
  - Each function also removes the other's class (copied/copy-failed) on entry
    so a rapid switch between success and failure shows the correct state.

- [x] **[TASK E — independent]** Remove dead style assignment in `prepareEquationSvg`
  - File: `js/copy.js`.
  - Removed the dead `svgClone.style.backgroundColor = 'transparent'` line that
    was immediately overwritten by `svgClone.removeAttribute('style')`.

---

## Maintainability

- [x] **[TASK F — independent, but pairs naturally with TASK A+B]** Document `syncAnchorMirror` orphan node
  - File: `js/main.js`, `ensureSyncAnchorMirror`.
  - Added a comment explaining the node is an intentional singleton whose
    lifetime matches the single-page app lifetime.

---

## Improvements

- [x] **[TASK G — independent]** Add a loading guard to `insertMathTemplate`
  - File: `js/main.js`.
  - Added a module-level `isInsertingTemplate` boolean flag. The function returns
    early if a fetch is already in flight, and resets the flag in `.finally()`.

- [x] **[TASK H — independent]** Debounce the laser canvas resize handler
  - File: `js/main.js`.
  - Wrapped the `resize` listener with `debounce(resizeLaserCanvas, 100)` using
    the existing `debounce` utility imported from `js/state.js`.
