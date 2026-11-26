// monster-variants.js — the parts that mark a monster with a behaviour of its own:
// a shield-bearer's plate, a splitter's twin cores and a caster's orb.
// No lights: everything glows through emissive or unlit materials.
import * as THREE from 'three';

// A hexagonal plate held in front of the body. Its word must be typed to break it.
export function createShieldPlate() {
  const group = new THREE.Group();
  const plate = new THREE.Mesh(
    new THREE.CylinderGeometry(0.92, 0.92, 0.07, 6),
    new THREE.MeshStandardMaterial({
      color: 0x9fe8ff, emissive: 0x2aa7c9, emissiveIntensity: 0.9, roughness: 0.3,
      transparent: true, opacity: 0.5, flatShading: true, side: THREE.DoubleSide, depthWrite: false,
    })
  );
  plate.rotation.x = Math.PI / 2;
  const rimMaterial = new THREE.MeshStandardMaterial({ color: 0xf2c14e, emissive: 0xb07a12, emissiveIntensity: 0.8, roughness: 0.4, flatShading: true });
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.92, 0.07, 5, 6), rimMaterial);
  rim.rotation.z = Math.PI / 6;
  const stud = new THREE.Mesh(new THREE.OctahedronGeometry(0.2, 0), rimMaterial);
  stud.scale.z = 0.5;
  group.add(plate, rim, stud);
  // Interrupted braces leave the bearer visible through the glass.
  for (let i = 0; i < 3; i++) {
    const angle = Math.PI / 2 + i * 2 * Math.PI / 3;
    const brace = new THREE.Mesh(new THREE.OctahedronGeometry(0.32), rimMaterial);
    brace.scale.set(0.28, 1, 0.16);
    brace.rotation.z = angle - Math.PI / 2;
    brace.position.set(Math.cos(angle) * 0.63, Math.sin(angle) * 0.63, 0.07);
    group.add(brace);
  }
  group.position.set(0, 1.0, 1.0);
  group.userData.plate = plate;
  return group;
}

// Two bright cores and the seam between them: this one breaks in two.
export function createSplitterCores(type) {
  const group = new THREE.Group();
  const material = new THREE.MeshBasicMaterial({ color: new THREE.Color(type.eye).multiplyScalar(1.5) });
  const cores = [-1, 1].map((side) => {
    const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.26, 0), material);
    const collar = new THREE.Mesh(new THREE.TorusGeometry(0.31, 0.043, 4, 6),
      new THREE.MeshStandardMaterial({ color: 0x614a68, roughness: 0.56, flatShading: true }));
    collar.rotation.set(0.4, side * 0.55, 0);
    core.add(collar);
    core.position.set(side * 0.42, 1.95, 0);
    group.add(core);
    return core;
  });
  const seam = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.07, 0.07), material);
  seam.position.set(0, 1.95, 0);
  group.add(seam);
  group.userData.cores = cores;
  return group;
}

// An orb that swells above the head while the caster charges a bolt.
export function createCasterOrb(type) {
  const group = new THREE.Group();
  const colour = new THREE.Color(type.eye).multiplyScalar(1.6);
  const orb = new THREE.Mesh(new THREE.IcosahedronGeometry(0.32, 1), new THREE.MeshBasicMaterial({ color: colour }));
  const halo = new THREE.Mesh(
    new THREE.TorusGeometry(0.56, 0.045, 4, 12),
    new THREE.MeshBasicMaterial({ color: colour, transparent: true, opacity: 0.7, depthWrite: false })
  );
  const meridian = new THREE.Mesh(new THREE.TorusGeometry(0.43, 0.033, 4, 10), halo.material);
  meridian.rotation.y = 1.05;
  halo.add(meridian);
  group.add(orb, halo);
  group.position.set(0, 2.3, 0.1);
  group.userData.orb = orb;
  group.userData.halo = halo;
  return group;
}

// The bolt a caster lobs at the player.
export function createCasterBolt(type) {
  const colour = new THREE.Color(type.eye).multiplyScalar(1.6);
  const group = new THREE.Group();
  group.add(new THREE.Mesh(new THREE.IcosahedronGeometry(0.24, 1), new THREE.MeshBasicMaterial({ color: colour })));
  group.add(new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.42, 0),
    new THREE.MeshBasicMaterial({ color: colour, transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending, depthWrite: false })
  ));
  return group;
}

// A pair of wings for monsters that fly: the night sky's swoopers and the mine's
// cave fliers. `userData.wings` holds the two pivots to flap.
export function createWings(type) {
  const group = new THREE.Group();
  const material = new THREE.MeshStandardMaterial({
    color: type.trim, emissive: type.trim, emissiveIntensity: 0.35, roughness: 0.6,
    flatShading: true, side: THREE.DoubleSide, transparent: true, opacity: 0.88,
  });
  // A raised knuckle and alternating tips give the membrane a folded, scalloped edge.
  const root = [0, 0, 0], knuckle = [0.64, 0.39, 0.12];
  const edge = [[0.91,0.51,0.02],[1.65,0.6,-0.1],[1.22,0.08,-0.04],[1.36,-0.22,-0.09],
    [0.95,-0.16,0],[0.93,-0.45,-0.06],[0.52,-0.3,0.03],[0.43,-0.45,-0.08],root];
  const positions = [...root, ...knuckle, ...edge[0]];
  for (let i = 1; i < edge.length; i++) positions.push(...knuckle, ...edge[i - 1], ...edge[i]);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.computeVertexNormals();
  const wings = [-1, 1].map((side) => {
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.3, 1.2, -0.3);
    pivot.userData.side = side;
    const wing = new THREE.Mesh(geometry, material);
    wing.scale.x = side;
    pivot.add(wing);
    group.add(pivot);
    return pivot;
  });
  group.userData.wings = wings;
  return group;
}

// A space bat for the night sky's swarm challenge: a round body with big ears, bright
// eyes and fangs. Its wings come from createWings, like every flier's.
export function createSpaceBat(type) {
  const group = new THREE.Group();
  const flat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.85, flatShading: true, ...extra });
  const fur = flat(type.body, { emissive: type.trim, emissiveIntensity: 0.25 });
  const glow = new THREE.MeshBasicMaterial({ color: new THREE.Color(type.eye).multiplyScalar(1.5) });
  const bone = flat(0xf4f1e6);
  const add = (geometry, material, x, y, z) => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    group.add(mesh);
    return mesh;
  };
  add(new THREE.IcosahedronGeometry(0.46, 1), fur, 0, 1.05, 0).scale.set(1, 0.92, 0.9);
  for (const side of [-1, 1]) {
    const ear = add(new THREE.ConeGeometry(0.17, 0.5, 4), fur, side * 0.26, 1.58, -0.02);
    ear.rotation.z = side * -0.3;
    const inner = add(new THREE.OctahedronGeometry(0.12), glow, side * 0.28, 1.54, 0.09);
    inner.scale.set(0.52, 1.45, 0.25);
    inner.rotation.z = ear.rotation.z;
    const mane = add(new THREE.OctahedronGeometry(0.21), fur, side * 0.33, 0.97, 0.08);
    mane.scale.set(0.74, 1.35, 0.72);
    mane.rotation.z = side * 0.64;
    add(new THREE.IcosahedronGeometry(0.085, 0), glow, side * 0.17, 1.14, 0.38);
    const fang = add(new THREE.ConeGeometry(0.035, 0.13, 3), bone, side * 0.08, 0.86, 0.36);
    fang.rotation.x = Math.PI;
    add(new THREE.ConeGeometry(0.05, 0.16, 3), fur, side * 0.14, 0.56, 0.05).rotation.x = Math.PI;
  }
  return group;
}
