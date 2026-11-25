// chapters.js — the five places the route passes through, two waves each, and the
// light and colour of each one. A chapter names the scenery kit that stages.js builds
// from; `variant` is 0 for a chapter's first wave and 1 for its second.

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
    pathMarkerColor: 0xe9a45c, pathMarkerEmissive: 0x9a5a20,
    leafColors: [0x7f9e2e, 0x9bb23a, 0x5f8428], trunkColor: 0xa85a26,
    moonColor: 0xfff4d6, starOpacity: 0,
    groundPath: { h: 0.105, s: 0.52, lBase: 0.56 },
    groundAlt1: { h: 0.16, s: 0.55, l: 0.44 },
    groundGrass: { h: 0.215, s: 0.6, l: 0.36 },
  },
  { // Summer: moonlit night, deep greens, cool stone road
    name: 'summer',
    bgColor: 0x2c4c8a, fogColor: 0x2a4476, fogNear: 42, fogFar: 118, skyTop: 0x0c1740,
    hemiSky: 0x7f9fe0, hemiGround: 0x2a4a34, hemiIntensity: 0.9,
    sunColor: 0xd6e4ff, sunIntensity: 1.5,
    emberColor: 0xffcc30, emberIntensity: 2.2,
    pathMarkerColor: 0x58dfcf, pathMarkerEmissive: 0x0e6861,
    leafColors: [0x2f8a4a, 0x43a058, 0x1f6a3c], trunkColor: 0x7a4a26,
    moonColor: 0xfff1b8, starOpacity: 0.55,
    groundPath: { h: 0.1, s: 0.22, lBase: 0.46 },
    groundAlt1: { h: 0.3, s: 0.45, l: 0.38 },
    groundGrass: { h: 0.36, s: 0.5, l: 0.3 },
  },
  { // Autumn: amber dusk under a mauve sky, red and gold leaves
    name: 'autumn',
    bgColor: 0xf0b070, fogColor: 0xe2a264, fogNear: 42, fogFar: 118, skyTop: 0x7a5690,
    hemiSky: 0xf0cf98, hemiGround: 0x8a4a24, hemiIntensity: 0.85,
    sunColor: 0xffb060, sunIntensity: 1.5,
    emberColor: 0xff4818, emberIntensity: 2.2,
    pathMarkerColor: 0xe87830, pathMarkerEmissive: 0xa83808,
    leafColors: [0xc8501a, 0xe08a1c, 0xd6aa28], trunkColor: 0x6a3418,
    moonColor: 0xffe0a8, starOpacity: 0.12,
    groundPath: { h: 0.09, s: 0.45, lBase: 0.5 },
    groundAlt1: { h: 0.06, s: 0.55, l: 0.42 },
    groundGrass: { h: 0.11, s: 0.52, l: 0.38 },
  },
  { // Winter: pale snowfields in blue dusk, frosted trees
    name: 'winter',
    bgColor: 0x8fa8c8, fogColor: 0xbccadd, fogNear: 40, fogFar: 112, skyTop: 0x334c7c,
    hemiSky: 0xd8e4f8, hemiGround: 0x7a8aa0, hemiIntensity: 0.72,
    sunColor: 0xdde8ff, sunIntensity: 1.1,
    emberColor: 0x6888ff, emberIntensity: 2.0,
    pathMarkerColor: 0x88ccff, pathMarkerEmissive: 0x3870d0,
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
  bgColor: 0x2a1a5e, fogColor: 0x1c1244, fogNear: 40, fogFar: 112, skyTop: 0x070418,
  hemiSky: 0x9a88e8, hemiGround: 0x2a1e4a, hemiIntensity: 0.85,
  sunColor: 0xd6c4ff, sunIntensity: 1.35,
  emberColor: 0xc060ff, emberIntensity: 2.2,
  pathMarkerColor: 0xe040fb, pathMarkerEmissive: 0x8a1aa8,
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
  bgColor: 0x0d0907, fogColor: 0x150e0a, fogNear: 18, fogFar: 78, skyTop: 0x050302,
  hemiSky: 0xffcf9c, hemiGround: 0x4a3020, hemiIntensity: 0.82,
  sunColor: 0xffbf85, sunIntensity: 0.95,
  emberColor: 0xff7a30, emberIntensity: 2.4,
  pathMarkerColor: 0xe87830, pathMarkerEmissive: 0xa83808,
  leafColors: [0xc8501a, 0xe08a1c, 0xd6aa28], trunkColor: 0x6a3418,
  moonColor: 0xffe0a8, starOpacity: 0,
  groundPath: { h: 0.075, s: 0.3, lBase: 0.4 },
  groundAlt1: { h: 0.06, s: 0.2, l: 0.3 },
  groundGrass: { h: 0.07, s: 0.18, l: 0.26 },
};

const [SPRING, SUMMER, AUTUMN, WINTER] = SEASON_PALETTES;

// `titles` are shown as a banner when the camera arrives; a missing second title means
// the second wave stays in the same place.
export const CHAPTERS = [
  { kit: 'meadow', palettes: [SPRING, SPRING], titles: ['The Meadow'] },
  { kit: 'forest', palettes: [SUMMER, SUMMER], titles: ['The River Wood'] },
  { kit: 'mountain', palettes: [AUTUMN, MINE_PALETTE], titles: ['The Mountain Pass', 'The Crystal Mine'] },
  { kit: 'winter', palettes: [WINTER, WINTER], titles: ['The Frozen Lake', 'The Storm Tower'] },
  { kit: 'sky', palettes: [FINAL_WAVE_PALETTE, FINAL_WAVE_PALETTE], titles: ['The Night Sky'] },
];

export const WAVES_PER_CHAPTER = 2;

export function chapterForWave(wave) {
  const step = Math.max(0, Math.floor(wave) - 1);
  const index = Math.min(CHAPTERS.length - 1, Math.floor(step / WAVES_PER_CHAPTER));
  const variant = index === CHAPTERS.length - 1 ? Math.min(1, step - index * WAVES_PER_CHAPTER) : step % WAVES_PER_CHAPTER;
  const chapter = CHAPTERS[index];
  return {
    index,
    variant,
    kit: chapter.kit,
    palette: chapter.palettes[variant],
    title: chapter.titles[variant] || null,
  };
}
