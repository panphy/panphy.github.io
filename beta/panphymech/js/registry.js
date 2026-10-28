// PanPhyMech part catalog for the library pane.
(function (root) {
  const PPM = root.PPM = root.PPM || {};

  const parts = {
    circle: {
      id: 'circle',
      name: 'Circle',
      group: 'Bodies',
      blurb: 'Disk with mass, friction and bounce',
      defaults: { r: 0.25, density: 800, friction: 0.2, restitution: 0.2, fixed: false }
    },
    box: {
      id: 'box',
      name: 'Box',
      group: 'Bodies',
      blurb: 'Rectangle body',
      defaults: { w: 0.5, h: 0.35, density: 600, friction: 0.25, restitution: 0.1, fixed: false }
    },
    ramp: {
      id: 'ramp',
      name: 'Ramp',
      group: 'World',
      blurb: 'Static inclined plane',
      defaults: { w: 2.4, h: 0.12, angleDeg: -18, friction: 0.35 }
    },
    wall: {
      id: 'wall',
      name: 'Wall',
      group: 'World',
      blurb: 'Static barrier',
      defaults: { w: 0.12, h: 1.6, friction: 0.3 }
    },
    fluid: {
      id: 'fluid',
      name: 'Fluid',
      group: 'Fluids',
      blurb: 'Pool with buoyancy and Stokes drag',
      defaults: {
        w: 2.8,
        h: 1.6,
        rho: 1000,
        eta: 1.2,
        label: 'Glycerin-like'
      }
    }
  };

  const order = ['circle', 'box', 'ramp', 'wall', 'fluid'];

  function get(id) { return parts[id]; }

  const api = { parts, order, get };
  PPM.registry = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof globalThis === 'object' ? globalThis : this);
