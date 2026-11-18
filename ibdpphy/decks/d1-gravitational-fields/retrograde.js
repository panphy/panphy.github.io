// Retrograde motion of Mars, over the flat d1-retrograde figure of slide 5. On the left a 3D model:
// the Earth and Mars go round the Sun on their real orbits (1 AU and 1.524 AU, 1 year and 1.881
// years, Mars tilted 1.85°), and the line of sight from the Earth through Mars runs on to a band
// of distant stars, where its dots trace the path. On the right the same path as seen from the
// Earth, east to the left, from the true directions; the band is only 10 AU away, so its loop is a
// little shorter, but a nearer one would lose it. The run
// covers 234 days centered on opposition and plays once from the figure's Play button, stopping
// with the loop traced (deck.js runs the clock; model3d.js stops it at `once`).
import { model3d } from '../assets/model3d.js?v=20261118';

const PM = 1.881, RM = 1.524, TILT = 1.85 * Math.PI / 180;   // Mars: period (years), radius (AU), inclination
const SPAN = 0.32;              // years either side of opposition
const RUN = 14;                 // seconds for the run
const N = 240;                  // samples along the run
const AU = 1.6;                 // scene units per AU
const BAND = 10 * AU;           // the distant stars, 10 AU out: far enough to keep the loop (60 days of it), near enough to see
const DOT = 4;                  // a dot on the path every DOT samples

// Heliocentric positions in ecliptic coordinates (x towards Mars at opposition, z to the north), t in years.
// Mars's ascending node is 90° behind opposition, so it is furthest north then and its path makes a loop.
const earthAt = t => [Math.cos(2 * Math.PI * t), Math.sin(2 * Math.PI * t), 0];
const marsAt = (t, tilt = TILT) => {
  const u = 2 * Math.PI * t / PM + Math.PI / 2, x = RM * Math.cos(u), y = RM * Math.sin(u);
  return [y * Math.cos(tilt), -x, y * Math.sin(tilt)];
};
// The model tilts Mars's orbit three times as much, so that the loop on its band of stars shows.
const marsModel = t => marsAt(t, 3 * TILT);
// Ecliptic to scene: x stays, north is up (+y), and ecliptic y becomes −z, a rotation, so east stays on the left.
const toScene = ([x, y, z], THREE) => new THREE.Vector3(x * AU, z * AU, -y * AU);
// Longitude and latitude of Mars seen from the Earth, in degrees.
const seen = t => {
  const e = earthAt(t), m = marsAt(t), d = m.map((v, k) => v - e[k]), r = Math.hypot(...d);
  return [Math.atan2(d[1], d[0]) * 180 / Math.PI, Math.asin(d[2] / r) * 180 / Math.PI];
};
const times = Array.from({ length: N + 1 }, (_, i) => -SPAN + 2 * SPAN * i / N);
const sky = times.map(seen);

model3d('retrograde', ({ THREE, scene, css, label, holder }) => {
  const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x8a8078, 1.3));
  scene.add(new THREE.PointLight(0xffffff, 30, 0, 1.6));

  const mat = (options = {}) => new THREE.MeshStandardMaterial({ roughness: 0.6, flatShading: true, ...options });
  const sunMaterial = mat({ roughness: 0.5, emissiveIntensity: 0.7 }), earthMaterial = mat({ emissiveIntensity: 0.25 }), marsMaterial = mat({ emissiveIntensity: 0.25 });
  scene.add(new THREE.Mesh(new THREE.IcosahedronGeometry(0.32, 1), sunMaterial));
  const earth = new THREE.Mesh(new THREE.IcosahedronGeometry(0.15, 1), earthMaterial);
  const mars = new THREE.Mesh(new THREE.IcosahedronGeometry(0.12, 1), marsMaterial);
  scene.add(earth, mars);

  // The two orbits, Mars's drawn along its tilted path.
  const orbitMaterial = new THREE.LineBasicMaterial({ transparent: true, opacity: 0.6 });
  const loop = at => new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(Array.from({ length: 120 }, (_, i) => toScene(at(i / 120 * (at === marsModel ? PM : 1)), THREE))), orbitMaterial);
  scene.add(loop(earthAt), loop(marsModel));

  // The band of distant stars: part of a cylinder about the Sun, facing in, with its stars.
  const bandMaterial = mat({ roughness: 1, transparent: true, opacity: 0.08, depthWrite: false, side: THREE.DoubleSide });
  const bandGeometry = new THREE.CylinderGeometry(BAND, BAND, 0.42 * BAND, 48, 1, true, Math.PI / 2 - 0.8, 1.6);
  const band = new THREE.Mesh(bandGeometry, bandMaterial);
  band.position.y = 0.08 * BAND;
  scene.add(band);
  let seed = 31;
  const rand = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  const farMaterial = new THREE.MeshBasicMaterial();
  const far = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.09, 0), farMaterial, 70);
  const place = new THREE.Matrix4();
  for (let i = 0; i < 70; i++) {
    const a = (rand() - 0.5) * 1.55, y = (rand() - 0.4) * 0.4 * BAND;
    far.setMatrixAt(i, place.makeTranslation(BAND * 0.995 * Math.cos(a), y, -BAND * 0.995 * Math.sin(a)));
  }
  scene.add(far);

  // The line of sight: a rod from the Earth through Mars to the band, thicker than a WebGL line.
  const up = V(0, 1, 0);
  const sightMaterial = new THREE.MeshBasicMaterial();
  const sight = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1, 8), sightMaterial);
  scene.add(sight);
  const spotMaterial = new THREE.MeshBasicMaterial();
  const spot = new THREE.Mesh(new THREE.SphereGeometry(0.24, 12, 8), spotMaterial);
  scene.add(spot);
  // Where the line from the Earth through Mars meets the band, for every sample, and a dot on every
  // DOT-th, shown as the run reaches it.
  const hits = times.map(t => {
    const e = toScene(earthAt(t), THREE), d = toScene(marsModel(t), THREE).sub(e).normalize();
    const b = e.x * d.x + e.z * d.z, h = d.x * d.x + d.z * d.z, c = e.x * e.x + e.z * e.z - BAND * BAND;
    return e.clone().addScaledVector(d, (-b + Math.sqrt(b * b - h * c)) / h);
  });
  const trailMaterial = new THREE.MeshBasicMaterial();
  const marks = hits.filter((_, i) => i % DOT === 0);
  const trail = new THREE.InstancedMesh(new THREE.SphereGeometry(0.12, 8, 6), trailMaterial, marks.length);
  marks.forEach((p, i) => trail.setMatrixAt(i, place.makeTranslation(p.x, p.y, p.z)));
  scene.add(trail);

  label('Sun', [0, 0, -1.05]);
  const earthLabel = label('Earth', [0, 0, 0]), marsLabel = label('Mars', [0, 0, 0]);
  label('distant stars', [BAND * 0.97, 0.27 * BAND, 0.5 * BAND]);

  // The sky as seen from the Earth, beside the model: longitude across (east on the left), latitude
  // up at twice the scale, with Mars's dots at equal time steps.
  const NS = 'http://www.w3.org/2000/svg', SW = 560, SH = 470;
  const sx = lon => SW / 2 - lon * 11, sy = lat => 360 - lat * 34;
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${SW} ${SH}`);
  svg.setAttribute('aria-hidden', 'true');
  svg.style.cssText = 'position:absolute;left:auto;right:0;top:0;width:42%;height:100%;overflow:visible;pointer-events:none;';
  let stars = '';
  seed = 7;
  for (let i = 0; i < 26; i++) stars += `<circle cx="${(30 + rand() * (SW - 60)).toFixed(1)}" cy="${(70 + rand() * 330).toFixed(1)}" r="${(2 + rand() * 2.5).toFixed(1)}" style="fill:var(--text-secondary);opacity:.7"/>`;
  svg.innerHTML = `<rect x="2" y="2" width="${SW - 4}" height="${SH - 4}" rx="16" style="fill:var(--card-bg);stroke:var(--card-border);stroke-width:2"/>`
    + `<text x="24" y="44" class="lbl mono" style="font-size:30px">SEEN FROM EARTH</text>` + stars
    + `<g class="dots"></g><circle class="mars" r="12" style="fill:var(--proton);stroke:var(--viewer-bg);stroke-width:3"/>`
    + `<text x="24" y="${SH - 22}" class="lbl" style="font-size:31px">east</text><text x="${SW - 24}" y="${SH - 22}" class="lbl" text-anchor="end" style="font-size:31px">west</text>`
    + `<text class="way lbl strong" x="${SW / 2}" y="${SH - 22}" text-anchor="middle" style="font-size:31px"></text>`
    + `<text class="day lbl mono" x="${SW - 24}" y="44" text-anchor="end" style="font-size:30px"></text>`;
  holder.appendChild(svg);
  const dots = svg.querySelector('.dots'), dot = svg.querySelector('.mars'), way = svg.querySelector('.way'), day = svg.querySelector('.day');
  dots.innerHTML = sky.filter((_, i) => i % DOT === 0).map(([lon, lat]) => `<circle cx="${sx(lon).toFixed(1)}" cy="${sy(lat).toFixed(1)}" r="5" style="fill:var(--proton);opacity:.75"/>`).join('');
  const skyDots = [...dots.children];

  return {
    look: [5.5, 1.6, 0],
    view: { turn: -Math.PI / 2 + 0.32, lift: 0.3, far: 22 },
    sway: 0.06,
    frame: 'width:58%;',
    alt: 'The Earth and Mars orbit the Sun, the Earth on the inside and faster. A line of sight from the Earth through Mars runs on to a band of distant stars and leaves a trail of dots. Most of the time the dots move east, but for about ten weeks, while the Earth overtakes Mars, they move back west, so the path makes a loop. Beside the model, the same path as seen from the Earth',
    once: RUN,
    still: RUN,
    paint() {
      sunMaterial.color.set(css('--sand'));
      sunMaterial.emissive.set(css('--brand-accent'));
      earthMaterial.color.set(css('--electron'));
      earthMaterial.emissive.set(css('--electron'));
      marsMaterial.color.set(css('--proton'));
      marsMaterial.emissive.set(css('--proton'));
      orbitMaterial.color.set(css('--text-secondary'));
      bandMaterial.color.set(css('--brand-primary'));
      farMaterial.color.set(css('--text-secondary'));
      sightMaterial.color.set(css('--brand-accent'));
      spotMaterial.color.set(css('--proton'));
      trailMaterial.color.set(css('--proton'));
    },
    tick(t, still) {
      const u = still ? 1 : Math.min(1, Math.max(0, (t % (RUN + 3)) / RUN)), i = Math.round(u * N);
      const time = times[i], e = toScene(earthAt(time), THREE), m = toScene(marsModel(time), THREE), hit = hits[i];
      earth.position.copy(e);
      mars.position.copy(m);
      earthLabel.anchor.set(e.x, e.y - 0.5, e.z);
      marsLabel.anchor.set(m.x, m.y + 0.5, m.z);
      sight.position.copy(e).add(hit).multiplyScalar(0.5);
      sight.scale.set(1, e.distanceTo(hit), 1);
      sight.quaternion.setFromUnitVectors(up, V().subVectors(hit, e).normalize());
      spot.position.copy(hit);
      const shown = Math.floor(i / DOT) + 1;
      trail.count = shown;
      skyDots.forEach((node, k) => { node.style.display = k < shown ? '' : 'none'; });
      const [lon, lat] = sky[i];
      dot.setAttribute('cx', sx(lon).toFixed(1));
      dot.setAttribute('cy', sy(lat).toFixed(1));
      const back = i > 0 ? sky[i][0] < sky[i - 1][0] : false;
      way.textContent = back ? 'moving west' : 'moving east';
      day.textContent = `day ${Math.round((time + SPAN) * 365.25)}`;
    }
  };
});
