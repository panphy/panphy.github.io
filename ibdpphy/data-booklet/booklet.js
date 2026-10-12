// Annotated data booklet: the constants and equations of the DP Physics data
// booklet (first assessment 2025, version 1.2), each symbol explained on hover,
// focus or tap. The page is built from the data below, then typeset by MathJax.
//
// An equation is LaTeX. Every symbol named in its block's `syms` (or in an
// equation's own `syms`, or in COMMON) is wrapped in \class{sy sy-N}{…} so that
// the typeset symbol can be found again and given its explanation. Write the
// symbol in `syms` exactly as it appears in the equation, e.g. 'F_\\mathrm{f}'.
(() => {
  const SL = 'sl', HL = 'hl';

  // Symbols that mean the same wherever they appear.
  const COMMON = {
    '\\Delta': '“change in”: final value minus initial value',
    '\\pi': 'the constant π ≈ 3.14',
    '\\Sigma': '“sum of”: add up the term for every part'
  };

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
      { label: 'Adding or subtracting: if \\(y=a\\pm b\\)', tex: '\\Delta y=\\Delta a+\\Delta b', note: 'Add the absolute uncertainties.' },
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
    ['Angle', '1\\ \\text{radian (rad)}\\equiv\\dfrac{180^{\\circ}}{\\pi}', 'About 57.3°. A full circle is 2π radians.'],
    ['Temperature', '\\text{temperature (K)}=\\text{temperature (°C)}+273', 'A change of 1 K is the same size as a change of 1 °C.'],
    ['Light year', '1\\ \\text{light year (ly)}=9.46\\times10^{15}\\,\\mathrm{m}', 'The distance light travels in a vacuum in one year.'],
    ['Parsec', '1\\ \\text{parsec (pc)}=3.26\\,\\mathrm{ly}', 'The distance at which a star has a parallax angle of one arc-second.'],
    ['Astronomical unit', '1\\ \\text{astronomical unit (AU)}=1.50\\times10^{11}\\,\\mathrm{m}', 'The average distance from the Earth to the Sun.'],
    ['Kilowatt-hour', '1\\ \\text{kilowatt-hour (kWh)}=3.60\\times10^{6}\\,\\mathrm{J}', 'The energy transferred by a 1 kW device in one hour.'],
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

  const THEMES = [
    {
      letter: 'A', title: 'Space, time and motion', topics: [
        {
          id: 'A.1', title: 'Kinematics', level: SL,
          syms: { s: 'displacement (m)', u: 'initial velocity (m s⁻¹)', v: 'final velocity (m s⁻¹)', a: 'acceleration, which must be constant (m s⁻²)', t: 'time taken (s)' },
          eqs: ['s=\\dfrac{u+v}{2}t', 'v=u+at', 's=ut+\\tfrac{1}{2}at^{2}', 'v^{2}=u^{2}+2as']
        },
        {
          id: 'A.2', title: 'Forces and momentum', level: SL,
          syms: {
            'F_\\mathrm{f}': 'surface frictional force (N)', '\\mu_\\mathrm{s}': 'coefficient of static friction (no unit)', '\\mu_\\mathrm{d}': 'coefficient of dynamic friction (no unit)', 'F_\\mathrm{N}': 'normal force: the contact force at right angles to the surface (N)',
            'F_\\mathrm{H}': 'elastic restoring force of a spring, Hooke’s law (N)', k: 'spring constant (N m⁻¹)', x: 'extension or compression from the natural length (m)',
            'F_\\mathrm{d}': 'viscous drag force on a small sphere (N)', '\\eta': 'viscosity of the fluid (Pa s)', r: 'radius: of the sphere, or of the circular path (m)', v: 'speed (m s⁻¹)',
            'F_\\mathrm{b}': 'buoyancy force (N)', '\\rho': 'density of the fluid (kg m⁻³)', V: 'volume of fluid displaced (m³)', g: 'gravitational field strength (N kg⁻¹)',
            'F_\\mathrm{g}': 'gravitational force on the body: its weight (N)', m: 'mass (kg)', p: 'linear momentum (kg m s⁻¹)', J: 'impulse (N s)', F: 'resultant force (N)',
            '\\Delta t': 'time for which the force acts (s)', '\\Delta p': 'change in momentum (kg m s⁻¹)', a: 'acceleration; for circular motion, the centripetal acceleration (m s⁻²)',
            '\\omega': 'angular velocity (rad s⁻¹)', T: 'time period of one revolution (s)'
          },
          eqs: ['F_\\mathrm{f}\\le\\mu_\\mathrm{s}F_\\mathrm{N}', 'F_\\mathrm{f}=\\mu_\\mathrm{d}F_\\mathrm{N}', 'F_\\mathrm{H}=-kx', 'F_\\mathrm{d}=6\\pi\\eta rv', 'F_\\mathrm{b}=\\rho Vg', 'F_\\mathrm{g}=mg', 'p=mv', 'J=F\\Delta t', 'F=ma=\\dfrac{\\Delta p}{\\Delta t}', 'a=\\dfrac{v^{2}}{r}=\\omega^{2}r=\\dfrac{4\\pi^{2}r}{T^{2}}', 'v=\\dfrac{2\\pi r}{T}=\\omega r']
        },
        {
          id: 'A.3', title: 'Work, energy and power', level: SL,
          syms: {
            W: 'work done by the force (J)', F: 'force (N)', s: 'displacement (m)', '\\theta': 'angle between the force and the displacement',
            'E_\\mathrm{k}': 'kinetic energy (J)', m: 'mass (kg)', v: 'speed (m s⁻¹)', p: 'momentum (kg m s⁻¹)',
            '\\Delta E_\\mathrm{p}': 'change in gravitational potential energy, near the Earth’s surface (J)', g: 'gravitational field strength (N kg⁻¹)', '\\Delta h': 'change in height (m)',
            'E_\\mathrm{H}': 'elastic potential energy stored in a spring (J)', k: 'spring constant (N m⁻¹)', '\\Delta x': 'extension or compression (m)',
            P: 'power (W)', '\\Delta W': 'work done (J)', '\\Delta t': 'time taken (s)', '\\eta': 'efficiency (no unit; often given as a percentage)'
          },
          eqs: ['W=Fs\\cos\\theta', 'E_\\mathrm{k}=\\tfrac{1}{2}mv^{2}=\\dfrac{p^{2}}{2m}', '\\Delta E_\\mathrm{p}=mg\\Delta h', 'E_\\mathrm{H}=\\tfrac{1}{2}k\\Delta x^{2}', 'P=\\dfrac{\\Delta W}{\\Delta t}=Fv', '\\eta=\\dfrac{\\text{useful work out}}{\\text{total work in}}=\\dfrac{\\text{useful power out}}{\\text{total power in}}']
        },
        {
          id: 'A.4', title: 'Rigid body mechanics', level: HL,
          syms: {
            '\\tau': 'torque (N m)', F: 'force (N)', r: 'distance from the axis to where the force acts; for a point mass, its distance from the axis (m)', '\\theta': 'angle between the force and the line from the axis',
            '\\Delta\\theta': 'angular displacement (rad)', '\\omega_\\mathrm{f}': 'final angular velocity (rad s⁻¹)', '\\omega_\\mathrm{i}': 'initial angular velocity (rad s⁻¹)', '\\omega': 'angular velocity (rad s⁻¹)',
            '\\alpha': 'angular acceleration, which must be constant (rad s⁻²)', t: 'time taken (s)', I: 'moment of inertia (kg m²)', m: 'mass of each point (kg)',
            L: 'angular momentum (kg m² s⁻¹)', '\\Delta L': 'change in angular momentum: the angular impulse (kg m² s⁻¹)', '\\Delta t': 'time for which the torque acts (s)', 'E_\\mathrm{k}': 'rotational kinetic energy (J)'
          },
          eqs: ['\\tau=Fr\\sin\\theta', '\\Delta\\theta=\\dfrac{\\omega_\\mathrm{f}+\\omega_\\mathrm{i}}{2}t', '\\omega_\\mathrm{f}=\\omega_\\mathrm{i}+\\alpha t', '\\Delta\\theta=\\omega_\\mathrm{i}t+\\tfrac{1}{2}\\alpha t^{2}', '\\omega_\\mathrm{f}^{2}=\\omega_\\mathrm{i}^{2}+2\\alpha\\Delta\\theta', 'I=\\Sigma mr^{2}', '\\tau=I\\alpha', 'L=I\\omega', '\\Delta L=\\tau\\Delta t', '\\Delta L=\\Delta(I\\omega)', 'E_\\mathrm{k}=\\tfrac{1}{2}I\\omega^{2}=\\dfrac{L^{2}}{2I}']
        },
        {
          id: 'A.5', title: 'Galilean and special relativity', level: HL,
          syms: {
            "x'": 'position of the event in the moving frame (m)', x: 'position of the event in the first frame (m)', "t'": 'time of the event in the moving frame (s)', t: 'time of the event in the first frame (s)',
            v: 'speed of the moving frame relative to the first frame (m s⁻¹)', "u'": 'velocity of the object measured in the moving frame (m s⁻¹)', u: 'velocity of the object measured in the first frame (m s⁻¹)',
            '\\gamma': 'Lorentz factor: 1 at low speed, larger as v approaches c (no unit)', c: 'speed of light in a vacuum',
            '\\Delta s': 'space–time interval between two events: the same in every inertial frame', '\\Delta t': 'time between the two events in this frame (s)', '\\Delta x': 'distance between the two events in this frame (m)',
            '\\Delta t_{0}': 'proper time interval: measured in the frame where both events happen at the same place (s)', L: 'length measured in a frame where the object is moving (m)', 'L_{0}': 'proper length: measured in the frame where the object is at rest (m)',
            '\\theta': 'angle between the world line and the ct axis on a space–time diagram'
          },
          eqs: [
            { label: 'Galilean transformations', tex: "x'=x-vt" }, "t'=t", "u'=u-v",
            { label: 'Lorentz transformations', tex: "x'=\\gamma(x-vt)\\quad\\text{where}\\quad\\gamma=\\dfrac{1}{\\sqrt{1-\\dfrac{v^{2}}{c^{2}}}}" }, "t'=\\gamma\\left(t-\\dfrac{vx}{c^{2}}\\right)", "u'=\\dfrac{u-v}{1-\\dfrac{uv}{c^{2}}}",
            '(\\Delta s)^{2}=(c\\Delta t)^{2}-\\Delta x^{2}', '\\Delta t=\\gamma\\Delta t_{0}', 'L=\\dfrac{L_{0}}{\\gamma}', '\\tan\\theta=\\dfrac{v}{c}'
          ]
        }
      ]
    },
    {
      letter: 'B', title: 'The particulate nature of matter', topics: [
        {
          id: 'B.1', title: 'Thermal energy transfers', level: SL,
          syms: {
            '\\rho': 'density (kg m⁻³)', m: 'mass (kg)', V: 'volume (m³)', '\\bar{E}_\\mathrm{k}': 'average kinetic energy of one particle (J)', 'k_\\mathrm{B}': 'Boltzmann constant', T: 'absolute temperature (K)',
            Q: 'thermal energy transferred (J)', c: 'specific heat capacity (J kg⁻¹ K⁻¹)', '\\Delta T': 'temperature change, or temperature difference across the material (K)',
            '\\dfrac{\\Delta Q}{\\Delta t}': 'rate of thermal energy transfer by conduction (W)', k: 'thermal conductivity of the material (W m⁻¹ K⁻¹)', A: 'area: cross-section for conduction, or surface area of the radiating body (m²)', '\\Delta x': 'thickness of the material (m)',
            '\\sigma': 'Stefan–Boltzmann constant', b: 'apparent brightness: power received per unit area (W m⁻²)', d: 'distance from the source (m)', '\\lambda_\\mathrm{max}': 'wavelength at which the black body emits most strongly (m)'
          },
          eqs: [
            '\\rho=\\dfrac{m}{V}', '\\bar{E}_\\mathrm{k}=\\tfrac{3}{2}k_\\mathrm{B}T', 'Q=mc\\Delta T',
            { tex: 'Q=mL', syms: { L: 'specific latent heat of fusion or vaporization (J kg⁻¹)' } },
            '\\dfrac{\\Delta Q}{\\Delta t}=-kA\\dfrac{\\Delta T}{\\Delta x}',
            { tex: 'L=\\sigma AT^{4}', syms: { L: 'luminosity: total power radiated by the body (W)' } },
            { tex: 'b=\\dfrac{L}{4\\pi d^{2}}', syms: { L: 'luminosity of the source (W)' } },
            '\\lambda_\\mathrm{max}T=2.9\\times10^{-3}\\,\\mathrm{m\\,K}'
          ]
        },
        {
          id: 'B.2', title: 'Greenhouse effect', level: SL,
          syms: { '\\sigma': 'Stefan–Boltzmann constant', T: 'absolute temperature of the surface (K)' },
          eqs: ['\\text{emissivity}=\\dfrac{\\text{power radiated per unit area}}{\\sigma T^{4}}', '\\text{albedo}=\\dfrac{\\text{total scattered power}}{\\text{total incident power}}']
        },
        {
          id: 'B.3', title: 'Gas laws', level: SL,
          syms: {
            P: 'pressure (Pa)', F: 'force acting at right angles to the surface (N)', A: 'area of the surface (m²)', n: 'amount of substance (mol)', N: 'number of molecules', 'N_\\mathrm{A}': 'Avogadro constant',
            V: 'volume of the gas (m³)', T: 'absolute temperature (K)', R: 'gas constant', 'k_\\mathrm{B}': 'Boltzmann constant', '\\rho': 'density of the gas (kg m⁻³)', v: 'average (root-mean-square) translational speed of the molecules (m s⁻¹)', U: 'internal energy of an ideal monatomic gas (J)'
          },
          eqs: ['P=\\dfrac{F}{A}', 'n=\\dfrac{N}{N_\\mathrm{A}}', '\\dfrac{PV}{T}=\\text{constant}', 'PV=nRT=Nk_\\mathrm{B}T', 'P=\\tfrac{1}{3}\\rho v^{2}', 'U=\\tfrac{3}{2}nRT=\\tfrac{3}{2}Nk_\\mathrm{B}T']
        },
        {
          id: 'B.4', title: 'Thermodynamics', level: HL,
          syms: {
            Q: 'thermal energy supplied to the system (J)', '\\Delta U': 'change in internal energy of the system (J)', W: 'work done by the system (J)', P: 'pressure (Pa)', '\\Delta V': 'change in volume (m³)', V: 'volume (m³)',
            n: 'amount of gas (mol)', R: 'gas constant', N: 'number of molecules', 'k_\\mathrm{B}': 'Boltzmann constant', '\\Delta T': 'temperature change (K)',
            '\\Delta S': 'change in entropy (J K⁻¹)', '\\Delta Q': 'thermal energy transferred (J)', T: 'absolute temperature at which the transfer happens (K)', S: 'entropy (J K⁻¹)', '\\Omega': 'number of possible microstates of the system',
            '\\eta': 'efficiency of the heat engine (no unit)', '\\eta_\\mathrm{Carnot}': 'the greatest efficiency possible between two reservoirs', 'T_\\mathrm{c}': 'temperature of the cold reservoir (K)', 'T_\\mathrm{h}': 'temperature of the hot reservoir (K)'
          },
          eqs: ['Q=\\Delta U+W', 'W=P\\Delta V', '\\Delta U=\\tfrac{3}{2}nR\\Delta T=\\tfrac{3}{2}Nk_\\mathrm{B}\\Delta T', '\\Delta S=\\dfrac{\\Delta Q}{T}', 'S=k_\\mathrm{B}\\ln\\Omega', { tex: 'PV^{\\frac{5}{3}}=\\text{constant}', note: 'Adiabatic change of a monatomic ideal gas.' }, '\\eta=\\dfrac{\\text{useful work}}{\\text{input energy}}', '\\eta_\\mathrm{Carnot}=1-\\dfrac{T_\\mathrm{c}}{T_\\mathrm{h}}']
        },
        {
          id: 'B.5', title: 'Current and circuits', level: SL,
          syms: {
            I: 'current (A)', '\\Delta q': 'charge that flows past a point (C)', '\\Delta t': 'time taken (s)', V: 'potential difference (V)', W: 'work done on the charge (J)', q: 'charge moved (C)',
            R: 'resistance (Ω)', '\\rho': 'resistivity of the material (Ω m)', A: 'cross-sectional area of the conductor (m²)', L: 'length of the conductor (m)', P: 'power dissipated (W)',
            'I_{1}': 'current in the first component (A)', 'I_{2}': 'current in the second component (A)', 'V_{1}': 'p.d. across the first component (V)', 'V_{2}': 'p.d. across the second component (V)',
            'R_{1}': 'resistance of the first resistor (Ω)', 'R_{2}': 'resistance of the second resistor (Ω)', 'R_\\mathrm{s}': 'total resistance of resistors in series (Ω)', 'R_\\mathrm{p}': 'total resistance of resistors in parallel (Ω)',
            '\\varepsilon': 'emf of the cell (V)', r: 'internal resistance of the cell (Ω)'
          },
          eqs: [
            'I=\\dfrac{\\Delta q}{\\Delta t}', 'V=\\dfrac{W}{q}', 'R=\\dfrac{V}{I}', '\\rho=\\dfrac{RA}{L}', 'P=IV=I^{2}R=\\dfrac{V^{2}}{R}',
            { label: 'Series circuits', tex: 'I=I_{1}=I_{2}=\\dots' }, 'V=V_{1}+V_{2}+\\dots', 'R_\\mathrm{s}=R_{1}+R_{2}+\\dots',
            { label: 'Parallel circuits', tex: 'I=I_{1}+I_{2}+\\dots' }, 'V=V_{1}=V_{2}=\\dots', '\\dfrac{1}{R_\\mathrm{p}}=\\dfrac{1}{R_{1}}+\\dfrac{1}{R_{2}}+\\dots',
            { label: 'Cell with internal resistance', tex: '\\varepsilon=I(R+r)', syms: { R: 'resistance of the external circuit (Ω)' } }
          ]
        }
      ]
    },
    {
      letter: 'C', title: 'Wave behaviour', topics: [
        {
          id: 'C.1', title: 'Simple harmonic motion', level: SL,
          syms: { a: 'acceleration (m s⁻²)', '\\omega': 'angular frequency (rad s⁻¹)', x: 'displacement from the equilibrium position (m)', T: 'time period (s)', f: 'frequency (Hz)', m: 'mass on the spring (kg)', k: 'spring constant (N m⁻¹)', l: 'length of the pendulum (m)', g: 'gravitational field strength (N kg⁻¹)' },
          eqs: ['a=-\\omega^{2}x', 'T=\\dfrac{1}{f}=\\dfrac{2\\pi}{\\omega}', { label: 'Mass–spring system', tex: 'T=2\\pi\\sqrt{\\dfrac{m}{k}}' }, { label: 'Simple pendulum', tex: 'T=2\\pi\\sqrt{\\dfrac{l}{g}}' }]
        },
        {
          id: 'C.2', title: 'Wave model', level: SL,
          syms: { v: 'wave speed (m s⁻¹)', f: 'frequency (Hz)', '\\lambda': 'wavelength (m)', T: 'time period (s)' },
          eqs: ['v=f\\lambda=\\dfrac{\\lambda}{T}']
        },
        {
          id: 'C.3', title: 'Wave phenomena', level: SL,
          syms: {
            'n_{1}': 'refractive index of the first medium', 'n_{2}': 'refractive index of the second medium', '\\theta_{1}': 'angle between the ray and the normal in the first medium', '\\theta_{2}': 'angle between the ray and the normal in the second medium',
            'v_{1}': 'wave speed in the first medium (m s⁻¹)', 'v_{2}': 'wave speed in the second medium (m s⁻¹)', n: 'a whole number: 0, 1, 2 …', '\\lambda': 'wavelength (m)',
            s: 'separation of neighbouring fringes on the screen (m)', D: 'distance from the slits to the screen (m)', d: 'separation of the two slits (m)'
          },
          eqs: [
            { label: 'Snell’s law', tex: '\\dfrac{n_{1}}{n_{2}}=\\dfrac{\\sin\\theta_{2}}{\\sin\\theta_{1}}=\\dfrac{v_{2}}{v_{1}}' },
            { label: 'Constructive interference', tex: '\\text{path difference}=n\\lambda' },
            { label: 'Destructive interference', tex: '\\text{path difference}=\\left(n+\\tfrac{1}{2}\\right)\\lambda' },
            { label: 'Young’s double slit', tex: 's=\\dfrac{\\lambda D}{d}' }
          ]
        },
        {
          id: 'C.5', title: 'Doppler effect', level: SL,
          syms: { '\\Delta f': 'change in frequency (Hz)', f: 'frequency emitted by the source (Hz)', '\\Delta\\lambda': 'change in wavelength (m)', '\\lambda': 'wavelength emitted by the source (m)', v: 'relative speed of source and observer, much smaller than c (m s⁻¹)', c: 'speed of light in a vacuum' },
          eqs: [{ label: 'Light', tex: '\\dfrac{\\Delta f}{f}=\\dfrac{\\Delta\\lambda}{\\lambda}\\approx\\dfrac{v}{c}' }]
        },
        {
          id: 'C.1', title: 'Simple harmonic motion', level: HL,
          syms: { x: 'displacement from equilibrium (m)', 'x_{0}': 'amplitude: the greatest displacement (m)', '\\omega': 'angular frequency (rad s⁻¹)', t: 'time (s)', '\\phi': 'phase angle (rad)', v: 'velocity (m s⁻¹)', 'E_\\mathrm{T}': 'total energy of the oscillator (J)', 'E_\\mathrm{p}': 'potential energy at displacement x (J)', m: 'mass of the oscillator (kg)' },
          eqs: ['x=x_{0}\\sin(\\omega t+\\phi)', 'v=\\omega x_{0}\\cos(\\omega t+\\phi)', 'v=\\pm\\omega\\sqrt{x_{0}^{2}-x^{2}}', 'E_\\mathrm{T}=\\tfrac{1}{2}m\\omega^{2}x_{0}^{2}', 'E_\\mathrm{p}=\\tfrac{1}{2}m\\omega^{2}x^{2}']
        },
        {
          id: 'C.3', title: 'Wave phenomena', level: HL,
          syms: { '\\theta': 'angle from the centre of the pattern (rad for the single slit)', '\\lambda': 'wavelength (m)', b: 'width of the slit (m)', n: 'order of the maximum: 0, 1, 2 …', d: 'separation of neighbouring slits (m)' },
          eqs: [{ label: 'Single slit: first minimum', tex: '\\theta=\\dfrac{\\lambda}{b}' }, { label: 'Multiple slits and gratings: maxima', tex: 'n\\lambda=d\\sin\\theta' }]
        },
        {
          id: 'C.5', title: 'Doppler effect', level: HL,
          syms: { "f'": 'frequency the observer receives (Hz)', f: 'frequency the source emits (Hz)', v: 'speed of the wave in the medium (m s⁻¹)', 'u_\\mathrm{s}': 'speed of the source (m s⁻¹)', 'u_\\mathrm{o}': 'speed of the observer (m s⁻¹)' },
          eqs: [{ label: 'Moving source', tex: "f'=f\\left(\\dfrac{v}{v\\pm u_\\mathrm{s}}\\right)", note: 'Minus when the source approaches.' }, { label: 'Moving observer', tex: "f'=f\\left(\\dfrac{v\\pm u_\\mathrm{o}}{v}\\right)", note: 'Plus when the observer approaches.' }]
        }
      ]
    },
    {
      letter: 'D', title: 'Fields', topics: [
        {
          id: 'D.1', title: 'Gravitational fields', level: SL,
          syms: { F: 'gravitational force (N)', G: 'gravitational constant', 'm_{1}': 'mass of the first body (kg)', 'm_{2}': 'mass of the second body (kg)', r: 'distance between the centres of the two masses (m)', g: 'gravitational field strength (N kg⁻¹)', m: 'small test mass placed in the field (kg)', M: 'mass that produces the field (kg)' },
          eqs: ['F=G\\dfrac{m_{1}m_{2}}{r^{2}}', 'g=\\dfrac{F}{m}=G\\dfrac{M}{r^{2}}']
        },
        {
          id: 'D.2', title: 'Electric and magnetic fields', level: SL,
          syms: { F: 'electric force (N)', k: 'Coulomb constant', 'q_{1}': 'first charge (C)', 'q_{2}': 'second charge (C)', r: 'distance between the two charges (m)', '\\varepsilon_{0}': 'permittivity of free space', E: 'electric field strength (N C⁻¹ or V m⁻¹)', q: 'small test charge placed in the field (C)', V: 'potential difference between the parallel plates (V)', d: 'separation of the plates (m)' },
          eqs: ['F=k\\dfrac{q_{1}q_{2}}{r^{2}}\\quad\\text{where}\\quad k=\\dfrac{1}{4\\pi\\varepsilon_{0}}', 'E=\\dfrac{F}{q}', { label: 'Between parallel plates', tex: 'E=\\dfrac{V}{d}' }]
        },
        {
          id: 'D.3', title: 'Motion in electromagnetic fields', level: SL,
          syms: { F: 'magnetic force (N)', q: 'charge of the particle (C)', v: 'speed of the particle (m s⁻¹)', B: 'magnetic field strength: magnetic flux density (T)', '\\theta': 'angle between the field and the velocity or current', I: 'current in the conductor (A)', L: 'length of conductor in the field (m)', '\\mu_{0}': 'permeability of free space', 'I_{1}': 'current in the first wire (A)', 'I_{2}': 'current in the second wire (A)', r: 'separation of the two wires (m)' },
          eqs: [{ label: 'Moving charge', tex: 'F=qvB\\sin\\theta' }, { label: 'Current-carrying conductor', tex: 'F=BIL\\sin\\theta' }, { label: 'Parallel wires: force per unit length', tex: '\\dfrac{F}{L}=\\mu_{0}\\dfrac{I_{1}I_{2}}{2\\pi r}' }]
        },
        {
          id: 'D.1', title: 'Gravitational fields', level: HL,
          syms: { 'E_\\mathrm{p}': 'gravitational potential energy of the two bodies: zero at infinite separation (J)', G: 'gravitational constant', 'm_{1}': 'mass of the first body (kg)', 'm_{2}': 'mass of the second body (kg)', r: 'distance from the centre of the mass (m)', 'V_\\mathrm{g}': 'gravitational potential: work done per unit mass from infinity (J kg⁻¹)', M: 'mass that produces the field (kg)', g: 'gravitational field strength (N kg⁻¹)', '\\Delta V_\\mathrm{g}': 'change in gravitational potential (J kg⁻¹)', '\\Delta r': 'change in distance (m)', W: 'work done in moving the mass (J)', m: 'mass being moved (kg)', 'v_\\mathrm{esc}': 'escape speed (m s⁻¹)', 'v_\\mathrm{orbital}': 'speed of a body in a circular orbit of radius r (m s⁻¹)' },
          eqs: ['E_\\mathrm{p}=-G\\dfrac{m_{1}m_{2}}{r}', 'V_\\mathrm{g}=-G\\dfrac{M}{r}', 'g=-\\dfrac{\\Delta V_\\mathrm{g}}{\\Delta r}', 'W=m\\Delta V_\\mathrm{g}', 'v_\\mathrm{esc}=\\sqrt{\\dfrac{2GM}{r}}', 'v_\\mathrm{orbital}=\\sqrt{\\dfrac{GM}{r}}']
        },
        {
          id: 'D.2', title: 'Electric and magnetic fields', level: HL,
          syms: { 'E_\\mathrm{p}': 'electric potential energy of the two charges: zero at infinite separation (J)', k: 'Coulomb constant', 'q_{1}': 'first charge (C)', 'q_{2}': 'second charge (C)', r: 'distance from the charge (m)', 'V_\\mathrm{e}': 'electric potential: work done per unit charge from infinity (V)', Q: 'charge that produces the field (C)', E: 'electric field strength (V m⁻¹)', '\\Delta V_\\mathrm{e}': 'change in electric potential (V)', '\\Delta r': 'change in distance (m)', W: 'work done in moving the charge (J)', q: 'charge being moved (C)' },
          eqs: ['E_\\mathrm{p}=k\\dfrac{q_{1}q_{2}}{r}', 'V_\\mathrm{e}=\\dfrac{kQ}{r}', 'E=-\\dfrac{\\Delta V_\\mathrm{e}}{\\Delta r}', 'W=q\\Delta V_\\mathrm{e}']
        },
        {
          id: 'D.4', title: 'Induction', level: HL,
          syms: { '\\Phi': 'magnetic flux (Wb)', B: 'magnetic field strength (T)', A: 'area of the loop (m²)', '\\theta': 'angle between the field and the normal to the loop', '\\varepsilon': 'induced emf (V)', N: 'number of turns on the coil', '\\Delta\\Phi': 'change in magnetic flux through one turn (Wb)', '\\Delta t': 'time taken for the change (s)', v: 'speed of the conductor, at right angles to the field (m s⁻¹)', L: 'length of the conductor in the field (m)' },
          eqs: ['\\Phi=BA\\cos\\theta', { label: 'Faraday’s law', tex: '\\varepsilon=-N\\dfrac{\\Delta\\Phi}{\\Delta t}' }, { label: 'Straight conductor moving across a field', tex: '\\varepsilon=BvL' }]
        }
      ]
    },
    {
      letter: 'E', title: 'Nuclear and quantum physics', topics: [
        { id: 'E.1', title: 'Structure of the atom', level: SL, syms: { E: 'energy of the photon (J)', h: 'Planck constant', f: 'frequency of the photon (Hz)' }, eqs: ['E=hf'] },
        { id: 'E.3', title: 'Radioactive decay', level: SL, syms: { E: 'energy equivalent to the mass (J)', m: 'mass: in nuclear reactions, the mass defect (kg)', c: 'speed of light in a vacuum' }, eqs: ['E=mc^{2}'] },
        { id: 'E.5', title: 'Fusion and stars', level: SL, syms: { d: 'distance to the star, in parsecs', p: 'parallax angle of the star, in arc-seconds' }, eqs: ['d\\,\\text{(parsec)}=\\dfrac{1}{p\\,\\text{(arc-second)}}'] },
        {
          id: 'E.1', title: 'Structure of the atom', level: HL,
          syms: { R: 'radius of the nucleus (m)', 'R_{0}': 'Fermi radius', A: 'nucleon number', E: 'energy of the level in hydrogen (eV)', n: 'number of the energy level: 1, 2, 3 …', m: 'mass of the electron (kg)', v: 'speed of the electron in its orbit (m s⁻¹)', r: 'radius of the orbit (m)', h: 'Planck constant' },
          eqs: ['R=R_{0}A^{\\frac{1}{3}}', { label: 'Bohr model for hydrogen', tex: 'E=-\\dfrac{13.6}{n^{2}}\\,\\mathrm{eV}' }, 'mvr=\\dfrac{nh}{2\\pi}']
        },
        {
          id: 'E.2', title: 'Quantum physics', level: HL,
          syms: { 'E_\\mathrm{max}': 'maximum kinetic energy of the photoelectrons (J or eV)', h: 'Planck constant', f: 'frequency of the light (Hz)', '\\Phi': 'work function of the metal (J or eV)', '\\lambda': 'de Broglie wavelength of the particle (m)', p: 'momentum of the particle (kg m s⁻¹)', '\\lambda_\\mathrm{f}': 'wavelength of the photon after scattering (m)', '\\lambda_\\mathrm{i}': 'wavelength of the photon before scattering (m)', '\\Delta\\lambda': 'shift in the photon’s wavelength (m)', 'm_\\mathrm{e}': 'electron rest mass', c: 'speed of light in a vacuum', '\\theta': 'angle the photon is scattered through' },
          eqs: [{ label: 'Photoelectric effect', tex: 'E_\\mathrm{max}=hf-\\Phi' }, { label: 'de Broglie wavelength', tex: '\\lambda=\\dfrac{h}{p}' }, { label: 'Compton scattering', tex: '\\lambda_\\mathrm{f}-\\lambda_\\mathrm{i}=\\Delta\\lambda=\\dfrac{h}{m_\\mathrm{e}c}(1-\\cos\\theta)' }]
        },
        {
          id: 'E.3', title: 'Radioactive decay', level: HL,
          syms: { N: 'number of undecayed nuclei at time t', 'N_{0}': 'number of undecayed nuclei at the start', e: 'base of natural logarithms, 2.718…', '\\lambda': 'decay constant: probability of decay per unit time (s⁻¹)', t: 'time elapsed (s)', A: 'activity: number of decays per second (Bq)', 'T_{\\frac{1}{2}}': 'half-life (s)' },
          eqs: ['N=N_{0}e^{-\\lambda t}', 'A=\\lambda N=\\lambda N_{0}e^{-\\lambda t}', 'T_{\\frac{1}{2}}=\\dfrac{\\ln 2}{\\lambda}']
        }
      ]
    }
  ];

  // ---------- Wrapping the symbols ----------
  const TIPS = [];   // TIPS[n] = { tex, text } for class sy-n
  const tokens = tex => tex.match(/\\[a-zA-Z]+|\\.|[a-zA-Z]|[0-9.]+|\s+|./g) || [];

  // Returns the LaTeX with every known symbol wrapped; longest symbols are matched first.
  function annotate(tex, dict) {
    const keys = Object.keys(dict).map(key => ({ key, toks: tokens(key).filter(t => t.trim()) })).sort((a, b) => b.toks.length - a.toks.length);
    const src = tokens(tex);
    let out = '';
    for (let i = 0; i < src.length;) {
      const tok = src[i];
      // \text{…} and \mathrm{…} hold words and units, not symbols.
      if ((tok === '\\text' || tok === '\\mathrm' || tok === '\\operatorname') && src[i + 1] === '{') {
        let depth = 0, j = i + 1;
        do { depth += src[j] === '{'; depth -= src[j] === '}'; j++; } while (depth && j < src.length);
        out += src.slice(i, j).join(''); i = j; continue;
      }
      let hit = null, end = i;
      for (const { key, toks } of keys) {
        let j = i, k = 0;
        while (k < toks.length && j < src.length) {
          if (!src[j].trim()) { j++; continue; }
          if (src[j] !== toks[k]) break;
          j++; k++;
        }
        if (k === toks.length) { hit = key; end = j; break; }
      }
      if (hit) {
        TIPS.push({ tex: hit, text: dict[hit] });
        out += `\\class{sy sy-${TIPS.length - 1}}{${src.slice(i, end).join('')}}`;
        i = end;
      } else { out += tok; i++; }
    }
    return out;
  }

  const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const levelTag = level => level === HL ? '<span class="tag hl">Additional HL</span>' : '<span class="tag sl">SL + HL</span>';

  function equationRows(block) {
    return block.eqs.map(eq => {
      const item = typeof eq === 'string' ? { tex: eq } : eq;
      const dict = { ...COMMON, ...(block.syms || {}), ...(item.syms || {}) };
      const label = item.label ? `<span class="eq-label">${item.label}</span>` : '';
      const note = item.note ? `<span class="eq-note">${esc(item.note)}</span>` : '';
      return `<li class="eq">${label}<span class="eq-math">\\(${annotate(item.tex, dict)}\\)</span>${note}</li>`;
    }).join('');
  }

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
    const rows = CONSTANTS.map(([name, symbol, value, text]) => {
      TIPS.push({ tex: symbol, text: `${name}. ${text}` });
      return `<tr><td>${esc(name)}</td><td class="sym">\\(\\class{sy sy-${TIPS.length - 1}}{${symbol}}\\)</td><td>\\(${value}\\)</td><td class="what">${esc(text)}</td></tr>`;
    }).join('');
    return `<div class="scroll"><table class="constants"><thead><tr><th>Quantity</th><th>Symbol</th><th>Approximate value</th><th>What it is</th></tr></thead><tbody>${rows}</tbody></table></div>`;
  }

  const multipliersHtml = () => `<div class="scroll"><table class="multipliers"><thead><tr><th>Prefix</th><th>Abbreviation</th><th>Value</th></tr></thead><tbody>${MULTIPLIERS.map(([name, abbr, power]) => `<tr><td>${name}</td><td class="sym">${abbr}</td><td>\\(10^{${power}}\\)</td></tr>`).join('')}</tbody></table></div>`;

  const conversionsHtml = () => `<article class="card"><ul class="eqs">${CONVERSIONS.map(([label, tex, note]) => `<li class="eq"><span class="eq-label">${esc(label)}</span><span class="eq-math">\\(${tex}\\)</span><span class="eq-note">${esc(note)}</span></li>`).join('')}</ul></article>`;

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

  // ---------- Explanations on hover, focus and tap ----------
  const tip = document.getElementById('tip');
  let current = null;

  function show(node) {
    const data = TIPS[Number(node.dataset.tip)];
    if (!data) return;
    current = node;
    tip.innerHTML = `<span class="tip-text">${esc(data.text)}</span>`;
    tip.hidden = false;
    const box = node.getBoundingClientRect(), mine = tip.getBoundingClientRect();
    const left = Math.max(8, Math.min(window.innerWidth - mine.width - 8, box.left + box.width / 2 - mine.width / 2));
    const above = box.top - mine.height - 10;
    tip.style.left = `${left}px`;
    tip.style.top = `${above < 8 ? box.bottom + 10 : above}px`;
  }
  function hide() { tip.hidden = true; current = null; }

  // MathJax draws each wrapped symbol as an SVG group; give it a box to point at and a label to read out.
  function activate() {
    document.querySelectorAll('mjx-container svg .sy').forEach(group => {
      const match = [...group.classList].find(name => /^sy-\d+$/.test(name));
      if (!match || group.dataset.tip) return;
      const index = match.slice(3);
      group.dataset.tip = index;
      group.setAttribute('tabindex', '0');
      group.setAttribute('role', 'note');
      group.setAttribute('aria-label', TIPS[index].text);
      try {
        const box = group.getBBox();
        const pad = 60;
        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('x', box.x - pad); rect.setAttribute('y', box.y - pad);
        rect.setAttribute('width', box.width + pad * 2); rect.setAttribute('height', box.height + pad * 2);
        rect.setAttribute('class', 'sy-hit');
        group.insertBefore(rect, group.firstChild);
      } catch (error) { /* not rendered (inside a closed <details>): done when it opens */ }
    });
  }

  document.addEventListener('pointerover', event => { const node = event.target.closest?.('.sy[data-tip]'); if (node) show(node); else if (event.pointerType === 'mouse') hide(); });
  document.addEventListener('focusin', event => { const node = event.target.closest?.('.sy[data-tip]'); if (node) show(node); });
  document.addEventListener('focusout', hide);
  document.addEventListener('click', event => { const node = event.target.closest?.('.sy[data-tip]'); if (node) { if (current === node && event.detail === 0) hide(); else show(node); } else hide(); });
  document.addEventListener('keydown', event => { if (event.key === 'Escape') hide(); });
  window.addEventListener('scroll', hide, { passive: true });
  window.addEventListener('resize', hide);

  window.BookletReady = () => { activate(); document.body.classList.add('math-ready'); };
})();
