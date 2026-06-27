import { describe, it, expect } from "vitest";
import { sample, walk, findNode } from "./sample.js";
import type { MotionDoc } from "./types.js";

const hold = (t: number, v: any) => ({ t, v, easing: { type: "hold" as const } });
const doc = (layers: any[], extra: Partial<MotionDoc> = {}): MotionDoc => ({ duration: 1, layers, ...extra });
const n0 = (d: MotionDoc, t = 0) => sample(d, t).nodes[0]!;

describe("sample tree shape", () => {
  it("carries duration, time and a default stage", () => {
    const tree = sample(doc([]), 0.3);
    expect(tree.duration).toBe(1);
    expect(tree.time).toBe(0.3);
    expect(tree.stage).toEqual({ width: 300, height: 300, background: "#00000000" });
    expect(tree.nodes).toEqual([]);
  });
  it("keeps a provided stage and recurses children", () => {
    const tree = sample(doc([{ id: "p", type: "group", base: { width: 10, height: 10 }, children: [{ id: "c", type: "rect", base: {} }] }], { stage: { width: 5, height: 6 } }), 0);
    expect(tree.stage).toEqual({ width: 5, height: 6 });
    expect(tree.nodes[0]!.children[0]!.id).toBe("c");
  });
  it("uses layer.id as name fallback", () => {
    expect(n0(doc([{ id: "x", type: "rect", base: {} }])).name).toBe("x");
  });
});

describe("sample fill / text overrides", () => {
  it("solid fillColor override replaces a solid/empty fill (non-text)", () => {
    const node = n0(doc([{ id: "r", type: "rect", base: { fill: { type: "solid", color: "#000000FF" } }, tracks: [{ property: "fillColor", op: "set", keys: [hold(0, "#FF0000FF"), { t: 1, v: "#FF0000FF" }] }] }]), 0.5);
    expect(node.fill).toEqual({ type: "solid", color: { r: 255, g: 0, b: 0, a: 1 } });
  });
  it("fillColor override does NOT clobber a gradient fill", () => {
    const node = n0(doc([{ id: "r", type: "rect", base: { fill: { type: "linear", stops: [{ pos: 0, color: "#000" }] } }, tracks: [{ property: "fillColor", op: "set", keys: [hold(0, "#FF0000FF"), { t: 1, v: "#FF0000FF" }] }] }]), 0.5);
    expect(node.fill!.type).toBe("linear");
  });
  it("fillColor override on text recolors the text", () => {
    const node = n0(doc([{ id: "t", type: "text", base: { text: { characters: "Hi", color: "#000000FF" } }, tracks: [{ property: "fillColor", op: "set", keys: [hold(0, "#00FF00FF"), { t: 1, v: "#00FF00FF" }] }] }]), 0.5);
    expect(node.text!.color).toEqual({ r: 0, g: 255, b: 0, a: 1 });
  });
  it("applies animated gradient stop overrides", () => {
    const node = n0(doc([{ id: "r", type: "rect", base: { fill: { type: "linear", stops: [{ pos: 0, color: "#000000FF" }, { pos: 1, color: "#FFFFFFFF" }] } }, tracks: [{ property: "fillStop:0:color", op: "set", keys: [hold(0, "#FF0000FF"), { t: 1, v: "#FF0000FF" }] }, { property: "fillStop:0:pos", op: "set", keys: [hold(0, 0.2), { t: 1, v: 0.2 }] }] }]), 0.5);
    const f = node.fill as any;
    expect(f.stops[0].color).toEqual({ r: 255, g: 0, b: 0, a: 1 });
    expect(f.stops[0].pos).toBe(0.2);
  });
});

describe("sample stroke / effects / blend / shape", () => {
  it("resolved stroke uses animated weight + per-side sides", () => {
    const node = n0(doc([{ id: "r", type: "rect", base: { stroke: { color: "#000000FF", weight: 2 } }, tracks: [{ property: "borderTopWeight", op: "set", keys: [hold(0, 9), { t: 1, v: 9 }] }] }]), 0.5);
    expect(node.stroke!.sides).toEqual([9, 2, 2, 2]);
  });
  it("animated effect override flows to resolved effects", () => {
    const node = n0(doc([{ id: "r", type: "rect", base: { effects: [{ type: "drop", x: 0, y: 0, radius: 0, color: "#000000FF" }] }, tracks: [{ property: "effect:0:radius", op: "set", keys: [hold(0, 14), { t: 1, v: 14 }] }] }]), 0.5);
    expect((node.effects[0] as any).radius).toBe(14);
  });
  it("blendMode passthrough (default normal)", () => {
    expect(n0(doc([{ id: "r", type: "rect", base: { blendMode: "overlay" } }])).blendMode).toBe("overlay");
    expect(n0(doc([{ id: "r", type: "rect", base: {} }])).blendMode).toBe("normal");
  });
  it("arc shape → polygon clip; ellipse → ellipse clip; default → rect", () => {
    expect(n0(doc([{ id: "a", type: "ellipse", base: { shape: { kind: "arc", startAngle: 0, endAngle: 180 } } }])).clipShape.kind).toBe("polygon");
    expect(n0(doc([{ id: "e", type: "ellipse", base: {} }])).clipShape.kind).toBe("ellipse");
    expect(n0(doc([{ id: "r", type: "rect", base: { cornerRadius: [2, 2, 2, 2] } }])).clipShape.kind).toBe("rect");
  });
  it("passes image + shader through", () => {
    const node = n0(doc([{ id: "r", type: "rect", base: { image: "x.png", shader: { kind: "noise" } } }]));
    expect(node.image).toBe("x.png");
    expect(node.shader).toEqual({ kind: "noise" });
  });
  it("marks masks", () => {
    expect(n0(doc([{ id: "m", type: "rect", base: {}, isMask: true }])).isMask).toBe(true);
  });
  it("stop overrides apply to a radial gradient too", () => {
    const node = n0(doc([{ id: "r", type: "rect", base: { fill: { type: "radial", stops: [{ pos: 0, color: "#000000FF" }] } }, tracks: [{ property: "fillStop:0:color", op: "set", keys: [hold(0, "#FF0000FF"), { t: 1, v: "#FF0000FF" }] }] }]), 0.5);
    expect((node.fill as any).stops[0].color).toEqual({ r: 255, g: 0, b: 0, a: 1 });
  });
  it("image fill resolves and ignores stop overrides", () => {
    const node = n0(doc([{ id: "r", type: "rect", base: { fill: { type: "image", src: "y.png" } }, tracks: [{ property: "fillStop:0:color", op: "set", keys: [hold(0, "#FF0000FF"), { t: 1, v: "#FF0000FF" }] }] }]), 0.5);
    expect(node.fill).toMatchObject({ type: "image", src: "y.png" });
  });
  it("animated stroke weight (no per-side) flows to stroke.weight", () => {
    const node = n0(doc([{ id: "r", type: "rect", base: { stroke: { color: "#000000FF", weight: 1 } }, tracks: [{ property: "strokeWeight", op: "set", keys: [hold(0, 7), { t: 1, v: 7 }] }] }]), 0.5);
    expect(node.stroke!.weight).toBe(7);
    expect(node.stroke!.sides).toBeNull();
  });
  it("star shape resolves to a polygon clip", () => {
    expect(n0(doc([{ id: "s", type: "vector", base: { shape: { kind: "star", points: 5, ratio: 0.4 } } }])).clipShape.kind).toBe("polygon");
  });
});

describe("walk / findNode", () => {
  const tree = sample(doc([{ id: "a", type: "group", base: {}, children: [{ id: "b", type: "rect", base: {} }, { id: "c", type: "group", base: {}, children: [{ id: "d", type: "rect", base: {} }] }] }]), 0);
  it("walk visits every node with increasing depth", () => {
    const seen: Array<[string, number]> = [];
    walk(tree, (n, depth) => seen.push([n.id, depth]));
    expect(seen).toEqual([["a", 0], ["b", 1], ["c", 1], ["d", 2]]);
  });
  it("findNode returns the matching node or null", () => {
    expect(findNode(tree, "d")!.id).toBe("d");
    expect(findNode(tree, "missing")).toBeNull();
  });
});
