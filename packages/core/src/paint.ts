/**
 * Resolve authored paint / effects / text into the normalized RGBA-based forms
 * the render tree carries. No CSS here — adapters format RGBA themselves.
 */
import type {
  Corners,
  Effect,
  Paint,
  ResolvedEffect,
  ResolvedPaint,
  ResolvedText,
  Stroke,
  ResolvedStroke,
  TextStyle,
} from "./types.js";
import { parseColor } from "./color.js";

export function resolvePaint(paint: Paint | null | undefined): ResolvedPaint | null {
  if (!paint) return null;
  if (paint.type === "solid") return { type: "solid", color: parseColor(paint.color) };
  if (paint.type === "linear" || paint.type === "radial" || paint.type === "angular" || paint.type === "diamond") {
    return {
      type: paint.type,
      angle: paint.angle == null ? (paint.type === "linear" ? 180 : 0) : paint.angle,
      center: paint.center || { x: 0.5, y: 0.5 },
      // fraction of max(width,height); 0.7 ≈ reaches the corners from the center
      radius: paint.radius == null ? 0.7 : paint.radius,
      stops: (paint.stops || []).map((st) => ({ pos: st.pos, color: parseColor(st.color) })),
    };
  }
  if (paint.type === "image") return { type: "image", src: paint.src, fit: paint.fit || "cover" };
  return null;
}

export function resolveStroke(stroke: Stroke | null | undefined, sides?: Corners | null): ResolvedStroke | null {
  if (!stroke && !sides) return null;
  return {
    color: parseColor(stroke ? stroke.color : "#000000FF"),
    weight: stroke ? stroke.weight || 0 : Math.max(...(sides || [0, 0, 0, 0])),
    sides: sides || null,
  };
}

export function resolveEffects(effects: Effect[] | undefined): ResolvedEffect[] {
  const out: ResolvedEffect[] = [];
  for (const e of effects || []) {
    if (e.visible === false) continue;
    if (e.type === "drop" || e.type === "inner") {
      out.push({
        type: e.type,
        x: e.x || 0,
        y: e.y || 0,
        radius: e.radius || 0,
        spread: e.spread || 0,
        color: parseColor(e.color || "#00000040"),
      });
    } else if (e.type === "blur" || e.type === "bgblur") {
      out.push({ type: e.type, radius: e.radius || 0 });
    } else if (e.type === "glass") {
      out.push({ type: "glass", radius: e.radius || 8, color: parseColor(e.color || "#FFFFFF22") });
    } else if (e.type === "noise" || e.type === "texture") {
      out.push({
        type: e.type,
        size: e.type === "noise" ? e.size || 1 : (e as { size?: number }).size || 1,
        density: e.type === "noise" ? (e.density == null ? 0.5 : e.density) : 0.5,
        color: parseColor((e as { color?: string }).color || "#000000FF"),
      });
    }
  }
  return out;
}

export function resolveText(text: TextStyle | null | undefined): ResolvedText | null {
  if (!text) return null;
  return { ...text, color: parseColor(text.color || "#000000FF") };
}
