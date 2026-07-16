# @blinn-motion/dom

[![npm](https://img.shields.io/npm/v/@blinn-motion/dom.svg)](https://www.npmjs.com/package/@blinn-motion/dom)
[![license](https://img.shields.io/npm/l/@blinn-motion/dom.svg)](https://github.com/ismailyagci/blinn-motion/blob/main/LICENSE)

**Full-fidelity DOM / CSS / SVG adapter for [Blinn Motion](https://blinnmotion.com).**

Builds nested absolutely positioned layers and, each frame, samples the MotionDoc with [`@blinn-motion/core`](https://www.npmjs.com/package/@blinn-motion/core) then writes CSS transforms, paints, masks, and SVG paths. Same render method as Canvas and every framework adapter — identical timing.

## Install

```bash
npm install @blinn-motion/dom
# pulls in @blinn-motion/core
```

Browser-only (needs `HTMLElement` / CSSOM). For a pure canvas path, use [`@blinn-motion/canvas`](https://www.npmjs.com/package/@blinn-motion/canvas).

## Quick start

```ts
import { create } from "@blinn-motion/dom";
import doc from "./card.motion.json";

const stage = document.getElementById("stage")!;
const player = create(stage, doc, {
  loop: true,
  autoplay: true,
  rate: 1,
  onframe: (time, fraction) => {
    // live scrubber / debug
  },
});

player.pause();
player.seek(0.8);
player.seekFraction(0.5);
player.setProgress(0.25); // 0…1 — scroll / gesture driven
player.setRate(1.5);
player.play();
```

```html
<div id="stage" style="position:relative;width:375px;height:600px"></div>
```

## What it paints

- Transforms (translate, rotate, scale) with layer anchors  
- Solid / linear / radial / angular / diamond fills + animated gradient stops  
- Strokes (uniform + per-side), blend modes, opacity  
- Text layers, images  
- Vector **paths** with PATH_TRIM (stroke reveal)  
- Polygon / star / arc via `clip-path`  
- Masks, drop/inner shadows, blur, glass/backdrop filters  
- Nested layer trees (parent transforms compose like the DOM)

## API

### `create(container, doc, options?) → DomPlayer`

| Option | Default | Description |
|--------|---------|-------------|
| `loop` | `true` | Loop when the timeline ends |
| `rate` | `1` | Playback speed multiplier |
| `autoplay` | `false` | Start the ticker immediately (`true` in most framework wrappers) |
| `onframe` | — | `(time, fraction) => void` each frame |

### `DomPlayer`

| Method | Description |
|--------|-------------|
| `play()` / `pause()` / `stop()` / `toggle()` | Transport |
| `seek(time)` | Seek to absolute seconds |
| `seekFraction(f)` | Seek with `f ∈ [0, 1]` |
| `setProgress(p)` | Controlled 0…1 (pauses clock drive) |
| `setRate(rate)` | Speed multiplier |
| *(host cleanup)* | Call `pause()` and clear the container when unmounting |

Also exported: `paintToCss`, `effectsToCss`, `colorCss`, `shapeClipCss` for custom tooling.

## Live demo

[vanilla.blinnmotion.com](https://vanilla.blinnmotion.com) — dual DOM + Canvas lab.

## Framework wrappers

Prefer a component when you use a UI framework:

| Stack | Package |
|-------|---------|
| React | [`@blinn-motion/react`](https://www.npmjs.com/package/@blinn-motion/react) |
| Vue | [`@blinn-motion/vue`](https://www.npmjs.com/package/@blinn-motion/vue) |
| Svelte | [`@blinn-motion/svelte`](https://www.npmjs.com/package/@blinn-motion/svelte) |
| Angular | [`@blinn-motion/angular`](https://www.npmjs.com/package/@blinn-motion/angular) |
| Lit | [`@blinn-motion/lit`](https://www.npmjs.com/package/@blinn-motion/lit) |

All of them call this adapter (or Canvas) under the hood.

## Docs

- [DOM adapter guide](https://docs.blinnmotion.com/adapters/dom)
- [Playback](https://docs.blinnmotion.com/guides/playback)
- [MotionDoc format](https://docs.blinnmotion.com/concepts/motiondoc)

## License

MIT © Blinn Motion
