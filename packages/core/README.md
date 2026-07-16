# @blinn-motion/core

[![npm](https://img.shields.io/npm/v/@blinn-motion/core.svg)](https://www.npmjs.com/package/@blinn-motion/core)
[![license](https://img.shields.io/npm/l/@blinn-motion/core.svg)](https://github.com/ismailyagci/blinn-motion/blob/main/LICENSE)

**Pure, DOM-free render engine for [Blinn Motion](https://blinnmotion.com).**

Given a **MotionDoc** (portable JSON from Figma Motion) and a time `t`, `sample(doc, t)` returns a backend-agnostic tree of final numbers — transforms, fills, effects, text. Every adapter (DOM, Canvas, React, Vue, …) paints that *same* tree, so motion times identically across platforms.

```
Figma Motion  →  MotionDoc JSON  →  sample(doc, t)  →  adapters paint
```

## Install

```bash
npm install @blinn-motion/core
```

Zero runtime dependencies. Works in browsers, Node, React Native, workers — anywhere JS runs.

## Quick start

```ts
import { sample, Ticker, type MotionDoc } from "@blinn-motion/core";
import doc from "./card.motion.json";

// Resolve one frame
const tree = sample(doc as MotionDoc, 0.4); // seconds
console.log(tree.root); // resolved RenderNode tree

// Or drive a clock
const ticker = new Ticker({ duration: doc.duration, loop: true });
ticker.onframe = (time, fraction) => {
  const frame = sample(doc as MotionDoc, time);
  // hand `frame` to your painter
};
ticker.play();
```

You usually **do not** paint with core alone — pick an adapter (`@blinn-motion/dom`, `@blinn-motion/react`, …). Core is for custom renderers, tooling, tests, and understanding the engine.

## API surface

| Export | Role |
|--------|------|
| `sample(doc, t)` | Resolve the full document at time `t` (seconds) |
| `walk(node, fn)` / `findNode(tree, id)` | Traverse / look up resolved nodes |
| `computeLayer(layer, t)` | Resolve a single layer’s animated state |
| `Ticker` | Playback clock (`play` / `pause` / `seek` / `setProgress` / rate) |
| `makeEasing` · `cubicBezier` · `springFn` | Easing functions |
| `parseColor` · `lerpRgba` · … | Color helpers |
| `evalTrack` · `interpKeys` · `applyOp` | Keyframe interpolation |
| `resolvePaint` · `resolveStroke` · `resolveEffects` | Paint resolution |
| `polygonVertices` · `starVertices` · … | Shape helpers |
| `progressToTime` · `scrollProgress` · … | Progress / scroll utilities |
| `VERSION` | Package version string |

Types (`MotionDoc`, `Layer`, `RenderTree`, …) are exported from the same entry.

### Ticker (playback)

```ts
const ticker = new Ticker({
  duration: 2,   // seconds
  loop: true,
  rate: 1,
  autoplay: false,
});

ticker.onframe = (time, fraction) => { /* 0…duration, 0…1 */ };
ticker.play();
ticker.pause();
ticker.seek(0.5);           // absolute seconds
ticker.seekFraction(0.25);  // 0…1
ticker.setProgress(0.5);    // same as seekFraction; for scroll/gesture
ticker.setRate(1.5);
```

### Controlled progress

`setProgress(0…1)` freezes clock-driven play and holds a specific frame — ideal for scroll-linked or scrubber-driven UIs. Adapters expose this as `progress` / `setProgress`.

## MotionDoc

A MotionDoc is plain JSON:

```jsonc
{
  "format": "motion-engine",
  "version": "1.0",
  "duration": 1.2,
  "fps": 60,
  "stage": { "width": 375, "height": 600, "background": "#0E1116FF" },
  "layers": [ /* … */ ]
}
```

- Schema notes: [`SCHEMA.md`](./SCHEMA.md)
- Full reference: [docs — MotionDoc](https://docs.blinnmotion.com/concepts/motiondoc)
- Export from Figma with the [Blinn Motion plugin](https://docs.blinnmotion.com/guides/figma-plugin)

## Related packages

| Package | Role |
|---------|------|
| [`@blinn-motion/dom`](https://www.npmjs.com/package/@blinn-motion/dom) | Full-fidelity CSS / SVG painter |
| [`@blinn-motion/canvas`](https://www.npmjs.com/package/@blinn-motion/canvas) | Pure-JS 2D canvas painter |
| [`@blinn-motion/react`](https://www.npmjs.com/package/@blinn-motion/react) | React component + hooks |
| [`@blinn-motion/vue`](https://www.npmjs.com/package/@blinn-motion/vue) | Vue 3 component + composable |
| [`@blinn-motion/svelte`](https://www.npmjs.com/package/@blinn-motion/svelte) | Svelte action |
| [`@blinn-motion/angular`](https://www.npmjs.com/package/@blinn-motion/angular) | Angular standalone component |
| [`@blinn-motion/lit`](https://www.npmjs.com/package/@blinn-motion/lit) | `<blinn-motion>` custom element |
| [`@blinn-motion/react-native`](https://www.npmjs.com/package/@blinn-motion/react-native) | React Native / Expo |

## Links

- [Documentation](https://docs.blinnmotion.com)
- [Core API reference](https://docs.blinnmotion.com/reference/core-api)
- [Landing](https://blinnmotion.com) · [GitHub](https://github.com/ismailyagci/blinn-motion)

## License

MIT © Blinn Motion
