#!/usr/bin/env node
// Finds numbers in scientific notation (a × 10^n) inside \( \) or \[ \] math that are combined with
// another number by ×, ÷, + or − but have no brackets, and with --apply adds them. The rule and its
// exceptions are in .github/scripts/sci-notation.mjs, which check.mjs also uses to fail a pull request
// that adds one. Coefficients that are not plain numbers (4π × 10⁻⁷) are not matched: bracket those by
// hand. Read the dry run before applying.
//   node .agents/skills/deck-audit/scripts/sci-brackets.mjs [--apply] [file ...]   (default: every deck)
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { MATH, bracketScientific } from '../../../../.github/scripts/sci-notation.mjs';

const ROOT = resolve(fileURLToPath(new URL('../../../..', import.meta.url)));
const apply = process.argv.includes('--apply');
const named = process.argv.slice(2).filter((arg) => arg !== '--apply');
const files = named.length ? named : execFileSync('git', ['ls-files', 'gcsephy/decks/*/index.html', 'ibdpphy/decks/*/index.html'], { cwd: ROOT, encoding: 'utf8' }).split('\n').filter(Boolean);

let total = 0;
for (const file of files) {
  const text = readFileSync(resolve(ROOT, file), 'utf8');
  const found = [];
  const next = text.replace(MATH, (whole, inline, display) => {
    const fixed = bracketScientific(inline ?? display);
    if (fixed === null) return whole;
    found.push(fixed);
    return inline !== undefined ? `\\(${fixed}\\)` : `\\[${fixed}\\]`;
  });
  if (!found.length) continue;
  total += found.length;
  console.log(`== ${file}: ${found.length}`);
  for (const line of found) console.log(`   ${line.slice(0, 200)}`);
  if (apply) writeFileSync(resolve(ROOT, file), next);
}
console.log(`${total} expression${total === 1 ? '' : 's'} ${apply ? 'bracketed' : 'to bracket (dry run; add --apply)'}`);
