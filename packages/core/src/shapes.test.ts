import { describe, it, expect } from "vitest";
import { polygonVertices, starVertices, arcVertices, verticesToClipPath } from "./shapes.js";

const inUnit = (v: [number, number][]) =>
  v.every(([x, y]) => x >= -0.001 && x <= 1.001 && y >= -0.001 && y <= 1.001);

describe("polygonVertices", () => {
  it("integer n yields exactly n vertices in the unit square", () => {
    for (const n of [3, 4, 5, 6, 8]) {
      const v = polygonVertices(n);
      expect(v).toHaveLength(n);
      expect(inUnit(v)).toBe(true);
    }
  });
  it("clamps n < 3 up to a triangle", () => {
    expect(polygonVertices(2)).toHaveLength(3);
    expect(polygonVertices(0)).toHaveLength(3);
  });
  it("a triangle's top vertex is centered at the top", () => {
    const v = polygonVertices(3);
    // first vertex at angle -90° → (0.5, 0.0)
    expect(v[0]![0]).toBeCloseTo(0.5, 5);
    expect(v[0]![1]).toBeCloseTo(0, 5);
  });
  it("fractional n samples the perimeter (samples+1 points)", () => {
    const v = polygonVertices(3.5, 0, 24);
    expect(v.length).toBe(25);
    expect(inUnit(v)).toBe(true);
  });
  it("rotation shifts vertices", () => {
    const a = polygonVertices(4, 0);
    const b = polygonVertices(4, 45);
    expect(a[0]).not.toEqual(b[0]);
  });
});

describe("starVertices", () => {
  it("n-point star has 2n vertices alternating outer/inner radius", () => {
    const v = starVertices(5, 0.4);
    expect(v).toHaveLength(10);
    expect(inUnit(v)).toBe(true);
  });
  it("default ratio works and clamps n<3", () => {
    expect(starVertices(2).length).toBe(6);
  });
});

describe("arcVertices", () => {
  it("full circle pie closes through the center", () => {
    const v = arcVertices(0, 360, 0);
    expect(v.length).toBeGreaterThan(8);
    // last point is the center for a pie
    expect(v[v.length - 1]).toEqual([0.5, 0.5]);
    expect(inUnit(v)).toBe(true);
  });
  it("donut sector (innerRadius>0) traces outer then inner arc, no center point", () => {
    const v = arcVertices(0, 180, 0.5);
    expect(v.length).toBeGreaterThan(4);
    // no exact center vertex in a donut
    expect(v.some(([x, y]) => x === 0.5 && y === 0.5)).toBe(false);
    expect(inUnit(v)).toBe(true);
  });
  it("smaller span yields fewer samples", () => {
    const small = arcVertices(0, 30, 0);
    const big = arcVertices(0, 360, 0);
    expect(small.length).toBeLessThan(big.length);
  });
  it("defaults to a full pie", () => {
    expect(arcVertices().length).toBeGreaterThan(8);
  });
});

describe("verticesToClipPath", () => {
  it("formats a polygon() with percentages", () => {
    const s = verticesToClipPath([
      [0, 0],
      [1, 0],
      [0.5, 1],
    ]);
    expect(s).toBe("polygon(0.00% 0.00%, 100.00% 0.00%, 50.00% 100.00%)");
  });
});
