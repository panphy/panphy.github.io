// Virtual Ripple Tank: two-source interference and refraction at a boundary.
// The water is drawn in 3D by Three.js; teaching overlays (nodal lines, probe,
// normal, rays and angles) are drawn on a 2D canvas laid over it.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const P = window.RipplePhysics;
const TANK = P.TANK_SIZE; // cm
const HALF = TANK / 2;
const SEGMENTS = 200;
const FRAME_STEP = 0.04;
const RATES = [0.1, 0.25, 0.5, 1, 2];
const MODES = ['interference', 'refraction'];
const REFRACTION_SOURCE_X = -HALF + 0.45;
const MAX_INCIDENCE = 43;

const DEFAULTS = {
  interference: {
    s1: { on: true, frequency: 2, amplitude: 0.5 },
    s2: { on: true, frequency: 2, amplitude: 0.5, phase: 0 },
    separation: 6,
    speed: 4,
    probe: { x: 0, y: 5 }
  },
  refraction: {
    frequency: 2,
    amplitude: 0.5,
    incidence: 35,
    offset: 0,
    twoRegions: true,
    speed1: 4,
    speed2: 2.4
  }
};
const DEFAULT_SHOW = { antinodal: false, nodal: false, probe: true, normal: true, rays: true };

const clone = (o) => JSON.parse(JSON.stringify(o));

const state = {
  mode: 'interference',
  t: 0,
  playing: true,
  rate: 1,
  view: '3d',
  show: { ...DEFAULT_SHOW },
  settings: clone(DEFAULTS)
};

const current = () => state.settings[state.mode];

// ---------- DOM ----------
const $ = (id) => document.getElementById(id);
const canvas = $('tankCanvas');
const overlay = $('overlayCanvas');
const octx = overlay.getContext('2d');
const wrap = $('canvasWrap');
const tabs = Array.from(document.querySelectorAll('.mode-tab'));
const legend = $('legend');
const controlsEl = $('controls');
const playBtn = $('playBtn');
const rateGroup = $('rateGroup');
const viewToggle = $('viewToggle');
const hint = $('tankHint');

// ---------- Scene ----------
const vertexShader = `
  uniform float uTime;
  uniform float uMode;
  uniform float uSpeed;
  uniform float uS1On;
  uniform float uS1Amp;
  uniform float uS1Freq;
  uniform vec2 uS1Pos;
  uniform float uS2On;
  uniform float uS2Amp;
  uniform float uS2Freq;
  uniform float uS2Phase;
  uniform vec2 uS2Pos;
  uniform float uRefrAmp;
  uniform float uRefrFreq;
  uniform float uTwoRegions;
  uniform vec2 uBoundaryNormal;
  uniform float uBoundaryOffset;
  uniform float uSpeedA;
  uniform float uSpeedB;

  varying vec3 vWorldPos;
  varying vec3 vNormal;
  varying float vH1;
  varying float vH2;

  const float PI = 3.14159265359;
  const float HALF_SIZE = ${HALF.toFixed(1)};
  const float EDGE_WIDTH = 1.8;

  // Point source: circular waves whose amplitude falls as 1/sqrt(r).
  float sourceWave(vec2 p, vec2 src, float amp, float freq, float phase) {
    float r = distance(p, src);
    float decay = 1.0 / sqrt(1.0 + r);
    return amp * decay * cos(2.0 * PI * freq * (r / uSpeed - uTime) + phase);
  }

  // A straight wave from the left meets a straight boundary. The transmitted
  // wave keeps the phase along the boundary, which gives Snell's law. Past the
  // critical angle it dies away and a reflected wave returns instead.
  void refractionWaves(vec2 p, out float h1, out float h2) {
    float omega = 2.0 * PI * uRefrFreq;
    float vA = uSpeedA;
    float vB = uTwoRegions > 0.5 ? uSpeedB : uSpeedA;
    vec2 n = uBoundaryNormal;
    float side = dot(p, n) - uBoundaryOffset;
    float sn = n.x / vA;
    vec2 tv = vec2(1.0 / vA, 0.0) - sn * n;
    float along = dot(p, tv);
    float base = -uS1Pos.x / vA;
    float sn2sq = 1.0 / (vB * vB) - dot(tv, tv);
    h2 = 0.0;
    if (uTwoRegions < 0.5 || side <= 0.0) {
      h1 = uRefrAmp * cos(omega * ((p.x - uS1Pos.x) / vA - uTime));
      if (uTwoRegions > 0.5 && sn2sq < 0.0) {
        float tR = base + along - sn * (side + uBoundaryOffset) + 2.0 * sn * uBoundaryOffset;
        h2 = uRefrAmp * cos(omega * (tR - uTime));
      }
    } else if (sn2sq >= 0.0) {
      h1 = uRefrAmp * cos(omega * (base + along + sqrt(sn2sq) * side + sn * uBoundaryOffset - uTime));
    } else {
      h1 = uRefrAmp * exp(-omega * sqrt(-sn2sq) * side) * cos(omega * (base + along + sn * uBoundaryOffset - uTime));
    }
  }

  void heights(vec2 p, out float h1, out float h2) {
    if (uMode < 0.5) {
      h1 = uS1On > 0.5 ? sourceWave(p, uS1Pos, uS1Amp, uS1Freq, 0.0) : 0.0;
      h2 = uS2On > 0.5 ? sourceWave(p, uS2Pos, uS2Amp, uS2Freq, uS2Phase) : 0.0;
    } else {
      refractionWaves(p, h1, h2);
    }
    float edge = min(HALF_SIZE - abs(p.x), HALF_SIZE - abs(p.y));
    float fade = smoothstep(0.0, EDGE_WIDTH, edge);
    h1 *= fade;
    h2 *= fade;
  }

  float total(vec2 p) {
    float a; float b;
    heights(p, a, b);
    return a + b;
  }

  void main() {
    vec3 pos = position;
    vec2 xz = pos.xz;
    float h1; float h2;
    heights(xz, h1, h2);
    const float EPS = 0.045;
    vec2 grad = vec2(
      (total(xz + vec2(EPS, 0.0)) - total(xz - vec2(EPS, 0.0))) / (2.0 * EPS),
      (total(xz + vec2(0.0, EPS)) - total(xz - vec2(0.0, EPS))) / (2.0 * EPS)
    );
    pos.y = h1 + h2;
    vH1 = h1;
    vH2 = h2;
    vNormal = normalize(vec3(-grad.x, 1.0, -grad.y));
    vWorldPos = (modelMatrix * vec4(pos, 1.0)).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const fragmentShader = `
  uniform vec3 uColor1;
  uniform vec3 uColor2;
  uniform vec3 uBaseColor;
  uniform vec3 uDeepColor;
  uniform vec3 uLightDir;
  uniform float uTopView;
  uniform vec3 uCrest;
  uniform vec3 uTrough;

  varying vec3 vWorldPos;
  varying vec3 vNormal;
  varying float vH1;
  varying float vH2;

  void main() {
    float totalH = vH1 + vH2;

    // Top view: like the bright and dark bands a ripple tank casts on the screen below.
    if (uTopView > 0.5) {
      float k = smoothstep(-0.32, 0.32, totalH);
      gl_FragColor = vec4(mix(uTrough, uCrest, k), 1.0);
      return;
    }

    vec3 N = normalize(vNormal);
    vec3 L = normalize(uLightDir);
    vec3 V = normalize(cameraPosition - vWorldPos);
    float NdotL = max(dot(N, L), 0.0);
    float ambient = 0.38;
    float diffuse = ambient + (1.0 - ambient) * NdotL;
    vec3 H = normalize(L + V);
    float spec = pow(max(dot(N, H), 0.0), 80.0) * 0.45;

    float heightFactor = clamp(totalH * 1.5 + 0.5, 0.0, 1.0);
    vec3 color = mix(uDeepColor, uBaseColor, heightFactor);
    color = mix(color, uColor1, clamp(vH1 * 3.5, 0.0, 1.0) * 0.5);
    color = mix(color, uColor2, clamp(vH2 * 3.5, 0.0, 1.0) * 0.5);
    float constructive = clamp(totalH * 2.0, 0.0, 1.0);
    color += vec3(0.12) * constructive * constructive;
    color *= diffuse;
    color += vec3(1.0) * spec;
    color += vec3(0.06) * pow(1.0 - max(dot(N, V), 0.0), 3.0);
    gl_FragColor = vec4(color, 0.96);
  }
`;

const THEMES = {
  light: {
    sceneBg: 0xe8edf3,
    baseColor: new THREE.Vector3(0.38, 0.55, 0.72),
    deepColor: new THREE.Vector3(0.16, 0.24, 0.38),
    source1Color: new THREE.Vector3(0.0, 0.72, 0.70),
    source2Color: new THREE.Vector3(0.50, 0.40, 0.86),
    crest: new THREE.Vector3(0.93, 0.97, 1.0),
    trough: new THREE.Vector3(0.12, 0.22, 0.36),
    edge: 0xb0bac8,
    regionA: 0x0d9488,
    regionB: 0xea580c
  },
  dark: {
    sceneBg: 0x0a0c14,
    baseColor: new THREE.Vector3(0.16, 0.26, 0.44),
    deepColor: new THREE.Vector3(0.04, 0.07, 0.14),
    source1Color: new THREE.Vector3(0.0, 0.62, 0.60),
    source2Color: new THREE.Vector3(0.46, 0.36, 0.80),
    crest: new THREE.Vector3(0.80, 0.90, 1.0),
    trough: new THREE.Vector3(0.03, 0.06, 0.12),
    edge: 0x3a4050,
    regionA: 0x2dd4bf,
    regionB: 0xf4845f
  }
};
const isDark = () => document.documentElement.getAttribute('data-theme') === 'dark';
const theme = () => (isDark() ? THEMES.dark : THEMES.light);

const scene = new THREE.Scene();
scene.background = new THREE.Color(theme().sceneBg);

const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minPolarAngle = 0;
controls.maxPolarAngle = Math.PI / 2 - 0.02;
controls.minDistance = 5;
controls.maxDistance = 30;
controls.enablePan = false;

const S1 = new THREE.Vector2();
const S2 = new THREE.Vector2();

const uniforms = {
  uTime: { value: 0 },
  uMode: { value: 0 },
  uSpeed: { value: 4 },
  uS1On: { value: 1 }, uS1Amp: { value: 0.5 }, uS1Freq: { value: 2 }, uS1Pos: { value: S1 },
  uS2On: { value: 1 }, uS2Amp: { value: 0.5 }, uS2Freq: { value: 2 }, uS2Phase: { value: 0 }, uS2Pos: { value: S2 },
  uRefrAmp: { value: 0.5 }, uRefrFreq: { value: 2 },
  uTwoRegions: { value: 0 },
  uBoundaryNormal: { value: new THREE.Vector2(1, 0) },
  uBoundaryOffset: { value: 0 },
  uSpeedA: { value: 4 }, uSpeedB: { value: 2.4 },
  uColor1: { value: theme().source1Color.clone() },
  uColor2: { value: theme().source2Color.clone() },
  uBaseColor: { value: theme().baseColor.clone() },
  uDeepColor: { value: theme().deepColor.clone() },
  uLightDir: { value: new THREE.Vector3(4, 10, 6).normalize() },
  uTopView: { value: 0 },
  uCrest: { value: theme().crest.clone() },
  uTrough: { value: theme().trough.clone() }
};

const geometry = new THREE.PlaneGeometry(TANK, TANK, SEGMENTS, SEGMENTS);
geometry.rotateX(-Math.PI / 2);
const material = new THREE.ShaderMaterial({ uniforms, vertexShader, fragmentShader, transparent: true, side: THREE.DoubleSide });
scene.add(new THREE.Mesh(geometry, material));

const edgeMat = new THREE.LineBasicMaterial({ color: theme().edge, transparent: true, opacity: 0.5 });
const tankEdge = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(TANK + 0.1, 0.4, TANK + 0.1)), edgeMat);
tankEdge.position.y = -0.2;
scene.add(tankEdge);

// Region tints; the boundary and its handles are drawn on the overlay.
const boundaryGroup = new THREE.Group();
scene.add(boundaryGroup);
const regionAMat = new THREE.MeshBasicMaterial({ color: theme().regionA, transparent: true, opacity: 0.12, depthWrite: false, side: THREE.DoubleSide });
const regionBMat = new THREE.MeshBasicMaterial({ color: theme().regionB, transparent: true, opacity: 0.1, depthWrite: false, side: THREE.DoubleSide });
const regionAMesh = new THREE.Mesh(new THREE.BufferGeometry(), regionAMat);
const regionBMesh = new THREE.Mesh(new THREE.BufferGeometry(), regionBMat);
regionAMesh.position.y = 0.012;
regionBMesh.position.y = 0.014;
boundaryGroup.add(regionAMesh, regionBMesh);

function boundaryNormal(r = current()) {
  const a = THREE.MathUtils.degToRad(r.incidence);
  return new THREE.Vector2(Math.cos(a), Math.sin(a));
}

// Keep the boundary inside the tank, across it from top to bottom, and clear of the source.
function clampBoundary() {
  const r = state.settings.refraction;
  r.incidence = THREE.MathUtils.clamp(r.incidence, -MAX_INCIDENCE, MAX_INCIDENCE);
  const n = boundaryNormal(r);
  const maxOffset = Math.max(0, HALF * Math.abs(n.x) - HALF * Math.abs(n.y) - 0.25);
  const minOffset = Math.min(maxOffset, (REFRACTION_SOURCE_X + 1.2) * n.x + HALF * Math.abs(n.y));
  r.offset = THREE.MathUtils.clamp(r.offset, Math.max(-maxOffset, minOffset), maxOffset);
}

function boundaryEnds(r = current()) {
  const n = boundaryNormal(r);
  const nx = Math.abs(n.x) < 1e-4 ? 1e-4 : n.x;
  return [
    new THREE.Vector2(THREE.MathUtils.clamp((r.offset + n.y * HALF) / nx, -HALF, HALF), -HALF),
    new THREE.Vector2(THREE.MathUtils.clamp((r.offset - n.y * HALF) / nx, -HALF, HALF), HALF)
  ];
}

function clipTank(keepPositive, r) {
  const n = boundaryNormal(r);
  const poly = [new THREE.Vector2(-HALF, -HALF), new THREE.Vector2(HALF, -HALF), new THREE.Vector2(HALF, HALF), new THREE.Vector2(-HALF, HALF)];
  const signed = (p) => p.dot(n) - r.offset;
  const inside = (p) => (keepPositive ? signed(p) >= -1e-4 : signed(p) <= 1e-4);
  const out = [];
  for (let i = 0; i < poly.length; i++) {
    const cur = poly[i];
    const prev = poly[(i + poly.length - 1) % poly.length];
    const denom = signed(prev) - signed(cur);
    if (inside(cur) !== inside(prev) && Math.abs(denom) > 1e-4) out.push(prev.clone().lerp(cur, signed(prev) / denom));
    if (inside(cur)) out.push(cur);
  }
  return out;
}

function polygonGeometry(points) {
  const g = new THREE.BufferGeometry();
  if (points.length < 3) return g;
  const v = [];
  for (let i = 1; i < points.length - 1; i++) v.push(points[0].x, 0, points[0].y, points[i].x, 0, points[i].y, points[i + 1].x, 0, points[i + 1].y);
  g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
  return g;
}

function updateBoundaryMeshes() {
  const r = state.settings.refraction;
  boundaryGroup.visible = state.mode === 'refraction' && r.twoRegions;
  if (!boundaryGroup.visible) return;
  regionAMesh.geometry.dispose();
  regionBMesh.geometry.dispose();
  regionAMesh.geometry = polygonGeometry(clipTank(false, r));
  regionBMesh.geometry = polygonGeometry(clipTank(true, r));
}

// Copy the settings into the shader.
function syncScene() {
  const u = uniforms;
  if (state.mode === 'interference') {
    const s = state.settings.interference;
    u.uMode.value = 0;
    u.uSpeed.value = s.speed;
    S1.set(-s.separation / 2, 0);
    S2.set(s.separation / 2, 0);
    u.uS1On.value = s.s1.on ? 1 : 0; u.uS1Amp.value = s.s1.amplitude; u.uS1Freq.value = s.s1.frequency;
    u.uS2On.value = s.s2.on ? 1 : 0; u.uS2Amp.value = s.s2.amplitude; u.uS2Freq.value = s.s2.frequency;
    u.uS2Phase.value = THREE.MathUtils.degToRad(s.s2.phase);
  } else {
    clampBoundary();
    const r = state.settings.refraction;
    u.uMode.value = 1;
    S1.set(REFRACTION_SOURCE_X, 0);
    u.uRefrAmp.value = r.amplitude;
    u.uRefrFreq.value = r.frequency;
    u.uTwoRegions.value = r.twoRegions ? 1 : 0;
    u.uBoundaryNormal.value.copy(boundaryNormal(r));
    u.uBoundaryOffset.value = r.offset;
    u.uSpeedA.value = r.speed1;
    u.uSpeedB.value = r.speed2;
  }
  updateBoundaryMeshes();
}

function applyTheme() {
  const c = theme();
  scene.background.set(c.sceneBg);
  uniforms.uBaseColor.value.copy(c.baseColor);
  uniforms.uDeepColor.value.copy(c.deepColor);
  uniforms.uColor1.value.copy(c.source1Color);
  uniforms.uColor2.value.copy(c.source2Color);
  uniforms.uCrest.value.copy(c.crest);
  uniforms.uTrough.value.copy(c.trough);
  edgeMat.color.set(c.edge);
  regionAMat.color.set(c.regionA);
  regionBMat.color.set(c.regionB);
  readCssColors();
}

// ---------- View ----------
function setView(view, { keepCamera = false } = {}) {
  state.view = view;
  uniforms.uTopView.value = view === 'top' ? 1 : 0;
  controls.enableRotate = view !== 'top';
  if (!keepCamera) fitCamera();
  viewToggle.querySelectorAll('.seg-btn').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.value === view)));
  updateHint();
}

// Place the camera so the whole tank, with a margin, fills the canvas at any shape.
const VIEW_ELEVATION = THREE.MathUtils.degToRad(48);
function fitCamera() {
  const dir = state.view === 'top'
    ? new THREE.Vector3(0, 1, 0.0001).normalize()
    : new THREE.Vector3(0, Math.sin(VIEW_ELEVATION), Math.cos(VIEW_ELEVATION));
  const corners = [];
  for (const x of [-HALF, HALF]) for (const z of [-HALF, HALF]) for (const y of [-0.6, 0.6]) corners.push(new THREE.Vector3(x, y, z));
  controls.target.set(0, 0, 0);
  let lo = 6;
  let hi = 60;
  for (let i = 0; i < 30; i++) {
    const d = (lo + hi) / 2;
    camera.position.copy(dir).multiplyScalar(d);
    camera.lookAt(0, 0, 0);
    camera.updateMatrixWorld();
    const fits = corners.every((c) => {
      const p = c.clone().project(camera);
      return Math.abs(p.x) <= 0.9 && Math.abs(p.y) <= 0.86;
    });
    if (fits) hi = d; else lo = d;
  }
  camera.position.copy(dir).multiplyScalar(hi);
  controls.maxDistance = Math.max(30, hi * 1.6);
  controls.update();
}

function updateHint() {
  const turn = state.view === 'top' ? 'Scroll or pinch to zoom' : 'Drag to turn';
  hint.textContent = state.mode === 'interference'
    ? `${turn} · drag P to move the probe`
    : `${turn} · drag the boundary or its end dots`;
}

let cameraFitted = false;
function resize() {
  const w = wrap.clientWidth;
  const h = wrap.clientHeight;
  if (!w || !h) return;
  const aspectChanged = Math.abs(camera.aspect - w / h) > 0.01;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h, false);
  if (aspectChanged && !cameraFitted) { cameraFitted = true; fitCamera(); }
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  overlay.width = Math.round(w * dpr);
  overlay.height = Math.round(h * dpr);
  octx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

// ---------- Overlays ----------
let css = {};
function readCssColors() {
  const cs = getComputedStyle(document.documentElement);
  const get = (n) => cs.getPropertyValue(n).trim();
  css = {
    s1: get('--source1-color'), s2: get('--source2-color'),
    r1: get('--region1-color'), r2: get('--region2-color'),
    nodal: get('--nodal-color'), antinodal: get('--antinodal-color'),
    ink: get('--ink'), font: get('--font-body') || 'sans-serif'
  };
}

const tmp = new THREE.Vector3();
function project(x, y) {
  tmp.set(x, 0, y).project(camera);
  if (tmp.z > 1) return null;
  return [(tmp.x + 1) / 2 * wrap.clientWidth, (1 - tmp.y) / 2 * wrap.clientHeight];
}

function path(points) {
  octx.beginPath();
  let started = false;
  for (const [x, y] of points) {
    const p = project(x, y);
    if (!p) { started = false; continue; }
    if (!started) { octx.moveTo(p[0], p[1]); started = true; } else octx.lineTo(p[0], p[1]);
  }
}

// A colored line with a dark halo, so it stands out on any part of the water.
function haloStroke(color, width, dash = []) {
  octx.setLineDash(dash);
  octx.lineCap = 'round';
  octx.lineJoin = 'round';
  octx.strokeStyle = 'rgba(4, 10, 24, 0.55)';
  octx.lineWidth = width + 3;
  octx.stroke();
  octx.strokeStyle = color;
  octx.lineWidth = width;
  octx.stroke();
  octx.setLineDash([]);
}

function label(text, x, y, color, dx = 0, dy = -16) {
  const p = project(x, y);
  if (!p) return;
  octx.font = `700 13px ${css.font}`;
  octx.textAlign = 'center';
  octx.textBaseline = 'middle';
  octx.lineWidth = 4;
  octx.strokeStyle = 'rgba(4, 10, 24, 0.7)';
  octx.strokeText(text, p[0] + dx, p[1] + dy);
  octx.fillStyle = color;
  octx.fillText(text, p[0] + dx, p[1] + dy);
}

function dot(x, y, color, radius = 5) {
  const p = project(x, y);
  if (!p) return null;
  octx.beginPath();
  octx.arc(p[0], p[1], radius, 0, Math.PI * 2);
  octx.fillStyle = color;
  octx.fill();
  octx.lineWidth = 2;
  octx.strokeStyle = 'rgba(4, 10, 24, 0.7)';
  octx.stroke();
  return p;
}

function arrow(x0, y0, x1, y1, color) {
  path([[x0, y0], [x1, y1]]);
  haloStroke(color, 3);
  const a = project(x1, y1);
  const b = project(x1 - (x1 - x0) * 0.08, y1 - (y1 - y0) * 0.08);
  if (!a || !b) return;
  const ang = Math.atan2(a[1] - b[1], a[0] - b[0]);
  octx.beginPath();
  octx.moveTo(a[0] + Math.cos(ang) * 4, a[1] + Math.sin(ang) * 4);
  octx.lineTo(a[0] - Math.cos(ang - 0.45) * 13, a[1] - Math.sin(ang - 0.45) * 13);
  octx.lineTo(a[0] - Math.cos(ang + 0.45) * 13, a[1] - Math.sin(ang + 0.45) * 13);
  octx.closePath();
  octx.fillStyle = color;
  octx.strokeStyle = 'rgba(4, 10, 24, 0.55)';
  octx.lineWidth = 1.5;
  octx.stroke();
  octx.fill();
}

// Arc around (cx, cy) from direction angle a0 to a1 (radians, shorter way).
function arc(cx, cy, radius, a0, a1, color) {
  let d = a1 - a0;
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d < -Math.PI) d += 2 * Math.PI;
  const pts = [];
  for (let i = 0; i <= 24; i++) {
    const a = a0 + (d * i) / 24;
    pts.push([cx + radius * Math.cos(a), cy + radius * Math.sin(a)]);
  }
  path(pts);
  haloStroke(color, 2);
  return a0 + d / 2;
}

function interferenceLinesValid(s) {
  return s.s1.on && s.s2.on && s.s1.frequency === s.s2.frequency;
}

function drawOverlay() {
  const w = wrap.clientWidth;
  const h = wrap.clientHeight;
  octx.clearRect(0, 0, w, h);

  if (state.mode === 'interference') {
    const s = state.settings.interference;
    const a = s.separation / 2;
    if (interferenceLinesValid(s)) {
      const lambda = P.wavelength(s.speed, s.s1.frequency);
      for (const kind of ['antinodal', 'nodal']) {
        if (!state.show[kind]) continue;
        for (const d of P.interferenceOrders(s.separation, lambda, s.s2.phase, kind)) {
          path(P.hyperbola(s.separation, d, HALF - 0.4));
          haloStroke(kind === 'nodal' ? css.nodal : css.antinodal, 2.2, kind === 'nodal' ? [7, 6] : []);
        }
      }
    }
    if (state.show.probe) {
      const p = s.probe;
      if (s.s1.on) { path([[-a, 0], [p.x, p.y]]); haloStroke(css.s1, 2.2); }
      if (s.s2.on) { path([[a, 0], [p.x, p.y]]); haloStroke(css.s2, 2.2); }
      const sp = dot(p.x, p.y, '#ffffff', 7);
      if (sp) probeScreen = sp;
      label('P', p.x, p.y, '#ffffff', 0, -18);
    }
    if (s.s1.on) { dot(-a, 0, css.s1, 5); label('S₁', -a, 0, css.s1); }
    if (s.s2.on) { dot(a, 0, css.s2, 5); label('S₂', a, 0, css.s2); }
    return;
  }

  const r = state.settings.refraction;
  if (!r.twoRegions) return;
  // Region names along the far edge, centered in each side of the boundary.
  const nEdge = boundaryNormal(r);
  const labelY = -HALF + 1.1;
  const xb = THREE.MathUtils.clamp((r.offset - nEdge.y * labelY) / nEdge.x, -HALF, HALF);
  label('Region 1', (-HALF + xb) / 2, labelY, css.r1, 0, 0);
  label('Region 2', (xb + HALF) / 2, labelY, css.r2, 0, 0);
  // The boundary and its two end handles: drag the line to move it, an end to turn it.
  const [endA, endB] = boundaryEnds(r);
  path([[endA.x, endA.y], [endB.x, endB.y]]);
  haloStroke('#ffffff', 2.2);
  dot(endA.x, endA.y, '#ffffff', 7);
  dot(endB.x, endB.y, '#ffffff', 7);
  const n = boundaryNormal(r);
  const qx = r.offset / n.x; // where the central ray meets the boundary
  const qy = 0;
  const res = P.refraction(r.speed1, r.speed2, Math.abs(r.incidence));
  const nAng = Math.atan2(n.y, n.x);
  // Direction of the wave after the boundary, from Snell's law, turned to the same side as the normal.
  let outAng = null;
  if (!res.total) outAng = nAng - Math.sign(r.incidence || 1) * THREE.MathUtils.degToRad(res.refracted);
  const reflAng = Math.atan2(-2 * n.x * n.y, 1 - 2 * n.x * n.x);

  if (state.show.normal) {
    path([[qx - 3.2 * n.x, qy - 3.2 * n.y], [qx + 3.2 * n.x, qy + 3.2 * n.y]]);
    haloStroke('#ffffff', 1.8, [6, 5]);
    if (state.show.rays) {
      const mid1 = arc(qx, qy, 1.5, nAng + Math.PI, Math.PI, css.r1);
      label('θ₁', qx + 2.15 * Math.cos(mid1), qy + 2.15 * Math.sin(mid1), css.r1, 0, 0);
      if (outAng !== null) {
        const mid2 = arc(qx, qy, 1.5, nAng, outAng, css.r2);
        label('θ₂', qx + 2.15 * Math.cos(mid2), qy + 2.15 * Math.sin(mid2), css.r2, 0, 0);
      }
    }
  }
  if (state.show.rays) {
    arrow(qx - 4.2, qy, qx, qy, css.r1);
    if (outAng !== null) arrow(qx, qy, qx + 4.2 * Math.cos(outAng), qy + 4.2 * Math.sin(outAng), css.r2);
    else arrow(qx, qy, qx + 4.2 * Math.cos(reflAng), qy + 4.2 * Math.sin(reflAng), css.r1);
  }
}

let probeScreen = null;

// Pull the probe onto the nearest nodal or antinodal line on show, when it is
// within a few pixels of one, so the readout lands on a whole or half wavelength.
const SNAP_PX = 9;
function snapToLine(x, y) {
  const s = state.settings.interference;
  if (!interferenceLinesValid(s)) return null;
  const here = project(x, y);
  if (!here) return null;
  const a = s.separation / 2;
  const lambda = P.wavelength(s.speed, s.s1.frequency);
  let best = null;
  for (const kind of ['antinodal', 'nodal']) {
    if (!state.show[kind]) continue;
    for (const d of P.interferenceOrders(s.separation, lambda, s.s2.phase, kind)) {
      // Newton steps along the gradient of r1 − r2 reach the hyperbola r1 − r2 = d.
      let px = x;
      let py = y;
      for (let i = 0; i < 5; i++) {
        const r1 = Math.hypot(px + a, py);
        const r2 = Math.hypot(px - a, py);
        const gx = (px + a) / r1 - (px - a) / r2;
        const gy = py / r1 - py / r2;
        const g2 = gx * gx + gy * gy;
        if (g2 < 1e-9) break;
        const k = (r1 - r2 - d) / g2;
        px -= k * gx;
        py -= k * gy;
      }
      if (Math.abs(Math.hypot(px + a, py) - Math.hypot(px - a, py) - d) > 1e-4) continue;
      if (Math.abs(px) > HALF - 0.3 || Math.abs(py) > HALF - 0.3) continue;
      const there = project(px, py);
      if (!there) continue;
      const dist = Math.hypot(there[0] - here[0], there[1] - here[1]);
      if (dist < SNAP_PX && (!best || dist < best.dist)) best = { x: px, y: py, dist };
    }
  }
  return best;
}

// ---------- Readouts ----------
const fmt = (v, d = 2) => {
  const t = Math.abs(v).toFixed(d);
  return (v < 0 && Number(t) !== 0 ? '−' : '') + t;
};

function updateReadouts() {
  const isInt = state.mode === 'interference';
  $('interferenceReadout').hidden = !isInt;
  $('refractionReadout').hidden = isInt;
  if (isInt) {
    const s = state.settings.interference;
    const lambda = P.wavelength(s.speed, s.s1.frequency);
    $('lambdaValue').textContent = lambda.toFixed(2);
    document.querySelectorAll('#interferenceReadout [data-probe]').forEach((e) => e.classList.toggle('is-off', !state.show.probe));
    const pd = P.pathDifference(s.probe.x, s.probe.y, s.separation, lambda, s.s2.phase);
    $('r1Value').textContent = pd.r1.toFixed(2);
    $('r2Value').textContent = pd.r2.toFixed(2);
    $('diffValue').textContent = fmt(pd.diff);
    $('diffLambda').textContent = fmt(pd.inWavelengths);
    const verdict = $('interferenceVerdict');
    let text = '';
    let kind = '';
    if (!s.s1.on || !s.s2.on) text = 'One source: no interference';
    else if (s.s1.frequency !== s.s2.frequency) text = 'Different frequencies: no steady pattern';
    else if (state.show.probe) {
      kind = pd.kind;
      text = kind === 'antinodal' ? 'Antinode: waves arrive in step' : kind === 'nodal' ? 'Node: waves arrive in antiphase' : '';
    }
    verdict.textContent = text;
    verdict.dataset.kind = kind;
    return;
  }
  const r = state.settings.refraction;
  const res = P.refraction(r.speed1, r.speed2, Math.abs(r.incidence));
  const refracted = r.twoRegions && !res.total;
  $('theta1Value').textContent = Math.abs(r.incidence).toFixed(1);
  $('lambda1Value').textContent = P.wavelength(r.speed1, r.frequency).toFixed(2);
  $('lambda2Value').textContent = P.wavelength(r.speed2, r.frequency).toFixed(2);
  document.querySelectorAll('#refractionReadout [data-refracted]').forEach((e) => e.classList.toggle('is-off', !refracted || r.incidence === 0));
  document.querySelectorAll('#refractionReadout [data-two-regions]').forEach((e) => e.classList.toggle('is-off', !r.twoRegions));
  if (refracted) {
    $('theta2Value').textContent = res.refracted.toFixed(1);
    $('sinRatio').textContent = (r.speed1 / r.speed2).toFixed(2);
  }
  const verdict = $('refractionVerdict');
  if (!r.twoRegions) { verdict.textContent = 'One depth: no refraction'; verdict.dataset.kind = ''; }
  else if (res.total) { verdict.textContent = `Total internal reflection: above the critical angle, ${res.critical.toFixed(1)}°`; verdict.dataset.kind = 'total'; }
  else if (r.incidence === 0) { verdict.textContent = 'Along the normal: no change of direction'; verdict.dataset.kind = ''; }
  else if (res.critical !== null) { verdict.textContent = `Faster: bends away from the normal; critical angle ${res.critical.toFixed(1)}°`; verdict.dataset.kind = ''; }
  else { verdict.textContent = r.speed2 < r.speed1 ? 'Slower: bends toward the normal' : r.speed2 > r.speed1 ? 'Faster: bends away from the normal' : 'Same speed: no bending'; verdict.dataset.kind = ''; }
}

// ---------- Controls ----------
const el = (tag, cls, text) => {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text !== undefined) node.textContent = text;
  return node;
};

const decimals = (step) => (String(step).includes('.') ? String(step).split('.')[1].length : 0);

function segmented(options, value, onChange, labelText, extraClass = '') {
  const group = el('div', `seg ${extraClass}`.trim());
  group.setAttribute('role', 'group');
  group.setAttribute('aria-label', labelText);
  for (const opt of options) {
    const btn = el('button', 'seg-btn', opt.label);
    btn.type = 'button';
    btn.dataset.value = String(opt.value);
    btn.setAttribute('aria-pressed', String(opt.value === value));
    if (opt.aria) btn.setAttribute('aria-label', opt.aria);
    btn.addEventListener('click', () => {
      group.querySelectorAll('.seg-btn').forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
      onChange(opt.value);
    });
    group.append(btn);
  }
  return group;
}

const MINUS = '−';
let fieldId = 0;

// A precise number control: typed value, slider, and − / + buttons that repeat when held.
function numberField(spec) {
  const digits = decimals(spec.step);
  const id = `field-${fieldId++}`;
  const wrapEl = el('div', 'field');
  const head = el('div', 'field-head');
  const lab = el('label', 'field-label', spec.label);
  lab.htmlFor = id;
  const valueBox = el('span', 'field-value');
  const input = el('input', 'field-input');
  Object.assign(input, { type: 'number', id, min: spec.min, max: spec.max, step: spec.step, inputMode: 'decimal' });
  input.setAttribute('aria-label', `${spec.group ? spec.group + ' ' : ''}${spec.label} in ${spec.unitName || spec.unit}`);
  valueBox.append(input, el('span', 'field-unit', spec.unit));
  head.append(lab, valueBox);

  const row = el('div', 'field-row');
  const minus = el('button', 'step-btn', MINUS);
  const plus = el('button', 'step-btn', '+');
  minus.type = plus.type = 'button';
  minus.tabIndex = plus.tabIndex = -1;
  minus.setAttribute('aria-label', `Decrease ${spec.label.toLowerCase()}`);
  plus.setAttribute('aria-label', `Increase ${spec.label.toLowerCase()}`);
  const range = el('input', 'range');
  Object.assign(range, { type: 'range', min: spec.min, max: spec.max, step: spec.step });
  range.setAttribute('aria-label', `${spec.group ? spec.group + ' ' : ''}${spec.label}`);
  row.append(minus, range, plus);
  wrapEl.append(head, row);

  const show = (v) => {
    input.value = v.toFixed(digits);
    range.value = String(v);
    range.style.setProperty('--pct', `${((v - spec.min) / (spec.max - spec.min)) * 100}%`);
    minus.disabled = v <= spec.min + 1e-9;
    plus.disabled = v >= spec.max - 1e-9;
  };
  const set = (raw) => {
    let v = Number(raw);
    if (!Number.isFinite(v)) { show(spec.get()); return; }
    v = Math.round(v / spec.step) * spec.step;
    v = Math.min(spec.max, Math.max(spec.min, Number(v.toFixed(digits))));
    spec.set(v);
    show(spec.get());
    changed();
  };
  wrapEl.refresh = () => show(spec.get());
  show(spec.get());

  range.addEventListener('input', () => set(range.value));
  input.addEventListener('change', () => set(input.value.replace(MINUS, '-')));
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') input.blur(); });
  for (const [btn, dir] of [[minus, -1], [plus, 1]]) {
    let timer = null;
    const stop = () => { clearTimeout(timer); clearInterval(timer); timer = null; };
    btn.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      set(spec.get() + dir * spec.step);
      timer = setTimeout(() => { timer = setInterval(() => set(spec.get() + dir * spec.step), 70); }, 380);
    });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach((ev) => btn.addEventListener(ev, stop));
  }
  return wrapEl;
}

function card(title, colorVar, switchSpec, ...children) {
  const c = el('section', 'card');
  const h = el('h2', 'card-title');
  if (colorVar) {
    const d = el('span', 'card-dot');
    d.style.background = `var(${colorVar})`;
    h.append(d);
  }
  h.append(title);
  if (switchSpec) {
    const sw = el('label', 'switch');
    sw.title = switchSpec.title;
    const input = el('input');
    input.type = 'checkbox';
    input.checked = switchSpec.get();
    input.setAttribute('aria-label', switchSpec.title);
    input.addEventListener('change', () => {
      switchSpec.set(input.checked);
      c.classList.toggle('is-off', !input.checked);
      changed();
    });
    sw.append(input, el('span'));
    h.append(sw);
    c.classList.toggle('is-off', !switchSpec.get());
  }
  c.append(h, ...children.filter(Boolean));
  return c;
}

const choiceRow = (text, group, cls = '') => {
  const row = el('div', `choice-row ${cls}`.trim());
  if (text) row.append(el('span', 'field-label', text));
  row.append(group);
  return row;
};
const note = (text) => el('p', 'card-note', text);

let liveFields = [];

function buildControls() {
  controlsEl.replaceChildren();
  liveFields = [];
  const keep = (f) => { liveFields.push(f); return f; };

  if (state.mode === 'interference') {
    const s = state.settings.interference;
    for (const n of [1, 2]) {
      const src = s[`s${n}`];
      const g = `Source ${n}`;
      controlsEl.append(card(g, `--source${n}-color`,
        { title: `Turn source ${n} on or off`, get: () => src.on, set: (v) => { src.on = v; } },
        numberField({ group: g, label: 'Frequency', unit: 'Hz', unitName: 'hertz', min: 0.5, max: 5, step: 0.1, get: () => src.frequency, set: (v) => { src.frequency = v; } }),
        numberField({ group: g, label: 'Amplitude', unit: 'cm', unitName: 'centimeters', min: 0, max: 1, step: 0.05, get: () => src.amplitude, set: (v) => { src.amplitude = v; } }),
        n === 2 ? numberField({ group: g, label: 'Phase lead', unit: '°', unitName: 'degrees', min: 0, max: 360, step: 5, get: () => src.phase, set: (v) => { src.phase = v; } }) : null
      ));
    }
    controlsEl.append(card('Tank', null, null,
      keep(numberField({ label: 'Source separation', unit: 'cm', unitName: 'centimeters', min: 0.5, max: 12, step: 0.5, get: () => s.separation, set: (v) => { s.separation = v; } })),
      numberField({ label: 'Wave speed', unit: 'cm/s', unitName: 'centimeters per second', min: 1.2, max: 8, step: 0.1, get: () => s.speed, set: (v) => { s.speed = v; } }),
      note('Antinodal lines join points where the waves arrive in step; nodal lines, where they cancel. Drag P to measure the path difference; it snaps onto the lines on show.')
    ));
    return;
  }

  const r = state.settings.refraction;
  controlsEl.append(card('Waves', '--region1-color', null,
    numberField({ label: 'Frequency', unit: 'Hz', unitName: 'hertz', min: 0.5, max: 5, step: 0.1, get: () => r.frequency, set: (v) => { r.frequency = v; } }),
    numberField({ label: 'Amplitude', unit: 'cm', unitName: 'centimeters', min: 0, max: 1, step: 0.05, get: () => r.amplitude, set: (v) => { r.amplitude = v; } })
  ));
  controlsEl.append(card('Boundary', null,
    { title: 'Two depths of water', get: () => r.twoRegions, set: (v) => { r.twoRegions = v; } },
    keep(numberField({ label: 'Angle of incidence', unit: '°', unitName: 'degrees', min: -MAX_INCIDENCE, max: MAX_INCIDENCE, step: 1, get: () => r.incidence, set: (v) => { r.incidence = v; } })),
    note('Drag the boundary to move it, or an end dot to turn it.')
  ));
  const speed1 = keep(numberField({ label: 'Speed in region 1', unit: 'cm/s', unitName: 'centimeters per second', min: 1.2, max: 8, step: 0.1, get: () => r.speed1, set: (v) => { r.speed1 = v; } }));
  const speed2 = keep(numberField({ label: 'Speed in region 2', unit: 'cm/s', unitName: 'centimeters per second', min: 1.2, max: 8, step: 0.1, get: () => r.speed2, set: (v) => { r.speed2 = v; } }));
  const presets = el('div', 'preset-row');
  for (const [text, v1, v2] of [['Deep → shallow', 4, 2.4], ['Shallow → deep', 2.4, 4]]) {
    const b = el('button', 'preset-btn', text);
    b.type = 'button';
    b.addEventListener('click', () => {
      r.speed1 = v1; r.speed2 = v2; r.twoRegions = true;
      buildControls();
      changed();
    });
    presets.append(b);
  }
  controlsEl.append(card('Water', '--region2-color', null, speed1, speed2, choiceRow('', presets, 'presets'),
    note('Waves travel more slowly in shallow water. Region 1 is where the waves start.')));
}

function buildLegend() {
  legend.replaceChildren();
  const items = state.mode === 'interference'
    ? [
      { key: 'antinodal', name: 'Antinodal', suffix: ' lines', swatch: '<path d="M1 6 H23" stroke-width="2.6"/>', color: '--antinodal-color' },
      { key: 'nodal', name: 'Nodal', suffix: ' lines', swatch: '<path d="M1 6 H23" stroke-dasharray="5 3.5" stroke-width="2.6"/>', color: '--nodal-color' },
      { key: 'probe', name: 'Probe', swatch: '<circle cx="12" cy="6" r="4" fill="currentColor" stroke="none"/>', color: '--ink-2' }
    ]
    : [
      { key: 'normal', name: 'Normal & angles', swatch: '<path d="M12 0 V12" stroke-dasharray="3 2.5"/><path d="M12 4 A3 3 0 0 1 15 6" />', color: '--ink-2' },
      { key: 'rays', name: 'Rays', swatch: '<path d="M1 6 H19"/><path d="M15 2 L21 6 L15 10" fill="currentColor"/>', color: '--region2-color' }
    ];
  for (const item of items) {
    const btn = el('button', 'legend-chip');
    btn.type = 'button';
    btn.setAttribute('aria-pressed', String(state.show[item.key]));
    const fullName = item.name + (item.suffix || '');
    btn.title = `Show or hide ${fullName.toLowerCase()}`;
    btn.style.setProperty('--swatch', `var(${item.color})`);
    btn.innerHTML = `<svg class="legend-swatch" viewBox="0 0 24 12" aria-hidden="true">${item.swatch}</svg>`;
    const text = el('span', '', item.name);
    if (item.suffix) text.append(el('span', 'chip-suffix', item.suffix));
    btn.append(text);
    btn.addEventListener('click', () => {
      state.show[item.key] = !state.show[item.key];
      btn.setAttribute('aria-pressed', String(state.show[item.key]));
      changed();
    });
    legend.append(btn);
  }
}

function changed() {
  syncScene();
  liveFields.forEach((f) => f.refresh());
  updateReadouts();
}

// ---------- Playback ----------
const ICONS = {
  play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l11-6.5z" fill="currentColor"/></svg>',
  pause: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6.5" y="5" width="4" height="14" rx="1.2" fill="currentColor"/><rect x="13.5" y="5" width="4" height="14" rx="1.2" fill="currentColor"/></svg>'
};

function updatePlayButton() {
  const icon = state.playing ? 'pause' : 'play';
  if (playBtn.dataset.icon === icon) return;
  playBtn.dataset.icon = icon;
  playBtn.innerHTML = ICONS[icon];
  const text = state.playing ? 'Pause' : 'Play';
  playBtn.setAttribute('aria-label', text);
  playBtn.title = `${text} (Space)`;
}

function togglePlay() {
  state.playing = !state.playing;
  updatePlayButton();
}

function step(dir) {
  state.playing = false;
  state.t = Math.max(0, state.t + dir * FRAME_STEP);
  updatePlayButton();
}

playBtn.addEventListener('click', togglePlay);
$('stepBackBtn').addEventListener('click', () => step(-1));
$('stepFwdBtn').addEventListener('click', () => step(1));

rateGroup.append(segmented(RATES.map((r) => ({ value: r, label: `${r}×`, aria: `Play at ${r} times speed` })), state.rate, (v) => { state.rate = v; }, 'Playback speed', 'seg-mini'));
viewToggle.append(segmented([{ value: '3d', label: '3D' }, { value: 'top', label: 'Top' }], state.view, (v) => setView(v), 'View', 'seg-mini'));

// Reset: this experiment's settings, overlays, playback and view as on arrival.
function reset() {
  state.settings[state.mode] = clone(DEFAULTS[state.mode]);
  state.show = { ...DEFAULT_SHOW };
  state.rate = 1;
  rateGroup.querySelectorAll('.seg-btn').forEach((b) => b.setAttribute('aria-pressed', String(Number(b.dataset.value) === 1)));
  state.t = 0;
  state.playing = true;
  updatePlayButton();
  setView('3d');
  buildLegend();
  buildControls();
  changed();
}
$('resetBtn').addEventListener('click', reset);

// ---------- Modes ----------
function setMode(mode, { fromHash = false } = {}) {
  if (!MODES.includes(mode)) mode = 'interference';
  state.mode = mode;
  tabs.forEach((tab) => {
    const on = tab.dataset.mode === mode;
    tab.setAttribute('aria-selected', String(on));
    tab.tabIndex = on ? 0 : -1;
  });
  if (!fromHash) history.replaceState(null, '', `#${mode}`);
  state.t = 0;
  state.playing = true;
  updatePlayButton();
  buildLegend();
  buildControls();
  setView(state.view);
  changed();
}

tabs.forEach((tab, i) => {
  tab.addEventListener('click', () => { if (tab.dataset.mode !== state.mode) setMode(tab.dataset.mode); });
  tab.addEventListener('keydown', (e) => {
    const delta = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (!delta) return;
    e.preventDefault();
    const next = tabs[(i + delta + tabs.length) % tabs.length];
    next.focus();
    setMode(next.dataset.mode);
  });
});

window.addEventListener('hashchange', () => {
  const mode = location.hash.slice(1);
  if (MODES.includes(mode) && mode !== state.mode) setMode(mode, { fromHash: true });
});

// ---------- Dragging the probe and the boundary ----------
const raycaster = new THREE.Raycaster();
const waterPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

function tankPoint(event) {
  const rect = canvas.getBoundingClientRect();
  const ndc = new THREE.Vector2(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
  raycaster.setFromCamera(ndc, camera);
  const hit = new THREE.Vector3();
  if (!raycaster.ray.intersectPlane(waterPlane, hit)) return null;
  return new THREE.Vector2(THREE.MathUtils.clamp(hit.x, -HALF, HALF), THREE.MathUtils.clamp(hit.z, -HALF, HALF));
}

function boundaryDragKind(point) {
  const r = state.settings.refraction;
  const [a, b] = boundaryEnds(r);
  if (point.distanceTo(a) < 0.8 || point.distanceTo(b) < 0.8) return 'rotate';
  return Math.abs(point.dot(boundaryNormal(r)) - r.offset) < 0.6 ? 'move' : null;
}

// Turn the boundary so that the dragged end follows the pointer, pivoting on the other end.
function rotateBoundaryTo(point) {
  const r = state.settings.refraction;
  const [a, b] = boundaryEnds(r);
  const fixed = point.y >= 0 ? a : b;
  const end = new THREE.Vector2(point.x, point.y >= 0 ? HALF : -HALF);
  const [lo, hi] = end.y < fixed.y ? [end, fixed] : [fixed, end];
  const normalAngle = Math.atan2(hi.y - lo.y, hi.x - lo.x) - Math.PI / 2;
  r.incidence = Math.round(THREE.MathUtils.radToDeg(normalAngle));
  r.offset = fixed.dot(boundaryNormal(r));
}

let drag = null;
canvas.addEventListener('pointerdown', (event) => {
  const rect = canvas.getBoundingClientRect();
  const sx = event.clientX - rect.left;
  const sy = event.clientY - rect.top;
  let kind = null;
  if (state.mode === 'interference' && state.show.probe && probeScreen && Math.hypot(sx - probeScreen[0], sy - probeScreen[1]) < 26) kind = 'probe';
  else if (state.mode === 'refraction' && state.settings.refraction.twoRegions) {
    const point = tankPoint(event);
    if (point) kind = boundaryDragKind(point);
  }
  if (!kind) return;
  event.preventDefault();
  event.stopPropagation();
  canvas.setPointerCapture(event.pointerId);
  controls.enabled = false;
  drag = { kind, id: event.pointerId, start: tankPoint(event), offset: state.settings.refraction.offset };
}, true);

canvas.addEventListener('pointermove', (event) => {
  if (!drag || drag.id !== event.pointerId) return;
  const point = tankPoint(event);
  if (!point) return;
  event.preventDefault();
  event.stopPropagation();
  if (drag.kind === 'probe') {
    const p = state.settings.interference.probe;
    p.x = Math.round(THREE.MathUtils.clamp(point.x, -HALF + 0.3, HALF - 0.3) * 20) / 20;
    p.y = Math.round(THREE.MathUtils.clamp(point.y, -HALF + 0.3, HALF - 0.3) * 20) / 20;
    const snap = snapToLine(p.x, p.y);
    if (snap) { p.x = snap.x; p.y = snap.y; }
  } else if (drag.kind === 'move') {
    const r = state.settings.refraction;
    r.offset = drag.offset + point.clone().sub(drag.start).dot(boundaryNormal(r));
  } else {
    rotateBoundaryTo(point);
  }
  changed();
}, true);

function endDrag(event) {
  if (!drag || drag.id !== event.pointerId) return;
  drag = null;
  controls.enabled = true;
  if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
}
canvas.addEventListener('pointerup', endDrag, true);
canvas.addEventListener('pointercancel', endDrag, true);

// Cursor hints over draggable things.
canvas.addEventListener('pointermove', (event) => {
  if (drag) return;
  const rect = canvas.getBoundingClientRect();
  let cursor = '';
  if (state.mode === 'interference' && state.show.probe && probeScreen
    && Math.hypot(event.clientX - rect.left - probeScreen[0], event.clientY - rect.top - probeScreen[1]) < 26) cursor = 'move';
  else if (state.mode === 'refraction' && state.settings.refraction.twoRegions) {
    const point = tankPoint(event);
    const kind = point && boundaryDragKind(point);
    if (kind === 'rotate') cursor = 'alias';
    else if (kind === 'move') cursor = 'move';
  }
  canvas.style.cursor = cursor;
});

// ---------- Keyboard ----------
document.addEventListener('click', (e) => {
  const btn = e.target.closest('button');
  if (btn && e.detail > 0) btn.blur();
});
document.addEventListener('keydown', (e) => {
  const t = e.target;
  const isSlider = t.matches && t.matches('input[type="range"]');
  if (!isSlider && t.closest && t.closest('input, textarea, select, button')) return;
  if (e.code === 'Space' && !e.repeat) { e.preventDefault(); togglePlay(); }
  else if (e.code === 'KeyR' && !e.metaKey && !e.ctrlKey) reset();
});

// ---------- Start ----------
window.PanPhyThemeToggle.mount(document.getElementById('theme-button'));
window.addEventListener('panphy:theme-change', applyTheme);
readCssColors();
new ResizeObserver(resize).observe(wrap);
resize();

const startMode = location.hash.slice(1);
setMode(MODES.includes(startMode) ? startMode : 'interference', { fromHash: true });

let last = null;
function animate(now) {
  requestAnimationFrame(animate);
  const dt = last === null ? 0 : Math.min((now - last) / 1000, 0.05);
  last = now;
  if (state.playing) state.t += dt * state.rate;
  uniforms.uTime.value = state.t;
  $('timeValue').textContent = state.t.toFixed(2);
  controls.update();
  renderer.render(scene, camera);
  drawOverlay();
}
requestAnimationFrame(animate);
