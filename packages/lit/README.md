# @blinn-motion/lit

[![npm](https://img.shields.io/npm/v/@blinn-motion/lit.svg)](https://www.npmjs.com/package/@blinn-motion/lit)
[![license](https://img.shields.io/npm/l/@blinn-motion/lit.svg)](https://github.com/ismailyagci/blinn-motion/blob/main/LICENSE)

**Lit / Web Component adapter for [Blinn Motion](https://blinnmotion.com)** — drop `<blinn-motion>` into any stack that supports custom elements (Lit, plain HTML, Astro islands, Vue/React wrappers, CMS templates).

Same MotionDoc engine as DOM, React, Vue, and friends.

## Install

```bash
npm install @blinn-motion/lit
# peer: lit (for the element class; auto-registers on import)
```

## Quick start

```ts
import "@blinn-motion/lit"; // registers <blinn-motion>
import doc from "./card.motion.json";

const el = document.querySelector("blinn-motion")!;
el.doc = doc;
el.renderer = "dom";
el.loop = true;
el.autoplay = true;
```

```html
<script type="module">
  import "@blinn-motion/lit";
  import doc from "./card.motion.json";
  const el = document.querySelector("blinn-motion");
  el.doc = doc;
</script>

<blinn-motion style="width:375px;height:600px;display:block"></blinn-motion>
```

## Live demo

[lit.blinnmotion.com](https://lit.blinnmotion.com) · islands: [astro.blinnmotion.com](https://astro.blinnmotion.com)

## Properties

Complex values are **properties**, not attributes:

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `doc` | `MotionDoc \| null` | `null` | Motion document (`el.doc = …`) |
| `renderer` | `"dom" \| "canvas"` | `"dom"` | Backend |
| `loop` | `boolean` | `true` | Loop |
| `autoplay` | `boolean` | `true` | Play when mounted |
| `rate` | `number` | `1` | Speed |
| `progress` | `number \| undefined` | — | Controlled `0…1` |

## Events

```ts
el.addEventListener("frame", (e: CustomEvent) => {
  const { time, fraction } = e.detail;
});
```

## Imperative methods

```ts
el.play();
el.pause();
el.stop();
el.toggle();
el.seek(0.5);
el.seekFraction(0.25);
el.setProgress(0.1);
el.setRate(1.5);
```

## Controlled progress

```ts
el.progress = 0.4; // holds frame; autoplay off while set
el.progress = undefined; // back to clock-driven (remount rules apply)
```

## Explicit registration

```ts
import { defineBlinnMotionElement, BlinnMotionElement } from "@blinn-motion/lit";

defineBlinnMotionElement(); // customElements.define("blinn-motion", …)
// or extend BlinnMotionElement in your own tag
```

## `attachBlinnMotion`

```ts
import { attachBlinnMotion } from "@blinn-motion/lit";

const attached = attachBlinnMotion(host, { doc, renderer: "canvas" });
attached.dispose();
```

## Docs

- [Lit adapter](https://docs.blinnmotion.com/adapters/lit)
- [Playback](https://docs.blinnmotion.com/guides/playback)
- [GitHub](https://github.com/ismailyagci/blinn-motion)

## License

MIT © Blinn Motion
