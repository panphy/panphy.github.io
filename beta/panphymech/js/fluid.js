// PanPhyMech fluid forces: buoyancy and Stokes drag F = -6πηrv.
// Pure geometry and force helpers; no Matter.js dependency (unit-tested).
(function (root) {
  const PPM = root.PPM = root.PPM || {};

  const PI = Math.PI;

  // Circle–AABB overlap area (circle center cx,cy, radius r; box left/top/right/bottom).
  function circleAabbOverlapArea(cx, cy, r, left, top, right, bottom) {
    if (!(r > 0)) return 0;
    // Clamp the circle into the box, then use the standard circular segment formula
    // on each clipped edge via numerical quadrature (stable for a prototype).
    const x0 = Math.max(left, cx - r);
    const x1 = Math.min(right, cx + r);
    if (x1 <= x0) return 0;
    const steps = 24;
    let area = 0;
    const dx = (x1 - x0) / steps;
    for (let i = 0; i < steps; i++) {
      const xa = x0 + i * dx;
      const xb = xa + dx;
      const xm = 0.5 * (xa + xb);
      const halfChord = Math.sqrt(Math.max(0, r * r - (xm - cx) * (xm - cx)));
      const yLo = Math.max(top, cy - halfChord);
      const yHi = Math.min(bottom, cy + halfChord);
      if (yHi > yLo) area += (yHi - yLo) * dx;
    }
    return area;
  }

  // Axis-aligned rectangle overlap area.
  function rectAabbOverlapArea(leftA, topA, rightA, bottomA, leftB, topB, rightB, bottomB) {
    const w = Math.min(rightA, rightB) - Math.max(leftA, leftB);
    const h = Math.min(bottomA, bottomB) - Math.max(topA, topB);
    return w > 0 && h > 0 ? w * h : 0;
  }

  // Equivalent radius for Stokes on a non-circle: disk with the same area.
  function equivalentRadius(area) {
    return area > 0 ? Math.sqrt(area / PI) : 0;
  }

  // Stokes drag force components. F = -6 π η r v (classroom 3D-sphere law on a 2D body).
  function stokesForce(eta, radius, vx, vy) {
    if (!(eta > 0) || !(radius > 0)) return { fx: 0, fy: 0 };
    const k = -6 * PI * eta * radius;
    return { fx: k * vx, fy: k * vy };
  }

  // Buoyancy in 2D: F = ρ A_sub g opposite gravity. gravitySign = +1 if +y is down.
  function buoyancyForce(rho, submergedArea, g, gravitySign) {
    if (!(rho > 0) || !(submergedArea > 0) || !(g > 0)) return { fx: 0, fy: 0 };
    const mag = rho * submergedArea * g;
    return { fx: 0, fy: -gravitySign * mag };
  }

  function fluidForcesForCircle(fluid, body, g, gravitySign) {
    const { cx, cy, r, vx, vy, area } = body;
    const sub = circleAabbOverlapArea(cx, cy, r, fluid.left, fluid.top, fluid.right, fluid.bottom);
    if (!(sub > 0)) return { fx: 0, fy: 0, submergedArea: 0, radius: r };
    const b = buoyancyForce(fluid.rho, sub, g, gravitySign);
    const s = stokesForce(fluid.eta, r, vx, vy);
    return { fx: b.fx + s.fx, fy: b.fy + s.fy, submergedArea: sub, radius: r, area };
  }

  function fluidForcesForBox(fluid, body, g, gravitySign) {
    const { left, top, right, bottom, vx, vy, area } = body;
    const sub = rectAabbOverlapArea(left, top, right, bottom, fluid.left, fluid.top, fluid.right, fluid.bottom);
    if (!(sub > 0)) return { fx: 0, fy: 0, submergedArea: 0, radius: 0 };
    const rEq = equivalentRadius(area);
    const b = buoyancyForce(fluid.rho, sub, g, gravitySign);
    const s = stokesForce(fluid.eta, rEq, vx, vy);
    return { fx: b.fx + s.fx, fy: b.fy + s.fy, submergedArea: sub, radius: rEq, area };
  }

  const api = {
    PI,
    circleAabbOverlapArea,
    rectAabbOverlapArea,
    equivalentRadius,
    stokesForce,
    buoyancyForce,
    fluidForcesForCircle,
    fluidForcesForBox
  };
  PPM.fluid = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof globalThis === 'object' ? globalThis : this);
