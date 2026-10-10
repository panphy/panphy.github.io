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
  return {
    place,
    ico: (radius, detail = 0) => new THREE.IcosahedronGeometry(radius, detail),
    octa: (radius) => new THREE.OctahedronGeometry(radius, 0),
    cone: (radius, height, sides = 4) => new THREE.ConeGeometry(radius, height, sides),
    cylinder: (top, bottom, height, sides = 5) => new THREE.CylinderGeometry(top, bottom, height, sides),
    box: (x, y, z) => new THREE.BoxGeometry(x, y, z),
    dodeca: (radius) => new THREE.DodecahedronGeometry(radius, 0),
    ring: (radius, tube, sides = 8) => new THREE.TorusGeometry(radius, tube, 4, sides),
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

// Crimson Bulwark — a dragon with beating wings, swept horns, a plated belly,
// a jaw that swings open on a mouthful of fire, and a swaying tail.
export function buildCrimsonBulwark(type, kit) {
  const b = builder(kit);
  const bodyColor = mix(type.body, type.trim, 0.24);
  const body = kit.mat(bodyColor);
  const bodyDark = kit.mat(tone(bodyColor, 0.6));
  const trim = kit.mat(type.trim);
  const belly = kit.mat(mix(type.trim, 0xffd98a, 0.6));
  const membrane = kit.mat(mix(bodyColor, type.trim, 0.5), { side: THREE.DoubleSide });
  const bone = kit.mat(BONE);
  const eyeGlow = kit.glow(type.eye, 1.7);
  const fire = kit.glow(0xff8a2a, 1.6);
  const group = new THREE.Group();

  b.place(group, b.ico(0.62, 1), body, [0, 1.05, 0], [0.95, 1.2, 0.85]);
  b.place(group, b.ico(0.5, 1), belly, [0, 1.0, 0.3], [0.8, 1.15, 0.6]);
  for (const [y, z] of [[1.6, -0.36], [1.25, -0.5], [0.9, -0.46]]) {
    b.place(group, b.cone(0.1, 0.34, 4), trim, [0, y, z], null, [-1.0, 0, 0]);
  }

  const neck = pivot(group, 0, 1.6, 0.15);
  b.place(neck, b.cylinder(0.2, 0.3, 0.62, 6), body, [0, 0.25, 0.05]);
  b.place(neck, b.cylinder(0.13, 0.2, 0.6, 4), belly, [0, 0.24, 0.17]);

  const head = pivot(neck, 0, 0.62, 0.12);
  b.place(head, b.ico(0.34, 1), body, [0, 0.1, 0], [1.08, 0.85, 1.1]);
  b.place(head, b.cylinder(0.15, 0.27, 0.56, 5), body, [0, 0.04, 0.45], null, [Math.PI / 2, 0, 0]);
  for (const side of [-1, 1]) {
    b.place(head, b.box(0.28, 0.09, 0.26), bodyDark, [side * 0.2, 0.31, 0.2], null, [0.2, 0, side * -0.42]);
    b.place(head, b.octa(0.09), eyeGlow, [side * 0.22, 0.2, 0.28], [1.4, 0.7, 1]);
    b.place(head, b.cone(0.085, 0.56, 5), bone, [side * 0.2, 0.44, -0.24], null, [-0.95, 0, side * -0.3]);
    b.place(head, b.cone(0.08, 0.3, 3), trim, [side * 0.38, 0.05, -0.1], null, [0, 0, side * -1.4]);
    b.place(head, b.octa(0.035), eyeGlow, [side * 0.08, 0.15, 0.7]);
    b.place(head, b.cone(0.035, 0.11, 4), bone, [side * 0.1, -0.1, 0.62], null, [Math.PI, 0, 0]);
    b.place(head, b.cone(0.035, 0.11, 4), bone, [side * 0.14, -0.1, 0.44], null, [Math.PI, 0, 0]);
  }
  const jaw = pivot(head, 0, -0.06, 0.1);
  b.place(jaw, b.cylinder(0.11, 0.22, 0.52, 5), bodyDark, [0, -0.08, 0.3], [1, 1, 0.45], [Math.PI / 2, 0, 0]);
  b.place(jaw, b.ico(0.1, 0), fire, [0, -0.01, 0.28], [1.3, 0.4, 2.2]);
  for (const side of [-1, 1]) b.place(jaw, b.cone(0.035, 0.1, 4), bone, [side * 0.1, 0.0, 0.5]);

  const wings = {};
  for (const [name, side] of [['Left', -1], ['Right', 1]]) {
    const wing = pivot(group, side * 0.42, 1.55, -0.2);
    const shape = wingGeometry(side);
    wing.add(kit.mesh(shape.geometry, membrane));
    for (const [from, to, radius] of shape.bones) {
      const length = from.distanceTo(to);
      const boneMesh = kit.mesh(b.cylinder(radius * 0.5, radius, length, 4), bodyDark);
      boneMesh.position.copy(from).add(to).multiplyScalar(0.5);
      boneMesh.quaternion.setFromUnitVectors(UP, to.clone().sub(from).normalize());
      wing.add(boneMesh);
    }
    b.place(wing, b.cone(0.05, 0.2, 4), bone, [shape.tipTop.x, shape.tipTop.y + 0.08, shape.tipTop.z]);
    wings[name] = wing;
  }

  const limbs = {};
  for (const [name, side] of [['Left', -1], ['Right', 1]]) {
    const arm = pivot(group, side * 0.42, 1.2, 0.38);
    b.place(arm, b.cylinder(0.06, 0.08, 0.34, 5), body, [0, -0.15, 0.05], null, [-0.5, 0, 0]);
    for (const claw of [-1, 0, 1]) b.place(arm, b.cone(0.03, 0.12, 4), bone, [claw * 0.05, -0.34, 0.16], null, [2.4, 0, 0]);
    limbs[`arm${name}`] = arm;
    const leg = pivot(group, side * 0.36, 0.62, 0.05);
    b.place(leg, b.ico(0.26, 0), bodyDark, [0, -0.05, 0], [0.85, 1.15, 1]);
    b.place(leg, b.cylinder(0.07, 0.1, 0.34, 5), body, [0, -0.36, 0.08]);
    b.place(leg, b.cylinder(0.05, 0.14, 0.34, 4), body, [0, -0.55, 0.2], [1, 1, 0.5], [Math.PI / 2, 0, 0]);
    for (const claw of [-1, 1]) b.place(leg, b.cone(0.035, 0.13, 4), bone, [claw * 0.06, -0.57, 0.4], null, [Math.PI / 2, 0, 0]);
    limbs[`leg${name}`] = leg;
  }

  const tailSegments = [];
  let tailParent = pivot(group, 0, 0.78, -0.38);
  [[0.2, 0.27], [0.14, 0.2], [0.08, 0.14]].forEach(([tip, root], index) => {
    const segment = index === 0 ? tailParent : pivot(tailParent, 0, 0, -0.5);
    b.place(segment, b.cylinder(tip, root, 0.52, 5), body, [0, 0, -0.25], null, [-Math.PI / 2, 0, 0]);
    b.place(segment, b.cone(0.06, 0.2, 4), trim, [0, root * 0.8, -0.25], null, [-0.7, 0, 0]);
    tailSegments.push(segment);
    tailParent = segment;
  });
  const tailTip = pivot(tailParent, 0, 0, -0.5);
  b.place(tailTip, b.octa(0.2), trim, [0, 0, -0.2], [1.1, 0.3, 1.5]);
  tailSegments.push(tailTip);

  group.userData.animate = (seconds, enemy) => {
    const phase = enemy.phase || 0;
    const beat = Math.sin(seconds * 5 + phase);
    const lift = 0.12 + beat * 0.42;
    wings.Left.rotation.z = -lift;
    wings.Right.rotation.z = lift;
    wings.Left.rotation.y = 0.2 + beat * 0.12;
    wings.Right.rotation.y = -0.2 - beat * 0.12;
    // A slow roar: the jaw swings open and the head tips back with it.
    const roar = Math.pow(Math.max(0, Math.sin(seconds * 0.9 + phase)), 3);
    jaw.rotation.x = 0.08 + roar * 0.6;
    neck.rotation.x = 0.26 + Math.sin(seconds * 1.7 + phase) * 0.05;
    neck.rotation.y = Math.sin(seconds * 0.8 + phase) * 0.14;
    head.rotation.x = -0.12 - roar * 0.24;
    limbs.legLeft.rotation.x = 0.3 + Math.sin(seconds * 2.5 + phase) * 0.1;
    limbs.legRight.rotation.x = 0.3 + Math.sin(seconds * 2.5 + phase + 1.1) * 0.1;
    limbs.armLeft.rotation.x = -0.2 + Math.sin(seconds * 2 + phase) * 0.14;
    limbs.armRight.rotation.x = -0.2 + Math.sin(seconds * 2 + phase + 0.8) * 0.14;
    tailSegments.forEach((segment, index) => {
      segment.rotation.y = Math.sin(seconds * 2.2 + phase - index * 0.7) * 0.2;
      segment.rotation.x = index === 0 ? -0.5 : -0.06;
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

// Verdant Colossus — a horned brute with oversized clawed arms, hooves and a forked tail.
export function buildVerdantColossus(type, kit) {
  const b = builder(kit);
  const hide = kit.mat(mix(type.body, type.trim, 0.28));
  const hideDark = kit.mat(mix(type.body, type.trim, 0.08));
  const accent = kit.mat(type.trim);
  const chest = kit.mat(mix(type.trim, 0xfff2c0, 0.45));
  const bone = kit.mat(BONE);
  const eyeGlow = kit.glow(type.eye, 1.7);
  const group = new THREE.Group();

  b.place(group, b.ico(0.36, 0), hideDark, [0, 0.84, 0], [1.2, 0.7, 1]);
  const torso = pivot(group, 0, 1.5, 0);
  b.place(torso, b.ico(0.6, 1), hide, [0, 0, 0], [1.15, 1.1, 0.85]);
  b.place(torso, b.ico(0.42, 0), chest, [0, 0, 0.3], [1, 0.9, 0.5]);
  const head = pivot(torso, 0, 0.68, 0.12);
  b.place(head, b.ico(0.34, 1), hide, [0, 0, 0], [1.05, 0.95, 1]);
  b.place(head, b.box(0.56, 0.1, 0.24), hideDark, [0, 0.13, 0.22], null, [0.3, 0, 0]);
  b.place(head, b.box(0.26, 0.07, 0.06), kit.mat(0x12100c), [0, -0.16, 0.3]);
  for (const side of [-1, 1]) {
    b.place(head, b.octa(0.075), eyeGlow, [side * 0.14, 0.02, 0.29], [1.3, 0.75, 1], [0, 0, side * 0.3]);
    b.place(head, b.cone(0.04, 0.16, 4), bone, [side * 0.1, -0.1, 0.31]);
    b.place(head, b.cone(0.11, 0.44, 5), accent, [side * 0.34, 0.24, 0], null, [0, 0, side * -1.05]);
    b.place(head, b.cone(0.075, 0.42, 5), accent, [side * 0.6, 0.5, 0], null, [0, 0, side * -0.15]);
  }
  const limbs = {};
  for (const [name, side] of [['Left', -1], ['Right', 1]]) {
    const arm = pivot(group, side * 0.8, 1.82, 0);
    b.place(arm, b.cone(0.28, 0.42, 5), accent, [side * 0.04, 0.12, 0], null, [0, 0, side * -0.5]);
    b.place(arm, b.cylinder(0.16, 0.2, 0.62, 5), hide, [0, -0.36, 0]);
    b.place(arm, b.ico(0.27, 0), hideDark, [0, -0.86, 0.08]);
    for (const claw of [-1, 0, 1]) b.place(arm, b.cone(0.045, 0.24, 4), bone, [claw * 0.1, -1.1, 0.2], null, [2.6, 0, 0]);
    limbs[`arm${name}`] = arm;
    const leg = pivot(group, side * 0.32, 0.76, 0);
    b.place(leg, b.cylinder(0.16, 0.2, 0.5, 5), hide, [0, -0.26, 0]);
    b.place(leg, b.cylinder(0.2, 0.16, 0.2, 5), accent, [0, -0.62, 0.02]);
    limbs[`leg${name}`] = leg;
  }
  const tail = [];
  let tailParent = pivot(group, 0, 0.86, -0.3);
  [0.07, 0.055, 0.04].forEach((radius, index) => {
    const segment = index === 0 ? tailParent : pivot(tailParent, 0, 0, -0.4);
    b.place(segment, b.cylinder(radius * 0.75, radius, 0.42, 4), hideDark, [0, 0, -0.2], null, [-Math.PI / 2, 0, 0]);
    tail.push(segment);
    tailParent = segment;
  });
  const fork = pivot(tailParent, 0, 0, -0.4);
  for (const side of [-1, 1]) b.place(fork, b.cone(0.06, 0.3, 4), accent, [side * 0.08, 0, -0.12], null, [-Math.PI / 2, 0, side * 0.5]);

  group.userData.animate = (seconds, enemy) => {
    const phase = enemy.phase || 0;
    const step = seconds * 4.8 + phase;
    limbs.legLeft.rotation.x = Math.sin(step) * 0.35;
    limbs.legRight.rotation.x = -Math.sin(step) * 0.35;
    limbs.armLeft.rotation.x = -Math.sin(step) * 0.35;
    limbs.armRight.rotation.x = Math.sin(step) * 0.35;
    limbs.armLeft.rotation.z = -0.18;
    limbs.armRight.rotation.z = 0.18;
    torso.rotation.z = Math.sin(step) * 0.04;
    torso.rotation.x = 0.12;
    head.rotation.y = Math.sin(seconds * 1.1 + phase) * 0.25;
    tail.forEach((segment, index) => {
      segment.rotation.x = 0.35;
      segment.rotation.y = Math.sin(seconds * 2.6 + phase - index * 0.8) * 0.3;
    });
  };
  group.userData.animate(0, {});
  return group;
}

// Storm Warden — a crowned skeleton king: ribcage, long arms and a chattering jaw.
export function buildStormWarden(type, kit) {
  const b = builder(kit);
  const boneMat = kit.mat(mix(type.trim, 0xffffff, 0.35));
  const boneShade = kit.mat(type.trim);
  const dark = kit.mat(mix(type.body, type.trim, 0.12));
  const crown = kit.glow(0xffd76a, 0.9);
  const eyeGlow = kit.glow(type.eye, 1.8);
  const group = new THREE.Group();

  b.place(group, b.ico(0.26, 0), boneShade, [0, 0.96, 0], [1.3, 0.6, 0.8]);
  const chest = pivot(group, 0, 1.0, 0);
  b.place(chest, b.cylinder(0.06, 0.06, 0.74, 4), dark, [0, 0.36, -0.05]);
  [[0.34, 0.3], [0.52, 0.37], [0.7, 0.33]].forEach(([y, radius]) => {
    b.place(chest, b.ring(radius, 0.045, 8), boneMat, [0, y, 0], [1, 0.72, 1], [Math.PI / 2, 0, 0]);
  });
  b.place(chest, b.box(0.86, 0.08, 0.1), boneShade, [0, 0.84, 0]);
  const skull = pivot(chest, 0, 1.06, 0.05);
  b.place(skull, b.ico(0.3, 1), boneMat, [0, 0.06, 0], [1, 1.05, 1.05]);
  b.place(skull, b.octa(0.04), dark, [0, -0.04, 0.3]);
  for (const side of [-1, 1]) {
    b.place(skull, b.octa(0.1), dark, [side * 0.11, 0.06, 0.24]);
    b.place(skull, b.octa(0.05), eyeGlow, [side * 0.11, 0.06, 0.3]);
    b.place(skull, b.box(0.1, 0.08, 0.12), boneShade, [side * 0.2, -0.1, 0.16]);
  }
  for (let index = 0; index < 5; index += 1) {
    const angle = -0.9 + index * 0.45;
    b.place(skull, b.cone(0.05, index === 2 ? 0.3 : 0.22, 4), crown, [Math.sin(angle) * 0.26, 0.4, Math.cos(angle) * 0.22]);
  }
  b.place(skull, b.ring(0.27, 0.035, 8), crown, [0, 0.3, 0], null, [Math.PI / 2, 0, 0]);
  const jaw = pivot(skull, 0, -0.16, 0);
  b.place(jaw, b.box(0.3, 0.1, 0.28), boneShade, [0, -0.07, 0.08]);
  for (const x of [-0.09, -0.03, 0.03, 0.09]) b.place(jaw, b.cone(0.022, 0.07, 4), boneMat, [x, 0.0, 0.2]);
  const limbs = {};
  for (const [name, side] of [['Left', -1], ['Right', 1]]) {
    const arm = pivot(group, side * 0.48, 1.8, 0);
    b.place(arm, b.cylinder(0.045, 0.055, 0.5, 4), boneMat, [0, -0.25, 0]);
    b.place(arm, b.octa(0.07), boneShade, [0, -0.52, 0]);
    b.place(arm, b.cylinder(0.035, 0.045, 0.5, 4), boneMat, [0, -0.78, 0.05]);
    b.place(arm, b.octa(0.09), boneShade, [0, -1.06, 0.08], [0.8, 1.3, 0.8]);
    limbs[`arm${name}`] = arm;
    const leg = pivot(group, side * 0.18, 0.9, 0);
    b.place(leg, b.cylinder(0.055, 0.065, 0.42, 4), boneMat, [0, -0.2, 0]);
    b.place(leg, b.octa(0.08), boneShade, [0, -0.43, 0]);
    b.place(leg, b.cylinder(0.045, 0.055, 0.42, 4), boneMat, [0, -0.65, 0]);
    b.place(leg, b.cylinder(0.03, 0.1, 0.28, 4), boneShade, [0, -0.86, 0.1], [1, 1, 0.5], [Math.PI / 2, 0, 0]);
    limbs[`leg${name}`] = leg;
  }

  group.userData.animate = (seconds, enemy) => {
    const phase = enemy.phase || 0;
    const step = seconds * 4.8 + phase;
    limbs.legLeft.rotation.x = Math.sin(step) * 0.4;
    limbs.legRight.rotation.x = -Math.sin(step) * 0.4;
    limbs.armLeft.rotation.x = -Math.sin(step) * 0.5;
    limbs.armRight.rotation.x = Math.sin(step) * 0.5;
    chest.rotation.z = Math.sin(step) * 0.04;
    skull.rotation.z = Math.sin(seconds * 1.6 + phase) * 0.12;
    jaw.rotation.x = Math.max(0, Math.sin(seconds * 7 + phase)) * 0.3;
  };
  group.userData.animate(0, {});
  return group;
}

// Solar Anvil — a floating forge anvil with glowing rune slits and a living hammer above it.
export function buildSolarAnvil(type, kit) {
  const b = builder(kit);
  const iron = kit.mat(mix(type.body, 0x8a6a4a, 0.4));
  const ironDark = kit.mat(mix(type.body, 0x8a6a4a, 0.12));
  const gold = kit.mat(type.trim);
  const rune = kit.glow(type.trim, 1.5);
  const eyeGlow = kit.glow(type.eye, 1.7);
  const group = new THREE.Group();

  b.place(group, b.cylinder(0.75, 0.88, 0.3, 6), ironDark, [0, 0.6, 0], [1, 1, 0.6]);
  b.place(group, b.cylinder(0.36, 0.52, 0.42, 6), iron, [0, 0.94, 0], [1, 1, 0.6]);
  b.place(group, b.box(1.7, 0.36, 0.82), iron, [0, 1.3, 0]);
  b.place(group, b.cone(0.2, 0.72, 5), iron, [1.18, 1.3, 0], null, [0, 0, -Math.PI / 2]);
  b.place(group, b.box(1.74, 0.08, 0.86), gold, [0, 1.48, 0]);
  for (const x of [-0.5, 0, 0.5]) b.place(group, b.box(0.1, 0.24, 0.04), rune, [x, 1.28, 0.42], null, [0, 0, x * 0.5]);
  for (const x of [-0.78, 0.78]) for (const z of [-0.36, 0.36]) b.place(group, b.octa(0.06), gold, [x, 1.54, z]);

  const hammer = pivot(group, 0, 2.2, 0);
  b.place(hammer, b.cylinder(0.055, 0.055, 0.95, 5), ironDark, [0, -0.2, 0]);
  b.place(hammer, b.box(0.7, 0.4, 0.4), gold, [0, 0.36, 0]);
  b.place(hammer, b.box(0.12, 0.44, 0.44), iron, [-0.36, 0.36, 0]);
  b.place(hammer, b.box(0.12, 0.44, 0.44), iron, [0.36, 0.36, 0]);
  for (const side of [-1, 1]) b.place(hammer, b.octa(0.07), eyeGlow, [side * 0.14, 0.38, 0.21], [1.3, 0.8, 0.6]);

  group.userData.animate = (seconds, enemy) => {
    const phase = enemy.phase || 0;
    // The hammer winds back, then snaps down.
    const swing = Math.sin(seconds * 2.4 + phase);
    hammer.rotation.z = 0.35 + (swing > 0 ? swing * 0.5 : swing * 0.15);
    hammer.position.y = 2.2 + Math.sin(seconds * 2.4 + phase + 1.2) * 0.08;
    hammer.rotation.y = Math.sin(seconds * 0.9 + phase) * 0.2;
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

// Magma Sovereign — a hunched heap of molten rock with lava seams, one arm raised.
export function buildMagmaSovereign(type, kit) {
  const b = builder(kit);
  const rock = kit.mat(mix(type.body, 0x8a5a40, 0.42));
  const rockDark = kit.mat(mix(type.body, 0x8a5a40, 0.18));
  const lava = kit.glow(type.trim, 1.5);
  const eyeGlow = kit.glow(type.eye, 1.8);
  const group = new THREE.Group();

  const mass = pivot(group, 0, 1.0, 0);
  b.place(mass, b.dodeca(0.85), rock, [-0.08, 0, 0], [1.2, 1, 1], [0.3, 0.2, 0.1]);
  b.place(mass, b.dodeca(0.4), rockDark, [0.76, -0.3, 0.1], null, [0.5, 1, 0.2]);
  b.place(mass, b.dodeca(0.42), rockDark, [-0.8, 0.5, -0.1], null, [1, 0.3, 0.6]);
  [[-0.2, 0.1, 0.5, 0.34], [0.22, -0.16, -0.7, 0.3], [0.05, 0.34, 0.2, 0.22], [-0.42, -0.3, -0.3, 0.26]].forEach(([x, y, tilt, length]) => {
    b.place(mass, b.box(0.06, length, 0.05), lava, [x, y, 0.8], null, [0, 0, tilt]);
  });
  const head = pivot(mass, 0, 0.74, 0.36);
  b.place(head, b.dodeca(0.36), rockDark, [0, 0, 0], null, [0.4, 0.3, 0]);
  for (const side of [-1, 1]) b.place(head, b.box(0.2, 0.06, 0.05), eyeGlow, [side * 0.17, 0.02, 0.32], null, [0, 0, side * 0.25]);
  [[-0.22, 0.3, 0.3], [0, 0.42, 0], [0.22, 0.32, -0.3], [0.1, 0.24, -0.6]].forEach(([x, height, tilt]) => {
    b.place(head, b.cone(0.09, height, 4), rock, [x, 0.26 + height / 2, -0.05], null, [0, 0, -tilt]);
    b.place(head, b.octa(0.04), lava, [x - tilt * 0.14, 0.3 + height, -0.05]);
  });
  const armLeft = pivot(group, -0.96, 1.5, 0);
  b.place(armLeft, b.dodeca(0.45), rock, [-0.1, 0.4, 0.1], [0.8, 1.5, 0.8], [0.2, 0.4, 0]);
  const armRight = pivot(group, 0.96, 1.0, 0.1);
  b.place(armRight, b.dodeca(0.36), rock, [0.05, -0.4, 0.1], [0.8, 1.4, 0.8], [0.5, 0.1, 0.3]);
  const feet = [];
  for (const side of [-1, 1]) {
    const foot = pivot(group, side * 0.46, 0.28, 0.1);
    b.place(foot, b.dodeca(0.36), rockDark, [0, 0, 0], [1, 0.75, 1.2], [side * 0.3, 0.2, 0]);
    feet.push(foot);
  }

  group.userData.animate = (seconds, enemy) => {
    const phase = enemy.phase || 0;
    const step = seconds * 3.4 + phase;
    const breath = 1 + Math.sin(seconds * 1.8 + phase) * 0.03;
    mass.scale.set(breath, breath, breath);
    armLeft.rotation.z = Math.sin(seconds * 1.5 + phase) * 0.2;
    armRight.rotation.x = Math.sin(step) * 0.3;
    feet[0].position.y = 0.28 + Math.max(0, Math.sin(step)) * 0.14;
    feet[1].position.y = 0.28 + Math.max(0, -Math.sin(step)) * 0.14;
    head.rotation.z = Math.sin(seconds * 1.2 + phase) * 0.1;
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

// Stellar Dreadnought — an armoured war machine: tracked hull, command turret and four recoiling guns.
export function buildStellarDreadnought(type, kit) {
  const b = builder(kit);
  const hull = kit.mat(mix(type.body, 0x4a5a7c, 0.6));
  const hullDark = kit.mat(mix(type.body, 0x4a5a7c, 0.3));
  const gold = kit.mat(type.trim);
  const eyeGlow = kit.glow(type.eye, 1.8);
  const lamp = kit.glow(type.trim, 1.3);
  const group = new THREE.Group();

  for (const side of [-1, 1]) {
    b.place(group, b.cylinder(0.3, 0.3, 1.6, 6), hullDark, [side * 0.86, 0.3, 0], null, [Math.PI / 2, 0, 0]);
    b.place(group, b.cylinder(0.56, 0.56, 0.08, 6), gold, [side * 1.24, 0.9, 0], null, [0, 0, Math.PI / 2]);
  }
  b.place(group, b.cylinder(1.0, 1.16, 0.76, 6), hull, [0, 0.9, 0], [1, 1, 0.66]);
  b.place(group, b.box(1.5, 0.07, 0.04), gold, [0, 1.0, 0.72]);
  b.place(group, b.box(1.3, 0.07, 0.04), gold, [0, 0.76, 0.76]);
  const turret = pivot(group, 0, 1.3, 0);
  b.place(turret, b.cylinder(0.42, 0.52, 0.6, 6), hull, [0, 0.28, 0]);
  b.place(turret, b.ico(0.42, 0), gold, [0, 0.62, 0], [1, 0.55, 1]);
  for (const side of [-1, 1]) b.place(turret, b.box(0.2, 0.09, 0.05), eyeGlow, [side * 0.17, 0.32, 0.46]);
  const antenna = pivot(turret, 0.2, 0.8, -0.1);
  b.place(antenna, b.cylinder(0.012, 0.02, 0.6, 3), hullDark, [0, 0.3, 0]);
  b.place(antenna, b.octa(0.05), lamp, [0, 0.62, 0]);
  const guns = [];
  for (const side of [-1, 1]) {
    for (const [y, x] of [[1.32, 0.62], [1.02, 0.84]]) {
      const gun = pivot(group, side * x, y, 0.3);
      b.place(gun, b.cylinder(0.07, 0.09, 0.9, 5), hullDark, [0, 0, 0.45], null, [Math.PI / 2, 0, 0]);
      b.place(gun, b.cylinder(0.1, 0.1, 0.1, 5), gold, [0, 0, 0.9], null, [Math.PI / 2, 0, 0]);
      guns.push(gun);
    }
  }

  group.userData.animate = (seconds, enemy) => {
    const phase = enemy.phase || 0;
    turret.rotation.y = Math.sin(seconds * 0.8 + phase) * 0.3;
    antenna.rotation.z = Math.sin(seconds * 3 + phase) * 0.12;
    guns.forEach((gun, index) => {
      // Each gun kicks back in turn, then eases forward again.
      const cycle = (seconds * 0.9 + phase * 0.16 + index * 0.25) % 1;
      gun.position.z = 0.3 - Math.max(0, 1 - cycle * 6) * 0.22;
    });
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
