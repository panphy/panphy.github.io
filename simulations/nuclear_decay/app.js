import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { MODES, MODE_ORDER, ISOTOPES, PARTICLES, QUESTIONS } from './content.js';
import { Quiz, loadProgress, saveProgress, setSummary } from './quiz.js';

const $ = id => document.getElementById(id);
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const state = {
  mode: 'alpha',
  playing: !reducedMotion,
  time: 0,
  visible: true
};

// Display sizes in scene units. Markers are enlarged and not to scale.
const NUCLEON_RADIUS = 0.17;
const ELECTRON_RADIUS = 0.07;
const TRANSITION_TIME = 0.6;
const SCREEN_HALF_LIFE = 4; // Seconds on screen for one half-life, whatever the isotope.
const MAX_HALF_LIVES = 6;
const HOME_HALF_WIDTH = { alpha: 2.9, beta: 1.6, gamma: 2.4, halflife: 3.8 };
// Penetration test: typical classroom absorbers (thicknesses are illustrative).
const ABSORBERS = [
  { key: 'paper', label: 'Paper', gap: 1.0, thickness: 0.03 },
  { key: 'aluminium', label: 'Aluminium', gap: 1.0, thickness: 0.14 },
  { key: 'lead', label: 'Lead', gap: 1.1, thickness: 0.55 }
];
const TEST_SPEED = { alpha: 2.2, beta: 3.4, gamma: 4.6 };
const GAMMA_THROUGH_LEAD = 0.25;

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
const stage = new THREE.Group();
scene.add(stage);

let palette = readPalette();
let buildTextures = [];
let pickables = [];
let flyers = [];
let nucleus = null;
let decay = null;
let test = null;
let sample = null;
let cameraTween = null;
let fadeIn = null;

function readPalette() {
  const styles = getComputedStyle(document.documentElement);
  const css = name => styles.getPropertyValue(name).trim();
  const color = name => new THREE.Color(css(name));
  return {
    dark: document.documentElement.getAttribute('data-theme') === 'dark',
    proton: color('--proton'),
    neutron: color('--neutron'),
    alpha: color('--alpha'),
    electron: color('--electron'),
    photon: color('--photon'),
    antineutrino: color('--antineutrino'),
    undecayed: color('--undecayed'),
    decayed: color('--decayed'),
    paper: color('--paper'),
    aluminium: color('--aluminium'),
    lead: color('--lead'),
    line: color('--text-secondary'),
    accent: color('--brand-accent'),
    tray: color('--card-border'),
    css: {
      text: css('--text-main'),
      secondary: css('--text-secondary'),
      border: css('--card-border'),
      undecayed: css('--undecayed'),
      decayed: css('--decayed'),
      font: css('--font-mono')
    }
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
const shadowTexture = canvasTexture(128, 128, (ctx, w) => {
  const gradient = ctx.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
  gradient.addColorStop(0, 'rgba(0,0,0,0.55)');
  gradient.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, w, w);
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
function labelSprite(text, color, width = 0.9) {
  const texture = canvasTexture(384, 96, (ctx, w, h) => {
    ctx.fillStyle = `#${color.getHexString()}`;
    ctx.font = '600 46px "IBM Plex Mono", ui-monospace, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, w / 2, h / 2);
  });
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false }));
  sprite.scale.set(width, width / 4, 1);
  sprite.raycast = () => {};
  return sprite;
}

// ---------- Object helpers ----------
function sphere(radius, color, { map = null, segments = 24, roughness = 0.3, emissive = 0.04 } = {}) {
  const material = new THREE.MeshStandardMaterial({ color: map ? 0xffffff : color, map, roughness, metalness: 0.15, emissive: color, emissiveIntensity: emissive });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, segments, Math.round(segments * 0.7)), material);
  mesh.userData.radius = radius;
  return mesh;
}
function glow(color, size, opacity = palette.dark ? 0.6 : 0.3) {
  const material = new THREE.SpriteMaterial({ map: glowTexture, color, transparent: true, opacity, depthWrite: false, blending: palette.dark ? THREE.AdditiveBlending : THREE.NormalBlending });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(size, size, 1);
  sprite.raycast = () => {};
  return sprite;
}
// Symbol textures shared by the particles of one build, so a long test does not pile up textures.
let symbolMaps = {};
function sharedSymbol(key, symbol) {
  symbolMaps[key] ??= symbolTexture(palette[key], symbol);
  return symbolMaps[key];
}
function makeElectron() {
  const mesh = sphere(ELECTRON_RADIUS, palette.electron, { map: sharedSymbol('electron', '−'), emissive: 0.15 });
  mesh.add(glow(palette.electron, 0.5));
  return mesh;
}
function makeWave(color, opacity = 0.95) {
  const line = new THREE.Line(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(new Float32Array(90 * 3), 3)), new THREE.LineBasicMaterial({ color, transparent: true, opacity }));
  line.frustumCulled = false;
  line.userData.radius = 0.35;
  return line;
}
function drawWave(line, centre, direction, time, length = 1.1) {
  const positions = line.geometry.attributes.position;
  const view = camera.position.clone().sub(centre).normalize();
  const side = new THREE.Vector3().crossVectors(direction, view);
  if (side.lengthSq() < 1e-4) side.set(0, 1, 0);
  side.normalize();
  for (let i = 0; i < positions.count; i++) {
    const s = (i / (positions.count - 1) - 0.5) * length;
    const envelope = Math.cos(Math.PI * s / length) ** 2;
    const wave = 0.12 * envelope * Math.sin(s / length * Math.PI * 12 - time * 18);
    positions.setXYZ(i, centre.x + direction.x * s + side.x * wave, centre.y + direction.y * s + side.y * wave, centre.z + direction.z * s + side.z * wave);
  }
  positions.needsUpdate = true;
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
function ease(k) {
  return k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2;
}
function materialsOf(object) {
  const list = [];
  object.traverse(child => {
    if (child.material) list.push(...(Array.isArray(child.material) ? child.material : [child.material]));
  });
  return list;
}
function setOpacity(object, opacity) {
  for (const material of materialsOf(object)) {
    if (material.userData.base === undefined) material.userData.base = material.opacity;
    material.transparent = true;
    material.opacity = material.userData.base * opacity;
  }
}

// ---------- Persistent helpers ----------
const floorShadow = new THREE.Mesh(new THREE.PlaneGeometry(6, 6), new THREE.MeshBasicMaterial({ map: shadowTexture, transparent: true, depthWrite: false }));
floorShadow.rotation.x = -Math.PI / 2;
floorShadow.raycast = () => {};
scene.add(floorShadow);
const halo = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.35, side: THREE.BackSide, depthWrite: false }));
halo.raycast = () => {};
function applyThemeToPersistent() {
  floorShadow.material.opacity = palette.dark ? 0.7 : 0.25;
  halo.material.color.copy(palette.accent);
}
applyThemeToPersistent();

// ---------- Stage ----------
function disposeObject(object) {
  object.traverse(child => {
    child.geometry?.dispose();
    if (child.material) (Array.isArray(child.material) ? child.material : [child.material]).forEach(material => material.dispose());
  });
}
function clearStage() {
  halo.removeFromParent();
  for (const child of [...stage.children]) {
    disposeObject(child);
    stage.remove(child);
  }
  buildTextures.forEach(texture => texture.dispose());
  buildTextures = [];
  symbolMaps = {};
  pickables = [];
  flyers = [];
  nucleus = null;
  decay = null;
  test = null;
  sample = null;
  stage.position.set(0, 0, 0);
}

// ---------- Nucleus ----------
function packNucleus(count, seed) {
  const rand = random(seed);
  let points;
  if (count <= 30) {
    // Small nuclei: relax random points until the spheres just touch.
    points = Array.from({ length: count }, () => randomDirection(rand).multiplyScalar(0.4 * Math.cbrt(rand())));
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
  } else {
    // Large nuclei: the closest-packed (FCC) lattice sites nearest the centre, lightly jittered.
    const edge = NUCLEON_RADIUS * 2 * 0.97 * Math.SQRT2;
    const n = Math.ceil(Math.cbrt(count / 4)) + 2;
    const basis = [[0, 0, 0], [0.5, 0.5, 0], [0.5, 0, 0.5], [0, 0.5, 0.5]];
    const sites = [];
    for (let i = -n; i <= n; i++) {
      for (let j = -n; j <= n; j++) {
        for (let k = -n; k <= n; k++) {
          for (const [a, b, c] of basis) {
            const point = new THREE.Vector3(i + a + 0.25, j + b + 0.25, k + c + 0.25).multiplyScalar(edge);
            sites.push({ point, key: point.length() + rand() * 0.06 });
          }
        }
      }
    }
    sites.sort((p, q) => p.key - q.key);
    points = sites.slice(0, count).map(({ point }) => point.add(new THREE.Vector3(rand() - 0.5, rand() - 0.5, rand() - 0.5).multiplyScalar(0.025)));
  }
  const centre = points.reduce((sum, point) => sum.add(point), new THREE.Vector3()).divideScalar(points.length);
  const turn = new THREE.Euler(rand() * 6, rand() * 6, rand() * 6);
  return points.map(point => point.sub(centre).applyEuler(turn));
}
function shuffledKinds(protons, neutrons, seed) {
  const kinds = [...Array(protons).fill('proton'), ...Array(neutrons).fill('neutron')];
  const rand = random(seed);
  for (let i = kinds.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [kinds[i], kinds[j]] = [kinds[j], kinds[i]];
  }
  return kinds;
}
function buildNucleus(mode) {
  const { parent } = MODES[mode];
  const count = parent.nucleons ?? parent.A;
  const points = packNucleus(count, count * 7 + 3);
  const kinds = shuffledKinds(parent.Z, count - parent.Z, count + 11);
  const segments = count > 60 ? 18 : 28;
  const geometry = new THREE.SphereGeometry(NUCLEON_RADIUS, segments, Math.round(segments * 0.7));
  const materials = {};
  for (const kind of ['proton', 'neutron']) {
    materials[kind] = new THREE.MeshStandardMaterial({ color: 0xffffff, map: symbolTexture(palette[kind], kind === 'proton' ? '+' : '0'), roughness: 0.3, metalness: 0.15, emissive: palette[kind], emissiveIntensity: 0.04 });
  }
  const group = new THREE.Group();
  const rand = random(count);
  const nucleons = points.map((home, i) => {
    const mesh = new THREE.Mesh(geometry, materials[kinds[i]]);
    mesh.position.copy(home);
    mesh.rotation.y = i * 0.9;
    mesh.userData.radius = NUCLEON_RADIUS;
    group.add(mesh);
    const nucleon = { mesh, home, kind: kinds[i], phase: rand() * Math.PI * 2, axis: randomDirection(rand) };
    const pick = { object: mesh, kind: kinds[i] };
    nucleon.pick = pick;
    pickables.push(pick);
    return nucleon;
  });
  const radius = Math.max(...points.map(point => point.length())) + NUCLEON_RADIUS;
  stage.add(group);
  const glowSprite = glow(palette.photon, radius * 3.4, 0);
  stage.add(glowSprite);
  const label = labelSprite(labelText(parent), palette.line, Math.max(0.9, radius * 0.95));
  label.position.set(0, radius + 0.42, 0);
  stage.add(label);
  nucleus = { group, nucleons, radius, materials, geometry, glow: glowSprite, label, excited: mode === 'gamma', jiggle: mode === 'gamma' ? 0.04 : 0.012, spin: 0 };
  floorShadow.position.y = -radius - 0.9;
  floorShadow.scale.setScalar(Math.max(0.6, radius / 1.2));
}
function labelText({ symbol, A }) {
  return `${symbol}-${A}`;
}
function setLabel(nuclide) {
  const old = nucleus.label;
  const label = labelSprite(labelText(nuclide), palette.line, old.scale.x);
  label.position.copy(old.position);
  disposeObject(old);
  old.removeFromParent();
  stage.add(label);
  nucleus.label = label;
}
function stepNucleus(delta) {
  if (!nucleus) return;
  nucleus.spin += delta * 0.18;
  nucleus.group.rotation.y = nucleus.spin;
  const amplitude = nucleus.jiggle;
  for (const nucleon of nucleus.nucleons) {
    const wobble = amplitude * Math.sin(state.time * 9 + nucleon.phase);
    nucleon.mesh.position.copy(nucleon.home).addScaledVector(nucleon.axis, wobble);
  }
  if (nucleus.excited) {
    nucleus.glow.material.opacity = (palette.dark ? 0.32 : 0.22) + 0.1 * Math.sin(state.time * 5);
  }
}
function countKinds() {
  let protons = 0;
  for (const nucleon of nucleus.nucleons) if (nucleon.kind === 'proton') protons += 1;
  return { protons, neutrons: nucleus.nucleons.length - protons };
}

// ---------- Nuclear equation ----------
function nuclideHTML({ A, Z, symbol }, className = '') {
  const z = Z < 0 ? `−${-Z}` : Z;
  return `<span class="nuclide ${className}"><span class="nums"><span>${A}</span><span>${z}</span></span>${symbol}</span>`;
}
function renderEquation(done) {
  const data = MODES[state.mode];
  const box = $('equation');
  if (!data.parent || test) {
    box.hidden = true;
    return;
  }
  box.hidden = false;
  const kind = { alpha: 'alpha', beta: 'electron', gamma: 'gamma' }[state.mode];
  const left = nuclideHTML(data.parent);
  if (!done) {
    box.innerHTML = `<div class="eq">${left}<span>→</span><span class="nuclide unknown">?</span></div><div class="check">Decay the nucleus to complete the equation</div>`;
    box.setAttribute('aria-label', `Nuclear equation: ${data.parent.name} decays to an unknown product.`);
    return;
  }
  const mass = parseInt(data.parent.A, 10);
  const { daughter, emitted } = data;
  const z = value => (value < 0 ? `(−${-value})` : value);
  box.innerHTML = `<div class="eq">${left}<span>→</span>${nuclideHTML(daughter)}<span>+</span>${nuclideHTML(emitted, kind)}</div>`
    + `<div class="check">Top: ${mass} = ${daughter.A} + ${emitted.A} <b>✓</b> · Bottom: ${data.parent.Z} = ${daughter.Z} + ${z(emitted.Z)} <b>✓</b></div>`;
  box.setAttribute('aria-label', `Nuclear equation: ${data.parent.name} decays to ${daughter.name} plus a ${emitted.label}. Mass numbers: ${mass} equals ${daughter.A} plus ${emitted.A}. Atomic numbers: ${data.parent.Z} equals ${daughter.Z} plus ${emitted.Z}.`);
}

// ---------- Flyers (particles leaving the nucleus) ----------
// Each flyer owns an update(delta) that returns false once it has finished.
function addFlyer(object, update, pickKind = null) {
  stage.add(object);
  const flyer = { object, update, pick: null };
  if (pickKind) {
    flyer.pick = { object, kind: pickKind };
    pickables.push(flyer.pick);
  }
  flyers.push(flyer);
  return flyer;
}
function removeFlyer(flyer) {
  if (halo.parent === flyer.object) halo.removeFromParent();
  disposeObject(flyer.object);
  flyer.object.removeFromParent();
  if (flyer.pick) pickables = pickables.filter(item => item !== flyer.pick);
  flyers = flyers.filter(item => item !== flyer);
}
function stepFlyers(delta) {
  for (const flyer of [...flyers]) {
    if (flyer.update(delta) === false) removeFlyer(flyer);
  }
}
// Moves an object outward and fades it once it has travelled `range`.
function straightFlight(object, { direction, speed, range, getPosition = () => object.position, move = step => object.position.addScaledVector(direction, step), onFrame }) {
  const start = getPosition().clone();
  let fading = 0;
  return delta => {
    move(speed * delta);
    onFrame?.(delta);
    if (getPosition().distanceTo(start) > range) {
      fading += delta / 0.5;
      setOpacity(object, Math.max(0, 1 - fading));
      if (fading >= 1) return false;
    }
    return true;
  };
}
function emissionDirection() {
  // Towards the right of the screen and slightly towards the viewer, so the emission is easy to see.
  const right = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0);
  const toward = camera.position.clone().sub(controls.target).normalize();
  return right.multiplyScalar(0.9).addScaledVector(toward, 0.35).normalize();
}
function toLocal(direction) {
  return direction.clone().applyQuaternion(nucleus.group.quaternion.clone().invert());
}

// ---------- Decay animations ----------
function startDecay() {
  if (!nucleus || decay || test) return;
  if (!state.playing) setPlaying(true);
  select(null);
  const direction = emissionDirection();
  decay = { phase: 'prepare', t: 0, direction, mode: state.mode };
  if (state.mode === 'alpha') prepareAlpha();
  if (state.mode === 'beta') prepareBeta();
  if (state.mode === 'gamma') readout.textContent = 'EXCITED NUCLEUS · The extra energy is about to leave as a gamma ray…';
  updateDecayButton();
}
function prepareAlpha() {
  // Two protons and two neutrons on the side facing the emission direction.
  const local = toLocal(decay.direction);
  const ranked = [...nucleus.nucleons].sort((a, b) => b.home.dot(local) - a.home.dot(local));
  const chosen = [...ranked.filter(n => n.kind === 'proton').slice(0, 2), ...ranked.filter(n => n.kind === 'neutron').slice(0, 2)];
  nucleus.nucleons = nucleus.nucleons.filter(n => !chosen.includes(n));
  const centre = decay.direction.clone().multiplyScalar(nucleus.radius + 0.12);
  const tetra = [[1, 1, 1], [1, -1, -1], [-1, 1, -1], [-1, -1, 1]].map(v => new THREE.Vector3(...v).normalize().multiplyScalar(NUCLEON_RADIUS * 1.2));
  decay.alpha = chosen.map((nucleon, i) => {
    nucleon.mesh.material = nucleon.mesh.material.clone();
    nucleon.mesh.geometry = nucleus.geometry.clone();
    stage.attach(nucleon.mesh);
    pickables = pickables.filter(item => item !== nucleon.pick);
    return { mesh: nucleon.mesh, from: nucleon.mesh.position.clone(), offset: tetra[i] };
  });
  decay.centre = centre;
  readout.textContent = 'ALPHA DECAY · Two protons and two neutrons group together at the edge of the nucleus…';
}
function prepareBeta() {
  const local = toLocal(decay.direction);
  const neutron = nucleus.nucleons.filter(n => n.kind === 'neutron').sort((a, b) => b.home.dot(local) - a.home.dot(local))[0];
  neutron.mesh.material = neutron.mesh.material.clone();
  const spark = glow(new THREE.Color('#ffffff'), 0.9, 0);
  neutron.mesh.add(spark);
  decay.neutron = neutron;
  decay.spark = spark;
  readout.textContent = 'BETA DECAY · One neutron in the nucleus is about to change…';
}
function stepDecay(delta) {
  if (!decay || decay.phase === 'done') return;
  decay.t += delta;
  if (decay.mode === 'alpha') stepAlpha();
  else if (decay.mode === 'beta') stepBeta();
  else stepGamma();
}
function stepAlpha() {
  const d = decay;
  if (d.phase === 'prepare') {
    const k = ease(Math.min(1, d.t / 1.0));
    for (const part of d.alpha) part.mesh.position.lerpVectors(part.from, d.centre.clone().add(part.offset), k);
    if (d.t >= 1.0) {
      // Build the alpha particle and let the electrostatic repulsion push it away.
      const group = new THREE.Group();
      group.position.copy(d.centre);
      group.userData.radius = NUCLEON_RADIUS * 2.3;
      for (const part of d.alpha) group.attach(part.mesh);
      group.add(glow(palette.alpha, 1.4));
      const mother = MODES.alpha.daughter.A;
      let speed = 0;
      let travelled = 0;
      const flyer = addFlyer(group, straightFlight(group, {
        direction: d.direction,
        speed: 1,
        range: 6,
        move: () => {},
        onFrame: delta => {
          speed += (4.2 - speed) * (1 - Math.exp(-delta / 0.35));
          travelled += speed * delta;
          group.position.copy(d.centre).addScaledVector(d.direction, travelled);
          group.rotation.x += delta * 1.5;
          group.rotation.y += delta * 2;
          // Momentum conservation: the daughter recoils 4/237 as far the other way.
          nucleus.group.position.copy(d.direction).multiplyScalar(-travelled * 4 / mother);
        }
      }));
      // Pick the whole alpha particle through any of its nucleons.
      for (const part of d.alpha) {
        const pick = { object: group, kind: 'alpha' };
        pickables.push(pick);
        part.pick = pick;
      }
      const cleanUp = flyer.update;
      flyer.update = delta => {
        const alive = cleanUp(delta);
        if (!alive) pickables = pickables.filter(item => item.object !== group);
        return alive;
      };
      finishDecay();
    }
  }
}
function stepBeta() {
  const d = decay;
  const mesh = d.neutron.mesh;
  if (d.phase === 'prepare') {
    const k = Math.min(1, d.t / 1.1);
    mesh.material.emissiveIntensity = 0.04 + 0.9 * k * (0.6 + 0.4 * Math.sin(d.t * 18));
    d.spark.material.opacity = 0.8 * k;
    if (d.t >= 1.1) {
      d.phase = 'change';
      d.t = 0;
      // A new proton appears where the neutron was while the neutron fades.
      const proton = new THREE.Mesh(nucleus.geometry, nucleus.materials.proton.clone());
      proton.position.copy(mesh.position);
      proton.rotation.copy(mesh.rotation);
      proton.userData.radius = NUCLEON_RADIUS;
      setOpacity(proton, 0);
      nucleus.group.add(proton);
      d.proton = proton;
      emitBetaParticles(mesh);
    }
  } else if (d.phase === 'change') {
    const k = Math.min(1, d.t / 0.6);
    setOpacity(mesh, 1 - k);
    setOpacity(d.proton, k);
    d.proton.position.copy(mesh.position);
    if (k >= 1) {
      const { neutron, proton } = d;
      proton.material.dispose();
      proton.material = nucleus.materials.proton;
      neutron.mesh.removeFromParent();
      disposeObject(neutron.mesh.children[0]);
      neutron.mesh.material.dispose();
      neutron.mesh = proton;
      neutron.kind = 'proton';
      neutron.pick.object = proton;
      neutron.pick.kind = 'proton';
      finishDecay();
    }
  }
}
function emitBetaParticles(from) {
  const start = from.getWorldPosition(new THREE.Vector3());
  const electron = makeElectron();
  electron.position.copy(start);
  const trail = new THREE.Line(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(new Float32Array(30 * 3), 3)), new THREE.LineBasicMaterial({ color: palette.electron, transparent: true, opacity: 0.45 }));
  trail.frustumCulled = false;
  const history = [];
  addFlyer(trail, straightFlight(trail, { direction: decay.direction, speed: 0, range: 7, getPosition: () => electron.position }));
  addFlyer(electron, straightFlight(electron, {
    direction: decay.direction,
    speed: 5.5,
    range: 7,
    onFrame: () => {
      history.unshift(electron.position.clone());
      history.length = Math.min(history.length, 30);
      const positions = trail.geometry.attributes.position;
      for (let i = 0; i < 30; i++) {
        const point = history[Math.min(i, history.length - 1)];
        positions.setXYZ(i, point.x, point.y, point.z);
      }
      positions.needsUpdate = true;
    }
  }), 'electron');
  // The antineutrino leaves in another direction and is drawn faintly.
  const view = camera.position.clone().sub(start).normalize();
  const direction = decay.direction.clone().applyAxisAngle(view, 2.1).normalize();
  const antineutrino = sphere(0.05, palette.antineutrino, { emissive: 0.3 });
  antineutrino.userData.radius = 0.12;
  antineutrino.position.copy(start);
  antineutrino.add(glow(palette.antineutrino, 0.35));
  setOpacity(antineutrino, 0.6);
  addFlyer(antineutrino, straightFlight(antineutrino, { direction, speed: 4.5, range: 7 }), 'antineutrino');
}
function stepGamma() {
  const d = decay;
  if (d.phase === 'prepare') {
    const k = Math.min(1, d.t / 0.8);
    nucleus.jiggle = 0.04 + 0.03 * k;
    nucleus.glow.material.opacity = (palette.dark ? 0.35 : 0.25) + 0.3 * k;
    if (d.t >= 0.8) {
      d.phase = 'relax';
      d.t = 0;
      nucleus.excited = false;
      const wave = makeWave(palette.photon);
      const centre = d.direction.clone().multiplyScalar(nucleus.radius + 0.5);
      let time = 0;
      addFlyer(wave, straightFlight(wave, {
        direction: d.direction,
        speed: 6,
        range: 8,
        getPosition: () => centre,
        move: step => centre.addScaledVector(d.direction, step),
        onFrame: delta => {
          time += delta;
          drawWave(wave, centre, d.direction, time);
          wave.userData.centre = centre;
        }
      }), 'gamma');
      d.wave = wave;
      d.startOpacity = nucleus.glow.material.opacity;
    }
  } else if (d.phase === 'relax') {
    const k = Math.min(1, d.t / 0.8);
    nucleus.jiggle = 0.07 - 0.058 * k;
    nucleus.glow.material.opacity = d.startOpacity * (1 - k);
    if (k >= 1) finishDecay();
  }
}
function finishDecay() {
  const data = MODES[state.mode];
  decay.phase = 'done';
  setLabel(data.daughter);
  renderEquation(true);
  const { protons, neutrons } = countKinds();
  const summary = {
    alpha: `${data.daughter.name.toUpperCase()} · ${protons} protons + ${neutrons} neutrons. The alpha particle carried away 2 protons + 2 neutrons, so the element changed.`,
    beta: `${data.daughter.name.toUpperCase()} · ${protons} protons + ${neutrons} neutrons. A neutron became a proton, so the element changed but the mass number did not.`,
    gamma: `${data.daughter.name.toUpperCase()} · Still ${protons} protons + ${neutrons} neutrons. Only energy left, as a gamma ray.`
  }[state.mode];
  readout.textContent = summary;
  updateDecayButton();
}
function updateDecayButton() {
  const button = $('decay');
  button.textContent = decay?.phase === 'done' ? 'Reset nucleus' : 'Decay this nucleus';
  button.disabled = Boolean(decay && decay.phase !== 'done') || Boolean(test);
}

// ---------- Penetration test ----------
function startTest() {
  if (!state.playing) setPlaying(true);
  buildMode(false);
  const radius = nucleus.radius;
  const group = new THREE.Group();
  let x = radius;
  const slabs = ABSORBERS.map(({ key, label, gap, thickness }) => {
    x += gap;
    const material = new THREE.MeshStandardMaterial({ color: palette[key], roughness: key === 'paper' ? 0.9 : 0.45, metalness: key === 'paper' ? 0 : 0.35, transparent: true, opacity: key === 'paper' ? 0.85 : 0.9 });
    const slab = new THREE.Mesh(new THREE.BoxGeometry(thickness, 2.2, 2.2), material);
    slab.position.x = x + thickness / 2;
    slab.userData.radius = 0.6;
    group.add(slab);
    const tag = labelSprite(label, palette.line, 1.2);
    tag.position.set(x + thickness / 2, 1.45, 0);
    group.add(tag);
    pickables.push({ object: slab, kind: key, radius: 0.5 });
    const slabInfo = { key, start: x, end: x + thickness };
    x += thickness;
    return slabInfo;
  });
  stage.add(group);
  test = { group, slabs, timer: 0, counts: { emitted: 0, paper: 0, aluminium: 0, lead: 0 } };
  $('penetration').setAttribute('aria-pressed', 'true');
  $('penetration').textContent = 'Stop the test';
  $('beam-stats').hidden = false;
  renderEquation(false);
  updateDecayButton();
  updateTestStats();
  readout.textContent = `PENETRATION TEST · ${MODES[state.mode].parent.name} is used as a source. Each marker stands for radiation from a large sample. Watch where each type is stopped.`;
  const end = slabs[2].end;
  const mid = (end - radius) / 2;
  flyTo({ direction: new THREE.Vector3(0.12, 0.38, 1), distance: fitDistance((end + radius) / 2 + 0.5), target: new THREE.Vector3(mid, 0, 0) });
}
function stopTest() {
  if (!test) return;
  buildMode(false);
  resetView();
  readout.textContent = DEFAULT_READOUT[state.mode]();
}
function spawnTestParticle() {
  const kind = state.mode;
  const [paper, aluminium, lead] = test.slabs;
  const origin = new THREE.Vector3(nucleus.radius * 0.95, (Math.random() - 0.5) * 0.5, (Math.random() - 0.5) * 0.5);
  const direction = new THREE.Vector3(1, (Math.random() - 0.5) * 0.1, (Math.random() - 0.5) * 0.1).normalize();
  let stopX;
  if (kind === 'alpha') stopX = paper.start - 0.02;
  else if (kind === 'beta') stopX = aluminium.start + Math.random() * (aluminium.end - aluminium.start);
  else stopX = Math.random() < GAMMA_THROUGH_LEAD ? Infinity : lead.start + Math.random() * (lead.end - lead.start);
  const passed = new Set();
  let object;
  let position;
  let time = 0;
  if (kind === 'gamma') {
    object = makeWave(palette.photon);
    position = origin.clone();
  } else if (kind === 'alpha') {
    object = sphere(0.11, palette.alpha, { map: sharedSymbol('alpha', '+'), emissive: 0.15 });
    object.add(glow(palette.alpha, 0.6));
    position = object.position.copy(origin);
  } else {
    object = makeElectron();
    position = object.position.copy(origin);
  }
  test.counts.emitted += 1;
  let absorbed = 0;
  let fading = 0;
  addFlyer(object, delta => {
    time += delta;
    if (absorbed) {
      // Absorbed: a quick flash, then gone.
      absorbed += delta;
      const k = Math.min(1, absorbed / 0.35);
      if (kind === 'gamma') drawWave(object, position, direction, time, 0.7 * (1 - k) + 0.05);
      else object.scale.setScalar(1 + 0.8 * k);
      setOpacity(object, 1 - k);
      return k < 1;
    }
    position.addScaledVector(direction, TEST_SPEED[kind] * delta);
    for (const slab of test.slabs) {
      if (!passed.has(slab.key) && position.x > slab.end) {
        passed.add(slab.key);
        test.counts[slab.key] += 1;
        updateTestStats();
      }
    }
    if (position.x >= stopX) {
      position.x = stopX;
      absorbed = 1e-6;
    }
    if (kind === 'gamma') drawWave(object, position, direction, time, 0.7);
    if (position.x > lead.end + 2.2) {
      fading += delta / 0.4;
      setOpacity(object, Math.max(0, 1 - fading));
      return fading < 1;
    }
    return true;
  }, kind === 'beta' ? 'electron' : kind);
  if (kind === 'gamma') object.userData.centre = position;
}
function stepTest(delta) {
  if (!test) return;
  test.timer -= delta;
  if (test.timer <= 0) {
    test.timer = 0.32;
    spawnTestParticle();
  }
}
function updateTestStats() {
  const { emitted, paper, aluminium, lead } = test.counts;
  $('beam-stats').innerHTML = `Emitted <b>${emitted}</b><br>Through paper <b>${paper}</b><br>Through aluminium <b>${aluminium}</b><br>Through lead <b>${lead}</b>`;
}

// ---------- Half-life sample ----------
const sparkPool = [];
function buildSample() {
  const isotope = ISOTOPES[$('isotope').value];
  const size = Number($('sample-size').value);
  const side = Math.round(Math.sqrt(size));
  const spacing = 5.4 / side;
  const radius = spacing * 0.36;
  const mesh = new THREE.InstancedMesh(new THREE.SphereGeometry(radius, 16, 12), new THREE.MeshStandardMaterial({ roughness: 0.35, metalness: 0.1 }), size);
  const positions = [];
  const matrix = new THREE.Matrix4();
  for (let i = 0; i < size; i++) {
    const position = new THREE.Vector3((i % side - (side - 1) / 2) * spacing, 0, (Math.floor(i / side) - (side - 1) / 2) * spacing);
    positions.push(position);
    mesh.setMatrixAt(i, matrix.makeTranslation(position));
    mesh.setColorAt(i, palette.undecayed);
  }
  mesh.raycast = () => {};
  stage.add(mesh);
  const width = side * spacing + 0.35;
  const tray = new THREE.Mesh(new THREE.BoxGeometry(width, 0.08, width), new THREE.MeshStandardMaterial({ color: palette.tray, roughness: 0.8 }));
  tray.position.y = -radius - 0.06;
  tray.raycast = () => {};
  stage.add(tray);
  floorShadow.position.y = -radius - 0.4;
  floorShadow.scale.setScalar(1.3);
  const sparks = new THREE.Group();
  stage.add(sparks);
  sparkPool.length = 0;
  const sparkColor = isotope.emits === 'alpha' ? palette.alpha : palette.electron;
  for (let i = 0; i < 70; i++) {
    const spark = glow(sparkColor, 0.3, 0);
    spark.visible = false;
    sparks.add(spark);
    sparkPool.push({ sprite: spark, age: 1 });
  }
  sample = {
    isotope, size, mesh, tray, positions, radius,
    alive: new Uint8Array(size).fill(1),
    remaining: size,
    t: 0,
    history: [[0, size]],
    running: false,
    stopAt: null,
    pops: []
  };
  $('undecayed-label').textContent = `Undecayed ${isotope.name.toLowerCase()}`;
  $('decayed-label').textContent = `Decayed (now ${isotope.daughter})`;
  $('graph').hidden = false;
  updateSampleStats();
  drawGraph();
}
function recolourSample() {
  const matrixColor = new THREE.Color();
  for (let i = 0; i < sample.size; i++) sample.mesh.setColorAt(i, matrixColor.copy(sample.alive[i] ? palette.undecayed : palette.decayed));
  sample.mesh.instanceColor.needsUpdate = true;
  sample.tray.material.color.copy(palette.tray);
  const sparkColor = sample.isotope.emits === 'alpha' ? palette.alpha : palette.electron;
  for (const spark of sparkPool) spark.sprite.material.color.copy(sparkColor);
}
function stepSample(delta) {
  if (!sample) return;
  const matrix = new THREE.Matrix4();
  if (sample.running) {
    let dt = delta / SCREEN_HALF_LIFE;
    const limit = sample.stopAt ?? MAX_HALF_LIVES;
    dt = Math.min(dt, limit - sample.t);
    // Every undecayed nucleus has the same chance of decaying in each time step.
    const chance = 1 - 2 ** -dt;
    for (let i = 0; i < sample.size; i++) {
      if (sample.alive[i] && Math.random() < chance) decayInSample(i);
    }
    sample.t += dt;
    const last = sample.history[sample.history.length - 1];
    if (sample.t - last[0] > 0.02 || last[1] !== sample.remaining) sample.history.push([sample.t, sample.remaining]);
    if (sample.t >= limit - 1e-9) {
      sample.t = limit;
      sample.running = false;
      sample.stopAt = null;
      sampleStopped(limit);
    }
    updateSampleStats();
    drawGraph();
  }
  for (const pop of [...sample.pops]) {
    pop.age += delta;
    const k = Math.min(1, pop.age / 0.35);
    sample.mesh.setMatrixAt(pop.index, matrix.makeScale(1, 1, 1).setPosition(sample.positions[pop.index]).multiply(new THREE.Matrix4().makeScale(1.6 - 0.6 * k, 1.6 - 0.6 * k, 1.6 - 0.6 * k)));
    if (k >= 1) sample.pops.splice(sample.pops.indexOf(pop), 1);
  }
  sample.mesh.instanceMatrix.needsUpdate = true;
  for (const spark of sparkPool) {
    if (spark.age >= 1) continue;
    spark.age += delta / 0.7;
    spark.sprite.position.y += delta * 1.6;
    spark.sprite.material.opacity = Math.max(0, 1 - spark.age) * (palette.dark ? 0.9 : 0.7);
    spark.sprite.visible = spark.age < 1;
  }
}
function decayInSample(index) {
  sample.alive[index] = 0;
  sample.remaining -= 1;
  sample.mesh.setColorAt(index, palette.decayed);
  sample.mesh.instanceColor.needsUpdate = true;
  sample.pops.push({ index, age: 0 });
  const spark = sparkPool.find(item => item.age >= 1);
  if (spark) {
    spark.age = 0;
    spark.sprite.position.copy(sample.positions[index]);
    spark.sprite.visible = true;
  }
}
function setSampleRunning(running, stopAt = null) {
  if (!sample) return;
  if (running && sample.t >= MAX_HALF_LIVES - 1e-9) {
    readout.textContent = `The graph is full after ${MAX_HALF_LIVES} half-lives. Press “Reset sample” to start again.`;
    return;
  }
  sample.running = running;
  sample.stopAt = stopAt;
  updateMotionButton();
}
function sampleStopped(limit) {
  updateMotionButton();
  const halfLives = Math.round(limit * 100) / 100;
  const expected = sample.size / 2 ** limit;
  if (Math.abs(limit - Math.round(limit)) < 1e-6) {
    readout.textContent = `AFTER ${Math.round(limit)} HALF-LI${Math.round(limit) === 1 ? 'FE' : 'VES'} (${formatTime(limit * sample.isotope.halfLife)} ${sample.isotope.unitName}) · ${sample.remaining} of ${sample.size} remain undecayed. Expected about ${formatCount(expected)}.`;
  } else {
    readout.textContent = `${halfLives} half-lives · ${sample.remaining} remain undecayed.`;
  }
  if (limit >= MAX_HALF_LIVES) readout.textContent += ' The graph is full: reset the sample to run it again.';
}
function formatCount(value) {
  return value >= 10 ? Math.round(value).toString() : value.toFixed(1);
}
function formatTime(value) {
  if (value >= 1000) return Math.round(value).toLocaleString('en-GB');
  if (value >= 100) return value.toFixed(0);
  if (value >= 10) return value.toFixed(1);
  return value.toFixed(2);
}
function updateSampleStats() {
  const { isotope, t, remaining, size } = sample;
  $('graph-stats').innerHTML = `t = <b>${formatTime(t * isotope.halfLife)} ${isotope.unit}</b> · Undecayed <b>${remaining}</b> / ${size} · ${t.toFixed(2)} half-lives`;
}
function drawGraph() {
  const canvas = $('graph-canvas');
  const cssWidth = canvas.clientWidth || 290;
  const cssHeight = cssWidth * 190 / 290;
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  if (canvas.width !== Math.round(cssWidth * ratio)) {
    canvas.width = Math.round(cssWidth * ratio);
    canvas.height = Math.round(cssHeight * ratio);
  }
  const ctx = canvas.getContext('2d');
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  ctx.clearRect(0, 0, cssWidth, cssHeight);
  const small = cssWidth < 220;
  const { css } = palette;
  const font = `${small ? 8 : 10}px ${css.font || 'monospace'}`;
  const left = small ? 26 : 36;
  const right = 16;
  const top = 10;
  const bottom = small ? 22 : 30;
  const w = cssWidth - left - right;
  const h = cssHeight - top - bottom;
  const { size, isotope } = sample;
  const x = t => left + t / MAX_HALF_LIVES * w;
  const y = n => top + h - n / size * h;
  ctx.font = font;
  ctx.lineWidth = 1;
  // Half-life guides: N0/2 after one half-life, N0/4 after two, N0/8 after three.
  ctx.strokeStyle = css.border;
  ctx.setLineDash([3, 3]);
  for (let k = 1; k <= 3; k++) {
    const n = size / 2 ** k;
    ctx.beginPath();
    ctx.moveTo(left, y(n));
    ctx.lineTo(x(k), y(n));
    ctx.lineTo(x(k), top + h);
    ctx.stroke();
  }
  // Expected curve.
  ctx.strokeStyle = css.secondary;
  ctx.setLineDash([5, 4]);
  ctx.beginPath();
  for (let i = 0; i <= 120; i++) {
    const t = i / 120 * MAX_HALF_LIVES;
    const px = x(t);
    const py = y(size / 2 ** t);
    if (i) ctx.lineTo(px, py);
    else ctx.moveTo(px, py);
  }
  ctx.stroke();
  ctx.setLineDash([]);
  // Axes and ticks.
  ctx.strokeStyle = css.secondary;
  ctx.fillStyle = css.secondary;
  ctx.beginPath();
  ctx.moveTo(left, top);
  ctx.lineTo(left, top + h);
  ctx.lineTo(left + w, top + h);
  ctx.stroke();
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  for (const n of [size, size / 2, size / 4]) ctx.fillText(String(n), left - 4, y(n));
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  for (let k = 0; k <= MAX_HALF_LIVES; k += small ? 2 : 1) ctx.fillText(k === 0 ? '0' : formatTime(k * isotope.halfLife), x(k), top + h + 3);
  ctx.textAlign = 'right';
  ctx.fillText(`t / ${isotope.unit}`, left + w, top + h + (small ? 11 : 15));
  ctx.save();
  ctx.translate(small ? 7 : 9, top + h / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('undecayed', 0, 0);
  ctx.restore();
  // Measured count.
  ctx.strokeStyle = css.undecayed;
  ctx.lineWidth = 2;
  ctx.beginPath();
  sample.history.forEach(([t, n], i) => (i ? ctx.lineTo(x(t), y(n)) : ctx.moveTo(x(t), y(n))));
  ctx.lineTo(x(sample.t), y(sample.remaining));
  ctx.stroke();
  ctx.fillStyle = css.undecayed;
  ctx.beginPath();
  ctx.arc(x(sample.t), y(sample.remaining), 3, 0, Math.PI * 2);
  ctx.fill();
  const label = `Measured count; dashed: expected curve. After ${sample.t.toFixed(2)} half-lives, ${sample.remaining} of ${size} remain.`;
  canvas.setAttribute('aria-label', label);
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
  const spherical = new THREE.Spherical().setFromVector3(camera.position.clone().sub(controls.target));
  spherical.theta += dTheta;
  spherical.phi = THREE.MathUtils.clamp(spherical.phi + dPhi, 0.1, Math.PI - 0.1);
  spherical.radius = THREE.MathUtils.clamp(spherical.radius * zoom, controls.minDistance, controls.maxDistance);
  camera.position.setFromSpherical(spherical).add(controls.target);
  controls.update();
}
controls.addEventListener('start', () => { cameraTween = null; });
function fitDistance(halfWidth) {
  // Keep the given half-width in view on narrow (portrait) viewers.
  const halfHeight = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  return halfWidth / (halfHeight * Math.min(1, camera.aspect));
}
function resetView() {
  cameraTween = null;
  controls.reset();
  if (test) {
    const radius = nucleus.radius;
    const end = test.slabs[2].end;
    controls.target.set((end - radius) / 2, 0, 0);
    camera.position.copy(new THREE.Vector3(0.12, 0.38, 1).normalize().multiplyScalar(fitDistance((end + radius) / 2 + 0.5))).add(controls.target);
  } else {
    const direction = state.mode === 'halflife' ? new THREE.Vector3(0, 1.6, 1) : new THREE.Vector3(0, 1.2, 9);
    // Portrait half-life views frame the tray more tightly and lift it clear of the legend.
    const portraitSample = state.mode === 'halflife' && camera.aspect < 1;
    if (portraitSample) controls.target.set(0, -0.5, 0.5);
    camera.position.copy(direction.normalize().multiplyScalar(fitDistance(portraitSample ? 3.1 : HOME_HALF_WIDTH[state.mode]))).add(controls.target);
  }
  controls.update();
  select(null);
}

// ---------- Selection and picking ----------
function select(object, text) {
  halo.removeFromParent();
  if (object && !object.isLine) {
    const radius = object.userData.radius || 0.2;
    halo.scale.setScalar(radius * 1.55 + 0.04);
    object.add(halo);
  }
  if (text) readout.textContent = text;
}
function describe(kind) {
  if ((kind === 'proton' || kind === 'neutron') && nucleus) {
    const { protons, neutrons } = countKinds();
    const done = decay?.phase === 'done';
    const current = done ? MODES[state.mode].daughter : MODES[state.mode].parent;
    return `${PARTICLES[kind]} This nucleus: ${protons} protons + ${neutrons} neutrons (${current.name}).`;
  }
  return PARTICLES[kind];
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
  for (const item of pickables) {
    const centre = item.object.userData.centre;
    if (centre) worldPosition.copy(centre).applyMatrix4(stage.matrixWorld);
    else item.object.getWorldPosition(worldPosition);
    item.object.getWorldScale(worldScale);
    projected.copy(worldPosition).project(camera);
    if (projected.z > 1) continue;
    const depth = camera.position.distanceTo(worldPosition);
    const radius = (item.radius || item.object.userData.radius || 0.1) * worldScale.x * pixelsPerUnit / Math.max(depth, 0.01);
    const distance = Math.hypot((projected.x + 1) / 2 * rect.width - x, (1 - projected.y) / 2 * rect.height - y);
    // Generous hit area: at least a 48px target around small markers.
    if (distance > Math.max(radius + 6, 24)) continue;
    const direct = distance <= radius;
    const score = direct ? depth - 1000 : distance;
    if (!best || score < best.score) best = { item, score };
  }
  return best?.item;
}
let pointerStart = null;
renderer.domElement.addEventListener('pointerdown', event => { pointerStart = [event.clientX, event.clientY]; });
renderer.domElement.addEventListener('pointerup', event => {
  if (!pointerStart || Math.hypot(event.clientX - pointerStart[0], event.clientY - pointerStart[1]) > 6) return;
  pointerStart = null;
  const item = pick(event.clientX, event.clientY);
  if (!item) return;
  select(['paper', 'aluminium', 'lead'].includes(item.kind) ? null : item.object, describe(item.kind));
});
renderer.domElement.addEventListener('pointermove', event => {
  if (event.pointerType !== 'mouse' || event.buttons) return;
  viewer.classList.toggle('is-hovering', Boolean(pick(event.clientX, event.clientY)));
});
renderer.domElement.addEventListener('pointerleave', () => viewer.classList.remove('is-hovering'));

// ---------- Controls ----------
function setPlaying(playing) {
  state.playing = playing;
  updateMotionButton();
}
function updateMotionButton() {
  const running = state.mode === 'halflife' ? Boolean(sample?.running) : state.playing;
  const button = $('motion');
  button.setAttribute('aria-pressed', String(running));
  $('motion-label').textContent = state.mode === 'halflife'
    ? (running ? 'Pause decay' : sample && sample.t > 0 ? 'Continue decay' : 'Start decay')
    : (running ? 'Pause motion' : 'Play motion');
  $('motion-icon').setAttribute('d', running ? 'M7 5h3v14H7zM14 5h3v14h-3z' : 'M8 5v14l11-7z');
}
$('motion').addEventListener('click', () => {
  if (state.mode === 'halflife') setSampleRunning(!sample.running);
  else setPlaying(!state.playing);
});
$('reset').addEventListener('click', resetView);
$('decay').addEventListener('click', () => {
  if (decay?.phase === 'done') {
    buildMode(false);
    readout.textContent = DEFAULT_READOUT[state.mode]();
  } else {
    startDecay();
  }
});
$('penetration').addEventListener('click', () => (test ? stopTest() : startTest()));
$('step-half').addEventListener('click', () => {
  if (!sample) return;
  const next = Math.floor(sample.t + 1e-6) + 1;
  if (next > MAX_HALF_LIVES) {
    setSampleRunning(true);
    return;
  }
  readout.textContent = `PREDICT FIRST · ${sample.remaining} undecayed now. About ${formatCount(sample.remaining / 2)} should remain after one more half-life.`;
  setSampleRunning(true, next);
});
$('reset-sample').addEventListener('click', () => {
  buildMode(false);
  readout.textContent = DEFAULT_READOUT.halflife();
});
for (const id of ['isotope', 'sample-size']) {
  $(id).addEventListener('change', () => {
    buildMode(false);
    readout.textContent = DEFAULT_READOUT.halflife();
  });
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
    Home: resetView,
    0: resetView
  };
  if (!actions[event.key]) return;
  event.preventDefault();
  actions[event.key]();
});

// ---------- Mode selection ----------
const DEFAULT_READOUT = {
  alpha: () => 'AMERICIUM-241 · 95 protons + 146 neutrons. Tap a particle, or press “Decay this nucleus”.',
  beta: () => 'CARBON-14 · 6 protons + 8 neutrons. Too many neutrons makes it unstable. Press “Decay this nucleus”.',
  gamma: () => 'TECHNETIUM-99m · 43 protons + 56 neutrons, with extra energy (an excited state). Press “Decay this nucleus”.',
  halflife: () => {
    const isotope = ISOTOPES[$('isotope').value];
    return `${isotope.name.toUpperCase()} · Half-life ${formatTime(isotope.halfLife)} ${isotope.unitName}. Press “Start decay” or “Run one half-life”.`;
  }
};
const LEGEND = {
  alpha: ['proton', 'neutron', 'alpha'],
  beta: ['proton', 'neutron', 'electron', 'antineutrino'],
  gamma: ['proton', 'neutron', 'gamma'],
  halflife: ['undecayed', 'decayed']
};
function buildMode(animate) {
  clearStage();
  const halfLife = state.mode === 'halflife';
  $('graph').hidden = !halfLife;
  $('beam-stats').hidden = true;
  $('penetration').setAttribute('aria-pressed', 'false');
  $('penetration').textContent = 'Test penetration';
  if (halfLife) buildSample();
  else buildNucleus(state.mode);
  renderEquation(false);
  updateDecayButton();
  updateMotionButton();
  if (animate) fadeIn = { t: 0 };
}
function selectMode(mode, animate = true) {
  const previous = state.mode;
  state.mode = mode;
  const data = MODES[mode];
  const halfLife = mode === 'halflife';
  document.body.dataset.mode = mode;
  cameraTween = null;
  buildMode(animate && previous !== mode);
  document.querySelectorAll('[data-legend]').forEach(item => { item.hidden = !LEGEND[mode].includes(item.dataset.legend); });
  if (halfLife) {
    const emits = ISOTOPES[$('isotope').value].emits;
    document.querySelector(`[data-legend="${emits === 'alpha' ? 'alpha' : 'electron'}"]`).hidden = false;
  }
  $('decay').hidden = halfLife;
  $('penetration').hidden = halfLife;
  $('step-half').hidden = !halfLife;
  $('reset-sample').hidden = !halfLife;
  $('sample-controls').hidden = !halfLife;
  $('action-hint').textContent = data.hint;
  readout.textContent = DEFAULT_READOUT[mode]();
  for (const [id, key] of Object.entries({ 'scene-title': 'title', 'mode-date': 'date', 'mode-heading': 'heading', description: 'description', look: 'look', evidence: 'evidence' })) $(id).textContent = data[key];
  document.querySelectorAll('.models [data-mode]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.mode === mode)));
  viewer.setAttribute('aria-label', `${data.title}. ${data.description} Drag or use arrow keys to rotate; scroll, pinch or plus and minus keys to zoom.`);
  quiz.show(mode);
  resetView();
}
document.querySelectorAll('.models [data-mode]').forEach(button => button.addEventListener('click', () => {
  if (button.dataset.mode !== state.mode) selectMode(button.dataset.mode);
}));
$('isotope').addEventListener('change', () => {
  const emits = ISOTOPES[$('isotope').value].emits;
  document.querySelector('[data-legend="alpha"]').hidden = emits !== 'alpha';
  document.querySelector('[data-legend="electron"]').hidden = emits === 'alpha';
});

// ---------- Progress ----------
const progress = loadProgress();
const quiz = new Quiz($('mode-quiz'), { questionSets: QUESTIONS, progress, title: '✦ Unlock this discovery', completeText: '✦ Discovery unlocked!', onChange: updateProgress });
const finalQuiz = new Quiz($('final-quiz'), { questionSets: QUESTIONS, progress, title: '✦ Final challenge', completeText: 'Nucleus expert!', completeIcon: 'trophy', onChange: updateProgress });
function updateProgress() {
  saveProgress(progress);
  const unlocked = MODE_ORDER.filter(mode => setSummary(progress, mode, QUESTIONS[mode]).complete);
  const sets = [...MODE_ORDER, 'final'];
  const stars = sets.reduce((sum, key) => sum + setSummary(progress, key, QUESTIONS[key]).stars, 0);
  const total = sets.reduce((sum, key) => sum + QUESTIONS[key].length, 0);
  const finalDone = setSummary(progress, 'final', QUESTIONS.final).complete;
  $('progress').textContent = `${unlocked.length} / 4 discoveries unlocked · ★ ${stars} / ${total}${finalDone ? ' · Nucleus expert!' : ''}`;
  document.querySelectorAll('.models [data-mode]').forEach(button => {
    const done = unlocked.includes(button.dataset.mode);
    button.toggleAttribute('data-unlocked', done);
    button.querySelector('span').textContent = `${button.querySelector('span').textContent.replace(' ✓', '')}${done ? ' ✓' : ''}`;
  });
  const open = unlocked.length === MODE_ORDER.length;
  const finalQuizElement = $('final-quiz');
  if (open && finalQuizElement.hidden) finalQuiz.show('final');
  finalQuizElement.hidden = !open;
  document.querySelector('.final-challenge').classList.toggle('is-locked', !open);
  $('final-status').textContent = open
    ? 'You have explored every kind of decay. Use equations, penetration and half-life together.'
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
  if (sample) {
    recolourSample();
    drawGraph();
    return;
  }
  const hadTest = Boolean(test);
  const wasDone = decay?.phase === 'done';
  buildMode(false);
  if (hadTest) startTest();
  else readout.textContent = wasDone ? 'The theme changed, so the nucleus was reset. Decay it again to see the change.' : DEFAULT_READOUT[state.mode]();
});
document.fonts?.ready.then(() => {
  // Redraw canvas labels once the mono font has loaded.
  if (sample) drawGraph();
  else if (!decay && !test) buildMode(false);
});

// ---------- Rendering ----------
function resize() {
  // Measure the canvas itself: on phones the half-life graph sits above it inside the viewer.
  const { clientWidth: width, clientHeight: height } = renderer.domElement;
  if (!width || !height) return;
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  if (sample) drawGraph();
}
const resizeObserver = new ResizeObserver(resize);
resizeObserver.observe(viewer);
resizeObserver.observe(renderer.domElement);
resize();
new IntersectionObserver(entries => { state.visible = entries[entries.length - 1].isIntersecting; }).observe(viewer);
renderer.domElement.addEventListener('webglcontextlost', event => {
  event.preventDefault();
  $('load-status').hidden = false;
  $('load-status').textContent = 'The 3D view was interrupted. Reload this page to restore it.';
});

setPlaying(state.playing);
updateProgress();
selectMode('alpha', false);
$('load-status').hidden = true;
let previousTime = performance.now();
renderer.setAnimationLoop(frame);
function frame(time) {
  const delta = Math.min((time - previousTime) / 1000, 0.05);
  previousTime = time;
  if (!state.visible || document.hidden) return;
  if (state.playing) {
    state.time += delta;
    stepNucleus(delta);
    stepDecay(delta);
    stepFlyers(delta);
    stepTest(delta);
  }
  stepSample(delta);
  if (fadeIn) {
    fadeIn.t += delta;
    const k = Math.min(1, fadeIn.t / TRANSITION_TIME);
    stage.scale.setScalar(0.85 + 0.15 * ease(k));
    if (k >= 1) fadeIn = null;
  }
  stepCamera(delta);
  if (halo.parent) halo.material.opacity = 0.28 + 0.14 * Math.sin(time / 220);
  controls.update();
  renderer.render(scene, camera);
}
