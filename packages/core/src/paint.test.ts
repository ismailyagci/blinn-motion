import { describe, it, expect } from "vitest";
import { resolvePaint, resolveStroke, resolveEffects, resolveText } from "./paint.js";

describe("resolvePaint", () => {
  it("null/undefined → null", () => {
    expect(resolvePaint(null)).toBeNull();
    expect(resolvePaint(undefined)).toBeNull();
  });
  it("solid → RGBA color", () => {
    expect(resolvePaint({ type: "solid", color: "#FF0000FF" })).toEqual({ type: "solid", color: { r: 255, g: 0, b: 0, a: 1 } });
  });
  it("linear defaults angle 180, center 0.5, radius 0.7", () => {
    const p = resolvePaint({ type: "linear", stops: [{ pos: 0, color: "#000" }] }) as any;
    expect(p.type).toBe("linear");
    expect(p.angle).toBe(180);
    expect(p.center).toEqual({ x: 0.5, y: 0.5 });
    expect(p.radius).toBe(0.7);
    expect(p.stops[0].color).toEqual({ r: 0, g: 0, b: 0, a: 1 });
  });
  it("radial/angular default angle 0 and keep provided center/radius", () => {
    const r = resolvePaint({ type: "radial", center: { x: 0.2, y: 0.8 }, radius: 0.5, stops: [] }) as any;
    expect(r.angle).toBe(0);
    expect(r.center).toEqual({ x: 0.2, y: 0.8 });
    expect(r.radius).toBe(0.5);
  });
  it("image defaults fit cover", () => {
    expect(resolvePaint({ type: "image", src: "x.png" })).toEqual({ type: "image", src: "x.png", fit: "cover" });
    expect((resolvePaint({ type: "image", src: "x.png", fit: "contain" }) as any).fit).toBe("contain");
  });
});

describe("resolveStroke", () => {
  it("no stroke and no sides → null", () => {
    expect(resolveStroke(null)).toBeNull();
    expect(resolveStroke(undefined, null)).toBeNull();
  });
  it("stroke → color + weight + sides:null", () => {
    expect(resolveStroke({ color: "#00FF00FF", weight: 3 })).toEqual({ color: { r: 0, g: 255, b: 0, a: 1 }, weight: 3, sides: null });
  });
  it("sides only → weight is max of sides", () => {
    const s = resolveStroke(null, [2, 8, 4, 1])!;
    expect(s.weight).toBe(8);
    expect(s.sides).toEqual([2, 8, 4, 1]);
  });
  it("stroke + sides → sides carried through", () => {
    const s = resolveStroke({ color: "#fff", weight: 1 }, [4, 0, 4, 0])!;
    expect(s.sides).toEqual([4, 0, 4, 0]);
  });
});

describe("resolveEffects", () => {
  it("resolves drop/inner with full geometry", () => {
    const out = resolveEffects([
      { type: "drop", x: 1, y: 2, radius: 3, spread: 4, color: "#000000FF" },
      { type: "inner", radius: 5 },
    ]);
    expect(out[0]).toEqual({ type: "drop", x: 1, y: 2, radius: 3, spread: 4, color: { r: 0, g: 0, b: 0, a: 1 } });
    expect(out[1]).toMatchObject({ type: "inner", radius: 5, x: 0, y: 0, spread: 0 });
  });
  it("resolves blur / bgblur / glass / noise / texture", () => {
    const out = resolveEffects([
      { type: "blur", radius: 6 },
      { type: "bgblur", radius: 7 },
      { type: "glass", radius: 9 },
      { type: "noise", size: 2, density: 0.7, color: "#112233FF" },
      { type: "texture", size: 3 },
    ]);
    expect(out[0]).toEqual({ type: "blur", radius: 6 });
    expect(out[1]).toEqual({ type: "bgblur", radius: 7 });
    expect(out[2]).toMatchObject({ type: "glass", radius: 9 });
    expect(out[3]).toMatchObject({ type: "noise", size: 2, density: 0.7 });
    expect(out[4]).toMatchObject({ type: "texture", size: 3 });
  });
  it("glass defaults radius 8 when omitted", () => {
    expect((resolveEffects([{ type: "glass" }])[0] as any).radius).toBe(8);
  });
  it("skips invisible effects and tolerates empty/undefined", () => {
    expect(resolveEffects([{ type: "drop", visible: false }])).toHaveLength(0);
    expect(resolveEffects(undefined)).toEqual([]);
  });
});

describe("resolveText", () => {
  it("null → null", () => {
    expect(resolveText(null)).toBeNull();
  });
  it("resolves color and preserves fields", () => {
    const t = resolveText({ characters: "Hi", fontSize: 20, color: "#FF00FFFF" })!;
    expect(t.characters).toBe("Hi");
    expect(t.fontSize).toBe(20);
    expect(t.color).toEqual({ r: 255, g: 0, b: 255, a: 1 });
  });
  it("defaults color to black when omitted", () => {
    expect(resolveText({ characters: "x" })!.color).toEqual({ r: 0, g: 0, b: 0, a: 1 });
  });
});
