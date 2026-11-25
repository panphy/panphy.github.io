import test from 'node:test';
import assert from 'node:assert/strict';
import { BOSS_PHRASES, ROCK_UNITS } from '../src/question-bank.js';
import { bossPlan, BOSS_PLAN_TABLE } from '../src/difficulty.js';
import { buildSearchPrompt } from '../src/prompt-utils.js';

const letters = line => line.term.replace(/[^a-z]/gi, '').length;

test('every boss line is plain words, each one typeable', () => {
  for (const line of BOSS_PHRASES) {
    assert.match(line.term, /^[a-z]+( [a-z]+)*$/, line.term);
    assert.ok(line.topic, `${line.term} has a topic`);
    for (const word of line.term.split(' ')) assert.ok(buildSearchPrompt(word).length > 0, word);
  }
  assert.equal(new Set(BOSS_PHRASES.map(line => line.term)).size, BOSS_PHRASES.length, 'no repeated lines');
});

test('every wave has enough lines short enough for its boss', () => {
  for (let wave = 1; wave <= 10; wave += 1) {
    const plan = bossPlan(wave);
    const fitting = BOSS_PHRASES.filter(line => letters(line) <= plan.maxLetters);
    assert.ok(fitting.length >= plan.lines * 3, `wave ${wave}: ${fitting.length} lines for ${plan.lines}`);
  }
});

test('bosses get harder, never easier, from wave to wave', () => {
  for (let index = 1; index < BOSS_PLAN_TABLE.length; index += 1) {
    const before = BOSS_PLAN_TABLE[index - 1];
    const row = BOSS_PLAN_TABLE[index];
    assert.ok(row.lines >= before.lines && row.maxLetters >= before.maxLetters);
    assert.ok(row.attackGap <= before.attackGap && row.rockFlight <= before.rockFlight);
  }
});

test('there are rock units for many different first letters', () => {
  for (const { term } of ROCK_UNITS) assert.match(term, /^[A-Za-z]{1,3}$/, term);
  const firsts = new Set(ROCK_UNITS.map(entry => buildSearchPrompt(entry.term).charAt(0).toLowerCase()));
  assert.ok(firsts.size >= 8, [...firsts].join(''));
});
