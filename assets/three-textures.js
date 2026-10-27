// Procedural WebGL textures must not pass through a 2D canvas: Safari's canvas
// fingerprinting protection can introduce colored noise when it is uploaded.
// Pass the caller's THREE instance so apps can keep their existing CDN version.
export function rgbaTexture(THREE, width, height, pixel) {
  const data = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      data.set(pixel(x + 0.5, y + 0.5), (y * width + x) * 4);
    }
  }
  const texture = new THREE.DataTexture(data, width, height, THREE.RGBAFormat);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
}

// Stops are [radius, alpha], with radius measured from the center to the edge.
export function radialTexture(THREE, size, stops, rgb = [255, 255, 255]) {
  return rgbaTexture(THREE, size, size, (x, y) => {
    const r = Math.hypot(x - size / 2, y - size / 2) / (size / 2);
    let alpha = stops[stops.length - 1][1];
    for (let i = 1; i < stops.length; i += 1) {
      if (r > stops[i][0]) continue;
      const [from, a] = stops[i - 1];
      const [to, b] = stops[i];
      const t = Math.min(1, Math.max(0, (r - from) / (to - from)));
      alpha = a + (b - a) * t;
      break;
    }
    return [...rgb, Math.round(alpha * 255)];
  });
}
