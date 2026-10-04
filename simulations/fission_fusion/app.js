import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { MODES, MODE_ORDER, PARTICLES, NUCLIDES, CURVE, REACTIONS, QUESTIONS } from './content.js';
import { Quiz, loadProgress, saveProgress, setSummary } from './quiz.js';

const $ = id => document.getElementById(id);
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const state = {
  mode: 'fission',
  playing: !reducedMotion,
  time: 0,
  visible: true
};

// Display sizes are in scene units. Markers are enlarged and not to scale.
const NUCLEON_RADIUS = 0.17;
const FUSION_RADIUS = 0.42;
const TRANSITION_TIME = 0.6;
// Half-width and half-height of what each 3D view must keep in frame.
const HOME_EXTENT = { fission: { w: 4.6, h: 4.9 }, chain: { w: 4.8, h: 4.8 }, fusion: { w: 4.8, h: 3.2 } };
// The fission view looks slightly above the nucleus so the fragments stay clear of the equation panel.
const HOME_TARGET = { fission: [0, 0.6, 0], chain: [0, 0, 0], fusion: [0, 0, 0] };
const HOME_DIRECTION = { fission: [0, 0.3, 1], chain: [0.6, 0.5, 1], fusion: [0, 0.2, 1] };

// Fission: one exact 236-nucleon nucleus. Times are in seconds.
const FISSION = {
  approachSpeed: 2.4,
  startGap: 2.8,
  wobbleTime: 2.2,
  stretchTime: 1.1,
  separateTime: 2.6,
  packTime: 1.2,
  travel: 3.2, // total distance the two fragments move apart
  krSide: 92 / 233, // the lighter fragment moves further (momentum is conserved)
  neutronSpeed: 3.2,
  gammaSpeed: 5
};

// Chain reaction: a block of fuel nuclei, spacing in scene units.
const CHAIN = {
  N: 7,
  spacing: 0.58,
  nucleusRadius: 0.17,
  capture: 0.28, // how close a neutron must pass to be absorbed (a cross-section, not a size)
  rodAbsorb: 0.36,
  rodDrawRadius: 0.09,
  neutronSpeed: 3.2,
  maxNeutrons: 700,
  meanNeutrons: 2.4,
  escapeRadius: 3.6,
  binTime: 0.5,
  maxRods: 6,
  burst: 5
};
// Rod positions in units of the spacing: they sit in the gaps between fuel columns.
const ROD_SITES = [[0.5, 0.5], [-0.5, -0.5], [0.5, -0.5], [-0.5, 0.5], [1.5, -1.5], [-1.5, 1.5]];

// Fusion: two repelling nuclei in a classical model. Energy is in units of the barrier height.
const FUSION = {
  startSeparation: 7,
  contact: 1.3, // centre-to-centre distance at which the strong force takes over
  mu: 0.1, // scaled reduced mass, sets the on-screen speed
  criticalTemp: 100, // million °C at which the nuclei just reach contact
  massD: 2,
  massT: 3,
  mergeTime: 0.6,
  neutronSpeed: 5,
  heliumSpeed: 1.25,
  minTemp: 10,
  maxTemp: 200
};

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
// In wide fullscreen the controls move to the top of the right-hand column, above the explanation.
function placeControls() {
  const inSide = workspace.classList.contains('is-fullscreen') && wideQuery.matches;
  if (inSide && sideControls.parentElement !== sideAside) sideAside.prepend(sideControls);
  else if (!inSide && sideControls.parentElement !== viewerPanel) viewerPanel.append(sideControls);
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
    ? 'M9 4v5H4M20 9h-5V4M15 20v-5h5M4 15h5v5'
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
controls.maxDistance = 40;
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
let chain = null;
let fusion = null;
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
    photon: color('--photon'),
    fuel: color('--undecayed'),
    spent: color('--decayed'),
    u238: color('--aluminium'),
    rod: color('--lead'),
    line: color('--text-secondary'),
    accent: color('--brand-accent'),
    flash: new THREE.Color(0xffb020),
    css: {
      text: css('--text-main'),
      secondary: css('--text-secondary'),
      border: css('--card-border'),
      proton: css('--proton'),
      neutron: css('--neutron'),
      photon: css('--photon'),
      accent: css('--brand-accent-strong'),
      primary: css('--brand-primary'),
      fuel: css('--undecayed'),
      spent: css('--decayed'),
      green: css('--correct-border'),
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
function glow(color, size, opacity = palette.dark ? 0.6 : 0.3) {
  const material = new THREE.SpriteMaterial({ map: glowTexture, color, transparent: true, opacity, depthWrite: false, blending: palette.dark ? THREE.AdditiveBlending : THREE.NormalBlending });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(size, size, 1);
  sprite.raycast = () => {};
  return sprite;
}
// Proton and neutron materials and textures are shared by a whole build.
function nucleonMaterials() {
  const materials = {};
  for (const kind of ['proton', 'neutron']) {
    materials[kind] = new THREE.MeshStandardMaterial({ color: 0xffffff, map: symbolTexture(palette[kind], kind === 'proton' ? '+' : '0'), roughness: 0.3, metalness: 0.15, emissive: palette[kind], emissiveIntensity: 0.04 });
  }
  return materials;
}
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
function makeWave(color, opacity = 0.95) {
  const line = new THREE.Mesh(waveRibbonGeometry(), new THREE.MeshBasicMaterial({ color, transparent: true, opacity, side: THREE.DoubleSide }));
  line.frustumCulled = false;
  line.userData.radius = 0.35;
  return line;
}
function drawWave(line, centre, direction, time, length = 1.1) {
  const view = camera.position.clone().sub(centre).normalize();
  const side = new THREE.Vector3().crossVectors(direction, view);
  if (side.lengthSq() < 1e-4) side.set(0, 1, 0);
  side.normalize();
  for (let i = 0; i < WAVE_POINTS; i++) {
    const s = (i / (WAVE_POINTS - 1) - 0.5) * length;
    const envelope = Math.cos(Math.PI * s / length) ** 2;
    const wave = 0.12 * envelope * Math.sin(s / length * Math.PI * 12 - time * 18);
    wavePoints[i].set(centre.x + direction.x * s + side.x * wave, centre.y + direction.y * s + side.y * wave, centre.z + direction.z * s + side.z * wave);
  }
  setWaveRibbon(line.geometry, wavePoints, view);
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
function easeOut(k) {
  return 1 - (1 - k) ** 3;
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
const FLOOR = { fission: [-3.4, 3.4], chain: [-2.5, 3.4], fusion: [-1.8, 5.2] };

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
  pickables = [];
  flyers = [];
  nucleus = null;
  decay = null;
  chain = null;
  fusion = null;
  stage.position.set(0, 0, 0);
}

// ---------- Packing ----------
// Closest-packed (FCC) lattice sites nearest the centre, lightly jittered, so nucleons touch as in a real nucleus.
function packNucleus(count, seed, radius) {
  const rand = random(seed);
  const edge = radius * 2 * 0.97 * Math.SQRT2;
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
  const points = sites.slice(0, count).map(({ point }) => point.add(new THREE.Vector3(rand() - 0.5, rand() - 0.5, rand() - 0.5).multiplyScalar(0.025)));
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

// ---------- Nuclear equation ----------
function nuclideHTML({ A, Z, symbol }, className = '') {
  return `<span class="nuclide ${className}"><span class="nums"><span>${A}</span><span>${Z}</span></span>${symbol}</span>`;
}
const NEUTRON = { A: 1, Z: 0, symbol: 'n' };
const EQUATIONS = {
  fission: {
    parts: [{ A: 235, Z: 92, symbol: 'U' }, NEUTRON],
    products: [{ A: 141, Z: 56, symbol: 'Ba' }, { A: 92, Z: 36, symbol: 'Kr' }, { coef: 3, ...NEUTRON }],
    check: 'Top: 235 + 1 = 141 + 92 + 3 <b>✓</b> · Bottom: 92 + 0 = 56 + 36 + 0 <b>✓</b>',
    label: 'Nuclear equation: uranium-235 plus a neutron gives barium-141, krypton-92 and 3 neutrons. Mass numbers: 235 plus 1 equals 141 plus 92 plus 3. Atomic numbers: 92 plus 0 equals 56 plus 36 plus 0.',
    unknown: 'Nuclear equation: uranium-235 plus a neutron gives unknown products.'
  },
  fusion: {
    parts: [{ A: 2, Z: 1, symbol: 'H' }, { A: 3, Z: 1, symbol: 'H' }],
    products: [{ A: 4, Z: 2, symbol: 'He' }, NEUTRON],
    check: 'Top: 2 + 3 = 4 + 1 <b>✓</b> · Bottom: 1 + 1 = 2 + 0 <b>✓</b>',
    label: 'Nuclear equation: hydrogen-2 plus hydrogen-3 gives helium-4 plus a neutron. Mass numbers: 2 plus 3 equals 4 plus 1. Atomic numbers: 1 plus 1 equals 2 plus 0.',
    unknown: 'Nuclear equation: hydrogen-2 plus hydrogen-3 gives an unknown product.'
  }
};
function termsHTML(terms) {
  return terms.map(term => (term.coef ? `<span class="coef">${term.coef}</span>` : '') + nuclideHTML(term, term.symbol === 'n' ? 'neutron' : '')).join('<span>+</span>');
}
function renderEquation(done) {
  const data = EQUATIONS[state.mode];
  const box = $('equation');
  if (!data) {
    box.hidden = true;
    return;
  }
  box.hidden = false;
  const left = termsHTML(data.parts);
  if (!done) {
    box.innerHTML = `<div class="eq">${left}<span>→</span><span class="nuclide unknown">?</span></div><div class="check">${state.mode === 'fission' ? 'Split the nucleus' : 'Fuse the nuclei'} to complete the equation</div>`;
    box.setAttribute('aria-label', data.unknown);
    return;
  }
  box.innerHTML = `<div class="eq">${left}<span>→</span>${termsHTML(data.products)}</div><div class="check">${data.check}</div>`;
  box.setAttribute('aria-label', data.label);
}

// ---------- Flyers (particles leaving the reaction) ----------
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
// A short-lived burst of light that grows and fades.
function flash(position, size, duration = 0.7) {
  const sprite = glow(palette.flash, size, palette.dark ? 0.95 : 0.8);
  sprite.position.copy(position);
  sprite.material.blending = THREE.AdditiveBlending;
  let t = 0;
  addFlyer(sprite, delta => {
    t += delta;
    const k = Math.min(1, t / duration);
    sprite.scale.setScalar(size * (0.5 + 0.9 * easeOut(k)));
    sprite.material.opacity = (palette.dark ? 0.95 : 0.8) * (1 - k);
    return k < 1;
  });
}
// ====================================================================
// Fission
// ====================================================================
function buildFission() {
  const R = NUCLEON_RADIUS;
  const points = packNucleus(236, 1663, R);
  const order = points.map((_, i) => i).sort((a, b) => points[a].y - points[b].y);
  // Three nucleons near the waist become the neutrons that are released; the rest split 141 (barium) and 92 (krypton).
  const candidates = order.slice(136, 147);
  const byX = [...candidates].sort((a, b) => points[a].x - points[b].x);
  const incoming = byX[0];
  const out1 = byX[byX.length - 1];
  const out2 = byX.filter(i => i !== incoming && i !== out1).sort((a, b) => points[b].z - points[a].z)[0];
  const neck = [incoming, out1, out2];
  const others = order.filter(i => !neck.includes(i));
  const group = new Array(236);
  others.forEach((slot, k) => { group[slot] = k < 141 ? 'ba' : 'kr'; });
  neck.forEach(slot => { group[slot] = 'neck'; });
  const kinds = new Array(236);
  const assign = (slots, protons, neutrons, seed) => {
    const list = shuffledKinds(protons, neutrons, seed);
    slots.forEach((slot, i) => { kinds[slot] = list[i]; });
  };
  assign(others.filter(slot => group[slot] === 'ba'), 56, 85, 5);
  assign(others.filter(slot => group[slot] === 'kr'), 36, 56, 6);
  neck.forEach(slot => { kinds[slot] = 'neutron'; });
  const y0 = (points[others[140]].y + points[others[141]].y) / 2;

  const geometry = new THREE.SphereGeometry(R, 18, 13);
  const materials = nucleonMaterials();
  const rand = random(236);
  const holder = new THREE.Group();
  stage.add(holder);
  const make = slot => {
    const mesh = new THREE.Mesh(geometry, materials[kinds[slot]]);
    mesh.position.copy(points[slot]);
    mesh.rotation.y = slot * 0.9;
    mesh.userData.radius = R;
    holder.add(mesh);
    const record = { mesh, home: points[slot].clone(), kind: kinds[slot], group: group[slot], side: group[slot] === 'kr' ? 1 : group[slot] === 'ba' ? -1 : 0, phase: rand() * Math.PI * 2, axis: randomDirection(rand), current: new THREE.Vector3() };
    record.pick = { object: mesh, kind: kinds[slot], nucleon: record };
    pickables.push(record.pick);
    return record;
  };
  const nucleons = [];
  for (let slot = 0; slot < 236; slot++) if (slot !== incoming) nucleons.push(make(slot));
  const waiting = make(incoming);
  waiting.mesh.position.x -= FISSION.startGap;
  waiting.glowSprite = glow(palette.neutron, 0.7, palette.dark ? 0.5 : 0.25);
  waiting.mesh.add(waiting.glowSprite);
  waiting.name = 'incoming';
  const radius = Math.max(...points.map(point => point.length())) + R;
  const glowSprite = glow(palette.photon, radius * 3.4, 0);
  stage.add(glowSprite);
  const label = labelSprite('U-235', palette.line, 1.5);
  label.position.set(0, radius + 0.45, 0);
  stage.add(label);
  nucleus = { group: holder, nucleons, incoming: waiting, radius, materials, geometry, glow: glowSprite, label, y0, deform: { stretch: 1, pinch: 0, gap: 0 }, jiggle: 0.012, excited: false, split: false, fragments: [] };
  floorShadow.position.y = FLOOR.fission[0];
  floorShadow.scale.setScalar(FLOOR.fission[1] / 1.4);
}
function setLabel(text) {
  const old = nucleus.label;
  const label = labelSprite(text, palette.line, old.scale.x);
  label.position.copy(old.position);
  disposeObject(old);
  old.removeFromParent();
  stage.add(label);
  nucleus.label = label;
}
const scratch = new THREE.Vector3();
// Where a nucleon of the whole nucleus sits while it wobbles, stretches and pinches.
function nucleonPosition(n, out) {
  const d = nucleus.deform;
  out.copy(n.home);
  out.y *= d.stretch;
  const across = 1 / Math.sqrt(d.stretch);
  out.x *= across;
  out.z *= across;
  if (d.pinch) {
    const rel = out.y - nucleus.y0 * d.stretch;
    const f = 1 - d.pinch * Math.exp(-(rel * rel) / 0.5);
    out.x *= f;
    out.z *= f;
  }
  out.y += n.side * d.gap;
  return out;
}
function stepNucleus(delta) {
  if (!nucleus || nucleus.split) return;
  const amplitude = nucleus.jiggle;
  for (const nucleon of nucleus.nucleons) {
    nucleonPosition(nucleon, scratch);
    nucleon.mesh.position.copy(scratch).addScaledVector(nucleon.axis, amplitude * Math.sin(state.time * 9 + nucleon.phase));
  }
  if (nucleus.excited) {
    nucleus.glow.material.opacity = palette.dark ? 0.32 + 0.1 * Math.sin(state.time * 5) : 0.6 + 0.15 * Math.sin(state.time * 5);
  }
}

function startFission() {
  if (!nucleus || decay) return;
  if (!state.playing) setPlaying(true);
  select(null);
  decay = { phase: 'approach', t: 0 };
  readout.textContent = 'SLOW NEUTRON · A neutron has no charge, so it is not repelled by the nucleus and can be absorbed.';
  updateFireButton();
}
function stepDecay(delta) {
  if (!decay || !nucleus || decay.phase === 'done') return;
  decay.t += delta;
  if (decay.phase === 'approach') stepApproach(delta);
  else if (decay.phase === 'wobble') stepWobble();
  else if (decay.phase === 'stretch') stepStretch();
  else if (decay.phase === 'separate') stepSeparate();
}
function stepApproach(delta) {
  const incoming = nucleus.incoming;
  incoming.mesh.position.x += FISSION.approachSpeed * delta;
  if (incoming.mesh.position.x < incoming.home.x) return;
  incoming.mesh.position.copy(incoming.home);
  incoming.glowSprite.removeFromParent();
  disposeObject(incoming.glowSprite);
  nucleus.nucleons.push(incoming);
  nucleus.excited = true;
  setLabel('U-236*');
  decay.phase = 'wobble';
  decay.t = 0;
  readout.textContent = 'URANIUM-236 · The extra neutron makes the nucleus unstable. It wobbles like a drop of liquid. (* means excited.)';
}
function stepWobble() {
  const s = Math.min(1, decay.t / FISSION.wobbleTime);
  nucleus.deform.stretch = 1 + (0.05 + 0.22 * s) * Math.sin(decay.t * 5.5);
  nucleus.jiggle = 0.012 + 0.03 * s;
  if (s >= 1) {
    decay.phase = 'stretch';
    decay.t = 0;
    decay.startStretch = nucleus.deform.stretch;
    readout.textContent = 'STRETCHING · The nucleus elongates and a waist forms. The repulsion between its protons now beats the strong force holding it together.';
  }
}
function stepStretch() {
  // Speed up into the split, so the fragments never look as if they stop before flying apart.
  const k = Math.min(1, decay.t / FISSION.stretchTime) ** 2;
  const d = nucleus.deform;
  d.stretch = decay.startStretch + (1.5 - decay.startStretch) * k;
  d.pinch = 0.55 * k;
  d.gap = 0.5 * k;
  if (k >= 1) splitNucleus();
}
function splitNucleus() {
  const groups = { ba: [], kr: [] };
  const neck = [];
  for (const n of nucleus.nucleons) {
    nucleonPosition(n, n.current);
    (n.group === 'neck' ? neck : groups[n.group]).push(n);
  }
  nucleus.split = true;
  nucleus.glow.material.opacity = 0;
  nucleus.label.visible = false;
  for (const key of ['ba', 'kr']) {
    const list = groups[key];
    const centre = list.reduce((sum, n) => sum.add(n.current), new THREE.Vector3()).divideScalar(list.length);
    const g = new THREE.Group();
    g.position.copy(centre);
    stage.add(g);
    for (const n of list) {
      n.local0 = n.current.clone().sub(centre);
      g.add(n.mesh);
      n.mesh.position.copy(n.local0);
    }
    // Every fragment nucleon moves to a place in a compact, closely packed nucleus.
    const packed = packNucleus(list.length, key === 'ba' ? 141 : 92, NUCLEON_RADIUS).sort((a, b) => a.length() - b.length());
    [...list].sort((a, b) => a.local0.length() - b.local0.length()).forEach((n, i) => { n.pack = packed[i]; });
    const radius = packed[packed.length - 1].length() + NUCLEON_RADIUS;
    const side = key === 'kr' ? 1 : -1;
    const share = key === 'kr' ? FISSION.krSide : 1 - FISSION.krSide;
    const label = labelSprite(key === 'kr' ? 'Kr-92' : 'Ba-141', palette.line, 1.5);
    label.position.set(0, side * (radius + 0.4), 0);
    g.add(label);
    nucleus.fragments.push({ key, list, g, centre, side, distance: FISSION.travel * share });
  }
  // The three neutrons from the waist fly out sideways.
  neck.forEach((n, i) => {
    const direction = new THREE.Vector3(n.home.x, 0.15 * (i - 1), n.home.z).normalize();
    stage.add(n.mesh);
    n.mesh.position.copy(n.current);
    n.mesh.material = n.mesh.material.clone();
    n.mesh.add(glow(palette.neutron, 0.7, palette.dark ? 0.5 : 0.25));
    n.free = true;
    addFlyer(n.mesh, straightFlight(n.mesh, { direction, speed: FISSION.neutronSpeed, range: 4.5 }));
    // Adopt the flyer's pick so the released neutron can still be tapped.
    const flyer = flyers[flyers.length - 1];
    flyer.pick = n.pick;
  });
  nucleus.nucleons = nucleus.nucleons.filter(n => !n.free);
  flash(new THREE.Vector3(0, 0, 0), 7);
  const gammaDirections = [new THREE.Vector3(0.85, 0.25, 0.45).normalize(), new THREE.Vector3(-0.8, 0.2, 0.5).normalize()];
  for (const direction of gammaDirections) {
    const centre = new THREE.Vector3();
    const line = makeWave(palette.photon);
    line.userData.centre = centre;
    addFlyer(line, straightFlight(line, { direction, speed: FISSION.gammaSpeed, range: 6, getPosition: () => centre, move: step => centre.addScaledVector(direction, step), onFrame: () => drawWave(line, centre, direction, state.time) }), 'gamma');
  }
  decay.phase = 'separate';
  decay.t = 0;
  renderEquation(true);
  readout.textContent = 'FISSION · Two smaller nuclei (barium-141 and krypton-92), 3 free neutrons and gamma rays. About 170 MeV of energy is released, mostly as movement of the fragments.';
}
function stepSeparate() {
  const move = easeOut(Math.min(1, decay.t / FISSION.separateTime));
  const pack = ease(Math.min(1, decay.t / FISSION.packTime));
  for (const fragment of nucleus.fragments) {
    fragment.g.position.y = fragment.centre.y + fragment.side * fragment.distance * move;
    for (const n of fragment.list) {
      n.mesh.position.lerpVectors(n.local0, n.pack, pack).addScaledVector(n.axis, 0.012 * Math.sin(state.time * 9 + n.phase));
    }
  }
  if (decay.t >= FISSION.separateTime) {
    decay.phase = 'done';
    updateFireButton();
    readout.textContent = 'DONE · The fragments stop as they crash into nearby atoms and heat them. That heat is what a nuclear power station uses. Tap a nucleon to see which nucleus it is in.';
  }
}

// ====================================================================
// Chain reaction
// ====================================================================
const dummy = new THREE.Object3D();
const tint = new THREE.Color();
function buildChain() {
  const { N, spacing, nucleusRadius } = CHAIN;
  const half = (N - 1) / 2;
  const total = N ** 3;
  const fraction = Number($('enrichment').value);
  const rand = random(91);
  const order = Array.from({ length: total }, (_, i) => i);
  for (let i = total - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  const fissile = Math.round(fraction * total);
  // 0 = uranium-235 that has not split, 1 = uranium-238, 2 = spent.
  const states = new Uint8Array(total).fill(1);
  for (let i = 0; i < fissile; i++) states[order[i]] = 0;
  const fuel = new THREE.InstancedMesh(new THREE.SphereGeometry(nucleusRadius, 20, 14), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.35, metalness: 0.1 }), total);
  fuel.frustumCulled = false;
  for (let i = 0; i < total; i++) {
    const ix = i % N;
    const iy = Math.floor(i / N) % N;
    const iz = Math.floor(i / (N * N));
    dummy.position.set((ix - half) * spacing, (iy - half) * spacing, (iz - half) * spacing);
    dummy.updateMatrix();
    fuel.setMatrixAt(i, dummy.matrix);
    fuel.setColorAt(i, states[i] === 0 ? palette.fuel : palette.u238);
  }
  stage.add(fuel);

  // Faint outline of the block of fuel.
  const edge = N * spacing;
  const box = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(edge, edge, edge)), new THREE.LineBasicMaterial({ color: palette.line, transparent: true, opacity: 0.4 }));
  box.raycast = () => {};
  stage.add(box);

  // Control rods slide down from the top through the gaps between fuel columns.
  const top = edge / 2 + 0.2;
  const length = edge + 0.4;
  const rodGeometry = new THREE.CylinderGeometry(CHAIN.rodDrawRadius, CHAIN.rodDrawRadius, 1, 16);
  const rodMaterial = new THREE.MeshStandardMaterial({ color: palette.rod, roughness: 0.5, metalness: 0.3 });
  const capGeometry = new THREE.CylinderGeometry(CHAIN.rodDrawRadius + 0.035, CHAIN.rodDrawRadius + 0.035, 0.05, 16);
  const rods = ROD_SITES.map(([a, b], i) => {
    const mesh = new THREE.Mesh(rodGeometry, rodMaterial);
    mesh.scale.y = 0.0001;
    mesh.position.set(a * spacing, top, b * spacing);
    mesh.raycast = () => {};
    stage.add(mesh);
    const cap = new THREE.Mesh(capGeometry, rodMaterial);
    cap.position.set(a * spacing, top + 0.03, b * spacing);
    cap.raycast = () => {};
    stage.add(cap);
    return { mesh, x: a * spacing, z: b * spacing, insertion: 0, target: i < rodCount ? 1 : 0 };
  });

  const neutrons = new THREE.InstancedMesh(new THREE.SphereGeometry(0.085, 10, 8), new THREE.MeshBasicMaterial({ color: palette.neutron }), CHAIN.maxNeutrons);
  neutrons.count = 0;
  neutrons.frustumCulled = false;
  stage.add(neutrons);
  const flashes = Array.from({ length: 40 }, () => {
    const sprite = glow(palette.flash, 1, 0);
    sprite.material.blending = THREE.AdditiveBlending;
    sprite.visible = false;
    stage.add(sprite);
    return { sprite, t: 1 };
  });
  chain = {
    N, half, spacing, states, fuel, rods, top, length, neutrons, flashes,
    pos: new Float32Array(CHAIN.maxNeutrons * 3),
    vel: new Float32Array(CHAIN.maxNeutrons * 3),
    gen: new Uint16Array(CHAIN.maxNeutrons),
    count: 0, t: 0, fissions: 0, fissile, started: false, over: false,
    fates: { fission: 0, u238: 0, rod: 0, escaped: 0 },
    bins: [0], generations: [0], statsClock: 0
  };
  floorShadow.position.y = FLOOR.chain[0];
  floorShadow.scale.setScalar(FLOOR.chain[1] / 1.4);
}
let rodCount = 0;
function setRods(count) {
  rodCount = THREE.MathUtils.clamp(count, 0, CHAIN.maxRods);
  $('rods-out').textContent = `${rodCount} of ${CHAIN.maxRods}`;
  $('rods-minus').disabled = rodCount <= 0;
  $('rods-plus').disabled = rodCount >= CHAIN.maxRods;
  if (chain) chain.rods.forEach((rod, i) => { rod.target = i < rodCount ? 1 : 0; });
}
function spawnNeutron(x, y, z, vx, vy, vz, gen) {
  const c = chain;
  if (c.count >= CHAIN.maxNeutrons) return;
  const b = c.count * 3;
  c.pos[b] = x; c.pos[b + 1] = y; c.pos[b + 2] = z;
  c.vel[b] = vx; c.vel[b + 1] = vy; c.vel[b + 2] = vz;
  c.gen[c.count] = gen;
  c.count += 1;
}
function removeNeutron(i) {
  const c = chain;
  const last = c.count - 1;
  if (i !== last) {
    for (let k = 0; k < 3; k++) {
      c.pos[i * 3 + k] = c.pos[last * 3 + k];
      c.vel[i * 3 + k] = c.vel[last * 3 + k];
    }
    c.gen[i] = c.gen[last];
  }
  c.count = last;
}
function fireBurst() {
  const c = chain;
  if (!c) return;
  if (!state.playing) setPlaying(true);
  const targets = [];
  c.states.forEach((value, i) => { if (value === 0) targets.push(i); });
  if (!targets.length) {
    readout.textContent = 'There is no unsplit uranium-235 left. Reset to load fresh fuel.';
    return;
  }
  // Fire along +x at randomly chosen uranium-235 nuclei, spaced out so they arrive one after another.
  for (let k = 0; k < CHAIN.burst; k++) {
    const i = targets[Math.floor(Math.random() * targets.length)];
    const iy = Math.floor(i / c.N) % c.N;
    const iz = Math.floor(i / (c.N * c.N));
    spawnNeutron(-CHAIN.escapeRadius - k * 0.3, (iy - c.half) * c.spacing, (iz - c.half) * c.spacing, CHAIN.neutronSpeed, 0, 0, 0);
  }
  c.started = true;
  c.over = false;
  updateFireButton();
  readout.textContent = 'NEUTRON SOURCE · 5 neutrons enter the block from the left. Each one that hits uranium-235 causes a fission.';
}
function fissionAt(index, x, y, z, gen) {
  const c = chain;
  c.states[index] = 2;
  c.fuel.setColorAt(index, palette.spent);
  c.fuel.instanceColor.needsUpdate = true;
  c.fissions += 1;
  c.generations[gen] = (c.generations[gen] || 0) + 1;
  const bin = Math.floor(c.t / CHAIN.binTime);
  while (c.bins.length <= bin) c.bins.push(0);
  c.bins[bin] += 1;
  const slot = c.flashes.find(item => item.t >= 1);
  if (slot) {
    slot.t = 0;
    slot.sprite.position.set(x, y, z);
    slot.sprite.visible = true;
  }
  const released = Math.random() < CHAIN.meanNeutrons - 2 ? 3 : 2;
  for (let k = 0; k < released; k++) {
    const v = randomDirection().multiplyScalar(CHAIN.neutronSpeed * (0.85 + 0.3 * Math.random()));
    spawnNeutron(x, y, z, v.x, v.y, v.z, gen + 1);
  }
}
function stepChain(delta) {
  const c = chain;
  if (!c) return;
  // Rods slide in and out.
  for (const rod of c.rods) {
    const move = Math.sign(rod.target - rod.insertion) * Math.min(Math.abs(rod.target - rod.insertion), delta * 1.6);
    rod.insertion += move;
    const length = Math.max(0.0001, c.length * rod.insertion);
    rod.mesh.scale.y = length;
    rod.mesh.position.y = c.top - length / 2;
  }
  for (const item of c.flashes) {
    if (item.t >= 1) continue;
    item.t += delta / 0.45;
    if (item.t >= 1) {
      item.sprite.visible = false;
      continue;
    }
    item.sprite.scale.setScalar(0.5 + 0.9 * easeOut(item.t));
    item.sprite.material.opacity = (palette.dark ? 0.95 : 0.85) * (1 - item.t);
  }
  const { spacing, half, N } = c;
  const capture2 = CHAIN.capture ** 2;
  const rod2 = CHAIN.rodAbsorb ** 2;
  const escape2 = CHAIN.escapeRadius ** 2;
  if (c.count > 0) {
    c.t += delta;
    for (let i = c.count - 1; i >= 0; i--) {
      if (i >= c.count) continue;
      const b = i * 3;
      const x = c.pos[b] += c.vel[b] * delta;
      const y = c.pos[b + 1] += c.vel[b + 1] * delta;
      const z = c.pos[b + 2] += c.vel[b + 2] * delta;
      let fate = null;
      let hit = -1;
      if (x * x + y * y + z * z > escape2 && x * c.vel[b] + y * c.vel[b + 1] + z * c.vel[b + 2] > 0) {
        fate = 'escaped';
      } else {
        for (const rod of c.rods) {
          if (rod.insertion < 0.02 || y > c.top || y < c.top - c.length * rod.insertion) continue;
          if ((x - rod.x) ** 2 + (z - rod.z) ** 2 < rod2) {
            fate = 'rod';
            break;
          }
        }
        if (!fate) {
          const ix = Math.round(x / spacing + half);
          const iy = Math.round(y / spacing + half);
          const iz = Math.round(z / spacing + half);
          if (ix >= 0 && ix < N && iy >= 0 && iy < N && iz >= 0 && iz < N) {
            const index = ix + N * (iy + N * iz);
            if (c.states[index] !== 2) {
              const dx = x - (ix - half) * spacing;
              const dy = y - (iy - half) * spacing;
              const dz = z - (iz - half) * spacing;
              if (dx * dx + dy * dy + dz * dz < capture2) {
                fate = c.states[index] === 0 ? 'fission' : 'u238';
                hit = index;
              }
            }
          }
        }
      }
      if (!fate) continue;
      c.fates[fate] += 1;
      const gen = c.gen[i];
      removeNeutron(i);
      if (fate === 'fission') fissionAt(hit, x, y, z, gen);
    }
    if (c.count === 0 && c.started) {
      c.over = true;
      updateFireButton();
      readout.textContent = c.fissions >= c.fissile
        ? `ALL FUEL SPENT · Every uranium-235 nucleus (${c.fissions}) has split.`
        : `REACTION STOPPED · No neutrons are left, so no more fissions. ${c.fissions} of ${c.fissile} uranium-235 nuclei split. Fire more neutrons, or reset.`;
    }
  }
  // Draw the neutrons.
  for (let i = 0; i < c.count; i++) {
    dummy.position.set(c.pos[i * 3], c.pos[i * 3 + 1], c.pos[i * 3 + 2]);
    dummy.updateMatrix();
    c.neutrons.setMatrixAt(i, dummy.matrix);
  }
  c.neutrons.count = c.count;
  c.neutrons.instanceMatrix.needsUpdate = true;
}
// Reproduction factor k: fissions in the newest complete generation divided by the one before it.
function reproductionFactor() {
  const g = chain.generations;
  const last = g.length - 2;
  if (last < 1 || !g[last - 1] || g[last - 1] < 4) return null;
  return (g[last] || 0) / g[last - 1];
}
function updateChainStats() {
  const c = chain;
  const resolved = Object.values(c.fates).reduce((a, b) => a + b, 0);
  const pct = key => (resolved ? Math.round(100 * c.fates[key] / resolved) : 0);
  const k = reproductionFactor();
  let verdict = 'Press “Start chain reaction”.';
  if (c.started && c.over) verdict = 'The reaction has stopped.';
  else if (k !== null) verdict = k > 1.15 ? 'k above 1: growing fast' : k < 0.85 ? 'k below 1: dying away' : 'k close to 1: steady';
  const kText = k === null ? '–' : k.toFixed(1);
  $('graph-stats').innerHTML = `Fissions <b>${c.fissions}</b> of ${c.fissile} · neutrons flying <b>${c.count}</b><br>`
    + `Neutrons: fission ${pct('fission')}% · U-238 ${pct('u238')}% · rods ${pct('rod')}% · escaped ${pct('escaped')}%<br>`
    + `k ≈ <b>${kText}</b> · ${verdict}`;
}
function drawChainGraph() {
  const c = chain;
  const canvas = $('graph-canvas');
  const view = prepareCanvas(canvas);
  if (!view) return;
  const { ctx, w, h } = view;
  const ink = palette.css;
  const margin = { l: 30, r: 8, t: 8, b: 22 };
  const plotW = w - margin.l - margin.r;
  const plotH = h - margin.t - margin.b;
  const visibleBins = 40;
  const start = Math.max(0, c.bins.length - visibleBins);
  const shown = c.bins.slice(start);
  const peak = Math.max(10, ...shown);
  ctx.strokeStyle = ink.border;
  ctx.fillStyle = ink.secondary;
  ctx.font = `10px ${ink.font}`;
  ctx.lineWidth = 1;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  for (const value of [0, Math.round(peak / 2), peak]) {
    const y = margin.t + plotH * (1 - value / peak);
    ctx.beginPath();
    ctx.moveTo(margin.l, y);
    ctx.lineTo(w - margin.r, y);
    ctx.stroke();
    ctx.fillText(String(value), margin.l - 4, y);
  }
  const barW = plotW / visibleBins;
  ctx.fillStyle = ink.fuel;
  shown.forEach((value, i) => {
    const barH = plotH * value / peak;
    ctx.fillRect(margin.l + i * barW + 0.5, margin.t + plotH - barH, Math.max(1, barW - 1), barH);
  });
  ctx.fillStyle = ink.secondary;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText('time (s)', margin.l + plotW / 2, h - 11);
  for (const bin of [start, start + visibleBins / 2, start + visibleBins]) {
    ctx.fillText(String(Math.round(bin * CHAIN.binTime)), margin.l + (bin - start) * barW, margin.t + plotH + 2);
  }
  ctx.save();
  ctx.translate(9, margin.t + plotH / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.textBaseline = 'middle';
  ctx.fillText('fissions per 0.5 s', 0, 0);
  ctx.restore();
}

// ====================================================================
// Fusion
// ====================================================================
const fusionUnits = () => ({ mu: FUSION.mu, k: FUSION.contact });
function fusionEnergy(temperature) {
  return temperature / FUSION.criticalTemp;
}
function currentTemperature() {
  return THREE.MathUtils.clamp(Math.round(Number($('temp-input').value) || 0), FUSION.minTemp, FUSION.maxTemp);
}
function buildFusion() {
  const R = FUSION_RADIUS;
  const rho = 2 * R / Math.sqrt(3);
  const materials = nucleonMaterials();
  const geometry = new THREE.SphereGeometry(R, 24, 17);
  const make = (kinds, sites, name) => {
    const group = new THREE.Group();
    const nucs = kinds.map((kind, i) => {
      const mesh = new THREE.Mesh(geometry, materials[kind]);
      mesh.position.copy(sites[i]);
      mesh.userData.radius = R;
      group.add(mesh);
      const record = { mesh, kind, home: sites[i].clone(), phase: i * 2.1, axis: randomDirection(random(i + 5)) };
      record.pick = { object: mesh, kind, nucleon: record };
      pickables.push(record.pick);
      return record;
    });
    const halo = glow(palette.proton, 3.2, palette.dark ? 0.35 : 0.2);
    group.add(halo);
    const label = labelSprite(name, palette.line, 1.3);
    label.position.set(0, 1.6, 0);
    group.add(label);
    stage.add(group);
    return { group, nucs, label };
  };
  const D = make(['proton', 'neutron'], [new THREE.Vector3(0, R, 0), new THREE.Vector3(0, -R, 0)], 'H-2');
  const T = make(['proton', 'neutron', 'neutron'], [new THREE.Vector3(0, rho, 0), new THREE.Vector3(-R, -rho / 2, 0), new THREE.Vector3(R, -rho / 2, 0)], 'H-3');
  fusion = { phase: 'idle', d: FUSION.startSeparation, v: 0, t: 0, D, T, R, materials, energy: 0, closest: null, outcome: null };
  placeFusion();
  floorShadow.position.y = FLOOR.fusion[0];
  floorShadow.scale.setScalar(FLOOR.fusion[1] / 1.4);
  updateFusionControls();
}
function placeFusion() {
  const f = fusion;
  const total = FUSION.massD + FUSION.massT;
  f.D.group.position.x = -f.d * FUSION.massT / total;
  f.T.group.position.x = f.d * FUSION.massD / total;
}
function startFusion() {
  const f = fusion;
  if (!f || f.phase !== 'idle') return;
  if (!state.playing) setPlaying(true);
  select(null);
  f.energy = fusionEnergy(currentTemperature());
  const kinetic = f.energy - FUSION.contact / f.d;
  f.v = -Math.sqrt(2 * kinetic / FUSION.mu);
  f.phase = 'approach';
  f.closest = f.d;
  const willFuse = f.energy >= 1;
  readout.textContent = `${currentTemperature()} MILLION °C · The two positive nuclei are pushed together. ${willFuse ? 'They have enough energy to reach the top of the barrier.' : 'Watch whether their energy is enough…'}`;
  updateFireButton();
  updateFusionControls();
}
function updateFusionControls() {
  const running = fusion && fusion.phase !== 'idle' && fusion.phase !== 'done';
  for (const id of ['temp-minus', 'temp-plus', 'temp-input']) $(id).disabled = Boolean(running);
}
function stepFusion(delta) {
  const f = fusion;
  if (!f) return;
  if (f.phase === 'approach' || f.phase === 'rebound') {
    const steps = Math.max(1, Math.ceil(delta / (1 / 240)));
    const dt = delta / steps;
    const { mu, k } = fusionUnits();
    for (let i = 0; i < steps; i++) {
      f.v += (k / (mu * f.d * f.d)) * dt;
      f.d += f.v * dt;
      f.closest = Math.min(f.closest, f.d);
      if (f.phase === 'approach') {
        if (f.energy >= 1 && f.d <= FUSION.contact * 1.03) {
          f.d = FUSION.contact * 1.03;
          startMerge();
          break;
        }
        if (f.v >= 0) {
          f.phase = 'rebound';
          readout.textContent = `REBOUND · The nuclei stopped ${f.closest.toFixed(1)} apart, before the strong force could act, and were pushed away again. The temperature was too low. Try a higher one.`;
        }
      }
      if (f.phase === 'rebound' && f.d >= FUSION.startSeparation) {
        f.d = FUSION.startSeparation;
        f.phase = 'done';
        f.outcome = 'rebound';
        updateFireButton();
        updateFusionControls();
        break;
      }
    }
    placeFusion();
  } else if (f.phase === 'merge') {
    stepMerge(delta);
  } else if (f.phase === 'released') {
    stepReleased(delta);
  }
  // A small jiggle keeps the nuclei alive.
  for (const cluster of [f.D, f.T]) {
    if (cluster.group.parent !== stage) continue;
    for (const n of cluster.nucs) n.mesh.position.copy(n.home).addScaledVector(n.axis, 0.012 * Math.sin(state.time * 9 + n.phase));
  }
}
function startMerge() {
  const f = fusion;
  f.phase = 'merge';
  f.t = 0;
  f.helium = new THREE.Group();
  stage.add(f.helium);
  const all = [...f.D.nucs, ...f.T.nucs];
  for (const n of all) {
    const holder = f.D.nucs.includes(n) ? f.D.group : f.T.group;
    n.from = n.mesh.position.clone().add(holder.position);
    f.helium.add(n.mesh);
    n.mesh.position.copy(n.from);
    n.home = null;
  }
  for (const cluster of [f.D, f.T]) {
    disposeObject(cluster.label);
    stage.remove(cluster.group);
  }
  // A five-nucleon shape: three around the middle, one at each end. One end nucleon is the neutron that will leave.
  const R = f.R;
  const rho = 2 * R / Math.sqrt(3);
  const lift = Math.sqrt(4 * R * R - rho * rho);
  const angle = THREE.MathUtils.degToRad(35);
  f.axis = new THREE.Vector3(Math.cos(angle), Math.sin(angle), 0);
  const u = new THREE.Vector3(-Math.sin(angle), Math.cos(angle), 0);
  const w = new THREE.Vector3(0, 0, 1);
  const ring = deg => u.clone().multiplyScalar(rho * Math.cos(THREE.MathUtils.degToRad(deg))).addScaledVector(w, rho * Math.sin(THREE.MathUtils.degToRad(deg)));
  const [pD, nD] = f.D.nucs;
  const [pT, nT1, nT2] = f.T.nucs;
  pD.target = ring(90);
  nD.target = ring(210);
  pT.target = ring(330);
  nT1.target = f.axis.clone().multiplyScalar(-lift);
  nT2.target = f.axis.clone().multiplyScalar(lift);
  f.ejected = nT2;
  f.helium.userData.radius = 0.5;
  readout.textContent = 'FUSING · The nuclei touch and the strong nuclear force pulls all five nucleons into one nucleus…';
}
function stepMerge(delta) {
  const f = fusion;
  f.t += delta;
  const k = ease(Math.min(1, f.t / FUSION.mergeTime));
  for (const n of [...f.D.nucs, ...f.T.nucs]) {
    if (n.released) continue;
    n.mesh.position.lerpVectors(n.from, n.target, k).addScaledVector(randomDirectionFixed(n), 0.02 * Math.sin(state.time * 20));
  }
  if (f.t >= FUSION.mergeTime) release();
}
const fixedDirections = new WeakMap();
function randomDirectionFixed(n) {
  if (!fixedDirections.has(n)) fixedDirections.set(n, randomDirection(random(Math.floor(n.phase * 100) + 3)));
  return fixedDirections.get(n);
}
function release() {
  const f = fusion;
  const n = f.ejected;
  n.released = true;
  stage.add(n.mesh);
  n.mesh.position.copy(n.target);
  n.mesh.material = n.mesh.material.clone();
  n.mesh.add(glow(palette.neutron, 0.7, palette.dark ? 0.5 : 0.25));
  const direction = f.axis.clone();
  const flyer = addFlyer(n.mesh, straightFlight(n.mesh, { direction, speed: FUSION.neutronSpeed, range: 9 }));
  flyer.pick = n.pick;
  f.heVelocity = f.axis.clone().multiplyScalar(-FUSION.heliumSpeed);
  const label = labelSprite('He-4', palette.line, 1.3);
  label.position.set(0, 1.6, 0);
  f.helium.add(label);
  f.helium.add(glow(palette.proton, 3.0, palette.dark ? 0.3 : 0.18));
  flash(new THREE.Vector3(0, 0, 0), 6);
  f.phase = 'released';
  f.t = 0;
  renderEquation(true);
  readout.textContent = 'FUSION · Helium-4 and a fast neutron. 17.6 MeV is released: the light neutron carries 14.1 MeV and the heavier helium nucleus 3.5 MeV, in opposite directions.';
}
function stepReleased(delta) {
  const f = fusion;
  f.t += delta;
  f.helium.position.addScaledVector(f.heVelocity, delta);
  f.heVelocity.multiplyScalar(Math.exp(-0.9 * delta));
  for (const n of [...f.D.nucs, ...f.T.nucs]) {
    if (n.released) continue;
    n.mesh.position.copy(n.target).addScaledVector(randomDirectionFixed(n), 0.012 * Math.sin(state.time * 9 + n.phase));
  }
  if (f.t >= 3.4) {
    f.phase = 'done';
    f.outcome = 'fused';
    updateFireButton();
    updateFusionControls();
  }
}
function drawFusionGraph() {
  const f = fusion;
  const canvas = $('graph-canvas');
  const view = prepareCanvas(canvas);
  if (!view || !f) return;
  const { ctx, w, h } = view;
  const ink = palette.css;
  const margin = { l: 22, r: 8, t: 10, b: 22 };
  const plotW = w - margin.l - margin.r;
  const plotH = h - margin.t - margin.b;
  const xMin = 0.5;
  const xMax = FUSION.startSeparation + 0.3;
  const yMax = 2.4;
  const px = d => margin.l + plotW * (d - xMin) / (xMax - xMin);
  const py = e => margin.t + plotH * (1 - Math.min(e, yMax) / yMax);
  ctx.fillStyle = ink.photon;
  ctx.globalAlpha = 0.2;
  ctx.fillRect(px(xMin), margin.t, px(FUSION.contact) - px(xMin), plotH);
  ctx.globalAlpha = 1;
  ctx.strokeStyle = ink.secondary;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(margin.l, margin.t);
  ctx.lineTo(margin.l, margin.t + plotH);
  ctx.lineTo(w - margin.r, margin.t + plotH);
  ctx.stroke();
  // Barrier top and the electrostatic potential energy curve.
  ctx.setLineDash([3, 3]);
  ctx.strokeStyle = ink.secondary;
  ctx.beginPath();
  ctx.moveTo(margin.l, py(1));
  ctx.lineTo(w - margin.r, py(1));
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.strokeStyle = ink.proton;
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 0; i <= 80; i++) {
    const d = FUSION.contact + (xMax - FUSION.contact) * i / 80;
    const y = FUSION.contact / d;
    if (i === 0) ctx.moveTo(px(d), py(y));
    else ctx.lineTo(px(d), py(y));
  }
  ctx.stroke();
  // Total energy of the pair at the chosen temperature.
  const energy = f.phase === 'idle' || f.phase === 'done' && !f.energy ? fusionEnergy(currentTemperature()) : f.energy;
  ctx.strokeStyle = ink.accent;
  ctx.lineWidth = 1.5;
  ctx.setLineDash([6, 3]);
  ctx.beginPath();
  ctx.moveTo(margin.l, py(energy));
  ctx.lineTo(w - margin.r, py(energy));
  ctx.stroke();
  ctx.setLineDash([]);
  // Kinetic energy is the gap between the total energy and the potential energy.
  if (f.d && !['merge', 'released'].includes(f.phase) && !(f.phase === 'done' && f.outcome === 'fused')) {
    const potential = FUSION.contact / f.d;
    ctx.strokeStyle = ink.green;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(px(f.d), py(potential));
    ctx.lineTo(px(f.d), py(energy));
    ctx.stroke();
    ctx.fillStyle = ink.text;
    ctx.beginPath();
    ctx.arc(px(f.d), py(potential), 4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.font = `10px ${ink.font}`;
  ctx.fillStyle = ink.secondary;
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'right';
  ctx.fillText('top of barrier', w - margin.r - 2, py(1) + 11);
  ctx.fillStyle = ink.accent;
  ctx.fillText('total energy', w - margin.r - 2, py(energy) + (energy > 1.6 ? 11 : -3));
  ctx.fillStyle = ink.proton;
  ctx.textAlign = 'left';
  ctx.fillText('repulsion', px(2.6), py(FUSION.contact / 2.6) - 9);
  ctx.fillStyle = ink.secondary;
  ctx.textAlign = 'center';
  ctx.fillText('distance between nuclei →', margin.l + plotW / 2, h - 4);
  ctx.save();
  ctx.translate(8, margin.t + plotH / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText('energy →', 0, 0);
  ctx.restore();
  const temperature = currentTemperature();
  const status = f.phase === 'idle'
    ? (temperature >= FUSION.criticalTemp ? 'Energy reaches the top of the barrier.' : 'Energy stays below the top of the barrier.')
    : f.outcome === 'fused' || ['merge', 'released'].includes(f.phase) ? 'Fusion! The nuclei reached the strong force.'
    : f.outcome === 'rebound' || f.phase === 'rebound' ? `Closest approach ${f.closest.toFixed(1)}: bounced back.`
    : `Distance ${f.d.toFixed(1)} · kinetic energy ${Math.max(0, energy - FUSION.contact / f.d).toFixed(2)}`;
  $('graph-stats').innerHTML = `Temperature <b>${f.phase === 'idle' ? temperature : Math.round(f.energy * FUSION.criticalTemp)} million °C</b> · fusion needs about ${FUSION.criticalTemp}<br>${status}`;
}

// ====================================================================
// Binding energy
// ====================================================================
const MARKERS = [
  { name: 'H-2', A: 2, y: 1.112, place: 'right' },
  { name: 'H-3', A: 3, y: 2.827, place: 'right' },
  { name: 'He-4', A: 4, y: 7.074, place: 'downright' },
  { name: 'C-12', A: 12, y: 7.68, place: 'above' },
  { name: 'Fe-56', A: 56, y: 8.790, place: 'above' },
  { name: 'Kr-92', A: 92, y: 8.512, place: 'above' },
  { name: 'Ba-141', A: 141, y: 8.327, place: 'above' },
  { name: 'U-236', A: 236, y: 7.586, place: 'above' }
];
const binding = { reaction: 'fission', progress: 1, hits: [], marked: null };
const MEV = 1.602177e-13;
const AMU = 1.660539e-27;
function reactionNumbers(key) {
  const reaction = REACTIONS[key];
  const sum = names => names.reduce((total, name) => total + NUCLIDES[name].B, 0);
  const before = sum(reaction.from);
  const after = sum(reaction.to);
  const released = after - before;
  const nucleons = reaction.from.reduce((total, name) => total + NUCLIDES[name].A, 0);
  return { before, after, released, nucleons, perNucleon: released / nucleons, perKg: released * MEV / (reaction.fuelMass * AMU) };
}
function sci(value) {
  const exponent = Math.floor(Math.log10(value));
  const digits = (value / 10 ** exponent).toFixed(1);
  const sup = String(exponent).replace(/[0-9]/g, d => '⁰¹²³⁴⁵⁶⁷⁸⁹'[d]).replace('-', '⁻');
  return `${digits} × 10${sup}`;
}
function updateBindingStats() {
  const key = binding.reaction;
  const reaction = REACTIONS[key];
  const n = reactionNumbers(key);
  const names = list => list.map(name => NUCLIDES[name].name).join(' + ');
  $('bea-stats').innerHTML = `<div><span>${reaction.title}</span><b>${reaction.equation}</b></div>`
    + `<div><span>Total binding energy before → after</span><b>${n.before.toFixed(0)} → ${n.after.toFixed(0)} MeV</b></div>`
    + `<div><span>Energy released per reaction</span><b class="big">${n.released.toFixed(1)} MeV</b></div>`
    + `<div><span>Per nucleon (${names(reaction.from)})</span><b>${n.perNucleon.toFixed(2)} MeV</b></div>`
    + `<div><span>Per kilogram of fuel</span><b class="big">${sci(n.perKg)} J</b></div>`;
}
function selectReaction(key) {
  binding.reaction = key;
  binding.progress = reducedMotion ? 1 : 0;
  binding.marked = null;
  document.querySelectorAll('[data-reaction]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.reaction === key)));
  updateBindingStats();
  const n = reactionNumbers(key);
  const other = reactionNumbers(key === 'fission' ? 'fusion' : 'fission');
  readout.textContent = key === 'fission'
    ? `FISSION · U-236 splits into two nuclei that sit higher on the curve. ${n.released.toFixed(0)} MeV is released, only ${n.perNucleon.toFixed(2)} MeV per nucleon.`
    : `FUSION · The nuclei jump up the steep left side of the curve. ${n.released.toFixed(1)} MeV is released, ${n.perNucleon.toFixed(1)} MeV per nucleon: ${(n.perNucleon / other.perNucleon).toFixed(0)} times more per nucleon than fission.`;
  drawBinding();
}
function drawBinding() {
  const canvas = $('bea-canvas');
  const view = prepareCanvas(canvas);
  if (!view) return;
  const { ctx, w, h } = view;
  const ink = palette.css;
  const margin = { l: 42, r: 14, t: 14, b: 40 };
  const plotW = w - margin.l - margin.r;
  const plotH = h - margin.t - margin.b;
  const px = A => margin.l + plotW * A / 250;
  const py = y => margin.t + plotH * (1 - y / 10);
  ctx.font = `11px ${ink.font}`;
  ctx.lineWidth = 1;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'right';
  for (let y = 0; y <= 10; y += 2) {
    ctx.strokeStyle = ink.border;
    ctx.beginPath();
    ctx.moveTo(margin.l, py(y));
    ctx.lineTo(w - margin.r, py(y));
    ctx.stroke();
    ctx.fillStyle = ink.secondary;
    ctx.fillText(String(y), margin.l - 6, py(y));
  }
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  for (let A = 0; A <= 250; A += 50) ctx.fillText(String(A), px(A), margin.t + plotH + 4);
  ctx.fillText('mass number A (protons + neutrons)', margin.l + plotW / 2, h - 16);
  ctx.save();
  ctx.translate(12, margin.t + plotH / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.textBaseline = 'middle';
  ctx.fillText('binding energy per nucleon (MeV)', 0, 0);
  ctx.restore();

  // Highlight the side where the chosen reaction happens.
  ctx.fillStyle = ink.photon;
  ctx.globalAlpha = 0.09;
  if (binding.reaction === 'fusion') ctx.fillRect(px(0), margin.t, px(56) - px(0), plotH);
  else ctx.fillRect(px(56), margin.t, px(250) - px(56), plotH);
  ctx.globalAlpha = 1;
  ctx.font = `600 10px ${ink.font}`;
  ctx.fillStyle = binding.reaction === 'fusion' ? ink.primary : ink.secondary;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  const narrow = plotW < 420;
  ctx.fillText(narrow ? 'FUSION →' : 'FUSION: light nuclei join →', px(4), py(0.5));
  ctx.fillStyle = binding.reaction === 'fission' ? ink.primary : ink.secondary;
  ctx.textAlign = 'right';
  ctx.fillText(narrow ? '← FISSION' : '← FISSION: heavy nuclei split', px(248), py(0.5));

  ctx.strokeStyle = ink.accent;
  ctx.lineWidth = 2.5;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  CURVE.forEach(([A, y], i) => (i ? ctx.lineTo(px(A), py(y)) : ctx.moveTo(px(A), py(y))));
  ctx.stroke();

  // Arrows for the chosen reaction.
  const reaction = REACTIONS[binding.reaction];
  const point = name => {
    const marker = MARKERS.find(item => item.name === NUCLIDES[name].name);
    return { x: px(marker.A), y: py(marker.y) };
  };
  const fromPoints = reaction.from.map(point);
  const toPoints = reaction.to.map(point);
  const progress = ease(binding.progress);
  ctx.strokeStyle = ink.primary;
  ctx.fillStyle = ink.primary;
  ctx.lineWidth = 2;
  for (const from of fromPoints) {
    for (const to of toPoints) {
      const dx = to.x - from.x;
      const dy = to.y - from.y;
      const length = Math.hypot(dx, dy) || 1;
      const pad = 9;
      const sx = from.x + dx / length * pad;
      const sy = from.y + dy / length * pad;
      const ex = sx + (to.x - dx / length * pad - sx) * progress;
      const ey = sy + (to.y - dy / length * pad - sy) * progress;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(ex, ey);
      ctx.stroke();
      if (progress > 0.05) {
        const angle = Math.atan2(dy, dx);
        ctx.beginPath();
        ctx.moveTo(ex, ey);
        ctx.lineTo(ex - 9 * Math.cos(angle - 0.4), ey - 9 * Math.sin(angle - 0.4));
        ctx.lineTo(ex - 9 * Math.cos(angle + 0.4), ey - 9 * Math.sin(angle + 0.4));
        ctx.closePath();
        ctx.fill();
      }
    }
  }

  // Nuclei on the curve.
  binding.hits = [];
  const active = new Set([...reaction.from, ...reaction.to].map(name => NUCLIDES[name].name));
  ctx.font = `600 11px ${ink.font}`;
  for (const marker of MARKERS) {
    const x = px(marker.A);
    const y = py(marker.y);
    const on = active.has(marker.name) || binding.marked === marker.name;
    ctx.fillStyle = on ? ink.primary : ink.text;
    ctx.beginPath();
    ctx.arc(x, y, on ? 6 : 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = ink.border;
    ctx.stroke();
    ctx.fillStyle = on ? ink.primary : ink.text;
    ctx.textBaseline = 'middle';
    if (marker.place === 'right') {
      ctx.textAlign = 'left';
      ctx.fillText(marker.name, x + 10, y);
    } else if (marker.place === 'downright') {
      ctx.textAlign = 'left';
      ctx.fillText(marker.name, x + 8, y + 15);
    } else if (marker.place === 'above') {
      ctx.textAlign = 'center';
      ctx.fillText(marker.name, x, y - 14);
    } else {
      ctx.textAlign = 'center';
      ctx.fillText(marker.name, x, y + 15);
    }
    binding.hits.push({ marker, x, y });
  }
}
canvasHit($('bea-canvas'), (x, y) => {
  let best = null;
  for (const hit of binding.hits) {
    const distance = Math.hypot(hit.x - x, hit.y - y);
    if (distance < 26 && (!best || distance < best.distance)) best = { hit, distance };
  }
  if (!best) return;
  const { marker } = best.hit;
  binding.marked = marker.name;
  readout.textContent = `${marker.name.toUpperCase()} · Binding energy per nucleon ${marker.y.toFixed(2)} MeV, so about ${(marker.y * marker.A).toFixed(0)} MeV holds its ${marker.A} nucleons together.${marker.name === 'Fe-56' ? ' This is the most tightly bound region: no energy can be released from it by fission or fusion.' : ''}`;
  drawBinding();
});
function canvasHit(canvas, handler) {
  canvas.addEventListener('pointerup', event => {
    const rect = canvas.getBoundingClientRect();
    handler(event.clientX - rect.left, event.clientY - rect.top);
  });
}
function stepBinding(delta) {
  if (binding.progress >= 1) return;
  binding.progress = Math.min(1, binding.progress + delta / 0.9);
  drawBinding();
}

// ---------- 2D canvas helper ----------
// Sizes a canvas to its CSS box at the device pixel ratio and returns a context in CSS pixels.
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
// Distance at which the given half-width and half-height both fit, whatever the viewer's shape.
function fitDistance({ w, h }) {
  const tan = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  return Math.max(h / tan, w / (tan * camera.aspect));
}
function resetView() {
  cameraTween = null;
  controls.reset();
  if (state.mode === 'energy') return;
  const direction = new THREE.Vector3(...HOME_DIRECTION[state.mode]).normalize();
  controls.target.set(...HOME_TARGET[state.mode]);
  camera.position.copy(direction.multiplyScalar(fitDistance(HOME_EXTENT[state.mode]))).add(controls.target);
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
function describe(item) {
  const kind = item.kind;
  if ((kind === 'proton' || kind === 'neutron') && item.nucleon) {
    const n = item.nucleon;
    if (state.mode === 'fusion') {
      const merged = fusion && ['merge', 'released', 'done'].includes(fusion.phase) && fusion.outcome !== 'rebound';
      const owner = n.released ? 'a free neutron' : merged ? 'the helium-4 nucleus (2 protons + 2 neutrons)' : fusion.D.nucs.includes(n) ? 'deuterium, hydrogen-2 (1 proton + 1 neutron)' : 'tritium, hydrogen-3 (1 proton + 2 neutrons)';
      return `${PARTICLES[kind]} This one belongs to ${owner}.`;
    }
    if (n.name === 'incoming' && !decay) return `${PARTICLES.neutron} This slow neutron is about to be fired at the uranium-235 nucleus.`;
    if (n.free) return `${PARTICLES.neutron} A free neutron released by the fission: it can go on to split another nucleus.`;
    const groupText = { ba: 'barium-141 (56 protons + 85 neutrons)', kr: 'krypton-92 (36 protons + 56 neutrons)' };
    const done = nucleus?.split;
    const owner = done ? groupText[n.group] : decay && decay.phase !== 'approach' ? 'uranium-236 (92 protons + 144 neutrons)' : 'uranium-235 (92 protons + 143 neutrons)';
    return `${PARTICLES[kind]} This one is part of ${owner}.`;
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
    // Generous hit area for small markers, but never larger than the nucleon itself in a packed nucleus.
    if (distance > Math.max(radius + 3, 12)) continue;
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
  select(item.object, describe(item));
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
  const button = $('motion');
  button.setAttribute('aria-pressed', String(state.playing));
  $('motion-label').textContent = state.playing ? 'Pause motion' : 'Play motion';
  $('motion-icon').setAttribute('d', state.playing ? 'M7 5h3v14H7zM14 5h3v14h-3z' : 'M8 5v14l11-7z');
}
$('motion').addEventListener('click', () => setPlaying(!state.playing));
function resetScene() {
  // Stop any reaction, then return to the default view.
  buildMode(false);
  resetView();
  readout.textContent = DEFAULT_READOUT[state.mode]();
}
$('reset').addEventListener('click', resetScene);
$('fire').addEventListener('click', () => {
  if (state.mode === 'fission') {
    if (decay?.phase === 'done') {
      buildMode(false);
      readout.textContent = DEFAULT_READOUT.fission();
    } else {
      startFission();
    }
  } else if (state.mode === 'chain') {
    fireBurst();
  } else if (state.mode === 'fusion') {
    if (fusion?.phase === 'done') {
      buildMode(false);
      readout.textContent = DEFAULT_READOUT.fusion();
    } else {
      startFusion();
    }
  }
});
function updateFireButton() {
  const button = $('fire');
  button.disabled = false;
  if (state.mode === 'fission') {
    const running = decay && decay.phase !== 'done';
    button.textContent = decay?.phase === 'done' ? 'Reset nucleus' : running ? 'Splitting…' : 'Fire a neutron';
    button.disabled = Boolean(running);
  } else if (state.mode === 'chain') {
    button.textContent = chain?.started ? 'Fire 5 more neutrons' : 'Start chain reaction';
  } else if (state.mode === 'fusion') {
    const running = fusion && fusion.phase !== 'idle' && fusion.phase !== 'done';
    button.textContent = fusion?.phase === 'done' ? 'Try again' : running ? 'Colliding…' : 'Collide the nuclei';
    button.disabled = Boolean(running);
  }
}
$('enrichment').addEventListener('change', () => {
  buildMode(false);
  readout.textContent = DEFAULT_READOUT.chain();
});
document.querySelectorAll('[data-reaction]').forEach(button => button.addEventListener('click', () => selectReaction(button.dataset.reaction)));

// Steppers: one exact step per tap, and a steady ramp while the button is held.
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
    // Keyboard activation arrives as a click with no pointer.
    button.addEventListener('click', event => { if (event.detail === 0) change(direction); });
  }
}
bindStepper($('rods-minus'), $('rods-plus'), direction => {
  setRods(rodCount + direction);
  if (chain) readout.textContent = `${rodCount} CONTROL ROD${rodCount === 1 ? '' : 'S'} · ${rodCount ? 'Rods absorb neutrons, so fewer cause fission.' : 'No rods: nothing absorbs neutrons except uranium-238 and the edge of the block.'}`;
});
function setTemperature(value) {
  $('temp-input').value = THREE.MathUtils.clamp(Math.round(value), FUSION.minTemp, FUSION.maxTemp);
  $('temp-minus').disabled = currentTemperature() <= FUSION.minTemp || Boolean(fusion && fusion.phase !== 'idle' && fusion.phase !== 'done');
  $('temp-plus').disabled = currentTemperature() >= FUSION.maxTemp || Boolean(fusion && fusion.phase !== 'idle' && fusion.phase !== 'done');
  if (fusion && fusion.phase === 'idle') drawFusionGraph();
}
bindStepper($('temp-minus'), $('temp-plus'), direction => {
  const value = currentTemperature();
  setTemperature(direction > 0 ? Math.floor(value / 10) * 10 + 10 : Math.ceil(value / 10) * 10 - 10);
});
$('temp-input').addEventListener('change', () => setTemperature(currentTemperature()));
$('temp-input').addEventListener('input', () => { if (fusion && fusion.phase === 'idle') drawFusionGraph(); });

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

// ---------- Mode selection ----------
const DEFAULT_READOUT = {
  fission: () => 'URANIUM-235 · 92 protons + 143 neutrons, and a slow neutron waiting on the left. Press “Fire a neutron”, or tap a nucleon.',
  chain: () => 'A BLOCK OF FUEL · Red spheres are uranium-235, grey spheres are uranium-238. Press “Start chain reaction”, then add control rods.',
  fusion: () => 'DEUTERIUM + TRITIUM · Two hydrogen nuclei, each with charge +1. Choose a temperature, then press “Collide the nuclei”.',
  energy: () => 'Choose a reaction, or tap a nucleus on the curve to read its binding energy per nucleon.'
};
const LEGEND = {
  fission: ['proton', 'neutron', 'gamma'],
  chain: ['fuel', 'spent', 'u238', 'neutron', 'rod'],
  fusion: ['proton', 'neutron'],
  energy: []
};
function buildMode(animate) {
  clearStage();
  const mode = state.mode;
  const three = mode !== 'energy';
  renderer.domElement.hidden = !three;
  $('graph').hidden = !(mode === 'chain' || mode === 'fusion');
  $('bea').hidden = three;
  if (mode === 'fission') buildFission();
  else if (mode === 'chain') buildChain();
  else if (mode === 'fusion') buildFusion();
  floorShadow.visible = three;
  renderEquation(false);
  updateFireButton();
  updateMotionButton();
  if (chain) {
    setRods(rodCount);
    updateChainStats();
    drawChainGraph();
  }
  if (fusion) drawFusionGraph();
  if (mode === 'energy') {
    selectReaction(binding.reaction);
  }
  if (animate && three) fadeIn = { t: 0 };
  if (three) resize();
}
function selectMode(mode, animate = true) {
  const previous = state.mode;
  state.mode = mode;
  const data = MODES[mode];
  document.body.dataset.mode = mode;
  cameraTween = null;
  buildMode(animate && previous !== mode);
  document.querySelectorAll('[data-legend]').forEach(item => { item.hidden = !LEGEND[mode].includes(item.dataset.legend); });
  document.querySelector('.legend').hidden = !LEGEND[mode].length;
  document.querySelector('.gesture').hidden = mode === 'energy';
  $('controls-chain').hidden = mode !== 'chain';
  $('controls-fusion').hidden = mode !== 'fusion';
  $('controls-energy').hidden = mode !== 'energy';
  document.querySelector('.scale').hidden = mode === 'energy';
  $('fire').hidden = mode === 'energy';
  $('motion').hidden = mode === 'energy';
  $('reset').textContent = mode === 'energy' ? 'Reset' : 'Reset view';
  $('reset').hidden = mode === 'energy';
  $('action-hint').textContent = data.hint;
  if (mode !== 'energy') readout.textContent = DEFAULT_READOUT[mode]();
  for (const [id, key] of Object.entries({ 'scene-title': 'title', 'mode-date': 'date', 'mode-heading': 'heading', description: 'description', look: 'look', evidence: 'evidence' })) $(id).textContent = data[key];
  document.querySelectorAll('.models [data-mode]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.mode === mode)));
  viewer.setAttribute('aria-label', mode === 'energy'
    ? `${data.title}. ${data.description}`
    : `${data.title}. ${data.description} Drag or use arrow keys to rotate; scroll, pinch or plus and minus keys to zoom.`);
  quiz.show(mode);
  resetView();
}
document.querySelectorAll('.models [data-mode]').forEach(button => button.addEventListener('click', () => {
  if (button.dataset.mode !== state.mode) selectMode(button.dataset.mode);
}));

// ---------- Progress ----------
const progress = loadProgress();
const quiz = new Quiz($('mode-quiz'), { questionSets: QUESTIONS, progress, title: '✦ Unlock this discovery', completeText: '✦ Discovery unlocked!', onChange: updateProgress });
const finalQuiz = new Quiz($('final-quiz'), { questionSets: QUESTIONS, progress, title: '✦ Final challenge', completeText: 'Nuclear expert!', completeIcon: 'trophy', onChange: updateProgress });
function updateProgress() {
  saveProgress(progress);
  const unlocked = MODE_ORDER.filter(mode => setSummary(progress, mode, QUESTIONS[mode]).complete);
  const sets = [...MODE_ORDER, 'final'];
  const stars = sets.reduce((sum, key) => sum + setSummary(progress, key, QUESTIONS[key]).stars, 0);
  const total = sets.reduce((sum, key) => sum + QUESTIONS[key].length, 0);
  const finalDone = setSummary(progress, 'final', QUESTIONS.final).complete;
  $('progress').textContent = `${unlocked.length} / 4 discoveries unlocked · ★ ${stars} / ${total}${finalDone ? ' · Nuclear expert!' : ''}`;
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
    ? 'You have explored fission, chain reactions, fusion and binding energy. Use them together.'
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
  if (state.mode === 'energy') {
    drawBinding();
    return;
  }
  buildMode(false);
  readout.textContent = `The theme changed, so the scene was reset. ${DEFAULT_READOUT[state.mode]()}`;
});
document.fonts?.ready.then(() => {
  // Redraw canvas labels once the mono font has loaded.
  if (state.mode === 'energy') drawBinding();
  else if (!decay && !(chain?.started) && !(fusion && fusion.phase !== 'idle')) buildMode(false);
});

// ---------- Rendering ----------
function resize() {
  // Measure the canvas itself: on phones the graph sits above it inside the viewer.
  const { clientWidth: width, clientHeight: height } = renderer.domElement;
  if (state.mode === 'energy') drawBinding();
  if (!width || !height) return;
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  if (state.mode === 'chain') drawChainGraph();
  if (state.mode === 'fusion') drawFusionGraph();
  // Resizing clears the canvas, so redraw now rather than show a blank frame.
  renderer.render(scene, camera);
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
setTemperature(50);
selectMode('fission', false);
$('load-status').hidden = true;
let previousTime = performance.now();
renderer.setAnimationLoop(frame);
function frame(time) {
  const delta = Math.min((time - previousTime) / 1000, 0.05);
  previousTime = time;
  if (!state.visible || document.hidden) return;
  if (state.mode === 'energy') {
    stepBinding(delta);
    return;
  }
  if (state.playing) {
    state.time += delta;
    stepNucleus(delta);
    stepDecay(delta);
    stepFlyers(delta);
    stepChain(delta);
    stepFusion(delta);
  }
  if (fadeIn) {
    fadeIn.t += delta;
    const k = Math.min(1, fadeIn.t / TRANSITION_TIME);
    stage.scale.setScalar(0.85 + 0.15 * ease(k));
    if (k >= 1) fadeIn = null;
  }
  stepCamera(delta);
  if (halo.parent) halo.material.opacity = 0.28 + 0.14 * Math.sin(time / 220);
  if (chain && state.playing) {
    chain.statsClock += delta;
    if (chain.statsClock > 0.2) {
      chain.statsClock = 0;
      updateChainStats();
      drawChainGraph();
    }
  }
  if (fusion && state.playing) drawFusionGraph();
  controls.update();
  renderer.render(scene, camera);
}
