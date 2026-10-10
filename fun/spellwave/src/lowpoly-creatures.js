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
