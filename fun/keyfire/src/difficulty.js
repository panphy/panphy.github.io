// difficulty.js — how long a keyword may be, and each boss fight. The tables are indexed
// by a difficulty step from 1 to 10, not by wave: the game's five waves use steps 1, 3,
// 5, 7, 9 for their monsters and 2, 4, 6, 8, 10 for their bosses (monsterLevel and
// bossLevel in main.js), so some rows are steps the game passes over.
import { buildSearchPrompt } from './prompt-utils.js?v=17';

// Longest prompt, in typed characters, that a normal monster, healer or chest may
// ask at steps 1, 2, 3… Later steps keep the final cap.
export const NORMAL_PROMPT_LENGTH_CAPS = [11, 12, 12, 13, 13, 14];

// The longest word any monster carries: a caster's, two letters over the final cap.
// Longer terms belong to the bosses' word stages (longTerm in BOSS_PLAN_TABLE).
export const LONGEST_MONSTER_WORD = NORMAL_PROMPT_LENGTH_CAPS.at(-1) + 2;

// [fewest, most] hard words slipped into the second half of a wave at steps 1–4.
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
  return entries.filter((entry) => typedLength(entry) <= cap);
}

export function hardGuestCount(wave, random = Math.random) {
  const range = HARD_GUEST_COUNTS[wave - 1];
  if (!range) return 0;
  return range[0] + Math.floor(random() * (range[1] - range[0] + 1));
}

// Bosses: one per wave, fought in stages. First come stages of single words, typed
// one at a time like monsters' words; then the finishing blow, one or two whole
// statements (BOSS_PHRASES). The last boss ends with a short story instead
// (BOSS_STORIES). Each stage, statement or story line takes a segment off the
// health bar. Between words the player can shatter the rocks the boss throws.
// stages: words in each word stage; the last of each is a long term, a phrase of more
// letters than any monster carries (LONGEST_MONSTER_WORD) and at most longTerm.
// finishers: statements at the end (two at most).
// story: end with a story instead. maxLetters: longest statement, letters only.
// attackGap: seconds between throws. rockFlight: seconds a rock takes to arrive.
// rockDamage: life units (half hearts) lost to a rock that lands.
// satellites: a stage with one core word, shielded until that many satellites are shot down.
// beamDamage, beamLettersPerSecond, beamGrace: during a story line the boss charges a beam
// that fires (beamDamage) unless the line is typed in time (see beamChargeTime).
export const BOSS_PLAN_TABLE = [
  { fromWave: 1, stages: [3], longTerm: 18, finishers: 1, maxLetters: 32, attackGap: 6.0, rockFlight: 3.4, rockDamage: 1 },
  { fromWave: 2, stages: [3, 3], longTerm: 18, finishers: 1, maxLetters: 34, attackGap: 5.4, rockFlight: 3.2, rockDamage: 1 },
  { fromWave: 3, stages: [3, 4], longTerm: 19, finishers: 1, maxLetters: 36, attackGap: 5.0, rockFlight: 3.0, rockDamage: 1 },
  { fromWave: 5, stages: [4, 4], longTerm: 22, finishers: 1, maxLetters: 42, attackGap: 4.6, rockFlight: 2.8, rockDamage: 1 },
  { fromWave: 7, stages: [4, 5], longTerm: 26, finishers: 2, maxLetters: 46, attackGap: 4.2, rockFlight: 2.6, rockDamage: 1 },
  // The last boss: four words under comets, one statement under splitting comets, a
  // core word behind a shield of satellites, then a story raced against its beam.
  { fromWave: 10, stages: [4], longTerm: 34, finishers: 1, satellites: 3, story: true, maxLetters: 40, attackGap: 5.0, rockFlight: 3.0, rockDamage: 1,
    beamDamage: 2, beamLettersPerSecond: 2.2, beamGrace: 4 },
];

export function bossPlan(wave) {
  return [...BOSS_PLAN_TABLE].reverse().find(row => wave >= row.fromWave) || BOSS_PLAN_TABLE[0];
}

// The order of a boss fight, stage by stage: word stages, then statements, then the
// shielded core word, then the story. Each entry is one segment of the health bar,
// apart from the story, whose lines are one segment each.
export function bossFightOrder(plan) {
  const order = plan.stages.map(count => ({ kind: 'words', count }));
  for (let index = 0; index < plan.finishers; index += 1) order.push({ kind: 'line' });
  if (plan.satellites) order.push({ kind: 'core', satellites: plan.satellites });
  if (plan.story) order.push({ kind: 'story' });
  return order;
}

// Seconds the boss's beam takes to charge over a story line of the given letters.
export function beamChargeTime(plan, letters) {
  if (!plan.beamLettersPerSecond) return Infinity;
  return letters / plan.beamLettersPerSecond + plan.beamGrace;
}

// Monsters with a behaviour of their own, by wave (1 to 5): how many of the wave's
// monsters carry a shield (two words), split in two when beaten, or stand back and
// cast. The meadow has none: it is where the player learns to type at monsters.
const VARIANT_COUNTS = [
  { shield: 0, splitter: 0, caster: 0 },
  { shield: 2, splitter: 0, caster: 0 },
  { shield: 2, splitter: 2, caster: 0 },
  { shield: 2, splitter: 2, caster: 2 },
  { shield: 3, splitter: 2, caster: 3 },
];

export function variantCounts(wave) {
  return VARIANT_COUNTS[Math.min(VARIANT_COUNTS.length, Math.max(1, Math.floor(wave))) - 1];
}

// Which of a wave's monsters (by spawn order, from 0) are variants. The first monster
// of a wave and the slots in `taken` stay plain.
export function planVariants(wave, target, taken = [], random = Math.random) {
  const counts = variantCounts(wave);
  const free = [];
  for (let index = 1; index < target; index += 1) if (!taken.includes(index)) free.push(index);
  for (let index = free.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    [free[index], free[swap]] = [free[swap], free[index]];
  }
  const plan = new Map();
  for (const kind of ['caster', 'shield', 'splitter']) {
    for (let count = 0; count < counts[kind] && free.length > 0; count += 1) plan.set(free.pop(), kind);
  }
  return plan;
}
