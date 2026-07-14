# @blinn-motion/react-native

React Native adapter for **Blinn Motion**. It plays a `MotionDoc` (the Figma-Motion →
MotionDoc → render-engine format) using native `View` / `Text` / `Image` nodes.
Every frame it samples the doc with [`@blinn-motion/core`](../core) and maps the
resolved render tree onto RN styles — the exact same render method the DOM,
Canvas and React adapters use, so the animation is identical across platforms.

## Install

```sh
npm install @blinn-motion/react-native @blinn-motion/core
# peers (provided by your app):
npm install react react-native
```

## Usage

```tsx
import { BlinnMotionView } from "@blinn-motion/react-native";
import doc from "./card.motion.json";

export default function Screen() {
  return <BlinnMotionView doc={doc} loop autoplay />;
}
```

### Imperative control

```tsx
import { useRef } from "react";
import { BlinnMotionView, type BlinnMotionHandle } from "@blinn-motion/react-native";

const ref = useRef<BlinnMotionHandle>(null);
<BlinnMotionView ref={ref} doc={doc} autoplay={false} />;
// ref.current?.play() / pause() / stop() / toggle() / seek(t) / seekFraction(f) / setRate(r)
```

### Hook

Render the tree yourself, or drive playback from your own UI:

```tsx
import { useBlinnMotion } from "@blinn-motion/react-native";

const { tree, controls } = useBlinnMotion(doc, { autoplay: true });
// `tree` is the resolved RenderTree for the current frame; `controls` is stable.
```

The pure mapping is also exported for custom renderers:

```ts
import { nodeToTransform } from "@blinn-motion/react-native";
const style = nodeToTransform(renderNode); // → React Native ViewStyle
```

## v1 limitations

- **Gradients & vector paths fall back to a solid colour.** A linear gradient
  uses its first stop; polygon/star/path shapes are not drawn as paths. Use
  `react-native-svg` / `expo-linear-gradient` for full fidelity (TODO).
- **Anchors are centre-approximate.** React Native applies transforms around a
  view's centre. Off-centre anchors (e.g. left-aligned text) can't be reproduced
  exactly without a measured layout; `{x:0.5,y:0.5}` is exact.
- **Effects** (blur, drop/inner shadow) are not yet mapped.
- **Image *paints* on shapes** are ignored; only `image`-type layers render an
  `<Image>`.
