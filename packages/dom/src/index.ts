/**
 * @blinn-motion/dom — DOM/CSS adapter for BlinnMotion.
 *
 * `create(el, doc, opts)` builds nested DOM layers and plays the MotionDoc using
 * @blinn-motion/core's render math. Full fidelity: transforms, gradients, SVG vector
 * paths + arrowheads, clip-path polygons/stars, masks, and procedural shaders.
 */
export { DomPlayer, create, type DomPlayerOptions } from "./player.js";
export { paintToCss, effectsToCss, colorCss, shapeClipCss } from "./css.js";
