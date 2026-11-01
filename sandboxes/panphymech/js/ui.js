// PanPhyMech: panels, inspector, graph controls, menus and dialogs.
(function (root) {
  const PPM = root.PPM = root.PPM || {};
  const S = PPM.scene;
  const G = PPM.graph;

  const ICONS = {
    select: '<path d="M5 3l14 7-6 1.6L10.5 18z"/>',
    pan: '<path d="M12 3v18M3 12h18"/><path d="M9.5 5.5L12 3l2.5 2.5M9.5 18.5L12 21l2.5-2.5M5.5 9.5L3 12l2.5 2.5M18.5 9.5L21 12l-2.5 2.5"/>',
    rotate: '<path d="M20 11a8 8 0 10-2.3 5.7"/><path d="M20 4v7h-7"/>',
    rotateCcw: '<path d="M4 11a8 8 0 112.3 5.7"/><path d="M4 4v7h7"/>',
    mirror: '<path d="M12 2.5v19"/><path d="M9 6.5L3 17.5h6zM15 6.5l6 11h-6z"/>',
    multi: '<path d="M3 3l8 4-3.5 1L6 11.5z"/><rect x="11" y="11" width="10" height="10" rx="2"/><path d="M16 13.5v5M13.5 16h5"/>',
    merge: '<path d="M3.5 3.5h10v6h7v11h-11v-6h-6z"/>',
    subtract: '<path d="M3.5 3.5h13v6h-7v7h-6z"/><rect x="10" y="10" width="10.5" height="10.5" rx="1" stroke-dasharray="2.2 2.2"/>',
    duplicate: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 00-2-2H6a2 2 0 00-2 2v8a2 2 0 002 2h2"/>',
    trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6"/>',
    cross: '<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>',
    undo: '<path d="M9 14L4 9l5-5"/><path d="M4 9h11a5 5 0 010 10h-3"/>',
    redo: '<path d="M15 14l5-5-5-5"/><path d="M20 9H9a5 5 0 000 10h3"/>',
    zoomIn: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4M11 8v6M8 11h6"/>',
    zoomOut: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4M8 11h6"/>',
    fit: '<path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5"/><rect x="8" y="8" width="8" height="8" rx="1"/>',
    snap: '<path d="M6 4v8a6 6 0 0012 0V4"/><path d="M6 8h4M14 8h4"/>',
    graph: '<path d="M4 4v16h16"/><path d="M7 15c3-7 5-7 7-3s3 2 5-4"/>',
    sliders: '<path d="M4 7.5h9M17.5 7.5H20M4 16.5h3.5M11.5 16.5H20"/><circle cx="15.2" cy="7.5" r="2.2"/><circle cx="9.5" cy="16.5" r="2.2"/>',
    play: '<path d="M7 4.5v15l12.5-7.5z"/>',
    pause: '<path d="M6.5 4.5h4v15h-4zM13.5 4.5h4v15h-4z"/>',
    step: '<path d="M5 5.5v13l9-6.5z" fill="currentColor" stroke="none"/><path d="M18 5.5v13"/>',
    reset: '<path d="M4 12a8 8 0 108-8H8"/><path d="M10.5 1.5L8 4l2.5 2.5"/>',
    panelLeft: '<rect x="3" y="4" width="18" height="16" rx="2.5"/><path d="M9 4v16"/><path d="M4 6a1 1 0 011-1h3v14H5a1 1 0 01-1-1z" fill="currentColor" stroke="none" opacity=".2"/>',
    panelRight: '<rect x="3" y="4" width="18" height="16" rx="2.5"/><path d="M15 4v16"/><path d="M16 5h3a1 1 0 011 1v12a1 1 0 01-1 1h-3z" fill="currentColor" stroke="none" opacity=".2"/>',
    close: '<path d="M6 6l12 12M18 6L6 18"/>',
    examples: '<rect x="3.5" y="4" width="7" height="7" rx="1.5"/><rect x="13.5" y="4" width="7" height="7" rx="1.5"/><rect x="3.5" y="14" width="7" height="6" rx="1.5"/><path d="M14 17h6M17 14v6"/>',
    folder: '<path d="M3.5 7.5a2 2 0 012-2h4l2 2.2h7a2 2 0 012 2V17a2 2 0 01-2 2h-13a2 2 0 01-2-2z"/>',
    guide: '<path d="M4 5.5c2.7-1.3 5.4-1.3 8 0v14c-2.6-1.3-5.3-1.3-8 0zM20 5.5c-2.7-1.3-5.4-1.3-8 0v14c2.6-1.3 5.3-1.3 8 0z"/>'
  };
  const icon = (name) => `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${ICONS[name] || ''}</svg>`;
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // Text with LaTeX between \( and \), typeset once MathJax is ready; plain text until then.
  function mathText(text, plain) {
    if (root.PanPhyMath) return root.PanPhyMath.mathHtml(text, plain === undefined ? text.replace(/\\\(|\\\)/g, '') : plain);
    return esc(plain === undefined ? text : plain);
  }

  // ---------- Part artwork (64 × 44) ----------

  const c = (name) => S.COLORS[name];
  // The motor's arrow uses the same geometry as the scene drawing; new motors turn clockwise.
  const motorArrow = (() => {
    const a = PPM.render.arcArrow(32, 22, 17, -Math.PI * 0.8, Math.PI * 1.4, 8);
    const f = (v) => v.toFixed(2);
    return `<path class="p-motor" d="M${f(a.from.x)} ${f(a.from.y)}A17 17 0 1 1 ${f(a.to.x)} ${f(a.to.y)}"/><path class="p-motor-head" d="M${f(a.tip.x)} ${f(a.tip.y)}L${f(a.left.x)} ${f(a.left.y)}L${f(a.right.x)} ${f(a.right.y)}z"/>`;
  })();
  const PART_ART = {
    ball: `<circle cx="32" cy="22" r="15" fill="${c('blue').fill}" stroke="${c('blue').stroke}" stroke-width="1.6"/><path d="M32 22h13" stroke="${c('blue').stroke}" stroke-width="1.6"/><circle cx="32" cy="22" r="2" fill="${c('blue').stroke}"/>`,
    box: `<rect x="17" y="7" width="30" height="30" rx="1" fill="${c('coral').fill}" stroke="${c('coral').stroke}" stroke-width="1.6"/>`,
    plank: `<rect x="4" y="18" width="56" height="8" rx="1" fill="${c('amber').fill}" stroke="${c('amber').stroke}" stroke-width="1.6"/>`,
    wedge: `<path d="M6 38h52L6 10z" fill="${c('slate').fill}" stroke="${c('slate').stroke}" stroke-width="1.6" stroke-linejoin="round"/><path d="M10 38l8-8M20 38l8-8M30 38l8-8M14 26l6-6" stroke="${c('slate').stroke}" opacity=".4"/>`,
    polygon: `<path d="M24 37l-8-15 8-15h16l8 15-8 15z" fill="${c('green').fill}" stroke="${c('green').stroke}" stroke-width="1.6" stroke-linejoin="round"/>`,
    wall: `<rect x="25" y="3" width="14" height="38" rx="1" fill="${c('slate').fill}" stroke="${c('slate').stroke}" stroke-width="1.6"/><path d="M25 14l14-8M25 24l14-8M25 34l14-8M28 41l11-6" stroke="${c('slate').stroke}" opacity=".4"/>`,
    spring: '<path class="p-stroke" d="M4 22h8l3-7 5 14 5-14 5 14 5-14 5 14 5-14 3 7h8"/><circle class="p-dot" cx="4" cy="22" r="2.4"/><circle class="p-dot" cx="60" cy="22" r="2.4"/>',
    rod: '<path class="p-stroke" d="M8 30L56 14" stroke-width="5"/><circle class="p-pin" cx="8" cy="30" r="3"/><circle class="p-pin" cx="56" cy="14" r="3"/>',
    rope: '<path class="p-rope" d="M6 10Q32 50 58 10"/><circle class="p-dot" cx="6" cy="10" r="2.4"/><circle class="p-dot" cx="58" cy="10" r="2.4"/>',
    pulley: `<circle class="p-pin" cx="32" cy="13" r="9"/><path class="p-rope" d="M23 13V31M41 13V26M23 13A9 9 0 0 1 41 13"/><circle class="p-dot" cx="32" cy="13" r="2"/><rect x="17" y="31" width="12" height="10" rx="1" fill="${c('coral').fill}" stroke="${c('coral').stroke}" stroke-width="1.4"/><rect x="36" y="26" width="10" height="9" rx="1" fill="${c('blue').fill}" stroke="${c('blue').stroke}" stroke-width="1.4"/>`,
    hinge: `<rect x="6" y="16" width="34" height="10" rx="1" fill="${c('amber').fill}" stroke="${c('amber').stroke}" stroke-width="1.4" transform="rotate(-18 32 22)"/><rect x="26" y="16" width="32" height="10" rx="1" fill="${c('teal').fill}" stroke="${c('teal').stroke}" stroke-width="1.4" transform="rotate(18 32 22)"/><circle class="p-pin" cx="32" cy="22" r="5.5"/><circle class="p-dot" cx="32" cy="22" r="1.8"/>`,
    motor: `<circle cx="32" cy="22" r="13" fill="${c('slate').fill}" stroke="${c('slate').stroke}" stroke-width="1.4"/>${motorArrow}<circle class="p-pin" cx="32" cy="22" r="5"/><circle class="p-dot" cx="32" cy="22" r="1.8"/>`,
    weld: `<rect x="8" y="14" width="26" height="16" rx="1" fill="${c('violet').fill}" stroke="${c('violet').stroke}" stroke-width="1.4"/><rect x="28" y="10" width="26" height="16" rx="1" fill="${c('pink').fill}" stroke="${c('pink').stroke}" stroke-width="1.4"/><path class="p-glue" d="M31 13.5l6.5 6.5-6.5 6.5-6.5-6.5z"/><circle class="p-pin-dot" cx="31" cy="20" r="1.7"/>`
  };
  const partSvg = (kind) => `<svg viewBox="0 0 64 44" aria-hidden="true">${PART_ART[kind] || ''}</svg>`;

  // A custom shape's own outline, fitted into the 64 × 44 icon box.
  function customSvg(b) {
    const pts = b.paths.flat(2);
    const xs = pts.map((p) => p[0]);
    const ys = pts.map((p) => p[1]);
    const minX = Math.min(...xs); const maxX = Math.max(...xs);
    const minY = Math.min(...ys); const maxY = Math.max(...ys);
    const k = Math.min(56 / (maxX - minX || 1), 36 / (maxY - minY || 1));
    const ox = 32 - ((minX + maxX) / 2) * k;
    const oy = 22 + ((minY + maxY) / 2) * k;
    const d = b.paths.map((poly) => poly.map((ring) => 'M' + ring.map(([x, y]) => `${(ox + x * k).toFixed(1)} ${(oy - y * k).toFixed(1)}`).join('L') + 'z').join('')).join('');
    const col = S.COLORS[b.color] || S.COLORS.blue;
    return `<svg viewBox="0 0 64 44" aria-hidden="true"><path d="${d}" fill="${col.fill}" stroke="${col.stroke}" stroke-width="1.4" fill-rule="evenodd" stroke-linejoin="round"/></svg>`;
  }
  const bodyArt = (b) => (b.kind === 'custom' ? customSvg(b) : partSvg(b.kind === 'box' && b.fixed ? 'wall' : b.kind));

  const PART_GROUPS = [
    { title: 'Objects', items: ['ball', 'box', 'plank', 'polygon', 'wedge', 'wall'] },
    { title: 'Connectors', items: ['spring', 'rod', 'rope', 'pulley', 'hinge', 'motor', 'weld'] }
  ];
  const PART_TITLES = {
    ball: 'Ball: a movable circle', box: 'Box: a movable square block', plank: 'Plank: a long thin movable bar',
    polygon: 'Polygon: a movable regular polygon', wedge: 'Ramp: a fixed right-angled wedge', wall: 'Wall: a fixed upright block',
    spring: 'Spring (Hooke’s law) between two points', rod: 'Rod: keeps two points a fixed distance apart', rope: 'Rope: a maximum distance; it can go slack',
    pulley: 'Pulley: a fixed wheel with one rope over it, for an Atwood machine or a hanging mass pulling a cart',
    hinge: 'Hinge: pins objects together so they can turn', motor: 'Motor: a hinge that drives at a set speed', weld: 'Glue: joins objects rigidly'
  };

  const fmt = (v, d = 3) => {
    if (v === null || v === undefined || !Number.isFinite(v)) return '—';
    const a = Math.abs(v);
    if (a !== 0 && (a < 1e-3 || a >= 1e5)) return v.toExponential(2).replace('-', '−');
    const out = a >= 100 ? v.toFixed(Math.max(0, d - 2)) : a >= 10 ? v.toFixed(Math.max(0, d - 1)) : v.toFixed(d);
    return out.replace(/^-/, '−');
  };
  const fmtField = (v) => (Number.isFinite(v) ? String(Number(v.toPrecision(5))) : '');

  function createUI(app) {
    const $ = (id) => document.getElementById(id);
    const ui = { fields: [], readings: null };

    document.querySelectorAll('[data-icon]').forEach((el) => el.insertAdjacentHTML('afterbegin', icon(el.dataset.icon)));

    // ---------- Side panels on small screens ----------

    function setPanel(name, open) {
      document.body.classList.toggle('show-' + name, open);
      const btn = $(name === 'library' ? 'btn-show-library' : 'btn-show-inspector');
      btn.setAttribute('aria-expanded', String(open));
      if (open) document.body.classList.remove('show-' + (name === 'library' ? 'inspector' : 'library'));
      syncPanelButtons();
    }
    function syncPanelButtons() {
      $('btn-show-library').setAttribute('aria-expanded', String(document.body.classList.contains('show-library')));
      $('btn-show-inspector').setAttribute('aria-expanded', String(document.body.classList.contains('show-inspector')));
    }
    const narrow = () => window.matchMedia('(max-width: 900px)').matches;
    $('btn-show-library').addEventListener('click', () => setPanel('library', !document.body.classList.contains('show-library')));
    $('btn-show-inspector').addEventListener('click', () => setPanel('inspector', !document.body.classList.contains('show-inspector')));
    document.querySelectorAll('[data-close-panel]').forEach((b) => b.addEventListener('click', () => { setPanel('library', false); setPanel('inspector', false); }));
    ui.closePanels = () => { if (narrow()) { document.body.classList.remove('show-library', 'show-inspector'); syncPanelButtons(); } };

    // ---------- Parts library ----------

    function buildLibrary() {
      const list = $('lib-list');
      list.innerHTML = PART_GROUPS.map((g) => `<div class="lib-group"><h3 class="ds-label">${g.title}</h3><div class="lib-grid">${g.items.map((k) => {
        const label = S.BODY_KINDS[k] ? S.BODY_KINDS[k].label : S.LINK_KINDS[k].label;
        return `<button type="button" class="part" data-part="${k}" aria-pressed="false" title="${esc(PART_TITLES[k])}">${partSvg(k)}<span class="part-name">${label}</span></button>`;
      }).join('')}</div></div>`).join('') + '<p class="lib-note">Fixed objects (hatched) never move. Any object can be fixed or freed in the inspector.</p>';
      list.querySelectorAll('.part').forEach((btn) => {
        const kind = btn.dataset.part;
        const isBody = !!S.BODY_KINDS[kind];
        let drag = null;
        btn.addEventListener('pointerdown', (e) => {
          if (e.button !== 0) return;
          delete btn.dataset.suppressClick;
          drag = { x: e.clientX, y: e.clientY, moved: false, ghost: null, id: e.pointerId };
          btn.setPointerCapture(e.pointerId);
        });
        btn.addEventListener('pointermove', (e) => {
          if (!drag || drag.id !== e.pointerId) return;
          if (!drag.moved && Math.hypot(e.clientX - drag.x, e.clientY - drag.y) > 6) {
            drag.moved = true;
            if (isBody) {
              app.editor.arm(null);
              drag.ghost = document.createElement('div');
              drag.ghost.className = 'drag-ghost';
              drag.ghost.innerHTML = partSvg(kind);
              document.body.appendChild(drag.ghost);
            }
            ui.closePanels();
          }
          if (drag.ghost) drag.ghost.style.transform = `translate(${e.clientX - 32}px, ${e.clientY - 22}px)`;
          if (drag.moved && !isBody) app.editor.previewConnectorDrop(kind, e.clientX, e.clientY);
        });
        const end = (e) => {
          if (!drag || drag.id !== e.pointerId) return;
          const d = drag;
          drag = null;
          if (d.moved) {
            if (d.ghost) d.ghost.remove();
            if (!isBody) app.editor.clearConnectorDropPreview();
            // Set before dropping, so the click that follows never arms the part.
            btn.dataset.suppressClick = '1';
            if (e.type === 'pointerup') {
              if (isBody) app.editor.dropBody(kind, e.clientX, e.clientY);
              else app.editor.dropConnector(kind, e.clientX, e.clientY);
            }
          }
        };
        btn.addEventListener('pointerup', end);
        btn.addEventListener('pointercancel', end);
        btn.addEventListener('click', () => {
          if (btn.dataset.suppressClick) { delete btn.dataset.suppressClick; return; }
          if (isBody) app.editor.arm(app.editor.armed === kind ? null : kind);
          else app.editor.setTool(app.editor.tool === kind ? 'select' : kind);
          ui.closePanels();
        });
      });
    }
    buildLibrary();

    ui.syncTools = function syncTools() {
      const ed = app.editor;
      document.querySelectorAll('[data-part]').forEach((b) => {
        const k = b.dataset.part;
        b.setAttribute('aria-pressed', String(ed.armed === k || ed.tool === k));
      });
      document.querySelectorAll('[data-tool]').forEach((b) => b.setAttribute('aria-pressed', String(ed.tool === b.dataset.tool && !ed.armed)));
    };

    // ---------- Toolbar ----------

    document.querySelectorAll('[data-tool]').forEach((b) => b.addEventListener('click', () => { app.editor.arm(null); app.editor.setTool(b.dataset.tool); }));
    $('btn-undo').addEventListener('click', () => app.undo());
    $('btn-redo').addEventListener('click', () => app.redo());
    $('btn-rotate-ccw').addEventListener('click', () => app.rotateSelection(1));
    $('btn-rotate').addEventListener('click', () => app.rotateSelection(-1));
    $('btn-mirror').addEventListener('click', () => app.mirrorSelection());
    $('btn-duplicate').addEventListener('click', () => app.duplicateSelection());
    $('btn-multi').addEventListener('click', () => app.setMultiMode(!app.multiMode));
    $('btn-merge').addEventListener('click', () => app.mergeSelection());
    $('btn-subtract').addEventListener('click', () => app.subtractSelection());
    $('btn-delete').addEventListener('click', () => app.deleteSelection());
    $('btn-zoom-in').addEventListener('click', () => app.zoomBy(1.25));
    $('btn-zoom-out').addEventListener('click', () => app.zoomBy(0.8));
    $('btn-fit').addEventListener('click', () => app.fit());
    $('btn-snap').addEventListener('click', () => app.setSnap(!app.snap));
    $('btn-graph').addEventListener('click', () => app.setGraphOpen(!app.graphOpen));
    $('graph-close').addEventListener('click', () => app.setGraphOpen(false));
    $('btn-clear').addEventListener('click', () => app.clearScene());
    $('btn-play').addEventListener('click', () => app.togglePlay());
    $('btn-step').addEventListener('click', () => app.stepOnce());
    $('btn-reset').addEventListener('click', () => app.reset());
    $('speed').addEventListener('change', (e) => app.setSpeed(Number(e.target.value)));

    ui.syncToolbar = function syncToolbar() {
      const sel = app.selection;
      $('btn-undo').disabled = !app.canUndo();
      $('btn-redo').disabled = !app.canRedo();
      $('btn-delete').disabled = !sel;
      $('btn-duplicate').disabled = !sel;
      $('btn-multi').setAttribute('aria-pressed', String(app.multiMode));
      $('btn-merge').disabled = $('btn-subtract').disabled = !app.canCombine();
      $('btn-rotate').disabled = $('btn-rotate-ccw').disabled = $('btn-mirror').disabled = !sel || sel.type !== 'body' || app.running || app.extra.length > 0;
      // Shows off while Ctrl or Command pauses it.
      $('btn-snap').setAttribute('aria-pressed', String(app.snap && !(app.editor && app.editor.snapSuspended())));
      $('btn-graph').setAttribute('aria-pressed', String(app.graphOpen));
      $('btn-clear').disabled = !app.scene.bodies.length && !app.scene.links.length;
      $('speed').value = String(app.speed);
      syncDragNotes();
      const play = $('btn-play');
      play.setAttribute('aria-pressed', String(app.running));
      play.querySelector('.run-icon').innerHTML = icon(app.running ? 'pause' : 'play');
      play.querySelector('.run-label').textContent = app.running ? 'Pause' : app.sim && app.sim.t > 0 ? 'Resume' : 'Play';
      play.title = app.running ? 'Pause (Space)' : 'Play (Space)';
      $('btn-step').disabled = app.running;
      $('btn-reset').disabled = !(app.sim && app.sim.t > 0);
      $('empty-state').hidden = !(app.scene.bodies.length === 0 && app.scene.links.length === 0 && !app.emptyDismissed);
    };

    // ---------- Menus ----------

    function setupMenu(btnId, menuId) {
      const btn = $(btnId);
      const menu = $(menuId);
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const open = menu.hidden;
        closeMenus();
        menu.hidden = !open;
        btn.setAttribute('aria-expanded', String(open));
      });
      menu.addEventListener('click', (e) => e.stopPropagation());
    }
    function closeMenus() {
      ['menu-file', 'display-menu', 'drag-notes-pop'].forEach((id) => { $(id).hidden = true; });
      $('btn-file').setAttribute('aria-expanded', 'false');
      $('btn-display').setAttribute('aria-expanded', 'false');
      $('btn-drag-notes').setAttribute('aria-expanded', 'false');
    }
    ui.closeMenus = closeMenus;
    setupMenu('btn-file', 'menu-file');
    setupMenu('btn-display', 'display-menu');
    // Settings that differ from the usual: objects with their own drag, and a finer World accuracy.
    function dragNotes() {
      const notes = app.scene.bodies.map((b) => ({ body: b, message: S.dragOverrideNote(app.scene, b) })).filter((n) => n.message);
      const accuracy = S.accuracyNote(app.scene);
      return accuracy ? [{ world: true, message: accuracy }, ...notes] : notes;
    }
    function renderDragNotes() {
      $('drag-notes-pop').innerHTML = '<div class="drag-notes-head"><strong>Notes</strong><button type="button" data-close-notes aria-label="Close notes">Close</button></div><ul>'
        + dragNotes().map((n) => `<li><button type="button" ${n.world ? 'data-world-note' : `data-drag-body="${esc(n.body.id)}"`}>${esc(n.message)}</button></li>`).join('') + '</ul>';
    }
    function syncDragNotes() {
      const notes = dragNotes();
      const button = $('btn-drag-notes');
      button.hidden = !notes.length;
      button.textContent = `${notes.length} note${notes.length === 1 ? '' : 's'}`;
      button.setAttribute('aria-label', `${notes.length} settings note${notes.length === 1 ? '' : 's'}`);
      if (!notes.length) { $('drag-notes-pop').hidden = true; button.setAttribute('aria-expanded', 'false'); }
      else if (!$('drag-notes-pop').hidden) renderDragNotes();
    }
    setupMenu('btn-drag-notes', 'drag-notes-pop');
    $('btn-drag-notes').addEventListener('click', () => {
      if ($('drag-notes-pop').hidden) return;
      renderDragNotes();
      $('drag-notes-pop').querySelector('button').focus();
    });
    $('drag-notes-pop').addEventListener('keydown', (event) => {
      if (event.key !== 'Escape') return;
      event.stopPropagation(); closeMenus(); $('btn-drag-notes').focus();
    });
    $('drag-notes-pop').addEventListener('click', (event) => {
      if (event.target.closest('[data-close-notes]')) { closeMenus(); $('btn-drag-notes').focus(); return; }
      if (event.target.closest('[data-world-note]')) {
        closeMenus(); app.select(null);
        setPanel('inspector', true);
        const choice = $('inspector-body').querySelector('[data-accuracy]:checked');
        if (choice) { choice.closest('.world-section').scrollIntoView({ block: 'start' }); choice.focus({ preventScroll: true }); }
        return;
      }
      const button = event.target.closest('[data-drag-body]');
      if (!button) return;
      const b = S.bodyById(app.scene, button.dataset.dragBody);
      if (!b) return;
      closeMenus(); app.select({ type: 'body', id: b.id });
      setPanel('inspector', true);
      const select = $('inspector-body').querySelector('[data-drag-field="dragModel"]:checked');
      if (select) { select.closest('.icard').scrollIntoView({ block: 'start' }); select.focus({ preventScroll: true }); }
    });
    document.addEventListener('click', closeMenus);
    $('menu-file').querySelectorAll('[data-file]').forEach((b) => b.addEventListener('click', () => {
      closeMenus();
      const a = b.dataset.file;
      if (a === 'open') $('file-input').click();
      if (a === 'save') app.saveFile();
      if (a === 'png') app.exportPng();
      if (a === 'svg') app.exportSvg();
      if (a === 'panphymd') app.exportPanPhyMD();
    }));
    $('file-input').addEventListener('change', (e) => {
      const f = e.target.files && e.target.files[0];
      e.target.value = '';
      if (f) f.text().then((text) => app.openText(text, f.name)).catch(() => app.toast('That file could not be read.'));
    });

    function buildDisplayMenu() {
      const opts = [
        ['vectors', 'Velocity arrows'],
        ['forces', 'Force arrows'],
        ['trails', 'Trails and strobe dots'],
        ['labels', 'Object names'],
        ['grid', 'Grid and scale']
      ];
      $('display-menu').innerHTML = '<p class="icard-label">Show in the scene</p>' + opts.map(([k, label]) => `<label class="toggle"><span>${label}</span><input type="checkbox" data-display="${k}" ${app.display[k] ? 'checked' : ''}><span class="toggle-track"></span></label>`).join('');
      $('display-menu').querySelectorAll('[data-display]').forEach((inp) => inp.addEventListener('change', () => app.setDisplay(inp.dataset.display, inp.checked)));
    }
    buildDisplayMenu();
    ui.buildDisplayMenu = buildDisplayMenu;

    // ---------- Dialogs ----------

    function openDialog(d) { if (typeof d.showModal === 'function') d.showModal(); else d.setAttribute('open', ''); }
    function buildExamples() {
      const list = app.examples;
      if (!list || !list.length) {
        $('examples-list').innerHTML = `<li class="examples-note">${list ? 'The examples could not be loaded. Check your connection and try again.' : 'Loading examples…'}</li>`;
        return;
      }
      $('examples-list').innerHTML = list.map((ex, i) => `<li><button type="button" class="example" data-example="${i}"><span class="ex-num">${i + 1}</span><span><strong>${esc(ex.title)}</strong><span class="ex-text">${mathText(ex.text, ex.plain || ex.text)}</span></span></button></li>`).join('');
      $('examples-list').querySelectorAll('[data-example]').forEach((b) => b.addEventListener('click', () => {
        $('dlg-examples').close();
        app.openExample(Number(b.dataset.example));
      }));
    }
    ui.buildExamples = buildExamples;
    buildExamples();
    $('btn-examples').addEventListener('click', () => openDialog($('dlg-examples')));
    $('empty-examples').addEventListener('click', () => openDialog($('dlg-examples')));
    $('empty-clean').addEventListener('click', () => { app.emptyDismissed = true; ui.syncToolbar(); app.canvas.focus(); });

    ui.confirm = function confirm(title, text, okLabel = 'OK') {
      return new Promise((resolve) => {
        const d = $('dlg-confirm');
        d.querySelector('h2').textContent = title;
        d.querySelector('p').textContent = text;
        d.querySelector('[data-ok]').textContent = okLabel;
        d.returnValue = '';
        const done = () => { d.removeEventListener('close', done); resolve(d.returnValue === 'ok'); };
        d.addEventListener('close', done);
        openDialog(d);
      });
    };

    let toastTimer = 0;
    ui.toast = function toast(text, action) {
      const t = $('toast');
      t.innerHTML = `<span>${esc(text)}</span>` + (action ? `<button type="button" class="toast-btn">${esc(action.label)}</button>` : '');
      if (action) t.querySelector('button').addEventListener('click', () => { t.hidden = true; action.run(); });
      t.hidden = false;
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => { t.hidden = true; }, action ? 7000 : 4000);
    };

    // ---------- Inspector fields ----------

    // A numeric entry with its unit, optionally paired with a slider.
    function numField(opt) {
      const id = 'f' + Math.random().toString(36).slice(2, 9);
      const wrap = document.createElement('div');
      wrap.className = 'field';
      const toSlider = (v) => (opt.log ? Math.log10(Math.max(v, opt.slider[0])) : v);
      const fromSlider = (v) => (opt.log ? Math.pow(10, v) : v);
      const sl = opt.slider;
      wrap.innerHTML = `<div class="field-row"><label for="${id}">${mathText(opt.label, opt.plain)}</label><span class="num"><input id="${id}" type="text" inputmode="decimal" autocomplete="off" spellcheck="false"><span class="unit">${esc(opt.unit || '')}</span></span></div>`
        + (sl ? `<input class="slider" type="range" aria-label="${esc(opt.plain || opt.label)}" min="${toSlider(sl[0])}" max="${toSlider(sl[1])}" step="${opt.log ? 0.001 : opt.step || 0.01}">` : '')
        + (opt.help ? `<p class="field-help">${esc(opt.help)}</p>` : '');
      const input = wrap.querySelector('input[type="text"]');
      const slider = wrap.querySelector('.slider');
      const show = () => {
        const v = opt.get();
        if (document.activeElement !== input) input.value = fmtField(opt.display ? opt.display(v) : v);
        if (slider) slider.value = String(toSlider(Math.min(Math.max(v, sl[0]), sl[1])));
        input.disabled = !!(opt.disabled && opt.disabled());
        if (slider) slider.disabled = input.disabled;
      };
      const commit = (raw, key) => {
        let v = Number(String(raw).replace('−', '-').replace(',', '.'));
        if (!Number.isFinite(v)) { input.setAttribute('aria-invalid', 'true'); return; }
        if (opt.parse) v = opt.parse(v);
        v = Math.min(Math.max(v, opt.min), opt.max);
        if (opt.integer) v = Math.round(v);
        input.removeAttribute('aria-invalid');
        opt.set(v, key);
      };
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { commit(input.value, id + ':typed'); input.blur(); }
        if (e.key === 'Escape') { input.removeAttribute('aria-invalid'); input.blur(); show(); }
        e.stopPropagation();
      });
      input.addEventListener('change', () => commit(input.value, id + ':typed'));
      input.addEventListener('blur', () => { if (!input.hasAttribute('aria-invalid')) show(); });
      if (slider) {
        slider.addEventListener('input', () => {
          let v = fromSlider(Number(slider.value));
          v = Number(v.toPrecision(opt.log ? 3 : 6));
          if (opt.integer) v = Math.round(v);
          opt.set(v, id + ':slider');
          input.value = fmtField(opt.display ? opt.display(v) : v);
        });
        slider.addEventListener('keydown', (e) => e.stopPropagation());
      }
      show();
      ui.fields.push(show);
      return wrap;
    }

    // Drag model and its coefficient. World and objects share this layout; objects add a World option.
    function dragFields(get, isWorld = false) {
      const el = document.createElement('div');
      el.className = 'drag-fields';
      const off = () => !isWorld && get().fixed;
      const set = (key, rerender = false) => (value, coalesce) => app.editParam(() => { get()[key] = value; }, coalesce, false, rerender);
      // A full-width segmented choice built from radios, so arrow keys move between options.
      function segment(label, key, options, current) {
        const name = 'r' + Math.random().toString(36).slice(2, 9);
        const group = document.createElement('div');
        group.className = options.length > 3 ? 'drag-seg is-compact' : 'drag-seg';
        group.setAttribute('role', 'radiogroup');
        group.setAttribute('aria-label', label);
        group.style.setProperty('--n', options.length);
        group.innerHTML = options.map(([value, text]) => `<label><input type="radio" name="${name}" value="${value}" data-drag-field="${key}"${value === current ? ' checked' : ''}${off() ? ' disabled' : ''}><span>${esc(text)}</span></label>`).join('');
        group.addEventListener('change', (e) => {
          set(key, true)(e.target.value);
          const replacement = $('inspector-body').querySelector(`[data-drag-field="${key}"]:checked`);
          if (replacement) replacement.focus();
        });
        return group;
      }
      const model = isWorld ? S.worldDragModel(app.scene) : S.objectDragModel(get());
      // Match the physics: an older scene with only a viscosity uses Stokes.
      const source = get().linearDragSource || (get().viscosity > 0 ? 'stokes' : 'coefficient');
      // The force law sits beside the heading; it is left out for None, World and fixed objects.
      const law = off() ? null : model === 'quadratic' ? ['F = kv^2', 'F = kv²'] : model !== 'linear' ? null : source === 'stokes' ? ['F = 6\\pi r\\eta v', 'F = 6πrηv'] : ['F = bv', 'F = bv'];
      const head = document.createElement('div');
      head.className = 'drag-head';
      head.innerHTML = `<span class="choice-label">Model</span>` + (law ? `<span class="drag-law">${mathText(`\\(${law[0]}\\)`, law[1])}</span>` : '');
      el.appendChild(head);
      el.appendChild(segment(isWorld ? 'World drag model' : 'Object drag model', 'dragModel', [
        ...(!isWorld ? [['world', 'World']] : []), ...Object.entries(S.DRAG_MODELS)
      ], model));
      const note = document.createElement('p');
      if (isWorld) {
        note.className = 'field-help';
        note.textContent = 'Objects follow these settings unless they choose their own drag.';
      } else {
        const message = S.dragOverrideNote(app.scene, get());
        note.className = message ? 'drag-override-note' : 'field-help';
        note.setAttribute('role', 'status');
        note.textContent = get().fixed ? 'Fixed objects do not experience drag.' : message || `Following World: ${S.DRAG_MODELS[S.worldDragModel(app.scene)]}. World changes apply to this object.`;
      }
      el.appendChild(note);
      if (model === 'linear') {
        const row = document.createElement('div');
        row.className = 'choice-row drag-source';
        row.innerHTML = '<span class="choice-label">Set by</span>';
        row.appendChild(segment('Linear drag calculation', 'linearDragSource', [['coefficient', 'Coefficient b'], ['stokes', 'Viscosity η']], source));
        el.appendChild(row);
        const field = source === 'stokes'
          ? { label: 'Fluid viscosity \\(\\eta\\)', plain: 'Fluid viscosity η', unit: 'Pa·s', get: () => get().viscosity || 0, set: set('viscosity'), min: L.viscosity[0], max: L.viscosity[1], slider: L.viscosity, step: 0.001, help: 'Stokes’ law for a sphere; other shapes use a sphere of equal area. No buoyancy.' }
          : { label: 'Coefficient \\(b\\)', plain: 'Linear coefficient b', unit: 'kg/s', get: () => get().linearDrag, set: set('linearDrag'), min: L.linearDrag[0], max: L.linearDrag[1], slider: [0, 10], step: 0.01, help: 'Drag grows in proportion to speed.' };
        field.disabled = off;
        el.appendChild(numField(field));
      } else if (model === 'quadratic') {
        el.appendChild(numField({ label: 'Coefficient \\(k\\)', plain: 'Quadratic coefficient k', unit: 'kg/m', get: () => get().drag, set: set('drag'), min: L.drag[0], max: L.drag[1], slider: [0, 1], step: 0.001, disabled: off, help: 'Drag grows with speed squared. k combines the fluid with the object’s size and shape.' }));
      }
      return el;
    }

    function toggleField(label, get, set, help) {
      const el = document.createElement('label');
      el.className = 'toggle';
      el.innerHTML = `<span>${esc(label)}</span><input type="checkbox"><span class="toggle-track"></span>`;
      const inp = el.querySelector('input');
      inp.checked = !!get();
      inp.addEventListener('change', () => set(inp.checked));
      ui.fields.push(() => { inp.checked = !!get(); });
      if (help) el.title = help;
      return el;
    }

    // A small segmented control, such as a motor's direction.
    function choiceField(label, options, get, set) {
      const el = document.createElement('div');
      el.className = 'field choice-row';
      el.innerHTML = `<span class="choice-label">${esc(label)}</span><span class="seg" role="group" aria-label="${esc(label)}">${options.map((o) => `<button type="button" data-v="${o.v}" title="${esc(o.title || o.label)}">${o.icon ? icon(o.icon) : ''}<span>${esc(o.label)}</span></button>`).join('')}</span>`;
      const sync = () => el.querySelectorAll('[data-v]').forEach((b) => b.setAttribute('aria-pressed', String(String(get()) === b.dataset.v)));
      el.querySelectorAll('[data-v]').forEach((b) => b.addEventListener('click', () => { set(Number(b.dataset.v)); sync(); }));
      sync();
      ui.fields.push(sync);
      return el;
    }

    // Motor direction and speed: speed is entered as a size, the direction chosen apart.
    const motorDir = (x) => (x.dir === 1 || x.dir === -1 ? x.dir : x.speed > 0 ? 1 : -1);
    function motorFields(l, param, help) {
      return [
        choiceField('Direction', [{ v: -1, label: 'Clockwise', icon: 'rotate' }, { v: 1, label: 'Counterclockwise', icon: 'rotateCcw' }], () => motorDir(l()), (d) => app.editParam(() => { const x = l(); x.dir = d; x.speed = d * Math.abs(x.speed); }, null)),
        numField({ label: 'Motor speed \\(\\omega\\)', plain: 'Motor speed ω', unit: 'rad/s', get: () => Math.abs(l().speed), set: param((x, v) => { x.speed = motorDir(x) * v; }), min: 0, max: L.speed[1], slider: [0, 30], step: 0.1, help: help ? 'How fast the part turns relative to what it is hinged to. Clockwise drives a wheel to the right.' : '' })
      ];
    }

    // Rods and ropes: their length, and whether they are solid (collide, have mass).
    // A solid connector is rebuilt from bodies, so its changes go through setup edits.
    function connectorFields(l, quickRefresh) {
      const set = (fn) => (v, key) => {
        if (l().solid) app.edit(() => fn(l(), v), { coalesce: key, fromInspector: true });
        else app.editParam(() => fn(l(), v), key);
      };
      const rod = l().kind === 'rod';
      const out = [
        numField({ label: 'Length \\(L\\)', plain: 'Length L', unit: 'm', get: () => l().length, set: set((x, v) => { x.length = v; }), min: L.length[0], max: L.length[1], slider: [0.05, 10], step: 0.01,
          help: quickRefresh ? '' : l().solid ? (rod ? 'A solid rod is a thin bar hinged at both ends: objects collide with it and its mass swings with it.' : 'A solid rope is a chain of short hinged segments: it drapes, wraps round objects and has weight.') : (rod ? 'A rod is massless and rigid; nothing collides with it.' : 'A rope is massless and pulls only when taut; nothing collides with it.') }),
        toggleField('Solid: collides and has mass', () => l().solid, (v) => {
          if (v && S.joinPair(app.scene, l())) { app.toast('A joined rod or rope stays ideal; separate it from the spring first.'); app.ui.refreshFields(); return; }
          app.edit(() => { const x = l(); x.solid = v; if (v && !(x.mass > 0)) x.mass = S.defaultSolidMass(x); });
          if (quickRefresh) quickRefresh();
        }, 'Off: an ideal, massless connector, as in textbook problems.')
      ];
      if (l().solid) out.push(numField({ label: 'Mass \\(m\\)', plain: 'Mass m', unit: 'kg', get: () => l().mass, set: set((x, v) => { x.mass = v; }), min: 0.001, max: 1000, slider: [0.01, 20], log: true }));
      return out;
    }

    // A pulley: its rope length (at least the taut length; longer leaves it slack), and the
    // wheel's radius and position. The length applies live; the wheel is part of the setup.
    function pulleyFields(l, quick) {
      // Joined to a spring, the rope only has to keep the join off the wheel.
      const taut = () => {
        if (S.joinPair(app.scene, l())) return S.minPulleyLength(app.scene, l(), app.poseOf);
        const r = app.sim && app.sim.t > 0 ? app.sim.readLink(l().id) : null;
        return r ? r.length : S.linkLength(app.scene, l());
      };
      const atLeastTaut = (v) => {
        const min = Math.ceil(taut() * 1000) / 1000;
        if (v < min - 1e-9) { app.toast(S.joinPair(app.scene, l()) ? `The rope must be at least ${fmt(min)} m long to keep the join off the wheel.` : `The rope must be at least ${fmt(min)} m long to reach over the wheel to both ends.`); return min; }
        return v;
      };
      // Geometry edits keep the rope taut, as moving its ends does; a change that would put an
      // end inside the wheel or the wheel over a movable object is refused.
      const setWheel = (fn) => (v, key) => {
        const next = { ...l() };
        fn(next, v);
        const problem = S.pulleyProblem(app.scene, next, app.poseOf);
        if (problem) { app.toast(problem); app.ui.refreshFields(); return; }
        app.edit(() => { const x = l(); fn(x, v); S.refitLink(app.scene, x); }, { coalesce: key, fromInspector: true });
      };
      const out = [
        numField({ label: 'Rope length \\(L\\)', plain: 'Rope length L', unit: 'm', get: () => l().length, set: (v, key) => app.editParam(() => { l().length = Math.max(v, Math.ceil(taut() * 1000) / 1000); }, key), parse: atLeastTaut, min: L.length[0], max: L.length[1], slider: [0.05, 10], step: 0.01,
          help: quick ? '' : 'The whole rope: both sides and the part round the wheel. It cannot be shorter than the path over the wheel; longer leaves it slack.' }),
        numField({ label: 'Wheel radius \\(r\\)', plain: 'Wheel radius r', unit: 'm', get: () => l().r, set: setWheel((x, v) => { x.r = v; }), min: L.wheel[0], max: L.wheel[1], slider: [0.05, 0.5], step: 0.01 })
      ];
      if (!quick) {
        out.push(numField({ label: 'Wheel \\(x\\)', plain: 'Wheel x', unit: 'm', get: () => l().px, set: setWheel((x, v) => { x.px = v; }), min: L.coord[0], max: L.coord[1] }));
        out.push(numField({ label: 'Wheel \\(y\\)', plain: 'Wheel y', unit: 'm', get: () => l().py, set: setWheel((x, v) => { x.py = v; }), min: L.coord[0], max: L.coord[1],
          help: 'The wheel is fixed and frictionless and has no mass; objects collide with it. The rope is massless, cannot stretch, and pulls only when taut.' }));
      }
      return out;
    }

    function card(label, extraClass = '') {
      const el = document.createElement('section');
      el.className = 'icard ' + extraClass;
      if (label) el.innerHTML = `<h3 class="icard-label">${esc(label)}</h3>`;
      return el;
    }

    // Live readings: rows updated in place while the simulation runs.
    function readingsCard(title, rows) {
      const el = card(title, 'readings-card');
      el.querySelector('.icard-label').classList.add('readings-title');
      const dl = document.createElement('dl');
      dl.className = 'readings';
      dl.innerHTML = rows.map((r) => (r === '-' ? '<div class="reading-sep" aria-hidden="true"></div>' : `<div class="reading"><dt>${mathText(r.label, r.plain)}</dt><dd class="ds-readout" data-r="${r.key}">—</dd></div>`)).join('');
      el.appendChild(dl);
      return el;
    }

    function actions(list) {
      const el = document.createElement('div');
      el.className = 'mini-actions';
      list.forEach((a) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'mini-tool' + (a.danger ? ' danger' : '');
        b.innerHTML = icon(a.icon) + `<span>${esc(a.label)}</span>`;
        if (a.pressed !== undefined) b.setAttribute('aria-pressed', String(a.pressed));
        b.addEventListener('click', a.run);
        el.appendChild(b);
      });
      return el;
    }

    function head(kindLabel, name, art, onName) {
      const el = document.createElement('div');
      el.className = 'insp-head';
      el.innerHTML = `<div class="insp-swatch">${art}</div><div class="insp-head-text"><p class="icard-label">${esc(kindLabel)}</p><input class="insp-name" type="text" maxlength="40" aria-label="Name" spellcheck="false"></div>`;
      const inp = el.querySelector('input');
      inp.value = name;
      inp.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === 'Escape') inp.blur(); e.stopPropagation(); });
      inp.addEventListener('change', () => { const v = inp.value.trim().slice(0, 40); if (v) onName(v); else inp.value = name; });
      return el;
    }

    const L = S.LIMITS;
    const deg = 180 / Math.PI;

    function bodyInspector(body, body2) {
      const b = () => S.bodyById(app.scene, body.id) || body;
      const param = (fn) => (v, key) => app.editParam(() => fn(b(), v), key);
      const setup = (fn) => (v, key) => app.edit(() => fn(b(), v), { coalesce: key, fromInspector: true });
      const kindLabel = (b().kind === 'wedge' ? 'Ramp' : S.BODY_KINDS[b().kind].label) + (b().fixed ? ' · fixed' : ' · movable');

      const main = card('');
      main.appendChild(head(kindLabel, b().name, bodyArt(b()), (v) => app.editParam(() => { b().name = v; }, null, true)));
      main.appendChild(numField({ label: 'Mass \\(m\\)', plain: 'Mass m', unit: 'kg', get: () => b().mass, set: param((x, v) => { x.mass = v; }), min: L.mass[0], max: L.mass[1], slider: [0.01, 100], log: true, disabled: () => b().fixed }));
      main.appendChild(numField({ label: 'Friction \\(\\mu\\)', plain: 'Friction μ', unit: '', get: () => b().friction, set: param((x, v) => { x.friction = v; }), min: L.friction[0], max: L.friction[1], slider: [0, 1.5], step: 0.01 }));
      main.appendChild(numField({ label: 'Restitution \\(e\\)', plain: 'Restitution e', unit: '', get: () => b().restitution, set: param((x, v) => { x.restitution = v; }), min: 0, max: 1, slider: [0, 1], step: 0.01, help: '1 is perfectly bouncy, 0 does not bounce.' }));
      main.appendChild(toggleField('Fixed in place', () => b().fixed, (v) => app.edit(() => { b().fixed = v; if (v && b().color !== 'slate') b().color = 'slate'; else if (!v && b().color === 'slate') b().color = S.COLOR_CYCLE[0]; })));
      if (!b().fixed) main.appendChild(toggleField('Lock rotation', () => b().lockRotation, (v) => app.edit(() => { b().lockRotation = v; }), 'The object slides without turning, like a cart.'));
      const sw = document.createElement('div');
      sw.className = 'swatches';
      sw.setAttribute('role', 'group');
      sw.setAttribute('aria-label', 'Color');
      Object.keys(S.COLORS).forEach((name) => {
        const s = document.createElement('button');
        s.type = 'button';
        s.className = 'swatch';
        s.style.setProperty('--c', S.COLORS[name].fill);
        s.style.setProperty('--c2', S.COLORS[name].stroke);
        s.setAttribute('aria-label', name);
        s.setAttribute('aria-pressed', String(b().color === name));
        s.addEventListener('click', () => {
          app.editParam(() => { b().color = name; }, null);
          sw.querySelectorAll('.swatch').forEach((x) => x.setAttribute('aria-pressed', String(x === s)));
        });
        sw.appendChild(s);
      });
      main.appendChild(sw);
      main.appendChild(actions([
        ...(b().fixed ? [] : [{ icon: 'graph', label: 'Graph', run: () => app.trackObject({ type: 'body', id: b().id }, true), pressed: app.track.type === 'body' && app.track.id === b().id }]),
        { icon: 'duplicate', label: 'Duplicate', run: () => app.duplicateSelection() },
        { icon: 'trash', label: 'Delete', run: () => app.deleteSelection(), danger: true }
      ]));

      const drag = card('Drag');
      drag.appendChild(dragFields(b));
      const geo = card('Size and position');
      const k = b().kind;
      if (k === 'ball' || k === 'polygon') geo.appendChild(numField({ label: 'Radius \\(r\\)', plain: 'Radius r', unit: 'm', get: () => b().r, set: setup((x, v) => { x.r = v; S.refitLengths(app.scene, new Set([x.id])); }), min: L.r[0], max: L.r[1], slider: [0.05, 2], step: 0.01 }));
      if (k === 'custom') {
        // A merged or cut shape keeps its outline; width scales it evenly.
        const widthOf = (x) => { const v = S.vertices(x); return Math.max(...v.map((p) => p.x)) - Math.min(...v.map((p) => p.x)); };
        geo.appendChild(numField({ label: 'Width', unit: 'm', get: () => widthOf(b()), set: setup((x, v) => { x.paths = PPM.shapes.scalePaths(x.paths, v / widthOf(x)); }), min: 0.02, max: 40, slider: [0.05, 10], step: 0.01, help: 'Scales the whole shape evenly.' }));
        const info = document.createElement('p');
        info.className = 'field-help';
        const showInfo = () => { const d = PPM.shapes.decompose(b().paths); info.textContent = `Area ${fmt(d.area)} m², made of ${d.pieces.length} convex piece${d.pieces.length === 1 ? '' : 's'}.`; };
        showInfo();
        ui.fields.push(showInfo);
        geo.appendChild(info);
      }
      if (k === 'polygon') geo.appendChild(numField({ label: 'Sides', unit: '', get: () => b().sides, set: setup((x, v) => { x.sides = v; }), min: 3, max: 8, slider: [3, 8], step: 1, integer: true }));
      if (k === 'box' || k === 'plank' || k === 'wedge') {
        geo.appendChild(numField({ label: 'Width \\(w\\)', plain: 'Width w', unit: 'm', get: () => b().w, set: setup((x, v) => { x.w = v; }), min: L.w[0], max: L.w[1], slider: [0.05, 10], step: 0.01 }));
        geo.appendChild(numField({ label: 'Height \\(h\\)', plain: 'Height h', unit: 'm', get: () => b().h, set: setup((x, v) => { x.h = v; }), min: L.h[0], max: L.h[1], slider: [0.05, 10], step: 0.01 }));
      }
      if (k === 'wedge') {
        const angle = document.createElement('p');
        angle.className = 'field-help';
        const showAngle = () => { angle.textContent = `Slope angle ${fmt(Math.atan2(b().h, b().w) * deg, 1)}°`; };
        showAngle();
        ui.fields.push(showAngle);
        geo.appendChild(angle);
        geo.appendChild(toggleField('Slope faces left', () => b().flip, (v) => app.edit(() => { b().flip = v; })));
      }
      geo.appendChild(numField({ label: '\\(x\\)', plain: 'x', unit: 'm', get: () => b().x, set: setup((x, v) => moveBodyTo(x, v, x.y)), min: L.coord[0], max: L.coord[1] }));
      geo.appendChild(numField({ label: '\\(y\\)', plain: 'y', unit: 'm', get: () => b().y, set: setup((x, v) => moveBodyTo(x, x.x, v)), min: L.coord[0], max: L.coord[1] }));
      geo.appendChild(numField({ label: 'Angle \\(\\theta\\)', plain: 'Angle θ', unit: '°', get: () => b().angle * deg, set: setup((x, v) => rotateBodyTo(x, v / deg)), min: -3600, max: 3600, slider: [-180, 180], step: 1 }));

      const cards = [main, drag, geo];
      if (!b().fixed) {
        const vel = card('Velocity at the start');
        const speedOf = (x) => Math.hypot(x.vx, x.vy);
        vel.appendChild(numField({ label: 'Speed \\(v\\)', plain: 'Speed v', unit: 'm/s', get: () => speedOf(b()), set: setup((x, v) => { const s = speedOf(x); const a = s > 1e-9 ? Math.atan2(x.vy, x.vx) : 0; x.vx = v * Math.cos(a); x.vy = v * Math.sin(a); cleanVel(x); }), min: 0, max: 500, slider: [0, 30], step: 0.1 }));
        vel.appendChild(numField({ label: 'Direction', unit: '°', get: () => (speedOf(b()) > 1e-9 ? Math.atan2(b().vy, b().vx) * deg : 0), set: setup((x, v) => { const s = speedOf(x) || 1; x.vx = s * Math.cos(v / deg); x.vy = s * Math.sin(v / deg); cleanVel(x); }), min: -360, max: 360, slider: [-180, 180], step: 1, help: 'Measured counterclockwise from the +x direction.' }));
        vel.appendChild(numField({ label: '\\(v_x\\)', plain: 'vx', unit: 'm/s', get: () => b().vx, set: setup((x, v) => { x.vx = v; }), min: L.velocity[0], max: L.velocity[1] }));
        vel.appendChild(numField({ label: '\\(v_y\\)', plain: 'vy', unit: 'm/s', get: () => b().vy, set: setup((x, v) => { x.vy = v; }), min: L.velocity[0], max: L.velocity[1] }));
        if (!b().lockRotation) vel.appendChild(numField({ label: 'Angular velocity \\(\\omega\\)', plain: 'Angular velocity ω', unit: 'rad/s', get: () => b().omega, set: setup((x, v) => { x.omega = v; }), min: L.omega[0], max: L.omega[1], help: 'Positive is counterclockwise.' }));
        cards.push(vel);
        cards.push(readingsCard('Now', [
          { key: 'x', label: '\\(x\\)', plain: 'x' }, { key: 'y', label: '\\(y\\)', plain: 'y' },
          { key: 'vx', label: '\\(v_x\\)', plain: 'vx' }, { key: 'vy', label: '\\(v_y\\)', plain: 'vy' },
          { key: 'speed', label: 'Speed \\(v\\)', plain: 'Speed v' }, { key: 'omega', label: 'Angular velocity \\(\\omega\\)', plain: 'Angular velocity ω' }, '-',
          { key: 'KE', label: 'Kinetic energy \\(E_\\mathrm{k}\\)', plain: 'Kinetic energy' }, { key: 'GPE', label: 'Gravitational energy \\(E_\\mathrm{p}\\)', plain: 'Gravitational energy' },
          { key: 'p', label: 'Momentum \\(p\\)', plain: 'Momentum p' }
        ]));
        ui.readings = { type: 'body', id: b().id };
      } else {
        ui.readings = null;
      }
      return cards;
    }

    function cleanVel(x) {
      if (Math.abs(x.vx) < 1e-9) x.vx = 0;
      if (Math.abs(x.vy) < 1e-9) x.vy = 0;
    }

    function moveBodyTo(b, x, y) {
      const dx = x - b.x;
      const dy = y - b.y;
      S.transformBodies(app.scene, S.rigidGroup(app.scene, b.id), (p, angle) => ({ x: p.x + dx, y: p.y + dy, angle }));
    }
    function rotateBodyTo(b, angle) {
      const d = angle - b.angle;
      const cx = b.x; const cy = b.y;
      const cos = Math.cos(d); const sin = Math.sin(d);
      S.transformBodies(app.scene, S.rigidGroup(app.scene, b.id), (p, a) => ({ x: cx + cos * (p.x - cx) - sin * (p.y - cy), y: cy + sin * (p.x - cx) + cos * (p.y - cy), angle: a + d }));
    }
    ui.rotateBodyTo = rotateBodyTo;
    ui.moveBodyTo = moveBodyTo;

    function endName(id) {
      if (!id) return 'the background';
      const b = S.bodyById(app.scene, id);
      if (b) return b.name;
      const l = S.linkById(app.scene, id);
      return l ? l.name : '?';
    }
    // Springs joined to springs have no damping: a massless join cannot share it exactly.
    const seriesSprings = (l) => { const p = S.joinPair(app.scene, l); return !!p && p.other.kind === 'spring'; };
    const DAMPING_HELP = 'Damping force c × (rate of extension). 0 for an ideal spring.';
    const SERIES_HELP = 'Springs joined end to end have no damping in this model.';

    function linkInspector(link) {
      const l = () => S.linkById(app.scene, link.id) || link;
      const param = (fn) => (v, key) => app.editParam(() => fn(l(), v), key);
      const kindLabel = l().kind === 'hinge' ? (l().motor ? 'Motor' : 'Hinge') : S.LINK_KINDS[l().kind].label;
      const main = card('');
      const artKind = l().kind === 'hinge' && l().motor ? 'motor' : l().kind;
      main.appendChild(head(kindLabel, l().name, partSvg(artKind), (v) => app.editParam(() => { l().name = v; }, null, true)));
      const between = document.createElement('p');
      between.className = 'icard-note';
      between.textContent = l().kind === 'hinge' || l().kind === 'weld'
        ? `Joins ${endName(l().a)} to ${endName(l().b)}.`
        : l().kind === 'pulley' ? `Over the wheel from ${endName(l().a)} to ${endName(l().b)}.`
          : `From ${endName(l().a)} to ${endName(l().b)}.`;
      main.appendChild(between);
      const pair = S.joinPair(app.scene, l());
      if (pair) {
        const joined = document.createElement('p');
        joined.className = 'icard-note';
        const partner = pair.spring === l() ? pair.other : pair.spring;
        joined.textContent = `Joined end to end with ${partner.name}: one pull runs through both, and the join has no mass.`;
        main.appendChild(joined);
      }
      const rows = [];
      if (l().kind === 'spring') {
        main.appendChild(numField({ label: 'Spring constant \\(k\\)', plain: 'Spring constant k', unit: 'N/m', get: () => l().k, set: param((x, v) => { x.k = v; }), min: L.k[0], max: L.k[1], slider: [1, 5000], log: true }));
        main.appendChild(numField({ label: 'Natural length \\(L_0\\)', plain: 'Natural length L0', unit: 'm', get: () => l().rest, set: param((x, v) => { x.rest = v; }), min: L.rest[0], max: L.rest[1], slider: [0, 5], step: 0.01 }));
        main.appendChild(numField({ label: 'Damping \\(c\\)', plain: 'Damping c', unit: 'N s/m', get: () => l().damping, set: param((x, v) => { x.damping = v; }), min: L.damping[0], max: L.damping[1], slider: [0, 20], step: 0.05, disabled: () => seriesSprings(l()), help: seriesSprings(l()) ? SERIES_HELP : DAMPING_HELP }));
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'btn-secondary';
        btn.textContent = 'Set natural length to the current length';
        btn.addEventListener('click', () => {
          const r = app.sim && app.sim.readLink(l().id);
          const len = r ? r.length : S.linkLength(app.scene, l());
          app.editParam(() => { l().rest = Math.round(len * 1000) / 1000; }, null);
        });
        main.appendChild(btn);
        rows.push({ key: 'length', label: 'Length \\(L\\)', plain: 'Length L' }, { key: 'extension', label: 'Extension \\(\\Delta L\\)', plain: 'Extension' }, { key: 'tension', label: 'Tension \\(F\\)', plain: 'Tension F' }, { key: 'EPE', label: 'Elastic energy \\(E_\\mathrm{e}\\)', plain: 'Elastic energy' });
      } else if (l().kind === 'rod' || l().kind === 'rope') {
        connectorFields(l, null).forEach((el) => main.appendChild(el));
        rows.push({ key: 'length', label: 'Distance between ends', plain: 'Distance' }, { key: 'force', label: 'Tension \\(T\\)', plain: 'Tension T' });
      } else if (l().kind === 'pulley') {
        pulleyFields(l, false).forEach((el) => main.appendChild(el));
        rows.push({ key: 'force', label: 'Tension \\(T\\)', plain: 'Tension T' }, { key: 'sideA', label: `Side to ${endName(l().a)}`, plain: `Side to ${endName(l().a)}` }, { key: 'sideB', label: `Side to ${endName(l().b)}`, plain: `Side to ${endName(l().b)}` }, { key: 'slack', label: 'Slack', plain: 'Slack' });
      } else if (l().kind === 'hinge') {
        main.appendChild(toggleField('Motor', () => l().motor, (v) => app.editParam(() => { l().motor = v; if (v && !l().torque) l().torque = 50; if (v && !l().speed) l().speed = 3 * motorDir(l()); }, null, false, true)));
        if (l().motor) {
          motorFields(l, param, true).forEach((el) => main.appendChild(el));
          main.appendChild(numField({ label: 'Maximum torque', unit: 'N m', get: () => l().torque, set: param((x, v) => { x.torque = v; }), min: L.torque[0], max: L.torque[1], slider: [0.1, 1000], log: true }));
          rows.push({ key: 'rate', label: 'Relative angular velocity', plain: 'Angular velocity' }, { key: 'torque', label: 'Motor torque', plain: 'Motor torque' });
        }
        rows.push({ key: 'force', label: 'Force on the pin', plain: 'Force on the pin' });
      } else if (l().kind === 'weld') {
        rows.push({ key: 'force', label: 'Force on the joint', plain: 'Force on the joint' });
      }
      main.appendChild(actions([
        ...(l().kind === 'spring' ? [{ icon: 'graph', label: 'Graph', run: () => app.trackObject({ type: 'link', id: l().id }, true), pressed: app.track.type === 'link' && app.track.id === l().id }] : []),
        { icon: 'trash', label: 'Delete', run: () => app.deleteSelection(), danger: true }
      ]));
      const cards = [main];
      if (rows.length) { cards.push(readingsCard('Now', rows)); ui.readings = { type: 'link', id: l().id, kind: l().kind }; } else ui.readings = null;
      return cards;
    }

    function multiInspector() {
      const ids = app.selectedBodies();
      const bodies = ids.map((id) => S.bodyById(app.scene, id)).filter(Boolean);
      const c2 = card(`${bodies.length} objects selected`);
      const list = document.createElement('ol');
      list.className = 'multi-list';
      list.innerHTML = bodies.map((b, i) => `<li><span class="multi-art">${bodyArt(b)}</span><span>${esc(b.name)}</span>${i === bodies.length - 1 ? '<span class="multi-tag">cutter</span>' : ''}</li>`).join('');
      c2.appendChild(list);
      const note = document.createElement('p');
      note.className = 'icard-note';
      const last = bodies[bodies.length - 1];
      note.textContent = `Merge joins them into one rigid shape with their total mass. Subtract cuts ${last ? last.name : 'the last one'} (picked last) out of the others and removes it. Shift-click an object to add or remove it.`;
      c2.appendChild(note);
      c2.appendChild(actions([
        { icon: 'merge', label: 'Merge', run: () => app.mergeSelection() },
        { icon: 'subtract', label: 'Subtract', run: () => app.subtractSelection() },
        { icon: 'trash', label: 'Delete all', run: () => app.deleteSelection(), danger: true }
      ]));
      if (app.running) {
        const r = document.createElement('p');
        r.className = 'icard-note';
        r.textContent = 'Pause the simulation to merge or subtract.';
        c2.appendChild(r);
      }
      ui.readings = null;
      return [c2];
    }

    function worldInspector() {
      const w = () => app.scene.world;
      // One World card holds the scene-wide settings, in Gravity, Drag, Floor and Accuracy sections.
      const world = card('', 'world-card');
      const top = document.createElement('div');
      top.className = 'insp-head';
      top.innerHTML = '<div class="insp-swatch world-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18M5 7.5h14M5 16.5h14"/></svg></div>'
        + '<div class="insp-head-text"><h3 class="world-title">World</h3><p class="world-sub">Applies to the whole scene</p></div>';
      const reset = document.createElement('button');
      reset.type = 'button';
      reset.id = 'btn-world-reset';
      reset.className = 'tool world-reset';
      reset.title = 'Reset world settings to defaults';
      reset.setAttribute('aria-label', reset.title);
      reset.innerHTML = icon('reset');
      reset.addEventListener('click', async () => {
        if (!(await ui.confirm('Reset world settings?', 'This restores all World settings, including gravity, drag, floor and accuracy, to their defaults. You can undo it.', 'Reset world settings'))) return;
        const defaults = S.createScene().world;
        const restoreDefaults = () => { app.scene.world = defaults; };
        // Floor changes rebuild the scene; other settings can apply live.
        if (w().floor !== defaults.floor) app.edit(restoreDefaults);
        else app.editParam(restoreDefaults, null, false, true);
        $('btn-world-reset').focus({ preventScroll: true });
      });
      top.appendChild(reset);
      world.appendChild(top);
      const section = (label) => {
        const el = document.createElement('section');
        el.className = 'world-section';
        el.innerHTML = `<h4 class="icard-label">${esc(label)}</h4>`;
        world.appendChild(el);
        return el;
      };
      const gravity = section('Gravity');
      gravity.appendChild(numField({ label: 'Gravity \\(g\\)', plain: 'Gravity g', unit: 'N/kg', get: () => w().gravity, set: (v, key) => app.editParam(() => { w().gravity = v; }, key), min: L.gravity[0], max: L.gravity[1], slider: [0, 25], step: 0.01 }));
      const presets = document.createElement('div');
      presets.className = 'preset-row';
      presets.setAttribute('role', 'group');
      presets.setAttribute('aria-label', 'Gravity presets');
      [['Earth', 9.81], ['Moon', 1.62], ['Mars', 3.71], ['Jupiter', 24.79]].forEach(([name, g]) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'ds-chip';
        b.textContent = name;
        const sync = () => b.setAttribute('aria-pressed', String(Math.abs(w().gravity - g) < 1e-9));
        sync();
        ui.fields.push(sync);
        b.addEventListener('click', () => app.editParam(() => { w().gravity = g; }, null));
        presets.appendChild(b);
      });
      gravity.appendChild(presets);
      gravity.appendChild(numField({ label: '\\(E_\\mathrm{p} = 0\\) at height', plain: 'Zero of gravitational energy at height', unit: 'm', get: () => w().gpeZero || 0, set: (v, key) => app.editParam(() => { w().gpeZero = v; }, key), min: L.coord[0], max: L.coord[1], help: 'The reference for gravitational energy. A dashed line marks it when it is not 0.' }));
      const drag = section('Drag');
      drag.appendChild(dragFields(w, true));
      const floor = section('Floor');
      floor.appendChild(toggleField('Floor at y = 0', () => w().floor, (v) => app.edit(() => { w().floor = v; })));
      floor.appendChild(numField({ label: 'Friction \\(\\mu\\)', plain: 'Floor friction μ', unit: '', get: () => w().floorFriction, set: (v, key) => app.editParam(() => { w().floorFriction = v; }, key), min: 0, max: 2, slider: [0, 1.5], step: 0.01, disabled: () => !w().floor }));
      const accuracy = section('Accuracy');
      const current = S.worldAccuracy(app.scene);
      const name = 'r' + Math.random().toString(36).slice(2, 9);
      const group = document.createElement('div');
      group.className = 'drag-seg';
      group.setAttribute('role', 'radiogroup');
      group.setAttribute('aria-label', 'Simulation accuracy');
      group.style.setProperty('--n', 3);
      group.innerHTML = Object.entries(S.ACCURACY).map(([value, a]) => `<label><input type="radio" name="${name}" value="${value}" data-accuracy${value === current ? ' checked' : ''}><span>${esc(a.label)}</span></label>`).join('');
      group.addEventListener('change', (e) => {
        app.editParam(() => { w().accuracy = e.target.value; }, null, false, true);
        const replacement = $('inspector-body').querySelector('[data-accuracy]:checked');
        if (replacement) replacement.focus();
      });
      accuracy.appendChild(group);
      const accuracyHelp = document.createElement('p');
      accuracyHelp.className = 'field-help';
      accuracyHelp.textContent = `Time advances in steps of ${S.ACCURACY[current].text} or less. Finer steps resolve fast collisions better but need more computing time, so large scenes may run slower than real time.`;
      accuracy.appendChild(accuracyHelp);
      const sys = readingsCard('System energy now', [
        { key: 'KE', label: 'Kinetic \\(E_\\mathrm{k}\\)', plain: 'Kinetic' }, { key: 'GPE', label: 'Gravitational \\(E_\\mathrm{p}\\)', plain: 'Gravitational' },
        { key: 'EPE', label: 'Elastic \\(E_\\mathrm{e}\\)', plain: 'Elastic' }, '-', { key: 'E', label: 'Total \\(E\\)', plain: 'Total' }
      ]);
      const note = document.createElement('p');
      note.className = 'icard-note';
      note.textContent = 'Moving objects only.';
      sys.appendChild(note);
      sys.appendChild(actions([{ icon: 'graph', label: 'Graph system', run: () => app.trackObject({ type: 'system' }, true), pressed: app.track.type === 'system' }]));
      ui.readings = { type: 'system' };
      const hint = document.createElement('p');
      hint.className = 'insp-hint';
      hint.textContent = app.scene.bodies.length ? 'Select an object or a connector to edit it.' : 'Add parts from the left, or open an example.';
      return [hint, world, sys];
    }

    ui.renderInspector = function renderInspector() {
      const body = $('inspector-body');
      const active = document.activeElement;
      if (active && body.contains(active) && active.matches('input:not([type="radio"])')) {
        // Keep a field the user is typing in; refresh the others.
        ui.refreshFields();
        return;
      }
      ui.fields = [];
      body.innerHTML = '';
      const sel = app.selection;
      let cards;
      if (sel && sel.type === 'body' && app.extra.length) cards = multiInspector();
      else if (sel && sel.type === 'body' && S.bodyById(app.scene, sel.id)) cards = bodyInspector(S.bodyById(app.scene, sel.id));
      else if (sel && sel.type === 'link' && S.linkById(app.scene, sel.id)) cards = linkInspector(S.linkById(app.scene, sel.id));
      else cards = worldInspector();
      cards.forEach((c2) => body.appendChild(c2));
      ui.updateReadings();
      quickFields.forEach((f) => f());
    };

    // ---------- Quick settings (right-click, or touch and hold) ----------

    const quick = document.createElement('section');
    quick.className = 'quick-settings';
    quick.hidden = true;
    quick.setAttribute('role', 'dialog');
    document.body.appendChild(quick);
    let quickFields = [];
    let quickAt = null;

    ui.closeQuick = function closeQuick(returnFocus) {
      if (quick.hidden) return;
      quick.hidden = true;
      quick.innerHTML = '';
      quickFields = [];
      quickAt = null;
      if (returnFocus) app.canvas.focus({ preventScroll: true });
    };

    // The main settings of an object or connector, as compact fields.
    function quickItems(sel) {
      const items = [];
      if (sel.type === 'body') {
        const b = () => S.bodyById(app.scene, sel.id);
        if (!b()) return items;
        const param = (fn) => (v, key) => app.editParam(() => fn(b(), v), key);
        items.push(numField({ label: 'Mass \\(m\\)', plain: 'Mass m', unit: 'kg', get: () => b().mass, set: param((x, v) => { x.mass = v; }), min: L.mass[0], max: L.mass[1], slider: [0.01, 100], log: true, disabled: () => b().fixed }));
        items.push(numField({ label: 'Friction \\(\\mu\\)', plain: 'Friction μ', unit: '', get: () => b().friction, set: param((x, v) => { x.friction = v; }), min: L.friction[0], max: L.friction[1], slider: [0, 1.5], step: 0.01 }));
        items.push(numField({ label: 'Restitution \\(e\\)', plain: 'Restitution e', unit: '', get: () => b().restitution, set: param((x, v) => { x.restitution = v; }), min: 0, max: 1, slider: [0, 1], step: 0.01 }));
        items.push(toggleField('Fixed in place', () => b().fixed, (v) => app.edit(() => { b().fixed = v; if (v && b().color !== 'slate') b().color = 'slate'; else if (!v && b().color === 'slate') b().color = S.COLOR_CYCLE[0]; })));
        return items;
      }
      const l = () => S.linkById(app.scene, sel.id);
      if (!l()) return items;
      const param = (fn) => (v, key) => app.editParam(() => fn(l(), v), key);
      if (l().kind === 'spring') {
        items.push(numField({ label: 'Spring constant \\(k\\)', plain: 'Spring constant k', unit: 'N/m', get: () => l().k, set: param((x, v) => { x.k = v; }), min: L.k[0], max: L.k[1], slider: [1, 5000], log: true }));
        items.push(numField({ label: 'Natural length \\(L_0\\)', plain: 'Natural length L0', unit: 'm', get: () => l().rest, set: param((x, v) => { x.rest = v; }), min: L.rest[0], max: L.rest[1], slider: [0, 5], step: 0.01 }));
        items.push(numField({ label: 'Damping \\(c\\)', plain: 'Damping c', unit: 'N s/m', get: () => l().damping, set: param((x, v) => { x.damping = v; }), min: L.damping[0], max: L.damping[1], slider: [0, 20], step: 0.05, disabled: () => seriesSprings(l()) }));
      } else if (l().kind === 'rod' || l().kind === 'rope') {
        connectorFields(l, () => { if (quickAt) ui.showQuick(sel, quickAt.x, quickAt.y); }).forEach((el) => items.push(el));
      } else if (l().kind === 'pulley') {
        pulleyFields(l, true).forEach((el) => items.push(el));
      } else if (l().kind === 'hinge') {
        items.push(toggleField('Motor', () => l().motor, (v) => {
          app.editParam(() => { l().motor = v; if (v && !l().torque) l().torque = 50; if (v && !l().speed) l().speed = 3 * motorDir(l()); }, null, false, true);
          if (quickAt) ui.showQuick(sel, quickAt.x, quickAt.y);
        }));
        if (l().motor) {
          motorFields(l, param, false).forEach((el) => items.push(el));
          items.push(numField({ label: 'Maximum torque', unit: 'N m', get: () => l().torque, set: param((x, v) => { x.torque = v; }), min: L.torque[0], max: L.torque[1], slider: [0.1, 1000], log: true }));
        }
      }
      return items;
    }

    ui.showQuick = function showQuick(sel, x, y) {
      const saved = ui.fields;
      ui.fields = [];
      const items = quickItems(sel);
      quickFields = ui.fields;
      ui.fields = saved;
      if (!items.length) {
        ui.closeQuick();
        app.toast('Glue has no settings. Select it to see the force on the joint.');
        return;
      }
      const obj = sel.type === 'body' ? S.bodyById(app.scene, sel.id) : S.linkById(app.scene, sel.id);
      quick.innerHTML = `<p class="quick-title">${esc(obj.name)}</p>`;
      quick.setAttribute('aria-label', `${obj.name} settings`);
      items.forEach((el) => quick.appendChild(el));
      quick.querySelectorAll('.field-help').forEach((el) => el.remove());
      quick.style.maxHeight = '';
      quick.hidden = false;
      quickAt = { x, y };
      // Beside the object, never over it: right, left, below or above, nearest first.
      const rect = quick.getBoundingClientRect();
      const c2 = app.canvas.getBoundingClientRect();
      const box = app.editor.selectionBox(sel) || { minX: x - c2.left, maxX: x - c2.left, minY: y - c2.top, maxY: y - c2.top };
      const gap = 10;
      const m = 8;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const left = c2.left + box.minX - gap;
      const right = c2.left + box.maxX + gap;
      const top = c2.top + box.minY - gap;
      const bottom = c2.top + box.maxY + gap;
      const px = S.clamp(x, m, vw - m - rect.width);
      const py = S.clamp(y - 20, m, vh - m - rect.height);
      const spots = [
        { x: right, y: py, w: vw - m - right, h: vh - m - py },
        { x: left - rect.width, y: py, w: left - m, h: vh - m - py },
        { x: px, y: bottom, w: vw - m - px, h: vh - m - bottom },
        { x: px, y: top - rect.height, w: vw - m - px, h: top - m }
      ];
      const fits = spots.filter((p) => p.w >= rect.width && p.h >= rect.height);
      const pick = (fits.length ? fits : spots.filter((p) => p.w >= rect.width && p.h > 60).sort((a, b) => b.h - a.h))[0];
      if (!pick) { ui.closeQuick(); app.toast('Zoom out to make room for the settings.'); return; }
      quick.style.left = Math.max(m, pick.x) + 'px';
      quick.style.top = Math.max(m, pick.y) + 'px';
      quick.style.maxHeight = Math.min(rect.height, Math.max(60, pick.h)) + 'px';
      const first = quick.querySelector('input[type="text"]:not(:disabled)');
      if (first) first.focus({ preventScroll: true });
    };

    quick.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Escape') { e.preventDefault(); ui.closeQuick(true); }
    });
    document.addEventListener('pointerdown', (e) => { if (!quick.contains(e.target)) ui.closeQuick(); }, true);
    document.addEventListener('wheel', (e) => { if (!quick.contains(e.target)) ui.closeQuick(); }, { capture: true, passive: true });
    window.addEventListener('resize', () => ui.closeQuick());

    ui.refreshFields = function refreshFields() {
      ui.fields.forEach((f) => f());
      quickFields.forEach((f) => f());
    };

    ui.updateReadings = function updateReadings() {
      const r = ui.readings;
      const body = $('inspector-body');
      const set = (key, text) => { const el = body.querySelector(`[data-r="${key}"]`); if (el && el.textContent !== text) el.textContent = text; };
      const t = app.sim ? app.sim.t : 0;
      body.querySelectorAll('.readings-title').forEach((el) => { el.textContent = `Now · t = ${t.toFixed(2)} s`; });
      if (!r || !app.sim) return;
      if (r.type === 'body') {
        const d = app.sim.readBody(r.id);
        if (!d) return;
        set('x', fmt(d.x) + ' m'); set('y', fmt(d.y) + ' m');
        set('vx', fmt(d.vx) + ' m/s'); set('vy', fmt(d.vy) + ' m/s');
        set('speed', fmt(d.speed) + ' m/s'); set('omega', fmt(d.omega) + ' rad/s');
        set('KE', fmt(d.KE) + ' J'); set('GPE', fmt(d.GPE) + ' J');
        set('p', fmt(Math.hypot(d.px, d.py)) + ' kg m/s');
      } else if (r.type === 'link') {
        const d = app.sim.readLink(r.id);
        if (!d) return;
        set('length', fmt(d.length) + ' m');
        if (r.kind === 'spring') { set('extension', fmt(d.extension) + ' m'); set('tension', fmt(d.tension) + ' N'); set('EPE', fmt(d.EPE) + ' J'); }
        else { set('force', fmt(d.force) + ' N'); }
        if (r.kind === 'pulley') { set('sideA', fmt(d.sideA) + ' m'); set('sideB', fmt(d.sideB) + ' m'); set('slack', fmt(d.slack) + ' m'); }
        if (d.torque !== undefined) set('torque', fmt(d.torque) + ' N m');
        if (d.rate !== undefined) set('rate', fmt(d.rate) + ' rad/s');
      } else {
        const d = app.sim.totals();
        set('KE', fmt(d.KE) + ' J'); set('GPE', fmt(d.GPE) + ' J'); set('EPE', fmt(d.EPE) + ' J'); set('E', fmt(d.E) + ' J');
      }
    };

    // ---------- Graph controls ----------

    ui.renderGraphControls = function renderGraphControls() {
      const sel = $('graph-track');
      const opts = [{ v: 'system', label: 'Whole system' }];
      app.scene.bodies.forEach((b) => { if (!b.fixed) opts.push({ v: 'body:' + b.id, label: b.name }); });
      app.scene.links.forEach((l) => { if (l.kind === 'spring') opts.push({ v: 'link:' + l.id, label: l.name }); });
      const cur = app.track.type === 'system' ? 'system' : `${app.track.type}:${app.track.id}`;
      sel.innerHTML = opts.map((o) => `<option value="${esc(o.v)}">${esc(o.label)}</option>`).join('');
      sel.value = opts.some((o) => o.v === cur) ? cur : 'system';
      const groups = G.groupsFor(app.scene, app.track);
      $('graph-groups').innerHTML = Object.keys(groups).map((g) => `<button type="button" data-group="${g}" aria-pressed="${g === app.graphGroup}">${G.GROUP_LABELS[g]}</button>`).join('');
      $('graph-groups').querySelectorAll('[data-group]').forEach((b) => b.addEventListener('click', () => app.setGraphGroup(b.dataset.group)));
      renderLegend();
    };
    $('graph-track').addEventListener('change', (e) => {
      const v = e.target.value;
      if (v === 'system') app.trackObject({ type: 'system' });
      else { const [type, id] = v.split(':'); app.trackObject({ type, id }); }
    });
    $('graph-full').addEventListener('click', () => app.graph.fullGraph());
    $('graph-export-csv').addEventListener('click', () => app.exportCsv());
    $('graph-export-plot').addEventListener('click', () => app.exportPlot());

    function renderLegend() {
      const series = app.graph.series();
      const pal = app.graph.palette();
      $('graph-legend').innerHTML = '<span class="legend-time" data-legend-t></span>' + series.map((s) => `<button type="button" class="legend-item" data-q="${s.q}" aria-pressed="${!app.graph.hidden.has(s.q)}" title="Show or hide ${esc(s.label)}"><span class="legend-swatch${s.q === 'E' ? ' is-dashed' : ''}" style="--c:${pal[s.q]}"></span><span class="legend-label">${mathText(s.tex, s.label)}</span><span class="legend-value" data-legend="${s.q}"></span></button>`).join('');
      $('graph-legend').querySelectorAll('[data-q]').forEach((b) => b.addEventListener('click', () => {
        const q = b.dataset.q;
        if (app.graph.hidden.has(q)) app.graph.hidden.delete(q); else app.graph.hidden.add(q);
        b.setAttribute('aria-pressed', String(!app.graph.hidden.has(q)));
        app.requestGraph();
      }));
      ui.updateLegend();
    }
    ui.renderLegend = renderLegend;

    ui.updateLegend = function updateLegend() {
      const { t, values } = app.graph.legendValues();
      const legend = $('graph-legend');
      const tEl = legend.querySelector('[data-legend-t]');
      if (tEl) tEl.textContent = t === null ? '' : `t = ${t.toFixed(2)} s`;
      app.graph.series().forEach((s) => {
        const el = legend.querySelector(`[data-legend="${s.q}"]`);
        if (el) el.textContent = values[s.q] === null || values[s.q] === undefined ? '' : `${fmt(values[s.q])} ${s.unit}`;
      });
      const has = G.sampleIndices(app).length > 1 && app.graph.series().length > 0;
      $('graph-export-csv').disabled = !has;
      $('graph-export-plot').disabled = !has;
    };

    // Typeset labels once MathJax arrives.
    if (root.PanPhyMath && root.PanPhyMath.onMathReady) {
      root.PanPhyMath.onMathReady(() => { buildExamples(); ui.renderInspector(); renderLegend(); });
    }

    ui.icon = icon;
    ui.fmt = fmt;
    return ui;
  }

  PPM.ui = { createUI };
})(typeof window !== 'undefined' ? window : globalThis);
