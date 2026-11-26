// The ending cinematic: a 42-second low-poly short rendered with Three.js.
//
// Story: the Stellar Dreadnought breaks apart and its myth rises into the night
// sky; the words the player defeated fly into the arcane cannon's crystal core;
// the cannon fires one beam that breaks the last myth; a wave of light crosses
// the five lands, freeing each storyteller in turn; dawn comes, the five gather
// on a hill and the game's name appears over them.
//
// Everything on screen is a pure function of the cinematic's clock, so Skip only
// moves the clock. The music in audio.js is scored to the same timeline.
import * as THREE from 'three';
import { createLowPolyTree, createLowPolyCloud, createLowPolyRock } from './lowpoly.js';
import { buildStellarDreadnought } from './lowpoly-creatures.js';
import { createStoryteller } from './storyteller.js?v=beta26';
import { STORY_BEATS } from './story.js?v=beta26';
import { SEASON_PALETTES, FINAL_WAVE_PALETTE, MINE_PALETTE, GROUND_TONE } from './chapters.js?v=beta26';
import { buildCannon } from './arcane-cannon.js?v=beta26';
import { radialTexture, rgbaTexture } from '../../../assets/three-textures.js';

const BEAT = 60 / 144;
const BAR = 4 * BEAT;

// Cue times in seconds. The score (audio.js) uses the same bar grid: 144 bpm, 4/4.
export const ENDING_TIMELINE = {
  beat: BEAT,
  bar: BAR,
  shatter: BAR, // the Dreadnought breaks apart
  charge: 2 * BAR, // the cannon comes up and the words gather
  spinUp: 6 * BAR, // the barrels wind up
  fire: 7 * BAR, // the beam
  burst: 7 * BAR + 2 * BEAT, // the last myth breaks
  lands: 8 * BAR, // the first of the five lands
  landLength: 2 * BAR,
  dawn: 18 * BAR, // the five gather at sunrise
  title: 22 * BAR, // the game's name
  end: 25 * BAR, // the summary
};

const T = ENDING_TIMELINE;
const LAND_COUNT = 5;
const TITLE_TEXT = 'Spellwave';
// The game's heading face (Fredoka), as in the menu title and banners.
const GAME_FONT_FAMILY = 'Fredoka, Manrope, system-ui, sans-serif';

const landStart = (index) => T.lands + index * T.landLength;

// Each land's caption states the truth that broke its myth.
const LAND_TRUTHS = [
  'Heavy and light fall together.',
  'Nothing runs for free.',
  'Heat flows from hot to cold.',
  'Ice floats.',
  'The stars rule no one.',
];

const CAPTIONS = [
  { from: 0.35, to: T.charge - 0.35, text: 'The Dreadnought falls.' },
  { from: T.charge + 0.3, to: T.charge + 3.1, text: 'One myth still darkens the sky.' },
  { from: T.charge + 3.5, to: T.spinUp + 0.4, text: 'Every word you won charges the cannon.' },
  ...LAND_TRUTHS.map((text, index) => ({ from: landStart(index) + 0.45, to: landStart(index) + T.landLength - 0.2, text })),
  { from: T.dawn + 0.7, to: T.title - 0.6, text: 'Dawn. The land is free.' },
];

// Words land in the core on a steady offbeat pulse between bar 3 and the wind-up.
export function wordArrivalTimes(count) {
  if (count <= 0) return [];
  const eighth = BEAT / 2;
  const first = 3 * BAR;
  const last = T.spinUp + 2 * BEAT;
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
const easeInOutCubic = (t) => {
  const x = clamp01(t);
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
};
const easeOutCubic = (t) => 1 - Math.pow(1 - clamp01(t), 3);
const easeOutBack = (t) => {
  const x = clamp01(t);
  const c1 = 1.9;
  return 1 + (c1 + 1) * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
};

function hash(a, b = 0, c = 0) {
  const value = Math.sin(a * 127.1 + b * 311.7 + c * 74.7) * 43758.5453;
  return value - Math.floor(value);
}

// The wave of light crosses each land from left to right.
const WALL_START = 0.45;
const WALL_FROM = -18;
const WALL_SPEED = 30;
const WALL_CENTRE = -70;
const wallX = (u) => WALL_FROM + (u - WALL_START) * WALL_SPEED;
// Seconds since the wave passed x, at u seconds into a land's shot (negative before).
const freedFor = (x, u) => u - (WALL_START + (x - WALL_FROM) / WALL_SPEED);

// Where the last myth hangs once it has risen out of the Dreadnought.
const HEART = new THREE.Vector3(0, 30, -70);
const HEART_BIRTH = new THREE.Vector3(0, 4.2, -5);
const GUN_DEPTH = 1.55;

// ── Camera ───────────────────────────────────────────────────────────────────
// [time, position, look-at, vertical field of view]
const SKY_KEYS = [
  [0, [2.6, 1.5, 9.0], [0.2, 3.6, -5], 50],
  [T.shatter, [1.8, 1.6, 9.6], [0, 3.6, -5.5], 50],
  [T.charge, [0, 1.8, 10], [0, 17, -60], 50],
  [T.spinUp, [0, 1.8, 10], [0, 18, -60], 50],
  [T.fire, [0, 1.8, 10.3], [0, 19, -60], 46],
  [T.lands, [0, 1.8, 10.3], [0, 20, -60], 46],
];
const DAWN_KEYS = [
  [T.dawn, [0.7, 1.9, 8.6], [0, 1.35, 0], 40],
  [T.title, [0, 2.6, 11.5], [0, 3.0, 0], 40],
  [T.end, [0, 2.8, 12.2], [0, 3.2, 0], 40],
];
// Each land: where the camera starts and ends, and what it looks at.
const LAND_CAMERAS = [
  { from: [-1.8, 1.6, 6.8], to: [-1.0, 1.7, 6.0], look: [0.8, 1.35, 0] },
  { from: [-2.0, 1.9, 6.8], to: [-1.3, 1.8, 6.1], look: [1.5, 1.4, -0.6] },
  { from: [1.6, 1.5, 6.2], to: [1.0, 1.6, 5.6], look: [-0.5, 1.3, 0] },
  { from: [-2.0, 2.2, 6.8], to: [-1.4, 2.0, 6.0], look: [0.9, 1.1, -0.5] },
  { from: [1.4, 1.3, 6.8], to: [0.8, 1.5, 6.2], look: [-0.3, 1.65, -0.5] },
];
const LAND_FOV = 42;
const MAX_FOV = 84;

function sampleKeys(keys, t, outPosition, outLook) {
  const last = keys.length - 1;
  let index = 0;
  while (index < last - 1 && t >= keys[index + 1][0]) index += 1;
  const a = keys[index];
  const b = keys[index + 1];
  const u = smooth(a[0], b[0], t);
  outPosition.set(lerp(a[1][0], b[1][0], u), lerp(a[1][1], b[1][1], u), lerp(a[1][2], b[1][2], u));
  outLook.set(lerp(a[2][0], b[2][0], u), lerp(a[2][1], b[2][1], u), lerp(a[2][2], b[2][2], u));
  return lerp(a[3], b[3], u);
}

// ── Looks: the sky, fog and light of a shot ──────────────────────────────────

const color = (hex) => new THREE.Color(hex);

function lookFromPalette(palette) {
  return {
    top: color(palette.skyTop), horizon: color(palette.bgColor), bottom: color(palette.fogColor),
    fog: color(palette.fogColor), fogNear: palette.fogNear, fogFar: palette.fogFar,
    hemiSky: color(palette.hemiSky), hemiGround: color(palette.hemiGround), hemi: palette.hemiIntensity,
    sun: color(palette.sunColor), sunIntensity: palette.sunIntensity, stars: palette.starOpacity,
  };
}

const NIGHT_LOOK = lookFromPalette(FINAL_WAVE_PALETTE);
const HALF_DAWN_LOOK = {
  ...NIGHT_LOOK,
  top: color(0x2b2f6e), horizon: color(0xd46a8a), bottom: color(0x8a5a8a), fog: color(0x6a4a7e),
  fogNear: 50, fogFar: 200, hemi: 0.95, sunIntensity: 1.5, stars: 0.4,
};
const DAWN_LOOK = {
  top: color(0x4f86c6), horizon: color(0xffc58f), bottom: color(0xf3d2a8),
  fog: color(0xf0d2b0), fogNear: 60, fogFar: 300,
  hemiSky: color(0xfff0d8), hemiGround: color(0x8a7a48), hemi: 1.05,
  sun: color(0xffd8a6), sunIntensity: 1.9, stars: 0,
};
// What a land looks like while the myth still holds it.
const GLOOM = color(0x241a48);

function blendLooks(a, b, amount, out) {
  for (const key of ['top', 'horizon', 'bottom', 'fog', 'hemiSky', 'hemiGround', 'sun']) out[key].copy(a[key]).lerp(b[key], amount);
  for (const key of ['fogNear', 'fogFar', 'hemi', 'sunIntensity', 'stars']) out[key] = lerp(a[key], b[key], amount);
  return out;
}

function additive(options = {}) {
  return { transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, ...options };
}

function waitForFont(spec, timeout = 2500) {
  if (!document.fonts || !document.fonts.load) return Promise.resolve();
  return Promise.race([
    document.fonts.load(spec).catch(() => {}),
    new Promise((resolve) => window.setTimeout(resolve, timeout)),
  ]);
}

function roundedRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x, y, width, height, radius);
  else ctx.rect(x, y, width, height);
}

// ── The cinematic ────────────────────────────────────────────────────────────

export function createEndingCinematic(canvas, { flashEl = null, captionEl = null } = {}) {
  let renderer = null;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
  } catch (error) {
    console.warn('Spellwave could not start the ending cinematic.', error);
  }
  if (!renderer) {
    return {
      available: false,
      play({ onComplete } = {}) { if (onComplete) onComplete(); },
      seek() {},
      skipToEnd() {},
      stop() {},
      dispose() {},
    };
  }

  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const EXPOSURE = 1.05;

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x1c1244, 40, 112);
  const camera = new THREE.PerspectiveCamera(46, 16 / 9, 0.1, 1400);
  scene.add(camera);
  const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 1);
  const sunLight = new THREE.DirectionalLight(0xffffff, 1);
  sunLight.position.set(-0.5, 1, 0.7);
  scene.add(hemiLight, sunLight);

  const glowTexture = radialTexture(THREE, 128, [[0, 1], [0.22, 0.75], [0.5, 0.18], [1, 0]]);
  // The wave of light: a low ridge, bright at the ground and fading with height.
  const wallTexture = rgbaTexture(THREE, 4, 64, (x, y) => [255, 255, 255, Math.round(255 * Math.pow(1 - y / 64, 2))]);
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
  // The cannon's core in the camera's frame: where the words fly to.
  const coreHome = new THREE.Vector3();
  const look = blendLooks(NIGHT_LOOK, NIGHT_LOOK, 0, lookFromPalette(FINAL_WAVE_PALETTE));

  // ── Materials and small builders ──
  const materialCache = new Map();
  const cached = (key, make) => {
    if (!materialCache.has(key)) materialCache.set(key, make());
    return materialCache.get(key);
  };
  const flat = (hex, extra = {}) => cached(`flat-${hex}-${JSON.stringify(extra)}`, () => new THREE.MeshStandardMaterial({
    color: hex, roughness: 0.9, metalness: 0, flatShading: true, ...extra,
  }));
  const glowing = (hex, intensity = 1.4, extra = {}) => new THREE.MeshStandardMaterial({
    color: hex, emissive: hex, emissiveIntensity: intensity, roughness: 0.5, flatShading: true, ...extra,
  });
  const groundMaterial = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 1, metalness: 0 });

  const add = (parent, geometry, material, x = 0, y = 0, z = 0) => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    parent.add(mesh);
    return mesh;
  };
  const glowSprite = (parent, hex, scale = 1) => {
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial(additive({ map: glowTexture, color: hex })));
    sprite.scale.setScalar(scale);
    parent.add(sprite);
    return sprite;
  };
  const newSet = () => {
    const group = new THREE.Group();
    group.visible = false;
    scene.add(group);
    return group;
  };

  // A square of jittered, flat-shaded triangles, each with its own tone. `keep` trims it to a shape.
  function facetedGround({ size, cells, heightAt = () => 0, tint, keep = null }) {
    const grid = new THREE.PlaneGeometry(size, size, cells, cells);
    grid.rotateX(-Math.PI / 2);
    const cell = size / cells;
    const positions = grid.attributes.position;
    for (let index = 0; index < positions.count; index += 1) {
      const edge = Math.abs(positions.getX(index)) > size / 2 - 0.01 || Math.abs(positions.getZ(index)) > size / 2 - 0.01;
      const x = positions.getX(index) + (edge ? 0 : (hash(index, 1) - 0.5) * cell * 0.6);
      const z = positions.getZ(index) + (edge ? 0 : (hash(index, 2) - 0.5) * cell * 0.6);
      positions.setXYZ(index, x, heightAt(x, z), z);
    }
    const loose = grid.toNonIndexed();
    grid.dispose();
    const corners = loose.attributes.position.array;
    const kept = [];
    const colors = [];
    for (let face = 0; face < corners.length / 9; face += 1) {
      const at = face * 9;
      const x = (corners[at] + corners[at + 3] + corners[at + 6]) / 3;
      const z = (corners[at + 2] + corners[at + 5] + corners[at + 8]) / 3;
      if (keep && !keep(x, z)) continue;
      tint(x, z, hash(face, 5), tempColor);
      for (let corner = 0; corner < 3; corner += 1) {
        kept.push(corners[at + corner * 3], corners[at + corner * 3 + 1], corners[at + corner * 3 + 2]);
        colors.push(tempColor.r, tempColor.g, tempColor.b);
      }
    }
    loose.dispose();
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(kept, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.computeVertexNormals();
    return new THREE.Mesh(geometry, groundMaterial);
  }

  // A chapter's grass, with the odd patch of its second ground colour.
  const paletteTint = (palette) => (x, z, seed, out) => {
    const { groundGrass: grass, groundAlt1: patch } = palette;
    if (seed > 0.84) out.setHSL(patch.h, patch.s, patch.l);
    else out.setHSL(grass.h, grass.s, grass.l + (seed - 0.5) * 0.09);
    return out.multiplyScalar(GROUND_TONE);
  };
  const rolling = (flatRadius) => (x, z) => smooth(flatRadius, flatRadius + 22, Math.hypot(x, z))
    * (Math.sin(x * 0.21 + z * 0.13) * 0.6 + Math.sin(x * 0.07 - z * 0.19) * 1.0 + 0.9);

  function addHills(parent, hex, { radius = 54, count = 16, height = 15, base = -1 } = {}) {
    const material = flat(hex);
    for (let index = 0; index < count; index += 1) {
      const angle = (index / count) * Math.PI * 2 + hash(index, 11) * 0.3;
      const reach = radius + hash(index, 12) * 14;
      const tall = height * (0.6 + hash(index, 13) * 0.8);
      const hill = add(parent, new THREE.ConeGeometry(tall * 1.5, tall, 5), material, Math.cos(angle) * reach, base + tall / 2, Math.sin(angle) * reach);
      hill.rotation.y = hash(index, 14) * 3;
    }
  }

  function addTrees(parent, palette, spots, heightAt = () => 0) {
    const trunkMaterial = flat(palette.trunkColor);
    const leafMaterials = palette.leafColors.map((hex) => flat(hex));
    spots.forEach(([x, z, size, kind], index) => {
      const { group } = createLowPolyTree({ kind, trunkMaterial, leafMaterials, seed: index * 7 + x });
      group.position.set(x, heightAt(x, z), z);
      group.scale.setScalar(size);
      group.rotation.y = hash(index, x) * 6;
      group.traverse((child) => { child.castShadow = false; child.receiveShadow = false; });
      parent.add(group);
    });
  }

  function addStoryteller(parent, index, x = 0, y = 0, z = 0) {
    const npc = createStoryteller(STORY_BEATS[index]);
    npc.position.set(x, y, z);
    npc.userData.baseY = y;
    npc.traverse((child) => { child.castShadow = false; });
    parent.add(npc);
    return npc;
  }

  // Held: head bowed. Free: a hop, a look up and a wave.
  function poseStoryteller(npc, free, t, phase = 0) {
    const { head, arms } = npc.userData.parts;
    const rise = smooth(0, 0.35, free);
    const hop = free > 0 ? Math.abs(Math.sin(free * 7)) * 0.24 * Math.exp(-free * 0.8) : 0;
    npc.position.y = npc.userData.baseY + hop;
    head.rotation.x = lerp(0.32, -0.12, rise);
    head.rotation.z = Math.sin(t * 3 + phase) * 0.08 * rise;
    arms[1].rotation.z = rise * (2.55 + Math.sin(t * 11 + phase) * 0.38);
    arms[0].rotation.z = -rise * (0.5 + Math.sin(t * 5.5 + phase) * 0.12);
  }

  // ── The world, built once ──
  let sky;
  let stars;
  let moon;
  let backdrop;
  let arena;
  let dreadnought;
  let blasts = [];
  let bigBlast;
  let shards;
  let shardData = [];
  let heart;
  let heartCage;
  let heartCore;
  let heartGlow;
  let heartShards;
  let heartShardData = [];
  let burstRing;
  let whiteout;
  let gunMount;
  let gun;
  let gunMaterials;
  let crystalMaterial;
  let coreGlow;
  let beam;
  let beamHalo;
  let lands = [];
  let wall;
  let wallFoot;
  let sparkles;
  let sparkleData = [];
  let dawnSet;
  let gathering = [];
  let sunDisc;
  let sunGlow;
  let clouds = [];
  let title;
  let titleGlow;
  let titleAspect = 3.4;

  function buildWorld(lite) {
    world.built = true;
    world.lite = lite;
    buildSky(lite);
    buildArena();
    buildCannonRig();
    lands = [buildMeadow(lite), buildRiverWood(lite), buildMine(), buildFrozenLake(lite), buildSkyIsland()];
    buildWave(lite);
    buildDawn(lite);
    buildTitle();
  }

  function buildSky(lite) {
    sky = add(scene, new THREE.SphereGeometry(500, 20, 12), new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false }));
    sky.geometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(sky.geometry.attributes.position.count * 3), 3));
    sky.renderOrder = -2;

    const count = lite ? 350 : 900;
    const positions = new Float32Array(count * 3);
    for (let index = 0; index < count; index += 1) {
      const angle = hash(index, 21) * Math.PI * 2;
      const lift = 0.04 + hash(index, 22) * 0.96;
      const ring = Math.sqrt(1 - lift * lift);
      positions.set([Math.cos(angle) * ring * 440, lift * 440, Math.sin(angle) * ring * 440], index * 3);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    stars = new THREE.Points(geometry, new THREE.PointsMaterial({ color: 0xf3e8ff, size: 2.2, sizeAttenuation: false, transparent: true, depthWrite: false, fog: false }));
    stars.renderOrder = -1;
    scene.add(stars);

    moon = add(scene, new THREE.CircleGeometry(15, 20), new THREE.MeshBasicMaterial({ color: 0xf3e8ff, fog: false, transparent: true }), -150, 170, -330);
    moon.lookAt(0, 0, 0);

    // Floating islands, far enough out and high enough up to sit behind both night sets.
    backdrop = newSet();
    const stone = flat(0x4a3f80, { emissive: 0x2a2060, emissiveIntensity: 0.6 });
    const turf = flat(0x5c4aa6, { emissive: 0x362a6c, emissiveIntensity: 0.6 });
    const crystal = glowing(0xe040fb, 1.3);
    const islandCount = lite ? 8 : 14;
    for (let index = 0; index < islandCount; index += 1) {
      const angle = -Math.PI / 2 + (hash(index, 31) - 0.5) * Math.PI * 1.5;
      const reach = 48 + hash(index, 32) * 95;
      const radius = 4 + hash(index, 33) * 7;
      const island = new THREE.Group();
      island.position.set(Math.cos(angle) * reach, 9 + hash(index, 34) * 32, Math.sin(angle) * reach);
      island.rotation.y = hash(index, 35) * 6;
      add(island, new THREE.CylinderGeometry(radius, radius * 0.18, radius * 1.5, 7), stone, 0, -radius * 0.75, 0);
      add(island, new THREE.CylinderGeometry(radius * 1.02, radius * 0.96, 0.5, 7), turf, 0, 0.1, 0);
      if (index % 2 === 0) {
        const shard = add(island, new THREE.OctahedronGeometry(radius * 0.22, 0), crystal, radius * 0.35, radius * 0.3, 0);
        shard.scale.y = 2.2;
      }
      backdrop.add(island);
    }
  }

  // The last boss's arena: one wide island, the Dreadnought and the myth inside it.
  function buildArena() {
    arena = newSet();
    add(arena, new THREE.CylinderGeometry(17, 3, 12, 9), flat(0x332a5a), 0, -6.05, 0);
    const top = facetedGround({
      size: 36, cells: 12,
      tint: (x, z, seed, out) => out.setHSL(0.72, 0.24, 0.3 + (seed - 0.5) * 0.08),
      keep: (x, z) => Math.hypot(x, z) < 16.6,
    });
    top.position.y = 0;
    arena.add(top);
    const crystal = glowing(0xe040fb, 1.3);
    [[-9, -9, 1.5], [10, -7, 1.1], [-12, 2, 0.9], [12.5, 3, 1.3], [-5, -13, 1.0], [6, -13.5, 1.4]].forEach(([x, z, size]) => {
      const shard = add(arena, new THREE.OctahedronGeometry(0.5 * size, 0), crystal, x, 0.7 * size, z);
      shard.scale.y = 2.4;
      shard.rotation.z = (hash(x, z) - 0.5) * 0.5;
    });

    // The game's own boss model, with plain materials: no shadows or stun tint are needed here.
    const kit = {
      mat: (hex, options = {}) => flat(hex, { roughness: 0.92, ...options }),
      glow: (hex, intensity = 1.5) => cached(`creature-glow-${hex}-${intensity}`, () => glowing(hex, intensity)),
      mesh: (geometry, material) => new THREE.Mesh(geometry, material),
    };
    const model = buildStellarDreadnought({ body: 0x050d1a, trim: 0xd4a017, eye: 0xffffff }, kit);
    const box = new THREE.Box3().setFromObject(model);
    model.scale.setScalar(6.4 / Math.max(0.1, box.max.y - box.min.y));
    dreadnought = new THREE.Group();
    dreadnought.add(model);
    dreadnought.userData.model = model;
    arena.add(dreadnought);

    blasts = [[-0.9, 3.2, 0.9], [1.1, 4.6, 0.8], [0.2, 2.2, 1.0], [-0.6, 5.2, 0.7]].map((offset) => {
      const sprite = glowSprite(arena, 0xffd98a);
      sprite.userData.offset = offset;
      return sprite;
    });
    bigBlast = glowSprite(arena, 0xfff0c8);

    // Plate and gold thrown off as it breaks.
    const shardCount = 46;
    shards = new THREE.InstancedMesh(new THREE.TetrahedronGeometry(0.34, 0), flat(0xffffff), shardCount);
    for (let index = 0; index < shardCount; index += 1) {
      const angle = hash(index, 41) * Math.PI * 2;
      const speed = 3 + hash(index, 42) * 8;
      shardData.push({
        velocity: new THREE.Vector3(Math.cos(angle) * speed, 2 + hash(index, 43) * 9, Math.sin(angle) * speed * 0.7 + 2),
        spin: new THREE.Vector3(hash(index, 44) * 9, hash(index, 45) * 9, hash(index, 46) * 9),
        size: 0.5 + hash(index, 47) * 1.1,
      });
      shards.setColorAt(index, tempColor.setHex(index % 3 === 0 ? 0xd4a017 : 0x2a3a5c));
    }
    shards.frustumCulled = false;
    arena.add(shards);

    // The last myth: a dark star in a cage, like the domes that held the storytellers.
    heart = new THREE.Group();
    heartCage = add(heart, new THREE.IcosahedronGeometry(7, 1), new THREE.MeshBasicMaterial({ color: 0x9a5cff, wireframe: true, transparent: true, opacity: 0.6, fog: false, depthWrite: false }));
    heartCore = add(heart, new THREE.OctahedronGeometry(3.4, 0), new THREE.MeshStandardMaterial({ color: 0x1a0a3a, emissive: 0x7a2ae0, emissiveIntensity: 1.2, flatShading: true, fog: false }));
    heartGlow = glowSprite(heart, 0x8a3cff, 30);
    arena.add(heart);

    const heartShardCount = 64;
    heartShards = new THREE.InstancedMesh(new THREE.TetrahedronGeometry(0.9, 0), new THREE.MeshBasicMaterial({ color: 0xb98cff, fog: false }), heartShardCount);
    for (let index = 0; index < heartShardCount; index += 1) {
      const direction = new THREE.Vector3(hash(index, 51) - 0.5, hash(index, 52) - 0.5, hash(index, 53) - 0.5).normalize();
      heartShardData.push({ velocity: direction.multiplyScalar(18 + hash(index, 54) * 34), spin: hash(index, 55) * 8, size: 0.5 + hash(index, 56) });
    }
    heartShards.frustumCulled = false;
    arena.add(heartShards);

    burstRing = add(arena, new THREE.RingGeometry(0.9, 1, 64), new THREE.MeshBasicMaterial(additive({ color: 0xfff2c4, side: THREE.DoubleSide })));
    whiteout = glowSprite(arena, 0xfff6dc);

    // The beam: a bright core in a wider sheath, laid from the muzzle to the myth each frame.
    const beamGeometry = new THREE.CylinderGeometry(1, 0.08, 1, 10, 1, true);
    beamGeometry.translate(0, 0.5, 0);
    beam = add(arena, beamGeometry, new THREE.MeshBasicMaterial(additive({ color: 0xeafffb, side: THREE.DoubleSide })));
    beamHalo = add(arena, beamGeometry, new THREE.MeshBasicMaterial(additive({ color: 0x58dfcf, side: THREE.DoubleSide, opacity: 0.4 })));
    beam.frustumCulled = false;
    beamHalo.frustumCulled = false;
  }

  // The arcane cannon, hung from the camera as in the game, but higher so its core shows.
  function buildCannonRig() {
    const lit = (hex, emissive, intensity, extra) => new THREE.MeshStandardMaterial({ color: hex, emissive, emissiveIntensity: intensity, flatShading: true, ...extra });
    gunMaterials = {
      metal: lit(0x3b4252, 0x141a2a, 0.9, { roughness: 0.55, metalness: 0.45 }),
      plate: lit(0x6f7c93, 0x1c2740, 0.8, { roughness: 0.4, metalness: 0.55 }),
      barrel: lit(0x8a94a6, 0x1a2233, 0.7, { roughness: 0.35, metalness: 0.7 }),
      glow: new THREE.MeshBasicMaterial({ color: 0x7ff5e6 }),
      flash: new THREE.MeshBasicMaterial(additive({ color: 0xd8fff8, opacity: 0.9, side: THREE.DoubleSide })),
    };
    crystalMaterial = glowing(0x9ff8ff, 1.2, { emissive: 0x58dfcf });
    gun = buildCannon(gunMaterials, crystalMaterial);
    gunMount = new THREE.Group();
    gunMount.add(gun.gun);
    gunMount.traverse((child) => { child.frustumCulled = false; });
    gunMount.visible = false;
    camera.add(gunMount);
    coreGlow = glowSprite(camera, 0x7ff5e6);
    coreGlow.visible = false;
  }

  // What every land has: ground, far hills, its storyteller and a few caged myths in the air.
  function startLand(index, palette, { hills = true, ground = true } = {}) {
    const group = newSet();
    if (ground) group.add(facetedGround({ size: 150, cells: 26, heightAt: rolling(9), tint: paletteTint(palette) }));
    if (hills) addHills(group, tempColor.setHSL(palette.groundGrass.h, palette.groundGrass.s * 0.8, palette.groundGrass.l * 0.7).getHex());
    const npc = addStoryteller(group, index);
    npc.rotation.y = LAND_CAMERAS[index].from[0] < 0 ? -0.25 : 0.25;
    const moteMaterial = new THREE.MeshBasicMaterial({ color: 0x9a5cff, wireframe: true, transparent: true, opacity: 0.75, depthWrite: false });
    const moteGeometry = new THREE.IcosahedronGeometry(0.5, 0);
    const motes = [[-4.5, 1.6, -2], [-2.4, 2.7, -4.5], [2.7, 2.3, -3.2], [4.6, 1.4, -0.8], [-1.2, 3.4, -7], [1.5, 3.1, -6], [6.5, 2.5, -5]]
      .map(([x, y, z]) => add(group, moteGeometry, moteMaterial, x, y, z));
    return { group, look: lookFromPalette(palette), npc, motes, held: Boolean(STORY_BEATS[index].plea), animate: () => {} };
  }

  // Spring meadow. A boulder and an apple hang in the air until the myth breaks, then land together.
  function buildMeadow(lite) {
    const palette = SEASON_PALETTES[0];
    const land = startLand(0, palette);
    addTrees(land.group, palette, [[-6, -5, 1.5, 'round'], [-9.5, -1, 1.3, 'round'], [6.5, -6.5, 1.6, 'round'], [10.5, -2.5, 1.2, 'round'],
      [-3.5, -11, 1.7, 'round'], [3.5, -12.5, 1.5, 'round'], [-14, -9, 1.8, 'round'], [15, -10, 1.6, 'round'], [0, -18, 1.9, 'round']]);
    const cloudMaterial = flat(0xffffff, { emissive: 0xfff4dc, emissiveIntensity: 0.25 });
    [[-22, 17, -46, 2.4], [14, 21, -60, 3], [38, 15, -40, 2.1]].forEach(([x, y, z, size], index) => {
      const cloud = createLowPolyCloud(cloudMaterial, index);
      cloud.position.set(x, y, z);
      cloud.scale.setScalar(size);
      land.group.add(cloud);
    });
    const flowerCount = lite ? 30 : 70;
    const flowers = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.13, 0), flat(0xffffff, { emissive: 0xffffff, emissiveIntensity: 0.12 }), flowerCount);
    const flowerSpots = [];
    for (let index = 0; index < flowerCount; index += 1) {
      flowerSpots.push(new THREE.Vector3((hash(index, 61) - 0.5) * 20, 0.12, 4 - hash(index, 62) * 12));
      flowers.setColorAt(index, tempColor.setHex([0xffffff, 0xffd84a, 0xff9ac0, 0xf06a5a][index % 4]));
    }
    flowers.frustumCulled = false;
    land.group.add(flowers);

    const boulder = createLowPolyRock(flat(0x8a8478), 3);
    boulder.castShadow = false;
    boulder.scale.multiplyScalar(0.8);
    const apple = add(land.group, new THREE.IcosahedronGeometry(0.17, 0), flat(0xd8402c, { emissive: 0x7a1408, emissiveIntensity: 0.4 }));
    land.group.add(boulder);
    const DROP = 2.9;
    const FALL_TIME = 0.62;
    const fall = (free) => {
      const since = free - 0.12;
      if (since <= 0) return DROP + Math.sin(free * 3) * 0.04;
      if (since < FALL_TIME) return DROP * (1 - Math.pow(since / FALL_TIME, 2));
      return 0.22 * Math.abs(Math.sin((since - FALL_TIME) * 9)) * Math.exp(-(since - FALL_TIME) * 5);
    };
    land.animate = (u) => {
      const drop = fall(freedFor(2.6, u));
      boulder.position.set(2.3, 0.3 + drop, -0.9);
      apple.position.set(3.45, 0.17 + drop, -0.6);
      flowerSpots.forEach((spot, index) => {
        tempScale.setScalar(Math.max(0.0001, easeOutBack(freedFor(spot.x, u) / 0.4)));
        flowers.setMatrixAt(index, tempMatrix.compose(spot, tempQuaternion.identity(), tempScale));
      });
      flowers.instanceMatrix.needsUpdate = true;
    };
    return land;
  }

  // River wood by moonlight. The mill wheel stands still until the myth breaks, then the river turns it.
  function buildRiverWood(lite) {
    const palette = SEASON_PALETTES[1];
    const land = startLand(1, palette);
    addTrees(land.group, palette, [[-6.5, -4, 1.5, 'pine'], [-9, -8, 1.8, 'round'], [-4, -9.5, 1.6, 'pine'], [-12, -1, 1.4, 'pine'],
      [-1, -14, 1.9, 'round'], [13.5, -11, 1.7, 'pine'], [14, -4, 1.5, 'round'], [-15, -12, 2.0, 'pine'], [8.5, -16, 1.8, 'pine']]);
    const river = add(land.group, new THREE.PlaneGeometry(6, 90), glowing(0x2f66c8, 0.55, { roughness: 0.3 }), 7.8, 0.04, -14);
    river.rotation.x = -Math.PI / 2;
    const ripples = [];
    for (let index = 0; index < 9; index += 1) {
      ripples.push(add(land.group, new THREE.BoxGeometry(0.9 + hash(index, 71), 0.02, 0.09), glowing(0xbfe0ff, 0.9), 5.6 + hash(index, 72) * 4.2, 0.07, 0));
    }

    const mill = new THREE.Group();
    mill.position.set(3.5, 0, -4.2);
    add(mill, new THREE.BoxGeometry(3, 2.6, 3), flat(0xd9c7a0), 0, 1.3, 0);
    const roof = add(mill, new THREE.ConeGeometry(2.7, 1.7, 4), flat(0x7a3a26), 0, 3.45, 0);
    roof.rotation.y = Math.PI / 4;
    add(mill, new THREE.BoxGeometry(0.7, 1.3, 0.08), flat(0x5a3a22), -0.5, 0.65, 1.52);
    const windowMaterial = glowing(0xffd27a, 0.2);
    add(mill, new THREE.BoxGeometry(0.6, 0.6, 0.08), windowMaterial, 0.7, 1.6, 1.52);
    const wheel = new THREE.Group();
    wheel.position.set(1.95, 1.35, 0.2);
    const wood = flat(0x6a4426);
    const rim = add(wheel, new THREE.TorusGeometry(1.3, 0.09, 5, 12), wood);
    rim.rotation.y = Math.PI / 2;
    add(wheel, new THREE.CylinderGeometry(0.16, 0.16, 0.7, 6), wood).rotation.z = Math.PI / 2;
    for (let index = 0; index < 8; index += 1) {
      const angle = (index / 8) * Math.PI * 2;
      const paddle = add(wheel, new THREE.BoxGeometry(0.5, 0.08, 0.5), wood, 0, Math.cos(angle) * 1.3, Math.sin(angle) * 1.3);
      paddle.rotation.x = angle;
      const spoke = add(wheel, new THREE.BoxGeometry(0.07, 0.07, 1.3), wood, 0, Math.cos(angle) * 0.65, Math.sin(angle) * 0.65);
      spoke.rotation.x = angle - Math.PI / 2;
    }
    mill.add(wheel);
    land.group.add(mill);

    const flyCount = lite ? 12 : 30;
    const flySeeds = Array.from({ length: flyCount }, (_, index) => [(hash(index, 73) - 0.5) * 16, 0.6 + hash(index, 74) * 2.6, 3 - hash(index, 75) * 11, hash(index, 76) * 6]);
    const flies = new THREE.Points(new THREE.BufferGeometry(), new THREE.PointsMaterial(additive({ color: 0xffe27a, size: 0.16, map: glowTexture })));
    flies.geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(flyCount * 3), 3));
    flies.frustumCulled = false;
    land.group.add(flies);

    land.animate = (u, t) => {
      const turning = Math.max(0, freedFor(5.4, u));
      wheel.rotation.x = -(turning < 1 ? 1.3 * turning * turning : 1.3 + 2.6 * (turning - 1));
      windowMaterial.emissiveIntensity = 0.2 + 1.5 * smooth(0, 0.5, freedFor(4.2, u));
      ripples.forEach((ripple, index) => {
        // The water only runs once the myth has gone.
        ripple.position.z = 6 - ((index * 3.1 + Math.max(0, freedFor(7.8, u)) * 4.5) % 26);
      });
      const positions = flies.geometry.attributes.position.array;
      flySeeds.forEach(([x, y, z, phase], index) => {
        positions[index * 3] = x + Math.sin(t * 0.9 + phase) * 0.5;
        positions[index * 3 + 1] = y + Math.sin(t * 1.3 + phase * 2) * 0.3;
        positions[index * 3 + 2] = z + Math.cos(t * 0.7 + phase) * 0.5;
      });
      flies.geometry.attributes.position.needsUpdate = true;
      flies.material.opacity = smooth(0.2, 1.2, freedFor(0, u));
    };
    return land;
  }

  // The crystal mine: no sky, rock all round, and crystals that wake as the myth breaks.
  function buildMine() {
    const palette = MINE_PALETTE;
    const land = startLand(2, palette, { hills: false, ground: false });
    // Brighter than the game's mine, so the glimpse reads at once.
    land.look.hemi = 1.05;
    land.look.sunIntensity = 1.5;
    const path = palette.groundPath;
    land.group.add(facetedGround({
      size: 60, cells: 16, heightAt: (x, z) => smooth(7, 16, Math.hypot(x, z)) * 2.5,
      tint: (x, z, seed, out) => out.setHSL(path.h, path.s, path.lBase * 0.6 + (seed - 0.5) * 0.08),
    }));
    const rock = flat(0x4a3a30);
    const darkRock = flat(0x2c221c);
    for (let index = 0; index < 26; index += 1) {
      const angle = (index / 26) * Math.PI * 2;
      const reach = 10.5 + hash(index, 81) * 4;
      const size = 3 + hash(index, 82) * 2.6;
      const boulder = add(land.group, new THREE.DodecahedronGeometry(size, 0), index % 2 ? rock : darkRock, Math.cos(angle) * reach, size * 0.6 + hash(index, 83) * 3, Math.sin(angle) * reach);
      boulder.rotation.set(hash(index, 84) * 3, hash(index, 85) * 3, 0);
    }
    const roofRock = add(land.group, new THREE.CylinderGeometry(22, 22, 1, 9), darkRock, 0, 9.5, 0);
    roofRock.rotation.y = 0.3;
    for (let index = 0; index < 12; index += 1) {
      const spike = add(land.group, new THREE.ConeGeometry(0.5 + hash(index, 86) * 0.6, 1.6 + hash(index, 87) * 2.4, 5), rock, (hash(index, 88) - 0.5) * 16, 8.2, -1 - hash(index, 89) * 9);
      spike.rotation.x = Math.PI;
    }
    const crystalMaterials = [0x58dfcf, 0xe040fb, 0xffb347].map((hex) => glowing(hex, 0.3));
    [[-4.6, -3.2, 1.3, 0], [-5.4, -1.2, 0.9, 1], [3.6, -4.8, 1.5, 1], [5.2, -2.6, 1.0, 2], [-1.8, -6.4, 1.6, 2], [1.2, -7.2, 1.2, 0],
      [-7, -5.5, 1.4, 0], [7, -5.6, 1.3, 1], [4.4, 1.2, 0.7, 0], [-3.8, 1.6, 0.7, 2]].forEach(([x, z, size, kind], index) => {
      for (let part = 0; part < 3; part += 1) {
        const shard = add(land.group, new THREE.OctahedronGeometry(0.34 * size, 0), crystalMaterials[kind], x + (part - 1) * 0.42 * size, 0.55 * size * (part === 1 ? 1.25 : 0.8), z + (part % 2) * 0.3);
        shard.scale.y = 2.3;
        shard.rotation.z = (part - 1) * -0.32 + (hash(index, part) - 0.5) * 0.2;
      }
    });
    // Rails and Mina's cart.
    const iron = flat(0x5a5f6a, { metalness: 0.4, roughness: 0.5 });
    const timber = flat(0x5a3a22);
    const track = new THREE.Group();
    track.position.set(2.6, 0, -1.6);
    track.rotation.y = 0.5;
    for (const side of [-0.45, 0.45]) add(track, new THREE.BoxGeometry(0.08, 0.08, 16), iron, side, 0.1, 0);
    for (let index = 0; index < 12; index += 1) add(track, new THREE.BoxGeometry(1.3, 0.06, 0.2), timber, 0, 0.04, -7.3 + index * 1.3);
    const cart = new THREE.Group();
    add(cart, new THREE.BoxGeometry(1.1, 0.7, 1.5), iron, 0, 0.62, 0);
    for (const [x, z] of [[-0.5, -0.5], [0.5, -0.5], [-0.5, 0.5], [0.5, 0.5]]) add(cart, new THREE.CylinderGeometry(0.2, 0.2, 0.1, 8), timber, x, 0.24, z).rotation.z = Math.PI / 2;
    add(cart, new THREE.OctahedronGeometry(0.3, 0), crystalMaterials[0], -0.15, 1.05, 0.1);
    add(cart, new THREE.OctahedronGeometry(0.24, 0), crystalMaterials[1], 0.22, 1.0, -0.3);
    track.add(cart);
    land.group.add(track);
    // A brazier: its embers drift out and up once the myth has gone.
    const brazier = new THREE.Group();
    brazier.position.set(-2.4, 0, -0.9);
    add(brazier, new THREE.CylinderGeometry(0.42, 0.26, 0.5, 7), iron, 0, 0.75, 0);
    add(brazier, new THREE.CylinderGeometry(0.06, 0.1, 0.6, 5), iron, 0, 0.3, 0);
    const fireMaterial = glowing(0xff7a30, 0.5);
    const fire = add(brazier, new THREE.ConeGeometry(0.3, 0.7, 5), fireMaterial, 0, 1.3, 0);
    land.group.add(brazier);
    const emberCount = 26;
    const embers = new THREE.Points(new THREE.BufferGeometry(), new THREE.PointsMaterial(additive({ color: 0xffa24a, size: 0.14, map: glowTexture })));
    embers.geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(emberCount * 3), 3));
    embers.frustumCulled = false;
    land.group.add(embers);

    land.animate = (u, t) => {
      const lit = smooth(0, 0.6, freedFor(0, u));
      crystalMaterials.forEach((material, index) => {
        material.emissiveIntensity = 0.3 + lit * (1.6 + Math.sin(t * 3 + index * 2) * 0.25);
      });
      cart.position.z = lerp(-4, 0.4, easeOutCubic(freedFor(2.6, u) / 1.4));
      const hot = smooth(0, 0.4, freedFor(-2.4, u));
      fireMaterial.emissiveIntensity = 0.5 + hot * 1.9;
      fire.scale.set(1, 0.6 + hot * (0.6 + Math.sin(t * 17) * 0.12), 1);
      const positions = embers.geometry.attributes.position.array;
      for (let index = 0; index < emberCount; index += 1) {
        const life = (t * 0.5 + hash(index, 91)) % 1;
        const angle = hash(index, 92) * Math.PI * 2;
        positions[index * 3] = -2.4 + Math.cos(angle) * life * 1.6;
        positions[index * 3 + 1] = 1.4 + life * 2.4;
        positions[index * 3 + 2] = -0.9 + Math.sin(angle) * life * 1.6;
      }
      embers.geometry.attributes.position.needsUpdate = true;
      embers.material.opacity = hot;
    };
    return land;
  }

  // The frozen lake. The floes lie sunk under the myth and bob up to float when it breaks.
  function buildFrozenLake(lite) {
    const palette = SEASON_PALETTES[3];
    const land = startLand(3, palette);
    addTrees(land.group, palette, [[-6, -4.5, 1.5, 'pine'], [-9, -9, 1.8, 'pine'], [-12.5, -2, 1.4, 'pine'], [-3, -13, 1.9, 'pine'],
      [12, -13, 1.7, 'pine'], [14.5, -5, 1.5, 'pine'], [-16, -13, 2.0, 'pine']]);
    const ice = add(land.group, new THREE.CircleGeometry(13, 11), flat(0xa9cbea, { emissive: 0x6f9fd0, emissiveIntensity: 0.25, roughness: 0.35 }), 5.5, 0.05, -9.5);
    ice.rotation.x = -Math.PI / 2;
    const water = add(land.group, new THREE.CircleGeometry(2.7, 9), flat(0x1f4a86, { emissive: 0x10305c, emissiveIntensity: 0.5, roughness: 0.3 }), 3.3, 0.08, -1.3);
    water.rotation.x = -Math.PI / 2;
    const floeMaterial = flat(0xf2f8ff, { emissive: 0xbcd4ee, emissiveIntensity: 0.3 });
    const floes = [[2.4, -0.6, 0.62], [3.6, -1.9, 0.5], [4.4, -0.5, 0.42], [2.9, -2.4, 0.36], [3.5, -0.9, 0.3]].map(([x, z, size]) => {
      const floe = add(land.group, new THREE.DodecahedronGeometry(size, 0), floeMaterial, x, 0, z);
      floe.scale.y = 0.34;
      floe.rotation.y = hash(x, z) * 6;
      return floe;
    });
    // Captain Frost's boat, hauled up on the ice.
    const boat = new THREE.Group();
    boat.position.set(-2.7, 0.1, -3.4);
    boat.rotation.set(0, 0.7, 0.12);
    const hull = add(boat, new THREE.CylinderGeometry(0.55, 0.3, 2.6, 5, 1), flat(0x7a4a26), 0, 0.3, 0);
    hull.rotation.z = Math.PI / 2;
    hull.scale.z = 0.7;
    add(boat, new THREE.CylinderGeometry(0.05, 0.06, 2.2, 5), flat(0x5a3a22), 0, 1.5, 0);
    const sail = add(boat, new THREE.ConeGeometry(0.9, 1.7, 3), flat(0xf2f0e6, { side: THREE.DoubleSide }), 0.35, 1.6, 0);
    sail.scale.z = 0.08;
    land.group.add(boat);

    const flakeCount = lite ? 50 : 140;
    const flakes = new THREE.Points(new THREE.BufferGeometry(), new THREE.PointsMaterial({ color: 0xffffff, size: 0.2, map: glowTexture, transparent: true, opacity: 0.95, depthWrite: false }));
    flakes.geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(flakeCount * 3), 3));
    flakes.frustumCulled = false;
    land.group.add(flakes);

    land.animate = (u, t) => {
      floes.forEach((floe, index) => {
        const free = freedFor(floe.position.x, u) - index * 0.06;
        floe.position.y = lerp(-0.45, 0.13, easeOutBack(free / 0.5)) + (free > 0 ? Math.sin(t * 2.4 + index) * 0.03 : 0);
      });
      const positions = flakes.geometry.attributes.position.array;
      for (let index = 0; index < flakeCount; index += 1) {
        positions[index * 3] = (hash(index, 93) - 0.5) * 22 + Math.sin(t * 0.6 + index) * 0.3;
        positions[index * 3 + 1] = 8 - ((t * (0.7 + hash(index, 94) * 0.5) + hash(index, 95) * 8) % 8);
        positions[index * 3 + 2] = 5 - hash(index, 96) * 16;
      }
      flakes.geometry.attributes.position.needsUpdate = true;
    };
    return land;
  }

  // Astra's island in the night sky, with her telescope. The stars come out as the myth breaks.
  function buildSkyIsland() {
    const palette = FINAL_WAVE_PALETTE;
    const land = startLand(4, palette, { hills: false, ground: false });
    add(land.group, new THREE.CylinderGeometry(7.5, 1.4, 8, 8), flat(0x332a5a), 0, -4.05, 0);
    const top = facetedGround({
      size: 16, cells: 7,
      tint: (x, z, seed, out) => out.setHSL(0.72, 0.3, 0.3 + (seed - 0.5) * 0.08),
      keep: (x, z) => Math.hypot(x, z) < 7.3,
    });
    top.position.y = 0;
    land.group.add(top);
    addTrees(land.group, palette, [[-4.6, -2.6, 1.3, 'round'], [4.8, -3.4, 1.1, 'pine']]);
    const crystal = glowing(0xe040fb, 1.3);
    [[-2.8, -4.6, 1], [3.2, -1.2, 0.7], [-5.2, 0.8, 0.6]].forEach(([x, z, size]) => {
      add(land.group, new THREE.OctahedronGeometry(0.4 * size, 0), crystal, x, 0.7 * size, z).scale.y = 2.3;
    });
    const brass = flat(0xd8a84a, { metalness: 0.5, roughness: 0.4, emissive: 0x4a3410, emissiveIntensity: 0.5 });
    const scope = new THREE.Group();
    scope.position.set(-2.1, 0, -0.5);
    for (let index = 0; index < 3; index += 1) {
      const angle = (index / 3) * Math.PI * 2;
      const leg = add(scope, new THREE.CylinderGeometry(0.035, 0.035, 1.3, 4), flat(0x3a2f4a), Math.cos(angle) * 0.25, 0.6, Math.sin(angle) * 0.25);
      leg.rotation.set(Math.sin(angle) * 0.4, 0, -Math.cos(angle) * 0.4);
    }
    const tube = add(scope, new THREE.CylinderGeometry(0.13, 0.17, 1.5, 7), brass, 0, 1.35, 0);
    tube.rotation.set(0, 0, 0.8);
    land.group.add(scope);

    // Shooting stars, once the sky is free.
    const streakMaterial = new THREE.MeshBasicMaterial(additive({ color: 0xfff6dc }));
    const streaks = [[-30, 34, -70, 0.2], [12, 44, -90, 0.75], [34, 30, -80, 1.3]].map(([x, y, z, delay]) => {
      const streak = add(land.group, new THREE.BoxGeometry(9, 0.22, 0.22), streakMaterial, x, y, z);
      streak.rotation.z = -0.5;
      streak.userData = { x, y, delay };
      return streak;
    });
    land.animate = (u) => {
      streaks.forEach((streak) => {
        const flight = (freedFor(0, u) - streak.userData.delay) / 0.7;
        streak.visible = flight > 0 && flight < 1;
        streak.position.x = streak.userData.x + flight * 26;
        streak.position.y = streak.userData.y - flight * 14;
        streak.scale.x = Math.sin(clamp01(flight) * Math.PI);
      });
    };
    land.backdrop = true;
    return land;
  }

  // The wave of light itself, shared by the five lands, and the sparks it leaves behind.
  function buildWave(lite) {
    const geometry = new THREE.CylinderGeometry(1, 1, 1, 64, 1, true);
    geometry.translate(0, 0.5, 0);
    wall = add(scene, geometry, new THREE.MeshBasicMaterial(additive({ color: 0xffe9a8, map: wallTexture, side: THREE.DoubleSide, opacity: 0.6 })), WALL_CENTRE, -0.2, 0);
    wallFoot = add(scene, geometry, new THREE.MeshBasicMaterial(additive({ color: 0xfffbe6, side: THREE.DoubleSide })), WALL_CENTRE, 0, 0);
    wall.frustumCulled = false;
    wallFoot.frustumCulled = false;
    const count = lite ? 30 : 70;
    for (let index = 0; index < count; index += 1) {
      sparkleData.push({ x: (hash(index, 101) - 0.5) * 18, z: 4 - hash(index, 102) * 13, speed: 0.7 + hash(index, 103) * 1.1, phase: hash(index, 104) * 6 });
    }
    sparkles = new THREE.Points(new THREE.BufferGeometry(), new THREE.PointsMaterial(additive({ color: 0xffd98a, size: 0.2, map: glowTexture })));
    sparkles.geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
    sparkles.frustumCulled = false;
    scene.add(sparkles);
  }

  // A hill above the freed land, the five storytellers on it, and the sunrise behind them.
  const hillHeight = (x, z) => -3.2 * (1 - Math.exp(-(x * x + z * z) / 240))
    + smooth(9, 30, Math.hypot(x, z)) * (Math.sin(x * 0.21 + z * 0.13) * 0.4 + Math.sin(x * 0.07 - z * 0.19) * 0.6);

  function buildDawn(lite) {
    dawnSet = newSet();
    const palette = SEASON_PALETTES[0];
    dawnSet.add(facetedGround({ size: 220, cells: 34, heightAt: hillHeight, tint: paletteTint(palette) }));
    addHills(dawnSet, 0x4f6a3a, { radius: 92, count: 20, height: 24, base: -8 });
    addTrees(dawnSet, palette, [[-8, -5, 1.5, 'round'], [9, -6, 1.6, 'round'], [-13, -11, 1.8, 'round'], [14.5, -13, 1.7, 'round'], [-19, -3, 1.6, 'round'],
      [20, -4, 1.5, 'round'], [-5, -17, 1.9, 'round'], [6, -19, 1.8, 'round'], [-26, -16, 2.0, 'round'], [27, -18, 2.0, 'round']], hillHeight);
    gathering = STORY_BEATS.map((beat, index) => {
      const x = (index - 2) * 1.7;
      const z = -Math.abs(index - 2) * 0.45;
      const npc = addStoryteller(dawnSet, index, x, hillHeight(x, z), z);
      npc.rotation.y = -(index - 2) * 0.16;
      return npc;
    });
    const flowerCount = lite ? 30 : 80;
    const flowers = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.13, 0), flat(0xffffff, { emissive: 0xffffff, emissiveIntensity: 0.12 }), flowerCount);
    for (let index = 0; index < flowerCount; index += 1) {
      const x = (hash(index, 111) - 0.5) * 24;
      const z = 6 - hash(index, 112) * 16;
      tempVector.set(x, hillHeight(x, z) + 0.12, z);
      flowers.setMatrixAt(index, tempMatrix.compose(tempVector, tempQuaternion.identity(), tempScale.setScalar(1)));
      flowers.setColorAt(index, tempColor.setHex([0xffffff, 0xffd84a, 0xff9ac0, 0xf06a5a][index % 4]));
    }
    flowers.frustumCulled = false;
    dawnSet.add(flowers);

    sunDisc = add(dawnSet, new THREE.CircleGeometry(11, 24), new THREE.MeshBasicMaterial({ color: 0xfff1c9, fog: false, toneMapped: false }), 26, -12, -190);
    sunGlow = glowSprite(dawnSet, 0xffc27a, 120);
    const cloudMaterial = flat(0xffffff, { emissive: 0xffb6a0, emissiveIntensity: 0.45 });
    clouds = [[-70, 38, -150, 5], [-22, 52, -180, 6.5], [48, 44, -165, 5.5], [95, 34, -140, 4.6], [-110, 46, -120, 5]].map(([x, y, z, size], index) => {
      const cloud = createLowPolyCloud(cloudMaterial, index);
      cloud.position.set(x, y, z);
      cloud.scale.setScalar(size);
      cloud.userData.x = x;
      dawnSet.add(cloud);
      return cloud;
    });
  }

  // The game's name, drawn once the heading font is ready.
  function buildTitle() {
    const canvasEl = document.createElement('canvas');
    canvasEl.width = 1280;
    canvasEl.height = 360;
    const texture = new THREE.CanvasTexture(canvasEl);
    texture.colorSpace = THREE.SRGBColorSpace;
    titleAspect = canvasEl.width / canvasEl.height;
    const draw = () => {
      const ctx = canvasEl.getContext('2d');
      ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
      ctx.font = `700 220px ${GAME_FONT_FAMILY}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineJoin = 'round';
      ctx.lineWidth = 26;
      ctx.strokeStyle = '#3a1f5c';
      ctx.strokeText(TITLE_TEXT, canvasEl.width / 2, canvasEl.height / 2 + 6);
      ctx.fillStyle = '#fff6d8';
      ctx.fillText(TITLE_TEXT, canvasEl.width / 2, canvasEl.height / 2 + 6);
      texture.needsUpdate = true;
    };
    draw();
    waitForFont(`700 220px Fredoka`).then(draw);
    titleGlow = glowSprite(dawnSet, 0xffd98a);
    title = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false, fog: false, toneMapped: false }));
    dawnSet.add(title);
  }

  // ── Word tags: built for each run ──
  function makeTag(text) {
    const font = `600 64px ${GAME_FONT_FAMILY}`;
    const canvasEl = document.createElement('canvas');
    const probe = canvasEl.getContext('2d');
    probe.font = font;
    canvasEl.width = Math.ceil(probe.measureText(text).width) + 88;
    canvasEl.height = 116;
    const ctx = canvasEl.getContext('2d');
    // The game's own word card: ink on paper.
    ctx.fillStyle = '#fbf5e4';
    roundedRect(ctx, 4, 4, canvasEl.width - 8, canvasEl.height - 8, 26);
    ctx.fill();
    ctx.lineWidth = 5;
    ctx.strokeStyle = 'rgba(110, 78, 40, 0.6)';
    ctx.stroke();
    ctx.fillStyle = '#3d2b1c';
    ctx.font = font;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, canvasEl.width / 2, canvasEl.height / 2 + 4);
    const texture = new THREE.CanvasTexture(canvasEl);
    texture.colorSpace = THREE.SRGBColorSpace;
    return { texture, aspect: canvasEl.width / canvasEl.height };
  }

  function clearTags() {
    for (const word of words) {
      camera.remove(word.sprite, word.bolt);
      word.sprite.material.map.dispose();
      word.sprite.material.dispose();
      word.bolt.material.dispose();
    }
    words = [];
  }

  function buildTags(terms, arrivals) {
    clearTags();
    words = terms.map((term, index) => {
      const { texture, aspect } = makeTag(term);
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false, fog: false, toneMapped: false }));
      const bolt = new THREE.Sprite(new THREE.SpriteMaterial(additive({ map: glowTexture, color: 0x9ff8ff })));
      sprite.visible = false;
      bolt.visible = false;
      camera.add(sprite, bolt);
      return { sprite, bolt, aspect, index, arrive: arrivals[index], phase: hash(index, 121) * 6 };
    });
  }

  // Where a word waits, in the camera's own frame: a grid across the upper view, inside the cinema bars, taller than wide on a phone.
  function wordHome(word, aspect, halfHeight, out) {
    const count = words.length;
    const wide = aspect >= 1;
    const columns = wide ? 5 : 2;
    const row = Math.floor(word.index / columns);
    const inRow = Math.min(columns, count - row * columns);
    const spread = wide ? 0.8 : 0.56;
    const depth = 11 + hash(word.index, 122) * 2;
    const scale = depth / 11;
    const fx = ((word.index % columns + 0.5) / inRow - 0.5) * 2 * spread;
    const fy = wide ? 0.6 - row * 0.34 + (hash(word.index, 123) - 0.5) * 0.08 : 0.66 - row * 0.18;
    out.set(fx * halfHeight * aspect * scale, fy * halfHeight * scale, -depth);
    // The room one word has across its row, so long words shrink to fit.
    return (2 * spread * halfHeight * aspect * scale) / inRow;
  }

  // ── Per-frame update: everything from the clock ──

  function applyLook(source) {
    scene.fog.color.copy(source.fog);
    scene.fog.near = source.fogNear;
    scene.fog.far = source.fogFar;
    hemiLight.color.copy(source.hemiSky);
    hemiLight.groundColor.copy(source.hemiGround);
    hemiLight.intensity = source.hemi;
    sunLight.color.copy(source.sun);
    sunLight.intensity = source.sunIntensity;
    stars.material.opacity = source.stars;
    stars.visible = source.stars > 0.01;
    renderer.setClearColor(source.horizon);
    const positions = sky.geometry.attributes.position;
    const colors = sky.geometry.attributes.color;
    for (let index = 0; index < positions.count; index += 1) {
      const lift = positions.getY(index) / 500;
      if (lift >= 0) tempColor.copy(source.horizon).lerp(source.top, Math.pow(lift, 0.55));
      else tempColor.copy(source.horizon).lerp(source.bottom, Math.min(1, -lift * 3));
      colors.setXYZ(index, tempColor.r, tempColor.g, tempColor.b);
    }
    colors.needsUpdate = true;
  }

  function aimCamera(fov, aspect, fit = 0) {
    let wanted = fov;
    if (fit > 0) {
      // Widen the view on a narrow screen so the subject's width stays in frame.
      const distance = cameraPosition.distanceTo(cameraLook);
      wanted = Math.max(fov, THREE.MathUtils.radToDeg(2 * Math.atan(fit / (distance * aspect))));
    }
    camera.fov = Math.min(MAX_FOV, wanted);
    camera.aspect = aspect;
    camera.position.copy(cameraPosition);
    camera.lookAt(cameraLook);
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld(true);
  }

  function update(t, aspect) {
    const landIndex = t >= T.lands && t < T.dawn ? Math.min(LAND_COUNT - 1, Math.floor((t - T.lands) / T.landLength)) : -1;
    const inSky = t < T.lands;
    const inDawn = t >= T.dawn;
    arena.visible = inSky;
    gunMount.visible = inSky && t > T.charge - 0.2;
    coreGlow.visible = gunMount.visible;
    lands.forEach((land, index) => { land.group.visible = index === landIndex; });
    dawnSet.visible = inDawn;
    backdrop.visible = inSky || (landIndex >= 0 && Boolean(lands[landIndex].backdrop));
    wall.visible = landIndex >= 0;
    wallFoot.visible = landIndex >= 0;
    sparkles.visible = landIndex >= 0;
    renderer.toneMappingExposure = EXPOSURE;
    if (inSky) updateSky(t, aspect);
    else if (inDawn) updateDawn(t, aspect);
    else updateLand(landIndex, t, aspect);
    if (!inSky) for (const word of words) { word.sprite.visible = false; word.bolt.visible = false; }
    moon.visible = backdrop.visible || inDawn;
    moon.material.opacity = inDawn ? 1 - smooth(T.dawn, T.dawn + 4, t) : 1;
  }

  // The opening: the Dreadnought breaks, its myth rises, the cannon charges and fires.
  function updateSky(t, aspect) {
    const fov = sampleKeys(SKY_KEYS, t, cameraPosition, cameraLook);
    const beamOn = t >= T.fire && t < T.burst + 0.06;
    const rumble = beamOn ? 1 : Math.exp(-Math.max(0, t - T.burst) * 5) * (t >= T.burst ? 1.6 : 0);
    cameraPosition.x += Math.sin(t * 71) * 0.035 * rumble;
    cameraPosition.y += Math.sin(t * 93 + 1) * 0.035 * rumble;
    aimCamera(fov, aspect);

    // The night stays murky until the myth breaks.
    const cleared = smooth(T.burst, T.burst + 0.5, t);
    blendLooks(NIGHT_LOOK, NIGHT_LOOK, 0, look);
    look.stars = lerp(0.3, 1, cleared);
    applyLook(look);

    // The Dreadnought: reeling under small blasts, then thrown back off the island.
    const model = dreadnought.userData.model;
    const reel = clamp01(t / T.shatter);
    const since = t - T.shatter;
    model.userData.animate(t * 0.7, { hurt: 1, rage: 0 });
    dreadnought.visible = since < 1.4;
    if (since < 0) {
      dreadnought.position.set(Math.sin(t * 43) * 0.05, 0, -5);
      dreadnought.rotation.set(-0.16 * reel, 0, Math.sin(t * 31) * 0.02);
      dreadnought.scale.setScalar(1);
    } else {
      dreadnought.position.set(0, -7 * since * since, -5 - 4.5 * since);
      dreadnought.rotation.set(-0.16 - 1.35 * smooth(0, 0.9, since), 0, since * 0.5);
      dreadnought.scale.setScalar(1 - 0.2 * clamp01(since));
    }
    blasts.forEach((blast, index) => {
      const age = t - (index + 0.5) * BEAT;
      blast.visible = age >= 0 && age < 0.5 && since < 0;
      if (!blast.visible) return;
      blast.position.set(blast.userData.offset[0], blast.userData.offset[1], -5 + blast.userData.offset[2]);
      blast.scale.setScalar(1.2 + age * 9);
      blast.material.opacity = Math.exp(-age * 8);
    });
    bigBlast.visible = since >= 0 && since < 0.9;
    bigBlast.position.set(0, 3.6, -4.5);
    bigBlast.scale.setScalar(6 + since * 30);
    bigBlast.material.opacity = Math.exp(-Math.max(0, since) * 4.5);
    shards.visible = since >= 0 && since < 1.6;
    if (shards.visible) {
      shardData.forEach((shard, index) => {
        tempVector.set(0, 3.6, -5).addScaledVector(shard.velocity, since);
        tempVector.y -= 7 * since * since;
        tempEuler.set(shard.spin.x * since, shard.spin.y * since, shard.spin.z * since);
        tempScale.setScalar(Math.max(0.0001, shard.size * (1 - since / 1.6)));
        shards.setMatrixAt(index, tempMatrix.compose(tempVector, tempQuaternion.setFromEuler(tempEuler), tempScale));
      });
      shards.instanceMatrix.needsUpdate = true;
    }

    // The myth: rising out of the wreck, hanging over the land, then struck and broken.
    const rise = easeInOutCubic(since / (T.charge - T.shatter));
    const struck = clamp01((t - T.fire) / (T.burst - T.fire));
    const broken = t - T.burst;
    heart.visible = since >= 0 && broken < 0.3;
    heart.position.copy(HEART_BIRTH).lerp(HEART, rise);
    const heartSize = lerp(0.1, 1, rise) * (1 + Math.sin(t * 2.1) * 0.04);
    heart.scale.setScalar(heartSize);
    heartCage.rotation.set(t * 0.21, t * 0.33, 0);
    heartCore.rotation.set(t * 0.5, -t * 0.4, 0);
    const jitter = t >= T.fire && broken < 0 ? 1 + Math.sin(t * 67) * 0.07 * struck : 1;
    heartCage.scale.setScalar((1 + struck * 0.25) * jitter * (broken > 0 ? 1 + broken * 6 : 1));
    heartCage.material.opacity = 0.6 * (broken > 0 ? Math.max(0, 1 - broken / 0.25) : 1);
    heartCage.material.color.setHex(0x9a5cff).lerp(tempColor.setHex(0xffffff), struck * 0.8);
    heartCore.visible = broken < 0;
    heartCore.scale.setScalar(jitter * (1 + struck * 0.3));
    heartCore.material.emissive.setHex(0x7a2ae0).lerp(tempColor.setHex(0xfff2d0), struck);
    heartCore.material.emissiveIntensity = 1.2 + Math.sin(t * 2.1) * 0.3 + struck * 3;
    heartGlow.material.color.setHex(0x8a3cff).lerp(tempColor.setHex(0xfff2d0), struck);
    heartGlow.material.opacity = 0.75 * (broken > 0 ? Math.max(0, 1 - broken / 0.3) : 1);
    heartGlow.scale.setScalar(30 + struck * 16);

    heartShards.visible = broken >= 0;
    if (heartShards.visible) {
      heartShardData.forEach((shard, index) => {
        tempVector.copy(HEART).addScaledVector(shard.velocity, broken);
        tempEuler.set(shard.spin * broken, shard.spin * broken * 1.3, 0);
        tempScale.setScalar(Math.max(0.0001, shard.size * (1 - broken / 0.9)));
        heartShards.setMatrixAt(index, tempMatrix.compose(tempVector, tempQuaternion.setFromEuler(tempEuler), tempScale));
      });
      heartShards.instanceMatrix.needsUpdate = true;
    }
    // The wave of light leaves the broken myth and swallows the view.
    const spread = clamp01(broken / (T.lands - T.burst));
    burstRing.visible = broken >= 0;
    burstRing.position.copy(HEART);
    burstRing.lookAt(camera.position);
    burstRing.scale.setScalar(5 + 330 * Math.pow(spread, 1.8));
    burstRing.material.opacity = 1 - spread * 0.4;
    whiteout.visible = broken >= 0;
    whiteout.position.copy(HEART);
    whiteout.scale.setScalar(30 + 620 * spread);
    whiteout.material.opacity = Math.min(1, 0.35 + spread * 1.4);

    poseCannon(t, aspect, beamOn);
    updateTags(t, aspect);
  }

  function poseCannon(t, aspect, beamOn) {
    const halfHeight = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * GUN_DEPTH;
    // On a narrow screen the gun shrinks, as it does in the game.
    const size = THREE.MathUtils.clamp(aspect * 0.62, 0.55, 0.95);
    const raised = easeOutCubic((t - (T.charge - 0.1)) / 0.9);
    gunMount.scale.setScalar(size * 1.5);
    gunMount.position.set(halfHeight * aspect * 0.24, lerp(-1.75, -0.56, raised), -GUN_DEPTH);
    tempVector.set(0, 0.1, -5.5);
    camera.localToWorld(tempVector);
    tempVector.lerp(HEART, smooth(T.charge + 1.2, T.spinUp, t));
    const sinceFire = t - T.fire;
    const kick = sinceFire >= 0 ? Math.exp(-sinceFire * 6) : 0;
    gun.gun.position.set(0, 0, 0);
    gun.gun.lookAt(tempVector);
    gun.gun.translateZ(-kick * 0.09 + (beamOn ? Math.sin(t * 83) * 0.006 : 0));
    gun.gun.rotateX(-kick * 0.08);

    // The barrels wind up toward the shot: the turn is the integral of a speed that eases in.
    const windStart = T.charge + 1;
    const windLength = T.fire - windStart;
    const wind = clamp01((t - windStart) / windLength);
    gun.barrels.rotation.z = t * 1.5 + 36 * (windLength * (wind * wind * wind - Math.pow(wind, 4) / 2) + Math.max(0, sinceFire));
    gun.runes.rotation.z = -t * 1.4 - gun.barrels.rotation.z * 0.25;
    gun.runes.scale.setScalar(1 + wind * 0.25 + kick * 0.5);

    let arrived = 0;
    let pulse = 0;
    for (const word of words) {
      if (t < word.arrive) continue;
      arrived += 1;
      pulse = Math.max(pulse, Math.exp(-(t - word.arrive) * 7));
    }
    const charge = words.length ? arrived / words.length : smooth(T.charge + 1.5, T.spinUp, t);
    const level = sinceFire > 0 ? Math.max(0.35, 1 - clamp01((t - T.burst) / 0.4) * 0.65) : charge;
    crystalMaterial.emissiveIntensity = 1 + level * 2.6 + pulse * 2;
    gun.core.rotation.y = t * 1.8;
    gun.core.scale.setScalar(1 + level * 0.55 + pulse * 0.4);
    gun.ringA.rotation.set(t * 3.1, t * 0.7, 0);
    gun.ringB.rotation.set(0.6, -t * 3.7, t * 0.5);
    gun.coils.forEach((coil, index) => {
      coil.scale.setScalar(1 + level * 0.12 + Math.sin(t * 9 - index * 1.1) * 0.03 * (0.4 + level));
    });
    gun.flash.visible = beamOn;
    gun.flash.scale.setScalar(0.75 + Math.sin(t * 60) * 0.15);
    gun.flash.rotation.z = t * 21;
    gunMaterials.flash.opacity = 0.8;

    gunMount.updateMatrixWorld(true);
    gun.core.getWorldPosition(tempVector);
    camera.worldToLocal(tempVector);
    coreGlow.position.copy(tempVector);
    coreGlow.scale.setScalar(0.1 + level * 0.24 + pulse * 0.2);
    coreGlow.material.opacity = 0.3 + level * 0.3 + pulse * 0.3;
    coreHome.copy(tempVector);

    beam.visible = beamOn;
    beamHalo.visible = beamOn;
    if (beamOn) {
      gun.muzzle.getWorldPosition(tempVector);
      const reach = tempVectorTwo.copy(HEART).sub(tempVector);
      const length = reach.length();
      tempQuaternion.setFromUnitVectors(UP, reach.normalize());
      const swell = 1 + Math.sin(t * 57) * 0.18;
      beam.position.copy(tempVector);
      beam.quaternion.copy(tempQuaternion);
      beam.scale.set(1.5 * swell, length, 1.5 * swell);
      beamHalo.position.copy(tempVector);
      beamHalo.quaternion.copy(tempQuaternion);
      beamHalo.scale.set(3.6 * swell, length, 3.6 * swell);
    }
  }

  // The words wait across the upper view, then streak into the core one by one.
  function updateTags(t, aspect) {
    const halfHeight = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * 11;
    const core = coreHome;
    for (const word of words) {
      const { sprite, bolt } = word;
      const appear = T.charge + 0.2 + word.index * 0.1;
      if (t < appear || t >= word.arrive) {
        sprite.visible = false;
        bolt.visible = false;
        continue;
      }
      const room = wordHome(word, aspect, halfHeight, tempVector);
      tempVector.y += Math.sin(t * 1.1 + word.phase) * 0.12;
      const tall = Math.min(aspect >= 1 ? 0.66 : 0.5, (room * 0.94) / word.aspect);
      const depart = word.arrive - 0.5;
      let size = easeOutBack((t - appear) / 0.35);
      let flight = 0;
      if (t > depart) {
        flight = easeInOutCubic((t - depart) / (word.arrive - depart));
        const a = (1 - flight) * (1 - flight);
        const b = 2 * (1 - flight) * flight;
        const c = flight * flight;
        // A curve that lifts first, then dives into the core.
        tempVector.set(
          a * tempVector.x + b * lerp(tempVector.x, core.x, 0.5) + c * core.x,
          a * tempVector.y + b * (tempVector.y + 1.2) + c * core.y,
          a * tempVector.z + b * lerp(tempVector.z, core.z, 0.4) + c * core.z,
        );
        size = lerp(1, 0.04, flight * flight);
      }
      sprite.visible = true;
      sprite.position.copy(tempVector);
      sprite.scale.set(tall * word.aspect * size, tall * size, 1);
      sprite.material.opacity = 1 - flight * flight;
      bolt.visible = flight > 0;
      bolt.position.copy(tempVector);
      bolt.scale.setScalar(lerp(1.4, 0.25, flight));
      bolt.material.opacity = Math.sin(flight * Math.PI) * 0.9 + flight * 0.3;
    }
  }

  // One land: gloom, the wave crossing from the left, and what it sets free.
  function updateLand(index, t, aspect) {
    const land = lands[index];
    const u = t - landStart(index);
    const shot = LAND_CAMERAS[index];
    const move = smooth(0, T.landLength, u);
    cameraPosition.set(lerp(shot.from[0], shot.to[0], move), lerp(shot.from[1], shot.to[1], move), lerp(shot.from[2], shot.to[2], move));
    cameraLook.set(shot.look[0], shot.look[1], shot.look[2]);
    aimCamera(LAND_FOV, aspect, 2.2);

    const free = smooth(0.8, 1.5, u);
    blendLooks(land.look, land.look, 0, look);
    for (const key of ['top', 'horizon', 'bottom', 'fog', 'hemiSky', 'sun']) look[key].lerp(GLOOM, (1 - free) * 0.62);
    look.hemi *= lerp(0.65, 1, free);
    look.sunIntensity *= lerp(0.4, 1, free);
    look.stars = land.look.stars * lerp(0.25, 1, free);
    applyLook(look);
    // The light passing over the camera.
    renderer.toneMappingExposure = EXPOSURE * (1 + 0.55 * Math.exp(-Math.pow((freedFor(cameraPosition.x, u)) / 0.16, 2)));

    const radius = Math.max(1, wallX(u) - WALL_CENTRE);
    wall.scale.set(radius, 3.2, radius);
    wallFoot.scale.set(radius, 0.3, radius);
    wall.material.opacity = 0.7 * (1 - smooth(1.6, 2.4, u));
    wallFoot.material.opacity = wall.material.opacity;

    land.motes.forEach((mote, moteIndex) => {
      const gone = freedFor(mote.position.x, u);
      mote.rotation.set(t * 0.6 + moteIndex, t * 0.9, 0);
      mote.scale.setScalar(gone < 0 ? 1 + Math.sin(t * 2 + moteIndex) * 0.08 : Math.max(0.0001, (1 + gone * 5) * (1 - gone / 0.28)));
      mote.visible = gone < 0.28;
    });
    const npcFree = freedFor(0, u);
    poseStoryteller(land.npc, npcFree, t, index);
    const dome = land.npc.userData.parts.dome;
    dome.visible = land.held && npcFree < 0.3;
    dome.scale.setScalar(npcFree > 0 ? 1 + npcFree * 4 : 1);
    dome.material.opacity = 0.34 * (npcFree > 0 ? 1 - npcFree / 0.3 : 1);
    dome.rotation.y = t * 0.5;

    const positions = sparkles.geometry.attributes.position.array;
    sparkleData.forEach((spark, sparkIndex) => {
      const age = freedFor(spark.x, u);
      positions[sparkIndex * 3] = spark.x + Math.sin(t * 1.3 + spark.phase) * 0.2;
      positions[sparkIndex * 3 + 1] = age > 0 ? 0.15 + age * spark.speed : -50;
      positions[sparkIndex * 3 + 2] = spark.z;
    });
    sparkles.geometry.attributes.position.needsUpdate = true;
    sparkles.material.opacity = 0.9 * (1 - smooth(2.2, T.landLength, u));
    land.animate(u, t);
  }

  // Sunrise on the hill, then the name.
  function updateDawn(t, aspect) {
    let fov;
    if (t < T.end) {
      fov = sampleKeys(DAWN_KEYS, t, cameraPosition, cameraLook);
    } else {
      // Behind the summary the camera only drifts.
      const idle = t - T.end;
      const settle = smooth(0, 3, idle);
      const lastKey = DAWN_KEYS[DAWN_KEYS.length - 1];
      cameraPosition.set(lastKey[1][0] + Math.sin(idle * 0.12) * 1.2 * settle, lastKey[1][1], lastKey[1][2]);
      cameraLook.set(lastKey[2][0], lerp(lastKey[2][1], 2.2, settle), lastKey[2][2]);
      fov = lastKey[3];
    }
    aimCamera(fov, aspect, 4.4);

    const dawn = smooth(T.dawn - 0.2, T.dawn + 5.5, t);
    if (dawn < 0.5) blendLooks(NIGHT_LOOK, HALF_DAWN_LOOK, dawn * 2, look);
    else blendLooks(HALF_DAWN_LOOK, DAWN_LOOK, dawn * 2 - 1, look);
    applyLook(look);

    const sunRise = smooth(T.dawn, T.title + 2, t);
    sunDisc.position.y = lerp(-12, 30, sunRise);
    sunDisc.lookAt(camera.position);
    sunGlow.position.copy(sunDisc.position);
    sunGlow.material.opacity = 0.2 + 0.6 * sunRise;
    clouds.forEach((cloud, index) => { cloud.position.x = cloud.userData.x + (t - T.dawn) * (0.5 + index * 0.12); });

    gathering.forEach((npc, index) => {
      poseStoryteller(npc, t - T.dawn - 0.5 - index * 0.22, t, index * 1.7);
      // After the first leap they keep a small bounce, out of step with each other.
      npc.position.y += Math.max(0, Math.sin(t * 5.2 + index * 1.3)) * 0.07 * smooth(T.dawn + 2, T.dawn + 3, t);
      npc.userData.parts.dome.visible = false;
    });

    // The name arrives over their heads, and steps aside for the summary.
    const shown = t - T.title;
    const distance = Math.abs(camera.position.z - -1);
    const halfWidth = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * distance * aspect;
    const wide = Math.min(9.6, halfWidth * 2 * 0.86);
    const arrive = easeOutBack(shown / 0.55);
    const leave = 1 - smooth(T.end + 0.2, T.end + 1.2, t);
    title.visible = shown > 0 && leave > 0;
    title.position.set(0, 5.3 + Math.sin(t * 0.9) * 0.06, -1);
    title.scale.set(wide * Math.max(0.0001, arrive), (wide / titleAspect) * Math.max(0.0001, arrive), 1);
    title.material.opacity = clamp01(shown / 0.3) * leave;
    titleGlow.visible = title.visible;
    titleGlow.position.set(0, 5.3, -1.6);
    titleGlow.scale.set(wide * 1.5, wide * 0.6, 1);
    titleGlow.material.opacity = (0.3 + 0.55 * Math.exp(-Math.max(0, shown) * 2.2)) * clamp01(shown / 0.2) * leave;
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
    // Behind the summary the scene only drifts, so it drops to about 10 frames a second;
    // battery saver halves the frame rate throughout.
    const minGap = t > T.end + 3.5 ? 100 : 1000 / (world.lite ? 30 : 60) - 3;
    if (lastRender && stamp - lastRender < minGap) return;
    lastRender = stamp;
    if (!resize()) return;

    if (lastT >= 0 && lastT < T.burst && t >= T.burst && t - lastT < 1) triggerFlash();
    lastT = t;
    update(t, width / height);
    updateCaption(t);
    renderer.render(scene, camera);

    if (!completed && t >= T.end) {
      completed = true;
      if (onComplete) onComplete();
    }
  }

  function play(options = {}) {
    if (!world.built) buildWorld(Boolean(options.batterySaver));
    const terms = options.terms || [];
    const arrivals = options.arrivals && options.arrivals.length === terms.length ? options.arrivals : wordArrivalTimes(terms.length);
    buildTags(terms, arrivals);

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
    playing = true;
    if (!rafId) rafId = requestAnimationFrame(frame);
  }

  // Moves the clock to any moment; used by Skip and handy when tuning a shot.
  function seek(time) {
    if (!playing) return;
    const raw = clockTime(performance.now()) - timeOffset;
    timeOffset = time - raw;
    lastT = time;
  }

  // Jump to the closing shot; the scene keeps drifting behind the summary.
  function skipToEnd() {
    if (!playing) return;
    completed = true;
    seek(T.end + 1.4);
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

  // Frees everything the cinematic made. It cannot play again afterwards.
  function dispose() {
    stop();
    clearTags();
    const seen = new Set();
    const release = (item) => {
      if (!item || seen.has(item)) return;
      seen.add(item);
      if (item.map) release(item.map);
      item.dispose();
    };
    scene.traverse((child) => {
      release(child.geometry);
      (Array.isArray(child.material) ? child.material : [child.material]).forEach(release);
    });
    release(glowTexture);
    release(wallTexture);
    renderer.dispose();
    world.built = false;
  }

  return { available: true, play, seek, skipToEnd, stop, dispose };
}
