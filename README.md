# NovaEdge X1 — Interactive 3D Presentation

A cinematic, scroll-driven product presentation for the **NovaEdge X1** smartphone.
The phone is built entirely in code (Three.js) from separate components, so it can rotate,
break apart into its parts, glow, and be explored by hovering or clicking.

**Power Your Ambition, Connect Your Future.**

## The flow

One long, continuous page: as you scroll, the text glides by and the phone animates with it.

| Section | What happens |
|---------|--------------|
| Introduction | The phone rises into view |
| Design | Full 360° rotation: front, slim edges, titanium frame, triple camera |
| Inside | The phone breaks apart into labelled components |
| Processor | Camera moves in; blue energy and circuit pulses; multitasking graphic |
| Camera | Lenses turn, the flash fires, real sample photos slide in |
| Battery | A charge glow sweeps up the battery; the battery icon fills |
| Storage | Files, photos, videos and documents orbit the storage chip |
| Reassembly | Parts come back together, plus another 360° |
| Colors | Pick one of four finishes; the phone re-colors live |
| Tech specs | The full spec sheet |
| Final | Phone comes to center with a glowing halo: **NOVAEDGE X1**, plus a pre-order CTA |

## Interacting

- **Scroll** (mouse wheel, trackpad or swipe) to move through the page. It's free and smooth, with no snapping.
- **Hover** a part and it glows and shows its name.
- **Tap / click** a part (or a label / button) and the camera flies in on it, with a panel explaining
  **what it is**, its **specs** and what it does. Then **drag to orbit** around it and **scroll / pinch to zoom**.
  *Previous / Next* fly between parts; ✕ or `Esc` zooms back out.
- **Drag** the phone (desktop) to spin it; it eases back when you let go.
- Presenting with a keyboard or clicker? `→` / `Space` / `Page Down` glide to the next section,
  `←` / `Page Up` go back, `F` toggles fullscreen. These are optional; nothing on screen shows slide numbers.

Live site: https://nablejames31-beep.github.io/NovaEdge-x1/

## Run it on your laptop

1. Install **Node.js** (LTS) from https://nodejs.org
2. Open a terminal in this folder and run:

```bash
npm install
```

```bash
npm run dev
```

3. Open the address it prints (usually http://localhost:5173) in **Chrome or Edge**, press `F` for fullscreen and present.

Fonts and textures are bundled, so after `npm install` it needs **no internet**.

To make a production build (faster, smaller): `npm run build`, then `npm run preview`.

## Customizing

Almost everything is in **`src/config.js`**:

- `PALETTE`: the 60/30/10 colors (graphite black / pearl silver / electric cyan)
- `FINISHES`: the four color variants (back glass, frame and camera-block colors)
- `TECH_SPECS`, `PRICE` and each part's `specs`: all spec text (fictional concept specs)
- `PARTS`: each component's name, description, highlight bullets and
  - `explode`: how far it flies out when the phone breaks apart `[x, y, z]`
  - `delay`: the order parts move in (0 = first, 1 = last)
  - `labelDir` / `labelAnchor`: where its floating label sits
  - `definition`: the plain-language "what it is" text shown when tapped
  - `inspect`: where the camera flies to when the part is tapped (`dist` = how close)
- `EXPLODED_POSE`: the angle of the phone while broken apart
- `SLIDES`: section names and keyboard glide durations
- `SETTINGS`: `sectionGap` (page length / scroll speed), `smoothness`, glow strength, quality

Slide text lives in `index.html`. The 3D model is in `src/phone.js`, the effects in `src/effects.js`,
the lighting and background in `src/scene.js`, and the scroll timeline in `src/main.js`.

## Design skills installed (in `.claude/skills/`)

UI UX Pro Max, design-taste (and its genre packs), Better Design (needs its MCP server connected) and Superdesign
(needs a Superdesign account login). Claude Code loads them automatically in future sessions.

## Tech

[Vite](https://vitejs.dev) · [Three.js](https://threejs.org) (3D, bloom, reflections) ·
[GSAP + ScrollTrigger + SplitText](https://gsap.com) (animation) · [Lenis](https://lenis.darkroom.engineering) (smooth scroll) ·
[Paper Shaders](https://github.com/paper-design/shaders) (animated mesh-gradient backdrop) · Inter (type)

> Product and specifications are a fictional concept. Sample photos by Alexey Topolyanskiy, Roksolana Zasiadko and
> Vashishtha Jogi (Unsplash license, via picsum.photos).
