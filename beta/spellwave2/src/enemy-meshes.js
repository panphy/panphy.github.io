import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.164.1/build/three.module.js';

export function createEnemyMesh(type) {
  if (!!type.isMedic) return createMedicHeartMesh(type);
  if (!!type.isMimic) return createMimicChestMesh(type);
  if (!!type.isBoss) return createSpecificBossMesh(type);
  return createNormalEnemyMesh(type);
}

function createNormalEnemyMesh(type) {
  const bodyMat = new THREE.MeshStandardMaterial({ color: type.body, roughness: 0.82, metalness: 0.03 });
  const trimMat = new THREE.MeshStandardMaterial({ color: type.trim, roughness: 0.78, metalness: 0.02 });
  const eyeMat = new THREE.MeshStandardMaterial({ color: type.eye, emissive: type.eye, emissiveIntensity: 0.9, roughness: 0.4 });
  let g;
  if (type.name === 'Mudlug') g = createSlugMesh(bodyMat, trimMat, eyeMat);
  else if (type.name === 'Glowmite') g = createInsectMesh(bodyMat, trimMat, eyeMat);
  else if (type.name === 'Ash Oaf') g = createGolemMesh(bodyMat, trimMat, eyeMat);
  else if (type.name === 'Cinder Imp') g = createImpMesh(bodyMat, trimMat, eyeMat);
  else g = createSpecterMesh(bodyMat, trimMat, eyeMat);
  const incomingBeacon = createIncomingBeacon(type);
  const targetMarker = createTargetMarker(type);
  g.add(incomingBeacon, targetMarker);
  g.userData.incomingBeacon = incomingBeacon;
  g.userData.targetMarker = targetMarker;
  return g;
}

// Mudlug — squat toad goblin: wide crouching body, big forward eyes with brow ridge, wide mouth, splayed feet
function createSlugMesh(bodyMat, trimMat, eyeMat) {
  const g = new THREE.Group();
  g.add(blockMesh(1.4, 0.7, 0.76, bodyMat, 0, 0.5, 0));
  g.add(blockMesh(1.1, 0.18, 0.72, trimMat, 0, 0.18, 0.04));
  g.add(blockMesh(1.0, 0.56, 0.7, trimMat, 0, 1.08, 0.02));
  g.add(blockMesh(1.06, 0.14, 0.2, bodyMat, 0, 1.4, 0.32));
  g.add(blockMesh(0.28, 0.28, 0.1, eyeMat, -0.28, 1.22, 0.38));
  g.add(blockMesh(0.28, 0.28, 0.1, eyeMat, 0.28, 1.22, 0.38));
  g.add(blockMesh(0.64, 0.1, 0.08, bodyMat, 0, 0.96, 0.38));
  g.add(blockMesh(0.36, 0.22, 0.52, trimMat, -0.66, 0.14, 0.06));
  g.add(blockMesh(0.36, 0.22, 0.52, trimMat, 0.66, 0.14, 0.06));
  g.add(blockMesh(0.22, 0.3, 0.36, bodyMat, -0.88, 0.68, 0.04));
  g.add(blockMesh(0.22, 0.3, 0.36, bodyMat, 0.88, 0.68, 0.04));
  return g;
}

// Glowmite — spindly insect: bulbous abdomen, thin thorax, 3 leg pairs, antennae, 4 eyes
function createInsectMesh(bodyMat, trimMat, eyeMat) {
  const g = new THREE.Group();
  g.add(blockMesh(0.58, 0.56, 0.54, trimMat, 0, 0.32, -0.16));
  g.add(blockMesh(0.38, 0.48, 0.38, bodyMat, 0, 0.84, 0.04));
  g.add(blockMesh(0.4, 0.36, 0.4, trimMat, 0, 1.3, 0.04));
  g.add(blockMesh(0.13, 0.13, 0.08, eyeMat, -0.12, 1.4, 0.26));
  g.add(blockMesh(0.13, 0.13, 0.08, eyeMat, 0.12, 1.4, 0.26));
  g.add(blockMesh(0.1, 0.1, 0.07, eyeMat, -0.08, 1.28, 0.26));
  g.add(blockMesh(0.1, 0.1, 0.07, eyeMat, 0.08, 1.28, 0.26));
  g.add(blockMesh(0.07, 0.38, 0.07, trimMat, -0.14, 1.6, 0.06));
  g.add(blockMesh(0.07, 0.38, 0.07, trimMat, 0.14, 1.6, 0.06));
  for (let i = 0; i < 3; i++) {
    const y = 0.98 - i * 0.26;
    g.add(blockMesh(0.52, 0.09, 0.12, trimMat, -0.45, y, 0.04));
    g.add(blockMesh(0.52, 0.09, 0.12, trimMat, 0.45, y, 0.04));
  }
  return g;
}

// Ash Oaf — heavy stone golem: massive torso, head sunk in shoulders, boulder fists, flat feet
function createGolemMesh(bodyMat, trimMat, eyeMat) {
  const g = new THREE.Group();
  g.add(blockMesh(1.46, 1.32, 0.9, bodyMat, 0, 0.82, 0));
  g.add(blockMesh(1.62, 0.22, 0.94, trimMat, 0, 1.5, -0.02));
  g.add(blockMesh(0.94, 0.52, 0.78, trimMat, 0, 1.78, 0.04));
  g.add(blockMesh(0.86, 0.16, 0.26, bodyMat, 0, 2.0, 0.36));
  g.add(blockMesh(0.22, 0.2, 0.08, eyeMat, -0.24, 1.86, 0.42));
  g.add(blockMesh(0.22, 0.2, 0.08, eyeMat, 0.24, 1.86, 0.42));
  g.add(blockMesh(0.26, 0.44, 0.48, bodyMat, -0.89, 0.64, 0.02));
  g.add(blockMesh(0.26, 0.44, 0.48, bodyMat, 0.89, 0.64, 0.02));
  g.add(blockMesh(0.54, 0.64, 0.6, trimMat, -1.08, 0.58, 0.04));
  g.add(blockMesh(0.54, 0.64, 0.6, trimMat, 1.08, 0.58, 0.04));
  for (let i = -1; i <= 1; i++) {
    g.add(blockMesh(0.1, 0.12, 0.1, bodyMat, -1.08 + i * 0.16, 0.28, 0.34));
    g.add(blockMesh(0.1, 0.12, 0.1, bodyMat, 1.08 + i * 0.16, 0.28, 0.34));
  }
  g.add(blockMesh(0.62, 0.26, 0.7, trimMat, -0.36, 0.14, 0.08));
  g.add(blockMesh(0.62, 0.26, 0.7, trimMat, 0.36, 0.14, 0.08));
  return g;
}

// Cinder Imp — slim body, curved multi-block horns with glowing tips, stepping tail with glowing tip
function createImpMesh(bodyMat, trimMat, eyeMat) {
  const g = new THREE.Group();
  g.add(blockMesh(0.74, 1.06, 0.56, bodyMat, 0, 0.8, 0));
  g.add(blockMesh(0.66, 0.6, 0.62, trimMat, 0, 1.6, 0.02));
  g.add(blockMesh(0.26, 0.86, 0.34, bodyMat, -0.64, 0.8, 0.02));
  g.add(blockMesh(0.26, 0.86, 0.34, bodyMat, 0.64, 0.8, 0.02));
  g.add(blockMesh(0.36, 0.26, 0.48, trimMat, -0.26, 0.15, 0.08));
  g.add(blockMesh(0.36, 0.26, 0.48, trimMat, 0.26, 0.15, 0.08));
  g.add(blockMesh(0.14, 0.14, 0.08, eyeMat, -0.18, 1.68, 0.34));
  g.add(blockMesh(0.14, 0.14, 0.08, eyeMat, 0.18, 1.68, 0.34));
  g.add(blockMesh(0.14, 0.2, 0.14, trimMat, -0.26, 2.06, 0.02));
  g.add(blockMesh(0.12, 0.26, 0.12, trimMat, -0.42, 2.26, 0.02));
  g.add(blockMesh(0.1, 0.22, 0.1, trimMat, -0.56, 2.44, 0.02));
  g.add(blockMesh(0.08, 0.16, 0.08, eyeMat, -0.66, 2.57, 0.02));
  g.add(blockMesh(0.14, 0.2, 0.14, trimMat, 0.26, 2.06, 0.02));
  g.add(blockMesh(0.12, 0.26, 0.12, trimMat, 0.42, 2.26, 0.02));
  g.add(blockMesh(0.1, 0.22, 0.1, trimMat, 0.56, 2.44, 0.02));
  g.add(blockMesh(0.08, 0.16, 0.08, eyeMat, 0.66, 2.57, 0.02));
  g.add(blockMesh(0.22, 0.2, 0.36, bodyMat, 0, 0.5, -0.52));
  g.add(blockMesh(0.18, 0.2, 0.28, bodyMat, 0, 0.64, -0.84));
  g.add(blockMesh(0.14, 0.18, 0.2, trimMat, 0, 0.76, -1.06));
  g.add(blockMesh(0.1, 0.14, 0.14, eyeMat, 0, 0.86, -1.22));
  return g;
}

// Bog Shambler — tall cloaked specter: layered cloak, thin torso+neck, oversized head, long drooping arms
function createSpecterMesh(bodyMat, trimMat, eyeMat) {
  const g = new THREE.Group();
  g.add(blockMesh(1.36, 0.2, 0.82, bodyMat, 0, 0.1, -0.02));
  g.add(blockMesh(1.14, 0.28, 0.74, trimMat, 0, 0.3, -0.01));
  g.add(blockMesh(0.92, 0.32, 0.66, bodyMat, 0, 0.54, 0));
  g.add(blockMesh(0.74, 0.36, 0.58, trimMat, 0, 0.78, 0));
  g.add(blockMesh(0.56, 0.58, 0.5, bodyMat, 0, 1.1, 0.02));
  g.add(blockMesh(0.26, 0.44, 0.26, trimMat, 0, 1.56, 0.02));
  g.add(blockMesh(0.76, 0.64, 0.68, trimMat, 0, 2.06, 0.02));
  g.add(blockMesh(0.2, 0.2, 0.1, eyeMat, -0.2, 2.14, 0.37));
  g.add(blockMesh(0.2, 0.2, 0.1, eyeMat, 0.2, 2.14, 0.37));
  g.add(blockMesh(0.32, 0.2, 0.36, trimMat, -0.42, 1.32, 0.02));
  g.add(blockMesh(0.32, 0.2, 0.36, trimMat, 0.42, 1.32, 0.02));
  g.add(blockMesh(0.2, 1.04, 0.26, bodyMat, -0.48, 0.82, 0.06));
  g.add(blockMesh(0.2, 1.04, 0.26, bodyMat, 0.48, 0.82, 0.06));
  g.add(blockMesh(0.28, 0.18, 0.3, trimMat, -0.48, 0.22, 0.08));
  g.add(blockMesh(0.28, 0.18, 0.3, trimMat, 0.48, 0.22, 0.08));
  g.add(blockMesh(0.06, 0.22, 0.06, trimMat, -0.6, 0.1, 0.2));
  g.add(blockMesh(0.06, 0.22, 0.06, trimMat, -0.44, 0.08, 0.22));
  g.add(blockMesh(0.06, 0.22, 0.06, trimMat, 0.44, 0.08, 0.22));
  g.add(blockMesh(0.06, 0.22, 0.06, trimMat, 0.6, 0.1, 0.2));
  return g;
}

function createMedicHeartMesh(type) {
  const group = new THREE.Group();
  const heartMaterial = new THREE.MeshStandardMaterial({
    color: type.body,
    emissive: type.body,
    emissiveIntensity: 0.5,
    roughness: 0.42,
    metalness: 0.02,
  });
  const highlightMaterial = new THREE.MeshStandardMaterial({
    color: type.trim,
    emissive: type.trim,
    emissiveIntensity: 0.62,
    roughness: 0.34,
    metalness: 0.02,
  });
  const shineMaterial = new THREE.MeshStandardMaterial({
    color: type.eye,
    emissive: type.eye,
    emissiveIntensity: 1.6,
    roughness: 0.25,
  });

  const cell = 0.3;
  const rows = [
    { y: 2.22, xs: [-0.45, 0.45], material: highlightMaterial },
    { y: 1.94, xs: [-0.75, -0.45, -0.15, 0.15, 0.45, 0.75], material: heartMaterial },
    { y: 1.66, xs: [-0.9, -0.6, -0.3, 0, 0.3, 0.6, 0.9], material: heartMaterial },
    { y: 1.38, xs: [-0.6, -0.3, 0, 0.3, 0.6], material: heartMaterial },
    { y: 1.1, xs: [-0.3, 0, 0.3], material: heartMaterial },
    { y: 0.82, xs: [0], material: heartMaterial },
  ];

  for (const row of rows) {
    for (const x of row.xs) {
      group.add(blockMesh(cell, cell, 0.46, row.material, x, row.y, 0));
    }
  }

  group.add(blockMesh(0.18, 0.18, 0.5, shineMaterial, -0.42, 2.02, 0.08));
  group.add(blockMesh(0.12, 0.12, 0.5, shineMaterial, -0.2, 1.8, 0.09));

  const medicGlow = new THREE.PointLight(type.body, 1.35, 5.2, 2.0);
  medicGlow.position.set(0, 1.5, 0.45);
  group.add(medicGlow);

  const incomingBeacon = createIncomingBeacon(type);
  const targetMarker = createTargetMarker(type);
  group.add(incomingBeacon, targetMarker);
  group.userData.incomingBeacon = incomingBeacon;
  group.userData.targetMarker = targetMarker;

  return group;
}

function bossMat(type) {
  return new THREE.MeshStandardMaterial({
    color: type.body, emissive: type.body, emissiveIntensity: 0.56,
    roughness: 0.58, metalness: 0.03,
  });
}
function bossTrimMat(type) {
  return new THREE.MeshStandardMaterial({
    color: type.trim, emissive: type.trim, emissiveIntensity: 0.82,
    roughness: 0.46, metalness: 0.08,
  });
}
function bossEyeMat(type) {
  return new THREE.MeshStandardMaterial({
    color: type.eye, emissive: type.eye, emissiveIntensity: 2.2, roughness: 0.4,
  });
}
function finishBossGroup(group, type, beaconY = 2.9) {
  const glow = new THREE.PointLight(type.eye, 1.35, 5.5, 2.1);
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
  const bodyMat = new THREE.MeshStandardMaterial({ color: type.body, emissive: 0x7a4c10, emissiveIntensity: 0.4, roughness: 0.6, metalness: 0.12 });
  const trimMat = new THREE.MeshStandardMaterial({ color: type.trim, emissive: 0xffe060, emissiveIntensity: 0.55, roughness: 0.18, metalness: 1.0 });
  const eyeMat = new THREE.MeshStandardMaterial({ color: type.eye, emissive: type.eye, emissiveIntensity: 2.8, roughness: 0.1 });
  const darkInteriorMat = new THREE.MeshStandardMaterial({ color: 0x0e0115, roughness: 0.9 });
  const toothMat = new THREE.MeshStandardMaterial({ color: 0xf5f0dc, emissive: 0xfff4cc, emissiveIntensity: 0.22, roughness: 0.55 });
  const gemMat = new THREE.MeshStandardMaterial({ color: type.eye, emissive: type.eye, emissiveIntensity: 3.5, roughness: 0.05, metalness: 0.4 });

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

  // PointLight inside the chest (intensity driven each frame)
  const light = new THREE.PointLight(type.eye, 0.5, 6.0);
  light.position.set(0, 0.55, 0.1);
  g.add(light);

  // Outer golden glow — casts warm light on ground around the chest
  const outerGlow = new THREE.PointLight(0xffd040, 1.0, 4.5);
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

function createSpecificBossMesh(type) {
  if (type.name === 'Crimson Bulwark') return createDragonBossMesh(type);
  if (type.name === 'Verdant Colossus') return createDevilBossMesh(type);
  if (type.name === 'Storm Warden') return createSkeletonBossMesh(type);
  if (type.name === 'Solar Anvil') return createSolarAnvilMesh(type);
  if (type.name === 'Glacial Titan') return createGlacialTitanMesh(type);
  if (type.name === 'Magma Sovereign') return createMagmaSovereignMesh(type);
  if (type.name === 'Void Specter') return createVoidSpecterMesh(type);
  if (type.name === 'Celestial Arbiter') return createCelestialArbiterMesh(type);
  if (type.name === 'Phantom Rift') return createPhantomRiftMesh(type);
  if (type.name === 'Stellar Dreadnought') return createStellarDreadnoughtMesh(type);
  return createPhoenixBossMesh(type);
}

function createDragonBossMesh(type) {
  const group = new THREE.Group();
  const bodyMat = bossMat(type);
  const trimMat = bossTrimMat(type);
  const eyeMat = bossEyeMat(type);
  // Swept-back claws (tucked under body, angled rear)
  group.add(blockMesh(0.36, 0.22, 0.42, bodyMat, -0.4, 0.50, -0.34));
  group.add(blockMesh(0.36, 0.22, 0.42, bodyMat, 0.4, 0.50, -0.34));
  group.add(blockMesh(0.28, 0.14, 0.28, trimMat, -0.4, 0.36, -0.66));
  group.add(blockMesh(0.28, 0.14, 0.28, trimMat, 0.4, 0.36, -0.66));
  // Torso
  group.add(blockMesh(1.2, 1.06, 0.88, bodyMat, 0, 0.9, 0));
  // Spine ridges
  group.add(blockMesh(0.12, 0.28, 0.12, trimMat, 0, 1.5, -0.28));
  group.add(blockMesh(0.12, 0.22, 0.12, trimMat, 0, 1.24, -0.3));
  group.add(blockMesh(0.12, 0.18, 0.12, trimMat, 0, 0.98, -0.3));
  // Neck
  group.add(blockMesh(0.52, 0.6, 0.52, bodyMat, 0, 1.65, 0.12));
  // Head
  group.add(blockMesh(0.84, 0.52, 0.62, trimMat, 0, 2.1, 0.18));
  // Snout
  group.add(blockMesh(0.6, 0.3, 0.44, bodyMat, 0, 2.0, 0.52));
  // Nostrils
  group.add(blockMesh(0.1, 0.1, 0.08, eyeMat, -0.18, 2.07, 0.75));
  group.add(blockMesh(0.1, 0.1, 0.08, eyeMat, 0.18, 2.07, 0.75));
  // Eyes
  group.add(blockMesh(0.18, 0.18, 0.08, eyeMat, -0.28, 2.22, 0.5));
  group.add(blockMesh(0.18, 0.18, 0.08, eyeMat, 0.28, 2.22, 0.5));
  // Horns
  const lHorn = blockMesh(0.14, 0.44, 0.14, trimMat, -0.32, 2.46, 0.06);
  lHorn.rotation.z = 0.38;
  group.add(lHorn);
  const rHorn = blockMesh(0.14, 0.44, 0.14, trimMat, 0.32, 2.46, 0.06);
  rHorn.rotation.z = -0.38;
  group.add(rHorn);
  // Wings — left (V-shape, rising outward from body)
  group.add(blockMesh(0.34, 0.62, 0.18, trimMat, -0.84, 1.40, -0.06));
  group.add(blockMesh(0.30, 0.72, 0.14, trimMat, -1.28, 1.74, 0));
  group.add(blockMesh(0.26, 0.60, 0.12, trimMat, -1.66, 2.10, 0.04));
  group.add(blockMesh(0.20, 0.48, 0.10, trimMat, -2.00, 2.44, 0.06));
  group.add(blockMesh(0.48, 0.80, 0.07, bodyMat, -1.06, 1.57, -0.02));
  group.add(blockMesh(0.42, 0.72, 0.07, bodyMat, -1.47, 1.92, 0.02));
  group.add(blockMesh(0.36, 0.60, 0.06, bodyMat, -1.83, 2.27, 0.05));
  // Wings — right (V-shape, rising outward from body)
  group.add(blockMesh(0.34, 0.62, 0.18, trimMat, 0.84, 1.40, -0.06));
  group.add(blockMesh(0.30, 0.72, 0.14, trimMat, 1.28, 1.74, 0));
  group.add(blockMesh(0.26, 0.60, 0.12, trimMat, 1.66, 2.10, 0.04));
  group.add(blockMesh(0.20, 0.48, 0.10, trimMat, 2.00, 2.44, 0.06));
  group.add(blockMesh(0.48, 0.80, 0.07, bodyMat, 1.06, 1.57, -0.02));
  group.add(blockMesh(0.42, 0.72, 0.07, bodyMat, 1.47, 1.92, 0.02));
  group.add(blockMesh(0.36, 0.60, 0.06, bodyMat, 1.83, 2.27, 0.05));
  // Tail
  group.add(blockMesh(0.4, 0.36, 0.48, bodyMat, 0, 0.62, -0.64));
  group.add(blockMesh(0.3, 0.28, 0.38, bodyMat, 0, 0.5, -1.1));
  group.add(blockMesh(0.22, 0.2, 0.28, trimMat, 0, 0.4, -1.46));
  return finishBossGroup(group, type);
}

function createDevilBossMesh(type) {
  const group = new THREE.Group();
  const bodyMat = bossMat(type);
  const trimMat = bossTrimMat(type);
  const eyeMat = bossEyeMat(type);
  // Legs
  group.add(blockMesh(0.42, 0.58, 0.5, bodyMat, -0.32, 0.52, 0.02));
  group.add(blockMesh(0.42, 0.58, 0.5, bodyMat, 0.32, 0.52, 0.02));
  // Hooves
  group.add(blockMesh(0.38, 0.28, 0.42, trimMat, -0.32, 0.16, 0.08));
  group.add(blockMesh(0.38, 0.28, 0.42, trimMat, 0.32, 0.16, 0.08));
  // Pelvis
  group.add(blockMesh(0.98, 0.22, 0.7, bodyMat, 0, 0.28, 0));
  // Torso
  group.add(blockMesh(1.22, 1.3, 0.78, bodyMat, 0, 0.9, 0));
  // Oversized arms
  group.add(blockMesh(0.38, 1.12, 0.5, bodyMat, -0.86, 0.9, 0.02));
  group.add(blockMesh(0.38, 1.12, 0.5, bodyMat, 0.86, 0.9, 0.02));
  // Clawed hands
  group.add(blockMesh(0.44, 0.24, 0.52, trimMat, -0.86, 0.24, 0.06));
  group.add(blockMesh(0.44, 0.24, 0.52, trimMat, 0.86, 0.24, 0.06));
  // Claws
  for (let i = -1; i <= 1; i++) {
    group.add(blockMesh(0.08, 0.16, 0.08, trimMat, -0.86 + i * 0.14, 0.08, 0.22));
    group.add(blockMesh(0.08, 0.16, 0.08, trimMat, 0.86 + i * 0.14, 0.08, 0.22));
  }
  // Shoulder guards
  group.add(blockMesh(0.28, 0.28, 0.24, trimMat, -0.82, 1.58, -0.04));
  group.add(blockMesh(0.22, 0.2, 0.2, trimMat, -0.98, 1.78, -0.04));
  group.add(blockMesh(0.28, 0.28, 0.24, trimMat, 0.82, 1.58, -0.04));
  group.add(blockMesh(0.22, 0.2, 0.2, trimMat, 0.98, 1.78, -0.04));
  // Head
  group.add(blockMesh(0.9, 0.72, 0.76, trimMat, 0, 1.9, 0.02));
  // Heavy brow
  group.add(blockMesh(0.88, 0.2, 0.26, bodyMat, 0, 2.14, 0.3));
  // Eyes
  group.add(blockMesh(0.2, 0.2, 0.08, eyeMat, -0.24, 1.96, 0.42));
  group.add(blockMesh(0.2, 0.2, 0.08, eyeMat, 0.24, 1.96, 0.42));
  // Nose + mouth
  group.add(blockMesh(0.24, 0.14, 0.12, bodyMat, 0, 1.76, 0.42));
  group.add(blockMesh(0.46, 0.1, 0.08, trimMat, 0, 1.6, 0.42));
  // Fangs
  group.add(blockMesh(0.08, 0.16, 0.08, trimMat, -0.14, 1.5, 0.42));
  group.add(blockMesh(0.08, 0.16, 0.08, trimMat, 0.14, 1.5, 0.42));
  // Curved horns — left (stepping outward and up)
  group.add(blockMesh(0.18, 0.22, 0.18, trimMat, -0.36, 2.32, 0));
  group.add(blockMesh(0.16, 0.3, 0.16, trimMat, -0.56, 2.52, 0));
  group.add(blockMesh(0.14, 0.26, 0.14, trimMat, -0.72, 2.74, 0));
  group.add(blockMesh(0.1, 0.22, 0.1, trimMat, -0.82, 2.94, 0));
  // Curved horns — right
  group.add(blockMesh(0.18, 0.22, 0.18, trimMat, 0.36, 2.32, 0));
  group.add(blockMesh(0.16, 0.3, 0.16, trimMat, 0.56, 2.52, 0));
  group.add(blockMesh(0.14, 0.26, 0.14, trimMat, 0.72, 2.74, 0));
  group.add(blockMesh(0.1, 0.22, 0.1, trimMat, 0.82, 2.94, 0));
  // Fork tail
  group.add(blockMesh(0.24, 0.24, 0.44, bodyMat, 0, 0.44, -0.52));
  group.add(blockMesh(0.2, 0.2, 0.38, bodyMat, 0, 0.34, -0.92));
  group.add(blockMesh(0.16, 0.16, 0.3, bodyMat, 0, 0.26, -1.24));
  group.add(blockMesh(0.1, 0.22, 0.1, trimMat, -0.1, 0.2, -1.52));
  group.add(blockMesh(0.1, 0.22, 0.1, trimMat, 0.1, 0.2, -1.52));
  return finishBossGroup(group, type, 3.2);
}

function createSkeletonBossMesh(type) {
  const group = new THREE.Group();
  const bodyMat = bossMat(type);
  const trimMat = bossTrimMat(type);
  const eyeMat = bossEyeMat(type);
  // Feet
  group.add(blockMesh(0.36, 0.2, 0.54, bodyMat, -0.34, 0.08, 0.14));
  group.add(blockMesh(0.36, 0.2, 0.54, bodyMat, 0.34, 0.08, 0.14));
  // Knee joints
  group.add(blockMesh(0.32, 0.22, 0.38, trimMat, -0.34, 0.24, 0.04));
  group.add(blockMesh(0.32, 0.22, 0.38, trimMat, 0.34, 0.24, 0.04));
  // Shins
  group.add(blockMesh(0.28, 0.56, 0.32, bodyMat, -0.34, 0.56, 0.02));
  group.add(blockMesh(0.28, 0.56, 0.32, bodyMat, 0.34, 0.56, 0.02));
  // Pelvis
  group.add(blockMesh(1.0, 0.26, 0.62, bodyMat, 0, 0.28, 0));
  // Spine
  group.add(blockMesh(0.2, 1.06, 0.2, bodyMat, 0, 0.94, -0.1));
  // Ribcage
  for (let i = 0; i < 4; i++) {
    const y = 0.66 + i * 0.22;
    const tilt = 0.28 + i * 0.06;
    const lRib = blockMesh(0.5, 0.1, 0.1, trimMat, -0.38, y, 0.06);
    lRib.rotation.z = tilt;
    group.add(lRib);
    const rRib = blockMesh(0.5, 0.1, 0.1, trimMat, 0.38, y, 0.06);
    rRib.rotation.z = -tilt;
    group.add(rRib);
  }
  // Clavicles
  group.add(blockMesh(0.62, 0.14, 0.36, bodyMat, -0.58, 1.56, 0));
  group.add(blockMesh(0.62, 0.14, 0.36, bodyMat, 0.58, 1.56, 0));
  // Upper arms
  group.add(blockMesh(0.22, 0.66, 0.26, bodyMat, -0.88, 1.14, 0.02));
  group.add(blockMesh(0.22, 0.66, 0.26, bodyMat, 0.88, 1.14, 0.02));
  // Elbow joints
  group.add(blockMesh(0.26, 0.2, 0.3, trimMat, -0.88, 0.76, 0.04));
  group.add(blockMesh(0.26, 0.2, 0.3, trimMat, 0.88, 0.76, 0.04));
  // Forearms
  group.add(blockMesh(0.2, 0.52, 0.22, bodyMat, -0.88, 0.44, 0.02));
  group.add(blockMesh(0.2, 0.52, 0.22, bodyMat, 0.88, 0.44, 0.02));
  // Skull (wider at top)
  group.add(blockMesh(0.8, 0.56, 0.68, trimMat, 0, 2.08, 0.02));
  // Cheekbones
  group.add(blockMesh(0.16, 0.16, 0.38, bodyMat, -0.38, 1.88, 0.08));
  group.add(blockMesh(0.16, 0.16, 0.38, bodyMat, 0.38, 1.88, 0.08));
  // Jaw
  group.add(blockMesh(0.64, 0.2, 0.48, bodyMat, 0, 1.72, 0.06));
  // Eye sockets (dark recess + glowing core)
  group.add(blockMesh(0.24, 0.22, 0.14, bodyMat, -0.2, 2.12, 0.28));
  group.add(blockMesh(0.24, 0.22, 0.14, bodyMat, 0.2, 2.12, 0.28));
  group.add(blockMesh(0.12, 0.12, 0.08, eyeMat, -0.2, 2.12, 0.38));
  group.add(blockMesh(0.12, 0.12, 0.08, eyeMat, 0.2, 2.12, 0.38));
  // Nasal cavity
  group.add(blockMesh(0.14, 0.18, 0.12, bodyMat, 0, 1.94, 0.34));
  // Teeth
  for (let i = -2; i <= 2; i++) {
    group.add(blockMesh(0.1, 0.14, 0.08, trimMat, i * 0.12, 1.74, 0.3));
  }
  // Crown / circlet
  group.add(blockMesh(0.86, 0.1, 0.74, bodyMat, 0, 2.38, 0));
  group.add(blockMesh(0.14, 0.24, 0.14, trimMat, -0.3, 2.48, 0));
  group.add(blockMesh(0.14, 0.34, 0.14, trimMat, 0, 2.56, 0));
  group.add(blockMesh(0.14, 0.24, 0.14, trimMat, 0.3, 2.48, 0));
  return finishBossGroup(group, type);
}

function createPhoenixBossMesh(type) {
  const group = new THREE.Group();
  const bodyMat = bossMat(type);
  const trimMat = bossTrimMat(type);
  const eyeMat = bossEyeMat(type);
  // Swept-back talons (tucked under body, angled rear)
  group.add(blockMesh(0.24, 0.20, 0.38, bodyMat, -0.30, 0.52, -0.34));
  group.add(blockMesh(0.24, 0.20, 0.38, bodyMat, 0.30, 0.52, -0.34));
  group.add(blockMesh(0.20, 0.14, 0.24, trimMat, -0.30, 0.38, -0.62));
  group.add(blockMesh(0.20, 0.14, 0.24, trimMat, 0.30, 0.38, -0.62));
  // Body
  group.add(blockMesh(0.96, 0.82, 0.82, bodyMat, 0, 1.08, 0));
  // Breast
  group.add(blockMesh(0.76, 0.6, 0.38, trimMat, 0, 0.96, 0.34));
  // Neck
  group.add(blockMesh(0.38, 0.44, 0.38, bodyMat, 0, 1.72, 0.1));
  // Head
  group.add(blockMesh(0.62, 0.56, 0.58, trimMat, 0, 2.18, 0.08));
  // Beak
  group.add(blockMesh(0.24, 0.2, 0.44, bodyMat, 0, 2.12, 0.46));
  group.add(blockMesh(0.2, 0.14, 0.36, trimMat, 0, 2.22, 0.56));
  // Eyes
  group.add(blockMesh(0.14, 0.16, 0.08, eyeMat, -0.24, 2.24, 0.38));
  group.add(blockMesh(0.14, 0.16, 0.08, eyeMat, 0.24, 2.24, 0.38));
  // Crest feathers
  group.add(blockMesh(0.1, 0.3, 0.1, trimMat, -0.16, 2.58, 0.04));
  group.add(blockMesh(0.1, 0.44, 0.1, trimMat, 0, 2.64, 0.04));
  group.add(blockMesh(0.1, 0.3, 0.1, trimMat, 0.16, 2.58, 0.04));
  // Wings — left (V-shape, rising outward from body)
  group.add(blockMesh(0.42, 0.76, 0.20, bodyMat, -0.86, 1.40, -0.04));
  group.add(blockMesh(0.38, 0.88, 0.16, bodyMat, -1.30, 1.74, 0));
  group.add(blockMesh(0.32, 0.76, 0.14, trimMat, -1.68, 2.06, 0.04));
  group.add(blockMesh(0.26, 0.56, 0.12, trimMat, -2.02, 2.34, 0.08));
  // Primary feathers cascading below the wing underside
  group.add(blockMesh(0.14, 0.28, 0.10, trimMat, -1.50, 1.45, 0.04));
  group.add(blockMesh(0.14, 0.28, 0.10, trimMat, -1.66, 1.60, 0.04));
  group.add(blockMesh(0.14, 0.28, 0.10, trimMat, -1.82, 1.74, 0.05));
  group.add(blockMesh(0.14, 0.28, 0.10, trimMat, -1.98, 1.89, 0.06));
  // Wings — right (V-shape, rising outward from body)
  group.add(blockMesh(0.42, 0.76, 0.20, bodyMat, 0.86, 1.40, -0.04));
  group.add(blockMesh(0.38, 0.88, 0.16, bodyMat, 1.30, 1.74, 0));
  group.add(blockMesh(0.32, 0.76, 0.14, trimMat, 1.68, 2.06, 0.04));
  group.add(blockMesh(0.26, 0.56, 0.12, trimMat, 2.02, 2.34, 0.08));
  // Primary feathers cascading below the wing underside
  group.add(blockMesh(0.14, 0.28, 0.10, trimMat, 1.50, 1.45, 0.04));
  group.add(blockMesh(0.14, 0.28, 0.10, trimMat, 1.66, 1.60, 0.04));
  group.add(blockMesh(0.14, 0.28, 0.10, trimMat, 1.82, 1.74, 0.05));
  group.add(blockMesh(0.14, 0.28, 0.10, trimMat, 1.98, 1.89, 0.06));
  // Flame tail feathers
  group.add(blockMesh(0.28, 0.6, 0.18, trimMat, 0, 0.76, -0.56));
  group.add(blockMesh(0.18, 0.72, 0.14, trimMat, -0.28, 0.7, -0.74));
  group.add(blockMesh(0.18, 0.72, 0.14, trimMat, 0.28, 0.7, -0.74));
  group.add(blockMesh(0.14, 0.56, 0.12, trimMat, -0.5, 0.62, -0.88));
  group.add(blockMesh(0.14, 0.56, 0.12, trimMat, 0.5, 0.62, -0.88));
  group.add(blockMesh(0.1, 0.4, 0.1, trimMat, -0.68, 0.54, -0.98));
  group.add(blockMesh(0.1, 0.4, 0.1, trimMat, 0.68, 0.54, -0.98));
  return finishBossGroup(group, type);
}

// Solar Anvil — wide flat forge-anvil body, floating hammer above
function createSolarAnvilMesh(type) {
  const group = new THREE.Group();
  const bodyMat = bossMat(type);
  const trimMat = bossTrimMat(type);
  const eyeMat = bossEyeMat(type);
  // Anvil base (very wide)
  group.add(blockMesh(1.6, 0.36, 0.88, bodyMat, 0, 0.18, 0));
  // Anvil waist
  group.add(blockMesh(0.88, 0.38, 0.70, bodyMat, 0, 0.56, 0));
  // Anvil top (wide flat surface)
  group.add(blockMesh(1.84, 0.26, 1.0, bodyMat, 0, 0.88, 0));
  // Horn (right front)
  group.add(blockMesh(0.68, 0.16, 0.28, bodyMat, 0.56, 0.92, 0.5));
  // Gold trim band across top
  group.add(blockMesh(1.88, 0.07, 1.04, trimMat, 0, 1.01, 0));
  // Forge glow slits (glowing rune marks)
  group.add(blockMesh(1.0, 0.1, 0.06, eyeMat, -0.1, 0.66, 0.46));
  group.add(blockMesh(0.76, 0.1, 0.06, eyeMat, 0.04, 0.50, 0.46));
  group.add(blockMesh(0.52, 0.1, 0.06, eyeMat, 0.12, 0.34, 0.46));
  // Corner rivets
  for (const [rx, rz] of [[-0.74, 0.42], [0.74, 0.42], [-0.74, -0.42], [0.74, -0.42]]) {
    group.add(blockMesh(0.14, 0.14, 0.14, trimMat, rx, 0.18, rz));
  }
  // Floating hammer (hovering above, tilted)
  const hamH = blockMesh(0.82, 0.46, 0.46, trimMat, 0.08, 2.12, 0);
  hamH.rotation.z = 0.24;
  group.add(hamH);
  const hamN = blockMesh(0.12, 0.86, 0.12, bodyMat, -0.18, 1.70, 0);
  hamN.rotation.z = 0.24;
  group.add(hamN);
  return finishBossGroup(group, type, 2.56);
}

// Glacial Titan — massive wide ice-crystal golem with shard growths
function createGlacialTitanMesh(type) {
  const group = new THREE.Group();
  const bodyMat = bossMat(type);
  const trimMat = bossTrimMat(type);
  const eyeMat = bossEyeMat(type);
  // Flat feet
  group.add(blockMesh(0.58, 0.22, 0.62, bodyMat, -0.52, 0.11, 0));
  group.add(blockMesh(0.58, 0.22, 0.62, bodyMat,  0.52, 0.11, 0));
  // Short thick legs
  group.add(blockMesh(0.52, 0.56, 0.52, bodyMat, -0.52, 0.5, 0));
  group.add(blockMesh(0.52, 0.56, 0.52, bodyMat,  0.52, 0.5, 0));
  // Pelvis
  group.add(blockMesh(1.28, 0.28, 0.72, bodyMat, 0, 0.34, 0));
  // Very broad torso
  group.add(blockMesh(1.62, 1.18, 0.82, bodyMat, 0, 1.1, 0));
  // Slab shoulders
  group.add(blockMesh(0.52, 0.44, 0.64, bodyMat, -1.18, 1.32, 0));
  group.add(blockMesh(0.52, 0.44, 0.64, bodyMat,  1.18, 1.32, 0));
  // Short arms
  group.add(blockMesh(0.38, 0.72, 0.44, bodyMat, -1.08, 0.78, 0));
  group.add(blockMesh(0.38, 0.72, 0.44, bodyMat,  1.08, 0.78, 0));
  // Large fists
  group.add(blockMesh(0.54, 0.46, 0.54, bodyMat, -1.08, 0.3, 0.1));
  group.add(blockMesh(0.54, 0.46, 0.54, bodyMat,  1.08, 0.3, 0.1));
  // Wide square head
  group.add(blockMesh(1.02, 0.74, 0.76, trimMat, 0, 2.1, 0));
  // Eyes
  group.add(blockMesh(0.24, 0.22, 0.08, eyeMat, -0.26, 2.18, 0.4));
  group.add(blockMesh(0.24, 0.22, 0.08, eyeMat,  0.26, 2.18, 0.4));
  // Ice crystal shards on left shoulder
  const ls1 = blockMesh(0.14, 0.62, 0.14, trimMat, -1.02, 2.0, -0.18);
  ls1.rotation.z = -0.3; group.add(ls1);
  const ls2 = blockMesh(0.12, 0.76, 0.12, trimMat, -1.24, 1.9, -0.06);
  ls2.rotation.z = -0.45; group.add(ls2);
  const ls3 = blockMesh(0.10, 0.52, 0.10, trimMat, -0.88, 2.1, -0.28);
  ls3.rotation.z = -0.18; group.add(ls3);
  // Ice crystal shards on right shoulder
  const rs1 = blockMesh(0.14, 0.62, 0.14, trimMat,  1.02, 2.0, -0.18);
  rs1.rotation.z =  0.3; group.add(rs1);
  const rs2 = blockMesh(0.12, 0.76, 0.12, trimMat,  1.24, 1.9, -0.06);
  rs2.rotation.z =  0.45; group.add(rs2);
  const rs3 = blockMesh(0.10, 0.52, 0.10, trimMat,  0.88, 2.1, -0.28);
  rs3.rotation.z =  0.18; group.add(rs3);
  // Ice crown spikes
  const cs1 = blockMesh(0.12, 0.56, 0.12, trimMat, -0.3, 2.56, 0);
  cs1.rotation.z = -0.12; group.add(cs1);
  group.add(blockMesh(0.14, 0.72, 0.14, trimMat, 0, 2.6, 0));
  const cs3 = blockMesh(0.12, 0.56, 0.12, trimMat, 0.3, 2.56, 0);
  cs3.rotation.z = 0.12; group.add(cs3);
  return finishBossGroup(group, type, 3.4);
}

// Magma Sovereign — hunched molten-rock boulder creature, no neck, asymmetric
function createMagmaSovereignMesh(type) {
  const group = new THREE.Group();
  const bodyMat = bossMat(type);
  const trimMat = bossTrimMat(type);
  const eyeMat = bossEyeMat(type);
  // Main hunched boulder body (offset slightly left)
  group.add(blockMesh(1.44, 1.26, 0.9, bodyMat, -0.12, 0.88, 0));
  // Side rock chunks
  group.add(blockMesh(0.72, 0.5, 0.62, bodyMat, -0.9, 0.38, 0.12));
  group.add(blockMesh(0.58, 0.4, 0.54, bodyMat,  0.82, 0.44, -0.08));
  // Boulder foot-clusters
  group.add(blockMesh(0.62, 0.32, 0.54, bodyMat, -0.46, 0.16, 0.28));
  group.add(blockMesh(0.52, 0.26, 0.46, bodyMat,  0.44, 0.22, 0.24));
  // Lava crack trim on front face
  group.add(blockMesh(0.96, 0.09, 0.06, trimMat, -0.1, 1.02, 0.46));
  group.add(blockMesh(0.52, 0.09, 0.06, trimMat,  0.28, 0.72, 0.46));
  group.add(blockMesh(0.72, 0.09, 0.06, trimMat, -0.28, 1.34, 0.46));
  // Left massive arm-slab (raised)
  group.add(blockMesh(0.48, 0.82, 0.48, bodyMat, -1.18, 1.0, 0.1));
  group.add(blockMesh(0.36, 0.32, 0.36, trimMat, -1.18, 1.5, 0.14));
  // Right smaller arm (lower, dragging)
  group.add(blockMesh(0.4, 0.62, 0.4, bodyMat, 1.04, 0.68, 0.08));
  // No-neck head (growing directly from body)
  group.add(blockMesh(0.88, 0.64, 0.72, bodyMat, -0.08, 1.84, 0.06));
  // Wide-set lava-slit eyes
  group.add(blockMesh(0.28, 0.16, 0.08, eyeMat, -0.3, 1.9, 0.42));
  group.add(blockMesh(0.28, 0.16, 0.08, eyeMat,  0.18, 1.9, 0.42));
  // Jagged rock crown
  group.add(blockMesh(0.2, 0.3, 0.18, bodyMat, -0.28, 2.4, -0.04));
  group.add(blockMesh(0.16, 0.44, 0.14, trimMat, 0, 2.48, -0.04));
  group.add(blockMesh(0.18, 0.34, 0.16, bodyMat, 0.28, 2.42, -0.04));
  return finishBossGroup(group, type);
}

// Void Specter — tall thin flying phantom, trailing tentacles, hooded
function createVoidSpecterMesh(type) {
  const group = new THREE.Group();
  const bodyMat = bossMat(type);
  const trimMat = bossTrimMat(type);
  const eyeMat = bossEyeMat(type);
  // Narrow cloaked body (tall trapezoid)
  group.add(blockMesh(0.72, 1.6, 0.52, bodyMat, 0, 1.1, 0));
  // Flaring cloak hem (wider at bottom)
  group.add(blockMesh(1.0, 0.24, 0.44, bodyMat, 0, 0.18, 0));
  group.add(blockMesh(0.84, 0.3, 0.44, bodyMat, 0, 0.38, 0));
  // Trailing tentacle strands below
  group.add(blockMesh(0.14, 0.56, 0.1, bodyMat, -0.42, -0.14, 0.08));
  group.add(blockMesh(0.12, 0.44, 0.1, bodyMat, -0.22, -0.22, 0.06));
  group.add(blockMesh(0.12, 0.62, 0.1, bodyMat,  0.02, -0.12, 0.08));
  group.add(blockMesh(0.12, 0.50, 0.1, bodyMat,  0.24, -0.18, 0.06));
  group.add(blockMesh(0.14, 0.48, 0.1, bodyMat,  0.44, -0.10, 0.08));
  // Glowing robe edge lines
  group.add(blockMesh(0.06, 1.52, 0.06, trimMat, -0.34, 1.08, 0.24));
  group.add(blockMesh(0.06, 1.52, 0.06, trimMat,  0.34, 1.08, 0.24));
  // Hood
  group.add(blockMesh(0.78, 0.42, 0.6, bodyMat, 0, 2.06, -0.04));
  group.add(blockMesh(0.62, 0.24, 0.5, bodyMat, 0, 2.38, -0.08));
  // Glowing face void within hood
  group.add(blockMesh(0.56, 0.34, 0.08, trimMat, 0, 2.04, 0.2));
  // Glowing eyes
  group.add(blockMesh(0.18, 0.18, 0.08, eyeMat, -0.16, 2.1, 0.24));
  group.add(blockMesh(0.18, 0.18, 0.08, eyeMat,  0.16, 2.1, 0.24));
  // Shoulder void-wisps
  group.add(blockMesh(0.18, 0.56, 0.14, trimMat, -0.48, 1.8, 0.06));
  group.add(blockMesh(0.18, 0.56, 0.14, trimMat,  0.48, 1.8, 0.06));
  return finishBossGroup(group, type, 2.6);
}

// Celestial Arbiter — angelic judge, slim body, large symmetric wings, halo
function createCelestialArbiterMesh(type) {
  const group = new THREE.Group();
  const bodyMat = bossMat(type);
  const trimMat = bossTrimMat(type);
  const eyeMat = bossEyeMat(type);
  // Slim robe body
  group.add(blockMesh(0.68, 1.56, 0.52, bodyMat, 0, 0.98, 0));
  // Hem flare at base
  group.add(blockMesh(0.92, 0.22, 0.64, bodyMat, 0, 0.11, 0));
  // Chest armor plate
  group.add(blockMesh(0.64, 0.56, 0.2, trimMat, 0, 1.14, 0.28));
  // Slim arms
  group.add(blockMesh(0.22, 0.72, 0.26, bodyMat, -0.54, 0.94, 0.02));
  group.add(blockMesh(0.22, 0.72, 0.26, bodyMat,  0.54, 0.94, 0.02));
  // Gauntlets
  group.add(blockMesh(0.28, 0.28, 0.34, trimMat, -0.54, 0.48, 0.04));
  group.add(blockMesh(0.28, 0.28, 0.34, trimMat,  0.54, 0.48, 0.04));
  // Head
  group.add(blockMesh(0.62, 0.62, 0.58, bodyMat, 0, 2.12, 0.02));
  // Eyes
  group.add(blockMesh(0.18, 0.18, 0.08, eyeMat, -0.18, 2.18, 0.32));
  group.add(blockMesh(0.18, 0.18, 0.08, eyeMat,  0.18, 2.18, 0.32));
  // Halo ring (8 blocks in a tilted oval)
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const hx = Math.cos(a) * 0.68;
    const hy = Math.sin(a) * 0.28;
    group.add(blockMesh(0.18, 0.18, 0.08, trimMat, hx, 2.82 + hy, -0.12));
  }
  // Wings — left (broad horizontal feather spread)
  group.add(blockMesh(0.62, 0.76, 0.14, bodyMat, -0.88, 1.66, -0.06));
  group.add(blockMesh(0.58, 0.88, 0.12, bodyMat, -1.48, 1.78, 0));
  group.add(blockMesh(0.48, 0.68, 0.10, bodyMat, -2.02, 1.9, 0.04));
  group.add(blockMesh(0.36, 0.52, 0.08, trimMat, -2.44, 2.04, 0.06));
  group.add(blockMesh(0.16, 0.36, 0.09, trimMat, -1.32, 1.4, 0.04));
  group.add(blockMesh(0.16, 0.36, 0.09, trimMat, -1.62, 1.54, 0.04));
  group.add(blockMesh(0.16, 0.36, 0.09, trimMat, -1.92, 1.68, 0.05));
  group.add(blockMesh(0.14, 0.30, 0.08, trimMat, -2.18, 1.82, 0.06));
  // Wings — right
  group.add(blockMesh(0.62, 0.76, 0.14, bodyMat,  0.88, 1.66, -0.06));
  group.add(blockMesh(0.58, 0.88, 0.12, bodyMat,  1.48, 1.78, 0));
  group.add(blockMesh(0.48, 0.68, 0.10, bodyMat,  2.02, 1.9, 0.04));
  group.add(blockMesh(0.36, 0.52, 0.08, trimMat,  2.44, 2.04, 0.06));
  group.add(blockMesh(0.16, 0.36, 0.09, trimMat,  1.32, 1.4, 0.04));
  group.add(blockMesh(0.16, 0.36, 0.09, trimMat,  1.62, 1.54, 0.04));
  group.add(blockMesh(0.16, 0.36, 0.09, trimMat,  1.92, 1.68, 0.05));
  group.add(blockMesh(0.14, 0.30, 0.08, trimMat,  2.18, 1.82, 0.06));
  return finishBossGroup(group, type, 3.1);
}

// Phantom Rift — geometric void entity: diamond core with orbiting ring fragments
function createPhantomRiftMesh(type) {
  const group = new THREE.Group();
  const bodyMat = bossMat(type);
  const trimMat = bossTrimMat(type);
  const eyeMat = bossEyeMat(type);
  // Diamond core — stacked blocks form a vertical diamond silhouette
  group.add(blockMesh(0.28, 0.28, 0.28, eyeMat,  0, 1.0, 0));
  group.add(blockMesh(0.7, 0.28, 0.54, bodyMat,  0, 1.22, 0));
  group.add(blockMesh(1.0, 0.28, 0.74, bodyMat,  0, 1.50, 0));
  group.add(blockMesh(1.2, 0.32, 0.86, trimMat,  0, 1.78, 0));
  group.add(blockMesh(0.98, 0.28, 0.72, bodyMat, 0, 2.06, 0));
  group.add(blockMesh(0.68, 0.28, 0.52, bodyMat, 0, 2.34, 0));
  group.add(blockMesh(0.28, 0.28, 0.28, trimMat, 0, 2.56, 0));
  // Bottom spike
  group.add(blockMesh(0.42, 0.28, 0.36, bodyMat, 0, 0.72, 0));
  group.add(blockMesh(0.2, 0.42, 0.2, trimMat,   0, 0.42, 0));
  // Orbiting ring fragments (8 evenly spaced)
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const fx = Math.cos(a) * 1.4;
    const fz = Math.sin(a) * 1.4;
    group.add(blockMesh(0.26, 0.12, 0.26, i % 2 === 0 ? trimMat : bodyMat, fx, 1.78, fz));
  }
  // Glowing eyes at widest band
  group.add(blockMesh(0.18, 0.18, 0.08, eyeMat, -0.18, 1.82, 0.44));
  group.add(blockMesh(0.18, 0.18, 0.08, eyeMat,  0.18, 1.82, 0.44));
  return finishBossGroup(group, type, 2.8);
}

// Stellar Dreadnought — massive armored fortress, very wide, gun batteries
function createStellarDreadnoughtMesh(type) {
  const group = new THREE.Group();
  const bodyMat = bossMat(type);
  const trimMat = bossTrimMat(type);
  const eyeMat = bossEyeMat(type);
  // Undercarriage / tracks
  group.add(blockMesh(2.2, 0.32, 1.0, bodyMat, 0, 0.28, 0));
  group.add(blockMesh(2.24, 0.1, 1.04, trimMat, 0, 0.1, 0));
  // Main hull
  group.add(blockMesh(2.1, 0.56, 0.96, bodyMat, 0, 0.68, 0));
  // Central command tower
  group.add(blockMesh(0.72, 0.64, 0.68, bodyMat, 0, 1.16, 0));
  group.add(blockMesh(0.62, 0.18, 0.58, trimMat, 0, 1.48, 0));
  // Viewport eyes
  group.add(blockMesh(0.18, 0.18, 0.08, eyeMat, -0.2, 1.22, 0.36));
  group.add(blockMesh(0.18, 0.18, 0.08, eyeMat,  0.2, 1.22, 0.36));
  // Left gun batteries
  group.add(blockMesh(0.54, 0.38, 0.54, bodyMat, -1.02, 0.82, 0));
  group.add(blockMesh(0.54, 0.38, 0.54, bodyMat, -1.66, 0.76, 0.1));
  group.add(blockMesh(0.14, 0.14, 0.72, trimMat, -0.96, 0.88, 0.52));
  group.add(blockMesh(0.14, 0.14, 0.72, trimMat, -1.60, 0.82, 0.54));
  // Right gun batteries
  group.add(blockMesh(0.54, 0.38, 0.54, bodyMat,  1.02, 0.82, 0));
  group.add(blockMesh(0.54, 0.38, 0.54, bodyMat,  1.66, 0.76, 0.1));
  group.add(blockMesh(0.14, 0.14, 0.72, trimMat,  0.96, 0.88, 0.52));
  group.add(blockMesh(0.14, 0.14, 0.72, trimMat,  1.60, 0.82, 0.54));
  // Armor trim stripes
  group.add(blockMesh(2.14, 0.08, 0.08, trimMat, 0, 0.96, 0.46));
  group.add(blockMesh(2.14, 0.08, 0.08, trimMat, 0, 0.68, 0.46));
  // Side shield plates
  group.add(blockMesh(0.22, 0.82, 0.84, bodyMat, -1.15, 0.68, -0.04));
  group.add(blockMesh(0.22, 0.82, 0.84, bodyMat,  1.15, 0.68, -0.04));
  return finishBossGroup(group, type, 1.72);
}

function createIncomingBeacon(type) {
  const material = new THREE.MeshBasicMaterial({
    color: type.eye,
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
    color: type.eye,
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
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}
