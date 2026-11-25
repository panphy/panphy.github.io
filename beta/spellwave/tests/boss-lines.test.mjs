import test from 'node:test';
import assert from 'node:assert/strict';
import { BOSS_PHRASES, BOSS_STORIES, ROCK_UNITS } from '../src/question-bank.js';
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

test('every wave has enough statements short enough for its finishing blow', () => {
  for (let wave = 1; wave <= 10; wave += 1) {
    const plan = bossPlan(wave);
    const fitting = BOSS_PHRASES.filter(line => letters(line) <= plan.maxLetters);
    assert.ok(fitting.length >= Math.max(1, plan.finishers) * 6, `wave ${wave}: ${fitting.length} statements`);
  }
});

test('a boss is word stages first, then at most two statements or a story', () => {
  for (const row of BOSS_PLAN_TABLE) {
    assert.ok(row.stages.length >= 1 && row.stages.every(count => count >= 3 && count <= 5));
    assert.ok(row.finishers <= 2);
    assert.ok(row.story ? row.finishers === 0 : row.finishers >= 1);
  }
  assert.ok(bossPlan(10).story, 'the last boss ends with a story');
});

test('bosses get harder, never easier, from wave to wave', () => {
  for (let index = 1; index < BOSS_PLAN_TABLE.length; index += 1) {
    const before = BOSS_PLAN_TABLE[index - 1];
    const row = BOSS_PLAN_TABLE[index];
    const words = plan => plan.stages.reduce((sum, count) => sum + count, 0);
    assert.ok(words(row) >= words(before) && row.maxLetters >= before.maxLetters);
    assert.ok(row.attackGap <= before.attackGap && row.rockFlight <= before.rockFlight);
  }
});

test('every story is four short lines of plain words', () => {
  assert.ok(BOSS_STORIES.length >= 4);
  for (const story of BOSS_STORIES) {
    assert.ok(story.title);
    assert.equal(story.lines.length, 4, story.title);
    for (const line of story.lines) {
      assert.match(line, /^[A-Za-z]+( [A-Za-z]+)*$/, line);
      assert.ok(line.replace(/ /g, '').length <= 36, line);
    }
  }
});

test('there are rock units for many different first letters', () => {
  for (const { term } of ROCK_UNITS) assert.match(term, /^[A-Za-z]{1,3}$/, term);
  const firsts = new Set(ROCK_UNITS.map(entry => buildSearchPrompt(entry.term).charAt(0).toLowerCase()));
  assert.ok(firsts.size >= 8, [...firsts].join(''));
});
