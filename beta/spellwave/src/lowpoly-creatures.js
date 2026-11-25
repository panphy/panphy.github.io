// lowpoly-creatures.js — faceted, flat-shaded monsters. Each is a handful of simple
// solids on pivots, plus an animate(seconds, enemy) function that moves the pivots.
import * as THREE from 'three';

const BONE = 0xf3e6c8;

function tone(hex, factor) {
  return new THREE.Color(hex).multiplyScalar(factor).getHex();
}

function mix(hexA, hexB, amount) {
  return new THREE.Color(hexA).lerp(new THREE.Color(hexB), amount).getHex();
}

function pivot(parent, x, y, z) {
  const group = new THREE.Group();
  group.position.set(x, y, z);
  parent.add(group);
  return group;
}

// kit: { mesh(geometry, material), mat(color, options), glow(color, intensity) }, supplied
// by enemy-meshes.js so that shadows and stun tinting work as for every other monster.
function builder(kit) {
  const place = (parent, geometry, material, [x, y, z], scale = null, rotation = null) => {
    const mesh = kit.mesh(geometry, material);
    mesh.position.set(x, y, z);
    if (scale) mesh.scale.set(scale[0], scale[1], scale[2]);
    if (rotation) mesh.rotation.set(rotation[0], rotation[1], rotation[2]);
    parent.add(mesh);
    return mesh;
  };
  // The builders below name coarse shapes; these raise the facet count of everything
  // round by one step. Three- and four-sided shapes are deliberate (spikes, flat limbs,
  // plates) and stay as written, as do the crystal-like octahedra and dodecahedra.
  const rounder = (sides) => (sides <= 4 ? sides : Math.round(sides * 1.6));
  return {
    place,
    ico: (radius, detail = 0) => new THREE.IcosahedronGeometry(radius, detail + 1),
    octa: (radius) => new THREE.OctahedronGeometry(radius, 0),
    cone: (radius, height, sides = 4) => new THREE.ConeGeometry(radius, height, rounder(sides)),
    cylinder: (top, bottom, height, sides = 5) => new THREE.CylinderGeometry(top, bottom, height, rounder(sides)),
    box: (x, y, z) => new THREE.BoxGeometry(x, y, z),
    dodeca: (radius) => new THREE.DodecahedronGeometry(radius, 0),
    ring: (radius, tube, sides = 8) => new THREE.TorusGeometry(radius, tube, 6, rounder(sides)),
  };
}

// Mudlug — a squat toad goblin: wide flat head, scowling brow, fangs, pointed ears.
export function buildMudlug(type, kit) {
  const b = builder(kit);
  const body = kit.mat(type.body);
  const bodyDark = kit.mat(tone(type.body, 0.66));
  const belly = kit.mat(type.trim);
  const bellyLight = kit.mat(mix(type.trim, 0xffffff, 0.25));
  const dark = kit.mat(0x2a1512);
  const bone = kit.mat(BONE);
  const eyeGlow = kit.glow(type.eye, 1.5);
  const group = new THREE.Group();

  const torso = pivot(group, 0, 0, 0);
  b.place(torso, b.ico(0.62, 1), body, [0, 0.5, -0.05], [1.15, 0.72, 1]);
  b.place(torso, b.ico(0.5, 1), belly, [0, 0.42, 0.3], [1, 0.62, 0.7]);

  const HEAD_Y = 0.8;
  const head = pivot(group, 0, HEAD_Y, 0.2);
  b.place(head, b.ico(0.5, 1), body, [0, 0.04, 0], [1.2, 0.6, 0.95]);
  b.place(head, b.ico(0.5, 1), dark, [0, -0.1, 0.03], [1.12, 0.16, 0.9]);
  b.place(head, b.ico(0.47, 1), bellyLight, [0, -0.2, 0.03], [1.16, 0.3, 0.92]);
  const eyes = pivot(head, 0, 0, 0);
  for (const side of [-1, 1]) {
    b.place(head, b.ico(0.2, 0), body, [side * 0.3, 0.26, 0.16]);
    b.place(eyes, b.ico(0.13, 0), eyeGlow, [side * 0.3, 0.27, 0.3]);
    b.place(head, b.octa(0.055), dark, [side * 0.28, 0.26, 0.42]);
    b.place(head, b.box(0.36, 0.08, 0.24), bodyDark, [side * 0.31, 0.42, 0.26], null, [0.25, 0, side * -0.32]);
    b.place(head, b.cone(0.11, 0.36, 4), belly, [side * 0.66, 0.14, -0.02], null, [0, 0, side * -1.15]);
    b.place(head, b.cone(0.05, 0.17, 4), bone, [side * 0.2, -0.05, 0.43]);
    b.place(head, b.octa(0.03), dark, [side * 0.07, 0.1, 0.47]);
  }

  const throat = pivot(group, 0, 0.5, 0.5);
  b.place(throat, b.ico(0.17, 0), bellyLight, [0, 0, 0]);

  const limbs = {};
  for (const [name, side] of [['Left', -1], ['Right', 1]]) {
    const hind = pivot(group, side * 0.62, 0.42, -0.2);
    b.place(hind, b.ico(0.3, 0), bodyDark, [0, -0.05, 0], [0.8, 1, 1.1]);
    b.place(hind, b.cylinder(0.06, 0.2, 0.52, 4), belly, [side * 0.04, -0.36, 0.24], [1, 1, 0.4], [Math.PI / 2, 0, 0]);
    limbs[`hind${name}`] = hind;
    const arm = pivot(group, side * 0.5, 0.4, 0.36);
    b.place(arm, b.cylinder(0.07, 0.09, 0.32, 5), body, [0, -0.14, 0]);
    b.place(arm, b.cylinder(0.04, 0.14, 0.3, 4), belly, [0, -0.33, 0.1], [1, 1, 0.4], [Math.PI / 2, 0, 0]);
    limbs[`arm${name}`] = arm;
  }

  group.userData.animate = (seconds, enemy) => {
    const phase = enemy.phase || 0;
    const step = seconds * 4.8 + phase;
    limbs.hindLeft.rotation.x = Math.sin(step) * 0.5;
    limbs.hindRight.rotation.x = -Math.sin(step) * 0.5;
    limbs.armLeft.rotation.x = -Math.sin(step) * 0.6;
    limbs.armRight.rotation.x = Math.sin(step) * 0.6;
    head.rotation.z = Math.sin(step * 0.5) * 0.07;
    head.position.y = HEAD_Y + Math.abs(Math.sin(step)) * 0.03;
    torso.scale.y = 1 + Math.sin(seconds * 3 + phase) * 0.035;
    const croak = 1 + Math.max(0, Math.sin(seconds * 2.2 + phase)) * 0.55;
    throat.scale.set(croak, croak, croak);
    const blinking = (seconds * 0.31 + phase * 0.16) % 1 < 0.045;
    eyes.scale.y = blinking ? 0.12 : 1;
    eyes.position.y = blinking ? 0.24 : 0;
  };
  group.userData.animate(0, {});
  return group;
}

const UP = new THREE.Vector3(0, 1, 0);

// ---- Boss helpers ----

const AIM = new THREE.Vector3();

// builder() plus shapes aimed along a direction, for horns, claws, teeth and limbs.
function bossBuilder(kit) {
  const b = builder(kit);
  // A cone with its base at `base`, pointing along `direction`.
  b.spike = (parent, material, base, direction, length, radius, sides = 4) => {
    const mesh = kit.mesh(b.cone(radius, length, sides), material);
    AIM.set(direction[0], direction[1], direction[2]).normalize();
    mesh.quaternion.setFromUnitVectors(UP, AIM);
    mesh.position.set(base[0] + AIM.x * length / 2, base[1] + AIM.y * length / 2, base[2] + AIM.z * length / 2);
    parent.add(mesh);
    return mesh;
  };
  // A tapered bar from one point to another.
  b.bar = (parent, material, from, to, fromRadius, toRadius = fromRadius, sides = 4) => {
    AIM.set(to[0] - from[0], to[1] - from[1], to[2] - from[2]);
    const length = AIM.length();
    AIM.normalize();
    const mesh = kit.mesh(b.cylinder(toRadius, fromRadius, length, sides), material);
    mesh.quaternion.setFromUnitVectors(UP, AIM);
    mesh.position.set((from[0] + to[0]) / 2, (from[1] + to[1]) / 2, (from[2] + to[2]) / 2);
    parent.add(mesh);
    return mesh;
  };
  return b;
}

// A clock for a boss's idle motion that runs faster as rage rises. It adds up frame steps,
// so a change in rage never makes the motion jump.
function rageClock(gain = 0.7) {
  let last = 0;
  let clock = 0;
  return (seconds, rage) => {
    const step = seconds - last;
    last = seconds;
    clock += step > 0 && step < 0.25 ? step * (1 + rage * gain) : step;
    return clock;
  };
}

// A row of teeth across a jaw, bowed back at the corners, pointing down (direction -1) or up (1).
// The corner teeth are the longest.
function toothRow(b, parent, material, { width, count, length, y, z, direction = -1, bow = 0.08, lean = 0.1 }) {
  for (let index = 0; index < count; index += 1) {
    const across = count === 1 ? 0 : (index / (count - 1)) * 2 - 1;
    const size = length * (0.6 + 0.4 * Math.abs(across));
    b.spike(parent, material, [across * width / 2, y, z - across * across * bow], [0, direction, lean], size, size * 0.3);
  }
}

// A clawed hand hanging below the wrist at `at`: a palm, and fingers on their own pivots so
// that they can curl (rotation.x). Returns the hand pivot and the finger pivots.
function clawHand(b, parent, at, palmMaterial, clawMaterial, size = 1, fingers = 3) {
  const hand = pivot(parent, at[0], at[1], at[2]);
  b.place(hand, b.ico(0.17 * size, 0), palmMaterial, [0, -0.1 * size, 0], [1.15, 0.9, 0.8]);
  const digits = [];
  for (let index = 0; index < fingers; index += 1) {
    const spread = index - (fingers - 1) / 2;
    const digit = pivot(hand, spread * 0.12 * size, -0.2 * size, 0.04 * size);
    digit.rotation.z = spread * 0.3;
    b.bar(digit, palmMaterial, [0, 0, 0], [0, -0.2 * size, 0.03 * size], 0.055 * size, 0.04 * size);
    b.spike(digit, clawMaterial, [0, -0.18 * size, 0.03 * size], [0, -1, 0.5], 0.32 * size, 0.045 * size);
    digits.push(digit);
  }
  return { hand, digits };
}

// A flat membrane of triangles fanned from `joint` to each tip in turn, for wings and torn
// cloaks. The edge between neighbouring tips is cut back toward the joint by that pair's
// notch (0 is a straight edge, 1 reaches the joint), which gives scallops, feathers or
// tatters. With `root`, one more panel joins it to the joint and the last tip. Points are
// for the right-hand side; `side` -1 mirrors them to the left.
function fanGeometry(side, joint, tips, notches, root = null) {
  const point = ([x, y, z]) => new THREE.Vector3(x * side, y, z);
  const hub = point(joint);
  const ends = tips.map(point);
  const positions = [];
  const push = (...vertices) => { for (const vertex of vertices) positions.push(vertex.x, vertex.y, vertex.z); };
  for (let index = 0; index < ends.length - 1; index += 1) {
    const notch = ends[index].clone().add(ends[index + 1]).multiplyScalar(0.5).lerp(hub, notches[index % notches.length]);
    push(hub, ends[index], notch, hub, notch, ends[index + 1]);
  }
  if (root) push(point(root), hub, ends[ends.length - 1]);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.computeVertexNormals();
  return geometry;
}

// ---- End of boss helpers ----

// Crimson Bulwark — a war dragon stooping on the player: torn wings, a long neck thrust
// forward, a horned wedge of a head with a furnace in its jaws, fire showing between its
// chest plates, hanging talons and a bladed tail.
export function buildCrimsonBulwark(type, kit) {
  const b = bossBuilder(kit);
  const hideColor = mix(type.body, type.trim, 0.22);
  const hide = kit.mat(hideColor);
  const hideDark = kit.mat(tone(hideColor, 0.55));
  const plate = kit.mat(mix(type.body, 0x000000, 0.3));
  const crest = kit.mat(mix(type.body, type.trim, 0.75));
  const membrane = kit.mat(mix(type.body, type.trim, 0.4), { side: THREE.DoubleSide });
  const bone = kit.mat(BONE);
  const maw = kit.mat(0x1a0406);
  const eyeGlow = kit.glow(type.eye, 1.9);
  const fire = kit.glow(0xff7a1a, 1.7);
  const group = new THREE.Group();

  const BODY_Y = 1.4;
  const body = pivot(group, 0, BODY_Y, -0.3);
  b.place(body, b.ico(0.62, 1), hide, [0, 0.1, 0.1], [1.15, 1, 1.2]);
  b.place(body, b.ico(0.48, 1), hideDark, [0, -0.45, -0.3], [0.95, 1.05, 1.1]);
  b.place(body, b.ico(0.36, 0), hideDark, [0, -0.85, -0.55], [0.9, 1, 1]);
  // Dark plates down the chest, with the fire inside showing in the gaps between them.
  const embers = pivot(body, 0, 0.1, 0.1);
  [[0.36, 0.78, 0.66], [0.07, 0.88, 0.76], [-0.22, 0.74, 0.7], [-0.5, 0.5, 0.46]].forEach(([y, width, z], index) => {
    b.place(body, b.box(width, 0.23, 0.1), plate, [0, 0.1 + y, 0.1 + z], null, [-y * 1.3, 0, 0]);
    if (index > 0) b.place(embers, b.box(width * 0.8, 0.08, 0.08), fire, [0, y + 0.145, z + 0.0], null, [-y * 1.3, 0, 0]);
  });
  for (const side of [-1, 1]) {
    b.place(body, b.ico(0.36, 0), hideDark, [side * 0.56, 0.42, -0.1], [1, 0.9, 1.1]);
    b.spike(body, bone, [side * 0.62, 0.62, -0.1], [side * 0.7, 1, -0.2], 0.42, 0.09);
    b.spike(body, bone, [side * 0.8, 0.46, -0.05], [side * 1, 0.35, 0], 0.3, 0.07);
  }
  [[0.66, -0.2, 0.5], [0.5, -0.52, 0.44], [0.12, -0.78, 0.4], [-0.3, -0.92, 0.34]].forEach(([y, z, length]) => {
    b.spike(body, crest, [0, y, z], [0, 0.75, -1], length, 0.1);
  });

  // The neck is a chain of segments, each hinged on the one below, ending in the head.
  const neck = [];
  let neckParent = pivot(body, 0, 0.42, 0.6);
  [0.31, 0.26, 0.22].forEach((radius, index) => {
    const segment = index === 0 ? neckParent : pivot(neckParent, 0, 0.36, 0);
    b.place(segment, b.cylinder(radius * 0.84, radius, 0.44, 6), hide, [0, 0.18, 0]);
    b.place(segment, b.box(radius * 1.2, 0.3, 0.08), plate, [0, 0.18, radius * 0.86]);
    b.spike(segment, crest, [0, 0.16, -radius * 0.8], [0, 0.5, -1], 0.34 - index * 0.04, 0.08);
    neck.push(segment);
    neckParent = segment;
  });

  const head = pivot(neckParent, 0, 0.4, 0);
  head.scale.setScalar(1.3);
  b.place(head, b.ico(0.3, 1), hide, [0, 0.04, 0], [1.2, 0.82, 1.15]);
  b.place(head, b.cylinder(0.11, 0.3, 0.84, 4), hide, [0, 0.02, 0.5], [1.15, 1, 0.55], [Math.PI / 2, 0, 0]);
  b.place(head, b.box(0.4, 0.05, 0.6), maw, [0, -0.1, 0.42]);
  for (const side of [-1, 1]) {
    b.place(head, b.box(0.3, 0.1, 0.34), plate, [side * 0.2, 0.22, 0.2], null, [0.3, 0, side * 0.42]);
    b.place(head, b.octa(0.1), eyeGlow, [side * 0.23, 0.12, 0.3], [1.5, 0.6, 0.8], [0, side * 0.4, side * 0.4]);
    b.place(head, b.octa(0.035), fire, [side * 0.07, 0.08, 0.86]);
    b.spike(head, hideDark, [side * 0.3, 0.02, -0.05], [side * 1, 0.25, -0.7], 0.42, 0.08);
    b.spike(head, hideDark, [side * 0.28, -0.12, 0.05], [side * 1, -0.5, -0.4], 0.3, 0.07);
    [[0.25, 0.2, 0.17], [0.21, 0.4, 0.13], [0.17, 0.58, 0.13], [0.1, 0.78, 0.2]].forEach(([x, z, length]) => {
      b.spike(head, bone, [side * x, -0.09, z], [side * 0.1, -1, 0.1], length, 0.04);
    });
  }
  // One horn is whole and one is snapped off short.
  b.spike(head, bone, [0.2, 0.18, -0.12], [0.3, 0.62, -1], 0.8, 0.11, 5);
  b.bar(head, bone, [-0.2, 0.18, -0.12], [-0.33, 0.44, -0.54], 0.11, 0.075, 5);
  b.spike(head, bone, [-0.33, 0.44, -0.54], [-0.5, 0.3, -1], 0.14, 0.06, 3);
  b.spike(head, crest, [0, 0.24, -0.1], [0, 1, -0.8], 0.3, 0.07);
  b.spike(head, crest, [0, 0.2, 0.12], [0, 1, -0.5], 0.22, 0.06);
  const jaw = pivot(head, 0, -0.12, 0);
  b.place(jaw, b.cylinder(0.09, 0.26, 0.8, 4), hideDark, [0, -0.07, 0.42], [1.1, 1, 0.4], [Math.PI / 2, 0, 0]);
  const blaze = pivot(head, 0, -0.15, 0.2);
  b.place(blaze, b.ico(0.13, 0), fire, [0, 0, 0.1], [1.3, 0.6, 1.9]);
  for (const side of [-1, 1]) {
    [[0.2, 0.3, 0.13], [0.16, 0.5, 0.11], [0.1, 0.72, 0.17]].forEach(([x, z, length]) => {
      b.spike(jaw, bone, [side * x, -0.02, z], [side * 0.1, 1, 0.05], length, 0.035);
    });
    b.spike(jaw, hideDark, [side * 0.2, -0.1, 0.1], [side * 0.6, -1, -0.3], 0.24, 0.06);
  }

  const WING_JOINT = [1.2, 0.72, -0.05];
  const WING_TIPS = [[1.42, 1.28, 0], [2.7, 0.95, -0.14], [2.78, 0.08, -0.1], [2.1, -0.78, -0.06], [1.22, -1.16, 0], [0.3, -0.82, 0.02]];
  const WING_ELBOW = [0.62, 0.1, 0.02];
  const wings = [];
  for (const side of [-1, 1]) {
    const wing = pivot(body, side * 0.5, 0.55, -0.35);
    wing.add(kit.mesh(fanGeometry(side, WING_JOINT, WING_TIPS, [0.1, 0.34, 0.52, 0.3, 0.6]), membrane));
    wing.add(kit.mesh(fanGeometry(side, WING_ELBOW, [[0, 0, 0], WING_JOINT, WING_TIPS[5]], [0, 0]), membrane));
    const mirror = ([x, y, z]) => [x * side, y, z];
    b.bar(wing, hideDark, [0, 0, 0], mirror(WING_ELBOW), 0.1, 0.08);
    b.bar(wing, hideDark, mirror(WING_ELBOW), mirror(WING_JOINT), 0.08, 0.06);
    WING_TIPS.slice(0, 5).forEach((tip) => b.bar(wing, hideDark, mirror(WING_JOINT), mirror(tip), 0.05, 0.015));
    b.spike(wing, bone, mirror(WING_JOINT), [side * -0.2, 1, 0.5], 0.3, 0.05);
    wings.push({ wing, side });
  }

  const arms = [];
  const legs = [];
  for (const side of [-1, 1]) {
    const arm = pivot(body, side * 0.52, 0.0, 0.5);
    b.bar(arm, hide, [0, 0, 0], [side * 0.06, -0.32, 0.12], 0.1, 0.075, 5);
    b.bar(arm, hideDark, [side * 0.06, -0.32, 0.12], [side * 0.02, -0.5, 0.42], 0.075, 0.06, 5);
    const claws = clawHand(b, arm, [side * 0.02, -0.5, 0.44], hideDark, bone, 0.7);
    claws.hand.rotation.x = -0.9;
    arms.push({ arm, digits: claws.digits, side });

    const leg = pivot(body, side * 0.42, -0.72, -0.42);
    b.place(leg, b.ico(0.3, 0), hide, [0, -0.08, 0.06], [0.8, 1.2, 1.15]);
    b.bar(leg, hideDark, [0, -0.3, 0.2], [0, -0.66, -0.02], 0.12, 0.08, 5);
    b.place(leg, b.ico(0.13, 0), hideDark, [0, -0.72, 0.02], [1.1, 0.8, 1.3]);
    for (const toe of [-1, 0, 1]) b.spike(leg, bone, [toe * 0.08, -0.74, 0.1], [toe * 0.3, -0.75, 1], 0.32, 0.05);
    b.spike(leg, bone, [0, -0.7, -0.08], [0, -0.6, -1], 0.2, 0.04);
    legs.push(leg);
  }

  const tail = [];
  let tailParent = pivot(body, 0, -0.95, -0.75);
  [0.27, 0.2, 0.14, 0.09].forEach((radius, index) => {
    const segment = index === 0 ? tailParent : pivot(tailParent, 0, 0, -0.42);
    b.place(segment, b.cylinder(radius * 0.72, radius, 0.5, 5), index % 2 ? hide : hideDark, [0, 0, -0.22], null, [-Math.PI / 2, 0, 0]);
    b.spike(segment, crest, [0, radius * 0.7, -0.2], [0, 1, -0.7], 0.2 + radius * 0.5, 0.06);
    tail.push(segment);
    tailParent = segment;
  });
  const tailBlade = pivot(tailParent, 0, 0, -0.42);
  b.place(tailBlade, b.octa(0.22), bone, [0, 0, -0.26], [0.9, 0.22, 1.9]);
  for (const side of [-1, 1]) b.spike(tailBlade, bone, [side * 0.08, 0, -0.1], [side * 1, 0, 0.5], 0.28, 0.05);
  tail.push(tailBlade);

  const NECK_BEND = [0.75, -0.25, -0.1];
  const TAIL_BEND = [-0.7, 0.3, 0.35, 0.3, 0.2];
  const clock = rageClock();
  group.userData.animate = (seconds, enemy) => {
    const phase = enemy.phase || 0;
    const windup = enemy.windup || 0;
    const hurt = enemy.hurt || 0;
    const rage = enemy.rage || 0;
    const t = clock(seconds, rage) + phase;
    const wide = 1 + rage * 0.5;
    const beat = Math.sin(t * 4.2);
    const lift = 0.08 + beat * 0.36 * wide + windup * 0.5 - hurt * 0.25;
    for (let index = 0; index < 2; index += 1) {
      const side = wings[index].side;
      wings[index].wing.rotation.z = side * lift;
      wings[index].wing.rotation.y = side * (-0.3 - beat * 0.14 + windup * 0.25 - hurt * 0.3);
    }
    body.position.y = BODY_Y + Math.sin(t * 4.2 - 1.3) * 0.05 * wide;
    body.rotation.x = 0.12 - windup * 0.3 - hurt * 0.25;
    // A slow roar: the neck rears, the jaw swings open and the fire in it swells.
    const roar = Math.max(Math.pow(Math.max(0, Math.sin(t * 0.9)), 3), windup, hurt * 0.8);
    let bend = 0;
    for (let index = 0; index < neck.length; index += 1) {
      const segment = neck[index];
      const sway = Math.sin(t * 1.5 - index * 0.6) * 0.06 * wide;
      segment.rotation.x = NECK_BEND[index] + sway - (index === 0 ? windup * 0.55 + hurt * 0.5 : hurt * 0.2);
      segment.rotation.z = Math.sin(t * 1.1 - index * 0.7) * 0.07 * wide + Math.sin(seconds * 31) * hurt * 0.06;
      bend += segment.rotation.x;
    }
    head.rotation.x = 0.3 - bend - body.rotation.x - roar * 0.25 + windup * 0.2;
    head.rotation.y = Math.sin(t * 0.8) * 0.2;
    head.rotation.z = Math.sin(seconds * 37) * hurt * 0.12;
    jaw.rotation.x = 0.34 + roar * 0.5;
    const flare = 0.75 + roar * 0.4 + rage * 0.25 + Math.sin(seconds * 17 + phase) * 0.08;
    blaze.scale.set(flare, flare, flare);
    const glow = 1 + rage * 0.1 + Math.sin(t * 3.4) * (0.02 + rage * 0.05) + windup * 0.06;
    embers.scale.set(glow, 1 + (glow - 1) * 2, glow);
    for (let index = 0; index < 2; index += 1) {
      const { arm, digits, side } = arms[index];
      arm.rotation.x = -0.15 + Math.sin(t * 1.9 + index * 1.4) * 0.14 * wide - windup * 0.5 - hurt * 0.4;
      arm.rotation.z = side * (0.1 + hurt * 0.7);
      const curl = -0.25 + Math.sin(t * 2.6 + index * 2) * 0.3 - rage * 0.3;
      for (let finger = 0; finger < digits.length; finger += 1) digits[finger].rotation.x = curl;
      legs[index].rotation.x = 0.2 + Math.sin(t * 2.1 + index * 1.3) * 0.12 * wide - windup * 0.5 + hurt * 0.4;
    }
    for (let index = 0; index < tail.length; index += 1) {
      tail[index].rotation.x = TAIL_BEND[index] + (index === 0 ? windup * 0.4 : 0);
      tail[index].rotation.y = Math.sin(t * 2 - index * 0.7) * 0.2 * wide + Math.sin(seconds * 29) * hurt * 0.05;
    }
  };
  group.userData.animate(0, {});
  return group;
}

// Glowmite — a spindly insect with a swollen glowing abdomen, six legs and antennae.
export function buildGlowmite(type, kit) {
  const b = builder(kit);
  const body = kit.mat(mix(type.body, type.trim, 0.18));
  const shell = kit.mat(type.trim);
  const dark = kit.mat(tone(type.body, 0.55));
  const bone = kit.mat(BONE);
  const eyeGlow = kit.glow(type.eye, 1.5);
  const lamp = kit.glow(type.eye, 1.1);
  const group = new THREE.Group();

  const abdomen = pivot(group, 0, 0.56, -0.12);
  b.place(abdomen, b.ico(0.38, 1), shell, [0, 0, -0.28], [1, 0.9, 1.3]);
  b.place(abdomen, b.ico(0.2, 0), lamp, [0, -0.02, -0.66], [1, 0.9, 1]);
  b.place(group, b.ico(0.25, 0), body, [0, 0.64, 0.1]);
  const head = pivot(group, 0, 0.76, 0.4);
  b.place(head, b.ico(0.23, 0), body, [0, 0, 0], [1.1, 0.9, 1]);
  const antennae = [];
  for (const side of [-1, 1]) {
    b.place(head, b.octa(0.1), eyeGlow, [side * 0.15, 0.06, 0.13]);
    b.place(head, b.octa(0.05), eyeGlow, [side * 0.07, -0.07, 0.19]);
    b.place(head, b.cone(0.035, 0.16, 4), bone, [side * 0.08, -0.14, 0.18], null, [2.0, 0, side * 0.3]);
    const antenna = pivot(head, side * 0.1, 0.16, 0.05);
    b.place(antenna, b.cylinder(0.012, 0.02, 0.42, 3), dark, [0, 0.2, 0]);
    b.place(antenna, b.octa(0.045), lamp, [0, 0.42, 0]);
    antenna.rotation.set(0.5, 0, side * -0.35);
    antennae.push(antenna);
  }
  const legs = [];
  [-0.12, 0.08, 0.28].forEach((z, index) => {
    for (const side of [-1, 1]) {
      const leg = pivot(group, side * 0.18, 0.62, z);
      b.place(leg, b.cylinder(0.03, 0.04, 0.42, 4), dark, [side * 0.18, 0.08, 0], null, [0, 0, side * -1.0]);
      b.place(leg, b.cylinder(0.018, 0.03, 0.78, 4), dark, [side * 0.42, -0.2, 0], null, [0, 0, side * 0.22]);
      legs.push({ leg, offset: (index + (side > 0 ? 1 : 0)) * Math.PI });
    }
  });

  group.userData.animate = (seconds, enemy) => {
    const phase = enemy.phase || 0;
    const step = seconds * 9 + phase;
    for (const { leg, offset } of legs) leg.rotation.y = Math.sin(step + offset) * 0.42;
    antennae.forEach((antenna, index) => { antenna.rotation.x = 0.5 + Math.sin(seconds * 3 + phase + index) * 0.2; });
    const pulse = 1 + Math.sin(seconds * 4 + phase) * 0.06;
    abdomen.scale.set(pulse, pulse, pulse);
    head.rotation.y = Math.sin(seconds * 2.3 + phase) * 0.25;
  };
  group.userData.animate(0, {});
  return group;
}

// Ash Oaf — a heavy stone golem: boulder torso, head sunk between its shoulders, rock fists.
export function buildAshOaf(type, kit) {
  const b = builder(kit);
  const rock = kit.mat(mix(type.body, type.trim, 0.3));
  const rockLight = kit.mat(type.trim);
  const rockDark = kit.mat(tone(type.body, 0.8));
  const eyeGlow = kit.glow(type.eye, 1.6);
  const group = new THREE.Group();

  const torso = pivot(group, 0, 1.05, 0);
  b.place(torso, b.dodeca(0.62), rock, [0, 0, 0], [1.15, 1, 0.85], [0.3, 0.4, 0]);
  b.place(torso, b.dodeca(0.45), rockLight, [0, -0.36, 0.12], null, [0.8, 0.2, 0.5]);
  b.place(torso, b.box(0.05, 0.34, 0.03), eyeGlow, [0.12, 0.02, 0.5], null, [0, 0, 0.5]);
  b.place(torso, b.box(0.04, 0.22, 0.03), eyeGlow, [-0.02, -0.12, 0.5], null, [0, 0, -0.7]);
  const head = pivot(torso, 0, 0.5, 0.2);
  b.place(head, b.dodeca(0.3), rockLight, [0, 0, 0], [1.1, 0.8, 1], [0.2, 0.6, 0]);
  b.place(head, b.box(0.5, 0.09, 0.2), rockDark, [0, 0.1, 0.2], null, [0.3, 0, 0]);
  for (const side of [-1, 1]) {
    b.place(head, b.octa(0.07), eyeGlow, [side * 0.13, 0.0, 0.25], [1.3, 0.8, 1]);
    b.place(torso, b.dodeca(0.3), rockLight, [side * 0.7, 0.36, 0], null, [side, 0.5, 0.2]);
  }
  const limbs = {};
  for (const [name, side] of [['Left', -1], ['Right', 1]]) {
    const arm = pivot(group, side * 0.76, 1.38, 0);
    b.place(arm, b.cylinder(0.14, 0.17, 0.5, 5), rock, [0, -0.3, 0]);
    b.place(arm, b.dodeca(0.3), rockDark, [0, -0.76, 0.05], null, [side * 0.4, 0.3, 0.2]);
    limbs[`arm${name}`] = arm;
    const leg = pivot(group, side * 0.3, 0.56, 0);
    b.place(leg, b.cylinder(0.17, 0.2, 0.42, 5), rock, [0, -0.2, 0]);
    b.place(leg, b.dodeca(0.24), rockDark, [0, -0.44, 0.08], [1, 0.5, 1.4]);
    limbs[`leg${name}`] = leg;
  }

  group.userData.animate = (seconds, enemy) => {
    const phase = enemy.phase || 0;
    const step = seconds * 4.8 + phase;
    limbs.legLeft.rotation.x = Math.sin(step) * 0.4;
    limbs.legRight.rotation.x = -Math.sin(step) * 0.4;
    limbs.armLeft.rotation.x = -Math.sin(step) * 0.45;
    limbs.armRight.rotation.x = Math.sin(step) * 0.45;
    torso.rotation.z = Math.sin(step) * 0.05;
    head.rotation.y = Math.sin(seconds * 1.4 + phase) * 0.2;
  };
  group.userData.animate(0, {});
  return group;
}

// Cinder Imp — a slim, quick little devil with a toothy grin, ember-tipped horns and tail.
export function buildCinderImp(type, kit) {
  const b = builder(kit);
  const skin = kit.mat(mix(type.body, type.trim, 0.25));
  const skinDark = kit.mat(tone(type.body, 0.9));
  const accent = kit.mat(type.trim);
  const dark = kit.mat(0x2a0d10);
  const bone = kit.mat(BONE);
  const eyeGlow = kit.glow(type.eye, 1.4);
  const ember = kit.glow(type.trim, 1.5);
  const group = new THREE.Group();

  const torso = pivot(group, 0, 0.76, 0);
  b.place(torso, b.ico(0.3, 0), skin, [0, 0, 0], [0.9, 1.25, 0.8]);
  b.place(torso, b.ico(0.2, 0), accent, [0, -0.04, 0.12], [0.85, 1.1, 0.6]);
  const head = pivot(group, 0, 1.3, 0.06);
  b.place(head, b.ico(0.31, 1), skin, [0, 0, 0], [1.05, 0.95, 1]);
  b.place(head, b.box(0.3, 0.07, 0.06), dark, [0, -0.13, 0.27]);
  for (const side of [-1, 1]) {
    b.place(head, b.octa(0.075), eyeGlow, [side * 0.12, 0.05, 0.27], [1.3, 0.75, 1], [0, 0, side * 0.35]);
    b.place(head, b.cone(0.025, 0.08, 4), bone, [side * 0.07, -0.12, 0.3], null, [Math.PI, 0, 0]);
    b.place(head, b.cone(0.075, 0.44, 4), accent, [side * 0.2, 0.36, -0.02], null, [0, 0, side * -0.5]);
    b.place(head, b.octa(0.05), ember, [side * 0.31, 0.56, -0.02]);
    b.place(head, b.cone(0.07, 0.3, 3), skinDark, [side * 0.36, 0.04, -0.03], null, [0, 0, side * -1.3]);
  }
  const limbs = {};
  for (const [name, side] of [['Left', -1], ['Right', 1]]) {
    const arm = pivot(group, side * 0.3, 0.98, 0);
    b.place(arm, b.cylinder(0.045, 0.055, 0.46, 4), skin, [0, -0.2, 0]);
    b.place(arm, b.cone(0.05, 0.12, 4), bone, [0, -0.47, 0.02], null, [Math.PI, 0, 0]);
    limbs[`arm${name}`] = arm;
    const leg = pivot(group, side * 0.14, 0.5, 0);
    b.place(leg, b.cylinder(0.06, 0.07, 0.44, 4), skinDark, [0, -0.22, 0]);
    b.place(leg, b.cylinder(0.03, 0.09, 0.26, 4), skinDark, [0, -0.45, 0.1], [1, 1, 0.5], [Math.PI / 2, 0, 0]);
    limbs[`leg${name}`] = leg;
  }
  const tail = [];
  let tailParent = pivot(group, 0, 0.56, -0.2);
  [0.055, 0.04, 0.03].forEach((radius, index) => {
    const segment = index === 0 ? tailParent : pivot(tailParent, 0, 0, -0.3);
    b.place(segment, b.cylinder(radius * 0.7, radius, 0.32, 4), skinDark, [0, 0, -0.15], null, [-Math.PI / 2, 0, 0]);
    tail.push(segment);
    tailParent = segment;
  });
  b.place(pivot(tailParent, 0, 0, -0.3), b.octa(0.09), ember, [0, 0, -0.04], [0.8, 0.8, 1.4]);

  group.userData.animate = (seconds, enemy) => {
    const phase = enemy.phase || 0;
    const step = seconds * 9.6 + phase;
    limbs.legLeft.rotation.x = Math.sin(step) * 0.7;
    limbs.legRight.rotation.x = -Math.sin(step) * 0.7;
    limbs.armLeft.rotation.x = -Math.sin(step) * 0.8;
    limbs.armRight.rotation.x = Math.sin(step) * 0.8;
    limbs.armLeft.rotation.z = -0.25;
    limbs.armRight.rotation.z = 0.25;
    torso.rotation.x = 0.18;
    head.rotation.z = Math.sin(seconds * 3 + phase) * 0.12;
    tail.forEach((segment, index) => {
      segment.rotation.x = 0.5;
      segment.rotation.y = Math.sin(seconds * 5 + phase - index * 0.8) * 0.4;
    });
  };
  group.userData.animate(0, {});
  return group;
}

// Bog Shambler — a tall cloaked specter: hooded void of a face, long drooping arms.
export function buildBogShambler(type, kit) {
  const b = builder(kit);
  const cloak = kit.mat(mix(type.body, type.trim, 0.3));
  const cloakDark = kit.mat(mix(type.body, type.trim, 0.1));
  const accent = kit.mat(type.trim);
  const voidDark = kit.mat(0x0d0716);
  const eyeGlow = kit.glow(type.eye, 1.6);
  const group = new THREE.Group();

  const robe = pivot(group, 0, 0, 0);
  b.place(robe, b.cone(0.62, 1.5, 7), cloak, [0, 0.75, 0]);
  b.place(robe, b.cone(0.74, 0.7, 7), cloakDark, [0, 0.36, 0], null, [0, 0.4, 0]);
  b.place(group, b.ico(0.32, 0), accent, [0, 1.4, 0], [1.5, 0.6, 1]);
  const head = pivot(group, 0, 1.75, 0.05);
  b.place(head, b.ico(0.37, 1), cloak, [0, 0, 0], [1, 1.1, 1]);
  b.place(head, b.ico(0.26, 0), voidDark, [0, -0.03, 0.18], [1, 1.05, 0.6]);
  b.place(head, b.cone(0.2, 0.4, 5), cloakDark, [0, 0.42, -0.14], null, [-0.6, 0, 0]);
  for (const side of [-1, 1]) b.place(head, b.octa(0.065), eyeGlow, [side * 0.11, 0.0, 0.33], [1.2, 0.8, 1]);
  const arms = [];
  for (const side of [-1, 1]) {
    const arm = pivot(group, side * 0.5, 1.38, 0.05);
    b.place(arm, b.cylinder(0.05, 0.11, 0.95, 4), cloakDark, [0, -0.45, 0.1], null, [-0.3, 0, 0]);
    b.place(arm, b.octa(0.1), accent, [0, -0.95, 0.26], [0.8, 1.4, 0.8]);
    arms.push(arm);
  }

  group.userData.animate = (seconds, enemy) => {
    const phase = enemy.phase || 0;
    const sway = Math.sin(seconds * 2 + phase);
    robe.rotation.z = sway * 0.05;
    robe.scale.x = 1 + Math.sin(seconds * 3.1 + phase) * 0.04;
    head.rotation.z = sway * 0.12;
    head.rotation.x = Math.sin(seconds * 1.3 + phase) * 0.08;
    arms[0].rotation.x = -0.25 + Math.sin(seconds * 2.4 + phase) * 0.3;
    arms[1].rotation.x = -0.25 - Math.sin(seconds * 2.4 + phase) * 0.3;
  };
  group.userData.animate(0, {});
  return group;
}

// Pulse Heart — the healer: a faceted heart with a pale cross on its front.
export function buildPulseHeart(type, kit) {
  const b = builder(kit);
  const heart = kit.glow(type.body, 0.45);
  const highlight = kit.glow(type.trim, 0.55);
  const cross = kit.glow(type.eye, 0.9);
  const group = new THREE.Group();
  for (const side of [-1, 1]) b.place(group, b.ico(0.5, 1), heart, [side * 0.36, 1.78, 0], [1, 1, 0.74]);
  b.place(group, b.cone(0.86, 1.1, 8), heart, [0, 1.12, 0], [1, 1, 0.66], [Math.PI, 0, 0]);
  b.place(group, b.ico(0.13, 0), highlight, [-0.46, 2.02, 0.3]);
  b.place(group, b.box(0.42, 0.13, 0.08), cross, [0, 1.52, 0.4]);
  b.place(group, b.box(0.13, 0.42, 0.08), cross, [0, 1.52, 0.4]);
  return group;
}

// Verdant Colossus — a hunched ogre: a small tusked head sunk between huge shoulders, one
// horn snapped off, a spined hump, one arm swollen into a clawed fist that hangs to the
// ground, the other holding a spiked club over its shoulder.
export function buildVerdantColossus(type, kit) {
  const b = bossBuilder(kit);
  const hide = kit.mat(mix(type.body, type.trim, 0.26));
  const hideDark = kit.mat(mix(type.body, type.trim, 0.06));
  const accent = kit.mat(mix(type.body, type.trim, 0.75));
  const wood = kit.mat(mix(type.body, 0x3a2a14, 0.7));
  const dark = kit.mat(0x0c120c);
  const bone = kit.mat(BONE);
  const eyeGlow = kit.glow(type.eye, 1.8);
  const group = new THREE.Group();

  const LEAN = 0.45;
  b.place(group, b.ico(0.42, 0), hideDark, [0, 0.98, -0.12], [1.3, 0.7, 1]);
  b.place(group, b.cylinder(0.5, 0.46, 0.14, 6), accent, [0, 1.04, -0.1], [1.15, 1, 0.9]);
  for (const [x, length] of [[-0.2, 0.52], [0.02, 0.62], [0.24, 0.46]]) {
    b.place(group, b.box(0.2, length, 0.04), dark, [x, 1.0 - length / 2, 0.36], null, [-0.12, 0, x * 0.3]);
  }
  for (const x of [-0.42, 0.44]) {
    b.place(group, b.ico(0.1, 0), bone, [x, 0.98, 0.34], [1, 1.1, 0.9]);
    b.place(group, b.box(0.12, 0.04, 0.04), dark, [x, 0.99, 0.43]);
  }

  const torso = pivot(group, 0, 1.0, -0.1);
  b.place(torso, b.ico(0.5, 1), hide, [0, 0.28, 0.06], [1.25, 0.9, 1]);
  b.place(torso, b.ico(0.72, 1), hide, [0, 0.85, 0], [1.42, 0.95, 1.05]);
  b.place(torso, b.ico(0.52, 0), hideDark, [0, 1.12, -0.34], [1.5, 0.8, 0.9]);
  // Slabs of chest and belly.
  for (const side of [-1, 1]) {
    b.place(torso, b.dodeca(0.34), hideDark, [side * 0.36, 0.78, 0.6], [1.15, 0.85, 0.5], [0.1, side * 0.3, 0]);
    b.place(torso, b.box(0.3, 0.17, 0.1), hideDark, [side * 0.18, 0.36, 0.5], null, [-0.25, 0, 0]);
    b.place(torso, b.box(0.28, 0.15, 0.1), hideDark, [side * 0.17, 0.16, 0.4], null, [-0.5, 0, 0]);
  }
  [[-0.5, 1.36, 0.42, -0.5], [-0.18, 1.5, 0.6, -0.15], [0.2, 1.48, 0.5, 0.2], [0.52, 1.34, 0.36, 0.55], [0, 1.2, 0.44, 0]].forEach(([x, y, length, tilt], index) => {
    b.spike(torso, index === 4 ? accent : bone, [x, y - 0.1, index === 4 ? -0.7 : -0.4], [tilt, 1, index === 4 ? -1.2 : -0.5], length, 0.11);
  });

  const head = pivot(torso, 0, 1.2, 0.56);
  b.place(head, b.ico(0.3, 1), hide, [0, 0, 0], [1.1, 0.9, 1]);
  b.place(head, b.box(0.62, 0.13, 0.3), hideDark, [0, 0.14, 0.2], null, [0.35, 0, 0]);
  b.place(head, b.box(0.14, 0.14, 0.12), hideDark, [0, -0.02, 0.3]);
  b.place(head, b.box(0.4, 0.1, 0.2), dark, [0, -0.16, 0.2]);
  toothRow(b, head, bone, { width: 0.34, count: 4, length: 0.11, y: -0.11, z: 0.3 });
  for (const side of [-1, 1]) {
    b.place(head, b.box(0.28, 0.1, 0.12), hideDark, [side * 0.17, 0.09, 0.3], null, [0.2, 0, side * 0.4]);
    b.place(head, b.octa(0.085), eyeGlow, [side * 0.16, 0.02, 0.27], [1.5, 0.6, 0.8], [0, 0, side * 0.4]);
    b.spike(head, accent, [side * 0.3, 0, -0.02], [side * 1, 0.1, -0.4], 0.32, 0.09);
  }
  // Bull horns sweeping forward; the left one is a broken stump.
  b.bar(head, bone, [0.24, 0.16, -0.04], [0.6, 0.34, 0.04], 0.13, 0.1, 5);
  b.spike(head, bone, [0.58, 0.32, 0.04], [0.3, 0.7, 0.75], 0.6, 0.1, 5);
  b.bar(head, bone, [-0.24, 0.16, -0.04], [-0.5, 0.3, 0.02], 0.13, 0.11, 5);
  b.spike(head, bone, [-0.48, 0.28, 0.02], [-0.9, 0.7, 0.1], 0.16, 0.08, 3);
  const jaw = pivot(head, 0, -0.14, -0.02);
  b.place(jaw, b.box(0.58, 0.2, 0.46), hideDark, [0, -0.1, 0.22]);
  toothRow(b, jaw, bone, { width: 0.3, count: 3, length: 0.1, y: -0.02, z: 0.4, direction: 1, bow: 0 });
  for (const side of [-1, 1]) b.spike(jaw, bone, [side * 0.25, -0.04, 0.38], [side * 0.22, 1, 0.12], 0.42, 0.075, 5);

  // Arm 0 is the swollen fist arm, arm 1 carries the club.
  const arms = [];
  for (const side of [-1, 1]) {
    const big = side === -1;
    const girth = big ? 1.3 : 1;
    const arm = pivot(torso, side * 1.02, 0.98, 0.04);
    b.place(arm, b.dodeca(0.36 * girth), accent, [side * 0.06, 0.08, 0], [1, 0.8, 1], [0.3, 0.4, side * 0.3]);
    b.spike(arm, bone, [side * 0.1, 0.22, 0], [side * 0.6, 1, -0.1], big ? 0.5 : 0.36, 0.1);
    b.spike(arm, bone, [side * 0.26, 0.12, 0.06], [side * 1, 0.45, 0.1], big ? 0.38 : 0.28, 0.08);
    if (big) b.spike(arm, bone, [side * 0.02, 0.26, -0.18], [side * 0.2, 1, -0.6], 0.34, 0.08);
    b.place(arm, b.cylinder(0.2 * girth, 0.24 * girth, 0.66, 5), hide, [0, -0.36, 0]);
    const elbow = pivot(arm, 0, -0.7, 0);
    b.place(elbow, b.ico(0.2 * girth, 0), hideDark, [0, 0, 0]);
    b.spike(elbow, bone, [0, 0, -0.12 * girth], [0, 0.2, -1], 0.26 * girth, 0.07);
    b.place(elbow, b.cylinder(0.27 * girth, 0.19 * girth, 0.66, 5), hideDark, [0, -0.36, 0]);
    b.place(elbow, b.cylinder(0.3 * girth, 0.3 * girth, 0.16, 5), accent, [0, -0.56, 0]);
    const claws = clawHand(b, elbow, [0, -0.66, 0], hide, bone, big ? 1.55 : 1.0, big ? 4 : 3);
    arms.push({ arm, elbow, hand: claws.hand, digits: claws.digits, side });
  }
  const club = pivot(arms[1].hand, 0, -0.16, 0.06);
  b.bar(club, wood, [0, -0.3, 0], [0, 1.5, 0], 0.07, 0.22, 6);
  b.place(club, b.cylinder(0.2, 0.18, 0.12, 6), accent, [0, 0.74, 0]);
  b.place(club, b.dodeca(0.24), wood, [0, 1.5, 0], [1, 0.8, 1]);
  [[1, 0, 0, 1.0], [-1, 0, 0.2, 1.22], [0, 0, 1, 1.12], [0, 0, -1, 1.34], [0.7, 0, 0.7, 1.4], [-0.7, 0, -0.7, 1.02], [-0.6, 0.2, 0.8, 1.46], [0, 1, 0, 1.62]].forEach(([x, y, z, height]) => {
    b.spike(club, bone, [x * 0.14, height, z * 0.14], [x, y + 0.15, z], 0.3, 0.07);
  });

  const legs = [];
  for (const side of [-1, 1]) {
    const leg = pivot(group, side * 0.44, 0.96, -0.1);
    b.place(leg, b.cylinder(0.27, 0.21, 0.52, 5), hide, [side * 0.07, -0.25, 0.06], null, [-0.2, 0, side * 0.24]);
    b.place(leg, b.ico(0.2, 0), accent, [side * 0.14, -0.48, 0.14]);
    b.place(leg, b.cylinder(0.17, 0.25, 0.42, 5), hideDark, [side * 0.16, -0.68, 0.04]);
    b.place(leg, b.dodeca(0.27), hide, [side * 0.17, -0.84, 0.16], [1, 0.42, 1.5]);
    for (const toe of [-1, 0, 1]) b.spike(leg, bone, [side * 0.17 + toe * 0.14, -0.88, 0.44], [toe * 0.2, -0.1, 1], 0.24, 0.07);
    legs.push(leg);
  }
  const tail = [];
  let tailParent = pivot(group, 0, 0.9, -0.44);
  [0.09, 0.07, 0.05].forEach((radius, index) => {
    const segment = index === 0 ? tailParent : pivot(tailParent, 0, 0, -0.4);
    b.place(segment, b.cylinder(radius * 0.75, radius, 0.44, 4), hideDark, [0, 0, -0.2], null, [-Math.PI / 2, 0, 0]);
    tail.push(segment);
    tailParent = segment;
  });
  const fork = pivot(tailParent, 0, 0, -0.4);
  for (const side of [-1, 1]) b.spike(fork, accent, [0, 0, 0], [side * 0.6, 0, -1], 0.36, 0.07);

  const clock = rageClock();
  group.userData.animate = (seconds, enemy) => {
    const phase = enemy.phase || 0;
    const windup = enemy.windup || 0;
    const hurt = enemy.hurt || 0;
    const rage = enemy.rage || 0;
    const t = clock(seconds, rage) + phase;
    const wide = 1 + rage * 0.5;
    const step = Math.sin(t * 3.6);
    const breath = Math.sin(t * 1.7);
    const shake = Math.sin(seconds * 34) * hurt;
    legs[0].rotation.x = step * 0.3 * wide;
    legs[1].rotation.x = -step * 0.3 * wide;
    torso.rotation.x = LEAN + breath * 0.035 * wide - windup * 0.4 - hurt * 0.45;
    torso.rotation.z = step * 0.05 * wide + shake * 0.03;
    torso.rotation.y = step * 0.07 - windup * 0.25;
    torso.scale.z = 1 + breath * 0.03;
    head.rotation.x = -LEAN + 0.05 + Math.sin(t * 1.3) * 0.05 - hurt * 0.5 + windup * 0.3;
    head.rotation.y = Math.sin(t * 0.9) * 0.3 * wide;
    head.rotation.z = shake * 0.12;
    // An idle snarl; the jaw drops for a roar on a wind-up or a hit.
    const snarl = Math.pow(Math.max(0, Math.sin(t * 0.7 + 1)), 4);
    jaw.rotation.x = 0.06 + Math.max(snarl * 0.3, windup * 0.5, hurt * 0.45) + rage * 0.1;
    const fist = arms[0];
    const clubArm = arms[1];
    fist.arm.rotation.x = -LEAN - 0.1 + step * 0.22 * wide + windup * 0.3 - hurt * 0.3;
    fist.arm.rotation.z = -0.08 - hurt * 0.7 - breath * 0.03;
    fist.elbow.rotation.x = -0.25 - Math.max(0, -step) * 0.15 - rage * 0.25;
    const clench = -0.5 + Math.sin(t * 2.2) * 0.3 * wide - rage * 0.4;
    for (let finger = 0; finger < fist.digits.length; finger += 1) fist.digits[finger].rotation.x = clench;
    // The club rests on the shoulder, and is hauled back over the head on a wind-up.
    clubArm.arm.rotation.x = -LEAN - 0.35 - step * 0.08 - windup * 1.5 + hurt * 0.3;
    clubArm.arm.rotation.z = 0.25 + hurt * 0.7 + breath * 0.03;
    clubArm.elbow.rotation.x = -1.15 - windup * 0.5 + Math.sin(t * 1.7 + 1) * 0.06 * wide;
    clubArm.hand.rotation.x = -0.2;
    club.rotation.x = 1.35 + Math.sin(t * 1.7) * 0.06 * wide - windup * 0.3;
    club.rotation.z = -0.18;
    for (let finger = 0; finger < clubArm.digits.length; finger += 1) clubArm.digits[finger].rotation.x = -1.2;
    for (let index = 0; index < tail.length; index += 1) {
      tail[index].rotation.x = 0.3;
      tail[index].rotation.y = Math.sin(t * 2.6 - index * 0.8) * 0.35 * wide;
    }
  };
  group.userData.animate(0, {});
  return group;
}

// Storm Warden — a skeletal storm lord: a crowned skull with burning sockets and a hanging
// jaw, spiked pauldrons over a ragged cloak, a storm caged in its ribs, long clawed arms, a
// lightning-bladed staff in one hand and a crackling orb over the other.
export function buildStormWarden(type, kit) {
  const b = bossBuilder(kit);
  const boneMat = kit.mat(mix(type.trim, 0xffffff, 0.45));
  const boneShade = kit.mat(mix(type.trim, type.body, 0.25));
  const dark = kit.mat(mix(type.body, 0x000000, 0.45));
  const cloth = kit.mat(mix(type.body, 0x000000, 0.25), { side: THREE.DoubleSide });
  const iron = kit.mat(mix(type.body, type.trim, 0.18));
  const crown = kit.glow(0xffd76a, 0.9);
  const storm = kit.glow(type.trim, 1.6);
  const eyeGlow = kit.glow(type.eye, 1.9);
  const group = new THREE.Group();
  // Built a little large and scaled down, to keep the height the game expects.
  const rig = pivot(group, 0, 0, 0);
  rig.scale.setScalar(0.9);

  // Pelvis, and a kilt of rags the legs show through.
  b.place(rig, b.ico(0.27, 0), boneShade, [0, 1.0, 0], [1.4, 0.6, 0.85]);
  const rags = [];
  for (let index = 0; index < 9; index += 1) {
    const angle = (index / 9) * Math.PI * 2 + 0.35;
    const rag = pivot(rig, Math.sin(angle) * 0.34, 1.04, Math.cos(angle) * 0.24);
    const length = 0.55 + ((index * 5) % 4) * 0.13;
    b.place(rag, b.cone(0.14, length, 3), index % 2 ? cloth : dark, [0, -length / 2, 0], [1, 1, 0.3], [Math.PI, angle, 0]);
    rags.push({ rag, angle });
  }
  const legs = [];
  for (const side of [-1, 1]) {
    const leg = pivot(rig, side * 0.22, 0.96, 0);
    b.bar(leg, boneMat, [0, 0, 0], [side * 0.05, -0.44, 0.04], 0.07, 0.055);
    b.place(leg, b.octa(0.09), boneShade, [side * 0.05, -0.46, 0.04]);
    b.bar(leg, boneMat, [side * 0.05, -0.46, 0.04], [side * 0.06, -0.9, 0], 0.055, 0.045);
    b.place(leg, b.cylinder(0.03, 0.11, 0.32, 4), boneShade, [side * 0.06, -0.92, 0.12], [1, 1, 0.45], [Math.PI / 2, 0, 0]);
    legs.push(leg);
  }

  const CHEST_Y = 1.02;
  const chest = pivot(rig, 0, CHEST_Y, 0);
  b.bar(chest, boneShade, [0, 0, -0.06], [0, 0.98, -0.1], 0.07, 0.06);
  const ribs = [];
  [[0.2, 0.3], [0.38, 0.4], [0.56, 0.46], [0.74, 0.44]].forEach(([y, radius]) => {
    ribs.push(b.place(chest, b.ring(radius, 0.045, 8), boneMat, [0, y, 0.02], [1.25, 0.72, 1], [Math.PI / 2, 0, 0]));
  });
  b.place(chest, b.box(0.1, 0.5, 0.06), boneMat, [0, 0.56, 0.34], null, [-0.1, 0, 0]);
  const core = pivot(chest, 0, 0.5, 0.04);
  b.place(core, b.ico(0.19, 0), storm, [0, 0, 0]);
  const arcs = pivot(core, 0, 0, 0);
  for (const [x, y, z, turn] of [[0.2, 0.1, 0, 0.6], [-0.2, -0.06, 0.06, -0.7], [0.04, 0.2, -0.05, 1.5], [-0.05, -0.2, 0.08, 2.3]]) {
    b.place(arcs, b.octa(0.05), storm, [x, y, z], [0.5, 3, 0.5], [0, 0, turn]);
  }
  b.place(chest, b.box(1.5, 0.1, 0.14), boneShade, [0, 0.92, -0.02]);
  // Pauldrons and a high collar of iron spikes behind the skull.
  for (const side of [-1, 1]) {
    b.place(chest, b.dodeca(0.3), iron, [side * 0.78, 0.98, -0.02], [1.15, 0.7, 1.05], [0.2, side * 0.4, side * -0.25]);
    b.place(chest, b.cone(0.3, 0.3, 4), dark, [side * 0.8, 0.82, 0], [1.1, 1, 0.9], [Math.PI, 0.6, 0]);
    b.spike(chest, boneMat, [side * 0.74, 1.1, -0.02], [side * 0.35, 1, 0], 0.5, 0.09);
    b.spike(chest, boneMat, [side * 0.95, 1.04, 0], [side * 1, 0.6, 0], 0.36, 0.08);
    b.spike(chest, boneMat, [side * 0.84, 1.06, 0.2], [side * 0.5, 0.6, 1], 0.24, 0.06);
    b.spike(chest, dark, [side * 0.3, 0.92, -0.22], [side * 0.45, 1, -0.25], 0.82, 0.12, 3);
    b.spike(chest, dark, [side * 0.52, 0.92, -0.2], [side * 0.9, 1, -0.2], 0.6, 0.1, 3);
  }
  const cape = pivot(chest, 0, 0.96, -0.24);
  cape.add(kit.mesh(fanGeometry(1, [0, 0, 0], [[-0.95, -0.1, 0.1], [-1.0, -1.25, -0.1], [-0.6, -1.85, -0.22], [-0.15, -1.45, -0.3], [0.3, -1.9, -0.26], [0.72, -1.4, -0.16], [1.02, -1.7, -0.06], [0.95, -0.1, 0.1]], [0.05, 0.3, 0.42, 0.36, 0.45, 0.3, 0.1]), cloth));

  const skull = pivot(chest, 0, 1.22, 0.1);
  b.place(skull, b.ico(0.3, 1), boneMat, [0, 0.08, -0.02], [1, 1.08, 1.08]);
  b.place(skull, b.box(0.36, 0.2, 0.2), boneMat, [0, -0.12, 0.17]);
  b.place(skull, b.cone(0.05, 0.12, 3), dark, [0, -0.04, 0.29], [1, 1, 0.5], [0.15, Math.PI, 0]);
  toothRow(b, skull, boneMat, { width: 0.3, count: 5, length: 0.1, y: -0.2, z: 0.27, bow: 0.04, lean: 0 });
  for (const side of [-1, 1]) {
    b.place(skull, b.octa(0.13), dark, [side * 0.13, 0.07, 0.24], [1.15, 0.9, 0.7], [0, 0, side * 0.35]);
    b.place(skull, b.octa(0.06), eyeGlow, [side * 0.13, 0.06, 0.31], [1.3, 0.8, 0.6], [0, 0, side * 0.35]);
    b.place(skull, b.box(0.24, 0.08, 0.14), boneShade, [side * 0.14, 0.17, 0.26], null, [0.25, 0, side * 0.42]);
    b.place(skull, b.box(0.09, 0.1, 0.16), boneShade, [side * 0.22, -0.07, 0.2]);
  }
  b.place(skull, b.ring(0.3, 0.045, 8), crown, [0, 0.32, -0.02], null, [Math.PI / 2, 0, 0]);
  for (let index = 0; index < 7; index += 1) {
    const angle = -1.35 + index * 0.45;
    const length = [0.3, 0.44, 0.34, 0.58, 0.34, 0.44, 0.3][index];
    b.spike(skull, crown, [Math.sin(angle) * 0.3, 0.32, Math.cos(angle) * 0.3 - 0.02], [Math.sin(angle) * 0.3, 1, Math.cos(angle) * 0.12], length, 0.065);
  }
  const jaw = pivot(skull, 0, -0.2, 0.02);
  b.place(jaw, b.box(0.32, 0.09, 0.3), boneShade, [0, -0.1, 0.1]);
  for (const side of [-1, 1]) b.place(jaw, b.box(0.06, 0.2, 0.08), boneShade, [side * 0.17, -0.02, -0.02]);
  toothRow(b, jaw, boneMat, { width: 0.26, count: 5, length: 0.09, y: -0.06, z: 0.22, direction: 1, bow: 0.04, lean: 0 });

  // Arm 0 conjures the orb, arm 1 holds the staff.
  const arms = [];
  for (const side of [-1, 1]) {
    const arm = pivot(chest, side * 0.78, 0.9, 0);
    b.bar(arm, boneMat, [0, 0, 0], [0, -0.6, 0], 0.065, 0.05);
    const elbow = pivot(arm, 0, -0.62, 0);
    b.place(elbow, b.octa(0.085), boneShade, [0, 0, 0]);
    b.bar(elbow, boneMat, [0.025, 0, 0], [0.02, -0.58, 0], 0.04, 0.035);
    b.bar(elbow, boneMat, [-0.025, 0, 0], [-0.02, -0.58, 0], 0.04, 0.035);
    b.place(elbow, b.cylinder(0.1, 0.07, 0.24, 5), iron, [0, -0.42, 0]);
    const claws = clawHand(b, elbow, [0, -0.58, 0], boneShade, boneMat, 0.95, 4);
    arms.push({ arm, elbow, hand: claws.hand, digits: claws.digits, side });
  }
  const orb = pivot(arms[0].hand, 0, -0.42, 0.2);
  b.place(orb, b.ico(0.13, 0), storm, [0, 0, 0]);
  for (const [x, y, z] of [[0.24, 0, 0], [-0.2, 0.1, 0.1], [0, -0.08, -0.24]]) b.place(orb, b.octa(0.045), storm, [x, y, z], [0.6, 2.2, 0.6], [x * 3, 0, z * 4 + 0.6]);
  const staff = pivot(arms[1].hand, 0, -0.2, 0.05);
  b.bar(staff, dark, [0, -1.0, 0], [0, 0.95, 0], 0.045, 0.045, 5);
  b.place(staff, b.octa(0.1), iron, [0, 0.95, 0], [1.3, 0.8, 1.3]);
  b.spike(staff, iron, [0, -1.0, 0], [0, -1, 0], 0.2, 0.05);
  // A lightning bolt for a blade: three slanted shards.
  const bolt = pivot(staff, 0, 1.0, 0);
  b.place(bolt, b.octa(0.12), storm, [0.06, 0.18, 0], [0.7, 2.0, 0.35], [0, 0, -0.35]);
  b.place(bolt, b.octa(0.1), storm, [-0.04, 0.44, 0], [0.7, 1.8, 0.35], [0, 0, 0.5]);
  b.place(bolt, b.octa(0.09), storm, [0.04, 0.68, 0], [0.6, 2.0, 0.35], [0, 0, -0.2]);
  for (const side of [-1, 1]) b.spike(staff, iron, [0, 0.92, 0], [side * 1, 0.7, 0], 0.3, 0.05);

  const clock = rageClock();
  group.userData.animate = (seconds, enemy) => {
    const phase = enemy.phase || 0;
    const windup = enemy.windup || 0;
    const hurt = enemy.hurt || 0;
    const rage = enemy.rage || 0;
    const t = clock(seconds, rage) + phase;
    const wide = 1 + rage * 0.5;
    const step = Math.sin(t * 3.8);
    const rattle = Math.sin(seconds * 41) * hurt;
    legs[0].rotation.x = step * 0.34 * wide;
    legs[1].rotation.x = -step * 0.34 * wide;
    for (let index = 0; index < rags.length; index += 1) {
      const { rag, angle } = rags[index];
      const flutter = Math.sin(t * 2.4 + index * 1.9) * 0.14 * wide + 0.12;
      rag.rotation.x = Math.cos(angle) * flutter;
      rag.rotation.z = -Math.sin(angle) * flutter;
    }
    chest.position.y = CHEST_Y + Math.abs(step) * 0.025;
    chest.rotation.x = 0.16 + Math.sin(t * 1.5) * 0.03 * wide - windup * 0.22 - hurt * 0.35;
    chest.rotation.z = step * 0.035 * wide;
    chest.rotation.y = step * 0.05 + windup * 0.2;
    for (let index = 0; index < ribs.length; index += 1) {
      ribs[index].rotation.z = rattle * 0.16 * (index % 2 ? 1 : -1);
      ribs[index].position.y = 0.2 + index * 0.18 + Math.sin(t * 1.5 - index * 0.5) * 0.008 + Math.abs(rattle) * 0.02;
    }
    const pulse = 1 + rage * 0.35 + Math.sin(t * 4.5) * (0.1 + rage * 0.2) + windup * 0.3;
    core.scale.set(pulse, pulse, pulse);
    arcs.rotation.y = t * 3.1;
    arcs.rotation.z = Math.sin(t * 7.3) * 0.6;
    cape.rotation.x = 0.1 + Math.sin(t * 1.9) * 0.07 * wide + hurt * 0.3;
    cape.scale.x = 1 + Math.sin(t * 2.3) * 0.04;
    skull.rotation.x = -0.08 + Math.sin(t * 1.1) * 0.05 - hurt * 0.6 - windup * 0.15;
    skull.rotation.y = Math.sin(t * 0.8) * 0.28 * wide;
    skull.rotation.z = Math.sin(t * 1.6) * 0.06 + rattle * 0.12;
    // The jaw hangs open and chatters now and then; it drops wide for a wind-up or a hit.
    const chatter = Math.max(0, Math.sin(t * 0.6) - 0.5) * Math.max(0, Math.sin(t * 15)) * 0.6;
    jaw.rotation.x = 0.2 + chatter + Math.max(windup, hurt) * 0.5 + rage * 0.12;
    const caster = arms[0];
    const bearer = arms[1];
    caster.arm.rotation.x = -0.5 + Math.sin(t * 1.4) * 0.1 * wide - windup * 1.9 + hurt * 0.3;
    caster.arm.rotation.z = -0.3 - windup * 0.3 - hurt * 0.8;
    caster.elbow.rotation.x = -1.1 + Math.sin(t * 1.4 + 0.8) * 0.12 + windup * 0.7;
    caster.hand.rotation.x = -0.3;
    const grasp = -0.5 + Math.sin(t * 3.1) * 0.25 * wide;
    for (let finger = 0; finger < caster.digits.length; finger += 1) caster.digits[finger].rotation.x = grasp;
    const swell = 1 + Math.sin(t * 6) * 0.15 + windup * 0.9 + rage * 0.3;
    orb.scale.set(swell, swell, swell);
    orb.rotation.y = t * 4;
    orb.rotation.x = t * 2.3;
    bearer.arm.rotation.x = -0.75 - step * 0.05 + windup * 0.3 + hurt * 0.4;
    bearer.arm.rotation.z = 0.22 + hurt * 0.7;
    bearer.elbow.rotation.x = -0.75;
    for (let finger = 0; finger < bearer.digits.length; finger += 1) bearer.digits[finger].rotation.x = -1.3;
    // Keep the staff upright whatever the arm and chest are doing.
    staff.rotation.x = -(chest.rotation.x + bearer.arm.rotation.x + bearer.elbow.rotation.x) + 0.08 + hurt * 0.3;
    staff.rotation.z = -bearer.arm.rotation.z + 0.06;
    const crackle = 1 + Math.sin(seconds * 23 + phase) * 0.06 + rage * 0.15 + windup * 0.2;
    bolt.scale.set(crackle, 1 + (crackle - 1) * 0.5, crackle);
    bolt.rotation.y = t * 1.3;
  };
  group.userData.animate(0, {});
  return group;
}

// Solar Anvil — a winged sun beast rearing to pounce: a turning mane of blades, a
// sabre-toothed maw with a furnace in its throat and another in its chest, bladed
// wings, heavy raking forepaws and a spiked tail.
export function buildSolarAnvil(type, kit) {
  const b = bossBuilder(kit);
  const furColor = mix(type.body, 0xc98a3c, 0.34);
  const fur = kit.mat(furColor);
  const furDark = kit.mat(tone(furColor, 0.55));
  const gold = kit.mat(mix(type.trim, type.body, 0.3));
  const ray = kit.glow(type.trim, 0.6);
  const core = kit.glow(mix(type.trim, 0xff5a10, 0.5), 1.5);
  const feather = kit.mat(mix(type.trim, 0xf0641a, 0.45), { side: THREE.DoubleSide });
  const featherDark = kit.mat(mix(type.body, 0xf0641a, 0.5), { side: THREE.DoubleSide });
  const bone = kit.mat(BONE);
  const maw = kit.mat(0x1c0a04);
  const eyeGlow = kit.glow(type.eye, 1.9);
  const group = new THREE.Group();

  const BODY_Y = 1.55;
  const body = pivot(group, 0, BODY_Y, 0);
  b.place(body, b.ico(0.66, 1), fur, [0, 0, 0.3], [1.2, 1.05, 1.1]);
  b.place(body, b.ico(0.4, 0), furDark, [0, -0.05, -0.38], [0.9, 0.85, 1.25]);
  b.place(body, b.ico(0.46, 1), fur, [0, -0.05, -0.86], [1.05, 0.95, 1.05]);
  for (const side of [-1, 1]) {
    b.place(body, b.ico(0.38, 0), furDark, [side * 0.54, 0.3, 0.3], [1, 1.1, 1.2]);
    b.spike(body, gold, [side * 0.6, 0.5, 0.3], [side * 0.8, 1, -0.2], 0.42, 0.1);
    b.spike(body, gold, [side * 0.78, 0.34, 0.4], [side * 1, 0.3, 0.3], 0.3, 0.08);
  }
  [[0.62, 0.0, 0.4], [0.42, -0.36, 0.34], [0.36, -0.72, 0.3], [0.3, -1.08, 0.26]].forEach(([y, z, length]) => {
    b.spike(body, gold, [0, y - 0.12, z], [0, 1, -0.7], length, 0.09);
  });
  // The furnace in the chest, behind a ring of gold plates.
  const furnace = pivot(body, 0, -0.28, 0.98);
  b.place(furnace, b.octa(0.2), core, [0, 0, 0], [1, 1, 0.4]);
  for (let index = 0; index < 6; index += 1) {
    const angle = (index / 6) * Math.PI * 2 + 0.52;
    b.place(body, b.box(0.2, 0.24, 0.08), gold, [Math.cos(angle) * 0.31, -0.28 + Math.sin(angle) * 0.31, 0.93 - Math.abs(Math.cos(angle)) * 0.08 + Math.sin(angle) * 0.06], null, [0, 0, angle - Math.PI / 2]);
  }

  const head = pivot(body, 0, 0.5, 0.86);
  head.scale.setScalar(1.25);
  const mane = pivot(head, 0, 0, -0.2);
  b.place(mane, b.ico(0.44, 0), gold, [0, 0, 0], [1.1, 1.1, 0.4]);
  for (let index = 0; index < 12; index += 1) {
    const angle = (index / 12) * Math.PI * 2;
    const length = index % 2 === 0 ? 0.5 : 0.3;
    const reach = 0.4 + length / 2;
    b.place(mane, b.cone(0.12, length, 4), ray, [Math.cos(angle) * reach, Math.sin(angle) * reach, 0], [1, 1, 0.45], [0, 0, angle - Math.PI / 2]);
  }
  for (let index = 0; index < 9; index += 1) {
    const angle = (index / 9) * Math.PI * 2 + 0.2;
    b.spike(head, furDark, [Math.cos(angle) * 0.3, Math.sin(angle) * 0.3, -0.08], [Math.cos(angle), Math.sin(angle), -0.25], 0.34, 0.13);
  }
  b.place(head, b.ico(0.36, 1), fur, [0, 0, 0], [1.1, 0.95, 1]);
  b.place(head, b.box(0.38, 0.2, 0.36), fur, [0, -0.06, 0.36]);
  b.place(head, b.octa(0.07), maw, [0, 0.04, 0.55], [1.4, 0.8, 0.8]);
  b.place(head, b.box(0.3, 0.06, 0.42), maw, [0, -0.18, 0.3]);
  b.place(head, b.box(0.2, 0.12, 0.2), furDark, [0, 0.16, 0.3], null, [0.3, 0, 0]);
  toothRow(b, head, bone, { width: 0.18, count: 3, length: 0.08, y: -0.15, z: 0.52, bow: 0 });
  for (const side of [-1, 1]) {
    b.place(head, b.box(0.28, 0.1, 0.2), furDark, [side * 0.19, 0.17, 0.3], null, [0.25, 0, side * 0.45]);
    b.place(head, b.octa(0.08), eyeGlow, [side * 0.18, 0.08, 0.33], [1.5, 0.55, 0.8], [0, 0, side * 0.4]);
    b.spike(head, furDark, [side * 0.26, 0.24, 0], [side * 0.6, 1, -0.5], 0.26, 0.1);
    b.spike(head, bone, [side * 0.15, -0.13, 0.48], [side * 0.08, -1, 0.12], 0.36, 0.055, 5);
    b.spike(head, gold, [side * 0.1, 0.24, 0.2], [side * 0.4, 1, -0.2], 0.2, 0.05);
  }
  b.spike(head, gold, [0, 0.26, 0.2], [0, 1, -0.25], 0.32, 0.06);
  const jaw = pivot(head, 0, -0.2, 0.06);
  b.place(jaw, b.box(0.32, 0.1, 0.42), furDark, [0, -0.07, 0.23]);
  b.spike(jaw, furDark, [0, -0.1, 0.3], [0, -1, 0.2], 0.26, 0.1);
  const throat = pivot(head, 0, -0.22, 0.16);
  b.place(throat, b.ico(0.1, 0), core, [0, 0, 0.06], [1.4, 0.6, 1.6]);
  for (const side of [-1, 1]) b.spike(jaw, bone, [side * 0.12, -0.03, 0.4], [side * 0.1, 1, 0.05], 0.18, 0.04);
  toothRow(b, jaw, bone, { width: 0.14, count: 3, length: 0.07, y: -0.03, z: 0.43, direction: 1, bow: 0 });

  const featherTips = (length) => {
    const tips = [];
    for (let index = 0; index < 8; index += 1) {
      const angle = 1.18 + index * 0.25;
      const reach = length * (1 - index * 0.07);
      tips.push([Math.sin(angle) * reach, Math.cos(angle) * reach, -index * 0.03]);
    }
    return tips;
  };
  const wings = [];
  for (const side of [-1, 1]) {
    const wing = pivot(body, side * 0.44, 0.42, -0.12);
    wing.add(kit.mesh(fanGeometry(side, [0, 0, 0], featherTips(2.05), [0.46]), featherDark));
    const inner = kit.mesh(fanGeometry(side, [0, 0, 0], featherTips(1.3), [0.4]), feather);
    inner.position.z = 0.05;
    wing.add(inner);
    b.bar(wing, gold, [0, 0, 0.06], [side * 0.95, 0.38, 0.06], 0.1, 0.05);
    b.spike(wing, gold, [side * 0.9, 0.36, 0.06], [side * 0.3, 1, 0.3], 0.3, 0.06);
    wings.push({ wing, side });
  }

  const forelegs = [];
  const hindlegs = [];
  for (const side of [-1, 1]) {
    const foreleg = pivot(body, side * 0.52, -0.2, 0.55);
    b.bar(foreleg, fur, [0, 0.06, 0], [0, -0.5, 0.14], 0.2, 0.15, 6);
    b.place(foreleg, b.cylinder(0.18, 0.17, 0.14, 5), gold, [0, -0.4, 0.12]);
    b.place(foreleg, b.ico(0.22, 0), furDark, [0, -0.62, 0.22], [1.1, 0.75, 1.3]);
    for (const toe of [-1.5, -0.5, 0.5, 1.5]) b.spike(foreleg, bone, [toe * 0.09, -0.66, 0.38], [toe * 0.1, -0.6, 1], 0.32, 0.05);
    forelegs.push(foreleg);
    const hindleg = pivot(body, side * 0.42, -0.25, -0.88);
    b.place(hindleg, b.ico(0.27, 0), furDark, [0, -0.05, 0], [0.85, 1.15, 1.1]);
    b.bar(hindleg, fur, [0, -0.2, 0.04], [0, -0.55, -0.12], 0.13, 0.1, 5);
    b.place(hindleg, b.ico(0.15, 0), furDark, [0, -0.6, -0.06], [1, 0.7, 1.4]);
    for (const toe of [-1, 0, 1]) b.spike(hindleg, bone, [toe * 0.07, -0.63, 0.06], [toe * 0.15, -0.5, 1], 0.2, 0.04);
    hindlegs.push(hindleg);
  }

  const tail = [];
  let tailParent = pivot(body, 0, 0.08, -1.24);
  [0.09, 0.075, 0.06].forEach((radius, index) => {
    const segment = index === 0 ? tailParent : pivot(tailParent, 0, 0, -0.38);
    b.place(segment, b.cylinder(radius * 0.8, radius, 0.4, 4), fur, [0, 0, -0.19], null, [-Math.PI / 2, 0, 0]);
    tail.push(segment);
    tailParent = segment;
  });
  const tailStar = pivot(tailParent, 0, 0, -0.42);
  b.place(tailStar, b.octa(0.15), ray, [0, 0, 0]);
  for (const [x, y, z] of [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, -1]]) b.spike(tailStar, ray, [x * 0.08, y * 0.08, z * 0.08], [x, y, z], 0.3, 0.07);

  const clock = rageClock();
  group.userData.animate = (seconds, enemy) => {
    const phase = enemy.phase || 0;
    const windup = enemy.windup || 0;
    const hurt = enemy.hurt || 0;
    const rage = enemy.rage || 0;
    const t = clock(seconds, rage) + phase;
    const wide = 1 + rage * 0.5;
    const beat = Math.sin(t * 3.4);
    for (let index = 0; index < 2; index += 1) {
      const { wing, side } = wings[index];
      wing.rotation.x = -0.3;
      wing.rotation.z = side * (0.12 + beat * 0.3 * wide + windup * 0.45 - hurt * 0.3);
      wing.rotation.y = side * (-0.3 - beat * 0.12 + windup * 0.2);
    }
    body.position.y = BODY_Y + Math.sin(t * 3.4 - 1.2) * 0.07 * wide;
    body.rotation.x = -0.24 - windup * 0.3 - hurt * 0.25 + Math.sin(t * 1.7) * 0.03;
    body.rotation.z = Math.sin(seconds * 33) * hurt * 0.05;
    mane.rotation.z = t * 0.4 + windup * 1.2;
    const blaze = 1 + rage * 0.1 + Math.sin(t * 3.1) * (0.03 + rage * 0.05) + windup * 0.12;
    mane.scale.set(blaze, blaze, 1);
    const roar = Math.max(Math.pow(Math.max(0, Math.sin(t * 0.8)), 3), windup, hurt * 0.8);
    jaw.rotation.x = 0.3 + roar * 0.5;
    head.rotation.x = 0.38 - roar * 0.25 - hurt * 0.4;
    head.rotation.y = Math.sin(t * 0.9) * 0.22 * wide;
    head.rotation.z = Math.sin(t * 0.6) * 0.06 + Math.sin(seconds * 37) * hurt * 0.12;
    const heat = 0.8 + roar * 0.5 + rage * 0.3 + Math.sin(seconds * 15 + phase) * 0.07;
    throat.scale.set(heat, heat, heat);
    const glow = 1 + rage * 0.3 + Math.sin(t * 3.6) * (0.08 + rage * 0.16) + windup * 0.25;
    furnace.scale.set(glow, glow, 1);
    // The forepaws rake the air in turn, and both come up before a throw.
    for (let index = 0; index < 2; index += 1) {
      const rake = Math.sin(t * 2.2 + index * Math.PI);
      forelegs[index].rotation.x = -0.45 + rake * 0.3 * wide - windup * 0.8 - hurt * 0.5;
      forelegs[index].rotation.z = (index ? 1 : -1) * (0.08 + hurt * 0.6);
      hindlegs[index].rotation.x = 0.7 + Math.sin(t * 2.2 + index * 1.7) * 0.15 * wide - windup * 0.3;
    }
    for (let index = 0; index < tail.length; index += 1) {
      tail[index].rotation.x = index === 0 ? 0.7 : 0.3;
      tail[index].rotation.y = Math.sin(t * 2.4 - index * 0.8) * 0.3 * wide;
    }
  };
  group.userData.animate(0, {});
  return group;
}

// Glacial Titan — a hunched ice golem: a slit-eyed head sunk under a brow of shards, a
// cracked chest lit from inside, one shoulder overgrown with crystal, a boulder fist on
// one arm and a jagged ice blade for the other.
export function buildGlacialTitan(type, kit) {
  const b = bossBuilder(kit);
  const rock = kit.mat(mix(type.body, type.trim, 0.24));
  const rockDark = kit.mat(mix(type.body, type.trim, 0.06));
  const frost = kit.mat(mix(type.body, type.trim, 0.72));
  const crystal = kit.glow(type.trim, 0.45);
  const coreGlow = kit.glow(mix(type.trim, 0xffffff, 0.4), 1.5);
  const eyeGlow = kit.glow(type.eye, 1.9);
  const group = new THREE.Group();

  b.place(group, b.dodeca(0.42), rockDark, [0, 0.86, -0.04], [1.45, 0.7, 1], [0.2, 0.4, 0]);
  const legs = [];
  for (const side of [-1, 1]) {
    const leg = pivot(group, side * 0.52, 0.84, -0.02);
    b.place(leg, b.dodeca(0.3), rock, [side * 0.02, -0.12, 0.04], [1, 1.1, 1], [0.4, side * 0.5, 0]);
    b.place(leg, b.cylinder(0.23, 0.31, 0.46, 5), rockDark, [side * 0.05, -0.48, 0]);
    b.place(leg, b.dodeca(0.34), frost, [side * 0.06, -0.72, 0.1], [1.1, 0.42, 1.5]);
    for (const toe of [-1, 1]) b.spike(leg, crystal, [side * 0.06 + toe * 0.14, -0.74, 0.5], [toe * 0.2, 0.2, 1], 0.26, 0.09);
    b.spike(leg, crystal, [side * 0.12, -0.2, 0.26], [side * 0.3, 0.5, 1], 0.3, 0.09);
    legs.push(leg);
  }

  const LEAN = 0.3;
  const torso = pivot(group, 0, 0.94, -0.06);
  b.place(torso, b.dodeca(0.44), rockDark, [0, 0.3, 0.04], [1.25, 0.9, 0.95], [0.3, 0.2, 0]);
  b.place(torso, b.dodeca(0.8), rock, [0, 0.98, -0.04], [1.42, 0.92, 0.95], [0.2, 0.3, 0.1]);
  b.place(torso, b.dodeca(0.5), rockDark, [0, 1.3, -0.4], [1.6, 0.8, 0.9], [0.5, 0, 0]);
  // The chest is split down the middle; light comes through the crack and its branches.
  const core = pivot(torso, 0, 0.84, 0.6);
  for (const [x, y, turn, size] of [[0.05, 0.2, -0.4, 0.12], [-0.05, -0.06, 0.5, 0.13], [0.05, -0.32, -0.35, 0.11], [0.2, 0.1, -1.2, 0.07], [-0.2, -0.2, 1.1, 0.07]]) {
    b.place(core, b.octa(size), coreGlow, [x, y, 0.04], [0.55, 2.2, 0.45], [0, 0, turn]);
  }
  for (const side of [-1, 1]) {
    b.place(torso, b.dodeca(0.4), frost, [side * 0.43, 0.96, 0.52], [1.02, 1.1, 0.42], [0.1, side * 0.35, side * 0.2]);
    b.place(torso, b.dodeca(0.26), frost, [side * 0.26, 0.42, 0.46], [1, 0.9, 0.4], [-0.2, side * 0.3, 0]);
  }
  [[-0.3, 1.5, 0.5, -0.3], [0.1, 1.56, 0.62, 0.1], [0.42, 1.46, 0.4, 0.4]].forEach(([x, y, length, tilt]) => {
    b.spike(torso, crystal, [x, y - 0.1, -0.5], [tilt, 1, -0.7], length, 0.13);
  });

  const head = pivot(torso, 0, 1.44, 0.52);
  b.place(head, b.dodeca(0.26), rockDark, [0, 0, 0], [1.2, 0.95, 1], [0.3, 0.5, 0]);
  b.place(head, b.box(0.56, 0.13, 0.3), frost, [0, 0.11, 0.14], null, [0.35, 0, 0]);
  b.place(head, b.box(0.34, 0.1, 0.1), kit.mat(0x05080c), [0, -0.12, 0.22]);
  toothRow(b, head, crystal, { width: 0.34, count: 4, length: 0.15, y: -0.07, z: 0.26, bow: 0.03, lean: 0 });
  for (const side of [-1, 1]) {
    b.place(head, b.box(0.28, 0.09, 0.12), frost, [side * 0.16, 0.05, 0.25], null, [0.2, 0, side * 0.42]);
    b.place(head, b.box(0.19, 0.07, 0.06), eyeGlow, [side * 0.15, -0.02, 0.3], null, [0, 0, side * 0.4]);
  }
  [[-0.2, 0.3, -0.5], [-0.05, 0.42, -0.1], [0.12, 0.34, 0.3], [0.25, 0.22, 0.7]].forEach(([x, length, tilt]) => {
    b.spike(head, crystal, [x, 0.14, 0], [tilt, 1, -0.15], length, 0.07);
  });
  const jaw = pivot(head, 0, -0.14, 0);
  b.place(jaw, b.box(0.5, 0.14, 0.36), frost, [0, -0.08, 0.14]);
  toothRow(b, jaw, crystal, { width: 0.4, count: 4, length: 0.22, y: -0.04, z: 0.28, direction: 1, bow: 0.03, lean: 0.1 });

  // Arm 0 ends in the boulder fist, arm 1 in the blade.
  const arms = [];
  for (const side of [-1, 1]) {
    const heavy = side === -1;
    const arm = pivot(torso, side * 1.16, 1.2, 0);
    b.place(arm, b.dodeca(heavy ? 0.5 : 0.4), frost, [side * 0.02, 0.06, 0], null, [side * 0.4, 0.2, 0.3]);
    const shards = heavy
      ? [[0, 0.84, 0.1, 0], [0.26, 0.66, 0.55, 0.1], [-0.22, 0.64, -0.3, -0.1], [0.12, 0.56, 0.2, 0.5], [0.4, 0.44, 1.1, -0.1], [-0.05, 0.5, -0.1, -0.6]]
      : [[0.05, 0.56, 0.25, 0], [0.26, 0.4, 0.8, 0.2], [-0.1, 0.2, -0.2, -0.3]];
    shards.forEach(([dx, height, tilt, depth]) => {
      b.spike(arm, crystal, [side * dx, 0.16, depth * 0.3], [side * tilt, 1, depth], height, 0.07 + height * 0.09);
    });
    b.place(arm, b.cylinder(0.2, 0.27, 0.56, 5), rockDark, [0, -0.4, 0]);
    const elbow = pivot(arm, 0, -0.7, 0);
    b.place(elbow, b.dodeca(0.24), rock, [0, 0, 0]);
    arms.push({ arm, elbow, side });
  }
  const fist = arms[0].elbow;
  b.place(fist, b.cylinder(0.24, 0.34, 0.6, 5), rock, [0, -0.32, 0]);
  b.place(fist, b.dodeca(0.46), frost, [0, -0.82, 0.04], [1, 0.95, 1], [0.3, 0.6, 0]);
  [[-0.3, -0.9, 0.2, -1, -0.3, 0.6], [0, -1.02, 0.34, 0, -0.5, 1], [0.28, -0.94, 0.2, 1, -0.4, 0.6], [-0.1, -1.16, 0, -0.2, -1, 0.2], [0.2, -0.6, 0.3, 0.6, 0.3, 1]].forEach(([x, y, z, dx, dy, dz]) => {
    b.spike(fist, crystal, [x, y, z], [dx, dy, dz], 0.34, 0.1);
  });
  const blade = arms[1].elbow;
  b.place(blade, b.cylinder(0.22, 0.2, 0.4, 5), rock, [0, -0.2, 0]);
  b.place(blade, b.octa(0.3), crystal, [0, -0.86, 0.04], [0.42, 2.3, 0.95]);
  b.place(blade, b.octa(0.2), crystal, [0, -0.5, 0.2], [0.4, 1.6, 0.8], [0.5, 0, 0]);
  b.spike(blade, crystal, [0, -0.36, -0.1], [0, -0.3, -1], 0.36, 0.09);

  // Chips of ice turning slowly around the shoulders.
  const chips = pivot(torso, 0, 1.3, -0.1);
  for (let index = 0; index < 6; index += 1) {
    const angle = (index / 6) * Math.PI * 2;
    b.place(chips, b.octa(index % 2 ? 0.07 : 0.1), crystal, [Math.cos(angle) * 1.5, Math.sin(index * 2.1) * 0.2, Math.sin(angle) * 1.1], [0.7, 1.8, 0.7], [index, 0, index * 0.7]);
  }

  const clock = rageClock();
  group.userData.animate = (seconds, enemy) => {
    const phase = enemy.phase || 0;
    const windup = enemy.windup || 0;
    const hurt = enemy.hurt || 0;
    const rage = enemy.rage || 0;
    const t = clock(seconds, rage) + phase;
    const wide = 1 + rage * 0.5;
    const step = Math.sin(t * 2.8);
    const shake = Math.sin(seconds * 36) * hurt;
    legs[0].rotation.x = step * 0.26 * wide;
    legs[1].rotation.x = -step * 0.26 * wide;
    torso.rotation.x = LEAN + Math.sin(t * 1.4) * 0.03 * wide - windup * 0.35 - hurt * 0.4;
    torso.rotation.z = step * 0.05 * wide + shake * 0.03;
    torso.rotation.y = step * 0.06 + windup * 0.3;
    head.rotation.x = -LEAN + 0.02 - hurt * 0.4 + windup * 0.25;
    head.rotation.y = Math.sin(t * 0.8) * 0.26 * wide;
    head.rotation.z = shake * 0.1;
    const groan = Math.pow(Math.max(0, Math.sin(t * 0.6 + 2)), 4);
    jaw.rotation.x = 0.05 + Math.max(groan * 0.3, windup * 0.45, hurt * 0.4) + rage * 0.08;
    const pulse = 1 + rage * 0.35 + Math.sin(t * 2.6) * (0.08 + rage * 0.25) + windup * 0.3;
    core.scale.set(pulse, 1 + (pulse - 1) * 0.3, 1);
    const fistArm = arms[0];
    const bladeArm = arms[1];
    fistArm.arm.rotation.x = -LEAN - 0.05 + step * 0.2 * wide + windup * 0.25 - hurt * 0.3;
    fistArm.arm.rotation.z = -0.1 - hurt * 0.6;
    fistArm.elbow.rotation.x = -0.3 - Math.max(0, -step) * 0.12 - rage * 0.2;
    // The blade is carried low and forward, and swept up over the shoulder for a throw.
    bladeArm.arm.rotation.x = -LEAN - 0.3 - step * 0.14 * wide - windup * 1.6 + hurt * 0.3;
    bladeArm.arm.rotation.z = 0.16 + hurt * 0.6 + windup * 0.2;
    bladeArm.elbow.rotation.x = -0.7 + Math.sin(t * 1.4 + 1) * 0.08 * wide - windup * 0.4;
    chips.rotation.y = t * 0.5;
    chips.position.y = 1.3 + Math.sin(t * 1.1) * 0.06;
    const scatter = 1 + hurt * 0.25 + rage * 0.08;
    chips.scale.set(scatter, 1, scatter);
  };
  group.userData.animate(0, {});
  return group;
}

// Magma Sovereign — a molten king cobra reared over the player: spiked rock coils with
// lava in the seams, a jagged veined hood, a horned head with long fangs and a burning
// throat, a raised tail blade and embers rising from the coils.
export function buildMagmaSovereign(type, kit) {
  const b = bossBuilder(kit);
  const rock = kit.mat(mix(type.body, 0x8a5a40, 0.36));
  const rockDark = kit.mat(mix(type.body, 0x140806, 0.35));
  const hoodRock = kit.mat(mix(type.body, 0x8a5a40, 0.14), { side: THREE.DoubleSide });
  const belly = kit.mat(mix(type.trim, 0x6a2a1a, 0.62));
  const lava = kit.glow(type.trim, 1.5);
  const bone = kit.mat(BONE);
  const maw = kit.mat(0x140403);
  const eyeGlow = kit.glow(type.eye, 1.9);
  const group = new THREE.Group();

  const flat = [Math.PI / 2, 0, 0];
  b.place(group, b.ring(0.85, 0.3, 10), rockDark, [0, 0.3, 0], null, flat);
  b.place(group, b.ring(0.6, 0.27, 9), rock, [0.05, 0.76, -0.05], null, [Math.PI / 2, 0, 0.4]);
  const seam = b.place(group, b.ring(0.85, 0.06, 10), lava, [0, 0.53, 0], [1.13, 1.13, 1], flat);
  for (let index = 0; index < 11; index += 1) {
    const angle = (index / 11) * Math.PI * 2 + 0.3;
    const x = Math.cos(angle);
    const z = Math.sin(angle);
    if (index % 2) b.place(group, b.octa(0.1), lava, [x * 1.14, 0.28, z * 1.14], [0.5, 1.5, 0.5], [0, -angle, 0.5]);
    else b.spike(group, rockDark, [x * 1.02, 0.36, z * 1.02], [x, 0.55, z], 0.4, 0.13);
  }

  const tail = [];
  let tailParent = pivot(group, 0.72, 0.3, 0.66);
  [0.24, 0.18, 0.12].forEach((radius, index) => {
    const segment = index === 0 ? tailParent : pivot(tailParent, 0.4, 0, 0);
    b.place(segment, b.cylinder(radius * 0.72, radius, 0.46, 5), rockDark, [0.2, 0, 0], null, [0, 0, -Math.PI / 2]);
    b.spike(segment, rock, [0.2, radius * 0.7, 0], [0.3, 1, 0], 0.2, 0.07);
    tail.push(segment);
    tailParent = segment;
  });
  const tailBlade = pivot(tailParent, 0.4, 0, 0);
  b.place(tailBlade, b.octa(0.16), lava, [0.2, 0, 0], [2.2, 0.8, 0.5]);
  for (const side of [-1, 1]) b.spike(tailBlade, rockDark, [0.02, 0, 0], [0.5, side, 0], 0.26, 0.06);
  tail.push(tailBlade);

  // The neck is a chain of segments, each hinged on the one below so the whole column can sway.
  const neck = [];
  let neckParent = pivot(group, 0, 0.9, -0.2);
  [0.35, 0.33, 0.3, 0.27, 0.24].forEach((radius, index) => {
    const segment = index === 0 ? neckParent : pivot(neckParent, 0, 0.35, 0);
    b.place(segment, b.cylinder(radius * 0.92, radius, 0.42, 6), rock, [0, 0.175, 0]);
    b.place(segment, b.box(radius * 1.3, 0.26, 0.1), belly, [0, 0.175, radius * 0.84]);
    b.place(segment, b.box(radius * 1.4, 0.06, 0.08), lava, [0, 0.35, radius * 0.86]);
    b.spike(segment, rockDark, [0, 0.18, -radius * 0.8], [0, 0.6, -1], 0.3, 0.09);
    neck.push(segment);
    neckParent = segment;
  });

  const HOOD_TIPS = [[0.1, 1.0, 0], [0.62, 0.9, 0.08], [1.02, 0.5, 0.16], [1.08, -0.02, 0.16], [0.78, -0.5, 0.08], [0.28, -0.78, 0], [0, -0.6, 0]].map(([x, y, z]) => [x * 0.9, y * 0.9, z]);
  const hood = pivot(neck[3], 0, 0.16, -0.14);
  for (const side of [-1, 1]) {
    hood.add(kit.mesh(fanGeometry(side, [0, 0.05, -0.02], HOOD_TIPS, [0.1, 0.2, 0.2, 0.2, 0.16, 0]), hoodRock));
    HOOD_TIPS.slice(0, 6).forEach(([x, y, z], index) => {
      b.spike(hood, rockDark, [side * x * 0.97, y * 0.97, z], [side * x, y - 0.05, 0.1], 0.2, 0.06);
      if (index > 0) b.bar(hood, lava, [side * 0.16, 0.05, 0.04], [side * x * 0.8, y * 0.8, z + 0.05], 0.035, 0.012);
    });
  }

  const head = pivot(neckParent, 0, 0.38, 0);
  head.scale.setScalar(1.25);
  b.place(head, b.ico(0.3, 1), rock, [0, 0.05, 0.12], [1.2, 0.7, 1.35]);
  b.place(head, b.cylinder(0.14, 0.3, 0.6, 4), rock, [0, 0.02, 0.46], [1.2, 1, 0.5], [Math.PI / 2, 0, 0]);
  b.place(head, b.box(0.36, 0.05, 0.56), maw, [0, -0.08, 0.36]);
  for (const side of [-1, 1]) {
    b.place(head, b.box(0.28, 0.09, 0.26), rockDark, [side * 0.19, 0.2, 0.3], null, [0.2, 0, side * 0.42]);
    b.place(head, b.box(0.19, 0.06, 0.07), eyeGlow, [side * 0.21, 0.12, 0.4], null, [0, side * 0.5, side * 0.38]);
    b.spike(head, bone, [side * 0.13, -0.06, 0.62], [side * 0.05, -1, 0.15], 0.4, 0.055, 5);
    b.spike(head, bone, [side * 0.2, -0.06, 0.42], [0, -1, 0.05], 0.14, 0.035);
    b.spike(head, bone, [side * 0.22, -0.06, 0.24], [0, -1, 0], 0.12, 0.035);
    b.spike(head, rockDark, [side * 0.3, 0.1, 0.02], [side * 1, 0.55, -0.6], 0.5, 0.09);
    b.place(head, b.octa(0.045), lava, [side * 0.67, 0.31, -0.2]);
  }
  [[-0.2, 0.3, -0.45], [-0.1, 0.4, -0.2], [0, 0.5, 0], [0.1, 0.4, 0.2], [0.2, 0.3, 0.45]].forEach(([x, length, tilt]) => {
    b.spike(head, rockDark, [x, 0.2, 0.02], [tilt, 1, -0.55], length, 0.075);
    b.place(head, b.octa(0.04), lava, [x + tilt * length * 0.82, 0.2 + length * 0.86, 0.02 - length * 0.48]);
  });
  const jaw = pivot(head, 0, -0.1, 0.02);
  b.place(jaw, b.cylinder(0.1, 0.26, 0.6, 4), rockDark, [0, -0.06, 0.34], [1.1, 1, 0.35], [Math.PI / 2, 0, 0]);
  const throat = pivot(head, 0, -0.12, 0.12);
  b.place(throat, b.ico(0.1, 0), lava, [0, 0, 0.1], [1.3, 0.5, 1.8]);
  for (const side of [-1, 1]) {
    b.spike(jaw, bone, [side * 0.1, -0.02, 0.56], [0, 1, 0.05], 0.2, 0.04);
    b.spike(jaw, bone, [side * 0.17, -0.02, 0.38], [0, 1, 0], 0.11, 0.03);
  }
  const tongue = pivot(jaw, 0, 0.0, 0.42);
  b.place(tongue, b.box(0.04, 0.02, 0.3), lava, [0, 0, 0.15]);
  for (const side of [-1, 1]) b.place(tongue, b.box(0.03, 0.02, 0.14), lava, [side * 0.04, 0, 0.35], null, [0, side * 0.45, 0]);

  // Embers that rise from the coils and burn out.
  const embers = [];
  for (let index = 0; index < 6; index += 1) {
    const angle = index * 2.4;
    const ember = b.place(group, b.octa(0.06), lava, [Math.cos(angle) * 1.05, 0.5, Math.sin(angle) * 0.9]);
    embers.push(ember);
  }

  const NECK_BEND = [-0.25, 0.15, 0.3, 0.35, 0.3];
  const clock = rageClock();
  group.userData.animate = (seconds, enemy) => {
    const phase = enemy.phase || 0;
    const windup = enemy.windup || 0;
    const hurt = enemy.hurt || 0;
    const rage = enemy.rage || 0;
    const t = clock(seconds, rage) + phase;
    const wide = 1 + rage * 0.6;
    const shake = Math.sin(seconds * 35) * hurt;
    let bend = 0;
    for (let index = 0; index < neck.length; index += 1) {
      const segment = neck[index];
      // Rearing back for a strike straightens the column; a hit throws it back further.
      segment.rotation.x = NECK_BEND[index] + Math.sin(t * 1.3 - index * 0.5) * 0.06 * wide - (windup * 0.22 + hurt * 0.2) * (index > 0 ? 1 : 0.4);
      segment.rotation.z = Math.sin(t * 1.6 - index * 0.7) * 0.11 * wide + shake * 0.03;
      bend += segment.rotation.x;
    }
    // A hiss every few seconds: the jaw drops and the tongue darts out.
    const hiss = Math.max(Math.pow(Math.max(0, Math.sin(t * 1.1)), 4), windup, hurt * 0.8);
    head.rotation.x = 0.4 - bend + Math.sin(t * 1.3) * 0.06 - hiss * 0.2;
    head.rotation.y = Math.sin(t * 0.9) * 0.3 * wide;
    head.rotation.z = shake * 0.1;
    jaw.rotation.x = 0.3 + hiss * 0.55;
    tongue.scale.z = 0.35 + hiss * 0.9 + Math.sin(seconds * 14 + phase) * 0.08;
    const heat = 0.8 + hiss * 0.5 + rage * 0.3 + Math.sin(seconds * 16 + phase) * 0.07;
    throat.scale.set(heat, heat, heat);
    const flare = 1 + Math.sin(t * 1.8) * 0.06 * wide + windup * 0.16 + rage * 0.06 - hurt * 0.1;
    hood.scale.set(flare, 1 + (flare - 1) * 0.5, 1);
    const glow = 1.13 + rage * 0.05 + Math.sin(t * 2.8) * (0.012 + rage * 0.03);
    seam.scale.set(glow, glow, 1 + rage * 1.2 + Math.sin(t * 2.8) * 0.3 * wide);
    for (let index = 0; index < tail.length; index += 1) {
      tail[index].rotation.y = (index === 0 ? 0.5 : 0.1) + Math.sin(t * 2.4 - index * 0.9) * 0.22 * wide;
      tail[index].rotation.z = (index === 0 ? 0.1 : 0.42) + windup * 0.12 + Math.sin(seconds * 40) * (hurt + rage * 0.3) * (index === 3 ? 0.12 : 0);
    }
    for (let index = 0; index < embers.length; index += 1) {
      const rise = (t * (0.22 + index * 0.03) + index * 0.37) % 1;
      const size = (1 - rise) * (1 + rage * 0.8);
      embers[index].position.y = 0.5 + rise * (1.6 + rage * 0.8);
      embers[index].rotation.y = t * 3 + index;
      embers[index].scale.set(size, size * 1.6, size);
    }
  };
  group.userData.animate(0, {});
  return group;
}

// Void Specter — a horned wraith with no face but slanted eyes and a row of needle teeth:
// a wide ragged mantle, a void burning behind a cage of shadow ribs, long arms ending in
// glowing talons, a body that frays into tatters, and shards of dark in orbit.
export function buildVoidSpecter(type, kit) {
  const b = bossBuilder(kit);
  const shroud = kit.mat(mix(type.body, 0x3a3560, 0.62));
  const shroudDark = kit.mat(mix(type.body, 0x3a3560, 0.34));
  const voidDark = kit.mat(0x030208);
  const edge = kit.glow(type.trim, 1.3);
  const eyeGlow = kit.glow(type.eye, 1.9);
  const group = new THREE.Group();

  const robe = pivot(group, 0, 0, 0);
  b.place(robe, b.cylinder(0.58, 0.24, 1.14, 6), shroud, [0, 1.42, 0], [1.1, 1, 0.8]);
  b.place(robe, b.cylinder(0.44, 0.3, 0.64, 6), voidDark, [0, 1.62, 0.2], [1, 1, 0.5]);
  for (const side of [-1, 1]) b.bar(robe, edge, [side * 0.46, 1.96, 0.3], [side * 0.14, 1.3, 0.34], 0.025, 0.012);
  const tatters = [];
  for (let index = 0; index < 9; index += 1) {
    const angle = (index / 9) * Math.PI * 2 + 0.2;
    const length = 0.72 + ((index * 7) % 5) * 0.13;
    const tatter = pivot(robe, Math.cos(angle) * 0.24, 1.02, Math.sin(angle) * 0.18);
    b.place(tatter, b.cone(0.13, length, 4), index % 3 ? shroudDark : shroud, [0, -length / 2, 0], [1, 1, 0.5], [Math.PI, angle, 0]);
    tatters.push(tatter);
  }
  // The void behind a cage of ribs.
  const core = pivot(robe, 0, 1.66, 0.3);
  b.place(core, b.ico(0.16, 0), edge, [0, 0, 0]);
  for (const side of [-1, 1]) {
    [[0.26, 0.5], [0.06, 0.56], [-0.14, 0.46], [-0.32, 0.34]].forEach(([y, reach]) => {
      b.spike(robe, shroud, [side * reach, 1.66 + y + 0.1, 0.24], [side * -1, -0.3, 0.42], reach * 0.92, 0.05, 3);
    });
  }
  // The mantle: a ragged cape across the shoulders, spread wide.
  const MANTLE_TIPS = [[0.1, 0.34, -0.1], [0.7, 0.36, -0.04], [1.08, 0.0, 0.02], [0.95, -0.62, 0], [0.72, -1.3, -0.06], [0.42, -0.9, -0.14], [0.2, -1.5, -0.2], [0, -1.0, -0.22]];
  const mantles = [];
  for (const side of [-1, 1]) {
    const mantle = pivot(robe, 0, 2.02, -0.16);
    mantle.add(kit.mesh(fanGeometry(side, [0.1, 0, 0], MANTLE_TIPS, [0.08, 0.12, 0.22, 0.3, 0.4, 0.4, 0.3]), kit.mat(mix(type.body, 0x3a3560, 0.48), { side: THREE.DoubleSide })));
    b.place(mantle, b.dodeca(0.24), shroudDark, [side * 0.66, 0.12, 0.1], [1.3, 0.7, 1]);
    b.spike(mantle, shroudDark, [side * 0.7, 0.16, 0.08], [side * 0.9, 1, 0], 0.46, 0.09, 3);
    b.spike(mantle, shroudDark, [side * 0.86, 0.1, 0.08], [side * 1, 0.3, 0.1], 0.34, 0.08, 3);
    for (const [x, y, z] of [MANTLE_TIPS[2], MANTLE_TIPS[4], MANTLE_TIPS[6]]) b.place(mantle, b.octa(0.05), edge, [side * x, y, z + 0.03], [0.6, 2, 0.6]);
    mantles.push(mantle);
  }

  const HOOD_Y = 2.27;
  const hood = pivot(group, 0, HOOD_Y, 0.18);
  b.place(hood, b.ico(0.42, 1), shroud, [0, 0, 0], [1, 1.15, 1.05]);
  b.place(hood, b.cone(0.3, 0.6, 5), shroudDark, [0, 0.42, -0.24], null, [-0.75, 0, 0]);
  b.place(hood, b.ico(0.32, 0), voidDark, [0, -0.06, 0.2], [1, 1.15, 0.55]);
  b.place(hood, b.box(0.5, 0.12, 0.2), shroudDark, [0, 0.2, 0.34], null, [0.5, 0, 0]);
  for (const side of [-1, 1]) {
    b.place(hood, b.octa(0.1), eyeGlow, [side * 0.15, 0.03, 0.38], [1.7, 0.5, 0.6], [0, 0, side * 0.5]);
    b.bar(hood, shroudDark, [side * 0.28, 0.2, -0.05], [side * 0.5, 0.52, -0.12], 0.11, 0.08);
    b.spike(hood, shroudDark, [side * 0.49, 0.5, -0.12], [side * 0.1, 1, 0.3], 0.42, 0.08);
    b.place(hood, b.octa(0.04), edge, [side * 0.53, 0.9, 0.0], [0.6, 2, 0.6]);
    b.spike(hood, shroud, [side * 0.34, -0.3, 0.18], [side * 0.3, -1, 0.3], 0.34, 0.09, 3);
  }
  const fangs = pivot(hood, 0, -0.17, 0.37);
  toothRow(b, fangs, edge, { width: 0.34, count: 5, length: 0.17, y: 0.04, z: 0, bow: 0.03, lean: 0 });
  toothRow(b, fangs, edge, { width: 0.27, count: 4, length: 0.14, y: -0.1, z: 0, direction: 1, bow: 0.03, lean: 0 });

  const arms = [];
  for (const side of [-1, 1]) {
    const arm = pivot(group, side * 0.7, 1.98, 0.1);
    b.bar(arm, shroudDark, [0, 0, 0], [0, -0.7, 0], 0.07, 0.05);
    b.place(arm, b.cone(0.16, 0.7, 4), shroud, [0, -0.4, -0.06], [1, 1, 0.5], [Math.PI, 0, 0]);
    const elbow = pivot(arm, 0, -0.7, 0);
    b.bar(elbow, shroudDark, [0, 0, 0], [0, -0.66, 0], 0.05, 0.035);
    b.spike(elbow, shroudDark, [0, 0, -0.02], [0, 0.3, -1], 0.24, 0.05, 3);
    const claws = clawHand(b, elbow, [0, -0.64, 0], shroudDark, edge, 1.15, 4);
    arms.push({ arm, elbow, digits: claws.digits });
  }

  const ORBIT_Y = 1.75;
  const orbit = pivot(group, 0, ORBIT_Y, 0);
  for (let index = 0; index < 7; index += 1) {
    const angle = (index / 7) * Math.PI * 2;
    const wisp = index % 3 === 0;
    b.place(orbit, b.octa(wisp ? 0.08 : 0.11), wisp ? edge : voidDark, [Math.cos(angle) * 1.05, Math.sin(index * 1.9) * 0.3, Math.sin(angle) * 1.05], [0.6, wisp ? 1.4 : 2.2, 0.6], [index, 0, index * 0.8]);
  }

  const clock = rageClock();
  group.userData.animate = (seconds, enemy) => {
    const phase = enemy.phase || 0;
    const windup = enemy.windup || 0;
    const hurt = enemy.hurt || 0;
    const rage = enemy.rage || 0;
    const t = clock(seconds, rage) + phase;
    const wide = 1 + rage * 0.6;
    const shake = Math.sin(seconds * 38) * hurt;
    for (let index = 0; index < tatters.length; index += 1) {
      tatters[index].rotation.x = Math.sin(t * 2.2 + index * 1.3) * 0.3 * wide - 0.12 - hurt * 0.3;
      tatters[index].rotation.z = Math.cos(t * 1.9 + index * 1.3) * 0.3 * wide;
    }
    robe.rotation.x = 0.14 + Math.sin(t * 1.2) * 0.04 - windup * 0.18 - hurt * 0.3;
    robe.scale.x = 1 + Math.sin(t * 2.6) * 0.03;
    const pulse = 1 + rage * 0.4 + Math.sin(t * 3.3) * (0.12 + rage * 0.25) + windup * 0.4;
    core.scale.set(pulse, pulse, pulse);
    for (let index = 0; index < 2; index += 1) {
      const side = index ? 1 : -1;
      mantles[index].rotation.z = side * (Math.sin(t * 1.7 + index) * 0.06 * wide + windup * 0.3 - hurt * 0.2);
      mantles[index].rotation.y = side * (-0.15 + Math.sin(t * 1.3) * 0.06 - windup * 0.2);
      const { arm, elbow, digits } = arms[index];
      // The arms hang forward, talons working; one lifts high for a throw, both fly wide on a hit.
      const reach = Math.sin(t * 1.5 + index * 2.2);
      arm.rotation.x = -0.55 + reach * 0.16 * wide - (index ? windup * 1.7 : windup * 0.3) + hurt * 0.4;
      arm.rotation.z = side * (0.3 + hurt * 0.8 + windup * 0.15);
      elbow.rotation.x = -0.75 + Math.sin(t * 1.5 + index * 2.2 + 0.9) * 0.18 + (index ? windup * 0.5 : 0);
      elbow.rotation.z = side * -0.25;
      const curl = -0.35 + Math.sin(t * 2.8 + index * 1.6) * 0.3 * wide - rage * 0.25;
      for (let finger = 0; finger < digits.length; finger += 1) digits[finger].rotation.x = curl + finger * 0.06;
    }
    hood.position.y = HOOD_Y + Math.sin(t * 1.2) * 0.02;
    hood.rotation.x = 0.16 + Math.sin(t * 1.1) * 0.08 - hurt * 0.55 - windup * 0.2;
    hood.rotation.y = Math.sin(t * 0.7) * 0.25 * wide;
    hood.rotation.z = Math.sin(t * 0.8) * 0.08 + shake * 0.12;
    // The teeth part when it rears or is struck.
    const gape = 1 + Math.max(windup, hurt) * 1.4 + rage * 0.4 + Math.max(0, Math.sin(t * 0.9)) * 0.3;
    fangs.scale.set(1 + (gape - 1) * 0.2, gape, 1);
    orbit.rotation.y = t * 1.5;
    orbit.rotation.x = 0.3 + Math.sin(t * 0.7) * 0.15;
    orbit.position.y = ORBIT_Y + Math.sin(t * 2.4) * 0.1;
    const spread = 1 + hurt * 0.3 + windup * 0.15 + rage * 0.1;
    orbit.scale.set(spread, 1, spread);
  };
  group.userData.animate(0, {});
  return group;
}

// Celestial Arbiter — a faceless judge: a blank mask weeping light under a broken
// sunburst halo, a lidless eye set in its breastplate, four bladed wings (the lower pair
// dark), a ragged robe, one gauntlet reaching out and a greatsword in the other.
export function buildCelestialArbiter(type, kit) {
  const b = bossBuilder(kit);
  const robe = kit.mat(mix(type.body, 0x9aa6c8, 0.3));
  const robeShade = kit.mat(mix(type.body, 0x5a6488, 0.6));
  const gold = kit.mat(mix(type.trim, 0x7a4a00, 0.18));
  const goldDark = kit.mat(mix(type.trim, 0x4a2c00, 0.55));
  const steel = kit.mat(mix(type.body, 0x8a94b0, 0.45));
  const feather = kit.mat(mix(type.body, 0xffffff, 0.2), { side: THREE.DoubleSide });
  const featherGold = kit.mat(mix(type.trim, 0xffffff, 0.2), { side: THREE.DoubleSide });
  const featherAsh = kit.mat(mix(type.body, 0x343a52, 0.72), { side: THREE.DoubleSide });
  const dark = kit.mat(0x0a0c1c);
  const halo = kit.glow(type.trim, 1.4);
  const eyeGlow = kit.glow(type.eye, 2.2);
  const group = new THREE.Group();

  const BODY_Y = 0.42;
  const body = pivot(group, 0, BODY_Y, 0);
  // Built a little large and scaled down, to keep the height the game expects.
  const rig = pivot(body, 0, 0, 0);
  rig.scale.setScalar(0.87);
  b.place(rig, b.cylinder(0.44, 0.2, 1.1, 7), robe, [0, 1.0, 0], [1, 1, 0.8]);
  b.place(rig, b.box(0.2, 0.9, 0.05), gold, [0, 0.98, 0.3], null, [-0.2, 0, 0]);
  b.place(rig, b.cone(0.13, 0.26, 3), gold, [0, 0.42, 0.21], [1, 1, 0.3], [Math.PI, 0, 0]);
  const rags = [];
  for (let index = 0; index < 8; index += 1) {
    const angle = (index / 8) * Math.PI * 2 + 0.4;
    const length = 0.5 + ((index * 3) % 4) * 0.1;
    const rag = pivot(rig, Math.cos(angle) * 0.2, 0.52, Math.sin(angle) * 0.16);
    b.place(rag, b.cone(0.12, length, 4), index % 2 ? robeShade : robe, [0, -length / 2 + 0.06, 0], [1, 1, 0.5], [Math.PI, angle, 0]);
    rags.push(rag);
  }
  // Breastplate, with the eye of judgment set in it.
  b.place(rig, b.ico(0.44, 1), gold, [0, 1.52, 0.02], [1.4, 0.95, 0.75]);
  b.place(rig, b.cylinder(0.26, 0.36, 0.22, 6), goldDark, [0, 1.92, 0]);
  b.place(rig, b.octa(0.25), dark, [0, 1.54, 0.3], [1.5, 0.8, 0.3]);
  const iris = pivot(rig, 0, 1.54, 0.37);
  b.place(iris, b.ico(0.12, 0), eyeGlow, [0, 0, 0], [1, 1, 0.5]);
  b.place(iris, b.octa(0.05), dark, [0, 0, 0.05], [0.5, 1.5, 0.4]);
  const lids = [];
  for (const up of [1, -1]) {
    const lid = pivot(rig, 0, 1.54 + up * 0.2, 0.36);
    b.place(lid, b.box(0.62, 0.1, 0.06), goldDark, [0, 0, 0]);
    for (const side of [-1, 1]) b.spike(lid, goldDark, [side * 0.26, 0, 0], [side * 1, -up * 0.5, 0], 0.26, 0.05);
    lids.push(lid);
  }
  for (const side of [-1, 1]) {
    b.place(rig, b.dodeca(0.3), gold, [side * 0.66, 1.78, 0], [1.3, 0.6, 1.1], [0, 0, side * -0.3]);
    b.spike(rig, gold, [side * 0.62, 1.84, 0], [side * 0.5, 1, -0.1], 0.5, 0.09);
    b.spike(rig, gold, [side * 0.84, 1.76, 0.02], [side * 1, 0.4, 0], 0.4, 0.08);
    b.spike(rig, goldDark, [side * 0.72, 1.8, 0.2], [side * 0.6, 0.5, 1], 0.24, 0.07);
  }

  const HEAD_Y = 2.14;
  const head = pivot(rig, 0, HEAD_Y, 0.06);
  b.place(head, b.cylinder(0.2, 0.24, 0.42, 6), gold, [0, 0.02, -0.02]);
  b.place(head, b.ico(0.2, 0), gold, [0, 0.22, -0.02], [1, 0.7, 1]);
  b.place(head, b.cylinder(0.17, 0.1, 0.42, 4), robe, [0, -0.03, 0.17], [1.3, 1, 0.5], [0, Math.PI / 4, 0]);
  b.place(head, b.box(0.36, 0.09, 0.16), goldDark, [0, 0.16, 0.16], null, [0.4, 0, 0]);
  for (const side of [-1, 1]) {
    b.place(head, b.box(0.13, 0.045, 0.05), eyeGlow, [side * 0.085, 0.07, 0.27], null, [0, 0, side * 0.45]);
    b.place(head, b.box(0.03, 0.2, 0.04), eyeGlow, [side * 0.1, -0.05, 0.245]);
    b.spike(head, gold, [side * 0.16, 0.24, -0.02], [side * 0.35, 1, 0], 0.3, 0.06);
  }
  b.spike(head, gold, [0, 0.3, -0.02], [0, 1, 0], 0.4, 0.07);
  // The halo is a sunburst of blades with a gap where some have broken away.
  const haloRing = pivot(rig, 0, HEAD_Y + 0.12, -0.2);
  const haloArc = new THREE.TorusGeometry(0.5, 0.04, 6, 16, Math.PI * 1.7);
  b.place(haloRing, haloArc, halo, [0, 0, 0], null, [0, 0, 1.0]);
  for (let index = 0; index < 13; index += 1) {
    const angle = 1.0 + (index / 14) * Math.PI * 1.7 + 0.1;
    const length = index % 2 === 0 ? 0.42 : 0.24;
    b.spike(haloRing, halo, [Math.cos(angle) * 0.5, Math.sin(angle) * 0.5, 0], [Math.cos(angle), Math.sin(angle), 0], length, 0.06);
  }

  const featherTips = (length, from, step, count) => {
    const tips = [];
    for (let index = 0; index < count; index += 1) {
      const angle = from + index * step;
      const reach = length * (1 - index * 0.06);
      tips.push([Math.sin(angle) * reach, Math.cos(angle) * reach, -index * 0.03]);
    }
    return tips;
  };
  const upperWings = [];
  const lowerWings = [];
  for (const side of [-1, 1]) {
    const upper = pivot(rig, side * 0.3, 1.74, -0.24);
    upper.add(kit.mesh(fanGeometry(side, [0, 0, 0], featherTips(2.3, 1.08, 0.22, 7), [0.34]), feather));
    const inner = kit.mesh(fanGeometry(side, [0, 0, 0], featherTips(1.4, 1.0, 0.26, 6), [0.3]), featherGold);
    inner.position.z = 0.05;
    upper.add(inner);
    b.bar(upper, gold, [0, 0, 0.06], [side * 1.0, 0.5, 0.06], 0.09, 0.04);
    upperWings.push(upper);
    const lower = pivot(rig, side * 0.26, 1.46, -0.26);
    lower.add(kit.mesh(fanGeometry(side, [0, 0, 0], featherTips(1.55, 1.9, 0.22, 5), [0.36]), featherAsh));
    lowerWings.push(lower);
  }

  // Arm 0 reaches out with an open gauntlet, arm 1 carries the sword.
  const arms = [];
  for (const side of [-1, 1]) {
    const arm = pivot(rig, side * 0.64, 1.7, 0.04);
    b.bar(arm, robeShade, [0, 0, 0], [0, -0.52, 0], 0.1, 0.07, 5);
    b.place(arm, b.cone(0.15, 0.5, 4), robe, [0, -0.3, -0.06], [1, 1, 0.6], [Math.PI, 0, 0]);
    const elbow = pivot(arm, 0, -0.52, 0);
    b.place(elbow, b.cylinder(0.075, 0.1, 0.46, 5), gold, [0, -0.24, 0]);
    b.spike(elbow, gold, [0, -0.02, -0.04], [0, 0.4, -1], 0.22, 0.05);
    const claws = clawHand(b, elbow, [0, -0.46, 0], goldDark, gold, 0.8, 4);
    arms.push({ arm, elbow, hand: claws.hand, digits: claws.digits });
  }
  const sword = pivot(arms[1].hand, 0, -0.14, 0.04);
  b.bar(sword, goldDark, [0, 0.3, 0], [0, -0.12, 0], 0.04, 0.04, 5);
  b.place(sword, b.octa(0.07), gold, [0, 0.34, 0]);
  b.place(sword, b.box(0.56, 0.07, 0.09), gold, [0, -0.12, 0]);
  for (const side of [-1, 1]) b.spike(sword, gold, [side * 0.26, -0.12, 0], [side * 1, -0.8, 0], 0.2, 0.05);
  b.place(sword, b.cylinder(0.14, 0.2, 1.1, 4), steel, [0, -0.7, 0], [1, 1, 0.22]);
  b.place(sword, b.cone(0.14, 0.3, 4), steel, [0, -1.4, 0], [1, 1, 0.22], [Math.PI, 0, 0]);
  const fuller = b.place(sword, b.box(0.05, 1.1, 0.1), eyeGlow, [0, -0.72, 0]);

  const clock = rageClock();
  group.userData.animate = (seconds, enemy) => {
    const phase = enemy.phase || 0;
    const windup = enemy.windup || 0;
    const hurt = enemy.hurt || 0;
    const rage = enemy.rage || 0;
    const t = clock(seconds, rage) + phase;
    const wide = 1 + rage * 0.5;
    const beat = Math.sin(t * 2.4);
    const shake = Math.sin(seconds * 36) * hurt;
    for (let index = 0; index < 2; index += 1) {
      const side = index ? 1 : -1;
      upperWings[index].rotation.z = side * (0.02 + beat * 0.2 * wide + windup * 0.4 - hurt * 0.3);
      upperWings[index].rotation.y = side * (-0.3 - beat * 0.14 + windup * 0.2);
      lowerWings[index].rotation.z = side * (-0.05 - Math.sin(t * 2.4 - 0.9) * 0.16 * wide - windup * 0.2);
      lowerWings[index].rotation.y = side * (-0.35 + Math.sin(t * 2.4 - 0.9) * 0.1);
    }
    body.position.y = BODY_Y + Math.sin(t * 2.4 - 1.2) * 0.04 * wide;
    body.rotation.x = 0.1 - windup * 0.16 - hurt * 0.28;
    body.rotation.z = shake * 0.03;
    for (let index = 0; index < rags.length; index += 1) {
      rags[index].rotation.x = Math.sin(t * 2 + index * 1.4) * 0.22 * wide - 0.1;
      rags[index].rotation.z = Math.cos(t * 1.7 + index * 1.4) * 0.22 * wide;
    }
    // The eye looks slowly from side to side; it narrows now and then, and stares wide in rage.
    iris.position.x = Math.sin(t * 0.7) * 0.1;
    const blink = Math.pow(Math.max(0, Math.sin(t * 0.5 + 1)), 12);
    const open = Math.max(0.15, 1 - blink - hurt * 0.7) * (1 + rage * 0.35 + windup * 0.3);
    lids[0].position.y = 1.54 + 0.06 + open * 0.13;
    lids[1].position.y = 1.54 - 0.06 - open * 0.13;
    const stare = 1 + rage * 0.3 + Math.sin(t * 3.2) * (0.05 + rage * 0.15) + windup * 0.25;
    iris.scale.set(stare, Math.min(stare, open * 1.2), 1);
    head.rotation.x = 0.12 + Math.sin(t * 0.9) * 0.06 - hurt * 0.5 - windup * 0.2;
    head.rotation.y = Math.sin(t * 0.6) * 0.22 * wide;
    head.rotation.z = shake * 0.1;
    haloRing.rotation.z = t * 0.5;
    haloRing.position.y = HEAD_Y + 0.12 + Math.sin(t * 2) * 0.03;
    const shine = 1 + rage * 0.12 + Math.sin(t * 2.7) * 0.03 * wide + windup * 0.15;
    haloRing.scale.set(shine, shine, 1);
    const accuser = arms[0];
    accuser.arm.rotation.x = -0.9 + Math.sin(t * 1.3) * 0.12 * wide + hurt * 0.5 - windup * 0.2;
    accuser.arm.rotation.z = -0.3 - hurt * 0.7;
    accuser.elbow.rotation.x = -0.5 + Math.sin(t * 1.3 + 1) * 0.12;
    accuser.hand.rotation.x = -0.4;
    const grasp = -0.3 + Math.sin(t * 2.5) * 0.3 * wide - rage * 0.3;
    for (let finger = 0; finger < accuser.digits.length; finger += 1) accuser.digits[finger].rotation.x = grasp + finger * 0.05;
    // The sword is carried upright at the side, and swung back overhead before a throw.
    const bearer = arms[1];
    bearer.arm.rotation.x = -0.3 + Math.sin(t * 1.1) * 0.06 * wide - windup * 1.3 + hurt * 0.3;
    bearer.arm.rotation.z = 0.3 + hurt * 0.5;
    bearer.elbow.rotation.x = -0.35 - windup * 0.5;
    for (let finger = 0; finger < bearer.digits.length; finger += 1) bearer.digits[finger].rotation.x = -1.3;
    sword.rotation.x = Math.PI + 0.7 + Math.sin(t * 1.1 + 0.6) * 0.06;
    sword.rotation.z = 0.5;
    fuller.scale.x = 1 + rage * 0.8 + Math.sin(t * 4) * 0.2 * wide + windup * 0.8;
  };
  group.userData.animate(0, {});
  return group;
}

// Phantom Rift — a living tear in the world: two jagged crystal jaws around a burning
// seam, shard teeth meshing across it, slanted eyes under spiked brows, a crown of
// splinters, two floating claws of crystal, a turning lattice and a ring of shards.
export function buildPhantomRift(type, kit) {
  const b = bossBuilder(kit);
  const crystalMat = kit.mat(mix(type.body, type.trim, 0.3));
  const crystalDark = kit.mat(mix(type.body, type.trim, 0.1));
  const crystalPale = kit.mat(mix(type.body, type.trim, 0.55));
  const shard = kit.glow(type.trim, 1.2);
  const lattice = kit.glow(type.trim, 1.5, { wireframe: true });
  const seamGlow = kit.glow(mix(type.trim, 0xffffff, 0.45), 1.8);
  const eyeGlow = kit.glow(0xffffff, 1.6);
  const group = new THREE.Group();

  const CENTER_Y = 1.55;
  const crystal = pivot(group, 0, CENTER_Y, 0);
  const seam = pivot(crystal, 0, 0, 0);
  b.place(seam, b.octa(0.3), seamGlow, [0, -0.04, 0.02], [0.55, 3.1, 0.6]);
  b.place(seam, b.octa(0.16), shard, [0, 0.1, 0.16], [1, 2.2, 0.5]);
  const halves = [];
  for (const side of [-1, 1]) {
    const half = pivot(crystal, 0, 0, 0);
    b.place(half, b.octa(0.6), crystalMat, [side * 0.44, 0.02, 0], [0.56, 1.8, 0.72], [0, side * 0.3, side * -0.1]);
    b.place(half, b.octa(0.5), crystalDark, [side * 0.52, 0.2, -0.3], [0.6, 1.5, 0.7], [0.2, 0, side * -0.3]);
    b.place(half, b.octa(0.4), crystalPale, [side * 0.7, -0.22, 0.06], [0.5, 1.7, 0.6], [0, 0, side * 0.5]);
    b.place(half, b.octa(0.34), crystalDark, [side * 0.36, -0.8, 0.05], [0.5, 1.7, 0.6], [0, 0, side * 0.22]);
    // Brow, eye and the teeth that reach across the seam.
    b.place(half, b.octa(0.1), eyeGlow, [side * 0.34, 0.52, 0.33], [1.7, 0.55, 0.5], [0, side * 0.3, side * 0.5]);
    b.spike(half, crystalDark, [side * 0.12, 0.5, 0.36], [side * 1, 0.62, -0.1], 0.56, 0.1, 3);
    b.spike(half, crystalPale, [side * 0.66, 0.66, 0.1], [side * 1, 0.6, 0], 0.5, 0.12);
    [[0.3, 0.32], [0.08, 0.4], [-0.16, 0.36], [-0.4, 0.3], [-0.62, 0.22]].forEach(([y, length], index) => {
      const offset = side === 1 ? 0.11 : 0;
      b.spike(half, index % 2 ? crystalPale : crystalDark, [side * 0.3, y - offset, 0.3 - Math.abs(y) * 0.2], [side * -1, side * -0.12, 0.1], length, 0.075, 3);
    });
    halves.push(half);
  }
  // A crown of splinters, taller on one side.
  [[-0.62, 0.62, -0.75, 0.5], [-0.34, 0.98, -0.3, 0.7], [0.3, 1.0, 0.22, 0.8], [0.6, 0.72, 0.6, 0.72], [0.82, 0.3, 1.1, 0.5], [-0.84, 0.2, -1.2, 0.4]].forEach(([x, y, tilt, length], index) => {
    b.spike(crystal, index % 2 ? crystalPale : crystalMat, [x, y - 0.1, -0.05], [tilt, 1, -0.1], length, 0.07 + length * 0.09);
  });
  // Shards trailing below, each bobbing on its own.
  const trail = [];
  [[0.05, -1.18, 0.2], [-0.1, -1.4, 0.12], [0.06, -1.52, 0.07]].forEach(([x, y, size]) => {
    trail.push(b.place(group, b.octa(size), size > 0.15 ? crystalDark : shard, [x, CENTER_Y + y, 0], [0.7, 1.9, 0.7]));
  });

  const claws = [];
  for (const side of [-1, 1]) {
    const claw = pivot(group, side * 1.22, CENTER_Y - 0.25, 0.4);
    b.place(claw, b.octa(0.22), crystalMat, [0, 0, 0], [0.9, 1.2, 0.7], [0.3, 0, side * 0.3]);
    const talons = [];
    for (let index = 0; index < 3; index += 1) {
      const talon = pivot(claw, (index - 1) * 0.15, -0.14, 0.08);
      talon.rotation.z = (index - 1) * 0.35;
      b.place(talon, b.octa(0.09), crystalPale, [0, -0.14, 0.02], [0.6, 2, 0.6]);
      b.spike(talon, shard, [0, -0.26, 0.02], [0, -1, 0.45], 0.34, 0.055, 3);
      talons.push(talon);
    }
    b.spike(claw, crystalDark, [0, 0.16, -0.04], [side * 0.4, 1, -0.3], 0.36, 0.09, 3);
    claws.push({ claw, talons });
  }

  const cage = pivot(group, 0, CENTER_Y, 0);
  b.place(cage, b.octa(1.0), lattice, [0, 0, 0], [0.9, 1.5, 0.9]);
  const orbit = pivot(group, 0, CENTER_Y, 0);
  for (let index = 0; index < 9; index += 1) {
    const angle = (index / 9) * Math.PI * 2;
    b.place(orbit, b.octa(index % 3 === 0 ? 0.15 : 0.09), index % 3 === 2 ? crystalPale : shard, [Math.cos(angle) * 1.4, Math.sin(index * 2.3) * 0.12, Math.sin(angle) * 1.4], [0.8, 2, 0.8], [index * 0.9, 0, index * 0.5]);
  }

  const clock = rageClock();
  group.userData.animate = (seconds, enemy) => {
    const phase = enemy.phase || 0;
    const windup = enemy.windup || 0;
    const hurt = enemy.hurt || 0;
    const rage = enemy.rage || 0;
    const t = clock(seconds, rage) + phase;
    const wide = 1 + rage * 0.6;
    const shake = Math.sin(seconds * 39) * hurt;
    orbit.rotation.y = t * 1.3;
    orbit.rotation.x = 0.35 + Math.sin(t * 0.7) * 0.2 * wide;
    const spread = 1 + hurt * 0.35 + windup * 0.2;
    orbit.scale.set(spread, 1, spread);
    cage.rotation.y = -t * 0.6;
    cage.rotation.z = Math.sin(t * 0.5) * 0.1;
    // The jaws breathe open and shut around the seam; they gape for a throw and are knocked apart by a hit.
    const gape = 0.03 + (Math.sin(t * 1.6) * 0.5 + 0.5) * 0.06 * wide + Math.max(0, Math.sin(t * 0.45)) * 0.05 + windup * 0.2 + hurt * 0.26 + rage * 0.05;
    halves[0].position.x = -gape;
    halves[1].position.x = gape;
    halves[0].rotation.z = gape * 0.9 + shake * 0.05;
    halves[1].rotation.z = -gape * 0.9 + shake * 0.05;
    const burn = 1 + gape * 4 + rage * 0.5 + Math.sin(t * 5) * (0.08 + rage * 0.2);
    seam.scale.set(burn, 1 + rage * 0.06, burn);
    crystal.rotation.y = Math.sin(t * 0.9) * 0.25 * wide;
    crystal.rotation.x = 0.12 + Math.sin(t * 1.1) * 0.05 - windup * 0.2 - hurt * 0.35;
    crystal.position.y = CENTER_Y + Math.sin(t * 1.7) * 0.05;
    for (let index = 0; index < trail.length; index += 1) {
      trail[index].position.x = Math.sin(t * 1.3 - index * 0.9) * 0.1 * (index + 1) * 0.6;
      trail[index].rotation.y = t * (1 + index * 0.4);
    }
    for (let index = 0; index < 2; index += 1) {
      const side = index ? 1 : -1;
      const { claw, talons } = claws[index];
      const drift = Math.sin(t * 1.4 + index * 2.4);
      // One claw lifts high and opens before a throw.
      const raise = index ? windup : windup * 0.25;
      claw.position.y = CENTER_Y - 0.25 + drift * 0.14 * wide + raise * 1.1 + hurt * 0.2;
      claw.position.x = side * (1.22 + Math.sin(t * 0.9 + index) * 0.06 + hurt * 0.4);
      claw.position.z = 0.4 + Math.cos(t * 1.4 + index * 2.4) * 0.12 - raise * 0.3;
      claw.rotation.x = -0.5 + drift * 0.15 - raise * 0.9;
      claw.rotation.z = side * (-0.3 + hurt * 0.5);
      const curl = -0.3 + Math.sin(t * 2.6 + index * 1.7) * 0.35 * wide - rage * 0.3 + raise * 0.5;
      for (let finger = 0; finger < talons.length; finger += 1) talons[finger].rotation.x = curl;
    }
  };
  group.userData.animate(0, {});
  return group;
}

// Stellar Dreadnought — a towering star knight in black plate: a horned helm with a
// slanted visor sunk in its gorget, stacked spiked pauldrons, a star burning in the
// breastplate, a spiked tower shield, a great morning star held high and a torn cape.
export function buildStellarDreadnought(type, kit) {
  const b = bossBuilder(kit);
  const plate = kit.mat(mix(type.body, 0x4a5a7c, 0.5));
  const plateDark = kit.mat(mix(type.body, 0x4a5a7c, 0.22));
  const gold = kit.mat(type.trim);
  const goldDark = kit.mat(tone(type.trim, 0.55));
  const cloth = kit.mat(tone(type.trim, 0.38), { side: THREE.DoubleSide });
  const dark = kit.mat(0x020408);
  const eyeGlow = kit.glow(type.eye, 1.9);
  const lamp = kit.glow(type.trim, 1.3);
  const group = new THREE.Group();

  b.place(group, b.cylinder(0.46, 0.52, 0.34, 6), plateDark, [0, 1.04, 0], [1.05, 1, 0.78]);
  b.place(group, b.box(1.06, 0.1, 0.78), gold, [0, 1.2, 0]);
  b.place(group, b.octa(0.1), lamp, [0, 1.2, 0.4], [1, 1, 0.4]);
  for (const [x, z, turn, length] of [[0, 0.4, 0, 0.5], [-0.36, 0.34, -0.5, 0.4], [0.36, 0.34, 0.5, 0.4], [-0.54, 0.06, -1.4, 0.34], [0.54, 0.06, 1.4, 0.34]]) {
    b.place(group, b.box(0.3, length, 0.07), plate, [x, 1.14 - length / 2, z], null, [-0.14, turn, 0]);
    b.place(group, b.cone(0.15, 0.2, 3), gold, [x, 1.14 - length - 0.08, z + 0.03], [1, 1, 0.3], [Math.PI - 0.14, turn, 0]);
  }
  const legs = [];
  for (const side of [-1, 1]) {
    const leg = pivot(group, side * 0.36, 1.0, 0);
    b.place(leg, b.cylinder(0.24, 0.19, 0.5, 5), plate, [side * 0.05, -0.24, 0], null, [0, 0, side * 0.12]);
    b.place(leg, b.ico(0.17, 0), gold, [side * 0.09, -0.48, 0.1]);
    b.spike(leg, gold, [side * 0.09, -0.46, 0.2], [0, 0.5, 1], 0.24, 0.07);
    b.place(leg, b.cylinder(0.17, 0.23, 0.42, 5), plateDark, [side * 0.1, -0.68, 0]);
    b.place(leg, b.box(0.38, 0.18, 0.56), plate, [side * 0.1, -0.9, 0.1]);
    b.spike(leg, gold, [side * 0.1, -0.92, 0.36], [0, 0.15, 1], 0.24, 0.1);
    legs.push(leg);
  }

  const TORSO_Y = 1.24;
  const torso = pivot(group, 0, TORSO_Y, 0);
  b.place(torso, b.ico(0.66, 1), plate, [0, 0.46, 0], [1.3, 1.04, 0.88]);
  b.place(torso, b.cylinder(0.36, 0.46, 0.3, 6), plateDark, [0, 0.98, 0.0]);
  b.place(torso, b.cylinder(0.4, 0.38, 0.08, 6), gold, [0, 1.12, 0.0]);
  // The star in the breastplate, behind a gold collar of plates.
  const star = pivot(torso, 0, 0.48, 0.57);
  b.place(star, b.octa(0.16), lamp, [0, 0, 0], [0.5, 2.1, 0.3]);
  b.place(star, b.octa(0.16), lamp, [0, 0, 0], [1.7, 0.5, 0.3]);
  b.place(star, b.octa(0.1), eyeGlow, [0, 0, 0.03], [1, 1, 0.4]);
  for (const side of [-1, 1]) {
    b.place(torso, b.box(0.42, 0.12, 0.1), gold, [side * 0.34, 0.82, 0.46], null, [-0.3, 0, side * 0.5]);
    b.place(torso, b.box(0.36, 0.1, 0.1), goldDark, [side * 0.3, 0.14, 0.5], null, [0.2, 0, side * -0.45]);
  }
  const cape = pivot(torso, 0, 0.92, -0.5);
  cape.add(kit.mesh(fanGeometry(1, [0, 0, 0], [[-1.0, 0.0, 0.2], [-1.05, -1.2, 0], [-0.7, -2.0, -0.2], [-0.3, -1.55, -0.3], [0.1, -2.05, -0.3], [0.5, -1.5, -0.24], [0.85, -1.95, -0.14], [1.05, -1.0, 0], [1.0, 0.0, 0.2]], [0.04, 0.2, 0.4, 0.36, 0.42, 0.36, 0.2, 0.04]), cloth));

  const head = pivot(torso, 0, 1.08, 0.06);
  b.place(head, b.cylinder(0.23, 0.27, 0.44, 6), plate, [0, 0.2, 0]);
  b.place(head, b.ico(0.25, 0), plateDark, [0, 0.42, 0], [1, 0.7, 1]);
  b.place(head, b.box(0.34, 0.12, 0.06), dark, [0, 0.27, 0.24]);
  b.place(head, b.box(0.07, 0.3, 0.08), gold, [0, 0.14, 0.26]);
  b.place(head, b.box(0.4, 0.08, 0.16), plateDark, [0, 0.37, 0.2], null, [0.5, 0, 0]);
  for (const side of [-1, 1]) {
    b.place(head, b.box(0.17, 0.05, 0.05), eyeGlow, [side * 0.11, 0.28, 0.27], null, [0, 0, side * 0.4]);
    for (const y of [0.04, 0.12]) b.place(head, b.box(0.1, 0.025, 0.04), dark, [side * 0.1, y, 0.26]);
    // Great horns rising from the temples.
    b.bar(head, goldDark, [side * 0.22, 0.38, -0.02], [side * 0.5, 0.5, 0], 0.09, 0.07, 5);
    b.spike(head, goldDark, [side * 0.49, 0.48, 0], [side * 0.25, 1, 0.2], 0.52, 0.075, 5);
  }
  for (const [z, length] of [[0.18, 0.26], [0.0, 0.36], [-0.18, 0.28]]) {
    b.place(head, b.cone(0.09, length, 4), gold, [0, 0.56 + length / 2, z], [0.4, 1, 1.3], [-0.3, 0, 0]);
  }

  // Arm 0 carries the shield, arm 1 the morning star.
  const arms = [];
  for (const side of [-1, 1]) {
    const big = side === -1;
    [[0, 0.86, 0.42, 1], [0.16, 0.7, 0.36, 0.86], [0.28, 0.54, 0.3, 0.7]].forEach(([dx, y, radius, depth], index) => {
      b.place(torso, b.dodeca(radius * (big ? 1.12 : 1)), index === 1 ? plate : plateDark, [side * (0.86 + dx), y, 0], [1.25, 0.5, 1.2 * depth], [0, side * 0.3, side * -(0.25 + index * 0.25)]);
    });
    b.spike(torso, gold, [side * 0.84, 0.96, 0], [side * 0.35, 1, -0.1], big ? 0.56 : 0.42, 0.1);
    b.spike(torso, gold, [side * 1.06, 0.9, 0.04], [side * 1, 0.6, 0], big ? 0.44 : 0.34, 0.09);
    b.spike(torso, gold, [side * 0.9, 0.92, 0.3], [side * 0.5, 0.5, 1], 0.26, 0.08);
    const arm = pivot(torso, side * 0.98, 0.7, 0);
    b.place(arm, b.cylinder(0.16, 0.19, 0.52, 5), plate, [0, -0.3, 0]);
    const elbow = pivot(arm, 0, -0.58, 0);
    b.place(elbow, b.ico(0.17, 0), gold, [0, 0, 0]);
    b.spike(elbow, gold, [0, 0, -0.1], [0, 0.2, -1], 0.26, 0.07);
    b.place(elbow, b.cylinder(0.2, 0.15, 0.46, 5), plateDark, [0, -0.28, 0]);
    b.place(elbow, b.ico(0.19, 0), gold, [0, -0.58, 0.02], [1, 1, 1.1]);
    arms.push({ arm, elbow });
  }
  const shield = pivot(arms[0].elbow, -0.08, -0.4, 0.26);
  b.place(shield, b.cylinder(0.6, 0.6, 0.06, 6), gold, [0, 0, 0], [0.84, 1, 1.42], [Math.PI / 2, 0, 0]);
  b.place(shield, b.cylinder(0.53, 0.53, 0.1, 6), plateDark, [0, 0, 0.02], [0.84, 1, 1.42], [Math.PI / 2, 0, 0]);
  b.place(shield, b.octa(0.15), lamp, [0, 0.06, 0.1], [0.5, 2.4, 0.3]);
  b.place(shield, b.octa(0.15), lamp, [0, 0.06, 0.1], [1.8, 0.5, 0.3]);
  b.spike(shield, gold, [0, -0.8, 0], [0, -1, 0.1], 0.4, 0.1);
  for (const [x, y, dx, dy] of [[0, 0.82, 0, 1], [-0.44, 0.44, -1, 0.7], [0.44, 0.44, 1, 0.7], [-0.44, -0.44, -1, -0.7], [0.44, -0.44, 1, -0.7]]) {
    b.spike(shield, gold, [x, y, 0], [dx, dy, 0.2], 0.26, 0.08);
  }
  const mace = pivot(arms[1].elbow, 0, -0.6, 0.06);
  b.bar(mace, plateDark, [0, -0.3, 0], [0, 1.05, 0], 0.05, 0.06, 5);
  b.place(mace, b.cylinder(0.09, 0.09, 0.1, 5), gold, [0, 0.8, 0]);
  b.place(mace, b.ico(0.27, 0), goldDark, [0, 1.15, 0]);
  for (const direction of [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, 0, 1], [0, 0, -1], [0.7, 0.7, 0], [-0.7, 0.7, 0], [0, 0.7, 0.7], [0, 0.7, -0.7], [0.7, -0.5, 0.5], [-0.7, -0.5, 0.5], [0.6, -0.4, -0.6], [-0.6, -0.4, -0.6]]) {
    const length = Math.hypot(direction[0], direction[1], direction[2]);
    b.spike(mace, lamp, [direction[0] / length * 0.2, 1.15 + direction[1] / length * 0.2, direction[2] / length * 0.2], direction, 0.38, 0.08);
  }

  const clock = rageClock();
  group.userData.animate = (seconds, enemy) => {
    const phase = enemy.phase || 0;
    const windup = enemy.windup || 0;
    const hurt = enemy.hurt || 0;
    const rage = enemy.rage || 0;
    const t = clock(seconds, rage) + phase;
    const wide = 1 + rage * 0.5;
    const step = Math.sin(t * 3);
    const shake = Math.sin(seconds * 35) * hurt;
    legs[0].rotation.x = step * 0.28 * wide;
    legs[1].rotation.x = -step * 0.28 * wide;
    torso.position.y = TORSO_Y + Math.abs(step) * 0.02;
    torso.rotation.x = 0.14 + Math.sin(t * 1.5) * 0.025 * wide - windup * 0.25 - hurt * 0.35;
    torso.rotation.z = step * 0.04 * wide + shake * 0.03;
    torso.rotation.y = step * 0.06 + windup * 0.3;
    head.rotation.x = -0.06 - hurt * 0.4 + windup * 0.15;
    head.rotation.y = Math.sin(t * 0.8) * 0.3 * wide - windup * 0.2;
    head.rotation.z = shake * 0.1;
    const pulse = 1 + rage * 0.35 + Math.sin(t * 2.8) * (0.07 + rage * 0.2) + windup * 0.25;
    star.scale.set(pulse, pulse, 1);
    star.rotation.z = Math.sin(t * 0.9) * 0.1 + rage * Math.sin(t * 2.8) * 0.2;
    // The shield stays braced in front, and is knocked wide by a hit.
    arms[0].arm.rotation.x = -0.5 + step * 0.05 + hurt * 0.3;
    arms[0].arm.rotation.z = -0.14 - hurt * 0.8;
    arms[0].elbow.rotation.x = -0.6 - Math.sin(t * 1.5) * 0.04;
    shield.rotation.x = 0.96 - hurt * 0.3;
    shield.rotation.y = 0.2 - hurt * 0.6;
    // The morning star is held high and hefted; it winds back over the shoulder for a throw.
    const heft = Math.sin(t * 1.5);
    arms[1].arm.rotation.x = -0.7 - heft * 0.14 * wide - windup * 1.3 + hurt * 0.5;
    arms[1].arm.rotation.z = 0.36 + hurt * 0.5 + windup * 0.1;
    arms[1].elbow.rotation.x = -1.2 - heft * 0.1 + windup * 0.8;
    mace.rotation.x = 1.5 + Math.sin(t * 1.5 + 0.7) * 0.12 * wide - windup * 0.2;
    mace.rotation.z = -0.3 + shake * 0.1;
    cape.rotation.x = 0.14 + Math.sin(t * 2 + 0.6) * 0.07 * wide + hurt * 0.3 + windup * 0.15;
    cape.scale.x = 1 + Math.sin(t * 2.4) * 0.04;
  };
  group.userData.animate(0, {});
  return group;
}

// Mimic Chest — a toothy treasure chest. Returns the chest and its lid pivot, which the
// game swings open; the base and lid meet in two rows of teeth.
export function buildMimicChest(type, kit) {
  const b = builder(kit);
  const wood = kit.mat(mix(type.body, 0x8a5226, 0.5));
  const woodDark = kit.mat(mix(type.body, 0x5a3418, 0.7));
  const gold = kit.mat(type.trim);
  const inside = kit.mat(0x1a0a1c);
  const bone = kit.mat(BONE);
  const eyeGlow = kit.glow(type.eye, 1.8);
  const gem = kit.glow(type.eye, 1.4);
  const group = new THREE.Group();

  // Four-sided tapered tubs, turned 45 degrees and squashed front to back, make the box.
  const tub = (top, bottom, height) => b.cylinder(top, bottom, height, 4);
  b.place(group, tub(0.86, 0.76, 0.56), wood, [0, 0.28, 0], [1, 1, 0.76], [0, Math.PI / 4, 0]);
  b.place(group, tub(0.9, 0.9, 0.09), gold, [0, 0.045, 0], [1, 1, 0.76], [0, Math.PI / 4, 0]);
  b.place(group, tub(0.89, 0.87, 0.08), gold, [0, 0.52, 0], [1, 1, 0.76], [0, Math.PI / 4, 0]);
  b.place(group, b.box(0.98, 0.06, 0.74), inside, [0, 0.55, 0]);
  for (const x of [-0.24, 0.24]) b.place(group, b.octa(0.11), eyeGlow, [x, 0.34, 0.46], [1.2, 1, 0.5]);
  for (let index = 0; index < 5; index += 1) {
    b.place(group, b.cone(0.055, 0.17, 4), bone, [-0.4 + index * 0.2, 0.62, 0.36], null, [0.25, 0, 0]);
  }

  const lid = pivot(group, 0, 0.58, -0.46);
  // Half of a seven-sided drum, lying on its side, is the domed lid.
  const dome = new THREE.CylinderGeometry(0.47, 0.47, 1.22, 7, 1, false, 0, Math.PI);
  b.place(lid, dome, wood, [0, 0, 0.46], null, [0, 0, Math.PI / 2]);
  for (const x of [-0.62, 0, 0.62]) {
    const band = new THREE.CylinderGeometry(0.49, 0.49, 0.09, 7, 1, false, 0, Math.PI);
    b.place(lid, band, x === 0 ? woodDark : gold, [x, 0, 0.46], null, [0, 0, Math.PI / 2]);
  }
  b.place(lid, b.box(1.2, 0.05, 0.9), inside, [0, 0.0, 0.46]);
  b.place(lid, b.box(0.2, 0.26, 0.08), gold, [0, 0.03, 0.95]);
  b.place(lid, b.octa(0.09), gem, [0, 0.2, 0.93], [1, 1.2, 0.6]);
  for (let index = 0; index < 6; index += 1) {
    b.place(lid, b.cone(0.05, 0.17, 4), bone, [-0.46 + index * 0.185, -0.06, 0.82], null, [Math.PI - 0.25, 0, 0]);
  }
  return { group, lid };
}

export const LOW_POLY_CREATURES = {
  'Mudlug': buildMudlug,
  'Glowmite': buildGlowmite,
  'Ash Oaf': buildAshOaf,
  'Cinder Imp': buildCinderImp,
  'Bog Shambler': buildBogShambler,
  'Crimson Bulwark': buildCrimsonBulwark,
  'Verdant Colossus': buildVerdantColossus,
  'Storm Warden': buildStormWarden,
  'Solar Anvil': buildSolarAnvil,
  'Glacial Titan': buildGlacialTitan,
  'Magma Sovereign': buildMagmaSovereign,
  'Void Specter': buildVoidSpecter,
  'Celestial Arbiter': buildCelestialArbiter,
  'Phantom Rift': buildPhantomRift,
  'Stellar Dreadnought': buildStellarDreadnought,
};
