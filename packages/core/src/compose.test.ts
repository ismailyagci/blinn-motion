import { describe, it, expect } from "vitest";
import { computeLayer } from "./compose.js";
import { parseColor } from "./color.js";
import type { Layer } from "./types.js";

const hold = (t: number, v: any) => ({ t, v, easing: { type: "hold" as const } });
/** A track that holds `v` for the whole timeline. */
const T = (property: string, v: any, op: any = "set", base?: any): any => ({
  property,
  op,
  base,
  keys: [hold(0, v), { t: 1, v }],
});
const layer = (base: any, tracks: any[] = []): Layer => ({ id: "n", type: "rect", base, tracks });

describe("computeLayer base merge", () => {
  it("uses base defaults", () => {
    const s = computeLayer(layer({}), 0);
    expect(s).toMatchObject({ opacity: 1, scaleX: 1, scaleY: 1, translateX: 0, translateY: 0, trimStart: 0, trimEnd: 1 });
    expect(s.cornerRadius).toEqual([0, 0, 0, 0]);
  });
  it("reads explicit base values", () => {
    const s = computeLayer(layer({ x: 5, y: 6, width: 100, height: 50, opacity: 0.2, rotation: 30, scaleX: 2, scaleY: 3, cornerRadius: [1, 2, 3, 4] }), 0);
    expect(s).toMatchObject({ x: 5, y: 6, width: 100, height: 50, opacity: 0.2, rotation: 30, scaleX: 2, scaleY: 3 });
    expect(s.cornerRadius).toEqual([1, 2, 3, 4]);
  });
  it("seeds strokeWeight and shapeCount from base", () => {
    const s = computeLayer(layer({ stroke: { color: "#000", weight: 4 }, shape: { kind: "polygon", points: 5 } }), 0);
    expect(s.strokeWeight).toBe(4);
    expect(s.shapeCount).toBe(5);
  });
});

describe("computeLayer property tracks", () => {
  it("applies every transform property", () => {
    const s = computeLayer(layer({}, [
      T("translateX", 11), T("translateY", 22), T("rotation", 33), T("scaleX", 2), T("scaleY", 3),
    ]), 0.5);
    expect(s).toMatchObject({ translateX: 11, translateY: 22, rotation: 33, scaleX: 2, scaleY: 3 });
  });
  it("vector translateXY / scaleXY split into components", () => {
    const s = computeLayer(layer({}, [T("translateXY", [7, 8]), T("scaleXY", [4, 5])]), 0.5);
    expect([s.translateX, s.translateY, s.scaleX, s.scaleY]).toEqual([7, 8, 4, 5]);
  });
  it("opacity / width / height / corners / strokeWeight / polygonCount / fillColor / trim", () => {
    const s = computeLayer(layer({}, [
      T("opacity", 0.4), T("width", 120), T("height", 60),
      T("cornerRadiusTL", 1), T("cornerRadiusTR", 2), T("cornerRadiusBR", 3), T("cornerRadiusBL", 4),
      T("strokeWeight", 9), T("polygonCount", 7), T("fillColor", "#ABCDEFFF"),
      T("trimStart", 0.1), T("trimEnd", 0.9),
    ]), 0.5);
    expect(s.opacity).toBe(0.4);
    expect(s.width).toBe(120);
    expect(s.height).toBe(60);
    expect(s.cornerRadius).toEqual([1, 2, 3, 4]);
    expect(s.strokeWeight).toBe(9);
    expect(s.shapeCount).toBe(7);
    // color tracks are normalized through interpolation → rgba() strings
    expect(parseColor(s.fillColorOverride!)).toEqual({ r: 171, g: 205, b: 239, a: 1 });
    expect(s.trimStart).toBe(0.1);
    expect(s.trimEnd).toBe(0.9);
  });
  it("strokeColor override", () => {
    const s = computeLayer(layer({}, [T("strokeColor", "#FF0000FF")]), 0.5);
    expect(parseColor(s.strokeColorOverride!)).toEqual({ r: 255, g: 0, b: 0, a: 1 });
  });
});

describe("computeLayer per-side borders", () => {
  it("animating one side seeds the others from strokeWeight", () => {
    const s = computeLayer(layer({ stroke: { color: "#000", weight: 2 } }, [T("borderTopWeight", 12)]), 0.5);
    expect(s.borderWeights).toEqual([12, 2, 2, 2]);
  });
  it("all four sides", () => {
    const s = computeLayer(layer({ stroke: { color: "#000", weight: 1 } }, [
      T("borderTopWeight", 1), T("borderRightWeight", 2), T("borderBottomWeight", 3), T("borderLeftWeight", 4),
    ]), 0.5);
    expect(s.borderWeights).toEqual([1, 2, 3, 4]);
  });
  it("starts from base.borderWeights when present", () => {
    const s = computeLayer(layer({ borderWeights: [5, 6, 7, 8] }), 0);
    expect(s.borderWeights).toEqual([5, 6, 7, 8]);
  });
});

describe("computeLayer indexed + layout tracks", () => {
  it("effect:i:field → effectOverrides", () => {
    const s = computeLayer(layer({}, [T("effect:0:offsetY", 20), T("effect:0:radius", 8), T("effect:1:color", "#FF0000FF")]), 0.5);
    expect(s.effectOverrides[0]).toMatchObject({ offsetY: 20, radius: 8 });
    expect(parseColor(s.effectOverrides[1]!.color!)).toEqual({ r: 255, g: 0, b: 0, a: 1 });
  });
  it("fillStop:i:field → fillStopOverrides", () => {
    const s = computeLayer(layer({}, [T("fillStop:1:color", "#00FF00FF"), T("fillStop:1:pos", 0.7)]), 0.5);
    expect(s.fillStopOverrides[1]!.pos).toBe(0.7);
    expect(parseColor(s.fillStopOverrides[1]!.color!)).toEqual({ r: 0, g: 255, b: 0, a: 1 });
  });
  it("ignores malformed indexed names", () => {
    const s = computeLayer(layer({}, [T("effect:notanumber:radius", 5)]), 0.5);
    expect(Object.keys(s.effectOverrides)).toHaveLength(0);
  });
  it("stack/grid layout props collected into layout map", () => {
    const s = computeLayer(layer({}, [T("stackSpacing", 16), T("gridRowGap", 8)]), 0.5);
    expect(s.layout.stackSpacing).toBe(16);
    expect(s.layout.gridRowGap).toBe(8);
  });
});

describe("computeLayer track composition", () => {
  it("stacks multiple tracks on one property in order over the base", () => {
    const s = computeLayer(layer({}, [
      { property: "translateX", op: "offset", base: 100, keys: [hold(0, 5), { t: 1, v: 5 }] },
      { property: "translateX", op: "offset", keys: [hold(0, 2), { t: 1, v: 2 }] },
    ]), 0);
    // 100 + 5, then + 2
    expect(s.translateX).toBe(107);
  });
  it("skips tracks whose value is null at t (empty keys)", () => {
    const s = computeLayer(layer({ opacity: 0.5 }, [{ property: "opacity", op: "set", keys: [] }]), 0);
    expect(s.opacity).toBe(0.5);
  });
});
