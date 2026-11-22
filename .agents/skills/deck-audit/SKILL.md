---
name: deck-audit
description: Auditing or sweeping the GCSE and IB teaching decks (gcsephy/decks/, ibdpphy/decks/) for a rule across many slides, with scripts to list worked examples' first lines and bracket scientific notation in calculations, and how to check the layout after many slide edits. Use when asked to check all decks, apply a deck rule everywhere, or verify the layout after many slide edits.
---

# Auditing teaching decks

The deck rules are in `gcsephy/AGENTS.md` and `ibdpphy/AGENTS.md`. A sweep finds every case, applies the fix and then checks that every changed slide still fits.

## Scripts

Run from the repository root.

| Script | What it does |
| --- | --- |
| `node .agents/skills/deck-audit/scripts/first-lines.mjs [deck ...]` | Lists the first line of working of every worked example. A GCSE example whose rows put Rearrange before any Equation row is marked `!`; IB lines need reading. |
| `node .agents/skills/deck-audit/scripts/sci-brackets.mjs [--apply] [file ...]` | Lists numbers in scientific notation that are combined with another number but not bracketed, and with `--apply` brackets them. Read the dry run first: it does not match coefficients such as 4π × 10⁻⁷, which need brackets by hand. `check.mjs` fails a pull request that adds one. |
| `node .github/scripts/deck-check.mjs [deck ...]` | The deck check CI runs: text size, contrast and layout (math sticking out of its box, content within 12px of the footer), with every step shown at 1600 × 900. Needs Chrome (`CHROME=…` if it is not found); allow a few minutes per handful of decks. |

With no deck named, each covers every deck. `check.mjs` also fails a GCSE worked example whose Rearrange row comes before its Equation row; the IB first-line rule needs reading, so `first-lines.mjs` only lists.

## A sweep

1. List the candidates with a script or a search, and read each in context: a rule's exceptions (a value that stands alone, a substitution into a formula shown just above) need judgment.
2. Make the edits with exact, asserted replacements, so a missed match stops the run instead of editing the wrong line.
3. Workbooks copy GCSE decks' worked examples (`follow` blocks in each unit's `assets/`). Change those copies too, then follow the skill `workbook-pdfs`.
4. Run `deck-check.mjs` on the changed decks and `check.mjs --base origin/main`, and look at any tight slide in a screenshot. A line that now overflows can move its result to a continuation line (`&nbsp; \(= …\)`), or two short lines can share one with "so". Never shrink the text.
