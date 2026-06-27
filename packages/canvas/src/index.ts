/**
 * @fottie/canvas — pure-JS 2D canvas adapter for Fottie.
 *
 * `create(canvasOrEl, doc, opts)` samples the MotionDoc with @fottie/core and
 * repaints a canvas each frame. Supports transforms, solid/linear/image fills,
 * rounded rects, ellipses, polygons/stars, text, vector paths, strokes, drop
 * shadows, clipping and nested opacity.
 */
export { CanvasPlayer, create, type CanvasPlayerOptions } from "./player.js";
export { drawTree } from "./draw.js";
