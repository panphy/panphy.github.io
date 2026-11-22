#!/usr/bin/env node
// Finds numbers in scientific notation (a × 10^n) inside \( \) or \[ \] math that are combined with
// another number by ×, ÷, + or − but have no brackets, and with --apply adds them. A number that
// stands alone (a whole numerator or denominator, a given value, a result) is left bare, and a + or −
// that opens a term counts as the number's sign. Coefficients that are not plain numbers (4π × 10⁻⁷)
// are not matched: bracket those by hand. Read the dry run before applying.
//   node .agents/skills/deck-audit/scripts/sci-brackets.mjs [--apply] [file ...]   (default: every deck)
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('../../../..', import.meta.url)));
const apply = process.argv.includes('--apply');
const named = process.argv.slice(2).filter((arg) => arg !== '--apply');
const files = named.length ? named : execFileSync('git', ['ls-files', 'gcsephy/decks/*/index.html', 'ibdpphy/decks/*/index.html'], { cwd: ROOT, encoding: 'utf8' }).split('\n').filter(Boolean);

const MATH = /\\\(([\s\S]*?)\\\)|\\\[([\s\S]*?)\\\]/g;
const SCI = /(?<![\d.}])(-\s*)?\d+(?:\.\d+)?\s*\\times\s*10\^(?:\{\s*-?\d+\s*\}|-?\d)/g;
const OPS = ['\\times', '\\div', '\\cdot', '+', '-'];

const endsWithOp = (left) => {
  const text = left.trimEnd();
  for (const op of OPS) {
    if (!text.endsWith(op)) continue;
    const before = text.slice(0, -op.length).trimEnd();
    // a + or - that opens a term is a sign, not an operation
    return !('+-'.includes(op) && (!before || '{(=,'.includes(before.at(-1))));
  }
  return false;
};
const startsWithOp = (right) => OPS.some((op) => right.trimStart().startsWith(op));

function bracket(math) {
  let out = '';
  let last = 0;
  let changed = false;
  for (const match of math.matchAll(SCI)) {
    let start = match.index;
    const end = start + match[0].length;
    const sign = match[1];
    // a minus between two terms is an operation and stays outside the brackets
    const before = math.slice(0, start).trimEnd();
    if (sign && before && !'={([,'.includes(before.at(-1)) && !endsWithOp(before)) start += sign.length;
    const left = math.slice(0, start).trimEnd();
    if (left.endsWith('(') || left.endsWith('\\left(')) continue;
    if (!(endsWithOp(math.slice(0, start)) || startsWithOp(math.slice(end)))) continue;
    out += math.slice(last, start) + '(' + math.slice(start, end) + ')';
    last = end;
    changed = true;
  }
  return changed ? out + math.slice(last) : null;
}

let total = 0;
for (const file of files) {
  const text = readFileSync(resolve(ROOT, file), 'utf8');
  const found = [];
  const next = text.replace(MATH, (whole, inline, display) => {
    const fixed = bracket(inline ?? display);
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
