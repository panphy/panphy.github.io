// lowpoly.js — faceted, flat-shaded scenery: trees, rocks and clouds.
import * as THREE from 'three';
import { roundSides, polyDetail, roughen } from './detail.js?v=18';

function hash(a, b, c = 0) {
  const value = Math.sin(a * 127.1 + b * 311.7 + c * 74.7) * 43758.5453;
  return value - Math.floor(value);
}

function shadowed(mesh) {
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

// Fold a few uneven boughs around a leaning spine. The notches break up the
// lower edge even at a distance, where a stack of perfect cones reads as rings.
export function firCrown(radius, height, seed) {
  const boughs = roundSides(6, 1, 1.3);
  const tip = [(hash(seed, 1) - 0.5) * radius * 0.34, height * 0.58, 0];
  const rim = [];
  for (let i = 0; i < boughs * 2; i++) {
    const angle = i * Math.PI / boughs;
    const notch = i % 2;
    const reach = radius * ((notch ? 0.62 : 0.91) + 0.15 * hash(seed, i, 3));
    rim.push([Math.cos(angle) * reach, height * (-0.41 + notch * 0.18 + hash(seed, i, 5) * 0.08), Math.sin(angle) * reach]);
  }
  const vertices = [];
  for (let i = 0; i < rim.length; i++) {
    const next = rim[(i + 1) % rim.length];
    vertices.push(...tip, ...next, ...rim[i], 0, -height * 0.38, 0, ...rim[i], ...next);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.computeVertexNormals();
  return geometry;
}

export function createLowPolyTree({ kind, trunkMaterial, leafMaterials, seed }) {
  const group = new THREE.Group();
  const random = (salt) => hash(seed, salt, 7);

  if (kind === 'pine') {
    const trunkHeight = 0.7 + random(1) * 0.3;
    const trunk = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.19, trunkHeight, roundSides(5, 1, 1.8)), trunkMaterial));
    trunk.position.y = trunkHeight / 2;
    group.add(trunk);
    const tiers = 3;
    for (let tier = 0; tier < tiers; tier += 1) {
      const radius = 1.05 - tier * 0.26;
      const height = 1.15 - tier * 0.12;
      const cone = shadowed(new THREE.Mesh(firCrown(radius, height, seed + tier), leafMaterials[tier === 2 ? 0 : 2]));
      cone.position.y = trunkHeight + 0.4 + tier * 0.62;
      cone.rotation.y = random(10 + tier) * Math.PI;
      group.add(cone);
    }
    return group;
  }

  const trunkHeight = 1.3 + random(1) * 0.7;
  const trunk = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.3, trunkHeight, roundSides(5, 1, 1.8), polyDetail(1)), trunkMaterial));
  trunk.position.y = trunkHeight / 2;
  trunk.rotation.z = (random(2) - 0.5) * 0.22;
  group.add(trunk);
  // A forked branch gives the crown clusters something to sit on.
  const branch = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.15, 0.9, roundSides(5, 0.8, 1.4)), trunkMaterial));
  const side = random(3) < 0.5 ? -1 : 1;
  branch.position.set(side * 0.3, trunkHeight * 0.82, 0);
  branch.rotation.z = -side * 0.85;
  group.add(branch);

  const crownCount = 3 + Math.floor(random(4) * 2);
  for (let index = 0; index < crownCount; index += 1) {
    const angle = (index / crownCount) * Math.PI * 2 + random(20 + index);
    const reach = index === 0 ? 0 : 0.62 + random(30 + index) * 0.25;
    const radius = index === 0 ? 0.98 : 0.6 + random(40 + index) * 0.28;
    const material = leafMaterials[(index + Math.floor(random(5) * 3)) % 2];
    const crown = shadowed(new THREE.Mesh(roughen(new THREE.IcosahedronGeometry(radius, polyDetail(0)), 0.1, seed + index), material));
    crown.position.set(Math.cos(angle) * reach, trunkHeight + 0.55 + random(50 + index) * 0.45 - (index === 0 ? 0 : 0.25), Math.sin(angle) * reach);
    crown.rotation.set(random(60 + index) * 3, random(70 + index) * 3, random(80 + index) * 3);
    group.add(crown);
  }
  return group;
}

export function createLowPolyRock(material, seed) {
  const rock = shadowed(new THREE.Mesh(roughen(new THREE.DodecahedronGeometry(0.45 + hash(seed, 1) * 0.35, polyDetail(0)), 0.12, seed), material));
  rock.scale.set(1.2 + hash(seed, 2) * 0.5, 0.6 + hash(seed, 3) * 0.3, 1 + hash(seed, 4) * 0.4);
  rock.rotation.set(hash(seed, 5) * 3, hash(seed, 6) * 3, hash(seed, 7) * 3);
  return rock;
}

// A cloud is a few squashed faceted lumps side by side.
export function createLowPolyCloud(material, template) {
  const group = new THREE.Group();
  const lumps = [
    [[0, 0, 2.6], [-2.1, -0.15, 1.6], [2.0, -0.1, 1.8], [0.9, 0.55, 1.5]],
    [[0, 0, 2.2], [-1.7, -0.1, 1.4], [1.6, -0.15, 1.3]],
    [[0, 0, 2.9], [-2.5, -0.1, 1.7], [2.4, -0.05, 1.9], [-0.9, 0.6, 1.6], [1.2, 0.5, 1.4]],
  ][template % 3];
  lumps.forEach(([x, y, radius], index) => {
    const lump = new THREE.Mesh(roughen(new THREE.IcosahedronGeometry(radius, polyDetail(0)), 0.08, template * 10 + index), material);
    lump.position.set(x, y, (hash(template, index) - 0.5) * 0.8);
    lump.scale.set(1, 0.5, 0.7);
    lump.rotation.set(hash(template, index, 1) * 3, hash(template, index, 2) * 3, 0);
    group.add(lump);
  });
  return group;
}
