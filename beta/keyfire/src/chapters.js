// chapters.js — the five places the route passes through, one wave each, and the
// light and colour of each one. A chapter names the scenery kit that stages.js builds from.

// The palettes' ground colours are scaled down so the road stays moody under the bright sun and sky lights.
export const GROUND_TONE = 0.8;

export const SEASON_PALETTES = [
  // Light levels stay modest in every season so sunlit ground does not cross the bloom threshold.
  { // Spring: paper-warm daylight, olive trees, sand road
    name: 'spring',
    bgColor: 0x9fd4c2, fogColor: 0xe6d6a4, fogNear: 42, fogFar: 118, skyTop: 0x3fa596,
    hemiSky: 0xd8ecd8, hemiGround: 0x9a7a44, hemiIntensity: 0.85,
    sunColor: 0xffe9bd, sunIntensity: 1.55,
    emberColor: 0xffc078, emberIntensity: 1.6,
    leafColors: [0x7f9e2e, 0x9bb23a, 0x5f8428], trunkColor: 0xa85a26,
    moonColor: 0xfff4d6, starOpacity: 0,
    groundPath: { h: 0.105, s: 0.52, lBase: 0.56 },
    groundAlt1: { h: 0.16, s: 0.55, l: 0.44 },
    groundGrass: { h: 0.215, s: 0.6, l: 0.36 },
  },
  { // Summer: moonlit night, deep greens, cool stone road
    name: 'summer',
    bgColor: 0x405e9a, fogColor: 0x354e80, fogNear: 22, fogFar: 105, skyTop: 0x101c42,
    hemiSky: 0x99b6f2, hemiGround: 0x54577f, hemiIntensity: 0.86,
    sunColor: 0xabcaff, sunIntensity: 1.2,
    emberColor: 0xffcc30, emberIntensity: 2.2,
    leafColors: [0x286461, 0x3d736d, 0x244f5b], trunkColor: 0x604b50,
    moonColor: 0xfff1b8, starOpacity: 0.55,
    groundPath: { h: 0.64, s: 0.23, lBase: 0.24 },
    groundAlt1: { h: 0.46, s: 0.5, l: 0.19 },
    groundGrass: { h: 0.48, s: 0.55, l: 0.17 },
  },
  { // Autumn: amber dusk under a mauve sky, red and gold leaves
    name: 'autumn',
    bgColor: 0xf0b070, fogColor: 0xe2a264, fogNear: 42, fogFar: 118, skyTop: 0x7a5690,
    hemiSky: 0xf0cf98, hemiGround: 0x8a4a24, hemiIntensity: 0.85,
    sunColor: 0xffb060, sunIntensity: 1.5,
    emberColor: 0xff4818, emberIntensity: 2.2,
    leafColors: [0xc8501a, 0xe08a1c, 0xd6aa28], trunkColor: 0x6a3418,
    moonColor: 0xffe0a8, starOpacity: 0.12,
    groundPath: { h: 0.09, s: 0.45, lBase: 0.5 },
    groundAlt1: { h: 0.06, s: 0.55, l: 0.42 },
    groundGrass: { h: 0.11, s: 0.52, l: 0.38 },
  },
  { // Winter: pale snowfields in blue dusk, frosted trees
    name: 'winter',
    bgColor: 0x6e89b0, fogColor: 0x98acc9, fogNear: 40, fogFar: 112, skyTop: 0x29385b,
    hemiSky: 0xd8e4f8, hemiGround: 0x7a8aa0, hemiIntensity: 0.72,
    sunColor: 0xdde8ff, sunIntensity: 1.1,
    emberColor: 0x6888ff, emberIntensity: 2.0,
    leafColors: [0xd6e2f0, 0xe6eef8, 0xb8cbe2], trunkColor: 0x5e4c46,
    moonColor: 0xfff1d8, starOpacity: 0.35,
    groundPath: { h: 0.6, s: 0.14, lBase: 0.56 },
    groundAlt1: { h: 0.58, s: 0.3, l: 0.62 },
    groundGrass: { h: 0.6, s: 0.25, l: 0.7 },
  },
];

// The last chapter leaves the seasons behind: a violet night among the stars, with dark stone underfoot.
export const FINAL_WAVE_PALETTE = {
  name: 'final',
  bgColor: 0x34275b, fogColor: 0x292443, fogNear: 40, fogFar: 112, skyTop: 0x070418,
  hemiSky: 0x9a88e8, hemiGround: 0x2a1e4a, hemiIntensity: 0.85,
  sunColor: 0xd6c4ff, sunIntensity: 1.35,
  emberColor: 0xc060ff, emberIntensity: 2.2,
  leafColors: [0x4a3c8c, 0x5c4aa6, 0x362a6c], trunkColor: 0x2c2240,
  moonColor: 0xf3e8ff, starOpacity: 1,
  groundPath: { h: 0.72, s: 0.22, lBase: 0.4 },
  groundAlt1: { h: 0.8, s: 0.4, l: 0.36 },
  groundGrass: { h: 0.72, s: 0.34, l: 0.27 },
};

// Under the mountain there is no sky: close, warm darkness lit by torches and crystals.
export const MINE_PALETTE = {
  name: 'mine',
  indoor: true,
  bgColor: 0x282138, fogColor: 0x30263f, fogNear: 18, fogFar: 78, skyTop: 0x141120,
  hemiSky: 0xd7c7f0, hemiGround: 0x614963, hemiIntensity: 0.91,
  sunColor: 0xffbf85, sunIntensity: 0.95,
  emberColor: 0xff7a30, emberIntensity: 2.4,
  leafColors: [0xc8501a, 0xe08a1c, 0xd6aa28], trunkColor: 0x6a3418,
  moonColor: 0xffe0a8, starOpacity: 0,
  groundPath: { h: 0.69, s: 0.16, lBase: 0.34 },
  groundAlt1: { h: 0.06, s: 0.2, l: 0.3 },
  groundGrass: { h: 0.07, s: 0.18, l: 0.26 },
};

const [SPRING, SUMMER, AUTUMN, WINTER] = SEASON_PALETTES;

// One wave per chapter. `boss` names the model that guards it. A chapter with a
// `late` part changes palette and title partway along its route, where the stage
// says (the mountain pass runs into the mine).
export const CHAPTERS = [
  { kit: 'meadow', palette: SPRING, title: 'The Meadow', boss: 'Verdant Colossus' },
  { kit: 'forest', palette: SUMMER, title: 'The River Wood', boss: 'Crimson Bulwark', setPiece: 'bridge' },
  { kit: 'mountain', palette: AUTUMN, title: 'The Mountain Pass', boss: 'Magma Sovereign', late: { palette: MINE_PALETTE, title: 'The Crystal Mine' }, setPiece: 'cart' },
  { kit: 'winter', palette: WINTER, title: 'The Frozen Lake', boss: 'Glacial Titan', setPiece: 'blizzard' },
  { kit: 'sky', palette: FINAL_WAVE_PALETTE, title: 'The Night Sky', boss: 'Stellar Dreadnought', setPiece: 'flight' },
];

export const WAVE_COUNT = CHAPTERS.length;

export function chapterForWave(wave) {
  const index = Math.min(CHAPTERS.length - 1, Math.max(0, Math.floor(wave) - 1));
  return CHAPTERS[index];
}
