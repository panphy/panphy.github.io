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
let lastFrameTime = 0;
let fieldSpeed = BASE_FIELD_SPEED;
let shakeAmount = 0;
let flashTimer = 0;
let pausedByVisibility = false;
let hudTimer = 0;

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
  spawnAsteroid(1, { x: -4.2, y: 1.2, z: -64, size: 1.18, speed: BASE_FIELD_SPEED * 0.95, profile: asteroidProfiles[2] });
  spawnAsteroid(1, { x: 4.9, y: -2.2, z: -88, size: 0.92, speed: BASE_FIELD_SPEED * 1.08, profile: asteroidProfiles[1] });
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
  ship.rotation.z = damp(ship.rotation.z, clamp(-velocityX * 0.055, -0.58, 0.58), 9, delta);
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
  grid.position.z += speed * delta;
  if (grid.position.z > 8) grid.position.z -= 8;

  rails.children.forEach((rail, index) => {
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
  warningRing.rotation.z -= delta * 0.9;
  warningRing.scale.setScalar(1 + Math.sin(performance.now() * 0.004) * 0.035);
}

function updateSpawning(delta, level) {
  spawnTimer -= delta;
  const spawnInterval = Math.max(0.2, 0.82 - elapsed * 0.012);

  while (spawnTimer <= 0) {
    spawnAsteroid(level);
    if (Math.random() < Math.min(0.08 + elapsed * 0.0035, 0.34)) {
      spawnAsteroid(level);
    }
    spawnTimer += spawnInterval * random(0.68, 1.28);
  }
}

function updateAsteroids(delta) {
  for (let i = asteroids.length - 1; i >= 0; i -= 1) {
    const asteroid = asteroids[i];
    const mesh = asteroid.mesh;
    mesh.position.z += asteroid.speed * delta;
    mesh.position.x += asteroid.driftX * delta;
    mesh.position.y += asteroid.driftY * delta;
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
  camera.position.x = damp(camera.position.x, player.x * 0.08 + shakeX, 5, delta);
  camera.position.y = damp(camera.position.y, 2.15 + player.y * 0.045 + shakeY, 5, delta);
  camera.position.z = damp(camera.position.z, mode === 'running' ? 11.15 : 11.8, 4, delta);
  cameraTarget.set(player.x * 0.055, player.y * 0.035, -48);
  camera.lookAt(cameraTarget);
}

function spawnAsteroid(level, overrides = {}) {
  const size = overrides.size ?? random(0.44, 1.85) * (Math.random() < 0.12 ? random(1.35, 1.78) : 1);
  const profile = overrides.profile ?? chooseAsteroidProfile();
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
    edgeOpacity: profile.edgeOpacity,
    edgeBoost: profile.edgeBoost,
    radius: size * Math.max(axisScale.x, axisScale.y, axisScale.z) * 0.84,
    speed: overrides.speed ?? random(fieldSpeed * 0.86, fieldSpeed * 1.42) + level * random(0.35, 0.95),
    driftX: overrides.driftX ?? random(-0.46, 0.46),
    driftY: overrides.driftY ?? random(-0.32, 0.32),
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
  const vertices = [];
  const y = -5.2;
  for (let z = -160; z <= 24; z += 8) {
    vertices.push(-13, y, z, 13, y, z);
  }
  for (let x = -12; x <= 12; x += 2) {
    vertices.push(x, y, -160, x, y, 24);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  return new THREE.LineSegments(geometry, lineMaterial);
}

function createRails() {
  const group = new THREE.Group();
  const railColors = [0x32d7c9, 0xffb452, 0x67ff9f];
  railColors.forEach((color, index) => {
    const material = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.35 });
    const geometry = new THREE.BufferGeometry();
    const spread = 5.4 + index * 1.65;
    const height = -3.8 + index * 1.15;
    geometry.setAttribute('position', new THREE.Float32BufferAttribute([
      -spread, height, 8,
      -spread * 0.22, height + 2.4, -130,
      spread, height, 8,
      spread * 0.22, height + 2.4, -130,
    ], 3));
    group.add(new THREE.LineSegments(geometry, material));
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

function random(min, max) {
  return min + Math.random() * (max - min);
}
