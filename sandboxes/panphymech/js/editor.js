// PanPhyMech: canvas interaction. Placing objects and connectors, selecting, moving,
// rotating and resizing (with hinged and glued parts moving together), grabbing
// moving objects during a run, panning and zooming.
(function (root) {
  const PPM = root.PPM = root.PPM || {};
  const S = PPM.scene;

  const SNAP_POS = 0.05; // m
  const SNAP_SIZE = 0.01; // m
  const SNAP_ANGLE = Math.PI / 12; // 15°
  const DRAG_START_PX = 4;

  const HINTS = {
    select: 'Drag an object or a connector to move it; a selected connector has end handles. While the simulation runs, drag to pull. Drag empty space to pan.',
    spring: 'Spring: click the first end on an object or the background, then the second end. Right-click or Esc cancels.',
    rod: 'Rod: click the first end on an object or the background, then the second end. A rod keeps its length. Right-click or Esc cancels.',
    rope: 'Rope: click the first end on an object or the background, then the second end. A rope can go slack. Right-click or Esc cancels.',
    hinge: 'Hinge: click where two objects overlap to pin them together, or on one object to pin it to the background. Right-click or Esc cancels.',
    motor: 'Motor: click on a wheel where it overlaps another object (or on one object to drive it about a fixed axle). Right-click or Esc cancels.',
    weld: 'Glue: click where two objects overlap to join them rigidly, or on one object to fix it to the background. Right-click or Esc cancels.',
    pulley: 'Pulley: click where the wheel goes, then the first end of the rope, then the second end. Right-click or Esc cancels.'
  };

  // Connectors whose length follows their ends when the setup changes.
  const refits = (l) => l.kind === 'rod' || l.kind === 'rope' || l.kind === 'pulley';
  const JOIN_PX = 12; // a connector end this close to a free connector end joins it

  function createEditor(app, canvas) {
    const ed = { tool: 'select', armed: null, pending: null, cursorWorld: null };
    const pointers = new Map();
    let gesture = null;
    let pinch = null;
    let connectorDropPreview = null;
    let connectorDropActive = false;

    const rr = () => app.renderer;
    // Holding Ctrl or Command turns Snap off until it is released.
    let snapKeyHeld = false;
    const snapOn = () => app.snap && !snapKeyHeld;
    ed.snapSuspended = () => app.snap && snapKeyHeld;
    const snapV = (v, step) => (snapOn() ? Math.round(v / step) * step : v);

    function localPoint(e) {
      const rect = canvas.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }

    // ---------- Hit testing ----------

    function bodiesAt(w, padPx = 3) {
      const pad = padPx / app.scene.camera.scale;
      const out = [];
      for (let i = app.scene.bodies.length - 1; i >= 0; i--) {
        const b = app.scene.bodies[i];
        const pose = app.poseOf(b);
        if (S.containsPoint({ ...b, x: pose.x, y: pose.y, angle: pose.angle }, w, pad)) out.push(b);
      }
      return out;
    }

    function segDist(p, a, b) {
      const dx = b.x - a.x; const dy = b.y - a.y;
      const L2 = dx * dx + dy * dy;
      const t = L2 > 0 ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / L2)) : 0;
      return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
    }

    function linkAt(sp) {
      const scene = app.scene;
      let best = null;
      let bestD = Infinity;
      scene.links.forEach((l) => {
        const pa = rr().toScreen(S.endPoint(scene, l.a, l.la, app.poseOf));
        const pb = rr().toScreen(S.endPoint(scene, l.b, l.lb, app.poseOf));
        let d;
        if (l.kind === 'hinge' || l.kind === 'weld') d = Math.hypot(sp.x - pa.x, sp.y - pa.y) - 3;
        else if (l.kind === 'pulley') d = pulleyDistance(l, sp);
        else {
          // Near an end on an object, a click picks the object rather than the connector.
          const len = Math.hypot(pb.x - pa.x, pb.y - pa.y) || 1;
          const trim = Math.min(14, len * 0.3) / len;
          const ta = l.a ? trim : 0;
          const tb = l.b ? trim : 0;
          const qa = { x: pa.x + (pb.x - pa.x) * ta, y: pa.y + (pb.y - pa.y) * ta };
          const qb = { x: pb.x + (pa.x - pb.x) * tb, y: pb.y + (pa.y - pb.y) * tb };
          d = segDist(sp, qa, qb);
        }
        if (d < bestD) { bestD = d; best = l; }
      });
      return bestD <= 9 ? best : null;
    }

    // Screen distance from a pulley's wheel or either straight part of its rope (0 on the wheel).
    function pulleyDistance(l, sp) {
      const path = pulleyPathNow(l);
      const c = rr().toScreen(path.c);
      const R = Math.max(4, l.r * app.scene.camera.scale);
      const part = (p, t, onBody) => {
        const P = rr().toScreen(p); const T = rr().toScreen(t);
        // Near an end on an object, a click picks the object rather than the rope.
        const len = Math.hypot(T.x - P.x, T.y - P.y) || 1;
        const k = onBody ? Math.min(14, len * 0.3) / len : 0;
        return segDist(sp, { x: P.x + (T.x - P.x) * k, y: P.y + (T.y - P.y) * k }, T);
      };
      return Math.min(Math.max(0, Math.hypot(sp.x - c.x, sp.y - c.y) - R - 3), part(path.pa, path.ta, !!l.a), part(path.pb, path.tb, !!l.b));
    }
    function pulleyPathNow(l) {
      return app.sim && !app.simStale && app.sim.pulleyPath ? app.sim.pulleyPath(l.id) : S.pulleyPath(app.scene, l, app.poseOf);
    }

    function hitTest(sp) {
      const sel = app.selection;
      const del = ed.deleteButton();
      if (del && Math.hypot(sp.x - del.x, sp.y - del.y) <= 12) return { type: 'delete' };
      if (sel && sel.type === 'link' && app.canEditGeometry()) {
        const l = S.linkById(app.scene, sel.id);
        const ends = l && ed.linkHandles(l);
        if (ends) {
          for (const end of ['a', 'b']) if (Math.hypot(sp.x - ends[end].x, sp.y - ends[end].y) <= 11) return { type: 'linkEnd', link: l, end };
        }
      }
      if (sel && sel.type === 'body' && app.canEditGeometry() && !app.extra.length) {
        const b = S.bodyById(app.scene, sel.id);
        const hs = b && ed.handles(b);
        if (hs) {
          if (Math.hypot(sp.x - hs.rotate.x, sp.y - hs.rotate.y) <= 13) return { type: 'rotate', body: b };
          if (Math.hypot(sp.x - hs.resize.x, sp.y - hs.resize.y) <= 13) return { type: 'resize', body: b };
        }
      }
      const l = linkAt(sp);
      if (l) return { type: 'link', link: l };
      const w = rr().toWorld(sp.x, sp.y);
      const bs = bodiesAt(w);
      if (bs.length) return { type: 'body', body: bs[0] };
      return null;
    }

    // Screen positions of the selected object's rotate and resize handles.
    ed.handles = function handles(b) {
      const pose = app.poseOf(b);
      const center = rr().toScreen(pose);
      const box = screenBox(b);
      // Resize from the lower-right corner of the shape's own box (a ramp's real corner).
      let corner;
      if (b.kind === 'ball') corner = { x: b.r * Math.SQRT1_2, y: -b.r * Math.SQRT1_2 };
      else {
        const v = S.vertices(b);
        corner = { x: Math.max(...v.map((p) => p.x)), y: Math.min(...v.map((p) => p.y)) };
      }
      return {
        center,
        // Just above the object as drawn, however long or rotated it is.
        rotate: { x: center.x, y: box.minY - 24 },
        resize: rr().toScreen(S.toWorld(pose, corner)),
        corner
      };
    };

    // Screen box of an object as drawn now.
    function screenBox(b) {
      const pose = app.poseOf(b);
      if (b.kind === 'ball') {
        const c = rr().toScreen(pose);
        const R = b.r * app.scene.camera.scale;
        return { minX: c.x - R, minY: c.y - R, maxX: c.x + R, maxY: c.y + R };
      }
      const pts = S.vertices(b).map((v) => rr().toScreen(S.toWorld(pose, v)));
      return {
        minX: Math.min(...pts.map((p) => p.x)), maxX: Math.max(...pts.map((p) => p.x)),
        minY: Math.min(...pts.map((p) => p.y)), maxY: Math.max(...pts.map((p) => p.y))
      };
    }

    // The selection's screen box (objects) or a small box round a connector, for menus.
    ed.selectionBox = function selectionBox(sel) {
      if (!sel) return null;
      if (sel.type === 'body') { const b = S.bodyById(app.scene, sel.id); return b ? screenBox(b) : null; }
      const l = S.linkById(app.scene, sel.id);
      if (!l) return null;
      const pa = rr().toScreen(S.endPoint(app.scene, l.a, l.la, app.poseOf));
      const pb = l.kind === 'hinge' || l.kind === 'weld' ? pa : rr().toScreen(S.endPoint(app.scene, l.b, l.lb, app.poseOf));
      if (l.kind === 'pulley') {
        const c = rr().toScreen({ x: l.px, y: l.py });
        const R = Math.max(4, l.r * app.scene.camera.scale) + 12;
        return { minX: Math.min(pa.x - 12, pb.x - 12, c.x - R), maxX: Math.max(pa.x + 12, pb.x + 12, c.x + R), minY: Math.min(pa.y - 12, pb.y - 12, c.y - R), maxY: Math.max(pa.y + 12, pb.y + 12, c.y + R) };
      }
      return { minX: Math.min(pa.x, pb.x) - 12, maxX: Math.max(pa.x, pb.x) + 12, minY: Math.min(pa.y, pb.y) - 12, maxY: Math.max(pa.y, pb.y) + 12 };
    };

    // The small delete button: at the upper left of an object, beside the middle of a
    // spring, rod or rope (on its upper side), or up and left of a hinge or glue joint.
    ed.deleteButton = function deleteButton() {
      const sel = app.selection;
      if (!sel || (gesture && gesture.moved)) return null;
      let p = null;
      if (sel.type === 'body') {
        const b = S.bodyById(app.scene, sel.id);
        if (!b) return null;
        p = bodyDeleteSpot(b);
      } else {
        const l = S.linkById(app.scene, sel.id);
        if (!l) return null;
        const pa = rr().toScreen(S.endPoint(app.scene, l.a, l.la, app.poseOf));
        if (l.kind === 'hinge' || l.kind === 'weld') p = { x: pa.x - 17, y: pa.y - 17 };
        else if (l.kind === 'pulley') {
          // Up and left of the wheel.
          const c = rr().toScreen({ x: l.px, y: l.py });
          const R = Math.max(4, l.r * app.scene.camera.scale) + 15;
          p = { x: c.x - R * Math.SQRT1_2, y: c.y - R * Math.SQRT1_2 };
        } else {
          const pb = rr().toScreen(S.endPoint(app.scene, l.b, l.lb, app.poseOf));
          const len = Math.hypot(pb.x - pa.x, pb.y - pa.y) || 1;
          let nx = -(pb.y - pa.y) / len;
          let ny = (pb.x - pa.x) / len;
          if (ny > 0 || (ny === 0 && nx > 0)) { nx = -nx; ny = -ny; }
          p = { x: (pa.x + pb.x) / 2 + nx * 22, y: (pa.y + pb.y) / 2 + ny * 22 };
        }
      }
      const r = rr();
      return { x: S.clamp(p.x, 14, r.w - 14), y: S.clamp(p.y, 14, r.h - 14) };
    };

    // Directions to try for an object's delete button, upper left first.
    const DELETE_DIRS = [[-1, -1], [-1, 0], [0, -1], [1, -1], [-1, 1], [1, 0], [0, 1], [1, 1]]
      .map(([x, y]) => { const n = Math.hypot(x, y); return { x: x / n, y: y / n }; });

    // Beside the outline point that reaches furthest up and left, so a long or rotated
    // object keeps its cross next to it rather than at an empty corner of its box. If that
    // spot crowds the rotate or resize handle or a joint on the object, try other sides.
    function bodyDeleteSpot(b) {
      const pose = app.poseOf(b);
      const scale = app.scene.camera.scale;
      const center = rr().toScreen(pose);
      // Outline corners and the middles of its sides, on screen.
      let pts = null;
      if (b.kind !== 'ball') {
        const rings = b.kind === 'custom' ? b.paths.map((poly) => poly[0].map(([x, y]) => ({ x, y }))) : [S.vertices(b)];
        pts = rings.flatMap((ring) => ring.flatMap((v, i) => {
          const n = ring[(i + 1) % ring.length];
          return [v, { x: (v.x + n.x) / 2, y: (v.y + n.y) / 2 }];
        })).map((v) => rr().toScreen(S.toWorld(pose, v)));
      }
      const avoid = [];
      if (app.canEditGeometry() && !app.extra.length) {
        const hs = ed.handles(b);
        avoid.push({ p: hs.rotate, d: 28 }, { p: hs.resize, d: 26 });
      }
      app.scene.links.forEach((l) => {
        if (l.a === b.id) avoid.push({ p: rr().toScreen(S.endPoint(app.scene, l.a, l.la, app.poseOf)), d: 24 });
        if (l.b === b.id) avoid.push({ p: rr().toScreen(S.endPoint(app.scene, l.b, l.lb, app.poseOf)), d: 24 });
      });
      let first = null;
      for (const dir of DELETE_DIRS) {
        // The outline's furthest point in this direction, then 18 px further out: the
        // whole object lies behind that point, so the button never covers it. A side
        // square to the direction offers each of its points, upper left first.
        let edges;
        if (!pts) edges = [{ x: center.x + dir.x * b.r * scale, y: center.y + dir.y * b.r * scale }];
        else {
          const reach = (q) => q.x * dir.x + q.y * dir.y;
          const most = Math.max(...pts.map(reach));
          edges = pts.filter((q) => reach(q) >= most - 1).sort((p, q) => p.x + p.y - (q.x + q.y));
        }
        for (const edge of edges) {
          const spot = { x: edge.x + dir.x * 18, y: edge.y + dir.y * 18 };
          if (!first) first = spot;
          if (avoid.every((a) => Math.hypot(spot.x - a.p.x, spot.y - a.p.y) >= a.d)) return spot;
        }
      }
      return first;
    }

    // End handles of a selected spring, rod or rope.
    ed.linkHandles = function linkHandles(l) {
      if (l.kind === 'hinge' || l.kind === 'weld') return null;
      return {
        a: rr().toScreen(S.endPoint(app.scene, l.a, l.la, app.poseOf)),
        b: rr().toScreen(S.endPoint(app.scene, l.b, l.lb, app.poseOf))
      };
    };

    // ---------- Tools ----------

    // Choosing a part or a connector tool puts the start card away.
    function dismissStart() {
      if (!app.emptyDismissed) { app.emptyDismissed = true; app.ui.syncToolbar(); }
    }

    ed.setTool = function setTool(tool) {
      if (tool !== 'select') dismissStart();
      ed.tool = tool;
      ed.pending = null;
      if (tool !== 'select') ed.armed = null;
      app.ui.syncTools();
      app.setHint(HINTS[tool] || HINTS.select);
      canvas.dataset.tool = tool;
      app.requestDraw();
    };

    ed.arm = function arm(type) {
      if (type) dismissStart();
      ed.tool = 'select';
      ed.pending = null;
      ed.armed = type;
      app.ui.syncTools();
      canvas.dataset.tool = type ? 'place' : 'select';
      app.setHint(type ? `Click the canvas to place the ${S.BODY_KINDS[type].label.toLowerCase()}. Hold Shift to place several. Right-click or Esc cancels.` : HINTS.select);
      app.requestDraw();
    };

    ed.cancel = function cancel() {
      if (ed.armed || ed.tool !== 'select' || ed.pending) {
        ed.armed = null;
        ed.setTool('select');
        return true;
      }
      return false;
    };

    ed.preview = function preview() {
      if (connectorDropActive) return connectorDropPreview;
      const w = ed.cursorWorld;
      if (!w) return null;
      if (gesture && gesture.kind === 'jointMove' && gesture.moved) {
        const bs = jointBodies(w);
        return { point: bs.length ? jointPoint(w, bs[0]) : w, ok: bs.length > 0 };
      }
      if (ed.armed) {
        const b = S.makeBody({ ...app.scene, bodies: app.scene.bodies.slice(), links: [], nextId: 0 }, ed.armed, w.x, w.y);
        const previewScene = { ...app.scene, bodies: [...app.scene.bodies, b], links: [] };
        positionBody(b, previewScene);
        return { body: b };
      }
      if (['spring', 'rod', 'rope'].includes(ed.tool)) {
        const target = endTarget(w, ed.tool);
        if (ed.pending) return { link: { kind: ed.tool, from: ed.pending.world, to: target.world }, point: target.world, ok: true };
        return { point: target.world, ok: true };
      }
      if (['hinge', 'motor', 'weld'].includes(ed.tool)) {
        const bs = jointBodies(w);
        return { point: bs.length ? jointPoint(w, bs[0]) : w, ok: bs.length > 0 };
      }
      if (ed.tool === 'pulley') {
        const p = ed.pending;
        if (!p) { const c = wheelPoint(w); return { pulley: { c, radius: PULLEY_R } }; }
        const target = endTarget(w, 'pulley');
        return { pulley: { c: p.c, radius: PULLEY_R, from: p.world || null, to: target.world }, point: target.world, ok: true };
      }
      return null;
    };

    // A free background end of another connector that a connector of this kind could join
    // (a spring with a spring, an ideal rope or rod, or a pulley's rope), near the pointer.
    // rejoinId: the partner a dragged joined end came from, which it may drop back onto.
    function joinTarget(w, kind, selfId, rejoinId) {
      if (!S.JOIN_KINDS.includes(kind)) return null;
      const sp = rr().toScreen(w);
      let best = null, bestD = JOIN_PX;
      app.scene.links.forEach((t) => {
        if (t.id === selfId || t.solid || !S.JOIN_KINDS.includes(t.kind) || (kind !== 'spring' && t.kind !== 'spring')) return;
        const back = !!rejoinId && t.id === rejoinId;
        if (!back && S.joinedEnd(app.scene, t)) return;
        ['a', 'b'].forEach((end) => {
          if (back ? t[end] !== selfId : t[end]) return;
          const p = t['l' + end];
          const q = rr().toScreen(p);
          const d = Math.hypot(q.x - sp.x, q.y - sp.y);
          if (d < bestD) { bestD = d; best = { link: t, end, world: { x: p.x, y: p.y }, back }; }
        });
      });
      return best;
    }

    // The connector an end is joined to, or null.
    const joinedId = (l, end) => (l[end] && !S.bodyById(app.scene, l[end]) && S.linkById(app.scene, l[end]) ? l[end] : null);

    // A rod, rope or pulley refits to its ends; one joined to a spring refits with its pair.
    function refitAll(l) {
      S.refitLink(app.scene, l);
      const pair = S.joinPair(app.scene, l);
      if (pair && pair.other !== l) S.refitLink(app.scene, pair.other);
    }
    // Why a connector's pair would not work after an end moved, or ''.
    function pairProblem(l) {
      const pair = S.joinPair(app.scene, l);
      if (!pair) return '';
      const so = pair.spring[pair.se === 'a' ? 'b' : 'a'], oo = pair.other[pair.oe === 'a' ? 'b' : 'a'];
      if (!so && !oo) return 'Attach at least one end of the pair to an object.';
      if (so && so === oo) return 'The pair would join an object to itself.';
      return '';
    }

    // Where a connector end lands: a free end of another connector it can join (when kind
    // is given), an object's center when the pointer is near it, else the pointer on that
    // object, else a point on the background.
    function endTarget(w, kind, selfId, rejoinId) {
      const join = kind ? joinTarget(w, kind, selfId, rejoinId) : null;
      if (join) return { body: null, join, world: join.world, local: join.world };
      const bs = bodiesAt(w);
      if (snapOn() && !bs.length) {
        let nearest = null, distance = 10 / app.scene.camera.scale;
        for (const b of app.scene.bodies) {
          const p = S.closestSurface({ ...b, ...app.poseOf(b) }, w);
          const d = Math.hypot(p.x - w.x, p.y - w.y);
          if (d < distance) { nearest = { body: b, world: p, local: S.toLocal(app.poseOf(b), p) }; distance = d; }
        }
        if (nearest) return nearest;
      }
      if (bs.length) {
        const b = bs[0];
        const p = jointPoint(w, b);
        return { body: b, world: p, local: S.toLocal(app.poseOf(b), p) };
      }
      const p = { x: snapV(w.x, SNAP_POS), y: snapV(w.y, SNAP_POS) };
      return { body: null, world: p, local: p };
    }

    function jointBodies(w) {
      const bs = bodiesAt(w);
      if (!bs.length && snapOn()) {
        const t = endTarget(w);
        if (t.body) bs.push(t.body);
      }
      return bs;
    }

    function jointPoint(w, b) {
      const pose = app.poseOf(b);
      const e = S.extent(b);
      const near = Math.max(Math.min(e.x, e.y) * 0.35, 10 / app.scene.camera.scale);
      const distance = Math.hypot(w.x - pose.x, w.y - pose.y);
      if (snapOn()) {
        const p = S.closestSurface({ ...b, ...pose }, w);
        const edgeDistance = Math.hypot(p.x - w.x, p.y - w.y);
        if (edgeDistance < distance && edgeDistance <= 10 / app.scene.camera.scale) return p;
      }
      if (distance <= near) return { x: pose.x, y: pose.y };
      return w;
    }

    // A new connector with one end on another connector's free end: which of its ends joins
    // what, and why it cannot (or '').
    function newJoin(kind, p, t, b) {
      if (p.join && t.join) return { problem: 'Join only one end of a connector to another connector.' };
      const tj = p.join || t.join;
      if (!tj) return null;
      const end = p.join ? 'a' : 'b';
      const probe = { id: '', kind, solid: false, a: null, b: null };
      return { tj, end, problem: S.joinProblem(app.scene, probe, end, tj.link, tj.end, p.join ? b : p.a) };
    }
    function attachJoin(l, j) {
      if (!j) return false;
      S.joinLinks(app.scene, l, j.end, S.linkById(app.scene, j.tj.link.id), j.tj.end);
      S.fitJoin(app.scene, l);
      return true;
    }

    function placeLinkEnd(w, keep) {
      const kind = ed.tool;
      const t = endTarget(w, kind);
      if (!ed.pending) {
        ed.pending = { a: t.body ? t.body.id : null, la: t.local, world: t.world, join: t.join || null };
        app.setHint(t.join ? `Joined to ${t.join.link.name}. Now click the second end. Right-click or Esc cancels.` : 'Now click the second end. Right-click or Esc cancels.');
        return;
      }
      const p = ed.pending;
      const b = t.body ? t.body.id : null;
      const j = newJoin(kind, p, t, b);
      if (j && j.problem) { app.toast(j.problem); return; }
      if (!j && !p.a && !b) { app.toast('Attach at least one end to an object.'); return; }
      if (p.a && p.a === b) { app.toast('Connect two different objects, or an object and the background.'); return; }
      app.edit(() => {
        const l = S.makeLink(app.scene, kind, p.a, p.la, b, t.local);
        app.scene.links.push(l);
        if (!attachJoin(l, j)) {
          if (kind === 'spring') l.rest = Math.max(0.05, Math.round(S.linkLength(app.scene, l) * 100) / 100);
          else l.length = Math.max(S.LIMITS.length[0], S.linkLength(app.scene, l));
        }
        app.select({ type: 'link', id: l.id });
      });
      ed.pending = null;
      if (!keep) ed.setTool('select');
      else app.setHint(HINTS[kind]);
    }

    // ---------- Pulleys ----------

    const PULLEY_R = S.PULLEY_RADIUS;
    const wheelPoint = (w) => ({ x: snapV(w.x, SNAP_POS), y: snapV(w.y, SNAP_POS) });
    const outsideWheel = (p, c, radius) => Math.hypot(p.x - c.x, p.y - c.y) >= radius + S.PULLEY_CLEARANCE;

    // Three clicks: the wheel, the first end of the rope, then the second end.
    function placePulleyPoint(w, keep) {
      const p = ed.pending;
      if (!p) {
        const c = wheelPoint(w);
        const probe = { kind: 'pulley', a: null, la: { x: c.x + 1, y: c.y - 1 }, b: null, lb: { x: c.x - 1, y: c.y - 1 }, px: c.x, py: c.y, r: PULLEY_R };
        const problem = S.pulleyProblem(app.scene, probe, app.poseOf);
        if (problem) { app.toast(problem); return; }
        ed.pending = { c };
        app.setHint('Now click the first end of the rope, on an object or the background. Right-click or Esc cancels.');
        return;
      }
      const t = endTarget(w, 'pulley');
      if (!outsideWheel(t.world, p.c, PULLEY_R)) { app.toast('Put the end of the rope outside the wheel.'); return; }
      if (!p.world) {
        Object.assign(p, { a: t.body ? t.body.id : null, la: t.local, world: t.world, join: t.join || null });
        app.setHint(t.join ? `Joined to ${t.join.link.name}. Now click the second end of the rope. Right-click or Esc cancels.` : 'Now click the second end of the rope. Right-click or Esc cancels.');
        return;
      }
      const b = t.body ? t.body.id : null;
      const j = newJoin('pulley', p, t, b);
      if (j && j.problem) { app.toast(j.problem); return; }
      if (!j && !p.a && !b) { app.toast('Attach at least one end to an object.'); return; }
      if (p.a && p.a === b) { app.toast('Connect two different objects, or an object and the background.'); return; }
      app.edit(() => {
        const l = S.makeLink(app.scene, 'pulley', p.a, p.la, b, t.local);
        Object.assign(l, { px: p.c.x, py: p.c.y, r: PULLEY_R });
        app.scene.links.push(l);
        if (!attachJoin(l, j)) l.length = Math.max(S.LIMITS.length[0], S.linkLength(app.scene, l));
        app.select({ type: 'link', id: l.id });
      });
      ed.pending = null;
      if (!keep) ed.setTool('select');
      else app.setHint(HINTS.pulley);
    }

    function placeJoint(w, keep) {
      const bs = jointBodies(w);
      if (!bs.length) { app.toast('Click on an object.'); return; }
      const top = bs[0];
      const base = bs[1] || null;
      if (top.fixed && (!base || base.fixed)) { app.toast('A fixed object is already fixed in place. Use a hinge to pin a movable object.'); return; }
      const p = jointPoint(w, top);
      const kind = ed.tool;
      app.edit(() => {
        const la = S.toLocal(app.poseOf(top), p);
        const lb = base ? S.toLocal(app.poseOf(base), p) : { x: p.x, y: p.y };
        const l = S.makeLink(app.scene, kind, top.id, la, base ? base.id : null, lb);
        app.scene.links.push(l);
        app.select({ type: 'link', id: l.id });
      });
      if (!keep) ed.setTool('select');
    }

    function snapBodies(ids, scene = app.scene) {
      if (!snapOn()) return false;
      // Surface contact first, then an object's center onto another object's edge.
      const tolerance = 10 / app.scene.camera.scale;
      const d = S.contactSnap(scene, ids, tolerance) || S.centerSnap(scene, ids, tolerance);
      if (d) S.transformBodies(scene, ids, (p, angle) => ({ x: p.x + d.x, y: p.y + d.y, angle }));
      return !!d;
    }

    function positionBody(b, scene) {
      function liftFromFloor() {
        if (!scene.world.floor) return;
        const bottom = b.kind === 'ball' ? b.y - b.r : Math.min(...S.vertices(b).map((p) => S.toWorld(b, p).y));
        b.y += Math.max(0, -bottom);
      }
      // Objects rest exactly on the floor as drawn (physics.js insets their collision shapes).
      liftFromFloor();
      if (!snapBodies(new Set([b.id]), scene)) { b.x = snapV(b.x, SNAP_POS); b.y = snapV(b.y, SNAP_POS); }
      liftFromFloor();
    }

    ed.placeBody = function placeBody(type, w) {
      app.edit(() => {
        const b = S.makeBody(app.scene, type, w.x, w.y);
        app.scene.bodies.push(b);
        positionBody(b, app.scene);
        app.select({ type: 'body', id: b.id });
      });
    };

    ed.dropBody = function dropBody(type, clientX, clientY) {
      const rect = canvas.getBoundingClientRect();
      if (clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom) return false;
      ed.arm(null);
      ed.placeBody(type, rr().toWorld(clientX - rect.left, clientY - rect.top));
      return true;
    };

    // Preview the actual first endpoint, using the same snapping as placement.
    ed.previewConnectorDrop = function previewConnectorDrop(type, clientX, clientY) {
      connectorDropActive = true;
      const rect = canvas.getBoundingClientRect();
      connectorDropPreview = null;
      if (clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom) {
        const w = rr().toWorld(clientX - rect.left, clientY - rect.top);
        if (['spring', 'rod', 'rope'].includes(type)) connectorDropPreview = { point: endTarget(w, type).world, ok: true };
        else if (type === 'pulley') connectorDropPreview = { pulley: { c: wheelPoint(w), radius: PULLEY_R } };
        else {
          const bs = bodiesAt(w);
          connectorDropPreview = { point: bs.length ? jointPoint(w, bs[0]) : w, ok: bs.length > 0 };
        }
      }
      app.requestDraw();
    };

    ed.clearConnectorDropPreview = function clearConnectorDropPreview() {
      connectorDropActive = false;
      connectorDropPreview = null;
      app.requestDraw();
    };

    ed.dropConnector = function dropConnector(type, clientX, clientY) {
      ed.clearConnectorDropPreview();
      const rect = canvas.getBoundingClientRect();
      if (clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom) return false;
      ed.setTool(type);
      const w = rr().toWorld(clientX - rect.left, clientY - rect.top);
      ed.cursorWorld = w;
      if (['spring', 'rod', 'rope'].includes(type)) placeLinkEnd(w, false);
      else if (type === 'pulley') placePulleyPoint(w, false);
      else placeJoint(w, false);
      app.requestDraw();
      return true;
    };

    // ---------- Gestures ----------

    function startGesture(kind, e, sp, extra = {}) {
      gesture = { kind, start: sp, last: sp, startWorld: rr().toWorld(sp.x, sp.y), moved: false, id: e.pointerId, ...extra };
    }

    function beginSceneDrag() {
      // Editing after time has run makes the current state the new start (t = 0).
      app.beginGesture();
      gesture.orig = JSON.parse(JSON.stringify({ bodies: app.scene.bodies, links: app.scene.links }));
      if (!gesture.bodyId) return;
      const b = S.bodyById(app.scene, gesture.bodyId);
      gesture.b0 = b ? { x: b.x, y: b.y, angle: b.angle, w: b.w, h: b.h, r: b.r } : null;
      gesture.group = S.rigidGroup(app.scene, gesture.bodyId);
      // Several objects selected: they all move together.
      if (app.extra.length && app.isSelected('body', gesture.bodyId)) {
        app.selectedBodies().forEach((id) => S.rigidGroup(app.scene, id).forEach((g) => gesture.group.add(g)));
      }
    }

    // ---------- Dragging connectors ----------

    // While an end is dragged it follows the pointer; it attaches when released.
    function applyLinkEnd(w) {
      restoreOrig();
      const l = S.linkById(app.scene, gesture.linkId);
      if (!l) return;
      const was = joinedId(l, gesture.end);
      l[gesture.end] = null;
      l['l' + gesture.end] = endTarget(w, l.kind, l.id, was).world;
      refitAll(l);
    }

    function finishLinkEnd(w) {
      restoreOrig();
      const l = S.linkById(app.scene, gesture.linkId);
      const end = gesture.end;
      const was = joinedId(l, end);
      const t = endTarget(w, l.kind, l.id, was);
      // Dragging a joined end away separates the pair; its partner keeps a background end there.
      if (was) {
        const partner = S.linkById(app.scene, was);
        if (t.join && t.join.back) return null; // dropped back where it was
        S.unjoin(app.scene, l, end, app.poseOf);
        if (partner && !partner.a && !partner.b) return `${partner.name} would have no end on an object.`;
      }
      if (t.join) {
        const target = S.linkById(app.scene, t.join.link.id);
        const problem = S.joinProblem(app.scene, l, end, target, t.join.end);
        if (problem) return problem;
        S.joinLinks(app.scene, l, end, target, t.join.end);
        S.fitJoin(app.scene, l);
        refitAll(l);
        return l.kind === 'pulley' ? S.pulleyProblem(app.scene, l, app.poseOf) || null : null;
      }
      const other = end === 'a' ? l.b : l.a;
      const id = t.body ? t.body.id : null;
      if (!id && !other) return 'Attach at least one end to an object.';
      if (id && id === other) return 'Connect two different objects, or an object and the background.';
      l[end] = id;
      l['l' + end] = t.local;
      const problem = pairProblem(l);
      if (problem) return problem;
      refitAll(l);
      return l.kind === 'pulley' ? S.pulleyProblem(app.scene, l, app.poseOf) || null : null;
    }

    // Dragging a pulley by its wheel or rope moves the wheel; the rope's ends stay attached
    // and the rope refits to the new path.
    function applyPulleyMove(w) {
      restoreOrig();
      const l = S.linkById(app.scene, gesture.linkId);
      if (!l) return;
      l.px = snapV(l.px + w.x - gesture.startWorld.x, SNAP_POS);
      l.py = snapV(l.py + w.y - gesture.startWorld.y, SNAP_POS);
      refitAll(l);
    }
    function finishPulleyMove(w) {
      applyPulleyMove(w);
      return S.pulleyProblem(app.scene, S.linkById(app.scene, gesture.linkId), app.poseOf) || null;
    }

    // Dragging a spring, rod or rope by its line picks the whole connector up: both ends
    // follow the pointer, and on release each attaches to whatever is under it.
    function movedEnds(w) {
      const l = S.linkById(app.scene, gesture.linkId);
      const dx = snapV(w.x - gesture.startWorld.x, SNAP_POS);
      const dy = snapV(w.y - gesture.startWorld.y, SNAP_POS);
      const pa = S.endPoint(app.scene, l.a, l.la, app.poseOf);
      const pb = S.endPoint(app.scene, l.b, l.lb, app.poseOf);
      return { l, a: { x: pa.x + dx, y: pa.y + dy }, b: { x: pb.x + dx, y: pb.y + dy } };
    }

    function applyLinkMove(w) {
      restoreOrig();
      if (!S.linkById(app.scene, gesture.linkId)) return;
      const { l, a, b } = movedEnds(w);
      l.a = null; l.la = endTarget(a).world;
      l.b = null; l.lb = endTarget(b).world;
    }

    function finishLinkMove(w) {
      restoreOrig();
      const { l, a, b } = movedEnds(w);
      const ta = endTarget(a);
      const tb = endTarget(b);
      if (!ta.body && !tb.body) return 'Drop at least one end of the connector on an object.';
      if (ta.body && tb.body && ta.body.id === tb.body.id) return 'The two ends would land on the same object.';
      l.a = ta.body ? ta.body.id : null; l.la = ta.local;
      l.b = tb.body ? tb.body.id : null; l.lb = tb.local;
      if (refits(l)) l.length = Math.max(S.LIMITS.length[0], S.linkLength(app.scene, l));
      return null;
    }

    // A hinge, motor or glue joint dropped somewhere joins whatever is under it there.
    function finishJointMove(w) {
      restoreOrig();
      const l = S.linkById(app.scene, gesture.linkId);
      const bs = jointBodies(w);
      if (!bs.length) return 'Drop the joint on an object.';
      const top = bs[0];
      const base = bs[1] || null;
      if (top.fixed && (!base || base.fixed)) return 'A joint needs at least one movable object.';
      const p = jointPoint(w, top);
      l.a = top.id;
      l.la = S.toLocal(app.poseOf(top), p);
      l.b = base ? base.id : null;
      l.lb = base ? S.toLocal(app.poseOf(base), p) : { x: p.x, y: p.y };
      return null;
    }

    function restoreOrig() {
      const o = JSON.parse(JSON.stringify(gesture.orig));
      app.scene.bodies = o.bodies;
      app.scene.links = o.links;
    }

    function applyMove(w) {
      restoreOrig();
      const b0 = gesture.b0;
      const dx = w.x - gesture.startWorld.x;
      const dy = w.y - gesture.startWorld.y;
      S.transformBodies(app.scene, gesture.group, (p, angle) => ({ x: p.x + dx, y: p.y + dy, angle }));
      if (!snapBodies(gesture.group)) {
        const gx = snapV(b0.x + dx, SNAP_POS) - b0.x - dx;
        const gy = snapV(b0.y + dy, SNAP_POS) - b0.y - dy;
        S.transformBodies(app.scene, gesture.group, (p, angle) => ({ x: p.x + gx, y: p.y + gy, angle }));
      }
    }

    function applyRotate(w) {
      restoreOrig();
      const c = gesture.b0;
      const a0 = Math.atan2(gesture.startWorld.y - c.y, gesture.startWorld.x - c.x);
      const a1 = Math.atan2(w.y - c.y, w.x - c.x);
      let target = c.angle + (a1 - a0);
      if (snapOn()) target = Math.round(target / SNAP_ANGLE) * SNAP_ANGLE;
      const d = target - c.angle;
      const cos = Math.cos(d); const sin = Math.sin(d);
      S.transformBodies(app.scene, gesture.group, (p, angle) => ({
        x: c.x + cos * (p.x - c.x) - sin * (p.y - c.y),
        y: c.y + sin * (p.x - c.x) + cos * (p.y - c.y),
        angle: angle + d
      }));
    }

    function applyResize(w) {
      restoreOrig();
      const b = S.bodyById(app.scene, gesture.bodyId);
      const b0 = gesture.b0;
      const q = S.toLocal(b0, w);
      const corner = gesture.corner;
      const L = S.LIMITS;
      if (b.kind === 'custom') {
        // A custom shape scales evenly about its centroid.
        const k = S.clamp(Math.hypot(q.x, q.y) / Math.hypot(corner.x, corner.y), 0.05, 20);
        b.paths = PPM.shapes.scalePaths(b.paths, k);
      } else if (b.kind === 'ball' || b.kind === 'polygon') {
        const k = Math.hypot(q.x, q.y) / Math.hypot(corner.x, corner.y);
        b.r = S.clamp(snapV(b0.r * k, SNAP_SIZE), L.r[0], L.r[1]);
      } else {
        const kx = Math.abs(q.x) / Math.abs(corner.x);
        const ky = Math.abs(q.y) / Math.abs(corner.y);
        b.w = S.clamp(snapV(b0.w * kx, SNAP_SIZE), L.w[0], L.w[1]);
        b.h = S.clamp(snapV(b0.h * ky, SNAP_SIZE), L.h[0], L.h[1]);
      }
      S.refitLengths(app.scene, new Set([b.id]));
    }

    function zoomAt(sx, sy, factor) {
      const camr = app.scene.camera;
      const before = rr().toWorld(sx, sy);
      camr.scale = S.clamp(camr.scale * factor, 0.01, 1500);
      const after = rr().toWorld(sx, sy);
      camr.cx += before.x - after.x;
      camr.cy += before.y - after.y;
      app.cameraChanged();
    }
    ed.zoomAt = zoomAt;

    function onPointerDown(e) {
      if (e.button === 1 || e.button === 2) e.preventDefault();
      // A new primary press means Safari lost the previous release/capture.
      if (e.isPrimary && pointers.size) {
        onPointerCancel({ pointerId: gesture ? gesture.id : e.pointerId });
        pointers.clear();
        pinch = null;
      }
      canvas.focus({ preventScroll: true });
      const sp = localPoint(e);
      pointers.set(e.pointerId, sp);
      try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* pointer already gone */ }
      if (pointers.size === 2) {
        // Two fingers: pinch to zoom and pan. Undo any one-finger drag that had started.
        clearHold();
        if (gesture && gesture.moved && gesture.orig) { restoreOrig(); app.cancelGesture(); }
        if (gesture && gesture.kind === 'grab') app.sim.release();
        gesture = null;
        const [a, b] = [...pointers.values()];
        pinch = { d: Math.hypot(b.x - a.x, b.y - a.y), mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } };
        return;
      }
      if (pointers.size > 2) return;
      const w = rr().toWorld(sp.x, sp.y);
      ed.cursorWorld = w;
      app.ui.closeQuick();
      // Right-click cancels a connector or part being placed, as in PanPhyCircuits' wiring.
      if (e.button === 2 && (ed.armed || ed.tool !== 'select') && ed.tool !== 'pan') {
        suppressMenu = true;
        ed.cancel();
        return;
      }
      if (e.button === 2 && ed.tool === 'select' && !ed.armed) {
        // Right-clicking an object opens its settings (on contextmenu); elsewhere it pans.
        const h = hitTest(sp);
        if (h && (h.type === 'body' || h.type === 'link')) return;
      }
      if (e.button === 1 || e.button === 2 || ed.tool === 'pan') { startGesture('pan', e, sp); return; }
      if (ed.armed) {
        // Disarm first, so one click places one object even if placing fails.
        const type = ed.armed;
        if (!e.shiftKey) ed.arm(null);
        ed.placeBody(type, w);
        return;
      }
      if (['spring', 'rod', 'rope'].includes(ed.tool)) { placeLinkEnd(w, e.shiftKey); app.requestDraw(); return; }
      if (['hinge', 'motor', 'weld'].includes(ed.tool)) { placeJoint(w, e.shiftKey); app.requestDraw(); return; }
      if (ed.tool === 'pulley') { placePulleyPoint(w, e.shiftKey); app.requestDraw(); return; }
      const hit = hitTest(sp);
      if (!hit) { startGesture('pan', e, sp, { deselect: true }); return; }
      if (hit.type === 'delete') { app.deleteSelection(); return; }
      if (hit.type === 'linkEnd') {
        startGesture('linkEnd', e, sp, { linkId: hit.link.id, end: hit.end });
        armHold(e, { type: 'link', id: hit.link.id });
        return;
      }
      if (hit.type === 'rotate' || hit.type === 'resize') {
        startGesture(hit.type, e, sp, { bodyId: hit.body.id, corner: ed.handles(hit.body).corner });
        return;
      }
      if (hit.type === 'link') {
        app.select({ type: 'link', id: hit.link.id });
        const joint = hit.link.kind === 'hinge' || hit.link.kind === 'weld';
        if (app.running) startGesture('none', e, sp);
        // A joined connector moves by its end handles; dragging its line would pull it apart.
        else if (hit.link.kind !== 'pulley' && !joint && S.joinPair(app.scene, hit.link)) startGesture('none', e, sp);
        else startGesture(joint ? 'jointMove' : hit.link.kind === 'pulley' ? 'pulleyMove' : 'linkMove', e, sp, { linkId: hit.link.id });
        armHold(e, { type: 'link', id: hit.link.id });
        return;
      }
      // Shift-click (or the Select several tool) adds or removes objects from the selection.
      if (e.shiftKey || app.multiMode) {
        app.toggleInSelection(hit.body.id);
        startGesture('none', e, sp);
        return;
      }
      // Pressing one of several selected objects keeps them all selected, to drag together.
      if (!(app.extra.length && app.isSelected('body', hit.body.id))) app.select({ type: 'body', id: hit.body.id });
      if (app.running) {
        if (!hit.body.fixed && app.sim.grab(hit.body.id, w)) startGesture('grab', e, sp);
        else startGesture('none', e, sp);
      } else {
        startGesture('move', e, sp, { bodyId: hit.body.id });
      }
      armHold(e, { type: 'body', id: hit.body.id });
    }

    // Touch and hold an object or connector for its quick settings, as right-click does.
    let holdTimer = 0;
    function clearHold() { clearTimeout(holdTimer); holdTimer = 0; }
    function armHold(e, sel) {
      clearHold();
      if (e.pointerType !== 'touch' && e.pointerType !== 'pen') return;
      const id = e.pointerId;
      const x = e.clientX;
      const y = e.clientY;
      const scene = app.scene;
      holdTimer = setTimeout(() => {
        holdTimer = 0;
        if (!gesture || gesture.id !== id || gesture.moved || app.scene !== scene || pointers.size !== 1 || ed.tool !== 'select' || ed.armed) return;
        openHeldSettings(sel, x, y);
      }, 500);
    }

    function openHeldSettings(sel, x, y) {
      clearHold();
      if (gesture && gesture.kind === 'grab') app.sim.release();
      gesture = null;
      app.ui.showQuick(sel, x, y);
    }

    let suppressMenu = false;
    canvas.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      // The right-click that just cancelled placing opens no menu.
      if (suppressMenu) { suppressMenu = false; return; }
      if (ed.tool !== 'select' || ed.armed) return;
      const h = hitTest(localPoint(e));
      if (!h || !['body', 'link', 'linkEnd'].includes(h.type)) return;
      const sel = h.type === 'body' ? { type: 'body', id: h.body.id } : { type: 'link', id: h.link.id };
      app.select(sel);
      // Native touch contextmenu can arrive before the hold timer on Safari.
      openHeldSettings(sel, e.clientX, e.clientY);
    });

    function onPointerMove(e) {
      const sp = localPoint(e);
      if (pointers.has(e.pointerId)) pointers.set(e.pointerId, sp);
      const w = rr().toWorld(sp.x, sp.y);
      ed.cursorWorld = w;
      if (pinch && pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        const d = Math.hypot(b.x - a.x, b.y - a.y);
        const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
        const camr = app.scene.camera;
        camr.cx -= (mid.x - pinch.mid.x) / camr.scale;
        camr.cy += (mid.y - pinch.mid.y) / camr.scale;
        if (pinch.d > 0) zoomAt(mid.x, mid.y, d / pinch.d);
        pinch = { d, mid };
        app.cameraChanged();
        return;
      }
      if (!gesture) {
        if (e.pointerType === 'mouse') updateHover(sp);
        if (ed.armed || ed.tool !== 'select') app.requestDraw();
        return;
      }
      if (gesture.id !== e.pointerId) return;
      if (!gesture.moved && Math.hypot(sp.x - gesture.start.x, sp.y - gesture.start.y) < DRAG_START_PX) return;
      const firstMove = !gesture.moved;
      gesture.moved = true;
      clearHold();
      switch (gesture.kind) {
        case 'pan': {
          const camr = app.scene.camera;
          camr.cx -= (sp.x - gesture.last.x) / camr.scale;
          camr.cy += (sp.y - gesture.last.y) / camr.scale;
          app.cameraChanged();
          break;
        }
        case 'grab':
          app.sim.moveGrab(w);
          break;
        case 'move':
        case 'rotate':
        case 'resize':
          if (firstMove) beginSceneDrag();
          if (gesture.kind === 'move') applyMove(w);
          else if (gesture.kind === 'rotate') applyRotate(w);
          else applyResize(w);
          app.gestureChanged();
          break;
        case 'linkEnd':
        case 'linkMove':
        case 'pulleyMove':
          if (firstMove) beginSceneDrag();
          if (gesture.kind === 'linkEnd') applyLinkEnd(w); else if (gesture.kind === 'pulleyMove') applyPulleyMove(w); else applyLinkMove(w);
          app.gestureChanged();
          break;
        case 'jointMove':
          if (firstMove) beginSceneDrag();
          app.requestDraw();
          break;
        default:
          break;
      }
      gesture.last = sp;
    }

    function onPointerUp(e) {
      pointers.delete(e.pointerId);
      try { canvas.releasePointerCapture(e.pointerId); } catch (err) { /* already released */ }
      if (pinch) { if (pointers.size < 2) pinch = null; return; }
      if (!gesture || gesture.id !== e.pointerId) return;
      clearHold();
      const g = gesture;
      const w = rr().toWorld(localPoint(e).x, localPoint(e).y);
      if (g.moved && (g.kind === 'linkEnd' || g.kind === 'jointMove' || g.kind === 'linkMove' || g.kind === 'pulleyMove')) {
        const problem = g.kind === 'linkEnd' ? finishLinkEnd(w) : g.kind === 'linkMove' ? finishLinkMove(w) : g.kind === 'pulleyMove' ? finishPulleyMove(w) : finishJointMove(w);
        // A refused drop leaves everything as it was before the drag.
        if (problem) restoreOrig();
        gesture = null;
        if (problem) { app.cancelGesture(); app.toast(problem); } else app.endGesture(true);
        app.requestDraw();
        return;
      }
      gesture = null;
      if (g.kind === 'grab') app.sim.release();
      if (g.kind === 'pan' && !g.moved && g.deselect) app.select(null);
      if (['move', 'rotate', 'resize'].includes(g.kind) && g.moved) app.endGesture(true);
      app.requestDraw();
    }

    function onPointerCancel(e) {
      pointers.delete(e.pointerId);
      if (pinch && pointers.size < 2) pinch = null;
      clearHold();
      if (gesture && gesture.id === e.pointerId) {
        if (gesture.kind === 'grab') app.sim.release();
        if (gesture.moved && gesture.orig) { restoreOrig(); app.cancelGesture(); }
        gesture = null;
      }
    }

    function updateHover(sp) {
      const hit = hitTest(sp);
      let hover = null;
      let cursor = '';
      if (ed.armed || ed.tool !== 'select') cursor = 'crosshair';
      else if (hit) {
        if (hit.type === 'delete') cursor = 'pointer';
        else if (hit.type === 'linkEnd') cursor = 'move';
        else if (hit.type === 'rotate') cursor = 'grab';
        else if (hit.type === 'resize') cursor = 'nwse-resize';
        else if (hit.type === 'link') { hover = { type: 'link', id: hit.link.id }; cursor = app.running ? 'pointer' : 'move'; }
        else { hover = { type: 'body', id: hit.body.id }; cursor = app.running ? (hit.body.fixed ? 'pointer' : 'grab') : 'move'; }
      }
      canvas.style.cursor = cursor;
      const changed = JSON.stringify(hover) !== JSON.stringify(app.hover);
      app.hover = hover;
      if (changed) app.requestDraw();
    }

    // Pressing or releasing Ctrl or Command mid-drag updates the drag at once, without
    // waiting for the pointer to move.
    const SNAP_KEYS = ['Control', 'Meta'];
    function setSnapKeyHeld(on) {
      if (on === snapKeyHeld) return;
      snapKeyHeld = on;
      if (gesture && gesture.moved) {
        const w = rr().toWorld(gesture.last.x, gesture.last.y);
        const apply = { move: applyMove, rotate: applyRotate, resize: applyResize, linkEnd: applyLinkEnd, linkMove: applyLinkMove, pulleyMove: applyPulleyMove }[gesture.kind];
        if (apply) { apply(w); app.gestureChanged(); }
      }
      app.ui.syncToolbar();
      app.requestDraw();
    }
    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', (e) => { if (SNAP_KEYS.includes(e.key)) setSnapKeyHeld(true); });
      window.addEventListener('keyup', (e) => { if (SNAP_KEYS.includes(e.key)) setSnapKeyHeld(e.ctrlKey || e.metaKey); });
      window.addEventListener('blur', () => setSnapKeyHeld(false));
      // Pointer events carry the keys too, which covers a press made while another window had focus.
      ['pointerdown', 'pointermove', 'pointerup'].forEach((type) => window.addEventListener(type, (e) => setSnapKeyHeld(e.ctrlKey || e.metaKey), true));
    }

    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('pointercancel', onPointerCancel);
    canvas.addEventListener('pointerleave', () => { if (!gesture) { app.hover = null; ed.cursorWorld = null; app.requestDraw(); } });
    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const sp = localPoint(e);
      if (!e.ctrlKey && Math.abs(e.deltaX) > Math.abs(e.deltaY) * 0.8 && e.deltaMode === 0) {
        const camr = app.scene.camera;
        camr.cx += e.deltaX / camr.scale;
        camr.cy -= e.deltaY / camr.scale;
        app.cameraChanged();
        return;
      }
      const dy = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
      zoomAt(sp.x, sp.y, Math.exp(-dy * (e.ctrlKey ? 0.01 : 0.0016)));
    }, { passive: false });

    ed.HINTS = HINTS;
    ed.isDragging = () => !!(gesture && gesture.moved);
    return ed;
  }

  PPM.editor = { createEditor };
})(typeof window !== 'undefined' ? window : globalThis);
