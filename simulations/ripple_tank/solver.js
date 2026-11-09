// Step-by-step water waves on a grid, run on the graphics card, for the
// Diffraction tank. Each texel stores total height, the x-directed height
// contribution, and staggered x/y velocities. Splitting the wave equation
// by direction gives the edge sponge a matched absorbing layer: damping at
// the top/bottom acts only on y motion, leaving an incoming x-directed plane
// wave straight. Heights and velocities advance together with a fixed step.
// Barrier faces have zero normal velocity; a gradual sponge cuts their echoes.
import * as THREE from 'three';

const quadVertex = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const stepFragment = `
  uniform sampler2D uState;
  uniform sampler2D uMask;
  uniform float uSize;
  uniform float uK1;
  uniform float uK2;
  uniform float uDrive;
  uniform float uSource;
  uniform vec2 uSourceCell;
  uniform float uSourceR;
  uniform float uLineColumn;
  uniform float uSponge;

  bool outside(ivec2 p) {
    int n = int(uSize);
    return p.x < 0 || p.y < 0 || p.x >= n || p.y >= n;
  }

  // Each direction damps its own height/velocity pair, preserving impedance
  // through the sponge instead of scattering a plane wave off its side edges.
  vec2 retention(vec2 cell, float soak) {
    vec2 uv = cell / uSize;
    vec2 edge = min(uv, 1.0 - uv);
    vec2 d = 1.0 - smoothstep(vec2(0.0), vec2(uSponge), edge);
    return (1.0 - 0.06 * d * d * d) * (1.0 - 0.07 * soak * soak);
  }

  // Velocity lives halfway between neighboring height cells. Compute the
  // new value here and at the two preceding faces, so a single render pass
  // advances the staggered leapfrog scheme without another texture target.
  float velocity(ivec2 p, ivec2 axis) {
    ivec2 q = p + axis;
    if (outside(p) || outside(q)) return 0.0;
    vec4 a = texelFetch(uMask, p, 0);
    vec4 b = texelFetch(uMask, q, 0);
    if (a.r > 0.5 || b.r > 0.5) return 0.0;
    vec4 s = texelFetch(uState, p, 0);
    float h = texelFetch(uState, q, 0).r;
    vec2 keep = retention(vec2(p) + 0.5 + 0.5 * vec2(axis), 0.5 * (a.b + b.b));
    float damping = axis.x == 1 ? keep.x : keep.y;
    float before = axis.x == 1 ? s.b : s.a;
    float c = sqrt(a.g > 0.5 ? uK2 : uK1);
    return damping * before - sqrt(damping) * c * (h - s.r);
  }

  void main() {
    ivec2 p = ivec2(gl_FragCoord.xy);
    vec4 mask = texelFetch(uMask, p, 0);
    if (mask.r > 0.5) { gl_FragColor = vec4(0.0); return; }
    vec2 s = texelFetch(uState, p, 0).rg;
    float vx = velocity(p, ivec2(1, 0));
    float vy = velocity(p, ivec2(0, 1));
    vec2 divergence = vec2(vx - velocity(p - ivec2(1, 0), ivec2(1, 0)),
                           vy - velocity(p - ivec2(0, 1), ivec2(0, 1)));
    vec2 keep = retention(vec2(p) + 0.5, mask.b);
    float c = sqrt(mask.g > 0.5 ? uK2 : uK1);
    vec2 height = keep * vec2(s.g, s.r - s.g) - sqrt(keep) * c * divergence;

    // A soft source: it pushes the water without holding it, so waves coming
    // back pass straight through it instead of reflecting.
    if (uSource < 0.5) {
      if (p.x == int(uLineColumn)) height.x += uDrive;
    } else if (distance(vec2(p) + 0.5, uSourceCell) < uSourceR) {
      height += 0.5 * uDrive;
    }
    // A safety limit: real waves here never come near it.
    height = clamp(height, -4.0, 4.0);
    gl_FragColor = vec4(height.x + height.y, height.x, vx, vy);
  }
`;

// Returns null when the device cannot draw into float textures, which the solver needs.
export function createSolver(renderer, size) {
  const floatOk = renderer.extensions.has('EXT_color_buffer_float');
  const halfOk = floatOk || renderer.extensions.has('EXT_color_buffer_half_float');
  if (!renderer.capabilities.isWebGL2 || !halfOk) return null;
  // The screen blends between grid cells so the water looks smooth. Full-precision
  // textures can only be blended where the device allows it; otherwise use half precision.
  const useFloat = floatOk && renderer.extensions.has('OES_texture_float_linear');
  const options = {
    type: useFloat ? THREE.FloatType : THREE.HalfFloatType,
    format: THREE.RGBAFormat,
    // The solver only reads cell centers, where blended and unblended values agree.
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    wrapS: THREE.ClampToEdgeWrapping,
    wrapT: THREE.ClampToEdgeWrapping,
    depthBuffer: false,
    stencilBuffer: false
  };
  let read = new THREE.WebGLRenderTarget(size, size, options);
  let write = new THREE.WebGLRenderTarget(size, size, options);

  const maskData = new Uint8Array(size * size * 4);
  const mask = new THREE.DataTexture(maskData, size, size, THREE.RGBAFormat);
  // Linear filtering smooths barrier edges on screen. The solver only samples
  // texel centers, where linear and nearest filtering give the same value.
  mask.minFilter = THREE.LinearFilter;
  mask.magFilter = THREE.LinearFilter;
  mask.needsUpdate = true;

  const uniforms = {
    uState: { value: null },
    uMask: { value: mask },
    uSize: { value: size },
    uK1: { value: 0 },
    uK2: { value: 0 },
    uDrive: { value: 0 },
    uSource: { value: 0 },
    uSourceCell: { value: new THREE.Vector2(size * 0.2, size * 0.5) },
    uSourceR: { value: 2.5 },
    uLineColumn: { value: 0 },
    uSponge: { value: 0.15 } // 2.4 cm of the 16 cm tank
  };
  const material = new THREE.ShaderMaterial({ uniforms, vertexShader: quadVertex, fragmentShader: stepFragment });
  const quadScene = new THREE.Scene();
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
  quad.frustumCulled = false;
  quadScene.add(quad);
  const quadCamera = new THREE.Camera();

  function clear() {
    const color = renderer.getClearColor(new THREE.Color());
    const alpha = renderer.getClearAlpha();
    renderer.setClearColor(0x000000, 0);
    for (const target of [read, write]) {
      renderer.setRenderTarget(target);
      renderer.clear(true, false, false);
    }
    renderer.setRenderTarget(null);
    renderer.setClearColor(color, alpha);
  }

  // One time step. k1, k2: (v·dt/dx)²; drive: the height added by the source.
  function step({ k1, k2, drive, source, sourceCell, lineColumn }) {
    uniforms.uState.value = read.texture;
    uniforms.uK1.value = k1;
    uniforms.uK2.value = k2;
    uniforms.uDrive.value = drive;
    uniforms.uSource.value = source === 'point' ? 1 : 0;
    if (sourceCell) uniforms.uSourceCell.value.copy(sourceCell);
    uniforms.uLineColumn.value = lineColumn;
    renderer.setRenderTarget(write);
    renderer.render(quadScene, quadCamera);
    renderer.setRenderTarget(null);
    [read, write] = [write, read];
  }

  function setMask(data) {
    maskData.set(data);
    mask.needsUpdate = true;
  }

  clear();
  return {
    size,
    mask,
    get texture() { return read.texture; },
    clear,
    step,
    setMask,
    precision: useFloat ? 'float' : 'half'
  };
}
