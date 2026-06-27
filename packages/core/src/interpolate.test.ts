import { describe, it, expect } from "vitest";
import { valueKind, interp, applyOp, interpKeys, evalTrack } from "./interpolate.js";

describe("valueKind", () => {
  it("classifies vec / num / color / step", () => {
    expect(valueKind([1, 2])).toBe("vec");
    expect(valueKind(3)).toBe("num");
    expect(valueKind("#fff")).toBe("color");
    expect(valueKind("hello")).toBe("step");
    expect(valueKind(true)).toBe("step");
  });
});

describe("interp", () => {
  it("num lerps", () => {
    expect(interp(0, 10, 0.25, "num")).toBe(2.5);
  });
  it("vec lerps per component, tolerating missing target components", () => {
    expect(interp([0, 0], [10, 20], 0.5, "vec")).toEqual([5, 10]);
    expect(interp([2, 4], [8], 0.5, "vec")).toEqual([5, 4]); // missing to[1] holds from[1]
  });
  it("vec falls back to step when not both arrays", () => {
    expect(interp(5 as any, [1, 2] as any, 0.4, "vec")).toBe(5);
    expect(interp(5 as any, [1, 2] as any, 1, "vec")).toEqual([1, 2]);
  });
  it("color returns an rgba string", () => {
    expect(interp("#000000FF", "#FFFFFFFF", 0.5, "color")).toMatch(/^rgba\(/);
  });
  it("step holds until e>=1", () => {
    expect(interp("a", "b", 0.99, "step")).toBe("a");
    expect(interp("a", "b", 1, "step")).toBe("b");
  });
});

describe("applyOp", () => {
  it("set returns the value", () => {
    expect(applyOp("set", 5, 9)).toBe(9);
    expect(applyOp(undefined, 5, 9)).toBe(9);
  });
  it("offset adds (number + vec)", () => {
    expect(applyOp("offset", 10, 5)).toBe(15);
    expect(applyOp("offset", [1, 2], [10, 20])).toEqual([11, 22]);
    expect(applyOp("offset", undefined, [10, 20])).toEqual([10, 20]);
    expect(applyOp("offset", "x", 5)).toBe(5); // non-numeric base → treated as 0
  });
  it("scale multiplies (number + vec)", () => {
    expect(applyOp("scale", 2, 3)).toBe(6);
    expect(applyOp("scale", [2, 4], [3, 0.5])).toEqual([6, 2]);
    expect(applyOp("scale", undefined, [3, 4])).toEqual([3, 4]); // base→1
  });
  it("offset/scale of a non-number value just returns the value", () => {
    expect(applyOp("offset", 1, "#fff")).toBe("#fff");
    expect(applyOp("scale", 1, "#fff")).toBe("#fff");
  });
});

const K = (t: number, v: any, easing?: any) => ({ t, v, easing });

describe("interpKeys", () => {
  it("empty track → undefined", () => {
    expect(interpKeys({ property: "x", keys: [] }, 0)).toBeUndefined();
  });
  it("holds before first and after last", () => {
    const tr = { property: "x", keys: [K(1, 10), K(2, 20)] };
    expect(interpKeys(tr, 0)).toBe(10);
    expect(interpKeys(tr, 5)).toBe(20);
  });
  it("single key holds everywhere", () => {
    expect(interpKeys({ property: "x", keys: [K(1, 7)] }, 99)).toBe(7);
  });
  it("linear midpoint interpolates", () => {
    const tr = { property: "x", keys: [K(0, 0, { type: "linear" }), K(2, 10)] };
    expect(interpKeys(tr, 1)).toBe(5);
  });
  it("hold easing keeps the from-value mid-segment", () => {
    const tr = { property: "x", keys: [K(0, 0, { type: "hold" }), K(2, 10)] };
    expect(interpKeys(tr, 1.999)).toBe(0);
  });
  it("duplicate-time keys: the `t <= first` guard wins → first value", () => {
    const tr = { property: "x", keys: [K(1, 3, { type: "linear" }), K(1, 9)] };
    expect(interpKeys(tr, 1)).toBe(3);
  });
  it("picks the correct segment across 3 keys", () => {
    const tr = { property: "x", keys: [K(0, 0, { type: "linear" }), K(1, 10, { type: "linear" }), K(2, 30)] };
    expect(interpKeys(tr, 1.5)).toBe(20);
  });
});

describe("evalTrack", () => {
  it("applies the op against base after interpolation", () => {
    expect(evalTrack({ property: "x", op: "offset", base: 100, keys: [K(0, 5, { type: "hold" }), K(1, 5)] }, 0)).toBe(105);
  });
  it("undefined when no keys", () => {
    expect(evalTrack({ property: "x", keys: [] }, 0)).toBeUndefined();
  });
});
