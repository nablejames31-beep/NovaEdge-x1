// ─────────────────────────────────────────────────────────────
//  NovaEdge X1 — presentation configuration
//  Edit this file to change colors, texts, explode distances,
//  and slide timing without touching the 3D / animation code.
// ─────────────────────────────────────────────────────────────

// 60 / 30 / 10 palette — near-black ground, pearl-silver product & type, one cyan accent
export const PALETTE = {
  navy: '#08090C', // 60% — graphite black background (neutral, so the phone pops)
  silver: '#D9DEE4', // 30% — pearl silver: the phone body + text
  cyan: '#2EA8FF', // 10% — electric cyan accent: glows, outlines, energy
  amber: '#8FD3FF', // light cyan highlight (secondary tint of the accent)
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
//  definition: plain-language "what it is" shown when you tap the part
//  inspect : camera fly-in when tapped — face = direction to look from, dist = zoom distance
export const PARTS = {
  screen: {
    name: 'Display',
    kicker: 'Front display',
    explode: [0, 0, 2.4],
    delay: 0,
    label: true,
    labelDir: 'down',
    labelAnchor: [0, -1.62, 0],
    definition: 'The display is the screen you see and touch. It shows everything — apps, photos and videos — and responds to your fingers.',
    inspect: { face: [0.35, 0.12, 1], dist: 5.6, offset: [0, 0, 0] },
    specs: [['Size', '6.8″ LTPO AMOLED'], ['Resolution', '3120 × 1440 · 505 ppi'], ['Refresh rate', '1–144 Hz adaptive'], ['Brightness', '3,200 nits peak'], ['Protection', 'NovaGuard ceramic glass']],
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
    definition: 'The processor (also called the chip) is the phone\'s brain. It runs every app, game and task you do, all at the same time.',
    inspect: { face: [0.3, 0.25, 1], dist: 2.3, offset: [0, 0, 0] },
    specs: [['Chip', 'NovaCore X1 · 2 nm'], ['CPU', '10-core · up to 4.2 GHz'], ['GPU', '12-core · hardware ray tracing'], ['AI engine', '50 TOPS neural engine'], ['Memory', '16 GB LPDDR6']],
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
    definition: 'Storage is where the phone keeps your things. It saves your photos, videos, apps and files — even when the phone is switched off.',
    inspect: { face: [0.3, 0.2, 1], dist: 2.1, offset: [0, 0, 0] },
    specs: [['Capacity', '256 GB · 512 GB · 1 TB'], ['Type', 'UFS 4.1'], ['Memory', '16 GB RAM'], ['Read speed', 'Up to 4,200 MB/s']],
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
    definition: 'The frame is the metal band around the edges. It holds every part together and gives the phone its strength and shape.',
    inspect: { face: [1, 0.25, 0.55], dist: 3.6, offset: [0.6, 0.6, 0] },
    specs: [['Material', 'Grade 5 titanium'], ['Thickness', '7.8 mm'], ['Weight', '196 g'], ['Dimensions', '163.4 × 76.2 mm'], ['Durability', 'IP68 · 6 m for 30 min']],
    description: 'A slim, aerospace-grade titanium frame that gives NovaEdge X1 its elegant profile and a solid, light feel in the hand.',
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
    definition: 'The battery stores the energy that powers the phone. You recharge it, and it keeps everything running through your day.',
    inspect: { face: [0.3, 0.2, 1], dist: 4.4, offset: [0, 0, 0] },
    specs: [['Capacity', '5,500 mAh silicon-carbon'], ['Wired charging', '100 W · 50% in 12 min'], ['Wireless', '50 W'], ['Reverse wireless', '10 W'], ['Battery life', 'Up to 2 days']],
    description: 'A long-lasting battery designed for all-day performance — from your first alarm to your last message.',
    highlights: ['All-day battery performance', 'Built for long sessions', 'Efficient power use'],
  },
  back: {
    name: 'Back Glass',
    kicker: 'Finish',
    explode: [0, 0, -1.8],
    delay: 0.5,
    label: false,
    definition: 'The back glass is the phone\'s rear cover. It protects everything inside and gives NovaEdge X1 its finished, premium look.',
    inspect: { face: [0.3, 0.15, -1], dist: 5.8, offset: [0, 0, 0] },
    specs: [['Material', 'Frosted matte glass'], ['Finishes', 'Pearl Silver · Graphite · Glacier Blue · Desert Titanium'], ['Wireless charging', 'Magnetic alignment ring'], ['Durability', 'IP68']],
    description: 'A frosted matte glass back with a soft, fingerprint-resistant feel — available in four finishes.',
    highlights: ['Frosted matte glass', 'Four signature finishes', 'Magnetic wireless charging'],
  },
  camera: {
    name: 'Triple Camera',
    kicker: 'Imaging system',
    explode: [0, 0.1, -2.7],
    delay: 0.7,
    label: true,
    labelDir: 'up',
    labelAnchor: [0, 0.34, 0],
    definition: 'The camera system is the set of lenses and sensors that take your photos and videos. Each lens sees the world a little differently.',
    inspect: { face: [0.3, 0.25, -1], dist: 2.4, offset: [0, 0, 0] },
    specs: [['Main', '200 MP · f/1.6 · OIS'], ['Ultra-wide', '50 MP · 122° view'], ['Telephoto', '64 MP periscope · 6× optical'], ['Zoom', 'Up to 100× digital'], ['Video', '8K60 · 4K120 HDR']],
    description:
      'Three lenses work together to capture sharp detail, vibrant color and cinematic moments — day or night.',
    highlights: ['Triple-lens system', 'Detailed, vibrant photos', 'Built-in flash'],
  },
};

// ── Sections (order = page order) ─────────────────────────────
//  duration = seconds the glide INTO this section takes when you
//  press → / ← on the keyboard while presenting
export const SLIDES = [
  { id: 'intro', nav: 'Overview', duration: 1.6 },
  { id: 'design', nav: 'Design', duration: 3.0 },
  { id: 'inside', nav: 'Inside', duration: 2.8 },
  { id: 'processor', nav: 'Performance', duration: 2.0 },
  { id: 'camera', nav: 'Camera', duration: 2.0 },
  { id: 'battery', nav: 'Battery', duration: 2.0 },
  { id: 'storage', nav: 'Storage', duration: 2.0 },
  { id: 'reassemble', nav: 'Reassembly', duration: 3.4 },
  { id: 'colors', nav: 'Colors', duration: 2.4 },
  { id: 'specs', nav: 'Specs', duration: 2.2 },
  { id: 'finale', nav: 'Buy', duration: 2.4 },
];

// ── Color finishes (back glass, frame, camera block) ─────────
export const FINISHES = [
  { id: 'pearl', name: 'Pearl Silver', back: '#d4d9df', frame: '#c3cad2', plateau: '#14161a', swatch: '#dfe3e8' },
  { id: 'graphite', name: 'Graphite', back: '#2b2e34', frame: '#6c727b', plateau: '#0d0e10', swatch: '#3a3d43' },
  { id: 'glacier', name: 'Glacier Blue', back: '#a9bfd6', frame: '#b8c6d4', plateau: '#121821', swatch: '#b4c8dd' },
  { id: 'desert', name: 'Desert Titanium', back: '#cdb89f', frame: '#c4ac8f', plateau: '#17130f', swatch: '#d2bea6' },
];

// ── Tech specs (fictional — edit freely) ─────────────────────
export const PRICE = 'From $1,199';
export const TECH_SPECS = [
  { group: 'Display', items: ['6.8″ LTPO AMOLED, 3120 × 1440', '1–144 Hz adaptive refresh', '3,200 nits peak brightness', 'NovaGuard ceramic glass'] },
  { group: 'Chip', items: ['NovaCore X1 · 2 nm process', '10-core CPU · 12-core GPU', '50 TOPS neural engine', '16 GB LPDDR6 RAM'] },
  { group: 'Rear camera', items: ['200 MP main · f/1.6 · OIS', '50 MP ultra-wide · 122°', '64 MP periscope · 6× optical', '8K60 · 4K120 HDR video'] },
  { group: 'Front camera', items: ['50 MP autofocus', '4K60 video', 'Face unlock'] },
  { group: 'Battery', items: ['5,500 mAh silicon-carbon', '100 W wired · 50% in 12 min', '50 W wireless · 10 W reverse', 'Up to 2 days of use'] },
  { group: 'Storage', items: ['256 GB · 512 GB · 1 TB', 'UFS 4.1'] },
  { group: 'Design', items: ['Grade 5 titanium frame', '163.4 × 76.2 × 7.8 mm', '196 g', 'IP68 · 6 m for 30 min'] },
  { group: 'Connectivity', items: ['5G sub-6 & mmWave', 'Wi-Fi 7 · Bluetooth 6.0', 'UWB · NFC · satellite messaging', 'USB-C 3.2 · 20 Gbps'] },
  { group: 'Software', items: ['NovaOS 1', '7 years of OS & security updates'] },
];

export const SETTINGS = {
  sectionGap: 0.35, // extra scroll (in screen heights) between sections — bigger = slower, longer page
  smoothness: 0.07, // scroll smoothing (lower = silkier / more glide)
  maxPixelRatio: 1.75, // lower = faster on weak laptops
  bloomStrength: 0.8, // glow intensity
};
