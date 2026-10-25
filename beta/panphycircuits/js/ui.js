// PanPhy Circuits: panels, menus and dialogs.
(function (root) {
  const PPC = root.PPC = root.PPC || {};
  const { registry, circuit, layout, solver, units } = PPC;
  const { esc } = PPC.artCommon;

  const ICONS = {
    select: '<path d="M5 3l14 7-6 1.6L10.5 18z"/>',
    wire: '<circle cx="5" cy="18" r="2.2"/><circle cx="19" cy="6" r="2.2"/><path d="M7 17c6 0 4-10 10-10"/>',
    pan: '<path d="M9 11V5.5a1.5 1.5 0 013 0V10m0-1V4.5a1.5 1.5 0 013 0V10m0-.5a1.5 1.5 0 013 0V15a6 6 0 01-6 6h-1a6 6 0 01-5-2.7L3.6 14a1.5 1.5 0 012.5-1.7L9 15"/>',
    rotate: '<path d="M20 11a8 8 0 10-2.3 5.7"/><path d="M20 4v7h-7"/>',
    flip: '<path d="M12 3v18"/><path d="M9 7L4 17h5zM15 7l5 10h-5z"/>',
    duplicate: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 00-2-2H6a2 2 0 00-2 2v8a2 2 0 002 2h2"/>',
    trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
    undo: '<path d="M9 14L4 9l5-5"/><path d="M4 9h11a5 5 0 010 10h-3"/>',
    redo: '<path d="M15 14l5-5-5-5"/><path d="M20 9H9a5 5 0 000 10h3"/>',
    zoomIn: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4M11 8v6M8 11h6"/>',
    zoomOut: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4M8 11h6"/>',
    fit: '<path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5"/><rect x="8" y="8" width="8" height="8" rx="1"/>',
    snap: '<path d="M6 4v8a6 6 0 0012 0V4"/><path d="M6 8h4M14 8h4"/>',
    graph: '<path d="M4 4v16h16"/><path d="M7 15c3-7 5-7 7-3s3 2 5-4"/>',
    play: '<path d="M7 4l13 8-13 8z" fill="currentColor"/>',
    pause: '<path d="M7 4h4v16H7zM13 4h4v16h-4z" fill="currentColor"/>',
    reset: '<path d="M4 4v6h6"/><path d="M4.5 15a8 8 0 102-8.5L4 10"/>',
    realistic: '<rect x="3" y="9" width="18" height="7" rx="3.5"/><path d="M8 9v7M11 9v7M14 9v7M1 12.5h2M21 12.5h2"/>',
    schematic: '<path d="M1 12h5l1.5-4 3 8 3-8 3 8 1.5-4h5"/>',
    library: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
    inspect: '<path d="M4 6h10M4 12h16M4 18h7"/><circle cx="17" cy="6" r="2.4"/><circle cx="14" cy="18" r="2.4"/>',
    warn: '<path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18v.5"/>',
    close: '<path d="M6 6l12 12M18 6L6 18"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>'
  };
  function icon(name) {
    return `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${ICONS[name] || ''}</svg>`;
  }

  const GROUP_ORDER = ['Sources', 'Resistors', 'Lamps and switches', 'Meters', 'Diodes', 'Sensors', 'Capacitors', 'Transistors', 'Logic', 'Wiring'];

  function createUI(app) {
    const $ = (id) => document.getElementById(id);
    const ui = {};
    let filter = 'all';
    let query = '';
    let lastInspectorKey = '';

    // ---------- Icons on static buttons ----------
    document.querySelectorAll('[data-icon]').forEach((el) => { el.insertAdjacentHTML('afterbegin', icon(el.dataset.icon)); });

    // ---------- Library ----------

    function miniArt(type, view) {
      const def = registry.get(type);
      const a = layout.artFor(view, type);
      const props = registry.defaultProps(type);
      const c = { id: 'lib', type, label: def.prefix + '1', props };
      const [x, y, w, h] = a.bounds(props);
      const pad = 4;
      const ctx = { c, p: props, uid: `lib-${view[0]}-${type}`, r: 0, f: false, st: { brightness: type === 'led' ? 0.7 : 0, T: 300 }, logic: { in: {}, out: {} }, display: def.meter ? '0.00 ' + def.meter.unit : '', logicStyle: app.doc.settings.logicStyle };
      const content = type === 'junction' && view === 'schematic' ? '<circle cx="0" cy="0" r="4.2" class="jdot"/>' : a.draw(ctx);
      return `<svg class="card-art" viewBox="${x - pad} ${y - pad} ${w + 2 * pad} ${h + 2 * pad}" aria-hidden="true" focusable="false">${content}</svg>`;
    }

    ui.renderLibrary = function () {
      const view = app.doc.view;
      const q = query.trim().toLowerCase();
      const groups = new Map();
      for (const type of registry.order) {
        const def = registry.get(type);
        if (filter !== 'all' && def.category !== filter) continue;
        if (q && !(def.name.toLowerCase().includes(q) || (def.keywords || '').includes(q) || def.group.toLowerCase().includes(q))) continue;
        if (!groups.has(def.group)) groups.set(def.group, []);
        groups.get(def.group).push(type);
      }
      const html = [];
      for (const g of GROUP_ORDER) {
        if (!groups.has(g)) continue;
        html.push(`<section class="lib-group"><h2 class="ds-label">${esc(g)}</h2><div class="lib-grid">`);
        for (const type of groups.get(g)) {
          const def = registry.get(type);
          const armed = app.placing === type ? ' is-armed' : '';
          html.push(`<button type="button" class="card${armed}" data-type="${type}" aria-pressed="${app.placing === type}" title="${esc(def.name)}: drag onto the workspace, or click and then click where it should go${def.category === 'ext' ? ' (extension)' : ''}">${miniArt(type, view)}<span class="card-name">${esc(def.name)}</span>${def.category === 'ext' ? '<span class="card-tag">ext</span>' : ''}</button>`);
        }
        html.push('</div></section>');
      }
      if (!html.length) html.push(`<p class="lib-empty">No components match “${esc(query)}”.</p>`);
      $('lib-list').innerHTML = html.join('');
    };

    $('lib-search').addEventListener('input', (e) => { query = e.target.value; ui.renderLibrary(); });
    document.querySelectorAll('[data-filter]').forEach((b) => b.addEventListener('click', () => {
      filter = b.dataset.filter;
      document.querySelectorAll('[data-filter]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      ui.renderLibrary();
    }));

    // Card gestures: drag onto the workspace, or click to arm placement. The drag
    // is tracked on window so re-rendering the library cannot interrupt it.
    let cardDrag = null;
    $('lib-list').addEventListener('pointerdown', (e) => {
      const card = e.target.closest('.card');
      if (!card || e.button !== 0 || cardDrag) return;
      e.preventDefault();
      cardDrag = { type: card.dataset.type, x: e.clientX, y: e.clientY, ghost: null, id: e.pointerId };
      window.addEventListener('pointermove', onCardMove);
      window.addEventListener('pointerup', onCardUp);
      window.addEventListener('pointercancel', onCardCancel);
    });
    function onCardMove(e) {
      if (!cardDrag || e.pointerId !== cardDrag.id) return;
      if (!cardDrag.ghost && Math.hypot(e.clientX - cardDrag.x, e.clientY - cardDrag.y) > 6) {
        const g = document.createElement('div');
        g.className = 'drag-ghost';
        g.innerHTML = miniArt(cardDrag.type, app.doc.view);
        document.body.append(g);
        cardDrag.ghost = g;
        if (app.placing) app.setPlacing(null);
        if (window.matchMedia('(max-width: 900px)').matches) document.body.classList.remove('show-library');
      }
      if (cardDrag.ghost) {
        cardDrag.ghost.style.transform = `translate(${e.clientX - 40}px, ${e.clientY - 30}px)`;
        const over = document.elementFromPoint(e.clientX, e.clientY);
        cardDrag.ghost.classList.toggle('is-over', !!(over && over.closest('#workspace')));
      }
    }
    function endCardDrag(e, cancelled) {
      if (!cardDrag || e.pointerId !== cardDrag.id) return;
      const d = cardDrag;
      cardDrag = null;
      window.removeEventListener('pointermove', onCardMove);
      window.removeEventListener('pointerup', onCardUp);
      window.removeEventListener('pointercancel', onCardCancel);
      if (d.ghost) {
        d.ghost.remove();
        if (!cancelled) {
          const over = document.elementFromPoint(e.clientX, e.clientY);
          if (over && over.closest('#workspace')) app.editor.placeAtClient(d.type, e.clientX, e.clientY);
        }
        return;
      }
      if (cancelled) return;
      app.setPlacing(app.placing === d.type ? null : d.type);
      if (app.placing && window.matchMedia('(max-width: 900px)').matches) document.body.classList.remove('show-library');
    }
    function onCardUp(e) { endCardDrag(e, false); }
    function onCardCancel(e) { endCardDrag(e, true); }
    $('lib-list').addEventListener('keydown', (e) => {
      const card = e.target.closest('.card');
      if (card && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        app.setPlacing(null);
        app.editor.placeAtCenter(card.dataset.type);
      }
    });

    // ---------- Inspector ----------

    function field(p, value, compId) {
      const id = `f-${compId}-${p.key}`;
      const help = p.help ? `<p class="field-help">${esc(p.help)}</p>` : '';
      if (p.kind === 'bool') {
        return `<div class="field field-bool"><label class="toggle"><input type="checkbox" id="${id}" data-prop="${p.key}" ${value ? 'checked' : ''}><span class="toggle-track" aria-hidden="true"></span><span>${esc(p.label)}</span></label>${help}</div>`;
      }
      if (p.kind === 'select') {
        return `<div class="field"><label for="${id}">${esc(p.label)}</label><select id="${id}" data-prop="${p.key}">${p.options.map((o) => `<option value="${esc(o.value)}" ${o.value === value ? 'selected' : ''}>${esc(o.label)}</option>`).join('')}</select>${help}</div>`;
      }
      const unit = p.unit || '';
      const sliderVal = toSlider(p, value);
      return `<div class="field"><label for="${id}">${esc(p.label)}</label>` +
        `<div class="num-row"><div class="num"><input id="${id}" type="text" inputmode="decimal" spellcheck="false" autocomplete="off" data-prop="${p.key}" value="${esc(fmtField(p, value))}" aria-describedby="${id}-err"><span class="unit">${esc(unit)}</span></div></div>` +
        `<input type="range" class="slider" min="0" max="1000" step="1" value="${sliderVal}" data-slider="${p.key}" aria-label="${esc(p.label)} slider">` +
        `<p class="field-range">${esc(rangeText(p))}</p><p class="field-err" id="${id}-err" role="alert"></p>${help}</div>`;
    }
    function fmtField(p, v) {
      if (p.unit === '%' || p.unit === '°C' || p.unit === 'K' || !p.unit) return String(Math.round(v * 1000) / 1000);
      return units.fmtInput(v, '');
    }
    function rangeText(p) {
      const f = (v) => (p.unit === '%' || p.unit === '°C' || p.unit === 'K' || !p.unit ? `${v}${p.unit ? ' ' + p.unit : ''}` : units.fmtSI(v, p.unit, 3, { trim: true }));
      return `${f(p.min)} to ${f(p.max)}`;
    }
    function toSlider(p, v) {
      if (p.log) {
        const lo = Math.log10(p.logMin || p.min), hi = Math.log10(p.max);
        return Math.round(((Math.log10(Math.max(v, p.logMin || p.min)) - lo) / (hi - lo)) * 1000);
      }
      return Math.round(((v - p.min) / (p.max - p.min)) * 1000);
    }
    function fromSlider(p, s) {
      let v;
      if (p.log) {
        const lo = Math.log10(p.logMin || p.min), hi = Math.log10(p.max);
        v = Math.pow(10, lo + (s / 1000) * (hi - lo));
        if (p.logMin && s === 0) v = p.min;
        const mag = Math.pow(10, Math.floor(Math.log10(v)) - 1);
        v = Math.round(v / mag) * mag;
      } else {
        v = p.min + (s / 1000) * (p.max - p.min);
        const step = p.step || (p.max - p.min) / 1000;
        v = Math.round(v / step) * step;
      }
      return Math.min(p.max, Math.max(p.min, Number(v.toPrecision(6))));
    }

    function selectionKey() {
      return [...app.selection.comps].join(',') + '|' + [...app.selection.wires].join(',') + '|' + app.doc.view;
    }

    ui.renderInspector = function (force) {
      const key = selectionKey();
      const body = $('inspector-body');
      const focused = document.activeElement && body.contains(document.activeElement) ? document.activeElement.id : null;
      if (!force && key === lastInspectorKey && body.dataset.rev === String(app.rev)) { ui.updateReadings(); return; }
      lastInspectorKey = key;
      body.dataset.rev = String(app.rev);
      const nc = app.selection.comps.size, nw = app.selection.wires.size;
      if (nc === 1 && nw === 0) body.innerHTML = compInspector(circuit.getComp(app.doc, [...app.selection.comps][0]));
      else if (nc === 0 && nw === 1) body.innerHTML = wireInspector(circuit.getWire(app.doc, [...app.selection.wires][0]));
      else if (nc + nw > 1) body.innerHTML = multiInspector(nc, nw);
      else body.innerHTML = circuitInspector();
      if (focused) { const el = document.getElementById(focused); if (el) el.focus(); }
      ui.updateReadings();
    };

    function compInspector(c) {
      if (!c) return circuitInspector();
      const def = registry.get(c.type);
      const props = def.props.filter((p) => p.key !== 'plot');
      const plot = def.props.find((p) => p.key === 'plot');
      const tt = def.gate ? truthTable(def) : '';
      return `<div class="insp-head"><div class="insp-art">${miniArt(c.type, app.doc.view)}</div><div><p class="ds-label">${esc(def.group)}${def.category === 'ext' ? ' · extension' : ''}</p><h2 class="insp-title">${esc(def.name)}</h2></div></div>` +
        (c.type !== 'junction' ? `<div class="field"><label for="f-label">Label</label><input id="f-label" type="text" maxlength="${circuit.LABEL_MAX}" value="${esc(c.label)}" data-label="1" autocomplete="off"></div>` : '') +
        props.map((p) => field(p, c.props[p.key], c.id)).join('') +
        `<section class="readings" aria-label="Live readings"><h3 class="ds-label">Readings</h3><dl id="readings"></dl>${plot ? field(plot, c.props.plot, c.id) : ''}</section>` +
        tt +
        `<div class="insp-actions"><button type="button" class="ds-button" data-act="rotate">${icon('rotate')}Rotate</button><button type="button" class="ds-button" data-act="flip">${icon('flip')}Mirror</button><button type="button" class="ds-button" data-act="duplicate">${icon('duplicate')}Duplicate</button><button type="button" class="ds-button danger" data-act="delete">${icon('trash')}Delete</button></div>` +
        `<details class="model-note"><summary>How this is modeled</summary><p>${esc(def.help)}</p><p class="terms">Terminals: ${def.terminals.map((t) => esc(t.name)).join(' · ')}</p></details>`;
    }

    function truthTable(def) {
      const g = def.gate;
      const rows = g.single ? [[0], [1]] : [[0, 0], [0, 1], [1, 0], [1, 1]];
      return `<section class="truth"><h3 class="ds-label">Truth table</h3><table><thead><tr>${g.inputs.map((i) => `<th>${i.toUpperCase()}</th>`).join('')}<th>Q</th></tr></thead><tbody>` +
        rows.map((r) => `<tr data-row="${r.join('')}">${r.map((x) => `<td>${x}</td>`).join('')}<td>${(g.single ? g.fn(!!r[0]) : g.fn(!!r[0], !!r[1])) ? 1 : 0}</td></tr>`).join('') +
        `</tbody></table></section>`;
    }

    function endName(end) {
      const c = circuit.getComp(app.doc, end.c);
      if (!c) return '?';
      const t = registry.get(c.type).terminals.find((x) => x.id === end.t);
      if (c.type === 'junction') return 'a junction';
      return `${c.label} ${t ? t.name.replace(/ \(.*\)$/, '') : end.t}`;
    }

    function wireInspector(w) {
      if (!w) return circuitInspector();
      const sw = circuit.WIRE_COLORS.map((col) => `<button type="button" class="swatch${w.color === col ? ' is-on' : ''}" data-color="${col}" style="--c:${PPC.render.WIRE_HEX[col]}" aria-label="${col}" aria-pressed="${w.color === col}" title="${col}"></button>`).join('');
      return `<div class="insp-head"><div><p class="ds-label">Connection</p><h2 class="insp-title">Wire</h2></div></div>` +
        `<p class="wire-ends">${esc(endName(w.a))} <span aria-hidden="true">→</span> ${esc(endName(w.b))}</p>` +
        `<section class="readings"><h3 class="ds-label">Readings</h3><dl id="readings"></dl></section>` +
        `<div class="field"><span class="field-label">Color</span><div class="swatches" role="group" aria-label="Wire color">${sw}</div></div>` +
        `<p class="field-help">Drag the wire to add a bend, drag a square to move a bend (double-click removes it) and drag a round end onto another terminal to reconnect it. Bends are kept separately in each view.</p>` +
        `<div class="insp-actions"><button type="button" class="ds-button" data-act="straighten">Remove bends</button><button type="button" class="ds-button danger" data-act="delete">${icon('trash')}Delete</button></div>`;
    }

    function multiInspector(nc, nw) {
      return `<div class="insp-head"><div><p class="ds-label">Selection</p><h2 class="insp-title">${nc} component${nc === 1 ? '' : 's'}${nw ? `, ${nw} wire${nw === 1 ? '' : 's'}` : ''}</h2></div></div>` +
        `<div class="insp-actions"><button type="button" class="ds-button" data-act="rotate">${icon('rotate')}Rotate</button><button type="button" class="ds-button" data-act="duplicate">${icon('duplicate')}Duplicate</button><button type="button" class="ds-button danger" data-act="delete">${icon('trash')}Delete</button></div>`;
    }

    function circuitInspector() {
      const s = app.doc.settings;
      const n = app.doc.components.filter((c) => c.type !== 'junction').length;
      const opt = (v, cur, label) => `<option value="${v}" ${String(cur) === String(v) ? 'selected' : ''}>${label}</option>`;
      return `<div class="insp-head"><div><p class="ds-label">Nothing selected</p><h2 class="insp-title">Circuit</h2></div></div>` +
        `<p class="insp-summary">${n} component${n === 1 ? '' : 's'}, ${app.doc.wires.length} wire${app.doc.wires.length === 1 ? '' : 's'}. Select a component or wire to edit it and see its readings.</p>` +
        `<section class="settings"><h3 class="ds-label">Simulation</h3>` +
        `<div class="field"><label for="s-speed">Speed</label><select id="s-speed" data-setting="speed">${[0.01, 0.1, 0.25, 1, 4, 10].map((v) => opt(v, s.speed, v === 1 ? 'Real time (1×)' : `${v}×`)).join('')}</select></div>` +
        `<div class="field"><label for="s-dt">Time step</label><select id="s-dt" data-setting="dt">${opt('auto', s.dt, `Automatic (now ${units.fmtSI(app.sim.dt, 's', 2)})`)}${[1e-5, 1e-4, 1e-3, 1e-2].map((v) => opt(v, s.dt, units.fmtSI(v, 's', 1))).join('')}</select><p class="field-help">Automatic picks about 1/100 of the shortest RC time constant (and of an AC period). Results do not depend on your device's frame rate.</p></div>` +
        `</section><section class="settings"><h3 class="ds-label">Display</h3>` +
        `<div class="field field-bool"><label class="toggle"><input type="checkbox" data-setting="showLabels" ${s.showLabels ? 'checked' : ''}><span class="toggle-track" aria-hidden="true"></span><span>Show labels and values</span></label></div>` +
        `<div class="field field-bool"><label class="toggle"><input type="checkbox" data-setting="currentFlow" ${s.currentFlow ? 'checked' : ''}><span class="toggle-track" aria-hidden="true"></span><span>Animate conventional current</span></label><p class="field-help">Yellow dashes move from + to − through the external circuit. Their speed only hints at the size of the current; real charge carriers drift far more slowly.</p></div>` +
        `<div class="field field-bool"><label class="toggle"><input type="checkbox" data-setting="wireColorsInDiagram" ${s.wireColorsInDiagram ? 'checked' : ''}><span class="toggle-track" aria-hidden="true"></span><span>Wire colors in the circuit diagram</span></label></div>` +
        `<div class="field"><label for="s-logic">Logic gate symbols</label><select id="s-logic" data-setting="logicStyle">${opt('distinctive', s.logicStyle, 'Distinctive shapes (UK school)')}${opt('iec', s.logicStyle, 'IEC rectangular')}</select></div>` +
        `</section>` +
        `<details class="model-note"><summary>About the simulation</summary><p><strong>Run</strong> advances time in fixed steps; <strong>Pause</strong> freezes time, but edits still update the readings for the frozen state; <strong>Reset</strong> returns to t = 0 with every capacitor at its initial p.d. and clears the graphs. Switching views never changes the simulation.</p><p>Editing the circuit while it runs keeps time and stored charge. Saved files and autosave keep the circuit, not the live state: opening one starts at t = 0.</p></details>`;
    }

    // Live readings in the inspector, refreshed several times a second.
    ui.updateReadings = function () {
      const dl = document.getElementById('readings');
      if (!dl || !app.sim.result) return;
      const res = app.sim.result;
      let rows = [];
      if (app.selection.comps.size === 1) {
        const c = circuit.getComp(app.doc, [...app.selection.comps][0]);
        if (!c) return;
        const def = registry.get(c.type);
        const r = solver.reader(res, c);
        if (def.meter) {
          const m = PPC.render.meterDisplay(app, c);
          rows.push({ label: 'Display', text: m.text + (m.note ? ` (${m.note})` : ''), why: m.why, strong: true });
        }
        rows = rows.concat(def.readings(c, r).map((x) => ({ label: x.label, text: x.text !== undefined ? x.text : x.logic !== undefined ? `${units.fmtSI(x.value, x.unit, 3)} · ${x.logic ? 'HIGH (1)' : 'LOW (0)'}` : fmtReading(x), why: Number.isNaN(x.value) ? whyUndefined(c, res) : '' })));
        const tt = document.querySelector('.truth tbody');
        if (tt && def.gate) {
          const inp = res.inputs[c.id] || {};
          const row = def.gate.inputs.map((i) => (inp[i] ? 1 : 0)).join('');
          tt.querySelectorAll('tr').forEach((tr) => tr.classList.toggle('is-now', tr.dataset.row === row));
        }
      } else if (app.selection.wires.size === 1) {
        const w = circuit.getWire(app.doc, [...app.selection.wires][0]);
        if (!w) return;
        const I = PPC.render.wireCurrents(app).get(w.id);
        rows.push({ label: 'Current', text: Number.isFinite(I) ? `${units.fmtSI(Math.abs(I) < 1e-9 ? 0 : Math.abs(I), 'A', 3)}${Math.abs(I) >= 1e-9 ? (I > 0 ? ' →' : ' ←') : ''}` : '—', why: Number.isFinite(I) ? 'Conventional current; the arrow points along the wire as listed above.' : 'Not defined for this wire (it closes a loop of wires, or that part of the circuit has a problem).' });
      }
      dl.innerHTML = rows.map((x) => `<div class="reading${x.strong ? ' is-strong' : ''}"><dt>${esc(x.label)}</dt><dd class="ds-readout"${x.why ? ` title="${esc(x.why)}"` : ''}>${esc(x.text)}</dd></div>`).join('');
    };

    function fmtReading(x) {
      if (x.unit === 'K') return Number.isFinite(x.value) ? `${Math.round(x.value / 10) * 10} K` : '—';
      let v = x.value;
      if (Number.isFinite(v) && Math.abs(v) < (x.unit === 'A' ? 1e-10 : x.unit === 'W' ? 1e-12 : 1e-7)) v = 0;
      return Number.isNaN(v) ? '—' : units.fmtSI(v, x.unit, x.sig || 3);
    }
    function whyUndefined(c, res) {
      const e = res.comp[c.id];
      if (e && Object.values(e.net).some((ni) => res.netOk[ni] === false)) return 'This part of the circuit could not be solved; see the problems list.';
      if (res.warnings.some((w) => /Undefined current/.test(w.msg) && w.comps.includes(c.id))) return 'In a loop with no resistance, so the current is undefined in the ideal model.';
      return 'Undefined: the terminals are not in the same circuit.';
    }

    // Inspector events (delegated).
    const insp = $('inspector-body');
    insp.addEventListener('change', (e) => {
      const t = e.target;
      const c = app.selection.comps.size === 1 ? circuit.getComp(app.doc, [...app.selection.comps][0]) : null;
      if (t.dataset.setting) {
        const key = t.dataset.setting;
        let v = t.type === 'checkbox' ? t.checked : t.value;
        if (key === 'speed') v = Number(v);
        if (key === 'dt') v = v === 'auto' ? 'auto' : Number(v);
        app.setSetting(key, v);
        return;
      }
      if (t.dataset.label && c) {
        const lab = circuit.sanitizeLabel(t.value, c.label);
        if (app.doc.components.some((x) => x !== c && x.label === lab)) { app.toast(`${lab} is already used.`); t.value = c.label; return; }
        c.label = lab; t.value = lab;
        app.commit('Rename');
        return;
      }
      if (!c || !t.dataset.prop && !t.dataset.slider) return;
      const def = registry.get(c.type);
      const key = t.dataset.prop || t.dataset.slider;
      const p = def.props.find((x) => x.key === key);
      if (!p) return;
      if (p.kind === 'bool') {
        c.props[key] = t.checked;
        if (p.operational) { app.operationalChanged(c); if (key === 'plot' && t.checked) app.showGraph(true); return; }
        app.commit(`Change ${p.label.toLowerCase()}`);
        return;
      }
      if (p.kind === 'select') { c.props[key] = t.value; app.commit(`Change ${p.label.toLowerCase()}`); return; }
      if (t.dataset.slider) { app.commit(`Change ${p.label.toLowerCase()}`, { merge: c.id + key }); return; }
      commitNumber(c, p, t);
    });
    insp.addEventListener('input', (e) => {
      const t = e.target;
      if (!t.dataset.slider) return;
      const c = circuit.getComp(app.doc, [...app.selection.comps][0]);
      const p = registry.get(c.type).props.find((x) => x.key === t.dataset.slider);
      c.props[p.key] = fromSlider(p, Number(t.value));
      const box = document.getElementById(`f-${c.id}-${p.key}`);
      if (box) box.value = fmtField(p, c.props[p.key]);
      app.electricalChanged(true);
    });
    insp.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && e.target.matches('input[type="text"]')) { e.preventDefault(); e.target.blur(); }
      if (e.key === 'Escape' && e.target.matches('input[type="text"]')) { e.target.blur(); }
    });
    function commitNumber(c, p, input) {
      const v = units.parseSI(input.value, p.unit);
      const err = document.getElementById(input.id + '-err');
      if (!Number.isFinite(v) || v < p.min || v > p.max) {
        err.textContent = !Number.isFinite(v) ? `Enter a number, e.g. ${fmtField(p, p.default)}${p.unit && !['%', '°C', 'K'].includes(p.unit) ? ' (SI prefixes like k, m, µ work)' : ''}.` : `Choose a value from ${rangeText(p)}.`;
        input.setAttribute('aria-invalid', 'true');
        return;
      }
      err.textContent = '';
      input.removeAttribute('aria-invalid');
      c.props[p.key] = v;
      app.commit(`Change ${p.label.toLowerCase()}`);
    }
    insp.addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      if (b.dataset.color) {
        const w = circuit.getWire(app.doc, [...app.selection.wires][0]);
        if (w) { w.color = b.dataset.color; app.commit('Recolor wire'); }
        return;
      }
      const act = b.dataset.act;
      if (act === 'rotate') app.rotateSelection(1);
      else if (act === 'flip') app.flipSelection();
      else if (act === 'duplicate') app.duplicate();
      else if (act === 'delete') app.deleteSelection();
      else if (act === 'straighten') {
        const id = [...app.selection.wires][0];
        const lay = app.doc.layouts[app.doc.view].wires[id];
        if (lay) { lay.pts = []; app.commit('Remove bends'); }
      }
    });

    // ---------- Status, hints, problems ----------

    ui.updateStatus = function () {
      const sim = app.sim;
      const run = $('btn-run');
      run.innerHTML = icon(sim.running ? 'pause' : 'play') + `<span>${sim.running ? 'Pause' : 'Run'}</span>`;
      run.setAttribute('aria-pressed', String(sim.running));
      run.title = sim.running ? 'Pause: freeze simulation time (Space)' : 'Run: advance simulation time (Space)';
      $('sim-status').dataset.state = sim.running ? (sim.behind ? 'behind' : 'running') : 'paused';
      $('sim-state').textContent = sim.running ? (sim.behind ? 'Running (slower than set)' : 'Running') : 'Paused';
      $('sim-time').textContent = 't = ' + fmtTime(sim.t);
      $('view-realistic').setAttribute('aria-pressed', String(app.doc.view === 'realistic'));
      $('view-schematic').setAttribute('aria-pressed', String(app.doc.view === 'schematic'));
      document.querySelectorAll('[data-tool]').forEach((b) => b.setAttribute('aria-pressed', String(app.tool === b.dataset.tool)));
      $('btn-snap').setAttribute('aria-pressed', String(app.snap));
      $('btn-graph').setAttribute('aria-pressed', String(!$('graph-panel').hidden));
      $('btn-undo').disabled = !app.canUndo();
      $('btn-redo').disabled = !app.canRedo();
      const hasSel = app.selection.comps.size + app.selection.wires.size > 0;
      ['btn-rotate', 'btn-flip', 'btn-duplicate', 'btn-delete'].forEach((id) => { $(id).disabled = !hasSel; });
      $('zoom-readout').textContent = Math.round(app.cameras[app.doc.view].z * 100) + ' %';
      $('empty-state').hidden = app.doc.components.length > 0;
      const probs = app.problems();
      const btn = $('btn-problems');
      btn.hidden = probs.length === 0;
      const errors = probs.filter((p) => p.level === 'error').length;
      btn.dataset.level = errors ? 'error' : 'warn';
      btn.innerHTML = icon('warn') + `<span>${errors ? `${errors} error${errors > 1 ? 's' : ''}` : ''}${errors && probs.length - errors ? ', ' : ''}${probs.length - errors ? `${probs.length - errors} note${probs.length - errors > 1 ? 's' : ''}` : ''}</span>`;
      const banner = $('error-banner');
      if (errors) { banner.hidden = false; banner.querySelector('span').textContent = probs.find((p) => p.level === 'error').msg; }
      else banner.hidden = true;
      if (!$('problems-pop').hidden) renderProblems();
    };

    function fmtTime(t) {
      if (t < 10) return t.toFixed(3) + ' s';
      if (t < 100) return t.toFixed(2) + ' s';
      return t.toFixed(1) + ' s';
    }

    function renderProblems() {
      const probs = app.problems();
      $('problems-pop').innerHTML = `<div class="pop-head"><strong>Problems and notes</strong><button type="button" class="icon-btn" data-close aria-label="Close">${icon('close')}</button></div>` +
        (probs.length ? `<ul>${probs.map((p, i) => `<li class="prob prob-${p.level}"><button type="button" data-prob="${i}">${esc(p.msg)}</button></li>`).join('')}</ul>` : '<p>No problems found.</p>');
    }
    $('btn-problems').addEventListener('click', () => {
      const pop = $('problems-pop');
      pop.hidden = !pop.hidden;
      if (!pop.hidden) renderProblems();
    });
    $('error-banner').addEventListener('click', () => { $('problems-pop').hidden = false; renderProblems(); });
    $('problems-pop').addEventListener('click', (e) => {
      if (e.target.closest('[data-close]')) { $('problems-pop').hidden = true; return; }
      const b = e.target.closest('[data-prob]');
      if (!b) return;
      const p = app.problems()[Number(b.dataset.prob)];
      if (p && p.comps && p.comps.length) app.setSelection(p.comps.filter((id) => circuit.getComp(app.doc, id)), []);
    });

    ui.setHint = function (text) {
      $('hint').textContent = text || defaultHint();
    };
    function defaultHint() {
      if (app.placing) return `Click in the workspace to place a ${registry.get(app.placing).name.toLowerCase()} (Shift-click to place several) · Esc to stop.`;
      if (app.tool === 'wire') return 'Wire tool: click a terminal to start a wire, or click a wire to branch from it with a junction.';
      if (app.tool === 'pan') return 'Pan tool: drag to move around the workspace.';
      return 'Drag parts to move them · click a terminal to start a wire · R rotates · scroll or pinch to zoom.';
    }

    let toastTimer = null;
    ui.toast = function (msg, action) {
      const t = $('toast');
      t.innerHTML = `<span>${esc(msg)}</span>` + (action ? `<button type="button" class="toast-btn">${esc(action.label)}</button>` : '');
      t.hidden = false;
      if (action) t.querySelector('button').onclick = () => { t.hidden = true; action.run(); };
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => { t.hidden = true; }, action ? 6000 : 3200);
    };
    ui.announce = function (msg) {
      const live = $('live');
      live.textContent = '';
      setTimeout(() => { live.textContent = msg; }, 30);
    };

    // ---------- Dialogs ----------

    ui.confirm = function (title, text, okLabel) {
      return new Promise((resolve) => {
        const d = $('dlg-confirm');
        d.querySelector('h2').textContent = title;
        d.querySelector('p').textContent = text;
        d.querySelector('[data-ok]').textContent = okLabel || 'OK';
        d.returnValue = '';
        d.showModal();
        d.addEventListener('close', () => resolve(d.returnValue === 'ok'), { once: true });
      });
    };
    ui.message = function (title, lines) {
      const d = $('dlg-message');
      d.querySelector('h2').textContent = title;
      d.querySelector('.msg-body').innerHTML = lines.map((l) => `<p>${esc(l)}</p>`).join('');
      d.showModal();
    };
    document.querySelectorAll('dialog').forEach((d) => {
      d.addEventListener('click', (e) => { if (e.target === d) d.close(); });
    });

    ui.renderExamples = function (list) {
      $('examples-list').innerHTML = list.map((ex, i) => `<li><button type="button" class="example" data-example="${i}"><span class="ex-num">${i + 1}</span><span><strong>${esc(ex.title)}</strong><span>${esc(ex.summary)}</span></span>${ex.ext ? '<span class="card-tag">ext</span>' : ''}</button></li>`).join('');
    };

    return ui;
  }

  PPC.ui = { createUI, icon };
})(typeof globalThis === 'object' ? globalThis : this);
