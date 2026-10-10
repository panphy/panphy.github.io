import test from 'node:test';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {
  pickTarget, buildSearchPrompt, buildAltSearchPrompts, buildTwoWordLimit,
  getInputCharacters, isMathOperatorInput, promptIndexForProgress, buildBossPrompt,
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

test('boss definitions do not repeat a word of the hidden term', () => {
  const lowValue = new Set(['a', 'an', 'and', 'as', 'by', 'for', 'from', 'in', 'of', 'on', 'or', 'per', 'the', 'to', 'with']);
  for (const { term, definition } of [...MEDIUM_WORDS, ...HARD_WORDS]) {
    const clueWords = new Set(definition.toLowerCase().split(/[^a-z]+/));
    const repeated = term.toLowerCase().split(/\s+/).filter(word => word.length > 3 && !lowValue.has(word) && clueWords.has(word));
    assert.deepEqual(repeated, [], `"${term}" is given away by its definition`);
  }
});


test('every boss has exactly one bounded content-word answer', () => {
  for (const entry of [...MEDIUM_WORDS, ...HARD_WORDS, ...EQUATION_WORDS]) {
    for (const cap of [14, 16]) {
      const options = { maxAnswerLength: cap, multiplicationAlias: !!entry.isEquation };
      const prompt = buildBossPrompt(entry.term, options);
      assert.ok(prompt, entry.term);
      assert.equal(prompt.parts.filter(part => part.isHidden).length, 1, entry.term);
      assert.ok(prompt.searchPrompt.length > 0 && prompt.searchPrompt.length <= cap, entry.term);
      assert.equal(prompt.parts.map(part => part.text).join(''), entry.term);
      assert.ok(prompt.altSearchPrompts.every(answer => answer.length <= cap), entry.term);
    }
  }
});

test('long vocabulary asks for a substantial word and preserves equation exponents', () => {
  assert.equal(buildBossPrompt('limit of proportionality').searchPrompt, 'proportionality');
  const prompt = buildBossPrompt('kinetic energy = 0.5 × mass × speed²', { multiplicationAlias: true });
  assert.equal(prompt.searchPrompt, 'kinetic');
  const squared = buildBossPrompt('speed² = time', { multiplicationAlias: true });
  assert.equal(squared.searchPrompt, 'speed');
  assert.equal(squared.parts.find(part => part.isHidden).exponentText, '²');
});


test('a typo preserves the prefix and target, then correct typing completes the kill', () => {
  const source = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
  const inputCode = source.slice(source.indexOf('function enterCharacter(character)'), source.indexOf('// Simple FNV-1a'));
  const target = enemy('force', -20);
  target.type = { eye: 0 };
  target.group.scale = { y: 1 };
  const context = vm.createContext({
    typedBuffer: 'for', activeTarget: target, typedAttempts: 0, mistakes: 0, kills: 0,
    getInputCharacters, pickTarget, isMathOperatorInput,
    checkCheatCode() {}, playTypeSound() {}, updateTypedDisplay() {},
    reusableVector: { y: 0, copy() {} }, fx: { burst() {} },
    hasActiveEquationPrefix: () => false,
  });
  context.findMatches = prefix => {
    target._matchedSearchPrompt = 'force';
    return 'force'.startsWith(prefix) ? [target] : [];
  };
  context.registerMistake = () => { context.mistakes += 1; };
  context.defeatEnemy = () => { context.kills += 1; context.typedBuffer = ''; };
  vm.runInContext(inputCode, context);
  context.enterCharacter('x');
  assert.equal(context.typedBuffer, 'for');
  assert.equal(context.activeTarget, target);
  assert.equal(context.mistakes, 1);
  context.enterCharacter('f'); // An incorrect letter must not silently restart on another prefix.
  assert.equal(context.typedBuffer, 'for');
  context.enterCharacter('c');
  assert.equal(context.typedBuffer, 'forc');
  context.enterCharacter('e');
  assert.equal(context.kills, 1);
  assert.equal(context.typedAttempts, 4);
  assert.equal(context.mistakes, 2);
});
