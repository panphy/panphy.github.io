// wizard-hands.js — the player's own hands, in the bottom corners of the view.
//
// The right hand holds a wand that turns toward whatever is being typed at and flicks
// on every letter; the left is open, palm up, with a rune turning over it. Both hang
// from the camera, so they stay put on screen while it bobs and shakes. They add no
// lights: the wand tip and the rune are emissive.
import * as THREE from 'three';

// Where things sit in the camera's own space (x right, y up, −z into the scene).
const DEPTH = -1.6;
const HAND_Y = -0.57;
// How far in from the screen's edge each hand sits: the wand hand clears the potion
// panel in the bottom right corner, the open hand the buttons in the bottom left.
const WAND_INSET = 0.74;
const PALM_INSET = 0.42;
const MAX_HAND_X = 1.1;
const REST_AIM = new THREE.Vector3(0.28, 0.25, -9);

function part(geometry, material, x = 0, y = 0, z = 0) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  return mesh;
}

// A tapered length of finger or cloth with its thick end at the origin, running along +z.
function taper(material, fromRadius, toRadius, length, sides = 6) {
  const geometry = new THREE.CylinderGeometry(toRadius, fromRadius, length, sides);
  geometry.translate(0, length / 2, 0);
  geometry.rotateX(Math.PI / 2);
  return new THREE.Mesh(geometry, material);
}

// A wide bell sleeve: the hand comes out of a dark, gold-rimmed opening at the wrist
// (the origin), and the cloth runs back to the elbow with a fold and a hanging hem.
function createSleeve(materials, elbow) {
  const length = elbow.length();
  const group = new THREE.Group();
  const cloth = new THREE.CylinderGeometry(0.29, 0.145, length, 10, 3, true);
  cloth.translate(0, length / 2, 0);
  // Ruck the cloth a little so the facets catch the light like folds.
  const positions = cloth.attributes.position;
  for (let index = 0; index < positions.count; index += 1) {
    const y = positions.getY(index);
    const wave = 1 + Math.sin(index * 2.4 + y * 9) * 0.045;
    positions.setX(index, positions.getX(index) * wave);
    positions.setZ(index, positions.getZ(index) * wave);
  }
  cloth.computeVertexNormals();
  group.add(part(cloth, materials.sleeve));
  group.add(part(new THREE.TorusGeometry(0.147, 0.018, 5, 12).rotateX(Math.PI / 2), materials.trim));
  group.add(part(new THREE.TorusGeometry(0.162, 0.01, 4, 12).rotateX(Math.PI / 2), materials.trim, 0, 0.08, 0));
  const lining = new THREE.CylinderGeometry(0.12, 0.14, 0.16, 10, 1, true);
  group.add(part(lining, materials.lining, 0, 0.08, 0));
  group.add(part(new THREE.CircleGeometry(0.12, 10).rotateX(Math.PI / 2), materials.lining, 0, 0.16, 0));
  group.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), elbow.clone().normalize());
  // The hem hangs below the wrist whichever way the arm lies.
  const hem = part(new THREE.ConeGeometry(0.12, 0.3, 5), materials.sleeve, 0, -0.17, 0.05);
  hem.rotation.x = Math.PI;
  hem.scale.set(1, 1, 0.5);
  const hung = new THREE.Group();
  hung.add(hem);
  return { sleeve: group, hem: hung };
}

// One finger: three tapering joints, each bending toward the palm by its own curl,
// with a knuckle at every joint and a nail on the last.
function createFinger(materials, { length, radius, curls, nail = true }) {
  const root = new THREE.Group();
  const shares = [0.46, 0.3, 0.24];
  let parent = root;
  let thickness = radius;
  shares.forEach((share, index) => {
    const joint = new THREE.Group();
    joint.rotation.x = curls[index];
    parent.add(joint);
    const segment = length * share;
    const next = thickness * (index === 2 ? 0.72 : 0.88);
    joint.add(part(new THREE.IcosahedronGeometry(thickness * 1.08, 0), materials.knuckle));
    joint.add(taper(materials.skin, thickness, next, segment));
    if (index === 2) {
      joint.add(part(new THREE.IcosahedronGeometry(next * 1.02, 0), materials.skin, 0, 0, segment));
      if (nail) joint.add(part(new THREE.BoxGeometry(next * 1.3, next * 0.35, segment * 0.55), materials.nail, 0, next * 0.78, segment * 0.68));
    }
    const tip = new THREE.Group();
    tip.position.z = segment;
    joint.add(tip);
    parent = tip;
    thickness = next;
  });
  return root;
}

// A hand lying palm down: fingers along +z, the back of the hand up, the thumb on the
// inner side. `side` is 1 for a right hand and −1 for a left. `pose` gives each
// finger's three curls (index first) and the thumb's.
function createHand(materials, side, pose) {
  const hand = new THREE.Group();
  // The palm: broader at the knuckles than the wrist, with the pads that make a hand a hand.
  const palmGeometry = new THREE.CylinderGeometry(0.092, 0.066, 0.2, 8);
  palmGeometry.rotateX(Math.PI / 2);
  const palm = part(palmGeometry, materials.skin, 0, 0, 0.1);
  palm.scale.set(1, 0.36, 1);
  hand.add(palm);
  for (let index = 0; index < 4; index += 1) {
    const knuckle = part(new THREE.IcosahedronGeometry(0.0255 - (index === 3 ? 0.003 : 0), 0), materials.knuckle, side * (-0.063 + index * 0.0415), 0.012, 0.19 - Math.abs(index - 1.2) * 0.005);
    hand.add(knuckle);
  }
  const wristBone = part(new THREE.IcosahedronGeometry(0.03, 0), materials.knuckle, side * 0.062, 0.016, 0.012);
  hand.add(wristBone);
  const thenar = part(new THREE.IcosahedronGeometry(0.052, 0), materials.skinDark, -side * 0.052, -0.024, 0.07);
  thenar.scale.set(0.95, 0.6, 1.35);
  hand.add(thenar);
  const heel = part(new THREE.IcosahedronGeometry(0.045, 0), materials.skinDark, side * 0.05, -0.024, 0.07);
  heel.scale.set(0.9, 0.55, 1.5);
  hand.add(heel);
  // Tendons fanning out across the back of the hand.
  for (let index = 0; index < 4; index += 1) {
    const tendon = part(new THREE.BoxGeometry(0.011, 0.01, 0.1), materials.knuckle, -side * (0.063 - index * 0.042) * 0.78, 0.03, 0.125);
    tendon.rotation.y = side * (0.12 - index * 0.08);
    hand.add(tendon);
  }

  const fingers = [
    { x: -0.063, z: 0.19, length: 0.165, radius: 0.024 },
    { x: -0.021, z: 0.198, length: 0.185, radius: 0.025 },
    { x: 0.021, z: 0.194, length: 0.17, radius: 0.024 },
    { x: 0.061, z: 0.182, length: 0.135, radius: 0.021 },
  ];
  fingers.forEach((finger, index) => {
    const built = createFinger(materials, { length: finger.length, radius: finger.radius, curls: pose.fingers[index] });
    built.position.set(side * finger.x, 0, finger.z);
    built.rotation.y = side * (pose.spread ?? 0.07) * (index - 1.5);
    hand.add(built);
  });

  // The thumb leaves the palm at an angle and has two joints.
  const thumb = new THREE.Group();
  thumb.position.set(-side * 0.078, -0.012, 0.062);
  thumb.rotation.order = 'YZX';
  thumb.rotation.y = -side * pose.thumb.out;
  thumb.rotation.z = -side * pose.thumb.roll;
  thumb.rotation.x = pose.thumb.curls[0];
  thumb.add(part(new THREE.IcosahedronGeometry(0.03, 0), materials.knuckle));
  thumb.add(taper(materials.skin, 0.027, 0.024, 0.075));
  const thumbTip = new THREE.Group();
  thumbTip.position.z = 0.075;
  thumbTip.rotation.x = pose.thumb.curls[1];
  thumbTip.add(part(new THREE.IcosahedronGeometry(0.026, 0), materials.knuckle));
  thumbTip.add(taper(materials.skin, 0.024, 0.018, 0.062));
  thumbTip.add(part(new THREE.IcosahedronGeometry(0.0185, 0), materials.skin, 0, 0, 0.062));
  thumbTip.add(part(new THREE.BoxGeometry(0.026, 0.008, 0.034), materials.nail, 0, 0.016, 0.044));
  thumb.add(thumbTip);
  hand.add(thumb);
  return hand;
}

// The wand hand: back of the hand toward the player, three fingers wrapped round the
// grip, the forefinger laid along the shaft and the thumb pressed on top.
function createWandHand(materials, crystalMaterial) {
  const wrist = new THREE.Group();
  const hand = createHand(materials, 1, {
    fingers: [[0.28, 0.4, 0.3], [0.85, 1.6, 1.0], [0.92, 1.62, 1.05], [1.0, 1.6, 1.1]],
    thumb: { out: 0.1, roll: 0.9, curls: [0.3, 0.5] },
    spread: 0.02,
  });
  // Turned as a real grip is, so the knuckles, the forefinger and the thumb all show.
  hand.rotation.z = -0.8;
  wrist.add(hand);
  
  const wand = new THREE.Group();
  wand.position.set(0.0, -0.035, 0.15);
  wand.rotation.x = -0.16;
  const shaft = new THREE.CylinderGeometry(0.011, 0.024, 0.86, 6);
  shaft.rotateX(Math.PI / 2);
  wand.add(part(shaft, materials.wood, 0, 0, 0.33));
  const grip = new THREE.CylinderGeometry(0.031, 0.027, 0.24, 6);
  grip.rotateX(Math.PI / 2);
  wand.add(part(grip, materials.woodDark, 0, 0, 0.0));
  wand.add(part(new THREE.IcosahedronGeometry(0.04, 0), materials.trim, 0, 0, -0.14));
  for (const z of [0.13, 0.19, 0.6]) {
    const ring = new THREE.CylinderGeometry(0.034 - z * 0.022, 0.034 - z * 0.022, 0.022, 6);
    ring.rotateX(Math.PI / 2);
    wand.add(part(ring, materials.trim, 0, 0, z));
  }
  const tip = new THREE.Group();
  tip.position.set(0, 0, 0.8);
  const crystal = part(new THREE.OctahedronGeometry(0.05, 0), crystalMaterial);
  crystal.scale.set(1, 1, 1.9);
  tip.add(crystal);
  for (let prong = 0; prong < 3; prong += 1) {
    const angle = (prong / 3) * Math.PI * 2;
    const claw = part(new THREE.ConeGeometry(0.008, 0.07, 4).rotateX(Math.PI / 2), materials.trim, Math.cos(angle) * 0.03, Math.sin(angle) * 0.03, -0.035);
    claw.rotation.set(-Math.sin(angle) * 0.4, Math.cos(angle) * 0.4, 0);
    tip.add(claw);
  }
  wand.add(tip);
  wrist.add(wand);
  return { wrist, tip };
}

// The open hand: palm up, fingers relaxed and a little cupped, a rune turning over it.
function createPalmHand(materials, crystalMaterial) {
  const wrist = new THREE.Group();
  const hand = createHand(materials, -1, {
    fingers: [[0.18, 0.35, 0.3], [0.24, 0.42, 0.34], [0.3, 0.48, 0.38], [0.38, 0.55, 0.42]],
    thumb: { out: 0.85, roll: 0.3, curls: [0.15, 0.3] },
    spread: 0.13,
  });
  // Rolled over so the palm faces up and tips toward the player.
  hand.rotation.z = Math.PI + 0.22;
  hand.position.y = 0.01;
  wrist.add(hand);

  const rune = new THREE.Group();
  rune.position.set(0.01, 0.2, 0.16);
  const core = part(new THREE.OctahedronGeometry(0.05, 0), crystalMaterial);
  core.scale.set(1, 1.6, 1);
  rune.add(core);
  const halo = part(new THREE.TorusGeometry(0.1, 0.009, 4, 12), crystalMaterial);
  halo.rotation.x = Math.PI / 2;
  rune.add(halo);
  const outer = part(new THREE.TorusGeometry(0.135, 0.005, 3, 6), crystalMaterial);
  outer.rotation.x = Math.PI / 2 + 0.5;
  rune.add(outer);
  for (let shard = 0; shard < 4; shard += 1) {
    const angle = (shard / 4) * Math.PI * 2;
    rune.add(part(new THREE.OctahedronGeometry(0.016, 0), crystalMaterial, Math.cos(angle) * 0.1, 0, Math.sin(angle) * 0.1));
  }
  wrist.add(rune);
  return { wrist, rune, halo, outer };
}

// `crystalMaterial` is the game's shared glowing material, so chain lightning recolours
// the wand tip and the rune along with everything else it lights up.
export function createWizardHands({ camera, crystalMaterial, createCrown = null }) {
  const flat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.9, flatShading: true, ...extra });
  const materials = {
    // A touch of their own light keeps the hands readable at night and underground.
    sleeve: flat(0x4a3fb0, { side: THREE.DoubleSide, emissive: 0x1d1850, emissiveIntensity: 0.9 }),
    lining: flat(0x15122e),
    trim: flat(0xe2ad45, { roughness: 0.45, metalness: 0.15, side: THREE.DoubleSide, emissive: 0x6a4a10, emissiveIntensity: 0.6 }),
    skin: flat(0xe6b58f, { emissive: 0x6b3f28, emissiveIntensity: 0.55 }),
    skinDark: flat(0xd6a07c, { emissive: 0x6b3f28, emissiveIntensity: 0.5 }),
    knuckle: flat(0xd39b78, { emissive: 0x6b3f28, emissiveIntensity: 0.5 }),
    nail: flat(0xf6dccb, { roughness: 0.5, emissive: 0x6b4a3a, emissiveIntensity: 0.5 }),
    wood: flat(0x6b4226),
    woodDark: flat(0x4a2c18),
  };

  const group = new THREE.Group();
  const right = new THREE.Group();
  const left = new THREE.Group();
  group.add(right, left);
  for (const [arm, x] of [[right, 0.62], [left, -0.62]]) {
    const { sleeve, hem } = createSleeve(materials, new THREE.Vector3(x, -0.78, 0.5));
    arm.add(sleeve, hem);
  }
  const wandHand = createWandHand(materials, crystalMaterial);
  const palmHand = createPalmHand(materials, crystalMaterial);
  right.add(wandHand.wrist);
  left.add(palmHand.wrist);

  // Small lightning crowns, shown while chain lightning is primed.
  const crowns = [];
  if (createCrown) {
    for (const [parent, y] of [[wandHand.tip, 0.09], [palmHand.rune, 0.16]]) {
      // The game sizes and spins the crown itself, so a holder shrinks it to the hand.
      const crown = createCrown();
      crown.visible = false;
      const holder = new THREE.Group();
      holder.scale.setScalar(0.3);
      holder.position.y = y;
      holder.add(crown);
      parent.add(holder);
      crowns.push(crown);
    }
  }

  group.traverse((child) => {
    if (!child.isMesh) return;
    child.castShadow = false;
    child.receiveShadow = false;
    child.frustumCulled = false;
  });
  camera.add(group);

  const aim = new THREE.Vector3();
  const wanted = new THREE.Vector3();
  const palmAim = new THREE.Vector3();
  let aimReady = false;
  let flick = 0;
  let flickStrength = 0;
  let flare = 0;

  return {
    group,
    crowns,
    // What pulses with the magic: scaled by the game along with its other crystals.
    glows: [wandHand.tip, palmHand.rune],
    // 0 is the open palm, 1 the wand.
    origin(side, target = new THREE.Vector3()) {
      return (side === 0 ? palmHand.rune : wandHand.tip).getWorldPosition(target);
    },
    // A cast from one hand: the wand flicks, the rune flares.
    cast(side, strength = 1) {
      if (side === 0) {
        flare = Math.max(flare, strength);
      } else {
        flick = 1;
        flickStrength = strength;
      }
    },
    // `target` is the world position being typed at, or null. `walk` is 0 to 1 while travelling.
    update(seconds, delta, { target = null, walk = 0, walkPhase = 0 } = {}) {
      const halfHeight = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * -DEPTH;
      const halfWidth = halfHeight * camera.aspect;
      // On a narrow screen the hands shrink and move in, so they stay in view without crowding it.
      const size = THREE.MathUtils.clamp(camera.aspect * 0.6, 0.55, 0.9);
      const bob = Math.sin(walkPhase) * 0.022 * walk;
      const sway = Math.sin(seconds * 0.9) * 0.008;
      right.scale.setScalar(size);
      left.scale.setScalar(size);
      right.position.set(THREE.MathUtils.clamp(halfWidth - WAND_INSET * size, 0.16, MAX_HAND_X), HAND_Y + bob + sway, DEPTH);
      left.position.set(-THREE.MathUtils.clamp(halfWidth - PALM_INSET * size, 0.2, MAX_HAND_X), HAND_Y - 0.03 - bob + Math.cos(seconds * 0.8) * 0.008, DEPTH);

      // The wand leans toward the target without swinging right across the view.
      camera.updateMatrixWorld();
      wanted.copy(REST_AIM);
      camera.localToWorld(wanted);
      if (target) wanted.lerp(target, 0.6);
      if (!aimReady) {
        aim.copy(wanted);
        aimReady = true;
      } else {
        aim.lerp(wanted, Math.min(1, delta * 9));
      }
      wandHand.wrist.lookAt(aim);
      // A flick: the tip snaps down and forward, then eases back.
      if (flick > 0) {
        flick = Math.max(0, flick - delta / 0.3);
        const t = 1 - flick;
        const snap = t < 0.25 ? t / 0.25 : 1 - (t - 0.25) / 0.75;
        wandHand.wrist.rotateX(snap * snap * (0.28 + flickStrength * 0.22));
        wandHand.wrist.position.z = -snap * 0.07 * flickStrength;
      } else {
        wandHand.wrist.position.z = 0;
      }

      // The palm stays level, turned a little inward, and its rune turns and bobs.
      palmAim.set(0.5, 0.05, -9);
      camera.localToWorld(palmAim);
      palmHand.wrist.lookAt(palmAim);
      flare = Math.max(0, flare - delta / 0.45);
      palmHand.rune.position.y = 0.22 + Math.sin(seconds * 2.1) * 0.018 + flare * 0.05;
      palmHand.rune.rotation.y = seconds * 1.6;
      palmHand.halo.rotation.z = seconds * 2.4;
      palmHand.outer.rotation.z = -seconds * 1.1;
      palmHand.rune.userData.flare = flare;
    },
  };
}
