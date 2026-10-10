import * as THREE from 'three';
import { createSpellwaveAudio } from './audio.js';
import { createSeasonalEffects } from './seasonal-effects.js';
import { createPotionSystem } from './potions.js';
import { ALL_WORDS, EASY_WORDS, HARD_WORDS, MEDIUM_WORDS, EQUATION_WORDS } from './question-bank.js';
import { createEndingFX } from './ending-fx.js';
import { createLeaderboard } from './leaderboard.js';
import { createEnemyMesh, createMimicChestMesh } from './enemy-meshes.js';
import { normalPromptLengthCap, bossAnswerLengthCap, bossWordLengthCap, previewLengthCap, withinLength, hardGuestCount } from './difficulty.js?v=20261010-startfix';
import { createLowPolyTerrain, createLowPolyTree, createLowPolyRock, createLowPolyCloud } from './lowpoly.js';
import { createVisuals, GLOW_GAIN, MOON_GLOW_GAIN } from './visuals.js';
import { pickTarget, getInputCharacters, isMathOperatorInput, buildSearchPrompt, buildAltSearchPrompts, buildHintMask, getBossQuestionHintRange, escapeHtml, wrapSups, buildHintPart, buildBossPrompt, promptIndexForProgress } from './prompt-utils.js?v=20261010-startfix';

const canvas = document.getElementById('gameCanvas');
const labelsLayer = document.getElementById('labelsLayer');
const scoreValue = document.getElementById('scoreValue');
const bestValue = document.getElementById('bestValue');
const healthValue = document.getElementById('healthValue');
const waveValue = document.getElementById('waveValue');
const phaseValue = document.getElementById('phaseValue');
const typedValue = document.getElementById('typedValue');
const comboValue = document.getElementById('comboValue');
const typingStrip = document.querySelector('.typing-strip');
const gameBar = document.querySelector('.game-bar');
const moonHaze = document.querySelector('.moon-haze');
const startButton = document.getElementById('startButton');
const audioButton = document.getElementById('audioButton');
const pauseButton = document.getElementById('pauseButton');
const fullscreenButton = document.getElementById('fullscreenButton');
const batterySaverButton = document.getElementById('batterySaverButton');
const messagePanel = document.getElementById('messagePanel');
const messageKicker = document.getElementById('messageKicker');
const messageTitle = document.getElementById('messageTitle');
const messageScore = document.getElementById('messageScore');
const messageCopy = document.getElementById('messageCopy');
const supportLink = document.getElementById('supportLink');
const keyboardInput = document.getElementById('keyboardInput');
const damageFlash = document.getElementById('damageFlash');
const lightningFlash = document.getElementById('lightningFlash');
let godModeBadge = null; // created dynamically on activation, never in static HTML
const typingLabel = document.getElementById('typingLabel');
const runGlossary = document.getElementById('runGlossary');
const bossBanner = document.getElementById('bossBanner');
const potionBar = document.getElementById('potionBar');
const potionSlots = document.querySelectorAll('.potion-slot');
const gameEnding = document.getElementById('gameEnding');
const endingFlash = document.getElementById('endingFlash');
const endingContent = document.getElementById('endingContent');
const endingCanvasEl = document.getElementById('endingCanvas');
const endingReplay = document.getElementById('endingReplay');
const endingSkip = document.getElementById('endingSkip');
let endingFX = null;
const endScore = document.getElementById('endScore');
const endAccuracy = document.getElementById('endAccuracy');
const endStreak = document.getElementById('endStreak');
const endMimics = document.getElementById('endMimics');
const endHealth = document.getElementById('endHealth');
const endTime = document.getElementById('endTime');

const STORAGE_KEY = 'panphySpellwaveBestV1';
const AUDIO_STORAGE_KEY = 'panphySpellwaveAudioV1';
const MAX_DELTA = 0.06;
const IDLE_FRAME_INTERVAL = 100; // ~10 fps when not actively playing
const WALL_Z = 4.6;
const SPAWN_Z = -48;
const FIRST_WAVE_SPAWN_Z = -34;
const SPAWN_SPREAD = 10;
const FIRST_WAVE_SPAWN_SPREAD = 4;
const HEART_COUNT = 5;
const MAX_LIFE = HEART_COUNT * 2;
// Two hearts or fewer: the music darkens and a heartbeat joins it.
const LOW_LIFE_MUSIC_THRESHOLD = 4;
const MINION_DAMAGE = 2;
const BOSS_CONTACT_DAMAGE = MAX_LIFE;
const BOSS_SHOTS_PER_DAMAGE = 2;
const BOSS_SHOT_DAMAGE = 1;
// Tuned so rocks alone take slightly longer to kill a full-health player than a
// boss takes to walk from reveal to the wall — a boss leak must stay reachable.
const BOSS_FIRST_SHOT_DELAY = 3.4;
const BOSS_SHOT_INTERVAL = 6.0;
const BOSS_ROCK_FLIGHT_TIME = 1.45;
const BOSS_ROCK_ARC_HEIGHT = 2.3;
const MAX_CONCURRENT_BOSS_PROJECTILES = 2;
const MIN_PROJECTILE_SPACING = 2.6;
const BOSSES_PER_WAVE = 3;
const FINAL_WAVE_NUMBER = 10;
const FINAL_WAVE_BOSS_COUNT = 10;
const COSMIC_WAVE_THRESHOLD = 99149236;
const MEDIC_HEAL_AMOUNT = 2;
const EMBER_HEIGHT_DELTAS = 1819600217;
const PARTICLE_GRAVITY_COEFFS = 2242416284;
const GAME_PROFILE = {
  phaseLabel: 'Spellwave',
  enemyLimit: 11,
  speedMultiplier: 0.94,
  waveSpeedBonus: 0.075,
  spawnBase: 2.45,
  spawnGrowth: 0.04,
  spawnJitter: 0.5,
  spawnMin: 1.05,
  bossWarningDelay: 1.0,
  bossSpawnGap: 6.0,
  revealZ: -40,
};
const NORMAL_ENEMY_TARGETS = [7, 8, 10, 11, 12, 13, 14, 15, 16, 16];
const NORMAL_TYPING_BUDGETS = [58, 68, 80, 92, 104, 116, 128, 140, 152, 164];
const ACTIVE_TYPING_PRESSURE_BASE = 36;
const ACTIVE_TYPING_PRESSURE_GROWTH = 4;
const ACTIVE_TYPING_PRESSURE_MAX = 58;
const LONG_ACTIVE_PROMPT_COST = 13;
const ACTIVE_LONG_PROMPT_LIMIT = 2;
const LATE_ACTIVE_LONG_PROMPT_LIMIT = 2;
const SPAWN_COST_BASELINE = 7;
const SPAWN_COST_DELAY_MAX = 1.85;
const SUPPORT_SPAWN_DELAY_MIN = 0.75;
const LABEL_SAFE_MARGIN = 12;
const LABEL_STACK_GAP = 8;
const LABEL_X_EASE = 0.14;
const LABEL_Y_EASE = 0.07;
const BOSS_LABEL_GAP = 16;
const PATH_LANES = [-5.8, -3.7, -1.7, 0, 1.7, 3.7, 5.8];
const PATH_MARKER_MIN_Z = -44;
const PATH_MARKER_MAX_Z = 4;
const PATH_MARKER_SPACING = 6;
const PATH_MARKER_SPAN = PATH_MARKER_MAX_Z - PATH_MARKER_MIN_Z + PATH_MARKER_SPACING;
const PATH_MARKER_BASE_Y = 0.08;
const TREE_MIN_Z = -58;
const TREE_MAX_Z = 18;
const TREE_SPAN = TREE_MAX_Z - TREE_MIN_Z;
const PATH_MARKER_WRAP_Z = 14;
const SCENERY_SCROLL_SPEED = 0.58;
const PATH_MARKER_SCROLL_MULTIPLIER = 1.0;
const ROAD_MIN_Z = -58;
const ROAD_MAX_Z = 16;
const ROAD_SPAN = ROAD_MAX_Z - ROAD_MIN_Z;
const ROAD_SCROLL_MULTIPLIER = 1.0;
const ENEMY_TYPES = [
  {
    name: 'Mudlug',
    body: 0x6d5137,
    trim: 0xa07b4f,
    eye: 0x58dfcf,
    speed: 2.15,
    scale: 0.94,
    weight: 6,
    score: 35,
  },
  {
    name: 'Glowmite',
    body: 0x235a50,
    trim: 0x54c46e,
    eye: 0xefc35c,
    speed: 2.75,
    scale: 0.9,
    weight: 4,
    score: 45,
  },
  {
    name: 'Ash Oaf',
    body: 0x393b40,
    trim: 0x6d7075,
    eye: 0xf26a3d,
    speed: 1.72,
    scale: 1.22,
    weight: 3,
    score: 55,
  },
  {
    name: 'Cinder Imp',
    body: 0x5e2322,
    trim: 0xf26a3d,
    eye: 0xf2f0df,
    speed: 3.25,
    scale: 0.85,
    weight: 2,
    score: 70,
  },
  {
    name: 'Bog Shambler',
    body: 0x2a1640,
    trim: 0x8b4fc8,
    eye: 0x78ff6e,
    speed: 2.0,
    scale: 1.06,
    weight: 3,
    score: 50,
  },
];
const MEDIC_TYPE = {
  name: 'Pulse Heart',
  isMedic: true,
  body: 0xff315f,
  trim: 0xff8fb3,
  eye: 0xf2f0df,
  speed: 8.4,
  scale: 0.92,
  weight: 0,
  score: 45,
};
const MIMIC_TYPE = {
  name: 'Mimic Chest',
  isMimic: true,
  body: 0xd4a020,
  trim: 0xffd040,
  eye: 0xef44fb,
  speed: 7.8,
  scale: 1.2,
  weight: 0,
  score: 0,
};

const BOSS_TYPES = [
  {
    name: 'Crimson Bulwark',
    isBoss: true,
    isFlying: true,
    body: 0x5b0614,
    trim: 0xff351f,
    eye: 0xfff05a,
    speed: 1.1,
    scale: 1.62,
    weight: 1,
    score: 150,
  },
  {
    name: 'Verdant Colossus',
    isBoss: true,
    body: 0x0e3b2f,
    trim: 0x2dd4bf,
    eye: 0xd9ff66,
    speed: 1.05,
    scale: 1.64,
    weight: 1,
    score: 150,
  },
  {
    name: 'Storm Warden',
    isBoss: true,
    body: 0x1f2a5f,
    trim: 0x70a5ff,
    eye: 0xf2f0df,
    speed: 1.14,
    scale: 1.6,
    weight: 1,
    score: 150,
  },
  {
    name: 'Solar Anvil',
    isBoss: true,
    isFlying: true,
    body: 0x4b2509,
    trim: 0xfbbf24,
    eye: 0x7dd3fc,
    speed: 1.08,
    scale: 1.66,
    weight: 1,
    score: 150,
  },
  {
    name: 'Glacial Titan',
    isBoss: true,
    body: 0x1a3045,
    trim: 0x9ee8ff,
    eye: 0xfff8b0,
    speed: 0.95,
    scale: 1.68,
    weight: 1,
    score: 150,
  },
  {
    name: 'Magma Sovereign',
    isBoss: true,
    body: 0x3d0a00,
    trim: 0xff6a00,
    eye: 0xffffff,
    speed: 1.08,
    scale: 1.63,
    weight: 1,
    score: 150,
  },
  {
    name: 'Void Specter',
    isBoss: true,
    isFlying: true,
    body: 0x08060f,
    trim: 0x00e5ff,
    eye: 0x00e5ff,
    speed: 1.18,
    scale: 1.58,
    weight: 1,
    score: 150,
  },
  {
    name: 'Celestial Arbiter',
    isBoss: true,
    isFlying: true,
    body: 0xf0f4ff,
    trim: 0xffd700,
    eye: 0x1a3aff,
    speed: 1.02,
    scale: 1.65,
    weight: 1,
    score: 150,
  },
  {
    name: 'Phantom Rift',
    isBoss: true,
    isFlying: true,
    body: 0x0a2a2a,
    trim: 0xe040fb,
    eye: 0xe040fb,
    speed: 1.13,
    scale: 1.61,
    weight: 1,
    score: 150,
  },
  {
    name: 'Stellar Dreadnought',
    isBoss: true,
    body: 0x050d1a,
    trim: 0xd4a017,
    eye: 0xffffff,
    speed: 0.92,
    scale: 1.72,
    weight: 1,
    score: 150,
  },
];
const HEART_PATH = 'M16 28.4C10.3 23.6 4.8 19 3.2 14.1C1.9 10 3.8 6.2 7.5 5.4C10.4 4.8 13.1 6.1 16 9.4C18.9 6.1 21.6 4.8 24.5 5.4C28.2 6.2 30.1 10 28.8 14.1C27.2 19 21.7 23.6 16 28.4Z';
const FLYING_SHADOW_OPACITY = 0.22;
const MOON_SHADOW_FADE_IN_RATE = 1.45;
const MOON_SHADOW_FADE_OUT_RATE = 4.8;
const INITIAL_MOON_ANGLE = Math.random() * Math.PI;
const CLOUD_WRAP_X = 46;
const CLOUD_RESET_X = -46;
// How far clouds take on the sky colour, so they dim at dusk and at night.
const CLOUD_SKY_TINT = 0.42;

// The palettes' ground colours are scaled down so the road stays moody under the bright sun and sky lights.
const GROUND_TONE = 0.8;

const SEASON_PALETTES = [
  // Light levels stay modest in every season so sunlit ground does not cross the bloom threshold.
  { // Spring (wave 1): paper-warm daylight, olive trees, sand road
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
  { // Summer (wave 2): moonlit night, deep greens, cool stone road
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
  { // Autumn (wave 3): amber dusk under a mauve sky, red and gold leaves
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
  { // Winter (wave 4): pale snowfields in blue dusk, frosted trees
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

// Wave 10 leaves the seasons behind: a violet night among the stars, with dark stone underfoot.
const FINAL_WAVE_PALETTE = {
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

const reusableVector = new THREE.Vector3();
const reusableVectorTwo = new THREE.Vector3();
const moonScreenVector = new THREE.Vector3();
const reusableQuaternion = new THREE.Quaternion();
const reusableMatrix = new THREE.Matrix4();
const cameraTarget = new THREE.Vector3(0, 1.1, -18);
const enemies = [];
const beams = [];
const debris = [];
const canopyBlocks = [];
const torchFlames = [];
const torchLights = [];
const wandGroups = [];
const wandSwings = [];
const lightningCrowns = [];
const pathMarkerBlocks = [];
const scrollingTrees = [];
const clouds = [];
const meteors = [];

let mode = 'idle';
let score = 0;
let bestScore = loadBestScore();
let health = MAX_LIFE;
let wandsArePrimed = false;
let gameTimeSeconds = 0;
let waveSet = 1;
let wavePhase = 'normal';
let normalEnemyTarget = getNormalEnemyTarget(waveSet);
let normalEnemiesSpawned = 0;
let normalTypingCostSpawned = 0;
let bossesSpawned = 0;
let bossSpawnTimer = 0;
let waveClearDelayTimer = 0;
let waveBossOrder = [];
let finalWaveQueue = [];
let finalWaveQueueIndex = 0;
let cosmicBuffer = [];
let bossWordsThisSet = [];
let previewableWordsThisSet = [];
let bossPreviewSchedule = new Map();
let hardGuestSchedule = new Map();
let introducedBossTermsThisSet = new Set();
let medicsSpawnedThisSet = 0;
let medicSpawnSlots = [];
let mimicsSpawnedThisSet = 0;
let mimicSpawnSlots = [];
let firstMimicHintShown = false;
let godMode = false;
let godModeUsedThisRun = false;
let potionCheatUsedThisRun = false;
let finalWaveCheatUsedThisRun = false;
let killedByBoss = false;
let inputTrace = '';
let streak = 0;
let peakStreak = 0;
let mimicsLooted = 0;
let typedBuffer = '';
let activeTarget = null;
let lastBossShotTime = -999;
let spawnTimer = 0;
let lastFrameTime = 0;
let lastIdleFrameTime = 0;
let rafId = null;
let isTimeoutScheduled = false;
let batterySaver = false;
const BATTERY_SAVER_STORAGE_KEY = 'spellwave_battery_saver_active';

let elapsed = 0;
let mistakeTimer = 0;
let damageTimer = 0;
let hudTimer = 0;
let renderedHealth = null;
let enemyId = 0;
let labelMeasureGen = 0; // bumped on resize; invalidates cached label dimensions
let pathMarkerMaterial = null;
let moon = null;
let moonAngle = INITIAL_MOON_ANGLE;
let moonWaitTimer = 0;
let moonShadowStrength = 1;
let moonLightBaseIntensity = 2.2;
let starField = null;
let typedAttempts = 0;
let mistakeCount = 0;
let defeatedCount = 0;
let leakedCount = 0;
let bossShotHits = 0;
let bossesDefeated = 0;
let encounteredTerms = [];
let firstMedicHintShown = false;
let sceneGround = null;
let finalWaveScenery = null;
let sceneLeafMaterials = [];
let sceneTrunkMaterial = null;
let sceneCrystalMat = null;
let currentSeasonIndex = 0;
let seasonEmberIntensityBase = 2.1;
let seasonFade = null;
let seasonalEffects = null;
let potionsSystem = null;
let baseCloudMaterial = null;
let weatherCloudMaterial = null;
let cloudWeatherBlend = 0;
let chainLightningTimers = [];

const {
  toggleEnabled: toggleAudioEnabled,
  updateAudioButton,
  resumeAudio,
  suspendAudio,
  wakeAudio,
  startMusicLoop,
  stopMusicLoop,
  playToggleSound,
  playStartSound,
  playPauseSound,
  playTypeSound,
  playBackspaceSound,
  playMistakeSound,
  playRevealSound,
  playDefeatSound,
  playHealSound,
  playMedicPassSound,
  playDamageSound,
  playBossThrowSound,
  playBossImpactSound,
  playBossWarningSound,
  playWaveClearSound,
  playVictoryFinaleSound,
  playGameOverSound,
  playGodModeOnSound,
  playGodModeOffSound,
  playChestClackSound,
  playChestOpenSound,
  playShockwaveSound,
  playShieldActivateSound,
  playShieldBlockSound,
  playBeamSound,
  playChainPrimeSound,
  playChainZapSound,
  playTimeFreezeSound,
  playTimeResumeSound,
} = createSpellwaveAudio({
  audioButton,
  initialEnabled: loadAudioSetting(),
  saveAudioSetting,
  getMode: () => mode,
  getWavePhase: () => wavePhase,
  getWaveSet: () => waveSet,
  getIsFinalWave: () => isFinalWave(),
  getTypedLength: () => typedBuffer.length,
  getHealth: () => health,
  getIsTimeFrozen: () => Boolean(potionsSystem) && potionsSystem.isTimeFrozen(),
  lowHealth: LOW_LIFE_MUSIC_THRESHOLD,
  pathLanes: PATH_LANES,
});

const leaderboard = createLeaderboard({
  formatScore,
  onModalClose: () => { if (mode === 'running') focusKeyboard(); },
});
leaderboard.init();

const rendererState = createRenderer();
const renderer = rendererState.renderer;
const webGLAvailable = rendererState.available;
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight, false);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x07120f);
scene.fog = new THREE.Fog(0x07120f, 20, 78);

const camera = new THREE.PerspectiveCamera(58, window.innerWidth / window.innerHeight, 0.1, 120);
camera.position.set(0, 7.2, 12.8);
camera.lookAt(cameraTarget);

const visuals = createVisuals({
  renderer, scene, camera, available: webGLAvailable,
  onQualityChange: (level) => setMoonShadowResolution(level === 'high' ? 2048 : 1024),
});
const fx = visuals.effects;
const skyTopColor = new THREE.Color(0x07120f);

const world = new THREE.Group();
scene.add(world);

const enemyGroup = new THREE.Group();
scene.add(enemyGroup);

const effectsGroup = new THREE.Group();
scene.add(effectsGroup);

const hemiLight = new THREE.HemisphereLight(0xd9f7e5, 0x203126, 1.35);
scene.add(hemiLight);

const moonLight = new THREE.DirectionalLight(0xc9ffec, 2.2);
moonLight.position.set(18, 14, -28);
moonLight.castShadow = true;
moonLight.shadow.mapSize.set(1024, 1024);
moonLight.shadow.camera.left = -22;
moonLight.shadow.camera.right = 22;
moonLight.shadow.camera.top = 22;
moonLight.shadow.camera.bottom = -22;
moonLight.shadow.camera.near = 0.5;
moonLight.shadow.camera.far = 70;
moonLight.shadow.bias = -0.0004;
moonLight.shadow.normalBias = 0.02;
scene.add(moonLight);
moonLightBaseIntensity = moonLight.intensity;

const emberLight = new THREE.PointLight(0xf26a3d, 2.5, 22, 1.8);
emberLight.position.set(0, 2.2, 5.7);
scene.add(emberLight);

// Enemy glows borrow these lights, nearest enemy first, so the light count never changes.
const ENEMY_GLOW_LIGHTS = 4;
const enemyGlowLights = [];
for (let index = 0; index < ENEMY_GLOW_LIGHTS; index += 1) {
  const light = new THREE.PointLight(0xffffff, 0, 5, 2);
  scene.add(light);
  enemyGlowLights.push(light);
}
const glowAnchors = [];

// Back light from the far end of the road, so enemies and trees get a bright edge.
const rimLight = new THREE.DirectionalLight(0xd9f7e5, 0.9);
rimLight.position.set(0, 9, -46);
rimLight.target.position.set(0, 1, 6);
scene.add(rimLight, rimLight.target);

createWorld();
createShaderKeepers();
createSky();
createMeteors();
createClouds();
seasonalEffects = createSeasonalEffects({
  scene,
  world,
  lightningFlash,
  getMode: () => mode,
  treeMinZ: TREE_MIN_Z,
  treeMaxZ: TREE_MAX_Z,
  treeSpan: TREE_SPAN,
  pathMarkerMinZ: PATH_MARKER_MIN_Z,
  pathMarkerMaxZ: PATH_MARKER_MAX_Z,
  pathMarkerSpan: PATH_MARKER_SPAN,
  pathMarkerWrapZ: PATH_MARKER_WRAP_Z,
});
seasonalEffects.create();
potionsSystem = createPotionSystem({
  getMode: () => mode,
  getEnemies: () => enemies,
  getGameTime: () => gameTimeSeconds,
  defeatEnemy: (enemy) => defeatEnemy(enemy),
  showBanner,
  potionBar,
  potionSlots,
  scene,
  effectsGroup,
  playShockwaveSound,
  playShieldActivateSound,
  playShieldBlockSound,
  playGodModeOnSound,
  playGodModeOffSound,
  playToggleSound,
  playStartSound,
  playChainPrimeSound,
  playTimeFreezeSound,
  playTimeResumeSound,
  THREE,
  SPAWN_Z,
  WALL_Z
});
applySeasonForWave(1, true);
createLifeMeter();

bestValue.textContent = formatScore(bestScore);
messageScore.textContent = `Best ${formatScore(bestScore)}`;
updateAudioButton();
setPauseButtonState(true, true);
updateFullscreenButton();
updatePhaseDisplay();
updateHud(true);
if (!webGLAvailable) showWebGLUnavailable();

startButton.addEventListener('click', () => {
  resumeAudio();
  if (mode === 'paused') {
    resumeGame();
  } else if (mode === 'wave_cleared') {
    advanceWaveSet();
  } else {
    startGame();
  }
});

if (endingReplay) {
  endingReplay.addEventListener('click', () => {
    dismissEndingSequence();
    startGame();
  });
}

if (endingSkip) {
  endingSkip.addEventListener('click', () => {
    const finalStats = getEndingStats();
    showEndingStatsScreen(finalStats);
  });
}

audioButton.addEventListener('click', () => {
  const audioEnabled = toggleAudioEnabled();
  if (audioEnabled) {
    resumeAudio();
    playToggleSound();
    if (mode === 'running' || mode === 'wave_cleared' || mode === 'gameover' || mode === 'ending') startMusicLoop(false);
  } else {
    stopMusicLoop(0.03);
  }
  if (mode === 'running') focusKeyboard();
});

pauseButton.addEventListener('click', () => {
  resumeAudio();
  if (mode === 'running') {
    pauseGame();
  } else if (mode === 'paused') {
    resumeGame();
  }
});

fullscreenButton.addEventListener('click', () => {
  playToggleSound();
  toggleFullscreen();
  if (mode === 'running') focusKeyboard();
});

if (batterySaverButton) {
  batterySaverButton.addEventListener('click', toggleBatterySaver);
}

window.addEventListener('resize', resizeRenderer);
document.addEventListener('fullscreenchange', updateFullscreenButton);
document.addEventListener('webkitfullscreenchange', updateFullscreenButton);
window.addEventListener('keydown', handleKeyDown);
window.addEventListener('blur', () => {
  if (mode === 'running') pauseGame();
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    if (mode === 'running') pauseGame();
    cancelFrame();
    suspendAudio();
  } else {
    wakeAudio();
    lastFrameTime = 0;
    scheduleFrame();
  }
});

document.addEventListener('pointerdown', () => {
  if (mode === 'running') focusKeyboard();
});

keyboardInput.addEventListener('beforeinput', handleBeforeInput);
keyboardInput.addEventListener('input', resetKeyboardInput);
keyboardInput.addEventListener('compositionend', () => { composedText = ''; });

resizeRenderer();
batterySaver = loadBatterySaverSetting();
applyBatterySaver();
scheduleFrame();


function toggleGodMode() {
  if (godMode) {
    godMode = false;
    playGodModeOffSound();
    document.body.classList.remove('is-god-mode');
    if (godModeBadge) { godModeBadge.remove(); godModeBadge = null; }
    updateHud(true);
    return;
  }

  godMode = true;
  godModeUsedThisRun = true;
  playGodModeOnSound();
  document.body.classList.add('is-god-mode');
  if (godModeBadge) godModeBadge.remove();
  godModeBadge = document.createElement('div');
  godModeBadge.className = 'god-mode-badge';
  godModeBadge.setAttribute('aria-live', 'assertive');
  godModeBadge.textContent = '✦ GOD MODE ✦';
  document.querySelector('.hud-grid').append(godModeBadge);
  updateHud(true);
}

function startGame() {
  if (!webGLAvailable) {
    showWebGLUnavailable();
    return;
  }

  const transitionFromGameOver = mode === 'gameover' || mode === 'ending';
  leaderboard.hideModal();
  playStartSound();
  clearEnemies();
  clearEffects();
  godMode = false;
  godModeUsedThisRun = false;
  // The potion cheat is cleared by potionsSystem.clear() below, so a fresh run starts
  // ranked; it only becomes unranked if the player re-enters the cheat mid-run.
  potionCheatUsedThisRun = false;
  finalWaveCheatUsedThisRun = false;
  killedByBoss = false;
  inputTrace = '';
  document.body.classList.remove('is-god-mode');
  if (godModeBadge) { godModeBadge.remove(); godModeBadge = null; }
  score = 0;
  health = MAX_LIFE;
  renderedHealth = null;
  potionsSystem.clear();
  gameTimeSeconds = 0;
  document.body.classList.remove('time-frozen');
  document.body.classList.remove('chain-lightning-primed');
  document.body.classList.remove('final-wave-active');
  setFinalWaveScenery(false);
  dismissEndingSequence();
  wandsArePrimed = false;
  waveSet = 1;
  wavePhase = 'normal';
  waveClearDelayTimer = 0;
  normalEnemyTarget = getNormalEnemyTarget(waveSet);
  normalEnemiesSpawned = 0;
  normalTypingCostSpawned = 0;
  bossesSpawned = 0;
  bossSpawnTimer = 0;
  waveBossOrder = [];
  finalWaveQueue = [];
  finalWaveQueueIndex = 0;
  prepareWavePlan();
  streak = 0;
  peakStreak = 0;
  mimicsLooted = 0;
  typedAttempts = 0;
  mistakeCount = 0;
  defeatedCount = 0;
  leakedCount = 0;
  bossShotHits = 0;
  bossesDefeated = 0;
  encounteredTerms = [];
  typedBuffer = '';
  activeTarget = null;
  spawnTimer = 1.25;
  lastFrameTime = 0;
  elapsed = 0;
  moonAngle = INITIAL_MOON_ANGLE;
  moonWaitTimer = 0;
  mistakeTimer = 0;
  damageTimer = 0;
  mode = 'running';
  startMusicLoop(!transitionFromGameOver);
  document.body.classList.add('is-running');
  messagePanel.hidden = true;
  messagePanel.classList.remove('is-cleared');
  setPauseButtonState(true, false);
  updateTypedDisplay();
  updateHud(true);
  updatePhaseDisplay();
  applySeasonForWave(waveSet, true);
  focusKeyboard();
  scheduleFrame();
}

function pauseGame() {
  if (mode !== 'running') return;
  playPauseSound();
  stopMusicLoop();
  mode = 'paused';
  cancelFrame();
  suspendChainLightningTimers();
  document.body.classList.add('is-paused');
  setPauseButtonState(false, false);
  showMessage('PAUSED', 'Wave Paused', `Score ${formatScore(score)}`, 'Resume', 'Take a breath — press Resume when ready.');
  updatePhaseDisplay();
}

function resumeGame() {
  if (mode !== 'paused') return;
  playStartSound();
  mode = 'running';
  resumeChainLightningTimers();
  document.body.classList.remove('is-paused');
  startMusicLoop(false);
  lastFrameTime = 0;
  messagePanel.hidden = true;
  setPauseButtonState(true, false);
  updatePhaseDisplay();
  focusKeyboard();
  scheduleFrame();
}

function endGame() {
  mode = 'gameover';
  clearChainLightningTimers();
  releaseChainBeams();
  potionsSystem.clear();
  document.body.classList.remove('chain-lightning-primed');
  playGameOverSound();
  startMusicLoop(false);
  setPauseButtonState(true, true);
  document.body.classList.remove('is-running');
  const isUnranked = godModeUsedThisRun || potionCheatUsedThisRun || finalWaveCheatUsedThisRun;
  if (!isUnranked && score > bestScore) {
    bestScore = score;
    saveBestScore(score);
  }
  showMessage(
    killedByBoss ? 'BOSS LEAKED' : 'OVERRUN',
    killedByBoss ? 'Instant Defeat' : 'Game Over',
    isUnranked ? `Score ${formatScore(score)} · ⚡ Unranked` : `Score ${formatScore(score)} | Best ${formatScore(bestScore)}`,
    'Try Again',
    `${formatAccuracySummary()} · ${defeatedCount} defeated · ${leakedCount} leaked · ${elapsed.toFixed(0)}s`
  );
  if (supportLink) supportLink.hidden = false;
  renderRunGlossary();
  updatePhaseDisplay();
  updateHud(true);
  submitRunToLeaderboard();
  // Restart the idle frame loop — endGame can arrive via the boss_killing timeout,
  // during which scheduleFrame refuses to run and the loop is left dead.
  scheduleFrame();
}

function submitRunToLeaderboard() {
  if (godModeUsedThisRun || potionCheatUsedThisRun || finalWaveCheatUsedThisRun) return;
  leaderboard.handleScore(score);
}

function showMessage(kicker, title, scoreText, buttonText, copyText) {
  messageKicker.textContent = kicker;
  messageTitle.textContent = title;
  messageScore.textContent = scoreText;
  messageCopy.textContent = copyText;
  startButton.textContent = buttonText;
  
  if (buttonText === 'Start') {
    startButton.title = 'Start the physics typing run';
  } else if (buttonText === 'Resume') {
    startButton.title = 'Resume the paused run';
  } else if (buttonText === 'Try Again') {
    startButton.title = 'Restart the run from Wave 1';
  } else if (buttonText === 'Next Wave') {
    startButton.title = 'Proceed to the next wave';
  } else if (buttonText === 'Unavailable') {
    startButton.title = 'Simulation requires WebGL support';
  } else {
    startButton.title = buttonText;
  }

  if (runGlossary) runGlossary.hidden = true;
  if (supportLink) supportLink.hidden = true;
  messagePanel.hidden = false;
}

function showWebGLUnavailable() {
  showMessage(
    'WEBGL REQUIRED',
    'Graphics Unavailable',
    'Spellwave needs browser WebGL support',
    'Unavailable',
    'Enable hardware acceleration or try a browser/device with WebGL enabled.'
  );
  startButton.disabled = true;
  setPauseButtonState(true, true);
}

function handleKeyDown(event) {
  if (leaderboard.isModalOpen()) {
    if (event.key === 'Escape') {
      event.preventDefault();
      leaderboard.hideModal();
    }
    return;
  }
  resumeAudio();

  // Special sequence detection — runs in all game states. Mid-run, the keys still
  // reach the potion/typing handlers below; the cheat tolerates that noise.
  cosmicBuffer.push(event.key);
  if (cosmicBuffer.length > 10) cosmicBuffer.shift();
  if (cosmicBuffer.length === 10 && fnv1a(cosmicBuffer.join(',')) === COSMIC_WAVE_THRESHOLD) {
    cosmicBuffer = [];
    activateFinalWaveCheat();
    return;
  }

  if (event.key === 'Enter' && (mode === 'idle' || mode === 'gameover' || mode === 'ending')) {
    event.preventDefault();
    startGame();
    return;
  }

  if (event.key === 'Enter' && mode === 'wave_cleared') {
    event.preventDefault();
    advanceWaveSet();
    return;
  }

  if (event.key === 'Enter' && mode === 'paused') {
    event.preventDefault();
    resumeGame();
    return;
  }

  if (event.key === 'Escape' && mode === 'running') {
    event.preventDefault();
    pauseGame();
    return;
  }

  if (event.key === 'Escape' && mode === 'paused') {
    event.preventDefault();
    resumeGame();
    return;
  }

  if (mode !== 'running') return;

  // Leave browser/system shortcuts (Cmd+R, Ctrl+C, Alt+Left, ...) untouched.
  if (event.metaKey || event.ctrlKey || event.altKey) return;

  if (['ArrowLeft', 'ArrowUp', 'ArrowRight', 'ArrowDown'].includes(event.key)) {
    event.preventDefault();
    let slotIndex = -1;
    if (event.key === 'ArrowLeft') slotIndex = 0;
    else if (event.key === 'ArrowUp') slotIndex = 1;
    else if (event.key === 'ArrowRight') slotIndex = 2;
    else if (event.key === 'ArrowDown') slotIndex = 3;
    if (slotIndex !== -1) potionsSystem.activatePotionSlot(slotIndex);
    return;
  }

  if (['1', '2', '3', '4'].includes(event.key)) {
    let slotIndex = parseInt(event.key, 10) - 1;
    if (slotIndex >= 0 && slotIndex < 4) {
      event.preventDefault();
      potionsSystem.activatePotionSlot(slotIndex);
      return;
    }
  }

  if (event.key === 'Backspace') {
    event.preventDefault();
    typedBuffer = typedBuffer.slice(0, -1);
    playBackspaceSound();
    selectTarget();
    updateTypedDisplay();
    return;
  }

  if (event.key.length === 1) {
    // Let Space activate a focused button/link instead of swallowing it.
    if (event.key === ' ' && event.target !== keyboardInput && event.target.closest && event.target.closest('button, a')) return;
    event.preventDefault();
    enterCharacter(event.key);
  }
}

// The input always holds one invisible sentinel character so Backspace has
// something to delete on mobile keyboards that skip events for an empty field.
const INPUT_SENTINEL = '\u200b';
let composedText = '';

function resetKeyboardInput() {
  keyboardInput.value = INPUT_SENTINEL;
  try { keyboardInput.setSelectionRange(INPUT_SENTINEL.length, INPUT_SENTINEL.length); } catch {}
}

function handleBeforeInput(event) {
  if (mode !== 'running') return;
  resumeAudio();

  // IME composition (e.g. Android suggestion keyboards) reports the whole
  // composing word each time, so enter only the characters added since the last event.
  if (event.inputType === 'insertCompositionText' && typeof event.data === 'string') {
    const data = event.data;
    const fresh = data.startsWith(composedText) ? data.slice(composedText.length) : data.slice(-1);
    composedText = data;
    for (const character of fresh) enterCharacter(character);
    return;
  }
  composedText = '';

  if (event.inputType === 'deleteContentBackward' || event.inputType === 'deleteWordBackward') {
    event.preventDefault();
    typedBuffer = typedBuffer.slice(0, -1);
    playBackspaceSound();
    selectTarget();
    updateTypedDisplay();
    return;
  }

  if (event.data) {
    event.preventDefault();
    for (const character of event.data) {
      enterCharacter(character);
    }
  }
}

function enterCharacter(character) {
  checkCheatCode(character);

  const inputOptions = getInputCharacters(character);
  if (inputOptions.length === 0) return;
  typedAttempts += 1;

  for (const inputOption of inputOptions) {
    const next = typedBuffer + inputOption.value;
    const nextMatches = findMatches(next, inputOption);

    if (nextMatches.length > 0) {
      typedBuffer = next;
      activeTarget = pickTarget(nextMatches, next);
      if (activeTarget._matchedSearchPrompt === typedBuffer) {
        defeatEnemy(activeTarget);
      } else {
        playTypeSound();
        reusableVector.copy(activeTarget.group.position);
        reusableVector.y += 0.9 * activeTarget.group.scale.y;
        fx.burst(reusableVector, { color: activeTarget.type.eye, color2: 0xffffff, count: 5, speed: 2.4, life: 0.35, size: 0.22 });
      }
      updateTypedDisplay();
      return;
    }
  }

  for (const inputOption of inputOptions) {
    const restartMatches = findMatches(inputOption.value, inputOption);
    if (restartMatches.length > 0) {
      typedBuffer = inputOption.value;
      activeTarget = chooseTarget(restartMatches);
      registerMistake();
      updateTypedDisplay();
      return;
    }
  }

  if (isMathOperatorInput(character) && hasActiveEquationPrefix()) {
    updateTypedDisplay();
    return;
  }

  typedBuffer = '';
  activeTarget = null;
  registerMistake();
  updateTypedDisplay();
}

// Simple FNV-1a 32-bit hash function
function fnv1a(str) {
  let hash = 2166136261;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return hash >>> 0;
}

function checkCheatCode(character) {
  inputTrace = (inputTrace + character.toLowerCase()).slice(-5);
  if (inputTrace.length < 5) return;

  const traceHash = fnv1a(inputTrace);
  if (traceHash === EMBER_HEIGHT_DELTAS) {
    toggleGodMode();
    inputTrace = '';
  } else if (traceHash === PARTICLE_GRAVITY_COEFFS) {
    potionsSystem.togglePotionCheat();
    if (potionsSystem.isPotionCheatActive()) {
      potionCheatUsedThisRun = true;
    }
    inputTrace = '';
  }
}

function registerMistake() {
  streak = 0;
  mistakeCount += 1;
  mistakeTimer = 0.2;
  playMistakeSound();
  typingStrip.classList.add('mistake');
  window.setTimeout(() => typingStrip.classList.remove('mistake'), 200);
}

function defeatEnemy(enemy) {
  if (potionsSystem.isChainLightningPrimed()) {
    potionsSystem.clearChainLightningPrimed();
    enemy.dying = true;
    typedBuffer = '';
    activeTarget = null;
    updateHud(true);
    updateTypedDisplay();
    triggerChainLightning(enemy);
    return;
  }

  if (enemy.isMimic) {
    awardMimicLoot(enemy);
    spawnBeam(enemy.group.position);
    spawnDebris(enemy.group.position, enemy.type, enemy.isBoss);
    removeEnemy(enemy);
    if (activeTarget === enemy) {
      activeTarget = null;
      typedBuffer = '';
      updateTypedDisplay();
    }
    updateHud(true);
    updateTypedDisplay();
    return;
  }

  const { points, healed } = awardKill(enemy);
  spawnScorePopup(points, enemy, healed);
  if (enemy.isMedic) playHealSound(healed);
  else playDefeatSound(enemy);

  spawnBeam(enemy.group.position);
  spawnDebris(enemy.group.position, enemy.type, enemy.isBoss);
  removeEnemy(enemy);
  typedBuffer = '';
  activeTarget = null;
  updateHud(true);
  updateTypedDisplay();
}


// Score is based on the characters the player actually types (hidden words only
// on limited prompts), not the full displayed text.
function awardKill(enemy) {
  const typedLength = Math.max(1, enemy.searchPrompt.length);
  streak += 1;
  if (streak > peakStreak) peakStreak = streak;
  defeatedCount += 1;
  if (enemy.isBoss) bossesDefeated += 1;
  const points = enemy.type.score + typedLength * 12 + Math.min(streak, 10) * 8;
  const healed = enemy.isMedic ? Math.min(MEDIC_HEAL_AMOUNT, MAX_LIFE - health) : 0;
  score += points;
  if (healed > 0) health += healed;
  if (!encounteredTerms.some(t => t.term === enemy.prompt)) {
    encounteredTerms.push({ term: enemy.prompt, definition: enemy.definition, isEquation: enemy.isEquation, defeated: true });
  }
  return { points, healed };
}

function leakEnemy(enemy) {
  if (enemy.isMedic) {
    const wasActiveTarget = activeTarget === enemy;
    playMedicPassSound();
    if (!enemy.label.classList.contains('is-hidden')) {
      const left = parseFloat(enemy.label.style.left);
      const top = parseFloat(enemy.label.style.top);
      if (Number.isFinite(left) && Number.isFinite(top)) spawnMissedHealPopup(left, top);
    }
    spawnDebris(new THREE.Vector3(enemy.group.position.x, 1.2, WALL_Z), enemy.type, enemy.isBoss);
    removeEnemy(enemy);
    if (wasActiveTarget) typedBuffer = '';
    updateTypedDisplay();
    return;
  }

  if (enemy.isMimic) {
    // A Mimic Chest is bonus loot, not a threat — letting it escape costs you the
    // reward but never deals damage, breaks your shield, or resets your streak.
    const wasActiveTarget = activeTarget === enemy;
    playChestClackSound();
    if (!enemy.label.classList.contains('is-hidden')) {
      const left = parseFloat(enemy.label.style.left);
      const top = parseFloat(enemy.label.style.top);
      if (Number.isFinite(left) && Number.isFinite(top)) spawnLootEscapedPopup(left, top);
    }
    if (!encounteredTerms.some(t => t.term === enemy.prompt)) {
      encounteredTerms.push({ term: enemy.prompt, definition: enemy.definition, isEquation: enemy.isEquation, defeated: false });
    }
    spawnDebris(new THREE.Vector3(enemy.group.position.x, 1.2, WALL_Z), enemy.type, enemy.isBoss);
    removeEnemy(enemy);
    if (wasActiveTarget) typedBuffer = '';
    updateTypedDisplay();
    return;
  }


  const wasActiveTarget = activeTarget === enemy;
  let wasBlocked = false;
  if (!godMode && enemy.damage > 0 && potionsSystem.isShieldActive()) {
    wasBlocked = potionsSystem.blockLeak(enemy.isBoss);
  }

  if (wasBlocked) {
    potionsSystem.triggerShieldHitVisual();
  } else {
    if (!godMode) health = Math.max(0, health - enemy.damage);
    streak = 0;
    playDamageSound(enemy);
    damageTimer = enemy.isBoss ? 0.46 : 0.32;
    damageFlash.classList.add('show');
    window.setTimeout(() => damageFlash.classList.remove('show'), 160);
  }
  leakedCount += 1;
  if (!encounteredTerms.some(t => t.term === enemy.prompt)) {
    encounteredTerms.push({ term: enemy.prompt, definition: enemy.definition, isEquation: enemy.isEquation, defeated: false });
  }
  spawnDebris(new THREE.Vector3(enemy.group.position.x, 1.2, WALL_Z), enemy.type, enemy.isBoss);
  if (isFinalWave() && enemy.isBoss) bossesDefeated += 1;
  removeEnemy(enemy);
  // Keep typing progress on other targets — only reset when the leaked enemy
  // was the one being typed (matches the medic/mimic leak behaviour).
  if (wasActiveTarget) typedBuffer = '';
  updateHud(true);
  updateTypedDisplay();
  if (!godMode && health <= 0) {
    if (enemy.isBoss) {
      killedByBoss = true;
      mode = 'boss_killing';
      showBanner('BOSS LEAKED!', 'boss-kill');
      window.setTimeout(() => {
        endGame();
      }, 2500);
    } else {
      endGame();
    }
  }
}

function bossShootPlayer(enemy) {
  spawnBossRock(enemy);
  playBossThrowSound();
}

function bossProjectileHitPlayer(enemy) {
  bossShotHits += 1;
  playBossImpactSound();

  if (bossShotHits % BOSS_SHOTS_PER_DAMAGE === 0) {
    let wasBlocked = false;
    if (!godMode && potionsSystem.isShieldActive()) {
      wasBlocked = potionsSystem.blockBossHit();
    }

    if (wasBlocked) {
      potionsSystem.triggerShieldHitVisual();
    } else {
      if (!godMode) health = Math.max(0, health - BOSS_SHOT_DAMAGE);
      streak = 0;
      damageTimer = 0.24;
      damageFlash.classList.add('show');
      window.setTimeout(() => damageFlash.classList.remove('show'), 120);
      playDamageSound(enemy);
    }
    updateHud(true);
    updateTypedDisplay();
    if (!godMode && health <= 0) {
      endGame();
    }
  }
}

function scheduleFrame() {
  cancelFrame();
  if (mode === 'paused' || mode === 'ending' || mode === 'boss_killing') return;

  if (mode !== 'running') {
    isTimeoutScheduled = true;
    rafId = setTimeout(() => {
      isTimeoutScheduled = false;
      rafId = requestAnimationFrame(animate);
    }, IDLE_FRAME_INTERVAL);
  } else {
    isTimeoutScheduled = false;
    rafId = requestAnimationFrame(animate);
  }
}

function cancelFrame() {
  if (rafId !== null) {
    if (isTimeoutScheduled) {
      clearTimeout(rafId);
    } else {
      cancelAnimationFrame(rafId);
    }
    rafId = null;
    isTimeoutScheduled = false;
  }
}

function animate(frameTime) {
  if (mode === 'paused' || mode === 'ending' || mode === 'boss_killing') {
    rafId = null;
    return;
  }

  const delta = lastFrameTime ? Math.min((frameTime - lastFrameTime) / 1000, MAX_DELTA) : 0;
  lastFrameTime = frameTime;

  potionsSystem.update(delta);

  const isTimeFrozen = (mode === 'running' && potionsSystem.isTimeFrozen());
  const animationDelta = isTimeFrozen ? 0 : delta;
  gameTimeSeconds += animationDelta;

  if (mode === 'running') {
    let currentDelta = delta;
    if (potionsSystem.isTimeFrozen()) {
      currentDelta = 0;
      document.body.classList.add('time-frozen');
    } else {
      document.body.classList.remove('time-frozen');
    }

    elapsed += currentDelta;

    if (wavePhase === 'normal') {
      const canAddNormalEnemy = !isNormalWaveComplete() && canAcceptNormalSpawnPressure();
      if (canAddNormalEnemy && shouldSpawnMedic() && enemies.length < getEnemyLimit()) {
        if (currentDelta > 0) {
          const enemy = spawnEnemy({ isMedic: true });
          registerNormalTypingCost(enemy);
          medicsSpawnedThisSet += 1;
          spawnTimer = Math.max(spawnTimer, nextSpawnDelay(enemy, { support: true }));
        }
      } else if (canAddNormalEnemy && shouldSpawnMimic() && enemies.length < getEnemyLimit()) {
        if (currentDelta > 0) {
          const enemy = spawnEnemy({ isMimic: true });
          registerNormalTypingCost(enemy);
          mimicsSpawnedThisSet += 1;
          spawnTimer = Math.max(spawnTimer, nextSpawnDelay(enemy, { support: true }));
        }
      } else if (canAddNormalEnemy && normalEnemiesSpawned < normalEnemyTarget) {
        spawnTimer -= currentDelta;
        if (spawnTimer <= 0 && enemies.length < getEnemyLimit()) {
          const enemy = spawnEnemy();
          registerNormalTypingCost(enemy);
          normalEnemiesSpawned += 1;
          spawnTimer = nextSpawnDelay(enemy);
        }
      } else if (isNormalWaveComplete() && enemies.length === 0) {
        startBossPhase();
      }
    } else if (wavePhase === 'boss') {
      if (isFinalWave()) {
        if (bossesDefeated >= FINAL_WAVE_BOSS_COUNT) {
          if (waveClearDelayTimer === 0) {
            waveClearDelayTimer = 1.5;
          } else {
            waveClearDelayTimer -= currentDelta;
            if (waveClearDelayTimer <= 0) {
              waveClearDelayTimer = 0;
              endingStartTime = elapsed;
              startEndingSequence();
            }
          }
        } else if (finalWaveQueueIndex < finalWaveQueue.length) {
          const nextEntry = finalWaveQueue[finalWaveQueueIndex];
          const hasActiveSupportEnemy = nextEntry !== 'boss' && enemies.some(e => (e.isMimic || e.isMedic) && !e.dying);
          const activeBossCount = enemies.filter(enemy => enemy.isBoss && !enemy.dying).length;
          if (!hasActiveSupportEnemy && (nextEntry !== 'boss' || activeBossCount < 2)) {
            bossSpawnTimer -= currentDelta;
            if (bossSpawnTimer <= 0) {
              const entry = finalWaveQueue[finalWaveQueueIndex];
              finalWaveQueueIndex += 1;
              if (entry === 'boss') {
                spawnBoss();
                bossesSpawned += 1;
              } else if (entry === 'medic') {
                spawnEnemy({ isMedic: true });
              } else if (entry === 'mimic') {
                spawnEnemy({ isMimic: true });
              }
              bossSpawnTimer = (entry === 'medic' || entry === 'mimic') ? 1.15 : currentDifficulty().bossSpawnGap;
            }
          }
        }
      } else {
        if (bossesSpawned < BOSSES_PER_WAVE && !enemies.some(enemy => enemy.isBoss && !enemy.dying)) {
          bossSpawnTimer -= currentDelta;
          if (bossSpawnTimer <= 0) {
            spawnBoss();
            bossesSpawned += 1;
            bossSpawnTimer = currentDifficulty().bossSpawnGap;
          }
        } else if (enemies.length === 0) {
          if (waveClearDelayTimer === 0) {
            waveClearDelayTimer = 1.25;
          } else {
            waveClearDelayTimer -= currentDelta;
            if (waveClearDelayTimer <= 0) {
              waveClearDelayTimer = 0;
              startWaveCleared();
            }
          }
        }
      }
    }

    updateEnemies(currentDelta, gameTimeSeconds);
    updateHud(false);
  }

  updateEffects(delta);
  updateEnemyGlows();
  updateEnvironment(gameTimeSeconds, delta, isTimeFrozen);
  updateSeasonFade(delta);
  updateLabels();
  visuals.render(delta, { measure: mode === 'running' });

  scheduleFrame();
}

function updateEnemies(delta, seconds) {
  for (let index = enemies.length - 1; index >= 0; index -= 1) {
    const enemy = enemies[index];
    if (enemy.dying) continue;
    enemy.age += delta;

    if (enemy.isMimic) {
      const isTargeted = (activeTarget === enemy && isEnemyTargetable(enemy));
      const idleTarget = 0.22 + Math.sin(seconds * 2.2 + enemy.phase) * 0.12;
      const targetLidProgress = isTargeted ? 1.0 : idleTarget;
      const oldProgress = enemy.lidOpenProgress;
      enemy.lidOpenProgress += (targetLidProgress - enemy.lidOpenProgress) * Math.min(1.0, 12 * delta);

      if (oldProgress < 0.05 && enemy.lidOpenProgress >= 0.05) {
        playChestOpenSound();
      } else if (oldProgress >= 0.85 && enemy.lidOpenProgress < 0.85) {
        playChestClackSound();
      }

      const lidGroup = enemy.group.userData.lidGroup;
      if (lidGroup) {
        lidGroup.rotation.x = -enemy.lidOpenProgress * (Math.PI / 2.2);
      }

      const chestLight = enemy.group.userData.chestLight;
      if (chestLight) {
        chestLight.intensity = 0.5 + enemy.lidOpenProgress * 2.5;
      }
    }

    if (enemy.stunTimer === undefined) enemy.stunTimer = 0;
    if (enemy.stunTimer > 0) {
      enemy.stunTimer = Math.max(0, enemy.stunTimer - delta);
      if (!enemy.visualStunApplied) {
        enemy.visualStunApplied = true;
        enemy.group.traverse(child => {
          if (child.isMesh && child.userData.stunMaterial) {
            child.material = child.userData.stunMaterial;
          } else if (child.isGlow) {
            if (child.userData.origColor === undefined) {
              child.userData.origColor = child.color.clone();
              child.userData.origIntensity = child.intensity;
            }
            child.color.setRGB(0.22, 0.68, 1.0);
            child.intensity = 0.58;
          }
        });
      }
    } else if (enemy.visualStunApplied) {
      enemy.visualStunApplied = false;
      enemy.group.traverse(child => {
        if (child.isMesh && child.userData.normalMaterial) {
          child.material = child.userData.normalMaterial;
        } else if (child.isGlow) {
          if (child.userData.origColor !== undefined) {
            child.color.copy(child.userData.origColor);
            child.intensity = child.userData.origIntensity;
            delete child.userData.origColor;
            delete child.userData.origIntensity;
          }
        }
      });
    }

    let speed = 0;
    if (enemy.stunTimer <= 0) {
      speed = getEnemySpeed(enemy);
    }

    if (enemy.pushbackTargetZ !== undefined) {
      enemy.group.position.z += (enemy.pushbackTargetZ - enemy.group.position.z) * Math.min(1.0, 10.0 * delta);
      if (Math.abs(enemy.group.position.z - enemy.pushbackTargetZ) < 0.1) {
        delete enemy.pushbackTargetZ;
      }
    } else {
      enemy.group.position.z += speed * delta;
    }
    enemy.group.position.x = enemy.lane + Math.sin(seconds * enemy.wobbleSpeed + enemy.phase) * enemy.wobbleAmount;
    if (enemy.isFlying) {
      enemy.group.position.y = enemy.baseY + Math.sin(seconds * 1.4 + enemy.phase) * enemy.floatAmount;
      enemy.group.rotation.z = Math.sin(seconds * 0.85 + enemy.phase) * 0.10;
      if (enemy.shadowMesh) {
        enemy.shadowMesh.position.x = enemy.group.position.x;
        enemy.shadowMesh.position.z = enemy.group.position.z;
      }
    } else {
      enemy.group.position.y = enemy.baseY + Math.abs(Math.sin(seconds * 4.8 + enemy.phase)) * enemy.stepBounce;
    }
    enemy.group.rotation.y = Math.sin(seconds * 2.4 + enemy.phase) * 0.18;
    if (enemy.group.userData.animate && enemy.stunTimer <= 0) enemy.group.userData.animate(seconds, enemy);

    const wasRevealed = enemy.revealed;
    enemy.revealed = enemy.group.position.z >= enemy.revealZ;
    if (enemy.revealed && !wasRevealed) {
      enemy.revealFlash = 0.28;
      if (!enemy.isMimic) playRevealSound(enemy);
      reusableVector.set(enemy.group.position.x, 0.14, enemy.group.position.z);
      fx.ring(reusableVector, enemy.type.eye, { from: 0.3, to: enemy.isBoss ? 4.6 : 2.2, life: 0.55, opacity: 0.7 });
    }
    updateEnemyAura(enemy, delta);
    if (enemy.revealFlash > 0) enemy.revealFlash -= delta;

    if (enemy.isBoss && enemy.revealed && (!enemy.stunTimer || enemy.stunTimer <= 0)) {
      enemy.shotTimer -= delta;
      if (enemy.shotTimer <= 0) {
        const activeRocksCount = beams.filter(b => b.kind === 'rock').length;
        const timeSinceLastShot = seconds - lastBossShotTime;
        const canShoot = enemy.isClimaxBoss || (activeRocksCount < MAX_CONCURRENT_BOSS_PROJECTILES && timeSinceLastShot >= MIN_PROJECTILE_SPACING);
        if (canShoot) {
          bossShootPlayer(enemy);
          enemy.shotTimer = BOSS_SHOT_INTERVAL + Math.random() * 0.65;
          if (!enemy.isClimaxBoss) {
            lastBossShotTime = seconds;
          }
          if (mode !== 'running') break;
        } else {
          enemy.shotTimer = 0; // Hold throw until a slot opens AND spacing is met
        }
      }
    }

    updateEnemyMarkers(enemy, seconds);

    const pulseScale = enemy.isMedic
      ? 1 + Math.max(0, Math.sin(seconds * 12 + enemy.phase)) * 0.14
      : 1;
    const finalScaleMultiplier = enemy.isClimaxBoss ? 1.5 : 1.0;
    if (enemy === activeTarget && isEnemyTargetable(enemy)) {
      enemy.group.scale.setScalar(enemy.type.scale * pulseScale * finalScaleMultiplier * (1.12 + Math.sin(seconds * 16) * 0.05));
    } else if (!enemy.revealed) {
      enemy.group.scale.setScalar(enemy.type.scale * pulseScale * finalScaleMultiplier * (1.04 + Math.sin(seconds * 5 + enemy.phase) * 0.025));
    } else {
      enemy.group.scale.setScalar(enemy.type.scale * pulseScale * finalScaleMultiplier);
    }

    if (enemy.group.position.z >= WALL_Z) {
      leakEnemy(enemy);
      if (mode !== 'running') break;
    }
  }

  if (mode === 'running') selectTarget();
}

function updateEnemyGlows() {
  glowAnchors.length = 0;
  for (const enemy of enemies) {
    if (!enemy.glowAnchors) {
      enemy.glowAnchors = [];
      enemy.group.traverse((child) => { if (child.isGlow) enemy.glowAnchors.push(child); });
    }
    for (const anchor of enemy.glowAnchors) glowAnchors.push(anchor);
  }
  if (glowAnchors.length > ENEMY_GLOW_LIGHTS) {
    for (const anchor of glowAnchors) anchor.getWorldPosition(reusableVector), anchor.sortZ = reusableVector.z;
    glowAnchors.sort((a, b) => b.sortZ - a.sortZ);
  }
  for (let index = 0; index < ENEMY_GLOW_LIGHTS; index += 1) {
    const light = enemyGlowLights[index];
    const anchor = glowAnchors[index];
    if (!anchor) {
      light.intensity = 0;
      continue;
    }
    anchor.getWorldPosition(light.position);
    light.color.copy(anchor.color);
    light.intensity = anchor.intensity;
    light.distance = anchor.distance;
    light.decay = anchor.decay;
  }
}

// Bosses shed rising embers, healers and chests a slow sparkle.
function updateEnemyAura(enemy, delta) {
  if (!enemy.revealed || !(enemy.isBoss || enemy.isMedic || enemy.isMimic)) return;
  const interval = enemy.isBoss ? 0.06 : 0.16;
  enemy.auraTimer = (enemy.auraTimer || 0) + delta;
  while (enemy.auraTimer > interval) {
    enemy.auraTimer -= interval;
    const reach = enemy.isBoss ? 1.1 * enemy.group.scale.x : 0.6;
    reusableVector.set(
      enemy.group.position.x + (Math.random() - 0.5) * 2 * reach,
      enemy.group.position.y + 0.2 + Math.random() * (enemy.isBoss ? 2.2 * enemy.group.scale.y : 1.2),
      enemy.group.position.z + (Math.random() - 0.5) * 2 * reach
    );
    fx.burst(reusableVector, {
      color: enemy.type.eye, color2: enemy.type.trim, count: 1, speed: 0.3,
      life: enemy.isBoss ? 1.3 : 0.9, size: enemy.isBoss ? 0.36 : 0.22, gravity: -1.4, drag: 0.6, up: 0.5,
    });
  }
}

function updateEnemyMarkers(enemy, seconds) {
  const incomingBeacon = enemy.group.userData.incomingBeacon;
  if (incomingBeacon) {
    incomingBeacon.visible = !enemy.revealed;
    if (!enemy.revealed) {
      const revealDistance = Math.max(1, enemy.revealZ - enemy.spawnZ);
      const revealProgress = THREE.MathUtils.clamp((enemy.group.position.z - enemy.spawnZ) / revealDistance, 0, 1);
      const pulse = 0.5 + Math.sin(seconds * 7.5 + enemy.phase) * 0.16;
      incomingBeacon.scale.setScalar(THREE.MathUtils.lerp(1.7, 0.8, revealProgress) + pulse * 0.18);
      incomingBeacon.position.y = 2.72 + Math.sin(seconds * 5.2 + enemy.phase) * 0.16;
      incomingBeacon.rotation.y = seconds * 1.8 + enemy.phase;
      incomingBeacon.rotation.x = seconds * 1.2;
      incomingBeacon.material.opacity = THREE.MathUtils.lerp(0.62, 0.34, revealProgress) + pulse * 0.12;
    }
  }

  const targetMarker = enemy.group.userData.targetMarker;
  if (targetMarker) {
    const targetLocked = enemy === activeTarget && isEnemyTargetable(enemy);
    targetMarker.visible = targetLocked;
    if (targetLocked) {
      const pulse = 0.62 + Math.sin(seconds * 12) * 0.18;
      targetMarker.rotation.y = -enemy.group.rotation.y + seconds * 1.1;
      targetMarker.scale.setScalar(1 + Math.sin(seconds * 10) * 0.045);
      targetMarker.userData.material.opacity = pulse;
    }
  }
}

function updateEffects(delta) {
  for (let index = beams.length - 1; index >= 0; index -= 1) {
    const effect = beams[index];

    if (effect.kind === 'rock') {
      if (!potionsSystem.isTimeFrozen()) {
        effect.age += delta;
      }
      const progress = THREE.MathUtils.clamp(effect.age / effect.flightTime, 0, 1);
      const eased = easeOutSine(progress);
      effect.mesh.position.copy(effect.start).lerp(effect.end, eased);
      effect.mesh.position.y += Math.sin(progress * Math.PI) * effect.arcHeight;
      if (!potionsSystem.isTimeFrozen()) {
        effect.trailTimer = (effect.trailTimer || 0) + delta;
        while (effect.trailTimer > 0.03) {
          effect.trailTimer -= 0.03;
          fx.burst(effect.mesh.position, { color: effect.enemy.type.eye, color2: 0xff7a2a, count: 1, speed: 0.6, life: 0.5, size: 0.34, gravity: 1.2, up: 0 });
        }
        effect.mesh.rotation.x += effect.spin.x * delta;
        effect.mesh.rotation.y += effect.spin.y * delta;
        effect.mesh.rotation.z += effect.spin.z * delta;
      }
      effect.mesh.scale.setScalar(THREE.MathUtils.lerp(0.95, 1.2, progress));

      if (progress >= 1) {
        if (mode === 'running') bossProjectileHitPlayer(effect.enemy);
        spawnDebris(effect.end, effect.enemy.type);
        effectsGroup.remove(effect.mesh);
        disposeObject(effect.mesh);
        beams.splice(index, 1);
      }
      continue;
    }

    if (effect.hold) {
      if (effect.kind === 'lightning_bolt') {
        effect.mesh.material.opacity = 1.0;
      }
      continue;
    }

    effect.life -= delta;
    const amount = Math.max(0, effect.life / effect.maxLife);

    if (effect.kind === 'lightning_bolt') {
      effect.mesh.material.opacity = amount;
    } else if (effect.kind === 'beam_flash') {
      const expand = 0.3 + (1 - amount) * 2.2;
      effect.mesh.scale.setScalar(expand);
      effect.mesh.material.opacity = amount * 0.9;
    } else if (effect.kind === 'beam_glow') {
      const xyScale = 0.5 + amount * 0.5;
      effect.mesh.scale.set(xyScale, xyScale, Math.max(0.05, amount));
      effect.mesh.material.opacity = amount * 0.48;
    } else if (effect.kind === 'beam_core') {
      const xyScale = 0.35 + amount * 0.65;
      effect.mesh.scale.set(xyScale, xyScale, Math.max(0.05, amount));
      effect.mesh.material.opacity = amount;
    } else if (effect.kind === 'boss_explosion_wave') {
      const progress = 1 - amount;
      const currentScale = effect.initialScale + progress * effect.expandSpeed;
      effect.mesh.scale.setScalar(currentScale);
      effect.mesh.material.opacity = amount * 0.22;
    } else {
      effect.mesh.material.opacity = amount * 0.82;
      effect.mesh.scale.set(1, 1, Math.max(0.08, amount));
    }

    if (effect.life <= 0) {
      effectsGroup.remove(effect.mesh);
      effect.mesh.geometry.dispose();
      effect.mesh.material.dispose();
      beams.splice(index, 1);
    }
  }

  for (let index = debris.length - 1; index >= 0; index -= 1) {
    const chunk = debris[index];
    if (!potionsSystem.isTimeFrozen()) {
      chunk.life -= delta;
      chunk.velocity.y -= 8.8 * delta;
      chunk.mesh.position.addScaledVector(chunk.velocity, delta);
      chunk.mesh.rotation.x += chunk.spin.x * delta;
      chunk.mesh.rotation.y += chunk.spin.y * delta;
      chunk.mesh.rotation.z += chunk.spin.z * delta;
    }
    chunk.mesh.material.opacity = Math.max(0, chunk.life / chunk.maxLife);
    if (chunk.life <= 0 || chunk.mesh.position.y < -1.2) {
      effectsGroup.remove(chunk.mesh);
      chunk.mesh.geometry.dispose();
      chunk.mesh.material.dispose();
      debris.splice(index, 1);
    }
  }

  if (damageTimer > 0) damageTimer -= delta;
  if (mistakeTimer > 0) mistakeTimer -= delta;
}

function updateEnvironment(seconds, delta, isTimeFrozen = false) {
  const envDelta = isTimeFrozen ? 0 : delta;
  updateWandSwings(envDelta);
  updateMeteors(envDelta);
  emberLight.intensity = seasonEmberIntensityBase + Math.sin(seconds * 5.8) * 0.34;
  const shake = damageTimer > 0 ? damageTimer * 0.45 : 0;
  camera.position.x = Math.sin(seconds * 0.34) * 0.28 + Math.sin(seconds * 41) * shake;
  camera.position.y = 7.2 + Math.sin(seconds * 0.52) * 0.12 + Math.cos(seconds * 37) * shake;
  camera.position.z = 12.8 + Math.sin(seconds * 0.28) * 0.18 + Math.sin(seconds * 43) * shake;
  camera.lookAt(cameraTarget);

  if (moon) {
    let targetMoonShadowStrength = 1;
    if (moonWaitTimer > 0) {
      // Moon has set — hide it and wait before rising again from the left
      moonWaitTimer -= envDelta;
      if (moonWaitTimer <= 0) moonAngle = 0;
      moon.visible = false;
      moon.material.opacity = 0;
      moonLight.position.set(0, 14, -22);
      targetMoonShadowStrength = 0;
    } else {
      moon.visible = true;
      moonAngle += envDelta * (Math.PI / 200); // full crossing in ~200 s
      if (moonAngle >= Math.PI) {
        moonAngle = Math.PI;
        moonWaitTimer = 7 + Math.random() * 3; // wait 7–10 s before next rise
      }
      positionMoonOnArc();
      const fadeZone = 0.18 * Math.PI;
      moon.material.opacity = moonAngle < fadeZone
        ? moonAngle / fadeZone
        : moonAngle > Math.PI - fadeZone
          ? (Math.PI - moonAngle) / fadeZone
          : 1;
      targetMoonShadowStrength = THREE.MathUtils.clamp(moon.material.opacity * 1.8, 0, 1);
    }
    updateMoonShadowFade(envDelta, targetMoonShadowStrength);
    updateMoonHaze();
  }

  starField.update(seconds, renderer.getPixelRatio ? renderer.getPixelRatio() : 1);
  rimLight.color.copy(hemiLight.color);
  visuals.sky.sync(camera, scene.fog.color, scene.background, skyTopColor, moon);
  visuals.motes.update(seconds, emberLight.color);
  fx.update(delta, camera);

  if (pathMarkerMaterial) {
    pathMarkerMaterial.emissiveIntensity = 1.5 + Math.sin(seconds * 2.8) * 0.5;
  }

  const scrollDelta = SCENERY_SCROLL_SPEED * delta * (isTimeFrozen ? 0 : mode === 'running' ? 1 : 0.35);

  updateRoad(scrollDelta);

  for (const marker of pathMarkerBlocks) {
    marker.mesh.position.z += scrollDelta * PATH_MARKER_SCROLL_MULTIPLIER;
    if (marker.mesh.position.z > PATH_MARKER_WRAP_Z) {
      marker.mesh.position.z -= PATH_MARKER_SPAN;
    }
    marker.mesh.position.y = marker.baseY + Math.sin(seconds * 3.2 + marker.phase) * 0.018;
  }

  const isChainLightningPrimed = potionsSystem ? potionsSystem.isChainLightningPrimed() : false;
  if (isChainLightningPrimed && !wandsArePrimed) {
    wandsArePrimed = true;
    sceneCrystalMat.color.setHex(0xfde068);
    sceneCrystalMat.emissive.setHex(0xfde068);
    sceneCrystalMat.emissiveIntensity = 3.5;
    for (const crown of lightningCrowns) crown.visible = true;
    for (const light of torchLights) light.color.setHex(0xfde068);
  } else if (!isChainLightningPrimed && wandsArePrimed) {
    wandsArePrimed = false;
    sceneCrystalMat.color.setHex(0x58dfcf);
    sceneCrystalMat.emissive.setHex(0x2dd4bf);
    sceneCrystalMat.emissiveIntensity = 2.6;
    for (const crown of lightningCrowns) crown.visible = false;
    for (const light of torchLights) light.color.setHex(0x2dd4bf);
  }

  if (wandsArePrimed) {
    const pulse = 1.1 + Math.sin(seconds * 12.0) * 0.18;
    for (const flame of torchFlames) {
      flame.mesh.scale.set(pulse, pulse, pulse);
    }
    sceneCrystalMat.emissiveIntensity = 3.2 + Math.sin(seconds * 9.0) * 0.8;
    for (const crown of lightningCrowns) {
      crown.rotation.y = seconds * 5.5;
      const cs = 1.0 + Math.sin(seconds * 11.0) * 0.12;
      crown.scale.set(cs, cs, cs);
    }
    for (const light of torchLights) {
      light.intensity = 2.6 + Math.sin(seconds * 10.0 + light.userData.phase) * 0.5;
    }
  } else {
    for (const flame of torchFlames) {
      const flamePulse = 1 + Math.sin(seconds * 8.5 + flame.phase) * 0.12;
      flame.mesh.scale.set(flamePulse, 1 + Math.cos(seconds * 7.2 + flame.phase) * 0.16, flamePulse);
    }
    for (const light of torchLights) {
      light.intensity = 1.55 + Math.sin(seconds * 7.8 + light.userData.phase) * 0.26;
    }
  }

  for (const canopy of canopyBlocks) {
    canopy.mesh.position.y = canopy.baseY + Math.sin(seconds * 0.92 + canopy.phase) * canopy.amount;
    canopy.mesh.rotation.y = Math.sin(seconds * 0.55 + canopy.phase) * 0.035;
  }

  for (const tree of scrollingTrees) {
    tree.group.position.z += scrollDelta * tree.speed;
    if (tree.group.position.z > TREE_MAX_Z) {
      tree.group.position.z -= TREE_SPAN;
    }
  }

  seasonalEffects.update(seconds, envDelta, scrollDelta);
  updateFinalWaveScenery(seconds, envDelta);

  updateClouds(envDelta);
}

function updateRoad(scrollDelta) {
  if (sceneGround) sceneGround.scroll(scrollDelta * ROAD_SCROLL_MULTIPLIER);
}

function positionMoonOnArc() {
  const moonX = -24 * Math.cos(moonAngle);
  const moonY = 4 + 24 * Math.sin(moonAngle);
  if (moon) moon.position.set(moonX, moonY, -42);
  moonLight.position.set(moonX * 0.55, Math.max(7, moonY * 0.55), -22);
}

function updateMoonHaze() {
  if (!moonHaze || !moon || !moon.visible) {
    if (moonHaze) moonHaze.style.opacity = '0';
    return;
  }

  moonScreenVector.copy(moon.position).project(camera);
  const x = (moonScreenVector.x * 0.5 + 0.5) * 100;
  const y = (-moonScreenVector.y * 0.5 + 0.5) * 100;
  const opacity = THREE.MathUtils.clamp(moon.material.opacity || 0, 0, 1);

  moonHaze.style.setProperty('--moon-haze-x', `${x.toFixed(2)}%`);
  moonHaze.style.setProperty('--moon-haze-y', `${y.toFixed(2)}%`);
  moonHaze.style.opacity = (0.74 * opacity).toFixed(3);
}

function updateMoonShadowFade(delta, targetStrength) {
  const rate = targetStrength > moonShadowStrength ? MOON_SHADOW_FADE_IN_RATE : MOON_SHADOW_FADE_OUT_RATE;
  moonShadowStrength = moveTowards(moonShadowStrength, targetStrength, rate * delta);
  updateMoonShadowLighting();
  updateFlyingShadowOpacity();
}

function setMoonShadowResolution(size) {
  if (moonLight.shadow.mapSize.x === size) return;
  moonLight.shadow.mapSize.set(size, size);
  if (moonLight.shadow.map) {
    moonLight.shadow.map.dispose();
    moonLight.shadow.map = null;
  }
}

function updateMoonShadowLighting() {
  // castShadow stays as Battery Saver set it: switching it here would recompile every shader.
  moonLight.intensity = moonLightBaseIntensity * moonShadowStrength;
}

function updateFlyingShadowOpacity() {
  for (const enemy of enemies) {
    if (!enemy.shadowMesh) continue;
    enemy.shadowMesh.visible = moonShadowStrength > 0.02;
    enemy.shadowMesh.material.opacity = FLYING_SHADOW_OPACITY * moonShadowStrength;
  }
}

function moveTowards(current, target, maxDelta) {
  if (Math.abs(target - current) <= maxDelta) return target;
  return current + Math.sign(target - current) * maxDelta;
}

function updateLabels() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  const safeBounds = getLabelSafeBounds(height);
  const hudGrid = document.querySelector('.hud-grid');
  const hudBottom = hudGrid ? hudGrid.getBoundingClientRect().bottom : 0;
  const labelItems = [];

  for (const enemy of enemies) {
    renderPrompt(enemy);
    reusableVector.copy(enemy.group.position);
    reusableVector.y += 3.2 * enemy.type.scale * (enemy.isClimaxBoss ? 1.5 : 1.0);
    reusableVector.project(camera);

    const isVisible = isEnemyTargetable(enemy) && reusableVector.z > -1 && reusableVector.z < 1;
    enemy.label.classList.toggle('is-hidden', !isVisible);
    enemy.label.classList.toggle('is-revealing', enemy.revealFlash > 0);
    if (!isVisible) continue;

    const x = (reusableVector.x * 0.5 + 0.5) * width;
    const y = (-reusableVector.y * 0.5 + 0.5) * height;
    const approachAmount = THREE.MathUtils.clamp((enemy.group.position.z - enemy.revealZ) / (WALL_Z - enemy.revealZ), 0, 1);
    const scale = enemy.isBoss
      ? THREE.MathUtils.lerp(0.92, 1.12, approachAmount)
      : THREE.MathUtils.lerp(0.86, 1.12, approachAmount);
    enemy.label.style.setProperty('--threat-progress', approachAmount.toFixed(3));

    if (enemy.isBoss) {
      // Project both road edges at the boss's depth so the label lands in the scenery area
      const bossY = enemy.group.position.y;
      const bossZ = enemy.group.position.z;
      reusableVector.set(5.8, bossY, bossZ);
      reusableVector.project(camera);
      const rightRoadEdgeX = (reusableVector.x * 0.5 + 0.5) * width;
      reusableVector.set(-5.8, bossY, bossZ);
      reusableVector.project(camera);
      const leftRoadEdgeX = (reusableVector.x * 0.5 + 0.5) * width;
      // Project boss mid-height for vertical centering beside boss
      reusableVector.copy(enemy.group.position);
      reusableVector.y += 1.3 * enemy.type.scale * (enemy.isClimaxBoss ? 1.5 : 1.0);
      reusableVector.project(camera);
      const bossMidScreenY = (-reusableVector.y * 0.5 + 0.5) * height;
      labelItems.push({ enemy, x, y, scale, rightRoadEdgeX, leftRoadEdgeX, bossMidScreenY });
    } else {
      labelItems.push({ enemy, x, y, scale });
    }
  }

  const layoutItems = labelItems.map((item) => {
    const { enemy, scale } = item;
    // The unscaled label box only changes when its text changes or the viewport resizes,
    // so cache the measurement to avoid a forced reflow per label every frame.
    if (enemy._labelDimsGen !== labelMeasureGen || enemy._labelDimsHtml !== enemy.lastPromptHtml) {
      enemy._labelW = enemy.label.offsetWidth;
      enemy._labelH = enemy.label.offsetHeight;
      enemy._labelDimsGen = labelMeasureGen;
      enemy._labelDimsHtml = enemy.lastPromptHtml;
    }
    const labelWidth = enemy._labelW * scale;
    const labelHeight = enemy._labelH * scale;
    const minY = safeBounds.top + labelHeight;
    const maxY = safeBounds.bottom;

    let targetX, targetY;
    if (enemy.isBoss) {
      // Place label in the scenery area outside the road boundaries (±5.8 world units),
      // using lane to decide left/right so boss bodies stay fully visible.
      const useRight = enemy.lane >= 0;
      const rawX = useRight
        ? item.rightRoadEdgeX + BOSS_LABEL_GAP + labelWidth / 2
        : item.leftRoadEdgeX - BOSS_LABEL_GAP - labelWidth / 2;
      targetX = THREE.MathUtils.clamp(rawX, LABEL_SAFE_MARGIN + labelWidth / 2, width - LABEL_SAFE_MARGIN - labelWidth / 2);
      // Left-side labels must clear the hud-grid (Score/Best/Life/Wave readouts)
      const leftMinY = useRight ? minY : Math.max(minY, hudBottom + LABEL_SAFE_MARGIN + labelHeight);
      targetY = THREE.MathUtils.clamp(item.bossMidScreenY + labelHeight / 2, leftMinY, maxY);
    } else {
      targetX = THREE.MathUtils.clamp(item.x, LABEL_SAFE_MARGIN + labelWidth / 2, width - LABEL_SAFE_MARGIN - labelWidth / 2);
      targetY = THREE.MathUtils.clamp(item.y, minY, maxY);
    }

    if (enemy.labelX === undefined) {
      enemy.labelX = targetX;
      enemy.labelY = targetY;
    } else {
      enemy.labelX += (targetX - enemy.labelX) * LABEL_X_EASE;
      enemy.labelY += (targetY - enemy.labelY) * LABEL_Y_EASE;
    }
    return {
      ...item,
      x: enemy.labelX,
      y: enemy.labelY,
      minY,
      maxY,
      width: labelWidth,
      height: labelHeight,
      left: enemy.labelX - labelWidth / 2,
      right: enemy.labelX + labelWidth / 2,
    };
  });

  resolveLabelStacks(layoutItems);

  for (const item of layoutItems) {
    const { enemy, scale } = item;
    enemy.labelY = item.y;
    enemy.label.style.left = `${enemy.labelX}px`;
    enemy.label.style.top = `${enemy.labelY}px`;
    enemy.label.style.transform = `translate(-50%, -100%) scale(${scale.toFixed(3)})`;
    enemy.label.classList.toggle('is-target', enemy === activeTarget);
    enemy.label.classList.toggle('is-warning', enemy.group.position.z > -10);
    enemy.label.classList.toggle('is-danger', enemy.group.position.z > -4);
    enemy.label.classList.toggle('is-critical', enemy.group.position.z > 1);
    enemy.label.classList.toggle('is-stunned', !!(enemy.stunTimer && enemy.stunTimer > 0));
  }
}

function resolveLabelStacks(items) {
  const groups = [];
  for (const item of items) {
    const matches = groups.filter(group => group.some(groupItem => labelsOverlapHorizontally(item, groupItem)));
    if (matches.length === 0) {
      groups.push([item]);
      continue;
    }
    const merged = [item, ...matches.flat()];
    for (const group of matches) {
      const index = groups.indexOf(group);
      if (index >= 0) groups.splice(index, 1);
    }
    groups.push(merged);
  }

  for (const group of groups) {
    // Sort bottommost first (largest Y = lowest on screen).
    // Primary pass pushes labels UPWARD so they never drift over monster bodies.
    group.sort((a, b) => b.y - a.y || a.enemy.id - b.enemy.id);

    for (let index = 0; index < group.length; index += 1) {
      const item = group[index];
      item.y = THREE.MathUtils.clamp(item.y, item.minY, item.maxY);
      if (index === 0) continue;

      // previous is the label immediately below — push current label UP if needed
      const previous = group[index - 1];
      const maxBottom = previous.y - previous.height - LABEL_STACK_GAP;
      if (item.y > maxBottom) item.y = maxBottom;
    }

    // If topmost label crossed minY, shift the whole group back down together
    const last = group[group.length - 1];
    if (last && last.y < last.minY) {
      const underflow = last.minY - last.y;
      for (const item of group) item.y += underflow;
    }

    // Reverse pass: re-check from top downward in case the shift above caused gaps
    for (let index = group.length - 2; index >= 0; index -= 1) {
      const item = group[index];
      const next = group[index + 1]; // next is above current
      const minBottom = next.y + next.height + LABEL_STACK_GAP;
      if (item.y < minBottom) item.y = minBottom;
    }

    // Final clamp: if bottommost label was pushed below maxY, shift all up
    const first = group[0];
    if (first && first.y > first.maxY) {
      const overflow = first.y - first.maxY;
      for (const item of group) item.y -= overflow;
    }
  }
}

function labelsOverlapHorizontally(first, second) {
  return first.left < second.right + LABEL_STACK_GAP && first.right > second.left - LABEL_STACK_GAP;
}

function getLabelSafeBounds(height) {
  const barBottom = gameBar ? gameBar.getBoundingClientRect().bottom : 0;
  const inputTop = typingStrip ? typingStrip.getBoundingClientRect().top : height;
  const top = Math.ceil(barBottom + LABEL_SAFE_MARGIN);
  const bottom = Math.floor(Math.min(height - LABEL_SAFE_MARGIN, inputTop - LABEL_SAFE_MARGIN));
  return {
    top,
    bottom: Math.max(top + 72, bottom),
  };
}

function displayTypedBuffer() {
  if (!typedBuffer) return '';
  if (!activeTarget) return typedBuffer;
  const effectiveSP = activeTarget._matchedSearchPrompt?.startsWith(typedBuffer)
    ? activeTarget._matchedSearchPrompt
    : activeTarget.searchPrompt;
  if (!effectiveSP.startsWith(typedBuffer)) return typedBuffer;
  if (activeTarget.limitedParts) return displayLimitedTypedBuffer(activeTarget, typedBuffer);
  return activeTarget.prompt.slice(0, promptIndexForProgress(activeTarget.prompt, typedBuffer.length, {
    multiplicationAlias: activeTarget.isEquation,
  }));
}

function displayLimitedTypedBuffer(enemy, progressText) {
  const promptOptions = { multiplicationAlias: enemy.isEquation };
  let charsLeft = progressText.length;
  const typedParts = [];

  for (const part of enemy.limitedParts) {
    if (!part.isHidden) continue;
    const answerText = part.answerText || part.text;
    const sp = buildSearchPrompt(answerText, promptOptions);
    const typedCount = Math.min(charsLeft, sp.length);
    charsLeft -= typedCount;

    if (typedCount > 0) {
      const charPos = promptIndexForProgress(answerText, typedCount, promptOptions);
      typedParts.push(answerText.slice(0, charPos));
    }

    if (charsLeft <= 0) break;
  }

  return typedParts.join(' ');
}

function renderPrompt(enemy) {
  const effectiveSP = enemy._matchedSearchPrompt?.startsWith(typedBuffer)
    ? enemy._matchedSearchPrompt
    : enemy.searchPrompt;
  const matched = effectiveSP.startsWith(typedBuffer) && typedBuffer.length > 0;
  const typedProgress = matched ? typedBuffer.length : 0;

  let html;
  if (enemy.limitedParts) {
    html = buildLimitedPromptHtml(enemy, typedProgress);
  } else {
    const typedLen = typedProgress > 0 ? promptIndexForProgress(enemy.prompt, typedProgress, {
      multiplicationAlias: enemy.isEquation,
    }) : 0;
    const typedText = enemy.prompt.slice(0, typedLen);
    const remainingText = enemy.maskPrompt ? enemy.hintMask.slice(typedLen) : enemy.prompt.slice(typedLen);
    html = `<span class="typed">${wrapSups(escapeHtml(typedText))}</span>`
         + `<span class="remaining">${wrapSups(escapeHtml(remainingText))}</span>`;
  }

  if (enemy.lastPromptHtml === html) return;
  enemy.lastPromptHtml = html;
  enemy.promptNode.innerHTML = html;
}

function buildLimitedPromptHtml(enemy, typedProgress) {
  let charsLeft = typedProgress;
  let html = '';
  for (const part of enemy.limitedParts) {
    if (part.isWhitespace) {
      html += wrapSups(escapeHtml(part.text));
    } else if (!part.isHidden) {
      html += `<span class="given-tok">${wrapSups(escapeHtml(part.text))}</span>`;
    } else {
      const promptOptions = { multiplicationAlias: enemy.isEquation };
      const answerText = part.answerText || part.text;
      const hintOptions = {
        ...promptOptions,
        leadingTypeableCount: enemy.hintLetterCount,
      };
      const sp = buildSearchPrompt(answerText, promptOptions);
      const tokTyped = Math.min(charsLeft, sp.length);
      charsLeft -= tokTyped;
      const exponentHtml = part.exponentText ? wrapSups(escapeHtml(part.exponentText)) : '';
      const wrapSquared = !!part.exponentText;
      if (tokTyped > 0) {
        const charPos = promptIndexForProgress(answerText, tokTyped, promptOptions);
        const typedPart = answerText.slice(0, charPos);
        const remainPart = answerText.slice(charPos);
        if (wrapSquared) html += '(';
        html += `<span class="typed">${wrapSups(escapeHtml(typedPart))}</span>`;
        if (remainPart) {
          const maskedPart = buildHintPart(answerText, hintOptions).slice(charPos);
          html += `<span class="remaining">${wrapSups(escapeHtml(maskedPart))}</span>`;
        }
        if (wrapSquared) html += `)${exponentHtml}`;
      } else {
        if (wrapSquared) html += '(';
        html += `<span class="remaining">${wrapSups(escapeHtml(buildHintPart(answerText, hintOptions)))}</span>`;
        if (wrapSquared) html += `)${exponentHtml}`;
      }
    }
  }
  return html;
}

function createLifeMeter() {
  healthValue.textContent = '';
  for (let index = 0; index < HEART_COUNT; index += 1) {
    const heart = document.createElement('span');
    heart.className = 'life-heart';
    heart.dataset.index = String(index);
    heart.innerHTML = `
      <svg viewBox="0 0 32 32" aria-hidden="true" focusable="false">
        <path class="heart-shell" d="${HEART_PATH}"></path>
        <path class="heart-fill" d="${HEART_PATH}"></path>
      </svg>
    `;
    healthValue.append(heart);
  }
}

function updateLifeMeter(force) {
  const life = Math.max(0, Math.min(MAX_LIFE, health));
  if (!force && renderedHealth === life) return;

  const previousLife = renderedHealth === null ? life : renderedHealth;
  const hearts = healthValue.querySelectorAll('.life-heart');
  for (const heart of hearts) {
    const index = Number.parseInt(heart.dataset.index || '0', 10);
    const units = Math.max(0, Math.min(2, life - index * 2));
    const previousUnits = Math.max(0, Math.min(2, previousLife - index * 2));
    heart.classList.toggle('is-full', units === 2);
    heart.classList.toggle('is-half', units === 1);
    heart.classList.toggle('is-empty', units === 0);

    if (units < previousUnits) {
      heart.classList.remove('is-hit');
      void heart.offsetWidth;
      heart.classList.add('is-hit');
    }
  }

  const heartText = formatHeartCount(life);
  healthValue.setAttribute('aria-label', `Life: ${heartText} of ${HEART_COUNT} hearts`);
  healthValue.title = `Life: ${heartText}/${HEART_COUNT}`;
  renderedHealth = life;
}

function formatHeartCount(life) {
  const hearts = life / 2;
  return Number.isInteger(hearts) ? String(hearts) : hearts.toFixed(1);
}

function updateHud(force) {
  hudTimer -= 1;
  if (!force && hudTimer > 0) return;
  hudTimer = 6;
  scoreValue.textContent = formatScore(score);
  const isUnranked = godModeUsedThisRun || potionCheatUsedThisRun || finalWaveCheatUsedThisRun;
  bestValue.textContent = formatScore(isUnranked ? bestScore : Math.max(bestScore, score));
  updateLifeMeter(force);
  waveValue.textContent = String(waveSet);
  updateComboDisplay();
  updateTypingLabel();
}

function currentDifficulty() {
  return GAME_PROFILE;
}

function updatePhaseDisplay() {
  if (!phaseValue) return;
  const profile = currentDifficulty();
  if (mode === 'running') {
    const phase = wavePhase === 'boss' ? 'Boss wave' : 'Normal wave';
    phaseValue.textContent = `Wave ${waveSet} · ${phase}`;
    return;
  }
  if (mode === 'paused') {
    phaseValue.textContent = `Paused · Wave ${waveSet}`;
    return;
  }
  if (mode === 'wave_cleared') {
    phaseValue.textContent = `Wave ${waveSet} cleared`;
    return;
  }
  if (mode === 'gameover' || mode === 'ending') {
    phaseValue.textContent = mode === 'ending' ? 'Victory' : 'Run ended';
    return;
  }
  phaseValue.textContent = profile.phaseLabel;
}

function getNormalEnemyTarget(wave) {
  return NORMAL_ENEMY_TARGETS[Math.min(wave, NORMAL_ENEMY_TARGETS.length) - 1];
}

function getNormalWaveTypingBudget(wave) {
  return NORMAL_TYPING_BUDGETS[Math.min(wave, NORMAL_TYPING_BUDGETS.length) - 1];
}

function getActiveTypingPressureLimit() {
  return Math.min(
    ACTIVE_TYPING_PRESSURE_MAX,
    ACTIVE_TYPING_PRESSURE_BASE + Math.max(0, waveSet - 1) * ACTIVE_TYPING_PRESSURE_GROWTH
  );
}

function getEnemyTypingCost(enemy) {
  if (!enemy) return 0;
  const length = Math.max(1, enemy.searchPrompt.length);
  if (enemy.isMedic || enemy.isMimic) return length * 0.65;
  return length;
}

function registerNormalTypingCost(enemy) {
  if (!enemy || enemy.isBoss || wavePhase !== 'normal') return;
  normalTypingCostSpawned += getEnemyTypingCost(enemy);
}

function getActiveTypingPressure() {
  return enemies.reduce((sum, enemy) => {
    if (enemy.isBoss || enemy.dying) return sum;
    return sum + getEnemyTypingCost(enemy);
  }, 0);
}

function getActiveLongPromptCount() {
  return enemies.reduce((count, enemy) => {
    if (enemy.isBoss || enemy.isMedic || enemy.isMimic || enemy.dying) return count;
    return count + (getEnemyTypingCost(enemy) >= LONG_ACTIVE_PROMPT_COST ? 1 : 0);
  }, 0);
}

function getActiveLongPromptLimit() {
  return waveSet >= 5 ? LATE_ACTIVE_LONG_PROMPT_LIMIT : ACTIVE_LONG_PROMPT_LIMIT;
}

function canAcceptNormalSpawnPressure() {
  return getActiveTypingPressure() < getActiveTypingPressureLimit()
    && getActiveLongPromptCount() < getActiveLongPromptLimit();
}

function isNormalTypingBudgetReached() {
  return normalTypingCostSpawned >= getNormalWaveTypingBudget(waveSet);
}

function isNormalWaveComplete() {
  if (normalEnemiesSpawned >= normalEnemyTarget) return true;
  if (isNormalTypingBudgetReached()) {
    // If typing budget is reached, we only allow spawning scheduled boss previews
    return !bossPreviewSchedule.has(normalEnemiesSpawned);
  }
  return false;
}

function getEnemyLimit() {
  return currentDifficulty().enemyLimit;
}

function getEnemySpeed(enemy) {
  const profile = currentDifficulty();
  if (enemy.isBoss) {
    const responseTime = 18 + enemy.searchPrompt.length * 0.8;
    return (WALL_Z - enemy.revealZ) / responseTime;
  }
  const wavePressure = Math.max(0, waveSet - 1) * profile.waveSpeedBonus;
  const longPromptPenalty = Math.max(0, enemy.searchPrompt.length - (enemy.isBoss ? 6 : 8));
  const lengthFactor = THREE.MathUtils.clamp(
    1 / (1 + longPromptPenalty * (enemy.isBoss ? 0.08 : 0.06)),
    enemy.isBoss ? 0.55 : 0.58,
    1
  );
  return (enemy.speed + wavePressure) * profile.speedMultiplier * lengthFactor;
}

function updateTypedDisplay() {
  typedValue.textContent = displayTypedBuffer() || (mode === 'running' ? '...' : 'ready');
  updateComboDisplay();
}

function spawnEnemy(options = {}) {
  const isBoss = options.isBoss || false;
  const isMedic = options.isMedic || false;
  const isMimic = options.isMimic || false;
  const isClimaxBoss = options.isClimaxBoss || false;
  const wordData = options.wordData
    ? options.wordData
    : options.forcedPrompt
    ? (ALL_WORDS.find(w => w.term === options.forcedPrompt) || { term: options.forcedPrompt, definition: null })
    : isMedic
    ? chooseMedicPrompt()
    : isMimic
    ? chooseMimicPrompt()
    : choosePrompt();

  const isEquationPrompt = !!wordData.isEquation;
  const showDefinition = !!wordData.definition && isBoss;
  const type = isBoss ? (options.bossType || chooseBossType(bossesSpawned)) : isMedic ? MEDIC_TYPE : isMimic ? MIMIC_TYPE : weightedPick(ENEMY_TYPES);
  const hintRange = isBoss ? getBossQuestionHintRange() : null;
  if (isMedic && !firstMedicHintShown) {
    firstMedicHintShown = true;
    window.setTimeout(() => { if (mode === 'running') showBanner('TYPE TO HEAL!', 'medic-hint'); }, 1100);
  }
  if (isMimic && !firstMimicHintShown) {
    firstMimicHintShown = true;
    window.setTimeout(() => { if (mode === 'running') showBanner('MIMIC CHEST DETECTED!', 'mimic-hint'); }, 1100);
  }
  const group = isMimic ? createMimicChestMesh(type) : createEnemyMesh(type);
  const spawnBaseZ = Number.isFinite(options.startZ) ? options.startZ : chooseSpawnZ();
  const spawnSpread = Number.isFinite(options.delay)
    ? options.delay
    : Math.random() * (waveSet === 1 ? FIRST_WAVE_SPAWN_SPREAD : SPAWN_SPREAD);
  const startZ = spawnBaseZ - spawnSpread;
  const lane = Number.isFinite(options.lane) ? options.lane : chooseSpawnLane(startZ);
  const revealZ = currentDifficulty().revealZ;
  const isFlying = isBoss && !!type.isFlying;
  const spawnBaseY = isFlying ? 2.4 : 0.32;
  group.position.set(lane, spawnBaseY, startZ);
  group.scale.setScalar(type.scale * (isClimaxBoss ? 1.5 : 1.0));
  enemyGroup.add(group);

  let shadowMesh = null;
  if (isFlying) {
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: FLYING_SHADOW_OPACITY * moonShadowStrength,
      depthWrite: false,
    });
    shadowMesh = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.06, 3.8), shadowMat);
    shadowMesh.position.set(lane, 0.04, startZ);
    shadowMesh.visible = moonShadowStrength > 0.02;
    if (isClimaxBoss) shadowMesh.scale.setScalar(1.5);
    scene.add(shadowMesh);
  }

  const promptKind = (isBoss && isEquationPrompt) ? 'equation' : showDefinition ? 'definition' : isMedic ? 'medic' : isMimic ? 'mimic' : 'keyword';
  const label = document.createElement('div');
  label.className = isBoss
    ? 'word-tag is-boss is-hidden'
    : isMedic
    ? 'word-tag is-medic is-hidden'
    : isMimic
    ? 'word-tag is-mimic is-hidden'
    : 'word-tag is-hidden';
  label.dataset.kind = promptKind;
  label.style.setProperty('--threat-progress', '0');
  if (isBoss) {
    label.style.setProperty('--boss-accent', hexColor(type.trim));
    label.style.setProperty('--boss-glow', hexColor(type.eye));
  }

  const kindNode = document.createElement('span');
  kindNode.className = 'prompt-kind';
  kindNode.textContent = promptKind === 'mimic' ? 'loot' : promptKind;

  const promptNode = document.createElement('span');
  promptNode.className = 'prompt';

  label.append(kindNode);

  if (showDefinition) {
    const definitionNode = document.createElement('span');
    definitionNode.className = 'definition';
    definitionNode.textContent = wordData.definition;
    label.append(definitionNode, promptNode);
  } else {
    label.append(promptNode);
  }

  const threatNode = document.createElement('span');
  threatNode.className = 'threat-meter';
  threatNode.append(document.createElement('i'));
  label.append(threatNode);

  labelsLayer.append(label);

  const promptOptions = { multiplicationAlias: isEquationPrompt };
  const twoWordData = isBoss
    ? buildBossPrompt(wordData.term, {
        ...promptOptions,
        maxAnswerLength: bossAnswerLengthCap(waveSet),
      })
    : null;
  const enemy = {
    id: enemyId,
    type,
    group,
    label,
    promptNode,
    prompt: wordData.term,
    definition: wordData.definition || null,
    isEquation: isEquationPrompt,
    searchPrompt: twoWordData ? twoWordData.searchPrompt : buildSearchPrompt(wordData.term, promptOptions),
    altSearchPrompts: twoWordData ? twoWordData.altSearchPrompts : buildAltSearchPrompts(wordData.term, promptOptions),
    _matchedSearchPrompt: null,
    limitedParts: twoWordData ? twoWordData.parts : null,
    showDefinition,
    maskPrompt: showDefinition && !isEquationPrompt,
    hintMask: showDefinition && !isEquationPrompt
      ? buildHintMask(wordData.term, {
          ...promptOptions,
          hintRange,
          leadingTypeableCount: isBoss ? 3 : 1,
        })
      : null,
    hintRange,
    hintLetterCount: isBoss ? 3 : 1,
    lastPromptHtml: '',
    promptKind,
    isBoss,
    isMedic,
    isMimic,
    isClimaxBoss,
    lidOpenProgress: 0,
    hasOpened: false,
    isFlying,
    shadowMesh,
    lane,
    spawnZ: startZ,
    revealZ,
    revealed: startZ >= revealZ,
    revealFlash: 0,
    speed: isBoss ? type.speed : isMedic ? type.speed + Math.random() * 0.18 : isMimic ? type.speed + Math.random() * 0.25 : type.speed + Math.random() * 0.35,
    damage: isBoss ? BOSS_CONTACT_DAMAGE : isMedic ? 0 : MINION_DAMAGE,
    shotTimer: isBoss ? BOSS_FIRST_SHOT_DELAY + Math.random() * 0.7 : 0,
    baseY: spawnBaseY,
    age: 0,
    wobbleAmount: isBoss ? 0.05 : 0.08 + Math.random() * 0.2,
    wobbleSpeed: isBoss ? 0.7 : 1.2 + Math.random() * 1.4,
    stepBounce: isFlying ? 0 : isBoss ? 0.04 : 0.06 + Math.random() * 0.08,
    floatAmount: isFlying ? 0.22 : 0,
    phase: Math.random() * Math.PI * 2,
  };
  if (!isBoss && previewableWordsThisSet.some(w => w.term === wordData.term)) {
    introducedBossTermsThisSet.add(wordData.term);
  }
  enemyId += 1;
  enemies.push(enemy);
  renderPrompt(enemy);
  selectTarget();
  return enemy;
}

function chooseSpawnZ() {
  return waveSet === 1 ? FIRST_WAVE_SPAWN_Z : SPAWN_Z;
}

function chooseSpawnLane(startZ) {
  const openLanes = PATH_LANES.filter((lane) => {
    return !enemies.some((enemy) => Math.abs(enemy.lane - lane) < 1.5 && Math.abs(enemy.group.position.z - startZ) < 14);
  });
  const lanePool = openLanes.length > 0 ? openLanes : PATH_LANES;
  return lanePool[Math.floor(Math.random() * lanePool.length)];
}

function createWorld() {
  createGround();
  createTorches();
  createTrees();
  createPathMarkers();
}

// Three.js deletes a shader once no material uses it, so short-lived effects (debris,
// beams, shockwaves) would recompile theirs each time they reappear. These specks,
// hidden under the road, keep one material of each kind alive.
function createShaderKeepers() {
  const keepers = new THREE.Group();
  keepers.position.set(0, -1.2, -10);
  keepers.scale.setScalar(0.001);
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const materials = [
    new THREE.MeshStandardMaterial({ transparent: true }),
    new THREE.MeshBasicMaterial({ transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }),
    new THREE.MeshBasicMaterial({ transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }),
    new THREE.MeshBasicMaterial({ transparent: true }),
    new THREE.MeshBasicMaterial({ transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }),
  ];
  for (const material of materials) {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.frustumCulled = false;
    keepers.add(mesh);
  }
  keepers.add(new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })));
  world.add(keepers);
}

function createGround() {
  // The ground runs well past the last trees so its far edge is lost in the haze.
  sceneGround = createLowPolyTerrain({ minZ: ROAD_MIN_Z - 54, maxZ: ROAD_MAX_Z });
  world.add(sceneGround.mesh);
}

function createLightningCrown() {
  const mat = new THREE.MeshStandardMaterial({
    color: 0xfde068, emissive: 0xfde068, emissiveIntensity: 3.2,
    roughness: 0.05, metalness: 0.1,
  });
  const crown = new THREE.Group();
  const R = 0.42;
  for (let i = 0; i < 3; i++) {
    const angle = (i / 3) * Math.PI * 2;
    const boltGroup = new THREE.Group();
    boltGroup.position.set(Math.sin(angle) * R, 0, Math.cos(angle) * R);
    boltGroup.rotation.y = angle;
    const top = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.22, 0.05), mat);
    top.position.set(0.05, 0.28, 0);
    top.rotation.z = 0.55;
    boltGroup.add(top);
    const mid = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.22, 0.05), mat);
    mid.position.set(-0.04, 0.06, 0);
    mid.rotation.z = -0.55;
    boltGroup.add(mid);
    const bot = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.16, 0.04), mat);
    bot.position.set(0.06, -0.12, 0);
    bot.rotation.z = 0.55;
    boltGroup.add(bot);
    crown.add(boltGroup);
  }
  return crown;
}

function createTorches() {
  const shaftMat = new THREE.MeshStandardMaterial({ color: 0x6b4226, roughness: 0.9, flatShading: true });
  const bandMat = new THREE.MeshStandardMaterial({ color: 0xd9a441, roughness: 0.4, metalness: 0.6, flatShading: true });
  const wandPart = (geometry, material, y) => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.y = y;
    mesh.castShadow = true;
    return mesh;
  };
  sceneCrystalMat = new THREE.MeshStandardMaterial({
    color: 0x58dfcf, emissive: 0x2dd4bf, emissiveIntensity: 2.6,
    roughness: 0.1, metalness: 0.2, transparent: true, opacity: 0.9, flatShading: true,
  });

  for (const x of [-5.35, 5.35]) {
    const z = WALL_Z - 0.2;

    // Wand group — pivot at the base so the whole wand rotates as one unit
    const wandGroup = new THREE.Group();
    wandGroup.position.set(x, 0, z);
    world.add(wandGroup);
    wandGroups.push(wandGroup);

    // Shaft (local coords: x=0, z=0 relative to wand base)
    wandGroup.add(wandPart(new THREE.CylinderGeometry(0.07, 0.12, 1.9, 5), shaftMat, 0.95));
    // Decorative bands
    wandGroup.add(wandPart(new THREE.CylinderGeometry(0.15, 0.15, 0.1, 6), bandMat, 0.38));
    wandGroup.add(wandPart(new THREE.CylinderGeometry(0.13, 0.13, 0.1, 6), bandMat, 1.0));
    wandGroup.add(wandPart(new THREE.CylinderGeometry(0.11, 0.11, 0.1, 6), bandMat, 1.74));
    // Crystal cage (metal brackets framing the orb)
    wandGroup.add(wandPart(new THREE.CylinderGeometry(0.2, 0.12, 0.12, 6), bandMat, 1.88));
    wandGroup.add(wandPart(new THREE.ConeGeometry(0.07, 0.16, 4), bandMat, 2.5));

    // Crystal cluster group (pulsed as a unit, local to wandGroup)
    const crystalGroup = new THREE.Group();
    crystalGroup.position.set(0, 2.11, 0);
    const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.26, 0), sceneCrystalMat);
    core.scale.set(1, 1.35, 1);
    core.castShadow = true;
    crystalGroup.add(core);
    const leftShard = new THREE.Mesh(new THREE.OctahedronGeometry(0.12, 0), sceneCrystalMat);
    leftShard.scale.set(1, 1.6, 1);
    leftShard.position.set(-0.2, 0.08, 0);
    leftShard.rotation.z = 0.35;
    leftShard.castShadow = true;
    crystalGroup.add(leftShard);
    const rightShard = new THREE.Mesh(new THREE.OctahedronGeometry(0.12, 0), sceneCrystalMat);
    rightShard.scale.set(1, 1.6, 1);
    rightShard.position.set(0.2, 0.08, 0);
    rightShard.rotation.z = -0.35;
    rightShard.castShadow = true;
    crystalGroup.add(rightShard);
    wandGroup.add(crystalGroup);
    torchFlames.push({ mesh: crystalGroup, phase: Math.random() * Math.PI * 2 });

    // Lightning crown — shown only when chain lightning is primed
    const crown = createLightningCrown();
    crown.position.set(0, 2.72, 0);
    crown.visible = false;
    wandGroup.add(crown);
    lightningCrowns.push(crown);

    // Point light parented to the wand so it follows the swing
    const light = new THREE.PointLight(0x2dd4bf, 1.6, 14, 2);
    light.position.set(0, 2.2, 0);
    light.userData.phase = Math.random() * Math.PI * 2;
    wandGroup.add(light);
    torchLights.push(light);
  }
}

function createTrees() {
  sceneTrunkMaterial = new THREE.MeshStandardMaterial({ color: 0x513820, roughness: 0.95, flatShading: true });
  sceneLeafMaterials = [
    new THREE.MeshStandardMaterial({ color: 0x1f5b38, roughness: 0.95, flatShading: true }),
    new THREE.MeshStandardMaterial({ color: 0x2f7247, roughness: 0.95, flatShading: true }),
    new THREE.MeshStandardMaterial({ color: 0x163d30, roughness: 0.95, flatShading: true }),
  ];
  const rockMaterial = new THREE.MeshStandardMaterial({ color: 0xd6ccb4, roughness: 1, flatShading: true });

  for (let index = 0; index < 34; index += 1) {
    const side = index % 2 === 0 ? -1 : 1;
    const { group: tree, crowns } = createLowPolyTree({
      kind: index % 3 === 2 ? 'pine' : 'round',
      trunkMaterial: sceneTrunkMaterial,
      leafMaterials: sceneLeafMaterials,
      seed: index + 1,
    });
    tree.position.set(side * (7.8 + Math.random() * 2.3), -0.12, -52 + Math.random() * 62);
    tree.scale.setScalar(index % 7 === 3 ? 1.9 : 1.05 + Math.random() * 0.55);
    world.add(tree);
    scrollingTrees.push({ group: tree, speed: 0.8 + Math.random() * 0.45 });
    for (const crown of crowns) {
      canopyBlocks.push({
        mesh: crown,
        baseY: crown.position.y,
        phase: Math.random() * Math.PI * 2,
        amount: 0.018 + Math.random() * 0.02,
      });
    }
  }

  for (let index = 0; index < 16; index += 1) {
    const side = index % 2 === 0 ? -1 : 1;
    const rock = createLowPolyRock(rockMaterial, index + 1);
    rock.position.set(side * (5.6 + Math.random() * 5.4), 0.05, -52 + Math.random() * 62);
    world.add(rock);
    scrollingTrees.push({ group: rock, speed: 1 });
  }
}

function createPathMarkers() {
  pathMarkerMaterial = new THREE.MeshStandardMaterial({
    color: 0x58dfcf,
    emissive: 0x0e6861,
    emissiveIntensity: 1.5,
    roughness: 0.55,
    flatShading: true,
  });
  // Flat glowing diamonds set into the road.
  const markerGeometry = new THREE.OctahedronGeometry(1, 0);
  const markerScale = new THREE.Vector3(0.16, 0.05, 0.6);
  for (let z = PATH_MARKER_MIN_Z; z <= PATH_MARKER_MAX_Z; z += PATH_MARKER_SPACING) {
    const leftMarker = new THREE.Mesh(markerGeometry, pathMarkerMaterial);
    leftMarker.position.set(-3.4, PATH_MARKER_BASE_Y, z);
    const rightMarker = new THREE.Mesh(markerGeometry, pathMarkerMaterial);
    rightMarker.position.set(3.4, PATH_MARKER_BASE_Y, z);
    leftMarker.scale.copy(markerScale);
    rightMarker.scale.copy(markerScale);
    configurePathMarker(leftMarker);
    configurePathMarker(rightMarker);
    world.add(leftMarker);
    world.add(rightMarker);
    pathMarkerBlocks.push({ mesh: leftMarker, baseY: leftMarker.position.y, phase: z * 0.3 });
    pathMarkerBlocks.push({ mesh: rightMarker, baseY: rightMarker.position.y, phase: z * 0.3 + Math.PI });
  }
}

function configurePathMarker(marker) {
  marker.castShadow = false;
  marker.receiveShadow = false;
}

function createSky() {
  const moonGeometry = new THREE.SphereGeometry(3.2, 24, 16);
  const moonMaterial = new THREE.MeshBasicMaterial({ color: 0xfff1b8, transparent: true, fog: false });
  moon = new THREE.Mesh(moonGeometry, moonMaterial);
  positionMoonOnArc();
  scene.add(moon);

  starField = visuals.stars;
  finalWaveScenery = createFinalWaveScenery();
}

function createMeteors() {
  for (let index = 0; index < 5; index += 1) {
    const group = new THREE.Group();
    const tailMaterial = new THREE.MeshBasicMaterial({
      color: 0x9fd7ff,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog: false,
    });
    const coreMaterial = new THREE.MeshBasicMaterial({
      color: 0xfff4ba,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog: false,
    });
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: 0x6fb6ff,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog: false,
    });
    const tail = new THREE.Mesh(new THREE.BoxGeometry(6.5, 0.08, 0.08), tailMaterial);
    tail.position.x = -3.0;
    const core = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 8), coreMaterial);
    core.position.x = 0.42;
    const glow = new THREE.Mesh(new THREE.SphereGeometry(0.58, 16, 8), glowMaterial);
    glow.position.x = 0.42;
    group.add(tail, core, glow);
    group.rotation.z = -0.16;
    group.visible = false;
    scene.add(group);
    meteors.push({
      group,
      materials: [tailMaterial, coreMaterial, glowMaterial],
      baseOpacities: [0.45, 0.95, 0.26],
      age: 0,
      duration: 1,
      delay: 2 + index * 2.2,
      fadeOutStart: 0.58,
      start: new THREE.Vector3(),
      end: new THREE.Vector3(),
      scale: 1,
    });
    resetMeteor(meteors[index], true);
  }
}

function resetMeteor(meteor, stagger = false) {
  meteor.age = 0;
  meteor.duration = 1.2 + Math.random() * 1.5;
  meteor.delay = stagger ? Math.random() * 8 : 1.2 + Math.random() * 5.8;
  meteor.fadeOutStart = 0.48 + Math.random() * 0.2;
  const y = 13 + Math.random() * 9;
  const z = -76 - Math.random() * 18;
  meteor.start.set(-42 - Math.random() * 18, y, z);
  meteor.end.set(42 + Math.random() * 22, y - (2.2 + Math.random() * 4.6), z - (1 + Math.random() * 5));
  meteor.scale = 0.62 + Math.random() * 0.7;
  meteor.group.scale.setScalar(meteor.scale);
  meteor.group.position.copy(meteor.start);
  meteor.group.visible = false;
  for (const material of meteor.materials) material.opacity = 0;
}

function updateMeteors(delta) {
  const active = isFinalWave() && mode === 'running';
  for (const meteor of meteors) {
    if (!active) {
      meteor.group.visible = false;
      for (const material of meteor.materials) material.opacity = 0;
      continue;
    }

    if (meteor.delay > 0) {
      meteor.delay -= delta;
      meteor.group.visible = false;
      continue;
    }

    meteor.age += delta;
    const t = THREE.MathUtils.clamp(meteor.age / meteor.duration, 0, 1);
    if (t >= 1) {
      resetMeteor(meteor);
      continue;
    }

    const fadeIn = THREE.MathUtils.clamp(t / 0.18, 0, 1);
    const fadeOut = 1 - THREE.MathUtils.clamp((t - meteor.fadeOutStart) / (1 - meteor.fadeOutStart), 0, 1);
    const opacity = fadeIn * fadeOut;
    meteor.group.visible = opacity > 0.02;
    meteor.group.position.lerpVectors(meteor.start, meteor.end, t);
    meteor.group.rotation.z = -0.16 + Math.sin((meteor.age + meteor.scale) * 1.7) * 0.025;
    for (let index = 0; index < meteor.materials.length; index += 1) {
      meteor.materials[index].opacity = meteor.baseOpacities[index] * opacity;
    }
  }
}

function buildCloudGroup(material, template) {
  return createLowPolyCloud(material, template);
}

function createClouds() {
  // Lit, so the facets show, with enough self-glow that clouds stay bright.
  baseCloudMaterial = new THREE.MeshLambertMaterial({
    color: 0xf0f2f8,
    emissive: 0x6a6670,
    transparent: true,
    opacity: 0.92,
    flatShading: true,
  });
  weatherCloudMaterial = new THREE.MeshLambertMaterial({
    color: 0xd8e4f2,
    emissive: 0x5a5a66,
    transparent: true,
    opacity: 0,
    flatShading: true,
  });
  const configs = [
    { x: -38, y: 17.5, z: -50, scale: 1.05, speed: 0.55, t: 0 },
    { x: -18, y: 19.0, z: -58, scale: 0.80, speed: 0.40, t: 1 },
    { x:  -2, y: 15.5, z: -40, scale: 1.20, speed: 0.70, t: 2 },
    { x:  14, y: 18.0, z: -54, scale: 0.90, speed: 0.48, t: 0 },
    { x:  28, y: 16.5, z: -44, scale: 1.10, speed: 0.62, t: 1 },
    { x: -30, y: 20.0, z: -62, scale: 0.70, speed: 0.35, t: 2 },
    { x:   8, y: 21.0, z: -60, scale: 0.85, speed: 0.42, t: 0 },
    { x:  38, y: 17.0, z: -46, scale: 1.00, speed: 0.58, t: 1 },
    { x: -44, y: 15.0, z: -38, scale: 1.30, speed: 0.50, t: 2, weatherOnly: true },
    { x: -26, y: 16.2, z: -52, scale: 1.10, speed: 0.44, t: 0, weatherOnly: true },
    { x: -10, y: 18.4, z: -63, scale: 0.95, speed: 0.37, t: 1, weatherOnly: true },
    { x:   6, y: 14.6, z: -36, scale: 1.35, speed: 0.61, t: 2, weatherOnly: true },
    { x:  21, y: 19.2, z: -59, scale: 1.05, speed: 0.43, t: 0, weatherOnly: true },
    { x:  35, y: 15.8, z: -42, scale: 1.25, speed: 0.56, t: 1, weatherOnly: true },
    { x:  47, y: 20.5, z: -66, scale: 0.92, speed: 0.34, t: 2, weatherOnly: true },
  ];
  for (const cfg of configs) {
    const material = cfg.weatherOnly ? weatherCloudMaterial : baseCloudMaterial;
    const group = buildCloudGroup(material, cfg.t);
    group.position.set(cfg.x, cfg.y, cfg.z);
    group.scale.setScalar(cfg.scale);
    group.visible = !cfg.weatherOnly;
    scene.add(group);
    clouds.push({
      group,
      speed: cfg.speed,
      baseScale: cfg.scale,
      weatherOnly: Boolean(cfg.weatherOnly),
    });
  }
}

function updateClouds(delta) {
  if (isFinalWave() || mode === 'ending') {
    for (const cloud of clouds) {
      cloud.group.visible = false;
    }
    return;
  }

  const weather = seasonalEffects.getWeatherState();
  const isRainySummer = weather.seasonName === 'summer' && weather.raining;
  const isSnowyWinter = weather.seasonName === 'winter' && weather.snowing;
  const weatherTarget = isRainySummer || isSnowyWinter ? 1 : 0;
  cloudWeatherBlend += (weatherTarget - cloudWeatherBlend) * Math.min(1, delta * 2.4);

  if (baseCloudMaterial) {
    baseCloudMaterial.color.setHex(isRainySummer ? 0xc9d1df : isSnowyWinter ? 0xf4fbff : 0xf0f2f8);
    baseCloudMaterial.color.lerp(scene.background, CLOUD_SKY_TINT);
    baseCloudMaterial.opacity = 0.9 + cloudWeatherBlend * 0.06;
  }
  if (weatherCloudMaterial) {
    weatherCloudMaterial.color.setHex(isRainySummer ? 0xb7c2d4 : 0xeaf6ff);
    weatherCloudMaterial.color.lerp(scene.background, CLOUD_SKY_TINT);
    weatherCloudMaterial.opacity = cloudWeatherBlend * (isSnowyWinter ? 0.92 : 0.86);
  }

  for (const cloud of clouds) {
    cloud.group.position.x += cloud.speed * delta;
    if (cloud.group.position.x > CLOUD_WRAP_X) {
      cloud.group.position.x = CLOUD_RESET_X;
    }

    if (cloud.weatherOnly) {
      cloud.group.visible = cloudWeatherBlend > 0.02;
    } else {
      cloud.group.visible = true;
    }

    const densityBoost = cloud.weatherOnly ? 1.2 : 1;
    const widthScale = 1 + cloudWeatherBlend * 0.14 * densityBoost;
    const heightScale = 1 + cloudWeatherBlend * 0.55 * densityBoost;
    const depthScale = 1 + cloudWeatherBlend * 0.18 * densityBoost;
    cloud.group.scale.set(
      cloud.baseScale * widthScale,
      cloud.baseScale * heightScale,
      cloud.baseScale * depthScale
    );
  }
}

function glowColor(hex, gain = GLOW_GAIN) {
  return new THREE.Color(hex).multiplyScalar(gain);
}

function triggerWandSwing(wandGroup) {
  const existing = wandSwings.findIndex(s => s.group === wandGroup);
  if (existing !== -1) wandSwings.splice(existing, 1);
  wandSwings.push({ group: wandGroup, t: 0, duration: 0.42 });
}

function updateWandSwings(delta) {
  for (let i = wandSwings.length - 1; i >= 0; i--) {
    const swing = wandSwings[i];
    swing.t = Math.min(swing.t + delta / swing.duration, 1);
    const t = swing.t;
    // Fast forward thrust (ease-out rise to peak at 28%), then smoothstep return
    let angle;
    if (t <= 0.28) {
      const p = t / 0.28;
      angle = (1 - (1 - p) * (1 - p)) * -0.48;
    } else {
      const p = (t - 0.28) / 0.72;
      const eased = p * p * (3 - 2 * p);
      angle = (1 - eased) * -0.48;
    }
    swing.group.rotation.x = angle;
    if (swing.t >= 1) {
      swing.group.rotation.x = 0;
      wandSwings.splice(i, 1);
    }
  }
}

function spawnBeam(targetPosition) {
  const side = Math.random() < 0.5 ? 0 : 1;
  const staffX = side === 0 ? -5.35 : 5.35;
  if (wandGroups[side]) triggerWandSwing(wandGroups[side]);
  const start = new THREE.Vector3(staffX, 2.38, WALL_Z - 0.2);
  const end = targetPosition.clone();
  end.y += 1.2;
  playBeamSound(end.x);
  const distance = start.distanceTo(end);
  const mid = start.clone().lerp(end, 0.5);

  // White core beam
  const coreGeo = new THREE.BoxGeometry(0.14, 0.14, distance);
  const coreMat = new THREE.MeshBasicMaterial({
    color: glowColor(0xffffff), transparent: true, opacity: 1,
    blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const coreMesh = new THREE.Mesh(coreGeo, coreMat);
  coreMesh.position.copy(mid);
  coreMesh.lookAt(end);
  effectsGroup.add(coreMesh);
  beams.push({ mesh: coreMesh, life: 0.28, maxLife: 0.28, kind: 'beam_core' });

  // Wide teal glow beam
  const glowGeo = new THREE.BoxGeometry(0.72, 0.72, distance);
  const glowMat = new THREE.MeshBasicMaterial({
    color: glowColor(0x58dfcf, 1.5), transparent: true, opacity: 0.48,
    blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const glowMesh = new THREE.Mesh(glowGeo, glowMat);
  glowMesh.position.copy(mid);
  glowMesh.lookAt(end);
  effectsGroup.add(glowMesh);
  beams.push({ mesh: glowMesh, life: 0.28, maxLife: 0.28, kind: 'beam_glow' });

  // Impact flash at enemy
  const flashGeo = new THREE.DodecahedronGeometry(0.55, 0);
  const flashMat = new THREE.MeshBasicMaterial({
    color: 0xaaffee, transparent: true, opacity: 0.9,
    blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const flashMesh = new THREE.Mesh(flashGeo, flashMat);
  flashMesh.position.copy(end);
  effectsGroup.add(flashMesh);
  beams.push({ mesh: flashMesh, life: 0.22, maxLife: 0.22, kind: 'beam_flash' });

  // Muzzle flash at caster
  const muzzleGeo = new THREE.DodecahedronGeometry(0.38, 0);
  const muzzleMat = new THREE.MeshBasicMaterial({
    color: 0xffffff, transparent: true, opacity: 0.9,
    blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const muzzleMesh = new THREE.Mesh(muzzleGeo, muzzleMat);
  muzzleMesh.position.copy(start);
  effectsGroup.add(muzzleMesh);
  beams.push({ mesh: muzzleMesh, life: 0.14, maxLife: 0.14, kind: 'beam_flash' });

  fx.flash(start, 0xd8fff6, 2.2, 0.18);
  fx.flash(end, 0x9ffff0, 3.6, 0.26);
  fx.ring(end, 0x58dfcf, { from: 0.3, to: 2.4, life: 0.32, flat: false });
  fx.lightPulse(end, 0x58dfcf, 16, 0.3);
  fx.burst(end, { color: 0x9ffff0, color2: 0xffffff, count: 20, speed: 5.2, life: 0.6, size: 0.3 });
  for (let step = 1; step <= 5; step += 1) {
    reusableVector.lerpVectors(start, end, step / 6);
    fx.burst(reusableVector, { color: 0x58dfcf, color2: 0xffffff, count: 3, speed: 0.9, life: 0.45, size: 0.22, gravity: 0.6, up: 0.2 });
  }
}

function spawnBossRock(enemy) {
  const start = enemy.group.position.clone();
  start.y += 1.8 * enemy.type.scale * (enemy.isClimaxBoss ? 1.5 : 1.0);
  const end = new THREE.Vector3(THREE.MathUtils.randFloat(-0.45, 0.45), 1.2 + Math.random() * 0.25, WALL_Z + 0.76);
  const rockMaterial = new THREE.MeshStandardMaterial({
    color: 0x5a4636,
    emissive: enemy.type.trim,
    emissiveIntensity: 0.5,
    roughness: 0.92,
    metalness: 0.02,
  });
  const emberMaterial = new THREE.MeshBasicMaterial({
    color: glowColor(enemy.type.eye, 1.8),
    transparent: true,
    opacity: 0.44,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const rock = new THREE.Group();
  const core = new THREE.Mesh(new THREE.DodecahedronGeometry(0.34, 0), rockMaterial);
  const glow = new THREE.Mesh(new THREE.DodecahedronGeometry(0.43, 0), emberMaterial);
  core.castShadow = true;
  glow.renderOrder = 2;
  rock.add(core, glow);
  rock.position.copy(start);
  effectsGroup.add(rock);
  beams.push({
    kind: 'rock',
    mesh: rock,
    enemy,
    start,
    end,
    age: 0,
    flightTime: BOSS_ROCK_FLIGHT_TIME + Math.random() * 0.18,
    arcHeight: BOSS_ROCK_ARC_HEIGHT + Math.random() * 0.65,
    spin: new THREE.Vector3(
      THREE.MathUtils.randFloat(5, 8),
      THREE.MathUtils.randFloat(4, 7),
      THREE.MathUtils.randFloat(6, 10)
    ),
  });
}

function spawnDebris(position, type, isBoss = false) {
  const count = isBoss ? 48 : 12;
  const baseScale = isBoss ? 0.32 : 0.18;
  for (let index = 0; index < count; index += 1) {
    let color;
    if (isBoss) {
      const rand = Math.random();
      if (rand < 0.25) color = type.body;
      else if (rand < 0.5) color = type.trim;
      else if (rand < 0.75) color = type.eye || 0xffaa00;
      else color = 0xff5500; // Fire orange
    } else {
      color = index % 3 === 0 ? type.trim : type.body;
    }
    const material = new THREE.MeshStandardMaterial({
      color: color,
      transparent: true,
      opacity: 1,
      roughness: 0.6,
      emissive: (isBoss ? Math.random() < 0.5 : index % 4 === 0) ? color : 0x000000,
      emissiveIntensity: isBoss ? 2.4 : 1.6
    });
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(baseScale, baseScale, baseScale), material);
    mesh.position.copy(position);
    mesh.position.y += isBoss ? (0.8 + (Math.random() - 0.5) * 1.5) : (0.8 + Math.random() * 0.5);
    effectsGroup.add(mesh);
    const initialLife = isBoss
      ? (1.2 + Math.random() * 0.6)
      : (0.7 + Math.random() * 0.36);
    debris.push({
      mesh,
      life: initialLife,
      maxLife: initialLife,
      velocity: isBoss
        ? new THREE.Vector3((Math.random() - 0.5) * 11, (Math.random() - 0.2) * 8 + 3, (Math.random() - 0.5) * 11)
        : new THREE.Vector3((Math.random() - 0.5) * 5.5, 2.8 + Math.random() * 3.6, (Math.random() - 0.5) * 5.5),
      spin: isBoss
        ? new THREE.Vector3(Math.random() * 15, Math.random() * 15, Math.random() * 15)
        : new THREE.Vector3(Math.random() * 8, Math.random() * 8, Math.random() * 8),
    });
  }

  reusableVector.copy(position);
  reusableVector.y += 0.8;
  fx.burst(reusableVector, {
    color: type.trim, color2: type.eye || 0xffaa00,
    count: isBoss ? 90 : 18, speed: isBoss ? 9.5 : 4.6,
    life: isBoss ? 1.2 : 0.65, size: isBoss ? 0.52 : 0.3, spread: isBoss ? 1.2 : 0.3,
  });
  fx.flash(reusableVector, type.eye || 0xffffff, isBoss ? 11 : 2.6, isBoss ? 0.45 : 0.2);
  reusableVector.y = 0.14;
  fx.ring(reusableVector, type.eye || 0xffffff, { from: 0.4, to: isBoss ? 9 : 2.8, life: isBoss ? 0.7 : 0.4 });
  if (isBoss) {
    reusableVector.y = 1.6;
    fx.lightPulse(reusableVector, type.eye || 0xffaa00, 60, 0.6);
    reusableVector.y = 0.14;
    fx.ring(reusableVector, 0xffffff, { from: 0.4, to: 5.5, life: 0.45, opacity: 0.6 });
  }

  if (isBoss) {
    const shockwaveCount = 3;
    for (let i = 0; i < shockwaveCount; i++) {
      const scale = 1.0 + i * 0.8;
      const speed = 6.0 - i * 1.5;
      const color = i === 0 ? 0xffffff : i === 1 ? 0xffaa00 : 0xff3300;
      
      const waveGeo = new THREE.SphereGeometry(scale, 32, 20);
      const waveMat = new THREE.MeshBasicMaterial({
        color: color,
        transparent: true,
        opacity: 0.22,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      const waveMesh = new THREE.Mesh(waveGeo, waveMat);
      waveMesh.position.copy(position);
      waveMesh.position.y += 0.8;
      effectsGroup.add(waveMesh);
      
      beams.push({
        kind: 'boss_explosion_wave',
        mesh: waveMesh,
        life: 0.4 + i * 0.1,
        maxLife: 0.4 + i * 0.1,
        initialScale: scale,
        expandSpeed: speed
      });
    }
  }
}

function removeEnemy(enemy) {
  const index = enemies.indexOf(enemy);
  if (index >= 0) enemies.splice(index, 1);
  enemyGroup.remove(enemy.group);
  if (enemy.label.parentNode) enemy.label.parentNode.removeChild(enemy.label);
  disposeObject(enemy.group);
  if (enemy.shadowMesh) {
    scene.remove(enemy.shadowMesh);
    enemy.shadowMesh.geometry.dispose();
    enemy.shadowMesh.material.dispose();
    enemy.shadowMesh = null;
  }
  if (activeTarget === enemy) activeTarget = null;
}

function clearEnemies() {
  for (const enemy of [...enemies]) removeEnemy(enemy);
}

function clearEffects() {
  clearChainLightningTimers();
  for (const beam of beams) {
    effectsGroup.remove(beam.mesh);
    disposeObject(beam.mesh);
  }
  beams.length = 0;
  lastBossShotTime = -999;

  for (const chunk of debris) {
    effectsGroup.remove(chunk.mesh);
    chunk.mesh.geometry.dispose();
    chunk.mesh.material.dispose();
  }
  debris.length = 0;
  fx.clear();
}

function disposeObject(object) {
  object.traverse((child) => {
    if (!child.isMesh) return;
    child.geometry.dispose();
    if (child.material) {
      const mats = Array.isArray(child.material) ? child.material : [child.material];
      for (const material of mats) {
        if (material && (!material.userData || !material.userData.isShared)) {
          material.dispose();
        }
      }
    }
  });
}

function selectTarget() {
  if (!typedBuffer) {
    activeTarget = null;
    return;
  }
  const matches = findMatches(typedBuffer);
  activeTarget = matches.length > 0 ? chooseTarget(matches) : null;
}

function findMatches(prefix, options = {}) {
  if (!prefix) return [];
  return enemies.filter((enemy) => {
    if (options.equationOnly && !enemy.isEquation) return false;
    if (!isEnemyTargetable(enemy)) return false;
    if (enemy.searchPrompt.startsWith(prefix)) {
      enemy._matchedSearchPrompt = enemy.searchPrompt;
      return true;
    }
    const alt = enemy.altSearchPrompts?.find(p => p.startsWith(prefix));
    if (alt) {
      enemy._matchedSearchPrompt = alt;
      return true;
    }
    return false;
  });
}

function hasActiveEquationPrefix() {
  return enemies.some((enemy) => {
    if (!enemy.isEquation || !isEnemyTargetable(enemy)) return false;
    return enemy.searchPrompt.startsWith(typedBuffer) ||
      enemy.altSearchPrompts?.some(p => p.startsWith(typedBuffer));
  });
}

function chooseTarget(matches) {
  return pickTarget(matches, typedBuffer);
}

function isEnemyTargetable(enemy) {
  return enemy.revealed && enemy.group.position.z < WALL_Z && !enemy.dying;
}

function getEquationQuantities(equationTerm) {
  const normalizedEq = equationTerm.toLowerCase()
    .replace(/[²³½0-9.×/=\-+()]/g, ' ')
    .replace(/\s+/g, ' ');

  const matched = [];
  const tempEq = " " + normalizedEq + " ";
  const sortedWords = [...ALL_WORDS].sort((a, b) => b.term.length - a.term.length);

  let remainingEq = tempEq;
  for (const word of sortedWords) {
    const term = word.term.toLowerCase();
    const termPattern = " " + term + " ";
    if (remainingEq.includes(termPattern)) {
      matched.push(word);
      remainingEq = remainingEq.replace(termPattern, " ");
    }
  }
  return matched;
}

function prepareWavePlan() {
  bossWordsThisSet = chooseBossWordsForWave();
  introducedBossTermsThisSet = new Set();
  medicsSpawnedThisSet = 0;
  medicSpawnSlots = chooseMedicSpawnSlots(normalEnemyTarget, getMedicCountForWave(waveSet));
  mimicsSpawnedThisSet = 0;
  mimicSpawnSlots = chooseMimicSpawnSlots(normalEnemyTarget, getMimicCountForWave(waveSet));
  
  const previewableWords = withinLength(definitionBossWordsForWave(), previewLengthCap(waveSet));
  const equationWord = bossWordsThisSet.find(w => w.isEquation);
  if (equationWord) {
    const quantities = getEquationQuantities(equationWord.term);
    const unseenQuantities = quantities.filter(q => !previewableWords.some(pw => pw.term === q.term));
    if (unseenQuantities.length > 0) {
      // Never turn a long equation quantity into a full-phrase minion.
      const fitting = withinLength(unseenQuantities, previewLengthCap(waveSet));
      if (fitting.length > 0) {
        const chosenQuantity = fitting[Math.floor(Math.random() * fitting.length)];
        previewableWords.push(chosenQuantity);
      }
    }
  }
  previewableWordsThisSet = previewableWords;

  bossPreviewSchedule = buildBossPreviewSchedule(normalEnemyTarget, previewableWords);
  hardGuestSchedule = waveSet <= 4 ? buildHardGuestSchedule(normalEnemyTarget) : new Map();
}

function definitionBossWordsForWave() {
  return bossWordsThisSet.filter(w => !w.isEquation);
}

function getMedicCountForWave(wave) {
  if (wave >= 7) return 3;
  if (wave >= 5) return 2;
  return 1;
}

function chooseMedicSpawnSlots(target, count) {
  if (target <= 0 || count <= 0) return [];

  const slots = [];
  const usableTarget = Math.max(1, target - 1);
  for (let index = 0; index < count; index += 1) {
    const slot = THREE.MathUtils.clamp(
      Math.round(((index + 1) * usableTarget) / (count + 1)),
      1,
      usableTarget
    );
    slots.push(slot);
  }

  return slots;
}

function shouldSpawnMedic() {
  return wavePhase === 'normal'
    && medicsSpawnedThisSet < medicSpawnSlots.length
    && normalEnemiesSpawned >= medicSpawnSlots[medicsSpawnedThisSet];
}

function chooseMimicPrompt() {
  const reservedBossTerms = new Set(bossWordsThisSet.map((w) => w.term));
  const nearExisting = new Set(enemies.map((e) => e.prompt));
  const pool = withinLength(currentKeywordPool(), 12).filter((entry) => !reservedBossTerms.has(entry.term));
  const usablePool = pool.length > 0 ? pool : EASY_WORDS;
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const entry = usablePool[Math.floor(Math.random() * usablePool.length)];
    if (!nearExisting.has(entry.term)) return entry;
  }
  return usablePool[Math.floor(Math.random() * usablePool.length)];
}

function getMimicCountForWave(wave) {
  if (wave <= 1) return 1;
  if (wave >= 6) return 3;
  return 2;
}

function chooseMimicSpawnSlots(target, count) {
  if (target <= 0 || count <= 0) return [];
  const slots = [];
  const usableTarget = Math.max(1, target - 1);
  for (let index = 0; index < count; index += 1) {
    const slot = THREE.MathUtils.clamp(
      Math.round(((index + 1) * usableTarget) / (count + 1)),
      1,
      usableTarget
    );
    slots.push(slot);
  }
  return slots;
}

function shouldSpawnMimic() {
  return wavePhase === 'normal'
    && mimicsSpawnedThisSet < mimicSpawnSlots.length
    && normalEnemiesSpawned >= mimicSpawnSlots[mimicsSpawnedThisSet];
}


function buildBossPreviewSchedule(target, words) {
  const schedule = new Map();
  if (target <= 0 || words.length === 0) return schedule;

  words.forEach((word, index) => {
    let slot = Math.floor(((index + 1) * target) / (words.length + 1));
    slot = Math.max(0, Math.min(target - 1, slot));

    while (schedule.has(slot) && slot < target - 1) slot += 1;
    while (schedule.has(slot) && slot > 0) slot -= 1;
    schedule.set(slot, word);
  });

  return schedule;
}

function buildHardGuestSchedule(target) {
  const count = hardGuestCount(waveSet);
  const reservedTerms = new Set(bossWordsThisSet.map(w => w.term));
  const available = withinLength(HARD_WORDS, normalPromptLengthCap(waveSet)).filter(w => !reservedTerms.has(w.term));
  if (count === 0 || available.length === 0) return new Map();

  const picked = [];
  const usedTerms = new Set();
  for (let attempt = 0; attempt < 32 && picked.length < count; attempt += 1) {
    const entry = available[Math.floor(Math.random() * available.length)];
    if (!usedTerms.has(entry.term)) {
      picked.push(entry);
      usedTerms.add(entry.term);
    }
  }

  const schedule = new Map();
  const half = Math.ceil(target / 2);
  picked.forEach((word, i) => {
    let slot = half + Math.floor((i * (target - half)) / Math.max(1, picked.length));
    slot = Math.min(target - 1, slot);
    while ((bossPreviewSchedule.has(slot) || schedule.has(slot)) && slot < target - 1) slot += 1;
    schedule.set(slot, word);
  });

  return schedule;
}

function chooseBossWordsForWave() {
  const pool = chooseBossPool();
  const chosen = [];
  const usedTerms = new Set();

  // First two bosses use vocabulary words
  while (chosen.length < BOSSES_PER_WAVE - 1 && usedTerms.size < pool.length) {
    const entry = pool[Math.floor(Math.random() * pool.length)];
    if (usedTerms.has(entry.term)) continue;
    chosen.push(entry);
    usedTerms.add(entry.term);
  }

  // Third boss is the equation question
  chosen.push(chooseEquationWord(usedTerms));

  // Shuffle so the equation boss can appear in any position
  for (let i = chosen.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [chosen[i], chosen[j]] = [chosen[j], chosen[i]];
  }

  return chosen;
}

function chooseEquationWord(usedTerms = new Set()) {
  for (let attempt = 0; attempt < 16; attempt += 1) {
    const entry = EQUATION_WORDS[Math.floor(Math.random() * EQUATION_WORDS.length)];
    if (!usedTerms.has(entry.term)) return entry;
  }
  return EQUATION_WORDS[Math.floor(Math.random() * EQUATION_WORDS.length)];
}

function chooseBossPool() {
  if (waveSet >= 5) return [...MEDIUM_WORDS, ...HARD_WORDS];
  if (waveSet >= 3) return HARD_WORDS;
  return withinLength(MEDIUM_WORDS, bossWordLengthCap(waveSet));
}

function choosePrompt() {
  const scheduledBossWord = wavePhase === 'normal' ? bossPreviewSchedule.get(normalEnemiesSpawned) : null;
  if (scheduledBossWord) return scheduledBossWord;

  const scheduledHardGuest = wavePhase === 'normal' ? hardGuestSchedule.get(normalEnemiesSpawned) : null;
  if (scheduledHardGuest) return scheduledHardGuest;

  const pool = currentKeywordPool();
  const nearExisting = new Set(enemies.map((enemy) => enemy.prompt));
  const reservedBossTerms = wavePhase === 'normal'
    ? new Set(bossWordsThisSet.map((word) => word.term))
    : new Set();

  const regularPool = pool.filter((entry) => !reservedBossTerms.has(entry.term));
  const usablePool = regularPool.length > 0 ? regularPool : pool;
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const entry = usablePool[Math.floor(Math.random() * usablePool.length)];
    if (!nearExisting.has(entry.term)) return entry;
  }
  return usablePool[Math.floor(Math.random() * usablePool.length)];
}

function chooseMedicPrompt() {
  const reservedBossTerms = new Set(bossWordsThisSet.map((word) => word.term));
  const nearExisting = new Set(enemies.map((enemy) => enemy.prompt));
  const pool = currentKeywordPool().filter((entry) => !reservedBossTerms.has(entry.term));
  const compactPool = pool.filter((entry) => {
    const length = buildSearchPrompt(entry.term).length;
    return length >= 4 && length <= 12;
  });
  const usablePool = compactPool.length > 0 ? compactPool : pool.length > 0 ? pool : EASY_WORDS;
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const entry = usablePool[Math.floor(Math.random() * usablePool.length)];
    if (!nearExisting.has(entry.term)) return entry;
  }
  return usablePool[Math.floor(Math.random() * usablePool.length)];
}

function currentKeywordPool() {
  const pool = waveSet >= 5 ? [...MEDIUM_WORDS, ...HARD_WORDS]
    : waveSet >= 3 ? [...EASY_WORDS, ...MEDIUM_WORDS]
    : EASY_WORDS;
  return withinLength(pool, normalPromptLengthCap(waveSet));
}

function refreshWaveBossOrder(count) {
  const indices = BOSS_TYPES.map((_, i) => i);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  waveBossOrder = indices.slice(0, count);
}

function chooseBossType(index) {
  if (waveBossOrder.length === 0) refreshWaveBossOrder(BOSSES_PER_WAVE);
  return BOSS_TYPES[waveBossOrder[index % waveBossOrder.length]];
}

function nextSpawnDelay(enemy = null, options = {}) {
  const profile = currentDifficulty();
  const wavePace = profile.spawnBase - Math.max(0, waveSet - 1) * profile.spawnGrowth;
  const cost = Math.max(1, enemy ? getEnemyTypingCost(enemy) : SPAWN_COST_BASELINE);
  const costFactor = THREE.MathUtils.clamp(
    Math.sqrt(cost / SPAWN_COST_BASELINE),
    1,
    SPAWN_COST_DELAY_MAX
  );
  const supportFactor = options.support ? 0.8 : 1;
  const minimumDelay = options.support ? SUPPORT_SPAWN_DELAY_MIN : profile.spawnMin;
  // A short breather after each three minions keeps late waves in readable groups.
  const breather = !options.support && normalEnemiesSpawned % 3 === 0 ? 2 : 0;
  return Math.max(
    minimumDelay,
    wavePace * costFactor * supportFactor + Math.random() * profile.spawnJitter
  ) + breather;
}

function weightedPick(items) {
  const total = items.reduce((sum, item) => sum + item.weight, 0);
  let roll = Math.random() * total;
  for (const item of items) {
    roll -= item.weight;
    if (roll <= 0) return item;
  }
  return items[items.length - 1];
}

function easeOutSine(value) {
  return Math.sin((value * Math.PI) / 2);
}

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function buildSeasonFromScene() {
  return {
    bgColor: scene.background.clone(),
    fogColor: scene.fog.color.clone(),
    fogNear: scene.fog.near,
    fogFar: scene.fog.far,
    hemiSky: hemiLight.color.clone(),
    hemiGround: hemiLight.groundColor.clone(),
    hemiIntensity: hemiLight.intensity,
    sunColor: moonLight.color.clone(),
    sunIntensity: moonLightBaseIntensity,
    emberColor: emberLight.color.clone(),
    emberIntensity: seasonEmberIntensityBase,
    pathMarkerColor: pathMarkerMaterial ? pathMarkerMaterial.color.clone() : new THREE.Color(0x58dfcf),
    pathMarkerEmissive: pathMarkerMaterial ? pathMarkerMaterial.emissive.clone() : new THREE.Color(0x0e6861),
    leafColors: sceneLeafMaterials.map(m => m.color.clone()),
    trunkColor: sceneTrunkMaterial ? sceneTrunkMaterial.color.clone() : new THREE.Color(0x513820),
    moonColor: moon ? moon.material.color.clone() : new THREE.Color(0xfff1b8),
    starOpacity: starField ? starField.opacity : 0.72,
    skyTop: skyTopColor.clone(),
  };
}

function buildSeasonTarget(palette) {
  return {
    bgColor: new THREE.Color(palette.bgColor),
    fogColor: new THREE.Color(palette.fogColor),
    fogNear: palette.fogNear,
    fogFar: palette.fogFar,
    hemiSky: new THREE.Color(palette.hemiSky),
    hemiGround: new THREE.Color(palette.hemiGround),
    hemiIntensity: palette.hemiIntensity,
    sunColor: new THREE.Color(palette.sunColor),
    sunIntensity: palette.sunIntensity,
    emberColor: new THREE.Color(palette.emberColor),
    emberIntensity: palette.emberIntensity,
    pathMarkerColor: new THREE.Color(palette.pathMarkerColor),
    pathMarkerEmissive: new THREE.Color(palette.pathMarkerEmissive),
    leafColors: palette.leafColors.map(c => new THREE.Color(c)),
    trunkColor: new THREE.Color(palette.trunkColor),
    moonColor: new THREE.Color(palette.moonColor).multiplyScalar(MOON_GLOW_GAIN),
    starOpacity: palette.starOpacity,
    skyTop: new THREE.Color(palette.skyTop),
  };
}

function applySeasonInstant(palette) {
  scene.background.setHex(palette.bgColor);
  scene.fog.color.setHex(palette.fogColor);
  scene.fog.near = palette.fogNear;
  scene.fog.far = palette.fogFar;
  hemiLight.color.setHex(palette.hemiSky);
  hemiLight.groundColor.setHex(palette.hemiGround);
  hemiLight.intensity = palette.hemiIntensity;
  moonLight.color.setHex(palette.sunColor);
  moonLightBaseIntensity = palette.sunIntensity;
  updateMoonShadowLighting();
  emberLight.color.setHex(palette.emberColor);
  seasonEmberIntensityBase = palette.emberIntensity;
  // crystal head stays permanently at summer teal — not season-dependent
  if (pathMarkerMaterial) {
    pathMarkerMaterial.color.setHex(palette.pathMarkerColor);
    pathMarkerMaterial.emissive.setHex(palette.pathMarkerEmissive);
  }
  for (let i = 0; i < sceneLeafMaterials.length; i++) {
    sceneLeafMaterials[i].color.setHex(palette.leafColors[i]);
  }
  if (sceneTrunkMaterial) sceneTrunkMaterial.color.setHex(palette.trunkColor);
  if (moon) moon.material.color.setHex(palette.moonColor).multiplyScalar(MOON_GLOW_GAIN);
  if (starField) {
    starField.size = 1;
    starField.opacity = palette.starOpacity;
  }
  skyTopColor.setHex(palette.skyTop);
  recolorGround(palette);
  seasonalEffects.setSeason(palette.name);
}

function applySeasonForWave(wave, instant = false) {
  const index = (wave - 1) % SEASON_PALETTES.length;
  if (!instant && currentSeasonIndex === index) return;
  currentSeasonIndex = index;
  const palette = SEASON_PALETTES[index];
  seasonalEffects.setSeason(palette.name);
  if (instant) {
    applySeasonInstant(palette);
    seasonFade = null;
    return;
  }
  startSeasonFade(palette);
}

function updateSeasonFade(delta) {
  if (!seasonFade) return;
  seasonFade.t = Math.min(seasonFade.t + delta / seasonFade.duration, 1);
  const t = easeInOutCubic(seasonFade.t);
  const { from, to } = seasonFade;

  scene.background.lerpColors(from.bgColor, to.bgColor, t);
  scene.fog.color.lerpColors(from.fogColor, to.fogColor, t);
  scene.fog.near = THREE.MathUtils.lerp(from.fogNear, to.fogNear, t);
  scene.fog.far = THREE.MathUtils.lerp(from.fogFar, to.fogFar, t);
  hemiLight.color.lerpColors(from.hemiSky, to.hemiSky, t);
  hemiLight.groundColor.lerpColors(from.hemiGround, to.hemiGround, t);
  hemiLight.intensity = THREE.MathUtils.lerp(from.hemiIntensity, to.hemiIntensity, t);
  moonLight.color.lerpColors(from.sunColor, to.sunColor, t);
  moonLightBaseIntensity = THREE.MathUtils.lerp(from.sunIntensity, to.sunIntensity, t);
  updateMoonShadowLighting();
  emberLight.color.lerpColors(from.emberColor, to.emberColor, t);
  seasonEmberIntensityBase = THREE.MathUtils.lerp(from.emberIntensity, to.emberIntensity, t);
  // crystal head stays permanently at summer teal — not season-dependent
  if (pathMarkerMaterial) {
    pathMarkerMaterial.color.lerpColors(from.pathMarkerColor, to.pathMarkerColor, t);
    pathMarkerMaterial.emissive.lerpColors(from.pathMarkerEmissive, to.pathMarkerEmissive, t);
  }
  for (let i = 0; i < sceneLeafMaterials.length; i++) {
    sceneLeafMaterials[i].color.lerpColors(from.leafColors[i], to.leafColors[i], t);
  }
  if (sceneTrunkMaterial) sceneTrunkMaterial.color.lerpColors(from.trunkColor, to.trunkColor, t);
  if (moon) moon.material.color.lerpColors(from.moonColor, to.moonColor, t);
  if (starField) starField.opacity = THREE.MathUtils.lerp(from.starOpacity, to.starOpacity, t);
  skyTopColor.lerpColors(from.skyTop, to.skyTop, t);

  if (sceneGround) sceneGround.blend(t);

  if (seasonFade.t >= 1) {
    seasonFade = null;
  }
}

function groundColours(palette) {
  return {
    path: { h: palette.groundPath.h, s: palette.groundPath.s, l: palette.groundPath.lBase },
    grass: palette.groundGrass,
    patch: palette.groundAlt1,
    tone: GROUND_TONE,
  };
}

function recolorGround(palette) {
  if (sceneGround) sceneGround.recolor(groundColours(palette));
}

// Starts a gradual change of season; the ground fades with the sky, lights and leaves.
function startSeasonFade(palette) {
  seasonFade = { from: buildSeasonFromScene(), to: buildSeasonTarget(palette), palette, t: 0, duration: 3.5 };
  if (sceneGround) sceneGround.startBlend(groundColours(palette));
}

function accuracy() {
  if (typedAttempts <= 0) return 1;
  return THREE.MathUtils.clamp((typedAttempts - mistakeCount) / typedAttempts, 0, 1);
}

function formatAccuracySummary() {
  if (typedAttempts <= 0) return 'No typed attempts';
  return `${Math.round(accuracy() * 100)}% accuracy`;
}

function focusKeyboard() {
  if (keyboardInput.value !== INPUT_SENTINEL) resetKeyboardInput();
  keyboardInput.focus({ preventScroll: true });
}

function createRenderer() {
  const originalConsoleError = console.error;
  console.error = (...args) => {
    const message = args.map((arg) => String(arg)).join(' ');
    if (!message.startsWith('THREE.WebGLRenderer:')) {
      originalConsoleError.apply(console, args);
    }
  };
  try {
    return {
      renderer: new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: false,
        preserveDrawingBuffer: false,
        powerPreference: 'high-performance',
      }),
      available: true,
    };
  } catch (error) {
    console.warn('Spellwave could not create a WebGL renderer.', error);
    return {
      renderer: createFallbackRenderer(),
      available: false,
    };
  } finally {
    console.error = originalConsoleError;
  }
}

function createFallbackRenderer() {
  return {
    shadowMap: {},
    setPixelRatio() {},
    setSize() {},
    render() {},
  };
}

function resizeRenderer() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  visuals.setSize(width, height);
  // Label dimensions depend on the viewport (vw font sizing + px max-width wrapping),
  // so invalidate cached measurements whenever the viewport changes.
  labelMeasureGen += 1;
}

function formatScore(value) {
  return Math.round(value).toLocaleString('en-US');
}

function hexColor(value) {
  return `#${value.toString(16).padStart(6, '0')}`;
}

function loadBestScore() {
  const raw = Number.parseInt(readStoredValue(STORAGE_KEY, '0'), 10);
  return Number.isFinite(raw) ? raw : 0;
}

function saveBestScore(value) {
  writeStoredValue(STORAGE_KEY, String(Math.round(value)));
}

function loadAudioSetting() {
  return readStoredValue(AUDIO_STORAGE_KEY, 'on') !== 'off';
}

function saveAudioSetting(enabled) {
  writeStoredValue(AUDIO_STORAGE_KEY, enabled ? 'on' : 'off');
}

function loadBatterySaverSetting() {
  const stored = readStoredValue(BATTERY_SAVER_STORAGE_KEY, 'false');
  return stored === 'true';
}

function saveBatterySaverSetting(active) {
  writeStoredValue(BATTERY_SAVER_STORAGE_KEY, active ? 'true' : 'false');
}

function applyBatterySaver() {
  if (batterySaver) {
    document.body.classList.add('battery-saver');
    if (batterySaverButton) {
      batterySaverButton.classList.add('is-active');
      batterySaverButton.title = "Disable Battery Saver";
      batterySaverButton.setAttribute('aria-label', "Disable Battery Saver");
    }
    if (renderer) renderer.shadowMap.enabled = false;
    if (moonLight) moonLight.castShadow = false;
  } else {
    document.body.classList.remove('battery-saver');
    if (batterySaverButton) {
      batterySaverButton.classList.remove('is-active');
      batterySaverButton.title = "Enable Battery Saver";
      batterySaverButton.setAttribute('aria-label', "Enable Battery Saver");
    }
    if (renderer) renderer.shadowMap.enabled = true;
    if (moonLight) moonLight.castShadow = true;
  }
  visuals.setBatterySaver(batterySaver);
  if (scene) {
    scene.traverse(child => {
      if (child.isMesh && child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach(mat => { mat.needsUpdate = true; });
        } else {
          child.material.needsUpdate = true;
        }
      }
    });
  }
}

function toggleBatterySaver() {
  batterySaver = !batterySaver;
  saveBatterySaverSetting(batterySaver);
  applyBatterySaver();
  if (mode === 'running') focusKeyboard();
}

function readStoredValue(key, fallback) {
  try {
    return localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}

function writeStoredValue(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Storage can be unavailable in private or restricted browser contexts.
  }
}

function setPauseButtonState(isPlaying, isDisabled = pauseButton.disabled) {
  pauseButton.disabled = isDisabled;
  pauseButton.classList.toggle('is-playing', isPlaying);
  pauseButton.setAttribute('aria-label', isPlaying ? 'Pause run' : 'Resume run');
  pauseButton.title = isPlaying ? 'Pause run' : 'Resume run';
}

function toggleFullscreen() {
  if (getFullscreenElement()) {
    exitFullscreen();
    return;
  }

  const root = document.documentElement;
  const request = root.requestFullscreen || root.webkitRequestFullscreen;
  if (request) {
    const result = request.call(root);
    if (result && typeof result.catch === 'function') result.catch(() => {});
  }
}

function exitFullscreen() {
  const exit = document.exitFullscreen || document.webkitExitFullscreen;
  if (exit) {
    const result = exit.call(document);
    if (result && typeof result.catch === 'function') result.catch(() => {});
  }
}

function getFullscreenElement() {
  return document.fullscreenElement || document.webkitFullscreenElement || null;
}

function isFullscreenSupported() {
  return !!(
    document.fullscreenEnabled ||
    document.webkitFullscreenEnabled ||
    document.documentElement.requestFullscreen ||
    document.documentElement.webkitRequestFullscreen
  );
}

function updateFullscreenButton() {
  const isSupported = isFullscreenSupported();
  const isFullscreen = !!getFullscreenElement();
  fullscreenButton.hidden = !isSupported;
  fullscreenButton.disabled = !isSupported;
  fullscreenButton.classList.toggle('is-fullscreen', isFullscreen);
  fullscreenButton.setAttribute('aria-label', isFullscreen ? 'Exit full screen' : 'Enter full screen');
  fullscreenButton.title = isFullscreen ? 'Exit full screen' : 'Enter full screen';
}

function isFinalWave() {
  return waveSet === FINAL_WAVE_NUMBER;
}

function buildFinalWaveQueue() {
  const queue = [
    ...Array(10).fill('boss'),
    ...Array(3).fill('medic'),
    ...Array(3).fill('mimic'),
  ];
  for (let i = queue.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [queue[i], queue[j]] = [queue[j], queue[i]];
  }
  const firstBossIndex = queue.indexOf('boss');
  if (firstBossIndex > 0) {
    [queue[0], queue[firstBossIndex]] = [queue[firstBossIndex], queue[0]];
  }
  return queue;
}

function startFinalWave() {
  wavePhase = 'boss';
  bossesSpawned = 0;
  bossesDefeated = 0;
  bossSpawnTimer = currentDifficulty().bossWarningDelay;
  finalWaveQueue = buildFinalWaveQueue();
  finalWaveQueueIndex = 0;
  refreshWaveBossOrder(FINAL_WAVE_BOSS_COUNT);
  document.body.classList.add('final-wave-active');
  showBanner('FINAL WAVE!', 'final-wave');
  playBossWarningSound();
  updatePhaseDisplay();
  // The world fades to the starlit night; weather stops and the moons and drifting rocks appear.
  seasonalEffects.stopWeather();
  startSeasonFade(FINAL_WAVE_PALETTE);
  if (starField) starField.size = 1.7;
  setFinalWaveScenery(true);
}

function setFinalWaveScenery(active) {
  if (finalWaveScenery) finalWaveScenery.group.visible = active;
}

// Faceted moons hung in the sky and a scatter of slowly tumbling rocks above the verges.
function createFinalWaveScenery() {
  const group = new THREE.Group();
  group.visible = false;
  const moonSpecs = [
    { position: [-24, 22, -68], radius: 6, color: 0x8a6fe0, ring: 0xe0b8ff },
    { position: [20, 30, -78], radius: 3.4, color: 0x4fc8c0, ring: null },
    { position: [34, 13, -60], radius: 2.2, color: 0xf2a65a, ring: null },
  ];
  for (const spec of moonSpecs) {
    const material = new THREE.MeshStandardMaterial({ color: spec.color, emissive: spec.color, emissiveIntensity: 0.22, roughness: 1, flatShading: true, fog: false });
    const body = new THREE.Mesh(new THREE.IcosahedronGeometry(spec.radius, 1), material);
    body.position.set(...spec.position);
    group.add(body);
    if (spec.ring) {
      const ringMaterial = new THREE.MeshStandardMaterial({ color: spec.ring, emissive: spec.ring, emissiveIntensity: 0.4, roughness: 1, flatShading: true, fog: false });
      const ring = new THREE.Mesh(new THREE.TorusGeometry(spec.radius * 1.7, spec.radius * 0.09, 4, 14), ringMaterial);
      ring.position.set(...spec.position);
      ring.rotation.set(1.25, 0.3, 0);
      group.add(ring);
    }
  }
  const rockMaterial = new THREE.MeshStandardMaterial({ color: 0x5a4a9a, roughness: 1, flatShading: true });
  const crystalMaterial = new THREE.MeshStandardMaterial({ color: 0xe040fb, emissive: 0xe040fb, emissiveIntensity: 1.2, roughness: 0.4, flatShading: true });
  const drifters = [];
  for (let index = 0; index < 18; index += 1) {
    const side = index % 2 === 0 ? -1 : 1;
    const isCrystal = index % 6 === 5;
    const geometry = isCrystal ? new THREE.OctahedronGeometry(0.35, 0) : new THREE.DodecahedronGeometry(0.5 + Math.random() * 0.9, 0);
    const rock = new THREE.Mesh(geometry, isCrystal ? crystalMaterial : rockMaterial);
    rock.position.set(side * (9 + Math.random() * 12), 3 + Math.random() * 9, -62 + Math.random() * 66);
    if (isCrystal) rock.scale.set(1, 2, 1);
    group.add(rock);
    drifters.push({ rock, baseY: rock.position.y, phase: Math.random() * Math.PI * 2, spin: 0.1 + Math.random() * 0.3 });
  }
  scene.add(group);
  return { group, drifters };
}

function updateFinalWaveScenery(seconds, delta) {
  if (!finalWaveScenery || !finalWaveScenery.group.visible) return;
  for (const drifter of finalWaveScenery.drifters) {
    drifter.rock.position.y = drifter.baseY + Math.sin(seconds * 0.5 + drifter.phase) * 0.6;
    drifter.rock.rotation.x += drifter.spin * delta;
    drifter.rock.rotation.y += drifter.spin * 0.7 * delta;
  }
}

function startBossPhase() {
  if (bossWordsThisSet.length === 0) prepareWavePlan();
  const missingPreviewWords = previewableWordsThisSet.filter(w => !introducedBossTermsThisSet.has(w.term));
  if (missingPreviewWords.length > 0) {
    const firstSlot = normalEnemiesSpawned;
    for (const [index, word] of missingPreviewWords.entries()) {
      bossPreviewSchedule.set(firstSlot + index, word);
    }
    normalEnemyTarget = normalEnemiesSpawned + missingPreviewWords.length;
    updateHud(true);
    return;
  }

  wavePhase = 'boss';
  bossesSpawned = 0;
  bossesDefeated = 0;
  bossSpawnTimer = currentDifficulty().bossWarningDelay;
  refreshWaveBossOrder(BOSSES_PER_WAVE);
  showBanner('BOSS WAVE');
  playBossWarningSound();
  updatePhaseDisplay();
}

function spawnBoss() {
  const wordData = bossWordsThisSet[bossesSpawned] || chooseBossWord();
  if (!bossWordsThisSet.some(w => w.term === wordData.term)) bossWordsThisSet.push(wordData);
  const bossType = chooseBossType(bossesSpawned);
  const lanes = [-5.0, 0, 5.0];
  const lane = lanes[bossesSpawned % lanes.length];

  const profile = currentDifficulty();
  const isClimaxBoss = isFinalWave() && (bossesSpawned >= 7);
  const enemy = spawnEnemy({ isBoss: true, wordData, bossType, lane, delay: 0, startZ: profile.revealZ, isClimaxBoss });
  // Use the actual answer and movement speed for a consistent entrance.
  enemy.spawnZ = profile.revealZ - getEnemySpeed(enemy) * 8;
  enemy.group.position.z = enemy.spawnZ;
  enemy.revealed = false;
  enemy.shotTimer = 4 + enemy.searchPrompt.length * 0.25;
}

function chooseBossWord() {
  const pool = chooseBossPool();
  const usedTerms = new Set(bossWordsThisSet.map(w => w.term));
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const entry = pool[Math.floor(Math.random() * pool.length)];
    if (!usedTerms.has(entry.term)) return entry;
  }
  return pool[Math.floor(Math.random() * pool.length)];
}

function startWaveCleared() {
  mode = 'wave_cleared';
  playWaveClearSound();
  startMusicLoop(false);
  typedBuffer = '';
  activeTarget = null;
  setPauseButtonState(true, true);
  document.body.classList.remove('is-running');
  const copyText = streak >= 2
    ? `${streak}-chain streak carries into wave ${waveSet + 1}!`
    : 'Boss terms from this wave:';
  showMessage(
    `WAVE ${waveSet} CLEARED`,
    'Wave Clear',
    `Score ${formatScore(score)}`,
    'Next Wave',
    copyText
  );
  renderWaveBossGlossary();
  messagePanel.classList.add('is-cleared');
  updateHud(true);
  updatePhaseDisplay();
}

let endingStartTime = 0;
let endingTimers = [];
let victorySoundPlayed = false;
let endingLeaderboardOffered = false;

function startEndingSequence() {
  mode = 'ending';
  victorySoundPlayed = false;
  endingLeaderboardOffered = false;
  startMusicLoop(false);
  document.body.classList.remove('is-running');
  document.body.classList.remove('final-wave-active');
  setPauseButtonState(true, true);
  clearEnemies();
  clearEffects();
  updatePhaseDisplay();

  const isUnranked = godModeUsedThisRun || potionCheatUsedThisRun || finalWaveCheatUsedThisRun;
  if (!isUnranked && score > bestScore) {
    bestScore = score;
    saveBestScore(score);
  }

  if (!gameEnding) return;
  clearEndingTimers();
  gameEnding.hidden = false;
  gameEnding.className = 'game-ending phase-arrival';

  // Create (or reset) the canvas FX engine
  if (endingFX) { endingFX.reset(); }
  else { endingFX = createEndingFX(endingCanvasEl); }

  const finalStats = getEndingStats();
  setEndingStats(finalStats, false);

  // Cinematic steps:
  // 1. Flash + detonation burst at 120ms
  queueEndingStep(() => {
    gameEnding.className = 'game-ending phase-arrival phase-flash';
    endingFX.setPhase('detonation');
  }, 120);

  // 2. Nebula fades in at 2200ms; blue introductory text appears
  queueEndingStep(() => {
    gameEnding.className = 'game-ending phase-arrival phase-nebula';
    endingFX.setPhase('nebula');
  }, 2200);

  // 3. Spellwave logo flies away at 5700ms; sparkle burst; victory chords
  queueEndingStep(() => {
    gameEnding.className = 'game-ending phase-arrival phase-nebula phase-title-fly';
    endingFX.setPhase('titlefly');
    if (!victorySoundPlayed) {
      playVictoryFinaleSound();
      victorySoundPlayed = true;
    }
  }, 5700);

  // 4. Star Wars crawl at 9700ms (20s duration)
  queueEndingStep(() => {
    gameEnding.className = 'game-ending phase-arrival phase-nebula phase-crawl';
    endingFX.setPhase('crawl');
  }, 9700);

  // 5. Final stats card at 29700ms (20s crawl ends)
  queueEndingStep(() => {
    showEndingStatsScreen(finalStats);
  }, 29700);
}

function showEndingStatsScreen(finalStats) {
  clearEndingTimers();
  if (gameEnding) {
    gameEnding.className = 'game-ending phase-arrival phase-nebula phase-stats phase-replay';
  }
  endingFX?.setPhase('stats');
  setEndingStats(finalStats, true);
  if (!victorySoundPlayed) {
    playVictoryFinaleSound();
    victorySoundPlayed = true;
  }
  if (!endingLeaderboardOffered) {
    endingLeaderboardOffered = true;
    submitRunToLeaderboard();
  }
}

function animateCounter(el, from, to, duration, format = v => String(v)) {
  if (!el) return;
  const start = performance.now();
  function step(now) {
    const t = Math.min((now - start) / duration, 1);
    const eased = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    el.textContent = format(Math.round(from + (to - from) * eased));
    if (t < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

function getEndingStats() {
  const gameSeconds = Math.max(1, endingStartTime || elapsed || gameTimeSeconds);
  const accuracy = typedAttempts > 0
    ? Math.round(((typedAttempts - mistakeCount) / typedAttempts) * 100)
    : 100;
  const healthHearts = formatHeartCount(health);
  return {
    score,
    accuracy,
    peakStreak,
    mimicsLooted,
    healthHearts,
    time: formatRunTime(gameSeconds),
  };
}

function formatRunTime(seconds) {
  const total = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(total / 60);
  const remainingSeconds = total % 60;
  return `${minutes}:${String(remainingSeconds).padStart(2, '0')}`;
}

function setEndingStats(stats, animate) {
  if (!stats) return;
  if (animate) {
    animateCounter(endScore, 0, stats.score, 1400);
    animateCounter(endAccuracy, 0, stats.accuracy, 1000, v => `${v}%`);
    animateCounter(endStreak, 0, stats.peakStreak, 900);
    animateCounter(endMimics, 0, stats.mimicsLooted, 850);
  } else {
    if (endScore) endScore.textContent = '0';
    if (endAccuracy) endAccuracy.textContent = '0%';
    if (endStreak) endStreak.textContent = '0';
    if (endMimics) endMimics.textContent = '0';
  }
  if (endHealth) endHealth.textContent = `${stats.healthHearts}/${HEART_COUNT}`;
  if (endTime) endTime.textContent = stats.time;
}

function queueEndingStep(callback, delay) {
  endingTimers.push(window.setTimeout(callback, delay));
}

function clearEndingTimers() {
  endingTimers.forEach(timer => window.clearTimeout(timer));
  endingTimers = [];
}

function dismissEndingSequence() {
  if (!gameEnding) return;
  clearEndingTimers();
  gameEnding.hidden = true;
  gameEnding.className = 'game-ending';
  if (endingFX) { endingFX.reset(); }
}

function activateFinalWaveCheat() {
  const savedHealth = (mode === 'running' || mode === 'paused' || mode === 'wave_cleared') ? health : MAX_LIFE;

  if (mode === 'idle' || mode === 'gameover' || mode === 'ending') {
    startGame();
  } else {
    clearEnemies();
    clearEffects();
    typedBuffer = '';
    activeTarget = null;
    bossesSpawned = 0;
    bossesDefeated = 0;
    bossShotHits = 0;
    bossSpawnTimer = 0;
    waveBossOrder = [];
    finalWaveQueue = [];
    finalWaveQueueIndex = 0;
    waveClearDelayTimer = 0;
    mode = 'running';
    document.body.classList.add('is-running');
    document.body.classList.remove('is-paused');
    messagePanel.hidden = true;
    messagePanel.classList.remove('is-cleared');
    setPauseButtonState(true, false);
    startMusicLoop(false);
  }

  finalWaveCheatUsedThisRun = true;
  waveSet = FINAL_WAVE_NUMBER;
  health = savedHealth;
  prepareWavePlan();
  startFinalWave();
  showBanner('CHEAT CODE ACTIVATED', 'mimic-hint');
  updateHud(true);
  focusKeyboard();
  scheduleFrame();
}

function advanceWaveSet() {
  playStartSound();
  clearEffects();
  if (potionsSystem) {
    potionsSystem.deactivateShield();
  }
  document.body.classList.remove('final-wave-active');
  setFinalWaveScenery(false);
  waveSet += 1;
  wavePhase = 'normal';
  waveClearDelayTimer = 0;
  normalEnemyTarget = getNormalEnemyTarget(waveSet);
  normalEnemiesSpawned = 0;
  normalTypingCostSpawned = 0;
  bossesSpawned = 0;
  bossesDefeated = 0;
  bossShotHits = 0;
  bossSpawnTimer = 0;
  waveBossOrder = [];
  finalWaveQueue = [];
  finalWaveQueueIndex = 0;
  prepareWavePlan();
  typedBuffer = '';
  activeTarget = null;
  spawnTimer = 1.25;
  mode = 'running';
  startMusicLoop(false);
  document.body.classList.add('is-running');
  messagePanel.hidden = true;
  messagePanel.classList.remove('is-cleared');
  setPauseButtonState(true, false);
  updateTypedDisplay();
  updateHud(true);
  updatePhaseDisplay();
  applySeasonForWave(waveSet);
  focusKeyboard();
  if (isFinalWave()) startFinalWave();
}

function updateComboDisplay() {
  comboValue.textContent = `${streak} chain`;
  comboValue.classList.toggle('is-hidden', streak < 2);
}

function updateTypingLabel() {
  if (!typingLabel) return;
  if (mode !== 'running') {
    typingLabel.textContent = 'INPUT';
    return;
  }
  if (wavePhase === 'boss') {
    if (isFinalWave()) {
      typingLabel.textContent = `BOSS ${bossesDefeated}/${FINAL_WAVE_BOSS_COUNT}`;
      return;
    }
    typingLabel.textContent = `BOSS ${bossesDefeated}/${BOSSES_PER_WAVE}`;
  } else {
    typingLabel.textContent = 'INPUT';
  }
}

function spawnScorePopup(points, enemy, healed = 0) {
  const label = enemy.label;
  if (!label || label.classList.contains('is-hidden')) return;
  const left = parseFloat(label.style.left);
  const top = parseFloat(label.style.top);
  if (!Number.isFinite(left) || !Number.isFinite(top)) return;

  const popup = document.createElement('div');
  popup.className = enemy.isMedic ? 'score-popup is-heal' : 'score-popup';
  const scoreText = streak >= 2 ? `+${points} ×${streak}` : `+${points}`;
  const healText = healed >= MEDIC_HEAL_AMOUNT ? '+1 HEART' : '+0.5 HEART';
  popup.textContent = healed > 0 ? `${scoreText} · ${healText}` : scoreText;
  popup.style.left = `${left}px`;
  popup.style.top = `${top}px`;
  document.body.appendChild(popup);
  popup.addEventListener('animationend', () => popup.remove(), { once: true });
}

function spawnLootRewardPopup(left, top, addedType) {
  const popup = document.createElement('div');
  popup.className = 'score-popup is-loot-reward';
  const name = addedType.replace('_', ' ').toUpperCase();
  popup.textContent = `+1 ${name}`;
  popup.style.left = `${left}px`;
  popup.style.top = `${top}px`;
  document.body.appendChild(popup);
  popup.addEventListener('animationend', () => popup.remove(), { once: true });
}

function spawnInventoryFullPopup(left, top) {
  const popup = document.createElement('div');
  popup.className = 'score-popup is-inventory-full';
  popup.textContent = 'INVENTORY FULL';
  popup.style.left = `${left}px`;
  popup.style.top = `${top}px`;
  document.body.appendChild(popup);
  popup.addEventListener('animationend', () => popup.remove(), { once: true });
}

function spawnLootEscapedPopup(left, top) {
  const popup = document.createElement('div');
  popup.className = 'score-popup is-loot-escaped';
  popup.textContent = 'LOOT ESCAPED';
  popup.style.left = `${left}px`;
  popup.style.top = `${top}px`;
  document.body.appendChild(popup);
  popup.addEventListener('animationend', () => popup.remove(), { once: true });
}

function spawnMagicAcquiredBurst(addedType) {
  const existing = document.querySelector('.magic-acquired-burst');
  if (existing) existing.remove();
  const el = document.createElement('div');
  el.className = 'magic-acquired-burst';
  const name = addedType.replace('_', ' ').toUpperCase();
  el.innerHTML = `<span class="mab-line1">MAGIC ACQUIRED</span><span class="mab-line2">+1 ${name}</span>`;
  document.body.appendChild(el);
  el.addEventListener('animationend', () => el.remove(), { once: true });
}

function awardMimicLoot(enemy) {
  const types = ['time_freeze', 'chain_lightning', 'shockwave', 'shield'];
  const type = types[Math.floor(Math.random() * types.length)];
  const success = potionsSystem.addPotion(type);
  mimicsLooted += 1;

  if (!enemy.label.classList.contains('is-hidden')) {
    const left = parseFloat(enemy.label.style.left);
    const top = parseFloat(enemy.label.style.top);
    if (Number.isFinite(left) && Number.isFinite(top)) {
      if (success) {
        spawnLootRewardPopup(left, top, type);
        spawnMagicAcquiredBurst(type);
      } else {
        spawnInventoryFullPopup(left, top);
      }
    }
  }

  if (!encounteredTerms.some(t => t.term === enemy.prompt)) {
    encounteredTerms.push({ term: enemy.prompt, definition: enemy.definition, isEquation: enemy.isEquation, defeated: true });
  }
}


function renderRunGlossary() {
  if (!runGlossary) return;
  runGlossary.innerHTML = '';

  const withDefs = encounteredTerms.filter(t => t.definition);
  if (withDefs.length === 0) {
    runGlossary.hidden = true;
    return;
  }

  const sorted = [...withDefs].sort((a, b) => {
    if (a.defeated !== b.defeated) return a.defeated ? -1 : 1;
    return a.term.localeCompare(b.term);
  });

  for (const entry of sorted) {
    const item = document.createElement('div');
    item.className = `glossary-item ${entry.defeated ? 'is-defeated' : 'is-leaked'}${entry.isEquation ? ' is-equation' : ''}`;

    const term = document.createElement('span');
    term.className = 'gl-term';
    // For equations show the compact symbol form as the label; full word eq as the definition
    term.textContent = entry.isEquation ? (entry.definition || entry.term) : entry.term;

    const def = document.createElement('span');
    def.className = 'gl-def';
    def.textContent = entry.isEquation ? entry.term : (entry.definition || '—');

    item.append(term, def);
    runGlossary.append(item);
  }

  runGlossary.hidden = false;
}

function renderWaveBossGlossary() {
  if (!runGlossary) return;
  runGlossary.innerHTML = '';

  if (bossWordsThisSet.length === 0) {
    runGlossary.hidden = true;
    return;
  }

  for (const word of bossWordsThisSet) {
    const encountered = encounteredTerms.find(t => t.term === word.term);
    const wasDefeated = encountered?.defeated === true;

    const item = document.createElement('div');
    item.className = `glossary-item ${wasDefeated ? 'is-defeated' : 'is-leaked'}${word.isEquation ? ' is-equation' : ''}`;

    const term = document.createElement('span');
    term.className = 'gl-term';
    term.textContent = word.isEquation ? (word.definition || word.term) : word.term;

    const def = document.createElement('span');
    def.className = 'gl-def';
    def.textContent = word.isEquation ? word.term : (word.definition || '—');

    item.append(term, def);
    runGlossary.append(item);
  }

  runGlossary.hidden = false;
}

function spawnMissedHealPopup(left, top) {
  const popup = document.createElement('div');
  popup.className = 'score-popup is-missed-heal';
  popup.textContent = 'MISSED HEAL';
  popup.style.left = `${left}px`;
  popup.style.top = `${top}px`;
  document.body.appendChild(popup);
  popup.addEventListener('animationend', () => popup.remove(), { once: true });
}

function showBanner(text, variant = '') {
  if (!bossBanner) return;
  bossBanner.textContent = text;
  bossBanner.className = 'boss-banner' + (variant ? ` is-${variant}` : '');
  void bossBanner.offsetWidth;
  bossBanner.classList.add('is-active');
}

// Potion system logic is imported from src/potions.js

function triggerChainLightning(firstEnemy) {
  if (potionsSystem) {
    potionsSystem.clearChainLightningPrimed();
  }
  
  const origin = firstEnemy.group.position.clone();
  const N = 1; // Chain to up to 1 additional monster (total 2 including the 1st one)
  const targets = [];
  let currentPosition = origin.clone();
  
  const candidates = enemies.filter(e => 
    isEnemyTargetable(e) && 
    !e.dying && 
    e !== firstEnemy
  );
  
  for (let i = 0; i < N; i++) {
    if (candidates.length === 0) break;
    let closestEnemy = null;
    let closestDistSq = Infinity;
    let closestIndex = -1;
    for (let j = 0; j < candidates.length; j++) {
      const distSq = candidates[j].group.position.distanceToSquared(currentPosition);
      if (distSq < closestDistSq) {
        closestDistSq = distSq;
        closestEnemy = candidates[j];
        closestIndex = j;
      }
    }
    if (closestEnemy) {
      targets.push(closestEnemy);
      currentPosition = closestEnemy.group.position.clone();
      candidates.splice(closestIndex, 1);
    } else {
      break;
    }
  }

  playToggleSound();
  showBanner('CHAIN LIGHTNING!', 'chain-lightning');

  // Select the wand tip on the side of the 1st monster (origin)
  const side = origin.x < 0 ? 0 : 1;
  const selectedWand = wandGroups[side];
  if (selectedWand) {
    triggerWandSwing(selectedWand);
  }
  const wandTip = selectedWand 
    ? new THREE.Vector3(selectedWand.position.x, 2.38, selectedWand.position.z)
    : new THREE.Vector3(side === 0 ? -5.35 : 5.35, 2.38, WALL_Z - 0.2);

  const chainMonsters = [firstEnemy];

  // 1st segment: wandTip -> 1st monster (immediately, held)
  const p1 = origin.clone();
  p1.y += 0.8;
  spawnLightningVisual(wandTip, p1, true);

  let currentChainOrigin = p1;

  if (targets.length === 0) {
    // No other monsters: hold visual for 100ms, then burst the single monster
    scheduleChainLightningTimer(() => {
      burstChain(chainMonsters);
    }, 100);
  } else {
    // Chain sequentially
    targets.forEach((enemy, index) => {
      scheduleChainLightningTimer(() => {
        if (enemies.includes(enemy) && isEnemyTargetable(enemy)) {
          if (enemy.isBoss) {
            enemy.stunTimer = 3.0;
          } else {
            enemy.dying = true; // freeze
          }
          chainMonsters.push(enemy);

          const targetPos = enemy.group.position.clone();
          targetPos.y += 0.8;

          spawnLightningVisual(currentChainOrigin, targetPos, true); // hold = true
          currentChainOrigin = targetPos;
        }

        // Trigger simultaneous burst when sequence completes
        if (index === targets.length - 1) {
          scheduleChainLightningTimer(() => {
            burstChain(chainMonsters);
          }, 80);
        }
      }, (index + 1) * 60);
    });
  }
}

function armChainLightningTimer(entry, delay) {
  entry.fireAt = performance.now() + delay;
  entry.id = window.setTimeout(() => {
    const index = chainLightningTimers.indexOf(entry);
    if (index >= 0) chainLightningTimers.splice(index, 1);
    entry.callback();
  }, delay);
}

function scheduleChainLightningTimer(callback, delay) {
  const entry = { callback, id: 0, fireAt: 0 };
  armChainLightningTimer(entry, delay);
  chainLightningTimers.push(entry);
  return entry.id;
}

function clearChainLightningTimers() {
  for (const entry of chainLightningTimers) {
    window.clearTimeout(entry.id);
  }
  chainLightningTimers = [];
  if (lightningFlash) lightningFlash.style.opacity = '0';
}

// Pausing must not let the chain sequence resolve behind the pause overlay,
// so in-flight timers are halted and re-armed with their remaining delay.
function suspendChainLightningTimers() {
  for (const entry of chainLightningTimers) {
    window.clearTimeout(entry.id);
    entry.remainingDelay = Math.max(0, entry.fireAt - performance.now());
  }
}

function resumeChainLightningTimers() {
  for (const entry of chainLightningTimers) {
    armChainLightningTimer(entry, entry.remainingDelay ?? 0);
  }
}

function releaseChainBeams() {
  for (const effect of beams) {
    if (effect.kind === 'lightning_bolt' && effect.hold) {
      effect.hold = false;
      effect.life = 0.10;
      effect.maxLife = 0.10;
    }
  }
}

function burstChain(chainMonsters) {
  releaseChainBeams();

  chainMonsters.forEach(enemy => {
    defeatEnemyChainBurst(enemy);
  });

  if (lightningFlash) {
    lightningFlash.style.opacity = '0.92';
    scheduleChainLightningTimer(() => {
      lightningFlash.style.opacity = '0';
    }, 100);
  }
}

function defeatEnemyChainBurst(enemy) {
  if (enemy.isBoss && !enemy.dying) {
    const flashGeo = new THREE.DodecahedronGeometry(0.85, 0);
    const flashMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const flashMesh = new THREE.Mesh(flashGeo, flashMat);
    flashMesh.position.copy(enemy.group.position);
    flashMesh.position.y += 0.8;
    effectsGroup.add(flashMesh);
    
    beams.push({
      kind: 'beam_flash',
      mesh: flashMesh,
      life: 0.15,
      maxLife: 0.15
    });

    playToggleSound();
    return;
  }

  if (enemy.isMimic) {
    awardMimicLoot(enemy);
    spawnDebris(enemy.group.position, enemy.type, enemy.isBoss);

    // Spark impact flash mesh at the target position
    const flashGeo = new THREE.DodecahedronGeometry(0.85, 0);
    const flashMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const flashMesh = new THREE.Mesh(flashGeo, flashMat);
    flashMesh.position.copy(enemy.group.position);
    flashMesh.position.y += 0.8;
    effectsGroup.add(flashMesh);
    
    beams.push({
      kind: 'beam_flash',
      mesh: flashMesh,
      life: 0.15,
      maxLife: 0.15
    });

    removeEnemy(enemy);
    updateHud(true);
    updateTypedDisplay();
    return;
  }

  const { points, healed } = awardKill(enemy);

  spawnScorePopup(points, enemy, healed);
  
  if (enemy.isMedic) playHealSound(healed);
  else playDefeatSound(enemy);

  spawnDebris(enemy.group.position, enemy.type, enemy.isBoss);

  // Spark impact flash mesh at the target position
  const flashGeo = new THREE.DodecahedronGeometry(0.85, 0);
  const flashMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.95,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  const flashMesh = new THREE.Mesh(flashGeo, flashMat);
  flashMesh.position.copy(enemy.group.position);
  flashMesh.position.y += 0.8;
  effectsGroup.add(flashMesh);
  
  beams.push({
    kind: 'beam_flash',
    mesh: flashMesh,
    life: 0.15,
    maxLife: 0.15
  });

  removeEnemy(enemy);
  
  updateHud(true);
  updateTypedDisplay();
}

function spawnLightningVisual(startPos, targetPos, hold = false) {
  const origin = startPos.clone();
  const points = [];
  points.push(origin);
  const segments = 6;
  for (let i = 1; i < segments; i++) {
    const t = i / segments;
    const p = new THREE.Vector3().lerpVectors(origin, targetPos, t);
    p.x += (Math.random() - 0.5) * 0.6;
    p.y += (Math.random() - 0.5) * 0.6;
    p.z += (Math.random() - 0.5) * 0.6;
    points.push(p);
  }
  points.push(targetPos);

  const curve = new THREE.CatmullRomCurve3(points);
  
  // 1. Solid white core tube
  const coreGeom = new THREE.TubeGeometry(curve, 16, 0.10, 4, false);
  const coreMat = new THREE.MeshBasicMaterial({
    color: glowColor(0xffffff),
    transparent: true,
    opacity: 1.0,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  const coreMesh = new THREE.Mesh(coreGeom, coreMat);
  effectsGroup.add(coreMesh);

  // 2. Wide glowing golden sleeve
  const glowGeom = new THREE.TubeGeometry(curve, 16, 0.38, 5, false);
  const glowMat = new THREE.MeshBasicMaterial({
    color: glowColor(0xefc35c, 1.8),
    transparent: true,
    opacity: 0.52,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  const glowMesh = new THREE.Mesh(glowGeom, glowMat);
  effectsGroup.add(glowMesh);

  // 3. Impact flash at the target position
  const flashGeo = new THREE.DodecahedronGeometry(0.5, 0);
  const flashMat = new THREE.MeshBasicMaterial({
    color: 0xffdd66,
    transparent: true,
    opacity: 0.9,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  const flashMesh = new THREE.Mesh(flashGeo, flashMat);
  flashMesh.position.copy(targetPos);
  effectsGroup.add(flashMesh);
  playChainZapSound(targetPos.x);
  fx.flash(targetPos, 0xffe58a, 4.2, 0.24);
  fx.lightPulse(targetPos, 0xffdd66, 22, 0.3);
  fx.burst(targetPos, { color: 0xffe58a, color2: 0xffffff, count: 16, speed: 6, life: 0.5, size: 0.3 });

  // Register them in beams array for decay
  const duration = 0.10;
  beams.push({
    kind: 'lightning_bolt',
    mesh: coreMesh,
    life: duration,
    maxLife: duration,
    hold: hold
  });
  beams.push({
    kind: 'lightning_bolt',
    mesh: glowMesh,
    life: duration,
    maxLife: duration,
    hold: hold
  });
  beams.push({
    kind: 'beam_flash',
    mesh: flashMesh,
    life: duration,
    maxLife: duration
  });
}

// Hook up event listeners for potion slots
potionSlots.forEach((slot, index) => {
  slot.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    resumeAudio();
    potionsSystem.activatePotionSlot(index);
  });
});
