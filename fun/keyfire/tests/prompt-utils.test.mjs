import test from 'node:test';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {
  pickTarget, buildSearchPrompt, buildAltSearchPrompts,
  getInputCharacter, promptIndexForProgress, altTermFor,
} from '../src/prompt-utils.js';
import { ALL_WORDS, ROCK_UNITS, BOSS_PHRASES, BOSS_STORIES } from '../src/question-bank.js';

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

test('search prompts skip spaces and punctuation, fold accents and capitals', () => {
  assert.equal(buildSearchPrompt("Hooke's law"), 'hookeslaw');
  assert.equal(buildSearchPrompt('café'), 'cafe');
  assert.equal(buildSearchPrompt('kWh'), 'kwh');
});

test('a key types its lower-case letter, or nothing', () => {
  assert.equal(getInputCharacter('K'), 'k');
  assert.equal(getInputCharacter('é'), 'e');
  for (const key of [' ', '-', '×', '=']) assert.equal(getInputCharacter(key), '', key);
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
  assert.ok(buildAltSearchPrompts('colour, metre, litre').includes('colormeterliter'));
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
  for (const { term } of ALL_WORDS) {
    assert.ok(buildSearchPrompt(term).length > 0, term);
    assert.ok(!seen.has(term), `duplicate term: ${term}`);
    seen.add(term);
    assert.match(term, /^[a-z' -]+$/i, `unexpected characters in "${term}"`);
  }
});

test('boss lines and rock units are plain letters', () => {
  for (const { term } of ROCK_UNITS) assert.match(term, /^[a-z]+$/i, term);
  for (const term of [...BOSS_PHRASES.map(entry => entry.term), ...BOSS_STORIES.flatMap(story => story.lines)]) {
    assert.match(term, /^[a-z ]+$/i, term);
  }
});

const mainSource = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
const mainSlice = (from, to) => mainSource.slice(mainSource.indexOf(from), mainSource.indexOf(to));

function createTypingHarness(prompts = ['force', 'mass'], railgunShots = 0) {
  const source = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
  const inputCode = source.slice(source.indexOf('function enterCharacter(character)'), source.indexOf('// Simple FNV-1a'));
  const targets = prompts.map(prompt => {
    const target = enemy(buildSearchPrompt(prompt), -20);
    target.altSearchPrompts = buildAltSearchPrompts(prompt);
    target.revealed = true;
    target.type = { eye: 0 };
    target.group.scale = { y: 1 };
    return target;
  });
  const context = vm.createContext({
    typedBuffer: 'for', activeTarget: targets[0], typedAttempts: 0, mistakes: 0, kills: 0, streak: 3,
    enemies: targets, WALL_Z: 0,
    getInputCharacter, pickTarget,
    checkCheatCode() {}, playTypeSound() {}, hitEnemyWithLetter() {},
    reusableVector: { y: 0, copy() {} }, fx: { burst() {} },
    railgunShots,
    powerUps: { useRailgunShot: () => (context.railgunShots > 0 ? (context.railgunShots -= 1, true) : false) },
    spawnBeam() {}, playRailgunShotSound() {}, kickTimer: 0, hitStopTimer: 0, RAILGUN_COLOUR: 0,
  });
  context.registerMistake = () => { context.mistakes += 1; context.streak = 0; };
  context.defeatEnemy = () => { context.kills += 1; context.typedBuffer = ''; context.activeTarget = null; };
  vm.runInContext(mainSlice('function findMatches(', 'function prepareWavePlan(') + inputCode, context);
  return { context, targets };
}

test('a railgun shot finishes a word on its first letter, one shot per word, never a rock', () => {
  const { context, targets } = createTypingHarness(['force', 'mass', 'J'], 2);
  targets[2].isProjectile = true;
  context.typedBuffer = '';
  context.activeTarget = null;
  context.enterCharacter('j');
  assert.equal(context.railgunShots, 2, 'a rock takes no shot');
  context.enterCharacter('f');
  assert.equal(context.kills, 2);
  assert.equal(context.railgunShots, 1);
  assert.ok(targets[0].noRank, 'a railgun kill is not ranked');
  context.enterCharacter('m');
  context.enterCharacter('f');
  assert.equal(context.railgunShots, 0);
  assert.equal(context.kills, 3);
});

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
  Object.assign(unit, { altSearchPrompts: [], revealed: true, type: { eye: 0 } });
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

test('typing either spelling defeats an enemy without a mistake', () => {
  for (const { term } of ALL_WORDS) {
    const alternatives = buildAltSearchPrompts(term);
    if (!alternatives.length) continue;
    for (const key of [buildSearchPrompt(term), ...alternatives]) {
      const { context } = createTypingHarness([term]);
      context.typedBuffer = '';
      for (const letter of key) context.enterCharacter(letter);
      assert.equal(context.kills, 1, `${term}: ${key}`);
      assert.equal(context.mistakes, 0, `${term}: ${key}`);
    }
  }
});

test('a card typed in another spelling keeps its spaces, punctuation and capitals', () => {
  const shown = (term, typed) => {
    const key = [buildSearchPrompt(term), ...buildAltSearchPrompts(term)].find(entry => entry.startsWith(typed));
    const spelled = altTermFor(term, key);
    return spelled.slice(0, promptIndexForProgress(spelled, typed.length)) + '|' + spelled.slice(promptIndexForProgress(spelled, typed.length));
  };
  assert.equal(shown('centre of mass', 'cente'), 'cente|r of mass');
  assert.equal(shown('centre of mass', 'centerofm'), 'center of m|ass');
  assert.equal(shown('Colour, metre', 'colo'), 'Colo|ur, metre');
  assert.equal(shown('Colour, metre', 'color'), 'Color|, metre');
  assert.equal(altTermFor('half-life', 'halflife'), 'half-life');
});
