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
