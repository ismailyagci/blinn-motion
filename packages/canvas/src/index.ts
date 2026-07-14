/**
 * @blinn-motion/canvas — pure-JS 2D canvas adapter for BlinnMotion.
 *
 * `create(canvasOrEl, doc, opts)` samples the MotionDoc with @blinn-motion/core and
 * repaints a canvas each frame. Supports transforms, solid/linear/radial/angular
 * (diamond ≈ radial)/image fills, rounded rects, ellipses, polygons/stars/arcs,
 * text, vector paths, uniform + per-side strokes, blend modes, drop/inner shadows,
 * noise/texture + glass overlays, clipping and nested opacity.
 */
export { CanvasPlayer, create, type CanvasPlayerOptions } from "./player.js";
export { drawTree } from "./draw.js";
export {
  flattenPath,
  slicePolyline,
  trimmedPath2D,
  type Pt,
} from "./path-trim.js";
