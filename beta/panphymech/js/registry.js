// Parts tray catalog for dry PanPhyMech v1.
export const parts = {
  select: {
    id: 'select',
    name: 'Hand',
    group: 'Tools',
    blurb: 'Hold and throw bodies',
    tool: true
  },
  sphere: {
    id: 'sphere',
    name: 'Sphere',
    group: 'Bodies',
    blurb: 'Solid ball',
    defaults: { r: 0.22, density: 900, friction: 0.25, restitution: 0.35, fixed: false },
    color: 0x3d8bfd
  },
  block: {
    id: 'block',
    name: 'Block',
    group: 'Bodies',
    blurb: 'Solid rectangular block',
    defaults: { w: 0.45, h: 0.35, density: 700, friction: 0.35, restitution: 0.12, fixed: false },
    color: 0xd97706
  },
  plank: {
    id: 'plank',
    name: 'Plank',
    group: 'Bodies',
    blurb: 'Long thin beam',
    defaults: { w: 1.4, h: 0.1, density: 550, friction: 0.4, restitution: 0.08, fixed: false },
    color: 0xb45309
  },
  pin: {
    id: 'pin',
    name: 'Pin',
    group: 'Connect',
    blurb: 'Pin a point on a body to the world',
    tool: true
  },
  spring: {
    id: 'spring',
    name: 'Spring',
    group: 'Connect',
    blurb: 'Connect two bodies with a spring',
    tool: true,
    defaults: { stiffness: 0.05, damping: 0.04 }
  }
};

export const order = ['select', 'sphere', 'block', 'plank', 'pin', 'spring'];

export function get(id) {
  return parts[id];
}
