/**
 * @blinn-motion/lit — Lit / custom element bindings for BlinnMotion.
 *
 * - `<blinn-motion>` — custom element (auto-registered on import)
 * - `attachBlinnMotion(host, opts)` — pure mount helper
 * - `defineBlinnMotionElement()` — explicit registration
 */
export { BlinnMotionElement, defineBlinnMotionElement } from "./blinn-motion-element.js";
export {
  attachBlinnMotion,
  type AttachOptions,
  type AttachedBlinnMotion,
  type BlinnMotionHandle,
  type BlinnMotionPlayer,
  type BlinnMotionRenderer,
} from "./attach.js";
