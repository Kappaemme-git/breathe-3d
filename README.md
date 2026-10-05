# BREATHE

An interactive Three.js experience exploring what smoking leaves behind.

**[Explore BREATHE →](https://breathe-3d.vercel.app)**

Created by [@Kappaemme](https://x.com/Kappaemmedev) · [GitHub](https://github.com/Kappaemme-git)

## The experience

- An orbitable anatomical model with an animated smoking gesture and breathing.
- An illustrative four-puff cycle: smoke travels through the airways and the lungs progressively darken before the scene resets.
- An exploded cigarette with 2,244 rendered fragments of paper, tobacco and filter fibres.
- Annotated illustrations of airway inflammation, emphysema and reduced gas-exchange surface.
- An explanation of carbon monoxide, haemoglobin and oxygen transport.
- A light, responsive interface, focus mode and GLB export of the human model.

The main anatomy and cigarette scenes are real-time 3D, not videos. The magnified tissue and blood images are AI-generated educational illustrations.

## Run locally

No bundler or package installation is required. Three.js 0.180.0 and its addons are included locally.

```sh
python3 -m http.server 4186
```

Open http://localhost:4186. Use an HTTP server rather than opening `index.html` directly, because the scene loads JavaScript modules and binary geometry. The anatomy binary is approximately 47 MiB, so first load depends on connection speed.

## Verify the animation

With Node.js installed:

```sh
node verify-motion.mjs
```

This checks four-puff accumulation/reset, bone lengths, wrist and orientation continuity, cigarette contact and a conservative hand-to-torso collision envelope. It is not a full triangle-level collision test.

## Project structure

| File | Purpose |
| --- | --- |
| `index.html`, `style.css` | Campaign page and responsive interface |
| `main.js` | Human scene, smoke, controls and GLB export |
| `atlas-human.js`, `motion.js` | Anatomical mesh and gesture animation |
| `anatomy.js` | Pulmonary detail and illustrative damage |
| `cigarette.js` | Exploded cigarette scene |
| `education.js` | Expandable educational comparisons |
| `assets/bodyparts/` | Anatomical geometry and attribution |
| `assets/education/` | Educational images and provenance |
| `vendor/` | Three.js and addons |

## Deploy to Vercel

Deploy as a static site with no framework or build step:

```sh
npx vercel
npx vercel --prod
```

The included `vercel.json` configures static delivery. `.vercel/` is local project linkage and is intentionally not committed.

## Educational limits

Colours, smoke particles, timing and the four-puff reset are symbolic. Four puffs do not cause the chronic structural changes shown, and a visual reset does not represent recovery. This is an educational illustration, not a clinical measurement or diagnostic tool. References from the CDC, NHLBI and FDA are linked alongside the relevant explanations.

The exported human GLB includes geometry and gesture animation. Viewer-specific transparency, pulmonary darkening and some particle effects are not preserved in the export. The exploded cigarette is a separate scene.

## Credits and third-party licensing

- **BodyParts3D**, © The Database Center for Life Science, CC BY 4.0. The upper-body subset is adapted from geometry distributed by [Human Atlas](https://github.com/ashemag/human-atlas). See [full anatomy attribution](assets/bodyparts/ATTRIBUTION.md) for the source, transformations and licensing. The smoking rig and visual effects are custom additions.
- **Three.js**, MIT. See [the included license](vendor/LICENSE-three.txt).
- **Educational illustrations**: AI-generated for this project. See [image provenance](assets/education/README.md).
- **Fonts**: Barlow Condensed and DM Sans served through Google Fonts, with system fallbacks.

Third-party licenses apply to their respective materials.
