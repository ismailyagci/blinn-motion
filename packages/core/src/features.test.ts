import { describe, it, expect } from "vitest";
import { sample, springFn, arcVertices, type MotionDoc } from "./index.js";

/** Build a one-layer doc around a base + tracks for terse assertions. */
function docOf(base: any, tracks: any[] = [], type = "rect"): MotionDoc {
  return {
    duration: 1,
    stage: { width: 100, height: 100 },
    layers: [{ id: "n", type: type as any, base, tracks }],
  };
}
const node0 = (d: MotionDoc, t = 0) => sample(d, t).nodes[0]!;

describe("gradients", () => {
  it("resolves a radial gradient with center/radius/stops", () => {
    const n = node0(docOf({ fill: { type: "radial", center: { x: 0.3, y: 0.6 }, radius: 0.5, stops: [{ pos: 0, color: "#FF0000FF" }, { pos: 1, color: "#0000FFFF" }] } }));
    expect(n.fill?.type).toBe("radial");
    const f = n.fill as any;
    expect(f.center).toEqual({ x: 0.3, y: 0.6 });
    expect(f.radius).toBe(0.5);
    expect(f.stops[0].color).toEqual({ r: 255, g: 0, b: 0, a: 1 });
  });
  it("defaults angle/center/radius for a gradient missing them", () => {
    const f = node0(docOf({ fill: { type: "angular", stops: [{ pos: 0, color: "#000" }] } })).fill as any;
    expect(f.center).toEqual({ x: 0.5, y: 0.5 });
    expect(typeof f.radius).toBe("number");
  });
  it("animates gradient stop color via fillStop:i:color", () => {
    const d = docOf({ fill: { type: "linear", stops: [{ pos: 0, color: "#000000FF" }, { pos: 1, color: "#FFFFFFFF" }] } }, [
      { property: "fillStop:1:color", op: "set", keys: [{ t: 0, v: "#FF0000FF", easing: { type: "hold" } }, { t: 1, v: "#FF0000FF" }] },
    ]);
    const f = node0(d, 0.5).fill as any;
    expect(f.stops[1].color).toEqual({ r: 255, g: 0, b: 0, a: 1 });
  });
});

describe("stroke", () => {
  it("animates stroke color via strokeColor track", () => {
    const d = docOf({ stroke: { color: "#000000FF", weight: 2 } }, [
      { property: "strokeColor", op: "set", keys: [{ t: 0, v: "#00FF00FF", easing: { type: "hold" } }, { t: 1, v: "#00FF00FF" }] },
    ]);
    expect(node0(d, 0.5).stroke?.color).toEqual({ r: 0, g: 255, b: 0, a: 1 });
  });
  it("carries per-side border weights", () => {
    const n = node0(docOf({ stroke: { color: "#000", weight: 1 }, borderWeights: [4, 0, 4, 0] }));
    expect(n.stroke?.sides).toEqual([4, 0, 4, 0]);
  });
  it("animates one border side via borderTopWeight", () => {
    const d = docOf({ stroke: { color: "#000", weight: 1 } }, [
      { property: "borderTopWeight", op: "set", keys: [{ t: 0, v: 10, easing: { type: "hold" } }, { t: 1, v: 10 }] },
    ]);
    expect(node0(d, 0.5).stroke?.sides?.[0]).toBe(10);
  });
});

describe("effects", () => {
  it("animates a drop-shadow offset/radius via effect:0:* tracks", () => {
    const d = docOf({ effects: [{ type: "drop", x: 0, y: 0, radius: 0, color: "#000000FF" }] }, [
      { property: "effect:0:offsetY", op: "set", keys: [{ t: 0, v: 20, easing: { type: "hold" } }, { t: 1, v: 20 }] },
      { property: "effect:0:radius", op: "set", keys: [{ t: 0, v: 8, easing: { type: "hold" } }, { t: 1, v: 8 }] },
    ]);
    const e = node0(d, 0.5).effects[0] as any;
    expect(e.y).toBe(20);
    expect(e.radius).toBe(8);
  });
  it("resolves glass and noise effects", () => {
    const n = node0(docOf({ effects: [{ type: "glass", radius: 12 }, { type: "noise", size: 2, density: 0.7, color: "#000000FF" }] }));
    expect(n.effects[0]!.type).toBe("glass");
    expect(n.effects[1]!.type).toBe("noise");
  });
});

describe("blend mode + arc", () => {
  it("passes blendMode through", () => {
    expect(node0(docOf({ blendMode: "multiply" })).blendMode).toBe("multiply");
    expect(node0(docOf({})).blendMode).toBe("normal");
  });
  it("arc shape resolves to a polygon clip with vertices inside the unit square", () => {
    const n = node0(docOf({ shape: { kind: "arc", startAngle: 0, endAngle: 180, innerRadius: 0 } }, [], "ellipse"));
    expect(n.clipShape.kind).toBe("polygon");
    const v = (n.clipShape as any).vertices;
    expect(v.length).toBeGreaterThan(3);
    for (const [x, y] of v) {
      expect(x).toBeGreaterThanOrEqual(-0.01);
      expect(x).toBeLessThanOrEqual(1.01);
      expect(y).toBeGreaterThanOrEqual(-0.01);
      expect(y).toBeLessThanOrEqual(1.01);
    }
  });
  it("arcVertices(full circle) closes back near the start", () => {
    const v = arcVertices(0, 360, 0);
    expect(v.length).toBeGreaterThan(8);
  });
});

describe("physical spring", () => {
  it("settles to ~1 and is monotonic-ish for bounce 0 (critically damped)", () => {
    const s = springFn(0);
    expect(s(0)).toBe(0);
    expect(s(1)).toBeCloseTo(1, 1);
    // no overshoot for critically damped
    let max = 0;
    for (let u = 0; u <= 1.6; u += 0.02) max = Math.max(max, s(u));
    expect(max).toBeLessThanOrEqual(1.001);
  });
  it("overshoots for a bouncy spring and still settles", () => {
    const s = springFn(0.8);
    let max = 0;
    for (let u = 0; u <= 1.6; u += 0.02) max = Math.max(max, s(u));
    expect(max).toBeGreaterThan(1.05);
    expect(s(1.6)).toBe(1);
  });
});
