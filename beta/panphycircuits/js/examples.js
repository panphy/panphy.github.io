// PanPhy Circuits: example circuits, each with a realistic layout and a tidy
// circuit diagram. Component entries: [label, type, props, realistic [x, y, r, f],
// schematic [x, y, r, f]]. Wires: [from, to, color, { r: bends, s: bends }].
(function (root) {
  const PPC = root.PPC = root.PPC || {};
  const circuit = PPC.circuit || (typeof require === 'function' ? require('./circuit.js') : null);

  const list = [
    {
      title: 'Cell, switch and lamp',
      summary: 'The simplest complete circuit. Close the switch to light the lamp.',
      tip: 'Click the switch lever to close it and light the lamp.',
      comps: [
        ['B1', 'cell', { emf: 1.5 }, [0, -130, 0], [0, -100, 0]],
        ['S1', 'switch', { closed: false }, [220, 0, 1], [140, 0, 1]],
        ['L1', 'lamp', { ratedV: 1.5, ratedI: 0.3 }, [0, 130, 0], [0, 100, 0]]
      ],
      wires: [
        ['B1.p', 'S1.a', 'red'],
        ['S1.b', 'L1.b', 'red'],
        ['L1.a', 'B1.n', 'black', { s: [[-140, 100], [-140, -100]] }]
      ]
    },
    {
      title: 'Series and parallel resistors',
      summary: 'Two separate circuits on one bench: 100 Ω + 200 Ω in series, and 100 Ω ∥ 200 Ω in parallel.',
      tip: 'Compare the ammeter readings: one current in series, shared current in parallel.',
      comps: [
        ['B1', 'battery', { emf: 6 }, [-380, -150, 0], [-180, -100, 0]],
        ['A1', 'ammeter', {}, [-200, -20, 0], [-60, -20, 3]],
        ['R1', 'resistor', { R: 100 }, [-440, 140, 0], [-210, 100, 0]],
        ['R2', 'resistor', { R: 200 }, [-250, 140, 0], [-110, 100, 0]],
        ['B2', 'battery', { emf: 6 }, [180, -150, 0], [200, -100, 0]],
        ['A2', 'ammeter', {}, [380, -40, 0], [380, -40, 3]],
        ['J1', 'junction', {}, [470, 100, 0], [380, 40, 0]],
        ['A3', 'ammeter', {}, [330, 100, 0], [310, 40, 2]],
        ['R3', 'resistor', { R: 100 }, [170, 100, 0], [200, 40, 0]],
        ['R4', 'resistor', { R: 200 }, [230, 230, 0], [200, 120, 0]],
        ['J2', 'junction', {}, [40, 170, 0], [60, 40, 0]]
      ],
      wires: [
        ['B1.p', 'A1.p', 'red'],
        ['A1.n', 'R2.b', 'blue'],
        ['R2.a', 'R1.b', 'blue'],
        ['R1.a', 'B1.n', 'black', { s: [[-300, 100], [-300, -100]] }],
        ['B2.p', 'A2.p', 'red'],
        ['A2.n', 'J1.j', 'blue'],
        ['J1.j', 'A3.p', 'blue'],
        ['A3.n', 'R3.b', 'blue'],
        ['J1.j', 'R4.b', 'blue', { s: [[380, 120]] }],
        ['R3.a', 'J2.j', 'black'],
        ['R4.a', 'J2.j', 'black', { s: [[60, 120]] }],
        ['J2.j', 'B2.n', 'black', { s: [[60, -100]] }]
      ]
    },
    {
      title: 'Ammeter and voltmeter connections',
      summary: 'An ammeter in series with a resistor and a voltmeter in parallel across it.',
      tip: 'Close the switch. Check that V ÷ I equals the resistance.',
      comps: [
        ['B1', 'battery', { emf: 3 }, [0, -200, 0], [0, -100, 0]],
        ['S1', 'switch', { closed: false }, [-270, -20, 1], [-160, 0, 1]],
        ['A1', 'ammeter', {}, [250, -40, 0], [160, 0, 3]],
        ['R1', 'resistor', { R: 10 }, [0, 110, 0], [0, 100, 0]],
        ['V1', 'voltmeter', {}, [0, 230, 0], [0, 180, 0]]
      ],
      wires: [
        ['B1.n', 'S1.a', 'black'],
        ['S1.b', 'R1.a', 'black'],
        ['B1.p', 'A1.p', 'red'],
        ['A1.n', 'R1.b', 'red'],
        ['V1.p', 'R1.b', 'red', { s: [[40, 180]] }],
        ['V1.n', 'R1.a', 'black', { s: [[-40, 180]] }]
      ]
    },
    {
      title: 'Potentiometer potential divider',
      summary: 'A potentiometer across a 6 V battery; the voltmeter reads the p.d. between the wiper and end B.',
      tip: 'Drag the potentiometer knob (or use the inspector slider) and watch the output p.d.',
      comps: [
        ['B1', 'battery', { emf: 6 }, [-260, -110, 0], [-240, 40, 3]],
        ['VR1', 'potentiometer', { R: 10e3, pos: 50 }, [0, 0, 0], [0, 40, 1]],
        ['V1', 'voltmeter', {}, [220, 30, 0], [120, 80, 3]],
        ['J1', 'junction', {}, [20, 140, 0], [0, 120, 0]]
      ],
      wires: [
        ['B1.p', 'VR1.a', 'red'],
        ['VR1.w', 'V1.p', 'yellow'],
        ['VR1.b', 'J1.j', 'black'],
        ['V1.n', 'J1.j', 'black'],
        ['B1.n', 'J1.j', 'black', { s: [[-240, 120]] }]
      ]
    },
    {
      title: 'LED with a current-limiting resistor',
      summary: 'A red LED and a 330 Ω resistor in series. Reverse the LED to see that it only conducts one way.',
      tip: 'Select the LED and use Mirror (M) to reverse it, or change the resistor to see the current change.',
      comps: [
        ['B1', 'battery', { emf: 6 }, [0, -170, 0], [0, -100, 0]],
        ['R1', 'resistor', { R: 330 }, [230, -40, 1], [160, -20, 1]],
        ['D1', 'led', { color: 'red' }, [110, 130, 2], [60, 100, 2]],
        ['A1', 'ammeter', {}, [-150, 90, 0], [-100, 100, 0]]
      ],
      wires: [
        ['B1.p', 'R1.a', 'red'],
        ['R1.b', 'D1.a', 'red'],
        ['D1.k', 'A1.p', 'black'],
        ['A1.n', 'B1.n', 'black']
      ]
    },
    {
      title: 'LDR light sensor',
      summary: 'A potential divider of a 10 kΩ resistor and an LDR. The p.d. across the LDR rises as it gets darker.',
      tip: 'Select the LDR and change the illumination: compare 1 lx (dark) with 1000 lx (bright).',
      comps: [
        ['B1', 'battery', { emf: 6 }, [-260, 40, 0], [-160, 60, 3]],
        ['R1', 'resistor', { R: 10e3 }, [0, -60, 1], [0, 0, 1]],
        ['LDR1', 'ldr', { lux: 300 }, [0, 140, 1], [0, 120, 1]],
        ['J1', 'junction', {}, [0, 40, 0], [0, 60, 0]],
        ['V1', 'voltmeter', {}, [200, 100, 0], [120, 100, 3]],
        ['J2', 'junction', {}, [0, 250, 0], [0, 190, 0]]
      ],
      wires: [
        ['B1.p', 'R1.a', 'red'],
        ['R1.b', 'J1.j', 'blue'],
        ['J1.j', 'LDR1.a', 'blue'],
        ['J1.j', 'V1.p', 'red'],
        ['LDR1.b', 'J2.j', 'black'],
        ['V1.n', 'J2.j', 'black'],
        ['B1.n', 'J2.j', 'black']
      ]
    },
    {
      title: 'Capacitor charging and discharging',
      summary: 'A 1000 µF capacitor charges through 4.7 kΩ (RC = 4.7 s). Flip the two-way switch to discharge it.',
      tip: 'Press Run, then flip the two-way switch to B to discharge. The graph shows the solver’s p.d. and current.',
      run: false,
      graph: true,
      ext: true,
      comps: [
        ['B1', 'battery', { emf: 6 }, [-360, -40, 0], [-200, 40, 3]],
        ['S1', 'switch2', { toB: false }, [-80, -150, 0, true], [-80, -60, 2]],
        ['A1', 'ammeter', { plot: true }, [120, -150, 0, true], [40, -60, 2]],
        ['R1', 'resistor', { R: 4.7e3 }, [260, -20, 1], [160, 0, 1]],
        ['C1', 'ecap', { C: 1000e-6, v0: 0 }, [260, 140, 1], [160, 110, 1]],
        ['V1', 'voltmeter', { plot: true }, [430, 140, 0, true], [260, 110, 3]],
        ['J1', 'junction', {}, [-200, 260, 0], [-200, 160, 0]]
      ],
      wires: [
        ['B1.p', 'S1.a', 'red'],
        ['S1.b', 'J1.j', 'black', { s: [[-240, -80], [-240, 160]] }],
        ['S1.c', 'A1.p', 'red'],
        ['A1.n', 'R1.a', 'red'],
        ['R1.b', 'C1.p', 'red'],
        ['C1.n', 'J1.j', 'black', { s: [[160, 160]] }],
        ['B1.n', 'J1.j', 'black'],
        ['V1.p', 'C1.p', 'red'],
        ['V1.n', 'C1.n', 'black']
      ]
    },
    {
      title: 'NPN transistor switch',
      summary: 'Pressing the push switch drives a small base current, which switches on a much larger lamp current.',
      tip: 'Press and hold the push switch. Select the transistor to compare base and collector currents.',
      ext: true,
      comps: [
        ['B1', 'battery', { emf: 6 }, [-330, 40, 0], [-200, 40, 3]],
        ['S1', 'pushswitch', {}, [-120, 60, 0], [-60, 80, 0]],
        ['RB', 'resistor', { R: 4.7e3 }, [20, 60, 0], [40, 80, 0]],
        ['Q1', 'npn', { beta: 100, pinout: 'ebc' }, [180, 110, 2], [140, 80, 0]],
        ['L1', 'lamp', { ratedV: 6, ratedI: 0.06 }, [160, -60, 1], [160, -40, 1]],
        ['J1', 'junction', {}, [-200, -120, 0], [-100, -80, 0]]
      ],
      wires: [
        ['B1.p', 'J1.j', 'red'],
        ['J1.j', 'L1.a', 'red'],
        ['J1.j', 'S1.a', 'red'],
        ['S1.b', 'RB.a', 'yellow'],
        ['RB.b', 'Q1.b', 'yellow'],
        ['L1.b', 'Q1.c', 'blue'],
        ['Q1.e', 'B1.n', 'black', { s: [[160, 140], [-200, 140]], r: [[240, 230], [-400, 230]] }]
      ]
    },
    {
      title: 'PNP transistor switch',
      summary: 'A PNP transistor with its emitter at +6 V. Closing the switch pulls the base low and turns the lamp on.',
      tip: 'Close the switch. In a PNP transistor, conventional current flows out of the base.',
      ext: true,
      comps: [
        ['B1', 'battery', { emf: 6 }, [-330, 40, 0], [-200, 40, 3]],
        ['Q1', 'pnp', { beta: 100, pinout: 'ebc' }, [160, -40, 0], [100, -20, 2, true]],
        ['RB', 'resistor', { R: 4.7e3 }, [0, 70, 0], [0, -20, 0]],
        ['S1', 'switch', { closed: false }, [-130, 150, 1], [-80, 60, 1]],
        ['L1', 'lamp', { ratedV: 6, ratedI: 0.06 }, [250, 110, 1], [120, 80, 1]],
        ['J1', 'junction', {}, [-20, 270, 0], [-80, 160, 0]]
      ],
      wires: [
        ['B1.p', 'Q1.e', 'red', { s: [[-200, -100], [120, -100]] }],
        ['Q1.c', 'L1.a', 'blue'],
        ['RB.b', 'Q1.b', 'yellow'],
        ['RB.a', 'S1.a', 'yellow'],
        ['S1.b', 'J1.j', 'black'],
        ['L1.b', 'J1.j', 'black'],
        ['B1.n', 'J1.j', 'black']
      ]
    },
    {
      title: 'Logic gate: AND',
      summary: 'Two logic inputs feed an AND gate. Its output lights an indicator and drives an LED through 330 Ω to the 0 V rail.',
      tip: 'Click the input switches to step through the truth table (shown in the gate’s inspector).',
      ext: true,
      comps: [
        ['INA', 'logic_in', { high: false }, [-260, -80, 0], [-160, -40, 0]],
        ['INB', 'logic_in', { high: false }, [-260, 80, 0], [-160, 40, 0]],
        ['G1', 'gate_and', {}, [0, 0, 0], [0, 0, 0]],
        ['J1', 'junction', {}, [110, 0, 0], [80, 0, 0]],
        ['OUT1', 'logic_out', {}, [250, -10, 0], [160, 0, 0]],
        ['R1', 'resistor', { R: 330 }, [110, 120, 1], [80, 70, 1]],
        ['D1', 'led', { color: 'green' }, [110, 250, 1], [80, 170, 1]],
        ['GND', 'rail_0v', {}, [110, 360, 0], [80, 250, 0]]
      ],
      wires: [
        ['INA.q', 'G1.a', 'yellow'],
        ['INB.q', 'G1.b', 'yellow'],
        ['G1.q', 'J1.j', 'blue'],
        ['J1.j', 'OUT1.a', 'blue'],
        ['J1.j', 'R1.a', 'blue'],
        ['R1.b', 'D1.a', 'blue'],
        ['D1.k', 'GND.t', 'black']
      ]
    },
    {
      title: 'Half-wave rectifier and oscilloscope',
      summary: 'A 2 Hz AC supply, a diode and a 1 kΩ load. The oscilloscope compares the supply (CH1) with the load (CH2).',
      tip: 'Watch CH2: the diode only lets the positive half-cycles through, about 0.6 V lower.',
      ext: true,
      comps: [
        ['AC1', 'acsupply', { peak: 5, freq: 2 }, [-300, 60, 0], [-160, 40, 3]],
        ['D1', 'diode', {}, [-30, -40, 0], [-40, -40, 0]],
        ['R1', 'resistor', { R: 1000 }, [160, 60, 1], [80, 40, 1]],
        ['OS1', 'scope', { tdiv: '0.1', v1: '2', v2: '2' }, [-60, -260, 0], [-40, -170, 0]],
        ['J1', 'junction', {}, [-150, -40, 0], [-120, -40, 0]],
        ['J2', 'junction', {}, [80, -40, 0], [40, -40, 0]],
        ['J3', 'junction', {}, [100, 200, 0], [80, 120, 0]]
      ],
      wires: [
        ['AC1.p', 'J1.j', 'yellow'],
        ['J1.j', 'D1.a', 'yellow'],
        ['D1.k', 'J2.j', 'red'],
        ['J2.j', 'R1.a', 'red'],
        ['R1.b', 'J3.j', 'black'],
        ['J3.j', 'AC1.n', 'black', { s: [[-160, 120]] }],
        ['OS1.ch1', 'J1.j', 'yellow', { s: [[-70, -110], [-120, -110]] }],
        ['OS1.ch2', 'J2.j', 'blue', { s: [[-40, -100], [40, -100]] }],
        ['OS1.com', 'J3.j', 'black', { s: [[-10, -115], [140, -115], [140, 120]], r: [[240, -180], [260, 200]] }]
      ]
    }
  ];

  // Build a document from an example definition.
  function build(ex, view) {
    const doc = circuit.createDoc();
    const ids = {};
    for (const [label, type, props, real, sch] of ex.comps) {
      const c = circuit.addComponent(doc, type, { label, props: Object.assign({}, props) });
      ids[label] = c.id;
      doc.layouts.realistic.comps[c.id] = { x: real[0], y: real[1], r: real[2] || 0, f: !!real[3] };
      doc.layouts.schematic.comps[c.id] = { x: sch[0], y: sch[1], r: sch[2] || 0, f: !!sch[3] };
    }
    for (const [from, to, color, bends] of ex.wires) {
      const [la, ta] = from.split('.'), [lb, tb] = to.split('.');
      const r = circuit.addWire(doc, { c: ids[la], t: ta }, { c: ids[lb], t: tb }, { color });
      if (!r.wire) throw new Error(`Example "${ex.title}": ${r.error}`);
      doc.layouts.realistic.wires[r.wire.id] = { pts: (bends && bends.r) || [] };
      doc.layouts.schematic.wires[r.wire.id] = { pts: (bends && bends.s) || [] };
    }
    doc.layouts.realistic.ready = true;
    doc.layouts.schematic.ready = true;
    doc.view = view || 'realistic';
    return doc;
  }

  PPC.examples = { list, build };
  if (typeof module === 'object' && module.exports) module.exports = PPC.examples;
})(typeof globalThis === 'object' ? globalThis : this);
