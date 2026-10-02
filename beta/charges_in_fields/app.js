import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { MODES, MODE_ORDER, PARTICLES, MODE_PARTICLES, STEPPERS, CONTROLS, PARTS, QUESTIONS } from './content.js';
import { Quiz, loadProgress, saveProgress, setSummary } from './quiz.js';

const $ = id => document.getElementById(id);
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const state = {
  mode: 'efield',
  playing: !reducedMotion,
  visible: true,
  particle: { efield: 'electron', bfield: 'proton', selector: 'proton', cyclotron: 'proton' },
  swap: false,
  reverseB: false,
  autotune: true,
  beam: false,
  values: {}
};

const TRANSITION_TIME = 0.6;
// Real geometry in metres.
const PLATE_LENGTH = 0.10;
const SELECTOR_GAP = 0.02;
const SLIT_X = 0.065;
const SLIT_HALF = 0.0015;
const SCREEN_X = 0.12;
const DEE_RADIUS = 0.5;
const DEE_GAP = 0.03;
// Scene units per metre: centimetres for the bench experiments, tens of centimetres for the cyclotron.
const SCALE = { efield: 100, bfield: 100, selector: 100, cyclotron: 10 };
// How far a particle travels per on-screen second, so every track is easy to follow.
const DISPLAY_DISTANCE = { efield: 0.05, bfield: 0.06, selector: 0.05 };
const CYCLOTRON_TURN_TIME = 0.8;
const B_REGION = { x: 9, y: 9, zMin: -30, zMax: 3 };
const SPEED_SPREAD = [0.3, 1.7];
const HISTOGRAM_BINS = 14;

const HOME = {
  efield: { extent: { w: 11, h: 6.5 }, target: [2, 0, 0], direction: [0.35, 0.3, 1.25] },
  bfield: { extent: { w: 7.5, h: 7.5 }, target: [0, 0, -2], direction: [0.3, 0.22, 1.2] },
  selector: { extent: { w: 8.6, h: 4 }, target: [1, 0, 0], direction: [0.4, 0.35, 1.25] },
  cyclotron: { extent: { w: 6.6, h: 4.6 }, target: [0, -0.6, 0.8], direction: [0.25, 0.85, 1.0] }
};

const viewer = $('viewer');
const viewerPanel = $('viewer-panel');
const readout = $('particle-readout');

// ---------- Fullscreen ----------
const fullscreenButton = $('fullscreen');
let fallbackFullscreen = false;
function updateFullscreen() {
  const expanded = document.fullscreenElement === viewerPanel || fallbackFullscreen;
  viewerPanel.classList.toggle('is-fullscreen', expanded);
  document.body.classList.toggle('viewer-expanded', expanded);
  fullscreenButton.classList.toggle('is-fullscreen', expanded);
  fullscreenButton.setAttribute('aria-label', expanded ? 'Exit fullscreen' : 'Enter fullscreen');
  fullscreenButton.title = expanded ? 'Exit fullscreen' : 'Enter fullscreen';
  fullscreenButton.querySelector('path').setAttribute('d', expanded
    ? 'M9 4v5H4M20 9h-5V4M15 20v-5h5M4 15h5v5'
    : 'M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5');
  fullscreenButton.setAttribute('aria-pressed', String(expanded));
  fullscreenButton.focus({ preventScroll: true });
}
fullscreenButton.addEventListener('click', async () => {
  if (document.fullscreenElement === viewerPanel) {
    await document.exitFullscreen();
  } else if (fallbackFullscreen) {
    fallbackFullscreen = false;
    updateFullscreen();
  } else {
    try {
      await viewerPanel.requestFullscreen();
    } catch {
      // Keep an expanded viewer available on browsers without element fullscreen.
      fallbackFullscreen = true;
      updateFullscreen();
    }
  }
});
document.addEventListener('fullscreenchange', updateFullscreen);
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && fallbackFullscreen) {
    fallbackFullscreen = false;
    updateFullscreen();
  }
});

// ---------- Scene ----------
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(40, 1, 0.05, 200);
camera.position.set(0, 1.2, 20);
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
viewer.prepend(renderer.domElement);
scene.add(new THREE.HemisphereLight(0xe7f4ff, 0x32415a, 2.2));
const light = new THREE.DirectionalLight(0xffffff, 2.5);
light.position.set(4, 8, 7);
scene.add(light);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enablePan = false;
controls.minDistance = 2;
controls.maxDistance = 80;
controls.enableDamping = true;
controls.saveState();
const stage = new THREE.Group();
scene.add(stage);

let palette = readPalette();
let buildTextures = [];
let pickables = [];
let lab = null;
let cameraTween = null;
let fadeIn = null;
let selected = null;

function readPalette() {
  const styles = getComputedStyle(document.documentElement);
  const css = name => styles.getPropertyValue(name).trim();
  const names = ['positive', 'negative', 'alpha', 'field', 'e-field', 'force', 'velocity', 'copper', 'steel', 'carbon', 'north', 'south', 'current', 'text-secondary'];
  const result = { dark: document.documentElement.getAttribute('data-theme') === 'dark', css: {} };
  for (const name of names) {
    const key = name.replace(/-(\w)/g, (_, c) => c.toUpperCase());
    result[key] = new THREE.Color(css(`--${name}`));
    result.css[key] = css(`--${name}`);
  }
  for (const name of ['text-main', 'card-border', 'brand-primary', 'correct-border', 'font-mono']) result.css[name] = css(`--${name}`);
  result.accent = new THREE.Color(css('--brand-accent'));
  return result;
}

// ---------- Textures and helpers ----------
function canvasTexture(width, height, draw, track = true) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  draw(canvas.getContext('2d'), width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  if (track) buildTextures.push(texture);
  return texture;
}
const glowTexture = canvasTexture(128, 128, (ctx, w) => {
  const gradient = ctx.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.35, 'rgba(255,255,255,0.45)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, w, w);
}, false);
const shadowTexture = canvasTexture(128, 128, (ctx, w) => {
  const gradient = ctx.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
  gradient.addColorStop(0, 'rgba(0,0,0,0.5)');
  gradient.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, w, w);
}, false);
// A flat label stuck to a surface, so it never clips into it.
function faceLabel(text, color, size = 0.6) {
  const texture = canvasTexture(256, 128, (ctx, w, h) => {
    ctx.fillStyle = color;
    ctx.font = '700 92px Manrope, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, w / 2, h / 2 + 6);
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(size * 2, size), new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false }));
  mesh.raycast = () => {};
  return mesh;
}
// A row of charge signs along a plate.
function signTexture(symbol, background) {
  const texture = canvasTexture(512, 64, (ctx, w, h) => {
    ctx.fillStyle = `#${background.getHexString()}`;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.font = '700 46px Manrope, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let x = 32; x < w; x += 64) ctx.fillText(symbol, x, h / 2 + 2);
  });
  return texture;
}
const UP = new THREE.Vector3(0, 1, 0);
function material(color, options = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.45, metalness: 0.2, ...options });
}
function part(mesh, key) {
  mesh.userData.part = key;
  pickables.push(mesh);
  return mesh;
}
function makeArrow(color, radius = 0.04, opacity = 1) {
  const group = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.3, roughness: 0.5, transparent: opacity < 1, opacity, depthWrite: opacity >= 1 });
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, 1, 12), mat);
  const head = new THREE.Mesh(new THREE.ConeGeometry(radius * 2.7, 1, 18), mat);
  group.add(shaft, head);
  group.userData = { shaft, head, radius };
  return group;
}
function setArrow(arrow, origin, direction, length) {
  if (!(length > 0.02) || !(direction.lengthSq() > 0)) {
    arrow.visible = false;
    return;
  }
  arrow.visible = true;
  const { shaft, head, radius } = arrow.userData;
  const headLength = Math.min(length * 0.45, radius * 7);
  arrow.position.copy(origin);
  arrow.quaternion.setFromUnitVectors(UP, direction.clone().normalize());
  shaft.scale.y = length - headLength;
  shaft.position.y = (length - headLength) / 2;
  head.scale.y = headLength;
  head.position.y = length - headLength / 2;
}
function glow(color, size, opacity = palette.dark ? 0.7 : 0.4) {
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture, color, transparent: true, opacity, depthWrite: false, blending: palette.dark ? THREE.AdditiveBlending : THREE.NormalBlending }));
  sprite.scale.set(size, size, 1);
  sprite.raycast = () => {};
  return sprite;
}
function ease(k) {
  return k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2;
}
function disposeObject(object) {
  object.traverse(child => {
    child.geometry?.dispose();
    if (child.material) (Array.isArray(child.material) ? child.material : [child.material]).forEach(mat => mat.dispose());
  });
}
const floorShadow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: shadowTexture, transparent: true, depthWrite: false }));
floorShadow.rotation.x = -Math.PI / 2;
floorShadow.raycast = () => {};
scene.add(floorShadow);

function particleData(mode = state.mode) {
  return PARTICLES[state.particle[mode]];
}
function particleColour(key) {
  return palette[PARTICLES[key].colour];
}
function stepperSpec(key) {
  const spec = STEPPERS[key];
  return spec.from ? { ...spec, ...particleData()[spec.from], label: spec.from === 'speed' ? particleData().speed.label : spec.label } : spec;
}

// ---------- Particle motion ----------
const E = new THREE.Vector3();
const B = new THREE.Vector3();
const vMinus = new THREE.Vector3();
const vPrime = new THREE.Vector3();
const tVec = new THREE.Vector3();
const sVec = new THREE.Vector3();
// Fields in SI units at a point (metres) and time (seconds).
function fields(position, time) {
  E.set(0, 0, 0);
  B.set(0, 0, 0);
  const { x, y, z } = position;
  const v = state.values;
  if (state.mode === 'efield') {
    const d = v.separation / 100;
    if (Math.abs(x) <= PLATE_LENGTH / 2 && Math.abs(y) < d / 2) E.set(0, -(v.voltage / d) * (state.swap ? -1 : 1), 0);
  } else if (state.mode === 'bfield') {
    if (Math.abs(x) < B_REGION.x / 100 && Math.abs(y) < B_REGION.y / 100 && z > B_REGION.zMin / 100 && z < B_REGION.zMax / 100) B.set(0, 0, -(v.field / 1000) * (state.reverseB ? -1 : 1));
  } else if (state.mode === 'selector') {
    if (Math.abs(x) <= PLATE_LENGTH / 2 && Math.abs(y) < SELECTOR_GAP / 2) {
      E.set(0, -v.selectorVoltage / SELECTOR_GAP, 0);
      B.set(0, 0, -v.selectorField / 1000);
    }
  } else if (state.mode === 'cyclotron') {
    const r = Math.hypot(x, z);
    if (r < DEE_RADIUS) {
      B.set(0, v.cycField, 0);
      if (Math.abs(x) < DEE_GAP / 2) E.set(gapVoltage(time) / DEE_GAP, 0, 0);
    }
  }
}
// The dee on the left is positive when this is positive, so the field in the gap points to the right.
function gapVoltage(time) {
  return state.values.gap * 1000 * Math.cos(2 * Math.PI * state.values.frequency * 1e6 * time);
}
// Boris push: a stable, energy-conserving step for the Lorentz force F = q(E + v × B).
function push(p, dt) {
  const qm = p.q / p.m;
  fields(p.pos, p.t);
  vMinus.copy(p.vel).addScaledVector(E, qm * dt / 2);
  tVec.copy(B).multiplyScalar(qm * dt / 2);
  sVec.copy(tVec).multiplyScalar(2 / (1 + tVec.lengthSq()));
  vPrime.copy(vMinus).add(new THREE.Vector3().crossVectors(vMinus, tVec));
  vMinus.add(new THREE.Vector3().crossVectors(vPrime, sVec));
  p.vel.copy(vMinus).addScaledVector(E, qm * dt / 2);
  p.pos.addScaledVector(p.vel, dt);
  p.t += dt;
}
function cyclotronFrequency(key = state.particle.cyclotron) {
  const data = PARTICLES[key];
  return Math.abs(data.q) * state.values.cycField / (2 * Math.PI * data.m);
}

// A particle with its glowing marker, a trail line and time-lapse dots.
function makeTracer({ key, pos, vel, colour, realPerDisplay, maxStep, trailSize = 6000, dots = true, dotInterval = 0.12 }) {
  const data = PARTICLES[key];
  const scale = SCALE[state.mode];
  const size = state.mode === 'cyclotron' ? 0.16 : 0.16;
  const mesh = part(new THREE.Mesh(new THREE.SphereGeometry(size, 24, 16), material(colour, { emissive: colour, emissiveIntensity: 0.35, roughness: 0.3 })), 'particle');
  mesh.add(glow(colour, size * 5));
  const positions = new Float32Array(trailSize * 3);
  const geometry = new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setDrawRange(0, 0);
  const line = new THREE.Line(geometry, new THREE.LineBasicMaterial({ color: colour, transparent: true, opacity: 0.85 }));
  line.frustumCulled = false;
  line.userData.part = 'track';
  let dotMesh = null;
  if (dots) {
    dotMesh = new THREE.InstancedMesh(new THREE.SphereGeometry(0.05, 10, 8), new THREE.MeshBasicMaterial({ color: colour }), 400);
    dotMesh.count = 0;
    dotMesh.frustumCulled = false;
    dotMesh.raycast = () => {};
  }
  const group = new THREE.Group();
  group.add(line, mesh);
  if (dotMesh) group.add(dotMesh);
  lab.tracks.add(group);
  const tracer = {
    key, data, q: data.q, m: data.m, pos: pos.clone(), vel: vel.clone(), t: 0, displayTime: 0, alive: true,
    realPerDisplay, maxStep, scale, mesh, line, positions, count: 0, trailSize, dotMesh, dotClock: 0, dotInterval,
    group, last: new THREE.Vector3(Infinity, 0, 0), history: [], speed0: vel.length(), outcome: null
  };
  record(tracer, true);
  lab.tracers.push(tracer);
  return tracer;
}
const scenePoint = new THREE.Vector3();
function record(tracer, force = false) {
  scenePoint.copy(tracer.pos).multiplyScalar(tracer.scale);
  tracer.mesh.position.copy(scenePoint);
  if (tracer.count < tracer.trailSize && (force || scenePoint.distanceToSquared(tracer.last) > 0.0009)) {
    tracer.positions.set([scenePoint.x, scenePoint.y, scenePoint.z], tracer.count * 3);
    tracer.count += 1;
    tracer.line.geometry.setDrawRange(0, tracer.count);
    tracer.line.geometry.attributes.position.needsUpdate = true;
    tracer.last.copy(scenePoint);
  }
}
const dotMatrix = new THREE.Matrix4();
function advance(tracer, displayDelta) {
  if (!tracer.alive) return;
  let remaining = displayDelta * tracer.realPerDisplay;
  const steps = Math.min(6000, Math.ceil(remaining / tracer.maxStep));
  const dt = remaining / steps;
  for (let i = 0; i < steps && tracer.alive; i++) {
    push(tracer, dt);
    tracer.displayTime += displayDelta / steps;
    checkBounds(tracer);
    if (state.mode === 'cyclotron') cyclotronStep(tracer);
    if (i % 4 === 0 || !tracer.alive) record(tracer);
    if (tracer.dotMesh) {
      tracer.dotClock += displayDelta / steps;
      if (tracer.dotClock >= tracer.dotInterval && tracer.dotMesh.count < 400) {
        tracer.dotClock -= tracer.dotInterval;
        dotMatrix.makeTranslation(tracer.pos.x * tracer.scale, tracer.pos.y * tracer.scale, tracer.pos.z * tracer.scale);
        tracer.dotMesh.setMatrixAt(tracer.dotMesh.count, dotMatrix);
        tracer.dotMesh.count += 1;
        tracer.dotMesh.instanceMatrix.needsUpdate = true;
      }
    }
  }
  record(tracer);
  tracer.history.push([tracer.displayTime, tracer.vel.x, tracer.vel.y, tracer.vel.z, tracer.vel.length()]);
  if (tracer.history.length > 1500) tracer.history.shift();
}
function finish(tracer, outcome) {
  tracer.alive = false;
  tracer.outcome = outcome;
  tracer.mesh.visible = outcome === 'orbiting';
  onFinish(tracer, outcome);
}
function checkBounds(tracer) {
  const { x, y, z } = tracer.pos;
  if (state.mode === 'efield') {
    const d = state.values.separation / 100;
    if (Math.abs(x) <= PLATE_LENGTH / 2 && Math.abs(y) >= d / 2 - 0.0012) {
      finish(tracer, y > 0 ? 'top' : 'bottom');
    } else if (x >= SCREEN_X) {
      finish(tracer, 'screen');
    } else if (Math.abs(y) > 0.08 || x < -0.12) {
      finish(tracer, 'lost');
    }
  } else if (state.mode === 'bfield') {
    if (Math.abs(x) > B_REGION.x / 100 || Math.abs(y) > B_REGION.y / 100 || z < B_REGION.zMin / 100 || z > B_REGION.zMax / 100) finish(tracer, 'left');
    else if (tracer.displayTime > 45) finish(tracer, 'orbiting');
  } else if (state.mode === 'selector') {
    if (Math.abs(x) <= PLATE_LENGTH / 2 && Math.abs(y) >= SELECTOR_GAP / 2 - 0.0008) finish(tracer, 'plate');
    else if (x >= SLIT_X && tracer.slit !== true) {
      if (Math.abs(y) > SLIT_HALF) finish(tracer, 'blocked');
      else tracer.slit = true;
    }
    if (tracer.alive && x >= 0.095) finish(tracer, 'passed');
    if (tracer.alive && (Math.abs(y) > 0.05 || x < -0.12)) finish(tracer, 'lost');
  } else if (state.mode === 'cyclotron') {
    if (Math.hypot(x, z) > 0.72) finish(tracer, 'out');
    else if (tracer.displayTime > 60) finish(tracer, 'stalled');
  }
}

// ---------- Lab builders ----------
function clearStage() {
  for (const child of [...stage.children]) {
    disposeObject(child);
    stage.remove(child);
  }
  buildTextures.forEach(texture => texture.dispose());
  buildTextures = [];
  pickables = [];
  selected = null;
  lab = null;
}
function newLab(kind) {
  const group = new THREE.Group();
  const tracks = new THREE.Group();
  group.add(tracks);
  stage.add(group);
  const velocity = makeArrow(palette.velocity, 0.045);
  const force = makeArrow(palette.force, 0.045);
  const electric = makeArrow(palette.eField, 0.045);
  const magnetic = makeArrow(palette.field, 0.045);
  for (const arrow of [velocity, force, electric, magnetic]) {
    arrow.visible = false;
    group.add(arrow);
  }
  lab = { kind, group, tracks, tracers: [], arrows: { velocity, force, electric, magnetic }, spots: [], time: 0, spawnClock: 0, emitted: new Array(HISTOGRAM_BINS).fill(0), passed: new Array(HISTOGRAM_BINS).fill(0) };
  return group;
}
function plates(group, halfGap, length, { swap = false } = {}) {
  const make = (sign, y) => {
    const isPlus = sign > 0;
    const colour = isPlus ? palette.positive : palette.negative;
    const texture = signTexture(isPlus ? '+' : '−', colour);
    const mesh = part(new THREE.Mesh(new THREE.BoxGeometry(length, 0.16, 3.2), [
      material(colour), material(colour), material(0xffffff, { map: texture }), material(0xffffff, { map: texture }), material(0xffffff, { map: texture }), material(colour)
    ]), isPlus ? 'plus' : 'minus');
    mesh.position.y = y;
    group.add(mesh);
    return mesh;
  };
  const top = make(swap ? -1 : 1, halfGap + 0.08);
  const bottom = make(swap ? 1 : -1, -halfGap - 0.08);
  return { top, bottom };
}
function eFieldArrows(group, halfGap, length, down = true, opacity = 0.55) {
  const arrows = new THREE.Group();
  for (let x = -length / 2 + 0.6; x <= length / 2 - 0.5; x += 1.2) {
    for (const z of [-1, 0, 1]) {
      const arrow = makeArrow(palette.eField, 0.018, opacity);
      setArrow(arrow, new THREE.Vector3(x, down ? halfGap : -halfGap, z), new THREE.Vector3(0, down ? -1 : 1, 0), halfGap * 2);
      arrow.traverse(child => { child.userData.part = 'efield'; });
      pickables.push(...arrow.children);
      arrows.add(arrow);
    }
  }
  group.add(arrows);
  return arrows;
}
// Magnetic field into the screen: short arrows pointing away from the viewer.
function bFieldArrows(group, xs, ys, z0, length, sign = 1, opacity = 0.5) {
  const arrows = new THREE.Group();
  for (const x of xs) {
    for (const y of ys) {
      const arrow = makeArrow(palette.field, 0.02, opacity);
      setArrow(arrow, new THREE.Vector3(x, y, sign > 0 ? z0 : z0 - length), new THREE.Vector3(0, 0, -sign), length);
      arrow.traverse(child => { child.userData.part = 'bfield'; });
      pickables.push(...arrow.children);
      arrows.add(arrow);
    }
  }
  group.add(arrows);
  return arrows;
}
function source(group, position) {
  const gun = part(new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.38, 1.2, 24), material(palette.carbon, { metalness: 0.4 })), 'gun');
  gun.rotation.z = -Math.PI / 2;
  gun.position.copy(position).add(new THREE.Vector3(-0.6, 0, 0));
  const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.3, 16), material(palette.steel, { metalness: 0.7 }));
  nozzle.rotation.z = -Math.PI / 2;
  nozzle.position.copy(position).add(new THREE.Vector3(0.05, 0, 0));
  group.add(gun, nozzle);
}

function buildEField() {
  const group = newLab('efield');
  const halfGap = state.values.separation / 2;
  const length = PLATE_LENGTH * 100;
  lab.plates = plates(group, halfGap, length, { swap: state.swap });
  lab.fieldArrows = eFieldArrows(group, halfGap, length, !state.swap);
  source(group, new THREE.Vector3(-8, 0, 0));
  const screen = part(new THREE.Mesh(new THREE.BoxGeometry(0.12, 12, 4), material(palette.alpha, { transparent: true, opacity: palette.dark ? 0.25 : 0.2, roughness: 0.9, depthWrite: false })), 'screen');
  screen.position.x = SCREEN_X * 100 + 0.06;
  group.add(screen);
  const marks = new THREE.Group();
  for (let y = -5; y <= 5; y += 1) {
    const tick = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.02, y === 0 ? 1.2 : 0.5), new THREE.MeshBasicMaterial({ color: palette.textSecondary }));
    tick.position.set(SCREEN_X * 100 - 0.01, y, 0);
    marks.add(tick);
  }
  group.add(marks);
}
function buildBField() {
  const group = newLab('bfield');
  const { x, y, zMin, zMax } = B_REGION;
  const box = new THREE.Mesh(new THREE.BoxGeometry(2 * x, 2 * y, zMax - zMin), new THREE.MeshBasicMaterial({ color: palette.field, transparent: true, opacity: palette.dark ? 0.05 : 0.04, depthWrite: false, side: THREE.BackSide }));
  box.position.z = (zMax + zMin) / 2;
  box.raycast = () => {};
  const edges = new THREE.LineSegments(new THREE.EdgesGeometry(box.geometry), new THREE.LineBasicMaterial({ color: palette.field, transparent: true, opacity: 0.4 }));
  edges.position.copy(box.position);
  group.add(box, edges);
  const ticks = [-7.5, -4.5, -1.5, 1.5, 4.5, 7.5];
  lab.fieldArrows = bFieldArrows(group, ticks, ticks, zMax - 0.2, 1.4, state.reverseB ? -1 : 1);
  const gun = part(new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 0.7, 20), material(palette.carbon, { metalness: 0.4 })), 'gun');
  gun.rotation.z = -Math.PI / 2;
  gun.position.set(-0.45, 0, 0);
  group.add(gun);
}
function buildSelector() {
  const group = newLab('selector');
  const halfGap = SELECTOR_GAP * 100 / 2;
  const length = PLATE_LENGTH * 100;
  plates(group, halfGap, length);
  eFieldArrows(group, halfGap, length, true, 0.4);
  // Shaded region where the magnetic field acts (into the screen).
  const region = new THREE.Mesh(new THREE.BoxGeometry(length, halfGap * 2, 3.2), new THREE.MeshBasicMaterial({ color: palette.field, transparent: true, opacity: palette.dark ? 0.08 : 0.06, depthWrite: false }));
  region.raycast = () => {};
  group.add(region);
  const xs = [];
  for (let x = -length / 2 + 0.9; x < length / 2; x += 1.8) xs.push(x);
  bFieldArrows(group, xs, [-0.5, 0.5], 1.9, 0.9, 1, 0.65);
  source(group, new THREE.Vector3(-8, 0, 0));
  const wall = new THREE.Group();
  const wallMaterial = material(palette.carbon, { roughness: 0.7 });
  const top = part(new THREE.Mesh(new THREE.BoxGeometry(0.12, 3, 3), wallMaterial), 'slit');
  top.position.set(SLIT_X * 100, SLIT_HALF * 100 + 1.5, 0);
  const bottom = part(new THREE.Mesh(new THREE.BoxGeometry(0.12, 3, 3), wallMaterial), 'slit');
  bottom.position.set(SLIT_X * 100, -SLIT_HALF * 100 - 1.5, 0);
  wall.add(top, bottom);
  group.add(wall);
  const detector = part(new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.5, 24), material(palette.alpha, { emissive: palette.alpha, emissiveIntensity: 0.15 })), 'detector');
  detector.rotation.z = Math.PI / 2;
  detector.position.x = 9.85;
  group.add(detector);
  lab.detector = detector;
}
function buildCyclotron() {
  const group = newLab('cyclotron');
  const R = DEE_RADIUS * 10;
  const halfGap = DEE_GAP * 10 / 2;
  const shape = new THREE.Shape();
  shape.moveTo(0, -R);
  shape.absarc(0, 0, R, -Math.PI / 2, Math.PI / 2, false);
  shape.lineTo(0, -R);
  const deeGeometry = new THREE.ExtrudeGeometry(shape, { depth: 0.7, bevelEnabled: false, curveSegments: 48 });
  deeGeometry.rotateX(-Math.PI / 2);
  deeGeometry.translate(halfGap, -0.35, 0);
  lab.dees = [1, -1].map(side => {
    const mat = material(palette.copper, { transparent: true, opacity: 0.22, metalness: 0.5, roughness: 0.4, depthWrite: false, side: THREE.DoubleSide, emissive: 0x000000 });
    const dee = part(new THREE.Mesh(deeGeometry.clone(), mat), 'dee');
    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(dee.geometry, 20), new THREE.LineBasicMaterial({ color: palette.copper }));
    dee.add(edges);
    if (side < 0) dee.rotation.y = Math.PI;
    group.add(dee);
    return dee;
  });
  deeGeometry.dispose();
  const gap = part(new THREE.Mesh(new THREE.BoxGeometry(halfGap * 2, 0.7, R * 2), new THREE.MeshBasicMaterial({ color: palette.eField, transparent: true, opacity: 0.12, depthWrite: false })), 'gapRegion');
  group.add(gap);
  // Magnet poles above and below: the field points up, from the N pole to the S pole.
  for (const [y, kind] of [[1.25, 'south'], [-1.25, 'north']]) {
    const pole = part(new THREE.Mesh(new THREE.CylinderGeometry(R + 0.6, R + 0.6, 0.5, 64), material(palette[kind], { transparent: true, opacity: y > 0 ? 0.07 : 0.35, depthWrite: false })), 'pole');
    pole.position.y = y;
    group.add(pole);
  }
  const label = faceLabel('N', '#ffffff', 0.6);
  label.rotation.x = -Math.PI / 2;
  label.position.set(-(R - 0.4), -0.99, R * 0.55);
  group.add(label);
  const arrows = new THREE.Group();
  for (const [x, z] of [[-3.6, -2.2], [3.6, -2.2], [-3.6, 2.2], [3.6, 2.2], [0, -4.3], [-2, 3.9], [2, 3.9]]) {
    const arrow = makeArrow(palette.field, 0.025, 0.7);
    setArrow(arrow, new THREE.Vector3(x, -0.95, z), UP, 1.9);
    arrow.traverse(child => { child.userData.part = 'pole'; });
    arrows.add(arrow);
  }
  group.add(arrows);
  const oscillator = part(new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.7, 0.8), material(palette.carbon)), 'oscillator');
  oscillator.position.set(0, -0.6, R + 1.8);
  group.add(oscillator);
  const wave = faceLabel('~', '#ffffff', 0.55);
  wave.position.set(0, -0.6, R + 2.21);
  group.add(wave);
  const wireMat = material(palette.carbon, { roughness: 0.6 });
  for (const side of [1, -1]) {
    const path = new THREE.CurvePath();
    const points = [new THREE.Vector3(side * 0.7, -0.6, R + 1.8), new THREE.Vector3(side * 2.2, -0.6, R + 1.8), new THREE.Vector3(side * 2.2, 0, R - 0.4)];
    for (let i = 0; i < points.length - 1; i++) path.add(new THREE.LineCurve3(points[i], points[i + 1]));
    group.add(new THREE.Mesh(new THREE.TubeGeometry(path, 20, 0.05, 8, false), wireMat));
  }
  lab.energy = [];
  lab.crossings = 0;
}

// ---------- Firing ----------
function fireTracer(mode = state.mode) {
  const key = state.particle[mode];
  const data = PARTICLES[key];
  const colour = particleColour(key);
  if (mode === 'efield') {
    const speed = state.values.speed * data.speed.unit;
    if (lab.tracers.length >= 8) removeTracer(lab.tracers[0]);
    return makeTracer({ key, pos: new THREE.Vector3(-0.08, 0, 0), vel: new THREE.Vector3(speed, 0, 0), colour, realPerDisplay: DISPLAY_DISTANCE.efield / speed, maxStep: 0.0004 / speed, dotInterval: 0.12 });
  }
  if (mode === 'bfield') {
    const speed = state.values.speed * data.speed.unit;
    const angle = THREE.MathUtils.degToRad(state.values.angle);
    const vel = new THREE.Vector3(speed * Math.sin(angle), 0, -speed * Math.cos(angle));
    const period = 2 * Math.PI * data.m / (Math.abs(data.q) * state.values.field / 1000);
    while (lab.tracers.length >= 4) removeTracer(lab.tracers[0]);
    return makeTracer({ key, pos: new THREE.Vector3(0, 0, 0), vel, colour, realPerDisplay: DISPLAY_DISTANCE.bfield / speed, maxStep: Math.min(0.0004 / speed, period / 300), trailSize: 9000, dotInterval: 0.15 });
  }
  if (mode === 'selector') {
    const reference = selectorReference(key);
    const fraction = Math.random();
    const speed = reference * (SPEED_SPREAD[0] + (SPEED_SPREAD[1] - SPEED_SPREAD[0]) * fraction);
    const bin = Math.min(HISTOGRAM_BINS - 1, Math.floor(fraction * HISTOGRAM_BINS));
    lab.emitted[bin] += 1;
    const tint = palette.south.clone().lerp(palette.current, fraction);
    if (lab.tracers.length >= 28) removeTracer(lab.tracers[0]);
    const tracer = makeTracer({ key, pos: new THREE.Vector3(-0.08, 0, 0), vel: new THREE.Vector3(speed, 0, 0), colour: tint, realPerDisplay: DISPLAY_DISTANCE.selector / reference, maxStep: 0.0003 / speed, trailSize: 900, dots: false });
    tracer.bin = bin;
    tracer.mesh.scale.setScalar(0.7);
    return tracer;
  }
  if (mode === 'cyclotron') {
    while (lab.tracers.length) removeTracer(lab.tracers[0]);
    lab.energy = [];
    lab.crossings = 0;
    const fc = cyclotronFrequency(key);
    const tracer = makeTracer({ key, pos: new THREE.Vector3(0, 0, 0), vel: new THREE.Vector3(0, 0, 0), colour, realPerDisplay: CYCLOTRON_TURN_TIME === 0 ? 1 : 1 / fc / CYCLOTRON_TURN_TIME, maxStep: 1 / fc / 700, trailSize: 40000, dots: false });
    tracer.lastSide = 0;
    return tracer;
  }
  return null;
}
// The speed that crossed fields would select for the default settings: the middle of the beam's spread.
function selectorReference(key) {
  const data = PARTICLES[key];
  return data.selectorVoltage.value / SELECTOR_GAP / (data.selectorField.value / 1000);
}
function removeTracer(tracer) {
  disposeObject(tracer.group);
  tracer.group.removeFromParent();
  lab.tracers.splice(lab.tracers.indexOf(tracer), 1);
  pickables = pickables.filter(mesh => mesh !== tracer.mesh);
}
function cyclotronStep(tracer) {
  const side = Math.sign(tracer.pos.x);
  if (side !== 0 && tracer.lastSide !== 0 && side !== tracer.lastSide) lab.crossings += 1;
  if (side !== 0) tracer.lastSide = side;
}
const article = data => /^[aeiou]/i.test(data.name) ? 'an' : 'a';
function onFinish(tracer, outcome) {
  const name = tracer.data.name.toLowerCase();
  if (state.mode === 'efield') {
    if (outcome === 'screen') {
      const y = tracer.pos.y * 100;
      addSpot(tracer);
      readout.textContent = `${tracer.data.name.toUpperCase()} · Landed ${Math.abs(y).toFixed(2)} cm ${y >= 0 ? 'above' : 'below'} the centre of the screen. ${tracer.q < 0 ? 'Negative charges are pulled towards the positive plate.' : 'Positive charges are pushed towards the negative plate.'}`;
    } else if (outcome === 'top' || outcome === 'bottom') {
      const plusOnTop = !state.swap;
      const hitPlus = (outcome === 'top') === plusOnTop;
      readout.textContent = `${tracer.data.name.toUpperCase()} · Hit the ${hitPlus ? 'positive' : 'negative'} plate: the deflection was too big. Try a lower voltage, wider plates or a faster particle.`;
    }
  } else if (state.mode === 'bfield' && outcome === 'left') {
    readout.textContent = `${tracer.data.name.toUpperCase()} · Left the field region. ${state.values.angle < 90 ? 'Its velocity along the field carried it away in a helix.' : 'Its circle was too big to fit inside the field.'}`;
  } else if (state.mode === 'selector') {
    if (outcome === 'passed') {
      lab.passed[tracer.bin] += 1;
      lab.flash = 1;
    }
  } else if (state.mode === 'cyclotron') {
    const energy = 0.5 * tracer.m * tracer.vel.lengthSq() / 1.602177e-13;
    readout.textContent = outcome === 'out'
      ? `${tracer.data.name.toUpperCase()} OUT · It left the edge of the dees with ${energy.toFixed(2)} MeV after ${Math.floor(lab.crossings / 2)} turns. Inject another, or change the field or gap voltage.`
      : `OUT OF STEP · After a minute the ${name} is still inside with only ${energy.toFixed(2)} MeV. Tune the oscillator to the cyclotron frequency.`;
    updateFireButton();
  }
}
function addSpot(tracer) {
  const spot = new THREE.Mesh(new THREE.CircleGeometry(0.16, 20), new THREE.MeshBasicMaterial({ color: particleColour(tracer.key) }));
  spot.rotation.y = -Math.PI / 2;
  spot.position.set(SCREEN_X * 100 - 0.02, tracer.pos.y * 100, tracer.pos.z * 100);
  spot.add(glow(particleColour(tracer.key), 1.2));
  spot.raycast = () => {};
  tracer.group.add(spot);
}

// ---------- Arrows on the newest particle ----------
const arrowOrigin = new THREE.Vector3();
const forceVector = new THREE.Vector3();
function updateArrows() {
  const { velocity, force, electric, magnetic } = lab.arrows;
  for (const arrow of [velocity, force, electric, magnetic]) arrow.visible = false;
  const tracer = [...lab.tracers].reverse().find(t => t.alive);
  if (!tracer) return;
  arrowOrigin.copy(tracer.pos).multiplyScalar(tracer.scale);
  fields(tracer.pos, tracer.t);
  const size = state.mode === 'cyclotron' ? 1.1 : 1.3;
  if (tracer.vel.lengthSq() > 1) setArrow(velocity, arrowOrigin, tracer.vel, size);
  if (state.mode === 'selector') {
    // Electric force qE and magnetic force qv × B, drawn to the same scale.
    const fe = E.clone().multiplyScalar(tracer.q);
    const fb = new THREE.Vector3().crossVectors(tracer.vel, B).multiplyScalar(tracer.q);
    const scale = Math.max(fe.length(), fb.length()) || 1;
    setArrow(electric, arrowOrigin, fe, 1.3 * fe.length() / scale);
    setArrow(magnetic, arrowOrigin, fb, 1.3 * fb.length() / scale);
    return;
  }
  forceVector.crossVectors(tracer.vel, B).add(E).multiplyScalar(tracer.q);
  if (forceVector.lengthSq() > 0) setArrow(force, arrowOrigin, forceVector, size * 0.85);
}

// ---------- Readouts ----------
const sci = (value, digits = 2) => {
  if (!Number.isFinite(value)) return '—';
  if (value === 0) return '0';
  const exponent = Math.floor(Math.log10(Math.abs(value)));
  if (exponent >= -2 && exponent < 4) return value.toFixed(Math.max(0, digits - 1 - exponent)).replace('-', '−');
  const mantissa = value / 10 ** exponent;
  const superscript = String(exponent).replace('-', '⁻').replace(/\d/g, d => '⁰¹²³⁴⁵⁶⁷⁸⁹'[d]);
  return `${mantissa.toFixed(digits - 1).replace('-', '−')} × 10${superscript}`;
};
function row(label, value) {
  return `<div class="row"><span>${label}</span><span>${value}</span></div>`;
}
function updateEquation() {
  const box = $('equation');
  if (!lab) return;
  const data = particleData();
  const q = Math.abs(data.q);
  const v = state.values;
  let html = '';
  if (state.mode === 'efield') {
    const d = v.separation / 100;
    const field = v.voltage / d;
    const accel = q * field / data.m;
    const speed = v.speed * data.speed.unit;
    const time = PLATE_LENGTH / speed;
    const deflection = 0.5 * accel * time * time;
    html = `<div class="formula">E = V/d · F = qE · a = F/m</div>`
      + row('Field E', `${sci(field)} V/m`)
      + row('Force F', `${sci(q * field)} N`)
      + row('Acceleration a', `${sci(accel)} m/s²`)
      + row('Time between plates', `${sci(time)} s`)
      + row('Deflection ½at²', deflection < d / 2 ? `<b>${(deflection * 100).toFixed(2)} cm</b>` : `<b>hits the plate</b>`);
  } else if (state.mode === 'bfield') {
    const field = v.field / 1000;
    const speed = v.speed * data.speed.unit;
    const angle = THREE.MathUtils.degToRad(v.angle);
    const radius = data.m * speed * Math.sin(angle) / (q * field);
    const period = 2 * Math.PI * data.m / (q * field);
    html = `<div class="formula">r = mv/(qB) · T = 2πm/(qB)</div>`
      + row('Force qvB sin θ', `${sci(q * speed * field * Math.sin(angle))} N`)
      + row('Radius r', `<b>${(radius * 100).toFixed(2)} cm</b>`)
      + row('Period T', `${sci(period)} s`)
      + row('Frequency f', `${sci(1 / period)} Hz`)
      + (v.angle < 90 ? row('Pitch v cos θ × T', `${(speed * Math.cos(angle) * period * 100).toFixed(1)} cm`) : '');
  } else if (state.mode === 'selector') {
    const field = v.selectorVoltage / SELECTOR_GAP;
    const flux = v.selectorField / 1000;
    const selected = field / flux;
    const passed = lab.passed.reduce((a, b) => a + b, 0);
    const emitted = lab.emitted.reduce((a, b) => a + b, 0);
    html = `<div class="formula">qE = qvB  ⇒  v = E/B</div>`
      + row('E = V/d', `${sci(field)} V/m`)
      + row('B', `${sci(flux)} T`)
      + row('Selected speed', `<b>${sci(selected)} m/s</b>`)
      + row('Through the slit', `${passed} of ${emitted}`);
    const reference = selectorReference(state.particle.selector);
    const ratio = selected / reference;
    if (ratio < SPEED_SPREAD[0] || ratio > SPEED_SPREAD[1]) html += `<div class="status warn">No particle in the beam has this speed.</div>`;
  } else if (state.mode === 'cyclotron') {
    const fc = cyclotronFrequency();
    const tracer = lab.tracers[0];
    const energy = tracer ? 0.5 * tracer.m * tracer.vel.lengthSq() / 1.602177e-13 : 0;
    const radius = tracer ? Math.hypot(tracer.pos.x, tracer.pos.z) : 0;
    const maxEnergy = (q * v.cycField * DEE_RADIUS) ** 2 / (2 * data.m) / 1.602177e-13;
    const tuned = Math.abs(v.frequency * 1e6 - fc) / fc < 0.002;
    html = `<div class="formula">f = qB/2πm · Eₖ = q²B²R²/2m</div>`
      + row('Cyclotron f', `${(fc / 1e6).toFixed(2)} MHz`)
      + row('Oscillator f', `${v.frequency.toFixed(2)} MHz`)
      + row('Kinetic energy', `<b>${energy.toFixed(2)} MeV</b>`)
      + row('Radius · turns', `${(radius * 100).toFixed(1)} cm · ${Math.floor(lab.crossings / 2)}`)
      + row('Maximum Eₖ (R = 50 cm)', `${maxEnergy.toFixed(2)} MeV`)
      + `<div class="status ${tuned ? 'good' : 'warn'}">${tuned ? '✓ Tuned: in step with the particle.' : 'Not tuned: the particle will drift out of step.'}</div>`;
  }
  box.innerHTML = html;
}

// ---------- Graphs ----------
function prepareCanvas(canvas) {
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  if (!w || !h) return null;
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  if (canvas.width !== Math.round(w * ratio) || canvas.height !== Math.round(h * ratio)) {
    canvas.width = Math.round(w * ratio);
    canvas.height = Math.round(h * ratio);
  }
  const ctx = canvas.getContext('2d');
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  ctx.clearRect(0, 0, w, h);
  return { ctx, w, h };
}
function drawGraph() {
  const prepared = prepareCanvas($('graph-canvas'));
  if (!prepared || !lab) return;
  const { ctx, w, h } = prepared;
  const c = palette.css;
  const box = { x0: 30, x1: w - 8, y0: 18, y1: h - 18 };
  const X = (value, min, max) => box.x0 + (value - min) / (max - min || 1) * (box.x1 - box.x0);
  const Y = (value, min, max) => box.y1 - (value - min) / (max - min || 1) * (box.y1 - box.y0);
  ctx.font = `600 10px ${c['font-mono']}`;
  ctx.lineWidth = 1;
  ctx.strokeStyle = c.textSecondary;
  ctx.beginPath();
  ctx.moveTo(box.x0, box.y0);
  ctx.lineTo(box.x0, box.y1);
  ctx.lineTo(box.x1, box.y1);
  ctx.stroke();
  const legend = items => {
    let x = box.x0 + 4;
    ctx.textAlign = 'left';
    for (const [label, colour] of items) {
      ctx.fillStyle = colour;
      ctx.fillText(label, x, 11);
      x += ctx.measureText(label).width + 12;
    }
  };
  const plot = (points, colour, dashed = false) => {
    ctx.strokeStyle = colour;
    ctx.lineWidth = 2;
    ctx.setLineDash(dashed ? [5, 4] : []);
    ctx.beginPath();
    points.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.stroke();
    ctx.setLineDash([]);
  };
  ctx.fillStyle = c.textSecondary;
  ctx.textAlign = 'right';
  if (state.mode === 'efield' || state.mode === 'bfield') {
    const tracer = [...lab.tracers].reverse()[0];
    const span = state.mode === 'efield' ? 5 : 8;
    ctx.fillText('time →', box.x1, box.y1 + 13);
    if (state.mode === 'efield') {
      legend([['v across', c.velocity], ['v towards a plate', c.force]]);
      ctx.fillText('0', box.x0 - 4, box.y1);
    } else {
      legend([['speed |v|', c.velocity], ['vₓ', c.force], ['kinetic energy', c.alpha]]);
      ctx.fillText('0', box.x0 - 4, (box.y0 + box.y1) / 2 + 3);
      ctx.strokeStyle = c['card-border'];
      ctx.beginPath();
      ctx.moveTo(box.x0, (box.y0 + box.y1) / 2);
      ctx.lineTo(box.x1, (box.y0 + box.y1) / 2);
      ctx.stroke();
    }
    if (!tracer || tracer.history.length < 2) return;
    const t1 = Math.max(span, tracer.displayTime);
    const t0 = t1 - span;
    const v0 = tracer.speed0;
    const points = tracer.history.filter(p => p[0] >= t0);
    if (state.mode === 'efield') {
      const top = Math.max(1.2, ...points.map(p => Math.abs(p[2]) / v0 * 1.1));
      plot(points.map(p => [X(p[0], t0, t1), Y(p[1] / v0, 0, top)]), c.velocity);
      plot(points.map(p => [X(p[0], t0, t1), Y(Math.abs(p[2]) / v0, 0, top)]), c.force);
    } else {
      plot(points.map(p => [X(p[0], t0, t1), Y(p[4] / v0, -1.2, 1.2)]), c.velocity);
      plot(points.map(p => [X(p[0], t0, t1), Y(p[1] / v0, -1.2, 1.2)]), c.force);
      plot(points.map(p => [X(p[0], t0, t1), Y((p[4] / v0) ** 2 * 0.9, -1.2, 1.2)]), c.alpha, true);
    }
    return;
  }
  if (state.mode === 'selector') {
    const reference = selectorReference(state.particle.selector);
    const [lo, hi] = SPEED_SPREAD;
    const top = Math.max(4, ...lab.emitted);
    legend([['emitted', c.textSecondary], ['through the slit', c.alpha], ['E/B', c.force]]);
    ctx.fillStyle = c.textSecondary;
    ctx.textAlign = 'left';
    ctx.fillText(`${sci(reference * lo)}`, box.x0, box.y1 + 13);
    ctx.textAlign = 'right';
    ctx.fillText(`${sci(reference * hi)} m/s`, box.x1, box.y1 + 13);
    const barWidth = (box.x1 - box.x0) / HISTOGRAM_BINS;
    for (let i = 0; i < HISTOGRAM_BINS; i++) {
      const x = box.x0 + i * barWidth + 1;
      const emittedHeight = box.y1 - Y(lab.emitted[i], 0, top);
      const passedHeight = box.y1 - Y(lab.passed[i], 0, top);
      ctx.strokeStyle = c.textSecondary;
      ctx.strokeRect(x, box.y1 - emittedHeight, barWidth - 2, emittedHeight);
      ctx.fillStyle = c.alpha;
      ctx.fillRect(x, box.y1 - passedHeight, barWidth - 2, passedHeight);
    }
    const selected = state.values.selectorVoltage / SELECTOR_GAP / (state.values.selectorField / 1000) / reference;
    if (selected >= lo && selected <= hi) {
      const x = X(selected, lo, hi);
      ctx.strokeStyle = c.force;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, box.y0);
      ctx.lineTo(x, box.y1);
      ctx.stroke();
    }
    return;
  }
  if (state.mode === 'cyclotron') {
    const data = particleData();
    const maxEnergy = (Math.abs(data.q) * state.values.cycField * DEE_RADIUS) ** 2 / (2 * data.m) / 1.602177e-13;
    const points = lab.energy;
    const t1 = Math.max(10, points.length ? points[points.length - 1][0] : 0);
    const top = maxEnergy * 1.15;
    legend([['kinetic energy / MeV', c.alpha], ['maximum', c.force]]);
    ctx.fillStyle = c.textSecondary;
    ctx.textAlign = 'right';
    ctx.fillText('time →', box.x1, box.y1 + 13);
    ctx.fillText(`${maxEnergy.toFixed(1)}`, box.x0 - 3, Y(maxEnergy, 0, top) + 3);
    ctx.fillText('0', box.x0 - 3, box.y1);
    plot([[box.x0, Y(maxEnergy, 0, top)], [box.x1, Y(maxEnergy, 0, top)]], c.force, true);
    if (points.length > 1) plot(points.map(([t, k]) => [X(t, 0, t1), Y(k, 0, top)]), c.alpha);
  }
}

// ---------- Camera ----------
function flyTo({ direction, distance, target = controls.target }) {
  const offset = camera.position.clone().sub(controls.target);
  const from = new THREE.Spherical().setFromVector3(offset);
  const dir = (direction || offset).clone().normalize();
  const to = new THREE.Spherical().setFromVector3(dir.multiplyScalar(THREE.MathUtils.clamp(distance, controls.minDistance, controls.maxDistance)));
  to.phi = THREE.MathUtils.clamp(to.phi, 0.1, Math.PI - 0.1);
  let turn = to.theta - from.theta;
  turn = ((turn + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
  to.theta = from.theta + turn;
  cameraTween = { from, to, fromTarget: controls.target.clone(), toTarget: target.clone(), t: 0, duration: reducedMotion ? 0 : 0.9 };
  stepCamera(0);
}
function stepCamera(delta) {
  if (!cameraTween) return;
  cameraTween.t += delta;
  const k = cameraTween.duration ? ease(Math.min(1, cameraTween.t / cameraTween.duration)) : 1;
  const { from, to, fromTarget, toTarget } = cameraTween;
  controls.target.lerpVectors(fromTarget, toTarget, k);
  const spherical = new THREE.Spherical(
    THREE.MathUtils.lerp(from.radius, to.radius, k),
    THREE.MathUtils.lerp(from.phi, to.phi, k),
    THREE.MathUtils.lerp(from.theta, to.theta, k)
  );
  camera.position.setFromSpherical(spherical).add(controls.target);
  camera.lookAt(controls.target);
  if (k >= 1) cameraTween = null;
}
function nudgeCamera(dTheta, dPhi, zoom = 1) {
  cameraTween = null;
  userMoved = true;
  const spherical = new THREE.Spherical().setFromVector3(camera.position.clone().sub(controls.target));
  spherical.theta += dTheta;
  spherical.phi = THREE.MathUtils.clamp(spherical.phi + dPhi, 0.1, Math.PI - 0.1);
  spherical.radius = THREE.MathUtils.clamp(spherical.radius * zoom, controls.minDistance, controls.maxDistance);
  camera.position.setFromSpherical(spherical).add(controls.target);
  controls.update();
}
// Until the user moves the camera, keep the home view fitted to the viewer as it resizes.
let userMoved = false;
controls.addEventListener('start', () => {
  cameraTween = null;
  userMoved = true;
});
function fitDistance({ w, h }) {
  const tan = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  return Math.max(h / tan, w / (tan * camera.aspect));
}
function homeView() {
  const home = HOME[state.mode];
  return { direction: new THREE.Vector3(...home.direction).normalize(), target: new THREE.Vector3(...home.target), distance: fitDistance(home.extent) };
}
function resetView(animate = false) {
  userMoved = false;
  const { direction, target, distance } = homeView();
  if (animate) {
    flyTo({ direction, distance, target });
    return;
  }
  cameraTween = null;
  controls.reset();
  controls.target.copy(target);
  camera.position.copy(direction.multiplyScalar(distance)).add(target);
  controls.update();
}

// ---------- Selection and picking ----------
const raycaster = new THREE.Raycaster();
raycaster.params.Line.threshold = 0.1;
const pointer = new THREE.Vector2();
function pick(clientX, clientY) {
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.set((clientX - rect.left) / rect.width * 2 - 1, -(clientY - rect.top) / rect.height * 2 + 1);
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects(pickables.filter(mesh => mesh.visible), false);
  return hits.find(hit => PARTS[hit.object.userData.part])?.object || null;
}
function select(mesh) {
  if (selected?.material?.emissive) {
    selected.material.emissive.copy(selected.userData.savedEmissive);
    selected.material.emissiveIntensity = selected.userData.savedIntensity;
  }
  selected = null;
  if (!mesh) return;
  const key = mesh.userData.part;
  readout.textContent = describe(key);
  const mat = Array.isArray(mesh.material) ? null : mesh.material;
  if (mat?.emissive && !['particle', 'efield', 'bfield', 'dee', 'pole'].includes(key)) {
    mesh.userData.savedEmissive = mat.emissive.clone();
    mesh.userData.savedIntensity = mat.emissiveIntensity;
    selected = mesh;
  }
}
function describe(key) {
  if (key === 'particle') {
    const data = particleData();
    return `${data.name.toUpperCase()} · Charge ${data.q > 0 ? '+' : '−'}${sci(Math.abs(data.q))} C · Mass ${sci(data.m)} kg. ${PARTS.particle.split('· ')[1]}`;
  }
  return PARTS[key];
}
let pointerStart = null;
renderer.domElement.addEventListener('pointerdown', event => { pointerStart = [event.clientX, event.clientY]; });
renderer.domElement.addEventListener('pointerup', event => {
  if (!pointerStart || Math.hypot(event.clientX - pointerStart[0], event.clientY - pointerStart[1]) > 6) return;
  pointerStart = null;
  const mesh = pick(event.clientX, event.clientY);
  if (mesh) select(mesh);
});
renderer.domElement.addEventListener('pointermove', event => {
  if (event.pointerType !== 'mouse' || event.buttons) return;
  viewer.classList.toggle('is-hovering', Boolean(pick(event.clientX, event.clientY)));
});
renderer.domElement.addEventListener('pointerleave', () => viewer.classList.remove('is-hovering'));

// ---------- Controls ----------
function setPlaying(playing) {
  state.playing = playing;
  const button = $('motion');
  button.setAttribute('aria-pressed', String(state.playing));
  $('motion-label').textContent = state.playing ? 'Pause motion' : 'Play motion';
  $('motion-icon').setAttribute('d', state.playing ? 'M7 5h3v14H7zM14 5h3v14h-3z' : 'M8 5v14l11-7z');
}
$('motion').addEventListener('click', () => setPlaying(!state.playing));
function updateFireButton() {
  const button = $('fire');
  const data = particleData();
  const name = `${article(data)} ${data.name.toLowerCase()}`;
  if (state.mode === 'selector') {
    button.textContent = state.beam ? 'Stop the beam' : 'Start the beam';
    button.setAttribute('aria-pressed', String(state.beam));
  } else {
    button.textContent = state.mode === 'cyclotron' ? `Inject ${name}` : `Fire ${name}`;
    button.setAttribute('aria-pressed', 'false');
  }
}
$('fire').addEventListener('click', () => {
  if (!lab) return;
  if (!state.playing) setPlaying(true);
  if (state.mode === 'selector') {
    state.beam = !state.beam;
    lab.spawnClock = 1;
    updateFireButton();
    readout.textContent = state.beam
      ? 'BEAM ON · Particles leave the source with a spread of speeds, coloured from slow (blue) to fast (orange). Watch which ones reach the detector.'
      : 'BEAM OFF · The histogram keeps the count. Change E or B, then start the beam again.';
    return;
  }
  fireTracer();
  const data = particleData();
  readout.textContent = state.mode === 'cyclotron'
    ? `${data.name.toUpperCase()} INJECTED · It starts at rest in the gap. Each time it crosses the gap it gains up to ${state.values.gap * Math.abs(data.q / 1.602177e-19)} keV.`
    : `${data.name.toUpperCase()} FIRED · The blue arrow is its velocity and the magenta arrow is the force on it. The dots mark equal time intervals.`;
});
function clearTracks() {
  if (!lab) return;
  while (lab.tracers.length) removeTracer(lab.tracers[0]);
  lab.emitted.fill(0);
  lab.passed.fill(0);
  if (lab.energy) lab.energy = [];
  lab.crossings = 0;
  updateEquation();
  drawGraph();
}
$('clear').addEventListener('click', () => {
  clearTracks();
  readout.textContent = 'TRACKS CLEARED · Ready for the next particle.';
});
$('reset').addEventListener('click', () => resetView(true));

function bindStepper(minus, plus, change) {
  for (const [button, direction] of [[minus, -1], [plus, 1]]) {
    let delay = null;
    let timer = null;
    const stop = () => {
      clearTimeout(delay);
      clearInterval(timer);
      delay = timer = null;
    };
    button.addEventListener('pointerdown', event => {
      if (button.disabled) return;
      event.preventDefault();
      change(direction);
      stop();
      delay = setTimeout(() => { timer = setInterval(() => change(direction), 110); }, 420);
    });
    for (const type of ['pointerup', 'pointerleave', 'pointercancel', 'blur']) button.addEventListener(type, stop);
    button.addEventListener('click', event => { if (event.detail === 0) change(direction); });
  }
}
function setValue(key, value, { user = false } = {}) {
  const spec = stepperSpec(key);
  const stepped = Math.round((value - spec.min) / spec.step) * spec.step + spec.min;
  const clamped = THREE.MathUtils.clamp(Number.isFinite(stepped) ? stepped : spec.value, spec.min, spec.max);
  const previous = state.values[key];
  state.values[key] = Number((key === 'frequency' && !user ? THREE.MathUtils.clamp(value, spec.min, spec.max) : clamped).toFixed(4));
  const input = $(`input-${key}`);
  if (input) {
    input.value = state.values[key].toFixed(spec.decimals);
    $(`minus-${key}`).disabled = state.values[key] <= spec.min;
    $(`plus-${key}`).disabled = state.values[key] >= spec.max;
  }
  onValueChange(key, user, previous !== state.values[key]);
}
function onValueChange(key, user, changed) {
  if (!lab) return;
  if (key === 'separation' && lab.kind === 'efield' && changed) rebuild();
  if (key === 'frequency' && user && state.autotune) {
    state.autotune = false;
    const button = document.querySelector('[data-toggle=autotune]');
    button?.setAttribute('aria-pressed', 'false');
  }
  if (key === 'cycField' && state.autotune) tune();
  updateEquation();
  drawGraph();
}
function tune() {
  if (state.mode !== 'cyclotron') return;
  setValue('frequency', cyclotronFrequency() / 1e6);
}
function buildControls() {
  const container = $('controls');
  container.replaceChildren();
  const config = CONTROLS[state.mode];
  const particles = MODE_PARTICLES[state.mode];
  const chooser = document.createElement('div');
  chooser.className = 'field';
  chooser.setAttribute('role', 'group');
  chooser.setAttribute('aria-labelledby', 'label-particle');
  chooser.innerHTML = '<span id="label-particle">Particle</span>';
  const choices = document.createElement('div');
  choices.className = 'choice-row';
  for (const key of particles) {
    const data = PARTICLES[key];
    const button = document.createElement('button');
    button.type = 'button';
    button.innerHTML = `<i class="chip" style="background:var(--${data.colour})">${data.symbol}</i>${data.name}`;
    button.setAttribute('aria-pressed', String(state.particle[state.mode] === key));
    button.addEventListener('click', () => chooseParticle(key));
    choices.appendChild(button);
  }
  chooser.appendChild(choices);
  container.appendChild(chooser);
  for (const key of config.steppers) {
    const spec = stepperSpec(key);
    const field = document.createElement('div');
    field.className = 'field';
    field.setAttribute('role', 'group');
    field.setAttribute('aria-labelledby', `label-${key}`);
    field.innerHTML = `<span id="label-${key}">${spec.label}</span><div class="stepper"><button type="button" id="minus-${key}" aria-label="Decrease ${spec.aria.toLowerCase()}">−</button><input type="number" id="input-${key}" min="${spec.min}" max="${spec.max}" step="${spec.step}" inputmode="decimal" aria-label="${spec.aria}"><button type="button" id="plus-${key}" aria-label="Increase ${spec.aria.toLowerCase()}">+</button></div>`;
    container.appendChild(field);
    bindStepper($(`minus-${key}`), $(`plus-${key}`), direction => setValue(key, state.values[key] + direction * spec.step, { user: true }));
    $(`input-${key}`).addEventListener('change', event => setValue(key, Number(event.target.value), { user: true }));
    if (state.values[key] === undefined) state.values[key] = spec.value;
    setValue(key, state.values[key]);
  }
  if (config.toggles.length) {
    const field = document.createElement('div');
    field.className = 'field';
    field.innerHTML = '<span>Try this</span>';
    const rowElement = document.createElement('div');
    rowElement.className = 'choice-row';
    for (const [key, label] of config.toggles) {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.toggle = key;
      button.textContent = label;
      button.setAttribute('aria-pressed', String(Boolean(state[key])));
      button.addEventListener('click', () => toggle(key, button));
      rowElement.appendChild(button);
    }
    field.appendChild(rowElement);
    container.appendChild(field);
  }
  if (state.mode === 'cyclotron' && state.autotune) tune();
}
// Each particle needs its own ranges, so choosing one resets its settings to sensible values.
function chooseParticle(key) {
  state.particle[state.mode] = key;
  for (const stepper of CONTROLS[state.mode].steppers) {
    if (STEPPERS[stepper].from) state.values[stepper] = particleData()[STEPPERS[stepper].from].value;
  }
  // Old tracks would feel the new particle's field settings, so start afresh (the E-field tab keeps them to compare).
  if (state.mode !== 'efield') {
    state.beam = false;
    clearTracks();
  }
  buildControls();
  updateFireButton();
  const data = particleData();
  readout.textContent = `${data.name.toUpperCase()} · Charge ${data.q > 0 ? '+' : '−'}${sci(Math.abs(data.q))} C · Mass ${sci(data.m)} kg. The settings were reset to suit it.`;
}
const TOGGLE_MESSAGES = {
  swap: () => 'POLARITY SWAPPED · The field now points the other way, so every particle bends the other way.',
  reverseB: () => 'FIELD REVERSED · The magnetic force reverses, so the particle circles the other way round.',
  autotune: () => state.autotune
    ? 'AUTO-TUNE ON · The oscillator frequency follows f = qB/(2πm).'
    : 'AUTO-TUNE OFF · Step the frequency away from the cyclotron frequency and inject a particle.'
};
function toggle(key, button) {
  state[key] = !state[key];
  button.setAttribute('aria-pressed', String(state[key]));
  if (key === 'swap' || key === 'reverseB') rebuild();
  if (key === 'autotune' && state.autotune) tune();
  readout.textContent = TOGGLE_MESSAGES[key]();
  updateEquation();
  drawGraph();
}
// Rebuild the apparatus but keep finished tracks, which no longer match the new settings, cleared.
function rebuild() {
  buildMode(false);
}

viewer.addEventListener('keydown', event => {
  const step = 0.12;
  const actions = {
    ArrowLeft: () => nudgeCamera(-step, 0),
    ArrowRight: () => nudgeCamera(step, 0),
    ArrowUp: () => nudgeCamera(0, -step),
    ArrowDown: () => nudgeCamera(0, step),
    '+': () => nudgeCamera(0, 0, 0.88),
    '=': () => nudgeCamera(0, 0, 0.88),
    '-': () => nudgeCamera(0, 0, 1.14),
    _: () => nudgeCamera(0, 0, 1.14),
    Home: () => resetView(true),
    0: () => resetView(true)
  };
  if (!actions[event.key]) return;
  event.preventDefault();
  actions[event.key]();
});

// ---------- Mode selection ----------
const DEFAULT_READOUT = {
  efield: 'PARALLEL PLATES · The top plate is positive, so the field points down. Choose a particle and press “Fire”, or tap a part.',
  bfield: 'UNIFORM MAGNETIC FIELD · The field points into the screen (away from you). Fire a particle from the source at the centre.',
  selector: 'VELOCITY SELECTOR · An electric field (down) and a magnetic field (into the screen) between the same plates. Start the beam.',
  cyclotron: 'CYCLOTRON · Two hollow dees between the poles of a magnet, with an alternating voltage across the gap. Inject a particle.'
};
const LEGEND = {
  efield: ['efield', 'velocity', 'force'],
  bfield: ['bfield', 'velocity', 'force'],
  selector: ['efield', 'bfield', 'velocity', 'speed'],
  cyclotron: ['efield', 'bfield', 'velocity', 'force']
};
const GRAPH_LABELS = {
  efield: 'Graph of the velocity components against time',
  bfield: 'Graph of speed, one velocity component and kinetic energy against time',
  selector: 'Histogram of the speeds emitted and the speeds that pass through the slit',
  cyclotron: 'Graph of kinetic energy against time, with the maximum energy'
};
function buildMode(animate) {
  clearStage();
  if (state.mode === 'efield') buildEField();
  else if (state.mode === 'bfield') buildBField();
  else if (state.mode === 'selector') buildSelector();
  else buildCyclotron();
  const shadow = { efield: [-4.2, 26, 1], bfield: [-10, 26, 2], selector: [-3, 22, 1], cyclotron: [-1.55, 14, 0] }[state.mode];
  floorShadow.position.set(state.mode === 'efield' ? 2 : 0, shadow[0], 0);
  floorShadow.scale.set(shadow[1], shadow[1] * 0.6, 1);
  floorShadow.visible = state.mode !== 'bfield';
  floorShadow.material.opacity = palette.dark ? 0.7 : 0.28;
  if (animate) fadeIn = { t: 0 };
  updateFireButton();
  updateEquation();
  drawGraph();
}
function selectMode(mode, animate = true) {
  const previous = state.mode;
  state.mode = mode;
  state.beam = false;
  const data = MODES[mode];
  document.body.dataset.mode = mode;
  cameraTween = null;
  for (const key of CONTROLS[mode].steppers) {
    if (state.values[key] === undefined) state.values[key] = stepperSpec(key).value;
  }
  if (mode === 'cyclotron' && state.autotune) state.values.frequency = cyclotronFrequency() / 1e6;
  buildMode(animate && previous !== mode);
  buildControls();
  updateFireButton();
  document.querySelectorAll('[data-legend]').forEach(item => { item.hidden = !LEGEND[mode].includes(item.dataset.legend); });
  $('action-hint').textContent = data.hint;
  readout.textContent = DEFAULT_READOUT[mode];
  for (const [id, key] of Object.entries({ 'scene-title': 'title', 'mode-date': 'date', 'mode-heading': 'heading', 'mode-level': 'level', description: 'description', look: 'look', evidence: 'evidence', deeper: 'deeper' })) $(id).textContent = data[key];
  document.querySelectorAll('.models [data-mode]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.mode === mode)));
  viewer.setAttribute('aria-label', `${data.title}. ${data.description} Drag or use arrow keys to rotate; scroll, pinch or plus and minus keys to zoom.`);
  $('graph-canvas').setAttribute('aria-label', GRAPH_LABELS[mode]);
  quiz.show(mode);
  resetView();
}
document.querySelectorAll('.models [data-mode]').forEach(button => button.addEventListener('click', () => {
  if (button.dataset.mode !== state.mode) selectMode(button.dataset.mode);
}));

// ---------- Progress ----------
const progress = loadProgress();
const quiz = new Quiz($('mode-quiz'), { questionSets: QUESTIONS, progress, title: '✦ Unlock this discovery', completeText: '✦ Discovery unlocked!', onChange: updateProgress });
const finalQuiz = new Quiz($('final-quiz'), { questionSets: QUESTIONS, progress, title: '✦ Final challenge', completeText: 'Field expert!', completeIcon: 'trophy', onChange: updateProgress });
function updateProgress() {
  saveProgress(progress);
  const unlocked = MODE_ORDER.filter(mode => setSummary(progress, mode, QUESTIONS[mode]).complete);
  const sets = [...MODE_ORDER, 'final'];
  const stars = sets.reduce((sum, key) => sum + setSummary(progress, key, QUESTIONS[key]).stars, 0);
  const total = sets.reduce((sum, key) => sum + QUESTIONS[key].length, 0);
  const finalDone = setSummary(progress, 'final', QUESTIONS.final).complete;
  $('progress').textContent = `${unlocked.length} / 4 discoveries unlocked · ★ ${stars} / ${total}${finalDone ? ' · Field expert!' : ''}`;
  document.querySelectorAll('.models [data-mode]').forEach(button => {
    const done = unlocked.includes(button.dataset.mode);
    const label = button.querySelector('span');
    label.textContent = `${label.textContent.replace(' ✓', '')}${done ? ' ✓' : ''}`;
  });
  const open = unlocked.length === MODE_ORDER.length;
  const finalQuizElement = $('final-quiz');
  if (open && finalQuizElement.hidden) finalQuiz.show('final');
  finalQuizElement.hidden = !open;
  document.querySelector('.final-challenge').classList.toggle('is-locked', !open);
  $('final-status').textContent = open
    ? 'You have steered charges with electric fields, magnetic fields, crossed fields and a cyclotron. Use them together.'
    : `Unlock all four discoveries to open the final challenge (${unlocked.length} of 4 so far).`;
}
$('reset-progress').addEventListener('click', () => {
  if (!window.confirm('Reset all discoveries and stars saved on this device?')) return;
  Object.keys(progress).forEach(key => delete progress[key]);
  quiz.resetView();
  finalQuiz.resetView();
  $('final-quiz').hidden = true;
  updateProgress();
});

// ---------- Theme ----------
window.addEventListener('panphy:theme-change', () => {
  palette = readPalette();
  state.beam = false;
  buildMode(false);
});
document.fonts?.ready.then(() => {
  // Redraw the canvas labels once the fonts have loaded.
  if (lab && !lab.tracers.length) buildMode(false);
});

// ---------- Rendering ----------
function resize() {
  const { clientWidth: width, clientHeight: height } = renderer.domElement;
  if (!width || !height) return;
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  if (!userMoved && !cameraTween) resetView();
  drawGraph();
  renderer.render(scene, camera);
}
const resizeObserver = new ResizeObserver(resize);
resizeObserver.observe(viewer);
resizeObserver.observe(renderer.domElement);
new IntersectionObserver(entries => { state.visible = entries[entries.length - 1].isIntersecting; }).observe(viewer);
renderer.domElement.addEventListener('webglcontextlost', event => {
  event.preventDefault();
  $('load-status').hidden = false;
  $('load-status').textContent = 'The 3D view was interrupted. Reload this page to restore it.';
});

function stepLab(delta) {
  if (!lab) return;
  lab.time += delta;
  if (state.mode === 'selector' && state.beam) {
    lab.spawnClock += delta;
    if (lab.spawnClock > 0.22) {
      lab.spawnClock = 0;
      fireTracer();
    }
  }
  for (const tracer of [...lab.tracers]) advance(tracer, delta);
  if (state.mode === 'cyclotron') {
    const tracer = lab.tracers[0];
    if (tracer?.alive) lab.energy.push([tracer.displayTime, 0.5 * tracer.m * tracer.vel.lengthSq() / 1.602177e-13]);
    // The dees glow with the sign of the alternating voltage.
    const voltage = tracer?.alive ? gapVoltage(tracer.t) / (state.values.gap * 1000) : 0;
    lab.dees.forEach((dee, i) => {
      const value = i === 0 ? -voltage : voltage;
      dee.material.emissive.copy(value >= 0 ? palette.positive : palette.negative);
      dee.material.emissiveIntensity = Math.abs(value) * 0.8;
    });
  }
  if (state.mode === 'selector' && lab.detector) {
    lab.flash = Math.max(0, (lab.flash || 0) - delta * 2);
    lab.detector.material.emissiveIntensity = 0.15 + lab.flash * 0.8;
  }
  updateArrows();
}

setPlaying(state.playing);
updateProgress();
resize();
selectMode('efield', false);
$('load-status').hidden = true;
let previousTime = performance.now();
let readoutClock = 0;
renderer.setAnimationLoop(frame);
function frame(time) {
  const delta = Math.min((time - previousTime) / 1000, 0.05);
  previousTime = time;
  if (!state.visible || document.hidden) return;
  if (state.playing) stepLab(delta);
  if (fadeIn) {
    fadeIn.t += delta;
    const k = Math.min(1, fadeIn.t / TRANSITION_TIME);
    stage.scale.setScalar(0.85 + 0.15 * ease(k));
    if (k >= 1) fadeIn = null;
  }
  readoutClock += delta;
  if (readoutClock > 0.12) {
    readoutClock = 0;
    updateEquation();
    drawGraph();
  }
  if (selected) {
    selected.material.emissive.copy(palette.accent);
    selected.material.emissiveIntensity = 0.25 + 0.2 * Math.sin(time / 220);
  }
  stepCamera(delta);
  controls.update();
  renderer.render(scene, camera);
}
