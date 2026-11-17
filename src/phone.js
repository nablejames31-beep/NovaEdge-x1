// The NovaEdge X1 — built entirely in code from separate components
// so every part can break apart, glow and be clicked on its own.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { PHONE, PARTS, PALETTE } from './config.js';
import * as TX from './textures.js';

const { width: W, height: H, depth: D, radius: R } = PHONE;
const GLASS_T = 0.018; // glass thickness (front & back)
const FRAME_D = D - GLASS_T * 2; // frame depth between the two glass panels

export const smoothstep = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

function roundedRectShape(w, h, r) {
  const s = new THREE.Shape();
  const x0 = -w / 2;
  const x1 = w / 2;
  const y0 = -h / 2;
  const y1 = h / 2;
  s.moveTo(x0 + r, y0);
  s.lineTo(x1 - r, y0);
  s.absarc(x1 - r, y0 + r, r, -Math.PI / 2, 0, false);
  s.lineTo(x1, y1 - r);
  s.absarc(x1 - r, y1 - r, r, 0, Math.PI / 2, false);
  s.lineTo(x0 + r, y1);
  s.absarc(x0 + r, y1 - r, r, Math.PI / 2, Math.PI, false);
  s.lineTo(x0, y0 + r);
  s.absarc(x0 + r, y0 + r, r, Math.PI, Math.PI * 1.5, false);
  return s;
}

// Smooth, bevelled rounded slab (optionally with a hole → frame ring)
function roundedSlab(w, h, r, depth, bevel, hole) {
  const shape = roundedRectShape(w - 2 * bevel, h - 2 * bevel, Math.max(0.002, r - bevel));
  if (hole) shape.holes.push(roundedRectShape(hole.w, hole.h, hole.r));
  let geo = new THREE.ExtrudeGeometry(shape, {
    depth: Math.max(0.001, depth - 2 * bevel),
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 5,
    curveSegments: 32,
  });
  geo.translate(0, 0, -(depth - 2 * bevel) / 2);
  geo.deleteAttribute('normal');
  geo.deleteAttribute('uv');
  geo = mergeVertices(geo, 1e-4);
  geo.computeVertexNormals();
  return geo;
}

// Outline of a rounded rectangle at several depths (for glowing edges)
function roundedOutline(w, h, r, zs) {
  const pts = roundedRectShape(w, h, r).getPoints(24);
  const arr = [];
  for (const z of zs) {
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i];
      const b = pts[(i + 1) % pts.length];
      arr.push(a.x, a.y, z, b.x, b.y, z);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3));
  return g;
}

// Flat rounded panel with 0..1 UVs (for screens / labels)
function roundedPanel(w, h, r) {
  const geo = new THREE.ShapeGeometry(roundedRectShape(w, h, r), 32);
  const pos = geo.attributes.position;
  const uv = geo.attributes.uv;
  for (let i = 0; i < pos.count; i++) uv.setXY(i, pos.getX(i) / w + 0.5, pos.getY(i) / h + 0.5);
  return geo;
}

export function buildPhone() {
  const root = new THREE.Group();
  root.name = 'NovaEdgeX1';
  const parts = {};
  const meshes = [];
  const cyanEdge = new THREE.Color(PALETTE.cyan).multiplyScalar(2.6);

  function makePart(id, basePos) {
    const cfg = PARTS[id];
    const group = new THREE.Group();
    group.name = id;
    group.position.copy(basePos);
    root.add(group);
    const edgeMat = new THREE.LineBasicMaterial({
      color: cyanEdge,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
    });
    const part = {
      id,
      cfg,
      group,
      base: basePos.clone(),
      offset: new THREE.Vector3(...cfg.explode),
      delay: cfg.delay,
      materials: [],
      edgeMat,
      edges: [],
      opacity: 1,
    };
    parts[id] = part;
    return part;
  }

  function addMesh(part, geo, mat, parent = part.group) {
    const m = new THREE.Mesh(geo, mat);
    m.userData.part = part.id;
    parent.add(m);
    meshes.push(m);
    const list = Array.isArray(mat) ? mat : [mat];
    for (const mm of list) {
      if (!part.materials.includes(mm)) {
        mm.userData.baseOpacity = mm.opacity;
        mm.userData.baseTransparent = mm.transparent;
        part.materials.push(mm);
      }
    }
    return m;
  }

  function addEdges(part, geo, parent = part.group, transform) {
    const l = new THREE.LineSegments(geo, part.edgeMat);
    if (transform) transform(l);
    l.renderOrder = 10;
    parent.add(l);
    part.edges.push(l);
    return l;
  }

  // ── Materials ──
  const metal = () =>
    new THREE.MeshPhysicalMaterial({
      color: '#b9c3ce',
      metalness: 1,
      roughness: 0.26,
      clearcoat: 0.4,
      clearcoatRoughness: 0.2,
    });
  const navyGlass = () =>
    new THREE.MeshPhysicalMaterial({
      color: '#0d1c38',
      metalness: 0.55,
      roughness: 0.16,
      clearcoat: 1,
      clearcoatRoughness: 0.06,
    });
  const darkGlass = () =>
    new THREE.MeshPhysicalMaterial({ color: '#05080f', metalness: 0.2, roughness: 0.1, clearcoat: 1, clearcoatRoughness: 0.04 });

  // ── FRAME ──
  {
    const p = makePart('frame', new THREE.Vector3(0, 0, 0));
    const bevel = 0.014;
    const holeInset = 0.05;
    const geo = roundedSlab(W, H, R, FRAME_D, bevel, { w: W - holeInset * 2, h: H - holeInset * 2, r: R - holeInset });
    const mat = metal();
    addMesh(p, geo, mat);
    // side buttons
    const btnGeoA = new RoundedBoxGeometry(0.035, 0.34, 0.05, 3, 0.014);
    const btnGeoB = new RoundedBoxGeometry(0.035, 0.52, 0.05, 3, 0.014);
    const bA = addMesh(p, btnGeoA, mat);
    bA.position.set(W / 2 - 0.006, 0.62, 0);
    const bB = addMesh(p, btnGeoB, mat);
    bB.position.set(-W / 2 + 0.006, 0.78, 0);
    addEdges(p, roundedOutline(W, H, R, [FRAME_D / 2, -FRAME_D / 2]));
  }

  // ── SCREEN ──
  {
    const z = FRAME_D / 2 + GLASS_T / 2;
    const p = makePart('screen', new THREE.Vector3(0, 0, z));
    const gw = W - 0.016;
    const gh = H - 0.016;
    const gr = R - 0.008;
    const body = roundedSlab(gw, gh, gr, GLASS_T, 0.006);
    addMesh(p, body, darkGlass());
    const tex = TX.screenTexture();
    const dispMat = new THREE.MeshPhysicalMaterial({
      color: '#000000',
      emissive: '#ffffff',
      emissiveMap: tex,
      emissiveIntensity: 0.95,
      roughness: 0.08,
      metalness: 0,
      clearcoat: 1,
      clearcoatRoughness: 0.02,
    });
    const disp = addMesh(p, roundedPanel(gw - 0.006, gh - 0.006, gr - 0.003), dispMat);
    disp.position.z = GLASS_T / 2 + 0.0006;
    p.display = dispMat;
    addEdges(p, roundedOutline(gw, gh, gr, [GLASS_T / 2 + 0.001]));
  }

  // ── BACK GLASS ──
  {
    const z = -(FRAME_D / 2 + GLASS_T / 2);
    const p = makePart('back', new THREE.Vector3(0, 0, z));
    const gw = W - 0.016;
    const gh = H - 0.016;
    const gr = R - 0.008;
    addMesh(p, roundedSlab(gw, gh, gr, GLASS_T, 0.006), navyGlass());
    const logoMat = new THREE.MeshStandardMaterial({
      map: TX.logoTexture(),
      transparent: true,
      metalness: 0.9,
      roughness: 0.25,
      depthWrite: false,
    });
    const logo = addMesh(p, new THREE.PlaneGeometry(0.82, 0.16), logoMat);
    logo.rotation.y = Math.PI;
    logo.position.set(0, -0.75, -GLASS_T / 2 - 0.0008);
    addEdges(p, roundedOutline(gw, gh, gr, [-GLASS_T / 2 - 0.001, GLASS_T / 2]));
  }

  // ── CAMERA MODULE ──
  {
    const plateD = 0.036;
    const z = -(FRAME_D / 2 + GLASS_T) - plateD / 2;
    const p = makePart('camera', new THREE.Vector3(-W / 2 + 0.45, H / 2 - 0.45, z));
    // inner group lets the module flip to face the viewer when exploded
    const inner = new THREE.Group();
    p.group.add(inner);
    p.inner = inner;
    const plateMat = new THREE.MeshPhysicalMaterial({
      color: '#0a1427',
      metalness: 0.6,
      roughness: 0.18,
      clearcoat: 1,
      clearcoatRoughness: 0.05,
    });
    addMesh(p, roundedSlab(0.68, 0.68, 0.18, plateD, 0.01), plateMat, inner);
    addEdges(p, roundedOutline(0.68, 0.68, 0.18, [-plateD / 2 - 0.001, plateD / 2]), inner);

    const ringMat = metal();
    const lensTex = TX.lensTexture();
    const glassTop = new THREE.MeshPhysicalMaterial({
      map: lensTex,
      roughness: 0.04,
      metalness: 0.1,
      clearcoat: 1,
      clearcoatRoughness: 0,
      iridescence: 0.6,
      iridescenceIOR: 1.5,
    });
    const glassSide = new THREE.MeshStandardMaterial({ color: '#05070c', roughness: 0.3, metalness: 0.4 });
    p.lenses = [];
    const lensPos = [
      [-0.14, 0.14],
      [-0.14, -0.14],
      [0.14, 0],
    ];
    const ringGeo = new THREE.CylinderGeometry(0.122, 0.128, 0.04, 64);
    const glassGeo = new THREE.CylinderGeometry(0.098, 0.098, 0.044, 64);
    const ringEdge = new THREE.EdgesGeometry(ringGeo, 30);
    lensPos.forEach(([x, y]) => {
      const holder = new THREE.Group();
      holder.position.set(x, y, -plateD / 2 - 0.014);
      holder.rotation.x = -Math.PI / 2; // cylinder axis → -Z (facing out of the back)
      inner.add(holder);
      addMesh(p, ringGeo, ringMat, holder);
      const glass = addMesh(p, glassGeo, [glassSide, glassTop, glassSide], holder);
      addEdges(p, ringEdge, holder);
      p.lenses.push(glass);
    });
    // flash
    const flashMat = new THREE.MeshStandardMaterial({
      color: '#fff4dc',
      emissive: '#ffe3b0',
      emissiveIntensity: 0.25,
      roughness: 0.3,
    });
    const flash = addMesh(p, new THREE.CylinderGeometry(0.042, 0.042, 0.016, 32), flashMat, inner);
    flash.rotation.x = -Math.PI / 2;
    flash.position.set(0.15, 0.205, -plateD / 2 - 0.006);
    p.flashMat = flashMat;
    const sensor = addMesh(p, new THREE.CylinderGeometry(0.022, 0.022, 0.012, 24), darkGlass(), inner);
    sensor.rotation.x = -Math.PI / 2;
    sensor.position.set(0.15, -0.205, -plateD / 2 - 0.004);
    const light = new THREE.PointLight('#fff1d6', 0, 0, 2);
    light.position.set(0.15, 0.205, -0.6);
    inner.add(light);
    p.flashLight = light;
  }

  // ── PROCESSOR ──
  {
    const p = makePart('processor', new THREE.Vector3(0.32, 0.95, 0));
    const subMat = new THREE.MeshPhysicalMaterial({
      color: '#13213d',
      metalness: 0.5,
      roughness: 0.35,
      emissive: PALETTE.cyan,
      emissiveIntensity: 0,
    });
    addMesh(p, new RoundedBoxGeometry(0.46, 0.46, 0.024, 2, 0.008), subMat);
    addEdges(p, new THREE.EdgesGeometry(new THREE.BoxGeometry(0.46, 0.46, 0.024)));
    const lidMat = new THREE.MeshPhysicalMaterial({ color: '#cfd7e0', metalness: 1, roughness: 0.3 });
    const lid = addMesh(p, new RoundedBoxGeometry(0.34, 0.34, 0.03, 2, 0.01), lidMat);
    lid.position.z = 0.026;
    const face = addMesh(
      p,
      new THREE.PlaneGeometry(0.32, 0.32),
      new THREE.MeshPhysicalMaterial({ map: TX.processorTexture(), metalness: 0.85, roughness: 0.32 }),
    );
    face.position.z = 0.026 + 0.0151;
    addEdges(p, new THREE.EdgesGeometry(new THREE.BoxGeometry(0.34, 0.34, 0.03)), p.group, (l) => (l.position.z = 0.026));
    p.substrate = subMat;
  }

  // ── STORAGE ──
  {
    const p = makePart('storage', new THREE.Vector3(-0.32, 0.55, 0));
    const mat = new THREE.MeshPhysicalMaterial({ color: '#0e1118', metalness: 0.3, roughness: 0.45 });
    addMesh(p, new RoundedBoxGeometry(0.42, 0.28, 0.035, 2, 0.008), mat);
    const face = addMesh(
      p,
      new THREE.PlaneGeometry(0.4, 0.26),
      new THREE.MeshStandardMaterial({ map: TX.storageTexture(), roughness: 0.5, metalness: 0.2 }),
    );
    face.position.z = 0.0176;
    addEdges(p, new THREE.EdgesGeometry(new THREE.BoxGeometry(0.42, 0.28, 0.035)));
  }

  // ── BATTERY ──
  {
    const p = makePart('battery', new THREE.Vector3(0, -0.55, 0));
    const mat = new THREE.MeshPhysicalMaterial({
      color: '#1b212c',
      metalness: 0.4,
      roughness: 0.42,
      emissive: PALETTE.cyan,
      emissiveIntensity: 0,
    });
    addMesh(p, new RoundedBoxGeometry(1.28, 1.75, 0.07, 3, 0.022), mat);
    const face = addMesh(
      p,
      new THREE.PlaneGeometry(1.22, 1.68),
      new THREE.MeshStandardMaterial({ map: TX.batteryTexture(), roughness: 0.55, metalness: 0.2 }),
    );
    face.position.z = 0.0356;
    addEdges(p, new THREE.EdgesGeometry(new THREE.BoxGeometry(1.28, 1.75, 0.07)));
    p.body = mat;
  }

  const tmp = new THREE.Vector3();

  function setPartOpacity(part, o) {
    if (Math.abs(part.opacity - o) < 0.002) return;
    part.opacity = o;
    for (const m of part.materials) {
      m.opacity = o * m.userData.baseOpacity;
      const tr = m.userData.baseTransparent || o < 0.999;
      if (m.transparent !== tr) {
        m.transparent = tr;
        m.needsUpdate = true;
      }
      m.depthWrite = o > 0.6 && !m.userData.baseTransparent;
    }
  }

  // Called every frame with the scroll-driven state
  function update(state, fx, t, hover) {
    const focus = {
      processor: state.hlProcessor,
      camera: state.hlCamera,
      battery: state.hlBattery,
      storage: state.hlStorage,
    };
    const anyFocus = Math.max(focus.processor, focus.camera, focus.battery, focus.storage);

    for (const id in parts) {
      const p = parts[id];
      const d = p.delay * 0.35;
      const e = smoothstep(d, d + 0.65, state.explode);
      p.group.position.copy(p.base).addScaledVector(p.offset, e);
      const hl = focus[id] ?? 0;
      const dim = anyFocus * (1 - hl);
      setPartOpacity(p, 1 - 0.86 * dim);
      const h = hover[id] || 0;
      p.edgeMat.opacity = Math.min(1, state.outlines * 0.55 * (1 - dim) + hl * 0.9 + h * 0.9);
      for (const l of p.edges) l.visible = p.edgeMat.opacity > 0.003;
    }

    // camera module flips to face the viewer while exploded
    const cam = parts.camera;
    const flip = smoothstep(0.15, 0.95, state.camFlip);
    cam.inner.rotation.y = flip * Math.PI + fx.lensSpin * 0.18;
    cam.inner.rotation.x = fx.lensSpin * 0.08;
    cam.lenses.forEach((l, i) => (l.rotation.y = fx.lensSpin * (i % 2 ? -1.2 : 1.2) + t * 0.05 * state.hlCamera));
    cam.flashMat.emissiveIntensity = 0.25 + fx.flash * 14;
    cam.flashLight.intensity = fx.flash * 6;

    parts.processor.substrate.emissiveIntensity = state.hlProcessor * (0.35 + 0.25 * Math.sin(t * 5));
    parts.battery.body.emissiveIntensity = state.battFx * 0.12;
    parts.screen.display.emissiveIntensity = 0.95 * (1 - 0.6 * anyFocus);
  }

  function partWorldPosition(id, target = tmp) {
    return parts[id].group.getWorldPosition(target);
  }

  return { root, parts, meshes, update, partWorldPosition };
}
