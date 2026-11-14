// The electron diffraction tube of slide 23 in three dimensions, over the flat ediff-setup figure.
// Electrons from the gun pass through thin graphite and spread along two cones onto the screen,
// where they make two bright rings round a central spot. The accelerating p.d. can be set: a higher
// p.d. gives the electrons more momentum, a shorter de Broglie wavelength and smaller rings, seen
// face on in the inset beside the tube. Built, turned and zoomed by ../assets/model3d.js.
import { model3d } from '../assets/model3d.js';
import { control } from '../assets/sim-control.js';

const L = 3.0;                 // graphite to screen
const SCREEN = 1.5;            // radius of the screen
const NECK = 0.32;             // radius of the neck of the tube
const GUN = -2.7;              // the mouth of the electron gun
const SPACINGS = [0.213, 0.123]; // graphite's two strongest plane spacings, nm
const H = 6.626e-34, M = 9.109e-31, E = 1.602e-19;
const wavelength = kV => H / Math.sqrt(2 * M * E * kV * 1000) * 1e9;   // nm, slow enough to ignore relativity
// Radius on the screen of the ring from planes of spacing d: Bragg angle θ, deflection 2θ.
const ringRadius = (kV, d) => L * Math.tan(2 * Math.asin(wavelength(kV) / (2 * d)));

model3d('tube', ({ THREE, scene, css, label, holder }) => {
  const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
  let kV = 4.0;
  scene.add(new THREE.HemisphereLight(0xffffff, 0x8a8078, 1.6));
  const sun = new THREE.DirectionalLight(0xffffff, 1.2);
  sun.position.set(-3, 5, 6);
  scene.add(sun);

  // The glass: a neck, a cone flaring out to the screen and a rounded end behind the gun.
  const glass = new THREE.MeshStandardMaterial({ transparent: true, opacity: 0.13, roughness: 0.2, depthWrite: false, side: THREE.DoubleSide });
  const along = mesh => { mesh.rotation.z = -Math.PI / 2; return mesh; };   // cylinders lie along x
  const neck = along(new THREE.Mesh(new THREE.CylinderGeometry(NECK, NECK, 3.9, 40, 1, true), glass));
  neck.position.x = -1.75;
  const flare = along(new THREE.Mesh(new THREE.CylinderGeometry(SCREEN, NECK, L - 0.2, 48, 1, true), glass));
  flare.position.x = 0.2 + (L - 0.2) / 2;
  const cap = new THREE.Mesh(new THREE.SphereGeometry(NECK, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), glass);
  cap.rotation.z = Math.PI / 2;
  cap.position.x = -3.7;
  scene.add(neck, flare, cap);
  const rimMaterial = new THREE.LineBasicMaterial({ transparent: true, opacity: 0.55 });
  const loop = (r, x) => new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(Array.from({ length: 64 }, (_, i) => V(x, r * Math.cos(i / 64 * Math.PI * 2), r * Math.sin(i / 64 * Math.PI * 2)))), rimMaterial);
  scene.add(loop(NECK, 0.2), loop(SCREEN, L), loop(NECK, -3.7));
  const edges = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints([V(-3.7, NECK, 0), V(0.2, NECK, 0), V(0.2, NECK, 0), V(L, SCREEN, 0), V(-3.7, -NECK, 0), V(0.2, -NECK, 0), V(0.2, -NECK, 0), V(L, -SCREEN, 0)]), rimMaterial);
  scene.add(edges);

  // The electron gun: a heated cathode in a can, and the anode ring that accelerates the electrons.
  const metal = new THREE.MeshStandardMaterial({ roughness: 0.45, metalness: 0.3, flatShading: true });
  const gun = along(new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.7, 20), metal));
  gun.position.x = -3.25;
  const anode = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.04, 10, 28), metal);
  anode.rotation.y = Math.PI / 2;
  anode.position.x = GUN;
  scene.add(gun, anode);

  // The thin graphite film across the end of the neck.
  const graphiteMaterial = new THREE.MeshStandardMaterial({ roughness: 0.8, side: THREE.DoubleSide });
  const graphite = new THREE.Mesh(new THREE.CircleGeometry(0.2, 32), graphiteMaterial);
  graphite.rotation.y = Math.PI / 2;
  scene.add(graphite);

  // The fluorescent screen, its rings and the central spot.
  const screenMaterial = new THREE.MeshStandardMaterial({ roughness: 0.9, transparent: true, opacity: 0.9, side: THREE.DoubleSide });
  const screen = new THREE.Mesh(new THREE.CircleGeometry(SCREEN, 64), screenMaterial);
  screen.rotation.y = -Math.PI / 2;
  screen.position.x = L + 0.005;
  const glow = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
  const rings = SPACINGS.map(() => {
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.2, 0.3, 72), glow);
    ring.rotation.y = -Math.PI / 2;
    ring.position.x = L - 0.005;
    scene.add(ring);
    return ring;
  });
  const spot = new THREE.Mesh(new THREE.CircleGeometry(0.08, 24), glow);
  spot.rotation.y = -Math.PI / 2;
  spot.position.x = L - 0.006;
  scene.add(screen, spot);

  // The diffracted electrons travel along cones from the graphite to each ring.
  const coneMaterial = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.16, depthWrite: false, side: THREE.DoubleSide });
  const cones = SPACINGS.map(() => {
    const cone = new THREE.Mesh(new THREE.ConeGeometry(1, 1, 48, 1, true), coneMaterial);
    cone.rotation.z = Math.PI / 2;
    cone.position.x = L / 2;
    scene.add(cone);
    return cone;
  });

  // Electrons in flight: each heads for the spot or one of the rings, at a random angle round it.
  const COUNT = 70, SPEED = 2.4;
  const electronMaterial = new THREE.MeshStandardMaterial({ roughness: 0.35, emissiveIntensity: 0.35 });
  const dots = new THREE.InstancedMesh(new THREE.SphereGeometry(0.045, 10, 8), electronMaterial, COUNT);
  scene.add(dots);
  const travel = -GUN + L;
  const flights = Array.from({ length: COUNT }, (_, i) => ({ start: i / COUNT * travel / SPEED, ring: [-1, 0, 0, 1, 1][i % 5], turn: Math.random() * Math.PI * 2 }));
  const place = new THREE.Matrix4();

  label('electron gun', [-3.25, -0.6, 0]);
  label('thin graphite', [0, 0.62, 0]);
  label('fluorescent screen', [L, -SCREEN - 0.35, 0]);

  // Beside the tube, the screen seen face on, with the wavelength; the p.d. control underneath.
  const NS = 'http://www.w3.org/2000/svg', FACE = 150, R0 = 120;
  const face = document.createElementNS(NS, 'svg');
  face.setAttribute('viewBox', '0 0 300 330');
  face.setAttribute('aria-hidden', 'true');
  face.style.cssText = 'position:absolute;left:auto;right:0;top:0;width:32%;height:calc(100% - 70px);overflow:visible;pointer-events:none;';
  face.innerHTML = `<circle cx="${FACE}" cy="${R0 + 6}" r="${R0}" style="fill:var(--spectrum-bg)"/>`
    + SPACINGS.map(() => `<circle class="face-ring" cx="${FACE}" cy="${R0 + 6}" style="fill:none;stroke:var(--sage);stroke-width:8;opacity:.85"/>`).join('')
    + `<circle cx="${FACE}" cy="${R0 + 6}" r="8" style="fill:var(--sage)"/>`
    + `<text x="${FACE}" y="${2 * R0 + 46}" class="lbl small" text-anchor="middle">screen, face on</text>`
    + `<text class="face-lambda lbl mono strong" x="${FACE}" y="${2 * R0 + 84}" text-anchor="middle"></text>`;
  holder.appendChild(face);
  const faceRings = [...face.querySelectorAll('.face-ring')], faceLambda = face.querySelector('.face-lambda');
  const row = control({ label: 'Accelerating p.d.', name: 'accelerating potential difference', min: 2.0, max: 6.0, step: 0.1, value: kV, format: v => `${v.toFixed(1)} kV`, onChange: v => { kV = v; resize(); } });
  row.style.cssText = 'position:absolute;left:0;right:0;bottom:0;--sim-label-w:250px;--sim-value-w:130px;';
  holder.appendChild(row);

  function resize() {
    SPACINGS.forEach((d, i) => {
      const r = ringRadius(kV, d);
      rings[i].geometry.dispose();
      rings[i].geometry = new THREE.RingGeometry(r - 0.035, r + 0.035, 72);
      cones[i].scale.set(r, L, r);
      faceRings[i].setAttribute('r', (r / SCREEN * R0).toFixed(1));
    });
    faceLambda.innerHTML = `λ = ${(wavelength(kV) * 1000).toFixed(1)} pm`;
  }
  resize();

  return {
    look: [0, -0.15, 0],
    view: { turn: -0.78, lift: 0.3, far: 8.2 },
    frame: 'width:68%;height:calc(100% - 70px);',
    sway: 0.1,
    alt: 'Electron diffraction tube in three dimensions: electrons from a gun pass through thin graphite and spread along two cones onto a fluorescent screen, making two bright rings round a central spot. Raising the accelerating p.d. makes the rings smaller',
    still: 2.2,
    paint() {
      const ink = css('--text-secondary'), sage = css('--sage'), blue = css('--electron');
      glass.color.set(css('--brand-primary'));
      rimMaterial.color.set(ink);
      metal.color.set(css('--lead'));
      graphiteMaterial.color.set(css('--text-main'));
      screenMaterial.color.set(css('--spectrum-bg'));
      glow.color.set(sage);
      coneMaterial.color.set(blue);
      electronMaterial.color.set(blue);
      electronMaterial.emissive.set(blue);
    },
    tick(t) {
      const radii = SPACINGS.map(d => ringRadius(kV, d));
      flights.forEach((flight, i) => {
        const s = ((t - flight.start) * SPEED % travel + travel) % travel;
        let x, y = 0, z = 0;
        if (s < -GUN) x = GUN + s;
        else {
          const u = (s + GUN) / L, r = flight.ring < 0 ? 0 : radii[flight.ring];
          x = u * L; y = u * r * Math.cos(flight.turn); z = u * r * Math.sin(flight.turn);
        }
        dots.setMatrixAt(i, place.makeTranslation(x, y, z));
      });
      dots.instanceMatrix.needsUpdate = true;
    }
  };
});
