import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { radialTexture, rgbaTexture } from '/assets/three-textures.js';

const RULER_W = 0.34;
const RULER_PX_W = 320;
const RULER_PX_H = 2048;
const RULER_MARGIN = 16;

function dataMap(size, repeatX, repeatY, value) {
  const texture = rgbaTexture(THREE, size, size, (x, y) => {
    const v = Math.max(0, Math.min(255, Math.round(value(x, y))));
    return [v, v, v, 255];
  });
  texture.colorSpace = THREE.NoColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeatX, repeatY);
  return texture;
}

function drawRuler() {
  const canvas = document.createElement('canvas');
  canvas.width = RULER_PX_W;
  canvas.height = RULER_PX_H;
  const ctx = canvas.getContext('2d');
  const face = ctx.createLinearGradient(0, 0, RULER_PX_W, 0);
  face.addColorStop(0, '#d9dde2');
  face.addColorStop(.5, '#eef0f2');
  face.addColorStop(1, '#ccd1d7');
  ctx.fillStyle = face;
  ctx.fillRect(0, 0, RULER_PX_W, RULER_PX_H);
  ctx.fillStyle = '#111318';
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'right';
  const perMm = (RULER_PX_H - RULER_MARGIN * 2) / 500;
  for (let mm = 0; mm <= 500; mm += 1) {
    const y = RULER_MARGIN + mm * perMm;
    const isCm = mm % 10 === 0;
    const isFive = mm % 50 === 0;
    const length = mm % 100 === 0 ? 112 : isFive ? 92 : isCm ? 66 : mm % 5 === 0 ? 40 : 24;
    const weight = isFive ? 4.5 : isCm ? 3.4 : 2;
    ctx.fillRect(0, y - weight / 2, length, weight);
    if (isFive) {
      ctx.font = `600 ${mm % 100 === 0 ? 62 : 46}px "IBM Plex Mono", monospace`;
      ctx.fillText(String(mm / 10), RULER_PX_W - 22, Math.max(36, Math.min(RULER_PX_H - 36, y)));
    }
  }
  ctx.font = '500 30px "IBM Plex Mono", monospace';
  ctx.fillText('cm', RULER_PX_W - 22, 96);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function jawGeometry(sign) {
  const shape = new THREE.Shape();
  shape.moveTo(sign * -.03, .025);
  shape.lineTo(sign * .03, .025);
  shape.quadraticCurveTo(sign * .036, -.095, sign * .062, -.185);
  shape.lineTo(sign * .034, -.218);
  shape.quadraticCurveTo(sign * -.026, -.11, sign * -.03, .025);
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: .056, bevelEnabled: true, bevelThickness: .007, bevelSize: .006, bevelSegments: 3, curveSegments: 18 });
  geometry.translate(0, 0, -.028);
  return geometry;
}

export function createRig({ renderer, scene, height, top, ballRadius }) {
  const group = new THREE.Group();
  scene.add(group);
  const floorY = top - height;
  const clampY = top + ballRadius;
  const headY = clampY + .27;

  const pmrem = new THREE.PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  scene.environment = pmrem.fromScene(room, .035).texture;
  scene.environmentIntensity = .62;
  room.traverse((item) => { item.geometry?.dispose(); item.material?.dispose?.(); });
  pmrem.dispose();

  const anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const hammer = dataMap(128, 5, 3, (x, y) => 128
    + 46 * Math.sin(x * .31 + 2 * Math.sin(y * .17)) * Math.sin(y * .29 + 2 * Math.sin(x * .13))
    + (Math.random() - .5) * 26);
  const brushed = dataMap(128, 1, 7, (x) => 112 + 44 * Math.sin(x * 1.9) * Math.sin(x * .37) + (Math.random() - .5) * 34);
  const knurl = dataMap(64, 3, 1, (x, y) => (((x + y) % 8 < 4) !== (((x - y + 64) % 8) < 4) ? 230 : 25));
  [hammer, brushed, knurl].forEach((texture) => { texture.anisotropy = anisotropy; });

  const chrome = new THREE.MeshStandardMaterial({ color: 0xe8ebef, metalness: 1, roughness: .13 });
  const steel = new THREE.MeshStandardMaterial({ color: 0xb9bec6, metalness: .95, roughness: .34 });
  const iron = new THREE.MeshStandardMaterial({ color: 0x20252c, metalness: .45, roughness: .58, bumpMap: hammer, bumpScale: 1.4 });
  const aluminum = new THREE.MeshStandardMaterial({ color: 0x8e959e, metalness: .9, roughness: .46, bumpMap: hammer, bumpScale: .25 });
  const anodized = new THREE.MeshStandardMaterial({ color: 0x15171c, metalness: .72, roughness: .36 });
  const rubber = new THREE.MeshStandardMaterial({ color: 0x08090b, metalness: 0, roughness: .86 });
  const brass = new THREE.MeshStandardMaterial({ color: 0xc69a4a, metalness: 1, roughness: .28 });
  const knurled = new THREE.MeshStandardMaterial({ color: 0xc4c8ce, metalness: 1, roughness: .32, bumpMap: knurl, bumpScale: 1.2 });

  const add = (geometry, material, x, y, z = 0, parent = group) => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    parent.add(mesh);
    return mesh;
  };
  const alongZ = (mesh) => { mesh.rotation.x = Math.PI / 2; return mesh; };

  /* Cast-iron base with rubber feet and a landing pad whose top is the zero-height floor. */
  const baseTop = floorY - .012;
  add(new RoundedBoxGeometry(2, .09, .92, 5, .036), iron, -.12, baseTop - .045);
  [[-1.02, .36], [.78, .36], [-1.02, -.36], [.78, -.36]].forEach(([x, z]) => {
    add(new THREE.CylinderGeometry(.06, .07, .035, 20), rubber, x, baseTop - .105, z);
  });
  add(new THREE.CylinderGeometry(.235, .25, .012, 56), rubber, 0, floorY - .006);
  const padRim = add(new THREE.TorusGeometry(.25, .006, 10, 64), steel, 0, floorY - .005);
  padRim.rotation.x = Math.PI / 2;

  /* Chrome rod, hex collar and domed cap. */
  const rodX = -.86;
  const rodTop = clampY + .64;
  add(new THREE.CylinderGeometry(.042, .042, rodTop - baseTop, 32), chrome, rodX, (rodTop + baseTop) / 2);
  add(new THREE.CylinderGeometry(.105, .115, .05, 6), steel, rodX, baseTop + .025);
  add(new THREE.CylinderGeometry(.062, .08, .035, 28), chrome, rodX, baseTop + .067);
  add(new THREE.SphereGeometry(.046, 24, 14, 0, Math.PI * 2, 0, Math.PI / 2), chrome, rodX, rodTop);

  /* Boss head, thumbscrew and support arm. */
  add(new RoundedBoxGeometry(.22, .2, .2, 4, .03), aluminum, rodX, headY);
  alongZ(add(new THREE.CylinderGeometry(.018, .018, .1, 14), steel, rodX, headY, .13));
  alongZ(add(new THREE.CylinderGeometry(.062, .062, .05, 32), knurled, rodX, headY, .175));
  alongZ(add(new THREE.CylinderGeometry(.04, .046, .008, 28), chrome, rodX, headY, .204));
  const armLength = -rodX - .12;
  const arm = add(new THREE.CylinderGeometry(.027, .027, armLength, 24), chrome, rodX + armLength / 2, headY);
  arm.rotation.z = Math.PI / 2;

  /* Release head with sprung jaws. */
  add(new RoundedBoxGeometry(.5, .14, .18, 4, .028), anodized, 0, headY);
  [-.19, .19].forEach((x) => {
    alongZ(add(new THREE.CylinderGeometry(.018, .018, .012, 20), brass, x, headY + .035, .094));
  });
  const makeJaw = (sign) => {
    const pivot = new THREE.Group();
    pivot.position.set(-sign * (ballRadius + .06), clampY + .195, 0);
    group.add(pivot);
    add(jawGeometry(sign), steel, 0, 0, 0, pivot);
    add(new THREE.SphereGeometry(.023, 18, 12), rubber, sign * .056, -.2, 0, pivot);
    alongZ(add(new THREE.CylinderGeometry(.017, .017, .085, 18), brass, 0, 0, 0, pivot));
    return pivot;
  };
  const jawLeft = makeJaw(1);
  const jawRight = makeJaw(-1);

  const lampMaterial = new THREE.MeshBasicMaterial({ color: 0x4a2c08 });
  alongZ(add(new THREE.CylinderGeometry(.034, .034, .01, 24), chrome, 0, headY, .092));
  add(new THREE.SphereGeometry(.026, 18, 12), lampMaterial, 0, headY, .098);
  const lampGlow = new THREE.Sprite(new THREE.SpriteMaterial({
    map: radialTexture(THREE, 64, [[0, 1], [.28, .55], [1, 0]]),
    color: 0xfff4d6,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    transparent: true,
  }));
  lampGlow.position.set(0, headY, .14);
  lampGlow.scale.setScalar(.42);
  group.add(lampGlow);

  /* Engraved steel rule on two brackets. */
  const rulerX = rodX + .42;
  const rulerHeight = height * RULER_PX_H / (RULER_PX_H - RULER_MARGIN * 2);
  const edge = new THREE.MeshStandardMaterial({ color: 0xaeb4bc, metalness: 1, roughness: .28 });
  const face = new THREE.MeshStandardMaterial({ map: drawRuler(), color: 0x9da2a9, metalness: .12, roughness: .78, roughnessMap: brushed, envMapIntensity: .4 });
  face.map.anisotropy = anisotropy;
  const ruler = new THREE.Mesh(new THREE.BoxGeometry(RULER_W, rulerHeight, .018), [edge, edge, edge, edge, face, edge]);
  ruler.position.set(rulerX, top - height / 2, 0);
  group.add(ruler);
  document.fonts?.ready.then(() => {
    const old = face.map;
    face.map = drawRuler();
    face.map.anisotropy = anisotropy;
    face.needsUpdate = true;
    old.dispose();
  });
  [top - height * .12, top - height * .88].forEach((y) => {
    add(new RoundedBoxGeometry(.32, .075, .05, 2, .012), steel, rodX + .15, y, -.024);
    alongZ(add(new THREE.CylinderGeometry(.021, .021, .012, 18), chrome, rulerX - RULER_W / 2 - .035, y, .006));
  });

  /* The ball and its reading line. */
  const ball = new THREE.Mesh(
    new THREE.SphereGeometry(ballRadius, 48, 32),
    new THREE.MeshPhysicalMaterial({ color: 0xb8261b, metalness: 0, roughness: .2, clearcoat: 1, clearcoatRoughness: .05 }),
  );
  group.add(ball);
  const marker = new THREE.Mesh(new THREE.PlaneGeometry(.78, .014), new THREE.MeshBasicMaterial({ color: 0x35e08a }));
  marker.visible = false;
  group.add(marker);

  const contact = new THREE.Mesh(
    new THREE.PlaneGeometry(.46, .46),
    new THREE.MeshBasicMaterial({
      map: radialTexture(THREE, 64, [[0, .9], [.45, .42], [1, 0]], [0, 0, 0]),
      transparent: true,
      depthWrite: false,
    }),
  );
  contact.rotation.x = -Math.PI / 2;
  contact.position.set(0, floorY + .002, 0);
  group.add(contact);

  return {
    group,
    ball,
    floorY,
    clampY,
    reset() {
      jawLeft.rotation.z = 0;
      jawRight.rotation.z = 0;
      lampMaterial.color.set(0x4a2c08);
      lampGlow.visible = false;
      marker.visible = false;
    },
    release() {
      jawLeft.rotation.z = -.62;
      jawRight.rotation.z = .62;
      lampMaterial.color.set(0xffffff);
      lampGlow.visible = true;
    },
    mark() {
      marker.position.set(rulerX + .2, ball.position.y - ballRadius, .024);
      marker.visible = true;
    },
    sync() {
      contact.visible = ball.visible;
      const gap = Math.max(0, (ball.position.y - ballRadius - floorY) / height);
      contact.material.opacity = .72 * (1 - gap) ** 2;
      contact.scale.setScalar(.48 + gap * .9);
    },
  };
}
