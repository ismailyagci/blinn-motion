/**
 * @blinn-motion/svelte — Svelte bindings for BlinnMotion.
 *
 * - `use:blinnMotion={{ doc }}` — idiomatic Svelte action
 * - `attachBlinnMotion(host, opts)` — pure mount helper
 * - `getBlinnHandle(node)` — read the live imperative handle from an action host
 */
export { blinnMotion, getBlinnHandle, type BlinnMotionActionParams } from "./action.js";
export {
  attachBlinnMotion,
  type AttachOptions,
  type AttachedBlinnMotion,
  type BlinnMotionHandle,
  type BlinnMotionPlayer,
  type BlinnMotionRenderer,
} from "./attach.js";
