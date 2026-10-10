import * as THREE from 'three';
import { shadedBoxGeometry, GLOW_GAIN } from './visuals.js';
import { LOW_POLY_CREATURES, buildPulseHeart } from './lowpoly-creatures.js';

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

function getMimicBodyMat(type) {
  return getCachedMaterial(`mimic-body-${type.body}`, { color: type.body, emissive: 0x7a4c10, emissiveIntensity: 0.4, roughness: 0.6, metalness: 0.12 });
}
function getMimicTrimMat(type) {
  return getCachedMaterial(`mimic-trim-${type.trim}`, { color: type.trim, emissive: 0xffe060, emissiveIntensity: 0.55, roughness: 0.18, metalness: 1.0 });
}
function getMimicEyeMat(type) {
  return getCachedMaterial(`mimic-eye-${type.eye}`, { color: type.eye, emissive: type.eye, emissiveIntensity: 2.8, roughness: 0.1 });
}
function getMimicInteriorMat() {
  return getCachedMaterial('mimic-interior', { color: 0x0e0115, roughness: 0.9 });
}
function getMimicToothMat() {
  return getCachedMaterial('mimic-tooth', { color: 0xf5f0dc, emissive: 0xfff4cc, emissiveIntensity: 0.22, roughness: 0.55 });
}
function getMimicGemMat(type) {
  return getCachedMaterial(`mimic-gem-${type.eye}`, { color: type.eye, emissive: type.eye, emissiveIntensity: 3.5, roughness: 0.05, metalness: 0.4 });
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
// mesh factory that sets up shadows and stun tinting like blockMesh does.
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
  const bodyMat = getMimicBodyMat(type);
  const trimMat = getMimicTrimMat(type);
  const eyeMat = getMimicEyeMat(type);
  const darkInteriorMat = getMimicInteriorMat();
  const toothMat = getMimicToothMat();
  const gemMat = getMimicGemMat(type);

  const g = new THREE.Group();

  // Wood base (taller for presence)
  g.add(blockMesh(1.2, 0.56, 0.9, bodyMat, 0, 0.28, 0));

  // Dark interior tray visible when lid opens
  g.add(blockMesh(0.96, 0.10, 0.72, darkInteriorMat, 0, 0.52, 0));

  // Bottom base trim bar
  g.add(blockMesh(1.28, 0.09, 0.98, trimMat, 0, 0.045, 0));

  // Four corner pillars running full height
  g.add(blockMesh(0.12, 0.60, 0.12, trimMat, -0.59, 0.30, 0.42));
  g.add(blockMesh(0.12, 0.60, 0.12, trimMat,  0.59, 0.30, 0.42));
  g.add(blockMesh(0.12, 0.60, 0.12, trimMat, -0.59, 0.30, -0.42));
  g.add(blockMesh(0.12, 0.60, 0.12, trimMat,  0.59, 0.30, -0.42));

  // Mid-band gold strip on front face
  g.add(blockMesh(1.28, 0.07, 0.1, trimMat, 0, 0.50, 0.42));

  // Glowing eyes (large, bright)
  g.add(blockMesh(0.20, 0.20, 0.06, eyeMat, -0.24, 0.54, 0.18));
  g.add(blockMesh(0.20, 0.20, 0.06, eyeMat,  0.24, 0.54, 0.18));

  // Lower teeth (5 teeth, angled forward)
  for (let i = 0; i < 5; i++) {
    const x = -0.40 + i * 0.20;
    const tooth = blockMesh(0.09, 0.15, 0.09, toothMat, x, 0.54, 0.35);
    tooth.rotation.x = 0.25;
    g.add(tooth);
  }

  // Glow inside the chest (intensity driven each frame)
  const light = createGlowAnchor(type.eye, 0.5, 6.0);
  light.position.set(0, 0.55, 0.1);
  g.add(light);

  // Outer golden glow — casts warm light on ground around the chest
  const outerGlow = createGlowAnchor(0xffd040, 1.0, 4.5);
  outerGlow.position.set(0, 1.6, 0);
  g.add(outerGlow);

  // Lid Group — pivot at top-back edge of the base
  const lidGroup = new THREE.Group();
  lidGroup.position.set(0, 0.58, -0.45);
  g.add(lidGroup);

  // Lid wood
  lidGroup.add(blockMesh(1.2, 0.38, 0.9, bodyMat, 0, 0.19, 0.45));

  // Top cap trim strip
  lidGroup.add(blockMesh(1.28, 0.07, 0.98, trimMat, 0, 0.39, 0.45));

  // Front trim strip on lid
  lidGroup.add(blockMesh(1.28, 0.07, 0.1, trimMat, 0, 0.04, 0.88));

  // Lid corner posts
  lidGroup.add(blockMesh(0.12, 0.42, 0.12, trimMat, -0.59, 0.19, 0.02));
  lidGroup.add(blockMesh(0.12, 0.42, 0.12, trimMat,  0.59, 0.19, 0.02));
  lidGroup.add(blockMesh(0.12, 0.42, 0.12, trimMat, -0.59, 0.19, 0.88));
  lidGroup.add(blockMesh(0.12, 0.42, 0.12, trimMat,  0.59, 0.19, 0.88));

  // Lock clasp
  lidGroup.add(blockMesh(0.18, 0.24, 0.07, trimMat, 0, 0.02, 0.94));

  // Center magenta gem on lid front
  lidGroup.add(blockMesh(0.14, 0.14, 0.07, gemMat, 0, 0.21, 0.92));

  // Upper teeth (6 teeth, angled down)
  for (let i = 0; i < 6; i++) {
    const x = -0.46 + i * 0.185;
    const tooth = blockMesh(0.08, 0.15, 0.09, toothMat, x, 0.0, 0.81);
    tooth.rotation.x = -0.25;
    lidGroup.add(tooth);
  }

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

export function blockMesh(width, height, depth, material, x, y, z) {
  const mesh = new THREE.Mesh(shadedBoxGeometry(width, height, depth), material);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  if (material && material.userData) {
    if (material.userData.stunMaterial) {
      mesh.userData.normalMaterial = material;
      mesh.userData.stunMaterial = material.userData.stunMaterial;
    }
  }
  return mesh;
}
