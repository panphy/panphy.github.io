// ride-cart.js — the mine cart the player rides through the crystal mine, seen from
// inside: the nose of a plank tub with iron bands and corner posts, its sides running
// back past the view.
//
// It hangs from the camera, like the cannon, so it draws in front of the world. It adds
// no lights.
import * as THREE from 'three';

// Camera space: the view looks down −z. The nose is far enough ahead that its rim sits
// in the lower fifth of the picture, with the track still showing either side of it.
const NOSE_Z = -2.3;
const RIM_Y = -0.72;
const NOSE_HALF_WIDTH = 1.5;
const TAIL_HALF_WIDTH = 1.78;
const TAIL_Z = -0.3;
const WALL_HEIGHT = 1.1;
// The whole cart is drawn this much bigger and further off, which looks the same from
// the camera but puts its nose beyond the cannon's muzzle, so the gun sits inside the
// cart and fires over the rim instead of passing through the planks.
const CART_SCALE = 1.45;

export function createRideCart(camera) {
  const lit = (color, emissive, intensity, extra = {}) => new THREE.MeshStandardMaterial({
    color, emissive, emissiveIntensity: intensity, flatShading: true, ...extra,
  });
  // A little of their own warm light keeps the cart readable underground.
  const materials = {
    plank: lit(0xa06a3a, 0x5a2c0e, 0.9, { roughness: 0.9 }),
    plankDark: lit(0x80502a, 0x45220a, 0.9, { roughness: 0.95 }),
    iron: lit(0x626875, 0x2a2420, 0.9, { roughness: 0.6, metalness: 0.35 }),
    ironLight: lit(0x9aa2b2, 0x3a3028, 0.9, { roughness: 0.45, metalness: 0.4 }),
  };

  const group = new THREE.Group();
  const add = (geometry, material, x, y, z, parent = group) => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    parent.add(mesh);
    return mesh;
  };
  const wallY = RIM_Y - WALL_HEIGHT / 2;

  // The nose: upright planks, alternately light and dark, a hand's breadth apart in depth
  // so each one catches the light on its own.
  const plankCount = 6;
  const plankWidth = (NOSE_HALF_WIDTH * 2) / plankCount;
  for (let index = 0; index < plankCount; index += 1) {
    const x = -NOSE_HALF_WIDTH + plankWidth * (index + 0.5);
    add(new THREE.BoxGeometry(plankWidth - 0.03, WALL_HEIGHT, 0.09), index % 2 ? materials.plankDark : materials.plank,
      x, wallY, NOSE_Z + (index % 2 ? 0.012 : 0));
  }
  // An iron lip along the top and a band below it, studded with rivets.
  add(new THREE.BoxGeometry(NOSE_HALF_WIDTH * 2 + 0.24, 0.1, 0.24), materials.iron, 0, RIM_Y + 0.03, NOSE_Z);
  add(new THREE.BoxGeometry(NOSE_HALF_WIDTH * 2 + 0.06, 0.09, 0.05), materials.iron, 0, RIM_Y - 0.3, NOSE_Z + 0.07);
  for (let index = 0; index <= plankCount; index += 1) {
    const x = -NOSE_HALF_WIDTH + plankWidth * index;
    if (index > 0 && index < plankCount) add(new THREE.OctahedronGeometry(0.045, 0), materials.ironLight, x, RIM_Y - 0.3, NOSE_Z + 0.11);
    if (index < plankCount) add(new THREE.OctahedronGeometry(0.04, 0), materials.ironLight, x + plankWidth / 2, RIM_Y + 0.09, NOSE_Z + 0.04);
  }

  // The sides run back past the camera, flaring a little, with their own lip.
  for (const side of [-1, 1]) {
    const from = new THREE.Vector3(side * NOSE_HALF_WIDTH, 0, NOSE_Z);
    const to = new THREE.Vector3(side * TAIL_HALF_WIDTH, 0, TAIL_Z);
    const length = from.distanceTo(to);
    const yaw = Math.atan2(to.x - from.x, to.z - from.z);
    const wall = new THREE.Group();
    wall.position.set((from.x + to.x) / 2, 0, (from.z + to.z) / 2);
    wall.rotation.y = yaw;
    group.add(wall);
    add(new THREE.BoxGeometry(0.09, WALL_HEIGHT, length), materials.plankDark, 0, wallY, 0, wall);
    add(new THREE.BoxGeometry(0.22, 0.1, length + 0.1), materials.iron, 0, RIM_Y + 0.03, 0, wall);
    for (let index = 1; index <= 3; index += 1) {
      add(new THREE.OctahedronGeometry(0.04, 0), materials.ironLight, 0, RIM_Y + 0.09, -length / 2 + (length * index) / 4, wall);
    }
    // A corner post, standing a little proud of the rim.
    add(new THREE.BoxGeometry(0.2, WALL_HEIGHT + 0.16, 0.2), materials.iron, side * NOSE_HALF_WIDTH, wallY + 0.1, NOSE_Z);
    add(new THREE.ConeGeometry(0.13, 0.12, 4), materials.ironLight, side * NOSE_HALF_WIDTH, RIM_Y + 0.24, NOSE_Z).rotation.y = Math.PI / 4;
  }

  group.scale.setScalar(CART_SCALE);
  group.visible = false;
  camera.add(group);

  return {
    group,
    // `phase` advances with the ride: the cart rattles on its wheels.
    update(phase) {
      group.position.y = (Math.sin(phase * 2) * 0.012 + Math.sin(phase * 0.7) * 0.008) * CART_SCALE;
      group.rotation.z = Math.sin(phase * 0.5) * 0.007;
    },
  };
}
