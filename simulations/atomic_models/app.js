import * as THREE from 'three';
import { radialTexture, rgbaTexture } from '../../assets/three-textures.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { MODELS, MODEL_ORDER, PARTICLES, ORBITALS } from './content.js';
const { setMath, mathHtml, onMathReady } = window.PanPhyMath;

const $ = id => document.getElementById(id);
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const state = {
  model: 'plum',
  playing: !reducedMotion,
  time: 0,
  visible: true,
  inspectIndex: 0,
  orbitals: ['1s', '2s', '2px', '2py'],
  exciteIndex: 0
};

// Display sizes in scene units. Markers are enlarged and not to scale.
const ELECTRON_RADIUS = 0.09;
const NUCLEON_RADIUS = 0.17;
const PLUM_RADIUS = 2;
const RUTHERFORD_NUCLEUS = 0.32;
const BOHR_NUCLEUS = 0.45;
const CLOUD_NUCLEUS_SCALE = 0.6;
const BOHR_RADII = [1.0, 1.95, 2.9];
const POSITIVE_RADIUS = { plum: PLUM_RADIUS, rutherford: RUTHERFORD_NUCLEUS, bohr: BOHR_NUCLEUS, cloud: BOHR_NUCLEUS * CLOUD_NUCLEUS_SCALE };
const ALPHA_SPEED = 4;
const ALPHA_K = 1.5; // Plum pudding: the positive charge spread through the whole atom.
// Nucleus: a stronger charge screened by the electrons outside it, so the push is strong
// close in (a head-on alpha turns back about 0.45 from the center, clear of the enlarged
// nucleus and the alpha's own size) but weak further out, where most alphas pass almost
// straight through. Near the atom's edge the push matches the plum pudding's.
const NUCLEAR_K = 9;
const SCREENING = 0.5;
const TRANSITION_TIME = 1.3;
// Electron cloud: hydrogen-like orbitals. Each level has its own length scale a0/Z (its own
// effective nuclear charge), in scene units.
const ORBITAL_KEYS = ['1s', '2s', '2px', '2py', '2pz'];
const SCALE_N1 = 0.32;
const SCALE_N2 = 0.42;
const CLOUD_RADIUS = 3.4; // Dots further out than this are not drawn.
const CLOUD_CAPACITY = 12000; // The most measurements held for each orbital.
const RADIAL_BINS = 34;
const MEASURE_TIME = 1.2; // Seconds a batch of measurements takes to arrive.
const EXCITE_PHASES = [['in', 1.4], ['up', 0.6], ['stay', 1.6], ['down', 0.5], ['out', 1.4]];

const viewer = $('viewer');
const viewerPanel = $('viewer-panel');
const workspace = $('workspace');
const sideControls = $('side-controls');
const sideAside = workspace.querySelector('aside');
const wideQuery = window.matchMedia('(min-width: 900px)');
const readout = $('particle-readout');

// ---------- Fullscreen ----------
const fullscreenButton = $('fullscreen');
let fallbackFullscreen = false;
// The controls sit in their own column beside the 3D view. Wide fullscreen puts them above the
// explanation; narrow fullscreen scrolls them with the view.
function placeControls() {
  const expanded = workspace.classList.contains('is-fullscreen');
  if (expanded && wideQuery.matches) {
    if (sideControls.parentElement !== sideAside) sideAside.prepend(sideControls);
  } else if (expanded) {
    if (sideControls.parentElement !== viewerPanel) viewerPanel.append(sideControls);
  } else if (sideControls.nextElementSibling !== sideAside) {
    workspace.insertBefore(sideControls, sideAside);
  }
}
wideQuery.addEventListener('change', placeControls);
function updateFullscreen() {
  const expanded = document.fullscreenElement === workspace || fallbackFullscreen;
  workspace.classList.toggle('is-fullscreen', expanded);
  placeControls();
  document.body.classList.toggle('viewer-expanded', expanded);
  fullscreenButton.classList.toggle('is-fullscreen', expanded);
  fullscreenButton.setAttribute('aria-label', expanded ? 'Exit fullscreen' : 'Enter fullscreen');
  fullscreenButton.title = expanded ? 'Exit fullscreen' : 'Enter fullscreen';
  fullscreenButton.querySelector('path').setAttribute('d', expanded
    ? 'M20 4l-6 6M14 5.5V10h4.5M4 20l6-6M10 18.5V14H5.5'
    : 'M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5');
  fullscreenButton.setAttribute('aria-pressed', String(expanded));
  fullscreenButton.focus({ preventScroll: true });
}
fullscreenButton.addEventListener('click', async () => {
  if (document.fullscreenElement === workspace) {
    await document.exitFullscreen();
  } else if (fallbackFullscreen) {
    fallbackFullscreen = false;
    updateFullscreen();
  } else {
    try {
      await workspace.requestFullscreen();
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
const renderer = new THREE.WebGLRenderer({ antialias: true });
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
// The wheel zooms only once the model has been clicked (or in fullscreen), so it never traps page scrolling.
viewer.addEventListener('wheel', event => {
  if (!(workspace.classList.contains('is-fullscreen') || event.ctrlKey || document.activeElement === viewer)) event.stopPropagation();
}, { capture: true, passive: true });
renderer.domElement.addEventListener('pointerdown', () => viewer.focus({ preventScroll: true }));
const atom = new THREE.Group();
scene.add(atom);
const beamGroup = new THREE.Group();
scene.add(beamGroup);

// Blend glows and shadows against the viewer color, not a transparent canvas.
let palette = readPalette();
scene.background = palette.background;
let electrons = [];
let trails = [];
let pickables = [];
let fadeables = [];
let buildTextures = [];
let positiveBody = null;
let cloud = null;
let cloudKeep = null;
let cloudFlash = null;
let measure = null;
let bohrRings = [];
let transition = null;
let cameraTween = null;
let beam = null;
let excite = null;
// Rutherford view with the beam on: the view zooms in on the nucleus, so the electrons and
// their orbit guides grow together and pass out of view, since at the nucleus's drawn size
// they would really be hundreds of meters away. t runs 0 → 1.
const spread = { t: 0, target: 0 };
const SPREAD_TIME = 3;
const ZOOM_FACTOR = 6; // How much the electron system grows by the end of the zoom.
let zoomRings = [];
function spreadScale() {
  // Geometric growth reads as a steady zoom rather than a push outward.
  return reducedMotion ? 1 : ZOOM_FACTOR ** ease(spread.t);
}
function spreadOpacity() {
  // Stay solid until the electrons near the edge of the view, then fade.
  return 1 - THREE.MathUtils.smoothstep(ease(spread.t), reducedMotion ? 0 : 0.35, 1);
}

function readPalette() {
  const styles = getComputedStyle(document.documentElement);
  const color = name => new THREE.Color(styles.getPropertyValue(name).trim());
  return {
    dark: document.documentElement.getAttribute('data-theme') === 'dark',
    background: color('--viewer-bg'),
    electron: color('--electron'),
    positive: color('--positive'),
    proton: color('--proton'),
    neutron: color('--neutron'),
    alpha: color('--alpha'),
    deflected: color('--alpha-deflected'),
    photon: color('--photon'),
    line: color('--text-secondary'),
    accent: color('--scene-accent'),
    primary: color('--brand-primary'),
    orbitals: Object.fromEntries(ORBITAL_KEYS.map(key => [key, color(`--orbital-${key}`)]))
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
const glowTexture = radialTexture(THREE, 128, [[0, 1], [0.35, 0.45], [1, 0]]);
const dotTexture = radialTexture(THREE, 64, [[0, 1], [0.5, 0.8], [1, 0]]);
const plusTexture = rgbaTexture(THREE, 64, 64, (x, y) => {
  const vertical = x >= 26 && x < 38 && y >= 10 && y < 54;
  const horizontal = x >= 10 && x < 54 && y >= 26 && y < 38;
  return [255, 255, 255, vertical || horizontal ? 255 : 0];
});
const shadowTexture = radialTexture(THREE, 128, [[0, 0.55], [1, 0]], [0, 0, 0]);

// A sphere texture with a charge symbol repeated around it.
function symbolTexture(background, symbol) {
  return canvasTexture(256, 128, (ctx, w, h) => {
    ctx.fillStyle = `#${background.getHexString()}`;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.font = '700 54px Figtree, system-ui, sans-serif';
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
const FLOOR_Y = -2.9;
floorShadow.position.y = FLOOR_Y;
floorShadow.raycast = () => {};
scene.add(floorShadow);
function zoomShadow(scale = 1, opacity = 1) {
  // During the Rutherford zoom the floor drops away and the shadow grows with the electrons.
  floorShadow.scale.setScalar(scale);
  floorShadow.position.y = FLOOR_Y * scale;
  floorShadow.material.opacity = (palette.dark ? 0.7 : 0.25) * opacity;
}
const halo = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.35, side: THREE.BackSide, depthWrite: false }));
halo.raycast = () => {};
function applyThemeToPersistent() {
  zoomShadow();
  halo.material.color.copy(palette.accent);
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
  spread.t = 0;
  zoomRings = [];
  zoomShadow();
  positiveBody = null;
  cloud = null;
  cloudFlash = null;
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
    // Rutherford gave no direction, so the middle path runs the other way.
    electrons.push({ mesh, radius, angle: i * Math.PI / 3, tilt, speed: i % 3 === 1 ? -0.6 : 0.6 });
    pickables.push({ object: mesh, kind: 'electron' });
    // Each path is shared by two electrons on opposite sides: illustrative, not quantized.
    if (i < 3) ring(radius, palette.line, 0.5, tilt);
  }
  // The boundary and orbit guides fade out with the electrons when the beam is on.
  for (const material of fadeables) material.userData.spread = true;
  zoomRings = atom.children.filter(child => child.isLine);
}

function bohrSpeed(radius) {
  // Bohr: orbital speed falls as 1/n, so outer electrons move more slowly.
  return 1.1 * BOHR_RADII[0] / radius;
}
function buildNucleus(scale, kind) {
  // Carbon-12: twelve nucleons settled into a compact, slightly irregular cluster.
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
  const center = points.reduce((sum, point) => sum.add(point), new THREE.Vector3()).divideScalar(points.length);
  const kinds = ['proton', 'neutron', 'proton', 'proton', 'neutron', 'neutron', 'proton', 'neutron', 'proton', 'neutron', 'neutron', 'proton'];
  const nucleus = new THREE.Group();
  nucleus.userData.radius = 0.5;
  nucleus.userData.kind = kind;
  nucleus.scale.setScalar(scale);
  nucleus.userData.baseScale = scale;
  const textures = { proton: symbolTexture(palette.proton, '+'), neutron: symbolTexture(palette.neutron, '0') };
  points.forEach((point, i) => {
    const mesh = sphere(NUCLEON_RADIUS, palette[kinds[i]], { map: textures[kinds[i]] });
    mesh.position.copy(point.sub(center));
    mesh.rotation.y = i * 0.9;
    mesh.userData.kind = kinds[i];
    nucleus.add(mesh);
    pickables.push({ object: mesh, kind: kinds[i] });
  });
  atom.add(nucleus);
  positiveBody = nucleus;
}
function buildBohr() {
  buildNucleus(1, 'bohrNucleus');
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

// ---------- Electron cloud ----------
// Hydrogen-like orbital sampling (radial probability × angular shape).
function gamma(shape, scale) {
  let product = 1;
  for (let i = 0; i < shape; i++) product *= 1 - Math.random();
  return -scale * Math.log(product);
}
function sampleP(axis) {
  for (;;) {
    const direction = randomDirection();
    const c = direction.dot(axis);
    if (Math.random() < c * c) return direction.multiplyScalar(gamma(5, SCALE_N2));
  }
}
function radial2p(r) {
  const x = r / SCALE_N2;
  return x ** 4 * Math.exp(-x) / (24 * SCALE_N2);
}
// For each orbital: its electrons in ground-state carbon, the dots drawn in the full cloud, a
// sampler, the radial probability P(r) (area 1) and the most likely distance.
const ORBITAL_SPECS = {
  '1s': {
    name: '1s', electrons: 2, base: 1800,
    sample: () => randomDirection().multiplyScalar(gamma(3, SCALE_N1 / 2)),
    radial: r => 4 * r * r * Math.exp(-2 * r / SCALE_N1) / SCALE_N1 ** 3,
    peak: SCALE_N1
  },
  '2s': {
    name: '2s', electrons: 2, base: 2600,
    sample: () => {
      for (;;) {
        const x = Math.random() * 14;
        if (Math.random() * 1.6 < x * x * (2 - x) * (2 - x) * Math.exp(-x)) return randomDirection().multiplyScalar(x * SCALE_N2);
      }
    },
    radial: r => {
      const x = r / SCALE_N2;
      return x * x * (2 - x) * (2 - x) * Math.exp(-x) / (8 * SCALE_N2);
    },
    peak: SCALE_N2 * (3 + Math.sqrt(5))
  },
  '2px': { name: '2px', electrons: 1, base: 1800, sample: () => sampleP(new THREE.Vector3(1, 0, 0)), radial: radial2p, peak: 4 * SCALE_N2 },
  '2py': { name: '2py', electrons: 1, base: 1800, sample: () => sampleP(new THREE.Vector3(0, 1, 0)), radial: radial2p, peak: 4 * SCALE_N2 },
  '2pz': { name: '2pz', electrons: 0, base: 1800, sample: () => sampleP(new THREE.Vector3(0, 0, 1)), radial: radial2p, peak: 4 * SCALE_N2 }
};
function sampleOrbital(key) {
  for (;;) {
    const point = ORBITAL_SPECS[key].sample();
    if (point.length() < CLOUD_RADIUS) return point;
  }
}
function buildCloud() {
  // Smaller than in the Bohr view so the 1s cloud around it stays visible.
  buildNucleus(CLOUD_NUCLEUS_SCALE, 'cloudNucleus');
  // A theme change rebuilds the scene; the dots and any measurements carry over.
  const kept = cloudKeep;
  cloudKeep = null;
  cloud = ORBITAL_KEYS.map((key, index) => {
    const old = kept?.[index];
    const array = old ? old.array : new Float32Array(CLOUD_CAPACITY * 3);
    if (!old) for (let i = 0; i < CLOUD_CAPACITY; i++) sampleOrbital(key).toArray(array, i * 3);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(array, 3));
    geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), CLOUD_RADIUS);
    const material = fade(new THREE.PointsMaterial({ color: palette.orbitals[key], map: dotTexture, size: 0.1, transparent: true, opacity: palette.dark ? 0.75 : 0.6, depthWrite: false, blending: palette.dark ? THREE.AdditiveBlending : THREE.NormalBlending }));
    const points = new THREE.Points(geometry, material);
    points.raycast = () => {};
    atom.add(points);
    return { key, points, array, measured: old ? old.measured : 0, bins: old ? old.bins : new Uint32Array(RADIAL_BINS) };
  });
  cloudFlash = glow(palette.line, 0.8);
  cloudFlash.visible = false;
  atom.add(cloudFlash);
  pickables.push({ object: atom, kind: 'cloud', background: true, radius: 2.8 });
  syncCloud();
}
// The orbitals that hold electrons in ground-state carbon: the choice "All".
const OCCUPIED_KEYS = ORBITAL_KEYS.filter(key => ORBITAL_SPECS[key].electrons);
function shownOrbitals() {
  return state.orbitals;
}
function occupiedShown() {
  return state.orbitals.filter(key => ORBITAL_SPECS[key].electrons);
}
// 'all', the key of a single orbital, or null for any other combination.
function selectionName() {
  const shown = state.orbitals;
  if (shown.length === 1) return shown[0];
  return shown.length === OCCUPIED_KEYS.length && !shown.includes('2pz') ? 'all' : null;
}
const ORBITAL_TEX = { '1s': '\\(\\mathrm{1s}\\)', '2s': '\\(\\mathrm{2s}\\)', '2px': '\\(\\mathrm{2p}_x\\)', '2py': '\\(\\mathrm{2p}_y\\)', '2pz': '\\(\\mathrm{2p}_z\\)' };
function orbitalText() {
  const name = selectionName();
  if (name) return ORBITALS[name];
  const shown = state.orbitals;
  const electrons = shown.reduce((sum, key) => sum + ORBITAL_SPECS[key].electrons, 0);
  const empty = shown.includes('2pz') ? ' The gray dots show the empty \\(\\mathrm{2p}_z\\) orbital: no electron is measured there.' : '';
  return `${shown.map(key => ORBITAL_TEX[key]).join(' + ')} · ${electrons} electron${electrons === 1 ? '' : 's'} · Each color is one orbital. Compare their sizes and shapes. The graph adds their \\(P(r)\\) curves, weighted by the electrons in each.${empty}`;
}
function measuredCount() {
  return cloud.reduce((sum, item) => sum + (shownOrbitals().includes(item.key) ? item.measured : 0), 0);
}
// Bring the dots, the controls, the legend and the graph into line with the current choices.
function syncCloud() {
  if (!cloud) return;
  const shown = shownOrbitals();
  const name = selectionName();
  const total = measure ? measuredCount() : 0;
  for (const item of cloud) {
    item.points.visible = shown.includes(item.key);
    // An empty orbital has nothing to measure, so its dots always show where an electron would be.
    const measuring = measure && ORBITAL_SPECS[item.key].electrons > 0;
    item.points.geometry.setDrawRange(0, measuring ? item.measured : ORBITAL_SPECS[item.key].base);
    // The first few results are drawn larger so that a single dot can be found.
    item.points.material.size = measuring ? THREE.MathUtils.clamp(0.2 - 0.05 * Math.log10(Math.max(total, 1)), 0.1, 0.2) : 0.1;
  }
  const occupied = occupiedShown().length;
  const full = !occupied || total + (measure ? measure.pending : 0) >= [10000, 15000, 20000][Math.min(occupied, 3) - 1];
  $('measure').disabled = full;
  document.querySelectorAll('[data-measure]').forEach(button => { button.disabled = full; });
  $('full-cloud').disabled = !measure;
  $('measure-count').textContent = measure && occupied ? `N = ${total.toLocaleString('en-US')}` : '';
  document.querySelectorAll('[data-orbital]').forEach(button => button.setAttribute('aria-pressed', String(name === 'all' ? button.dataset.orbital === 'all' : shown.includes(button.dataset.orbital))));
  document.querySelectorAll('[data-orbital-chip]').forEach(chip => { chip.hidden = !shown.includes(chip.dataset.orbitalChip); });
  renderRadialGraph();
}
// The graph of P(r): the theory as a curve and, while measuring, the results as bars.
function renderRadialGraph() {
  const shown = shownOrbitals();
  // Curves are weighted by electrons; an empty orbital is drawn only when it is shown alone.
  const weights = shown.map(key => ORBITAL_SPECS[key].electrons || (occupiedShown().length ? 0 : 1));
  const weightSum = weights.reduce((sum, weight) => sum + weight, 0);
  const curve = r => shown.reduce((sum, key, i) => sum + weights[i] * ORBITAL_SPECS[key].radial(r), 0) / weightSum;
  const [left, right, base, top] = [8, 194, 104, 22];
  const steps = 93;
  const values = Array.from({ length: steps + 1 }, (_, i) => curve(i / steps * CLOUD_RADIUS));
  const peak = Math.max(...values) * 1.12;
  const px = r => left + r / CLOUD_RADIUS * (right - left);
  const py = value => base - Math.min(value / peak, 1) * (base - top);
  const path = list => list.map((value, i) => `${i ? 'L' : 'M'}${px(i / steps * CLOUD_RADIUS).toFixed(1)} ${py(value).toFixed(1)}`).join('');
  const single = shown.length === 1 ? shown[0] : null;
  const color = single ? `var(--orbital-${single})` : 'var(--text-main)';
  const name = single ? `the ${ORBITAL_SPECS[single].name} orbital` : selectionName() === 'all' ? 'all six electrons' : `the ${occupiedShown().map(key => ORBITAL_SPECS[key].name).join(', ')} orbitals`;
  let svg = `<svg viewBox="0 0 200 122" role="img" aria-label="Graph of radial probability against distance from the nucleus, for ${name}"><text x="${left}" y="10">RADIAL PROBABILITY <tspan class="symbol">P</tspan>(<tspan class="symbol">r</tspan>)</text>`;
  const total = measure ? measuredCount() : 0;
  if (total) {
    const bins = new Float64Array(RADIAL_BINS);
    for (const item of cloud) if (shown.includes(item.key)) item.bins.forEach((count, i) => { bins[i] += count; });
    const width = (right - left) / RADIAL_BINS;
    bins.forEach((count, i) => {
      if (!count) return;
      const y = py(count / (total * CLOUD_RADIUS / RADIAL_BINS));
      svg += `<rect class="bar" style="fill:${color}" x="${(left + i * width + 0.4).toFixed(1)}" y="${y.toFixed(1)}" width="${(width - 0.8).toFixed(1)}" height="${(base - y).toFixed(1)}"/>`;
    });
  }
  if (!single) {
    // The separate orbitals under the total; the two 2p curves are the same, so one is drawn.
    shown.forEach((key, i) => {
      if (!weights[i] || (key === '2py' && shown.includes('2px'))) return;
      svg += `<path class="part" style="stroke:var(--orbital-${key})" d="${path(values.map((_, j) => weights[i] * ORBITAL_SPECS[key].radial(j / steps * CLOUD_RADIUS) / weightSum))}"/>`;
    });
  }
  svg += `<path class="curve" style="stroke:${color}" d="${path(values)}"/><line class="axis" x1="${left}" x2="${right}" y1="${base}" y2="${base}"/><line class="axis" x1="${left}" x2="${left}" y1="${top}" y2="${base}"/>`;
  svg += `<text x="${left}" y="117">0</text><text x="${right}" y="117" text-anchor="end">distance from nucleus <tspan class="symbol">r</tspan> →</text>`;
  $('radial-graph').innerHTML = `${svg}</svg>`;
}
function measureText(total) {
  const count = total.toLocaleString('en-US');
  if (total === 1) return `MEASUREMENT 1 · An electron was found here. The theory cannot say where the next result will be: only how likely each place is. Measure again.`;
  if (total < 50) return `${count} MEASUREMENTS · Each dot is one result, each on a freshly prepared atom. No path joins them. Add more with +100 and +1000.`;
  return `${count} MEASUREMENTS · Single results cannot be predicted, but the pattern can: the dots build the cloud, and the bars on the graph approach the curve \\(P(r)\\).`;
}
function takeMeasurement() {
  const items = cloud.filter(item => shownOrbitals().includes(item.key) && item.measured < CLOUD_CAPACITY);
  // Any of the electrons shown may be the one that is found.
  let pick = Math.random() * items.reduce((sum, item) => sum + ORBITAL_SPECS[item.key].electrons, 0);
  const item = items.find(entry => (pick -= ORBITAL_SPECS[entry.key].electrons) < 0);
  if (!item) return null;
  const point = sampleOrbital(item.key);
  point.toArray(item.array, item.measured * 3);
  item.measured += 1;
  item.bins[Math.min(RADIAL_BINS - 1, Math.floor(point.length() / CLOUD_RADIUS * RADIAL_BINS))] += 1;
  item.points.geometry.attributes.position.needsUpdate = true;
  return { item, point };
}
function addMeasurements(count) {
  if (!cloud || !occupiedShown().length) return;
  if (!measure) {
    // Start from an empty atom: the cloud is what the results build.
    measure = { pending: 0, rate: 0, flash: 0 };
    for (const item of cloud) {
      item.measured = 0;
      item.bins.fill(0);
    }
  }
  select(null);
  if (count === 1 || reducedMotion) {
    let last = null;
    for (let i = 0; i < count; i++) last = takeMeasurement() || last;
    if (last && count === 1) {
      cloudFlash.position.copy(last.point);
      cloudFlash.material.color.copy(palette.orbitals[last.item.key]);
      cloudFlash.visible = true;
      measure.flash = 1;
    }
    setMath(readout, measureText(measuredCount()));
  } else {
    measure.pending += count;
    measure.rate = measure.pending / MEASURE_TIME;
  }
  syncCloud();
}
function showFullCloud() {
  if (!measure) return;
  measure = null;
  cloudFlash.visible = false;
  setMath(readout, orbitalText());
  syncCloud();
}
function stepCloud(delta) {
  if (!cloud) return;
  if (!measure) return;
  if (measure.pending > 0) {
    const batch = Math.min(measure.pending, Math.max(1, Math.round(measure.rate * delta)));
    for (let i = 0; i < batch; i++) takeMeasurement();
    measure.pending -= batch;
    if (measure.pending <= 0) setMath(readout, measureText(measuredCount()));
    syncCloud();
  }
  if (measure.flash > 0) {
    // A fading ring of light marks the latest result.
    measure.flash = Math.max(0, measure.flash - delta / 1.6);
    cloudFlash.scale.setScalar(THREE.MathUtils.lerp(0.35, 0.9, measure.flash));
    cloudFlash.material.opacity = (palette.dark ? 0.9 : 0.6) * measure.flash;
    cloudFlash.visible = measure.flash > 0;
  }
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
    if (material.userData.spread) factor *= spreadOpacity();
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
  if (positiveBody) positiveBody.scale.setScalar(THREE.MathUtils.lerp(transition.startScale, 1, k) * (positiveBody.userData.baseScale || 1));
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
  if (cloud && !measure) {
    // Replace a fraction of the dots each frame: positions are probabilities, not tracks.
    // Measured results stay where they were found.
    for (const { key, points } of cloud) {
      if (!points.visible) continue;
      const positions = points.geometry.attributes.position;
      const count = points.geometry.drawRange.count;
      const swaps = Math.ceil(count * 0.5 * delta);
      for (let i = 0; i < swaps; i++) {
        const index = Math.floor(Math.random() * count);
        const point = sampleOrbital(key);
        positions.setXYZ(index, point.x, point.y, point.z);
      }
      positions.clearUpdateRanges();
      positions.addUpdateRange(0, count * 3);
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
    const outward = electron.bohr ? 1 : spreadScale();
    orbitPosition(electron.radius * outward, electron.angle, electron.tilt, electron.mesh.position);
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
}

// ---------- Selection and picking ----------
function select(object, text) {
  halo.removeFromParent();
  if (object) {
    const radius = object.userData.radius || 0.2;
    halo.scale.setScalar(radius * 1.55 + 0.04);
    object.add(halo);
  }
  if (text) setMath(readout, text);
}
function describe(kind) {
  switch (kind) {
    case 'electron': return state.model === 'plum' ? PARTICLES.plumElectron : PARTICLES.electron;
    case 'cloud': return orbitalText();
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
    if (!item.object.visible) continue;
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
  const screen = Math.exp(-r / SCREENING) * (1 + r / SCREENING);
  return target.copy(position).multiplyScalar(NUCLEAR_K * screen / (soft * Math.sqrt(soft)));
}
const BEAM_RADIUS = 4; // Wider than the atom, so nearly all of the beam (about 95%) passes almost straight.
// In the nuclear views, one extra alpha is quietly aimed close to the nucleus now and
// then. With an even beam a bounce-back is uncommon, so without these shots a student
// could watch for a while before seeing one. They are drawn exactly like the rest of the beam
// on purpose: the sim illustrates the idea (a tiny, dense nucleus can turn an alpha back),
// not the real rates, so there is no need to point the extra shots out. Their entry points
// are spread over a small disk so they scatter in different directions (some bounce back,
// some turn sharply) instead of retracing one path. The plum pudding view needs none: the
// even beam already shows every alpha passing almost straight through.
const AIMED_INTERVAL = 8; // Seconds between the extra shots.
const AIMED_RADIUS = 0.43; // About 40% of these come within the >90° bounce-back range.
const TRAIL_SAMPLE = 1 / 60; // Seconds between trail points, whatever the display's frame rate.
// While the beam runs, one message says both what is hidden and what to watch.
const RUTHERFORD_BEAM = `${PARTICLES.farElectrons} Watch: most alpha particles pass straight through, but a few pass close to the nucleus and are deflected or bounce back.`;
function startBeam() {
  stopBeam();
  beam = { alphas: [], history: [], backHistory: [], timer: 0, aimTimer: 1.5 };
  $('alpha').setAttribute('aria-pressed', 'true');
  $('alpha').textContent = 'Stop the beam';
  $('alpha-legend').hidden = false;
  $('deflected-legend').hidden = state.model === 'plum';
  if (!state.playing) setPlaying(true);
  flyTo({ direction: new THREE.Vector3(0, 0.3, 1), distance: THREE.MathUtils.clamp(fitDistance(7), 15, 24) });
  setMath(readout, state.model === 'plum'
    ? 'ALPHA BEAM · The alpha particles arrive from the left as a wide, parallel beam. Spread-out positive charge only nudges them: they all pass almost straight through.'
    : `${PARTICLES.alpha} They arrive from the left as a wide, parallel beam.`);
  if (state.model === 'rutherford') {
    select(null);
    spread.target = 1;
    $('electron-legend').hidden = true;
    setMath(readout, RUTHERFORD_BEAM);
  }
}
function stepSpread(delta) {
  if (spread.t === spread.target) return;
  const step = delta / SPREAD_TIME;
  spread.t = spread.target > spread.t ? Math.min(spread.target, spread.t + step) : Math.max(spread.target, spread.t - step);
  applySpread();
}
function applySpread() {
  const scale = spreadScale();
  const opacity = spreadOpacity();
  for (const { mesh } of electrons) {
    mesh.scale.setScalar(scale);
    const fading = opacity < 1;
    if (mesh.material.transparent !== fading) {
      mesh.material.transparent = fading;
      mesh.material.needsUpdate = true;
    }
    mesh.material.opacity = opacity;
    const glowSprite = mesh.children[0];
    glowSprite.userData.base ??= glowSprite.material.opacity;
    glowSprite.material.opacity = glowSprite.userData.base * opacity;
    mesh.visible = opacity > 0;
  }
  for (const line of zoomRings) line.scale.setScalar(scale);
  zoomShadow(scale, opacity);
  if (!transition) applyOpacity(1);
}
function stopBeam() {
  for (const child of [...beamGroup.children]) {
    disposeObject(child);
    beamGroup.remove(child);
  }
  beam = null;
  spread.target = 0;
  $('electron-legend').hidden = state.model === 'cloud';
  if (readout.textContent === RUTHERFORD_BEAM) setMath(readout, DEFAULT_READOUT[state.model]);
  $('alpha').setAttribute('aria-pressed', 'false');
  $('alpha').textContent = 'Fire alpha particles';
  $('alpha-legend').hidden = true;
  $('deflected-legend').hidden = true;
}
function randomEntry(radius) {
  // Uniform over the beam's cross-section, as when the beam is far wider than an atom.
  const b = radius * Math.sqrt(Math.random());
  const angle = Math.random() * Math.PI * 2;
  return new THREE.Vector3(-6, b * Math.cos(angle), b * Math.sin(angle));
}
// In a 3D beam, alphas passing far in front of or behind the nucleus can look as if they go
// straight through it undeflected. In the nuclear views an alpha whose line of approach
// appears on screen to cross the nucleus is faded by how far it really lies in front of or
// behind it, so only paths that truly pass close are drawn at full strength over it. Paths
// that visibly pass above or below the nucleus are left alone.
const DEPTH_CLEAR = 0.3; // Depth offsets up to this stay at full strength.
const DEPTH_FADE = 1.2; // Extra depth over which a path fades to its minimum.
const DEPTH_MIN = 0.15;
const SCREEN_NEAR = 0.4; // On-screen offsets up to this appear to cross the nucleus.
const SCREEN_CLEAR = 0.9; // Beyond this on-screen offset a path is never faded.
const viewDirection = new THREE.Vector3();
function depthFade(offset) {
  if (state.model === 'plum') return 1;
  const depth = Math.abs(offset.dot(viewDirection));
  const onScreen = Math.sqrt(Math.max(0, offset.lengthSq() - depth * depth));
  const overlap = THREE.MathUtils.clamp((SCREEN_CLEAR - onScreen) / (SCREEN_CLEAR - SCREEN_NEAR), 0, 1);
  const byDepth = THREE.MathUtils.clamp(1 - (depth - DEPTH_CLEAR) / DEPTH_FADE, DEPTH_MIN, 1);
  return 1 - overlap * (1 - byDepth);
}
function applyDepthFade() {
  viewDirection.subVectors(camera.position, controls.target).normalize();
  for (const alpha of beam.alphas) {
    const fadeFactor = depthFade(alpha.offset);
    alpha.trail.material.opacity = fadeFactor;
    alpha.mesh.material.opacity = fadeFactor;
    alpha.mesh.children[0].material.opacity = alpha.glowBase * fadeFactor;
  }
  for (const trail of [...beam.history, ...beam.backHistory]) trail.material.opacity = depthFade(trail.userData.offset);
}
function spawnAlpha(aimed) {
  // Extra shots enter near the axis; otherwise they look and behave like any other alpha.
  const position = randomEntry(aimed ? AIMED_RADIUS : BEAM_RADIUS);
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.07, 16, 12), new THREE.MeshStandardMaterial({ color: palette.alpha, emissive: palette.alpha, emissiveIntensity: 0.3, transparent: true }));
  mesh.position.copy(position);
  mesh.add(glow(palette.alpha, 0.4));
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(240 * 3), 3));
  // RGBA per point: the path changes color once the alpha has been turned, and finished
  // paths fade their incoming leg separately from the outgoing one.
  geometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(240 * 4), 4));
  geometry.setDrawRange(0, 0);
  const material = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true });
  const trail = new THREE.Line(geometry, material);
  // The sideways offset of the line of approach, used for the depth fade.
  trail.userData.offset = new THREE.Vector3(0, position.y, position.z);
  beamGroup.add(mesh, trail);
  beam.alphas.push({ position, velocity: new THREE.Vector3(ALPHA_SPEED, 0, 0), mesh, trail, offset: trail.userData.offset, glowBase: mesh.children[0].material.opacity, count: 0, turnedAt: -1, sampleTimer: 0 });
}
const TURNED_ANGLE = 20; // Degrees: beyond this the path is drawn in the deflected color.
function fadeTrail(alpha, incoming, outgoing) {
  const colors = alpha.trail.geometry.attributes.color;
  for (let i = 0; i < alpha.count; i += 1) {
    colors.setW(i, alpha.turnedAt >= 0 && i >= alpha.turnedAt ? outgoing : incoming);
  }
  colors.needsUpdate = true;
}
const force = new THREE.Vector3();
function integrate(position, velocity, duration, maxStep) {
  let remaining = duration;
  while (remaining > 0) {
    const r = Math.max(position.length(), 0.02);
    const h = Math.min(remaining, Math.max(0.0004, maxStep * r / ALPHA_SPEED));
    velocity.addScaledVector(alphaForce(position, force), h);
    position.addScaledVector(velocity, h);
    remaining -= h;
  }
}
function deflection(velocity) {
  return THREE.MathUtils.radToDeg(Math.acos(THREE.MathUtils.clamp(velocity.x / velocity.length(), -1, 1)));
}
function keepPath(list, line, limit) {
  list.push(line);
  if (list.length > limit) {
    const old = list.shift();
    disposeObject(old);
    beamGroup.remove(old);
  }
}
function stepBeam(delta) {
  if (!beam) return;
  // In the Rutherford view, fire only once the electrons have zoomed fully out of view.
  if (state.model === 'rutherford' && spread.t < 1) return;
  beam.timer -= delta;
  beam.aimTimer -= delta;
  if (beam.timer <= 0 && beam.alphas.length < 28) {
    spawnAlpha(false);
    beam.timer = 0.135; // Keeps the beam as dense as before over its wider cross-section.
  }
  if (beam.aimTimer <= 0) {
    if (state.model !== 'plum') spawnAlpha(true);
    beam.aimTimer = AIMED_INTERVAL;
  }
  for (const alpha of [...beam.alphas]) {
    integrate(alpha.position, alpha.velocity, delta, 0.02);
    alpha.mesh.position.copy(alpha.position);
    const { position: positions, color: colors } = alpha.trail.geometry.attributes;
    // Sampling by time, not per frame, so 120 Hz displays do not fill the trail halfway.
    alpha.sampleTimer -= delta;
    if (alpha.count < positions.count && alpha.sampleTimer <= 0) {
      alpha.sampleTimer += TRAIL_SAMPLE;
      if (alpha.turnedAt < 0 && deflection(alpha.velocity) > TURNED_ANGLE) alpha.turnedAt = alpha.count;
      const shade = alpha.turnedAt >= 0 ? palette.deflected : palette.alpha;
      positions.setXYZ(alpha.count, alpha.position.x, alpha.position.y, alpha.position.z);
      colors.setXYZW(alpha.count, shade.r, shade.g, shade.b, 0.8);
      alpha.count += 1;
      alpha.trail.geometry.setDrawRange(0, alpha.count);
      positions.needsUpdate = true;
      colors.needsUpdate = true;
      alpha.trail.geometry.computeBoundingSphere();
    }
    if (alpha.position.length() > 7.5) {
      const angle = deflection(alpha.velocity);
      disposeObject(alpha.mesh);
      beamGroup.remove(alpha.mesh);
      // Deflected paths keep a clear outgoing leg but only a faint incoming one, so the
      // incoming legs of shots near the nucleus do not stack up into a dense central beam.
      if (angle > TURNED_ANGLE) fadeTrail(alpha, 0.1, angle > 90 ? 0.75 : 0.4);
      else fadeTrail(alpha, 0.3, 0.3);
      // Rare bounce-backs are kept separately so common paths never push them off screen.
      keepPath(angle > 90 ? beam.backHistory : beam.history, alpha.trail, angle > 90 ? 4 : 60);
      beam.alphas.splice(beam.alphas.indexOf(alpha), 1);
    }
  }
}

// ---------- Bohr excitation ----------
// WebGL ignores line widths, so photon waves are drawn as a thin ribbon facing the camera.
const WAVE_POINTS = 90;
const WAVE_HALF_WIDTH = 0.008;
function waveRibbonGeometry() {
  const geometry = new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(new Float32Array(WAVE_POINTS * 2 * 3), 3));
  const index = [];
  for (let i = 0; i < WAVE_POINTS - 1; i++) {
    const a = i * 2;
    index.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
  }
  geometry.setIndex(index);
  return geometry;
}
function setWaveRibbon(geometry, points, view) {
  const positions = geometry.attributes.position;
  const tangent = new THREE.Vector3();
  const normal = new THREE.Vector3();
  for (let i = 0; i < points.length; i++) {
    tangent.subVectors(points[Math.min(i + 1, points.length - 1)], points[Math.max(i - 1, 0)]);
    normal.crossVectors(tangent, view);
    if (normal.lengthSq() < 1e-10) normal.set(0, 1, 0);
    normal.normalize().multiplyScalar(WAVE_HALF_WIDTH);
    const p = points[i];
    positions.setXYZ(i * 2, p.x + normal.x, p.y + normal.y, p.z + normal.z);
    positions.setXYZ(i * 2 + 1, p.x - normal.x, p.y - normal.y, p.z - normal.z);
  }
  positions.needsUpdate = true;
}
const wavePoints = Array.from({ length: WAVE_POINTS }, () => new THREE.Vector3());
const photonMaterial = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.95, side: THREE.DoubleSide });
const photon = new THREE.Mesh(waveRibbonGeometry(), photonMaterial);
photon.visible = false;
photon.frustumCulled = false;
scene.add(photon);
function drawPhoton(center, direction, time) {
  const view = camera.position.clone().sub(center).normalize();
  const side = new THREE.Vector3().crossVectors(direction, view);
  if (side.lengthSq() < 1e-4) side.set(0, 1, 0);
  side.normalize();
  const length = 1.3;
  for (let i = 0; i < WAVE_POINTS; i++) {
    const s = (i / (WAVE_POINTS - 1) - 0.5) * length;
    const envelope = Math.cos(Math.PI * s / length) ** 2;
    const wave = 0.13 * envelope * Math.sin(s / length * Math.PI * 12 - time * 18);
    wavePoints[i].set(center.x + direction.x * s + side.x * wave, center.y + direction.y * s + side.y * wave, center.z + direction.z * s + side.z * wave);
  }
  setWaveRibbon(photon.geometry, wavePoints, view);
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
  out: 'PHOTON EMITTED · The energy leaves as light of one exact color, equal to the energy gap. This is why atoms give line spectra.'
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
  setMath(readout, EXCITE_TEXT[name]);
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
    const center = new THREE.Vector3().lerpVectors(excite.start, electron.mesh.position, k);
    drawPhoton(center, electron.mesh.position.clone().sub(excite.start).normalize(), state.time);
  } else if (name === 'up') {
    electron.radius = THREE.MathUtils.lerp(BOHR_RADII[1], BOHR_RADII[2], ease(k));
  } else if (name === 'down') {
    electron.radius = THREE.MathUtils.lerp(BOHR_RADII[2], BOHR_RADII[1], ease(k));
  } else if (name === 'out') {
    excite.ringLevel = 1 - k;
    const center = excite.out.from.clone().addScaledVector(excite.out.direction, 0.6 + k * 5);
    drawPhoton(center, excite.out.direction, state.time);
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
function resetScene() {
  // Stop any running demonstration and put this model's atom, motion and view back as they were on arrival.
  state.exciteIndex = 0;
  setPlaying(!reducedMotion);
  selectModel(state.model, false);
}
$('reset').addEventListener('click', resetScene);
// Electron cloud controls. Choosing an orbital turns the view side-on to its axis.
const SIDE_VIEW = new THREE.Vector3(0, 0.13, 1);
const ORBITAL_VIEWS = {
  all: [HOME_DIRECTION, 3.3],
  '1s': [HOME_DIRECTION, 1.5],
  '2s': [HOME_DIRECTION, 3.3],
  '2px': [SIDE_VIEW, 3.3],
  '2py': [SIDE_VIEW, 3.3],
  '2pz': [new THREE.Vector3(1, 0.13, 0.25), 3.3]
};
// "All" shows carbon's electrons. From there, an orbital button shows that orbital alone; after
// that, each button adds or removes its orbital, so several can be compared.
function setOrbital(key) {
  const chosen = new Set(selectionName() === 'all' ? [] : state.orbitals);
  if (key === 'all') chosen.clear();
  else if (chosen.has(key)) chosen.delete(key);
  else chosen.add(key);
  state.orbitals = chosen.size ? ORBITAL_KEYS.filter(item => chosen.has(item)) : [...OCCUPIED_KEYS];
  select(null);
  if (measure && !occupiedShown().length) measure.pending = 0;
  setMath(readout, orbitalText());
  // A single orbital, or the whole atom, turns to its best view; a mixture keeps the current one.
  const name = selectionName();
  if (name) {
    const [direction, halfWidth] = ORBITAL_VIEWS[name];
    flyTo({ direction, distance: Math.max(halfWidth * 2.75, fitDistance(halfWidth)) });
  }
  syncCloud();
}
document.querySelectorAll('[data-orbital]').forEach(button => button.addEventListener('click', () => setOrbital(button.dataset.orbital)));
$('measure').addEventListener('click', () => addMeasurements(1));
document.querySelectorAll('[data-measure]').forEach(button => button.addEventListener('click', () => addMeasurements(Number(button.dataset.measure))));
$('full-cloud').addEventListener('click', showFullCloud);
$('inspect').addEventListener('click', () => {
  // Bring the Rutherford electrons back into view before inspecting one.
  if (beam && state.model === 'rutherford') stopBeam();
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
  } else {
    select(positiveBody, describe('nucleus'));
    flyTo({ distance: 2.2 });
  }
});
$('alpha').addEventListener('click', () => (beam ? stopBeam() : startBeam()));
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
    Home: resetScene,
    0: resetScene
  };
  if (!actions[event.key]) return;
  event.preventDefault();
  actions[event.key]();
});

// ---------- Model selection ----------
const DEFAULT_READOUT = {
  plum: 'PLUM PUDDING · Tap a particle to discover its job. Then press “Fire alpha particles” and compare with the Rutherford model.',
  rutherford: 'NUCLEAR MODEL · Tap the nucleus or an electron to discover its job. Fire alpha particles: most pass straight through, but a few bounce back.',
  bohr: 'CARBON-12 · 6 protons + 6 neutrons + 6 electrons. Tap a proton or neutron, or excite an electron and watch the energy diagram.',
  cloud: ORBITALS.all
};
function selectModel(model, animate = true) {
  const previous = state.model;
  state.model = model;
  const data = MODELS[model];
  document.body.dataset.model = model;
  stopBeam();
  endExcite();
  state.orbitals = [...OCCUPIED_KEYS];
  measure = null;
  state.inspectIndex = 0;
  $('positive-label').textContent = data.positiveLabel;
  $('neutron-legend').hidden = !['bohr', 'cloud'].includes(model);
  $('electron-legend').hidden = model === 'cloud';
  document.querySelectorAll('[data-orbital-chip]').forEach(chip => { chip.hidden = true; });
  $('photon-legend').hidden = model !== 'bohr';
  $('energy-diagram').hidden = model !== 'bohr';
  $('alpha').hidden = !['plum', 'rutherford'].includes(model);
  $('excite').hidden = model !== 'bohr';
  // The electron cloud has its own experiment and views in place of inspecting one electron.
  for (const id of ['measure', 'cloud-controls', 'radial-graph']) $(id).hidden = model !== 'cloud';
  $('look-closer').hidden = model === 'cloud';
  setMath(readout, DEFAULT_READOUT[model]);
  for (const [id, key] of Object.entries({ 'scene-title': 'title', 'model-heading': 'heading', description: 'description', look: 'look', evidence: 'evidence' })) setMath($(id), data[key]);
  document.querySelectorAll('.models [data-model]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.model === model)));
  viewer.setAttribute('aria-label', `${data.title}. ${data.heading} Drag or use arrow keys to rotate; click then scroll, pinch, or use plus and minus keys to zoom.`);
  if (previous !== model || !animate) resetView();
  buildAtom(animate && previous !== model);
}
document.querySelectorAll('.models [data-model]').forEach(button => button.addEventListener('click', () => {
  if (button.dataset.model !== state.model) selectModel(button.dataset.model);
}));

// ---------- Theme ----------
window.addEventListener('panphy:theme-change', () => {
  palette = readPalette();
  scene.background = palette.background;
  applyThemeToPersistent();
  const hadBeam = Boolean(beam);
  const spreadT = spread.t;
  stopBeam();
  endExcite();
  cloudKeep = cloud;
  buildAtom(false);
  if (hadBeam) startBeam();
  // Rebuilding resets the electrons; keep them where they were rather than replay the drift.
  spread.t = spreadT;
  applySpread();
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
  // Resizing clears the canvas, so redraw now rather than show a blank frame.
  renderer.render(scene, camera);
}
new ResizeObserver(resize).observe(viewer);
resize();
new IntersectionObserver(entries => { state.visible = entries[entries.length - 1].isIntersecting; }).observe(viewer);
renderer.domElement.addEventListener('webglcontextlost', event => {
  event.preventDefault();
  $('load-status').hidden = false;
  $('load-status').textContent = 'The 3D view was interrupted. Reload this page to restore it.';
});

renderEnergyDiagram();
setPlaying(state.playing);
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
  stepSpread(delta);
  stepCloud(delta);
  positionElectrons();
  stepTransition(delta);
  stepCamera(delta);
  if (halo.parent) halo.material.opacity = 0.28 + 0.14 * Math.sin(time / 220);
  controls.update();
  // Every frame, even when paused, since rotating the view changes what lies in front.
  if (beam) applyDepthFade();
  renderer.render(scene, camera);
}
