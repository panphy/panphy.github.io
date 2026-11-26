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

// What a character types: a-z and 0-9, in lower case. Accented letters are folded to
// their base letter and everything else (spaces, punctuation, symbols) types nothing.
function getInputCharacter(character) {
  const folded = character.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  return /^[a-z0-9]$/.test(folded) ? folded : '';
}

function buildSearchPrompt(term) {
  return [...term].map(getInputCharacter).join('');
}

function buildAltSearchPrompts(term) {
  const canonical = buildSearchPrompt(term);
  let variants = [''];
  // Build every combination, including repeated words and mixed UK/US spellings.
  for (const token of term.toLowerCase().split(/([a-z]+)/)) {
    const spellings = SPELLING_VARIANTS.get(token) || [token];
    variants = variants.flatMap(prefix => spellings.map(spelling => prefix + spelling));
  }
  const alts = new Set(variants.map(buildSearchPrompt));
  alts.delete(canonical);
  return [...alts];
}

// The term as the player is spelling it: the variant of `term` whose typed form is
// `searchPrompt` (center for centre, say), keeping its spaces, punctuation and capitals.
function altTermFor(term, searchPrompt) {
  let variants = [''];
  for (const token of term.split(/([a-z]+)/i)) {
    const spellings = (SPELLING_VARIANTS.get(token.toLowerCase()) || [token]).map(spelling => (
      /^[A-Z]/.test(token) ? spelling[0].toUpperCase() + spelling.slice(1) : spelling
    ));
    variants = variants.flatMap(prefix => spellings.map(spelling => prefix + spelling));
  }
  return variants.find(variant => buildSearchPrompt(variant) === searchPrompt) || term;
}

function escapeHtml(text) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// The index in `term` just past its first `progress` typeable characters.
function promptIndexForProgress(term, progress) {
  if (progress <= 0) return 0;

  let matched = 0;
  for (let index = 0; index < term.length; index += 1) {
    if (!getInputCharacter(term[index])) continue;
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
  const complete = matches.filter(enemy => enemy._matchComplete ?? enemy._matchedSearchPrompt === typed);
  const pool = complete.length > 0 ? complete : matches;
  return [...pool].sort(byDepth)[0];
}

export {
  pickTarget,
  getInputCharacter,
  buildSearchPrompt,
  buildAltSearchPrompts,
  altTermFor,
  escapeHtml,
  promptIndexForProgress,
};
