// PanPhyCircuits: the circuit document.
// One shared electrical circuit (components, properties, wires between named
// terminals) plus an independent layout for each view. Electrical connectivity is
// explicit: a wire joins two terminals by id, never by position.
(function (root) {
  const PPC = root.PPC = root.PPC || {};
  const registry = PPC.registry || (typeof require === 'function' ? require('./registry.js') : null);

  const FORMAT = 'panphy-circuits';
  const VERSION = 1;
  const VIEWS = ['realistic', 'schematic'];
  const WIRE_COLORS = ['red', 'black', 'blue', 'green', 'yellow', 'orange', 'white', 'purple'];
  const ID_PATTERN = /^[a-z][a-z0-9_-]{0,31}$/i;
  const LABEL_MAX = 12;

  function defaultSettings() {
    return {
      logicStyle: 'distinctive',
      showLabels: true,
      showValues: true,
      wireColorsInDiagram: false,
      currentFlow: false,
      speed: 1,
      dt: 'auto'
    };
  }

  function createDoc() {
    return {
      format: FORMAT,
      version: VERSION,
      components: [],
      wires: [],
      layouts: {
        realistic: { ready: true, comps: {}, wires: {} },
        schematic: { ready: false, comps: {}, wires: {} }
      },
      view: 'realistic',
      settings: defaultSettings()
    };
  }

  function clone(value) { return JSON.parse(JSON.stringify(value)); }

  function getComp(doc, id) {
    return doc.components.find((c) => c.id === id) || null;
  }
  function getWire(doc, id) {
    return doc.wires.find((w) => w.id === id) || null;
  }

  function nextId(doc, prefix) {
    const used = new Set(doc.components.map((c) => c.id).concat(doc.wires.map((w) => w.id)));
    let n = 1;
    let max = 0;
    for (const id of used) {
      const m = id.match(new RegExp('^' + prefix + '(\\d+)$'));
      if (m) max = Math.max(max, Number(m[1]));
    }
    n = max + 1;
    while (used.has(prefix + n)) n++;
    return prefix + n;
  }

  function nextLabel(doc, type) {
    const prefix = registry.get(type).prefix;
    const used = new Set(doc.components.map((c) => c.label));
    let n = 1;
    while (used.has(prefix + n)) n++;
    return prefix + n;
  }

  function addComponent(doc, type, opts = {}) {
    const def = registry.get(type);
    if (!def) throw new Error('Unknown component type: ' + type);
    const comp = {
      id: opts.id || nextId(doc, 'c'),
      type,
      label: opts.label || nextLabel(doc, type),
      props: Object.assign(registry.defaultProps(type), opts.props || {})
    };
    doc.components.push(comp);
    return comp;
  }

  function terminalExists(doc, end) {
    const comp = getComp(doc, end.c);
    if (!comp) return false;
    return registry.get(comp.type).terminals.some((t) => t.id === end.t);
  }

  function sameEnd(a, b) { return a.c === b.c && a.t === b.t; }

  function wiresAt(doc, end) {
    return doc.wires.filter((w) => sameEnd(w.a, end) || sameEnd(w.b, end));
  }

  // Returns { wire } or { error }.
  function addWire(doc, a, b, opts = {}) {
    if (!terminalExists(doc, a) || !terminalExists(doc, b)) return { error: 'That terminal no longer exists.' };
    if (sameEnd(a, b)) return { error: 'A wire needs two different terminals.' };
    const dup = doc.wires.find((w) => (sameEnd(w.a, a) && sameEnd(w.b, b)) || (sameEnd(w.a, b) && sameEnd(w.b, a)));
    if (dup) return { error: 'Those terminals are already joined by a wire.' };
    const wire = { id: opts.id || nextId(doc, 'w'), a: { c: a.c, t: a.t }, b: { c: b.c, t: b.t }, color: opts.color || autoWireColor(doc, a, b) };
    doc.wires.push(wire);
    return { wire };
  }

  // Red from a positive terminal, black from a negative one, otherwise blue.
  function autoWireColor(doc, a, b) {
    for (const end of [a, b]) {
      const comp = getComp(doc, end.c);
      if (!comp) continue;
      const pol = registry.get(comp.type).polarity;
      if (comp.type === 'rail_0v') return 'black';
      if (comp.type === 'rail_5v') return 'red';
      if (pol && pol[end.t] === '+') return 'red';
      if (pol && pol[end.t] === '−') return 'black';
    }
    return 'blue';
  }

  function removeWires(doc, ids) {
    const set = new Set(ids);
    doc.wires = doc.wires.filter((w) => !set.has(w.id));
    for (const view of VIEWS) for (const id of set) delete doc.layouts[view].wires[id];
    cleanupJunctions(doc);
  }

  function removeComponents(doc, ids) {
    const set = new Set(ids);
    const wireIds = doc.wires.filter((w) => set.has(w.a.c) || set.has(w.b.c)).map((w) => w.id);
    doc.components = doc.components.filter((c) => !set.has(c.id));
    for (const view of VIEWS) for (const id of set) delete doc.layouts[view].comps[id];
    removeWires(doc, wireIds);
  }

  // A junction with no wires has no purpose; remove it.
  function cleanupJunctions(doc) {
    const empty = doc.components.filter((c) => c.type === 'junction' && wiresAt(doc, { c: c.id, t: 'j' }).length === 0).map((c) => c.id);
    if (!empty.length) return;
    const set = new Set(empty);
    doc.components = doc.components.filter((c) => !set.has(c.id));
    for (const view of VIEWS) for (const id of set) delete doc.layouts[view].comps[id];
  }

  // ---------- Nets ----------

  // Union-find over terminals. Wires join terminals; terminals with a 'global'
  // binding (the logic rails) join the named global net.
  function buildNets(doc) {
    const parent = new Map();
    const find = (k) => {
      let r = k;
      while (parent.get(r) !== r) r = parent.get(r);
      let x = k;
      while (parent.get(x) !== r) { const nx = parent.get(x); parent.set(x, r); x = nx; }
      return r;
    };
    const add = (k) => { if (!parent.has(k)) parent.set(k, k); };
    const union = (a, b) => { add(a); add(b); const ra = find(a), rb = find(b); if (ra !== rb) parent.set(ra, rb); };
    for (const c of doc.components) {
      for (const t of registry.get(c.type).terminals) {
        const key = c.id + ':' + t.id;
        add(key);
        if (t.global) union(key, '@' + t.global);
      }
    }
    for (const w of doc.wires) union(w.a.c + ':' + w.a.t, w.b.c + ':' + w.b.t);
    const netOf = new Map();
    const nets = [];
    const byRoot = new Map();
    for (const key of parent.keys()) {
      const r = find(key);
      if (!byRoot.has(r)) { byRoot.set(r, nets.length); nets.push({ index: nets.length, members: [], global: null }); }
      const net = nets[byRoot.get(r)];
      net.members.push(key);
      if (key[0] === '@') net.global = net.global ? net.global + '+' + key.slice(1) : key.slice(1);
      netOf.set(key, net.index);
    }
    for (const net of nets) {
      net.members.sort();
      net.key = net.global ? '@' + net.global : net.members[0];
    }
    return { nets, netOf };
  }

  // Wire count at each terminal (for junction dots and dangling-end checks).
  function terminalWireCounts(doc) {
    const counts = new Map();
    for (const w of doc.wires) {
      for (const e of [w.a, w.b]) {
        const k = e.c + ':' + e.t;
        counts.set(k, (counts.get(k) || 0) + 1);
      }
    }
    return counts;
  }

  // Junctions with a single wire are dangling ends.
  function danglingJunctions(doc) {
    const counts = terminalWireCounts(doc);
    return doc.components.filter((c) => c.type === 'junction' && (counts.get(c.id + ':j') || 0) < 2).map((c) => c.id);
  }

  // ---------- Import validation ----------

  function sanitizeLabel(value, fallback) {
    if (typeof value !== 'string') return fallback;
    // Labels are shown as text only; strip control and markup characters anyway.
    const clean = value.replace(/[\u0000-\u001f\u007f<>&"'`]/g, '').trim().slice(0, LABEL_MAX);
    return clean || fallback;
  }

  function finite(v) { return typeof v === 'number' && Number.isFinite(v); }

  function validateProp(def, p, value, problems, where) {
    if (value === undefined) return p.default;
    if (p.kind === 'number') {
      if (!finite(value)) { problems.push(`${where}: "${p.label}" must be a number.`); return p.default; }
      if (value < p.min || value > p.max) { problems.push(`${where}: "${p.label}" is outside ${p.min}–${p.max}.`); return Math.min(p.max, Math.max(p.min, value)); }
      return value;
    }
    if (p.kind === 'bool') return value === true;
    if (p.kind === 'select') {
      if (!p.options.some((o) => o.value === value)) { problems.push(`${where}: "${p.label}" has an unsupported value.`); return p.default; }
      return value;
    }
    return p.default;
  }

  function validateLayoutEntry(e) {
    if (!e || typeof e !== 'object') return null;
    if (!finite(e.x) || !finite(e.y) || Math.abs(e.x) > 1e6 || Math.abs(e.y) > 1e6) return null;
    // Quarter turns in 45° steps: 0, 0.5 … 3.5.
    const r = finite(e.r) && e.r >= 0 && e.r < 4 && Number.isInteger(e.r * 2) ? e.r : 0;
    return { x: e.x, y: e.y, r, f: e.f === true };
  }

  function validatePoints(pts) {
    if (!Array.isArray(pts) || pts.length > 200) return [];
    const out = [];
    for (const p of pts) {
      if (Array.isArray(p) && p.length === 2 && finite(p[0]) && finite(p[1]) && Math.abs(p[0]) < 1e6 && Math.abs(p[1]) < 1e6) out.push([p[0], p[1]]);
    }
    return out;
  }

  // Parse and validate a saved document. Returns { doc, warnings } or throws an
  // Error with a readable message. Unknown fields are dropped, so nothing from a
  // file reaches the page except validated numbers, ids, enums and plain labels.
  function importDoc(input) {
    let data = input;
    if (typeof input === 'string') {
      if (input.length > 5e6) throw new Error('The file is too large to be a PanPhyCircuits document.');
      try { data = JSON.parse(input); } catch (e) { throw new Error('The file is not valid JSON.'); }
    }
    if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('The file does not contain a circuit.');
    if (data.format !== FORMAT) throw new Error('This is not a PanPhyCircuits file (missing "format": "panphy-circuits").');
    if (!Number.isInteger(data.version) || data.version < 1) throw new Error('The file has no valid format version.');
    if (data.version > VERSION) throw new Error(`The file uses format version ${data.version}; this app reads version ${VERSION}. Please update the app.`);
    if (!Array.isArray(data.components) || !Array.isArray(data.wires)) throw new Error('The file is missing its component or wire list.');
    if (data.components.length > 500 || data.wires.length > 2000) throw new Error('The circuit is too large (over 500 components or 2000 wires).');

    const warnings = [];
    const doc = createDoc();
    const ids = new Set();
    for (const [index, c] of data.components.entries()) {
      const where = `Component ${index + 1}`;
      if (!c || typeof c !== 'object') { warnings.push(`${where} was not readable and was skipped.`); continue; }
      const def = registry.get(c.type);
      if (typeof c.type !== 'string' || !def) { warnings.push(`${where} has an unsupported type and was skipped.`); continue; }
      if (typeof c.id !== 'string' || !ID_PATTERN.test(c.id) || ids.has(c.id)) { warnings.push(`${where} has an invalid or repeated id and was skipped.`); continue; }
      ids.add(c.id);
      const props = {};
      const srcProps = c.props && typeof c.props === 'object' ? c.props : {};
      for (const p of def.props) props[p.key] = validateProp(def, p, srcProps[p.key], warnings, `${where} (${def.name})`);
      doc.components.push({ id: c.id, type: c.type, label: sanitizeLabel(c.label, def.prefix + (index + 1)), props });
    }
    const wireIds = new Set();
    for (const [index, w] of data.wires.entries()) {
      const ok = w && typeof w === 'object' && typeof w.id === 'string' && ID_PATTERN.test(w.id) && !wireIds.has(w.id) && !ids.has(w.id)
        && w.a && w.b && typeof w.a.c === 'string' && typeof w.a.t === 'string' && typeof w.b.c === 'string' && typeof w.b.t === 'string';
      if (!ok) { warnings.push(`Wire ${index + 1} was not readable and was skipped.`); continue; }
      const a = { c: w.a.c, t: w.a.t }, b = { c: w.b.c, t: w.b.t };
      if (!terminalExists(doc, a) || !terminalExists(doc, b) || sameEnd(a, b)) { warnings.push(`Wire ${index + 1} connects to a missing terminal and was skipped.`); continue; }
      wireIds.add(w.id);
      doc.wires.push({ id: w.id, a, b, color: WIRE_COLORS.includes(w.color) ? w.color : 'blue' });
    }
    const layouts = data.layouts && typeof data.layouts === 'object' ? data.layouts : {};
    for (const view of VIEWS) {
      const src = layouts[view] && typeof layouts[view] === 'object' ? layouts[view] : {};
      const lay = doc.layouts[view];
      lay.ready = src.ready === true;
      const comps = src.comps && typeof src.comps === 'object' ? src.comps : {};
      const wires = src.wires && typeof src.wires === 'object' ? src.wires : {};
      for (const c of doc.components) {
        const e = validateLayoutEntry(comps[c.id]);
        if (e) lay.comps[c.id] = e;
      }
      for (const w of doc.wires) {
        const e = wires[w.id];
        lay.wires[w.id] = { pts: validatePoints(e && e.pts) };
      }
      // A view is only ready if every component has a position in it.
      if (lay.ready && doc.components.some((c) => !lay.comps[c.id])) lay.ready = 'partial';
    }
    if (!doc.layouts.realistic.ready && !doc.layouts.schematic.ready) doc.layouts.realistic.ready = 'partial';
    doc.view = VIEWS.includes(data.view) ? data.view : 'realistic';
    const s = data.settings && typeof data.settings === 'object' ? data.settings : {};
    const def = defaultSettings();
    doc.settings = {
      logicStyle: s.logicStyle === 'iec' ? 'iec' : 'distinctive',
      showLabels: s.showLabels !== false,
      // Older files had one switch for both labels and values.
      showValues: s.showValues !== undefined ? s.showValues !== false : s.showLabels !== false,
      wireColorsInDiagram: s.wireColorsInDiagram === true,
      currentFlow: s.currentFlow === true,
      speed: [0.01, 0.1, 0.25, 1, 4, 10].includes(s.speed) ? s.speed : def.speed,
      dt: s.dt === 'auto' || (finite(s.dt) && s.dt >= 1e-6 && s.dt <= 0.1) ? s.dt : 'auto'
    };
    cleanupJunctions(doc);
    return { doc, warnings };
  }

  function exportDoc(doc) {
    const out = clone(doc);
    out.format = FORMAT;
    out.version = VERSION;
    return out;
  }

  const api = {
    FORMAT, VERSION, VIEWS, WIRE_COLORS, LABEL_MAX,
    createDoc, clone, getComp, getWire, nextId, nextLabel, addComponent, addWire, removeWires, removeComponents,
    cleanupJunctions, wiresAt, sameEnd, terminalExists, buildNets, terminalWireCounts, danglingJunctions,
    importDoc, exportDoc, sanitizeLabel, defaultSettings, autoWireColor
  };
  PPC.circuit = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof globalThis === 'object' ? globalThis : this);
