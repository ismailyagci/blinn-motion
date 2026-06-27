import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  sample,
  type MotionDoc,
  type RenderNode,
  type RenderTree,
} from "@fottie/core";
import { drawTree } from "./index.js";

const here = dirname(fileURLToPath(import.meta.url));
const doc = JSON.parse(readFileSync(join(here, "../../../fixtures/card.motion.json"), "utf8")) as MotionDoc;

/** A 2D-context stand-in that records the operations drawTree issues. */
function mockCtx() {
  const calls: Record<string, number> = {};
  const fillStyles: unknown[] = [];
  const rec = (name: string) => (calls[name] = (calls[name] || 0) + 1);
  const handler: ProxyHandler<Record<string, unknown>> = {
    get(target, prop: string) {
      if (prop in target) return (target as any)[prop];
      if (prop === "fillStyle") return undefined;
      return (..._args: unknown[]) => {
        rec(prop);
        if (
          prop === "createLinearGradient" ||
          prop === "createRadialGradient" ||
          prop === "createConicGradient"
        )
          return { addColorStop: () => rec("addColorStop") };
        return undefined;
      };
    },
    set(_t, prop: string, value) {
      rec("set:" + prop);
      if (prop === "fillStyle") fillStyles.push(value);
      return true;
    },
  };
  const ctx = new Proxy({} as Record<string, unknown>, handler);
  return { ctx: ctx as unknown as CanvasRenderingContext2D, calls, fillStyles };
}

/** A minimal resolved node with sane defaults for the synthetic-tree tests. */
function node(overrides: Partial<RenderNode>): RenderNode {
  return {
    id: "n",
    name: "n",
    type: "rect",
    x: 0,
    y: 0,
    width: 100,
    height: 100,
    anchor: { x: 0.5, y: 0.5 },
    translateX: 0,
    translateY: 0,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    opacity: 1,
    fill: null,
    stroke: null,
    cornerRadius: [0, 0, 0, 0],
    effects: [],
    blendMode: "normal",
    clip: false,
    clipShape: { kind: "rect", cornerRadius: [0, 0, 0, 0] },
    text: null,
    shape: null,
    shapeCount: null,
    image: null,
    shader: null,
    trimStart: 0,
    trimEnd: 1,
    isMask: false,
    children: [],
    ...overrides,
  };
}

function tree(nodes: RenderNode[]): RenderTree {
  return { duration: 1, stage: { width: 200, height: 200 }, time: 0, nodes };
}

describe("@fottie/canvas drawTree", () => {
  it("paints the sample tree without throwing and clears + fills", () => {
    const m = mockCtx();
    expect(() => drawTree(m.ctx, sample(doc, 0.4), 2)).not.toThrow();
    expect(m.calls.setTransform).toBeGreaterThan(0);
    expect(m.calls.clearRect).toBe(1);
    expect(m.calls.fill).toBeGreaterThanOrEqual(1); // card + badge fills
  });

  it("applies transforms (translate/rotate/scale) per node", () => {
    const m = mockCtx();
    drawTree(m.ctx, sample(doc, 0.4), 1);
    expect(m.calls.translate).toBeGreaterThan(0);
    expect(m.calls.rotate).toBeGreaterThan(0);
    expect(m.calls.scale).toBeGreaterThan(0);
    expect(m.calls.save).toBe(m.calls.restore); // balanced
  });

  it("draws the title text via fillText", () => {
    const m = mockCtx();
    drawTree(m.ctx, sample(doc, 1.0), 1);
    expect(m.calls.fillText).toBeGreaterThanOrEqual(1);
  });

  it("uses a gradient for the card's linear fill", () => {
    const m = mockCtx();
    drawTree(m.ctx, sample(doc, 1.0), 1);
    expect(m.calls.createLinearGradient).toBeGreaterThanOrEqual(1);
  });

  it("uses createRadialGradient for a radial fill", () => {
    const m = mockCtx();
    const n = node({
      fill: {
        type: "radial",
        angle: 0,
        center: { x: 0.5, y: 0.5 },
        radius: 0.5,
        stops: [
          { pos: 0, color: { r: 255, g: 0, b: 0, a: 1 } },
          { pos: 1, color: { r: 0, g: 0, b: 255, a: 1 } },
        ],
      },
    });
    drawTree(m.ctx, tree([n]), 1);
    expect(m.calls.createRadialGradient).toBeGreaterThanOrEqual(1);
  });

  it("uses createConicGradient for an angular fill", () => {
    const m = mockCtx();
    const n = node({
      fill: {
        type: "angular",
        angle: 45,
        center: { x: 0.5, y: 0.5 },
        radius: 0.5,
        stops: [
          { pos: 0, color: { r: 255, g: 0, b: 0, a: 1 } },
          { pos: 1, color: { r: 0, g: 255, b: 0, a: 1 } },
        ],
      },
    });
    drawTree(m.ctx, tree([n]), 1);
    expect(m.calls.createConicGradient).toBeGreaterThanOrEqual(1);
  });

  it("sets globalCompositeOperation for a multiply blend mode", () => {
    const m = mockCtx();
    const n = node({
      blendMode: "multiply",
      fill: { type: "solid", color: { r: 0, g: 0, b: 0, a: 1 } },
    });
    drawTree(m.ctx, tree([n]), 1);
    expect(m.calls["set:globalCompositeOperation"]).toBeGreaterThanOrEqual(1);
  });

  it("strokes each edge separately for differing per-side borders", () => {
    const m = mockCtx();
    const n = node({
      fill: { type: "solid", color: { r: 0, g: 0, b: 0, a: 1 } },
      stroke: { color: { r: 255, g: 0, b: 0, a: 1 }, weight: 2, sides: [4, 1, 4, 1] },
    });
    expect(() => drawTree(m.ctx, tree([n]), 1)).not.toThrow();
    // 4 edges with weight > 0 → one stroke per side.
    expect(m.calls.stroke).toBeGreaterThanOrEqual(4);
  });

  it("renders noise / inner / glass effects without throwing", () => {
    const m = mockCtx();
    const n = node({
      fill: { type: "solid", color: { r: 10, g: 20, b: 30, a: 1 } },
      effects: [
        { type: "inner", x: 0, y: 2, radius: 4, spread: 1, color: { r: 0, g: 0, b: 0, a: 0.5 } },
        { type: "glass", radius: 8, color: { r: 255, g: 255, b: 255, a: 0.2 } },
        { type: "noise", size: 4, density: 0.5, color: { r: 0, g: 0, b: 0, a: 1 } },
      ],
    });
    expect(() => drawTree(m.ctx, tree([n]), 1)).not.toThrow();
    expect(m.calls.fillRect).toBeGreaterThanOrEqual(1); // noise dots
    expect(m.calls.save).toBe(m.calls.restore); // balanced
  });
});
