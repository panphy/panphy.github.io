// PanPhyMech: example scenes. Each one is built fresh in SI units; the app fits the view
// and starts the graph on the named object.
(function (root) {
  const PPM = root.PPM = root.PPM || {};
  const S = PPM.scene;

  function add(scene, type, x, y, props = {}) {
    const b = S.makeBody(scene, type, x, y);
    Object.assign(b, props);
    scene.bodies.push(b);
    return b;
  }

  function link(scene, type, a, la, b, lb, props = {}) {
    const l = S.makeLink(scene, type, a ? a.id : null, la, b ? b.id : null, lb);
    Object.assign(l, props);
    if (l.kind === 'rod' || l.kind === 'rope') l.length = S.linkLength(scene, l);
    scene.links.push(l);
    return l;
  }

  // A fixed right-angled ramp whose sloping face runs from (x0, h) down to (x0 + w, 0).
  function ramp(scene, x0, w, h, props = {}, flip = false) {
    const cx = flip ? x0 + (2 * w) / 3 : x0 + w / 3;
    return add(scene, 'wedge', cx, h / 3, { w, h, flip, ...props });
  }

  const list = [
    {
      id: 'projectile',
      title: 'Projectile',
      text: 'A ball launched at 12 m/s, 50° above the horizontal. Compare the range with \\(\\dfrac{v^2 \\sin 2\\theta}{g}\\).',
      plain: 'A ball launched at 12 m/s, 50° above the horizontal. Compare the range with v² sin 2θ / g.',
      track: { name: 'Ball', group: 'position' },
      view: { minX: -1, maxX: 16, minY: 0, maxY: 7 },
      build() {
        const s = S.createScene();
        add(s, 'ball', 0, 0.15, { name: 'Ball', r: 0.15, mass: 0.5, restitution: 0.3, vx: 12 * Math.cos(50 * Math.PI / 180), vy: 12 * Math.sin(50 * Math.PI / 180) });
        return s;
      }
    },
    {
      id: 'terminal-velocity',
      title: 'Terminal velocity',
      text: 'Two identical balls fall 6 m. The blue ball has drag and soon levels off at its terminal velocity of 3 m/s; the coral ball has none. The graph shows the blue ball.',
      track: { name: 'With drag', group: 'velocity', hide: ['vx'] },
      view: { minX: -2, maxX: 2, minY: 0, maxY: 7.6 },
      build() {
        const s = S.createScene();
        const mass = 0.5, radius = 0.4, dropHeight = 6, terminalVelocity = 3;
        s.world.dragModel = 'quadratic';
        s.world.drag = mass * s.world.gravity / (terminalVelocity * terminalVelocity);
        const y = dropHeight + radius;
        const props = { mass, r: radius, restitution: 0 };
        // For quadratic drag, 99% of terminal velocity is reached after about 1.8 m.
        // None replaces World drag for the coral ball; the blue ball inherits it.
        add(s, 'ball', -0.9, y, { ...props, name: 'No drag', color: 'coral', dragModel: 'none' });
        add(s, 'ball', 0.9, y, { ...props, name: 'With drag', color: 'blue' });
        return s;
      }
    },
    {
      id: 'pendulum',
      title: 'Simple pendulum',
      text: 'A 1 kg bob on a 2.5 m rod, released from 25°. Watch kinetic and gravitational energy swap. Gravitational energy is zero at the lowest point.',
      track: { name: 'Bob', group: 'energy' },
      build() {
        const s = S.createScene();
        s.world.gpeZero = 2; // the lowest point of the swing
        const a = (25 * Math.PI) / 180;
        const bob = add(s, 'ball', 2.5 * Math.sin(a), 4.5 - 2.5 * Math.cos(a), { name: 'Bob', r: 0.15, mass: 1 });
        link(s, 'rod', null, { x: 0, y: 4.5 }, bob, { x: 0, y: 0 }, { name: 'Rod' });
        return s;
      }
    },
    {
      id: 'spring',
      title: 'Mass on a spring',
      text: 'A 1 kg mass released from the spring’s natural length. The period is \\(2\\pi\\sqrt{\\dfrac{m}{k}}\\) and the total energy stays constant. Gravitational energy is zero at the lowest point.',
      plain: 'A 1 kg mass released from the spring’s natural length. The period is 2π√(m/k) and the total energy stays constant. Gravitational energy is zero at the lowest point.',
      track: { name: 'Mass', group: 'energy' },
      build() {
        const s = S.createScene();
        s.world.gpeZero = 2.8; // the lowest point of the oscillation
        const mass = add(s, 'box', 0, 3.3, { name: 'Mass', w: 0.4, h: 0.4, mass: 1, lockRotation: true });
        link(s, 'spring', null, { x: 0, y: 5 }, mass, { x: 0, y: 0.2 }, { name: 'Spring', k: 40, rest: 1.5 });
        return s;
      }
    },
    {
      id: 'horizontal-spring',
      title: 'Oscillator on a frictionless floor',
      text: 'A block stretched 0.5 m from a wall and let go. Displacement and velocity are a quarter cycle apart.',
      track: { name: 'Block', group: 'position' },
      build() {
        const s = S.createScene();
        s.world.floorFriction = 0;
        const wall = add(s, 'wall', -3, 1, { name: 'Wall', w: 0.3, h: 2, friction: 0 });
        const block = add(s, 'box', -0.6, 0.25, { name: 'Block', mass: 1, friction: 0, lockRotation: true });
        link(s, 'spring', wall, { x: 0.15, y: -0.75 }, block, { x: -0.25, y: 0 }, { name: 'Spring', k: 30, rest: 1.5 });
        return s;
      }
    },
    {
      id: 'collision',
      title: 'Elastic collision',
      text: 'Carts of 1 kg and 2 kg on a frictionless track, restitution 1. Total momentum and kinetic energy are conserved.',
      track: { name: 'Cart A', group: 'velocity' },
      build() {
        const s = S.createScene();
        s.world.floorFriction = 0;
        add(s, 'box', -3, 0.25, { name: 'Cart A', w: 0.6, h: 0.5, mass: 1, vx: 3, friction: 0, restitution: 1, lockRotation: true, color: 'blue' });
        add(s, 'box', 2, 0.3, { name: 'Cart B', w: 0.7, h: 0.6, mass: 2, vx: -1, friction: 0, restitution: 1, lockRotation: true, color: 'coral' });
        return s;
      }
    },
    {
      id: 'ramp',
      title: 'Block on a ramp',
      text: 'A block slides down a 30° slope with \\(\\mu = 0.25\\). Its acceleration should be \\(g(\\sin\\theta - \\mu\\cos\\theta)\\).',
      plain: 'A block slides down a 30° slope with μ = 0.25. Its acceleration should be g(sin θ − μ cos θ).',
      track: { name: 'Block', group: 'velocity' },
      build() {
        const s = S.createScene();
        const theta = (30 * Math.PI) / 180;
        const w = 5;
        const h = w * Math.tan(theta);
        ramp(s, -2.5, w, h, { name: 'Ramp', friction: 0.25 });
        const d = 0.7; // distance down the slope from its top
        const px = -2.5 + d * Math.cos(theta);
        const py = h - d * Math.sin(theta);
        const off = 0.2; // half the block
        add(s, 'box', px + off * Math.sin(theta), py + off * Math.cos(theta), { name: 'Block', w: 0.4, h: 0.4, angle: -theta, friction: 0.25, restitution: 0 });
        return s;
      }
    },
    {
      id: 'bounce',
      title: 'Bouncing balls',
      text: 'Three balls dropped from 3 m with restitution 0.9, 0.7 and 0.4. Each bounce reaches \\(e^2\\) times the last height.',
      plain: 'Three balls dropped from 3 m with restitution 0.9, 0.7 and 0.4. Each bounce reaches e² times the last height.',
      track: { name: 'e = 0.9', group: 'position' },
      build() {
        const s = S.createScene();
        add(s, 'ball', -1.5, 3, { name: 'e = 0.9', r: 0.2, restitution: 0.9, color: 'blue' });
        add(s, 'ball', 0, 3, { name: 'e = 0.7', r: 0.2, restitution: 0.7, color: 'amber' });
        add(s, 'ball', 1.5, 3, { name: 'e = 0.4', r: 0.2, restitution: 0.4, color: 'coral' });
        return s;
      }
    },
    {
      id: 'car',
      title: 'Motor car',
      text: 'Two motorized wheels hinged to a chassis drive the car up a slope. Try changing the motor speed and torque.',
      track: { name: 'Chassis', group: 'velocity' },
      build() {
        const s = S.createScene();
        const chassis = add(s, 'box', -4, 0.75, { name: 'Chassis', w: 1.6, h: 0.3, mass: 4, color: 'violet' });
        const back = add(s, 'ball', -4.55, 0.3, { name: 'Back wheel', r: 0.3, mass: 0.5, friction: 1, restitution: 0.1, color: 'slate' });
        const front = add(s, 'ball', -3.45, 0.3, { name: 'Front wheel', r: 0.3, mass: 0.5, friction: 1, restitution: 0.1, color: 'slate' });
        link(s, 'motor', back, { x: 0, y: 0 }, chassis, { x: -0.55, y: -0.45 }, { name: 'Back motor', speed: -8, torque: 20 });
        link(s, 'motor', front, { x: 0, y: 0 }, chassis, { x: 0.55, y: -0.45 }, { name: 'Front motor', speed: -8, torque: 20 });
        ramp(s, 0, 6, 1.2, { name: 'Slope', friction: 0.9 }, true);
        return s;
      }
    },
    {
      id: 'dominoes',
      title: 'Dominoes',
      text: 'A rolling ball knocks over a row of dominoes. Follow the total energy of the system as it falls.',
      track: { name: '', group: 'energy' },
      build() {
        const s = S.createScene();
        add(s, 'ball', -4, 0.2, { name: 'Ball', r: 0.2, mass: 1, vx: 3, color: 'coral' });
        for (let i = 0; i < 10; i++) {
          add(s, 'box', -2 + i * 0.55, 0.45, { name: `Domino ${i + 1}`, w: 0.1, h: 0.9, mass: 0.3, friction: 0.5, restitution: 0.05, color: i % 2 ? 'teal' : 'blue' });
        }
        return s;
      }
    },
    {
      id: 'seesaw',
      title: 'See-saw launcher',
      text: 'A 10 kg box lands on one end of a hinged plank and throws a 0.5 kg box into the air.',
      track: { name: 'Small box', group: 'position' },
      build() {
        const s = S.createScene();
        add(s, 'wedge', 0, 0.175, { name: 'Pivot', kind: 'polygon', r: 0.35, sides: 3 });
        const plank = add(s, 'plank', 0, 0.62, { name: 'Plank', w: 4, h: 0.12, mass: 3, color: 'amber' });
        link(s, 'hinge', plank, { x: 0, y: 0 }, null, { x: 0, y: 0.62 }, { name: 'Pivot hinge' });
        add(s, 'box', -1.8, 0.88, { name: 'Small box', w: 0.4, h: 0.4, mass: 0.5, color: 'green' });
        add(s, 'box', 1.7, 4, { name: 'Heavy box', w: 0.5, h: 0.5, mass: 10, color: 'coral' });
        return s;
      }
    }
  ];

  PPM.examples = { list };
})(typeof window !== 'undefined' ? window : globalThis);
