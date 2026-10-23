// Equations of the DP Physics data booklet (first assessment 2025, version 1.2),
// grouped by the syllabus topics of the subject guide. Shared by the
// course summary and the annotated data booklet, which typeset them with MathJax and
// explain each symbol on hover, focus or tap.
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
            '\\Delta E_\\mathrm{p}': 'signed change in gravitational potential energy: final minus initial, near the Earth’s surface (J)', g: 'gravitational field strength (N kg⁻¹)', '\\Delta h': 'final height minus initial height; negative for a fall (m)',
            'E_\\mathrm{H}': 'elastic potential energy stored in a spring (J)', k: 'spring constant (N m⁻¹)', '\\Delta x': 'signed displacement from the spring’s natural length; squared in the energy equation (m)',
            P: 'power (W)', '\\Delta W': 'work done (J)', '\\Delta t': 'time taken (s)', '\\eta': 'efficiency (no unit; often given as a percentage)'
          },
          eqs: ['W=Fs\\cos\\theta', 'E_\\mathrm{k}=\\tfrac{1}{2}mv^{2}=\\dfrac{p^{2}}{2m}', '\\Delta E_\\mathrm{p}=mg\\Delta h', 'E_\\mathrm{H}=\\tfrac{1}{2}k\\Delta x^{2}', 'P=\\dfrac{\\Delta W}{\\Delta t}=Fv', '\\eta=\\dfrac{\\text{useful work out}}{\\text{total work in}}', '\\eta=\\dfrac{\\text{useful power out}}{\\text{total power in}}']
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
            { label: 'Lorentz transformations', tex: "x'=\\gamma(x-vt)" }, { label: 'where', tex: '\\gamma=\\dfrac{1}{\\sqrt{1-\\dfrac{v^{2}}{c^{2}}}}' }, "t'=\\gamma\\left(t-\\dfrac{vx}{c^{2}}\\right)", "u'=\\dfrac{u-v}{1-\\dfrac{uv}{c^{2}}}",
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
            Q: 'signed thermal energy transferred to the body: positive into it, negative out (J)', c: 'specific heat capacity (J kg⁻¹ K⁻¹)', '\\Delta T': 'signed temperature change: final minus initial (K)',
            '\\dfrac{\\Delta Q}{\\Delta t}': 'signed rate of thermal energy transfer along the chosen positive x-direction (W)', k: 'thermal conductivity of the material (W m⁻¹ K⁻¹)', A: 'area: cross-section for conduction, or surface area of the radiating body (m²)', '\\Delta x': 'spatial separation x₂ − x₁, using the same ordered points as the temperature difference (m)',
            '\\sigma': 'Stefan–Boltzmann constant', b: 'apparent brightness: power received per unit area (W m⁻²)', d: 'distance from the source (m)', '\\lambda_\\mathrm{max}': 'wavelength at which the black body emits most strongly (m)'
          },
          eqs: [
            '\\rho=\\dfrac{m}{V}', '\\bar{E}_\\mathrm{k}=\\tfrac{3}{2}k_\\mathrm{B}T', 'Q=mc\\Delta T',
            { tex: '|Q|=mL', syms: { L: 'specific latent heat of fusion or vaporization: a positive magnitude (J kg⁻¹)' }, note: 'The booklet gives the magnitude mL. Signed heat is \\(Q=+mL\\) for melting or vaporization and \\(Q=-mL\\) for freezing or condensation.' },
            { tex: '\\dfrac{\\Delta Q}{\\Delta t}=-kA\\dfrac{\\Delta T}{\\Delta x}', syms: { '\\Delta T': 'spatial temperature difference T₂ − T₁, in the same direction as x₂ − x₁ (K)' }, note: 'Use \\(\\Delta T=T_{2}-T_{1}\\) and \\(\\Delta x=x_{2}-x_{1}\\). The minus sign makes energy flow from hot to cold, opposite to the temperature gradient.' },
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
            Q: 'signed heat: positive into the system, negative out (J)', '\\Delta U': 'internal energy final minus initial (J)', W: 'signed work done by the system: positive for expansion, negative for compression (J)', P: 'pressure (Pa)', '\\Delta V': 'final volume minus initial volume: positive for expansion, negative for compression (m³)', V: 'volume (m³)',
            n: 'amount of gas (mol)', R: 'gas constant', N: 'number of molecules', 'k_\\mathrm{B}': 'Boltzmann constant', '\\Delta T': 'final temperature minus initial temperature (K)',
            '\\Delta S': 'final entropy minus initial entropy (J K⁻¹)', '\\Delta Q': 'signed thermal energy transferred to the system: positive into it, negative out (J)', T: 'absolute temperature at which the transfer happens (K)', S: 'entropy (J K⁻¹)', '\\Omega': 'number of possible microstates of the system',
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
          syms: { '\\Delta f': 'observed frequency minus emitted frequency: negative for recession (Hz)', f: 'frequency emitted by the source (Hz)', '\\Delta\\lambda': 'observed wavelength minus emitted wavelength: positive for recession (m)', '\\lambda': 'wavelength emitted by the source (m)', v: 'relative speed of source and observer, much smaller than c (m s⁻¹)', c: 'speed of light in a vacuum' },
          eqs: [{ label: 'Light: magnitudes', tex: '\\dfrac{|\\Delta f|}{f}\\approx\\dfrac{|\\Delta\\lambda|}{\\lambda}\\approx\\dfrac{v}{c}', note: 'The booklet writes the shifts as magnitudes; bars make that explicit here. Signed shifts are observed minus emitted, with \\(\\frac{\\Delta f}{f}\\approx-\\frac{\\Delta\\lambda}{\\lambda}\\).' }]
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
          eqs: ['F=k\\dfrac{q_{1}q_{2}}{r^{2}}', { label: 'where', tex: 'k=\\dfrac{1}{4\\pi\\varepsilon_{0}}' }, 'E=\\dfrac{F}{q}', { label: 'Between parallel plates', tex: 'E=\\dfrac{V}{d}' }]
        },
        {
          id: 'D.3', title: 'Motion in electromagnetic fields', level: SL,
          syms: { F: 'magnetic force (N)', q: 'charge of the particle (C)', v: 'speed of the particle (m s⁻¹)', B: 'magnetic field strength: magnetic flux density (T)', '\\theta': 'angle between the field and the velocity or current', I: 'current in the conductor (A)', L: 'length of conductor in the field (m)', '\\mu_{0}': 'permeability of free space', 'I_{1}': 'current in the first wire (A)', 'I_{2}': 'current in the second wire (A)', r: 'separation of the two wires (m)' },
          eqs: [{ label: 'Moving charge', tex: 'F=qvB\\sin\\theta' }, { label: 'Current-carrying conductor', tex: 'F=BIL\\sin\\theta' }, { label: 'Parallel wires: force per unit length', tex: '\\dfrac{F}{L}=\\mu_{0}\\dfrac{I_{1}I_{2}}{2\\pi r}' }]
        },
        {
          id: 'D.1', title: 'Gravitational fields', level: HL,
          syms: { 'E_\\mathrm{p}': 'gravitational potential energy of the two bodies: zero at infinite separation (J)', G: 'gravitational constant', 'm_{1}': 'mass of the first body (kg)', 'm_{2}': 'mass of the second body (kg)', r: 'distance from the centre of the mass (m)', 'V_\\mathrm{g}': 'gravitational potential: work done per unit mass from infinity (J kg⁻¹)', M: 'mass that produces the field (kg)', g: 'gravitational field strength (N kg⁻¹)', '\\Delta V_\\mathrm{g}': 'final gravitational potential minus initial gravitational potential (J kg⁻¹)', '\\Delta r': 'change in distance (m)', W: 'external work in moving the mass without changing its kinetic energy; equals the signed potential-energy change (J)', m: 'mass being moved (kg)', 'v_\\mathrm{esc}': 'escape speed (m s⁻¹)', 'v_\\mathrm{orbital}': 'speed of a body in a circular orbit of radius r (m s⁻¹)' },
          eqs: ['E_\\mathrm{p}=-G\\dfrac{m_{1}m_{2}}{r}', 'V_\\mathrm{g}=-G\\dfrac{M}{r}', 'g=-\\dfrac{\\Delta V_\\mathrm{g}}{\\Delta r}', 'W=m\\Delta V_\\mathrm{g}', 'v_\\mathrm{esc}=\\sqrt{\\dfrac{2GM}{r}}', 'v_\\mathrm{orbital}=\\sqrt{\\dfrac{GM}{r}}']
        },
        {
          id: 'D.2', title: 'Electric and magnetic fields', level: HL,
          syms: { 'E_\\mathrm{p}': 'electric potential energy of the two charges: zero at infinite separation (J)', k: 'Coulomb constant', 'q_{1}': 'first charge (C)', 'q_{2}': 'second charge (C)', r: 'distance from the charge (m)', 'V_\\mathrm{e}': 'electric potential: work done per unit charge from infinity (V)', Q: 'charge that produces the field (C)', E: 'electric field strength (V m⁻¹)', '\\Delta V_\\mathrm{e}': 'final electric potential minus initial electric potential (V)', '\\Delta r': 'change in distance (m)', W: 'external work in moving the charge without changing its kinetic energy; equals the signed potential-energy change (J)', q: 'charge being moved (C)' },
          eqs: ['E_\\mathrm{p}=k\\dfrac{q_{1}q_{2}}{r}', 'V_\\mathrm{e}=\\dfrac{kQ}{r}', 'E=-\\dfrac{\\Delta V_\\mathrm{e}}{\\Delta r}', 'W=q\\Delta V_\\mathrm{e}']
        },
        {
          id: 'D.4', title: 'Induction', level: HL,
          syms: { '\\Phi': 'magnetic flux (Wb)', B: 'magnetic field strength (T)', A: 'area of the loop (m²)', '\\theta': 'angle between the field and the normal to the loop', '\\varepsilon': 'induced emf (V)', N: 'number of turns on the coil', '\\Delta\\Phi': 'final flux minus initial flux through one turn, with the same chosen positive area normal (Wb)', '\\Delta t': 'time taken for the change (s)', v: 'speed of the conductor, at right angles to the field (m s⁻¹)', L: 'length of the conductor in the field (m)' },
          eqs: ['\\Phi=BA\\cos\\theta', { label: 'Faraday’s law', tex: '\\varepsilon=-N\\dfrac{\\Delta\\Phi}{\\Delta t}' }, { label: 'Straight conductor moving across a field: magnitude', tex: '|\\varepsilon|=BvL', note: 'The booklet gives the magnitude BvL. Determine polarity from the chosen direction and Lenz’s law.' }]
        }
      ]
    },
    {
      letter: 'E', title: 'Nuclear and quantum physics', topics: [
        { id: 'E.1', title: 'Structure of the atom', level: SL, syms: { E: 'energy of the photon (J)', h: 'Planck constant', f: 'frequency of the photon (Hz)' }, eqs: [{ tex: 'E=hf', note: 'Photon energy is positive. For emission, \\(\\Delta E_\\mathrm{atom}=E_\\mathrm{f}-E_\\mathrm{i}=-hf\\); for absorption, \\(\\Delta E_\\mathrm{atom}=+hf\\). Include the photon in the system to conserve total energy.' }] },
        { id: 'E.3', title: 'Radioactive decay', level: SL, syms: { E: 'energy equivalent to the mass (J)', m: 'rest mass, or a positive mass-defect magnitude when finding binding or released energy (kg)', c: 'speed of light in a vacuum' }, eqs: [{ tex: 'E=mc^{2}', note: 'For a reaction, \\(\\Delta m=m_\\mathrm{products}-m_\\mathrm{reactants}\\) and \\(\\Delta E_\\mathrm{rest}=\\Delta m c^{2}\\). Released energy is \\(E_\\mathrm{released}=-\\Delta m c^{2}\\). A mass defect is a positive magnitude, not the signed mass change.' }] },
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

  // An equation is typeset in parts, split before each top-level =, so that a long
  // one wraps onto a second line instead of running off the side of a narrow screen.
  function parts(tex) {
    const out = [''];
    let depth = 0;
    tokens(tex).forEach(tok => {
      if (tok === '{' || tok === '\\left') depth++;
      if (tok === '}' || tok === '\\right') depth--;
      if (!depth && (tok === '=' || tok === '\\approx' || tok === '\\equiv') && out[out.length - 1].trim()) out.push('{}');
      out[out.length - 1] += tok;
    });
    return out;
  }
  const mathHtml = (tex, dict = {}) => `<span class="eq-math">${parts(tex).map(part => `<span class="eq-part">\\(${annotate(part, dict)}\\)</span>`).join('')}</span>`;

  const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

  function equationRows(block) {
    return block.eqs.map(eq => {
      const item = typeof eq === 'string' ? { tex: eq } : eq;
      const dict = { ...COMMON, ...(block.syms || {}), ...(item.syms || {}) };
      const label = item.label ? `<span class="eq-label">${item.label}</span>` : '';
      const note = item.note ? `<span class="eq-note">${esc(item.note)}</span>` : '';
      return `<li class="eq">${label}${mathHtml(item.tex, dict)}${note}</li>`;
    }).join('');
  }

  // Registers one explanation and returns the LaTeX of the symbol that carries it.
  function symbol(tex, text) {
    TIPS.push({ tex, text });
    return `\\class{sy sy-${TIPS.length - 1}}{${tex}}`;
  }

  // A page that is not the booklet asks for a topic's equations with
  // <div data-eqs="A.1 sl"></div> (or "C.1 hl" for the additional HL ones).
  document.querySelectorAll('[data-eqs]').forEach(slot => {
    const [id, level] = slot.dataset.eqs.split(' ');
    const block = THEMES.flatMap(theme => theme.topics).find(topic => topic.id === id && topic.level === level);
    if (block) slot.innerHTML = `<p class="eq-head">Equations</p><ul class="eqs">${equationRows(block)}</ul>`;
  });

  // ---------- Explanations on hover, focus and tap ----------
  const tip = document.body.appendChild(Object.assign(document.createElement('div'), { id: 'tip', hidden: true }));
  tip.setAttribute('role', 'tooltip');
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

  window.IBEquations = { SL, HL, THEMES, equationRows, mathHtml, symbol, esc };

  // LaTeX is typeset as SVG, like the decks; each wrapped symbol is then found in the output.
  window.MathJax = {
    tex: { inlineMath: [['\\(', '\\)']] },
    svg: { fontCache: 'none' },
    options: { enableMenu: false },
    startup: { pageReady: () => MathJax.startup.defaultPageReady().then(() => { activate(); document.body.classList.add('math-ready'); }) }
  };
})();
