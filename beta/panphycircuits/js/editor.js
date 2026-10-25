// PanPhy Circuits: workspace interaction.
// One gesture at a time: pan, move components, marquee, wire, drag a handle,
// or operate a control (switch lever, slider, knob, push button). Controls are
// separate hit targets, so operating a switch never drags it, and vice versa.
(function (root) {
  const PPC = root.PPC = root.PPC || {};
  const { registry, circuit, layout } = PPC;

  const MOVE_THRESHOLD = 5;

  function createEditor(app, svg, host) {
    const ed = { wiring: null, drag: null, spaceDown: false, lastClick: 0 };
    const pointers = new Map();
    let pinch = null;

    const view = () => app.doc.view;
    const cam = () => app.cameras[view()];
    const snapOn = () => app.snap;
    const snapP = (p) => (snapOn() ? { x: layout.snap(p.x), y: layout.snap(p.y) } : { x: Math.round(p.x), y: Math.round(p.y) });

    function toWorld(clientX, clientY) {
      const rect = svg.getBoundingClientRect();
      const k = cam();
      return { x: (clientX - rect.left - k.tx) / k.z, y: (clientY - rect.top - k.ty) / k.z };
    }
    function hitOf(e) {
      const el = e.target && e.target.closest ? e.target.closest('[data-hit]') : null;
      return el ? Object.assign({ kind: el.dataset.hit }, el.dataset) : { kind: 'bg' };
    }

    // Terminal nearest a world point, within the hit radius (used while wiring,
    // when the preview wire sits under the pointer).
    function nearestTerminal(p, exclude) {
      const z = cam().z;
      const R = Math.min(24, Math.max(10, 16 / z));
      let best = null, bestD = R;
      for (const c of app.doc.components) {
        if (!app.doc.layouts[view()].comps[c.id]) continue;
        for (const t of registry.get(c.type).terminals) {
          if (exclude && exclude.c === c.id && exclude.t === t.id) continue;
          const q = layout.termWorld(app.doc, view(), { c: c.id, t: t.id });
          const d = Math.hypot(q.x - p.x, q.y - p.y);
          if (d < bestD) { bestD = d; best = { c: c.id, t: t.id, x: q.x, y: q.y }; }
        }
      }
      return best;
    }
    function nearestWire(p, excludeIds = []) {
      const z = cam().z;
      const R = Math.max(6, 10 / z);
      let best = null;
      for (const w of app.doc.wires) {
        if (excludeIds.includes(w.id)) continue;
        const r = app.renderer.route(w.id);
        if (!r) continue;
        const q = layout.nearestOnPoly(r.poly, p);
        if (q.dist < R && (!best || q.dist < best.dist)) best = Object.assign({ id: w.id }, q);
      }
      return best;
    }

    // ---------- Placing new components ----------

    function placeAt(type, p) {
      const doc = app.doc;
      const comp = circuit.addComponent(doc, type);
      const pos = snapP(p);
      doc.layouts[view()].comps[comp.id] = { x: pos.x, y: pos.y, r: 0, f: false };
      layout.placeInOtherViews(doc, [comp.id], view());
      app.setSelection([comp.id], []);
      app.commit(`Add ${registry.get(type).name.toLowerCase()}`);
      app.announce(`${registry.get(type).name} ${comp.label} added`);
      return comp;
    }
    ed.placeAtClient = function (type, clientX, clientY) {
      const rect = svg.getBoundingClientRect();
      if (clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom) return null;
      return placeAt(type, toWorld(clientX, clientY));
    };
    ed.placeAtCenter = function (type) {
      const rect = svg.getBoundingClientRect();
      const offset = (app.doc.components.length % 5) * 20;
      return placeAt(type, toWorld(rect.left + rect.width / 2 + offset, rect.top + rect.height / 2 + offset));
    };

    // ---------- Wiring ----------

    function startWiring(from, mode, e) {
      const p = layout.termWorld(app.doc, view(), from);
      ed.wiring = { from, pts: [], mode, cursor: { x: p.x, y: p.y }, start: { x: e.clientX, y: e.clientY }, snapshot: ed.pendingSnapshot || null };
      ed.pendingSnapshot = null;
      app.renderer.renderTerminals();
      app.setHint('Click another terminal to finish, or click a wire to join it with a junction. Click empty space to add a bend · double-click to end at a free point · Backspace removes a bend · Esc cancels.');
      host.classList.add('is-wiring');
      drawWirePreview();
    }

    function drawWirePreview() {
      const w = ed.wiring;
      if (!w) { app.renderer.setPreview(''); return; }
      const v = view();
      const A = layout.termWorld(app.doc, v, w.from);
      const tgt = w.target;
      let B;
      if (tgt && tgt.kind === 'term') B = layout.termWorld(app.doc, v, tgt);
      else if (tgt && tgt.kind === 'wire') B = { x: tgt.x, y: tgt.y, dx: 0, dy: 0 };
      else {
        const c = v === 'schematic' ? snapP(w.cursor) : w.cursor;
        B = { x: c.x, y: c.y, dx: 0, dy: 0 };
      }
      const pts = w.pts;
      let d;
      if (v === 'schematic') {
        const poly = layout.orthoRoute(A, { x: A.dx, y: A.dy }, pts, B, { x: B.dx, y: B.dy });
        d = 'M ' + poly.map((p) => `${p.x} ${p.y}`).join(' L ');
      } else {
        const fake = { id: '_', a: w.from, b: w.from };
        d = layout.wireRoute(app.doc, v, fake, { a: A, b: B, pts }).d;
      }
      let mark = '';
      if (tgt) mark = `<circle class="wire-target" cx="${B.x}" cy="${B.y}" r="9"/>`;
      if (tgt && tgt.kind === 'wire') mark += `<circle class="wire-target-dot" cx="${B.x}" cy="${B.y}" r="4.5"/>`;
      const bends = pts.map(([x, y]) => `<circle class="wire-bend" cx="${x}" cy="${y}" r="3.5"/>`).join('');
      app.renderer.setPreview(`<path class="wire-preview wire-preview-${v}" d="${d}"/>${bends}${mark}`);
    }

    function updateWiringTarget(p) {
      const w = ed.wiring;
      w.cursor = p;
      const t = nearestTerminal(p, w.from);
      if (t) w.target = { kind: 'term', c: t.c, t: t.t };
      else {
        const wr = nearestWire(p, w.branchWires || []);
        w.target = wr ? { kind: 'wire', id: wr.id, x: view() === 'schematic' ? layout.snap(wr.x) : wr.x, y: view() === 'schematic' ? layout.snap(wr.y) : wr.y } : null;
      }
      drawWirePreview();
    }

    function finishWiring(target) {
      const w = ed.wiring;
      const doc = app.doc;
      let to;
      if (target.kind === 'term') to = { c: target.c, t: target.t };
      else if (target.kind === 'wire') {
        const s = layout.splitWire(doc, target.id, view(), { x: target.x, y: target.y });
        to = { c: s.junction, t: 'j' };
      } else if (target.kind === 'free') {
        const j = circuit.addComponent(doc, 'junction');
        const p = snapP(target);
        doc.layouts[view()].comps[j.id] = { x: p.x, y: p.y, r: 0, f: false };
        layout.placeInOtherViews(doc, [j.id], view());
        to = { c: j.id, t: 'j' };
      }
      const res = circuit.addWire(doc, w.from, to);
      if (res.error) {
        app.toast(res.error);
        cancelWiring();
        return;
      }
      doc.layouts[view()].wires[res.wire.id] = { pts: w.pts.map((p) => p.slice()) };
      for (const v of layout.VIEWS) if (v !== view() && !doc.layouts[v].wires[res.wire.id]) doc.layouts[v].wires[res.wire.id] = { pts: [] };
      endWiring();
      app.setSelection([], [res.wire.id]);
      app.commit('Add wire');
      app.announce('Wire connected');
    }

    function cancelWiring() {
      if (!ed.wiring) return;
      if (ed.wiring.snapshot) app.restoreSnapshot(ed.wiring.snapshot);
      endWiring();
      app.renderAll();
    }
    function endWiring() {
      ed.wiring = null;
      host.classList.remove('is-wiring');
      app.renderer.setPreview('');
      app.renderer.renderTerminals();
      app.setHint(null);
    }
    ed.cancelWiring = cancelWiring;

    function wiringClick(e, p, hit) {
      const w = ed.wiring;
      updateWiringTarget(p);
      const now = Date.now();
      const dbl = now - ed.lastClick < 350 && Math.hypot(e.clientX - ed.lastPos.x, e.clientY - ed.lastPos.y) < 8;
      ed.lastClick = now; ed.lastPos = { x: e.clientX, y: e.clientY };
      if (w.target) { finishWiring(w.target); return; }
      if (dbl) {
        // The first click of the double-click added a bend at this point; end there instead.
        const last = w.pts.pop();
        finishWiring({ kind: 'free', x: last ? last[0] : p.x, y: last ? last[1] : p.y });
        return;
      }
      const q = view() === 'schematic' ? snapP(p) : p;
      w.pts.push([Math.round(q.x), Math.round(q.y)]);
      drawWirePreview();
    }

    // ---------- Pointer handling ----------

    svg.addEventListener('contextmenu', (e) => e.preventDefault());

    svg.addEventListener('pointerdown', (e) => {
      if (e.button !== 0 && e.button !== 1 && e.button !== 2) return;
      svg.setPointerCapture(e.pointerId);
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      host.focus({ preventScroll: true });
      if (pointers.size === 2) { startPinch(); return; }
      if (pointers.size > 2) return;
      const p = toWorld(e.clientX, e.clientY);
      const hit = hitOf(e);
      if (app.placing) {
        placeAt(app.placing, p);
        if (!e.shiftKey) app.setPlacing(null);
        return;
      }
      if (e.button === 1 || e.button === 2 || app.tool === 'pan' || ed.spaceDown) { startPan(e); return; }
      if (ed.wiring && ed.wiring.mode === 'click') { wiringClick(e, p, hit); return; }
      ed.downAt = { x: e.clientX, y: e.clientY, p };
      switch (hit.kind) {
        case 'term': {
          ed.drag = { type: 'wire-pending', from: { c: hit.c, t: hit.t } };
          return;
        }
        case 'act': return pressActuator(e, hit.id, p);
        case 'comp': {
          const id = hit.id;
          if (e.shiftKey || e.metaKey || e.ctrlKey) {
            app.toggleSelection(id, 'comp');
          } else if (!app.selection.comps.has(id)) app.setSelection([id], []);
          if (app.tool === 'wire') return;
          beginMove(p);
          return;
        }
        case 'wire': {
          if (app.tool === 'wire') {
            ed.pendingSnapshot = app.snapshot();
            const s = layout.splitWire(app.doc, hit.id, view(), snapIfSch(p));
            app.renderAll();
            startWiring({ c: s.junction, t: 'j' }, 'click', e);
            ed.wiring.branchWires = s.wires;
            return;
          }
          if (e.shiftKey || e.metaKey || e.ctrlKey) app.toggleSelection(hit.id, 'wire');
          else app.setSelection([], [hit.id]);
          ed.drag = { type: 'wire-bend-pending', id: hit.id, p };
          return;
        }
        case 'wp': return beginHandle('wp', hit.id, Number(hit.i), p, e);
        case 'mid': return beginHandle('mid', hit.id, Number(hit.i), p, e);
        case 'end': return beginHandle('end', hit.id, hit.end, p, e);
        default: {
          if (e.pointerType === 'touch' || e.pointerType === 'pen') { startPan(e, true); return; }
          if (!(e.shiftKey || e.metaKey || e.ctrlKey)) app.setSelection([], []);
          ed.drag = { type: 'marquee', p0: p, p1: p, additive: e.shiftKey || e.metaKey || e.ctrlKey };
        }
      }
    });

    function snapIfSch(p) { return view() === 'schematic' ? { x: layout.snap(p.x), y: layout.snap(p.y) } : p; }

    svg.addEventListener('pointermove', (e) => {
      if (pointers.has(e.pointerId)) pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pinch) { updatePinch(); return; }
      const p = toWorld(e.clientX, e.clientY);
      app.lastPointerWorld = p;
      if (app.placing) { app.updateGhost(p); return; }
      const d = ed.drag;
      if (!d) {
        if (ed.wiring) updateWiringTarget(p);
        return;
      }
      const moved = ed.downAt ? Math.hypot(e.clientX - ed.downAt.x, e.clientY - ed.downAt.y) > MOVE_THRESHOLD : true;
      switch (d.type) {
        case 'pan': {
          const k = cam();
          k.tx = d.tx + (e.clientX - d.x); k.ty = d.ty + (e.clientY - d.y);
          app.renderer.applyCamera();
          break;
        }
        case 'wire-pending':
          if (moved) { startWiring(d.from, 'drag', e); ed.drag = { type: 'wiring' }; updateWiringTarget(p); }
          break;
        case 'wiring': updateWiringTarget(p); break;
        case 'move': if (moved || d.active) { d.active = true; doMove(p); } break;
        case 'marquee': {
          d.p1 = p;
          const x = Math.min(d.p0.x, p.x), y = Math.min(d.p0.y, p.y);
          app.renderer.setPreview(`<rect class="marquee" x="${x}" y="${y}" width="${Math.abs(p.x - d.p0.x)}" height="${Math.abs(p.y - d.p0.y)}"/>`);
          break;
        }
        case 'act-toggle': if (moved) { ed.drag = null; beginMove(ed.downAt.p); ed.drag.active = true; doMove(p); } break;
        case 'act-slider': doSlider(d, p); break;
        case 'act-knob': doKnob(d, e); break;
        case 'wire-bend-pending':
          if (moved) {
            let route = app.renderer.route(d.id);
            if (!route) break;
            if (materialize(d.id)) { app.renderer.renderWires(); route = app.renderer.route(d.id); }
            const at = layout.nearestOnPoly(route.poly, d.p);
            const idx = intervalAt(d.id, route, at);
            insertBend(d.id, idx, d.p);
            ed.drag = { type: 'handle', kind: 'wp', id: d.id, i: idx, before: app.snapshot() };
            doHandle(ed.drag, p);
          }
          break;
        case 'handle': if (moved || d.active) { d.active = true; doHandle(d, p); } break;
        default: break;
      }
    });

    function endPointer(e) {
      pointers.delete(e.pointerId);
      if (pinch) { if (pointers.size < 2) pinch = null; return; }
      const d = ed.drag;
      ed.drag = null;
      if (!d) return;
      const p = toWorld(e.clientX, e.clientY);
      switch (d.type) {
        case 'wire-pending': {
          // A click on a terminal: start a wire that follows the pointer.
          startWiring(d.from, 'click', e);
          break;
        }
        case 'wiring': {
          const w = ed.wiring;
          if (!w) break;
          updateWiringTarget(p);
          if (w.target) finishWiring(w.target);
          else {
            // Released in empty space: keep wiring, with a bend here.
            w.mode = 'click';
            const q = view() === 'schematic' ? snapP(p) : p;
            w.pts.push([Math.round(q.x), Math.round(q.y)]);
            drawWirePreview();
          }
          break;
        }
        case 'move':
          if (d.active) { app.commit(d.ids.length > 1 ? 'Move components' : 'Move component'); }
          break;
        case 'marquee': {
          app.renderer.setPreview('');
          const x = Math.min(d.p0.x, d.p1.x), y = Math.min(d.p0.y, d.p1.y), x2 = Math.max(d.p0.x, d.p1.x), y2 = Math.max(d.p0.y, d.p1.y);
          if (x2 - x < 3 && y2 - y < 3) break;
          const box = { x, y, x2, y2 };
          const comps = app.doc.components.filter((c) => { const b = layout.compBounds(app.doc, view(), c.id); return b && layout.overlaps(b, box, 0); }).map((c) => c.id);
          const wires = app.doc.wires.filter((w) => { const r = app.renderer.route(w.id); return r && r.poly.every((q) => q.x >= x && q.x <= x2 && q.y >= y && q.y <= y2); }).map((w) => w.id);
          if (d.additive) app.setSelection([...new Set([...app.selection.comps, ...comps])], [...new Set([...app.selection.wires, ...wires])]);
          else app.setSelection(comps, wires);
          break;
        }
        case 'act-toggle': operateToggle(d.id); break;
        case 'act-momentary': releaseMomentary(d.id); break;
        case 'act-slider': case 'act-knob':
          if (d.changed) app.commit(`Adjust ${circuit.getComp(app.doc, d.id).label}`);
          break;
        case 'handle': endHandle(d, p); break;
        default: break;
      }
    }
    svg.addEventListener('pointerup', endPointer);
    svg.addEventListener('pointercancel', (e) => {
      pointers.delete(e.pointerId);
      const d = ed.drag;
      if (d && d.type === 'act-momentary') releaseMomentary(d.id);
      ed.drag = null;
      pinch = null;
    });

    svg.addEventListener('dblclick', (e) => {
      const hit = hitOf(e);
      if (hit.kind === 'wp') {
        const lay = app.doc.layouts[view()].wires[hit.id];
        if (lay) { lay.pts.splice(Number(hit.i), 1); app.commit('Remove bend'); }
      }
    });

    // ---------- Pan, zoom, pinch ----------

    function startPan(e, fromTouch) {
      const k = cam();
      ed.drag = { type: 'pan', x: e.clientX, y: e.clientY, tx: k.tx, ty: k.ty, fromTouch };
      host.classList.add('is-panning');
      const stop = () => { host.classList.remove('is-panning'); svg.removeEventListener('pointerup', stop); };
      svg.addEventListener('pointerup', stop);
    }

    function zoomAt(clientX, clientY, factor) {
      const k = cam();
      const rect = svg.getBoundingClientRect();
      const sx = clientX - rect.left, sy = clientY - rect.top;
      const z = Math.min(4, Math.max(0.2, k.z * factor));
      const f = z / k.z;
      k.tx = sx - (sx - k.tx) * f;
      k.ty = sy - (sy - k.ty) * f;
      k.z = z;
      app.renderer.applyCamera();
      app.onZoom();
    }
    ed.zoomBy = function (factor) {
      const rect = svg.getBoundingClientRect();
      zoomAt(rect.left + rect.width / 2, rect.top + rect.height / 2, factor);
    };

    svg.addEventListener('wheel', (e) => {
      e.preventDefault();
      if (!e.ctrlKey && Math.abs(e.deltaX) > Math.abs(e.deltaY) * 0.8 && e.deltaMode === 0) {
        const k = cam(); k.tx -= e.deltaX; k.ty -= e.deltaY; app.renderer.applyCamera(); return;
      }
      const dy = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
      zoomAt(e.clientX, e.clientY, Math.exp(-dy * (e.ctrlKey ? 0.01 : 0.0016)));
    }, { passive: false });

    function startPinch() {
      ed.drag = null;
      const [a, b] = [...pointers.values()];
      const k = cam();
      pinch = { d: Math.hypot(b.x - a.x, b.y - a.y), mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2, z: k.z, tx: k.tx, ty: k.ty };
    }
    function updatePinch() {
      const [a, b] = [...pointers.values()];
      if (!a || !b) return;
      const k = cam();
      const rect = svg.getBoundingClientRect();
      const d = Math.hypot(b.x - a.x, b.y - a.y);
      const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      const z = Math.min(4, Math.max(0.2, pinch.z * d / pinch.d));
      const wx = (pinch.mx - rect.left - pinch.tx) / pinch.z, wy = (pinch.my - rect.top - pinch.ty) / pinch.z;
      k.z = z;
      k.tx = mx - rect.left - wx * z;
      k.ty = my - rect.top - wy * z;
      app.renderer.applyCamera();
      app.onZoom();
    }

    // ---------- Moving ----------

    function beginMove(p) {
      const v = view();
      const ids = [...app.selection.comps].filter((id) => app.doc.layouts[v].comps[id]);
      if (!ids.length) return;
      const set = new Set(ids);
      const init = new Map(ids.map((id) => [id, Object.assign({}, app.doc.layouts[v].comps[id])]));
      const wires = app.doc.wires.filter((w) => set.has(w.a.c) && set.has(w.b.c)).map((w) => ({ id: w.id, pts: layout.wirePoints(app.doc, v, w).map((q) => q.slice()) }));
      ed.drag = { type: 'move', ids, init, wires, p0: p, primary: ids[ids.length - 1] };
    }

    function doMove(p) {
      const d = ed.drag;
      const v = view();
      const prim = d.init.get(d.primary);
      let dx = p.x - d.p0.x, dy = p.y - d.p0.y;
      if (snapOn()) { dx = layout.snap(prim.x + dx) - prim.x; dy = layout.snap(prim.y + dy) - prim.y; }
      else { dx = Math.round(dx); dy = Math.round(dy); }
      for (const [id, pl] of d.init) {
        const cur = app.doc.layouts[v].comps[id];
        cur.x = pl.x + dx; cur.y = pl.y + dy;
      }
      for (const w of d.wires) {
        const lay = app.doc.layouts[v].wires[w.id] || (app.doc.layouts[v].wires[w.id] = { pts: [] });
        lay.pts = w.pts.map(([x, y]) => [x + dx, y + dy]);
      }
      app.renderer.renderMove(d.ids);
    }

    // ---------- Handles on a selected wire ----------

    function intervalAt(id, route, at) {
      // Interval between control points (terminal, bends..., terminal) nearest the point.
      const ctrl = [route.a].concat(route.pts.map(([x, y]) => ({ x, y })), [route.b]);
      let best = 0, bestD = Infinity;
      for (let i = 0; i < ctrl.length - 1; i++) {
        const sub = view() === 'schematic'
          ? layout.orthoRoute(ctrl[i], i === 0 ? { x: route.a.dx, y: route.a.dy } : { x: 0, y: 0 }, [], ctrl[i + 1], i === ctrl.length - 2 ? { x: route.b.dx, y: route.b.dy } : { x: 0, y: 0 })
          : null;
        let dd;
        if (sub) dd = layout.nearestOnPoly(sub, at).dist;
        else {
          const idxs = route.segIndex;
          dd = Infinity;
          route.poly.forEach((q, k) => { if (idxs[k] === i) dd = Math.min(dd, Math.hypot(q.x - at.x, q.y - at.y)); });
        }
        if (dd < bestD) { bestD = dd; best = i; }
      }
      return best;
    }

    // Turn an automatic diagram route into explicit bends, so editing keeps its shape.
    function materialize(id) {
      const v = view();
      if (v !== 'schematic') return false;
      const lay = app.doc.layouts[v].wires[id] || (app.doc.layouts[v].wires[id] = { pts: [] });
      if (lay.pts.length) return false;
      const r = app.renderer.route(id);
      if (!r || r.poly.length <= 2) return false;
      lay.pts = r.poly.slice(1, -1).map((q) => [q.x, q.y]);
      return true;
    }

    function insertBend(id, index, p) {
      const v = view();
      const lay = app.doc.layouts[v].wires[id] || (app.doc.layouts[v].wires[id] = { pts: [] });
      const q = v === 'schematic' ? snapP(p) : p;
      lay.pts.splice(index, 0, [Math.round(q.x), Math.round(q.y)]);
    }

    function beginHandle(kind, id, i, p, e) {
      const before = app.snapshot();
      if (kind === 'mid') { materialize(id); insertBend(id, i, p); kind = 'wp'; app.renderer.renderWires(); }
      ed.drag = { type: 'handle', kind, id, i, before, active: false };
    }

    function doHandle(d, p) {
      const v = view();
      if (d.kind === 'wp') {
        const lay = app.doc.layouts[v].wires[d.id];
        const q = v === 'schematic' ? snapP(p) : p;
        lay.pts[d.i] = [Math.round(q.x), Math.round(q.y)];
        app.renderer.renderWires();
        app.renderer.renderOverlay();
      } else if (d.kind === 'end') {
        const w = circuit.getWire(app.doc, d.id);
        const other = d.i === 'a' ? w.b : w.a;
        const t = nearestTerminal(p, other);
        d.target = t;
        const A = layout.termWorld(app.doc, v, other);
        const B = t ? layout.termWorld(app.doc, v, t) : { x: p.x, y: p.y, dx: 0, dy: 0 };
        const fake = { id: '_', a: other, b: other };
        const r = layout.wireRoute(app.doc, v, fake, { a: A, b: B, pts: d.i === 'a' ? layout.wirePoints(app.doc, v, w).slice().reverse() : layout.wirePoints(app.doc, v, w) });
        app.renderer.setPreview(`<path class="wire-preview wire-preview-${v}" d="${r.d}"/>` + (t ? `<circle class="wire-target" cx="${B.x}" cy="${B.y}" r="9"/>` : ''));
      }
    }

    function endHandle(d, p) {
      if (d.kind === 'wp') {
        if (d.active) app.commit('Move bend');
        else app.renderAll();
        return;
      }
      app.renderer.setPreview('');
      if (!d.active) return;
      const w = circuit.getWire(app.doc, d.id);
      const other = d.i === 'a' ? w.b : w.a;
      const t = d.target;
      if (!t) { app.toast('Drop the wire end on a terminal to reconnect it.'); return; }
      const end = { c: t.c, t: t.t };
      const dup = app.doc.wires.some((x) => x.id !== w.id && ((circuit.sameEnd(x.a, end) && circuit.sameEnd(x.b, other)) || (circuit.sameEnd(x.b, end) && circuit.sameEnd(x.a, other))));
      if (circuit.sameEnd(end, other) || dup) { app.toast('That connection is not possible.'); return; }
      w[d.i] = end;
      circuit.cleanupJunctions(app.doc);
      app.commit('Reconnect wire');
    }

    // ---------- Controls on components ----------

    function pressActuator(e, id, p) {
      const c = circuit.getComp(app.doc, id);
      const a = layout.artFor(view(), c.type).actuator(c.props);
      if (!(e.shiftKey || e.metaKey || e.ctrlKey) && !app.selection.comps.has(id)) app.setSelection([id], []);
      if (a.kind === 'toggle') { ed.drag = { type: 'act-toggle', id }; return; }
      if (a.kind === 'momentary') {
        app.sim.pressed[id] = true;
        app.electricalChanged();
        ed.drag = { type: 'act-momentary', id };
        return;
      }
      if (a.kind === 'slider') { ed.drag = { type: 'act-slider', id, a }; doSlider(ed.drag, p); return; }
      if (a.kind === 'knob') { ed.drag = { type: 'act-knob', id, x: e.clientX, y: e.clientY, start: c.props.pos }; }
    }

    function toLocal(pl, p) {
      let x = p.x - pl.x, y = p.y - pl.y;
      let X, Y;
      switch (pl.r & 3) {
        case 1: X = y; Y = -x; break;
        case 2: X = -x; Y = -y; break;
        case 3: X = -y; Y = x; break;
        default: X = x; Y = y;
      }
      if (pl.f) X = -X;
      return { x: X, y: Y };
    }

    function setLive(id, key, value) {
      const c = circuit.getComp(app.doc, id);
      if (c.props[key] === value) return false;
      c.props[key] = value;
      app.electricalChanged(true);
      return true;
    }

    function doSlider(d, p) {
      const pl = app.doc.layouts[view()].comps[d.id];
      const loc = toLocal(pl, p);
      const f = Math.max(0, Math.min(1, (loc.x - d.a.x0) / (d.a.x1 - d.a.x0)));
      if (setLive(d.id, 'pos', Math.round(f * 100))) d.changed = true;
    }
    function doKnob(d, e) {
      const k = cam();
      const delta = ((e.clientX - d.x) - (e.clientY - d.y)) / (1.6 * Math.max(0.6, k.z));
      if (setLive(d.id, 'pos', Math.round(Math.max(0, Math.min(100, d.start + delta))))) d.changed = true;
    }

    function operateToggle(id) {
      const c = circuit.getComp(app.doc, id);
      const def = registry.get(c.type);
      const key = def.actuator.prop;
      c.props[key] = !c.props[key];
      app.operationalChanged(c);
      app.announce(`${c.label} ${describeToggle(c)}`);
    }
    function describeToggle(c) {
      if (c.type === 'switch') return c.props.closed ? 'closed' : 'open';
      if (c.type === 'switch2') return c.props.toB ? 'switched to B' : 'switched to A';
      if (c.type === 'logic_in') return c.props.high ? 'HIGH (1)' : 'LOW (0)';
      return 'changed';
    }
    function releaseMomentary(id) {
      delete app.sim.pressed[id];
      app.electricalChanged();
    }
    ed.operateToggle = operateToggle;
    ed.pressMomentary = (id, down) => { if (down) app.sim.pressed[id] = true; else delete app.sim.pressed[id]; app.electricalChanged(); };

    // ---------- Keyboard ----------

    function inField(e) {
      const t = e.target;
      return t && (t.tagName === 'INPUT' || t.tagName === 'SELECT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
    }

    document.addEventListener('keydown', (e) => {
      if (inField(e) || app.modalOpen()) return;
      const mod = e.ctrlKey || e.metaKey;
      const k = e.key;
      if (k === 'Escape') {
        if (ed.wiring) cancelWiring();
        else if (app.placing) app.setPlacing(null);
        else app.setSelection([], []);
        return;
      }
      if (ed.wiring && k === 'Backspace') { ed.wiring.pts.pop(); drawWirePreview(); e.preventDefault(); return; }
      if (mod && k.toLowerCase() === 'z') { e.preventDefault(); if (e.shiftKey) app.redo(); else app.undo(); return; }
      if (mod && k.toLowerCase() === 'y') { e.preventDefault(); app.redo(); return; }
      if (mod && k.toLowerCase() === 'd') { e.preventDefault(); app.duplicate(); return; }
      if (mod && k.toLowerCase() === 'c') { app.copy(); return; }
      if (mod && k.toLowerCase() === 'v') { app.paste(); return; }
      if (mod && k.toLowerCase() === 'a') { e.preventDefault(); app.setSelection(app.doc.components.map((c) => c.id), app.doc.wires.map((w) => w.id)); return; }
      if (mod) return;
      if (k === 'Delete' || k === 'Backspace') { e.preventDefault(); app.deleteSelection(); return; }
      if (k === ' ') { e.preventDefault(); app.toggleRun(); return; }
      if (k === 'Enter') {
        const c = singleComp();
        if (c && registry.get(c.type).actuator) {
          const kind = registry.get(c.type).actuator.kind;
          if (kind === 'toggle') operateToggle(c.id);
          else if (kind === 'momentary' && !e.repeat) ed.pressMomentary(c.id, true);
          e.preventDefault();
        }
        return;
      }
      const lower = k.toLowerCase();
      if (lower === 'r') { app.rotateSelection(e.shiftKey ? -1 : 1); return; }
      if (lower === 'm') { app.flipSelection(); return; }
      if (lower === 'w') { app.setTool('wire'); return; }
      if (lower === 'v') { app.setTool('select'); return; }
      if (lower === 'h') { app.setTool('pan'); return; }
      if (lower === 'g') { app.toggleSnap(); return; }
      if (k === '1') { app.setView('realistic'); return; }
      if (k === '2') { app.setView('schematic'); return; }
      if (k === '0') { app.fit(); return; }
      if (k === '+' || k === '=') { ed.zoomBy(1.2); return; }
      if (k === '-' || k === '_') { ed.zoomBy(1 / 1.2); return; }
      if (k.startsWith('Arrow')) {
        const ids = [...app.selection.comps];
        if (!ids.length) return;
        e.preventDefault();
        const step = (e.shiftKey ? 5 : 1) * layout.GRID;
        const dx = k === 'ArrowLeft' ? -step : k === 'ArrowRight' ? step : 0;
        const dy = k === 'ArrowUp' ? -step : k === 'ArrowDown' ? step : 0;
        for (const id of ids) { const pl = app.doc.layouts[view()].comps[id]; if (pl) { pl.x += dx; pl.y += dy; } }
        app.commit('Move component', { merge: 'arrow' });
        return;
      }
      if (k === 'Tab' && host.contains(document.activeElement)) {
        const comps = app.doc.components.filter((c) => c.type !== 'junction');
        if (!comps.length) return;
        e.preventDefault();
        const cur = singleComp();
        let i = cur ? comps.findIndex((c) => c.id === cur.id) : -1;
        i = (i + (e.shiftKey ? -1 : 1) + comps.length) % comps.length;
        app.setSelection([comps[i].id], []);
        app.announce(`${comps[i].label}, ${registry.get(comps[i].type).name} selected`);
      }
    });
    document.addEventListener('keyup', (e) => {
      if (e.key === 'Enter') {
        const c = singleComp();
        if (c && c.type === 'pushswitch' && app.sim.pressed[c.id]) ed.pressMomentary(c.id, false);
      }
    });

    function singleComp() {
      if (app.selection.comps.size !== 1) return null;
      return circuit.getComp(app.doc, [...app.selection.comps][0]);
    }

    return ed;
  }

  PPC.editor = { createEditor };
})(typeof globalThis === 'object' ? globalThis : this);
