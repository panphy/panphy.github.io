// difficulty.js — how long a keyword may be on each wave. The reasoning and the
// full progression table are in fun/spellwave/README.md; keep the two in step.
import { buildSearchPrompt } from './prompt-utils.js?v=20261028-boss-table';

// Longest prompt, in typed characters, that a normal monster, healer or chest may
// ask on waves 1, 2, 3… Late waves keep the final cap.
export const NORMAL_PROMPT_LENGTH_CAPS = [11, 12, 12, 13, 13, 14];

// Early vocabulary bosses use compact terms. Only terms that also fit the
// minion cap are previewed as normal monsters.
export const EARLY_BOSS_WORD_LENGTH_CAP = 14;
export const EARLY_BOSS_WAVES = 2;

// From this wave a vocabulary boss comes from the hard list this often; before
// it, waves 3–4 pick evenly across the medium and hard lists (about 3 in 8 hard).
export const HARD_BOSS_LEAN_WAVE = 5;
export const HARD_BOSS_SHARE = 0.7;

export function hardBossShare(wave) {
  return wave >= HARD_BOSS_LEAN_WAVE ? HARD_BOSS_SHARE : null;
}

// [fewest, most] hard words slipped into the second half of waves 1–4.
export const HARD_GUEST_COUNTS = [[0, 0], [1, 1], [1, 2], [1, 2]];

const typedLengths = new WeakMap();

// What the player types: the term without spaces or punctuation.
export function typedLength(entry) {
  if (!typedLengths.has(entry)) typedLengths.set(entry, buildSearchPrompt(entry.term).length);
  return typedLengths.get(entry);
}

export function normalPromptLengthCap(wave) {
  return NORMAL_PROMPT_LENGTH_CAPS[wave - 1] ?? NORMAL_PROMPT_LENGTH_CAPS.at(-1);
}

export function bossWordLengthCap(wave) {
  return wave <= EARLY_BOSS_WAVES ? EARLY_BOSS_WORD_LENGTH_CAP : Infinity;
}

// Previews obey exactly the same limit as other minions.
export function previewLengthCap(wave) {
  return normalPromptLengthCap(wave);
}

export function withinLength(entries, cap) {
  if (cap === Infinity) return entries;
  return entries.filter((entry) => typedLength(entry) <= cap);
}

export function hardGuestCount(wave, random = Math.random) {
  const range = HARD_GUEST_COUNTS[wave - 1];
  if (!range) return 0;
  return range[0] + Math.floor(random() * (range[1] - range[0] + 1));
}

// Per-wave boss pressure. Each row applies from that wave until the next row.
// maxLive (A): how many bosses may be alive at once.
// total (B): how many bosses the wave sends (vocab bosses + one equation).
// hintLetters (C): leading letters shown on the hidden word.
// hitsPerUnit: rocks that cost one life unit (half a heart); 2 → ¼ heart, 1 → ½.
export const BOSS_WAVE_TABLE = [
  { fromWave: 1, maxLive: 1, total: 3, hintLetters: 3, hitsPerUnit: 2 },
  { fromWave: 2, maxLive: 2, total: 3, hintLetters: 2, hitsPerUnit: 2 },
  { fromWave: 3, maxLive: 2, total: 4, hintLetters: 1, hitsPerUnit: 2 },
  { fromWave: 4, maxLive: 3, total: 5, hintLetters: 1, hitsPerUnit: 2 },
  { fromWave: 7, maxLive: 3, total: 6, hintLetters: 1, hitsPerUnit: 1 },
  { fromWave: 10, maxLive: 3, total: 12, hintLetters: 1, hitsPerUnit: 1 },
];

export function bossWaveTier(wave) {
  return [...BOSS_WAVE_TABLE].reverse().find(tier => wave >= tier.fromWave) || BOSS_WAVE_TABLE[0];
}

export function maxLiveBosses(wave) {
  return bossWaveTier(wave).maxLive;
}

export function bossesPerWave(wave) {
  return bossWaveTier(wave).total;
}

export function bossHintLetters(wave) {
  return bossWaveTier(wave).hintLetters;
}

// Limit the actual answer, independently of the full vocabulary or equation.
export function bossAnswerLengthCap(wave) {
  return wave <= EARLY_BOSS_WAVES ? 14 : 16;
}

// Bosses gain a little walking pressure each wave, up to the wave 10 finale.
export function bossSpeedMultiplier(wave) {
  return 1.05 + Math.min(9, Math.max(0, wave - 1)) * 0.02;
}

// Seconds a boss walks in before it reaches revealZ. The question is already
// typeable during this approach; rocks wait until the boss arms at revealZ.
export const BOSS_APPROACH_TIME = 4;

// Boss rocks. A boss throws its first rock soon after it arms, then one every
// BOSS_ROCK_INTERVAL seconds. Rock damage by wave is hitsPerUnit in BOSS_WAVE_TABLE.
export const BOSS_FIRST_ROCK_DELAY = 1.5;
export const BOSS_ROCK_INTERVAL = 3.0;

export function bossRockTier(wave) {
  const tier = bossWaveTier(wave);
  return { fromWave: tier.fromWave, interval: BOSS_ROCK_INTERVAL, hitsPerUnit: tier.hitsPerUnit };
}
