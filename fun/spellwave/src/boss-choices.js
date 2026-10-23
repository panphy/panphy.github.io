// boss-choices.js — multiple-choice boss questions. Pure functions: no DOM, no
// game state. The options themselves are in boss-options.js.
import { BOSS_OPTIONS } from './boss-options.js?v=20261024-boss-flags';
import { buildSearchPrompt, buildAltSearchPrompts } from './prompt-utils.js?v=20261024-boss-flags';

const SUPERSCRIPTS = /[⁰¹²³⁴⁵⁶⁷⁸⁹]+/g;

// Waves 1–4 show two wrong options; from wave 5, and in the finale, three.
export function wrongOptionCount(wave) {
  return wave <= 4 ? 2 : 3;
}

function optionFor(text, isAnswer, isEquation) {
  const promptOptions = { multiplicationAlias: isEquation };
  const key = buildSearchPrompt(text, promptOptions);
  return { text, key, keys: [key, ...buildAltSearchPrompts(text, promptOptions)], isAnswer, struck: false };
}

// The answer and the wrong options a boss shows on this wave, in a fixed order
// (answer first). Returns null for an entry with no option set.
export function getBossChoice(entry, wave, options = BOSS_OPTIONS) {
  const set = options[entry.term];
  if (!set) return null;
  const isEquation = !!entry.isEquation;
  return {
    answer: optionFor(set.answer, true, isEquation),
    wrong: set.wrong.slice(0, wrongOptionCount(wave)).map(text => optionFor(text, false, isEquation)),
  };
}

// Every key a player could type at this boss, alternative spellings included.
export function choiceKeys(choice) {
  return [choice.answer, ...choice.wrong].flatMap(option => option.keys);
}

// True when a finished word could be read as the start of another one.
export function keysClash(keys, otherKeys) {
  return keys.some(key => otherKeys.some(other => key.startsWith(other) || other.startsWith(key)));
}

// The letters a player types to finish the boss's longest shown option: the
// answer plus the longest wrong option, so a miss still leaves time to retry.
export function choiceTypingLength(choice) {
  return choice.answer.key.length + Math.max(0, ...choice.wrong.map(option => option.key.length));
}

// The options in a random order for display.
export function shuffledOptions(choice, random = Math.random) {
  const list = [choice.answer, ...choice.wrong];
  for (let i = list.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}

// The line under the clue: the term with the answer replaced by one slot. A
// one-word answer is blanked wherever it appears (the transformer equations
// repeat theirs); a longer answer is one run of words. Superscripts after a
// hidden word stay visible.
export function buildChoiceSegments(term, answer) {
  const tokens = term.split(/(\s+)/).filter(token => token !== '');
  const keyOf = token => buildSearchPrompt(token.replace(SUPERSCRIPTS, ''));
  const answerKeys = answer.split(/\s+/).map(word => buildSearchPrompt(word));
  const wordIndices = tokens.map((token, i) => (/^\s+$/.test(token) ? -1 : i)).filter(i => i >= 0);
  const hidden = new Set();
  for (let start = 0; start + answerKeys.length <= wordIndices.length; start += 1) {
    const run = wordIndices.slice(start, start + answerKeys.length);
    if (run.every((tokenIndex, k) => keyOf(tokens[tokenIndex]) === answerKeys[k])) {
      for (let i = run[0]; i <= run.at(-1); i += 1) hidden.add(i);
      if (answerKeys.length > 1) break;
    }
  }
  // A hidden run (with the spaces inside it) becomes one slot.
  const segments = [];
  tokens.forEach((token, i) => {
    if (!hidden.has(i)) {
      segments.push({ type: 'text', text: token });
    } else if (hidden.has(i - 1)) {
      segments.at(-1).exponent = (token.match(SUPERSCRIPTS) || [''])[0];
    } else {
      segments.push({ type: 'slot', exponent: (token.match(SUPERSCRIPTS) || [''])[0] });
    }
  });
  return segments;
}
