// Preview motion in an isolated world; never advance the live simulation or recorder.
(function (root) {
  const PPM = root.PPM;
  const S = PPM.scene;
  async function motionBox(scene, capture, cancelled = () => false) {
    const copy = JSON.parse(S.serialize(scene));
    if (capture) copy.bodies.forEach((b) => Object.assign(b, capture[b.id] || {}));
    const initial = S.fitBox(copy);
    const farBodies = new Set(copy.bodies.filter((b) => initial.far.some((item) => item.name === b.name && (item.x === b.x && item.y === b.y || !Number.isFinite(b.x) || !Number.isFinite(b.y)))).map((b) => b.id));
    // Retain the existing runaway-object protection, but do not discard valid future travel.
    const visible = copy.bodies.filter((b) => !farBodies.has(b.id));
    const visibleIds = new Set(visible.map((b) => b.id));
    let box = null;
    const add = (p, pad = 0) => {
      if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) return;
      if (!box) box = { minX: p.x - pad, maxX: p.x + pad, minY: p.y - pad, maxY: p.y + pad };
      else { box.minX = Math.min(box.minX, p.x - pad); box.maxX = Math.max(box.maxX, p.x + pad); box.minY = Math.min(box.minY, p.y - pad); box.maxY = Math.max(box.maxY, p.y + pad); }
    };
    let duration = 10;
    // Cover slow oscillators and long ballistic flights as well as the usual ten seconds.
    copy.links.forEach((l) => {
      if (l.kind === 'spring' && l.k > 0) {
        const mass = [l.a, l.b].reduce((sum, id) => sum + (S.bodyById(copy, id)?.mass || 0), 0);
        duration = Math.max(duration, 2.4 * Math.PI * Math.sqrt(mass / l.k));
      }
      if ((l.kind === 'rod' || l.kind === 'rope') && copy.world.gravity > 0) duration = Math.max(duration, 2.4 * Math.PI * Math.sqrt(l.length / copy.world.gravity));
    });
    if (copy.world.floor && copy.world.gravity > 0) visible.forEach((b) => {
      if (!b.fixed) duration = Math.max(duration, (b.vy + Math.sqrt(b.vy * b.vy + 2 * copy.world.gravity * Math.max(0, b.y))) / copy.world.gravity + 1);
    });
    duration = Math.min(60, duration);
    const sim = PPM.physics.createSim(copy);
    const sample = () => {
      visible.forEach((b) => {
        const pose = sim.pose(b.id);
        if (b.kind === 'ball') add(pose, b.r);
        else S.vertices(b).forEach((v) => add(S.toWorld(pose, v)));
      });
      copy.links.forEach((l) => {
        if ((l.a && !visibleIds.has(l.a)) || (l.b && !visibleIds.has(l.b))) return;
        const a = S.endPoint(copy, l.a, l.la, (b) => sim.pose(b.id));
        const b = S.endPoint(copy, l.b, l.lb, (body) => sim.pose(body.id));
        add(a, 0.1); add(b, 0.1);
        const points = sim.solidPoints(l.id);
        if (points) points.forEach((p) => add(p, 0.04));
        else if (l.kind === 'rope') {
          const d = Math.hypot(a.x - b.x, a.y - b.y);
          if (d > 1e-6 && l.length > d * 1.003) add({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 - Math.sqrt(3 * d * (l.length - d) / 8) });
        }
      });
    };
    sample();
    let steps = 0;
    while (sim.t < duration && steps < 60000) {
      if (steps % 240 === 0 && cancelled()) return null;
      sim.step();
      sample();
      if (++steps % 240 === 0) await new Promise((resolve) => setTimeout(resolve, 0));
    }
    // Only include ground when the motion actually reaches it or rests near it.
    if (box && copy.world.floor && box.minY >= 0 && box.minY < 0.3) box.minY = 0;
    return { box, far: initial.far, duration: sim.t };
  }
  PPM.framing = { motionBox };
})(typeof window !== 'undefined' ? window : globalThis);
