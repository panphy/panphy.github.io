// Step-by-step water waves on a grid, run on the graphics card, for the
// Diffraction tank. Each texel holds the water height now (red) and one
// step earlier (green); every step applies the wave equation
//   u_next = 2u − u_prev + (v·dt/dx)² ∇²u
// The step length dt never changes between steps, which keeps the method
// stable. Barrier cells stay still, and their
// neighbors see a mirror, so waves reflect off them as off a wall. A wide,
// gradual damping strip round the edge soaks up waves so the tank walls do not echo.
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

  // Cells are read whole (texelFetch), never blended, so every step uses exact neighbor values.
  float neighbor(ivec2 p, float here, int n) {
    if (p.x < 0 || p.y < 0 || p.x >= n || p.y >= n) return here;
    if (texelFetch(uMask, p, 0).r > 0.5) return here;
    return texelFetch(uState, p, 0).r;
  }

  void main() {
    int n = int(uSize);
    ivec2 p = ivec2(gl_FragCoord.xy);
    vec4 mask = texelFetch(uMask, p, 0);
    if (mask.r > 0.5) { gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0); return; }
    vec2 s = texelFetch(uState, p, 0).rg;
    float u = s.r;
    float before = s.g;
    float lap = neighbor(p + ivec2(1, 0), u, n) + neighbor(p - ivec2(1, 0), u, n)
              + neighbor(p + ivec2(0, 1), u, n) + neighbor(p - ivec2(0, 1), u, n) - 4.0 * u;
    float k = mask.g > 0.5 ? uK2 : uK1;
    float next = 2.0 * u - before + k * lap;

    vec2 uv = (vec2(p) + 0.5) / uSize;
    float edge = min(min(uv.x, 1.0 - uv.x), min(uv.y, 1.0 - uv.y));
    float d = 1.0 - smoothstep(0.0, uSponge, edge);
    float soak = mask.b; // the absorbing strip in front of barriers
    // Both strips ramp up gradually: a gentle ramp soaks up waves without reflecting them.
    float keep = (1.0 - 0.06 * d * d * d) * (1.0 - 0.07 * soak * soak);
    next *= keep;
    u *= keep;

    // A soft source: it pushes the water without holding it, so waves coming
    // back pass straight through it instead of reflecting.
    if (uSource < 0.5) {
      if (p.x == int(uLineColumn)) next += uDrive;
    } else if (distance(vec2(p) + 0.5, uSourceCell) < uSourceR) {
      next += uDrive;
    }
    // A safety limit: real waves here never come near it.
    next = clamp(next, -4.0, 4.0);
    gl_FragColor = vec4(next, u, 0.0, 1.0);
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

  // One time step. k1, k2: (v·dt/dx)² (the same unless the water depth varies); drive: what the source adds this step.
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
