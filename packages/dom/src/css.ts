/** CSS string helpers for the DOM adapter, built on @fottie/core color/shape math. */
import {
  parseColor,
  rgbaToCss,
  polygonVertices,
  starVertices,
  verticesToClipPath,
  type Paint,
  type Effect,
  type Shape,
  type RGBA,
} from "@fottie/core";

/** Any accepted color form → CSS `rgba()`. */
export function colorCss(c: string | RGBA | null | undefined): string {
  return rgbaToCss(parseColor(c));
}

export function paintToCss(paint: Paint | null | undefined): string {
  if (!paint) return "transparent";
  if (paint.type === "solid") return colorCss(paint.color);
  if (paint.type === "linear") {
    const stops = (paint.stops || [])
      .map((st) => colorCss(st.color) + " " + st.pos * 100 + "%")
      .join(", ");
    return "linear-gradient(" + (paint.angle == null ? 180 : paint.angle) + "deg, " + stops + ")";
  }
  if (paint.type === "image" && paint.src) return "center/cover no-repeat url(" + paint.src + ")";
  return "transparent";
}

export interface EffectCss {
  boxShadow: string;
  filter: string;
  backdrop: string;
}

/** Drop/inner shadows → box-shadow; layer blur → filter; bg blur → backdrop-filter. */
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
    }
  }
  return { boxShadow: shadows.join(", "), filter: filter.trim(), backdrop: backdrop.trim() };
}

/** `clip-path: polygon(...)` for a polygon/star shape at a (possibly fractional) count. */
export function shapeClipCss(shape: Shape | null | undefined, count?: number): string {
  if (!shape) return "";
  if (shape.kind === "polygon") return verticesToClipPath(polygonVertices(count != null ? count : shape.points, shape.rot || 0));
  if (shape.kind === "star") return verticesToClipPath(starVertices(count != null ? count : shape.points, shape.ratio, shape.rot || 0));
  return "";
}
