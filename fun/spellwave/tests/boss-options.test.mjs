import test from 'node:test';
import assert from 'node:assert/strict';
import { BOSS_OPTIONS } from '../src/boss-options.js';
import { MEDIUM_WORDS, HARD_WORDS, EQUATION_WORDS } from '../src/question-bank.js';

const BOSS_ENTRIES = [...MEDIUM_WORDS, ...HARD_WORDS, ...EQUATION_WORDS].filter(entry => !entry.noBoss);

// What the player types: letters only, lower case.
const typed = text => text.toLowerCase().replace(/[^a-z]/g, '');
// Words as plain stems, so "neutrons" matches "neutron".
const words = text => text.toLowerCase().split(/[^a-z']+/).map(word => word.replace(/'s?$/, '').replace(/s$/, '')).filter(Boolean);
const containsRun = (haystack, needle) => haystack.some((_, start) => needle.every((word, i) => haystack[start + i] === word));

const check = (problems, ok, message) => { if (!ok) problems.push(message); };

const sets = BOSS_ENTRIES.map(entry => ({ entry, set: BOSS_OPTIONS[entry.term] }));

test('every boss entry has exactly one option set', () => {
  for (const { entry, set } of sets) assert.ok(set, `no options for "${entry.term}"`);
  const terms = new Set(BOSS_ENTRIES.map(entry => entry.term));
  for (const key of Object.keys(BOSS_OPTIONS)) assert.ok(terms.has(key), `options for unknown term "${key}"`);
});

test('each set has an answer from the term and three different wrong options', () => {
  const problems = [];
  for (const { entry, set } of sets) {
    check(problems, set.wrong.length === 3, `${entry.term} needs three wrong options`);
    check(problems, containsRun(words(entry.term), words(set.answer)), `"${set.answer}" is not in "${entry.term}"`);
    const all = [set.answer, ...set.wrong].map(typed);
    check(problems, new Set(all).size === all.length, `repeated option in "${entry.term}"`);
  }
  assert.deepEqual(problems, []);
});

test('no option starts another, so a finished word is never ambiguous', () => {
  const problems = [];
  for (const { entry, set } of sets) {
    const all = [set.answer, ...set.wrong].map(typed);
    for (const a of all) for (const b of all) {
      if (a !== b) check(problems, !b.startsWith(a), `"${a}" starts "${b}" in "${entry.term}"`);
    }
  }
  assert.deepEqual(problems, []);
});

test('no wrong option is printed in the clue or elsewhere in the line', () => {
  const problems = [];
  for (const { entry, set } of sets) {
    const clue = words(entry.definition);
    const termWords = words(entry.term);
    const answerWords = new Set(words(set.answer));
    const restOfLine = termWords.filter(word => !answerWords.has(word));
    for (const option of set.wrong) {
      const optionWords = words(option);
      check(problems, !containsRun(clue, optionWords), `"${option}" is printed in the clue of "${entry.term}"`);
      check(problems, !containsRun(restOfLine, optionWords), `"${option}" is printed in the line of "${entry.term}"`);
    }
    check(problems, !containsRun(clue, words(set.answer)), `the answer is printed in the clue of "${entry.term}"`);
  }
  assert.deepEqual(problems, []);
});

test('the answer is not the longest option much more often than chance', () => {
  const longestShare = shown => sets.filter(({ set }) => {
    const answer = typed(set.answer).length;
    return set.wrong.slice(0, shown).every(option => typed(option).length < answer);
  }).length / sets.length;
  // Chance is 1 in 2 with one wrong option shown, 1 in 3 with two.
  assert.ok(longestShare(1) <= 0.55, `answer longest in ${(longestShare(1) * 100).toFixed(0)}% of 2-option sets`);
  assert.ok(longestShare(2) <= 0.4, `answer longest in ${(longestShare(2) * 100).toFixed(0)}% of 3-option sets`);
});

test('options fit the boss answer-length limits of the waves they can appear on', async () => {
  const { withinLength, bossAnswerLengthCap, EARLY_BOSS_WAVES } = await import('../src/difficulty.js');
  const earlyTerms = new Set([...withinLength(MEDIUM_WORDS, 14), ...EQUATION_WORDS].map(entry => entry.term));
  const earlyCap = bossAnswerLengthCap(EARLY_BOSS_WAVES);
  const lateCap = bossAnswerLengthCap(EARLY_BOSS_WAVES + 1);
  const problems = [];
  for (const { entry, set } of sets) {
    for (const option of [set.answer, ...set.wrong]) check(problems, typed(option).length <= lateCap, `"${option}" is over ${lateCap} letters in "${entry.term}"`);
    // Waves 1–2 show the answer and the first wrong option.
    if (earlyTerms.has(entry.term)) {
      for (const option of [set.answer, set.wrong[0]]) check(problems, typed(option).length <= earlyCap, `"${option}" is over ${earlyCap} letters on early waves in "${entry.term}"`);
    }
  }
  assert.deepEqual(problems, []);
});

test('a boss shows one wrong option on waves 1–3 and two from wave 4', async () => {
  const { getBossChoice } = await import('../src/boss-choices.js');
  for (const { entry } of sets) {
    for (const wave of [1, 3]) assert.equal(getBossChoice(entry, wave).wrong.length, 1, entry.term);
    for (const wave of [4, 10]) assert.equal(getBossChoice(entry, wave).wrong.length, 2, entry.term);
  }
});

test('every boss line hides its answer in one slot per place it appears', async () => {
  const { buildChoiceSegments } = await import('../src/boss-choices.js');
  const problems = [];
  for (const { entry, set } of sets) {
    const segments = buildChoiceSegments(entry.term, set.answer);
    const shownWords = words(segments.filter(segment => segment.type === 'text').map(segment => segment.text).join(' '));
    const answerWords = words(set.answer);
    check(problems, segments.some(segment => segment.type === 'slot'), `no slot in "${entry.term}"`);
    check(problems, answerWords.length > 1 || !shownWords.includes(answerWords[0]), `answer still shown in "${entry.term}"`);
  }
  assert.deepEqual(problems, []);
  const turns = buildChoiceSegments('primary potential difference / secondary potential difference = primary turns / secondary turns', 'turns');
  assert.equal(turns.filter(segment => segment.type === 'slot').length, 2);
  const whole = buildChoiceSegments('nuclear fission', 'nuclear fission');
  assert.deepEqual(whole, [{ type: 'slot', exponent: '' }]);
});
