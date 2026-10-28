// Starter scenes for the PanPhyMech beta.
(function (root) {
  const PPM = root.PPM = root.PPM || {};

  const list = [
    {
      title: 'Float or sink',
      tip: 'Same fluid, two densities. The light circle floats; the dense box sinks.',
      build(world) {
        world.clearScene();
        // Pool sits on a shelf so sinkers rest in the fluid instead of falling through.
        world.addBox(0, 4.35, { w: 4.4, h: 0.16, density: 1000, fixed: true, friction: 0.5 });
        world.addFluid(0, 3.2, { w: 4.2, h: 2.2, rho: 1000, eta: 0.8, label: 'Water-like' });
        world.addCircle(-0.7, 1.4, { r: 0.28, density: 400, restitution: 0.15 });
        world.addBox(0.8, 1.3, { w: 0.45, h: 0.45, density: 2000, restitution: 0.05 });
      }
    },
    {
      title: 'Stokes terminal speed',
      tip: 'High viscosity. Watch the circle approach a steady fall speed under F = −6πηrv.',
      build(world) {
        world.clearScene();
        world.addBox(0, 4.55, { w: 3.4, h: 0.16, density: 1000, fixed: true, friction: 0.2 });
        world.addFluid(0, 2.8, { w: 3.2, h: 3.4, rho: 900, eta: 2.5, label: 'Glycerin-like' });
        world.addCircle(0, 0.6, { r: 0.18, density: 1200, friction: 0.05, restitution: 0 });
      }
    },
    {
      title: 'Ramp into a pool',
      tip: 'Slide off the ramp into the fluid. Drag and buoyancy change the motion.',
      build(world) {
        world.clearScene();
        world.addRamp(-1.6, 2.0, { w: 2.8, h: 0.14, angleDeg: 22, friction: 0.08 });
        world.addBox(1.3, 4.4, { w: 3.2, h: 0.16, density: 1000, fixed: true, friction: 0.4 });
        world.addFluid(1.3, 3.3, { w: 3.0, h: 2.0, rho: 1000, eta: 1.0, label: 'Pool' });
        world.addCircle(-2.4, 0.9, { r: 0.22, density: 700, restitution: 0.1, friction: 0.05 });
        world.addWall(2.75, 2.8, { w: 0.12, h: 2.4 });
      }
    },
    {
      title: 'Empty sandbox',
      tip: 'Drag parts from the library. Fluids apply buoyancy and Stokes drag F = −6πηrv.',
      build(world) {
        world.clearScene();
      }
    }
  ];

  PPM.examples = { list };
})(typeof globalThis === 'object' ? globalThis : this);
