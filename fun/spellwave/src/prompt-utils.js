// Pure text/prompt utility functions — no DOM, no game state, no THREE dependency.

const SPELLING_ALTS = [
  ['colour', 'color'],
  ['centre', 'center'],
  ['metre', 'meter'],
  ['litre', 'liter'],
  ['fibre', 'fiber'],
  ['ionise', 'ionize'],
  ['ionising', 'ionizing'],
  ['ionisation', 'ionization'],
  ['magnetise', 'magnetize'],
  ['analyse', 'analyze'],
  ['polarise', 'polarize'],
  ['polarisation', 'polarization'],
  ['magnetisation', 'magnetization'],
  ['neutralise', 'neutralize'],
  ['vapourise', 'vaporize'],
  ['vaporisation', 'vaporization'],
  ['travelled', 'traveled'],
  ['aluminium', 'aluminum'],
  ['sulphur', 'sulfur'],
  ['grey', 'gray'],
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

// A boss's hidden word always keeps at least one blank, so a short word such as
// "non" still reads as part of the answer.
function buildBossHintPart(text, options = {}) {
  const typeable = buildSearchPrompt(text, options).length;
  const leadingTypeableCount = Math.min(options.leadingTypeableCount || 1, Math.max(1, typeable - 1));
  return buildHintPart(text, { ...options, leadingTypeableCount });
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

// Equation wording that names no quantity, so it is never the word asked for.
const EQUATION_FILLER_WORDS = new Set([
  'change', 'done', 'final', 'initial', 'input', 'output', 'taken', 'total',
  'transfer', 'transferred', 'travelled', 'useful',
]);
const SHORT_ANSWER_LENGTH = 5;

function getAnswerWordKey(token) {
  return buildSearchPrompt(getAnswerTokenText(token));
}

// How many terms each content word appears in. A word shared by many terms
// ("energy", "Newton's") tells fewer of them apart than one used once.
function countAnswerWords(entries) {
  const counts = new Map();
  for (const { term } of entries) {
    const keys = new Set(term.split(/\s+/).filter(isWordToken).map(getAnswerWordKey));
    for (const key of keys) counts.set(key, (counts.get(key) || 0) + 1);
  }
  return counts;
}

// Keep the full phrase visible and hide the word that identifies it: the rarest
// content word in the bank, preferring words of five letters or more, then the
// longest. options.ask names the hidden word or words explicitly instead.
function buildBossPrompt(term, options = {}) {
  const maxAnswerLength = options.maxAnswerLength ?? 16;
  const parts = term.split(/(\s+)/).filter(token => token !== '').map(token => ({
    text: token,
    answerText: token,
    exponentText: '',
    isWhitespace: /^\s+$/.test(token),
    isGiven: false,
    isHidden: false,
  }));
  const candidates = parts.filter((part) => {
    if (part.isWhitespace) return false;
    const answerText = getAnswerTokenText(part.text);
    return isWordToken(answerText) && !isLowValueAnswerToken(answerText) && getAnswerWordKey(part.text).length > 0;
  });
  const keyOf = part => getAnswerWordKey(part.text);
  const answerLength = chosen => chosen.reduce((sum, part) => sum + keyOf(part).length, 0);

  let chosen = [];
  if (options.ask) {
    for (const word of options.ask.split(/\s+/)) {
      const match = candidates.find(part => !chosen.includes(part) && keyOf(part) === getAnswerWordKey(word));
      if (match) chosen.push(match);
    }
    if (answerLength(chosen) > maxAnswerLength) chosen = [];
  }
  if (chosen.length === 0) {
    const fitting = candidates.filter(part => keyOf(part).length <= maxAnswerLength);
    const repeats = key => candidates.filter(part => keyOf(part) === key).length > 1;
    const unprinted = fitting.filter(part => !options.avoidWords?.has(keyOf(part)));
    const distinctive = unprinted.filter(part => keyOf(part).length > 2 && !repeats(keyOf(part)));
    const pool = [distinctive, unprinted, fitting].find(list => list.length > 0) || [];
    const count = part => options.wordCounts?.get(keyOf(part)) ?? 1;
    const isShort = part => keyOf(part).length < SHORT_ANSWER_LENGTH;
    const best = [...pool].sort((a, b) => isShort(a) - isShort(b)
      || count(a) - count(b)
      || keyOf(b).length - keyOf(a).length)[0];
    if (best) chosen = [best];
  }
  if (chosen.length === 0) return null;

  for (const part of parts) {
    part.isHidden = chosen.includes(part);
    part.isGiven = !part.isWhitespace && !part.isHidden;
    part.answerText = part.isHidden ? getAnswerTokenText(part.text) : part.text;
    part.exponentText = part.isHidden ? getTokenExponent(part.text) : '';
  }
  const hiddenTexts = parts.filter(part => part.isHidden).map(part => part.answerText);
  return {
    parts,
    searchPrompt: hiddenTexts.map(text => buildSearchPrompt(text, options)).join(''),
    altSearchPrompts: buildAltSearchPrompts(hiddenTexts.join(' '), options),
  };
}

// Boss questions for a bank: vocabulary and equations are counted separately,
// and an equation never asks for a word that its symbol clue already prints.
function createBossQuestionBuilder(vocabularyEntries, equationEntries) {
  const vocabularyCounts = countAnswerWords(vocabularyEntries);
  const equationCounts = countAnswerWords(equationEntries);
  return (entry, maxAnswerLength) => {
    const isEquation = !!entry.isEquation;
    const clueWords = isEquation ? (entry.definition || '').toLowerCase().split(/[^a-z]+/) : [];
    return buildBossPrompt(entry.term, {
      multiplicationAlias: isEquation,
      maxAnswerLength,
      ask: entry.ask,
      wordCounts: isEquation ? equationCounts : vocabularyCounts,
      avoidWords: isEquation ? new Set([...EQUATION_FILLER_WORDS, ...clueWords]) : null,
    });
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
  buildHintMask,
  escapeHtml,
  wrapSups,
  buildHintPart,
  buildBossHintPart,
  buildTwoWordLimit,
  buildBossPrompt,
  countAnswerWords,
  createBossQuestionBuilder,
  shouldUseVocabularyPromptLimit,
  promptIndexForProgress,
};
