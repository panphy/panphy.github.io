# TODO - PanPhyPlot Data Processing Feature (No Spreadsheet Rewrite)

## Status
- [ ] Planning complete
- [ ] Implementation not started

## Objective
Add a new **Data Processing** feature to PanPhyPlot so users can generate transformed datasets (for example, `P` vs `1/V`) without converting the main data table into a spreadsheet.

## Non-Negotiable Guardrails
- [ ] Do **not** break or change existing PanPhyPlot features, behavior, or UX flows.
- [ ] Do **not** regress app performance in normal usage.
- [ ] Do **not** rewrite current table architecture into a spreadsheet.
- [ ] Keep the feature isolated and modular.
- [ ] Preserve offline behavior and existing caching discipline.

---

## Feature Scope (MVP)
- [ ] New button in Data section: `Data Processing`
- [ ] Popup workflow that reads current dataset `x,y` values (ignore uncertainties for MVP)
- [ ] User can define formula(s) to derive new columns from source columns
- [ ] User selects output `X` and output `Y` columns
- [ ] User copies selected processed columns into a target dataset (default Dataset 2 behavior defined below)

---

## Formula Language Decision
Use **math.js expression syntax** (already loaded), with optional leading `=`.

### Accepted examples
- `=1/x`
- `=1/V` (if source header alias `V` is valid)
- `=x^2`
- `=log(y)`
- `=sqrt(abs(y))`

### Rejected / not supported in MVP
- Excel formulas/functions beyond math.js grammar
- LaTeX input as executable formulas
- Python expressions
- Multi-line scripts

---

## Exact UI Text and Controls

## 1) New button in Data section
- Control type: button
- Visible label: `Data Processing`
- Tooltip/title: `Create processed columns from the current dataset`
- Placement: In existing Data action buttons area, as a new action (do not displace existing semantics of current buttons)
- Behavior: opens Data Processing popup

## 2) Popup container
- Popup title: `Data Processing`
- Subtitle/helper text:
  - `Source: current dataset only (x and y columns). Uncertainties are not included in this step.`
- Close button label: `Close`
- Secondary close behavior: click overlay and `Esc` should close

## 3) Source table section (inside popup)
- Section heading: `Source Data`
- Show row index + source columns:
  - `Row`
  - `<X Header>`
  - `<Y Header>`
- If no valid source rows:
  - Empty-state text: `No valid x-y rows found in this dataset. Add data first.`
  - Disable processing and copy actions

## 4) Column processing controls
For each source column (`X` and `Y`) show:
- Button label: `Process <Header>`
  - Example: `Process V`
  - Fallback if header empty: `Process x` / `Process y`
- On click, reveal formula input row for that source:
  - Input label: `Formula for <Header>`
  - Placeholder: `e.g. =1/<Header>`
  - Apply button label: `Apply`
  - Cancel button label: `Cancel`
  - Helper text:
    - `Use math expressions. Variables available: x, y, and valid header names.`

## 5) Derived columns section
- Section heading: `Processed Columns`
- Display each created column with:
  - Column name (auto-generated, editable optional in MVP; if not editable, keep deterministic naming)
  - Origin formula shown read-only
  - Remove action label: `Remove`
- Suggested deterministic default names:
  - `<Header> | <formula>`
  - Example: `V | 1/V`

## 6) Output mapping section
- Section heading: `Output Mapping`
- Control labels:
  - `New X column`
  - `New Y column`
  - `Target dataset`
- `New X column` options:
  - Original source columns + derived columns
- `New Y column` options:
  - Original source columns + derived columns
- `Target dataset` behavior:
  - If Dataset 2 exists and is empty: default to Dataset 2
  - If Dataset 2 exists and is not empty: default to `Create new dataset`
  - If Dataset 2 does not exist: default to `Create new dataset`
- Primary action button label: `Copy to Dataset`
- Secondary action button label: `Reset`

## 7) Validation / messaging
- Formula parse error:
  - `Invalid formula. Please check syntax and try again.`
- Unknown variable:
  - `Unknown variable "<name>" in formula.`
- Non-finite result warning:
  - `Some rows produced invalid results and will be skipped.`
- Copy success:
  - `Processed data copied to <Dataset Name>.`
- Copy blocked (no valid mapped rows):
  - `No valid output rows to copy.`

---

## Edge-Case Behavior (Must Implement Exactly)

## Source-data handling
- [ ] Source rows for processing are rows where both source `x` and `y` are finite numbers.
- [ ] Blank/invalid rows are ignored in processing table and copy pipeline.

## Formula parsing/evaluation
- [ ] Allow optional leading `=`; strip before parsing.
- [ ] Compile expression once per formula, evaluate per row.
- [ ] Evaluation scope per row includes:
  - `x`, `y`
  - Header aliases only when they are valid identifiers
- [ ] If header alias is not a valid identifier, do not expose alias; keep `x,y` available.
- [ ] Disallow dangerous/unexpected constructs (assignment/import/function definition).
- [ ] On evaluation error for a row, that row result is invalid (do not crash popup).

## Derived column results
- [ ] Store per-row result as numeric only when finite.
- [ ] `NaN`, `Infinity`, `-Infinity`, or thrown errors mark row invalid for that derived value.
- [ ] Keep count of invalid rows per derived column for user feedback.

## Output mapping rules
- [ ] User must select both `New X column` and `New Y column` before copy.
- [ ] If selected mapped X/Y for a row are not both finite, skip that row.
- [ ] If all rows skipped, block copy with message `No valid output rows to copy.`

## Target dataset write rules (MVP)
- [ ] Copy operation writes only `x,y` into target dataset.
- [ ] Target uncertainties reset:
  - `datasetToggles[target] = { x: false, y: false }`
  - `datasetErrorTypes[target] = { x: 'absolute', y: 'absolute' }`
- [ ] Target fit artifacts cleared:
  - remove target entry in `fittedCurves`
  - remove target entry in `datasetFitResults`
- [ ] Target headers set to chosen output column labels.
- [ ] Source dataset remains unchanged.

## Dataset creation behavior
- [ ] If target is `Create new dataset`, append a dataset and switch focus only if current UX standards do so.
- [ ] If writing into an existing non-empty target dataset, require confirmation:
  - `Replace existing data in "<Dataset Name>" with processed data?`

---

## Implementation Checklist (File-by-File)

## A) HTML
- [ ] Update `tools/panphyplot.html`
  - [ ] Add `Data Processing` button in Data section
  - [ ] Add popup markup (background + container + content + controls placeholders)
  - [ ] Add script include for new module:
    - `/tools/panphyplot/js/data-processing.js`

## B) JavaScript (new module)
- [ ] Add `tools/panphyplot/js/data-processing.js`
  - [ ] Popup open/close lifecycle
  - [ ] Source row extraction from active dataset
  - [ ] Formula compile/evaluate pipeline using math.js
  - [ ] Derived column management (add/remove/recompute)
  - [ ] Output mapping and copy-to-target logic
  - [ ] Confirmation/validation messaging
  - [ ] Integration hooks:
    - state persistence trigger (`scheduleSaveState`)
    - plot/UI refresh after copy

## C) JavaScript (minimal integration points)
- [ ] Update `tools/panphyplot/js/ui.js` only for minimal wiring if needed
- [ ] Update `tools/panphyplot/js/main.js` only if startup init hook is required
- [ ] Do not refactor existing modules unless strictly necessary

## D) CSS
- [ ] Update `tools/panphyplot/css/panphyplot.css`
  - [ ] Data Processing button style consistent with existing design system
  - [ ] Popup layout for desktop and mobile
  - [ ] 44px+ touch targets on coarse pointers
  - [ ] Keep theme variables (`:root`, `[data-theme="dark"]`) usage

## E) Manual
- [ ] Update `tools/panphyplot/panphyplot_manual.html`
  - [ ] Add Data Processing section with:
    - workflow
    - formula examples
    - limitations (uncertainties not included in MVP)

## F) Service Worker / Cache
- [ ] Update `sw.js`
  - [ ] Add `/tools/panphyplot/js/data-processing.js` to `ASSETS_TO_CACHE`
  - [ ] Bump `BUILD_ID` timestamp
  - [ ] Ensure cache list URLs exactly match HTML URLs

---

## Regression and Performance Checklist (Must Pass Before Merge)

## Existing behavior regression checks
- [ ] Add/Clear/Import/Export CSV still works as before
- [ ] View Table popup and copy actions still work
- [ ] Fit workflows (basic + advanced) unchanged
- [ ] Combined plot popup unchanged
- [ ] LaTeX mode unchanged
- [ ] Dataset tabs rename/add/remove unchanged
- [ ] Theme toggle unchanged
- [ ] LocalStorage session restore unchanged

## Performance checks
- [ ] No visible lag in typing/editing data table
- [ ] No visible lag switching datasets
- [ ] No visible lag plotting normal datasets
- [ ] Processing popup remains responsive on moderate dataset size
- [ ] No heavy loops on main page unless popup open and action triggered

## Error resilience checks
- [ ] Invalid formulas do not crash app
- [ ] Invalid row outputs handled gracefully
- [ ] Close/reopen popup does not leak listeners or duplicate handlers
- [ ] Cancel flow never mutates source/target data

---

## Acceptance Criteria (Definition of Done)
- [ ] User can create transformed data (example `P vs 1/V`) inside PanPhyPlot.
- [ ] Source dataset remains intact.
- [ ] Processed data is copied to target dataset with correct headers and values.
- [ ] Existing app behavior and performance remain unchanged.
- [ ] Manual and offline cache metadata are updated correctly.

---

## Out of Scope (Future Iterations)
- Uncertainty propagation into processed dataset
- Multi-step formula pipelines/macros
- Full spreadsheet engine / cell references
- Excel function parity
- Scripting runtime (Python)
