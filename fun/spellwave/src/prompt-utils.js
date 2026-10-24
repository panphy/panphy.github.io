// Pure text/prompt utility functions — no DOM, no game state, no THREE dependency.

const SPELLING_ALTS = [
  ['colour', 'color'],
  ['colours', 'colors'],
  ['coloured', 'colored'],
  ['colouring', 'coloring'],
  ['centre', 'center'],
  ['centres', 'centers'],
  ['centred', 'centered'],
  ['centring', 'centering'],
  ...['', 'kilo', 'centi', 'milli', 'micro', 'nano', 'pico', 'femto'].flatMap(prefix => [
    [`${prefix}metre`, `${prefix}meter`],
    [`${prefix}metres`, `${prefix}meters`],
  ]),
  ...['', 'milli', 'micro', 'centi', 'deci', 'kilo'].flatMap(prefix => [
    [`${prefix}litre`, `${prefix}liter`],
    [`${prefix}litres`, `${prefix}liters`],
  ]),
  ['fibre', 'fiber'],
  ['fibres', 'fibers'],
  ['ionise', 'ionize'],
  ['ionised', 'ionized'],
  ['ionising', 'ionizing'],
  ['ionisation', 'ionization'],
  ['magnetise', 'magnetize'],
  ['magnetised', 'magnetized'],
  ['magnetising', 'magnetizing'],
  ['analyse', 'analyze'],
  ['analysed', 'analyzed'],
  ['analysing', 'analyzing'],
  ['polarise', 'polarize'],
  ['polarised', 'polarized'],
  ['polarising', 'polarizing'],
  ['polarisation', 'polarization'],
  ['magnetisation', 'magnetization'],
  ['neutralise', 'neutralize'],
  ['neutralised', 'neutralized'],
  ['neutralising', 'neutralizing'],
  ['neutralisation', 'neutralization'],
  ['vapourise', 'vaporise', 'vaporize'],
  ['vaporisation', 'vaporization'],
  ['travelled', 'traveled'],
  ['travelling', 'traveling'],
  ['modelled', 'modeled'],
  ['modelling', 'modeling'],
  ['behaviour', 'behavior'],
  ['defence', 'defense'],
  ['aluminium', 'aluminum'],
  ['sulphur', 'sulfur'],
  ['grey', 'gray'],
];

// Match complete words: a measuring device such as "ammeter" keeps its spelling.
const SPELLING_VARIANTS = new Map(SPELLING_ALTS.flatMap(group => group.map(word => [word, group])));

const SUPERSCRIPT_MAP = { '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4', '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9' };
const MATH_OPERATOR_INPUTS = new Set(['*', '+', '-', '=', '/', '×', 'x', 'X']);

const SUPERSCRIPT_DIGITS = '⁰¹²³⁴⁵⁶⁷⁸⁹';
// Typeable characters are a-z, 0-9 and = + - * / . ; accented letters are folded
// to their base letter and everything else (spaces, punctuation, symbols) is skipped.
function normalizeCharacter(character, options = {}) {
  if (/\s/.test(character)) return '';
  if (SUPERSCRIPT_MAP[character]) return SUPERSCRIPT_MAP[character];
  const normalized = character.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  if (normalized === '×') return options.multiplicationAlias ? 'x' : '';
  if (normalized === '*') return options.multiplicationAlias ? 'x' : '';
  return /^[a-z0-9=+\-*/.]$/.test(normalized) ? normalized : '';
}

function getInputCharacters(character) {
  const inputs = [];
  const base = normalizeCharacter(character);
  const alias = normalizeCharacter(character, { multiplicationAlias: true });
  if (base) inputs.push({ value: base, equationOnly: false });
  if (alias && alias !== base) inputs.push({ value: alias, equationOnly: true });
  return inputs;
}

function isMathOperatorInput(character) {
  return MATH_OPERATOR_INPUTS.has(character);
}

function buildSearchPrompt(term, options = {}) {
  return [...term].map(character => normalizeCharacter(character, options)).join('');
}

function buildAltSearchPrompts(term, options = {}) {
  const canonical = buildSearchPrompt(term, options);
  let variants = [''];
  // Build every combination, including repeated words and mixed UK/US spellings.
  for (const token of term.toLowerCase().split(/([a-z]+)/)) {
    const spellings = SPELLING_VARIANTS.get(token) || [token];
    variants = variants.flatMap(prefix => spellings.map(spelling => prefix + spelling));
  }
  const alts = new Set(variants.map(variant => buildSearchPrompt(variant, options)));
  alts.delete(canonical);
  return [...alts];
}

function escapeHtml(text) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function wrapSups(text) {
  return text.replace(new RegExp(`[${SUPERSCRIPT_DIGITS}]+`, 'g'), match => `<sup class="given-sup">${match}</sup>`);
}

function promptIndexForProgress(term, progress, options = {}) {
  if (progress <= 0) return 0;

  let matched = 0;
  for (let index = 0; index < term.length; index += 1) {
    if (!normalizeCharacter(term[index], options)) continue;
    matched += 1;
    if (matched >= progress) return index + 1;
  }

  return term.length;
}

// Choose which enemy a typed prefix applies to. A target whose prompt is exactly
// complete always wins, so a short word can't be blocked by a nearer, longer word
// that merely starts the same way. Otherwise prefer the nearest (largest z).
function pickTarget(matches, typed) {
  const byDepth = (a, b) => b.group.position.z - a.group.position.z || a.searchPrompt.length - b.searchPrompt.length;
  const complete = matches.filter(enemy => enemy._matchedSearchPrompt === typed);
  const pool = complete.length > 0 ? complete : matches;
  return [...pool].sort(byDepth)[0];
}

export {
  pickTarget,
  getInputCharacters,
  isMathOperatorInput,
  buildSearchPrompt,
  buildAltSearchPrompts,
  escapeHtml,
  wrapSups,
  promptIndexForProgress,
};
