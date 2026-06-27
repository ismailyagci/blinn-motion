import { describe, it, expect } from "vitest";
import { clamp, parseColor, rgbaToCss, rgbaToHex, lerpRgba, lerpColor } from "./color.js";

describe("clamp", () => {
  it("bounds below/within/above", () => {
    expect(clamp(-5, 0, 10)).toBe(0);
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(50, 0, 10)).toBe(10);
  });
});

describe("parseColor", () => {
  it("parses #RGB shorthand", () => {
    expect(parseColor("#f00")).toEqual({ r: 255, g: 0, b: 0, a: 1 });
  });
  it("parses #RRGGBB (alpha defaults 1)", () => {
    expect(parseColor("#00ff00")).toEqual({ r: 0, g: 255, b: 0, a: 1 });
  });
  it("parses #RRGGBBAA alpha", () => {
    expect(parseColor("#0000ff80").a).toBeCloseTo(128 / 255, 3);
  });
  it("parses rgb() and rgba() strings", () => {
    expect(parseColor("rgb(1,2,3)")).toEqual({ r: 1, g: 2, b: 3, a: 1 });
    expect(parseColor("rgba(10,20,30,0.5)")).toEqual({ r: 10, g: 20, b: 30, a: 0.5 });
  });
  it("accepts an object and fills defaults", () => {
    expect(parseColor({ r: 5, g: 6, b: 7 } as any)).toEqual({ r: 5, g: 6, b: 7, a: 1 });
    expect(parseColor({ r: 0, g: 0, b: 0, a: 0 })).toEqual({ r: 0, g: 0, b: 0, a: 0 });
  });
  it("falls back to opaque black for junk / null / non-string", () => {
    expect(parseColor(null)).toEqual({ r: 0, g: 0, b: 0, a: 1 });
    expect(parseColor(undefined)).toEqual({ r: 0, g: 0, b: 0, a: 1 });
    expect(parseColor("not-a-color")).toEqual({ r: 0, g: 0, b: 0, a: 1 });
    expect(parseColor(42 as any)).toEqual({ r: 0, g: 0, b: 0, a: 1 });
  });
  it("trims whitespace", () => {
    expect(parseColor("  #ff0000  ")).toEqual({ r: 255, g: 0, b: 0, a: 1 });
  });
});

describe("rgbaToCss / rgbaToHex", () => {
  it("formats rgba() and clamps out-of-range channels", () => {
    expect(rgbaToCss({ r: 300, g: -5, b: 128, a: 2 })).toBe("rgba(255,0,128,1)");
    expect(rgbaToCss({ r: 10.6, g: 20.4, b: 0, a: 0.5 })).toBe("rgba(11,20,0,0.5)");
  });
  it("round-trips hex through parse", () => {
    const hex = rgbaToHex({ r: 18, g: 52, b: 86, a: 1 });
    expect(hex.toLowerCase()).toBe("#123456ff");
    expect(parseColor(hex)).toEqual({ r: 18, g: 52, b: 86, a: 1 });
  });
  it("hex encodes alpha", () => {
    expect(rgbaToHex({ r: 0, g: 0, b: 0, a: 0 }).toLowerCase()).toBe("#00000000");
  });
});

describe("lerp", () => {
  it("lerpRgba interpolates each channel", () => {
    expect(lerpRgba("#000000FF", "#FFFFFFFF", 0.5)).toEqual({ r: 127.5, g: 127.5, b: 127.5, a: 1 });
  });
  it("lerpColor returns a css string at the midpoint", () => {
    expect(lerpColor("#FF0000FF", "#0000FFFF", 0.5)).toMatch(/^rgba\(/);
  });
  it("endpoints are exact", () => {
    expect(lerpRgba("#102030FF", "#405060FF", 0)).toEqual({ r: 16, g: 32, b: 48, a: 1 });
    expect(lerpRgba("#102030FF", "#405060FF", 1)).toEqual({ r: 64, g: 80, b: 96, a: 1 });
  });
});
