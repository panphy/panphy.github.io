// The inverse square law in three dimensions, over the flat b1-inverse-square figure of slide 34:
// the power of a source spreads over the whole of every sphere around it, of area 4πr². Built,
// turned and zoomed by ../assets/model3d.js.
import { model3d } from '../assets/model3d.js';

const D = 1.5;                  // the radius d of the inner sphere; the outer one is 2d
const CONE = 0.3;               // half the angle of the patch each sphere shows lit, in radians
const WAVE = 3.2;               // seconds for a wavefront to travel from the source to beyond 2d

model3d('brightness', ({ THREE, scene, css, label, caption }) => {
  scene.add(new THREE.HemisphereLight(0xffffff, 0x8a8078, 1.4));
  const sun = new THREE.DirectionalLight(0xffffff, 1.2);
  sun.position.set(-3, 6, 5);
  scene.add(sun);

  // The source: a small faceted ball.
  const sourceMaterial = new THREE.MeshStandardMaterial({ roughness: 0.5, flatShading: true, emissiveIntensity: 0.6 });
  scene.add(new THREE.Mesh(new THREE.IcosahedronGeometry(0.16, 1), sourceMaterial));

  // The two spheres: low-poly, see-through, with their facet edges drawn faintly. Each is the
  // surface the source's whole power crosses.
  const shellMaterials = [], edgeMaterials = [];
  const shell = r => {
    const geometry = new THREE.SphereGeometry(r, 18, 12);
    const material = new THREE.MeshStandardMaterial({ roughness: 0.9, flatShading: true, transparent: true, opacity: 0.07, depthWrite: false, side: THREE.DoubleSide });
    const edges = new THREE.LineBasicMaterial({ transparent: true, opacity: 0.2, depthWrite: false });
    scene.add(new THREE.Mesh(geometry, material), new THREE.LineSegments(new THREE.EdgesGeometry(geometry, 1), edges));
    shellMaterials.push(material);
    edgeMaterials.push(edges);
  };
  shell(D);
  shell(2 * D);

  // The lit patches: the part of each sphere inside one cone from the source, facing +x. On the
  // inner sphere it is one patch of area A; on the outer sphere the same cone covers four patches
  // of that size, each a quarter as bright.
  const patchMaterials = [];
  const patch = (r, phi0, phiLength, theta0, thetaLength, glow) => {
    const material = new THREE.MeshStandardMaterial({ roughness: 0.6, flatShading: true, side: THREE.DoubleSide, emissiveIntensity: glow });
    scene.add(new THREE.Mesh(new THREE.SphereGeometry(r * 1.004, 6, 6, phi0, phiLength, theta0, thetaLength), material));
    patchMaterials.push(material);
  };
  // Three.js puts φ = π on the +x axis and θ = π/2 on the equator.
  patch(D, Math.PI - CONE, 2 * CONE, Math.PI / 2 - CONE, 2 * CONE, 1);
  [[0, 0], [0, 1], [1, 0], [1, 1]].forEach(([a, b]) => patch(2 * D, Math.PI - CONE + a * CONE + 0.006, CONE - 0.012, Math.PI / 2 - CONE + b * CONE + 0.006, CONE - 0.012, 0.25));

  // The four edges of the cone, from the source out to the outer sphere.
  const coneMaterial = new THREE.LineDashedMaterial({ dashSize: 0.1, gapSize: 0.07 });
  [[-1, -1], [-1, 1], [1, -1], [1, 1]].forEach(([a, b]) => {
    const dir = new THREE.Vector3(1, Math.tan(a * CONE), Math.tan(b * CONE)).normalize();
    const edge = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), dir.multiplyScalar(2 * D)]), coneMaterial);
    edge.computeLineDistances();
    scene.add(edge);
  });

  // A wavefront: a sphere that grows from the source and fades as it spreads out, drawn as a
  // tinted skin with its facet lines over it.
  const waveMaterial = new THREE.MeshBasicMaterial({ wireframe: true, transparent: true, depthWrite: false });
  const waveSkin = new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide });
  const waveGeometry = new THREE.SphereGeometry(1, 18, 12);
  const wave = new THREE.Group();
  wave.add(new THREE.Mesh(waveGeometry, waveSkin), new THREE.Mesh(waveGeometry, waveMaterial));
  scene.add(wave);

  label('source,<br>luminosity <i>L</i>', [-0.1, 0.5, 0]);
  label('<b>area <i>A</i></b><br>radius <i>d</i>', [D * 0.92, -D * Math.tan(CONE) - 0.62, 0]);
  label('<b>area 4<i>A</i></b><br>radius 2<i>d</i>', [2 * D, 2 * D * Math.tan(CONE) + 0.42, 0]);
  caption('The power <i>L</i> spreads over the whole sphere, 4π<i>r</i>²<br>At 2<i>d</i>: four times the area, <b>a quarter</b> of the brightness');

  return {
    look: [0.7, -0.1, 0],
    view: { turn: 0.7, lift: 0.32, far: 11.6 },
    sway: 0.1,
    alt: 'A small source at the centre of two spheres, of radius d and 2d. Its power spreads over the whole of each sphere. The same cone from the source lights a patch of area A on the inner sphere and a patch of area 4A, four times as large and a quarter as bright, on the outer sphere',
    still: WAVE * 0.3,
    paint() {
      const sand = css('--sand'), accent = new THREE.Color(css('--brand-accent')), primary = css('--brand-primary'), ink = css('--text-secondary');
      sourceMaterial.color.set(sand);
      sourceMaterial.emissive.copy(accent);
      shellMaterials.forEach(m => m.color.set(primary));
      edgeMaterials.forEach(m => m.color.set(ink));
      patchMaterials.forEach(m => { m.color.set(sand); m.emissive.copy(accent); });
      coneMaterial.color.set(ink);
      // A deeper apricot, so that the wavefront shows against a light background as well as a dark one.
      waveMaterial.color.copy(accent).lerp(new THREE.Color(css('--text-main')), 0.3);
      waveSkin.color.copy(accent);
    },
    // The wavefront's brightness falls as 1/r², like the light it carries.
    tick(t) {
      const r = 0.2 + (2 * D + 0.4) * ((t % WAVE) / WAVE), fade = Math.min(1, (D / r) ** 2);
      wave.scale.setScalar(r);
      waveMaterial.opacity = 0.75 * fade;
      waveSkin.opacity = 0.28 * fade;
    }
  };
});
