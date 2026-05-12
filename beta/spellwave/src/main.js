import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.164.1/build/three.module.js';
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
const keyboardInput = document.getElementById('keyboardInput');
const damageFlash = document.getElementById('damageFlash');
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
const LABEL_POSITION_EASE = 0.2;
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
const MASTER_VOLUME = 0.5;
const MUSIC_GAIN = 0.82;
const MUSIC_BASE_STEP = 0.18;
const MUSIC_TIMER_INTERVAL = 80;
const MUSIC_SCHEDULE_AHEAD = 0.34;
const MUSIC_MELODY = [
  523.25, 659.25, 783.99, 659.25, 587.33, 739.99, 880.0, 739.99,
  523.25, null, 659.25, 783.99, 987.77, 880.0, 739.99, 659.25,
  440.0, 523.25, 659.25, 523.25, 493.88, 587.33, 739.99, 587.33,
  392.0, null, 493.88, 587.33, 783.99, 739.99, 587.33, 493.88,
];
const MUSIC_BASS = [
  130.81, null, null, null, 98.0, null, null, null,
  116.54, null, null, null, 87.31, null, 98.0, null,
];
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
const pathMarkerBlocks = [];
const scrollingTrees = [];

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
let audioEnabled = loadAudioSetting();
let audioContext = null;
let masterGain = null;
let musicGain = null;
let musicTimer = null;
let musicStep = 0;
let nextMusicTime = 0;
let typedAttempts = 0;
let mistakeCount = 0;
let defeatedCount = 0;
let leakedCount = 0;
let bossShotHits = 0;
let bossesDefeated = 0;
let encounteredTerms = [];
let firstMedicHintShown = false;

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
  audioEnabled = !audioEnabled;
  saveAudioSetting(audioEnabled);
  updateAudioButton();
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

function startGame() {
  playStartSound();
  clearEnemies();
  clearEffects();
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
  if (score > bestScore) {
    bestScore = score;
    saveBestScore(score);
  }
  showMessage(
    'OVERRUN',
    'Wiped Out',
    `Score ${formatScore(score)} | Best ${formatScore(bestScore)}`,
    'Try Again',
    `${formatAccuracySummary()} · ${defeatedCount} defeated · ${leakedCount} leaked · ${elapsed.toFixed(0)}s`
  );
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
  const inputOptions = getInputCharacters(character);
  if (inputOptions.length === 0) return;
  typedAttempts += 1;

  for (const inputOption of inputOptions) {
    const next = typedBuffer + inputOption.value;
    const nextMatches = findMatches(next, inputOption);

    if (nextMatches.length > 0) {
      typedBuffer = next;
      activeTarget = chooseTarget(nextMatches);
      if (activeTarget.searchPrompt === typedBuffer) {
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

  health = Math.max(0, health - enemy.damage);
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
  if (health <= 0) endGame();
}

function bossShootPlayer(enemy) {
  spawnBossRock(enemy);
  playBossThrowSound();
}

function bossProjectileHitPlayer(enemy) {
  bossShotHits += 1;
  playBossImpactSound();

  if (bossShotHits % BOSS_SHOTS_PER_DAMAGE === 0) {
    health = Math.max(0, health - BOSS_SHOT_DAMAGE);
    streak = 0;
    damageTimer = 0.24;
    damageFlash.classList.add('show');
    window.setTimeout(() => damageFlash.classList.remove('show'), 120);
    playDamageSound(enemy);
    updateHud(true);
    updateTypedDisplay();
    if (health <= 0) endGame();
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
    effect.mesh.material.opacity = amount * 0.82;
    effect.mesh.scale.set(1, 1, Math.max(0.08, amount));
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
  emberLight.intensity = 2.1 + Math.sin(seconds * 5.8) * 0.34;
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
}

function updateLabels() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  const safeBounds = getLabelSafeBounds(height);
  const labelItems = [];

  for (const enemy of enemies) {
    renderPrompt(enemy);
    reusableVector.copy(enemy.group.position);
    reusableVector.y += 2.2 * enemy.type.scale;
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
    labelItems.push({ enemy, x, y, scale });
  }

  const layoutItems = labelItems.map((item) => {
    const { enemy, scale } = item;
    const labelWidth = enemy.label.offsetWidth * scale;
    const labelHeight = enemy.label.offsetHeight * scale;
    const x = THREE.MathUtils.clamp(
      item.x,
      LABEL_SAFE_MARGIN + labelWidth / 2,
      width - LABEL_SAFE_MARGIN - labelWidth / 2
    );
    const minY = safeBounds.top + labelHeight;
    const maxY = safeBounds.bottom;
    const y = THREE.MathUtils.clamp(item.y, minY, maxY);

    if (enemy.labelX === undefined) {
      enemy.labelX = x;
      enemy.labelY = y;
    } else {
      enemy.labelX += (x - enemy.labelX) * LABEL_POSITION_EASE;
      enemy.labelY += (y - enemy.labelY) * LABEL_POSITION_EASE;
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
    group.sort((a, b) => a.y - b.y || a.enemy.id - b.enemy.id);

    for (let index = 0; index < group.length; index += 1) {
      const item = group[index];
      item.y = THREE.MathUtils.clamp(item.y, item.minY, item.maxY);
      if (index === 0) continue;

      const previous = group[index - 1];
      const minBottom = previous.y + LABEL_STACK_GAP + item.height;
      if (item.y < minBottom) item.y = minBottom;
    }

    const last = group[group.length - 1];
    if (last && last.y > last.maxY) {
      const overflow = last.y - last.maxY;
      for (const item of group) item.y -= overflow;
    }

    for (let index = group.length - 2; index >= 0; index -= 1) {
      const item = group[index];
      const next = group[index + 1];
      const maxBottom = next.y - next.height - LABEL_STACK_GAP;
      if (item.y > maxBottom) item.y = maxBottom;
    }

    const first = group[0];
    if (first && first.y < first.minY) {
      const underflow = first.minY - first.y;
      for (const item of group) item.y += underflow;
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
  if (!activeTarget || !activeTarget.searchPrompt.startsWith(typedBuffer)) return typedBuffer;
  if (activeTarget.limitedParts) return typedBuffer;
  return activeTarget.prompt.slice(0, promptIndexForProgress(activeTarget.prompt, typedBuffer.length, {
    multiplicationAlias: activeTarget.isEquation,
  }));
}

function renderPrompt(enemy) {
  const matched = enemy.searchPrompt.startsWith(typedBuffer) && typedBuffer.length > 0;
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
  bestValue.textContent = formatScore(Math.max(bestScore, score));
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

  if (isBossType) {
    group.add(blockMesh(0.18, 0.28, 0.18, trimMaterial, -0.3, 2.32, 0));
    group.add(blockMesh(0.18, 0.44, 0.18, trimMaterial, 0, 2.42, 0));
    group.add(blockMesh(0.18, 0.28, 0.18, trimMaterial, 0.3, 2.32, 0));
    group.add(blockMesh(1.32, 0.24, 0.88, trimMaterial, 0, 1.42, -0.02));
    group.add(blockMesh(0.28, 0.28, 0.12, eyeMaterial, 0, 1.22, 0.43));
    group.add(blockMesh(0.26, 0.48, 0.26, trimMaterial, -0.58, 2.2, 0));
    group.add(blockMesh(0.26, 0.48, 0.26, trimMaterial, 0.58, 2.2, 0));
    const bossGlow = new THREE.PointLight(type.eye, 1.35, 5.5, 2.1);
    bossGlow.position.set(0, 1.45, 0.45);
    group.add(bossGlow);
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

  const color = new THREE.Color();
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

      if (Math.abs(x) < 3.1) {
        color.setHSL(0.1, 0.24, 0.26 + Math.sin(z * 0.7) * 0.025);
      } else if ((x + z) % 7 === 0) {
        color.setHSL(0.31, 0.32, 0.32);
      } else {
        color.setHSL(0.36, 0.38, 0.24 + Math.random() * 0.08);
      }
      mesh.setColorAt(index, color);
      index += 1;
    }
  }
  mesh.instanceMatrix.needsUpdate = true;
  mesh.instanceColor.needsUpdate = true;
  world.add(mesh);
}

function createTorches() {
  const postMaterial = new THREE.MeshStandardMaterial({ color: 0x4b2d1d, roughness: 0.82 });
  const flameMaterial = new THREE.MeshStandardMaterial({
    color: 0xf26a3d,
    emissive: 0xf26a3d,
    emissiveIntensity: 1.6,
    roughness: 0.4,
  });

  for (const x of [-6.7, 6.7]) {
    world.add(blockMesh(0.24, 1.5, 0.24, postMaterial, x, 1.1, WALL_Z - 0.2));
    const flame = blockMesh(0.48, 0.48, 0.48, flameMaterial, x, 2.05, WALL_Z - 0.2);
    world.add(flame);
    torchFlames.push({ mesh: flame, phase: Math.random() * Math.PI * 2 });
    const light = new THREE.PointLight(0xf26a3d, 1.8, 12, 2);
    light.position.set(x, 2.15, WALL_Z - 0.2);
    light.userData.phase = Math.random() * Math.PI * 2;
    scene.add(light);
    torchLights.push(light);
  }
}

function createTrees() {
  const trunkMaterial = new THREE.MeshStandardMaterial({ color: 0x513820, roughness: 0.9 });
  const leafMaterials = [
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
    tree.add(blockMesh(0.55, height, 0.55, trunkMaterial, 0, height * 0.5, 0));

    const leafMaterial = leafMaterials[index % leafMaterials.length];
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

function spawnBeam(targetPosition) {
  const start = new THREE.Vector3(0, 1.65, WALL_Z + 0.65);
  const end = targetPosition.clone();
  end.y += 1.2;
  const distance = start.distanceTo(end);
  const geometry = new THREE.BoxGeometry(0.08, 0.08, distance);
  const material = new THREE.MeshBasicMaterial({
    color: 0x58dfcf,
    transparent: true,
    opacity: 0.82,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.copy(start).lerp(end, 0.5);
  mesh.lookAt(end);
  effectsGroup.add(mesh);
  beams.push({ mesh, life: 0.16, maxLife: 0.16 });
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
    return isEnemyTargetable(enemy) && enemy.searchPrompt.startsWith(prefix);
  });
}

function hasActiveEquationPrefix() {
  return enemies.some((enemy) => {
    return enemy.isEquation && isEnemyTargetable(enemy) && enemy.searchPrompt.startsWith(typedBuffer);
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

function updateAudioButton() {
  audioButton.classList.toggle('is-muted', !audioEnabled);
  audioButton.classList.toggle('is-audio-on', audioEnabled);
  audioButton.setAttribute('aria-label', audioEnabled ? 'Mute sound' : 'Unmute sound');
  audioButton.title = audioEnabled ? 'Mute sound' : 'Unmute sound';
  if (masterGain && audioContext) {
    masterGain.gain.cancelScheduledValues(audioContext.currentTime);
    masterGain.gain.setTargetAtTime(audioEnabled ? MASTER_VOLUME : 0.0001, audioContext.currentTime, 0.018);
  }
  if (!audioEnabled) stopMusicLoop(0.03);
}

function setPauseButtonState(isPlaying, isDisabled = pauseButton.disabled) {
  pauseButton.disabled = isDisabled;
  pauseButton.classList.toggle('is-playing', isPlaying);
  pauseButton.setAttribute('aria-label', isPlaying ? 'Pause run' : 'Resume run');
  pauseButton.title = isPlaying ? 'Pause run' : 'Resume run';
}

function ensureAudio() {
  if (!audioEnabled) return null;
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;

  if (!audioContext) {
    audioContext = new AudioContextClass();
    masterGain = audioContext.createGain();
    musicGain = audioContext.createGain();
    masterGain.gain.setValueAtTime(MASTER_VOLUME, audioContext.currentTime);
    musicGain.gain.setValueAtTime(0.0001, audioContext.currentTime);
    musicGain.connect(masterGain);
    masterGain.connect(audioContext.destination);
  }

  return audioContext;
}

function resumeAudio() {
  const context = ensureAudio();
  if (context && context.state === 'suspended') {
    context.resume().catch(() => {});
  }
  return context;
}

function playTone(frequency, duration, options = {}) {
  const context = resumeAudio();
  if (!context || !masterGain) return;

  const start = context.currentTime + (options.delay || 0);
  scheduleTone(frequency, duration, start, options, masterGain);
}

function scheduleTone(frequency, duration, start, options = {}, destination = masterGain) {
  const context = audioContext;
  if (!context || !destination) return;

  const attack = Math.min(options.attack ?? 0.008, duration * 0.4);
  const oscillator = context.createOscillator();
  const gainNode = context.createGain();
  oscillator.type = options.type || 'sine';
  oscillator.frequency.setValueAtTime(frequency, start);
  if (options.endFrequency) {
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, options.endFrequency), start + duration);
  }
  if (options.detune) oscillator.detune.setValueAtTime(options.detune, start);

  gainNode.gain.setValueAtTime(0.0001, start);
  gainNode.gain.exponentialRampToValueAtTime(options.gain || 0.05, start + attack);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, start + duration);

  oscillator.connect(gainNode);
  gainNode.connect(destination);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.04);
}

function playNoise(duration, options = {}) {
  const context = resumeAudio();
  if (!context || !masterGain) return;

  const start = context.currentTime + (options.delay || 0);
  scheduleNoise(duration, start, options, masterGain);
}

function scheduleNoise(duration, start, options = {}, destination = masterGain) {
  const context = audioContext;
  if (!context || !destination) return;

  const buffer = context.createBuffer(1, Math.max(1, Math.floor(context.sampleRate * duration)), context.sampleRate);
  const data = buffer.getChannelData(0);
  for (let index = 0; index < data.length; index += 1) {
    data[index] = (Math.random() * 2 - 1) * (1 - index / data.length);
  }

  const source = context.createBufferSource();
  const filter = context.createBiquadFilter();
  const gainNode = context.createGain();
  source.buffer = buffer;
  source.playbackRate.setValueAtTime(options.playbackRate || 1, start);
  filter.type = options.filterType || 'bandpass';
  filter.frequency.setValueAtTime(options.filterFrequency || 900, start);
  filter.Q.setValueAtTime(options.q || 0.8, start);
  gainNode.gain.setValueAtTime(options.gain || 0.04, start);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, start + duration);

  source.connect(filter);
  filter.connect(gainNode);
  gainNode.connect(destination);
  source.start(start);
  source.stop(start + duration + 0.02);
}

function startMusicLoop(reset) {
  const context = resumeAudio();
  if (!context || !musicGain || mode !== 'running') return;

  if (reset || nextMusicTime < context.currentTime) {
    musicStep = 0;
    nextMusicTime = context.currentTime + 0.08;
  }

  musicGain.gain.cancelScheduledValues(context.currentTime);
  musicGain.gain.setTargetAtTime(MUSIC_GAIN, context.currentTime, 0.12);

  if (!musicTimer) {
    musicTimer = window.setInterval(scheduleMusic, MUSIC_TIMER_INTERVAL);
  }
  scheduleMusic();
}

function stopMusicLoop(fade = 0.1) {
  if (musicTimer) {
    window.clearInterval(musicTimer);
    musicTimer = null;
  }
  if (musicGain && audioContext) {
    musicGain.gain.cancelScheduledValues(audioContext.currentTime);
    musicGain.gain.setTargetAtTime(0.0001, audioContext.currentTime, fade);
  }
}

function scheduleMusic() {
  if (!audioEnabled || mode !== 'running' || !audioContext || !musicGain) {
    stopMusicLoop(0.04);
    return;
  }

  const stepDuration = Math.max(0.13, MUSIC_BASE_STEP - Math.min(waveSet - 1, 8) * 0.006);
  while (nextMusicTime < audioContext.currentTime + MUSIC_SCHEDULE_AHEAD) {
    scheduleMusicStep(musicStep, nextMusicTime, stepDuration);
    nextMusicTime += stepDuration;
    musicStep = (musicStep + 1) % MUSIC_MELODY.length;
  }
}

function scheduleMusicStep(step, start, stepDuration) {
  const melody = MUSIC_MELODY[step % MUSIC_MELODY.length];
  const bass = MUSIC_BASS[step % MUSIC_BASS.length];
  const accent = step % 8 === 0;

  if (bass) {
    scheduleTone(bass, stepDuration * 1.6, start, {
      gain: accent ? 0.035 : 0.024,
      type: 'square',
      attack: 0.004,
    }, musicGain);
  }

  if (melody && (step % 2 === 0 || waveSet > 2)) {
    scheduleTone(melody, stepDuration * 0.82, start + stepDuration * 0.08, {
      gain: 0.024,
      type: 'square',
      attack: 0.003,
    }, musicGain);
    if (step % 8 === 6) {
      scheduleTone(melody * 1.5, stepDuration * 0.5, start + stepDuration * 0.18, {
        gain: 0.012,
        type: 'triangle',
        attack: 0.003,
      }, musicGain);
    }
  }

  if (step % 4 === 2) {
    scheduleNoise(stepDuration * 0.35, start + stepDuration * 0.16, {
      gain: 0.009,
      filterType: 'highpass',
      filterFrequency: 2400,
      q: 0.6,
    }, musicGain);
  }

  if (step % 16 === 8) {
    scheduleNoise(stepDuration * 0.55, start, {
      gain: 0.016,
      filterType: 'bandpass',
      filterFrequency: 520,
      q: 0.9,
    }, musicGain);
  }
}

function playToggleSound() {
  playTone(640, 0.07, { gain: 0.045, type: 'triangle' });
}

function playStartSound() {
  playTone(196, 0.16, { gain: 0.045, type: 'triangle' });
  playTone(294, 0.14, { gain: 0.04, delay: 0.05, type: 'triangle' });
  playTone(392, 0.18, { gain: 0.036, delay: 0.1, type: 'sine' });
}

function playPauseSound() {
  playTone(330, 0.08, { gain: 0.032, type: 'triangle', endFrequency: 220 });
}

function playTypeSound() {
  const pitch = 520 + Math.min(typedBuffer.length, 12) * 18;
  playTone(pitch, 0.045, { gain: 0.026, type: 'square' });
}

function playBackspaceSound() {
  playTone(260, 0.05, { gain: 0.02, type: 'triangle', endFrequency: 190 });
}

function playMistakeSound() {
  playTone(150, 0.13, { gain: 0.05, type: 'sawtooth', endFrequency: 82 });
  playNoise(0.08, { gain: 0.025, filterFrequency: 180, filterType: 'lowpass' });
}

function playRevealSound(enemy) {
  const laneIndex = Math.max(0, PATH_LANES.findIndex((lane) => lane === enemy.lane));
  const pitch = enemy.isBoss ? 180 : 460 + laneIndex * 18;
  playTone(pitch, 0.09, { gain: enemy.isBoss ? 0.06 : 0.03, type: enemy.isBoss ? 'sawtooth' : 'triangle' });
  if (enemy.isBoss) playTone(90, 0.2, { gain: 0.036, delay: 0.02, type: 'sine' });
}

function playDefeatSound(enemy) {
  const base = enemy.isBoss ? 180 : 720;
  playTone(base, 0.09, { gain: 0.055, type: 'square', endFrequency: enemy.isBoss ? 320 : 420 });
  playTone(base * 1.5, 0.12, { gain: 0.03, delay: 0.035, type: 'triangle', endFrequency: base * 0.75 });
  playNoise(enemy.isBoss ? 0.24 : 0.13, {
    gain: enemy.isBoss ? 0.08 : 0.045,
    filterFrequency: enemy.isBoss ? 360 : 1200,
    filterType: enemy.isBoss ? 'lowpass' : 'bandpass',
  });
}

function playHealSound(healed) {
  playTone(660, 0.1, { gain: 0.042, type: 'triangle', endFrequency: 880 });
  if (healed > 0) {
    playTone(990, 0.16, { gain: 0.032, delay: 0.04, type: 'sine' });
  }
  playNoise(0.1, { gain: 0.022, delay: 0.02, filterFrequency: 1800, filterType: 'bandpass' });
}

function playMedicPassSound() {
  playTone(420, 0.08, { gain: 0.026, type: 'triangle', endFrequency: 280 });
}

function playDamageSound(enemy) {
  const bossHit = !!enemy?.isBoss;
  playTone(bossHit ? 62 : 78, bossHit ? 0.28 : 0.22, { gain: bossHit ? 0.086 : 0.07, type: 'sawtooth', endFrequency: bossHit ? 36 : 45 });
  playNoise(bossHit ? 0.24 : 0.18, { gain: bossHit ? 0.074 : 0.06, filterFrequency: bossHit ? 135 : 170, filterType: 'lowpass' });
}

function playBossThrowSound() {
  playTone(176, 0.11, { gain: 0.045, type: 'sawtooth', endFrequency: 132 });
  playTone(352, 0.07, { gain: 0.022, delay: 0.03, type: 'square', endFrequency: 260 });
}

function playBossImpactSound() {
  playTone(92, 0.16, { gain: 0.058, type: 'sawtooth', endFrequency: 52 });
  playNoise(0.12, { gain: 0.045, filterFrequency: 260, filterType: 'lowpass' });
}

function playBossWarningSound() {
  playTone(110, 0.38, { gain: 0.055, type: 'sawtooth', endFrequency: 82 });
  playTone(55, 0.42, { gain: 0.035, delay: 0.08, type: 'sine' });
}

function playWaveClearSound() {
  playTone(262, 0.22, { gain: 0.04, type: 'triangle' });
  playTone(330, 0.24, { gain: 0.035, delay: 0.04, type: 'triangle' });
  playTone(392, 0.3, { gain: 0.035, delay: 0.08, type: 'triangle' });
  playTone(523, 0.22, { gain: 0.026, delay: 0.16, type: 'sine' });
}

function playGameOverSound() {
  playTone(196, 0.18, { gain: 0.055, type: 'sawtooth', endFrequency: 130 });
  playTone(130, 0.26, { gain: 0.052, delay: 0.12, type: 'sawtooth', endFrequency: 70 });
  playNoise(0.22, { gain: 0.045, delay: 0.04, filterFrequency: 220, filterType: 'lowpass' });
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
  const lanes = [-3.7, 0, 3.7];
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
