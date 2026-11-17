// Renderer, lighting, reflections, background and post-processing (bloom)
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { PALETTE, SETTINGS } from './config.js';
import { glowTexture } from './textures.js';

const lerp = THREE.MathUtils.lerp;
const clamp = THREE.MathUtils.clamp;

// A tiny "photo studio" rendered into an environment map →
// gives the metal and glass realistic blue / silver reflections.
function buildEnvironment(renderer) {
  const env = new THREE.Scene();
  env.background = new THREE.Color('#020309');
  const panel = (w, h, color, intensity, pos) => {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(intensity), side: THREE.DoubleSide }),
    );
    m.position.set(...pos);
    m.lookAt(0, 0, 0);
    env.add(m);
  };
  panel(9, 3, '#ffffff', 3.4, [0, 7, 2]); // top softbox
  panel(1.2, 12, '#ffffff', 2.2, [-7, 0, 0.5]); // tall white strip → long highlights on the metal edges
  panel(1.4, 12, PALETTE.cyan, 1.3, [-7, 0, -3]); // cool rim (left/back)
  panel(1.4, 12, '#ffffff', 1.6, [7, 0, -1.5]); // neutral rim (right/back)
  panel(3, 8, '#ffffff', 0.9, [5, 1, 4]); // soft side box → gradient across the back glass
  panel(5, 1.6, PALETTE.silver, 1.0, [4.5, -4, 6]); // front fill (off-axis so screens stay crisp)
  panel(6, 1.2, '#ffffff', 1.2, [0, -6, -3]); // floor bounce
  panel(1.6, 5, PALETTE.amber, 0.45, [6, 2, 6]); // faint warm kicker
  const pmrem = new THREE.PMREMGenerator(renderer);
  const tex = pmrem.fromScene(env, 0.03).texture;
  pmrem.dispose();
  return tex;
}

function buildBackdrop() {
  const group = new THREE.Group();

  // radial gradient wall
  const wall = new THREE.Mesh(
    new THREE.PlaneGeometry(120, 70),
    new THREE.ShaderMaterial({
      uniforms: { uGlow: { value: 0 }, uNavy: { value: new THREE.Color(PALETTE.navy) }, uCyan: { value: new THREE.Color(PALETTE.cyan) } },
      vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
      fragmentShader: `
        uniform float uGlow; uniform vec3 uNavy; uniform vec3 uCyan; varying vec2 vUv;
        void main(){
          vec2 p = (vUv - 0.5) * vec2(1.7, 1.0);
          float d = length(p);
          vec3 col = mix(vec3(0.016,0.018,0.022), uNavy, smoothstep(0.0, 0.6, d));
          col += uCyan * (0.004 + 0.03*uGlow) * exp(-d*d*14.0);
          gl_FragColor = vec4(col, 1.0);
        }`,
      depthWrite: false,
    }),
  );
  wall.position.z = -30;
  wall.visible = false; // replaced by the Paper mesh-gradient backdrop (DOM layer)
  group.add(wall);

  // star / dust particles
  const N = 1400;
  const pos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    pos[i * 3] = (Math.random() - 0.5) * 70;
    pos[i * 3 + 1] = (Math.random() - 0.5) * 40;
    pos[i * 3 + 2] = -6 - Math.random() * 22;
  }
  const pg = new THREE.BufferGeometry();
  pg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const dust = new THREE.Points(
    pg,
    new THREE.PointsMaterial({
      size: 0.09,
      map: glowTexture(),
      color: new THREE.Color(PALETTE.silver),
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  group.add(dust);

  // futuristic grid floor
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(80, 80),
    new THREE.ShaderMaterial({
      uniforms: { uCyan: { value: new THREE.Color(PALETTE.cyan) }, uTime: { value: 0 } },
      vertexShader: `varying vec3 vW; void main(){ vec4 w=modelMatrix*vec4(position,1.0); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }`,
      fragmentShader: `
        uniform vec3 uCyan; uniform float uTime; varying vec3 vW;
        void main(){
          vec2 g = abs(fract(vW.xz*0.8 - 0.5) - 0.5) / fwidth(vW.xz*0.8);
          float line = 1.0 - min(min(g.x, g.y), 1.0);
          float fade = exp(-length(vW.xz)*0.09);
          float pulse = 0.5 + 0.5*sin(length(vW.xz)*1.2 - uTime*1.5);
          gl_FragColor = vec4(uCyan, line * fade * (0.022 + 0.025*pulse));
        }`,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -3.4;
  group.add(floor);

  return { group, wall, dust, floor };
}

export function createStage(canvas) {
  // alpha: the animated Paper shader backdrop shows through behind the 3D scene
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true, premultipliedAlpha: true, powerPreference: 'high-performance' });
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  scene.background = null;
  scene.environment = buildEnvironment(renderer);
  scene.environmentIntensity = 1.0;

  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 200);
  camera.position.set(0, 0.6, 10.5);

  // lights
  scene.add(new THREE.AmbientLight('#ffffff', 0.12));
  const key = new THREE.DirectionalLight('#ffffff', 1.9);
  key.position.set(4, 6, 7);
  scene.add(key);
  const rimL = new THREE.PointLight(PALETTE.cyan, 14, 0, 2);
  rimL.position.set(-4.5, 2.5, -3);
  scene.add(rimL);
  const rimR = new THREE.PointLight('#cfe6ff', 10, 0, 2);
  rimR.position.set(4.5, -1.5, -2.5);
  scene.add(rimR);
  const under = new THREE.PointLight('#5aa9ff', 10, 0, 2);
  under.position.set(0, -4, 3);
  scene.add(under);

  const backdrop = buildBackdrop();
  scene.add(backdrop.group);

  // pivot = floating / parallax wrapper around the phone
  const pivot = new THREE.Group();
  scene.add(pivot);

  // soft contact shadow under the floating phone → depth
  const shadowTex = (() => {
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const x = c.getContext('2d');
    const g = x.createRadialGradient(128, 128, 0, 128, 128, 128);
    g.addColorStop(0, 'rgba(0,0,0,0.85)');
    g.addColorStop(0.45, 'rgba(0,0,0,0.35)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g;
    x.fillRect(0, 0, 256, 256);
    return new THREE.CanvasTexture(c);
  })();
  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(3.4, 1.1),
    new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false, opacity: 0.7 }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = -2.35;
  scene.add(shadow);

  // glow + halo ring behind the phone (final scene)
  const glowTex = glowTexture();
  const glow = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: glowTex,
      color: new THREE.Color(PALETTE.cyan).multiplyScalar(0.9),
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  glow.scale.set(11, 11, 1);
  glow.position.z = -2.2;
  pivot.add(glow);
  const halo = new THREE.Mesh(
    new THREE.RingGeometry(2.45, 2.49, 160),
    new THREE.MeshBasicMaterial({
      color: new THREE.Color(PALETTE.cyan).multiplyScalar(1.3),
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  halo.position.z = -1.6;
  pivot.add(halo);
  const halo2 = new THREE.Mesh(
    new THREE.RingGeometry(2.78, 2.795, 160, 1, 0, Math.PI * 0.35),
    new THREE.MeshBasicMaterial({
      color: new THREE.Color(PALETTE.amber).multiplyScalar(1.1),
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  halo2.position.z = -1.62;
  pivot.add(halo2);

  // post-processing
  const isMobile = matchMedia('(pointer: coarse)').matches;
  const rt = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: isMobile ? 2 : 4 });
  const composer = new EffectComposer(renderer, rt);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), SETTINGS.bloomStrength, 0.55, 0.9);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  let width = 1;
  let height = 1;
  let quality = 1; // drops automatically on slower GPUs
  function setSize(w, h) {
    width = w;
    height = h;
    const pr = Math.max(0.75, Math.min(window.devicePixelRatio || 1, isMobile ? 1.5 : SETTINGS.maxPixelRatio) * quality);
    renderer.setPixelRatio(pr);
    renderer.setSize(w, h, false);
    composer.setPixelRatio(pr);
    composer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  const target = new THREE.Vector3();
  const origin = new THREE.Vector3(0, 0, 0);
  const dir = new THREE.Vector3();
  const tmpDir = new THREE.Vector3();

  // Camera rig: zooms toward a focus point, keeps the subject on the
  // right side of the screen (desktop) or in the top half (phones).
  // `inspect` (k = 0…1) flies the camera in on a tapped component.
  function updateCamera(state, focusWorld, t, inspect) {
    const aspect = width / height;
    const portrait = aspect < 0.85;
    const fit = portrait ? clamp(0.56 / aspect, 1, 1.65) : aspect < 1.3 ? 1.15 : 1;
    const baseDist = lerp(10.5, portrait ? 17.5 : 11.6, state.explode) * fit;
    const closeDist = 6.2 * fit;
    let dist = lerp(baseDist, closeDist, state.zoom);
    target.copy(origin).lerp(focusWorld, state.zoom);
    const yaw = state.camYaw;
    dir.set(Math.sin(yaw), 0.055, Math.cos(yaw)).normalize();

    const k = inspect.k;
    if (k > 0.0001) {
      // blend direction on the sphere (lerp + normalize, nudged upward so it never flips through the phone)
      tmpDir.copy(inspect.dir);
      dir.lerp(tmpDir, k);
      dir.y += Math.sin(k * Math.PI) * 0.35;
      dir.normalize();
      target.lerp(inspect.target, k);
      dist = lerp(dist, inspect.dist * (portrait ? 1.9 : 1), k);
    }
    if (!inspect.orbiting) {
      camera.position.copy(target).addScaledVector(dir, dist);
      camera.lookAt(target);
    }
    applyViewOffset(state, k, portrait);
    updateBackdrop(state, t, k);
  }

  // keep the subject beside the text (desktop) or above it (phones);
  // while inspecting, keep it beside / above the info panel instead
  function applyViewOffset(state, k, portrait) {
    const panelW = Math.min(440, width * 0.92);
    let xOff = portrait ? 0 : -state.shift * 0.2 * width;
    let yOff = portrait ? (0.16 + state.lift * 0.04) * height : state.lift * 0.135 * height;
    xOff = lerp(xOff, portrait ? 0 : panelW * 0.5, k);
    yOff = lerp(yOff, portrait ? 0.3 * height : 0, k);
    camera.setViewOffset(width, height, xOff, yOff, width, height);
  }

  function updateBackdrop(state, t, k) {
    // background life
    shadow.material.opacity = 0.7 * (1 - state.explode) * (1 - state.zoom) * (1 - k * 0.7);
    shadow.scale.setScalar(1 + Math.sin(t * 0.9) * 0.04);
    backdrop.dust.rotation.y = t * 0.004;
    backdrop.dust.position.x = -camera.position.x * 0.15;
    backdrop.floor.material.uniforms.uTime.value = t;
    backdrop.wall.material.uniforms.uGlow.value = state.glow;
    glow.material.opacity = state.glow * 0.28;
    const ringVis = state.glow * 0.9 * (1 - state.zoom) * (1 - 0.6 * state.explode) * (1 - k);
    shadow.position.z = state.posZ;
    halo.material.opacity = ringVis;
    halo2.material.opacity = ringVis;
    halo.rotation.z = t * 0.1;
    halo2.rotation.z = -t * 0.25;
    const s = 1 + Math.sin(t * 1.4) * 0.02;
    glow.scale.set(11 * s, 11 * s, 1);
  }

  // adaptive quality: if frames are slow for a while, render at a lower resolution
  let frameAvg = 16;
  let lastFrame = performance.now();
  let slowFor = 0;
  function render() {
    const now = performance.now();
    const dt = Math.min(200, now - lastFrame);
    lastFrame = now;
    frameAvg += (dt - frameAvg) * 0.05;
    if (frameAvg > 26 && quality > 0.6) {
      slowFor += dt;
      if (slowFor > 1200) {
        quality = Math.max(0.6, quality - 0.15);
        slowFor = 0;
        frameAvg = 16;
        setSize(width, height);
      }
    } else slowFor = 0;
    composer.render();
  }

  return { renderer, scene, camera, pivot, composer, setSize, updateCamera, render, isMobile };
}
