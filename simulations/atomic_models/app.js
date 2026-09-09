import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const MODELS = {
  plum: { title: 'PLUM PUDDING MODEL', date: 'THOMSON · 1904', heading: 'A positive sphere, with electrons inside.', description: 'Negative electrons are embedded in a spread of positive charge, like fruit in a pudding. There is no nucleus in this model.', look: 'Rotate the sphere. The blue electrons are inside it, not on an outer shell. The orange tint represents positive charge spread throughout the atom.', evidence: 'Some alpha particles bounced back in the gold-foil experiment. Spread-out positive charge could not explain these large deflections.', question: 'Does this model have a nucleus?', answer: 'No. Its positive charge is spread throughout the sphere.' },
  rutherford: { title: 'RUTHERFORD MODEL', date: 'RUTHERFORD · 1911', heading: 'A tiny nucleus. Mostly empty space.', description: 'Positive charge and most of the mass are concentrated in a tiny central nucleus. Electrons are outside it. This model did not specify fixed electron energy levels.', look: 'Find the orange nucleus, then the blue electrons around it. The orbit lines show the paths used in this animation, not fixed energy shells. Rutherford’s model did not specify these particular paths. The faint outer boundary is only a size guide; the nucleus is enlarged to make it visible.', evidence: 'Most alpha particles passed straight through gold foil; a few turned sharply or bounced back. This supported a small, dense, positive nucleus. The nuclear model alone did not explain atoms’ discrete light spectra.', question: 'Why did most alpha particles pass straight through?', answer: 'An atom is mostly empty space. Most alpha particles did not pass close enough to a nucleus to be strongly deflected.' },
  bohr: { title: 'BOHR MODEL', date: 'BOHR · 1913', heading: 'Electrons occupy fixed energy levels.', description: 'Bohr added allowed energy levels around the nucleus. Our carbon-12 classroom adaptation has six protons, six neutrons and six electrons (2 in the first shell, 4 in the second). Neutrons were discovered later, in 1932.', look: 'Follow the two rings. Each represents a different energy level, not a solid track. The first shell is closer to the nucleus and has lower energy than the second.', evidence: 'Bohr’s energy levels helped explain hydrogen’s line spectrum: electrons absorb or emit specific amounts of energy when changing levels. More complex atoms needed a later quantum model.', question: 'Can a Bohr electron stay halfway between allowed energy levels?', answer: 'No. In this model it must occupy an allowed energy level. It can change levels by absorbing or emitting the right amount of energy.' }
};
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const state = { model: 'plum', playing: !reducedMotion, time: 0, expanded: false, discoveries: new Set() };
const viewer = document.getElementById('viewer');
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
camera.position.set(0, 1.2, 9);
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
viewer.appendChild(renderer.domElement);
scene.add(new THREE.HemisphereLight(0xe7f4ff, 0x32415a, 2.3));
const light = new THREE.DirectionalLight(0xffffff, 3);
light.position.set(4, 5, 6);
scene.add(light);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enablePan = false;
controls.minDistance = 5;
controls.maxDistance = 14;
controls.enableDamping = true;
controls.saveState();
const atom = new THREE.Group();
scene.add(atom);
let electrons = [];
let nucleons = [];
let trails = [];
const COLORS = { electron: 0x1675bb, proton: 0xd45132, neutron: 0x657481 };
const ELECTRON_RADIUS = 0.09; // Readable marker size, not a physical size or mass ratio.
const CHALLENGES = {
  plum: { choices: ['Yes, at the centre', 'No, positive charge is spread out'], correct: 1 },
  rutherford: { choices: ['Atoms are mostly empty space', 'The nucleus has no charge'], correct: 0 },
  bohr: { choices: ['Yes, anywhere between shells', 'No, only at allowed energy levels'], correct: 1 }
};

function sphere(radius, color, position = [0, 0, 0], opacity = 1) {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 40, 28), new THREE.MeshStandardMaterial({ color, roughness: 0.24, metalness: 0.2, emissive: color, emissiveIntensity: 0.02, transparent: opacity < 1, opacity, depthWrite: opacity === 1 }));
  mesh.position.set(...position);
  atom.add(mesh);
  return mesh;
}
function ring(radius, color, opacity, rotation = 0) {
  const points = Array.from({ length: 129 }, (_, i) => new THREE.Vector3(radius * Math.cos(i / 128 * Math.PI * 2), radius * Math.sin(i / 128 * Math.PI * 2), 0));
  const line = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(points), new THREE.LineBasicMaterial({ color, transparent: true, opacity }));
  line.rotation.x = rotation;
  atom.add(line);
}
function buildAtom() {
  for (const child of [...atom.children]) {
    child.geometry.dispose();
    child.material.dispose();
    atom.remove(child);
  }
  electrons = [];
  nucleons = [];
  trails = [];
  state.expanded = false;
  atom.rotation.set(0, 0, 0);
  state.time = 0;
  if (state.model === 'plum') {
    sphere(2, 0xe5a142, [0, 0, 0], 0.22);
    ring(2, 0xb67e26, 0.45);
    ring(2, 0xb67e26, 0.18, Math.PI / 2);
    [[-0.95,0.7,0.7],[0.9,0.8,-0.6],[-0.8,-0.8,-0.6],[0.8,-0.65,0.8],[0.1,0.1,1.25],[0,-0.1,-1.3]].forEach(position => { sphere(ELECTRON_RADIUS, COLORS.electron, position).userData.kind = 'electron'; });
  } else {
    if (state.model === 'bohr') {
      // Twelve close-packed sites: six protons and six neutrons (carbon-12).
      const sites = [[1,1,0],[1,-1,0],[-1,1,0],[-1,-1,0],[1,0,1],[1,0,-1],[-1,0,1],[-1,0,-1],[0,1,1],[0,1,-1],[0,-1,1],[0,-1,-1]];
      sites.forEach((site, i) => {
        const mesh = sphere(0.18, i % 2 === 0 ? COLORS.proton : COLORS.neutron, site.map(n => n * 0.245));
        mesh.userData.kind = i % 2 === 0 ? 'proton' : 'neutron';
        nucleons.push({ mesh, home: mesh.position.clone() });
      });
    } else {
      sphere(0.32, 0xd99a36).userData.kind = 'nucleus';
    }
    if (state.model === 'bohr') {
      ring(1.05, 0x657481, 0.6);
      ring(2.1, 0x657481, 0.6);
    } else {
      // A boundary guide, not a shell or a prescribed electron orbit.
      ring(2.2, 0x8ba5c1, 0.2);
      ring(2.2, 0x8ba5c1, 0.12, Math.PI / 2);
    }
    for (let i = 0; i < 6; i++) {
      const inner = state.model === 'bohr' && i < 2;
      const radius = state.model === 'bohr' ? (inner ? 1.05 : 2.1) : 1.5 + (i % 3) * 0.28;
      const phase = state.model === 'bohr' ? (inner ? i * Math.PI : (i - 2) * Math.PI / 2 + 0.4) : i * Math.PI / 3;
      const mesh = sphere(ELECTRON_RADIUS, COLORS.electron);
      mesh.userData.kind = 'electron';
      mesh.material.emissiveIntensity = 0.08;
      const tilt = state.model === 'bohr' ? 0 : (i % 3 - 1) * 0.9;
      electrons.push({ mesh, radius, phase, tilt });
      // Each Rutherford path is shared by two electrons on opposite sides.
      // These are illustrative trajectories, not quantised Bohr shells.
      if (state.model === 'rutherford' && i < 3) ring(radius, 0x657481, 0.65, tilt);
      if (state.model === 'bohr') {
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(40 * 3), 3));
        const trail = new THREE.Line(geometry, new THREE.LineBasicMaterial({ color: COLORS.electron, transparent: true, opacity: 0.35 }));
        atom.add(trail);
        trails.push(trail);
      }
    }
  }
  positionElectrons();
}
function positionElectrons() {
  for (const [index, electron] of electrons.entries()) {
    const angle = electron.phase + state.time * 0.6 / electron.radius;
    electron.mesh.position.set(electron.radius * Math.cos(angle), electron.radius * Math.sin(angle) * Math.cos(electron.tilt), electron.radius * Math.sin(angle) * Math.sin(electron.tilt));
    if (!trails[index]) continue;
    const positions = trails[index].geometry.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      const a = angle - i * 0.018;
      positions.setXYZ(i, electron.radius * Math.cos(a), electron.radius * Math.sin(a) * Math.cos(electron.tilt), electron.radius * Math.sin(a) * Math.sin(electron.tilt));
    }
    positions.needsUpdate = true;
    trails[index].geometry.computeBoundingSphere();
  }
}
function selectModel(model) {
  state.model = model;
  const data = MODELS[model];
  document.body.dataset.model = model;
  document.getElementById('positive-label').textContent = model === 'bohr' ? 'Proton (positive)' : 'Positive charge';
  renderChallenge();
  document.getElementById('particle-readout').textContent = model === 'bohr' ? 'CARBON-12 · 6 protons + 6 neutrons + 6 electrons' : 'Tap a particle to discover its job.';
  document.getElementById('nucleus').textContent = model === 'bohr' ? 'Unpack the nucleus' : 'Explore the centre';
  document.getElementById('action-hint').textContent = model === 'bohr' ? 'Unpack the nucleus to count its protons and neutrons.' : model === 'plum' ? 'This classroom picture is static. Drag to look inside from another angle.' : 'Orbit lines are illustrative paths, not fixed energy shells.';
  for (const [id, key] of Object.entries({ 'scene-title': 'title', 'model-date': 'date', 'model-heading': 'heading', description: 'description', look: 'look', evidence: 'evidence', question: 'question', answer: 'answer' })) document.getElementById(id).textContent = data[key];
  document.querySelectorAll('[data-model]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.model === model)));
  document.getElementById('answer').hidden = true;
  document.getElementById('answer-toggle').setAttribute('aria-expanded', 'false');
  document.getElementById('answer-toggle').textContent = 'Reveal answer';
  viewer.setAttribute('aria-label', `${data.title}. ${data.description} Drag or use arrow keys to rotate; scroll or pinch to zoom.`);
  controls.reset();
  buildAtom();
  updateMotionButton();
}
document.querySelectorAll('[data-model]').forEach(button => button.addEventListener('click', () => selectModel(button.dataset.model)));
document.getElementById('answer-toggle').addEventListener('click', event => {
  const answer = document.getElementById('answer');
  answer.hidden = !answer.hidden;
  event.currentTarget.setAttribute('aria-expanded', String(!answer.hidden));
  event.currentTarget.textContent = answer.hidden ? 'Reveal answer' : 'Hide answer';
});
document.getElementById('motion').addEventListener('click', () => {
  if (state.model === 'plum') return;
  state.playing = !state.playing;
  updateMotionButton();
});
document.getElementById('reset').addEventListener('click', () => selectModel(state.model));
viewer.addEventListener('keydown', event => {
  if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
  event.preventDefault();
  atom.rotation.y += event.key === 'ArrowLeft' ? -0.15 : event.key === 'ArrowRight' ? 0.15 : 0;
  atom.rotation.x += event.key === 'ArrowUp' ? -0.15 : event.key === 'ArrowDown' ? 0.15 : 0;
});
new ResizeObserver(() => {
  const { width, height } = viewer.getBoundingClientRect();
  if (!width || !height) return;
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}).observe(viewer);
renderer.domElement.addEventListener('webglcontextlost', event => {
  event.preventDefault();
  document.getElementById('load-status').hidden = false;
  document.getElementById('load-status').textContent = 'The 3D view was interrupted. Reload this page to restore it.';
});
function updateMotionButton() {
  const button = document.getElementById('motion');
  const isStatic = state.model === 'plum';
  button.disabled = isStatic;
  button.setAttribute('aria-pressed', String(!isStatic && state.playing));
  button.textContent = isStatic ? 'Static model' : state.playing ? 'Ⅱ Pause motion' : '▶ Play motion';
}
function renderChallenge() {
  const challenge = CHALLENGES[state.model];
  const choices = document.getElementById('choices');
  choices.replaceChildren();
  document.getElementById('feedback').textContent = state.discoveries.has(state.model) ? '✦ Discovery unlocked! You can try again.' : '';
  challenge.choices.forEach((label, index) => {
    const button = document.createElement('button');
    button.textContent = label;
    button.addEventListener('click', () => {
      const correct = index === challenge.correct;
      document.getElementById('feedback').textContent = correct ? '✦ You’ve got it! ' + MODELS[state.model].answer : 'Look again: ' + (state.model === 'plum' ? 'is there a separate central particle?' : state.model === 'rutherford' ? 'compare the tiny centre with the space around it.' : 'the rings represent the allowed energy levels.');
      if (correct) state.discoveries.add(state.model);
      button.dataset.result = correct ? 'correct' : 'retry';
      document.getElementById('progress').textContent = `${state.discoveries.size} / 3 discoveries unlocked${state.discoveries.size === 3 ? ' — Atom explorer!' : ''}`;
    });
    choices.appendChild(button);
  });
}
function inspect(kind) {
  const text = {
    electron: 'ELECTRON · Charge −1 · About 1/1836 of a proton’s mass. Marker sizes do not represent mass or actual particle size. Six electrons balance six positive charges in our neutral atom.',
    proton: 'PROTON · Charge +1 · In the nucleus. Six protons make this atom carbon.',
    neutron: 'NEUTRON · Charge 0 · In the nucleus. Six protons + six neutrons make carbon-12.',
    nucleus: 'NUCLEUS · Small, dense and positive. It contains almost all the atom’s mass.'
  };
  document.getElementById('particle-readout').textContent = text[kind];
}
const raycaster = new THREE.Raycaster();
let pointerStart = null;
renderer.domElement.addEventListener('pointerdown', event => { pointerStart = [event.clientX, event.clientY]; });
renderer.domElement.addEventListener('pointerup', event => {
  if (!pointerStart || Math.hypot(event.clientX - pointerStart[0], event.clientY - pointerStart[1]) > 6) return;
  const rect = renderer.domElement.getBoundingClientRect();
  raycaster.setFromCamera(new THREE.Vector2((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1), camera);
  const hit = raycaster.intersectObjects(atom.children).find(hit => hit.object.userData.kind);
  if (hit) inspect(hit.object.userData.kind);
});
document.getElementById('inspect').addEventListener('click', () => inspect('electron'));
document.getElementById('nucleus').addEventListener('click', event => {
  if (state.model === 'bohr') {
    state.expanded = !state.expanded;
    nucleons.forEach(({ mesh, home }, i) => {
      if (state.expanded) mesh.position.set((i % 4 - 1.5) * 0.39, (Math.floor(i / 4) - 1) * 0.39, 0);
      else mesh.position.copy(home);
    });
    event.currentTarget.textContent = state.expanded ? 'Pack the nucleus' : 'Unpack the nucleus';
    document.getElementById('particle-readout').textContent = state.expanded ? 'NUCLEUS UNPACKED · 6 red protons (+) and 6 grey neutrons (0). Separated for counting, not a physical process.' : 'CARBON-12 · 6 protons + 6 neutrons in a compact nucleus.';
  } else if (state.model === 'rutherford') inspect('nucleus');
  else document.getElementById('particle-readout').textContent = 'NO NUCLEUS · Positive charge fills the whole pudding. That is the big difference from the later models.';
});
selectModel('plum');
document.getElementById('load-status').hidden = true;
let previousTime = 0;
renderer.setAnimationLoop(time => {
  const delta = Math.min((time - previousTime) / 1000, 0.05);
  previousTime = time;
  if (state.model !== 'plum' && state.playing && !document.hidden) {
    state.time += delta;
    positionElectrons();
  }
  controls.update();
  renderer.render(scene, camera);
});
