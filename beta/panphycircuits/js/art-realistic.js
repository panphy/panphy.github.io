// PanPhyCircuits: realistic component illustrations (original SVG artwork).
// Each entry gives the local bounds, terminal coordinates with outward directions,
// an optional actuator (switch lever, slider, knob) and a draw(ctx) function.
// Local coordinates: x right, y down, origin at the component's position.
(function (root) {
  const PPC = root.PPC = root.PPC || {};
  const common = PPC.artCommon || (typeof require === 'function' ? require('./art-common.js') : null);
  const { esc, n, up, utext, shadow, filamentColor } = common;

  const art = {};

  // ---------- Building blocks ----------

  function lead(x1, y1, x2, y2) {
    return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#8D97A3" stroke-width="3.4" stroke-linecap="round"/>` +
      `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#E6EBF0" stroke-width="1.2" stroke-linecap="round" opacity="0.9"/>`;
  }
  function leadPath(d) {
    return `<path d="${d}" fill="none" stroke="#8D97A3" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/>` +
      `<path d="${d}" fill="none" stroke="#E6EBF0" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" opacity="0.9"/>`;
  }
  // Tinned end of a component lead, where a wire clips on.
  function pad(x, y) {
    return `<circle cx="${x}" cy="${y}" r="3.6" fill="#C7CED6" stroke="#5F6973" stroke-width="1"/>`;
  }
  // Brass solder tag with a hole, used by holders and bases.
  function tag(x, y, dir) {
    const x0 = dir < 0 ? x : x - 10;
    return `<rect x="${x0}" y="${y - 5}" width="10" height="10" rx="2.5" fill="url(#ppc-brass)" stroke="#7A5717" stroke-width="0.8"/>` +
      `<circle cx="${x}" cy="${y}" r="2.2" fill="#3A2A0C"/>`;
  }
  function screw(x, y, r = 5) {
    return `<circle cx="${x}" cy="${y}" r="${r}" fill="url(#ppc-screw)" stroke="#59616B" stroke-width="0.8"/>` +
      `<line x1="${x - r * 0.6}" y1="${y + r * 0.35}" x2="${x + r * 0.6}" y2="${y - r * 0.35}" stroke="#4A515A" stroke-width="1.2"/>`;
  }
  // 4 mm banana socket.
  function socket(x, y, color, r = 9) {
    return `<circle cx="${x}" cy="${y + 1.5}" r="${r + 1}" fill="#000" opacity="0.35"/>` +
      `<circle cx="${x}" cy="${y}" r="${r}" fill="url(#ppc-sock-${color})" stroke="#111" stroke-width="0.8"/>` +
      `<circle cx="${x}" cy="${y}" r="${r * 0.42}" fill="#0B0C0E" stroke="#9AA2AC" stroke-width="1.1"/>`;
  }
  function roundRect(x, y, w, h, r, attrs) {
    return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" ${attrs}/>`;
  }

  // ---------- Resistor color code ----------

  const BAND = ['#1B1B1B', '#7B4A1E', '#D32F2F', '#F57C00', '#FBC02D', '#2E9D4A', '#1F5FD1', '#7B3FC4', '#8E8E8E', '#F5F5F5'];
  const GOLD = '#C9A13B', SILVER = '#BFC5CC';
  function multColor(e) { return e === -1 ? GOLD : e === -2 ? SILVER : BAND[e]; }
  // Returns { bands: [colors], fiveBand, shown (value the bands represent), exact }.
  function colorCode(R) {
    for (const digits of [2, 3]) {
      let e = Math.floor(Math.log10(R)) - (digits - 1);
      let d = Math.round(R / Math.pow(10, e));
      if (d >= Math.pow(10, digits)) { d /= 10; e += 1; }
      const shown = d * Math.pow(10, e);
      const exact = Math.abs(shown - R) <= 1e-9 * R;
      if ((exact || digits === 3) && e >= -2 && e <= 9) {
        const ds = String(d).padStart(digits, '0').split('').map(Number);
        return { bands: ds.map((x) => BAND[x]).concat([multColor(e)]), tolerance: digits === 2 ? GOLD : BAND[1], fiveBand: digits === 3, shown, exact };
      }
    }
    return { bands: [BAND[1], BAND[0], BAND[0]], tolerance: GOLD, fiveBand: false, shown: 100, exact: false };
  }

  // ---------- Sources ----------

  art.cell = {
    bounds: () => [-64, -34, 128, 60],
    terms: () => ({ n: [-60, 0, -1, 0], p: [60, 0, 1, 0] }),
    draw(ctx) {
      const emf = ctx.p.emf;
      return shadow(roundRect(-54, -20, 108, 40, 9, '')) +
        tag(-60, 0, -1) + tag(60, 0, 1) +
        roundRect(-54, -20, 108, 40, 9, 'fill="#25282E" stroke="#121417" stroke-width="1"') +
        roundRect(-50, -16, 100, 32, 7, 'fill="#17191D"') +
        // Spring at the negative end, plate at the positive end.
        [-49, -46.5, -44].map((x) => `<ellipse cx="${x}" cy="0" rx="1.6" ry="9" fill="none" stroke="#C9CFD6" stroke-width="1.4"/>`).join('') +
        roundRect(45, -11, 4, 22, 1.5, 'fill="#C9CFD6"') +
        // The cell: negative flat end at left, positive nub at right.
        roundRect(-40, -14, 78, 28, 4, 'fill="#14786F"') +
        roundRect(10, -14, 28, 28, 0, 'fill="#E2A93B"') +
        roundRect(-41, -14, 3, 28, 1, 'fill="#B9C0C8"') +
        roundRect(38, -6.5, 6, 13, 2, 'fill="#C9CFD6" stroke="#7D8690" stroke-width="0.6"') +
        roundRect(-41, -14, 79, 28, 4, 'fill="url(#ppc-cyl)"') +
        `<rect x="38" y="-6.5" width="6" height="13" rx="2" fill="url(#ppc-cyl)"/>` +
        utext(ctx, -16, 0, `${trimNum(emf)} V`, 'ppc-print ppc-print-light') +
        utext(ctx, 25, 0, '+', 'ppc-mark ppc-mark-dark') +
        utext(ctx, -48, -27, '−', 'ppc-pol ppc-pol-neg') + utext(ctx, 48, -27, '+', 'ppc-pol ppc-pol-pos');
    }
  };

  art.battery = {
    bounds: () => [-90, -46, 180, 88],
    terms: () => ({ n: [-80, 0, -1, 0], p: [80, 0, 1, 0] }),
    draw(ctx) {
      const emf = ctx.p.emf;
      const k = Math.max(1, Math.min(6, Math.round(emf / 1.5) || 1));
      const inner = 116, gap = 4;
      const w = (inner - gap * (k - 1)) / k;
      let cells = '';
      for (let i = 0; i < k; i++) {
        const x = -58 + i * (w + gap);
        const upPos = i % 2 === 0;
        cells += roundRect(n(x), -22, n(w), 40, 3, 'fill="#14786F"') +
          roundRect(n(x), upPos ? -22 : 6, n(w), 12, 0, 'fill="#E2A93B"') +
          roundRect(n(x + w * 0.3), upPos ? -26 : 18, n(w * 0.4), 4, 1.2, 'fill="#C9CFD6"') +
          roundRect(n(x), -22, n(w), 40, 3, 'fill="url(#ppc-cylv)"');
      }
      return shadow(roundRect(-72, -34, 144, 68, 8, '')) +
        tag(-80, 0, -1) + tag(80, 0, 1) +
        roundRect(-72, -34, 144, 68, 8, 'fill="#25282E" stroke="#121417" stroke-width="1"') +
        roundRect(-66, -30, 132, 52, 5, 'fill="#17191D"') + cells +
        roundRect(-40, 24, 80, 8, 2, 'fill="#F2F3F5"') +
        utext(ctx, 0, 28, `${trimNum(emf)} V`, 'ppc-print ppc-print-dark ppc-print-tiny') +
        utext(ctx, -70, -41, '−', 'ppc-pol ppc-pol-neg') + utext(ctx, 70, -41, '+', 'ppc-pol ppc-pol-pos');
    }
  };

  function supplyArt(kind) {
    const ac = kind === 'ac';
    return {
      bounds: () => [-84, -58, 168, 118],
      terms: () => ({ n: [-30, 30, 0, 1], p: [30, 30, 0, 1] }),
      draw(ctx) {
        const p = ctx.p;
        const line1 = ac ? `${trimNum(p.peak)} V pk` : `${(p.emf).toFixed(p.emf >= 10 ? 1 : 2)} V`;
        const line2 = ac ? `${trimNum(p.freq)} Hz` : (ctx.display2 || '—');
        const angle = -135 + 270 * Math.min(1, (ac ? p.peak : p.emf) / 30);
        return shadow(roundRect(-80, -54, 160, 108, 10, '')) +
          roundRect(-80, -54, 160, 108, 10, 'fill="url(#ppc-case)" stroke="#8A919C" stroke-width="1"') +
          roundRect(-72, -46, 144, 92, 7, `fill="${ac ? '#233452' : 'url(#ppc-panel)'}" stroke="#14171C" stroke-width="1"`) +
          roundRect(-62, -38, 84, 34, 4, 'fill="#0B0F0C" stroke="#000" stroke-width="1"') +
          up(ctx, -20, -21, `<text x="38" y="-3" class="ppc-seg" text-anchor="end">${esc(line1)}</text><text x="38" y="11" class="ppc-seg ppc-seg-small" text-anchor="end">${esc(line2)}</text>`) +
          `<circle cx="48" cy="-18" r="15" fill="#11141A"/>` +
          `<circle cx="48" cy="-19" r="13" fill="url(#ppc-knob)"/>` +
          `<line x1="48" y1="-19" x2="${n(48 + 10 * Math.sin(angle * Math.PI / 180))}" y2="${n(-19 - 10 * Math.cos(angle * Math.PI / 180))}" stroke="#F4F4F4" stroke-width="2" stroke-linecap="round"/>` +
          socket(-30, 30, 'black') + socket(30, 30, ac ? 'yellow' : 'red') +
          utext(ctx, -52, 30, ac ? '2' : '−', 'ppc-panel-mark') + utext(ctx, 52, 30, ac ? '1' : '+', 'ppc-panel-mark') +
          utext(ctx, 0, 31, ac ? 'AC ~' : 'DC', 'ppc-panel-label') +
          utext(ctx, 48, 2, ac ? 'VOLTS' : 'VOLTS', 'ppc-panel-tiny');
      }
    };
  }
  art.dcsupply = supplyArt('dc');
  art.acsupply = supplyArt('ac');

  // ---------- Resistors ----------

  const RES_BODY = 'M -18 -9 C -24 -9 -27 -6 -27 0 C -27 6 -24 9 -18 9 C -14 9 -13 7 -10 7 L 10 7 C 13 7 14 9 18 9 C 24 9 27 6 27 0 C 27 -6 24 -9 18 -9 C 14 -9 13 -7 10 -7 L -10 -7 C -13 -7 -14 -9 -18 -9 Z';

  art.resistor = {
    bounds: () => [-62, -14, 124, 30],
    terms: () => ({ a: [-60, 0, -1, 0], b: [60, 0, 1, 0] }),
    draw(ctx) {
      const code = colorCode(ctx.p.R);
      const xs = code.fiveBand ? [-20, -13, -6, 1, 17] : [-20, -12, -5, 17];
      const colors = code.bands.concat([code.tolerance]);
      const clip = `${ctx.uid}-rb`;
      let bands = '';
      xs.forEach((x, i) => { bands += `<rect x="${x}" y="-10" width="${code.fiveBand ? 4.2 : 4.6}" height="20" fill="${colors[i]}"/>`; });
      return shadow(`<path d="${RES_BODY}"/>`) +
        lead(-58, 0, -24, 0) + lead(24, 0, 58, 0) + pad(-60, 0) + pad(60, 0) +
        `<clipPath id="${clip}"><path d="${RES_BODY}"/></clipPath>` +
        `<path d="${RES_BODY}" fill="${code.fiveBand ? '#8FBCE6' : '#E5CF9F'}"/>` +
        `<g clip-path="url(#${clip})">${bands}</g>` +
        `<path d="${RES_BODY}" fill="url(#ppc-cyl)" stroke="#6E5B3A" stroke-opacity="0.35" stroke-width="0.8"/>`;
    }
  };

  art.rheostat = {
    bounds: () => [-90, -46, 180, 66],
    terms: () => ({ a: [-80, 0, -1, 0], b: [80, -30, 1, 0] }),
    actuator: () => ({ kind: 'slider', axis: 'x', x0: -62, x1: 62, rect: [-76, -44, 152, 40] }),
    draw(ctx) {
      const sx = -62 + 124 * (ctx.p.pos / 100);
      let coil = '';
      for (let x = -64; x <= 64; x += 3) coil += `<line x1="${x}" y1="-11" x2="${x + 1.5}" y2="11" stroke="#B26A2E" stroke-width="1.6"/>`;
      return shadow(roundRect(-78, -14, 156, 30, 6, '')) +
        // End brackets.
        roundRect(-80, -36, 8, 50, 2, 'fill="#3A3F48"') + roundRect(72, -36, 8, 50, 2, 'fill="#3A3F48"') +
        // Ceramic former with resistance wire wound on it.
        roundRect(-70, -12, 140, 24, 5, 'fill="url(#ppc-ceramic)"') + coil +
        roundRect(-70, -12, 140, 24, 5, 'fill="url(#ppc-cyl)" opacity="0.8"') +
        // Slider bar.
        roundRect(-76, -33, 152, 6, 3, 'fill="#C9CFD6" stroke="#6C747E" stroke-width="0.8"') +
        roundRect(-76, -33, 152, 6, 3, 'fill="url(#ppc-cyl)"') +
        // Slider.
        `<g class="ppc-slider">` +
        roundRect(n(sx - 9), -40, 18, 34, 4, 'fill="#1F232A" stroke="#0A0B0D" stroke-width="1"') +
        roundRect(n(sx - 6), -38, 12, 6, 2, 'fill="#4C5360"') +
        roundRect(n(sx - 3), -8, 6, 6, 1, 'fill="url(#ppc-brass)"') +
        `</g>` +
        screw(-80, 0, 5.5) + screw(80, -30, 5.5) +
        utext(ctx, -62, 24, 'A', 'ppc-pin') + utext(ctx, 62, -42, 'slider', 'ppc-pin');
    }
  };

  art.potentiometer = {
    bounds: () => [-40, -46, 80, 92],
    terms: () => ({ a: [-20, 40, 0, 1], w: [0, 40, 0, 1], b: [20, 40, 0, 1] }),
    actuator: () => ({ kind: 'knob', rect: [-24, -34, 48, 48] }),
    draw(ctx) {
      const ang = (-135 + 270 * (ctx.p.pos / 100)) * Math.PI / 180;
      const px = n(16 * Math.sin(ang)), py = n(-10 - 16 * Math.cos(ang));
      let knurl = '';
      for (let i = 0; i < 24; i++) {
        const a = (i / 24) * Math.PI * 2;
        knurl += `<line x1="${n(19 * Math.cos(a))}" y1="${n(-10 + 19 * Math.sin(a))}" x2="${n(21 * Math.cos(a))}" y2="${n(-10 + 21 * Math.sin(a))}" stroke="#0B0C0F" stroke-width="1.6"/>`;
      }
      return shadow('<circle cx="0" cy="-10" r="31"/>') +
        [-20, 0, 20].map((x) => roundRect(x - 4, 16, 8, 26, 2, 'fill="url(#ppc-brass)" stroke="#7A5717" stroke-width="0.7"') + `<circle cx="${x}" cy="38" r="2" fill="#3A2A0C"/>`).join('') +
        `<circle cx="0" cy="-10" r="31" fill="#9BA3AD" stroke="#5A626C" stroke-width="1"/>` +
        `<circle cx="0" cy="-10" r="31" fill="url(#ppc-screw)" opacity="0.7"/>` +
        `<circle cx="0" cy="-10" r="22" fill="#14161A"/>` + knurl +
        `<circle cx="0" cy="-10" r="18" fill="url(#ppc-knob)"/>` +
        `<line x1="0" y1="-10" x2="${px}" y2="${py}" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round"/>` +
        `<circle cx="0" cy="-10" r="3" fill="#2A2E35"/>` +
        utext(ctx, -20, 12, 'A', 'ppc-pin ppc-pin-light') + utext(ctx, 0, 12, 'W', 'ppc-pin ppc-pin-light') + utext(ctx, 20, 12, 'B', 'ppc-pin ppc-pin-light');
    }
  };

  // ---------- Lamp and switches ----------

  art.lamp = {
    bounds: () => [-56, -34, 112, 68],
    terms: () => ({ a: [-50, 0, -1, 0], b: [50, 0, 1, 0] }),
    draw(ctx) {
      const st = ctx.st || {};
      const b = Math.min(1.25, st.brightness || 0);
      const fil = filamentColor(st.T || 300);
      const glowR = n(34 + 46 * Math.min(1, b));
      return shadow(roundRect(-44, -28, 88, 56, 10, '')) +
        tag(-50, 0, -1) + tag(50, 0, 1) +
        roundRect(-44, -28, 88, 56, 10, 'fill="#2C3A33" stroke="#151C18" stroke-width="1"') +
        roundRect(-44, -28, 88, 56, 10, 'fill="url(#ppc-top)"') +
        `<path d="M -40 0 H -26 M 26 0 H 40" stroke="url(#ppc-brass)" stroke-width="5"/>` +
        screw(-34, 0, 5) + screw(34, 0, 5) +
        `<circle cx="0" cy="0" r="23" fill="url(#ppc-brass)" stroke="#7A5717" stroke-width="1"/>` +
        `<circle cx="0" cy="0" r="20" fill="${b > 0.02 ? `rgba(255,214,140,${n(0.25 + 0.6 * Math.min(1, b))})` : '#E9EEF2'}"/>` +
        `<path d="M -8 9 V -1 M 8 9 V -1" stroke="#8E959C" stroke-width="1.3"/>` +
        `<path d="M -8 -1 l 2 -4 l 2 4 l 2 -4 l 2 4 l 2 -4 l 2 4 l 2 -4 l 2 4" fill="none" stroke="${fil}" stroke-width="${b > 0.05 ? 1.8 : 1.3}" stroke-linejoin="round"/>` +
        `<circle cx="0" cy="0" r="20" fill="url(#ppc-glass)"/>` +
        (b > 0.01 ? `<circle cx="0" cy="0" r="${glowR}" fill="url(#ppc-glow-warm)" opacity="${n(Math.min(1, b))}" class="ppc-glow"/>` : '');
    }
  };

  art.switch = {
    bounds: () => [-64, -46, 128, 72],
    terms: () => ({ a: [-60, 0, -1, 0], b: [60, 0, 1, 0] }),
    actuator: () => ({ kind: 'toggle', rect: [-42, -46, 92, 64] }),
    draw(ctx) {
      const closed = !!ctx.p.closed;
      const ang = closed ? 0 : -34;
      return shadow(roundRect(-52, -20, 104, 40, 6, '')) +
        tag(-60, 0, -1) + tag(60, 0, 1) +
        roundRect(-52, -20, 104, 40, 6, 'fill="url(#ppc-wood)" stroke="#8E6532" stroke-width="1"') +
        `<path d="M -50 0 H -32 M 32 0 H 50" stroke="url(#ppc-brass)" stroke-width="4"/>` +
        // Contact clip at the right.
        roundRect(26, -8, 12, 16, 2, 'fill="url(#ppc-brass)" stroke="#7A5717" stroke-width="0.8"') +
        roundRect(29, -5, 6, 10, 1, `fill="${closed ? '#B9822F' : '#5E4417'}"`) +
        // Blade on its hinge.
        `<g transform="rotate(${ang} -30 0)">` +
        `<rect x="-30" y="-3.5" width="64" height="7" rx="2" fill="url(#ppc-blade)" stroke="#7B4B1F" stroke-width="0.8"/>` +
        roundRect(34, -7, 14, 14, 4, 'fill="#1C1F24" stroke="#000" stroke-width="0.8"') +
        roundRect(36, -5, 10, 4, 2, 'fill="#4A505B"') +
        `</g>` +
        roundRect(-38, -9, 14, 18, 3, 'fill="url(#ppc-brass)" stroke="#7A5717" stroke-width="0.8"') +
        `<circle cx="-31" cy="0" r="3" fill="url(#ppc-screw)" stroke="#59616B" stroke-width="0.6"/>`;
    }
  };

  art.pushswitch = {
    bounds: () => [-44, -30, 88, 60],
    terms: () => ({ a: [-40, 0, -1, 0], b: [40, 0, 1, 0] }),
    actuator: () => ({ kind: 'momentary', rect: [-22, -22, 44, 44] }),
    draw(ctx) {
      const down = !!ctx.pressed;
      return shadow(roundRect(-28, -26, 56, 52, 8, '')) +
        tag(-40, 0, -1) + tag(40, 0, 1) +
        roundRect(-30, -26, 60, 52, 8, 'fill="#2B2F36" stroke="#111317" stroke-width="1"') +
        roundRect(-30, -26, 60, 52, 8, 'fill="url(#ppc-top)"') +
        screw(-22, -18, 3) + screw(22, -18, 3) + screw(-22, 18, 3) + screw(22, 18, 3) +
        `<circle cx="0" cy="0" r="18" fill="#15171B"/>` +
        (down
          ? `<circle cx="0" cy="1" r="14" fill="#9E1B13"/><circle cx="0" cy="1" r="14" fill="url(#ppc-top)" opacity="0.6"/>`
          : `<circle cx="1.5" cy="3" r="15" fill="#000" opacity="0.4"/><circle cx="0" cy="0" r="15" fill="#E0362A"/><circle cx="-4" cy="-5" r="6" fill="#fff" opacity="0.35"/><circle cx="0" cy="0" r="15" fill="none" stroke="#7E120C" stroke-width="1"/>`) +
        utext(ctx, 0, 33, down ? 'pressed' : 'push', 'ppc-pin');
    }
  };

  art.switch2 = {
    bounds: () => [-64, -46, 128, 92],
    terms: () => ({ c: [-60, 0, -1, 0], a: [60, -20, 1, 0], b: [60, 20, 1, 0] }),
    actuator: () => ({ kind: 'toggle', rect: [-42, -40, 92, 80] }),
    draw(ctx) {
      const toB = !!ctx.p.toB;
      const ang = toB ? 26 : -26;
      const clip = (y, on) => roundRect(26, y - 8, 12, 16, 2, 'fill="url(#ppc-brass)" stroke="#7A5717" stroke-width="0.8"') + roundRect(29, y - 5, 6, 10, 1, `fill="${on ? '#B9822F' : '#5E4417'}"`);
      return shadow(roundRect(-52, -34, 104, 68, 6, '')) +
        tag(-60, 0, -1) + tag(60, -20, 1) + tag(60, 20, 1) +
        roundRect(-52, -34, 104, 68, 6, 'fill="url(#ppc-wood)" stroke="#8E6532" stroke-width="1"') +
        `<path d="M -50 0 H -32 M 38 -20 H 50 M 38 20 H 50" stroke="url(#ppc-brass)" stroke-width="4"/>` +
        clip(-20, !toB) + clip(20, toB) +
        `<g transform="rotate(${ang} -30 0)">` +
        `<rect x="-30" y="-3.5" width="73" height="7" rx="2" fill="url(#ppc-blade)" stroke="#7B4B1F" stroke-width="0.8"/>` +
        roundRect(41, -7, 13, 14, 4, 'fill="#1C1F24" stroke="#000" stroke-width="0.8"') +
        `</g>` +
        roundRect(-38, -9, 14, 18, 3, 'fill="url(#ppc-brass)" stroke="#7A5717" stroke-width="0.8"') +
        `<circle cx="-31" cy="0" r="3" fill="url(#ppc-screw)"/>` +
        utext(ctx, 18, -27, 'A', 'ppc-pin ppc-pin-dark') + utext(ctx, 18, 28, 'B', 'ppc-pin ppc-pin-dark') + utext(ctx, -44, -27, 'common', 'ppc-pin ppc-pin-dark', 'start');
    }
  };

  // ---------- Meters ----------

  function meterArt(letter, accent) {
    return {
      bounds: () => [-56, -46, 112, 96],
      terms: () => ({ n: [-30, 20, 0, 1], p: [30, 20, 0, 1] }),
      draw(ctx) {
        const display = ctx.display || '—';
        return shadow(roundRect(-52, -42, 104, 88, 10, '')) +
          roundRect(-52, -42, 104, 88, 10, 'fill="#2B3038" stroke="#15181D" stroke-width="1"') +
          roundRect(-52, -42, 104, 12, 10, `fill="${accent}"`) + `<rect x="-52" y="-36" width="104" height="6" fill="${accent}"/>` +
          roundRect(-52, -42, 104, 88, 10, 'fill="url(#ppc-top)" opacity="0.6"') +
          roundRect(-44, -26, 88, 30, 4, 'fill="#14171B"') +
          roundRect(-41, -23, 82, 24, 3, 'fill="url(#ppc-lcd)"') +
          up(ctx, 0, -11, `<text x="37" y="0" class="ppc-lcd" text-anchor="end" dominant-baseline="central">${esc(display)}</text>` +
            (ctx.displayNote ? `<text x="-37" y="-7" class="ppc-lcd-note" dominant-baseline="central">${esc(ctx.displayNote)}</text>` : '')) +
          `<circle cx="0" cy="22" r="11" fill="#1A1D22" stroke="${accent}" stroke-width="2"/>` +
          utext(ctx, 0, 22.5, letter, 'ppc-meter-letter') +
          socket(-30, 20, 'black', 8.5) + socket(30, 20, 'red', 8.5) +
          utext(ctx, -30, 37, '− COM', 'ppc-panel-tiny') + utext(ctx, 30, 37, '+', 'ppc-panel-mark ppc-panel-mark-small');
      }
    };
  }
  art.ammeter = meterArt('A', '#E8A317');
  art.voltmeter = meterArt('V', '#2F7ED8');

  art.scope = {
    bounds: () => [-94, -68, 188, 136],
    terms: () => ({ ch1: [-60, 40, 0, 1], ch2: [-20, 40, 0, 1], com: [20, 40, 0, 1] }),
    draw(ctx) {
      const clip = `${ctx.uid}-scr`;
      const X0 = -82, Y0 = -58, W = 120, H = 80;
      let grid = '';
      for (let i = 1; i < 10; i++) grid += `<line x1="${X0 + i * 12}" y1="${Y0}" x2="${X0 + i * 12}" y2="${Y0 + H}" stroke="#2D6B52" stroke-width="${i === 5 ? 0.9 : 0.5}"/>`;
      for (let j = 1; j < 8; j++) grid += `<line x1="${X0}" y1="${Y0 + j * 10}" x2="${X0 + W}" y2="${Y0 + j * 10}" stroke="#2D6B52" stroke-width="${j === 4 ? 0.9 : 0.5}"/>`;
      const traces = scopeTraces(ctx, X0, Y0, W, H);
      const knob = (x, y) => `<circle cx="${x}" cy="${y}" r="9" fill="url(#ppc-knob)" stroke="#000" stroke-width="0.6"/><line x1="${x}" y1="${y}" x2="${x}" y2="${y - 7}" stroke="#eee" stroke-width="1.6"/>`;
      return shadow(roundRect(-90, -64, 180, 128, 10, '')) +
        roundRect(-90, -64, 180, 128, 10, 'fill="url(#ppc-case)" stroke="#858C97" stroke-width="1"') +
        roundRect(-86, -62, 128, 88, 5, 'fill="#1B1F24"') +
        `<clipPath id="${clip}"><rect x="${X0}" y="${Y0}" width="${W}" height="${H}"/></clipPath>` +
        `<rect x="${X0}" y="${Y0}" width="${W}" height="${H}" fill="url(#ppc-screen)"/>` + grid +
        `<g clip-path="url(#${clip})">${traces}</g>` +
        up(ctx, X0 + 3, Y0 + 6, `<text class="ppc-scope-text" dominant-baseline="central">${esc(fmtDiv(ctx.p.tdiv, 's'))}</text>`) +
        up(ctx, X0 + W - 3, Y0 + 6, `<text class="ppc-scope-text ppc-scope-ch1" text-anchor="end" dominant-baseline="central">1: ${esc(fmtDiv(ctx.p.v1, 'V'))}</text>`) +
        up(ctx, X0 + W - 3, Y0 + 15, `<text class="ppc-scope-text ppc-scope-ch2" text-anchor="end" dominant-baseline="central">2: ${esc(fmtDiv(ctx.p.v2, 'V'))}</text>`) +
        knob(66, -46) + knob(66, -18) + knob(66, 10) +
        utext(ctx, 66, -32, 'TIME', 'ppc-panel-tiny ppc-dark') + utext(ctx, 66, -4, 'CH1', 'ppc-panel-tiny ppc-dark') + utext(ctx, 66, 24, 'CH2', 'ppc-panel-tiny ppc-dark') +
        socket(-60, 40, 'yellow', 8) + socket(-20, 40, 'cyan', 8) + socket(20, 40, 'black', 8) +
        utext(ctx, -60, 56, 'CH1', 'ppc-panel-tiny ppc-dark') + utext(ctx, -20, 56, 'CH2', 'ppc-panel-tiny ppc-dark') + utext(ctx, 20, 56, 'COM', 'ppc-panel-tiny ppc-dark') +
        utext(ctx, 62, 46, 'OSCILLOSCOPE', 'ppc-panel-tiny ppc-dark');
    }
  };

  function fmtDiv(v, unit) {
    const x = Number(v);
    if (unit === 's') return x >= 1 ? `${x} s/div` : `${trimNum(x * 1000)} ms/div`;
    return x >= 1 ? `${x} V/div` : `${trimNum(x * 1000)} mV/div`;
  }

  // Polylines for the two channels from the scope's own sample window.
  function scopeTraces(ctx, X0, Y0, W, H) {
    const s = ctx.scope;
    if (!s || !s.t.length) return '';
    const span = Number(ctx.p.tdiv) * 10;
    const tEnd = Math.max(s.t[s.t.length - 1], span);
    const t0 = tEnd - span;
    const yMid = Y0 + H / 2;
    const out = [];
    for (const [key, vdiv, color] of [['ch1', Number(ctx.p.v1), '#FFE14D'], ['ch2', Number(ctx.p.v2), '#4FE3FF']]) {
      const arr = s[key];
      let d = '';
      let pen = false;
      const step = Math.max(1, Math.floor(arr.length / 400));
      for (let i = 0; i < arr.length; i += step) {
        const v = arr[i];
        if (!Number.isFinite(v)) { pen = false; continue; }
        const x = X0 + ((s.t[i] - t0) / span) * W;
        const y = Math.max(Y0 - 4, Math.min(Y0 + H + 4, yMid - (v / vdiv) * 10));
        d += (pen ? ' L ' : ' M ') + n(x) + ' ' + n(y);
        pen = true;
      }
      if (d) out.push(`<path d="${d}" fill="none" stroke="${color}" stroke-width="1.5" stroke-linejoin="round"/>`);
    }
    return out.join('');
  }

  // ---------- Semiconductors ----------

  art.diode = {
    bounds: () => [-44, -20, 88, 34],
    terms: () => ({ a: [-40, 0, -1, 0], k: [40, 0, 1, 0] }),
    draw(ctx) {
      return shadow(roundRect(-17, -7.5, 34, 15, 6, '')) +
        lead(-38, 0, -16, 0) + lead(16, 0, 38, 0) + pad(-40, 0) + pad(40, 0) +
        roundRect(-17, -7.5, 34, 15, 6, 'fill="#1E2025"') +
        `<rect x="8" y="-7.5" width="5" height="15" fill="#C8CDD3"/>` +
        roundRect(-17, -7.5, 34, 15, 6, 'fill="url(#ppc-cyl)"') +
        utext(ctx, -30, -12, 'A', 'ppc-pin') + utext(ctx, 30, -12, 'K', 'ppc-pin');
    }
  };

  art.led = {
    bounds: () => [-36, -56, 72, 64],
    terms: () => ({ a: [-30, 0, -1, 0], k: [30, 0, 1, 0] }),
    draw(ctx) {
      const colors = PPC.registry ? PPC.registry.LED_COLORS : {};
      const info = colors[ctx.p.color] || { color: '#FF2A1F' };
      const st = ctx.st || {};
      const b = Math.min(1.3, st.brightness || 0);
      const lit = b > 0.02;
      const domeD = 'M -11 -14 L -11 -36 A 11 11 0 0 1 11 -36 L 11 -14 Z';
      return shadow(`<path d="${domeD}"/>`) +
        leadPath('M -5 -10 V -6 L -10 -3 L -14 -1 H -28') + leadPath('M 5 -10 V -3 L 10 0 H 28') + pad(-30, 0) + pad(30, 0) +
        `<path d="M -13 -14 H 11 V -9 H -13 Z" fill="${info.color}" opacity="0.85"/>` +
        `<path d="${domeD}" fill="${info.color}" opacity="${lit ? 0.95 : 0.62}"/>` +
        `<path d="M -4 -14 V -26 H 2 L 5 -20 V -14" fill="none" stroke="#5C5C5C" stroke-width="1.3" opacity="0.7"/>` +
        `<path d="${domeD}" fill="url(#ppc-cylv)" opacity="0.65"/>` +
        `<path d="M -7 -33 Q -6 -42 0 -44" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity="0.6"/>` +
        (lit ? `<circle cx="0" cy="-30" r="${n(20 + 22 * Math.min(1, b))}" fill="url(#ppc-glow-${ctx.p.color in colors ? ctx.p.color : 'red'})" opacity="${n(Math.min(1, b))}" class="ppc-glow"/>` : '') +
        utext(ctx, -22, -9, 'A+', 'ppc-pin') + utext(ctx, 22, -9, 'K−', 'ppc-pin');
    }
  };

  function bjtArt(pnp) {
    return {
      bounds: () => [-28, -46, 56, 80],
      terms: (p) => (p.pinout === 'cbe'
        ? { c: [-20, 30, 0, 1], b: [0, 30, 0, 1], e: [20, 30, 0, 1] }
        : { e: [-20, 30, 0, 1], b: [0, 30, 0, 1], c: [20, 30, 0, 1] }),
      draw(ctx) {
        const order = ctx.p.pinout === 'cbe' ? ['C', 'B', 'E'] : ['E', 'B', 'C'];
        const body = 'M -17 -2 L -17 -26 A 17 17 0 0 1 17 -26 L 17 -2 Z';
        return shadow(`<path d="${body}"/>`) +
          leadPath('M -10 -2 V 8 L -20 20 V 28') + leadPath('M 0 -2 V 28') + leadPath('M 10 -2 V 8 L 20 20 V 28') +
          pad(-20, 30) + pad(0, 30) + pad(20, 30) +
          `<path d="${body}" fill="#22252B"/>` +
          `<path d="${body}" fill="url(#ppc-cylv)" opacity="0.7"/>` +
          `<path d="M -17 -2 H 17" stroke="#0E1013" stroke-width="1.5"/>` +
          utext(ctx, 0, -22, pnp ? 'PNP' : 'NPN', 'ppc-print ppc-print-light ppc-print-tiny') +
          utext(ctx, -10, -9, order[0], 'ppc-face') + utext(ctx, 0, -9, order[1], 'ppc-face') + utext(ctx, 10, -9, order[2], 'ppc-face');
      }
    };
  }
  art.npn = bjtArt(false);
  art.pnp = bjtArt(true);

  // ---------- Sensors ----------

  function badge(ctx, x, y, icon, label) {
    return up(ctx, x, y, `<rect x="-26" y="-8" width="52" height="16" rx="8" class="ppc-badge"/>${icon}<text x="5" y="0.5" class="ppc-badge-text" text-anchor="middle" dominant-baseline="central">${esc(label)}</text>`);
  }

  art.thermistor = {
    bounds: () => [-44, -38, 88, 54],
    terms: () => ({ a: [-40, 0, -1, 0], b: [40, 0, 1, 0] }),
    draw(ctx) {
      const t = ctx.p.temp;
      const icon = `<g transform="translate(-17 0)"><rect x="-1.6" y="-6" width="3.2" height="9" rx="1.6" class="ppc-badge-icon"/><circle cx="0" cy="3.5" r="3" class="ppc-badge-icon"/></g>`;
      return shadow('<ellipse cx="0" cy="0" rx="14" ry="12"/>') +
        lead(-38, 0, -10, 0) + lead(10, 0, 38, 0) + pad(-40, 0) + pad(40, 0) +
        `<ellipse cx="0" cy="0" rx="14" ry="12" fill="#7B2C1C"/>` +
        `<ellipse cx="0" cy="0" rx="14" ry="12" fill="url(#ppc-cyl)" opacity="0.8"/>` +
        `<ellipse cx="-4" cy="-5" rx="5" ry="2.5" fill="#fff" opacity="0.25"/>` +
        utext(ctx, 0, 1, 'NTC', 'ppc-print ppc-print-light ppc-print-tiny') +
        badge(ctx, 0, -27, icon, `${Math.round(t)} °C`);
    }
  };

  art.ldr = {
    bounds: () => [-44, -44, 88, 66],
    terms: () => ({ a: [-40, 0, -1, 0], b: [40, 0, 1, 0] }),
    draw(ctx) {
      const lux = ctx.p.lux;
      let track = 'M -10 -10';
      for (let i = 0; i < 6; i++) track += ` H ${i % 2 ? -10 : 10} v 4`;
      track += ' H 10';
      const sun = `<g transform="translate(-16 0)"><circle r="3" class="ppc-badge-icon"/>${[0, 45, 90, 135, 180, 225, 270, 315].map((a) => `<line x1="${n(4.5 * Math.cos(a * Math.PI / 180))}" y1="${n(4.5 * Math.sin(a * Math.PI / 180))}" x2="${n(6.5 * Math.cos(a * Math.PI / 180))}" y2="${n(6.5 * Math.sin(a * Math.PI / 180))}" class="ppc-badge-stroke"/>`).join('')}</g>`;
      return shadow('<circle cx="0" cy="0" r="17"/>') +
        lead(-38, 0, -14, 0) + lead(14, 0, 38, 0) + pad(-40, 0) + pad(40, 0) +
        `<circle cx="0" cy="0" r="17" fill="url(#ppc-ceramic)" stroke="#9E9686" stroke-width="1"/>` +
        `<path d="M -13 -12 H 13 V 12 H -13 Z" fill="#F0E6D2"/>` +
        `<path d="${track}" fill="none" stroke="#C74B1F" stroke-width="2.6" stroke-linejoin="round"/>` +
        `<rect x="-14" y="-13" width="4" height="26" fill="#C9CFD6"/><rect x="10" y="-13" width="4" height="26" fill="#C9CFD6"/>` +
        `<circle cx="0" cy="0" r="17" fill="url(#ppc-glass)" opacity="0.55"/>` +
        badge(ctx, 0, -31, sun, `${fmtLux(lux)} lx`);
    }
  };

  function fmtLux(x) {
    if (x >= 1000) return trimNum(Math.round(x / 100) / 10) + 'k';
    if (x >= 10) return String(Math.round(x));
    return trimNum(Math.round(x * 10) / 10);
  }

  // ---------- Capacitors ----------

  art.ecap = {
    bounds: () => [-54, -28, 108, 48],
    terms: () => ({ p: [-50, 0, -1, 0], n: [50, 0, 1, 0] }),
    draw(ctx) {
      const val = PPC.units.fmtSI(ctx.p.C, 'F', 3, { trim: true });
      return shadow(roundRect(-30, -15, 60, 30, 5, '')) +
        lead(-48, 0, -28, 0) + lead(28, 0, 48, 0) + pad(-50, 0) + pad(50, 0) +
        roundRect(-30, -15, 60, 30, 5, 'fill="#233A66"') +
        `<rect x="10" y="-15" width="16" height="30" fill="#A9BCDB"/>` +
        `<path d="M 15 -9 h 6 M 15 0 h 6 M 15 9 h 6" stroke="#233A66" stroke-width="2.4"/>` +
        roundRect(-31, -15, 5, 30, 2, 'fill="#B8BFC7"') +
        roundRect(-30, -15, 60, 30, 5, 'fill="url(#ppc-cyl)"') +
        utext(ctx, -8, 0, val, 'ppc-print ppc-print-light ppc-print-tiny') +
        utext(ctx, -40, -10, '+', 'ppc-pol ppc-pol-pos') + utext(ctx, 40, -10, '−', 'ppc-pol ppc-pol-neg');
    }
  };

  art.capacitor = {
    bounds: () => [-44, -20, 88, 38],
    terms: () => ({ p: [-40, 0, -1, 0], n: [40, 0, 1, 0] }),
    draw(ctx) {
      return shadow('<ellipse cx="0" cy="-2" rx="15" ry="14"/>') +
        leadPath('M -38 0 H -10 L -6 4') + leadPath('M 38 0 H 10 L 6 4') + pad(-40, 0) + pad(40, 0) +
        `<ellipse cx="0" cy="-2" rx="15" ry="14" fill="#E07B22"/>` +
        `<ellipse cx="0" cy="-2" rx="15" ry="14" fill="url(#ppc-glass)" opacity="0.35"/>` +
        `<ellipse cx="0" cy="-2" rx="15" ry="14" fill="none" stroke="#8C4510" stroke-width="0.8"/>` +
        utext(ctx, 0, -2, capCode(ctx.p.C), 'ppc-print ppc-print-dark ppc-print-tiny');
    }
  };

  // Three-digit capacitor code in picofarads (104 = 10 × 10⁴ pF = 100 nF).
  function capCode(C) {
    const pf = C * 1e12;
    if (pf < 10) return trimNum(Math.round(pf * 10) / 10) + 'p';
    const e = Math.floor(Math.log10(pf)) - 1;
    let d = Math.round(pf / Math.pow(10, e));
    if (d >= 100) return '>1µ';
    if (e > 9) return PPC.units.fmtSI(C, 'F', 2);
    return String(d).padStart(2, '0') + String(e);
  }

  // ---------- Logic modules ----------

  function pcb(x, y, w, h) {
    return shadow(roundRect(x, y, w, h, 6, '')) +
      roundRect(x, y, w, h, 6, 'fill="url(#ppc-pcb)" stroke="#C9A13B" stroke-width="1.5"') +
      [[x + 6, y + 6], [x + w - 6, y + 6], [x + 6, y + h - 6], [x + w - 6, y + h - 6]].map(([cx, cy]) => `<circle cx="${cx}" cy="${cy}" r="2.6" fill="#0E2238" stroke="#C9A13B" stroke-width="1"/>`).join('');
  }
  function smallSocket(x, y) {
    return `<circle cx="${x}" cy="${y}" r="6.5" fill="#101215" stroke="#C9A13B" stroke-width="1.6"/><circle cx="${x}" cy="${y}" r="2.4" fill="#C7CED6"/>`;
  }
  function statusLed(x, y, on) {
    return `<circle cx="${x}" cy="${y}" r="3.4" fill="${on ? '#FF3B2F' : '#4A1512'}" stroke="#1A0605" stroke-width="0.6"/>` +
      (on ? `<circle cx="${x}" cy="${y}" r="9" fill="url(#ppc-glow-red)" opacity="0.85" class="ppc-glow"/>` : '');
  }

  function gateModuleArt(key) {
    const single = key === 'not';
    return {
      bounds: () => [-52, -42, 104, 84],
      terms: () => (single ? { a: [-40, 0, -1, 0], q: [40, 0, 1, 0] } : { a: [-40, -20, -1, 0], b: [-40, 20, -1, 0], q: [40, 0, 1, 0] }),
      draw(ctx) {
        const L = ctx.logic || { in: {}, out: {} };
        const sym = PPC.artSchematic ? PPC.artSchematic.gateBody(key, 'distinctive') : '';
        const name = key.toUpperCase();
        const inputs = single ? [['a', 0]] : [['a', -20], ['b', 20]];
        return pcb(-50, -40, 100, 80) +
          `<g transform="translate(0 -4) scale(0.62)" class="ppc-silk">${sym}</g>` +
          inputs.map(([id, y]) => `<path d="M -40 ${y} H -22" class="ppc-trace"/>` + smallSocket(-40, y) + statusLed(-26, y + 10, L.in[id]) + utext(ctx, -40, y - 12, id.toUpperCase(), 'ppc-silk-text')).join('') +
          `<path d="M 22 0 H 40" class="ppc-trace"/>` + smallSocket(40, 0) + statusLed(40, 14, L.out.q) + utext(ctx, 40, -12, 'Q', 'ppc-silk-text') +
          utext(ctx, 0, 24, name, 'ppc-silk-title') + utext(ctx, 0, 33, 'LOGIC MODULE · 5 V', 'ppc-silk-tiny');
      }
    };
  }
  for (const key of ['and', 'or', 'not', 'nand', 'nor', 'xor', 'xnor']) art['gate_' + key] = gateModuleArt(key);

  art.logic_in = {
    bounds: () => [-42, -32, 84, 64],
    terms: () => ({ q: [30, 0, 1, 0] }),
    actuator: () => ({ kind: 'toggle', rect: [-36, -18, 50, 36] }),
    draw(ctx) {
      const on = !!ctx.p.high;
      return pcb(-40, -30, 80, 60) +
        roundRect(-32, -10, 40, 20, 10, 'fill="#0D0F12" stroke="#000" stroke-width="1"') +
        `<circle cx="${on ? -2 : -22}" cy="0" r="8" fill="#E8EBEF" stroke="#7D858F" stroke-width="1"/><circle cx="${on ? -2 : -22}" cy="0" r="8" fill="url(#ppc-top)"/>` +
        utext(ctx, -22, -17, '0', 'ppc-silk-text') + utext(ctx, -2, -17, '1', 'ppc-silk-text') +
        `<path d="M 10 0 H 30" class="ppc-trace"/>` + smallSocket(30, 0) + statusLed(30, 15, on) +
        utext(ctx, -12, 20, 'INPUT', 'ppc-silk-tiny ppc-silk-strong') + utext(ctx, 30, -14, 'OUT', 'ppc-silk-tiny');
    }
  };

  art.logic_out = {
    bounds: () => [-32, -32, 64, 64],
    terms: () => ({ a: [-20, 0, -1, 0] }),
    draw(ctx) {
      const on = !!(ctx.logic && ctx.logic.in.a);
      return pcb(-30, -30, 60, 60) +
        smallSocket(-20, 0) + `<path d="M -14 0 H -2" class="ppc-trace"/>` +
        `<circle cx="8" cy="-7" r="11" fill="${on ? '#FF3B2F' : '#5A1A15'}" stroke="#250806" stroke-width="1"/>` +
        `<circle cx="4.5" cy="-10.5" r="3.6" fill="#fff" opacity="${on ? 0.6 : 0.25}"/>` +
        (on ? `<circle cx="8" cy="-7" r="28" fill="url(#ppc-glow-red)" opacity="0.9" class="ppc-glow"/>` : '') +
        utext(ctx, 8, 13, on ? '1' : '0', 'ppc-silk-title') + utext(ctx, -20, -12, 'IN', 'ppc-silk-tiny') + utext(ctx, 0, 24, 'OUTPUT', 'ppc-silk-tiny ppc-silk-strong');
    }
  };

  function railArt(color, label) {
    return {
      bounds: () => [-20, -20, 40, 52],
      terms: () => ({ t: [0, 0, 0, -1] }),
      draw(ctx) {
        return shadow('<circle cx="0" cy="0" r="16"/>') +
          `<circle cx="0" cy="0" r="16" fill="#2B2F36" stroke="#111" stroke-width="1"/>` + socket(0, 0, color, 10) +
          utext(ctx, 0, 25, label, 'ppc-rail-label');
      }
    };
  }
  art.rail_0v = railArt('black', '0 V');
  art.rail_5v = railArt('red', '+5 V');

  art.junction = {
    bounds: () => [-9, -9, 18, 18],
    terms: () => ({ j: [0, 0, 0, 0] }),
    draw() {
      return `<circle cx="0" cy="1.5" r="7.5" fill="#000" opacity="0.25"/>` + `<circle cx="0" cy="0" r="7" fill="url(#ppc-brass)" stroke="#7A5717" stroke-width="0.8"/>` +
        `<line x1="-3.5" y1="2" x2="3.5" y2="-2" stroke="#6A4A10" stroke-width="1.3"/>`;
    }
  };

  function trimNum(x) {
    const s = Number(x).toFixed(2);
    return s.replace(/0+$/, '').replace(/\.$/, '');
  }

  PPC.artRealistic = { art, colorCode, capCode };
  if (typeof module === 'object' && module.exports) module.exports = PPC.artRealistic;
})(typeof globalThis === 'object' ? globalThis : this);
