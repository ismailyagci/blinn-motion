/**
 * Resolve authored paint / effects / text into the normalized RGBA-based forms
 * the render tree carries. No CSS here — adapters format RGBA themselves.
 */
import type {
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
  if (paint.type === "linear") {
    return {
      type: "linear",
      angle: paint.angle == null ? 180 : paint.angle,
      stops: (paint.stops || []).map((st) => ({ pos: st.pos, color: parseColor(st.color) })),
    };
  }
  if (paint.type === "image") return { type: "image", src: paint.src, fit: paint.fit || "cover" };
  return null;
}

export function resolveStroke(stroke: Stroke | null | undefined): ResolvedStroke | null {
  if (!stroke) return null;
  return { color: parseColor(stroke.color), weight: stroke.weight || 0 };
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
    }
  }
  return out;
}

export function resolveText(text: TextStyle | null | undefined): ResolvedText | null {
  if (!text) return null;
  return { ...text, color: parseColor(text.color || "#000000FF") };
}
