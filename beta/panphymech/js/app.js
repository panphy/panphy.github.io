import { createScene } from './scene.js';
import { createPhysics } from './physics.js';
import { createUI } from './ui.js';
import { list as examples } from './examples.js';

const app = {
  tool: 'select',
  placing: null,
  selection: null,
  paused: false,
  springFrom: null,
  longPress: null
};

function init() {
  const canvas = document.getElementById('world-canvas');
  app.view = createScene(canvas);
  app.view.resize();
  app.world = createPhysics(app.view);
  app.ui = createUI(app);
  window.__ppm = app;

  wire(canvas);
  app.loadExample(0);
  app.ui.updateStatus();
  app.ui.renderInspector();

  let last = performance.now();
  function frame(now) {
    const dt = now - last;
    last = now;
    app.world.step(dt);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

app.setTool = function (id) {
  app.tool = id;
  app.springFrom = null;
  if (id === 'select') app.placing = null;
  else if (id === 'sphere' || id === 'block' || id === 'plank') app.placing = id;
  else app.placing = null;
  app.ui.syncTray();
  app.ui.updateHint();
};

app.setSelection = function (sel) {
  app.selection = sel;
  app.world.setSelection(sel);
  app.ui.renderInspector();
  app.ui.updateHint();
};

app.toggleRun = function () {
  app.paused = !app.paused;
  app.world.setRunning(!app.paused);
  app.ui.updateStatus();
};

app.deleteSelection = function () {
  if (!app.selection) return;
  app.world.removeSelection(app.selection);
  app.setSelection(null);
  app.ui.toast('Deleted');
};

app.loadExample = function (index) {
  const ex = examples[index];
  if (!ex) return;
  app.setTool('select');
  app.setSelection(null);
  ex.build(app.world);
  app.paused = false;
  app.world.setRunning(true);
  app.ui.updateStatus();
  app.ui.toast(`${ex.title} — ${ex.tip}`);
  document.getElementById('coach').classList.remove('is-gone');
  app.ui.hideCoachSoon();
};

function clientWorld(e) {
  return app.view.clientToWorld(e.clientX, e.clientY);
}

function placeBody(mx, my) {
  const type = app.placing;
  if (!type) return false;
  if (type === 'sphere') app.world.addSphere(mx, my);
  else if (type === 'block') app.world.addBlock(mx, my);
  else if (type === 'plank') app.world.addPlank(mx, my);
  app.ui.toast(`Placed ${type}`);
  return true;
}

function wire(canvas) {
  const $ = (id) => document.getElementById(id);
  let pointerId = null;

  canvas.addEventListener('pointerdown', (e) => {
    if (e.button === 2) return;
    const worldPt = clientWorld(e);
    if (!worldPt) return;

    // Place tools
    if (app.placing) {
      placeBody(worldPt.x, worldPt.y);
      if (!e.shiftKey) app.setTool('select');
      e.preventDefault();
      return;
    }

    const hit = app.world.hitTest(worldPt.x, worldPt.y);

    if (app.tool === 'pin') {
      if (hit) {
        app.world.addPinAt(hit.body, worldPt.x, worldPt.y);
        app.ui.toast('Pinned');
        app.setTool('select');
      } else {
        app.ui.toast('Click a body to pin it');
      }
      e.preventDefault();
      return;
    }

    if (app.tool === 'spring') {
      if (!hit) {
        app.ui.toast('Click a body');
        e.preventDefault();
        return;
      }
      if (!app.springFrom) {
        app.springFrom = hit.body;
        app.setSelection(hit);
        app.ui.updateHint();
        app.ui.toast('Now click the second body');
      } else {
        const link = app.world.addSpring(app.springFrom, hit.body);
        app.springFrom = null;
        if (link) {
          app.ui.toast('Spring connected');
          app.setSelection({
            type: 'link',
            kind: 'spring',
            linkId: link.constraint.id,
            stiffness: link.stiffness,
            damping: link.damping
          });
        }
        app.setTool('select');
      }
      e.preventDefault();
      return;
    }

    // Hand tool: select + grab
    if (hit) {
      app.setSelection(hit);
      if (!hit.body.isStatic && app.world.beginGrab(hit.body, worldPt.x, worldPt.y)) {
        pointerId = e.pointerId;
        canvas.setPointerCapture(pointerId);
        canvas.classList.add('is-holding');
        document.getElementById('coach').classList.add('is-gone');
      }
    } else {
      app.setSelection(null);
    }

    // Long-press opens inspector on touch
    clearTimeout(app.longPress);
    app.longPress = setTimeout(() => {
      if (hit) app.ui.showInspector(true);
    }, 520);

    e.preventDefault();
  });

  canvas.addEventListener('pointermove', (e) => {
    if (pointerId !== e.pointerId) return;
    clearTimeout(app.longPress);
    const worldPt = clientWorld(e);
    if (!worldPt) return;
    app.world.moveGrab(worldPt.x, worldPt.y);
  });

  function endPointer(e) {
    if (pointerId !== null && e.pointerId !== pointerId) return;
    clearTimeout(app.longPress);
    if (pointerId !== null) {
      try { canvas.releasePointerCapture(pointerId); } catch (_) { /* ignore */ }
      pointerId = null;
      canvas.classList.remove('is-holding');
      app.world.endGrab();
    }
  }

  canvas.addEventListener('pointerup', endPointer);
  canvas.addEventListener('pointercancel', endPointer);

  canvas.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    const worldPt = clientWorld(e);
    if (!worldPt) return;
    const hit = app.world.hitTest(worldPt.x, worldPt.y);
    if (hit) {
      app.setSelection(hit);
      app.ui.showInspector(true);
    }
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      app.setTool('select');
      app.springFrom = null;
    }
    if (e.key === ' ' && !e.target.matches('input, textarea, button')) {
      e.preventDefault();
      app.toggleRun();
    }
    if ((e.key === 'Delete' || e.key === 'Backspace') && !e.target.matches('input, textarea')) {
      e.preventDefault();
      app.deleteSelection();
    }
    if (e.key === 'v' || e.key === 'V') app.setTool('select');
    if (e.key === '1') app.setTool('sphere');
    if (e.key === '2') app.setTool('block');
    if (e.key === '3') app.setTool('plank');
    if (e.key === 'p' || e.key === 'P') app.setTool('pin');
    if (e.key === 's' || e.key === 'S') app.setTool('spring');
  });

  $('btn-examples').addEventListener('click', () => $('dlg-examples').showModal());
  $('btn-help').addEventListener('click', () => $('dlg-help').showModal());
  $('btn-clear').addEventListener('click', () => {
    app.world.clearScene();
    app.setSelection(null);
    app.ui.toast('Cleared');
  });
  $('sim-chip').addEventListener('click', (e) => {
    if (e.target.closest('[data-chip-run]')) app.toggleRun();
  });
  window.addEventListener('resize', () => {
    app.world.resize();
  });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();
