// Run with: node --test tools/panphycircuits/tests/*.test.cjs
// Solver checks against independently calculated results.
const test = require('node:test');
const assert = require('node:assert/strict');
require('../js/units.js');
const registry = require('../js/registry.js');
const circuit = require('../js/circuit.js');
const solver = require('../js/solver.js');

function build(spec) {
  // spec.comps: { label: [type, props] }, spec.wires: [['L.t', 'L.t'], ...]
  const doc = circuit.createDoc();
  const ids = {};
  for (const [label, [type, props]] of Object.entries(spec.comps)) {
    ids[label] = circuit.addComponent(doc, type, { label, props }).id;
  }
  for (const [from, to] of spec.wires) {
    const [la, ta] = from.split('.'), [lb, tb] = to.split('.');
    const r = circuit.addWire(doc, { c: ids[la], t: ta }, { c: ids[lb], t: tb });
    assert.ok(r.wire, r.error);
  }
  const sim = solver.createSim();
  sim.setDoc(doc);
  const read = (label) => solver.reader(sim.result, circuit.getComp(doc, ids[label]));
  return { doc, sim, ids, read, result: () => sim.result };
}

const close = (actual, expected, tol = 1e-6, msg) => {
  assert.ok(Math.abs(actual - expected) <= tol * Math.max(1, Math.abs(expected)), `${msg || ''} expected ${expected}, got ${actual}`);
};

test('single resistor across a DC source obeys V = IR', () => {
  const c = build({
    comps: { B1: ['battery', { emf: 6 }], R1: ['resistor', { R: 120 }], A1: ['ammeter'] },
    wires: [['B1.p', 'A1.p'], ['A1.n', 'R1.a'], ['R1.b', 'B1.n']]
  });
  assert.ok(c.result().ok);
  close(c.read('A1').i('p'), 0.05);
  close(c.read('R1').v('a', 'b'), 6);
  close(c.read('B1').i('p'), -0.05, 1e-6, 'current enters the + terminal negatively');
});

test('series and parallel networks', () => {
  // 12 V across 100 Ω in series with (200 Ω ∥ 300 Ω = 120 Ω): I = 12/220.
  const c = build({
    comps: { B1: ['battery', { emf: 12 }], R1: ['resistor', { R: 100 }], R2: ['resistor', { R: 200 }], R3: ['resistor', { R: 300 }], V1: ['voltmeter'] },
    wires: [['B1.p', 'R1.a'], ['R1.b', 'R2.a'], ['R1.b', 'R3.a'], ['R2.b', 'B1.n'], ['R3.b', 'B1.n'], ['V1.p', 'R2.a'], ['V1.n', 'R2.b']]
  });
  const I = 12 / 220;
  close(c.read('R1').i('a'), I);
  close(c.read('R2').i('a'), I * 300 / 500);
  close(c.read('R3').i('a'), I * 200 / 500);
  close(c.read('V1').v('p', 'n'), I * 120);
});

test('unbalanced Wheatstone bridge (multi-loop) matches hand calculation', () => {
  // 10 V; R1=100 (top-left), R2=200 (top-right), R3=300 (bottom-left), R4=400, galvanometer R5=50.
  const c = build({
    comps: {
      B1: ['dcsupply', { emf: 10 }], R1: ['resistor', { R: 100 }], R2: ['resistor', { R: 200 }],
      R3: ['resistor', { R: 300 }], R4: ['resistor', { R: 400 }], R5: ['resistor', { R: 50 }]
    },
    wires: [['B1.p', 'R1.a'], ['B1.p', 'R2.a'], ['R1.b', 'R3.a'], ['R2.b', 'R4.a'], ['R3.b', 'B1.n'], ['R4.b', 'B1.n'], ['R1.b', 'R5.a'], ['R5.b', 'R2.b']]
  });
  // Nodal: node x (R1/R3), y (R2/R4), top = 10, bottom = 0.
  // (10-x)/100 = x/300 + (x-y)/50 ; (10-y)/200 + (x-y)/50 = y/400
  const A = [[1 / 100 + 1 / 300 + 1 / 50, -1 / 50], [-1 / 50, 1 / 200 + 1 / 50 + 1 / 400]];
  const z = [10 / 100, 10 / 200];
  const det = A[0][0] * A[1][1] - A[0][1] * A[1][0];
  const x = (z[0] * A[1][1] - A[0][1] * z[1]) / det;
  const y = (A[0][0] * z[1] - z[0] * A[1][0]) / det;
  close(c.read('R5').i('a'), (x - y) / 50);
  close(c.read('R3').v('a', 'b'), x);
  // Kirchhoff's current law at the supply.
  const total = c.read('R1').i('a') + c.read('R2').i('a');
  close(-c.read('B1').i('p'), total);
});

test('open and closed switches', () => {
  const c = build({
    comps: { B1: ['cell', { emf: 1.5 }], S1: ['switch', { closed: false }], R1: ['resistor', { R: 10 }], V1: ['voltmeter'] },
    wires: [['B1.p', 'S1.a'], ['S1.b', 'R1.a'], ['R1.b', 'B1.n'], ['V1.p', 'S1.a'], ['V1.n', 'S1.b']]
  });
  close(c.read('R1').i('a'), 0);
  close(c.read('V1').v('p', 'n'), 1.5, 1e-6, 'full EMF across an open switch');
  circuit.getComp(c.doc, c.ids.S1).props.closed = true;
  c.sim.setDoc(c.doc);
  close(c.read('R1').i('a'), 0.15);
  close(c.read('V1').v('p', 'n'), 0);
});

test('reversed source and meter polarity give signed readings', () => {
  const c = build({
    comps: { B1: ['battery', { emf: 6 }], R1: ['resistor', { R: 60 }], A1: ['ammeter'], V1: ['voltmeter'] },
    // Ammeter's black terminal faces the + of the battery: negative reading.
    wires: [['B1.p', 'A1.n'], ['A1.p', 'R1.a'], ['R1.b', 'B1.n'], ['V1.n', 'R1.a'], ['V1.p', 'R1.b']]
  });
  close(c.read('A1').i('p'), -0.1);
  close(c.read('V1').v('p', 'n'), -6);
});

test('internal resistance: terminal p.d. = EMF − Ir', () => {
  const c = build({
    comps: { B1: ['battery', { emf: 9, r: 1 }], R1: ['resistor', { R: 8 }] },
    wires: [['B1.p', 'R1.a'], ['R1.b', 'B1.n']]
  });
  close(c.read('R1').i('a'), 1);
  close(c.read('B1').v('p', 'n'), 8);
});

test('short circuit across an ideal cell is reported, not solved', () => {
  const c = build({
    comps: { B1: ['cell', { emf: 1.5 }], A1: ['ammeter'], R1: ['resistor', { R: 10 }] },
    wires: [['B1.p', 'A1.p'], ['A1.n', 'B1.n'], ['B1.p', 'R1.a'], ['R1.b', 'B1.n']]
  });
  const r = c.result();
  assert.equal(r.ok, false);
  assert.match(r.errors[0].msg, /Short circuit/);
  assert.match(r.errors[0].msg, /ammeter/i);
  assert.ok(Number.isNaN(c.read('A1').i('p')), 'no fabricated reading');
  // A wire straight across the cell is also a short.
  const d = build({ comps: { B1: ['cell', { emf: 1.5 }] }, wires: [['B1.p', 'B1.n']] });
  assert.equal(d.result().ok, false);
});

test('conflicting ideal sources in parallel are reported; equal ones leave current undefined', () => {
  const c = build({
    comps: { B1: ['cell', { emf: 1.5 }], B2: ['cell', { emf: 3 }] },
    wires: [['B1.p', 'B2.p'], ['B1.n', 'B2.n']]
  });
  assert.equal(c.result().ok, false);
  assert.match(c.result().errors[0].msg, /Conflicting ideal sources/);
  const d = build({
    comps: { B1: ['cell', { emf: 1.5 }], B2: ['cell', { emf: 1.5 }], R1: ['resistor', { R: 3 }] },
    wires: [['B1.p', 'B2.p'], ['B1.n', 'B2.n'], ['B1.p', 'R1.a'], ['R1.b', 'B1.n']]
  });
  assert.ok(d.result().ok);
  close(d.read('R1').i('a'), 0.5);
  assert.ok(Number.isNaN(d.read('B1').i('p')), 'split between ideal cells is undefined');
  assert.match(d.result().warnings[0].msg, /Undefined current/);
});

test('separate networks: voltage between them is undefined; each solves independently', () => {
  const c = build({
    comps: { B1: ['cell', { emf: 1.5 }], R1: ['resistor', { R: 1 }], B2: ['battery', { emf: 6 }], R2: ['resistor', { R: 2 }], V1: ['voltmeter'], B3: ['cell'] },
    wires: [['B1.p', 'R1.a'], ['R1.b', 'B1.n'], ['B2.p', 'R2.a'], ['R2.b', 'B2.n'], ['V1.p', 'R1.a'], ['V1.n', 'R2.b'], ['B3.p', 'B3.n']]
  });
  // B3 is shorted, but only its own network fails.
  assert.equal(c.result().ok, false);
  close(c.read('R1').i('a'), 1.5);
  close(c.read('R2').i('a'), 3);
  assert.ok(Number.isNaN(c.read('V1').v('p', 'n')));
});

test('diode conducts forward, blocks reverse', () => {
  const fwd = build({
    comps: { B1: ['battery', { emf: 5 }], R1: ['resistor', { R: 1000 }], D1: ['diode'] },
    wires: [['B1.p', 'R1.a'], ['R1.b', 'D1.a'], ['D1.k', 'B1.n']]
  });
  const vd = fwd.read('D1').v('a', 'k');
  assert.ok(vd > 0.5 && vd < 0.7, `forward drop ${vd}`);
  close(fwd.read('R1').i('a'), (5 - vd) / 1000, 1e-6);
  const rev = build({
    comps: { B1: ['battery', { emf: 5 }], R1: ['resistor', { R: 1000 }], D1: ['diode'] },
    wires: [['B1.p', 'R1.a'], ['R1.b', 'D1.k'], ['D1.a', 'B1.n']]
  });
  assert.ok(Math.abs(rev.read('R1').i('a')) < 1e-8);
  close(rev.read('D1').v('a', 'k'), -5, 1e-4);
});

test('LED with a current-limiting resistor', () => {
  const c = build({
    comps: { B1: ['battery', { emf: 6 }], R1: ['resistor', { R: 220 }], D1: ['led', { color: 'red' }] },
    wires: [['B1.p', 'R1.a'], ['R1.b', 'D1.a'], ['D1.k', 'B1.n']]
  });
  const i = c.read('D1').i('a');
  const v = c.read('D1').v('a', 'k');
  assert.ok(v > 1.75 && v < 2.0, `red LED drop ${v}`);
  close(i, (6 - v) / 220, 1e-6);
  assert.ok(i > 0.015 && i < 0.02);
});

test('filament lamp is non-ohmic: resistance rises with current', () => {
  const at = (emf) => {
    const c = build({ comps: { B1: ['dcsupply', { emf }], L1: ['lamp', { ratedV: 2.5, ratedI: 0.3 }] }, wires: [['B1.p', 'L1.a'], ['L1.b', 'B1.n']] });
    return c.read('L1').i('a');
  };
  close(at(2.5), 0.3, 1e-6, 'rated point');
  const r1 = 0.25 / at(0.25), r2 = 2.5 / at(2.5);
  assert.ok(r2 > 2 * r1, `R rises: ${r1} → ${r2}`);
  // Odd symmetry: reversing the p.d. reverses the current.
  close(at(-1), -at(1));
});

test('RC charging and discharging match V = E(1 − e^(−t/RC)) and V0 e^(−t/RC)', () => {
  const c = build({
    comps: { B1: ['battery', { emf: 6 }], R1: ['resistor', { R: 1000 }], C1: ['ecap', { C: 1e-3 }], S1: ['switch2', { toB: false }] },
    wires: [['B1.p', 'S1.a'], ['S1.c', 'R1.a'], ['R1.b', 'C1.p'], ['C1.n', 'B1.n'], ['S1.b', 'B1.n']]
  });
  const tau = 1;
  c.sim.running = true;
  while (c.sim.t < tau - 1e-12) c.sim.step();
  const v1 = c.read('C1').v('p', 'n');
  close(v1, 6 * (1 - Math.exp(-c.sim.t / tau)), 2e-4, 'charging at t = RC');
  while (c.sim.t < 5 * tau - 1e-12) c.sim.step();
  close(c.read('C1').v('p', 'n'), 6 * (1 - Math.exp(-c.sim.t / tau)), 2e-4, 'charging at 5RC');
  // Switch to discharge.
  const vStart = c.read('C1').v('p', 'n');
  const t0 = c.sim.t;
  circuit.getComp(c.doc, c.ids.S1).props.toB = true;
  c.sim.setDoc(c.doc);
  close(c.read('C1').v('p', 'n'), vStart, 1e-2, 'edit keeps stored charge');
  while (c.sim.t < t0 + tau - 1e-12) c.sim.step();
  close(c.read('C1').v('p', 'n'), vStart * Math.exp(-(c.sim.t - t0) / tau), 2e-3, 'discharge at t = RC');
  // Current direction reverses on discharge.
  assert.ok(c.read('C1').i('p') < 0);
});

test('NPN switch: base current turns the lamp on; PNP mirrors it', () => {
  const npn = (closed) => build({
    comps: { B1: ['battery', { emf: 6 }], S1: ['switch', { closed }], RB: ['resistor', { R: 4.7e3 }], Q1: ['npn', { beta: 100 }], RL: ['resistor', { R: 100 }] },
    wires: [['B1.p', 'S1.a'], ['S1.b', 'RB.a'], ['RB.b', 'Q1.b'], ['B1.p', 'RL.a'], ['RL.b', 'Q1.c'], ['Q1.e', 'B1.n']]
  });
  const off = npn(false), on = npn(true);
  assert.ok(Math.abs(off.read('RL').i('a')) < 1e-6, 'cut-off');
  const ic = on.read('RL').i('a');
  const ib = on.read('RB').i('a');
  close(ib, (6 - on.read('Q1').v('b', 'e') - ib * 10) / 4.7e3, 1e-3);
  assert.ok(ic > 0.05, `saturated collector current ${ic}`);
  assert.ok(on.read('Q1').v('c', 'e') < 0.3);
  // Active region: large base resistor, small load: Ic ≈ β Ib.
  const act = build({
    comps: { B1: ['battery', { emf: 6 }], RB: ['resistor', { R: 1e6 }], Q1: ['npn', { beta: 100 }], RL: ['resistor', { R: 100 }] },
    wires: [['B1.p', 'RB.a'], ['RB.b', 'Q1.b'], ['B1.p', 'RL.a'], ['RL.b', 'Q1.c'], ['Q1.e', 'B1.n']]
  });
  const ratio = act.read('Q1').i('c') / act.read('Q1').i('b');
  close(ratio, 100, 0.02, 'Ic/Ib ≈ hFE in the active region');
  // PNP: emitter to +, load from collector to −, base pulled low through RB.
  const pnp = build({
    comps: { B1: ['battery', { emf: 6 }], RB: ['resistor', { R: 10e3 }], Q1: ['pnp', { beta: 100 }], RL: ['resistor', { R: 100 }] },
    wires: [['B1.p', 'Q1.e'], ['Q1.b', 'RB.a'], ['RB.b', 'B1.n'], ['Q1.c', 'RL.a'], ['RL.b', 'B1.n']]
  });
  assert.ok(pnp.read('RL').i('a') > 0.05, 'PNP conducts with base below emitter');
  assert.ok(pnp.read('Q1').v('e', 'b') > 0.55);
});

test('logic gate truth tables', () => {
  const table = {
    and: [0, 0, 0, 1], or: [0, 1, 1, 1], nand: [1, 1, 1, 0], nor: [1, 0, 0, 0], xor: [0, 1, 1, 0], xnor: [1, 0, 0, 1]
  };
  for (const [gate, expect] of Object.entries(table)) {
    [[0, 0], [0, 1], [1, 0], [1, 1]].forEach(([a, b], row) => {
      const c = build({
        comps: { IA: ['logic_in', { high: !!a }], IB: ['logic_in', { high: !!b }], G1: ['gate_' + gate], OUT: ['logic_out'] },
        wires: [['IA.q', 'G1.a'], ['IB.q', 'G1.b'], ['G1.q', 'OUT.a']]
      });
      assert.equal(c.read('OUT').logicIn('a'), !!expect[row], `${gate} ${a}${b}`);
      const vq = c.read('G1').vg('q');
      close(vq, expect[row] ? 5 * 100e3 / (100e3 + 50) : 0, 1e-6);
    });
  }
  const not = build({ comps: { IA: ['logic_in', { high: true }], G1: ['gate_not'], OUT: ['logic_out'] }, wires: [['IA.q', 'G1.a'], ['G1.q', 'OUT.a']] });
  assert.equal(not.read('OUT').logicIn('a'), false);
  // An unconnected input is pulled LOW: NOT of nothing is HIGH.
  const floating = build({ comps: { G1: ['gate_not'], OUT: ['logic_out'] }, wires: [['G1.q', 'OUT.a']] });
  assert.equal(floating.read('OUT').logicIn('a'), true);
});

test('gate output drives an LED to the 0 V rail', () => {
  const c = build({
    comps: { IA: ['logic_in', { high: true }], R1: ['resistor', { R: 330 }], D1: ['led'], G0: ['rail_0v'] },
    wires: [['IA.q', 'R1.a'], ['R1.b', 'D1.a'], ['D1.k', 'G0.t']]
  });
  const i = c.read('D1').i('a');
  assert.ok(i > 0.007 && i < 0.01, `LED current ${i}`);
});

test('a NOR latch settles and holds its state', () => {
  const c = build({
    comps: { S: ['logic_in', { high: true }], R: ['logic_in', { high: false }], N1: ['gate_nor'], N2: ['gate_nor'], Q: ['logic_out'] },
    wires: [['R.q', 'N1.a'], ['N2.q', 'N1.b'], ['S.q', 'N2.a'], ['N1.q', 'N2.b'], ['N1.q', 'Q.a']]
  });
  assert.equal(c.read('Q').logicIn('a'), true, 'set');
  circuit.getComp(c.doc, c.ids.S).props.high = false;
  c.sim.setDoc(c.doc);
  assert.equal(c.read('Q').logicIn('a'), true, 'holds after S released');
  circuit.getComp(c.doc, c.ids.R).props.high = true;
  c.sim.setDoc(c.doc);
  assert.equal(c.read('Q').logicIn('a'), false, 'reset');
  assert.equal(c.result().warnings.length, 0);
});

test('a NOT gate fed back on itself is reported as not settling', () => {
  const c = build({ comps: { G1: ['gate_not'] }, wires: [['G1.q', 'G1.a']] });
  assert.match(c.result().warnings[0].msg, /does not settle/);
});

test('potentiometer potential divider', () => {
  const c = build({
    comps: { B1: ['battery', { emf: 6 }], P1: ['potentiometer', { R: 10e3, pos: 25 }], V1: ['voltmeter'] },
    wires: [['B1.p', 'P1.a'], ['P1.b', 'B1.n'], ['V1.p', 'P1.w'], ['V1.n', 'P1.b']]
  });
  close(c.read('V1').v('p', 'n'), 4.5);
  const p = circuit.getComp(c.doc, c.ids.P1);
  p.props.pos = 0;
  c.sim.setDoc(c.doc);
  close(c.read('V1').v('p', 'n'), 6, 1e-6, 'wiper at A');
});

test('AC source: r.m.s. meter reading over a cycle', () => {
  const c = build({
    comps: { AC1: ['acsupply', { peak: 10, freq: 50 }], R1: ['resistor', { R: 100 }], V1: ['voltmeter', { mode: 'ac' }] },
    wires: [['AC1.p', 'R1.a'], ['R1.b', 'AC1.n'], ['V1.p', 'R1.a'], ['V1.n', 'R1.b']]
  });
  c.sim.running = true;
  while (c.sim.t < 0.05) c.sim.step();
  const v1 = circuit.getComp(c.doc, c.ids.V1);
  const m = c.sim.meterValue(v1, c.read('V1').v('p', 'n'), v1.id + ':V');
  assert.ok(m.averaged);
  close(m.value, 10 / Math.SQRT2, 2e-3);
});

test('ideal ammeter shorted by a wire: its reading is undefined, not invented', () => {
  const c = build({
    comps: { B1: ['battery', { emf: 6 }], R1: ['resistor', { R: 60 }], A1: ['ammeter'] },
    wires: [['B1.p', 'A1.p'], ['A1.n', 'R1.a'], ['R1.b', 'B1.n'], ['A1.p', 'A1.n']]
  });
  assert.ok(c.result().ok);
  close(c.read('R1').i('a'), 0.1);
  assert.ok(Number.isNaN(c.read('A1').i('p')));
});

test('logic supply rails: +5 V wired to 0 V is a short circuit', () => {
  const c = build({ comps: { P: ['rail_5v'], G: ['rail_0v'] }, wires: [['P.t', 'G.t']] });
  assert.equal(c.result().ok, false);
  assert.match(c.result().errors[0].msg, /logic supply/);
});

test('thermistor and LDR follow their models', () => {
  close(registry.models.thermistorR(10e3, 3950, 25), 10e3);
  assert.ok(registry.models.thermistorR(10e3, 3950, 60) < 3e3);
  assert.ok(registry.models.ldrR(20e3, 0) > 9.9e5);
  assert.ok(registry.models.ldrR(20e3, 1000) < 1e3);
});

test('motor and loudspeaker act as their coil resistance; the motor turns with the current', () => {
  const c = build({
    comps: { B1: ['battery', { emf: 6 }], M1: ['motor', { R: 5, fullI: 0.5 }], LS1: ['speaker', { R: 8 }] },
    wires: [['B1.p', 'M1.a'], ['M1.b', 'LS1.a'], ['LS1.b', 'B1.n']]
  });
  close(c.read('M1').i('a'), 6 / 13);
  close(c.read('LS1').v('a', 'b'), 8 * 6 / 13);
  const m = circuit.getComp(c.doc, c.ids.M1);
  const st = registry.get('motor').state(m, c.read('M1'));
  close(st.speed, (6 / 13) / 0.5);
  assert.equal(st.dir, 1);
});

test('a fuse conducts below its rating and opens the circuit once blown', () => {
  const spec = (rating, blown) => ({
    comps: { B1: ['battery', { emf: 6 }], F1: ['fuse', { rating, blown }], R1: ['resistor', { R: 10 }] },
    wires: [['B1.p', 'F1.a'], ['F1.b', 'R1.a'], ['R1.b', 'B1.n']]
  });
  const fuse = registry.get('fuse');
  const ok = build(spec(1, false));
  close(ok.read('R1').i('a'), 6 / 10.01, 1e-6, 'a 0.01 Ω fuse barely changes the current');
  assert.equal(fuse.blows(circuit.getComp(ok.doc, ok.ids.F1), ok.read('F1')), false, '0.6 A is under a 1 A rating');
  const over = build(spec(0.5, false));
  assert.equal(fuse.blows(circuit.getComp(over.doc, over.ids.F1), over.read('F1')), true, '0.6 A is over a 0.5 A rating');
  const blown = build(spec(0.5, true));
  close(blown.read('R1').i('a'), 0, 1e-9, 'no current through a blown fuse');
});

test('pause preserves the exact transient result and history; resume continues from it', () => {
  const c = build({
    comps: { B1: ['battery', { emf: 6 }], R1: ['resistor', { R: 1000 }], C1: ['capacitor', { C: 0.001 }] },
    wires: [['B1.p', 'R1.a'], ['R1.b', 'C1.p'], ['C1.n', 'B1.n']]
  });
  c.sim.setRunning(true);
  c.sim.advance(0.1, Infinity, () => 0);
  const time = c.sim.t, result = c.sim.result;
  const history = JSON.stringify([c.sim.capHist, c.sim.traces, c.sim.scopes]);
  c.sim.setRunning(false);
  assert.equal(c.sim.advance(0.1, Infinity, () => 0), 0);
  assert.equal(c.sim.t, time);
  assert.equal(c.sim.result, result);
  assert.equal(JSON.stringify([c.sim.capHist, c.sim.traces, c.sim.scopes]), history);
  c.sim.setRunning(true);
  c.sim.advance(0.1, Infinity, () => 0);
  assert.ok(c.sim.t > time);
  assert.ok(c.read('C1').v('p', 'n') > solver.reader(result, circuit.getComp(c.doc, c.ids.C1)).v('p', 'n'));
});

test('full-wave bridge example rectifies both half-cycles and measures only across the load', () => {
  const examples = require('../js/examples.js');
  const example = examples.list.find(ex => ex.title === 'Full-wave bridge rectifier and oscilloscope');
  assert.ok(example);
  for (const view of ['realistic', 'schematic']) {
    const doc = examples.build(example, view);
    const byLabel = Object.fromEntries(doc.components.map(c => [c.label, c]));
    const sim = solver.createSim(); sim.setDoc(doc);
    const read = label => solver.reader(sim.result, byLabel[label]);
    const loadVoltages = [];
    for (let step = 1; step <= 200; step++) {
      sim.step();
      assert.equal(sim.result.errors.length, 0);
      const voltage = read('R1').v('a', 'b');
      loadVoltages.push(voltage);
      assert.ok(voltage > -1e-6, 'load polarity never reverses');
      close(sim.scopes[byLabel.OS1.id].ch1.at(-1), voltage, 1e-9, 'CH1 measures the load');
      assert.ok(Number.isNaN(sim.scopes[byLabel.OS1.id].ch2.at(-1)), 'CH2 is unconnected');
      if (step % 50 === 25) {
        assert.ok(voltage > 8.5 && voltage < 9.1, 'peak includes two forward diode drops');
        const conducting = step % 100 === 25 ? ['D1', 'D2'] : ['D3', 'D4'];
        const blocked = step % 100 === 25 ? ['D3', 'D4'] : ['D1', 'D2'];
        for (const label of conducting) assert.ok(read(label).i('a') > .008, `${label} conducts`);
        for (const label of blocked) assert.ok(Math.abs(read(label).i('a')) < 1e-6, `${label} blocks`);
      }
      if (step % 50 === 0) assert.ok(Math.abs(voltage) < .05, 'output returns to zero at each input zero crossing');
    }
    const peaks = loadVoltages.filter((v, i, a) => i > 0 && i < a.length - 1 && v > a[i - 1] && v > a[i + 1] && v > 8.5);
    assert.equal(peaks.length, 4, '2 Hz input produces four output pulses per second');
  }
});

test('RL growth and decay follow the L/R time constant, including winding resistance', () => {
  const c = build({
    comps: { B1: ['battery', { emf: 6 }], R1: ['resistor', { R: 8 }], L1: ['inductor', { L: 2, R: 2 }], S1: ['switch2', { toB: false }] },
    wires: [['B1.p', 'S1.a'], ['S1.c', 'R1.a'], ['R1.b', 'L1.a'], ['L1.b', 'B1.n'], ['S1.b', 'B1.n']]
  });
  assert.equal(c.sim.compiled.hasInductors, true);
  close(c.sim.dt, 0.002, 1e-10, 'automatic L/R time step');
  const tau = 0.2;
  for (const end of [tau, 5 * tau]) {
    while (c.sim.t < end - 1e-12) c.sim.step();
    assert.ok(c.result().ok);
    const expected = 0.6 * (1 - Math.exp(-c.sim.t / tau));
    close(c.read('L1').i('a'), expected, 1e-4, 'growing current');
    close(c.read('L1').i('b'), -expected, 1e-4, 'terminal current balance');
    close(c.read('L1').v('a', 'b'), 6 - 8 * expected, 1e-3, 'terminal p.d. includes winding loss');
  }
  const start = c.sim.indHist[c.ids.L1].i1, t0 = c.sim.t;
  circuit.getComp(c.doc, c.ids.S1).props.toB = true;
  c.sim.setDoc(c.doc);
  assert.equal(c.sim.indHist[c.ids.L1].i1, start, 'switching preserves stored current');
  while (c.sim.t < t0 + tau - 1e-12) c.sim.step();
  close(c.read('L1').i('a'), start * Math.exp(-(c.sim.t - t0) / tau), 1e-4, 'decaying current');
  assert.ok(c.read('L1').v('a', 'b') < 0, 'induced p.d. reverses while the current keeps its direction');
});

test('an ideal inductor across a DC source ramps at V/L and keeps signed initial current', () => {
  const c = build({
    comps: { B1: ['battery', { emf: 6 }], L1: ['inductor', { L: 2, i0: -0.1 }] },
    wires: [['B1.p', 'L1.a'], ['L1.b', 'B1.n']]
  });
  for (let n = 0; n < 100; n++) c.sim.step();
  assert.ok(c.result().ok, 'an inductor is not treated as an ideal short');
  close(c.read('L1').i('a'), -0.1 + 3 * c.sim.t, 1e-10);
  close(c.read('B1').i('p'), -c.read('L1').i('a'), 1e-10);
});

test('LC oscillation exchanges electric and magnetic energy without numerical growth', () => {
  const c = build({
    comps: { C1: ['capacitor', { C: 0.01, v0: 3 }], L1: ['inductor', { L: 1 }] },
    wires: [['C1.p', 'L1.a'], ['C1.n', 'L1.b']]
  });
  c.sim.dt = 0.0001;
  for (let n = 1; n <= 12000; n++) {
    c.sim.step();
    if (n % 1000) continue;
    assert.ok(c.result().ok);
    const v = c.read('C1').v('p', 'n'), i = c.read('L1').i('a');
    close(v, 3 * Math.cos(10 * c.sim.t), 3e-5, 'capacitor voltage');
    close(i, 0.3 * Math.sin(10 * c.sim.t), 3e-5, 'inductor current');
    close(0.5 * 0.01 * v * v + 0.5 * i * i, 0.045, 2e-6, 'total stored energy');
  }
});

test('AC RL current has the expected amplitude and phase lag', () => {
  const c = build({
    comps: { B1: ['acsupply', { peak: 5, freq: 5 }], R1: ['resistor', { R: 10 }], L1: ['inductor', { L: 0.1 }] },
    wires: [['B1.p', 'R1.a'], ['R1.b', 'L1.a'], ['L1.b', 'B1.n']]
  });
  const omega = 10 * Math.PI, xl = omega * 0.1;
  while (c.sim.t < 0.4) {
    c.sim.step();
    if (c.sim.t < 0.1) continue;
    const expected = 5 * (10 * Math.sin(omega * c.sim.t) - xl * Math.cos(omega * c.sim.t) + xl * Math.exp(-100 * c.sim.t)) / (100 + xl * xl);
    close(c.read('L1').i('a'), expected, 3e-5);
  }
});

test('inductor history survives pause and edits, restarts after a time-step change, and resets on loading', () => {
  const c = build({
    comps: { L1: ['inductor', { L: 1, i0: 0.4 }], R1: ['resistor', { R: 10 }] },
    wires: [['L1.a', 'R1.a'], ['L1.b', 'R1.b']]
  });
  for (let n = 0; n < 10; n++) c.sim.step();
  c.sim.setRunning(false);
  const history = JSON.stringify(c.sim.indHist), t = c.sim.t;
  assert.equal(c.sim.advance(1), 0);
  assert.equal(JSON.stringify(c.sim.indHist), history);
  assert.equal(c.sim.t, t);
  c.sim.setDoc(c.doc);
  assert.equal(JSON.stringify(c.sim.indHist), history);
  const start = c.sim.indHist[c.ids.L1].i1;
  c.sim.dt *= 0.5;
  c.sim.step();
  close(c.read('L1').i('a'), start / (1 + 10 * c.sim.dt), 1e-10, 'restart with backward Euler');
  const loaded = solver.createSim();
  loaded.setDoc(circuit.importDoc(circuit.exportDoc(c.doc)).doc);
  assert.equal(loaded.indHist[c.ids.L1].i1, 0.4, 'saved circuits contain initial current, not transient state');
  c.sim.reset();
  assert.equal(c.sim.indHist[c.ids.L1].i1, 0.4);
  const comp = circuit.getComp(c.doc, c.ids.L1);
  const readings = registry.get('inductor').readings(comp, c.read('L1'));
  close(readings.find((r) => r.key === 'e').value, 0.5 * comp.props.L * c.read('L1').i('a') ** 2);
  circuit.removeComponents(c.doc, [c.ids.L1]);
  c.sim.setDoc(c.doc);
  assert.equal(c.sim.indHist[c.ids.L1], undefined, 'deleted inductors leave no history');
});

test('finite ammeter resistance contributes to the automatic inductor time step', () => {
  const c = build({
    comps: { L1: ['inductor', { L: 0.1, i0: 0.5 }], A1: ['ammeter', { rin: '1' }] },
    wires: [['L1.a', 'A1.n'], ['L1.b', 'A1.p']]
  });
  close(c.sim.dt, 0.001, 1e-10);
  while (c.sim.t < 0.1 - 1e-12) c.sim.step();
  close(c.read('A1').i('p'), 0.5 / Math.E, 1e-4);
});

function transformerCircuit(np, ns, load = 1000, source = 'acsupply') {
  return build({
    comps: { AC: [source, source === 'acsupply' ? { peak: 5, freq: 5 } : { emf: 5 }],
      T: ['transformer', { np, ns }], R: ['resistor', { R: load }] },
    wires: [['AC.p', 'T.p1'], ['AC.n', 'T.p2'], ['T.s1', 'R.a'], ['T.s2', 'R.b']]
  });
}

for (const [np, ns] of [[100, 200], [200, 100], [100, 100]]) {
  test(`transformer ${np}:${ns}: AC turns ratio, load current and isolation`, () => {
    const c = transformerCircuit(np, ns);
    let vp2 = 0, vs2 = 0, power = 0;
    for (let k = 0; k < 1000; k++) {
      c.sim.step();
      assert.ok(c.result().ok);
      const r = c.read('T');
      if (k >= 800) {
        vp2 += r.v('p1', 'p2') ** 2; vs2 += r.v('s1', 's2') ** 2;
        power += r.v('p1', 'p2') * r.i('p1');
      }
      close(r.i('s1'), -c.read('R').i('a'), 1e-7, 'secondary KCL');
      close(r.i('p1'), -r.i('p2'), 1e-7, 'primary KCL');
      assert.ok(Number.isNaN(r.v('p1', 's1')), 'no invented voltage across isolated windings');
    }
    close(Math.sqrt(vs2 / vp2), ns / np, 0.01, 'r.m.s. voltage ratio');
    assert.ok(power > 0, 'source supplies real power to the secondary load');
  });
}

test('transformer loading is reflected back to the primary; shorted secondary stays solvable', () => {
  const light = transformerCircuit(100, 200, 1000), heavy = transformerCircuit(100, 200, 10);
  let lightI = 0, heavyI = 0;
  for (let k = 0; k < 1000; k++) {
    light.sim.step(); heavy.sim.step();
    if (k > 800) { lightI += light.read('T').i('p1') ** 2; heavyI += heavy.read('T').i('p1') ** 2; }
  }
  assert.ok(heavyI > lightI * 10);
  circuit.addWire(heavy.doc, { c: heavy.ids.T, t: 's1' }, { c: heavy.ids.T, t: 's2' });
  heavy.sim.setDoc(heavy.doc);
  for (let k = 0; k < 100; k++) { heavy.sim.step(); assert.ok(heavy.result().ok); }
  close(heavy.read('T').v('s1', 's2'), 0);
});

test('open-secondary DC transformer transient decays instead of sustaining secondary voltage', () => {
  const c = transformerCircuit(100, 200, 1000, 'dcsupply');
  // Remove the load component and all its wires, leaving an open secondary.
  circuit.removeComponents(c.doc, [c.ids.R]);
  c.sim.setDoc(c.doc);
  c.sim.dt = 0.1;
  for (let k = 0; k < 10000; k++) c.sim.step();
  assert.ok(c.result().ok);
  close(c.read('T').i('p1'), 50 * (1 - Math.exp(-10)), 1e-5);
  close(c.read('T').v('s1', 's2'), 9.99 * Math.exp(-10), 1e-5);
});

test('transformer turn edits, pause, import and reset preserve the expected state lifecycle', () => {
  const c = transformerCircuit(100, 200);
  for (let k = 0; k < 20; k++) c.sim.step();
  const hist = { ...c.sim.indHist[c.ids.T] };
  c.sim.setRunning(false);
  const t = circuit.getComp(c.doc, c.ids.T);
  t.props.ns = 100;
  c.sim.setDoc(c.doc);
  assert.deepEqual(c.sim.indHist[c.ids.T], hist);
  assert.ok(c.result().ok);
  const imported = circuit.importDoc(circuit.exportDoc(c.doc));
  assert.equal(imported.warnings.length, 0);
  assert.equal(circuit.getComp(imported.doc, c.ids.T).props.ns, 100);
  c.sim.reset();
  close(c.sim.indHist[c.ids.T].i1, 0);
  close(c.sim.indHist[c.ids.T].j1, 0);
  assert.equal(registry.get('transformer').category, 'core');
  for (const [np, ns] of [[10, 2000], [2000, 10]]) {
    const edge = transformerCircuit(np, ns);
    for (let k = 0; k < 100; k++) edge.sim.step();
    assert.ok(edge.result().ok, `${np}:${ns} extreme ratio remains solvable`);
  }
});

function relayCircuit(voltage = 6) {
  return build({ comps: { C: ['dcsupply', { emf: voltage }], K: ['relay'], B: ['battery', { emf: 9 }],
    NC: ['resistor', { R: 100 }], NO: ['resistor', { R: 100 }] },
    wires: [['C.p', 'K.cp'], ['C.n', 'K.cn'], ['B.p', 'K.com'], ['K.nc', 'NC.a'],
      ['K.no', 'NO.a'], ['NC.b', 'B.n'], ['NO.b', 'B.n']] });
}
function settle(c, steps = 1000) { for (let k = 0; k < steps; k++) { c.sim.step(); assert.ok(c.result().ok, JSON.stringify(c.result().errors)); } }

test('relay switches isolated SPDT contacts and releases with hysteresis', () => {
  const c = relayCircuit(0);
  assert.equal(c.read('K').relayOn(), false);
  close(c.read('NC').i('a'), 9 / 100.05);
  assert.ok(c.read('NO').i('a') < 1e-9);
  assert.ok(Number.isNaN(c.read('K').v('cp', 'com')));
  circuit.getComp(c.doc, c.ids.C).props.emf = 6; c.sim.setDoc(c.doc); settle(c);
  assert.equal(c.read('K').relayOn(), true);
  close(c.read('NO').i('a'), 9 / 100.05);
  close(c.read('K').i('cp'), 0.05, 1e-5);
  circuit.getComp(c.doc, c.ids.C).props.emf = 2.4; c.sim.setDoc(c.doc); settle(c);
  assert.equal(c.read('K').relayOn(), true, 'holds above release current');
  circuit.getComp(c.doc, c.ids.C).props.emf = 1.2; c.sim.setDoc(c.doc); settle(c);
  assert.equal(c.read('K').relayOn(), false);
  close(c.read('NC').i('a'), 9 / 100.05);
  c.sim.reset(); assert.equal(c.read('K').relayOn(), false);
});

test('relay coil energizes with reversed polarity and preserves state during pause/edits', () => {
  const c = relayCircuit();
  const source = c.ids.C;
  for (const w of c.doc.wires) for (const end of [w.a, w.b]) if (end.c === source) end.t = end.t === 'p' ? 'n' : 'p';
  c.sim.setDoc(c.doc); settle(c);
  assert.equal(c.read('K').relayOn(), true);
  close(c.read('K').i('cp'), -0.05, 1e-5);
  c.sim.setRunning(false);
  const history = { ...c.sim.indHist[c.ids.K] };
  circuit.getComp(c.doc, c.ids.NO).props.R = 200; c.sim.setDoc(c.doc);
  assert.deepEqual(c.sim.indHist[c.ids.K], history);
  assert.equal(c.read('K').relayOn(), true);
  const imported = circuit.importDoc(circuit.exportDoc(c.doc));
  assert.equal(imported.warnings.length, 0);
  assert.equal(registry.get('relay').category, 'ext');
});

function opampCircuit(input = 1, inverting = false) {
  return build({ comps: { H: ['dcsupply', { emf: 12 }], L: ['dcsupply', { emf: 12 }],
    S: ['dcsupply', { emf: input }], U: ['opamp'], R: ['resistor', { R: 10000 }],
    RI: ['resistor', { R: 10000 }], RF: ['resistor', { R: 20000 }] },
    wires: [['H.p', 'U.vp'], ['H.n', 'L.p'], ['L.n', 'U.vn'], ['S.n', 'H.n'],
      ['U.out', 'R.a'], ['R.b', 'H.n'], ...(inverting ?
        [['S.p', 'RI.a'], ['RI.b', 'U.minus'], ['RF.a', 'U.minus'], ['RF.b', 'U.out'], ['U.plus', 'H.n']] :
        [['S.p', 'U.plus'], ['U.out', 'U.minus']])] });
}

test('powered op amp voltage follower tracks input and recovers after clipping', () => {
  const c = opampCircuit(1);
  assert.ok(c.result().ok, JSON.stringify(c.result().errors));
  close(c.read('R').v('a', 'b'), 1, 1e-3);
  for (const input of [30, 0.2, 10, 0, 2]) {
    circuit.getComp(c.doc, c.ids.S).props.emf = input; c.sim.setDoc(c.doc);
    assert.ok(c.result().ok, `follower input ${input}: ${JSON.stringify(c.result().errors)}`);
    close(c.read('R').v('a', 'b'), Math.min(input, 12 / 1.005), 0.01);
  }
  assert.equal(registry.get('opamp').category, 'ext');
});

test('op amp negative feedback produces an inverting gain of minus two', () => {
  const c = opampCircuit(1, true);
  assert.ok(c.result().ok, JSON.stringify(c.result().errors));
  close(c.read('R').v('a', 'b'), -2, 0.002);
  close(c.read('U').v('plus', 'minus'), 0, 1e-4, 'virtual ground');
  const u = circuit.getComp(c.doc, c.ids.U);
  const r = c.read('U');
  close(['plus', 'minus', 'out', 'vp', 'vn'].reduce((sum, t) => sum + r.i(t), 0), 0, 1e-8, 'device KCL');
  const imported = circuit.importDoc(circuit.exportDoc(c.doc));
  assert.equal(imported.warnings.length, 0);
  assert.equal(circuit.getComp(imported.doc, u.id).props.gain, 100000);
});

test('op amp comparator switches between supply rails and needs power', () => {
  const c = opampCircuit(1);
  const feedback = c.doc.wires.find((w) => [w.a, w.b].every((e) => e.c === c.ids.U));
  circuit.removeWires(c.doc, [feedback.id]);
  circuit.addWire(c.doc, { c: c.ids.U, t: 'minus' }, { c: c.ids.H, t: 'n' });
  c.sim.setDoc(c.doc); assert.ok(c.result().ok);
  close(c.read('R').v('a', 'b'), 12 / 1.005, 1e-4);
  // Swap the differential inputs to select the negative rail.
  for (const w of c.doc.wires) for (const e of [w.a, w.b]) if (e.c === c.ids.U && ['plus', 'minus'].includes(e.t)) e.t = e.t === 'plus' ? 'minus' : 'plus';
  c.sim.setDoc(c.doc); assert.ok(c.result().ok);
  close(c.read('R').v('a', 'b'), -12 / 1.005, 1e-4);
  circuit.getComp(c.doc, c.ids.H).props.emf = 0;
  circuit.getComp(c.doc, c.ids.L).props.emf = 0;
  c.sim.setDoc(c.doc); assert.ok(c.result().ok);
  close(c.read('R').v('a', 'b'), 0, 1e-6);
});

test('relay flyback diode carries coil current after its supply switch opens', () => {
  const c = build({ comps: { B: ['dcsupply', { emf: 6 }], S: ['switch', { closed: true }],
    K: ['relay'], D: ['diode'] },
    wires: [['B.p', 'S.a'], ['S.b', 'K.cp'], ['K.cn', 'B.n'], ['D.a', 'K.cn'], ['D.k', 'K.cp']] });
  settle(c);
  assert.equal(c.read('K').relayOn(), true);
  circuit.getComp(c.doc, c.ids.S).props.closed = false; c.sim.setDoc(c.doc);
  c.sim.step();
  assert.ok(c.result().ok, JSON.stringify(c.result().errors));
  assert.ok(c.read('D').i('a') > 0.03, 'stored coil current circulates through the diode');
  assert.ok(c.read('K').v('cp', 'cn') < 0, 'induced p.d. reverses');
  settle(c);
  assert.equal(c.read('K').relayOn(), false);
  assert.ok(Math.abs(c.read('K').i('cp')) < 0.001);
});
