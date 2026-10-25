// PanPhyCircuits: SI formatting and parsing of physical quantities.
// Pure functions, shared by the browser app and the node tests.
(function (root) {
  const PPC = root.PPC = root.PPC || {};

  const PREFIXES = [
    { p: 'G', e: 9 }, { p: 'M', e: 6 }, { p: 'k', e: 3 }, { p: '', e: 0 },
    { p: 'm', e: -3 }, { p: 'µ', e: -6 }, { p: 'n', e: -9 }, { p: 'p', e: -12 }
  ];
  const PARSE_PREFIX = { G: 9, M: 6, k: 3, K: 3, m: -3, u: -6, 'µ': -6, 'μ': -6, n: -9, p: -12 };

  // Round to sig significant figures and return the digits as a string without
  // exponent, e.g. roundSig(0.0012345, 3) -> "0.00123".
  function roundSig(value, sig) {
    if (!Number.isFinite(value)) return String(value);
    if (value === 0) return (0).toFixed(Math.max(0, sig - 1));
    const magnitude = Math.floor(Math.log10(Math.abs(value)));
    const decimals = Math.max(0, sig - 1 - magnitude);
    return value.toFixed(Math.min(decimals, 15));
  }

  // Format value with an SI prefix and sig significant figures.
  // fmtSI(0.0153, 'A') -> "15.3 mA"; fmtSI(4700, 'Ω') -> "4.70 kΩ".
  function fmtSI(value, unit = '', sig = 3, options = {}) {
    if (value === null || value === undefined || Number.isNaN(value)) return '—';
    if (!Number.isFinite(value)) return (value > 0 ? '∞' : '−∞') + (unit ? ' ' + unit : '');
    const minPrefix = options.minExp ?? -12;
    const maxPrefix = options.maxExp ?? 9;
    const abs = Math.abs(value);
    if (abs === 0) return '0' + (unit ? ' ' + unit : '');
    // Pick the prefix after rounding, so 999.96 m becomes 1.00, not 1000 m.
    let chosen = PREFIXES[PREFIXES.length - 1];
    for (const pref of PREFIXES) {
      if (pref.e > maxPrefix || pref.e < minPrefix) continue;
      const scaled = abs / Math.pow(10, pref.e);
      if (Number(roundSig(scaled, sig)) >= 1) { chosen = pref; break; }
      chosen = pref;
    }
    let text = roundSig(value / Math.pow(10, chosen.e), sig);
    if (options.trim) text = trimZeros(text);
    text = text.replace('-', '−');
    return text + (unit || chosen.p ? ' ' + chosen.p + unit : '');
  }

  function trimZeros(text) {
    return text.includes('.') ? text.replace(/0+$/, '').replace(/\.$/, '') : text;
  }

  // Format a value for an editable field: compact, up to 4 significant figures.
  function fmtInput(value, unit = '') {
    if (!Number.isFinite(value)) return '';
    return fmtSI(value, unit, 4, { trim: true }).replace('−', '-');
  }

  // Parse "4.7k", "4k7", "2.2 µF", "100n", "1e3", "-3.5" (with an optional unit).
  // Returns NaN when the text is not a number.
  function parseSI(text, unit = '') {
    let s = String(text ?? '').trim().replace(/−/g, '-').replace(/,/g, '');
    if (!s) return NaN;
    if (unit) {
      const u = unit.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      s = s.replace(new RegExp('\\s*' + u + '$'), '');
      if (unit === 'Ω') s = s.replace(/\s*(ohms?|Ohms?|R)$/, '');
      if (unit === '°C') s = s.replace(/\s*(C|deg|degC)$/, '');
    }
    s = s.trim();
    // 4k7 style (prefix in place of the decimal point).
    let m = s.match(/^([+-]?\d+)([GMkKmuµμnp])(\d+)$/);
    if (m) return Number(m[1] + '.' + m[3]) * Math.pow(10, PARSE_PREFIX[m[2]]);
    m = s.match(/^([+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?)\s*([GMkKmuµμnp])?$/);
    if (!m) return NaN;
    const base = Number(m[1]);
    if (!Number.isFinite(base)) return NaN;
    return m[2] ? base * Math.pow(10, PARSE_PREFIX[m[2]]) : base;
  }

  // Meter-style display string: 3 significant figures, with a resolution floor
  // below which the meter shows zero, as a real meter would.
  function fmtMeter(value, unit, floor) {
    if (value === null || value === undefined || Number.isNaN(value)) return '—';
    if (Math.abs(value) < floor) value = 0;
    if (value === 0) return '0.00 ' + unit;
    return fmtSI(value, unit, 3);
  }

  const api = { fmtSI, fmtInput, parseSI, roundSig, fmtMeter, trimZeros };
  PPC.units = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof globalThis === 'object' ? globalThis : this);
