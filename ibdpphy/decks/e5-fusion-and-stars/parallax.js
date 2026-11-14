// Stellar parallax in three dimensions, over the flat e5-parallax figure of slide 31. The Earth
// goes round the Sun; the line of sight from the Earth through a nearby star lands on a wall of
// very distant stars, and slides to and fro across it over the year. An inset shows the same
// patch of sky as seen from the Earth. When the slide's "six months" step is shown, the Earth
// stops at one side of its orbit and a ghost Earth marks the other side, with the parallax angle
// p at the star. Built, turned and zoomed by ../assets/model3d.js.
import { model3d } from '../assets/model3d.js';

const R = 1.6;          // the radius of the Earth's orbit, 1 AU
const D = 4.5;          // the distance of the nearby star from the Sun
const W = 9.5;          // the distance of the wall of distant stars
const YEAR = 9;         // seconds for one orbit
const WALL = [7.5, 3.6]; // width and height of the wall
const SHIFT = R * (W - D) / D;   // the largest offset of the line of sight on the wall
const CROP = [2.6, 0.75];         // half the width and height of the patch of wall in the inset

// A small repeatable random sequence, so that the wall and the inset show the same stars.
const seeded = seed => () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };

model3d('parallax', ({ THREE, scene, css, label, fig, holder }) => {
  const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
  const slide = fig.closest('.slide');
  scene.add(new THREE.HemisphereLight(0xffffff, 0x8a8078, 1.3));
  const light = new THREE.PointLight(0xffffff, 30, 0, 1.6);
  scene.add(light);

  // The Sun, the Earth and the nearby star: low-poly and lit from within.
  const sunMaterial = new THREE.MeshStandardMaterial({ roughness: 0.5, flatShading: true, emissiveIntensity: 0.7 });
  scene.add(new THREE.Mesh(new THREE.IcosahedronGeometry(0.32, 1), sunMaterial));
  const earthMaterial = new THREE.MeshStandardMaterial({ roughness: 0.6, flatShading: true, emissiveIntensity: 0.25 });
  const earth = new THREE.Mesh(new THREE.IcosahedronGeometry(0.13, 1), earthMaterial);
  const ghostMaterial = new THREE.MeshStandardMaterial({ roughness: 0.6, flatShading: true, transparent: true, opacity: 0.45 });
  const ghost = new THREE.Mesh(earth.geometry, ghostMaterial);
  scene.add(earth, ghost);
  const starMaterial = new THREE.MeshStandardMaterial({ color: 0xffe08a, roughness: 0.4, flatShading: true, emissive: 0xffc94a, emissiveIntensity: 0.8 });
  const star = new THREE.Mesh(new THREE.IcosahedronGeometry(0.17, 1), starMaterial);
  star.position.set(D, 0, 0);
  scene.add(star);

  // The Earth's orbit.
  const orbitMaterial = new THREE.LineBasicMaterial({ transparent: true, opacity: 0.6 });
  scene.add(new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(Array.from({ length: 96 }, (_, i) => V(R * Math.cos(i / 96 * 2 * Math.PI), 0, R * Math.sin(i / 96 * 2 * Math.PI)))), orbitMaterial));

  // The wall of very distant stars: a faint sheet, far behind the nearby star.
  const wallMaterial = new THREE.MeshStandardMaterial({ roughness: 1, transparent: true, opacity: 0.08, depthWrite: false, side: THREE.DoubleSide });
  const wallGeometry = new THREE.PlaneGeometry(...WALL);
  // The Sun, the star and the wall lie along x; the wall faces back towards the Sun.
  const wall = new THREE.Mesh(wallGeometry, wallMaterial);
  wall.rotation.y = -Math.PI / 2;
  wall.position.x = W;
  const wallEdgeMaterial = new THREE.LineBasicMaterial({ transparent: true, opacity: 0.35 });
  const wallEdge = new THREE.LineSegments(new THREE.EdgesGeometry(wallGeometry), wallEdgeMaterial);
  wallEdge.rotation.y = -Math.PI / 2;
  wallEdge.position.x = W;
  scene.add(wall, wallEdge);
  const rand = seeded(26), far = [];
  for (let i = 0; i < 40; i++) far.push([(rand() - 0.5) * (WALL[0] - 0.4), (rand() - 0.5) * (WALL[1] - 0.4)]);
  // Each star is [across, up] on the wall: across is z, which runs left to right as seen from the Earth.
  // A few more near the middle, so that the patch in the inset is never empty.
  for (let i = 0; i < 7; i++) far.push([(rand() - 0.5) * 2 * CROP[0], (rand() - 0.5) * 2 * CROP[1]]);
  const farMaterial = new THREE.MeshBasicMaterial();
  const farStars = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.06, 0), farMaterial, far.length);
  const place = new THREE.Matrix4();
  far.forEach(([x, y], i) => farStars.setMatrixAt(i, place.makeTranslation(W - 0.02, y, x)));
  scene.add(farStars);

  // A thin rod between two points, for the lines of sight: thicker than a WebGL line.
  const up = V(0, 1, 0);
  const rod = (material, radius = 0.022) => {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, 1, 8), material);
    mesh.set = (a, b) => {
      mesh.position.copy(a).add(b).multiplyScalar(0.5);
      mesh.scale.set(1, a.distanceTo(b), 1);
      mesh.quaternion.setFromUnitVectors(up, V().subVectors(b, a).normalize());
    };
    scene.add(mesh);
    return mesh;
  };
  const sightMaterial = new THREE.MeshBasicMaterial();
  const ghostSightMaterial = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.45 });
  const sight = rod(sightMaterial), ghostSight = rod(ghostSightMaterial);
  const spotMaterial = new THREE.MeshBasicMaterial();
  const spot = new THREE.Mesh(new THREE.CircleGeometry(0.11, 16), spotMaterial);
  const ghostSpot = new THREE.Mesh(spot.geometry, ghostSightMaterial);
  spot.rotation.y = ghostSpot.rotation.y = -Math.PI / 2;
  scene.add(spot, ghostSpot);
  // The path the line of sight sweeps across the wall in a year.
  const pathMaterial = new THREE.LineDashedMaterial({ dashSize: 0.12, gapSize: 0.09, transparent: true, opacity: 0.8 });
  const path = new THREE.Line(new THREE.BufferGeometry().setFromPoints([V(W - 0.03, 0, -SHIFT), V(W - 0.03, 0, SHIFT)]), pathMaterial);
  path.computeLineDistances();
  scene.add(path);

  // The six-months view: the line from the Sun to the star, the 1 AU from the Sun to the Earth and
  // the angle p at the star between them.
  const guideMaterial = new THREE.LineDashedMaterial({ dashSize: 0.14, gapSize: 0.1 });
  const sunLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints([V(), V(D, 0, 0)]), guideMaterial);
  sunLine.computeLineDistances();
  const auMaterial = new THREE.MeshBasicMaterial();
  const au = rod(auMaterial, 0.018);
  au.set(V(), V(0, 0, R));
  const arcMaterial = new THREE.LineBasicMaterial();
  const P = Math.atan2(R, D), ARC = 2.2;
  const arc = new THREE.Line(new THREE.BufferGeometry().setFromPoints(Array.from({ length: 25 }, (_, i) => { const a = P * i / 24; return V(D - ARC * Math.cos(a), 0, ARC * Math.sin(a)); })), arcMaterial);
  const sixMonths = new THREE.Group();
  sixMonths.add(sunLine, au, arc, ghost, ghostSight, ghostSpot);
  scene.add(sixMonths);

  label('Sun', [-0.85, 0.05, 0]);
  const earthLabel = label('Earth', [0, -0.42, R]);
  label('nearby star', [D, -0.5, 0]);
  label('very distant stars', [W, WALL[1] / 2 + 0.4, 0]);
  const pLabel = label('\\(p\\)', [D - (ARC + 0.45) * Math.cos(P / 2), 0.05, (ARC + 0.45) * Math.sin(P / 2)]);
  const auLabel = label('1 AU', [0.5, -0.1, R / 2]);
  const ghostLabel = label('six months later', [0, 0.42, -R]);
  [pLabel, auLabel, ghostLabel].forEach(el => { el.style.fontWeight = '700'; });

  // The inset, a strip under the model: the patch of the wall round the nearby star, as seen from the Earth.
  const NS = 'http://www.w3.org/2000/svg', IW = 640, IH = 130;
  const ix = x => IW / 2 + x / CROP[0] * (IW / 2 - 24), iy = y => 80 - y / CROP[1] * 36;
  const inset = document.createElementNS(NS, 'svg');
  inset.setAttribute('viewBox', `0 0 ${IW} ${IH}`);
  inset.setAttribute('aria-hidden', 'true');
  inset.style.cssText = 'position:absolute;inset:auto 0 0 0;width:100%;height:28%;overflow:visible;pointer-events:none;';
  inset.innerHTML = `<rect x="1" y="1" width="${IW - 2}" height="${IH - 2}" rx="14" style="fill:var(--card-bg);stroke:var(--card-border);stroke-width:2"/>`
    + `<text x="16" y="28" class="lbl mono" style="font-size:16px;letter-spacing:.06em">SEEN FROM EARTH</text>`
    + far.filter(([x, y]) => Math.abs(x) < CROP[0] && Math.abs(y) < CROP[1]).map(([x, y]) => `<circle cx="${ix(x).toFixed(1)}" cy="${iy(y).toFixed(1)}" r="3.2" style="fill:var(--text-secondary)"/>`).join('')
    + `<g class="six"><line x1="${ix(-SHIFT)}" y1="${iy(0)}" x2="${ix(SHIFT)}" y2="${iy(0)}" style="stroke:var(--brand-accent);stroke-width:2.5"/>`
    + `<text x="${IW - 16}" y="28" class="lbl" text-anchor="end" style="font-size:18px">total shift = 2<tspan font-style="italic">p</tspan></text>`
    + `<circle cx="${ix(SHIFT)}" cy="${iy(0)}" r="7" style="fill:#FFE08A;stroke:var(--text-secondary);stroke-width:1.2;opacity:.5"/></g>`
    + `<circle class="near" cy="${iy(0)}" r="7" style="fill:#FFE08A;stroke:var(--text-secondary);stroke-width:1.2"/>`;
  holder.appendChild(inset);
  const near = inset.querySelector('.near'), six = inset.querySelector('.six');

  // Where the line of sight from an Earth at e, through the star, meets the wall.
  const onWall = e => { const k = (W - e.x) / (D - e.x); return V(W - 0.02, 0, e.z * (1 - k)); };
  const at = (mesh, sightRod, spotMesh, theta) => {
    mesh.position.set(R * Math.cos(theta), 0, R * Math.sin(theta));
    const hit = onWall(mesh.position);
    sightRod.set(mesh.position, hit);
    spotMesh.position.copy(hit);
    return hit;
  };

  return {
    look: [4.5, -0.05, 0],
    view: { turn: -0.75, lift: 0.42, far: 13.2 },
    frame: 'height:70%;',
    sway: 0.12,
    alt: 'The Earth goes round the Sun. The line of sight from the Earth through a nearby star lands on a wall of very distant stars, and slides back and forth across it over the year. An inset shows the same patch of sky seen from the Earth: the nearby star drifts to and fro against distant stars that stay still. Six months apart, the two lines of sight differ by twice the parallax angle p, the angle at the star between the Sun and the Earth',
    still: YEAR * 0.12,
    paint() {
      const sand = css('--sand'), accent = new THREE.Color(css('--brand-accent')), ink = css('--text-secondary'), blue = css('--electron');
      sunMaterial.color.set(sand);
      sunMaterial.emissive.copy(accent);
      earthMaterial.color.set(blue);
      earthMaterial.emissive.set(blue);
      ghostMaterial.color.set(blue);
      orbitMaterial.color.set(ink);
      wallMaterial.color.set(css('--brand-primary'));
      wallEdgeMaterial.color.set(ink);
      farMaterial.color.set(ink);
      [sightMaterial, ghostSightMaterial, spotMaterial, arcMaterial].forEach(m => m.color.copy(accent));
      pathMaterial.color.copy(accent);
      guideMaterial.color.set(ink);
      auMaterial.color.set(ink);
    },
    tick(t, still) {
      // The slide's "six months" step stops the Earth at one side of its orbit and shows the other.
      const frozen = !still && !!slide?.querySelector('.six-months.shown');
      const hit = at(earth, sight, spot, frozen ? Math.PI / 2 : Math.PI / 2 - 2 * Math.PI * t / YEAR);
      earthLabel.anchor.set(earth.position.x, -0.42, earth.position.z);
      sixMonths.visible = frozen;
      at(ghost, ghostSight, ghostSpot, -Math.PI / 2);
      [pLabel, auLabel, ghostLabel].forEach(el => { el.style.display = frozen ? '' : 'none'; });
      six.style.display = frozen ? '' : 'none';
      // Seen from the Earth the star sits where the line of sight meets the wall.
      near.setAttribute('cx', ix(hit.z).toFixed(1));
    }
  };
});
