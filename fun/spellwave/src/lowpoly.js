// lowpoly.js — faceted, flat-shaded scenery: the rolling ground, trees, rocks and clouds.
import * as THREE from 'three';

function hash(a, b, c = 0) {
  const value = Math.sin(a * 127.1 + b * 311.7 + c * 74.7) * 43758.5453;
  return value - Math.floor(value);
}

function shadowed(mesh) {
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

// A strip of triangles whose shape repeats every `period` along the road, so it can
// scroll forever by wrapping its position. The road and its verges are flat; the
// ground rises into banks further out.
export function createLowPolyTerrain({ minZ, maxZ, halfWidth = 14, cell = 2, period = 36, roadHalfWidth = 4.2 }) {
  const columns = Math.round((halfWidth * 2) / cell);
  const rows = Math.ceil((maxZ - minZ + period) / cell);
  const repeat = Math.round(period / cell);

  const vertex = (ix, iz, target) => {
    const k = ((iz % repeat) + repeat) % repeat;
    const baseX = -halfWidth + ix * cell;
    const distance = Math.abs(baseX);
    const onRoad = distance < roadHalfWidth - 0.5;
    const wobble = onRoad ? 0 : distance < 7 ? 0.45 : 0.75;
    const x = baseX + (hash(ix, k, 1) - 0.5) * 2 * wobble * (ix === 0 || ix === columns ? 0 : 1);
    const z = -iz * cell + (hash(ix, k, 2) - 0.5) * 2 * wobble;
    const bank = Math.max(0, distance - 9) * 0.38;
    const y = -0.1 + (distance < 7 ? (hash(ix, k, 3) - 0.5) * 0.08 : (hash(ix, k, 3) - 0.3) * 0.5 + bank);
    return target.set(x, y, z);
  };

  const triangles = columns * rows * 2;
  const positions = new Float32Array(triangles * 9);
  const colors = new Float32Array(triangles * 9);
  const faces = [];
  const corners = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
  let offset = 0;
  for (let iz = 0; iz < rows; iz += 1) {
    for (let ix = 0; ix < columns; ix += 1) {
      vertex(ix, iz, corners[0]);
      vertex(ix + 1, iz, corners[1]);
      vertex(ix + 1, iz + 1, corners[2]);
      vertex(ix, iz + 1, corners[3]);
      // Alternate the diagonal so the facets do not line up in rows.
      const split = (ix + iz) % 2 === 0 ? [[0, 1, 3], [1, 2, 3]] : [[0, 1, 2], [0, 2, 3]];
      for (const [a, b, c] of split) {
        const centreX = (corners[a].x + corners[b].x + corners[c].x) / 3;
        for (const index of [a, b, c]) {
          positions[offset] = corners[index].x;
          positions[offset + 1] = corners[index].y;
          positions[offset + 2] = corners[index].z;
          offset += 3;
        }
        faces.push({ onRoad: Math.abs(centreX) < roadHalfWidth, seed: hash(ix, iz % repeat, a + b * 3) });
      }
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  const material = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 1, metalness: 0 });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.receiveShadow = true;
  mesh.frustumCulled = false;
  mesh.position.z = maxZ;

  let scrolled = 0;
  const color = new THREE.Color();

  return {
    mesh,
    scroll(distance) {
      scrolled = (scrolled + distance) % period;
      mesh.position.z = maxZ + scrolled;
    },
    // path, grass and patch are { h, s, l } colours; every facet gets its own slight tone.
    recolor({ path, grass, patch, tone = 1 }) {
      faces.forEach((face, index) => {
        if (face.onRoad) color.setHSL(path.h, path.s, path.l + (face.seed - 0.5) * 0.07);
        else if (face.seed > 0.82) color.setHSL(patch.h, patch.s, patch.l);
        else color.setHSL(grass.h, grass.s, grass.l + (face.seed - 0.5) * 0.09);
        color.multiplyScalar(tone);
        for (let corner = 0; corner < 3; corner += 1) color.toArray(colors, index * 9 + corner * 3);
      });
      geometry.attributes.color.needsUpdate = true;
    },
  };
}

// Returns { group, crowns }: crowns are the meshes that sway.
export function createLowPolyTree({ kind, trunkMaterial, leafMaterials, seed }) {
  const group = new THREE.Group();
  const crowns = [];
  const random = (salt) => hash(seed, salt, 7);

  if (kind === 'pine') {
    const trunkHeight = 0.7 + random(1) * 0.3;
    const trunk = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.19, trunkHeight, 5), trunkMaterial));
    trunk.position.y = trunkHeight / 2;
    group.add(trunk);
    const tiers = 3;
    for (let tier = 0; tier < tiers; tier += 1) {
      const radius = 1.05 - tier * 0.26;
      const height = 1.15 - tier * 0.12;
      const cone = shadowed(new THREE.Mesh(new THREE.ConeGeometry(radius, height, 6), leafMaterials[2]));
      cone.position.y = trunkHeight + 0.4 + tier * 0.62;
      cone.rotation.y = random(10 + tier) * Math.PI;
      group.add(cone);
      crowns.push(cone);
    }
    return { group, crowns };
  }

  const trunkHeight = 1.3 + random(1) * 0.7;
  const trunk = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.3, trunkHeight, 5), trunkMaterial));
  trunk.position.y = trunkHeight / 2;
  trunk.rotation.z = (random(2) - 0.5) * 0.22;
  group.add(trunk);
  // A forked branch gives the crown clusters something to sit on.
  const branch = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.15, 0.9, 4), trunkMaterial));
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
    const crown = shadowed(new THREE.Mesh(new THREE.IcosahedronGeometry(radius, 0), material));
    crown.position.set(Math.cos(angle) * reach, trunkHeight + 0.55 + random(50 + index) * 0.45 - (index === 0 ? 0 : 0.25), Math.sin(angle) * reach);
    crown.rotation.set(random(60 + index) * 3, random(70 + index) * 3, random(80 + index) * 3);
    group.add(crown);
    crowns.push(crown);
  }
  return { group, crowns };
}

export function createLowPolyRock(material, seed) {
  const rock = shadowed(new THREE.Mesh(new THREE.DodecahedronGeometry(0.45 + hash(seed, 1) * 0.35, 0), material));
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
    const lump = new THREE.Mesh(new THREE.IcosahedronGeometry(radius, 0), material);
    lump.position.set(x, y, (hash(template, index) - 0.5) * 0.8);
    lump.scale.set(1, 0.5, 0.7);
    lump.rotation.set(hash(template, index, 1) * 3, hash(template, index, 2) * 3, 0);
    group.add(lump);
  });
  return group;
}
