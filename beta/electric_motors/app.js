import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { MODES, MODE_ORDER, PARTS, STEPPERS, CONTROLS, QUESTIONS } from './content.js';
import { Quiz, loadProgress, saveProgress, setSummary } from './quiz.js';

const $ = id => document.getElementById(id);
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const state = {
  mode: 'force',
  playing: !reducedMotion,
  visible: true,
  powered: false,
  reverse: false,
  flip: false,
  commutator: true,
  pauseSwap: false,
  swapPaused: false,
  endView: true,
  swap: false,
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

// Motion models. Times are on-screen seconds; torques are in N m.
const ROD = { gain: 90, damping: 1.6, maxSpeed: 4.5 };
const DC = { inertia: 0.012, linear: 0.002, drag: 6e-4, friction: 0.002 };
// The AC coil also has a damper winding, which pulls it towards the synchronous speed once it is close.
const AC = { inertia: 0.03, linear: 0.003, drag: 1e-4, friction: 0.002, damper: 0.05 };
const INDUCTION = { inertia: 0.25, peakSlip: 0.2, friction: 0.01 };

const HOME = {
  force: { extent: { w: 4.4, h: 2.9 }, target: [-0.4, 0, 0], direction: [0.55, 0.24, 1.2] },
  dc: { extent: { w: 3.6, h: 3.4 }, target: [0, -0.7, 0.3], direction: [0.75, 0.42, 1.25] },
  ac: { extent: { w: 3.6, h: 3.4 }, target: [0, -0.7, 0.3], direction: [0.75, 0.42, 1.25] },
  induction: { extent: { w: 3.3, h: 3.3 }, target: [0, 0, 0.4], direction: [0.55, 0.45, 1.3] }
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
  const names = ['north', 'south', 'field', 'current', 'force', 'copper', 'steel', 'carbon', 'phase1', 'phase2', 'phase3', 'positive', 'negative', 'half-a', 'half-b'];
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
// Fine stripes suggest the many turns of wire in a winding.
function windingTexture(color) {
  const texture = canvasTexture(64, 256, (ctx, w, h) => {
    ctx.fillStyle = `#${color.getHexString()}`;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    for (let y = 0; y < h; y += 8) ctx.fillRect(0, y, w, 2);
  });
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  return texture;
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
function poleBlock(kind, size, position) {
  const color = palette[kind];
  const mesh = part(new THREE.Mesh(new THREE.BoxGeometry(...size), material(color, { roughness: 0.55, metalness: 0.1 })), kind);
  mesh.position.copy(position);
  return mesh;
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
    const body = part(new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.7, 0.6), material(palette.carbon, { roughness: 0.5 })), 'ac');
    const face = faceLabel('~', '#ffffff', 0.6);
    face.position.set(0, 0.02, 0.31);
    group.add(body, face);
  }
  return group;
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

  // Magnet: two pole pieces joined by a yoke, all turned together to set the angle.
  const magnet = new THREE.Group();
  const top = poleBlock('north', [4.4, 0.5, 2.4], new THREE.Vector3(0, 1.4, 0));
  const bottom = poleBlock('south', [4.4, 0.5, 2.4], new THREE.Vector3(0, -1.4, 0));
  const yoke = new THREE.Mesh(new THREE.BoxGeometry(0.45, 3.3, 2.4), material(palette.steel, { metalness: 0.5, roughness: 0.45 }));
  yoke.position.set(2.42, 0, 0);
  const topLabel = faceLabel('N', '#ffffff', 0.5);
  topLabel.position.set(-1.6, 1.4, 1.21);
  const bottomLabel = faceLabel('S', '#ffffff', 0.5);
  bottomLabel.position.set(-1.6, -1.4, 1.21);
  magnet.add(top, bottom, yoke, topLabel, bottomLabel);
  const fieldMaterial = new THREE.MeshBasicMaterial({ color: palette.field, transparent: true, opacity: 0.75 });
  const lines = new THREE.Group();
  for (const x of [-1.8, -0.9, 0, 0.9, 1.8]) {
    for (const z of [-0.55, 0.55]) lines.add(fieldLine(new THREE.Vector3(x, 1.15, z), new THREE.Vector3(x, -1.15, z), fieldMaterial, 0.28));
  }
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
  sim = { kind: 'force', group, rod, rodHolder, magnet, poles: { top, bottom, topLabel, bottomLabel, lines }, supply, markers, triad, x: 0, v: 0, phase: 0 };
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
  const { top, bottom, topLabel, bottomLabel, lines } = sim.poles;
  top.material.color.copy(state.flip ? palette.south : palette.north);
  bottom.material.color.copy(state.flip ? palette.north : palette.south);
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
  placeMarkers(sim.markers, [forcePath()], sim.phase, on);
  setMarkerGlow(sim.markers, Math.min(1, state.values.current / 3));
  const origin = new THREE.Vector3(sim.x, 0.24, 0);
  setArrow(sim.triad.field, origin, field, on ? 0.75 : 0);
  setArrow(sim.triad.current, origin, current, on ? 0.75 : 0);
  setArrow(sim.triad.force, origin, force.lengthSq() ? new THREE.Vector3(Math.sign(force.x), 0, 0) : force, on && size > 0 ? 0.35 + Math.min(1.9, size / 0.02 * 0.55) : 0);
}

// ---------- Modes 2 and 3: a coil between two poles ----------
function buildCoil(kind) {
  const group = new THREE.Group();
  stage.add(group);
  group.add(poleBlock('north', [0.8, 2.6, 2.9], new THREE.Vector3(-2.2, 0, 0)));
  group.add(poleBlock('south', [0.8, 2.6, 2.9], new THREE.Vector3(2.2, 0, 0)));
  const north = faceLabel('N', '#ffffff', 0.6);
  north.position.set(-2.2, 0.75, 1.46);
  const south = faceLabel('S', '#ffffff', 0.6);
  south.position.set(2.2, 0.75, 1.46);
  group.add(north, south);
  const fieldMaterial = new THREE.MeshBasicMaterial({ color: palette.field, transparent: true, opacity: 0.6 });
  for (const y of [-0.85, 0, 0.85]) {
    for (const z of [-0.9, 0, 0.9]) {
      if (y === 0 && z === 0) continue;
      group.add(fieldLine(new THREE.Vector3(-1.8, y, z), new THREE.Vector3(1.8, y, z), fieldMaterial, 0.88));
    }
  }

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

  const supply = battery(new THREE.Vector3(0, SUPPLY_Y + (kind === 'ac' ? 0.05 : 0), SUPPLY_Z), kind === 'ac' ? 'ac' : 'dc');
  group.add(supply);

  // Up to 10 drawn turns with about 21 beads each.
  const markers = currentMarkers(240, palette.current);
  rotor.add(markers);
  const forces = [makeArrow(palette.force, 0.05), makeArrow(palette.force, 0.05)];
  for (const arrow of forces) {
    arrow.traverse(child => { child.userData.part = 'force'; });
    pickables.push(...arrow.children);
    group.add(arrow);
  }
  sim = { kind, group, rotor, coilGroup, ringParts, brushes, wires, markers, forces, supply, theta: 0.5, omega: 0, phase: 0, time: 0, supplyTime: 0, trace: [], history: [], current: 0, torque: 0 };
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
  const leadMats = sim.kind === 'dc' ? [material(palette['half-a'], { metalness: 0.4, roughness: 0.35 }), material(palette['half-b'], { metalness: 0.4, roughness: 0.35 })] : [mat, mat];
  for (let i = 0; i < loops; i++) {
    const offset = (i - (loops - 1) / 2) * 0.05;
    const r = COIL_R + Math.abs(offset) * 0.3;
    const points = [
      new THREE.Vector3(RING_R, offset * 0.4, RING_Z - 0.25),
      new THREE.Vector3(r, offset, COIL_HALF + 0.2),
      new THREE.Vector3(r, offset, -COIL_HALF),
      new THREE.Vector3(-r, offset, -COIL_HALF),
      new THREE.Vector3(-r, offset, COIL_HALF + 0.2),
      new THREE.Vector3(-RING_R, offset * 0.4, RING_Z - 0.25 + (sim.kind === 'dc' && state.commutator ? 0 : 0.4))
    ];
    coilGroup.add(part(tube(points.slice(1, 5), 0.035, mat, 120), 'coil'));
    coilGroup.add(part(tube(points.slice(0, 2), 0.035, leadMats[0], 20), 'coil'));
    coilGroup.add(part(tube(points.slice(4), 0.035, leadMats[1], 20), 'coil'));
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
      new THREE.Vector3(side * 0.72, SUPPLY_Y, SUPPLY_Z)
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
  for (let i = 0; i < steps; i++) {
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
  sim.time += delta;
  sim.rotor.rotation.z = sim.theta;
  sim.history.push([sim.time, sim.theta]);
  while (sim.history.length && sim.time - sim.history[0][0] > 3) sim.history.shift();
  sim.trace.push([sim.time, sim.current, sim.torque]);
  while (sim.trace.length && sim.time - sim.trace[0][0] > 8) sim.trace.shift();

  sim.phase += delta * (0.25 + Math.abs(sim.current) * 0.2) * Math.sign(sim.current);
  placeMarkers(sim.markers, coilPaths(), sim.phase, Math.abs(sim.current) > 0.05);
  setMarkerGlow(sim.markers, Math.min(1, Math.abs(sim.current) / 3));

  // Force on each long side: F = NBIL, vertical, opposite on the two sides.
  const turns = sim.kind === 'ac' ? AC_TURNS : state.values.turns;
  const field = sim.kind === 'ac' ? AC_FIELD : state.values.field;
  const sideForce = turns * field * sim.current * COIL_SIDE;
  const length = Math.min(2.0, Math.abs(sideForce) * 0.9 + (Math.abs(sideForce) > 0.01 ? 0.3 : 0));
  const c = Math.cos(sim.theta);
  const s = Math.sin(sim.theta);
  const down = new THREE.Vector3(0, -Math.sign(sideForce), 0);
  setArrow(sim.forces[0], new THREE.Vector3(COIL_R * c, COIL_R * s, 0), down, length);
  setArrow(sim.forces[1], new THREE.Vector3(-COIL_R * c, -COIL_R * s, 0), down.clone().negate(), length);
  if (swapped) pauseAtSwap();
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

// ---------- Mode 4: induction motor ----------
const POLE_ANGLES = [0, 1, 2, 3, 4, 5].map(k => k * Math.PI / 3);
// Pole k belongs to coil pair k mod 3; the pair's axis is at 0°, 120° or 240°.
const PAIR_OF_POLE = [0, 2, 1, 0, 2, 1];
const BAR_COUNT = 14;
function buildInduction() {
  const group = new THREE.Group();
  stage.add(group);
  const steel = material(palette.steel, { metalness: 0.45, roughness: 0.5 });
  const shape = new THREE.Shape();
  shape.absarc(0, 0, 3.0, 0, Math.PI * 2, false);
  const hole = new THREE.Path();
  hole.absarc(0, 0, 2.55, 0, Math.PI * 2, true);
  shape.holes.push(hole);
  const ringGeometry = new THREE.ExtrudeGeometry(shape, { depth: 2.4, bevelEnabled: false, curveSegments: 64 });
  ringGeometry.translate(0, 0, -1.2);
  const stator = part(new THREE.Mesh(ringGeometry, steel), 'stator');
  group.add(stator);
  const coils = [];
  POLE_ANGLES.forEach((angle, k) => {
    const pole = new THREE.Group();
    pole.rotation.z = angle;
    const tooth = part(new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.5, 2.3), steel), 'stator');
    tooth.position.x = 2.0;
    const shoe = part(new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.9, 2.3), steel), 'stator');
    shoe.position.x = 1.5;
    const winding = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.74, 2.5), material(0xffffff, { roughness: 0.5, metalness: 0.3 }));
    winding.position.x = 2.1;
    pole.add(tooth, shoe, winding);
    group.add(pole);
    coils.push(winding);
    pickables.push(winding);
  });
  const rotor = new THREE.Group();
  group.add(rotor);
  const core = part(new THREE.Mesh(new THREE.CylinderGeometry(1.08, 1.08, 2.3, 48), material(palette.steel, { transparent: true, opacity: 0.35, roughness: 0.6, depthWrite: false })), 'cage');
  core.rotation.x = Math.PI / 2;
  rotor.add(core);
  const copper = material(palette.copper, { metalness: 0.65, roughness: 0.3 });
  for (const z of [-1.25, 1.25]) {
    const endRing = part(new THREE.Mesh(new THREE.TorusGeometry(1.15, 0.09, 12, 64), copper), 'cage');
    endRing.position.z = z;
    rotor.add(endRing);
  }
  const bars = [];
  for (let j = 0; j < BAR_COUNT; j++) {
    const angle = j / BAR_COUNT * Math.PI * 2;
    const bar = part(new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 2.5, 12), material(palette.copper, { metalness: 0.5, roughness: 0.3, emissive: 0x000000 })), 'cage');
    bar.rotation.x = Math.PI / 2;
    bar.position.set(1.15 * Math.cos(angle), 1.15 * Math.sin(angle), 0);
    bar.userData.angle = angle;
    rotor.add(bar);
    bars.push(bar);
  }
  const shaft = part(new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 4.4, 20), material(palette.steel, { metalness: 0.8, roughness: 0.2 })), 'axle');
  shaft.rotation.x = Math.PI / 2;
  shaft.position.z = 0.4;
  rotor.add(shaft);
  // A marker flag on the shaft makes the rotor's speed easy to see.
  const flag = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.16, 0.08), material(palette.current, { emissive: palette.current, emissiveIntensity: 0.25 }));
  flag.position.set(0.35, 0, 2.55);
  rotor.add(flag);

  // The combined field inside the motor: a fan of parallel arrows that rotates.
  const fieldGroup = new THREE.Group();
  group.add(fieldGroup);
  for (const offset of [-0.7, 0, 0.7]) {
    const arrow = makeArrow(palette.field, offset === 0 ? 0.06 : 0.03, offset === 0 ? 0.95 : 0.6);
    setArrow(arrow, new THREE.Vector3(-1.35, offset, 0), new THREE.Vector3(1, 0, 0), 2.7);
    arrow.traverse(child => { child.userData.part = 'resultant'; });
    pickables.push(...arrow.children);
    fieldGroup.add(arrow);
  }
  // Phasor-style diagram in front of the rotor: one arrow per coil pair and their sum.
  const phasors = new THREE.Group();
  phasors.position.z = 2.2;
  group.add(phasors);
  const phaseArrows = [0, 1, 2].map(k => makeArrow(palette[`phase${k + 1}`], 0.03));
  phaseArrows.forEach(arrow => phasors.add(arrow));
  const sum = makeArrow(palette.field, 0.05);
  phasors.add(sum);
  const disc = new THREE.Mesh(new THREE.CircleGeometry(1.6, 64), new THREE.MeshBasicMaterial({ color: palette.field, transparent: true, opacity: palette.dark ? 0.08 : 0.06, depthWrite: false, side: THREE.DoubleSide }));
  disc.position.z = -0.02;
  phasors.add(disc);

  sim = { kind: 'induction', group, rotor, coils, bars, fieldGroup, phaseArrows, sum, fieldAngle: 0, rotorAngle: 0, omega: 0, time: 0, torque: 0 };
  colourCoils();
}
// Which phase feeds the coil pair at 0°, 120° and 240°. Swapping two supply wires swaps two of them.
function phaseOfPair(pair) {
  return state.swap ? [0, 2, 1][pair] : pair;
}
function colourCoils() {
  sim.coils.forEach((coil, k) => {
    const phase = phaseOfPair(PAIR_OF_POLE[k]);
    coil.material.map?.dispose();
    coil.material.map = windingTexture(palette[`phase${phase + 1}`]);
    coil.material.needsUpdate = true;
    coil.userData.part = `phase${phase + 1}`;
  });
}
function inductionTorque(omega) {
  // Kloss torque–slip curve: peak torque 1 at the peak slip, zero at synchronous speed.
  const direction = state.swap ? -1 : 1;
  const synchronous = 2 * Math.PI * state.values.supply;
  const slip = (direction * synchronous - omega) / synchronous * direction;
  const sm = INDUCTION.peakSlip;
  return { torque: direction * 2 * sm * slip / (slip * slip + sm * sm), slip, synchronous, direction };
}
function stepInduction(delta) {
  const steps = 6;
  const dt = delta / steps;
  const load = state.values.load / 100;
  for (let i = 0; i < steps; i++) {
    let torque = 0;
    if (state.powered) {
      sim.time += dt;
      torque = inductionTorque(sim.omega).torque;
    }
    const resist = load + INDUCTION.friction;
    let net;
    if (Math.abs(sim.omega) < 0.02 && Math.abs(torque) <= resist) {
      sim.omega = 0;
      net = 0;
    } else {
      net = torque - resist * Math.sign(sim.omega || torque);
    }
    sim.omega += net / INDUCTION.inertia * dt;
    sim.rotorAngle += sim.omega * dt;
    sim.torque = torque;
  }
  const { direction, slip } = inductionTorque(sim.omega);
  const phaseAngle = 2 * Math.PI * state.values.supply * sim.time;
  // i_k = I cos(ωt − 120° k); with coil axes at 0°, 120°, 240° the sum is 1.5 I along angle ωt.
  const pairCurrents = [0, 1, 2].map(pair => state.powered ? Math.cos(phaseAngle - phaseOfPair(pair) * 2 * Math.PI / 3) : 0);
  const fieldAngle = direction * phaseAngle;
  sim.fieldAngle = fieldAngle;
  sim.pairCurrents = pairCurrents;
  sim.rotor.rotation.z = sim.rotorAngle;
  sim.fieldGroup.visible = state.powered;
  sim.fieldGroup.rotation.z = fieldAngle;
  const total = new THREE.Vector3();
  sim.phaseArrows.forEach((arrow, pair) => {
    const axis = new THREE.Vector3(Math.cos(pair * 2 * Math.PI / 3), Math.sin(pair * 2 * Math.PI / 3), 0);
    const value = pairCurrents[pair];
    total.addScaledVector(axis, value);
    arrow.children.forEach(child => child.material.color.copy(palette[`phase${phaseOfPair(pair) + 1}`]));
    setArrow(arrow, new THREE.Vector3(0, 0, 0.01 * pair), axis.clone().multiplyScalar(Math.sign(value) || 1), Math.abs(value) * 1.0);
  });
  setArrow(sim.sum, new THREE.Vector3(0, 0, 0.04), total, total.length());
  sim.coils.forEach((coil, k) => {
    const value = pairCurrents[PAIR_OF_POLE[k]];
    coil.material.emissive.copy(palette[`phase${phaseOfPair(PAIR_OF_POLE[k]) + 1}`]);
    coil.material.emissiveIntensity = 0.45 * Math.abs(value);
  });
  // Induced bar currents follow the field, scaled by the slip (no slip, no current).
  const strength = state.powered ? THREE.MathUtils.clamp(Math.sqrt(Math.abs(slip) / 0.3), 0, 1) : 0;
  for (const bar of sim.bars) {
    const angle = sim.rotorAngle + bar.userData.angle;
    const value = strength * Math.sin(angle - fieldAngle) * Math.sign(slip || 1) * direction;
    const colour = value >= 0 ? palette.current : palette.negative;
    bar.material.emissive.copy(colour);
    bar.material.emissiveIntensity = Math.abs(value) * 0.9;
  }
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
  if (sim.kind === 'induction') {
    const fieldSpeed = state.powered ? state.values.supply : 0;
    const speed = state.powered || Math.abs(sim.omega) > 0 ? Math.abs(sim.omega) / (2 * Math.PI) : 0;
    const slip = fieldSpeed ? (fieldSpeed - speed) / fieldSpeed : 0;
    const startTorque = 2 * INDUCTION.peakSlip / (1 + INDUCTION.peakSlip ** 2);
    let html = `<div class="formula">s = (nₛ − n) / nₛ</div>`;
    html += row('Field speed nₛ', `${fmt(fieldSpeed, 2)} rev/s`);
    html += row('Rotor speed n', `${fmt(speed, 2)} rev/s`);
    html += row('Slip s', `<b>${state.powered ? Math.round(slip * 100) : 0}%</b>`);
    html += row('Load torque', `${state.values.load}% of peak`);
    if (state.powered && speed < 0.01 && state.values.load / 100 + INDUCTION.friction > startTorque) html += `<div class="status warn">Stalled: the load is bigger than the starting torque.</div>`;
    else if (state.powered && slip > INDUCTION.peakSlip * 1.6 && speed > 0.01) html += `<div class="status warn">Overloaded: slowing down.</div>`;
    else if (state.powered) html += `<div class="status good">Field ${state.swap ? 'clockwise' : 'anticlockwise'} (seen from the front).</div>`;
    box.innerHTML = html;
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
  ctx.globalAlpha = 0.4;
  ctx.lineWidth = 1;
  for (const y of [h * 0.18, h * 0.82]) {
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
    ctx.fillText(side.half, side.x + lx * sideR * 1.8, side.y - ly * sideR * 1.8);
    if (flowing) {
      // Current into the page with the field to the right gives a downward force (F = IL × B).
      const dir = into ? 1 : -1;
      const y0 = side.y + dir * (sideR + 3);
      const y1 = y0 + dir * h * 0.13;
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

  setText('endview-contact', `+ brush touches half-ring ${halfLabel(halfOnPlus())}`);
  let rule;
  if (!flowing) rule = 'Switch the motor on to see the current (⊗ in, ⊙ out).';
  else if (state.commutator) {
    const { into } = rightSide();
    rule = `Right-hand side: current <b>${into ? 'in ⊗' : 'out ⊙'}</b>, pushed <b>${into ? 'down' : 'up'}</b>. Every time.`;
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
  if (sim.kind === 'induction') {
    // Torque–speed curve with the load line and the operating point.
    const maxSpeed = 1.1;
    axes(ctx, box, { xLabel: 'n / nₛ', yLabel: 'T / T peak' });
    ctx.fillStyle = c['text-secondary'];
    ctx.textAlign = 'center';
    for (const value of [0, 0.5, 1]) ctx.fillText(String(value), X(value, 0, maxSpeed), box.y1 + 14);
    ctx.textAlign = 'right';
    ctx.fillText('1', box.x0 - 3, Y(1, 0, 1.15) + 3);
    ctx.fillText('0', box.x0 - 3, box.y1);
    ctx.strokeStyle = c.field;
    ctx.lineWidth = 2;
    ctx.beginPath();
    const sm = INDUCTION.peakSlip;
    for (let k = 0; k <= 100; k++) {
      const ratio = k / 100;
      const slip = 1 - ratio;
      const torque = 2 * sm * slip / (slip * slip + sm * sm);
      if (k === 0) ctx.moveTo(X(ratio, 0, maxSpeed), Y(torque, 0, 1.15));
      else ctx.lineTo(X(ratio, 0, maxSpeed), Y(torque, 0, 1.15));
    }
    ctx.stroke();
    const load = state.values.load / 100 + INDUCTION.friction;
    ctx.strokeStyle = c.force;
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.moveTo(box.x0, Y(load, 0, 1.15));
    ctx.lineTo(box.x1, Y(load, 0, 1.15));
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = c.force;
    ctx.textAlign = 'left';
    ctx.fillText('load', box.x0 + 4, Y(load, 0, 1.15) - 4);
    if (state.powered) {
      const synchronous = 2 * Math.PI * state.values.supply;
      const ratio = THREE.MathUtils.clamp(Math.abs(sim.omega) / synchronous, 0, maxSpeed);
      const slip = 1 - ratio;
      const torque = Math.max(0, 2 * sm * slip / (slip * slip + sm * sm));
      ctx.fillStyle = c['brand-primary'];
      ctx.beginPath();
      ctx.arc(X(ratio, 0, maxSpeed), Y(torque, 0, 1.15), 5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = c['text-secondary'];
    ctx.textAlign = 'right';
    ctx.fillText('synchronous', X(1, 0, maxSpeed) + 2, box.y0 + 20);
    ctx.strokeStyle = c['card-border'];
    ctx.beginPath();
    ctx.moveTo(X(1, 0, maxSpeed), box.y0 + 24);
    ctx.lineTo(X(1, 0, maxSpeed), box.y1);
    ctx.stroke();
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
  if (mesh.material?.emissive && !['force', 'current', 'resultant', 'cage'].includes(key) && !key.startsWith('phase')) {
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
const POWER_LABELS = {
  force: ['Switch on current', 'Switch off current'],
  dc: ['Switch on motor', 'Switch off motor'],
  ac: ['Switch on supply', 'Switch off supply'],
  induction: ['Switch on supply', 'Switch off supply']
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
  if (!state.playing && state.powered) setPlaying(true);
  readout.textContent = POWER_MESSAGES[state.mode](state.powered);
});
const POWER_MESSAGES = {
  force: on => on ? 'CURRENT ON · The rod is pushed along the rails. Use Fleming’s left-hand rule on the three arrows: Field, Current, Motion.' : 'CURRENT OFF · No current, so no force. The rod rolls to a stop.',
  dc: on => on ? (state.commutator ? 'MOTOR ON · Watch the force arrows: up on one side, down on the other. The split ring reverses the current every half turn.' : 'MOTOR ON, NO COMMUTATOR · The current never reverses, so the coil turns until it is vertical and then gets pulled back.') : 'MOTOR OFF · No current, so no forces. The coil coasts to a stop.',
  ac: on => on ? 'SUPPLY ON · The current reverses every half cycle. On a coil at rest the forces keep reversing, so it only shakes. Try “Give it a spin”.' : 'SUPPLY OFF · The coil coasts to a stop.',
  induction: on => on ? 'SUPPLY ON · The three coil currents rise and fall in turn, so the field arrow rotates. The rotor bars glow where currents are induced.' : 'SUPPLY OFF · No rotating field, so no induced currents. The rotor slows down.'
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
  if (key === 'supply' && sim.kind === 'induction') {
    const phase = 2 * Math.PI * (sim.lastSupply ?? STEPPERS.supply.value) * sim.time;
    sim.time = phase / (2 * Math.PI * state.values.supply);
  }
  if (sim.kind === 'induction') sim.lastSupply = state.values.supply;
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
  swap: () => 'PHASES SWAPPED · Swapping two of the three supply wires reverses the direction in which the field rotates, so the motor runs backwards.'
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
  if (key === 'swap' && sim) colourCoils();
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
  induction: 'INDUCTION MOTOR · Six coils on an iron stator around a squirrel-cage rotor. Press “Switch on supply”, or tap a part.'
};
const LEGEND = {
  force: ['north', 'south', 'field', 'current', 'force'],
  dc: ['north', 'south', 'field', 'current', 'force'],
  ac: ['north', 'south', 'field', 'current', 'force'],
  induction: ['field', 'phase1', 'phase2', 'phase3', 'current']
};
function buildMode(animate) {
  clearStage();
  const mode = state.mode;
  if (mode === 'force') buildForce();
  else if (mode === 'dc' || mode === 'ac') buildCoil(mode);
  else buildInduction();
  floorShadow.position.y = mode === 'force' ? -1.75 : mode === 'induction' ? -3.1 : BASE_Y - 0.17;
  floorShadow.scale.setScalar(mode === 'induction' ? 1.1 : 1);
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
  resetView();
}
const GRAPH_LABELS = {
  force: 'Graph of force against the angle between the wire and the field',
  dc: 'Graph of the current in the coil and the torque against time',
  ac: 'Graph of the supply current and the torque against time',
  induction: 'Graph of torque against rotor speed, with the load line and the operating point'
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
  $('progress').textContent = `${unlocked.length} / 4 discoveries unlocked · ★ ${stars} / ${total}${finalDone ? ' · Motor expert!' : ''}`;
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
    ? 'You have explored the motor effect, DC motors, AC motors and induction motors. Use them together.'
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
new IntersectionObserver(entries => { state.visible = entries[entries.length - 1].isIntersecting; }).observe(viewer);
renderer.domElement.addEventListener('webglcontextlost', event => {
  event.preventDefault();
  $('load-status').hidden = false;
  $('load-status').textContent = 'The 3D view was interrupted. Reload this page to restore it.';
});

function stepSim(delta) {
  if (!sim) return;
  if (sim.kind === 'force') stepForce(delta);
  else if (sim.kind === 'induction') stepInduction(delta);
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
  if (state.playing) stepSim(delta);
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
    selected.material.emissiveIntensity = 0.25 + 0.2 * Math.sin(time / 220);
  }
  stepCamera(delta);
  controls.update();
  renderer.render(scene, camera);
}
