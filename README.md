# NovaEdge X1 — Interactive 3D Presentation

A cinematic, scroll-driven product presentation for the **NovaEdge X1** smartphone.
The phone is built entirely in code (Three.js) from separate components, so it can rotate,
break apart into its parts, glow, and be explored by hovering or clicking.

**Power Your Ambition, Connect Your Future.**

## The flow (9 slides)

| # | Slide | What happens |
|---|-------|--------------|
| 1 | Introduction | The phone rises into view |
| 2 | 360° Design | Full rotation showing the front, edges and the triple camera |
| 3 | Exploded View | The phone breaks apart into labelled, clickable components |
| 4 | Processor | Zoom in, blue energy and circuit pulses, multitasking graphic |
| 5 | Camera | Lenses turn, camera flash, sample photos fly in |
| 6 | Battery | Charge glow sweeps up the battery and the battery icon fills |
| 7 | Storage | Files, photos, videos and documents orbit the storage chip |
| 8 | Reassembly | Parts snap back together, plus another 360° |
| 9 | Final | Phone comes to center with a glowing halo: **NOVAEDGE X1** |

## Presenting live

| Key | Action |
|-----|--------|
| `→` `↓` `Space` `Page Down` | Next slide (presentation clickers work too) |
| `←` `↑` `Page Up` | Previous slide |
| `Home` / `End` | First / last slide |
| `F` | Fullscreen |
| `Esc` | Close the info panel |
| Mouse wheel / trackpad | Free scroll; it glides to the nearest slide when you stop |
| Hover a part | It glows and shows its name |
| Click / tap a part | Opens the info panel for that component |

The dots on the right jump to any slide. The site also works on phones: the layout switches
to the phone on top and the text at the bottom.

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

- `PALETTE`: the 60/30/10 colors (navy / cyan / amber)
- `PARTS`: each component's name, description, highlight bullets and
  - `explode`: how far it flies out when the phone breaks apart `[x, y, z]`
  - `delay`: the order parts move in (0 = first, 1 = last)
  - `labelDir` / `labelAnchor`: where its floating label sits
- `EXPLODED_POSE`: the angle of the phone while broken apart
- `SLIDES`: slide names and how long each transition takes
- `SETTINGS`: snapping, glow strength, quality

Slide text lives in `index.html`. The 3D model is in `src/phone.js`, the effects in `src/effects.js`,
the lighting and background in `src/scene.js`, and the scroll timeline in `src/main.js`.

## Tech

[Vite](https://vitejs.dev) · [Three.js](https://threejs.org) (3D, bloom, reflections) ·
[GSAP + ScrollTrigger + SplitText](https://gsap.com) (animation) · [Lenis](https://lenis.darkroom.engineering) (smooth scroll)

> Note: no numerical specifications are stated anywhere in the presentation. The sample photos are illustrative.
