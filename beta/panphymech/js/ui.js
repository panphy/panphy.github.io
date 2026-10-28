import { order, get as getPart } from './registry.js';
import { list as examples } from './examples.js';

const GLYPHS = {
  select: `<svg class="glyph" viewBox="0 0 28 28" aria-hidden="true"><path fill="currentColor" d="M8 4v18l5.2-5.1 3.3 7.2 2.4-1.1-3.3-7.1H22L8 4z"/></svg>`,
  sphere: `<svg class="glyph" viewBox="0 0 28 28" aria-hidden="true"><circle cx="14" cy="14" r="9" fill="currentColor" opacity="0.9"/></svg>`,
  block: `<svg class="glyph" viewBox="0 0 28 28" aria-hidden="true"><rect x="6" y="8" width="16" height="12" rx="2" fill="currentColor"/></svg>`,
  plank: `<svg class="glyph" viewBox="0 0 28 28" aria-hidden="true"><rect x="3" y="12" width="22" height="5" rx="1.5" fill="currentColor"/></svg>`,
  pin: `<svg class="glyph" viewBox="0 0 28 28" aria-hidden="true"><circle cx="14" cy="10" r="4" fill="currentColor"/><path d="M14 14v9" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>`,
  spring: `<svg class="glyph" viewBox="0 0 28 28" aria-hidden="true"><path d="M4 14c2-6 4 6 6 0s4 6 6 0 4 6 6 0 4 6 6 0" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>`
};

export function createUI(app) {
  const $ = (id) => document.getElementById(id);

  function toast(msg) {
    const el = $('toast');
    el.textContent = msg;
    el.hidden = false;
    clearTimeout(toast._t);
    toast._t = setTimeout(() => { el.hidden = true; }, 2200);
  }

  function renderTray() {
    const host = $('tray-tools');
    host.innerHTML = '';
    for (const id of order) {
      const def = getPart(id);
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'tray-card';
      btn.dataset.tool = id;
      btn.title = def.blurb;
      btn.innerHTML = `${GLYPHS[id] || ''}<span>${def.name}</span>`;
      btn.addEventListener('click', () => app.setTool(id));
      host.appendChild(btn);
    }
    syncTray();
  }

  function syncTray() {
    document.querySelectorAll('.tray-card').forEach((b) => {
      b.classList.toggle('is-armed', b.dataset.tool === app.tool);
    });
    const canvas = $('world-canvas');
    canvas.classList.toggle('is-place', ['sphere', 'block', 'plank', 'pin', 'spring'].includes(app.tool));
  }

  function field(label, inputHtml) {
    return `<label class="field"><span>${label}</span>${inputHtml}</label>`;
  }

  function showInspector(on) {
    $('inspector').hidden = !on;
  }

  function renderInspector() {
    const body = $('inspector-body');
    const sel = app.selection;
    if (!sel) {
      body.innerHTML = `
        <section class="icard">
          <h3 class="icard-label">Tabletop</h3>
          <p class="muted">Hold a body to pick it up. Arm Sphere, Block, or Plank in the tray, then click to place. Pin locks a point; Spring connects two bodies.</p>
        </section>`;
      showInspector(false);
      return;
    }
    showInspector(true);
    if (sel.type === 'link' && sel.kind === 'spring') {
      body.innerHTML = `
        <section class="icard">
          <h3 class="icard-label">Spring</h3>
          <p class="muted">Stiffness ${sel.stiffness} · damping ${sel.damping}</p>
          <button type="button" class="btn danger" data-act="delete">Delete spring</button>
        </section>`;
      return;
    }
    if (sel.type === 'link' && sel.kind === 'pin') {
      body.innerHTML = `
        <section class="icard">
          <h3 class="icard-label">Pin</h3>
          <p class="muted">World hinge on the selected body.</p>
          <button type="button" class="btn danger" data-act="delete">Delete pin</button>
        </section>`;
      return;
    }
    const m = sel.meta;
    const p = m.props;
    body.innerHTML = `
      <section class="icard">
        <h3 class="icard-label">${m.kind} · ${m.label}</h3>
        ${field('Density (kg/m³)', `<input type="number" data-prop="density" min="50" step="50" value="${p.density}">`)}
        ${field('Friction', `<input type="number" data-prop="friction" min="0" max="1" step="0.05" value="${p.friction ?? 0.2}">`)}
        ${field('Bounce', `<input type="number" data-prop="restitution" min="0" max="1" step="0.05" value="${p.restitution ?? 0.1}">`)}
        <label class="toggle"><span>Fixed</span><input type="checkbox" data-prop="fixed" ${p.fixed ? 'checked' : ''}></label>
        <button type="button" class="btn danger" data-act="delete">Delete</button>
      </section>`;
  }

  function renderExamples() {
    const host = $('examples-list');
    host.innerHTML = '';
    examples.forEach((ex, i) => {
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
    const tool = app.tool;
    if (tool === 'sphere' || tool === 'block' || tool === 'plank') {
      hint.textContent = `Click the table to place a ${getPart(tool).name.toLowerCase()}. Esc returns to Hand.`;
    } else if (tool === 'pin') {
      hint.textContent = 'Click a body to pin that point to the world.';
    } else if (tool === 'spring') {
      hint.textContent = app.springFrom
        ? 'Now click the second body.'
        : 'Click the first body, then the second.';
    } else if (app.selection) {
      hint.textContent = 'Hold to pick up · edit properties in the inspector · Delete to remove.';
    } else {
      hint.textContent = 'Hold an object to pick it up. Release to drop. Open Examples for starters.';
    }
  }

  function updateStatus() {
    const chip = $('sim-chip');
    chip.dataset.state = app.paused ? 'paused' : 'live';
    chip.querySelector('[data-chip-label]').textContent = app.paused ? 'Paused' : 'Live';
    chip.querySelector('[data-chip-run]').textContent = app.paused ? 'Resume' : 'Pause';
    updateHint();
    syncTray();
  }

  function hideCoachSoon() {
    const coach = $('coach');
    clearTimeout(hideCoachSoon._t);
    hideCoachSoon._t = setTimeout(() => coach.classList.add('is-gone'), 9000);
  }

  $('inspector-body').addEventListener('change', (e) => {
    const t = e.target;
    if (!t.dataset.prop || !app.selection) return;
    const v = t.type === 'checkbox' ? t.checked : Number(t.value);
    app.world.updateProps(app.selection, { [t.dataset.prop]: v });
    if (app.selection.type === 'body') {
      app.selection.meta = app.world.meta.get(app.selection.body.id);
    }
  });
  $('inspector-body').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-act]');
    if (!btn) return;
    if (btn.dataset.act === 'delete') app.deleteSelection();
  });
  $('btn-close-inspector').addEventListener('click', () => {
    app.setSelection(null);
  });

  renderTray();
  renderExamples();
  hideCoachSoon();

  return {
    toast,
    renderInspector,
    updateStatus,
    updateHint,
    syncTray,
    showInspector,
    hideCoachSoon
  };
}
