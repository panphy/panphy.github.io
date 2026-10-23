// Three-dimensional models for the D.4 deck, each drawn over a flat figure by ../assets/model3d.js,
// which also turns, zooms and photographs them for the thumbnails. The flat pictures stay for print,
// reduced motion and a failed load. Colours follow figures.js: field lines and their symbols slate,
// velocities and wires apricot, forces teal, induced currents and emf terracotta, N red and S blue.
//   data-magnet-coil  slide 5   a magnet moved in and out of a coil, with a meter
//   data-flux         slide 6   a loop turned in a uniform field, threaded by its field lines
//   data-lenz         slide 13  the current induced in a coil by an approaching or leaving magnet
//   data-tube         slide 14  a magnet dropped through a plastic and a copper tube (a play step)
//   data-rod          slide 15  a rod sliding along rails across a vertical field
//   data-spring       slide 18  a magnet bouncing on a spring into a coil, with its emf traced
//   data-generator    slide 22  a rectangular coil turning between two poles, with its emf graph
import { model3d } from '../assets/model3d.js';

const TAU = Math.PI * 2;
// Labels sit over field lines and wires: a soft halo in the panel's colour keeps them legible.
const HALO = '0 0 3px var(--viewer-bg), 0 0 6px var(--viewer-bg), 0 0 10px var(--viewer-bg)';
const haloed = label => (html, at) => { const el = label(html, at); el.style.textShadow = HALO; return el; };
const ease = u => (1 - Math.cos(Math.PI * Math.min(1, Math.max(0, u)))) / 2;

// Building blocks shared by the models.
function kit(THREE, scene) {
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const UP = V(0, 1, 0);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x8a8078, 1.35));
  const sun = new THREE.DirectionalLight(0xffffff, 1.7);
  sun.position.set(-3, 6, 5);
  scene.add(sun);

  const mat = (options = {}) => new THREE.MeshStandardMaterial({ roughness: 0.6, flatShading: true, ...options });
  const over = () => mat({ depthTest: false, transparent: true });

  // A cylinder from a to b.
  const bar = (a, b, r, material, sides = 8) => {
    const d = new THREE.Vector3().subVectors(b, a);
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r, r, d.length(), sides), material);
    mesh.position.copy(a).addScaledVector(d, 0.5);
    mesh.quaternion.setFromUnitVectors(UP, d.normalize());
    return mesh;
  };
  // A wire through a list of points, with rounded corners.
  const wire = (points, r, material) => {
    const group = new THREE.Group();
    points.slice(1).forEach((p, i) => group.add(bar(points[i], p, r, material, 6)));
    points.slice(1, -1).forEach(p => { const joint = new THREE.Mesh(new THREE.SphereGeometry(r, 6, 4), material); joint.position.copy(p); group.add(joint); });
    return group;
  };
  // A vector arrow, head at the tip, that can be moved and resized: set(from, vector). A material
  // made by `over` draws it on top of everything, for a force that starts inside the body it acts on.
  const arrow = (material, r = 0.045) => {
    const group = new THREE.Group(), length = r * 6.5;
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 1, 8), material);
    const head = new THREE.Mesh(new THREE.ConeGeometry(r * 2.7, length, 10), material);
    if (!material.depthTest) shaft.renderOrder = head.renderOrder = 10;
    group.add(shaft, head);
    const dir = V();
    const set = (from, vector) => {
      const size = vector.length();
      group.visible = size > 0.02;
      if (!group.visible) return;
      const h = Math.min(length, size * 0.6);
      group.position.copy(from);
      group.quaternion.setFromUnitVectors(UP, dir.copy(vector).normalize());
      shaft.scale.set(1, size - h, 1);
      shaft.position.y = (size - h) / 2;
      head.scale.set(1, h / length, 1);
      head.position.y = size - h / 2;
    };
    return { group, set };
  };
  // A small arrowhead on a wire or a field line: at a point, pointing along a direction.
  const head = (at, direction, r, material) => {
    const cone = new THREE.Mesh(new THREE.ConeGeometry(r, r * 2.6, 8), material);
    cone.position.copy(at);
    cone.quaternion.setFromUnitVectors(UP, direction.clone().normalize());
    return cone;
  };
  // A field line: unbroken, with its arrowhead part of the way along, never at the end.
  const fieldLine = (a, b, material, at = 0.5, r = 0.016) => {
    const group = new THREE.Group(), d = new THREE.Vector3().subVectors(b, a);
    group.add(bar(a, b, r, material, 5), head(a.clone().addScaledVector(d, at), d, r * 5, material));
    return group;
  };
  // A coil wound along +x from x0: `turns` turns of radius `radius`, starting and ending at the
  // bottom. Returns the mesh and its curve, so that the direction of the wire can be found.
  const helix = (x0, length, radius, turns, r, material) => {
    const curve = new THREE.Curve();
    curve.getPoint = (u, target = V()) => { const phi = Math.PI + u * turns * TAU; return target.set(x0 + u * length, radius * Math.cos(phi), radius * Math.sin(phi)); };
    return { mesh: new THREE.Mesh(new THREE.TubeGeometry(curve, turns * 24, r, 6), material), curve };
  };
  // Arrowheads on the front of every turn of a coil, showing the current. A positive sense makes
  // the coil's own field point along +x (the right-hand grip rule); set(sense, strength).
  const coilCurrent = (curve, turns, material, r = 0.085) => {
    const group = new THREE.Group(), cones = [];
    for (let k = 1; k <= turns; k++) {
      const u = (k - 0.25) / turns, cone = new THREE.Mesh(new THREE.ConeGeometry(r, r * 2.6, 8), material);
      cone.position.copy(curve.getPoint(u)).add(V(0, 0, 0.06));
      cone.userData.tangent = curve.getTangent(u);
      group.add(cone);
      cones.push(cone);
    }
    const set = (sense, strength) => cones.forEach(cone => {
      cone.visible = strength > 0.06;
      cone.quaternion.setFromUnitVectors(UP, cone.userData.tangent.clone().multiplyScalar(sense >= 0 ? 1 : -1));
      cone.scale.setScalar(0.55 + 0.45 * strength);
    });
    return { group, set };
  };
  // A block of a magnet with its letter on every face; paint() colours it from the theme.
  const pole = (letter, w, h, d) => {
    const faces = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]].map(([a, b]) => {
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(48, Math.round(a * 180));
      canvas.height = Math.max(48, Math.round(b * 180));
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      return { canvas, texture, material: new THREE.MeshStandardMaterial({ map: texture, roughness: 0.55 }) };
    });
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), faces.map(face => face.material));
    mesh.userData.paint = css => faces.forEach(({ canvas, texture }) => {
      const g = canvas.getContext('2d'), size = Math.min(canvas.width, canvas.height);
      g.fillStyle = css(letter === 'N' ? '--proton' : '--electron');
      g.fillRect(0, 0, canvas.width, canvas.height);
      g.fillStyle = '#fff';
      g.font = `800 ${Math.round(size * 0.6)}px Figtree, Manrope, system-ui, sans-serif`;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(letter, canvas.width / 2, canvas.height / 2 + size * 0.04);
      texture.needsUpdate = true;
    });
    return mesh;
  };
  // A bar magnet of the given size along x (north at +x) or, upright, along y (north at +y, or at
  // −y if `northDown`; built that way so that its letters stay upright).
  const magnet = (length, thick, upright = false, northDown = false) => {
    const group = new THREE.Group();
    const halves = (northDown ? ['N', 'S'] : ['S', 'N']).map((letter, i) => {
      const block = upright ? pole(letter, thick, length / 2, thick) : pole(letter, length / 2, thick, thick);
      block.position[upright ? 'y' : 'x'] = (i - 0.5) * length / 2;
      group.add(block);
      return block;
    });
    group.userData.paint = css => halves.forEach(block => block.userData.paint(css));
    return group;
  };
  const colour = (material, css, name, mix) => { material.color.set(css(name)); if (mix) material.color.lerp(new THREE.Color(css(mix[0])), mix[1]); if (material.emissive) material.emissive.copy(material.color).multiplyScalar(0.12); };
  return { V, mat, over, bar, wire, arrow, head, fieldLine, helix, coilCurrent, magnet, pole, colour };
}

// ---------------------------------------------------------------------------------------------
// Slide 5: a magnet moving in and out of a coil joined to a meter. The needle follows the velocity
// of the magnet: largest in the middle of its swing, zero where it stops at each end.
model3d('magnet-coil', ({ THREE, scene, css, label: plain }) => {
  const k = kit(THREE, scene), { V } = k, label = haloed(plain);
  const T = 4, TURNS = 8, R = 0.55, X0 = 0, LENGTH = 1.8, CENTRE = -1.45, SWING = 0.75;
  const MX = 0.9, MY = -1.8, MZ = 0.25;
  const wireMaterial = k.mat({ roughness: 0.45, metalness: 0.2 });
  scene.add(k.helix(X0, LENGTH, R, TURNS, 0.045, wireMaterial).mesh);
  scene.add(k.wire([V(X0, -R, 0), V(X0, -1.15, 0), V(MX - 0.3, -1.15, MZ), V(MX - 0.3, MY + 0.38, MZ)], 0.032, wireMaterial));
  scene.add(k.wire([V(X0 + LENGTH, -R, 0), V(X0 + LENGTH, -1.15, 0), V(MX + 0.3, -1.15, MZ), V(MX + 0.3, MY + 0.38, MZ)], 0.032, wireMaterial));

  // The meter: a case, a face with its scale, and a needle about a pivot near the bottom.
  const caseMaterial = k.mat(), faceMaterial = new THREE.MeshBasicMaterial(), needleMaterial = new THREE.MeshBasicMaterial();
  const meterCase = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.76, 0.3), caseMaterial);
  meterCase.position.set(MX, MY, MZ);
  const face = new THREE.Mesh(new THREE.CircleGeometry(0.31, 28), faceMaterial);
  face.position.set(MX, MY + 0.02, MZ + 0.152);
  const scaleMaterial = new THREE.LineBasicMaterial();
  const PIVOT = V(MX, MY - 0.17, MZ + 0.16);
  const scale = new THREE.Line(new THREE.BufferGeometry().setFromPoints(Array.from({ length: 21 }, (_, i) => { const a = Math.PI / 2 + (i / 20 - 0.5) * 1.5; return V(PIVOT.x + 0.3 * Math.cos(a), PIVOT.y + 0.3 * Math.sin(a), PIVOT.z); })), scaleMaterial);
  const needle = new THREE.Group();
  const needleBar = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.32, 0.01), needleMaterial);
  needleBar.position.y = 0.16;
  needle.add(needleBar);
  needle.position.copy(PIVOT).add(V(0, 0, 0.005));
  scene.add(meterCase, face, scale, needle);

  const bar = k.magnet(1.5, 0.42);
  scene.add(bar);
  const velocityMaterial = k.mat();
  const velocity = k.arrow(velocityMaterial, 0.04);
  scene.add(velocity.group);

  label('coil', [X0 + LENGTH / 2, R + 0.4, 0]);
  label('meter', [MX + 1.1, MY, MZ]);
  const magnetLabel = label('moving magnet', [CENTRE, -0.6, 0]);

  return {
    look: [-0.25, -0.45, 0],
    view: { turn: -0.42, lift: 0.3, far: 7.4 },
    alt: 'A bar magnet, its north pole facing a coil of wire, moves into the coil and out again. The coil is joined to a meter. The needle swings one way as the magnet moves in and the other way as it moves out; it is furthest from zero when the magnet moves fastest and at zero when the magnet stops at each end of its swing',
    still: 0.25,
    paint() {
      bar.userData.paint(css);
      k.colour(wireMaterial, css, '--brand-accent');
      k.colour(velocityMaterial, css, '--brand-accent');
      k.colour(caseMaterial, css, '--neutron');
      faceMaterial.color.set(css('--card-bg'));
      needleMaterial.color.set(css('--hl'));
      scaleMaterial.color.set(css('--text-secondary'));
    },
    tick(t) {
      const phase = (t / T) * TAU, speed = Math.cos(phase);
      bar.position.x = CENTRE + SWING * Math.sin(phase);
      magnetLabel.anchor.x = bar.position.x;
      velocity.set(V(bar.position.x - 0.35 * Math.sign(speed), 0.42, 0), V(0.75 * speed, 0, 0));
      needle.rotation.z = -0.62 * speed;
    }
  };
});

// ---------------------------------------------------------------------------------------------
// Slide 6: a loop in a uniform field, turned so that its normal is at 0°, 60° and 90° to the field
// in turn. The field lines that pass through the loop are drawn strongly, the rest faintly, and the
// caption gives Φ as a fraction of BA.
model3d('flux', ({ THREE, scene, css, label: plain, caption }) => {
  const k = kit(THREE, scene), { V } = k, label = haloed(plain);
  const R = 0.78, SPACE = 0.3, HALF = 3, X = 2.7;
  // θ in degrees over one cycle: [time, angle] at each corner of the schedule.
  const SCHEDULE = [[0, 0], [2.2, 0], [3.8, 60], [6.6, 60], [7.8, 90], [10, 90], [12, 0]];
  const angleAt = t => {
    const s = ((t % 12) + 12) % 12;
    for (let i = 1; i < SCHEDULE.length; i++) {
      const [t1, a1] = SCHEDULE[i], [t0, a0] = SCHEDULE[i - 1];
      if (s <= t1) return a0 + (a1 - a0) * ease((s - t0) / (t1 - t0));
    }
    return 0;
  };

  const strong = k.mat(), weak = k.mat({ transparent: true, opacity: 0.12, depthWrite: false });
  const lines = [];
  for (let i = -HALF; i <= HALF; i++) for (let j = -HALF; j <= HALF; j++) {
    const line = k.fieldLine(V(-X, i * SPACE, j * SPACE), V(X, i * SPACE, j * SPACE), weak, 0.78, 0.013);
    line.userData.at = [i * SPACE, j * SPACE];
    scene.add(line);
    lines.push(line);
  }

  // The loop and the area it encloses, built facing +x and tipped back about the z axis, so that at
  // 90° it lies flat, along the field lines.
  const loop = new THREE.Group(), loopMaterial = k.mat({ roughness: 0.4 });
  const fillMaterial = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(R, 0.04, 6, 40), loopMaterial);
  const fill = new THREE.Mesh(new THREE.CircleGeometry(R, 40), fillMaterial);
  ring.rotation.y = fill.rotation.y = Math.PI / 2;
  loop.add(ring, fill);
  scene.add(loop);
  const normalMaterial = k.mat();
  const normal = k.arrow(normalMaterial, 0.04);
  scene.add(normal.group);
  const arcMaterial = new THREE.LineBasicMaterial();
  const arc = new THREE.Line(new THREE.BufferGeometry().setFromPoints(Array.from({ length: 25 }, () => V())), arcMaterial);
  scene.add(arc);

  label('\\(B\\)', [X + 0.25, HALF * SPACE, 0]);
  const normalLabel = label('normal', [1.6, 0, 0]);
  const thetaLabel = label('\\(\\theta\\)', [0.7, 0, 0]);
  const areaLabel = label('area \\(A\\)', [0, 0, 0]);
  // A caption for each angle the loop rests at, and one while it turns.
  const captions = {
    0: caption('\\(\\theta = 0^{\\circ}\\): \\(\\Phi = BA \\cos 0^{\\circ} = BA\\)'),
    60: caption('\\(\\theta = 60^{\\circ}\\): \\(\\Phi = BA \\cos 60^{\\circ} = 0.50 \\, BA\\)'),
    90: caption('\\(\\theta = 90^{\\circ}\\): \\(\\Phi = BA \\cos 90^{\\circ} = 0\\)'),
    turning: caption('\\(\\Phi = BA \\cos \\theta\\)')
  };
  const Z = V(0, 0, 1);
  let shown = null;

  return {
    look: [0, -0.15, 0],
    view: { turn: -0.62, lift: 0.32, far: 8.6 },
    sway: 0.08,
    alt: 'A circular loop in a uniform magnetic field whose field lines run from left to right. The loop tips back so that its normal is first along the field, then at 60 degrees to it, then at right angles. The field lines that pass through the loop are drawn darker: all of them when the loop faces the field, half as many at 60 degrees and none when the loop lies along the field',
    still: 5,
    paint() {
      k.colour(strong, css, '--brand-accent-strong');
      k.colour(weak, css, '--brand-accent-strong');
      k.colour(loopMaterial, css, '--brand-primary');
      fillMaterial.color.set(css('--brand-primary'));
      k.colour(normalMaterial, css, '--hl');
      arcMaterial.color.set(css('--text-secondary'));
    },
    tick(t) {
      const degrees = angleAt(t), theta = degrees * Math.PI / 180, n = V(Math.cos(theta), Math.sin(theta), 0);
      loop.rotation.z = theta;
      // A line along x at (y, z) crosses the plane of the loop where x = −y tan θ.
      lines.forEach(line => {
        const [y, z] = line.userData.at, x = Math.abs(theta - Math.PI / 2) < 1e-4 ? Infinity : -y * Math.tan(theta);
        const through = x * x + y * y + z * z < R * R;
        line.children.forEach(part => { part.material = through ? strong : weak; });
      });
      normal.set(V(0, 0, 0), n.clone().multiplyScalar(1.45));
      normalLabel.anchor.copy(n).multiplyScalar(1.85);
      const points = arc.geometry.attributes.position;
      for (let i = 0; i < 25; i++) { const a = theta * i / 24; points.setXYZ(i, 0.55 * Math.cos(a), 0.55 * Math.sin(a), 0); }
      points.needsUpdate = true;
      thetaLabel.anchor.set(0.8 * Math.cos(theta / 2), 0.8 * Math.sin(theta / 2), 0);
      thetaLabel.style.opacity = degrees > 12 ? 1 : 0;
      areaLabel.anchor.set(0, -R * 0.55, R + 0.3).applyAxisAngle(Z, theta);
      const held = [0, 60, 90].find(a => Math.abs(degrees - a) < 0.05) ?? 'turning';
      if (held !== shown) {
        shown = held;
        Object.entries(captions).forEach(([key, el]) => { el.style.opacity = key === String(held) ? 1 : 0; });
      }
    }
  };
});

// ---------------------------------------------------------------------------------------------
// Slide 13: Lenz's law. The north pole of a magnet is pushed towards a coil, rests, is pulled away
// and rests. The arrowheads on the front of each turn show the induced current, the arrow inside
// the coil its field, and the coil's near end is labelled with the pole it becomes.
model3d('lenz', ({ THREE, scene, css, label: plain, caption }) => {
  const k = kit(THREE, scene), { V } = k, label = haloed(plain);
  const TURNS = 7, R = 0.55, X0 = 0, LENGTH = 1.6;
  const FAR = -2.75, NEAR = -1.1, CYCLE = 6.4;     // magnet centre positions; seconds per cycle
  // Push in for 1.8 s, rest 1.4 s, pull out 1.8 s, rest 1.4 s.
  const state = t => {
    const s = ((t % CYCLE) + CYCLE) % CYCLE;
    if (s < 1.8) return { x: FAR + (NEAR - FAR) * ease(s / 1.8), v: Math.sin(Math.PI * s / 1.8) };
    if (s < 3.2) return { x: NEAR, v: 0 };
    if (s < 5.0) return { x: NEAR + (FAR - NEAR) * ease((s - 3.2) / 1.8), v: -Math.sin(Math.PI * (s - 3.2) / 1.8) };
    return { x: FAR, v: 0 };
  };

  const wireMaterial = k.mat({ roughness: 0.45, metalness: 0.2 });
  const coil = k.helix(X0, LENGTH, R, TURNS, 0.045, wireMaterial);
  scene.add(coil.mesh);
  // The two ends of the coil are joined underneath, so that a current can flow.
  scene.add(k.wire([V(X0, -R, 0), V(X0, -1.05, 0), V(X0 + LENGTH, -1.05, 0), V(X0 + LENGTH, -R, 0)], 0.032, wireMaterial));
  const currentMaterial = k.mat();
  const current = k.coilCurrent(coil.curve, TURNS, currentMaterial);
  scene.add(current.group);
  const fieldMaterial = k.mat({ transparent: true, opacity: 0.85 });
  const field = k.arrow(fieldMaterial, 0.05);
  scene.add(field.group);

  const bar = k.magnet(1.5, 0.42);
  scene.add(bar);
  const velocityMaterial = k.mat(), forceMaterial = k.over();
  const velocity = k.arrow(velocityMaterial, 0.04), force = k.arrow(forceMaterial, 0.045);
  scene.add(velocity.group, force.group);

  const nearEnd = label('', [X0 - 0.05, R + 0.42, 0]);
  const fieldLabel = label('induced field', [X0 + LENGTH / 2, -R - 0.85, 0]);
  const vLabel = label('\\(v\\)', [0, 0.85, 0]);
  const fLabel = label('force on magnet', [0, -0.62, 0]);
  const text = caption('');
  let shown = '';

  return {
    look: [-0.6, -0.05, 0],
    view: { turn: -0.3, lift: 0.26, far: 7.8 },
    alt: 'The north pole of a bar magnet is pushed towards a coil, then pulled away. Arrowheads on the coil show the induced current. As the magnet approaches, the current makes the near end of the coil a north pole, which repels the magnet. As it leaves, the current reverses and the near end becomes a south pole, which attracts it. Either way the force on the magnet is against its motion. When the magnet is at rest there is no current',
    still: 0.9,
    paint() {
      bar.userData.paint(css);
      k.colour(wireMaterial, css, '--brand-accent', ['--text-secondary', 0.25]);
      k.colour(currentMaterial, css, '--hl');
      k.colour(fieldMaterial, css, '--brand-accent-strong');
      k.colour(velocityMaterial, css, '--brand-accent');
      k.colour(forceMaterial, css, '--brand-primary');
    },
    tick(t) {
      const { x, v } = state(t), strength = Math.abs(v), sense = -Math.sign(v);
      bar.position.x = x;
      // Approaching (v > 0) the flux along +x increases, so the coil's field points along −x: its
      // near end is N. Leaving, its field points along +x and the near end is S.
      current.set(sense, strength);
      field.set(V(X0 + LENGTH / 2 - sense * 0.6 * strength, 0, 0), V(sense * 1.2 * strength, 0, 0));
      velocity.set(V(x - 0.4 * Math.sign(v), 0.45, 0), V(0.8 * v, 0, 0));
      // The force on the magnet acts at its north pole, the end facing the coil.
      force.set(V(x + 0.75, 0, 0), V(-0.85 * v, 0, 0));
      vLabel.anchor.set(x + 0.15 * Math.sign(v), 0.78, 0);
      fLabel.anchor.set(x + 0.55, -0.55, 0);
      const moving = strength > 0.06;
      [vLabel, fLabel, fieldLabel, nearEnd].forEach(el => { el.style.opacity = moving ? Math.min(1, strength * 2.5) : 0; });
      const phase = !moving ? 'rest' : v > 0 ? 'in' : 'out';
      if (phase !== shown) {
        shown = phase;
        if (phase !== 'rest') nearEnd.innerHTML = `this end becomes <b style="color:var(--${phase === 'in' ? 'proton' : 'electron'})">${phase === 'in' ? 'N' : 'S'}</b>`;
        text.innerHTML = {
          in: 'Pushed in: the near end becomes N and <b>repels</b> the magnet',
          out: 'Pulled away: the near end becomes S and <b>attracts</b> the magnet',
          rest: 'At rest: the flux is not changing, so there is no current'
        }[phase];
      }
    }
  };
});

// ---------------------------------------------------------------------------------------------
// Slide 14: the same magnet dropped through a plastic tube and a copper tube. The press on the
// figure's play step lets both go; going back lifts them again. In the copper tube the induced
// currents (the ring below the magnet one way, the ring above the other) soon make the upward force
// equal to the weight, so the magnet falls at its terminal velocity.
model3d('tube', ({ THREE, scene, css, label: plain, fig }) => {
  const k = kit(THREE, scene), { V } = k, label = haloed(plain);
  const HEIGHT = 4, RADIUS = 0.42, LEFT = -1.1, RIGHT = 1.1, TOP = 3.6, BOTTOM = 0.35;
  const G = 2 * (TOP - BOTTOM) / 0.8 ** 2;          // the plastic-tube magnet takes 0.8 s to fall
  const TERMINAL = 0.78, TAU_C = TERMINAL / G;       // copper: a steady speed reached in a fraction of a second
  const plasticY = s => Math.max(BOTTOM, TOP - G * s * s / 2);
  const copperY = s => Math.max(BOTTOM, TOP - TERMINAL * (s - TAU_C * (1 - Math.exp(-s / TAU_C))));
  const copperV = s => (copperY(s) <= BOTTOM ? 0 : TERMINAL * (1 - Math.exp(-s / TAU_C)));

  const baseMaterial = k.mat();
  const base = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.12, 1.4), baseMaterial);
  base.position.y = -0.06;
  scene.add(base);
  const tube = (x, material, rimMaterial) => {
    const wall = new THREE.Mesh(new THREE.CylinderGeometry(RADIUS, RADIUS, HEIGHT, 16, 1, true), material);
    wall.position.set(x, HEIGHT / 2, 0);
    scene.add(wall);
    [0, HEIGHT].forEach(y => { const rim = new THREE.Mesh(new THREE.TorusGeometry(RADIUS, 0.03, 4, 16), rimMaterial); rim.rotation.x = Math.PI / 2; rim.position.set(x, y, 0); scene.add(rim); });
  };
  const see = () => k.mat({ transparent: true, opacity: 0.3, side: THREE.DoubleSide, depthWrite: false, roughness: 0.3 });
  const plasticMaterial = see(), copperMaterial = see(), plasticRim = k.mat(), copperRim = k.mat({ metalness: 0.3 });
  tube(LEFT, plasticMaterial, plasticRim);
  tube(RIGHT, copperMaterial, copperRim);

  const magnets = [LEFT, RIGHT].map(x => { const m = k.magnet(0.7, 0.3, true); m.position.x = x; scene.add(m); return m; });

  // Induced currents in the copper: a ring below the magnet and a ring above, with arrowheads.
  // Falling with N up, the upward flux through the ring below grows, so its current makes a field
  // downwards (it repels the S end); the flux through the ring above shrinks, so its current makes
  // a field upwards (it attracts the N end).
  const ringMaterial = k.mat({ transparent: true });
  const rings = [-1, 1].map(side => {
    const group = new THREE.Group();
    const ring = new THREE.Mesh(new THREE.TorusGeometry(RADIUS + 0.02, 0.035, 5, 24), ringMaterial);
    ring.rotation.x = Math.PI / 2;
    group.add(ring);
    // Field up (+y): seen from above the current is anticlockwise, which is +x at the front (+z).
    const sense = side; // below: field down; above: field up
    [[V(0, 0, RADIUS + 0.02), V(sense, 0, 0)], [V(0, 0, -RADIUS - 0.02), V(-sense, 0, 0)], [V(RADIUS + 0.02, 0, 0), V(0, 0, -sense)], [V(-RADIUS - 0.02, 0, 0), V(0, 0, sense)]].forEach(([at, dir]) => group.add(k.head(at, dir, 0.08, ringMaterial)));
    group.position.x = RIGHT;
    scene.add(group);
    return { group, side };
  });

  const weightMaterial = k.over();
  const weights = [LEFT, RIGHT].map(() => { const a = k.arrow(weightMaterial, 0.04); scene.add(a.group); return a; });
  const lift = k.arrow(weightMaterial, 0.04);
  scene.add(lift.group);

  label('plastic tube', [LEFT, HEIGHT + 0.42, 0]);
  label('copper tube', [RIGHT, HEIGHT + 0.42, 0]);
  const words = [label('falls freely', [LEFT - 0.35, -0.55, 0]), label('falls slowly,<br>at a steady speed', [RIGHT + 0.5, -0.6, 0])];
  const currentLabel = label('induced<br>currents', [RIGHT + 1.15, 2, 0]);

  let dropAt = null, last = -1;
  const place = s => {
    const plastic = s === null ? TOP : plasticY(s), copper = s === null ? TOP : copperY(s), speed = s === null ? 0 : copperV(s) / TERMINAL;
    magnets[0].position.y = plastic;
    magnets[1].position.y = copper;
    rings.forEach(({ group, side }) => {
      group.position.y = copper + side * 0.55;
      group.visible = speed > 0.05 && group.position.y > 0.05 && group.position.y < HEIGHT - 0.05;
    });
    ringMaterial.opacity = Math.min(1, speed * 1.2);
    currentLabel.anchor.y = copper;
    currentLabel.style.opacity = speed > 0.05 ? 1 : 0;
    // Forces once the magnets are let go, from each centre of mass: the weight, and in the copper
    // the upward magnetic force, growing to equal it.
    const falling = s !== null;
    weights[0].set(V(LEFT, plastic, 0), V(0, falling && plastic > BOTTOM ? -0.75 : 0, 0));
    weights[1].set(V(RIGHT, copper, 0), V(0, falling && copper > BOTTOM ? -0.75 : 0, 0));
    lift.set(V(RIGHT, copper, 0), V(0, 0.75 * speed, 0));
    words.forEach(el => { el.style.opacity = falling ? 1 : 0; });
  };

  return {
    look: [0, 1.95, 0],
    view: { turn: -0.32, lift: 0.2, far: 11.2 },
    sway: 0.08,
    alt: 'The same magnet, north pole up, is dropped through a vertical plastic tube and a vertical copper tube. In the plastic tube it falls freely and reaches the bottom in under a second. In the copper tube, rings of induced current appear below and above the magnet, circulating in opposite directions; they push up on it until the upward force equals its weight, and it falls slowly at a steady speed',
    still: 1,
    paint() {
      magnets.forEach(m => m.userData.paint(css));
      k.colour(baseMaterial, css, '--neutron', ['--card-bg', 0.55]);
      plasticMaterial.color.set(css('--neutron'));
      copperMaterial.color.set(css('--brand-accent'));
      k.colour(plasticRim, css, '--neutron');
      k.colour(copperRim, css, '--brand-accent');
      k.colour(ringMaterial, css, '--hl');
      k.colour(weightMaterial, css, '--brand-primary');
    },
    tick(t, still) {
      if (still) { place(1.6); return; }
      // Pressing → shows the play step and lets the magnets go; going back hides it again. A slide
      // opened with the step already shown starts with both magnets at the bottom.
      const pressed = !!fig.querySelector('.step.play.shown');
      if (t - last > 0.5) dropAt = pressed ? t - 60 : null;
      last = t;
      if (pressed && dropAt === null) dropAt = t;
      if (!pressed) dropAt = null;
      place(dropAt === null ? null : t - dropAt);
    }
  };
});

// ---------------------------------------------------------------------------------------------
// Slide 15: a rod sliding at speed v along two rails in a vertical field. Field, velocity and rod
// are at right angles. Seen from above, the induced current is anticlockwise: along the rod towards
// the far rail, round through the resistor and back along the near rail.
model3d('rod', ({ THREE, scene, css, label: plain }) => {
  const k = kit(THREE, scene), { V } = k, label = haloed(plain);
  const END = -2.3, RAIL = 2.4, W = 0.9, FROM = -0.9, TO = 1.5, T = 4;
  const railMaterial = k.mat(), resistorMaterial = k.mat();
  scene.add(k.wire([V(RAIL, 0, -W), V(END, 0, -W), V(END, 0, -0.32)], 0.04, railMaterial));
  scene.add(k.wire([V(RAIL, 0, W), V(END, 0, W), V(END, 0, 0.32)], 0.04, railMaterial));
  const resistor = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.16, 0.64), resistorMaterial);
  resistor.position.set(END, 0.02, 0);
  scene.add(resistor);

  const areaMaterial = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.2, side: THREE.DoubleSide, depthWrite: false });
  const area = new THREE.Mesh(new THREE.PlaneGeometry(1, 2 * W), areaMaterial);
  area.rotation.x = -Math.PI / 2;
  scene.add(area);
  const rodMaterial = k.mat({ roughness: 0.4, metalness: 0.2 });
  const rod = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.1, 2 * W + 0.36), rodMaterial);
  scene.add(rod);

  // The field: vertical lines, downwards, with their heads above the rails.
  const lineMaterial = k.mat({ transparent: true, opacity: 0.4, depthWrite: false });
  [-1.75, -1.05, -0.35, 0.35, 1.05, 1.75].forEach(x => [-1.3, -0.45, 0.45, 1.3].forEach(z => scene.add(k.fieldLine(V(x, 1.5, z), V(x, -0.7, z), lineMaterial, 0.35, 0.014))));

  const velocityMaterial = k.mat(), currentMaterial = k.mat();
  const velocity = k.arrow(velocityMaterial, 0.045), current = k.arrow(currentMaterial, 0.04);
  scene.add(velocity.group, current.group);
  // Arrowheads on the rest of the circuit.
  const heads = [[V(0, 0, -W), V(-1, 0, 0)], [V(END, 0.1, 0.18), V(0, 0, 1)], [V(0, 0, W), V(1, 0, 0)]].map(([at, dir]) => { const h = k.head(at, dir, 0.085, currentMaterial); scene.add(h); return h; });

  const guideMaterial = new THREE.LineDashedMaterial({ dashSize: 0.08, gapSize: 0.06 });
  const guide = new THREE.Line(new THREE.BufferGeometry().setFromPoints([V(RAIL + 0.25, 0, -W), V(RAIL + 0.25, 0, W)]), guideMaterial);
  guide.computeLineDistances();
  scene.add(guide);

  label('\\(B\\)', [-1.75, 1.75, -1.3]);
  label('\\(R\\)', [END - 0.4, 0.05, 0]);
  label('\\(L\\)', [RAIL + 0.55, 0, 0]);
  const vLabel = label('\\(v\\)', [0, 0.45, 0]);
  const iLabel = label('\\(I\\)', [0, 0.45, 0]);

  return {
    look: [0, -0.1, 0],
    view: { turn: -0.3, lift: 0.78, far: 9.4 },
    alt: 'A metal rod of length L slides at speed v along two horizontal rails joined at one end by a resistor R. The magnetic field B points vertically downwards. Field, velocity and rod are all at right angles. As the rod moves, the shaded area of the circuit grows and the flux through it increases; the induced current I flows along the rod towards the far rail, anticlockwise round the circuit seen from above',
    still: 1.6,
    paint() {
      k.colour(railMaterial, css, '--text-secondary');
      k.colour(resistorMaterial, css, '--neutron', ['--card-bg', 0.3]);
      areaMaterial.color.set(css('--brand-primary'));
      k.colour(rodMaterial, css, '--brand-accent');
      k.colour(lineMaterial, css, '--brand-accent-strong');
      k.colour(velocityMaterial, css, '--brand-accent');
      k.colour(currentMaterial, css, '--hl');
      guideMaterial.color.set(css('--text-secondary'));
    },
    tick(t) {
      const x = FROM + (TO - FROM) * (((t % T) + T) % T) / T;
      rod.position.set(x, 0.06, 0);
      area.scale.x = x - END;
      area.position.set((x + END) / 2, 0.005, 0);
      velocity.set(V(x + 0.1, 0.12, 0.12), V(0.8, 0, 0));
      current.set(V(x - 0.24, 0.1, 0.6), V(0, 0, -1.2));
      heads[0].position.x = heads[2].position.x = (x + END) / 2;
      vLabel.anchor.set(x + 0.55, 0.45, 0.12);
      iLabel.anchor.set(x - 0.5, 0.2, 0);
    }
  };
});

// ---------------------------------------------------------------------------------------------
// Slide 18: a magnet on a spring, north pole down, oscillating into a coil joined to a resistor,
// with the emf traced beside it as it happens. The emf follows the velocity of the magnet, and the
// current takes energy from the oscillation, so both die away together. Then the magnet is pulled
// down again and released.
model3d('spring', ({ THREE, scene, css, label: plain, holder }) => {
  const k = kit(THREE, scene), { V } = k, label = haloed(plain);
  const TOP = 3.3, REST = 1.65, AMPLITUDE = 0.55, HALF = 0.45;   // the magnet's centre at rest; half its length
  const PERIOD = 1.8, DAMPING = 0.2, RUN = 9, PULL = 1.4, CYCLE = RUN + PULL;
  const OMEGA = TAU / PERIOD;
  // Height of the magnet's centre and its velocity (in units of Aω), s seconds after release.
  const height = s => REST - AMPLITUDE * Math.exp(-DAMPING * s) * Math.cos(OMEGA * s);
  const speed = s => Math.exp(-DAMPING * s) * (DAMPING / OMEGA * Math.cos(OMEGA * s) + Math.sin(OMEGA * s));

  const supportMaterial = k.mat();
  const support = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.12, 0.6), supportMaterial);
  support.position.y = TOP + 0.06;
  scene.add(support);
  // The spring: a helix of unit height, stretched to reach the magnet.
  const springMaterial = k.mat({ roughness: 0.4, metalness: 0.3 });
  const curve = new THREE.Curve();
  curve.getPoint = (u, target = V()) => target.set(0.17 * Math.cos(u * 12 * TAU), -u, 0.17 * Math.sin(u * 12 * TAU));
  const spring = new THREE.Mesh(new THREE.TubeGeometry(curve, 240, 0.022, 5), springMaterial);
  spring.position.y = TOP;
  scene.add(spring);
  const bar = k.magnet(2 * HALF, 0.32, true, true);
  scene.add(bar);

  // The coil, upright, from y = 0 to y = 1, joined round through a resistor.
  const wireMaterial = k.mat({ roughness: 0.45, metalness: 0.2 }), resistorMaterial = k.mat();
  const coil = k.helix(0, 1, 0.42, 7, 0.04, wireMaterial).mesh;
  coil.rotation.z = Math.PI / 2;  // wound along x, turned to stand upright; both ends at x = 0.42
  scene.add(coil);
  scene.add(k.wire([V(0.42, 0, 0), V(1.15, 0, 0), V(1.15, 0.28, 0)], 0.03, wireMaterial));
  scene.add(k.wire([V(0.42, 1, 0), V(1.15, 1, 0), V(1.15, 0.72, 0)], 0.03, wireMaterial));
  const resistor = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.44, 0.16), resistorMaterial);
  resistor.position.set(1.15, 0.5, 0);
  scene.add(resistor);
  label('coil', [-0.85, 0.5, 0]);

  // The emf graph, traced as the magnet moves.
  const NS = 'http://www.w3.org/2000/svg', gx = s => 30 + 345 * s / RUN, gy = e => 160 - 100 * e;
  const graph = document.createElementNS(NS, 'svg');
  graph.setAttribute('viewBox', '0 0 400 320');
  graph.setAttribute('aria-hidden', 'true');
  graph.style.cssText = 'position:absolute;inset:0 0 0 46%;width:54%;height:100%;overflow:visible;pointer-events:none;';
  graph.innerHTML = `<path d="M30,290 V30 M30,160 H385" style="fill:none;stroke:var(--text-secondary);stroke-width:2.5"/><path d="M24,40 L30,26 L36,40 Z M375,154 L389,160 L375,166 Z" style="fill:var(--text-secondary)"/>`
    + `<text x="44" y="40" class="lbl mono" style="font-size:22px">emf</text><text x="385" y="200" class="lbl mono" text-anchor="end" style="font-size:22px">time</text>`
    + `<path class="emf-line" style="fill:none;stroke:var(--hl);stroke-width:4;stroke-linecap:round;stroke-linejoin:round"/><circle r="8" style="fill:var(--brand-accent-strong)"/>`
    + `<text x="205" y="292" class="lbl" text-anchor="middle" style="font-size:22px">the oscillation dies away:</text><text x="205" y="320" class="lbl" text-anchor="middle" style="font-size:22px">energy goes to the circuit</text>`;
  holder.appendChild(graph);
  const trace = graph.querySelector('.emf-line'), dot = graph.querySelector('circle');

  return {
    look: [0.1, 1.6, 0],
    view: { turn: -0.35, lift: 0.22, far: 8.2 },
    sway: 0.08,
    frame: 'width:46%;',
    alt: 'A bar magnet hangs from a spring with its north pole down, above a coil joined to a resistor. Pulled down and released, it oscillates in and out of the top of the coil. Beside it, a graph of emf against time is traced as it moves: an alternating emf, greatest when the magnet moves fastest, whose amplitude dies away along with the oscillation because the induced current takes energy from it',
    still: PULL + 6.2,
    paint() {
      bar.userData.paint(css);
      k.colour(supportMaterial, css, '--text-secondary');
      k.colour(springMaterial, css, '--text-secondary', ['--text-main', 0.3]);
      k.colour(wireMaterial, css, '--brand-accent');
      k.colour(resistorMaterial, css, '--neutron', ['--card-bg', 0.3]);
    },
    tick(t) {
      // Each cycle: the magnet is drawn down from rest, then released at s = 0.
      const c = ((t % CYCLE) + CYCLE) % CYCLE, s = c - PULL;
      const pulling = s < 0, last = height(RUN);
      const y = pulling ? last + (REST - AMPLITUDE - last) * ease(c / PULL) : height(s);
      bar.position.y = y;
      spring.scale.y = TOP - (y + HALF);
      if (pulling) {
        // While it is drawn down, the last trace stays on the graph, and the dot waits at the start.
        dot.setAttribute('cx', gx(0));
        dot.setAttribute('cy', gy(0));
        return;
      }
      const points = [];
      for (let u = 0; u <= s; u += 0.03) points.push(`${points.length ? 'L' : 'M'}${gx(u).toFixed(1)},${gy(speed(u)).toFixed(1)}`);
      trace.setAttribute('d', points.join(''));
      dot.setAttribute('cx', gx(s).toFixed(1));
      dot.setAttribute('cy', gy(speed(s)).toFixed(1));
    }
  };
});

// ---------------------------------------------------------------------------------------------
// Slide 22: a rectangular coil turning steadily between the poles of a magnet, with the emf drawn
// beside it. The normal and the velocities of the two long sides turn with the coil: along the
// field the sides move parallel to the lines and the emf is zero; across it they cut the lines
// fastest and the emf is greatest.
model3d('generator', ({ THREE, scene, css, label: plain, holder }) => {
  const k = kit(THREE, scene), { V } = k, label = haloed(plain);
  const T = 4, W = 0.85, D = 1.15, GAP = 1.75;
  [['N', -1], ['S', 1]].forEach(([letter, side]) => { const p = k.pole(letter, 0.4, 1.9, 2.5); p.position.x = side * (GAP + 0.2); scene.add(p); });
  const poles = scene.children.filter(c => c.userData.paint);
  const lineMaterial = k.mat({ transparent: true, opacity: 0.55 });
  [-0.75, 0, 0.75].forEach(y => [-0.8, 0.8].forEach(z => scene.add(k.fieldLine(V(-GAP, y, z), V(GAP, y, z), lineMaterial, 0.14, 0.014))));

  // The coil turns about the z axis; at angle θ its normal is (cos θ, sin θ, 0).
  const coil = new THREE.Group(), coilMaterial = k.mat({ roughness: 0.45, metalness: 0.2 });
  coil.add(k.wire([V(0, W, -D), V(0, W, D), V(0, -W, D), V(0, -W, -D), V(0, W, -D)], 0.05, coilMaterial));
  const normalMaterial = k.mat(), velocityMaterial = k.mat();
  const normal = k.arrow(normalMaterial, 0.045);
  normal.set(V(0, 0, 0), V(1.3, 0, 0));
  const sides = [1, -1].map(side => { const a = k.arrow(velocityMaterial, 0.04); a.set(V(0, side * W, 0), V(-side * 0.7, 0, 0)); return a; });
  coil.add(normal.group, ...sides.map(a => a.group));
  scene.add(coil);
  const axleMaterial = k.mat();
  scene.add(k.bar(V(0, 0, -1.6), V(0, 0, 2.0), 0.04, axleMaterial, 8));
  [1.35, 1.65].forEach(z => { const r = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.035, 5, 16), coilMaterial); r.position.z = z; scene.add(r); });

  label('\\(B\\)', [-GAP + 0.4, -1.0, 0.8]);
  const normalLabel = label('normal', [1.7, 0, 0]);

  // The emf graph, flat, beside the model: one turn of the coil is one cycle.
  const NS = 'http://www.w3.org/2000/svg', gx = u => 30 + 330 * u, gy = u => 160 - 105 * Math.sin(u * TAU);
  const graph = document.createElementNS(NS, 'svg');
  graph.setAttribute('viewBox', '0 0 400 320');
  graph.setAttribute('aria-hidden', 'true');
  graph.style.cssText = 'position:absolute;inset:0 0 0 57%;width:43%;height:100%;overflow:visible;pointer-events:none;';
  const curve = Array.from({ length: 121 }, (_, i) => `${i ? 'L' : 'M'}${gx(i / 120).toFixed(1)},${gy(i / 120).toFixed(1)}`).join(' ');
  graph.innerHTML = `<path d="M30,290 V30 M30,160 H385" style="fill:none;stroke:var(--text-secondary);stroke-width:2.5"/><path d="M24,40 L30,26 L36,40 Z M375,154 L389,160 L375,166 Z" style="fill:var(--text-secondary)"/>`
    + `<text x="44" y="40" class="lbl mono" style="font-size:22px">emf</text><text x="385" y="146" class="lbl mono" text-anchor="end" style="font-size:22px">time</text>`
    + `<path d="${curve}" style="fill:none;stroke:var(--hl);stroke-width:4.5;stroke-linecap:round"/><text x="195" y="312" class="lbl" text-anchor="middle" style="font-size:22px">one turn of the coil</text>`
    + `<circle r="10" style="fill:var(--brand-accent-strong)"/>`;
  holder.appendChild(graph);
  const dot = graph.querySelector('circle');

  return {
    look: [0, -0.1, 0.1],
    view: { turn: -0.38, lift: 0.3, far: 8.6 },
    sway: 0.08,
    frame: 'width:57%;',
    alt: 'A rectangular coil turns steadily about an axle between the north and south poles of a magnet, whose field lines run straight across from N to S. Arrows show the normal to the coil and the velocities of its two long sides. Beside it, a graph of emf against time is a sine curve with one cycle per turn: the emf is zero when the normal lies along the field and greatest when the plane of the coil lies along the field',
    still: 50 / 360 * T,
    paint() {
      poles.forEach(p => p.userData.paint(css));
      k.colour(lineMaterial, css, '--brand-accent-strong');
      k.colour(coilMaterial, css, '--brand-accent');
      k.colour(normalMaterial, css, '--hl');
      k.colour(velocityMaterial, css, '--brand-accent', ['--text-main', 0.2]);
      k.colour(axleMaterial, css, '--text-secondary');
    },
    tick(t) {
      const u = (((t % T) + T) % T) / T, theta = u * TAU;
      coil.rotation.z = theta;
      normalLabel.anchor.set(1.62 * Math.cos(theta), 1.62 * Math.sin(theta), 0.25);
      dot.setAttribute('cx', gx(u).toFixed(1));
      dot.setAttribute('cy', gy(u).toFixed(1));
    }
  };
});
