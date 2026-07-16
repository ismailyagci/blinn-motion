# @blinn-motion/canvas

[![npm](https://img.shields.io/npm/v/@blinn-motion/canvas.svg)](https://www.npmjs.com/package/@blinn-motion/canvas)
[![license](https://img.shields.io/npm/l/@blinn-motion/canvas.svg)](https://github.com/ismailyagci/blinn-motion/blob/main/LICENSE)

**Pure-JS 2D Canvas adapter for [Blinn Motion](https://blinnmotion.com).**

Each frame samples a MotionDoc with [`@blinn-motion/core`](https://www.npmjs.com/package/@blinn-motion/core) and repaints an HTML canvas. Same render method as the DOM adapter — same timing, different paint path. Ideal for single-layer stages, export pipelines, or when you want one bitmap surface.

## Install

```bash
npm install @blinn-motion/canvas
# pulls in @blinn-motion/core
```

## Quick start

```ts
import { create } from "@blinn-motion/canvas";
import doc from "./card.motion.json";

// Pass a <canvas> or a container (a canvas is created for you)
const player = create(document.getElementById("stage")!, doc, {
  loop: true,
  autoplay: true,
  onframe: (time, fraction) => {},
});

player.pause();
player.seekFraction(0.5);
player.setProgress(0.3);
player.play();
```

```html
<div id="stage" style="width:375px;height:600px"></div>
<!-- or: <canvas id="stage" width="375" height="600"></canvas> -->
```

## What it paints

- Transforms, opacity, nested layers  
- Solid / linear / radial / angular (diamond ≈ radial) / image fills  
- Rounded rects, ellipses, polygons, stars, arcs  
- Text, vector paths with trim  
- Uniform + per-side strokes, blend modes  
- Drop / inner shadows  
- Noise / texture + glass-style overlays  
- Clipping and nested opacity  

For maximum CSS/SVG fidelity (masks, complex filters, live DOM text selection), prefer [`@blinn-motion/dom`](https://www.npmjs.com/package/@blinn-motion/dom). Side-by-side: [vanilla lab](https://vanilla.blinnmotion.com).

## API

### `create(target, doc, options?) → CanvasPlayer`

`target` is `HTMLCanvasElement | HTMLElement`.

| Option | Default | Description |
|--------|---------|-------------|
| `loop` | `true` | Loop timeline |
| `rate` | `1` | Speed multiplier |
| `autoplay` | `false` | Start immediately (wrappers often pass `true`) |
| `onframe` | — | `(time, fraction) => void` |
| `dpr` | `devicePixelRatio` | Canvas backing store scale |

### `CanvasPlayer`

Same transport surface as the DOM player:

`play` · `pause` · `stop` · `toggle` · `seek` · `seekFraction` · `setProgress` · `setRate`

### Low-level exports

```ts
import { drawTree } from "@blinn-motion/canvas";
import { sample } from "@blinn-motion/core";

const tree = sample(doc, t);
drawTree(ctx, tree); // custom loops / offscreen export
```

Also: `flattenPath`, `slicePolyline`, `trimmedPath2D` for path tooling.

## Docs

- [Canvas adapter](https://docs.blinnmotion.com/adapters/canvas)
- [Render engine](https://docs.blinnmotion.com/concepts/render-engine)
- [Live dual-stage lab](https://vanilla.blinnmotion.com)

## License

MIT © Blinn Motion
