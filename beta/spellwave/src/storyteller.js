// storyteller.js — the people who tell the game's story (story.js) at its quiet stops.
import * as THREE from 'three';

// A small low-poly person in a long coat and a hat. `userData.parts` holds what the
// game animates: the head, the two arms and the dome a myth holds them in.
export function createStoryteller(beat) {
  const flat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.9, flatShading: true, ...extra });
  const coat = flat(beat.coat, { emissive: beat.coat, emissiveIntensity: 0.12 });
  const skin = flat(0xe6b58f, { emissive: 0x6b3f28, emissiveIntensity: 0.3 });
  const dark = flat(0x2f2a3a);
  const hat = flat(beat.hat, { emissive: beat.hat, emissiveIntensity: 0.15 });
  const group = new THREE.Group();
  const add = (geometry, material, x, y, z, parent = group) => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    parent.add(mesh);
    return mesh;
  };

  add(new THREE.CylinderGeometry(0.3, 0.5, 1.15, 7), coat, 0, 0.72, 0);
  add(new THREE.CylinderGeometry(0.33, 0.33, 0.1, 7), dark, 0, 0.92, 0);
  for (const side of [-1, 1]) add(new THREE.BoxGeometry(0.18, 0.16, 0.3), dark, side * 0.17, 0.08, 0.06);

  const head = new THREE.Group();
  head.position.set(0, 1.55, 0);
  group.add(head);
  add(new THREE.IcosahedronGeometry(0.27, 1), skin, 0, 0, 0, head);
  for (const side of [-1, 1]) add(new THREE.OctahedronGeometry(0.045, 0), dark, side * 0.1, 0.03, 0.24, head);
  add(new THREE.CylinderGeometry(0.4, 0.4, 0.05, 8), hat, 0, 0.2, 0, head);
  add(new THREE.CylinderGeometry(0.2, 0.25, 0.26, 7), hat, 0, 0.34, 0, head);

  const arms = [-1, 1].map((side) => {
    const arm = new THREE.Group();
    arm.position.set(side * 0.32, 1.2, 0);
    arm.userData.side = side;
    group.add(arm);
    add(new THREE.CylinderGeometry(0.075, 0.09, 0.6, 5), coat, 0, -0.28, 0, arm);
    add(new THREE.IcosahedronGeometry(0.09, 0), skin, 0, -0.62, 0, arm);
    return arm;
  });

  // The dome a myth holds them in: unlit, so it glows without a light.
  const dome = add(
    new THREE.IcosahedronGeometry(1.25, 1),
    new THREE.MeshBasicMaterial({ color: 0x9a5cff, transparent: true, opacity: 0.28, depthWrite: false, wireframe: true }),
    0, 0.95, 0
  );
  dome.castShadow = false;
  dome.visible = false;

  group.userData.parts = { head, arms, dome };
  return group;
}
