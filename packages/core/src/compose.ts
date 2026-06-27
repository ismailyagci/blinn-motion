/**
 * Layer composition: resolve a layer's animated state at time `t` by stacking
 * its tracks per property over the base value.
 */
import type { Corners, Layer, PropertyName } from "./types.js";
import { applyOp, interpKeys } from "./interpolate.js";

/** Resolved per-layer animation state (base merged with all tracks). */
export interface LayerState {
  x: number;
  y: number;
  width: number;
  height: number;
  opacity: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
  translateX: number;
  translateY: number;
  cornerRadius: Corners;
  strokeWeight: number;
  fillColorOverride: string | null;
  shapeCount: number | null;
  trimStart: number;
  trimEnd: number;
}

/**
 * Pure: resolve the render state for a single layer at time `t`.
 *
 * Figma stacks animation styles + manual keyframes as multiple tracks on one
 * property. We compose them IN ORDER — start from the property base, then apply
 * each track's op (set/offset/scale) against the running value. (Last-wins drops
 * all but one track and is the main reason complex motion diverges.)
 */
export function computeLayer(layer: Layer, t: number): LayerState {
  const base = layer.base || {};
  const s: LayerState = {
    x: base.x || 0,
    y: base.y || 0,
    width: base.width || 0,
    height: base.height || 0,
    opacity: base.opacity == null ? 1 : base.opacity,
    rotation: base.rotation || 0,
    scaleX: base.scaleX == null ? 1 : base.scaleX,
    scaleY: base.scaleY == null ? 1 : base.scaleY,
    translateX: 0,
    translateY: 0,
    cornerRadius: (base.cornerRadius || [0, 0, 0, 0]).slice() as Corners,
    strokeWeight: base.stroke ? base.stroke.weight : 0,
    fillColorOverride: null,
    shapeCount: (base.shape && "points" in base.shape ? base.shape.points : null) ?? null,
    trimStart: 0,
    trimEnd: 1,
  };

  const tracks = layer.tracks || [];
  const running: Record<string, any> = {};
  for (const tr of tracks) {
    const raw = interpKeys(tr, t);
    if (raw == null) continue;
    const prop = tr.property;
    const cur = prop in running ? running[prop] : tr.base != null ? tr.base : null;
    running[prop] = applyOp(tr.op, cur, raw);
  }

  for (const p in running) {
    const v = running[p];
    if (v == null) continue;
    switch (p as PropertyName) {
      case "translateX": s.translateX = v; break;
      case "translateY": s.translateY = v; break;
      case "translateXY": if (Array.isArray(v)) { s.translateX = v[0]; s.translateY = v[1]; } break;
      case "rotation": s.rotation = v; break;
      case "scaleX": s.scaleX = v; break;
      case "scaleY": s.scaleY = v; break;
      case "scaleXY": if (Array.isArray(v)) { s.scaleX = v[0]; s.scaleY = v[1]; } break;
      case "opacity": s.opacity = v; break;
      case "width": s.width = v; break;
      case "height": s.height = v; break;
      case "cornerRadiusTL": s.cornerRadius[0] = v; break;
      case "cornerRadiusTR": s.cornerRadius[1] = v; break;
      case "cornerRadiusBR": s.cornerRadius[2] = v; break;
      case "cornerRadiusBL": s.cornerRadius[3] = v; break;
      case "strokeWeight": s.strokeWeight = v; break;
      case "polygonCount": s.shapeCount = v; break;
      case "fillColor": s.fillColorOverride = v; break;
      case "trimStart": s.trimStart = v; break;
      case "trimEnd": s.trimEnd = v; break;
      default: break;
    }
  }
  return s;
}
