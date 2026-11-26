// The same five articulated figures appear at the story stops and in the ending.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const LOOKS = {
  professor: { skin: 0x975f49, hair: 0xd4c6ae, cloth: 0x315b60, shoulders: 0.32, height: 1.04 },
  miller: { skin: 0xd49a72, hair: 0x69412f, cloth: 0x677255, shoulders: 0.41, height: 0.95 },
  miner: { skin: 0xb77556, hair: 0x402d36, cloth: 0x424a5b, shoulders: 0.32, height: 0.93 },
  captain: { skin: 0xc58972, hair: 0xd3cebe, cloth: 0x263b51, shoulders: 0.42, height: 1.04 },
  stargazer: { skin: 0x865943, hair: 0x302638, cloth: 0xe8dcc0, shoulders: 0.29, height: 1.07 },
};

// A pierced brass instrument, with a slanted sighting rule and a suspension ring.
export function createAstrolabe(brass, inlay) {
  const dial = new THREE.Group();
  const ring = (radius, tube, x, y, z) => {
    const mesh = new THREE.Mesh(new THREE.TorusGeometry(radius, tube, 5, 20), brass);
    mesh.position.set(x, y, z);
    dial.add(mesh);
    return mesh;
  };
  ring(1, 0.076, 0, 0, 0);
  ring(0.66, 0.038, 0, 0.12, 0);
  ring(0.15, 0.047, 0, 1.19, 0);
  for (let i = 0; i < 12; i++) {
    const a = i * Math.PI / 6;
    const tick = new THREE.Mesh(new THREE.BoxGeometry(0.045, i % 3 ? 0.13 : 0.25, 0.07), brass);
    tick.position.set(Math.sin(a) * 0.91, Math.cos(a) * 0.91, 0);
    tick.rotation.z = -a;
    dial.add(tick);
  }
  const bar = new THREE.Mesh(new THREE.BoxGeometry(0.084, 1.87, 0.09), brass);
  bar.rotation.z = -0.64;
  bar.position.z = 0.06;
  const hub = new THREE.Mesh(new THREE.OctahedronGeometry(0.16), inlay);
  hub.position.z = 0.11;
  dial.add(bar, hub);
  batchRigidParts(dial);
  return dial;
}

// Each pivot moves as one piece. Draw its brass fittings, cloth panels, etc.
// together per material, keeping the head and arms independent.
function batchRigidParts(parent) {
  const buckets = new Map();
  for (const part of parent.children) {
    if (!part.isMesh) continue;
    if (!buckets.has(part.material)) buckets.set(part.material, []);
    buckets.get(part.material).push(part);
  }
  for (const [material, parts] of buckets) {
    if (parts.length < 2) continue;
    const geometries = parts.map(part => {
      part.updateMatrix();
      const geometry = part.geometry.index ? part.geometry.toNonIndexed() : part.geometry.clone();
      geometry.deleteAttribute('uv');
      geometry.applyMatrix4(part.matrix);
      return geometry;
    });
    const mesh = new THREE.Mesh(mergeGeometries(geometries), material);
    mesh.castShadow = parts[0].castShadow;
    parent.add(mesh);
    for (const part of parts) { parent.remove(part); part.geometry.dispose(); }
    for (const geometry of geometries) geometry.dispose();
  }
}

export function createStoryteller(beat) {
  const look = LOOKS[beat.role];
  const materials = new Map();
  function paint(color) {
    if (!materials.has(color)) materials.set(color, new THREE.MeshStandardMaterial({
      color, roughness: 0.86, flatShading: true, emissive: color, emissiveIntensity: color === look.skin ? 0.28 : 0.12,
    }));
    return materials.get(color);
  }
  const brass = 0xe0b55f, ivory = 0xf3e2bf, ink = 0x302a36;
  const group = new THREE.Group();
  const pivot = (parent, x, y, z) => {
    const node = new THREE.Group();
    node.position.set(x, y, z);
    parent.add(node);
    return node;
  };
  const figure = pivot(group, 0, 0, 0);
  figure.scale.y = look.height;
  const head = pivot(figure, 0, 1.56, 0.015);
  const arms = [-1, 1].map(side => {
    const arm = pivot(figure, side * look.shoulders, 1.2, 0);
    arm.userData.side = side;
    return arm;
  });
  function part(parent, geometry, color, x, y, z) {
    const mesh = new THREE.Mesh(geometry, paint(color));
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    parent.add(mesh);
    return mesh;
  }
  const box = (p, c, x, y, z, w, h, d) => part(p, new THREE.BoxGeometry(w, h, d), c, x, y, z);
  const drum = (p, c, x, y, z, top, base, h, n = 8) => part(p, new THREE.CylinderGeometry(top, base, h, n), c, x, y, z);
  const lump = (p, c, x, y, z, w, h, d) => {
    const mesh = part(p, new THREE.IcosahedronGeometry(1, 1), c, x, y, z);
    mesh.scale.set(w, h, d);
    return mesh;
  };
  const ring = (p, c, x, y, z, r, tube) => part(p, new THREE.TorusGeometry(r, tube, 5, 12), c, x, y, z);

  for (const side of [-1, 1]) {
    drum(figure, look.cloth, side * 0.15, 0.37, 0, 0.115, 0.095, 0.55);
    box(figure, ink, side * 0.15, 0.115, 0.053, 0.225, 0.20, 0.35);
  }
  const torso = drum(figure, beat.coat, 0, 0.94, 0, look.shoulders * 1.07, 0.34, 0.74);
  torso.scale.z = 0.78;
  drum(figure, look.skin, 0, 1.34, 0, 0.11, 0.14, 0.18);
  lump(head, look.skin, 0, 0, 0, 0.255, 0.288, 0.24);
  lump(head, look.hair, 0, 0.12, -0.06, 0.257, 0.206, 0.209);
  lump(head, look.skin, 0, -0.015, 0.225, 0.061, 0.071, 0.071);
  box(head, 0x774d48, 0, -0.12, 0.214, 0.084, 0.019, 0.016);
  for (const side of [-1, 1]) {
    lump(head, look.skin, side * 0.245, -0.01, 0.01, 0.054, 0.078, 0.05);
    lump(head, ink, side * 0.103, 0.044, 0.221, 0.029, 0.038, 0.02);
    box(head, look.hair, side * 0.109, 0.099, 0.209, 0.092, 0.026, 0.029).rotation.z = side * 0.09;
  }
  const forearms = arms.map(arm => {
    lump(arm, beat.coat, 0, -0.015, 0, 0.12, 0.13, 0.12);
    drum(arm, beat.coat, 0, -0.13, 0, 0.116, 0.093, 0.26);
    const elbow = pivot(arm, 0, -0.24, 0);
    elbow.rotation.x = -0.36;
    drum(elbow, beat.coat, 0, -0.10, 0, 0.094, 0.088, 0.22);
    drum(elbow, look.cloth, 0, -0.205, 0, 0.096, 0.085, 0.075);
    lump(elbow, look.skin, 0, -0.29, 0.035, 0.088, 0.11, 0.077);
    lump(elbow, look.skin, -arm.userData.side * 0.064, -0.262, 0.080, 0.039, 0.056, 0.035);
    return elbow;
  });
  const left = forearms[0];
  let lanternHandle;
  switch (beat.role) {
    case 'professor': {
      lump(head, look.hair, -0.04, 0.19, -0.205, 0.19, 0.17, 0.16);
      for (const side of [-1, 1]) {
        ring(head, beat.hat, side * 0.109, 0.047, 0.253, 0.082, 0.014);
        box(figure, look.cloth, side * 0.083, 1.16, 0.238, 0.095, 0.31, 0.04).rotation.z = -side * 0.38;
      }
      box(head, beat.hat, 0, 0.052, 0.256, 0.065, 0.017, 0.015);
      drum(figure, beat.coat, 0, 0.55, 0, 0.31, 0.416, 0.44).scale.z = 0.76;
      const book = pivot(left, -0.055, -0.21, 0.115);
      book.rotation.z = 0.16;
      box(book, look.cloth, 0, 0, 0, 0.245, 0.33, 0.075);
      box(book, ivory, 0.02, 0, -0.006, 0.224, 0.30, 0.053);
      box(book, brass, 0, 0.05, 0.042, 0.14, 0.025, 0.01);
      break;
    }
    case 'miller': {
      drum(head, beat.hat, 0, 0.185, 0.04, 0.29, 0.27, 0.08);
      lump(head, beat.hat, -0.05, 0.246, 0, 0.33, 0.13, 0.255);
      box(head, beat.hat, 0, 0.16, 0.203, 0.37, 0.045, 0.24);
      for (const side of [-1, 1]) {
        lump(head, look.hair, side * 0.071, -0.075, 0.238, 0.09, 0.036, 0.034);
        box(figure, ivory, side * 0.145, 1.19, 0.302, 0.056, 0.27, 0.045).rotation.z = -side * 0.22;
      }
      box(figure, 0xdbc7a3, 0, 0.83, 0.323, 0.48, 0.70, 0.057);
      box(figure, 0xa88e6a, 0, 0.72, 0.359, 0.27, 0.155, 0.023);
      for (const [x, y, size] of [[-0.12, 0.82, 0.06], [0.075, 0.64, 0.043], [-0.09, 0.95, 0.034]]) {
        lump(figure, ivory, x, y, 0.374, size, 0.025, 0.014);
      }
      break;
    }
    case 'miner': {
      drum(head, beat.hat, 0, 0.192, 0.038, 0.34, 0.35, 0.064);
      lump(head, beat.hat, 0, 0.222, -0.014, 0.283, 0.222, 0.255);
      drum(head, ink, 0, 0.24, 0, 0.274, 0.28, 0.067);
      ring(head, brass, 0, 0.26, 0.258, 0.091, 0.021);
      const lamp = lump(head, 0xffda80, 0, 0.26, 0.26, 0.076, 0.077, 0.04);
      lamp.material.emissiveIntensity = 1.3;
      box(figure, look.cloth, 0, 0.90, 0.245, 0.42, 0.46, 0.065);
      for (const side of [-1, 1]) {
        box(figure, look.cloth, side * 0.166, 1.17, 0.215, 0.08, 0.24, 0.075);
        box(figure, brass, side * 0.164, 1.10, 0.273, 0.071, 0.044, 0.022);
      }
      lanternHandle = pivot(left, 0, -0.31, 0.08);
      const lantern = pivot(lanternHandle, 0, -0.20, 0);
      ring(lantern, ink, 0, 0.13, 0, 0.088, 0.013);
      drum(lantern, 0xffda80, 0, -0.034, 0, 0.086, 0.101, 0.17, 6);
      for (const side of [-1, 1]) {
        box(lantern, brass, side * 0.082, -0.026, 0.049, 0.017, 0.21, 0.018);
      }
      drum(lantern, ink, 0, -0.145, 0, 0.124, 0.112, 0.055, 6);
      drum(lantern, ink, 0, 0.077, 0, 0.069, 0.12, 0.06, 6);
      break;
    }
    case 'captain': {
      lump(head, look.hair, 0, -0.13, 0.094, 0.22, 0.19, 0.16);
      lump(head, look.skin, 0, -0.077, 0.214, 0.102, 0.044, 0.037);
      drum(head, ink, 0, 0.18, 0.018, 0.275, 0.256, 0.113);
      drum(head, beat.hat, 0, 0.273, -0.025, 0.35, 0.29, 0.12);
      box(head, ink, 0, 0.148, 0.22, 0.39, 0.048, 0.237);
      lump(head, brass, 0, 0.24, 0.283, 0.047, 0.053, 0.018);
      drum(figure, beat.coat, 0, 0.51, 0, 0.34, 0.445, 0.42).scale.z = 0.81;
      for (const side of [-1, 1]) {
        box(figure, look.cloth, side * 0.155, 1.19, 0.257, 0.163, 0.29, 0.079).rotation.z = -side * 0.51;
        for (let i = 0; i < 3; i++) lump(figure, brass, side * 0.128, 0.67 + i * 0.144, 0.281, 0.029, 0.033, 0.022);
      }
      break;
    }
    case 'stargazer': {
      lump(head, look.hair, -0.18, -0.07, -0.10, 0.14, 0.35, 0.17);
      drum(head, look.cloth, 0, 0.18, -0.01, 0.28, 0.32, 0.095);
      drum(head, beat.coat, -0.05, 0.32, -0.015, 0.16, 0.27, 0.25).rotation.z = 0.27;
      drum(head, beat.coat, -0.18, 0.42, -0.01, 0.025, 0.164, 0.26).rotation.z = 1.0;
      lump(head, brass, -0.292, 0.485, 0, 0.041, 0.055, 0.041);
      drum(figure, look.cloth, 0, 0.55, 0, 0.28, 0.42, 0.64).scale.z = 0.78;
      drum(figure, beat.coat, 0, 1.14, 0, 0.21, 0.46, 0.37).scale.z = 0.76;
      for (const [x, y] of [[-0.19, 1.14], [0.15, 1.05], [0.05, 1.19]]) {
        lump(figure, brass, x, y, 0.254, 0.028, 0.039, 0.018);
      }
      const dial = createAstrolabe(paint(brass), paint(0x85d7d0));
      dial.scale.setScalar(0.225);
      dial.position.set(-0.095, -0.51, 0.112);
      dial.rotation.y = -0.18;
      left.add(dial);
      break;
    }
  }
  for (const p of [figure, head, ...arms, ...forearms]) batchRigidParts(p);
  const dome = new THREE.Mesh(new THREE.IcosahedronGeometry(1.25, 1),
    new THREE.MeshBasicMaterial({ color: 0x9a5cff, transparent: true, opacity: 0.28, depthWrite: false, wireframe: true }));
  dome.position.y = 0.95;
  dome.visible = false;
  group.add(dome);
  group.userData.parts = { head, arms, forearms, dome, lanternHandle };
  return group;
}

// The miner holds the handle at its hinge. Gravity keeps the lamp below her hand.
export function settleLantern({ arms, forearms, lanternHandle }) {
  if (lanternHandle) lanternHandle.quaternion.copy(arms[0].quaternion).multiply(forearms[0].quaternion).invert();
}
