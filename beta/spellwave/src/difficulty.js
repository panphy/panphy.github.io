// difficulty.js — how long a keyword may be on each wave, and each wave's boss fight.
import { buildSearchPrompt } from './prompt-utils.js?v=beta8';

// Longest prompt, in typed characters, that a normal monster, healer or chest may
// ask on waves 1, 2, 3… Late waves keep the final cap.
export const NORMAL_PROMPT_LENGTH_CAPS = [11, 12, 12, 13, 13, 14];

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

export function withinLength(entries, cap) {
  if (cap === Infinity) return entries;
  return entries.filter((entry) => typedLength(entry) <= cap);
}

export function hardGuestCount(wave, random = Math.random) {
  const range = HARD_GUEST_COUNTS[wave - 1];
  if (!range) return 0;
  return range[0] + Math.floor(random() * (range[1] - range[0] + 1));
}

// Bosses: one per wave. A boss shows whole statements (BOSS_PHRASES); each one
// typed takes a segment off its health bar. Between words the player can shatter
// the rocks it throws, each marked with a short unit.
// lines: segments on the health bar. maxLetters: longest statement, letters only.
// attackGap: seconds between throws. rockFlight: seconds a rock takes to arrive.
// rockDamage: life units (half hearts) lost to a rock that lands.
export const BOSS_PLAN_TABLE = [
  { fromWave: 1, lines: 3, maxLetters: 32, attackGap: 6.0, rockFlight: 3.4, rockDamage: 1 },
  { fromWave: 2, lines: 3, maxLetters: 34, attackGap: 5.4, rockFlight: 3.2, rockDamage: 1 },
  { fromWave: 3, lines: 4, maxLetters: 36, attackGap: 5.0, rockFlight: 3.0, rockDamage: 1 },
  { fromWave: 5, lines: 4, maxLetters: 42, attackGap: 4.6, rockFlight: 2.8, rockDamage: 1 },
  { fromWave: 7, lines: 5, maxLetters: 46, attackGap: 4.2, rockFlight: 2.6, rockDamage: 2 },
  { fromWave: 10, lines: 8, maxLetters: 50, attackGap: 3.6, rockFlight: 2.5, rockDamage: 2 },
];

export function bossPlan(wave) {
  return [...BOSS_PLAN_TABLE].reverse().find(row => wave >= row.fromWave) || BOSS_PLAN_TABLE[0];
}
