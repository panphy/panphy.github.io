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
    weld: 'Glue: click where two objects overlap to join them rigidly, or on one object to fix it to the background. Right-click or Esc cancels.'
  };

  function createEditor(app, canvas) {
    const ed = { tool: 'select', armed: null, pending: null, cursorWorld: null };
    const pointers = new Map();
    let gesture = null;
    let pinch = null;

    const rr = () => app.renderer;
    const snapOn = () => app.snap;
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
        // Just outside the upper-left corner of the object as drawn; small objects push it
        // at least 22 px from their center so it stays clear of the other handles.
        const box = screenBox(b);
        const cx = (box.minX + box.maxX) / 2;
        const cy = (box.minY + box.maxY) / 2;
        p = { x: Math.min(box.minX - 8, cx - 22), y: Math.min(box.minY - 8, cy - 22) };
      } else {
        const l = S.linkById(app.scene, sel.id);
        if (!l) return null;
        const pa = rr().toScreen(S.endPoint(app.scene, l.a, l.la, app.poseOf));
        if (l.kind === 'hinge' || l.kind === 'weld') p = { x: pa.x - 17, y: pa.y - 17 };
        else {
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
      const w = ed.cursorWorld;
      if (!w) return null;
      if (gesture && gesture.kind === 'jointMove' && gesture.moved) {
        const bs = bodiesAt(w);
        return { point: bs.length ? jointPoint(w, bs[0]) : w, ok: bs.length > 0 };
      }
      if (ed.armed) {
        const b = S.makeBody({ ...app.scene, bodies: app.scene.bodies.slice(), links: [], nextId: 0 }, ed.armed, snapV(w.x, SNAP_POS), snapV(w.y, SNAP_POS));
        return { body: b };
      }
      if (['spring', 'rod', 'rope'].includes(ed.tool)) {
        const target = endTarget(w);
        if (ed.pending) return { link: { kind: ed.tool, from: ed.pending.world, to: target.world }, point: target.world, ok: true };
        return { point: target.world, ok: true };
      }
      if (['hinge', 'motor', 'weld'].includes(ed.tool)) {
        const bs = bodiesAt(w);
        return { point: bs.length ? jointPoint(w, bs[0]) : w, ok: bs.length > 0 };
      }
      return null;
    };

    // Where a connector end lands: an object's center when the pointer is near it, else the
    // pointer on that object, else a point on the background.
    function endTarget(w) {
      const bs = bodiesAt(w);
      if (bs.length) {
        const b = bs[0];
        const p = jointPoint(w, b);
        return { body: b, world: p, local: S.toLocal(app.poseOf(b), p) };
      }
      const p = { x: snapV(w.x, SNAP_POS), y: snapV(w.y, SNAP_POS) };
      return { body: null, world: p, local: p };
    }

    function jointPoint(w, b) {
      const pose = app.poseOf(b);
      const e = S.extent(b);
      const near = Math.max(Math.min(e.x, e.y) * 0.35, 10 / app.scene.camera.scale);
      if (Math.hypot(w.x - pose.x, w.y - pose.y) <= near) return { x: pose.x, y: pose.y };
      return w;
    }

    function placeLinkEnd(w, keep) {
      const t = endTarget(w);
      if (!ed.pending) {
        ed.pending = { a: t.body ? t.body.id : null, la: t.local, world: t.world };
        app.setHint('Now click the second end. Right-click or Esc cancels.');
        return;
      }
      const p = ed.pending;
      const b = t.body ? t.body.id : null;
      if (!p.a && !b) { app.toast('Attach at least one end to an object.'); return; }
      if (p.a && p.a === b) { app.toast('Connect two different objects, or an object and the background.'); return; }
      const kind = ed.tool;
      app.edit(() => {
        const l = S.makeLink(app.scene, kind, p.a, p.la, b, t.local);
        if (kind === 'spring') l.rest = Math.max(0.05, Math.round(S.linkLength(app.scene, l) * 100) / 100);
        else l.length = Math.max(S.LIMITS.length[0], S.linkLength(app.scene, l));
        app.scene.links.push(l);
        app.select({ type: 'link', id: l.id });
      });
      ed.pending = null;
      if (!keep) ed.setTool('select');
      else app.setHint(HINTS[kind]);
    }

    function placeJoint(w, keep) {
      const bs = bodiesAt(w);
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

    ed.placeBody = function placeBody(type, w) {
      app.edit(() => {
        const b = S.makeBody(app.scene, type, snapV(w.x, SNAP_POS), snapV(w.y, SNAP_POS));
        // Never place an object partly inside the floor: lift it to rest on top, at the
        // engine's resting gap so it does not pop up when time starts.
        if (app.scene.world.floor) {
          const bottom = (b.kind === 'ball' ? b.r : Math.max(...S.vertices(b).map((p) => -p.y))) + S.restGap(b);
          if (b.y < bottom) b.y = bottom;
        }
        app.scene.bodies.push(b);
        app.select({ type: 'body', id: b.id });
      });
    };

    ed.dropBody = function dropBody(type, clientX, clientY) {
      const rect = canvas.getBoundingClientRect();
      if (clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom) return false;
      ed.placeBody(type, rr().toWorld(clientX - rect.left, clientY - rect.top));
      return true;
    };

    ed.dropConnector = function dropConnector(type, clientX, clientY) {
      const rect = canvas.getBoundingClientRect();
      if (clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom) return false;
      ed.setTool(type);
      const w = rr().toWorld(clientX - rect.left, clientY - rect.top);
      ed.cursorWorld = w;
      if (['spring', 'rod', 'rope'].includes(type)) placeLinkEnd(w, false);
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
      l[gesture.end] = null;
      l['l' + gesture.end] = { x: snapV(w.x, SNAP_POS), y: snapV(w.y, SNAP_POS) };
      if (l.kind === 'rod' || l.kind === 'rope') l.length = Math.max(S.LIMITS.length[0], S.linkLength(app.scene, l));
    }

    function finishLinkEnd(w) {
      restoreOrig();
      const l = S.linkById(app.scene, gesture.linkId);
      const end = gesture.end;
      const other = end === 'a' ? l.b : l.a;
      const t = endTarget(w);
      const id = t.body ? t.body.id : null;
      if (!id && !other) return 'Attach at least one end to an object.';
      if (id && id === other) return 'Connect two different objects, or an object and the background.';
      l[end] = id;
      l['l' + end] = t.local;
      if (l.kind === 'rod' || l.kind === 'rope') l.length = Math.max(S.LIMITS.length[0], S.linkLength(app.scene, l));
      return null;
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
      l.a = null; l.la = a;
      l.b = null; l.lb = b;
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
      if (l.kind === 'rod' || l.kind === 'rope') l.length = Math.max(S.LIMITS.length[0], S.linkLength(app.scene, l));
      return null;
    }

    // A hinge, motor or glue joint dropped somewhere joins whatever is under it there.
    function finishJointMove(w) {
      restoreOrig();
      const l = S.linkById(app.scene, gesture.linkId);
      const bs = bodiesAt(w);
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
      const dx = snapV(b0.x + (w.x - gesture.startWorld.x), SNAP_POS) - b0.x;
      const dy = snapV(b0.y + (w.y - gesture.startWorld.y), SNAP_POS) - b0.y;
      S.transformBodies(app.scene, gesture.group, (p, angle) => ({ x: p.x + dx, y: p.y + dy, angle }));
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
        ed.placeBody(ed.armed, w);
        if (!e.shiftKey) ed.arm(null);
        return;
      }
      if (['spring', 'rod', 'rope'].includes(ed.tool)) { placeLinkEnd(w, e.shiftKey); app.requestDraw(); return; }
      if (['hinge', 'motor', 'weld'].includes(ed.tool)) { placeJoint(w, e.shiftKey); app.requestDraw(); return; }
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
        else startGesture(joint ? 'jointMove' : 'linkMove', e, sp, { linkId: hit.link.id });
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
          if (firstMove) beginSceneDrag();
          if (gesture.kind === 'linkEnd') applyLinkEnd(w); else applyLinkMove(w);
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
      if (g.moved && (g.kind === 'linkEnd' || g.kind === 'jointMove' || g.kind === 'linkMove')) {
        const problem = g.kind === 'linkEnd' ? finishLinkEnd(w) : g.kind === 'linkMove' ? finishLinkMove(w) : finishJointMove(w);
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
