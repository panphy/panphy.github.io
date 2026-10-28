// PanPhyMech Matter.js world: pixel-space bodies, SI fluid forces.
(function (root) {
  const PPM = root.PPM = root.PPM || {};
  const { fluid: Fluid, registry } = PPM;

  // 1 meter = SCALE pixels. Matter +y is down.
  const SCALE = 60;
  const G = 9.81;

  function createWorld(canvas) {
    const Matter = root.Matter;
    const engine = Matter.Engine.create({
      // Effective g ≈ 9.81 m/s² with SCALE px/m (Matter gravity uses scale 0.001).
      gravity: { x: 0, y: 1, scale: 0.001 * G * SCALE }
    });
    const world = engine.world;
    const runner = Matter.Runner.create();
    let running = true;
    let nextId = 1;
    const fluids = [];
    const meta = new Map();
    let size = { w: 800, h: 500 };

    const render = Matter.Render.create({
      canvas,
      engine,
      options: {
        width: size.w,
        height: size.h,
        wireframes: false,
        background: 'transparent',
        showAngleIndicator: false
      }
    });

    const walls = { ground: null, left: null, right: null };

    function m2px(m) { return m * SCALE; }
    function px2m(px) { return px / SCALE; }

    // Origin for example placement: horizontal center, near top of usable area.
    function origin() {
      return { x: px2m(size.w / 2), y: px2m(Math.max(80, size.h * 0.08)) };
    }

    function toPixels(mx, my) {
      const o = origin();
      return { x: m2px(o.x + mx), y: m2px(o.y + my) };
    }

    function fromPixels(px, py) {
      const o = origin();
      return { x: px2m(px) - o.x, y: px2m(py) - o.y };
    }

    function syncSize() {
      const w = Math.max(320, canvas.clientWidth || 800);
      const h = Math.max(240, canvas.clientHeight || 500);
      size = { w, h };
      render.options.width = w;
      render.options.height = h;
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';
      Matter.Render.setPixelRatio(render, window.devicePixelRatio || 1);
      rebuildBounds();
    }

    function rebuildBounds() {
      const thick = 24;
      for (const key of Object.keys(walls)) {
        if (walls[key]) Matter.World.remove(world, walls[key]);
      }
      walls.ground = Matter.Bodies.rectangle(size.w / 2, size.h - thick / 2, size.w + 100, thick, {
        isStatic: true, friction: 0.6, label: 'ground',
        render: { fillStyle: '#8B8790', strokeStyle: '#5c5668', lineWidth: 1 }
      });
      walls.left = Matter.Bodies.rectangle(thick / 2, size.h / 2, thick, size.h + 100, {
        isStatic: true, friction: 0.4, label: 'wall',
        render: { fillStyle: '#A8A4AE', strokeStyle: '#5c5668', lineWidth: 1 }
      });
      walls.right = Matter.Bodies.rectangle(size.w - thick / 2, size.h / 2, thick, size.h + 100, {
        isStatic: true, friction: 0.4, label: 'wall',
        render: { fillStyle: '#A8A4AE', strokeStyle: '#5c5668', lineWidth: 1 }
      });
      Matter.World.add(world, [walls.ground, walls.left, walls.right]);
    }

    function labelFor(kind) {
      const prefix = { circle: 'C', box: 'B', ramp: 'R', wall: 'W', fluid: 'F' }[kind] || 'P';
      return prefix + (nextId++);
    }

    function styleBody(kind, fixed) {
      if (kind === 'ramp' || kind === 'wall') return { fillStyle: '#6B6570', strokeStyle: '#3D3A42', lineWidth: 2 };
      if (fixed) return { fillStyle: '#7C8494', strokeStyle: '#3D4450', lineWidth: 2 };
      if (kind === 'circle') return { fillStyle: '#3B82F6', strokeStyle: '#1E3A8A', lineWidth: 2 };
      return { fillStyle: '#F59E0B', strokeStyle: '#92400E', lineWidth: 2 };
    }

    function addCircle(mx, my, props = {}) {
      const def = { ...registry.get('circle').defaults, ...props };
      const p = toPixels(mx, my);
      const body = Matter.Bodies.circle(p.x, p.y, m2px(def.r), {
        density: def.density / (SCALE * SCALE),
        friction: def.friction,
        restitution: def.restitution,
        isStatic: !!def.fixed,
        render: styleBody('circle', def.fixed)
      });
      meta.set(body.id, { kind: 'circle', label: def.label || labelFor('circle'), props: { ...def } });
      Matter.World.add(world, body);
      return body;
    }

    function addBox(mx, my, props = {}) {
      const def = { ...registry.get('box').defaults, ...props };
      const p = toPixels(mx, my);
      const body = Matter.Bodies.rectangle(p.x, p.y, m2px(def.w), m2px(def.h), {
        density: def.density / (SCALE * SCALE),
        friction: def.friction,
        restitution: def.restitution,
        isStatic: !!def.fixed,
        angle: ((def.angleDeg || 0) * Math.PI) / 180,
        render: styleBody('box', def.fixed)
      });
      meta.set(body.id, { kind: 'box', label: def.label || labelFor('box'), props: { ...def } });
      Matter.World.add(world, body);
      return body;
    }

    function addRamp(mx, my, props = {}) {
      const def = { ...registry.get('ramp').defaults, ...props };
      const p = toPixels(mx, my);
      const body = Matter.Bodies.rectangle(p.x, p.y, m2px(def.w), m2px(def.h), {
        isStatic: true,
        friction: def.friction,
        angle: (def.angleDeg * Math.PI) / 180,
        render: styleBody('ramp', true)
      });
      meta.set(body.id, { kind: 'ramp', label: def.label || labelFor('ramp'), props: { ...def } });
      Matter.World.add(world, body);
      return body;
    }

    function addWall(mx, my, props = {}) {
      const def = { ...registry.get('wall').defaults, ...props };
      const p = toPixels(mx, my);
      const body = Matter.Bodies.rectangle(p.x, p.y, m2px(def.w), m2px(def.h), {
        isStatic: true,
        friction: def.friction,
        render: styleBody('wall', true)
      });
      meta.set(body.id, { kind: 'wall', label: def.label || labelFor('wall'), props: { ...def } });
      Matter.World.add(world, body);
      return body;
    }

    function addFluid(mx, my, props = {}) {
      const def = { ...registry.get('fluid').defaults, ...props };
      const item = {
        id: 'fluid-' + nextId++,
        label: def.labelName || labelFor('fluid'),
        kind: 'fluid',
        x: mx,
        y: my,
        w: def.w,
        h: def.h,
        rho: def.rho,
        eta: def.eta,
        name: def.label || 'Fluid'
      };
      fluids.push(item);
      return item;
    }

    function clearScene() {
      const keep = new Set(Object.values(walls).filter(Boolean));
      for (const body of Matter.Composite.allBodies(world)) {
        if (!keep.has(body)) Matter.World.remove(world, body);
      }
      meta.clear();
      fluids.length = 0;
      nextId = 1;
      rebuildBounds();
    }

    function velocityMs(body) {
      return { vx: body.velocity.x / SCALE, vy: body.velocity.y / SCALE };
    }

    function applyFluidForces() {
      if (!fluids.length) return;
      const o = origin();
      for (const body of Matter.Composite.allBodies(world)) {
        if (body.isStatic) continue;
        const m = meta.get(body.id);
        if (!m || (m.kind !== 'circle' && m.kind !== 'box')) continue;
        const { vx, vy } = velocityMs(body);
        let fx = 0, fy = 0;
        for (const f of fluids) {
          const region = {
            left: o.x + f.x - f.w / 2,
            right: o.x + f.x + f.w / 2,
            top: o.y + f.y - f.h / 2,
            bottom: o.y + f.y + f.h / 2,
            rho: f.rho,
            eta: f.eta
          };
          let forces;
          if (m.kind === 'circle') {
            forces = Fluid.fluidForcesForCircle(region, {
              cx: px2m(body.position.x),
              cy: px2m(body.position.y),
              r: body.circleRadius / SCALE,
              vx, vy,
              area: body.area / (SCALE * SCALE)
            }, G, +1);
          } else {
            const b = body.bounds;
            forces = Fluid.fluidForcesForBox(region, {
              left: px2m(b.min.x),
              top: px2m(b.min.y),
              right: px2m(b.max.x),
              bottom: px2m(b.max.y),
              vx, vy,
              area: body.area / (SCALE * SCALE)
            }, G, +1);
          }
          fx += forces.fx * SCALE;
          fy += forces.fy * SCALE;
          m.lastFluid = forces;
        }
        if (fx || fy) Matter.Body.applyForce(body, body.position, { x: fx, y: fy });
      }
    }

    Matter.Events.on(engine, 'beforeUpdate', applyFluidForces);

    Matter.Events.on(render, 'afterRender', () => {
      const ctx = render.context;
      const o = origin();
      ctx.save();
      for (const f of fluids) {
        const x = m2px(o.x + f.x - f.w / 2);
        const y = m2px(o.y + f.y - f.h / 2);
        const w = m2px(f.w);
        const h = m2px(f.h);
        ctx.fillStyle = 'rgba(56, 189, 248, 0.32)';
        ctx.strokeStyle = 'rgba(3, 105, 161, 0.85)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.rect(x, y, w, h);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = 'rgba(12, 74, 110, 0.95)';
        ctx.font = '600 12px Figtree, sans-serif';
        ctx.fillText(`${f.label} · ρ=${f.rho} · η=${f.eta}`, x + 8, y + 18);
      }
      ctx.restore();
    });

    function setRunning(on) {
      running = on;
      if (on) Matter.Runner.run(runner, engine);
      else Matter.Runner.stop(runner);
    }

    function start() {
      syncSize();
      Matter.Render.run(render);
      setRunning(true);
    }

    function clientToWorld(clientX, clientY) {
      const rect = canvas.getBoundingClientRect();
      const px = ((clientX - rect.left) / rect.width) * size.w;
      const py = ((clientY - rect.top) / rect.height) * size.h;
      return fromPixels(px, py);
    }

    function hitTest(clientX, clientY) {
      const rect = canvas.getBoundingClientRect();
      const px = ((clientX - rect.left) / rect.width) * size.w;
      const py = ((clientY - rect.top) / rect.height) * size.h;
      const bodies = Matter.Query.point(Matter.Composite.allBodies(world), { x: px, y: py })
        .filter((b) => meta.has(b.id));
      if (bodies.length) return { type: 'body', body: bodies[0], meta: meta.get(bodies[0].id) };
      const local = fromPixels(px, py);
      for (let i = fluids.length - 1; i >= 0; i--) {
        const f = fluids[i];
        if (local.x >= f.x - f.w / 2 && local.x <= f.x + f.w / 2 &&
            local.y >= f.y - f.h / 2 && local.y <= f.y + f.h / 2) {
          return { type: 'fluid', fluid: f };
        }
      }
      return null;
    }

    function removeSelection(sel) {
      if (!sel) return;
      if (sel.type === 'body') {
        meta.delete(sel.body.id);
        Matter.World.remove(world, sel.body);
      } else if (sel.type === 'fluid') {
        const i = fluids.indexOf(sel.fluid);
        if (i >= 0) fluids.splice(i, 1);
      }
    }

    function updateProps(sel, patch) {
      if (!sel) return;
      if (sel.type === 'fluid') {
        Object.assign(sel.fluid, patch);
        return;
      }
      const m = meta.get(sel.body.id);
      if (!m) return;
      Object.assign(m.props, patch);
      const body = sel.body;
      if ('friction' in patch) body.friction = patch.friction;
      if ('restitution' in patch) body.restitution = patch.restitution;
      if ('fixed' in patch) Matter.Body.setStatic(body, !!patch.fixed);
      if ('density' in patch && !body.isStatic) Matter.Body.setDensity(body, patch.density / (SCALE * SCALE));
    }

    const mouse = Matter.Mouse.create(canvas);
    const mouseConstraint = Matter.MouseConstraint.create(engine, {
      mouse,
      constraint: { stiffness: 0.2, render: { visible: false } }
    });
    Matter.World.add(world, mouseConstraint);
    render.mouse = mouse;

    function resize() {
      syncSize();
      Matter.Mouse.setElement(mouse, canvas);
    }

    return {
      SCALE, G, engine, world, render, meta, fluids,
      start, resize, setRunning,
      get running() { return running; },
      addCircle, addBox, addRamp, addWall, addFluid, clearScene,
      clientToWorld, hitTest, removeSelection, updateProps,
      mouseConstraint
    };
  }

  PPM.world = { createWorld, SCALE, G };
})(typeof globalThis === 'object' ? globalThis : this);
