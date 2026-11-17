// ─────────────────────────────────────────────────────────────
//  NovaEdge X1 — presentation configuration
//  Edit this file to change colors, texts, explode distances,
//  and slide timing without touching the 3D / animation code.
// ─────────────────────────────────────────────────────────────

// 60 / 30 / 10 palette
export const PALETTE = {
  navy: '#05070F', // 60% — background
  cyan: '#2EA8FF', // 30% — glows, outlines, energy
  amber: '#FFB547', // 10% — single eye-catching accent
  silver: '#C9D3DE', // neutral metal / text
};

// Phone body size in world units (proportions of a modern phone)
export const PHONE = { width: 1.56, height: 3.24, depth: 0.17, radius: 0.24 };

// Phone orientation while it is broken apart (radians)
export const EXPLODED_POSE = { rotX: 0.12, rotY: 0.85, rotZ: -0.03 };

// ── Components ───────────────────────────────────────────────
//  explode : how far the part travels when the phone breaks apart [x, y, z]
//            (z = towards the screen side, negative = towards the back)
//  delay   : 0 → moves first, 1 → moves last (creates the staggered break-apart)
//  label   : show a floating label in the exploded view
//  labelDir: which way the label's leader line points (up / down / left / right)
//  labelAnchor: point on the part (local coords) the label attaches to
export const PARTS = {
  screen: {
    name: 'Display',
    kicker: 'Front display',
    explode: [0, 0, 2.4],
    delay: 0,
    label: true,
    labelDir: 'down',
    labelAnchor: [0, -1.62, 0],
    description:
      'A vivid, immersive display that stretches nearly edge to edge — protected by a smooth, durable glass surface.',
    highlights: ['Edge-to-edge viewing', 'Rich, vibrant color', 'Smooth, responsive touch'],
  },
  processor: {
    name: 'Processor',
    kicker: 'Performance core',
    explode: [0.15, 0.2, 1.2],
    delay: 0.25,
    label: true,
    labelDir: 'up',
    labelAnchor: [0, 0.23, 0.02],
    description:
      'The powerful brain of NovaEdge X1. Built for fast performance and seamless multitasking across apps, games and work.',
    highlights: ['Fast, fluid performance', 'Seamless multitasking', 'Efficient by design'],
  },
  storage: {
    name: 'Storage',
    kicker: 'Memory & files',
    explode: [-0.15, -0.05, 1.2],
    delay: 0.3,
    label: true,
    labelDir: 'down',
    labelAnchor: [0, -0.14, 0.02],
    description:
      'Generous storage keeps your photos, videos, apps and documents close at hand — with plenty of room for what matters.',
    highlights: ['Room for photos & videos', 'Apps, games & documents', 'Quick access to your files'],
  },
  frame: {
    name: 'Frame',
    kicker: 'Structure',
    explode: [0, 0, 0],
    delay: 0,
    label: false,
    description: 'A slim, precision-crafted metal frame that gives NovaEdge X1 its elegant profile and solid feel in the hand.',
    highlights: ['Slim, elegant edges', 'Premium metal finish', 'Comfortable grip'],
  },
  battery: {
    name: 'Battery',
    kicker: 'All-day power',
    explode: [0, -0.05, -0.9],
    delay: 0.35,
    label: true,
    labelDir: 'down',
    labelAnchor: [0, -0.875, 0.035],
    description: 'A long-lasting battery designed for all-day performance — from your first alarm to your last message.',
    highlights: ['All-day battery performance', 'Built for long sessions', 'Efficient power use'],
  },
  back: {
    name: 'Back Glass',
    kicker: 'Finish',
    explode: [0, 0, -1.8],
    delay: 0.5,
    label: false,
    description: 'A polished glass back in deep space navy with a premium, reflective finish.',
    highlights: ['Polished glass finish', 'Deep space navy tone', 'Signature design'],
  },
  camera: {
    name: 'Triple Camera',
    kicker: 'Imaging system',
    explode: [0, 0.1, -2.7],
    delay: 0.7,
    label: true,
    labelDir: 'up',
    labelAnchor: [0, 0.34, 0],
    description:
      'Three lenses work together to capture sharp detail, vibrant color and cinematic moments — day or night.',
    highlights: ['Triple-lens system', 'Detailed, vibrant photos', 'Built-in flash'],
  },
};

// ── Slides (order = presentation order) ──────────────────────
//  duration = seconds the transition INTO this slide takes when
//  you press → (longer for the 360° rotations so they feel cinematic)
export const SLIDES = [
  { id: 'intro', nav: 'Introduction', duration: 1.6 },
  { id: 'design', nav: '360° Design', duration: 3.0 },
  { id: 'inside', nav: 'Exploded View', duration: 2.8 },
  { id: 'processor', nav: 'Processor', duration: 2.0 },
  { id: 'camera', nav: 'Camera', duration: 2.0 },
  { id: 'battery', nav: 'Battery', duration: 2.0 },
  { id: 'storage', nav: 'Storage', duration: 2.0 },
  { id: 'reassemble', nav: 'Reassembly', duration: 3.4 },
  { id: 'finale', nav: 'NovaEdge X1', duration: 2.4 },
];

export const SETTINGS = {
  snapToSlides: true, // after free scrolling, glide to the nearest slide
  maxPixelRatio: 1.75, // lower = faster on weak laptops
  bloomStrength: 0.8, // glow intensity
};
