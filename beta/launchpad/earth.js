// The Earth, its clouds and its atmosphere, drawn by one full-screen shader.
// The planet is an exact sphere found by ray tracing, so it holds up from the
// launch pad to high orbit with no mesh, no depth buffer and no precision loss:
// the camera's height comes in as exact numbers computed in double precision.
//
// Shader frame: origin at Earth's center, units of km, axes (east, up, south)
// at the craft. The scene uses the same axes in meters, centered on the craft.
import * as THREE from 'three';

const R_KM = 6371;
const ATMO_KM = 100;
const CLOUD_KM = 9;

const vertexShader = /* glsl */`
  uniform mat4 uInvProjection;
  uniform mat4 uCameraWorld;
  varying vec3 vRay;
  void main() {
    gl_Position = vec4(position.xy, 1.0, 1.0);
    vec4 view = uInvProjection * vec4(position.xy, 1.0, 1.0);
    vRay = mat3(uCameraWorld) * (view.xyz / view.w);
  }
`;

const fragmentShader = /* glsl */`
  precision highp float;
  varying vec3 vRay;
  uniform vec3 uCam;          // camera, km from Earth's center
  uniform float uC;           // |cam|^2 - R^2, exact
  uniform float uCA;          // |cam|^2 - (R + atmosphere)^2, exact
  uniform float uCC;          // |cam|^2 - (R + cloud deck)^2, exact
  uniform vec3 uSun;
  uniform float uLon0;        // longitude under the craft
  uniform float uCloudLon;    // drift of the clouds
  uniform float uPixelAngle;  // radians per pixel
  uniform float uDayWidth;
  uniform float uCloudWidth;
  uniform sampler2D tDay;
  uniform sampler2D tNight;
  uniform sampler2D tClouds;

  const float PI = 3.141592653589793;
  const float TAU = 6.283185307179586;
  const float R = ${R_KM.toFixed(1)};
  const float TOP = ${(2 * R_KM * ATMO_KM + ATMO_KM * ATMO_KM).toFixed(1)};
  const vec3 BETA_R = vec3(5.8e-3, 13.5e-3, 33.1e-3);
  const float BETA_M = 4.0e-3;
  const vec3 BETA_O = vec3(0.65e-3, 1.88e-3, 0.085e-3);
  const float SUN = 11.0;

  // Altitude from (|p|^2 - R^2), without subtracting two large numbers.
  float altitudeOf(float r2) { return r2 / (R + sqrt(max(R * R + r2, 0.0))); }

  vec3 densityAt(float h) {
    return vec3(exp(-h / 8.0), exp(-h / 1.2), max(0.0, 1.0 - abs(h - 25.0) / 15.0));
  }

  // How much sunlight reaches a point; r2 = |p|^2 - R^2, pl = dot(p, sun).
  vec3 sunlight(float r2, float pl) {
    if (pl < 0.0 && r2 - pl * pl < 0.0) return vec3(0.0);
    float reach = -pl + sqrt(max(pl * pl - (r2 - TOP), 0.0));
    float ds = reach / float(LIGHT_STEPS);
    vec3 depth = vec3(0.0);
    for (int i = 0; i < LIGHT_STEPS; i++) {
      float s = (float(i) + 0.5) * ds;
      depth += densityAt(max(altitudeOf(r2 + 2.0 * pl * s + s * s), 0.0));
    }
    depth *= ds;
    return exp(-(BETA_R * depth.x + BETA_M * 1.1 * depth.y + BETA_O * depth.z));
  }

  float hash(vec3 p) {
    p = fract(p * 0.3183099 + 0.1);
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
  }
  float noise(vec3 x) {
    vec3 i = floor(x), f = fract(x);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(hash(i), hash(i + vec3(1, 0, 0)), f.x), mix(hash(i + vec3(0, 1, 0)), hash(i + vec3(1, 1, 0)), f.x), f.y),
               mix(mix(hash(i + vec3(0, 0, 1)), hash(i + vec3(1, 0, 1)), f.x), mix(hash(i + vec3(0, 1, 1)), hash(i + vec3(1, 1, 1)), f.x), f.y), f.z);
  }
  float fbm(vec3 p) {
    float sum = 0.0, amp = 0.5;
    for (int i = 0; i < 4; i++) { sum += amp * noise(p); p *= 2.03; amp *= 0.5; }
    return sum;
  }

  // Turn a point in the craft's frame into one fixed to the turning Earth.
  vec3 earthFixed(vec3 p, float lon) {
    float c = cos(lon), s = sin(lon);
    return vec3(p.x * c + p.y * s, p.y * c - p.x * s, p.z);
  }
  vec2 mapUV(vec3 e) {
    vec3 n = normalize(e);
    return vec2(atan(n.x, n.y) / TAU + 0.5, asin(clamp(-n.z, -1.0, 1.0)) / PI + 0.5);
  }
  float mapLod(float dist, float facing, float width) {
    float footprint = dist * uPixelAngle / max(facing, 0.08);
    return log2(max(footprint * width / (TAU * R), 1.0));
  }

  // Cloud cover at a point of the cloud deck, with fine detail close up.
  float cloudCover(vec3 p, float dist, float facing) {
    vec3 e = earthFixed(p, uLon0 + uCloudLon);
    float cover = textureLod(tClouds, mapUV(e), mapLod(dist, facing, uCloudWidth)).r;
    float detail = smoothstep(4000.0, 300.0, dist);
    if (detail > 0.0) {
      float n = fbm(e * 0.02) * 0.65 + fbm(e * 0.11) * 0.35;
      cover = mix(cover, smoothstep(0.12, 0.88, cover + (n - 0.47) * 0.8 * smoothstep(0.02, 0.35, cover)), detail);
    }
    return cover;
  }

  void main() {
    vec3 d = normalize(vRay);
    vec3 o = uCam;
    float b = dot(o, d);
    float mu = dot(d, uSun);
    float dither = hash(vec3(gl_FragCoord.xy, 1.7));

    // Ground.
    bool ground = false;
    float tGround = 1e9;
    float discG = b * b - uC;
    if (b < 0.0 && discG > 0.0) { ground = true; tGround = uC / (-b + sqrt(discG)); }

    // Atmosphere shell.
    float tIn = 0.0, tOut = -1.0;
    float discA = b * b - uCA;
    if (discA > 0.0) {
      float s = sqrt(discA);
      if (uCA < 0.0) tOut = -b + s;
      else if (b < 0.0) { tIn = uCA / (-b + s); tOut = -b + s; }
    }
    if (ground) tOut = tGround;

    vec3 scatter = vec3(0.0);
    vec3 through = vec3(1.0);
    if (tOut > tIn) {
      float span = tOut - tIn;
      float ol = dot(o, uSun);
      bool inside = uCA < 0.0;
      float phaseR = 3.0 / (16.0 * PI) * (1.0 + mu * mu);
      float g = 0.76;
      float phaseM = 3.0 / (8.0 * PI) * ((1.0 - g * g) * (1.0 + mu * mu)) / ((2.0 + g * g) * pow(1.0 + g * g - 2.0 * g * mu, 1.5));
      vec3 depth = vec3(0.0);
      float prev = 0.0;
      for (int i = 0; i < VIEW_STEPS; i++) {
        // Inside the air, sample closely near the eye; from space, evenly.
        float u = (float(i) + 0.5 + (dither - 0.5) * 0.5) / float(VIEW_STEPS);
        float edge = float(i + 1) / float(VIEW_STEPS);
        float t = inside ? span * u * u : span * u;
        float next = inside ? span * edge * edge : span * edge;
        float dt = next - prev;
        prev = next;
        t += tIn;
        float r2 = uC + 2.0 * b * t + t * t;
        vec3 dens = densityAt(max(altitudeOf(r2), 0.0)) * dt;
        depth += dens * 0.5;
        vec3 view = exp(-(BETA_R * depth.x + BETA_M * 1.1 * depth.y + BETA_O * depth.z));
        vec3 sun = sunlight(r2, ol + t * mu);
        // A little light from the rest of the sky stands in for multiple scattering.
        vec3 ambient = vec3(0.03, 0.05, 0.09) * smoothstep(-0.25, 0.3, (ol + t * mu) / (R + 1.0));
        scatter += view * (sun * (BETA_R * dens.x * phaseR + BETA_M * dens.y * phaseM) + ambient * BETA_R * dens.x);
        depth += dens * 0.5;
      }
      through = exp(-(BETA_R * depth.x + BETA_M * 1.1 * depth.y + BETA_O * depth.z));
      scatter *= SUN;
    }

    vec3 color;
    float starlight = 0.0;
    if (ground) {
      vec3 p = o + d * tGround;
      vec3 n = normalize(p);
      float nl = dot(n, uSun);
      float facing = max(dot(n, -d), 0.0);
      vec3 e = earthFixed(p, uLon0);
      vec2 uv = mapUV(e);
      vec3 albedo = textureLod(tDay, uv, mapLod(tGround, facing, uDayWidth)).rgb;
      float water = smoothstep(0.0, 0.035, albedo.b - max(albedo.r, albedo.g) * 0.98) * (1.0 - smoothstep(0.25, 0.5, albedo.g));

      // Close to the ground the map runs out of pixels, so add texture of our own.
      albedo = pow(albedo, vec3(0.92)) * 1.35;
      float near = smoothstep(1200.0, 30.0, tGround);
      if (near > 0.0) {
        float broad = fbm(e * 0.25) - 0.47;
        float mid = fbm(e * 3.0) - 0.47;
        float fine = (fbm(e * 36.0) - 0.47) * smoothstep(40.0, 1.0, tGround);
        float land = near * (1.0 - water);
        albedo *= 1.0 + land * (broad * 1.1 + mid * 0.9 + fine * 0.8);
        // Drier, paler patches break up the green.
        albedo = mix(albedo, vec3(0.34, 0.30, 0.20), land * smoothstep(0.02, 0.22, broad + mid * 0.6) * 0.55);
      }

      vec3 sun = sunlight(0.0, R * nl) * SUN;
      float day = max(nl, 0.0);

      // Cloud shadows fall on the ground, shifted away from the sun.
      vec3 shadowPoint = p + uSun * (${CLOUD_KM.toFixed(1)} / max(nl, 0.15));
      float shade = 1.0 - 0.75 * cloudCover(shadowPoint, tGround, facing) * smoothstep(0.0, 0.2, nl);

      // Moonlight keeps the night side from going fully black.
      vec3 moon = vec3(0.0035, 0.0045, 0.0075) * SUN;
      vec3 skylight = vec3(0.10, 0.16, 0.28) * SUN * 0.12 * smoothstep(-0.12, 0.25, nl) + moon;
      color = albedo * (sun * day * shade / PI + skylight);

      // Sun glint on water.
      vec3 halfway = normalize(uSun - d);
      float glint = pow(max(dot(n, halfway), 0.0), 260.0) * 1.3 + pow(max(dot(n, halfway), 0.0), 30.0) * 0.07;
      color += water * sun * glint * shade * step(0.0, nl);

      // City lights after dark.
      vec3 lights = textureLod(tNight, uv, max(mapLod(tGround, facing, uDayWidth * 0.5), 0.0)).rgb;
      float glow = smoothstep(0.06, 0.6, dot(lights, vec3(0.3, 0.5, 0.2)));
      color += vec3(1.0, 0.72, 0.38) * glow * 1.1 * smoothstep(0.08, -0.12, nl);

      // Clouds above the ground, seen from above the deck.
      if (uCC > 0.0) {
        float s = sqrt(max(b * b - uCC, 0.0));
        float tCloud = uCC / (-b + s);
        vec3 pc = o + d * tCloud;
        vec3 nc = normalize(pc);
        float ncl = dot(nc, uSun);
        float cover = cloudCover(pc, tCloud, facing);
        vec3 cloudSun = sunlight(${(2 * R_KM * CLOUD_KM).toFixed(1)}, (R + ${CLOUD_KM.toFixed(1)}) * ncl) * SUN;
        vec3 cloud = cloudSun * (0.25 + 0.75 * smoothstep(-0.05, 0.5, ncl)) * max(ncl + 0.08, 0.0) / PI * 0.95
          + vec3(0.10, 0.16, 0.28) * SUN * 0.10 * smoothstep(-0.12, 0.25, ncl) + moon * 0.8;
        color = mix(color, cloud, cover);
      }
      color = color * through + scatter;
    } else {
      color = scatter;
      // The sun's disc; the bloom pass gives it its glare.
      float disc = smoothstep(0.99996, 0.999985, mu);
      color += through * disc * vec3(1.0, 0.96, 0.9) * 26.0;
      color += through * (pow(max(mu, 0.0), 2500.0) * 1.6 + pow(max(mu, 0.0), 160.0) * 0.12);

      // Clouds overhead, seen from below the deck.
      if (uCC < 0.0) {
        float tCloud = -b + sqrt(max(b * b - uCC, 0.0));
        vec3 pc = o + d * tCloud;
        vec3 nc = normalize(pc);
        float ncl = dot(nc, uSun);
        float cover = cloudCover(pc, tCloud, max(dot(nc, d), 0.05));
        vec3 cloudSun = sunlight(${(2 * R_KM * CLOUD_KM).toFixed(1)}, (R + ${CLOUD_KM.toFixed(1)}) * ncl) * SUN;
        // The underside is dimmer than the sunlit top.
        vec3 cloud = cloudSun * (0.16 + 0.1 * max(mu, 0.0)) * smoothstep(-0.1, 0.3, ncl) + vec3(0.10, 0.16, 0.28) * SUN * 0.08 * smoothstep(-0.12, 0.25, ncl);
        float haze = exp(-tCloud / 90.0);
        color = mix(color, cloud * haze + scatter * (1.0 - haze), cover * 0.9 * smoothstep(0.0, 0.06, d.y + 0.02));
      }
      starlight = through.g * (1.0 - clamp(dot(color, vec3(0.3, 0.5, 0.2)) * 30.0, 0.0, 1.0));
    }
    gl_FragColor = vec4(color, starlight);
  }
`;

export class Earth {
  constructor(textures, quality) {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3));
    this.uniforms = {
      uInvProjection: { value: new THREE.Matrix4() },
      uCameraWorld: { value: new THREE.Matrix4() },
      uCam: { value: new THREE.Vector3() },
      uC: { value: 1 }, uCA: { value: 1 }, uCC: { value: 1 },
      uSun: { value: new THREE.Vector3(1, 0, 0) },
      uLon0: { value: 0 }, uCloudLon: { value: 0 }, uPixelAngle: { value: 0.001 },
      uDayWidth: { value: textures.day.image.width },
      uCloudWidth: { value: textures.clouds.image.width },
      tDay: { value: textures.day }, tNight: { value: textures.night }, tClouds: { value: textures.clouds }
    };
    this.material = new THREE.ShaderMaterial({
      uniforms: this.uniforms, vertexShader, fragmentShader,
      defines: { VIEW_STEPS: quality === 'high' ? 16 : 10, LIGHT_STEPS: quality === 'high' ? 4 : 3 },
      depthTest: false, depthWrite: false, transparent: true,
      // Stars are drawn first; alpha says how much of them shows through.
      blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.SrcAlphaFactor,
      blendSrcAlpha: THREE.ZeroFactor, blendDstAlpha: THREE.OneFactor
    });
    this.mesh = new THREE.Mesh(geometry, this.material);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = -10;
  }

  // camera: the scene camera (meters, craft at the origin). altitude: the craft's, in meters.
  update(camera, altitude, sun, lon0, cloudLon, pixelAngle) {
    const u = this.uniforms;
    u.uInvProjection.value.copy(camera.projectionMatrixInverse);
    u.uCameraWorld.value.copy(camera.matrixWorld);
    const x = camera.position.x / 1000, z = camera.position.z / 1000;
    const h = (altitude + camera.position.y) / 1000;
    const base = x * x + z * z + h * (2 * R_KM + h);
    u.uCam.value.set(x, R_KM + h, z);
    u.uC.value = base;
    u.uCA.value = base - (2 * R_KM * ATMO_KM + ATMO_KM * ATMO_KM);
    u.uCC.value = base - (2 * R_KM * CLOUD_KM + CLOUD_KM * CLOUD_KM);
    u.uSun.value.copy(sun);
    u.uLon0.value = lon0;
    u.uCloudLon.value = cloudLon;
    u.uPixelAngle.value = pixelAngle;
  }
}
