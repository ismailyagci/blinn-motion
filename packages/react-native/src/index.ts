/**
 * @blinn-motion/react-native — React Native bindings for BlinnMotion.
 *
 * - `<BlinnMotionView doc={...} />` — drop-in component that plays a MotionDoc with
 *   native <View>/<Text>/<Image> nodes.
 * - `useBlinnMotion(doc, opts)` — hook returning `{ tree, controls }` for manual rendering.
 * - `nodeToTransform(node)` — the pure RenderNode → RN style mapping.
 *
 * Shares @blinn-motion/core's render method with every other adapter, so the animation
 * is identical across DOM, Canvas, React and React Native.
 */
export { BlinnMotionView } from "./BlinnMotionView.js";
export type { BlinnMotionViewProps, BlinnMotionHandle } from "./BlinnMotionView.js";
export { useBlinnMotion } from "./useBlinnMotion.js";
export type { UseBlinnMotionOptions, UseBlinnMotionResult } from "./useBlinnMotion.js";
export { nodeToTransform } from "./style.js";
export type { BlinnMotionNodeStyle } from "./style.js";
export type { BlinnMotionControls, BlinnMotionPlaybackOptions, BlinnMotionPlayback } from "./player.js";
