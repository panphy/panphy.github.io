import * as THREE from 'three';
import { createSpellwaveAudio } from './audio.js?v=beta12';
import { createSeasonalEffects } from './seasonal-effects.js';
import { createPotionSystem } from './potions.js?v=beta12';
import { ALL_WORDS, EASY_WORDS, HARD_WORDS, MEDIUM_WORDS, ROCK_UNITS, BOSS_PHRASES } from './question-bank.js?v=beta12';
import { createEndingCinematic, wordArrivalTimes } from './ending-cinematic.js?v=beta12';
import { createLeaderboard } from './leaderboard.js?v=beta12';
import { createEnemyMesh, createMimicChestMesh } from './enemy-meshes.js';
import { normalPromptLengthCap, withinLength, hardGuestCount, bossPlan } from './difficulty.js?v=beta12';
import { createLowPolyCloud } from './lowpoly.js';
import { createVisuals, GLOW_GAIN, MOON_GLOW_GAIN } from './visuals.js?v=beta12';
import { pickTarget, getInputCharacters, isMathOperatorInput, buildSearchPrompt, buildAltSearchPrompts, escapeHtml, wrapSups, promptIndexForProgress } from './prompt-utils.js?v=beta12';
import { createWordDeck } from './word-decks.js?v=beta12';
import { createStage } from './stages.js?v=beta12';
import { chapterForWave, GROUND_TONE, WAVE_COUNT } from './chapters.js?v=beta12';
import { createWizardHands } from './wizard-hands.js?v=beta12';

// Monster, healer and chest words, and boss lines, are drawn from decks so they
// do not repeat until a pool runs out; last run's words come after fresh ones.
const monsterDeck = createWordDeck();
const bossDeck = createWordDeck();
const LAST_RUN_TERMS_KEY = 'panphySpellwaveBetaLastRunTermsV1';

function loadLastRunTerms() {
  try {
    const terms = JSON.parse(localStorage.getItem(LAST_RUN_TERMS_KEY) || '[]');
    return Array.isArray(terms) ? terms.filter(term => typeof term === 'string') : [];
  } catch { return []; }
}

function saveRunTerms() {
  try {
    const terms = [...new Set([...monsterDeck.usedTerms(), ...bossDeck.usedTerms()])];
    localStorage.setItem(LAST_RUN_TERMS_KEY, JSON.stringify(terms.slice(0, 500)));
  } catch {}
}

const canvas = document.getElementById('gameCanvas');
const labelsLayer = document.getElementById('labelsLayer');
const scoreValue = document.getElementById('scoreValue');
const bestValue = document.getElementById('bestValue');
const healthValue = document.getElementById('healthValue');
const waveValue = document.getElementById('waveValue');
const phaseValue = document.getElementById('phaseValue');
const comboValue = document.getElementById('comboValue');
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
const runGlossary = document.getElementById('runGlossary');
const bossBanner = document.getElementById('bossBanner');
const potionBar = document.getElementById('potionBar');
const potionSlots = document.querySelectorAll('.potion-slot');
const lootGuide = document.getElementById('lootGuide');
const lootGuideIcon = document.getElementById('lootGuideIcon');
const lootGuideHow = document.getElementById('lootGuideHow');
const lootGuideCast = document.getElementById('lootGuideCast');
const lootGuideLater = document.getElementById('lootGuideLater');
const gameEnding = document.getElementById('gameEnding');
const endingFlash = document.getElementById('endingFlash');
const endingCaption = document.getElementById('endingCaption');
const endingCanvasEl = document.getElementById('endingCanvas');
const endingReplay = document.getElementById('endingReplay');
const endingSkip = document.getElementById('endingSkip');
let endingCinematic = null;
const endScore = document.getElementById('endScore');
const endAccuracy = document.getElementById('endAccuracy');
const endStreak = document.getElementById('endStreak');
const endMimics = document.getElementById('endMimics');
const endHealth = document.getElementById('endHealth');
const endTime = document.getElementById('endTime');

const STORAGE_KEY = 'panphySpellwaveBetaBestV1';
const AUDIO_STORAGE_KEY = 'panphySpellwaveAudioV1';
const MAX_DELTA = 0.06;
// Play is drawn at no more than about 60 frames a second, so a 120 Hz screen
// does half the work. The slack lets a 60 Hz screen's slightly early frames through.
const MIN_FRAME_MS = 1000 / 60 - 3;
const IDLE_FRAME_INTERVAL = 100; // ~10 fps when not actively playing
const WALL_Z = 4.6;
const SPAWN_Z = -48;
const HEART_COUNT = 5;
const MAX_LIFE = HEART_COUNT * 2;
// Two hearts or fewer: the music darkens and a heartbeat joins it.
const LOW_LIFE_MUSIC_THRESHOLD = 4;
const MINION_DAMAGE = 2;
// Chain lightning vs bosses: a long interrupt (not a global freeze like time freeze),
// and at most this many bosses are touched by one cast (a typed boss kill counts).
const CHAIN_BOSS_STUN = 5.5;
const CHAIN_BOSS_MAX = 2;
// Bosses are drawn this much bigger than their listed scale, so they dominate
// the scene in boss waves. The model gallery shows the listed scale.
const BOSS_SIZE = 1.35;
// Each wave's boss fight is set by bossPlan (difficulty.js).
const FINAL_WAVE_NUMBER = WAVE_COUNT;
// The camera rides a route through each wave's stage (stages.js) and stops for each ambush.
const CAMERA_HEIGHT = 3.5;
const CAMERA_DISTANCE = 10.5;
const RAIL_WALK_SPEED = 7;
// Monsters rush to this line, wind up, then strike.
const STRIKE_Z = 2.4;
const WINDUP_TIME = 1.1;
const RAIL_ENEMY_CAP = 6;
const COSMIC_WAVE_THRESHOLD = 99149236;
const MEDIC_HEAL_AMOUNT = 2;
const EMBER_HEIGHT_DELTAS = 1819600217;
const PARTICLE_GRAVITY_COEFFS = 2242416284;
const NORMAL_ENEMY_TARGETS = [7, 8, 10, 11, 12, 13, 14, 15, 16, 16];
const NORMAL_TYPING_BUDGETS = [58, 68, 80, 92, 104, 116, 128, 140, 152, 164];
const LABEL_SAFE_MARGIN = 12;
const LABEL_STACK_GAP = 8;
const LABEL_X_EASE = 0.14;
const LABEL_Y_EASE = 0.07;
const PATH_LANES = [-5.8, -3.7, -1.7, 0, 1.7, 3.7, 5.8];
const PATH_MARKER_MIN_Z = -44;
const PATH_MARKER_MAX_Z = 4;
const PATH_MARKER_SPACING = 6;
const PATH_MARKER_SPAN = PATH_MARKER_MAX_Z - PATH_MARKER_MIN_Z + PATH_MARKER_SPACING;
const TREE_MIN_Z = -58;
const TREE_MAX_Z = 18;
const TREE_SPAN = TREE_MAX_Z - TREE_MIN_Z;
const PATH_MARKER_WRAP_Z = 14;
const SCENERY_SCROLL_SPEED = 0.58;
const PATH_MARKER_SCROLL_MULTIPLIER = 1.0;
const ROAD_SCROLL_MULTIPLIER = 1.0;
// Monsters are modelled with their feet at y = 0, and the road surface undulates between
// about -0.14 and -0.06, so walkers stand at its high points; any higher and they visibly
// float above their own shadows.
const GROUND_ENEMY_Y = -0.06;
const FLYING_ENEMY_Y = 2.4;
// The healer heart hovers just off the ground.
const MEDIC_ENEMY_Y = 0.32;
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
  speed: 7.9,
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
  speed: 7.3,
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
for (const bossType of BOSS_TYPES) bossType.scale *= BOSS_SIZE;
const HEART_PATH = 'M16 28.4C10.3 23.6 4.8 19 3.2 14.1C1.9 10 3.8 6.2 7.5 5.4C10.4 4.8 13.1 6.1 16 9.4C18.9 6.1 21.6 4.8 24.5 5.4C28.2 6.2 30.1 10 28.8 14.1C27.2 19 21.7 23.6 16 28.4Z';
const FLYING_SHADOW_OPACITY = 0.22;
const MOON_SHADOW_FADE_IN_RATE = 1.45;
const MOON_SHADOW_FADE_OUT_RATE = 4.8;
const INITIAL_MOON_ANGLE = Math.random() * Math.PI;
const CLOUD_WRAP_X = 46;
const CLOUD_RESET_X = -46;
// How far clouds take on the sky colour, so they dim at dusk and at night.
const CLOUD_SKY_TINT = 0.42;

const reusableVector = new THREE.Vector3();
const moonScreenVector = new THREE.Vector3();
const cameraTarget = new THREE.Vector3(0, 1.5, -12);
const enemies = [];
const beams = [];
const debris = [];
const canopyBlocks = [];
const torchFlames = [];
const torchLights = [];
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
let normalEnemyTarget = getNormalEnemyTarget(monsterLevel());
let normalEnemiesSpawned = 0;
let normalTypingCostSpawned = 0;
let cosmicBuffer = [];
let bossWordsThisSet = [];
let hardGuestSchedule = new Map();
let medicsSpawnedThisSet = 0;
let medicSpawnSlots = [];
let mimicsSpawnedThisSet = 0;
let mimicSpawnSlots = [];
let firstMimicHintShown = false;
let godMode = false;
let godModeUsedThisRun = false;
let potionCheatUsedThisRun = false;
let finalWaveCheatUsedThisRun = false;
let inputTrace = '';
let streak = 0;
let peakStreak = 0;
let mimicsLooted = 0;
let typedBuffer = '';
let activeTarget = null;
let lastFrameTime = 0;
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
let encounteredTerms = [];
let firstMedicHintShown = false;
let sceneGround = null;
let sceneRockMaterial = null;
const rail = { stage: null, state: 'idle', stopIndex: -1, from: null, to: null, toIndex: 0, t: 0, duration: 1, bursts: [], encounter: null, walkPhase: 0 };
let hitStopTimer = 0;
const BOSS_STAND_Z = -15;
const ROCK_TYPE = { name: 'Rock', body: 0x8a7f72, trim: 0xb8ab98, eye: 0xffb347, speed: 0, scale: 1, weight: 0, score: 20 };
let bossHpBar = null;
let bossFight = null;
// The boss's last stand: it shudders and bursts apart before the wave can end.
let bossDeath = null;
let slowMoTimer = 0;
let kickTimer = 0;
let finalWaveScenery = null;
let sceneLeafMaterials = [];
let sceneTrunkMaterial = null;
let sceneCrystalMat = null;
let wizardHands = null;
// The palette of the chapter on screen (chapters.js), or the one being faded to.
let activePalette = null;
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
  playAmbushSound,
  playWindupSound,
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
  playVictoryScore,
  stopVictoryScore,
  getAudioTime,
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
camera.position.set(0, CAMERA_HEIGHT, CAMERA_DISTANCE);
camera.lookAt(cameraTarget);

const visuals = createVisuals({
  renderer, scene, camera, available: webGLAvailable,
  onQualityChange: (level) => setMoonShadowResolution(level === 'high' ? 2048 : 1024),
});
const fx = visuals.effects;
const skyTopColor = new THREE.Color(0x07120f);

const world = new THREE.Group();
scene.add(world);
// The current stage hangs here; moving and turning this group is how the camera travels.
const stageRig = new THREE.Group();
scene.add(stageRig);

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
  groundDecor: false,
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
buildStageForWave(1);
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
    showEndingStatsScreen(finalStats, { skipped: true });
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
  const lastRunTerms = loadLastRunTerms();
  monsterDeck.reset(lastRunTerms);
  bossDeck.reset(lastRunTerms);
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
  normalEnemyTarget = getNormalEnemyTarget(monsterLevel());
  normalEnemiesSpawned = 0;
  normalTypingCostSpawned = 0;
  prepareWavePlan();
  streak = 0;
  peakStreak = 0;
  mimicsLooted = 0;
  typedAttempts = 0;
  mistakeCount = 0;
  defeatedCount = 0;
  leakedCount = 0;
  encounteredTerms = [];
  pendingLootGuide = null;
  typedBuffer = '';
  activeTarget = null;
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
  buildStageForWave(waveSet);
  applySeasonForWave(waveSet, true);
  showChapterBanner();
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
  hideLootGuide();
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
  saveRunTerms();
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
    'OVERRUN',
    'Game Over',
    isUnranked ? `Score ${formatScore(score)} · ⚡ Unranked` : `Score ${formatScore(score)} | Best ${formatScore(bestScore)}`,
    'Try Again',
    `${formatAccuracySummary()} · ${defeatedCount} defeated · ${leakedCount} leaked · ${elapsed.toFixed(0)}s`
  );
  if (supportLink) supportLink.hidden = false;
  renderRunGlossary();
  updatePhaseDisplay();
  updateHud(true);
  submitRunToLeaderboard();
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

  // While the loot guide is open, the new potion's own key casts it.
  if (lootGuideSlot !== -1 && mode === 'paused') {
    const keys = SLOT_KEYS[lootGuideSlot];
    if (event.key === keys.arrow || event.key === String(lootGuideSlot + 1)) {
      event.preventDefault();
      castGuidedPotion();
    }
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
  dropOrphanedTyping();

  for (const inputOption of inputOptions) {
    const next = typedBuffer + inputOption.value;
    const nextMatches = findMatches(next, inputOption);

    if (nextMatches.length > 0) {
      typedBuffer = next;
      activeTarget = pickTarget(nextMatches, next);
      if (activeTarget._matchComplete) {
        defeatEnemy(activeTarget);
      } else {
        playTypeSound(typedBuffer.length / Math.max(1, activeTarget._matchedSearchPrompt.length));
        hitEnemyWithLetter(activeTarget);
      }
      updateTypedDisplay();
      return;
    }
  }

  if (isMathOperatorInput(character) && hasActiveEquationPrefix()) {
    updateTypedDisplay();
    return;
  }

  // A wrong key is only a miss: the letters typed so far, and the target, stay.
  registerMistake();
  updateTypedDisplay();
}

// Letters typed at a monster that has died or got away are dropped, so the next word starts clean.
function dropOrphanedTyping() {
  if (!typedBuffer) return;
  if (activeTarget && !activeTarget.dying && enemies.includes(activeTarget) && isEnemyTargetable(activeTarget)) return;
  typedBuffer = '';
  activeTarget = null;
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
  const missLabel = activeTarget?.label;
  if (missLabel) {
    missLabel.classList.remove('is-miss');
    void missLabel.offsetWidth;
    missLabel.classList.add('is-miss');
    window.setTimeout(() => missLabel.classList.remove('is-miss'), 220);
  }
  updateComboDisplay();
}

function defeatEnemy(enemy) {
  if (enemy.phraseBoss) {
    if (!advanceBossLine(enemy)) startBossDeath(enemy);
    return;
  }
  if (enemy.isProjectile) {
    shatterRock(enemy);
    return;
  }
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
  // The final letter lands hard: a hit pause, a kick, and slow motion on the last of an ambush.
  hitStopTimer = 0.06;
  kickTimer = Math.max(kickTimer, 0.14);
  const othersLeft = enemies.some(other => other !== enemy && !other.dying);
  if (!othersLeft && rail.state === 'encounter' && rail.encounter && rail.encounter.remaining <= 0 && !enemy.isBoss) slowMoTimer = 0.45;
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
    wasBlocked = potionsSystem.blockLeak();
  }

  if (wasBlocked) {
    potionsSystem.triggerShieldHitVisual();
  } else {
    if (!godMode) health = Math.max(0, health - enemy.damage);
    streak = 0;
    playDamageSound(enemy);
    damageTimer = 0.32;
    damageFlash.classList.add('show');
    window.setTimeout(() => damageFlash.classList.remove('show'), 160);
  }
  leakedCount += 1;
  if (!enemy.isProjectile && !encounteredTerms.some(t => t.term === enemy.prompt)) {
    encounteredTerms.push({ term: enemy.prompt, definition: enemy.definition, isEquation: enemy.isEquation, defeated: false });
  }
  spawnDebris(new THREE.Vector3(enemy.group.position.x, 1.2, WALL_Z), enemy.type, enemy.isBoss);
  removeEnemy(enemy);
  // Keep typing progress on other targets — only reset when the leaked enemy
  // was the one being typed (matches the medic/mimic leak behaviour).
  if (wasActiveTarget) typedBuffer = '';
  updateHud(true);
  updateTypedDisplay();
  if (!godMode && health <= 0) endGame();
}

function scheduleFrame() {
  cancelFrame();
  if (mode === 'paused' || mode === 'ending') return;

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
  if (mode === 'paused' || mode === 'ending') {
    rafId = null;
    return;
  }

  if (mode === 'running' && lastFrameTime && frameTime - lastFrameTime < MIN_FRAME_MS) {
    rafId = requestAnimationFrame(animate);
    return;
  }

  const delta = lastFrameTime ? Math.min((frameTime - lastFrameTime) / 1000, MAX_DELTA) : 0;
  lastFrameTime = frameTime;

  if (mode === 'running' && pendingLootGuide) {
    pendingLootGuide.delay -= delta;
    if (pendingLootGuide.delay <= 0) {
      showLootGuide();
      if (mode !== 'running') {
        rafId = null;
        return;
      }
    }
  }

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

    if (hitStopTimer > 0) {
      hitStopTimer -= delta;
      currentDelta = 0;
    } else if (slowMoTimer > 0) {
      slowMoTimer -= delta;
      currentDelta *= 0.35;
    }

    elapsed += currentDelta;

    if (wavePhase === 'normal' || rail.state === 'travel' || rail.state === 'idle') {
      updateRail(currentDelta);
    } else if (wavePhase === 'boss' && rail.state === 'boss') {
      updateBossFight(currentDelta);
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

// ── Bosses ───────────────────────────────────────────────────────────────
// One boss per wave, met in the arena at the end of the route. It speaks whole
// statements; the player types them word by word, and each finished line takes a
// segment off its health bar. Between words the player can shatter its rocks,
// each marked with a short unit. The wave's last boss line ends the wave.


function chooseBossLines(wave, count) {
  const cap = bossPlan(wave).maxLetters;
  const letters = entry => entry.term.replace(/[^a-z]/gi, '').length;
  const pool = BOSS_PHRASES.filter(entry => letters(entry) <= cap);
  const lines = [];
  // Lines grow longer through the fight: pick, then order by length.
  while (lines.length < count) {
    const entry = bossDeck.pick(pool, candidate => !lines.includes(candidate)) || pool[Math.floor(Math.random() * pool.length)];
    lines.push(entry);
  }
  return lines.sort((a, b) => letters(a) - letters(b));
}

function lineWords(line) {
  return line.term.split(/\s+/).filter(word => buildSearchPrompt(word).length > 0);
}

function setBossWord(boss) {
  const word = boss.lineWordsList[boss.wordIndex];
  boss.searchPrompt = buildSearchPrompt(word);
  boss.altSearchPrompts = buildAltSearchPrompts(word);
  boss._matchedSearchPrompt = null;
  boss.lastPromptHtml = '';
}

function startBossLine(boss) {
  const line = boss.bossLines[boss.lineIndex];
  boss.prompt = line.term;
  boss.definition = line.topic;
  boss.lineWordsList = lineWords(line);
  boss.wordIndex = 0;
  setBossWord(boss);
  renderPrompt(boss);
}

function spawnPhraseBoss() {
  const plan = bossPlan(bossLevel());
  const isFinal = isFinalWave();
  const lines = chooseBossLines(bossLevel(), plan.lines);
  bossWordsThisSet = lines.map(line => ({ term: line.term, definition: line.topic, isLine: true }));
  const boss = spawnEnemy({
    isBoss: true,
    phraseBoss: true,
    isClimaxBoss: isFinal,
    wordData: { term: lines[0].term, definition: lines[0].topic },
    bossType: nextBossType(),
    lane: 0,
    delay: 0,
    startZ: BOSS_STAND_Z,
  });
  // The final boss is drawn half as big again, so it stands further back to stay in frame.
  boss.standZ = isFinal ? BOSS_STAND_Z - 9 : BOSS_STAND_Z;
  boss.phraseBoss = true;
  boss.bossLines = lines;
  boss.lineIndex = 0;
  boss.hp = lines.length;
  boss.maxHp = lines.length;
  boss.damage = 0;
  boss.revealed = true;
  boss.revealZ = boss.standZ - 2;
  const standY = boss.baseY;
  boss.rail = { phase: 'boss-entry', t: 0, from: new THREE.Vector3(0, standY + 14, boss.standZ - 4), to: new THREE.Vector3(0, standY, boss.standZ) };
  boss.group.position.copy(boss.rail.from);
  boss.attackTimer = 2.4;
  // What the model's own animation reads: rearing back to throw, recoiling from a
  // finished line, and how hurt it is (0 fresh, 1 on its last line).
  boss.windup = 0;
  boss.hurt = 0;
  boss.rage = 0;
  boss.stagger = 0;
  boss.lunge = 0;
  boss.roar = 0;
  boss.roarTimer = 5 + Math.random() * 3;
  boss.prowlX = 0;
  startBossLine(boss);
  showBossHpBar(boss);
  return boss;
}

function showBossHpBar(boss) {
  if (!bossHpBar) {
    bossHpBar = document.createElement('div');
    bossHpBar.className = 'boss-hp-bar';
    bossHpBar.setAttribute('role', 'img');
    document.getElementById('app').append(bossHpBar);
  }
  bossHpBar.innerHTML = `<span class="boss-hp-name">${escapeHtml(boss.type.name)}</span><span class="boss-hp-segments">${'<i></i>'.repeat(boss.maxHp)}</span>`;
  bossHpBar.style.setProperty('--boss-accent', hexColor(boss.type.trim));
  bossHpBar.hidden = false;
  updateBossHpBar(boss);
}

function updateBossHpBar(boss) {
  if (!bossHpBar) return;
  bossHpBar.setAttribute('aria-label', `${boss.type.name}: ${boss.hp} of ${boss.maxHp} lines left`);
  bossHpBar.querySelectorAll('.boss-hp-segments i').forEach((segment, index) => {
    segment.classList.toggle('is-gone', index >= boss.hp);
  });
}

function hideBossHpBar() {
  if (bossHpBar) bossHpBar.hidden = true;
}

// Called for every finished word. Returns true while the boss fights on.
function advanceBossLine(boss) {
  typedBuffer = '';
  activeTarget = null;
  streak += 1;
  if (streak > peakStreak) peakStreak = streak;
  score += 10 + boss.searchPrompt.length * 8;
  boss.flinch = 1;
  boss.wordIndex += 1;
  if (boss.wordIndex < boss.lineWordsList.length) {
    setBossWord(boss);
    playTypeSound(1);
    hitEnemyWithLetter(boss);
    updateHud(true);
    updateTypedDisplay();
    return true;
  }

  // A whole line: a heavy hit and a segment off the health bar.
  let lost = 1;
  if (potionsSystem.isChainLightningPrimed()) {
    // Chain lightning doubles the blow and clears the rocks in the air.
    potionsSystem.clearChainLightningPrimed();
    if (boss.hp > 2) lost = 2;
    lightningFlash.classList.add('show');
    window.setTimeout(() => lightningFlash.classList.remove('show'), 180);
    for (const rock of enemies.filter(other => other.isProjectile && !other.dying)) shatterRock(rock, false);
  }
  boss.hp = Math.max(0, boss.hp - lost);
  boss.lineIndex += lost;
  score += boss.prompt.replace(/[^a-z]/gi, '').length * 15;
  if (!encounteredTerms.some(t => t.term === boss.prompt)) {
    encounteredTerms.push({ term: boss.prompt, definition: boss.definition, defeated: true });
  }
  updateBossHpBar(boss);
  spawnBeam(boss.group.position);
  reusableVector.copy(boss.group.position);
  reusableVector.y += 1.5 * boss.group.scale.y;
  fx.burst(reusableVector, { color: boss.type.eye, color2: 0xffffff, count: 28, speed: 6, life: 0.7, size: 0.4 });
  playBossImpactSound();
  kickTimer = Math.max(kickTimer, 0.42);
  hitStopTimer = 0.12;
  // Pieces fly off it, a shockwave rolls out and it reels back.
  for (let piece = 0; piece < 3; piece += 1) {
    reusableVector.copy(boss.group.position);
    reusableVector.x += (Math.random() - 0.5) * 2.2 * boss.group.scale.x;
    reusableVector.y += (0.8 + Math.random() * 1.8) * boss.group.scale.y;
    spawnDebris(reusableVector, boss.type);
  }
  reusableVector.set(boss.group.position.x, 0.14, boss.group.position.z);
  fx.ring(reusableVector, boss.type.eye, { from: 0.6, to: 9, life: 0.6, opacity: 0.9 });
  boss.hurt = 1;
  boss.rage = 1 - boss.hp / boss.maxHp;
  boss.windup = 0;
  slowMoTimer = Math.max(slowMoTimer, 0.35);
  if (boss.hp > 0) {
    boss.stagger = 1.4;
    boss.attackTimer = Math.max(boss.attackTimer, 2.2);
    showBanner(`${boss.hp} ${boss.hp === 1 ? 'LINE' : 'LINES'} LEFT`);
    startBossLine(boss);
    updateHud(true);
    updateTypedDisplay();
    return true;
  }
  // Fallen: its last stand follows (startBossDeath), in slow motion.
  boss.searchPrompt = boss.prompt.replace(/[^a-z]/gi, '').toLowerCase().slice(0, 12);
  slowMoTimer = 0.9;
  hideBossHpBar();
  for (const rock of enemies.filter(other => other.isProjectile && !other.dying)) shatterRock(rock, false);
  return false;
}

// Rocks carry a short unit; none may start with the same letter as the boss's
// next word or another rock, so the first key always picks one target.
function chooseRockWord(boss) {
  const taken = new Set(enemies.filter(other => !other.dying && (other.isProjectile || other === boss))
    .map(other => other.searchPrompt.charAt(0).toLowerCase()));
  const free = ROCK_UNITS.filter(entry => !taken.has(buildSearchPrompt(entry.term).charAt(0).toLowerCase()));
  return free.length > 0 ? free[Math.floor(Math.random() * free.length)] : null;
}

function throwRock(boss) {
  const wordData = chooseRockWord(boss);
  if (!wordData) return;
  const plan = bossPlan(bossLevel());
  const group = new THREE.Group();
  const rockMesh = new THREE.Mesh(new THREE.DodecahedronGeometry(0.55, 0), new THREE.MeshStandardMaterial({ color: ROCK_TYPE.body, roughness: 1, flatShading: true }));
  rockMesh.castShadow = true;
  group.add(rockMesh);
  const side = Math.random() < 0.5 ? -1 : 1;
  const start = boss.group.position.clone().add(new THREE.Vector3(side * 1.6, 2.6 * boss.group.scale.y, 0.6));
  const end = new THREE.Vector3(side * (1.2 + Math.random() * 1.8), 2.2, WALL_Z - 0.6);
  const rock = spawnEnemy({ isProjectile: true, wordData, type: ROCK_TYPE, customGroup: group, lane: start.x, startZ: start.z, delay: 0 });
  rock.isProjectile = true;
  rock.damage = plan.rockDamage;
  rock.revealed = true;
  rock.revealZ = start.z - 2;
  rock.baseY = start.y;
  rock.rail = { phase: 'projectile', t: 0, flight: plan.rockFlight, from: start, to: end, spin: new THREE.Vector3(Math.random() * 4, Math.random() * 4, Math.random() * 4) };
  rock.group.position.copy(start);
  playBossThrowSound(boss);
}

function shatterRock(rock, scored = true) {
  if (scored) {
    streak += 1;
    if (streak > peakStreak) peakStreak = streak;
    score += 40 + rock.searchPrompt.length * 10;
    hitStopTimer = 0.04;
    kickTimer = Math.max(kickTimer, 0.1);
  }
  spawnDebris(rock.group.position, ROCK_TYPE);
  playDefeatSound(rock);
  removeEnemy(rock);
  if (activeTarget === rock || activeTarget === null) {
    typedBuffer = '';
    activeTarget = null;
  }
  updateHud(true);
  updateTypedDisplay();
}

function updateBossFight(delta) {
  if (!bossFight) {
    bossFight = { boss: spawnPhraseBoss(), clearTimer: 0 };
    return;
  }
  if (bossDeath) {
    updateBossDeath(delta);
    return;
  }
  if (enemies.some(enemy => enemy.phraseBoss && !enemy.dying)) return;
  if (enemies.some(enemy => !enemy.dying)) return;
  bossFight.clearTimer += delta;
  if (bossFight.clearTimer < 1.4) return;
  bossFight = null;
  if (isFinalWave()) {
    endingStartTime = elapsed;
    startEndingSequence();
  } else {
    startWaveCleared();
  }
}

// The boss's own movement: dropping in, standing its ground, winding up and throwing.
function updatePhraseBoss(boss, delta, seconds) {
  const plan = boss.rail;
  const position = boss.group.position;
  if (plan.phase === 'boss-entry') {
    plan.t = Math.min(1, plan.t + delta / 0.9);
    position.lerpVectors(plan.from, plan.to, plan.t);
    position.y = plan.from.y + (plan.to.y - plan.from.y) * plan.t * plan.t;
    if (boss.shadowMesh) boss.shadowMesh.position.set(position.x, 0.04, position.z);
    if (plan.t >= 1) {
      plan.phase = 'boss';
      kickTimer = Math.max(kickTimer, 0.45);
      reusableVector.set(position.x, 0.14, position.z);
      fx.ring(reusableVector, boss.type.eye, { from: 0.5, to: 8, life: 0.8, opacity: 0.85 });
      playRevealSound(boss);
    }
    return;
  }
  const stunned = boss.stunTimer > 0;
  const rage = boss.rage;
  boss.stagger = Math.max(0, boss.stagger - delta);
  boss.hurt = Math.max(0, boss.hurt - delta / 1.1);
  boss.lunge = Math.max(0, boss.lunge - delta / 0.4);
  boss.roar = Math.max(0, boss.roar - delta / 0.9);

  // It prowls the arena instead of standing still: wider, faster and closer as it is hurt.
  const pace = 0.42 + rage * 0.3;
  const targetX = stunned ? boss.prowlX
    : Math.sin(seconds * pace + boss.phase) * (3.4 + rage * 1.6) + Math.sin(seconds * pace * 2.7 + boss.phase * 2) * 0.9;
  const previousX = boss.prowlX;
  boss.prowlX += (targetX - boss.prowlX) * Math.min(1, delta * 3);
  const stride = delta > 0 ? (boss.prowlX - previousX) / delta : 0;
  const recoil = boss.hurt * boss.hurt;
  position.x = boss.prowlX + (boss.hurt > 0 ? Math.sin(seconds * 60) * 0.12 * boss.hurt : 0);
  position.z = boss.standZ + rage * 2.2 + Math.sin(seconds * 0.31 + boss.phase) * 1.2 - recoil * 3.2 + boss.lunge * 1.5;
  if (boss.isFlying) position.y = boss.baseY + Math.sin(seconds * 1.4 + boss.phase) * boss.floatAmount * (1 + rage);
  else position.y = boss.baseY + Math.abs(Math.sin(seconds * 4.4 + boss.phase)) * Math.min(0.16, Math.abs(stride) * 0.06);
  if (boss.shadowMesh) boss.shadowMesh.position.set(position.x, 0.04, position.z);
  boss.group.rotation.y = Math.atan2(-position.x, CAMERA_DISTANCE - position.z) + THREE.MathUtils.clamp(stride * 0.06, -0.3, 0.3);
  boss.group.rotation.z = THREE.MathUtils.clamp(-stride * 0.03, -0.14, 0.14);
  // Rear back to throw, snap forward as it lets go, reel when a line lands, loom when it roars.
  boss.group.rotation.x = -boss.windup * 0.34 + boss.lunge * 0.42 - recoil * 0.5 + Math.sin(boss.roar * Math.PI) * 0.22;
  boss.scaleBoost = 1 + boss.windup * 0.06 + Math.sin(boss.roar * Math.PI) * 0.14;
  if (stunned || boss.stagger > 0) return;

  // Between throws it roars: more often the angrier it is.
  boss.roarTimer -= delta * (1 + rage);
  if (boss.roarTimer <= 0 && boss.attackTimer > 1.6) {
    boss.roar = 1;
    boss.roarTimer = 6 + Math.random() * 4;
    kickTimer = Math.max(kickTimer, 0.16);
    reusableVector.set(position.x, 0.14, position.z);
    fx.ring(reusableVector, boss.type.eye, { from: 0.5, to: 6.5, life: 0.7, opacity: 0.7 });
    playRevealSound(boss);
  }

  boss.attackTimer -= delta;
  const rocksInFlight = enemies.filter(enemy => enemy.isProjectile && !enemy.dying).length;
  boss.windup = boss.attackTimer <= BOSS_WINDUP_TIME ? THREE.MathUtils.clamp(1 - boss.attackTimer / BOSS_WINDUP_TIME, 0, 1) : 0;
  if (boss.attackTimer <= 0) {
    boss.windup = 0;
    if (rocksInFlight < 2) {
      throwRock(boss);
      boss.lunge = 1;
      reusableVector.set(position.x, 0.14, position.z);
      fx.ring(reusableVector, ROCK_TYPE.eye, { from: 0.4, to: 3.4, life: 0.4, opacity: 0.6 });
    }
    boss.attackTimer = bossPlan(bossLevel()).attackGap * (0.85 + Math.random() * 0.3);
  }
}

// A beaten boss does not just vanish: it shudders, bursts in several places and then goes up.
const BOSS_DEATH_TIME = 1.9;
const BOSS_WINDUP_TIME = 0.9;

function startBossDeath(boss) {
  const { points } = awardKill(boss);
  spawnScorePopup(points, boss, 0);
  boss.dying = true;
  boss.hurt = 1;
  boss.rage = 1;
  boss.windup = 0;
  bossDeath = { boss, t: 0, nextBurst: 0, x: boss.group.position.x, z: boss.group.position.z };
  typedBuffer = '';
  activeTarget = null;
  playBossImpactSound();
  kickTimer = Math.max(kickTimer, 0.5);
  hitStopTimer = 0.14;
  updateHud(true);
  updateTypedDisplay();
}

function updateBossDeath(delta) {
  const { boss } = bossDeath;
  bossDeath.t += delta;
  const t = Math.min(1, bossDeath.t / BOSS_DEATH_TIME);
  const position = boss.group.position;
  // Shaking harder and harder, sagging back as it goes.
  position.x = bossDeath.x + Math.sin(bossDeath.t * 70) * (0.08 + t * 0.3);
  position.z = bossDeath.z - t * 1.6;
  boss.group.rotation.x = -0.25 - t * 0.5;
  boss.group.rotation.z = Math.sin(bossDeath.t * 9) * 0.1 * (1 + t);
  boss.group.scale.setScalar(boss.type.scale * (boss.isClimaxBoss ? 1.5 : 1) * (1 + Math.sin(bossDeath.t * 30) * 0.03 + t * t * 0.12));
  boss.hurt = 1;
  if (boss.group.userData.animate) boss.group.userData.animate(gameTimeSeconds, boss);
  if (boss.shadowMesh) boss.shadowMesh.position.set(position.x, 0.04, position.z);

  bossDeath.nextBurst -= delta;
  if (bossDeath.nextBurst <= 0 && t < 1) {
    bossDeath.nextBurst = 0.26 - t * 0.16;
    reusableVector.copy(position);
    reusableVector.x += (Math.random() - 0.5) * 2.6 * boss.group.scale.x;
    reusableVector.y += (0.5 + Math.random() * 2.2) * boss.group.scale.y;
    reusableVector.z += 0.6;
    fx.burst(reusableVector, { color: boss.type.eye, color2: 0xffffff, count: 14, speed: 5, life: 0.5, size: 0.42 });
    spawnDebris(reusableVector, boss.type);
    playBossImpactSound();
    kickTimer = Math.max(kickTimer, 0.12 + t * 0.14);
  }
  if (t < 1) return;

  // The end: everything that is left goes at once.
  playDefeatSound(boss);
  spawnBeam(position);
  spawnDebris(position, boss.type, true);
  reusableVector.set(position.x, 0.14, position.z);
  fx.ring(reusableVector, boss.type.eye, { from: 1, to: 16, life: 0.9, opacity: 0.95 });
  fx.ring(reusableVector, 0xffffff, { from: 0.5, to: 9, life: 0.6, opacity: 0.8 });
  reusableVector.y = 1.6 * boss.group.scale.y;
  fx.burst(reusableVector, { color: boss.type.eye, color2: 0xffffff, count: 60, speed: 9, life: 1.1, size: 0.5 });
  kickTimer = Math.max(kickTimer, 0.6);
  hitStopTimer = 0.12;
  slowMoTimer = Math.max(slowMoTimer, 0.7);
  removeEnemy(boss);
  bossDeath = null;
  updateHud(true);
}

function updateRock(rock, delta) {
  const plan = rock.rail;
  plan.t = Math.min(1, plan.t + delta / plan.flight);
  const t = plan.t;
  rock.group.position.lerpVectors(plan.from, plan.to, t);
  rock.group.position.y += Math.sin(t * Math.PI) * 2.4;
  rock.group.rotation.x += plan.spin.x * delta;
  rock.group.rotation.y += plan.spin.y * delta;
  rock.group.rotation.z += plan.spin.z * delta;
  if (t >= 1) {
    leakEnemy(rock);
    return true;
  }
  return false;
}

// ── The rail ─────────────────────────────────────────────────────────────
// Each wave has its own stage: the camera walks to a stop, an ambush bursts out of
// hiding, and once the stop is clear it walks on; the last stop is the boss arena.

function currentPalette() {
  return activePalette || chapterForWave(waveSet).palette;
}

// The last chapter is the night sky: no clouds or weather, and the moons and drifting rocks are out.
function isSkyChapter() {
  return currentPalette().name === 'final';
}

// The difficulty tables were tuned over ten steps. The five waves climb the same
// range two steps at a time: monsters at steps 1, 3, 5, 7, 9 and bosses at 2, 4, 6, 8, 10.
function monsterLevel(wave = waveSet) {
  return wave * 2 - 1;
}

function bossLevel(wave = waveSet) {
  return wave * 2;
}

// Split the wave's monsters, healers and chests into ambushes.
function planBursts(wave) {
  const level = monsterLevel(wave);
  let left = getNormalEnemyTarget(level) + getMedicCountForWave(level) + getMimicCountForWave(level);
  const [low, high] = level <= 2 ? [2, 3] : level <= 4 ? [3, 4] : [3, 5];
  const sizes = [];
  while (left > 0) {
    let size = Math.min(left, low + Math.floor(Math.random() * (high - low + 1)));
    if (left - size > 0 && left - size < low) size = left;
    sizes.push(size);
    left -= size;
  }
  return sizes;
}

function buildStageForWave(wave) {
  if (rail.stage) rail.stage.dispose();
  bossFight = null;
  bossDeath = null;
  hideBossHpBar();
  rail.bursts = planBursts(wave);
  const chapter = chapterForWave(wave);
  rail.stage = createStage({
    seed: Math.floor(Math.random() * 1e6) + wave,
    burstCount: Math.max(1, rail.bursts.length),
    materials: { trunk: sceneTrunkMaterial, leaves: sceneLeafMaterials, rock: sceneRockMaterial },
    kit: chapter.kit,
  });
  stageRig.add(rail.stage.group);
  sceneGround = rail.stage.terrain;
  recolorGround(chapter.palette);
  rail.lateDone = false;
  rail.state = 'idle';
  rail.stopIndex = -1;
  rail.from = null;
  rail.to = null;
  rail.encounter = null;
  rail.t = 0;
  setRailPose(rail.stage.travelPose(null, rail.stage.stops[0], 0));
}

// Place the stage so the given route pose sits at the game's origin, facing −z.
function setRailPose(pose) {
  const c = Math.cos(pose.yaw);
  const sn = Math.sin(pose.yaw);
  stageRig.rotation.set(0, -pose.yaw, 0);
  stageRig.position.set(-(pose.x * c - pose.z * sn), 0, -(pose.x * sn + pose.z * c));
}

function railBeginTravel(targetIndex) {
  const stops = rail.stage.stops;
  rail.from = rail.stopIndex >= 0 ? stops[rail.stopIndex] : null;
  rail.to = stops[targetIndex];
  rail.toIndex = targetIndex;
  const distance = rail.to.arc - (rail.from ? rail.from.arc : rail.stage.startArc);
  rail.duration = Math.max(1.6, distance / RAIL_WALK_SPEED);
  rail.t = 0;
  rail.state = 'travel';
}

function updateRail(delta) {
  if (!rail.stage) return;
  const stops = rail.stage.stops;
  if (rail.state === 'idle') {
    railBeginTravel(wavePhase === 'boss' || rail.bursts.length === 0 ? stops.length - 1 : 0);
  }
  if (rail.state === 'travel') {
    rail.t = Math.min(1, rail.t + delta / rail.duration);
    rail.walkPhase += delta * 7.2;
    const pose = rail.stage.travelPose(rail.from, rail.to, rail.t);
    setRailPose(pose);
    enterLatePart(pose.arc);
    if (rail.t >= 1) arriveAtStop();
    return;
  }
  if (rail.state === 'encounter') updateEncounter(delta);
}

// Some stages change partway along (the pass runs into the mine): as the camera steps
// through, the light and the name of the place change with it.
function enterLatePart(arc) {
  const { late } = chapterForWave(waveSet);
  if (!late || rail.lateDone || arc < rail.stage.lateArc + 7) return;
  rail.lateDone = true;
  applyPalette(late.palette);
  showBanner(late.title.toUpperCase());
}

function arriveAtStop() {
  rail.stopIndex = rail.toIndex;
  const stop = rail.to;
  if (stop.isBoss) {
    if (wavePhase === 'normal') startBossPhase();
    rail.state = 'boss';
    return;
  }
  startEncounter(stop, rail.bursts[rail.stopIndex] || 0, rail.stopIndex >= rail.bursts.length - 1);
}

const FALLBACK_SPOTS = [
  { kind: 'ground', x: -3, z: -5 },
  { kind: 'ground', x: 3, z: -7 },
  { kind: 'sky', x: 0, z: -6 },
];

function startEncounter(stop, count, isLast) {
  const spots = (stop.spots.length > 0 ? stop.spots : FALLBACK_SPOTS).slice();
  for (let index = spots.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1));
    [spots[index], spots[swap]] = [spots[swap], spots[index]];
  }
  rail.state = 'encounter';
  rail.encounter = { stop, remaining: count, isLast, spots, nextSpot: 0, timer: 0.35, clearTimer: 0 };
}

function updateEncounter(delta) {
  const encounter = rail.encounter;
  const live = enemies.filter(enemy => !enemy.dying);
  const wantsMore = encounter.remaining > 0
    || (encounter.isLast && wavePhase === 'normal' && !isNormalWaveComplete());
  if (wantsMore) {
    encounter.clearTimer = 0;
    encounter.timer -= delta;
    if (encounter.timer <= 0 && live.length < RAIL_ENEMY_CAP) {
      spawnRailMember(encounter);
      encounter.timer = Math.max(0.45, 0.9 - (monsterLevel() - 1) * 0.05) + Math.random() * 0.3;
    }
    return;
  }
  if (live.length > 0) return;
  encounter.clearTimer += delta;
  if (encounter.clearTimer < 0.8) return;
  if (encounter.stop.isBoss) {
    arriveAtStop();
    return;
  }
  const stops = rail.stage.stops;
  const next = rail.stopIndex + 1 < rail.bursts.length ? rail.stopIndex + 1 : stops.length - 1;
  railBeginTravel(next);
}

function spawnRailMember(encounter) {
  const kind = shouldSpawnMedic() ? 'medic' : shouldSpawnMimic() ? 'mimic' : !isNormalWaveComplete() ? 'minion' : null;
  if (!kind) {
    encounter.remaining = 0;
    return null;
  }
  // Healers and chests run across from cover; monsters may come from anywhere.
  const spots = encounter.spots;
  let spot = spots[encounter.nextSpot % spots.length];
  if (kind !== 'minion') spot = spots.find(candidate => candidate.kind === 'cover') || spot;
  encounter.nextSpot += 1;
  const enemy = spawnEnemy({ isMedic: kind === 'medic', isMimic: kind === 'mimic', railSpot: spot });
  registerNormalTypingCost(enemy);
  if (kind === 'medic') medicsSpawnedThisSet += 1;
  else if (kind === 'mimic') mimicsSpawnedThisSet += 1;
  else normalEnemiesSpawned += 1;
  encounter.remaining -= 1;
  return enemy;
}

// Seconds a player at this wave needs for a word, from a gentle 24 words a minute upward.
function railTypingEstimate(enemy) {
  const lettersPerSecond = 2.0 + (monsterLevel() - 1) * 0.17;
  return 0.7 + enemy.searchPrompt.length / lettersPerSecond;
}

function setupRailEntry(enemy, spot) {
  const crosser = enemy.isMedic || enemy.isMimic;
  const baseY = enemy.baseY;
  let from;
  let to;
  if (spot.kind === 'cover') {
    from = new THREE.Vector3(spot.hideX, baseY, spot.hideZ);
    const laneX = crosser ? spot.x : THREE.MathUtils.clamp(spot.x * 0.45 + (Math.random() - 0.5) * 1.4, -4.6, 4.6);
    to = new THREE.Vector3(laneX, baseY, Math.min(-5, spot.z + (crosser ? 0 : 1.6)));
  } else if (spot.kind === 'ground') {
    from = new THREE.Vector3(spot.x, baseY - 2.4, spot.z);
    to = new THREE.Vector3(spot.x, baseY, spot.z);
  } else {
    from = new THREE.Vector3(spot.x + (Math.random() - 0.5) * 3, baseY + 11, spot.z - 3);
    to = new THREE.Vector3(spot.x, baseY, spot.z);
  }
  enemy.lane = to.x;
  enemy.revealed = false;
  enemy.revealZ = Math.min(from.z, to.z) - 2;
  enemy.group.position.copy(from);
  const own = railTypingEstimate(enemy) * Math.max(1.12, 1.6 - (monsterLevel() - 1) * 0.05);
  const queue = enemies
    .filter(other => other !== enemy && !other.dying && other.rail && !other.isMimic)
    .reduce((sum, other) => sum + railTypingEstimate(other) * 0.8, 0);
  const walkTime = Math.max(1.4, own + queue - WINDUP_TIME);
  enemy.rail = {
    phase: 'entry',
    kind: spot.kind,
    t: 0,
    entryTime: spot.kind === 'cover' ? 0.55 : spot.kind === 'ground' ? 0.5 : 0.45,
    from,
    to,
    speed: (STRIKE_Z - to.z) / walkTime,
    crossTo: (to.x >= 0 ? -1 : 1) * 12,
    crossT: 0,
    crossTime: (2 + railTypingEstimate(enemy)) * 1.5,
  };
  playAmbushSound(spot.kind, THREE.MathUtils.clamp(to.x / 9, -0.8, 0.8));
  if (spot.kind === 'ground') {
    reusableVector.set(to.x, 0.2, to.z);
    fx.burst(reusableVector, { color: 0x7a5a3a, color2: 0xc9a46a, count: 16, speed: 3.4, life: 0.6, size: 0.3, gravity: 6 });
  }
}

// Moves a monster that came out of an ambush. Returns true once it has gone.
function updateRailEnemy(enemy, delta, seconds) {
  if (enemy.isProjectile) return updateRock(enemy, delta);
  if (enemy.phraseBoss) {
    updatePhraseBoss(enemy, delta, seconds);
    return false;
  }
  const plan = enemy.rail;
  const position = enemy.group.position;
  const stunned = enemy.stunTimer > 0;
  const facing = Math.atan2(-position.x, CAMERA_DISTANCE - position.z);

  if (plan.phase === 'entry') {
    plan.t = Math.min(1, plan.t + delta / plan.entryTime);
    const t = plan.t;
    if (plan.kind === 'sky') {
      position.lerpVectors(plan.from, plan.to, t);
      position.y = plan.from.y + (plan.to.y - plan.from.y) * t * t;
    } else if (plan.kind === 'ground') {
      const rise = 1 - (1 - t) ** 3;
      position.set(plan.to.x, plan.from.y + (plan.to.y - plan.from.y) * rise + Math.sin(t * Math.PI) * 0.7, plan.to.z);
    } else {
      const run = 1 - (1 - t) ** 2;
      position.lerpVectors(plan.from, plan.to, run);
      position.y = plan.to.y + Math.sin(t * Math.PI) * 1.1;
    }
    enemy.group.rotation.y = facing;
    if (plan.t >= 1) {
      plan.phase = enemy.isMedic || enemy.isMimic ? 'cross' : 'advance';
      enemy.revealed = true;
      enemy.revealFlash = 0.28;
      reusableVector.set(position.x, 0.14, position.z);
      fx.ring(reusableVector, enemy.type.eye, { from: 0.3, to: plan.kind === 'sky' ? 3.2 : 2.2, life: 0.5, opacity: 0.7 });
      if (plan.kind !== 'cover') kickTimer = Math.max(kickTimer, 0.1);
    }
    return false;
  }

  if (plan.phase === 'cross') {
    if (!stunned) plan.crossT = Math.min(1, plan.crossT + delta / plan.crossTime);
    position.x = plan.to.x + (plan.crossTo - plan.to.x) * plan.crossT;
    position.z = plan.to.z;
    position.y = enemy.baseY + Math.abs(Math.sin(seconds * 6 + enemy.phase)) * 0.12;
    // Healers and chests keep facing the player as they cross, leaning a little the way they go.
    enemy.group.rotation.y = facing + (plan.crossTo > plan.to.x ? 0.3 : -0.3);
    if (plan.crossT >= 1) {
      leakEnemy(enemy);
      return true;
    }
    return false;
  }

  if (plan.phase === 'advance') {
    if (enemy.pushbackTargetZ !== undefined) {
      position.z += (enemy.pushbackTargetZ - position.z) * Math.min(1.0, 10.0 * delta);
      if (Math.abs(position.z - enemy.pushbackTargetZ) < 0.1) delete enemy.pushbackTargetZ;
    } else if (!stunned) {
      position.z += plan.speed * delta;
    }
    position.x = enemy.lane + Math.sin(seconds * enemy.wobbleSpeed + enemy.phase) * enemy.wobbleAmount;
    position.y = enemy.baseY + Math.abs(Math.sin(seconds * 6.2 + enemy.phase)) * enemy.stepBounce * 1.6;
    enemy.group.rotation.y = facing + Math.sin(seconds * 2.4 + enemy.phase) * 0.12;
    if (position.z >= STRIKE_Z) {
      position.z = STRIKE_Z;
      plan.phase = 'windup';
      plan.t = 0;
      playWindupSound(THREE.MathUtils.clamp(position.x / 9, -0.8, 0.8));
    }
    return false;
  }

  if (plan.phase === 'windup') {
    if (enemy.pushbackTargetZ !== undefined) {
      plan.phase = 'advance';
      return false;
    }
    if (!stunned) plan.t += delta;
    const charge = Math.min(1, plan.t / WINDUP_TIME);
    position.y = enemy.baseY + Math.abs(Math.sin(plan.t * 26)) * 0.06 * charge;
    enemy.group.rotation.y = facing;
    enemy.group.rotation.x = -charge * 0.35;
    if (plan.t >= WINDUP_TIME) {
      plan.phase = 'strike';
      plan.t = 0;
    }
    return false;
  }

  // Strike: a lunge at the camera; reaching the wall deals the damage.
  plan.t += delta;
  const lunge = Math.min(1, plan.t / 0.18);
  position.z = STRIKE_Z + (WALL_Z + 0.01 - STRIKE_Z) * lunge;
  enemy.group.rotation.x = 0.4 * lunge;
  return false;
}

// Every correct letter lands: the monster flinches, sparks fly and the wand flicks a bolt.
function hitEnemyWithLetter(enemy) {
  enemy.flinch = 1;
  reusableVector.copy(enemy.group.position);
  reusableVector.y += 0.9 * enemy.group.scale.y;
  fx.burst(reusableVector, { color: enemy.type.eye, color2: 0xffffff, count: 7, speed: 3.2, life: 0.3, size: 0.24 });
  wizardHands.cast(1, 0.45);
  const start = wizardHands.origin(1);
  const end = reusableVector.clone();
  const distance = start.distanceTo(end);
  const bolt = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 0.08, distance),
    new THREE.MeshBasicMaterial({ color: glowColor(0xbff7ee), transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false })
  );
  bolt.position.copy(start).lerp(end, 0.5);
  bolt.lookAt(end);
  effectsGroup.add(bolt);
  beams.push({ mesh: bolt, life: 0.09, maxLife: 0.09, kind: 'beam_core' });
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

    if (updateRailEnemy(enemy, delta, seconds)) {
      if (mode !== 'running') break;
      continue;
    }
    if (enemy.group.userData.animate && enemy.stunTimer <= 0) enemy.group.userData.animate(seconds, enemy);

    updateEnemyAura(enemy, delta);
    if (enemy.revealFlash > 0) enemy.revealFlash -= delta;

    updateEnemyMarkers(enemy, seconds);

    const pulseScale = enemy.isMedic
      ? 1 + Math.max(0, Math.sin(seconds * 12 + enemy.phase)) * 0.14
      : 1;
    const finalScaleMultiplier = (enemy.isClimaxBoss ? 1.5 : 1.0) * (1 - (enemy.flinch || 0) * 0.12) * (enemy.scaleBoost || 1);
    if (enemy.flinch > 0) {
      enemy.flinch = Math.max(0, enemy.flinch - delta * 7);
      enemy.group.rotation.x = (enemy.group.rotation.x || 0) * 0.5 - enemy.flinch * 0.32;
    }
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

  if (mode === 'running') {
    selectTarget();
    dropOrphanedTyping();
  }
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
  updateMeteors(envDelta);
  emberLight.intensity = seasonEmberIntensityBase + Math.sin(seconds * 5.8) * 0.34;
  if (kickTimer > 0) kickTimer = Math.max(0, kickTimer - delta);
  const shake = Math.max(damageTimer > 0 ? damageTimer * 0.45 : 0, kickTimer * 0.6);
  // A walking bob while the camera travels between stops.
  const walking = rail.state === 'travel' && mode === 'running' ? Math.sin(Math.PI * rail.t) : 0;
  const bob = Math.abs(Math.sin(rail.walkPhase)) * 0.09 * walking;
  camera.position.x = Math.sin(seconds * 0.34) * 0.12 + Math.sin(rail.walkPhase * 0.5) * 0.06 * walking + Math.sin(seconds * 41) * shake;
  camera.position.y = CAMERA_HEIGHT + Math.sin(seconds * 0.52) * 0.06 + bob + Math.cos(seconds * 37) * shake;
  camera.position.z = CAMERA_DISTANCE + Math.sin(seconds * 0.28) * 0.08 + Math.sin(seconds * 43) * shake;
  camera.lookAt(cameraTarget);
  wizardHands.update(seconds, envDelta, {
    target: activeTarget && !activeTarget.dying ? activeTarget.group.position : null,
    walk: walking,
    walkPhase: rail.walkPhase,
  });
  if (rail.stage) rail.stage.update(seconds);

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
      // Underground there is no sky to hang it in.
      moon.visible = !currentPalette().indoor;
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
  const labelItems = [];

  for (const enemy of enemies) {
    renderPrompt(enemy);
    reusableVector.copy(enemy.group.position);
    reusableVector.y += 3.2 * enemy.type.scale * (enemy.isClimaxBoss ? 1.5 : 1.0);
    reusableVector.project(camera);

    const isVisible = isLabelShown(enemy) && reusableVector.z > -1 && reusableVector.z < 1;
    enemy.label.classList.toggle('is-hidden', !isVisible);
    enemy.label.classList.toggle('is-revealing', !enemy.isBoss && enemy.revealFlash > 0);
    if (!isVisible) continue;

    const x = (reusableVector.x * 0.5 + 0.5) * width;
    const y = (-reusableVector.y * 0.5 + 0.5) * height;
    const approachAmount = enemy.isProjectile ? enemy.rail.t
      : enemy.phraseBoss ? 0
      : enemy.rail.phase === 'cross' ? enemy.rail.crossT
      : THREE.MathUtils.clamp((enemy.group.position.z - enemy.rail.to.z) / (STRIKE_Z - enemy.rail.to.z), 0, 1);
    enemy.approachAmount = approachAmount;
    const scale = enemy.isBoss
      ? THREE.MathUtils.lerp(0.92, 1.12, approachAmount)
      : THREE.MathUtils.lerp(0.86, 1.12, approachAmount);
    enemy.label.style.setProperty('--threat-progress', approachAmount.toFixed(3));

    if (enemy.phraseBoss) {
      labelItems.push({ enemy, x: width / 2, y: 0, scale: 1, pinned: true });
    } else {
      labelItems.push({ enemy, x, y, scale });
    }
  }

  // The boss's line is placed first, so the other cards can keep clear of it.
  let pinnedBottom = 0;
  labelItems.sort((first, second) => (second.pinned ? 1 : 0) - (first.pinned ? 1 : 0));
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
    let labelMinY = minY;
    if (item.pinned) {
      // The boss's line hangs under its health bar, clear of the rocks flying in below.
      const barBottom = bossHpBar && !bossHpBar.hidden ? bossHpBar.getBoundingClientRect().bottom : safeBounds.top;
      targetX = item.x;
      targetY = Math.min(barBottom + 8 + labelHeight, maxY);
      enemy.labelX = targetX;
      enemy.labelY = targetY;
      pinnedBottom = targetY;
    } else {
      targetX = THREE.MathUtils.clamp(item.x, LABEL_SAFE_MARGIN + labelWidth / 2, width - LABEL_SAFE_MARGIN - labelWidth / 2);
      // Other cards (the rocks) keep below the boss's line.
      if (pinnedBottom > 0) labelMinY = Math.min(maxY, Math.max(minY, pinnedBottom + LABEL_STACK_GAP + labelHeight));
      targetY = THREE.MathUtils.clamp(item.y, labelMinY, maxY);
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
      minY: labelMinY,
      maxY,
      width: labelWidth,
      height: labelHeight,
      left: enemy.labelX - labelWidth / 2,
      right: enemy.labelX + labelWidth / 2,
    };
  });

  resolveLabelStacks(layoutItems.filter(item => !item.pinned));

  for (const item of layoutItems) {
    const { enemy, scale } = item;
    enemy.labelY = item.y;
    enemy.label.style.left = `${enemy.labelX}px`;
    enemy.label.style.top = `${enemy.labelY}px`;
    enemy.label.style.transform = `translate(-50%, -100%) scale(${scale.toFixed(3)})`;
    enemy.label.classList.toggle('is-target', enemy === activeTarget);
    const railPhase = enemy.rail.phase;
    enemy.label.classList.toggle('is-warning', enemy.approachAmount > 0.45);
    enemy.label.classList.toggle('is-danger', enemy.approachAmount > 0.8);
    enemy.label.classList.toggle('is-critical', railPhase === 'windup' || railPhase === 'strike');
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
  const inputTop = height;
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
  const typed = bufferFor(activeTarget);
  const effectiveSP = activeTarget._matchedSearchPrompt?.startsWith(typed)
    ? activeTarget._matchedSearchPrompt
    : activeTarget.searchPrompt;
  if (!effectiveSP.startsWith(typed)) return typedBuffer;
  if (effectiveSP !== activeTarget.searchPrompt) return typedBuffer;
  return activeTarget.prompt.slice(0, promptIndexForProgress(activeTarget.prompt, typed.length, {
    multiplicationAlias: activeTarget.isEquation,
  }));
}

function renderPrompt(enemy) {
  if (enemy.phraseBoss) {
    const html = buildBossLineHtml(enemy);
    if (enemy.lastPromptHtml === html) return;
    enemy.lastPromptHtml = html;
    enemy.promptNode.innerHTML = html;
    return;
  }
  const typed = enemy === activeTarget ? bufferFor(enemy) : '';
  const effectiveSP = enemy._matchedSearchPrompt?.startsWith(typed)
    ? enemy._matchedSearchPrompt
    : enemy.searchPrompt;
  const matched = effectiveSP.startsWith(typed) && typed.length > 0;
  const typedProgress = matched ? typed.length : 0;

  const typedLen = typedProgress > 0 ? promptIndexForProgress(enemy.prompt, typedProgress, {
    multiplicationAlias: enemy.isEquation,
  }) : 0;
  const html = `<span class="typed">${wrapSups(escapeHtml(enemy.prompt.slice(0, typedLen)))}</span>`
    + `<span class="remaining">${wrapSups(escapeHtml(enemy.prompt.slice(typedLen)))}</span>`;

  if (enemy.lastPromptHtml === html) return;
  enemy.lastPromptHtml = html;
  enemy.promptNode.innerHTML = html;
}

// Typed words, the word in progress (its typed letters marked) and the words to come.
function bossWordProgress(boss) {
  const word = boss.lineWordsList[boss.wordIndex] || '';
  const typed = activeTarget === boss ? bufferFor(boss) : '';
  const key = boss._matchedSearchPrompt?.startsWith(typed) ? boss._matchedSearchPrompt : boss.searchPrompt;
  if (!typed || !key.startsWith(typed)) return { word, done: '' };
  if (key !== boss.searchPrompt) return { word, done: typed };
  return { word, done: word.slice(0, promptIndexForProgress(word, typed.length)) };
}

function buildBossLineHtml(boss) {
  const words = boss.lineWordsList;
  const { word, done } = bossWordProgress(boss);
  const parts = words.map((entry, index) => {
    if (index < boss.wordIndex) return `<span class="typed">${escapeHtml(entry)}</span>`;
    if (index > boss.wordIndex) return `<span class="remaining">${escapeHtml(entry)}</span>`;
    const rest = done && word.startsWith(done) ? word.slice(done.length) : word;
    const typedPart = done && word.startsWith(done) ? done : '';
    return `<span class="current-word"><span class="typed">${escapeHtml(typedPart)}</span><span class="remaining">${escapeHtml(rest)}</span></span>`;
  });
  return parts.join(' ');
}

function bossTypedText(boss) {
  const { done } = bossWordProgress(boss);
  return [...boss.lineWordsList.slice(0, boss.wordIndex), done].filter(Boolean).join(' ');
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

function updatePhaseDisplay() {
  if (!phaseValue) return;
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
  phaseValue.textContent = 'Spellwave';
}

function getNormalEnemyTarget(wave) {
  return NORMAL_ENEMY_TARGETS[Math.min(wave, NORMAL_ENEMY_TARGETS.length) - 1];
}

function getNormalWaveTypingBudget(wave) {
  return NORMAL_TYPING_BUDGETS[Math.min(wave, NORMAL_TYPING_BUDGETS.length) - 1];
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

function isNormalTypingBudgetReached() {
  return normalTypingCostSpawned >= getNormalWaveTypingBudget(monsterLevel());
}

function isNormalWaveComplete() {
  if (normalEnemiesSpawned >= normalEnemyTarget) return true;
  return isNormalTypingBudgetReached();
}

// What the player has typed shows in the target's own card, under its word.
function updateTypedDisplay() {
  const shown = displayTypedBuffer();
  for (const enemy of enemies) {
    if (!enemy.typedNode) continue;
    const text = enemy.phraseBoss ? bossTypedText(enemy) : enemy === activeTarget ? shown : '';
    if (enemy.lastTypedText === text) continue;
    enemy.lastTypedText = text;
    enemy.typedNode.innerHTML = text ? wrapSups(escapeHtml(text)) : '';
    enemy.label.classList.toggle('has-typing', !!text);
  }
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
  const type = options.type || (isBoss ? options.bossType : isMedic ? MEDIC_TYPE : isMimic ? MIMIC_TYPE : weightedPick(ENEMY_TYPES));
  if (isMedic && !firstMedicHintShown) {
    firstMedicHintShown = true;
    window.setTimeout(() => { if (mode === 'running') showBanner('TYPE TO HEAL!', 'medic-hint'); }, 1100);
  }
  if (isMimic && !firstMimicHintShown) {
    firstMimicHintShown = true;
    window.setTimeout(() => { if (mode === 'running') showBanner('MIMIC CHEST DETECTED!', 'mimic-hint'); }, 1100);
  }
  const group = options.customGroup || (isMimic ? createMimicChestMesh(type) : createEnemyMesh(type));
  // A monster from an ambush is placed by setupRailEntry; bosses and rocks say where they start.
  const startZ = Number.isFinite(options.startZ) ? options.startZ : 0;
  const lane = Number.isFinite(options.lane) ? options.lane : 0;
  const isFlying = isBoss && !!type.isFlying;
  const spawnBaseY = isFlying ? FLYING_ENEMY_Y : isMedic ? MEDIC_ENEMY_Y : GROUND_ENEMY_Y;
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
    shadowMesh = new THREE.Mesh(new THREE.BoxGeometry(3.8 * BOSS_SIZE, 0.06, 3.8 * BOSS_SIZE), shadowMat);
    shadowMesh.position.set(lane, 0.04, startZ);
    shadowMesh.visible = moonShadowStrength > 0.02;
    if (isClimaxBoss) shadowMesh.scale.setScalar(1.5);
    scene.add(shadowMesh);
  }

  const promptKind = options.phraseBoss ? 'boss' : options.isProjectile ? 'rock' : isMedic ? 'medic' : isMimic ? 'mimic' : 'keyword';
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
  kindNode.textContent = promptKind === 'mimic' ? 'loot'
    : options.isProjectile ? 'rock'
    : options.phraseBoss ? (options.bossType?.name || 'boss')
    : promptKind;

  const promptNode = document.createElement('span');
  promptNode.className = 'prompt';

  label.append(kindNode, promptNode);

  const typedNode = document.createElement('span');
  typedNode.className = 'typed-line';
  label.append(typedNode);

  const threatNode = document.createElement('span');
  threatNode.className = 'threat-meter';
  threatNode.append(document.createElement('i'));
  label.append(threatNode);

  labelsLayer.append(label);

  const promptOptions = { multiplicationAlias: isEquationPrompt };
  const enemy = {
    id: enemyId,
    type,
    group,
    label,
    promptNode,
    typedNode,
    lastTypedText: '',
    prompt: wordData.term,
    definition: wordData.definition || null,
    isEquation: isEquationPrompt,
    searchPrompt: buildSearchPrompt(wordData.term, promptOptions),
    altSearchPrompts: options.isProjectile ? [] : buildAltSearchPrompts(wordData.term, promptOptions),
    _matchedSearchPrompt: null,
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
    revealZ: startZ,
    revealed: true,
    revealFlash: 0,
    speed: isBoss ? type.speed : isMedic ? type.speed + Math.random() * 0.18 : isMimic ? type.speed + Math.random() * 0.25 : type.speed + Math.random() * 0.35,
    damage: isBoss || isMedic ? 0 : MINION_DAMAGE,
    baseY: spawnBaseY,
    age: 0,
    wobbleAmount: isBoss ? 0.05 : 0.08 + Math.random() * 0.2,
    wobbleSpeed: isBoss ? 0.7 : 1.2 + Math.random() * 1.4,
    stepBounce: isFlying ? 0 : isBoss ? 0.04 : 0.06 + Math.random() * 0.08,
    floatAmount: isFlying ? 0.22 : 0,
    phase: Math.random() * Math.PI * 2,
  };
  if (options.railSpot) setupRailEntry(enemy, options.railSpot);
  enemyId += 1;
  enemies.push(enemy);
  renderPrompt(enemy);
  selectTarget();
  return enemy;
}

function createWorld() {
  createTorches();
  createSceneryMaterials();
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
  sceneCrystalMat = new THREE.MeshStandardMaterial({
    color: 0x58dfcf, emissive: 0x2dd4bf, emissiveIntensity: 2.6,
    roughness: 0.1, metalness: 0.2, transparent: true, opacity: 0.9, flatShading: true,
  });

  // The wizard's hands hang from the camera, which must be in the scene for them to draw.
  scene.add(camera);
  wizardHands = createWizardHands({ camera, crystalMaterial: sceneCrystalMat, createCrown: createLightningCrown });
  for (const glow of wizardHands.glows) torchFlames.push({ mesh: glow, phase: Math.random() * Math.PI * 2 });
  lightningCrowns.push(...wizardHands.crowns);

  // The magic's glow on whatever reaches the player: two lights either side of the
  // path, where monsters stop to strike. They never move, so the light count is fixed.
  for (const x of [-5.35, 5.35]) {
    const light = new THREE.PointLight(0x2dd4bf, 1.6, 14, 2);
    light.position.set(x, 2.2, WALL_Z - 0.2);
    light.userData.phase = Math.random() * Math.PI * 2;
    world.add(light);
    torchLights.push(light);
  }
}

// Stages share these, so the seasons recolour every stage's trees.
function createSceneryMaterials() {
  sceneTrunkMaterial = new THREE.MeshStandardMaterial({ color: 0x513820, roughness: 0.95, flatShading: true });
  sceneLeafMaterials = [
    new THREE.MeshStandardMaterial({ color: 0x1f5b38, roughness: 0.95, flatShading: true }),
    new THREE.MeshStandardMaterial({ color: 0x2f7247, roughness: 0.95, flatShading: true }),
    new THREE.MeshStandardMaterial({ color: 0x163d30, roughness: 0.95, flatShading: true }),
  ];
  sceneRockMaterial = new THREE.MeshStandardMaterial({ color: 0xd6ccb4, roughness: 1, flatShading: true });
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
  const active = isSkyChapter() && mode === 'running';
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
  if (isSkyChapter() || currentPalette().indoor || mode === 'ending') {
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

function spawnBeam(targetPosition) {
  // The finishing blow comes from the wand, with the open hand flaring beside it.
  wizardHands.cast(1, 1);
  wizardHands.cast(0, 1);
  const start = wizardHands.origin(1);
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
    const typed = bufferFor(enemy, prefix);
    // A finished word wins over one it merely starts.
    const keys = enemyTypeableKeys(enemy);
    const match = keys.find(key => key === typed) || keys.find(key => key.startsWith(typed));
    if (!match) return false;
    enemy._matchedSearchPrompt = match;
    enemy._matchComplete = match === typed;
    return true;
  });
}

// Typing ignores capitals everywhere: kg, KG and Kg all hit a monster marked kg.
function bufferFor(enemy, buffer = typedBuffer) {
  return buffer.toLowerCase();
}

// Everything a player could type at an enemy: its answer and alternative spellings.
function enemyTypeableKeys(enemy) {
  return [enemy.searchPrompt, ...(enemy.altSearchPrompts || [])];
}

function hasActiveEquationPrefix() {
  return enemies.some((enemy) => {
    if (!enemy.isEquation || !isEnemyTargetable(enemy)) return false;
    return enemyTypeableKeys(enemy).some(key => key.startsWith(bufferFor(enemy)));
  });
}

function chooseTarget(matches) {
  return pickTarget(matches, typedBuffer);
}

// Bosses are typeable as soon as their card appears (during the approach). Rocks
// still wait until revealZ so early answers are a skill reward, not free damage.
function isEnemyTargetable(enemy) {
  if (enemy.dying || enemy.group.position.z >= WALL_Z) return false;
  if (enemy.isBoss) return true;
  return enemy.revealed;
}

function isLabelShown(enemy) {
  return isEnemyTargetable(enemy);
}

function prepareWavePlan() {
  bossWordsThisSet = [];
  medicsSpawnedThisSet = 0;
  medicSpawnSlots = chooseMedicSpawnSlots(normalEnemyTarget, getMedicCountForWave(monsterLevel()));
  mimicsSpawnedThisSet = 0;
  mimicSpawnSlots = chooseMimicSpawnSlots(normalEnemyTarget, getMimicCountForWave(monsterLevel()));
  hardGuestSchedule = monsterLevel() <= 4 ? buildHardGuestSchedule(normalEnemyTarget) : new Map();
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
  const nearExisting = new Set(enemies.map((e) => e.prompt));
  const bossAnswers = liveAnswers(enemy => enemy.isBoss);
  const pool = withinLength(currentKeywordPool(), 12);
  const usablePool = pool.length > 0 ? pool : EASY_WORDS;
  const clear = entry => !sharesAnswer(buildSearchPrompt(entry.term), bossAnswers);
  return monsterDeck.pick(usablePool, entry => !nearExisting.has(entry.term) && clear(entry))
    || monsterDeck.pick(usablePool, clear)
    || usablePool[Math.floor(Math.random() * usablePool.length)];
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


function buildHardGuestSchedule(target) {
  const count = hardGuestCount(monsterLevel());
  const available = withinLength(HARD_WORDS, normalPromptLengthCap(monsterLevel()));
  if (count === 0 || available.length === 0) return new Map();

  const picked = [];
  const usedTerms = new Set();
  while (picked.length < count) {
    const entry = monsterDeck.pick(available, item => !usedTerms.has(item.term));
    if (!entry) break;
    picked.push(entry);
    usedTerms.add(entry.term);
  }

  const schedule = new Map();
  const half = Math.ceil(target / 2);
  picked.forEach((word, i) => {
    let slot = half + Math.floor((i * (target - half)) / Math.max(1, picked.length));
    slot = Math.min(target - 1, slot);
    while (schedule.has(slot) && slot < target - 1) slot += 1;
    schedule.set(slot, word);
  });

  return schedule;
}

function sharesAnswer(answer, answers) {
  return answers.some(other => answer.startsWith(other) || other.startsWith(answer));
}

function liveAnswers(filter = () => true) {
  return enemies.filter(enemy => !enemy.dying && filter(enemy)).flatMap(enemyTypeableKeys);
}

function choosePrompt() {
  const scheduledHardGuest = wavePhase === 'normal' ? hardGuestSchedule.get(normalEnemiesSpawned) : null;
  if (scheduledHardGuest) return scheduledHardGuest;

  const liveKeys = enemies.filter(enemy => !enemy.dying).map(enemy => enemy.searchPrompt.toLowerCase());
  // No word on screen may start another, or typing one would finish the other.
  const clashes = entry => {
    const key = buildSearchPrompt(entry.term).toLowerCase();
    return liveKeys.some(other => other.startsWith(key) || key.startsWith(other));
  };
  const pool = currentKeywordPool();
  const nearExisting = new Set(enemies.map((enemy) => enemy.prompt));
  return monsterDeck.pick(pool, entry => !nearExisting.has(entry.term) && !clashes(entry))
    || monsterDeck.pick(pool, entry => !clashes(entry))
    || monsterDeck.pick(pool);
}

function chooseMedicPrompt() {
  const nearExisting = new Set(enemies.map((enemy) => enemy.prompt));
  const pool = currentKeywordPool();
  const compactPool = pool.filter((entry) => {
    const length = buildSearchPrompt(entry.term).length;
    return length >= 4 && length <= 12;
  });
  const usablePool = compactPool.length > 0 ? compactPool : pool.length > 0 ? pool : EASY_WORDS;
  const bossAnswers = liveAnswers(enemy => enemy.isBoss);
  const clear = entry => !sharesAnswer(buildSearchPrompt(entry.term), bossAnswers);
  return monsterDeck.pick(usablePool, entry => !nearExisting.has(entry.term) && clear(entry))
    || monsterDeck.pick(usablePool, clear)
    || usablePool[Math.floor(Math.random() * usablePool.length)];
}

function currentKeywordPool() {
  const level = monsterLevel();
  const pool = level >= 5 ? [...MEDIUM_WORDS, ...HARD_WORDS]
    : level >= 3 ? [...EASY_WORDS, ...MEDIUM_WORDS]
    : EASY_WORDS;
  return withinLength(pool, normalPromptLengthCap(level));
}

// Each chapter has its own boss (chapters.js).
function nextBossType() {
  const name = chapterForWave(waveSet).boss;
  return BOSS_TYPES.find(type => type.name === name) || BOSS_TYPES[0];
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
  if (starField) starField.opacity = palette.starOpacity;
  skyTopColor.setHex(palette.skyTop);
  recolorGround(palette);
}

// Sets the light, colour and weather of the wave's chapter.
function applySeasonForWave(wave, instant = false) {
  applyPalette(chapterForWave(wave).palette, instant);
}

// A change of palette comes in through a fog bank that hides the new scenery, then clears.
function applyPalette(palette, instant = false) {
  const changed = palette !== activePalette;
  activePalette = palette;
  const sky = palette.name === 'final';
  setFinalWaveScenery(sky);
  if (starField) starField.size = sky ? 1.7 : 1;
  if (sky || palette.indoor) seasonalEffects.stopWeather();
  else seasonalEffects.setSeason(palette.name);
  if (instant) {
    applySeasonInstant(palette);
    seasonFade = null;
    return;
  }
  if (changed) startSeasonFade(palette, { fogBank: true });
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
function startSeasonFade(palette, { fogBank = false } = {}) {
  seasonFade = { from: buildSeasonFromScene(), to: buildSeasonTarget(palette), palette, t: 0, duration: 3.5 };
  if (sceneGround) sceneGround.startBlend(groundColours(palette));
  if (fogBank) {
    const { from, to } = seasonFade;
    from.fogColor.copy(to.fogColor);
    from.bgColor.copy(to.fogColor);
    from.skyTop.copy(to.fogColor);
    from.fogNear = 2;
    from.fogFar = 16;
    // Brief: the fog should part almost as soon as the camera starts to walk.
    seasonFade.duration = 1.6;
    updateSeasonFade(0);
  }
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

function startFinalWave() {
  document.body.classList.add('final-wave-active');
  showBanner('FINAL WAVE!', 'final-wave');
  playBossWarningSound();
  updatePhaseDisplay();
  applySeasonForWave(waveSet);
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
  wavePhase = 'boss';
  showBanner('BOSS WAVE');
  playBossWarningSound();
  updatePhaseDisplay();
}

function startWaveCleared() {
  mode = 'wave_cleared';
  saveRunTerms();
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
let endingLeaderboardOffered = false;
// The defeated words that fly into the wands in the victory cinematic.
const ENDING_WORD_COUNT = 10;
const ENDING_WORD_MAX_LENGTH = 18;

function startEndingSequence() {
  mode = 'ending';
  saveRunTerms();
  endingLeaderboardOffered = false;
  stopMusicLoop(0.4);
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
  gameEnding.className = 'game-ending phase-cinematic';

  const finalStats = getEndingStats();
  setEndingStats(finalStats, false);

  if (!endingCinematic) endingCinematic = createEndingCinematic(endingCanvasEl, { flashEl: endingFlash, captionEl: endingCaption });
  if (!endingCinematic.available) {
    showEndingStatsScreen(finalStats, { skipped: true });
    return;
  }

  // The score and the picture share one clock: the audio clock when sound is on.
  const terms = chooseEndingWords();
  const arrivals = wordArrivalTimes(terms.length);
  const audioStart = playVictoryScore({ arrivals });
  endingCinematic.play({
    terms,
    arrivals,
    batterySaver,
    audioStart,
    getAudioTime,
    onComplete: () => showEndingStatsScreen(finalStats),
  });
}

// Up to ten words the player defeated this run, topped up from the word bank on a short run.
function chooseEndingWords() {
  const fits = (term) => term && term.length <= ENDING_WORD_MAX_LENGTH;
  const shuffle = (entries) => {
    const order = [...entries];
    for (let i = order.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    return order;
  };
  const defeated = shuffle(encounteredTerms.filter(entry => entry.defeated && !entry.isEquation && fits(entry.term)).map(entry => entry.term));
  const words = [...new Set(defeated)].slice(0, ENDING_WORD_COUNT);
  for (const entry of shuffle(EASY_WORDS)) {
    if (words.length >= Math.min(6, ENDING_WORD_COUNT)) break;
    if (fits(entry.term) && !words.includes(entry.term)) words.push(entry.term);
  }
  return words;
}

function showEndingStatsScreen(finalStats, { skipped = false } = {}) {
  clearEndingTimers();
  if (gameEnding) {
    gameEnding.className = 'game-ending phase-stats phase-replay';
  }
  setEndingStats(finalStats, true);
  if (skipped) {
    endingCinematic?.skipToEnd();
    stopVictoryScore(0.5);
    playVictoryFinaleSound();
  }
  // The quiet loop takes over once the last chord has rung.
  queueEndingStep(() => {
    if (mode === 'ending') startMusicLoop(true);
  }, skipped ? 2800 : 3600);
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
  endingCinematic?.stop();
  stopVictoryScore(0.2);
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
  buildStageForWave(FINAL_WAVE_NUMBER);
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
  waveSet += 1;
  wavePhase = 'normal';
  normalEnemyTarget = getNormalEnemyTarget(monsterLevel());
  normalEnemiesSpawned = 0;
  normalTypingCostSpawned = 0;
  prepareWavePlan();
  typedBuffer = '';
  activeTarget = null;
  mode = 'running';
  startMusicLoop(false);
  document.body.classList.add('is-running');
  messagePanel.hidden = true;
  messagePanel.classList.remove('is-cleared');
  setPauseButtonState(true, false);
  updateTypedDisplay();
  updateHud(true);
  updatePhaseDisplay();
  buildStageForWave(waveSet);
  applySeasonForWave(waveSet);
  focusKeyboard();
  if (isFinalWave()) startFinalWave();
  else showChapterBanner();
}

// Names the place when the camera arrives somewhere new.
function showChapterBanner() {
  const { title } = chapterForWave(waveSet);
  if (title) showBanner(title.toUpperCase());
}

function updateComboDisplay() {
  comboValue.textContent = String(streak);
}

function updateTypingLabel() {}

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

// ── First-loot guide ──
// The first time a player ever loots a potion, the game pauses once to show how
// to cast magic and invites them to find out what each kind does by trying it.
const LOOT_GUIDE_KEY = 'panphySpellwaveBetaLootGuideSeenV1';
const LOOT_GUIDE_DELAY = 0.8;
const SLOT_KEYS = [
  { arrow: 'ArrowLeft', symbol: '\u2190' },
  { arrow: 'ArrowUp', symbol: '\u2191' },
  { arrow: 'ArrowRight', symbol: '\u2192' },
  { arrow: 'ArrowDown', symbol: '\u2193' },
];
let pendingLootGuide = null;
let lootGuideSlot = -1;

function hasSeenLootGuide() {
  try { return localStorage.getItem(LOOT_GUIDE_KEY) === '1'; } catch { return false; }
}

function markLootGuideSeen() {
  try { localStorage.setItem(LOOT_GUIDE_KEY, '1'); } catch {}
}

function queueLootGuide(type, slot) {
  if (!lootGuide || slot < 0 || pendingLootGuide || hasSeenLootGuide()) return;
  pendingLootGuide = { type, slot, delay: LOOT_GUIDE_DELAY };
}

function showLootGuide() {
  const { type, slot } = pendingLootGuide;
  pendingLootGuide = null;
  // Skip it if the potion was already used or the run is no longer in play.
  if (mode !== 'running' || potionsSystem.getPotions()[slot] !== type) return;
  markLootGuideSeen();

  const key = SLOT_KEYS[slot];
  lootGuideIcon.innerHTML = potionsSystem.getPotionIcon(type);
  lootGuideHow.innerHTML = `To cast it, press <kbd>${key.symbol}</kbd> or tap it in your potion tray. Each slot has its own arrow key.`;
  lootGuideCast.textContent = `Cast it now (${key.symbol})`;

  mode = 'paused';
  lootGuideSlot = slot;
  stopMusicLoop();
  cancelFrame();
  suspendChainLightningTimers();
  playChestOpenSound();
  document.body.classList.add('is-paused', 'loot-guide-open');
  potionSlots[slot]?.classList.add('is-guided');
  setPauseButtonState(false, false);
  lootGuide.hidden = false;
  lootGuideCast.focus({ preventScroll: true });
  updatePhaseDisplay();
}

function hideLootGuide() {
  if (lootGuideSlot === -1) return;
  potionSlots[lootGuideSlot]?.classList.remove('is-guided');
  lootGuideSlot = -1;
  lootGuide.hidden = true;
  document.body.classList.remove('loot-guide-open');
}

function castGuidedPotion() {
  const slot = lootGuideSlot;
  if (slot === -1) return;
  resumeGame();
  potionsSystem.activatePotionSlot(slot);
}

if (lootGuideCast) {
  lootGuideCast.addEventListener('click', () => {
    resumeAudio();
    castGuidedPotion();
  });
}

if (lootGuideLater) {
  lootGuideLater.addEventListener('click', () => {
    resumeAudio();
    resumeGame();
  });
}

function awardMimicLoot(enemy) {
  const types = ['time_freeze', 'chain_lightning', 'shockwave', 'shield'];
  const type = types[Math.floor(Math.random() * types.length)];
  const slot = potionsSystem.getPotions().indexOf(null);
  const success = potionsSystem.addPotion(type);
  mimicsLooted += 1;
  if (success) queueLootGuide(type, slot);

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
    term.textContent = word.isLine ? word.definition : word.isEquation ? (word.definition || word.term) : word.term;

    const def = document.createElement('span');
    def.className = 'gl-def';
    def.textContent = word.isLine || word.isEquation ? word.term : (word.definition || '—');

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

  // Bosses get a long rock-clearing interrupt instead of a short freeze; a typed
  // boss kill counts toward the cap, so one cast touches at most CHAIN_BOSS_MAX bosses.
  const bossInterrupts = chooseChainBossInterrupts(firstEnemy, targets);

  playToggleSound();
  showBanner('CHAIN LIGHTNING!', 'chain-lightning');

  // The chain leaps from the open hand's rune.
  wizardHands.cast(0, 1);
  wizardHands.cast(1, 1);
  const wandTip = wizardHands.origin(0);

  const chainMonsters = [firstEnemy];

  // 1st segment: wandTip -> 1st monster (immediately, held)
  const p1 = origin.clone();
  p1.y += 0.8;
  spawnLightningVisual(wandTip, p1, true);

  let currentChainOrigin = p1;

  const finishChain = () => {
    // Zap any pulsed bosses that were not on the hop path, then resolve the burst.
    const pulsed = bossInterrupts.filter(boss => (
      !chainMonsters.includes(boss) && enemies.includes(boss) && !boss.dying
    ));
    for (const boss of pulsed) {
      const targetPos = boss.group.position.clone();
      targetPos.y += 0.8;
      spawnLightningVisual(currentChainOrigin, targetPos, true);
      currentChainOrigin = targetPos;
      chainMonsters.push(boss);
    }
    scheduleChainLightningTimer(() => {
      for (const boss of bossInterrupts) interruptBossWithChain(boss);
      burstChain(chainMonsters);
    }, pulsed.length > 0 ? 80 : 0);
  };

  if (targets.length === 0) {
    scheduleChainLightningTimer(() => {
      finishChain();
    }, 100);
  } else {
    targets.forEach((enemy, index) => {
      scheduleChainLightningTimer(() => {
        if (enemies.includes(enemy) && isEnemyTargetable(enemy)) {
          if (!enemy.isBoss) enemy.dying = true;
          chainMonsters.push(enemy);

          const targetPos = enemy.group.position.clone();
          targetPos.y += 0.8;

          spawnLightningVisual(currentChainOrigin, targetPos, true);
          currentChainOrigin = targetPos;
        }

        if (index === targets.length - 1) {
          scheduleChainLightningTimer(() => {
            finishChain();
          }, 80);
        }
      }, (index + 1) * 60);
    });
  }
}

// Up to CHAIN_BOSS_MAX bosses per cast. A typed boss defeat uses one slot; remaining
// slots go to the hop target first, then the nearest other live bosses (the pulse).
function chooseChainBossInterrupts(firstEnemy, chainHopTargets) {
  let slots = CHAIN_BOSS_MAX;
  if (firstEnemy.isBoss) slots -= 1;
  if (slots <= 0) return [];

  const chosen = [];
  const tryAdd = (enemy) => {
    if (!enemy || !enemy.isBoss || enemy.dying || enemy === firstEnemy) return;
    if (chosen.includes(enemy) || chosen.length >= slots) return;
    chosen.push(enemy);
  };

  for (const target of chainHopTargets) tryAdd(target);

  const bossInvolved = firstEnemy.isBoss || chainHopTargets.some(enemy => enemy.isBoss);
  if (bossInvolved && chosen.length < slots) {
    const origin = firstEnemy.group.position;
    const others = enemies
      .filter(enemy => enemy.isBoss && !enemy.dying && enemy !== firstEnemy && !chosen.includes(enemy))
      .sort((a, b) => a.group.position.distanceToSquared(origin) - b.group.position.distanceToSquared(origin));
    for (const enemy of others) tryAdd(enemy);
  }

  return chosen;
}

// Long targeted interrupt: freeze that boss.
function interruptBossWithChain(enemy) {
  if (!enemy || !enemy.isBoss || enemy.dying) return;
  enemy.stunTimer = Math.max(enemy.stunTimer || 0, CHAIN_BOSS_STUN);
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
    if (lootGuideSlot !== -1) {
      if (index === lootGuideSlot) castGuidedPotion();
      return;
    }
    potionsSystem.activatePotionSlot(index);
  });
});
