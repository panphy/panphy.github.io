import test from 'node:test';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {
  pickTarget, buildSearchPrompt, buildAltSearchPrompts, buildTwoWordLimit,
  getInputCharacters, isMathOperatorInput, promptIndexForProgress, buildBossPrompt, createBossQuestionBuilder, buildBossHintPart,
} from '../src/prompt-utils.js';
import { ALL_WORDS, EQUATION_WORDS, MEDIUM_WORDS, HARD_WORDS } from '../src/question-bank.js';

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

test('bosses chosen for one wave never share an answer', () => {
  const source = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
  const slice = (from, to) => source.slice(source.indexOf(from), source.indexOf(to));
  const context = vm.createContext({
    MEDIUM_WORDS, HARD_WORDS, EQUATION_WORDS, buildBossQuestion, BOSSES_PER_WAVE: 3, waveSet: 1,
    bossAnswerLengthCap: wave => (wave <= 2 ? 14 : 16),
    hardBossShare: wave => (wave >= 5 ? 0.7 : null),
    bossWordLengthCap: wave => (wave <= 2 ? 14 : Infinity),
    withinLength: (entries, cap) => entries.filter(entry => buildSearchPrompt(entry.term).length <= cap),
  });
  vm.runInContext(slice('function chooseBossWordsForWave()', 'function chooseBossPool()')
    + slice('function chooseBossPool()', 'function choosePrompt()'), context);
  const vocabulary = Array(10).fill(0);
  const hard = Array(10).fill(0);
  for (context.waveSet = 1; context.waveSet <= 9; context.waveSet += 1) {
    for (let run = 0; run < 300; run += 1) {
      const bosses = vm.runInContext('chooseBossWordsForWave()', context);
      const answers = vm.runInContext('bosses => bosses.map(bossAnswer)', context)(bosses);
      assert.equal(answers.length, 3);
      vocabulary[context.waveSet] += 2;
      hard[context.waveSet] += bosses.filter(boss => HARD_WORDS.includes(boss)).length;
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


function createTypingHarness() {
  const source = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
  const inputCode = source.slice(source.indexOf('function enterCharacter(character)'), source.indexOf('// Simple FNV-1a'));
  const targets = ['force', 'mass'].map(prompt => {
    const target = enemy(prompt, -20);
    target.type = { eye: 0 };
    target.group.scale = { y: 1 };
    return target;
  });
  const context = vm.createContext({
    typedBuffer: 'for', activeTarget: targets[0], typedAttempts: 0, mistakes: 0, kills: 0, streak: 3,
    getInputCharacters, pickTarget, isMathOperatorInput,
    checkCheatCode() {}, playTypeSound() {}, updateTypedDisplay() {},
    reusableVector: { y: 0, copy() {} }, fx: { burst() {} },
    hasActiveEquationPrefix: () => false,
  });
  context.findMatches = prefix => targets.filter(target => {
    target._matchedSearchPrompt = target.searchPrompt;
    return target.searchPrompt.startsWith(prefix);
  });
  context.chooseTarget = matches => pickTarget(matches, context.typedBuffer);
  context.registerMistake = () => { context.mistakes += 1; context.streak = 0; };
  context.defeatEnemy = () => { context.kills += 1; context.typedBuffer = ''; context.activeTarget = null; };
  vm.runInContext(inputCode, context);
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


function createBossPacingHarness() {
  const source = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
  const start = source.indexOf('        if (bossesSpawned < BOSSES_PER_WAVE)');
  const end = source.lastIndexOf('\n      }', source.indexOf('\n    updateEnemies(currentDelta'));
  assert.ok(start >= 0 && end > start);
  const context = vm.createContext({
    BOSSES_PER_WAVE: 3,
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
