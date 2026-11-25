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

// One wing as a fan of flat triangles between the arm and finger bones. `side` is -1
// for the left wing, which extends toward -x.
function wingGeometry(side) {
  const point = (x, y, z) => new THREE.Vector3(x * -side, y, z);
  const shoulder = point(0, 0, 0);
  const elbow = point(-0.9, 0.55, 0);
  const tipTop = point(-2.35, 1.3, -0.12);
  const tipMid = point(-2.15, 0.12, -0.06);
  const tipLow = point(-1.4, -0.78, 0);
  const inner = point(-0.32, -0.72, 0);
  // Edge points pulled toward the elbow give the scalloped trailing edge.
  const scallop = (a, b) => a.clone().add(b).multiplyScalar(0.5).lerp(elbow, 0.3);
  const triangles = [
    [shoulder, elbow, inner],
    [elbow, tipTop, scallop(tipTop, tipMid)], [elbow, scallop(tipTop, tipMid), tipMid],
    [elbow, tipMid, scallop(tipMid, tipLow)], [elbow, scallop(tipMid, tipLow), tipLow],
    [elbow, tipLow, scallop(tipLow, inner)], [elbow, scallop(tipLow, inner), inner],
  ];
  const positions = [];
  for (const triangle of triangles) for (const vertex of triangle) positions.push(vertex.x, vertex.y, vertex.z);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.computeVertexNormals();
  return { geometry, bones: [[shoulder, elbow, 0.07], [elbow, tipTop, 0.045], [elbow, tipMid, 0.04], [elbow, tipLow, 0.04]], tipTop };
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

  const BODY_Y = 1.5;
  const body = pivot(group, 0, BODY_Y, -0.3);
  b.place(body, b.ico(0.62, 1), hide, [0, 0.1, 0.1], [1.15, 1, 1.2]);
  b.place(body, b.ico(0.48, 1), hideDark, [0, -0.45, -0.3], [0.95, 1.05, 1.1]);
  b.place(body, b.ico(0.36, 0), hideDark, [0, -0.85, -0.55], [0.9, 1, 1]);
  // Dark plates down the chest, with the fire inside showing in the gaps between them.
  const embers = pivot(body, 0, 0.1, 0.1);
  [[0.36, 0.78, 0.66], [0.07, 0.88, 0.76], [-0.22, 0.74, 0.7], [-0.5, 0.5, 0.46]].forEach(([y, width, z], index) => {
    b.place(body, b.box(width, 0.2, 0.1), plate, [0, 0.1 + y, 0.1 + z], null, [-y * 1.3, 0, 0]);
    if (index > 0) b.place(embers, b.box(width * 0.86, 0.12, 0.08), fire, [0, y + 0.145, z + 0.0], null, [-y * 1.3, 0, 0]);
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
  const blaze = pivot(jaw, 0, 0.02, 0.2);
  b.place(blaze, b.ico(0.13, 0), fire, [0, 0, 0.14], [1.4, 0.6, 2.8]);
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
    for (const { wing, side } of wings) {
      wing.rotation.z = side * lift;
      wing.rotation.y = side * (-0.3 - beat * 0.14 + windup * 0.25 - hurt * 0.3);
    }
    body.position.y = BODY_Y + Math.sin(t * 4.2 - 1.3) * 0.05 * wide;
    body.rotation.x = 0.12 - windup * 0.3 - hurt * 0.25;
    // A slow roar: the neck rears, the jaw swings open and the fire in it swells.
    const roar = Math.max(Math.pow(Math.max(0, Math.sin(t * 0.9)), 3), windup, hurt * 0.8);
    let bend = 0;
    neck.forEach((segment, index) => {
      const sway = Math.sin(t * 1.5 - index * 0.6) * 0.06 * wide;
      segment.rotation.x = NECK_BEND[index] + sway - (index === 0 ? windup * 0.55 + hurt * 0.5 : hurt * 0.2);
      segment.rotation.z = Math.sin(t * 1.1 - index * 0.7) * 0.07 * wide + Math.sin(seconds * 31) * hurt * 0.06;
      bend += segment.rotation.x;
    });
    head.rotation.x = 0.3 - bend - body.rotation.x - roar * 0.25 + windup * 0.2;
    head.rotation.y = Math.sin(t * 0.8) * 0.2;
    head.rotation.z = Math.sin(seconds * 37) * hurt * 0.12;
    jaw.rotation.x = 0.34 + roar * 0.5;
    const flare = 0.7 + roar * 0.9 + rage * 0.5 + Math.sin(seconds * 17 + phase) * 0.08;
    blaze.scale.set(flare, flare, flare);
    const glow = 1 + rage * 0.1 + Math.sin(t * 3.4) * (0.02 + rage * 0.05) + windup * 0.06;
    embers.scale.set(glow, 1 + (glow - 1) * 4, glow);
    arms.forEach(({ arm, digits, side }, index) => {
      arm.rotation.x = -0.15 + Math.sin(t * 1.9 + index * 1.4) * 0.14 * wide - windup * 0.5 - hurt * 0.4;
      arm.rotation.z = side * (0.1 + hurt * 0.7);
      const curl = -0.25 + Math.sin(t * 2.6 + index * 2) * 0.3 - rage * 0.3;
      for (const digit of digits) digit.rotation.x = curl;
    });
    legs.forEach((leg, index) => {
      leg.rotation.x = 0.2 + Math.sin(t * 2.1 + index * 1.3) * 0.12 * wide - windup * 0.5 + hurt * 0.4;
    });
    tail.forEach((segment, index) => {
      segment.rotation.x = TAIL_BEND[index] + (index === 0 ? windup * 0.4 : 0);
      segment.rotation.y = Math.sin(t * 2 - index * 0.7) * 0.2 * wide + Math.sin(seconds * 29) * hurt * 0.05;
    });
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
    const [fist, clubArm] = arms;
    fist.arm.rotation.x = -LEAN - 0.1 + step * 0.22 * wide + windup * 0.3 - hurt * 0.3;
    fist.arm.rotation.z = -0.2 - hurt * 0.7 - breath * 0.03;
    fist.elbow.rotation.x = -0.25 - Math.max(0, -step) * 0.15 - rage * 0.25;
    const clench = -0.5 + Math.sin(t * 2.2) * 0.3 * wide - rage * 0.4;
    for (const digit of fist.digits) digit.rotation.x = clench;
    // The club rests on the shoulder, and is hauled back over the head on a wind-up.
    clubArm.arm.rotation.x = -LEAN - 0.35 - step * 0.08 - windup * 1.5 + hurt * 0.3;
    clubArm.arm.rotation.z = 0.25 + hurt * 0.7 + breath * 0.03;
    clubArm.elbow.rotation.x = -1.15 - windup * 0.5 + Math.sin(t * 1.7 + 1) * 0.06 * wide;
    clubArm.hand.rotation.x = -0.2;
    club.rotation.x = 0.5 + Math.sin(t * 1.7) * 0.05 * wide - windup * 0.5;
    club.rotation.z = -0.25;
    for (const digit of clubArm.digits) digit.rotation.x = -1.2;
    tail.forEach((segment, index) => {
      segment.rotation.x = 0.3;
      segment.rotation.y = Math.sin(t * 2.6 - index * 0.8) * 0.35 * wide;
    });
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

  // Pelvis, and a kilt of rags the legs show through.
  b.place(group, b.ico(0.27, 0), boneShade, [0, 1.0, 0], [1.4, 0.6, 0.85]);
  const rags = [];
  for (let index = 0; index < 9; index += 1) {
    const angle = (index / 9) * Math.PI * 2 + 0.35;
    const rag = pivot(group, Math.sin(angle) * 0.34, 1.04, Math.cos(angle) * 0.24);
    const length = 0.55 + ((index * 5) % 4) * 0.13;
    b.place(rag, b.cone(0.14, length, 3), index % 2 ? cloth : dark, [0, -length / 2, 0], [1, 1, 0.3], [Math.PI, angle, 0]);
    rags.push({ rag, angle });
  }
  const legs = [];
  for (const side of [-1, 1]) {
    const leg = pivot(group, side * 0.22, 0.96, 0);
    b.bar(leg, boneMat, [0, 0, 0], [side * 0.05, -0.44, 0.04], 0.07, 0.055);
    b.place(leg, b.octa(0.09), boneShade, [side * 0.05, -0.46, 0.04]);
    b.bar(leg, boneMat, [side * 0.05, -0.46, 0.04], [side * 0.06, -0.9, 0], 0.055, 0.045);
    b.place(leg, b.cylinder(0.03, 0.11, 0.32, 4), boneShade, [side * 0.06, -0.92, 0.12], [1, 1, 0.45], [Math.PI / 2, 0, 0]);
    legs.push(leg);
  }

  const CHEST_Y = 1.02;
  const chest = pivot(group, 0, CHEST_Y, 0);
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
  b.bar(staff, dark, [0, -1.0, 0], [0, 1.15, 0], 0.045, 0.045, 5);
  b.place(staff, b.octa(0.1), iron, [0, 1.15, 0], [1.3, 0.8, 1.3]);
  b.spike(staff, iron, [0, -1.0, 0], [0, -1, 0], 0.2, 0.05);
  // A lightning bolt for a blade: three slanted shards.
  const bolt = pivot(staff, 0, 1.2, 0);
  b.place(bolt, b.octa(0.12), storm, [0.06, 0.2, 0], [0.7, 2.2, 0.35], [0, 0, -0.35]);
  b.place(bolt, b.octa(0.1), storm, [-0.04, 0.5, 0], [0.7, 2.0, 0.35], [0, 0, 0.5]);
  b.place(bolt, b.octa(0.09), storm, [0.04, 0.8, 0], [0.6, 2.4, 0.35], [0, 0, -0.2]);
  for (const side of [-1, 1]) b.spike(staff, iron, [0, 1.12, 0], [side * 1, 0.7, 0], 0.3, 0.05);

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
    rags.forEach(({ rag, angle }, index) => {
      const flutter = Math.sin(t * 2.4 + index * 1.9) * 0.14 * wide + 0.12;
      rag.rotation.x = Math.cos(angle) * flutter;
      rag.rotation.z = -Math.sin(angle) * flutter;
    });
    chest.position.y = CHEST_Y + Math.abs(step) * 0.025;
    chest.rotation.x = 0.16 + Math.sin(t * 1.5) * 0.03 * wide - windup * 0.22 - hurt * 0.35;
    chest.rotation.z = step * 0.035 * wide;
    chest.rotation.y = step * 0.05 + windup * 0.2;
    ribs.forEach((rib, index) => {
      rib.rotation.z = rattle * 0.16 * (index % 2 ? 1 : -1);
      rib.position.y = 0.2 + index * 0.18 + Math.sin(t * 1.5 - index * 0.5) * 0.008 + Math.abs(rattle) * 0.02;
    });
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
    const chatter = Math.sin(t * 0.6) > 0.55 ? Math.max(0, Math.sin(t * 15)) * 0.25 : 0;
    jaw.rotation.x = 0.2 + chatter + Math.max(windup, hurt) * 0.5 + rage * 0.12;
    const [caster, bearer] = arms;
    caster.arm.rotation.x = -0.5 + Math.sin(t * 1.4) * 0.1 * wide - windup * 1.9 + hurt * 0.3;
    caster.arm.rotation.z = -0.3 - windup * 0.3 - hurt * 0.8;
    caster.elbow.rotation.x = -1.1 + Math.sin(t * 1.4 + 0.8) * 0.12 + windup * 0.7;
    caster.hand.rotation.x = -0.3;
    const grasp = -0.5 + Math.sin(t * 3.1) * 0.25 * wide;
    for (const digit of caster.digits) digit.rotation.x = grasp;
    const swell = 1 + Math.sin(t * 6) * 0.15 + windup * 0.9 + rage * 0.3;
    orb.scale.set(swell, swell, swell);
    orb.rotation.y = t * 4;
    orb.rotation.x = t * 2.3;
    bearer.arm.rotation.x = -0.75 - step * 0.05 + windup * 0.3 + hurt * 0.4;
    bearer.arm.rotation.z = 0.22 + hurt * 0.7;
    bearer.elbow.rotation.x = -0.75;
    for (const digit of bearer.digits) digit.rotation.x = -1.3;
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

// Solar Anvil — a winged sun lion: a mane of slowly turning sun rays, feathered wings,
// a roaring jaw, paddling paws and a tufted tail.
export function buildSolarAnvil(type, kit) {
  const b = builder(kit);
  const furColor = mix(type.body, 0xc98a3c, 0.5);
  const fur = kit.mat(furColor);
  const furDark = kit.mat(tone(furColor, 0.62));
  const pale = kit.mat(mix(type.trim, 0xfff2c0, 0.55));
  const gold = kit.mat(type.trim);
  const ray = kit.glow(type.trim, 0.45);
  const feather = kit.mat(mix(type.trim, 0xfffbe8, 0.78), { side: THREE.DoubleSide });
  const featherGold = kit.mat(mix(type.trim, 0xf0641a, 0.45), { side: THREE.DoubleSide });
  const bone = kit.mat(BONE);
  const dark = kit.mat(0x1c1008);
  const eyeGlow = kit.glow(type.eye, 1.7);
  const group = new THREE.Group();

  const body = pivot(group, 0, 1.3, 0);
  b.place(body, b.ico(0.55, 1), fur, [0, 0.05, 0.34], [1, 1, 1.05]);
  b.place(body, b.ico(0.44, 0), fur, [0, -0.02, -0.1], [0.92, 0.9, 1.3]);
  b.place(body, b.ico(0.46, 1), fur, [0, -0.04, -0.52], [0.98, 0.96, 1.1]);
  b.place(body, b.ico(0.36, 0), pale, [0, -0.2, 0.3], [0.95, 0.8, 1.3]);

  const head = pivot(body, 0, 0.46, 0.78);
  head.scale.setScalar(1.18);
  const mane = pivot(head, 0, 0, -0.14);
  b.place(mane, b.ico(0.5, 0), gold, [0, 0, 0], [1.08, 1.08, 0.45]);
  for (let index = 0; index < 10; index += 1) {
    const angle = (index / 10) * Math.PI * 2;
    const length = index % 2 === 0 ? 0.52 : 0.34;
    const reach = 0.44 + length / 2;
    b.place(mane, b.cone(0.11, length, 4), ray, [Math.cos(angle) * reach, Math.sin(angle) * reach, 0], [1, 1, 0.5], [0, 0, angle - Math.PI / 2]);
  }
  b.place(head, b.ico(0.36, 1), fur, [0, 0, 0], [1.05, 0.95, 1]);
  b.place(head, b.box(0.32, 0.2, 0.28), pale, [0, -0.1, 0.32]);
  b.place(head, b.octa(0.07), dark, [0, 0.0, 0.47], [1.3, 0.8, 0.8]);
  for (const side of [-1, 1]) {
    b.place(head, b.box(0.2, 0.07, 0.14), furDark, [side * 0.16, 0.17, 0.27], null, [0.2, 0, side * -0.35]);
    b.place(head, b.octa(0.07), eyeGlow, [side * 0.16, 0.08, 0.31], [1.3, 0.75, 0.8]);
    b.place(head, b.cone(0.1, 0.2, 4), fur, [side * 0.27, 0.32, 0.02], null, [0, 0, side * -0.4]);
    b.place(head, b.cone(0.035, 0.13, 4), bone, [side * 0.1, -0.24, 0.4], null, [Math.PI, 0, 0]);
  }
  const jaw = pivot(head, 0, -0.2, 0.14);
  b.place(jaw, b.box(0.26, 0.08, 0.28), furDark, [0, -0.04, 0.15]);
  for (const side of [-1, 1]) b.place(jaw, b.cone(0.03, 0.1, 4), bone, [side * 0.09, 0.04, 0.26]);

  const wings = [];
  for (const side of [-1, 1]) {
    const wing = pivot(body, side * 0.34, 0.36, -0.12);
    wing.add(kit.mesh(featherWingGeometry(side, 1.7), featherGold));
    const inner = kit.mesh(featherWingGeometry(side, 1.0), feather);
    inner.position.z = 0.04;
    wing.add(inner);
    wings.push({ wing, side });
  }

  const legs = [];
  for (const side of [-1, 1]) {
    for (const [z, radius] of [[0.42, 0.13], [-0.56, 0.15]]) {
      const leg = pivot(body, side * 0.36, -0.24, z);
      b.place(leg, b.cylinder(radius * 0.8, radius, 0.46, 5), fur, [0, -0.2, 0]);
      b.place(leg, b.ico(0.17, 0), furDark, [0, -0.48, 0.07], [1, 0.7, 1.3]);
      for (const claw of [-1, 0, 1]) b.place(leg, b.cone(0.03, 0.1, 4), bone, [claw * 0.07, -0.53, 0.26], null, [Math.PI / 2, 0, 0]);
      legs.push(leg);
    }
  }

  const tail = [];
  let tailParent = pivot(body, 0, 0.1, -0.92);
  [0.07, 0.06, 0.05].forEach((radius, index) => {
    const segment = index === 0 ? tailParent : pivot(tailParent, 0, 0, -0.36);
    b.place(segment, b.cylinder(radius * 0.8, radius, 0.38, 4), fur, [0, 0, -0.18], null, [-Math.PI / 2, 0, 0]);
    tail.push(segment);
    tailParent = segment;
  });
  b.place(pivot(tailParent, 0, 0, -0.36), b.octa(0.16), ray, [0, 0, -0.1], [0.8, 0.8, 1.5]);

  group.userData.animate = (seconds, enemy) => {
    const phase = enemy.phase || 0;
    const beat = Math.sin(seconds * 3.2 + phase);
    for (const { wing, side } of wings) {
      wing.rotation.x = -0.45;
      wing.rotation.z = side * (0.3 + beat * 0.3);
      wing.rotation.y = side * (-0.35 - beat * 0.12);
    }
    body.position.y = 1.3 + Math.sin(seconds * 3.2 + phase - 1.2) * 0.07;
    body.rotation.x = -0.16;
    mane.rotation.z = seconds * 0.35 + phase;
    const roar = Math.pow(Math.max(0, Math.sin(seconds * 0.8 + phase)), 3);
    jaw.rotation.x = 0.06 + roar * 0.6;
    head.rotation.x = 0.2 - roar * 0.3;
    head.rotation.y = Math.sin(seconds * 0.9 + phase) * 0.22;
    legs.forEach((leg, index) => {
      // Front paws reach forward, hind legs trail, and all four paddle the air.
      const front = index % 2 === 0;
      leg.rotation.x = (front ? -0.5 : 0.55) + Math.sin(seconds * 2.4 + phase + index * 1.6) * 0.22;
    });
    tail.forEach((segment, index) => {
      segment.rotation.x = index === 0 ? 0.5 : 0.25;
      segment.rotation.y = Math.sin(seconds * 2.2 + phase - index * 0.8) * 0.28;
    });
  };
  group.userData.animate(0, {});
  return group;
}

// Glacial Titan — a broad ice golem with crystal shards growing from its shoulders and brow.
export function buildGlacialTitan(type, kit) {
  const b = builder(kit);
  const ice = kit.mat(mix(type.body, type.trim, 0.4));
  const iceDark = kit.mat(mix(type.body, type.trim, 0.15));
  const frost = kit.mat(type.trim);
  const crystal = kit.glow(type.trim, 0.4);
  const eyeGlow = kit.glow(type.eye, 1.7);
  const group = new THREE.Group();

  const torso = pivot(group, 0, 1.36, 0);
  b.place(torso, b.ico(0.7, 0), ice, [0, 0, 0], [1.3, 1, 0.85], [0.2, 0.3, 0]);
  b.place(torso, b.ico(0.4, 0), frost, [0, -0.1, 0.34], [1.1, 0.9, 0.5]);
  const head = pivot(torso, 0, 0.7, 0.1);
  b.place(head, b.dodeca(0.3), frost, [0, 0, 0], [1.2, 0.9, 1], [0.3, 0.5, 0]);
  b.place(head, b.box(0.5, 0.08, 0.2), iceDark, [0, 0.08, 0.22], null, [0.3, 0, 0]);
  for (const side of [-1, 1]) b.place(head, b.octa(0.07), eyeGlow, [side * 0.13, -0.01, 0.27], [1.4, 0.7, 1]);
  [[-0.14, 0.34, 0.25], [0, 0.48, 0], [0.14, 0.36, -0.25]].forEach(([x, height, tilt]) => {
    b.place(head, b.cone(0.07, height, 4), crystal, [x, 0.22 + height / 2, 0], null, [0, 0, -tilt]);
  });
  const limbs = {};
  for (const [name, side] of [['Left', -1], ['Right', 1]]) {
    b.place(torso, b.dodeca(0.34), frost, [side * 0.9, 0.4, 0], null, [side * 0.4, 0.2, 0.3]);
    [[0.0, 0.7, 0.1], [0.2, 0.5, 0.5], [-0.16, 0.44, -0.3]].forEach(([dx, height, tilt]) => {
      b.place(torso, b.cone(0.11, height, 4), crystal, [side * (0.9 + dx), 0.62 + height / 2, 0], null, [0, 0, side * -tilt]);
    });
    const arm = pivot(group, side * 0.96, 1.58, 0);
    b.place(arm, b.cylinder(0.16, 0.2, 0.56, 5), ice, [0, -0.32, 0]);
    b.place(arm, b.ico(0.32, 0), frost, [0, -0.82, 0.05]);
    limbs[`arm${name}`] = arm;
    const leg = pivot(group, side * 0.36, 0.72, 0);
    b.place(leg, b.cylinder(0.2, 0.24, 0.5, 5), iceDark, [0, -0.26, 0]);
    b.place(leg, b.dodeca(0.27), ice, [0, -0.58, 0.08], [1, 0.5, 1.4]);
    limbs[`leg${name}`] = leg;
  }

  group.userData.animate = (seconds, enemy) => {
    const phase = enemy.phase || 0;
    const step = seconds * 3.6 + phase;
    limbs.legLeft.rotation.x = Math.sin(step) * 0.32;
    limbs.legRight.rotation.x = -Math.sin(step) * 0.32;
    limbs.armLeft.rotation.x = -Math.sin(step) * 0.36;
    limbs.armRight.rotation.x = Math.sin(step) * 0.36;
    torso.rotation.z = Math.sin(step) * 0.05;
    head.rotation.y = Math.sin(seconds * 1.0 + phase) * 0.18;
  };
  group.userData.animate(0, {});
  return group;
}

// Magma Sovereign — a molten king cobra: rock coils, a reared neck with a flared hood,
// glowing belly seams, a crown of lava-tipped spikes and a flickering tongue.
export function buildMagmaSovereign(type, kit) {
  const b = builder(kit);
  const rock = kit.mat(mix(type.body, 0x8a5a40, 0.42));
  const rockDark = kit.mat(mix(type.body, 0x8a5a40, 0.18));
  const belly = kit.mat(mix(type.trim, 0x8a4a2a, 0.55));
  const lava = kit.glow(type.trim, 1.5);
  const bone = kit.mat(BONE);
  const eyeGlow = kit.glow(type.eye, 1.8);
  const group = new THREE.Group();

  const flat = [Math.PI / 2, 0, 0];
  b.place(group, b.ring(0.8, 0.27, 10), rockDark, [0, 0.27, 0], null, flat);
  b.place(group, b.ring(0.56, 0.25, 9), rock, [0.06, 0.66, -0.04], null, [Math.PI / 2, 0, 0.4]);
  b.place(group, b.ring(0.8, 0.05, 10), lava, [0, 0.47, 0], [1.16, 1.16, 1], flat);

  const tail = [];
  let tailParent = pivot(group, 0.7, 0.24, 0.62);
  [0.2, 0.14, 0.09].forEach((radius, index) => {
    const segment = index === 0 ? tailParent : pivot(tailParent, 0.4, 0, 0);
    b.place(segment, b.cylinder(radius * 0.7, radius, 0.44, 5), rockDark, [0.2, 0, 0], null, [0, 0, -Math.PI / 2]);
    tail.push(segment);
    tailParent = segment;
  });
  b.place(pivot(tailParent, 0.4, 0, 0), b.octa(0.11), lava, [0.04, 0, 0], [1.6, 0.8, 0.8]);

  // The neck is a chain of segments, each hinged on the one below so the whole column can sway.
  const neck = [];
  let neckParent = pivot(group, 0, 0.78, -0.12);
  [0.27, 0.25, 0.23, 0.21].forEach((radius, index) => {
    const segment = index === 0 ? neckParent : pivot(neckParent, 0, 0.4, 0);
    b.place(segment, b.cylinder(radius * 0.92, radius, 0.46, 6), rock, [0, 0.2, 0]);
    b.place(segment, b.box(radius * 1.25, 0.3, 0.08), belly, [0, 0.2, radius * 0.86]);
    b.place(segment, b.box(radius * 1.3, 0.045, 0.06), lava, [0, 0.4, radius * 0.88]);
    neck.push(segment);
    neckParent = segment;
  });
  const hood = pivot(neck[2], 0, 0.3, -0.08);
  b.place(hood, b.ico(0.56, 1), rockDark, [0, 0.1, 0], [1.5, 1.25, 0.2]);
  for (const side of [-1, 1]) {
    b.place(hood, b.box(0.07, 0.5, 0.05), lava, [side * 0.42, 0.14, 0.1], null, [0, 0, side * 0.3]);
    b.place(hood, b.box(0.06, 0.3, 0.05), lava, [side * 0.62, 0.12, 0.08], null, [0, 0, side * 0.5]);
  }

  const head = pivot(neckParent, 0, 0.42, 0);
  b.place(head, b.ico(0.3, 1), rock, [0, 0.06, 0.16], [1.1, 0.72, 1.4]);
  b.place(head, b.box(0.3, 0.12, 0.3), rock, [0, 0.0, 0.5]);
  for (const side of [-1, 1]) {
    b.place(head, b.box(0.2, 0.06, 0.16), rockDark, [side * 0.18, 0.2, 0.34], null, [0.15, 0, side * -0.3]);
    b.place(head, b.box(0.16, 0.06, 0.05), eyeGlow, [side * 0.21, 0.1, 0.43], null, [0, side * 0.5, side * 0.25]);
    b.place(head, b.cone(0.035, 0.2, 4), bone, [side * 0.1, -0.14, 0.56], null, [Math.PI, 0, 0]);
  }
  [[-0.24, 0.26, 0.5], [-0.12, 0.34, 0.22], [0, 0.42, 0], [0.12, 0.34, -0.22], [0.24, 0.26, -0.5]].forEach(([x, height, tilt]) => {
    b.place(head, b.cone(0.07, height, 4), rockDark, [x, 0.22 + height / 2, 0.02], null, [-0.2, 0, tilt]);
    b.place(head, b.octa(0.04), lava, [x - tilt * 0.16, 0.25 + height, -0.06]);
  });
  const jaw = pivot(head, 0, -0.06, 0.12);
  b.place(jaw, b.box(0.26, 0.07, 0.44), rockDark, [0, -0.04, 0.26]);
  const tongue = pivot(jaw, 0, 0.02, 0.4);
  b.place(tongue, b.box(0.04, 0.02, 0.3), lava, [0, 0, 0.15]);
  for (const side of [-1, 1]) b.place(tongue, b.box(0.03, 0.02, 0.14), lava, [side * 0.04, 0, 0.35], null, [0, side * 0.45, 0]);

  const lean = [-0.4, 0.05, 0.3, 0.3];
  group.userData.animate = (seconds, enemy) => {
    const phase = enemy.phase || 0;
    neck.forEach((segment, index) => {
      segment.rotation.x = lean[index] + Math.sin(seconds * 1.3 + phase - index * 0.5) * 0.06;
      segment.rotation.z = Math.sin(seconds * 1.6 + phase - index * 0.7) * 0.12;
    });
    head.rotation.x = -0.05 + Math.sin(seconds * 1.3 + phase) * 0.08;
    head.rotation.y = Math.sin(seconds * 0.9 + phase) * 0.3;
    hood.scale.x = 1 + Math.sin(seconds * 1.8 + phase) * 0.07;
    // A hiss every few seconds: the jaw drops and the tongue darts out.
    const hiss = Math.pow(Math.max(0, Math.sin(seconds * 1.1 + phase)), 4);
    jaw.rotation.x = 0.1 + hiss * 0.5;
    tongue.scale.z = 0.35 + hiss * 0.9 + Math.sin(seconds * 14 + phase) * 0.08;
    tail.forEach((segment, index) => {
      segment.rotation.y = 0.5 + Math.sin(seconds * 2.4 + phase - index * 0.9) * 0.25;
      segment.rotation.z = index === 2 ? 0.5 : 0.08;
    });
  };
  group.userData.animate(0, {});
  return group;
}

// Void Specter — a tall hooded phantom with a glowing face-void, trailing tentacles and orbiting wisps.
export function buildVoidSpecter(type, kit) {
  const b = builder(kit);
  const shroud = kit.mat(mix(type.body, 0x3a3560, 0.6));
  const shroudDark = kit.mat(mix(type.body, 0x3a3560, 0.3));
  const voidDark = kit.mat(0x030208);
  const edge = kit.glow(type.trim, 1.3);
  const eyeGlow = kit.glow(type.eye, 1.9);
  const group = new THREE.Group();

  const robe = pivot(group, 0, 0, 0);
  b.place(robe, b.cone(0.52, 1.7, 6), shroud, [0, 1.3, 0]);
  b.place(robe, b.cone(0.74, 0.56, 6), shroudDark, [0, 0.66, 0], null, [0, 0.5, 0]);
  b.place(robe, b.ring(0.68, 0.028, 6), edge, [0, 0.42, 0], null, [Math.PI / 2, 0, 0.52]);
  b.place(robe, b.box(0.04, 1.2, 0.03), edge, [0, 1.3, 0.3], null, [-0.29, 0, 0]);
  const tentacles = [];
  for (let index = 0; index < 5; index += 1) {
    const angle = (index / 5) * Math.PI * 2;
    const tentacle = pivot(robe, Math.cos(angle) * 0.4, 0.42, Math.sin(angle) * 0.4);
    b.place(tentacle, b.cone(0.07, 0.7, 4), shroudDark, [0, -0.35, 0], null, [Math.PI, 0, 0]);
    tentacles.push(tentacle);
  }
  const hood = pivot(group, 0, 2.22, 0);
  b.place(hood, b.ico(0.42, 1), shroud, [0, 0, 0], [1, 1.15, 1]);
  b.place(hood, b.cone(0.24, 0.5, 5), shroudDark, [0, 0.5, -0.16], null, [-0.6, 0, 0]);
  b.place(hood, b.ico(0.3, 0), voidDark, [0, -0.05, 0.2], [1, 1.1, 0.5]);
  for (const side of [-1, 1]) b.place(hood, b.octa(0.08), eyeGlow, [side * 0.12, 0.0, 0.35], [1.2, 0.8, 0.8], [0, 0, side * 0.3]);
  const arms = [];
  for (const side of [-1, 1]) {
    const arm = pivot(group, side * 0.36, 1.85, 0.1);
    b.place(arm, b.cylinder(0.03, 0.06, 0.8, 4), shroudDark, [0, -0.36, 0.14], null, [-0.4, 0, 0]);
    for (const claw of [-1, 0, 1]) b.place(arm, b.cone(0.02, 0.16, 3), edge, [claw * 0.04, -0.8, 0.32], null, [Math.PI + 0.4, 0, 0]);
    arms.push(arm);
  }
  const wisps = pivot(group, 0, 1.95, 0);
  for (const side of [-1, 1]) b.place(wisps, b.octa(0.1), edge, [side * 0.78, 0, 0]);

  group.userData.animate = (seconds, enemy) => {
    const phase = enemy.phase || 0;
    tentacles.forEach((tentacle, index) => {
      tentacle.rotation.x = Math.sin(seconds * 2.2 + phase + index * 1.3) * 0.35;
      tentacle.rotation.z = Math.cos(seconds * 1.9 + phase + index * 1.3) * 0.35;
    });
    wisps.rotation.y = seconds * 1.8 + phase;
    wisps.position.y = 1.95 + Math.sin(seconds * 2.4 + phase) * 0.12;
    hood.rotation.x = Math.sin(seconds * 1.1 + phase) * 0.1;
    hood.rotation.z = Math.sin(seconds * 0.8 + phase) * 0.08;
    arms[0].rotation.x = Math.sin(seconds * 1.7 + phase) * 0.25;
    arms[1].rotation.x = -Math.sin(seconds * 1.7 + phase) * 0.25;
    robe.scale.x = 1 + Math.sin(seconds * 2.6 + phase) * 0.03;
  };
  group.userData.animate(0, {});
  return group;
}

// A fan of long feathers with a serrated edge, for the Arbiter. `side` is -1 for the left wing.
function featherWingGeometry(side, length) {
  const point = (x, y, z = 0) => new THREE.Vector3(x * -side, y, z);
  const shoulder = point(0, 0);
  const tips = [];
  const feathers = 6;
  for (let index = 0; index <= feathers; index += 1) {
    const angle = 1.75 - index * 0.36;
    const reach = length * (1 - index * 0.07);
    tips.push(point(-Math.sin(angle) * reach, Math.cos(angle) * reach * -1 + reach * 0.15, -index * 0.03));
  }
  const positions = [];
  for (let index = 0; index < feathers; index += 1) {
    const notch = tips[index].clone().add(tips[index + 1]).multiplyScalar(0.5).lerp(shoulder, 0.32);
    for (const vertex of [shoulder, tips[index], notch, shoulder, notch, tips[index + 1]]) positions.push(vertex.x, vertex.y, vertex.z);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.computeVertexNormals();
  return geometry;
}

// Celestial Arbiter — an angelic judge: pale robe, gold breastplate, feathered wings and a spinning halo.
export function buildCelestialArbiter(type, kit) {
  const b = builder(kit);
  const robe = kit.mat(mix(type.body, 0xc8d0e8, 0.35));
  const robeShade = kit.mat(mix(type.body, 0x9aa6c8, 0.5));
  const gold = kit.mat(type.trim);
  const feather = kit.mat(mix(type.body, 0xffffff, 0.2), { side: THREE.DoubleSide });
  const featherGold = kit.mat(mix(type.trim, 0xffffff, 0.25), { side: THREE.DoubleSide });
  const halo = kit.glow(type.trim, 1.4);
  const eyeGlow = kit.glow(type.eye, 1.9);
  const group = new THREE.Group();

  b.place(group, b.cone(0.52, 1.6, 7), robe, [0, 1.0, 0]);
  b.place(group, b.cone(0.66, 0.5, 7), robeShade, [0, 0.45, 0], null, [0, 0.4, 0]);
  b.place(group, b.ico(0.34, 0), gold, [0, 1.66, 0.1], [1.25, 1, 0.6]);
  b.place(group, b.box(0.1, 0.9, 0.04), gold, [0, 1.0, 0.36], null, [-0.3, 0, 0]);
  const head = pivot(group, 0, 2.16, 0);
  b.place(head, b.ico(0.26, 1), robe, [0, 0, 0]);
  b.place(head, b.cone(0.2, 0.3, 6), gold, [0, 0.2, -0.04], [1, 1, 1]);
  for (const side of [-1, 1]) b.place(head, b.octa(0.055), eyeGlow, [side * 0.1, 0.0, 0.23], [1.4, 0.6, 0.8]);
  const haloRing = pivot(group, 0, 2.68, -0.04);
  b.place(haloRing, b.ring(0.36, 0.035, 10), halo, [0, 0, 0], null, [Math.PI / 2 - 0.25, 0, 0]);
  const arms = [];
  const wings = [];
  for (const side of [-1, 1]) {
    const arm = pivot(group, side * 0.42, 1.82, 0);
    b.place(arm, b.cylinder(0.06, 0.075, 0.62, 5), robeShade, [0, -0.28, 0.05]);
    b.place(arm, b.octa(0.1), gold, [0, -0.62, 0.08], [0.9, 1.2, 0.9]);
    arms.push(arm);
    const wing = pivot(group, side * 0.3, 1.9, -0.22);
    wing.add(kit.mesh(featherWingGeometry(side, 2.1), feather));
    const inner = kit.mesh(featherWingGeometry(side, 1.3), featherGold);
    inner.position.z = 0.04;
    wing.add(inner);
    wings.push({ wing, side });
  }

  group.userData.animate = (seconds, enemy) => {
    const phase = enemy.phase || 0;
    const beat = Math.sin(seconds * 2.6 + phase);
    for (const { wing, side } of wings) {
      wing.rotation.z = side * (0.1 + beat * 0.22);
      wing.rotation.y = side * (-0.25 - beat * 0.15);
    }
    haloRing.rotation.y = seconds * 1.4 + phase;
    haloRing.position.y = 2.68 + Math.sin(seconds * 2 + phase) * 0.04;
    arms[0].rotation.x = -0.2 + Math.sin(seconds * 1.3 + phase) * 0.15;
    arms[1].rotation.x = -0.2 - Math.sin(seconds * 1.3 + phase) * 0.15;
    arms[0].rotation.z = -0.25;
    arms[1].rotation.z = 0.25;
    head.rotation.x = Math.sin(seconds * 0.9 + phase) * 0.08;
  };
  group.userData.animate(0, {});
  return group;
}

// Phantom Rift — a floating crystal with a glowing lattice around it and a ring of shards in orbit.
export function buildPhantomRift(type, kit) {
  const b = builder(kit);
  const core = kit.mat(mix(type.body, type.trim, 0.3));
  const coreDark = kit.mat(mix(type.body, type.trim, 0.1));
  const shard = kit.glow(type.trim, 1.2);
  const lattice = kit.glow(type.trim, 1.5, { wireframe: true });
  const eyeGlow = kit.glow(0xffffff, 1.6);
  const group = new THREE.Group();

  const crystal = pivot(group, 0, 1.55, 0);
  b.place(crystal, b.octa(0.75), core, [0, 0, 0], [0.8, 1.5, 0.8]);
  for (const side of [-1, 1]) b.place(crystal, b.octa(0.08), eyeGlow, [side * 0.18, 0.12, 0.44], [1.4, 0.7, 0.6], [0, 0, side * 0.35]);
  b.place(group, b.cone(0.16, 0.5, 4), coreDark, [0, 0.2, 0], null, [Math.PI, 0, 0]);
  const cage = pivot(group, 0, 1.55, 0);
  b.place(cage, b.octa(0.92), lattice, [0, 0, 0], [0.8, 1.5, 0.8]);
  const orbit = pivot(group, 0, 1.55, 0);
  orbit.rotation.x = 0.35;
  for (let index = 0; index < 8; index += 1) {
    const angle = (index / 8) * Math.PI * 2;
    b.place(orbit, b.octa(index % 2 === 0 ? 0.13 : 0.09), shard, [Math.cos(angle) * 1.15, 0, Math.sin(angle) * 1.15], [1, 1.6, 1]);
  }

  group.userData.animate = (seconds, enemy) => {
    const phase = enemy.phase || 0;
    orbit.rotation.y = seconds * 1.3 + phase;
    orbit.rotation.x = 0.35 + Math.sin(seconds * 0.7 + phase) * 0.2;
    cage.rotation.y = -seconds * 0.6 + phase;
    const pulse = 1 + Math.sin(seconds * 3 + phase) * 0.05;
    crystal.scale.set(pulse, pulse, pulse);
    crystal.rotation.y = Math.sin(seconds * 0.9 + phase) * 0.25;
  };
  group.userData.animate(0, {});
  return group;
}

// Stellar Dreadnought — a hulking star knight in dark plate: crested helm with a glowing
// visor, a star on the breastplate, a hexagonal shield, a morning star and a cape.
export function buildStellarDreadnought(type, kit) {
  const b = builder(kit);
  const plate = kit.mat(mix(type.body, 0x4a5a7c, 0.6));
  const plateDark = kit.mat(mix(type.body, 0x4a5a7c, 0.3));
  const gold = kit.mat(type.trim);
  const cloth = kit.mat(tone(type.trim, 0.5), { side: THREE.DoubleSide });
  const eyeGlow = kit.glow(type.eye, 1.8);
  const lamp = kit.glow(type.trim, 1.3);
  const group = new THREE.Group();

  b.place(group, b.cylinder(0.44, 0.5, 0.32, 6), plateDark, [0, 1.02, 0], [1, 1, 0.75]);
  b.place(group, b.box(0.98, 0.09, 0.74), gold, [0, 1.16, 0]);
  b.place(group, b.box(0.3, 0.42, 0.08), plate, [0, 0.82, 0.36], null, [-0.12, 0, 0]);

  const torso = pivot(group, 0, 1.22, 0);
  b.place(torso, b.ico(0.62, 1), plate, [0, 0.42, 0], [1.2, 1.02, 0.85]);
  b.place(torso, b.cylinder(0.3, 0.36, 0.2, 6), gold, [0, 0.9, 0.02]);
  // A four-pointed star on the breastplate.
  b.place(torso, b.octa(0.14), lamp, [0, 0.45, 0.52], [0.5, 2, 0.3]);
  b.place(torso, b.octa(0.14), lamp, [0, 0.45, 0.52], [1.6, 0.5, 0.3]);
  const cape = pivot(torso, 0, 0.82, -0.42);
  b.place(cape, b.cylinder(0.5, 0.82, 1.6, 5), cloth, [0, -0.78, -0.04], [1, 1, 0.14]);

  const head = pivot(torso, 0, 0.96, 0.05);
  b.place(head, b.cylinder(0.26, 0.3, 0.42, 6), plate, [0, 0.2, 0]);
  b.place(head, b.ico(0.28, 0), plateDark, [0, 0.42, 0], [1, 0.7, 1]);
  b.place(head, b.box(0.38, 0.06, 0.05), eyeGlow, [0, 0.26, 0.27]);
  b.place(head, b.box(0.05, 0.22, 0.05), gold, [0, 0.12, 0.29]);
  [[0.24, 0.3], [0.02, 0.4], [-0.2, 0.3]].forEach(([z, height]) => {
    b.place(head, b.cone(0.09, height, 4), gold, [0, 0.56 + height / 2, z], [0.5, 1, 1.3], [-0.25, 0, 0]);
  });

  const limbs = {};
  for (const [name, side] of [['Left', -1], ['Right', 1]]) {
    b.place(torso, b.ico(0.34, 0), plateDark, [side * 0.84, 0.76, 0], [1.1, 0.8, 1.1]);
    b.place(torso, b.cone(0.1, 0.34, 4), gold, [side * 0.92, 1.06, 0], null, [0, 0, side * -0.35]);
    const arm = pivot(group, side * 0.88, 1.92, 0);
    b.place(arm, b.cylinder(0.15, 0.17, 0.52, 5), plate, [0, -0.3, 0]);
    b.place(arm, b.ico(0.2, 0), gold, [0, -0.68, 0.05]);
    limbs[`arm${name}`] = arm;
    const leg = pivot(group, side * 0.3, 0.96, 0);
    b.place(leg, b.cylinder(0.2, 0.17, 0.46, 5), plate, [0, -0.22, 0]);
    b.place(leg, b.ico(0.14, 0), gold, [0, -0.46, 0.12]);
    b.place(leg, b.cylinder(0.16, 0.2, 0.4, 5), plateDark, [0, -0.66, 0]);
    b.place(leg, b.box(0.34, 0.16, 0.5), plate, [0, -0.88, 0.08]);
    limbs[`leg${name}`] = leg;
  }

  const shield = pivot(limbs.armLeft, -0.05, -0.62, 0.3);
  b.place(shield, b.cylinder(0.56, 0.56, 0.06, 6), gold, [0, 0, 0], [0.86, 1, 1.3], [Math.PI / 2, 0, 0]);
  b.place(shield, b.cylinder(0.5, 0.5, 0.1, 6), plateDark, [0, 0, 0.02], [0.86, 1, 1.3], [Math.PI / 2, 0, 0]);
  b.place(shield, b.octa(0.13), lamp, [0, 0, 0.1], [0.5, 2.2, 0.3]);
  b.place(shield, b.octa(0.13), lamp, [0, 0, 0.1], [1.7, 0.5, 0.3]);

  const mace = pivot(limbs.armRight, 0, -0.68, 0.08);
  mace.rotation.x = 0.9;
  b.place(mace, b.cylinder(0.04, 0.05, 1.1, 5), plateDark, [0, 0.4, 0]);
  b.place(mace, b.ico(0.22, 0), gold, [0, 1.02, 0]);
  for (const direction of [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, 0, 1], [0, 0, -1], [0.7, 0.7, 0], [-0.7, 0.7, 0]]) {
    const aim = new THREE.Vector3(...direction).normalize();
    const spike = b.place(mace, b.cone(0.07, 0.26, 4), lamp, [aim.x * 0.28, 1.02 + aim.y * 0.28, aim.z * 0.28]);
    spike.quaternion.setFromUnitVectors(UP, aim);
  }

  group.userData.animate = (seconds, enemy) => {
    const phase = enemy.phase || 0;
    const step = seconds * 3.2 + phase;
    limbs.legLeft.rotation.x = Math.sin(step) * 0.3;
    limbs.legRight.rotation.x = -Math.sin(step) * 0.3;
    torso.rotation.z = Math.sin(step) * 0.04;
    torso.rotation.y = Math.sin(step) * 0.06;
    head.rotation.y = Math.sin(seconds * 0.8 + phase) * 0.3;
    // The shield stays braced in front; the mace arm winds up, then swings down.
    limbs.armLeft.rotation.x = -0.55 + Math.sin(step) * 0.05;
    limbs.armLeft.rotation.z = -0.12;
    const swing = Math.sin(seconds * 1.6 + phase);
    limbs.armRight.rotation.x = -0.5 - (swing > 0 ? swing * 0.9 : swing * 0.25);
    limbs.armRight.rotation.z = 0.22;
    cape.rotation.x = 0.16 + Math.sin(step + 0.6) * 0.07;
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
