// PanPhyMech panels: library, inspector, examples, status.
(function (root) {
  const PPM = root.PPM = root.PPM || {};

  function createUI(app) {
    const $ = (id) => document.getElementById(id);
    const registry = PPM.registry;

    function toast(msg) {
      const el = $('toast');
      el.textContent = msg;
      el.hidden = false;
      clearTimeout(toast._t);
      toast._t = setTimeout(() => { el.hidden = true; }, 2400);
    }

    function renderLibrary() {
      const host = $('lib-list');
      host.innerHTML = '';
      let group = '';
      for (const id of registry.order) {
        const def = registry.get(id);
        if (def.group !== group) {
          group = def.group;
          const h = document.createElement('h3');
          h.className = 'lib-group';
          h.textContent = group;
          host.appendChild(h);
        }
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'lib-card';
        btn.dataset.type = id;
        btn.innerHTML = `<strong>${def.name}</strong><span>${def.blurb}</span>`;
        btn.addEventListener('click', () => {
          app.placing = app.placing === id ? null : id;
          host.querySelectorAll('.lib-card').forEach((b) => b.classList.toggle('is-armed', b.dataset.type === app.placing));
          updateHint();
        });
        host.appendChild(btn);
      }
    }

    function field(label, inputHtml) {
      return `<label class="field"><span>${label}</span>${inputHtml}</label>`;
    }

    function renderInspector() {
      const body = $('inspector-body');
      const sel = app.selection;
      if (!sel) {
        body.innerHTML = `
          <section class="icard">
            <h3 class="icard-label">World</h3>
            <p class="muted">Select a body or fluid. Gravity is ${app.world.G.toFixed(2)} m/s² (down). Fluids apply buoyancy and Stokes drag <span class="mono">F = −6πηrv</span>.</p>
          </section>
          <section class="icard">
            <h3 class="icard-label">Simulation</h3>
            <div class="sim-row">
              <span class="status-dot" data-live></span>
              <strong data-sim-label>${app.paused ? 'Paused' : 'Live'}</strong>
              <button type="button" class="btn" data-act="toggle-run">${app.paused ? 'Resume' : 'Pause'}</button>
            </div>
          </section>`;
        return;
      }
      if (sel.type === 'fluid') {
        const f = sel.fluid;
        body.innerHTML = `
          <section class="icard">
            <h3 class="icard-label">Fluid · ${f.label}</h3>
            ${field('Density ρ (kg/m³)', `<input type="number" data-prop="rho" min="1" step="10" value="${f.rho}">`)}
            ${field('Viscosity η (Pa·s)', `<input type="number" data-prop="eta" min="0" step="0.1" value="${f.eta}">`)}
            <p class="muted">Stokes drag uses <span class="mono">F = −6πηrv</span> with the body radius (circles) or an equal-area radius (boxes).</p>
            <button type="button" class="btn danger" data-act="delete">Delete fluid</button>
          </section>`;
        return;
      }
      const m = sel.meta;
      const p = m.props;
      const live = m.lastFluid;
      body.innerHTML = `
        <section class="icard">
          <h3 class="icard-label">${m.kind} · ${m.label}</h3>
          ${m.kind === 'circle' || m.kind === 'box' ? field('Density (kg/m³)', `<input type="number" data-prop="density" min="50" step="50" value="${p.density}">`) : ''}
          ${field('Friction', `<input type="number" data-prop="friction" min="0" max="1" step="0.05" value="${p.friction ?? 0.2}">`)}
          ${m.kind === 'circle' || m.kind === 'box' ? field('Bounce', `<input type="number" data-prop="restitution" min="0" max="1" step="0.05" value="${p.restitution ?? 0.1}">`) : ''}
          ${m.kind === 'circle' || m.kind === 'box' ? `<label class="toggle"><span>Fixed</span><input type="checkbox" data-prop="fixed" ${p.fixed ? 'checked' : ''}></label>` : ''}
          ${live && live.submergedArea > 0 ? `<p class="muted mono">Submerged ${(live.submergedArea).toFixed(3)} m² · Stokes r=${(live.radius || 0).toFixed(3)} m</p>` : ''}
          <button type="button" class="btn danger" data-act="delete">Delete</button>
        </section>`;
    }

    function renderExamples() {
      const host = $('examples-list');
      host.innerHTML = '';
      PPM.examples.list.forEach((ex, i) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'example-card';
        b.innerHTML = `<strong>${ex.title}</strong><span>${ex.tip}</span>`;
        b.addEventListener('click', () => {
          app.loadExample(i);
          $('dlg-examples').close();
        });
        host.appendChild(b);
      });
    }

    function updateHint() {
      const hint = $('hint');
      if (app.placing) hint.textContent = `Click in the world to place a ${registry.get(app.placing).name.toLowerCase()}. Esc cancels.`;
      else if (app.selection) hint.textContent = 'Drag bodies to move them. Edit properties in the inspector.';
      else hint.textContent = 'Drag a part from the library, or open Examples.';
    }

    function updateStatus() {
      document.querySelectorAll('[data-sim-label]').forEach((el) => { el.textContent = app.paused ? 'Paused' : 'Live'; });
      document.querySelectorAll('[data-act="toggle-run"]').forEach((el) => { el.textContent = app.paused ? 'Resume' : 'Pause'; });
      const chip = $('sim-chip');
      chip.dataset.state = app.paused ? 'paused' : 'live';
      chip.querySelector('[data-chip-label]').textContent = app.paused ? 'Paused' : 'Live';
      chip.querySelector('[data-chip-run]').textContent = app.paused ? 'Resume' : 'Pause';
      updateHint();
    }

    $('inspector-body').addEventListener('change', (e) => {
      const t = e.target;
      if (!t.dataset.prop || !app.selection) return;
      let v = t.type === 'checkbox' ? t.checked : Number(t.value);
      app.world.updateProps(app.selection, { [t.dataset.prop]: v });
      if (app.selection.type === 'body') app.selection.meta = app.world.meta.get(app.selection.body.id);
    });
    $('inspector-body').addEventListener('click', (e) => {
      const btn = e.target.closest('[data-act]');
      if (!btn) return;
      if (btn.dataset.act === 'delete') app.deleteSelection();
      if (btn.dataset.act === 'toggle-run') app.toggleRun();
    });

    renderLibrary();
    renderExamples();

    return { toast, renderInspector, updateStatus, updateHint, renderLibrary, renderExamples };
  }

  PPM.ui = { createUI };
})(typeof globalThis === 'object' ? globalThis : this);
