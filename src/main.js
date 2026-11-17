import '@fontsource/orbitron/700.css';
import '@fontsource/orbitron/900.css';
import '@fontsource/space-grotesk/400.css';
import '@fontsource/space-grotesk/500.css';
import '@fontsource/space-grotesk/600.css';
import '@fontsource/space-grotesk/700.css';
import './style.css';

import * as THREE from 'three';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import Lenis from 'lenis';

import { createStage } from './scene.js';
import { buildPhone } from './phone.js';
import { createEffects } from './effects.js';
import { makePhotos } from './textures.js';
import { PARTS, SLIDES, SETTINGS, EXPLODED_POSE } from './config.js';

gsap.registerPlugin(ScrollTrigger, SplitText);
ScrollTrigger.config({ ignoreMobileResize: true });

const TAU = Math.PI * 2;
const N = SLIDES.length;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

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
  const canvas = $('#webgl');
  const stage = createStage(canvas);
  const phone = buildPhone();
  stage.pivot.add(phone.root);
  const effects = createEffects(phone);

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
  // time-based effects (triggered when a slide is reached)
  const fx = { flash: 0, batteryFill: 0, lensSpin: 0 };
  const intro = { s: 0.55, y: -1.2, spin: -1.6 };

  // ── DOM: track, panels, dots, labels, legend, photos ──
  const track = $('#track');
  const panels = $$('.panel');
  panels.forEach((p) => {
    const inner = document.createElement('div');
    inner.className = 'panel-inner';
    while (p.firstChild) inner.appendChild(p.firstChild);
    p.appendChild(inner);
  });

  const dotsEl = $('#dots');
  const dots = SLIDES.map((s, i) => {
    const b = document.createElement('button');
    b.setAttribute('aria-label', `Go to slide ${i + 1}: ${s.nav}`);
    b.innerHTML = `<span>${s.nav}</span>`;
    b.addEventListener('click', () => goTo(i));
    dotsEl.appendChild(b);
    return b;
  });
  $('#counter-total').textContent = String(N).padStart(2, '0');

  const photosEl = $('#photos');
  makePhotos().forEach((p) => {
    const d = document.createElement('div');
    d.className = 'photo';
    d.innerHTML = `<img src="${p.src}" alt="${p.caption} sample visual" /><span>${p.caption}</span>`;
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

  // ── split titles into characters for the reveal animation ──
  const splits = new Map();
  $$('.split').forEach((el) => {
    const idx = +el.closest('.panel').dataset.slide;
    const s = SplitText.create(el, { type: 'words,chars', wordsClass: 'word', charsClass: 'char' });
    splits.set(idx, s.chars);
  });

  gsap.set('.photo, .mt-app, #files li', { opacity: 0 });

  // ── master timeline: time 0 … N-1, one unit per slide ──
  const focusOf = (id) => phone.parts[id].base.clone().add(phone.parts[id].offset);
  const P = focusOf('processor');
  const C = focusOf('camera');
  const B = focusOf('battery');
  const S = focusOf('storage');
  const E = EXPLODED_POSE;
  const ROT1 = TAU + 2.55; // after the first 360° — shows the back three-quarter view
  const ROT2 = 2 * TAU + E.rotY; // exploded pose
  const ROT3 = 3 * TAU + E.rotY; // reassembled — exactly one more full 360°
  const ROT4 = 3 * TAU; // facing the audience

  const tl = gsap.timeline({ paused: true, defaults: { ease: 'power2.inOut' } });
  // 0 → 1 · 360° rotation
  tl.to(state, { rotY: ROT1, rotX: 0.06, rotZ: 0, shift: 1, glow: 0.12, duration: 0.76 }, 0.12);
  // 1 → 2 · exploded view
  tl.to(state, { rotY: ROT2, rotX: E.rotX, rotZ: E.rotZ, duration: 0.72 }, 1.1);
  tl.to(state, { explode: 1, camFlip: 1, duration: 0.66, ease: 'power3.inOut' }, 1.22);
  tl.to(state, { outlines: 1, duration: 0.3 }, 1.5);
  tl.to(state, { labels: 1, duration: 0.14, ease: 'none' }, 1.74);
  // 2 → 3 · processor
  tl.to(state, { labels: 0, duration: 0.12, ease: 'none' }, 2.12);
  tl.to(state, { zoom: 1, fx: P.x, fy: P.y, fz: P.z, camYaw: 0.12, duration: 0.7 }, 2.15);
  tl.to(state, { hlProcessor: 1, procFx: 1, duration: 0.35 }, 2.45);
  // 3 → 4 · camera
  tl.to(state, { hlProcessor: 0, procFx: 0, duration: 0.25 }, 3.12);
  tl.to(state, { fx: C.x, fy: C.y, fz: C.z, camYaw: -0.12, duration: 0.7 }, 3.15);
  tl.to(state, { hlCamera: 1, duration: 0.35 }, 3.45);
  // 4 → 5 · battery
  tl.to(state, { hlCamera: 0, duration: 0.25 }, 4.12);
  tl.to(state, { fx: B.x, fy: B.y, fz: B.z, camYaw: 0.04, duration: 0.7 }, 4.15);
  tl.to(state, { hlBattery: 1, battFx: 1, duration: 0.35 }, 4.45);
  // 5 → 6 · storage
  tl.to(state, { hlBattery: 0, battFx: 0, duration: 0.25 }, 5.12);
  tl.to(state, { fx: S.x, fy: S.y, fz: S.z, camYaw: 0.16, duration: 0.7 }, 5.15);
  tl.to(state, { hlStorage: 1, storFx: 1, duration: 0.4 }, 5.45);
  // 6 → 7 · reassemble + another 360°
  tl.to(state, { hlStorage: 0, storFx: 0, duration: 0.2 }, 6.1);
  tl.to(state, { zoom: 0, camYaw: 0, duration: 0.45 }, 6.12);
  tl.to(state, { explode: 0, camFlip: 0, duration: 0.5, ease: 'power3.inOut' }, 6.2);
  tl.to(state, { outlines: 0, duration: 0.3 }, 6.45);
  tl.to(state, { rotY: ROT3, rotX: 0.08, rotZ: 0, posZ: -0.6, duration: 0.62 }, 6.3);
  // 7 → 8 · final hero shot
  tl.to(state, { rotY: ROT4, rotX: 0.02, shift: 0, lift: 1, posZ: 0.5, glow: 1, duration: 0.72, ease: 'power3.inOut' }, 7.14);

  // text panels fade in/out around each slide
  panels.forEach((el, i) => {
    const inner = el.firstElementChild;
    if (i > 0) {
      tl.fromTo(el, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.2, ease: 'none' }, i - 0.3);
      tl.fromTo(inner, { y: 50 }, { y: 0, duration: 0.24, ease: 'power2.out' }, i - 0.3);
    }
    if (i < N - 1) {
      tl.to(el, { autoAlpha: 0, duration: 0.16, ease: 'none', immediateRender: false }, i + 0.12);
      tl.to(inner, { y: -50, duration: 0.18, ease: 'power2.in', immediateRender: false }, i + 0.12);
    }
  });
  tl.set({}, {}, N - 1);
  gsap.set(panels[0], { autoAlpha: 1 });

  // ── smooth scrolling ──
  const lenis = new Lenis({ lerp: 0.085, wheelMultiplier: 0.9, smoothWheel: true });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
  lenis.stop();

  function layout() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    stage.setSize(w, h);
    track.style.height = `${N * h}px`;
  }
  layout();

  ScrollTrigger.create({ trigger: track, start: 'top top', end: 'bottom bottom', animation: tl, scrub: true });

  // ── navigation (keys, dots, buttons, snapping) ──
  let settled = 0;
  let navigating = false;
  let navTarget = 0;
  let snapTimer = 0;
  const scrollPos = () => lenis.scroll / window.innerHeight;

  function goTo(i) {
    i = clamp(i, 0, N - 1);
    const now = scrollPos();
    const dist = Math.abs(i - now);
    if (dist < 0.002) return;
    const idx = i > now ? i : Math.min(N - 1, i + 1);
    const duration = dist <= 1.001 ? SLIDES[idx].duration * clamp(dist, 0.35, 1) : Math.min(4.5, 1.4 + dist * 0.45);
    navigating = true;
    navTarget = i;
    lenis.scrollTo(i * window.innerHeight, {
      duration,
      easing: easeInOutCubic,
      lock: true,
      force: true,
      onComplete: () => {
        navigating = false;
        settled = i;
      },
    });
  }

  lenis.on('scroll', () => {
    if (!SETTINGS.snapToSlides || navigating) return;
    clearTimeout(snapTimer);
    snapTimer = setTimeout(() => {
      if (navigating) return;
      const t = scrollPos();
      const r = Math.round(t);
      if (Math.abs(t - r) < 0.004) {
        settled = r;
        return;
      }
      goTo(t > settled ? Math.ceil(t - 0.15) : Math.floor(t + 0.15));
    }, 160);
  });

  window.addEventListener('keydown', (e) => {
    if (e.target.closest && e.target.closest('input, textarea')) return;
    const base = navigating ? navTarget : Math.round(scrollPos());
    const k = e.key;
    if (['ArrowRight', 'ArrowDown', 'PageDown', ' '].includes(k)) {
      e.preventDefault();
      goTo(base + 1);
    } else if (['ArrowLeft', 'ArrowUp', 'PageUp'].includes(k)) {
      e.preventDefault();
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

  // ── info panel ──
  const infoEl = $('#info');
  const partOrder = Object.keys(PARTS);
  let selected = null;
  function openInfo(id) {
    const c = PARTS[id];
    selected = id;
    $('.info-kicker', infoEl).textContent = c.kicker;
    $('.info-title', infoEl).textContent = c.name;
    $('.info-desc', infoEl).textContent = c.description;
    $('.info-list', infoEl).innerHTML = c.highlights.map((h) => `<li>${h}</li>`).join('');
    infoEl.classList.add('open');
    infoEl.setAttribute('aria-hidden', 'false');
    gsap.fromTo($$('.info-title, .info-desc, .info-list li', infoEl), { opacity: 0, y: 14 }, { opacity: 1, y: 0, stagger: 0.05, duration: 0.45, ease: 'power2.out', delay: 0.1 });
    $$('button', legendEl).forEach((b, i) => b.classList.toggle('active', labelParts[i] === id));
  }
  function closeInfo() {
    selected = null;
    infoEl.classList.remove('open');
    infoEl.setAttribute('aria-hidden', 'true');
    $$('button', legendEl).forEach((b) => b.classList.remove('active'));
  }
  $('.info-close', infoEl).addEventListener('click', closeInfo);
  $('#info-next').addEventListener('click', () => openInfo(partOrder[(partOrder.indexOf(selected) + 1) % partOrder.length]));
  $('#info-prev').addEventListener('click', () => openInfo(partOrder[(partOrder.indexOf(selected) - 1 + partOrder.length) % partOrder.length]));

  // ── pointer: parallax, hover, click ──
  const pointer = { x: 0, y: 0, nx: 0, ny: 0, onCanvas: false, mouse: false };
  const par = { x: 0, y: 0 };
  window.addEventListener('pointermove', (e) => {
    pointer.x = e.clientX;
    pointer.y = e.clientY;
    pointer.nx = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.ny = -(e.clientY / window.innerHeight) * 2 + 1;
    pointer.onCanvas = e.target === canvas;
    pointer.mouse = e.pointerType === 'mouse';
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
  canvas.addEventListener('pointerdown', (e) => (downAt = { x: e.clientX, y: e.clientY }));
  canvas.addEventListener('click', (e) => {
    if (downAt && Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y) > 8) return;
    const id = pick(e.clientX, e.clientY);
    if (id) openInfo(id);
    else closeInfo();
  });

  const tooltip = $('#tooltip');
  const tooltipName = $('strong', tooltip);
  const hoverW = Object.fromEntries(Object.keys(PARTS).map((k) => [k, 0]));
  let hovered = null;

  // ── slide enter / leave moments ──
  function onEnter(i) {
    const chars = splits.get(i);
    if (chars) {
      gsap.fromTo(chars, { yPercent: 70, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.75, stagger: 0.016, ease: 'power3.out', overwrite: true });
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
    if (id === 'processor') gsap.to('.mt-app', { opacity: 0, duration: 0.3, overwrite: true });
    if (id === 'camera') {
      gsap.to(fx, { lensSpin: 0, duration: 0.6 });
      gsap.to('.photo', { opacity: 0, duration: 0.3, overwrite: true });
    }
    if (id === 'battery') {
      gsap.to(fx, { batteryFill: 0, duration: 0.5, overwrite: true });
      gsap.to('#battery-fill', { scaleX: 0, duration: 0.5, overwrite: true });
    }
    if (id === 'storage') gsap.to('#files li', { opacity: 0, duration: 0.3, overwrite: true });
  }

  // ── render loop ──
  const t0 = performance.now();
  const focusWorld = new THREE.Vector3();
  const v = new THREE.Vector3();
  const progressBar = $('#progress span');
  const counter = $('#counter-current');
  let uiSlide = -1;
  let activeSlide = -1;
  let ready = false;

  function tick() {
    const t = (performance.now() - t0) / 1000;
    const W = window.innerWidth;
    const H = window.innerHeight;

    phone.root.rotation.set(state.rotX, state.rotY, state.rotZ);
    phone.root.position.set(0, state.posY, state.posZ);
    par.x += (pointer.nx - par.x) * 0.04;
    par.y += (pointer.ny - par.y) * 0.04;
    stage.pivot.position.y = Math.sin(t * 0.9) * 0.06 + intro.y;
    stage.pivot.rotation.set(-par.y * 0.05 + Math.sin(t * 0.6) * 0.015, par.x * 0.09 + intro.spin, Math.sin(t * 0.5) * 0.01);
    stage.pivot.scale.setScalar(intro.s);

    for (const id in hoverW) {
      const target = id === hovered || id === selected || id === legendHover ? 1 : 0;
      hoverW[id] += (target - hoverW[id]) * 0.16;
    }

    phone.update(state, fx, t, hoverW);
    effects.update(state, fx, t);
    stage.scene.updateMatrixWorld();
    focusWorld.set(state.fx, state.fy, state.fz);
    phone.root.localToWorld(focusWorld);
    stage.updateCamera(state, focusWorld, t);
    stage.camera.updateMatrixWorld();

    // hover (mouse only)
    const nextHover = ready && pointer.onCanvas && pointer.mouse ? pick(pointer.x, pointer.y) : null;
    if (nextHover !== hovered) {
      hovered = nextHover;
      document.body.classList.toggle('hovering', !!hovered);
      tooltip.classList.toggle('show', !!hovered);
      if (hovered) tooltipName.textContent = PARTS[hovered].name;
    }
    if (hovered) tooltip.style.transform = `translate(${pointer.x + 18}px, ${pointer.y + 18}px)`;

    // floating labels
    const focusW = { processor: state.hlProcessor, camera: state.hlCamera, battery: state.hlBattery, storage: state.hlStorage };
    for (const L of labels) {
      v.copy(L.anchor);
      phone.parts[L.id].group.localToWorld(v);
      v.project(stage.camera);
      const o = v.z < 1 ? Math.max(state.labels, focusW[L.id] || 0) : 0;
      L.el.style.opacity = o.toFixed(3);
      L.el.style.transform = `translate(${((v.x * 0.5 + 0.5) * W).toFixed(1)}px, ${((-v.y * 0.5 + 0.5) * H).toFixed(1)}px)`;
      const vis = o > 0.3;
      if (vis !== L.visible) {
        L.visible = vis;
        L.el.classList.toggle('hidden', !vis);
      }
    }

    // progress, counter, slide moments
    const limit = lenis.limit || 1;
    progressBar.style.transform = `scaleX(${clamp(lenis.scroll / limit, 0, 1)})`;
    const tt = tl.time();
    const near = Math.round(tt);
    if (near !== uiSlide) {
      uiSlide = near;
      counter.textContent = String(near + 1).padStart(2, '0');
      dots.forEach((d, i) => d.classList.toggle('active', i === near));
    }
    if (ready) {
      const hold = Math.abs(tt - near) < 0.14;
      if (hold && near !== activeSlide) {
        if (activeSlide !== -1) onLeave(activeSlide);
        activeSlide = near;
        onEnter(near);
      } else if (!hold && activeSlide !== -1) {
        onLeave(activeSlide);
        activeSlide = -1;
      }
    }

    stage.render();
  }
  gsap.ticker.add(tick);

  window.addEventListener('resize', () => {
    layout();
    ScrollTrigger.refresh();
    lenis.scrollTo(settled * window.innerHeight, { immediate: true, force: true });
  });

  // ── reveal ──
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  gsap.to('#loader', { autoAlpha: 0, duration: 0.9, ease: 'power2.out', onComplete: () => $('#loader')?.remove() });
  gsap.to(intro, { s: 1, y: 0, spin: 0, duration: 2.4, ease: 'expo.out' });
  gsap.from('.panel-intro .kicker, .panel-intro .body, .panel-intro .scroll-hint', { opacity: 0, y: 20, stagger: 0.12, duration: 0.9, delay: 0.5, ease: 'power3.out' });
  setTimeout(() => {
    ready = true;
    lenis.start();
  }, 400);

  // handy for debugging / rehearsing: window.novaedge.goTo(4)
  window.novaedge = { goTo, state, tl, lenis, phone, stage };
}

init();
