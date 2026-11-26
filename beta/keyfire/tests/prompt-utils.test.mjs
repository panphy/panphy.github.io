import test from 'node:test';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {
  pickTarget, buildSearchPrompt, buildAltSearchPrompts,
  getInputCharacters, isMathOperatorInput, promptIndexForProgress,
} from '../src/prompt-utils.js';
import { ALL_WORDS, EQUATION_WORDS } from '../src/question-bank.js';

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

const hiddenWords = prompt => prompt.parts.filter(part => part.isHidden).map(part => buildSearchPrompt(part.answerText));

const mainSource = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
const mainSlice = (from, to) => mainSource.slice(mainSource.indexOf(from), mainSource.indexOf(to));

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
    checkCheatCode() {}, playTypeSound() {}, updateTypedDisplay() {}, hitEnemyWithLetter() {},
    reusableVector: { y: 0, copy() {} }, fx: { burst() {} },
  });
  context.registerMistake = () => { context.mistakes += 1; context.streak = 0; };
  context.defeatEnemy = () => { context.kills += 1; context.typedBuffer = ''; context.activeTarget = null; };
  vm.runInContext(mainSlice('function findMatches(', 'function prepareWavePlan(') + inputCode, context);
  return { context, targets };
}

test('a wrong key is only a miss: the prefix and target stay', () => {
  const { context, targets } = createTypingHarness();
  context.enterCharacter('z');
  assert.equal(context.typedBuffer, 'for');
  assert.equal(context.activeTarget, targets[0]);
  assert.equal(context.mistakes, 1);
  assert.equal(context.streak, 0);
  for (const letter of 'ce') context.enterCharacter(letter);
  assert.equal(context.kills, 1);
  assert.equal(context.typedAttempts, 3);
});

test('no word is locked: mid-word, the first letter of another prompt switches to it', () => {
  const { context, targets } = createTypingHarness();
  context.enterCharacter('m');
  assert.equal(context.typedBuffer, 'm');
  assert.equal(context.activeTarget, targets[1]);
  assert.equal(context.mistakes, 0);
  assert.equal(context.streak, 3);
  for (const letter of 'ass') context.enterCharacter(letter);
  assert.equal(context.kills, 1);
});

test('typing ignores capitals, for units as well as words', () => {
  const { context, targets } = createTypingHarness(['force']);
  const unit = enemy(buildSearchPrompt('MW'), -10);
  Object.assign(unit, { altSearchPrompts: [], revealed: true, type: { eye: 0 }, isEquation: false });
  unit.group.scale = { y: 1 };
  context.enemies = [targets[0], unit];
  context.typedBuffer = '';
  context.activeTarget = null;
  for (const letter of 'mw') context.enterCharacter(letter);
  assert.equal(context.mistakes, 0);
  assert.equal(context.kills, 1);
  context.enemies = [targets[0]];
  for (const letter of 'FoRcE') context.enterCharacter(letter);
  assert.equal(context.kills, 2);
  assert.equal(context.mistakes, 0);
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

test('chain lightning interrupts at most two bosses and prefers the hop target', () => {
  const source = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
  const start = source.indexOf('function chooseChainBossInterrupts(');
  const end = source.indexOf('// Long targeted interrupt');
  assert.ok(start >= 0 && end > start);
  const boss = (id, z) => ({ id, isBoss: true, dying: false, group: { position: { x: 0, y: 0, z, distanceToSquared(other) { return (this.z - other.z) ** 2; } } } });
  const near = boss('near', -10);
  const mid = boss('mid', -20);
  const far = boss('far', -40);
  const context = vm.createContext({
    CHAIN_BOSS_MAX: 2,
    enemies: [near, mid, far],
  });
  vm.runInContext(source.slice(start, end), context);
  const ids = (first, hops) => context.chooseChainBossInterrupts(first, hops).map(enemy => enemy.id).join(',');
  const typedBoss = boss('typed', 0);
  assert.equal(ids(typedBoss, [near]), 'near');
  assert.equal(ids(typedBoss, []), 'near');
  const typedMinion = { id: 'minion', isBoss: false, dying: true, group: { position: { x: 0, y: 0, z: 0 } } };
  assert.equal(ids(typedMinion, [near]), 'near,mid');
  assert.equal(ids(typedMinion, []), '');
});
