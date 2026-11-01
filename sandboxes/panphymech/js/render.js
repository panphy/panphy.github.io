// PanPhyMech: canvas rendering. Flat shapes with thin outlines on a metric grid,
// connectors, trails, velocity arrows, selection handles and placement previews.
(function (root) {
  const PPM = root.PPM = root.PPM || {};
  const S = PPM.scene;

  // An arc with an arrowhead at its end, in screen coordinates (y down). sweep < 0 turns
  // counterclockwise on screen. The arc stops at the arrowhead's base so the two meet.
  function arcArrow(cx, cy, R, start, sweep, head = 6) {
    const sgn = sweep < 0 ? -1 : 1;
    const end = start + sweep;
    const p = (a) => ({ x: cx + R * Math.cos(a), y: cy + R * Math.sin(a) });
    const e = p(end);
    const d = { x: -Math.sin(end) * sgn, y: Math.cos(end) * sgn };
    const n = { x: Math.cos(end), y: Math.sin(end) };
    const base = { x: e.x - d.x * head * 0.45, y: e.y - d.y * head * 0.45 };
    return {
      start, end: end - sgn * ((head * 0.45) / R), anticlockwise: sgn < 0, from: p(start), to: p(end - sgn * ((head * 0.45) / R)),
      tip: { x: e.x + d.x * head * 0.55, y: e.y + d.y * head * 0.55 },
      left: { x: base.x + n.x * head * 0.5, y: base.y + n.y * head * 0.5 },
      right: { x: base.x - n.x * head * 0.5, y: base.y - n.y * head * 0.5 }
    };
  }

  const NICE = [0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50, 100, 200, 500];
  const niceStep = (scale, px) => NICE.find((s) => s * scale >= px) || NICE[NICE.length - 1];

  function createRenderer(app, canvas, context) {
    const ctx = context || canvas.getContext('2d');
    const r = { canvas, ctx, w: 0, h: 0, dpr: 1, colors: {} };

    r.readColors = function readColors() {
      const cs = getComputedStyle(document.documentElement);
      const v = (name) => cs.getPropertyValue(name).trim();
      r.dark = document.documentElement.getAttribute('data-theme') === 'dark';
      r.colors = {
        bg: v('--stage'), grid: v('--stage-grid'), gridMajor: v('--stage-grid-major'), axis: v('--stage-axis'),
        floor: v('--floor'), floorLine: v('--floor-line'), ink: v('--ink'), ink2: v('--ink-2'), ink3: v('--ink-3'),
        accent: v('--accent'), surface: v('--surface'), link: v('--link'), rope: v('--rope'), vector: v('--vector'),
        forceW: v('--force-w'), forceN: v('--force-n'), forceF: v('--force-f'), forceT: v('--force-t'), forceS: v('--force-s'), forceR: v('--force-r'), forceD: v('--force-d'),
        motor: v('--good'), danger: v('--danger')
      };
    };

    r.resize = function resize() {
      const rect = canvas.getBoundingClientRect();
      r.dpr = Math.min(window.devicePixelRatio || 1, 2.5);
      r.w = Math.max(1, rect.width);
      r.h = Math.max(1, rect.height);
      canvas.width = Math.round(r.w * r.dpr);
      canvas.height = Math.round(r.h * r.dpr);
    };

    const cam = () => app.scene.camera;
    r.toScreen = (p) => ({ x: r.w / 2 + (p.x - cam().cx) * cam().scale, y: r.h / 2 - (p.y - cam().cy) * cam().scale });
    r.toWorld = (x, y) => ({ x: cam().cx + (x - r.w / 2) / cam().scale, y: cam().cy - (y - r.h / 2) / cam().scale });

    function bodyPath(b, pose) {
      const s = cam().scale;
      const c = r.toScreen(pose);
      ctx.beginPath();
      if (b.kind === 'ball') {
        ctx.arc(c.x, c.y, b.r * s, 0, Math.PI * 2);
        return;
      }
      if (b.kind === 'custom') {
        // Every ring of every polygon; filled with the even–odd rule, holes stay open.
        b.paths.forEach((poly) => poly.forEach((ring) => {
          ring.forEach(([x, y], i) => {
            const q = r.toScreen(S.toWorld(pose, { x, y }));
            if (i === 0) ctx.moveTo(q.x, q.y); else ctx.lineTo(q.x, q.y);
          });
          ctx.closePath();
        }));
        return;
      }
      S.vertices(b).forEach((p, i) => {
        const q = r.toScreen(S.toWorld(pose, p));
        if (i === 0) ctx.moveTo(q.x, q.y); else ctx.lineTo(q.x, q.y);
      });
      ctx.closePath();
    }

    function drawGrid() {
      const s = cam().scale;
      const minor = niceStep(s, 22);
      const major = niceStep(s, 110);
      const tl = r.toWorld(0, 0);
      const br = r.toWorld(r.w, r.h);
      const lines = (step, color) => {
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let x = Math.ceil(tl.x / step) * step; x <= br.x; x += step) {
          const X = Math.round(r.toScreen({ x, y: 0 }).x) + 0.5;
          ctx.moveTo(X, 0); ctx.lineTo(X, r.h);
        }
        for (let y = Math.ceil(br.y / step) * step; y <= tl.y; y += step) {
          const Y = Math.round(r.toScreen({ x: 0, y }).y) + 0.5;
          ctx.moveTo(0, Y); ctx.lineTo(r.w, Y);
        }
        ctx.stroke();
      };
      if (app.display.grid) {
        lines(minor, r.colors.grid);
        lines(major, r.colors.gridMajor);
      }
      // Axes through the origin, with meter labels on the major lines.
      const o = r.toScreen({ x: 0, y: 0 });
      ctx.strokeStyle = r.colors.axis;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(Math.round(o.x) + 0.5, 0); ctx.lineTo(Math.round(o.x) + 0.5, r.h);
      if (!app.scene.world.floor) { ctx.moveTo(0, Math.round(o.y) + 0.5); ctx.lineTo(r.w, Math.round(o.y) + 0.5); }
      ctx.stroke();
      if (!app.display.grid) return;
      ctx.fillStyle = r.colors.ink3;
      ctx.font = '500 10.5px "IBM Plex Mono", ui-monospace, monospace';
      const fmt = (v) => (Math.abs(v) < 1e-9 ? '0' : String(Number(v.toPrecision(6))));
      const labelY = Math.min(Math.max(o.y + 14, 14), r.h - 6);
      ctx.textAlign = 'center';
      for (let x = Math.ceil(tl.x / major) * major; x <= br.x; x += major) {
        if (Math.abs(x) < 1e-9) continue;
        ctx.fillText(fmt(x), r.toScreen({ x, y: 0 }).x, labelY);
      }
      const labelX = Math.min(Math.max(o.x - 6, 30), r.w - 6);
      ctx.textAlign = 'right';
      for (let y = Math.ceil(br.y / major) * major; y <= tl.y; y += major) {
        if (Math.abs(y) < 1e-9) continue;
        ctx.fillText(fmt(y), labelX, r.toScreen({ x: 0, y }).y + 3.5);
      }
      ctx.textAlign = 'left';
      ctx.fillText('m', Math.min(Math.max(o.x + 5, 4), r.w - 14), Math.max(12, Math.min(r.toScreen({ x: 0, y: tl.y }).y + 12, r.h - 4)));
    }

    function drawFloor() {
      if (!app.scene.world.floor) return;
      const y = r.toScreen({ x: 0, y: 0 }).y;
      if (y > r.h) return;
      ctx.fillStyle = r.colors.floor;
      ctx.fillRect(0, y, r.w, r.h - y);
      // Hatching under the surface line, like a textbook ground.
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, y, r.w, Math.min(14, r.h - y));
      ctx.clip();
      ctx.strokeStyle = r.colors.floorLine;
      ctx.globalAlpha = 0.45;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = -20; x < r.w + 20; x += 10) { ctx.moveTo(x, y + 14); ctx.lineTo(x + 12, y); }
      ctx.stroke();
      ctx.restore();
      ctx.strokeStyle = r.colors.floorLine;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, y); ctx.lineTo(r.w, y);
      ctx.stroke();
    }

    // The height where gravitational energy is zero, when it is not the floor.
    function drawEnergyZero() {
      const y0 = app.scene.world.gpeZero || 0;
      if (Math.abs(y0) < 1e-9) return;
      const y = Math.round(r.toScreen({ x: 0, y: y0 }).y) + 0.5;
      if (y < 0 || y > r.h) return;
      ctx.strokeStyle = r.colors.ink3;
      ctx.lineWidth = 1;
      ctx.setLineDash([6, 5]);
      ctx.beginPath();
      ctx.moveTo(0, y); ctx.lineTo(r.w, y);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = r.colors.ink3;
      ctx.font = 'italic 600 11px Figtree, system-ui, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText('Ep = 0', r.w - 8, y - 5);
    }

    function hatch(b, pose, color) {
      ctx.save();
      bodyPath(b, pose);
      ctx.clip('evenodd');
      ctx.strokeStyle = color;
      ctx.globalAlpha = 0.35;
      ctx.lineWidth = 1.2;
      const c = r.toScreen(pose);
      const e = S.extent(b);
      const R = Math.hypot(e.x, e.y) * cam().scale + 4;
      ctx.beginPath();
      for (let d = -R * 2; d < R * 2; d += 7) { ctx.moveTo(c.x + d - R, c.y + R); ctx.lineTo(c.x + d + R, c.y - R); }
      ctx.stroke();
      ctx.restore();
    }

    function drawBody(b) {
      const pose = app.poseOf(b);
      const col = S.COLORS[b.color] || S.COLORS.blue;
      const s = cam().scale;
      bodyPath(b, pose);
      ctx.fillStyle = col.fill;
      ctx.fill('evenodd');
      if (b.fixed) hatch(b, pose, col.stroke);
      bodyPath(b, pose);
      ctx.lineJoin = 'round';
      ctx.lineWidth = 1.6;
      ctx.strokeStyle = col.stroke;
      ctx.stroke();
      const c = r.toScreen(pose);
      if (b.kind === 'ball' || b.kind === 'polygon') {
        // A spoke shows the rotation.
        const R = b.r * s;
        if (R > 5) {
          ctx.strokeStyle = col.stroke;
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.moveTo(c.x, c.y);
          ctx.lineTo(c.x + Math.cos(pose.angle) * R * 0.92, c.y - Math.sin(pose.angle) * R * 0.92);
          ctx.stroke();
        }
      }
      // Center of mass.
      if (!b.fixed && Math.min(S.extent(b).x, S.extent(b).y) * s > 7) {
        ctx.fillStyle = col.stroke;
        ctx.beginPath();
        ctx.arc(c.x, c.y, 2.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    function outline(b, color, width) {
      const pose = app.poseOf(b);
      bodyPath(b, pose);
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.lineJoin = 'round';
      ctx.stroke();
    }

    function anchorMount(p, color) {
      // A small hatched block: this end is fixed to the background.
      const q = r.toScreen(p);
      ctx.fillStyle = r.colors.surface;
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.rect(q.x - 6, q.y - 6, 12, 12);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(q.x - 6, q.y + 2); ctx.lineTo(q.x + 2, q.y - 6);
      ctx.moveTo(q.x - 2, q.y + 6); ctx.lineTo(q.x + 6, q.y - 2);
      ctx.stroke();
    }

    function linkEnds(l) {
      const pa = S.endPoint(app.scene, l.a, l.la, app.poseOf);
      const pb = S.endPoint(app.scene, l.b, l.lb, app.poseOf);
      return [pa, pb];
    }

    function drawSpring(pa, pb, color, width = 1.6, dashed = false) {
      const A = r.toScreen(pa);
      const B = r.toScreen(pb);
      const dx = B.x - A.x;
      const dy = B.y - A.y;
      const L = Math.hypot(dx, dy);
      if (L < 1) return;
      const ux = dx / L; const uy = dy / L;
      const nx = -uy; const ny = ux;
      const amp = Math.max(5, Math.min(10, 0.09 * cam().scale));
      const lead = Math.min(10, L * 0.12);
      const coils = 9;
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.lineJoin = 'round';
      ctx.setLineDash(dashed ? [5, 4] : []);
      ctx.beginPath();
      ctx.moveTo(A.x, A.y);
      ctx.lineTo(A.x + ux * lead, A.y + uy * lead);
      const body = L - 2 * lead;
      for (let i = 0; i < coils * 2; i++) {
        const t = (i + 0.5) / (coils * 2);
        const side = i % 2 ? -1 : 1;
        ctx.lineTo(A.x + ux * (lead + body * t) + nx * amp * side, A.y + uy * (lead + body * t) + ny * amp * side);
      }
      ctx.lineTo(B.x - ux * lead, B.y - uy * lead);
      ctx.lineTo(B.x, B.y);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    function drawRod(pa, pb, color, dashed = false) {
      const A = r.toScreen(pa);
      const B = r.toScreen(pb);
      ctx.strokeStyle = color;
      ctx.lineCap = 'round';
      ctx.lineWidth = 4.5;
      ctx.setLineDash(dashed ? [6, 5] : []);
      ctx.beginPath();
      ctx.moveTo(A.x, A.y); ctx.lineTo(B.x, B.y);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.lineCap = 'butt';
      [A, B].forEach((p) => { ctx.fillStyle = r.colors.surface; ctx.beginPath(); ctx.arc(p.x, p.y, 2.6, 0, Math.PI * 2); ctx.fill(); });
    }

    function drawRope(pa, pb, length, color, dashed = false) {
      const A = r.toScreen(pa);
      const B = r.toScreen(pb);
      const d = Math.hypot(pb.x - pa.x, pb.y - pa.y);
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.setLineDash(dashed ? [5, 4] : []);
      ctx.beginPath();
      ctx.moveTo(A.x, A.y);
      if (length > d * 1.003 && d > 1e-6) {
        // Slack: a parabola with the rope's length, sagging under gravity.
        const sag = Math.sqrt((3 * d * (length - d)) / 8) * cam().scale;
        ctx.quadraticCurveTo((A.x + B.x) / 2, (A.y + B.y) / 2 + 2 * sag, B.x, B.y);
      } else {
        ctx.lineTo(B.x, B.y);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // A pulley: the wheel, and the rope from end a onto the wheel, round it and off to end b,
    // along the same path the simulation uses. A slack rope sags on both sides, sharing the
    // slack in proportion to their lengths; a vertical side bows outward, away from the wheel.
    function pulleyPath(l) {
      return app.sim && !app.simStale ? app.sim.pulleyPath(l.id) : S.pulleyPath(app.scene, l, app.poseOf);
    }
    function drawWheel(c, radius, color, dashed = false) {
      const q = r.toScreen(c);
      const R = Math.max(4, radius * cam().scale);
      ctx.setLineDash(dashed ? [4, 3] : []);
      ctx.fillStyle = r.colors.surface;
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(q.x, q.y, R, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
      // The groove the rope runs in.
      if (R > 9) {
        ctx.lineWidth = 1;
        ctx.globalAlpha *= 0.45;
        ctx.beginPath();
        ctx.arc(q.x, q.y, R - 3.5, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha /= 0.45;
      }
      ctx.setLineDash([]);
      // A mount below the axle, as on a hinge pinned to the background: the wheel is fixed.
      if (R > 9) {
        ctx.fillStyle = r.colors.ink3;
        ctx.globalAlpha *= 0.5;
        ctx.beginPath();
        ctx.moveTo(q.x, q.y); ctx.lineTo(q.x - 6, q.y + Math.min(11, R - 2)); ctx.lineTo(q.x + 6, q.y + Math.min(11, R - 2)); ctx.closePath();
        ctx.fill();
        ctx.globalAlpha /= 0.5;
      }
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(q.x, q.y, Math.min(3, R * 0.35), 0, Math.PI * 2);
      ctx.fill();
    }
    // A straight part of the rope from p to q (world), sagging when it has extra length.
    function ropePart(p, q, extra, c) {
      const A = r.toScreen(p);
      const B = r.toScreen(q);
      const d = Math.hypot(q.x - p.x, q.y - p.y);
      if (!(extra > 0.002 * d) || d < 1e-6) { ctx.lineTo(B.x, B.y); return; }
      const sag = Math.min(d / 2, Math.sqrt((3 * d * extra) / 8)) * cam().scale;
      let nx = -(B.y - A.y) / (d * cam().scale), ny = (B.x - A.x) / (d * cam().scale);
      if (Math.abs(ny) > 0.2) { if (ny < 0) { nx = -nx; ny = -ny; } } else {
        const W = r.toScreen(c);
        if (nx * ((A.x + B.x) / 2 - W.x) < 0) { nx = -nx; ny = -ny; }
      }
      ctx.quadraticCurveTo((A.x + B.x) / 2 + nx * 2 * sag, (A.y + B.y) / 2 + ny * 2 * sag, B.x, B.y);
    }
    function drawPulleyRope(path, length, color, dashed = false) {
      const slack = Math.max(0, length - path.total);
      const straight = path.segA + path.segB;
      const share = (seg) => (straight > 1e-9 ? (slack * seg) / straight : 0);
      const A = r.toScreen(path.pa);
      const q = r.toScreen(path.c);
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.lineJoin = 'round';
      ctx.setLineDash(dashed ? [5, 4] : []);
      ctx.beginPath();
      ctx.moveTo(A.x, A.y);
      ropePart(path.pa, path.ta, share(path.segA), path.c);
      // Screen angles run the other way from world angles (y is down).
      // A rope that has come off the wheel runs straight from end to end.
      if (!path.offWheel) {
        const R = Math.max(4, (Math.hypot(path.ta.x - path.c.x, path.ta.y - path.c.y)) * cam().scale);
        ctx.arc(q.x, q.y, R, -path.angleA, -path.angleA + path.wind * path.wrap, path.wind < 0);
      }
      ropePart(path.tb, path.pb, share(path.segB), path.c);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    function drawPulley(l, sel, hov) {
      const path = pulleyPath(l);
      if (!path) return;
      const color = sel ? r.colors.accent : hov ? r.colors.ink : r.colors.ink2;
      drawPulleyRope(path, l.length, sel ? r.colors.accent : r.colors.rope);
      drawWheel(path.c, l.r, color);
      if (!l.a) anchorMount(path.pa, color);
      if (!l.b) anchorMount(path.pb, color);
    }

    function drawHinge(l, p, selected) {
      const q = r.toScreen(p);
      const ink = selected ? r.colors.accent : r.colors.ink2;
      if (l.kind === 'weld') {
        // Glue: a solid diamond, so it never looks like a delete cross.
        ctx.fillStyle = ink;
        ctx.strokeStyle = r.colors.surface;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(q.x, q.y - 7); ctx.lineTo(q.x + 7, q.y); ctx.lineTo(q.x, q.y + 7); ctx.lineTo(q.x - 7, q.y); ctx.closePath();
        ctx.fill(); ctx.stroke();
        ctx.fillStyle = r.colors.surface;
        ctx.beginPath();
        ctx.arc(q.x, q.y, 1.8, 0, Math.PI * 2);
        ctx.fill();
        if (!l.b) {
          ctx.strokeStyle = ink;
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(q.x - 8, q.y + 11); ctx.lineTo(q.x + 8, q.y + 11);
          ctx.moveTo(q.x - 6, q.y + 11); ctx.lineTo(q.x - 9, q.y + 14);
          ctx.moveTo(q.x, q.y + 11); ctx.lineTo(q.x - 3, q.y + 14);
          ctx.moveTo(q.x + 6, q.y + 11); ctx.lineTo(q.x + 3, q.y + 14);
          ctx.stroke();
        }
        return;
      }
      if (!l.b) {
        // Pinned to the background: a small mount behind the pin.
        ctx.fillStyle = r.colors.ink3;
        ctx.globalAlpha = 0.5;
        ctx.beginPath();
        ctx.moveTo(q.x, q.y); ctx.lineTo(q.x - 7, q.y + 11); ctx.lineTo(q.x + 7, q.y + 11); ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = 1;
      }
      if (l.motor) {
        // An arrow around the axle shows which way the motor turns.
        // Positive speed is counterclockwise, which is a negative sweep on screen.
        const dir = l.dir === 1 || l.dir === -1 ? l.dir : (l.speed || 0) >= 0 ? 1 : -1;
        const a = arcArrow(q.x, q.y, 11, dir > 0 ? Math.PI * 0.2 : Math.PI * 0.8, -dir * Math.PI * 1.4, 7);
        ctx.strokeStyle = r.colors.motor;
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(q.x, q.y, 11, a.start, a.end, a.anticlockwise);
        ctx.stroke();
        ctx.lineCap = 'butt';
        ctx.fillStyle = r.colors.motor;
        ctx.beginPath();
        ctx.moveTo(a.tip.x, a.tip.y); ctx.lineTo(a.left.x, a.left.y); ctx.lineTo(a.right.x, a.right.y); ctx.closePath();
        ctx.fill();
      }
      ctx.fillStyle = r.colors.surface;
      ctx.strokeStyle = ink;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.arc(q.x, q.y, 5.5, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = ink;
      ctx.beginPath();
      ctx.arc(q.x, q.y, 1.8, 0, Math.PI * 2);
      ctx.fill();
    }

    // A solid rod or rope as simulated: a thick line through its segments' joints.
    function drawSolid(l, color) {
      const pts = app.sim && !app.simStale ? app.sim.solidPoints(l.id) : null;
      if (!pts) return false;
      const th = (l.kind === 'rope' ? 0.03 : 0.06) * cam().scale;
      ctx.strokeStyle = color;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = Math.max(l.kind === 'rope' ? 3 : 5, th);
      ctx.beginPath();
      pts.forEach((p, i) => { const q = r.toScreen(p); if (i === 0) ctx.moveTo(q.x, q.y); else ctx.lineTo(q.x, q.y); });
      ctx.stroke();
      // Dots at the joints show it is made of links.
      if (l.kind === 'rope' && cam().scale * (l.length / (pts.length - 1)) > 8) {
        ctx.fillStyle = r.colors.surface;
        pts.forEach((p) => { const q = r.toScreen(p); ctx.beginPath(); ctx.arc(q.x, q.y, Math.max(1, ctx.lineWidth * 0.22), 0, Math.PI * 2); ctx.fill(); });
      }
      ctx.lineCap = 'butt';
      return true;
    }

    function drawLink(l) {
      const sel = !r.exporting && app.isSelected('link', l.id);
      const hov = !r.exporting && app.hover && app.hover.type === 'link' && app.hover.id === l.id;
      const [pa, pb] = linkEnds(l);
      const color = sel ? r.colors.accent : hov ? r.colors.ink : r.colors.link;
      if (l.kind === 'hinge' || l.kind === 'weld') { drawHinge(l, pa, sel || hov); return; }
      if (l.kind === 'pulley') { drawPulley(l, sel, hov); return; }
      if (l.kind === 'spring') drawSpring(pa, pb, color, sel ? 2.2 : 1.7);
      else if (l.solid && drawSolid(l, sel ? r.colors.accent : l.kind === 'rope' ? r.colors.rope : color)) { /* drawn from its bodies */ }
      else if (l.kind === 'rod') drawRod(pa, pb, color);
      else if (l.kind === 'rope') drawRope(pa, pb, l.length, sel ? r.colors.accent : r.colors.rope);
      if (!l.a) anchorMount(pa, color);
      if (!l.b) anchorMount(pb, color);
    }

    function drawTrails() {
      const rec = app.recorder;
      if (!rec || rec.t.length < 2) return;
      const n = rec.t.length;
      const stride = Math.max(1, Math.ceil(n / 1500));
      app.scene.bodies.forEach((b) => {
        if (b.fixed) return;
        const xs = rec.cols.get(b.id + ':x');
        const ys = rec.cols.get(b.id + ':y');
        if (!xs) return;
        const col = S.COLORS[b.color] || S.COLORS.blue;
        ctx.strokeStyle = col.stroke;
        ctx.globalAlpha = 0.5;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        for (let i = 0; i < n; i += stride) {
          const q = r.toScreen({ x: xs[i], y: ys[i] });
          if (i === 0) ctx.moveTo(q.x, q.y); else ctx.lineTo(q.x, q.y);
        }
        const last = r.toScreen({ x: xs[n - 1], y: ys[n - 1] });
        ctx.lineTo(last.x, last.y);
        ctx.stroke();
        // Strobe dots every 0.1 s, like a multiflash photograph.
        ctx.globalAlpha = 0.8;
        ctx.fillStyle = col.stroke;
        const every = Math.max(1, Math.round(0.1 / rec.interval));
        for (let i = 0; i < n; i += every) {
          const q = r.toScreen({ x: xs[i], y: ys[i] });
          ctx.beginPath();
          ctx.arc(q.x, q.y, 2, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      });
    }

    // An outline in the stage color keeps an arrow readable where it crosses an object.
    function arrow(from, to, color, label, outline) {
      const dx = to.x - from.x;
      const dy = to.y - from.y;
      const L = Math.hypot(dx, dy);
      if (L < 4) return;
      const ux = dx / L; const uy = dy / L;
      const shape = (width, ink, headOutline = 0) => {
        ctx.strokeStyle = ink;
        ctx.fillStyle = ink;
        ctx.lineWidth = width;
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.lineTo(to.x - ux * 7, to.y - uy * 7);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(to.x, to.y);
        ctx.lineTo(to.x - ux * 10 - uy * 5, to.y - uy * 10 + ux * 5);
        ctx.lineTo(to.x - ux * 10 + uy * 5, to.y - uy * 10 - ux * 5);
        ctx.closePath();
        ctx.fill();
        if (headOutline) { ctx.lineWidth = headOutline; ctx.stroke(); }
      };
      // Match the head's border to the exposed shaft border: (3.5 - 2.2) / 2.
      if (outline) shape(3.5, r.colors.bg, 1.3);
      shape(2.2, color);
      ctx.lineJoin = 'miter';
      if (label) {
        // "F_f" draws F with a small upright f below it.
        const [main, sub] = label.split('_');
        ctx.font = 'italic 600 12px Figtree, system-ui, sans-serif';
        ctx.textAlign = 'left';
        const text = (t, x, y) => {
          if (outline) { ctx.lineWidth = 1.5; ctx.strokeStyle = r.colors.bg; ctx.strokeText(t, x, y); }
          ctx.fillText(t, x, y);
        };
        text(main, to.x + 5, to.y - 5);
        if (sub) {
          const w = ctx.measureText ? ctx.measureText(main).width : main.length * 7.5;
          ctx.font = '600 9px Figtree, system-ui, sans-serif';
          text(sub, to.x + 6 + w, to.y - 2);
        }
      }
    }

    function drawVectors() {
      if (!app.sim) return;
      app.scene.bodies.forEach((b) => {
        if (b.fixed) return;
        const v = app.velocityOf(b);
        if (!v) return;
        const speed = Math.hypot(v.vx, v.vy);
        if (speed < 0.02) return;
        const pose = app.poseOf(b);
        // 0.25 s of motion, capped so fast objects keep their arrow on screen.
        const len = Math.min(0.25 * speed * cam().scale, 160);
        const from = r.toScreen(pose);
        arrow(from, { x: from.x + (v.vx / speed) * len, y: from.y - (v.vy / speed) * len }, r.colors.vector, 'v');
      });
    }

    // Force arrows on every moving object or, when objects are selected, a free-body diagram of
    // just those, each force drawn from where it acts. The heaviest object shown has its weight drawn
    // a little longer than it looks (60–160 px). Returns arrows in world coordinates at a
    // given camera scale, so Fit can make room for them too.
    r.forceArrows = function forceArrows(scale) {
      if (!app.sim || app.simStale || !app.sim.forcesOn) return [];
      const moving = app.scene.bodies.filter((b) => !b.fixed);
      const picked = app.selectedBodies().map((id) => S.bodyById(app.scene, id)).filter((b) => b && !b.fixed);
      const shown = picked.length ? picked : moving;
      const list = shown.flatMap((b) => app.sim.forcesOn(b.id));
      const heaviest = shown.reduce((m, b) => (!m || b.mass > m.mass ? b : m), null);
      let ref = heaviest ? Math.abs(app.scene.world.gravity) * heaviest.mass : 0;
      if (!(ref > 0)) ref = Math.max(0, ...list.map((f) => Math.hypot(f.fx, f.fy)));
      if (!(ref > 0)) return [];
      const e = heaviest ? S.extent(heaviest) : { x: 0.25, y: 0.25 };
      const unit = Math.min(160, Math.max(60, 2.4 * Math.max(e.x, e.y) * scale)) / scale;
      return list.map((f) => {
        const F = Math.hypot(f.fx, f.fy);
        if (F < 0.01 * ref) return null;
        const len = Math.min((unit * F) / ref, 3 * unit);
        return { from: { x: f.x, y: f.y }, to: { x: f.x + (f.fx / F) * len, y: f.y + (f.fy / F) * len }, label: f.label };
      }).filter(Boolean);
    };

    // Each kind of force has its own color, so the forces on one object are easy to tell apart.
    const FORCE_COLORS = { W: 'forceW', N: 'forceN', F_f: 'forceF', T: 'forceT', F_s: 'forceS', R: 'forceR', D: 'forceD' };
    function drawForces() {
      r.forceArrows(cam().scale).forEach((a) => arrow(r.toScreen(a.from), r.toScreen(a.to), r.colors[FORCE_COLORS[a.label]] || r.colors.ink, a.label, true));
    }

    function drawLabels() {
      ctx.font = '600 11.5px Figtree, system-ui, sans-serif';
      ctx.textAlign = 'center';
      app.scene.bodies.forEach((b) => {
        const pose = app.poseOf(b);
        const e = S.extent(b);
        const q = r.toScreen({ x: pose.x, y: pose.y + Math.hypot(e.x, e.y) });
        ctx.lineWidth = 3;
        ctx.strokeStyle = r.colors.bg;
        ctx.strokeText(b.name, q.x, q.y - 6);
        ctx.fillStyle = r.colors.ink2;
        ctx.fillText(b.name, q.x, q.y - 6);
      });
    }

    function drawHandles(b) {
      const hs = app.editor.handles(b);
      if (!hs) return;
      ctx.strokeStyle = r.colors.accent;
      ctx.lineWidth = 1.2;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(hs.center.x, hs.center.y); ctx.lineTo(hs.rotate.x, hs.rotate.y);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = r.colors.surface;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(hs.rotate.x, hs.rotate.y, 7, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
      ctx.beginPath();
      ctx.arc(hs.rotate.x, hs.rotate.y, 3.2, -Math.PI * 0.9, Math.PI * 0.4);
      ctx.stroke();
      ctx.fillStyle = r.colors.accent;
      ctx.beginPath();
      ctx.rect(hs.resize.x - 6, hs.resize.y - 6, 12, 12);
      ctx.fill();
      ctx.strokeStyle = r.colors.surface;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    function drawPreview() {
      const ed = app.editor;
      const pv = ed.preview();
      if (!pv) return;
      ctx.globalAlpha = 0.55;
      if (pv.body) {
        drawBody(pv.body);
        ctx.globalAlpha = 1;
        return;
      }
      if (pv.pulley) {
        // Placing a pulley: the wheel, then the rope to the first end, then over to the cursor.
        const { c, radius, from, to } = pv.pulley;
        if (to) {
          const pa = from || to;
          const g = S.pulleyGeometry(c, radius, pa, to, from ? S.pulleyWinding(c, pa, to) : 1);
          if (from) drawPulleyRope({ ...g, pa, pb: to, c }, 0, r.colors.accent, true);
          else {
            // Only the first end so far: a straight line from it to the wheel's rim.
            const A = r.toScreen(to);
            const d = Math.hypot(to.x - c.x, to.y - c.y) || 1;
            const T = r.toScreen({ x: c.x + (radius * (to.x - c.x)) / d, y: c.y + (radius * (to.y - c.y)) / d });
            ctx.strokeStyle = r.colors.accent; ctx.lineWidth = 2; ctx.setLineDash([5, 4]);
            ctx.beginPath(); ctx.moveTo(A.x, A.y); ctx.lineTo(T.x, T.y); ctx.stroke(); ctx.setLineDash([]);
          }
        }
        drawWheel(c, radius, r.colors.accent, true);
        if (from) {
          ctx.globalAlpha = 1;
          const q = r.toScreen(from);
          ctx.fillStyle = r.colors.accent;
          ctx.beginPath();
          ctx.arc(q.x, q.y, 4, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      if (pv.link) {
        const { kind, from, to } = pv.link;
        if (kind === 'spring') drawSpring(from, to, r.colors.accent, 1.8, true);
        else if (kind === 'rod') drawRod(from, to, r.colors.accent, true);
        else drawRope(from, to, 0, r.colors.accent, true);
        ctx.globalAlpha = 1;
        const q = r.toScreen(from);
        ctx.fillStyle = r.colors.accent;
        ctx.beginPath();
        ctx.arc(q.x, q.y, 4, 0, Math.PI * 2);
        ctx.fill();
      }
      if (pv.point) {
        ctx.globalAlpha = 1;
        const q = r.toScreen(pv.point);
        ctx.strokeStyle = pv.ok ? r.colors.accent : r.colors.ink3;
        ctx.lineWidth = 1.6;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.arc(q.x, q.y, 8, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      ctx.globalAlpha = 1;
    }

    // End handles of a selected spring, rod or rope: drag one onto another object.
    function drawLinkHandles(l) {
      const ends = app.editor.linkHandles(l);
      if (!ends) return;
      ['a', 'b'].forEach((k) => {
        const p = ends[k];
        ctx.fillStyle = r.colors.accent;
        ctx.strokeStyle = r.colors.surface;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 6.5, 0, Math.PI * 2);
        ctx.fill(); ctx.stroke();
      });
    }

    // The selection's delete button: a small circle with a cross.
    function drawDeleteButton() {
      const p = app.editor.deleteButton();
      if (!p) return;
      ctx.fillStyle = r.colors.surface;
      ctx.strokeStyle = r.colors.accent;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 11, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
      ctx.strokeStyle = r.colors.ink;
      ctx.lineWidth = 1.8;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(p.x - 3.5, p.y - 3.5); ctx.lineTo(p.x + 3.5, p.y + 3.5);
      ctx.moveTo(p.x + 3.5, p.y - 3.5); ctx.lineTo(p.x - 3.5, p.y + 3.5);
      ctx.stroke();
      ctx.lineCap = 'butt';
    }

    function drawGrab() {
      const g = app.sim && app.sim.grabTarget();
      if (!g) return;
      const A = r.toScreen(g.anchor);
      const B = r.toScreen(g.target);
      ctx.strokeStyle = r.colors.accent;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(A.x, A.y); ctx.lineTo(B.x, B.y);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = r.colors.accent;
      ctx.beginPath();
      ctx.arc(A.x, A.y, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }

    r.draw = function draw(clean = false) {
      if (!r.colors.bg) r.readColors();
      ctx.setTransform(r.dpr, 0, 0, r.dpr, 0, 0);
      ctx.fillStyle = r.colors.bg;
      ctx.fillRect(0, 0, r.w, r.h);
      drawGrid();
      drawFloor();
      drawEnergyZero();
      if (app.display.trails) drawTrails();
      if (!clean && !r.exporting) app.scene.bodies.forEach((b) => {
        if (!S.dragOverrideNote(app.scene, b)) return;
        ctx.save(); bodyPath(b, app.poseOf(b));
        ctx.shadowColor = '#F08C00'; ctx.shadowBlur = 14;
        ctx.strokeStyle = '#F08C00'; ctx.lineWidth = 5; ctx.lineJoin = 'round'; ctx.stroke();
        ctx.restore();
      });
      app.scene.bodies.forEach(drawBody);
      // Hover and selection outlines sit on top of every object.
      if (!clean) app.scene.bodies.forEach((b) => {
        if (app.isSelected('body', b.id)) outline(b, r.colors.accent, 2.6);
        else if (app.hover && app.hover.type === 'body' && app.hover.id === b.id) outline(b, r.colors.accent, 1.3);
      });
      app.scene.links.filter((l) => l.kind !== 'hinge' && l.kind !== 'weld').forEach(drawLink);
      app.scene.links.filter((l) => l.kind === 'hinge' || l.kind === 'weld').forEach(drawLink);
      if (app.display.forces) drawForces();
      if (app.display.vectors) drawVectors();
      if (app.display.labels) drawLabels();
      const sel = clean ? null : app.selection;
      if (sel && sel.type === 'body' && app.canEditGeometry() && !app.extra.length) {
        const b = S.bodyById(app.scene, sel.id);
        if (b) drawHandles(b);
      }
      if (sel && sel.type === 'link' && app.canEditGeometry()) {
        const l = S.linkById(app.scene, sel.id);
        if (l) drawLinkHandles(l);
      }
      if (!clean) {
        drawDeleteButton();
        drawGrab();
        drawPreview();
      }
    };

    r.exportSvg = function exportSvg() {
      const svg = PPM.svg.createContext(r.w, r.h);
      const copy = createRenderer(app, canvas, svg);
      Object.assign(copy, { w: r.w, h: r.h, dpr: 1, colors: r.colors, exporting: true });
      copy.draw(true);
      return svg.serialize();
    };

    r.niceStep = niceStep;
    return r;
  }

  PPM.render = { createRenderer, arcArrow };
})(typeof window !== 'undefined' ? window : globalThis);
