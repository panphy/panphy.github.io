// PanPhyCircuits: workspace rendering (SVG).
// Draws the active view of the shared circuit: components (from the same artwork
// used by the library), wires, junction dots, labels, terminal targets and the
// selection overlay. Dynamic artwork (lamps, meters, scopes) refreshes per frame.
(function (root) {
  const PPC = root.PPC = root.PPC || {};
  const { registry, circuit, layout, solver, units } = PPC;
  const { esc } = PPC.artCommon;

  const WIRE_HEX = {
    red: '#D7372B', black: '#2A2D33', blue: '#2F6FD6', green: '#2E9D4A',
    orange: '#EB7A1E', white: '#F2F4F7', purple: '#7E4CC9'
  };
  const DYNAMIC = new Set(['lamp', 'led', 'ammeter', 'voltmeter', 'ohmmeter', 'scope', 'dcsupply', 'logic_in', 'logic_out', 'pushswitch', 'fuse', 'motor', 'speaker',
    'gate_and', 'gate_or', 'gate_not', 'gate_nand', 'gate_nor', 'gate_xor', 'gate_xnor']);

  function shade(hex, f) {
    const v = parseInt(hex.slice(1), 16);
    const c = [(v >> 16) & 255, (v >> 8) & 255, v & 255].map((x) => Math.round(f < 0 ? x * (1 + f) : x + (255 - x) * f));
    return '#' + c.map((x) => x.toString(16).padStart(2, '0')).join('');
  }

  // True when this loudspeaker's electrical network holds a running AC supply.
  function speakerSounding(app, c) {
    if (c.type !== 'speaker' || !app.sim.running || !app.sim.compiled || !app.sim.result) return false;
    const entry = app.sim.result.comp[c.id];
    if (!entry) return false;
    const network = entry.net.a;
    return app.doc.components.some((source) => source.type === 'acsupply' && source.props.peak > 0 &&
      app.sim.compiled.networkOf[app.sim.compiled.netOf.get(source.id + ':p')] === network);
  }

  // Display text for a meter, from the solver result, never invented.
  function meterDisplay(app, c) {
    const def = registry.get(c.type);
    const res = app.sim.result;
    if (!def.meter || !res) return { text: '—' };
    const r = solver.reader(res, c);
    const inst = def.meter.value(r);
    const entry = res.comp[c.id];
    if (def.meter.overload && inst === Infinity) return { text: 'OL', why: 'Over range: an open circuit, or more than the meter can measure.' };
    if (!Number.isFinite(inst)) {
      const failed = entry && Object.values(entry.net).some((ni) => res.netOk[ni] === false);
      if (failed) return { text: 'Err', warn: true, why: 'Part of the circuit could not be solved; see the problems list.' };
      const undefinedI = res.warnings.some((w) => /Undefined current/.test(w.msg) && w.comps.includes(c.id));
      if (undefinedI) return { text: '?', warn: true, why: 'This meter is in a loop with no resistance, so the ideal model cannot give its current.' };
      return { text: '—', why: c.type === 'voltmeter' ? 'Its terminals are not in the same circuit, so there is no p.d. to measure.' : 'No reading.' };
    }
    const m = app.sim.meterValue(c, inst, c.id + ':' + def.meter.quantity);
    if (def.meter.overload && !(Math.abs(m.value) < Infinity)) return { text: 'OL', why: 'Over range: an open circuit, or more than the meter can measure.' };
    const text = units.fmtMeter(m.value, def.meter.unit, def.meter.floor);
    // Only label averaging when this meter shares a network with an AC supply.
    const hasAC = app.sim.meterPeriod(c) > 0;
    let note = '';
    if (hasAC && c.props.mode) note = m.averaged ? (c.props.mode === 'ac' ? 'AC rms' : 'DC avg') : 'inst.';
    return { text, value: m.value, note };
  }

  function createRenderer(app, svg, host) {
    svg.innerHTML = `<g class="world">
      <g class="l-wires-under"></g><g class="l-comps"></g><g class="l-wires-over"></g><g class="l-flow"></g>
      <g class="l-junctions"></g><g class="l-labels"></g><g class="l-terms"></g><g class="l-overlay"></g><g class="l-preview"></g>
    </g>`;
    const $ = (s) => svg.querySelector(s);
    const L = {
      world: $('.world'), wiresUnder: $('.l-wires-under'), comps: $('.l-comps'), wiresOver: $('.l-wires-over'), flow: $('.l-flow'),
      junctions: $('.l-junctions'), labels: $('.l-labels'), terms: $('.l-terms'), overlay: $('.l-overlay'), preview: $('.l-preview')
    };
    const dynCache = new Map();
    let routes = new Map();

    function view() { return app.doc.view; }
    function cam() { return app.cameras[view()]; }

    function artCtx(c, v, uid) {
      const def = registry.get(c.type);
      const res = app.sim.result;
      const r = res ? solver.reader(res, c) : null;
      const ctx = {
        c, p: c.props, uid, r: 0, f: false, view: v,
        st: r && def.state ? def.state(c, r) : {},
        pressed: !!app.sim.pressed[c.id],
        // A loudspeaker animates only while an AC supply drives its own network.
        sounding: speakerSounding(app, c),
        logicStyle: app.doc.settings.logicStyle,
        logic: { in: (res && res.inputs[c.id]) || {}, out: (res && res.logic[c.id]) || {} }
      };
      const pl = app.doc.layouts[v].comps[c.id];
      if (pl) { ctx.r = pl.r; ctx.f = pl.f; }
      if (def.meter) {
        const m = meterDisplay(app, c);
        ctx.display = m.text; ctx.displayWarn = m.warn; ctx.displayNote = m.note;
      }
      if (c.type === 'dcsupply' && r) {
        const i = -r.i('p');
        ctx.display2 = Number.isFinite(i) ? units.fmtSI(Math.abs(i) < 1e-7 ? 0 : i, 'A', 3) : '—';
      }
      if (c.type === 'scope') ctx.scope = app.sim.scopes[c.id];
      return ctx;
    }

    function drawArt(c, v) {
      const a = layout.artFor(v, c.type);
      return a.draw(artCtx(c, v, `${v[0]}-${c.id}`));
    }

    // ---------- Camera and grid ----------

    function applyCamera() {
      const k = cam();
      L.world.setAttribute('transform', `translate(${k.tx} ${k.ty}) scale(${k.z})`);
      const g = 20 * k.z;
      host.style.setProperty('--grid', g + 'px');
      host.style.setProperty('--grid5', g * 5 + 'px');
      host.style.backgroundPosition = `${k.tx}px ${k.ty}px`;
      host.dataset.zoom = k.z < 0.5 ? 'far' : 'near';
      renderTerminals();
    }

    // ---------- Components ----------

    function renderComps() {
      const v = view();
      const parts = [];
      dynCache.clear();
      for (const c of app.doc.components) {
        const pl = app.doc.layouts[v].comps[c.id];
        if (!pl) continue;
        const a = layout.artFor(v, c.type);
        const [bx, by, bw, bh] = a.bounds(c.props);
        const artSvg = drawArt(c, v);
        if (DYNAMIC.has(c.type)) dynCache.set(c.id, artSvg);
        const act = a.actuator ? a.actuator(c.props, pl) : null;
        const err = app.problemComps.has(c.id) ? ' is-problem' : app.noteComps.has(c.id) ? ' is-note' : '';
        const name = `${c.label}, ${registry.get(c.type).name}`;
        parts.push(`<g class="comp comp-${c.type}${err}" data-id="${c.id}" transform="${layout.svgTransform(pl)}">` +
          `<rect class="hit" data-hit="comp" data-id="${c.id}" x="${bx}" y="${by}" width="${bw}" height="${bh}" rx="6"><title>${esc(name)}</title></rect>` +
          `<g class="art" data-hit="comp" data-id="${c.id}">${artSvg}</g>` +
          (act ? actRect(act, c, pl) : '') +
          `</g>`);
      }
      L.comps.innerHTML = parts.join('');
    }

    // A control's hit area. An upright control (a sensor's badge slider) keeps
    // its orientation however the part is turned, like the badge it covers.
    function actRect(act, c, pl) {
      const rect = `<rect class="act act-${act.kind}" data-hit="act" data-id="${c.id}" x="${act.rect[0]}" y="${act.rect[1]}" width="${act.rect[2]}" height="${act.rect[3]}" rx="6"><title>${esc(actTitle(act.kind, c))}</title></rect>`;
      if (!act.upright) return rect;
      return `<g transform="translate(${act.cx} ${act.cy}) scale(${pl.f ? -1 : 1} 1) rotate(${-90 * layout.normRot(pl.r)})">${rect}</g>`;
    }

    function actTitle(kind, c) {
      if (kind === 'toggle') return `Click to operate ${c.label}`;
      if (kind === 'momentary') return `Press and hold ${c.label}`;
      return `Drag to adjust ${c.label}`;
    }

    // Refresh artwork whose appearance depends on the simulation.
    function updateDynamic() {
      const v = view();
      for (const c of app.doc.components) {
        if (!DYNAMIC.has(c.type) || !app.doc.layouts[v].comps[c.id]) continue;
        const s = drawArt(c, v);
        if (dynCache.get(c.id) === s) continue;
        dynCache.set(c.id, s);
        const g = L.comps.querySelector(`.comp[data-id="${c.id}"] > .art`);
        if (g) g.innerHTML = s;
      }
      renderLabels();
    }

    // ---------- Wires ----------

    function renderWires() {
      const v = view();
      const doc = app.doc;
      routes = layout.routeAll(doc, v);
      const hops = v === 'schematic' ? computeHops(doc) : null;
      const colorInDiagram = doc.settings.wireColorsInDiagram;
      // Resolve neutral schematic colors now so standalone exports keep the same contrast.
      const diagramStyle = v === 'schematic' && colorInDiagram ? getComputedStyle(host) : null;
      const parts = [];
      for (const w of doc.wires) {
        const r = routes.get(w.id);
        if (!r) continue;
        const d = hops && hops.has(w.id) ? hops.get(w.id) : r.d;
        const hex = WIRE_HEX[w.color] || WIRE_HEX.blue;
        const sel = app.selection.wires.has(w.id) ? ' is-selected' : '';
        if (v === 'realistic') {
          parts.push(`<g class="wire${sel}" data-id="${w.id}">` +
            `<path class="wire-hit" data-hit="wire" data-id="${w.id}" d="${r.d}"/>` +
            `<path class="wire-sel" d="${r.d}"/>` +
            `<path d="${r.d}" fill="none" stroke="${shade(hex, -0.45)}" stroke-width="6.4" stroke-linecap="round" stroke-linejoin="round" pointer-events="none"/>` +
            `<path d="${r.d}" fill="none" stroke="${hex}" stroke-width="4.4" stroke-linecap="round" stroke-linejoin="round" pointer-events="none"/>` +
            `<path d="${r.d}" fill="none" stroke="#fff" stroke-opacity="${w.color === 'white' ? 0.9 : 0.32}" stroke-width="1.3" stroke-linecap="round" transform="translate(-0.6 -1)" pointer-events="none"/>` +
            plug(r.a, hex) + plug(r.b, hex) + `</g>`);
        } else {
          const neutral = diagramStyle && (w.color === 'black' || w.color === 'white')
            ? diagramStyle.getPropertyValue(`--sch-wire-${w.color}`).trim() : '';
          const style = colorInDiagram ? ` style="stroke:${neutral || hex}"` : '';
          parts.push(`<g class="wire${sel}" data-id="${w.id}">` +
            `<path class="wire-hit" data-hit="wire" data-id="${w.id}" d="${r.d}"/>` +
            `<path class="wire-sel" d="${d}"/>` +
            `<path class="sch-wire" d="${d}"${style} pointer-events="none"/></g>`);
        }
      }
      const html = parts.join('');
      if (v === 'realistic') { L.wiresOver.innerHTML = html; L.wiresUnder.innerHTML = ''; }
      else { L.wiresUnder.innerHTML = html; L.wiresOver.innerHTML = ''; }
      renderJunctions();
    }

    function plug(p, hex) {
      return `<circle cx="${p.x}" cy="${p.y}" r="4.6" fill="${shade(hex, -0.35)}" pointer-events="none"/><circle cx="${p.x}" cy="${p.y}" r="2.6" fill="${shade(hex, 0.25)}" pointer-events="none"/>`;
    }

    // Small hops where one wire crosses another without a junction, so a crossing
    // can never be mistaken for a connection.
    function computeHops(doc) {
      const segs = [];
      for (const w of doc.wires) {
        const r = routes.get(w.id);
        if (!r) continue;
        for (let i = 0; i < r.poly.length - 1; i++) segs.push({ w: w.id, a: r.poly[i], b: r.poly[i + 1] });
      }
      const verticals = segs.filter((s) => Math.abs(s.a.x - s.b.x) < 1e-6 && Math.abs(s.a.y - s.b.y) > 1e-6);
      const out = new Map();
      for (const w of doc.wires) {
        const r = routes.get(w.id);
        if (!r) continue;
        let d = `M ${r.poly[0].x} ${r.poly[0].y}`;
        let any = false;
        for (let i = 0; i < r.poly.length - 1; i++) {
          const a = r.poly[i], b = r.poly[i + 1];
          const horiz = Math.abs(a.y - b.y) < 1e-6 && Math.abs(a.x - b.x) > 1e-6;
          if (horiz) {
            const dir = Math.sign(b.x - a.x);
            const xs = verticals.filter((s) => s.w !== w.id && Math.min(s.a.y, s.b.y) < a.y - 0.5 && Math.max(s.a.y, s.b.y) > a.y + 0.5 &&
              (s.a.x - a.x) * dir > 7 && (b.x - s.a.x) * dir > 7).map((s) => s.a.x).sort((p, q) => (p - q) * dir);
            for (const x of xs) {
              d += ` L ${x - 5 * dir} ${a.y} A 5 5 0 0 ${dir > 0 ? 1 : 0} ${x + 5 * dir} ${a.y}`;
              any = true;
            }
          }
          d += ` L ${b.x} ${b.y}`;
        }
        if (any) out.set(w.id, d);
      }
      return out;
    }

    function renderJunctions() {
      const v = view();
      const doc = app.doc;
      const counts = circuit.terminalWireCounts(doc);
      const parts = [];
      for (const c of doc.components) {
        const pl = doc.layouts[v].comps[c.id];
        if (!pl || c.type !== 'junction') continue;
        if ((counts.get(c.id + ':j') || 0) <= 1) parts.push(`<g class="dangling"><circle cx="${pl.x}" cy="${pl.y}" r="6"/><title>Dangling wire end: connect it to a terminal or delete it</title></g>`);
      }
      if (v === 'schematic') for (const p of layout.branchPoints(doc, routes)) parts.push(`<circle class="jdot" cx="${p.x}" cy="${p.y}" r="4.2"/>`);
      L.junctions.innerHTML = parts.join('');
    }

    // ---------- Labels ----------

    function renderLabels() {
      const v = view();
      const doc = app.doc;
      const { showLabels, showValues } = doc.settings;
      if (!showLabels && !showValues) { L.labels.innerHTML = ''; return; }
      const parts = [];
      for (const c of doc.components) {
        const def = registry.get(c.type);
        if (def.hiddenLabel) continue;
        const b = layout.compBounds(doc, v, c.id);
        if (!b) continue;
        // Values sit beside labels in the circuit diagram; realistic parts show theirs.
        const val = showValues && v === 'schematic' ? def.valueText(c) : '';
        const text = [showLabels ? c.label : '', val].filter(Boolean).join('  ');
        if (!text) continue;
        const pl = doc.layouts[v].comps[c.id];
        const side = v === 'schematic' && (c.type === 'npn' || c.type === 'pnp');
        const vertical = side || ((layout.quarterTurn(pl.r) & 1) === 1 && !['scope', 'dcsupply', 'acsupply', 'ammeter', 'voltmeter', 'ohmmeter'].includes(c.type));
        let x, y, anchor;
        const art = layout.artFor(v, c.type);
        const sensor = v === 'realistic' && ['ldr', 'thermistor'].includes(c.type);
        const meter = v === 'schematic' && art.readingPill && (layout.quarterTurn(pl.r) & 1);
        if (sensor || meter) {
          const reading = sensor ? art.actuator(c.props, pl) : art.readingPill(artCtx(c, v, `label-${c.id}`));
          const center = layout.xform(pl, reading.cx, reading.cy);
          x = center.x;
          y = center.y - (sensor ? 20 : 19);
          anchor = 'middle';
        } else if (vertical) {
          // Beside the part, on the side without a terminal sticking out.
          const cx = (b.x + b.x2) / 2;
          const right = registry.get(c.type).terminals.some((t) => { const p = layout.termWorld(doc, v, { c: c.id, t: t.id }); return p && p.x > cx + 10 && p.x >= b.x2 - 2; });
          const left = registry.get(c.type).terminals.some((t) => { const p = layout.termWorld(doc, v, { c: c.id, t: t.id }); return p && p.x < cx - 10 && p.x <= b.x + 2; });
          if (right && !left) { x = b.x - 8; anchor = 'end'; } else { x = b.x2 + 8; anchor = 'start'; }
          y = (b.y + b.y2) / 2;
        } else { x = (b.x + b.x2) / 2; y = b.y - 9; anchor = 'middle'; }
        parts.push(`<text class="clabel clabel-${v}" x="${x}" y="${y}" text-anchor="${anchor}" dominant-baseline="central">${esc(text)}</text>`);
      }
      L.labels.innerHTML = parts.join('');
    }

    // ---------- Terminals ----------

    function renderTerminals() {
      const v = view();
      const doc = app.doc;
      const counts = circuit.terminalWireCounts(doc);
      const z = cam().z;
      const hitR = Math.min(22, Math.max(8, 13 / z));
      const wiring = app.editor && app.editor.wiring;
      const parts = [];
      for (const c of doc.components) {
        if (!doc.layouts[v].comps[c.id]) continue;
        const def = registry.get(c.type);
        for (const t of def.terminals) {
          const p = layout.termWorld(doc, v, { c: c.id, t: t.id });
          if (!p) continue;
          const k = counts.get(c.id + ':' + t.id) || 0;
          const isJ = c.type === 'junction';
          const isFrom = wiring && wiring.from && wiring.from.c === c.id && wiring.from.t === t.id;
          const target = wiring && !isFrom;
          const cls = ['term', k === 0 && !isJ ? 'is-open' : '', target ? 'is-target' : '', isFrom ? 'is-from' : '', isJ ? 'is-junction' : ''].join(' ');
          parts.push(`<g class="${cls}" data-hit="term" data-c="${c.id}" data-t="${t.id}">` +
            `<circle class="term-hit" cx="${p.x}" cy="${p.y}" r="${isJ ? Math.max(hitR, 9) : hitR}"/>` +
            `<circle class="term-ring" cx="${p.x}" cy="${p.y}" r="${isJ ? 7 : 5.5}"/>` +
            `<title>${esc(`${c.label}: ${t.name}${k ? ` (${k} wire${k > 1 ? 's' : ''})` : ' (not connected)'}`)}</title></g>`);
        }
      }
      L.terms.innerHTML = parts.join('');
    }

    // ---------- Selection overlay ----------

    function renderOverlay() {
      const v = view();
      const doc = app.doc;
      const parts = [];
      for (const id of app.selection.comps) {
        const b = layout.compBounds(doc, v, id);
        if (!b) continue;
        parts.push(`<rect class="sel-box" x="${b.x - 5}" y="${b.y - 5}" width="${b.x2 - b.x + 10}" height="${b.y2 - b.y + 10}" rx="8"/>`);
      }
      if (app.selection.wires.size === 1 && app.selection.comps.size === 0) {
        const id = [...app.selection.wires][0];
        const w = circuit.getWire(doc, id);
        const r = w && routes.get(id);
        if (r) {
          // An automatic diagram route shows a handle on each of its segments.
          const autoSch = v === 'schematic' && !r.pts.length;
          const ctrl = autoSch ? r.poly : [r.a].concat(r.pts.map(([x, y]) => ({ x, y })), [r.b]);
          for (let i = 0; i < ctrl.length - 1; i++) {
            const a = ctrl[i], b = ctrl[i + 1];
            const sub = autoSch ? [a, b] : v === 'schematic'
              ? layout.orthoRoute(a, i === 0 ? { x: r.a.dx, y: r.a.dy } : { x: 0, y: 0 }, [], b, i === ctrl.length - 2 ? { x: r.b.dx, y: r.b.dy } : { x: 0, y: 0 })
              : null;
            const mid = sub ? layout.pointAtFraction(sub, 0.5) : { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
            if (v !== 'schematic') {
              const q = layout.nearestOnPoly(r.poly, mid);
              mid.x = q.x; mid.y = q.y;
            }
            parts.push(`<g class="handle handle-mid" data-hit="mid" data-id="${id}" data-i="${i}"><circle cx="${mid.x}" cy="${mid.y}" r="9" class="handle-hit"/><circle cx="${mid.x}" cy="${mid.y}" r="5"/><path d="M ${mid.x - 2.6} ${mid.y} H ${mid.x + 2.6} M ${mid.x} ${mid.y - 2.6} V ${mid.y + 2.6}"/><title>Drag to add a bend</title></g>`);
          }
          r.pts.forEach(([x, y], i) => {
            parts.push(`<g class="handle handle-wp" data-hit="wp" data-id="${id}" data-i="${i}"><circle cx="${x}" cy="${y}" r="10" class="handle-hit"/><rect x="${x - 5}" y="${y - 5}" width="10" height="10" rx="2"/><title>Drag to move this bend; double-click to remove it</title></g>`);
          });
          for (const end of ['a', 'b']) {
            const p = r[end];
            parts.push(`<g class="handle handle-end" data-hit="end" data-id="${id}" data-end="${end}"><circle cx="${p.x}" cy="${p.y}" r="11" class="handle-hit"/><circle cx="${p.x}" cy="${p.y}" r="6.5"/><title>Drag onto another terminal to reconnect this end</title></g>`);
          }
        }
      }
      // Keep quick-delete controls above wire handles and outside symbol artwork.
      const deleteButton = (id, kind, x, y) => parts.push(`<g class="selection-delete" data-hit="delete" data-id="${id}" data-object-kind="${kind}" transform="translate(${x} ${y})" role="button" tabindex="0" aria-label="Delete ${kind === 'comp' ? 'component' : 'wire'}"><title>Delete ${kind === 'comp' ? 'component' : 'wire'}</title><circle r="11"/><path d="M -3.5 -3.5 L 3.5 3.5 M 3.5 -3.5 L -3.5 3.5"/></g>`);
      for (const id of app.selection.comps) {
        const b = layout.compBounds(doc, v, id);
        if (b) deleteButton(id, 'comp', b.x - 5, b.y - 5);
      }
      for (const id of app.selection.wires) {
        const r = routes.get(id);
        if (!r) continue;
        // Beside the middle of the wire, on its upper side, clear of the bend handles.
        if (r.poly.length < 2) continue;
        const m = layout.pointAtFraction(r.poly, 0.5);
        const a = r.poly[m.index], b = r.poly[m.index + 1] || a;
        const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
        let nx = -(b.y - a.y) / len, ny = (b.x - a.x) / len;
        if (ny > 0 || (ny === 0 && nx > 0)) { nx = -nx; ny = -ny; }
        deleteButton(id, 'wire', m.x + nx * 22, m.y + ny * 22);
      }
      L.overlay.innerHTML = parts.join('');
      // Selected wires get a highlight class.
      svg.querySelectorAll('.wire').forEach((g) => g.classList.toggle('is-selected', app.selection.wires.has(g.dataset.id)));
      svg.querySelectorAll('.comp').forEach((g) => g.classList.toggle('is-selected', app.selection.comps.has(g.dataset.id)));
    }

    function renderAll() {
      host.classList.toggle('view-realistic', view() === 'realistic');
      host.classList.toggle('view-schematic', view() === 'schematic');
      renderComps();
      renderWires();
      renderLabels();
      renderTerminals();
      renderOverlay();
      applyCamera();
    }

    // Lightweight update while dragging components or bends.
    function renderMove(ids) {
      const v = view();
      for (const id of ids) {
        const g = L.comps.querySelector(`.comp[data-id="${id}"]`);
        const pl = app.doc.layouts[v].comps[id];
        if (g && pl) g.setAttribute('transform', layout.svgTransform(pl));
      }
      renderWires();
      renderLabels();
      renderTerminals();
      renderOverlay();
    }

    function setPreview(markup) { L.preview.innerHTML = markup || ''; }

    function route(id) { return routes.get(id); }

    // ---------- Current flow animation ----------
    // Conventional current along wires. Wire currents come from the solver's
    // terminal currents (KCL over each net's wire tree); speed is illustrative.
    const flowAnimation = createFlowAnimation(app);
    const flowOffsets = new Map();
    function updateFlow(dtReal) {
      const doc = app.doc;
      const currents = flowAnimation.update(dtReal);
      const note = document.getElementById('flow-note');
      if (note) note.hidden = !flowAnimation.slowed;
      if (!doc.settings.currentFlow || !app.sim.result) { if (L.flow.innerHTML) L.flow.innerHTML = ''; return; }
      const parts = [];
      for (const w of doc.wires) {
        const r = routes.get(w.id);
        const I = currents.get(w.id);
        if (!r || !Number.isFinite(I) || Math.abs(I) < 1e-6) continue;
        const speed = Math.min(160, 30 + 26 * Math.log10(1 + Math.abs(I) * 1e3));
        // Integrate displacement so reversals and changes in current stay smooth.
        const off = ((flowOffsets.get(w.id) || 0) - Math.sign(I) * speed * dtReal) % 24;
        flowOffsets.set(w.id, off);
        parts.push(`<path d="${r.d}" class="flow" style="stroke-dashoffset:${off.toFixed(1)}"/>`);
      }
      const wireIds = new Set(doc.wires.map((w) => w.id));
      for (const id of flowOffsets.keys()) if (!wireIds.has(id)) flowOffsets.delete(id);
      L.flow.innerHTML = parts.join('');
    }

    return { renderAll, renderMove, renderOverlay, renderTerminals, renderWires, renderLabels, updateDynamic, applyCamera, setPreview, route, updateFlow,
      sampleFlow: flowAnimation.sample, artCtx, drawArt };
  }

  // Replay measured wire-current waveforms at one visual cycle per second.
  // The live solver, instrument traces and audio are never changed. Sampling a
  // whole cycle preserves rectification, phase shifts and DC offsets rather than
  // inventing a sine wave for every wire. Each independent network has its own
  // frequency. Mixed-frequency networks retain live animation, since one period
  // cannot represent their combined waveform reliably.
  function createFlowAnimation(app) {
    const SAMPLE_BINS = 64;
    let compiled, config, elapsed = 0;
    let profiles = [];
    const animation = { slowed: false, sample, update };

    function sync() {
      const next = app.sim.compiled;
      const key = `${app.doc.settings.currentFlow}:${app.doc.settings.speed}:${app.sim.dt}`;
      if (compiled === next && config === key) return;
      compiled = next; config = key; elapsed = 0; profiles = [];
      if (!compiled || !app.doc.settings.currentFlow) return;
      const frequencies = new Map();
      for (const c of app.doc.components) {
        if (c.type !== 'acsupply' || !(c.props.peak > 0)) continue;
        const network = compiled.networkOf[compiled.netOf.get(c.id + ':p')];
        if (!frequencies.has(network)) frequencies.set(network, new Set());
        frequencies.get(network).add(c.props.freq);
      }
      for (const [network, values] of frequencies) {
        if (values.size !== 1) continue;
        const frequency = [...values][0];
        // Respect intentional slow motion and require enough actual solver samples.
        if (frequency * app.doc.settings.speed <= 1 || app.sim.dt * frequency > 1 / 16) continue;
        const wires = app.doc.wires.filter((w) => compiled.networkOf[compiled.netOf.get(w.a.c + ':' + w.a.t)] === network).map((w) => w.id);
        if (wires.length) profiles.push({ frequency, wires, phase: (app.sim.t * frequency) % 1, nextCapture: app.sim.t, capture: null, waveform: null });
      }
    }

    function sample(result) {
      if (!app.doc.settings.currentFlow) return;
      sync();
      let currents;
      const t = app.sim.t;
      for (const p of profiles) {
        if (t < p.nextCapture) continue;
        if (!p.capture) p.capture = { start: t, bins: new Map() };
        const phase = ((t * p.frequency) % 1 + 1) % 1;
        const bin = Math.floor(phase * SAMPLE_BINS);
        if (!p.capture.bins.has(bin)) {
          if (!currents) currents = wireCurrents(app, result);
          p.capture.bins.set(bin, { phase, currents: new Map(p.wires.map((id) => [id, currents.get(id)])) });
        }
        if (t - p.capture.start >= 1 / p.frequency) {
          const points = [...p.capture.bins.values()].sort((a, b) => a.phase - b.phase);
          p.waveform = points.length >= 16 ? points : null;
          p.capture = null;
          // Bound capture work even for kHz sources; refresh transient envelopes.
          p.nextCapture = t + 0.25;
        }
      }
    }

    function update(dtReal) {
      sync();
      elapsed += dtReal;
      animation.slowed = false;
      if (!app.doc.settings.currentFlow) return new Map();
      const currents = app.sim.result ? wireCurrents(app) : new Map();
      for (const p of profiles) {
        if (!p.waveform) continue;
        animation.slowed = true;
        const phase = (p.phase + elapsed) % 1;
        const points = p.waveform;
        let i = points.findIndex((point) => point.phase > phase);
        if (i < 0) i = 0;
        const right = points[i], left = points[(i + points.length - 1) % points.length];
        const span = (right.phase - left.phase + 1) % 1;
        const fraction = span > 0 ? ((phase - left.phase + 1) % 1) / span : 0;
        for (const id of p.wires) {
          const a = left.currents.get(id), b = right.currents.get(id);
          currents.set(id, Number.isFinite(a) && Number.isFinite(b) ? a + (b - a) * fraction : NaN);
        }
      }
      return currents;
    }
    return animation;
  }

  // Current in each wire, positive from end a to end b. Within a net the wires
  // form a graph; currents are found on a spanning tree from the terminal currents
  // (any extra loop wire would be ambiguous and gets no animation).
  function wireCurrents(app, result = app.sim.result) {
    const doc = app.doc, res = result;
    const out = new Map();
    const inject = new Map();
    for (const c of doc.components) {
      const e = res.comp[c.id];
      if (!e) continue;
      for (const t of Object.keys(e.i)) inject.set(c.id + ':' + t, -e.i[t]);
    }
    const adj = new Map();
    for (const w of doc.wires) {
      const a = w.a.c + ':' + w.a.t, b = w.b.c + ':' + w.b.t;
      if (!adj.has(a)) adj.set(a, []);
      if (!adj.has(b)) adj.set(b, []);
      adj.get(a).push({ w, other: b, sign: 1 });
      adj.get(b).push({ w, other: a, sign: -1 });
    }
    const seen = new Set();
    for (const start of adj.keys()) {
      if (seen.has(start)) continue;
      // BFS tree, then accumulate subtree injections from the leaves up.
      const order = [start], parent = new Map([[start, null]]);
      seen.add(start);
      for (let i = 0; i < order.length; i++) {
        for (const e of adj.get(order[i])) {
          if (seen.has(e.other)) continue;
          seen.add(e.other);
          parent.set(e.other, { from: order[i], e });
          order.push(e.other);
        }
      }
      const sub = new Map(order.map((k) => [k, inject.get(k) ?? 0]));
      for (let i = order.length - 1; i > 0; i--) {
        const k = order[i];
        const p = parent.get(k);
        const flow = sub.get(k); // current flowing from k into the parent side... reversed: injection leaves k toward parent
        // Current from parent to k along the wire is -flow.
        const I = -flow;
        out.set(p.e.w.id, p.e.sign > 0 ? I : -I);
        sub.set(p.from, sub.get(p.from) + flow);
      }
    }
    return out;
  }

  // Standalone SVG of the active view for export, with resolved theme colors.
  function exportSvg(app, svg) {
    const v = app.doc.view;
    const b = layout.viewBounds(app.doc, v);
    if (!b) return null;
    // Include labels, upright pills, and routed wire curves beyond nominal bounds.
    for (const layer of svg.querySelectorAll('.l-comps, .l-labels, .l-wires-under, .l-wires-over, .l-junctions')) {
      if (!layer.children.length) continue;
      const box = layer.getBBox();
      b.x = Math.min(b.x, box.x); b.y = Math.min(b.y, box.y);
      b.x2 = Math.max(b.x2, box.x + box.width); b.y2 = Math.max(b.y2, box.y + box.height);
    }
    const pad = 40;
    const x = b.x - pad, y = b.y - pad - 10, w = b.x2 - b.x + 2 * pad, h = b.y2 - b.y + 2 * pad + 10;
    const cs = getComputedStyle(svg.closest('.workspace'));
    const ink = cs.getPropertyValue('--sch-ink').trim() || '#1B2230';
    const paper = cs.getPropertyValue('--sch-paper').trim() || '#fff';
    const bg = v === 'schematic' ? paper : (cs.getPropertyValue('--bench').trim() || '#E8EBF0');
    const world = svg.querySelector('.world').cloneNode(true);
    world.removeAttribute('transform');
    world.querySelectorAll('.l-terms, .l-overlay, .l-preview, .l-flow, .hit, .act, .wire-hit, .wire-sel, title').forEach((n) => n.remove());
    const style = `
      .sch-line{fill:none;stroke:${ink};stroke-width:2.4;stroke-linecap:round;stroke-linejoin:round}
      .sch-thick{stroke-width:5}.sch-plate{stroke-width:3}
      .sch-body{fill:${paper};stroke:${ink};stroke-width:2.4;stroke-linejoin:round}
      .sch-fill{fill:${ink}} .sch-screen{fill:none;stroke:${ink};stroke-width:1}
      .sch-wire{fill:none;stroke:${ink};stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round}
      .jdot{fill:${ink}} .dangling circle{fill:none;stroke:#D9480F;stroke-width:2}
      text{font-family:Figtree,Arial,sans-serif}
      .sch-pol,.sch-pin,.sch-tag,.sch-letter,.sch-iec,.sch-level{fill:${ink}}
      .sch-pol{font-size:13px;font-weight:700}.sch-pin{font-size:9px;font-weight:600}.sch-tag{font-size:10px;font-style:italic}
      .sch-letter{font-size:16px;font-weight:700}.sch-iec{font-size:13px;font-weight:700}.sch-level{font-size:9px;font-family:monospace}
      .sch-pill{fill:${paper};stroke:${ink};stroke-width:1}.sch-pill-text{fill:${ink};font-family:monospace;font-size:11px}
      .clabel{fill:${ink};font-size:11px;font-weight:600}
      ${artTextCss()}`;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x} ${y} ${w} ${h}" width="${Math.round(w * 2)}" height="${Math.round(h * 2)}">` +
      `<style>${style}</style><defs>${PPC.artCommon.defs()}</defs><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${bg}"/>` +
      world.innerHTML + `</svg>`;
  }

  function artTextCss() {
    return `.ppc-print{font-size:9px;font-weight:700;fill:#fff}.ppc-print-dark{fill:#3A1F08}.ppc-print-tiny{font-size:7px}
      .ppc-pol{font-size:13px;font-weight:800}.ppc-pol-pos{fill:#D7372B}.ppc-pol-neg{fill:#20242B}
      .ppc-mark{font-size:12px;font-weight:800}.ppc-mark-dark{fill:#4A3310}
      .ppc-seg{font-family:monospace;font-size:14px;fill:#7CFFB2}.ppc-seg-small{font-size:9px}
      .ppc-panel-mark{font-size:13px;font-weight:800;fill:#fff}.ppc-panel-label{font-size:8px;font-weight:700;fill:#C9CFD8}
      .ppc-panel-tiny{font-size:6px;font-weight:700;fill:#C9CFD8}.ppc-dark{fill:#3A404B}
      .ppc-lcd{font-family:monospace;font-size:14px;fill:#16210F}.ppc-lcd-note{font-size:6px;fill:#33452A}
      .ppc-meter-letter{font-size:13px;font-weight:800;fill:#fff}
      .ppc-pin{font-size:8px;font-weight:700;fill:#596170}.ppc-pin-light{fill:#fff}.ppc-pin-dark{fill:#5A3D15}
      .ppc-face{font-size:7px;font-weight:700;fill:#E9ECF0}
      .ppc-badge{fill:#fff;stroke:#B9C0CB;stroke-width:1}.ppc-badge-text{font-size:8px;font-weight:700;fill:#2A3140}.ppc-badge-track{fill:#DDE1E7}.ppc-badge-level{fill:#D9480F}
      .ppc-badge-icon{fill:#D9480F}.ppc-badge-stroke{stroke:#D9480F;stroke-width:1.3}
      .ppc-silk .sch-line,.ppc-silk .sch-body{stroke:#EAF2FF;fill:none}.ppc-silk-text{font-size:8px;font-weight:700;fill:#EAF2FF}
      .ppc-silk-title{font-size:11px;font-weight:800;fill:#fff}.ppc-silk-tiny{font-size:5.5px;font-weight:700;fill:#B8CCE4}
      .ppc-trace{stroke:#C9A13B;stroke-width:2;fill:none}.ppc-rail-label{font-size:9px;font-weight:800;fill:#3A404B}
      .ppc-scope-text{font-family:monospace;font-size:6px;fill:#9EF0C8}.ppc-scope-ch1{fill:#FFE14D}.ppc-scope-ch2{fill:#4FE3FF}`;
  }

  PPC.render = { createRenderer, createFlowAnimation, meterDisplay, wireCurrents, exportSvg, WIRE_HEX, shade };
})(typeof globalThis === 'object' ? globalThis : this);
