// Starter scenes for dry PanPhyMech v1.
export const list = [
  {
    title: 'Drop & bounce',
    tip: 'Hold the sphere, lift it, and release. Try a gentle toss.',
    build(world) {
      world.clearScene();
      const a = world.place(-0.9, 1.6);
      const b = world.place(0.55, 0.35);
      world.addSphere(a.x, a.y, { r: 0.24, restitution: 0.55, density: 850 });
      world.addBlock(b.x, b.y, { w: 0.7, h: 0.22, density: 900, friction: 0.5 });
    }
  },
  {
    title: 'Stack',
    tip: 'A short tower. Nudge the bottom block and watch it topple.',
    build(world) {
      world.clearScene();
      const sizes = [
        { w: 1.0, h: 0.22, y: 0.22 },
        { w: 0.75, h: 0.22, y: 0.48 },
        { w: 0.5, h: 0.22, y: 0.74 },
        { w: 0.32, h: 0.32, y: 1.05 }
      ];
      for (const s of sizes) {
        const p = world.place(0, s.y);
        if (s.w === s.h) world.addBlock(p.x, p.y, { w: s.w, h: s.h, density: 650, restitution: 0.05 });
        else world.addBlock(p.x, p.y, { w: s.w, h: s.h, density: 650, restitution: 0.05, friction: 0.55 });
      }
    }
  },
  {
    title: 'Spring mass',
    tip: 'Pinned ceiling anchor, spring, and hanging sphere. Pull the ball sideways.',
    build(world) {
      world.clearScene();
      const anchor = world.place(0, 3.2);
      const mass = world.place(0, 1.5);
      const fixed = world.addBlock(anchor.x, anchor.y, {
        w: 0.55, h: 0.16, density: 1200, fixed: true, friction: 0.8
      });
      const ball = world.addSphere(mass.x, mass.y, { r: 0.2, density: 1000, restitution: 0.2 });
      world.addSpring(fixed.body, ball.body, { stiffness: 0.04, damping: 0.03 });
    }
  },
  {
    title: 'Pendulum',
    tip: 'A plank pinned at one end. Give it a shove.',
    build(world) {
      world.clearScene();
      const pivot = world.place(0, 2.8);
      const mid = world.place(0.55, 2.8);
      const plank = world.addPlank(mid.x, mid.y, {
        w: 1.2, h: 0.1, density: 600, restitution: 0.05, friction: 0.2
      });
      world.addPinAt(plank.body, pivot.x, pivot.y);
    }
  },
  {
    title: 'Empty table',
    tip: 'Arm a part in the tray, click the table to place it. Hold to pick up.',
    build(world) {
      world.clearScene();
    }
  }
];
