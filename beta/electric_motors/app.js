import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { MODES, MODE_ORDER, PARTS, STEPPERS, CONTROLS, QUESTIONS } from './content.js';
import { Quiz, loadProgress, saveProgress, setSummary } from './quiz.js';

const $ = id => document.getElementById(id);
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const state = {
  mode: 'force',
  playing: !reducedMotion,
  playback: 0.35,
  showFlow: false,
  visible: true,
  powered: false,
  reverse: false,
  flip: false,
  commutator: true,
  pauseSwap: false,
  swapPaused: false,
  endView: true,
  values: Object.fromEntries(Object.entries(STEPPERS).map(([key, spec]) => [key, spec.value]))
};

// Real dimensions used in the readouts, in metres.
const ROD_LENGTH = 0.05;
const COIL_SIDE = 0.04;
const COIL_AREA = 0.002;
const AC_TURNS = 50;
const AC_FIELD = 0.2;
const TRANSITION_TIME = 0.6;

// Scene layout in scene units.
const RAIL_Z = 0.8;
const ROD_Y = 0.13;
const ROD_LIMIT = 1.95;
const COIL_R = 1.0;
const COIL_HALF = 1.2;
const RING_R = 0.3;
const RING_Z = 1.75;
const SUPPLY_Y = -2.4;
const SUPPLY_Z = 3.0;
const BASE_Y = -2.7;
// Magnets: half the depth of the motor-effect plates, half the height and depth of the motor pole faces,
// and the even spacing of the field lines that fill them.
const MAGNET_HALF_DEPTH = 0.7;
const POLE_HALF = 1.3;
const FIELD_SPACING = 0.5;
// The AC supply box, whose front panel is an oscilloscope screen.
const AC_BOX = { w: 2.0, h: 1.18 };

// Motion models. Times are on-screen seconds; torques are in N m.
const ROD = { gain: 90, damping: 1.6, maxSpeed: 4.5 };
const DC = { inertia: 0.012, linear: 0.002, drag: 6e-4, friction: 0.002 };
// The AC coil also has a damper winding, which pulls it towards the synchronous speed once it is close.
const AC = { inertia: 0.03, linear: 0.003, drag: 1e-4, friction: 0.002, damper: 0.05 };

const HOME = {
  force: { extent: { w: 4.4, h: 2.9 }, target: [-0.4, 0, 0], direction: [0.55, 0.24, 1.2] },
  dc: { extent: { w: 3.6, h: 3.4 }, target: [0, -0.7, 0.3], direction: [0.45, 1.25, 1.7] },
  ac: { extent: { w: 3.6, h: 3.4 }, target: [0, -0.7, 0.3], direction: [0.45, 1.25, 1.7] },
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
const camera = new THREE.PerspectiveCamera(40, 1, 0.05, 100);
camera.position.set(0, 1.2, 9);
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
viewer.prepend(renderer.domElement);
scene.add(new THREE.HemisphereLight(0xe7f4ff, 0x32415a, 2.2));
const light = new THREE.DirectionalLight(0xffffff, 2.6);
light.position.set(4, 6, 7);
scene.add(light);
const rim = new THREE.DirectionalLight(0xffffff, 0.8);
rim.position.set(-5, 2, -4);
scene.add(rim);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enablePan = false;
controls.minDistance = 2;
controls.maxDistance = 30;
controls.enableDamping = true;
controls.saveState();
const stage = new THREE.Group();
scene.add(stage);

let palette = readPalette();
let buildTextures = [];
let pickables = [];
let sim = null;
let cameraTween = null;
let fadeIn = null;
let selected = null;

function readPalette() {
  const styles = getComputedStyle(document.documentElement);
  const css = name => styles.getPropertyValue(name).trim();
  const names = ['north', 'south', 'field', 'current', 'force', 'copper', 'steel', 'carbon', 'neutral', 'positive', 'negative', 'half-a', 'half-b'];
  const result = { dark: document.documentElement.getAttribute('data-theme') === 'dark', css: {} };
  for (const name of names) {
    result[name] = new THREE.Color(css(`--${name}`));
    result.css[name] = css(`--${name}`);
  }
  for (const name of ['bg-color', 'text-main', 'text-secondary', 'card-border', 'brand-primary', 'brand-accent-strong', 'correct-border', 'font-mono']) result.css[name] = css(`--${name}`);
  result.accent = new THREE.Color(css('--brand-accent'));
  return result;
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
const shadowTexture = canvasTexture(128, 128, (ctx, w) => {
  const gradient = ctx.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
  gradient.addColorStop(0, 'rgba(0,0,0,0.5)');
  gradient.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, w, w);
}, false);
function labelSprite(text, color, size = 0.5) {
  const texture = canvasTexture(128, 128, (ctx, w, h) => {
    ctx.fillStyle = color;
    ctx.font = '700 92px Manrope, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, w / 2, h / 2 + 4);
  });
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false }));
  sprite.scale.set(size, size, 1);
  sprite.raycast = () => {};
  return sprite;
}
// The letter identifies the same coil end; the sign identifies its supply connection.
// Reuse three textures so a half-turn never allocates a new canvas or GPU texture.
function connectionBadge(letter, color) {
  const maps = ['+', '−', ''].map(sign => canvasTexture(256, 128, (ctx, w, h) => {
    ctx.fillStyle = palette.css['bg-color'];
    ctx.strokeStyle = color;
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.roundRect(5, 5, w - 10, h - 10, 28);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = palette.css['text-main'];
    ctx.font = '700 80px Manrope, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(sign ? `${letter} ${sign}` : letter, w / 2, h / 2 + 3);
  }));
  const badge = new THREE.Sprite(new THREE.SpriteMaterial({ map: maps[2], depthWrite: false, depthTest: false }));
  badge.scale.set(0.66, 0.33, 1);
  badge.renderOrder = 10;
  badge.userData.connectionMaps = maps;
  badge.raycast = () => {};
  return badge;
}
// A flat letter stuck to a face of the apparatus, so it never clips into it.
function faceLabel(text, color, size = 0.6) {
  const texture = canvasTexture(128, 128, (ctx, w, h) => {
    ctx.fillStyle = color;
    ctx.font = '700 96px Manrope, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, w / 2, h / 2 + 6);
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false }));
  mesh.raycast = () => {};
  return mesh;
}
// ---------- Object helpers ----------
const UP = new THREE.Vector3(0, 1, 0);
function material(color, options = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.45, metalness: 0.2, ...options });
}
function part(mesh, key) {
  mesh.userData.part = key;
  pickables.push(mesh);
  return mesh;
}
function makeArrow(color, radius = 0.035, opacity = 1) {
  const group = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.3, roughness: 0.5, transparent: opacity < 1, opacity });
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, 1, 12), mat);
  const head = new THREE.Mesh(new THREE.ConeGeometry(radius * 2.7, 1, 18), mat);
  group.add(shaft, head);
  group.userData = { shaft, head, radius };
  return group;
}
function setArrow(arrow, origin, direction, length) {
  if (!(length > 0.02) || direction.lengthSq() < 1e-8) {
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
// A straight field line with an arrowhead part-way along it.
function fieldLine(from, to, mat, headAt = 0.5) {
  const group = new THREE.Group();
  const direction = to.clone().sub(from);
  const length = direction.length();
  const line = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, length, 6), mat);
  line.position.copy(from).addScaledVector(direction, 0.5);
  line.quaternion.setFromUnitVectors(UP, direction.clone().normalize());
  const head = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.16, 12), mat);
  head.position.copy(from).addScaledVector(direction, headAt);
  head.quaternion.copy(line.quaternion);
  group.add(line, head);
  line.userData.part = head.userData.part = 'field';
  pickables.push(line, head);
  return group;
}
function tube(points, radius, mat, segments = 120) {
  const path = new THREE.CurvePath();
  for (let i = 0; i < points.length - 1; i++) path.add(new THREE.LineCurve3(points[i], points[i + 1]));
  return new THREE.Mesh(new THREE.TubeGeometry(path, segments, radius, 8, false), mat);
}
// Softly glowing beads that flow along a wire to show conventional current.
// Each path point carries the bead size for the segment that starts there, so beads sit centred on the wire.
function currentMarkers(count, color) {
  const geometry = new THREE.SphereGeometry(1, 16, 12);
  const core = new THREE.InstancedMesh(geometry, new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.4, roughness: 0.45 }), count);
  const halo = new THREE.InstancedMesh(geometry, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.1, blending: THREE.AdditiveBlending, depthWrite: false }), count);
  const group = new THREE.Group();
  for (const mesh of [core, halo]) {
    mesh.frustumCulled = false;
    mesh.userData.part = 'current';
    group.add(mesh);
  }
  group.userData = { core, halo, count };
  return group;
}
function setMarkerGlow(markers, strength) {
  markers.userData.core.material.emissiveIntensity = 0.2 + 0.3 * strength;
  markers.userData.halo.material.opacity = 0.04 + 0.08 * strength;
}
const dummy = new THREE.Object3D();
const HALO_SCALE = 1.5;
// Beads on several wires share the instances; every other wire is shifted half a gap so neighbouring turns do not line up.
function placeMarkers(markers, paths, phase, visible, spacing = 0.32) {
  const { core, halo, count } = markers.userData;
  let shown = 0;
  if (visible) {
    paths.forEach((path, j) => {
      const lengths = [];
      let total = 0;
      for (let i = 0; i < path.length - 1; i++) {
        const length = path[i].point.distanceTo(path[i + 1].point);
        lengths.push(length);
        total += length;
      }
      const start = phase + (j % 2) * spacing / 2;
      const n = Math.floor(total / spacing);
      for (let k = 0; k < n && shown < count; k++) {
        let s = ((start + k * spacing) % total + total) % total;
        let i = 0;
        while (i < lengths.length - 1 && s > lengths[i]) s -= lengths[i++];
        dummy.position.lerpVectors(path[i].point, path[i + 1].point, lengths[i] ? Math.min(1, s / lengths[i]) : 0);
        dummy.quaternion.identity();
        dummy.scale.copy(path[i].scale);
        dummy.updateMatrix();
        core.setMatrixAt(shown, dummy.matrix);
        dummy.scale.multiplyScalar(HALO_SCALE);
        dummy.updateMatrix();
        halo.setMatrixAt(shown++, dummy.matrix);
      }
    });
  }
  dummy.position.set(0, -999, 0);
  dummy.scale.setScalar(1);
  dummy.updateMatrix();
  for (let k = shown; k < count; k++) {
    core.setMatrixAt(k, dummy.matrix);
    halo.setMatrixAt(k, dummy.matrix);
  }
  core.instanceMatrix.needsUpdate = halo.instanceMatrix.needsUpdate = true;
}
function ease(k) {
  return k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2;
}
const wrap = angle => Math.atan2(Math.sin(angle), Math.cos(angle));

// ---------- Persistent helpers ----------
const floorShadow = new THREE.Mesh(new THREE.PlaneGeometry(9, 7), new THREE.MeshBasicMaterial({ map: shadowTexture, transparent: true, depthWrite: false }));
floorShadow.rotation.x = -Math.PI / 2;
floorShadow.raycast = () => {};
scene.add(floorShadow);
function applyThemeToPersistent() {
  floorShadow.material.opacity = palette.dark ? 0.75 : 0.3;
}
applyThemeToPersistent();

// ---------- Stage ----------
function disposeObject(object) {
  object.traverse(child => {
    child.geometry?.dispose();
    if (child.material) (Array.isArray(child.material) ? child.material : [child.material]).forEach(mat => mat.dispose());
  });
}
function clearStage() {
  for (const child of [...stage.children]) {
    disposeObject(child);
    stage.remove(child);
  }
  buildTextures.forEach(texture => texture.dispose());
  buildTextures = [];
  pickables = [];
  selected = null;
  sim = null;
}

// ---------- Shared apparatus ----------
// Each magnet is one piece. Its colour fades from the pole colour at each end to neutral in the middle,
// so the N and S faces read as the two ends of one magnet, never as a magnet with a single pole.
// `locate` maps a point in the magnet's frame to { end: 0 or 1, dist: distance along the magnet from its middle }.
function magnetPiece(size, segments, position, locate, key) {
  const geometry = new THREE.BoxGeometry(...size, ...segments);
  geometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(geometry.attributes.position.count * 3), 3));
  const mesh = part(new THREE.Mesh(geometry, material(0xffffff, { vertexColors: true, roughness: 0.55, metalness: 0.12 })), key);
  mesh.position.copy(position);
  mesh.userData.locate = locate;
  return mesh;
}
// Paint the pieces with `ends[0]` at end 0 and `ends[1]` at end 1, fully coloured beyond `reach` from the middle.
function paintMagnet(pieces, ends, reach) {
  const point = new THREE.Vector3();
  const colour = new THREE.Color();
  for (const mesh of pieces) {
    const positions = mesh.geometry.attributes.position;
    const colours = mesh.geometry.attributes.color;
    for (let i = 0; i < positions.count; i++) {
      point.fromBufferAttribute(positions, i).add(mesh.position);
      const { end, dist } = mesh.userData.locate(point);
      colour.copy(ends[end]).lerp(palette.neutral, 1 - THREE.MathUtils.smoothstep(dist, 0, reach));
      colours.setXYZ(i, colour.r, colour.g, colour.b);
    }
    colours.needsUpdate = true;
  }
}
// Evenly spaced, parallel field lines: equal spacing shows a uniform field.
function fieldLineGrid(count, spacing, makeLine) {
  const group = new THREE.Group();
  const offsets = n => Array.from({ length: n }, (_, i) => (i - (n - 1) / 2) * spacing);
  for (const a of offsets(count[0])) for (const b of offsets(count[1])) group.add(makeLine(a, b));
  return group;
}
function battery(position, kind = 'dc') {
  const group = new THREE.Group();
  group.position.copy(position);
  if (kind === 'dc') {
    const body = part(new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 1.3, 32), material(palette.carbon, { roughness: 0.4 })), 'supply');
    body.rotation.z = Math.PI / 2;
    // Band and nub ends are offset from the body's end cap (x = 0.65) so no faces are coplanar and z-fight.
    const band = part(new THREE.Mesh(new THREE.CylinderGeometry(0.305, 0.305, 0.43, 32), material(palette.current, { roughness: 0.4 })), 'supply');
    band.rotation.z = Math.PI / 2;
    band.position.x = 0.445;
    const nub = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.14, 16), material(palette.steel, { metalness: 0.6 }));
    nub.rotation.z = Math.PI / 2;
    nub.position.x = 0.71;
    const plus = labelSprite('+', palette.css['text-main'], 0.45);
    plus.position.set(0.95, 0.35, 0);
    const minus = labelSprite('−', palette.css['text-main'], 0.45);
    minus.position.set(-0.95, 0.35, 0);
    group.add(body, band, nub, plus, minus);
  } else {
    const body = part(new THREE.Mesh(new THREE.BoxGeometry(AC_BOX.w, AC_BOX.h, 0.6), material(palette.carbon, { roughness: 0.5 })), 'ac');
    const face = scopeFace();
    face.position.set(0, 0, 0.301);
    group.add(body, face);
    group.userData.scope = face.userData.scope;
  }
  return group;
}

// ---------- AC supply oscilloscope ----------
// The AC supply's front panel works like a CRO: a beam sweeps across the screen at a fixed time base,
// plotting the supply emf against time. The fixed time base means a higher frequency shows more cycles,
// and the fixed vertical scale means a bigger peak shows a taller wave. The previous sweep fades out ahead of the beam.
const SCOPE = { width: 512, height: 288, columns: 240, sweep: 2.5, screen: { x: 22, y: 18, w: 468, h: 206 } };
function scopeFace() {
  const canvas = document.createElement('canvas');
  canvas.width = SCOPE.width;
  canvas.height = SCOPE.height;
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  buildTextures.push(texture);
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(AC_BOX.w - 0.06, (AC_BOX.w - 0.06) * SCOPE.height / SCOPE.width), new THREE.MeshBasicMaterial({ map: texture }));
  mesh.raycast = () => {};
  mesh.userData.scope = { ctx: canvas.getContext('2d'), texture, samples: new Float32Array(SCOPE.columns), clock: 0, column: 0, value: 0 };
  drawScope(mesh.userData.scope);
  return mesh;
}
// Advance the beam by `elapsed` model seconds, writing `value` (−1 to 1) into the columns it passes.
function advanceScope(scope, elapsed, value) {
  if (!(elapsed > 0)) return;
  scope.clock += elapsed;
  const column = Math.floor(scope.clock / SCOPE.sweep * SCOPE.columns);
  const count = Math.min(column - scope.column, SCOPE.columns);
  for (let k = 1; k <= count; k++) {
    scope.samples[(column - count + k) % SCOPE.columns] = scope.value + (value - scope.value) * k / count;
  }
  scope.column = column;
  scope.value = value;
  if (count > 0) drawScope(scope);
}
function drawScope(scope) {
  const { ctx, samples } = scope;
  const { width, height, columns } = SCOPE;
  const { x, y, w, h } = SCOPE.screen;
  const phosphor = '124, 255, 178';
  ctx.fillStyle = '#1C2025';
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = '#06140D';
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 14);
  ctx.fill();
  // Graticule: 10 by 6 divisions, with brighter axes.
  ctx.lineWidth = 1;
  for (let i = 1; i < 10; i++) {
    ctx.strokeStyle = `rgba(${phosphor}, ${i === 5 ? 0.22 : 0.1})`;
    ctx.beginPath();
    ctx.moveTo(x + w * i / 10, y + 4);
    ctx.lineTo(x + w * i / 10, y + h - 4);
    ctx.stroke();
  }
  for (let i = 1; i < 6; i++) {
    ctx.strokeStyle = `rgba(${phosphor}, ${i === 3 ? 0.3 : 0.1})`;
    ctx.beginPath();
    ctx.moveTo(x + 4, y + h * i / 6);
    ctx.lineTo(x + w - 4, y + h * i / 6);
    ctx.stroke();
  }
  const beam = scope.column % columns;
  const px = c => x + 8 + (w - 16) * c / (columns - 1);
  const py = v => y + h / 2 - v * h * 0.42;
  const trace = (from, to, alpha, glow) => {
    if (to - from < 1) return;
    ctx.strokeStyle = `rgba(${phosphor}, ${alpha})`;
    ctx.shadowColor = `rgba(${phosphor}, ${alpha})`;
    ctx.shadowBlur = glow;
    ctx.lineWidth = 4;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    for (let c = from; c <= to; c++) c === from ? ctx.moveTo(px(c), py(samples[c])) : ctx.lineTo(px(c), py(samples[c]));
    ctx.stroke();
    ctx.shadowBlur = 0;
  };
  // The previous sweep, fading, ahead of the beam; then the current sweep up to the beam.
  trace(Math.min(beam + 6, columns - 1), columns - 1, 0.4, 0);
  trace(0, beam, 0.95, 10);
  ctx.fillStyle = `rgb(${phosphor})`;
  ctx.shadowColor = `rgb(${phosphor})`;
  ctx.shadowBlur = 14;
  ctx.beginPath();
  ctx.arc(px(beam), py(samples[beam]), 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  // Panel lettering.
  ctx.fillStyle = '#D7DCE1';
  ctx.font = '700 30px Manrope, system-ui, sans-serif';
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillText('~ AC SUPPLY', x + 4, height - 32);
  ctx.fillStyle = '#9AA3AD';
  ctx.font = '600 22px "IBM Plex Mono", ui-monospace, monospace';
  ctx.textAlign = 'right';
  ctx.fillText('emf against time', x + w - 4, height - 32);
  scope.texture.needsUpdate = true;
}

// ---------- Mode 1: the motor effect ----------
function buildForce() {
  const group = new THREE.Group();
  stage.add(group);
  const steel = material(palette.steel, { metalness: 0.7, roughness: 0.3 });
  for (const z of [RAIL_Z, -RAIL_Z]) {
    const rail = part(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 5.8, 16), steel), 'rails');
    rail.rotation.z = Math.PI / 2;
    rail.position.set(-0.2, 0, z);
    group.add(rail);
    for (const x of [ROD_LIMIT + 0.2, -ROD_LIMIT - 0.2]) {
      const stop = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.26, 0.16), material(palette.carbon));
      stop.position.set(x, 0.1, z);
      group.add(stop);
    }
  }
  // Rod with a stripe so you can see it roll.
  const rodTexture = canvasTexture(256, 64, (ctx, w, h) => {
    ctx.fillStyle = `#${palette.copper.getHexString()}`;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(0, h * 0.42, w, h * 0.16);
  });
  const rod = part(new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.1, 32), material(0xffffff, { map: rodTexture, metalness: 0.55, roughness: 0.3 })), 'rod');
  rod.rotation.x = Math.PI / 2;
  const rodHolder = new THREE.Group();
  rodHolder.add(rod);
  rodHolder.position.y = ROD_Y;
  group.add(rodHolder);

  // Magnet: one C-shaped magnet, turned as a whole to set the angle. Its two plates are the poles.
  // The plates sit between the rails, so the rails stay outside the field.
  const magnet = new THREE.Group();
  const depth = 2 * MAGNET_HALF_DEPTH;
  // Distance along the C from its middle: up the back, then along a plate.
  const alongC = ({ x, y }) => ({ end: y > 0 ? 0 : 1, dist: (x > 2.19 ? Math.min(Math.abs(y), 1.4) : 1.4) + Math.max(0, 2.42 - x) });
  const top = magnetPiece([4.4, 0.5, depth], [24, 1, 1], new THREE.Vector3(0, 1.4, 0), alongC, 'north');
  const bottom = magnetPiece([4.4, 0.5, depth], [24, 1, 1], new THREE.Vector3(0, -1.4, 0), alongC, 'south');
  const yoke = magnetPiece([0.45, 3.3, depth], [1, 24, 1], new THREE.Vector3(2.42, 0, 0), alongC, 'magnet');
  const topLabel = faceLabel('N', '#ffffff', 0.5);
  topLabel.position.set(-1.6, 1.4, MAGNET_HALF_DEPTH + 0.01);
  const bottomLabel = faceLabel('S', '#ffffff', 0.5);
  bottomLabel.position.set(-1.6, -1.4, MAGNET_HALF_DEPTH + 0.01);
  magnet.add(top, bottom, yoke, topLabel, bottomLabel);
  const fieldMaterial = new THREE.MeshBasicMaterial({ color: palette.field, transparent: true, opacity: 0.26 });
  const lines = fieldLineGrid([8, 3], FIELD_SPACING, (x, z) => fieldLine(new THREE.Vector3(x, 1.15, z), new THREE.Vector3(x, -1.15, z), fieldMaterial, 0.28));
  magnet.add(lines);
  group.add(magnet);

  const supply = battery(new THREE.Vector3(-3.5, 0, 0));
  group.add(supply);
  const wireMat = material(palette.carbon, { roughness: 0.6 });
  group.add(tube([new THREE.Vector3(-3.1, 0, RAIL_Z), new THREE.Vector3(-3.5, 0, RAIL_Z), new THREE.Vector3(-3.5, 0, 0.75)], 0.035, wireMat, 20));
  group.add(tube([new THREE.Vector3(-3.1, 0, -RAIL_Z), new THREE.Vector3(-3.5, 0, -RAIL_Z), new THREE.Vector3(-3.5, 0, -0.75)], 0.035, wireMat, 20));

  const markers = currentMarkers(40, palette.current);
  group.add(markers);
  const triad = {
    field: makeArrow(palette.field, 0.035),
    current: makeArrow(palette.current, 0.035),
    force: makeArrow(palette.force, 0.05)
  };
  for (const arrow of Object.values(triad)) {
    arrow.traverse(child => { child.userData.part = arrow === triad.force ? 'force' : arrow === triad.current ? 'current' : 'field'; });
    group.add(arrow);
  }
  pickables.push(...triad.force.children);
  sim = { kind: 'force', group, rod, rodHolder, magnet, poles: { top, bottom, yoke, topLabel, bottomLabel, lines }, supply, markers, triad, x: 0, v: 0, phase: 0 };
  updateForceGeometry();
}
function forceVectors() {
  const theta = THREE.MathUtils.degToRad(state.values.angle);
  const tilt = Math.PI / 2 - theta;
  const fieldSign = state.flip ? -1 : 1;
  // The magnet turns about the rails, so the field stays at right angles to them.
  const field = new THREE.Vector3(0, -Math.cos(tilt), -Math.sin(tilt)).multiplyScalar(fieldSign);
  const currentSign = state.reverse ? -1 : 1;
  const current = new THREE.Vector3(0, 0, -currentSign);
  const on = state.powered && state.values.current > 0;
  const size = on ? state.values.field * state.values.current * ROD_LENGTH * Math.sin(theta) : 0;
  const force = new THREE.Vector3().crossVectors(current, field);
  return { theta, tilt, field, current, force, size, on };
}
function updateForceGeometry() {
  if (!sim || sim.kind !== 'force') return;
  const { tilt } = forceVectors();
  sim.magnet.rotation.x = tilt;
  // Flipping the magnet swaps which pole is on top and reverses the field lines.
  const { top, bottom, yoke, topLabel, bottomLabel, lines } = sim.poles;
  paintMagnet([top, bottom, yoke], state.flip ? [palette.south, palette.north] : [palette.north, palette.south], 2.4);
  top.userData.part = state.flip ? 'south' : 'north';
  bottom.userData.part = state.flip ? 'north' : 'south';
  topLabel.position.y = state.flip ? -1.4 : 1.4;
  bottomLabel.position.y = state.flip ? 1.4 : -1.4;
  lines.scale.y = state.flip ? -1 : 1;
  // Reversing the current means turning the supply round.
  sim.supply.rotation.y = state.reverse ? Math.PI / 2 : -Math.PI / 2;
}
// Through the centres of the rails (y = 0) and the rod (y = ROD_Y).
function forcePath() {
  const x = sim.x;
  const plusZ = state.reverse ? -RAIL_Z : RAIL_Z;
  const rail = new THREE.Vector3().setScalar(0.068);
  const rod = new THREE.Vector3().setScalar(0.092);
  return [
    { point: new THREE.Vector3(-3.1, 0, plusZ), scale: rail },
    { point: new THREE.Vector3(x, 0, plusZ), scale: rod },
    { point: new THREE.Vector3(x, ROD_Y, plusZ), scale: rod },
    { point: new THREE.Vector3(x, ROD_Y, -plusZ), scale: rod },
    { point: new THREE.Vector3(x, 0, -plusZ), scale: rail },
    { point: new THREE.Vector3(-3.1, 0, -plusZ), scale: rail }
  ];
}
function stepForce(delta) {
  const { field, current, force, size, on } = forceVectors();
  const accel = on ? Math.sign(force.x) * size * ROD.gain : 0;
  sim.v += (accel - ROD.damping * sim.v) * delta;
  sim.v = THREE.MathUtils.clamp(sim.v, -ROD.maxSpeed, ROD.maxSpeed);
  sim.x += sim.v * delta;
  if (Math.abs(sim.x) > ROD_LIMIT) {
    sim.x = Math.sign(sim.x) * ROD_LIMIT;
    sim.v = -sim.v * 0.25;
  }
  sim.rodHolder.position.x = sim.x;
  sim.rod.rotation.y -= sim.v * delta / 0.08;
  if (on) sim.phase += delta * (0.3 + state.values.current * 0.17);
  placeMarkers(sim.markers, [forcePath()], sim.phase, on && state.showFlow, 0.7);
  setMarkerGlow(sim.markers, Math.min(1, state.values.current / 3));
  const origin = new THREE.Vector3(sim.x, 0.24, 0);
  setArrow(sim.triad.field, origin, field, 0.75);
  setArrow(sim.triad.current, origin, current, on ? 0.75 : 0);
  setArrow(sim.triad.force, origin, force.lengthSq() ? new THREE.Vector3(Math.sign(force.x), 0, 0) : force, on && size > 0 ? 0.35 + Math.min(1.9, size / 0.02 * 0.55) : 0);
}

// ---------- Modes 2 and 3: a coil between two poles ----------
function buildCoil(kind) {
  const group = new THREE.Group();
  stage.add(group);
  // One U-shaped magnet standing on the base: its two arms end in pole faces as deep as the coil sides.
  const armBottom = BASE_Y + 0.5;
  const armHeight = POLE_HALF - armBottom;
  const yokeY = (BASE_Y + armBottom) / 2;
  // Distance along the U from its middle: out along the bar, then up an arm.
  const alongU = ({ x, y }) => ({ end: x < 0 ? 0 : 1, dist: y <= armBottom + 1e-6 ? Math.abs(x) : 2.05 + (y - yokeY) });
  const arms = [-1, 1].map(side => magnetPiece([0.5, armHeight, 2 * POLE_HALF], [1, 24, 1], new THREE.Vector3(side * 2.05, POLE_HALF - armHeight / 2, 0), alongU, side < 0 ? 'north' : 'south'));
  const bar = magnetPiece([4.6, 0.5, 2 * POLE_HALF], [32, 1, 1], new THREE.Vector3(0, yokeY, 0), alongU, 'magnet');
  paintMagnet([...arms, bar], [palette.north, palette.south], 3.3);
  group.add(...arms, bar);
  const north = faceLabel('N', '#ffffff', 0.45);
  north.position.set(-2.05, 0.75, POLE_HALF + 0.01);
  const south = faceLabel('S', '#ffffff', 0.45);
  south.position.set(2.05, 0.75, POLE_HALF + 0.01);
  group.add(north, south);
  const fieldMaterial = new THREE.MeshBasicMaterial({ color: palette.field, transparent: true, opacity: 0.24 });
  group.add(fieldLineGrid([5, 5], FIELD_SPACING, (y, z) => fieldLine(new THREE.Vector3(-1.8, y, z), new THREE.Vector3(1.8, y, z), fieldMaterial, 0.88)));

  const axle = part(new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 4.2, 16), material(palette.steel, { metalness: 0.75, roughness: 0.25 })), 'axle');
  axle.rotation.x = Math.PI / 2;
  axle.position.z = 0.5;
  group.add(axle);
  const base = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.16, 5.4), material(palette.steel, { roughness: 0.8, metalness: 0.1 }));
  base.position.set(0, BASE_Y - 0.08, 0.6);
  group.add(base);
  for (const z of [-1.55, 2.45]) {
    const bearing = new THREE.Mesh(new THREE.BoxGeometry(0.3, -BASE_Y - 0.08, 0.22), material(palette.carbon, { roughness: 0.7 }));
    bearing.position.set(0, (BASE_Y - 0.08) / 2, z);
    group.add(bearing);
  }

  const rotor = new THREE.Group();
  group.add(rotor);
  const coilGroup = new THREE.Group();
  rotor.add(coilGroup);
  const ringParts = new THREE.Group();
  rotor.add(ringParts);
  const brushes = new THREE.Group();
  group.add(brushes);
  const wires = new THREE.Group();
  group.add(wires);

  // The AC supply stands on the base, so its larger box rises above the wires.
  const supply = battery(new THREE.Vector3(0, kind === 'ac' ? BASE_Y + AC_BOX.h / 2 : SUPPLY_Y, SUPPLY_Z), kind === 'ac' ? 'ac' : 'dc');
  group.add(supply);

  // Optional sparse flow cues supplement the stationary direction arrows.
  const markers = currentMarkers(240, palette.current);
  rotor.add(markers);
  const forces = [makeArrow(palette.force, 0.05), makeArrow(palette.force, 0.05)];
  for (const arrow of forces) {
    arrow.traverse(child => { child.userData.part = 'force'; });
    pickables.push(...arrow.children);
    group.add(arrow);
  }
  const currentArrows = [1, -1].map(() => {
    const arrow = makeArrow(palette.current, 0.035);
    arrow.traverse(child => { child.userData.part = 'current'; });
    pickables.push(...arrow.children);
    rotor.add(arrow);
    return arrow;
  });
  const sideLabels = ['A', 'B'].map((letter, i) => {
    const label = kind === 'dc'
      ? connectionBadge(letter, palette.css[i ? 'half-b' : 'half-a'])
      : labelSprite(letter, palette.css['text-main'], 0.32);
    label.position.set((i ? -1 : 1) * 1.42, 0, 1.25);
    rotor.add(label);
    return label;
  });
  sim = { kind, currentArrows, sideLabels, group, rotor, coilGroup, ringParts, brushes, wires, markers, forces, supply, scope: supply.userData.scope, theta: 0.5, omega: 0, phase: 0, time: 0, supplyTime: 0, trace: [], history: [], current: 0, torque: 0 };
  buildCoilWinding();
  buildRings();
}
function buildCoilWinding() {
  const coilGroup = sim.coilGroup;
  for (const child of [...coilGroup.children]) {
    disposeObject(child);
    coilGroup.remove(child);
  }
  pickables = pickables.filter(mesh => mesh.userData.part !== 'coil');
  const turns = sim.kind === 'ac' ? AC_TURNS : state.values.turns;
  const loops = Math.max(1, Math.round(turns / 10));
  const mat = material(palette.copper, { metalness: 0.6, roughness: 0.3 });
  // In the DC motor the leads take the colour of the half-ring (or slip ring) they are joined to: A purple, B green.
  const split = sim.kind === 'dc' && state.commutator;
  const ringZ = split ? [RING_Z, RING_Z] : [RING_Z - 0.2, RING_Z + 0.2];
  const leadMats = sim.kind === 'dc' ? [material(palette['half-a'], { metalness: 0.4, roughness: 0.35 }), material(palette['half-b'], { metalness: 0.4, roughness: 0.35 })] : [mat, mat];
  for (let i = 0; i < loops; i++) {
    const offset = (i - (loops - 1) / 2) * 0.05;
    const r = COIL_R + Math.abs(offset) * 0.3;
    const points = [
      new THREE.Vector3(RING_R - 0.01, offset * 0.4, ringZ[0]),
      new THREE.Vector3(r, offset, COIL_HALF + 0.2),
      new THREE.Vector3(r, offset, -COIL_HALF),
      new THREE.Vector3(-r, offset, -COIL_HALF),
      new THREE.Vector3(-r, offset, COIL_HALF + 0.2),
      new THREE.Vector3(-RING_R + 0.01, offset * 0.4, ringZ[1])
    ];
    // One uninterrupted tube avoids open, mismatched end faces at the bends.
    // Material boundaries sit on the straight coil sides, beyond each bend.
    const segments = 200;
    const winding = tube(points, 0.035, [mat, ...leadMats], segments);
    const lengths = points.slice(1).map((point, j) => point.distanceTo(points[j]));
    const total = lengths.reduce((sum, length) => sum + length, 0);
    const leadEnd = Math.round((lengths[0] + 0.25) / total * segments);
    const leadStart = Math.round((total - lengths[lengths.length - 1] - 0.25) / total * segments);
    const indicesPerSegment = winding.geometry.parameters.radialSegments * 6;
    winding.geometry.clearGroups();
    winding.geometry.addGroup(0, leadEnd * indicesPerSegment, 1);
    winding.geometry.addGroup(leadEnd * indicesPerSegment, (leadStart - leadEnd) * indicesPerSegment, 0);
    winding.geometry.addGroup(leadStart * indicesPerSegment, (segments - leadStart) * indicesPerSegment, 2);
    coilGroup.add(part(winding, 'coil'));
  }
}
// One path along each turn drawn in buildCoilWinding, so every bead is a round ball centred on its own wire.
function coilPaths() {
  const turns = sim.kind === 'ac' ? AC_TURNS : state.values.turns;
  const loops = Math.max(1, Math.round(turns / 10));
  const scale = new THREE.Vector3().setScalar(0.044);
  const paths = [];
  for (let i = 0; i < loops; i++) {
    const offset = (i - (loops - 1) / 2) * 0.05;
    const r = COIL_R + Math.abs(offset) * 0.3;
    paths.push([
      new THREE.Vector3(r, offset, COIL_HALF),
      new THREE.Vector3(r, offset, -COIL_HALF),
      new THREE.Vector3(-r, offset, -COIL_HALF),
      new THREE.Vector3(-r, offset, COIL_HALF)
    ].map(point => ({ point, scale })));
  }
  return paths;
}
function buildRings() {
  for (const groupName of ['ringParts', 'brushes', 'wires']) {
    for (const child of [...sim[groupName].children]) {
      disposeObject(child);
      sim[groupName].remove(child);
    }
  }
  pickables = pickables.filter(mesh => !['commutator', 'sliprings', 'brush'].includes(mesh.userData.part));
  const copper = material(palette.copper, { metalness: 0.7, roughness: 0.25 });
  const split = sim.kind === 'dc' && state.commutator;
  const ringZ = split ? [RING_Z, RING_Z] : [RING_Z - 0.2, RING_Z + 0.2];
  if (split) {
    // Each half is centred on one side of the coil; the gaps line up with the coil's plane turned by 90°.
    // Half A (centred on +x at θ = 0) is joined to coil side A; half B to side B.
    const gap = 0.16;
    for (const [start, key] of [[gap, 'half-a'], [Math.PI + gap, 'half-b']]) {
      const geometry = new THREE.CylinderGeometry(RING_R, RING_R, 0.42, 32, 1, false, start, Math.PI - 2 * gap);
      geometry.rotateX(Math.PI / 2);
      const half = part(new THREE.Mesh(geometry, material(palette[key], { metalness: 0.45, roughness: 0.3 })), 'commutator');
      half.position.z = RING_Z;
      sim.ringParts.add(half);
    }
    const insulator = new THREE.Mesh(new THREE.CylinderGeometry(RING_R - 0.04, RING_R - 0.04, 0.4, 24), material(palette.carbon, { roughness: 0.8 }));
    insulator.rotation.x = Math.PI / 2;
    insulator.position.z = RING_Z;
    sim.ringParts.add(insulator);
  } else {
    ringZ.forEach((z, k) => {
      const ringMat = sim.kind === 'dc' ? material(palette[k ? 'half-b' : 'half-a'], { metalness: 0.45, roughness: 0.3 }) : copper;
      const ring = part(new THREE.Mesh(new THREE.CylinderGeometry(RING_R, RING_R, 0.2, 32), ringMat), 'sliprings');
      ring.rotation.x = Math.PI / 2;
      ring.position.z = z;
      sim.ringParts.add(ring);
    });
  }
  const brushMat = material(palette.carbon, { roughness: 0.85 });
  const wireMat = material(palette.carbon, { roughness: 0.6 });
  for (const [side, z] of [[1, ringZ[0]], [-1, ringZ[1]]]) {
    const brush = part(new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.2, 0.18), brushMat), 'brush');
    brush.position.set(side * (RING_R + 0.13), 0, z);
    sim.brushes.add(brush);
    const sign = labelSprite(side * (state.reverse ? -1 : 1) > 0 ? '+' : '−', palette.css['text-main'], 0.4);
    sign.position.set(side * (RING_R + 0.2), 0.35, z + 0.1);
    if (sim.kind === 'dc') sim.brushes.add(sign);
    sim.wires.add(tube([
      new THREE.Vector3(side * (RING_R + 0.26), 0, z),
      new THREE.Vector3(side * 1.35, 0, z),
      new THREE.Vector3(side * 1.35, SUPPLY_Y, z),
      new THREE.Vector3(side * 1.35, SUPPLY_Y, SUPPLY_Z),
      new THREE.Vector3(side * (sim.kind === 'ac' ? AC_BOX.w / 2 + 0.02 : 0.72), SUPPLY_Y, SUPPLY_Z)
    ], 0.03, wireMat, 60));
  }
  if (sim.kind === 'dc') sim.supply.rotation.y = state.reverse ? Math.PI : 0;
}
// Signed current through the coil, in amps. Positive means along side 1 away from the rings.
function coilCurrent() {
  if (sim.kind === 'ac') {
    return state.powered ? state.values.peak * Math.sin(2 * Math.PI * state.values.frequency * sim.supplyTime) : 0;
  }
  if (!state.powered) return 0;
  const direction = state.reverse ? -1 : 1;
  const contact = state.commutator ? (Math.cos(sim.theta) >= 0 ? 1 : -1) : 1;
  return direction * contact * state.values.current;
}
function coilConstant() {
  return sim.kind === 'ac' ? AC_TURNS * AC_FIELD * COIL_AREA : state.values.turns * state.values.field * COIL_AREA;
}
function stepCoil(delta) {
  const model = sim.kind === 'ac' ? AC : DC;
  const steps = 8;
  const dt = delta / steps;
  const watchSwap = sim.kind === 'dc' && state.pauseSwap && state.commutator && state.powered;
  let swapped = false;
  let elapsed = 0;
  for (let i = 0; i < steps; i++) {
    elapsed += dt;
    const before = Math.cos(sim.theta);
    if (sim.kind === 'ac' && state.powered) sim.supplyTime += dt;
    const current = coilCurrent();
    // T = BANI cos θ, with the forces on the two long sides making a couple about the axle.
    const torque = -coilConstant() * current * Math.cos(sim.theta);
    let net = torque - model.linear * sim.omega - model.drag * sim.omega * Math.abs(sim.omega);
    if (sim.kind === 'ac' && state.powered) {
      const synchronous = 2 * Math.PI * state.values.frequency;
      if (Math.abs(sim.omega) > 0.3 * synchronous) net -= model.damper * (sim.omega - Math.sign(sim.omega) * synchronous);
    }
    if (Math.abs(sim.omega) < 0.03 && Math.abs(torque) <= model.friction) {
      sim.omega = 0;
      net = 0;
    } else {
      net -= model.friction * Math.sign(sim.omega || torque);
    }
    sim.omega += net / model.inertia * dt;
    sim.theta += sim.omega * dt;
    sim.current = current;
    sim.torque = torque;
    // Stop just after the halves change brushes, when the coil has turned past vertical.
    if (watchSwap && Math.abs(sim.omega) > 0.1 && (before >= 0) !== (Math.cos(sim.theta) >= 0)) {
      swapped = true;
      sim.current = coilCurrent();
      sim.torque = -coilConstant() * sim.current * Math.cos(sim.theta);
      break;
    }
  }
  // Keep arrows and readouts in the same instant, including while paused.
  sim.current = coilCurrent();
  sim.torque = -coilConstant() * sim.current * Math.cos(sim.theta);
  sim.time += elapsed;
  // The supply emf is in phase with the current here, so the scope plots it on the same fixed scale.
  if (sim.scope) advanceScope(sim.scope, elapsed, sim.current / STEPPERS.peak.max);
  sim.rotor.rotation.z = sim.theta;
  if (sim.kind === 'dc') {
    sim.sideLabels.forEach((badge, i) => {
      const positive = halfOnPlus() === (i ? 'B' : 'A');
      badge.material.map = badge.userData.connectionMaps[state.powered ? (positive ? 0 : 1) : 2];
    });
  }
  if (delta > 0) sim.history.push([sim.time, sim.theta]);
  while (sim.history.length && sim.time - sim.history[0][0] > 3) sim.history.shift();
  if (delta > 0) sim.trace.push([sim.time, sim.current, sim.torque]);
  while (sim.trace.length && sim.time - sim.trace[0][0] > 8) sim.trace.shift();

  sim.phase += elapsed * (0.25 + Math.abs(sim.current) * 0.2) * Math.sign(sim.current);
  placeMarkers(sim.markers, coilPaths().slice(0, 1), sim.phase, state.showFlow && Math.abs(sim.current) > 0.05, 0.85);
  sim.currentArrows.forEach((arrow, i) => {
    const side = i ? -1 : 1;
    const direction = -side * Math.sign(sim.current);
    setArrow(arrow, new THREE.Vector3(side * (COIL_R + 0.23), 0, -direction * 0.675), new THREE.Vector3(0, 0, direction), Math.abs(sim.current) > 0.05 ? 1.35 : 0);
  });
  setMarkerGlow(sim.markers, Math.min(1, Math.abs(sim.current) / 3));

  // Force on each long side: F = NBIL, vertical, opposite on the two sides.
  const turns = sim.kind === 'ac' ? AC_TURNS : state.values.turns;
  const field = sim.kind === 'ac' ? AC_FIELD : state.values.field;
  const sideForce = turns * field * sim.current * COIL_SIDE;
  const length = coilForceArrowLength(sideForce);
  const c = Math.cos(sim.theta);
  const s = Math.sin(sim.theta);
  const down = new THREE.Vector3(0, -Math.sign(sideForce), 0);
  setArrow(sim.forces[0], new THREE.Vector3(COIL_R * c, COIL_R * s, 0), down, length);
  setArrow(sim.forces[1], new THREE.Vector3(-COIL_R * c, -COIL_R * s, 0), down.clone().negate(), length);
  if (swapped) pauseAtSwap();
}
// Fixed force scale: doubling NBIL doubles arrow length until the display limit.
function coilSideForce() {
  const turns = sim.kind === 'ac' ? AC_TURNS : state.values.turns;
  const field = sim.kind === 'ac' ? AC_FIELD : state.values.field;
  return turns * field * sim.current * COIL_SIDE;
}
function coilForceArrowLength(force) {
  return Math.min(2.4, Math.abs(force) * 1.5);
}
function updateTurningDisplay() {
  const show = sim && (sim.kind === 'dc' || sim.kind === 'ac');
  $('turning-display').hidden = !show;
  $('vertical-view').hidden = !show;
  if (!show) return;
  const peakCurrent = sim.kind === 'ac' ? state.values.peak : state.values.current;
  const peakTorque = coilConstant() * peakCurrent;
  const fraction = peakTorque > 0 ? Math.min(1, Math.abs(sim.torque) / peakTorque) : 0;
  const arc = $('turning-arc');
  const head = $('turning-head');
  // Treat round-off at the exact vertical position as zero.
  arc.hidden = head.hidden = fraction < 1e-6;
  arc.style.display = head.style.display = fraction < 1e-6 ? 'none' : '';
  const direction = sim.torque < 0 ? -1 : 1;
  const start = -Math.PI / 2;
  const sweep = fraction * Math.PI * 1.5;
  const end = start + direction * sweep;
  const x = 40 + 26 * Math.cos(end), y = 40 - 26 * Math.sin(end);
  arc.setAttribute('d', `M40 66 A26 26 0 ${sweep > Math.PI ? 1 : 0} ${direction < 0 ? 1 : 0} ${x} ${y}`);
  const tx = -direction * Math.sin(end), ty = -direction * Math.cos(end);
  head.setAttribute('d', `M${x + tx * 4} ${y + ty * 4} L${x - tx * 5 - ty * 4} ${y - ty * 5 + tx * 4} L${x - tx * 5 + ty * 4} ${y - ty * 5 - tx * 4} Z`);
  const vertical = Math.abs(Math.cos(sim.theta)) < 1e-6;
  setText('turning-value', `Turning effect: ${fmt(Math.abs(sim.torque), 3)} N m · ${Math.round(fraction * 100)}% of peak`);
  setText('turning-explanation', vertical && Math.abs(sim.current) > 0.05
    ? 'Vertical: the forces act through the axle. Force remains, but the turning effect is zero.'
    : `Force on each side: ${fmt(Math.abs(coilSideForce()), 2)} N. The turning arrow shrinks as the force lines approach the axle; pink arrows show the forces themselves.`);
}
// Which half-ring touches the + brush. Half A sits on the right-hand brush while cos θ ≥ 0; the + brush is on the right unless the current is reversed.
function halfOnPlus() {
  const right = !state.commutator || Math.cos(sim.theta) >= 0 ? 'A' : 'B';
  return state.reverse ? (right === 'A' ? 'B' : 'A') : right;
}
// The coil side on the right (x > 0) and the direction of its current: true means into the page, seen from the rings end.
function rightSide() {
  const side = Math.cos(sim.theta) >= 0 ? 'A' : 'B';
  const into = (side === 'A' ? 1 : -1) * sim.current > 0;
  return { side, into };
}
function halfLabel(half) {
  return `<b style="color:var(--half-${half.toLowerCase()})">${half}</b>`;
}
function pauseAtSwap() {
  setPlaying(false);
  state.swapPaused = true;
  const { side, into } = rightSide();
  const other = side === 'A' ? 'B' : 'A';
  readout.textContent = `SWAP · The coil has just passed vertical, where the forces point through the axle and give no turning effect; its momentum carried it on. Now half-ring ${halfOnPlus()} touches the + brush, so the current in the coil has reversed. Side ${side} has just moved over to the right: it now carries current ${into ? 'in (⊗)' : 'out (⊙)'} and is pushed ${into ? 'down' : 'up'}, just as side ${other} was. So the coil keeps turning the same way. Press “Play motion” to carry on.`;
}
// Average turning rate over the last few seconds, in revolutions per second.
function coilSpeed() {
  const history = sim.history;
  if (history.length < 2) return 0;
  const [t0, a0] = history[0];
  const [t1, a1] = history[history.length - 1];
  return t1 > t0 ? (a1 - a0) / (t1 - t0) / (2 * Math.PI) : 0;
}

// ---------- Readouts ----------
const fmt = (value, digits = 2) => {
  const text = Math.abs(value) < 0.5 * 10 ** -digits ? (0).toFixed(digits) : value.toFixed(digits);
  return text.replace('-', '−');
};
function row(label, value) {
  return `<div class="row"><span>${label}</span><span>${value}</span></div>`;
}
function updateEquation() {
  const box = $('equation');
  if (!sim) return;
  if (sim.kind === 'force') {
    const { theta, size, on } = forceVectors();
    const deg = state.values.angle;
    box.innerHTML = `<div class="formula">F = B I L sin θ</div>`
      + `<div class="sub">= ${fmt(state.values.field)} T × ${fmt(on ? state.values.current : 0, 1)} A × ${fmt(ROD_LENGTH, 3)} m × sin ${deg}°</div>`
      + row('Force on rod', `<b>${fmt(size, 3)} N</b>`)
      + row('Direction', on && size > 1e-6 ? (forceVectors().force.x > 0 ? 'to the right →' : '← to the left') : '—')
      + (on ? '' : `<div class="status warn">Current off: no force.</div>`)
      + (on && Math.sin(theta) < 1e-6 ? `<div class="status warn">Wire parallel to the field: no force.</div>` : '');
    return;
  }
  if (sim.kind === 'dc' || sim.kind === 'ac') {
    const turns = sim.kind === 'ac' ? AC_TURNS : state.values.turns;
    const field = sim.kind === 'ac' ? AC_FIELD : state.values.field;
    const planeAngle = Math.round(THREE.MathUtils.radToDeg(Math.acos(Math.abs(Math.cos(sim.theta)))));
    const speed = Math.abs(coilSpeed());
    let html = sim.kind === 'ac' ? `<div class="formula">I = I₀ sin(2πft)</div>` : `<div class="formula">T = B A N I cos θ</div>`;
    html += `<div class="sub">B = ${fmt(field)} T · A = 20 cm² · N = ${turns}</div>`;
    html += row('Current I', `${fmt(sim.current, 1)} A`);
    html += row('Force on each side', `${fmt(Math.abs(coilSideForce()), 2)} N`);
    html += row('Coil to field θ', `${planeAngle}°`);
    html += row('Torque T', `<b>${fmt(Math.abs(sim.torque), 3)} N m</b>`);
    html += row('Speed (slowed)', `${fmt(speed, 2)} rev/s`);
    if (sim.kind === 'dc') html += row('+ brush touches', `half-ring ${halfLabel(halfOnPlus())}`);
    if (sim.kind === 'ac') {
      const inStep = state.powered && Math.abs(speed - state.values.frequency) < 0.04 * state.values.frequency;
      html += row('Supply frequency', `${fmt(state.values.frequency, 1)} Hz`);
      html += `<div class="status ${inStep ? 'good' : 'warn'}">${!state.powered ? 'Supply off.' : inStep ? '✓ In step: one turn per cycle.' : speed > 0.05 ? 'Not in step with the supply.' : 'Shaking, not turning.'}</div>`;
    } else if (state.powered && speed < 0.02 && sim.time > 1.5) {
      const reason = state.commutator ? 'Stuck: the turning effect is too small to beat friction.' : 'No commutator: the coil settles with its plane at 90° to the field.';
      html += `<div class="status warn">${reason}</div>`;
    }
    box.innerHTML = html;
    return;
  }
}

// ---------- DC end view ----------
function updateEndViewVisibility() {
  const show = state.mode === 'dc' && state.endView;
  $('endview').hidden = !show;
  document.body.classList.toggle('has-endview', show);
  if (show) drawEndView();
}
function setText(id, html) {
  const element = $(id);
  if (element.innerHTML !== html) element.innerHTML = html;
}
// The coil and commutator seen from the rings end (looking along −z), with x to the right and y up as in the 3D view.
function drawEndView() {
  if ($('endview').hidden || !sim || sim.kind !== 'dc') return;
  const prepared = prepareCanvas($('endview-canvas'));
  if (!prepared) return;
  const { ctx, w, h } = prepared;
  const c = palette.css;
  const cx = w / 2;
  const cy = h / 2;
  const coilR = w * 0.26;
  const ringR = w * 0.1;
  const font = c['font-mono'];

  // Poles and field.
  ctx.fillStyle = c.north;
  ctx.fillRect(0, h * 0.1, w * 0.08, h * 0.8);
  ctx.fillStyle = c.south;
  ctx.fillRect(w * 0.92, h * 0.1, w * 0.08, h * 0.8);
  ctx.fillStyle = '#fff';
  ctx.font = `700 11px ${font}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('N', w * 0.04, cy);
  ctx.fillText('S', w * 0.96, cy);
  ctx.strokeStyle = c.field;
  ctx.fillStyle = c.field;
  ctx.globalAlpha = 0.3;
  ctx.lineWidth = 1;
  // Evenly spaced across the pole faces: a uniform field.
  for (const y of [0.18, 0.34, 0.5, 0.66, 0.82].map(f => h * f)) {
    ctx.beginPath();
    ctx.moveTo(w * 0.11, y);
    ctx.lineTo(w * 0.89, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(w * 0.62, y - 4);
    ctx.lineTo(w * 0.68, y);
    ctx.lineTo(w * 0.62, y + 4);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Coil: side A at angle θ, side B opposite. Canvas y points down, so world y is flipped.
  const ux = Math.cos(sim.theta);
  const uy = Math.sin(sim.theta);
  const sides = [
    { half: 'A', sign: 1, x: cx + coilR * ux, y: cy - coilR * uy },
    { half: 'B', sign: -1, x: cx - coilR * ux, y: cy + coilR * uy }
  ];
  ctx.strokeStyle = c.copper;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(sides[0].x, sides[0].y);
  ctx.lineTo(sides[1].x, sides[1].y);
  ctx.stroke();

  // Commutator halves (or slip rings), drawn over the middle of the coil.
  const ringWidth = w * 0.05;
  ctx.lineWidth = ringWidth;
  if (state.commutator) {
    const halfSpan = Math.PI / 2 - 0.16;
    for (const [key, centre] of [['half-a', sim.theta], ['half-b', sim.theta + Math.PI]]) {
      ctx.strokeStyle = c[key];
      ctx.beginPath();
      ctx.arc(cx, cy, ringR, -(centre + halfSpan), -(centre - halfSpan));
      ctx.stroke();
    }
  } else {
    // The two slip rings sit one behind the other; draw them as two circles.
    ctx.strokeStyle = c['half-a'];
    ctx.beginPath();
    ctx.arc(cx, cy, ringR, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = c['half-b'];
    ctx.lineWidth = ringWidth * 0.6;
    ctx.beginPath();
    ctx.arc(cx, cy, ringR * 0.45, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Brushes: the + brush is on the right unless the current is reversed. Each is outlined in the colour of the half it touches.
  const rightHalf = !state.commutator || ux >= 0 ? 'A' : 'B';
  const brushW = w * 0.07;
  const brushH = w * 0.07;
  for (const side of [1, -1]) {
    const x = cx + side * (ringR + ringWidth / 2 + brushW / 2);
    const touching = side > 0 ? rightHalf : (rightHalf === 'A' ? 'B' : 'A');
    ctx.fillStyle = c.carbon;
    ctx.fillRect(x - brushW / 2, cy - brushH / 2, brushW, brushH);
    ctx.strokeStyle = c[`half-${touching.toLowerCase()}`];
    ctx.lineWidth = 2;
    ctx.strokeRect(x - brushW / 2, cy - brushH / 2, brushW, brushH);
    ctx.fillStyle = c['text-main'];
    ctx.font = `700 13px ${font}`;
    ctx.fillText(side * (state.reverse ? -1 : 1) > 0 ? '+' : '−', x, cy - brushH / 2 - 8);
  }

  // Horizontal moment arms collapse to zero when the force lines pass through the axle.
  if (Math.abs(sim.current) > 0.05) {
    ctx.strokeStyle = c.force;
    ctx.globalAlpha = 0.55;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([3, 3]);
    for (const side of sides) {
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(side.x, cy);
      ctx.moveTo(side.x, side.y);
      ctx.lineTo(side.x, cy);
      ctx.stroke();
    }
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
  }
  // Coil sides with current symbols and force arrows.
  const flowing = Math.abs(sim.current) > 0.05;
  const sideR = w * 0.055;
  for (const side of sides) {
    const into = side.sign * sim.current > 0;
    ctx.fillStyle = c[`half-${side.half.toLowerCase()}`];
    ctx.beginPath();
    ctx.arc(side.x, side.y, sideR, 0, Math.PI * 2);
    ctx.fill();
    // Light symbols on the darker light-theme colours, dark ones on the bright dark-theme colours.
    const ink = palette.dark ? c['bg-color'] : '#fff';
    ctx.strokeStyle = ink;
    ctx.fillStyle = ink;
    ctx.lineWidth = 2;
    if (flowing && into) {
      const k = sideR * 0.55;
      ctx.beginPath();
      ctx.moveTo(side.x - k, side.y - k);
      ctx.lineTo(side.x + k, side.y + k);
      ctx.moveTo(side.x + k, side.y - k);
      ctx.lineTo(side.x - k, side.y + k);
      ctx.stroke();
    } else if (flowing) {
      ctx.beginPath();
      ctx.arc(side.x, side.y, sideR * 0.28, 0, Math.PI * 2);
      ctx.fill();
    }
    // Letter on the outside of the coil.
    ctx.fillStyle = c[`half-${side.half.toLowerCase()}`];
    ctx.font = `700 11px ${font}`;
    const lx = side.sign * ux;
    const ly = side.sign * uy;
    const connection = state.powered ? ` ${halfOnPlus() === side.half ? '+' : '−'}` : '';
    ctx.fillText(side.half + connection, side.x + lx * sideR * 2.1, side.y - ly * sideR * 2.1);
    if (flowing) {
      // Current into the page with the field to the right gives a downward force (F = IL × B).
      const dir = into ? 1 : -1;
      const y0 = side.y + dir * (sideR + 3);
      const y1 = y0 + dir * h * 0.1 * coilForceArrowLength(coilSideForce());
      ctx.strokeStyle = c.force;
      ctx.fillStyle = c.force;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(side.x, y0);
      ctx.lineTo(side.x, y1 - dir * 4);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(side.x - 5, y1 - dir * 6);
      ctx.lineTo(side.x, y1 + dir * 2);
      ctx.lineTo(side.x + 5, y1 - dir * 6);
      ctx.fill();
    }
  }
  ctx.textBaseline = 'alphabetic';

  setText('endview-contact', state.commutator ? `+ brush touches half-ring ${halfLabel(halfOnPlus())}` : `+ brush stays connected to side ${halfLabel(state.reverse ? 'B' : 'A')}`);
  let rule;
  if (!flowing) rule = 'No current. Symbols when flowing: ⊗ into the page, ⊙ out of the page.';
  else if (state.commutator) {
    const { into } = rightSide();
    rule = `Right-hand side: current <b>${into ? 'in ⊗' : 'out ⊙'}</b>, pushed <b>${into ? 'down' : 'up'}</b>. Every time. ⊗ into the page · ⊙ out of the page.`;
  } else rule = 'Plain rings: no swap, so after half a turn the forces pull the coil back.';
  setText('endview-rule', rule);
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
function axes(ctx, box, { xLabel, yLabel, zeroY = null }) {
  const c = palette.css;
  ctx.strokeStyle = c['text-secondary'];
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(box.x0, box.y0);
  ctx.lineTo(box.x0, box.y1);
  ctx.lineTo(box.x1, box.y1);
  ctx.stroke();
  if (zeroY !== null) {
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(box.x0, zeroY);
    ctx.lineTo(box.x1, zeroY);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  ctx.fillStyle = c['text-secondary'];
  ctx.font = `600 10px ${c['font-mono']}`;
  ctx.textAlign = 'right';
  ctx.fillText(xLabel, box.x1, box.y1 - 5);
  ctx.textAlign = 'left';
  ctx.fillText(yLabel, box.x0 + 4, box.y0 + 8);
}
function drawGraph() {
  const prepared = prepareCanvas($('graph-canvas'));
  if (!prepared || !sim) return;
  const { ctx, w, h } = prepared;
  const c = palette.css;
  const box = { x0: 34, x1: w - 8, y0: 8, y1: h - 20 };
  const X = (value, min, max) => box.x0 + (value - min) / (max - min) * (box.x1 - box.x0);
  const Y = (value, min, max) => box.y1 - (value - min) / (max - min) * (box.y1 - box.y0);
  ctx.lineJoin = 'round';
  if (sim.kind === 'force') {
    const maxF = state.values.field * state.values.current * ROD_LENGTH;
    const top = Math.max(0.125 * 0.3, maxF * 1.15, 1e-6);
    axes(ctx, box, { xLabel: 'θ / °', yLabel: 'F / N' });
    ctx.fillStyle = c['text-secondary'];
    ctx.textAlign = 'center';
    for (const deg of [0, 45, 90]) ctx.fillText(String(deg), X(deg, 0, 90), box.y1 + 14);
    ctx.textAlign = 'right';
    ctx.fillText(top.toFixed(3), box.x0 - 3, box.y0 + 8);
    ctx.fillText('0', box.x0 - 3, box.y1);
    ctx.strokeStyle = c.force;
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let deg = 0; deg <= 90; deg += 2) {
      const value = maxF * Math.sin(THREE.MathUtils.degToRad(deg));
      if (deg === 0) ctx.moveTo(X(deg, 0, 90), Y(value, 0, top));
      else ctx.lineTo(X(deg, 0, 90), Y(value, 0, top));
    }
    ctx.stroke();
    const { size } = forceVectors();
    const deg = state.values.angle;
    const pointValue = maxF * Math.sin(THREE.MathUtils.degToRad(deg));
    ctx.fillStyle = state.powered ? c.force : c['text-secondary'];
    ctx.beginPath();
    ctx.arc(X(deg, 0, 90), Y(state.powered ? size : pointValue, 0, top), 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.textAlign = 'left';
    ctx.fillText('F = BIL sin θ', box.x0 + 8, box.y0 + 24);
    return;
  }
  if (sim.kind === 'dc' || sim.kind === 'ac') {
    const span = 8;
    const t1 = sim.time;
    const t0 = t1 - span;
    const peakCurrent = sim.kind === 'ac' ? state.values.peak : Math.max(state.values.current, 0.5);
    const peakTorque = coilConstant() * peakCurrent;
    axes(ctx, box, { xLabel: 'time →', yLabel: '', zeroY: (box.y0 + box.y1) / 2 });
    // Torque is plotted as positive when it turns the coil clockwise, seen from the rings end.
    const series = [[1, c.current, peakCurrent, 'I'], [2, c.force, -peakTorque, 'T']];
    for (const [index, colour, scale] of series) {
      ctx.strokeStyle = colour;
      ctx.lineWidth = 2;
      ctx.beginPath();
      sim.trace.forEach((point, i) => {
        const x = X(point[0], t0, t1);
        const y = Y(point[index] / scale, -1.15, 1.15);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
    }
    ctx.font = `600 10px ${c['font-mono']}`;
    ctx.textAlign = 'left';
    ctx.fillStyle = c.current;
    ctx.fillText('current I', box.x0 + 6, box.y0 + 8);
    ctx.fillStyle = c.force;
    ctx.fillText('torque T (clockwise +)', box.x0 + 80, box.y0 + 8);
    ctx.fillStyle = c['text-secondary'];
    ctx.textAlign = 'right';
    ctx.fillText('+', box.x0 - 4, box.y0 + 10);
    ctx.fillText('0', box.x0 - 4, (box.y0 + box.y1) / 2 + 3);
    ctx.fillText('−', box.x0 - 4, box.y1 - 2);
    return;
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
function resetView(animate = false) {
  userMoved = false;
  const home = HOME[state.mode];
  const direction = new THREE.Vector3(...home.direction).normalize();
  const target = new THREE.Vector3(...home.target);
  if (animate) {
    flyTo({ direction, distance: fitDistance(home.extent), target });
    return;
  }
  cameraTween = null;
  controls.reset();
  controls.target.copy(target);
  camera.position.copy(direction.multiplyScalar(fitDistance(home.extent))).add(target);
  controls.update();
}

// ---------- Selection and picking ----------
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
function pick(clientX, clientY) {
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.set((clientX - rect.left) / rect.width * 2 - 1, -(clientY - rect.top) / rect.height * 2 + 1);
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects(pickables.filter(mesh => mesh.visible && mesh.parent?.visible !== false), false);
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
  // Arrows and coil windings already glow, so only plain parts get a highlight.
  if (mesh.material?.emissive && !['force', 'current'].includes(key)) {
    mesh.userData.savedEmissive = mesh.material.emissive.clone();
    mesh.userData.savedIntensity = mesh.material.emissiveIntensity;
    selected = mesh;
  }
}
function describe(key) {
  if (key === 'force' && sim?.kind === 'force') {
    const { size } = forceVectors();
    return `${PARTS.force} Here F = ${fmt(size, 3)} N.`;
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
  if (playing) state.swapPaused = false;
  const button = $('motion');
  button.setAttribute('aria-pressed', String(state.playing));
  $('motion-label').textContent = state.playing ? 'Pause motion' : 'Play motion';
  $('motion-icon').setAttribute('d', state.playing ? 'M7 5h3v14H7zM14 5h3v14h-3z' : 'M8 5v14l11-7z');
}
$('motion').addEventListener('click', () => setPlaying(!state.playing));
$('playback').addEventListener('change', event => { state.playback = Number(event.target.value); });
$('show-flow').addEventListener('change', event => { state.showFlow = event.target.checked; stepSim(0); });
$('home-view').addEventListener('click', () => resetView(true));
$('vertical-view').addEventListener('click', () => {
  if (!sim || !['dc', 'ac'].includes(sim.kind)) return;
  setPlaying(false);
  sim.theta = Math.PI / 2 + Math.round((sim.theta - Math.PI / 2) / Math.PI) * Math.PI;
  sim.history = [];
  sim.trace = [];
  stepSim(0);
  updateEquation();
  drawEndView();
  drawGraph();
  updateObservation();
  readout.textContent = 'VERTICAL COIL · The force lines pass through the axle, so their perpendicular distance from it is zero. The forces can still act, but they produce no turning effect.';
});
$('step').addEventListener('click', () => {
  setPlaying(false);
  state.swapPaused = false;
  // Small increments retain the same integration accuracy as playback.
  for (let i = 0; i < 10; i++) {
    stepSim(0.01);
    if (state.swapPaused) break;
  }
  updateEquation();
  drawGraph();
  drawEndView();
  updateObservation();
});
$('measurements').addEventListener('toggle', () => { updateEquation(); drawGraph(); });

function updateObservation() {
  if (!sim) return;
  let title, text;
  if (sim.kind === 'force') {
    const { size, force, on } = forceVectors();
    title = !on ? 'No current → no force' : size < 1e-8 ? 'Parallel to the field → no force' : 'Current + magnetic field → force';
    text = !on ? 'The magnetic field is still present. Switch on the current to see the orange current arrow and pink force arrow.' : size < 1e-8 ? 'Current flows along the field. Turn the wire across the field to produce a force.' : `The pink arrow points ${force.x > 0 ? 'along' : 'back along'} the rails. Reverse either current or field and the force reverses too.`;
  } else {
    const flowing = Math.abs(sim.current) > 0.05;
    title = !state.powered ? 'Trace the two sides of the coil' : !flowing ? 'No current → no magnetic force' : sim.kind === 'dc' && state.commutator ? 'Opposite currents → opposite forces' : 'Follow the current, then the forces';
    text = !state.powered && sim.kind === 'ac' ? 'A and B identify the coil sides. Orange arrows show current; pink arrows show force. Switch on the AC supply to explore current reversal.' : state.powered && !flowing ? 'At zero current there is no magnetic force on the coil. A moving coil can coast through this position.' : !state.powered ? 'Purple A and green B identify the same coil ends throughout. Switch on to see + / − badges for their supply connections. Orange arrows show current; pink arrows show force.' : sim.kind === 'dc' && state.commutator ? `Side A: current ${sim.current > 0 ? 'away from' : 'towards'} the rings; force ${sim.current > 0 ? 'down' : 'up'}. At each half turn the current reverses. Use “Pause at each swap” to catch it.` : sim.kind === 'ac' ? 'The supply reverses the current and forces. Slip rings keep each coil end connected to the same brush. Give it a spin to explore synchronisation.' : 'Without the split ring, current stays the same way round the coil. After vertical, the turning effect reverses and pulls the coil back.';
  }
  updateTurningDisplay();
  setText('observation-title', title);
  setText('observation-text', text);
}
const POWER_LABELS = {
  force: ['Switch on current', 'Switch off current'],
  dc: ['Switch on motor', 'Switch off motor'],
  ac: ['Switch on supply', 'Switch off supply'],
};
function updatePowerButton() {
  const button = $('power');
  const [on, off] = POWER_LABELS[state.mode];
  button.textContent = state.powered ? off : on;
  button.dataset.reserve = off.length > on.length ? off : on;
  button.setAttribute('aria-pressed', String(state.powered));
}
$('power').addEventListener('click', () => {
  state.powered = !state.powered;
  if (!state.powered && sim?.kind === 'ac') sim.supplyTime = 0;
  updatePowerButton();
  if (!state.playing && state.powered && !reducedMotion) setPlaying(true);
  readout.textContent = POWER_MESSAGES[state.mode](state.powered);
});
const POWER_MESSAGES = {
  force: on => on ? 'CURRENT ON · The rod is pushed along the rails. Use Fleming’s left-hand rule on the three arrows: Field, Current, Motion.' : 'CURRENT OFF · No current, so no force. The rod rolls to a stop.',
  dc: on => on ? (state.commutator ? 'MOTOR ON · Watch the force arrows: up on one side, down on the other. The split ring reverses the current every half turn.' : 'MOTOR ON, NO COMMUTATOR · The current never reverses, so the coil turns until it is vertical and then gets pulled back.') : 'MOTOR OFF · No current, so no forces. The coil coasts to a stop.',
  ac: on => on ? 'SUPPLY ON · The current reverses every half cycle. On a coil at rest the forces keep reversing, so it only shakes. Try “Give it a spin”.' : 'SUPPLY OFF · The coil coasts to a stop.',
};
$('spin').addEventListener('click', () => {
  if (!sim || sim.kind !== 'ac') return;
  sim.omega = -2 * Math.PI * state.values.frequency;
  if (!state.playing) setPlaying(true);
  readout.textContent = state.powered
    ? 'SPIN · The coil now turns at about the supply frequency. If the current reverses as it passes vertical, it locks in step.'
    : 'SPIN · With the supply off, there is nothing to keep it turning. Switch on the supply, then spin it.';
});
$('reset').addEventListener('click', () => {
  state.powered = false;
  if (state.swapPaused) setPlaying(true);
  buildMode(false);
  resetView(true);
  readout.textContent = DEFAULT_READOUT[state.mode];
});

// Steppers: one exact step per tap, a steady ramp while held, and typed values.
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
function setValue(key, value) {
  const spec = STEPPERS[key];
  const stepped = Math.round((value - spec.min) / spec.step) * spec.step + spec.min;
  state.values[key] = Number(THREE.MathUtils.clamp(Number.isFinite(stepped) ? stepped : spec.value, spec.min, spec.max).toFixed(4));
  const input = $(`input-${key}`);
  if (input) {
    input.value = state.values[key].toFixed(spec.decimals);
    $(`minus-${key}`).disabled = state.values[key] <= spec.min;
    $(`plus-${key}`).disabled = state.values[key] >= spec.max;
  }
  onValueChange(key);
}
function onValueChange(key) {
  if (!sim) return;
  if (key === 'angle' || key === 'field') updateForceGeometry();
  if (key === 'turns' && (sim.kind === 'dc')) buildCoilWinding();
  if (key === 'frequency' && sim.kind === 'ac') {
    // Keep the supply waveform continuous when the frequency changes.
    const phase = 2 * Math.PI * (sim.lastFrequency ?? state.values.frequency) * sim.supplyTime;
    sim.supplyTime = phase / (2 * Math.PI * state.values.frequency);
  }
  if (sim.kind === 'ac') sim.lastFrequency = state.values.frequency;
  drawGraph();
  updateEquation();
}
function buildControls() {
  const container = $('controls');
  container.replaceChildren();
  const config = CONTROLS[state.mode];
  for (const key of config.steppers) {
    const spec = STEPPERS[key];
    const field = document.createElement('div');
    field.className = 'field';
    field.setAttribute('role', 'group');
    field.setAttribute('aria-labelledby', `label-${key}`);
    field.innerHTML = `<span id="label-${key}">${spec.label}</span><div class="stepper"><button type="button" id="minus-${key}" aria-label="Decrease ${spec.aria.toLowerCase()}">−</button><input type="number" id="input-${key}" min="${spec.min}" max="${spec.max}" step="${spec.step}" inputmode="decimal" aria-label="${spec.aria}"><button type="button" id="plus-${key}" aria-label="Increase ${spec.aria.toLowerCase()}">+</button></div>`;
    container.appendChild(field);
    bindStepper($(`minus-${key}`), $(`plus-${key}`), direction => setValue(key, state.values[key] + direction * spec.step));
    $(`input-${key}`).addEventListener('change', event => setValue(key, Number(event.target.value)));
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
      button.textContent = label;
      button.setAttribute('aria-pressed', String(Boolean(state[key])));
      button.addEventListener('click', () => toggle(key, button));
      rowElement.appendChild(button);
    }
    field.appendChild(rowElement);
    container.appendChild(field);
  }
}
const TOGGLE_MESSAGES = {
  reverse: () => state.mode === 'force'
    ? 'CURRENT REVERSED · Reversing the current reverses the force.'
    : 'CURRENT REVERSED · The forces reverse, so the coil turns the other way.',
  flip: () => 'MAGNET FLIPPED · The field now points the other way, so the force reverses. Reverse both and the force goes back to its first direction.',
  commutator: () => state.commutator
    ? 'SPLIT-RING COMMUTATOR · Two half-rings swap contact with the brushes every half turn, reversing the current in the coil.'
    : 'PLAIN RINGS · The coil is always connected the same way round. The forces never reverse, so the coil can only rock.',
  pauseSwap: () => state.pauseSwap
    ? (state.commutator ? 'PAUSE AT EACH SWAP · Switch the motor on. It will stop every time the half-rings change brushes, so you can compare the coil before and after.' : 'PAUSE AT EACH SWAP · Turn the split-ring commutator back on first: plain rings never swap.')
    : 'PAUSE AT EACH SWAP OFF · The motor runs without stopping.',
  endView: () => state.endView
    ? 'END VIEW · The coil seen from the rings end. ⊗ = current into the page, ⊙ = out of the page. Watch which half-ring touches the + brush.'
    : 'END VIEW HIDDEN · Turn it back on to see the coil and commutator end-on.',
};
function toggle(key, button) {
  state[key] = !state[key];
  button.setAttribute('aria-pressed', String(state[key]));
  if (key === 'flip' || key === 'reverse') updateForceGeometry();
  if ((key === 'commutator' || key === 'reverse') && sim && sim.kind === 'dc') {
    buildCoilWinding();
    buildRings();
    // Update the current straight away so the readouts are right even while the motion is paused.
    sim.current = coilCurrent();
    sim.torque = -coilConstant() * sim.current * Math.cos(sim.theta);
  }
  if (key === 'endView') updateEndViewVisibility();
  readout.textContent = TOGGLE_MESSAGES[key]();
  drawGraph();
  updateEquation();
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
  force: 'A COPPER ROD ON RAILS · The rod sits in the field between a north pole (top) and a south pole (bottom). Press “Switch on current”, or tap a part.',
  dc: 'DC MOTOR · A coil on an axle between two poles, fed through a split-ring commutator and two carbon brushes. Press “Switch on motor”, or tap a part.',
  ac: 'AC MOTOR · The same coil, but with two slip rings and an alternating supply. Switch on the supply, then try “Give it a spin”.',
};
const LEGEND = {
  force: ['north', 'south', 'field', 'current', 'force'],
  dc: ['north', 'south', 'field', 'current', 'force'],
  ac: ['north', 'south', 'field', 'current', 'force'],
};
function buildMode(animate) {
  clearStage();
  const mode = state.mode;
  if (mode === 'force') buildForce();
  else if (mode === 'dc' || mode === 'ac') buildCoil(mode);
  floorShadow.position.y = mode === 'force' ? -1.75 : BASE_Y - 0.17;
  floorShadow.scale.setScalar(1);
  updatePowerButton();
  if (animate) fadeIn = { t: 0 };
  stepSim(0);
  updateEquation();
  drawGraph();
}
function selectMode(mode, animate = true) {
  const previous = state.mode;
  state.mode = mode;
  state.powered = false;
  if (state.swapPaused) setPlaying(true);
  const data = MODES[mode];
  document.body.dataset.mode = mode;
  cameraTween = null;
  buildMode(animate && previous !== mode);
  buildControls();
  document.querySelectorAll('[data-legend]').forEach(item => { item.hidden = !LEGEND[mode].includes(item.dataset.legend); });
  $('spin').hidden = mode !== 'ac';
  updateEndViewVisibility();
  $('action-hint').textContent = data.hint;
  readout.textContent = DEFAULT_READOUT[mode];
  for (const [id, key] of Object.entries({ 'scene-title': 'title', 'mode-date': 'date', 'mode-heading': 'heading', 'mode-level': 'level', description: 'description', look: 'look', evidence: 'evidence', deeper: 'deeper' })) $(id).textContent = data[key];
  document.querySelectorAll('.models [data-mode]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.mode === mode)));
  viewer.setAttribute('aria-label', `${data.title}. ${data.description} Drag or use arrow keys to rotate; scroll, pinch or plus and minus keys to zoom.`);
  $('graph-canvas').setAttribute('aria-label', GRAPH_LABELS[mode]);
  quiz.show(mode);
  updateObservation();
  resetView();
}
const GRAPH_LABELS = {
  force: 'Graph of force against the angle between the wire and the field',
  dc: 'Graph of the current in the coil and the torque against time',
  ac: 'Graph of the supply current and the torque against time',
};
document.querySelectorAll('.models [data-mode]').forEach(button => button.addEventListener('click', () => {
  if (button.dataset.mode !== state.mode) selectMode(button.dataset.mode);
}));

// ---------- Progress ----------
const progress = loadProgress();
const quiz = new Quiz($('mode-quiz'), { questionSets: QUESTIONS, progress, title: '✦ Unlock this discovery', completeText: '✦ Discovery unlocked!', onChange: updateProgress });
const finalQuiz = new Quiz($('final-quiz'), { questionSets: QUESTIONS, progress, title: '✦ Final challenge', completeText: 'Motor expert!', completeIcon: 'trophy', onChange: updateProgress });
function updateProgress() {
  saveProgress(progress);
  const unlocked = MODE_ORDER.filter(mode => setSummary(progress, mode, QUESTIONS[mode]).complete);
  const sets = [...MODE_ORDER, 'final'];
  const stars = sets.reduce((sum, key) => sum + setSummary(progress, key, QUESTIONS[key]).stars, 0);
  const total = sets.reduce((sum, key) => sum + QUESTIONS[key].length, 0);
  const finalDone = setSummary(progress, 'final', QUESTIONS.final).complete;
  $('progress').textContent = `${unlocked.length} / ${MODE_ORDER.length} discoveries unlocked · ★ ${stars} / ${total}${finalDone ? ' · Motor expert!' : ''}`;
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
    ? 'You have explored the motor effect, DC motors and AC motors. Use them together.'
    : `Unlock all ${MODE_ORDER.length} discoveries to open the final challenge (${unlocked.length} of ${MODE_ORDER.length} so far).`;
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
  const powered = state.powered;
  buildMode(false);
  state.powered = powered;
  updatePowerButton();
});
document.fonts?.ready.then(() => {
  // Redraw sprite labels once the fonts have loaded.
  if (!state.powered) buildMode(false);
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
new IntersectionObserver(entries => { state.visible = entries[entries.length - 1].isIntersecting; }).observe(viewerPanel);
renderer.domElement.addEventListener('webglcontextlost', event => {
  event.preventDefault();
  $('load-status').hidden = false;
  $('load-status').textContent = 'The 3D view was interrupted. Reload this page to restore it.';
});

function stepSim(delta) {
  if (!sim) return;
  if (sim.kind === 'force') stepForce(delta);
  else stepCoil(delta);
}

setPlaying(state.playing);
updateProgress();
resize();
selectMode('force', false);
$('load-status').hidden = true;
let previousTime = performance.now();
let readoutClock = 0;
renderer.setAnimationLoop(frame);
function frame(time) {
  const delta = Math.min((time - previousTime) / 1000, 0.05);
  previousTime = time;
  if (!state.visible || document.hidden) return;
  stepSim(state.playing ? delta * state.playback : 0);
  updateObservation();
  if (fadeIn) {
    fadeIn.t += delta;
    const k = Math.min(1, fadeIn.t / TRANSITION_TIME);
    stage.scale.setScalar(0.85 + 0.15 * ease(k));
    if (k >= 1) fadeIn = null;
  }
  readoutClock += delta;
  if (readoutClock > 0.1) {
    readoutClock = 0;
    updateEquation();
    drawGraph();
  }
  // The end view turns with the coil, so it is redrawn every frame rather than on the readout tick.
  drawEndView();
  if (selected) {
    selected.material.emissive.copy(palette.accent);
    selected.material.emissiveIntensity = 0.3;
  }
  stepCamera(delta);
  controls.update();
  renderer.render(scene, camera);
}
