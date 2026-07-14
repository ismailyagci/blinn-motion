import { describe, it, expect } from "vitest";
import { flattenPath, polylineLength, slicePolyline, trimmedPath2D } from "./path-trim.js";

describe("flattenPath", () => {
  it("flattens a simple polyline", () => {
    const pts = flattenPath("M0 0 L10 0 L10 10");
    expect(pts.length).toBe(3);
    expect(pts[0]).toEqual({ x: 0, y: 0 });
    expect(pts[2]).toEqual({ x: 10, y: 10 });
  });
  it("handles relative commands and close", () => {
    const pts = flattenPath("M0 0 l10 0 l0 10 z");
    expect(pts.length).toBeGreaterThanOrEqual(3);
    expect(pts[pts.length - 1]).toEqual({ x: 0, y: 0 });
  });
  it("samples cubic beziers into multiple points", () => {
    const pts = flattenPath("M0 0 C 0 10, 10 10, 10 0");
    expect(pts.length).toBeGreaterThan(3);
  });
});

describe("slicePolyline", () => {
  it("takes the second half of a unit line", () => {
    const pts = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
    ];
    const half = slicePolyline(pts, 0.5, 1);
    expect(half[0]!.x).toBeCloseTo(50, 5);
    expect(half[half.length - 1]!.x).toBeCloseTo(100, 5);
  });
  it("returns empty when end <= start", () => {
    expect(slicePolyline([{ x: 0, y: 0 }, { x: 1, y: 0 }], 0.8, 0.2)).toEqual([]);
  });
});

describe("polylineLength", () => {
  it("sums segment lengths", () => {
    expect(
      polylineLength([
        { x: 0, y: 0 },
        { x: 3, y: 0 },
        { x: 3, y: 4 },
      ]),
    ).toBeCloseTo(7, 5);
  });
});

describe("trimmedPath2D", () => {
  it("builds a Path2D for a partial stroke when Path2D exists", () => {
    const moves: Array<[number, number]> = [];
    const lines: Array<[number, number]> = [];
    const had = "Path2D" in globalThis;
    (globalThis as any).Path2D = class {
      moveTo(x: number, y: number) {
        moves.push([x, y]);
      }
      lineTo(x: number, y: number) {
        lines.push([x, y]);
      }
    };
    try {
      const p = trimmedPath2D("M0 0 L100 0", 0, 0.5);
      expect(p).not.toBeNull();
      expect(moves.length).toBe(1);
      expect(moves[0]![0]).toBeCloseTo(0, 5);
      expect(lines.length).toBeGreaterThanOrEqual(1);
      expect(lines[lines.length - 1]![0]).toBeCloseTo(50, 5);
    } finally {
      if (!had) delete (globalThis as any).Path2D;
    }
  });
});
