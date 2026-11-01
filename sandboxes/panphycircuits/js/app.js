// PanPhyCircuits: application state and glue.
// Document and history (shared circuit + both layouts), the simulation loop
// (fixed time steps, independent of frame rate), autosave and file handling.
(function (root) {
  const PPC = root.PPC = root.PPC || {};
  const { registry, circuit, layout, solver, units } = PPC;

  const AUTOSAVE_KEY = 'panphy-circuits-autosave-v1';
  const DISPLAY_KEY = 'panphy-circuits-display-v1';
  const DISPLAY_KEYS = ['showLabels', 'showValues', 'currentFlow', 'wireColorsInDiagram', 'logicStyle'];
  const displayPreferences = {};
  try {
    const saved = JSON.parse(localStorage.getItem(DISPLAY_KEY));
    for (const key of DISPLAY_KEYS) {
      const value = saved && saved[key];
      if (key === 'logicStyle' ? ['distinctive', 'iec'].includes(value) : typeof value === 'boolean') displayPreferences[key] = value;
    }
  } catch (e) { /* Ignore unavailable storage or invalid preferences. */ }
  const HISTORY_MAX = 200;

  const app = {
    doc: circuit.createDoc(),
    sim: solver.createSim(),
    selection: { comps: new Set(), wires: new Set() },
    tool: 'select',
    snap: true,
    placing: null,
    cameras: { realistic: { tx: 0, ty: 0, z: 1, fitted: false }, schematic: { tx: 0, ty: 0, z: 1, fitted: false } },
    history: { stack: [], index: -1 },
    problemComps: new Set(),
    noteComps: new Set(),
    rev: 0,
    graphRange: null,
    clipboard: null,
    lastElecKey: '',
    pinned: new Set(),
    paused: false, // User intent, independent of whether the circuit needs time.
    emptyDismissed: false
  };
  PPC.app = app;

  // ---------- History ----------

  function snapshot() {
    return JSON.stringify({ components: app.doc.components, wires: app.doc.wires, layouts: app.doc.layouts });
  }
  app.snapshot = snapshot;

  // Restore a snapshot. Operational settings (switch positions, logic inputs,
  // plot toggles) are not part of undo: components that still exist keep theirs.
  function applySnapshot(s) {
    const data = JSON.parse(s);
    const current = new Map(app.doc.components.map((c) => [c.id, c]));
    for (const c of data.components) {
      const cur = current.get(c.id);
      if (!cur || cur.type !== c.type) continue;
      for (const p of registry.get(c.type).props) if (p.operational) c.props[p.key] = cur.props[p.key];
    }
    app.doc.components = data.components;
    app.doc.wires = data.wires;
    app.doc.layouts = data.layouts;
  }
  app.restoreSnapshot = function (s) { applySnapshot(s); afterChange(); };

  app.commit = function (label, opts = {}) {
    const h = app.history;
    const snap = snapshot();
    const top = h.stack[h.index];
    const now = Date.now();
    if (top && top.snap === snap) { afterChange(); return; }
    if (opts.merge && top && top.merge === opts.merge && now - top.time < 1500) {
      top.snap = snap; top.time = now;
    } else {
      h.stack = h.stack.slice(0, h.index + 1);
      h.stack.push({ snap, label, view: app.doc.view, time: now, merge: opts.merge || null });
      if (h.stack.length > HISTORY_MAX) h.stack.shift();
      h.index = h.stack.length - 1;
    }
    afterChange();
  };
  app.canUndo = () => app.history.index > 0;
  app.canRedo = () => app.history.index < app.history.stack.length - 1;
  app.undo = function () {
    if (app.editor.wiring) { app.editor.cancelWiring(); return; }
    if (!app.canUndo()) return;
    const undone = app.history.stack[app.history.index];
    app.history.index--;
    applySnapshot(app.history.stack[app.history.index].snap);
    afterChange();
    ui.toast(`Undid: ${undone.label}${undone.view !== app.doc.view ? ` (in the ${viewName(undone.view)})` : ''}`);
  };
  app.redo = function () {
    if (!app.canRedo()) return;
    if (app.editor.wiring) app.editor.cancelWiring();
    app.history.index++;
    const redone = app.history.stack[app.history.index];
    applySnapshot(redone.snap);
    afterChange();
    ui.toast(`Redid: ${redone.label}${redone.view !== app.doc.view ? ` (in the ${viewName(redone.view)})` : ''}`);
  };
  function viewName(v) { return v === 'schematic' ? 'circuit diagram' : 'realistic view'; }
  function resetHistory(label) {
    app.history = { stack: [{ snap: snapshot(), label, view: app.doc.view, time: Date.now() }], index: 0 };
  }

  // After any document change: re-solve if the circuit changed electrically,
  // tidy the selection, redraw and autosave.
  function afterChange() {
    ensureViewReady(app.doc.view);
    // A wire in progress cannot outlive the terminal it started from.
    const w = app.editor && app.editor.wiring;
    if (w && !circuit.getComp(app.doc, w.from.c)) app.editor.abortWiring();
    const elecKey = JSON.stringify([app.doc.components, app.doc.wires]);
    if (elecKey !== app.lastElecKey) {
      app.lastElecKey = elecKey;
      app.sim.setDoc(app.doc);
    }
    for (const id of [...app.selection.comps]) if (!circuit.getComp(app.doc, id)) app.selection.comps.delete(id);
    for (const id of [...app.selection.wires]) if (!circuit.getWire(app.doc, id)) app.selection.wires.delete(id);
    app.rev++;
    refreshProblems();
    app.renderAll();
    scheduleSave();
  }

  app.electricalChanged = function (opts = {}) {
    app.lastElecKey = JSON.stringify([app.doc.components, app.doc.wires]);
    app.sim.setDoc(app.doc, opts);
    refreshProblems();
    app.renderer.renderAll();
    ui.updateReadings();
    ui.updateStatus();
  };
  app.operationalChanged = function (opts = {}) {
    app.electricalChanged(opts);
    app.rev++;
    ui.renderInspector(true);
    scheduleSave();
  };
  // Display-only operational props (plot, sound) must not wipe scope traces.
  app.displayPropChanged = function () {
    app.lastElecKey = JSON.stringify([app.doc.components, app.doc.wires]);
    app.rev++;
    app.renderAll();
    scheduleSave();
  };
  // Reset time and stored capacitor/inductor energy to each part's initial values.
  app.resetSimulation = function () {
    const running = app.sim.running;
    app.sim.reset();
    app.paused = false;
    app.sim.setRunning(running || app.needsTime());
    refreshProblems();
    app.rev++;
    app.renderAll();
    app.graph.draw(true);
    ui.announce('Simulation reset');
    ui.toast('Time and stored charge and current reset to their initial values.');
  };
  app.applyInitialEnergy = function (compId) {
    app.sim.applyInitialConditions([compId]);
    app.electricalChanged();
  };

  // ---------- Views ----------

  function ensureViewReady(v) {
    const lay = app.doc.layouts[v];
    const other = v === 'realistic' ? 'schematic' : 'realistic';
    if (lay.ready === true) {
      const missing = app.doc.components.filter((c) => !lay.comps[c.id]).map((c) => c.id);
      if (missing.length && app.doc.layouts[other].ready === true) layout.placeInOtherViews(app.doc, missing, other);
      return false;
    }
    if (lay.ready === 'partial' && app.doc.layouts[other].ready === true) {
      lay.ready = true;
      const missing = app.doc.components.filter((c) => !lay.comps[c.id]).map((c) => c.id);
      if (missing.length) layout.placeInOtherViews(app.doc, missing, other);
    } else if (lay.ready === 'partial' && app.doc.components.every((c) => lay.comps[c.id])) {
      lay.ready = true;
    } else {
      layout.generateLayout(app.doc, v, other);
    }
    for (const w of app.doc.wires) if (!lay.wires[w.id]) lay.wires[w.id] = { pts: [] };
    return true;
  }

  app.setView = function (v) {
    if (v !== 'realistic' && v !== 'schematic') return;
    if (app.editor.wiring) app.editor.cancelWiring();
    const generated = ensureViewReady(v);
    app.doc.view = v;
    if (generated && app.history.stack[app.history.index]) app.history.stack[app.history.index].snap = snapshot();
    app.rev++;
    app.renderAll();
    ui.renderLibrary();
    app.fit();
    if (generated && app.doc.components.length) ui.toast(`A ${viewName(v)} layout was created from your ${viewName(v === 'schematic' ? 'realistic' : 'schematic')}. Arrange it freely; each view keeps its own layout.`);
    ui.announce(`${v === 'schematic' ? 'Circuit diagram' : 'Realistic'} view`);
    scheduleSave();
  };

  app.fit = function () {
    const v = app.doc.view;
    const k = app.cameras[v];
    const svg = document.getElementById('ws-svg');
    const rect = svg.getBoundingClientRect();
    const b = layout.viewBounds(app.doc, v);
    k.fitted = true;
    if (!b || rect.width < 10) { k.z = 1; k.tx = rect.width / 2; k.ty = rect.height / 2; app.renderer.applyCamera(); ui.updateStatus(); return; }
    const padX = 120, padY = 70;
    const bw = b.x2 - b.x + 2 * padX, bh = b.y2 - b.y + 2 * padY;
    // Keep clear of the time chip in the bottom-right corner.
    const avoidTop = CANVAS_TOP, avoidBottom = 54;
    const z = Math.min(2, Math.max(0.25, Math.min(rect.width / bw, (rect.height - avoidTop - avoidBottom) / bh)));
    k.z = z;
    k.tx = rect.width / 2 - ((b.x + b.x2) / 2) * z;
    k.ty = avoidTop + (rect.height - avoidTop - avoidBottom) / 2 - ((b.y + b.y2) / 2) * z;
    app.renderer.applyCamera();
    app.onZoom();
  };
  app.onZoom = function () { ui.updateStatus(); };
  const CANVAS_TOP = 16;

  // ---------- Selection, tools ----------

  app.setSelection = function (comps, wires, revealInspector = true) {
    app.selection.comps = new Set(comps);
    app.selection.wires = new Set(wires);
    app.renderer.renderOverlay();
    ui.renderInspector();
    ui.updateStatus();
    if (revealInspector && (comps.length || wires.length) && window.matchMedia('(max-width: 900px)').matches) document.body.classList.add('show-inspector');
  };
  app.toggleSelection = function (id, kind) {
    const set = kind === 'wire' ? app.selection.wires : app.selection.comps;
    if (set.has(id)) set.delete(id); else set.add(id);
    app.setSelection([...app.selection.comps], [...app.selection.wires]);
  };
  app.setTool = function (t) {
    if (app.editor.wiring) app.editor.cancelWiring();
    app.tool = t;
    app.setPlacing(null);
    document.getElementById("workspace").dataset.activeTool = t;
    ui.setHint();
    ui.updateStatus();
  };
  app.toggleSnap = function () {
    app.snap = !app.snap;
    ui.toast(app.snap ? 'Snap to grid on' : 'Snap to grid off');
    ui.updateStatus();
  };
  app.setPlacing = function (type) {
    app.placing = type;
    document.getElementById('workspace').classList.toggle('is-placing', !!type);
    if (!type) app.renderer.setPreview('');
    else if (app.lastPointerWorld) app.updateGhost(app.lastPointerWorld);
    ui.renderLibrary();
    ui.setHint();
  };
  app.updateGhost = function (p) {
    if (!app.placing) return;
    const v = app.doc.view;
    const type = app.placing;
    const props = registry.defaultProps(type);
    const a = layout.artFor(v, type);
    const pos = app.snap ? { x: layout.snap(p.x), y: layout.snap(p.y) } : p;
    const c = { id: 'ghost', type, label: '', props };
    const art = type === 'junction' && v === 'schematic' ? '<circle r="4.2" class="jdot"/>' : a.draw({ c, p: props, uid: 'ghost', r: 0, f: false, st: {}, logic: { in: {}, out: {} }, display: '', logicStyle: app.doc.settings.logicStyle });
    app.renderer.setPreview(`<g class="ghost" transform="translate(${pos.x} ${pos.y})">${art}</g>`);
  };
  app.setHint = (t) => ui.setHint(t);
  app.toast = (m, a) => ui.toast(m, a);
  app.announce = (m) => ui.announce(m);
  app.modalOpen = () => !!document.querySelector('dialog[open]');

  // ---------- Editing operations ----------

  app.deleteSelection = function () {
    const comps = [...app.selection.comps], wires = [...app.selection.wires];
    if (!comps.length && !wires.length) return;
    if (app.editor.wiring) app.editor.cancelWiring();
    circuit.removeWires(app.doc, wires);
    circuit.removeComponents(app.doc, comps);
    app.selection.comps.clear(); app.selection.wires.clear();
    app.commit(comps.length + wires.length > 1 ? 'Delete selection' : comps.length ? 'Delete component' : 'Delete wire');
    ui.announce('Deleted');
  };
  app.canRotate = c => !!c && c.type !== 'junction' && !(app.doc.view === 'realistic' && registry.get(c.type).fixedBenchOrientation);
  app.canRotateSelection = () => [...app.selection.comps].some(id => app.canRotate(circuit.getComp(app.doc, id)));
  app.rotateSelection = function (dir) {
    const v = app.doc.view;
    let n = 0;
    for (const id of app.selection.comps) {
      const pl = app.doc.layouts[v].comps[id];
      const c = circuit.getComp(app.doc, id);
      if (!pl || !app.canRotate(c)) continue;
      pl.r = layout.normRot(pl.r + dir * 0.5); n++;
    }
    if (n) app.commit('Rotate');
  };
  // Mirror the part's artwork left to right; labels and printed text stay readable.
  app.mirrorSelection = function () {
    const v = app.doc.view;
    let n = 0;
    for (const id of app.selection.comps) {
      const pl = app.doc.layouts[v].comps[id];
      if (!pl || !app.canRotate(circuit.getComp(app.doc, id))) continue;
      layout.mirror(pl); n++;
    }
    if (n) app.commit('Mirror');
  };

  // A fragment is a self-contained copy of components, the wires between them
  // and their placement in each view.
  function fragment() {
    const ids = new Set(app.selection.comps);
    if (!ids.size) return null;
    const comps = app.doc.components.filter((c) => ids.has(c.id)).map((c) => circuit.clone(c));
    const wires = app.doc.wires.filter((w) => ids.has(w.a.c) && ids.has(w.b.c)).map((w) => circuit.clone(w));
    const lay = {};
    for (const v of layout.VIEWS) {
      lay[v] = { comps: {}, wires: {} };
      for (const c of comps) if (app.doc.layouts[v].comps[c.id]) lay[v].comps[c.id] = circuit.clone(app.doc.layouts[v].comps[c.id]);
      for (const w of wires) lay[v].wires[w.id] = { pts: layout.wirePoints(app.doc, v, w).map((p) => p.slice()) };
    }
    return { comps, wires, lay };
  }
  function insertFragment(f, offset) {
    const doc = app.doc;
    const map = new Map();
    const newIds = [];
    for (const c of f.comps) {
      const nc = circuit.addComponent(doc, c.type, { props: circuit.clone(c.props) });
      map.set(c.id, nc.id);
      newIds.push(nc.id);
    }
    const newWires = [];
    for (const w of f.wires) {
      const r = circuit.addWire(doc, { c: map.get(w.a.c), t: w.a.t }, { c: map.get(w.b.c), t: w.b.t }, { color: w.color });
      if (r.wire) newWires.push([w.id, r.wire.id]);
    }
    const active = doc.view;
    for (const v of layout.VIEWS) {
      if (doc.layouts[v].ready !== true) continue;
      const scale = v === active ? 1 : 0.7;
      const ox = layout.snap(offset * scale), oy = layout.snap(offset * scale);
      let all = true;
      for (const c of f.comps) {
        const pl = f.lay[v].comps[c.id];
        if (!pl) { all = false; continue; }
        doc.layouts[v].comps[map.get(c.id)] = { x: pl.x + ox, y: pl.y + oy, r: pl.r, f: pl.f };
      }
      for (const [oldId, newId] of newWires) doc.layouts[v].wires[newId] = { pts: (f.lay[v].wires[oldId] || { pts: [] }).pts.map(([x, y]) => [x + ox, y + oy]) };
      if (!all && v !== active) layout.placeInOtherViews(doc, newIds.filter((id) => !doc.layouts[v].comps[id]), active);
    }
    return newIds;
  }
  app.duplicate = function () {
    const f = fragment();
    if (!f) return;
    const ids = insertFragment(f, 40);
    app.setSelection(ids, []);
    app.commit('Duplicate');
  };
  app.copy = function () {
    const f = fragment();
    if (f) { app.clipboard = f; app.pasteCount = 0; ui.toast(`Copied ${f.comps.length} component${f.comps.length > 1 ? 's' : ''}`); }
  };
  app.paste = function () {
    if (!app.clipboard) return;
    app.pasteCount = (app.pasteCount || 0) + 1;
    const ids = insertFragment(app.clipboard, 40 * app.pasteCount);
    app.setSelection(ids, []);
    app.commit('Paste');
  };

  app.setScopeAutoScale = function (id, enabled) {
    const c = circuit.getComp(app.doc, id);
    if (!c || c.type !== 'scope') return;
    c.props.autoScale = enabled;
    app.lastElecKey = JSON.stringify([app.doc.components, app.doc.wires]);
    app.rev++;
    app.renderAll();
    scheduleSave();
  };

  app.setSetting = function (key, value) {
    app.doc.settings[key] = value;
    if (DISPLAY_KEYS.includes(key)) {
      for (const displayKey of DISPLAY_KEYS) displayPreferences[displayKey] = app.doc.settings[displayKey];
      try {
        localStorage.setItem(DISPLAY_KEY, JSON.stringify(displayPreferences));
      } catch (e) { /* Preferences still work for this session if storage is blocked. */ }
    }
    if (key === 'dt' || key === 'speed') app.sim.setDoc(app.doc);
    app.rev++;
    app.renderAll();
    if (key === 'logicStyle') ui.renderLibrary();
    scheduleSave();
  };

  // ---------- Problems ----------

  // A fuse carrying more than its rated current melts: mark it blown and
  // re-solve with the circuit broken there. Blowing only ever opens circuits,
  // so this settles after at most one pass per fuse.
  function blowFuses() {
    const res = app.sim.result;
    if (!res) return;
    const blown = app.doc.components.filter((c) => {
      const def = registry.get(c.type);
      return def.blows && def.blows(c, solver.reader(res, c));
    });
    if (!blown.length) return;
    for (const c of blown) c.props.blown = true;
    app.lastElecKey = JSON.stringify([app.doc.components, app.doc.wires]);
    app.sim.setDoc(app.doc);
    app.rev++;
    blowFuses();
    const names = blown.map((c) => c.label).join(', ');
    if (ui) {
      ui.toast(`${names} blew: the current went above ${blown.length > 1 ? 'their ratings' : 'its rating'}. Switch off “Blown” in the inspector to fit a new fuse.`);
      ui.announce(`Fuse ${names} blew`);
    }
    if (app.renderer) app.renderAll();
  }

  function refreshProblems() {
    blowFuses();
    app.problemComps = new Set();
    const res = app.sim.result;
    if (res) for (const e of res.errors) for (const id of e.comps) app.problemComps.add(id);
    app.noteComps = new Set(app.meterNotes().map((m) => m.id));
  }

  // True if a source other than the ohmmeter can drive current between the
  // probe points: a supply with a closed load path, or a charged capacitor. An
  // ideal battery behind an open switch does not count — its positive terminal
  // is stranded — open a switch before measuring so the ohmmeter path is alone.
  function ohmmeterUpset(c, entry) {
    const compiled = app.sim.compiled, res = app.sim.result;
    if (!compiled || !entry || entry.net.p !== entry.net.n) return null;
    const parent = new Map();
    const find = (i) => { if (!parent.has(i)) parent.set(i, i); while (parent.get(i) !== i) i = parent.get(i); return i; };
    const join = (a, b) => { a = find(a); b = find(b); if (a !== b) parent.set(a, b); };
    for (const p of compiled.networks[entry.net.p].prims) {
      if (p.owner === c.id) continue;
      if (p.k === 'G' || (p.k === 'V' && (p.short || p.meter))) join(p.a.n, p.b.n);
    }
    const atProbe = (n) => find(n) === find(entry.node.p) || find(n) === find(entry.node.n);
    for (const p of compiled.networks[entry.net.p].prims) {
      if (p.owner === c.id) continue;
      if (p.k === 'I' && (atProbe(p.a.n) || atProbe(p.b.n))) return 'source';
      if (p.k === 'V' && !p.meter && !p.short) {
        const emf = typeof p.v === 'function' ? p.v({ t: app.sim.t, logic: app.sim.logic, inputs: app.sim.inputs }) : p.v;
        // A live source whose terminals are already joined through resistances or
        // closed switches has a path for current without the ohmmeter.
        if (Math.abs(emf) > 1e-9 && find(p.a.n) === find(p.b.n) && atProbe(p.a.n)) return 'source';
      }
      if (p.k === 'C') {
        const h = app.sim.capHist[p.owner];
        if (h && Math.abs(h.v1) > 0.05 && (atProbe(p.a.n) || atProbe(p.b.n))) return 'charge';
      }
    }
    const reading = registry.get('ohmmeter').meter.value(solver.reader(res, c));
    if (Number.isFinite(reading) && reading < 0) return 'negative';
    return null;
  }

  // Meters wired so that they cannot measure anything: a loose lead, or a
  // voltmeter with both leads on the same point (it reads 0 V).
  app.meterNotes = function () {
    const out = [];
    const res = app.sim.result;
    for (const c of app.doc.components) {
      if (c.type !== 'voltmeter' && c.type !== 'ammeter' && c.type !== 'ohmmeter') continue;
      const volt = c.type === 'voltmeter', ohm = c.type === 'ohmmeter';
      const loose = ['p', 'n'].filter((t) => circuit.wiresAt(app.doc, { c: c.id, t }).length === 0).length;
      const e = res && res.comp[c.id];
      let msg = '';
      if (loose === 2) msg = volt || ohm ? `${c.label} is not connected yet. Wire one lead to each side of the component you want to measure.` : `${c.label} is not connected yet. Wire it into the circuit in series, so the current flows through it.`;
      else if (loose === 1) msg = `${c.label} has a lead that is not connected, so it cannot measure anything. Wire both leads into the circuit.`;
      else if (volt && e && e.node && e.node.p === e.node.n) msg = `${c.label} has both leads on the same point, so it reads 0 V. Connect them to either side of a component.`;
      else if (ohm && e) {
        const upset = ohmmeterUpset(c, e);
        if (upset === 'source') msg = `${c.label} is connected to a powered circuit, so its reading is wrong. Disconnect the supply, or open a switch, before measuring resistance.`;
        else if (upset === 'charge') msg = `${c.label} is across a charged capacitor, so its reading is wrong. Discharge the capacitor before measuring resistance.`;
        else if (upset === 'negative') msg = `${c.label} shows a negative reading, which means another source is upsetting the measurement.`;
      }
      if (msg) out.push({ id: c.id, msg });
    }
    return out;
  };
  app.problems = function () {
    const out = [];
    const res = app.sim.result;
    if (res) {
      for (const e of res.errors) out.push({ level: 'error', msg: e.msg, comps: e.comps });
      for (const w of res.warnings) out.push({ level: 'warn', msg: w.msg, comps: w.comps });
      for (const c of app.doc.components) {
        const def = registry.get(c.type);
        if (!def.warnings) continue;
        for (const msg of def.warnings(c, solver.reader(res, c))) out.push({ level: 'warn', msg, comps: [c.id] });
      }
    }
    const step = solver.stepNote(app.sim);
    if (step) out.push({ level: 'warn', msg: step.msg, comps: step.comps });
    for (const m of app.meterNotes()) out.push({ level: 'warn', msg: m.msg, comps: [m.id] });
    const dangling = circuit.danglingJunctions(app.doc);
    if (dangling.length) out.push({ level: 'warn', msg: `${dangling.length} wire end${dangling.length > 1 ? 's are' : ' is'} not connected to anything (marked with an orange ring). Drag the end onto a terminal, or delete the wire.`, comps: dangling });
    return out;
  };

  // ---------- Rendering ----------

  let renderQueued = false;
  app.renderAll = function () {
    if (renderQueued) return;
    renderQueued = true;
    requestAnimationFrame(() => {
      renderQueued = false;
      app.renderer.renderAll();
      ui.renderInspector();
      ui.updateStatus();
      ui.renderLive();
      if (!document.getElementById('graph-panel').hidden) app.graph.draw(true);
    });
  };

  // Opening the graph plots instruments straight away: the selected meters or
  // oscilloscopes, or every one of them unless the user has already chosen some.
  app.graphOpen = () => !document.getElementById('graph-panel').hidden;
  function canPlot(c) {
    const def = registry.get(c.type);
    return !!(def.meter || def.channels);
  }
  function autoPlot() {
    const meters = app.doc.components.filter(canPlot);
    const selected = meters.filter((c) => app.selection.comps.has(c.id));
    const pick = selected.length ? selected : meters.some((c) => c.props.plot) ? [] : meters;
    if (!pick.some((c) => !c.props.plot)) return;
    for (const c of pick) c.props.plot = true;
    app.displayPropChanged();
  }
  app.showGraph = function (on) {
    const panel = document.getElementById('graph-panel');
    const opening = on && panel.hidden;
    panel.hidden = !on;
    if (opening) autoPlot();
    document.body.classList.toggle('graph-open', on);
    ui.updateStatus();
    if (on) requestAnimationFrame(() => app.graph.draw(true));
    else if (app.graph) app.graph.syncExports();
  };

  // ---------- Simulation ----------

  // The solver finds the steady state after every change, so readings are live
  // without the clock. Time only matters for capacitors, inductors, AC supplies, the
  // oscilloscope and a graph of readings against time.
  app.NO_TIME_MSG = 'Readings are live. Nothing here changes over time, so there is nothing to pause.';
  app.needsTime = function () {
    const comp = app.sim.compiled;
    if (comp && (comp.hasCaps || comp.hasInductors || Number.isFinite(comp.acMin))) return true;
    if (app.doc.components.some((c) => c.type === 'scope')) return true;
    return app.graphOpen() && app.doc.components.some((c) => canPlot(c) && c.props.plot);
  };
  app.toggleRun = function () {
    if (!app.paused && !app.needsTime()) { ui.toast(app.NO_TIME_MSG); return; }
    app.paused = !app.paused;
    app.sim.setRunning(!app.paused && app.needsTime());
    lastFrame = performance.now();
    ui.updateStatus();
    app.audio.update();
    ui.announce(app.paused ? 'Simulation paused' : 'Simulation live');
  };

  let lastFrame = performance.now();
  let lastSlow = 0;
  function frame(now) {
    const dt = Math.min(0.1, (now - lastFrame) / 1000);
    lastFrame = now;
    if (app.sim.running) {
      const steps = app.sim.advance(dt, 10, () => performance.now(), (result) => { app.audio.sample(result); app.renderer.sampleFlow(result); });
      if (steps > 0) {
        refreshProblems();
        app.renderer.updateDynamic();
        ui.renderLive();
        if (!document.getElementById('graph-panel').hidden) app.graph.draw();
      }
      if (now - lastSlow > 120) { lastSlow = now; ui.updateReadings(); ui.updateStatus(); }
    }
    app.audio.update();
    app.renderer.updateFlow(app.paused ? 0 : dt);
    requestAnimationFrame(frame);
  }

  // ---------- Saving ----------

  let saveTimer = null;
  function scheduleSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      try {
        localStorage.setItem(AUTOSAVE_KEY, JSON.stringify({ doc: circuit.exportDoc(app.doc), cameras: app.cameras, savedAt: new Date().toISOString() }));
      } catch (e) { /* Storage may be full or blocked; autosave is a convenience. */ }
    }, 400);
  }

  function loadDoc(doc, opts = {}) {
    // Personal display choices take precedence over a circuit's saved settings.
    Object.assign(doc.settings, displayPreferences);
    if (app.editor) app.editor.abortWiring();
    app.doc = doc;
    app.pinned = new Set(); // ids are reused between circuits
    app.selection = { comps: new Set(), wires: new Set() };
    app.lastElecKey = '';
    app.sim = solver.createSim();
    app.sim.setDoc(doc);
    app.lastElecKey = JSON.stringify([doc.components, doc.wires]);
    ensureViewReady(doc.view);
    for (const v of layout.VIEWS) {
      const k = opts.cameras && opts.cameras[v];
      if (k && Number.isFinite(k.z) && Number.isFinite(k.tx) && Number.isFinite(k.ty)) app.cameras[v] = { tx: k.tx, ty: k.ty, z: Math.min(4, Math.max(0.2, k.z)), fitted: true };
      else app.cameras[v] = { tx: 0, ty: 0, z: 1, fitted: false };
    }
    app.paused = false;
    lastFrame = performance.now();
    app.sim.setRunning(app.needsTime());
    resetHistory(opts.label || 'Open');
    app.rev++;
    refreshProblems();
    app.renderer.renderAll();
    ui.renderLibrary();
    ui.renderInspector(true);
    ui.renderLive();
    ui.updateStatus();
    if (!opts.cameras) app.fit();
    app.graph.draw(true);
    scheduleSave();
  }
  app.loadDoc = loadDoc;

  function download(name, type, data) {
    const blob = data instanceof Blob ? data : new Blob([data], { type });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }

  // Circuits are saved as .ppcir files (JSON inside). Where the browser offers a
  // save dialog the user picks the name; otherwise the file is downloaded.
  const FILE_EXT = '.ppcir';
  app.exportFile = async function () {
    const text = JSON.stringify(circuit.exportDoc(app.doc), null, 1);
    const note = ' The live simulation state is not included.';
    if (typeof window.showSaveFilePicker === 'function') {
      try {
        const handle = await window.showSaveFilePicker({ suggestedName: 'circuit' + FILE_EXT, types: [{ description: 'PanPhyCircuits file', accept: { 'application/json': [FILE_EXT] } }] });
        const out = await handle.createWritable();
        await out.write(text);
        await out.close();
        ui.toast(`Saved ${handle.name}.${note}`);
        return;
      } catch (e) {
        if (e && e.name === 'AbortError') return;
      }
    }
    download('circuit' + FILE_EXT, 'application/octet-stream', text);
    ui.toast(`Circuit saved as circuit${FILE_EXT}.${note}`);
  };
  app.importFile = function (file) {
    if (!file) return;
    if (file.size > 5e6) { ui.message('Could not open the file', ['The file is too large to be a PanPhyCircuits document.']); return; }
    const reader = new FileReader();
    reader.onload = () => {
      let result;
      try { result = circuit.importDoc(String(reader.result)); }
      catch (e) { ui.message('Could not open the file', [e.message]); return; }
      const before = snapshot();
      loadDoc(result.doc, { label: 'Open file' });
      app.history.stack.unshift({ snap: before, label: 'Before opening file', view: app.doc.view, time: Date.now() });
      app.history.index = 1;
      if (result.warnings.length) ui.message('Opened with changes', ['Some parts of the file could not be used:'].concat(result.warnings.slice(0, 12), result.warnings.length > 12 ? [`…and ${result.warnings.length - 12} more.`] : []));
      else ui.toast(`Opened ${file.name}.`);
    };
    reader.onerror = () => ui.message('Could not open the file', ['The file could not be read.']);
    reader.readAsText(file);
  };
  app.exportPanPhyMD = function () {
    const svgText = PPC.render.exportSvg(app, document.getElementById('ws-svg'));
    if (!svgText) { ui.toast('There is nothing to export yet.'); return; }
    // Encode UTF-8 before base64 so labels such as Ω and µ survive the export.
    const bytes = new TextEncoder().encode(svgText);
    const uri = 'data:image/svg+xml;base64,' + btoa(Array.from(bytes, (byte) => String.fromCharCode(byte)).join(''));
    const label = app.doc.view === 'schematic' ? 'Circuit diagram' : 'Circuit realistic view';
    const markdown = `![${label}](${uri})`;
    const url = '/tools/panphymd.html#import=' + encodeURIComponent(JSON.stringify({ markdown }));
    const tab = window.open(url, '_blank');
    ui.toast(tab === null ? 'The browser blocked the new tab. Allow pop-ups for this site, then try again.' : 'Circuit image sent to PanPhyMD in a new tab.');
  };
  app.exportImage = function (format) {
    const svgText = PPC.render.exportSvg(app, document.getElementById('ws-svg'));
    if (!svgText) { ui.toast('There is nothing to export yet.'); return; }
    const name = `panphy-circuit-${app.doc.view === 'schematic' ? 'diagram' : 'realistic'}`;
    if (format === 'svg') { download(name + '.svg', 'image/svg+xml', svgText); return; }
    const img = new Image();
    const url = URL.createObjectURL(new Blob([svgText], { type: 'image/svg+xml' }));
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width; canvas.height = img.height;
      canvas.getContext('2d').drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      canvas.toBlob((blob) => { if (blob) download(name + '.png', 'image/png', blob); }, 'image/png');
    };
    img.onerror = () => { URL.revokeObjectURL(url); ui.toast('PNG export failed in this browser; try SVG.'); };
    img.src = url;
  };
  app.newCircuit = async function () {
    if (app.doc.components.length && !(await ui.confirm('Clear the whole circuit?', 'This removes every component and wire from both views. You can undo it.', 'Clear circuit'))) return;
    app.editor.abortWiring();
    app.doc.components = []; app.doc.wires = [];
    for (const v of layout.VIEWS) { app.doc.layouts[v].comps = {}; app.doc.layouts[v].wires = {}; }
    app.doc.layouts.realistic.ready = true;
    app.doc.layouts.schematic.ready = true;
    app.selection.comps.clear(); app.selection.wires.clear();
    app.emptyDismissed = true;
    app.commit('Clear circuit');
    app.paused = false;
    app.sim.reset();
    ui.updateStatus();
    app.graph.draw(true);
  };
  app.tidy = function () {
    if (!app.doc.components.length) return;
    if (app.editor.wiring) app.editor.cancelWiring();
    const v = app.doc.view;
    if (!layout.tidy(app.doc, v)) { app.fit(); ui.toast('Tidied'); return; }
    app.commit('Tidy up');
    app.fit();
    ui.toast('Tidied', { label: 'Undo', run: () => app.undo() });
  };
  // Example circuits are ordinary .ppcir files in panphycircuits/examples/;
  // index.json lists them in menu order with their titles and tips.
  const EXAMPLES_DIR = 'panphycircuits/examples/';
  app.examples = [];
  app.loadExamples = async function () {
    try {
      const res = await fetch(EXAMPLES_DIR + 'index.json');
      if (!res.ok) throw new Error(res.status);
      app.examples = await res.json();
    } catch (e) { app.examples = []; }
    ui.renderExamples(app.examples);
  };
  app.loadExample = async function (i) {
    const ex = app.examples[i];
    document.getElementById('dlg-examples').close();
    if (!ex) { ui.message('Could not open the example', ['The example list could not be loaded. Check your connection and try again.']); return; }
    let result;
    try {
      const res = await fetch(EXAMPLES_DIR + ex.file);
      if (!res.ok) throw new Error(`The example file could not be loaded (${res.status}).`);
      result = circuit.importDoc(await res.text());
    } catch (e) {
      ui.message('Could not open the example', [e instanceof TypeError ? 'The example file could not be loaded. Check your connection and try again.' : e.message]);
      return;
    }
    const before = app.doc.components.length ? snapshot() : null;
    const doc = result.doc;
    // Open in the current view and keep the user's logic symbol style.
    doc.view = app.doc.view;
    doc.settings.logicStyle = app.doc.settings.logicStyle;
    app.showGraph(false);
    loadDoc(doc, { label: `Open example: ${ex.title}` });
    if (before) {
      app.history.stack.unshift({ snap: before, label: 'Before example', view: app.doc.view, time: Date.now() });
      app.history.index = 1;
    }
    ui.toast(ex.tip || ex.summary);
  };

  // ---------- Startup ----------

  let ui;
  app.init = function () {
    const svg = document.getElementById('ws-svg');
    const host = document.getElementById('workspace');
    document.getElementById('shared-defs').innerHTML = PPC.artCommon.defs();
    ui = PPC.ui.createUI(app);
    app.ui = ui;
    app.audio = PPC.audio.createAudio(app);
    app.renderer = PPC.render.createRenderer(app, svg, host);
    app.editor = PPC.editor.createEditor(app, svg, host);
    app.graph = PPC.graph.createGraph(
      app,
      document.getElementById('graph-canvas'),
      document.getElementById('graph-legend'),
      document.getElementById('graph-exports'),
      document.getElementById('graph-x')
    );
    wireControls();
    app.loadExamples();

    let restored = false;
    try {
      const raw = localStorage.getItem(AUTOSAVE_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        const r = circuit.importDoc(data.doc);
        loadDoc(r.doc, { label: 'Restore autosave', cameras: data.cameras });
        restored = true;
        if (r.warnings.length) ui.message('Restored with changes', ['Some parts of the autosaved circuit could not be used:'].concat(r.warnings.slice(0, 12), r.warnings.length > 12 ? [`…and ${r.warnings.length - 12} more.`] : []));
      }
    } catch (e) { restored = false; }
    if (!restored) loadDoc(circuit.createDoc(), { label: 'New circuit' });
    app.setTool('select');
    window.addEventListener('resize', () => { app.renderer.applyCamera(); app.graph.draw(true); ui.renderLive(); });
    window.addEventListener('panphy:theme-change', () => { app.renderAll(); app.graph.draw(true); });
    requestAnimationFrame(frame);
  };

  function wireControls() {
    const $ = (id) => document.getElementById(id);
    $('view-realistic').addEventListener('click', () => app.setView('realistic'));
    $('view-schematic').addEventListener('click', () => app.setView('schematic'));
    $('btn-run').addEventListener('click', app.toggleRun);
    document.querySelectorAll('[data-tool]').forEach((b) => b.addEventListener('click', () => app.setTool(b.dataset.tool)));
    $('btn-rotate').addEventListener('click', () => app.rotateSelection(1));
    $('btn-rotate-ccw').addEventListener('click', () => app.rotateSelection(-1));
    $('btn-mirror').addEventListener('click', () => app.mirrorSelection());
    $('btn-duplicate').addEventListener('click', () => app.duplicate());
    $('btn-delete').addEventListener('click', () => app.deleteSelection());
    $('btn-undo').addEventListener('click', () => app.undo());
    $('btn-redo').addEventListener('click', () => app.redo());
    $('btn-zoom-in').addEventListener('click', () => app.editor.zoomBy(1.25));
    $('btn-zoom-out').addEventListener('click', () => app.editor.zoomBy(0.8));
    $('btn-fit').addEventListener('click', () => app.fit());
    $('btn-snap').addEventListener('click', () => app.toggleSnap());
    $('btn-graph').addEventListener('click', () => app.showGraph($('graph-panel').hidden));
    $('graph-close').addEventListener('click', () => app.showGraph(false));
    $('graph-full').addEventListener('click', () => app.graph.fullGraph());
    $('graph-export-csv').addEventListener('click', () => {
      if (app.graph.exportCSV()) ui.toast('Graph data downloaded as CSV.');
      else ui.toast('Pause with plotted readings on the graph to export.');
    });
    $('graph-export-plot').addEventListener('click', () => {
      if (!app.graph.hasExportData()) { ui.toast('Pause with plotted readings on the graph to export.'); return; }
      const ok = app.graph.exportPanPhyPlot();
      ui.toast(ok ? 'Data sent to PanPhyPlot in a new tab.' : 'The browser blocked the new tab. Allow pop-ups for this site, then try again.');
    });
    $('btn-examples').addEventListener('click', () => $('dlg-examples').showModal());
    $('examples-list').addEventListener('click', (e) => { const b = e.target.closest('[data-example]'); if (b) app.loadExample(Number(b.dataset.example)); });
    $('empty-start').addEventListener('click', () => app.loadExample(0));
    $('empty-clean').addEventListener('click', () => {
      app.emptyDismissed = true;
      ui.updateStatus();
      $('workspace').focus();
      ui.toast('Clean canvas. Drag a component from the library to start building.');
    });
    $('btn-tidy').addEventListener('click', () => app.tidy());
    $('btn-clear').addEventListener('click', () => app.newCircuit());
    const menu = $('menu-file'), fileBtn = $('btn-file');
    const closeMenu = () => { menu.hidden = true; fileBtn.setAttribute('aria-expanded', 'false'); };
    fileBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      menu.hidden = !menu.hidden;
      fileBtn.setAttribute('aria-expanded', String(!menu.hidden));
      if (!menu.hidden) menu.querySelector('button').focus();
    });
    document.addEventListener('click', (e) => { if (!menu.hidden && !menu.contains(e.target)) closeMenu(); });
    menu.addEventListener('keydown', (e) => {
      const items = [...menu.querySelectorAll('button')];
      const i = items.indexOf(document.activeElement);
      if (e.key === 'ArrowDown') { e.preventDefault(); items[(i + 1) % items.length].focus(); }
      if (e.key === 'ArrowUp') { e.preventDefault(); items[(i - 1 + items.length) % items.length].focus(); }
      if (e.key === 'Escape') { closeMenu(); fileBtn.focus(); }
    });
    menu.addEventListener('click', (e) => {
      const b = e.target.closest('[data-file]');
      if (!b) return;
      closeMenu();
      const a = b.dataset.file;
      if (a === 'open') $('file-input').click();
      else if (a === 'save') app.exportFile();
      else if (a === 'svg') app.exportImage('svg');
      else if (a === 'png') app.exportImage('png');
      else if (a === 'panphymd') app.exportPanPhyMD();
    });
    // iPhone and iPad grey out files whose extension they do not recognize, so
    // the picker there is left unfiltered; the contents are validated anyway.
    if (/iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) $('file-input').removeAttribute('accept');
    $('file-input').addEventListener('change', (e) => { app.importFile(e.target.files[0]); e.target.value = ''; });
    $('btn-show-library').addEventListener('click', () => { document.body.classList.toggle('show-library'); document.body.classList.remove('show-inspector'); });
    $('btn-show-inspector').addEventListener('click', () => { document.body.classList.toggle('show-inspector'); document.body.classList.remove('show-library'); });
    document.querySelectorAll('[data-close-panel]').forEach((b) => b.addEventListener('click', () => document.body.classList.remove('show-library', 'show-inspector')));
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', app.init);
  else app.init();
})(typeof globalThis === 'object' ? globalThis : this);
