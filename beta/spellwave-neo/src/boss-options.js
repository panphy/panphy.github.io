// boss-options.js — multiple-choice options for boss questions (see
// boss-choices.js for how the game uses them).
//
// Each entry is keyed by its term in question-bank.js (or the word equation).
// - answer: the word or words the boss hides and the player types. It may be the
//   whole term, when the line then shows only the blank. Every occurrence in the
//   line is blanked, so a repeated word is typed once.
// - wrong: three wrong options, best first. Waves 1–3 show the first; from wave 4
//   the first two. The third is a spare, not shown.
//
// Option rules (checked in tests/boss-options.test.mjs where a test can):
// each wrong option is a real term that fits the same gap but not the clue; none is
// printed in the clue or elsewhere in the line; none starts another option or the
// answer; and the answer is not usually the longest option.
export const BOSS_OPTIONS = {
  // ── Medium: energy ──
  'energy store': { answer: 'store', wrong: ['transfer', 'resource', 'level'] },
  'work done': { answer: 'work done', wrong: ['power', 'momentum', 'pressure'] },
  'efficiency': { answer: 'efficiency', wrong: ['power', 'dissipation', 'insulation'] },
  'dissipation': { answer: 'dissipation', wrong: ['efficiency', 'insulation', 'absorption'] },
  'closed system': { answer: 'closed', wrong: ['open', 'solar', 'stable'] },
  'insulation': { answer: 'insulation', wrong: ['conductor', 'coolant', 'moderator'] },
  'lubricant': { answer: 'lubricant', wrong: ['insulator', 'conductor', 'moderator'] },
  'renewable': { answer: 'renewable', wrong: ['non renewable', 'fossil fuel', 'nuclear fuel'] },
  'non renewable': { answer: 'non renewable', wrong: ['renewable', 'sustainable', 'geothermal'] },
  'fossil fuels': { answer: 'fossil', wrong: ['nuclear', 'renewable', 'synthetic'] },
  'biofuel': { answer: 'biofuel', wrong: ['fossil fuel', 'nuclear fuel', 'natural gas'] },
  'geothermal': { answer: 'geothermal', wrong: ['hydroelectric', 'tidal', 'nuclear'] },
  'hydroelectric': { answer: 'hydroelectric', wrong: ['geothermal', 'wave', 'solar'] },
  'solar cell': { answer: 'solar', wrong: ['fuel', 'chemical', 'electric'] },
  'wind turbine': { answer: 'turbine', wrong: ['power', 'tunnel', 'vane'] },
  'national grid': { answer: 'national grid', wrong: ['transformer', 'ring main', 'parallel circuit'] },

  // ── Medium: electricity ──
  'potential difference': { answer: 'potential', wrong: ['pressure', 'temperature', 'height'] },
  'charge flow': { answer: 'charge', wrong: ['energy', 'heat', 'power'] },
  'power rating': { answer: 'rating', wrong: ['station', 'supply', 'socket'] },
  'ohmic conductor': { answer: 'ohmic conductor', wrong: ['diode', 'LED', 'insulator'] },
  'filament lamp': { answer: 'filament lamp', wrong: ['LED', 'thermistor', 'diode'] },
  'thermistor': { answer: 'thermistor', wrong: ['LDR', 'diode', 'variable resistor'] },
  'diode': { answer: 'diode', wrong: ['resistor', 'fuse', 'thermistor'] },
  'conductor': { answer: 'conductor', wrong: ['insulator', 'lubricant', 'moderator'] },
  'insulator': { answer: 'insulator', wrong: ['conductor', 'lubricant', 'magnet'] },
  'direct current': { answer: 'direct', wrong: ['alternating', 'induced', 'mains'] },
  'alternating current': { answer: 'alternating', wrong: ['direct', 'induced', 'steady'] },
  'live wire': { answer: 'live', wrong: ['neutral', 'earth', 'fuse'] },
  'neutral wire': { answer: 'neutral', wrong: ['live', 'earth', 'fuse'] },
  'earth wire': { answer: 'earth', wrong: ['live', 'neutral', 'fuse'] },

  // ── Medium: thermal and particle model ──
  'particle model': { answer: 'particle', wrong: ['nuclear', 'atomic', 'wave'] },
  'change of state': { answer: 'state', wrong: ['shape', 'direction', 'speed'] },
  'physical change': { answer: 'physical', wrong: ['chemical', 'nuclear', 'permanent'] },
  'evaporation': { answer: 'evaporation', wrong: ['condensation', 'sublimation', 'melting'] },
  'condensation': { answer: 'condensation', wrong: ['evaporation', 'sublimation', 'freezing'] },
  'sublimation': { answer: 'sublimation', wrong: ['evaporation', 'condensation', 'melting'] },
  'melting point': { answer: 'melting', wrong: ['boiling', 'sublimation', 'critical'] },
  'boiling point': { answer: 'boiling', wrong: ['melting', 'freezing', 'sublimation'] },
  'latent heat': { answer: 'latent', wrong: ['specific', 'radiant', 'body'] },
  'internal energy': { answer: 'internal', wrong: ['chemical', 'nuclear', 'elastic'] },
  'absolute zero': { answer: 'absolute zero', wrong: ['freezing point', 'boiling point', 'room temperature'] },
  'gas pressure': { answer: 'pressure', wrong: ['volume', 'temperature', 'density'] },

  // ── Medium: atomic and nuclear ──
  'atomic number': { answer: 'atomic', wrong: ['mass', 'neutron', 'isotope'] },
  'mass number': { answer: 'mass', wrong: ['atomic', 'electron', 'isotope'] },
  'energy level': { answer: 'level', wrong: ['store', 'transfer', 'source'] },
  'nuclear model': { answer: 'nuclear', wrong: ['plum pudding', 'particle', 'wave'] },
  'alpha scattering': { answer: 'alpha', wrong: ['beta', 'gamma', 'neutron'] },
  'alpha particle': { answer: 'alpha', wrong: ['beta', 'gamma', 'cosmic'] },
  'beta particle': { answer: 'beta', wrong: ['alpha', 'gamma', 'cosmic'] },
  'half life': { answer: 'half life', wrong: ['period', 'activity', 'radiation dose'] },
  'activity': { answer: 'activity', wrong: ['count rate', 'half life', 'radiation dose'] },
  'radioactive decay': { answer: 'radioactive decay', wrong: ['irradiation', 'contamination', 'nuclear fusion'] },
  'random': { answer: 'random', wrong: ['constant', 'uniform', 'gradual'] },
  'count rate': { answer: 'count rate', wrong: ['activity', 'frequency', 'current'] },
  'ionising radiation': { answer: 'ionising', wrong: ['infrared', 'microwave', 'thermal'] },
  'radiation dose': { answer: 'dose', wrong: ['source', 'detector', 'shield'] },
  'irradiation': { answer: 'irradiation', wrong: ['contamination', 'ionisation', 'activity'] },
  'contamination': { answer: 'contamination', wrong: ['irradiation', 'ionisation', 'dissipation'] },
  'tracer': { answer: 'tracer', wrong: ['moderator', 'detector', 'sievert'] },

  // ── Medium: forces and motion ──
  'scalar': { answer: 'scalar', wrong: ['vector', 'displacement', 'momentum'] },
  'vector': { answer: 'vector', wrong: ['scalar', 'speed', 'mass'] },
  'displacement': { answer: 'displacement', wrong: ['speed', 'extension', 'momentum'] },
  'average speed': { answer: 'average', wrong: ['instantaneous', 'wave', 'top'] },
  'acceleration': { answer: 'acceleration', wrong: ['momentum', 'force', 'speed'] },
  'deceleration': { answer: 'deceleration', wrong: ['friction', 'drag', 'momentum'] },
  'gradient': { answer: 'gradient', wrong: ['intercept', 'area', 'axis'] },
  'contact force': { answer: 'contact', wrong: ['non contact', 'resultant', 'magnetic'] },
  'non contact force': { answer: 'non contact', wrong: ['contact', 'resultant', 'normal'] },
  'resultant force': { answer: 'resultant', wrong: ['contact', 'normal', 'frictional'] },
  'free body diagram': { answer: 'free body', wrong: ['ray', 'circuit', 'Sankey'] },
  'friction': { answer: 'friction', wrong: ['drag', 'tension', 'upthrust'] },
  'drag': { answer: 'drag', wrong: ['upthrust', 'tension', 'weight'] },
  'air resistance': { answer: 'resistance', wrong: ['pressure', 'density', 'current'] },
  'upthrust': { answer: 'upthrust', wrong: ['drag', 'tension', 'weight'] },
  'equilibrium': { answer: 'equilibrium', wrong: ['inertia', 'momentum', 'deformation'] },
  'momentum': { answer: 'momentum', wrong: ['force', 'weight', 'kinetic energy'] },
  'deformation': { answer: 'deformation', wrong: ['oscillation', 'equilibrium', 'displacement'] },
  'extension': { answer: 'extension', wrong: ['compression', 'amplitude', 'wavelength'] },
  'spring constant': { answer: 'spring', wrong: ['gravitational', 'decay', 'gas'] },
  "Hooke's law": { answer: "Hooke's", wrong: ["Ohm's", "Newton's", "Boyle's"] },
  'stopping distance': { answer: 'stopping distance', wrong: ['braking distance', 'thinking distance', 'displacement'] },
  'reaction time': { answer: 'reaction', wrong: ['stopping', 'braking', 'collision'] },
  'crumple zone': { answer: 'crumple zone', wrong: ['brake pads', 'roll cage', 'spoiler'] },

  // ── Medium: waves ──
  'frequency': { answer: 'frequency', wrong: ['period', 'wave speed', 'amplitude'] },
  'wavelength': { answer: 'wavelength', wrong: ['amplitude', 'period', 'frequency'] },
  'amplitude': { answer: 'amplitude', wrong: ['wavelength', 'frequency', 'period'] },
  'wave speed': { answer: 'speed', wrong: ['frequency', 'period', 'amplitude'] },
  'oscillation': { answer: 'oscillation', wrong: ['rotation', 'refraction', 'deformation'] },
  'transverse wave': { answer: 'transverse', wrong: ['longitudinal', 'sound', 'compression'] },
  'longitudinal wave': { answer: 'longitudinal', wrong: ['transverse', 'electromagnetic', 'water'] },
  'compression': { answer: 'compression', wrong: ['rarefaction', 'crest', 'trough'] },
  'rarefaction': { answer: 'rarefaction', wrong: ['compression', 'trough', 'crest'] },
  'ripple tank': { answer: 'ripple tank', wrong: ['oscilloscope', 'slinky', 'signal generator'] },
  'absorption': { answer: 'absorption', wrong: ['reflection', 'transmission', 'refraction'] },
  'transmission': { answer: 'transmission', wrong: ['absorption', 'reflection', 'emission'] },
  'refraction': { answer: 'refraction', wrong: ['reflection', 'diffraction', 'dispersion'] },
  'diffraction': { answer: 'diffraction', wrong: ['refraction', 'dispersion', 'reflection'] },
  'dispersion': { answer: 'dispersion', wrong: ['diffraction', 'reflection', 'absorption'] },
  'ultrasound': { answer: 'ultrasound', wrong: ['infrasound', 'echo', 'audible sound'] },
  'echo sounding': { answer: 'echo sounding', wrong: ['radar', 'X ray imaging', 'seismometer'] },
  'seismic waves': { answer: 'seismic', wrong: ['radio', 'light', 'water'] },

  // ── Medium: light ──
  'ray diagram': { answer: 'ray', wrong: ['free body', 'circuit', 'Sankey'] },
  'incident ray': { answer: 'incident', wrong: ['refracted', 'reflected', 'emergent'] },
  'refracted ray': { answer: 'refracted', wrong: ['incident', 'reflected', 'normal'] },
  'reflected ray': { answer: 'reflected', wrong: ['incident', 'refracted', 'emergent'] },
  'convex lens': { answer: 'convex', wrong: ['concave', 'diverging', 'plane'] },
  'concave lens': { answer: 'concave', wrong: ['convex', 'converging', 'plane'] },
  'principal focus': { answer: 'principal focus', wrong: ['optical centre', 'focal length', 'normal'] },
  'focal length': { answer: 'focal length', wrong: ['image distance', 'object distance', 'wavelength'] },
  'real image': { answer: 'real', wrong: ['virtual', 'mirror', 'upright'] },
  'virtual image': { answer: 'virtual', wrong: ['real', 'inverted', 'focused'] },
  'transparent': { answer: 'transparent', wrong: ['translucent', 'opaque', 'reflective'] },
  'translucent': { answer: 'translucent', wrong: ['transparent', 'opaque', 'reflective'] },
  'opaque': { answer: 'opaque', wrong: ['transparent', 'translucent', 'refractive'] },
  'colour filter': { answer: 'colour filter', wrong: ['prism', 'mirror', 'convex lens'] },

  // ── Medium: magnetism ──
  'magnetic field': { answer: 'magnetic', wrong: ['electric', 'gravitational', 'nuclear'] },
  'induced magnet': { answer: 'induced', wrong: ['permanent', 'bar', 'horseshoe'] },
  'solenoid': { answer: 'solenoid', wrong: ['commutator', 'filament', 'iron core'] },
  'electromagnet': { answer: 'electromagnet', wrong: ['bar magnet', 'compass', 'permanent magnet'] },
  'iron core': { answer: 'iron', wrong: ['copper', 'plastic', 'aluminium'] },
  'motor effect': { answer: 'motor', wrong: ['generator', 'heating', 'chemical'] },
  'electric motor': { answer: 'electric motor', wrong: ['generator', 'dynamo', 'transformer'] },
  'loudspeaker': { answer: 'loudspeaker', wrong: ['microphone', 'generator', 'transformer'] },
  'microphone': { answer: 'microphone', wrong: ['loudspeaker', 'electric motor', 'transformer'] },
  'primary coil': { answer: 'primary', wrong: ['secondary', 'output', 'induced'] },
  'secondary coil': { answer: 'secondary', wrong: ['primary', 'input', 'supply'] },

  // ── Medium: space ──
  'solar system': { answer: 'solar', wrong: ['closed', 'binary', 'open'] },
  'dwarf planet': { answer: 'dwarf planet', wrong: ['moon', 'asteroid', 'comet'] },
  'Milky Way': { answer: 'Milky Way', wrong: ['Andromeda', 'universe', 'nebula'] },
  'circular orbit': { answer: 'circular orbit', wrong: ['straight line', 'parabola', 'elliptical orbit'] },
  'nebula': { answer: 'nebula', wrong: ['protostar', 'galaxy', 'supernova'] },
  'protostar': { answer: 'protostar', wrong: ['main sequence', 'red giant', 'white dwarf'] },
  'red shift': { answer: 'red', wrong: ['blue', 'green', 'phase'] },
  'dark matter': { answer: 'matter', wrong: ['energy', 'star', 'space'] },
  'dark energy': { answer: 'energy', wrong: ['matter', 'star', 'space'] },

  // ── Hard: energy ──
  'gravitational potential energy': { answer: 'gravitational', wrong: ['elastic', 'electric', 'chemical'] },
  'kinetic energy': { answer: 'kinetic', wrong: ['potential', 'thermal', 'chemical'] },
  'thermal energy': { answer: 'thermal', wrong: ['chemical', 'elastic', 'nuclear'] },
  'elastic potential energy': { answer: 'elastic', wrong: ['gravitational', 'chemical', 'electric'] },
  'specific heat capacity': { answer: 'heat capacity', wrong: ['latent heat', 'gravity', 'charge'] },
  'specific latent heat': { answer: 'latent heat', wrong: ['heat capacity', 'gravity', 'charge'] },
  'specific latent heat of fusion': { answer: 'fusion', wrong: ['vaporisation', 'sublimation', 'condensation'] },
  'specific latent heat of vaporisation': { answer: 'vaporisation', wrong: ['fusion', 'sublimation', 'condensation'] },
  'thermal conductivity': { answer: 'conductivity', wrong: ['insulation', 'capacity', 'equilibrium'] },

  // ── Hard: electricity ──
  'static electricity': { answer: 'static', wrong: ['mains', 'current', 'renewable'] },
  'electric field': { answer: 'electric', wrong: ['magnetic', 'gravitational', 'nuclear'] },
  'series circuit': { answer: 'series', wrong: ['parallel', 'short', 'ring'] },
  'parallel circuit': { answer: 'parallel', wrong: ['series', 'short', 'open'] },
  'variable resistor': { answer: 'variable', wrong: ['fixed', 'light dependent', 'ohmic'] },
  'light dependent resistor': { answer: 'light', wrong: ['temperature', 'voltage', 'current'] },
  'light emitting diode': { answer: 'emitting', wrong: ['dependent', 'sensitive', 'detecting'] },
  'mains electricity': { answer: 'mains', wrong: ['static', 'battery', 'solar'] },

  // ── Hard: nuclear ──
  'plum pudding model': { answer: 'plum pudding', wrong: ['nuclear', 'Bohr', 'particle'] },
  'Geiger Muller tube': { answer: 'Geiger Muller tube', wrong: ['cloud chamber', 'photographic film', 'voltmeter'] },
  'nuclear fission': { answer: 'nuclear fission', wrong: ['nuclear fusion', 'irradiation', 'ionisation'] },
  'nuclear fusion': { answer: 'fusion', wrong: ['fission', 'decay', 'radiation'] },
  'chain reaction': { answer: 'chain', wrong: ['fusion', 'chemical', 'normal'] },
  'control rods': { answer: 'control', wrong: ['fuel', 'moderator', 'cooling'] },
  'moderator': { answer: 'moderator', wrong: ['control rods', 'coolant', 'shielding'] },
  'background radiation': { answer: 'background', wrong: ['ultraviolet', 'laser', 'radar'] },

  // ── Hard: forces and motion ──
  "Newton's first law": { answer: 'first', wrong: ['second', 'third', 'fourth'] },
  "Newton's second law": { answer: 'second', wrong: ['first', 'third', 'fourth'] },
  "Newton's third law": { answer: 'third', wrong: ['first', 'second', 'fourth'] },
  'normal contact force': { answer: 'normal', wrong: ['frictional', 'applied', 'resultant'] },
  'gravitational field strength': { answer: 'gravitational', wrong: ['magnetic', 'electric', 'radio'] },
  'terminal velocity': { answer: 'terminal', wrong: ['initial', 'average', 'escape'] },
  'uniform acceleration': { answer: 'uniform', wrong: ['average', 'maximum', 'initial'] },
  'distance time graph': { answer: 'distance', wrong: ['velocity', 'acceleration', 'force'] },
  'velocity time graph': { answer: 'velocity', wrong: ['displacement', 'force', 'momentum'] },
  'inertial mass': { answer: 'inertial', wrong: ['relative', 'atomic', 'total'] },
  'conservation of momentum': { answer: 'conservation', wrong: ['change', 'loss', 'rate'] },
  'centre of mass': { answer: 'centre of mass', wrong: ['pivot', 'principal focus', 'optical centre'] },
  'principle of moments': { answer: 'principle', wrong: ['conservation', 'centre', 'sum'] },
  'limit of proportionality': { answer: 'proportionality', wrong: ['extension', 'stiffness', 'equilibrium'] },
  'elastic deformation': { answer: 'elastic', wrong: ['inelastic', 'plastic', 'permanent'] },
  'inelastic deformation': { answer: 'inelastic', wrong: ['elastic', 'temporary', 'reversible'] },
  'thinking distance': { answer: 'thinking', wrong: ['braking', 'stopping', 'total'] },
  'braking distance': { answer: 'braking', wrong: ['thinking', 'stopping', 'total'] },
  'atmospheric pressure': { answer: 'atmospheric', wrong: ['liquid', 'tyre', 'radiation'] },

  // ── Hard: waves ──
  'wave equation': { answer: 'wave', wrong: ['energy', 'momentum', 'lens'] },
  'angle of incidence': { answer: 'incidence', wrong: ['refraction', 'reflection', 'elevation'] },
  'angle of refraction': { answer: 'refraction', wrong: ['incidence', 'reflection', 'elevation'] },
  'critical angle': { answer: 'critical', wrong: ['right', 'reflex', 'obtuse'] },
  'total internal reflection': { answer: 'internal', wrong: ['external', 'diffuse', 'specular'] },
  'specular reflection': { answer: 'specular', wrong: ['diffuse', 'scattered', 'random'] },
  'diffuse reflection': { answer: 'diffuse', wrong: ['specular', 'mirror', 'total internal'] },
  'electromagnetic wave': { answer: 'electromagnetic', wrong: ['sound', 'water', 'seismic'] },
  'electromagnetic spectrum': { answer: 'electromagnetic', wrong: ['visible', 'emission', 'sound'] },
  'radio waves': { answer: 'radio waves', wrong: ['gamma rays', 'microwaves', 'infrared'] },
  'microwaves': { answer: 'microwaves', wrong: ['radio waves', 'infrared', 'ultraviolet'] },
  'infrared': { answer: 'infrared', wrong: ['ultraviolet', 'radio waves', 'X rays'] },
  'visible light': { answer: 'visible', wrong: ['ultraviolet', 'infrared', 'black'] },
  'ultraviolet': { answer: 'ultraviolet', wrong: ['infrared', 'gamma rays', 'microwaves'] },
  'x rays': { answer: 'x rays', wrong: ['ultraviolet', 'microwaves', 'ultrasound'] },
  'gamma rays': { answer: 'gamma rays', wrong: ['radio waves', 'X rays', 'ultraviolet'] },
  'perfect black body': { answer: 'black', wrong: ['white', 'shiny', 'transparent'] },

  // ── Hard: magnetism and induction ──
  'permanent magnet': { answer: 'permanent', wrong: ['induced', 'temporary', 'soft'] },
  'magnetic flux density': { answer: 'magnetic', wrong: ['electric', 'gravitational', 'radiant'] },
  "Fleming's left hand rule": { answer: 'left', wrong: ['right', 'first', 'second'] },
  'split ring commutator': { answer: 'split ring', wrong: ['slip ring', 'iron ring', 'brush'] },
  'generator effect': { answer: 'generator', wrong: ['motor', 'heating', 'greenhouse'] },
  'electromagnetic induction': { answer: 'induction', wrong: ['radiation', 'spectrum', 'wave'] },
  'induced potential difference': { answer: 'induced', wrong: ['applied', 'mains', 'primary'] },
  'transformer': { answer: 'transformer', wrong: ['generator', 'dynamo', 'commutator'] },
  'step up transformer': { answer: 'up', wrong: ['down', 'over', 'out'] },
  'step down transformer': { answer: 'down', wrong: ['up', 'over', 'out'] },

  // ── Hard: space ──
  'artificial satellite': { answer: 'artificial', wrong: ['natural', 'planetary', 'solar'] },
  'main sequence': { answer: 'main sequence', wrong: ['protostar', 'white dwarf', 'black hole'] },
  'red giant': { answer: 'giant', wrong: ['supergiant', 'dwarf', 'shift'] },
  'red supergiant': { answer: 'supergiant', wrong: ['giant', 'dwarf', 'shift'] },
  'white dwarf': { answer: 'white', wrong: ['black', 'red', 'brown'] },
  'black dwarf': { answer: 'black', wrong: ['white', 'red', 'blue'] },
  'supernova': { answer: 'supernova', wrong: ['big bang', 'solar flare', 'chain reaction'] },
  'neutron star': { answer: 'neutron star', wrong: ['white dwarf', 'red giant', 'protostar'] },
  'black hole': { answer: 'hole', wrong: ['dwarf', 'body', 'matter'] },
  'big bang': { answer: 'big bang', wrong: ['steady state', 'static universe', 'plum pudding'] },
  'cosmic microwave background radiation': { answer: 'microwave', wrong: ['infrared', 'gamma', 'ultraviolet'] },

  // ── Equations: forces and motion ──
  'weight = mass × gravitational field strength': { answer: 'weight', wrong: ['work', 'momentum', 'pressure'] },
  'resultant force = mass × acceleration': { answer: 'resultant', wrong: ['contact', 'normal', 'frictional'] },
  'work done = force × distance': { answer: 'distance', wrong: ['time', 'velocity', 'extension'] },
  'distance travelled = speed × time': { answer: 'speed', wrong: ['acceleration', 'power', 'frequency'] },
  'acceleration = change in velocity / time taken': { answer: 'acceleration', wrong: ['force', 'momentum', 'power'] },
  'momentum = mass × velocity': { answer: 'momentum', wrong: ['pressure', 'force', 'weight'] },
  'force = change in momentum / time taken': { answer: 'momentum', wrong: ['velocity', 'energy', 'displacement'] },
  'moment of a force = force × distance': { answer: 'moment', wrong: ['power', 'pressure', 'weight'] },
  'force = spring constant × extension': { answer: 'extension', wrong: ['length', 'mass', 'area'] },
  'final velocity² − initial velocity² = 2 × acceleration × distance': { answer: 'acceleration', wrong: ['time', 'speed', 'force'] },

  // ── Equations: energy ──
  'kinetic energy = 0.5 × mass × speed²': { answer: 'kinetic', wrong: ['potential', 'elastic', 'thermal'] },
  'gravitational potential energy = mass × gravitational field strength × height': { answer: 'height', wrong: ['velocity', 'extension', 'time'] },
  'elastic potential energy = 0.5 × spring constant × extension²': { answer: 'elastic', wrong: ['gravitational', 'chemical', 'electric'] },
  'power = energy transferred / time': { answer: 'energy', wrong: ['charge', 'momentum', 'mass'] },
  'power = work done / time': { answer: 'power', wrong: ['force', 'efficiency', 'momentum'] },
  'energy transferred = power × time': { answer: 'energy', wrong: ['charge', 'momentum', 'force'] },
  'efficiency = useful power output / total power input': { answer: 'useful', wrong: ['wasted', 'maximum', 'average'] },
  'efficiency = useful output energy transfer / total input energy transfer': { answer: 'total', wrong: ['wasted', 'maximum', 'average'] },

  // ── Equations: materials and pressure ──
  'density = mass / volume': { answer: 'volume', wrong: ['area', 'weight', 'height'] },
  'pressure = force / area': { answer: 'pressure', wrong: ['momentum', 'power', 'density'] },
  'pressure = height × density × gravitational field strength': { answer: 'gravitational', wrong: ['magnetic', 'electric', 'radio'] },
  'pressure × volume = constant': { answer: 'volume', wrong: ['temperature', 'density', 'area'] },

  // ── Equations: thermal ──
  'change in thermal energy = mass × specific heat capacity × temperature change': { answer: 'temperature', wrong: ['state', 'volume', 'pressure'] },
  'thermal energy for a change of state = mass × specific latent heat': { answer: 'latent heat', wrong: ['heat capacity', 'gravity', 'charge'] },

  // ── Equations: waves and light ──
  'wave speed = frequency × wavelength': { answer: 'wavelength', wrong: ['amplitude', 'period', 'time'] },
  'period = 1 / frequency': { answer: 'period', wrong: ['wavelength', 'amplitude', 'speed'] },
  'magnification = image height / object height': { answer: 'object', wrong: ['lens', 'focal', 'mirror'] },

  // ── Equations: electricity ──
  'charge flow = current × time': { answer: 'charge', wrong: ['energy', 'power', 'heat'] },
  'potential difference = current × resistance': { answer: 'resistance', wrong: ['time', 'charge', 'power'] },
  'power = potential difference × current': { answer: 'current', wrong: ['charge', 'resistance', 'time'] },
  'power = current² × resistance': { answer: 'resistance', wrong: ['time', 'charge', 'frequency'] },
  'energy transferred = charge flow × potential difference': { answer: 'charge', wrong: ['current', 'power', 'heat'] },

  // ── Equations: magnetism and induction ──
  'force = magnetic flux density × current × length': { answer: 'magnetic', wrong: ['electric', 'gravitational', 'radiant'] },
  // The two transformer equations repeat their answer: every blank is filled by one typed word.
  'primary potential difference / secondary potential difference = primary turns / secondary turns': { answer: 'turns', wrong: ['current', 'power', 'charge'] },
  'primary potential difference × primary current = secondary potential difference × secondary current': { answer: 'current', wrong: ['turns', 'resistance', 'charge'] },
};
