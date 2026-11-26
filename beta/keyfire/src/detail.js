// detail.js — how finely the world is faceted. The look stays flat-shaded and faceted;
// full detail just cuts round things into more, smaller facets. Battery saver keeps the
// coarse low-poly shapes. Geometry is built per stage, so a change of setting shows from
// the next stage on.
import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

export function isDetailed() {
  if (typeof document === 'undefined' || !document.body) return true;
  return !document.body.classList.contains('battery-saver');
}

// Sides for a round shape. Three- and four-sided shapes are deliberate and stay as written.
export function roundSides(sides, coarse = 1.6, fine = 2.6) {
  if (sides <= 4) return sides;
  return Math.round(sides * (isDetailed() ? fine : coarse));
}

// One step more subdivision for polyhedra when detailed.
export function polyDetail(base = 0) {
  return isDetailed() ? base + 1 : base;
}

function hash(a, b, c = 0) {
  const value = Math.sin(a * 127.1 + b * 311.7 + c * 74.7) * 43758.5453;
  return value - Math.floor(value);
}

// Nudges each corner of a subdivided shape in or out a little, so a finer leaf clump or
// rock stays lumpy and hand-made instead of turning into a smooth ball. Shared corners
// move together, so no cracks open.
export function roughen(geometry, amount = 0.12, seed = 1) {
  if (!isDetailed()) return geometry;
  // Normals and UVs differ per face, so drop them before welding the corners together.
  geometry.deleteAttribute('normal');
  geometry.deleteAttribute('uv');
  const merged = mergeVertices(geometry);
  const position = merged.attributes.position;
  const vertex = new THREE.Vector3();
  for (let index = 0; index < position.count; index += 1) {
    vertex.fromBufferAttribute(position, index);
    const scale = 1 + (hash(index, seed, 3) - 0.5) * 2 * amount;
    vertex.multiplyScalar(scale);
    position.setXYZ(index, vertex.x, vertex.y, vertex.z);
  }
  const faceted = merged.toNonIndexed();
  faceted.computeVertexNormals();
  return faceted;
}
