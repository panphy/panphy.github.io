// Pure text/prompt utility functions — no DOM, no game state, no THREE dependency.

const SPELLING_ALTS = [
  ['colour', 'color'],
  ['centre', 'center'],
  ['metre', 'meter'],
  ['litre', 'liter'],
  ['fibre', 'fiber'],
  ['ionise', 'ionize'],
  ['ionising', 'ionizing'],
  ['ionising', 'ionization'],
  ['magnetise', 'magnetize'],
  ['analyse', 'analyze'],
  ['polarise', 'polarize'],
];

const SUPERSCRIPT_MAP = { '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4', '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9' };
const MATH_OPERATOR_INPUTS = new Set(['*', '+', '-', '=', '/', '×', 'x', 'X']);

const SUPERSCRIPT_DIGITS = '⁰¹²³⁴⁵⁶⁷⁸⁹';
const LOW_VALUE_ANSWER_WORDS = new Set([
  'a',
  'an',
  'and',
  'as',
  'by',
  'for',
  'from',
  'in',
  'of',
  'on',
  'or',
  'per',
  'the',
  'to',
  'with',
]);

const LONG_VOCAB_LIMIT_LENGTH = 16;

function normalizeCharacter(character, options = {}) {
  if (/\s/.test(character)) return '';
  if (SUPERSCRIPT_MAP[character]) return SUPERSCRIPT_MAP[character];
  const normalized = character.toLowerCase();
  if (normalized === '×') return options.multiplicationAlias ? 'x' : '';
  if (normalized === '*') return options.multiplicationAlias ? 'x' : '';
  return /^[a-z0-9=+\-*/.]$/.test(normalized) ? normalized : '';
}

function isWordToken(token) {
  return /[a-z]/i.test(token);
}

function getAnswerTokenText(token) {
  return token.replace(new RegExp(`[${SUPERSCRIPT_DIGITS}]+`, 'g'), '');
}

function getTokenExponent(token) {
  const match = token.match(new RegExp(`([${SUPERSCRIPT_DIGITS}]+)$`));
  return match ? match[1] : '';
}

function isLowValueAnswerToken(token) {
  return LOW_VALUE_ANSWER_WORDS.has(token.toLowerCase().replace(/[^a-z]/g, ''));
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
  const lower = term.toLowerCase();
  const alts = new Set();
  for (const [a, b] of SPELLING_ALTS) {
    for (const [from, to] of [[a, b], [b, a]]) {
      if (lower.includes(from)) {
        const alt = buildSearchPrompt(lower.replace(from, to), options);
        if (alt !== canonical) alts.add(alt);
      }
    }
  }
  return [...alts];
}

function buildHintMask(term, options = {}) {
  const getCount = () => {
    if (options.hintRange) {
      const { min, max } = options.hintRange;
      return Math.floor(Math.random() * (max - min + 1)) + min;
    }
    return Math.max(1, Math.floor(options.leadingTypeableCount || 1));
  };

  return term.replace(/\S+/g, word => {
    const currentLimit = getCount();
    let hasTypeable = false;
    for (const ch of word) if (normalizeCharacter(ch, options)) { hasTypeable = true; break; }
    if (!hasTypeable) return word;
    let result = '';
    let revealedTypeable = 0;
    for (const ch of word) {
      if (!normalizeCharacter(ch, options)) { result += ch; }
      else if (revealedTypeable < currentLimit) { result += ch; revealedTypeable += 1; }
      else { result += '_'; }
    }
    return result;
  });
}

function getBossQuestionHintRange() {
  return { min: 3, max: 3 };
}

function escapeHtml(text) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function wrapSups(text) {
  return text.replace(new RegExp(`[${SUPERSCRIPT_DIGITS}]+`, 'g'), match => `<sup class="given-sup">${match}</sup>`);
}

function buildHintPart(text, options = {}) {
  const leadingTypeableCount = Math.max(1, Math.floor(options.leadingTypeableCount || 1));
  let result = '';
  let revealedTypeable = 0;
  for (const ch of text) {
    if (!normalizeCharacter(ch, options)) { result += ch; }
    else if (revealedTypeable < leadingTypeableCount) { result += ch; revealedTypeable += 1; }
    else { result += '_'; }
  }
  return result;
}

function buildTwoWordLimit(term, options = {}) {
  const tokens = term.split(/(\s+)/);
  const typeableIndices = [];
  for (let i = 0; i < tokens.length; i++) {
    if (/^\s+$/.test(tokens[i])) continue;
    const answerText = getAnswerTokenText(tokens[i]);
    if (isWordToken(answerText) && !isLowValueAnswerToken(answerText) && buildSearchPrompt(answerText, options)) {
      typeableIndices.push(i);
    }
  }
  if (typeableIndices.length === 0) return null;
  const hasSkippedAnswerWord = tokens.some((token, index) => {
    if (/^\s+$/.test(token)) return false;
    return isWordToken(getAnswerTokenText(token)) && !typeableIndices.includes(index);
  });
  if (typeableIndices.length <= 2 && !options.alwaysLimit && !hasSkippedAnswerWord) return null;

  const shuffled = [...typeableIndices];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  const maxHiddenWords = Number.isFinite(options.maxHiddenWords)
    ? Math.max(1, Math.floor(options.maxHiddenWords))
    : 2;
  const hiddenSet = new Set(shuffled.slice(0, Math.min(maxHiddenWords, shuffled.length)));

  const parts = tokens.map((tok, i) => {
    const isWhitespace = /^\s+$/.test(tok);
    const hidden = hiddenSet.has(i);
    const answerText = hidden ? getAnswerTokenText(tok) : tok;
    return {
      text: tok,
      answerText,
      exponentText: hidden ? getTokenExponent(tok) : '',
      isWhitespace,
      isGiven: typeableIndices.includes(i) && !hidden,
      isHidden: hidden,
    };
  });

  const hiddenTexts = parts.filter(part => part.isHidden).map(part => part.answerText);
  const hiddenSearch = hiddenTexts.map(text => buildSearchPrompt(text, options)).join('');
  return {
    parts,
    searchPrompt: hiddenSearch,
    altSearchPrompts: buildAltSearchPrompts(hiddenTexts.join(' '), options),
  };
}

function shouldUseVocabularyPromptLimit(term) {
  const searchLength = buildSearchPrompt(term).length;
  if (searchLength < LONG_VOCAB_LIMIT_LENGTH) return false;
  const typeableWords = term.split(/\s+/).filter((word) => {
    const answerText = getAnswerTokenText(word);
    return isWordToken(answerText)
      && !isLowValueAnswerToken(answerText)
      && buildSearchPrompt(answerText).length > 0;
  });
  return typeableWords.length >= 2;
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

export {
  getInputCharacters,
  isMathOperatorInput,
  buildSearchPrompt,
  buildAltSearchPrompts,
  buildHintMask,
  getBossQuestionHintRange,
  escapeHtml,
  wrapSups,
  buildHintPart,
  buildTwoWordLimit,
  shouldUseVocabularyPromptLimit,
  promptIndexForProgress,
};
