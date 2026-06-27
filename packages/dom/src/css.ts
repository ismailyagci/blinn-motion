/** CSS string helpers for the DOM adapter, built on @fottie/core color/shape math. */
import {
  parseColor,
  rgbaToCss,
  polygonVertices,
  starVertices,
  arcVertices,
  verticesToClipPath,
  type Paint,
  type Effect,
  type Shape,
  type RGBA,
  type StopOverride,
} from "@fottie/core";

/** Any accepted color form → CSS `rgba()`. */
export function colorCss(c: string | RGBA | null | undefined): string {
  return rgbaToCss(parseColor(c));
}

function stopsToCss(stops: Array<{ pos: number; color: string | RGBA }>): string {
  return stops.map((st) => colorCss(st.color) + " " + (st.pos * 100).toFixed(2) + "%").join(", ");
}

export function paintToCss(paint: Paint | null | undefined): string {
  if (!paint) return "transparent";
  if (paint.type === "solid") return colorCss(paint.color);
  if (paint.type === "linear") {
    return "linear-gradient(" + (paint.angle == null ? 180 : paint.angle) + "deg, " + stopsToCss(paint.stops || []) + ")";
  }
  if (paint.type === "radial" || paint.type === "diamond") {
    const cx = ((paint.center?.x ?? 0.5) * 100).toFixed(1);
    const cy = ((paint.center?.y ?? 0.5) * 100).toFixed(1);
    const r = ((paint.radius ?? 0.7) * 100).toFixed(1);
    // diamond has no CSS equivalent → approximated as radial
    return "radial-gradient(ellipse " + r + "% " + r + "% at " + cx + "% " + cy + "%, " + stopsToCss(paint.stops || []) + ")";
  }
  if (paint.type === "angular") {
    const cx = ((paint.center?.x ?? 0.5) * 100).toFixed(1);
    const cy = ((paint.center?.y ?? 0.5) * 100).toFixed(1);
    return "conic-gradient(from " + (paint.angle == null ? 0 : paint.angle) + "deg at " + cx + "% " + cy + "%, " + stopsToCss(paint.stops || []) + ")";
  }
  if (paint.type === "image" && paint.src) return "center/cover no-repeat url(" + paint.src + ")";
  return "transparent";
}

/** Re-derive a fill paint with animated gradient-stop overrides applied. */
export function fillWithStops(paint: Paint | null | undefined, overrides: Record<number, StopOverride>): Paint | null {
  if (!paint || paint.type === "solid" || paint.type === "image") return paint ?? null;
  if (!overrides || !Object.keys(overrides).length) return paint;
  const stops = (paint.stops || []).map((st, i) => {
    const o = overrides[i];
    if (!o) return st;
    return { pos: o.pos != null ? o.pos : st.pos, color: o.color != null ? o.color : st.color };
  });
  return { ...paint, stops };
}

export interface EffectCss {
  boxShadow: string;
  filter: string;
  backdrop: string;
}

/** Drop/inner shadows → box-shadow; layer blur → filter; bg/glass blur → backdrop-filter. */
export function effectsToCss(effects: Effect[] | undefined): EffectCss {
  const shadows: string[] = [];
  let filter = "";
  let backdrop = "";
  for (const e of effects || []) {
    if (e.visible === false) continue;
    if (e.type === "drop" || e.type === "inner") {
      const col = colorCss(e.color || "#00000040");
      shadows.push(
        (e.type === "inner" ? "inset " : "") +
          (e.x || 0) + "px " + (e.y || 0) + "px " + (e.radius || 0) + "px " + (e.spread || 0) + "px " + col,
      );
    } else if (e.type === "blur") {
      filter += " blur(" + (e.radius || 0) / 2 + "px)";
    } else if (e.type === "bgblur") {
      backdrop += " blur(" + (e.radius || 0) / 2 + "px)";
    } else if (e.type === "glass") {
      // glass/liquid: tinted backdrop blur
      backdrop += " blur(" + (e.radius || 8) / 2 + "px)";
      shadows.push("inset 0 0 12px " + colorCss(e.color || "#FFFFFF22"));
    }
  }
  return { boxShadow: shadows.join(", "), filter: filter.trim(), backdrop: backdrop.trim() };
}

/** `clip-path: polygon(...)` for a polygon/star/arc shape at a (possibly fractional) count. */
export function shapeClipCss(shape: Shape | null | undefined, count?: number): string {
  if (!shape) return "";
  if (shape.kind === "polygon") return verticesToClipPath(polygonVertices(count != null ? count : shape.points, shape.rot || 0));
  if (shape.kind === "star") return verticesToClipPath(starVertices(count != null ? count : shape.points, shape.ratio, shape.rot || 0));
  if (shape.kind === "arc") return verticesToClipPath(arcVertices(shape.startAngle, shape.endAngle, shape.innerRadius));
  return "";
}
