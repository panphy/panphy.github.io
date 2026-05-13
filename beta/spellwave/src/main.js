import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.164.1/build/three.module.js';
import { createSpellwaveAudio } from './audio.js';
import { createSeasonalEffects } from './seasonal-effects.js';
import { ALL_WORDS, EASY_WORDS, HARD_WORDS, MEDIUM_WORDS, EQUATION_WORDS } from './question-bank.js';

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
const startButton = document.getElementById('startButton');
const audioButton = document.getElementById('audioButton');
const pauseButton = document.getElementById('pauseButton');
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

const STORAGE_KEY = 'panphySpellwaveBestV1';
const AUDIO_STORAGE_KEY = 'panphySpellwaveAudioV1';
const MAX_DELTA = 0.06;
const WALL_Z = 4.6;
const SPAWN_Z = -48;
const FIRST_WAVE_SPAWN_Z = -34;
const REVEAL_Z = -30;
const SPAWN_SPREAD = 10;
const FIRST_WAVE_SPAWN_SPREAD = 4;
const HEART_COUNT = 5;
const MAX_LIFE = HEART_COUNT * 2;
const MINION_DAMAGE = 1;
const BOSS_CONTACT_DAMAGE = MAX_LIFE;
const BOSS_SHOTS_PER_DAMAGE = 2;
const BOSS_SHOT_DAMAGE = 1;
const BOSS_FIRST_SHOT_DELAY = 2.6;
const BOSS_SHOT_INTERVAL = 4.2;
const BOSS_ROCK_FLIGHT_TIME = 1.45;
const BOSS_ROCK_ARC_HEIGHT = 2.3;
const BOSSES_PER_WAVE = 3;
const MEDIC_HEAL_AMOUNT = 2;
const GAME_PROFILE = {
  phaseLabel: 'Spellwave',
  normalBase: 7,
  normalGrowth: 2,
  enemyLimit: 11,
  speedMultiplier: 0.94,
  waveSpeedBonus: 0.11,
  spawnBase: 2.35,
  spawnGrowth: 0.12,
  spawnJitter: 0.5,
  spawnMin: 0.74,
  bossWarningDelay: 1.0,
  bossSpawnGap: 2.8,
  revealZ: -33,
};
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
const TREE_MIN_Z = -58;
const TREE_MAX_Z = 18;
const TREE_SPAN = TREE_MAX_Z - TREE_MIN_Z;
const PATH_MARKER_WRAP_Z = 14;
const SCENERY_SCROLL_SPEED = 0.58;
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
const BOSS_TYPES = [
  {
    name: 'Crimson Bulwark',
    isBoss: true,
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
    body: 0x4b2509,
    trim: 0xfbbf24,
    eye: 0x7dd3fc,
    speed: 1.08,
    scale: 1.66,
    weight: 1,
    score: 150,
  },
];
const HEART_PATH = 'M16 28.4C10.3 23.6 4.8 19 3.2 14.1C1.9 10 3.8 6.2 7.5 5.4C10.4 4.8 13.1 6.1 16 9.4C18.9 6.1 21.6 4.8 24.5 5.4C28.2 6.2 30.1 10 28.8 14.1C27.2 19 21.7 23.6 16 28.4Z';

const SEASON_PALETTES = [
  { // Spring (wave 1): soft twilight blue, cherry blossoms
    name: 'spring',
    bgColor: 0x6a90b0, fogColor: 0x6a90b0, fogNear: 20, fogFar: 70,
    hemiSky: 0xb0d8f0, hemiGround: 0x508050, hemiIntensity: 1.2,
    sunColor: 0xffe0b0, sunIntensity: 1.8,
    emberColor: 0xff90b0, emberIntensity: 2.0,
    crystalColor: 0xf09ab8, crystalEmissive: 0xe06890,
    staffLightColor: 0xf090b0,
    pathMarkerColor: 0xf098b8, pathMarkerEmissive: 0xd06080,
    leafColors: [0xeaa8bc, 0xf5c8d8, 0xd890a8], trunkColor: 0x6b4226,
    moonColor: 0xffeedd, starOpacity: 0.4,
    groundPath: { h: 0.08, s: 0.2, lBase: 0.28 },
    groundAlt1: { h: 0.28, s: 0.28, l: 0.28 },
    groundGrass: { h: 0.28, s: 0.38, l: 0.22 },
  },
  { // Summer (wave 2): warm blue evening, lush greens
    name: 'summer',
    bgColor: 0x243870, fogColor: 0x243870, fogNear: 26, fogFar: 88,
    hemiSky: 0x4878d0, hemiGround: 0x265028, hemiIntensity: 1.5,
    sunColor: 0xfffac8, sunIntensity: 3.0,
    emberColor: 0xffcc30, emberIntensity: 2.8,
    crystalColor: 0x58dfcf, crystalEmissive: 0x2dd4bf,
    staffLightColor: 0x2dd4bf,
    pathMarkerColor: 0x58dfcf, pathMarkerEmissive: 0x0e6861,
    leafColors: [0x2a7840, 0x3d9050, 0x1a5530], trunkColor: 0x3d2010,
    moonColor: 0xffffff, starOpacity: 0.15,
    groundPath: { h: 0.1, s: 0.22, lBase: 0.28 },
    groundAlt1: { h: 0.28, s: 0.35, l: 0.34 },
    groundGrass: { h: 0.3, s: 0.44, l: 0.24 },
  },
  { // Autumn (wave 3): golden harvest dusk, amber sky, red/orange leaves
    name: 'autumn',
    bgColor: 0xd07840, fogColor: 0xb06030, fogNear: 22, fogFar: 72,
    hemiSky: 0xe0b878, hemiGround: 0x703820, hemiIntensity: 1.4,
    sunColor: 0xff9840, sunIntensity: 2.4,
    emberColor: 0xff4818, emberIntensity: 2.8,
    crystalColor: 0xd86828, crystalEmissive: 0xc04010,
    staffLightColor: 0xe06028,
    pathMarkerColor: 0xe87830, pathMarkerEmissive: 0xa83808,
    leafColors: [0xc04000, 0xd86810, 0xc89010], trunkColor: 0x3d2010,
    moonColor: 0xffb070, starOpacity: 0.2,
    groundPath: { h: 0.07, s: 0.3, lBase: 0.30 },
    groundAlt1: { h: 0.06, s: 0.38, l: 0.32 },
    groundGrass: { h: 0.07, s: 0.42, l: 0.26 },
  },
  { // Winter (wave 4): cold steel-blue dusk, icy tones
    name: 'winter',
    bgColor: 0x1e3050, fogColor: 0x1e3050, fogNear: 18, fogFar: 68,
    hemiSky: 0x5070b0, hemiGround: 0x182840, hemiIntensity: 1.2,
    sunColor: 0xb8d4ff, sunIntensity: 2.0,
    emberColor: 0x6888ff, emberIntensity: 2.0,
    crystalColor: 0x88ccff, crystalEmissive: 0x4888e8,
    staffLightColor: 0x78aeff,
    pathMarkerColor: 0x88ccff, pathMarkerEmissive: 0x3870d0,
    leafColors: [0xc8dff0, 0xd8ecff, 0xbbd4f0], trunkColor: 0x708090,
    moonColor: 0xe8f4ff, starOpacity: 0.65,
    groundPath: { h: 0.58, s: 0.08, lBase: 0.28 },
    groundAlt1: { h: 0.58, s: 0.12, l: 0.32 },
    groundGrass: { h: 0.6, s: 0.18, l: 0.24 },
  },
];

const reusableVector = new THREE.Vector3();
const reusableVectorTwo = new THREE.Vector3();
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
const pathMarkerBlocks = [];
const scrollingTrees = [];
const clouds = [];

let mode = 'idle';
let score = 0;
let bestScore = loadBestScore();
let health = MAX_LIFE;
let waveSet = 1;
let wavePhase = 'normal';
let normalEnemyTarget = getNormalEnemyTarget(waveSet);
let normalEnemiesSpawned = 0;
let bossesSpawned = 0;
let bossSpawnTimer = 0;
let bossWordsThisSet = [];
let bossPreviewSchedule = new Map();
let introducedBossTermsThisSet = new Set();
let medicSpawnedThisSet = false;
let medicSpawnSlot = 0;
let godMode = false;
let cheatBuffer = '';
let streak = 0;
let typedBuffer = '';
let activeTarget = null;
let spawnTimer = 0;
let lastFrameTime = 0;
let elapsed = 0;
let mistakeTimer = 0;
let damageTimer = 0;
let hudTimer = 0;
let renderedHealth = null;
let enemyId = 0;
let pathMarkerMaterial = null;
let moon = null;
let starField = null;
let typedAttempts = 0;
let mistakeCount = 0;
let defeatedCount = 0;
let leakedCount = 0;
let bossShotHits = 0;
let bossesDefeated = 0;
let encounteredTerms = [];
let firstMedicHintShown = false;
let sceneGroundMesh = null;
let sceneLeafMaterials = [];
let sceneTrunkMaterial = null;
let sceneCrystalMat = null;
let currentSeasonIndex = 0;
let seasonEmberIntensityBase = 2.1;
let seasonFade = null;
let seasonalEffects = null;

const {
  toggleEnabled: toggleAudioEnabled,
  updateAudioButton,
  resumeAudio,
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
  playGameOverSound,
} = createSpellwaveAudio({
  audioButton,
  initialEnabled: loadAudioSetting(),
  saveAudioSetting,
  getMode: () => mode,
  getWaveSet: () => waveSet,
  getTypedLength: () => typedBuffer.length,
  pathLanes: PATH_LANES,
});

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: false,
  preserveDrawingBuffer: false,
  powerPreference: 'high-performance',
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight, false);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x07120f);
scene.fog = new THREE.Fog(0x07120f, 20, 78);

const camera = new THREE.PerspectiveCamera(58, window.innerWidth / window.innerHeight, 0.1, 120);
camera.position.set(0, 7.2, 12.8);
camera.lookAt(cameraTarget);

const world = new THREE.Group();
scene.add(world);

const enemyGroup = new THREE.Group();
scene.add(enemyGroup);

const effectsGroup = new THREE.Group();
scene.add(effectsGroup);

const hemiLight = new THREE.HemisphereLight(0xd9f7e5, 0x203126, 1.35);
scene.add(hemiLight);

const moonLight = new THREE.DirectionalLight(0xc9ffec, 2.2);
moonLight.position.set(-8, 13, 10);
moonLight.castShadow = true;
moonLight.shadow.mapSize.set(1024, 1024);
moonLight.shadow.camera.left = -18;
moonLight.shadow.camera.right = 18;
moonLight.shadow.camera.top = 18;
moonLight.shadow.camera.bottom = -18;
scene.add(moonLight);

const emberLight = new THREE.PointLight(0xf26a3d, 2.5, 22, 1.8);
emberLight.position.set(0, 2.2, 5.7);
scene.add(emberLight);

createWorld();
createSky();
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
applySeasonForWave(1, true);
createLifeMeter();

bestValue.textContent = formatScore(bestScore);
messageScore.textContent = `Best ${formatScore(bestScore)}`;
updateAudioButton();
setPauseButtonState(true, true);
updatePhaseDisplay();
updateHud(true);

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

audioButton.addEventListener('click', () => {
  const audioEnabled = toggleAudioEnabled();
  if (audioEnabled) {
    resumeAudio();
    playToggleSound();
    if (mode === 'running') startMusicLoop(false);
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

window.addEventListener('resize', resizeRenderer);
window.addEventListener('keydown', handleKeyDown);
window.addEventListener('blur', () => {
  if (mode === 'running') pauseGame();
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden && mode === 'running') pauseGame();
});

document.addEventListener('pointerdown', () => {
  if (mode === 'running') focusKeyboard();
});

keyboardInput.addEventListener('beforeinput', handleBeforeInput);
keyboardInput.addEventListener('input', () => {
  keyboardInput.value = '';
});

resizeRenderer();
requestAnimationFrame(animate);

function activateGodMode() {
  if (godMode) return;
  godMode = true;
  document.body.classList.add('is-god-mode');
  godModeBadge = document.createElement('div');
  godModeBadge.className = 'god-mode-badge';
  godModeBadge.setAttribute('aria-live', 'assertive');
  godModeBadge.textContent = '✦ GOD MODE ✦';
  document.querySelector('.hud-grid').append(godModeBadge);
}

function startGame() {
  playStartSound();
  clearEnemies();
  clearEffects();
  godMode = false;
  cheatBuffer = '';
  document.body.classList.remove('is-god-mode');
  if (godModeBadge) { godModeBadge.remove(); godModeBadge = null; }
  score = 0;
  health = MAX_LIFE;
  renderedHealth = null;
  waveSet = 1;
  wavePhase = 'normal';
  normalEnemyTarget = getNormalEnemyTarget(waveSet);
  normalEnemiesSpawned = 0;
  bossesSpawned = 0;
  bossSpawnTimer = 0;
  prepareWavePlan();
  streak = 0;
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
  mistakeTimer = 0;
  damageTimer = 0;
  mode = 'running';
  startMusicLoop(true);
  document.body.classList.add('is-running');
  messagePanel.hidden = true;
  messagePanel.classList.remove('is-cleared');
  setPauseButtonState(true, false);
  updateTypedDisplay();
  updateHud(true);
  updatePhaseDisplay();
  applySeasonForWave(waveSet, true);
  focusKeyboard();
}

function pauseGame() {
  if (mode !== 'running') return;
  playPauseSound();
  stopMusicLoop();
  mode = 'paused';
  setPauseButtonState(false, false);
  showMessage('PAUSED', 'Wave Paused', `Score ${formatScore(score)}`, 'Resume', 'Take a breath — press Resume when ready.');
  updatePhaseDisplay();
}

function resumeGame() {
  if (mode !== 'paused') return;
  playStartSound();
  mode = 'running';
  startMusicLoop(false);
  lastFrameTime = 0;
  messagePanel.hidden = true;
  setPauseButtonState(true, false);
  updatePhaseDisplay();
  focusKeyboard();
}

function endGame() {
  mode = 'gameover';
  stopMusicLoop(0.04);
  playGameOverSound();
  setPauseButtonState(true, true);
  document.body.classList.remove('is-running');
  if (!godMode && score > bestScore) {
    bestScore = score;
    saveBestScore(score);
  }
  showMessage(
    'OVERRUN',
    'Game Over',
    godMode ? `Score ${formatScore(score)} · ⚡ Unranked` : `Score ${formatScore(score)} | Best ${formatScore(bestScore)}`,
    'Try Again',
    `${formatAccuracySummary()} · ${defeatedCount} defeated · ${leakedCount} leaked · ${elapsed.toFixed(0)}s`
  );
  if (supportLink) supportLink.hidden = false;
  renderRunGlossary();
  updatePhaseDisplay();
  updateHud(true);
}

function showMessage(kicker, title, scoreText, buttonText, copyText) {
  messageKicker.textContent = kicker;
  messageTitle.textContent = title;
  messageScore.textContent = scoreText;
  messageCopy.textContent = copyText;
  startButton.textContent = buttonText;
  if (runGlossary) runGlossary.hidden = true;
  if (supportLink) supportLink.hidden = true;
  messagePanel.hidden = false;
}

function handleKeyDown(event) {
  resumeAudio();

  if (event.key === 'Enter' && (mode === 'idle' || mode === 'gameover')) {
    event.preventDefault();
    startGame();
    return;
  }

  if (event.key === 'Enter' && mode === 'wave_cleared') {
    event.preventDefault();
    advanceWaveSet();
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

  if (event.key === 'Backspace') {
    event.preventDefault();
    typedBuffer = typedBuffer.slice(0, -1);
    playBackspaceSound();
    selectTarget();
    updateTypedDisplay();
    return;
  }

  if (event.key.length === 1) {
    event.preventDefault();
    enterCharacter(event.key);
  }
}

function handleBeforeInput(event) {
  if (mode !== 'running') return;
  resumeAudio();

  if (event.inputType === 'deleteContentBackward') {
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
  cheatBuffer = (cheatBuffer + character.toLowerCase()).slice(-5);
  if (cheatBuffer === 'iddqd') activateGodMode();

  const inputOptions = getInputCharacters(character);
  if (inputOptions.length === 0) return;
  typedAttempts += 1;

  for (const inputOption of inputOptions) {
    const next = typedBuffer + inputOption.value;
    const nextMatches = findMatches(next, inputOption);

    if (nextMatches.length > 0) {
      typedBuffer = next;
      activeTarget = chooseTarget(nextMatches);
      if (activeTarget._matchedSearchPrompt === typedBuffer) {
        defeatEnemy(activeTarget);
      } else {
        playTypeSound();
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

function registerMistake() {
  streak = 0;
  mistakeCount += 1;
  mistakeTimer = 0.2;
  playMistakeSound();
  typingStrip.classList.add('mistake');
  window.setTimeout(() => typingStrip.classList.remove('mistake'), 200);
}

function defeatEnemy(enemy) {
  const promptValue = enemy.prompt.replace(/\s/g, '');
  streak += 1;
  defeatedCount += 1;
  if (enemy.isBoss) bossesDefeated += 1;
  const points = enemy.type.score + promptValue.length * 12 + Math.min(streak, 10) * 8;
  const healed = enemy.isMedic ? Math.min(MEDIC_HEAL_AMOUNT, MAX_LIFE - health) : 0;
  score += points;
  if (healed > 0) health += healed;
  if (!encounteredTerms.some(t => t.term === enemy.prompt)) {
    encounteredTerms.push({ term: enemy.prompt, definition: enemy.definition, isEquation: enemy.isEquation, defeated: true });
  }
  spawnScorePopup(points, enemy, healed);
  if (enemy.isMedic) playHealSound(healed);
  else playDefeatSound(enemy);
  spawnBeam(enemy.group.position);
  spawnDebris(enemy.group.position, enemy.type);
  removeEnemy(enemy);
  typedBuffer = '';
  activeTarget = null;
  updateHud(true);
  updateTypedDisplay();
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
    updateTypedDisplay();
    return;
  }

  if (!godMode) health = Math.max(0, health - enemy.damage);
  streak = 0;
  leakedCount += 1;
  if (!encounteredTerms.some(t => t.term === enemy.prompt)) {
    encounteredTerms.push({ term: enemy.prompt, definition: enemy.definition, isEquation: enemy.isEquation, defeated: false });
  }
  playDamageSound(enemy);
  damageTimer = enemy.isBoss ? 0.46 : 0.32;
  damageFlash.classList.add('show');
  window.setTimeout(() => damageFlash.classList.remove('show'), 160);
  spawnDebris(new THREE.Vector3(enemy.group.position.x, 1.2, WALL_Z), enemy.type);
  removeEnemy(enemy);
  typedBuffer = '';
  activeTarget = null;
  updateHud(true);
  updateTypedDisplay();
  if (!godMode && health <= 0) endGame();
}

function bossShootPlayer(enemy) {
  spawnBossRock(enemy);
  playBossThrowSound();
}

function bossProjectileHitPlayer(enemy) {
  bossShotHits += 1;
  playBossImpactSound();

  if (bossShotHits % BOSS_SHOTS_PER_DAMAGE === 0) {
    if (!godMode) health = Math.max(0, health - BOSS_SHOT_DAMAGE);
    streak = 0;
    damageTimer = 0.24;
    damageFlash.classList.add('show');
    window.setTimeout(() => damageFlash.classList.remove('show'), 120);
    playDamageSound(enemy);
    updateHud(true);
    updateTypedDisplay();
    if (!godMode && health <= 0) endGame();
  }
}

function animate(frameTime) {
  requestAnimationFrame(animate);
  const delta = lastFrameTime ? Math.min((frameTime - lastFrameTime) / 1000, MAX_DELTA) : 0;
  lastFrameTime = frameTime;
  const seconds = frameTime * 0.001;

  if (mode === 'running') {
    elapsed += delta;

    if (wavePhase === 'normal') {
      if (shouldSpawnMedic() && enemies.length < getEnemyLimit()) {
        spawnEnemy({ isMedic: true });
        medicSpawnedThisSet = true;
        spawnTimer = Math.max(spawnTimer, 0.55);
      } else if (normalEnemiesSpawned < normalEnemyTarget) {
        spawnTimer -= delta;
        if (spawnTimer <= 0 && enemies.length < getEnemyLimit()) {
          spawnEnemy();
          normalEnemiesSpawned += 1;
          spawnTimer = nextSpawnDelay();
        }
      } else if (enemies.length === 0) {
        startBossPhase();
      }
    } else if (wavePhase === 'boss') {
      if (bossesSpawned < BOSSES_PER_WAVE) {
        bossSpawnTimer -= delta;
        if (bossSpawnTimer <= 0) {
          spawnBoss();
          bossesSpawned += 1;
          bossSpawnTimer = currentDifficulty().bossSpawnGap;
        }
      } else if (enemies.length === 0) {
        startWaveCleared();
      }
    }

    updateEnemies(delta, seconds);
    updateHud(false);
  }

  updateEffects(delta);
  updateEnvironment(seconds, delta);
  updateSeasonFade(delta);
  updateLabels();
  renderer.render(scene, camera);
}

function updateEnemies(delta, seconds) {
  for (let index = enemies.length - 1; index >= 0; index -= 1) {
    const enemy = enemies[index];
    enemy.age += delta;
    const speed = getEnemySpeed(enemy);
    enemy.group.position.z += speed * delta;
    enemy.group.position.x = enemy.lane + Math.sin(seconds * enemy.wobbleSpeed + enemy.phase) * enemy.wobbleAmount;
    enemy.group.position.y = enemy.baseY + Math.abs(Math.sin(seconds * 4.8 + enemy.phase)) * enemy.stepBounce;
    enemy.group.rotation.y = Math.sin(seconds * 2.4 + enemy.phase) * 0.18;

    const wasRevealed = enemy.revealed;
    enemy.revealed = enemy.group.position.z >= enemy.revealZ;
    if (enemy.revealed && !wasRevealed) {
      enemy.revealFlash = 0.28;
      playRevealSound(enemy);
    }
    if (enemy.revealFlash > 0) enemy.revealFlash -= delta;

    if (enemy.isBoss && enemy.revealed) {
      enemy.shotTimer -= delta;
      if (enemy.shotTimer <= 0) {
        bossShootPlayer(enemy);
        enemy.shotTimer = BOSS_SHOT_INTERVAL + Math.random() * 0.65;
        if (mode !== 'running') break;
      }
    }

    updateEnemyMarkers(enemy, seconds);

    const pulseScale = enemy.isMedic
      ? 1 + Math.max(0, Math.sin(seconds * 12 + enemy.phase)) * 0.14
      : 1;
    if (enemy === activeTarget && isEnemyTargetable(enemy)) {
      enemy.group.scale.setScalar(enemy.type.scale * pulseScale * (1.12 + Math.sin(seconds * 16) * 0.05));
    } else if (!enemy.revealed) {
      enemy.group.scale.setScalar(enemy.type.scale * pulseScale * (1.04 + Math.sin(seconds * 5 + enemy.phase) * 0.025));
    } else {
      enemy.group.scale.setScalar(enemy.type.scale * pulseScale);
    }

    if (enemy.group.position.z >= WALL_Z) {
      leakEnemy(enemy);
      if (mode !== 'running') break;
    }
  }

  if (mode === 'running') selectTarget();
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
      effect.age += delta;
      const progress = THREE.MathUtils.clamp(effect.age / effect.flightTime, 0, 1);
      const eased = easeOutSine(progress);
      effect.mesh.position.copy(effect.start).lerp(effect.end, eased);
      effect.mesh.position.y += Math.sin(progress * Math.PI) * effect.arcHeight;
      effect.mesh.rotation.x += effect.spin.x * delta;
      effect.mesh.rotation.y += effect.spin.y * delta;
      effect.mesh.rotation.z += effect.spin.z * delta;
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

    effect.life -= delta;
    const amount = Math.max(0, effect.life / effect.maxLife);

    if (effect.kind === 'beam_flash') {
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
    chunk.life -= delta;
    chunk.velocity.y -= 8.8 * delta;
    chunk.mesh.position.addScaledVector(chunk.velocity, delta);
    chunk.mesh.rotation.x += chunk.spin.x * delta;
    chunk.mesh.rotation.y += chunk.spin.y * delta;
    chunk.mesh.rotation.z += chunk.spin.z * delta;
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

function updateEnvironment(seconds, delta) {
  updateWandSwings(delta);
  emberLight.intensity = seasonEmberIntensityBase + Math.sin(seconds * 5.8) * 0.34;
  const shake = damageTimer > 0 ? damageTimer * 0.45 : 0;
  camera.position.x = Math.sin(seconds * 0.34) * 0.28 + Math.sin(seconds * 41) * shake;
  camera.position.y = 7.2 + Math.sin(seconds * 0.52) * 0.12 + Math.cos(seconds * 37) * shake;
  camera.position.z = 12.8 + Math.sin(seconds * 0.28) * 0.18 + Math.sin(seconds * 43) * shake;
  camera.lookAt(cameraTarget);

  if (moon) {
    moon.position.x = 20 + Math.sin(seconds * 0.05) * 0.5;
    moon.position.y = 18 + Math.cos(seconds * 0.04) * 0.22;
  }

  if (starField) {
    starField.rotation.y = seconds * 0.006;
  }

  if (pathMarkerMaterial) {
    pathMarkerMaterial.emissiveIntensity = 0.24 + Math.sin(seconds * 2.8) * 0.1;
  }

  const scrollDelta = SCENERY_SCROLL_SPEED * delta * (mode === 'running' ? 1 : 0.35);

  for (const marker of pathMarkerBlocks) {
    marker.mesh.position.z += scrollDelta * 2.4;
    if (marker.mesh.position.z > PATH_MARKER_WRAP_Z) {
      marker.mesh.position.z -= PATH_MARKER_SPAN;
    }
    marker.mesh.position.y = marker.baseY + Math.sin(seconds * 3.2 + marker.phase) * 0.018;
  }

  for (const flame of torchFlames) {
    const flamePulse = 1 + Math.sin(seconds * 8.5 + flame.phase) * 0.12;
    flame.mesh.scale.set(flamePulse, 1 + Math.cos(seconds * 7.2 + flame.phase) * 0.16, flamePulse);
  }

  for (const light of torchLights) {
    light.intensity = 1.55 + Math.sin(seconds * 7.8 + light.userData.phase) * 0.26;
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

  seasonalEffects.update(seconds, delta, scrollDelta);

  for (const cloud of clouds) {
    cloud.group.position.x += cloud.speed * delta;
    if (cloud.group.position.x > 46) {
      cloud.group.position.x = -46;
    }
  }
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
    reusableVector.y += 3.2 * enemy.type.scale;
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
      reusableVector.y += 1.3 * enemy.type.scale;
      reusableVector.project(camera);
      const bossMidScreenY = (-reusableVector.y * 0.5 + 0.5) * height;
      labelItems.push({ enemy, x, y, scale, rightRoadEdgeX, leftRoadEdgeX, bossMidScreenY });
    } else {
      labelItems.push({ enemy, x, y, scale });
    }
  }

  const layoutItems = labelItems.map((item) => {
    const { enemy, scale } = item;
    const labelWidth = enemy.label.offsetWidth * scale;
    const labelHeight = enemy.label.offsetHeight * scale;
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

function buildHintMask(term, options = {}) {
  return term.replace(/\S+/g, word => {
    let hasTypeable = false;
    for (const ch of word) if (normalizeCharacter(ch, options)) { hasTypeable = true; break; }
    if (!hasTypeable) return word;
    let result = '';
    let firstTypeable = true;
    for (const ch of word) {
      if (!normalizeCharacter(ch, options)) { result += ch; }
      else if (firstTypeable) { result += ch; firstTypeable = false; }
      else { result += '_'; }
    }
    return result;
  });
}

function buildSearchPrompt(term, options = {}) {
  return [...term].map(character => normalizeCharacter(character, options)).join('');
}

function buildAltSearchPrompts(term, options = {}) {
  const canonical = buildSearchPrompt(term, options);
  const lower = term.toLowerCase();
  const alts = new Set();
  for (const [a, b] of SPELLING_ALTS) {
    for (const [from, to] of [[a, b], [b, a]]) {
      if (lower.includes(from)) {
        const alt = buildSearchPrompt(lower.replace(from, to), options);
        if (alt !== canonical) alts.add(alt);
      }
    }
  }
  return [...alts];
}

function escapeHtml(text) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function wrapSups(text) {
  return text.replace(/²/g, '<sup class="given-sup">²</sup>');
}

const SUPERSCRIPT_DIGITS = '⁰¹²³⁴⁵⁶⁷⁸⁹';
const LOW_VALUE_ANSWER_WORDS = new Set([
  'a',
  'an',
  'and',
  'as',
  'by',
  'for',
  'from',
  'in',
  'of',
  'on',
  'or',
  'per',
  'the',
  'to',
  'with',
]);

function buildHintPart(text, options = {}) {
  let result = '';
  let firstTypeable = true;
  for (const ch of text) {
    if (!normalizeCharacter(ch, options)) { result += ch; }
    else if (firstTypeable) { result += ch; firstTypeable = false; }
    else { result += '_'; }
  }
  return result;
}

function buildHintRemain(text, options = {}) {
  let result = '';
  for (const ch of text) {
    result += normalizeCharacter(ch, options) ? '_' : ch;
  }
  return result;
}

function buildTwoWordLimit(term, options = {}) {
  const tokens = term.split(/(\s+)/);
  const typeableIndices = [];
  for (let i = 0; i < tokens.length; i++) {
    if (/^\s+$/.test(tokens[i])) continue;
    const answerText = getAnswerTokenText(tokens[i]);
    if (isWordToken(answerText) && !isLowValueAnswerToken(answerText) && buildSearchPrompt(answerText, options)) {
      typeableIndices.push(i);
    }
  }
  if (typeableIndices.length === 0) return null;
  const hasSkippedAnswerWord = tokens.some((token, index) => {
    if (/^\s+$/.test(token)) return false;
    return isWordToken(getAnswerTokenText(token)) && !typeableIndices.includes(index);
  });
  if (typeableIndices.length <= 2 && !options.alwaysLimit && !hasSkippedAnswerWord) return null;

  const shuffled = [...typeableIndices];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  const hiddenSet = new Set(shuffled.slice(0, Math.min(2, shuffled.length)));

  const parts = tokens.map((tok, i) => {
    const isWhitespace = /^\s+$/.test(tok);
    const hidden = hiddenSet.has(i);
    const answerText = hidden ? getAnswerTokenText(tok) : tok;
    return {
      text: tok,
      answerText,
      exponentText: hidden ? getTokenExponent(tok) : '',
      isWhitespace,
      isGiven: typeableIndices.includes(i) && !hidden,
      isHidden: hidden,
    };
  });

  const hiddenSearch = parts.filter(part => part.isHidden).map(part => buildSearchPrompt(part.answerText, options)).join('');
  return { parts, searchPrompt: hiddenSearch };
}

function isWordToken(token) {
  return /[a-z]/i.test(token);
}

function getAnswerTokenText(token) {
  return token.replace(new RegExp(`[${SUPERSCRIPT_DIGITS}]+`, 'g'), '');
}

function getTokenExponent(token) {
  const match = token.match(new RegExp(`([${SUPERSCRIPT_DIGITS}]+)$`));
  return match ? match[1] : '';
}

function isLowValueAnswerToken(token) {
  return LOW_VALUE_ANSWER_WORDS.has(token.toLowerCase().replace(/[^a-z]/g, ''));
}

function promptIndexForProgress(term, progress, options = {}) {
  if (progress <= 0) return 0;

  let matched = 0;
  for (let index = 0; index < term.length; index += 1) {
    if (!normalizeCharacter(term[index], options)) continue;
    matched += 1;
    if (matched >= progress) return index + 1;
  }

  return term.length;
}

function displayTypedBuffer() {
  if (!typedBuffer) return '';
  if (!activeTarget) return typedBuffer;
  const effectiveSP = activeTarget._matchedSearchPrompt?.startsWith(typedBuffer)
    ? activeTarget._matchedSearchPrompt
    : activeTarget.searchPrompt;
  if (!effectiveSP.startsWith(typedBuffer)) return typedBuffer;
  if (activeTarget.limitedParts) return typedBuffer;
  return activeTarget.prompt.slice(0, promptIndexForProgress(activeTarget.prompt, typedBuffer.length, {
    multiplicationAlias: activeTarget.isEquation,
  }));
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
    } else if (!part.isGiven && !part.isHidden) {
      html += `<span class="given-tok">${wrapSups(escapeHtml(part.text))}</span>`;
    } else if (part.isGiven) {
      html += `<span class="given-tok">${wrapSups(escapeHtml(part.text))}</span>`;
    } else {
      const promptOptions = { multiplicationAlias: enemy.isEquation };
      const answerText = part.answerText || part.text;
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
        if (remainPart) html += `<span class="remaining">${wrapSups(escapeHtml(buildHintRemain(remainPart, promptOptions)))}</span>`;
        if (wrapSquared) html += `)${exponentHtml}`;
      } else {
        if (wrapSquared) html += '(';
        html += `<span class="remaining">${wrapSups(escapeHtml(buildHintPart(answerText, promptOptions)))}</span>`;
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
  bestValue.textContent = formatScore(godMode ? bestScore : Math.max(bestScore, score));
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
  if (mode === 'gameover') {
    phaseValue.textContent = 'Run ended';
    return;
  }
  phaseValue.textContent = profile.phaseLabel;
}

function getNormalEnemyTarget(wave) {
  const profile = currentDifficulty();
  return profile.normalBase + Math.max(0, wave - 1) * profile.normalGrowth;
}

function getEnemyLimit() {
  return currentDifficulty().enemyLimit;
}

function getEnemySpeed(enemy) {
  const profile = currentDifficulty();
  const wavePressure = Math.max(0, waveSet - 1) * profile.waveSpeedBonus;
  const longPromptPenalty = Math.max(0, enemy.searchPrompt.length - (enemy.isBoss ? 5 : 7));
  const lengthFactor = THREE.MathUtils.clamp(1 - longPromptPenalty * (enemy.isBoss ? 0.024 : 0.016), 0.7, 1);
  return (enemy.speed + wavePressure) * profile.speedMultiplier * lengthFactor;
}

function updateTypedDisplay() {
  typedValue.textContent = displayTypedBuffer() || (mode === 'running' ? '...' : 'ready');
  updateComboDisplay();
}

function spawnEnemy(options = {}) {
  const isBoss = options.isBoss || false;
  const isMedic = options.isMedic || false;
  const wordData = options.wordData
    ? options.wordData
    : options.forcedPrompt
    ? (ALL_WORDS.find(w => w.term === options.forcedPrompt) || { term: options.forcedPrompt, definition: null })
    : isMedic
    ? chooseMedicPrompt()
    : choosePrompt();

  const isEquationPrompt = !!wordData.isEquation;
  const showDefinition = !!wordData.definition && (isBoss || isEquationPrompt);
  const type = isBoss ? (options.bossType || chooseBossType(bossesSpawned)) : isMedic ? MEDIC_TYPE : weightedPick(ENEMY_TYPES);
  if (isMedic && !firstMedicHintShown) {
    firstMedicHintShown = true;
    window.setTimeout(() => { if (mode === 'running') showBanner('TYPE TO HEAL!', 'medic-hint'); }, 1100);
  }
  const group = createEnemyMesh(type);
  const spawnBaseZ = Number.isFinite(options.startZ) ? options.startZ : chooseSpawnZ();
  const spawnSpread = Number.isFinite(options.delay)
    ? options.delay
    : Math.random() * (waveSet === 1 ? FIRST_WAVE_SPAWN_SPREAD : SPAWN_SPREAD);
  const startZ = spawnBaseZ - spawnSpread;
  const lane = Number.isFinite(options.lane) ? options.lane : chooseSpawnLane(startZ);
  const revealZ = currentDifficulty().revealZ;
  group.position.set(lane, 0.32, startZ);
  group.scale.setScalar(type.scale);
  enemyGroup.add(group);

  const promptKind = isEquationPrompt ? 'equation' : showDefinition ? 'definition' : isMedic ? 'medic' : 'keyword';
  const label = document.createElement('div');
  label.className = isBoss
    ? 'word-tag is-boss is-hidden'
    : isMedic
    ? 'word-tag is-medic is-hidden'
    : 'word-tag is-hidden';
  label.dataset.kind = promptKind;
  label.style.setProperty('--threat-progress', '0');
  if (isBoss) {
    label.style.setProperty('--boss-accent', hexColor(type.trim));
    label.style.setProperty('--boss-glow', hexColor(type.eye));
  }

  const kindNode = document.createElement('span');
  kindNode.className = 'prompt-kind';
  kindNode.textContent = promptKind;

  const promptNode = document.createElement('span');
  promptNode.className = 'prompt';

  const typedNode = document.createElement('span');
  typedNode.className = 'typed';

  const remainingNode = document.createElement('span');
  remainingNode.className = 'remaining';

  promptNode.append(typedNode, remainingNode);
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
  const twoWordData = isEquationPrompt
    ? buildTwoWordLimit(wordData.term, {
        alwaysLimit: isEquationPrompt,
        multiplicationAlias: isEquationPrompt,
      })
    : null;
  const enemy = {
    id: enemyId,
    type,
    group,
    label,
    promptNode,
    typedNode,
    remainingNode,
    prompt: wordData.term,
    definition: wordData.definition || null,
    isEquation: isEquationPrompt,
    searchPrompt: twoWordData ? twoWordData.searchPrompt : buildSearchPrompt(wordData.term, promptOptions),
    altSearchPrompts: twoWordData ? [] : buildAltSearchPrompts(wordData.term, promptOptions),
    _matchedSearchPrompt: null,
    limitedParts: twoWordData ? twoWordData.parts : null,
    showDefinition,
    maskPrompt: showDefinition && !isEquationPrompt,
    hintMask: showDefinition && !isEquationPrompt ? buildHintMask(wordData.term, promptOptions) : null,
    lastPromptHtml: '',
    promptKind,
    isBoss,
    isMedic,
    lane,
    spawnZ: startZ,
    revealZ,
    revealed: startZ >= revealZ,
    revealFlash: 0,
    speed: isBoss ? type.speed : isMedic ? type.speed + Math.random() * 0.18 : type.speed + Math.random() * 0.35,
    damage: isBoss ? BOSS_CONTACT_DAMAGE : isMedic ? 0 : MINION_DAMAGE,
    shotTimer: isBoss ? BOSS_FIRST_SHOT_DELAY + Math.random() * 0.7 : 0,
    baseY: 0.32,
    age: 0,
    wobbleAmount: isBoss ? 0.05 : 0.08 + Math.random() * 0.2,
    wobbleSpeed: isBoss ? 0.7 : 1.2 + Math.random() * 1.4,
    stepBounce: isBoss ? 0.04 : 0.06 + Math.random() * 0.08,
    phase: Math.random() * Math.PI * 2,
  };
  if (!isBoss && definitionBossWordsForWave().some(w => w.term === wordData.term)) {
    introducedBossTermsThisSet.add(wordData.term);
  }
  enemyId += 1;
  enemies.push(enemy);
  renderPrompt(enemy);
  selectTarget();
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

function createEnemyMesh(type) {
  const group = new THREE.Group();
  const isBossType = !!type.isBoss;
  const isMedicType = !!type.isMedic;
  if (isMedicType) return createMedicHeartMesh(type);
  if (isBossType) return createSpecificBossMesh(type);

  const bodyMaterial = new THREE.MeshStandardMaterial({
    color: type.body,
    emissive: isBossType ? type.body : 0x000000,
    emissiveIntensity: isBossType ? 0.56 : 0,
    roughness: isBossType ? 0.58 : 0.82,
    metalness: 0.03,
  });
  const trimMaterial = new THREE.MeshStandardMaterial({
    color: type.trim,
    emissive: isBossType ? type.trim : 0x000000,
    emissiveIntensity: isBossType ? 0.82 : 0,
    roughness: isBossType ? 0.46 : 0.78,
    metalness: isBossType ? 0.08 : 0.02,
  });
  const eyeMaterial = new THREE.MeshStandardMaterial({
    color: type.eye,
    emissive: type.eye,
    emissiveIntensity: isBossType ? 2.2 : 0.9,
    roughness: 0.4,
  });

  const body = blockMesh(1.15, 1.28, 0.76, bodyMaterial, 0, 0.86, 0);
  const head = blockMesh(0.88, 0.72, 0.72, trimMaterial, 0, 1.82, 0.02);
  const leftArm = blockMesh(0.34, 0.94, 0.46, bodyMaterial, -0.82, 0.86, 0.02);
  const rightArm = blockMesh(0.34, 0.94, 0.46, bodyMaterial, 0.82, 0.86, 0.02);
  const leftFoot = blockMesh(0.46, 0.32, 0.58, trimMaterial, -0.34, 0.18, 0.08);
  const rightFoot = blockMesh(0.46, 0.32, 0.58, trimMaterial, 0.34, 0.18, 0.08);
  const leftEye = blockMesh(0.16, 0.16, 0.08, eyeMaterial, -0.2, 1.9, 0.4);
  const rightEye = blockMesh(0.16, 0.16, 0.08, eyeMaterial, 0.2, 1.9, 0.4);

  group.add(body, head, leftArm, rightArm, leftFoot, rightFoot, leftEye, rightEye);

  if (type.name === 'Ash Oaf') {
    group.add(blockMesh(1.36, 0.24, 0.92, trimMaterial, 0, 1.34, -0.02));
  }

  if (type.name === 'Cinder Imp') {
    group.add(blockMesh(0.22, 0.38, 0.22, trimMaterial, -0.34, 2.32, 0));
    group.add(blockMesh(0.22, 0.38, 0.22, trimMaterial, 0.34, 2.32, 0));
  }

  const incomingBeacon = createIncomingBeacon(type);
  const targetMarker = createTargetMarker(type);
  group.add(incomingBeacon, targetMarker);
  group.userData.incomingBeacon = incomingBeacon;
  group.userData.targetMarker = targetMarker;

  return group;
}

function createMedicHeartMesh(type) {
  const group = new THREE.Group();
  const heartMaterial = new THREE.MeshStandardMaterial({
    color: type.body,
    emissive: type.body,
    emissiveIntensity: 0.5,
    roughness: 0.42,
    metalness: 0.02,
  });
  const highlightMaterial = new THREE.MeshStandardMaterial({
    color: type.trim,
    emissive: type.trim,
    emissiveIntensity: 0.62,
    roughness: 0.34,
    metalness: 0.02,
  });
  const shineMaterial = new THREE.MeshStandardMaterial({
    color: type.eye,
    emissive: type.eye,
    emissiveIntensity: 1.6,
    roughness: 0.25,
  });

  const cell = 0.3;
  const rows = [
    { y: 2.22, xs: [-0.45, 0.45], material: highlightMaterial },
    { y: 1.94, xs: [-0.75, -0.45, -0.15, 0.15, 0.45, 0.75], material: heartMaterial },
    { y: 1.66, xs: [-0.9, -0.6, -0.3, 0, 0.3, 0.6, 0.9], material: heartMaterial },
    { y: 1.38, xs: [-0.6, -0.3, 0, 0.3, 0.6], material: heartMaterial },
    { y: 1.1, xs: [-0.3, 0, 0.3], material: heartMaterial },
    { y: 0.82, xs: [0], material: heartMaterial },
  ];

  for (const row of rows) {
    for (const x of row.xs) {
      group.add(blockMesh(cell, cell, 0.46, row.material, x, row.y, 0));
    }
  }

  group.add(blockMesh(0.18, 0.18, 0.5, shineMaterial, -0.42, 2.02, 0.08));
  group.add(blockMesh(0.12, 0.12, 0.5, shineMaterial, -0.2, 1.8, 0.09));

  const medicGlow = new THREE.PointLight(type.body, 1.35, 5.2, 2.0);
  medicGlow.position.set(0, 1.5, 0.45);
  group.add(medicGlow);

  const incomingBeacon = createIncomingBeacon(type);
  const targetMarker = createTargetMarker(type);
  group.add(incomingBeacon, targetMarker);
  group.userData.incomingBeacon = incomingBeacon;
  group.userData.targetMarker = targetMarker;

  return group;
}

function bossMat(type) {
  return new THREE.MeshStandardMaterial({
    color: type.body, emissive: type.body, emissiveIntensity: 0.56,
    roughness: 0.58, metalness: 0.03,
  });
}
function bossTrimMat(type) {
  return new THREE.MeshStandardMaterial({
    color: type.trim, emissive: type.trim, emissiveIntensity: 0.82,
    roughness: 0.46, metalness: 0.08,
  });
}
function bossEyeMat(type) {
  return new THREE.MeshStandardMaterial({
    color: type.eye, emissive: type.eye, emissiveIntensity: 2.2, roughness: 0.4,
  });
}
function finishBossGroup(group, type, beaconY = 2.9) {
  const glow = new THREE.PointLight(type.eye, 1.35, 5.5, 2.1);
  glow.position.set(0, 1.45, 0.45);
  group.add(glow);
  const incomingBeacon = createIncomingBeacon(type);
  incomingBeacon.position.set(0, beaconY, 0);
  const targetMarker = createTargetMarker(type);
  group.add(incomingBeacon, targetMarker);
  group.userData.incomingBeacon = incomingBeacon;
  group.userData.targetMarker = targetMarker;
  return group;
}
function createSpecificBossMesh(type) {
  if (type.name === 'Crimson Bulwark') return createDragonBossMesh(type);
  if (type.name === 'Verdant Colossus') return createDevilBossMesh(type);
  if (type.name === 'Storm Warden') return createSkeletonBossMesh(type);
  return createPhoenixBossMesh(type);
}

function createDragonBossMesh(type) {
  const group = new THREE.Group();
  const bodyMat = bossMat(type);
  const trimMat = bossTrimMat(type);
  const eyeMat = bossEyeMat(type);
  // Legs
  group.add(blockMesh(0.44, 0.48, 0.56, bodyMat, -0.38, 0.44, 0.1));
  group.add(blockMesh(0.44, 0.48, 0.56, bodyMat, 0.38, 0.44, 0.1));
  // Feet
  group.add(blockMesh(0.54, 0.2, 0.64, trimMat, -0.38, 0.16, 0.22));
  group.add(blockMesh(0.54, 0.2, 0.64, trimMat, 0.38, 0.16, 0.22));
  // Torso
  group.add(blockMesh(1.2, 1.06, 0.88, bodyMat, 0, 0.9, 0));
  // Spine ridges
  group.add(blockMesh(0.12, 0.28, 0.12, trimMat, 0, 1.5, -0.28));
  group.add(blockMesh(0.12, 0.22, 0.12, trimMat, 0, 1.24, -0.3));
  group.add(blockMesh(0.12, 0.18, 0.12, trimMat, 0, 0.98, -0.3));
  // Neck
  group.add(blockMesh(0.52, 0.6, 0.52, bodyMat, 0, 1.65, 0.12));
  // Head
  group.add(blockMesh(0.84, 0.52, 0.62, trimMat, 0, 2.1, 0.18));
  // Snout
  group.add(blockMesh(0.6, 0.3, 0.44, bodyMat, 0, 2.0, 0.52));
  // Nostrils
  group.add(blockMesh(0.1, 0.1, 0.08, eyeMat, -0.18, 2.07, 0.75));
  group.add(blockMesh(0.1, 0.1, 0.08, eyeMat, 0.18, 2.07, 0.75));
  // Eyes
  group.add(blockMesh(0.18, 0.18, 0.08, eyeMat, -0.28, 2.22, 0.5));
  group.add(blockMesh(0.18, 0.18, 0.08, eyeMat, 0.28, 2.22, 0.5));
  // Horns
  const lHorn = blockMesh(0.14, 0.44, 0.14, trimMat, -0.32, 2.46, 0.06);
  lHorn.rotation.z = 0.38;
  group.add(lHorn);
  const rHorn = blockMesh(0.14, 0.44, 0.14, trimMat, 0.32, 2.46, 0.06);
  rHorn.rotation.z = -0.38;
  group.add(rHorn);
  // Wings — left
  group.add(blockMesh(0.36, 0.7, 0.18, trimMat, -0.84, 1.22, -0.06));
  group.add(blockMesh(0.32, 0.84, 0.14, trimMat, -1.28, 1.28, 0));
  group.add(blockMesh(0.24, 0.58, 0.12, trimMat, -1.66, 1.3, 0.04));
  group.add(blockMesh(0.44, 0.62, 0.07, bodyMat, -1.06, 1.14, -0.02));
  group.add(blockMesh(0.36, 0.5, 0.07, bodyMat, -1.46, 1.18, 0.02));
  // Wings — right
  group.add(blockMesh(0.36, 0.7, 0.18, trimMat, 0.84, 1.22, -0.06));
  group.add(blockMesh(0.32, 0.84, 0.14, trimMat, 1.28, 1.28, 0));
  group.add(blockMesh(0.24, 0.58, 0.12, trimMat, 1.66, 1.3, 0.04));
  group.add(blockMesh(0.44, 0.62, 0.07, bodyMat, 1.06, 1.14, -0.02));
  group.add(blockMesh(0.36, 0.5, 0.07, bodyMat, 1.46, 1.18, 0.02));
  // Tail
  group.add(blockMesh(0.4, 0.36, 0.48, bodyMat, 0, 0.62, -0.64));
  group.add(blockMesh(0.3, 0.28, 0.38, bodyMat, 0, 0.5, -1.1));
  group.add(blockMesh(0.22, 0.2, 0.28, trimMat, 0, 0.4, -1.46));
  return finishBossGroup(group, type);
}

function createDevilBossMesh(type) {
  const group = new THREE.Group();
  const bodyMat = bossMat(type);
  const trimMat = bossTrimMat(type);
  const eyeMat = bossEyeMat(type);
  // Legs
  group.add(blockMesh(0.42, 0.58, 0.5, bodyMat, -0.32, 0.52, 0.02));
  group.add(blockMesh(0.42, 0.58, 0.5, bodyMat, 0.32, 0.52, 0.02));
  // Hooves
  group.add(blockMesh(0.38, 0.28, 0.42, trimMat, -0.32, 0.16, 0.08));
  group.add(blockMesh(0.38, 0.28, 0.42, trimMat, 0.32, 0.16, 0.08));
  // Pelvis
  group.add(blockMesh(0.98, 0.22, 0.7, bodyMat, 0, 0.28, 0));
  // Torso
  group.add(blockMesh(1.22, 1.3, 0.78, bodyMat, 0, 0.9, 0));
  // Oversized arms
  group.add(blockMesh(0.38, 1.12, 0.5, bodyMat, -0.86, 0.9, 0.02));
  group.add(blockMesh(0.38, 1.12, 0.5, bodyMat, 0.86, 0.9, 0.02));
  // Clawed hands
  group.add(blockMesh(0.44, 0.24, 0.52, trimMat, -0.86, 0.24, 0.06));
  group.add(blockMesh(0.44, 0.24, 0.52, trimMat, 0.86, 0.24, 0.06));
  // Claws
  for (let i = -1; i <= 1; i++) {
    group.add(blockMesh(0.08, 0.16, 0.08, trimMat, -0.86 + i * 0.14, 0.08, 0.22));
    group.add(blockMesh(0.08, 0.16, 0.08, trimMat, 0.86 + i * 0.14, 0.08, 0.22));
  }
  // Shoulder guards
  group.add(blockMesh(0.28, 0.28, 0.24, trimMat, -0.82, 1.58, -0.04));
  group.add(blockMesh(0.22, 0.2, 0.2, trimMat, -0.98, 1.78, -0.04));
  group.add(blockMesh(0.28, 0.28, 0.24, trimMat, 0.82, 1.58, -0.04));
  group.add(blockMesh(0.22, 0.2, 0.2, trimMat, 0.98, 1.78, -0.04));
  // Head
  group.add(blockMesh(0.9, 0.72, 0.76, trimMat, 0, 1.9, 0.02));
  // Heavy brow
  group.add(blockMesh(0.88, 0.2, 0.26, bodyMat, 0, 2.14, 0.3));
  // Eyes
  group.add(blockMesh(0.2, 0.2, 0.08, eyeMat, -0.24, 1.96, 0.42));
  group.add(blockMesh(0.2, 0.2, 0.08, eyeMat, 0.24, 1.96, 0.42));
  // Nose + mouth
  group.add(blockMesh(0.24, 0.14, 0.12, bodyMat, 0, 1.76, 0.42));
  group.add(blockMesh(0.46, 0.1, 0.08, trimMat, 0, 1.6, 0.42));
  // Fangs
  group.add(blockMesh(0.08, 0.16, 0.08, trimMat, -0.14, 1.5, 0.42));
  group.add(blockMesh(0.08, 0.16, 0.08, trimMat, 0.14, 1.5, 0.42));
  // Curved horns — left (stepping outward and up)
  group.add(blockMesh(0.18, 0.22, 0.18, trimMat, -0.36, 2.32, 0));
  group.add(blockMesh(0.16, 0.3, 0.16, trimMat, -0.56, 2.52, 0));
  group.add(blockMesh(0.14, 0.26, 0.14, trimMat, -0.72, 2.74, 0));
  group.add(blockMesh(0.1, 0.22, 0.1, trimMat, -0.82, 2.94, 0));
  // Curved horns — right
  group.add(blockMesh(0.18, 0.22, 0.18, trimMat, 0.36, 2.32, 0));
  group.add(blockMesh(0.16, 0.3, 0.16, trimMat, 0.56, 2.52, 0));
  group.add(blockMesh(0.14, 0.26, 0.14, trimMat, 0.72, 2.74, 0));
  group.add(blockMesh(0.1, 0.22, 0.1, trimMat, 0.82, 2.94, 0));
  // Fork tail
  group.add(blockMesh(0.24, 0.24, 0.44, bodyMat, 0, 0.44, -0.52));
  group.add(blockMesh(0.2, 0.2, 0.38, bodyMat, 0, 0.34, -0.92));
  group.add(blockMesh(0.16, 0.16, 0.3, bodyMat, 0, 0.26, -1.24));
  group.add(blockMesh(0.1, 0.22, 0.1, trimMat, -0.1, 0.2, -1.52));
  group.add(blockMesh(0.1, 0.22, 0.1, trimMat, 0.1, 0.2, -1.52));
  return finishBossGroup(group, type, 3.2);
}

function createSkeletonBossMesh(type) {
  const group = new THREE.Group();
  const bodyMat = bossMat(type);
  const trimMat = bossTrimMat(type);
  const eyeMat = bossEyeMat(type);
  // Feet
  group.add(blockMesh(0.36, 0.2, 0.54, bodyMat, -0.34, 0.08, 0.14));
  group.add(blockMesh(0.36, 0.2, 0.54, bodyMat, 0.34, 0.08, 0.14));
  // Knee joints
  group.add(blockMesh(0.32, 0.22, 0.38, trimMat, -0.34, 0.24, 0.04));
  group.add(blockMesh(0.32, 0.22, 0.38, trimMat, 0.34, 0.24, 0.04));
  // Shins
  group.add(blockMesh(0.28, 0.56, 0.32, bodyMat, -0.34, 0.56, 0.02));
  group.add(blockMesh(0.28, 0.56, 0.32, bodyMat, 0.34, 0.56, 0.02));
  // Pelvis
  group.add(blockMesh(1.0, 0.26, 0.62, bodyMat, 0, 0.28, 0));
  // Spine
  group.add(blockMesh(0.2, 1.06, 0.2, bodyMat, 0, 0.94, -0.1));
  // Ribcage
  for (let i = 0; i < 4; i++) {
    const y = 0.66 + i * 0.22;
    const tilt = 0.28 + i * 0.06;
    const lRib = blockMesh(0.5, 0.1, 0.1, trimMat, -0.38, y, 0.06);
    lRib.rotation.z = tilt;
    group.add(lRib);
    const rRib = blockMesh(0.5, 0.1, 0.1, trimMat, 0.38, y, 0.06);
    rRib.rotation.z = -tilt;
    group.add(rRib);
  }
  // Clavicles
  group.add(blockMesh(0.62, 0.14, 0.36, bodyMat, -0.58, 1.56, 0));
  group.add(blockMesh(0.62, 0.14, 0.36, bodyMat, 0.58, 1.56, 0));
  // Upper arms
  group.add(blockMesh(0.22, 0.66, 0.26, bodyMat, -0.88, 1.14, 0.02));
  group.add(blockMesh(0.22, 0.66, 0.26, bodyMat, 0.88, 1.14, 0.02));
  // Elbow joints
  group.add(blockMesh(0.26, 0.2, 0.3, trimMat, -0.88, 0.76, 0.04));
  group.add(blockMesh(0.26, 0.2, 0.3, trimMat, 0.88, 0.76, 0.04));
  // Forearms
  group.add(blockMesh(0.2, 0.52, 0.22, bodyMat, -0.88, 0.44, 0.02));
  group.add(blockMesh(0.2, 0.52, 0.22, bodyMat, 0.88, 0.44, 0.02));
  // Skull (wider at top)
  group.add(blockMesh(0.8, 0.56, 0.68, trimMat, 0, 2.08, 0.02));
  // Cheekbones
  group.add(blockMesh(0.16, 0.16, 0.38, bodyMat, -0.38, 1.88, 0.08));
  group.add(blockMesh(0.16, 0.16, 0.38, bodyMat, 0.38, 1.88, 0.08));
  // Jaw
  group.add(blockMesh(0.64, 0.2, 0.48, bodyMat, 0, 1.72, 0.06));
  // Eye sockets (dark recess + glowing core)
  group.add(blockMesh(0.24, 0.22, 0.14, bodyMat, -0.2, 2.12, 0.28));
  group.add(blockMesh(0.24, 0.22, 0.14, bodyMat, 0.2, 2.12, 0.28));
  group.add(blockMesh(0.12, 0.12, 0.08, eyeMat, -0.2, 2.12, 0.38));
  group.add(blockMesh(0.12, 0.12, 0.08, eyeMat, 0.2, 2.12, 0.38));
  // Nasal cavity
  group.add(blockMesh(0.14, 0.18, 0.12, bodyMat, 0, 1.94, 0.34));
  // Teeth
  for (let i = -2; i <= 2; i++) {
    group.add(blockMesh(0.1, 0.14, 0.08, trimMat, i * 0.12, 1.74, 0.3));
  }
  // Crown / circlet
  group.add(blockMesh(0.86, 0.1, 0.74, bodyMat, 0, 2.38, 0));
  group.add(blockMesh(0.14, 0.24, 0.14, trimMat, -0.3, 2.48, 0));
  group.add(blockMesh(0.14, 0.34, 0.14, trimMat, 0, 2.56, 0));
  group.add(blockMesh(0.14, 0.24, 0.14, trimMat, 0.3, 2.48, 0));
  return finishBossGroup(group, type);
}

function createPhoenixBossMesh(type) {
  const group = new THREE.Group();
  const bodyMat = bossMat(type);
  const trimMat = bossTrimMat(type);
  const eyeMat = bossEyeMat(type);
  // Legs
  group.add(blockMesh(0.26, 0.52, 0.28, bodyMat, -0.3, 0.56, 0.06));
  group.add(blockMesh(0.26, 0.52, 0.28, bodyMat, 0.3, 0.56, 0.06));
  // Talons
  group.add(blockMesh(0.36, 0.14, 0.14, trimMat, -0.36, 0.26, 0.18));
  group.add(blockMesh(0.36, 0.14, 0.14, trimMat, 0.36, 0.26, 0.18));
  group.add(blockMesh(0.14, 0.14, 0.3, trimMat, -0.28, 0.2, 0.28));
  group.add(blockMesh(0.14, 0.14, 0.3, trimMat, 0.28, 0.2, 0.28));
  // Body
  group.add(blockMesh(0.96, 0.82, 0.82, bodyMat, 0, 1.08, 0));
  // Breast
  group.add(blockMesh(0.76, 0.6, 0.38, trimMat, 0, 0.96, 0.34));
  // Neck
  group.add(blockMesh(0.38, 0.44, 0.38, bodyMat, 0, 1.72, 0.1));
  // Head
  group.add(blockMesh(0.62, 0.56, 0.58, trimMat, 0, 2.18, 0.08));
  // Beak
  group.add(blockMesh(0.24, 0.2, 0.44, bodyMat, 0, 2.12, 0.46));
  group.add(blockMesh(0.2, 0.14, 0.36, trimMat, 0, 2.22, 0.56));
  // Eyes
  group.add(blockMesh(0.14, 0.16, 0.08, eyeMat, -0.24, 2.24, 0.38));
  group.add(blockMesh(0.14, 0.16, 0.08, eyeMat, 0.24, 2.24, 0.38));
  // Crest feathers
  group.add(blockMesh(0.1, 0.3, 0.1, trimMat, -0.16, 2.58, 0.04));
  group.add(blockMesh(0.1, 0.44, 0.1, trimMat, 0, 2.64, 0.04));
  group.add(blockMesh(0.1, 0.3, 0.1, trimMat, 0.16, 2.58, 0.04));
  // Wings — left
  group.add(blockMesh(0.42, 0.76, 0.2, bodyMat, -0.86, 1.26, -0.04));
  group.add(blockMesh(0.38, 0.88, 0.16, bodyMat, -1.3, 1.3, 0));
  group.add(blockMesh(0.32, 0.76, 0.14, trimMat, -1.68, 1.3, 0.04));
  group.add(blockMesh(0.26, 0.56, 0.12, trimMat, -2.0, 1.26, 0.08));
  for (let i = 0; i < 4; i++) {
    group.add(blockMesh(0.14, 0.28, 0.1, trimMat, -1.5 - i * 0.16, 0.84, 0.04 + i * 0.02));
  }
  // Wings — right
  group.add(blockMesh(0.42, 0.76, 0.2, bodyMat, 0.86, 1.26, -0.04));
  group.add(blockMesh(0.38, 0.88, 0.16, bodyMat, 1.3, 1.3, 0));
  group.add(blockMesh(0.32, 0.76, 0.14, trimMat, 1.68, 1.3, 0.04));
  group.add(blockMesh(0.26, 0.56, 0.12, trimMat, 2.0, 1.26, 0.08));
  for (let i = 0; i < 4; i++) {
    group.add(blockMesh(0.14, 0.28, 0.1, trimMat, 1.5 + i * 0.16, 0.84, 0.04 + i * 0.02));
  }
  // Flame tail feathers
  group.add(blockMesh(0.28, 0.6, 0.18, trimMat, 0, 0.76, -0.56));
  group.add(blockMesh(0.18, 0.72, 0.14, trimMat, -0.28, 0.7, -0.74));
  group.add(blockMesh(0.18, 0.72, 0.14, trimMat, 0.28, 0.7, -0.74));
  group.add(blockMesh(0.14, 0.56, 0.12, trimMat, -0.5, 0.62, -0.88));
  group.add(blockMesh(0.14, 0.56, 0.12, trimMat, 0.5, 0.62, -0.88));
  group.add(blockMesh(0.1, 0.4, 0.1, trimMat, -0.68, 0.54, -0.98));
  group.add(blockMesh(0.1, 0.4, 0.1, trimMat, 0.68, 0.54, -0.98));
  return finishBossGroup(group, type);
}

function createIncomingBeacon(type) {
  const material = new THREE.MeshBasicMaterial({
    color: type.eye,
    transparent: true,
    opacity: 0.58,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const beacon = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.42, 0.42), material);
  beacon.position.set(0, 2.72, 0);
  return beacon;
}

function createTargetMarker(type) {
  const marker = new THREE.Group();
  const material = new THREE.MeshBasicMaterial({
    color: type.eye,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const longSide = new THREE.BoxGeometry(1.85, 0.055, 0.12);
  const shortSide = new THREE.BoxGeometry(0.12, 0.055, 1.85);
  const front = new THREE.Mesh(longSide, material);
  const back = new THREE.Mesh(longSide.clone(), material);
  const left = new THREE.Mesh(shortSide, material);
  const right = new THREE.Mesh(shortSide.clone(), material);
  front.position.set(0, 0.08, 0.92);
  back.position.set(0, 0.08, -0.92);
  left.position.set(-0.92, 0.08, 0);
  right.position.set(0.92, 0.08, 0);
  marker.add(front, back, left, right);
  marker.visible = false;
  marker.userData.material = material;
  return marker;
}

function blockMesh(width, height, depth, material, x, y, z) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function createWorld() {
  createGround();
  createTorches();
  createTrees();
  createPathMarkers();
}

function createGround() {
  const geometry = new THREE.BoxGeometry(1, 0.55, 1);
  const material = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    vertexColors: true,
    roughness: 0.96,
    metalness: 0.0,
  });
  const columns = 23;
  const rows = 74;
  const mesh = new THREE.InstancedMesh(geometry, material, columns * rows);
  mesh.castShadow = false;
  mesh.receiveShadow = true;

  let index = 0;
  for (let z = -58; z < 16; z += 1) {
    for (let x = -11; x <= 11; x += 1) {
      const pathAmount = Math.max(0, 1 - Math.abs(x) / 3.2);
      const ridge = Math.sin(x * 1.3 + z * 0.27) * 0.12 + Math.cos(z * 0.42) * 0.08;
      const y = -0.38 + ridge * (1 - pathAmount * 0.8);
      reusableVector.set(x, y, z);
      reusableQuaternion.identity();
      reusableVectorTwo.set(1, 1, 1);
      reusableMatrix.compose(reusableVector, reusableQuaternion, reusableVectorTwo);
      mesh.setMatrixAt(index, reusableMatrix);
      index += 1;
    }
  }
  mesh.instanceMatrix.needsUpdate = true;
  world.add(mesh);
  sceneGroundMesh = mesh;
}

function createTorches() {
  const shaftMat = new THREE.MeshStandardMaterial({ color: 0x2a1a10, roughness: 0.88 });
  const bandMat = new THREE.MeshStandardMaterial({ color: 0x7a6040, roughness: 0.48, metalness: 0.5 });
  sceneCrystalMat = new THREE.MeshStandardMaterial({
    color: 0x58dfcf, emissive: 0x2dd4bf, emissiveIntensity: 2.0,
    roughness: 0.1, metalness: 0.2, transparent: true, opacity: 0.9,
  });

  for (const x of [-5.35, 5.35]) {
    const z = WALL_Z - 0.2;

    // Wand group — pivot at the base so the whole wand rotates as one unit
    const wandGroup = new THREE.Group();
    wandGroup.position.set(x, 0, z);
    world.add(wandGroup);
    wandGroups.push(wandGroup);

    // Shaft (local coords: x=0, z=0 relative to wand base)
    wandGroup.add(blockMesh(0.15, 1.85, 0.15, shaftMat, 0, 0.925, 0));
    // Decorative bands
    wandGroup.add(blockMesh(0.24, 0.1, 0.24, bandMat, 0, 0.38, 0));
    wandGroup.add(blockMesh(0.24, 0.1, 0.24, bandMat, 0, 1.0, 0));
    wandGroup.add(blockMesh(0.24, 0.1, 0.24, bandMat, 0, 1.74, 0));
    // Crystal cage (metal brackets framing the orb)
    wandGroup.add(blockMesh(0.32, 0.1, 0.32, bandMat, 0, 1.88, 0));
    wandGroup.add(blockMesh(0.32, 0.1, 0.32, bandMat, 0, 2.34, 0));

    // Crystal cluster group (pulsed as a unit, local to wandGroup)
    const crystalGroup = new THREE.Group();
    crystalGroup.position.set(0, 2.11, 0);
    const core = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.54, 0.36), sceneCrystalMat);
    core.castShadow = true;
    crystalGroup.add(core);
    const leftShard = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.3, 0.14), sceneCrystalMat);
    leftShard.position.set(-0.2, 0.08, 0);
    leftShard.rotation.z = 0.35;
    leftShard.castShadow = true;
    crystalGroup.add(leftShard);
    const rightShard = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.3, 0.14), sceneCrystalMat);
    rightShard.position.set(0.2, 0.08, 0);
    rightShard.rotation.z = -0.35;
    rightShard.castShadow = true;
    crystalGroup.add(rightShard);
    wandGroup.add(crystalGroup);
    torchFlames.push({ mesh: crystalGroup, phase: Math.random() * Math.PI * 2 });

    // Point light parented to the wand so it follows the swing
    const light = new THREE.PointLight(0x2dd4bf, 1.6, 14, 2);
    light.position.set(0, 2.2, 0);
    light.userData.phase = Math.random() * Math.PI * 2;
    wandGroup.add(light);
    torchLights.push(light);
  }
}

function createTrees() {
  sceneTrunkMaterial = new THREE.MeshStandardMaterial({ color: 0x513820, roughness: 0.9 });
  sceneLeafMaterials = [
    new THREE.MeshStandardMaterial({ color: 0x1f5b38, roughness: 0.9 }),
    new THREE.MeshStandardMaterial({ color: 0x2f7247, roughness: 0.9 }),
    new THREE.MeshStandardMaterial({ color: 0x163d30, roughness: 0.92 }),
  ];

  for (let index = 0; index < 34; index += 1) {
    const side = index % 2 === 0 ? -1 : 1;
    const x = side * (7.8 + Math.random() * 2.3);
    const z = -52 + Math.random() * 62;
    const height = 1.1 + Math.random() * 0.7;
    const tree = new THREE.Group();
    tree.position.set(x, 0, z);
    tree.add(blockMesh(0.55, height, 0.55, sceneTrunkMaterial, 0, height * 0.5, 0));

    const leafMaterial = sceneLeafMaterials[index % sceneLeafMaterials.length];
    const lowerLeaves = blockMesh(1.5, 1.1, 1.5, leafMaterial, 0, height + 0.72, 0);
    const upperLeaves = blockMesh(1.05, 0.86, 1.05, leafMaterial, 0, height + 1.38, 0);
    tree.add(lowerLeaves);
    tree.add(upperLeaves);
    world.add(tree);
    scrollingTrees.push({
      group: tree,
      speed: 0.8 + Math.random() * 0.45,
    });
    canopyBlocks.push({
      mesh: lowerLeaves,
      baseY: lowerLeaves.position.y,
      phase: Math.random() * Math.PI * 2,
      amount: 0.018 + Math.random() * 0.018,
    });
    canopyBlocks.push({
      mesh: upperLeaves,
      baseY: upperLeaves.position.y,
      phase: Math.random() * Math.PI * 2,
      amount: 0.024 + Math.random() * 0.018,
    });
  }
}

function createPathMarkers() {
  pathMarkerMaterial = new THREE.MeshStandardMaterial({
    color: 0x58dfcf,
    emissive: 0x0e6861,
    emissiveIntensity: 0.28,
    roughness: 0.55,
  });
  for (let z = PATH_MARKER_MIN_Z; z <= PATH_MARKER_MAX_Z; z += PATH_MARKER_SPACING) {
    const leftMarker = blockMesh(0.22, 0.1, 1.1, pathMarkerMaterial, -3.4, 0.02, z);
    const rightMarker = blockMesh(0.22, 0.1, 1.1, pathMarkerMaterial, 3.4, 0.02, z);
    world.add(leftMarker);
    world.add(rightMarker);
    pathMarkerBlocks.push({ mesh: leftMarker, baseY: leftMarker.position.y, phase: z * 0.3 });
    pathMarkerBlocks.push({ mesh: rightMarker, baseY: rightMarker.position.y, phase: z * 0.3 + Math.PI });
  }
}

function createSky() {
  const moonGeometry = new THREE.SphereGeometry(3.2, 24, 16);
  const moonMaterial = new THREE.MeshBasicMaterial({ color: 0xf2f0df });
  moon = new THREE.Mesh(moonGeometry, moonMaterial);
  moon.position.set(20, 18, -42);
  scene.add(moon);

  const starGeometry = new THREE.BufferGeometry();
  const positions = [];
  for (let index = 0; index < 260; index += 1) {
    positions.push((Math.random() - 0.5) * 90, Math.random() * 38 + 8, -Math.random() * 90 - 8);
  }
  starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  const starMaterial = new THREE.PointsMaterial({
    color: 0xf2f0df,
    size: 0.08,
    transparent: true,
    opacity: 0.72,
  });
  starField = new THREE.Points(starGeometry, starMaterial);
  scene.add(starField);
}

function buildCloudGroup(material, template) {
  const group = new THREE.Group();
  if (template === 0) {
    group.add(blockMesh(5.2, 0.8, 2.0, material,  0.0, 0.0,  0));
    group.add(blockMesh(2.8, 1.2, 1.7, material, -1.2, 0.52, 0));
    group.add(blockMesh(3.2, 1.5, 1.6, material,  0.6, 0.68, 0));
    group.add(blockMesh(2.2, 1.0, 1.5, material,  2.2, 0.45, 0));
  } else if (template === 1) {
    group.add(blockMesh(4.0, 0.7, 1.8, material,  0.0, 0.0,  0));
    group.add(blockMesh(2.4, 1.3, 1.6, material,  0.0, 0.60, 0));
    group.add(blockMesh(1.6, 0.9, 1.4, material, -1.6, 0.40, 0));
    group.add(blockMesh(1.4, 0.8, 1.3, material,  1.8, 0.38, 0));
  } else {
    group.add(blockMesh(6.0, 0.75, 2.2, material,  0.0, 0.0,  0));
    group.add(blockMesh(2.0, 1.0,  1.8, material, -2.4, 0.44, 0));
    group.add(blockMesh(2.6, 1.2,  1.7, material, -0.6, 0.58, 0));
    group.add(blockMesh(2.2, 1.1,  1.6, material,  1.4, 0.50, 0));
    group.add(blockMesh(1.8, 0.85, 1.5, material,  2.9, 0.40, 0));
  }
  return group;
}

function createClouds() {
  const cloudMaterial = new THREE.MeshBasicMaterial({
    color: 0xf0f2f8,
    transparent: true,
    opacity: 0.82,
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
  ];
  for (const cfg of configs) {
    const group = buildCloudGroup(cloudMaterial, cfg.t);
    group.position.set(cfg.x, cfg.y, cfg.z);
    group.scale.setScalar(cfg.scale);
    scene.add(group);
    clouds.push({ group, speed: cfg.speed });
  }
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
  const staffX = side === 0 ? -6.7 : 6.7;
  if (wandGroups[side]) triggerWandSwing(wandGroups[side]);
  const start = new THREE.Vector3(staffX, 2.38, WALL_Z - 0.2);
  const end = targetPosition.clone();
  end.y += 1.2;
  const distance = start.distanceTo(end);
  const mid = start.clone().lerp(end, 0.5);

  // White core beam
  const coreGeo = new THREE.BoxGeometry(0.14, 0.14, distance);
  const coreMat = new THREE.MeshBasicMaterial({
    color: 0xffffff, transparent: true, opacity: 1,
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
    color: 0x58dfcf, transparent: true, opacity: 0.48,
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
}

function spawnBossRock(enemy) {
  const start = enemy.group.position.clone();
  start.y += 1.8 * enemy.type.scale;
  const end = new THREE.Vector3(THREE.MathUtils.randFloat(-0.45, 0.45), 1.2 + Math.random() * 0.25, WALL_Z + 0.76);
  const rockMaterial = new THREE.MeshStandardMaterial({
    color: 0x5a4636,
    emissive: enemy.type.trim,
    emissiveIntensity: 0.14,
    roughness: 0.92,
    metalness: 0.02,
  });
  const emberMaterial = new THREE.MeshBasicMaterial({
    color: enemy.type.eye,
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

function spawnDebris(position, type) {
  const geometry = new THREE.BoxGeometry(0.18, 0.18, 0.18);
  for (let index = 0; index < 12; index += 1) {
    const material = new THREE.MeshStandardMaterial({
      color: index % 3 === 0 ? type.trim : type.body,
      transparent: true,
      opacity: 1,
      roughness: 0.8,
    });
    const mesh = new THREE.Mesh(geometry.clone(), material);
    mesh.position.copy(position);
    mesh.position.y += 0.8 + Math.random() * 0.5;
    effectsGroup.add(mesh);
    debris.push({
      mesh,
      life: 0.7 + Math.random() * 0.36,
      maxLife: 0.9,
      velocity: new THREE.Vector3((Math.random() - 0.5) * 5.5, 2.8 + Math.random() * 3.6, (Math.random() - 0.5) * 5.5),
      spin: new THREE.Vector3(Math.random() * 8, Math.random() * 8, Math.random() * 8),
    });
  }
  geometry.dispose();
}

function removeEnemy(enemy) {
  const index = enemies.indexOf(enemy);
  if (index >= 0) enemies.splice(index, 1);
  enemyGroup.remove(enemy.group);
  labelsLayer.removeChild(enemy.label);
  disposeObject(enemy.group);
  if (activeTarget === enemy) activeTarget = null;
}

function clearEnemies() {
  for (const enemy of [...enemies]) removeEnemy(enemy);
}

function clearEffects() {
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
}

function disposeObject(object) {
  object.traverse((child) => {
    if (!child.isMesh) return;
    child.geometry.dispose();
    if (Array.isArray(child.material)) {
      for (const material of child.material) material.dispose();
    } else {
      child.material.dispose();
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
  return [...matches].sort((a, b) => b.group.position.z - a.group.position.z || a.searchPrompt.length - b.searchPrompt.length)[0];
}

function isEnemyTargetable(enemy) {
  return enemy.revealed && enemy.group.position.z < WALL_Z;
}

function prepareWavePlan() {
  bossWordsThisSet = chooseBossWordsForWave();
  introducedBossTermsThisSet = new Set();
  medicSpawnedThisSet = false;
  medicSpawnSlot = chooseMedicSpawnSlot(normalEnemyTarget);
  const previewableWords = definitionBossWordsForWave();
  bossPreviewSchedule = buildBossPreviewSchedule(normalEnemyTarget, previewableWords);
}

function definitionBossWordsForWave() {
  return bossWordsThisSet.filter(w => !w.isEquation);
}

function chooseMedicSpawnSlot(target) {
  if (target <= 2) return Math.max(1, target - 1);
  const earliest = Math.min(2, target - 1);
  const latest = Math.max(earliest, target - 2);
  return earliest + Math.floor(Math.random() * (latest - earliest + 1));
}

function shouldSpawnMedic() {
  return wavePhase === 'normal'
    && !medicSpawnedThisSet
    && normalEnemiesSpawned >= medicSpawnSlot;
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
  return MEDIUM_WORDS;
}

function choosePrompt() {
  const scheduledBossWord = wavePhase === 'normal' ? bossPreviewSchedule.get(normalEnemiesSpawned) : null;
  if (scheduledBossWord) return scheduledBossWord;

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
  if (waveSet >= 5) return [...MEDIUM_WORDS, ...HARD_WORDS];
  if (waveSet >= 3) return [...EASY_WORDS, ...MEDIUM_WORDS];
  return EASY_WORDS;
}

function chooseBossType(index) {
  return BOSS_TYPES[(waveSet + index - 1) % BOSS_TYPES.length];
}

function nextSpawnDelay() {
  const profile = currentDifficulty();
  return Math.max(
    profile.spawnMin,
    profile.spawnBase - Math.max(0, waveSet - 1) * profile.spawnGrowth + Math.random() * profile.spawnJitter
  );
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
    sunIntensity: moonLight.intensity,
    emberColor: emberLight.color.clone(),
    emberIntensity: seasonEmberIntensityBase,
    crystalColor: sceneCrystalMat ? sceneCrystalMat.color.clone() : new THREE.Color(0x58dfcf),
    crystalEmissive: sceneCrystalMat ? sceneCrystalMat.emissive.clone() : new THREE.Color(0x2dd4bf),
    staffLightColor: torchLights.length > 0 ? torchLights[0].color.clone() : new THREE.Color(0x2dd4bf),
    pathMarkerColor: pathMarkerMaterial ? pathMarkerMaterial.color.clone() : new THREE.Color(0x58dfcf),
    pathMarkerEmissive: pathMarkerMaterial ? pathMarkerMaterial.emissive.clone() : new THREE.Color(0x0e6861),
    leafColors: sceneLeafMaterials.map(m => m.color.clone()),
    trunkColor: sceneTrunkMaterial ? sceneTrunkMaterial.color.clone() : new THREE.Color(0x513820),
    moonColor: moon ? moon.material.color.clone() : new THREE.Color(0xf2f0df),
    starOpacity: starField ? starField.material.opacity : 0.72,
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
    crystalColor: new THREE.Color(palette.crystalColor),
    crystalEmissive: new THREE.Color(palette.crystalEmissive),
    staffLightColor: new THREE.Color(palette.staffLightColor),
    pathMarkerColor: new THREE.Color(palette.pathMarkerColor),
    pathMarkerEmissive: new THREE.Color(palette.pathMarkerEmissive),
    leafColors: palette.leafColors.map(c => new THREE.Color(c)),
    trunkColor: new THREE.Color(palette.trunkColor),
    moonColor: new THREE.Color(palette.moonColor),
    starOpacity: palette.starOpacity,
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
  moonLight.intensity = palette.sunIntensity;
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
  if (moon) moon.material.color.setHex(palette.moonColor);
  if (starField) starField.material.opacity = palette.starOpacity;
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
  const from = buildSeasonFromScene();
  const to = buildSeasonTarget(palette);
  seasonFade = { from, to, palette, t: 0, duration: 3.5 };
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
  moonLight.intensity = THREE.MathUtils.lerp(from.sunIntensity, to.sunIntensity, t);
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
  if (starField) starField.material.opacity = THREE.MathUtils.lerp(from.starOpacity, to.starOpacity, t);

  if (seasonFade.t >= 1) {
    recolorGround(seasonFade.palette);
    seasonFade = null;
  }
}

function recolorGround(palette) {
  if (!sceneGroundMesh) return;
  const color = new THREE.Color();
  let index = 0;
  for (let z = -58; z < 16; z += 1) {
    for (let x = -11; x <= 11; x += 1) {
      if (Math.abs(x) < 3.1) {
        color.setHSL(palette.groundPath.h, palette.groundPath.s, palette.groundPath.lBase + Math.sin(z * 0.7) * 0.025);
      } else if ((x + z) % 7 === 0) {
        color.setHSL(palette.groundAlt1.h, palette.groundAlt1.s, palette.groundAlt1.l);
      } else {
        color.setHSL(palette.groundGrass.h, palette.groundGrass.s, palette.groundGrass.l + Math.sin(x * 2.3 + z * 1.7) * 0.03);
      }
      sceneGroundMesh.setColorAt(index, color);
      index += 1;
    }
  }
  sceneGroundMesh.instanceColor.needsUpdate = true;
}

const SPELLING_ALTS = [
  ['colour', 'color'],
  ['centre', 'center'],
  ['metre', 'meter'],
  ['litre', 'liter'],
  ['fibre', 'fiber'],
  ['ionise', 'ionize'],
  ['magnetise', 'magnetize'],
  ['analyse', 'analyze'],
  ['polarise', 'polarize'],
];

const SUPERSCRIPT_MAP = { '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4', '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9' };
const MATH_OPERATOR_INPUTS = new Set(['*', '+', '-', '=', '/', '×', 'x', 'X']);

function getInputCharacters(character) {
  const inputs = [];
  const base = normalizeCharacter(character);
  const alias = isMathOperatorInput(character) ? '' : normalizeCharacter(character, { multiplicationAlias: true });
  if (base) inputs.push({ value: base, equationOnly: false });
  if (alias && alias !== base) inputs.push({ value: alias, equationOnly: true });
  return inputs;
}

function isMathOperatorInput(character) {
  return MATH_OPERATOR_INPUTS.has(character);
}

function normalizeCharacter(character, options = {}) {
  if (/\s/.test(character)) return '';
  if (SUPERSCRIPT_MAP[character]) return SUPERSCRIPT_MAP[character];
  const normalized = character.toLowerCase();
  if (normalized === '×') return options.multiplicationAlias ? 'x' : '';
  if (normalized === '*') return options.multiplicationAlias ? 'x' : '*';
  return /^[a-z0-9=+\-*/.]$/.test(normalized) ? normalized : '';
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
  keyboardInput.focus({ preventScroll: true });
}

function resizeRenderer() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height, false);
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

function startBossPhase() {
  if (bossWordsThisSet.length === 0) prepareWavePlan();
  const missingPreviewWords = definitionBossWordsForWave()
    .filter(w => !introducedBossTermsThisSet.has(w.term));
  if (missingPreviewWords.length > 0) {
    const firstSlot = normalEnemiesSpawned;
    for (const [index, word] of missingPreviewWords.entries()) {
      bossPreviewSchedule.set(firstSlot + index, word);
    }
    normalEnemyTarget += missingPreviewWords.length;
    updateHud(true);
    return;
  }

  wavePhase = 'boss';
  bossesSpawned = 0;
  bossesDefeated = 0;
  bossSpawnTimer = currentDifficulty().bossWarningDelay;
  playBossWarningSound();
  showBanner('BOSS WAVE');
  updatePhaseDisplay();
}

function spawnBoss() {
  const wordData = bossWordsThisSet[bossesSpawned] || chooseBossWord();
  if (!bossWordsThisSet.some(w => w.term === wordData.term)) bossWordsThisSet.push(wordData);
  const bossType = chooseBossType(bossesSpawned);
  const lanes = [-5.0, 0, 5.0];
  const lane = lanes[bossesSpawned % lanes.length];
  spawnEnemy({ isBoss: true, wordData, bossType, lane, delay: 0 });
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
  stopMusicLoop(0.12);
  playWaveClearSound();
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

function advanceWaveSet() {
  playStartSound();
  waveSet += 1;
  wavePhase = 'normal';
  normalEnemyTarget = getNormalEnemyTarget(waveSet);
  normalEnemiesSpawned = 0;
  bossesSpawned = 0;
  bossesDefeated = 0;
  bossShotHits = 0;
  bossSpawnTimer = 0;
  prepareWavePlan();
  typedBuffer = '';
  activeTarget = null;
  spawnTimer = 1.25;
  mode = 'running';
  startMusicLoop(true);
  document.body.classList.add('is-running');
  messagePanel.hidden = true;
  messagePanel.classList.remove('is-cleared');
  setPauseButtonState(true, false);
  updateTypedDisplay();
  updateHud(true);
  updatePhaseDisplay();
  applySeasonForWave(waveSet);
  focusKeyboard();
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
    typingLabel.textContent = `BOSS ${bossesDefeated}/${BOSSES_PER_WAVE}`;
  } else {
    typingLabel.textContent = `${normalEnemiesSpawned}/${normalEnemyTarget}`;
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
