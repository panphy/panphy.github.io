import test from 'node:test';
import assert from 'node:assert/strict';
import {
  NORMAL_PROMPT_LENGTH_CAPS, EARLY_BOSS_WAVES, HARD_GUEST_COUNTS,
  typedLength, normalPromptLengthCap, bossWordLengthCap, previewLengthCap, withinLength, hardGuestCount,
} from '../src/difficulty.js';
import { EASY_WORDS, MEDIUM_WORDS, HARD_WORDS } from '../src/question-bank.js';

const longest = (entries) => entries.reduce((best, entry) => (typedLength(entry) > typedLength(best) ? entry : best));

test('typed length ignores spaces and punctuation', () => {
  assert.equal(typedLength({ term: 'specific latent heat of fusion' }), 26);
  assert.equal(typedLength({ term: "Fleming's left hand rule" }), 20);
});

test('length caps never shrink from one wave to the next and end uncapped', () => {
  for (let wave = 2; wave <= 10; wave += 1) {
    assert.ok(normalPromptLengthCap(wave) >= normalPromptLengthCap(wave - 1), `wave ${wave}`);
  }
  assert.equal(normalPromptLengthCap(NORMAL_PROMPT_LENGTH_CAPS.length + 1), Infinity);
  assert.equal(bossWordLengthCap(EARLY_BOSS_WAVES + 1), Infinity);
  assert.ok(previewLengthCap(1) >= bossWordLengthCap(1));
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
