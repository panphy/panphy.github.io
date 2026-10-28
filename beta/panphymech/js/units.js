// Shared SI ↔ Matter pixel helpers (no DOM). Matter +y is down.
export const SCALE = 80; // px per meter
export const G = 9.81;
export const DEPTH = 0.22; // visual extrusion (m)

export function m2px(m) {
  return m * SCALE;
}

export function px2m(px) {
  return px / SCALE;
}

/** Rest length for a spring between two Matter positions (pixels). */
export function springRestPx(ax, ay, bx, by, stretch = 1) {
  const dx = bx - ax;
  const dy = by - ay;
  return Math.hypot(dx, dy) * stretch;
}

/** Matter Verlet force scale matching engine gravity.scale 0.001. */
export function matterForceFromSI(fNewton, massKg) {
  // F_matter = F_si * (gravity.scale / g) so a = F/m matches SI under Verlet.
  const GRAVITY_SCALE = 0.001;
  return fNewton * (GRAVITY_SCALE / G);
}

export function bodyMassFromDensity(kind, props) {
  const density = props.density ?? 800;
  if (kind === 'sphere') {
    const r = props.r ?? 0.2;
    // Treat as a thin disk of unit thickness in 2D: mass ∝ ρ π r²
    return density * Math.PI * r * r;
  }
  const w = props.w ?? 0.4;
  const h = props.h ?? 0.3;
  return density * w * h;
}
