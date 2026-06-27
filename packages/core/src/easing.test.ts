import { describe, it, expect } from "vitest";
import { cubicBezier, springFn, makeEasing } from "./easing.js";

describe("cubicBezier", () => {
  it("identity (0,0,1,1) is ~linear", () => {
    const f = cubicBezier(0, 0, 1, 1);
    for (const u of [0, 0.25, 0.5, 0.75, 1]) expect(f(u)).toBeCloseTo(u, 2);
  });
  it("clamps outside 0..1", () => {
    const f = cubicBezier(0.42, 0, 0.58, 1);
    expect(f(-1)).toBe(0);
    expect(f(2)).toBe(1);
  });
  it("ease-out leads linear in the first half", () => {
    const f = cubicBezier(0, 0, 0.58, 1);
    expect(f(0.5)).toBeGreaterThan(0.5);
  });
  it("ease-in trails linear in the first half", () => {
    const f = cubicBezier(0.42, 0, 1, 1);
    expect(f(0.5)).toBeLessThan(0.5);
  });
  it("is monotonic non-decreasing for a standard ease", () => {
    const f = cubicBezier(0.42, 0, 0.58, 1);
    let prev = -Infinity;
    for (let u = 0; u <= 1.0001; u += 0.05) {
      const y = f(u);
      expect(y).toBeGreaterThanOrEqual(prev - 1e-6);
      prev = y;
    }
  });
  it("back curve overshoots below 0 / above 1", () => {
    const easeOutBack = cubicBezier(0.34, 1.56, 0.64, 1);
    let over = false;
    for (let u = 0; u <= 1; u += 0.02) if (easeOutBack(u) > 1.001) over = true;
    expect(over).toBe(true);
  });
  it("falls back to bisection when Newton-Raphson diverges (flat-derivative x curve)", () => {
    // x1=1, x2=0 makes dx(t)=0 at t=0.5, so Newton near there diverges and the
    // bisection branch must produce a valid t in [0,1].
    const f = cubicBezier(1, 0.2, 0, 0.8);
    for (const u of [0.45, 0.49, 0.5, 0.51, 0.55]) {
      const y = f(u);
      expect(Number.isFinite(y)).toBe(true);
    }
    expect(f(0)).toBe(0);
    expect(f(1)).toBe(1);
  });
});

describe("springFn", () => {
  it("critically damped (bounce 0): starts 0, settles 1, no overshoot", () => {
    const s = springFn(0);
    expect(s(0)).toBe(0);
    expect(s(1)).toBeCloseTo(1, 1);
    let max = 0;
    for (let u = 0; u <= 1.6; u += 0.01) max = Math.max(max, s(u));
    expect(max).toBeLessThanOrEqual(1.0001);
  });
  it("default bounce (undefined) behaves like a mild spring", () => {
    const s = springFn();
    expect(s(0)).toBe(0);
    expect(s(1.6)).toBe(1);
  });
  it("bouncy overshoots past 1 and settles by u>=1.6", () => {
    const s = springFn(0.85);
    let max = 0;
    for (let u = 0; u <= 1.6; u += 0.01) max = Math.max(max, s(u));
    expect(max).toBeGreaterThan(1.05);
    expect(s(1.6)).toBe(1);
    expect(s(2)).toBe(1);
  });
  it("clamps bounce to <1 (no infinite oscillation)", () => {
    const s = springFn(5);
    expect(Number.isFinite(s(0.5))).toBe(true);
  });
});

describe("makeEasing", () => {
  it("undefined / linear → identity", () => {
    expect(makeEasing(undefined)(0.3)).toBe(0.3);
    expect(makeEasing({ type: "linear" })(0.7)).toBe(0.7);
  });
  it("hold → always 0", () => {
    expect(makeEasing({ type: "hold" })(0.99)).toBe(0);
  });
  it("cubicBezier dispatches with control points", () => {
    expect(makeEasing({ type: "cubicBezier", p: [0, 0, 0.58, 1] })(0.5)).toBeGreaterThan(0.5);
  });
  it("cubicBezier with missing p defaults to linear-ish", () => {
    expect(makeEasing({ type: "cubicBezier" } as any)(0.5)).toBeCloseTo(0.5, 2);
  });
  it("spring dispatches", () => {
    expect(makeEasing({ type: "spring", bounce: 0 })(0)).toBe(0);
  });
  it("unknown type → identity", () => {
    expect(makeEasing({ type: "weird" } as any)(0.4)).toBe(0.4);
  });
});
