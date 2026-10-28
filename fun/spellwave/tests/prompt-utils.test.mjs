import test from 'node:test';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {
  pickTarget, buildSearchPrompt, buildAltSearchPrompts, buildTwoWordLimit,
  getInputCharacters, isMathOperatorInput, promptIndexForProgress, buildBossPrompt,
  createBossQuestionBuilder, buildBossHintPart,
} from '../src/prompt-utils.js';
import { ALL_WORDS, EQUATION_WORDS, MEDIUM_WORDS, HARD_WORDS, EASY_WORDS } from '../src/question-bank.js';
import { createWordDeck } from '../src/word-decks.js';

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

test('equation bosses always produce a hidden-word limit', () => {
  for (const { term } of EQUATION_WORDS) {
    const limit = buildTwoWordLimit(term, { alwaysLimit: true, multiplicationAlias: true, maxHiddenWords: 2 });
    assert.ok(limit && limit.searchPrompt.length > 0, term);
  }
});

const buildBossQuestion = createBossQuestionBuilder(ALL_WORDS, EQUATION_WORDS);
const hiddenWords = prompt => prompt.parts.filter(part => part.isHidden).map(part => buildSearchPrompt(part.answerText));

test('no boss clue prints the word it asks for', () => {
  for (const entry of [...MEDIUM_WORDS, ...HARD_WORDS, ...EQUATION_WORDS]) {
    const clueWords = new Set(entry.definition.toLowerCase().split(/[^a-z]+/));
    for (const cap of [14, 16]) {
      const repeated = hiddenWords(buildBossQuestion(entry, cap)).filter(word => clueWords.has(word));
      assert.deepEqual(repeated, [], `"${entry.term}" is given away by its clue`);
    }
  }
});

test('every boss has a bounded content-word answer', () => {
  for (const entry of [...MEDIUM_WORDS, ...HARD_WORDS, ...EQUATION_WORDS]) {
    for (const cap of [14, 16]) {
      const prompt = buildBossQuestion(entry, cap);
      assert.ok(prompt, entry.term);
      assert.ok(hiddenWords(prompt).length >= 1, entry.term);
      assert.ok(prompt.searchPrompt.length > 0 && prompt.searchPrompt.length <= cap, entry.term);
      assert.equal(prompt.parts.map(part => part.text).join(''), entry.term);
      assert.ok(prompt.altSearchPrompts.every(answer => answer.length <= cap), entry.term);
    }
  }
});

test('every ask names words of its own term and is used when it fits', () => {
  for (const entry of [...MEDIUM_WORDS, ...HARD_WORDS, ...EQUATION_WORDS].filter(item => item.ask)) {
    assert.deepEqual(hiddenWords(buildBossQuestion(entry, 16)), entry.ask.split(' ').map(word => buildSearchPrompt(word)), entry.term);
  }
});

test('bosses hide the word that tells a term apart from the rest of the bank', () => {
  const answer = term => buildBossQuestion([...MEDIUM_WORDS, ...HARD_WORDS].find(entry => entry.term === term), 16).searchPrompt;
  assert.equal(answer('Newton\'s first law'), 'first');
  assert.equal(answer('series circuit'), 'series');
  assert.equal(answer('nuclear fusion'), 'fusion');
  assert.equal(answer('non renewable'), 'nonrenewable');
  assert.equal(answer('limit of proportionality'), 'proportionality');
});

test('equation bosses skip repeated and filler words and preserve exponents', () => {
  const equation = clue => buildBossQuestion(EQUATION_WORDS.find(entry => entry.definition === clue), 16);
  assert.equal(equation('s = vt').searchPrompt, 'speed');
  assert.equal(equation('Vp / Vs = np / ns').searchPrompt, 'turnsturns');
  assert.equal(buildBossPrompt('kinetic energy = 0.5 × mass × speed²', { multiplicationAlias: true }).searchPrompt, 'kinetic');
  const squared = buildBossPrompt('speed² = time', { multiplicationAlias: true });
  assert.equal(squared.searchPrompt, 'speed');
  assert.equal(squared.parts.find(part => part.isHidden).exponentText, '²');
});

test('every hidden boss word shows a blank', () => {
  for (const entry of [...MEDIUM_WORDS, ...HARD_WORDS, ...EQUATION_WORDS]) {
    for (const cap of [14, 16]) {
      for (const part of buildBossQuestion(entry, cap).parts.filter(item => item.isHidden)) {
        assert.match(buildBossHintPart(part.answerText, { leadingTypeableCount: 3 }), /_/, entry.term);
      }
    }
  }
  assert.equal(buildBossHintPart('non', { leadingTypeableCount: 3 }), 'no_');
  assert.equal(buildBossHintPart('Newton\'s', { leadingTypeableCount: 3 }), 'New___\'_');
});

const mainSource = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
const mainSlice = (from, to) => mainSource.slice(mainSource.indexOf(from), mainSource.indexOf(to));

function createBossChoiceContext(extra = {}) {
  const context = vm.createContext({
    MEDIUM_WORDS, HARD_WORDS, EQUATION_WORDS, EASY_WORDS, BOSSES_PER_WAVE: 3, waveSet: 1, Math,
    buildBossQuestion, buildSearchPrompt,
    hardBossShare: wave => (wave >= 5 ? 0.7 : null),
    bossWordLengthCap: wave => (wave <= 2 ? 14 : Infinity),
    bossAnswerLengthCap: wave => (wave <= 2 ? 14 : 16),
    normalPromptLengthCap: () => 14,
    withinLength: (entries, cap) => entries.filter(entry => buildSearchPrompt(entry.term).length <= cap),
    enemies: [], bossWordsThisSet: [],
    monsterDeck: createWordDeck(), bossDeck: createWordDeck(),
    ...extra,
  });
  vm.runInContext(mainSlice('function chooseBossWordsForWave()', 'function chooseBossPool()')
    + mainSlice('function chooseBossPool()', 'function choosePrompt()')
    + mainSlice('function chooseMedicPrompt()', 'function refreshWaveBossOrder(')
    + mainSlice('function chooseMimicPrompt()', 'function getMimicCountForWave(')
    + mainSlice('function chooseBossWord()', 'function startWaveCleared()')
    + mainSlice('function enemyTypeableKeys(enemy)', 'function hasActiveEquationPrefix('), context);
  return context;
}

test('bosses chosen for one wave never share an answer', () => {
  const context = createBossChoiceContext();
  const vocabulary = Array(10).fill(0);
  const hard = Array(10).fill(0);
  for (context.waveSet = 1; context.waveSet <= 9; context.waveSet += 1) {
    for (let run = 0; run < 400; run += 1) {
      context.bossDeck.reset([]);
      const bosses = vm.runInContext('chooseBossWordsForWave()', context);
      assert.equal(bosses.length, 3);
      assert.equal(bosses.filter(boss => boss.isEquation).length, 1);
      assert.ok(bosses.every(boss => !boss.noBoss));
      vocabulary[context.waveSet] += 2;
      hard[context.waveSet] += bosses.filter(boss => HARD_WORDS.includes(boss)).length;
      const answers = bosses.map(boss => context.bossAnswer(boss));
      for (const a of answers) {
        assert.equal(answers.filter(b => a.startsWith(b) || b.startsWith(a)).length, 1, answers.join(', '));
      }
    }
  }
  // Hard bosses: none on waves 1–2, the minority on 3–4, the majority from wave 5.
  const share = wave => hard[wave] / vocabulary[wave];
  assert.equal(share(1) + share(2), 0);
  assert.ok(share(3) > 0.25 && share(4) < 0.5, `${share(3)}, ${share(4)}`);
  for (let wave = 5; wave <= 9; wave += 1) assert.ok(share(wave) > 0.6 && share(wave) < 0.8, `wave ${wave}: ${share(wave)}`);
});

test('finale bosses, healers and chests never clash with the answers on screen', () => {
  const context = createBossChoiceContext({ waveSet: 10 });
  for (let run = 0; run < 300; run += 1) {
    context.enemies = [];
    context.bossWordsThisSet = [];
    context.bossDeck.reset([]);
    context.monsterDeck.reset([]);
    for (let spawn = 0; spawn < 10; spawn += 1) {
      while (context.enemies.filter(enemy => enemy.isBoss).length >= 4) context.enemies.splice(Math.floor(Math.random() * context.enemies.length), 1);
      const live = vm.runInContext('liveAnswers()', context);
      const entry = vm.runInContext('chooseBossWord()', context);
      const answer = context.bossAnswer(entry);
      assert.ok(!live.some(other => answer.startsWith(other) || other.startsWith(answer)), `${entry.term} clashes on screen`);
      context.bossWordsThisSet.push(entry);
      context.enemies.push({
        prompt: entry.term, dying: false, isBoss: true,
        searchPrompt: answer, altSearchPrompts: [],
      });
      const helper = vm.runInContext(Math.random() < 0.5 ? 'chooseMedicPrompt()' : 'chooseMimicPrompt()', context);
      const bossKeysNow = vm.runInContext('liveAnswers(enemy => enemy.isBoss)', context);
      const helperKey = buildSearchPrompt(helper.term);
      assert.ok(!bossKeysNow.some(other => helperKey.startsWith(other) || other.startsWith(helperKey)), `${helper.term} clashes with a boss answer`);
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
  });
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

test('both spellings defeat a boss hidden-word answer without a mistake', () => {
  for (const entry of [...MEDIUM_WORDS, ...HARD_WORDS, ...EQUATION_WORDS]) {
    const prompt = buildBossQuestion(entry, 16);
    if (!prompt || prompt.altSearchPrompts.length === 0) continue;
    for (const key of [prompt.searchPrompt, ...prompt.altSearchPrompts]) {
      const { context, targets } = createTypingHarness([entry.term]);
      targets[0].searchPrompt = prompt.searchPrompt;
      targets[0].altSearchPrompts = prompt.altSearchPrompts;
      context.typedBuffer = '';
      for (const letter of key) context.enterCharacter(letter);
      assert.equal(context.kills, 1, `${entry.term}: ${key}`);
      assert.equal(context.mistakes, 0, `${entry.term}: ${key}`);
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

test('the finale keeps at most three bosses alive and spawns the next when one goes', () => {
  const source = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
  const start = source.indexOf('          const nextEntry = finalWaveQueue[finalWaveQueueIndex];');
  const end = source.indexOf('\n        }\n      } else {', start);
  assert.ok(start >= 0 && end > start);
  const context = vm.createContext({
    finalWaveQueue: ['boss', 'boss', 'boss', 'boss'], finalWaveQueueIndex: 0, FINAL_WAVE_MAX_LIVE_BOSSES: 3,
    bossesSpawned: 0, bossSpawnTimer: 0, currentDelta: 2.8, enemies: [],
    currentDifficulty: () => ({ bossSpawnGap: 2.8 }),
  });
  context.spawnBoss = () => context.enemies.push({ isBoss: true, dying: false });
  const tick = () => vm.runInContext(`{${source.slice(start, end)}}`, context);
  for (let index = 0; index < 6; index += 1) tick();
  assert.equal(context.bossesSpawned, 3);
  assert.equal(context.finalWaveQueueIndex, 3);
  context.enemies[0].dying = true;
  tick();
  assert.equal(context.bossesSpawned, 4);
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
