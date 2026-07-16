/**
 * @blinn-motion/core — the pure, DOM-free render engine.
 *
 * Public surface:
 *   - {@link sample}    resolve a MotionDoc at time `t` → a backend-agnostic tree
 *   - {@link computeLayer}  resolve one layer's animated state
 *   - {@link Ticker}    the playback clock adapters build their Player on
 *   - color / easing / interpolation / shape helpers
 *
 * Adapters (DOM, Canvas, React, React Native) import from here so they all share
 * one render method.
 */
export * from "./types.js";
export { clamp, parseColor, rgbaToCss, rgbaToHex, lerpRgba, lerpColor } from "./color.js";
export { cubicBezier, springFn, makeEasing, type EasingFn } from "./easing.js";
export { valueKind, interp, applyOp, interpKeys, evalTrack, type ValueKind } from "./interpolate.js";
export { computeLayer, type LayerState, type EffectOverride, type StopOverride } from "./compose.js";
export { polygonVertices, starVertices, arcVertices, verticesToClipPath } from "./shapes.js";
export { resolvePaint, resolveStroke, resolveEffects, resolveText } from "./paint.js";
export { sample, walk, findNode } from "./sample.js";
export { Ticker, type TickerOptions } from "./ticker.js";
export {
  clampProgress,
  progressToTime,
  timeToProgress,
  scrollProgress,
  viewportProgress,
} from "./progress.js";

/** Library version. */
export const VERSION = "0.1.3";
