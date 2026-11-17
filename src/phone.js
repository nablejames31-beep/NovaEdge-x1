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

  // ── Materials (tuned for a real, premium product look) ──
  const titanium = () =>
    new THREE.MeshPhysicalMaterial({
      color: '#c3cad2',
      metalness: 1,
      roughness: 0.34,
      clearcoat: 0.15,
      clearcoatRoughness: 0.35,
    });
  const polished = () => new THREE.MeshPhysicalMaterial({ color: '#c9d1da', metalness: 1, roughness: 0.14 });
  // pearl-silver frosted glass back
  const frostedPearl = () =>
    new THREE.MeshPhysicalMaterial({
      color: '#d4d9df',
      metalness: 0.12,
      roughness: 0.34,
      clearcoat: 0.3,
      clearcoatRoughness: 0.6,
      sheen: 0.4,
      sheenColor: new THREE.Color('#ffffff'),
      sheenRoughness: 0.5,
    });
  const darkGlass = () =>
    new THREE.MeshPhysicalMaterial({ color: '#04060b', metalness: 0.1, roughness: 0.06, clearcoat: 1, clearcoatRoughness: 0.02 });
  const plastic = () => new THREE.MeshStandardMaterial({ color: '#2b3038', metalness: 0.2, roughness: 0.55 });
  const hole = () => new THREE.MeshStandardMaterial({ color: '#020203', metalness: 0, roughness: 0.9 });

  // ── FRAME ──
  {
    const p = makePart('frame', new THREE.Vector3(0, 0, 0));
    const bevel = 0.016;
    const holeInset = 0.05;
    const geo = roundedSlab(W, H, R, FRAME_D, bevel, { w: W - holeInset * 2, h: H - holeInset * 2, r: R - holeInset });
    const mat = titanium();
    addMesh(p, geo, mat);
    // side buttons (power right, volume left)
    const btnMat = polished();
    const bA = addMesh(p, new RoundedBoxGeometry(0.03, 0.3, 0.046, 4, 0.012), btnMat);
    bA.position.set(W / 2 - 0.004, 0.6, 0);
    const bB = addMesh(p, new RoundedBoxGeometry(0.03, 0.2, 0.046, 4, 0.012), btnMat);
    bB.position.set(-W / 2 + 0.004, 0.92, 0);
    const bC = addMesh(p, new RoundedBoxGeometry(0.03, 0.2, 0.046, 4, 0.012), btnMat);
    bC.position.set(-W / 2 + 0.004, 0.64, 0);
    // antenna bands
    const band = plastic();
    const sideBand = new THREE.BoxGeometry(0.006, 0.022, FRAME_D - 0.03);
    const endBand = new THREE.BoxGeometry(0.022, 0.006, FRAME_D - 0.03);
    for (const sx of [-1, 1]) {
      for (const sy of [-1, 1]) {
        addMesh(p, sideBand, band).position.set(sx * (W / 2 - 0.001), sy * 1.22, 0);
        addMesh(p, endBand, band).position.set(sx * 0.46, sy * (H / 2 - 0.001), 0);
      }
    }
    // USB-C port, speaker & mic holes (bottom / top edges)
    const holeMat = hole();
    const port = addMesh(p, new RoundedBoxGeometry(0.17, 0.03, 0.05, 4, 0.0149), holeMat);
    port.position.set(0, -H / 2 + 0.008, 0);
    const dot = new THREE.CylinderGeometry(0.009, 0.009, 0.03, 16);
    for (let i = 0; i < 6; i++) {
      for (const side of [-1, 1]) {
        const d = addMesh(p, dot, holeMat);
        d.position.set(side * (0.2 + i * 0.045), -H / 2 + 0.008, 0);
      }
    }
    addMesh(p, dot, holeMat).position.set(0.3, H / 2 - 0.008, 0);
    addEdges(p, roundedOutline(W, H, R, [FRAME_D / 2, -FRAME_D / 2]));
  }

  // ── SCREEN ──
  {
    const z = FRAME_D / 2 + GLASS_T / 2;
    const p = makePart('screen', new THREE.Vector3(0, 0, z));
    const gw = W - 0.016;
    const gh = H - 0.016;
    const gr = R - 0.008;
    addMesh(p, roundedSlab(gw, gh, gr, GLASS_T, 0.007), darkGlass());
    const tex = TX.screenTexture();
    const dispMat = new THREE.MeshPhysicalMaterial({
      color: '#000000',
      emissive: '#ffffff',
      emissiveMap: tex,
      emissiveIntensity: 0.82,
      roughness: 0.18,
      metalness: 0,
      clearcoat: 0.55,
      clearcoatRoughness: 0.04,
    });
    const disp = addMesh(p, roundedPanel(gw - 0.01, gh - 0.01, gr - 0.005), dispMat);
    disp.position.z = GLASS_T / 2 + 0.0006;
    p.display = dispMat;
    p.baseEmissive = 0.82;
    addEdges(p, roundedOutline(gw, gh, gr, [GLASS_T / 2 + 0.001]));
  }

  // ── BACK GLASS (frosted) ──
  {
    const z = -(FRAME_D / 2 + GLASS_T / 2);
    const p = makePart('back', new THREE.Vector3(0, 0, z));
    const gw = W - 0.016;
    const gh = H - 0.016;
    const gr = R - 0.008;
    addMesh(p, roundedSlab(gw, gh, gr, GLASS_T, 0.007), frostedPearl());
    const logoMat = new THREE.MeshPhysicalMaterial({
      map: TX.logoTexture(),
      transparent: true,
      metalness: 1,
      roughness: 0.12,
      depthWrite: false,
    });
    const logo = addMesh(p, new THREE.PlaneGeometry(0.7, 0.137), logoMat);
    logo.rotation.y = Math.PI;
    logo.position.set(0, -0.8, -GLASS_T / 2 - 0.0008);
    addEdges(p, roundedOutline(gw, gh, gr, [-GLASS_T / 2 - 0.001, GLASS_T / 2]));
  }

  // ── CAMERA MODULE ──
  {
    const plateD = 0.03;
    const z = -(FRAME_D / 2 + GLASS_T) - plateD / 2;
    const p = makePart('camera', new THREE.Vector3(-W / 2 + 0.44, H / 2 - 0.44, z));
    // inner group lets the module flip to face the viewer when exploded
    const inner = new THREE.Group();
    p.group.add(inner);
    p.inner = inner;
    const plateMat = new THREE.MeshPhysicalMaterial({
      color: '#e2e6eb',
      metalness: 0.15,
      roughness: 0.1,
      clearcoat: 1,
      clearcoatRoughness: 0.03,
    });
    addMesh(p, roundedSlab(0.66, 0.66, 0.17, plateD, 0.012), plateMat, inner);
    addEdges(p, roundedOutline(0.66, 0.66, 0.17, [-plateD / 2 - 0.001, plateD / 2]), inner);

    // lens housing: lathe profile (radius, height) → chamfered metal ring that steps down into the barrel
    const ringProfile = [
      [0.128, 0.0],
      [0.128, 0.016],
      [0.125, 0.024],
      [0.119, 0.029],
      [0.109, 0.03],
      [0.104, 0.027],
      [0.101, 0.018],
      [0.096, 0.012],
      [0.06, 0.012],
    ].map(([x, y]) => new THREE.Vector2(x, y));
    const ringGeo = new THREE.LatheGeometry(ringProfile, 96);
    const ringMat = polished();
    const barrelMat = new THREE.MeshStandardMaterial({ color: '#030406', roughness: 0.6, metalness: 0.3 });
    const barrelGeo = new THREE.CylinderGeometry(0.096, 0.096, 0.004, 64);
    // slightly domed sapphire cover with planar UVs for the lens texture
    const domeR = 0.24;
    const capR = 0.094;
    const theta = Math.asin(capR / domeR);
    const domeGeo = new THREE.SphereGeometry(domeR, 64, 12, 0, Math.PI * 2, 0, theta);
    {
      const pos = domeGeo.attributes.position;
      const uv = domeGeo.attributes.uv;
      for (let i = 0; i < pos.count; i++) uv.setXY(i, pos.getX(i) / (2 * capR) + 0.5, -pos.getZ(i) / (2 * capR) + 0.5);
      domeGeo.translate(0, -domeR * Math.cos(theta) + 0.014, 0);
    }
    const glassTop = new THREE.MeshPhysicalMaterial({
      map: TX.lensTexture(),
      roughness: 0.02,
      metalness: 0.05,
      clearcoat: 1,
      clearcoatRoughness: 0,
      iridescence: 0.75,
      iridescenceIOR: 1.6,
      iridescenceThicknessRange: [200, 600],
    });
    p.lenses = [];
    const lensPos = [
      [-0.14, 0.14],
      [-0.14, -0.14],
      [0.14, 0],
    ];
    const ringEdge = new THREE.EdgesGeometry(ringGeo, 40);
    lensPos.forEach(([x, y]) => {
      const holder = new THREE.Group();
      holder.position.set(x, y, -plateD / 2);
      holder.rotation.x = -Math.PI / 2; // lathe axis (y) → -Z, out of the back
      inner.add(holder);
      addMesh(p, ringGeo, ringMat, holder);
      addMesh(p, barrelGeo, barrelMat, holder).position.y = 0.012;
      const glass = addMesh(p, domeGeo, glassTop, holder);
      addEdges(p, ringEdge, holder);
      p.lenses.push(glass);
    });
    // flash (frosted diffuser in a metal ring) + sensor
    const flashMat = new THREE.MeshStandardMaterial({
      color: '#f3eee4',
      emissive: '#ffe3b0',
      emissiveIntensity: 0.05,
      roughness: 0.55,
    });
    const flashRing = addMesh(p, new THREE.TorusGeometry(0.043, 0.007, 12, 48), ringMat, inner);
    flashRing.position.set(0.15, 0.205, -plateD / 2 - 0.004);
    const flash = addMesh(p, new THREE.CylinderGeometry(0.04, 0.04, 0.008, 40), flashMat, inner);
    flash.rotation.x = -Math.PI / 2;
    flash.position.set(0.15, 0.205, -plateD / 2 - 0.004);
    p.flashMat = flashMat;
    const sensor = addMesh(p, new THREE.CylinderGeometry(0.026, 0.026, 0.008, 32), darkGlass(), inner);
    sensor.rotation.x = -Math.PI / 2;
    sensor.position.set(0.15, -0.205, -plateD / 2 - 0.004);
    const mic = addMesh(p, new THREE.CylinderGeometry(0.007, 0.007, 0.004, 12), hole(), inner);
    mic.rotation.x = -Math.PI / 2;
    mic.position.set(0.2, -0.04, -plateD / 2 - 0.001);
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
  function update(state, fx, t, hover, inspect) {
    const focus = {
      processor: state.hlProcessor * (1 - inspect.k),
      camera: state.hlCamera * (1 - inspect.k),
      battery: state.hlBattery * (1 - inspect.k),
      storage: state.hlStorage * (1 - inspect.k),
    };
    if (inspect.id) focus[inspect.id] = Math.max(focus[inspect.id] || 0, inspect.k);
    let anyFocus = 0;
    for (const k in focus) anyFocus = Math.max(anyFocus, focus[k]);

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
    cam.flashMat.emissiveIntensity = 0.05 + fx.flash * 14;
    cam.flashLight.intensity = fx.flash * 6;

    parts.processor.substrate.emissiveIntensity = state.hlProcessor * (0.35 + 0.25 * Math.sin(t * 5));
    parts.battery.body.emissiveIntensity = state.battFx * 0.12;
    parts.screen.display.emissiveIntensity = parts.screen.baseEmissive * (1 - 0.6 * anyFocus);
  }

  function partWorldPosition(id, target = tmp) {
    return parts[id].group.getWorldPosition(target);
  }

  return { root, parts, meshes, update, partWorldPosition };
}
