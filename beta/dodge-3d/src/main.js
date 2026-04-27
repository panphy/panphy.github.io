import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.164.1/build/three.module.js';

'use strict';

const canvas = document.getElementById('gameCanvas');
const scoreValue = document.getElementById('scoreValue');
const bestValue = document.getElementById('bestValue');
const speedValue = document.getElementById('speedValue');
const levelValue = document.getElementById('levelValue');
const startButton = document.getElementById('startButton');
const pauseButton = document.getElementById('pauseButton');
const messagePanel = document.getElementById('messagePanel');
const messageKicker = document.getElementById('messageKicker');
const messageTitle = document.getElementById('messageTitle');
const messageScore = document.getElementById('messageScore');
const screenFlash = document.getElementById('screenFlash');

const STORAGE_KEY = 'panphyDodge3dBestV1';
const PLAYER_Z = 2.15;
const PLAYER_RADIUS = 0.72;
const BASE_FIELD_SPEED = 19;
const MAX_DELTA = 0.08;
const PLAY_BOUNDS = {
  x: 7.4,
  yMin: -3.55,
  yMax: 3.8,
};
const GRID_STEP = 8;
const GRID_NEAR_Z = 24;
const GRID_FAR_Z = -160;
const COURSE_INITIAL_TURN_DELAY = [3.0, 4.6];
const COURSE_TURN_DURATION = [4.2, 6.0];
const COURSE_TURN_STRENGTH = [12.0, 17.5];
const COURSE_TURN_COOLDOWN = [4.7, 7.2];

const pointerState = {
  active: false,
  id: null,
  startX: 0,
  startY: 0,
  shipStartX: 0,
  shipStartY: 0,
};

const keys = new Set();
const reusableVector = new THREE.Vector3();
const cameraTarget = new THREE.Vector3();
const asteroids = [];

let mode = 'idle';
let elapsed = 0;
let bestScore = loadBestScore();
let spawnTimer = 0;
let waveTimer = 0;
let lastFrameTime = 0;
let fieldSpeed = BASE_FIELD_SPEED;
let shakeAmount = 0;
let flashTimer = 0;
let pausedByVisibility = false;
let hudTimer = 0;

const course = {
  scrollZ: 0,
  turnDelay: COURSE_INITIAL_TURN_DELAY[1],
  turnAge: 0,
  turnDuration: 0,
  turnDirection: 0,
  turnStrength: 0,
  turnAmount: 0,
};

const player = {
  x: 0,
  y: -1.3,
  targetX: 0,
  targetY: -1.3,
  prevX: 0,
  prevY: -1.3,
};

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: false,
  alpha: false,
  preserveDrawingBuffer: true,
  powerPreference: 'high-performance',
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight, false);
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x05070d);
scene.fog = new THREE.FogExp2(0x05070d, 0.014);

const camera = new THREE.PerspectiveCamera(68, window.innerWidth / window.innerHeight, 0.1, 230);
camera.position.set(0, 2.15, 11.5);
camera.lookAt(0, 0, -50);

const hemiLight = new THREE.HemisphereLight(0xa5fff0, 0x1a1010, 1.15);
scene.add(hemiLight);

const keyLight = new THREE.DirectionalLight(0xffffff, 2.2);
keyLight.position.set(4, 8, 8);
scene.add(keyLight);

const rimLight = new THREE.DirectionalLight(0x4dffb8, 1.1);
rimLight.position.set(-8, 3, -6);
scene.add(rimLight);

const asteroidGroup = new THREE.Group();
scene.add(asteroidGroup);

const ship = createShip();
ship.position.set(player.x, player.y, PLAYER_Z);
scene.add(ship);

const grid = createFlightGrid();
scene.add(grid);

const rails = createRails();
scene.add(rails);

const starField = createStarField();
scene.add(starField.points);

const wirePlanet = createWirePlanet();
scene.add(wirePlanet);

const warningRing = createWarningRing();
scene.add(warningRing);

const asteroidColorPalette = [0x9c7458, 0x5f6875, 0x705345, 0x847260, 0x4f5a61, 0x8f6146];
const asteroidProfiles = [
  { type: 'lumpy', weight: 4, detail: 1, distortion: 0.24, flatShading: true, roughness: 0.92, metalness: 0.03, edgeOpacity: 0.24, edgeBoost: 0.3 },
  { type: 'crag', weight: 4, detail: 1, distortion: 0.38, flatShading: true, roughness: 0.96, metalness: 0.02, edgeOpacity: 0.34, edgeBoost: 0.34 },
  { type: 'smooth', weight: 3, detail: 22, distortion: 0.04, flatShading: false, roughness: 0.68, metalness: 0.08, edgeOpacity: 0.035, edgeBoost: 0.08 },
  { type: 'shard', weight: 1, detail: 1, distortion: 0.22, flatShading: true, roughness: 0.9, metalness: 0.04, edgeOpacity: 0.26, edgeBoost: 0.26 },
];
const trajectoryProfiles = [
  { type: 'drifter', weight: 5 },
  { type: 'sweeper', weight: 3 },
  { type: 'sine', weight: 3 },
  { type: 'corkscrew', weight: 2 },
  { type: 'heavy', weight: 2 },
  { type: 'shard', weight: 2 },
];
const asteroidWireMaterial = new THREE.LineBasicMaterial({
  color: 0xffd195,
  transparent: true,
  opacity: 0.28,
});

bestValue.textContent = formatTime(bestScore);
messageScore.textContent = `Best ${formatTime(bestScore)}`;

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
window.addEventListener('keyup', handleKeyUp);
window.addEventListener('blur', () => {
  if (mode === 'running') pauseGame();
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden && mode === 'running') {
    pausedByVisibility = true;
    pauseGame();
  } else if (!document.hidden && mode === 'paused' && pausedByVisibility) {
    pausedByVisibility = false;
    resumeGame();
  }
});

canvas.addEventListener('pointerdown', handlePointerDown, { passive: false });
canvas.addEventListener('pointermove', handlePointerMove, { passive: false });
canvas.addEventListener('pointerup', handlePointerUp, { passive: false });
canvas.addEventListener('pointercancel', handlePointerUp, { passive: false });

resizeRenderer();
requestAnimationFrame(animate);

function startGame() {
  clearAsteroids();
  elapsed = 0;
  spawnTimer = 0.62;
  waveTimer = 4.4;
  resetCourse();
  fieldSpeed = BASE_FIELD_SPEED;
  shakeAmount = 0;
  flashTimer = 0;
  lastFrameTime = 0;
  player.x = 0;
  player.y = -1.3;
  player.targetX = 0;
  player.targetY = -1.3;
  player.prevX = 0;
  player.prevY = -1.3;
  ship.visible = true;
  ship.position.set(player.x, player.y, PLAYER_Z);
  ship.rotation.set(0, 0, 0);
  spawnAsteroid(1, { x: -4.2, y: 1.2, z: -64, size: 1.18, speed: BASE_FIELD_SPEED * 0.95, profile: asteroidProfiles[2], trajectory: createTrajectory('drifter') });
  spawnAsteroid(1, { x: 4.9, y: -2.2, z: -88, size: 0.92, speed: BASE_FIELD_SPEED * 1.08, profile: asteroidProfiles[1], trajectory: createTrajectory('sine', { amplitudeX: 0.55, frequency: 1.25 }) });
  mode = 'running';
  document.body.classList.add('is-running');
  document.body.classList.remove('is-crashed');
  messagePanel.hidden = true;
  pauseButton.disabled = false;
  pauseButton.textContent = 'II';
  pauseButton.setAttribute('aria-label', 'Pause run');
  updateHud(true);
}

function pauseGame() {
  if (mode !== 'running') return;
  mode = 'paused';
  pauseButton.textContent = '>';
  pauseButton.setAttribute('aria-label', 'Resume run');
  showMessage('PAUSED', 'Holding Pattern', `Survival ${formatTime(elapsed)}`, 'Resume');
}

function resumeGame() {
  if (mode !== 'paused') return;
  mode = 'running';
  lastFrameTime = 0;
  pauseButton.textContent = 'II';
  pauseButton.setAttribute('aria-label', 'Pause run');
  messagePanel.hidden = true;
  document.body.classList.add('is-running');
}

function endGame() {
  if (mode !== 'running') return;
  mode = 'gameover';
  pauseButton.disabled = true;
  pauseButton.textContent = 'II';
  pauseButton.setAttribute('aria-label', 'Pause run');
  document.body.classList.remove('is-running');
  document.body.classList.add('is-crashed');
  ship.visible = false;
  shakeAmount = 1.4;
  flashTimer = 0.18;
  screenFlash.classList.add('show');

  if (elapsed > bestScore) {
    bestScore = Math.round(elapsed * 100) / 100;
    saveBestScore(bestScore);
  }

  bestValue.textContent = formatTime(bestScore);
  showMessage('RUN ENDED', 'Impact Alert', `Survival ${formatTime(elapsed)} | Best ${formatTime(bestScore)}`, 'Restart');
}

function showMessage(kicker, title, scoreText, buttonText) {
  messageKicker.textContent = kicker;
  messageTitle.textContent = title;
  messageScore.textContent = scoreText;
  startButton.textContent = buttonText;
  messagePanel.hidden = false;
  document.body.classList.toggle('is-running', mode === 'running');
}

function animate(time) {
  requestAnimationFrame(animate);

  if (!lastFrameTime) lastFrameTime = time;
  const rawDelta = (time - lastFrameTime) / 1000;
  const delta = Math.min(Math.max(rawDelta, 0), MAX_DELTA);
  lastFrameTime = time;

  if (mode === 'running') {
    updateGame(delta);
  } else {
    updateAttractMode(delta, time);
  }

  updateCamera(delta);
  renderer.render(scene, camera);
}

function updateGame(delta) {
  elapsed += delta;
  fieldSpeed = BASE_FIELD_SPEED + elapsed * 0.62;
  const level = getLevel();

  updateControls(delta);
  updateShip(delta);
  updateEnvironment(delta, fieldSpeed);
  updateSpawning(delta, level);
  updateAsteroids(delta);
  updateEffects(delta);
  updateHud();
}

function updateAttractMode(delta, time) {
  const drift = Math.sin(time * 0.0007) * 2.25;
  const lift = Math.cos(time * 0.0009) * 0.36 - 1.15;
  player.targetX = drift;
  player.targetY = lift;
  updateShip(delta);
  updateEnvironment(delta, BASE_FIELD_SPEED * 0.65);
  updateEffects(delta);
}

function updateControls(delta) {
  const keyboardSpeed = 8.8;
  const left = keys.has('ArrowLeft') || keys.has('KeyA');
  const right = keys.has('ArrowRight') || keys.has('KeyD');
  const up = keys.has('ArrowUp') || keys.has('KeyW');
  const down = keys.has('ArrowDown') || keys.has('KeyS');

  if (left) player.targetX -= keyboardSpeed * delta;
  if (right) player.targetX += keyboardSpeed * delta;
  if (up) player.targetY += keyboardSpeed * delta;
  if (down) player.targetY -= keyboardSpeed * delta;

  player.targetX = clamp(player.targetX, -PLAY_BOUNDS.x, PLAY_BOUNDS.x);
  player.targetY = clamp(player.targetY, PLAY_BOUNDS.yMin, PLAY_BOUNDS.yMax);
}

function updateShip(delta) {
  player.prevX = player.x;
  player.prevY = player.y;
  player.x = damp(player.x, player.targetX, 13, delta);
  player.y = damp(player.y, player.targetY, 13, delta);

  const velocityX = (player.x - player.prevX) / Math.max(delta, 0.001);
  const velocityY = (player.y - player.prevY) / Math.max(delta, 0.001);

  ship.position.set(player.x, player.y, PLAYER_Z);
  const courseBank = clamp(course.turnAmount * 0.045, -0.34, 0.34);
  ship.rotation.z = damp(ship.rotation.z, clamp(-velocityX * 0.055, -0.58, 0.58) + courseBank, 9, delta);
  ship.rotation.x = damp(ship.rotation.x, clamp(velocityY * 0.025, -0.22, 0.22), 8, delta);
  ship.rotation.y = damp(ship.rotation.y, clamp(-velocityX * 0.018, -0.2, 0.2), 8, delta);

  const enginePulse = 0.84 + Math.sin(performance.now() * 0.024) * 0.12;
  const leftFlame = ship.userData.leftFlame;
  const rightFlame = ship.userData.rightFlame;
  if (leftFlame && rightFlame) {
    leftFlame.scale.setScalar(enginePulse);
    rightFlame.scale.setScalar(enginePulse);
  }
}

function updateEnvironment(delta, speed) {
  updateCourse(delta, speed);
  updateCourseLineGeometry(grid);

  rails.children.forEach((rail, index) => {
    updateCourseLineGeometry(rail);
    rail.material.opacity = 0.3 + Math.sin(performance.now() * 0.004 + index) * 0.12;
  });

  const positions = starField.geometry.attributes.position.array;
  for (let i = 0; i < starField.count; i += 1) {
    const offset = i * 3;
    positions[offset + 2] += speed * delta * starField.speeds[i];
    if (positions[offset + 2] > 12) {
      resetStar(positions, offset);
    }
  }
  starField.geometry.attributes.position.needsUpdate = true;

  wirePlanet.rotation.x += delta * 0.08;
  wirePlanet.rotation.y += delta * 0.13;
  wirePlanet.position.x = damp(wirePlanet.position.x, -16 + getCourseBendAtZ(wirePlanet.position.z) * 0.42, 2.2, delta);
  warningRing.rotation.z -= delta * 0.9;
  warningRing.position.x = damp(warningRing.position.x, getCourseBendAtZ(warningRing.position.z) * 0.92, 3.6, delta);
  warningRing.rotation.y = damp(warningRing.rotation.y, -course.turnAmount * 0.027, 3.2, delta);
  warningRing.scale.setScalar(1 + Math.sin(performance.now() * 0.004) * 0.035);
}

function resetCourse() {
  course.scrollZ = 0;
  course.turnDelay = random(...COURSE_INITIAL_TURN_DELAY);
  course.turnAge = 0;
  course.turnDuration = 0;
  course.turnDirection = 0;
  course.turnStrength = 0;
  course.turnAmount = 0;
}

function updateCourse(delta, speed) {
  course.scrollZ = (course.scrollZ + speed * delta) % GRID_STEP;

  if (course.turnDirection === 0) {
    course.turnDelay -= delta;
    if (course.turnDelay <= 0) {
      course.turnDirection = Math.random() < 0.5 ? -1 : 1;
      course.turnDuration = random(...COURSE_TURN_DURATION);
      course.turnStrength = random(...COURSE_TURN_STRENGTH);
      course.turnAge = 0;
    }
  } else {
    course.turnAge += delta;
    const progress = clamp(course.turnAge / Math.max(course.turnDuration, 0.001), 0, 1);
    const bendPulse = Math.pow(Math.sin(progress * Math.PI), 0.72);
    course.turnAmount = course.turnDirection * course.turnStrength * bendPulse;
    if (progress >= 1) {
      course.turnDirection = 0;
      course.turnAge = 0;
      course.turnDuration = 0;
      course.turnStrength = 0;
      course.turnAmount = 0;
      course.turnDelay = random(...COURSE_TURN_COOLDOWN);
    }
  }
}

function getCourseBendAtZ(z) {
  const depth = clamp((GRID_NEAR_Z - z) / (GRID_NEAR_Z - GRID_FAR_Z), 0, 1);
  const easedDepth = Math.pow(depth, 1.12);
  return course.turnAmount * easedDepth;
}

function updateCourseLineGeometry(line) {
  const segments = line.userData.segments;
  if (!segments) return;

  const positions = line.geometry.attributes.position.array;
  let offset = 0;
  segments.forEach((segment) => {
    const z1 = segment.z1 + course.scrollZ;
    const z2 = segment.z2 + course.scrollZ;
    positions[offset] = segment.x1 + getCourseBendAtZ(z1);
    positions[offset + 1] = segment.y1;
    positions[offset + 2] = z1;
    positions[offset + 3] = segment.x2 + getCourseBendAtZ(z2);
    positions[offset + 4] = segment.y2;
    positions[offset + 5] = z2;
    offset += 6;
  });
  line.geometry.attributes.position.needsUpdate = true;
}

function updateSpawning(delta, level) {
  spawnTimer -= delta;
  waveTimer -= delta;
  const spawnInterval = Math.max(0.26, 0.98 - elapsed * 0.01);

  if (waveTimer <= 0) {
    spawnWave(level);
    waveTimer = random(
      Math.max(4.4, 7.2 - elapsed * 0.035),
      Math.max(6.3, 10.5 - elapsed * 0.045)
    );
    spawnTimer += 0.7;
  }

  while (spawnTimer <= 0) {
    spawnSoloAsteroid(level);
    if (Math.random() < Math.min(0.06 + elapsed * 0.0025, 0.24)) {
      spawnSoloAsteroid(level);
    }
    spawnTimer += spawnInterval * random(0.78, 1.34);
  }
}

function updateAsteroids(delta) {
  for (let i = asteroids.length - 1; i >= 0; i -= 1) {
    const asteroid = asteroids[i];
    const mesh = asteroid.mesh;
    asteroid.age += delta;
    asteroid.baseX += asteroid.driftX * delta;
    asteroid.baseY += asteroid.driftY * delta;
    mesh.position.z += asteroid.speed * delta;
    const trajectoryOffset = getTrajectoryOffset(asteroid);
    mesh.position.x = asteroid.baseX + trajectoryOffset.x;
    mesh.position.y = asteroid.baseY + trajectoryOffset.y;
    mesh.rotation.x += asteroid.rotationX * delta;
    mesh.rotation.y += asteroid.rotationY * delta;
    mesh.rotation.z += asteroid.rotationZ * delta;

    const hazardPulse = Math.max(0, 1 - Math.abs(mesh.position.z - PLAYER_Z) / 20);
    asteroid.wire.material.opacity = asteroid.edgeOpacity + hazardPulse * asteroid.edgeBoost;

    if (checkCollision(asteroid)) {
      endGame();
      return;
    }

    if (mesh.position.z > 12 || Math.abs(mesh.position.x) > 18 || Math.abs(mesh.position.y) > 12) {
      asteroidGroup.remove(mesh);
      disposeAsteroid(asteroid);
      asteroids.splice(i, 1);
    }
  }
}

function spawnSoloAsteroid(level) {
  const trajectoryType = chooseTrajectoryProfile().type;
  const trajectory = createTrajectory(trajectoryType);
  const overrides = { trajectory };
  if (trajectoryType === 'sweeper') {
    const side = trajectory.driftX > 0 ? -1 : 1;
    overrides.x = side * (PLAY_BOUNDS.x + random(0.8, 1.6));
    overrides.y = random(PLAY_BOUNDS.yMin + 0.65, PLAY_BOUNDS.yMax - 0.65);
    overrides.z = random(-94, -62);
    overrides.size = random(0.55, 1.08);
  } else if (trajectoryType === 'heavy') {
    overrides.size = random(1.18, 1.72);
    overrides.speed = fieldSpeed * random(0.76, 0.94);
    overrides.profile = asteroidProfiles[Math.random() < 0.5 ? 0 : 2];
  } else if (trajectoryType === 'shard') {
    overrides.size = random(0.36, 0.72);
    overrides.speed = fieldSpeed * random(1.22, 1.52);
    overrides.profile = asteroidProfiles[3];
  }
  spawnAsteroid(level, overrides);
}

function spawnWave(level) {
  const waveTypes = ['crossingPair', 'gapWall', 'sineRibbon', 'corkscrewPair', 'heavyDebris'];
  const waveType = waveTypes[Math.floor(Math.random() * waveTypes.length)];
  if (waveType === 'crossingPair') {
    spawnCrossingPair(level);
  } else if (waveType === 'gapWall') {
    spawnGapWall(level);
  } else if (waveType === 'sineRibbon') {
    spawnSineRibbon(level);
  } else if (waveType === 'corkscrewPair') {
    spawnCorkscrewPair(level);
  } else {
    spawnHeavyDebris(level);
  }
}

function spawnCrossingPair(level) {
  const highY = random(0.65, PLAY_BOUNDS.yMax - 0.55);
  const lowY = random(PLAY_BOUNDS.yMin + 0.55, -0.85);
  spawnAsteroid(level, {
    x: -PLAY_BOUNDS.x - 1.2,
    y: highY,
    z: -82,
    size: random(0.72, 1.08),
    speed: fieldSpeed * random(1.04, 1.18),
    driftX: random(1.55, 2.25),
    driftY: random(-0.15, 0.1),
    trajectory: createTrajectory('sweeper'),
  });
  spawnAsteroid(level, {
    x: PLAY_BOUNDS.x + 1.2,
    y: lowY,
    z: -95,
    size: random(0.62, 0.98),
    speed: fieldSpeed * random(1.08, 1.24),
    driftX: random(-2.25, -1.55),
    driftY: random(-0.08, 0.16),
    trajectory: createTrajectory('sweeper'),
  });
}

function spawnGapWall(level) {
  const lanes = [-5.4, -2.7, 0, 2.7, 5.4];
  const gapIndex = Math.floor(Math.random() * lanes.length);
  lanes.forEach((x, index) => {
    if (index === gapIndex) return;
    spawnAsteroid(level, {
      x,
      y: random(-2.7, 2.65),
      z: -76 - Math.abs(index - gapIndex) * 5,
      size: random(0.62, 1.0),
      speed: fieldSpeed * random(0.92, 1.04),
      driftX: random(-0.12, 0.12),
      driftY: random(-0.18, 0.18),
      trajectory: createTrajectory('drifter'),
      profile: asteroidProfiles[index % 2 === 0 ? 0 : 1],
    });
  });
}

function spawnSineRibbon(level) {
  const centerY = random(-2.1, 2.2);
  const side = Math.random() < 0.5 ? -1 : 1;
  for (let i = 0; i < 4; i += 1) {
    spawnAsteroid(level, {
      x: side * random(2.4, 5.7),
      y: centerY + random(-0.35, 0.35),
      z: -72 - i * 14,
      size: random(0.45, 0.82),
      speed: fieldSpeed * random(1.0, 1.18),
      driftX: side * random(-0.18, 0.12),
      driftY: random(-0.06, 0.06),
      trajectory: createTrajectory('sine', {
        amplitudeX: random(0.72, 1.25),
        amplitudeY: random(0.08, 0.26),
        frequency: random(1.5, 2.2),
        phase: i * 0.9,
      }),
    });
  }
}

function spawnCorkscrewPair(level) {
  const centerX = random(-2.6, 2.6);
  const centerY = random(-1.6, 1.8);
  for (let i = 0; i < 2; i += 1) {
    spawnAsteroid(level, {
      x: centerX + (i === 0 ? -0.9 : 0.9),
      y: centerY,
      z: -86 - i * 18,
      size: random(0.62, 0.96),
      speed: fieldSpeed * random(1.02, 1.2),
      driftX: random(-0.12, 0.12),
      driftY: random(-0.12, 0.12),
      trajectory: createTrajectory('corkscrew', {
        amplitudeX: random(0.8, 1.15),
        amplitudeY: random(0.52, 0.9),
        frequency: random(1.55, 2.2),
        phase: i * Math.PI,
      }),
    });
  }
}

function spawnHeavyDebris(level) {
  const heavyX = random(-4.7, 4.7);
  const heavyY = random(-2.3, 2.35);
  spawnAsteroid(level, {
    x: heavyX,
    y: heavyY,
    z: -78,
    size: random(1.42, 2.05),
    speed: fieldSpeed * random(0.72, 0.86),
    driftX: random(-0.16, 0.16),
    driftY: random(-0.12, 0.12),
    trajectory: createTrajectory('heavy'),
    profile: asteroidProfiles[Math.random() < 0.5 ? 0 : 2],
  });
  for (let i = 0; i < 3; i += 1) {
    const side = i % 2 === 0 ? -1 : 1;
    spawnAsteroid(level, {
      x: clamp(heavyX + side * random(2.0, 4.1), -PLAY_BOUNDS.x, PLAY_BOUNDS.x),
      y: clamp(heavyY + random(-1.65, 1.65), PLAY_BOUNDS.yMin + 0.4, PLAY_BOUNDS.yMax - 0.4),
      z: -92 - i * 10,
      size: random(0.38, 0.62),
      speed: fieldSpeed * random(1.32, 1.58),
      driftX: side * random(0.35, 0.72),
      driftY: random(-0.22, 0.22),
      trajectory: createTrajectory('shard'),
      profile: asteroidProfiles[3],
    });
  }
}

function chooseTrajectoryProfile() {
  const totalWeight = trajectoryProfiles.reduce((total, profile) => total + profile.weight, 0);
  let roll = Math.random() * totalWeight;
  for (const profile of trajectoryProfiles) {
    roll -= profile.weight;
    if (roll <= 0) return profile;
  }
  return trajectoryProfiles[0];
}

function createTrajectory(type, overrides = {}) {
  const phase = overrides.phase ?? random(0, Math.PI * 2);
  if (type === 'sine') {
    return {
      type,
      amplitudeX: overrides.amplitudeX ?? random(0.55, 1.15),
      amplitudeY: overrides.amplitudeY ?? random(0.06, 0.24),
      frequency: overrides.frequency ?? random(1.2, 2.05),
      phase,
    };
  }
  if (type === 'corkscrew') {
    return {
      type,
      amplitudeX: overrides.amplitudeX ?? random(0.5, 0.95),
      amplitudeY: overrides.amplitudeY ?? random(0.42, 0.82),
      frequency: overrides.frequency ?? random(1.45, 2.25),
      phase,
    };
  }
  if (type === 'sweeper') {
    const direction = overrides.direction ?? (Math.random() < 0.5 ? -1 : 1);
    return {
      type,
      driftX: overrides.driftX ?? direction * random(1.1, 1.85),
      driftY: overrides.driftY ?? random(-0.14, 0.14),
      amplitudeX: overrides.amplitudeX ?? random(0.08, 0.22),
      frequency: overrides.frequency ?? random(1.1, 1.6),
      phase,
    };
  }
  if (type === 'heavy') {
    return {
      type,
      driftX: overrides.driftX ?? random(-0.12, 0.12),
      driftY: overrides.driftY ?? random(-0.1, 0.1),
      amplitudeX: overrides.amplitudeX ?? random(0.08, 0.22),
      amplitudeY: overrides.amplitudeY ?? random(0.04, 0.16),
      frequency: overrides.frequency ?? random(0.65, 1.05),
      phase,
    };
  }
  if (type === 'shard') {
    const direction = overrides.direction ?? (Math.random() < 0.5 ? -1 : 1);
    return {
      type,
      driftX: overrides.driftX ?? direction * random(0.45, 0.95),
      driftY: overrides.driftY ?? random(-0.42, 0.42),
      amplitudeX: overrides.amplitudeX ?? random(0.16, 0.34),
      amplitudeY: overrides.amplitudeY ?? random(0.08, 0.22),
      frequency: overrides.frequency ?? random(2.2, 3.7),
      phase,
    };
  }
  return {
    type: 'drifter',
    driftX: overrides.driftX ?? random(-0.3, 0.3),
    driftY: overrides.driftY ?? random(-0.2, 0.2),
    amplitudeX: overrides.amplitudeX ?? random(0, 0.16),
    amplitudeY: overrides.amplitudeY ?? random(0, 0.12),
    frequency: overrides.frequency ?? random(0.65, 1.1),
    phase,
  };
}

function getTrajectoryOffset(asteroid) {
  const trajectory = asteroid.trajectory;
  if (trajectory.type === 'sine') {
    return {
      x: Math.sin(asteroid.age * trajectory.frequency + trajectory.phase) * trajectory.amplitudeX,
      y: Math.sin(asteroid.age * trajectory.frequency * 0.72 + trajectory.phase * 0.6) * trajectory.amplitudeY,
    };
  }
  if (trajectory.type === 'corkscrew') {
    return {
      x: Math.cos(asteroid.age * trajectory.frequency + trajectory.phase) * trajectory.amplitudeX,
      y: Math.sin(asteroid.age * trajectory.frequency + trajectory.phase) * trajectory.amplitudeY,
    };
  }
  if (trajectory.type === 'sweeper') {
    return {
      x: Math.sin(asteroid.age * trajectory.frequency + trajectory.phase) * trajectory.amplitudeX,
      y: 0,
    };
  }
  if (trajectory.type === 'heavy') {
    return {
      x: Math.sin(asteroid.age * trajectory.frequency + trajectory.phase) * trajectory.amplitudeX,
      y: Math.cos(asteroid.age * trajectory.frequency + trajectory.phase) * trajectory.amplitudeY,
    };
  }
  if (trajectory.type === 'shard') {
    return {
      x: Math.sin(asteroid.age * trajectory.frequency + trajectory.phase) * trajectory.amplitudeX,
      y: Math.cos(asteroid.age * trajectory.frequency * 0.82 + trajectory.phase) * trajectory.amplitudeY,
    };
  }
  return {
    x: Math.sin(asteroid.age * trajectory.frequency + trajectory.phase) * trajectory.amplitudeX,
    y: Math.cos(asteroid.age * trajectory.frequency + trajectory.phase) * trajectory.amplitudeY,
  };
}

function updateEffects(delta) {
  if (shakeAmount > 0) {
    shakeAmount = Math.max(0, shakeAmount - delta * 2.8);
  }
  if (flashTimer > 0) {
    flashTimer = Math.max(0, flashTimer - delta);
    if (flashTimer === 0) screenFlash.classList.remove('show');
  }
}

function updateHud(force = false) {
  hudTimer -= 1;
  if (!force && hudTimer > 0) return;
  hudTimer = 4;

  scoreValue.textContent = formatTime(elapsed);
  bestValue.textContent = formatTime(Math.max(bestScore, elapsed));
  speedValue.textContent = Math.round(fieldSpeed).toString();
  levelValue.textContent = getLevel().toString();
}

function updateCamera(delta) {
  const shakeX = shakeAmount ? (Math.random() - 0.5) * shakeAmount * 0.22 : 0;
  const shakeY = shakeAmount ? (Math.random() - 0.5) * shakeAmount * 0.18 : 0;
  const courseLookX = getCourseBendAtZ(-98);
  camera.position.x = damp(camera.position.x, player.x * 0.08 + courseLookX * 0.04 + shakeX, 5, delta);
  camera.position.y = damp(camera.position.y, 2.15 + player.y * 0.045 + shakeY, 5, delta);
  camera.position.z = damp(camera.position.z, mode === 'running' ? 11.15 : 11.8, 4, delta);
  cameraTarget.set(player.x * 0.055 + courseLookX * 0.13, player.y * 0.035, -48);
  camera.lookAt(cameraTarget);
  camera.rotation.z += -course.turnAmount * 0.006;
}

function spawnAsteroid(level, overrides = {}) {
  const size = overrides.size ?? random(0.44, 1.85) * (Math.random() < 0.12 ? random(1.35, 1.78) : 1);
  const profile = overrides.profile ?? chooseAsteroidProfile();
  const trajectory = overrides.trajectory ?? createTrajectory(chooseTrajectoryProfile().type);
  const geometry = createAsteroidGeometry(profile);
  const material = createAsteroidMaterial(profile);
  material.color.offsetHSL(random(-0.03, 0.03), random(-0.04, 0.04), random(-0.05, 0.08));

  const mesh = new THREE.Mesh(geometry, material);
  const axisScale = overrides.axisScale ?? createAsteroidAxisScale(profile);
  mesh.scale.set(size * axisScale.x, size * axisScale.y, size * axisScale.z);
  mesh.position.set(
    overrides.x ?? random(-PLAY_BOUNDS.x * 1.08, PLAY_BOUNDS.x * 1.08),
    overrides.y ?? random(PLAY_BOUNDS.yMin * 1.05, PLAY_BOUNDS.yMax * 1.05),
    overrides.z ?? random(-96, -54)
  );

  const wireGeometry = new THREE.EdgesGeometry(geometry);
  const wire = new THREE.LineSegments(wireGeometry, asteroidWireMaterial.clone());
  wire.material.opacity = profile.edgeOpacity;
  wire.scale.setScalar(1.012);
  mesh.add(wire);
  asteroidGroup.add(mesh);

  asteroids.push({
    mesh,
    wire,
    wireGeometry,
    trajectory,
    age: 0,
    baseX: mesh.position.x,
    baseY: mesh.position.y,
    edgeOpacity: profile.edgeOpacity,
    edgeBoost: profile.edgeBoost,
    radius: size * Math.max(axisScale.x, axisScale.y, axisScale.z) * 0.84,
    speed: overrides.speed ?? random(fieldSpeed * 0.86, fieldSpeed * 1.42) + level * random(0.35, 0.95),
    driftX: overrides.driftX ?? trajectory.driftX ?? random(-0.46, 0.46),
    driftY: overrides.driftY ?? trajectory.driftY ?? random(-0.32, 0.32),
    rotationX: random(-1.9, 1.9),
    rotationY: random(-1.6, 1.6),
    rotationZ: random(-1.4, 1.4),
  });
}

function createAsteroidGeometry(profile) {
  let geometry;
  if (profile.type === 'smooth') {
    geometry = new THREE.SphereGeometry(1, profile.detail, Math.max(8, Math.floor(profile.detail * 0.7)));
  } else if (profile.type === 'crag') {
    geometry = new THREE.DodecahedronGeometry(1, profile.detail);
  } else if (profile.type === 'shard') {
    geometry = new THREE.OctahedronGeometry(1, profile.detail);
  } else {
    geometry = new THREE.IcosahedronGeometry(1, profile.detail);
  }

  const positions = geometry.attributes.position;
  const vertexOffsets = new Map();
  for (let i = 0; i < positions.count; i += 1) {
    const x = positions.getX(i);
    const y = positions.getY(i);
    const z = positions.getZ(i);
    const key = `${x.toFixed(3)},${y.toFixed(3)},${z.toFixed(3)}`;
    let offset = vertexOffsets.get(key);
    if (offset === undefined) {
      offset = random(1 - profile.distortion, 1 + profile.distortion);
      vertexOffsets.set(key, offset);
    }
    const ridge = profile.type === 'crag' && Math.random() < 0.16 ? random(1.12, 1.34) : 1;
    positions.setXYZ(i, x * offset * ridge, y * offset, z * offset * ridge);
  }
  geometry.computeVertexNormals();
  return geometry;
}

function chooseAsteroidProfile() {
  const totalWeight = asteroidProfiles.reduce((total, profile) => total + profile.weight, 0);
  let roll = Math.random() * totalWeight;
  for (const profile of asteroidProfiles) {
    roll -= profile.weight;
    if (roll <= 0) return profile;
  }
  return asteroidProfiles[0];
}

function createAsteroidMaterial(profile) {
  const color = asteroidColorPalette[Math.floor(Math.random() * asteroidColorPalette.length)];
  return new THREE.MeshStandardMaterial({
    color,
    roughness: profile.roughness,
    metalness: profile.metalness,
    flatShading: profile.flatShading,
  });
}

function createAsteroidAxisScale(profile) {
  if (profile.type === 'shard') {
    return {
      x: random(0.72, 1.08),
      y: random(0.78, 1.2),
      z: random(1.08, 1.52),
    };
  }
  if (profile.type === 'smooth') {
    return {
      x: random(0.9, 1.15),
      y: random(0.88, 1.16),
      z: random(0.9, 1.15),
    };
  }
  return {
    x: random(0.72, 1.34),
    y: random(0.7, 1.3),
    z: random(0.78, 1.42),
  };
}

function checkCollision(asteroid) {
  if (mode !== 'running') return false;
  const position = asteroid.mesh.position;
  reusableVector.set(position.x - player.x, position.y - player.y, (position.z - PLAYER_Z) * 0.78);
  const radius = asteroid.radius + PLAYER_RADIUS;
  return reusableVector.lengthSq() < radius * radius;
}

function clearAsteroids() {
  for (let i = asteroids.length - 1; i >= 0; i -= 1) {
    asteroidGroup.remove(asteroids[i].mesh);
    disposeAsteroid(asteroids[i]);
    asteroids.splice(i, 1);
  }
}

function disposeAsteroid(asteroid) {
  asteroid.mesh.geometry.dispose();
  asteroid.mesh.material.dispose();
  asteroid.wireGeometry.dispose();
  asteroid.wire.material.dispose();
}

function createShip() {
  const group = new THREE.Group();

  const hullMaterial = new THREE.MeshStandardMaterial({
    color: 0xd8e8ed,
    roughness: 0.44,
    metalness: 0.42,
    flatShading: true,
  });
  const blueMaterial = new THREE.MeshStandardMaterial({
    color: 0x39b9ff,
    roughness: 0.52,
    metalness: 0.28,
    flatShading: true,
    side: THREE.DoubleSide,
  });
  const redMaterial = new THREE.MeshStandardMaterial({
    color: 0xff4d59,
    roughness: 0.58,
    metalness: 0.2,
    flatShading: true,
    side: THREE.DoubleSide,
  });
  const flameMaterial = new THREE.MeshBasicMaterial({
    color: 0xffb452,
    transparent: true,
    opacity: 0.82,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  const fuselage = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.34, 1.5), hullMaterial);
  fuselage.position.z = 0.12;
  group.add(fuselage);

  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.32, 1.28, 4), hullMaterial);
  nose.rotation.x = -Math.PI / 2;
  nose.position.z = -0.9;
  group.add(nose);

  const canopy = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.18, 0.5), blueMaterial);
  canopy.position.set(0, 0.22, -0.25);
  canopy.rotation.x = 0.12;
  group.add(canopy);

  const leftWing = createWing(-1, blueMaterial);
  const rightWing = createWing(1, blueMaterial);
  group.add(leftWing, rightWing);

  const leftFin = createFin(-1, redMaterial);
  const rightFin = createFin(1, redMaterial);
  group.add(leftFin, rightFin);

  const engineGeometry = new THREE.BoxGeometry(0.24, 0.22, 0.52);
  const leftEngine = new THREE.Mesh(engineGeometry, hullMaterial);
  const rightEngine = new THREE.Mesh(engineGeometry, hullMaterial);
  leftEngine.position.set(-0.34, -0.08, 0.82);
  rightEngine.position.set(0.34, -0.08, 0.82);
  group.add(leftEngine, rightEngine);

  const flameGeometry = new THREE.ConeGeometry(0.13, 0.7, 5);
  const leftFlame = new THREE.Mesh(flameGeometry, flameMaterial);
  const rightFlame = new THREE.Mesh(flameGeometry, flameMaterial.clone());
  leftFlame.rotation.x = Math.PI / 2;
  rightFlame.rotation.x = Math.PI / 2;
  leftFlame.position.set(-0.34, -0.08, 1.27);
  rightFlame.position.set(0.34, -0.08, 1.27);
  group.add(leftFlame, rightFlame);

  const outline = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(0.58, 0.36, 1.52)),
    new THREE.LineBasicMaterial({ color: 0x67ff9f, transparent: true, opacity: 0.22 })
  );
  outline.position.copy(fuselage.position);
  group.add(outline);

  group.userData.leftFlame = leftFlame;
  group.userData.rightFlame = rightFlame;
  group.scale.setScalar(0.86);
  return group;
}

function createWing(side, material) {
  const geometry = new THREE.BufferGeometry();
  const vertices = new Float32Array([
    side * 0.22, -0.06, -0.28,
    side * 1.48, -0.08, 0.38,
    side * 0.34, -0.04, 0.86,
  ]);
  geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
  geometry.computeVertexNormals();

  const wing = new THREE.Mesh(geometry, material);
  const edge = new THREE.LineSegments(
    new THREE.EdgesGeometry(geometry),
    new THREE.LineBasicMaterial({ color: 0x67ff9f, transparent: true, opacity: 0.38 })
  );
  wing.add(edge);
  return wing;
}

function createFin(side, material) {
  const geometry = new THREE.BufferGeometry();
  const vertices = new Float32Array([
    side * 0.18, 0.08, 0.26,
    side * 0.72, 0.52, 0.72,
    side * 0.24, 0.06, 0.95,
  ]);
  geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
  geometry.computeVertexNormals();

  const fin = new THREE.Mesh(geometry, material);
  const edge = new THREE.LineSegments(
    new THREE.EdgesGeometry(geometry),
    new THREE.LineBasicMaterial({ color: 0xffd195, transparent: true, opacity: 0.36 })
  );
  fin.add(edge);
  return fin;
}

function createFlightGrid() {
  const lineMaterial = new THREE.LineBasicMaterial({
    color: 0x37ff91,
    transparent: true,
    opacity: 0.32,
  });
  const segments = [];
  const y = -5.2;
  for (let z = GRID_FAR_Z; z <= GRID_NEAR_Z; z += GRID_STEP) {
    segments.push({ x1: -13, y1: y, z1: z, x2: 13, y2: y, z2: z });
  }
  for (let x = -12; x <= 12; x += 2) {
    for (let z = GRID_FAR_Z; z < GRID_NEAR_Z; z += GRID_STEP) {
      segments.push({ x1: x, y1: y, z1: z, x2: x, y2: y, z2: z + GRID_STEP });
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(segments.length * 6), 3));
  const gridLine = new THREE.LineSegments(geometry, lineMaterial);
  gridLine.userData.segments = segments;
  updateCourseLineGeometry(gridLine);
  return gridLine;
}

function createRails() {
  const group = new THREE.Group();
  const railColors = [0x32d7c9, 0xffb452, 0x67ff9f];
  railColors.forEach((color, index) => {
    const material = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.35 });
    const segments = [];
    const geometry = new THREE.BufferGeometry();
    const spread = 5.4 + index * 1.65;
    const height = -3.8 + index * 1.15;
    const nearZ = 8;
    const farZ = -130;
    const segmentCount = 18;
    [-1, 1].forEach((side) => {
      for (let i = 0; i < segmentCount; i += 1) {
        const t1 = i / segmentCount;
        const t2 = (i + 1) / segmentCount;
        segments.push({
          x1: side * lerp(spread, spread * 0.22, t1),
          y1: lerp(height, height + 2.4, t1),
          z1: lerp(nearZ, farZ, t1),
          x2: side * lerp(spread, spread * 0.22, t2),
          y2: lerp(height, height + 2.4, t2),
          z2: lerp(nearZ, farZ, t2),
        });
      }
    });
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(segments.length * 6), 3));
    const rail = new THREE.LineSegments(geometry, material);
    rail.userData.segments = segments;
    updateCourseLineGeometry(rail);
    group.add(rail);
  });
  return group;
}

function createStarField() {
  const count = 950;
  const positions = new Float32Array(count * 3);
  const speeds = new Float32Array(count);
  for (let i = 0; i < count; i += 1) {
    resetStar(positions, i * 3, random(-168, 12));
    speeds[i] = random(0.48, 1.55);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({
    color: 0xdaf7ff,
    size: 0.1,
    transparent: true,
    opacity: 0.88,
    sizeAttenuation: true,
  });

  return {
    points: new THREE.Points(geometry, material),
    geometry,
    count,
    speeds,
  };
}

function resetStar(positions, offset, z = random(-168, -70)) {
  positions[offset] = random(-78, 78);
  positions[offset + 1] = random(-42, 42);
  positions[offset + 2] = z;
}

function createWirePlanet() {
  const geometry = new THREE.IcosahedronGeometry(8, 2);
  const material = new THREE.MeshBasicMaterial({
    color: 0x32d7c9,
    wireframe: true,
    transparent: true,
    opacity: 0.18,
  });
  const planet = new THREE.Mesh(geometry, material);
  planet.position.set(-16, 10, -122);
  return planet;
}

function createWarningRing() {
  const geometry = new THREE.TorusGeometry(9.2, 0.018, 8, 72);
  const material = new THREE.MeshBasicMaterial({
    color: 0xffb452,
    transparent: true,
    opacity: 0.28,
  });
  const ring = new THREE.Mesh(geometry, material);
  ring.position.set(0, 0, -92);
  return ring;
}

function handlePointerDown(event) {
  if (mode === 'gameover') {
    startGame();
    return;
  }
  if (mode !== 'running') return;
  event.preventDefault();
  canvas.setPointerCapture(event.pointerId);
  pointerState.active = true;
  pointerState.id = event.pointerId;
  pointerState.startX = event.clientX;
  pointerState.startY = event.clientY;
  pointerState.shipStartX = player.targetX;
  pointerState.shipStartY = player.targetY;
}

function handlePointerMove(event) {
  if (!pointerState.active || pointerState.id !== event.pointerId || mode !== 'running') return;
  event.preventDefault();
  const width = Math.max(window.innerWidth, 1);
  const height = Math.max(window.innerHeight, 1);
  const deltaX = ((event.clientX - pointerState.startX) / width) * PLAY_BOUNDS.x * 2.8;
  const deltaY = -((event.clientY - pointerState.startY) / height) * (PLAY_BOUNDS.yMax - PLAY_BOUNDS.yMin) * 2.4;
  player.targetX = clamp(pointerState.shipStartX + deltaX, -PLAY_BOUNDS.x, PLAY_BOUNDS.x);
  player.targetY = clamp(pointerState.shipStartY + deltaY, PLAY_BOUNDS.yMin, PLAY_BOUNDS.yMax);
}

function handlePointerUp(event) {
  if (pointerState.id !== event.pointerId) return;
  event.preventDefault();
  if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
  pointerState.active = false;
  pointerState.id = null;
}

function handleKeyDown(event) {
  if (event.code === 'Space' || event.code === 'Enter') {
    if (mode === 'idle' || mode === 'gameover') {
      event.preventDefault();
      startGame();
      return;
    }
    if (mode === 'paused') {
      event.preventDefault();
      resumeGame();
      return;
    }
  }

  if (event.code === 'Escape' && mode === 'running') {
    event.preventDefault();
    pauseGame();
    return;
  }

  keys.add(event.code);
}

function handleKeyUp(event) {
  keys.delete(event.code);
}

function resizeRenderer() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(width, height, false);
  camera.aspect = width / Math.max(height, 1);
  camera.updateProjectionMatrix();
}

function getLevel() {
  return Math.max(1, Math.floor(elapsed / 10) + 1);
}

function formatTime(value) {
  return `${Math.max(0, value).toFixed(2)} s`;
}

function loadBestScore() {
  try {
    const stored = Number(localStorage.getItem(STORAGE_KEY));
    return Number.isFinite(stored) ? stored : 0;
  } catch (error) {
    return 0;
  }
}

function saveBestScore(value) {
  try {
    localStorage.setItem(STORAGE_KEY, String(value));
  } catch (error) {
    // Storage can fail in private browsing; gameplay does not depend on it.
  }
}

function damp(current, target, lambda, delta) {
  return THREE.MathUtils.damp(current, target, lambda, delta);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function lerp(start, end, amount) {
  return start + (end - start) * amount;
}

function random(min, max) {
  return min + Math.random() * (max - min);
}
