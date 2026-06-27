# @fottie/react-native

React Native adapter for **Fottie**. It plays a `MotionDoc` (the Figma-Motion →
MotionDoc → render-engine format) using native `View` / `Text` / `Image` nodes.
Every frame it samples the doc with [`@fottie/core`](../core) and maps the
resolved render tree onto RN styles — the exact same render method the DOM,
Canvas and React adapters use, so the animation is identical across platforms.

## Install

```sh
npm install @fottie/react-native @fottie/core
# peers (provided by your app):
npm install react react-native
```

## Usage

```tsx
import { FottieView } from "@fottie/react-native";
import doc from "./card.motion.json";

export default function Screen() {
  return <FottieView doc={doc} loop autoplay />;
}
```

### Imperative control

```tsx
import { useRef } from "react";
import { FottieView, type FottieHandle } from "@fottie/react-native";

const ref = useRef<FottieHandle>(null);
<FottieView ref={ref} doc={doc} autoplay={false} />;
// ref.current?.play() / pause() / stop() / toggle() / seek(t) / seekFraction(f) / setRate(r)
```

### Hook

Render the tree yourself, or drive playback from your own UI:

```tsx
import { useFottie } from "@fottie/react-native";

const { tree, controls } = useFottie(doc, { autoplay: true });
// `tree` is the resolved RenderTree for the current frame; `controls` is stable.
```

The pure mapping is also exported for custom renderers:

```ts
import { nodeToTransform } from "@fottie/react-native";
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
