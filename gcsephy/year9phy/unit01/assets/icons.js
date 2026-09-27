(function () {
  "use strict";

  // Stroke icons (24 × 24, currentColor) used in place of arrow, tick and
  // symbol glyphs, which some devices draw as colour emoji or missing glyphs.
  // Sized in em by .icon in styles.css. Values are SVG child markup.
  const dot = (x, y) => `<circle class="icon-fill" cx="${x}" cy="${y}" r="1.6"/>`;
  const ICONS = {
    "right": '<path d="M5 12h14M13 6l6 6-6 6"/>',
    "left": '<path d="M19 12H5M11 6l-6 6 6 6"/>',
    "up": '<path d="M12 19V5M6 11l6-6 6 6"/>',
    "down": '<path d="M12 5v14M6 13l6 6 6-6"/>',
    "down-right": '<path d="M7 7l10 10M17 9v8H9"/>',
    "up-right": '<path d="M7 17L17 7M9 7h8v8"/>',
    "check": '<path d="M5 12.5l4.5 4.5L19 7"/>',
    // Mission badges
    "plus-minus": '<path d="M12 4v10M7 9h10M7 19h10"/>',
    "variables": '<path d="M2.5 8h6v8h-6zM15.5 8h6v8h-6zM8.5 12h7M13 9.5l2.5 2.5-2.5 2.5"/>',
    "drop": `<path d="M12 9v8M8.5 13.5L12 17l3.5-3.5M4 21h16"/>${dot(12, 4.5)}`,
    "line-graph": '<path d="M4 3v17h17M7.5 16.5L19 6M13 6h6v6"/>',
    "best-fit": `<path d="M4 3v17h17M7 17L19 6"/>${dot(9, 11)}${dot(15, 14)}${dot(13.5, 7)}`,
    "helicopter": '<path d="M12 12L3.5 6.5V4l8.5 5.5L20.5 4v2.5zM10.5 13.5V21h3v-7.5"/>',
    "search": '<path d="M16.5 10.5a6 6 0 1 1-12 0 6 6 0 0 1 12 0zM15 15l5.5 5.5"/>'
  };

  function icon(name) {
    return `<svg class="icon icon-${name}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${ICONS[name]}</svg>`;
  }

  window.Icons = { icon };
})();
