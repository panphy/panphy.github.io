// Why the mean intensity is S/4, in three dimensions, over the flat b2-quarter figure of slide 8:
// parallel sunlight of intensity S meets a planet of radius R. It intercepts the light crossing a
// disc of area πR², and as the planet turns that power is shared over the whole sphere, 4πR².
// Built, turned and zoomed by ../assets/model3d.js.
import { model3d } from '../assets/model3d.js';

const R = 1.2;                 // the planet's radius
const DISC = -2.2;             // where the intercepting disc is drawn, on the sunward side
const DAY = 14;                // seconds for the planet to turn once

model3d('quarter', ({ THREE, scene, css, label, caption }) => {
  // Sunlight comes from −x; a little light from the sky so that the night side is not black.
  scene.add(new THREE.HemisphereLight(0xffffff, 0x6f6a66, 0.55));
  const sun = new THREE.DirectionalLight(0xffffff, 2.4);
  sun.position.set(-10, 1.5, 2);
  scene.add(sun);

  // The planet: a faceted sphere whose faces have slightly different tints, so that it can be seen
  // to turn.
  const planetGeometry = new THREE.IcosahedronGeometry(R, 3).toNonIndexed();
  const tints = new Float32Array(planetGeometry.attributes.position.count * 3);
  planetGeometry.setAttribute('color', new THREE.BufferAttribute(tints, 3));
  const planetMaterial = new THREE.MeshStandardMaterial({ roughness: 0.85, flatShading: true, vertexColors: true });
  const planet = new THREE.Mesh(planetGeometry, planetMaterial);
  planet.rotation.z = 0.35;
  scene.add(planet);
  let seed = 11;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const shades = Array.from({ length: planetGeometry.attributes.position.count / 3 }, () => rand());

  // The disc the planet blocks: its cross-section, facing the Sun, with the edges of the cylinder of
  // light that it stops, running from the disc to the planet.
  const discMaterial = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false });
  const disc = new THREE.Mesh(new THREE.CircleGeometry(R, 32), discMaterial);
  disc.rotation.y = Math.PI / 2;
  disc.position.x = DISC;
  scene.add(disc);
  const rimMaterial = new THREE.LineBasicMaterial();
  const rim = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(Array.from({ length: 48 }, (_, i) => new THREE.Vector3(DISC, R * Math.sin(i / 48 * Math.PI * 2), R * Math.cos(i / 48 * Math.PI * 2)))), rimMaterial);
  scene.add(rim);
  const guideMaterial = new THREE.LineDashedMaterial({ dashSize: 0.1, gapSize: 0.07 });
  const dashed = (a, b) => { const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints([a, b]), guideMaterial); l.computeLineDistances(); scene.add(l); };
  [0, 1, 2, 3].forEach(k => { const a = k * Math.PI / 2, y = R * Math.sin(a), z = R * Math.cos(a); dashed(new THREE.Vector3(DISC, y, z), new THREE.Vector3(0, y, z)); });
  // The radius R, on the disc.
  dashed(new THREE.Vector3(DISC, 0, 0), new THREE.Vector3(DISC, R, 0));

  // Parallel rays of sunlight: arrows along +x, some passing the disc and some stopped by it.
  const rayMaterial = new THREE.MeshStandardMaterial({ roughness: 0.6, emissiveIntensity: 0.35 });
  const ray = (y, z, length) => {
    const group = new THREE.Group();
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, length - 0.22, 6), rayMaterial);
    shaft.rotation.z = -Math.PI / 2;
    shaft.position.x = (length - 0.22) / 2;
    const head = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.22, 8), rayMaterial);
    head.rotation.z = -Math.PI / 2;
    head.position.x = length - 0.11;
    group.add(shaft, head);
    group.position.set(DISC - 2.6, y, z);
    scene.add(group);
  };
  [[0, 0], [0.75, 0], [-0.75, 0], [0, 0.75], [0, -0.75]].forEach(([y, z]) => ray(y, z, 2.4));
  // Light that misses the planet passes it by.
  [[1.7, 0], [0, 1.7]].forEach(([y, z]) => ray(y, z, 5.0));

  label('sunlight,<br>intensity <i>S</i>', [DISC - 3.3, 0.9, 0]);
  label('<i>R</i>', [DISC, R * 0.5, -0.25]);
  label('<b>intercepted</b>: a disc,<br>area π<i>R</i>²', [DISC - 0.3, -R - 0.75, 0]);
  label('<b>shared</b> over a sphere,<br>area 4π<i>R</i>²', [0.4, R + 0.6, 0]);
  caption('Mean intensity: <i>S</i> × π<i>R</i>² ÷ 4π<i>R</i>² = <b><i>S</i>/4</b>');

  return {
    look: [-1.6, 0, 0],
    view: { turn: -0.85, lift: 0.22, far: 12.5 },
    sway: 0.1,
    alt: 'Parallel rays of sunlight of intensity S travel towards a planet of radius R. The planet stops the light that crosses a disc of area pi R squared, its cross-section facing the Sun. As the planet turns, that power is shared over its whole surface, a sphere of area 4 pi R squared, so the mean intensity is a quarter of S',
    still: 2,
    paint() {
      const sea = new THREE.Color(css('--electron')), land = new THREE.Color(css('--brand-primary')), accent = new THREE.Color(css('--brand-accent'));
      // Each face is blue or teal, a little lighter or darker, so the turning shows.
      const c = new THREE.Color();
      shades.forEach((s, i) => {
        c.copy(s < 0.3 ? land : sea).multiplyScalar(0.85 + 0.3 * ((s * 7) % 1));
        for (let k = 0; k < 3; k++) tints.set([c.r, c.g, c.b], (i * 3 + k) * 3);
      });
      planetGeometry.attributes.color.needsUpdate = true;
      discMaterial.color.copy(accent);
      rimMaterial.color.copy(accent).lerp(new THREE.Color(css('--text-main')), 0.35);
      rayMaterial.color.copy(accent);
      rayMaterial.emissive.copy(accent);
      guideMaterial.color.set(css('--text-secondary'));
    },
    tick(t) { planet.rotation.y = (t / DAY) * Math.PI * 2; }
  };
});
