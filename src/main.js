import '@fontsource/orbitron/700.css';
import '@fontsource/orbitron/900.css';
import '@fontsource/space-grotesk/400.css';
import '@fontsource/space-grotesk/500.css';
import '@fontsource/space-grotesk/600.css';
import '@fontsource/space-grotesk/700.css';
import '@fontsource-variable/inter';
import './style.css';

import * as THREE from 'three';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import Lenis from 'lenis';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import {
  ShaderMount,
  meshGradientFragmentShader,
  godRaysFragmentShader,
  getShaderColorFromString,
  getShaderNoiseTexture,
  ShaderFitOptions,
} from '@paper-design/shaders';

import { createStage } from './scene.js';
import { buildPhone, smoothstep } from './phone.js';
import { createEffects } from './effects.js';
import { PARTS, SLIDES, SETTINGS, EXPLODED_POSE, FINISHES, TECH_SPECS, PRICE } from './config.js';

// Real sample photos (Unsplash license, via picsum.photos)
import photoLandscape from './assets/photos/p1015.jpg';
import photoPortrait from './assets/photos/p1027.jpg';
import photoNight from './assets/photos/p1022.jpg';
import photoLandscapeFull from './assets/photos/p1015-full.jpg';
import photoPortraitFull from './assets/photos/p1027-full.jpg';
import photoNightFull from './assets/photos/p1022-full.jpg';

gsap.registerPlugin(ScrollTrigger, SplitText);
ScrollTrigger.config({ ignoreMobileResize: true });

const TAU = Math.PI * 2;
const N = SLIDES.length;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = matchMedia('(pointer: fine)').matches;

// Depth layer: slow Paper mesh-gradient behind the 3D scene
function mountBackdrop() {
  const el = document.getElementById('backdrop');
  try {
    return new ShaderMount(
      el,
      meshGradientFragmentShader,
      {
        u_colors: ['#05060a', '#0a1634', '#0c2c63', '#120c33', '#06080e'].map(getShaderColorFromString),
        u_colorsCount: 5,
        u_distortion: 0.9,
        u_swirl: 0.35,
        u_grainMixer: 0,
        u_grainOverlay: 0.06,
        u_fit: ShaderFitOptions.cover,
        u_scale: 1,
        u_rotation: 0,
        u_originX: 0.5,
        u_originY: 0.5,
        u_offsetX: 0,
        u_offsetY: 0,
        u_worldWidth: 0,
        u_worldHeight: 0,
      },
      { alpha: false, premultipliedAlpha: false },
      reduceMotion ? 0 : 0.25,
      0,
      1,
      1280 * 720, // soft gradient: render small and let the browser upscale
    );
  } catch (e) {
    console.warn('Backdrop shader unavailable', e);
    return null;
  }
}

function hasWebGL() {
  try {
    return !!document.createElement('canvas').getContext('webgl2');
  } catch {
    return false;
  }
}

async function init() {
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  window.scrollTo(0, 0);

  if (!hasWebGL()) {
    $('#nowebgl').hidden = false;
    $('#loader').remove();
    return;
  }

  // fonts must be ready before we draw them onto canvas textures
  await Promise.race([
    Promise.all([
      document.fonts.load('700 40px Orbitron'),
      document.fonts.load('900 40px Orbitron'),
      document.fonts.load('500 20px "Space Grotesk"'),
      document.fonts.load('600 20px "Space Grotesk"'),
    ]),
    new Promise((r) => setTimeout(r, 3000)),
  ]).catch(() => {});

  // ── 3D ──
  const backdropMount = mountBackdrop();
  const canvas = $('#webgl');
  const stage = createStage(canvas);
  const phone = buildPhone();
  stage.pivot.add(phone.root);
  const effects = createEffects(phone);
  // compile every shader up front so the first tap / scroll never stutters
  stage.renderer.compile(stage.scene, stage.camera);

  // ── scroll-driven state (animated by the master timeline) ──
  const state = {
    rotX: 0.1,
    rotY: -0.42,
    rotZ: 0.03,
    posY: 0,
    posZ: 0,
    explode: 0,
    camFlip: 0,
    zoom: 0,
    fx: 0,
    fy: 0,
    fz: 0,
    camYaw: 0,
    shift: 0.9,
    lift: 0,
    labels: 0,
    outlines: 0,
    hlProcessor: 0,
    hlCamera: 0,
    hlBattery: 0,
    hlStorage: 0,
    procFx: 0,
    battFx: 0,
    storFx: 0,
    glow: 0.3,
  };
  // time-based effects (triggered when a section is reached)
  const fx = { flash: 0, batteryFill: 0, lensSpin: 0 };
  const intro = { s: 0.55, y: -1.2, spin: -1.6 };
  // tap-to-inspect camera fly-in
  const inspect = {
    k: 0,
    id: null,
    fresh: true,
    want: { target: new THREE.Vector3(), dir: new THREE.Vector3(0, 0, 1), dist: 4 },
    target: new THREE.Vector3(),
    dir: new THREE.Vector3(0, 0, 1),
    dist: 4,
    orbiting: false,
    frozen: false,
  };
  // free drag-to-spin on the main phone (desktop)
  const spin = { angle: 0, vel: 0, dragging: false, lastX: 0 };

  // ── DOM ──
  const track = $('#track');
  const sections = $$('.section');
  const panels = sections.map((s) => $('.panel', s));

  const photosEl = $('#photos');
  const lightbox = $('#lightbox');
  const lightboxImg = $('img', lightbox);
  const lightboxCap = $('figcaption', lightbox);
  function openPhoto(p) {
    lightboxImg.src = p.src; // show the sharp card image instantly…
    lightboxCap.textContent = `${p.caption} · shot on NovaEdge X1 (sample)`;
    const full = new Image();
    full.src = p.full; // …then swap in the 2160 × 2700 original when it has loaded
    full.decode().then(() => lightbox.classList.contains('open') && (lightboxImg.src = p.full)).catch(() => {});
    lightbox.classList.add('open');
    lightbox.setAttribute('aria-hidden', 'false');
    lenis.stop();
  }
  function closePhoto() {
    if (!lightbox.classList.contains('open')) return;
    lightbox.classList.remove('open');
    lightbox.setAttribute('aria-hidden', 'true');
    lenis.start();
  }
  lightbox.addEventListener('click', closePhoto);
  window.addEventListener('keydown', (e) => e.key === 'Escape' && closePhoto());
  [
    { src: photoLandscape, full: photoLandscapeFull, caption: 'Landscape' },
    { src: photoPortrait, full: photoPortraitFull, caption: 'Portrait' },
    { src: photoNight, full: photoNightFull, caption: 'Night' },
  ].forEach((p) => {
    const d = document.createElement('button');
    d.className = 'photo';
    d.setAttribute('aria-label', `View ${p.caption} sample photo full screen`);
    d.innerHTML = `<img src="${p.src}" alt="${p.caption} sample photo" decoding="async" /><span>${p.caption}</span>`;
    d.addEventListener('click', () => openPhoto(p));
    photosEl.appendChild(d);
  });

  const legendEl = $('#legend');
  const labelParts = Object.keys(PARTS).filter((id) => PARTS[id].label);
  let legendHover = null;
  labelParts.forEach((id) => {
    const b = document.createElement('button');
    b.innerHTML = `<i></i>${PARTS[id].name}`;
    b.addEventListener('click', () => openInfo(id));
    b.addEventListener('mouseenter', () => (legendHover = id));
    b.addEventListener('mouseleave', () => (legendHover = null));
    legendEl.appendChild(b);
  });

  const labelsEl = $('#labels');
  const DIRS = {
    up: { v: [0, -1], tr: 'translate(-50%, -100%)' },
    down: { v: [0, 1], tr: 'translate(-50%, 0)' },
    left: { v: [-1, 0], tr: 'translate(-100%, -50%)' },
    right: { v: [1, 0], tr: 'translate(0, -50%)' },
  };
  const labels = labelParts.map((id) => {
    const cfg = PARTS[id];
    const dir = DIRS[cfg.labelDir] || DIRS.up;
    const L = 58;
    const el = document.createElement('div');
    el.className = 'part-label hidden';
    el.innerHTML = `<div class="line"></div><div class="dot"></div><button class="tag"><small>${cfg.kicker}</small>${cfg.name}</button>`;
    const line = $('.line', el);
    line.style.width = `${L}px`;
    line.style.transform = `rotate(${Math.atan2(dir.v[1], dir.v[0])}rad)`;
    const tag = $('.tag', el);
    tag.style.left = `${dir.v[0] * (L + 4)}px`;
    tag.style.top = `${dir.v[1] * (L + 4)}px`;
    tag.style.transform = dir.tr;
    tag.addEventListener('click', () => openInfo(id));
    tag.addEventListener('mouseenter', () => (legendHover = id));
    tag.addEventListener('mouseleave', () => (legendHover = null));
    labelsEl.appendChild(el);
    return { id, el, visible: false, anchor: new THREE.Vector3(...(cfg.labelAnchor || [0, 0, 0])) };
  });

  // split titles into characters for the reveal animation
  const splits = new Map();
  $$('.split').forEach((el) => {
    const idx = +el.closest('.section').dataset.slide;
    const s = SplitText.create(el, { type: 'words,chars', wordsClass: 'word', charsClass: 'char' });
    splits.set(idx, s.chars);
  });
  gsap.set('.photo, .mt-app, #files li', { opacity: 0 });

  // ── master timeline: time 0 … N-1, one unit per section ──
  const focusOf = (id) => phone.parts[id].base.clone().add(phone.parts[id].offset);
  const P = focusOf('processor');
  const C = focusOf('camera');
  const B = focusOf('battery');
  const S = focusOf('storage');
  const E = EXPLODED_POSE;
  const ROT1 = TAU + 2.55; // after the first 360° — back three-quarter view
  const ROT2 = 2 * TAU + E.rotY; // exploded pose
  const ROT3 = 3 * TAU + E.rotY; // reassembled — exactly one more full 360°
  const ROT4 = 3 * TAU; // facing the audience

  const tl = gsap.timeline({ paused: true, defaults: { ease: 'sine.inOut' } });
  // 0 → 1 · 360° rotation
  tl.to(state, { rotY: ROT1, rotX: 0.06, rotZ: 0, shift: 1, glow: 0.12, duration: 0.9 }, 0.05);
  // 1 → 2 · exploded view
  tl.to(state, { rotY: ROT2, rotX: E.rotX, rotZ: E.rotZ, duration: 0.85 }, 1.05);
  tl.to(state, { explode: 1, camFlip: 1, duration: 0.8 }, 1.12);
  tl.to(state, { outlines: 1, duration: 0.4 }, 1.4);
  tl.to(state, { labels: 1, duration: 0.25 }, 1.65);
  // 2 → 3 · processor
  tl.to(state, { labels: 0, duration: 0.2 }, 2.1);
  tl.to(state, { zoom: 1, fx: P.x, fy: P.y, fz: P.z, camYaw: 0.12, duration: 0.85 }, 2.08);
  tl.to(state, { hlProcessor: 1, procFx: 1, duration: 0.45 }, 2.4);
  // 3 → 4 · camera
  tl.to(state, { hlProcessor: 0, procFx: 0, duration: 0.35 }, 3.08);
  tl.to(state, { fx: C.x, fy: C.y, fz: C.z, camYaw: -0.12, duration: 0.85 }, 3.08);
  tl.to(state, { hlCamera: 1, duration: 0.45 }, 3.4);
  // 4 → 5 · battery
  tl.to(state, { hlCamera: 0, duration: 0.35 }, 4.08);
  tl.to(state, { fx: B.x, fy: B.y, fz: B.z, camYaw: 0.04, duration: 0.85 }, 4.08);
  tl.to(state, { hlBattery: 1, battFx: 1, duration: 0.45 }, 4.4);
  // 5 → 6 · storage
  tl.to(state, { hlBattery: 0, battFx: 0, duration: 0.35 }, 5.08);
  tl.to(state, { fx: S.x, fy: S.y, fz: S.z, camYaw: 0.16, duration: 0.85 }, 5.08);
  tl.to(state, { hlStorage: 1, storFx: 1, duration: 0.45 }, 5.4);
  // 6 → 7 · reassemble + another 360°
  tl.to(state, { hlStorage: 0, storFx: 0, duration: 0.3 }, 6.05);
  tl.to(state, { zoom: 0, camYaw: 0, duration: 0.55 }, 6.08);
  tl.to(state, { explode: 0, camFlip: 0, duration: 0.6 }, 6.15);
  tl.to(state, { outlines: 0, duration: 0.35 }, 6.45);
  tl.to(state, { rotY: ROT3, rotX: 0.08, rotZ: 0, posZ: -0.6, duration: 0.8 }, 6.15);
  // 7 → 8 · colors: turn to show the back finish
  tl.to(state, { rotY: 3 * TAU + Math.PI - 0.5, rotX: 0.1, posZ: 0, duration: 0.85 }, 7.08);
  // 8 → 9 · specs: phone steps back to make room for the spec grid
  tl.to(state, { rotY: 4 * TAU - 0.35, posZ: -2.6, shift: 1.45, duration: 0.85 }, 8.08);
  // 9 → 10 · final hero shot
  tl.to(state, { rotY: 4 * TAU, rotX: 0.02, shift: 0, lift: 1, posZ: -0.35, glow: 1, duration: 0.85 }, 9.08);
  tl.set({}, {}, N - 1);

  // ── smooth, free scrolling (no snapping) ──
  const lenis = new Lenis({ lerp: reduceMotion ? 1 : SETTINGS.smoothness, wheelMultiplier: 0.85, touchMultiplier: 1.2, smoothWheel: true });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  // if a frame ever hitches, continue the animation instead of jumping to its end
  gsap.ticker.lagSmoothing(250, 33);
  lenis.stop();

  let lastW = 0;
  let lastH = 0;
  let unit = 1; // scroll distance between two sections, in px
  function layout(force) {
    const w = window.innerWidth;
    const h = window.innerHeight;
    stage.setSize(w, h);
    // on phones the address bar changes the height while scrolling; ignore small changes
    if (!force && w === lastW && Math.abs(h - lastH) < 140) return false;
    lastW = w;
    lastH = h;
    const gap = Math.round(h * SETTINGS.sectionGap);
    unit = h + gap;
    track.style.setProperty('--gap', `${gap}px`);
    sections.forEach((s) => (s.style.height = `${h}px`));
    return true;
  }
  layout(true);

  ScrollTrigger.create({ trigger: track, start: 'top top', end: 'bottom bottom', animation: tl, scrub: true });

  // keyboard / buttons glide smoothly to a section (handy when presenting)
  let navigating = false;
  let navTarget = 0;
  const scrollPos = () => lenis.scroll / unit;
  function goTo(i) {
    i = clamp(i, 0, N - 1);
    const now = scrollPos();
    const dist = Math.abs(i - now);
    if (dist < 0.002) return;
    const idx = i > now ? i : Math.min(N - 1, i + 1);
    const duration = dist <= 1.001 ? SLIDES[idx].duration * clamp(dist, 0.4, 1) : Math.min(5, 1.6 + dist * 0.5);
    navigating = true;
    navTarget = i;
    lenis.scrollTo(i * unit, {
      duration,
      easing: easeInOutCubic,
      force: true,
      onComplete: () => (navigating = false),
    });
  }

  window.addEventListener('keydown', (e) => {
    if (e.target.closest && e.target.closest('input, textarea')) return;
    const base = navigating ? navTarget : Math.round(scrollPos());
    const k = e.key;
    if (['ArrowRight', 'ArrowDown', 'PageDown', ' '].includes(k)) {
      e.preventDefault();
      closeInfo();
      goTo(base + 1);
    } else if (['ArrowLeft', 'ArrowUp', 'PageUp'].includes(k)) {
      e.preventDefault();
      closeInfo();
      goTo(base - 1);
    } else if (k === 'Home') {
      e.preventDefault();
      goTo(0);
    } else if (k === 'End') {
      e.preventDefault();
      goTo(N - 1);
    } else if (k === 'f' || k === 'F') {
      toggleFullscreen();
    } else if (k === 'Escape') {
      closeInfo();
    }
  });

  $$('[data-goto]').forEach((b) => b.addEventListener('click', () => goTo(+b.dataset.goto)));

  function toggleFullscreen() {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen?.().catch(() => {});
    else document.exitFullscreen?.();
  }
  $('#btn-fullscreen').addEventListener('click', toggleFullscreen);

  // ── tap a part → camera flies in, then you can orbit & zoom around it ──
  const infoEl = $('#info');
  const partOrder = Object.keys(PARTS);
  let selected = null;
  const controls = new OrbitControls(stage.camera, canvas);
  controls.enabled = false;
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.enablePan = false;
  controls.rotateSpeed = 0.7;
  controls.zoomSpeed = 0.8;
  // OrbitControls disables touch scrolling on the canvas when created — give it back:
  // touch only belongs to the orbit while a part is being inspected
  canvas.style.touchAction = '';
  let orbitTimer = null;

  function captureCamera() {
    // hand the current camera pose back to the rig so the next move starts exactly here
    inspect.target.copy(controls.target);
    inspect.dir.copy(stage.camera.position).sub(controls.target);
    inspect.dist = inspect.dir.length();
    inspect.dir.normalize();
  }
  function startOrbit() {
    if (!selected) return;
    inspect.orbiting = true;
    controls.target.copy(inspect.target);
    const d = PARTS[selected].inspect.dist;
    controls.minDistance = d * 0.45;
    controls.maxDistance = d * 3;
    controls.enabled = true;
    canvas.style.touchAction = 'none';
    controls.update();
    document.body.classList.add('orbiting');
  }
  function stopOrbit() {
    clearTimeout(orbitTimer);
    if (inspect.orbiting) captureCamera();
    inspect.orbiting = false;
    controls.enabled = false;
    canvas.style.touchAction = '';
    document.body.classList.remove('orbiting');
  }
  controls.addEventListener('start', () => document.body.classList.add('dragging'));
  controls.addEventListener('end', () => document.body.classList.remove('dragging'));

  function openInfo(id) {
    const c = PARTS[id];
    const switching = !!selected && inspect.k > 0.5;
    stopOrbit();
    inspect.frozen = false;
    if (!inspect.id || inspect.k < 0.02) inspect.fresh = true;
    selected = id;
    inspect.id = id;
    $('.info-kicker', infoEl).textContent = c.kicker;
    $('.info-title', infoEl).textContent = c.name;
    $('.info-def p', infoEl).textContent = c.definition;
    $('.info-desc', infoEl).textContent = c.description;
    $('.info-specs', infoEl).innerHTML = (c.specs || []).map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('');
    $('.info-list', infoEl).innerHTML = c.highlights.map((h) => `<li>${h}</li>`).join('');
    $('.info-scroll', infoEl).scrollTop = 0;
    infoEl.classList.add('open');
    infoEl.setAttribute('aria-hidden', 'false');
    document.body.classList.add('inspecting');
    lenis.stop();
    gsap.fromTo(
      $$('.info-title, .info-def, .info-desc, .info-specs div, .info-list li', infoEl),
      { opacity: 0, y: 14 },
      { opacity: 1, y: 0, stagger: 0.04, duration: 0.5, ease: 'power2.out', delay: 0.15, overwrite: true },
    );
    $$('button', legendEl).forEach((b, i) => b.classList.toggle('active', labelParts[i] === id));
    if (switching) {
      // glide from the current orbit pose to the next part, then hand control back
      orbitTimer = setTimeout(startOrbit, reduceMotion ? 50 : 1500);
    } else {
      gsap.to(inspect, { k: 1, duration: reduceMotion ? 0.01 : 1.6, ease: 'power3.inOut', overwrite: true, onComplete: startOrbit });
    }
  }
  function closeInfo() {
    if (!selected) return;
    stopOrbit();
    inspect.frozen = true; // ease out from wherever the user left the camera
    selected = null;
    infoEl.classList.remove('open');
    infoEl.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('inspecting');
    $$('button', legendEl).forEach((b) => b.classList.remove('active'));
    lenis.start();
    gsap.to(inspect, {
      k: 0,
      duration: reduceMotion ? 0.01 : 1.3,
      ease: 'power3.inOut',
      overwrite: true,
      onComplete: () => {
        if (!selected) {
          inspect.id = null;
          inspect.frozen = false;
        }
      },
    });
  }
  $('.info-close', infoEl).addEventListener('click', closeInfo);
  $('#info-next').addEventListener('click', () => openInfo(partOrder[(partOrder.indexOf(selected) + 1) % partOrder.length]));
  $('#info-prev').addEventListener('click', () => openInfo(partOrder[(partOrder.indexOf(selected) - 1 + partOrder.length) % partOrder.length]));

  // ── pointer: parallax, hover, click, drag-to-spin ──
  const pointer = { x: 0, y: 0, nx: 0, ny: 0, onCanvas: false, mouse: false };
  const par = { x: 0, y: 0 };
  window.addEventListener('pointermove', (e) => {
    pointer.x = e.clientX;
    pointer.y = e.clientY;
    pointer.nx = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.ny = -(e.clientY / window.innerHeight) * 2 + 1;
    pointer.onCanvas = e.target === canvas;
    pointer.mouse = e.pointerType === 'mouse';
    if (spin.dragging) {
      const dx = e.clientX - spin.lastX;
      spin.lastX = e.clientX;
      spin.angle += dx * 0.008;
      spin.vel = dx * 0.008;
    }
  });
  document.addEventListener('pointerleave', () => (pointer.onCanvas = false));

  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  function pick(clientX, clientY) {
    ndc.set((clientX / window.innerWidth) * 2 - 1, -(clientY / window.innerHeight) * 2 + 1);
    raycaster.setFromCamera(ndc, stage.camera);
    const hits = raycaster.intersectObjects(phone.meshes, false);
    for (const h of hits) {
      const id = h.object.userData.part;
      if (phone.parts[id].opacity > 0.4) return id;
    }
    return null;
  }

  let downAt = null;
  canvas.addEventListener('pointerdown', (e) => {
    downAt = { x: e.clientX, y: e.clientY };
    // outside of inspect mode, a mouse drag spins the phone (it eases back afterwards)
    if (!selected && e.pointerType === 'mouse') {
      spin.dragging = true;
      spin.lastX = e.clientX;
      document.body.classList.add('dragging');
    }
  });
  window.addEventListener('pointerup', () => {
    spin.dragging = false;
    document.body.classList.remove('dragging');
  });
  canvas.addEventListener('click', (e) => {
    if (downAt && Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y) > 8) return;
    const id = pick(e.clientX, e.clientY);
    if (id && id !== selected) openInfo(id);
    else if (!id) closeInfo();
  });

  // ── finishes ──
  const swatchesEl = $('#swatches');
  const swatchName = $('#swatch-name');
  let finish = FINISHES[0];
  function setFinish(f, animate = true) {
    finish = f;
    phone.setFinish(f, animate ? gsap : null);
    swatchName.textContent = f.name;
    $$('.swatch', swatchesEl).forEach((b) => b.setAttribute('aria-checked', String(b.dataset.id === f.id)));
  }
  FINISHES.forEach((f) => {
    const b = document.createElement('button');
    b.className = 'swatch';
    b.dataset.id = f.id;
    b.setAttribute('role', 'radio');
    b.setAttribute('aria-label', f.name);
    b.title = f.name;
    b.style.setProperty('--sw', f.swatch);
    b.addEventListener('click', () => setFinish(f));
    swatchesEl.appendChild(b);
  });
  setFinish(FINISHES[0], false);

  // ── tech specs grid + price ──
  $('#spec-grid').innerHTML = TECH_SPECS.map(
    (g) => `<article class="spec-card tilt"><h4>${g.group}</h4><ul>${g.items.map((i) => `<li>${i}</li>`).join('')}</ul></article>`,
  ).join('');
  $$('[data-price]').forEach((el) => (el.textContent = PRICE));
  const toastEl = $('#toast');
  let toastTimer;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), 3200);
  }
  $('#btn-preorder').addEventListener('click', () => toast(`NovaEdge X1 in ${finish.name} — pre-orders open soon. (Concept product)`));

  // ── count-up numbers ──
  function countUp(root) {
    $$('.num[data-count]', root).forEach((el) => {
      const end = parseFloat(el.dataset.count);
      const dec = +(el.dataset.decimals || 0);
      const fmt = (v) => (el.dataset.format ? Math.round(v).toLocaleString('en-US') : v.toFixed(dec));
      if (reduceMotion) {
        el.textContent = fmt(end);
        return;
      }
      const o = { v: 0 };
      gsap.to(o, { v: end, duration: 1.4, ease: 'power2.out', overwrite: true, onUpdate: () => (el.textContent = fmt(o.v)) });
    });
  }

  // ── depth: 3D tilt on cards & photos, magnetic buttons, custom cursor ──
  function bindTilt(el) {
    el.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse') return;
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      gsap.to(el, { rotateY: x * 10, rotateX: -y * 10, transformPerspective: 700, duration: 0.4, ease: 'power2.out' });
    });
    el.addEventListener('pointerleave', () => gsap.to(el, { rotateY: 0, rotateX: 0, duration: 0.6, ease: 'power3.out' }));
  }
  if (!reduceMotion && finePointer) {
    $$('.tilt').forEach(bindTilt);
    $$('.magnetic').forEach((el) => {
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        gsap.to(el, { x: (e.clientX - r.left - r.width / 2) * 0.18, y: (e.clientY - r.top - r.height / 2) * 0.25, duration: 0.3, ease: 'power2.out' });
      });
      el.addEventListener('pointerleave', () => gsap.to(el, { x: 0, y: 0, duration: 0.5, ease: 'elastic.out(1, 0.5)' }));
    });
  }
  const cursorEl = $('#cursor');
  const cursorPos = { x: -100, y: -100 };
  if (finePointer && !reduceMotion) cursorEl.classList.add('on');
  document.addEventListener('pointerover', (e) => {
    cursorEl.classList.toggle('hot', !!(e.target.closest && e.target.closest('button, a, .tag, .swatch')));
  });

  // ═══ wow layer ═══
  // god rays behind the phone (Paper Shaders)
  let raysMount = null;
  const raysEl = $('#rays');
  (async () => {
    try {
      const noise = getShaderNoiseTexture();
      if (noise && !noise.complete) await noise.decode().catch(() => {});
      raysMount = new ShaderMount(
        raysEl,
        godRaysFragmentShader,
        {
          u_colorBack: [0, 0, 0, 0],
          u_colorBloom: getShaderColorFromString('#2ea8ff'),
          u_colors: ['#2ea8ff', '#cfe8ff', '#4a55ff', '#ffffff'].map(getShaderColorFromString),
          u_colorsCount: 4,
          u_bloom: 0.3,
          u_intensity: 0.42,
          u_density: 0.32,
          u_spotty: 0.28,
          u_midSize: 0.22,
          u_midIntensity: 0.3,
          u_noiseTexture: noise,
          u_fit: ShaderFitOptions.cover,
          u_scale: 1,
          u_rotation: 0,
          u_originX: 0.5,
          u_originY: 0.5,
          u_offsetX: 0,
          u_offsetY: 0,
          u_worldWidth: 0,
          u_worldHeight: 0,
        },
        { alpha: true, premultipliedAlpha: true },
        reduceMotion ? 0 : 0.35,
        0,
        1,
        900 * 900,
      );
    } catch (e) {
      console.warn('God rays unavailable', e);
    }
  })();
  // how strong the rays are per section (hero, colors and the finale shine the most)
  const RAYS = [0.7, 0.35, 0.1, 0.06, 0.06, 0.06, 0.06, 0.35, 0.5, 0.15, 0.75];
  const raysAt = (tt) => {
    const i = Math.floor(tt);
    const f = tt - i;
    const a = RAYS[clamp(i, 0, RAYS.length - 1)];
    const b = RAYS[clamp(i + 1, 0, RAYS.length - 1)];
    return a + (b - a) * f;
  };

  // drifting color aura
  const auraBlobs = $$('#aura i');

  // text scramble on kickers (motion-primitives style)
  const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&*+';
  function scramble(el) {
    if (reduceMotion) return;
    const final = el.dataset.text || (el.dataset.text = el.textContent);
    const o = { p: 0 };
    gsap.to(o, {
      p: 1,
      duration: 0.9,
      ease: 'none',
      overwrite: true,
      onUpdate: () => {
        const n = Math.floor(o.p * final.length);
        let out = final.slice(0, n);
        for (let k = n; k < final.length; k++) out += final[k] === ' ' ? ' ' : GLYPHS[(Math.random() * GLYPHS.length) | 0];
        el.textContent = out;
      },
      onComplete: () => (el.textContent = final),
    });
  }

  // spotlight: cards light up where the cursor is
  if (finePointer) {
    document.addEventListener('pointermove', (e) => {
      const card = e.target.closest && e.target.closest('.spot, .spec-card');
      if (!card) return;
      const r = card.getBoundingClientRect();
      card.style.setProperty('--mx', `${e.clientX - r.left}px`);
      card.style.setProperty('--my', `${e.clientY - r.top}px`);
    });
  }

  // cursor light trail (cursify / canvas-ui style)
  const trail = $('#trail');
  const tctx = trail.getContext('2d');
  const trailPts = [];
  let trailOn = finePointer && !reduceMotion;
  if (trailOn) trail.classList.add('on');
  function sizeTrail() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    trail.width = innerWidth * dpr;
    trail.height = innerHeight * dpr;
    tctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  sizeTrail();
  window.addEventListener('resize', sizeTrail);
  window.addEventListener('pointermove', (e) => {
    if (!trailOn || e.pointerType !== 'mouse') return;
    trailPts.push({ x: e.clientX, y: e.clientY, life: 1 });
    if (trailPts.length > 40) trailPts.shift();
  });
  function drawTrail() {
    if (!trailOn) return;
    tctx.clearRect(0, 0, innerWidth, innerHeight);
    tctx.globalCompositeOperation = 'lighter';
    for (let k = trailPts.length - 1; k >= 0; k--) {
      const p = trailPts[k];
      p.life -= 0.035;
      if (p.life <= 0) {
        trailPts.splice(k, 1);
        continue;
      }
      const r = 18 * p.life;
      const g = tctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
      g.addColorStop(0, `rgba(120, 200, 255, ${0.35 * p.life})`);
      g.addColorStop(1, 'rgba(46, 168, 255, 0)');
      tctx.fillStyle = g;
      tctx.beginPath();
      tctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      tctx.fill();
    }
  }

  // marquee reacts to scroll speed (skews + speeds up)
  const marqueeTrack = $('.marquee-track');
  let marqueeSkew = 0;
  const phoneScreen = new THREE.Vector3();
  let shadersRunning = true;

  const tooltip = $('#tooltip');
  const tooltipName = $('strong', tooltip);
  const hoverW = Object.fromEntries(Object.keys(PARTS).map((k) => [k, 0]));
  let hovered = null;

  // ── section moments (play when a section reaches the middle of the screen) ──
  function onEnter(i) {
    countUp(sections[i]);
    $$('[data-scramble]', sections[i]).forEach(scramble);
    const chars = splits.get(i);
    if (chars) {
      gsap.fromTo(chars, { yPercent: 70, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.8, stagger: 0.014, ease: 'power3.out', overwrite: true });
    }
    const id = SLIDES[i].id;
    if (id === 'processor') {
      gsap.fromTo('.mt-app', { opacity: 0, scale: 0.85, y: 10 }, { opacity: 1, scale: 1, y: 0, stagger: 0.07, duration: 0.5, ease: 'back.out(1.7)', overwrite: true });
      gsap.fromTo('.mt-bar b', { scaleX: 0 }, { scaleX: 1, duration: 1.6, ease: 'power2.out', delay: 0.3, overwrite: true });
    } else if (id === 'camera') {
      gsap
        .timeline()
        .to(fx, { lensSpin: 1, duration: 0.9, ease: 'power2.inOut' })
        .to(fx, { flash: 1, duration: 0.06, ease: 'power1.in' }, '+=0.05')
        .to('#flash', { opacity: 0.9, duration: 0.06 }, '<')
        .to(fx, { flash: 0, duration: 0.7, ease: 'power2.out' })
        .to('#flash', { opacity: 0, duration: 0.8, ease: 'power2.out' }, '<')
        .fromTo('.photo', { opacity: 0, x: 60, rotate: 6, scale: 0.9 }, { opacity: 1, x: 0, rotate: 0, scale: 1, stagger: 0.12, duration: 0.7, ease: 'power3.out', clearProps: 'transform' }, '<0.05')
        .to(fx, { lensSpin: 0.3, duration: 1.2, ease: 'power2.inOut' }, '<');
    } else if (id === 'battery') {
      gsap.fromTo(fx, { batteryFill: 0 }, { batteryFill: 1, duration: 2.8, ease: 'power1.inOut', overwrite: true });
      gsap.fromTo('#battery-fill', { scaleX: 0 }, { scaleX: 1, duration: 2.8, ease: 'power1.inOut', overwrite: true });
    } else if (id === 'storage') {
      gsap.fromTo('#files li', { opacity: 0 }, { opacity: 1, stagger: 0.1, duration: 0.6, ease: 'power2.out', overwrite: true });
    }
  }
  function onLeave(i) {
    const id = SLIDES[i].id;
    if (id === 'processor') gsap.to('.mt-app', { opacity: 0, duration: 0.4, overwrite: true });
    if (id === 'camera') {
      gsap.to(fx, { lensSpin: 0, duration: 0.6 });
      gsap.to('.photo', { opacity: 0, duration: 0.4, overwrite: true });
    }
    if (id === 'battery') {
      gsap.to(fx, { batteryFill: 0, duration: 0.6, overwrite: true });
      gsap.to('#battery-fill', { scaleX: 0, duration: 0.6, overwrite: true });
    }
    if (id === 'storage') gsap.to('#files li', { opacity: 0, duration: 0.4, overwrite: true });
  }

  // ── render loop ──
  const DEPTH = [-70, -38, -12, 22]; // px per section of scroll for .depth-1 … .depth-4
  const depthLayers = panels.map((p) => [1, 2, 3, 4].map((n) => $$(`.depth-${n}`, p)));
  const navProgress = $('.nav-progress span');
  const navButtons = $$('.nav-links button');
  let navActive = -1;
  const t0 = performance.now();
  const focusWorld = new THREE.Vector3();
  const v = new THREE.Vector3();
  const q = new THREE.Quaternion();
  let activeSlide = -1;
  let ready = false;

  function updateInspect() {
    if (!inspect.id || inspect.frozen || inspect.orbiting) return;
    const p = phone.parts[inspect.id];
    const cfg = PARTS[inspect.id].inspect;
    const host = p.inner || p.group;
    inspect.want.target.set(...cfg.offset);
    host.localToWorld(inspect.want.target);
    host.getWorldQuaternion(q);
    inspect.want.dir.set(...cfg.face).normalize().applyQuaternion(q);
    inspect.want.dist = cfg.dist;
    if (inspect.fresh) {
      inspect.target.copy(inspect.want.target);
      inspect.dir.copy(inspect.want.dir);
      inspect.dist = inspect.want.dist;
      inspect.fresh = false;
    } else {
      // glide smoothly between parts when using Previous / Next
      inspect.target.lerp(inspect.want.target, 0.06);
      inspect.dir.lerp(inspect.want.dir, 0.06).normalize();
      inspect.dist += (inspect.want.dist - inspect.dist) * 0.06;
    }
  }

  function tick() {
    const t = (performance.now() - t0) / 1000;
    const W = window.innerWidth;
    const H = window.innerHeight;
    const calm = 1 - inspect.k;

    phone.root.rotation.set(state.rotX, state.rotY, state.rotZ);
    phone.root.position.set(0, state.posY, state.posZ);
    par.x += (pointer.nx * calm - par.x) * 0.04;
    par.y += (pointer.ny * calm - par.y) * 0.04;
    stage.pivot.position.y = Math.sin(t * 0.9) * 0.06 * calm + intro.y;
    // drag-to-spin with inertia, easing back to the scroll choreography
    if (!spin.dragging) {
      spin.angle += spin.vel;
      spin.vel *= 0.9;
      spin.angle *= 0.965;
    }
    stage.pivot.rotation.set(
      -par.y * 0.05 + Math.sin(t * 0.6) * 0.015 * calm,
      par.x * 0.09 + intro.spin + spin.angle * calm,
      Math.sin(t * 0.5) * 0.01 * calm,
    );
    stage.pivot.scale.setScalar(intro.s);

    for (const id in hoverW) {
      const target = id === hovered || id === selected || id === legendHover ? 1 : 0;
      hoverW[id] += (target - hoverW[id]) * 0.16;
    }

    phone.update(state, fx, t, hoverW, inspect);
    effects.update(state, fx, t);
    stage.scene.updateMatrixWorld();
    focusWorld.set(state.fx, state.fy, state.fz);
    phone.root.localToWorld(focusWorld);
    updateInspect();
    stage.updateCamera(state, focusWorld, t, inspect);
    if (inspect.orbiting) controls.update();
    stage.camera.updateMatrixWorld();

    // custom cursor (lerped)
    cursorPos.x += (pointer.x - cursorPos.x) * 0.25;
    cursorPos.y += (pointer.y - cursorPos.y) * 0.25;
    cursorEl.style.transform = `translate(${cursorPos.x.toFixed(1)}px, ${cursorPos.y.toFixed(1)}px)`;
    cursorEl.classList.toggle('hot-3d', !!hovered);

    // hover (mouse only)
    const nextHover = ready && pointer.onCanvas && pointer.mouse ? pick(pointer.x, pointer.y) : null;
    if (nextHover !== hovered) {
      hovered = nextHover;
      document.body.classList.toggle('hovering', !!hovered);
      tooltip.classList.toggle('show', !!hovered && hovered !== selected);
      if (hovered) tooltipName.textContent = PARTS[hovered].name;
    }
    if (hovered) tooltip.style.transform = `translate(${pointer.x + 18}px, ${pointer.y + 18}px)`;

    const tt = tl.time();

    // text fades in as it scrolls into view and out as it leaves
    panels.forEach((el, i) => {
      const sd = tt - i;
      const d = Math.abs(sd);
      const o = (1 - smoothstep(0.22, 0.5, d)) * calm;
      el.style.opacity = o.toFixed(3);
      el.style.visibility = o < 0.01 ? 'hidden' : 'visible';
      // depth: layers drift at different speeds as the page scrolls
      if (o > 0.01 && !reduceMotion) {
        const layers = depthLayers[i];
        for (let L = 0; L < layers.length; L++) {
          for (const node of layers[L]) node.style.transform = `translate3d(0, ${(sd * DEPTH[L]).toFixed(1)}px, 0)`;
        }
      }
    });

    // god rays sit right behind the phone on screen
    phoneScreen.set(0, 0, 0);
    phone.root.localToWorld(phoneScreen);
    phoneScreen.project(stage.camera);
    const rx = (phoneScreen.x * 0.5 + 0.5) * W;
    const ry = (-phoneScreen.y * 0.5 + 0.5) * H;
    raysEl.style.transform = `translate3d(${rx.toFixed(1)}px, ${ry.toFixed(1)}px, 0)`;
    const raysO = raysAt(tt) * calm;
    raysEl.style.opacity = raysO.toFixed(3);
    // pause the background shaders while a part is inspected (frees the GPU for the fly-in)
    const shadersOn = inspect.k < 0.02 && !reduceMotion;
    if (shadersOn !== shadersRunning) {
      shadersRunning = shadersOn;
      backdropMount?.setSpeed(shadersOn ? 0.25 : 0);
      raysMount?.setSpeed(shadersOn ? 0.35 : 0);
    }
    raysEl.style.visibility = raysO < 0.01 ? 'hidden' : 'visible';

    // aura blobs drift with scroll + time (depth)
    auraBlobs.forEach((b, k) => {
      const ph = tt * (0.6 + k * 0.25) + t * 0.05 * (k + 1);
      b.style.transform = `translate3d(${(Math.sin(ph) * 12).toFixed(2)}vw, ${(Math.cos(ph * 0.8) * 10 - tt * 2).toFixed(2)}vh, 0)`;
    });

    drawTrail();

    // marquee skews with scroll velocity
    if (marqueeTrack) {
      marqueeSkew += (clamp(lenis.velocity * -0.6, -14, 14) - marqueeSkew) * 0.12;
      marqueeTrack.parentElement.style.transform = `skewX(${marqueeSkew.toFixed(2)}deg)`;
    }

    // nav: progress hairline + active section
    navProgress.style.transform = `scaleX(${clamp(lenis.scroll / (lenis.limit || 1), 0, 1)})`;
    const navNear = Math.round(tt);
    if (navNear !== navActive) {
      navActive = navNear;
      let best = null;
      for (const b of navButtons) if (+b.dataset.goto <= navNear) best = b;
      navButtons.forEach((b) => b.classList.toggle('active', b === best));
    }

    // floating labels
    const focusW = { processor: state.hlProcessor, camera: state.hlCamera, battery: state.hlBattery, storage: state.hlStorage };
    for (const L of labels) {
      v.copy(L.anchor);
      phone.parts[L.id].group.localToWorld(v);
      v.project(stage.camera);
      const o = v.z < 1 ? Math.max(state.labels, focusW[L.id] || 0) * calm : 0;
      L.el.style.opacity = o.toFixed(3);
      L.el.style.transform = `translate(${((v.x * 0.5 + 0.5) * W).toFixed(1)}px, ${((-v.y * 0.5 + 0.5) * H).toFixed(1)}px)`;
      const vis = o > 0.3;
      if (vis !== L.visible) {
        L.visible = vis;
        L.el.classList.toggle('hidden', !vis);
      }
    }

    // section moments
    if (ready) {
      const near = Math.round(tt);
      const inside = Math.abs(tt - near) < 0.3;
      if (inside && near !== activeSlide) {
        if (activeSlide !== -1) onLeave(activeSlide);
        activeSlide = near;
        onEnter(near);
      } else if (!inside && activeSlide !== -1) {
        onLeave(activeSlide);
        activeSlide = -1;
      }
    }

    stage.render();
  }
  gsap.ticker.add(tick);

  window.addEventListener('resize', () => {
    const progress = lenis.scroll / unit;
    if (layout(false)) {
      ScrollTrigger.refresh();
      lenis.scrollTo(progress * unit, { immediate: true, force: true });
    }
  });

  // ── reveal ──
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  // the loader must never block taps / swipes: stop catching input immediately, always remove it
  const loaderEl = $('#loader');
  loaderEl.style.pointerEvents = 'none';
  gsap.to(loaderEl, { autoAlpha: 0, duration: 0.9, ease: 'power2.out', onComplete: () => loaderEl.remove() });
  setTimeout(() => loaderEl.isConnected && loaderEl.remove(), 1500);
  gsap.to(intro, { s: 1, y: 0, spin: 0, duration: 2.4, ease: 'expo.out' });
  gsap.from('.panel-intro .kicker, .panel-intro .lede, .panel-intro .cta-row', { opacity: 0, y: 20, stagger: 0.12, duration: 0.9, delay: 0.5, ease: 'power3.out' });
  setTimeout(() => {
    ready = true;
    lenis.start();
  }, 400);

  // handy for debugging / rehearsing: window.novaedge.goTo(4)
  window.novaedge = { goTo, state, tl, lenis, phone, stage, openInfo, closeInfo, setFinish, unit: () => unit, inspect };
}

init();
