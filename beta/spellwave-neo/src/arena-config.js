// Spellwave Neo — arena boss fight numbers and roster.
// Pure data/helpers: no DOM, no THREE. Keep in step with beta/spellwave-neo/README.md.

export const ARENA_ORB_DAMAGE = 1; // half a heart (one life unit)
export const ARENA_DISPEL_CHIP = 1;
export const ARENA_MINION_CHIP = 1;
export const ARENA_DISPEL_SCORE = 120;
export const ARENA_CLEAR_BONUS = [0, 400, 450, 500, 600, 700, 800, 900, 1000, 1100, 1500];
export const ARENA_HEAD_BONUS = 250;

// Per-wave arena profile. HP chips come from correct dispels and minion kills.
export const ARENA_WAVES = [
  null, // 1-indexed
  { hp: 8, orbs: 5, minions: 5, fuse: 8.0, gap: 2.5, options: 2, equations: 1, liveMinions: 2 },
  { hp: 9, orbs: 5, minions: 6, fuse: 7.5, gap: 2.3, options: 2, equations: 1, liveMinions: 2 },
  { hp: 10, orbs: 6, minions: 6, fuse: 7.0, gap: 2.2, options: 2, equations: 1, liveMinions: 2 },
  { hp: 12, orbs: 6, minions: 8, fuse: 6.5, gap: 2.0, options: 3, equations: 2, liveMinions: 3 },
  { hp: 13, orbs: 7, minions: 8, fuse: 6.0, gap: 1.9, options: 3, equations: 2, liveMinions: 3 },
  { hp: 14, orbs: 7, minions: 9, fuse: 5.8, gap: 1.8, options: 3, equations: 2, liveMinions: 3 },
  { hp: 15, orbs: 8, minions: 10, fuse: 5.5, gap: 1.7, options: 3, equations: 2, liveMinions: 3 },
  { hp: 16, orbs: 8, minions: 11, fuse: 5.2, gap: 1.6, options: 3, equations: 2, liveMinions: 3 },
  { hp: 17, orbs: 9, minions: 12, fuse: 5.0, gap: 1.5, options: 3, equations: 3, liveMinions: 3 },
  { hp: 24, orbs: 12, minions: 14, fuse: 5.0, gap: 1.4, options: 3, equations: 3, liveMinions: 3, heads: 3, segmentHp: 8 },
];

// Boss type names must match BOSS_TYPES in main.js / lowpoly-creatures builders.
export const ARENA_ROSTER = [
  null,
  'Crimson Bulwark',
  'Verdant Colossus',
  'Storm Warden',
  'Solar Anvil',
  'Glacial Titan',
  'Magma Sovereign',
  'Void Specter',
  'Phantom Rift',
  'Celestial Arbiter',
  ['Crimson Bulwark', 'Void Specter', 'Celestial Arbiter'],
];

export function arenaProfile(wave) {
  return ARENA_WAVES[wave] || ARENA_WAVES.at(-1);
}

export function arenaRosterNames(wave) {
  const entry = ARENA_ROSTER[wave] || ARENA_ROSTER.at(-1);
  return Array.isArray(entry) ? entry : [entry];
}

export function arenaClearBonus(wave) {
  return ARENA_CLEAR_BONUS[wave] ?? ARENA_CLEAR_BONUS.at(-1);
}

export function speedDispelBonus(fuseLeft, fuseMax) {
  if (fuseMax <= 0) return 0;
  return fuseLeft / fuseMax >= 0.5 ? 40 : 0;
}
