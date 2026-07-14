<p align="center">
  <!-- Square mark (not the wide wordmark) — keeps the B icon crisp on GitHub -->
  <img src="site/public/favicon.svg" alt="Blinn Motion" width="128" height="128" />
</p>

<h1 align="center">Blinn Motion</h1>

<p align="center">
  <strong>Figma Motion → real code.</strong><br />
  Your own document format. Your own runtime.<br />
  Lottie, but not Lottie.
</p>

<p align="center">
  <a href="https://blinnmotion.com">Website</a> ·
  <a href="https://docs.blinnmotion.com">Docs</a> ·
  <a href="https://blinnmotion.com">Live demo</a> ·
  <a href="packages/core/SCHEMA.md">MotionDoc schema</a>
</p>

<p align="center">
  <img alt="license" src="https://img.shields.io/badge/license-MIT-0E1116?style=flat-square" />
  <img alt="typescript" src="https://img.shields.io/badge/TypeScript-strict-2F6BFF?style=flat-square" />
  <img alt="runtime" src="https://img.shields.io/badge/runtime-pure%20JS-8B5CF6?style=flat-square" />
  <img alt="platforms" src="https://img.shields.io/badge/DOM%20·%20Canvas%20·%20React%20·%20RN-111827?style=flat-square" />
</p>

<p align="center">
  <img src="media/blinn-motion-pipeline.gif" alt="Figma Motion becomes code — card travels Figma → MotionDoc → your app" width="900" />
</p>

---

Figma’s Motion timeline is data — keyframes, easings, springs.  
**Blinn Motion** reads that data, turns it into a small open format (**MotionDoc**), and plays it with a **pure-JS render engine**. Same tree, same timing, every platform.

```
Figma Motion  →  MotionDoc JSON  →  sample(doc, t)  →  DOM · Canvas · React · React Native
```

No rasterized video. No After Effects detour. Designers ship motion; engineers ship the same file everywhere.

---

## Why Blinn Motion?

| | |
|--|--|
| **Own format** | `MotionDoc` is small, versioned, and yours — not locked to a black-box player. |
| **One render method** | `sample(doc, t)` is pure and DOM-free. Every adapter paints the *same* resolved tree. |
| **Real Figma Motion** | Keyframes, cubic-bezier, springs, gradients, borders, masks, path trim, shaders… |
| **Thin adapters** | DOM/CSS, Canvas 2D, React, React Native — pick the backend, keep the animation. |
| **Predictable playback** | Shared `Ticker`: play, pause, seek, loop, rate — identical across platforms. |

---

## Quick start

```bash
npm install @blinn-motion/dom
# or: @blinn-motion/canvas  @blinn-motion/react  @blinn-motion/react-native
```

### DOM

```ts
import { create } from "@blinn-motion/dom";

const player = create(document.getElementById("stage")!, doc, { loop: true });
player.play();
// player.pause() · seek(1.2) · seekFraction(0.5) · setRate(2)
```

### React

```tsx
import { BlinnMotion } from "@blinn-motion/react";

<BlinnMotion doc={doc} renderer="canvas" loop autoplay />
```

### Canvas

```ts
import { create } from "@blinn-motion/canvas";

create(document.querySelector("canvas")!, doc, { autoplay: true, dpr: 2 });
```

A MotionDoc is plain JSON. Export one from the **Figma plugin**, or start from [`fixtures/card.motion.json`](fixtures/card.motion.json).

---

## Platforms

| Package | Role |
|---------|------|
| [`@blinn-motion/core`](packages/core) | Render engine — `sample`, easing, interpolation, `Ticker` |
| [`@blinn-motion/dom`](packages/dom) | Full-fidelity DOM / CSS / SVG |
| [`@blinn-motion/canvas`](packages/canvas) | Pure 2D canvas |
| [`@blinn-motion/react`](packages/react) | `<BlinnMotion />` + `useBlinnMotion` |
| [`@blinn-motion/react-native`](packages/react-native) | `<BlinnMotionView />` |
| [`@blinn-motion/figma-plugin`](packages/figma-plugin) | Export MotionDoc + live preview |

---

## How it works

```
┌─────────────────┐     ┌──────────────┐     ┌────────────────────┐
│  Figma Motion   │────▶│  MotionDoc   │────▶│  sample(doc, t)    │
│  timelines      │     │  (JSON)      │     │  pure, DOM-free    │
└─────────────────┘     └──────────────┘     └─────────┬──────────┘
                                                       │
                         resolved RenderNode tree ─────┤
                                                       ▼
                              ┌────────┬────────┬────────┬──────────┐
                              │  DOM   │ Canvas │ React  │    RN    │
                              └────────┴────────┴────────┴──────────┘
```

The maths lives in **core**. Adapters only paint.  
Full format: [**MotionDoc schema**](packages/core/SCHEMA.md) · walkthrough: [**docs**](https://docs.blinnmotion.com).

---

## From Figma

1. Install the Blinn Motion plugin (import [`packages/figma-plugin/manifest.json`](packages/figma-plugin/manifest.json) in Figma → Plugins → Development).
2. Select a frame with a Motion timeline → run the plugin.
3. Preview live, inspect the MotionDoc, **Download .json**.
4. Drop that file into any adapter above.

---

## Links

| | |
|--|--|
| 🌐 Site | [blinnmotion.com](https://blinnmotion.com) |
| 📚 Docs | [docs.blinnmotion.com](https://docs.blinnmotion.com) |
| 🧪 Schema | [`packages/core/SCHEMA.md`](packages/core/SCHEMA.md) |
| 🎞 Fixture | [`fixtures/card.motion.json`](fixtures/card.motion.json) |

---

## Contributing

Issues and PRs welcome. Library packages live under `packages/*`; marketing site under `site/`; docs under `docs/`.

```bash
npm install
npm test
npm run build
```

---

## License

[MIT](LICENSE) © Blinn Motion
