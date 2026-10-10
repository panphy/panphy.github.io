import * as THREE from 'three';
import { GLOW_GAIN } from './visuals.js';
import { LOW_POLY_CREATURES, buildPulseHeart, buildMimicChest } from './lowpoly-creatures.js';

const materialCache = new Map();

function getCachedMaterial(key, options) {
  if (!materialCache.has(key)) {
    const mat = new THREE.MeshStandardMaterial({ vertexColors: true, ...options });
    mat.userData.isShared = true;
    const origColor = mat.color;
    const gray = 0.299 * origColor.r + 0.587 * origColor.g + 0.114 * origColor.b;
    const stunColor = new THREE.Color(
      gray * 0.3 + 0.05,
      gray * 0.6 + 0.2,
      gray * 0.9 + 0.45
    );
    const stunMat = mat.clone();
    stunMat.color.copy(stunColor);
    if (stunMat.emissive) {
      stunMat.emissive.setRGB(0.1, 0.35, 0.6);
      stunMat.emissiveIntensity = 0.8;
    }
    stunMat.userData.isShared = true;
    mat.userData.stunMaterial = stunMat;
    materialCache.set(key, mat);
  }
  return materialCache.get(key);
}

// Stands in for a PointLight on an enemy. Adding and removing real lights changes
// the scene's light count, which makes every shader recompile and stalls a frame;
// the game instead lends these anchors a light from a fixed pool each frame.
function createGlowAnchor(color, intensity, distance, decay = 2) {
  const anchor = new THREE.Object3D();
  anchor.isGlow = true;
  anchor.color = new THREE.Color(color);
  anchor.intensity = intensity;
  anchor.distance = distance;
  anchor.decay = decay;
  return anchor;
}

// What the low-poly creature builders need: faceted materials, glowing ones, and a
// mesh factory that sets up shadows and stun tinting.
const lowPolyKit = {
  mat(color, options = {}) {
    return getCachedMaterial(`lowpoly-${color}-${options.side ?? 0}`, {
      color, roughness: 0.92, metalness: 0, flatShading: true, vertexColors: false, ...options,
    });
  },
  glow(color, intensity = 1.5, options = {}) {
    return getCachedMaterial(`lowpoly-glow-${color}-${intensity}-${options.wireframe ? 'wire' : 'solid'}`, {
      color, emissive: color, emissiveIntensity: intensity, roughness: 0.4, flatShading: true, vertexColors: false, ...options,
    });
  },
  mesh(geometry, material) {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    if (material.userData.stunMaterial) {
      mesh.userData.normalMaterial = material;
      mesh.userData.stunMaterial = material.userData.stunMaterial;
    }
    return mesh;
  },
};

export function createEnemyMesh(type) {
  if (!!type.isMedic) return createMedicHeartMesh(type);
  if (!!type.isMimic) return createMimicChestMesh(type);
  if (!!type.isBoss) return createSpecificBossMesh(type);
  return createNormalEnemyMesh(type);
}

function createNormalEnemyMesh(type) {
  const g = LOW_POLY_CREATURES[type.name](type, lowPolyKit);
  const incomingBeacon = createIncomingBeacon(type);
  const targetMarker = createTargetMarker(type);
  g.add(incomingBeacon, targetMarker);
  g.userData.incomingBeacon = incomingBeacon;
  g.userData.targetMarker = targetMarker;
  return g;
}

function createMedicHeartMesh(type) {
  const group = buildPulseHeart(type, lowPolyKit);

  const medicGlow = createGlowAnchor(type.body, 1.35, 5.2, 2.0);
  medicGlow.position.set(0, 1.5, 0.45);
  group.add(medicGlow);

  const incomingBeacon = createIncomingBeacon(type);
  const targetMarker = createTargetMarker(type);
  group.add(incomingBeacon, targetMarker);
  group.userData.incomingBeacon = incomingBeacon;
  group.userData.targetMarker = targetMarker;

  return group;
}

function finishBossGroup(group, type, beaconY = 2.9) {
  const glow = createGlowAnchor(type.eye, 1.35, 5.5, 2.1);
  glow.position.set(0, 1.45, 0.45);
  group.add(glow);
  const incomingBeacon = createIncomingBeacon(type);
  incomingBeacon.position.set(0, beaconY, 0);
  const targetMarker = createTargetMarker(type);
  group.add(incomingBeacon, targetMarker);
  group.userData.incomingBeacon = incomingBeacon;
  group.userData.targetMarker = targetMarker;
  return group;
}

export function createMimicChestMesh(type) {
  const { group: g, lid: lidGroup } = buildMimicChest(type, lowPolyKit);

  // Glow inside the chest (intensity driven each frame)
  const light = createGlowAnchor(type.eye, 0.5, 6.0);
  light.position.set(0, 0.55, 0.1);
  g.add(light);

  // Outer golden glow — casts warm light on ground around the chest
  const outerGlow = createGlowAnchor(0xffd040, 1.0, 4.5);
  outerGlow.position.set(0, 1.6, 0);
  g.add(outerGlow);

  // Incoming beacon & target marker
  const incomingBeacon = createIncomingBeacon(type);
  const targetMarker = createTargetMarker(type);
  g.add(incomingBeacon, targetMarker);

  g.userData.lidGroup = lidGroup;
  g.userData.chestLight = light;
  g.userData.incomingBeacon = incomingBeacon;
  g.userData.targetMarker = targetMarker;

  return g;
}

// Height of the "incoming" beacon above each boss, to clear its head, horns or hammer.
const BOSS_BEACON_HEIGHTS = {
  'Verdant Colossus': 3.2,
  'Solar Anvil': 3.1,
  'Glacial Titan': 3.3,
  'Void Specter': 3.1,
  'Celestial Arbiter': 3.2,
  'Phantom Rift': 3.2,
  'Stellar Dreadnought': 2.7,
};

function createSpecificBossMesh(type) {
  const build = LOW_POLY_CREATURES[type.name] || LOW_POLY_CREATURES['Crimson Bulwark'];
  return finishBossGroup(build(type, lowPolyKit), type, BOSS_BEACON_HEIGHTS[type.name] ?? 2.9);
}

function createIncomingBeacon(type) {
  const material = new THREE.MeshBasicMaterial({
    color: new THREE.Color(type.eye).multiplyScalar(GLOW_GAIN),
    transparent: true,
    opacity: 0.58,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const beacon = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.42, 0.42), material);
  beacon.position.set(0, 2.72, 0);
  return beacon;
}

function createTargetMarker(type) {
  const marker = new THREE.Group();
  const material = new THREE.MeshBasicMaterial({
    color: new THREE.Color(type.eye).multiplyScalar(GLOW_GAIN),
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const longSide = new THREE.BoxGeometry(1.85, 0.055, 0.12);
  const shortSide = new THREE.BoxGeometry(0.12, 0.055, 1.85);
  const front = new THREE.Mesh(longSide, material);
  const back = new THREE.Mesh(longSide.clone(), material);
  const left = new THREE.Mesh(shortSide, material);
  const right = new THREE.Mesh(shortSide.clone(), material);
  front.position.set(0, 0.08, 0.92);
  back.position.set(0, 0.08, -0.92);
  left.position.set(-0.92, 0.08, 0);
  right.position.set(0.92, 0.08, 0);
  marker.add(front, back, left, right);
  marker.visible = false;
  marker.userData.material = material;
  return marker;
}
