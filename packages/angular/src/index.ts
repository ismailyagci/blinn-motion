/**
 * @blinn-motion/angular — Angular bindings for BlinnMotion.
 *
 * - `<blinn-motion [doc]="doc" />` — standalone component
 * - `attachBlinnMotion(host, opts)` — pure mount helper (ideal for tests & custom hosts)
 */
export { BlinnMotionComponent } from "./blinn-motion.component.js";
export {
  attachBlinnMotion,
  type AttachOptions,
  type AttachedBlinnMotion,
  type BlinnMotionHandle,
  type BlinnMotionPlayer,
  type BlinnMotionRenderer,
} from "./attach.js";
