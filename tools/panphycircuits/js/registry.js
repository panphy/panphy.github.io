// PanPhyCircuits: component registry.
// Each type defines its terminals, editable properties, electrical model (compiled
// into solver primitives), readings and help. Artwork for the two views lives in
// art-realistic.js and art-schematic.js and is looked up by the same type id.
(function (root) {
  const PPC = root.PPC = root.PPC || {};
  const units = PPC.units || (typeof require === 'function' ? require('./units.js') : null);
  const { fmtSI } = units;

  const VT = 0.025852; // thermal voltage kT/q at 300 K
  const LOGIC = {
    supply: 5,
    high: 5,
    low: 0,
    risingThreshold: 3.0,
    fallingThreshold: 2.0,
    outputResistance: 50,
    pullDown: 100e3
  };

  const types = {};
  const order = [];

  function define(id, def) {
    def.id = id;
    def.props = def.props || [];
    def.category = def.category || 'core';
    types[id] = def;
    order.push(id);
  }

  // ---------- Shared models ----------

  // SPICE-style junction voltage limiting, so Newton steps cannot overflow exp().
  function pnjlim(vnew, vold, vt, vcrit) {
    if (vnew > vcrit && Math.abs(vnew - vold) > 2 * vt) {
      if (vold > 0) {
        const arg = 1 + (vnew - vold) / vt;
        vnew = arg > 0 ? vold + vt * Math.log(arg) : vcrit;
      } else {
        vnew = vt * Math.log(vnew / vt);
      }
      return { v: vnew, limited: true };
    }
    return { v: vnew, limited: false };
  }

  // Exponential with a linear continuation above a large argument.
  const EXP_MAX = 80;
  function safeExp(x) {
    if (x <= EXP_MAX) return Math.exp(x);
    return Math.exp(EXP_MAX) * (1 + x - EXP_MAX);
  }
  function safeExpDeriv(x) {
    return Math.exp(Math.min(x, EXP_MAX));
  }

  const GLEAK = 1e-12; // junction leakage conductance, part of the diode model

  // Ideal junction (Shockley equation plus leakage) between nodes p (anode) and q.
  function junctionModel(Is, n) {
    const nvt = n * VT;
    const vcrit = nvt * Math.log(nvt / (Math.SQRT2 * Is));
    return {
      eval(v, st) {
        let vd = v[0] - v[1];
        const lim = pnjlim(vd, st.vold ?? 0, nvt, vcrit);
        vd = lim.v;
        st.limited = lim.limited;
        st.vold = vd;
        const e = safeExp(vd / nvt);
        const i = Is * (e - 1) + GLEAK * vd;
        const g = Is * safeExpDeriv(vd / nvt) / nvt + GLEAK;
        st.vd = vd;
        return { i: [i, -i], J: [[g, -g], [-g, g]], v0: [v[1] + vd, v[1]] };
      }
    };
  }

  // Bipolar transistor: Ebers-Moll transport model. pol = +1 for NPN, -1 for PNP.
  // Node order: base (internal, after rb), collector, emitter.
  function bjtModel(pol, beta, Is = 1e-14, betaR = 2) {
    const vcrit = VT * Math.log(VT / (Math.SQRT2 * Is));
    return {
      eval(v, st) {
        const [vB, vC, vE] = v;
        let vbe = pol * (vB - vE);
        let vbc = pol * (vB - vC);
        const l1 = pnjlim(vbe, st.vbe ?? 0, VT, vcrit);
        const l2 = pnjlim(vbc, st.vbc ?? 0, VT, vcrit);
        vbe = l1.v; vbc = l2.v;
        st.limited = l1.limited || l2.limited;
        st.vbe = vbe; st.vbc = vbc;
        const ef = safeExp(vbe / VT), er = safeExp(vbc / VT);
        const If = Is * (ef - 1) + GLEAK * vbe;
        const Ir = Is * (er - 1) + GLEAK * vbc;
        const gf = Is * safeExpDeriv(vbe / VT) / VT + GLEAK;
        const gr = Is * safeExpDeriv(vbc / VT) / VT + GLEAK;
        const kr = 1 + 1 / betaR, kf = 1 + 1 / beta;
        const Ic = If - Ir * kr;
        const Ib = If / beta + Ir / betaR;
        const Ie = -If * kf + Ir;
        // The Jacobian is the same for both polarities (pol * pol = 1).
        const J = [
          [gf / beta + gr / betaR, -gr / betaR, -gf / beta],
          [gf - gr * kr, gr * kr, -gf],
          [-gf * kf + gr, -gr, gf * kf]
        ];
        const v0E = vE;
        const v0B = vE + pol * vbe;
        const v0C = v0B - pol * vbc;
        return { i: [pol * Ib, pol * Ic, pol * Ie], J, v0: [v0B, v0C, v0E] };
      }
    };
  }

  // Filament lamp: tungsten resistance R ∝ T^1.2, filament temperature from a
  // radiative power balance P = k(T⁴ − T0⁴), reached instantly (no thermal lag).
  const LAMP_T0 = 300, LAMP_TR = 2700, LAMP_EXP = 1.2;
  function lampParams(ratedV, ratedI) {
    const Rhot = ratedV / ratedI;
    const k = (ratedV * ratedI) / (Math.pow(LAMP_TR, 4) - Math.pow(LAMP_T0, 4));
    return { Rhot, k, Rcold: Rhot * Math.pow(LAMP_T0 / LAMP_TR, LAMP_EXP) };
  }
  function lampR(p, T) { return p.Rhot * Math.pow(T / LAMP_TR, LAMP_EXP); }
  // Solve the power balance for T at voltage |V| (monotonic, so Newton with a bracket).
  function lampTemperature(p, V, guess) {
    const V2 = V * V;
    if (V2 < 1e-18) return LAMP_T0;
    let lo = LAMP_T0, hi = 20000;
    let T = Math.min(Math.max(guess || LAMP_T0 + 1, lo), hi);
    for (let k = 0; k < 60; k++) {
      const R = lampR(p, T);
      const F = V2 / R - p.k * (Math.pow(T, 4) - Math.pow(LAMP_T0, 4));
      if (F > 0) lo = T; else hi = T;
      const dF = -LAMP_EXP * V2 / (R * T) - 4 * p.k * T * T * T;
      let Tn = T - F / dF;
      if (!(Tn > lo && Tn < hi)) Tn = 0.5 * (lo + hi);
      if (Math.abs(Tn - T) < 1e-9 * T) { T = Tn; break; }
      T = Tn;
    }
    return T;
  }
  function lampModel(ratedV, ratedI) {
    const p = lampParams(ratedV, ratedI);
    return {
      params: p,
      eval(v, st) {
        const V = v[0] - v[1];
        const T = lampTemperature(p, Math.abs(V), st.T);
        st.T = T;
        const R = lampR(p, T);
        const absV = Math.abs(V);
        const dTdV = absV > 1e-12 ? (2 * absV / R) / (LAMP_EXP * absV * absV / (R * T) + 4 * p.k * T * T * T) : 0;
        const g = Math.max(1 / R - (LAMP_EXP * absV / (R * T)) * dTdV, 1e-9);
        const i = V / R;
        st.limited = false;
        return { i: [i, -i], J: [[g, -g], [-g, g]], v0: [v[0], v[1]] };
      }
    };
  }

  function thermistorR(R25, B, celsius) {
    const T = celsius + 273.15;
    return R25 * Math.exp(B * (1 / T - 1 / 298.15));
  }
  function ldrR(R10, lux) {
    const G = 1 / 1e6 + Math.pow(Math.max(lux, 0) / 10, 0.7) / R10;
    return 1 / G;
  }

  // ---------- Helpers for readings ----------

  // Readings for a two-terminal part. Polarized parts give signed values with a
  // stated reference direction; others give sizes plus the direction of current.
  function twoTerminalReadings(c, r, pos = 'a', neg = 'b', labels = {}) {
    const v = r.v(pos, neg);
    const i = r.i(pos);
    if (!labels.signed) {
      const def = types[c.type];
      const name = (id) => def.terminals.find((t) => t.id === id).name;
      const tiny = !(Math.abs(i) >= 1e-9);
      return [
        { key: 'v', label: labels.v || 'Potential difference', value: Math.abs(v), unit: 'V' },
        { key: 'i', label: labels.i || 'Current', value: Math.abs(i), unit: 'A' },
        { key: 'dir', label: 'Current direction', text: Number.isNaN(i) ? '—' : tiny ? 'no current' : (i > 0 ? `${name(pos)} → ${name(neg)}` : `${name(neg)} → ${name(pos)}`) },
        { key: 'p', label: 'Power', value: (Number.isFinite(v) && Number.isFinite(i)) ? Math.abs(v * i) : NaN, unit: 'W' }
      ];
    }
    return [
      { key: 'v', label: labels.v || 'Potential difference', value: v, unit: 'V' },
      { key: 'i', label: labels.i || 'Current', value: i, unit: 'A' },
      { key: 'p', label: 'Power', value: (Number.isFinite(v) && Number.isFinite(i)) ? Math.abs(v * i) : NaN, unit: 'W' }
    ];
  }

  function sourceReadings(c, r) {
    const v = r.v('p', 'n');
    const i = -r.i('p'); // current delivered out of the positive terminal
    return [
      { key: 'v', label: 'Terminal p.d.', value: v, unit: 'V' },
      { key: 'i', label: 'Current out of +', value: i, unit: 'A' },
      { key: 'p', label: 'Power delivered', value: (Number.isFinite(v) && Number.isFinite(i)) ? v * i : NaN, unit: 'W' }
    ];
  }

  const internalResistanceProp = {
    key: 'r', label: 'Internal resistance', unit: 'Ω', kind: 'number', default: 0, min: 0, max: 100, step: 0.1,
    help: '0 Ω gives an ideal source.'
  };

  function compileSource(c, T, b, emf) {
    const r = c.props.r || 0;
    if (r > 0) {
      // Norton form: emf/r driven out of the + terminal, with r across it.
      b.R(T.p, T.n, r);
      b.I(T.n, T.p, typeof emf === 'function' ? (ctx) => emf(ctx) / r : emf / r);
    } else {
      b.V(T.p, T.n, emf, { ideal: true });
    }
  }

  // ---------- Sources ----------

  define('cell', {
    name: 'Cell', group: 'Sources', prefix: 'B', keywords: 'battery emf aa',
    terminals: [{ id: 'p', name: 'Positive (+)' }, { id: 'n', name: 'Negative (−)' }],
    polarity: { p: '+', n: '−' },
    props: [
      { key: 'emf', label: 'EMF', unit: 'V', kind: 'number', default: 1.5, min: 0, max: 3, step: 0.1 },
      internalResistanceProp
    ],
    compile(c, T, b) { compileSource(c, T, b, c.props.emf); },
    readings: sourceReadings,
    valueText: (c) => fmtSI(c.props.emf, 'V', 3, { trim: true }),
    help: 'A single chemical cell. With 0 Ω internal resistance it keeps its terminal p.d. equal to its EMF whatever the current.'
  });

  define('battery', {
    name: 'Battery', group: 'Sources', prefix: 'B', keywords: 'cells pack emf',
    terminals: [{ id: 'p', name: 'Positive (+)' }, { id: 'n', name: 'Negative (−)' }],
    polarity: { p: '+', n: '−' },
    props: [
      { key: 'emf', label: 'EMF', unit: 'V', kind: 'number', default: 6, min: 1.5, max: 9, step: 1.5, help: 'One to six 1.5 V cells.' },
      internalResistanceProp
    ],
    compile(c, T, b) { compileSource(c, T, b, c.props.emf); },
    readings: sourceReadings,
    valueText: (c) => fmtSI(c.props.emf, 'V', 3, { trim: true }),
    help: 'Cells joined in series: one 1.5 V cell per 1.5 V of EMF, up to six (9 V).'
  });

  define('dcsupply', {
    name: 'DC power supply', group: 'Sources', prefix: 'PS', keywords: 'psu lab bench supply',
    terminals: [{ id: 'p', name: 'Positive (+)' }, { id: 'n', name: 'Negative (−)' }],
    polarity: { p: '+', n: '−' },
    props: [
      { key: 'emf', label: 'Output voltage', unit: 'V', kind: 'number', default: 6, min: 0, max: 30, step: 0.5, slider: true },
      internalResistanceProp
    ],
    compile(c, T, b) { compileSource(c, T, b, c.props.emf); },
    readings: sourceReadings,
    valueText: (c) => fmtSI(c.props.emf, 'V', 3, { trim: true }),
    help: 'A laboratory low-voltage DC supply. It has no current limit, so a short circuit is reported as an error.'
  });

  define('acsupply', {
    name: 'AC power supply', group: 'Sources', prefix: 'AC', category: 'ext', keywords: 'alternating sine mains signal generator',
    terminals: [{ id: 'p', name: 'Terminal 1 (reference +)' }, { id: 'n', name: 'Terminal 2' }],
    polarity: { p: '~', n: '~' },
    props: [
      { key: 'peak', label: 'Peak voltage', unit: 'V', kind: 'number', default: 5, min: 0, max: 30, step: 0.5, slider: true },
      { key: 'freq', label: 'Frequency', unit: 'Hz', kind: 'number', default: 1, min: 1, max: 1000, log: true, slider: true },
      internalResistanceProp
    ],
    compile(c, T, b) {
      const w = 2 * Math.PI * c.props.freq, V0 = c.props.peak;
      compileSource(c, T, b, (ctx) => V0 * Math.sin(w * ctx.t));
    },
    readings(c, r) {
      const out = sourceReadings(c, r);
      out.unshift({ key: 'rms', label: 'r.m.s. EMF', value: c.props.peak / Math.SQRT2, unit: 'V', static: true });
      out[1].label = 'Instantaneous p.d.';
      out[2].label = 'Instantaneous current';
      out[3].label = 'Instantaneous power';
      return out;
    },
    valueText: (c) => `${fmtSI(c.props.peak, 'V', 3, { trim: true })} pk, ${fmtSI(c.props.freq, 'Hz', 3, { trim: true })}`,
    timeStep: (c) => 1 / (c.props.freq * 100),
    acFrequency: (c) => c.props.freq,
    help: 'A sinusoidal supply, V = V₀ sin(2πft). Terminal 1 is positive during the first half-cycle. Use a slow frequency (about 1 Hz) to watch meters change, or the oscilloscope for faster signals.'
  });

  // ---------- Resistors ----------

  define('resistor', {
    name: 'Resistor', group: 'Resistors', prefix: 'R', keywords: 'ohm fixed resistance',
    terminals: [{ id: 'a', name: 'Terminal 1' }, { id: 'b', name: 'Terminal 2' }],
    props: [
      { key: 'R', label: 'Resistance', unit: 'Ω', kind: 'number', default: 100, min: 0.1, max: 10e6, log: true }
    ],
    compile(c, T, b) { b.R(T.a, T.b, c.props.R); },
    readings: (c, r) => twoTerminalReadings(c, r),
    valueText: (c) => fmtSI(c.props.R, 'Ω', 3, { trim: true }),
    help: 'An ohmic resistor: V = IR at any current. The color bands show its resistance; a value that bands cannot show exactly is drawn with the nearest code.'
  });

  define('rheostat', {
    name: 'Variable resistor', group: 'Resistors', prefix: 'VR', keywords: 'rheostat variable slider',
    terminals: [{ id: 'a', name: 'End terminal' }, { id: 'b', name: 'Slider terminal' }],
    props: [
      { key: 'Rmax', label: 'Maximum resistance', unit: 'Ω', kind: 'number', default: 50, min: 1, max: 1e6, log: true },
      { key: 'pos', label: 'Setting', unit: '%', kind: 'number', default: 50, min: 0, max: 100, step: 1, slider: true }
    ],
    compile(c, T, b) { b.R(T.a, T.b, c.props.Rmax * c.props.pos / 100); },
    readings(c, r) {
      const out = twoTerminalReadings(c, r);
      out.unshift({ key: 'R', label: 'Resistance', value: c.props.Rmax * c.props.pos / 100, unit: 'Ω', static: true });
      return out;
    },
    valueText: (c) => fmtSI(c.props.Rmax * c.props.pos / 100, 'Ω', 3, { trim: true }),
    actuator: { kind: 'slider', prop: 'pos', min: 0, max: 100 },
    help: 'A rheostat used as a two-terminal variable resistor. Its resistance is the setting × the maximum. At 0 % it is a zero-resistance connection.'
  });

  define('potentiometer', {
    name: 'Potentiometer', group: 'Resistors', prefix: 'VR', keywords: 'pot potential divider wiper three terminal',
    terminals: [{ id: 'a', name: 'End A' }, { id: 'w', name: 'Wiper W' }, { id: 'b', name: 'End B' }],
    props: [
      { key: 'R', label: 'Track resistance', unit: 'Ω', kind: 'number', default: 10e3, min: 10, max: 1e6, log: true },
      { key: 'pos', label: 'Wiper position (from A)', unit: '%', kind: 'number', default: 50, min: 0, max: 100, step: 1, slider: true }
    ],
    compile(c, T, b) {
      const x = c.props.pos / 100;
      b.R(T.a, T.w, c.props.R * x);
      b.R(T.w, T.b, c.props.R * (1 - x));
    },
    readings(c, r) {
      return [
        { key: 'vab', label: 'p.d. A to B', value: r.v('a', 'b'), unit: 'V' },
        { key: 'vwb', label: 'p.d. W to B', value: r.v('w', 'b'), unit: 'V' },
        { key: 'ia', label: 'Current into A', value: r.i('a'), unit: 'A' },
        { key: 'iw', label: 'Current into W', value: r.i('w'), unit: 'A' }
      ];
    },
    valueText: (c) => `${fmtSI(c.props.R, 'Ω', 3, { trim: true })}, ${Math.round(c.props.pos)} %`,
    actuator: { kind: 'slider', prop: 'pos', min: 0, max: 100 },
    help: 'A resistive track between A and B with a sliding contact W. R(A–W) = position × R and R(W–B) = (1 − position) × R, so it can act as a potential divider.'
  });

  // ---------- Lamps and switches ----------

  define('lamp', {
    name: 'Filament lamp', group: 'Lamps and switches', prefix: 'L', keywords: 'bulb light filament',
    terminals: [{ id: 'a', name: 'Terminal 1' }, { id: 'b', name: 'Terminal 2' }],
    props: [
      { key: 'ratedV', label: 'Rated voltage', unit: 'V', kind: 'number', default: 2.5, min: 0.5, max: 24, step: 0.5 },
      { key: 'ratedI', label: 'Rated current', unit: 'A', kind: 'number', default: 0.3, min: 0.01, max: 3, step: 0.01 }
    ],
    compile(c, T, b) {
      const model = lampModel(c.props.ratedV, c.props.ratedI);
      b.NL([T.a, T.b], model, 'lamp');
    },
    readings(c, r) {
      const out = twoTerminalReadings(c, r);
      const v = out[0].value, i = out[1].value;
      const p = lampParams(c.props.ratedV, c.props.ratedI);
      const T = Number.isFinite(v) ? lampTemperature(p, Math.abs(v)) : NaN;
      out.push({ key: 'R', label: 'Resistance now', value: Number.isFinite(T) ? lampR(p, T) : NaN, unit: 'Ω' });
      out.push({ key: 'T', label: 'Filament temperature', value: T, unit: 'K', sig: 2 });
      return out;
    },
    state(c, r) {
      const v = r.v('a', 'b');
      if (!Number.isFinite(v)) return { brightness: 0, T: LAMP_T0 };
      const p = lampParams(c.props.ratedV, c.props.ratedI);
      const T = lampTemperature(p, Math.abs(v));
      const b = Math.pow(Math.max(0, (T - 800) / (LAMP_TR - 800)), 2.2);
      return { brightness: b, T, P: v * v / lampR(p, T), ratedP: c.props.ratedV * c.props.ratedI };
    },
    warnings(c, r) {
      const s = this.state(c, r);
      if (s.P > 1.3 * s.ratedP) return [`${c.label} is above its rated power (${fmtSI(s.P, 'W')}); a real filament could blow.`];
      return [];
    },
    valueText: (c) => `${fmtSI(c.props.ratedV, 'V', 3, { trim: true })}, ${fmtSI(c.props.ratedI, 'A', 3, { trim: true })}`,
    help: 'Non-ohmic: the tungsten filament heats up as current flows, so its resistance rises (about 14× from cold to its rated point). Modeled with R ∝ T^1.2 and radiated power ∝ T⁴; the filament reaches its temperature instantly.'
  });

  define('switch', {
    name: 'Switch', group: 'Lamps and switches', prefix: 'S', keywords: 'on off toggle spst knife',
    terminals: [{ id: 'a', name: 'Terminal 1' }, { id: 'b', name: 'Terminal 2' }],
    props: [
      { key: 'closed', label: 'Closed', kind: 'bool', default: false, operational: true }
    ],
    compile(c, T, b) { if (c.props.closed) b.V(T.a, T.b, 0, { short: true }); },
    readings: (c, r) => twoTerminalReadings(c, r).filter((reading) => reading.key !== 'dir'),
    valueText: (c) => (c.props.closed ? 'closed' : 'open'),
    actuator: { kind: 'toggle', prop: 'closed' },
    help: 'An on/off switch. Closed, it is a perfect conductor (0 Ω); open, no current can flow. Click or tap the lever to operate it.'
  });

  define('pushswitch', {
    name: 'Push switch', group: 'Lamps and switches', prefix: 'S', keywords: 'button momentary push to make',
    terminals: [{ id: 'a', name: 'Terminal 1' }, { id: 'b', name: 'Terminal 2' }],
    props: [],
    compile(c, T, b, ctx) { if (ctx.pressed[c.id]) b.V(T.a, T.b, 0, { short: true }); },
    readings: (c, r) => twoTerminalReadings(c, r),
    valueText: () => '',
    actuator: { kind: 'momentary' },
    help: 'Push-to-make: it conducts only while you hold the button down (press and hold, or press Space+Enter while it is selected).'
  });

  define('switch2', {
    name: 'Two-way switch', group: 'Lamps and switches', prefix: 'S', category: 'ext', keywords: 'spdt changeover selector',
    terminals: [{ id: 'c', name: 'Common' }, { id: 'a', name: 'Contact A' }, { id: 'b', name: 'Contact B' }],
    props: [
      { key: 'toB', label: 'Connected to B', kind: 'bool', default: false, operational: true }
    ],
    compile(c, T, b) { b.V(T.c, c.props.toB ? T.b : T.a, 0, { short: true }); },
    readings(c, r) {
      const t = c.props.toB ? 'b' : 'a';
      return [{ key: 'i', label: `Current, common to ${t.toUpperCase()}`, value: r.i('c'), unit: 'A' }];
    },
    valueText: (c) => (c.props.toB ? 'to B' : 'to A'),
    actuator: { kind: 'toggle', prop: 'toB' },
    help: 'A changeover switch: the common terminal connects to contact A or contact B. Useful for charging then discharging a capacitor.'
  });

  // ---------- Fuse, motor and loudspeaker ----------

  const FUSE_R = 0.01; // a fuse wire's resistance is tiny next to everything else
  define('fuse', {
    name: 'Fuse', group: 'Lamps and switches', prefix: 'F', keywords: 'fuse protection rating blow cartridge',
    terminals: [{ id: 'a', name: 'Terminal 1' }, { id: 'b', name: 'Terminal 2' }],
    props: [
      { key: 'rating', label: 'Current rating', unit: 'A', kind: 'number', default: 1, min: 0.05, max: 13, log: true },
      { key: 'blown', label: 'Blown', kind: 'bool', default: false, operational: true, help: 'Switch off to fit a new fuse.' }
    ],
    compile(c, T, b) { if (!c.props.blown) b.R(T.a, T.b, FUSE_R); },
    readings(c, r) {
      const out = twoTerminalReadings(c, r);
      out.unshift({ key: 'state', label: 'Fuse wire', text: c.props.blown ? 'melted (open circuit)' : 'intact' });
      return out;
    },
    // Checked after every solve: a current above the rating melts the wire.
    blows: (c, r) => !c.props.blown && Math.abs(r.i('a')) > c.props.rating,
    valueText: (c) => `${fmtSI(c.props.rating, 'A', 3, { trim: true })}${c.props.blown ? ', blown' : ''}`,
    help: `A thin wire (${FUSE_R} Ω) that melts when the current is above its rating, which breaks the circuit. Here it blows as soon as the current goes over the rating; real fuses take a moment, longer for a small overload. Switch off “Blown” to fit a new fuse.`
  });

  define('motor', {
    name: 'Motor', group: 'Output devices', prefix: 'M', keywords: 'dc motor spin rotate electric',
    terminals: [{ id: 'a', name: 'Terminal 1' }, { id: 'b', name: 'Terminal 2' }],
    props: [
      { key: 'R', label: 'Coil resistance', unit: 'Ω', kind: 'number', default: 5, min: 0.5, max: 1000, log: true },
      { key: 'fullI', label: 'Current at full speed', unit: 'A', kind: 'number', default: 0.5, min: 0.01, max: 5, log: true }
    ],
    compile(c, T, b) { b.R(T.a, T.b, c.props.R); },
    readings(c, r) {
      const out = twoTerminalReadings(c, r);
      const s = this.state(c, r);
      out.push({ key: 'turn', label: 'Rotor', text: s.speed < 0.02 ? 'not turning' : `turning ${s.dir > 0 ? 'clockwise' : 'counterclockwise'}` });
      return out;
    },
    state(c, r) {
      const i = r.i('a');
      if (!Number.isFinite(i)) return { speed: 0, dir: 1 };
      return { speed: Math.min(1.5, Math.abs(i) / c.props.fullI), dir: i >= 0 ? 1 : -1 };
    },
    valueText: (c) => fmtSI(c.props.R, 'Ω', 3, { trim: true }),
    help: 'A DC motor, modeled as its coil resistance (as if it turns at a steady speed under a steady load). The rotor turns faster with more current and turns the other way when the current reverses. The back emf of a real spinning motor is not modeled.'
  });

  define('speaker', {
    name: 'Loudspeaker', group: 'Output devices', prefix: 'LS', keywords: 'loudspeaker speaker sound audio',
    terminals: [{ id: 'a', name: 'Terminal 1' }, { id: 'b', name: 'Terminal 2' }],
    props: [
      { key: 'R', label: 'Resistance', unit: 'Ω', kind: 'number', default: 8, min: 2, max: 64, step: 1 },
      { key: 'sound', label: 'Play sound', kind: 'bool', default: true, operational: true,
        help: 'Plays a sine tone at the connected AC supply’s frequency while time runs. Volume follows the changing current. Frequencies below 20 Hz stay silent.' }
    ],
    compile(c, T, b) { b.R(T.a, T.b, c.props.R); },
    readings: (c, r) => twoTerminalReadings(c, r),
    state(c, r) {
      const i = r.i('a');
      return { i: Number.isFinite(i) ? i : 0 };
    },
    valueText: (c) => fmtSI(c.props.R, 'Ω', 3, { trim: true }),
    help: 'Modeled as its coil resistance (8 Ω is typical). It makes a sound only when the current changes, for example from an AC supply with time running. A steady direct current just holds the cone pushed out or pulled in, which you cannot hear. While time runs, it plays a sine tone at the frequency of the AC supply in its electrical network; volume follows the changing current. Frequencies below 20 Hz stay silent. Turn off Play sound to mute it.'
  });

  // ---------- Meters ----------

  const meterModeProp = {
    key: 'mode', label: 'Display', kind: 'select', default: 'dc',
    options: [{ value: 'dc', label: 'DC (average)' }, { value: 'ac', label: 'AC (r.m.s.)' }],
    help: 'With no AC source the meter shows the instantaneous value. With an AC source it averages over one cycle of the lowest frequency.'
  };

  const plotProp = { key: 'plot', label: 'Plot on graph', kind: 'bool', default: false, operational: true };

  define('ammeter', {
    name: 'Ammeter', group: 'Meters', prefix: 'A', keywords: 'current meter amps',
    terminals: [{ id: 'p', name: 'Positive (+, red)' }, { id: 'n', name: 'Negative (−, black)' }],
    polarity: { p: '+', n: '−' },
    props: [
      { key: 'rin', label: 'Resistance', kind: 'select', default: 'ideal',
        options: [{ value: 'ideal', label: 'Ideal (0 Ω)' }, { value: '0.01', label: '0.01 Ω' }, { value: '0.1', label: '0.1 Ω' }, { value: '1', label: '1 Ω' }] },
      meterModeProp, plotProp
    ],
    compile(c, T, b) {
      if (c.props.rin === 'ideal') b.V(T.p, T.n, 0, { meter: true });
      else b.R(T.p, T.n, Number(c.props.rin));
    },
    meter: { quantity: 'I', unit: 'A', floor: 1e-7, value: (r) => r.i('p') },
    readings: (c, r) => [{ key: 'i', label: 'Current (+ to −)', value: r.i('p'), unit: 'A' }],
    valueText: () => '',
    help: 'Connect in series. The reading is positive when conventional current enters the red (+) terminal. An ideal ammeter has zero resistance, so connecting it across a source is a short circuit.'
  });

  define('voltmeter', {
    name: 'Voltmeter', group: 'Meters', prefix: 'V', keywords: 'potential difference meter volts',
    terminals: [{ id: 'p', name: 'Positive (+, red)' }, { id: 'n', name: 'Negative (−, black)' }],
    polarity: { p: '+', n: '−' },
    props: [
      { key: 'rin', label: 'Resistance', kind: 'select', default: 'ideal',
        options: [{ value: 'ideal', label: 'Ideal (∞ Ω)' }, { value: '1e7', label: '10 MΩ (digital)' }, { value: '1e5', label: '100 kΩ' }, { value: '1e4', label: '10 kΩ (analog)' }] },
      meterModeProp, plotProp
    ],
    compile(c, T, b) { if (c.props.rin !== 'ideal') b.R(T.p, T.n, Number(c.props.rin)); },
    meter: { quantity: 'V', unit: 'V', floor: 1e-4, value: (r) => r.v('p', 'n') },
    readings: (c, r) => [{ key: 'v', label: 'p.d. (+ minus −)', value: r.v('p', 'n'), unit: 'V' }],
    valueText: () => '',
    help: 'Connect in parallel, across the component. It reads V(+) − V(−). An ideal voltmeter draws no current; if its terminals are in separate circuits the reading is undefined.'
  });

  define('scope', {
    name: 'Oscilloscope', group: 'Meters', prefix: 'OS', category: 'ext', keywords: 'cro graph trace waveform',
    terminals: [{ id: 'ch1', name: 'Channel 1 input' }, { id: 'ch2', name: 'Channel 2 input' }, { id: 'com', name: 'Common (0 V)' }],
    props: [
      { key: 'autoScale', label: 'Auto scale', kind: 'bool', default: true, operational: true },
      { key: 'autoTime', label: 'Auto time base', kind: 'bool', default: true, operational: true },
      { key: 'tdiv', label: 'Time per division', unit: 's', kind: 'select', default: '0.5',
        options: ['0.0001', '0.0002', '0.0005', '0.001', '0.002', '0.005', '0.01', '0.02', '0.05', '0.1', '0.2', '0.5', '1', '2', '5'].map((v) => ({ value: v, label: fmtSI(Number(v), 's', 3, { trim: true }) + '/div' })) },
      { key: 'v1', label: 'CH1 volts per division', unit: 'V', kind: 'select', default: '1',
        options: ['0.1', '0.2', '0.5', '1', '2', '5', '10'].map((v) => ({ value: v, label: fmtSI(Number(v), 'V', 3, { trim: true }) + '/div' })) },
      { key: 'v2', label: 'CH2 volts per division', unit: 'V', kind: 'select', default: '1',
        options: ['0.1', '0.2', '0.5', '1', '2', '5', '10'].map((v) => ({ value: v, label: fmtSI(Number(v), 'V', 3, { trim: true }) + '/div' })) }
    ],
    compile() {},
    channels: [
      { key: 'ch1', label: 'CH1', unit: 'V', value: (r) => r.v('ch1', 'com') },
      { key: 'ch2', label: 'CH2', unit: 'V', value: (r) => r.v('ch2', 'com') }
    ],
    readings: (c, r) => [
      { key: 'ch1', label: 'CH1 (to COM)', value: r.v('ch1', 'com'), unit: 'V' },
      { key: 'ch2', label: 'CH2 (to COM)', value: r.v('ch2', 'com'), unit: 'V' }
    ],
    valueText: () => '',
    help: 'Plots the p.d. of each channel relative to COM against time while the simulation runs. Inputs draw no current. Auto time base shows a few cycles of the connected AC supply; turn it off to use the saved time per division. Auto scale adjusts only the vertical axis. The trace comes from the solver and is cleared by Reset or circuit changes.'
  });

  // ---------- Semiconductors ----------

  define('diode', {
    name: 'Diode', group: 'Diodes', prefix: 'D', keywords: 'rectifier silicon pn',
    terminals: [{ id: 'a', name: 'Anode (+)' }, { id: 'k', name: 'Cathode (−, band)' }],
    polarity: { a: 'A', k: 'K' },
    props: [],
    compile(c, T, b) {
      const m = b.node();
      b.R(T.a, m, 0.1);
      b.NL([m, T.k], junctionModel(2.5e-9, 1.75), 'diode');
    },
    readings: (c, r) => twoTerminalReadings(c, r, 'a', 'k', { v: 'p.d. anode to cathode', i: 'Forward current', signed: true }),
    warnings(c, r) {
      const i = r.i('a');
      if (i > 1.5) return [`${c.label} carries ${fmtSI(i, 'A')}; a real 1 A diode would overheat.`];
      return [];
    },
    valueText: () => '',
    help: 'A silicon diode (Shockley model with 0.1 Ω series resistance). It conducts when the anode is about 0.6–0.7 V above the cathode; reverse current is negligible. Reverse breakdown is not modeled.'
  });

  const LED_COLORS = {
    red: { vf: 1.9, label: 'Red', color: '#FF2A1F' },
    yellow: { vf: 2.05, label: 'Yellow', color: '#FFD21F' },
    green: { vf: 2.1, label: 'Green', color: '#2EE05A' },
    blue: { vf: 3.0, label: 'Blue', color: '#2F7BFF' },
    white: { vf: 3.1, label: 'White', color: '#F4F7FF' }
  };
  const LED_N = 2, LED_RS = 5, LED_IREF = 0.02, LED_IMAX = 0.03;
  function ledIs(color) {
    const vf = (LED_COLORS[color] || LED_COLORS.red).vf;
    return LED_IREF / Math.exp((vf - LED_IREF * LED_RS) / (LED_N * VT));
  }

  define('led', {
    name: 'LED', group: 'Diodes', prefix: 'LED', keywords: 'light emitting diode',
    terminals: [{ id: 'a', name: 'Anode (+, long leg)' }, { id: 'k', name: 'Cathode (−, flat side)' }],
    polarity: { a: 'A', k: 'K' },
    props: [
      { key: 'color', label: 'Color', kind: 'select', default: 'red',
        options: Object.entries(LED_COLORS).map(([value, v]) => ({ value, label: `${v.label} (about ${v.vf} V)` })) }
    ],
    colors: LED_COLORS,
    compile(c, T, b) {
      const m = b.node();
      b.R(T.a, m, LED_RS);
      b.NL([m, T.k], junctionModel(ledIs(c.props.color), LED_N), 'led');
    },
    readings: (c, r) => twoTerminalReadings(c, r, 'a', 'k', { v: 'p.d. anode to cathode', i: 'Forward current', signed: true }),
    state(c, r) {
      const i = r.i('a');
      return { brightness: Number.isFinite(i) ? Math.max(0, Math.min(1.4, i / LED_IREF)) : 0, over: i > LED_IMAX };
    },
    warnings(c, r) {
      const i = r.i('a'), v = r.v('a', 'k');
      const out = [];
      if (i > LED_IMAX) out.push(`${c.label} carries ${fmtSI(i, 'A')}, more than its 30 mA maximum; add or increase a series resistor.`);
      if (v < -5) out.push(`${c.label} is reverse biased by ${fmtSI(-v, 'V')}; real LEDs can be damaged above about 5 V.`);
      return out;
    },
    valueText: (c) => (LED_COLORS[c.props.color] || LED_COLORS.red).label.toLowerCase(),
    help: 'A light-emitting diode (Shockley model, 5 Ω series resistance). It lights when forward biased above its threshold (about 1.9 V for red, 3 V for blue). Brightness follows the current; the rated current is 20 mA, maximum 30 mA.'
  });

  // ---------- Sensors ----------

  define('thermistor', {
    name: 'Thermistor (NTC)', group: 'Sensors', prefix: 'TH', keywords: 'temperature sensor ntc',
    terminals: [{ id: 'a', name: 'Terminal 1' }, { id: 'b', name: 'Terminal 2' }],
    props: [
      { key: 'temp', label: 'Temperature', unit: '°C', kind: 'number', default: 25, min: -20, max: 120, step: 1, slider: true },
      { key: 'R25', label: 'Resistance at 25 °C', unit: 'Ω', kind: 'number', default: 10e3, min: 100, max: 1e6, log: true },
      { key: 'B', label: 'B constant', unit: 'K', kind: 'number', default: 3950, min: 1000, max: 6000, step: 50 }
    ],
    compile(c, T, b) { b.R(T.a, T.b, thermistorR(c.props.R25, c.props.B, c.props.temp)); },
    readings(c, r) {
      const out = twoTerminalReadings(c, r);
      out.unshift({ key: 'R', label: 'Resistance', value: thermistorR(c.props.R25, c.props.B, c.props.temp), unit: 'Ω', static: true });
      return out;
    },
    valueText: (c) => `${Math.round(c.props.temp)} °C`,
    help: 'Negative temperature coefficient: resistance falls as temperature rises, R = R₂₅ exp[B(1/T − 1/298 K)]. Self-heating is ignored.'
  });

  define('ldr', {
    name: 'LDR', group: 'Sensors', prefix: 'LDR', keywords: 'light dependent resistor photoresistor sensor',
    terminals: [{ id: 'a', name: 'Terminal 1' }, { id: 'b', name: 'Terminal 2' }],
    props: [
      { key: 'lux', label: 'Illumination', unit: 'lx', kind: 'number', default: 300, min: 0, max: 10000, log: true, logMin: 0.1, slider: true },
      { key: 'R10', label: 'Resistance at 10 lx', unit: 'Ω', kind: 'number', default: 20e3, min: 1e3, max: 1e6, log: true }
    ],
    compile(c, T, b) { b.R(T.a, T.b, ldrR(c.props.R10, c.props.lux)); },
    readings(c, r) {
      const out = twoTerminalReadings(c, r);
      out.unshift({ key: 'R', label: 'Resistance', value: ldrR(c.props.R10, c.props.lux), unit: 'Ω', static: true });
      return out;
    },
    valueText: (c) => fmtSI(c.props.lux, 'lx', 2, { trim: true }),
    help: 'Light-dependent resistor: resistance falls as illumination rises, with conductance ∝ (illumination)^0.7 and a 1 MΩ dark resistance. Typical values: 1 lx dark room, 300 lx classroom, 10 000 lx daylight.'
  });

  // ---------- Capacitors ----------

  function capacitorDef(polarized) {
    return {
      name: polarized ? 'Electrolytic capacitor' : 'Capacitor', group: 'Capacitors', prefix: 'C', category: 'ext',
      keywords: polarized ? 'electrolytic polarised polarized capacitance farad' : 'ceramic film capacitance farad',
      terminals: polarized
        ? [{ id: 'p', name: 'Positive (+)' }, { id: 'n', name: 'Negative (−, stripe)' }]
        : [{ id: 'p', name: 'Terminal 1' }, { id: 'n', name: 'Terminal 2' }],
      polarity: polarized ? { p: '+', n: '−' } : null,
      props: [
        { key: 'C', label: 'Capacitance', unit: 'F', kind: 'number', default: polarized ? 1000e-6 : 100e-9, min: 1e-12, max: 1, log: true },
        { key: 'v0', label: 'Initial p.d.', unit: 'V', kind: 'number', default: 0, min: -50, max: 50, step: 0.1,
          help: 'The p.d. at t = 0 after Reset or loading.' }
      ].concat(polarized ? [{ key: 'vmax', label: 'Voltage rating', unit: 'V', kind: 'number', default: 25, min: 1, max: 100, step: 1 }] : []),
      compile(c, T, b) { b.C(T.p, T.n, c.props.C, c.props.v0); },
      readings(c, r) {
        const v = r.v('p', 'n');
        return [
          { key: 'v', label: 'p.d. (+ to −)', value: v, unit: 'V' },
          { key: 'q', label: 'Charge', value: Number.isFinite(v) ? c.props.C * v : NaN, unit: 'C' },
          { key: 'i', label: 'Current into +', value: r.i('p'), unit: 'A' },
          { key: 'e', label: 'Energy stored', value: Number.isFinite(v) ? 0.5 * c.props.C * v * v : NaN, unit: 'J' }
        ];
      },
      warnings(c, r) {
        if (!polarized) return [];
        const v = r.v('p', 'n'), out = [];
        if (v < -0.5) out.push(`${c.label} is reverse biased; a real electrolytic capacitor can be damaged.`);
        if (v > c.props.vmax) out.push(`${c.label} is above its ${fmtSI(c.props.vmax, 'V')} rating.`);
        return out;
      },
      timeConstantHint: true,
      valueText: (c) => fmtSI(c.props.C, 'F', 3, { trim: true }),
      help: (polarized ? 'Polarized: keep the + terminal at the higher potential. ' : '') +
        'An ideal capacitor, I = C dV/dt, solved step by step (second-order backward differentiation). Its p.d. is kept when you edit the circuit and is reset to the initial p.d. by Reset.'
    };
  }
  define('capacitor', capacitorDef(false));
  define('ecap', capacitorDef(true));

  // ---------- Transistors ----------

  function bjtDef(pol) {
    const npn = pol > 0;
    return {
      name: npn ? 'NPN transistor' : 'PNP transistor', group: 'Transistors', prefix: 'Q', category: 'ext',
      keywords: 'bipolar bjt transistor switch amplifier ' + (npn ? 'npn' : 'pnp'),
      terminals: [{ id: 'c', name: 'Collector (C)' }, { id: 'b', name: 'Base (B)' }, { id: 'e', name: 'Emitter (E)' }],
      polarity: { c: 'C', b: 'B', e: 'E' },
      props: [
        { key: 'beta', label: 'Current gain hFE', kind: 'number', default: 100, min: 10, max: 1000, step: 10 },
        { key: 'pinout', label: 'Leg order (flat face)', kind: 'select', default: 'ebc',
          options: [{ value: 'ebc', label: 'E B C (2N3904/2N3906 style)' }, { value: 'cbe', label: 'C B E (BC547/BC557 style)' }],
          help: 'Packages differ, so always check the leg labels. Changing this keeps every wire on the same electrical terminal.' }
      ],
      compile(c, T, b) {
        const bi = b.node();
        b.R(T.b, bi, 10);
        b.NL([bi, T.c, T.e], bjtModel(pol, c.props.beta), 'bjt');
      },
      readings(c, r) {
        const s = pol;
        const ib = s * r.i('b'), ic = s * r.i('c');
        const vbe = s * r.v('b', 'e'), vce = s * r.v('c', 'e');
        return [
          { key: 'ib', label: npn ? 'Base current (in)' : 'Base current (out)', value: ib, unit: 'A' },
          { key: 'ic', label: npn ? 'Collector current (in)' : 'Collector current (out)', value: ic, unit: 'A' },
          { key: 'vbe', label: npn ? 'V(BE)' : 'V(EB)', value: vbe, unit: 'V' },
          { key: 'vce', label: npn ? 'V(CE)' : 'V(EC)', value: vce, unit: 'V' },
          { key: 'region', label: 'Region', text: region(vbe, vce, ib, ic) }
        ];
      },
      state(c, r) {
        const s = pol;
        return { region: region(s * r.v('b', 'e'), s * r.v('c', 'e'), s * r.i('b'), s * r.i('c')) };
      },
      warnings(c, r) {
        const ic = pol * r.i('c'), ib = pol * r.i('b');
        const out = [];
        if (ic > 0.8) out.push(`${c.label} collector current is ${fmtSI(ic, 'A')}; a small-signal transistor would be destroyed.`);
        if (ib > 0.05) out.push(`${c.label} base current is ${fmtSI(ib, 'A')}; add a base resistor.`);
        return out;
      },
      valueText: (c) => `hFE ${c.props.beta}`,
      help: (npn
        ? 'NPN: a small current into the base (V(BE) ≈ 0.65 V) lets a current about hFE times larger flow from collector to emitter. '
        : 'PNP: a small current out of the base (base about 0.65 V below the emitter) lets a larger current flow from emitter to collector. ') +
        'Ebers–Moll model with 10 Ω base resistance: cut-off, active (amplifying) and saturated (switch fully on) regions. No Early effect or capacitance.'
    };
  }
  function region(vbe, vce, ib, ic) {
    if (!Number.isFinite(vbe)) return '—';
    if (vbe < 0.5 || ib < 1e-7) return 'Cut-off (off)';
    if (vce < 0.25) return 'Saturated (fully on)';
    return 'Active (amplifying)';
  }
  define('npn', bjtDef(1));
  define('pnp', bjtDef(-1));

  // ---------- Logic modules ----------
  // Educational logic modules share a hidden 5 V supply whose 0 V rail is the node
  // 'LG'. Inputs have 100 kΩ pull-downs to 0 V and Schmitt thresholds; outputs are
  // 5 V or 0 V behind 50 Ω.

  const GATES = {
    and: { name: 'AND gate', fn: (a, b) => a && b, iec: '&' },
    or: { name: 'OR gate', fn: (a, b) => a || b, iec: '≥1' },
    not: { name: 'NOT gate', fn: (a) => !a, iec: '1', single: true },
    nand: { name: 'NAND gate', fn: (a, b) => !(a && b), iec: '&', inv: true },
    nor: { name: 'NOR gate', fn: (a, b) => !(a || b), iec: '≥1', inv: true },
    xor: { name: 'XOR gate', fn: (a, b) => a !== b, iec: '=1' },
    xnor: { name: 'XNOR gate', fn: (a, b) => a === b, iec: '=1', inv: true }
  };

  function logicInputReadings(c, r, ids) {
    return ids.map((id) => ({ key: 'v' + id, label: `Input ${id.toUpperCase()} (to 0 V)`, value: r.vg(id), unit: 'V', logic: r.logicIn(id) }));
  }

  for (const [key, g] of Object.entries(GATES)) {
    const inputs = g.single ? ['a'] : ['a', 'b'];
    define('gate_' + key, {
      name: g.name, group: 'Logic', prefix: 'G', category: 'ext', keywords: 'logic gate digital boolean ' + key,
      terminals: inputs.map((id) => ({ id, name: `Input ${id.toUpperCase()}`, logic: 'in' })).concat([{ id: 'q', name: 'Output Q', logic: 'out' }]),
      props: [],
      gate: { key, ...g, inputs },
      logic: {
        inputs,
        outputs: ['q'],
        eval: (inp) => ({ q: g.single ? g.fn(inp.a) : g.fn(inp.a, inp.b) })
      },
      compile(c, T, b) {
        for (const id of inputs) b.logicIn(T[id], id);
        b.logicOut(T.q, 'q');
      },
      readings(c, r) {
        return logicInputReadings(c, r, inputs).concat([{ key: 'vq', label: 'Output Q (to 0 V)', value: r.vg('q'), unit: 'V', logic: r.logicOut('q') }]);
      },
      valueText: () => '',
      help: `${g.name}: Q = ${truthExpr(key)}. Logic modules run from a shared 5 V supply. Inputs read HIGH above 3.0 V and LOW below 2.0 V (keeping their last state in between), and an unconnected input is pulled LOW. Outputs switch instantly.`
    });
  }

  function truthExpr(key) {
    return { and: 'A AND B', or: 'A OR B', not: 'NOT A', nand: 'NOT (A AND B)', nor: 'NOT (A OR B)', xor: 'A XOR B (one or the other)', xnor: 'NOT (A XOR B)' }[key];
  }

  define('logic_in', {
    name: 'Logic input switch', group: 'Logic', prefix: 'IN', category: 'ext', keywords: 'logic input toggle high low digital',
    terminals: [{ id: 'q', name: 'Output', logic: 'out' }],
    props: [{ key: 'high', label: 'Output HIGH', kind: 'bool', default: false, operational: true }],
    logic: { inputs: [], outputs: ['q'], eval: (inp, c) => ({ q: !!c.props.high }) },
    compile(c, T, b) { b.logicOut(T.q, 'q'); },
    readings: (c, r) => [{ key: 'vq', label: 'Output (to 0 V)', value: r.vg('q'), unit: 'V', logic: r.logicOut('q') }],
    valueText: (c) => (c.props.high ? '1' : '0'),
    actuator: { kind: 'toggle', prop: 'high' },
    help: 'Sets a logic level: HIGH (1) gives 5 V and LOW (0) gives 0 V, relative to the shared logic 0 V rail. Click or tap the switch to change it.'
  });

  define('logic_out', {
    name: 'Logic indicator', group: 'Logic', prefix: 'OUT', category: 'ext', keywords: 'logic output probe led digital',
    terminals: [{ id: 'a', name: 'Input', logic: 'in' }],
    props: [],
    logic: { inputs: ['a'], outputs: [], eval: () => ({}) },
    compile(c, T, b) { b.logicIn(T.a, 'a'); },
    readings: (c, r) => logicInputReadings(c, r, ['a']),
    valueText: () => '',
    help: 'Shows the logic level at its input: lit for HIGH (1), dark for LOW (0). It uses the same thresholds as gate inputs.'
  });

  define('rail_0v', {
    name: '0 V rail', group: 'Logic', prefix: 'GND', category: 'ext', keywords: 'ground earth common 0v logic supply',
    terminals: [{ id: 't', name: '0 V', global: 'LG' }],
    props: [],
    compile() {},
    readings: () => [],
    valueText: () => '',
    hiddenLabel: true,
    help: 'Connects to the 0 V rail of the logic modules\' shared 5 V supply. Use it to give an analog circuit (a battery circuit, an LED) a common reference with the logic.'
  });

  define('rail_5v', {
    name: '+5 V rail', group: 'Logic', prefix: 'VCC', category: 'ext', keywords: 'supply vcc 5v logic power',
    terminals: [{ id: 't', name: '+5 V', global: 'VCC' }],
    props: [],
    compile() {},
    readings: () => [],
    valueText: () => '',
    hiddenLabel: true,
    help: 'The +5 V rail of the logic modules\' shared supply, an ideal 5 V source relative to the 0 V rail. Use it to power sensors or LEDs alongside logic.'
  });

  // ---------- Wiring ----------

  define('junction', {
    name: 'Junction', group: 'Wiring', prefix: 'J', keywords: 'node connection join branch dot',
    terminals: [{ id: 'j', name: 'Junction', multi: true }],
    props: [],
    compile() {},
    readings: () => [],
    valueText: () => '',
    hiddenLabel: true,
    help: 'A connection point. Every wire attached to a junction is joined. In the circuit diagram a dot marks junctions where three or more wires meet.'
  });

  function get(type) { return types[type]; }
  function defaultProps(type) {
    const out = {};
    for (const p of types[type].props) out[p.key] = p.default;
    return out;
  }

  const api = {
    types, order, get, defaultProps, LOGIC, VT,
    models: { junctionModel, bjtModel, lampModel, lampParams, lampTemperature, lampR, thermistorR, ldrR, ledIs, pnjlim },
    GATES, LED_COLORS
  };
  PPC.registry = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof globalThis === 'object' ? globalThis : this);
