import test from 'node:test';
import assert from 'node:assert/strict';
import { STORY_BEATS, storyBeatForWave } from '../src/story.js';
import { CHAPTERS, MINE_PALETTE, FINAL_WAVE_PALETTE, SEASON_PALETTES, WAVE_COUNT, chapterForWave } from '../src/chapters.js';

test('five waves, one chapter each', () => {
  assert.equal(WAVE_COUNT, 5);
  const kits = [];
  for (let wave = 1; wave <= WAVE_COUNT; wave += 1) kits.push(chapterForWave(wave).kit);
  assert.deepEqual(kits, ['meadow', 'forest', 'mountain', 'winter', 'sky']);
});

test('every chapter has a title and its own boss', () => {
  const bosses = CHAPTERS.map(chapter => chapter.boss);
  assert.equal(new Set(bosses).size, CHAPTERS.length);
  for (const chapter of CHAPTERS) {
    assert.ok(chapter.title, chapter.kit);
    assert.ok(chapter.boss, chapter.kit);
  }
});

test('palettes follow the seasons, then the night sky; the pass runs into the mine', () => {
  for (let wave = 1; wave <= 4; wave += 1) assert.equal(chapterForWave(wave).palette, SEASON_PALETTES[wave - 1]);
  assert.equal(chapterForWave(5).palette, FINAL_WAVE_PALETTE);
  assert.equal(chapterForWave(3).late.palette, MINE_PALETTE);
  assert.ok(chapterForWave(3).late.title);
  for (const wave of [1, 2, 4, 5]) assert.equal(chapterForWave(wave).late, undefined);
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
  assert.equal(chapterForWave(9).kit, 'sky');
});

test('each chapter boss is a boss model the game has', async () => {
  const { readFileSync } = await import('node:fs');
  const main = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
  const start = main.indexOf('const BOSS_TYPES = [');
  const table = main.slice(start, main.indexOf('\n];', start));
  for (const { boss } of CHAPTERS) assert.ok(table.includes(`name: '${boss}'`), boss);
});

test('the meadow is plain; every later chapter has a set-piece of its own', () => {
  assert.equal(chapterForWave(1).setPiece, undefined);
  const pieces = [2, 3, 4, 5].map(wave => chapterForWave(wave).setPiece);
  assert.deepEqual(pieces, ['bridge', 'cart', 'blizzard', 'flight']);
});

test('every wave has a storyteller; only the first is not held by a myth', async () => {
  assert.equal(STORY_BEATS.length, WAVE_COUNT);
  for (let wave = 1; wave <= WAVE_COUNT; wave += 1) {
    const beat = storyBeatForWave(wave);
    assert.ok(beat.name && beat.lines.length >= 3 && beat.lines.length <= 4, `wave ${wave}`);
    for (const line of beat.lines) assert.ok(line.length <= 125, line);
    assert.equal(!!beat.plea, wave > 1);
  }
});
