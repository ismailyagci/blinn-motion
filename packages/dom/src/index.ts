/**
 * @fottie/dom — DOM/CSS adapter for Fottie.
 *
 * `create(el, doc, opts)` builds nested DOM layers and plays the MotionDoc using
 * @fottie/core's render math. Full fidelity: transforms, gradients, SVG vector
 * paths + arrowheads, clip-path polygons/stars, masks, and procedural shaders.
 */
export { DomPlayer, create, type DomPlayerOptions } from "./player.js";
export { paintToCss, effectsToCss, colorCss, shapeClipCss } from "./css.js";
