# Fottie

> Think **Lottie, but not Lottie** — our own document format and our own runtime, fed
> directly from Figma's new Motion timeline.

Fottie exports a **Figma Motion** animation as JSON (not an image), converts it into a
small **own** format (`MotionDoc`), and plays it with a **pure-JS render engine** that
has adapters for the **DOM**, **Canvas**, **React** and **React Native**.

The render engine is the core. Every adapter paints the *same* resolved render tree, so
an animation looks and times identically across platforms.

```
Figma Motion (node.animations / node.timelines)
        │  read keyframes, easing, springs — raw data, no rasterization
        ▼
   @fottie/figma-plugin  ──►  MotionDoc JSON   (our format, packages/core/SCHEMA.md)
        │  sample(doc, t)  — THE render method (pure, DOM-free)
        ▼
   @fottie/core  ──►  resolved RenderNode tree
        │
        ├─► @fottie/dom            (nested divs + CSS, SVG paths, masks, shaders)
        ├─► @fottie/canvas         (2D canvas)
        ├─► @fottie/react          (<Fottie doc renderer="dom|canvas" />)
        └─► @fottie/react-native   (native <View>/<Text>)
```

## Monorepo layout

```
packages/
  core/            @fottie/core           pure render engine — sample(doc,t), easing,
                                          interpolation, color, shapes, Ticker
  dom/             @fottie/dom            DOM/CSS adapter (full fidelity)
  canvas/          @fottie/canvas         pure-JS 2D canvas adapter
  react/           @fottie/react          React component + hook
  react-native/    @fottie/react-native   React Native adapter
  figma-plugin/    @fottie/figma-plugin   the Figma plugin (exports MotionDoc, previews
                                          with the inlined @fottie/dom bundle)

examples/
  vanilla/         DOM + Canvas side by side (Vite)
  react/           <Fottie/> with both backends (Vite + React)
  react-native/    Expo app using <FottieView/>

fixtures/
  card.motion.json shared hand-authored MotionDoc used by tests + every example
```

## The architecture in one paragraph

`@fottie/core` is time-based (seconds) and DOM-free. `sample(doc, t)` walks the document,
samples every track at time `t` (easing: `linear` / `hold` / `cubicBezier` solved with
Newton-Raphson + bisection / `spring` damped approximation), composes stacked tracks per
property over the base value, and returns a **resolved render tree** — every transform,
color (RGBA) and shape vertex is a final number. The adapters are thin: each one walks
that tree and paints it for its backend. The maths is unit-tested; only the adapters
touch a platform. The playback clock (`Ticker`) is shared too, so play/pause/seek/loop
behave the same everywhere.

See **`packages/core/SCHEMA.md`** for the MotionDoc format and the full Figma → MotionDoc
mapping.

## Develop

```bash
npm install          # one install for the whole workspace
npm run build        # build every library package (tsup → ESM + CJS + d.ts)
npm test             # vitest across all packages
npm run typecheck    # tsc --noEmit per package
```

### Run an example

```bash
npm run dev -w @fottie/example-vanilla   # http://localhost:5173  (DOM + Canvas)
npm run dev -w @fottie/example-react     # http://localhost:5174  (React)
# react-native: see examples/react-native/README.md (Expo)
```

### Build & use the Figma plugin

```bash
npm run build -w @fottie/dom             # produces the inlined browser bundle
npm run build -w @fottie/figma-plugin    # tsc → dist/code.js, inline → ui.html
```

Then in Figma → Plugins → Development → **Import plugin from manifest…** → pick
`packages/figma-plugin/manifest.json`. Select an animated frame (one with a Motion
timeline) and run the plugin: the left pane previews it with `@fottie/dom`, the right
pane shows the **MotionDoc** and the raw Figma JSON. Hit **Download .json** — the file
plays anywhere with any Fottie adapter.

## Use it in code

```ts
import { create } from "@fottie/dom";      // or @fottie/canvas
const player = create(document.getElementById("stage")!, doc, { loop: true });
player.play();                              // pause(), seek(s), seekFraction(0..1), toggle()
```

```tsx
import { Fottie } from "@fottie/react";
<Fottie doc={doc} renderer="canvas" loop autoplay />
```

## License

MIT
