# TODO: PanPhyPlot Custom Fit (Implementation Plan)

## 1) Objective
Add a new **Custom Fit** workflow to `/tools/panphyplot` that lets users:
- enter a math.js equation for `y` in terms of `x` and unknown parameters,
- auto-detect parameters (max 5),
- auto-generate initial parameter guesses from dataset statistics,
- edit guesses before fitting,
- run nonlinear least-squares fit,
- view fitted equation and `R^2` in existing fitting result UI.

No feature code is implemented yet in this plan document.

## 2) Agreed UX Direction
- Add a new tab button: **Custom Fit** (to the right of Advanced Fit).
- Inside the Custom Fit tab:
  - top action row: `Fit Curve` + `Clear Fit` (same pattern as Basic/Advanced),
  - below action row: formula input panel matching Data Processing style:
    - label (e.g. `Formula for y`),
    - `Help` button on top-right linking `/tools/panphyplot/math_ref.html`,
    - equation input field,
    - inline validation/status message area,
  - below formula panel: LaTeX preview box (same visual style as `.general-equation`).
- Parameter definition is automatic:
  - symbols not recognized as `x`, `y`, math.js constants, or math.js function names are treated as fit parameters.
  - hard cap: **5 parameters**.
- Initial values are auto-filled from data (Advanced Fit style) and user-editable before fitting.

## 3) Syntax Contract (Custom Equation)
- User provides RHS expression for `y`, examples:
  - `A*exp(-k*x)+c`
  - `a*x^2 + b*x + d`
  - `A*sin(k*x-phi)+c`
- Optional leading `=` is accepted and stripped.
- math.js syntax is required (same family as Data Processing).
- Multiplication should be explicit (`2*x`, not `2x`) to reduce ambiguity.

## 4) Parameter Auto-Detection Rules
Use parsed AST traversal on the custom expression:
1. Collect symbol nodes used as variables (not function identifiers).
2. Exclude reserved data variables: `x`, `y`.
3. Exclude known math.js symbols/functions (`pi`, `e`, `sin`, `exp`, etc.).
4. Remaining unique identifiers are parameters.
5. Preserve order by first appearance in expression.
6. Validate:
   - count must be `1..5`,
   - names must be valid identifiers,
   - no duplicates after normalization.

Error examples:
- `0 parameters detected` -> show error.
- `>5 parameters detected` -> show error asking user to simplify model.

## 5) Initial Guess Strategy (Auto + Editable)
For each detected parameter, generate an initial guess from dataset stats:
- Compute stats from finite points: `xMin`, `xMax`, `xMean`, `xSpan`, `yMin`, `yMax`, `yMean`, linear slope.
- Name-based heuristics (case-insensitive):
  - amplitude-like (`a`, `amp`, `A`) -> `(yMax - yMin)/2` (fallback `1`)
  - offset-like (`c`, `offset`, `b0`) -> `yMean`
  - slope-like (`m`, `slope`) -> linear slope
  - center-like (`x0`, `mu`, `center`) -> `xMean`
  - width-like (`sigma`, `w`, `width`) -> `xSpan/4` (min epsilon)
  - frequency-like (`k`, `omega`) -> `2*pi/xSpan` (fallback `1`)
  - exponent-like (`n`, `p`, `pow`) -> `1`
  - unknown -> `1`
- UI shows one numeric input per parameter so user can adjust.
- On formula change: regenerate parameter list and defaults.
- Optional implementation detail: keep prior user-entered values for unchanged parameter names.

## 6) Fit Engine Plan
Implement `performCustomFit()` in `curve-fitting.js` using existing LM core:
1. Parse + validate formula.
2. Detect parameters + build ordered parameter vector.
3. Build compiled evaluator from expression.
4. Build residual function:
   - for each point, evaluate model with scope `{ x, ...params }`,
   - residual = `yPred - y`,
   - invalid evals return penalty residual (`1e6` pattern already used).
5. Build Jacobian:
   - V1: numerical finite-difference Jacobian over parameters.
6. Run `levenbergMarquardt(...)`.
7. Generate smooth fit curve over data x-range.
8. Build fitted equation string for display and storage.
9. Call existing `updateResults(...)`, update `fittedCurves[activeSet]`, and plot.

## 7) LaTeX Preview + Fitted Equation Rendering
- General preview box:
  - parse AST from user formula,
  - convert to TeX (`toTex()`),
  - display as `y = <tex>`.
- Fitted result panel:
  - render equation with numeric fitted parameters substituted,
  - keep existing copy actions behavior unchanged.
- If formula is invalid, preview shows a clean error state (no stale equation).

## 8) File-by-File Implementation Checklist
### `tools/panphyplot.html`
- Add `Custom Fit` tab button in existing tabs row.
- Add `CustomFit` tab-content block.
- Add formula panel markup (label/help/input/message).
- Add parameter editor container (auto-generated rows).
- Add custom equation preview box.
- Add fit/clear buttons for custom tab.

### `tools/panphyplot/css/panphyplot.css`
- Reuse/extend styles from:
  - fit tab content styles,
  - Data Processing formula panel patterns.
- Ensure mobile-friendly layout for parameter rows and buttons.

### `tools/panphyplot/js/curve-fitting.js`
- Add custom-tab equation updater.
- Add parser/validator helpers for custom fit model.
- Add parameter auto-detection helper.
- Add initial-guess helper.
- Add `performCustomFit()`.
- Add custom branch in fit dispatch flow.

### `tools/panphyplot/js/ui.js`
- Update tab switch logic to include `CustomFit`.
- Wire custom help button to `/tools/panphyplot/math_ref.html`.
- Ensure clear/reset behavior clears custom-fit transient UI state correctly.

### `tools/panphyplot/js/main.js`
- Initialize custom fit UI on load and after restore.

### `tools/panphyplot/js/state.js` (optional but recommended)
- Persist custom fit draft state per dataset:
  - formula text,
  - detected parameter names,
  - current initial values.

### `tools/panphyplot/panphyplot_manual.html`
- Document Custom Fit syntax, parameter auto-detection, max-5 rule, and examples.

### `sw.js`
- If any cached PanPhyPlot files are changed during implementation:
  - bump `BUILD_ID`,
  - ensure any new cached file paths are in `ASSETS_TO_CACHE` if needed.

## 9) Validation + Error States
Required user-facing validations:
- invalid formula syntax,
- unknown token (not x/y/math symbol/function),
- zero parameters detected,
- parameter count > 5,
- insufficient data points (recommend: at least `max(4, paramCount + 1)`),
- solver non-convergence.

All failures should be non-destructive and keep the current dataset data untouched.

## 10) Manual Test Plan
### Happy-path models
- `A*x + c` (2 params)
- `A*exp(-k*x)+c` (3 params)
- `a*x^2+b*x+d` (3 params)
- `A*sin(k*x-phi)+c` (4 params)

### Validation tests
- invalid syntax: `A**x`
- too many params: `a+b+c+d+e+f+x`
- no params: `sin(x)`
- unknown symbol misuse: `PI*x` (case sensitivity)

### Numerical robustness
- sparse data near minimum count,
- wide x-range and small y-range,
- data with outliers,
- data containing blank/non-finite rows (should be ignored like existing fits).

### UX behavior
- formula change updates detected params and preview,
- initial guesses editable,
- switching datasets restores per-dataset fit/result behavior,
- clear fit removes custom fitted curve and result text.

## 11) Definition of Done
- Custom Fit tab is available and usable on desktop/mobile.
- Formula parsing, parameter auto-detection (max 5), and auto-initialization work.
- User can edit initial values and fit successfully on representative models.
- Result equation + `R^2` display and copy interactions remain working.
- No regressions in Basic/Advanced fit flows.
- Manual updated.
- `sw.js` `BUILD_ID` updated if cached assets changed.
