// difficulty.js — how long a keyword may be on each wave. The reasoning and the
// full progression table are in fun/spellwave/README.md; keep the two in step.
import { buildSearchPrompt } from './prompt-utils.js';

// Longest prompt, in typed characters, that a normal monster, healer or chest may
// ask on waves 1, 2, 3… Late waves keep the final cap.
export const NORMAL_PROMPT_LENGTH_CAPS = [11, 12, 12, 13, 13, 14];

// Early vocabulary bosses use compact terms. Only terms that also fit the
// minion cap are previewed as normal monsters.
export const EARLY_BOSS_WORD_LENGTH_CAP = 14;
export const EARLY_BOSS_WAVES = 2;

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

// Limit the actual answer, independently of the full vocabulary or equation.
export function bossAnswerLengthCap(wave) {
  return wave <= EARLY_BOSS_WAVES ? 14 : 16;
}
