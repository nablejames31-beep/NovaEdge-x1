// Feature effects: processor energy, battery charge, floating storage files
import * as THREE from 'three';
import { PALETTE } from './config.js';
import { fileIconTexture, glowTexture } from './textures.js';

const TAU = Math.PI * 2;
const CYAN = new THREE.Color(PALETTE.cyan);
const AMBER = new THREE.Color(PALETTE.amber);

function seeded(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Circuit traces radiating from the chip with pulses of light running along them
function circuitLines() {
  const pos = [];
  const prog = [];
  const seed = [];
  const r = seeded(7);
  for (let i = 0; i < 32; i++) {
    const side = i % 4;
    const tp = (r() - 0.5) * 0.36;
    let start;
    let dir;
    if (side === 0) [start, dir] = [[0.23, tp], [1, 0]];
    else if (side === 1) [start, dir] = [[-0.23, tp], [-1, 0]];
    else if (side === 2) [start, dir] = [[tp, 0.23], [0, 1]];
    else [start, dir] = [[tp, -0.23], [0, -1]];
    const pts = [start];
    let p = start;
    const segs = 2 + Math.floor(r() * 3);
    for (let s = 0; s < segs; s++) {
      const len = 0.1 + r() * 0.32;
      if (s % 2 === 0) p = [p[0] + dir[0] * len, p[1] + dir[1] * len];
      else {
        const sg = r() < 0.5 ? -1 : 1;
        const d = len * 0.55;
        p = [p[0] + dir[0] * d - dir[1] * d * sg, p[1] + dir[1] * d + dir[0] * d * sg];
      }
      pts.push(p);
    }
    let total = 0;
    const cum = [0];
    for (let k = 1; k < pts.length; k++) {
      total += Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]);
      cum.push(total);
    }
    const sd = r();
    for (let k = 1; k < pts.length; k++) {
      pos.push(pts[k - 1][0], pts[k - 1][1], 0.002, pts[k][0], pts[k][1], 0.002);
      prog.push(cum[k - 1] / total, cum[k] / total);
      seed.push(sd, sd);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('aProg', new THREE.Float32BufferAttribute(prog, 1));
  g.setAttribute('aSeed', new THREE.Float32BufferAttribute(seed, 1));
  const m = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uOpacity: { value: 0 }, uColor: { value: CYAN.clone() } },
    vertexShader: /* glsl */ `
      attribute float aProg; attribute float aSeed;
      varying float vProg; varying float vSeed;
      void main(){ vProg=aProg; vSeed=aSeed; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
    fragmentShader: /* glsl */ `
      uniform float uTime; uniform float uOpacity; uniform vec3 uColor;
      varying float vProg; varying float vSeed;
      void main(){
        float head = fract(uTime*0.6 + vSeed);
        float d = head - vProg;
        float pulse = smoothstep(0.25, 0.0, d) * step(0.0, d);
        float a = (0.22 + pulse*1.4) * (1.0 - vProg*0.55) * uOpacity;
        gl_FragColor = vec4(uColor*(0.7 + pulse*3.0), a);
      }`,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  return new THREE.LineSegments(g, m);
}

export function createEffects(phone) {
  const glowTex = glowTexture();

  // ── Processor ──
  const proc = phone.parts.processor.group;
  const lines = circuitLines();
  proc.add(lines);
  const core = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: glowTex,
      color: CYAN.clone().multiplyScalar(1.6),
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      opacity: 0,
    }),
  );
  core.position.z = 0.08;
  proc.add(core);
  const rings = [0, 1, 2].map(() => {
    const m = new THREE.Mesh(
      new THREE.RingGeometry(0.985, 1, 96),
      new THREE.MeshBasicMaterial({
        color: CYAN.clone().multiplyScalar(2),
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    );
    m.position.z = 0.004;
    proc.add(m);
    return m;
  });

  // ── Battery charge overlay ──
  const batt = phone.parts.battery.group;
  const battMat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uOpacity: { value: 0 },
      uFill: { value: 0 },
      uCyan: { value: CYAN.clone() },
      uAmber: { value: AMBER.clone() },
    },
    vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
    fragmentShader: /* glsl */ `
      uniform float uTime, uOpacity, uFill; uniform vec3 uCyan, uAmber; varying vec2 vUv;
      void main(){
        float inside = 1.0 - smoothstep(uFill-0.004, uFill+0.004, vUv.y);
        float edge = exp(-pow((vUv.y - uFill)*40.0, 2.0)) * step(0.002, uFill) * (1.0 - step(0.995, uFill));
        float scan = 0.5 + 0.5*sin(vUv.y*70.0 - uTime*6.0);
        float bx = min(min(vUv.x, 1.0-vUv.x), min(vUv.y, 1.0-vUv.y));
        float border = smoothstep(0.02, 0.0, bx);
        vec3 col = uCyan*(0.6+0.6*scan)*inside + uAmber*edge*2.6 + uCyan*border*1.8;
        float a = clamp(inside*(0.28+0.18*scan) + edge + border*0.9, 0.0, 1.0) * uOpacity;
        gl_FragColor = vec4(col, a);
      }`,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const battPlane = new THREE.Mesh(new THREE.PlaneGeometry(1.26, 1.73), battMat);
  battPlane.position.z = 0.0372;
  batt.add(battPlane);

  // ── Storage: floating files ──
  const stor = phone.parts.storage.group;
  const types = ['photo', 'video', 'doc', 'music', 'folder', 'app', 'photo', 'video', 'doc', 'photo', 'music', 'folder', 'photo', 'doc'];
  const files = types.map((type, i) => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: fileIconTexture(type), transparent: true, depthWrite: false, opacity: 0 }));
    s.userData = {
      a: (i / types.length) * TAU,
      r: 0.55 + (i % 3) * 0.2,
      h: ((i * 37) % 10) / 10 - 0.5,
      sp: 0.22 + (i % 4) * 0.05,
      z: 0.12 + (i % 3) * 0.14,
    };
    s.visible = false;
    stor.add(s);
    return s;
  });

  function update(state, fx, t) {
    // processor
    lines.material.uniforms.uTime.value = t;
    lines.material.uniforms.uOpacity.value = state.procFx;
    lines.visible = state.procFx > 0.002;
    core.visible = lines.visible;
    core.material.opacity = state.procFx * (0.75 + 0.25 * Math.sin(t * 5));
    core.scale.setScalar(0.85 + 0.15 * Math.sin(t * 5));
    rings.forEach((m, i) => {
      const p = (t * 0.45 + i / 3) % 1;
      m.visible = lines.visible;
      m.scale.setScalar(0.25 + p * 1.25);
      m.material.opacity = state.procFx * (1 - p) * 0.75;
    });

    // battery
    battMat.uniforms.uTime.value = t;
    battMat.uniforms.uOpacity.value = state.battFx;
    battMat.uniforms.uFill.value = fx.batteryFill;
    battPlane.visible = state.battFx > 0.002;

    // storage
    const k = 1 - Math.pow(1 - state.storFx, 3);
    for (const s of files) {
      const u = s.userData;
      s.visible = state.storFx > 0.002;
      if (!s.visible) continue;
      const ang = u.a + t * u.sp;
      const r = THREE.MathUtils.lerp(2.4, u.r, k);
      s.position.set(Math.cos(ang) * r, Math.sin(ang) * r * 0.8 + u.h * 0.25, u.z + (1 - k) * 0.8 + Math.sin(t + u.a) * 0.04);
      s.material.opacity = k;
      s.scale.setScalar(0.2 * (0.5 + 0.5 * k));
    }
  }

  return { update };
}
