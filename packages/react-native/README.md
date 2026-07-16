# @blinn-motion/react-native

[![npm](https://img.shields.io/npm/v/@blinn-motion/react-native.svg)](https://www.npmjs.com/package/@blinn-motion/react-native)
[![license](https://img.shields.io/npm/l/@blinn-motion/react-native.svg)](https://github.com/ismailyagci/blinn-motion/blob/main/LICENSE)

**React Native / Expo adapter for [Blinn Motion](https://blinnmotion.com).**

Plays a MotionDoc using native `View` / `Text` / `Image` nodes. Every frame samples the document with [`@blinn-motion/core`](https://www.npmjs.com/package/@blinn-motion/core) and maps the resolved tree to RN styles — the **same** render method as DOM, Canvas, and React web, so timing matches across platforms.

## Install

```bash
npm install @blinn-motion/react-native @blinn-motion/core
# peers (from your app):
npm install react react-native
```

Works with Expo and bare React Native.

## Quick start

```tsx
import { BlinnMotionView } from "@blinn-motion/react-native";
import doc from "./card.motion.json";

export default function Screen() {
  return (
    <BlinnMotionView
      doc={doc}
      loop
      autoplay
      style={{ width: 375, height: 600 }}
    />
  );
}
```

## Imperative control

```tsx
import { useRef } from "react";
import {
  BlinnMotionView,
  type BlinnMotionHandle,
} from "@blinn-motion/react-native";
import doc from "./card.motion.json";

export function Controlled() {
  const ref = useRef<BlinnMotionHandle>(null);

  return (
    <>
      <BlinnMotionView ref={ref} doc={doc} autoplay={false} />
      {/* ref.current?.play() / pause() / stop() / toggle() */}
      {/* ref.current?.seek(t) / seekFraction(f) / setRate(r) / setProgress(p) */}
    </>
  );
}
```

## Hook: `useBlinnMotion`

Drive playback yourself or read the resolved tree:

```tsx
import { useBlinnMotion } from "@blinn-motion/react-native";
import doc from "./card.motion.json";

export function Custom() {
  const { tree, controls } = useBlinnMotion(doc, { autoplay: true });
  // `tree` — resolved RenderTree for the current frame
  // `controls` — stable play / pause / seek / …
  return null; // map `tree` to your own views if needed
}
```

## Style mapping helpers

```ts
import { nodeToTransform } from "@blinn-motion/react-native";

const style = nodeToTransform(renderNode); // → ViewStyle-ish fields
```

## v1 limitations

React Native is a **progressive** adapter — web DOM/Canvas still lead fidelity:

| Area | Behavior |
|------|----------|
| Gradients | Fall back to solid (first stop of linear) |
| Vector paths / polygon / star | Not drawn as paths yet |
| Anchors | Centre-approximate (`{x:0.5,y:0.5}` is exact) |
| Effects | Blur / drop / inner shadow not mapped yet |
| Image paints on shapes | Ignored; `image` layers use `<Image>` |

For full web fidelity use [`@blinn-motion/react`](https://www.npmjs.com/package/@blinn-motion/react) with `renderer="dom"`. Future work: `react-native-svg` / `expo-linear-gradient` backends.

## Example apps

In the monorepo:

- `examples/expo` — Expo + this adapter  
- `examples/react-native` — RN shell  

```bash
# from repo root after npm install && npm run build
npm run start --workspace @blinn-motion/example-expo
```

## Docs

- [React Native adapter](https://docs.blinnmotion.com/adapters/react-native)
- [MotionDoc](https://docs.blinnmotion.com/concepts/motiondoc)
- [Core engine](https://docs.blinnmotion.com/concepts/render-engine)
- [GitHub](https://github.com/ismailyagci/blinn-motion)

## License

MIT © Blinn Motion
