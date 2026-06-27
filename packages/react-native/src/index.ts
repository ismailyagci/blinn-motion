/**
 * @fottie/react-native — React Native bindings for Fottie.
 *
 * - `<FottieView doc={...} />` — drop-in component that plays a MotionDoc with
 *   native <View>/<Text>/<Image> nodes.
 * - `useFottie(doc, opts)` — hook returning `{ tree, controls }` for manual rendering.
 * - `nodeToTransform(node)` — the pure RenderNode → RN style mapping.
 *
 * Shares @fottie/core's render method with every other adapter, so the animation
 * is identical across DOM, Canvas, React and React Native.
 */
export { FottieView } from "./FottieView.js";
export type { FottieViewProps, FottieHandle } from "./FottieView.js";
export { useFottie } from "./useFottie.js";
export type { UseFottieOptions, UseFottieResult } from "./useFottie.js";
export { nodeToTransform } from "./style.js";
export type { FottieNodeStyle } from "./style.js";
export type { FottieControls, FottiePlaybackOptions, FottiePlayback } from "./player.js";
