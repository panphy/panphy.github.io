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
    extra: [], // further selected objects, in the order they were picked
    multiMode: false,
    hover: null,
    running: false,
    speed: 1,
    snap: true,
    display: { vectors: false, forces: false, trails: true, labels: false, grid: true },
    // The graph starts closed on every visit; Graph opens it.
    graphOpen: false,
    graphHeight: null,
    graphGroup: 'energy',
    graphRange: null,
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
    if (Number.isFinite(p.graphHeight)) app.graphHeight = p.graphHeight;
    if ([0.1, 0.25, 0.5, 1, 2].includes(p.speed)) app.speed = p.speed;
  })();
  function savePrefs() {
    store.set(PREFS_KEY, JSON.stringify({ display: app.display, snap: app.snap, graphHeight: app.graphHeight, speed: app.speed }));
  }

  // ---------- Helpers used by the renderer and editor ----------

  app.poseOf = (b) => {
    if (app.sim && !app.simStale) {
      const p = app.sim.pose(b.id);
      if (p) return p;
    }
    return b;
  };
  // A joined pulley's winding while time runs, so drawings follow the simulated rope.
  app.poseOf.pulley = (id) => (app.sim && !app.simStale && app.sim.pulleyState ? app.sim.pulleyState(id) : null);
  app.velocityOf = (b) => {
    if (!app.sim || app.simStale) return { vx: b.vx, vy: b.vy };
    const r = app.sim.readBody(b.id);
    return r ? { vx: r.vx, vy: r.vy } : null;
  };
  app.isSelected = (type, id) => !!(app.selection && app.selection.type === type && app.selection.id === id) || (type === 'body' && app.extra.includes(id));
  // Selected objects in the order they were picked (the first is the primary selection).
  app.selectedBodies = () => (app.selection && app.selection.type === 'body' ? [app.selection.id] : []).concat(app.extra);
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
    app.graphRange = null;
    app.recorder.reset(app.scene, app.sim);
    needsDraw = true;
    needsGraph = true;
  }

  // Remove connectors whose objects are gone (a joined partner keeps a background end), and
  // selection or tracking of missing things.
  function tidyReferences() {
    S.tidyLinks(app.scene);
    const exists = (sel) => sel && (sel.type === 'body' ? !!S.bodyById(app.scene, sel.id) : sel.type === 'link' ? !!S.linkById(app.scene, sel.id) : true);
    if (app.selection && !exists(app.selection)) app.selection = null;
    app.extra = app.extra.filter((id) => S.bodyById(app.scene, id) && app.selection && app.selection.type === 'body');
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
  const PARAM_KEYS = { body: ['mass', 'friction', 'restitution', 'drag', 'dragModel', 'linearDragSource', 'linearDrag', 'viscosity', 'color', 'name'], link: ['k', 'rest', 'damping', 'speed', 'torque', 'motor', 'name', 'length'], world: ['gravity', 'floorFriction', 'gpeZero', 'viscosity', 'dragModel', 'linearDragSource', 'linearDrag', 'drag', 'accuracy'] };
  function setupSignature(data) {
    const strip = (o, keys) => { const c = { ...o }; keys.forEach((k) => delete c[k]); return c; };
    // A solid rod or rope is rebuilt from bodies, so its length and mass belong to the setup.
    const linkKeys = (l) => (l.solid ? PARAM_KEYS.link.filter((k) => k !== 'length') : PARAM_KEYS.link);
    // A joined end's stored point only records where the join was; it is not part of the setup.
    const bodyIds = new Set(data.bodies.map((b) => b.id));
    const link = (l) => { const c = strip(l, linkKeys(l)); ['a', 'b'].forEach((e) => { if (l[e] && !bodyIds.has(l[e])) delete c['l' + e]; }); return c; };
    return JSON.stringify({ w: strip(data.world, PARAM_KEYS.world), b: data.bodies.map((b) => strip(b, PARAM_KEYS.body)), l: data.links.map(link) });
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
      if (app.sim.t === 0) { app.graphRange = null; app.recorder.reset(app.scene, app.sim); }
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
    app.extra = [];
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
    const ids = app.selectedBodies();
    app.edit(() => {
      if (sel.type === 'body') ids.forEach((id) => S.removeBody(app.scene, id)); else S.removeLink(app.scene, sel.id);
      app.selection = null;
      app.extra = [];
    });
  };

  // Add an object to the selection, or take it out again.
  app.toggleInSelection = function toggleInSelection(id) {
    const sel = app.selection;
    if (!sel || sel.type !== 'body') { app.select({ type: 'body', id }); return; }
    if (sel.id === id) {
      if (app.extra.length) { app.selection = { type: 'body', id: app.extra.shift() }; } else { app.select(null); return; }
    } else if (app.extra.includes(id)) {
      app.extra = app.extra.filter((x) => x !== id);
    } else {
      app.extra.push(id);
    }
    app.ui.closeQuick();
    app.ui.renderInspector();
    app.ui.syncToolbar();
    needsDraw = true;
  };

  app.setMultiMode = function setMultiMode(on) {
    app.multiMode = on;
    app.ui.syncToolbar();
    app.setHint(on ? 'Select several: click objects to add or remove them. Then merge, subtract, move or delete them together.' : app.editor.HINTS.select);
  };

  // ---------- Merge and subtract ----------

  // Move connector ends from old objects onto new ones, keeping their world positions.
  // pick(worldPoint, oldId) gives the new object for that end, or null to drop the connector.
  function remapLinks(oldBodies, pick) {
    const old = new Map(oldBodies.map((b) => [b.id, b]));
    const keep = [];
    app.scene.links.forEach((l) => {
      let ok = true;
      ['a', 'b'].forEach((end) => {
        const id = l[end];
        if (!id || !old.has(id)) return;
        const w = S.toWorld(old.get(id), l['l' + end]);
        const nb = pick(w, id);
        if (!nb) { ok = false; return; }
        l[end] = nb.id;
        l['l' + end] = S.toLocal(nb, w);
      });
      if (ok && l.a && l.a === l.b) ok = false; // both ends now on one object
      if (ok) keep.push(l);
    });
    app.scene.links = keep;
  }

  const SHAPE_FIELDS = ['w', 'h', 'r', 'sides', 'flip', 'paths'];
  function asCustom(b, placed) {
    SHAPE_FIELDS.forEach((k) => delete b[k]);
    return Object.assign(b, { kind: 'custom', x: placed.x, y: placed.y, angle: 0, paths: placed.paths });
  }

  app.canCombine = () => app.selectedBodies().length >= 2 && !app.running;

  app.mergeSelection = function mergeSelection() {
    if (!app.canCombine()) return;
    const ids = app.selectedBodies();
    const check = PPM.shapes.placeOutline(PPM.shapes.union(ids.map((id) => S.bodyById(app.scene, id)), app.poseOf));
    if (!check) { app.toast('These objects could not be merged.'); return; }
    let name = '';
    let apart = false;
    app.edit(() => {
      const bodies = ids.map((id) => S.bodyById(app.scene, id));
      const olds = bodies.map((b) => JSON.parse(JSON.stringify(b)));
      const multi = PPM.shapes.union(bodies);
      apart = multi.length > 1;
      const placed = PPM.shapes.placeOutline(multi);
      const primary = bodies[0];
      const fixed = bodies.some((b) => b.fixed);
      const mass = bodies.reduce((s, b) => s + b.mass, 0);
      asCustom(primary, placed);
      primary.mass = mass;
      primary.fixed = fixed;
      if (fixed) primary.color = 'slate';
      primary.name = name = S.nextName({ bodies: app.scene.bodies.filter((b) => !ids.includes(b.id)), links: app.scene.links }, 'Shape');
      app.scene.bodies = app.scene.bodies.filter((b) => b === primary || !ids.includes(b.id));
      remapLinks(olds, () => primary);
      app.selection = { type: 'body', id: primary.id };
      app.extra = [];
    });
    app.toast(apart ? `Merged into ${name}. The parts do not touch, but they now move as one rigid object.` : `Merged ${ids.length} objects into ${name}.`);
  };

  app.subtractSelection = function subtractSelection() {
    if (!app.canCombine()) return;
    const ids = app.selectedBodies();
    const cutterId = ids[ids.length - 1];
    const baseIds = ids.slice(0, -1);
    const cutterNow = S.bodyById(app.scene, cutterId);
    const touches = baseIds.some((id) => {
      const b = S.bodyById(app.scene, id);
      return Math.abs(PPM.shapes.outlineArea(PPM.shapes.difference(b, cutterNow, app.poseOf)) - S.area(b)) > 1e-6 * Math.max(1, S.area(b));
    });
    if (!touches) { app.toast(`${cutterNow.name} (selected last) does not overlap the other objects, so there is nothing to cut.`); return; }
    const cutName = cutterNow.name;
    let removed = 0;
    let pieces = 0;
    app.edit(() => {
      const cutter = S.bodyById(app.scene, cutterId);
      baseIds.forEach((id) => {
        const base = S.bodyById(app.scene, id);
        const before = S.area(base);
        const multi = PPM.shapes.difference(base, cutter);
        const after = PPM.shapes.outlineArea(multi);
        if (Math.abs(after - before) <= 1e-6 * Math.max(1, before)) return;
        const old = JSON.parse(JSON.stringify(base));
        const parts = multi.map((poly) => PPM.shapes.placeOutline([poly])).filter(Boolean);
        if (!parts.length) { S.removeBody(app.scene, id); removed++; return; }
        // The largest part keeps the object (its name, id and connectors); others become new objects.
        parts.sort((p, q) => q.area - p.area);
        const total = parts.reduce((s, p) => s + p.area, 0);
        const made = [];
        parts.forEach((p, i) => {
          let b = base;
          if (i > 0) {
            b = JSON.parse(JSON.stringify(old));
            b.id = S.newId(app.scene, 'b');
            b.name = S.nextName(app.scene, old.name.replace(/\s+\d+$/, ''));
            app.scene.bodies.splice(app.scene.bodies.indexOf(base) + i, 0, b);
          }
          asCustom(b, p);
          b.mass = old.mass * (p.area / total);
          made.push(b);
        });
        pieces += made.length;
        // Each connector end goes to the part under it, or the nearest part.
        remapLinks([old], (w) => made.find((b) => S.containsPoint(b, w, 0.02)) || made.reduce((best, b) => (Math.hypot(b.x - w.x, b.y - w.y) < Math.hypot(best.x - w.x, best.y - w.y) ? b : best), made[0]));
      });
      S.removeBody(app.scene, cutterId);
      app.selection = null;
      app.extra = [];
    });
    app.toast(`Cut ${cutName} out${removed ? `; ${removed} object${removed === 1 ? ' was' : 's were'} cut away completely` : ''}${pieces > baseIds.length ? '; some objects split into separate pieces' : ''}.`);
  };

  let clipboard = null;
  let pasteCount = 0;
  function insertCopy(fragment, offset) {
    app.edit(() => {
      const added = S.pasteFragment(app.scene, fragment, offset);
      app.selection = added.bodies.length ? { type: 'body', id: added.bodies[0] }
        : added.links.length ? { type: 'link', id: added.links[0] } : null;
      app.extra = added.bodies.slice(1);
    });
  }
  function copyOffset(fragment) {
    if (!fragment.bodies.length) return 0;
    const box = S.bounds({ bodies: fragment.bodies, links: [] });
    return Math.max(0.3, Math.min(box.maxX - box.minX, box.maxY - box.minY) + 0.1);
  }
  app.copySelection = function copySelection() {
    const fragment = S.copyFragment(app.scene, app.selection, app.extra, app.poseOf);
    if (!fragment) return;
    clipboard = fragment;
    pasteCount = 0;
    app.toast('Selection copied. Press Ctrl+V or Command+V to paste.');
  };
  app.pasteSelection = function pasteSelection() {
    if (clipboard) insertCopy(clipboard, copyOffset(clipboard) * ++pasteCount);
  };
  app.duplicateSelection = function duplicateSelection() {
    const fragment = S.copyFragment(app.scene, app.selection, app.extra, app.poseOf);
    if (fragment) insertCopy(fragment, copyOffset(fragment));
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

  // Mirror the selected object left to right about its own center, with anything
  // hinged or glued to it, as rotation carries the same group.
  app.mirrorSelection = function mirrorSelection() {
    const sel = app.selection;
    if (!sel || sel.type !== 'body' || app.running || app.extra.length) return;
    const b = S.bodyById(app.scene, sel.id);
    if (!b) return;
    app.edit(() => S.mirrorBodies(app.scene, S.rigidGroup(app.scene, b.id), b.x));
  };

  app.nudge = function nudge(dx, dy) {
    const sel = app.selection;
    if (!sel || sel.type !== 'body' || app.running) return;
    const b = S.bodyById(app.scene, sel.id);
    if (!b) return;
    app.edit(() => app.ui.moveBodyTo(b, b.x + dx, b.y + dy), { coalesce: 'nudge' });
  };

  app.clearScene = async function clearScene() {
    if (!app.scene.bodies.length && !app.scene.links.length) return;
    if (!(await app.ui.confirm('Clear the whole scene?', 'This removes every object and connector. You can undo it.', 'Clear scene'))) return;
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

  // Example scenes are ordinary .ppmech files in panphymech/examples/; index.json lists
  // them in menu order with their text, the object to graph and the view to frame.
  const EXAMPLES_DIR = 'panphymech/examples/';
  app.examples = null;
  app.loadExamples = async function loadExamples() {
    try {
      const res = await fetch(EXAMPLES_DIR + 'index.json');
      if (!res.ok) throw new Error(res.status);
      app.examples = await res.json();
    } catch (e) {
      app.examples = [];
    }
    app.ui.buildExamples();
  };

  app.openExample = async function openExample(i) {
    const ex = app.examples && app.examples[i];
    if (!ex) return;
    let next;
    try {
      const res = await fetch(EXAMPLES_DIR + ex.file);
      if (!res.ok) throw new Error(res.status);
      next = S.parse(await res.text()).scene;
    } catch (e) {
      app.toast('That example could not be loaded. Check your connection and try again.');
      return;
    }
    let track = { type: 'system' };
    const body = ex.track && ex.track.name ? next.bodies.find((b) => b.name === ex.track.name) : null;
    if (body) track = { type: 'body', id: body.id };
    replaceScene(next, track, ex.view);
    if (ex.track && ex.track.group) app.setGraphGroup(ex.track.group);
    // Choosing the group shows every series; an example may hide some to keep its graph clear.
    ((ex.track && ex.track.hide) || []).forEach((q) => app.graph.hidden.add(q));
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
    if (app.running) app.select(null);
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
    let bb = fitted.box || { minX: -4, maxX: 4, minY: 0, maxY: 4 };
    const minSpan = 3;
    const margin = 1.25;
    const scaleFor = (box) => S.clamp(Math.min(r.w / (Math.max(box.maxX - box.minX, minSpan) * margin), r.h / (Math.max(box.maxY - box.minY, minSpan * 0.6) * margin)), 4, 600);
    const cam = app.scene.camera;
    // Force arrows are drawn at a length in pixels, so their size in meters depends on the
    // scale being chosen: widen the box to hold them and their labels, and settle in a few passes.
    if (!view && app.display.forces) {
      const objects = bb;
      for (let pass = 0; pass < 3; pass++) {
        const scale = scaleFor(bb);
        const pad = 22 / scale;
        bb = { ...objects };
        r.forceArrows(scale).forEach((a) => {
          bb.minX = Math.min(bb.minX, a.to.x - pad); bb.maxX = Math.max(bb.maxX, a.to.x + pad);
          bb.minY = Math.min(bb.minY, a.to.y - pad); bb.maxY = Math.max(bb.maxY, a.to.y + pad);
        });
      }
    }
    cam.scale = scaleFor(bb);
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

  app.saveFile = async function saveFile() {
    const text = JSON.stringify(app.scene, null, 1);
    const suggestedName = 'panphymech-scene.ppmech';
    if (typeof window.showSaveFilePicker === 'function') {
      try {
        const handle = await window.showSaveFilePicker({ suggestedName, types: [{ description: 'PanPhyMech scene', accept: { 'application/json': ['.ppmech'] } }] });
        const out = await handle.createWritable();
        await out.write(text);
        await out.close();
        app.toast(`Saved ${handle.name}.`);
        return;
      } catch (e) {
        if (e && e.name === 'AbortError') return;
      }
    }
    // Safari and Firefox do not offer the native picker; still let the user name the file.
    const name = window.prompt('Save scene as:', suggestedName);
    if (name === null) return;
    let filename = name.trim().replace(/[\\/:*?"<>|\x00-\x1f]/g, '-');
    if (!filename) return;
    if (!/\.ppmech$/i.test(filename)) filename += '.ppmech';
    download(filename, new Blob([text], { type: 'application/json' }));
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

  app.exportSvg = function exportSvg() {
    download('panphymech-scene.svg', new Blob([app.renderer.exportSvg()], { type: 'image/svg+xml' }));
  };

  app.exportPanPhyMD = function exportPanPhyMD() {
    const bytes = new TextEncoder().encode(app.renderer.exportSvg());
    const uri = 'data:image/svg+xml;base64,' + btoa(Array.from(bytes, (byte) => String.fromCharCode(byte)).join(''));
    const markdown = `![Mechanics scene](${uri})`;
    const tab = window.open('/tools/panphymd.html#import=' + encodeURIComponent(JSON.stringify({ markdown })), '_blank');
    app.toast(tab === null ? 'The browser blocked the new tab. Allow pop-ups for this site, then try again.' : 'Scene image sent to PanPhyMD in a new tab.');
  };

  app.exportPng = function exportPng() {
    canvas.toBlob((blob) => { if (blob) download('panphymech-scene.png', blob); }, 'image/png');
  };

  app.exportCsv = function exportCsv() {
    if (G.sampleIndices(app).length < 2) return;
    download(`panphymech-${fileStem(G.trackName(app.scene, app.track))}.csv`, new Blob([G.toCSV(app)], { type: 'text/csv;charset=utf-8;' }));
  };

  app.exportPlot = function exportPlot() {
    if (G.sampleIndices(app).length < 2) return;
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
    if (mod && k.toLowerCase() === 'c') { e.preventDefault(); app.copySelection(); return; }
    if (mod && k.toLowerCase() === 'v') { e.preventDefault(); app.pasteSelection(); return; }
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
    if (k === 'm' || k === 'M') { app.mirrorSelection(); return; }
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
  app.loadExamples();

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
