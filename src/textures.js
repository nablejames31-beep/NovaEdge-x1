// Procedural canvas textures — everything is drawn in code so the
// site works fully offline and the design stays 100% original.
import * as THREE from 'three';

const TAU = Math.PI * 2;
const CYAN = '#2EA8FF';
const AMBER = '#FFB547';
const DISPLAY = "'Orbitron', 'Space Grotesk', sans-serif";
const BODY = "'Space Grotesk', system-ui, sans-serif";

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')];
}

function toTexture(c) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

function spacedText(ctx, text, x, y, spacing) {
  ctx.letterSpacing = `${spacing}px`;
  ctx.fillText(text, x + spacing / 2, y); // compensate trailing space when centered
  ctx.letterSpacing = '0px';
}

function rand(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── Phone display (lock screen) ──────────────────────────────
export function screenTexture() {
  const W = 720;
  const H = 1496;
  const [c, ctx] = makeCanvas(W, H);
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);

  ctx.save();
  ctx.beginPath();
  ctx.roundRect(16, 16, W - 32, H - 32, 92);
  ctx.clip();

  let g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#0a2452');
  g.addColorStop(0.5, '#050f27');
  g.addColorStop(1, '#02040c');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  const ribbon = (color, width, blur, p) => {
    ctx.save();
    ctx.filter = `blur(${blur}px)`;
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(p[0], p[1]);
    ctx.bezierCurveTo(p[2], p[3], p[4], p[5], p[6], p[7]);
    ctx.stroke();
    ctx.restore();
  };
  ctx.globalCompositeOperation = 'lighter';
  const a = [-120, 1010, 220, 720, 520, 1240, 860, 780];
  const b = [-120, 1280, 260, 1020, 500, 1420, 880, 1080];
  const d = [-80, 1150, 240, 930, 500, 1350, 840, 1000];
  ribbon('rgba(46,168,255,0.55)', 130, 60, a);
  ribbon('rgba(130,200,255,0.95)', 5, 1.5, a);
  ribbon('rgba(70,90,255,0.35)', 170, 70, b);
  ribbon('rgba(255,181,71,0.40)', 60, 28, d);
  ribbon('rgba(255,205,130,0.95)', 3, 1, d);

  // brand orb
  const cx = W / 2;
  const cy = H * 0.36;
  g = ctx.createRadialGradient(cx, cy, 0, cx, cy, 260);
  g.addColorStop(0, 'rgba(140,210,255,0.75)');
  g.addColorStop(0.3, 'rgba(46,168,255,0.32)');
  g.addColorStop(1, 'rgba(46,168,255,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cx, cy, 260, 0, TAU);
  ctx.fill();
  ctx.globalCompositeOperation = 'source-over';

  ctx.strokeStyle = 'rgba(201,211,222,0.55)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, 165, -0.3, Math.PI + 0.3, true);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(46,168,255,0.9)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(cx, cy, 185, 0.4, 1.4);
  ctx.stroke();
  ctx.strokeStyle = AMBER;
  ctx.beginPath();
  ctx.arc(cx, cy, 185, 3.6, 3.9);
  ctx.stroke();

  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `900 150px ${DISPLAY}`;
  ctx.shadowColor = 'rgba(46,168,255,0.9)';
  ctx.shadowBlur = 30;
  ctx.fillText('X1', cx, cy + 6);
  ctx.shadowBlur = 0;

  ctx.fillStyle = 'rgba(232,238,246,0.85)';
  ctx.font = `700 34px ${DISPLAY}`;
  spacedText(ctx, 'NOVAEDGE', cx, 170, 12);

  ctx.fillStyle = 'rgba(201,211,222,0.7)';
  ctx.font = `500 30px ${BODY}`;
  ctx.fillText('Power your ambition', cx, cy + 270);

  // status bar glyphs (no numbers)
  ctx.fillStyle = 'rgba(232,238,246,0.8)';
  for (let i = 0; i < 4; i++) ctx.fillRect(560 + i * 14, 78 - i * 6, 9, 12 + i * 6);
  ctx.strokeStyle = 'rgba(232,238,246,0.8)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(70, 66, 54, 26, 7);
  ctx.stroke();
  ctx.fillStyle = CYAN;
  ctx.fillRect(75, 71, 38, 16);

  // dock
  const icons = [CYAN, '#7f8cff', AMBER, '#C9D3DE'];
  for (let i = 0; i < 4; i++) {
    const x = 118 + i * 128;
    const y = H - 230;
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.beginPath();
    ctx.roundRect(x, y, 100, 100, 28);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = icons[i];
    ctx.beginPath();
    ctx.arc(x + 50, y + 50, 18, 0, TAU);
    ctx.fill();
  }
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.beginPath();
  ctx.roundRect(W / 2 - 110, H - 70, 220, 8, 4);
  ctx.fill();
  ctx.restore();

  // punch-hole camera
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.arc(W / 2, 80, 20, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = 'rgba(60,80,120,0.8)';
  ctx.lineWidth = 2;
  ctx.stroke();

  return toTexture(c);
}

// ── Back-glass wordmark ──────────────────────────────────────
export function logoTexture() {
  const [c, ctx] = makeCanvas(1024, 200);
  const g = ctx.createLinearGradient(0, 0, 1024, 0);
  g.addColorStop(0, '#8e9aa8');
  g.addColorStop(0.5, '#eef3f8');
  g.addColorStop(1, '#8e9aa8');
  ctx.fillStyle = g;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `700 92px ${DISPLAY}`;
  spacedText(ctx, 'NOVAEDGE', 512, 100, 26);
  return toTexture(c);
}

// ── Processor lid ────────────────────────────────────────────
export function processorTexture() {
  const S = 512;
  const [c, ctx] = makeCanvas(S, S);
  let g = ctx.createLinearGradient(0, 0, S, S);
  g.addColorStop(0, '#8c98a6');
  g.addColorStop(0.45, '#e4ebf2');
  g.addColorStop(0.55, '#c3ccd6');
  g.addColorStop(1, '#7d8997');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, S, S);
  const r = rand(3);
  for (let i = 0; i < 700; i++) {
    ctx.strokeStyle = `rgba(${r() > 0.5 ? 255 : 0},${r() > 0.5 ? 255 : 0},255,${0.03 + r() * 0.04})`;
    const y = r() * S;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(S, y + (r() - 0.5) * 4);
    ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(20,30,50,0.35)';
  ctx.lineWidth = 4;
  ctx.strokeRect(22, 22, S - 44, S - 44);
  // emblem
  ctx.save();
  ctx.translate(S / 2, S / 2 - 50);
  ctx.rotate(Math.PI / 4);
  ctx.strokeStyle = 'rgba(15,26,46,0.85)';
  ctx.lineWidth = 8;
  ctx.strokeRect(-46, -46, 92, 92);
  ctx.fillStyle = 'rgba(46,168,255,0.9)';
  ctx.fillRect(-20, -20, 40, 40);
  ctx.restore();
  ctx.fillStyle = 'rgba(15,26,46,0.9)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `800 52px ${DISPLAY}`;
  spacedText(ctx, 'NOVAEDGE', S / 2, S / 2 + 90, 6);
  ctx.font = `500 26px ${BODY}`;
  spacedText(ctx, 'PERFORMANCE CORE', S / 2, S / 2 + 145, 6);
  ctx.fillStyle = 'rgba(15,26,46,0.9)';
  ctx.beginPath();
  ctx.arc(52, 52, 9, 0, TAU);
  ctx.fill();
  return toTexture(c);
}

// ── Storage chip ─────────────────────────────────────────────
export function storageTexture() {
  const [c, ctx] = makeCanvas(512, 340);
  const g = ctx.createLinearGradient(0, 0, 512, 340);
  g.addColorStop(0, '#1a1f2a');
  g.addColorStop(1, '#0b0e14');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 512, 340);
  ctx.fillStyle = 'rgba(201,211,222,0.85)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `700 46px ${DISPLAY}`;
  spacedText(ctx, 'NOVAEDGE', 256, 140, 6);
  ctx.fillStyle = 'rgba(46,168,255,0.9)';
  ctx.font = `600 26px ${BODY}`;
  spacedText(ctx, 'STORAGE', 256, 200, 10);
  ctx.fillStyle = 'rgba(201,211,222,0.5)';
  ctx.beginPath();
  ctx.arc(36, 36, 8, 0, TAU);
  ctx.fill();
  for (let i = 0; i < 18; i++) ctx.fillRect(60 + i * 22, 290, 12, 4);
  return toTexture(c);
}

// ── Battery wrap ─────────────────────────────────────────────
export function batteryTexture() {
  const W = 512;
  const H = 700;
  const [c, ctx] = makeCanvas(W, H);
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#202733');
  g.addColorStop(1, '#10141b');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = 'rgba(201,211,222,0.25)';
  ctx.lineWidth = 3;
  ctx.strokeRect(24, 24, W - 48, H - 48);
  // bolt
  ctx.save();
  ctx.translate(W / 2, 270);
  ctx.strokeStyle = CYAN;
  ctx.lineWidth = 8;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(18, -95);
  ctx.lineTo(-48, 12);
  ctx.lineTo(4, 12);
  ctx.lineTo(-16, 95);
  ctx.lineTo(50, -14);
  ctx.lineTo(-2, -14);
  ctx.closePath();
  ctx.stroke();
  ctx.restore();
  ctx.fillStyle = 'rgba(232,238,246,0.9)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `700 50px ${DISPLAY}`;
  spacedText(ctx, 'NOVAEDGE', W / 2, 450, 6);
  ctx.fillStyle = 'rgba(201,211,222,0.6)';
  ctx.font = `500 24px ${BODY}`;
  spacedText(ctx, 'RECHARGEABLE BATTERY', W / 2, 505, 5);
  ctx.fillStyle = 'rgba(201,211,222,0.25)';
  for (let i = 0; i < 6; i++) ctx.fillRect(70, 570 + i * 16, 372 - i * 40, 5);
  return toTexture(c);
}

// ── Camera lens glass (with a marker so rotation is visible) ─
export function lensTexture() {
  const S = 512;
  const [c, ctx] = makeCanvas(S, S);
  const m = S / 2;
  let g = ctx.createRadialGradient(m, m, 0, m, m, m);
  g.addColorStop(0, '#000000');
  g.addColorStop(0.35, '#050913');
  g.addColorStop(0.75, '#0c1730');
  g.addColorStop(1, '#03050a');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, S, S);
  if (ctx.createConicGradient) {
    const cg = ctx.createConicGradient(0, m, m);
    cg.addColorStop(0, 'rgba(120,80,255,0.25)');
    cg.addColorStop(0.25, 'rgba(46,168,255,0.05)');
    cg.addColorStop(0.5, 'rgba(60,255,200,0.2)');
    cg.addColorStop(0.75, 'rgba(46,168,255,0.05)');
    cg.addColorStop(1, 'rgba(120,80,255,0.25)');
    ctx.fillStyle = cg;
    ctx.beginPath();
    ctx.arc(m, m, m * 0.82, 0, TAU);
    ctx.arc(m, m, m * 0.42, 0, TAU, true);
    ctx.fill();
  }
  for (let i = 1; i <= 6; i++) {
    ctx.strokeStyle = `rgba(140,180,255,${0.05 + i * 0.02})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(m, m, (m * i) / 6.6, 0, TAU);
    ctx.stroke();
  }
  // aperture blades hint
  ctx.strokeStyle = 'rgba(180,200,255,0.12)';
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * TAU;
    ctx.beginPath();
    ctx.moveTo(m + Math.cos(a) * m * 0.2, m + Math.sin(a) * m * 0.2);
    ctx.lineTo(m + Math.cos(a + 0.9) * m * 0.42, m + Math.sin(a + 0.9) * m * 0.42);
    ctx.stroke();
  }
  // marker arcs
  ctx.lineWidth = 6;
  ctx.strokeStyle = 'rgba(46,168,255,0.85)';
  ctx.beginPath();
  ctx.arc(m, m, m * 0.88, -0.5, 0.1);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,181,71,0.6)';
  ctx.beginPath();
  ctx.arc(m, m, m * 0.88, 2.6, 2.8);
  ctx.stroke();
  // highlight
  g = ctx.createRadialGradient(m * 0.7, m * 0.62, 0, m * 0.7, m * 0.62, m * 0.35);
  g.addColorStop(0, 'rgba(255,255,255,0.55)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, S, S);
  return toTexture(c);
}

// ── Soft radial glow (for sprites) ───────────────────────────
export function glowTexture() {
  const S = 256;
  const [c, ctx] = makeCanvas(S, S);
  const g = ctx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.2, 'rgba(255,255,255,0.55)');
  g.addColorStop(0.5, 'rgba(255,255,255,0.15)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, S, S);
  const t = new THREE.CanvasTexture(c);
  return t;
}

// ── Floating file icons (storage scene) ──────────────────────
export function fileIconTexture(type) {
  const S = 160;
  const [c, ctx] = makeCanvas(S, S);
  ctx.fillStyle = 'rgba(10,22,46,0.92)';
  ctx.strokeStyle = type === 'photo' ? AMBER : CYAN;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.roundRect(10, 10, S - 20, S - 20, 30);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = '#E8EEF6';
  ctx.fillStyle = '#E8EEF6';
  ctx.lineWidth = 7;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  const m = S / 2;
  switch (type) {
    case 'photo':
      ctx.strokeRect(42, 48, 76, 62);
      ctx.beginPath();
      ctx.moveTo(46, 104);
      ctx.lineTo(70, 78);
      ctx.lineTo(88, 96);
      ctx.lineTo(100, 84);
      ctx.lineTo(114, 104);
      ctx.stroke();
      ctx.fillStyle = AMBER;
      ctx.beginPath();
      ctx.arc(98, 64, 7, 0, TAU);
      ctx.fill();
      break;
    case 'video':
      ctx.beginPath();
      ctx.moveTo(62, 50);
      ctx.lineTo(112, m);
      ctx.lineTo(62, 110);
      ctx.closePath();
      ctx.fill();
      break;
    case 'doc':
      ctx.strokeRect(52, 40, 56, 80);
      for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.moveTo(62, 58 + i * 15);
        ctx.lineTo(98 - (i === 3 ? 14 : 0), 58 + i * 15);
        ctx.stroke();
      }
      break;
    case 'music':
      ctx.beginPath();
      ctx.moveTo(70, 104);
      ctx.lineTo(70, 50);
      ctx.lineTo(108, 42);
      ctx.lineTo(108, 96);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(62, 106, 10, 0, TAU);
      ctx.arc(100, 98, 10, 0, TAU);
      ctx.fill();
      break;
    case 'folder':
      ctx.beginPath();
      ctx.moveTo(40, 58);
      ctx.lineTo(66, 58);
      ctx.lineTo(74, 66);
      ctx.lineTo(120, 66);
      ctx.lineTo(120, 110);
      ctx.lineTo(40, 110);
      ctx.closePath();
      ctx.stroke();
      break;
    default: // app grid
      for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.roundRect(46 + (i % 2) * 38, 46 + Math.floor(i / 2) * 38, 30, 30, 8);
        ctx.fill();
      }
  }
  return toTexture(c);
}

// ── Sample "photos" for the camera scene (illustrative) ──────
function landscape() {
  const [c, ctx] = makeCanvas(480, 600);
  let g = ctx.createLinearGradient(0, 0, 0, 600);
  g.addColorStop(0, '#1b2a5c');
  g.addColorStop(0.45, '#e2795a');
  g.addColorStop(0.62, '#ffc27a');
  g.addColorStop(1, '#2a1f3a');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 480, 600);
  g = ctx.createRadialGradient(250, 360, 0, 250, 360, 140);
  g.addColorStop(0, 'rgba(255,240,200,1)');
  g.addColorStop(0.25, 'rgba(255,210,140,0.9)');
  g.addColorStop(1, 'rgba(255,180,90,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 480, 600);
  const layers = ['#5b3a5e', '#3d2a4f', '#22193a', '#120e24'];
  const r = rand(11);
  layers.forEach((col, i) => {
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(0, 600);
    let y = 330 + i * 60;
    ctx.lineTo(0, y);
    for (let x = 0; x <= 480; x += 40) {
      y = 330 + i * 60 + Math.sin(x * 0.012 + i * 2) * 50 - r() * 40;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(480, 600);
    ctx.fill();
  });
  return c;
}

function cityNight() {
  const [c, ctx] = makeCanvas(480, 600);
  let g = ctx.createLinearGradient(0, 0, 0, 600);
  g.addColorStop(0, '#02040c');
  g.addColorStop(0.6, '#0b1d44');
  g.addColorStop(1, '#05070f');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 480, 600);
  const r = rand(5);
  for (let i = 0; i < 120; i++) {
    ctx.fillStyle = `rgba(255,255,255,${r() * 0.8})`;
    ctx.fillRect(r() * 480, r() * 280, 2, 2);
  }
  g = ctx.createRadialGradient(370, 110, 0, 370, 110, 70);
  g.addColorStop(0, 'rgba(230,240,255,1)');
  g.addColorStop(0.3, 'rgba(200,220,255,0.6)');
  g.addColorStop(1, 'rgba(200,220,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(250, 0, 230, 230);
  let x = 0;
  while (x < 480) {
    const w = 34 + r() * 50;
    const h = 120 + r() * 230;
    ctx.fillStyle = '#060b18';
    ctx.fillRect(x, 470 - h, w - 4, h);
    for (let wy = 470 - h + 12; wy < 460; wy += 16) {
      for (let wx = x + 6; wx < x + w - 10; wx += 10) {
        if (r() > 0.55) {
          ctx.fillStyle = r() > 0.75 ? 'rgba(46,168,255,0.9)' : 'rgba(255,190,110,0.9)';
          ctx.fillRect(wx, wy, 4, 6);
        }
      }
    }
    x += w;
  }
  // water reflection
  ctx.fillStyle = '#040814';
  ctx.fillRect(0, 470, 480, 130);
  for (let i = 0; i < 70; i++) {
    ctx.fillStyle = r() > 0.6 ? 'rgba(46,168,255,0.5)' : 'rgba(255,190,110,0.5)';
    ctx.fillRect(r() * 480, 478 + r() * 120, 8 + r() * 30, 2);
  }
  return c;
}

function coast() {
  const [c, ctx] = makeCanvas(480, 600);
  let g = ctx.createLinearGradient(0, 0, 0, 340);
  g.addColorStop(0, '#5fb8ff');
  g.addColorStop(1, '#d9f0ff');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 480, 340);
  g = ctx.createLinearGradient(0, 340, 0, 600);
  g.addColorStop(0, '#1e7fc4');
  g.addColorStop(1, '#073a66');
  ctx.fillStyle = g;
  ctx.fillRect(0, 340, 480, 260);
  const r = rand(9);
  for (let i = 0; i < 90; i++) {
    ctx.fillStyle = `rgba(255,255,255,${0.2 + r() * 0.5})`;
    const y = 345 + Math.pow(r(), 1.6) * 250;
    ctx.fillRect(r() * 480, y, 10 + r() * 40 * (y / 400), 2);
  }
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  [
    [90, 90, 50],
    [140, 80, 38],
    [330, 140, 44],
    [370, 130, 30],
  ].forEach(([cx, cy, rr]) => {
    ctx.beginPath();
    ctx.ellipse(cx, cy, rr * 1.6, rr * 0.55, 0, 0, TAU);
    ctx.fill();
  });
  ctx.fillStyle = '#e9d3a8';
  ctx.beginPath();
  ctx.moveTo(0, 600);
  ctx.quadraticCurveTo(160, 520, 480, 560);
  ctx.lineTo(480, 600);
  ctx.fill();
  return c;
}

export function makePhotos() {
  return [
    { src: landscape().toDataURL('image/jpeg', 0.88), caption: 'Landscape' },
    { src: cityNight().toDataURL('image/jpeg', 0.88), caption: 'Night' },
    { src: coast().toDataURL('image/jpeg', 0.88), caption: 'Daylight' },
  ];
}
