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

  // Show roughly two to five periods over the ten horizontal divisions.
  // Keep the saved manual setting intact when automatic time base is enabled.
  function scopeTimeDiv(props, trace) {
    if (!props.autoTime || !(trace && trace.frequency > 0)) return Number(props.tdiv);
    const target = 0.3 / trace.frequency;
    const power = 10 ** Math.floor(Math.log10(target));
    const fraction = target / power;
    const step = fraction < 1.5 ? 1 : fraction < 3.5 ? 2 : fraction < 7.5 ? 5 : 10;
    return Math.max(0.0001, Math.min(5, step * power));
  }

  // Retain actual extrema in each time/pixel bucket, in chronological order.
  // Striding every Nth sample aliases a dense sine into a different waveform.
  // Keep a gap marker too, so undefined voltages are never joined into a trace.
  function scopeTraceIndices(trace, channel, span, columns) {
    if (!trace || !trace.t.length) return [];
    const end = Math.max(trace.t[trace.t.length - 1], span), start = end - span;
    const out = [];
    let bucket = null, group = [];
    function flush() {
      if (!group.length) return;
      let min = group[0], max = group[0], gap;
      for (const i of group) {
        const v = trace[channel][i];
        if (!Number.isFinite(v)) { if (gap === undefined) gap = i; continue; }
        if (!Number.isFinite(trace[channel][min]) || v < trace[channel][min]) min = i;
        if (!Number.isFinite(trace[channel][max]) || v > trace[channel][max]) max = i;
      }
      out.push(...[...new Set([group[0], min, max, gap, group[group.length - 1]].filter((i) => i !== undefined))].sort((a, b) => a - b));
      group = [];
    }
    for (let i = 0; i < trace.t.length; i++) {
      if (trace.t[i] < start && (i + 1 === trace.t.length || trace.t[i + 1] < start)) continue;
      const next = Math.floor((trace.t[i] - start) / span * columns);
      if (next !== bucket) { flush(); bucket = next; }
      group.push(i);
    }
    flush();
    return out;
  }

  // Volts/div for the visible scope window, keeping zero centered and 20% headroom.
  // Manual settings are retained so disabling auto scale restores them exactly.
  function scopeScale(props, trace) {
    const scale = { v1: Number(props.v1), v2: Number(props.v2) };
    if (!props.autoScale || !trace || !trace.t.length) return scale;
    const span = scopeTimeDiv(props, trace) * 10;
    const end = Math.max(trace.t[trace.t.length - 1], span);
    const start = end - span;
    for (const [channel, key] of [['ch1', 'v1'], ['ch2', 'v2']]) {
      let peak = 0;
      for (let i = 0; i < trace.t.length; i++) {
        const value = trace[channel][i];
        if (trace.t[i] >= start && trace.t[i] <= end && Number.isFinite(value)) peak = Math.max(peak, Math.abs(value));
      }
      if (peak <= 1e-9) continue;
      const target = peak / 3.2;
      const power = Math.pow(10, Math.floor(Math.log10(target)));
      const fraction = target / power;
      const step = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10;
      scale[key] = step * power;
    }
    return scale;
  }

  const api = { fmtSI, fmtInput, parseSI, roundSig, fmtMeter, trimZeros, scopeScale, scopeTimeDiv, scopeTraceIndices };
  PPC.units = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof globalThis === 'object' ? globalThis : this);
