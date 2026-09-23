import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { MODELS, MODEL_ORDER, PARTICLES, ORBITALS, QUESTIONS } from './content.js';
import { Quiz, loadProgress, saveProgress, setSummary } from './quiz.js';

const $ = id => document.getElementById(id);
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const state = {
  model: 'plum',
  playing: !reducedMotion,
  time: 0,
  visible: true,
  inspectIndex: 0,
  orbitalIndex: -1,
  orbitalFocus: null,
  exciteIndex: 0,
  trueScale: false
};

// Display sizes in scene units. Markers are enlarged and not to scale.
const ELECTRON_RADIUS = 0.09;
const NUCLEON_RADIUS = 0.17;
const PLUM_RADIUS = 2;
const RUTHERFORD_NUCLEUS = 0.32;
const CLOUD_NUCLEUS = 0.13;
const BOHR_RADII = [1.0, 1.95, 2.9];
const POSITIVE_RADIUS = { plum: PLUM_RADIUS, rutherford: RUTHERFORD_NUCLEUS, bohr: 0.45, cloud: CLOUD_NUCLEUS };
const TRUE_SCALE_FACTOR = 1e-4;
const ALPHA_SPEED = 4;
const ALPHA_K = 1.5; // Same total positive charge in both models; only its spread differs.
const TRANSITION_TIME = 1.3;
const EXCITE_PHASES = [['in', 1.4], ['up', 0.6], ['stay', 1.6], ['down', 0.5], ['out', 1.4]];

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
const camera = new THREE.PerspectiveCamera(40, 1, 0.05, 100);
camera.position.set(0, 1.2, 9);
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
viewer.prepend(renderer.domElement);
scene.add(new THREE.HemisphereLight(0xe7f4ff, 0x32415a, 2.3));
const light = new THREE.DirectionalLight(0xffffff, 3);
light.position.set(4, 5, 6);
scene.add(light);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enablePan = false;
controls.minDistance = 0.9;
controls.maxDistance = 24;
controls.enableDamping = true;
controls.saveState();
const atom = new THREE.Group();
scene.add(atom);
const beamGroup = new THREE.Group();
scene.add(beamGroup);

let palette = readPalette();
let electrons = [];
let trails = [];
let pickables = [];
let fadeables = [];
let buildTextures = [];
let positiveBody = null;
let cloud = null;
let bohrRings = [];
let transition = null;
let cameraTween = null;
let beam = null;
let excite = null;
let scaleTween = null;
let nucleusScale = 1;

function readPalette() {
  const styles = getComputedStyle(document.documentElement);
  const color = name => new THREE.Color(styles.getPropertyValue(name).trim());
  return {
    dark: document.documentElement.getAttribute('data-theme') === 'dark',
    electron: color('--electron'),
    positive: color('--positive'),
    proton: color('--proton'),
    neutron: color('--neutron'),
    alpha: color('--alpha'),
    photon: color('--photon'),
    line: color('--text-secondary'),
    accent: color('--brand-accent'),
    primary: color('--brand-primary')
  };
}

// ---------- Textures ----------
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
const dotTexture = canvasTexture(64, 64, (ctx, w) => {
  const gradient = ctx.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.5, 'rgba(255,255,255,0.8)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, w, w);
}, false);
const plusTexture = canvasTexture(64, 64, ctx => {
  ctx.fillStyle = '#fff';
  ctx.fillRect(26, 10, 12, 44);
  ctx.fillRect(10, 26, 44, 12);
}, false);
const shadowTexture = canvasTexture(128, 128, (ctx, w) => {
  const gradient = ctx.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
  gradient.addColorStop(0, 'rgba(0,0,0,0.55)');
  gradient.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, w, w);
}, false);
const markerTexture = canvasTexture(128, 128, ctx => {
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 8;
  ctx.setLineDash([14, 10]);
  ctx.beginPath();
  ctx.arc(64, 64, 52, 0, Math.PI * 2);
  ctx.stroke();
}, false);

// A sphere texture with a charge symbol repeated around it.
function symbolTexture(background, symbol) {
  return canvasTexture(256, 128, (ctx, w, h) => {
    ctx.fillStyle = `#${background.getHexString()}`;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.font = '700 54px Manrope, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const x of [32, 96, 160, 224]) ctx.fillText(symbol, x, h / 2 + 2);
  });
}
function labelSprite(text, color) {
  const texture = canvasTexture(256, 96, (ctx, w, h) => {
    ctx.fillStyle = `#${color.getHexString()}`;
    ctx.font = '600 44px "IBM Plex Mono", ui-monospace, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, w / 2, h / 2);
  });
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false }));
  sprite.scale.set(0.62, 0.23, 1);
  return sprite;
}

// ---------- Object helpers ----------
function fade(material) {
  material.transparent = true;
  material.userData.base = material.opacity;
  fadeables.push(material);
  return material;
}
function sphere(radius, color, { opacity = 1, map = null, side = THREE.FrontSide, roughness = 0.3, emissive = 0.04 } = {}) {
  const material = new THREE.MeshStandardMaterial({ color: map ? 0xffffff : color, map, roughness, metalness: 0.15, emissive: color, emissiveIntensity: emissive, transparent: opacity < 1, opacity, depthWrite: opacity === 1, side });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 40, 28), material);
  mesh.userData.radius = radius;
  return mesh;
}
function glow(color, size) {
  const material = new THREE.SpriteMaterial({ map: glowTexture, color, transparent: true, opacity: palette.dark ? 0.6 : 0.3, depthWrite: false, blending: palette.dark ? THREE.AdditiveBlending : THREE.NormalBlending });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(size, size, 1);
  sprite.raycast = () => {};
  return sprite;
}
function makeElectron() {
  const mesh = sphere(ELECTRON_RADIUS, palette.electron, { map: symbolTexture(palette.electron, '−'), emissive: 0.12 });
  mesh.add(glow(palette.electron, 0.55));
  mesh.userData.kind = 'electron';
  return mesh;
}
function ring(radius, color, opacity, tilt = 0, dashed = false) {
  const points = Array.from({ length: 129 }, (_, i) => new THREE.Vector3(radius * Math.cos(i / 128 * Math.PI * 2), radius * Math.sin(i / 128 * Math.PI * 2) * Math.cos(tilt), radius * Math.sin(i / 128 * Math.PI * 2) * Math.sin(tilt)));
  const material = dashed
    ? new THREE.LineDashedMaterial({ color, transparent: true, opacity, dashSize: 0.12, gapSize: 0.09 })
    : new THREE.LineBasicMaterial({ color, transparent: true, opacity });
  const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), material);
  if (dashed) line.computeLineDistances();
  fade(material);
  atom.add(line);
  return line;
}
function random(seed) {
  // Deterministic pseudo-random numbers so layouts stay the same between visits.
  return () => {
    seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function randomDirection(rand = Math.random) {
  const z = rand() * 2 - 1;
  const phi = rand() * Math.PI * 2;
  const s = Math.sqrt(1 - z * z);
  return new THREE.Vector3(s * Math.cos(phi), s * Math.sin(phi), z);
}

// ---------- Floor shadow and helpers that persist between models ----------
const floorShadow = new THREE.Mesh(new THREE.PlaneGeometry(6, 6), new THREE.MeshBasicMaterial({ map: shadowTexture, transparent: true, depthWrite: false }));
floorShadow.rotation.x = -Math.PI / 2;
floorShadow.position.y = -2.9;
floorShadow.raycast = () => {};
scene.add(floorShadow);
const halo = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.35, side: THREE.BackSide, depthWrite: false }));
halo.raycast = () => {};
const trueScaleMarker = new THREE.Sprite(new THREE.SpriteMaterial({ map: markerTexture, transparent: true, depthTest: false, sizeAttenuation: false }));
trueScaleMarker.scale.set(0.07, 0.07, 1);
trueScaleMarker.visible = false;
scene.add(trueScaleMarker);
function applyThemeToPersistent() {
  floorShadow.material.opacity = palette.dark ? 0.7 : 0.25;
  halo.material.color.copy(palette.accent);
  trueScaleMarker.material.color.copy(palette.primary);
}
applyThemeToPersistent();

// ---------- Model builders ----------
function disposeObject(object) {
  object.traverse(child => {
    child.geometry?.dispose();
    if (child.material) (Array.isArray(child.material) ? child.material : [child.material]).forEach(material => material.dispose());
  });
}
function clearAtom() {
  halo.removeFromParent();
  for (const child of [...atom.children]) {
    disposeObject(child);
    atom.remove(child);
  }
  buildTextures.forEach(texture => texture.dispose());
  buildTextures = [];
  electrons = [];
  trails = [];
  pickables = [];
  fadeables = [];
  bohrRings = [];
  positiveBody = null;
  cloud = null;
}

function buildPlum() {
  const body = new THREE.Group();
  const pudding = sphere(PLUM_RADIUS, new THREE.Color('#E5A142'), { opacity: 0.26, side: THREE.DoubleSide, roughness: 0.7, emissive: 0.12 });
  fade(pudding.material);
  pudding.userData.kind = 'pudding';
  body.add(pudding);
  // Evenly spread + marks show charge filling the whole volume.
  [[0.55, 6], [1.1, 14], [1.6, 24]].forEach(([radius, count], shell) => {
    for (let i = 0; i < count; i++) {
      const y = 1 - (i + 0.5) / count * 2;
      const r = Math.sqrt(1 - y * y);
      const theta = i * 2.39996 + shell;
      const material = fade(new THREE.SpriteMaterial({ map: plusTexture, color: palette.positive, opacity: palette.dark ? 0.75 : 0.6, depthWrite: false }));
      const plus = new THREE.Sprite(material);
      plus.position.set(r * Math.cos(theta), y, r * Math.sin(theta)).multiplyScalar(radius);
      plus.scale.set(0.16, 0.16, 1);
      plus.raycast = () => {};
      body.add(plus);
    }
  });
  atom.add(body);
  positiveBody = body;
  pickables.push({ object: pudding, kind: 'pudding', background: true });

  // Six electrons at the corners of an octahedron: Thomson's stable arrangement for six.
  const rand = random(19);
  const tilt = new THREE.Euler(0.5, 0.6, 0.2);
  [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]].forEach(corner => {
    const mesh = makeElectron();
    atom.add(mesh);
    electrons.push({ mesh, home: new THREE.Vector3(...corner).applyEuler(tilt), dir: randomDirection(rand), phase: rand() * Math.PI * 2 });
    pickables.push({ object: mesh, kind: 'electron' });
  });
}

function buildRutherford() {
  const nucleus = sphere(RUTHERFORD_NUCLEUS, new THREE.Color(palette.dark ? '#E8A94A' : '#D99A36'), { map: symbolTexture(new THREE.Color(palette.dark ? '#E8A94A' : '#D99A36'), '+'), emissive: 0.1 });
  nucleus.userData.kind = 'nucleus';
  nucleus.add(glow(new THREE.Color('#F2B04E'), 1.3));
  atom.add(nucleus);
  positiveBody = nucleus;
  pickables.push({ object: nucleus, kind: 'nucleus' });
  // A boundary guide, not a shell or a prescribed electron orbit.
  ring(2.3, palette.line, 0.18);
  ring(2.3, palette.line, 0.1, Math.PI / 2);
  for (let i = 0; i < 6; i++) {
    const radius = 1.5 + (i % 3) * 0.28;
    const tilt = (i % 3 - 1) * 0.9;
    const mesh = makeElectron();
    atom.add(mesh);
    electrons.push({ mesh, radius, angle: i * Math.PI / 3, tilt, speed: 0.6 });
    pickables.push({ object: mesh, kind: 'electron' });
    // Each path is shared by two electrons on opposite sides: illustrative, not quantised.
    if (i < 3) ring(radius, palette.line, 0.5, tilt);
  }
}

function bohrSpeed(radius) {
  // Bohr: orbital speed falls as 1/n, so outer electrons move more slowly.
  return 1.1 * BOHR_RADII[0] / radius;
}
function buildBohr() {
  // Twelve nucleons settled into a compact, slightly irregular cluster.
  const rand = random(7);
  const points = Array.from({ length: 12 }, () => randomDirection(rand).multiplyScalar(0.35 * Math.cbrt(rand())));
  for (let step = 0; step < 300; step++) {
    for (let i = 0; i < points.length; i++) {
      for (let j = i + 1; j < points.length; j++) {
        const gap = points[j].clone().sub(points[i]);
        const overlap = NUCLEON_RADIUS * 2 - gap.length();
        if (overlap > 0) {
          gap.setLength(overlap / 2 + 1e-4);
          points[j].add(gap);
          points[i].sub(gap);
        }
      }
    }
    points.forEach(point => point.multiplyScalar(0.985));
  }
  const centre = points.reduce((sum, point) => sum.add(point), new THREE.Vector3()).divideScalar(points.length);
  const kinds = ['proton', 'neutron', 'proton', 'proton', 'neutron', 'neutron', 'proton', 'neutron', 'proton', 'neutron', 'neutron', 'proton'];
  const nucleus = new THREE.Group();
  nucleus.userData.radius = 0.5;
  nucleus.userData.kind = 'bohrNucleus';
  const textures = { proton: symbolTexture(palette.proton, '+'), neutron: symbolTexture(palette.neutron, '0') };
  points.forEach((point, i) => {
    const mesh = sphere(NUCLEON_RADIUS, palette[kinds[i]], { map: textures[kinds[i]] });
    mesh.position.copy(point.sub(centre));
    mesh.rotation.y = i * 0.9;
    mesh.userData.kind = kinds[i];
    nucleus.add(mesh);
    pickables.push({ object: mesh, kind: kinds[i] });
  });
  atom.add(nucleus);
  positiveBody = nucleus;

  BOHR_RADII.forEach((radius, level) => {
    const line = ring(radius, palette.line, level === 2 ? 0.55 : 0.6, 0, level === 2);
    const label = labelSprite(`n = ${level + 1}`, palette.line);
    const angle = 0.95;
    label.position.set((radius + 0.18) * Math.cos(angle), (radius + 0.18) * Math.sin(angle), 0);
    label.raycast = () => {};
    fade(label.material);
    atom.add(label);
    bohrRings.push({ line, label, hidden: level === 2 });
  });
  for (let i = 0; i < 6; i++) {
    const inner = i < 2;
    const radius = BOHR_RADII[inner ? 0 : 1];
    const mesh = makeElectron();
    atom.add(mesh);
    electrons.push({ mesh, radius, angle: inner ? i * Math.PI : (i - 2) * Math.PI / 2 + 0.4, tilt: 0, bohr: true });
    pickables.push({ object: mesh, kind: 'electron' });
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(40 * 3), 3));
    const trail = new THREE.Line(geometry, fade(new THREE.LineBasicMaterial({ color: palette.electron, transparent: true, opacity: 0.35 })));
    atom.add(trail);
    trails.push(trail);
  }
}

// Hydrogen-like orbital sampling (radial probability × angular shape).
function gamma(shape, scale) {
  let product = 1;
  for (let i = 0; i < shape; i++) product *= 1 - Math.random();
  return -scale * Math.log(product);
}
const ORBITAL_SAMPLERS = {
  '1s': () => randomDirection().multiplyScalar(gamma(3, 0.16)),
  '2s': () => {
    for (;;) {
      const x = Math.random() * 14;
      if (Math.random() * 1.6 < x * x * (2 - x) * (2 - x) * Math.exp(-x)) return randomDirection().multiplyScalar(x * 0.42);
    }
  },
  '2px': () => sampleP(new THREE.Vector3(1, 0, 0)),
  '2py': () => sampleP(new THREE.Vector3(0, 1, 0))
};
function sampleP(axis) {
  for (;;) {
    const direction = randomDirection();
    const c = direction.dot(axis);
    if (Math.random() < c * c) return direction.multiplyScalar(gamma(5, 0.42));
  }
}
function sampleOrbital(key) {
  for (;;) {
    const point = ORBITAL_SAMPLERS[key]();
    if (point.length() < 3.4) return point;
  }
}
function buildCloud() {
  const nucleus = sphere(CLOUD_NUCLEUS, palette.proton, { map: symbolTexture(palette.proton, '+'), emissive: 0.15 });
  nucleus.userData.kind = 'cloudNucleus';
  atom.add(nucleus);
  positiveBody = nucleus;
  pickables.push({ object: nucleus, kind: 'cloudNucleus' });
  cloud = [];
  // Carbon's two 2p electrons occupy two different 2p orbitals, drawn in two colours.
  [
    ['1s', '1s', 1800, palette.electron],
    ['2s', '2s', 2600, new THREE.Color(palette.dark ? '#8FD0F5' : '#3E9AD6')],
    ['2p', '2px', 1800, palette.accent],
    ['2p', '2py', 1800, new THREE.Color(palette.dark ? '#C4B5FD' : '#7C3AED')]
  ].forEach(([key, sample, count, color]) => {
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) sampleOrbital(sample).toArray(positions, i * 3);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const material = fade(new THREE.PointsMaterial({ color, map: dotTexture, size: 0.1, transparent: true, opacity: palette.dark ? 0.75 : 0.6, depthWrite: false, blending: palette.dark ? THREE.AdditiveBlending : THREE.NormalBlending }));
    const points = new THREE.Points(geometry, material);
    points.raycast = () => {};
    atom.add(points);
    cloud.push({ key, sample, points });
  });
  pickables.push({ object: nucleus, kind: 'cloud', background: true, radius: 2.8 });
}

const BUILDERS = { plum: buildPlum, rutherford: buildRutherford, bohr: buildBohr, cloud: buildCloud };

function buildAtom(animate) {
  const previousModel = atom.userData.model;
  const fromPositions = electrons.map(electron => electron.mesh.position.clone());
  if (previousModel === 'cloud' && cloud) {
    const positions = cloud[2].points.geometry.attributes.position;
    for (let i = 0; i < 6; i++) fromPositions.push(new THREE.Vector3().fromBufferAttribute(positions, i * 97));
  }
  clearAtom();
  atom.userData.model = state.model;
  BUILDERS[state.model]();
  nucleusScale = 1;
  scaleTween = null;
  positionElectrons();
  transition = null;
  if (!animate || reducedMotion || !previousModel || previousModel === state.model) {
    applyOpacity(1);
    return;
  }
  const ghosts = [];
  if (state.model === 'cloud') {
    // Electron markers dissolve into the probability cloud.
    fromPositions.slice(0, 6).forEach((position, i) => {
      const mesh = sphere(ELECTRON_RADIUS, palette.electron, { opacity: 0.99 });
      mesh.position.copy(position);
      atom.add(mesh);
      ghosts.push({ mesh, from: position, to: sampleOrbital(['1s', '1s', '2s', '2s', '2px', '2py'][i]) });
    });
  }
  transition = {
    t: 0,
    from: fromPositions,
    ghosts,
    startScale: POSITIVE_RADIUS[previousModel] / POSITIVE_RADIUS[state.model],
    solids: []
  };
  if (transition.startScale > 1) {
    // Spread-out charge collapsing into a nucleus: see-through until it is small.
    positiveBody.traverse(child => {
      if (child.isMesh && !child.material.transparent) {
        child.material.transparent = true;
        child.material.depthWrite = false;
        child.material.needsUpdate = true;
        transition.solids.push(child.material);
      }
    });
  }
  stepTransition(0);
}

function ease(k) {
  return k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
}
function applyOpacity(k) {
  for (const material of fadeables) {
    let factor = k;
    if (cloud && material.isPointsMaterial && state.orbitalFocus) {
      factor *= cloud.some(item => item.key === state.orbitalFocus && item.points.material === material) ? 1 : 0.06;
    }
    material.opacity = material.userData.base * factor;
  }
  for (const { line, label, hidden } of bohrRings) {
    if (!hidden) continue;
    const shown = excite ? excite.ringLevel : 0;
    line.material.opacity = line.material.userData.base * shown * k;
    label.material.opacity = label.material.userData.base * shown * k;
  }
}
function stepTransition(delta) {
  if (!transition) return;
  transition.t = Math.min(1, transition.t + delta / TRANSITION_TIME);
  const k = ease(transition.t);
  if (positiveBody) positiveBody.scale.setScalar(THREE.MathUtils.lerp(transition.startScale, 1, k) * nucleusScale);
  electrons.forEach((electron, i) => {
    if (transition.from[i]) electron.mesh.position.lerpVectors(transition.from[i], electron.mesh.position, k);
  });
  for (const ghost of transition.ghosts) {
    ghost.mesh.position.lerpVectors(ghost.from, ghost.to, k);
    ghost.mesh.material.opacity = 1 - k;
  }
  applyOpacity(k);
  for (const material of transition.solids) material.opacity = THREE.MathUtils.lerp(0.25, 1, k * k);
  if (transition.t >= 1) {
    for (const material of transition.solids) {
      material.transparent = false;
      material.depthWrite = true;
      material.opacity = 1;
      material.needsUpdate = true;
    }
    for (const ghost of transition.ghosts) {
      disposeObject(ghost.mesh);
      atom.remove(ghost.mesh);
    }
    transition = null;
  }
}

// ---------- Motion ----------
function orbitPosition(radius, angle, tilt, target) {
  return target.set(radius * Math.cos(angle), radius * Math.sin(angle) * Math.cos(tilt), radius * Math.sin(angle) * Math.sin(tilt));
}
function advanceMotion(delta) {
  for (const electron of electrons) {
    if (electron.home) continue;
    const speed = electron.bohr ? bohrSpeed(electron.radius) : electron.speed;
    electron.angle += speed / electron.radius * delta;
  }
  if (cloud) {
    // Replace a fraction of the dots each frame: positions are probabilities, not tracks.
    for (const { sample, points } of cloud) {
      const positions = points.geometry.attributes.position;
      const swaps = Math.ceil(positions.count * 0.5 * delta);
      for (let i = 0; i < swaps; i++) {
        const index = Math.floor(Math.random() * positions.count);
        const point = sampleOrbital(sample);
        positions.setXYZ(index, point.x, point.y, point.z);
      }
      positions.needsUpdate = true;
    }
  }
}
function positionElectrons() {
  for (const [index, electron] of electrons.entries()) {
    if (electron.home) {
      electron.mesh.position.copy(electron.home).addScaledVector(electron.dir, 0.07 * Math.sin(state.time * 5 + electron.phase));
      continue;
    }
    orbitPosition(electron.radius, electron.angle, electron.tilt, electron.mesh.position);
    const trail = trails[index];
    if (!trail) continue;
    const positions = trail.geometry.attributes.position;
    const point = new THREE.Vector3();
    for (let i = 0; i < positions.count; i++) {
      orbitPosition(electron.radius, electron.angle - i * 0.018 * 1.1 / electron.radius, electron.tilt, point);
      positions.setXYZ(i, point.x, point.y, point.z);
    }
    positions.needsUpdate = true;
    trail.geometry.computeBoundingSphere();
  }
}

// ---------- Camera ----------
const ORIGIN = new THREE.Vector3();
function flyTo({ direction, distance }) {
  const from = new THREE.Spherical().setFromVector3(camera.position.clone().sub(controls.target));
  const dir = (direction || camera.position.clone().sub(controls.target)).clone().normalize();
  const to = new THREE.Spherical().setFromVector3(dir.multiplyScalar(THREE.MathUtils.clamp(distance, controls.minDistance, controls.maxDistance)));
  to.phi = THREE.MathUtils.clamp(to.phi, 0.1, Math.PI - 0.1);
  let turn = to.theta - from.theta;
  turn = ((turn + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
  to.theta = from.theta + turn;
  cameraTween = { from, to, t: 0, duration: reducedMotion ? 0 : 0.9 };
  stepCamera(0);
}
function stepCamera(delta) {
  if (!cameraTween) return;
  cameraTween.t += delta;
  const k = cameraTween.duration ? ease(Math.min(1, cameraTween.t / cameraTween.duration)) : 1;
  const { from, to } = cameraTween;
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
  const spherical = new THREE.Spherical().setFromVector3(camera.position.clone().sub(controls.target));
  spherical.theta += dTheta;
  spherical.phi = THREE.MathUtils.clamp(spherical.phi + dPhi, 0.1, Math.PI - 0.1);
  spherical.radius = THREE.MathUtils.clamp(spherical.radius * zoom, controls.minDistance, controls.maxDistance);
  camera.position.setFromSpherical(spherical).add(controls.target);
  controls.update();
}
controls.addEventListener('start', () => { cameraTween = null; });
const HOME_DIRECTION = new THREE.Vector3(0, 1.2, 9).normalize();
function fitDistance(halfWidth) {
  // Keep the given half-width in view on narrow (portrait) viewers.
  const halfHeight = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  return halfWidth / (halfHeight * Math.min(1, camera.aspect));
}
function resetView() {
  cameraTween = null;
  controls.reset();
  camera.position.copy(HOME_DIRECTION).multiplyScalar(Math.max(9.08, fitDistance(3.3)));
  controls.update();
  select(null);
  if (state.orbitalFocus) {
    state.orbitalFocus = null;
    state.orbitalIndex = -1;
    applyOpacity(1);
  }
}

// ---------- Selection and picking ----------
function select(object, text) {
  halo.removeFromParent();
  if (object) {
    const radius = object.userData.radius || 0.2;
    halo.scale.setScalar(radius * 1.55 + 0.04);
    object.add(halo);
  }
  if (text) readout.textContent = text;
}
function describe(kind) {
  switch (kind) {
    case 'electron': return state.model === 'plum' ? PARTICLES.plumElectron : PARTICLES.electron;
    case 'nucleus': return state.trueScale ? `${PARTICLES.nucleus} At true scale it is far too small to see.` : PARTICLES.nucleus;
    case 'cloud': return 'ELECTRON CLOUD · Six electrons spread over the 1s, 2s and 2p orbitals. Use “Inspect an orbital” to pick out each shape.';
    default: return PARTICLES[kind];
  }
}
const projected = new THREE.Vector3();
const worldPosition = new THREE.Vector3();
const worldScale = new THREE.Vector3();
function pick(clientX, clientY) {
  const rect = renderer.domElement.getBoundingClientRect();
  const x = clientX - rect.left;
  const y = clientY - rect.top;
  const pixelsPerUnit = rect.height / 2 / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  let best = null;
  let backdrop = null;
  for (const item of pickables) {
    item.object.getWorldPosition(worldPosition);
    item.object.getWorldScale(worldScale);
    projected.copy(worldPosition).project(camera);
    if (projected.z > 1) continue;
    const depth = camera.position.distanceTo(worldPosition);
    const radius = (item.radius || item.object.userData.radius || 0.1) * worldScale.x * pixelsPerUnit / Math.max(depth, 0.01);
    const distance = Math.hypot((projected.x + 1) / 2 * rect.width - x, (1 - projected.y) / 2 * rect.height - y);
    if (item.background) {
      if (distance <= radius) backdrop = item;
      continue;
    }
    // Generous hit area: at least a 48px target around small markers.
    if (distance > Math.max(radius + 6, 24)) continue;
    const direct = distance <= radius;
    const score = direct ? depth - 1000 : distance;
    if (!best || score < best.score) best = { item, score };
  }
  return best?.item || backdrop;
}
let pointerStart = null;
renderer.domElement.addEventListener('pointerdown', event => { pointerStart = [event.clientX, event.clientY]; });
renderer.domElement.addEventListener('pointerup', event => {
  if (!pointerStart || Math.hypot(event.clientX - pointerStart[0], event.clientY - pointerStart[1]) > 6) return;
  pointerStart = null;
  const item = pick(event.clientX, event.clientY);
  if (!item) return;
  select(item.background ? null : item.object, describe(item.kind));
});
renderer.domElement.addEventListener('pointermove', event => {
  if (event.pointerType !== 'mouse' || event.buttons) return;
  const item = pick(event.clientX, event.clientY);
  viewer.classList.toggle('is-hovering', Boolean(item && !item.background));
});
renderer.domElement.addEventListener('pointerleave', () => viewer.classList.remove('is-hovering'));

// ---------- Alpha-particle beam ----------
function alphaForce(position, target) {
  const r = position.length();
  if (state.model === 'plum') {
    // Uniform positive sphere: the field grows linearly inside and is never strong.
    const scale = r < PLUM_RADIUS ? ALPHA_K / PLUM_RADIUS ** 3 : ALPHA_K / r ** 3;
    return target.copy(position).multiplyScalar(scale);
  }
  const soft = r * r + 0.0004;
  return target.copy(position).multiplyScalar(ALPHA_K / (soft * Math.sqrt(soft)));
}
function startBeam() {
  stopBeam();
  const source = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.3, 0.8, 24), new THREE.MeshStandardMaterial({ color: palette.line, roughness: 0.5 }));
  source.rotation.z = Math.PI / 2;
  source.position.set(-6.3, 0, 0);
  beamGroup.add(source);
  beam = { alphas: [], history: [], timer: 0, stats: { fired: 0, straight: 0, deflected: 0, back: 0 } };
  $('alpha').setAttribute('aria-pressed', 'true');
  $('alpha').textContent = 'Stop the beam';
  $('alpha-legend').hidden = false;
  $('beam-stats').hidden = false;
  updateBeamStats();
  if (!state.playing) setPlaying(true);
  flyTo({ direction: new THREE.Vector3(0, 0.3, 1), distance: THREE.MathUtils.clamp(fitDistance(7), 13, 24) });
  readout.textContent = `${PARTICLES.alpha} Watch how each path bends as it passes the atom.`;
}
function stopBeam() {
  for (const child of [...beamGroup.children]) {
    disposeObject(child);
    beamGroup.remove(child);
  }
  beam = null;
  $('alpha').setAttribute('aria-pressed', 'false');
  $('alpha').textContent = 'Fire alpha particles';
  $('alpha-legend').hidden = true;
  $('beam-stats').hidden = true;
}
function spawnAlpha() {
  // Most aimed at random across the atom; some aimed close to the centre so
  // rare large deflections appear quickly (see the note below the explorer).
  const close = Math.random() < 0.2;
  const b = (close ? 0.25 : 2.6) * Math.sqrt(Math.random());
  const angle = Math.random() * Math.PI * 2;
  const position = new THREE.Vector3(-6, b * Math.cos(angle), b * Math.sin(angle));
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.07, 16, 12), new THREE.MeshStandardMaterial({ color: palette.alpha, emissive: palette.alpha, emissiveIntensity: 0.3 }));
  mesh.position.copy(position);
  mesh.add(glow(palette.alpha, 0.4));
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(240 * 3), 3));
  geometry.setDrawRange(0, 0);
  const trail = new THREE.Line(geometry, new THREE.LineBasicMaterial({ color: palette.alpha, transparent: true, opacity: 0.8 }));
  beamGroup.add(mesh, trail);
  beam.alphas.push({ position, velocity: new THREE.Vector3(ALPHA_SPEED, 0, 0), mesh, trail, count: 0 });
  beam.stats.fired += 1;
}
const force = new THREE.Vector3();
function stepBeam(delta) {
  if (!beam) return;
  beam.timer -= delta;
  if (beam.timer <= 0 && beam.alphas.length < 12) {
    spawnAlpha();
    beam.timer = 0.32;
  }
  for (const alpha of [...beam.alphas]) {
    let remaining = delta;
    while (remaining > 0) {
      const r = Math.max(alpha.position.length(), 0.02);
      const h = Math.min(remaining, Math.max(0.0004, 0.02 * r / ALPHA_SPEED));
      alpha.velocity.addScaledVector(alphaForce(alpha.position, force), h);
      alpha.position.addScaledVector(alpha.velocity, h);
      remaining -= h;
    }
    alpha.mesh.position.copy(alpha.position);
    const positions = alpha.trail.geometry.attributes.position;
    if (alpha.count < positions.count) {
      positions.setXYZ(alpha.count, alpha.position.x, alpha.position.y, alpha.position.z);
      alpha.count += 1;
      alpha.trail.geometry.setDrawRange(0, alpha.count);
      positions.needsUpdate = true;
      alpha.trail.geometry.computeBoundingSphere();
    }
    if (alpha.position.length() > 7.5) {
      const angle = THREE.MathUtils.radToDeg(Math.acos(THREE.MathUtils.clamp(alpha.velocity.x / alpha.velocity.length(), -1, 1)));
      if (angle > 90) beam.stats.back += 1;
      else if (angle > 10) beam.stats.deflected += 1;
      else beam.stats.straight += 1;
      disposeObject(alpha.mesh);
      beamGroup.remove(alpha.mesh);
      alpha.trail.material.opacity = angle > 10 ? 0.55 : 0.2;
      beam.history.push(alpha.trail);
      if (beam.history.length > 36) {
        const old = beam.history.shift();
        disposeObject(old);
        beamGroup.remove(old);
      }
      beam.alphas.splice(beam.alphas.indexOf(alpha), 1);
      updateBeamStats();
    }
  }
}
function updateBeamStats() {
  const { fired, straight, deflected, back } = beam.stats;
  const landed = straight + deflected + back;
  $('beam-stats').innerHTML = `<b>α fired ${fired}</b><br>Nearly straight (&lt;10°): ${straight}<br>Deflected 10–90°: ${deflected}<br>Bounced back (&gt;90°): ${back}`
    + (landed >= 20 && state.model === 'plum' ? '<br>No large deflections!' : '');
}

// ---------- True scale ----------
function setTrueScale(on) {
  state.trueScale = on;
  const button = $('true-scale');
  button.setAttribute('aria-pressed', String(on));
  button.textContent = on ? 'Show enlarged nucleus' : 'Show true scale';
  $('scale-badge').textContent = on ? 'NUCLEUS AT TRUE SCALE' : 'NOT TO SCALE';
  $('scale-badge').classList.toggle('is-true', on);
  $('scale-callout').hidden = !on;
  trueScaleMarker.visible = on;
  scaleTween = { from: nucleusScale, to: on ? TRUE_SCALE_FACTOR : 1, t: 0 };
  if (on) readout.textContent = 'TRUE SCALE · If this atom were a football stadium, the nucleus would be a pea at the centre spot. Electron markers stay enlarged so you can see them.';
  else readout.textContent = PARTICLES.nucleus;
}
function stepScale(delta) {
  if (!scaleTween || !positiveBody) return;
  scaleTween.t = reducedMotion ? 1 : Math.min(1, scaleTween.t + delta / 1.4);
  const k = ease(scaleTween.t);
  nucleusScale = Math.exp(THREE.MathUtils.lerp(Math.log(scaleTween.from), Math.log(scaleTween.to), k));
  if (!transition) positiveBody.scale.setScalar(nucleusScale);
  if (scaleTween.t >= 1) scaleTween = null;
}

// ---------- Bohr excitation ----------
const photonMaterial = new THREE.LineBasicMaterial({ transparent: true, opacity: 0.95 });
const photon = new THREE.Line(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(new Float32Array(90 * 3), 3)), photonMaterial);
photon.visible = false;
photon.frustumCulled = false;
scene.add(photon);
function drawPhoton(centre, direction, time) {
  const positions = photon.geometry.attributes.position;
  const view = camera.position.clone().sub(centre).normalize();
  const side = new THREE.Vector3().crossVectors(direction, view);
  if (side.lengthSq() < 1e-4) side.set(0, 1, 0);
  side.normalize();
  const length = 1.3;
  for (let i = 0; i < positions.count; i++) {
    const s = (i / (positions.count - 1) - 0.5) * length;
    const envelope = Math.cos(Math.PI * s / length) ** 2;
    const wave = 0.13 * envelope * Math.sin(s / length * Math.PI * 12 - time * 18);
    positions.setXYZ(i, centre.x + direction.x * s + side.x * wave, centre.y + direction.y * s + side.y * wave, centre.z + direction.z * s + side.z * wave);
  }
  positions.needsUpdate = true;
  photon.visible = true;
}
function renderEnergyDiagram(counts = [2, 4, 0], arrow = null) {
  const levels = [88, 56, 30];
  let svg = '<svg viewBox="0 0 140 100" role="img" aria-label="Energy level diagram"><text x="0" y="9">ENERGY ↑</text>';
  levels.forEach((y, level) => {
    svg += `<line class="level${level === 2 ? ' empty' : ''}" x1="34" x2="132" y1="${y}" y2="${y}"/><text x="0" y="${y + 3}">n=${level + 1}</text>`;
    for (let i = 0; i < counts[level]; i++) svg += `<circle class="dot" cx="${44 + i * 11}" cy="${y - 5}" r="3.6"/>`;
  });
  if (arrow) {
    const [y1, y2] = arrow === 'up' ? [54, 34] : [32, 52];
    svg += `<line class="transition" x1="118" x2="118" y1="${y1}" y2="${y2}"/><path class="transition-head" d="${arrow === 'up' ? 'M113 36 L118 27 L123 36Z' : 'M113 50 L118 59 L123 50Z'}"/>`;
  }
  $('energy-diagram').innerHTML = `${svg}</svg>`;
}
const EXCITE_TEXT = {
  in: 'PHOTON ABSORBED · A photon arrives with exactly the energy gap between n = 2 and n = 3.',
  up: 'ELECTRON EXCITED · It jumps straight to n = 3. It is never found between levels.',
  stay: 'EXCITED STATE · n = 3 is a higher energy level, further from the nucleus. The electron will not stay there long.',
  down: 'ELECTRON RETURNS · It drops back to the lower level, n = 2.',
  out: 'PHOTON EMITTED · The energy leaves as light of one exact colour, equal to the energy gap. This is why atoms give line spectra.'
};
function startExcite() {
  if (excite || state.model !== 'bohr') return;
  const outer = electrons.slice(2);
  const electron = outer[state.exciteIndex++ % outer.length];
  const start = electron.mesh.position.clone().normalize().multiplyScalar(5.5).applyAxisAngle(new THREE.Vector3(0, 0, 1), -0.6).add(new THREE.Vector3(0, 0, 1.5));
  excite = { phase: 0, t: 0, electron, start, ringLevel: 0, out: null };
  photonMaterial.color.copy(palette.photon);
  $('excite').disabled = true;
  $('excite').textContent = 'Exciting…';
  $('photon-legend').hidden = false;
  if (!state.playing) setPlaying(true);
  select(electron.mesh);
  enterExcitePhase();
}
function enterExcitePhase() {
  const name = EXCITE_PHASES[excite.phase][0];
  readout.textContent = EXCITE_TEXT[name];
  const diagram = { in: [[2, 4, 0], null], up: [[2, 3, 1], 'up'], stay: [[2, 3, 1], null], down: [[2, 3, 1], 'down'], out: [[2, 4, 0], null] };
  renderEnergyDiagram(...diagram[name]);
  if (name === 'out') excite.out = { from: excite.electron.mesh.position.clone(), direction: excite.electron.mesh.position.clone().normalize().add(new THREE.Vector3(0, 0, 0.6)).normalize() };
}
function stepExcite(delta) {
  if (!excite) return;
  const [name, duration] = EXCITE_PHASES[excite.phase];
  excite.t += delta;
  const k = Math.min(1, excite.t / duration);
  const electron = excite.electron;
  photon.visible = false;
  if (name === 'in') {
    excite.ringLevel = k;
    const centre = new THREE.Vector3().lerpVectors(excite.start, electron.mesh.position, k);
    drawPhoton(centre, electron.mesh.position.clone().sub(excite.start).normalize(), state.time);
  } else if (name === 'up') {
    electron.radius = THREE.MathUtils.lerp(BOHR_RADII[1], BOHR_RADII[2], ease(k));
  } else if (name === 'down') {
    electron.radius = THREE.MathUtils.lerp(BOHR_RADII[2], BOHR_RADII[1], ease(k));
  } else if (name === 'out') {
    excite.ringLevel = 1 - k;
    const centre = excite.out.from.clone().addScaledVector(excite.out.direction, 0.6 + k * 5);
    drawPhoton(centre, excite.out.direction, state.time);
  }
  applyOpacity(1);
  if (k < 1) return;
  excite.phase += 1;
  excite.t = 0;
  if (excite.phase < EXCITE_PHASES.length) {
    enterExcitePhase();
    return;
  }
  endExcite();
}
function endExcite() {
  if (excite) excite.electron.radius = BOHR_RADII[1];
  excite = null;
  photon.visible = false;
  $('excite').disabled = false;
  $('excite').textContent = 'Excite an electron';
  $('photon-legend').hidden = state.model !== 'bohr';
  renderEnergyDiagram();
  applyOpacity(1);
}

// ---------- Controls ----------
function setPlaying(playing) {
  state.playing = playing;
  const button = $('motion');
  button.setAttribute('aria-pressed', String(playing));
  $('motion-label').textContent = playing ? 'Pause motion' : 'Play motion';
  $('motion-icon').setAttribute('d', playing ? 'M7 5h3v14H7zM14 5h3v14h-3z' : 'M8 5v14l11-7z');
}
$('motion').addEventListener('click', () => setPlaying(!state.playing));
$('reset').addEventListener('click', resetView);
$('inspect').addEventListener('click', () => {
  if (state.model === 'cloud') {
    const keys = Object.keys(ORBITALS);
    state.orbitalIndex = (state.orbitalIndex + 1) % keys.length;
    state.orbitalFocus = keys[state.orbitalIndex];
    applyOpacity(1);
    readout.textContent = ORBITALS[state.orbitalFocus];
    flyTo({ direction: new THREE.Vector3(0.45, 0.7, 1), distance: [4.5, 9, 9][state.orbitalIndex] });
    return;
  }
  const electron = electrons[state.inspectIndex++ % electrons.length];
  select(electron.mesh, describe('electron'));
  const direction = electron.mesh.position.clone().normalize().add(new THREE.Vector3(0, 0.35, 0.6)).normalize();
  flyTo({ direction, distance: state.model === 'plum' ? 4.2 : 5.5 });
});
$('nucleus').addEventListener('click', () => {
  if (state.model === 'plum') {
    select(null, PARTICLES.noNucleus);
    flyTo({ distance: 1.1 });
  } else if (state.model === 'bohr') {
    select(positiveBody, PARTICLES.bohrNucleus);
    flyTo({ distance: 2.1 });
  } else if (state.model === 'cloud') {
    select(positiveBody, PARTICLES.cloudNucleus);
    flyTo({ distance: 1.6 });
  } else {
    select(state.trueScale ? null : positiveBody, describe('nucleus'));
    flyTo({ distance: state.trueScale ? 1.4 : 2.2 });
  }
});
$('alpha').addEventListener('click', () => (beam ? stopBeam() : startBeam()));
$('true-scale').addEventListener('click', () => setTrueScale(!state.trueScale));
$('excite').addEventListener('click', startExcite);
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
    Home: resetView,
    0: resetView
  };
  if (!actions[event.key]) return;
  event.preventDefault();
  actions[event.key]();
});

// ---------- Model selection ----------
const DEFAULT_READOUT = {
  plum: 'Tap a particle to discover its job.',
  rutherford: 'Tap the nucleus or an electron to discover its job.',
  bohr: 'CARBON-12 · 6 protons + 6 neutrons + 6 electrons',
  cloud: 'CARBON · 6 electrons in the 1s, 2s and 2p orbitals. Tap the nucleus or inspect an orbital.'
};
function selectModel(model, animate = true) {
  const previous = state.model;
  state.model = model;
  const data = MODELS[model];
  document.body.dataset.model = model;
  stopBeam();
  endExcite();
  if (state.trueScale) setTrueScale(false);
  scaleTween = null;
  state.orbitalFocus = null;
  state.orbitalIndex = -1;
  state.inspectIndex = 0;
  $('positive-label').textContent = data.positiveLabel;
  $('neutron-legend').hidden = model !== 'bohr';
  $('electron-legend').hidden = model === 'cloud';
  $('cloud-legend').hidden = model !== 'cloud';
  $('photon-legend').hidden = model !== 'bohr';
  $('energy-diagram').hidden = model !== 'bohr';
  $('alpha').hidden = !['plum', 'rutherford'].includes(model);
  $('true-scale').hidden = model !== 'rutherford';
  $('excite').hidden = model !== 'bohr';
  $('inspect').textContent = model === 'cloud' ? 'Inspect an orbital' : 'Inspect an electron';
  $('action-hint').textContent = data.hint;
  readout.textContent = DEFAULT_READOUT[model];
  for (const [id, key] of Object.entries({ 'scene-title': 'title', 'model-date': 'date', 'model-heading': 'heading', description: 'description', look: 'look', evidence: 'evidence' })) $(id).textContent = data[key];
  document.querySelectorAll('.models [data-model]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.model === model)));
  viewer.setAttribute('aria-label', `${data.title}. ${data.description} Drag or use arrow keys to rotate; scroll, pinch or plus and minus keys to zoom.`);
  quiz.show(model);
  if (previous !== model || !animate) resetView();
  buildAtom(animate && previous !== model);
}
document.querySelectorAll('.models [data-model]').forEach(button => button.addEventListener('click', () => {
  if (button.dataset.model !== state.model) selectModel(button.dataset.model);
}));

// ---------- Progress ----------
const progress = loadProgress();
const quiz = new Quiz($('model-quiz'), { questionSets: QUESTIONS, progress, title: '✦ Unlock this discovery', completeText: '✦ Discovery unlocked!', onChange: updateProgress });
const finalQuiz = new Quiz($('final-quiz'), { questionSets: QUESTIONS, progress, title: '✦ Final challenge', completeText: '🏆 Atom explorer!', onChange: updateProgress });
function updateProgress() {
  saveProgress(progress);
  const unlocked = MODEL_ORDER.filter(model => setSummary(progress, model, QUESTIONS[model]).complete);
  const sets = [...MODEL_ORDER, 'final'];
  const stars = sets.reduce((sum, key) => sum + setSummary(progress, key, QUESTIONS[key]).stars, 0);
  const total = sets.reduce((sum, key) => sum + QUESTIONS[key].length, 0);
  const finalDone = setSummary(progress, 'final', QUESTIONS.final).complete;
  $('progress').textContent = `${unlocked.length} / 4 discoveries unlocked · ★ ${stars} / ${total}${finalDone ? ' · Atom explorer!' : ''}`;
  document.querySelectorAll('.models [data-model]').forEach(button => {
    const done = unlocked.includes(button.dataset.model);
    button.toggleAttribute('data-unlocked', done);
    button.querySelector('span').textContent = `${button.querySelector('span').textContent.replace(' ✓', '')}${done ? ' ✓' : ''}`;
  });
  const open = unlocked.length === MODEL_ORDER.length;
  const finalQuizElement = $('final-quiz');
  if (open && finalQuizElement.hidden) finalQuiz.show('final');
  finalQuizElement.hidden = !open;
  document.querySelector('.final-challenge').classList.toggle('is-locked', !open);
  $('final-status').textContent = open
    ? 'You have explored every model. Link each change to the evidence that caused it.'
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
  applyThemeToPersistent();
  const hadBeam = Boolean(beam);
  stopBeam();
  endExcite();
  const trueScale = state.trueScale;
  buildAtom(false);
  if (trueScale) {
    nucleusScale = TRUE_SCALE_FACTOR;
    positiveBody.scale.setScalar(nucleusScale);
  }
  if (hadBeam) startBeam();
});
document.fonts?.ready.then(() => {
  // Redraw canvas labels once the mono font has loaded.
  if (state.model === 'bohr' && !transition && !excite) buildAtom(false);
});

// ---------- Rendering ----------
function resize() {
  const { width, height } = viewer.getBoundingClientRect();
  if (!width || !height) return;
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}
new ResizeObserver(resize).observe(viewer);
resize();
new IntersectionObserver(entries => { state.visible = entries[0].isIntersecting; }).observe(viewer);
renderer.domElement.addEventListener('webglcontextlost', event => {
  event.preventDefault();
  $('load-status').hidden = false;
  $('load-status').textContent = 'The 3D view was interrupted. Reload this page to restore it.';
});

renderEnergyDiagram();
setPlaying(state.playing);
updateProgress();
selectModel('plum', false);
$('load-status').hidden = true;
let previousTime = performance.now();
renderer.setAnimationLoop(frame);
function frame(time) {
  const delta = Math.min((time - previousTime) / 1000, 0.05);
  previousTime = time;
  if (!state.visible || document.hidden) return;
  if (state.playing) {
    state.time += delta;
    advanceMotion(delta);
    stepBeam(delta);
    stepExcite(delta);
  }
  positionElectrons();
  stepTransition(delta);
  stepScale(delta);
  stepCamera(delta);
  if (halo.parent) halo.material.opacity = 0.28 + 0.14 * Math.sin(time / 220);
  controls.update();
  renderer.render(scene, camera);
}
