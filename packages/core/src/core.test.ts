import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  cubicBezier,
  springFn,
  parseColor,
  lerpColor,
  rgbaToCss,
  evalTrack,
  sample,
  findNode,
  computeLayer,
  polygonVertices,
  type MotionDoc,
} from "./index.js";

const here = dirname(fileURLToPath(import.meta.url));
const doc = JSON.parse(
  readFileSync(join(here, "../../../fixtures/card.motion.json"), "utf8"),
) as MotionDoc;

describe("easing", () => {
  it("linear bezier midpoint = 0.5", () => {
    const lin = cubicBezier(0, 0, 1, 1);
    expect(lin(0.5)).toBeCloseTo(0.5, 3);
    expect(lin(0)).toBe(0);
    expect(lin(1)).toBe(1);
  });
  it("easeOut is ahead of linear at u=0.5", () => {
    expect(cubicBezier(0, 0, 0.58, 1)(0.5)).toBeGreaterThan(0.5);
  });
  it("spring(0) settles ~1 and starts at 0", () => {
    const s = springFn(0);
    expect(s(0)).toBe(0);
    expect(s(1)).toBeCloseTo(1, 1);
  });
  it("spring(0.8) overshoots past 1", () => {
    const s = springFn(0.8);
    let overshot = false;
    for (let u = 0; u <= 1; u += 0.02) if (s(u) > 1.02) overshot = true;
    expect(overshot).toBe(true);
  });
});

describe("color", () => {
  it("parses #RRGGBBAA alpha", () => {
    expect(parseColor("#FF000080").a).toBeCloseTo(128 / 255, 3);
  });
  it("lerp red->blue midpoint is purple-ish", () => {
    expect(lerpColor("#FF0000FF", "#0000FFFF", 0.5)).toMatch(/rgba\(12[0-9],0,12[0-9]/);
  });
  it("rgba() string round-trips (regression: not mangled to faint green)", () => {
    const p = parseColor("rgba(223,183,183,1)");
    expect([p.r, p.g, p.b]).toEqual([223, 183, 183]);
  });
  it("animated color round-trip (lerp -> parse) stays purple, not green", () => {
    const p = parseColor(lerpColor("#FF0000FF", "#0000FFFF", 0.5));
    expect(Math.abs(p.r - 127.5)).toBeLessThanOrEqual(1);
    expect(p.g).toBe(0);
    expect(Math.abs(p.b - 127.5)).toBeLessThanOrEqual(1);
  });
});

describe("track eval + op", () => {
  it("offset op adds base", () => {
    expect(
      evalTrack({ property: "x", op: "offset", base: 10, keys: [{ t: 0, v: 5, easing: { type: "hold" } }, { t: 1, v: 5 }] }, 0),
    ).toBe(15);
  });
  it("scale op multiplies base", () => {
    expect(
      evalTrack({ property: "s", op: "scale", base: 2, keys: [{ t: 0, v: 3, easing: { type: "hold" } }, { t: 1, v: 3 }] }, 0),
    ).toBe(6);
  });
  it("hold easing keeps from-value mid-segment", () => {
    expect(
      evalTrack({ property: "o", op: "set", base: 0, keys: [{ t: 0, v: 0, easing: { type: "hold" } }, { t: 1, v: 1 }] }, 0.5),
    ).toBe(0);
  });
  it("linear midpoint interpolates", () => {
    expect(
      evalTrack({ property: "o", op: "set", base: 0, keys: [{ t: 0, v: 0, easing: { type: "linear" } }, { t: 1, v: 10 }] }, 0.5),
    ).toBeCloseTo(5, 3);
  });
});

describe("sample doc invariants (fixtures/card.motion.json)", () => {
  it("card at t=0: opacity ~0, translateY 80, scale 0.7", () => {
    const card = findNode(sample(doc, 0), "card")!;
    expect(card.opacity).toBeCloseTo(0, 1);
    expect(card.translateY).toBeCloseTo(80, 1);
    expect(card.scaleX).toBeCloseTo(0.7, 2);
  });
  it("card at t=0.8: opacity 1, translateY ~0, scale ~1", () => {
    const card = findNode(sample(doc, 0.8), "card")!;
    expect(card.opacity).toBeCloseTo(1, 2);
    expect(card.translateY).toBeCloseTo(0, 0);
    expect(card.scaleX).toBeCloseTo(1, 1);
  });
  it("badge rotation = 360 at end", () => {
    const badge = findNode(sample(doc, 1.6), "badge")!;
    expect(badge.rotation).toBeCloseTo(360, 1);
  });
  it("title opacity held 0 before its first key, 1 after fade", () => {
    expect(findNode(sample(doc, 0.4), "title")!.opacity).toBeCloseTo(0, 2);
    expect(findNode(sample(doc, 1.0), "title")!.opacity).toBeCloseTo(1, 2);
  });
  it("badge fill animates to cyan-ish by t=1.0 (override applied to resolved fill)", () => {
    const badge = findNode(sample(doc, 1.0), "badge")!;
    expect(badge.fill?.type).toBe("solid");
    const css = rgbaToCss((badge.fill as { color: any }).color);
    // #22D3EE ~ rgb(34,211,238)
    expect(css).toMatch(/rgba\(3[0-9],2/);
  });
});

describe("compute + shapes", () => {
  it("computeLayer returns base-merged state", () => {
    const s = computeLayer({ id: "x", type: "rect", base: { width: 100, scaleX: 2 } }, 0);
    expect(s.width).toBe(100);
    expect(s.scaleX).toBe(2);
    expect(s.opacity).toBe(1);
  });
  it("polygonVertices(3) yields 3 unit-square points", () => {
    const v = polygonVertices(3);
    expect(v).toHaveLength(3);
    for (const [x, y] of v) {
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThanOrEqual(1);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThanOrEqual(1);
    }
  });
});
