import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import * as Physics from './physics.js';

const { N } = Physics;

// --- Display scale -------------------------------------------------------
// One proportional factor turns the simulation's reduced temperature into
// kelvin for a fictional substance, so equal steps in the model are equal
// steps on the thermometer. With this factor the 256-particle sample melts
// near 300 K and boils near 640 K at the lid's outside pressure (measured
// from slow heating runs of this model); the thermometer marks both.
const KELVIN_PER_UNIT = 750;
const MELT_K = 300;
const BOIL_K = 640;
const DISPLAY_MAX_K = Physics.T_MAX * KELVIN_PER_UNIT;
const PRESET_K = { solid: 100, liquid: 450, gas: 1000 };

// --- Timing and control --------------------------------------------------
const SIM_SPEED = 2.5; // simulation time units per real second
const TIME_STEP = 0.005;
const MAX_STEPS_PER_FRAME = 40;
const RAMP_RATE = 0.15; // reduced temperature per time unit between presets
const TEMPERATURE_SMOOTHING_TIME = 1.0;
// The Solid preset first lets any gas condense into a liquid, then pauses just
// below the freezing point until the particles have lined up into a crystal
// (or the wait times out), then cools to the preset. Crystals take a while to
// grow, so by default the pause runs in fast-forward; users can turn that off.
const CONDENSE_T = 0.55;
const ANNEAL_T = 0.3;
const ANNEAL_MIN_TIME = 5;
const ANNEAL_TIMEOUT = 100;
const FAST_FORWARD = 4;
const FAST_FORWARD_STORAGE_KEY = 'panphy-states-fast-forward';
const DIAG_INTERVAL = 3; // frames between structure analyses
const PHASE_CONFIRM_COUNT = 6; // analyses a new phase must persist for

const PARTICLE_RADIUS = 0.42;
const ROD_LENGTH = 3;
const WALL_INSET = Physics.WALL_CONTACT - PARTICLE_RADIUS;
const MAX_BONDS = 2000;

const kelvinToReduced = (k) => k / KELVIN_PER_UNIT;
const reducedToKelvin = (t) => t * KELVIN_PER_UNIT;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

// --- DOM ------------------------------------------------------------------
const $ = (id) => document.getElementById(id);
const canvas = $('simCanvas');
const simPanel = $('simPanel');
const thermoOverlay = document.querySelector('.sim-thermometer-overlay');
const thermoTargetLine = document.querySelector('.thermometer-target-line');
const meltMarker = $('meltMarker');
const boilMarker = $('boilMarker');
const thermoReadout = $('thermoReadout');
const phaseBadge = $('phaseBadge');
const phaseBadgeText = $('phaseBadgeText');
const phaseVal = $('phaseVal');
const phaseText = $('phaseText');
const phaseDetail = $('phaseDetail');
const tempVal = $('tempVal');
const volumeVal = $('volumeVal');
const keVal = $('keVal');
const peVal = $('peVal');
const teVal = $('teVal');
const fastForwardToggle = $('fastForwardToggle');
const playPauseBtn = $('playPauseBtn');
const resetBtn = $('resetBtn');
const simHint = $('simHint');
const fastForwardBadge = $('fastForwardBadge');
const presetButtons = {
  solid: $('presetSolidBtn'),
  liquid: $('presetLiquidBtn'),
  gas: $('presetGasBtn')
};
const colorModeButtons = Array.from(document.querySelectorAll('[data-color-mode]'));
const legends = Array.from(document.querySelectorAll('[data-legend]'));

// --- State ----------------------------------------------------------------
const sim = Physics.createSim();

const state = {
  playing: true,
  fastForwardEnabled: true,
  rampTarget: kelvinToReduced(PRESET_K.solid),
  activePreset: 'solid',
  anneal: null,
  smoothT: kelvinToReduced(PRESET_K.solid),
  smoothKE: 0,
  smoothPE: 0,
  direction: 1,
  metrics: { crystal: 0.42, isolated: 0, mobile: 0 },
  ordered: true,
  phaseKey: 'solid',
  phaseCandidate: 'solid',
  phaseCandidateCount: 0,
  referenceLid: 1,
  referenceBonds: 1,
  colorMode: 'neighbours',
  userZoom: 1,
  userInteracting: false,
  lastInteraction: 0,
  viewReserve: 0,
  accumulator: 0
};

// --- Thermostat ---------------------------------------------------------------
function updateThermostat(dt) {
  let goal = state.rampTarget;
  const anneal = state.anneal;
  if (anneal && anneal.stage === 'condense') {
    goal = Math.max(goal, CONDENSE_T);
    if (sim.targetT === goal && state.metrics.isolated < 0.08) anneal.stage = 'hold';
  }
  if (anneal && anneal.stage === 'hold') {
    goal = Math.max(goal, ANNEAL_T);
    anneal.holding = sim.targetT === ANNEAL_T && goal === ANNEAL_T;
    if (anneal.holding) {
      anneal.held += dt;
      const ordered = anneal.held > ANNEAL_MIN_TIME && Physics.isWellOrdered(sim, state.smoothT);
      if (ordered || anneal.held > ANNEAL_TIMEOUT) {
        anneal.stage = 'done';
        anneal.holding = false;
      }
    }
  }

  const step = RAMP_RATE * dt;
  sim.targetT = sim.targetT < goal ? Math.min(goal, sim.targetT + step) : Math.max(goal, sim.targetT - step);
  if (anneal && anneal.stage === 'done' && sim.targetT === state.rampTarget) state.anneal = null;
}

function applyPreset(preset) {
  state.rampTarget = clamp(kelvinToReduced(PRESET_K[preset]), Physics.T_MIN, Physics.T_MAX);
  state.activePreset = preset;
  state.anneal = null;
  if (preset === 'solid') {
    // Cool (or warm a glassy solid) gently through the freezing point unless
    // the sample is already a cold, well-ordered crystal.
    const alreadyCrystal = state.smoothT < ANNEAL_T && Physics.isWellOrdered(sim, state.smoothT);
    if (!alreadyCrystal) {
      const needsCondensing = state.metrics.isolated > 0.08 || state.smoothT > CONDENSE_T;
      state.anneal = { stage: needsCondensing ? 'condense' : 'hold', held: 0, holding: false };
    }
  }
  updatePresetButtons();
}

function updatePresetButtons() {
  for (const [key, button] of Object.entries(presetButtons)) {
    const active = state.activePreset === key;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-pressed', active ? 'true' : 'false');
  }
}

// --- Phase ------------------------------------------------------------------
// Gas is judged by how many particles have almost no neighbours; solid versus
// liquid by whether the other particles stay in place or wander off. Far below
// the freezing point anything that is not gas is solid, even if a loose,
// frosty clump is still settling.
function classifyPhase(m) {
  if (m.isolated >= 0.7) return 'gas';
  if (m.isolated >= 0.35) return 'boiling';
  if (m.mobile < 0.22 || state.smoothT < 0.25) return 'solid';
  if (m.mobile < 0.36) return 'melting';
  return 'liquid';
}

function describePhase() {
  const key = state.phaseKey;
  const heating = state.direction >= 0;
  if (state.anneal && state.anneal.holding && key !== 'gas' && key !== 'boiling') {
    return {
      data: 'melting',
      label: 'Freezing',
      detail: 'Held just below the freezing point so the particles have time to line up into a crystal. Freezing gives out energy, which the surroundings take away.'
    };
  }
  switch (key) {
    case 'gas':
      return { data: 'gas', label: 'Gas', detail: 'Particles are far apart, moving fast in all directions and filling the container. Their collisions hold the lid up.' };
    case 'boiling':
      return heating
        ? { data: 'boiling', label: 'Boiling', detail: 'Particles are escaping from the liquid into the gas. The gas needs far more room, so the lid rises, while the temperature climbs only slowly.' }
        : { data: 'boiling', label: 'Condensing', detail: 'Gas particles are slowing and clumping back into a liquid. The gas takes up less room, so the lid comes down.' };
    case 'melting':
      return heating
        ? { data: 'melting', label: 'Melting', detail: 'The regular pattern is breaking up. Energy goes into loosening the particles, so the temperature climbs only slowly.' }
        : { data: 'melting', label: 'Freezing', detail: 'Particles are settling into a regular pattern, giving out energy as they do.' };
    case 'liquid':
      return { data: 'liquid', label: 'Liquid', detail: 'Particles stay close together but slide past one another, so the liquid can flow and change shape.' };
    default:
      return state.ordered
        ? { data: 'solid', label: 'Solid', detail: 'Particles are locked in a regular pattern and vibrate about fixed positions.' }
        : { data: 'solid', label: 'Solid', detail: 'Particles are locked in place, but in a jumbled arrangement: an amorphous solid, like glass. It froze too quickly for a crystal to grow. Choose Solid to regrow a crystal.' };
  }
}

let shownPhase = null;
function renderPhase() {
  const info = describePhase();
  const signature = info.label + '|' + info.detail;
  if (signature === shownPhase) return;
  shownPhase = signature;
  phaseBadge.dataset.phase = info.data;
  phaseVal.dataset.phase = info.data;
  phaseBadgeText.textContent = info.label;
  phaseText.textContent = info.label;
  phaseDetail.textContent = info.detail;
}

function updateStructure() {
  const result = Physics.analyseStructure(sim, bondPositions);
  const m = state.metrics;
  m.crystal += (result.crystalFraction - m.crystal) * 0.25;
  m.isolated += (result.isolatedFraction - m.isolated) * 0.25;
  m.mobile += (result.mobileFraction - m.mobile) * 0.25;

  // Crystal or glass, with a little hysteresis so the wording cannot flicker.
  if (state.ordered && !Physics.isWellOrdered(sim, state.smoothT, 0.35)) state.ordered = false;
  else if (!state.ordered && Physics.isWellOrdered(sim, state.smoothT, 0.25)) state.ordered = true;

  const raw = classifyPhase(m);
  if (raw === state.phaseCandidate) {
    state.phaseCandidateCount++;
  } else {
    state.phaseCandidate = raw;
    state.phaseCandidateCount = 1;
  }
  if (raw !== state.phaseKey && state.phaseCandidateCount >= PHASE_CONFIRM_COUNT) {
    state.phaseKey = raw;
  }

  for (let i = 0; i < N; i++) {
    smoothCoordination[i] += (sim.coordination[i] - smoothCoordination[i]) * 0.35;
  }
  bondPosAttr.needsUpdate = true;
  bondGeo.setDrawRange(0, Math.min(result.bonds, MAX_BONDS) * 2);
  bondMat.opacity = 0.05 + 0.25 * clamp(result.bonds / state.referenceBonds, 0, 1);
}

// --- Three.js scene ---------------------------------------------------------
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 500);
camera.position.set(8, 12, 30);

const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.enablePan = false;
controls.minDistance = 3;
controls.maxDistance = 300;
controls.target.set(0, 4, 0);
controls.addEventListener('start', () => {
  state.userInteracting = true;
  state.lastInteraction = performance.now();
});
controls.addEventListener('end', () => {
  state.userInteracting = false;
  state.lastInteraction = performance.now();
});

scene.add(new THREE.AmbientLight(0xffffff, 0.75));
const keyLight = new THREE.DirectionalLight(0xffffff, 1.3);
keyLight.position.set(12, 30, 18);
scene.add(keyLight);
const fillLight = new THREE.DirectionalLight(0xffffff, 0.45);
fillLight.position.set(-14, 10, -12);
scene.add(fillLight);

const containerWidth = Physics.BOX_WIDTH - 2 * WALL_INSET;
const containerMat = new THREE.LineBasicMaterial({ transparent: true, opacity: 0.6 });
const container = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1)), containerMat);
scene.add(container);

const floorMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.08, depthWrite: false, side: THREE.DoubleSide });
const floor = new THREE.Mesh(new THREE.PlaneGeometry(containerWidth, containerWidth), floorMat);
floor.rotation.x = -Math.PI / 2;
floor.position.y = WALL_INSET;
scene.add(floor);

const lidGroup = new THREE.Group();
const lidPlateMat = new THREE.MeshStandardMaterial({ transparent: true, opacity: 0.3, roughness: 0.4, depthWrite: false });
const lidPlate = new THREE.Mesh(new THREE.BoxGeometry(containerWidth, 0.3, containerWidth), lidPlateMat);
lidPlate.position.y = 0.15;
lidGroup.add(lidPlate);
const lidEdgeMat = new THREE.LineBasicMaterial({ transparent: true, opacity: 0.8 });
const lidEdges = new THREE.LineSegments(new THREE.EdgesGeometry(lidPlate.geometry), lidEdgeMat);
lidEdges.position.copy(lidPlate.position);
lidGroup.add(lidEdges);
const rodMat = new THREE.MeshStandardMaterial({ roughness: 0.35, metalness: 0.3 });
const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, ROD_LENGTH, 20), rodMat);
rod.position.y = 0.3 + ROD_LENGTH / 2;
lidGroup.add(rod);
scene.add(lidGroup);

const particleMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3, metalness: 0.05 });
const particles = new THREE.InstancedMesh(new THREE.SphereGeometry(PARTICLE_RADIUS, 20, 14), particleMat, N);
particles.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
particles.frustumCulled = false;
scene.add(particles);
const dummy = new THREE.Object3D();

const bondPositions = new Float32Array(MAX_BONDS * 6);
const bondGeo = new THREE.BufferGeometry();
const bondPosAttr = new THREE.BufferAttribute(bondPositions, 3);
bondPosAttr.setUsage(THREE.DynamicDrawUsage);
bondGeo.setAttribute('position', bondPosAttr);
bondGeo.setDrawRange(0, 0);
const bondMat = new THREE.LineBasicMaterial({ transparent: true, opacity: 0.3, depthWrite: false });
const bondLines = new THREE.LineSegments(bondGeo, bondMat);
bondLines.frustumCulled = false;
scene.add(bondLines);

// --- Colours --------------------------------------------------------------
const palette = {
  plain: new THREE.Color(),
  fewNeighbours: new THREE.Color('#FDE725'),
  someNeighbours: new THREE.Color('#35B779'),
  manyNeighbours: new THREE.Color('#31688E'),
  slow: new THREE.Color('#0EA5E9'),
  mid: new THREE.Color('#FACC15'),
  fast: new THREE.Color('#DC2626')
};
const smoothCoordination = new Float32Array(N).fill(12);
const smoothSpeed = new Float32Array(N);
const tmpColor = new THREE.Color();

function isDark() {
  return document.documentElement.getAttribute('data-theme') === 'dark';
}

function applyTheme() {
  const dark = isDark();
  scene.background = new THREE.Color(dark ? 0x151513 : 0xEFEBE3);
  containerMat.color.setHex(dark ? 0x6B665E : 0x9C958B);
  floorMat.color.setHex(dark ? 0x9C9890 : 0x6B6560);
  lidPlateMat.color.setHex(dark ? 0x8A857C : 0xA8A097);
  lidEdgeMat.color.setHex(dark ? 0xA8A39A : 0x6B6560);
  rodMat.color.setHex(dark ? 0x8A857C : 0x8C857B);
  bondMat.color.setHex(dark ? 0xE7E2DA : 0x5A544E);
  palette.plain.setHex(dark ? 0xD6D0C8 : 0x77706A);
}

// A neutral scale (not the phase colours): particles on a crystal's surface
// have fewer neighbours than those inside it, which is why melting and
// evaporation start at the surface.
function neighbourColor(c, out) {
  if (c <= 2) return out.copy(palette.fewNeighbours);
  if (c < 7) return out.copy(palette.fewNeighbours).lerp(palette.someNeighbours, (c - 2) / 5);
  if (c < 11) return out.copy(palette.someNeighbours).lerp(palette.manyNeighbours, (c - 7) / 4);
  return out.copy(palette.manyNeighbours);
}

function speedColor(s, out) {
  const t = clamp(s / 3.2, 0, 1);
  if (t < 0.55) return out.copy(palette.slow).lerp(palette.mid, t / 0.55);
  return out.copy(palette.mid).lerp(palette.fast, (t - 0.55) / 0.45);
}

function updateParticleColors() {
  const vel = sim.vel;
  for (let i = 0; i < N; i++) {
    const b = i * 3;
    const speed = Math.sqrt(vel[b] * vel[b] + vel[b + 1] * vel[b + 1] + vel[b + 2] * vel[b + 2]);
    smoothSpeed[i] += (speed - smoothSpeed[i]) * 0.25;
    if (state.colorMode === 'neighbours') neighbourColor(smoothCoordination[i], tmpColor);
    else if (state.colorMode === 'speed') speedColor(smoothSpeed[i], tmpColor);
    else tmpColor.copy(palette.plain);
    particles.setColorAt(i, tmpColor);
  }
  particles.instanceColor.needsUpdate = true;
}

function setColorMode(mode, focus) {
  state.colorMode = mode;
  for (const button of colorModeButtons) {
    const selected = button.dataset.colorMode === mode;
    button.setAttribute('aria-checked', selected ? 'true' : 'false');
    button.tabIndex = selected ? 0 : -1;
    if (selected && focus) button.focus();
  }
  for (const legend of legends) legend.hidden = legend.dataset.legend !== mode;
  updateParticleColors();
}

// --- Scene sync and camera fit ---------------------------------------------
function syncScene() {
  const pos = sim.pos;
  for (let i = 0; i < N; i++) {
    dummy.position.set(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]);
    dummy.updateMatrix();
    particles.setMatrixAt(i, dummy.matrix);
  }
  particles.instanceMatrix.needsUpdate = true;

  const lidFace = sim.lid - WALL_INSET;
  const height = lidFace - WALL_INSET;
  container.scale.set(containerWidth, height, containerWidth);
  container.position.y = WALL_INSET + height / 2;
  lidGroup.position.y = lidFace;
}

const cameraOffset = new THREE.Vector3();
const desiredTarget = new THREE.Vector3();

function fitDistance() {
  const width = canvas.clientWidth || 1;
  const height = canvas.clientHeight || 1;
  const usableAspect = Math.max(0.3, (width - state.viewReserve) / height);
  const vFov = THREE.MathUtils.degToRad(camera.fov);
  const hFov = 2 * Math.atan(Math.tan(vFov / 2) * usableAspect);
  const frameHeight = sim.lid + 0.3 + ROD_LENGTH;
  const radius = 0.5 * Math.sqrt(2 * containerWidth * containerWidth + frameHeight * frameHeight);
  return (radius / Math.sin(Math.min(vFov, hFov) / 2)) * 0.9;
}

function updateCamera() {
  const frameHeight = sim.lid + 0.3 + ROD_LENGTH;
  desiredTarget.set(0, frameHeight * 0.45, 0);
  const shift = desiredTarget.clone().sub(controls.target).multiplyScalar(0.08);
  controls.target.add(shift);
  camera.position.add(shift);

  cameraOffset.copy(camera.position).sub(controls.target);
  const distance = cameraOffset.length();
  const fit = fitDistance();
  const recentlyTouched = state.userInteracting || performance.now() - state.lastInteraction < 500;
  if (recentlyTouched) {
    state.userZoom = clamp(distance / fit, 0.3, 3);
  } else {
    const desired = fit * state.userZoom;
    cameraOffset.setLength(distance + (desired - distance) * 0.08);
    camera.position.copy(controls.target).add(cameraOffset);
  }
}

function resize() {
  const width = simPanel.clientWidth;
  const height = simPanel.clientHeight;
  if (!width || !height) return;
  const panelRect = simPanel.getBoundingClientRect();
  const leftEdge = Math.min(thermoOverlay.getBoundingClientRect().left, meltMarker.getBoundingClientRect().left, boilMarker.getBoundingClientRect().left);
  // Shift the view left so the container is centred in the space beside the
  // thermometer instead of disappearing behind it.
  state.viewReserve = clamp(panelRect.right - leftEdge + 8, 0, width * 0.45);
  const reserve = state.viewReserve;
  camera.aspect = (width + reserve) / height;
  camera.setViewOffset(width + reserve, height, reserve, 0, width, height);
  camera.updateProjectionMatrix();
  renderer.setSize(width, height, false);
}

// --- Thermometer and readouts ----------------------------------------------
function kelvinFraction(k) {
  return clamp(k / DISPLAY_MAX_K, 0, 1);
}

function formatK(reducedT) {
  return Math.round(reducedToKelvin(reducedT)) + ' K';
}

let lastReadout = '';
function updateReadouts() {
  const shownT = formatK(state.smoothT);
  if (shownT !== lastReadout) {
    lastReadout = shownT;
    thermoReadout.textContent = shownT;
    tempVal.textContent = shownT;
  }
  thermoOverlay.style.setProperty('--fill', kelvinFraction(reducedToKelvin(state.smoothT)).toFixed(4));
  thermoTargetLine.style.setProperty('--p', kelvinFraction(reducedToKelvin(sim.targetT)).toFixed(4));

  volumeVal.textContent = (sim.lid / state.referenceLid).toFixed(1) + '×';

  state.smoothKE += (sim.kinetic / N - state.smoothKE) * 0.15;
  state.smoothPE += (sim.potential / N - state.smoothPE) * 0.15;
  keVal.textContent = state.smoothKE.toFixed(2);
  peVal.textContent = state.smoothPE.toFixed(2);
  teVal.textContent = (state.smoothKE + state.smoothPE).toFixed(2);

  fastForwardBadge.hidden = !isFastForwarding();
  updatePresetButtons();
  renderPhase();
}

// --- Simulation control -------------------------------------------------------
function resetSimulation() {
  const start = kelvinToReduced(PRESET_K.solid);
  Physics.resetSim(sim, start);
  state.rampTarget = start;
  state.activePreset = 'solid';
  state.anneal = null;
  state.smoothT = start;
  state.smoothKE = sim.kinetic / N;
  state.smoothPE = sim.potential / N;
  state.direction = 1;
  state.referenceLid = sim.lid;
  const result = Physics.analyseStructure(sim, bondPositions);
  state.referenceBonds = Math.max(1, result.bonds);
  state.metrics.crystal = result.crystalFraction;
  state.metrics.isolated = result.isolatedFraction;
  state.metrics.mobile = 0;
  state.phaseKey = 'solid';
  state.ordered = true;
  state.phaseCandidate = 'solid';
  state.phaseCandidateCount = 0;
  smoothCoordination.set(sim.coordination);
  smoothSpeed.fill(0);
  state.accumulator = 0;
  updateStructure();
  syncScene();
  updateParticleColors();
  updateReadouts();
  if (!state.playing) togglePlay();
}

function togglePlay() {
  state.playing = !state.playing;
  playPauseBtn.textContent = state.playing ? 'Pause' : 'Play';
  playPauseBtn.className = state.playing ? 'btn btn-primary' : 'btn btn-secondary';
}

function isFastForwarding() {
  return state.fastForwardEnabled && Boolean(state.anneal && state.anneal.holding);
}

function advance(realDt) {
  state.accumulator += realDt * SIM_SPEED * (isFastForwarding() ? FAST_FORWARD : 1);
  let steps = Math.floor(state.accumulator / TIME_STEP);
  if (steps > MAX_STEPS_PER_FRAME) {
    steps = MAX_STEPS_PER_FRAME;
    state.accumulator = 0;
  } else {
    state.accumulator -= steps * TIME_STEP;
  }
  const alpha = TIME_STEP / TEMPERATURE_SMOOTHING_TIME;
  for (let s = 0; s < steps; s++) {
    updateThermostat(TIME_STEP);
    Physics.stepSim(sim, TIME_STEP);
    state.smoothT += (Physics.temperatureOf(sim) - state.smoothT) * alpha;
  }

  // Heating or cooling, judged from where the thermostat is heading so that
  // noise cannot flip "Melting" to "Freezing" while the sample is held.
  if (sim.targetT - state.smoothT > 0.01) state.direction = 1;
  else if (sim.targetT - state.smoothT < -0.01) state.direction = -1;
}

// --- Events -------------------------------------------------------------------
for (const [key, button] of Object.entries(presetButtons)) {
  button.addEventListener('click', () => applyPreset(key));
}

function readFastForwardPreference() {
  try {
    return localStorage.getItem(FAST_FORWARD_STORAGE_KEY) !== '0';
  } catch (error) {
    return true;
  }
}

function setFastForward(enabled) {
  state.fastForwardEnabled = enabled;
  fastForwardToggle.checked = enabled;
  try {
    if (enabled) localStorage.removeItem(FAST_FORWARD_STORAGE_KEY);
    else localStorage.setItem(FAST_FORWARD_STORAGE_KEY, '0');
  } catch (error) {
    // The choice still applies for this visit when storage is unavailable.
  }
}

fastForwardToggle.addEventListener('change', () => setFastForward(fastForwardToggle.checked));

colorModeButtons.forEach((button, index) => {
  button.addEventListener('click', () => setColorMode(button.dataset.colorMode));
  button.addEventListener('keydown', (e) => {
    const delta = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
    if (!delta) return;
    e.preventDefault();
    const next = colorModeButtons[(index + delta + colorModeButtons.length) % colorModeButtons.length];
    setColorMode(next.dataset.colorMode, true);
  });
});

playPauseBtn.addEventListener('click', togglePlay);
resetBtn.addEventListener('click', resetSimulation);

const INTERACTIVE = 'button, input, select, textarea, a, label, [role="radio"], [contenteditable]';
document.addEventListener('keydown', (e) => {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  if (e.target instanceof Element && e.target.closest(INTERACTIVE)) return;
  if (e.code === 'Space') {
    e.preventDefault();
    togglePlay();
  } else if (e.code === 'KeyR') {
    resetSimulation();
  }
});

new MutationObserver(applyTheme).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

const coarsePointer = window.matchMedia('(pointer: coarse)');
function updateHint() {
  simHint.textContent = coarsePointer.matches ? 'Drag to rotate · Pinch to zoom' : 'Drag to rotate · Scroll to zoom';
}
coarsePointer.addEventListener('change', updateHint);
updateHint();

new ResizeObserver(resize).observe(simPanel);

// --- Start --------------------------------------------------------------------
function placeStaticMarkers() {
  meltMarker.style.setProperty('--p', kelvinFraction(MELT_K).toFixed(4));
  boilMarker.style.setProperty('--p', kelvinFraction(BOIL_K).toFixed(4));
  for (const [key, k] of Object.entries(PRESET_K)) {
    const label = document.querySelector('[data-preset-temp="' + key + '"]');
    if (label) label.textContent = k + ' K';
  }
}

placeStaticMarkers();
applyTheme();
setFastForward(readFastForwardPreference());
setColorMode(state.colorMode);
resetSimulation();
resize();
camera.position.copy(controls.target).add(new THREE.Vector3(0.3, 0.42, 1).normalize().multiplyScalar(fitDistance()));

let lastTime = 0;
let frameCount = 0;
let animationId = null;

function animate(timestamp) {
  animationId = requestAnimationFrame(animate);
  const realDt = lastTime ? Math.min(0.05, (timestamp - lastTime) / 1000) : 0;
  lastTime = timestamp;

  if (state.playing && realDt > 0) {
    advance(realDt);
    if (++frameCount >= DIAG_INTERVAL) {
      frameCount = 0;
      updateStructure();
    }
    syncScene();
    updateParticleColors();
    updateReadouts();
  }

  updateCamera();
  controls.update();
  renderer.render(scene, camera);
}

document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    if (animationId) cancelAnimationFrame(animationId);
    animationId = null;
  } else if (!animationId) {
    lastTime = 0;
    animationId = requestAnimationFrame(animate);
  }
});

animationId = requestAnimationFrame(animate);
