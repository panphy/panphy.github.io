// PanPhyCircuits: graph of meter and oscilloscope readings against time, or against one of
// the plotted readings (an X–Y graph, such as current against p.d. for an I–V curve).
// Every value plotted here is a sample recorded by the solver at a committed
// time step; nothing is interpolated or smoothed.
(function (root) {
  const PPC = root.PPC = root.PPC || {};
  const { units, registry } = PPC;
  const R = root.PanPhyGraphRange;

  // Distinct, color-blind-aware trace colors (dashes also differ per unit).
  const COLORS = ['#2563EB', '#E8590C', '#0F9D58', '#AE3EC9', '#C2255C', '#0B7285', '#7048E8', '#5C940D'];

  function quantityLabel(unit, channel) {
    if (channel === 'ch1') return 'CH1';
    if (channel === 'ch2') return 'CH2';
    if (unit === 'A') return 'current';
    if (unit === 'Ω') return 'resistance';
    return 'p.d.';
  }

  // Ammeter, voltmeter, ohmmeter (meter) and oscilloscope channels with Plot on.
  function plottedSeries(app) {
    const out = [];
    let i = 0;
    for (const c of app.doc.components) {
      if (!c.props.plot) continue;
      const def = registry.get(c.type);
      if (def.meter) {
        out.push({
          key: c.id + ':' + def.meter.quantity,
          label: c.label,
          unit: def.meter.unit,
          color: COLORS[i++ % COLORS.length],
          comp: c,
          kind: 'meter'
        });
      }
      if (def.channels) {
        for (const ch of def.channels) {
          out.push({
            key: c.id + ':' + ch.key,
            label: `${c.label} ${ch.label}`,
            unit: ch.unit,
            color: COLORS[i++ % COLORS.length],
            comp: c,
            kind: 'channel',
            channel: ch.key
          });
        }
      }
    }
    return out;
  }

  // A reading's name on an axis: "V1 p.d.", or "S1 CH1" for a scope channel.
  function seriesName(s) { return s.channel ? s.label : `${s.label} ${quantityLabel(s.unit, s.channel)}`; }

  // The plotted reading chosen for the x-axis, or null for time.
  function xSeries(app, list = plottedSeries(app)) {
    const key = app.doc.settings.graphX;
    return key && key !== 't' ? list.find((s) => s.key === key) || null : null;
  }

  function timeBounds(app, tr) {
    return R.bounds(tr.t, app.graphRange);
  }

  function sampleRows(app, list) {
    const tr = app.sim.traces;
    const { t0, t1 } = timeBounds(app, tr);
    const rows = [];
    for (let i = 0; i < tr.t.length; i++) {
      const t = tr.t[i];
      if (t < t0 || t > t1 + 1e-15) continue;
      const values = {};
      for (const s of list) {
        const arr = tr.series[s.key] || [];
        const v = arr[i];
        values[s.key] = Number.isFinite(v) ? v : null;
      }
      rows.push({ t, values });
    }
    return { t0, t1, rows };
  }

  function hasExportData(app) {
    const list = plottedSeries(app);
    if (!list.length) return false;
    return sampleRows(app, list).rows.some((row) => list.some((s) => row.values[s.key] !== null));
  }

  function formatCell(value) {
    if (value === null || value === undefined) return '';
    if (!Number.isFinite(value)) return '';
    return String(Number(value.toPrecision(6)));
  }

  function toCSV(app) {
    const list = plottedSeries(app);
    const { rows } = sampleRows(app, list);
    const header = ['t (s)', ...list.map((s) => `${s.label} (${s.unit})`)];
    const escape = (value) => '"' + String(value).replaceAll('"', '""') + '"';
    const lines = [header.map(escape).join(',')];
    for (const row of rows) {
      lines.push([formatCell(row.t), ...list.map((s) => formatCell(row.values[s.key]))].map(escape).join(','));
    }
    return lines.join('\n') + '\n';
  }

  function panPhyPlotPayload(app) {
    const list = plottedSeries(app);
    const xs = xSeries(app, list);
    const { rows } = sampleRows(app, list);
    const columns = [
      { name: 't', unit: 's', role: xs ? 'none' : 'X', cells: rows.map((row) => formatCell(row.t)) }
    ];
    // On an X–Y graph the chosen reading is the X column, so PanPhyPlot opens the same graph.
    for (const s of xs ? [xs, ...list.filter((x) => x !== xs)] : list) {
      columns.push({
        name: s.label,
        unit: s.unit,
        role: s === xs ? 'X' : 'Y',
        cells: rows.map((row) => formatCell(row.values[s.key]))
      });
    }
    return { name: 'PanPhyCircuits', columns };
  }

  function panPhyPlotUrl(app) {
    return '/tools/panphyplot.html#import=' + encodeURIComponent(JSON.stringify(panPhyPlotPayload(app)));
  }

  function downloadText(filename, text, type) {
    const url = URL.createObjectURL(new Blob([text], { type }));
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function createGraph(app, canvas, legendEl, exportsEl, axisSelect) {
    let lastDraw = 0;
    let hoverX = null;
    let hoverY = null;
    let axisOptions = '';
    if (axisSelect) axisSelect.addEventListener('change', () => { app.setSetting('graphX', axisSelect.value); draw(true); });

    // Time, then each plotted reading, as choices for the x-axis.
    function syncAxisSelect(list, xs) {
      if (!axisSelect) return;
      const options = [['t', 'Time'], ...list.map((s) => [s.key, seriesName(s)])];
      const sig = JSON.stringify(options);
      if (sig !== axisOptions) {
        axisOptions = sig;
        axisSelect.replaceChildren(...options.map(([value, text]) => new Option(text, value)));
      }
      axisSelect.value = xs ? xs.key : 't';
      axisSelect.disabled = list.length < 2;
      canvas.title = xs ? 'Hover to read the nearest sample.' : 'Drag to select a time range. Use +/− to zoom, arrow keys to pan, and Escape for Full Graph.';
      canvas.setAttribute('aria-label', xs ? `Graph of plotted readings against ${seriesName(xs)}` : 'Graph of plotted meter and oscilloscope readings against time');
    }
    const selection = R.mount(canvas, {
      fullButton: document.getElementById('graph-full'),
      getTimes: () => app.sim.traces.t,
      getSource: () => app.sim.traces,
      getRange: () => app.graphRange,
      setRange: (range) => { app.graphRange = range; },
      redraw: () => draw(true)
    });
    canvas.addEventListener('pointermove', (e) => {
      const box = canvas.getBoundingClientRect();
      hoverX = e.clientX - box.left;
      hoverY = e.clientY - box.top;
      draw(true);
    });
    canvas.addEventListener('pointerleave', () => { hoverX = null; hoverY = null; draw(true); });

    function niceStep(range, target) {
      const raw = range / target;
      const mag = Math.pow(10, Math.floor(Math.log10(raw)));
      const n = raw / mag;
      return (n < 1.5 ? 1 : n < 3 ? 2 : n < 7 ? 5 : 10) * mag;
    }

    function syncExports() {
      if (!exportsEl) return;
      const show = app.paused && !document.getElementById('graph-panel').hidden;
      exportsEl.hidden = !show;
      if (!show) return;
      const ready = hasExportData(app);
      for (const btn of exportsEl.querySelectorAll('button')) btn.disabled = !ready;
    }

    function draw(force) {
      selection.sync();
      const now = performance.now();
      if (!force && now - lastDraw < 66) return;
      lastDraw = now;
      selection.setPlot(null);
      const dpr = window.devicePixelRatio || 1;
      const W = canvas.clientWidth, H = canvas.clientHeight;
      if (!W || !H) return;
      if (canvas.width !== Math.round(W * dpr) || canvas.height !== Math.round(H * dpr)) { canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr); }
      const g = canvas.getContext('2d');
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      const cs = getComputedStyle(canvas);
      const ink = cs.getPropertyValue('--ink').trim() || '#111';
      const ink3 = cs.getPropertyValue('--ink-3').trim() || '#888';
      const line = cs.getPropertyValue('--line').trim() || '#ddd';
      g.clearRect(0, 0, W, H);
      const list = plottedSeries(app);
      const xs = xSeries(app, list);
      const tr = app.sim.traces;
      legendEl.innerHTML = '';
      syncExports();
      syncAxisSelect(list, xs);
      if (!list.length) {
        g.fillStyle = ink3; g.font = '13px Figtree, sans-serif'; g.textAlign = 'center';
        const hasPlottable = app.doc.components.some((c) => {
          const def = registry.get(c.type);
          return def.meter || def.channels;
        });
        g.fillText(hasPlottable
          ? 'Select a meter or oscilloscope and switch on “Plot on graph”.'
          : 'Add an ammeter, voltmeter, ohmmeter or oscilloscope: its readings are plotted here.',
        W / 2, H / 2);
        return;
      }
      if (xs) { drawXY(g, W, H, list, xs, { ink, ink3, line, cs }); return; }
      const { t0, t1 } = selection.viewBounds(tr.t, app.graphRange);
      const unitsUsed = [...new Set(list.map((s) => s.unit))];
      const axes = {};
      for (const u of unitsUsed) {
        let lo = Infinity, hi = -Infinity;
        for (const s of list.filter((x) => x.unit === u)) {
          const arr = tr.series[s.key] || [];
          for (let i = 0; i < arr.length; i++) {
            if (tr.t[i] < t0 || tr.t[i] > t1) continue;
            const v = arr[i];
            if (Number.isFinite(v)) { lo = Math.min(lo, v); hi = Math.max(hi, v); }
          }
        }
        if (!Number.isFinite(lo)) { lo = 0; hi = 1; }
        lo = Math.min(lo, 0); hi = Math.max(hi, 0);
        if (hi - lo < 1e-12) hi = lo + (u === 'A' ? 1e-3 : u === 'Ω' ? 1 : 1);
        const pad = (hi - lo) * 0.08;
        axes[u] = { lo: lo - (lo < 0 ? pad : 0), hi: hi + pad };
      }
      const left = 56, right = unitsUsed.length > 1 ? 56 : 14, top = 10, bottom = 26;
      const pw = W - left - right, ph = H - top - bottom;
      if (pw <= 0 || ph <= 0) return;
      selection.setPlot({ left, top, width: pw, height: ph, t0, t1 });
      const X = (t) => left + ((t - t0) / (t1 - t0)) * pw;
      // Grid and time axis.
      g.strokeStyle = line; g.lineWidth = 1; g.fillStyle = ink3; g.font = '11px "IBM Plex Mono", monospace';
      const ts = niceStep(t1 - t0, 6);
      g.textAlign = 'center'; g.textBaseline = 'top';
      for (let t = Math.ceil(t0 / ts) * ts; t <= t1 + 1e-12; t += ts) {
        const x = X(t);
        g.beginPath(); g.moveTo(x, top); g.lineTo(x, top + ph); g.stroke();
        g.fillText(units.fmtSI(t, 's', 3, { trim: true }), x, top + ph + 6);
      }
      unitsUsed.forEach((u, idx) => {
        const ax = axes[u];
        const Y = (v) => top + ph - ((v - ax.lo) / (ax.hi - ax.lo)) * ph;
        ax.Y = Y;
        const vs = niceStep(ax.hi - ax.lo, 4);
        g.textAlign = idx === 0 ? 'right' : 'left'; g.textBaseline = 'middle';
        for (let v = Math.ceil(ax.lo / vs) * vs; v <= ax.hi + 1e-15; v += vs) {
          const y = Y(v);
          if (idx === 0) { g.strokeStyle = Math.abs(v) < vs * 1e-6 ? ink3 : line; g.beginPath(); g.moveTo(left, y); g.lineTo(left + pw, y); g.stroke(); }
          g.fillStyle = ink3;
          g.fillText(units.fmtSI(Math.abs(v) < vs * 1e-6 ? 0 : v, u, 3, { trim: true }), idx === 0 ? left - 6 : left + pw + 6, y);
        }
      });
      g.strokeStyle = ink3; g.strokeRect(left, top, pw, ph);
      // Traces.
      g.save();
      g.beginPath(); g.rect(left, top, pw, ph); g.clip();
      for (const s of list) {
        const arr = tr.series[s.key] || [];
        const Y = axes[s.unit].Y;
        g.strokeStyle = s.color; g.lineWidth = 2;
        g.setLineDash(s.unit === 'A' && unitsUsed.length > 1 ? [6, 3] : []);
        g.beginPath();
        let pen = false;
        for (let i = 0; i < arr.length; i++) {
          const t = tr.t[i];
          if (t < t0 || t > t1) continue;
          const v = arr[i];
          if (!Number.isFinite(v)) { pen = false; continue; }
          const x = X(t), y = Y(v);
          if (pen) g.lineTo(x, y); else g.moveTo(x, y);
          pen = true;
        }
        g.stroke();
      }
      g.restore();
      g.setLineDash([]);
      let hoverIndex = -1;
      if (hoverX !== null && hoverX >= left && hoverX <= left + pw && !selection.isSelecting()) {
        const time = t0 + (hoverX - left) / pw * (t1 - t0);
        if (time <= tr.t[tr.t.length - 1]) hoverIndex = R.nearestSample(tr.t, app.graphRange, time);
      }
      if (hoverIndex >= 0) {
        const x = X(tr.t[hoverIndex]);
        g.strokeStyle = ink3; g.lineWidth = 1; g.setLineDash([3, 3]);
        g.beginPath(); g.moveTo(x, top); g.lineTo(x, top + ph); g.stroke(); g.setLineDash([]);
        for (const s of list) {
          const value = (tr.series[s.key] || [])[hoverIndex];
          if (!Number.isFinite(value)) continue;
          g.fillStyle = s.color; g.beginPath(); g.arc(x, axes[s.unit].Y(value), 3.5, 0, Math.PI * 2); g.fill();
        }
        R.drawReadout(g, {
          x, top, width: W, height: H,
          lines: [`t = ${units.fmtSI(tr.t[hoverIndex], 's', 4)}`, ...list.map((s) => {
            const value = (tr.series[s.key] || [])[hoverIndex];
            return `${s.label} = ${Number.isFinite(value) ? units.fmtSI(value, s.unit, 4) : value === Infinity ? 'OL' : '—'}`;
          })],
          background: cs.getPropertyValue('--surface').trim() || '#fff', ink, border: line
        });
      }
      selection.draw(g, cs.getPropertyValue('--accent').trim() || COLORS[0]);
      // Legend follows the hovered sample, or the last sample in the displayed range.
      const visibleIndices = R.indices(tr.t, app.graphRange);
      const lastIndex = hoverIndex >= 0 ? hoverIndex : visibleIndices[visibleIndices.length - 1];
      for (const s of list) {
        const arr = tr.series[s.key] || [];
        const last = lastIndex === undefined ? NaN : arr[lastIndex];
        const item = document.createElement('span');
        item.className = 'legend-item';
        const sw = document.createElement('span');
        sw.className = 'legend-swatch' + (s.unit === 'A' && unitsUsed.length > 1 ? ' is-dashed' : '');
        sw.style.setProperty('--c', s.color);
        const tx = document.createElement('span');
        tx.textContent = `${s.label} (${quantityLabel(s.unit, s.channel)})`;
        const val = document.createElement('span');
        val.className = 'legend-value';
        val.textContent = Number.isFinite(last) ? units.fmtSI(last, s.unit, 3) : (last === Infinity ? 'OL' : '—');
        item.append(sw, tx, val);
        legendEl.append(item);
      }
    }

    // Value range of some series over the samples in the displayed time range.
    function extent(list, tr, t0, t1) {
      let lo = Infinity, hi = -Infinity;
      for (const s of list) {
        const arr = tr.series[s.key] || [];
        for (let i = 0; i < arr.length; i++) {
          if (tr.t[i] < t0 || tr.t[i] > t1) continue;
          const v = arr[i];
          if (Number.isFinite(v)) { lo = Math.min(lo, v); hi = Math.max(hi, v); }
        }
      }
      if (!Number.isFinite(lo)) { lo = 0; hi = 1; }
      lo = Math.min(lo, 0); hi = Math.max(hi, 0);
      if (hi - lo < 1e-12) hi = lo + (list[0] && list[0].unit === 'A' ? 1e-3 : 1);
      const pad = (hi - lo) * 0.08;
      return { lo: lo - (lo < 0 ? pad : 0), hi: hi + pad };
    }

    // An X–Y graph: every other plotted reading against the chosen one, sample by sample in
    // time order, over the displayed time range.
    function drawXY(g, W, H, list, xs, { ink, ink3, line, cs }) {
      const tr = app.sim.traces;
      const ys = list.filter((s) => s !== xs);
      const { t0, t1 } = R.bounds(tr.t, app.graphRange);
      const xa = extent([xs], tr, t0, t1);
      const yUnits = [...new Set(ys.map((s) => s.unit))];
      const ya = {};
      for (const u of yUnits) ya[u] = extent(ys.filter((s) => s.unit === u), tr, t0, t1);
      const left = 56, right = yUnits.length > 1 ? 56 : 14, top = 10, bottom = 42;
      const pw = W - left - right, ph = H - top - bottom;
      if (pw <= 0 || ph <= 0) return;
      const X = (v) => left + ((v - xa.lo) / (xa.hi - xa.lo)) * pw;
      g.strokeStyle = line; g.lineWidth = 1; g.fillStyle = ink3; g.font = '11px "IBM Plex Mono", monospace';
      // About one tick per 80 px, so the unit labels never run together on a phone.
      const xsStep = niceStep(xa.hi - xa.lo, Math.max(2, Math.min(6, Math.floor(pw / 80))));
      g.textAlign = 'center'; g.textBaseline = 'top';
      for (let v = Math.ceil(xa.lo / xsStep) * xsStep; v <= xa.hi + 1e-15; v += xsStep) {
        const x = X(v);
        g.strokeStyle = Math.abs(v) < xsStep * 1e-6 ? ink3 : line;
        g.beginPath(); g.moveTo(x, top); g.lineTo(x, top + ph); g.stroke();
        g.fillText(units.fmtSI(Math.abs(v) < xsStep * 1e-6 ? 0 : v, xs.unit, 3, { trim: true }), x, top + ph + 6);
      }
      g.font = '600 11px Figtree, sans-serif';
      g.fillText(seriesName(xs), left + pw / 2, top + ph + 22);
      g.font = '11px "IBM Plex Mono", monospace';
      yUnits.forEach((u, idx) => {
        const ax = ya[u];
        ax.Y = (v) => top + ph - ((v - ax.lo) / (ax.hi - ax.lo)) * ph;
        const vs = niceStep(ax.hi - ax.lo, 4);
        g.textAlign = idx === 0 ? 'right' : 'left'; g.textBaseline = 'middle';
        for (let v = Math.ceil(ax.lo / vs) * vs; v <= ax.hi + 1e-15; v += vs) {
          const y = ax.Y(v);
          if (idx === 0) { g.strokeStyle = Math.abs(v) < vs * 1e-6 ? ink3 : line; g.beginPath(); g.moveTo(left, y); g.lineTo(left + pw, y); g.stroke(); }
          g.fillStyle = ink3;
          g.fillText(units.fmtSI(Math.abs(v) < vs * 1e-6 ? 0 : v, u, 3, { trim: true }), idx === 0 ? left - 6 : left + pw + 6, y);
        }
      });
      g.strokeStyle = ink3; g.strokeRect(left, top, pw, ph);
      if (!ys.length) {
        g.fillStyle = ink3; g.font = '13px Figtree, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.fillText(`Plot another meter to draw its readings against ${xs.label}.`, left + pw / 2, top + ph / 2);
        return;
      }
      const xArr = tr.series[xs.key] || [];
      g.save();
      g.beginPath(); g.rect(left, top, pw, ph); g.clip();
      let hover = null;
      for (const s of ys) {
        const arr = tr.series[s.key] || [];
        const Y = ya[s.unit].Y;
        g.strokeStyle = s.color; g.fillStyle = s.color; g.lineWidth = 2;
        g.setLineDash(s.unit === 'A' && yUnits.length > 1 ? [6, 3] : []);
        g.beginPath();
        let pen = false, count = 0, lx = 0, ly = 0;
        for (let i = 0; i < arr.length; i++) {
          if (tr.t[i] < t0 || tr.t[i] > t1) continue;
          const xv = xArr[i], v = arr[i];
          if (!Number.isFinite(xv) || !Number.isFinite(v)) { pen = false; continue; }
          const x = X(xv), y = Y(v);
          if (pen) g.lineTo(x, y); else g.moveTo(x, y);
          pen = true; count++; lx = x; ly = y;
          if (hoverX !== null) {
            const d = Math.hypot(x - hoverX, y - hoverY);
            if (d < 24 && (!hover || d < hover.d)) hover = { d, i, x, y, s };
          }
        }
        g.stroke();
        // A steady reading is a single point, so mark the latest one.
        if (count) { g.setLineDash([]); g.beginPath(); g.arc(lx, ly, 3.5, 0, Math.PI * 2); g.fill(); }
      }
      g.restore();
      g.setLineDash([]);
      if (hover) {
        g.fillStyle = hover.s.color; g.strokeStyle = cs.getPropertyValue('--surface').trim() || '#fff'; g.lineWidth = 2;
        g.beginPath(); g.arc(hover.x, hover.y, 5, 0, Math.PI * 2); g.fill(); g.stroke();
        R.drawReadout(g, {
          x: hover.x, top, width: W, height: H,
          lines: [`${xs.label} = ${units.fmtSI(xArr[hover.i], xs.unit, 4)}`, `${hover.s.label} = ${units.fmtSI((tr.series[hover.s.key] || [])[hover.i], hover.s.unit, 4)}`, `t = ${units.fmtSI(tr.t[hover.i], 's', 4)}`],
          background: cs.getPropertyValue('--surface').trim() || '#fff', ink, border: line
        });
      }
      const indices = R.indices(tr.t, app.graphRange);
      const at = hover ? hover.i : indices[indices.length - 1];
      for (const s of ys) {
        const v = at === undefined ? NaN : (tr.series[s.key] || [])[at];
        const item = document.createElement('span');
        item.className = 'legend-item';
        const sw = document.createElement('span');
        sw.className = 'legend-swatch' + (s.unit === 'A' && yUnits.length > 1 ? ' is-dashed' : '');
        sw.style.setProperty('--c', s.color);
        const tx = document.createElement('span');
        tx.textContent = `${s.label} (${quantityLabel(s.unit, s.channel)})`;
        const val = document.createElement('span');
        val.className = 'legend-value';
        val.textContent = Number.isFinite(v) ? units.fmtSI(v, s.unit, 3) : (v === Infinity ? 'OL' : '—');
        item.append(sw, tx, val);
        legendEl.append(item);
      }
    }

    function exportCSV() {
      if (!hasExportData(app)) return false;
      downloadText('panphycircuits_graph.csv', toCSV(app), 'text/csv;charset=utf-8;');
      return true;
    }

    function exportPanPhyPlot() {
      if (!hasExportData(app)) return false;
      const tab = window.open(panPhyPlotUrl(app), '_blank');
      return tab !== null;
    }

    return { draw, syncExports, fullGraph: selection.reset, exportCSV, exportPanPhyPlot, plottedSeries: () => plottedSeries(app), hasExportData: () => hasExportData(app) };
  }

  const api = { createGraph, plottedSeries, xSeries, sampleRows, toCSV, panPhyPlotPayload, panPhyPlotUrl, hasExportData, quantityLabel };
  PPC.graph = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof globalThis === 'object' ? globalThis : this);
