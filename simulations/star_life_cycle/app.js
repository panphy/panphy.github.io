import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import {
  MASS_MIN, MASS_MAX, SUN_T, SUN_RADIUS_KM, AU_IN_RSUN, SN_COLLAPSE_END, SN_BREAKOUT,
  buildLife, lifeState, hrTrack, mainSequence, blackbodyRGB
} from './physics.js';
import { STAGES, ELEMENT, fmt } from './content.js';

const $ = id => document.getElementById(id);
const clamp = (x, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, x));
const smoothstep = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;

const STAGE_SECONDS = 14;
const MASS_STEPS = [0.1, 0.12, 0.15, 0.2, 0.25, 0.3, 0.4, 0.5, 0.6, 0.8, 1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10, 12, 15, 20, 25, 30, 40, 50, 60, 80, 100];
const NEUTRON_STAR_VISUAL = 0.24;
const BLACK_HOLE_VISUAL = 0.35;
const CAMERA_HOME = new THREE.Vector3(5.6, 4.7, 7.9);
const BASE_FOV = 40;
const KIND_CODE = { inert: 0, fusion: 1, radiative: 2, convective: 3, degenerate: 4, shell: 5 };
const KIND_LABEL = { inert: 'no fusion', fusion: 'fusion', radiative: 'radiation', convective: 'convection', degenerate: 'degenerate', shell: 'burns at its base' };
const STAGE_COLOUR = {
  cloud: '#8E99A4', proto: '#E07A10', ms: '#0D9488', blue: '#2F6FDB', rgb: '#D45132',
  pn: '#3F8A55', wd: '#657481', sg: '#D45132', late: '#7C3AED', sn: '#E11D48', ns: '#B7791F', bh: '#1B1B1B'
};
const FATE = {
  whiteDwarf: { name: 'white dwarf', colour: 'var(--fate-wd)' },
  neutronStar: { name: 'neutron star', colour: 'var(--fate-ns)' },
  blackHole: { name: 'black hole', colour: 'var(--fate-bh)' }
};

const state = { mass: 1, life: null, position: 0, playing: false, speed: 1, cutaway: false, layer: -1 };

const viewer = $('viewer');
const stageName = stage => (stage.id === 'sg' ? (stage.staysBlue ? 'Blue supergiant' : 'Red supergiant') : STAGES[stage.id].name);
const visualRadius = R => 1.25 * R ** 0.17;
// Blackbody colour with the saturation strengthened, so that cool and hot stars are easy to tell apart.
function starRGB(T) {
  const rgb = blackbodyRGB(T);
  const grey = 0.3 * rgb[0] + 0.59 * rgb[1] + 0.11 * rgb[2];
  const out = rgb.map(c => clamp(grey + (c - grey) * 2.2));
  out[1] *= lerp(0.72, 1, clamp((T - 2500) / 2500));
  return out;
}

/* ───────────────────────── Three.js scene ───────────────────────── */

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setClearColor(0x08080a);
viewer.prepend(renderer.domElement);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(BASE_FOV, 1, 0.1, 3000);
camera.position.copy(CAMERA_HOME);
const controls = new OrbitControls(camera, viewer);
controls.enableDamping = true;
controls.enablePan = false;
controls.minDistance = 3.5;
controls.maxDistance = 42;

const NOISE_GLSL = `
float hash(vec3 p){ p = fract(p*0.3183099+0.1); p *= 17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
float noise(vec3 x){ vec3 i=floor(x), f=fract(x); f=f*f*(3.-2.*f);
  return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x), mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),
             mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x), mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z); }
float fbm(vec3 p){ float a=.5, s=0.; for(int i=0;i<4;i++){ s+=a*noise(p); p=p*2.03+7.1; a*=.5; } return s/0.9375; }
`;

// Background stars. The same shader bends their light around a black hole with the lens equation
// β = θ − θE²/θ, where θE² = 2 r_s / D for sources far behind a hole at distance D.
const sky = new THREE.Mesh(
  new THREE.SphereGeometry(1500, 48, 24),
  new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, depthTest: false,
    uniforms: { uHole: { value: 0 }, uHoleDir: { value: new THREE.Vector3(0, 0, -1) }, uEinstein2: { value: 0.05 }, uShadow: { value: 0.06 } },
    vertexShader: 'varying vec3 vDir; void main(){ vDir = position; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader: `
      varying vec3 vDir; uniform float uHole, uEinstein2, uShadow; uniform vec3 uHoleDir;
      ${NOISE_GLSL}
      vec3 hash33(vec3 p){ p = fract(p*vec3(.1031,.1030,.0973)); p += dot(p,p.yxz+33.33); return fract((p.xxy+p.yxx)*p.zyx); }
      vec3 starLayer(vec3 d, float scale, float sharp, float gain, float density){
        vec3 p = d*scale; vec3 cell = floor(p); vec3 col = vec3(0.);
        for(int i=-1;i<=1;i++) for(int j=-1;j<=1;j++) for(int k=-1;k<=1;k++){
          vec3 c = cell + vec3(float(i),float(j),float(k));
          vec3 h = hash33(c);
          if (h.x > density) continue;
          vec3 sd = normalize(c + 0.15 + 0.7*hash33(c+7.3));
          float dist = length(sd - d)*scale;
          float b = h.y*h.y;
          col += exp(-dist*dist*sharp)*(0.25 + 1.5*b)*gain*mix(vec3(1.,.82,.62), vec3(.72,.86,1.), h.z);
        }
        return col;
      }
      void main(){
        vec3 d = normalize(vDir);
        float shade = 1.; float ring = 0.;
        if (uHole > 0.001) {
          float c = dot(d, uHoleDir);
          float theta = acos(clamp(c, -1., 1.));
          vec3 n = normalize(d - uHoleDir*c);
          float beta = theta - uHole*uEinstein2/max(theta, 1e-4);
          d = normalize(uHoleDir*cos(beta) + n*sin(beta));
          float edge = uShadow*uHole;
          shade = smoothstep(edge*0.97, edge*1.03, theta);
          ring = exp(-pow((theta - edge*1.05)/(edge*0.035), 2.))*0.22*uHole;
        }
        vec3 col = starLayer(d, 26., 420., 1.1, .16) + starLayer(d, 61., 170., .5, .22);
        float band = exp(-pow(d.y*2.6 + 0.3*d.x, 2.));
        col += vec3(.060,.046,.050)*band*(0.35 + fbm(d*5.));
        col += vec3(.012,.020,.024)*fbm(d*2.3 + 4.);
        gl_FragColor = vec4(col*shade + vec3(1.,.93,.82)*ring, 1.);
      }`
  })
);
sky.frustumCulled = false;
sky.renderOrder = -10;
scene.add(sky);

function additivePoints(count, fill, vertexShader, uniforms) {
  const position = new Float32Array(count * 3);
  const seed = new Float32Array(count * 3);
  const v = new THREE.Vector3();
  for (let i = 0; i < count; i += 1) {
    fill(v, i);
    position.set([v.x, v.y, v.z], i * 3);
    seed.set([Math.random(), Math.random(), Math.random()], i * 3);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(position, 3));
  geometry.setAttribute('aSeed', new THREE.BufferAttribute(seed, 3));
  const points = new THREE.Points(geometry, new THREE.ShaderMaterial({
    uniforms: { uPx: { value: 600 }, ...uniforms },
    vertexShader,
    fragmentShader: 'varying vec3 vCol; varying float vAlpha; void main(){ float a = smoothstep(.5, 0., length(gl_PointCoord-.5)); gl_FragColor = vec4(vCol, a*a*vAlpha); }',
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
  }));
  points.frustumCulled = false;
  points.renderOrder = 1;
  scene.add(points);
  return points;
}

const randomDirection = v => {
  const u = Math.random() * 2 - 1;
  const phi = Math.random() * Math.PI * 2;
  const s = Math.sqrt(1 - u * u);
  return v.set(s * Math.cos(phi), u, s * Math.sin(phi));
};

// The collapsing cloud and the disc it turns into. Angular momentum is conserved, so the gas
// orbits faster as it moves inward and the cloud flattens along its spin axis.
const cloud = additivePoints(15000, v => {
  randomDirection(v);
  const lump = 0.75 + 0.25 * Math.sin(v.x * 3.1 + 1) * Math.sin(v.y * 2.7 + 2) + 0.25 * Math.sin(v.z * 4.3 + v.x * 2);
  v.multiplyScalar(6.4 * Math.random() ** 0.55 * lump);
}, `
  attribute vec3 aSeed; uniform float uCollapse, uSpin, uClear, uTime, uPx, uOpacity;
  varying vec3 vCol; varying float vAlpha;
  void main(){
    vec3 p0 = position;
    float rho0 = length(p0.xz); float phi = atan(p0.z, p0.x);
    float c = uCollapse;
    // About half of the gas falls all the way in and becomes the star; the rest settles into the disc.
    float falls = step(aSeed.x, 0.5);
    float s = falls*smoothstep(0.15 + 0.5*aSeed.y, 0.6 + 0.4*aSeed.y, c);
    float rho = rho0*mix(1., 0.62, c)*(1. - s);
    float y = p0.y*mix(1., 0.045, pow(c, 1.4))*(1. - s);
    float omega = pow(max(rho, 0.35), -1.5);
    phi += uSpin*omega;
    vec3 p = vec3(rho*cos(phi), y, rho*sin(phi));
    p += 0.22*(1. - c)*sin(uTime*0.25 + aSeed*6.283 + p0.yzx);
    float r = length(p);
    float heat = c*smoothstep(3.4, 0.4, r);
    vec3 dust = mix(vec3(.98,.50,.20), vec3(.30,.85,.78), smoothstep(.55, 1., aSeed.z));
    dust = mix(dust, vec3(.85,.35,.45), smoothstep(.0, .25, aSeed.z)*(1. - smoothstep(.25, .5, aSeed.z)));
    vCol = mix(dust, vec3(1.,.86,.55), heat);
    float gone = smoothstep(aSeed.y*0.85, aSeed.y*0.85 + 0.15, uClear);
    float grain = step(0.82, aSeed.x*0.5 + aSeed.z*0.5);
    vAlpha = uOpacity*mix(0.034, 0.26, grain)*(1. + 0.5*heat)*mix(1., mix(0.8, 1.7, grain), c)*(1. - s)*(1. - gone);
    vec4 mv = modelViewMatrix*vec4(p, 1.);
    gl_PointSize = mix(0.5, 0.11, grain)*mix(1., 0.5, c)*(0.5 + aSeed.y)*uPx/-mv.z;
    gl_Position = projectionMatrix*mv;
  }`, { uCollapse: { value: 0 }, uSpin: { value: 0 }, uClear: { value: 0 }, uTime: { value: 0 }, uOpacity: { value: 1 } });

const OUTFLOW_VERTEX = `
  attribute vec3 aSeed;
  uniform float uR0, uR1, uFlow, uPhase, uOpacity, uSize, uPx, uThick, uLumpy;
  uniform vec3 uColA, uColB, uSquash;
  varying vec3 vCol; varying float vAlpha;
  void main(){
    float f; float rad; float fade;
    if (uFlow > 0.5) {
      f = fract(aSeed.x + uPhase*(0.6 + 0.8*aSeed.y));
      rad = mix(uR0, uR1, f);
      fade = smoothstep(0., .08, f)*(1. - f)*(1. - f);
    } else {
      f = aSeed.x*aSeed.x;
      float lump = sin(position.x*9. + 1.3)*sin(position.y*11. + 2.1)*sin(position.z*7. + .5);
      rad = uR1*(1. - uThick*f)*(1. + uLumpy*lump);
      fade = 0.35 + 0.65*aSeed.z;
    }
    // Shells are mostly soft glowing gas, with a few bright knots.
    float knot = uFlow > 0.5 ? 1. : step(0.78, aSeed.y);
    fade *= mix(0.16, 1., knot);
    vec3 p = position*rad*uSquash;
    vCol = mix(uColA, uColB, f);
    vAlpha = uOpacity*fade;
    vec4 mv = modelViewMatrix*vec4(p, 1.);
    gl_PointSize = uSize*mix(4.2, 1., knot)*(0.5 + aSeed.y)*uPx/-mv.z;
    gl_Position = projectionMatrix*mv;
  }`;
const outflowUniforms = (extra = {}) => ({
  uR0: { value: 1 }, uR1: { value: 5 }, uFlow: { value: 1 }, uPhase: { value: 0 }, uOpacity: { value: 0 }, uSize: { value: 0.1 },
  uThick: { value: 0.5 }, uLumpy: { value: 0 }, uColA: { value: new THREE.Color(1, 1, 1) }, uColB: { value: new THREE.Color(1, 1, 1) },
  uSquash: { value: new THREE.Vector3(1, 1, 1) }, ...extra
});
const wind = additivePoints(2200, randomDirection, OUTFLOW_VERTEX, outflowUniforms());
const shell = additivePoints(9000, randomDirection, OUTFLOW_VERTEX, outflowUniforms({ uFlow: { value: 0 } }));
// Two narrow jets along the spin axis.
const jets = additivePoints(1400, (v, i) => {
  const spread = 0.075 * Math.sqrt(Math.random());
  const phi = Math.random() * Math.PI * 2;
  v.set(spread * Math.cos(phi), i % 2 ? 1 : -1, spread * Math.sin(phi)).normalize();
}, OUTFLOW_VERTEX, outflowUniforms({ uColA: { value: new THREE.Color(0.75, 1, 0.95) }, uColB: { value: new THREE.Color(0.3, 0.7, 1) }, uSize: { value: 0.12 }, uR0: { value: 0.6 }, uR1: { value: 9.5 } }));

// The star: granulation from animated noise, colour from the blackbody temperature and
// limb darkening I(μ) = 0.4 + 0.6 μ (the Eddington approximation).
const starGroup = new THREE.Group();
scene.add(starGroup);
const starMaterial = new THREE.ShaderMaterial({
  uniforms: {
    uColor: { value: new THREE.Color(1, 0.9, 0.7) }, uTime: { value: 0 }, uSpin: { value: 0 }, uCells: { value: 9 },
    uContrast: { value: 0.2 }, uSpots: { value: 0 }, uGain: { value: 1 }, uCut: { value: 0 }, uOpacity: { value: 1 }
  },
  transparent: true,
  vertexShader: `
    varying vec3 vObj; varying vec3 vNormal; varying vec3 vView;
    void main(){
      vObj = position; vec4 wp = modelMatrix*vec4(position, 1.);
      vNormal = normalize(mat3(modelMatrix)*normal); vView = normalize(cameraPosition - wp.xyz);
      gl_Position = projectionMatrix*viewMatrix*wp;
    }`,
  fragmentShader: `
    varying vec3 vObj; varying vec3 vNormal; varying vec3 vView;
    uniform vec3 uColor; uniform float uTime, uSpin, uCells, uContrast, uSpots, uGain, uCut, uOpacity;
    ${NOISE_GLSL}
    void main(){
      if (uCut > .5 && vObj.x > 0. && vObj.y > 0. && vObj.z > 0.) discard;
      float cs = cos(uSpin), sn = sin(uSpin);
      vec3 p = vec3(cs*vObj.x + sn*vObj.z, vObj.y, -sn*vObj.x + cs*vObj.z);
      float cells = 0.62*fbm(p*uCells + vec3(0., uTime*0.11, uTime*0.07)) + 0.38*fbm(p*uCells*2.6 - uTime*0.16);
      float bright = 1. + uContrast*2.4*(cells - 0.5);
      float spots = uSpots*smoothstep(0.66, 0.74, fbm(p*1.7 + 11.));
      float mu = max(dot(normalize(vNormal), normalize(vView)), 0.);
      float limb = 0.4 + 0.6*mu;
      vec3 col = uColor*mix(vec3(1.,.84,.70), vec3(1.), mu)*bright*limb*(1. - 0.55*spots)*uGain;
      col += vec3(1.)*max(bright - 1., 0.)*0.22*uGain*limb;
      gl_FragColor = vec4(col, uOpacity);
    }`
});
const starMesh = new THREE.Mesh(new THREE.SphereGeometry(1, 96, 64), starMaterial);
starGroup.add(starMesh);

// The cutaway removes the octant x, y, z > 0. Three quarter-discs close it and show the layers.
const layerUniforms = {
  uRad: { value: new Array(8).fill(1) }, uKind: { value: new Array(8).fill(0) },
  uCol: { value: Array.from({ length: 8 }, () => new THREE.Color(1, 1, 1)) },
  uCount: { value: 1 }, uTime: { value: 0 }, uSel: { value: -1 }, uShock: { value: -1 }, uOpacity: { value: 1 }
};
const faceMaterial = new THREE.ShaderMaterial({
  side: THREE.DoubleSide, transparent: true, uniforms: layerUniforms,
  vertexShader: 'varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }',
  fragmentShader: `
    varying vec2 vP;
    uniform float uRad[8]; uniform float uKind[8]; uniform vec3 uCol[8];
    uniform int uCount; uniform float uTime, uSel, uShock, uOpacity;
    ${NOISE_GLSL}
    void main(){
      float r = length(vP); float ang = atan(vP.y, vP.x);
      int idx = 0; float inner = 0.;
      for (int i = 0; i < 7; i++) { if (i < uCount - 1 && r > uRad[i]) { idx = i + 1; inner = uRad[i]; } }
      float outer = uRad[idx]; float kind = uKind[idx]; vec3 base = uCol[idx];
      float t = clamp((r - inner)/max(outer - inner, 1e-4), 0., 1.);
      vec3 col = base*0.74;
      if (kind < 0.5) {
        col *= 0.82 + 0.18*noise(vec3(vP*42., 0.));
      } else if (kind < 1.5) {
        float pulse = 0.72 + 0.28*sin(uTime*3.2 - r*46.);
        float sparkle = pow(noise(vec3(vP*70., uTime*2.2)), 3.);
        col = mix(base, vec3(1.,.97,.86), 0.5*pulse) + sparkle*0.55;
      } else if (kind < 2.5) {
        float wave = 0.5 + 0.5*sin(r*64. - uTime*1.3 + noise(vec3(vP*7., uTime*.15))*7.);
        col *= 0.82 + 0.22*wave;
      } else if (kind < 3.5) {
        // Convection: alternate columns of hot gas rising and cooler gas sinking.
        float wob = (noise(vec3(vP*3.5, uTime*0.08)) - .5)*0.32;
        float lane = sin((ang + wob)*16.);
        float up = smoothstep(-.25, .25, lane);
        float stripe = 0.5 + 0.5*sin(6.283*(t*3.2 - sign(lane)*uTime*0.42));
        col *= 0.66 + 0.3*up + 0.16*stripe*abs(lane);
      } else if (kind < 4.5) {
        vec2 g = abs(fract(vP*34.) - .5);
        col *= 0.8 + 0.26*smoothstep(.34, .12, max(g.x, g.y));
      } else {
        col = base*0.7 + vec3(1.,.95,.8)*exp(-t*7.)*0.55*(0.7 + 0.3*sin(uTime*4. + ang*22.));
      }
      float edge = min(inner > 0. ? r - inner : 1., outer < 0.999 ? outer - r : 1.);
      col *= 0.45 + 0.55*smoothstep(0., 0.007, edge);
      if (uSel > -0.5) col = abs(float(idx) - uSel) < 0.5 ? col*1.18 + 0.07 : col*0.42;
      if (uShock > 0.) {
        col = mix(col, vec3(1.,.72,.42), 0.45*step(r, uShock));
        col += vec3(1.,.93,.8)*exp(-pow((r - uShock)/0.022, 2.))*1.6;
      }
      gl_FragColor = vec4(col, uOpacity);
    }`
});
const quarterDisc = new THREE.CircleGeometry(1, 64, 0, Math.PI / 2);
const faces = [0, 1, 2].map(() => new THREE.Mesh(quarterDisc, faceMaterial));
faces[1].rotation.y = -Math.PI / 2;
faces[2].rotation.x = Math.PI / 2;
starGroup.add(...faces);

function radialTexture(stops) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const g = canvas.getContext('2d');
  const gradient = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  stops.forEach(([at, alpha]) => gradient.addColorStop(at, `rgba(255,255,255,${alpha})`));
  g.fillStyle = gradient;
  g.fillRect(0, 0, 256, 256);
  return new THREE.CanvasTexture(canvas);
}
const makeSprite = stops => {
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: radialTexture(stops), blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false, transparent: true, opacity: 0 }));
  sprite.renderOrder = 2;
  scene.add(sprite);
  return sprite;
};
// The halo is hollow so that it hugs the limb without washing out the surface or the cutaway.
const halo = makeSprite([[0, 0], [0.3, 0], [0.335, 0.8], [0.4, 0.42], [0.55, 0.14], [0.8, 0.03], [1, 0]]);
const flash = makeSprite([[0, 1], [0.12, 0.7], [0.3, 0.28], [0.6, 0.07], [1, 0]]);

// Pulsar: a dipole field tilted away from the spin axis, with a beam from each magnetic pole.
const pulsar = new THREE.Group();
const magnet = new THREE.Group();
magnet.rotation.z = 0.62;
pulsar.add(magnet);
pulsar.scale.setScalar(NEUTRON_STAR_VISUAL);
pulsar.traverse(object => { object.renderOrder = 1; });
scene.add(pulsar);
const beamGeometry = new THREE.ConeGeometry(2.6, 34, 32, 1, true).rotateX(Math.PI).translate(0, 17, 0);
const beamMaterial = new THREE.ShaderMaterial({
  transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, uniforms: { uOpacity: { value: 1 } },
  vertexShader: 'varying float vY; void main(){ vY = abs(position.y)/34.; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }',
  fragmentShader: 'varying float vY; uniform float uOpacity; void main(){ float a = pow(1. - vY, 1.6)*0.42*uOpacity; gl_FragColor = vec4(vec3(.55,.9,1.), a); }'
});
const beamUp = new THREE.Mesh(beamGeometry, beamMaterial);
const beamDown = new THREE.Mesh(beamGeometry, beamMaterial);
beamDown.rotation.x = Math.PI;
magnet.add(beamUp, beamDown);
const fieldMaterial = new THREE.LineBasicMaterial({ color: 0x5eead4, transparent: true, opacity: 0.4, depthWrite: false });
[1.9, 3.2, 5.4].forEach(shellSize => {
  const start = Math.asin(Math.sqrt(1 / shellSize));
  for (let k = 0; k < 6; k += 1) {
    const azimuth = k * Math.PI / 3;
    const points = [];
    for (let i = 0; i <= 48; i += 1) {
      const theta = lerp(start, Math.PI - start, i / 48);
      const r = shellSize * Math.sin(theta) ** 2;
      points.push(new THREE.Vector3(r * Math.sin(theta) * Math.cos(azimuth), r * Math.cos(theta), r * Math.sin(theta) * Math.sin(azimuth)));
    }
    magnet.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), fieldMaterial));
  }
});

/* ───────────────────────── Per-frame visuals ───────────────────────── */

const view = {
  radius: 1, hole: 0, spin: 0, cloudSpin: 0, windPhase: 0, jetPhase: 0, surfaceTime: 0, colour: new THREE.Color(1, 0.9, 0.7),
  // Eased copies of the stage targets, so that nothing snaps when a stage changes.
  star: 0, cells: 9, contrast: 0.2, spots: 0, flow: 1, spinRate: 0.15, pulse: 0, gain: 1, halo: 0,
  cloud: 0, collapse: 0, clear: 0, jets: 0, wind: 0, pulsar: 0,
  shell: 0, shellRadius: 3, shellKind: 'pn', flash: 0, flashScale: 5, flashColour: new THREE.Color(1, 1, 1),
  layerRad: [], layerCol: [], layerCount: 0
};
const targetColour = new THREE.Color();
const PN_OUTER = new THREE.Color(1, 0.3, 0.26);
const PN_INNER = new THREE.Color(0.2, 0.92, 0.78);
const SN_OUTER = new THREE.Color(1, 0.62, 0.3);
const SN_INNER = new THREE.Color(0.45, 0.78, 1);

// Surface looks: size and contrast of the convection cells, starspots, and how fast the pattern churns.
const PROTO_SURFACE = { cells: 5, contrast: 0.32, spots: 0.6, flow: 1 };
const GIANT_SURFACE = { cells: 2.3, contrast: 0.36, spots: 0, flow: 0.35 };
const HELIUM_SURFACE = { cells: 4, contrast: 0.26, spots: 0, flow: 0.7 };
const HOT_SURFACE = { cells: 4, contrast: 0.08, spots: 0, flow: 1 };
const SMOOTH_SURFACE = { cells: 4, contrast: 0, spots: 0, flow: 1 };
function mainSequenceSurface(M) {
  if (M < 0.5) return { cells: 6, contrast: 0.3, spots: 0.8, flow: 1 };
  if (M < 1.3) return { cells: 10, contrast: 0.22, spots: 0.35, flow: 1 };
  return { cells: 5, contrast: 0.05, spots: 0, flow: 1 };
}
const blendSurface = (a, b, t) => ({
  cells: lerp(a.cells, b.cells, t), contrast: lerp(a.contrast, b.contrast, t), spots: lerp(a.spots, b.spots, t), flow: lerp(a.flow, b.flow, t)
});

function currentLayers(st) {
  const make = STAGES[st.stage.id].layers;
  if (!make) return null;
  if (st.stage.id === 'sn' && st.p >= SN_BREAKOUT) return null;
  return make(context(st), st.p);
}

// What the scene should look like at this point in the life. Each stage starts from the look that the
// previous stage ended with and changes gradually, so neighbouring stages join up.
function stageTargets(st) {
  const { stage } = st;
  // A stage made of phases looks like whichever phase it is in.
  const id = st.phase.id || stage.id;
  const p = st.q;
  const M = state.mass;
  const main = mainSequenceSurface(M);
  const mainWind = M > 15 ? 0.3 : 0;
  const v = {
    star: 0, radius: st.R ? visualRadius(st.R) : 1, surface: main, spinRate: 0.15, pulse: 0,
    cloud: 0, collapse: 0, clear: 0, jets: 0, wind: 0, shell: null, flash: null, pulsar: 0, hole: 0, halo: 0.7
  };
  const debris = { radius: 10 + 40 * p, opacity: 0.55 * (1 - smoothstep(0, 0.5, p)), kind: 'sn' };
  const afterglow = { scale: 22, opacity: 0.19 * (1 - smoothstep(0, 0.15, p)), colour: [1, 0.66, 0.4] };
  const ignition = at => ({ scale: 7, opacity: 0.7 * Math.exp(-(((p - at) / 0.03) ** 2)), colour: [1, 0.95, 0.8] });

  if (id === 'cloud') {
    v.cloud = 1;
    v.collapse = 0.85 * smoothstep(0, 1, p);
    v.flash = { scale: 2.5 + 3 * p, opacity: 0.4 * smoothstep(0.45, 1, p), colour: [1, 0.3, 0.12] };
  } else if (id === 'proto') {
    const settle = smoothstep(0.6, 1, p);
    // The protostar emerges from the glowing centre of the cloud.
    v.star = smoothstep(0, 0.12, p);
    v.surface = blendSurface(PROTO_SURFACE, main, settle);
    v.spinRate = lerp(0.5, 0.15, settle);
    v.cloud = 1;
    v.collapse = 0.85 + 0.15 * smoothstep(0, 0.25, p);
    v.clear = p * 1.05;
    v.jets = smoothstep(0, 0.08, p) * (1 - smoothstep(0.5, 0.78, p));
    // The glow of the collapsing core fades; hydrogen fusion switches on at the very end.
    const glow = { scale: 5.5, opacity: 0.4 * (1 - smoothstep(0, 0.2, p)), colour: [1, 0.3, 0.12] };
    const spark = ignition(1);
    v.flash = spark.opacity > glow.opacity ? spark : glow;
  } else if (id === 'ms') {
    v.star = 1;
    v.wind = mainWind;
    v.flash = ignition(0);
  } else if (id === 'blue') {
    v.star = 1;
  } else if (id === 'rgb') {
    const swell = smoothstep(0, 0.5, p);
    v.star = 1;
    v.surface = blendSurface(main, GIANT_SURFACE, swell);
    v.spinRate = lerp(0.15, 0.02, swell);
    v.wind = 0.3 * p;
  } else if (id === 'he') {
    v.star = 1;
    v.surface = HELIUM_SURFACE;
    v.spinRate = 0.05;
    v.wind = 0.08;
  } else if (id === 'agb') {
    const swell = smoothstep(0, 0.4, p);
    v.star = 1;
    v.surface = blendSurface(HELIUM_SURFACE, GIANT_SURFACE, swell);
    v.spinRate = lerp(0.05, 0.02, swell);
    v.wind = lerp(0.08, 0.5 + 0.5 * p, swell);
    v.pulse = 0.035 * swell;
  } else if (id === 'pn') {
    v.star = 1;
    v.surface = blendSurface(GIANT_SURFACE, SMOOTH_SURFACE, smoothstep(0, 0.6, p));
    v.spinRate = 0.05;
    v.wind = 1 - smoothstep(0, 0.3, p);
    v.shell = { radius: 2.6 + 4.2 * p, opacity: smoothstep(0, 0.12, p) * (1 - 0.4 * p), kind: 'pn' };
  } else if (id === 'wd') {
    v.star = 1;
    v.surface = SMOOTH_SURFACE;
    v.spinRate = 0.3;
    if (state.life.stages.some(s => s.id === 'pn')) v.shell = { radius: 6.8 + 40 * p, opacity: 0.6 * (1 - smoothstep(0, 0.14, p)), kind: 'pn' };
  } else if (id === 'sg' || id === 'late' || id === 'sn') {
    // Red supergiants get a few huge convection cells; the hottest stars stay smooth with fierce winds.
    const change = id !== 'sg' ? 1 : stage.staysBlue ? smoothstep(0, 0.4, p) : smoothstep(0.3, 0.9, p);
    v.star = 1;
    v.surface = blendSurface(main, stage.staysBlue ? HOT_SURFACE : GIANT_SURFACE, change);
    v.spinRate = lerp(0.15, stage.staysBlue ? 0.15 : 0.02, change);
    v.wind = lerp(mainWind, stage.staysBlue ? 0.9 : 0.6, change);
    if (id === 'sn' && p >= SN_BREAKOUT) {
      const t = (p - SN_BREAKOUT) / (1 - SN_BREAKOUT);
      const burst = Math.exp(-((t / 0.07) ** 2));
      v.star = 0; v.wind = 0; v.halo = 0;
      v.shell = { radius: 1.5 + 8.5 * t ** 0.75, opacity: 1 - 0.45 * t, kind: 'sn' };
      v.flash = { scale: lerp(8 + 14 * t, 60, burst), opacity: Math.max(burst, 0.75 * (1 - 0.75 * t)), colour: [1, lerp(0.66, 0.97, burst), lerp(0.4, 0.92, burst)] };
    }
  } else if (id === 'ns') {
    v.star = 1; v.radius = NEUTRON_STAR_VISUAL; v.surface = SMOOTH_SURFACE; v.spinRate = 7; v.pulsar = 1;
    v.shell = debris; v.flash = afterglow;
  } else if (id === 'bh') {
    v.hole = 1; v.halo = 0;
    v.shell = debris; v.flash = afterglow;
  }
  return v;
}

// Cutaway layers ease too. Layers are matched from the outside in, so a new core grows from the
// centre while the old core becomes the shell around it.
function easeLayers(layers, k) {
  const count = layers.length;
  if (count !== view.layerCount) {
    const shift = view.layerCount - count;
    const rad = [];
    const col = [];
    for (let i = 0; i < count; i += 1) {
      const from = i + shift;
      rad.push(view.layerRad[from] ?? (view.layerCount ? 0 : layers[i].r));
      col.push(view.layerCol[from] ?? new THREE.Color(ELEMENT[layers[i].el]));
    }
    view.layerRad = rad;
    view.layerCol = col;
    view.layerCount = count;
  }
  layers.forEach((layer, i) => {
    view.layerRad[i] += (layer.r - view.layerRad[i]) * k;
    view.layerCol[i].lerp(targetColour.set(ELEMENT[layer.el]), k);
  });
}

function applyVisuals(st, dt, time) {
  const { stage, p } = st;
  const id = stage.id;
  const v = stageTargets(st);
  const rate = perSecond => 1 - Math.exp(-dt * perSecond);
  const ease = (key, target, k) => { view[key] += (target - view[key]) * k; };
  const slow = rate(3);
  const medium = rate(5);
  const fast = rate(12);

  // Star surface. While the star is invisible its size and colour jump straight to the new values.
  const hidden = view.star < 0.02;
  ease('star', v.star, v.star < view.star && id === 'sn' ? fast : slow);
  ease('pulse', v.pulse, slow);
  const radius = v.radius * (1 + view.pulse * Math.sin(time * 1.4));
  ease('radius', radius, hidden ? 1 : rate(3.5));
  ease('spinRate', v.spinRate, slow);
  ease('cells', v.surface.cells, hidden ? 1 : slow);
  ease('contrast', v.surface.contrast, hidden ? 1 : slow);
  ease('spots', v.surface.spots, hidden ? 1 : slow);
  ease('flow', v.surface.flow, slow);
  view.spin += dt * view.spinRate;
  view.surfaceTime += dt * view.flow;
  if (st.T) {
    const rgb = starRGB(st.T);
    targetColour.setRGB(rgb[0], rgb[1], rgb[2]);
    view.colour.lerp(targetColour, hidden ? 1 : rate(3.5));
  }
  // Fainter stars are drawn dimmer, but never so dim that they vanish.
  ease('gain', st.L ? clamp(1.0 + 0.12 * Math.log10(st.L / 10), 0.34, 1.08) : 1, hidden ? 1 : slow);
  starGroup.visible = view.star > 0.01;
  starGroup.scale.setScalar(view.radius);
  const layers = v.star > 0 ? currentLayers(st) : null;
  if (layers) easeLayers(layers, medium);
  const cut = state.cutaway && !!layers;
  faces.forEach(face => { face.visible = cut; });
  const su = starMaterial.uniforms;
  su.uColor.value.copy(view.colour);
  su.uTime.value = view.surfaceTime;
  su.uSpin.value = view.spin;
  su.uCells.value = view.cells;
  su.uContrast.value = view.contrast;
  su.uSpots.value = view.spots;
  su.uGain.value = view.gain;
  su.uOpacity.value = view.star;
  su.uCut.value = cut ? 1 : 0;
  if (cut) {
    const lu = layerUniforms;
    lu.uCount.value = layers.length;
    layers.forEach((layer, i) => {
      lu.uRad.value[i] = view.layerRad[i];
      lu.uKind.value[i] = KIND_CODE[layer.kind];
      lu.uCol.value[i].copy(view.layerCol[i]);
    });
    lu.uTime.value = time;
    lu.uOpacity.value = view.star;
    lu.uSel.value = state.layer < layers.length ? state.layer : -1;
    lu.uShock.value = id === 'sn' && p > SN_COLLAPSE_END ? lerp(0.04, 1.02, (p - SN_COLLAPSE_END) / (SN_BREAKOUT - SN_COLLAPSE_END)) : -1;
  }
  ease('halo', v.halo, slow);
  halo.visible = view.star * view.halo > 0.01;
  halo.material.color.copy(view.colour);
  halo.material.opacity = view.halo * view.star * clamp(view.gain, 0.3, 1);
  halo.scale.setScalar(view.radius * 6);

  // Cloud, disc and jets. The cloud keeps its shape while it fades out.
  const cloudHidden = view.cloud < 0.02;
  ease('cloud', v.cloud, slow);
  if (v.cloud > 0) {
    ease('collapse', v.collapse, cloudHidden ? 1 : medium);
    ease('clear', v.clear, cloudHidden ? 1 : medium);
  }
  cloud.visible = view.cloud > 0.01;
  const cu = cloud.material.uniforms;
  view.cloudSpin += dt * (0.05 + 1.5 * view.collapse ** 2);
  cu.uCollapse.value = view.collapse;
  cu.uClear.value = view.clear;
  cu.uOpacity.value = view.cloud;
  cu.uSpin.value = view.cloudSpin;
  cu.uTime.value = time;
  ease('jets', v.jets, slow);
  jets.visible = view.jets > 0.01;
  view.jetPhase += dt * 0.55;
  jets.material.uniforms.uPhase.value = view.jetPhase;
  jets.material.uniforms.uOpacity.value = 0.75 * view.jets;

  // Stellar wind.
  ease('wind', v.wind, slow);
  wind.visible = view.wind > 0.01;
  view.windPhase += dt * 0.12;
  const wu = wind.material.uniforms;
  wu.uPhase.value = view.windPhase;
  wu.uR0.value = view.radius;
  wu.uR1.value = view.radius + 4.5;
  wu.uOpacity.value = 0.34 * view.wind;
  wu.uColA.value.copy(view.colour);
  wu.uColB.value.copy(view.colour).multiplyScalar(0.5);

  // Planetary nebula shell or supernova debris.
  if (v.shell) {
    if (view.shell < 0.01) view.shellRadius = v.shell.radius;
    view.shellKind = v.shell.kind;
    ease('shellRadius', v.shell.radius, medium);
  }
  ease('shell', v.shell ? v.shell.opacity : 0, medium);
  shell.visible = view.shell > 0.005;
  const hu = shell.material.uniforms;
  const pn = view.shellKind === 'pn';
  hu.uR1.value = view.shellRadius;
  hu.uOpacity.value = view.shell * (pn ? 0.5 : 0.62);
  hu.uThick.value = pn ? 0.45 : 0.7;
  hu.uLumpy.value = pn ? 0.05 : 0.2;
  hu.uSize.value = pn ? 0.14 : 0.12;
  hu.uColA.value.copy(pn ? PN_OUTER : SN_OUTER);
  hu.uColB.value.copy(pn ? PN_INNER : SN_INNER);
  hu.uSquash.value.set(pn ? 0.82 : 1, pn ? 1.22 : 1, pn ? 0.82 : 1);

  // Glows and flashes.
  if (v.flash && v.flash.opacity > 0.005) {
    targetColour.setRGB(...v.flash.colour);
    const k = view.flash < 0.01 ? 1 : fast;
    ease('flashScale', v.flash.scale, k);
    view.flashColour.lerp(targetColour, k);
  }
  ease('flash', v.flash ? v.flash.opacity : 0, fast);
  flash.visible = view.flash > 0.005;
  flash.material.color.copy(view.flashColour);
  flash.material.opacity = view.flash;
  flash.scale.setScalar(view.flashScale);

  ease('pulsar', v.pulsar, slow);
  pulsar.visible = view.pulsar > 0.01;
  pulsar.rotation.y = view.spin;
  beamMaterial.uniforms.uOpacity.value = view.pulsar;
  fieldMaterial.opacity = 0.4 * view.pulsar;

  // Black hole lens.
  ease('hole', v.hole, rate(2.5));
  const distance = camera.position.length();
  const ku = sky.material.uniforms;
  ku.uHole.value = view.hole;
  ku.uHoleDir.value.copy(camera.position).multiplyScalar(-1 / distance);
  ku.uEinstein2.value = 2 * BLACK_HOLE_VISUAL / distance;
  ku.uShadow.value = 2.6 * BLACK_HOLE_VISUAL / distance;
}

/* ───────────────────────── Interface ───────────────────────── */

const context = st => ({ M: state.mass, life: state.life, ms: state.life.ms, stage: st.stage, st });
const compactYears = y => fmt.years(y).replace(' years', ' yr');
const chipDuration = stage => {
  if (stage.id === 'sn') return 'seconds + months';
  if (stage.id === 'bh') return 'the end';
  if (stage.id === 'wd' || stage.id === 'ns') return 'the end';
  return compactYears(stage.years);
};

const css = name => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
let shownStage = -1;
let layerSignature = '';
let layerNames = '';
let lastLayers = null;
let notesKey = '';
let liveDirty = true;

function setMass(mass, keepInput = false) {
  const M = clamp(Number(mass.toPrecision(3)), MASS_MIN, MASS_MAX);
  const previous = state.life ? lifeState(state.life, state.position) : null;
  state.mass = M;
  state.life = buildLife(M);
  if (previous) {
    const same = state.life.stages.find(s => s.id === previous.stage.id);
    state.position = same ? same.index + previous.p : 0;
  }
  if (!keepInput) $('mass-input').value = M;
  $('mass-slider').value = Math.log10(M);
  $('mass-down').disabled = M <= MASS_MIN;
  $('mass-up').disabled = M >= MASS_MAX;
  document.querySelectorAll('#presets button').forEach(b => b.setAttribute('aria-pressed', String(Number(b.dataset.mass) === M)));

  const { life } = state;
  const fate = FATE[life.fate];
  const fateBox = $('fate');
  fateBox.style.setProperty('--fate-colour', fate.colour);
  const universe = life.outlivesUniverse ? ` That is ${fmt.sig(life.yearsToRemnant / 1.38e10, 2)} times the present age of the universe.` : '';
  fateBox.innerHTML = `A star of <b>${fmt.mass(M)}</b> shines for about ${fmt.years(life.yearsToRemnant)} and ends as a <b>${fate.name}</b> of ${fmt.mass(life.remnant)}.${universe}`;

  $('stages').innerHTML = life.stages.map((stage, i) => `<li><button type="button" data-index="${i}"><strong>${stageName(stage)}</strong><span>${chipDuration(stage)}</span><i></i></button></li>`).join('');
  $('scrub').max = life.stages.length;

  // Durations to scale. The remnant is left out because it has no end.
  const timed = life.stages.slice(0, -1);
  $('life-bar').innerHTML = timed.map(stage => `<span title="${stageName(stage)}" style="flex:${stage.years / life.yearsToRemnant};background:${STAGE_COLOUR[stage.id]}"></span>`).join('');
  $('durations').tBodies[0].innerHTML = life.stages.map((stage, i) => {
    const last = i === life.stages.length - 1;
    const share = stage.years / life.yearsToRemnant;
    const percent = last ? '' : share >= 0.001 ? ` · ${fmt.sig(share * 100, 2)}%` : ' · under 0.1%';
    const duration = stage.id === 'sn' ? 'under a second, then months' : last ? 'no end' : fmt.years(stage.years);
    return `<tr data-index="${i}"><td><i style="background:${STAGE_COLOUR[stage.id]}"></i></td><td>${stageName(stage)}</td><td>${duration}${percent}</td></tr>`;
  }).join('');
  liveDirty = true;
  $('life-caption').textContent = `This star spends ${fmt.sig(life.ms.years / life.yearsToRemnant * 100, 2)}% of its life on the main sequence. That is why most of the stars in the sky are main sequence stars.`;

  shownStage = -1;
  layerSignature = '';
  refresh(true);
}

function setPosition(position) {
  state.position = clamp(position, 0, state.life.stages.length);
  refresh();
}

function setPlaying(playing) {
  state.playing = playing;
  $('play').setAttribute('aria-pressed', String(playing));
  $('play-label').textContent = playing ? 'Pause' : 'Play';
  $('play-icon').setAttribute('d', playing ? 'M7 5h3v14H7zM14 5h3v14h-3z' : 'M8 5v14l11-7z');
}

function setCutaway(on) {
  state.cutaway = on;
  if (!on) state.layer = -1;
  layerSignature = '';
  refresh(true);
}

function selectLayer(index) {
  state.layer = state.layer === index ? -1 : index;
  if (state.layer >= 0 && !state.cutaway) state.cutaway = true;
  layerSignature = '';
  refresh(true);
}

function renderStageNotes(st) {
  const { stage } = st;
  const c = context(st);
  const notes = STAGES[stage.id];
  const count = state.life.stages.length;
  const last = stage.index === count - 1;
  $('stage-eyebrow').textContent = `STAGE ${stage.index + 1} OF ${count} · ${last ? 'THE END STATE' : stage.id === 'sn' ? 'SECONDS, THEN MONTHS' : fmt.years(stage.years).toUpperCase()}`;
  $('stage-name').textContent = stageName(stage);
  $('stage-tagline').textContent = notes.tagline;
  $('stage-body').innerHTML = notes.body(c);
  $('stage-look').textContent = notes.look(c);
  $('stage-deeper').innerHTML = notes.deeper(c);
  $('scene-title').textContent = stageName(stage).toUpperCase();
  const key = `${state.mass}|${stage.id}`;
  if (key !== notesKey) {
    notesKey = key;
    const aside = document.querySelector('aside');
    aside.scrollTop = 0;
    aside.classList.remove('swap');
    void aside.offsetWidth;
    aside.classList.add('swap');
  }
  document.querySelectorAll('#stages button').forEach((button, i) => {
    button.classList.toggle('done', i < stage.index);
    if (i === stage.index) button.setAttribute('aria-current', 'step'); else button.removeAttribute('aria-current');
    if (i !== stage.index) button.lastElementChild.style.width = '';
  });
  document.querySelectorAll('#durations tr').forEach((row, i) => row.classList.toggle('current', i === stage.index));
}

const liveText = st => {
  const notes = STAGES[st.stage.id];
  return notes.live ? notes.live(context(st)) : `<b>${stageName(st.stage)}.</b> ${notes.tagline}`;
};
// Keep the line under the 3D view as tall as its longest message in this life, so the controls below it never move.
const liveProbe = $('live').cloneNode();
liveProbe.removeAttribute('id');
liveProbe.removeAttribute('role');
liveProbe.setAttribute('aria-hidden', 'true');
liveProbe.style.cssText = 'position:absolute;visibility:hidden;pointer-events:none;min-height:0;margin:0';
function reserveLive() {
  const live = $('live');
  const width = live.getBoundingClientRect().width;
  if (!width) return;
  const texts = new Set();
  for (let s = 0; s < state.life.stages.length; s += 0.05) texts.add(liveText(lifeState(state.life, s)));
  live.after(liveProbe);
  liveProbe.style.width = `${width}px`;
  let height = 0;
  texts.forEach(text => { liveProbe.innerHTML = text; height = Math.max(height, liveProbe.offsetHeight); });
  liveProbe.remove();
  live.style.minHeight = `max(calc(3.1em + 20px), ${height}px)`;
}

function renderLayers(st) {
  const layers = currentLayers(st);
  lastLayers = layers;
  const cutaway = $('cutaway');
  cutaway.disabled = !layers;
  cutaway.setAttribute('aria-pressed', String(state.cutaway && !!layers));
  cutaway.classList.toggle('nudge', st.stage.id === 'late' || (st.stage.id === 'sn' && st.p < SN_BREAKOUT));
  const names = layers ? layers.map(l => l.name).join('|') : 'none';
  const signature = `${state.cutaway}|${state.layer}|${names}`;
  if (signature === layerSignature) return;
  const rebuild = names !== layerNames;
  layerSignature = signature;
  layerNames = names;
  $('layers-box').hidden = !layers;
  if (!layers) return;
  if (state.layer >= layers.length) state.layer = -1;
  $('layers-hint').textContent = state.cutaway
    ? 'Tap a layer here or in the cutaway. From the centre outward:'
    : 'Tap a layer to slice the star open. From the centre outward:';
  // Rebuild the list only when the layers themselves change, so a pressed button keeps keyboard focus.
  if (rebuild) $('layers').innerHTML = layers.map((layer, i) => `<li><button type="button" data-layer="${i}"><i style="background:${ELEMENT[layer.el]}"></i>${layer.name}<em>${KIND_LABEL[layer.kind]}</em></button></li>`).join('');
  document.querySelectorAll('#layers button').forEach((button, i) => button.setAttribute('aria-pressed', String(state.layer === i)));
  $('layer-info').textContent = state.layer >= 0 ? layers[state.layer].info : 'Layers are widened so that you can see them.';
}

function renderReadout(st) {
  const { stage } = st;
  const id = stage.id;
  $('r-age').textContent = id === 'sn' ? `collapse + ${fmt.years(st.seconds / 3.156e7)}` : fmt.years(st.age);
  $('r-mass').textContent = fmt.mass(st.mass);
  $('r-radius').textContent = id === 'bh' ? `${fmt.radius(st.R)} horizon` : fmt.radius(st.R);
  $('r-temp').textContent = id === 'bh' ? 'no surface' : fmt.temp(st.T);
  $('r-lum').textContent = id === 'cloud' ? 'infrared only' : id === 'bh' ? 'none' : fmt.lum(st.L);
  $('r-core').textContent = fmt.temp(st.coreT);

  const c = context(st);
  const notes = STAGES[id];
  const live = liveText(st);
  if ($('live').innerHTML !== live) $('live').innerHTML = live;
  const balance = notes.balance(c);
  const half = balance.v * 50;
  const fill = $('balance-fill');
  fill.style.left = `${Math.min(50, 50 + half)}%`;
  fill.style.right = `${Math.min(50, 50 - half)}%`;
  fill.style.background = balance.v < 0 ? 'var(--space-orange)' : 'var(--space-teal)';
  $('balance-marker').style.left = `${50 + half}%`;
  $('balance-text').textContent = balance.text;
  const current = document.querySelector('#stages button[aria-current] i');
  if (current) current.style.width = `${st.p * 100}%`;
  drawScale(st);
}

// True-scale inset: the star against the nearest familiar object.
const SCALE_REFERENCES = [
  { name: 'a city 20 km across', R: 10 / SUN_RADIUS_KM },
  { name: 'the Earth', R: 6371 / SUN_RADIUS_KM },
  { name: 'Jupiter', R: 69911 / SUN_RADIUS_KM },
  { name: 'the Sun', R: 1 },
  { name: "Mercury's orbit", R: 0.387 * AU_IN_RSUN, orbit: true },
  { name: "the Earth's orbit", R: AU_IN_RSUN, orbit: true },
  { name: "Jupiter's orbit", R: 5.2 * AU_IN_RSUN, orbit: true },
  { name: "Neptune's orbit", R: 30 * AU_IN_RSUN, orbit: true },
  { name: 'the gap to the nearest star', R: 134000 * AU_IN_RSUN, orbit: true }
];
function drawScale(st) {
  const canvas = $('scale-canvas');
  const g = canvas.getContext('2d');
  const w = canvas.width, h = canvas.height;
  g.clearRect(0, 0, w, h);
  if (!st.R) return;
  const reference = SCALE_REFERENCES.reduce((best, r) => (Math.abs(Math.log(r.R / st.R)) < Math.abs(Math.log(best.R / st.R)) ? r : best));
  const unit = 0.42 * h / Math.max(st.R, reference.R);
  const id = st.stage.id;
  const starRadius = Math.max(1.5, st.R * unit);
  const cx = w / 2, cy = h / 2;
  g.beginPath();
  g.arc(cx, cy, starRadius, 0, Math.PI * 2);
  if (id === 'bh') {
    g.fillStyle = '#000'; g.fill();
    g.strokeStyle = 'rgba(255,255,255,.8)'; g.lineWidth = 2; g.stroke();
  } else if (id === 'cloud' || (id === 'sn' && st.p >= SN_BREAKOUT)) {
    const fog = g.createRadialGradient(cx, cy, 0, cx, cy, starRadius);
    fog.addColorStop(0, 'rgba(251,146,60,.9)'); fog.addColorStop(1, 'rgba(251,146,60,.08)');
    g.fillStyle = fog; g.fill();
  } else {
    g.fillStyle = `#${view.colour.getHexString()}`; g.fill();
  }
  g.beginPath();
  g.arc(cx, cy, Math.max(1.5, reference.R * unit), 0, Math.PI * 2);
  g.setLineDash(reference.orbit ? [6, 6] : []);
  g.strokeStyle = '#5EEAD4'; g.lineWidth = 2.5; g.stroke();
  g.setLineDash([]);
  const ratio = st.R / reference.R;
  const what = id === 'cloud' ? 'Cloud' : id === 'bh' ? 'Horizon' : id === 'sn' && st.p >= SN_BREAKOUT ? 'Debris' : 'Star';
  const compare = Math.abs(Math.log(ratio)) < 0.05 ? 'the same width as' : ratio >= 1 ? `${fmt.sig(ratio, 2)}× wider than` : `${fmt.sig(1 / ratio, 2)}× narrower than`;
  $('scale-caption').innerHTML = `TRUE SCALE<br>${what} is ${compare} <span style="color:#5EEAD4">${reference.name}</span>`;
}

/* Hertzsprung–Russell diagram */
const HR = { tMax: Math.log10(250000), tMin: Math.log10(2000), lMin: -5.6, lMax: 6.8 };
let hrDirty = true;
function drawHR(st) {
  const canvas = $('hr-canvas');
  const box = canvas.parentElement.getBoundingClientRect();
  if (!box.width) return;
  const dpr = Math.min(window.devicePixelRatio, 2);
  if (canvas.width !== Math.round(box.width * dpr)) { canvas.width = Math.round(box.width * dpr); canvas.height = Math.round(box.height * dpr); }
  const g = canvas.getContext('2d');
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  const W = box.width, H = box.height;
  const pad = { l: 54, r: 14, t: 12, b: 46 };
  const x = T => pad.l + (HR.tMax - Math.log10(T)) / (HR.tMax - HR.tMin) * (W - pad.l - pad.r);
  const y = L => pad.t + (HR.lMax - Math.log10(L)) / (HR.lMax - HR.lMin) * (H - pad.t - pad.b);
  const text = css('--text-secondary'), main = css('--text-main'), grid = css('--chart-grid');
  g.clearRect(0, 0, W, H);
  g.font = `500 11px ${css('--font-mono')}`;
  g.lineWidth = 1;

  // Grid and axes.
  g.strokeStyle = grid; g.fillStyle = text; g.textAlign = 'right'; g.textBaseline = 'middle';
  for (let e = -4; e <= 6; e += 2) {
    g.beginPath(); g.moveTo(pad.l, y(10 ** e)); g.lineTo(W - pad.r, y(10 ** e)); g.stroke();
    g.fillText(e === 0 ? '1' : `10${String(e).replace('-', '⁻').replace(/\d/g, d => '⁰¹²³⁴⁵⁶⁷⁸⁹'[d])}`, pad.l - 8, y(10 ** e));
  }
  g.textAlign = 'center'; g.textBaseline = 'top';
  [100000, 30000, 10000, 5000, 3000].forEach(T => {
    g.beginPath(); g.moveTo(x(T), pad.t); g.lineTo(x(T), H - pad.b); g.stroke();
    g.fillText(T.toLocaleString('en-GB'), x(T), H - pad.b + 12);
  });
  // The colour of a hot body at each temperature.
  for (let px = pad.l; px < W - pad.r; px += 2) {
    const T = 10 ** (HR.tMax - (px - pad.l) / (W - pad.l - pad.r) * (HR.tMax - HR.tMin));
    const [r, gg, b] = starRGB(T);
    g.fillStyle = `rgb(${r * 255 | 0},${gg * 255 | 0},${b * 255 | 0})`;
    g.fillRect(px, H - pad.b, 2, 7);
  }
  g.fillStyle = text;
  g.fillText('Surface temperature / K  (hotter ←)', (pad.l + W - pad.r) / 2, H - 16);
  g.save(); g.translate(13, (pad.t + H - pad.b) / 2); g.rotate(-Math.PI / 2); g.textBaseline = 'middle';
  g.fillText('Brightness / L☉', 0, 0); g.restore();

  g.save();
  g.beginPath(); g.rect(pad.l, pad.t, W - pad.l - pad.r, H - pad.t - pad.b); g.clip();
  // Lines of constant radius, from L = R²(T/T☉)⁴.
  g.setLineDash([4, 5]); g.strokeStyle = text; g.globalAlpha = 0.55; g.textAlign = 'left'; g.textBaseline = 'bottom';
  [[0.01, '0.01 R☉'], [1, '1 R☉'], [100, '100 R☉']].forEach(([R, label]) => {
    const L = T => R * R * (T / SUN_T) ** 4;
    g.beginPath(); g.moveTo(x(250000), y(L(250000))); g.lineTo(x(2000), y(L(2000))); g.stroke();
    const T = R === 100 ? 9000 : R === 1 ? 20000 : 60000;
    g.fillText(label, x(T) + 4, y(L(T)) - 3);
  });
  g.setLineDash([]); g.globalAlpha = 1;

  // Main sequence band.
  g.strokeStyle = css('--chart-band'); g.lineWidth = 18; g.lineCap = 'round'; g.lineJoin = 'round';
  g.beginPath();
  for (let i = 0; i <= 60; i += 1) {
    const ms = mainSequence(10 ** (-1 + 3 * i / 60));
    if (i) g.lineTo(x(ms.T), y(ms.L)); else g.moveTo(x(ms.T), y(ms.L));
  }
  g.stroke();
  g.fillStyle = text; g.textAlign = 'left'; g.textBaseline = 'middle'; g.font = `600 11px ${css('--font-body')}`;
  g.textAlign = 'right';
  g.fillText('MAIN SEQUENCE', x(mainSequence(0.8).T) - 22, y(mainSequence(0.8).L) + 20);
  g.textAlign = 'left';
  g.fillText('GIANTS', x(4300), y(30));
  g.fillText('SUPERGIANTS', x(7000), y(1.2e6));
  g.fillText('WHITE DWARFS', x(60000), y(0.0006));

  // This star's track: solid where it has been, faint where it is going.
  const track = hrTrack(state.life, 28);
  const trackColour = css('--chart-track');
  g.lineWidth = 2.5; g.strokeStyle = trackColour;
  let previous = null;
  track.forEach(segment => {
    const stage = state.life.stages.find(s => s.id === segment.id);
    const first = segment.points[0];
    if (previous && (Math.abs(Math.log10(previous.T / first.T)) > 0.01 || Math.abs(Math.log10(previous.L / first.L)) > 0.01)) {
      g.globalAlpha = 0.3; g.setLineDash([2, 4]);
      g.beginPath(); g.moveTo(x(previous.T), y(previous.L)); g.lineTo(x(first.T), y(first.L)); g.stroke();
      g.setLineDash([]);
    }
    const passed = stage.index < st.index ? 1 : stage.index === st.index ? st.p : 0;
    const split = Math.round(passed * (segment.points.length - 1));
    const stroke = (from, to, alpha) => {
      if (to <= from) return;
      g.globalAlpha = alpha; g.beginPath();
      for (let i = from; i <= to; i += 1) { const pt = segment.points[i]; if (i === from) g.moveTo(x(pt.T), y(pt.L)); else g.lineTo(x(pt.T), y(pt.L)); }
      g.stroke();
    };
    stroke(0, split, 1);
    stroke(split, segment.points.length - 1, 0.28);
    previous = segment.points[segment.points.length - 1];
  });
  g.globalAlpha = 1;
  if (st.onChart) {
    const [r, gg, b] = starRGB(st.T);
    g.beginPath(); g.arc(x(st.T), y(st.L), 8, 0, Math.PI * 2);
    g.fillStyle = `rgb(${r * 255 | 0},${gg * 255 | 0},${b * 255 | 0})`; g.fill();
    g.lineWidth = 2.5; g.strokeStyle = main; g.stroke();
  }
  g.restore();

  const id = st.stage.id;
  $('hr-caption').innerHTML = st.onChart
    ? `<b>${stageName(st.stage)}:</b> ${fmt.temp(st.T)}, ${fmt.lum(st.L)}, ${fmt.radius(st.R)}.`
    : id === 'cloud' ? '<b>Not on the diagram yet.</b> The nebula is far too cold (10 K) to plot. The track begins when the protostar starts to glow.'
      : id === 'sn' ? `<b>Off the top of the diagram.</b> The supernova reaches about ${fmt.lum(3e9)}.`
        : id === 'ns' ? `<b>Off the left edge.</b> The surface is at ${fmt.temp(st.T)} and shines mostly in X-rays.`
          : '<b>Nothing to plot.</b> A black hole has no surface and gives out no light.';
}

let lastReadout = 0;
let lastHR = -1;
function refresh(force = false) {
  const st = lifeState(state.life, state.position);
  if (st.index !== shownStage || force) {
    shownStage = st.index;
    renderStageNotes(st);
    lastReadout = 0;
  }
  renderLayers(st);
  $('scrub').value = state.position;
  hrDirty = true;
}

/* Controls */
$('mass-input').addEventListener('change', event => {
  const value = Number(event.target.value);
  setMass(Number.isFinite(value) && value > 0 ? value : state.mass);
});
$('mass-input').addEventListener('keydown', event => { if (event.key === 'Enter') event.target.blur(); });
$('mass-slider').addEventListener('input', event => setMass(10 ** Number(event.target.value)));
$('mass-down').addEventListener('click', () => setMass([...MASS_STEPS].reverse().find(m => m < state.mass - 1e-9) ?? MASS_MIN));
$('mass-up').addEventListener('click', () => setMass(MASS_STEPS.find(m => m > state.mass + 1e-9) ?? MASS_MAX));
$('presets').addEventListener('click', event => {
  const button = event.target.closest('button');
  if (button) setMass(Number(button.dataset.mass));
});
$('stages').addEventListener('click', event => {
  const button = event.target.closest('button');
  if (button) setPosition(Number(button.dataset.index));
});
$('scrub').addEventListener('input', event => { setPlaying(false); setPosition(Number(event.target.value)); });
$('play').addEventListener('click', () => {
  if (!state.playing && state.position >= state.life.stages.length - 0.001) setPosition(0);
  setPlaying(!state.playing);
});
$('prev').addEventListener('click', () => {
  const index = Math.floor(Math.min(state.position, state.life.stages.length - 0.001));
  setPosition(state.position - index > 0.05 ? index : Math.max(0, index - 1));
});
$('next').addEventListener('click', () => setPosition(Math.min(state.life.stages.length - 1, Math.floor(state.position) + 1)));
document.querySelectorAll('.speed button').forEach(button => button.addEventListener('click', () => {
  state.speed = Number(button.dataset.speed);
  document.querySelectorAll('.speed button').forEach(b => b.setAttribute('aria-pressed', String(b === button)));
}));
$('cutaway').addEventListener('click', () => setCutaway(!state.cutaway));
$('layers').addEventListener('click', event => {
  const button = event.target.closest('button');
  if (button) selectLayer(Number(button.dataset.layer));
});
function resetCamera() {
  camera.position.copy(CAMERA_HOME);
  controls.target.set(0, 0, 0);
  controls.update();
}
// Reset view is a full reset: stop, go back to the start and restore the default view.
$('reset').addEventListener('click', () => {
  setPlaying(false);
  state.speed = 1;
  document.querySelectorAll('.speed button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.speed === '1')));
  state.cutaway = false;
  state.layer = -1;
  layerSignature = '';
  resetCamera();
  state.position = 0;
  refresh(true);
});
// Fullscreen, with an expanded-panel fallback for browsers without element fullscreen (iPhone).
// On wide screens the controls move into the right-hand column, beside the 3D view.
const workspace = $('workspace');
const viewerPanel = $('viewer-panel');
const sideControls = $('side-controls');
const notes = $('notes');
const fullscreenButton = $('fullscreen');
const wideQuery = window.matchMedia('(min-width: 900px)');
let fallbackFullscreen = false;
function placeControls() {
  const inSide = workspace.classList.contains('is-fullscreen') && wideQuery.matches;
  if (inSide && sideControls.parentElement !== notes) notes.prepend(sideControls);
  else if (!inSide && sideControls.parentElement !== viewerPanel) viewerPanel.append(sideControls);
  liveDirty = true;
}
function updateFullscreen() {
  const expanded = document.fullscreenElement === workspace || fallbackFullscreen;
  workspace.classList.toggle('is-fullscreen', expanded);
  document.body.classList.toggle('viewer-expanded', expanded);
  fullscreenButton.classList.toggle('is-fullscreen', expanded);
  fullscreenButton.setAttribute('aria-label', expanded ? 'Exit fullscreen' : 'Enter fullscreen');
  fullscreenButton.title = expanded ? 'Exit fullscreen' : 'Enter fullscreen';
  fullscreenButton.querySelector('path').setAttribute('d', expanded
    ? 'M9 4v5H4M20 9h-5V4M15 20v-5h5M4 15h5v5'
    : 'M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5');
  fullscreenButton.setAttribute('aria-pressed', String(expanded));
  placeControls();
}
wideQuery.addEventListener('change', placeControls);
fullscreenButton.addEventListener('click', async () => {
  if (document.fullscreenElement === workspace) {
    await document.exitFullscreen();
  } else if (fallbackFullscreen) {
    fallbackFullscreen = false;
    updateFullscreen();
  } else {
    try {
      await workspace.requestFullscreen();
    } catch {
      fallbackFullscreen = true;
      updateFullscreen();
    }
  }
});
document.addEventListener('fullscreenchange', updateFullscreen);
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && fallbackFullscreen) { fallbackFullscreen = false; updateFullscreen(); }
});
viewer.addEventListener('keydown', event => {
  if (event.key === ' ') { event.preventDefault(); $('play').click(); }
  else if (event.key === 'ArrowRight') { event.preventDefault(); setPosition(state.position + 0.02); }
  else if (event.key === 'ArrowLeft') { event.preventDefault(); setPosition(state.position - 0.02); }
});

// Picking a layer in the cutaway: find where the ray enters the removed octant, then which face it meets.
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
function pickLayer(event) {
  if (!state.cutaway || !lastLayers || !starGroup.visible) return -1;
  const rect = viewer.getBoundingClientRect();
  pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
  raycaster.setFromCamera(pointer, camera);
  const origin = raycaster.ray.origin.clone().divideScalar(view.radius);
  const direction = raycaster.ray.direction;
  const b = origin.dot(direction);
  const disc = b * b - (origin.lengthSq() - 1);
  if (disc < 0) return -1;
  const entry = origin.clone().addScaledVector(direction, -b - Math.sqrt(disc));
  if (!(entry.x > 0 && entry.y > 0 && entry.z > 0)) return -1;
  let best = Infinity;
  let hit = null;
  [['z', 'x', 'y'], ['x', 'y', 'z'], ['y', 'z', 'x']].forEach(([flat, a, b2]) => {
    if (Math.abs(direction[flat]) < 1e-6) return;
    const t = -origin[flat] / direction[flat];
    const point = origin.clone().addScaledVector(direction, t);
    if (t > 0 && t < best && point[a] > 0 && point[b2] > 0 && point.length() <= 1) { best = t; hit = point; }
  });
  if (!hit) return -1;
  const r = hit.length();
  const index = lastLayers.findIndex((layer, i) => r <= view.layerRad[i]);
  return index < 0 ? lastLayers.length - 1 : index;
}
// The same diagram as a small inset on the 3D view: the main sequence, this star's track and where it is now.
function drawMiniHR(st) {
  const track = hrTrack(state.life, 28);
  const canvas = $('mini-hr-canvas');
  const g = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const pad = { l: 10, r: 10, t: 10, b: 30 };
  const x = T => pad.l + (HR.tMax - Math.log10(T)) / (HR.tMax - HR.tMin) * (W - pad.l - pad.r);
  const y = L => pad.t + (HR.lMax - Math.log10(L)) / (HR.lMax - HR.lMin) * (H - pad.t - pad.b);
  g.clearRect(0, 0, W, H);
  g.lineCap = 'round'; g.lineJoin = 'round';
  // The colour of a hot body at each temperature, with the hot end on the left.
  for (let px = pad.l; px < W - pad.r; px += 2) {
    const [r, gg, b] = starRGB(10 ** (HR.tMax - (px - pad.l) / (W - pad.l - pad.r) * (HR.tMax - HR.tMin)));
    g.fillStyle = `rgb(${r * 255 | 0},${gg * 255 | 0},${b * 255 | 0})`;
    g.fillRect(px, H - pad.b + 4, 2, 6);
  }
  g.fillStyle = '#A8A49C'; g.font = `600 17px ${css('--font-mono')}`; g.textBaseline = 'alphabetic';
  g.textAlign = 'left'; g.fillText('HOT', pad.l, H - 1);
  g.textAlign = 'right'; g.fillText('COOL', W - pad.r, H - 1);
  g.strokeStyle = 'rgba(255,255,255,.22)'; g.lineWidth = 1.5;
  g.strokeRect(pad.l, pad.t, W - pad.l - pad.r, H - pad.t - pad.b);

  g.save();
  g.beginPath(); g.rect(pad.l, pad.t, W - pad.l - pad.r, H - pad.t - pad.b); g.clip();
  g.strokeStyle = 'rgba(94,234,212,.3)'; g.lineWidth = 16;
  g.beginPath();
  for (let i = 0; i <= 30; i += 1) {
    const ms = mainSequence(10 ** (-1 + 3 * i / 30));
    if (i) g.lineTo(x(ms.T), y(ms.L)); else g.moveTo(x(ms.T), y(ms.L));
  }
  g.stroke();
  g.strokeStyle = '#FB923C'; g.lineWidth = 3.5;
  track.forEach(segment => {
    const stage = state.life.stages.find(s => s.id === segment.id);
    const passed = stage.index < st.index ? 1 : stage.index === st.index ? st.p : 0;
    const split = Math.round(passed * (segment.points.length - 1));
    [[0, split, 1], [split, segment.points.length - 1, 0.3]].forEach(([from, to, alpha]) => {
      if (to <= from) return;
      g.globalAlpha = alpha; g.beginPath();
      for (let i = from; i <= to; i += 1) { const pt = segment.points[i]; if (i === from) g.moveTo(x(pt.T), y(pt.L)); else g.lineTo(x(pt.T), y(pt.L)); }
      g.stroke();
    });
  });
  g.globalAlpha = 1;
  if (st.onChart) {
    const [r, gg, b] = starRGB(st.T);
    g.beginPath(); g.arc(x(st.T), y(st.L), 11, 0, Math.PI * 2);
    g.fillStyle = `rgb(${r * 255 | 0},${gg * 255 | 0},${b * 255 | 0})`; g.fill();
    g.lineWidth = 3.5; g.strokeStyle = '#fff'; g.stroke();
  }
  g.restore();
  const id = st.stage.id;
  $('mini-hr-caption').innerHTML = `HR DIAGRAM<br>${st.onChart ? 'brighter ↑ · hotter ←'
    : id === 'cloud' ? 'too cold to plot yet' : id === 'sn' ? 'off the top' : id === 'ns' ? 'off the left edge' : 'nothing to plot'}`;
}

let downAt = null;
viewer.addEventListener('pointerdown', event => { downAt = [event.clientX, event.clientY]; });
viewer.addEventListener('pointerup', event => {
  if (!downAt || Math.hypot(event.clientX - downAt[0], event.clientY - downAt[1]) > 6) return;
  const index = pickLayer(event);
  if (index >= 0) selectLayer(index);
});
viewer.addEventListener('pointermove', event => { if (event.pointerType === 'mouse') viewer.classList.toggle('is-hovering', pickLayer(event) >= 0); });

function resize() {
  const width = viewer.clientWidth;
  const height = viewer.clientHeight;
  if (!width || !height) return;
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  // On tall screens widen the field of view so that the scene keeps its width.
  const half = Math.tan(THREE.MathUtils.degToRad(BASE_FOV / 2));
  camera.fov = THREE.MathUtils.radToDeg(2 * Math.atan(camera.aspect < 1.1 ? Math.min(half * 1.1 / camera.aspect, 1.1) : half));
  camera.updateProjectionMatrix();
  const px = renderer.domElement.height / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));
  [cloud, wind, shell, jets].forEach(points => { points.material.uniforms.uPx.value = px; });
  hrDirty = true;
  liveDirty = true;
}
new ResizeObserver(resize).observe(viewer);
new ResizeObserver(() => { hrDirty = true; }).observe($('hr-canvas').parentElement);
new MutationObserver(() => { hrDirty = true; }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

const clock = new THREE.Clock();
function frame() {
  const dt = Math.min(clock.getDelta(), 0.1);
  const time = clock.elapsedTime;
  if (state.playing) {
    const end = state.life.stages.length;
    // A stage made of several phases plays for twice as long, so that each phase can be seen.
    const stage = state.life.stages[Math.min(Math.floor(state.position), state.life.stages.length - 1)];
    const seconds = STAGE_SECONDS * (stage.phases && stage.phases.length > 1 ? 2 : 1);
    state.position = Math.min(end, state.position + dt * state.speed / seconds);
    if (state.position >= end) setPlaying(false);
    refresh();
  }
  const st = lifeState(state.life, state.position);
  controls.update();
  sky.position.copy(camera.position);
  applyVisuals(st, dt, time);
  if (time - lastReadout > 0.12 || lastReadout === 0) {
    lastReadout = time || 0.001;
    renderReadout(st);
  }
  // While playing, the diagram only needs to keep up roughly ten times a second.
  if (hrDirty && time - lastHR > (state.playing ? 0.1 : 0)) { hrDirty = false; lastHR = time; drawHR(st); drawMiniHR(st); }
  if (liveDirty) { liveDirty = false; reserveLive(); }
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

setMass(1);
resize();
resetCamera();
$('load-status').hidden = true;
requestAnimationFrame(frame);
