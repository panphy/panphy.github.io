// PanPhyMech: application state, the run loop, undo, autosave, files and shortcuts.
(function (root) {
  const PPM = root.PPM;
  const S = PPM.scene;
  const G = PPM.graph;

  const SCENE_KEY = 'panphy-mech-scene-v1';
  const PREFS_KEY = 'panphy-mech-prefs-v1';
  const UNDO_LIMIT = 100;
  const STEP_SECONDS = 1 / 60;

  const store = {
    get(key) { try { return localStorage.getItem(key); } catch (e) { return null; } },
    set(key, value) { try { localStorage.setItem(key, value); } catch (e) { /* storage unavailable */ } }
  };

  const $ = (id) => document.getElementById(id);
  const canvas = $('scene-canvas');

  const app = {
    canvas,
    scene: S.createScene(),
    sim: null,
    simStale: false,
    recorder: G.createRecorder(),
    selection: null,
    hover: null,
    running: false,
    speed: 1,
    snap: true,
    display: { vectors: false, trails: true, labels: false, grid: true },
    graphOpen: true,
    graphHeight: null,
    graphGroup: 'energy',
    graphWindow: 'all',
    track: { type: 'system' },
    emptyDismissed: false
  };

  // ---------- Preferences ----------

  (function loadPrefs() {
    let p = null;
    try { p = JSON.parse(store.get(PREFS_KEY) || 'null'); } catch (e) { p = null; }
    if (!p) return;
    if (p.display) Object.keys(app.display).forEach((k) => { if (typeof p.display[k] === 'boolean') app.display[k] = p.display[k]; });
    if (typeof p.snap === 'boolean') app.snap = p.snap;
    if (typeof p.graphOpen === 'boolean') app.graphOpen = p.graphOpen;
    if (Number.isFinite(p.graphHeight)) app.graphHeight = p.graphHeight;
    if ([0.1, 0.25, 0.5, 1, 2].includes(p.speed)) app.speed = p.speed;
  })();
  function savePrefs() {
    store.set(PREFS_KEY, JSON.stringify({ display: app.display, snap: app.snap, graphOpen: app.graphOpen, graphHeight: app.graphHeight, speed: app.speed }));
  }

  // ---------- Helpers used by the renderer and editor ----------

  app.poseOf = (b) => {
    if (app.sim && !app.simStale) {
      const p = app.sim.pose(b.id);
      if (p) return p;
    }
    return b;
  };
  app.velocityOf = (b) => {
    if (!app.sim || app.simStale) return { vx: b.vx, vy: b.vy };
    const r = app.sim.readBody(b.id);
    return r ? { vx: r.vx, vy: r.vy } : null;
  };
  app.isSelected = (type, id) => !!(app.selection && app.selection.type === type && app.selection.id === id);
  app.canEditGeometry = () => !app.running;

  let needsDraw = true;
  let needsGraph = true;
  app.requestDraw = () => { needsDraw = true; };
  app.requestGraph = () => { needsGraph = true; };

  app.setHint = (text) => { $('hint').textContent = text; };
  app.toast = (text, action) => app.ui.toast(text, action);

  // ---------- Building the simulation ----------

  function rebuild() {
    app.sim = PPM.physics.createSim(app.scene);
    app.simStale = false;
    app.recorder.reset(app.scene, app.sim);
    needsDraw = true;
    needsGraph = true;
  }

  // Remove connectors whose objects are gone, and selection or tracking of missing things.
  function tidyReferences() {
    const ids = new Set(app.scene.bodies.map((b) => b.id));
    app.scene.links = app.scene.links.filter((l) => (!l.a || ids.has(l.a)) && (!l.b || ids.has(l.b)) && (l.a || l.b));
    const exists = (sel) => sel && (sel.type === 'body' ? !!S.bodyById(app.scene, sel.id) : sel.type === 'link' ? !!S.linkById(app.scene, sel.id) : true);
    if (app.selection && !exists(app.selection)) app.selection = null;
    if (app.track.type !== 'system') {
      const ok = app.track.type === 'body'
        ? (() => { const b = S.bodyById(app.scene, app.track.id); return b && !b.fixed; })()
        : (() => { const l = S.linkById(app.scene, app.track.id); return l && l.kind === 'spring'; })();
      if (!ok) app.track = { type: 'system' };
    }
    ensureGroup();
  }

  function ensureGroup() {
    const groups = Object.keys(G.groupsFor(app.scene, app.track));
    if (!groups.includes(app.graphGroup)) app.graphGroup = groups[0] || 'energy';
  }

  // ---------- Undo ----------

  const undoStack = [];
  const redoStack = [];
  let lastUndoKey = null;
  let lastUndoTime = 0;
  const snapshot = () => JSON.stringify({ world: app.scene.world, bodies: app.scene.bodies, links: app.scene.links, nextId: app.scene.nextId });

  function pushUndo(key) {
    const now = Date.now();
    if (key && key === lastUndoKey && now - lastUndoTime < 1500) { lastUndoTime = now; return; }
    undoStack.push(snapshot());
    if (undoStack.length > UNDO_LIMIT) undoStack.shift();
    redoStack.length = 0;
    lastUndoKey = key || null;
    lastUndoTime = now;
  }
  app.canUndo = () => undoStack.length > 0;
  app.canRedo = () => redoStack.length > 0;

  // Fields that can change while time runs, without starting again from t = 0.
  const PARAM_KEYS = { body: ['mass', 'friction', 'restitution', 'drag', 'color', 'name'], link: ['k', 'rest', 'damping', 'speed', 'torque', 'motor', 'name', 'length'], world: ['gravity', 'floorFriction', 'gpeZero'] };
  function setupSignature(data) {
    const strip = (o, keys) => { const c = { ...o }; keys.forEach((k) => delete c[k]); return c; };
    return JSON.stringify({ w: strip(data.world, PARAM_KEYS.world), b: data.bodies.map((b) => strip(b, PARAM_KEYS.body)), l: data.links.map((l) => strip(l, PARAM_KEYS.link)) });
  }

  function restore(text) {
    const data = JSON.parse(text);
    const live = app.sim && app.sim.t > 0 && setupSignature(data) === setupSignature(app.scene);
    app.scene.world = data.world;
    app.scene.bodies = data.bodies;
    app.scene.links = data.links;
    app.scene.nextId = data.nextId;
    tidyReferences();
    if (live) {
      // Only parameters changed: keep the run going with the restored values.
      app.sim.syncParams();
    } else {
      app.running = false;
      rebuild();
    }
    afterChange();
  }
  app.undo = function undo() {
    if (!undoStack.length) return;
    redoStack.push(snapshot());
    restore(undoStack.pop());
    lastUndoKey = null;
  };
  app.redo = function redo() {
    if (!redoStack.length) return;
    undoStack.push(snapshot());
    restore(redoStack.pop());
    lastUndoKey = null;
  };

  // ---------- Edits ----------

  let committedNotice = false;
  // Editing the setup after time has run makes the current state the new start.
  function commitLiveIfNeeded() {
    if (!app.sim || app.sim.t <= 0) return false;
    const t = app.sim.t;
    const state = app.sim.capture();
    app.scene.bodies.forEach((b) => {
      const s = state[b.id];
      if (!s || b.fixed) return;
      b.x = s.x; b.y = s.y; b.angle = s.angle;
      b.vx = Math.abs(s.vx) < 1e-9 ? 0 : s.vx;
      b.vy = Math.abs(s.vy) < 1e-9 ? 0 : s.vy;
      b.omega = Math.abs(s.omega) < 1e-9 ? 0 : s.omega;
    });
    rebuild();
    if (!committedNotice) {
      committedNotice = true;
      app.toast(`Edited at t = ${t.toFixed(2)} s: that moment is now the start (t = 0).`, { label: 'Undo', run: () => app.undo() });
    }
    return true;
  }

  function afterChange(opts = {}) {
    // The start card is for an empty first visit; once something is built it stays away.
    if (app.scene.bodies.length) app.emptyDismissed = true;
    if (opts.fromInspector) app.ui.refreshFields(); else app.ui.renderInspector();
    app.ui.renderGraphControls();
    app.ui.syncToolbar();
    needsDraw = true;
    needsGraph = true;
    scheduleSave();
  }

  // A change to the setup: objects, connectors, sizes, positions or starting velocities.
  app.edit = function edit(fn, opts = {}) {
    pushUndo(opts.coalesce);
    if (!opts.fresh) commitLiveIfNeeded();
    fn();
    tidyReferences();
    rebuild();
    afterChange(opts);
  };

  // A change to a parameter that applies at once, even mid-run.
  app.editParam = function editParam(fn, key, namesOnly = false, rerender = false) {
    pushUndo(key);
    fn();
    if (app.sim) {
      app.sim.syncParams();
      if (app.sim.t === 0) app.recorder.reset(app.scene, app.sim);
    }
    if (rerender) app.ui.renderInspector(); else app.ui.refreshFields();
    if (!key || namesOnly) app.ui.renderGraphControls();
    app.ui.updateReadings();
    app.ui.syncToolbar();
    needsDraw = true;
    needsGraph = true;
    scheduleSave();
  };

  // Dragging on the canvas: one undo step and one rebuild per gesture.
  let gestureCommitted = false;
  app.beginGesture = function beginGesture() {
    pushUndo(null);
    gestureCommitted = commitLiveIfNeeded();
    app.simStale = true;
  };
  // A drag that changed nothing (or was refused): drop its undo step and redraw.
  app.cancelGesture = function cancelGesture() {
    if (!gestureCommitted) undoStack.pop();
    tidyReferences();
    rebuild();
    afterChange();
  };
  let fieldsTimer = 0;
  app.gestureChanged = function gestureChanged() {
    needsDraw = true;
    if (!fieldsTimer) fieldsTimer = setTimeout(() => { fieldsTimer = 0; app.ui.refreshFields(); }, 80);
  };
  app.endGesture = function endGesture() {
    tidyReferences();
    rebuild();
    afterChange();
  };

  app.select = function select(sel) {
    const prev = app.selection;
    if (!sel || !prev || sel.type !== prev.type || sel.id !== prev.id) app.ui.closeQuick();
    app.selection = sel;
    if (sel) {
      const b = sel.type === 'body' ? S.bodyById(app.scene, sel.id) : null;
      const l = sel.type === 'link' ? S.linkById(app.scene, sel.id) : null;
      // The graph follows the selected moving object or spring.
      if ((b && !b.fixed) || (l && l.kind === 'spring')) app.trackObject({ type: sel.type, id: sel.id });
    }
    app.ui.renderInspector();
    app.ui.syncToolbar();
    needsDraw = true;
  };

  app.trackObject = function trackObject(track, openGraph) {
    app.track = track;
    ensureGroup();
    app.ui.renderGraphControls();
    if (openGraph && !app.graphOpen) app.setGraphOpen(true);
    if (openGraph) app.ui.renderInspector();
    needsGraph = true;
  };

  app.setGraphGroup = function setGraphGroup(g) {
    app.graphGroup = g;
    app.graph.hidden.clear();
    app.ui.renderGraphControls();
    needsGraph = true;
  };

  app.deleteSelection = function deleteSelection() {
    const sel = app.selection;
    if (!sel) return;
    app.edit(() => {
      if (sel.type === 'body') S.removeBody(app.scene, sel.id); else S.removeLink(app.scene, sel.id);
      app.selection = null;
    });
  };

  app.duplicateSelection = function duplicateSelection() {
    const sel = app.selection;
    if (!sel || sel.type !== 'body') return;
    const src = S.bodyById(app.scene, sel.id);
    if (!src) return;
    app.edit(() => {
      const copy = JSON.parse(JSON.stringify(src));
      copy.id = S.newId(app.scene, 'b');
      const base = src.name.replace(/\s+\d+$/, '');
      copy.name = S.nextName(app.scene, base);
      const e = S.extent(src);
      copy.x = src.x + Math.max(0.3, e.x * 2 + 0.1);
      app.scene.bodies.push(copy);
      app.selection = { type: 'body', id: copy.id };
    });
  };

  app.rotateSelection = function rotateSelection(dir) {
    const sel = app.selection;
    if (!sel || sel.type !== 'body' || app.running) return;
    const b = S.bodyById(app.scene, sel.id);
    if (!b) return;
    app.edit(() => {
      const step = Math.PI / 12;
      const target = Math.round((b.angle + dir * step) / step) * step;
      app.ui.rotateBodyTo(b, target);
    }, { coalesce: 'rotate' });
  };

  app.nudge = function nudge(dx, dy) {
    const sel = app.selection;
    if (!sel || sel.type !== 'body' || app.running) return;
    const b = S.bodyById(app.scene, sel.id);
    if (!b) return;
    app.edit(() => app.ui.moveBodyTo(b, b.x + dx, b.y + dy), { coalesce: 'nudge' });
  };

  app.clearScene = function clearScene() {
    if (!app.scene.bodies.length && !app.scene.links.length) return;
    app.emptyDismissed = true;
    app.edit(() => {
      app.scene.bodies = [];
      app.scene.links = [];
      app.selection = null;
    }, { fresh: true });
    app.running = false;
    // A blank canvas starts from the default view, as on a first visit.
    const view = { ...app.scene.camera };
    app.fit();
    app.ui.syncToolbar();
    app.toast('Scene cleared.', { label: 'Undo', run: () => { app.undo(); Object.assign(app.scene.camera, view); app.cameraChanged(); } });
  };

  function replaceScene(next, track, view) {
    app.running = false;
    app.edit(() => {
      app.scene.world = next.world;
      app.scene.bodies = next.bodies;
      app.scene.links = next.links;
      app.scene.nextId = next.nextId;
      app.selection = null;
      if (track) app.track = track;
    }, { fresh: true });
    app.fit(view);
    app.ui.syncToolbar();
  }

  app.openExample = function openExample(id) {
    const ex = PPM.examples.list.find((e) => e.id === id);
    if (!ex) return;
    const next = ex.build();
    let track = { type: 'system' };
    const body = ex.track && ex.track.name ? next.bodies.find((b) => b.name === ex.track.name) : null;
    if (body) track = { type: 'body', id: body.id };
    replaceScene(next, track, ex.view);
    if (ex.track && ex.track.group) app.setGraphGroup(ex.track.group);
    ensureGroup();
    app.ui.renderGraphControls();
    app.setHint(`${ex.title}: press Play.`);
  };

  // ---------- Running ----------

  app.togglePlay = function togglePlay() {
    if (!app.sim) rebuild();
    app.running = !app.running;
    lastFrame = performance.now();
    behindFrames = 0;
    app.editor.cancel();
    app.ui.syncToolbar();
    app.ui.renderInspector();
    needsDraw = true;
  };

  app.stepOnce = function stepOnce() {
    if (app.running || !app.sim) return;
    app.sim.advance(STEP_SECONDS, (s) => app.recorder.sample(s));
    app.ui.syncToolbar();
    app.ui.updateReadings();
    updateTime();
    needsDraw = true;
    needsGraph = true;
  };

  app.reset = function reset() {
    app.running = false;
    rebuild();
    tidyReferences();
    app.ui.syncToolbar();
    app.ui.renderInspector();
    updateTime();
  };

  app.setSpeed = function setSpeed(v) {
    app.speed = v;
    savePrefs();
  };

  // ---------- View ----------

  app.cameraChanged = function cameraChanged() {
    needsDraw = true;
    $('zoom-readout').textContent = `${Math.round(app.scene.camera.scale)} px/m`;
    scheduleSave();
  };

  app.zoomBy = function zoomBy(f) {
    app.editor.zoomAt(app.renderer.w / 2, app.renderer.h / 2, f);
  };

  // Frame the scene (or a given box), with the floor near the bottom of the view.
  app.fit = function fit(view) {
    const r = app.renderer;
    const fitted = view ? { box: view, far: [] } : S.fitBox(app.scene, app.poseOf);
    const bb = fitted.box || { minX: -4, maxX: 4, minY: 0, maxY: 4 };
    const minSpan = 3;
    const w = Math.max(bb.maxX - bb.minX, minSpan);
    const h = Math.max(bb.maxY - bb.minY, minSpan * 0.6);
    const margin = 1.25;
    const cam = app.scene.camera;
    cam.scale = S.clamp(Math.min(r.w / (w * margin), r.h / (h * margin)), 4, 600);
    cam.cx = (bb.minX + bb.maxX) / 2;
    const viewH = r.h / cam.scale;
    // With the floor in view, keep it near the bottom edge rather than mid-screen.
    cam.cy = app.scene.world.floor && bb.minY >= -1e-9 && bb.minY <= 1e-9 ? viewH * 0.4 : (bb.minY + bb.maxY) / 2;
    app.cameraChanged();
    if (fitted.far.length) {
      const f = fitted.far;
      const where = (i) => (Number.isFinite(i.x) ? ` (x = ${app.ui.fmt(i.x, 1)} m, y = ${app.ui.fmt(i.y, 1)} m)` : '');
      const names = f.slice(0, 2).map((i) => `${i.name}${where(i)}`).join(' and ');
      app.toast(`${names}${f.length > 2 ? ` and ${f.length - 2} more` : ''} ${f.length === 1 ? 'is' : 'are'} far from the rest of the scene and left out of the view. Reset, undo or delete to bring ${f.length === 1 ? 'it' : 'them'} back.`);
    }
  };

  app.setSnap = function setSnap(v) {
    app.snap = v;
    app.ui.syncToolbar();
    savePrefs();
  };

  app.setDisplay = function setDisplay(key, v) {
    app.display[key] = v;
    savePrefs();
    needsDraw = true;
  };

  app.setGraphOpen = function setGraphOpen(open) {
    app.graphOpen = open;
    $('graph-panel').hidden = !open;
    app.ui.syncToolbar();
    savePrefs();
    resizeAll();
  };

  // ---------- Files and exports ----------

  let saveTimer = 0;
  function scheduleSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => store.set(SCENE_KEY, S.serialize(app.scene)), 400);
  }

  function download(name, blob) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  const fileStem = (text) => (String(text).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'data');

  app.saveFile = function saveFile() {
    download('panphymech-scene.ppmech', new Blob([JSON.stringify(app.scene, null, 1)], { type: 'application/json' }));
  };

  app.openText = function openText(text) {
    let result;
    try {
      result = S.parse(text);
    } catch (e) {
      app.toast('That file is not a PanPhyMech scene.');
      return;
    }
    replaceScene(result.scene, { type: 'system' });
    if (result.skipped) app.toast(`Opened, but ${result.skipped} unsupported item${result.skipped === 1 ? ' was' : 's were'} skipped.`);
  };

  app.exportPng = function exportPng() {
    canvas.toBlob((blob) => { if (blob) download('panphymech-scene.png', blob); }, 'image/png');
  };

  app.exportCsv = function exportCsv() {
    if (app.recorder.t.length < 2) return;
    download(`panphymech-${fileStem(G.trackName(app.scene, app.track))}.csv`, new Blob([G.toCSV(app)], { type: 'text/csv;charset=utf-8;' }));
  };

  app.exportPlot = function exportPlot() {
    if (app.recorder.t.length < 2) return;
    const win = window.open(G.panPhyPlotUrl(app), '_blank');
    if (!win) app.toast('Your browser blocked the new tab. Allow pop-ups for this site, or export a CSV instead.');
  };

  // ---------- Loop ----------

  let lastFrame = performance.now();
  let lastReadings = 0;
  let lastGraph = 0;
  let behindFrames = 0;

  function updateTime() {
    const t = app.sim ? app.sim.t : 0;
    $('time-readout').innerHTML = `<span class="t-prefix">t = </span>${t < 1000 ? t.toFixed(2) : t.toFixed(0)} s`;
  }

  function frame(now) {
    requestAnimationFrame(frame);
    const dtReal = Math.min((now - lastFrame) / 1000, 0.05);
    lastFrame = now;
    if (app.running && app.sim) {
      const t0 = performance.now();
      const budget = Math.max(200, Math.ceil((dtReal * app.speed) / app.sim.h) + 4);
      const ok = app.sim.advance(dtReal * app.speed, (s) => app.recorder.sample(s), Math.min(budget, 4000));
      const busy = performance.now() - t0;
      behindFrames = !ok || busy > 28 ? Math.min(behindFrames + 1, 60) : Math.max(behindFrames - 1, 0);
      const note = $('run-note');
      const showNote = behindFrames > 20;
      if (note.hidden === showNote) {
        note.hidden = !showNote;
        note.textContent = 'Running slower than real time';
      }
      needsDraw = true;
      updateTime();
      if (now - lastReadings > 100) { lastReadings = now; app.ui.updateReadings(); }
      if (now - lastGraph > 66) { lastGraph = now; needsGraph = true; }
    } else if (!$('run-note').hidden) {
      $('run-note').hidden = true;
    }
    if (needsDraw) { needsDraw = false; app.renderer.draw(); }
    if (needsGraph && app.graphOpen) { needsGraph = false; app.graph.draw(); app.ui.updateLegend(); }
  }

  // ---------- Layout ----------

  function resizeAll() {
    app.renderer.resize();
    needsDraw = true;
    needsGraph = true;
  }

  function setGraphHeight(px) {
    const stage = document.querySelector('.stage').getBoundingClientRect().height;
    const h = Math.round(S.clamp(px, 140, Math.max(160, stage * 0.65)));
    app.graphHeight = h;
    $('graph-panel').style.flexBasis = h + 'px';
    resizeAll();
  }

  (function graphResizer() {
    const handle = $('graph-resize');
    let drag = null;
    handle.addEventListener('pointerdown', (e) => {
      drag = { y: e.clientY, h: $('graph-panel').getBoundingClientRect().height };
      handle.setPointerCapture(e.pointerId);
      handle.classList.add('is-dragging');
    });
    handle.addEventListener('pointermove', (e) => { if (drag) setGraphHeight(drag.h - (e.clientY - drag.y)); });
    const end = () => { if (drag) { drag = null; handle.classList.remove('is-dragging'); savePrefs(); } };
    handle.addEventListener('pointerup', end);
    handle.addEventListener('pointercancel', end);
    handle.addEventListener('keydown', (e) => {
      const cur = $('graph-panel').getBoundingClientRect().height;
      if (e.key === 'ArrowUp') { setGraphHeight(cur + 20); savePrefs(); e.preventDefault(); }
      if (e.key === 'ArrowDown') { setGraphHeight(cur - 20); savePrefs(); e.preventDefault(); }
    });
  })();

  // ---------- Keyboard ----------

  document.addEventListener('keydown', (e) => {
    const tag = e.target && e.target.tagName;
    if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA' || (e.target && e.target.isContentEditable)) return;
    if (document.querySelector('dialog[open]')) return;
    const mod = e.ctrlKey || e.metaKey;
    const k = e.key;
    if (mod && (k === 'z' || k === 'Z')) { e.preventDefault(); if (e.shiftKey) app.redo(); else app.undo(); return; }
    if (mod && (k === 'y' || k === 'Y')) { e.preventDefault(); app.redo(); return; }
    if (mod && (k === 'd' || k === 'D')) { e.preventDefault(); app.duplicateSelection(); return; }
    if (mod) return;
    if (k === ' ') {
      if (tag === 'BUTTON') return;
      e.preventDefault();
      app.togglePlay();
      return;
    }
    if (k === 'Escape') { app.ui.closeMenus(); if (!app.editor.cancel()) app.select(null); return; }
    if (k === 'Delete' || k === 'Backspace') { e.preventDefault(); app.deleteSelection(); return; }
    if (k === '.') { app.stepOnce(); return; }
    if (k === 'v' || k === 'V') { app.editor.arm(null); app.editor.setTool('select'); return; }
    if (k === 'h' || k === 'H') { app.editor.setTool('pan'); return; }
    if (k === 'g' || k === 'G') { app.setSnap(!app.snap); return; }
    if (k === 'r' || k === 'R') { app.rotateSelection(e.shiftKey ? 1 : -1); return; }
    if (k === '0') { app.fit(); return; }
    if (k === '+' || k === '=') { app.zoomBy(1.25); return; }
    if (k === '-' || k === '_') { app.zoomBy(0.8); return; }
    const arrows = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1] };
    if (arrows[k] && app.selection && app.selection.type === 'body' && document.activeElement === canvas) {
      e.preventDefault();
      const step = e.shiftKey ? 0.1 : 0.01;
      app.nudge(arrows[k][0] * step, arrows[k][1] * step);
    }
  });

  // ---------- Start ----------

  app.renderer = PPM.render.createRenderer(app, canvas);
  app.editor = PPM.editor.createEditor(app, canvas);
  app.graph = G.createGraph(app, $('graph-canvas'));
  app.ui = PPM.ui.createUI(app);

  canvas.addEventListener('pointermove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const w = app.renderer.toWorld(e.clientX - rect.left, e.clientY - rect.top);
    $('cursor-readout').textContent = `x ${app.ui.fmt(w.x, 2)}  y ${app.ui.fmt(w.y, 2)} m`;
  });
  canvas.addEventListener('pointerleave', () => { $('cursor-readout').textContent = ''; });

  window.addEventListener('panphy:theme-change', () => {
    app.renderer.readColors();
    app.ui.renderLegend();
    needsDraw = true;
    needsGraph = true;
  });
  new ResizeObserver(resizeAll).observe($('workspace'));
  new ResizeObserver(() => { needsGraph = true; }).observe($('graph-canvas'));
  window.addEventListener('pagehide', () => store.set(SCENE_KEY, S.serialize(app.scene)));

  let restored = false;
  const saved = store.get(SCENE_KEY);
  if (saved) {
    try {
      const { scene } = S.parse(saved);
      app.scene = scene;
      restored = scene.bodies.length > 0;
    } catch (e) { /* start empty */ }
  }
  if (app.graphHeight) $('graph-panel').style.flexBasis = app.graphHeight + 'px';
  $('graph-panel').hidden = !app.graphOpen;
  app.renderer.resize();
  app.renderer.readColors();
  rebuild();
  tidyReferences();
  app.ui.renderInspector();
  app.ui.renderGraphControls();
  app.ui.syncToolbar();
  app.editor.setTool('select');
  app.cameraChanged();
  updateTime();
  if (!restored) app.fit();
  requestAnimationFrame((t) => { lastFrame = t; frame(t); });

  PPM.app = app;
})(window);
