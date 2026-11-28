import * as THREE from 'three';
import { createKeyFireAudio } from './audio.js?v=17';
import { createSeasonalEffects } from './seasonal-effects.js?v=17';
import { createPowerUpSystem, POWER_UP_TYPES } from './power-ups.js?v=17';
import { ALL_WORDS, EASY_WORDS, HARD_WORDS, MEDIUM_WORDS, ROCK_UNITS, BOSS_PHRASES, BOSS_STORIES } from './question-bank.js?v=17';
import { createEndingCinematic, wordArrivalTimes } from './ending-cinematic.js?v=17';
import { createLeaderboard } from './leaderboard.js?v=17';
import { createEnemyMesh } from './enemy-meshes.js?v=17';
import { normalPromptLengthCap, withinLength, LONGEST_MONSTER_WORD, hardGuestCount, bossPlan, bossFightOrder, beamChargeTime, planVariants } from './difficulty.js?v=17';
import { createShieldPlate, createSplitterCores, createCasterOrb, createCasterBolt, createWings, createSpaceBat } from './monster-variants.js?v=17';
import { createLowPolyCloud } from './lowpoly.js?v=17';
import { createVisuals, GLOW_GAIN, MOON_GLOW_GAIN } from './visuals.js?v=17';
import { pickTarget, getInputCharacter, buildSearchPrompt, buildAltSearchPrompts, altTermFor, escapeHtml, promptIndexForProgress } from './prompt-utils.js?v=17';
import { createWordDeck } from './word-decks.js?v=17';
import { createStage } from './stages.js?v=17';
import { chapterForWave, GROUND_TONE, WAVE_COUNT } from './chapters.js?v=17';
import { storyBeatForWave } from './story.js?v=17';
import { createStoryteller, settleLantern } from './storyteller.js?v=17';
import { createPlasmaCannon } from './plasma-cannon.js?v=17';
import { createRideCart } from './ride-cart.js?v=17';

// Monster, healer and chest words, and boss lines, are drawn from decks so they
// do not repeat until a pool runs out; last run's words come after fresh ones.
const monsterDeck = createWordDeck();
const bossDeck = createWordDeck();
const LAST_RUN_TERMS_KEY = 'keyfireLastRunTermsV1';

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
const healthValue = document.getElementById('healthValue');
const phaseValue = document.getElementById('phaseValue');
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
const powerUpBar = document.getElementById('powerUpBar');
const powerUpSlots = document.querySelectorAll('.power-up-slot');
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
const endTime = document.getElementById('endTime');
const endRankKeys = [...document.querySelectorAll('#gameEnding .rank-key')];

const STORAGE_KEY = 'keyfireBestV1';
const AUDIO_STORAGE_KEY = 'keyfireAudioV1';
const MAX_DELTA = 0.06;
// Play is drawn at no more than about 60 frames a second, so a 120 Hz screen
// does half the work. The slack lets a 60 Hz screen's slightly early frames through.
const MIN_FRAME_MS = 1000 / 60 - 3;
const IDLE_FRAME_INTERVAL = 100; // ~10 fps when not actively playing
const WALL_Z = 4.6;
const SPAWN_Z = -48;
const HEART_COUNT = 3;
const MAX_LIFE = HEART_COUNT * 2;
// One heart or less: the music darkens and a heartbeat joins it.
const LOW_LIFE_MUSIC_THRESHOLD = 2;
const MINION_DAMAGE = 2;
// The railgun's colour: its shots, and the cannon's crystal while shots are left.
const RAILGUN_COLOUR = 0xff5ad2;
// Seconds a boss is stunned when chain lightning leaps to it.
const CHAIN_BOSS_STUN = 5.5;
// Bosses are drawn this much bigger than their listed scale, so they dominate
// the scene in boss waves. The model gallery shows the listed scale.
const BOSS_SIZE = 1.35;
// Each wave's boss fight is set by bossPlan (difficulty.js).
const FINAL_WAVE_NUMBER = WAVE_COUNT;
// The camera rides a route through each wave's stage (stages.js) and stops for each ambush.
const CAMERA_HEIGHT = 3.5;
// The moons and clouds hang at fixed places in the world, nearer than the far hills,
// islands and trees of a stage, which they would otherwise cover. keepInSky squeezes their
// depth into a thin band at the back of the depth range, so all scenery nearer than
// about 107 units covers them. Within the band they keep their order by distance:
// a flat depth made the overlapping puffs of a cloud flicker as they fought.
const SKY_BAND = { near: 0.9998, width: 0.00018, reach: 150 };
const CAMERA_DISTANCE = 10.5;
const RAIL_WALK_SPEED = 7;
// Monsters rush to this line, wind up, then strike.
const STRIKE_Z = 2.4;
const WINDUP_TIME = 1.1;
const RAIL_ENEMY_CAP = 6;
const COSMIC_WAVE_THRESHOLD = 99149236;
// A small healer gives back half a heart, a big one a whole heart. From the second
// stage each healer has this chance of being big.
const SMALL_HEAL = 1;
const BIG_HEAL = 2;
const BIG_HEALER_CHANCE = 1 / 3;
// Every chest is a mimic: part way across its run it turns and charges, and if it
// reaches the player it bites for half a heart. MIMIC_TURN_AT is how far across it
// turns; its charge takes about as long as the word, plus MIMIC_CHARGE_SPARE seconds.
const MIMIC_BITE_DAMAGE = 1;
const MIMIC_TURN_AT = [0.3, 0.55];
const MIMIC_CHARGE_SPARE = 0.8;
const EMBER_HEIGHT_DELTAS = 1819600217;
const PARTICLE_GRAVITY_COEFFS = 2242416284;
const NORMAL_ENEMY_TARGETS = [7, 8, 10, 11, 12, 13, 14, 15, 16, 16];
const NORMAL_TYPING_BUDGETS = [58, 68, 80, 92, 104, 116, 128, 140, 152, 164];
const LABEL_SAFE_MARGIN = 12;
const LABEL_STACK_GAP = 8;
const LABEL_X_EASE = 0.14;
const LABEL_Y_EASE = 0.07;
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
    scale: 0.94,
    weight: 6,
    score: 35,
  },
  {
    name: 'Glowmite',
    body: 0x235a50,
    trim: 0x54c46e,
    eye: 0xefc35c,
    scale: 0.9,
    weight: 4,
    score: 45,
  },
  {
    name: 'Ash Oaf',
    body: 0x393b40,
    trim: 0x6d7075,
    eye: 0xf26a3d,
    scale: 1.22,
    weight: 3,
    score: 55,
  },
  {
    name: 'Cinder Imp',
    body: 0x5e2322,
    trim: 0xf26a3d,
    eye: 0xf2f0df,
    scale: 0.85,
    weight: 2,
    score: 70,
  },
  {
    name: 'Bog Shambler',
    body: 0x2a1640,
    trim: 0x8b4fc8,
    eye: 0x78ff6e,
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
  scale: 0.92,
  score: 70,
};
// The small healer (half a heart) is the same heart at about a third of the size.
const SMALL_MEDIC_TYPE = {
  ...MEDIC_TYPE,
  name: 'Little Heart',
  scale: MEDIC_TYPE.scale * 0.35,
  score: 45,
};
const MIMIC_TYPE = {
  name: 'Mimic Chest',
  isMimic: true,
  body: 0xd4a020,
  trim: 0xffd040,
  eye: 0xef44fb,
  scale: 1.2,
};

const BOSS_TYPES = [
  {
    name: 'Crimson Bulwark',
    isBoss: true,
    isFlying: true,
    body: 0x5b0614,
    trim: 0xff351f,
    eye: 0xfff05a,
    scale: 1.62,
    score: 150,
  },
  {
    name: 'Verdant Colossus',
    isBoss: true,
    body: 0x0e3b2f,
    trim: 0x2dd4bf,
    eye: 0xd9ff66,
    scale: 1.64,
    score: 150,
  },
  {
    name: 'Glacial Titan',
    isBoss: true,
    body: 0x1a3045,
    trim: 0x9ee8ff,
    eye: 0xfff8b0,
    scale: 1.68,
    score: 150,
  },
  {
    name: 'Magma Sovereign',
    isBoss: true,
    body: 0x3d0a00,
    trim: 0xff6a00,
    eye: 0xffffff,
    scale: 1.63,
    score: 150,
  },
  {
    name: 'Stellar Dreadnought',
    isBoss: true,
    body: 0x050d1a,
    trim: 0xd4a017,
    eye: 0xffffff,
    scale: 1.72,
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
const cannonGlows = [];
const strikeLights = [];
const lightningCrowns = [];
const clouds = [];
const meteors = [];

let mode = 'idle';
let score = 0;
let bestScore = loadBestScore();
let health = MAX_LIFE;
let cannonIsPrimed = false;
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
let powerUpCheatUsedThisRun = false;
let finalWaveCheatUsedThisRun = false;
let inputTrace = '';
let streak = 0;
// How many words of the run earned each rank, S to E, for the summary card.
const RANK_LETTERS = ['S', 'A', 'B', 'C', 'D', 'E'];
let rankCounts = {};
let typedBuffer = '';
let activeTarget = null;
let lastFrameTime = 0;
let rafId = null;
let isTimeoutScheduled = false;
let batterySaver = false;
const BATTERY_SAVER_STORAGE_KEY = 'keyfireBatterySaver';

let elapsed = 0;
// Real seconds of play, for timing ranks: unlike `elapsed` it never slows or stops.
let rankClock = 0;
let damageTimer = 0;
let hudTimer = 0;
let renderedHealth = null;
let enemyId = 0;
let labelMeasureGen = 0; // bumped on resize; invalidates cached label dimensions
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
let variantSchedule = new Map();
const variantHintsShown = new Set();
const casterBolts = [];
let rideCart = null;
let storyCard = null;
let helpBubble = null;
let helpBubbleAnchor = null;
let challengeCard = null;
let challengeIntro = null;
let sceneGround = null;
let sceneRockMaterial = null;
const rail = { stage: null, state: 'idle', stopIndex: -1, from: null, to: null, toIndex: 0, t: 0, duration: 1, bursts: [], encounter: null, walkPhase: 0 };
let hitStopTimer = 0;
const BOSS_STAND_Z = -15;
const ROCK_TYPE = { name: 'Rock', body: 0x8a7f72, trim: 0xb8ab98, eye: 0xffb347, scale: 1, score: 20 };
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
let weapon = null;
// The palette of the chapter on screen (chapters.js), or the one being faded to.
let activePalette = null;
let seasonEmberIntensityBase = 2.1;
let seasonFade = null;
let seasonalEffects = null;
let powerUps = null;
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
  playTalkSound,
  playStartSound,
  playPauseSound,
  playTypeSound,
  playAmbushSound,
  playWindupSound,
  playBackspaceSound,
  playMistakeSound,
  playRevealSound,
  playAppearSound,
  playDefeatSound,
  playBossDeathSound,
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
  playChestLootSound,
  playShockwaveSound,
  playShieldActivateSound,
  playShieldBlockSound,
  playBeamSound,
  playChainPrimeSound,
  playChainZapSound,
  playRailgunChargeSound,
  playRailgunShotSound,
  playTimeFreezeSound,
  playTimeResumeSound,
} = createKeyFireAudio({
  audioButton,
  initialEnabled: loadAudioSetting(),
  saveAudioSetting,
  getMode: () => mode,
  getWavePhase: () => wavePhase,
  getWaveSet: () => waveSet,
  getIsFinalWave: () => isFinalWave(),
  getHealth: () => health,
  getIsTimeFrozen: () => Boolean(powerUps) && powerUps.isTimeFrozen(),
  lowHealth: LOW_LIFE_MUSIC_THRESHOLD,
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

// Read before anything is built: battery saver also picks the coarse shapes (detail.js).
batterySaver = loadBatterySaverSetting();
document.body.classList.toggle('battery-saver', batterySaver);
createWorld();
createShaderKeepers();
createSky();
createMeteors();
createClouds();
seasonalEffects = createSeasonalEffects({
  scene,
  lightningFlash,
  getMode: () => mode,
});
seasonalEffects.create();
powerUps = createPowerUpSystem({
  getMode: () => mode,
  getEnemies: () => enemies,
  getGameTime: () => gameTimeSeconds,
  showBanner,
  powerUpBar,
  powerUpSlots,
  effectsGroup,
  playShockwaveSound,
  playShieldActivateSound,
  playShieldBlockSound,
  playGodModeOnSound,
  playGodModeOffSound,
  playStartSound,
  playChainPrimeSound,
  playRailgunChargeSound,
  playTimeFreezeSound,
  playTimeResumeSound,
  THREE,
  SPAWN_Z,
  WALL_Z
});
buildStageForWave(1);
applySeasonForWave(1, true);
createLifeMeter();

messageScore.textContent = `Best ${formatScore(bestScore)}`;
updateAudioButton();
setPauseButtonState(true, true);
updateFullscreenButton();
updatePhaseDisplay();
updateHud(true);
if (!webGLAvailable) showWebGLUnavailable();

setUpDeviceGate();

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
    // Not under the ending film: its own score has the stage until the summary.
    const filmPlaying = mode === 'ending' && gameEnding?.classList.contains('phase-cinematic');
    if ((mode === 'running' || mode === 'wave_cleared' || mode === 'gameover' || mode === 'ending') && !filmPlaying) startMusicLoop(false);
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
applyBatterySaver();
scheduleFrame();
revealWhenReady();

// The page stays behind the loading screen until the fonts, the title art and the
// first few frames of the scene are ready, so nothing pops in piece by piece.
// Slow third-party scripts (the leaderboard's) are not waited for beyond a few seconds.
function revealWhenReady() {
  const screen = document.getElementById('loadingScreen');
  if (!screen) return;
  const pageLoaded = document.readyState === 'complete'
    ? Promise.resolve()
    : new Promise(resolve => window.addEventListener('load', resolve, { once: true }));
  const fontsReady = document.fonts ? document.fonts.ready : Promise.resolve();
  const patience = new Promise(resolve => window.setTimeout(resolve, 8000));
  const frames = () => new Promise((resolve) => {
    let count = 0;
    const tick = () => (++count >= 3 ? resolve() : requestAnimationFrame(tick));
    requestAnimationFrame(tick);
  });
  Promise.race([Promise.all([pageLoaded, fontsReady]), patience])
    .then(frames)
    .then(() => {
      screen.classList.add('is-done');
      window.setTimeout(() => screen.remove(), 700);
    });
}


function toggleGodMode() {
  if (godMode) {
    godMode = false;
    playGodModeOffSound();
    document.body.classList.remove('is-god-mode');
    if (godModeBadge) { godModeBadge.remove(); godModeBadge = null; }
    weapon?.setGolden(false);
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
  godModeBadge.innerHTML = '<span class="god-mode-spark" aria-hidden="true">✦</span>GOD MODE<span class="god-mode-spark" aria-hidden="true">✦</span>';
  document.getElementById('app').append(godModeBadge);
  weapon?.setGolden(true);
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
  clearBannerTimers();
  clearEffects();
  godMode = false;
  godModeUsedThisRun = false;
  // The power-up cheat is cleared by powerUps.clear() below, so a fresh run starts
  // ranked; it only becomes unranked if the player re-enters the cheat mid-run.
  powerUpCheatUsedThisRun = false;
  finalWaveCheatUsedThisRun = false;
  inputTrace = '';
  document.body.classList.remove('is-god-mode');
  if (godModeBadge) { godModeBadge.remove(); godModeBadge = null; }
  weapon?.setGolden(false);
  score = 0;
  health = MAX_LIFE;
  renderedHealth = null;
  powerUps.clear();
  gameTimeSeconds = 0;
  document.body.classList.remove('time-frozen');
  document.body.classList.remove('chain-lightning-primed');
  document.body.classList.remove('final-wave-active');
  setFinalWaveScenery(false);
  dismissEndingSequence();
  cannonIsPrimed = false;
  waveSet = 1;
  wavePhase = 'normal';
  normalEnemyTarget = getNormalEnemyTarget(monsterLevel());
  normalEnemiesSpawned = 0;
  normalTypingCostSpawned = 0;
  prepareWavePlan();
  streak = 0;
  rankCounts = {};
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
  damageTimer = 0;
  hitStopTimer = 0;
  slowMoTimer = 0;
  kickTimer = 0;
  mode = 'running';
  startMusicLoop(!transitionFromGameOver);
  document.body.classList.add('is-running');
  messagePanel.hidden = true;
  messagePanel.classList.remove('is-cleared');
  setPauseButtonState(true, false);
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
  showMessage('PAUSED', 'Stage Paused', `Score ${formatScore(score)}`, 'Resume', 'Take a breath — press Resume when ready.');
  if (supportLink) supportLink.hidden = false;
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
  powerUps.clear();
  endStory();
  endChallenge();
  document.body.classList.remove('blizzard', 'chain-lightning-primed', 'time-frozen');
  playGameOverSound();
  startMusicLoop(false);
  setPauseButtonState(true, true);
  document.body.classList.remove('is-running');
  const isUnranked = godModeUsedThisRun || powerUpCheatUsedThisRun || finalWaveCheatUsedThisRun;
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
  if (godModeUsedThisRun || powerUpCheatUsedThisRun || finalWaveCheatUsedThisRun) return;
  leaderboard.handleScore(score);
}

function showMessage(kicker, title, scoreText, buttonText, copyText) {
  messageKicker.textContent = kicker;
  messageTitle.textContent = title;
  messageScore.textContent = scoreText;
  messageCopy.textContent = copyText;
  startButton.textContent = buttonText;
  
  if (buttonText === 'Resume') {
    startButton.title = 'Resume the paused run';
  } else if (buttonText === 'Try Again') {
    startButton.title = 'Restart the run from Stage 1';
  } else if (buttonText === 'Next Stage') {
    startButton.title = 'Proceed to the next stage';
  } else {
    startButton.title = 'Simulation requires WebGL support';
  }

  if (runGlossary) runGlossary.hidden = true;
  if (supportLink) supportLink.hidden = true;
  messagePanel.hidden = false;
}

function showWebGLUnavailable() {
  showMessage(
    'WEBGL REQUIRED',
    'Graphics Unavailable',
    'KeyFire needs browser WebGL support',
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
  // reach the power-up/typing handlers below; the cheat tolerates that noise.
  cosmicBuffer.push(event.key);
  if (cosmicBuffer.length > 10) cosmicBuffer.shift();
  if (cosmicBuffer.length === 10 && fnv1a(cosmicBuffer.join(',')) === COSMIC_WAVE_THRESHOLD) {
    cosmicBuffer = [];
    activateSkipCheat();
    return;
  }

  // During the ending film Enter skips to the summary, where the score is offered to
  // the board; only from the summary does it start a new run.
  if (event.key === 'Enter' && mode === 'ending' && gameEnding?.classList.contains('phase-cinematic')) {
    event.preventDefault();
    showEndingStatsScreen(getEndingStats(), { skipped: true });
    return;
  }

  // Enter on another focused control (sound, full screen, a link) is that control's own.
  const onOtherControl = event.target !== startButton && event.target.closest?.('button, a');

  if (event.key === 'Enter' && !onOtherControl && (mode === 'idle' || mode === 'gameover' || mode === 'ending')) {
    event.preventDefault();
    startGame();
    return;
  }

  if (event.key === 'Enter' && !onOtherControl && mode === 'wave_cleared') {
    event.preventDefault();
    advanceWaveSet();
    return;
  }

  if (event.key === 'Enter' && !onOtherControl && mode === 'paused') {
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

  // While the loot guide is open, the new power-up's own key casts it.
  if (lootGuideSlot !== -1 && mode === 'paused') {
    if (event.key === SLOT_KEYS[lootGuideSlot].arrow) {
      event.preventDefault();
      castGuidedPowerUp();
    }
    return;
  }

  if (mode !== 'running') return;

  // Leave browser/system shortcuts (Cmd+R, Ctrl+C, Alt+Left, ...) untouched.
  if (event.metaKey || event.ctrlKey || event.altKey) return;

  const slotIndex = SLOT_KEYS.findIndex(slot => slot.arrow === event.key);
  if (slotIndex !== -1) {
    event.preventDefault();
    powerUps.activatePowerUpSlot(slotIndex);
    return;
  }

  if (event.key === 'Backspace') {
    event.preventDefault();
    typedBuffer = typedBuffer.slice(0, -1);
    playBackspaceSound();
    selectTarget();
    return;
  }

  if (event.key.length === 1) {
    // Let Space activate a focused button/link instead of swallowing it.
    if (event.key === ' ' && event.target !== keyboardInput && event.target.closest && event.target.closest('button, a')) return;
    event.preventDefault();
    if (hurryStory(event.repeat ? '' : event.key)) return;
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
    for (const character of fresh) typeOrHurry(character);
    return;
  }
  composedText = '';

  if (event.inputType === 'deleteContentBackward' || event.inputType === 'deleteWordBackward') {
    event.preventDefault();
    typedBuffer = typedBuffer.slice(0, -1);
    playBackspaceSound();
    selectTarget();
    return;
  }

  if (event.data) {
    event.preventDefault();
    for (const character of event.data) {
      typeOrHurry(character);
    }
  }
}

// A key typed on a touch keyboard: it hurries a storyteller on, or else it is a letter.
function typeOrHurry(character) {
  if (!hurryStory(character)) enterCharacter(character);
}

function enterCharacter(character) {
  checkCheatCode(character);

  const letter = getInputCharacter(character);
  if (!letter) return;
  typedAttempts += 1;
  dropOrphanedTyping();

  let typed = typedBuffer + letter;
  let matches = findMatches(typed);
  // No word is locked: a letter that does not continue this word but starts another
  // switches to that one, so a rock can be dealt with in the middle of a long word.
  if (matches.length === 0 && typedBuffer) {
    typed = letter;
    matches = findMatches(typed).filter(enemy => enemy !== activeTarget);
  }

  if (matches.length > 0) {
    typedBuffer = typed;
    activeTarget = pickTarget(matches, typed);
    // A railgun shot finishes the word on its first letter.
    if (typed.length === 1 && !activeTarget._matchComplete && fireRailgun(activeTarget)) return;
    if (activeTarget._matchComplete) {
      defeatEnemy(activeTarget);
    } else {
      playTypeSound(typedBuffer.length / Math.max(1, activeTarget._matchedSearchPrompt.length));
      hitEnemyWithLetter(activeTarget);
    }
    return;
  }

  // A key that fits nothing is only a miss: the letters typed so far, and the target, stay.
  registerMistake();
}

// Spends a railgun shot on the word just started, if there is a shot and the target takes
// one: anything with a word, a boss word included, but not what a boss throws, whose
// units are only a key or three. The word scores in full but is not ranked.
function fireRailgun(target) {
  if (target.isProjectile || !powerUps.useRailgunShot()) return false;
  target.noRank = true;
  const position = target.group.position;
  spawnBeam(position);
  playRailgunShotSound(position.x);
  kickTimer = Math.max(kickTimer, 0.3);
  hitStopTimer = Math.max(hitStopTimer, 0.05);
  reusableVector.copy(position);
  reusableVector.y += 1.0 * target.group.scale.y;
  fx.burst(reusableVector, { color: RAILGUN_COLOUR, color2: 0xffffff, count: 22, speed: 6, life: 0.45, size: 0.32 });
  defeatEnemy(target);
  return true;
}

// Letters typed at a monster that has died or got away are dropped, so the next word starts clean.
function dropOrphanedTyping() {
  if (!typedBuffer) return;
  if (activeTarget && !activeTarget.dying && enemies.includes(activeTarget) && isEnemyTargetable(activeTarget)) return;
  typedBuffer = '';
  activeTarget = null;
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
    powerUps.togglePowerUpCheat();
    if (powerUps.isPowerUpCheatActive()) {
      powerUpCheatUsedThisRun = true;
    }
    inputTrace = '';
  }
}

function registerMistake() {
  // A key pressed while someone is talking, with nothing to type at, is not a miss.
  if (rail.state === 'story' && !enemies.some(enemy => !enemy.dying)) return;
  streak = 0;
  mistakeCount += 1;
  playMistakeSound();
  const missLabel = activeTarget?.label;
  if (missLabel) {
    missLabel.classList.remove('is-miss');
    void missLabel.offsetWidth;
    missLabel.classList.add('is-miss');
    window.setTimeout(() => missLabel.classList.remove('is-miss'), 220);
  }
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
  if (powerUps.isChainLightningPrimed()) {
    powerUps.clearChainLightningPrimed();
    enemy.dying = true;
    typedBuffer = '';
    activeTarget = null;
    updateHud(true);
    triggerChainLightning(enemy);
    return;
  }

  if (enemy.shield) {
    breakShield(enemy);
    return;
  }

  if (enemy.isMimic) {
    awardMimicLoot(enemy);
    spawnBeam(enemy.group.position);
    spawnDebris(enemy.group.position, enemy.type);
    removeEnemy(enemy);
    if (activeTarget === enemy) {
      activeTarget = null;
      typedBuffer = '';
    }
    updateHud(true);
    return;
  }

  const { points, healed } = awardKill(enemy);
  spawnScorePopup(points, enemy, healed);
  spawnRankPopup(enemy);
  // The final letter lands hard: a hit pause, a kick, and slow motion on the last of an ambush.
  hitStopTimer = 0.06;
  kickTimer = Math.max(kickTimer, 0.14);
  if (enemy.variant === 'splitter') spawnSplitChildren(enemy);
  const othersLeft = enemies.some(other => other !== enemy && !other.dying);
  if (!othersLeft && rail.state === 'encounter' && rail.encounter && rail.encounter.remaining <= 0) slowMoTimer = 0.45;
  if (enemy.isMedic) playHealSound(healed);
  else playDefeatSound(enemy);

  spawnBeam(enemy.group.position);
  spawnDebris(enemy.group.position, enemy.type);
  removeEnemy(enemy);
  typedBuffer = '';
  activeTarget = null;
  updateHud(true);
}


// ── Monsters with a behaviour of their own ───────────────────────────────
// A shield-bearer needs two short words: one breaks the shield, one finishes it.
// A splitter breaks into two small monsters with very short words. A caster stands
// back and lobs a bolt every few seconds until its long word is typed.
const VARIANT_HINTS = { shield: 'SHIELD: TWO WORDS!', splitter: 'IT SPLITS IN TWO!', caster: 'CASTER: STOP ITS BOLTS!' };
const CASTER_CHARGE_TIME = 1.2;
const CASTER_BOLT_FLIGHT = 1.15;
const CASTER_BOLT_DAMAGE = 1;
const SPLIT_CHILD_SCALE = 0.6;

// A word of the given typed length that no word on screen starts or is started by.
function choosePromptOfLength(min, max) {
  const liveKeys = enemies.filter(enemy => !enemy.dying).map(enemy => enemy.searchPrompt);
  const fits = (entry) => {
    const key = buildSearchPrompt(entry.term);
    if (key.length < min || key.length > max || !/^[a-z]+$/.test(key)) return false;
    return !liveKeys.some(other => other.startsWith(key) || key.startsWith(other));
  };
  // Short words are quick whatever their tier, so short picks (the cart's fliers, shields)
  // draw on the whole bank and seldom repeat; longer ones keep to the stage's pool.
  const pool = max <= 6 ? ALL_WORDS : currentKeywordPool();
  return monsterDeck.pick(pool, fits) || monsterDeck.pick(ALL_WORDS, fits) || choosePrompt();
}

function chooseVariantPrompt(variant) {
  if (variant === 'shield') return choosePromptOfLength(3, 6);
  if (variant === 'caster') return choosePromptOfLength(9, normalPromptLengthCap(monsterLevel()) + 2);
  return choosePrompt();
}

function setEnemyWord(enemy, wordData) {
  enemy.prompt = wordData.term;
  enemy.definition = wordData.definition || null;
  enemy.searchPrompt = buildSearchPrompt(wordData.term);
  enemy.altSearchPrompts = buildAltSearchPrompts(wordData.term);
  enemy._matchedSearchPrompt = null;
  enemy.lastPromptHtml = '';
  renderPrompt(enemy);
}

function setEnemyKind(enemy, kind) {
  enemy.label.dataset.kind = kind;
  enemy.kindNode.textContent = kind;
}

function dressVariant(enemy, variant) {
  enemy.variant = variant;
  setEnemyKind(enemy, variant);
  if (variant === 'shield') {
    enemy.shield = createShieldPlate();
    enemy.group.add(enemy.shield);
    enemy.extraTypingCost = 5;
  } else if (variant === 'splitter') {
    enemy.cores = createSplitterCores(enemy.type);
    enemy.group.add(enemy.cores);
    enemy.extraTypingCost = 7;
  } else if (variant === 'caster') {
    enemy.orb = createCasterOrb(enemy.type);
    enemy.group.add(enemy.orb);
    enemy.damage = 0;
  }
  if (!variantHintsShown.has(variant)) {
    variantHintsShown.add(variant);
    showBannerLater(VARIANT_HINTS[variant], 'variant-hint', 900);
  }
}

function breakShield(enemy) {
  const shield = enemy.shield;
  enemy.shield = null;
  const at = shield.getWorldPosition(new THREE.Vector3());
  fx.burst(at, { color: 0x9fe8ff, color2: 0xf2c14e, count: 22, speed: 5.2, life: 0.5, size: 0.3, gravity: 5 });
  fx.ring(at, 0x9fe8ff, { from: 0.3, to: 2.4, life: 0.4, opacity: 0.8, flat: false });
  enemy.group.remove(shield);
  disposeObject(shield);
  streak += 1;
  const points = 20 + enemy.searchPrompt.length * 10;
  score += points;
  spawnScorePopup(points, enemy);
  if (!encounteredTerms.some(t => t.term === enemy.prompt)) {
    encounteredTerms.push({ term: enemy.prompt, definition: enemy.definition, defeated: true });
  }
  hitStopTimer = 0.05;
  kickTimer = Math.max(kickTimer, 0.1);
  playChestClackSound();
  spawnBeam(at);
  // The blow drives it back a few steps, which buys the time for its second word.
  enemy.pushbackTargetZ = Math.max(-30, enemy.group.position.z - 4);
  typedBuffer = '';
  activeTarget = null;
  setEnemyKind(enemy, 'keyword');
  setEnemyWord(enemy, choosePromptOfLength(3, 7));
  enemy.firstLetterAt = undefined;
  updateHud(true);
}

function spawnSplitChildren(parent) {
  const origin = parent.group.position;
  const parentTime = railTypingEstimate(parent);
  [-1, 1].forEach((side, index) => {
    const child = spawnEnemy({ wordData: choosePromptOfLength(3, 4), type: parent.type, flier: parent.flier });
    child.scaleBoost = SPLIT_CHILD_SCALE;
    child.damage = 1;
    child.noGlossary = true;
    const from = new THREE.Vector3(origin.x, child.baseY, origin.z);
    const to = new THREE.Vector3(
      THREE.MathUtils.clamp(origin.x + side * 1.8, -5.4, 5.4),
      child.baseY,
      Math.min(origin.z - 1.2, STRIKE_Z - 4)
    );
    const walkTime = Math.max(2.2, railTypingEstimate(child) * 1.6 + index * 1.5 + parentTime * 0.2);
    child.lane = to.x;
    child.revealed = false;
    child.group.position.copy(from);
    child.group.scale.setScalar(child.type.scale * SPLIT_CHILD_SCALE);
    child.rail = {
      phase: 'entry', kind: 'cover', t: 0, entryTime: 0.4, from, to,
      speed: (STRIKE_Z - to.z) / walkTime,
    };
  });
}

function throwCasterBolt(caster) {
  const mesh = createCasterBolt(caster.type);
  if (caster.orb) caster.orb.getWorldPosition(reusableVector);
  else reusableVector.copy(caster.group.position);
  const from = reusableVector.clone();
  const to = new THREE.Vector3(from.x * 0.25, CAMERA_HEIGHT - 0.9, WALL_Z + 2);
  mesh.position.copy(from);
  effectsGroup.add(mesh);
  casterBolts.push({ mesh, from, to, t: 0, owner: caster, colour: caster.type.eye });
  playBossThrowSound(caster);
}

function removeCasterBolt(bolt, burst) {
  const index = casterBolts.indexOf(bolt);
  if (index >= 0) casterBolts.splice(index, 1);
  if (burst) fx.burst(bolt.mesh.position, { color: bolt.colour, color2: 0xffffff, count: 12, speed: 3.4, life: 0.35, size: 0.26 });
  effectsGroup.remove(bolt.mesh);
  disposeObject(bolt.mesh);
}

function clearCasterBolts() {
  for (const bolt of [...casterBolts]) removeCasterBolt(bolt, false);
}

// A bolt whose caster has been beaten fizzles in the air; the rest hit the player.
function updateCasterBolts(delta) {
  for (const bolt of [...casterBolts]) {
    if (bolt.owner.dying || !enemies.includes(bolt.owner)) {
      removeCasterBolt(bolt, true);
      continue;
    }
    bolt.t = Math.min(1, bolt.t + delta / CASTER_BOLT_FLIGHT);
    bolt.mesh.position.lerpVectors(bolt.from, bolt.to, bolt.t);
    bolt.mesh.position.y += Math.sin(bolt.t * Math.PI) * 1.6;
    bolt.mesh.rotation.x += delta * 6;
    bolt.mesh.rotation.y += delta * 4;
    if (bolt.t >= 1) {
      removeCasterBolt(bolt, false);
      strikePlayer(CASTER_BOLT_DAMAGE);
      if (mode !== 'running') return;
    }
  }
}

// Damage that arrives without a monster reaching the player.
function strikePlayer(damage) {
  if (godMode) return;
  if (powerUps.isShieldActive() && powerUps.blockLeak()) {
    powerUps.triggerShieldHitVisual();
    return;
  }
  health = Math.max(0, health - damage);
  streak = 0;
  playDamageSound();
  damageTimer = 0.32;
  damageFlash.classList.add('show');
  window.setTimeout(() => damageFlash.classList.remove('show'), 160);
  updateHud(true);
  if (health <= 0) endGame();
}

// Score is based on the characters the player actually types, not the full displayed text.
function awardKill(enemy) {
  const typedLength = Math.max(1, enemy.searchPrompt.length);
  streak += 1;
  defeatedCount += 1;
  const points = enemy.type.score + typedLength * 12 + Math.min(streak, 10) * 8;
  const healed = enemy.isMedic ? Math.min(enemy.healAmount || SMALL_HEAL, MAX_LIFE - health) : 0;
  score += points;
  if (healed > 0) health += healed;
  if (!enemy.noGlossary && !enemy.isProjectile && !encounteredTerms.some(t => t.term === enemy.prompt)) {
    encounteredTerms.push({ term: enemy.prompt, definition: enemy.definition, defeated: true });
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
    spawnDebris(new THREE.Vector3(enemy.group.position.x, 1.2, WALL_Z), enemy.type);
    removeEnemy(enemy);
    if (wasActiveTarget) typedBuffer = '';
    return;
  }

  if (enemy.isMimic) {
    // A mimic that reaches the player bites: half a heart and the streak, as a
    // monster that gets through costs, unless the shield takes the bite.
    enemy.damage = MIMIC_BITE_DAMAGE;
    playChestClackSound();
  }


  const wasActiveTarget = activeTarget === enemy;
  let wasBlocked = false;
  if (!godMode && enemy.damage > 0 && powerUps.isShieldActive()) {
    wasBlocked = powerUps.blockLeak();
  }

  if (wasBlocked) {
    powerUps.triggerShieldHitVisual();
  } else {
    if (!godMode) health = Math.max(0, health - enemy.damage);
    if (enemy.frost) frostBossLine();
    streak = 0;
    playDamageSound(enemy);
    damageTimer = 0.32;
    damageFlash.classList.add('show');
    window.setTimeout(() => damageFlash.classList.remove('show'), 160);
  }
  leakedCount += 1;
  if (!enemy.isProjectile && !enemy.noGlossary && !encounteredTerms.some(t => t.term === enemy.prompt)) {
    encounteredTerms.push({ term: enemy.prompt, definition: enemy.definition, defeated: false });
  }
  spawnDebris(new THREE.Vector3(enemy.group.position.x, 1.2, WALL_Z), enemy.type);
  removeEnemy(enemy);
  // Keep typing progress on other targets — only reset when the leaked enemy
  // was the one being typed (matches the medic/mimic leak behaviour).
  if (wasActiveTarget) typedBuffer = '';
  updateHud(true);
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

  powerUps.update(delta);

  const isTimeFrozen = (mode === 'running' && powerUps.isTimeFrozen());
  const animationDelta = isTimeFrozen ? 0 : delta;
  gameTimeSeconds += animationDelta;

  if (mode === 'running') {
    let currentDelta = animationDelta;
    document.body.classList.toggle('time-frozen', isTimeFrozen);
    // Ranks are timed in real seconds: a time freeze, a hit pause or slow motion must not flatter them.
    rankClock += delta;

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
// One boss per wave, met in the arena at the end of the route and fought in stages:
// single words, whole statements typed word by word, a shielded core word or story
// lines. Each finished stage or line takes a segment off its health bar. Between
// words the player can shatter what it throws, each rock marked with a short unit.


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

// A stage of single words, typed one at a time like monsters' words. No two start
// with the same letter, and none repeats within the fight. With a longTerm cap the
// stage ends on a long term instead: a phrase too long for any monster, typed word by word.
function chooseBossWordStage(count, used, longTerm = 0) {
  const initials = new Set();
  const entries = [];
  const fresh = (entry, key) => !used.has(entry.term) && !initials.has(key.charAt(0));
  const fits = (entry) => {
    const key = buildSearchPrompt(entry.term);
    return /^[a-z]+$/.test(entry.term) && key.length >= 4 && key.length <= 10 && fresh(entry, key);
  };
  const fitsLong = (entry) => {
    const key = buildSearchPrompt(entry.term);
    return key.length > LONGEST_MONSTER_WORD && key.length <= longTerm && fresh(entry, key);
  };
  while (entries.length < count) {
    const last = longTerm > 0 && entries.length === count - 1;
    const entry = (last && bossDeck.pick(ALL_WORDS, fitsLong))
      || monsterDeck.pick(currentKeywordPool(), fits) || monsterDeck.pick(ALL_WORDS, fits);
    if (!entry) break;
    entries.push(entry);
    used.add(entry.term);
    initials.add(buildSearchPrompt(entry.term).charAt(0));
  }
  return { kind: 'words', term: entries.map(entry => entry.term).join(' '), topic: '', entries };
}

// Where each word of a word stage sits: its entry, that entry's place in the stage and
// its first and last word. A long term is one entry of several words.
function wordStageSlots(line) {
  const slots = [];
  line.entries.forEach((entry, entryIndex) => {
    const count = lineWords(entry).length;
    const start = slots.length;
    for (let index = 0; index < count; index += 1) slots.push({ entry, entryIndex, start, end: start + count });
  });
  return slots;
}

function chooseBossStory() {
  const story = BOSS_STORIES[Math.floor(Math.random() * BOSS_STORIES.length)];
  return story.lines.map(term => ({ kind: 'story', term, topic: story.title, story: story.title }));
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
  boss.firstLetterAt = undefined;
  boss.noRank = false;
  boss.lineKind = line.kind || 'line';
  boss.label.dataset.stage = boss.lineKind;
  boss.lineWordsList = lineWords(line);
  boss.stageSlots = boss.lineKind === 'words' ? wordStageSlots(line) : null;
  boss.wordIndex = 0;
  boss.beam = null;
  setBossWord(boss);
  renderPrompt(boss);
  if (line.core) deploySatellites(boss, line.satellites);
  updateBossBeamBar(boss);
}

// ── The Dreadnought's satellites and beam ────────────────────────────────
// Satellites orbit in front of the boss, each with a short word. While any is up the
// boss is shielded: its word shows but cannot be typed. Each fires a small bolt now
// and then, which fizzles if the satellite falls first.
const SATELLITE_BOLT_EVERY = 5;

function chooseSatelliteWord() {
  const initials = new Set(enemies.filter(enemy => !enemy.dying).map(enemy => enemy.searchPrompt.charAt(0)));
  const fits = (entry) => {
    const key = buildSearchPrompt(entry.term);
    return /^[a-z]+$/.test(key) && key.length >= 3 && key.length <= 6 && !initials.has(key.charAt(0));
  };
  return monsterDeck.pick(currentKeywordPool(), fits) || monsterDeck.pick(ALL_WORDS, fits);
}

function createSatelliteMesh(colour) {
  const group = new THREE.Group();
  const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.4, 0), new THREE.MeshStandardMaterial({ color: 0xe8eef8, emissive: colour, emissiveIntensity: 0.9, roughness: 0.35, flatShading: true }));
  const panelMaterial = new THREE.MeshStandardMaterial({ color: 0x2d4f8a, emissive: 0x1a3a7a, emissiveIntensity: 0.5, roughness: 0.4, metalness: 0.3 });
  for (const side of [-1, 1]) {
    const panel = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.05, 0.42), panelMaterial);
    panel.position.x = side * 0.72;
    panel.rotation.x = 0.6;
    for (const x of [-0.24, 0, 0.24]) {
      const bus = new THREE.Mesh(new THREE.BoxGeometry(0.026, 0.065, 0.43), core.material);
      bus.position.x = x;
      panel.add(bus);
    }
    group.add(panel);
  }
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.04, 6, 24), new THREE.MeshBasicMaterial({ color: glowColor(colour, 1.4) }));
  ring.rotation.x = Math.PI / 2;
  group.add(core, ring);
  return group;
}

function deploySatellites(boss, count = 3) {
  const type = { ...ROCK_TYPE, name: 'Satellite', eye: boss.type.eye, score: 40 };
  for (let index = 0; index < count; index += 1) {
    const wordData = chooseSatelliteWord();
    if (!wordData) continue;
    const at = boss.group.position;
    const satellite = spawnEnemy({ wordData, type, customGroup: createSatelliteMesh(boss.type.eye), lane: at.x, startZ: at.z });
    satellite.satellite = true;
    satellite.damage = 0;
    satellite.group.position.copy(at);
    setEnemyKind(satellite, 'satellite');
    playAppearSound(satellite, 0.5 + index * 0.14);
    satellite.rail = { phase: 'orbit', t: 0, boss, angle: (index / count) * Math.PI * 2, boltTimer: 2.5 + index * (SATELLITE_BOLT_EVERY / count) };
  }
  boss.shielded = true;
  playRevealSound(boss);
}

function updateSatellite(satellite, delta, seconds) {
  const plan = satellite.rail;
  const boss = plan.boss;
  const position = satellite.group.position;
  plan.t = Math.min(1, plan.t + delta / 0.8);
  const ease = 1 - (1 - plan.t) ** 3;
  const angle = plan.angle + seconds * 0.55;
  const centre = boss.group.position;
  reusableVector.set(
    centre.x + Math.cos(angle) * 4.4,
    centre.y + 1.6 + Math.sin(angle * 2 + plan.angle) * 0.5,
    centre.z + 5 + Math.sin(angle) * 1.6
  );
  position.lerpVectors(centre, reusableVector, ease);
  satellite.group.rotation.y += delta * 1.2;
  satellite.group.rotation.z = Math.sin(seconds * 1.3 + plan.angle) * 0.25;
  if (satellite.stunTimer > 0 || plan.t < 1) return;
  plan.boltTimer -= delta;
  if (plan.boltTimer <= 0) {
    throwCasterBolt(satellite);
    plan.boltTimer = SATELLITE_BOLT_EVERY * (0.85 + Math.random() * 0.3);
  }
}

function updateBossShield(boss) {
  const shielded = enemies.some(enemy => enemy.satellite && !enemy.dying);
  if (!!boss.shielded === shielded && boss.label.classList.contains('is-shielded') === shielded) return;
  const wasShielded = boss.label.classList.contains('is-shielded');
  boss.shielded = shielded;
  boss.label.classList.toggle('is-shielded', shielded);
  boss.kindNode.textContent = shielded ? 'shielded' : boss.type.name;
  if (wasShielded && !shielded) {
    reusableVector.copy(boss.group.position);
    reusableVector.y += 1.5 * boss.group.scale.y;
    fx.ring(reusableVector, 0x9fe8ff, { from: 1, to: 9, life: 0.6, opacity: 0.85, flat: false });
    playChestClackSound();
  }
}

// During a story line the Dreadnought charges a beam; the line must be finished
// before the charge is full. A full charge fires and the beam starts again.
function updateBossBeam(boss, delta) {
  const plan = bossPlan(bossLevel());
  if (!boss.beam) {
    const letters = boss.prompt.replace(/[^a-z]/gi, '').length;
    boss.beam = { charge: 0, time: beamChargeTime(plan, letters), warned: false };
  }
  const beam = boss.beam;
  beam.charge = Math.min(1, beam.charge + delta / beam.time);
  boss.windup = beam.charge > 0.8 ? (beam.charge - 0.8) / 0.2 : 0;
  if (beam.charge > 0.8 && !beam.warned) {
    beam.warned = true;
    playWindupSound(THREE.MathUtils.clamp(boss.group.position.x / 9, -0.8, 0.8));
  }
  if (beam.charge >= 1) {
    fireBossBeam(boss, plan.beamDamage);
    beam.charge = 0;
    beam.warned = false;
    boss.windup = 0;
  }
  updateBossBeamBar(boss);
}

function fireBossBeam(boss, damage) {
  const start = boss.group.position.clone();
  start.y += 1.6 * boss.group.scale.y;
  const end = new THREE.Vector3(0, CAMERA_HEIGHT - 0.6, WALL_Z + 1);
  const distance = start.distanceTo(end);
  const geometry = new THREE.CylinderGeometry(0.25, 1.1, distance, 8, 1, true).rotateX(Math.PI / 2);
  const material = new THREE.MeshBasicMaterial({ color: glowColor(boss.type.eye, 1.6), transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.copy(start).lerp(end, 0.5);
  mesh.lookAt(end);
  effectsGroup.add(mesh);
  beams.push({ mesh, life: 0.4, maxLife: 0.4, kind: 'beam_core' });
  fx.ring(start, boss.type.eye, { from: 0.5, to: 5, life: 0.4, opacity: 0.8, flat: false });
  boss.lunge = 1;
  kickTimer = Math.max(kickTimer, 0.3);
  playBossImpactSound();
  strikePlayer(damage);
}

function updateBossBeamBar(boss) {
  if (!bossHpBar) return;
  const bar = bossHpBar.querySelector('.boss-beam');
  if (!bar) return;
  const charging = boss.lineKind === 'story' && !!bossPlan(bossLevel()).beamLettersPerSecond && !boss.dying;
  bar.hidden = !charging;
  bar.style.setProperty('--charge', String(boss.beam ? boss.beam.charge : 0));
  bar.classList.toggle('is-hot', !!boss.beam && boss.beam.charge > 0.8);
}

function spawnPhraseBoss() {
  const plan = bossPlan(bossLevel());
  const isFinal = isFinalWave();
  const used = new Set();
  const statements = chooseBossLines(bossLevel(), plan.finishers);
  const lines = [];
  for (const step of bossFightOrder(plan)) {
    if (step.kind === 'words') lines.push(chooseBossWordStage(step.count, used, plan.longTerm));
    else if (step.kind === 'line') lines.push(statements.shift());
    else if (step.kind === 'core') lines.push({ ...chooseBossWordStage(1, used), core: true, satellites: step.satellites });
    else if (step.kind === 'story') lines.push(...chooseBossStory());
  }
  bossWordsThisSet = lines.filter(line => line.kind !== 'words')
    .map(line => ({ term: line.term, definition: line.topic }));
  const boss = spawnEnemy({
    isBoss: true,
    phraseBoss: true,
    isClimaxBoss: isFinal,
    wordData: { term: lines[0].term, definition: lines[0].topic },
    bossType: nextBossType(),
    lane: 0,
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
  bossHpBar.innerHTML = `<span class="boss-hp-name">${escapeHtml(boss.type.name)}</span><span class="boss-hp-segments">${'<i></i>'.repeat(boss.maxHp)}</span><span class="boss-beam" hidden><i></i></span>`;
  bossHpBar.style.setProperty('--boss-accent', hexColor(boss.type.trim));
  bossHpBar.hidden = false;
  updateBossHpBar(boss);
}

function updateBossHpBar(boss) {
  if (!bossHpBar) return;
  bossHpBar.setAttribute('aria-label', `${boss.type.name}: ${boss.hp} of ${boss.maxHp} stages left`);
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
  score += 10 + boss.searchPrompt.length * 8;
  boss.flinch = 1;
  // In a word stage, the word or long term that this word completes, if it completes one.
  const slot = boss.stageSlots?.[boss.wordIndex];
  const stageWord = slot && boss.wordIndex === slot.end - 1 ? slot.entry : null;
  if (stageWord) {
    // A word in a word stage lands like a kill: a beam, a piece knocked off, a flinch.
    const letters = buildSearchPrompt(stageWord.term).length;
    score += 30 + letters * 6;
    if (!encounteredTerms.some(t => t.term === stageWord.term)) {
      encounteredTerms.push({ term: stageWord.term, definition: stageWord.definition || null, defeated: true });
    }
    spawnBeam(boss.group.position);
    reusableVector.copy(boss.group.position);
    reusableVector.x += (Math.random() - 0.5) * 2 * boss.group.scale.x;
    reusableVector.y += (0.8 + Math.random() * 1.6) * boss.group.scale.y;
    spawnDebris(reusableVector, boss.type);
    boss.hurt = Math.max(boss.hurt, 0.45);
    hitStopTimer = 0.04;
    kickTimer = Math.max(kickTimer, 0.14);
    // Each word of a word stage is ranked like a monster's word, a long term as one.
    spawnRankPopup(boss, letters - 1);
  }
  boss.wordIndex += 1;
  if (boss.wordIndex < boss.lineWordsList.length) {
    setBossWord(boss);
    if (stageWord) playDefeatSound(boss);
    else playTypeSound(1);
    hitEnemyWithLetter(boss);
    // The next word or long term of a word stage is timed from its own first letter.
    if (stageWord) {
      boss.firstLetterAt = undefined;
      boss.noRank = false;
    }
    updateHud(true);
    return true;
  }

  // A whole line: a heavy hit and a segment off the health bar.
  let lost = 1;
  if (powerUps.isChainLightningPrimed()) {
    // Chain lightning doubles the blow and clears the rocks in the air.
    powerUps.clearChainLightningPrimed();
    if (boss.hp > 2) lost = 2;
    flashLightning();
    for (const rock of enemies.filter(other => other.isProjectile && !other.dying)) shatterRock(rock, false);
  }
  boss.hp = Math.max(0, boss.hp - lost);
  boss.lineIndex += lost;
  if (!stageWord) {
    // A whole statement or story line is ranked as one, from its first letter to its last.
    spawnRankPopup(boss, boss.prompt.replace(/[^a-z]/gi, '').length - 1);
    score += boss.prompt.replace(/[^a-z]/gi, '').length * 15;
    if (!encounteredTerms.some(t => t.term === boss.prompt)) {
      encounteredTerms.push({ term: boss.prompt, definition: boss.definition, defeated: true });
    }
  }
  updateBossHpBar(boss);
  spawnBeam(boss.group.position);
  reusableVector.copy(boss.group.position);
  reusableVector.y += 1.5 * boss.group.scale.y;
  fx.burst(reusableVector, { color: boss.type.eye, color2: 0xffffff, count: 28, speed: 6, life: 0.7, size: 0.4 });
  playBossImpactSound(boss);
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
    const finished = boss.bossLines[boss.lineIndex - lost];
    const next = boss.bossLines[boss.lineIndex];
    const newStage = finished.kind !== next.kind || !!finished.core !== !!next.core;
    if (boss.isClimaxBoss && newStage) {
      // At each change of weapon the last boss names the next one, and a big healer
      // crosses the arena (below): typing it gives back a heart.
      if (next.kind === 'story') {
        showBanner(`THE TALE OF ${next.story.toUpperCase()}`);
        showBannerLater('BEAT THE BEAM!', 'variant-hint', 1600);
      } else if (next.core) showBanner('BREAK THE SATELLITES!', 'variant-hint');
      else if (next.kind !== 'words') showBanner('COMETS SPLIT IF YOU WAIT!', 'variant-hint');
    } else if (stageWord && next.kind === 'story') showBanner(`THE TALE OF ${next.story.toUpperCase()}`);
    // Only the turn to the finishing blow is announced.
    else if (stageWord && next.kind !== 'words') showBanner('FINISH IT!');
    startBossLine(boss);
    if (boss.isClimaxBoss && newStage && spawnBossHealer(boss, true)) boss.healerStage = bossStageOf(boss);
    updateHud(true);
    return true;
  }
  // Fallen: its last stand follows (startBossDeath), in slow motion.
  boss.searchPrompt = boss.prompt.replace(/[^a-z]/gi, '').toLowerCase().slice(0, 12);
  slowMoTimer = 0.9;
  hideBossHpBar();
  for (const rock of enemies.filter(other => other.isProjectile && !other.dying)) shatterRock(rock, false);
  return false;
}

// Rocks carry a short unit; none may start with the same letter as another rock or as
// any word the boss has still to show, so the first key always picks one target.
function chooseRockWord(boss, { minLength = 1, maxLength = Infinity } = {}) {
  const taken = new Set(enemies.filter(other => !other.dying && (other.isProjectile || other.satellite || other.isMedic))
    .map(other => other.searchPrompt.charAt(0)));
  for (const word of boss.lineWordsList.slice(boss.wordIndex)) taken.add(buildSearchPrompt(word).charAt(0));
  const free = ROCK_UNITS.filter((entry) => {
    const key = buildSearchPrompt(entry.term);
    return key.length >= minLength && key.length <= maxLength && !taken.has(key.charAt(0));
  });
  return free.length > 0 ? free[Math.floor(Math.random() * free.length)] : null;
}

// Each boss attacks in its own way. rock: one rock at a time. volley: a rock from each
// hand. summon: every other attack raises an imp from the ground instead. frost: shards
// of ice that also frost over the boss's line for a few seconds if they land.
// dreadnought: a weapon for each stage of the fight (see dreadnoughtAttack).
const BOSS_ATTACKS = {
  'Verdant Colossus': 'rock',
  'Crimson Bulwark': 'volley',
  'Magma Sovereign': 'summon',
  'Glacial Titan': 'frost',
  'Stellar Dreadnought': 'dreadnought',
};
const BOSS_FROST_TIME = 3;
const SUMMON_TYPE_NAME = 'Cinder Imp';

function bossAttack(boss) {
  const style = BOSS_ATTACKS[boss.type.name] || 'rock';
  const inFlight = enemies.filter(enemy => enemy.isProjectile && !enemy.dying).length;
  boss.attackCount = (boss.attackCount || 0) + 1;
  let gapScale = 1;
  if (style === 'volley') {
    if (inFlight > 0) return 0.5;
    throwRock(boss, { side: -1 });
    throwRock(boss, { side: 1, flightScale: 1.3 });
    gapScale = 1.4;
  } else if (style === 'dreadnought') {
    const result = dreadnoughtAttack(boss, inFlight);
    if (result.wait !== undefined) return result.wait;
    gapScale = result.gapScale;
  } else if (style === 'summon' && boss.attackCount % 2 === 0 && !enemies.some(enemy => enemy.summoned && !enemy.dying)) {
    summonMinion(boss);
    gapScale = 1.2;
  } else {
    if (inFlight >= 2) return 1;
    throwRock(boss, { frost: style === 'frost' });
  }
  boss.lunge = 1;
  reusableVector.set(boss.group.position.x, 0.14, boss.group.position.z);
  fx.ring(reusableVector, ROCK_TYPE.eye, { from: 0.4, to: 3.4, life: 0.4, opacity: 0.6 });
  return gapScale;
}

// A small monster with a short word, raised from the ground in front of the boss.
function summonMinion(boss) {
  const initials = new Set(boss.lineWordsList.map(word => buildSearchPrompt(word).charAt(0)));
  const liveKeys = enemies.filter(enemy => !enemy.dying).map(enemy => enemy.searchPrompt);
  for (const healer of enemies.filter(enemy => enemy.isMedic && !enemy.dying)) initials.add(healer.searchPrompt.charAt(0));
  const fits = (entry) => {
    const key = buildSearchPrompt(entry.term);
    if (key.length < 3 || key.length > 6 || !/^[a-z]+$/.test(key) || initials.has(key.charAt(0))) return false;
    return !liveKeys.some(other => other.startsWith(key) || key.startsWith(other));
  };
  const wordData = monsterDeck.pick(ALL_WORDS, fits);
  if (!wordData) {
    throwRock(boss);
    return;
  }
  const side = boss.group.position.x > 0 ? -1 : 1;
  const spot = { kind: 'ground', x: THREE.MathUtils.clamp(boss.group.position.x + side * 3.2, -5, 5), z: boss.group.position.z + 4 };
  const minion = spawnEnemy({ wordData, type: ENEMY_TYPES.find(type => type.name === SUMMON_TYPE_NAME), railSpot: spot });
  minion.summoned = true;
  minion.noGlossary = true;
  minion.damage = 1;
  playRevealSound(boss);
}

function frostBossLine() {
  const boss = enemies.find(enemy => enemy.phraseBoss && !enemy.dying);
  if (!boss) return;
  boss.frostTimer = BOSS_FROST_TIME;
  boss.label.classList.add('is-frosted');
}

// The Stellar Dreadnought changes weapons with each stage of its fight: comets while
// its words are typed, comets that split while its statement is, a shield of
// satellites round its core word, and a charging beam during its story, with a
// plain comet now and then, one at a time.
function dreadnoughtAttack(boss, inFlight) {
  const line = boss.bossLines[boss.lineIndex] || {};
  if (line.core || line.kind === 'story') {
    if (inFlight >= 1) return { wait: 1 };
    throwRock(boss, { comet: true });
    return { gapScale: 1.5 };
  }
  if (inFlight >= 2) return { wait: 1 };
  const split = line.kind !== 'words' && boss.attackCount % 2 === 0;
  throwRock(boss, { comet: true, split });
  return { gapScale: 1 };
}

function throwRock(boss, { side = Math.random() < 0.5 ? -1 : 1, flightScale = 1, frost = false, comet = false, split = false } = {}) {
  const wordData = chooseRockWord(boss, split ? { minLength: 2 } : {});
  if (!wordData) return null;
  const start = boss.group.position.clone().add(new THREE.Vector3(side * 1.6, 2.6 * boss.group.scale.y, 0.6));
  const end = new THREE.Vector3(side * (1.2 + Math.random() * 1.8), 2.2, WALL_Z - 0.6);
  const rock = launchRock({ start, end, wordData, flight: bossPlan(bossLevel()).rockFlight * flightScale, frost, comet, split });
  playBossThrowSound(boss);
  return rock;
}

function createRockMesh({ frost, comet, split, small }) {
  let mesh;
  if (frost) {
    mesh = new THREE.Mesh(new THREE.OctahedronGeometry(0.5, 0), new THREE.MeshStandardMaterial({ color: 0xcfefff, emissive: 0x4aa8d8, emissiveIntensity: 0.7, roughness: 0.25, flatShading: true }));
    mesh.scale.set(0.7, 1.7, 0.7);
  } else if (comet) {
    const colour = split ? 0xffc27a : 0xdfeaff;
    const glow = split ? 0xff7a2a : 0x6fb8ff;
    mesh = new THREE.Mesh(new THREE.IcosahedronGeometry(0.5, 0), new THREE.MeshStandardMaterial({ color: colour, emissive: glow, emissiveIntensity: 0.85, roughness: 0.35, flatShading: true }));
    mesh.scale.setScalar(split ? 1.3 : small ? 0.62 : 1);
  } else {
    mesh = new THREE.Mesh(new THREE.DodecahedronGeometry(0.55, 0), new THREE.MeshStandardMaterial({ color: ROCK_TYPE.body, roughness: 1, flatShading: true }));
  }
  mesh.castShadow = true;
  const group = new THREE.Group();
  group.add(mesh);
  return group;
}

function launchRock({ start, end, wordData, flight, frost = false, comet = false, split = false, small = false }) {
  const plan = bossPlan(bossLevel());
  const group = createRockMesh({ frost, comet, split, small });
  const rock = spawnEnemy({ isProjectile: true, wordData, type: ROCK_TYPE, customGroup: group, lane: start.x, startZ: start.z });
  rock.isProjectile = true;
  rock.damage = plan.rockDamage;
  rock.baseY = start.y;
  rock.frost = frost;
  rock.split = split;
  if (frost) rock.kindNode.textContent = 'ice';
  else if (comet) rock.kindNode.textContent = split ? 'splitter' : 'comet';
  rock.rail = { phase: 'projectile', t: 0, flight, from: start.clone(), to: end, spin: new THREE.Vector3(Math.random() * 4, Math.random() * 4, Math.random() * 4) };
  rock.group.position.copy(start);
  return rock;
}

// A splitting comet left alone until halfway breaks into two small comets, each
// marked with a one-letter unit, which finish the flight a little more slowly.
function splitComet(rock) {
  const boss = enemies.find(enemy => enemy.phraseBoss && !enemy.dying);
  const at = rock.group.position.clone();
  const remaining = (1 - rock.rail.t) * rock.rail.flight;
  const wasTarget = activeTarget === rock;
  fx.burst(at, { color: 0xff9a4a, color2: 0xffffff, count: 18, speed: 4.6, life: 0.45, size: 0.3 });
  removeEnemy(rock);
  if (wasTarget) {
    typedBuffer = '';
    activeTarget = null;
  }
  if (boss) {
    for (const side of [-1, 1]) {
      const wordData = chooseRockWord(boss, { maxLength: 1 });
      if (!wordData) continue;
      const end = new THREE.Vector3(side * (1.4 + Math.random() * 1.6), 2.2, WALL_Z - 0.6);
      const piece = launchRock({ start: at.clone(), end, wordData, flight: Math.max(1.6, remaining * 1.25), comet: true, small: true });
      piece.rail.arc = 1.2;
    }
    playBossThrowSound(boss);
  }
}

function shatterRock(rock, scored = true) {
  if (scored) {
    streak += 1;
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
}

function updateBossFight(delta) {
  if (!bossFight) {
    spawnPhraseBoss();
    bossFight = { clearTimer: 0 };
    return;
  }
  if (bossDeath) {
    updateBossDeath(delta);
    return;
  }
  if (enemies.some(enemy => !enemy.dying)) return;
  bossFight.clearTimer += delta;
  if (bossFight.clearTimer < 1.4) return;
  bossFight = null;
  if (isFinalWave()) {
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
  if (boss.frostTimer > 0) {
    boss.frostTimer -= delta;
    if (boss.frostTimer <= 0) boss.label.classList.remove('is-frosted');
  }

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
  if (boss.lineKind === 'words' || boss.shielded) updateBossShield(boss);
  updateBossHealer(boss, delta);
  if (stunned || boss.stagger > 0) return;
  // During its story the Dreadnought charges its beam and throws comets as well.
  const racing = boss.lineKind === 'story' && !!bossPlan(bossLevel()).beamLettersPerSecond;
  if (racing) updateBossBeam(boss, delta);
  const beamWindup = racing ? boss.windup : 0;

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
  boss.windup = Math.max(beamWindup, boss.attackTimer <= BOSS_WINDUP_TIME ? THREE.MathUtils.clamp(1 - boss.attackTimer / BOSS_WINDUP_TIME, 0, 1) : 0);
  if (boss.attackTimer <= 0) {
    boss.windup = beamWindup;
    const gapScale = bossAttack(boss);
    boss.attackTimer = bossPlan(bossLevel()).attackGap * gapScale * (0.85 + Math.random() * 0.3);
  }
}

// Once in each stage of a boss fight, a little while after the player has lost life,
// a small healer crosses the arena in front of the boss.
const BOSS_HEALER_DELAY = 2.5;
function updateBossHealer(boss, delta) {
  if (boss.dying || boss.healerStage === bossStageOf(boss)) return;
  if (health >= MAX_LIFE || enemies.some(enemy => enemy.isMedic && !enemy.dying)) {
    boss.healerWait = BOSS_HEALER_DELAY;
    return;
  }
  boss.healerWait = (boss.healerWait ?? BOSS_HEALER_DELAY) - delta;
  if (boss.healerWait > 0) return;
  if (spawnBossHealer(boss, false)) boss.healerStage = bossStageOf(boss);
}

// The stage of the fight the boss's current line belongs to: each word stage is a stage
// of its own; a run of statements or of story lines is one stage.
function bossStageOf(boss) {
  let stage = 0;
  for (let index = 1; index <= boss.lineIndex && index < boss.bossLines.length; index += 1) {
    const before = boss.bossLines[index - 1];
    const line = boss.bossLines[index];
    if (line.kind === 'words' || before.kind !== line.kind || !!before.core !== !!line.core) stage += 1;
  }
  return stage;
}

// A healer runs in from the side away from the boss and across the arena, a little in
// front of it. Its word starts with none of the letters that start the words of the
// boss's line and the next, or the other targets, so the first key picks one target.
function spawnBossHealer(boss, big) {
  const initials = new Set(boss.lineWordsList.map(word => buildSearchPrompt(word).charAt(0)));
  const nextLine = boss.bossLines[boss.lineIndex + 1];
  if (nextLine) for (const word of lineWords(nextLine)) initials.add(buildSearchPrompt(word).charAt(0));
  const liveKeys = enemies.filter(enemy => !enemy.dying).map(enemy => enemy.searchPrompt);
  for (const key of liveKeys) initials.add(key.charAt(0));
  const avoid = (entry) => {
    const key = buildSearchPrompt(entry.term);
    return !/^[a-z ]+$/.test(key) || initials.has(key.charAt(0));
  };
  const wordData = chooseMedicPrompt({ big, avoid });
  if (!wordData || avoid(wordData)) return null;
  const side = boss.group.position.x > 0 ? -1 : 1;
  const z = THREE.MathUtils.clamp(boss.standZ + 5, -14, -5);
  const spot = { kind: 'cover', x: side * 6, z, hideX: side * 10, hideZ: z };
  const healer = spawnEnemy({ isMedic: true, bigMedic: big, wordData, railSpot: spot });
  healer.bossHealer = true;
  return healer;
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
  boss.label.classList.remove('is-frosted');
  for (const minion of enemies.filter(enemy => (enemy.summoned || enemy.bossHealer) && !enemy.dying)) {
    spawnDebris(minion.group.position, minion.type);
    removeEnemy(minion);
  }
  typedBuffer = '';
  activeTarget = null;
  playBossImpactSound();
  kickTimer = Math.max(kickTimer, 0.5);
  hitStopTimer = 0.14;
  updateHud(true);
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
  playBossDeathSound(boss);
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
  if (rock.split && t >= 0.5 && !rock.dying) {
    splitComet(rock);
    return true;
  }
  rock.group.position.lerpVectors(plan.from, plan.to, t);
  rock.group.position.y += Math.sin(t * Math.PI) * (plan.arc ?? 2.4);
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
  bossFight = null;
  bossDeath = null;
  hideBossHpBar();
  rail.bursts = planBursts(wave);
  const chapter = chapterForWave(wave);
  // The bridge fight and the cart ride take one of the wave's ambushes for themselves.
  rail.setPiece = chapter.setPiece || null;
  rail.setPieceDone = false;
  rail.setPieceCount = 0;
  rail.ride = null;
  if ((rail.setPiece === 'bridge' || rail.setPiece === 'cart') && rail.bursts.length >= 3) rail.setPieceCount = rail.bursts.pop();
  document.body.classList.remove('blizzard');
  if (rideCart) rideCart.group.visible = false;
  // One stop of the wave has no ambush: someone waits there with the story.
  endStory();
  rail.storyIndex = Math.max(1, Math.min(2, rail.bursts.length - 1));
  rail.bursts.splice(rail.storyIndex, 0, 0);
  // The night sky trades its last ambush for two challenges, swarms of bats: one at its
  // second stop and one at a stop of its own, the last before the boss.
  endChallenge();
  rail.challengeStops = [];
  if (rail.setPiece === 'flight' && rail.bursts.length >= 4) {
    rail.bursts.pop();
    rail.bursts.splice(1, 0, 0);
    rail.storyIndex += 1;
    rail.bursts.push(0);
    rail.challengeStops = [1, rail.bursts.length - 1];
  }
  // The wave's last ambush keeps going until all its monsters are out.
  rail.lastAmbush = rail.bursts.findLastIndex((count, index) => index !== rail.storyIndex && !rail.challengeStops.includes(index));
  rail.seed = Math.floor(Math.random() * 1e6) + wave;
  mountStage(chapter);
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

// Builds the stage for rail.seed and hangs it from the rig, in place of the last one.
function mountStage(chapter) {
  if (rail.stage) rail.stage.dispose();
  rail.stage = createStage({
    seed: rail.seed,
    burstCount: Math.max(1, rail.bursts.length),
    materials: { trunk: sceneTrunkMaterial, leaves: sceneLeafMaterials, rock: sceneRockMaterial },
    kit: chapter.kit,
  });
  stageRig.add(rail.stage.group);
  sceneGround = rail.stage.terrain;
}

// Battery saver swaps the fine shapes for the coarse ones (detail.js). The stage is built
// again from the same seed, so the place and the route stay as they are, even in the
// middle of a run, and only the facets change. Monsters on screen keep their shape.
function rebuildSceneryDetail() {
  const fromIndex = rail.stage.stops.indexOf(rail.from);
  const toIndex = rail.stage.stops.indexOf(rail.to);
  mountStage(chapterForWave(waveSet));
  if (fromIndex >= 0) rail.from = rail.stage.stops[fromIndex];
  if (toIndex >= 0) rail.to = rail.stage.stops[toIndex];
  recolorGround(seasonFade ? seasonFade.palette : currentPalette());
  for (const cloud of clouds) {
    const fresh = createLowPolyCloud(cloud.weatherOnly ? weatherCloudMaterial : baseCloudMaterial, cloud.template);
    fresh.position.copy(cloud.group.position);
    fresh.scale.copy(cloud.group.scale);
    fresh.visible = cloud.group.visible;
    scene.remove(cloud.group);
    cloud.group.traverse((child) => { if (child.isMesh) child.geometry.dispose(); });
    scene.add(fresh);
    cloud.group = fresh;
  }
  // Nothing is drawn while paused, so show the change now.
  if (mode === 'paused') visuals.render(0, { measure: false });
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
    if (updateSetPieceTravel(pose, delta)) return;
    if (rail.t >= 1) arriveAtStop();
    return;
  }
  if (rail.state === 'encounter') updateEncounter(delta);
  if (rail.state === 'story') updateStory(delta);
  if (rail.state === 'challenge') updateChallenge(delta);
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

// ── Set-pieces ───────────────────────────────────────────────────────────
// Each chapter after the meadow has a moment of its own (chapters.js): a fight on the
// river wood's bridge, a cart ride into the mine, a blizzard on the frozen lake, and
// in the night sky every monster flies.
const RIDE_SPEED = 7;
const BRIDGE_MONSTERS = 4;
const RIDE_START_Z = -32;
const BLIZZARD_VEIL_Z = -6.5;
const BLIZZARD_STOP = 1;
const FLIER_Y = 1.15;
// Fliers keep right of this, clear of the readouts in the top left corner.
const FLIER_MIN_X = -1.4;

// Called while the camera travels. Returns true when a set-piece has stopped the walk.
function updateSetPieceTravel(pose, delta) {
  if (rail.setPiece === 'bridge') {
    const crossing = rail.stage.crossing;
    if (rail.setPieceDone || rail.setPieceCount <= 0 || !crossing || pose.arc < crossing.arc - 5) return false;
    rail.setPieceDone = true;
    startBridgeFight();
    return true;
  }
  if (rail.setPiece !== 'cart') return false;
  if (!rail.ride) {
    if (rail.setPieceDone || rail.setPieceCount <= 0 || !rail.lateDone) return false;
    rail.setPieceDone = true;
    const distance = rail.to.arc - (rail.from ? rail.from.arc : rail.stage.startArc);
    rail.duration = distance / RIDE_SPEED;
    const count = rail.setPieceCount + 2;
    rail.ride = { left: count, gap: ((1 - rail.t) * rail.duration * 0.78) / count, timer: 1.2 };
    rideCart.group.visible = true;
    showBanner('MINE CART!');
  }
  // The cart rattles along and never stops; what flies at it must be typed in passing.
  rail.walkPhase += delta * 9;
  rideCart.update(rail.walkPhase);
  kickTimer = Math.max(kickTimer, 0.05);
  rail.ride.timer -= delta;
  if (rail.ride.left > 0 && rail.ride.timer <= 0) {
    rail.ride.left -= 1;
    rail.ride.timer = rail.ride.gap;
    spawnRideMonster();
  }
  return false;
}

// Monsters climb over the rails from both sides while the camera stands on the bridge.
function startBridgeFight() {
  const spots = [];
  for (let index = 0; index < 6; index += 1) spots.push({ kind: 'climb', x: (index % 2 ? 1 : -1) * 3.6, z: -2 - index * 1.3 });
  // Kept small and steady: a few plain monsters, never more than two at once.
  startEncounter({ spots, isBoss: false, resume: true, minionsOnly: true, maxLive: 2, plain: true }, Math.min(BRIDGE_MONSTERS, rail.setPieceCount), false);
  showBanner('HOLD THE BRIDGE!');
}

// A cave flier with a short word, rushing at the cart from far down the tunnel.
function spawnRideMonster() {
  const enemy = spawnEnemy({ wordData: choosePromptOfLength(3, 5), type: ENEMY_TYPES.find(type => type.name === 'Glowmite'), flier: true });
  const x = Math.random() < 0.4 ? -(0.6 + Math.random() * 0.8) : 1.2 + Math.random() * 2.6;
  enemy.baseY = GROUND_ENEMY_Y + 1.1 + Math.random() * 1.2;
  enemy.lane = x;
  enemy.damage = 1;
  const flight = Math.max(2.8, railTypingEstimate(enemy) * 1.6);
  enemy.rail = { phase: 'ride', t: 0, to: new THREE.Vector3(x, enemy.baseY, RIDE_START_Z), speed: (WALL_Z - RIDE_START_Z) / flight };
  enemy.group.position.copy(enemy.rail.to);
  normalEnemiesSpawned += 1;
  registerNormalTypingCost(enemy);
  playAppearSound(enemy);
}

function beginBlizzard() {
  rail.encounter.blizzard = true;
  document.body.classList.add('blizzard');
  showBanner('BLIZZARD!', 'variant-hint');
}

function arriveAtStop() {
  rail.stopIndex = rail.toIndex;
  rail.ride = null;
  if (rideCart) rideCart.group.visible = false;
  const stop = rail.to;
  if (stop.isBoss) {
    if (wavePhase === 'normal') startBossPhase();
    rail.state = 'boss';
    return;
  }
  if (rail.stopIndex === rail.storyIndex) {
    startStory();
    return;
  }
  if (rail.challengeStops.includes(rail.stopIndex)) {
    startChallenge();
    return;
  }
  // The wave can run out of monsters early (its typing budget). A stop left with
  // nothing to send gets a breather instead: one or two easy monsters and a chest.
  if (isNormalWaveComplete() && !shouldSpawnMedic() && !shouldSpawnMimic()) {
    startEncounter(stop, 0, false);
    rail.encounter.bonus = Math.random() < 0.5 ? ['easy', 'chest'] : ['easy', 'chest', 'easy'];
    return;
  }
  startEncounter(stop, rail.bursts[rail.stopIndex] || 0, rail.stopIndex >= rail.lastAmbush);
  // The blizzard is the second ambush, whichever stop that falls on.
  if (rail.setPiece === 'blizzard' && rail.stopIndex === (rail.storyIndex === BLIZZARD_STOP ? BLIZZARD_STOP + 1 : BLIZZARD_STOP)) beginBlizzard();
}

// ── The story ────────────────────────────────────────────────────────────
// At one stop in each wave someone is waiting (story.js). In the meadow they simply
// talk. Later a myth holds them, and its word must be typed to set them free; then
// they talk.
const STORY_SPOT = new THREE.Vector3(2.3, 0, -4.2);
const STORY_LETTERS_PER_SECOND = 20;
// Done with talking, the storyteller turns and runs off to the right, a little toward
// the camera so the scenery beside the route does not hide them, until out of view.
const STORY_RUN_DIRECTION = Math.atan2(1, 0.45);
const STORY_RUN_TIME = 2;

// A held storyteller cries for help above their head, rather than in the card, so the
// player can type at the myth at once without missing a line of the story.
function placeHelpBubble(npc) {
  if (!helpBubble) {
    helpBubble = document.createElement('div');
    helpBubble.className = 'help-bubble';
    helpBubble.textContent = 'Help! Help! Help!';
    document.getElementById('app').append(helpBubble);
  }
  reusableVector.copy(npc.position);
  reusableVector.y += 3.1;
  reusableVector.project(camera);
  // updateLabels places the bubble, among the word cards so none covers another.
  helpBubbleAnchor = {
    x: (reusableVector.x * 0.5 + 0.5) * window.innerWidth,
    y: (-reusableVector.y * 0.5 + 0.5) * window.innerHeight,
  };
  helpBubble.hidden = false;
}

function hideHelpBubble() {
  if (helpBubble) helpBubble.hidden = true;
}

function showStoryLine(name, text) {
  if (!storyCard) {
    storyCard = document.createElement('div');
    storyCard.className = 'story-card';
    storyCard.innerHTML = '<span class="story-name"></span><span class="story-line"></span>'
      + '<span class="story-next" aria-hidden="true"><kbd>Space</kbd></span>'
      + '<button class="story-skip" type="button" title="Skip the story">Skip</button>';
    storyCard.querySelector('.story-skip').addEventListener('click', () => {
      skipStory();
      focusKeyboard();
    });
    document.getElementById('app').append(storyCard);
  }
  storyCard.querySelector('.story-name').textContent = name;
  // The line is typed out letter by letter (updateStoryText); it starts empty.
  storyCard.querySelector('.story-line').textContent = '';
  storyCard.classList.remove('is-done');
  // The story can be skipped once nothing holds the storyteller.
  storyCard.querySelector('.story-skip').hidden = !!(rail.story && rail.story.held);
  storyCard.hidden = false;
  if (rail.story) Object.assign(rail.story, { text, shown: 0, blip: 0 });
  // Restart the entrance animation for each new line.
  storyCard.classList.remove('is-in');
  void storyCard.offsetWidth;
  storyCard.classList.add('is-in');
}

function startStory() {
  const beat = storyBeatForWave(waveSet);
  const npc = createStoryteller(beat);
  npc.position.copy(STORY_SPOT);
  npc.position.y = GROUND_ENEMY_Y;
  npc.scale.setScalar(0.01);
  enemyGroup.add(npc);
  rail.state = 'story';
  rail.story = { beat, npc, line: -1, age: 0, guard: null, held: !!beat.held, leaving: 0 };
  if (beat.held) {
    // The myth that holds them: it stands its ground and does no harm, but will not leave.
    const guard = spawnEnemy({ wordData: choosePromptOfLength(4, 8), type: ENEMY_TYPES.find(type => type.name === 'Bog Shambler') });
    const at = new THREE.Vector3(STORY_SPOT.x - 1.9, guard.baseY, STORY_SPOT.z - 0.6);
    guard.damage = 0;
    guard.lane = at.x;
    guard.rail = { phase: 'guard', t: 0, to: at };
    guard.group.position.copy(at);
    setEnemyKind(guard, 'myth');
    playAppearSound(guard, 0.3);
    rail.story.guard = guard;
    npc.userData.parts.dome.visible = true;
    placeHelpBubble(npc);
  }
}


function advanceStoryLine() {
  const story = rail.story;
  story.line += 1;
  if (story.line >= story.beat.lines.length) {
    story.leaving = 0.01;
    if (storyCard) storyCard.hidden = true;
    return;
  }
  showStoryLine(story.beat.name, story.beat.lines[story.line]);
}

function skipStory() {
  const story = rail.story;
  if (rail.state !== 'story' || !story || story.held || story.leaving > 0) return;
  story.leaving = 0.01;
  if (storyCard) storyCard.hidden = true;
}

// Letters appear one at a time, with a blip of the speaker's voice for every other one.
function updateStoryText(delta) {
  const story = rail.story;
  if (!story.text || story.shown >= story.text.length) return false;
  const before = Math.floor(story.shown);
  story.shown = Math.min(story.text.length, story.shown + delta * STORY_LETTERS_PER_SECOND);
  const now = Math.floor(story.shown);
  if (now === before) return true;
  storyCard.querySelector('.story-line').textContent = story.text.slice(0, now);
  // A finished line waits for Space, and says so.
  if (now >= story.text.length) storyCard.classList.add('is-done');
  story.blip += now - before;
  if (story.blip >= 2 && /\S/.test(story.text.charAt(now - 1))) {
    story.blip = 0;
    playTalkSound(story.beat.voice);
  }
  return story.shown < story.text.length;
}

function updateStory(delta) {
  const story = rail.story;
  if (!story) return;
  story.age += delta;
  const { head, arms, dome } = story.npc.userData.parts;
  if (story.leaving > 0) {
    runStorytellerOff(story, delta);
    return;
  }
  const grow = Math.min(1, story.age / 0.35);
  story.npc.scale.setScalar(Math.max(0.01, 1.26 * (1 - (1 - grow) ** 3)));
  story.npc.rotation.y = Math.atan2(-story.npc.position.x, CAMERA_DISTANCE - story.npc.position.z);
  story.npc.position.y = GROUND_ENEMY_Y + Math.abs(Math.sin(story.age * (story.held ? 9 : 3))) * (story.held ? 0.05 : 0.03);
  head.rotation.z = Math.sin(story.age * 2.2) * 0.08;
  for (const arm of arms) {
    // Held: arms up and shaking. Free: one arm waves while they talk.
    const wave = story.held ? 2.6 + Math.sin(story.age * 14) * 0.2 : arm.userData.side > 0 ? 0.5 + Math.sin(story.age * 5) * 0.5 : 0.1;
    arm.rotation.z = arm.userData.side * wave;
  }
  settleLantern(story.npc.userData.parts);
  dome.rotation.y = story.age * 1.4;
  updateStoryText(delta);

  if (story.held) {
    if (story.guard && !story.guard.dying && enemies.includes(story.guard)) {
      placeHelpBubble(story.npc);
      return;
    }
    // Freed: the dome bursts, the player is thanked with a heart, and the tale begins.
    story.held = false;
    story.guard = null;
    hideHelpBubble();
    dome.visible = false;
    reusableVector.copy(story.npc.position);
    reusableVector.y += 1;
    fx.burst(reusableVector, { color: 0x9a5cff, color2: 0xffffff, count: 26, speed: 5, life: 0.6, size: 0.3 });
    fx.ring(reusableVector, 0x9a5cff, { from: 0.4, to: 3, life: 0.45, opacity: 0.8, flat: false });
    advanceStoryLine();
    return;
  }
  if (story.line < 0 && story.age > 0.5) advanceStoryLine();
}

// The storyteller turns away and runs off to the right, arms pumping, picking up speed;
// once they are out of view the camera walks on.
function runStorytellerOff(story, delta) {
  story.leaving += delta;
  const { npc } = story;
  const { arms } = npc.userData.parts;
  if (story.runFrom === undefined) story.runFrom = npc.rotation.y;
  const turn = Math.min(1, story.leaving / 0.18);
  npc.rotation.y = THREE.MathUtils.lerp(story.runFrom, STORY_RUN_DIRECTION, turn);
  const speed = turn < 1 ? 0 : Math.min(9, 3 + (story.leaving - 0.18) * 10);
  npc.position.x += Math.sin(STORY_RUN_DIRECTION) * speed * delta;
  npc.position.z += Math.cos(STORY_RUN_DIRECTION) * speed * delta;
  npc.position.y = GROUND_ENEMY_Y + Math.abs(Math.sin(story.leaving * 15)) * 0.14;
  for (const arm of arms) {
    arm.rotation.z = arm.userData.side * 0.25;
    arm.rotation.x = arm.userData.side * Math.sin(story.leaving * 15) * 0.9;
  }
  settleLantern(npc.userData.parts);
  reusableVector.copy(npc.position);
  reusableVector.project(camera);
  if (story.leaving < STORY_RUN_TIME && reusableVector.x < 1.25) return;
  endStory();
  railBeginTravel(nextStopIndex());
}

// While someone is talking, with nothing to type at, keys are not letters. Space shows
// the rest of the line at once, or moves on from a finished line; other keys are
// ignored. Returns true if the key is taken.
function hurryStory(key) {
  const story = rail.story;
  if (rail.state !== 'story' || !story || story.held) return false;
  if (key === ' ' && story.line >= 0 && story.leaving === 0) {
    if (story.shown < story.text.length) {
      story.shown = story.text.length - 0.5;
    } else {
      advanceStoryLine();
    }
  }
  return true;
}

function endStory() {
  if (storyCard) storyCard.hidden = true;
  hideHelpBubble();
  if (!rail.story) return;
  enemyGroup.remove(rail.story.npc);
  disposeObject(rail.story.npc);
  rail.story = null;
}

// ── The bat swarm ────────────────────────────────────────────────────────
// A challenge at one stop of the night sky: space bats flit about, each marked with a
// unit. The swarm is told first what it takes, then bats keep coming, up to five at a
// time, and the player has half a minute to bring the swarm down: fifteen bats in the
// first, twenty in the second. They do no harm; clearing the swarm earns points, and
// running out of time only loses the prize.
const BAT_TYPE = { name: 'Space Bat', body: 0x2b1d5c, trim: 0x8b5cf6, eye: 0x7ff5e6, scale: 1.25, score: 60 };
const BAT_GOALS = [15, 20];
const BAT_TIME = 30;
const BATS_AT_ONCE = 5;
const BAT_INTRO_TIME = 2.6;
const BAT_BONUS = 1500;
// Where the bats flit, spread across the sky and well apart, so their cards do not
// crowd one another. Each live bat takes a free spot.
const BAT_SPOTS = [
  { x: -4.6, y: 1.0, z: -4 },
  { x: -0.4, y: 3.4, z: -6 },
  { x: 2.8, y: 1.1, z: -3.5 },
  { x: 5.6, y: 3.2, z: -6.5 },
  { x: 8.4, y: 1.4, z: -5 },
  { x: -3.0, y: 4.4, z: -8.5 },
  { x: 2.0, y: 5.0, z: -10 },
  { x: 7.2, y: 4.8, z: -9.5 },
];

// Before the first bat, the challenge says what it takes, big in the middle of the view.
function showChallengeIntro(goal) {
  if (!challengeIntro) {
    challengeIntro = document.createElement('div');
    challengeIntro.className = 'challenge-intro';
    challengeIntro.setAttribute('role', 'status');
    document.getElementById('app').append(challengeIntro);
  }
  challengeIntro.innerHTML = '<strong>BAT SWARM!</strong>'
    + `<span>Shoot down ${goal} bats in ${BAT_TIME} seconds</span>`;
  challengeIntro.hidden = false;
  challengeIntro.classList.remove('is-in');
  void challengeIntro.offsetWidth;
  challengeIntro.classList.add('is-in');
}

function showChallengeCard(text) {
  if (!challengeCard) {
    challengeCard = document.createElement('div');
    challengeCard.className = 'challenge-card';
    challengeCard.setAttribute('role', 'status');
    document.getElementById('app').append(challengeCard);
  }
  if (challengeCard.textContent !== text) challengeCard.textContent = text;
  challengeCard.hidden = false;
}

function startChallenge() {
  rail.state = 'challenge';
  const which = Math.max(0, rail.challengeStops.indexOf(rail.stopIndex));
  const goal = BAT_GOALS[Math.min(which, BAT_GOALS.length - 1)];
  rail.challenge = { goal, time: BAT_TIME, spawned: 0, spawnTimer: 0, over: 0, intro: BAT_INTRO_TIME };
  showChallengeIntro(goal);
}

function liveBats() {
  return enemies.filter(enemy => enemy.isBat && !enemy.dying);
}

function spawnBat() {
  const taken = new Set(enemies.filter(other => !other.dying).map(other => other.searchPrompt.charAt(0)));
  const free = ROCK_UNITS.filter(entry => !taken.has(buildSearchPrompt(entry.term).charAt(0)));
  if (free.length === 0) return false;
  const bat = spawnEnemy({ wordData: free[Math.floor(Math.random() * free.length)], type: BAT_TYPE, customGroup: createSpaceBat(BAT_TYPE), flier: true });
  const takenSpots = new Set(liveBats().map(other => other.batSpot));
  const freeSpots = BAT_SPOTS.filter(spot => !takenSpots.has(spot));
  const spot = freeSpots[Math.floor(Math.random() * freeSpots.length)];
  const home = new THREE.Vector3(spot.x + (Math.random() - 0.5) * 0.6, spot.y + (Math.random() - 0.5) * 0.4, spot.z);
  bat.batSpot = spot;
  bat.isBat = true;
  bat.damage = 0;
  bat.noGlossary = true;
  bat.lane = home.x;
  bat.baseY = home.y;
  bat.rail = { phase: 'bat', t: 0, to: home, from: new THREE.Vector3(home.x + (Math.random() - 0.5) * 6, home.y + 9, home.z - 4) };
  bat.group.position.copy(bat.rail.from);
  setEnemyKind(bat, 'bat');
  playAppearSound(bat, 0.3);
  return true;
}

function updateChallenge(delta) {
  const challenge = rail.challenge;
  if (!challenge) return;
  const live = liveBats();
  const killed = challenge.spawned - live.length;
  if (challenge.over > 0) {
    challenge.over += delta;
    if (challenge.over < 1.6) return;
    endChallenge();
    railBeginTravel(nextStopIndex());
    return;
  }
  // The clock waits while the challenge is explained.
  if (challenge.intro > 0) {
    challenge.intro -= delta;
    if (challenge.intro > 0) return;
    if (challengeIntro) challengeIntro.hidden = true;
  }
  challenge.time = Math.max(0, challenge.time - delta);
  const goal = challenge.goal;
  showChallengeCard(`SPACE BATS ${Math.min(goal, killed)}/${goal} · ${Math.ceil(challenge.time)}s`);
  if (killed >= goal) {
    // Cleared: the stragglers scatter, and the prize is points.
    for (const bat of live) removeEnemy(bat);
    score += BAT_BONUS;
    showBanner('SWARM CLEARED!', 'variant-hint');
    showChallengeCard(`SWARM CLEARED · +${formatScore(BAT_BONUS)}`);
    challenge.over = 0.01;
    updateHud(true);
    return;
  }
  if (challenge.time <= 0) {
    for (const bat of live) {
      fx.burst(bat.group.position, { color: BAT_TYPE.trim, color2: 0xffffff, count: 10, speed: 3, life: 0.4, size: 0.26 });
      removeEnemy(bat);
    }
    typedBuffer = '';
    activeTarget = null;
    showBanner('THE SWARM ESCAPES', 'variant-hint');
    showChallengeCard(`TIME UP · ${killed}/${goal}`);
    challenge.over = 0.01;
    return;
  }
  challenge.spawnTimer -= delta;
  if (challenge.spawnTimer <= 0 && live.length < BATS_AT_ONCE) {
    if (spawnBat()) challenge.spawned += 1;
    challenge.spawnTimer = 0.35;
  }
}

function endChallenge() {
  if (challengeCard) challengeCard.hidden = true;
  if (challengeIntro) challengeIntro.hidden = true;
  rail.challenge = null;
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
  const wantsMore = encounter.remaining > 0 || (encounter.bonus && encounter.bonus.length > 0)
    || (encounter.isLast && wavePhase === 'normal' && !isNormalWaveComplete());
  if (wantsMore) {
    encounter.clearTimer = 0;
    encounter.timer -= delta;
    if (encounter.timer <= 0 && live.length < (encounter.stop.maxLive || RAIL_ENEMY_CAP)) {
      spawnRailMember(encounter);
      encounter.timer = Math.max(0.45, 0.9 - (monsterLevel() - 1) * 0.05) + Math.random() * 0.3 + (encounter.stop.maxLive ? 0.6 : 0);
    }
    return;
  }
  if (live.length > 0) return;
  encounter.clearTimer += delta;
  if (encounter.clearTimer < 0.8) return;
  if (encounter.blizzard) document.body.classList.remove('blizzard');
  // The bridge fight is fought mid-walk: once it is won the camera walks on.
  if (encounter.stop.resume) {
    rail.encounter = null;
    rail.state = 'travel';
    return;
  }
  railBeginTravel(nextStopIndex());
}

// The stop after this one; after the wave's last ambush, the boss arena.
function nextStopIndex() {
  return rail.stopIndex + 1 < rail.bursts.length ? rail.stopIndex + 1 : rail.stage.stops.length - 1;
}

function spawnRailMember(encounter) {
  if (encounter.bonus && encounter.bonus.length > 0) return spawnBonusMember(encounter);
  let kind = encounter.stop.minionsOnly ? 'minion'
    : shouldSpawnMedic() ? 'medic' : shouldSpawnMimic() ? 'mimic' : !isNormalWaveComplete() ? 'minion' : null;
  // One healer or chest per ambush: a second one waits for a later stop while monsters remain.
  if ((kind === 'medic' || kind === 'mimic') && encounter.helperSpawned && !isNormalWaveComplete()) kind = 'minion';
  if (kind === 'medic' || kind === 'mimic') encounter.helperSpawned = true;
  if (!kind) {
    encounter.remaining = 0;
    return null;
  }
  // Healers and chests run across from cover; monsters may come from anywhere.
  const spots = encounter.spots;
  let spot = spots[encounter.nextSpot % spots.length];
  if (kind !== 'minion') spot = crosserSpot(spots, spot);
  encounter.nextSpot += 1;
  // In the night sky every monster flies in from above.
  const flier = kind === 'minion' && rail.setPiece === 'flight';
  if (flier) spot = { ...spot, kind: 'sky' };
  const variant = kind === 'minion' && !encounter.stop.plain ? variantSchedule.get(normalEnemiesSpawned) : null;
  // From the second stage a healer may be big.
  const later = waveSet >= 2;
  const enemy = spawnEnemy({
    isMedic: kind === 'medic',
    bigMedic: kind === 'medic' && later && Math.random() < BIG_HEALER_CHANCE,
    isMimic: kind === 'mimic',
    railSpot: spot,
    variant,
    flier,
  });
  registerNormalTypingCost(enemy);
  if (kind === 'medic') medicsSpawnedThisSet += 1;
  else if (kind === 'mimic') mimicsSpawnedThisSet += 1;
  else normalEnemiesSpawned += 1;
  encounter.remaining -= 1;
  return enemy;
}

// A breather stop's easy monsters (plain, with short words) and its chest. They sit
// outside the wave's count, so the healer and chest schedules are left as they were.
function spawnBonusMember(encounter) {
  const kind = encounter.bonus.shift();
  const spots = encounter.spots;
  let spot = spots[encounter.nextSpot % spots.length];
  encounter.nextSpot += 1;
  if (kind === 'chest') {
    return spawnEnemy({ isMimic: true, railSpot: crosserSpot(spots, spot) });
  }
  const flier = rail.setPiece === 'flight';
  if (flier) spot = { ...spot, kind: 'sky' };
  return spawnEnemy({ wordData: choosePromptOfLength(3, 5), railSpot: spot, flier });
}

// Seconds a player at this wave needs for a word, from a gentle 24 words a minute upward.
function railTypingEstimate(enemy) {
  const lettersPerSecond = 2.0 + (monsterLevel() - 1) * 0.17;
  return 0.7 + enemy.searchPrompt.length / lettersPerSecond;
}

// The mimic stops short, snaps at the player and rushes in from where it stands,
// joining the monsters' advance, wind-up and strike.
function startMimicCharge(enemy) {
  const plan = enemy.rail;
  const position = enemy.group.position;
  enemy.lane = position.x;
  // It veers in toward the middle as it comes, so it strikes in view.
  plan.chargeLane = THREE.MathUtils.clamp(position.x * 0.35, -3.5, 3.5);
  enemy.wobbleAmount = 0.15;
  plan.phase = 'advance';
  plan.speed = (STRIKE_Z - position.z) / (railTypingEstimate(enemy) * 0.6 + MIMIC_CHARGE_SPARE);
  enemy.lidOpenProgress = 1;
  playChestClackSound();
  reusableVector.set(position.x, 0.14, position.z);
  fx.ring(reusableVector, enemy.type.eye, { from: 0.3, to: 2.4, life: 0.45, opacity: 0.8 });
}

function setupRailEntry(enemy, spot) {
  const crosser = enemy.isMedic || enemy.isMimic;
  const baseY = enemy.baseY;
  let from;
  let to;
  let crossTo = null;
  if (spot.kind === 'cover') {
    from = new THREE.Vector3(spot.hideX, baseY, spot.hideZ);
    const laneX = crosser ? spot.x : THREE.MathUtils.clamp(spot.x * 0.45 + (Math.random() - 0.5) * 1.4, -4.6, 4.6);
    to = new THREE.Vector3(laneX, baseY, Math.min(-5, spot.z + (crosser ? 0 : 1.6)));
    const crossing = crosser ? findCrossing(spot) : null;
    if (crossing) {
      to.z = crossing.z;
      crossTo = crossing.crossTo;
    }
  } else if (spot.kind === 'ground') {
    from = new THREE.Vector3(spot.x, baseY - 2.4, spot.z);
    to = new THREE.Vector3(spot.x, baseY, spot.z);
  } else if (spot.kind === 'climb') {
    from = new THREE.Vector3(spot.x, baseY - 2.6, spot.z);
    to = new THREE.Vector3(spot.x * (0.2 + Math.random() * 0.35), baseY, spot.z + 0.8);
  } else {
    from = new THREE.Vector3(spot.x + (Math.random() - 0.5) * 3, baseY + 11, spot.z - 3);
    to = new THREE.Vector3(spot.x, baseY, spot.z);
  }
  if (enemy.variant === 'caster') to.z = Math.min(to.z, -10);
  if (enemy.flier) to.x = Math.max(FLIER_MIN_X, to.x);
  enemy.lane = to.x;
  enemy.revealed = false;
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
    crossTo: crossTo ?? (to.x >= 0 ? -1 : 1) * CROSS_X,
    crossT: 0,
    crossTime: (2 + railTypingEstimate(enemy)) * 1.5,
    turnAt: MIMIC_TURN_AT[0] + Math.random() * (MIMIC_TURN_AT[1] - MIMIC_TURN_AT[0]),
  };
  if (rail.encounter && rail.encounter.blizzard && !crosser && enemy.variant !== 'caster') {
    // In the blizzard a monster's card stays hidden until it is close. It hurries
    // through the snow, then slows enough to leave time for its word.
    enemy.veilZ = BLIZZARD_VEIL_Z;
    enemy.rail.veilSpeed = Math.min(enemy.rail.speed, (STRIKE_Z - BLIZZARD_VEIL_Z) / (own * 1.15));
  }
  if (enemy.variant === 'caster') {
    // A caster walks to a stand well short of the player and casts from there. Its
    // first bolt leaves a fair typist the time to finish its word.
    const standZ = Math.min(-8, to.z + 2.5);
    enemy.rail.standZ = standZ;
    enemy.rail.speed = Math.max(2.5, (standZ - to.z) / 1.2);
    enemy.rail.castEvery = Math.max(2.6, 4.2 - (monsterLevel() - 1) * 0.15);
    enemy.rail.castTimer = Math.max(3, own + queue * 0.5);
  }
  playAmbushSound(spot.kind, THREE.MathUtils.clamp(to.x / 9, -0.8, 0.8));
  if (spot.kind === 'ground') {
    reusableVector.set(to.x, 0.2, to.z);
    fx.burst(reusableVector, { color: 0x7a5a3a, color2: 0xc9a46a, count: 16, speed: 3.4, life: 0.6, size: 0.3, gravity: 6 });
  }
}

// A healer or chest steps out in front of its cover and runs across the stop. It runs
// toward the far side if it can, else back past its own cover, at its own depth or a
// little nearer or further: whichever run first keeps clear of cottages, trees and
// rocks. Returns { z, crossTo }, or null when every run is blocked.
const CROSS_X = 12;
function findCrossing(spot) {
  const stop = rail.encounter && rail.encounter.stop;
  const laneZ = Math.min(-5, spot.z);
  const inward = spot.x >= 0 ? -1 : 1;
  if (!stop || !stop.pose || !rail.stage || !rail.stage.pathClear) return { z: laneZ, crossTo: inward * CROSS_X };
  const own = spot.coverX !== undefined ? { x: spot.coverX, z: spot.coverZ } : null;
  for (const shift of [0, -1.5, 1.5, -3, 3, -4.5]) {
    const z = THREE.MathUtils.clamp(laneZ + shift, -14, -4.5);
    for (const side of [inward, -inward]) {
      // Back past its own cover, the cover is in the way too.
      if (rail.stage.pathClear(stop, spot.x, side * CROSS_X, z, 0.8, side === inward ? own : null)) return { z, crossTo: side * CROSS_X };
    }
  }
  return null;
}

// The cover a healer or chest comes from: one with a clear run across, if any has.
function crosserSpot(spots, fallback) {
  const covers = spots.filter(candidate => candidate.kind === 'cover');
  return covers.find(candidate => findCrossing(candidate)) || covers[0] || fallback;
}

// Moves a monster that came out of an ambush. Returns true once it has gone.
function updateRailEnemy(enemy, delta, seconds) {
  if (enemy.isProjectile) return updateRock(enemy, delta);
  if (enemy.satellite) {
    updateSatellite(enemy, delta, seconds);
    return false;
  }
  if (enemy.phraseBoss) {
    updatePhraseBoss(enemy, delta, seconds);
    return false;
  }
  const plan = enemy.rail;
  const position = enemy.group.position;
  const stunned = enemy.stunTimer > 0;
  const facing = Math.atan2(-position.x, CAMERA_DISTANCE - position.z);

  if (plan.phase === 'bat') {
    // A swoop in, then a restless flit about its own patch of sky.
    plan.t = Math.min(1, plan.t + delta / 0.6);
    const ease = 1 - (1 - plan.t) ** 3;
    const flit = plan.t >= 1 ? 1 : ease;
    position.lerpVectors(plan.from, plan.to, ease);
    position.x += Math.sin(seconds * 2.1 + enemy.phase) * 0.8 * flit;
    position.y += Math.sin(seconds * 3.3 + enemy.phase * 2) * 0.45 * flit;
    position.z += Math.sin(seconds * 1.7 + enemy.phase) * 0.7 * flit;
    enemy.group.rotation.y = facing + Math.sin(seconds * 2.1 + enemy.phase) * 0.4;
    enemy.group.rotation.z = Math.cos(seconds * 2.1 + enemy.phase) * 0.25;
    return false;
  }

  if (plan.phase === 'guard') {
    position.x = plan.to.x + Math.sin(seconds * 1.7 + enemy.phase) * 0.25;
    position.z = plan.to.z;
    position.y = enemy.baseY + Math.abs(Math.sin(seconds * 4 + enemy.phase)) * 0.1;
    enemy.group.rotation.y = facing + 0.5;
    return false;
  }

  if (plan.phase === 'ride') {
    if (!stunned) position.z += plan.speed * delta;
    position.x = enemy.lane + Math.sin(seconds * 3.1 + enemy.phase) * 0.5;
    position.y = enemy.baseY + Math.sin(seconds * 4.3 + enemy.phase) * 0.35;
    enemy.group.rotation.y = facing;
    return false;
  }

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
      playAppearSound(enemy);
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
    // A mimic turns part way across and charges at the player.
    if (enemy.isMimic && plan.crossT >= plan.turnAt) {
      startMimicCharge(enemy);
      return false;
    }
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
      const veiled = enemy.veilZ !== undefined && position.z < enemy.veilZ;
      position.z += (veiled ? plan.speed * 1.6 : plan.veilSpeed || plan.speed) * delta;
      if (plan.chargeLane !== undefined) enemy.lane += (plan.chargeLane - enemy.lane) * Math.min(1, 2.2 * delta);
    }
    position.x = enemy.lane + Math.sin(seconds * enemy.wobbleSpeed + enemy.phase) * enemy.wobbleAmount;
    position.y = enemy.flier
      ? enemy.baseY + Math.sin(seconds * 2.3 + enemy.phase) * 0.55
      : enemy.baseY + Math.abs(Math.sin(seconds * 6.2 + enemy.phase)) * enemy.stepBounce * 1.6;
    enemy.group.rotation.y = facing + Math.sin(seconds * 2.4 + enemy.phase) * 0.12;
    if (enemy.variant === 'caster') {
      if (position.z >= plan.standZ) plan.phase = 'cast';
      return false;
    }
    if (position.z >= STRIKE_Z) {
      position.z = STRIKE_Z;
      plan.phase = 'windup';
      plan.t = 0;
      playWindupSound(THREE.MathUtils.clamp(position.x / 9, -0.8, 0.8));
    }
    return false;
  }

  if (plan.phase === 'cast') {
    position.x = enemy.lane + Math.sin(seconds * 1.3 + enemy.phase) * 0.5;
    position.y = enemy.baseY + Math.abs(Math.sin(seconds * 3.1 + enemy.phase)) * 0.08;
    enemy.group.rotation.y = facing;
    if (!stunned) plan.castTimer -= delta;
    enemy.charge = THREE.MathUtils.clamp(1 - plan.castTimer / CASTER_CHARGE_TIME, 0, 1);
    enemy.group.rotation.x = -enemy.charge * 0.22;
    if (plan.castTimer <= 0) {
      throwCasterBolt(enemy);
      plan.castTimer = plan.castEvery;
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

// Every correct letter lands: the monster flinches, sparks fly and the cannon fires a bolt.
function hitEnemyWithLetter(enemy) {
  if (enemy.firstLetterAt === undefined) enemy.firstLetterAt = rankClock;
  enemy.flinch = 1;
  reusableVector.copy(enemy.group.position);
  reusableVector.y += 0.9 * enemy.group.scale.y;
  fx.burst(reusableVector, { color: enemy.type.eye, color2: 0xffffff, count: 7, speed: 3.2, life: 0.3, size: 0.24 });
  weapon.cast(1, 0.45);
  const start = weapon.origin(1);
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

    if (enemy.isMimic) {
      const isTargeted = (activeTarget === enemy && isEnemyTargetable(enemy));
      // A mimic snaps its lid as it runs, baring its teeth.
      const idleTarget = 0.18 + Math.abs(Math.sin(seconds * 7 + enemy.phase)) * 0.4;
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

    if (enemy.variant) updateVariantParts(enemy, seconds);
    if (enemy.wings) {
      for (const pivot of enemy.wings.userData.wings) {
        pivot.rotation.z = pivot.userData.side * (0.2 + Math.sin(seconds * 15 + enemy.phase) * 0.6);
      }
    }
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

  if (mode === 'running') updateCasterBolts(delta);
  if (mode === 'running') {
    selectTarget();
    dropOrphanedTyping();
  }
}

function updateVariantParts(enemy, seconds) {
  if (enemy.shield) {
    enemy.shield.rotation.z = Math.sin(seconds * 1.7 + enemy.phase) * 0.12;
    enemy.shield.userData.plate.material.emissiveIntensity = 0.75 + Math.sin(seconds * 5 + enemy.phase) * 0.3;
  }
  if (enemy.cores) {
    const beat = 1 + Math.max(0, Math.sin(seconds * 7 + enemy.phase)) * 0.35;
    for (const core of enemy.cores.userData.cores) core.scale.setScalar(beat);
    enemy.cores.rotation.y = seconds * 2.2;
  }
  if (enemy.orb) {
    const charge = enemy.charge || 0;
    enemy.orb.userData.orb.scale.setScalar(0.7 + charge * 1.1 + Math.sin(seconds * 9) * 0.05);
    enemy.orb.userData.halo.rotation.x = Math.PI / 2 + Math.sin(seconds * 2) * 0.4;
    enemy.orb.userData.halo.rotation.z = seconds * 3;
    enemy.orb.userData.halo.scale.setScalar(1 + charge * 0.8);
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
      const pulse = 0.5 + Math.sin(seconds * 7.5 + enemy.phase) * 0.16;
      incomingBeacon.scale.setScalar(1.7 + pulse * 0.18);
      incomingBeacon.position.y = 2.72 + Math.sin(seconds * 5.2 + enemy.phase) * 0.16;
      incomingBeacon.rotation.y = seconds * 1.8 + enemy.phase;
      incomingBeacon.rotation.x = seconds * 1.2;
      incomingBeacon.material.opacity = 0.62 + pulse * 0.12;
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

    // Only chain-lightning bolts are held, at full strength, until the burst.
    if (effect.hold) {
      effect.mesh.material.opacity = 1.0;
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
    if (!powerUps.isTimeFrozen()) {
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
}

function updateEnvironment(seconds, delta, isTimeFrozen) {
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
  weapon.update(seconds, envDelta, {
    target: activeTarget && !activeTarget.dying ? activeTarget.group.position : null,
    walk: walking,
    walkPhase: rail.walkPhase,
  });
  if (rail.stage) rail.stage.update(seconds);

  if (moon) {
    let targetMoonShadowStrength;
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

  // A primed charge lights the cannon's crystal: gold with a crown of sparks for chain
  // lightning, magenta for the railgun.
  const primedColour = powerUps.isChainLightningPrimed() ? 0xfde068 : powerUps.getRailgunShots() > 0 ? RAILGUN_COLOUR : null;
  if (primedColour !== null && cannonIsPrimed !== primedColour) {
    cannonIsPrimed = primedColour;
    sceneCrystalMat.color.setHex(primedColour);
    sceneCrystalMat.emissive.setHex(primedColour);
    sceneCrystalMat.emissiveIntensity = 3.5;
    for (const crown of lightningCrowns) crown.visible = primedColour === 0xfde068;
    for (const light of strikeLights) light.color.setHex(primedColour);
  } else if (primedColour === null && cannonIsPrimed) {
    cannonIsPrimed = false;
    sceneCrystalMat.color.setHex(0x58dfcf);
    sceneCrystalMat.emissive.setHex(0x2dd4bf);
    sceneCrystalMat.emissiveIntensity = 2.6;
    for (const crown of lightningCrowns) crown.visible = false;
    for (const light of strikeLights) light.color.setHex(0x2dd4bf);
  }

  if (cannonIsPrimed) {
    const pulse = 1.1 + Math.sin(seconds * 12.0) * 0.18;
    for (const flame of cannonGlows) {
      flame.mesh.scale.set(pulse, pulse, pulse);
    }
    sceneCrystalMat.emissiveIntensity = 3.2 + Math.sin(seconds * 9.0) * 0.8;
    for (const crown of lightningCrowns) {
      crown.rotation.y = seconds * 5.5;
      const cs = 1.0 + Math.sin(seconds * 11.0) * 0.12;
      crown.scale.set(cs, cs, cs);
    }
    for (const light of strikeLights) {
      light.intensity = 2.6 + Math.sin(seconds * 10.0 + light.userData.phase) * 0.5;
    }
  } else {
    for (const flame of cannonGlows) {
      const flamePulse = 1 + Math.sin(seconds * 8.5 + flame.phase) * 0.12;
      flame.mesh.scale.set(flamePulse, 1 + Math.cos(seconds * 7.2 + flame.phase) * 0.16, flamePulse);
    }
    for (const light of strikeLights) {
      light.intensity = 1.55 + Math.sin(seconds * 7.8 + light.userData.phase) * 0.26;
    }
  }

  seasonalEffects.update(seconds, envDelta);
  updateFinalWaveScenery(seconds, envDelta);

  updateClouds(envDelta);
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

    const isVisible = isEnemyTargetable(enemy) && reusableVector.z > -1 && reusableVector.z < 1;
    enemy.label.classList.toggle('is-hidden', !isVisible);
    enemy.label.classList.toggle('is-revealing', !enemy.isBoss && enemy.revealFlash > 0);
    if (!isVisible) continue;

    const x = (reusableVector.x * 0.5 + 0.5) * width;
    const y = (-reusableVector.y * 0.5 + 0.5) * height;
    const approachAmount = enemy.isProjectile ? enemy.rail.t
      : enemy.phraseBoss || enemy.satellite ? 0
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

  // A held storyteller's cry for help stacks with the cards like one more card. Its
  // tail hangs below its box, so the tail counts as part of its height.
  const stacked = layoutItems.filter(item => !item.pinned);
  const bubbleItem = helpBubble && !helpBubble.hidden && helpBubbleAnchor
    ? layoutHelpBubble(helpBubbleAnchor, safeBounds, width)
    : null;
  if (bubbleItem) stacked.push(bubbleItem);
  resolveLabelStacks(stacked);
  if (bubbleItem) {
    helpBubble.style.left = `${bubbleItem.x.toFixed(1)}px`;
    helpBubble.style.top = `${(bubbleItem.y - HELP_BUBBLE_TAIL).toFixed(1)}px`;
  }

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
    // About to hurt the player: winding up to strike, or a caster near the end of its charge.
    const aboutToHit = railPhase === 'windup' || railPhase === 'strike' || (railPhase === 'cast' && (enemy.charge || 0) > 0.55);
    enemy.label.classList.toggle('is-critical', aboutToHit);
    enemy.label.classList.toggle('is-stunned', !!(enemy.stunTimer && enemy.stunTimer > 0));
  }
}

const HELP_BUBBLE_TAIL = 12;
function layoutHelpBubble(anchor, safeBounds, width) {
  const bubbleWidth = helpBubble.offsetWidth;
  const bubbleHeight = helpBubble.offsetHeight + HELP_BUBBLE_TAIL;
  const x = THREE.MathUtils.clamp(anchor.x, LABEL_SAFE_MARGIN + bubbleWidth / 2, width - LABEL_SAFE_MARGIN - bubbleWidth / 2);
  const minY = safeBounds.top + bubbleHeight;
  const maxY = safeBounds.bottom;
  return {
    enemy: { id: -1 },
    x,
    y: THREE.MathUtils.clamp(anchor.y + HELP_BUBBLE_TAIL, minY, maxY),
    minY,
    maxY,
    width: bubbleWidth,
    height: bubbleHeight,
    left: x - bubbleWidth / 2,
    right: x + bubbleWidth / 2,
  };
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
  const top = Math.ceil(barBottom + LABEL_SAFE_MARGIN);
  const bottom = Math.floor(height - LABEL_SAFE_MARGIN);
  return {
    top,
    bottom: Math.max(top + 72, bottom),
  };
}

function renderPrompt(enemy) {
  if (enemy.phraseBoss) {
    const html = buildBossLineHtml(enemy);
    if (enemy.lastPromptHtml === html) return;
    enemy.lastPromptHtml = html;
    enemy.promptNode.innerHTML = html;
    return;
  }
  const typed = enemy === activeTarget ? typedBuffer : '';
  const effectiveSP = enemy._matchedSearchPrompt?.startsWith(typed)
    ? enemy._matchedSearchPrompt
    : enemy.searchPrompt;
  const matched = effectiveSP.startsWith(typed) && typed.length > 0;
  const typedProgress = matched ? typed.length : 0;

  // Typed on another accepted spelling (color for colour): the card shows that spelling,
  // spaces and all, so the letters lit up are the ones the player actually typed.
  const term = matched && effectiveSP !== enemy.searchPrompt ? altTermFor(enemy.prompt, effectiveSP) : enemy.prompt;
  const typedLen = typedProgress > 0 ? promptIndexForProgress(term, typedProgress) : 0;
  const html = `<span class="typed">${escapeHtml(term.slice(0, typedLen))}</span>`
    + `<span class="remaining">${escapeHtml(term.slice(typedLen))}</span>`;

  if (enemy.lastPromptHtml === html) return;
  enemy.lastPromptHtml = html;
  enemy.promptNode.innerHTML = html;
}

// The boss's current word as the player is spelling it, and the part of it typed so far.
function bossWordProgress(boss) {
  const word = boss.lineWordsList[boss.wordIndex] || '';
  const typed = activeTarget === boss ? typedBuffer : '';
  const key = boss._matchedSearchPrompt?.startsWith(typed) ? boss._matchedSearchPrompt : boss.searchPrompt;
  if (!typed || !key.startsWith(typed)) return { word, done: '' };
  // Typed on another accepted spelling: the word shows as the player spells it.
  if (key !== boss.searchPrompt) {
    const spelled = altTermFor(word, key);
    return { word: spelled, done: spelled.slice(0, promptIndexForProgress(spelled, typed.length)) };
  }
  return { word, done: word.slice(0, promptIndexForProgress(word, typed.length)) };
}

// Typed words, the word in progress (its typed letters marked) and the words to come.
function buildBossLineHtml(boss) {
  const { word, done } = bossWordProgress(boss);
  const slot = boss.stageSlots?.[boss.wordIndex];
  // A word stage shows one word or long term at a time; a statement shows the whole line.
  const from = slot ? slot.start : 0;
  const parts = boss.lineWordsList.slice(from, slot ? slot.end : undefined).map((entry, offset) => {
    const index = from + offset;
    if (index < boss.wordIndex) return `<span class="typed">${escapeHtml(entry)}</span>`;
    if (index > boss.wordIndex) return `<span class="remaining">${escapeHtml(entry)}</span>`;
    return `<span class="current-word"><span class="typed">${escapeHtml(done)}</span><span class="remaining">${escapeHtml(word.slice(done.length))}</span></span>`;
  });
  if (!slot) return parts.join(' ');
  // A pip for each word or term of the stage.
  const stage = boss.bossLines[boss.lineIndex].entries;
  const pips = stage.map((entry, index) => `<i class="${index < slot.entryIndex ? 'is-done' : ''}"></i>`).join('');
  return `${parts.join(' ')}<span class="stage-pips">${pips}</span>`;
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
  updateLifeMeter(force);
}

function updatePhaseDisplay() {
  if (!phaseValue) return;
  if (mode === 'running') {
    const phase = wavePhase === 'boss' ? 'Boss' : 'On the road';
    phaseValue.textContent = `Stage ${waveSet} · ${phase}`;
    return;
  }
  if (mode === 'paused') {
    phaseValue.textContent = `Paused · Stage ${waveSet}`;
    return;
  }
  if (mode === 'wave_cleared') {
    phaseValue.textContent = `Stage ${waveSet} cleared`;
    return;
  }
  if (mode === 'gameover' || mode === 'ending') {
    phaseValue.textContent = mode === 'ending' ? 'Victory' : 'Run ended';
    return;
  }
  phaseValue.textContent = '';
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
  return length + (enemy.extraTypingCost || 0);
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

function spawnEnemy(options = {}) {
  const isBoss = options.isBoss || false;
  const isMedic = options.isMedic || false;
  const isMimic = options.isMimic || false;
  const bigMedic = isMedic && !!options.bigMedic;
  const isClimaxBoss = options.isClimaxBoss || false;
  const wordData = options.wordData
    ? options.wordData
    : isMedic
    ? chooseMedicPrompt({ big: bigMedic, avoid: options.avoid })
    : isMimic
    ? chooseMimicPrompt()
    : options.variant
    ? chooseVariantPrompt(options.variant)
    : choosePrompt();

  const type = options.type || (isBoss ? options.bossType : isMedic ? (bigMedic ? MEDIC_TYPE : SMALL_MEDIC_TYPE) : isMimic ? MIMIC_TYPE : weightedPick(ENEMY_TYPES));
  if (isMedic && !firstMedicHintShown) {
    firstMedicHintShown = true;
    showBannerLater('TYPE TO HEAL!', 'medic-hint', 1100);
  }
  if (isMimic && !firstMimicHintShown) {
    firstMimicHintShown = true;
    showBannerLater('LOOT CHEST!', 'mimic-hint', 1100);
  }
  const group = options.customGroup || createEnemyMesh(type);
  // A monster from an ambush is placed by setupRailEntry; bosses and rocks say where they start.
  const startZ = Number.isFinite(options.startZ) ? options.startZ : 0;
  const lane = Number.isFinite(options.lane) ? options.lane : 0;
  const isFlying = isBoss && !!type.isFlying;
  const spawnBaseY = isFlying ? FLYING_ENEMY_Y : isMedic ? MEDIC_ENEMY_Y : options.flier ? FLIER_Y : GROUND_ENEMY_Y;
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
  }

  const kindNode = document.createElement('span');
  kindNode.className = 'prompt-kind';
  kindNode.textContent = promptKind === 'mimic' ? 'loot'
    : options.phraseBoss ? (options.bossType?.name || 'boss')
    : promptKind;

  const promptNode = document.createElement('span');
  promptNode.className = 'prompt';

  label.append(kindNode, promptNode);

  const threatNode = document.createElement('span');
  threatNode.className = 'threat-meter';
  threatNode.append(document.createElement('i'));
  label.append(threatNode);

  labelsLayer.append(label);

  const enemy = {
    id: enemyId,
    type,
    group,
    label,
    kindNode,
    promptNode,
    prompt: wordData.term,
    definition: wordData.definition || null,
    searchPrompt: buildSearchPrompt(wordData.term),
    altSearchPrompts: options.isProjectile ? [] : buildAltSearchPrompts(wordData.term),
    _matchedSearchPrompt: null,
    lastPromptHtml: '',
    isBoss,
    isMedic,
    isMimic,
    isClimaxBoss,
    lidOpenProgress: 0,
    isFlying,
    shadowMesh,
    lane,
    revealed: true,
    revealFlash: 0,
    damage: isBoss || isMedic ? 0 : MINION_DAMAGE,
    baseY: spawnBaseY,
    wobbleAmount: isBoss ? 0.05 : 0.08 + Math.random() * 0.2,
    wobbleSpeed: isBoss ? 0.7 : 1.2 + Math.random() * 1.4,
    stepBounce: isFlying ? 0 : isBoss ? 0.04 : 0.06 + Math.random() * 0.08,
    floatAmount: isFlying ? 0.22 : 0,
    phase: Math.random() * Math.PI * 2,
  };
  if (options.flier) {
    enemy.flier = true;
    enemy.wobbleAmount = 0.5 + Math.random() * 0.4;
    enemy.wobbleSpeed = 1.4 + Math.random();
    enemy.wings = createWings(type);
    group.add(enemy.wings);
  }
  if (isMedic) enemy.healAmount = bigMedic ? BIG_HEAL : SMALL_HEAL;
  if (options.variant) dressVariant(enemy, options.variant);
  if (options.railSpot) setupRailEntry(enemy, options.railSpot);
  enemyId += 1;
  enemies.push(enemy);
  renderPrompt(enemy);
  selectTarget();
  return enemy;
}

function createWorld() {
  createWeapon();
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

function createWeapon() {
  sceneCrystalMat = new THREE.MeshStandardMaterial({
    color: 0x58dfcf, emissive: 0x2dd4bf, emissiveIntensity: 2.6,
    roughness: 0.1, metalness: 0.2, transparent: true, opacity: 0.9, flatShading: true,
  });

  // The cannon hangs from the camera, which must be in the scene for it to draw.
  scene.add(camera);
  weapon = createPlasmaCannon({ camera, crystalMaterial: sceneCrystalMat, createCrown: createLightningCrown });
  for (const glow of weapon.glows) cannonGlows.push({ mesh: glow, phase: Math.random() * Math.PI * 2 });
  lightningCrowns.push(...weapon.crowns);

  // The mine cart the player rides in, seen only during the ride. It hangs from the camera too.
  rideCart = createRideCart(camera);

  // The power-up's glow on whatever reaches the player: two lights either side of the
  // path, where monsters stop to strike. They never move, so the light count is fixed.
  for (const x of [-5.35, 5.35]) {
    const light = new THREE.PointLight(0x2dd4bf, 1.6, 14, 2);
    light.position.set(x, 2.2, WALL_Z - 0.2);
    light.userData.phase = Math.random() * Math.PI * 2;
    world.add(light);
    strikeLights.push(light);
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

// Drawn at the back of the depth range, like a skybox, the moons and clouds stay behind
// all scenery (see SKY_BAND); the band is in NDC z, ordered by distance from the camera.
function keepInSky(material) {
  const { near, width, reach } = SKY_BAND;
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader.replace(
      '#include <project_vertex>',
      `#include <project_vertex>
  gl_Position.z = gl_Position.w * (${near.toFixed(6)} + clamp(-mvPosition.z / ${reach.toFixed(1)}, 0.0, 1.0) * ${width.toFixed(6)});`
    );
  };
  material.customProgramCacheKey = () => 'keyfire-sky';
  return material;
}

function createSky() {
  const moonGeometry = new THREE.SphereGeometry(3.2, 24, 16);
  const moonMaterial = keepInSky(new THREE.MeshBasicMaterial({ color: 0xfff1b8, transparent: true, fog: false }));
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
      start: new THREE.Vector3(),
      end: new THREE.Vector3(),
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

function createClouds() {
  // Lit, so the facets show, with enough self-glow that clouds stay bright.
  baseCloudMaterial = keepInSky(new THREE.MeshLambertMaterial({
    color: 0xf0f2f8,
    emissive: 0x6a6670,
    transparent: true,
    opacity: 0.92,
    flatShading: true,
  }));
  weatherCloudMaterial = keepInSky(new THREE.MeshLambertMaterial({
    color: 0xd8e4f2,
    emissive: 0x5a5a66,
    transparent: true,
    opacity: 0,
    flatShading: true,
  }));
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
    const group = createLowPolyCloud(material, cfg.t);
    group.position.set(cfg.x, cfg.y, cfg.z);
    group.scale.setScalar(cfg.scale);
    group.visible = !cfg.weatherOnly;
    scene.add(group);
    clouds.push({
      group,
      speed: cfg.speed,
      baseScale: cfg.scale,
      template: cfg.t,
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
    baseCloudMaterial.emissive.setHex(weather.seasonName === 'summer' ? 0x18213c : 0x6a6670);
    baseCloudMaterial.color.setHex(weather.seasonName === 'summer' ? 0x3f5579 : isSnowyWinter ? 0xf4fbff : 0xf0f2f8);
    baseCloudMaterial.color.lerp(scene.background, CLOUD_SKY_TINT);
    baseCloudMaterial.opacity = 0.9 + cloudWeatherBlend * 0.06;
  }
  if (weatherCloudMaterial) {
    weatherCloudMaterial.color.setHex(isRainySummer ? 0x344769 : 0xeaf6ff);
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
    const heightScale = weather.seasonName === 'summer' ? 0.26 : 1 + cloudWeatherBlend * 0.55 * densityBoost;
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
  // The finishing blow comes from the muzzle, with the core surging behind it.
  weapon.cast(1, 1);
  weapon.cast(0, 1);
  const start = weapon.origin(1);
  const end = targetPosition.clone();
  end.y += 1.2;
  playBeamSound(end.x);
  const distance = start.distanceTo(end);
  const mid = start.clone().lerp(end, 0.5);

  // The beams start thin at the muzzle, which is close to the camera, and widen
  // toward the target; a beam of even width would fill the view.
  const taper = (atTarget, atMuzzle) => new THREE.CylinderGeometry(atTarget, atMuzzle, distance, 6, 1, true).rotateX(Math.PI / 2);

  // White core beam
  const coreGeo = taper(0.08, 0.012);
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
  const glowGeo = taper(0.38, 0.03);
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

  // Muzzle flash
  const muzzleGeo = new THREE.DodecahedronGeometry(0.1, 0);
  const muzzleMat = new THREE.MeshBasicMaterial({
    color: 0xffffff, transparent: true, opacity: 0.9,
    blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const muzzleMesh = new THREE.Mesh(muzzleGeo, muzzleMat);
  muzzleMesh.position.copy(start);
  effectsGroup.add(muzzleMesh);
  beams.push({ mesh: muzzleMesh, life: 0.14, maxLife: 0.14, kind: 'beam_flash' });

  fx.flash(start, 0xd8fff6, 0.5, 0.18);
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
  clearCasterBolts();
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
  activeTarget = matches.length > 0 ? pickTarget(matches, typedBuffer) : null;
}

// Typing ignores capitals everywhere: the typed letters and every answer are lower case,
// so kg, KG and Kg all hit a monster marked kg.
function findMatches(prefix) {
  if (!prefix) return [];
  return enemies.filter((enemy) => {
    if (!isEnemyTargetable(enemy)) return false;
    if (enemy.shielded) return false;
    // A finished word wins over one it merely starts.
    const keys = enemyTypeableKeys(enemy);
    const match = keys.find(key => key === prefix) || keys.find(key => key.startsWith(prefix));
    if (!match) return false;
    enemy._matchedSearchPrompt = match;
    enemy._matchComplete = match === prefix;
    return true;
  });
}

// Everything a player could type at an enemy: its answer and alternative spellings.
function enemyTypeableKeys(enemy) {
  return [enemy.searchPrompt, ...(enemy.altSearchPrompts || [])];
}

// A boss can be typed at from the moment it drops in; a monster once it has finished
// jumping out of hiding.
function isEnemyTargetable(enemy) {
  if (enemy.dying || enemy.group.position.z >= WALL_Z) return false;
  if (enemy.isBoss) return true;
  // In a blizzard a monster cannot be seen, or typed at, until it is close.
  if (enemy.veilZ !== undefined && enemy.group.position.z < enemy.veilZ) return false;
  return enemy.revealed;
}

function prepareWavePlan() {
  bossWordsThisSet = [];
  medicsSpawnedThisSet = 0;
  medicSpawnSlots = chooseMedicSpawnSlots(normalEnemyTarget, getMedicCountForWave(monsterLevel()));
  mimicsSpawnedThisSet = 0;
  mimicSpawnSlots = chooseMimicSpawnSlots(normalEnemyTarget, getMimicCountForWave(monsterLevel()), medicSpawnSlots);
  hardGuestSchedule = monsterLevel() <= 4 ? buildHardGuestSchedule(normalEnemyTarget) : new Map();
  variantSchedule = planVariants(waveSet, normalEnemyTarget, [...hardGuestSchedule.keys()]);
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

// Chests fall between the healers rather than on the same monster count, so one
// ambush does not get a healer and a chest back to back.
function chooseMimicSpawnSlots(target, count, medicSlots) {
  if (target <= 0 || count <= 0) return [];
  const slots = [];
  const usableTarget = Math.max(1, target - 1);
  const taken = new Set(medicSlots);
  for (let index = 0; index < count; index += 1) {
    let slot = THREE.MathUtils.clamp(Math.round(((index + 0.5) * usableTarget) / count), 1, usableTarget);
    while (taken.has(slot) && slot < usableTarget) slot += 1;
    taken.add(slot);
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

function liveAnswers(filter) {
  return enemies.filter(enemy => !enemy.dying && filter(enemy)).flatMap(enemyTypeableKeys);
}

function choosePrompt() {
  const liveKeys = enemies.filter(enemy => !enemy.dying).map(enemy => enemy.searchPrompt);
  // No word on screen may start another, or typing one would finish the other.
  const clashes = entry => {
    const key = buildSearchPrompt(entry.term);
    return liveKeys.some(other => other.startsWith(key) || key.startsWith(other));
  };
  // A hard guest that would clash gives its place to an ordinary word.
  const scheduledHardGuest = wavePhase === 'normal' ? hardGuestSchedule.get(normalEnemiesSpawned) : null;
  if (scheduledHardGuest && !clashes(scheduledHardGuest)) return scheduledHardGuest;

  const pool = currentKeywordPool();
  const nearExisting = new Set(enemies.map((enemy) => enemy.prompt));
  return monsterDeck.pick(pool, entry => !nearExisting.has(entry.term) && !clashes(entry))
    || monsterDeck.pick(pool, entry => !clashes(entry))
    || monsterDeck.pick(pool);
}

// A small healer carries a short word, a big one a long word. avoid, if given, rules
// out more words (in a boss fight, those that start like the boss's).
function chooseMedicPrompt({ big = false, avoid = null } = {}) {
  const nearExisting = new Set(enemies.map((enemy) => enemy.prompt));
  const [min, max] = big ? [8, LONGEST_MONSTER_WORD] : [4, 7];
  const sized = pool => pool.filter((entry) => {
    const length = buildSearchPrompt(entry.term).length;
    return length >= min && length <= max && (!avoid || !avoid(entry));
  });
  const pool = currentKeywordPool();
  const compactPool = sized(pool);
  const widePool = compactPool.length > 0 ? compactPool : sized(ALL_WORDS);
  const usablePool = widePool.length > 0 ? widePool : pool.length > 0 ? pool : EASY_WORDS;
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
    leafColors: sceneLeafMaterials.map(m => m.color.clone()),
    trunkColor: sceneTrunkMaterial.color.clone(),
    moonColor: moon.material.color.clone(),
    starOpacity: starField.opacity,
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
  if (changed) startSeasonFade(palette);
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
    tone: palette.name === 'summer' ? 0.42 : GROUND_TONE,
  };
}

function recolorGround(palette) {
  if (sceneGround) sceneGround.recolor(groundColours(palette));
}

// Starts a gradual change of season; the ground fades with the sky, lights and leaves.
function startSeasonFade(palette) {
  // Brief: the fog should part almost as soon as the camera starts to walk.
  seasonFade = { from: buildSeasonFromScene(), to: buildSeasonTarget(palette), palette, t: 0, duration: 1.6 };
  if (sceneGround) sceneGround.startBlend(groundColours(palette));
  const { from, to } = seasonFade;
  from.fogColor.copy(to.fogColor);
  from.bgColor.copy(to.fogColor);
  from.skyTop.copy(to.fogColor);
  from.fogNear = 2;
  from.fogFar = 16;
  updateSeasonFade(0);
}

function accuracy() {
  if (typedAttempts <= 0) return 1;
  return THREE.MathUtils.clamp((typedAttempts - mistakeCount) / typedAttempts, 0, 1);
}

function formatAccuracySummary() {
  if (typedAttempts <= 0) return 'No typed attempts';
  return `${Math.round(accuracy() * 100)}% accuracy`;
}

// Phones and tablets without a keyboard cannot play a typing game. A touch-only device
// (no fine pointer) is asked to use a computer; a key press from a physical keyboard,
// such as an iPad's keyboard case, lets it through. Nothing on the gate takes focus
// that would raise the on-screen keyboard.
function isTouchOnlyDevice() {
  if (!window.matchMedia) return false;
  return window.matchMedia('(any-pointer: coarse)').matches && !window.matchMedia('(any-pointer: fine)').matches;
}

function setUpDeviceGate() {
  // Declared here, not at module level: this runs before the module's later constants exist.
  const DEVICE_GATE_KEY = 'keyfireHasKeyboard';
  const gate = document.getElementById('deviceGate');
  if (!gate || !isTouchOnlyDevice()) return;
  try {
    if (localStorage.getItem(DEVICE_GATE_KEY) === '1') return;
  } catch {}
  gate.hidden = false;
  document.body.classList.add('needs-keyboard');
  const unlock = (event) => {
    if (event.isComposing || event.key === 'Unidentified' || event.key === 'Process') return;
    event.preventDefault();
    event.stopImmediatePropagation();
    window.removeEventListener('keydown', unlock, true);
    gate.hidden = true;
    document.body.classList.remove('needs-keyboard');
    try { localStorage.setItem(DEVICE_GATE_KEY, '1'); } catch {}
  };
  window.addEventListener('keydown', unlock, true);
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
    console.warn('KeyFire could not create a WebGL renderer.', error);
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
    renderer.shadowMap.enabled = false;
    moonLight.castShadow = false;
  } else {
    document.body.classList.remove('battery-saver');
    if (batterySaverButton) {
      batterySaverButton.classList.remove('is-active');
      batterySaverButton.title = "Enable Battery Saver";
      batterySaverButton.setAttribute('aria-label', "Enable Battery Saver");
    }
    renderer.shadowMap.enabled = true;
    moonLight.castShadow = true;
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
  rebuildSceneryDetail();
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

function setPauseButtonState(isPlaying, isDisabled) {
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
  showBanner('FINAL STAGE!', 'final-wave');
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
    const material = keepInSky(new THREE.MeshStandardMaterial({ color: spec.color, emissive: spec.color, emissiveIntensity: 0.22, roughness: 1, flatShading: true, fog: false }));
    const body = new THREE.Mesh(new THREE.IcosahedronGeometry(spec.radius, 1), material);
    body.position.set(...spec.position);
    group.add(body);
    if (spec.ring) {
      const ringMaterial = keepInSky(new THREE.MeshStandardMaterial({ color: spec.ring, emissive: spec.ring, emissiveIntensity: 0.4, roughness: 1, flatShading: true, fog: false }));
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
  showBanner('BOSS!');
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
    ? `${streak}-chain streak carries into stage ${waveSet + 1}!`
    : 'Boss terms from this stage:';
  showMessage(
    `STAGE ${waveSet} CLEARED`,
    'Stage Clear',
    `Score ${formatScore(score)}`,
    'Next Stage',
    copyText
  );
  renderWaveBossGlossary();
  messagePanel.classList.add('is-cleared');
  updateHud(true);
  updatePhaseDisplay();
}

let endingTimers = [];
let endingLeaderboardOffered = false;
// 'best' when the run beat the saved best score, 'unranked' when a cheat was used.
let endingScoreNote = '';
// The defeated words that fly into the cannon's core in the ending cinematic.
const ENDING_WORD_COUNT = 10;
const ENDING_WORD_MAX_LENGTH = 18;
const endScoreNote = document.getElementById('endScoreNote');

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

  const isUnranked = godModeUsedThisRun || powerUpCheatUsedThisRun || finalWaveCheatUsedThisRun;
  endingScoreNote = isUnranked ? 'unranked' : score > bestScore ? 'best' : '';
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
  const defeated = shuffle(encounteredTerms.filter(entry => entry.defeated && fits(entry.term)).map(entry => entry.term));
  const words = [...new Set(defeated)].slice(0, ENDING_WORD_COUNT);
  for (const entry of shuffle(EASY_WORDS)) {
    if (words.length >= 6) break;
    if (fits(entry.term) && !words.includes(entry.term)) words.push(entry.term);
  }
  return words;
}

function showEndingStatsScreen(finalStats, { skipped = false } = {}) {
  clearEndingTimers();
  if (gameEnding) {
    gameEnding.className = 'game-ending phase-stats';
    // The summary keeps to the space beside the score list.
    gameEnding.classList.add('has-score-list');
  }
  // Lifts the score list over the closing shot, beside the summary.
  document.body.classList.add('ending-summary');
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
  return {
    score,
    scoreNote: endingScoreNote,
    accuracy: Math.round(accuracy() * 100),
    time: formatRunTime(Math.max(1, elapsed)),
    ranks: RANK_LETTERS.map(letter => rankCounts[letter] || 0),
  };
}

function formatRunTime(seconds) {
  const total = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(total / 60);
  const remainingSeconds = total % 60;
  return `${minutes}:${String(remainingSeconds).padStart(2, '0')}`;
}

function setEndingStats(stats, animate) {
  if (animate) {
    animateCounter(endScore, 0, stats.score, 1400, formatScore);
    animateCounter(endAccuracy, 0, stats.accuracy, 1000, v => `${v}%`);
  } else {
    if (endScore) endScore.textContent = '0';
    if (endAccuracy) endAccuracy.textContent = '0%';
  }
  // The rank keys: an unearned rank is dimmed; the best rank earned is lit.
  const best = stats.ranks.findIndex(count => count > 0);
  endRankKeys.forEach((key, index) => {
    const count = stats.ranks[index] || 0;
    const value = key.querySelector('.rank-count');
    key.classList.toggle('is-empty', count === 0);
    key.classList.toggle('is-best', index === best);
    if (animate) animateCounter(value, 0, count, 700 + index * 80);
    else value.textContent = '0';
  });
  if (endTime) endTime.textContent = stats.time;
  if (endScoreNote) {
    endScoreNote.hidden = !stats.scoreNote;
    endScoreNote.textContent = stats.scoreNote === 'best' ? 'New best' : stats.scoreNote === 'unranked' ? 'Unranked' : '';
  }
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
  document.body.classList.remove('ending-summary');
  endingCinematic?.stop();
  stopVictoryScore(0.2);
}

// The Konami code skips ahead, for testing (the run stays unranked). Each entry goes one
// step on: from a stage to its boss, from a boss to the next stage, and from the last
// boss to the ending. Entered before a run, it starts one at the first boss.
function activateSkipCheat() {
  if (mode === 'ending') return;
  if (mode === 'idle' || mode === 'gameover') startGame();
  finalWaveCheatUsedThisRun = true;
  if (mode === 'wave_cleared') {
    advanceWaveSet();
    jumpToBoss();
  } else if (wavePhase === 'boss') {
    if (isFinalWave()) {
      bossFight = null;
      bossDeath = null;
      hideBossHpBar();
      startEndingSequence();
      return;
    }
    resumeForCheat();
    advanceWaveSet();
  } else {
    resumeForCheat();
    jumpToBoss();
  }
  showBanner('CHEAT CODE ACTIVATED', 'mimic-hint');
  updateHud(true);
  focusKeyboard();
  scheduleFrame();
}

function resumeForCheat() {
  hideLootGuide();
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

// Rebuilds this stage and walks from its last stop into the boss arena. The wave's plan
// starts afresh, so no healer or chest is left due, and its set-piece is skipped.
function jumpToBoss() {
  clearEnemies();
  clearEffects();
  typedBuffer = '';
  activeTarget = null;
  wavePhase = 'normal';
  normalEnemyTarget = getNormalEnemyTarget(monsterLevel());
  normalEnemiesSpawned = 0;
  normalTypingCostSpawned = 0;
  prepareWavePlan();
  buildStageForWave(waveSet);
  applySeasonForWave(waveSet, true);
  rail.setPieceDone = true;
  rail.stopIndex = Math.max(-1, rail.stage.stops.length - 2);
  startBossPhase();
}

function advanceWaveSet() {
  playStartSound();
  clearEffects();
  powerUps.deactivateShield();
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

// Letters a second, from the first letter typed at a monster to its last, that earn
// each rank. S is for really quick typing (8.5 a second is about 100 words a minute);
// a good speed earns an A.
const RANK_SPEEDS = [['S', 8.5], ['A', 6.5], ['B', 4.8], ['C', 3.4], ['D', 2.3]];
const RANK_COLOURS = { S: 0xffd84a, A: 0x4fd8ff, B: 0x7be36a };
// A better rank scores more: a bonus for each letter of the word (or line), on top of
// the word's own points, so a fast long word is worth more than a fast short one.
const RANK_BONUS_PER_LETTER = { S: 12, A: 8, B: 5, C: 3, D: 1, E: 0 };

function rankFor(letters, since) {
  const seconds = Math.max(0.05, rankClock - since);
  const speed = Math.max(1, letters) / seconds;
  return (RANK_SPEEDS.find(([, needed]) => speed >= needed) || ['E'])[0];
}

// The rank is the reward for a fast word, so it slams in: the better the rank, the
// bigger the letter. Monsters, healers and chests are ranked word by word; a boss is
// ranked for each word of a word stage and each finished line. Rocks are not ranked,
// nor is anything of a single letter, which has no typing time to measure.
function spawnRankPopup(enemy, letters = enemy.searchPrompt.length - 1) {
  if (enemy.isProjectile || enemy.noRank || enemy.firstLetterAt === undefined) return;
  const rank = rankFor(letters, enemy.firstLetterAt);
  rankCounts[rank] = (rankCounts[rank] || 0) + 1;
  const bonus = RANK_BONUS_PER_LETTER[rank] * (Math.max(1, letters) + 1);
  if (bonus > 0) {
    score += bonus;
    updateHud(true);
  }
  const label = enemy.label;
  if (!label || label.classList.contains('is-hidden')) return;
  const left = parseFloat(label.style.left);
  const top = parseFloat(label.style.top);
  if (!Number.isFinite(left) || !Number.isFinite(top)) return;
  const popup = document.createElement('div');
  popup.className = 'rank-popup';
  popup.dataset.rank = rank;
  popup.innerHTML = `<span class="rank-ring"></span><span class="rank-word">RANK</span><b>${rank}</b>`
    + (bonus > 0 ? `<span class="rank-bonus">+${bonus}</span>` : '');
  popup.style.left = `${left}px`;
  popup.style.top = `${top + (enemy.isBoss ? 78 : 54)}px`;
  document.body.appendChild(popup);
  popup.addEventListener('animationend', (event) => { if (event.target === popup && event.animationName === 'rank-life') popup.remove(); });
  // The top ranks also spark at the monster itself.
  const colour = RANK_COLOURS[rank];
  if (colour && !enemy.isBoss) {
    reusableVector.copy(enemy.group.position);
    reusableVector.y += 1.1;
    fx.burst(reusableVector, { color: colour, color2: 0xffffff, count: 16, speed: 5, life: 0.6, size: 0.3 });
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
  const healText = healed >= 2 ? '+1 HEART' : '+0.5 HEART';
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

function spawnPowerUpBurst(addedType) {
  const existing = document.querySelector('.power-up-burst');
  if (existing) existing.remove();
  const el = document.createElement('div');
  el.className = 'power-up-burst';
  const name = addedType.replace('_', ' ').toUpperCase();
  el.innerHTML = `<span class="power-up-burst-line1">POWER-UP!</span><span class="power-up-burst-line2">+1 ${name}</span>`;
  document.body.appendChild(el);
  el.addEventListener('animationend', () => el.remove(), { once: true });
}

// ── First-loot guide ──
// The first time a player ever loots a power-up, the game pauses once to show how
// to use a power-up and invites them to find out what each kind does by trying it.
const LOOT_GUIDE_KEY = 'keyfireLootGuideSeenV1';
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
  // Skip it if the power-up was already used or the run is no longer in play.
  if (mode !== 'running' || powerUps.getPowerUps()[slot] !== type) return;
  markLootGuideSeen();

  const key = SLOT_KEYS[slot];
  lootGuideIcon.innerHTML = powerUps.getPowerUpIcon(type);
  lootGuideHow.innerHTML = `To use it, press <kbd>${key.symbol}</kbd> or tap it in your tray. Each slot has its own arrow key.`;
  lootGuideCast.textContent = `Use it now (${key.symbol})`;

  mode = 'paused';
  lootGuideSlot = slot;
  stopMusicLoop();
  cancelFrame();
  suspendChainLightningTimers();
  playChestOpenSound();
  document.body.classList.add('is-paused', 'loot-guide-open');
  powerUpSlots[slot]?.classList.add('is-guided');
  setPauseButtonState(false, false);
  lootGuide.hidden = false;
  lootGuideCast.focus({ preventScroll: true });
  updatePhaseDisplay();
}

function hideLootGuide() {
  if (lootGuideSlot === -1) return;
  powerUpSlots[lootGuideSlot]?.classList.remove('is-guided');
  lootGuideSlot = -1;
  lootGuide.hidden = true;
  document.body.classList.remove('loot-guide-open');
}

function castGuidedPowerUp() {
  const slot = lootGuideSlot;
  if (slot === -1) return;
  resumeGame();
  powerUps.activatePowerUpSlot(slot);
}

if (lootGuideCast) {
  lootGuideCast.addEventListener('click', () => {
    resumeAudio();
    castGuidedPowerUp();
  });
}

if (lootGuideLater) {
  lootGuideLater.addEventListener('click', () => {
    resumeAudio();
    resumeGame();
  });
}

function awardMimicLoot(enemy) {
  const type = POWER_UP_TYPES[Math.floor(Math.random() * POWER_UP_TYPES.length)];
  const slot = powerUps.getPowerUps().indexOf(null);
  const success = powerUps.addPowerUp(type);
  playChestLootSound();
  if (success) queueLootGuide(type, slot);

  if (!enemy.label.classList.contains('is-hidden')) {
    const left = parseFloat(enemy.label.style.left);
    const top = parseFloat(enemy.label.style.top);
    if (Number.isFinite(left) && Number.isFinite(top)) {
      if (success) {
        spawnLootRewardPopup(left, top, type);
        spawnPowerUpBurst(type);
      } else {
        spawnInventoryFullPopup(left, top);
      }
    }
  }

  if (!encounteredTerms.some(t => t.term === enemy.prompt)) {
    encounteredTerms.push({ term: enemy.prompt, definition: enemy.definition, defeated: true });
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
    item.className = `glossary-item ${entry.defeated ? 'is-defeated' : 'is-leaked'}`;

    const term = document.createElement('span');
    term.className = 'gl-term';
    term.textContent = entry.term;

    const def = document.createElement('span');
    def.className = 'gl-def';
    def.textContent = entry.definition;

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

  // This card follows the boss's defeat, so every line of it was beaten, typed or not.
  for (const word of bossWordsThisSet) {
    const item = document.createElement('div');
    item.className = 'glossary-item is-defeated';

    // A boss line is listed under its topic.
    const term = document.createElement('span');
    term.className = 'gl-term';
    term.textContent = word.definition;

    const def = document.createElement('span');
    def.className = 'gl-def';
    def.textContent = word.term;

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

// A hint shown a moment after what it explains; a new run drops any still waiting.
let bannerTimers = [];

function showBannerLater(text, variant, delay) {
  bannerTimers.push(window.setTimeout(() => { if (mode === 'running') showBanner(text, variant); }, delay));
}

function clearBannerTimers() {
  bannerTimers.forEach(id => window.clearTimeout(id));
  bannerTimers = [];
}

// Chain lightning: the bolt strikes the monster whose word was just typed, then leaps
// to the nearest other target. A monster it reaches dies too; a boss is stunned instead.
function triggerChainLightning(firstEnemy) {
  const origin = firstEnemy.group.position;
  const hop = enemies
    .filter(enemy => enemy !== firstEnemy && isEnemyTargetable(enemy))
    .sort((a, b) => a.group.position.distanceToSquared(origin) - b.group.position.distanceToSquared(origin))[0];

  playToggleSound();
  showBanner('CHAIN LIGHTNING!', 'chain-lightning');

  // The chain leaps from the cannon's core; each bolt is held until the burst.
  weapon.cast(0, 1);
  weapon.cast(1, 1);
  const chain = [firstEnemy];
  let from = weapon.origin(0);
  const strike = (enemy) => {
    const to = enemy.group.position.clone();
    to.y += 0.8;
    spawnLightningVisual(from, to, true);
    from = to;
  };
  strike(firstEnemy);

  if (!hop) {
    scheduleChainLightningTimer(() => burstChain(chain), 100);
    return;
  }
  scheduleChainLightningTimer(() => {
    if (enemies.includes(hop) && isEnemyTargetable(hop)) {
      if (!hop.isBoss) hop.dying = true;
      chain.push(hop);
      strike(hop);
    }
    scheduleChainLightningTimer(() => burstChain(chain), 80);
  }, 60);
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
}

function clearChainLightningTimers() {
  for (const entry of chainLightningTimers) {
    window.clearTimeout(entry.id);
  }
  chainLightningTimers = [];
  lightningFlash.classList.remove('show');
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

function burstChain(chain) {
  releaseChainBeams();
  for (const enemy of chain) defeatEnemyChainBurst(enemy);
  flashLightning();
}

// A white flash over the whole view (styles.css: .lightning-flash.show).
function flashLightning() {
  lightningFlash.classList.add('show');
  window.setTimeout(() => lightningFlash.classList.remove('show'), 140);
}

function defeatEnemyChainBurst(enemy) {
  if (!enemies.includes(enemy)) return;
  const flash = new THREE.Mesh(
    new THREE.DodecahedronGeometry(0.85, 0),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false })
  );
  flash.position.copy(enemy.group.position);
  flash.position.y += 0.8;
  effectsGroup.add(flash);
  beams.push({ kind: 'beam_flash', mesh: flash, life: 0.15, maxLife: 0.15 });

  // A boss is not killed by the chain: it is stunned, a long interrupt of its attacks.
  if (enemy.isBoss) {
    if (!enemy.dying) {
      enemy.stunTimer = Math.max(enemy.stunTimer || 0, CHAIN_BOSS_STUN);
      playToggleSound();
    }
    return;
  }

  // Its card was hidden when the bolt marked it as dying; the popups are placed by the card.
  enemy.label.classList.remove('is-hidden');
  if (enemy.isMimic) {
    awardMimicLoot(enemy);
  } else {
    const { points, healed } = awardKill(enemy);
    spawnScorePopup(points, enemy, healed);
    if (enemy.isMedic) playHealSound(healed);
    else playDefeatSound(enemy);
  }
  spawnDebris(enemy.group.position, enemy.type);
  removeEnemy(enemy);
  updateHud(true);
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

// Hook up event listeners for power-up slots
powerUpSlots.forEach((slot, index) => {
  slot.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    resumeAudio();
    if (lootGuideSlot !== -1) {
      if (index === lootGuideSlot) castGuidedPowerUp();
      return;
    }
    powerUps.activatePowerUpSlot(index);
  });
});
