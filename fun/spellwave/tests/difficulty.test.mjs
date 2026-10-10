import test from 'node:test';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import {
  NORMAL_PROMPT_LENGTH_CAPS, EARLY_BOSS_WAVES, HARD_GUEST_COUNTS,
  typedLength, bossAnswerLengthCap, normalPromptLengthCap, bossWordLengthCap, previewLengthCap, withinLength, hardGuestCount,
} from '../src/difficulty.js';
import { EASY_WORDS, MEDIUM_WORDS, HARD_WORDS } from '../src/question-bank.js';

const longest = (entries) => entries.reduce((best, entry) => (typedLength(entry) > typedLength(best) ? entry : best));

test('typed length ignores spaces and punctuation', () => {
  assert.equal(typedLength({ term: 'specific latent heat of fusion' }), 26);
  assert.equal(typedLength({ term: "Fleming's left hand rule" }), 20);
});

test('minion caps increase gently and stay capped in late waves', () => {
  for (let wave = 2; wave <= 10; wave += 1) {
    assert.ok(normalPromptLengthCap(wave) >= normalPromptLengthCap(wave - 1), `wave ${wave}`);
  }
  assert.equal(normalPromptLengthCap(NORMAL_PROMPT_LENGTH_CAPS.length + 1), 14);
  assert.equal(normalPromptLengthCap(10), 14);
  assert.equal(bossWordLengthCap(EARLY_BOSS_WAVES + 1), Infinity);
  for (let wave = 1; wave <= 10; wave += 1) {
    assert.equal(previewLengthCap(wave), normalPromptLengthCap(wave));
  }
});

// Wave 1 draws only from the easy list, so an over-long easy keyword would be silently dropped.
test('every easy keyword fits the wave 1 cap', () => {
  const worst = longest(EASY_WORDS);
  assert.ok(
    typedLength(worst) <= normalPromptLengthCap(1),
    `"${worst.term}" is ${typedLength(worst)} letters; move it to MEDIUM_WORDS or shorten it`,
  );
});

test('wave 1 has no hard guests and waves 2-4 have some that fit', () => {
  assert.equal(hardGuestCount(1), 0);
  assert.equal(hardGuestCount(5), 0);
  for (let wave = 2; wave <= HARD_GUEST_COUNTS.length; wave += 1) {
    const [fewest, most] = HARD_GUEST_COUNTS[wave - 1];
    assert.equal(hardGuestCount(wave, () => 0), fewest);
    assert.equal(hardGuestCount(wave, () => 0.999), most);
    assert.ok(withinLength(HARD_WORDS, normalPromptLengthCap(wave)).length >= 10, `wave ${wave} guest pool`);
  }
});

test('early boss words fit their cap and leave a healthy pool', () => {
  for (let wave = 1; wave <= EARLY_BOSS_WAVES; wave += 1) {
    const pool = withinLength(MEDIUM_WORDS, bossWordLengthCap(wave));
    assert.ok(pool.length >= 40, `wave ${wave} boss pool has ${pool.length}`);
    assert.ok(typedLength(longest(pool)) <= bossWordLengthCap(wave));
  }
});

test('every capped wave still has plenty of normal keywords', () => {
  const poolFor = (wave) => (wave >= 5 ? [...MEDIUM_WORDS, ...HARD_WORDS] : wave >= 3 ? [...EASY_WORDS, ...MEDIUM_WORDS] : EASY_WORDS);
  for (let wave = 1; wave <= NORMAL_PROMPT_LENGTH_CAPS.length; wave += 1) {
    assert.ok(withinLength(poolFor(wave), normalPromptLengthCap(wave)).length >= 40, `wave ${wave}`);
  }
});

test('long phrases stay out of normal pools and previews at every wave', () => {
  const longTerms = HARD_WORDS.filter(entry => typedLength(entry) > 14);
  for (let wave = 1; wave <= 10; wave += 1) {
    assert.equal(withinLength(longTerms, normalPromptLengthCap(wave)).length, 0);
    assert.equal(withinLength(longTerms, previewLengthCap(wave)).length, 0);
    assert.equal(bossAnswerLengthCap(wave), wave <= 2 ? 14 : 16);
  }
});


test('startup dependencies share the page release version to avoid mixed cached code', () => {
  const html = readFileSync(new URL('../../spellwave.html', import.meta.url), 'utf8');
  const main = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
  const difficulty = readFileSync(new URL('../src/difficulty.js', import.meta.url), 'utf8');
  const version = html.match(/spellwave\/src\/main\.js\?v=([^"&]+)/)?.[1];
  assert.ok(version, 'entry module must have a cache version');
  assert.ok(html.includes(`spellwave/src/styles.css?v=${version}"`));
  assert.ok(main.includes(`from './difficulty.js?v=${version}'`));
  assert.ok(main.includes(`from './prompt-utils.js?v=${version}'`));
  assert.ok(difficulty.includes(`from './prompt-utils.js?v=${version}'`));
});
