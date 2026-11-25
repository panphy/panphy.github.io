import test from 'node:test';
import assert from 'node:assert/strict';
import { CHAPTERS, MINE_PALETTE, FINAL_WAVE_PALETTE, SEASON_PALETTES, chapterForWave } from '../src/chapters.js';

test('five chapters cover two waves each', () => {
  const kits = [];
  for (let wave = 1; wave <= 10; wave += 1) kits.push(chapterForWave(wave).kit);
  assert.deepEqual(kits, ['meadow', 'meadow', 'forest', 'forest', 'mountain', 'mountain', 'winter', 'winter', 'sky', 'sky']);
  assert.equal(CHAPTERS.length, 5);
});

test('a chapter opens with its first wave: variant 0, a title, and a gate after the first chapter', () => {
  for (let wave = 1; wave <= 10; wave += 1) {
    const chapter = chapterForWave(wave);
    assert.equal(chapter.variant, (wave - 1) % 2);
    assert.equal(chapter.gate, wave > 1 && wave % 2 === 1, `gate on wave ${wave}`);
    if (chapter.variant === 0) assert.ok(chapter.title, `wave ${wave} has a title`);
  }
});

test('palettes follow the seasons, the mine and the night sky', () => {
  assert.equal(chapterForWave(1).palette, SEASON_PALETTES[0]);
  assert.equal(chapterForWave(4).palette, SEASON_PALETTES[1]);
  assert.equal(chapterForWave(5).palette, SEASON_PALETTES[2]);
  assert.equal(chapterForWave(6).palette, MINE_PALETTE);
  assert.equal(chapterForWave(8).palette, SEASON_PALETTES[3]);
  assert.equal(chapterForWave(9).palette, FINAL_WAVE_PALETTE);
  assert.equal(chapterForWave(10).palette, FINAL_WAVE_PALETTE);
});

test('every palette has the fields the game fades between', () => {
  const fields = Object.keys(SEASON_PALETTES[0]);
  for (const palette of [...SEASON_PALETTES, MINE_PALETTE, FINAL_WAVE_PALETTE]) {
    for (const field of fields) assert.ok(field in palette, `${palette.name} has ${field}`);
    assert.equal(palette.leafColors.length, 3);
  }
});

test('waves outside the run stay in range', () => {
  assert.equal(chapterForWave(0).kit, 'meadow');
  assert.equal(chapterForWave(14).kit, 'sky');
  assert.equal(chapterForWave(14).variant, 1);
});
