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
  // Chance is 1 in 3 with two wrong options shown, 1 in 4 with three.
  assert.ok(longestShare(2) <= 0.4, `answer longest in ${(longestShare(2) * 100).toFixed(0)}% of 3-option sets`);
  assert.ok(longestShare(3) <= 0.32, `answer longest in ${(longestShare(3) * 100).toFixed(0)}% of 4-option sets`);
});

test('options fit the boss answer-length limits of the waves they can appear on', async () => {
  const { withinLength, bossAnswerLengthCap, EARLY_BOSS_WAVES } = await import('../src/difficulty.js');
  const earlyTerms = new Set([...withinLength(MEDIUM_WORDS, 14), ...EQUATION_WORDS].map(entry => entry.term));
  const earlyCap = bossAnswerLengthCap(EARLY_BOSS_WAVES);
  const lateCap = bossAnswerLengthCap(EARLY_BOSS_WAVES + 1);
  const problems = [];
  for (const { entry, set } of sets) {
    for (const option of [set.answer, ...set.wrong]) check(problems, typed(option).length <= lateCap, `"${option}" is over ${lateCap} letters in "${entry.term}"`);
    // Waves 1–2 show the answer and the first two wrong options.
    if (earlyTerms.has(entry.term)) {
      for (const option of [set.answer, ...set.wrong.slice(0, 2)]) check(problems, typed(option).length <= earlyCap, `"${option}" is over ${earlyCap} letters on early waves in "${entry.term}"`);
    }
  }
  assert.deepEqual(problems, []);
});
