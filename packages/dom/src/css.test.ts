import { describe, it, expect } from "vitest";
import type { Paint, Effect, Shape } from "@blinn-motion/core";
import { colorCss, paintToCss, effectsToCss, shapeClipCss, fillWithStops } from "./css.js";

/** Split a `polygon(a% b%, c% d%, ...)` clip-path into its vertex tokens. */
function polyPoints(cp: string): string[] {
  const m = cp.match(/^polygon\((.*)\)$/);
  return m ? m[1]!.split(", ") : [];
}

describe("@blinn-motion/dom css.colorCss", () => {
  it("converts hex (with alpha) to rgba()", () => {
    expect(colorCss("#3B82F6FF")).toBe("rgba(59,130,246,1)");
  });

  it("expands short hex", () => {
    expect(colorCss("#fff")).toBe("rgba(255,255,255,1)");
  });

  it("parses an rgba() string", () => {
    const out = colorCss("rgba(10,20,30,0.5)");
    expect(out).toBe("rgba(10,20,30,0.5)");
  });

  it("accepts an RGBA object", () => {
    expect(colorCss({ r: 255, g: 0, b: 0, a: 1 })).toBe("rgba(255,0,0,1)");
  });

  it("falls back to opaque black for null/undefined", () => {
    expect(colorCss(null)).toBe("rgba(0,0,0,1)");
    expect(colorCss(undefined)).toBe("rgba(0,0,0,1)");
  });
});

describe("@blinn-motion/dom css.paintToCss", () => {
  it("returns transparent for null/undefined", () => {
    expect(paintToCss(null)).toBe("transparent");
    expect(paintToCss(undefined)).toBe("transparent");
  });

  it("renders a solid paint as a color", () => {
    expect(paintToCss({ type: "solid", color: "#FF0000FF" })).toBe("rgba(255,0,0,1)");
  });

  it("renders a linear gradient with deg + stop percentages", () => {
    const css = paintToCss({
      type: "linear",
      angle: 135,
      stops: [
        { pos: 0, color: "#3B82F6FF" },
        { pos: 1, color: "#8B5CF6FF" },
      ],
    } as Paint);
    expect(css).toContain("linear-gradient(");
    expect(css).toContain("135deg");
    expect(css).toContain("0.00%");
    expect(css).toContain("100.00%");
    expect(css).toContain("rgba(59,130,246,1)");
  });

  it("defaults a linear gradient angle to 180deg", () => {
    const css = paintToCss({ type: "linear", stops: [{ pos: 0, color: "#000" }] } as Paint);
    expect(css).toContain("180deg");
  });

  it("renders a radial gradient with center % and radius %", () => {
    const css = paintToCss({
      type: "radial",
      center: { x: 0.4, y: 0.4 },
      radius: 0.8,
      stops: [
        { pos: 0, color: "#FDE047FF" },
        { pos: 1, color: "#7C3AEDFF" },
      ],
    } as Paint);
    expect(css).toContain("radial-gradient(");
    expect(css).toContain("at 40.0% 40.0%");
    expect(css).toContain("80.0%");
  });

  it("approximates a diamond gradient as radial with default center/radius", () => {
    const css = paintToCss({ type: "diamond", stops: [{ pos: 0, color: "#fff" }] } as Paint);
    expect(css).toContain("radial-gradient(");
    expect(css).toContain("at 50.0% 50.0%");
    expect(css).toContain("70.0%"); // default radius 0.7
  });

  it("renders an angular gradient as conic-gradient with from <deg>", () => {
    const css = paintToCss({
      type: "angular",
      angle: 45,
      center: { x: 0.5, y: 0.5 },
      stops: [
        { pos: 0, color: "#F43F5EFF" },
        { pos: 1, color: "#3B82F6FF" },
      ],
    } as Paint);
    expect(css).toContain("conic-gradient(");
    expect(css).toContain("from 45deg");
    expect(css).toContain("at 50.0% 50.0%");
  });

  it("defaults an angular gradient angle to 0deg", () => {
    const css = paintToCss({ type: "angular", stops: [{ pos: 0, color: "#000" }] } as Paint);
    expect(css).toContain("from 0deg");
  });

  it("renders an image paint as a url()", () => {
    expect(paintToCss({ type: "image", src: "pic.png" } as Paint)).toContain("url(pic.png)");
  });

  it("returns transparent for an image paint with no src", () => {
    expect(paintToCss({ type: "image", src: "" } as Paint)).toBe("transparent");
  });
});

describe("@blinn-motion/dom css.effectsToCss", () => {
  it("is empty for no effects", () => {
    expect(effectsToCss(undefined)).toEqual({ boxShadow: "", filter: "", backdrop: "" });
  });

  it("maps a drop shadow to box-shadow offsets/blur/spread/color (no inset)", () => {
    const { boxShadow } = effectsToCss([
      { type: "drop", x: 2, y: 4, radius: 6, spread: 1, color: "#000000FF" },
    ] as Effect[]);
    expect(boxShadow).toContain("2px 4px 6px 1px rgba(0,0,0,1)");
    expect(boxShadow).not.toContain("inset");
  });

  it("uses the default shadow color when none is given", () => {
    const { boxShadow } = effectsToCss([{ type: "drop" }] as Effect[]);
    expect(boxShadow).toContain("0px 0px 0px 0px rgba(0,0,0,");
  });

  it("marks an inner shadow as inset", () => {
    const { boxShadow } = effectsToCss([
      { type: "inner", x: 0, y: 2, radius: 4, spread: 0, color: "#000000FF" },
    ] as Effect[]);
    expect(boxShadow).toContain("inset ");
  });

  it("maps a layer blur to a filter (radius / 2)", () => {
    const { filter, backdrop } = effectsToCss([{ type: "blur", radius: 8 }] as Effect[]);
    expect(filter).toBe("blur(4px)");
    expect(backdrop).toBe("");
  });

  it("maps a background blur to backdrop-filter (radius / 2)", () => {
    const { backdrop, filter } = effectsToCss([{ type: "bgblur", radius: 10 }] as Effect[]);
    expect(backdrop).toBe("blur(5px)");
    expect(filter).toBe("");
  });

  it("maps glass to a backdrop blur + an inset highlight shadow", () => {
    const { backdrop, boxShadow } = effectsToCss([
      { type: "glass", radius: 8, color: "#FFFFFF22" },
    ] as Effect[]);
    expect(backdrop).toContain("blur(4px)");
    expect(boxShadow).toContain("inset 0 0 12px");
  });

  it("skips effects flagged visible:false", () => {
    const { boxShadow } = effectsToCss([
      { type: "drop", x: 5, y: 5, radius: 5, visible: false },
    ] as Effect[]);
    expect(boxShadow).toBe("");
  });
});

describe("@blinn-motion/dom css.shapeClipCss", () => {
  it("returns '' for null/undefined", () => {
    expect(shapeClipCss(null)).toBe("");
    expect(shapeClipCss(undefined)).toBe("");
  });

  it("produces a polygon() with one vertex per side", () => {
    const cp = shapeClipCss({ kind: "polygon", points: 5 } as Shape);
    expect(cp.startsWith("polygon(")).toBe(true);
    expect(polyPoints(cp).length).toBe(5);
  });

  it("produces a star with 2n vertices", () => {
    const cp = shapeClipCss({ kind: "star", points: 5, ratio: 0.5 } as Shape);
    expect(polyPoints(cp).length).toBe(10);
  });

  it("produces a polygon() for an arc shape", () => {
    const cp = shapeClipCss({ kind: "arc", startAngle: -90, endAngle: 200, innerRadius: 0.45 } as Shape);
    expect(cp).toContain("polygon(");
    expect(polyPoints(cp).length).toBeGreaterThan(3);
  });

  it("respects an explicit (fractional) count override for polygons", () => {
    const cp = shapeClipCss({ kind: "polygon", points: 3 } as Shape, 6);
    // a fractional/different count samples the perimeter → many vertices
    expect(polyPoints(cp).length).toBeGreaterThan(3);
  });

  it("returns '' for a path shape", () => {
    expect(shapeClipCss({ kind: "path", paths: [] } as Shape)).toBe("");
  });
});

describe("@blinn-motion/dom css.fillWithStops", () => {
  const linear: Paint = {
    type: "linear",
    angle: 90,
    stops: [
      { pos: 0, color: "#FDE047FF" },
      { pos: 1, color: "#7C3AEDFF" },
    ],
  } as Paint;

  it("applies a color override to one stop, leaving others", () => {
    const out = fillWithStops(linear, { 1: { color: "#06B6D4FF" } }) as any;
    expect(out.stops[0].color).toBe("#FDE047FF");
    expect(out.stops[1].color).toBe("#06B6D4FF");
  });

  it("applies a pos override", () => {
    const out = fillWithStops(linear, { 0: { pos: 0.25 } }) as any;
    expect(out.stops[0].pos).toBe(0.25);
    expect(out.stops[0].color).toBe("#FDE047FF");
  });

  it("returns the same gradient (by ref) when overrides are empty", () => {
    expect(fillWithStops(linear, {})).toBe(linear);
  });

  it("passes a solid paint through unchanged", () => {
    const solid: Paint = { type: "solid", color: "#fff" };
    expect(fillWithStops(solid, { 0: { color: "#000" } })).toBe(solid);
  });

  it("passes an image paint through unchanged", () => {
    const img: Paint = { type: "image", src: "x.png" } as Paint;
    expect(fillWithStops(img, { 0: { color: "#000" } })).toBe(img);
  });

  it("returns null for a null paint", () => {
    expect(fillWithStops(null, { 0: { color: "#000" } })).toBe(null);
  });
});
