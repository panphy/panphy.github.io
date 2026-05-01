import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.164.1/build/three.module.js';

const canvas = document.getElementById('gameCanvas');
const labelsLayer = document.getElementById('labelsLayer');
const scoreValue = document.getElementById('scoreValue');
const bestValue = document.getElementById('bestValue');
const healthValue = document.getElementById('healthValue');
const waveValue = document.getElementById('waveValue');
const typedValue = document.getElementById('typedValue');
const comboValue = document.getElementById('comboValue');
const typingStrip = document.querySelector('.typing-strip');
const startButton = document.getElementById('startButton');
const pauseButton = document.getElementById('pauseButton');
const messagePanel = document.getElementById('messagePanel');
const messageKicker = document.getElementById('messageKicker');
const messageTitle = document.getElementById('messageTitle');
const messageScore = document.getElementById('messageScore');
const messageCopy = document.getElementById('messageCopy');
const keyboardInput = document.getElementById('keyboardInput');
const damageFlash = document.getElementById('damageFlash');

const STORAGE_KEY = 'panphyVoxelTypingBestV1';
const MAX_DELTA = 0.06;
const WALL_Z = 4.6;
const SPAWN_Z = -48;
const ENEMY_LIMIT = 12;
const GATE_HEALTH = 100;
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
const EASY_WORDS = [
  { term: 'force', definition: 'A push or pull that can change an object\'s motion' },
  { term: 'mass', definition: 'The amount of matter in an object' },
  { term: 'wave', definition: 'A disturbance that transfers energy without moving matter' },
  { term: 'speed', definition: 'Distance travelled per unit time' },
  { term: 'field', definition: 'A region of space where a force acts on an object' },
  { term: 'light', definition: 'Electromagnetic radiation visible to the human eye' },
  { term: 'sound', definition: 'A longitudinal wave produced by vibrating objects' },
  { term: 'charge', definition: 'A property of matter that causes electromagnetic force' },
  { term: 'energy', definition: 'The capacity to do work' },
  { term: 'vector', definition: 'A quantity with both magnitude and direction' },
  { term: 'spring', definition: 'An elastic device that stores potential energy' },
  { term: 'orbit', definition: 'The curved path of one body around another' },
  { term: 'phase', definition: 'The position within a repeating wave cycle' },
  { term: 'pulse', definition: 'A single disturbance travelling through a medium' },
  { term: 'ray', definition: 'A line showing the direction of wave travel' },
  { term: 'heat', definition: 'Thermal energy transferred between objects at different temperatures' },
].map(w => ({ ...w, showDefinition: false }));
const MEDIUM_WORDS = [
  { term: 'gravity', definition: 'Attractive force between any two objects with mass' },
  { term: 'friction', definition: 'A force that opposes relative motion between surfaces' },
  { term: 'voltage', definition: 'Energy transferred per unit charge in a circuit' },
  { term: 'current', definition: 'The rate of flow of electric charge' },
  { term: 'impulse', definition: 'The product of force and the time it acts' },
  { term: 'density', definition: 'Mass per unit volume of a substance' },
  { term: 'momentum', definition: 'The product of an object\'s mass and velocity' },
  { term: 'pressure', definition: 'Force per unit area' },
  { term: 'frequency', definition: 'Number of complete wave cycles per second' },
  { term: 'amplitude', definition: 'Maximum displacement from the equilibrium position' },
  { term: 'magnetic', definition: 'Relating to the force field around a magnet or current' },
  { term: 'resistor', definition: 'A component that limits the flow of electric current' },
  { term: 'diffraction', definition: 'The spreading of waves around obstacles or through gaps' },
  { term: 'refraction', definition: 'The change in wave direction when crossing a boundary' },
].map(w => ({ ...w, showDefinition: true }));
const HARD_WORDS = [
  { term: 'kinetic energy', definition: 'Energy possessed by an object due to its motion' },
  { term: 'resultant force', definition: 'The single force equivalent to all forces acting combined' },
  { term: 'electric field', definition: 'A region where a charged object experiences a force' },
  { term: 'terminal velocity', definition: 'Constant speed when driving and resistive forces balance' },
  { term: 'conservation', definition: 'A quantity that stays constant in a closed system' },
  { term: 'standing wave', definition: 'Stationary pattern from two identical waves in opposite directions' },
  { term: 'wave equation', definition: 'Relationship linking wave speed, frequency and wavelength' },
  { term: 'escape speed', definition: 'Minimum speed needed to break free of a gravitational field' },
  { term: 'ohmic conductor', definition: 'A conductor where current is proportional to voltage' },
  { term: 'inverse square', definition: 'A quantity that decreases with the square of distance' },
].map(w => ({ ...w, showDefinition: true }));
const ALL_WORDS = [...EASY_WORDS, ...MEDIUM_WORDS, ...HARD_WORDS];
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
    scale: 0.72,
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
    scale: 0.66,
    weight: 2,
    score: 70,
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
const pathMarkerBlocks = [];
const scrollingTrees = [];

let mode = 'idle';
let score = 0;
let bestScore = loadBestScore();
let health = GATE_HEALTH;
let wave = 1;
let streak = 0;
let typedBuffer = '';
let activeTarget = null;
let spawnTimer = 0;
let lastFrameTime = 0;
let elapsed = 0;
let mistakeTimer = 0;
let damageTimer = 0;
let hudTimer = 0;
let enemyId = 0;
let pathMarkerMaterial = null;
let moon = null;
let starField = null;

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

bestValue.textContent = formatScore(bestScore);
messageScore.textContent = `Best ${formatScore(bestScore)}`;
updateHud(true);

startButton.addEventListener('click', () => {
  if (mode === 'paused') {
    resumeGame();
  } else {
    startGame();
  }
});

pauseButton.addEventListener('click', () => {
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
  clearEnemies();
  clearEffects();
  score = 0;
  health = GATE_HEALTH;
  wave = 1;
  streak = 0;
  typedBuffer = '';
  activeTarget = null;
  spawnTimer = 1.25;
  lastFrameTime = 0;
  elapsed = 0;
  mistakeTimer = 0;
  damageTimer = 0;
  mode = 'running';
  document.body.classList.add('is-running');
  messagePanel.hidden = true;
  pauseButton.disabled = false;
  pauseButton.textContent = 'II';
  pauseButton.setAttribute('aria-label', 'Pause run');
  updateTypedDisplay();
  updateHud(true);
  spawnEnemy({ forcedPrompt: 'force', lane: -1.7 });
  spawnEnemy({ forcedPrompt: 'wave', lane: 1.7, delay: 8 });
  focusKeyboard();
}

function pauseGame() {
  if (mode !== 'running') return;
  mode = 'paused';
  pauseButton.textContent = '>';
  pauseButton.setAttribute('aria-label', 'Resume run');
  showMessage('PAUSED', 'Moonlit Hold', `Score ${formatScore(score)}`, 'Resume', 'The gate holds while the night is paused.');
}

function resumeGame() {
  if (mode !== 'paused') return;
  mode = 'running';
  lastFrameTime = 0;
  messagePanel.hidden = true;
  pauseButton.textContent = 'II';
  pauseButton.setAttribute('aria-label', 'Pause run');
  focusKeyboard();
}

function endGame() {
  mode = 'gameover';
  pauseButton.disabled = true;
  pauseButton.textContent = 'II';
  pauseButton.setAttribute('aria-label', 'Pause run');
  document.body.classList.remove('is-running');
  if (score > bestScore) {
    bestScore = score;
    saveBestScore(score);
  }
  showMessage('NIGHT BREACHED', 'Gate Down', `Score ${formatScore(score)} | Best ${formatScore(bestScore)}`, 'Try Again', `${Math.round(accuracy() * 100)}% accuracy across ${elapsed.toFixed(0)} seconds.`);
  updateHud(true);
}

function showMessage(kicker, title, scoreText, buttonText, copyText) {
  messageKicker.textContent = kicker;
  messageTitle.textContent = title;
  messageScore.textContent = scoreText;
  messageCopy.textContent = copyText;
  startButton.textContent = buttonText;
  messagePanel.hidden = false;
}

function handleKeyDown(event) {
  if (event.key === 'Enter' && (mode === 'idle' || mode === 'gameover')) {
    event.preventDefault();
    startGame();
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

  if (event.inputType === 'deleteContentBackward') {
    event.preventDefault();
    typedBuffer = typedBuffer.slice(0, -1);
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
  const normalized = normalizeCharacter(character);
  if (!normalized) return;

  const next = typedBuffer + normalized;
  const nextMatches = findMatches(next);

  if (nextMatches.length > 0) {
    typedBuffer = next;
    activeTarget = chooseTarget(nextMatches);
    if (activeTarget.prompt === typedBuffer) defeatEnemy(activeTarget);
    updateTypedDisplay();
    return;
  }

  const restartMatches = findMatches(normalized);
  if (restartMatches.length > 0) {
    typedBuffer = normalized;
    activeTarget = chooseTarget(restartMatches);
    registerMistake();
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
  mistakeTimer = 0.2;
  typingStrip.classList.add('mistake');
  window.setTimeout(() => typingStrip.classList.remove('mistake'), 200);
}

function defeatEnemy(enemy) {
  const promptValue = enemy.prompt.replace(/\s/g, '');
  streak += 1;
  score += enemy.type.score + promptValue.length * 12 + Math.min(streak, 10) * 8;
  spawnBeam(enemy.group.position);
  spawnDebris(enemy.group.position, enemy.type);
  removeEnemy(enemy);
  typedBuffer = '';
  activeTarget = null;
  updateHud(true);
  updateTypedDisplay();
}

function leakEnemy(enemy) {
  health = Math.max(0, health - enemy.damage);
  streak = 0;
  damageTimer = 0.32;
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

function animate(frameTime) {
  requestAnimationFrame(animate);
  const delta = lastFrameTime ? Math.min((frameTime - lastFrameTime) / 1000, MAX_DELTA) : 0;
  lastFrameTime = frameTime;
  const seconds = frameTime * 0.001;

  if (mode === 'running') {
    elapsed += delta;
    wave = Math.max(1, Math.floor(elapsed / 24) + 1);
    spawnTimer -= delta;
    if (spawnTimer <= 0 && enemies.length < ENEMY_LIMIT) {
      spawnEnemy();
      spawnTimer = nextSpawnDelay();
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
    const speed = enemy.speed + wave * 0.13;
    enemy.group.position.z += speed * delta;
    enemy.group.position.x = enemy.lane + Math.sin(seconds * enemy.wobbleSpeed + enemy.phase) * enemy.wobbleAmount;
    enemy.group.position.y = enemy.baseY + Math.abs(Math.sin(seconds * 4.8 + enemy.phase)) * enemy.stepBounce;
    enemy.group.rotation.y = Math.sin(seconds * 2.4 + enemy.phase) * 0.18;

    if (enemy === activeTarget) {
      enemy.group.scale.setScalar(enemy.type.scale * (1 + Math.sin(seconds * 18) * 0.035));
    } else {
      enemy.group.scale.setScalar(enemy.type.scale);
    }

    if (enemy.group.position.z >= WALL_Z) {
      leakEnemy(enemy);
    }
  }

  selectTarget();
}

function updateEffects(delta) {
  for (let index = beams.length - 1; index >= 0; index -= 1) {
    const beam = beams[index];
    beam.life -= delta;
    const amount = Math.max(0, beam.life / beam.maxLife);
    beam.mesh.material.opacity = amount * 0.82;
    beam.mesh.scale.set(1, 1, Math.max(0.08, amount));
    if (beam.life <= 0) {
      effectsGroup.remove(beam.mesh);
      beam.mesh.geometry.dispose();
      beam.mesh.material.dispose();
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
  const labelItems = [];

  for (const enemy of enemies) {
    renderPrompt(enemy);
    reusableVector.copy(enemy.group.position);
    reusableVector.y += 2.2 * enemy.type.scale;
    reusableVector.project(camera);

    const isVisible = reusableVector.z > -1 && reusableVector.z < 1;
    enemy.label.classList.toggle('is-hidden', !isVisible);
    if (!isVisible) continue;

    const x = (reusableVector.x * 0.5 + 0.5) * width;
    const y = (-reusableVector.y * 0.5 + 0.5) * height;
    const scale = THREE.MathUtils.clamp(1.1 - enemy.group.position.z * 0.025, 0.72, 1.18);
    labelItems.push({ enemy, x, y, scale });
  }

  const placedBoxes = [];
  labelItems.sort((a, b) => a.y - b.y);

  for (const item of labelItems) {
    const { enemy, x, scale } = item;
    let y = item.y;
    const labelWidth = enemy.label.offsetWidth * scale;
    const labelHeight = enemy.label.offsetHeight * scale;

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const box = {
        left: x - labelWidth / 2,
        right: x + labelWidth / 2,
        top: y - labelHeight,
        bottom: y,
      };
      if (!placedBoxes.some((placed) => boxesOverlap(box, placed))) {
        placedBoxes.push(box);
        break;
      }
      y -= labelHeight + 6;
    }

    enemy.label.style.left = `${x}px`;
    enemy.label.style.top = `${y}px`;
    enemy.label.style.transform = `translate(-50%, -100%) scale(${scale.toFixed(3)})`;
    enemy.label.classList.toggle('is-target', enemy === activeTarget);
    enemy.label.classList.toggle('is-danger', enemy.group.position.z > -4);
  }
}

function buildHintMask(term) {
  return term.replace(/\S+/g, word => word[0] + '_'.repeat(word.length - 1));
}

function renderPrompt(enemy) {
  const matched = enemy.prompt.startsWith(typedBuffer) && typedBuffer.length > 0;
  const typedLength = matched ? typedBuffer.length : 0;
  enemy.typedNode.textContent = enemy.prompt.slice(0, typedLength);
  enemy.remainingNode.textContent = enemy.showDefinition
    ? enemy.hintMask.slice(typedLength)
    : enemy.prompt.slice(typedLength);
}

function updateHud(force) {
  hudTimer -= 1;
  if (!force && hudTimer > 0) return;
  hudTimer = 6;
  scoreValue.textContent = formatScore(score);
  bestValue.textContent = formatScore(Math.max(bestScore, score));
  healthValue.textContent = `${Math.max(0, Math.round(health))}%`;
  waveValue.textContent = String(wave);
  comboValue.textContent = `${streak} chain`;
}

function updateTypedDisplay() {
  typedValue.textContent = typedBuffer || (mode === 'running' ? '...' : 'ready');
  comboValue.textContent = `${streak} chain`;
}

function spawnEnemy(options = {}) {
  const wordData = options.forcedPrompt
    ? (ALL_WORDS.find(w => w.term === options.forcedPrompt) || { term: options.forcedPrompt, definition: null, showDefinition: false })
    : choosePrompt();

  const type = weightedPick(ENEMY_TYPES);
  const group = createEnemyMesh(type);
  const startZ = SPAWN_Z - (options.delay || Math.random() * 10);
  const lane = Number.isFinite(options.lane) ? options.lane : chooseSpawnLane(startZ);
  group.position.set(lane, 0.32, startZ);
  group.scale.setScalar(type.scale);
  enemyGroup.add(group);

  const label = document.createElement('div');
  label.className = 'word-tag';

  const nameNode = document.createElement('span');
  nameNode.className = 'name';
  nameNode.textContent = type.name;

  const promptNode = document.createElement('span');
  promptNode.className = 'prompt';

  const typedNode = document.createElement('span');
  typedNode.className = 'typed';

  const remainingNode = document.createElement('span');
  remainingNode.className = 'remaining';

  promptNode.append(typedNode, remainingNode);

  if (wordData.showDefinition && wordData.definition) {
    const definitionNode = document.createElement('span');
    definitionNode.className = 'definition';
    definitionNode.textContent = wordData.definition;
    label.append(nameNode, definitionNode, promptNode);
  } else {
    label.append(nameNode, promptNode);
  }

  labelsLayer.append(label);

  const enemy = {
    id: enemyId,
    type,
    group,
    label,
    typedNode,
    remainingNode,
    prompt: wordData.term,
    showDefinition: wordData.showDefinition,
    hintMask: wordData.showDefinition ? buildHintMask(wordData.term) : null,
    lane,
    speed: type.speed + Math.random() * 0.35,
    damage: type.name === 'Ash Oaf' ? 18 : 12,
    baseY: 0.32,
    age: 0,
    wobbleAmount: 0.08 + Math.random() * 0.2,
    wobbleSpeed: 1.2 + Math.random() * 1.4,
    stepBounce: 0.06 + Math.random() * 0.08,
    phase: Math.random() * Math.PI * 2,
  };
  enemyId += 1;
  enemies.push(enemy);
  renderPrompt(enemy);
  selectTarget();
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
  const bodyMaterial = new THREE.MeshStandardMaterial({
    color: type.body,
    roughness: 0.82,
    metalness: 0.03,
  });
  const trimMaterial = new THREE.MeshStandardMaterial({
    color: type.trim,
    roughness: 0.78,
    metalness: 0.02,
  });
  const eyeMaterial = new THREE.MeshStandardMaterial({
    color: type.eye,
    emissive: type.eye,
    emissiveIntensity: 0.9,
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

  return group;
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
    beam.mesh.geometry.dispose();
    beam.mesh.material.dispose();
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

function findMatches(prefix) {
  if (!prefix) return [];
  return enemies.filter((enemy) => enemy.prompt.startsWith(prefix));
}

function chooseTarget(matches) {
  return [...matches].sort((a, b) => b.group.position.z - a.group.position.z || a.prompt.length - b.prompt.length)[0];
}

function choosePrompt() {
  const pool = wave >= 5 ? [...MEDIUM_WORDS, ...HARD_WORDS] : wave >= 3 ? [...EASY_WORDS, ...MEDIUM_WORDS] : EASY_WORDS;
  const nearExisting = new Set(enemies.map((enemy) => enemy.prompt));
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const entry = pool[Math.floor(Math.random() * pool.length)];
    if (!nearExisting.has(entry.term)) return entry;
  }
  return pool[Math.floor(Math.random() * pool.length)];
}

function nextSpawnDelay() {
  return Math.max(0.68, 2.15 - wave * 0.14 + Math.random() * 0.46);
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

function boxesOverlap(first, second) {
  return first.left < second.right && first.right > second.left && first.top < second.bottom && first.bottom > second.top;
}

function normalizeCharacter(character) {
  if (character === ' ') return ' ';
  const normalized = character.toLowerCase();
  return /^[a-z0-9=+\-*/.]$/.test(normalized) ? normalized : '';
}

function accuracy() {
  const possible = score + (GATE_HEALTH - health) * 10;
  if (possible <= 0) return 1;
  return THREE.MathUtils.clamp(score / possible, 0, 1);
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

function loadBestScore() {
  const raw = Number.parseInt(localStorage.getItem(STORAGE_KEY) || '0', 10);
  return Number.isFinite(raw) ? raw : 0;
}

function saveBestScore(value) {
  localStorage.setItem(STORAGE_KEY, String(Math.round(value)));
}
