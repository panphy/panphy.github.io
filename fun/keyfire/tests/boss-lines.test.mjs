import test from 'node:test';
import assert from 'node:assert/strict';
import { ALL_WORDS, BOSS_PHRASES, BOSS_STORIES, ROCK_UNITS } from '../src/question-bank.js';
import { bossPlan, bossFightOrder, beamChargeTime, BOSS_PLAN_TABLE, LONGEST_MONSTER_WORD, typedLength } from '../src/difficulty.js';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { buildSearchPrompt, escapeHtml, altTermFor, promptIndexForProgress } from '../src/prompt-utils.js';
import { createWordDeck } from '../src/word-decks.js';

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

test('every term too long for a monster ends a boss word stage somewhere', () => {
  const longTerms = ALL_WORDS.filter(entry => typedLength(entry) > LONGEST_MONSTER_WORD);
  assert.ok(longTerms.length >= 40);
  // The last boss takes any of them, and each earlier boss has plenty within its cap.
  assert.ok(longTerms.every(entry => typedLength(entry) <= bossPlan(10).longTerm));
  for (const row of BOSS_PLAN_TABLE) {
    const fitting = longTerms.filter(entry => typedLength(entry) <= row.longTerm);
    assert.ok(fitting.length >= row.stages.length * 6, `from step ${row.fromWave}: ${fitting.length} long terms`);
  }
  // Caps never fall from one boss to the next.
  const caps = BOSS_PLAN_TABLE.map(row => row.longTerm);
  assert.deepEqual(caps, [...caps].sort((a, b) => a - b));
});

// The game's own stage builder and line renderer, run outside the page.
function createStageHarness() {
  const source = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
  const slice = (from, to) => source.slice(source.indexOf(from), source.indexOf(to));
  const context = vm.createContext({
    ALL_WORDS, LONGEST_MONSTER_WORD, buildSearchPrompt, escapeHtml, altTermFor, promptIndexForProgress,
    monsterDeck: createWordDeck(), bossDeck: createWordDeck(), currentKeywordPool: () => ALL_WORDS,
    activeTarget: null, typedBuffer: '',
  });
  vm.runInContext(slice('function chooseBossWordStage(', 'function chooseBossStory(')
    + slice('function lineWords(', 'function setBossWord(')
    + slice('function bossWordProgress(', 'function createLifeMeter('), context);
  return context;
}

test('a word stage ends on a long term within the cap; a stage without a cap has none', () => {
  const context = createStageHarness();
  for (const row of BOSS_PLAN_TABLE) {
    const used = new Set();
    for (const count of row.stages) {
      const stage = context.chooseBossWordStage(count, used, row.longTerm);
      assert.equal(stage.entries.length, count);
      const lengths = stage.entries.map(typedLength);
      assert.ok(lengths.slice(0, -1).every(length => length <= 10), stage.term);
      assert.ok(lengths.at(-1) > LONGEST_MONSTER_WORD && lengths.at(-1) <= row.longTerm, stage.term);
    }
  }
  const core = context.chooseBossWordStage(1, new Set());
  assert.ok(typedLength(core.entries[0]) <= 10);
});

test('a long term shows whole and is typed word by word, one pip for the term', () => {
  const context = createStageHarness();
  const entries = [{ term: 'force' }, { term: 'specific heat capacity' }];
  const line = { kind: 'words', term: entries.map(entry => entry.term).join(' '), entries };
  const boss = { lineKind: 'words', bossLines: [line], lineIndex: 0, lineWordsList: context.lineWords(line), stageSlots: context.wordStageSlots(line), wordIndex: 0, searchPrompt: 'force' };
  const text = html => html.replace(/<span class="stage-pips">.*$/, '').replace(/<[^>]+>/g, '');
  const pipsDone = html => (html.match(/is-done/g) || []).length;
  assert.equal(text(context.buildBossLineHtml(boss)), 'force');
  // Second word of the term: "specific" is done, "heat" is in progress.
  Object.assign(boss, { wordIndex: 2, searchPrompt: 'heat' });
  context.activeTarget = boss;
  context.typedBuffer = 'he';
  const html = context.buildBossLineHtml(boss);
  assert.equal(text(html), 'specific heat capacity');
  assert.match(html, /<span class="typed">specific<\/span> <span class="current-word"><span class="typed">he<\/span><span class="remaining">at<\/span><\/span> <span class="remaining">capacity<\/span>/);
  assert.equal(pipsDone(html), 1);
  assert.equal((html.match(/<i /g) || []).length, 2);
  // Only the term's last word completes it.
  const slots = boss.stageSlots;
  assert.deepEqual(Array.from(slots, (slot, index) => index === slot.end - 1), [true, false, false, true]);
});
