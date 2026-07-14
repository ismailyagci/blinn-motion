# Blinn Motion

> Think **Lottie, but not Lottie** — our own document format and our own runtime, fed
> directly from Figma's new Motion timeline.

Blinn Motion exports a **Figma Motion** animation as JSON (not an image), converts it into a
small **own** format (`MotionDoc`), and plays it with a **pure-JS render engine** that
has adapters for the **DOM**, **Canvas**, **React** and **React Native**.

The render engine is the core. Every adapter paints the *same* resolved render tree, so
an animation looks and times identically across platforms.

```
Figma Motion (node.animations / node.timelines)
        │  read keyframes, easing, springs — raw data, no rasterization
        ▼
   @blinn-motion/figma-plugin  ──►  MotionDoc JSON   (our format, packages/core/SCHEMA.md)
        │  sample(doc, t)  — THE render method (pure, DOM-free)
        ▼
   @blinn-motion/core  ──►  resolved RenderNode tree
        │
        ├─► @blinn-motion/dom            (nested divs + CSS, SVG paths, masks, shaders)
        ├─► @blinn-motion/canvas         (2D canvas)
        ├─► @blinn-motion/react          (<BlinnMotion doc renderer="dom|canvas" />)
        └─► @blinn-motion/react-native   (native <View>/<Text>)
```

## Monorepo layout

```
packages/
  core/            @blinn-motion/core           pure render engine — sample(doc,t), easing,
                                          interpolation, color, shapes, Ticker
  dom/             @blinn-motion/dom            DOM/CSS adapter (full fidelity)
  canvas/          @blinn-motion/canvas         pure-JS 2D canvas adapter
  react/           @blinn-motion/react          React component + hook
  react-native/    @blinn-motion/react-native   React Native adapter
  figma-plugin/    @blinn-motion/figma-plugin   the Figma plugin (exports MotionDoc, previews
                                          with the inlined @blinn-motion/dom bundle)

examples/
  vanilla/         DOM + Canvas side by side (Vite)
  react/           <BlinnMotion/> with both backends (Vite + React)
  react-native/    Expo app using <BlinnMotionView/>

fixtures/
  card.motion.json shared hand-authored MotionDoc used by tests + every example
```

## The architecture in one paragraph

`@blinn-motion/core` is time-based (seconds) and DOM-free. `sample(doc, t)` walks the document,
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
npm install          # one install for the whole workspace (+ sets up husky git hooks)
npm run build        # build every library package (tsup → ESM + CJS + d.ts)
npm test             # vitest across all packages
npm run test:coverage
npm run typecheck    # tsc --noEmit per package
```

### Git hooks (husky)

On `npm install`, husky installs a **pre-commit** hook that runs `npm test` and
`npm run typecheck`. Commits are blocked if either fails. To skip in an emergency:

```bash
git commit --no-verify
```

### Deploy (GitHub Actions + Cloudflare)

| Site | URL | Host | Workflow |
|------|-----|------|----------|
| Landing | https://blinnmotion.com | Cloudflare Pages | `.github/workflows/deploy-site.yml` |
| Docs | https://docs.blinnmotion.com | Mintlify (+ CF DNS) | `.github/workflows/deploy-docs.yml` + Mintlify GitHub App |

**Landing (priority)** — set these repo secrets, then push to `main` or run the workflow manually:

1. `CLOUDFLARE_API_TOKEN` — token with **Account → Cloudflare Pages → Edit**
2. `CLOUDFLARE_ACCOUNT_ID` — Cloudflare account id

Full steps (Pages project, custom domain, DNS): see [`site/DEPLOY.md`](site/DEPLOY.md).

**Docs** — connect the repo in [Mintlify](https://mintlify.com/start) with docs path `docs/`, then CNAME `docs` → Mintlify’s target in Cloudflare DNS. Details: [`docs/DEPLOY.md`](docs/DEPLOY.md).

CI (tests + typecheck) runs on every PR/push via `.github/workflows/ci.yml`.

### Run an example

```bash
npm run dev -w @blinn-motion/example-vanilla   # http://localhost:5173  (DOM + Canvas)
npm run dev -w @blinn-motion/example-react     # http://localhost:5174  (React)
# react-native: see examples/react-native/README.md (Expo)
```

### Build & use the Figma plugin

```bash
npm run build -w @blinn-motion/dom             # produces the inlined browser bundle
npm run build -w @blinn-motion/figma-plugin    # tsc → dist/code.js, inline → ui.html
```

Then in Figma → Plugins → Development → **Import plugin from manifest…** → pick
`packages/figma-plugin/manifest.json`. Select an animated frame (one with a Motion
timeline) and run the plugin: the left pane previews it with `@blinn-motion/dom`, the right
pane shows the **MotionDoc** and the raw Figma JSON. Hit **Download .json** — the file
plays anywhere with any Blinn Motion adapter.

## Use it in code

```ts
import { create } from "@blinn-motion/dom";      // or @blinn-motion/canvas
const player = create(document.getElementById("stage")!, doc, { loop: true });
player.play();                              // pause(), seek(s), seekFraction(0..1), toggle()
```

```tsx
import { BlinnMotion } from "@blinn-motion/react";
<BlinnMotion doc={doc} renderer="canvas" loop autoplay />
```

## License

MIT
