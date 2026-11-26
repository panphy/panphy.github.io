import test from 'node:test';
import assert from 'node:assert/strict';
import { BOSS_PHRASES, BOSS_STORIES, ROCK_UNITS } from '../src/question-bank.js';
import { bossPlan, bossFightOrder, beamChargeTime, BOSS_PLAN_TABLE } from '../src/difficulty.js';
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

test('a boss is word stages first, then statements, then a shielded core word or a story', () => {
  for (const row of BOSS_PLAN_TABLE) {
    assert.ok(row.stages.length >= 1 && row.stages.every(count => count >= 3 && count <= 5));
    assert.ok(row.finishers <= 2);
    assert.ok(row.story || row.finishers >= 1, 'every boss has a finishing blow');
    const kinds = bossFightOrder(row).map(step => step.kind);
    const rank = { words: 0, line: 1, core: 2, story: 3 };
    assert.deepEqual(kinds, [...kinds].sort((a, b) => rank[a] - rank[b]), kinds.join(' '));
  }
  assert.ok(bossPlan(10).story, 'the last boss ends with a story');
});

test('bosses one to four get harder, never easier, from wave to wave', () => {
  const rows = BOSS_PLAN_TABLE.filter(row => !row.story);
  for (let index = 1; index < rows.length; index += 1) {
    const before = rows[index - 1];
    const row = rows[index];
    const words = plan => plan.stages.reduce((sum, count) => sum + count, 0);
    assert.ok(words(row) >= words(before) && row.maxLetters >= before.maxLetters);
    assert.ok(row.attackGap <= before.attackGap && row.rockFlight <= before.rockFlight);
  }
});

test('the last boss changes weapon each stage instead of piling on words', () => {
  const plan = bossPlan(10);
  assert.deepEqual(bossFightOrder(plan).map(step => step.kind), ['words', 'line', 'core', 'story']);
  assert.ok(plan.satellites >= 2 && plan.satellites <= 3);
  // No single hit hurts more than the fourth boss's, and only the beam costs a whole heart.
  assert.ok(plan.rockDamage <= bossPlan(8).rockDamage);
  assert.ok(plan.beamDamage <= 2);
});

test('the beam gives time to type a story line at a modest pace', () => {
  const plan = bossPlan(10);
  for (const story of BOSS_STORIES) {
    for (const line of story.lines) {
      const letters = line.replace(/[^a-z]/gi, '').length;
      assert.ok(beamChargeTime(plan, letters) >= letters / 2.2 + 3, line);
    }
  }
  assert.equal(beamChargeTime(bossPlan(8), 30), Infinity, 'only the last boss charges a beam');
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

test('splitting comets have long units to start and one-letter units to split into', () => {
  const keys = ROCK_UNITS.map(entry => buildSearchPrompt(entry.term).toLowerCase());
  const firstsOf = list => new Set(list.map(key => key.charAt(0)));
  assert.ok(firstsOf(keys.filter(key => key.length >= 2)).size >= 3);
  assert.ok(firstsOf(keys.filter(key => key.length === 1)).size >= 5);
});
