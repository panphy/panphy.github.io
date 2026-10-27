const { test } = require('node:test');
const assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');
const path = require('node:path');
const textures = import(pathToFileURL(path.join(__dirname, '../three-textures.js')).href);

// No DOM or canvas is supplied: procedural textures must work directly from RGBA.
const THREE = {
  DataTexture: class {
    constructor(data, width, height, format) { this.image = { data, width, height }; this.format = format; }
  },
  RGBAFormat: 'rgba', SRGBColorSpace: 'srgb', LinearFilter: 'linear', LinearMipmapLinearFilter: 'mipmap'
};
const pixel = (texture, x, y) => [...texture.image.data.slice((y * texture.image.width + x) * 4, (y * texture.image.width + x) * 4 + 4)];

test('radial textures preserve neutral RGB, transparent edges and mirror symmetry', async () => {
  const { radialTexture } = await textures;
  for (const [size, stops, rgb] of [
    [128, [[0, 1], [0.35, 0.45], [1, 0]], [255, 255, 255]],
    [64, [[0, 1], [0.5, 0.8], [1, 0]], [255, 255, 255]],
    [128, [[0, 0.55], [1, 0]], [0, 0, 0]],
    [256, [[0, 0], [0.3, 0], [0.335, 0.8], [1, 0]], [255, 255, 255]]
  ]) {
    const t = radialTexture(THREE, size, stops, rgb);
    assert.equal(t.image.data.length, size * size * 4);
    assert.equal(pixel(t, 0, 0)[3], 0);
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const p = pixel(t, x, y);
      assert.deepEqual(p.slice(0, 3), rgb);
      assert.deepEqual(p, pixel(t, size - x - 1, y));
      assert.deepEqual(p, pixel(t, x, size - y - 1));
    }
    assert.equal(t.colorSpace, THREE.SRGBColorSpace);
    assert.equal(t.magFilter, THREE.LinearFilter);
    assert.equal(t.minFilter, THREE.LinearMipmapLinearFilter);
    assert.equal(t.generateMipmaps, true);
    assert.equal(t.needsUpdate, true);
  }
});

test('gradient stops interpolate alpha at pixel centers, including a hollow halo', async () => {
  const { radialTexture } = await textures;
  const t = radialTexture(THREE, 5, [[0, 1], [0.4, 0.8], [0.8, 0]]);
  assert.equal(pixel(t, 2, 2)[3], 255);
  assert.equal(pixel(t, 3, 2)[3], 204);
  assert.equal(pixel(t, 4, 2)[3], 0);
  const halo = radialTexture(THREE, 5, [[0, 0], [0.4, 0.8], [0.8, 0]]);
  assert.equal(pixel(halo, 2, 2)[3], 0);
  assert.equal(pixel(halo, 3, 2)[3], 204);
});

test('RGBA masks keep straight alpha and sample pixel centers', async () => {
  const { rgbaTexture } = await textures;
  const t = rgbaTexture(THREE, 3, 3, (x, y) => [255, 255, 255, x === 1.5 || y === 1.5 ? 255 : 0]);
  assert.deepEqual(pixel(t, 0, 0), [255, 255, 255, 0]);
  assert.deepEqual(pixel(t, 1, 0), [255, 255, 255, 255]);
  assert.deepEqual(pixel(t, 0, 1), [255, 255, 255, 255]);
});
