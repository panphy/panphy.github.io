// PanPhyMech beta entry: Circuits-like shell over a Matter.js sandbox.
(function () {
  const app = {
    placing: null,
    selection: null,
    paused: false,
    tool: 'select'
  };

  function init() {
    const canvas = document.getElementById('world-canvas');
    app.world = PPM.world.createWorld(canvas);
    app.ui = PPM.ui.createUI(app);
    window.__ppm = app;
    wire();
    app.world.start();
    app.loadExample(0);
    app.ui.renderInspector();
    app.ui.updateStatus();
    requestAnimationFrame(tick);
  }

  function tick() {
    if (app.selection && app.selection.type === 'body') {
      const m = app.world.meta.get(app.selection.body.id);
      if (m) app.selection.meta = m;
    }
    // Refresh inspector fluid readouts lightly.
    if (!app._inspAt || performance.now() - app._inspAt > 200) {
      app._inspAt = performance.now();
      if (app.selection && app.selection.type === 'body' && document.activeElement?.tagName !== 'INPUT') {
        app.ui.renderInspector();
      }
    }
    requestAnimationFrame(tick);
  }

  function setSelection(sel) {
    app.selection = sel;
    app.ui.renderInspector();
    app.ui.updateHint();
  }

  app.toggleRun = function () {
    app.paused = !app.paused;
    app.world.setRunning(!app.paused);
    app.ui.updateStatus();
    app.ui.renderInspector();
  };

  app.deleteSelection = function () {
    if (!app.selection) return;
    app.world.removeSelection(app.selection);
    setSelection(null);
    app.ui.toast('Deleted');
  };

  app.loadExample = function (index) {
    const ex = PPM.examples.list[index];
    if (!ex) return;
    app.placing = null;
    setSelection(null);
    ex.build(app.world);
    app.paused = false;
    app.world.setRunning(true);
    app.ui.updateStatus();
    app.ui.toast(ex.title + ' — ' + ex.tip);
  };

  function placeAt(clientX, clientY) {
    if (!app.placing) return false;
    const p = app.world.clientToWorld(clientX, clientY);
    const type = app.placing;
    if (type === 'circle') app.world.addCircle(p.x, p.y);
    else if (type === 'box') app.world.addBox(p.x, p.y);
    else if (type === 'ramp') app.world.addRamp(p.x, p.y);
    else if (type === 'wall') app.world.addWall(p.x, p.y);
    else if (type === 'fluid') app.world.addFluid(p.x, p.y);
    app.ui.toast('Placed ' + PPM.registry.get(type).name);
    return true;
  }

  function wire() {
    const canvas = document.getElementById('world-canvas');
    const $ = (id) => document.getElementById(id);

    canvas.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      if (app.placing) {
        placeAt(e.clientX, e.clientY);
        if (!e.shiftKey) {
          app.placing = null;
          document.querySelectorAll('.lib-card.is-armed').forEach((b) => b.classList.remove('is-armed'));
          app.ui.updateHint();
        }
        e.preventDefault();
        return;
      }
      const hit = app.world.hitTest(e.clientX, e.clientY);
      if (hit) setSelection(hit);
      else setSelection(null);
    });

    canvas.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      const hit = app.world.hitTest(e.clientX, e.clientY);
      if (hit) setSelection(hit);
    });

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        app.placing = null;
        document.querySelectorAll('.lib-card.is-armed').forEach((b) => b.classList.remove('is-armed'));
        app.ui.updateHint();
      }
      if (e.key === ' ' && !e.target.matches('input, textarea, button')) {
        e.preventDefault();
        app.toggleRun();
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && !e.target.matches('input, textarea')) {
        e.preventDefault();
        app.deleteSelection();
      }
    });

    $('btn-examples').addEventListener('click', () => $('dlg-examples').showModal());
    $('btn-help').addEventListener('click', () => $('dlg-help').showModal());
    $('btn-clear').addEventListener('click', () => {
      app.world.clearScene();
      setSelection(null);
      app.ui.toast('Cleared');
    });
    $('sim-chip').addEventListener('click', (e) => {
      if (e.target.closest('[data-chip-run]')) app.toggleRun();
    });
    window.addEventListener('resize', () => app.world.resize());
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
