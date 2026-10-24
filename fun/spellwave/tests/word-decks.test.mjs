import test from 'node:test';
import assert from 'node:assert/strict';
import { createWordDeck } from '../src/word-decks.js';
import { EASY_WORDS, EQUATION_WORDS } from '../src/question-bank.js';

test('a deck uses every word in a pool before repeating any', () => {
  const deck = createWordDeck();
  const seen = EASY_WORDS.map(() => deck.pick(EASY_WORDS).term);
  assert.equal(new Set(seen).size, EASY_WORDS.length);
  const next = deck.pick(EASY_WORDS);
  assert.ok(EASY_WORDS.includes(next));
});

test('a deck only picks entries that pass the test, or none', () => {
  const deck = createWordDeck();
  const short = entry => entry.term.length <= 4;
  for (let i = 0; i < 20; i += 1) assert.ok(short(deck.pick(EASY_WORDS, short)));
  assert.equal(deck.pick(EASY_WORDS, () => false), null);
});

test("last run's words come after fresh ones", () => {
  const deck = createWordDeck();
  const lastRun = EASY_WORDS.slice(0, 60).map(entry => entry.term);
  deck.reset(lastRun);
  const fresh = EASY_WORDS.length - lastRun.length;
  const first = Array.from({ length: fresh }, () => deck.pick(EASY_WORDS).term);
  assert.ok(first.every(term => !lastRun.includes(term)));
  assert.ok(lastRun.includes(deck.pick(EASY_WORDS).term));
});

test('no equation boss repeats within a run', () => {
  const deck = createWordDeck();
  const run = Array.from({ length: 10 }, () => deck.pick(EQUATION_WORDS).term);
  assert.equal(new Set(run).size, run.length);
});

test('reset forgets the run but not last run', () => {
  const deck = createWordDeck();
  deck.pick(EASY_WORDS);
  assert.equal(deck.usedTerms().length, 1);
  deck.reset([]);
  assert.equal(deck.usedTerms().length, 0);
});
