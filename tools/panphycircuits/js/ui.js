// PanPhyCircuits: panels, menus and dialogs.
(function (root) {
  const PPC = root.PPC = root.PPC || {};
  const { registry, circuit, layout, solver, units } = PPC;
  const { esc } = PPC.artCommon;

  const ICONS = {
    select: '<path d="M5 3l14 7-6 1.6L10.5 18z"/>',
    wire: '<circle cx="5" cy="18" r="2.2"/><circle cx="19" cy="6" r="2.2"/><path d="M7 17c6 0 4-10 10-10"/>',
    pan: '<path d="M12 3v18M3 12h18"/><path d="M9.5 5.5L12 3l2.5 2.5M9.5 18.5L12 21l2.5-2.5M5.5 9.5L3 12l2.5 2.5M18.5 9.5L21 12l-2.5 2.5"/>',
    rotate: '<path d="M20 11a8 8 0 10-2.3 5.7"/><path d="M20 4v7h-7"/>',
    rotateCcw: '<path d="M4 11a8 8 0 112.3 5.7"/><path d="M4 4v7h7"/>',
    mirror: '<path d="M12 2.5v19"/><path d="M9 6.5L3 17.5h6zM15 6.5l6 11h-6z"/>',
    duplicate: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 00-2-2H6a2 2 0 00-2 2v8a2 2 0 002 2h2"/>',
    trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6"/>',
    cross: '<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>',
    tidy: '<path d="M4 20L15 9"/><path d="M15 3v3M13.5 4.5h3M20 8v3M18.5 9.5h3M20 2.5v2M19 3.5h2"/>',
    undo: '<path d="M9 14L4 9l5-5"/><path d="M4 9h11a5 5 0 010 10h-3"/>',
    redo: '<path d="M15 14l5-5-5-5"/><path d="M20 9H9a5 5 0 000 10h3"/>',
    zoomIn: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4M11 8v6M8 11h6"/>',
    zoomOut: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4M8 11h6"/>',
    fit: '<path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5"/><rect x="8" y="8" width="8" height="8" rx="1"/>',
    snap: '<path d="M6 4v8a6 6 0 0012 0V4"/><path d="M6 8h4M14 8h4"/>',
    graph: '<path d="M4 4v16h16"/><path d="M7 15c3-7 5-7 7-3s3 2 5-4"/>',
    sliders: '<path d="M4 7.5h9M17.5 7.5H20M4 16.5h3.5M11.5 16.5H20"/><circle cx="15.2" cy="7.5" r="2.2"/><circle cx="9.5" cy="16.5" r="2.2"/>',
    resume: '<path d="M8 5.5v13l10.5-6.5z" fill="currentColor"/>',
    pause: '<path d="M7.5 5.5h3.2v13H7.5zM13.3 5.5h3.2v13h-3.2z" fill="currentColor"/>',
    realistic: '<rect x="3" y="9" width="18" height="7" rx="3.5"/><path d="M8 9v7M11 9v7M14 9v7M1 12.5h2M21 12.5h2"/>',
    schematic: '<path d="M1 12h5l1.5-4 3 8 3-8 3 8 1.5-4h5"/>',
    panelLeft: '<rect x="3" y="4" width="18" height="16" rx="2.5"/><path d="M9 4v16"/><path d="M4 6a1 1 0 011-1h3v14H5a1 1 0 01-1-1z" fill="currentColor" stroke="none" opacity=".2"/>',
    panelRight: '<rect x="3" y="4" width="18" height="16" rx="2.5"/><path d="M15 4v16"/><path d="M16 5h3a1 1 0 011 1v12a1 1 0 01-1 1h-3z" fill="currentColor" stroke="none" opacity=".2"/>',
    warn: '<path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18v.5"/>',
    close: '<path d="M6 6l12 12M18 6L6 18"/>',
    pin: '<path d="M9 3.5h6l-1.2 5.5 3.2 3.2H7l3.2-3.2z"/><path d="M12 12.2V20.5"/>',
    examples: '<rect x="3.5" y="4" width="7" height="7" rx="1.5"/><rect x="13.5" y="4" width="7" height="7" rx="1.5"/><rect x="3.5" y="14" width="7" height="6" rx="1.5"/><path d="M14 17h6M17 14v6"/>',
    folder: '<path d="M3.5 7.5a2 2 0 012-2h4l2 2.2h7a2 2 0 012 2V17a2 2 0 01-2 2h-13a2 2 0 01-2-2z"/>',
    guide: '<path d="M4 5.5c2.7-1.3 5.4-1.3 8 0v14c-2.6-1.3-5.3-1.3-8 0zM20 5.5c-2.7-1.3-5.4-1.3-8 0v14c2.6-1.3 5.3-1.3 8 0z"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>'
  };
  function icon(name) {
    return `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${ICONS[name] || ''}</svg>`;
  }

  const GROUP_ORDER = ['Sources', 'Resistors', 'Lamps and switches', 'Output devices', 'Meters', 'Diodes', 'Sensors', 'Transformers', 'Capacitors', 'Inductors', 'Transistors', 'Amplifiers', 'Logic', 'Wiring'];

  function createUI(app) {
    const $ = (id) => document.getElementById(id);
    const ui = {};
    // The library filter is remembered in this browser, like display choices.
    const FILTER_KEY = 'panphy-circuits-library-filter-v1';
    let filter = 'core';
    try { const saved = localStorage.getItem(FILTER_KEY); if (['all', 'core', 'logic'].includes(saved)) filter = saved; } catch (e) { /* storage unavailable */ }
    document.querySelectorAll('[data-filter]').forEach((x) => x.setAttribute('aria-pressed', String(x.dataset.filter === filter)));
    let query = '';
    let lastInspectorKey = '';

    // ---------- Icons on static buttons ----------
    document.querySelectorAll('[data-icon]').forEach((el) => { el.insertAdjacentHTML('afterbegin', icon(el.dataset.icon)); });
    // Panel visibility can also change after selection or component placement.
    function syncPanelButtons() {
      for (const [id, className, label] of [['btn-show-library', 'show-library', 'components'], ['btn-show-inspector', 'show-inspector', 'inspector']]) {
        const button = $(id);
        const expanded = document.body.classList.contains(className);
        button.setAttribute('aria-expanded', String(expanded));
        button.setAttribute('aria-label', `${expanded ? 'Hide' : 'Show'} ${label}`);
        button.title = `${expanded ? 'Hide' : 'Show'} ${label}`;
      }
    }
    new MutationObserver(syncPanelButtons).observe(document.body, { attributes: true, attributeFilter: ['class'] });
    syncPanelButtons();

    // ---------- Library ----------

    function miniArt(type, view) {
      const def = registry.get(type);
      const a = layout.artFor(view, type);
      const props = registry.defaultProps(type);
      const c = { id: 'lib', type, label: def.prefix + '1', props };
      const [x, y, w, h] = a.bounds(props);
      const pad = 4;
      const ctx = { c, p: props, uid: `lib-${view[0]}-${type}`, r: 0, f: false, st: { brightness: 0, T: 300 }, logic: { in: {}, out: {} }, display: def.meter ? '0.00 ' + def.meter.unit : '', logicStyle: app.doc.settings.logicStyle };
      const content = type === 'junction' && view === 'schematic' ? '<circle cx="0" cy="0" r="4.2" class="jdot"/>' : a.draw(ctx);
      return `<svg class="card-art" viewBox="${x - pad} ${y - pad} ${w + 2 * pad} ${h + 2 * pad}" aria-hidden="true" focusable="false">${content}</svg>`;
    }

    ui.renderLibrary = function () {
      const view = app.doc.view;
      const q = query.trim().toLowerCase();
      const groups = new Map();
      for (const type of registry.order) {
        const def = registry.get(type);
        // A search looks through every part, whatever the filter.
        if (!q && filter === 'core' && def.category !== 'core') continue;
        if (!q && filter === 'logic' && def.group !== 'Logic') continue;
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
          html.push(`<button type="button" class="card${armed}" data-type="${type}" aria-pressed="${app.placing === type}" title="${esc(def.name)}: drag onto the workspace, or click and then click where it should go">${miniArt(type, view)}<span class="card-name">${esc(def.name)}</span></button>`);
        }
        html.push('</div></section>');
      }
      if (!html.length) html.push(`<p class="lib-empty">No components match “${esc(query)}”.</p>`);
      $('lib-list').innerHTML = html.join('');
    };

    $('lib-search').addEventListener('input', (e) => { query = e.target.value; ui.renderLibrary(); });
    document.querySelectorAll('[data-filter]').forEach((b) => b.addEventListener('click', () => {
      filter = b.dataset.filter;
      try { localStorage.setItem(FILTER_KEY, filter); } catch (e) { /* storage unavailable */ }
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

    // Inspector fields. Numbers get a typed value with its unit beside the
    // label, then a slider with the range at its ends; switches are one row.
    function field(p, value, compId, disabled = false) {
      const id = `f-${compId}-${p.key}`;
      const help = p.help ? `<p class="field-help">${esc(p.help)}</p>` : '';
      if (p.kind === 'bool') {
        return `<div class="field"><label class="toggle"><span>${esc(p.label)}</span><input type="checkbox" id="${id}" data-prop="${p.key}" ${value ? 'checked' : ''}><span class="toggle-track" aria-hidden="true"></span></label>${help}</div>`;
      }
      if (p.kind === 'select') {
        return `<div class="field field-stack"><label for="${id}">${esc(p.label)}</label><select id="${id}" data-prop="${p.key}"${disabled ? ' disabled' : ''}>${p.options.map((o) => `<option value="${esc(o.value)}" ${o.value === value ? 'selected' : ''}>${esc(o.label)}</option>`).join('')}</select>${help}</div>`;
      }
      const unit = p.unit || '';
      const [lo, hi] = rangeEnds(p);
      return `<div class="field"><div class="field-row"><label for="${id}">${esc(p.label)}</label>` +
        `<div class="num"><input id="${id}" type="text" inputmode="decimal" spellcheck="false" autocomplete="off" data-prop="${p.key}"${disabled ? ' disabled' : ''} value="${esc(fmtField(p, value))}" aria-describedby="${id}-err"><span class="unit">${esc(unit)}</span></div></div>` +
        `<input type="range" class="slider" min="0" max="1000" step="1" value="${toSlider(p, value)}" data-slider="${p.key}"${disabled ? ' disabled' : ''} aria-label="${esc(p.label)} slider">` +
        `<p class="field-range"><span>${esc(lo)}</span><span>${esc(hi)}</span></p><p class="field-err" id="${id}-err" role="alert"></p>${help}</div>`;
    }
    function fmtField(p, v) {
      if (p.unit === '%' || p.unit === '°C' || p.unit === 'K' || !p.unit) return String(Math.round(v * 1000) / 1000);
      return units.fmtInput(v, '');
    }
    function rangeEnds(p) {
      const f = (v) => (p.unit === '%' || p.unit === '°C' || p.unit === 'K' || !p.unit ? `${v}${p.unit ? ' ' + p.unit : ''}` : units.fmtSI(v, p.unit, 3, { trim: true }));
      return [f(p.min), f(p.max)];
    }
    function rangeText(p) {
      const [lo, hi] = rangeEnds(p);
      return `${lo} to ${hi}`;
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
        // Zero is a valid endpoint even though the rest of the range is logarithmic.
        if (p.logMin && s === 0) return p.min;
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
      syncQuickSettings();
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
      ui.updateStatus();
    };

    const card = (label, inner, cls = '') => `<section class="icard${cls ? ' ' + cls : ''}">${label ? `<h3 class="icard-label">${esc(label)}</h3>` : ''}${inner}</section>`;
    const actButton = (act, ic, label, danger, title, disabled = false) => `<button type="button" class="mini-tool${danger ? ' danger' : ''}" data-act="${act}"${disabled ? ' disabled' : ''}${title ? ` title="${title}" aria-label="${title}"` : ''}>${icon(ic)}<span>${label}</span></button>`;

    function compInspector(c) {
      if (!c) return circuitInspector();
      const def = registry.get(c.type);
      const props = def.props.filter((p) => p.key !== 'plot' && p.key !== 'autoScale');
      const plot = def.props.find((p) => p.key === 'plot');
      const head = `<div class="insp-head"><div class="insp-art">${miniArt(c.type, app.doc.view)}</div><div><p class="icard-label">${esc(def.group)}</p><h2 class="insp-title">${esc(def.name)}</h2></div></div>` +
        (c.type !== 'junction' ? `<div class="row label-row"><label for="f-label">Label</label><input id="f-label" type="text" maxlength="${circuit.LABEL_MAX}" value="${esc(c.label)}" data-label="1" autocomplete="off"></div>` : '') +
        `<div class="mini-actions">${actButton('rotate-ccw', 'rotateCcw', '45° CCW', false, 'Rotate 45° counterclockwise (Shift+R)', !app.canRotateSelection())}${actButton('rotate', 'rotate', '45° CW', false, 'Rotate 45° clockwise (R)', !app.canRotateSelection())}${actButton('mirror', 'mirror', 'Mirror', false, 'Mirror (M)', !app.canRotateSelection())}${actButton('duplicate', 'duplicate', 'Duplicate')}${actButton('delete', 'cross', 'Delete', true)}</div>`;
      return card('', head) + (ui.hasLiveDisplay(c) && !app.pinned.has(c.id) ? liveCard(c, false) : '') +
        card('Readings', `<dl id="readings"></dl><p id="meter-note" class="meter-note" role="status" hidden></p>${plot ? field(plot, c.props.plot, c.id) : ''}`, 'readings-card') +
        (props.length ? card('Properties', props.map((p) => field(p, c.props[p.key], c.id, c.type === 'scope' && ((c.props.autoScale && ['v1', 'v2'].includes(p.key)) || (c.props.autoTime && p.key === 'tdiv')))).join('')) : '') +
        (def.gate ? truthTable(def) : '') +
        `<details class="icard model-note"><summary>How this is modeled</summary><p>${esc(def.help)}</p><p class="terms">Terminals: ${def.terminals.map((t) => esc(t.name)).join(' · ')}</p></details>`;
    }

    function truthTable(def) {
      const g = def.gate;
      const rows = g.single ? [[0], [1]] : [[0, 0], [0, 1], [1, 0], [1, 1]];
      return `<section class="icard truth"><h3 class="icard-label">Truth table</h3><table><thead><tr>${g.inputs.map((i) => `<th>${i.toUpperCase()}</th>`).join('')}<th>Q</th></tr></thead><tbody>` +
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
      return card('', `<div class="insp-head"><div><p class="icard-label">Connection</p><h2 class="insp-title">Wire</h2></div></div>` +
          `<p class="wire-ends">${esc(endName(w.a))} <span aria-hidden="true">→</span> ${esc(endName(w.b))}</p>` +
          `<div class="mini-actions">${actButton('straighten', 'fit', 'Remove bends')}${actButton('delete', 'cross', 'Delete', true)}</div>`) +
        card('Readings', '<dl id="readings"></dl>', 'readings-card') +
        card('Color', `<div class="swatches" role="group" aria-label="Wire color">${sw}</div>`) +
        `<details class="icard model-note"><summary>Editing wires</summary><p>Drag the wire to add a bend, drag a square to move a bend (double-click removes it) and drag a round end onto another terminal to reconnect it. Bends are kept separately in each view.</p></details>`;
    }

    function multiInspector(nc, nw) {
      return card('', `<div class="insp-head"><div><p class="icard-label">Selection</p><h2 class="insp-title">${nc} component${nc === 1 ? '' : 's'}${nw ? `, ${nw} wire${nw === 1 ? '' : 's'}` : ''}</h2></div></div>` +
        `<div class="mini-actions">${actButton('rotate-ccw', 'rotateCcw', '45° CCW', false, 'Rotate 45° counterclockwise (Shift+R)', !app.canRotateSelection())}${actButton('rotate', 'rotate', '45° CW', false, 'Rotate 45° clockwise (R)', !app.canRotateSelection())}${actButton('mirror', 'mirror', 'Mirror', false, 'Mirror (M)', !app.canRotateSelection())}${actButton('duplicate', 'duplicate', 'Duplicate')}${actButton('delete', 'cross', 'Delete', true)}</div>`);
    }

    function circuitInspector() {
      const s = app.doc.settings;
      const opt = (v, cur, label) => `<option value="${v}" ${String(cur) === String(v) ? 'selected' : ''}>${label}</option>`;
      const toggle = (key, label) => `<label class="toggle"><span>${label}</span><input type="checkbox" data-setting="${key}" ${s[key] ? 'checked' : ''}><span class="toggle-track" aria-hidden="true"></span></label>`;
      return `<p class="insp-hint">Select a component or wire to edit it and see its readings.</p>` +
        card('Simulation', `<div class="sim-controls" role="group" aria-label="Simulation controls"><div class="sim-summary"><span class="status-dot" aria-hidden="true"></span><span class="sim-state">Live</span></div><button type="button" class="sim-run" data-sim-run aria-pressed="false"></button></div><div class="row"><label for="s-speed">Speed</label><select id="s-speed" data-setting="speed">${[0.01, 0.1, 0.25, 1, 4, 10].map((v) => opt(v, s.speed, v === 1 ? 'Real time (1×)' : `${v}×`)).join('')}</select></div>` +
          `<div class="row"><label for="s-dt">Time step</label><select id="s-dt" data-setting="dt">${opt('auto', s.dt, `Auto (${units.fmtSI(app.sim.dt, 's', 2)})`)}${[1e-5, 1e-4, 1e-3, 1e-2].map((v) => opt(v, s.dt, units.fmtSI(v, 's', 1))).join('')}</select></div>` +
          `<button type="button" class="btn-secondary" data-sim-reset>Reset time and stored energy</button>`, 'simulation-card') +
        `<details class="icard model-note"><summary>About the simulation</summary><p>The circuit runs live, including capacitors, inductors, AC supplies, the oscilloscope and graphs. Use a switch in your circuit to trigger an effect. <strong>Pause</strong> freezes time, traces, current and component animations, and sound; <strong>Resume</strong> continues from there. Edits still update readings for the frozen state. Switching views never changes the simulation.</p>` +
          `<p>The automatic time step is about 1/100 of the shortest RC time constant (and of an AC period). Results do not depend on your device's frame rate.</p>` +
          `<p>Animated current shows conventional current as yellow dashes moving from + to − through the external circuit. Their speed only hints at the size of the current; real charge carriers drift far more slowly. Fast AC animation replays sampled wire currents at one cycle per second for visibility, preserving rectified flow. Meters, scope traces and sound keep the actual frequency. Low-frequency AC and mixed-frequency networks stay live.</p>` +
          `<p>Editing the circuit while it runs keeps time and stored charge. <strong>Reset time and stored energy</strong> returns capacitors and inductors to their initial values and sets t = 0. Saved files and autosave keep the circuit, not the live state: opening one starts at t = 0.</p></details>`;
    }

    // ---------- Display menu (toolbar) ----------

    function renderDisplayMenu() {
      const s = app.doc.settings;
      const toggle = (key, label) => `<label class="toggle"><span>${label}</span><input type="checkbox" data-setting="${key}" ${s[key] ? 'checked' : ''}><span class="toggle-track" aria-hidden="true"></span></label>`;
      const opt = (v, label) => `<option value="${v}" ${s.logicStyle === v ? 'selected' : ''}>${label}</option>`;
      $('display-menu').innerHTML = `<p class="icard-label">Display</p>` +
        toggle('showLabels', 'Labels') + toggle('showValues', 'Values') + toggle('currentFlow', 'Animate current') + toggle('wireColorsInDiagram', 'Wire colors in diagram') +
        `<div class="row"><label for="s-logic">Logic symbols</label><select id="s-logic" data-setting="logicStyle">${opt('distinctive', 'Standard shapes')}${opt('iec', 'IEC rectangles')}</select></div>` +
        `<p class="menu-note">Animated current shows conventional current, from + to −. Values appear beside the labels in the circuit diagram.</p>`;
    }
    const displayBtn = $('btn-display'), displayMenu = $('display-menu');
    const closeDisplay = () => { displayMenu.hidden = true; displayBtn.setAttribute('aria-expanded', 'false'); };
    displayBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (displayMenu.hidden) { renderDisplayMenu(); displayMenu.hidden = false; displayBtn.setAttribute('aria-expanded', 'true'); displayMenu.querySelector('input, select').focus(); }
      else closeDisplay();
    });
    document.addEventListener('click', (e) => { if (!displayMenu.hidden && !displayMenu.contains(e.target) && !displayBtn.contains(e.target)) closeDisplay(); });
    displayMenu.addEventListener('keydown', (e) => { if (e.key === 'Escape') { closeDisplay(); displayBtn.focus(); } });
    displayMenu.addEventListener('change', (e) => {
      const t = e.target;
      if (!t.dataset.setting) return;
      app.setSetting(t.dataset.setting, t.type === 'checkbox' ? t.checked : t.value);
    });

    // ---------- Live displays (inspector) ----------
    // A selected ammeter, voltmeter or oscilloscope shows its display large,
    // above its readings: the meter exactly as it looks on the bench, the scope
    // as a big screen. Pinned displays stay at the top of the inspector, so
    // readings can be watched while other parts are selected or adjusted.

    const LIVE_TYPES = ['ammeter', 'voltmeter', 'ohmmeter', 'scope'];
    const SCOPE_COLORS = { ch1: '#FFD43B', ch2: '#3BD8FF' };
    ui.hasLiveDisplay = (c) => !!c && LIVE_TYPES.includes(c.type);
    function liveCard(c, pinned) {
      const scope = c.type === 'scope';
      const scale = scope ? units.scopeScale(c.props, app.sim.scopes[c.id]) : null;
      const title = pinned ? `${c.label} ${scope ? 'screen' : 'display'}` : (scope ? 'Screen' : 'Display');
      const div = (v, unit) => esc(units.fmtSI(Number(v), unit, 3, { trim: true })) + '/div';
      const pin = `<button type="button" class="pin-btn" data-pin="${c.id}" aria-pressed="${pinned}" title="${pinned ? 'Unpin this display' : 'Pin: keep this display in view while you work on other parts'}">${icon('pin')}<span>${pinned ? 'Pinned' : 'Pin'}</span></button>`;
      const body = scope
        ? `<canvas class="scope-screen" aria-label="Oscilloscope ${esc(c.label)} screen"></canvas>` +
          `<p class="scope-legend"><span class="scope-ch1">CH1 <span data-scope-v1>${div(scale.v1, 'V')}</span></span><span class="scope-ch2">CH2 <span data-scope-v2>${div(scale.v2, 'V')}</span></span><span data-scope-time>${div(units.scopeTimeDiv(c.props, app.sim.scopes[c.id]), 's')}</span></p>` +
          `<label class="toggle"><span>Auto scale</span><input type="checkbox" id="scope-auto-${c.id}" data-scope-auto="${c.id}" ${c.props.autoScale ? 'checked' : ''}><span class="toggle-track" aria-hidden="true"></span></label>`
        : `<div class="meter-view" role="img" aria-label="${esc(c.label)} display"></div>`;
      return `<section class="icard live-card" data-live="${c.id}"><div class="live-head"><h3 class="icard-label">${esc(title)}</h3>${pin}</div>${body}</section>`;
    }
    // Rebuild the pinned area when the set of pinned parts changes.
    ui.renderPinned = function () {
      const host = $('pinned-displays');
      for (const id of [...app.pinned]) if (!circuit.getComp(app.doc, id)) app.pinned.delete(id);
      const comps = [...app.pinned].map((id) => circuit.getComp(app.doc, id));
      const key = comps.map((c) => `${c.id}:${c.label}:${c.props.tdiv}:${c.props.v1}:${c.props.v2}`).join('|');
      if (host.dataset.key !== key) { host.dataset.key = key; host.innerHTML = comps.map((c) => liveCard(c, true)).join(''); }
      host.hidden = comps.length === 0;
      $('pinned-resize').hidden = host.hidden;
      applyPinnedHeight();
    };
    // The pinned area grows to 45% of the inspector by default; dragging the
    // handle below it sets its maximum height instead, remembered per browser.
    const PINNED_HEIGHT_KEY = 'panphy-circuits-pinned-height-v1';
    const PINNED_MIN = 72;
    let pinnedHeight = null;
    try {
      const saved = Number(localStorage.getItem(PINNED_HEIGHT_KEY));
      if (saved >= PINNED_MIN) pinnedHeight = saved;
    } catch (e) { /* Storage unavailable: use the default height. */ }
    function savePinnedHeight() {
      try {
        if (pinnedHeight == null) localStorage.removeItem(PINNED_HEIGHT_KEY);
        else localStorage.setItem(PINNED_HEIGHT_KEY, String(Math.round(pinnedHeight)));
      } catch (e) { /* Storage unavailable: keep the height for this visit. */ }
    }
    // Largest useful height: all the pinned content, leaving room below for the
    // inspector's own cards.
    function pinnedLimit() {
      const host = $('pinned-displays');
      const handle = $('pinned-resize');
      const room = $('inspector').getBoundingClientRect().bottom - host.getBoundingClientRect().top - handle.offsetHeight - 120;
      return Math.max(PINNED_MIN, Math.min(host.scrollHeight, room));
    }
    function applyPinnedHeight() {
      const host = $('pinned-displays');
      const handle = $('pinned-resize');
      host.style.maxHeight = pinnedHeight == null ? '' : `${Math.round(pinnedHeight)}px`;
      if (host.hidden) return;
      handle.setAttribute('aria-valuemin', String(PINNED_MIN));
      const now = Math.round(host.getBoundingClientRect().height);
      handle.setAttribute('aria-valuemax', String(Math.max(now, Math.round(pinnedLimit()))));
      handle.setAttribute('aria-valuenow', String(now));
    }
    function setPinnedHeight(h) {
      pinnedHeight = Math.min(Math.max(h, PINNED_MIN), pinnedLimit());
      applyPinnedHeight();
      ui.updateLive();
    }
    {
      const handle = $('pinned-resize');
      let drag = null;
      handle.addEventListener('pointerdown', (e) => {
        if (e.button !== 0) return;
        e.preventDefault();
        drag = { id: e.pointerId, y: e.clientY, h: $('pinned-displays').getBoundingClientRect().height };
        handle.classList.add('is-dragging');
        try { handle.setPointerCapture(e.pointerId); } catch (err) { /* The pointer has already gone. */ }
      });
      handle.addEventListener('pointermove', (e) => {
        if (drag && e.pointerId === drag.id) setPinnedHeight(drag.h + e.clientY - drag.y);
      });
      const end = (e) => {
        if (!drag || e.pointerId !== drag.id) return;
        drag = null;
        handle.classList.remove('is-dragging');
        savePinnedHeight();
      };
      handle.addEventListener('pointerup', end);
      handle.addEventListener('pointercancel', end);
      handle.addEventListener('dblclick', () => { pinnedHeight = null; applyPinnedHeight(); savePinnedHeight(); ui.updateLive(); });
      handle.addEventListener('keydown', (e) => {
        const now = $('pinned-displays').getBoundingClientRect().height;
        const step = e.shiftKey ? 64 : 16;
        const next = { ArrowUp: now - step, ArrowDown: now + step, Home: PINNED_MIN, End: Infinity }[e.key];
        if (next === undefined) return;
        e.preventDefault();
        setPinnedHeight(next);
        savePinnedHeight();
      });
    }
    // Refresh every live display on show: meter artwork and scope traces.
    ui.updateLive = function () {
      for (const card of document.querySelectorAll('#inspector [data-live]')) {
        const c = circuit.getComp(app.doc, card.dataset.live);
        if (!c) continue;
        if (c.type === 'scope') { drawScope(card.querySelector('canvas'), c); continue; }
        const view = card.querySelector('.meter-view');
        const a = layout.artFor('realistic', c.type);
        const ctx = app.renderer.artCtx(c, 'realistic', 'live-' + c.id);
        ctx.r = 0; ctx.f = false;
        const [x, y, w, h] = a.bounds(c.props);
        const svg = `<svg viewBox="${x - 4} ${y - 4} ${w + 8} ${h + 8}" aria-hidden="true">${a.draw(ctx)}</svg>`;
        if (view.dataset.svg !== svg) { view.dataset.svg = svg; view.innerHTML = svg; }
      }
    };
    ui.renderLive = function () { ui.renderPinned(); ui.updateLive(); };
    $('inspector').addEventListener('click', (e) => {
      if (e.target.closest('[data-sim-run]')) { app.toggleRun(); return; }
      if (e.target.closest('[data-sim-reset]')) { app.resetSimulation(); return; }
      const b = e.target.closest('[data-pin]');
      if (!b) return;
      const id = b.dataset.pin;
      if (app.pinned.has(id)) app.pinned.delete(id); else app.pinned.add(id);
      ui.renderPinned();
      ui.renderInspector(true);
      ui.updateLive();
      app.announce(app.pinned.has(id) ? 'Display pinned' : 'Display unpinned');
    });
    $('inspector').addEventListener('change', (e) => {
      if (e.target.dataset.scopeAuto) app.setScopeAutoScale(e.target.dataset.scopeAuto, e.target.checked);
    });
    function drawScope(canvas, c) {
      if (!canvas) return;
      const s = app.sim.scopes[c.id];
      const scale = units.scopeScale(c.props, s);
      const card = canvas.closest('[data-live]');
      card.querySelector('[data-scope-auto]').checked = !!c.props.autoScale;
      for (const key of ['v1', 'v2']) card.querySelector(`[data-scope-${key}]`).textContent = units.fmtSI(scale[key], 'V', 3, { trim: true }) + '/div';
      card.querySelector('[data-scope-time]').textContent = units.fmtSI(units.scopeTimeDiv(c.props, s), 's', 3, { trim: true }) + '/div';
      const dpr = window.devicePixelRatio || 1;
      const W = canvas.clientWidth, H = canvas.clientHeight;
      if (!W || !H) return;
      if (canvas.width !== Math.round(W * dpr) || canvas.height !== Math.round(H * dpr)) { canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr); }
      const g = canvas.getContext('2d');
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.fillStyle = '#071712'; g.fillRect(0, 0, W, H);
      // 10 × 8 divisions, the center lines brighter.
      for (let i = 0; i <= 10; i++) { g.strokeStyle = i === 5 ? 'rgba(120, 220, 170, 0.45)' : 'rgba(80, 170, 130, 0.22)'; g.beginPath(); g.moveTo(i * W / 10 + 0.5, 0); g.lineTo(i * W / 10 + 0.5, H); g.stroke(); }
      for (let j = 0; j <= 8; j++) { g.strokeStyle = j === 4 ? 'rgba(120, 220, 170, 0.45)' : 'rgba(80, 170, 130, 0.22)'; g.beginPath(); g.moveTo(0, j * H / 8 + 0.5); g.lineTo(W, j * H / 8 + 0.5); g.stroke(); }
      if (!s || !s.t.length) {
        g.fillStyle = 'rgba(190, 240, 215, 0.75)'; g.font = '12px Figtree, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.fillText('Waiting for samples', W / 2, H / 2);
        return;
      }
      const span = units.scopeTimeDiv(c.props, s) * 10;
      const tEnd = Math.max(s.t[s.t.length - 1], span), t0 = tEnd - span;
      for (const [key, vdiv] of [['ch1', scale.v1], ['ch2', scale.v2]]) {
        const arr = s[key];
        g.strokeStyle = SCOPE_COLORS[key]; g.lineWidth = 2; g.lineJoin = 'round';
        g.shadowColor = SCOPE_COLORS[key]; g.shadowBlur = 4;
        g.beginPath();
        let pen = false;
        for (const i of units.scopeTraceIndices(s, key, span, Math.ceil(W * 2))) {
          const v = arr[i];
          if (!Number.isFinite(v) || s.t[i] < t0) { pen = false; continue; }
          const x = ((s.t[i] - t0) / span) * W;
          const y = Math.max(-4, Math.min(H + 4, H / 2 - (v / vdiv) * (H / 8)));
          if (pen) g.lineTo(x, y); else g.moveTo(x, y);
          pen = true;
        }
        g.stroke();
        g.shadowBlur = 0;
      }
    }

    // Live readings in the inspector, refreshed several times a second.
    ui.updateReadings = function () {
      const dl = document.getElementById('readings');
      if (!dl || !app.sim.result) { if (app.sim.result) ui.updateLive(); return; }
      const res = app.sim.result;
      let rows = [];
      if (app.selection.comps.size === 1) {
        const c = circuit.getComp(app.doc, [...app.selection.comps][0]);
        if (!c) return;
        const def = registry.get(c.type);
        const r = solver.reader(res, c);
        const noteEl = document.getElementById('meter-note');
        if (noteEl) {
          const note = app.meterNotes().find((m) => m.id === c.id);
          if (noteEl.textContent !== (note ? note.msg : '')) noteEl.textContent = note ? note.msg : '';
          noteEl.hidden = !note;
        }
        if (def.meter) {
          const m = PPC.render.meterDisplay(app, c);
          rows.push({ label: 'Display', text: m.text + (m.note ? ` (${m.note})` : ''), why: m.why, strong: true });
        }
        rows = rows.concat(def.readings(c, r).map((x) => ({ key: x.key, label: x.label, text: x.text !== undefined ? x.text : x.logic !== undefined ? `${units.fmtSI(x.value, x.unit, 3)} · ${x.logic ? 'HIGH (1)' : 'LOW (0)'}` : fmtReading(x), why: Number.isNaN(x.value) ? whyUndefined(c, res) : '' })));
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
      dl.innerHTML = rows.map((x) => `<div class="reading${x.strong ? ' is-strong' : ''}${x.key === 'dir' ? ' is-direction' : ''}"><dt>${esc(x.label)}${x.key === 'dir' ? ':' : ''}</dt><dd class="ds-readout"${x.why ? ` title="${esc(x.why)}"` : ''}>${esc(x.text)}</dd></div>`).join('');      ui.updateLive();
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
    // A small property popover uses the inspector's fields and validation.
    const quick = document.createElement('section');
    quick.className = 'quick-settings';
    quick.hidden = true;
    quick.setAttribute('role', 'dialog');
    quick.setAttribute('aria-label', 'Quick component settings');
    document.body.appendChild(quick);
    function closeQuickSettings(returnFocus = false) {
      if (quick.hidden) return;
      quick.hidden = true;
      delete quick.dataset.comp;
      if (returnFocus) $('workspace').focus({ preventScroll: true });
    }
    app.closeQuickSettings = closeQuickSettings;
    app.showQuickSettings = function (id, x, y) {
      const c = circuit.getComp(app.doc, id);
      if (!c) return;
      const def = registry.get(c.type);
      if (!def.props.length) return;
      quick.dataset.comp = id;
      quick.dataset.view = app.doc.view;
      quick.setAttribute('aria-label', `${c.label} · ${def.name} settings`);
      quick.innerHTML = def.props.map(p => field(p, c.props[p.key], 'quick-' + id, c.type === 'scope' && ((c.props.autoScale && ['v1', 'v2'].includes(p.key)) || (c.props.autoTime && p.key === 'tdiv')))).join('');
      quick.querySelectorAll('.field-range, .field-help').forEach(el => el.remove());
      quick.style.maxHeight = '';
      quick.hidden = false;
      const rect = quick.getBoundingClientRect();
      // Reserve the whole selection, including its upper-left delete button.
      // World bounds account for rotation, mirroring and upright controls.
      const b = layout.compBounds(app.doc, app.doc.view, id);
      const k = app.cameras[app.doc.view];
      const svg = $('ws-svg').getBoundingClientRect();
      const gap = 10, margin = 8;
      const left = svg.left + k.tx + (b.x - 16) * k.z - gap;
      const right = svg.left + k.tx + (b.x2 + 5) * k.z + gap;
      const top = svg.top + k.ty + (b.y - 16) * k.z - gap;
      const bottom = svg.top + k.ty + (b.y2 + 5) * k.z + gap;
      const vw = window.innerWidth, vh = window.innerHeight;
      const clamp = (v, lo, hi) => Math.max(lo, Math.min(v, hi));
      const px = clamp(x, margin, vw - margin - rect.width);
      const py = clamp(y, margin, vh - margin - rect.height);
      const candidates = [
        { x: Math.max(margin, right), y: py, width: vw - margin - Math.max(margin, right), height: vh - margin - py },
        { x: Math.min(vw - margin, left) - rect.width, y: py, width: Math.min(vw - margin, left) - margin, height: vh - margin - py },
        { x: px, y: Math.max(margin, bottom), width: vw - margin - px, height: vh - margin - Math.max(margin, bottom) },
        { x: px, y: Math.min(vh - margin, top) - rect.height, width: vw - margin - px, height: Math.min(vh - margin, top) - margin }
      ];
      const fits = candidates.filter(p => p.width >= rect.width && p.height >= rect.height);
      // Prefer a nearby full-size menu; tall menus can scroll above or below.
      const available = fits.length ? fits : candidates.filter(p => p.width >= rect.width && p.height > 0);
      available.sort((a, b) => fits.length
        ? Math.hypot(a.x - x, a.y - y) - Math.hypot(b.x - x, b.y - y)
        : b.height - a.height);
      const pos = available[0];
      if (!pos) {
        closeQuickSettings();
        app.toast('Zoom out to make room for component settings.');
        return;
      }
      quick.style.left = pos.x + 'px';
      quick.style.top = Math.max(margin, pos.y) + 'px';
      quick.style.maxHeight = Math.min(rect.height, pos.height) + 'px';
      quick.querySelector('input:not(:disabled), select:not(:disabled)').focus({ preventScroll: true });
    };
    quick.addEventListener('keydown', e => {
      // Keep workspace shortcuts out of the popover.
      e.stopPropagation();
      if (e.key === 'Escape') { e.preventDefault(); closeQuickSettings(true); }
      if (e.key === 'Enter' && e.target.matches('input[type="text"]')) { e.preventDefault(); e.target.blur(); }
      if (e.key === 'Tab') {
        const fields = [...quick.querySelectorAll('button, input:not(:disabled), select:not(:disabled)')];
        const first = fields[0], last = fields[fields.length - 1];
        if (e.shiftKey && e.target === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && e.target === last) { e.preventDefault(); first.focus(); }
      }
    });
    document.addEventListener('pointerdown', e => { if (!quick.contains(e.target)) closeQuickSettings(); }, true);
    window.addEventListener('resize', () => closeQuickSettings());
    document.addEventListener('wheel', e => { if (!quick.contains(e.target)) closeQuickSettings(); }, { capture: true, passive: true });
    function syncQuickSettings() {
      if (quick.hidden) return;
      const c = circuit.getComp(app.doc, quick.dataset.comp);
      if (!c || quick.dataset.view !== app.doc.view || app.selection.comps.size !== 1 || !app.selection.comps.has(c.id) || app.selection.wires.size) { closeQuickSettings(); return; }
      for (const input of quick.querySelectorAll('[data-prop]')) {
        const p = registry.get(c.type).props.find(p => p.key === input.dataset.prop);
        if (p.kind === 'bool') input.checked = !!c.props[p.key];
        else if (input !== document.activeElement) input.value = p.kind === 'select' ? c.props[p.key] : fmtField(p, c.props[p.key]);
        input.disabled = c.type === 'scope' && ((c.props.autoScale && ['v1', 'v2'].includes(p.key)) || (c.props.autoTime && p.key === 'tdiv'));
      }
      for (const slider of quick.querySelectorAll('[data-slider]')) {
        const p = registry.get(c.type).props.find(p => p.key === slider.dataset.slider);
        slider.value = toSlider(p, c.props[p.key]);
      }
    }
    const insp = $('inspector-body');
    function changeField(e) {
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
        if (p.operational) {
          // Plot and sound are display-only: keep scope traces and averaging windows.
          if (key === 'plot' || key === 'sound') {
            app.displayPropChanged();
            if (key === 'plot' && t.checked) app.showGraph(true);
            return;
          }
          app.operationalChanged();
          return;
        }
        app.commit(`Change ${p.label.toLowerCase()}`);
        return;
      }
      if (p.kind === 'select') { c.props[key] = t.value; app.commit(`Change ${p.label.toLowerCase()}`); return; }
      if (t.dataset.slider) { app.commit(`Change ${p.label.toLowerCase()}`, { merge: c.id + key }); return; }
      commitNumber(c, p, t);
    }
    insp.addEventListener('change', changeField);
    quick.addEventListener('change', changeField);
    function inputSlider(e) {
      const t = e.target;
      if (!t.dataset.slider) return;
      const c = circuit.getComp(app.doc, [...app.selection.comps][0]);
      if (!c || t.disabled) return;
      const p = registry.get(c.type).props.find((x) => x.key === t.dataset.slider);
      if (!p) return;
      c.props[p.key] = fromSlider(p, Number(t.value));
      for (const host of [insp, quick]) {
        const box = host.querySelector(`[data-prop="${p.key}"]`);
        if (box) {
          box.value = fmtField(p, c.props[p.key]);
          box.removeAttribute('aria-invalid');
          document.getElementById(box.id + '-err').textContent = '';
        }
        const slider = host.querySelector(`[data-slider="${p.key}"]`);
        if (slider && slider !== t) slider.value = toSlider(p, c.props[p.key]);
      }
      if (p.key === 'v0' || p.key === 'i0') app.applyInitialEnergy(c.id);
      else app.electricalChanged();
    }
    insp.addEventListener('input', inputSlider);
    quick.addEventListener('input', inputSlider);
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
      c.props[p.key] = p.integer ? Math.round(v) : v;
      // Initial capacitor/inductor energy applies as soon as the value is edited.
      if (p.key === 'v0' || p.key === 'i0') {
        app.commit(`Change ${p.label.toLowerCase()}`);
        app.applyInitialEnergy(c.id);
        return;
      }
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
      else if (act === 'rotate-ccw') app.rotateSelection(-1);
      else if (act === 'mirror') app.mirrorSelection();
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
      // Only advance the solver when needed; retain an explicit pause across edits.
      const timeMatters = app.needsTime();
      const running = timeMatters && !app.paused;
      if (sim.running !== running) sim.setRunning(running);
      document.body.classList.toggle('sim-paused', app.paused);
      const runHtml = icon(app.paused ? 'resume' : 'pause');
      document.querySelectorAll('.sim-status, .sim-controls').forEach((status) => {
        const run = status.querySelector('button');
        const buttonHtml = run.hasAttribute('data-sim-run') ? runHtml + `<span>${app.paused ? 'Resume' : 'Pause'}</span>` : runHtml;
        if (run.dataset.html !== buttonHtml) { run.innerHTML = buttonHtml; run.dataset.html = buttonHtml; }
        run.setAttribute('aria-pressed', String(app.paused));
        run.setAttribute('aria-label', app.paused ? 'Resume simulation' : 'Pause simulation');
        run.title = app.paused ? 'Resume the live circuit (Space)' : 'Pause: freeze time, traces, animations and sound; edits still update readings (Space)';
        // Keep Resume available if time-dependent parts are removed while paused.
        run.hidden = !timeMatters && !app.paused;
        status.dataset.state = app.paused ? 'paused' : sim.running ? (sim.behind ? 'behind' : 'running') : 'live';
        status.querySelector('.sim-state').textContent = app.paused ? 'Paused' : 'Live';
        status.title = !timeMatters && !app.paused ? app.NO_TIME_MSG : sim.running && sim.behind ? 'Running slower than the chosen speed: this device cannot keep up.' : '';
      });
      $('view-switch').dataset.view = app.doc.view;
      $('view-realistic').setAttribute('aria-pressed', String(app.doc.view === 'realistic'));
      $('view-schematic').setAttribute('aria-pressed', String(app.doc.view === 'schematic'));
      document.querySelectorAll('[data-tool]').forEach((b) => b.setAttribute('aria-pressed', String(app.tool === b.dataset.tool)));
      $('btn-snap').setAttribute('aria-pressed', String(app.snap));
      $('btn-graph').setAttribute('aria-pressed', String(!$('graph-panel').hidden));
      if (app.graph) app.graph.syncExports();
      $('btn-undo').disabled = !app.canUndo();
      $('btn-redo').disabled = !app.canRedo();
      const hasSel = app.selection.comps.size + app.selection.wires.size > 0;
      ['btn-duplicate', 'btn-delete'].forEach((id) => { $(id).disabled = !hasSel; });
      ['btn-rotate', 'btn-rotate-ccw', 'btn-mirror'].forEach((id) => { $(id).disabled = !app.canRotateSelection(); });
      ['btn-tidy', 'btn-clear'].forEach((id) => { $(id).disabled = app.doc.components.length === 0; });
      $('zoom-readout').textContent = 'Zoom: ' + Math.round(app.cameras[app.doc.view].z * 100) + ' %';
      $('empty-state').hidden = app.doc.components.length > 0 || app.emptyDismissed;
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
      return 'Drag parts to move them · click a terminal to start a wire · R rotates 45° · scroll or pinch to zoom.';
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
      $('examples-list').innerHTML = list.map((ex, i) => `<li><button type="button" class="example" data-example="${i}"><span class="ex-num">${i + 1}</span><span><strong>${esc(ex.title)}</strong><span>${esc(ex.summary)}</span></span></button></li>`).join('');
    };

    return ui;
  }

  PPC.ui = { createUI, icon };
})(typeof globalThis === 'object' ? globalThis : this);
