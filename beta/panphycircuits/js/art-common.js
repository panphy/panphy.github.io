// PanPhyCircuits: shared SVG helpers and definitions used by both views.
// Artwork functions return SVG markup strings. Every piece of text that can come
// from a document (labels) is escaped here.
(function (root) {
  const PPC = root.PPC = root.PPC || {};

  function esc(value) {
    return String(value).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  }

  function n(v) { return Math.round(v * 100) / 100; }

  // Wrap markup so it stays upright whatever the component's rotation and flip.
  function up(ctx, x, y, inner) {
    const fx = ctx.f ? -1 : 1;
    return `<g transform="translate(${n(x)} ${n(y)}) scale(${fx} 1) rotate(${-90 * (ctx.r || 0)})">${inner}</g>`;
  }

  function text(x, y, str, cls = '', extra = '') {
    return `<text x="${n(x)}" y="${n(y)}" class="${cls}" ${extra}>${esc(str)}</text>`;
  }

  // Upright text at (x, y), centered, with an optional anchor.
  function utext(ctx, x, y, str, cls = '', anchor = 'middle', extra = '') {
    return up(ctx, x, y, `<text x="0" y="0" class="${cls}" text-anchor="${anchor}" dominant-baseline="central" ${extra}>${esc(str)}</text>`);
  }

  // Shared gradients and filters. Each id is defined once per document and shared
  // by every instance; instance-specific definitions use the instance uid prefix.
  function defs() {
    const glow = (id, c1, c2) => `<radialGradient id="${id}"><stop offset="0" stop-color="${c1}" stop-opacity="0.95"/><stop offset="0.35" stop-color="${c2}" stop-opacity="0.55"/><stop offset="1" stop-color="${c2}" stop-opacity="0"/></radialGradient>`;
    return `
<linearGradient id="ppc-cyl" x1="0" y1="0" x2="0" y2="1">
  <stop offset="0" stop-color="#000" stop-opacity="0.32"/>
  <stop offset="0.16" stop-color="#fff" stop-opacity="0.42"/>
  <stop offset="0.34" stop-color="#fff" stop-opacity="0.08"/>
  <stop offset="0.72" stop-color="#000" stop-opacity="0.06"/>
  <stop offset="1" stop-color="#000" stop-opacity="0.4"/>
</linearGradient>
<linearGradient id="ppc-cylv" x1="0" y1="0" x2="1" y2="0">
  <stop offset="0" stop-color="#000" stop-opacity="0.32"/>
  <stop offset="0.16" stop-color="#fff" stop-opacity="0.42"/>
  <stop offset="0.34" stop-color="#fff" stop-opacity="0.08"/>
  <stop offset="0.72" stop-color="#000" stop-opacity="0.06"/>
  <stop offset="1" stop-color="#000" stop-opacity="0.4"/>
</linearGradient>
<linearGradient id="ppc-top" x1="0" y1="0" x2="0" y2="1">
  <stop offset="0" stop-color="#fff" stop-opacity="0.35"/>
  <stop offset="0.5" stop-color="#fff" stop-opacity="0"/>
  <stop offset="1" stop-color="#000" stop-opacity="0.18"/>
</linearGradient>
<linearGradient id="ppc-brass" x1="0" y1="0" x2="1" y2="1">
  <stop offset="0" stop-color="#FFF1BF"/>
  <stop offset="0.45" stop-color="#D7A944"/>
  <stop offset="1" stop-color="#8C6420"/>
</linearGradient>
<radialGradient id="ppc-screw" cx="0.38" cy="0.32" r="0.75">
  <stop offset="0" stop-color="#FFFFFF"/>
  <stop offset="0.45" stop-color="#C9CFD6"/>
  <stop offset="1" stop-color="#6E7782"/>
</radialGradient>
<radialGradient id="ppc-glass" cx="0.35" cy="0.3" r="0.8">
  <stop offset="0" stop-color="#FFFFFF" stop-opacity="0.95"/>
  <stop offset="0.25" stop-color="#F3F8FF" stop-opacity="0.5"/>
  <stop offset="0.75" stop-color="#C9DCEB" stop-opacity="0.28"/>
  <stop offset="1" stop-color="#7E98AE" stop-opacity="0.55"/>
</radialGradient>
<radialGradient id="ppc-knob" cx="0.4" cy="0.35" r="0.75">
  <stop offset="0" stop-color="#5D6573"/>
  <stop offset="0.6" stop-color="#262B33"/>
  <stop offset="1" stop-color="#0E1014"/>
</radialGradient>
<radialGradient id="ppc-sock-red" cx="0.4" cy="0.35" r="0.7"><stop offset="0" stop-color="#FF8A7A"/><stop offset="0.55" stop-color="#D62B1E"/><stop offset="1" stop-color="#7A110A"/></radialGradient>
<radialGradient id="ppc-sock-black" cx="0.4" cy="0.35" r="0.7"><stop offset="0" stop-color="#6B717C"/><stop offset="0.55" stop-color="#22262D"/><stop offset="1" stop-color="#050608"/></radialGradient>
<radialGradient id="ppc-sock-yellow" cx="0.4" cy="0.35" r="0.7"><stop offset="0" stop-color="#FFF2A0"/><stop offset="0.55" stop-color="#E6B800"/><stop offset="1" stop-color="#7D6200"/></radialGradient>
<radialGradient id="ppc-sock-cyan" cx="0.4" cy="0.35" r="0.7"><stop offset="0" stop-color="#B7F3FF"/><stop offset="0.55" stop-color="#1BA9C8"/><stop offset="1" stop-color="#0B5566"/></radialGradient>
<radialGradient id="ppc-sock-blue" cx="0.4" cy="0.35" r="0.7"><stop offset="0" stop-color="#A9C8FF"/><stop offset="0.55" stop-color="#2D63D6"/><stop offset="1" stop-color="#112E73"/></radialGradient>
<linearGradient id="ppc-lcd" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#D5E3C3"/><stop offset="1" stop-color="#B3C69B"/></linearGradient>
<linearGradient id="ppc-panel" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3A404B"/><stop offset="1" stop-color="#22262E"/></linearGradient>
<linearGradient id="ppc-case" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F4F5F7"/><stop offset="1" stop-color="#C9CDD4"/></linearGradient>
<linearGradient id="ppc-pcb" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1E5A8C"/><stop offset="1" stop-color="#123A5E"/></linearGradient>
<linearGradient id="ppc-wood" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#E7C48F"/><stop offset="1" stop-color="#C89A5C"/></linearGradient>
<linearGradient id="ppc-blade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FCE2B6"/><stop offset="0.5" stop-color="#D9904A"/><stop offset="1" stop-color="#8E5320"/></linearGradient>
<linearGradient id="ppc-ceramic" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FBF7EE"/><stop offset="1" stop-color="#D9D1BF"/></linearGradient>
<linearGradient id="ppc-screen" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0F2A22"/><stop offset="1" stop-color="#071712"/></linearGradient>
${glow('ppc-glow-warm', '#FFF6D6', '#FFB23E')}
${glow('ppc-glow-red', '#FFE1DC', '#FF2A1F')}
${glow('ppc-glow-yellow', '#FFFBE0', '#FFD21F')}
${glow('ppc-glow-green', '#E6FFEC', '#2EE05A')}
${glow('ppc-glow-blue', '#E3EEFF', '#2F7BFF')}
${glow('ppc-glow-white', '#FFFFFF', '#CFE0FF')}
<filter id="ppc-blur" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="2.6"/></filter>
<filter id="ppc-blur-soft" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="5"/></filter>
`;
  }

  // Soft contact shadow under a shape (offset down-right, blurred).
  function shadow(shape) {
    return `<g class="ppc-shadow" transform="translate(2.5 4)" fill="#0A1020" opacity="0.22" filter="url(#ppc-blur)">${shape}</g>`;
  }

  // Blackbody-ish color of a filament at temperature T (K).
  function filamentColor(T) {
    if (!(T > 700)) return '#4A4A4A';
    const x = Math.min(1, (T - 700) / 2200);
    const r = Math.round(90 + 165 * Math.min(1, x * 2.2));
    const g = Math.round(40 + 215 * Math.max(0, Math.min(1, (x - 0.2) * 1.4)));
    const b = Math.round(30 + 190 * Math.max(0, (x - 0.65) * 2.6));
    return `rgb(${r},${g},${Math.min(255, b)})`;
  }

  PPC.artCommon = { esc, n, up, text, utext, defs, shadow, filamentColor };
  if (typeof module === 'object' && module.exports) module.exports = PPC.artCommon;
})(typeof globalThis === 'object' ? globalThis : this);
