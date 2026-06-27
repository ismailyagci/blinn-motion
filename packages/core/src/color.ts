/**
 * Color utilities. Internally the engine works in {@link RGBA} (channels 0..255,
 * alpha 0..1). Inputs may be hex (`#RGB`/`#RRGGBB`/`#RRGGBBAA`), `rgb()/rgba()`
 * strings, or an `{r,g,b,a}` object — animated colors come back as `rgba()`
 * strings from {@link lerpColor}, so both forms must round-trip.
 */
import type { RGBA } from "./types.js";

export function clamp(n: number, lo: number, hi: number): number {
  return n < lo ? lo : n > hi ? hi : n;
}

export function parseColor(c: string | RGBA | null | undefined): RGBA {
  if (c && typeof c === "object") {
    return { r: c.r || 0, g: c.g || 0, b: c.b || 0, a: c.a == null ? 1 : c.a };
  }
  if (typeof c !== "string") return { r: 0, g: 0, b: 0, a: 1 };
  const s = c.trim();
  if (s.charAt(0) === "#") {
    let h = s.slice(1);
    if (h.length === 3) h = h[0]! + h[0]! + h[1]! + h[1]! + h[2]! + h[2]!;
    if (h.length === 6) h += "ff";
    return {
      r: parseInt(h.slice(0, 2), 16) || 0,
      g: parseInt(h.slice(2, 4), 16) || 0,
      b: parseInt(h.slice(4, 6), 16) || 0,
      a: h.length >= 8 ? (parseInt(h.slice(6, 8), 16) || 0) / 255 : 1,
    };
  }
  const m = s.match(/rgba?\(([^)]+)\)/i);
  if (m) {
    const p = m[1]!.split(",").map((x) => parseFloat(x));
    return { r: p[0] || 0, g: p[1] || 0, b: p[2] || 0, a: p[3] == null || isNaN(p[3]) ? 1 : p[3] };
  }
  return { r: 0, g: 0, b: 0, a: 1 };
}

/** Format an RGBA as a CSS `rgba()` string. */
export function rgbaToCss(c: RGBA): string {
  return (
    "rgba(" +
    Math.round(clamp(c.r, 0, 255)) +
    "," +
    Math.round(clamp(c.g, 0, 255)) +
    "," +
    Math.round(clamp(c.b, 0, 255)) +
    "," +
    clamp(c.a, 0, 1) +
    ")"
  );
}

/** Format an RGBA as `#RRGGBBAA`. */
export function rgbaToHex(c: RGBA): string {
  const h = (n: number) => clamp(Math.round(n), 0, 255).toString(16).padStart(2, "0");
  return "#" + h(c.r) + h(c.g) + h(c.b) + h(clamp(c.a, 0, 1) * 255);
}

/** Linear interpolation between two colors (any accepted form), returns RGBA. */
export function lerpRgba(a: string | RGBA, b: string | RGBA, e: number): RGBA {
  const ca = parseColor(a);
  const cb = parseColor(b);
  return {
    r: ca.r + (cb.r - ca.r) * e,
    g: ca.g + (cb.g - ca.g) * e,
    b: ca.b + (cb.b - ca.b) * e,
    a: ca.a + (cb.a - ca.a) * e,
  };
}

/** Back-compat helper: interpolate two colors, returning a CSS `rgba()` string. */
export function lerpColor(a: string | RGBA, b: string | RGBA, e: number): string {
  return rgbaToCss(lerpRgba(a, b, e));
}
