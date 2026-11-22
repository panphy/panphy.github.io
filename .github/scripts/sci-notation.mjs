// Brackets for numbers in scientific notation in worked calculations, shared by check.mjs and the
// deck-audit skill's sci-brackets.mjs. A number a × 10^n inside \( \) or \[ \] math that is combined
// with another number by ×, ÷, + or − goes in brackets: (1.0 × 10⁵) × 2.0. A number that stands alone
// (a whole numerator or denominator, a given value, a result) stays bare, and a + or − that opens a
// term is the number's sign. Coefficients that are not plain numbers (4π × 10⁻⁷) are not matched.

export const MATH = /\\\(([\s\S]*?)\\\)|\\\[([\s\S]*?)\\\]/g;
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

// The math with its unbracketed numbers bracketed, or null if none needs it.
export function bracketScientific(math) {
  let out = '';
  let last = 0;
  for (const match of math.matchAll(SCI)) {
    let start = match.index;
    const end = start + match[0].length;
    // a minus between two terms is an operation and stays outside the brackets
    const before = math.slice(0, start).trimEnd();
    if (match[1] && before && !'={([,'.includes(before.at(-1)) && !endsWithOp(before)) start += match[1].length;
    const left = math.slice(0, start).trimEnd();
    if (left.endsWith('(') || left.endsWith('\\left(')) continue;
    if (!(endsWithOp(math.slice(0, start)) || startsWithOp(math.slice(end)))) continue;
    out += math.slice(last, start) + '(' + math.slice(start, end) + ')';
    last = end;
  }
  return last ? out + math.slice(last) : null;
}
