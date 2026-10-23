// Annotated data booklet: the constants, tables and diagrams of the DP Physics data
// booklet (first assessment 2025, version 1.2). The equations by topic, the symbol
// explanations and the MathJax setup are in ../assets/equations.js, loaded first.
(() => {
  const { HL, THEMES, equationRows, mathHtml, symbol, esc } = window.IBEquations;

  const MATHS = {
    title: 'Mathematical equations',
    eqs: [
      { label: 'Area of a triangle', tex: 'A=\\tfrac{1}{2}bh', syms: { A: 'area', b: 'base of the triangle', h: 'height, measured at right angles to the base' } },
      { label: 'Area of a circle', tex: 'A=\\pi r^{2}', syms: { A: 'area', r: 'radius' } },
      { label: 'Circumference of a circle', tex: 'C=2\\pi r', syms: { C: 'circumference', r: 'radius' } },
      { label: 'Volume of a cuboid', tex: 'V=lwh', syms: { V: 'volume', l: 'length', w: 'width', h: 'height' } },
      { label: 'Volume of a cylinder', tex: 'V=\\pi r^{2}h', syms: { V: 'volume', r: 'radius', h: 'height (length) of the cylinder' } },
      { label: 'Volume of a prism', tex: 'V=Ah', syms: { V: 'volume', A: 'area of cross-section', h: 'height (length) of the prism' } },
      { label: 'Volume of a sphere', tex: 'V=\\tfrac{4}{3}\\pi r^{3}', syms: { V: 'volume', r: 'radius' } },
      { label: 'Area of the curved surface of a cylinder', tex: 'A=2\\pi rh', syms: { A: 'area of the curved surface', r: 'radius', h: 'height (length) of the cylinder' } },
      { label: 'Components of a vector', tex: 'A_\\mathrm{H}=A\\cos\\theta', syms: { 'A_\\mathrm{H}': 'horizontal component of the vector', A: 'magnitude of the vector', '\\theta': 'angle between the vector and the horizontal' } },
      { label: '', tex: 'A_\\mathrm{V}=A\\sin\\theta', syms: { 'A_\\mathrm{V}': 'vertical component of the vector', A: 'magnitude of the vector', '\\theta': 'angle between the vector and the horizontal' } },
      { label: 'Trigonometric relationships', tex: '\\tan\\theta=\\dfrac{\\sin\\theta}{\\cos\\theta}', syms: { '\\theta': 'any angle' } },
      { label: '', tex: '\\sin^{2}\\theta+\\cos^{2}\\theta=1', syms: { '\\theta': 'any angle' } }
    ]
  };

  const UNCERTAINTIES = {
    title: 'Uncertainties',
    syms: {
      y: 'the quantity being calculated', a: 'a measured quantity', b: 'a measured quantity', c: 'a measured quantity', n: 'the power that a is raised to',
      '\\Delta y': 'absolute uncertainty in y', '\\Delta a': 'absolute uncertainty in a', '\\Delta b': 'absolute uncertainty in b', '\\Delta c': 'absolute uncertainty in c'
    },
    eqs: [
      { label: 'Adding or subtracting: if \\(y=a\\pm b\\)', tex: '\\Delta y=\\Delta a+\\Delta b', note: 'Add the absolute uncertainties. Here Δ denotes a non-negative uncertainty, not final minus initial.' },
      { label: 'Multiplying or dividing: if \\(y=\\dfrac{ab}{c}\\)', tex: '\\dfrac{\\Delta y}{y}=\\dfrac{\\Delta a}{a}+\\dfrac{\\Delta b}{b}+\\dfrac{\\Delta c}{c}', note: 'Add the fractional uncertainties.' },
      { label: 'Raising to a power: if \\(y=a^{n}\\)', tex: '\\dfrac{\\Delta y}{y}=\\left|n\\dfrac{\\Delta a}{a}\\right|', note: 'Multiply the fractional uncertainty by the power.' }
    ]
  };

  // [quantity, symbol, value, what it is for]
  const CONSTANTS = [
    ['Acceleration of free fall', 'g', '9.8\\,\\mathrm{m\\,s^{-2}}\\ \\text{(Earth’s surface)}', 'Acceleration of a freely falling body near the Earth’s surface; also the gravitational field strength there, in N kg⁻¹.'],
    ['Gravitational constant', 'G', '6.67\\times10^{-11}\\,\\mathrm{N\\,m^{2}\\,kg^{-2}}', 'Sets the size of the gravitational force between two masses in Newton’s law of gravitation.'],
    ['Avogadro constant', 'N_\\mathrm{A}', '6.02\\times10^{23}\\,\\mathrm{mol^{-1}}', 'Number of particles in one mole of a substance.'],
    ['Gas constant', 'R', '8.31\\,\\mathrm{J\\,K^{-1}\\,mol^{-1}}', 'Links pressure, volume and temperature for one mole of an ideal gas.'],
    ['Boltzmann constant', 'k_\\mathrm{B}', '1.38\\times10^{-23}\\,\\mathrm{J\\,K^{-1}}', 'The gas constant per molecule: links temperature to the average kinetic energy of one particle.'],
    ['Stefan–Boltzmann constant', '\\sigma', '5.67\\times10^{-8}\\,\\mathrm{W\\,m^{-2}\\,K^{-4}}', 'Sets the power radiated per unit area by a black body at a given temperature.'],
    ['Coulomb constant', 'k', '8.99\\times10^{9}\\,\\mathrm{N\\,m^{2}\\,C^{-2}}', 'Sets the size of the electric force between two charges in Coulomb’s law (in a vacuum).'],
    ['Permittivity of free space', '\\varepsilon_{0}', '8.85\\times10^{-12}\\,\\mathrm{C^{2}\\,N^{-1}\\,m^{-2}}', 'Describes how an electric field is set up in a vacuum; related to the Coulomb constant by k = 1/(4πε₀).'],
    ['Permeability of free space', '\\mu_{0}', '4\\pi\\times10^{-7}\\,\\mathrm{T\\,m\\,A^{-1}}', 'Describes how a magnetic field is set up in a vacuum by a current.'],
    ['Speed of light in vacuum', 'c', '3.00\\times10^{8}\\,\\mathrm{m\\,s^{-1}}', 'Speed of all electromagnetic waves in a vacuum.'],
    ['Planck constant', 'h', '6.63\\times10^{-34}\\,\\mathrm{J\\,s}', 'Links the energy of a photon to its frequency, and the momentum of a particle to its wavelength.'],
    ['Elementary charge', 'e', '1.60\\times10^{-19}\\,\\mathrm{C}', 'Size of the charge on one proton or one electron.'],
    ['Electron rest mass', 'm_\\mathrm{e}', '9.110\\times10^{-31}\\,\\mathrm{kg}=0.000549\\,\\mathrm{u}=0.511\\,\\mathrm{MeV}\\,c^{-2}', 'Mass of an electron at rest, in kilograms, in atomic mass units and as an energy equivalent.'],
    ['Proton rest mass', 'm_\\mathrm{p}', '1.673\\times10^{-27}\\,\\mathrm{kg}=1.007276\\,\\mathrm{u}=938\\,\\mathrm{MeV}\\,c^{-2}', 'Mass of a proton at rest.'],
    ['Neutron rest mass', 'm_\\mathrm{n}', '1.675\\times10^{-27}\\,\\mathrm{kg}=1.008665\\,\\mathrm{u}=940\\,\\mathrm{MeV}\\,c^{-2}', 'Mass of a neutron at rest; slightly more than a proton.'],
    ['(Unified) atomic mass unit', '\\mathrm{u}', '1.661\\times10^{-27}\\,\\mathrm{kg}=931.5\\,\\mathrm{MeV}\\,c^{-2}', 'One twelfth of the mass of a carbon-12 atom; the unit for nuclear masses.'],
    ['Solar constant', 'S', '1.36\\times10^{3}\\,\\mathrm{W\\,m^{-2}}', 'Intensity of the Sun’s radiation arriving at the top of the Earth’s atmosphere.'],
    ['Fermi radius', 'R_{0}', '1.20\\times10^{-15}\\,\\mathrm{m}', 'The constant in the nuclear radius equation: roughly the radius of one nucleon.']
  ];

  const MULTIPLIERS = [['peta', 'P', 15], ['tera', 'T', 12], ['giga', 'G', 9], ['mega', 'M', 6], ['kilo', 'k', 3], ['hecto', 'h', 2], ['deca', 'da', 1], ['deci', 'd', -1], ['centi', 'c', -2], ['milli', 'm', -3], ['micro', 'μ', -6], ['nano', 'n', -9], ['pico', 'p', -12], ['femto', 'f', -15]];

  const CONVERSIONS = [
    ['Radian (rad)', '1\\,\\mathrm{rad}\\equiv\\dfrac{180^{\\circ}}{\\pi}', 'About 57.3°. A full circle is 2π radians.'],
    ['Kelvin (K) and degree Celsius (°C)', 'T\\,\\text{(K)}=T\\,\\text{(°C)}+273', 'A change of 1 K is the same size as a change of 1 °C.'],
    ['Light year (ly)', '1\\,\\mathrm{ly}=9.46\\times10^{15}\\,\\mathrm{m}', 'The distance light travels in a vacuum in one year.'],
    ['Parsec (pc)', '1\\,\\mathrm{pc}=3.26\\,\\mathrm{ly}', 'The distance at which a star has a parallax angle of one arc-second.'],
    ['Astronomical unit (AU)', '1\\,\\mathrm{AU}=1.50\\times10^{11}\\,\\mathrm{m}', 'The average distance from the Earth to the Sun.'],
    ['Kilowatt-hour (kWh)', '1\\,\\mathrm{kWh}=3.60\\times10^{6}\\,\\mathrm{J}', 'The energy transferred by a 1 kW device in one hour.'],
    ['Planck constant × speed of light', 'hc=1.99\\times10^{-25}\\,\\mathrm{J\\,m}=1.24\\times10^{-6}\\,\\mathrm{eV\\,m}', 'A shortcut for photon energy: divide by the wavelength in metres.']
  ];

  // Circuit symbols, drawn on a 120 × 60 grid with the wire along y = 30.
  const W = (x1, x2) => `<path d="M${x1},30 H${x2}"/>`;
  const CIRCUIT = [
    ['Cell', W(10, 52) + W(68, 110) + '<path d="M52,10 V50 M68,20 V40"/>', 'The longer line is the positive terminal.'],
    ['Battery', W(6, 36) + W(84, 114) + '<path d="M36,10 V50 M46,20 V40 M74,10 V50 M84,20 V40"/><path d="M50,30 H70" stroke-dasharray="3 3"/>', 'Two or more cells in series.'],
    ['Switch', W(10, 46) + W(78, 110) + '<path d="M46,30 L74,14"/>', 'Shown open: no current.'],
    ['Voltmeter', W(10, 42) + W(78, 110) + '<circle cx="60" cy="30" r="18"/><text x="60" y="36">V</text>', 'Connected in parallel; ideal resistance is infinite.'],
    ['Ammeter', W(10, 42) + W(78, 110) + '<circle cx="60" cy="30" r="18"/><text x="60" y="36">A</text>', 'Connected in series; ideal resistance is zero.'],
    ['Resistor', W(6, 30) + W(90, 114) + '<rect x="30" y="20" width="60" height="20"/>', 'A fixed resistance.'],
    ['Variable resistor', W(6, 30) + W(90, 114) + '<rect x="30" y="20" width="60" height="20"/><path d="M36,52 L84,8"/><path class="fill" d="M84,8 L74,10 L80,18 Z"/>', 'Its resistance can be set by hand.'],
    ['Light-dependent resistor (LDR)', W(6, 30) + W(90, 114) + '<rect x="30" y="26" width="60" height="20"/><path d="M40,2 L54,16 M52,0 L66,14"/><path class="fill" d="M54,16 L46,13 L51,8 Z M66,14 L58,11 L63,6 Z"/>', 'Resistance falls as the light gets brighter.'],
    ['Thermistor', W(6, 30) + W(90, 114) + '<rect x="30" y="20" width="60" height="20"/><path d="M30,50 L78,10 H92"/>', 'Resistance changes with temperature.'],
    ['Potentiometer', W(6, 30) + W(90, 114) + '<rect x="30" y="26" width="60" height="20"/><path d="M60,0 V20"/><path class="fill" d="M60,26 L55,16 H65 Z"/>', 'A resistor with a sliding contact, used as a potential divider.'],
    ['Lamp', W(10, 42) + W(78, 110) + '<circle cx="60" cy="30" r="18"/><path d="M47,17 L73,43 M73,17 L47,43"/>', 'A filament lamp is a non-ohmic device.'],
    ['Light-emitting diode (LED)', W(10, 46) + W(74, 110) + '<path d="M46,14 V46 L74,30 Z M74,14 V46"/><path d="M62,10 L74,0 M72,16 L84,6"/><path class="fill" d="M74,0 L66,2 L71,8 Z M84,6 L76,8 L81,14 Z"/>', 'Conducts in one direction only, and emits light when it does.'],
    ['Heating element', W(6, 24) + W(96, 114) + '<rect x="24" y="20" width="72" height="20"/><path d="M42,20 V40 M60,20 V40 M78,20 V40"/>', 'A resistor designed to get hot.'],
    ['Motor', W(10, 42) + W(78, 110) + '<circle cx="60" cy="30" r="18"/><text x="60" y="36">M</text>', 'Transfers electrical energy to kinetic energy.'],
    ['Earth (ground)', '<path d="M60,4 V34 M42,34 H78 M48,42 H72 M54,50 H66"/>', 'A connection to zero potential.']
  ];

  const levelTag = level => level === HL ? '<span class="tag hl">Additional HL</span>' : '<span class="tag sl">SL + HL</span>';

  function symbolList(block) {
    const all = { ...(block.syms || {}) };
    block.eqs.forEach(eq => { if (eq.syms) Object.entries(eq.syms).forEach(([key, text]) => { all[key] = all[key] && all[key] !== text ? `${all[key]}; or ${text}` : text; }); });
    const rows = Object.entries(all).map(([key, text]) => `<div><dt>\\(${key}\\)</dt><dd>${esc(text)}</dd></div>`).join('');
    return rows ? `<details class="key"><summary>All symbols in this box</summary><dl>${rows}</dl></details>` : '';
  }

  const blockHtml = block => `<article class="card ${block.level === HL ? 'hl' : ''}">
      <h3>${block.id ? `<span class="code">${block.id}</span>` : ''}${esc(block.title)} ${block.level ? levelTag(block.level) : ''}</h3>
      <ul class="eqs">${equationRows(block)}</ul>${symbolList(block)}
    </article>`;

  function constantsHtml() {
    const rows = CONSTANTS.map(([name, tex, value, text]) =>
      `<tr><td class="name">${esc(name)}</td><td class="sym">\\(${symbol(tex, `${name}. ${text}`)}\\)</td><td class="value">${mathHtml(value)}</td><td class="what">${esc(text)}</td></tr>`).join('');
    return `<div class="scroll"><table class="constants"><thead><tr><th>Quantity</th><th>Symbol</th><th>Approximate value</th><th>What it is</th></tr></thead><tbody>${rows}</tbody></table></div>`;
  }

  const multipliersHtml = () => `<ul class="multipliers">${MULTIPLIERS.map(([name, abbr, power]) => `<li><b>${abbr}</b><span>${name}</span>\\(10^{${power}}\\)</li>`).join('')}</ul>`;

  const conversionsHtml = () => `<article class="card"><ul class="eqs">${CONVERSIONS.map(([label, tex, note]) => `<li class="eq"><span class="eq-label">${esc(label)}</span>${mathHtml(tex)}<span class="eq-note">${esc(note)}</span></li>`).join('')}</ul></article>`;

  const circuitHtml = () => `<div class="symbols">${CIRCUIT.map(([name, body, note]) => `<figure><svg viewBox="0 0 120 60" role="img" aria-label="${esc(name)} symbol">${body}</svg><figcaption><b>${esc(name)}</b>${esc(note)}</figcaption></figure>`).join('')}</div>`;

  // Bands of the electromagnetic spectrum by wavelength in metres (powers of ten), as in the booklet's chart.
  function spectrumHtml() {
    const bands = [['γ rays', -16, -11], ['X-rays', -11, -8], ['UV', -8, -6.4], ['visible', -6.4, -6.15], ['IR', -6.15, -3.7], ['microwaves', -3.7, -0.3], ['radio waves', -0.3, 8]];
    const x = power => 30 + (power + 16) / 24 * 900;
    let s = '';
    bands.forEach(([name, from, to], i) => {
      const visible = name === 'visible';
      s += `<rect x="${x(from)}" y="60" width="${x(to) - x(from)}" height="56" class="${visible ? 'vis' : i % 2 ? 'band alt' : 'band'}"/>`;
      if (!visible) s += `<text x="${(x(from) + x(to)) / 2}" y="94" class="name">${name}</text>`;
    });
    for (let power = -16; power <= 8; power += 2) s += `<path d="M${x(power)},52 V60"/><text x="${x(power)}" y="42" class="tick">10<tspan dy="-7" font-size="11">${String(power).replace('-', '−')}</tspan></text>`;
    s += `<text x="945" y="20" class="axis" text-anchor="end">wavelength / m</text><path d="M330,16 H110" class="arrow"/><path d="M110,16 l12,-5 v10 z" class="head"/><text x="340" y="21" class="axis">energy of each photon increases</text>`;
    s += `<path d="M${x(-6.4)},116 L330,150 M${x(-6.15)},116 L510,150" class="zoom"/><rect x="330" y="150" width="180" height="26" class="rainbow"/><text x="330" y="196" class="tick" text-anchor="start">400 nm</text><text x="510" y="196" class="tick" text-anchor="end">700 nm</text><text x="420" y="168" class="vibgyor">V I B G Y O R</text>`;
    return `<div class="scroll spectrum"><svg viewBox="0 0 960 206" role="img" aria-label="Electromagnetic spectrum by wavelength: gamma rays below about 10 to the minus 11 metres, then X-rays, ultraviolet, visible light from 400 to 700 nanometres, infrared, microwaves and radio waves"><defs><linearGradient id="rainbow"><stop offset="0" stop-color="#7B2FBE"/><stop offset=".17" stop-color="#4B3FD1"/><stop offset=".33" stop-color="#2F7FE0"/><stop offset=".5" stop-color="#3FB54A"/><stop offset=".67" stop-color="#F2D43D"/><stop offset=".83" stop-color="#F08A2E"/><stop offset="1" stop-color="#D9342B"/></linearGradient></defs>${s}</svg></div>`;
  }

  const vectorHtml = `<figure class="vector"><svg viewBox="0 0 300 190" role="img" aria-label="A vector A at an angle theta above the horizontal, with horizontal component A H and vertical component A V"><path d="M40,160 H260 M40,160 V30" class="dash"/><path d="M40,160 L250,36" class="vec"/><path d="M250,36 l-16,3 l8,12 z" class="vhead"/><path d="M84,160 A44,44 0 0 0 78,138" class="arc"/><text x="96" y="150">θ</text><text x="258" y="34">A</text><text x="268" y="166">A<tspan dy="5" font-size="12">H</tspan></text><text x="14" y="34">A<tspan dy="5" font-size="12">V</tspan></text></svg></figure>`;

  const sectionHtml = (id, title, body, letter = '', sub = '') => `<section id="${id}"><h2>${letter ? `<span class="letter">${letter}</span>` : ''}${esc(title)}</h2>${sub ? `<p class="sub">${sub}</p>` : ''}${body}</section>`;

  document.getElementById('booklet').innerHTML = [
    sectionHtml('maths', 'Mathematical equations', `<div class="grid two">${blockHtml({ ...MATHS, title: 'Areas, volumes, vectors and trigonometry' })}${vectorHtml}</div>`),
    sectionHtml('uncertainties', 'Uncertainties', blockHtml({ ...UNCERTAINTIES, title: 'Combining uncertainties' })),
    sectionHtml('constants', 'Fundamental constants', constantsHtml(), '', 'Values are those of the data booklet, rounded as it rounds them.'),
    sectionHtml('multipliers', 'Metric (SI) multipliers', multipliersHtml()),
    sectionHtml('conversions', 'Unit conversions', conversionsHtml()),
    sectionHtml('circuit-symbols', 'Electrical circuit symbols', circuitHtml()),
    sectionHtml('spectrum', 'Electromagnetic spectrum', spectrumHtml(), '', 'The boundaries between regions are approximate.'),
    ...THEMES.map(theme => sectionHtml(`theme-${theme.letter.toLowerCase()}`, theme.title, theme.topics.map(blockHtml).join(''), theme.letter))
  ].join('');
})();
