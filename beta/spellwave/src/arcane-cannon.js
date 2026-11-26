// arcane-cannon.js — the player's weapon: a plasma machine gun, part machine and part
// spell, held low and a little right of the middle, angled in toward the centre of
// the view, so only its top rises into the picture. Six barrels spin up as the player types,
// a crystal core feeds them, and every letter kicks it back with a muzzle flash.
//
// It hangs from the camera, so it draws in front of the world. It adds no lights:
// everything that glows is an emissive or unlit material.
import * as THREE from 'three';

const DEPTH = -1.55;
const GUN_Y = -0.98;
const GUN_SCALE = 1.5;
// How far right of centre it sits, as a share of half the view's width.
const GUN_OFFSET = 0.3;
// At rest it points at the middle of the view, a short way ahead, which turns it in
// at an angle; it leans further toward whatever is being typed at.
const REST_AIM = new THREE.Vector3(0, 0.1, -5.5);
const AIM_LEAN = 0.45;
const BARREL_LENGTH = 0.5;
const BARREL_RADIUS = 0.062;
const MUZZLE_Z = 0.3 + BARREL_LENGTH;

// Everything is built with the muzzle along +z, which is where lookAt points an object.
export function buildCannon(materials, crystalMaterial) {
  const gun = new THREE.Group();
  const add = (geometry, material, x, y, z, parent = gun) => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    parent.add(mesh);
    return mesh;
  };

  // Housing: a chamfered block with armour plates. Its back end stays below the view.
  const housing = add(new THREE.CylinderGeometry(0.115, 0.13, 0.42, 8), materials.metal, 0, 0, 0.06);
  housing.rotation.x = Math.PI / 2;
  housing.rotation.y = Math.PI / 8;
  add(new THREE.BoxGeometry(0.2, 0.05, 0.3), materials.plate, 0, 0.115, 0.04);
  for (const side of [-1, 1]) {
    const cheek = add(new THREE.BoxGeometry(0.03, 0.15, 0.34), materials.plate, side * 0.13, -0.005, 0.05);
    cheek.rotation.z = side * -0.12;
    // A glowing vent slot along each cheek.
    add(new THREE.BoxGeometry(0.012, 0.03, 0.22), materials.glow, side * 0.149, 0.01, 0.05);
  }

  // Coils between the housing and the barrels, lit from inside.
  const coils = [];
  for (let index = 0; index < 3; index += 1) {
    const coil = add(new THREE.TorusGeometry(0.105 - index * 0.008, 0.016, 5, 10), materials.glow, 0, 0, 0.3 + index * 0.055);
    coils.push(coil);
  }

  // The barrels turn together about the bore.
  const barrels = new THREE.Group();
  barrels.position.z = 0.3;
  gun.add(barrels);
  for (let index = 0; index < 6; index += 1) {
    const angle = (index / 6) * Math.PI * 2;
    const barrel = add(new THREE.CylinderGeometry(0.02, 0.022, BARREL_LENGTH, 6), materials.barrel,
      Math.cos(angle) * BARREL_RADIUS, Math.sin(angle) * BARREL_RADIUS, BARREL_LENGTH / 2, barrels);
    barrel.rotation.x = Math.PI / 2;
  }
  for (const z of [0.16, 0.34, BARREL_LENGTH - 0.02]) {
    const band = add(new THREE.CylinderGeometry(0.094, 0.094, 0.03, 12), materials.plate, 0, 0, z, barrels);
    band.rotation.x = Math.PI / 2;
  }
  const spindle = add(new THREE.CylinderGeometry(0.022, 0.022, BARREL_LENGTH, 6), materials.glow, 0, 0, BARREL_LENGTH / 2, barrels);
  spindle.rotation.x = Math.PI / 2;

  // A ring of runes floats just ahead of the muzzle, turning against the barrels.
  const runes = new THREE.Group();
  runes.position.z = MUZZLE_Z + 0.05;
  gun.add(runes);
  add(new THREE.TorusGeometry(0.13, 0.008, 4, 20), materials.glow, 0, 0, 0, runes);
  for (let index = 0; index < 8; index += 1) {
    const angle = (index / 8) * Math.PI * 2;
    const rune = add(new THREE.BoxGeometry(0.03, index % 2 ? 0.012 : 0.03, 0.006), materials.glow,
      Math.cos(angle) * 0.13, Math.sin(angle) * 0.13, 0, runes);
    rune.rotation.z = angle;
  }

  // The crystal core rides on top in a cage, with two rings turning round it.
  const cage = new THREE.Group();
  cage.position.set(0, 0.17, -0.02);
  cage.scale.setScalar(0.75);
  gun.add(cage);
  for (const side of [-1, 1]) {
    const prong = add(new THREE.BoxGeometry(0.016, 0.16, 0.02), materials.plate, side * 0.07, -0.02, 0, cage);
    prong.rotation.z = side * 0.35;
  }
  const core = add(new THREE.OctahedronGeometry(0.058, 0), crystalMaterial, 0, 0.02, 0, cage);
  const ringA = add(new THREE.TorusGeometry(0.095, 0.006, 4, 16), materials.glow, 0, 0.02, 0, cage);
  const ringB = add(new THREE.TorusGeometry(0.078, 0.006, 4, 16), materials.glow, 0, 0.02, 0, cage);

  // Muzzle flash: a bright star, hidden until a shot.
  const flash = new THREE.Group();
  flash.position.z = MUZZLE_Z + 0.03;
  gun.add(flash);
  const flashCone = add(new THREE.ConeGeometry(0.11, 0.34, 6, 1, true), materials.flash, 0, 0, 0.15, flash);
  flashCone.rotation.x = -Math.PI / 2;
  for (let index = 0; index < 3; index += 1) {
    const ray = add(new THREE.BoxGeometry(0.46, 0.035, 0.01), materials.flash, 0, 0, 0.02, flash);
    ray.rotation.z = (index / 3) * Math.PI;
  }
  flash.visible = false;

  const muzzle = new THREE.Object3D();
  muzzle.position.z = MUZZLE_Z + 0.04;
  gun.add(muzzle);

  return { gun, barrels, runes, coils, core, ringA, ringB, flash, muzzle };
}

export function createArcaneCannon({ camera, crystalMaterial, createCrown = null }) {
  const lit = (color, emissive, intensity, extra = {}) => new THREE.MeshStandardMaterial({
    color, emissive, emissiveIntensity: intensity, flatShading: true, ...extra,
  });
  const materials = {
    // A little of their own light keeps the gun readable at night and underground.
    metal: lit(0x3b4252, 0x141a2a, 0.9, { roughness: 0.55, metalness: 0.45 }),
    plate: lit(0x6f7c93, 0x1c2740, 0.8, { roughness: 0.4, metalness: 0.55 }),
    barrel: lit(0x8a94a6, 0x1a2233, 0.7, { roughness: 0.35, metalness: 0.7 }),
    glow: new THREE.MeshBasicMaterial({ color: 0x7ff5e6 }),
    flash: new THREE.MeshBasicMaterial({
      color: 0xd8fff8, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending,
      depthWrite: false, side: THREE.DoubleSide,
    }),
  };

  const group = new THREE.Group();
  const mount = new THREE.Group();
  group.add(mount);
  const parts = buildCannon(materials, crystalMaterial);
  mount.add(parts.gun);

  // A small lightning crown over the core, shown while chain lightning is primed.
  const crowns = [];
  if (createCrown) {
    const crown = createCrown();
    crown.visible = false;
    // The game sizes and spins the crown itself, so a holder shrinks it to the core.
    const holder = new THREE.Group();
    holder.scale.setScalar(0.32);
    holder.position.y = 0.1;
    holder.add(crown);
    parts.core.add(holder);
    crowns.push(crown);
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
  let aimReady = false;
  let recoil = 0;
  let recoilStrength = 0;
  let flashLife = 0;
  let spin = 0;
  let spinSpeed = 1.5;
  let surge = 0;

  return {
    group,
    crowns,
    // What pulses with the plasma: scaled by the game along with its other crystals.
    glows: [parts.core],
    // 1 is the muzzle, where bolts leave; 0 is the core, where chain lightning leaps from.
    origin(side, target = new THREE.Vector3()) {
      return (side === 0 ? parts.core : parts.muzzle).getWorldPosition(target);
    },
    // A shot: the barrels spin up, the gun kicks back and the muzzle flashes.
    cast(side, strength = 1) {
      if (side === 0) {
        surge = Math.max(surge, strength);
        return;
      }
      recoil = 1;
      recoilStrength = strength;
      flashLife = 1;
      spinSpeed = Math.min(34, spinSpeed + 7 + strength * 6);
    },
    // `target` is the world position being typed at, or null. `walk` is 0 to 1 while travelling.
    update(seconds, delta, { target = null, walk = 0, walkPhase = 0 } = {}) {
      // On a narrow screen the gun shrinks, so it does not crowd the view.
      const size = THREE.MathUtils.clamp(camera.aspect * 0.62, 0.55, 0.95);
      const bob = Math.sin(walkPhase) * 0.024 * walk;
      mount.scale.setScalar(size * GUN_SCALE);
      const halfWidth = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * -DEPTH * camera.aspect;
      mount.position.set(halfWidth * GUN_OFFSET + Math.sin(walkPhase * 0.5) * 0.02 * walk, GUN_Y + bob + Math.sin(seconds * 0.9) * 0.008, DEPTH);

      // The gun swings toward the target without sweeping right across the view.
      camera.updateMatrixWorld();
      wanted.copy(REST_AIM);
      camera.localToWorld(wanted);
      if (target) wanted.lerp(target, AIM_LEAN);
      if (!aimReady) {
        aim.copy(wanted);
        aimReady = true;
      } else {
        aim.lerp(wanted, Math.min(1, delta * 10));
      }
      // The kick below moves the gun, so it starts each frame from home.
      parts.gun.position.set(0, 0, 0);
      parts.gun.lookAt(aim);

      // Recoil: straight back and a little up, then easing home.
      recoil = Math.max(0, recoil - delta / 0.16);
      const kick = recoil * recoil * (0.5 + recoilStrength * 0.5);
      parts.gun.translateZ(-kick * 0.075);
      parts.gun.rotateX(-kick * 0.07);

      // The barrels keep turning slowly, and wind down from each burst.
      spinSpeed = Math.max(1.5, spinSpeed - delta * 16);
      spin += spinSpeed * delta;
      parts.barrels.rotation.z = spin;
      parts.runes.rotation.z = -seconds * 1.4 - spin * 0.25;
      parts.runes.scale.setScalar(1 + kick * 0.5);

      flashLife = Math.max(0, flashLife - delta / 0.07);
      parts.flash.visible = flashLife > 0;
      if (parts.flash.visible) {
        parts.flash.scale.setScalar(0.5 + flashLife * (0.6 + recoilStrength * 0.6));
        parts.flash.rotation.z = spin * 1.7;
        materials.flash.opacity = 0.35 + flashLife * 0.6;
      }

      // The core turns in its cage; its rings tumble faster when a spell surges through.
      surge = Math.max(0, surge - delta / 0.5);
      const heat = Math.min(1, (spinSpeed - 1.5) / 20);
      parts.core.rotation.y = seconds * 1.8;
      parts.core.position.y = 0.02 + Math.sin(seconds * 2.3) * 0.008 + surge * 0.03;
      parts.ringA.rotation.set(seconds * (1.3 + surge * 4), seconds * 0.7, 0);
      parts.ringB.rotation.set(0.6, seconds * (-1.9 - surge * 4), seconds * 0.5);
      parts.coils.forEach((coil, index) => {
        coil.scale.setScalar(1 + heat * 0.12 + Math.sin(seconds * 9 - index * 1.1) * 0.03 * (0.4 + heat));
      });
    },
  };
}
