// PanPhyMech Matter.js world: spawn parts, camera scale, fluid force hook.
(function (root) {
  const PPM = root.PPM = root.PPM || {};
  const { fluid: Fluid, registry } = PPM;

  // 1 meter = SCALE pixels. +y is down in Matter.
  const SCALE = 60;
  const G = 9.81;

  function createWorld(canvas) {
    const Matter = root.Matter;
    const engine = Matter.Engine.create({
      gravity: { x: 0, y: 1, scale: 0.001 * G * SCALE }
    });
    const world = engine.world;
    const runner = Matter.Runner.create();
    let running = true;
    let nextId = 1;
    const fluids = [];
    const meta = new Map(); // body.id -> { kind, label, props }

    const render = Matter.Render.create({
      canvas,
      engine,
      options: {
        width: canvas.clientWidth || 800,
        height: canvas.clientHeight || 500,
        wireframes: false,
        background: 'transparent',
        pixelRatio: window.devicePixelRatio || 1,
        hasBounds: true
      }
    });

    // Floor bounds in meters relative to view; rebuilt on resize.
    let view = { w: 12, h: 7.5, cx: 0, cy: 2.2 };
    const walls = { ground: null, left: null, right: null };

    function m2px(m) { return m * SCALE; }
    function px2m(px) { return px / SCALE; }

    function syncBounds() {
      const W = canvas.clientWidth || 800;
      const H = canvas.clientHeight || 500;
      render.options.width = W;
      render.options.height = H;
      canvas.width = Math.round(W * (window.devicePixelRatio || 1));
      canvas.height = Math.round(H * (window.devicePixelRatio || 1));
      const halfW = (W / SCALE) / 2;
      const halfH = (H / SCALE) / 2;
      view.w = halfW * 2;
      view.h = halfH * 2;
      render.bounds.min.x = m2px(view.cx - halfW);
      render.bounds.max.x = m2px(view.cx + halfW);
      render.bounds.min.y = m2px(view.cy - halfH);
      render.bounds.max.y = m2px(view.cy + halfH);
      Matter.Render.setPixelRatio(render, window.devicePixelRatio || 1);
      rebuildBounds();
    }

    function rebuildBounds() {
      const thick = 0.4;
      const yFloor = view.cy + view.h / 2 - 0.15;
      const xL = view.cx - view.w / 2;
      const xR = view.cx + view.w / 2;
      for (const key of Object.keys(walls)) {
        if (walls[key]) Matter.World.remove(world, walls[key]);
      }
      walls.ground = Matter.Bodies.rectangle(
        m2px(view.cx), m2px(yFloor), m2px(view.w + 2), m2px(thick),
        { isStatic: true, friction: 0.6, label: 'ground', render: { fillStyle: '#8B8790' } }
      );
      walls.left = Matter.Bodies.rectangle(
        m2px(xL - thick / 2), m2px(view.cy), m2px(thick), m2px(view.h + 2),
        { isStatic: true, friction: 0.4, label: 'wall', render: { fillStyle: '#A8A4AE' } }
      );
      walls.right = Matter.Bodies.rectangle(
        m2px(xR + thick / 2), m2px(view.cy), m2px(thick), m2px(view.h + 2),
        { isStatic: true, friction: 0.4, label: 'wall', render: { fillStyle: '#A8A4AE' } }
      );
      Matter.World.add(world, [walls.ground, walls.left, walls.right]);
    }

    function labelFor(kind) {
      const prefix = { circle: 'C', box: 'B', ramp: 'R', wall: 'W', fluid: 'F' }[kind] || 'P';
      return prefix + (nextId++);
    }

    function styleBody(kind, fixed) {
      if (kind === 'ramp' || kind === 'wall') return { fillStyle: '#6B6570', strokeStyle: '#3D3A42', lineWidth: 1 };
      if (fixed) return { fillStyle: '#7C8494', strokeStyle: '#3D4450', lineWidth: 1 };
      if (kind === 'circle') return { fillStyle: '#3B82F6', strokeStyle: '#1E3A8A', lineWidth: 1 };
      return { fillStyle: '#F59E0B', strokeStyle: '#92400E', lineWidth: 1 };
    }

    function addCircle(x, y, props = {}) {
      const def = { ...registry.get('circle').defaults, ...props };
      const body = Matter.Bodies.circle(m2px(x), m2px(y), m2px(def.r), {
        density: def.density / (SCALE * SCALE), // Matter density is mass / px²
        friction: def.friction,
        restitution: def.restitution,
        isStatic: !!def.fixed,
        render: styleBody('circle', def.fixed),
        plugin: {}
      });
      const lab = def.label || labelFor('circle');
      meta.set(body.id, { kind: 'circle', label: lab, props: { ...def } });
      Matter.World.add(world, body);
      return body;
    }

    function addBox(x, y, props = {}) {
      const def = { ...registry.get('box').defaults, ...props };
      const body = Matter.Bodies.rectangle(m2px(x), m2px(y), m2px(def.w), m2px(def.h), {
        density: def.density / (SCALE * SCALE),
        friction: def.friction,
        restitution: def.restitution,
        isStatic: !!def.fixed,
        angle: ((def.angleDeg || 0) * Math.PI) / 180,
        render: styleBody('box', def.fixed),
        plugin: {}
      });
      const lab = def.label || labelFor('box');
      meta.set(body.id, { kind: 'box', label: lab, props: { ...def } });
      Matter.World.add(world, body);
      return body;
    }

    function addRamp(x, y, props = {}) {
      const def = { ...registry.get('ramp').defaults, ...props };
      const body = Matter.Bodies.rectangle(m2px(x), m2px(y), m2px(def.w), m2px(def.h), {
        isStatic: true,
        friction: def.friction,
        angle: (def.angleDeg * Math.PI) / 180,
        render: styleBody('ramp', true)
      });
      const lab = def.label || labelFor('ramp');
      meta.set(body.id, { kind: 'ramp', label: lab, props: { ...def } });
      Matter.World.add(world, body);
      return body;
    }

    function addWall(x, y, props = {}) {
      const def = { ...registry.get('wall').defaults, ...props };
      const body = Matter.Bodies.rectangle(m2px(x), m2px(y), m2px(def.w), m2px(def.h), {
        isStatic: true,
        friction: def.friction,
        render: styleBody('wall', true)
      });
      const lab = def.label || labelFor('wall');
      meta.set(body.id, { kind: 'wall', label: lab, props: { ...def } });
      Matter.World.add(world, body);
      return body;
    }

    function addFluid(x, y, props = {}) {
      const def = { ...registry.get('fluid').defaults, ...props };
      const lab = def.labelName || labelFor('fluid');
      const item = {
        id: 'fluid-' + nextId++,
        label: lab,
        kind: 'fluid',
        x, y,
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
      Matter.World.clear(world, false);
      meta.clear();
      fluids.length = 0;
      nextId = 1;
      rebuildBounds();
    }

    // Matter Runner velocity is in px/s.
    function velocityMs(body) {
      return { vx: body.velocity.x / SCALE, vy: body.velocity.y / SCALE };
    }

    function applyFluidForces() {
      if (!fluids.length) return;
      for (const body of Matter.Composite.allBodies(world)) {
        if (body.isStatic) continue;
        const m = meta.get(body.id);
        if (!m || (m.kind !== 'circle' && m.kind !== 'box')) continue;
        const { vx, vy } = velocityMs(body);
        let fx = 0, fy = 0;
        for (const f of fluids) {
          const region = {
            left: f.x - f.w / 2,
            right: f.x + f.w / 2,
            top: f.y - f.h / 2,
            bottom: f.y + f.h / 2,
            rho: f.rho,
            eta: f.eta
          };
          let forces;
          if (m.kind === 'circle') {
            forces = Fluid.fluidForcesForCircle(region, {
              cx: body.position.x / SCALE,
              cy: body.position.y / SCALE,
              r: body.circleRadius / SCALE,
              vx, vy,
              area: body.area / (SCALE * SCALE)
            }, G, +1);
          } else {
            const b = body.bounds;
            forces = Fluid.fluidForcesForBox(region, {
              left: b.min.x / SCALE,
              top: b.min.y / SCALE,
              right: b.max.x / SCALE,
              bottom: b.max.y / SCALE,
              vx, vy,
              area: body.area / (SCALE * SCALE)
            }, G, +1);
          }
          // Matter expects force in (mass * px / s²). SI force N = kg m/s² → * SCALE.
          fx += forces.fx * SCALE;
          fy += forces.fy * SCALE;
          m.lastFluid = forces;
        }
        if (fx || fy) Matter.Body.applyForce(body, body.position, { x: fx, y: fy });
      }
    }

    Matter.Events.on(engine, 'beforeUpdate', applyFluidForces);

    // Draw fluid overlays after Matter render.
    Matter.Events.on(render, 'afterRender', () => {
      const ctx = render.context;
      const bounds = render.bounds;
      ctx.save();
      for (const f of fluids) {
        const x = m2px(f.x - f.w / 2) - bounds.min.x;
        const y = m2px(f.y - f.h / 2) - bounds.min.y;
        const w = m2px(f.w);
        const h = m2px(f.h);
        ctx.fillStyle = 'rgba(56, 189, 248, 0.28)';
        ctx.strokeStyle = 'rgba(3, 105, 161, 0.7)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.rect(x, y, w, h);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = 'rgba(12, 74, 110, 0.9)';
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
      syncBounds();
      Matter.Render.run(render);
      setRunning(true);
    }

    function clientToWorld(clientX, clientY) {
      const rect = canvas.getBoundingClientRect();
      const px = ((clientX - rect.left) / rect.width) * (render.bounds.max.x - render.bounds.min.x) + render.bounds.min.x;
      const py = ((clientY - rect.top) / rect.height) * (render.bounds.max.y - render.bounds.min.y) + render.bounds.min.y;
      return { x: px2m(px), y: px2m(py) };
    }

    function hitTest(clientX, clientY) {
      const p = clientToWorld(clientX, clientY);
      const px = { x: m2px(p.x), y: m2px(p.y) };
      const bodies = Matter.Query.point(Matter.Composite.allBodies(world), px).filter((b) => meta.has(b.id));
      if (bodies.length) return { type: 'body', body: bodies[0], meta: meta.get(bodies[0].id) };
      for (let i = fluids.length - 1; i >= 0; i--) {
        const f = fluids[i];
        if (p.x >= f.x - f.w / 2 && p.x <= f.x + f.w / 2 && p.y >= f.y - f.h / 2 && p.y <= f.y + f.h / 2) {
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
      if ('density' in patch && !body.isStatic) {
        // Recreate mass from density × area in px².
        Matter.Body.setDensity(body, patch.density / (SCALE * SCALE));
      }
      if (m.kind === 'circle' && 'r' in patch) {
        // Scaling circle: recreate is safer; for prototype, ignore live radius edit beyond density.
      }
    }

    const mouse = Matter.Mouse.create(canvas);
    const mouseConstraint = Matter.MouseConstraint.create(engine, {
      mouse,
      constraint: { stiffness: 0.15, render: { visible: false } }
    });
    Matter.World.add(world, mouseConstraint);
    render.mouse = mouse;

    function resize() {
      syncBounds();
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
