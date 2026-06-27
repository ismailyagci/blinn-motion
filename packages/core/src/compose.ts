/**
 * Layer composition: resolve a layer's animated state at time `t` by stacking
 * its tracks per property over the base value.
 */
import type { Corners, Layer, PropertyName } from "./types.js";
import { applyOp, interpKeys } from "./interpolate.js";

/** Animated overrides for one effect (by index). */
export interface EffectOverride {
  offsetX?: number;
  offsetY?: number;
  radius?: number;
  spread?: number;
  color?: string;
}

/** Animated overrides for one gradient stop (by index). */
export interface StopOverride {
  color?: string;
  pos?: number;
}

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
  /** Per-side border weights [top, right, bottom, left], or null when uniform. */
  borderWeights: Corners | null;
  fillColorOverride: string | null;
  strokeColorOverride: string | null;
  shapeCount: number | null;
  trimStart: number;
  trimEnd: number;
  /** Animated effect overrides, keyed by effect index. */
  effectOverrides: Record<number, EffectOverride>;
  /** Animated gradient-stop overrides, keyed by stop index. */
  fillStopOverrides: Record<number, StopOverride>;
  /** Auto-layout / grid (data-preserved; renderers may reflow). */
  layout: Record<string, number>;
}

const BORDER_SIDE: Record<string, number> = {
  borderTopWeight: 0,
  borderRightWeight: 1,
  borderBottomWeight: 2,
  borderLeftWeight: 3,
};

const LAYOUT_PROPS = new Set([
  "stackSpacing",
  "stackPaddingTop",
  "stackPaddingRight",
  "stackPaddingBottom",
  "stackPaddingLeft",
  "stackCounterSpacing",
  "gridRowGap",
  "gridColumnGap",
]);

/**
 * Pure: resolve the render state for a single layer at time `t`.
 *
 * Figma stacks animation styles + manual keyframes as multiple tracks on one
 * property. We compose them IN ORDER — start from the property base, then apply
 * each track's op (set/offset/scale) against the running value.
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
    borderWeights: base.borderWeights ? (base.borderWeights.slice() as Corners) : null,
    fillColorOverride: null,
    strokeColorOverride: null,
    shapeCount: (base.shape && "points" in base.shape ? base.shape.points : null) ?? null,
    trimStart: 0,
    trimEnd: 1,
    effectOverrides: {},
    fillStopOverrides: {},
    layout: {},
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
    // indexed tracks: "effect:<i>:<field>" and "fillStop:<i>:<field>"
    if (p.indexOf(":") >= 0) {
      applyIndexed(s, p, v);
      continue;
    }
    if (p in BORDER_SIDE) {
      if (!s.borderWeights) s.borderWeights = [s.strokeWeight, s.strokeWeight, s.strokeWeight, s.strokeWeight];
      s.borderWeights[BORDER_SIDE[p]!] = v;
      continue;
    }
    if (LAYOUT_PROPS.has(p)) {
      s.layout[p] = v;
      continue;
    }
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
      case "strokeColor": s.strokeColorOverride = v; break;
      case "polygonCount": s.shapeCount = v; break;
      case "fillColor": s.fillColorOverride = v; break;
      case "trimStart": s.trimStart = v; break;
      case "trimEnd": s.trimEnd = v; break;
      default: break;
    }
  }
  return s;
}

function applyIndexed(s: LayerState, prop: string, v: any): void {
  const parts = prop.split(":");
  const collection = parts[0];
  const idx = parseInt(parts[1]!, 10);
  const field = parts[2];
  if (isNaN(idx) || !field) return;
  if (collection === "effect") {
    const o = (s.effectOverrides[idx] ||= {});
    if (field === "offsetX") o.offsetX = v;
    else if (field === "offsetY") o.offsetY = v;
    else if (field === "radius") o.radius = v;
    else if (field === "spread") o.spread = v;
    else if (field === "color") o.color = v;
  } else if (collection === "fillStop") {
    const o = (s.fillStopOverrides[idx] ||= {});
    if (field === "color") o.color = v;
    else if (field === "pos") o.pos = v;
  }
}
