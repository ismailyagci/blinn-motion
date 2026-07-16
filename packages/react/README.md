# @blinn-motion/react

[![npm](https://img.shields.io/npm/v/@blinn-motion/react.svg)](https://www.npmjs.com/package/@blinn-motion/react)
[![license](https://img.shields.io/npm/l/@blinn-motion/react.svg)](https://github.com/ismailyagci/blinn-motion/blob/main/LICENSE)

**React adapter for [Blinn Motion](https://blinnmotion.com)** — play a MotionDoc with a single component, switch DOM ↔ Canvas, scrub from scroll or a ref.

Built on [`@blinn-motion/core`](https://www.npmjs.com/package/@blinn-motion/core) + [`dom`](https://www.npmjs.com/package/@blinn-motion/dom) / [`canvas`](https://www.npmjs.com/package/@blinn-motion/canvas). Same render method as every other adapter.

## Install

```bash
npm install @blinn-motion/react
# peer: react >= 17
```

## Quick start

```tsx
import { BlinnMotion } from "@blinn-motion/react";
import doc from "./card.motion.json";

export function Hero() {
  return (
    <BlinnMotion
      doc={doc}
      renderer="dom"   // or "canvas"
      loop
      autoplay
      style={{ width: 375, height: 600 }}
    />
  );
}
```

## Live demo

**[react.blinnmotion.com](https://react.blinnmotion.com)** — flagship dual-stage lab (DOM + Canvas, transport, scrub, progress mode).

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `doc` | `MotionDoc` | required | Motion document (JSON) |
| `renderer` | `"dom" \| "canvas"` | `"dom"` | Paint backend |
| `loop` | `boolean` | `true` | Loop timeline |
| `autoplay` | `boolean` | `true` | Play on mount (off when `progress` is set) |
| `rate` | `number` | `1` | Playback speed |
| `progress` | `number` | — | Controlled `0…1` (scroll / gesture / scrubber) |
| `onFrame` | `(time, fraction) => void` | — | Per-frame callback |
| `className` / `style` | | | Host `<div>` styling |

## Imperative handle

```tsx
import { useRef } from "react";
import { BlinnMotion, type BlinnMotionHandle } from "@blinn-motion/react";

function Demo() {
  const ref = useRef<BlinnMotionHandle>(null);

  return (
    <>
      <BlinnMotion ref={ref} doc={doc} autoplay={false} />
      <button onClick={() => ref.current?.play()}>Play</button>
      <button onClick={() => ref.current?.seekFraction(0.5)}>Mid</button>
      <button onClick={() => ref.current?.setProgress(0.2)}>Progress</button>
    </>
  );
}
```

`BlinnMotionHandle`: `play` · `pause` · `stop` · `toggle` · `seek` · `seekFraction` · `setProgress` · `setRate` · `player`

## Controlled progress (scroll / gesture)

```tsx
function ScrollStory({ progress }: { progress: number }) {
  // map scroll / drag / spring into 0…1 yourself
  return <BlinnMotion doc={doc} progress={progress} />;
}
```

When `progress` is set, autoplay is forced off and the player holds that frame.

### `useMotionProgress` — sample without a player

Resolve a MotionDoc at a 0…1 value (no RAF). Useful if you paint the tree yourself:

```tsx
import { useMotionProgress } from "@blinn-motion/react";

const tree = useMotionProgress(doc, scrollP);
// tree is a RenderTree from @blinn-motion/core
```

## Hook: `useBlinnMotion`

Mount on your own host element:

```tsx
import { useRef } from "react";
import { useBlinnMotion } from "@blinn-motion/react";

function Custom() {
  const host = useRef<HTMLDivElement>(null);
  const { controls } = useBlinnMotion(host, doc, {
    renderer: "canvas",
    autoplay: true,
  });

  return <div ref={host} style={{ width: 400, height: 300 }} />;
}
```

## Next.js / SSR

Use a **client** component (`"use client"`). Motion never runs on the server.

```tsx
// app/hero.tsx
"use client";
import { BlinnMotion } from "@blinn-motion/react";
import doc from "./card.motion.json";

export function Hero() {
  return <BlinnMotion doc={doc} />;
}
```

Static export example: [next.blinnmotion.com](https://next.blinnmotion.com)

## Docs & related

- [React adapter docs](https://docs.blinnmotion.com/adapters/react)
- [Playback guide](https://docs.blinnmotion.com/guides/playback)
- [Quickstart](https://docs.blinnmotion.com/quickstart)
- [GitHub](https://github.com/ismailyagci/blinn-motion)

## License

MIT © Blinn Motion
