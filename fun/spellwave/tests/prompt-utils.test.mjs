import test from 'node:test';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {
  pickTarget, buildSearchPrompt, buildAltSearchPrompts,
  getInputCharacters, isMathOperatorInput, promptIndexForProgress,
} from '../src/prompt-utils.js';
import { ALL_WORDS, EQUATION_WORDS, MEDIUM_WORDS, HARD_WORDS, EASY_WORDS } from '../src/question-bank.js';
import { getBossChoice, choiceKeys, keysClash } from '../src/boss-choices.js';

const enemy = (searchPrompt, z, matched = searchPrompt) => ({
  searchPrompt, _matchedSearchPrompt: matched, group: { position: { z } },
});

test('pickTarget prefers an exactly completed word over a nearer longer one', () => {
  const short = enemy('power', -30);
  const long = enemy('powerworkdone', -10);
  assert.equal(pickTarget([long, short], 'power'), short);
});

test('pickTarget falls back to the nearest match', () => {
  const far = enemy('force', -30);
  const near = enemy('forcefield', -10);
  assert.equal(pickTarget([far, near], 'for'), near);
});

test('search prompts skip spaces and punctuation, fold accents, map superscripts', () => {
  assert.equal(buildSearchPrompt("Hooke's law"), 'hookeslaw');
  assert.equal(buildSearchPrompt('café'), 'cafe');
  assert.equal(buildSearchPrompt('speed²'), 'speed2');
});

test('× types as x only for equations', () => {
  assert.deepEqual(getInputCharacters('×').map(i => i.value), ['x']);
  assert.equal(getInputCharacters('×')[0].equationOnly, true);
});

test('British/American spelling alternatives', () => {
  assert.deepEqual(buildAltSearchPrompts('centre of mass'), ['centerofmass']);
  assert.deepEqual(buildAltSearchPrompts('ionising radiation'), ['ionizingradiation']);
  assert.deepEqual(buildAltSearchPrompts('aluminium'), ['aluminum']);
  assert.deepEqual(buildAltSearchPrompts('distance travelled'), ['distancetraveled']);
});

test('spelling alternatives work in either direction and combine across a phrase', () => {
  for (const [british, american] of [
    ['colour filter', 'color filter'],
    ['centre of mass', 'center of mass'],
    ['ionising radiation', 'ionizing radiation'],
    ['vaporisation', 'vaporization'],
    ['travelling', 'traveling'],
    ['millimetres', 'millimeters'],
    ['litres', 'liters'],
    ['aluminium', 'aluminum'],
    ['sulphur', 'sulfur'],
  ]) {
    assert.ok(buildAltSearchPrompts(british).includes(buildSearchPrompt(american)), british);
    assert.ok(buildAltSearchPrompts(american).includes(buildSearchPrompt(british)), american);
  }
  assert.deepEqual(new Set(buildAltSearchPrompts('colour colour centre')), new Set([
    'colourcolourcenter', 'colourcolorcentre', 'colourcolorcenter',
    'colorcolourcentre', 'colorcolourcenter', 'colorcolorcentre', 'colorcolorcenter',
  ]));
  assert.ok(buildAltSearchPrompts('colour = metre × litre', { multiplicationAlias: true }).includes('color=meterxliter'));
});

test('spelling alternatives preserve measuring instruments and other unrelated words', () => {
  for (const word of ['ammeter', 'voltmeter', 'seismometer', 'thermometer', 'parameters', 'centripetal']) {
    assert.deepEqual(buildAltSearchPrompts(word), [], word);
  }
});

test('promptIndexForProgress maps typed count onto the displayed text', () => {
  assert.equal(promptIndexForProgress('a b', 2), 3);
});

test('every question-bank term is typeable and unique', () => {
  const seen = new Set();
  for (const { term } of [...ALL_WORDS, ...EQUATION_WORDS]) {
    assert.ok(buildSearchPrompt(term, { multiplicationAlias: true }).length > 0, term);
    assert.ok(!seen.has(term), `duplicate term: ${term}`);
    seen.add(term);
    const leftover = [...term].filter(ch => !/[a-z0-9\s'=+\-*/.×²³−°½]/i.test(ch));
    assert.deepEqual(leftover, [], `untypeable, unexpected characters in "${term}"`);
  }
});

const mainSource = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
const mainSlice = (from, to) => mainSource.slice(mainSource.indexOf(from), mainSource.indexOf(to));

// The boss-choosing code from main.js, run against the real word bank.
function createBossChoiceContext(extra = {}) {
  const context = vm.createContext({
    MEDIUM_WORDS, HARD_WORDS, EQUATION_WORDS, EASY_WORDS, BOSSES_PER_WAVE: 3, waveSet: 1, Math,
    getBossChoice, choiceKeys, keysClash, buildSearchPrompt,
    hardBossShare: wave => (wave >= 5 ? 0.7 : null),
    bossWordLengthCap: wave => (wave <= 2 ? 14 : Infinity),
    normalPromptLengthCap: () => 14,
    withinLength: (entries, cap) => entries.filter(entry => buildSearchPrompt(entry.term).length <= cap),
    enemies: [], bossWordsThisSet: [],
    ...extra,
  });
  vm.runInContext(mainSlice('function chooseBossWordsForWave()', 'function chooseBossPool()')
    + mainSlice('function chooseBossPool()', 'function choosePrompt()')
    + mainSlice('function chooseMedicPrompt()', 'function refreshWaveBossOrder(')
    + mainSlice('function chooseMimicPrompt()', 'function getMimicCountForWave(')
    + mainSlice('function chooseBossWord()', 'function startWaveCleared()')
    + mainSlice('function enemyTypeableKeys(enemy)', 'function isWrongChoiceKey('), context);
  return context;
}

// What a live boss offers to the typing code.
function liveBoss(entry, wave) {
  const choice = getBossChoice(entry, wave);
  return { prompt: entry.term, dying: false, isBoss: true, choiceOptions: [choice.answer, ...choice.wrong] };
}

test('no option of one boss in a wave starts an option of another', () => {
  const context = createBossChoiceContext();
  const vocabulary = Array(10).fill(0);
  const hard = Array(10).fill(0);
  for (context.waveSet = 1; context.waveSet <= 9; context.waveSet += 1) {
    for (let run = 0; run < 400; run += 1) {
      const bosses = vm.runInContext('chooseBossWordsForWave()', context);
      assert.equal(bosses.length, 3);
      assert.equal(bosses.filter(boss => boss.isEquation).length, 1);
      assert.ok(bosses.every(boss => !boss.noBoss));
      vocabulary[context.waveSet] += 2;
      hard[context.waveSet] += bosses.filter(boss => HARD_WORDS.includes(boss)).length;
      const keys = bosses.map(boss => choiceKeys(getBossChoice(boss, context.waveSet)));
      keys.forEach((own, i) => keys.forEach((other, j) => {
        if (i !== j) assert.ok(!keysClash(own, other), `${bosses[i].term} / ${bosses[j].term}`);
      }));
    }
  }
  // Hard bosses: none on waves 1–2, the minority on 3–4, the majority from wave 5.
  const share = wave => hard[wave] / vocabulary[wave];
  assert.equal(share(1) + share(2), 0);
  assert.ok(share(3) > 0.25 && share(4) < 0.5, `${share(3)}, ${share(4)}`);
  for (let wave = 5; wave <= 9; wave += 1) assert.ok(share(wave) > 0.6 && share(wave) < 0.8, `wave ${wave}: ${share(wave)}`);
});

test('finale bosses, healers and chests never clash with the options on screen', () => {
  const context = createBossChoiceContext({ waveSet: 10 });
  for (let run = 0; run < 300; run += 1) {
    context.enemies = [];
    context.bossWordsThisSet = [];
    for (let spawn = 0; spawn < 10; spawn += 1) {
      // Up to four bosses alive at once, plus a healer or chest at times.
      while (context.enemies.filter(enemy => enemy.isBoss).length >= 4) context.enemies.splice(Math.floor(Math.random() * context.enemies.length), 1);
      const live = vm.runInContext('liveAnswers()', context);
      const entry = vm.runInContext('chooseBossWord()', context);
      const boss = liveBoss(entry, 10);
      const keys = boss.choiceOptions.flatMap(option => option.keys);
      assert.ok(!keysClash(keys, live), `${entry.term} clashes on screen`);
      context.bossWordsThisSet.push(entry);
      context.enemies.push(boss);
      const helper = vm.runInContext(Math.random() < 0.5 ? 'chooseMedicPrompt()' : 'chooseMimicPrompt()', context);
      const bossKeysNow = vm.runInContext('liveAnswers(enemy => enemy.isBoss)', context);
      assert.ok(!keysClash([buildSearchPrompt(helper.term)], bossKeysNow), `${helper.term} clashes with a boss option`);
    }
  }
});


function createTypingHarness(prompts = ['force', 'mass']) {
  const source = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
  const inputCode = source.slice(source.indexOf('function enterCharacter(character)'), source.indexOf('// Simple FNV-1a'));
  const targets = prompts.map(prompt => {
    const isEquation = prompt.includes('=');
    const promptOptions = { multiplicationAlias: isEquation };
    const target = enemy(buildSearchPrompt(prompt, promptOptions), -20);
    target.altSearchPrompts = buildAltSearchPrompts(prompt, promptOptions);
    target.isEquation = isEquation;
    target.revealed = true;
    target.type = { eye: 0 };
    target.group.scale = { y: 1 };
    return target;
  });
  const context = vm.createContext({
    typedBuffer: 'for', activeTarget: targets[0], typedAttempts: 0, mistakes: 0, kills: 0, streak: 3,
    enemies: targets, WALL_Z: 0,
    getInputCharacters, pickTarget, isMathOperatorInput,
    checkCheatCode() {}, playTypeSound() {}, updateTypedDisplay() {},
    reusableVector: { y: 0, copy() {} }, fx: { burst() {} },
    wrongPicks: 0,
  });
  context.pickWrongChoice = () => { context.wrongPicks += 1; context.typedBuffer = ''; context.activeTarget = null; };
  context.registerMistake = () => { context.mistakes += 1; context.streak = 0; };
  context.defeatEnemy = () => { context.kills += 1; context.typedBuffer = ''; context.activeTarget = null; };
  vm.runInContext(mainSlice('function findMatches(', 'function getEquationQuantities(') + inputCode, context);
  return { context, targets };
}

test('a typo discards the prefix and target and breaks the chain', () => {
  const { context } = createTypingHarness();
  context.enterCharacter('z');
  assert.equal(context.typedBuffer, '');
  assert.equal(context.activeTarget, null);
  assert.equal(context.mistakes, 1);
  assert.equal(context.streak, 0);
  for (const letter of 'force') context.enterCharacter(letter);
  assert.equal(context.kills, 1);
  assert.equal(context.typedAttempts, 6);
});

test('typing another prompt switches targets immediately and discards old progress', () => {
  const { context, targets } = createTypingHarness();
  context.enterCharacter('m');
  assert.equal(context.typedBuffer, 'm');
  assert.equal(context.activeTarget, targets[1]);
  assert.equal(context.mistakes, 1);
  assert.equal(context.streak, 0);
  for (const letter of 'ass') context.enterCharacter(letter);
  assert.equal(context.kills, 1);
  assert.equal(context.typedAttempts, 4);
});


test('finishing a wrong boss option strikes it instead of defeating the boss', () => {
  const { context, targets } = createTypingHarness(['fission']);
  targets[0].choiceOptions = [
    { keys: ['fission'], isAnswer: true },
    { keys: ['fusion', 'irradiation'], isAnswer: false },
  ];
  context.typedBuffer = '';
  context.activeTarget = null;
  for (const letter of 'fusion') context.enterCharacter(letter);
  assert.equal(context.wrongPicks, 1);
  assert.equal(context.kills, 0);
  for (const letter of 'fission') context.enterCharacter(letter);
  assert.equal(context.kills, 1);
});

test('typing either spelling defeats normal enemies and equations without a mistake', () => {
  for (const { term, isEquation } of [...ALL_WORDS, ...EQUATION_WORDS]) {
    const options = { multiplicationAlias: !!isEquation };
    const alternatives = buildAltSearchPrompts(term, options);
    if (!alternatives.length) continue;
    for (const key of [buildSearchPrompt(term, options), ...alternatives]) {
      const { context } = createTypingHarness([term]);
      context.typedBuffer = '';
      for (const letter of key) context.enterCharacter(letter);
      assert.equal(context.kills, 1, `${term}: ${key}`);
      assert.equal(context.mistakes, 0, `${term}: ${key}`);
    }
  }
});

test('both spellings keep boss answers correct and wrong boss options wrong', () => {
  for (const entry of [...MEDIUM_WORDS, ...HARD_WORDS, ...EQUATION_WORDS]) {
    const choice = getBossChoice(entry, 10);
    if (!choice) continue;
    for (const option of [choice.answer, ...choice.wrong]) {
      if (option.keys.length < 2) continue;
      for (const key of option.keys) {
        const { context, targets } = createTypingHarness([entry.term]);
        targets[0].choiceOptions = [choice.answer, ...choice.wrong];
        context.typedBuffer = '';
        for (const letter of key) context.enterCharacter(letter);
        assert.equal(context.kills, option.isAnswer ? 1 : 0, `${entry.term}: ${key}`);
        assert.equal(context.wrongPicks, option.isAnswer ? 0 : 1, `${entry.term}: ${key}`);
        assert.equal(context.mistakes, 0, `${entry.term}: ${key}`);
      }
    }
  }
});


function createBossPacingHarness(waveSet = 4) {
  const source = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
  const start = source.indexOf('        if (bossesSpawned < BOSSES_PER_WAVE)');
  const end = source.lastIndexOf('\n      }', source.indexOf('\n    updateEnemies(currentDelta'));
  assert.ok(start >= 0 && end > start);
  const context = vm.createContext({
    BOSSES_PER_WAVE: 3, ONE_BOSS_AT_A_TIME_WAVES: 3, waveSet,
    bossesSpawned: 0, bossSpawnTimer: 1, currentDelta: 0,
    waveClearDelayTimer: 0, clears: 0, enemies: [],
    currentDifficulty: () => ({ bossSpawnGap: 2.8 }),
  });
  context.spawnBoss = () => context.enemies.push({ isBoss: true, dying: false });
  context.startWaveCleared = () => { context.clears += 1; };
  return {
    context,
    tick(delta) { context.currentDelta = delta; vm.runInContext(source.slice(start, end), context); },
  };
}

test('all three bosses can overlap on the 2.8-second timer without a kill', () => {
  const { context, tick } = createBossPacingHarness();
  tick(1);
  assert.equal(context.bossesSpawned, 1);
  tick(2.7);
  assert.equal(context.bossesSpawned, 1);
  tick(0.11);
  assert.equal(context.bossesSpawned, 2);
  tick(2.8);
  assert.equal(context.bossesSpawned, 3);
  assert.equal(context.enemies.length, 3);
  tick(5);
  assert.equal(context.bossesSpawned, 3);
  assert.equal(context.clears, 0);
  context.enemies.length = 0;
  tick(0.1);
  tick(1.3);
  assert.equal(context.clears, 1);
});

test('on waves 1–3 each boss waits until the one before it is gone', () => {
  const { context, tick } = createBossPacingHarness(1);
  tick(1);
  assert.equal(context.bossesSpawned, 1);
  tick(10);
  tick(10);
  assert.equal(context.bossesSpawned, 1);
  context.enemies[0].dying = true;
  tick(2.7);
  assert.equal(context.bossesSpawned, 1);
  tick(0.11);
  assert.equal(context.bossesSpawned, 2);
});

test('the finale can spawn more than two bosses without defeating earlier ones', () => {
  const source = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
  const start = source.indexOf('          const nextEntry = finalWaveQueue[finalWaveQueueIndex];');
  const end = source.indexOf('\n        }\n      } else {', start);
  assert.ok(start >= 0 && end > start);
  const context = vm.createContext({
    finalWaveQueue: ['boss', 'boss', 'boss', 'boss'], finalWaveQueueIndex: 0,
    bossesSpawned: 0, bossSpawnTimer: 0, currentDelta: 2.8, enemies: [],
    currentDifficulty: () => ({ bossSpawnGap: 2.8 }),
  });
  context.spawnBoss = () => context.enemies.push({ isBoss: true, dying: false });
  for (let index = 0; index < 4; index += 1) {
    vm.runInContext(`{${source.slice(start, end)}}`, context);
  }
  assert.equal(context.bossesSpawned, 4);
  assert.equal(context.enemies.length, 4);
  assert.equal(context.finalWaveQueueIndex, 4);
});

test('terms marked noBoss are never chosen as bosses', () => {
  const source = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
  const start = source.indexOf('function chooseBossPool()');
  const end = source.indexOf('function choosePrompt()');
  const context = vm.createContext({
    MEDIUM_WORDS, HARD_WORDS, waveSet: 1, Math,
    withinLength: (entries) => entries, bossWordLengthCap: () => Infinity,
    hardBossShare: wave => (wave >= 5 ? 0.7 : null),
  });
  vm.runInContext(source.slice(start, end), context);
  const noBoss = [...MEDIUM_WORDS, ...HARD_WORDS].filter(entry => entry.noBoss);
  assert.ok(noBoss.length > 0);
  for (const wave of [1, 3, 5, 9]) {
    context.waveSet = wave;
    for (let draw = 0; draw < 20; draw += 1) {
      const pool = vm.runInContext('chooseBossPool()', context);
      assert.ok(pool.every(entry => !entry.noBoss), `wave ${wave}`);
    }
  }
});
