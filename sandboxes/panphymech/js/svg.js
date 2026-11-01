// The small Canvas 2D subset used by render.js, recorded as editable SVG vectors.
(function (root) {
  const PPM = root.PPM = root.PPM || {};
  const escape = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c]));
  function createContext(width, height) {
    const elements = []; const defs = []; const stack = [];
    let path = ''; let hasPoint = false;
    const ctx = { fillStyle: '#000', strokeStyle: '#000', lineWidth: 1, lineCap: 'butt', lineJoin: 'miter', globalAlpha: 1, font: '10px sans-serif', textAlign: 'left', dash: [], clips: [] };
    const keys = Object.keys(ctx);
    const emit = (element) => elements.push(ctx.clips.reduce((s, id) => `<g clip-path="url(#${id})">${s}</g>`, element));
    const style = (stroke) => `fill="${stroke ? 'none' : escape(ctx.fillStyle)}" stroke="${stroke ? escape(ctx.strokeStyle) : 'none'}" opacity="${ctx.globalAlpha}"` + (stroke ? ` stroke-width="${ctx.lineWidth}" stroke-linecap="${ctx.lineCap}" stroke-linejoin="${ctx.lineJoin}" stroke-dasharray="${ctx.dash.join(' ')}"` : '');
    ctx.setTransform = () => {}; // Rendering is already in logical screen coordinates.
    ctx.save = () => stack.push(Object.fromEntries(keys.map((k) => [k, Array.isArray(ctx[k]) ? ctx[k].slice() : ctx[k]])));
    ctx.restore = () => { if (stack.length) Object.assign(ctx, stack.pop()); };
    ctx.setLineDash = (v) => { ctx.dash = v.slice(); };
    ctx.beginPath = () => { path = ''; hasPoint = false; };
    ctx.moveTo = (x, y) => { path += `M${x} ${y} `; hasPoint = true; };
    ctx.lineTo = (x, y) => { if (!hasPoint) ctx.moveTo(x, y); else path += `L${x} ${y} `; };
    ctx.closePath = () => { path += 'Z '; };
    ctx.rect = (x, y, w, h) => { path += `M${x} ${y}h${w}v${h}h${-w}Z `; hasPoint = true; };
    ctx.quadraticCurveTo = (cx, cy, x, y) => { path += `Q${cx} ${cy} ${x} ${y} `; };
    ctx.bezierCurveTo = (ax, ay, bx, by, x, y) => { path += `C${ax} ${ay} ${bx} ${by} ${x} ${y} `; };
    ctx.arc = (x, y, r, start, end, anticlockwise = false) => {
      const tau = 2 * Math.PI;
      const raw = end - start;
      let sweep = anticlockwise ? -((start - end) % tau + tau) % tau : ((raw % tau) + tau) % tau;
      if ((!anticlockwise && raw >= tau) || (anticlockwise && -raw >= tau)) sweep = anticlockwise ? -tau : tau;
      const point = (a) => `${x + r * Math.cos(a)} ${y + r * Math.sin(a)}`;
      path += `${hasPoint ? 'L' : 'M'}${point(start)} `; hasPoint = true;
      // Two arcs preserve full circles; one SVG arc with identical endpoints is empty.
      const n = Math.max(1, Math.ceil(Math.abs(sweep) / Math.PI));
      for (let i = 1; i <= n; i++) path += `A${r} ${r} 0 0 ${sweep >= 0 ? 1 : 0} ${point(start + sweep * i / n)} `;
    };
    ctx.fill = (rule = 'nonzero') => emit(`<path d="${path}" ${style(false)} fill-rule="${rule}"/>`);
    ctx.stroke = () => emit(`<path d="${path}" ${style(true)}/>`);
    ctx.clip = (rule = 'nonzero') => {
      const id = `clip${defs.length}`;
      defs.push(`<clipPath id="${id}"><path d="${path}" clip-rule="${rule}"/></clipPath>`);
      ctx.clips.push(id);
    };
    ctx.fillRect = (x, y, w, h) => emit(`<rect x="${x}" y="${y}" width="${w}" height="${h}" ${style(false)}/>`);
    const text = (value, x, y, stroke) => emit(`<text x="${x}" y="${y}" ${style(stroke)} style="font: ${escape(ctx.font)}" text-anchor="${ctx.textAlign === 'center' ? 'middle' : ctx.textAlign === 'right' ? 'end' : 'start'}">${escape(value)}</text>`);
    ctx.fillText = (value, x, y) => text(value, x, y, false);
    ctx.strokeText = (value, x, y) => text(value, x, y, true);
    ctx.serialize = () => `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><defs>${defs.join('')}</defs>${elements.join('')}</svg>`;
    return ctx;
  }
  PPM.svg = { createContext };
})(typeof window !== 'undefined' ? window : globalThis);
