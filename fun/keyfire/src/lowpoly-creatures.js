// lowpoly-creatures.js — faceted, flat-shaded monsters. Each is a handful of simple
// solids on pivots, plus an animate(seconds, enemy) function that moves the pivots.
import * as THREE from 'three';
import { roundSides, polyDetail } from './detail.js?v=19';

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

// A cut stone, leaf or plate with an authored outline. Both sides taper from the
// rim to a ridge, so even a thin piece keeps its facets when it turns in profile.
function cutFacet(outline, ridge = [0, 0, 0.55]) {
  const vertices = [];
  const clockwise = THREE.ShapeUtils.isClockWise(outline.map(([x, y]) => new THREE.Vector2(x, y)));
  const points = clockwise ? outline.slice().reverse() : outline;
  for (let i = 0; i < points.length; i++) {
    const a = points[i], b = points[(i + 1) % points.length];
    vertices.push(...a, 0, ...b, 0, ...ridge, ...b, 0, ...a, 0, ridge[0], ridge[1], -ridge[2] * 0.55);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.computeVertexNormals();
  return geometry;
}

const LEAF = [[0, -1], [-0.62, -0.14], [-0.56, 0.6], [-0.14, 0.94], [0.24, 1.12], [0.64, 0.25], [0.48, -0.38]];
const SCUTE = [[0, -1], [-0.91, -0.15], [-1, 0.53], [-0.55, 0.88], [0.58, 0.8], [1, 0.38], [0.8, -0.3]];

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
  const rounder = (sides) => roundSides(sides);
  return {
    place,
    ico: (radius, detail = 0) => new THREE.IcosahedronGeometry(radius, polyDetail(detail + 1)),
    octa: (radius) => new THREE.OctahedronGeometry(radius, 0),
    cone: (radius, height, sides = 4) => new THREE.ConeGeometry(radius, height, rounder(sides)),
    cylinder: (top, bottom, height, sides = 5) => new THREE.CylinderGeometry(top, bottom, height, rounder(sides)),
    box: (x, y, z) => new THREE.BoxGeometry(x, y, z),
    dodeca: (radius) => new THREE.DodecahedronGeometry(radius, 0),
    ring: (radius, tube, sides = 8) => new THREE.TorusGeometry(radius, tube, roundSides(6, 1, 1.5), rounder(sides)),
  };
}

// Mudlug — a squat toad goblin: wide flat head, scowling brow, fangs, pointed ears.
function buildMudlug(type, kit) {
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
  // Spreading cheek frills give the toad a broad, low silhouette.
  for (const side of [-1, 1]) {
    const fin = cutFacet([[0,-0.16],[0.4,-0.26],[0.35,-0.07],[0.62,0.08],[0.39,0.14],[0.56,0.4],[0.13,0.31],[0,0.16]], [0.18,0.07,0.12]);
    b.place(head, fin, belly, [side * 0.37, 0, 0.09], [side, 1, 1], [0, side * 0.32, 0]);
    b.place(torso, cutFacet(LEAF), bodyDark, [side * 0.29, 0.83, -0.23], [0.39, 0.48, 0.41], [-0.9, 0, -side * 0.46]);
  }
  const eyes = pivot(head, 0, 0, 0);
  for (const side of [-1, 1]) {
    b.place(head, b.ico(0.2, 0), body, [side * 0.3, 0.26, 0.16]);
    b.place(eyes, b.ico(0.13, 0), eyeGlow, [side * 0.3, 0.27, 0.3]);
    b.place(head, b.octa(0.055), dark, [side * 0.28, 0.26, 0.42]);
    b.place(head, b.box(0.36, 0.08, 0.24), bodyDark, [side * 0.31, 0.375, 0.27], null, [0.25, 0, side * 0.25]);
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
function buildCrimsonBulwark(type, kit) {
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
  // Broad sweep-back cheek plates frame the dragon's head against its wings.
  for (const side of [-1, 1]) {
    for (let i = 0; i < 3; i++) {
      b.place(head, cutFacet(LEAF), i === 1 ? crest : plate, [side * (0.26 + i * 0.075), 0.12 - i * 0.11, -i * 0.055],
        [0.18, 0.43 - i * 0.045, 0.19], [-0.35, side * 0.3, -side * (0.68 + i * 0.35)]);
    }
    b.place(body, cutFacet(SCUTE), crest, [side * 0.58, 0.36, 0.22], [0.47, 0.34, 0.47], [-0.4, side * 0.4, side * 0.32]);
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
function buildGlowmite(type, kit) {
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
  const covers = [];
  for (const side of [-1, 1]) {
    const cover = pivot(abdomen, side * 0.08, 0.19, 0.04);
    b.place(cover, cutFacet(LEAF), shell, [side * 0.21, 0, -0.29], [0.37, 0.62, 0.32], [-1.23, 0, side * 0.19]);
    b.place(cover, cutFacet(LEAF), lamp, [side * 0.34, 0.12, -0.38], [0.11, 0.26, 0.13], [-1.24, 0, side * 0.19]);
    covers.push(cover);
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
    const lift = enemy.flier ? 0.74 : 0.12;
    covers[0].rotation.z = lift + Math.sin(step * 0.6) * 0.08;
    covers[1].rotation.z = -covers[0].rotation.z;
    const pulse = 1 + Math.sin(seconds * 4 + phase) * 0.06;
    abdomen.scale.set(pulse, pulse, pulse);
    head.rotation.y = Math.sin(seconds * 2.3 + phase) * 0.25;
  };
  group.userData.animate(0, {});
  return group;
}

// Ash Oaf — a heavy stone golem: boulder torso, head sunk between its shoulders, rock fists.
function buildAshOaf(type, kit) {
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
  // Stacked basalt shelves split at the glowing fault beneath the left shoulder.
  for (let layer = 0; layer < 3; layer++) {
    b.place(torso, cutFacet(SCUTE), layer === 1 ? rock : rockLight,
      [-0.64 - layer * 0.085, 0.49 - layer * 0.14, 0.02], [0.52 - layer * 0.05, 0.26, 0.65], [-0.37, -0.36, 0.3]);
  }
  b.place(torso, cutFacet(SCUTE), rockDark, [0.29, 0.02, 0.44], [0.43, 0.48, 0.31], [0, 0.3, -0.24]);
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
function buildCinderImp(type, kit) {
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
  head.scale.set(1.2, 1.03, 1.07);
  for (const side of [-1, 1]) {
    const horn = cutFacet([[0,0],[-0.06,0.18],[0.09,0.43],[0.35,0.68],[0.27,0.35],[0.2,0.02]], [0.12,0.22,0.13]);
    b.place(head, horn, accent, [side * 0.16, 0.18, -0.03], [side, 1, 1]);
    b.place(torso, cutFacet(SCUTE), skinDark, [side * 0.18, 0.18, 0.15], [0.23, 0.19, 0.24], [0, side * 0.3, side * 0.35]);
  }
  const limbs = {};
  for (const [name, side] of [['Left', -1], ['Right', 1]]) {
    const arm = pivot(group, side * 0.3, 0.98, 0);
    b.place(arm, b.dodeca(0.13), skin, [side * 0.03, -0.08, 0.02], [1, 1.45, 0.92]);
    b.place(arm, b.dodeca(0.12), skinDark, [side * 0.03, -0.37, 0.05], [0.91, 1.15, 0.84]);
    b.place(arm, b.cylinder(0.045, 0.055, 0.46, 4), skin, [0, -0.2, 0]);
    b.place(arm, b.cone(0.05, 0.12, 4), bone, [0, -0.47, 0.02], null, [Math.PI, 0, 0]);
    limbs[`arm${name}`] = arm;
    const leg = pivot(group, side * 0.14, 0.5, 0);
    b.place(leg, b.dodeca(0.11), skin, [0, -0.14, 0], [0.95, 1.55, 1.04]);
    b.place(leg, cutFacet(SCUTE), skinDark, [0, -0.39, 0.07], [0.095, 0.17, 0.13]);
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
function buildBogShambler(type, kit) {
  const b = builder(kit);
  const cloak = kit.mat(mix(type.body, type.trim, 0.3));
  const cloakDark = kit.mat(mix(type.body, type.trim, 0.1));
  const accent = kit.mat(type.trim);
  const voidDark = kit.mat(0x0d0716);
  const eyeGlow = kit.glow(type.eye, 1.6);
  const group = new THREE.Group();

  const moss = kit.mat(0x657650);
  for (const side of [-1, 1]) {
    const foot = pivot(group, side * 0.32, 0, side * 0.11);
    b.place(foot, b.dodeca(0.23), cloakDark, [0, 0.19, 0.12], [1.03, 0.75, 1.53]);
    b.place(foot, b.dodeca(0.24), cloak, [0, 0.42, -0.02], [0.81, 1.46, 0.97]);
  }
  const robe = pivot(group, 0, 0.96, 0);
  b.place(robe, b.dodeca(0.61), cloak, [0, 0.12, -0.05], [1.3, 1.05, 0.88], [0.2, 0.3, 0]);
  const head = pivot(robe, 0, 0.65, 0.28);
  b.place(head, cutFacet(SCUTE, [0, 0.44, 0.83]), cloakDark, [0, 0.02, 0.02], [0.41, 0.49, 0.61]);
  b.place(head, cutFacet(SCUTE), voidDark, [0, -0.02, 0.34], [0.29, 0.32, 0.18]);
  const arms = [];
  for (const side of [-1, 1]) {
    b.place(head, b.octa(0.09), eyeGlow, [side * 0.125, 0.055, 0.43], [1.2, 0.56, 0.4], [0, 0, side * 0.42]);
    b.place(robe, cutFacet(LEAF), cloakDark, [side * 0.31, -0.4, 0.19], [0.39, 0.52, 0.42], [0.1, side * 0.24, -side * 0.23]);
    const arm = pivot(robe, side * 0.61, 0.36, -0.02);
    b.place(arm, b.dodeca(0.31), accent, [side * 0.08, -0.04, 0], [1.25, 1, 1]);
    b.place(arm, cutFacet(LEAF), moss, [side * 0.13, 0, 0.19], [0.33, 0.43, 0.25], [0, side * 0.42, side * 0.2]);
    b.place(arm, b.cylinder(0.18, 0.13, 0.53, 5), cloak, [side * 0.08, -0.32, 0]);
    const elbow = pivot(arm, side * 0.08, -0.57, 0);
    b.place(elbow, b.dodeca(0.22), cloak, [0, -0.25, 0.03], [0.86, 1.65, 0.9]);
    b.place(elbow, b.dodeca(0.17), cloakDark, [0, -0.53, 0.08], [1.25, 0.78, 1]);
    for (let finger = -1; finger <= 1; finger++) {
      b.place(elbow, b.cone(0.058, 0.25, 4), accent, [finger * 0.095, -0.68, 0.13], null, [2.8, 0, finger * 0.16]);
    }
    arms.push({ arm, elbow });
  }
  group.userData.animate = (seconds, enemy) => {
    const step = Math.sin(seconds * 3.2 + (enemy.phase || 0));
    const climb = enemy.rail?.kind === 'climb' && enemy.rail.phase === 'entry'
      ? Math.sin(Math.PI * enemy.rail.t) : 0;
    robe.rotation.x = 0.18 + climb * 0.34;
    robe.rotation.z = step * 0.085;
    head.rotation.x = -0.12 - climb * 0.28;
    for (const [index, { arm, elbow }] of arms.entries()) {
      const side = index ? 1 : -1;
      const reach = index ? 0.42 : 1;
      arm.rotation.x = -0.24 + side * step * 0.32 - climb * reach * 1.9;
      arm.rotation.z = side * 0.2;
      elbow.rotation.x = -0.45 - side * step * 0.13 - climb * (1 - reach) * 1.3;
    }
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
  const ruby = pivot(group, 0, 1.42, 0);
  const heartCut = [[0,0.49],[-0.32,0.78],[-0.64,0.74],[-0.83,0.47],[-0.78,0.1],[-0.54,-0.26],[0,-0.9],[0.54,-0.26],[0.78,0.1],[0.83,0.47],[0.64,0.74],[0.32,0.78]];
  b.place(ruby, cutFacet(heartCut, [-0.06, 0.08, 0.42]), heart, [0, 0, 0]);
  b.place(ruby, b.box(0.42, 0.13, 0.07), cross, [0, 0.12, 0.41]);
  b.place(ruby, b.box(0.13, 0.42, 0.07), cross, [0, 0.12, 0.41]);
  const wings = [];
  for (const side of [-1, 1]) {
    const wing = pivot(ruby, side * 0.66, 0.17, -0.06);
    for (let i = 0; i < 3; i++) {
      b.place(wing, cutFacet(LEAF), i === 0 ? cross : highlight, [side * (0.27 - i * 0.045), 0.26 - i * 0.16, -i * 0.04],
        [0.15, 0.43 - i * 0.07, 0.13], [0, 0, -side * (0.86 + i * 0.23)]);
    }
    wings.push(wing);
  }
  group.userData.animate = (seconds, enemy) => {
    const t = seconds + (enemy.phase || 0);
    const beat = Math.max(0, Math.sin(t * 5)) ** 5;
    ruby.scale.setScalar(1 + beat * 0.07);
    wings[0].rotation.z = Math.sin(t * 6) * 0.2;
    wings[1].rotation.z = -wings[0].rotation.z;
  };
  return group;
}

// Verdant Colossus — a hunched ogre: a small tusked head sunk between huge shoulders, one
// horn snapped off, a spined hump, one arm swollen into a clawed fist that hangs to the
// ground, the other holding a spiked club over its shoulder.
function buildVerdantColossus(type, kit) {
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

  // A pollarded tree grows from the heavy shoulder, with long bronze-green leaves.
  const copperLeaf = kit.mat(0xbca458);
  for (const [x, y, dx] of [[-0.64,1.18,-0.58],[0.68,1.09,0.38]]) {
    const fork = [x + dx, y + 0.49, -0.12];
    b.bar(torso, wood, [x,y,-0.14], fork, 0.17, 0.085, 5);
    b.bar(torso, wood, fork, [x + dx * 1.35,y + 0.91,-0.16], 0.087, 0.025);
    b.bar(torso, wood, fork, [x + dx * 1.8,y + 0.62,-0.06], 0.077, 0.03);
    for (let i = 0; i < 3; i++) b.place(torso, cutFacet(LEAF), i === 1 ? copperLeaf : accent,
      [x + dx * (1.24 + 0.32 * i), y + 0.76 - i * 0.08, -0.08], [0.18, 0.3, 0.13], [0.12, 0.2, -Math.sign(x) * (0.38 + i * 0.35)]);
  }
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

// Glacial Titan — a hunched ice golem: a slit-eyed head sunk under a brow of shards, a
// cracked chest lit from inside, one shoulder overgrown with crystal, a boulder fist on
// one arm and a jagged ice blade for the other.
function buildGlacialTitan(type, kit) {
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

  // A glacier calving at one shoulder: tall sapphire prisms, tipped in milky ice.
  for (const [x,y,lean,height] of [[-0.68,1.17,0.42,0.74],[-0.91,1.03,0.75,0.64],[-1.08,0.92,1.02,0.46],[0.76,1.09,-0.5,0.43]]) {
    const shard = pivot(torso, x, y, -0.07);
    shard.rotation.z = lean;
    b.place(shard, b.cylinder(0.16, 0.22, height, 5), crystal, [0, height / 2, 0]);
    b.place(shard, b.cone(0.17, 0.27, 5), frost, [0, height + 0.13, 0]);
  }
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
function buildMagmaSovereign(type, kit) {
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

  // One tapering coil runs from the tail to the raised neck. Slightly uneven
  // radii leave a broken line of fire visible between turns.
  const spine = [];
  for (let i = 0; i <= 36; i++) {
    const t = i / 36;
    const angle = t * Math.PI * 4.4 + 0.7;
    const r = 0.99 - 0.63 * t + 0.055 * Math.sin(angle * 3);
    spine.push(new THREE.Vector3(r * Math.cos(angle), 0.28 + t * 0.71, r * Math.sin(angle) - 0.08 * t));
  }
  const coil = new THREE.CatmullRomCurve3(spine);
  b.place(group, new THREE.TubeGeometry(coil, 54, 0.29, 7, false), rock, [0,0,0]);
  const seam = pivot(group, 0, 0.02, 0);
  for (let i = 1; i < spine.length; i += 2) {
    const point = spine[i];
    const angle = Math.atan2(point.x, point.z);
    b.place(seam, cutFacet(SCUTE), i % 4 === 1 ? belly : lava,
      [point.x + 0.27 * Math.sin(angle), point.y, point.z + 0.27 * Math.cos(angle)],
      [0.19, 0.095, 0.075], [0, angle, 0.22]);
  }
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

  // A pair of furnace eyes cut into the cobra's hood, visible behind the real head.
  for (const side of [-1, 1]) {
    const eye = pivot(hood, side * 0.58, 0.31, 0.17);
    eye.rotation.z = side * 0.48;
    b.place(eye, cutFacet(SCUTE), belly, [0, 0, 0], [0.38, 0.31, 0.17]);
    b.place(eye, b.octa(0.2), lava, [0, 0, 0.1], [1.4, 0.7, 0.24]);
    b.place(eye, b.octa(0.13), rockDark, [0, 0, 0.15], [0.32, 0.91, 0.18]);
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
    seam.scale.setScalar(1 + rage * 0.024 + Math.sin(t * 2.8) * 0.012);
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
  // The gauntlet grips the shield from behind: the shield sits out along its own face
  // (it is tilted 0.96 about x) so the hand and forearm stay clear of the plate.
  const shield = pivot(arms[0].elbow, -0.08, -0.66, 0.443);
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

  // An eclipsed astrolabe rides behind the knight, its brass crescents turning
  // on the same axis as the star in the breastplate.
  const dial = pivot(torso, 0, 1.2, -0.46);
  for (const turn of [0.23, Math.PI + 0.23]) {
    const arc = new THREE.TorusGeometry(0.91, 0.045, 5, 16, Math.PI * 0.82);
    b.place(dial, arc, gold, [0, 0, 0], null, [0, 0, turn]);
    b.place(dial, b.octa(0.105), lamp, [0.91 * Math.cos(turn), 0.91 * Math.sin(turn), 0], [0.7, 1, 0.55]);
  }
  for (const side of [-1,1]) b.place(torso, cutFacet(SCUTE), plateDark, [side * 0.44, 0.62, 0.43],
    [0.36, 0.45, 0.32], [0, side * 0.36, side * 0.38]);
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
    dial.rotation.z = 0.15 * t + windup * 0.32;
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
  const wood = kit.mat(mix(type.body, 0x65403a, 0.84));
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

  for (const x of [-0.52, 0.52]) {
    b.place(group, b.box(0.1, 0.42, 0.09), gold, [x, 0.28, 0.44]);
    b.place(group, b.octa(0.045), woodDark, [x, 0.21, 0.498]);
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
  // Brass corner claws carry the coffer. Its eye-shaped lock moves with the jaw.
  for (const side of [-1, 1]) {
    for (const z of [-0.3, 0.32]) {
      b.place(group, cutFacet(SCUTE), woodDark, [side * 0.52, 0.13, z], [0.19, 0.18, 0.24], [0, side * 0.54, 0]);
      b.place(group, b.octa(0.13), gold, [side * 0.62, 0.055, z + 0.08], [1.1, 0.48, 1.4]);
    }
    b.place(lid, cutFacet(LEAF), gold, [side * 0.29, 0.13, 0.86], [0.16, 0.32, 0.12], [0.3, side * 0.18, -side * 0.94]);
  }
  b.place(lid, cutFacet(SCUTE), woodDark, [0, 0.03, 1.01], [0.19, 0.22, 0.11]);
  b.place(lid, b.octa(0.12), gem, [0, 0.055, 1.08], [1.25, 0.53, 0.5]);
  b.place(group, cutFacet(LEAF), kit.mat(0xa74870), [0.12, 0.58, 0.41], [0.18, 0.26, 0.14], [-1.18, 0, -0.25]);
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
  'Glacial Titan': buildGlacialTitan,
  'Magma Sovereign': buildMagmaSovereign,
  'Stellar Dreadnought': buildStellarDreadnought,
};
