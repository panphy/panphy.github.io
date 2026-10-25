// PanPhyCircuits: circuit diagram symbols (IEC and standard textbook conventions).
// Terminals sit on a 10-unit grid so wires route cleanly; colors come from CSS
// variables (--sch-ink, --sch-paper) so the symbols follow the theme.
(function (root) {
  const PPC = root.PPC = root.PPC || {};
  const common = PPC.artCommon || (typeof require === 'function' ? require('./art-common.js') : null);
  const { esc, n, up, utext } = common;

  const art = {};
  const L = (d, extra = '') => `<path d="${d}" class="sch-line" ${extra}/>`;
  const FILL = (d) => `<path d="${d}" class="sch-fill"/>`;
  const BODY = (d) => `<path d="${d}" class="sch-body"/>`;
  const arrowHead = (x, y, ang, size = 7) => {
    const a = ang * Math.PI / 180;
    const p1 = [x - size * Math.cos(a - 0.42), y - size * Math.sin(a - 0.42)];
    const p2 = [x - size * Math.cos(a + 0.42), y - size * Math.sin(a + 0.42)];
    return FILL(`M ${n(x)} ${n(y)} L ${n(p1[0])} ${n(p1[1])} L ${n(p2[0])} ${n(p2[1])} Z`);
  };
  const two = (x = 40) => ({ a: [-x, 0, -1, 0], b: [x, 0, 1, 0] });
  // A straight arrow from (x1, y1) to a filled head at (x2, y2); the shaft
  // stops short of the tip so the head stays sharp.
  const arrow = (x1, y1, x2, y2, size = 6) => {
    const len = Math.hypot(x2 - x1, y2 - y1), ux = (x2 - x1) / len, uy = (y2 - y1) / len;
    return L(`M ${n(x1)} ${n(y1)} L ${n(x2 - ux * size * 0.7)} ${n(y2 - uy * size * 0.7)}`) + arrowHead(x2, y2, Math.atan2(uy, ux) * 180 / Math.PI, size);
  };
  const polMark = (ctx, x, y, s) => utext(ctx, x, y, s, 'sch-pol');

  // Reading pills stay upright, with a clear gap beside vertical meters.
  function pill(ctx, x, y, str, warn) {
    const w = Math.max(44, str.length * 7.2 + 12);
    return up(ctx, x, y, `<rect x="${n(-w / 2)}" y="-9" width="${n(w)}" height="18" rx="9" class="sch-pill${warn ? ' sch-pill-warn' : ''}"/><text x="0" y="0.5" class="sch-pill-text" text-anchor="middle" dominant-baseline="central">${esc(str)}</text>`);
  }

  // ---------- Sources ----------

  art.cell = {
    bounds: () => [-42, -22, 84, 40],
    terms: () => ({ n: [-40, 0, -1, 0], p: [40, 0, 1, 0] }),
    draw: (ctx) => L('M -40 0 H -5 M 5 0 H 40 M 5 -16 V 16') + `<path d="M -5 -8 V 8" class="sch-line sch-thick"/>` + polMark(ctx, 15, -14, '+')
  };

  art.battery = {
    bounds: () => [-62, -22, 124, 40],
    terms: () => ({ n: [-60, 0, -1, 0], p: [60, 0, 1, 0] }),
    draw: (ctx) => L('M -60 0 H -22 M -14 0 H -8 M 8 0 H 14 M 22 0 H 60 M -14 -16 V 16 M 22 -16 V 16') +
      L('M -6 0 H 6', 'stroke-dasharray="2.5 3"') +
      `<path d="M -22 -8 V 8 M 14 -8 V 8" class="sch-line sch-thick"/>` + polMark(ctx, 32, -14, '+')
  };

  art.dcsupply = {
    bounds: () => [-42, -24, 84, 40],
    terms: () => ({ n: [-40, 0, -1, 0], p: [40, 0, 1, 0] }),
    draw: (ctx) => L('M -40 0 H -19 M 19 0 H 40') + `<circle cx="-15" cy="0" r="4" class="sch-body"/><circle cx="15" cy="0" r="4" class="sch-body"/>` +
      polMark(ctx, -15, -13, '−') + polMark(ctx, 15, -13, '+') + utext(ctx, 0, 1, 'd.c.', 'sch-tag')
  };

  art.acsupply = {
    bounds: () => [-42, -22, 84, 44],
    terms: () => ({ n: [-40, 0, -1, 0], p: [40, 0, 1, 0] }),
    draw: (ctx) => L('M -40 0 H -18 M 18 0 H 40') + `<circle cx="0" cy="0" r="18" class="sch-body"/>` +
      L('M -10 0 C -7 -9 -3 -9 0 0 C 3 9 7 9 10 0') + utext(ctx, 30, -10, '1', 'sch-pin')
  };

  // ---------- Resistors ----------

  const RECT = 'M -20 -8 H 20 V 8 H -20 Z';
  art.resistor = {
    bounds: () => [-42, -12, 84, 24],
    terms: () => two(),
    draw: () => L('M -40 0 H -20 M 20 0 H 40') + BODY(RECT)
  };

  art.rheostat = {
    bounds: () => [-42, -23, 84, 46],
    terms: () => two(),
    draw: () => L('M -40 0 H -20 M 20 0 H 40') + BODY(RECT) + arrow(-26, 19, 24, -19, 7)
  };

  art.potentiometer = {
    bounds: () => [-42, -32, 84, 44],
    terms: () => ({ a: [-40, 0, -1, 0], w: [0, -30, 0, -1], b: [40, 0, 1, 0] }),
    draw: (ctx) => L('M -40 0 H -20 M 20 0 H 40 M 0 -30 V -14') + BODY(RECT) + arrowHead(0, -9, 90) +
      utext(ctx, -34, 9, 'A', 'sch-pin') + utext(ctx, 34, 9, 'B', 'sch-pin') + utext(ctx, 7, -26, 'W', 'sch-pin', 'start')
  };

  // ---------- Lamp and switches ----------

  art.lamp = {
    bounds: () => [-42, -18, 84, 36],
    terms: () => two(),
    draw(ctx) {
      const b = Math.min(1.2, (ctx.st && ctx.st.brightness) || 0);
      const glow = b > 0.02 ? `<circle cx="0" cy="0" r="${n(22 + 26 * Math.min(1, b))}" fill="url(#ppc-glow-warm)" opacity="${n(Math.min(1, b))}" class="ppc-glow"/>` : '';
      return glow + L('M -40 0 H -15 M 15 0 H 40') +
        `<circle cx="0" cy="0" r="15" class="sch-body"/>` +
        (b > 0.02 ? `<circle cx="0" cy="0" r="13.5" fill="#FFD36B" opacity="${n(0.25 + 0.6 * Math.min(1, b))}"/>` : '') +
        L('M -10.6 -10.6 L 10.6 10.6 M -10.6 10.6 L 10.6 -10.6') + `<circle cx="0" cy="0" r="15" class="sch-line"/>`;
    }
  };

  art.switch = {
    bounds: () => [-42, -22, 84, 30],
    terms: () => two(),
    actuator: () => ({ kind: 'toggle', rect: [-26, -24, 52, 32] }),
    draw(ctx) {
      const closed = !!ctx.p.closed;
      return L('M -40 0 H -23 M 23 0 H 40') + `<circle cx="-20" cy="0" r="3" class="sch-body"/><circle cx="20" cy="0" r="3" class="sch-body"/>` +
        L(closed ? 'M -17.5 -1.5 L 19 -1.5' : 'M -17.4 -1.6 L 17 -16');
    }
  };

  art.pushswitch = {
    bounds: () => [-42, -30, 84, 36],
    terms: () => two(),
    actuator: () => ({ kind: 'momentary', rect: [-26, -32, 52, 38] }),
    draw(ctx) {
      const y = ctx.pressed ? -4 : -12;
      return L('M -40 0 H -23 M 23 0 H 40') + `<circle cx="-20" cy="0" r="3" class="sch-body"/><circle cx="20" cy="0" r="3" class="sch-body"/>` +
        L(`M -22 ${y} H 22 M 0 ${y} V ${y - 12} M -8 ${y - 12} H 8`);
    }
  };

  art.switch2 = {
    bounds: () => [-42, -36, 84, 72],
    terms: () => ({ c: [-40, 0, -1, 0], a: [40, -20, 1, 0], b: [40, 20, 1, 0] }),
    actuator: () => ({ kind: 'toggle', rect: [-26, -28, 52, 56] }),
    draw(ctx) {
      const toB = !!ctx.p.toB;
      return L('M -40 0 H -23 M 23 -20 H 40 M 23 20 H 40') +
        `<circle cx="-20" cy="0" r="3" class="sch-body"/><circle cx="20" cy="-20" r="3" class="sch-body"/><circle cx="20" cy="20" r="3" class="sch-body"/>` +
        L(toB ? 'M -17.8 1.8 L 17.5 18' : 'M -17.8 -1.8 L 17.5 -18') +
        utext(ctx, 30, -29, 'A', 'sch-pin') + utext(ctx, 30, 29, 'B', 'sch-pin');
    }
  };

  // ---------- Fuse, motor and loudspeaker ----------

  // Fuse (AQA style): a rectangle with the wire running through it, broken once blown.
  art.fuse = {
    bounds: () => [-42, -10, 84, 20],
    terms: () => two(),
    draw: (ctx) => BODY('M -20 -7 H 20 V 7 H -20 Z') + L(ctx.p.blown ? 'M -40 0 H -6 M 6 0 H 40' : 'M -40 0 H 40')
  };

  art.motor = {
    bounds: () => [-42, -18, 84, 36],
    terms: () => two(),
    draw: (ctx) => L('M -40 0 H -16 M 16 0 H 40') + `<circle cx="0" cy="0" r="16" class="sch-body"/><circle cx="0" cy="0" r="16" class="sch-line"/>` +
      utext(ctx, 0, 0.5, 'M', 'sch-letter')
  };

  // Loudspeaker: the magnet (rectangle) and cone, both leads on the magnet side.
  // Sound waves show while an alternating current drives it.
  art.speaker = {
    bounds: () => [-42, -32, 84, 64],
    terms: () => ({ a: [-40, -10, -1, 0], b: [-40, 10, -1, 0] }),
    draw(ctx) {
      const loud = ctx.sounding && Math.abs((ctx.st && ctx.st.i) || 0) > 1e-3;
      return L('M -40 -10 H -14 M -40 10 H -14') + BODY('M -14 -16 H 0 V 16 H -14 Z') + BODY('M 0 -16 L 18 -30 V 30 L 0 16 Z') +
        (loud ? `<g class="ppc-waves">${L('M 25 -9 Q 30 0 25 9')}${L('M 32 -15 Q 39 0 32 15')}</g>` : '');
    }
  };

  // ---------- Meters ----------

  function meterPill(ctx) {
    const text = ctx.display || '—';
    const width = Math.max(44, text.length * 7.2 + 12);
    return { cx: 0, cy: (ctx.r & 1) ? 24 + width / 2 : 34, width, text };
  }

  function meterSym(letter) {
    return {
      bounds: () => [-42, -18, 84, 64],
      readingPill: meterPill,
      terms: () => ({ n: [-40, 0, -1, 0], p: [40, 0, 1, 0] }),
      draw(ctx) {
        const reading = meterPill(ctx);
        return L('M -40 0 H -16 M 16 0 H 40') + `<circle cx="0" cy="0" r="16" class="sch-body"/>` + `<circle cx="0" cy="0" r="16" class="sch-line"/>` +
          utext(ctx, 0, 0.5, letter, 'sch-letter') + polMark(ctx, 26, -10, '+') + polMark(ctx, -26, -10, '−') +
          pill(ctx, reading.cx, reading.cy, reading.text, ctx.displayWarn);
      }
    };
  }
  art.ammeter = meterSym('A');
  art.voltmeter = meterSym('V');

  art.scope = {
    bounds: () => [-52, -36, 104, 78],
    terms: () => ({ ch1: [-30, 40, 0, 1], ch2: [0, 40, 0, 1], com: [30, 40, 0, 1] }),
    draw(ctx) {
      const clip = `${ctx.uid}-sscr`;
      const X0 = -42, Y0 = -26, W = 84, H = 44;
      let traces = '';
      const s = ctx.scope;
      if (s && s.t.length) {
        const span = Number(ctx.p.tdiv) * 10;
        const tEnd = Math.max(s.t[s.t.length - 1], span), t0 = tEnd - span;
        for (const [key, vdiv, color] of [['ch1', Number(ctx.p.v1), '#E0B400'], ['ch2', Number(ctx.p.v2), '#0FA3C4']]) {
          let d = '', pen = false;
          const step = Math.max(1, Math.floor(s[key].length / 300));
          for (let i = 0; i < s[key].length; i += step) {
            const v = s[key][i];
            if (!Number.isFinite(v)) { pen = false; continue; }
            const x = X0 + ((s.t[i] - t0) / span) * W;
            const y = Math.max(Y0 - 3, Math.min(Y0 + H + 3, Y0 + H / 2 - (v / vdiv) * (H / 8)));
            d += (pen ? ' L ' : ' M ') + n(x) + ' ' + n(y);
            pen = true;
          }
          if (d) traces += `<path d="${d}" fill="none" stroke="${color}" stroke-width="1.6"/>`;
        }
      }
      return L('M -30 30 V 40 M 0 30 V 40 M 30 30 V 40') + BODY('M -50 -34 H 50 V 30 H -50 Z') +
        `<rect x="${X0}" y="${Y0}" width="${W}" height="${H}" class="sch-screen"/>` +
        `<clipPath id="${clip}"><rect x="${X0}" y="${Y0}" width="${W}" height="${H}"/></clipPath>` +
        L(`M ${X0} ${Y0 + H / 2} H ${X0 + W}`, 'opacity="0.25"') +
        `<g clip-path="url(#${clip})">${traces}</g>` +
        utext(ctx, -30, 24.5, '1', 'sch-pin') + utext(ctx, 0, 24.5, '2', 'sch-pin') + utext(ctx, 30, 24.5, 'COM', 'sch-pin');
    }
  };

  // ---------- Semiconductors ----------

  const DIODE = 'M -10 -11 L -10 11 L 10 0 Z';
  art.diode = {
    bounds: () => [-42, -16, 84, 30],
    terms: () => ({ a: [-40, 0, -1, 0], k: [40, 0, 1, 0] }),
    draw: () => L('M -40 0 H -10 M 10 0 H 40 M 10 -11 V 11') + `<path d="${DIODE}" class="sch-fill"/>`
  };

  // LED (AQA style): the diode inside a circle, two parallel arrows pointing
  // out of it. The leads stop at the circle.
  const LED_DIODE = 'M -7 -9 L -7 9 L 8 0 Z';
  art.led = {
    bounds: () => [-42, -34, 84, 52],
    terms: () => ({ a: [-40, 0, -1, 0], k: [40, 0, 1, 0] }),
    draw(ctx) {
      const st = ctx.st || {};
      const b = Math.min(1.2, st.brightness || 0);
      const colors = PPC.registry ? PPC.registry.LED_COLORS : {};
      const key = ctx.p.color in colors ? ctx.p.color : 'red';
      const glow = b > 0.02 ? `<circle cx="0" cy="0" r="${n(20 + 24 * Math.min(1, b))}" fill="url(#ppc-glow-${key})" opacity="${n(Math.min(1, b))}" class="ppc-glow"/>` : '';
      return glow + L('M -40 0 H -16 M 16 0 H 40 M -16 0 H -7 M 8 0 H 16 M 8 -9 V 9') + `<circle cx="0" cy="0" r="16" class="sch-line"/>` +
        `<path d="${LED_DIODE}" class="sch-fill"/>` +
        arrow(5, -19, 15, -29) + arrow(13, -14, 23, -24);
    }
  };

  function bjtSym(pnp) {
    return {
      bounds: () => [-42, -42, 72, 84],
      terms: () => ({ b: [-40, 0, -1, 0], c: [20, -40, 0, -1], e: [20, 40, 0, 1] }),
      draw(ctx) {
        // Emitter arrow: NPN points away from the base, PNP points toward it.
        const head = pnp ? arrowHead(-1, 11.25, -148.7, 8) : arrowHead(16, 21.5, 31.3, 8);
        return `<circle cx="2" cy="0" r="25" class="sch-body"/>` + `<circle cx="2" cy="0" r="25" class="sch-line"/>` +
          L('M -40 0 H -8 M -8 -15 V 15 M -8 -7 L 20 -24 V -40 M -8 7 L 20 24 V 40') + `<path d="M -8 -15 V 15" class="sch-line sch-thick"/>` + head +
          utext(ctx, -34, -9, 'B', 'sch-pin') + utext(ctx, 29, -36, 'C', 'sch-pin') + utext(ctx, 29, 36, 'E', 'sch-pin');
      }
    };
  }
  art.npn = bjtSym(false);
  art.pnp = bjtSym(true);

  // ---------- Sensors ----------

  art.thermistor = {
    bounds: () => [-42, -18, 84, 34],
    terms: () => two(),
    draw: () => L('M -40 0 H -20 M 20 0 H 40') + BODY(RECT) + L('M -27 14 H -19 L 19 -14')
  };

  // LDR (AQA style): a resistor inside a circle, two parallel arrows pointing
  // in from outside. The leads stop at the circle.
  art.ldr = {
    bounds: () => [-42, -37, 84, 59],
    terms: () => two(),
    draw: () => L('M -40 0 H -20 M 20 0 H 40 M -20 0 H -14 M 14 0 H 20') + `<circle cx="0" cy="0" r="20" class="sch-line"/>` +
      BODY('M -14 -6 H 14 V 6 H -14 Z') + arrow(-28, -30, -16, -18) + arrow(-16, -36, -4, -24)
  };

  // ---------- Capacitors ----------

  art.capacitor = {
    bounds: () => [-42, -18, 84, 36],
    terms: () => ({ p: [-40, 0, -1, 0], n: [40, 0, 1, 0] }),
    draw: () => L('M -40 0 H -5 M 5 0 H 40') + `<path d="M -5 -16 V 16 M 5 -16 V 16" class="sch-line sch-plate"/>`
  };

  art.ecap = {
    bounds: () => [-42, -26, 84, 44],
    terms: () => ({ p: [-40, 0, -1, 0], n: [40, 0, 1, 0] }),
    draw: (ctx) => L('M -40 0 H -9 M 9 0 H 40') + `<path d="M -9 -16 H -4 V 16 H -9 Z" class="sch-body"/>` + `<path d="M 4 -16 H 9 V 16 H 4 Z" class="sch-fill"/>` +
      polMark(ctx, -18, -14, '+')
  };

  // ---------- Logic ----------

  // Gate outline only (shared with the module silkscreen).
  function gateBody(key, style) {
    const inv = ['nand', 'nor', 'xnor'].includes(key);
    if (style === 'iec') {
      const label = { and: '&', nand: '&', or: '≥1', nor: '≥1', xor: '=1', xnor: '=1', not: '1' }[key];
      return BODY('M -20 -24 H 20 V 24 H -20 Z') + `<text x="0" y="1" class="sch-iec" text-anchor="middle" dominant-baseline="central">${esc(label)}</text>` +
        (inv || key === 'not' ? `<circle cx="24" cy="0" r="4" class="sch-body"/>` : '');
    }
    const AND = 'M -20 -20 H 0 A 20 20 0 0 1 0 20 H -20 Z';
    const OR = 'M -22 -20 Q -8 -20 6 -12 Q 16 -6 22 0 Q 16 6 6 12 Q -8 20 -22 20 Q -12 0 -22 -20 Z';
    let out = '';
    if (key === 'not') return BODY('M -18 -16 L 14 0 L -18 16 Z') + `<circle cx="18" cy="0" r="4" class="sch-body"/>`;
    if (key === 'and' || key === 'nand') out = BODY(AND);
    else out = BODY(OR);
    if (key === 'xor' || key === 'xnor') out += L('M -28 -20 Q -18 0 -28 20');
    if (inv) out += `<circle cx="${key === 'nand' ? 24 : 26}" cy="0" r="4" class="sch-body"/>`;
    return out;
  }

  function gateSym(key) {
    const single = key === 'not';
    return {
      bounds: () => [-42, -26, 84, 52],
      terms: () => (single ? { a: [-40, 0, -1, 0], q: [40, 0, 1, 0] } : { a: [-40, -10, -1, 0], b: [-40, 10, -1, 0], q: [40, 0, 1, 0] }),
      draw(ctx) {
        const style = ctx.logicStyle === 'iec' ? 'iec' : 'distinctive';
        const inv = ['nand', 'nor', 'xnor', 'not'].includes(key);
        let outStart;
        if (style === 'iec') outStart = inv ? 28 : 20;
        else outStart = key === 'not' ? 22 : key === 'and' ? 20 : key === 'nand' ? 28 : inv ? 30 : 22;
        const inEnd = style === 'iec' ? -20 : (key === 'and' || key === 'nand' || key === 'not') ? (key === 'not' ? -18 : -20) : -18;
        const leads = single ? `M -40 0 H ${inEnd}` : `M -40 -10 H ${inEnd} M -40 10 H ${inEnd}`;
        const Lg = ctx.logic || { in: {}, out: {} };
        const lvl = (on, x, y, anchor) => utext(ctx, x, y, on ? '1' : '0', 'sch-level' + (on ? ' sch-level-on' : ''), anchor);
        return L(`${leads} M ${outStart} 0 H 40`) + gateBody(key, style) +
          (single ? lvl(Lg.in.a, -33, -8) : lvl(Lg.in.a, -33, -18) + lvl(Lg.in.b, -33, 18)) + lvl(Lg.out.q, 34, -8);
      }
    };
  }
  for (const key of ['and', 'or', 'not', 'nand', 'nor', 'xor', 'xnor']) art['gate_' + key] = gateSym(key);

  art.logic_in = {
    bounds: () => [-24, -20, 66, 40],
    terms: () => ({ q: [40, 0, 1, 0] }),
    actuator: () => ({ kind: 'toggle', rect: [-22, -18, 42, 36] }),
    draw(ctx) {
      const on = !!ctx.p.high;
      return L('M 20 0 H 40') + BODY('M -20 -16 H 20 V 16 H -20 Z') +
        `<rect x="-14" y="-6" width="20" height="12" rx="6" class="sch-line"/><circle cx="${on ? 0 : -8}" cy="0" r="4.5" class="sch-fill"/>` +
        utext(ctx, 13, 0.5, on ? '1' : '0', 'sch-level' + (on ? ' sch-level-on' : ''));
    }
  };

  art.logic_out = {
    bounds: () => [-42, -18, 62, 36],
    terms: () => ({ a: [-40, 0, -1, 0] }),
    draw(ctx) {
      const on = !!(ctx.logic && ctx.logic.in.a);
      return L('M -40 0 H -14') + (on ? `<circle cx="0" cy="0" r="26" fill="url(#ppc-glow-red)" opacity="0.8" class="ppc-glow"/>` : '') +
        `<circle cx="0" cy="0" r="14" class="sch-body"/>` + (on ? `<circle cx="0" cy="0" r="12.5" fill="#FF4A3D" opacity="0.85"/>` : '') +
        `<circle cx="0" cy="0" r="14" class="sch-line"/>` + utext(ctx, 0, 0.5, on ? '1' : '0', 'sch-level' + (on ? ' sch-level-lit' : ''));
    }
  };

  art.rail_0v = {
    bounds: () => [-18, -22, 36, 44],
    terms: () => ({ t: [0, -20, 0, -1] }),
    draw: (ctx) => L('M 0 -20 V 0 M -14 0 H 14 M -9 5 H 9 M -4 10 H 4') + utext(ctx, 0, 20, '0 V', 'sch-tag')
  };

  art.rail_5v = {
    bounds: () => [-20, -26, 40, 48],
    terms: () => ({ t: [0, 20, 0, 1] }),
    draw: (ctx) => L('M 0 20 V 0 M -10 0 H 10') + utext(ctx, 0, -12, '+5 V', 'sch-tag')
  };

  art.junction = {
    bounds: () => [-6, -6, 12, 12],
    terms: () => ({ j: [0, 0, 0, 0] }),
    draw: () => ''
  };

  PPC.artSchematic = { art, gateBody };
  if (typeof module === 'object' && module.exports) module.exports = PPC.artSchematic;
})(typeof globalThis === 'object' ? globalThis : this);
