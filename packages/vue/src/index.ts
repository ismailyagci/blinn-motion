/**
 * @blinn-motion/vue — Vue bindings for BlinnMotion.
 *
 * - `<BlinnMotion :doc="..." />` — drop-in component
 * - `useBlinnMotion(hostRef, doc, opts)` — composable for manual control
 * - `attachBlinnMotion(host, opts)` — pure mount helper
 *
 * Both backends share @blinn-motion/core's render method.
 */
export { BlinnMotion } from "./BlinnMotion.js";
export type { BlinnMotionHandle, BlinnMotionRenderer } from "./BlinnMotion.js";
export { useBlinnMotion, type UseBlinnMotionOptions } from "./useBlinnMotion.js";
export {
  attachBlinnMotion,
  type AttachOptions,
  type AttachedBlinnMotion,
  type BlinnMotionPlayer,
} from "./attach.js";
