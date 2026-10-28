// The victory cinematic: a 40-second low-poly short rendered with Three.js.
//
// Story: the final wave falls silent; the words the player defeated hang in the
// violet night as paper tags and fly into the two crystal wands; the wands
// release a wave of light that turns the night into spring; the sun rises and
// lanterns lift from the valley to spell the game's name in the sky.
//
// Everything on screen is a pure function of the cinematic's clock, so Skip only
// moves the clock. The music in audio.js is scored to the same timeline.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { createLowPolyTree, createLowPolyCloud } from './lowpoly.js';

const BEAT = 60 / 90;

// Cue times in seconds. The score (audio.js) uses the same bar grid: 90 bpm, 4/4.
export const ENDING_TIMELINE = {
  beat: BEAT,
  gather: 8 * BEAT, // words start flying into the wands
  release: 16 * BEAT, // the wave of light
  lanterns: 32 * BEAT, // lanterns rise from the valley
  assemble: 40 * BEAT, // the first letter locks; one letter per beat
  title: 48 * BEAT, // the last letter locks
  end: 60 * BEAT, // the results card
};

const TITLE_TEXT = 'Spellwave';
// The game's heading face (Fredoka), as in the menu title and banners.
const GAME_FONT_FAMILY = 'Fredoka, Manrope, system-ui, sans-serif';
const TITLE_CENTER = new THREE.Vector3(0, 25, -106);
const TITLE_WIDTH = 42;
const WAVE_ORIGIN = new THREE.Vector3(0, 0, 0.5);
const WAND_X = 5.35;
const WAND_Z = 4.4;
const CRYSTAL_Y = 2.11;

const CAPTIONS = [
  { from: 0.7, to: 4.9, text: 'The final wave falls silent…' },
  { from: 5.8, to: 10.1, text: '…and every word you typed turns to light.' },
  { from: 17.8, to: 22.6, text: 'Dawn returns to the land.' },
];

// Words land in the wands on eighth notes between 6.0 s and 9.67 s.
export function wordArrivalTimes(count) {
  if (count <= 0) return [];
  const eighth = BEAT / 2;
  const first = ENDING_TIMELINE.gather + 2 * eighth;
  const last = ENDING_TIMELINE.release - 3 * eighth;
  const steps = Math.round((last - first) / eighth);
  const step = count > 1 ? Math.max(1, Math.floor(steps / (count - 1))) * eighth : 0;
  return Array.from({ length: count }, (_, index) => first + index * step);
}

// ── Small helpers ────────────────────────────────────────────────────────────

const clamp01 = (value) => Math.min(1, Math.max(0, value));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (edge0, edge1, value) => {
  const t = clamp01((value - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
};
const easeOutCubic = (t) => 1 - Math.pow(1 - clamp01(t), 3);
const easeInOutCubic = (t) => {
  const x = clamp01(t);
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
};
const easeOutBack = (t) => {
  const x = clamp01(t);
  const c1 = 1.9;
  return 1 + (c1 + 1) * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
};

function hash(a, b = 0, c = 0) {
  const value = Math.sin(a * 127.1 + b * 311.7 + c * 74.7) * 43758.5453;
  return value - Math.floor(value);
}

function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const color = (hex) => new THREE.Color(hex);
const hsl = (h, s, l) => new THREE.Color().setHSL(h, s, l);

// The wave of light: its radius grows faster and faster as it races to the horizon.
function waveRadius(t) {
  const dt = t - ENDING_TIMELINE.release;
  if (dt < 0) return -20;
  return 12 * dt + 1.7 * dt * dt;
}

function wavePassTime(distance) {
  const a = 1.7;
  const b = 12;
  return ENDING_TIMELINE.release + (-b + Math.sqrt(b * b + 4 * a * Math.max(0, distance))) / (2 * a);
}

// Morning light follows the wave.
function dawnAmount(t) {
  return smooth(ENDING_TIMELINE.release - 0.3, ENDING_TIMELINE.release + 13, t);
}

// Valley floor and verges, rising into a far ridge that hides the sunrise.
function heightAt(x, z) {
  const ax = Math.abs(x);
  let height = 0;
  if (ax > 6) height += Math.pow(ax - 6, 1.22) * 0.17;
  height += (Math.sin(x * 0.21 + z * 0.13) * 0.6 + Math.sin(x * 0.07 - z * 0.19) * 1.1 + 0.9) * smooth(4.6, 11, ax);
  const ridge = smooth(-120, -152, z);
  height += ridge * (17 + Math.sin(x * 0.09) * 7 + Math.sin(x * 0.23 + 1.3) * 4);
  return Math.max(0, height);
}

// Bakes a group of meshes into one geometry, with each part's colour in its
// vertices, so a whole tree or cloud costs a single draw call.
function mergeGroup(group) {
  group.updateMatrixWorld(true);
  const inverse = new THREE.Matrix4().copy(group.matrixWorld).invert();
  const parts = [];
  group.traverse((child) => {
    if (!child.isMesh) return;
    const geometry = child.geometry.index ? child.geometry.toNonIndexed() : child.geometry.clone();
    geometry.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inverse, child.matrixWorld));
    const tint = child.material.color;
    const colors = new Float32Array(geometry.attributes.position.count * 3);
    for (let index = 0; index < colors.length; index += 3) colors.set([tint.r, tint.g, tint.b], index);
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    for (const name of Object.keys(geometry.attributes)) {
      if (!['position', 'normal', 'color'].includes(name)) geometry.deleteAttribute(name);
    }
    parts.push(geometry);
  });
  const merged = mergeGeometries(parts);
  parts.forEach((geometry) => geometry.dispose());
  return merged;
}

function createGlowTexture() {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.22, 'rgba(255,255,255,0.75)');
  gradient.addColorStop(0.5, 'rgba(255,255,255,0.18)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function additive(options = {}) {
  return {
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    fog: false,
    ...options,
  };
}

function waitForFont(spec, timeout = 2500) {
  if (!document.fonts || !document.fonts.load) return Promise.resolve();
  return Promise.race([
    document.fonts.load(spec).catch(() => {}),
    new Promise((resolve) => window.setTimeout(resolve, timeout)),
  ]);
}

// ── Camera path ──────────────────────────────────────────────────────────────
// [time, position, look-at, vertical field of view, half-width that must stay in frame]
const CAMERA_KEYS = [
  [0, [0, 2.3, 13.4], [0, 2.2, -5], 48, 0],
  [2.7, [0.35, 2.3, 12.6], [0.1, 2.3, -5], 48, 0],
  [5.33, [0.1, 2.35, 12.0], [0, 2.3, -3], 49, 0],
  [7.6, [0, 2.5, 11.4], [0, 2.1, 3.2], 52, 7],
  [9.6, [0, 2.4, 11.8], [0, 2.0, 3.6], 56, 7],
  [10.67, [0, 2.5, 15.2], [0, 1.4, 1], 42, 7],
  [11.4, [0, 3.2, 8.0], [0, 1.2, -18], 58, 0],
  [12.5, [0.6, 3.4, -2], [0, 1.5, -30], 58, 0],
  [14.0, [1.2, 4.0, -15], [0, 2.5, -50], 55, 0],
  [15.5, [0.8, 6.0, -27], [0, 4, -70], 52, 0],
  [17.5, [-1.5, 10.5, -38], [0, 8, -110], 50, 0],
  [21.33, [-3, 13, -44], [0, 12, -115], 48, 0],
  [24.5, [-1.5, 13.5, -47], [0, 16, -112], 47, 18],
  [26.67, [0, 13, -49], [0, 21, -110], 46, 25],
  [32.0, [0, 13.5, -52], [0, 24, -108], 45, 25],
  [36.0, [1.2, 14.0, -55], [0, 24.5, -108], 44, 25],
  [40.0, [2.0, 14.2, -57], [0, 24.5, -108], 43, 25],
];

const MAX_FOV = 84;
const IDLE_CAMERA = { position: new THREE.Vector3(2, 11, -57), look: new THREE.Vector3(0, -4, -108) };

function catmullRom(p0, p1, p2, p3, t) {
  const t2 = t * t;
  const t3 = t2 * t;
  return 0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
}

function sampleCamera(t, outPosition, outLook) {
  const keys = CAMERA_KEYS;
  const last = keys.length - 1;
  if (t >= keys[last][0]) {
    // Behind the results card the camera tilts down to the valley, lifting the
    // name out of frame, and keeps a slow drift.
    const idle = t - keys[last][0];
    const settle = smooth(0, 3, idle);
    outPosition.set(...keys[last][1]).lerp(IDLE_CAMERA.position, settle);
    outPosition.x += Math.sin(idle * 0.12) * 2.5 * settle;
    outPosition.y += Math.sin(idle * 0.09) * 0.5 * settle;
    outLook.set(...keys[last][2]).lerp(IDLE_CAMERA.look, settle);
    return { fov: keys[last][3], fit: keys[last][4] * (1 - settle) };
  }
  let index = 0;
  while (index < last - 1 && t >= keys[index + 1][0]) index += 1;
  const k0 = keys[Math.max(0, index - 1)];
  const k1 = keys[index];
  const k2 = keys[index + 1];
  const k3 = keys[Math.min(last, index + 2)];
  const u = clamp01((t - k1[0]) / (k2[0] - k1[0]));
  outPosition.set(
    catmullRom(k0[1][0], k1[1][0], k2[1][0], k3[1][0], u),
    catmullRom(k0[1][1], k1[1][1], k2[1][1], k3[1][1], u),
    catmullRom(k0[1][2], k1[1][2], k2[1][2], k3[1][2], u),
  );
  outLook.set(
    catmullRom(k0[2][0], k1[2][0], k2[2][0], k3[2][0], u),
    catmullRom(k0[2][1], k1[2][1], k2[2][1], k3[2][1], u),
    catmullRom(k0[2][2], k1[2][2], k2[2][2], k3[2][2], u),
  );
  const eased = u * u * (3 - 2 * u);
  return { fov: lerp(k1[3], k2[3], eased), fit: lerp(k1[4], k2[4], eased) };
}

// ── The cinematic ────────────────────────────────────────────────────────────

export function createEndingCinematic(canvas, { flashEl = null, captionEl = null } = {}) {
  let renderer = null;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
  } catch (error) {
    console.warn('Spellwave could not start the victory cinematic.', error);
  }
  if (!renderer) {
    return {
      available: false,
      play({ onComplete } = {}) { if (onComplete) onComplete(); },
      skipToEnd() {},
      stop() {},
    };
  }

  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(46, 16 / 9, 0.1, 1400);
  const glowTexture = createGlowTexture();
  const world = { built: false, lite: false };

  // Clock and playback state
  let rafId = null;
  let playing = false;
  let audioStart = null;
  let getAudioTime = null;
  let ownClock = 0;
  let lastStamp = 0;
  let lastRender = 0;
  let timeOffset = 0;
  let lastT = -1;
  let completed = false;
  let onComplete = null;
  let currentCaption = -1;
  let width = 0;
  let height = 0;
  let words = [];
  let arrivals = [];
  let bursts = [];

  const cameraPosition = new THREE.Vector3();
  const cameraLook = new THREE.Vector3();
  const tempVector = new THREE.Vector3();
  const tempVectorTwo = new THREE.Vector3();
  const tempMatrix = new THREE.Matrix4();
  const tempQuaternion = new THREE.Quaternion();
  const tempScale = new THREE.Vector3();
  const tempEuler = new THREE.Euler();
  const tempColor = new THREE.Color();
  const UP = new THREE.Vector3(0, 1, 0);

  // ── Palettes for night and dawn ──
  const NIGHT = {
    skyTop: color(0x070418), skyHorizon: color(0x2a1a5e), skyBottom: color(0x120a2c),
    fog: color(0x1c1244), hemiSky: color(0x9a88e8), hemiGround: color(0x2a1e4a), hemi: 0.95,
    sun: color(0xd6c4ff), sunIntensity: 0.9,
  };
  const MIDDAWN = { skyTop: color(0x2b2f6e), skyHorizon: color(0xd46a8a) };
  const DAWN = {
    skyTop: color(0x4f86c6), skyHorizon: color(0xffc58f), skyBottom: color(0xf3d2a8),
    fog: color(0xf0d2b0), hemiSky: color(0xfff0d8), hemiGround: color(0x8a7a48), hemi: 1.05,
    sun: color(0xffd8a6), sunIntensity: 1.9,
  };

  // ── Build the world once ──
  let sky;
  let stars;
  let moons = [];
  let clouds = [];
  let sun;
  let sunGlow;
  let hemiLight;
  let sunLight;
  let terrainUniforms;
  let trees = [];
  let spikes = [];
  let flowers;
  let flowerData = [];
  let wandCrystals = [];
  let crystalMaterial;
  let crystalGlows = [];
  let beams = [];
  let waveRing;
  let waveWall;
  let motes;
  let moteData;
  let birds = [];
  let sparks;
  let sparkPositions;
  let sparkColors;
  let tagGroup;
  let tagGemGeometry = null;
  let gems = null;
  let gemHalo = null;
  let gemShadow = null;
  let gemData = [];
  let titleGlow;
  let titleReady = null;

  function buildWorld(lite) {
    world.built = true;
    world.lite = lite;
    const random = seededRandom(20261024);

    scene.fog = new THREE.Fog(NIGHT.fog.getHex(), 30, 170);
    hemiLight = new THREE.HemisphereLight(NIGHT.hemiSky, NIGHT.hemiGround, NIGHT.hemi);
    scene.add(hemiLight);
    sunLight = new THREE.DirectionalLight(NIGHT.sun, NIGHT.sunIntensity);
    sunLight.position.set(-30, 50, 20);
    scene.add(sunLight);

    buildSky(random);
    buildTerrain();
    buildFlora(random, lite);
    buildWands();
    buildWaveFX();
    buildMotes(random);
    buildBirds();
    buildSparks();
    tagGroup = new THREE.Group();
    scene.add(tagGroup);
  }

  function buildSky(random) {
    sky = new THREE.Mesh(
      new THREE.SphereGeometry(600, 32, 16),
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
        uniforms: {
          uTop: { value: NIGHT.skyTop.clone() },
          uHorizon: { value: NIGHT.skyHorizon.clone() },
          uBottom: { value: NIGHT.skyBottom.clone() },
          uSunDir: { value: new THREE.Vector3(0.2, -0.1, -1).normalize() },
          uSunColor: { value: color(0xffc070) },
          uSunGlow: { value: 0 },
        },
        vertexShader: `
          varying vec3 vDir;
          void main() {
            vDir = normalize(position);
            vec4 clip = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            gl_Position = clip.xyww;
          }`,
        fragmentShader: `
          uniform vec3 uTop;
          uniform vec3 uHorizon;
          uniform vec3 uBottom;
          uniform vec3 uSunDir;
          uniform vec3 uSunColor;
          uniform float uSunGlow;
          varying vec3 vDir;
          void main() {
            vec3 dir = normalize(vDir);
            vec3 c = mix(uHorizon, uTop, smoothstep(0.0, 0.5, dir.y));
            c = mix(c, uBottom, smoothstep(0.0, -0.2, dir.y));
            float s = max(dot(dir, uSunDir), 0.0);
            c += uSunColor * (pow(s, 6.0) * 0.32 + pow(s, 60.0) * 0.55) * uSunGlow;
            gl_FragColor = vec4(c, 1.0);
            #include <tonemapping_fragment>
            #include <colorspace_fragment>
          }`,
      }),
    );
    sky.renderOrder = -10;
    sky.frustumCulled = false;
    scene.add(sky);

    const starCount = 700;
    const starPositions = new Float32Array(starCount * 3);
    for (let index = 0; index < starCount; index += 1) {
      const theta = random() * Math.PI * 2;
      const y = 0.05 + random() * 0.95;
      const r = Math.sqrt(1 - y * y);
      starPositions.set([Math.cos(theta) * r * 560, y * 560, Math.sin(theta) * r * 560], index * 3);
    }
    const starGeometry = new THREE.BufferGeometry();
    starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    stars = new THREE.Points(starGeometry, new THREE.PointsMaterial({
      color: 0xf3ecff, size: 1.8, sizeAttenuation: false, transparent: true, depthWrite: false, fog: false,
    }));
    stars.frustumCulled = false;
    scene.add(stars);

    // The final wave's faceted moons, which set as the sun rises.
    const moonSpecs = [
      { position: [-150, 120, -420], radius: 17, hex: 0x8a6fe0, ring: 0xe0b8ff },
      { position: [120, 165, -440], radius: 10, hex: 0x4fc8c0 },
      { position: [210, 80, -380], radius: 6, hex: 0xf2a65a },
    ];
    for (const spec of moonSpecs) {
      const group = new THREE.Group();
      const material = new THREE.MeshStandardMaterial({
        color: spec.hex, emissive: spec.hex, emissiveIntensity: 0.35, roughness: 1, flatShading: true, fog: false, transparent: true,
      });
      group.add(new THREE.Mesh(new THREE.IcosahedronGeometry(spec.radius, 1), material));
      if (spec.ring) {
        const ringMaterial = new THREE.MeshStandardMaterial({
          color: spec.ring, emissive: spec.ring, emissiveIntensity: 0.4, roughness: 1, flatShading: true, fog: false, transparent: true,
        });
        const ring = new THREE.Mesh(new THREE.TorusGeometry(spec.radius * 1.7, spec.radius * 0.09, 4, 16), ringMaterial);
        ring.rotation.set(1.25, 0.3, 0);
        group.add(ring);
      }
      group.position.set(...spec.position);
      scene.add(group);
      moons.push({ group, baseY: spec.position[1], materials: group.children.map((mesh) => mesh.material) });
    }

    // The sun: a faceted ball behind the far ridge.
    sun = new THREE.Mesh(new THREE.IcosahedronGeometry(14, 1), new THREE.MeshBasicMaterial({ color: 0xffd890, fog: false }));
    sun.position.set(150, -30, -330);
    scene.add(sun);
    sunGlow = new THREE.Sprite(new THREE.SpriteMaterial(additive({ map: glowTexture, color: 0xffb060, opacity: 0 })));
    sunGlow.scale.set(150, 150, 1);
    scene.add(sunGlow);

    const cloudMaterial = new THREE.MeshStandardMaterial({ color: 0x3a2e70, emissive: 0x1a1238, roughness: 1, flatShading: true });
    for (let index = 0; index < 9; index += 1) {
      const cloud = new THREE.Mesh(mergeGroup(createLowPolyCloud(cloudMaterial, index)), cloudMaterial);
      const scale = 2.2 + random() * 1.6;
      cloud.scale.setScalar(scale);
      cloud.position.set(-150 + random() * 300, 42 + random() * 26, -90 - random() * 170);
      scene.add(cloud);
      clouds.push({ cloud, baseX: cloud.position.x, speed: 0.6 + random() * 0.9 });
    }
    clouds.material = cloudMaterial;
  }

  function buildTerrain() {
    const minX = -102;
    const maxX = 102;
    const minZ = -190;
    const maxZ = 70;
    const cell = 3;
    const nx = Math.round((maxX - minX) / cell);
    const nz = Math.round((maxZ - minZ) / cell);
    const grid = new Float32Array((nx + 1) * (nz + 1) * 3);
    for (let j = 0; j <= nz; j += 1) {
      for (let i = 0; i <= nx; i += 1) {
        let x = minX + i * cell;
        let z = minZ + j * cell;
        const edge = i === 0 || j === 0 || i === nx || j === nz;
        if (!edge) {
          x += (hash(i, j, 1) - 0.5) * cell * 0.55;
          z += (hash(i, j, 2) - 0.5) * cell * 0.55;
        }
        let y = heightAt(x, z);
        if (Math.abs(x) > 4.8) y += (hash(i, j, 3) - 0.5) * 0.4;
        grid.set([x, y, z], (j * (nx + 1) + i) * 3);
      }
    }

    const triangles = nx * nz * 2;
    const positions = new Float32Array(triangles * 9);
    const nightColors = new Float32Array(triangles * 9);
    const dayColors = new Float32Array(triangles * 9);
    const centers = new Float32Array(triangles * 6);
    let tri = 0;
    const vertex = (i, j) => (j * (nx + 1) + i) * 3;
    const night = new THREE.Color();
    const day = new THREE.Color();

    const writeTriangle = (a, b, c) => {
      const cx = (grid[a] + grid[b] + grid[c]) / 3;
      const cy = (grid[a + 1] + grid[b + 1] + grid[c + 1]) / 3;
      const cz = (grid[a + 2] + grid[b + 2] + grid[c + 2]) / 3;
      const n = hash(cx, cz, 9);
      const onRoad = Math.abs(cx) < 4.3 && cz > -118;
      if (onRoad) {
        night.setHSL(0.72, 0.22, 0.3 + n * 0.08);
        day.setHSL(0.1, 0.42, 0.56 + n * 0.08);
      } else if (cy > 23) {
        night.setHSL(0.74, 0.25, 0.32 + n * 0.06);
        day.setHSL(0.6, 0.18, 0.86 + n * 0.08);
      } else if (cy > 12) {
        night.setHSL(0.75, 0.3, 0.18 + n * 0.06);
        day.setHSL(0.28 + n * 0.04, 0.2, 0.38 + n * 0.08);
      } else {
        night.setHSL(0.73, 0.32, 0.17 + n * 0.07);
        day.setHSL(0.2 + n * 0.07, 0.5, 0.36 + n * 0.1);
      }
      for (const [k, v] of [a, b, c].entries()) {
        const offset = tri * 9 + k * 3;
        positions[offset] = grid[v];
        positions[offset + 1] = grid[v + 1];
        positions[offset + 2] = grid[v + 2];
        nightColors[offset] = night.r; nightColors[offset + 1] = night.g; nightColors[offset + 2] = night.b;
        dayColors[offset] = day.r; dayColors[offset + 1] = day.g; dayColors[offset + 2] = day.b;
        centers[tri * 6 + k * 2] = cx;
        centers[tri * 6 + k * 2 + 1] = cz;
      }
      tri += 1;
    };

    for (let j = 0; j < nz; j += 1) {
      for (let i = 0; i < nx; i += 1) {
        const v00 = vertex(i, j);
        const v10 = vertex(i + 1, j);
        const v01 = vertex(i, j + 1);
        const v11 = vertex(i + 1, j + 1);
        if ((i + j) % 2 === 0) {
          writeTriangle(v00, v01, v10);
          writeTriangle(v10, v01, v11);
        } else {
          writeTriangle(v00, v01, v11);
          writeTriangle(v00, v11, v10);
        }
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(nightColors, 3));
    geometry.setAttribute('dayColor', new THREE.BufferAttribute(dayColors, 3));
    geometry.setAttribute('faceCenter', new THREE.BufferAttribute(centers, 2));
    geometry.computeVertexNormals();

    terrainUniforms = {
      uWaveOrigin: { value: new THREE.Vector2(WAVE_ORIGIN.x, WAVE_ORIGIN.z) },
      uWaveRadius: { value: -20 },
      uFrontGlow: { value: 0 },
    };
    const material = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 1, metalness: 0 });
    // Each facet flips from night to spring as the wave front crosses its centre,
    // and the facets on the front itself glow.
    material.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, terrainUniforms);
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', `#include <common>
          attribute vec3 dayColor;
          attribute vec2 faceCenter;
          uniform vec2 uWaveOrigin;
          uniform float uWaveRadius;
          varying float vFront;`)
        .replace('#include <color_vertex>', `#include <color_vertex>
          float waveDistance = distance(faceCenter, uWaveOrigin);
          float flipped = 1.0 - smoothstep(uWaveRadius - 1.2, uWaveRadius, waveDistance);
          vColor.rgb = mix(vColor.rgb, dayColor, flipped);
          vFront = 1.0 - clamp(abs(waveDistance - uWaveRadius + 0.8) / 1.8, 0.0, 1.0);`);
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', `#include <common>
          uniform float uFrontGlow;
          varying float vFront;`)
        .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
          totalEmissiveRadiance += vec3(1.0, 0.72, 0.36) * vFront * vFront * uFrontGlow;`);
    };
    scene.add(new THREE.Mesh(geometry, material));
  }

  function placeOnVerge(random, minZ, maxZ, minX, maxX) {
    const side = random() < 0.5 ? -1 : 1;
    const x = side * (minX + random() * (maxX - minX));
    const z = minZ + random() * (maxZ - minZ);
    return new THREE.Vector3(x, heightAt(x, z), z);
  }

  function buildFlora(random, lite) {
    const trunkMaterial = new THREE.MeshStandardMaterial({ color: 0xa85a26, roughness: 0.9, flatShading: true });
    const leafMaterials = [0x7f9e2e, 0x9bb23a, 0x5f8428].map((hex) => new THREE.MeshStandardMaterial({ color: hex, roughness: 0.85, flatShading: true }));
    const treeMaterial = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, flatShading: true });
    const treeCount = lite ? 40 : 72;
    for (let index = 0; index < treeCount; index += 1) {
      const nearRoad = index < treeCount * 0.4;
      const position = placeOnVerge(random, nearRoad ? -70 : -122, 12, 6.5, nearRoad ? 15 : 38);
      const { group: parts } = createLowPolyTree({ kind: random() < 0.35 ? 'pine' : 'round', trunkMaterial, leafMaterials, seed: index + 3 });
      const group = new THREE.Mesh(mergeGroup(parts), treeMaterial);
      group.position.copy(position);
      group.position.y -= 0.1;
      group.rotation.y = random() * Math.PI * 2;
      group.scale.setScalar(0.0001);
      group.visible = false;
      scene.add(group);
      const distance = Math.hypot(position.x - WAVE_ORIGIN.x, position.z - WAVE_ORIGIN.z);
      trees.push({ group, size: 0.9 + random() * 0.8, pass: wavePassTime(distance) + 0.08 + random() * 0.12 });
    }

    // Violet crystals: the final wave's corruption, which shatters as the wave passes.
    const spikeMaterial = new THREE.MeshStandardMaterial({
      color: 0xb04ae0, emissive: 0xe040fb, emissiveIntensity: 0.9, roughness: 0.35, flatShading: true,
    });
    const spikeGeometry = new THREE.OctahedronGeometry(0.4, 0);
    const spikeCount = lite ? 18 : 32;
    for (let index = 0; index < spikeCount; index += 1) {
      const position = placeOnVerge(random, -70, 9, 5, 22);
      const group = new THREE.Group();
      const shards = 2 + Math.floor(random() * 3);
      for (let shard = 0; shard < shards; shard += 1) {
        const mesh = new THREE.Mesh(spikeGeometry, spikeMaterial);
        const tall = 1.3 + random() * 1.6;
        mesh.scale.set(0.7 + random() * 0.5, tall, 0.7 + random() * 0.5);
        mesh.position.set((random() - 0.5) * 0.9, tall * 0.32, (random() - 0.5) * 0.9);
        mesh.rotation.set((random() - 0.5) * 0.6, random() * 3, (random() - 0.5) * 0.6);
        group.add(mesh);
      }
      const merged = new THREE.Mesh(mergeGroup(group), spikeMaterial);
      merged.position.copy(position);
      scene.add(merged);
      const distance = Math.hypot(position.x - WAVE_ORIGIN.x, position.z - WAVE_ORIGIN.z);
      spikes.push({ group: merged, pass: wavePassTime(distance), phase: random() * 6 });
    }
    spikes.material = spikeMaterial;

    // Flowers: one instanced mesh of faceted blossoms that pop up behind the wave.
    const flowerCount = lite ? 320 : 800;
    flowers = new THREE.InstancedMesh(
      new THREE.IcosahedronGeometry(0.17, 0),
      new THREE.MeshStandardMaterial({ roughness: 0.6, flatShading: true }),
      flowerCount,
    );
    const palette = [0xf28cb1, 0xffe066, 0xfff6e8, 0x9ec9ff, 0xff9a62, 0xd9a0ff].map(color);
    for (let index = 0; index < flowerCount; index += 1) {
      const position = placeOnVerge(random, -118, 14, 4.6, index % 2 === 0 ? 14 : 46);
      position.y += 0.12;
      const distance = Math.hypot(position.x - WAVE_ORIGIN.x, position.z - WAVE_ORIGIN.z);
      flowers.setColorAt(index, palette[Math.floor(random() * palette.length)]);
      flowerData.push({ position, size: 0.7 + random() * 0.8, pass: wavePassTime(distance) + random() * 0.25 });
      flowers.setMatrixAt(index, tempMatrix.makeScale(0, 0, 0));
    }
    flowers.instanceColor.needsUpdate = true;
    flowers.frustumCulled = false;
    scene.add(flowers);
  }

  // The two crystal wands that stand at the wall in the game.
  function buildWands() {
    const shaftMaterial = new THREE.MeshStandardMaterial({ color: 0x6b4226, roughness: 0.9, flatShading: true });
    const bandMaterial = new THREE.MeshStandardMaterial({ color: 0xd9a441, roughness: 0.4, metalness: 0.6, flatShading: true });
    crystalMaterial = new THREE.MeshStandardMaterial({
      color: 0x58dfcf, emissive: 0x2dd4bf, emissiveIntensity: 1.2, roughness: 0.1, metalness: 0.2, flatShading: true,
    });
    const part = (group, geometry, material, y) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.y = y;
      group.add(mesh);
      return mesh;
    };
    for (const x of [-WAND_X, WAND_X]) {
      const group = new THREE.Group();
      group.position.set(x, 0, WAND_Z);
      part(group, new THREE.CylinderGeometry(0.07, 0.12, 1.9, 5), shaftMaterial, 0.95);
      part(group, new THREE.CylinderGeometry(0.15, 0.15, 0.1, 6), bandMaterial, 0.38);
      part(group, new THREE.CylinderGeometry(0.13, 0.13, 0.1, 6), bandMaterial, 1.0);
      part(group, new THREE.CylinderGeometry(0.11, 0.11, 0.1, 6), bandMaterial, 1.74);
      part(group, new THREE.CylinderGeometry(0.2, 0.12, 0.12, 6), bandMaterial, 1.88);
      part(group, new THREE.ConeGeometry(0.07, 0.16, 4), bandMaterial, 2.5);
      const crystal = new THREE.Group();
      crystal.position.y = CRYSTAL_Y;
      const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.26, 0), crystalMaterial);
      core.scale.set(1, 1.35, 1);
      crystal.add(core);
      for (const side of [-1, 1]) {
        const shard = new THREE.Mesh(new THREE.OctahedronGeometry(0.12, 0), crystalMaterial);
        shard.scale.set(1, 1.6, 1);
        shard.position.set(side * 0.2, 0.08, 0);
        shard.rotation.z = side * -0.35;
        crystal.add(shard);
      }
      group.add(crystal);
      scene.add(group);
      wandCrystals.push(crystal);

      const glow = new THREE.Sprite(new THREE.SpriteMaterial(additive({ map: glowTexture, color: 0x58dfcf, opacity: 0.6 })));
      glow.position.set(x, CRYSTAL_Y, WAND_Z);
      scene.add(glow);
      crystalGlows.push(glow);

      const beam = new THREE.Mesh(
        new THREE.CylinderGeometry(0.07, 0.16, 1, 6, 1, true),
        new THREE.MeshBasicMaterial(additive({ color: 0xfff1c8, opacity: 0, side: THREE.DoubleSide })),
      );
      const start = new THREE.Vector3(x, CRYSTAL_Y, WAND_Z);
      const end = WAVE_ORIGIN.clone().setY(0.25);
      beam.position.copy(start).add(end).multiplyScalar(0.5);
      beam.quaternion.setFromUnitVectors(UP, tempVector.copy(end).sub(start).normalize());
      beam.scale.set(1, start.distanceTo(end), 1);
      beam.visible = false;
      scene.add(beam);
      beams.push(beam);
    }
  }

  function buildWaveFX() {
    waveRing = new THREE.Mesh(
      new THREE.RingGeometry(0.96, 1, 160, 1),
      new THREE.MeshBasicMaterial(additive({ color: 0xffd98a, opacity: 0, side: THREE.DoubleSide })),
    );
    waveRing.rotation.x = -Math.PI / 2;
    waveRing.position.set(WAVE_ORIGIN.x, 0.3, WAVE_ORIGIN.z);
    waveRing.visible = false;
    scene.add(waveRing);

    // A curtain of light standing on the ring, fading upwards.
    waveWall = new THREE.Mesh(
      new THREE.CylinderGeometry(1, 1, 1, 120, 1, true),
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        uniforms: { uOpacity: { value: 0 }, uColor: { value: color(0xffe2a0) } },
        vertexShader: `
          varying float vHeight;
          void main() {
            vHeight = position.y + 0.5;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }`,
        fragmentShader: `
          uniform float uOpacity;
          uniform vec3 uColor;
          varying float vHeight;
          void main() {
            float fade = pow(1.0 - vHeight, 2.2);
            gl_FragColor = vec4(uColor * fade * uOpacity, 1.0);
            #include <colorspace_fragment>
          }`,
      }),
    );
    waveWall.position.set(WAVE_ORIGIN.x, 3.5, WAVE_ORIGIN.z);
    waveWall.visible = false;
    waveWall.frustumCulled = false;
    scene.add(waveWall);
  }

  // Motes drift in the night air and turn to golden pollen at dawn.
  function buildMotes(random) {
    const count = 160;
    moteData = new Float32Array(count * 4);
    for (let index = 0; index < count; index += 1) {
      moteData.set([(random() - 0.5) * 30, 0.5 + random() * 6, -random() * 34 + 10, random() * Math.PI * 2], index * 4);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
    motes = new THREE.Points(geometry, new THREE.PointsMaterial(additive({ map: glowTexture, size: 0.32, color: 0xc89cff, opacity: 0.8 })));
    motes.frustumCulled = false;
    scene.add(motes);
  }

  // A small flock crossing the sunrise.
  function buildBirds() {
    const material = new THREE.MeshBasicMaterial({ color: 0x3d2b1c, side: THREE.DoubleSide });
    const wingGeometry = new THREE.BufferGeometry();
    wingGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array([0, 0, -0.25, 0, 0, 0.3, 1.2, 0.1, 0.05]), 3));
    const bodyGeometry = new THREE.ConeGeometry(0.16, 0.9, 4);
    bodyGeometry.rotateX(Math.PI / 2);
    for (let index = 0; index < 11; index += 1) {
      const bird = new THREE.Group();
      bird.add(new THREE.Mesh(bodyGeometry, material));
      const left = new THREE.Mesh(wingGeometry, material);
      const right = new THREE.Mesh(wingGeometry, material);
      right.scale.x = -1;
      bird.add(left, right);
      bird.rotation.y = -Math.PI / 2;
      bird.visible = false;
      scene.add(bird);
      const row = Math.floor((index + 1) / 2);
      const side = index % 2 === 0 ? 1 : -1;
      birds.push({ bird, left, right, offset: new THREE.Vector3(-row * 2.2, side * row * 0.6 + (index === 0 ? 0 : 0.2), side * row * 1.6), phase: index * 0.7 });
    }
  }

  function buildSparks() {
    const capacity = 2200;
    sparkPositions = new Float32Array(capacity * 3);
    sparkColors = new Float32Array(capacity * 3);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(sparkPositions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(sparkColors, 3));
    geometry.setDrawRange(0, 0);
    sparks = new THREE.Points(geometry, new THREE.PointsMaterial(additive({ map: glowTexture, size: 0.55, vertexColors: true })));
    sparks.frustumCulled = false;
    sparks.capacity = capacity;
    scene.add(sparks);
  }

  // ── Word tags: paper cards like the game's labels ──
  function createTagTexture(text) {
    const fontSize = 54;
    const canvasEl = document.createElement('canvas');
    const ctx = canvasEl.getContext('2d');
    ctx.font = `600 ${fontSize}px ${GAME_FONT_FAMILY}`;
    const textWidth = Math.ceil(ctx.measureText(text).width);
    canvasEl.width = textWidth + 64;
    canvasEl.height = 104;
    const ctx2 = canvasEl.getContext('2d');
    const w = canvasEl.width;
    const h = canvasEl.height;
    const radius = 22;
    ctx2.beginPath();
    ctx2.moveTo(radius + 4, 4);
    ctx2.arcTo(w - 4, 4, w - 4, h - 4, radius);
    ctx2.arcTo(w - 4, h - 4, 4, h - 4, radius);
    ctx2.arcTo(4, h - 4, 4, 4, radius);
    ctx2.arcTo(4, 4, w - 4, 4, radius);
    ctx2.closePath();
    const paper = ctx2.createLinearGradient(0, 0, w, h);
    paper.addColorStop(0, '#fdf8ea');
    paper.addColorStop(1, '#f2e4c2');
    ctx2.fillStyle = paper;
    ctx2.fill();
    ctx2.lineWidth = 4;
    ctx2.strokeStyle = 'rgba(110, 78, 40, 0.55)';
    ctx2.stroke();
    ctx2.font = `600 ${fontSize}px ${GAME_FONT_FAMILY}`;
    ctx2.fillStyle = '#3d2b1c';
    ctx2.textAlign = 'center';
    ctx2.textBaseline = 'middle';
    ctx2.fillText(text, w / 2, h / 2 + 3);
    const texture = new THREE.CanvasTexture(canvasEl);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
    return { texture, aspect: w / h };
  }

  function clearTags() {
    for (const word of words) {
      word.sprite.material.map.dispose();
      word.sprite.material.dispose();
      word.gem.material.dispose();
    }
    tagGroup.clear();
    words = [];
  }

  function buildTags(terms) {
    clearTags();
    const random = seededRandom(terms.length * 977 + 13);
    tagGemGeometry ||= new THREE.OctahedronGeometry(0.14, 0);
    const gemGeometry = tagGemGeometry;
    terms.forEach((term, index) => {
      const { texture, aspect } = createTagTexture(term);
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, fog: false }));
      const tagHeight = 0.62;
      sprite.scale.set(tagHeight * aspect, tagHeight, 1);
      sprite.renderOrder = 2;
      tagGroup.add(sprite);
      const gem = new THREE.Mesh(gemGeometry, new THREE.MeshBasicMaterial({ color: 0xd9a0ff, fog: false }));
      tagGroup.add(gem);
      const lane = (index % 2 === 0 ? -1 : 1) * (0.6 + random() * 3.8);
      const home = new THREE.Vector3(lane, 1.5 + random() * 2.7, -1.5 - random() * 10);
      const side = home.x < 0 ? 0 : 1;
      words.push({
        sprite,
        gem,
        aspect,
        tagHeight,
        home,
        side,
        phase: random() * Math.PI * 2,
        arrive: arrivals[index],
        depart: arrivals[index] - 1.35,
      });
    });
  }

  // ── The title: lantern gems that settle into the game's name ──
  function prepareTitle(lite) {
    if (titleReady) return titleReady;
    titleReady = waitForFont(`700 160px ${GAME_FONT_FAMILY}`).then(() => buildTitle(lite));
    return titleReady;
  }

  function buildTitle(lite) {
    const fontSize = 200;
    const canvasEl = document.createElement('canvas');
    canvasEl.width = 1200;
    canvasEl.height = 300;
    const ctx = canvasEl.getContext('2d');
    ctx.font = `700 ${fontSize}px ${GAME_FONT_FAMILY}`;
    const textWidth = ctx.measureText(TITLE_TEXT).width;
    const left = (canvasEl.width - textWidth) / 2;
    const baseline = 205;
    ctx.fillStyle = '#fff';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(TITLE_TEXT, left, baseline);

    // Letter boundaries, so each gem knows which letter (and so which beat) it joins.
    const letterEdges = [];
    for (let index = 1; index < TITLE_TEXT.length; index += 1) {
      letterEdges.push(left + ctx.measureText(TITLE_TEXT.slice(0, index)).width);
    }

    const step = lite ? 7 : 5;
    const unitsPerPixel = TITLE_WIDTH / textWidth;
    const pixels = ctx.getImageData(0, 0, canvasEl.width, canvasEl.height).data;
    const random = seededRandom(4242);
    const centerY = baseline - fontSize * 0.36;
    const colorA = color(0xc4471a);
    const colorB = color(0xe89a1e);
    const points = [];
    for (let y = 0; y < canvasEl.height; y += step) {
      for (let x = 0; x < canvasEl.width; x += step) {
        const jx = Math.min(canvasEl.width - 1, x + Math.floor(random() * step * 0.5));
        if (pixels[(y * canvasEl.width + jx) * 4 + 3] < 128) continue;
        let letter = 0;
        while (letter < letterEdges.length && jx >= letterEdges[letter]) letter += 1;
        points.push({ x: jx, y, letter });
      }
    }

    const geometry = new THREE.OctahedronGeometry(step * unitsPerPixel * 0.8, 0);
    const material = new THREE.MeshStandardMaterial({
      color: 0xffffff, emissive: 0xff8a3a, emissiveIntensity: 0.9, roughness: 0.32, metalness: 0.25, flatShading: true, fog: false,
    });
    gems = new THREE.InstancedMesh(geometry, material, points.length);
    gems.frustumCulled = false;
    gems.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    const haloPositions = new Float32Array(points.length * 3);
    const haloColors = new Float32Array(points.length * 3);
    const haloGeometry = new THREE.BufferGeometry();
    haloGeometry.setAttribute('position', new THREE.BufferAttribute(haloPositions, 3));
    haloGeometry.setAttribute('color', new THREE.BufferAttribute(haloColors, 3));
    gemHalo = new THREE.Points(haloGeometry, new THREE.PointsMaterial(additive({ map: glowTexture, size: 1.25, vertexColors: true })));
    gemHalo.frustumCulled = false;

    gemData = points.map((point, index) => {
      const target = new THREE.Vector3(
        TITLE_CENTER.x + (point.x - canvasEl.width / 2) * unitsPerPixel,
        TITLE_CENTER.y - (point.y - centerY) * unitsPerPixel,
        TITLE_CENTER.z + (random() - 0.5) * 0.5,
      );
      const across = clamp01((point.x - left) / textWidth);
      const base = colorA.clone().lerp(colorB, across).multiplyScalar(0.85 + random() * 0.3);
      gems.setColorAt(index, base);
      const sx = (random() - 0.5) * 84;
      const sz = -118 + random() * 44;
      const start = new THREE.Vector3(sx, heightAt(sx, sz) + 0.4, sz);
      const lock = ENDING_TIMELINE.assemble + point.letter * BEAT;
      const flight = 1.6 + random() * 0.6;
      const appear = ENDING_TIMELINE.lanterns + random() * 2.4;
      const launch = lock - flight;
      const risen = start.clone();
      risen.y += 1.1 * Math.max(0, launch - appear) + 0.6;
      risen.x += Math.sin(launch * 0.8 + index) * 0.6;
      const control = risen.clone().lerp(target, 0.5);
      control.y += 8 + random() * 6;
      control.x += (random() - 0.5) * 16;
      return {
        start, risen, control, target, base, across, appear, launch, lock,
        spin: new THREE.Euler(random() * 3, random() * 3, random() * 3),
        spinRate: 0.4 + random() * 0.8,
        phase: random() * Math.PI * 2,
      };
    });
    gems.instanceColor.needsUpdate = true;
    scene.add(gems);
    // A dark twin set just behind, like ink pressed into paper, keeps the name readable on a bright sky.
    gemShadow = new THREE.InstancedMesh(geometry, new THREE.MeshBasicMaterial({ color: 0x4a2410, transparent: true, opacity: 0, fog: false }), points.length);
    gemShadow.instanceMatrix = gems.instanceMatrix;
    gemShadow.position.set(0.22, -0.3, -0.7);
    gemShadow.frustumCulled = false;
    scene.add(gemShadow);
    scene.add(gemHalo);

    titleGlow = new THREE.Sprite(new THREE.SpriteMaterial(additive({ map: glowTexture, color: 0xfff0c8, opacity: 0 })));
    titleGlow.position.copy(TITLE_CENTER).add(tempVector.set(0, 0, -3));
    titleGlow.scale.set(TITLE_WIDTH * 1.7, TITLE_WIDTH * 0.75, 1);
    scene.add(titleGlow);
    letterCenters = TITLE_TEXT.split('').map((_, letter) => {
      const members = gemData.filter((gem, index) => points[index].letter === letter);
      const center = new THREE.Vector3();
      members.forEach((gem) => center.add(gem.target));
      return members.length ? center.divideScalar(members.length) : TITLE_CENTER.clone();
    });
    rebuildBursts();
  }

  let letterCenters = [];

  // ── Sparks: every burst is computed from its start time ──
  const SPECTRUM = [0xffd27a, 0x58dfcf, 0xf28cb1, 0xc9a0ff, 0xff9a52].map(color);
  const GOLD = [0xffe2a0, 0xffc864, 0xfff6e0].map(color);
  const CYAN = [0x9ff5ea, 0x58dfcf, 0xfff1c8].map(color);

  function makeBurst(t0, origin, count, speed, life, palette, gravity = 2.5, seed = 1) {
    const random = seededRandom(Math.floor(t0 * 1000) + seed * 7919);
    const dirs = new Float32Array(count * 4);
    const colors = new Float32Array(count * 3);
    for (let index = 0; index < count; index += 1) {
      const theta = random() * Math.PI * 2;
      const y = random() * 2 - 1;
      const r = Math.sqrt(1 - y * y);
      dirs.set([Math.cos(theta) * r, y, Math.sin(theta) * r, 0.45 + random() * 0.55], index * 4);
      const swatch = palette[Math.floor(random() * palette.length)];
      colors.set([swatch.r, swatch.g, swatch.b], index * 3);
    }
    return { t0, origin: origin.clone(), count, speed, life, gravity, dirs, colors };
  }

  function rebuildBursts() {
    bursts = [];
    const crystalPositions = [new THREE.Vector3(-WAND_X, CRYSTAL_Y, WAND_Z), new THREE.Vector3(WAND_X, CRYSTAL_Y, WAND_Z)];
    words.forEach((word, index) => {
      bursts.push(makeBurst(word.arrive, crystalPositions[word.side], 26, 2.4, 0.8, CYAN, 1.5, index + 2));
    });
    bursts.push(makeBurst(ENDING_TIMELINE.release, WAVE_ORIGIN.clone().setY(0.6), 180, 9, 1.7, GOLD, 4, 11));
    letterCenters.forEach((center, index) => {
      bursts.push(makeBurst(ENDING_TIMELINE.assemble + index * BEAT, center, 34, 4.5, 1.0, GOLD, 1.5, 20 + index));
    });
    const title = ENDING_TIMELINE.title;
    bursts.push(makeBurst(title, TITLE_CENTER, 360, 17, 2.6, SPECTRUM, 3, 40));
    bursts.push(makeBurst(title + 2 * BEAT, new THREE.Vector3(-17, 33, -114), 200, 11, 2.1, SPECTRUM, 3, 41));
    bursts.push(makeBurst(title + 4 * BEAT, new THREE.Vector3(17, 34, -114), 200, 11, 2.1, SPECTRUM, 3, 42));
    bursts.push(makeBurst(title + 6 * BEAT, new THREE.Vector3(0, 39, -116), 240, 12, 2.3, SPECTRUM, 3, 43));
  }

  function updateSparks(t) {
    let cursor = 0;
    const capacity = sparks.capacity;
    for (const burst of bursts) {
      const age = t - burst.t0;
      if (age < 0 || age > burst.life) continue;
      const fade = 1 - age / burst.life;
      const drag = 2.2;
      const travel = (1 - Math.exp(-drag * age)) / drag;
      for (let index = 0; index < burst.count && cursor < capacity; index += 1) {
        const d = index * 4;
        const speed = burst.speed * burst.dirs[d + 3];
        sparkPositions[cursor * 3] = burst.origin.x + burst.dirs[d] * speed * travel;
        sparkPositions[cursor * 3 + 1] = burst.origin.y + burst.dirs[d + 1] * speed * travel - 0.5 * burst.gravity * age * age;
        sparkPositions[cursor * 3 + 2] = burst.origin.z + burst.dirs[d + 2] * speed * travel;
        const twinkle = fade * fade * (0.75 + 0.25 * Math.sin(age * 30 + index));
        sparkColors[cursor * 3] = burst.colors[index * 3] * twinkle;
        sparkColors[cursor * 3 + 1] = burst.colors[index * 3 + 1] * twinkle;
        sparkColors[cursor * 3 + 2] = burst.colors[index * 3 + 2] * twinkle;
        cursor += 1;
      }
    }
    sparks.geometry.setDrawRange(0, cursor);
    if (cursor > 0) {
      sparks.geometry.attributes.position.needsUpdate = true;
      sparks.geometry.attributes.color.needsUpdate = true;
    }
    // Sparks far away need to be bigger to read.
    sparks.material.size = t > ENDING_TIMELINE.lanterns ? 1.5 : 0.5;
  }

  // ── Per-frame update ──
  function update(t, aspect) {
    const T = ENDING_TIMELINE;
    const dawn = dawnAmount(t);
    const radius = waveRadius(t);
    const sinceRelease = t - T.release;

    // Camera
    const shot = sampleCamera(t, cameraPosition, cameraLook);
    const shake = sinceRelease > 0 && sinceRelease < 1.4 ? Math.exp(-sinceRelease * 3.2) * 0.12 : 0;
    cameraPosition.x += Math.sin(t * 1.3) * 0.04 + Math.sin(t * 41) * shake;
    cameraPosition.y += Math.sin(t * 0.9 + 1) * 0.03 + Math.cos(t * 37) * shake;
    // On narrow screens a shot that must show a given width widens the lens,
    // and steps back only once the lens is as wide as it should go.
    let fov = shot.fov;
    if (shot.fit > 0) {
      tempVector.copy(cameraPosition).sub(cameraLook);
      const distance = tempVector.length();
      const neededFov = THREE.MathUtils.radToDeg(2 * Math.atan(shot.fit / (distance * aspect)));
      fov = Math.min(MAX_FOV, Math.max(fov, neededFov));
      const needed = shot.fit / (Math.tan(THREE.MathUtils.degToRad(fov / 2)) * aspect);
      if (needed > distance) cameraPosition.copy(cameraLook).addScaledVector(tempVector, needed / distance);
    }
    camera.position.copy(cameraPosition);
    camera.lookAt(cameraLook);
    if (camera.fov !== fov || camera.aspect !== aspect) {
      camera.fov = fov;
      camera.aspect = aspect;
      camera.updateProjectionMatrix();
    }

    // Sky, fog and light follow the dawn.
    const skyUniforms = sky.material.uniforms;
    const half = clamp01(dawn * 2);
    const late = clamp01(dawn * 2 - 1);
    skyUniforms.uTop.value.copy(NIGHT.skyTop).lerp(MIDDAWN.skyTop, half).lerp(DAWN.skyTop, late);
    skyUniforms.uHorizon.value.copy(NIGHT.skyHorizon).lerp(MIDDAWN.skyHorizon, half).lerp(DAWN.skyHorizon, late);
    skyUniforms.uBottom.value.copy(NIGHT.skyBottom).lerp(DAWN.skyBottom, dawn);
    sky.position.copy(camera.position);

    const sunRise = smooth(T.release + 3, T.title, t);
    sun.position.set(150, lerp(-40, 64, sunRise), -330);
    sunGlow.position.copy(sun.position);
    sunGlow.material.opacity = 0.55 * smooth(T.release + 2, T.release + 9, t);
    skyUniforms.uSunDir.value.copy(sun.position).normalize();
    skyUniforms.uSunGlow.value = dawn;

    scene.fog.color.copy(NIGHT.fog).lerp(DAWN.fog, dawn);
    scene.fog.near = lerp(30, 60, dawn);
    scene.fog.far = lerp(170, 330, dawn);
    hemiLight.color.copy(NIGHT.hemiSky).lerp(DAWN.hemiSky, dawn);
    hemiLight.groundColor.copy(NIGHT.hemiGround).lerp(DAWN.hemiGround, dawn);
    const releaseFlash = sinceRelease > 0 ? Math.exp(-sinceRelease * 2.5) * 0.9 : 0;
    hemiLight.intensity = lerp(NIGHT.hemi, DAWN.hemi, dawn) + releaseFlash;
    sunLight.color.copy(NIGHT.sun).lerp(DAWN.sun, dawn);
    sunLight.intensity = lerp(NIGHT.sunIntensity, DAWN.sunIntensity, dawn);
    sunLight.position.set(lerp(-30, 45, dawn), lerp(50, 22, dawn), lerp(20, -60, dawn));

    stars.material.opacity = clamp01(1 - dawn * 1.7);
    stars.visible = stars.material.opacity > 0.01;
    for (const moon of moons) {
      moon.group.position.y = moon.baseY - dawn * 140;
      const fade = clamp01(1 - dawn * 1.3);
      moon.materials.forEach((material) => { material.opacity = fade; });
      moon.group.visible = fade > 0.01;
    }
    clouds.material.color.setHex(0x3a2e70).lerp(tempColor.setHex(0xfff0e4), dawn);
    clouds.material.emissive.setHex(0x1a1238).lerp(tempColor.setHex(0x9a7468), dawn);
    for (const entry of clouds) entry.cloud.position.x = entry.baseX + t * entry.speed;

    // The wave
    terrainUniforms.uWaveRadius.value = radius;
    terrainUniforms.uFrontGlow.value = sinceRelease > 0 ? 0.75 * (1 - smooth(5, 10, sinceRelease)) : 0;
    const waveVisible = sinceRelease > 0 && sinceRelease < 10;
    waveRing.visible = waveVisible;
    waveWall.visible = waveVisible;
    if (waveVisible) {
      const fade = 1 - smooth(4, 10, sinceRelease);
      waveRing.scale.setScalar(Math.max(0.01, radius));
      waveRing.material.opacity = 0.9 * fade;
      waveWall.scale.set(Math.max(0.01, radius), 2.5 + sinceRelease * 1.6, Math.max(0.01, radius));
      waveWall.position.y = waveWall.scale.y / 2;
      // The curtain rises once the flash has cleared, so it never fills the frame as a solid column.
      waveWall.material.uniforms.uOpacity.value = 0.4 * fade * smooth(0.5, 1.4, sinceRelease);
    }

    // Spring arrives behind the front.
    for (const tree of trees) {
      const grow = easeOutBack((t - tree.pass) / 0.75);
      tree.group.visible = t > tree.pass;
      tree.group.scale.setScalar(Math.max(0.0001, grow * tree.size));
    }
    for (const spike of spikes) {
      const gone = clamp01((t - spike.pass) / 0.22);
      const pulse = 1 + Math.sin(t * 2 + spike.phase) * 0.04;
      spike.group.visible = gone < 1;
      spike.group.scale.setScalar(Math.max(0.0001, (1 - gone * gone) * pulse * (1 + gone * 0.4)));
    }
    spikes.material.emissiveIntensity = 0.9 + Math.sin(t * 1.7) * 0.15;
    // Flowers only move while the wave is passing, or after a jump in time.
    if (flowers.dirty || (sinceRelease > 0 && sinceRelease < 14)) {
      flowerData.forEach((flower, index) => {
        const s = easeOutBack((t - flower.pass) / 0.45) * flower.size;
        tempScale.setScalar(Math.max(0, s));
        tempQuaternion.identity();
        tempMatrix.compose(flower.position, tempQuaternion, tempScale);
        flowers.setMatrixAt(index, tempMatrix);
      });
      flowers.instanceMatrix.needsUpdate = true;
      flowers.dirty = false;
    }

    // The wands charge as words arrive, then fire.
    let arrived = 0;
    let arrivalPulse = 0;
    for (const word of words) {
      if (t >= word.arrive) {
        arrived += 1;
        arrivalPulse = Math.max(arrivalPulse, Math.exp(-(t - word.arrive) * 6));
      }
    }
    const charge = words.length ? arrived / words.length : smooth(T.gather + 0.6, T.release - 0.6, t);
    const fired = sinceRelease > 0;
    const chargeLevel = fired ? Math.exp(-sinceRelease * 1.2) * charge : charge;
    crystalMaterial.emissiveIntensity = 1.2 + chargeLevel * 2.2 + arrivalPulse * 1.5;
    wandCrystals.forEach((crystal, index) => {
      crystal.rotation.y = t * (0.6 + chargeLevel * 4) + index;
      crystal.position.y = CRYSTAL_Y + Math.sin(t * 2 + index) * 0.03;
      crystal.scale.setScalar(1 + chargeLevel * 0.35 + arrivalPulse * 0.15);
    });
    crystalGlows.forEach((glow) => {
      const size = 0.9 + chargeLevel * 2.2 + arrivalPulse * 0.8;
      glow.scale.set(size, size, 1);
      glow.material.opacity = 0.55 + chargeLevel * 0.35;
    });
    const beamOn = clamp01((t - (T.release - 0.32)) / 0.12) * (1 - clamp01((t - (T.release + 0.15)) / 0.4));
    beams.forEach((beam, index) => {
      beam.visible = beamOn > 0.01;
      beam.material.opacity = beamOn * (0.75 + Math.sin(t * 90 + index) * 0.25);
    });

    // Word tags
    for (const word of words) {
      const { sprite, gem, home } = word;
      if (t >= word.arrive) {
        sprite.visible = false;
        gem.visible = false;
        continue;
      }
      sprite.visible = true;
      gem.visible = true;
      const bob = Math.sin(t * 0.9 + word.phase) * 0.12;
      const appear = smooth(0.2 + word.phase * 0.12, 1.4 + word.phase * 0.12, t);
      let scale = appear;
      if (t < word.depart) {
        tempVector.set(home.x, home.y + bob, home.z);
      } else {
        const u = easeInOutCubic((t - word.depart) / (word.arrive - word.depart));
        const target = tempVectorTwo.set(word.side === 0 ? -WAND_X : WAND_X, CRYSTAL_Y, WAND_Z);
        const start = tempVector.set(home.x, home.y + Math.sin(word.depart * 0.9 + word.phase) * 0.12, home.z);
        const midX = lerp(start.x, target.x, 0.5) + (word.side === 0 ? 1.4 : -1.4);
        const midY = Math.max(start.y, target.y) + 1.3;
        const midZ = lerp(start.z, target.z, 0.5);
        const a = (1 - u) * (1 - u);
        const b = 2 * (1 - u) * u;
        const c = u * u;
        tempVector.set(
          a * start.x + b * midX + c * target.x,
          a * start.y + b * midY + c * target.y,
          a * start.z + b * midZ + c * target.z,
        );
        scale = lerp(1, 0.15, u * u);
      }
      sprite.position.copy(tempVector);
      sprite.scale.set(word.tagHeight * word.aspect * scale, word.tagHeight * scale, 1);
      sprite.material.opacity = scale;
      gem.position.copy(tempVector).add(tempVectorTwo.set(0, -0.42 * scale, 0));
      gem.rotation.set(t * 0.7, t * 1.1 + word.phase, 0);
      gem.scale.setScalar(Math.max(0.0001, scale));
      gem.material.color.setHex(t > word.depart ? 0xffe2a0 : 0xd9a0ff);
    }

    // Motes
    const motePositions = motes.geometry.attributes.position.array;
    for (let index = 0; index < moteData.length / 4; index += 1) {
      const d = index * 4;
      const phase = moteData[d + 3];
      motePositions[index * 3] = moteData[d] + Math.sin(t * 0.3 + phase) * 0.8;
      motePositions[index * 3 + 1] = moteData[d + 1] + Math.sin(t * 0.5 + phase * 2) * 0.4 + dawn * (t - T.release) * 0.15;
      motePositions[index * 3 + 2] = moteData[d + 2] + Math.cos(t * 0.27 + phase) * 0.8;
    }
    motes.geometry.attributes.position.needsUpdate = true;
    motes.material.color.setHex(0xc89cff).lerp(tempColor.setHex(0xffd27a), dawn);
    motes.material.opacity = 0.8 * (1 - smooth(T.release + 6, T.release + 10, t));
    motes.visible = motes.material.opacity > 0.01;

    // Birds cross the sunrise.
    const flockU = (t - 15.5) / 13;
    const flockVisible = flockU > 0 && flockU < 1;
    birds.forEach((entry) => {
      entry.bird.visible = flockVisible;
      if (!flockVisible) return;
      entry.bird.position.set(lerp(-95, 95, flockU), 30 + Math.sin(flockU * 4) * 2, -150).add(entry.offset);
      const flap = Math.sin(t * 9 + entry.phase) * 0.7;
      entry.left.rotation.z = flap;
      entry.right.rotation.z = -flap;
      entry.bird.scale.setScalar(2.2);
    });

    updateGems(t);
    updateSparks(t);
  }

  function updateGems(t) {
    if (!gems) return;
    const T = ENDING_TIMELINE;
    const haloPositions = gemHalo.geometry.attributes.position.array;
    const haloColors = gemHalo.geometry.attributes.color.array;
    const sweep = (t - T.title) / 1.6;
    const sweepTwo = (t - (T.title + 8 * BEAT)) / 1.8;
    const sweeping = (sweep > -0.1 && sweep < 1.3) || (sweepTwo > -0.1 && sweepTwo < 1.3);
    const anyVisible = t > T.lanterns;
    gems.visible = anyVisible;
    gemHalo.visible = anyVisible;
    gemShadow.material.opacity = 0.8 * smooth(T.assemble, T.title + 0.5, t);
    gemShadow.visible = anyVisible && gemShadow.material.opacity > 0.01;
    if (!anyVisible) {
      titleGlow.material.opacity = 0;
      return;
    }
    gemData.forEach((gem, index) => {
      let scale = 0;
      let halo = 0;
      if (t < gem.appear) {
        tempVector.copy(gem.start);
      } else if (t < gem.launch) {
        const age = t - gem.appear;
        tempVector.copy(gem.start);
        tempVector.y += 1.1 * age + 0.6 * smooth(0, 0.8, age);
        tempVector.x += Math.sin(t * 0.8 + index) * 0.6 * smooth(0, 1.5, age);
        scale = 0.75 * smooth(0, 0.6, age);
        halo = 1;
      } else if (t < gem.lock) {
        const u = easeInOutCubic((t - gem.launch) / (gem.lock - gem.launch));
        const a = (1 - u) * (1 - u);
        const b = 2 * (1 - u) * u;
        const c = u * u;
        tempVector.set(
          a * gem.risen.x + b * gem.control.x + c * gem.target.x,
          a * gem.risen.y + b * gem.control.y + c * gem.target.y,
          a * gem.risen.z + b * gem.control.z + c * gem.target.z,
        );
        scale = lerp(0.75, 1, u);
        halo = 1;
      } else {
        const age = t - gem.lock;
        tempVector.copy(gem.target);
        tempVector.y += Math.sin(t * 1.2 + gem.across * 6) * 0.05;
        scale = 1 + 0.6 * Math.exp(-age * 7);
        halo = 0.12 + 0.88 * Math.exp(-age * 2.4);
      }
      tempEuler.set(gem.spin.x + t * gem.spinRate, gem.spin.y + t * gem.spinRate * 1.3, gem.spin.z);
      tempQuaternion.setFromEuler(tempEuler);
      tempScale.set(scale, scale * 1.25, scale);
      tempMatrix.compose(tempVector, tempQuaternion, tempScale);
      gems.setMatrixAt(index, tempMatrix);
      haloPositions[index * 3] = tempVector.x;
      haloPositions[index * 3 + 1] = tempVector.y;
      haloPositions[index * 3 + 2] = tempVector.z;
      const glow = halo * (scale > 0 ? 0.55 : 0);
      haloColors[index * 3] = 1.0 * glow;
      haloColors[index * 3 + 1] = 0.66 * glow;
      haloColors[index * 3 + 2] = 0.3 * glow;
      if (sweeping || gems.needsColorReset) {
        let boost = 1;
        if (sweep > -0.1 && sweep < 1.3) boost += 1.3 * Math.exp(-Math.pow(gem.across - sweep, 2) / 0.006);
        if (sweepTwo > -0.1 && sweepTwo < 1.3) boost += 1.0 * Math.exp(-Math.pow(gem.across - sweepTwo, 2) / 0.006);
        gems.setColorAt(index, tempColor.copy(gem.base).multiplyScalar(boost));
      }
    });
    gems.instanceMatrix.needsUpdate = true;
    if (sweeping || gems.needsColorReset) {
      gems.instanceColor.needsUpdate = true;
      gems.needsColorReset = sweeping;
    }
    gemHalo.geometry.attributes.position.needsUpdate = true;
    gemHalo.geometry.attributes.color.needsUpdate = true;
    const settled = smooth(T.title - 0.5, T.title + 1.5, t);
    gems.material.emissiveIntensity = lerp(1.1, 0.42, settled) + 0.8 * Math.exp(-Math.max(0, t - T.title) * 2.5) * (t > T.title ? 1 : 0);
    titleGlow.material.opacity = 0.12 * smooth(T.assemble, T.title, t) + 0.45 * (t > T.title ? Math.exp(-(t - T.title) * 1.6) : 0);
  }

  function updateCaption(t) {
    if (!captionEl) return;
    const index = CAPTIONS.findIndex((caption) => t >= caption.from && t < caption.to);
    if (index === currentCaption) return;
    currentCaption = index;
    if (index === -1) {
      captionEl.classList.remove('is-visible');
    } else {
      captionEl.textContent = CAPTIONS[index].text;
      captionEl.classList.add('is-visible');
    }
  }

  function triggerFlash() {
    if (!flashEl) return;
    flashEl.classList.remove('is-on');
    void flashEl.offsetWidth;
    flashEl.classList.add('is-on');
  }

  // ── Loop ──
  function resize() {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (w === 0 || h === 0) return false;
    if (w !== width || h !== height) {
      width = w;
      height = h;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, world.lite ? 1 : 1.5));
      renderer.setSize(w, h, false);
    }
    return true;
  }

  function clockTime(stamp) {
    let raw;
    if (getAudioTime && audioStart !== null) {
      const now = getAudioTime();
      raw = now === null ? ownClock : Math.max(0, now - audioStart);
    } else {
      const dt = lastStamp ? Math.min(0.1, (stamp - lastStamp) / 1000) : 0;
      ownClock += dt;
      raw = ownClock;
    }
    lastStamp = stamp;
    return raw + timeOffset;
  }

  function frame(stamp) {
    rafId = requestAnimationFrame(frame);
    if (!playing) return;
    const t = clockTime(stamp);
    // Behind the results card the scene only drifts, so it drops to about 10 frames a second.
    const minGap = t > ENDING_TIMELINE.end + 3.5 ? 100 : 1000 / 60 - 3;
    if (lastRender && stamp - lastRender < minGap) return;
    lastRender = stamp;
    if (!resize()) return;

    if (lastT >= 0 && lastT < ENDING_TIMELINE.release && t >= ENDING_TIMELINE.release && t - lastT < 1) triggerFlash();
    lastT = t;
    update(t, width / height);
    updateCaption(t);
    renderer.render(scene, camera);

    if (!completed && t >= ENDING_TIMELINE.end) {
      completed = true;
      if (onComplete) onComplete();
    }
  }

  function play(options = {}) {
    const lite = Boolean(options.batterySaver);
    if (!world.built) buildWorld(lite);
    arrivals = options.arrivals && options.arrivals.length === (options.terms || []).length
      ? options.arrivals
      : wordArrivalTimes((options.terms || []).length);
    buildTags(options.terms || []);
    rebuildBursts();
    prepareTitle(world.lite);

    onComplete = options.onComplete || null;
    getAudioTime = options.getAudioTime || null;
    audioStart = Number.isFinite(options.audioStart) ? options.audioStart : null;
    ownClock = 0;
    lastStamp = 0;
    lastRender = 0;
    timeOffset = 0;
    lastT = -1;
    completed = false;
    currentCaption = -2;
    width = 0;
    height = 0;
    if (gems) gems.needsColorReset = true;
    flowers.dirty = true;
    playing = true;
    if (!rafId) rafId = requestAnimationFrame(frame);
  }

  // Moves the clock to any moment; used by Skip and handy when tuning a shot.
  function seek(time) {
    if (!playing) return;
    const raw = clockTime(performance.now()) - timeOffset;
    timeOffset = time - raw;
    lastT = time;
    if (gems) gems.needsColorReset = true;
    flowers.dirty = true;
  }

  // Jump to the closing shot; the scene keeps drifting behind the results card.
  function skipToEnd() {
    if (!playing) return;
    completed = true;
    seek(ENDING_TIMELINE.end + 0.6);
    if (captionEl) captionEl.classList.remove('is-visible');
  }

  function stop() {
    playing = false;
    if (rafId) cancelAnimationFrame(rafId);
    rafId = null;
    onComplete = null;
    if (captionEl) captionEl.classList.remove('is-visible');
    if (flashEl) flashEl.classList.remove('is-on');
  }

  return { available: true, play, seek, skipToEnd, stop };
}
