/**
 * @blinn-motion/react — React bindings for BlinnMotion.
 *
 * - `<BlinnMotion doc={...} renderer="dom|canvas" />` — drop-in component
 * - `useBlinnMotion(ref, doc, opts)` — hook for manual control
 *
 * Both backends share @blinn-motion/core's render method.
 */
export { BlinnMotion } from "./BlinnMotion.js";
export type { BlinnMotionProps, BlinnMotionHandle, BlinnMotionRenderer, BlinnMotionPlayer } from "./BlinnMotion.js";
export { useBlinnMotion, type UseBlinnMotionOptions } from "./useBlinnMotion.js";
export { useMotionProgress } from "./useMotionProgress.js";
