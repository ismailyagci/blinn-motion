import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  arcVertices,
  sample,
  type MotionDoc,
  type RenderNode,
  type RenderTree,
} from "@blinn-motion/core";
import { drawTree } from "./index.js";

const here = dirname(fileURLToPath(import.meta.url));
const doc = JSON.parse(readFileSync(join(here, "../../../fixtures/card.motion.json"), "utf8")) as MotionDoc;

/** A 2D-context stand-in that records the operations drawTree issues. */
function mockCtx() {
  const calls: Record<string, number> = {};
  const fillStyles: unknown[] = [];
  const conicArgs: number[][] = [];
  const rec = (name: string) => (calls[name] = (calls[name] || 0) + 1);
  const handler: ProxyHandler<Record<string, unknown>> = {
    get(target, prop: string) {
      if (prop in target) return (target as any)[prop];
      if (prop === "fillStyle") return undefined;
      return (...args: unknown[]) => {
        rec(prop);
        if (prop === "createConicGradient") {
          conicArgs.push(args as number[]);
          return { addColorStop: () => rec("addColorStop") };
        }
        if (prop === "createLinearGradient" || prop === "createRadialGradient")
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
  return { ctx: ctx as unknown as CanvasRenderingContext2D, calls, fillStyles, conicArgs };
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

describe("@blinn-motion/canvas drawTree", () => {
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

  it("maps CSS conic 0deg (up) to canvas start angle -π/2 (from +x)", () => {
    // CSS: 0deg = 12 o'clock; Canvas createConicGradient: 0 = 3 o'clock.
    // MotionDoc angles follow CSS, so canvas θ = (cssAngle - 90)°.
    const m = mockCtx();
    const n = node({
      width: 100,
      height: 100,
      fill: {
        type: "angular",
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
    expect(m.conicArgs.length).toBeGreaterThanOrEqual(1);
    const [start, x, y] = m.conicArgs[0]!;
    expect(start).toBeCloseTo(-Math.PI / 2, 5);
    expect(x).toBeCloseTo(50, 5);
    expect(y).toBeCloseTo(50, 5);
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

  it("strokes a uniform border exactly once via the box path", () => {
    const m = mockCtx();
    const n = node({
      fill: { type: "solid", color: { r: 0, g: 0, b: 0, a: 1 } },
      stroke: { color: { r: 255, g: 0, b: 0, a: 1 }, weight: 3, sides: null },
    });
    drawTree(m.ctx, tree([n]), 1);
    expect(m.calls.stroke).toBe(1);
  });

  it("treats equal per-side weights as a single uniform stroke (not 4 edges)", () => {
    const m = mockCtx();
    const n = node({
      stroke: { color: { r: 0, g: 0, b: 0, a: 1 }, weight: 3, sides: [3, 3, 3, 3] },
    });
    drawTree(m.ctx, tree([n]), 1);
    expect(m.calls.stroke).toBe(1);
  });

  it("falls back to a uniform stroke for per-side weights on a non-rect shape", () => {
    const m = mockCtx();
    const n = node({
      clipShape: { kind: "ellipse" },
      stroke: { color: { r: 0, g: 0, b: 0, a: 1 }, weight: 3, sides: [10, 1, 10, 1] },
    });
    drawTree(m.ctx, tree([n]), 1);
    expect(m.calls.stroke).toBe(1); // not 4 separate edges (clip shape isn't a rect)
    expect(m.calls.ellipse).toBeGreaterThanOrEqual(1);
  });

  it("traces an arc/polygon clip shape with moveTo + per-vertex lineTo", () => {
    const m = mockCtx();
    const verts = arcVertices(-90, 200, 0.45);
    const n = node({
      fill: { type: "solid", color: { r: 52, g: 211, b: 153, a: 1 } },
      clipShape: { kind: "polygon", vertices: verts },
    });
    drawTree(m.ctx, tree([n]), 1);
    expect(m.calls.lineTo).toBeGreaterThanOrEqual(verts.length - 1);
    expect(m.calls.fill).toBeGreaterThanOrEqual(1);
  });

  it("strokes a PATH_TRIM vector node via pure-JS path flatten (no SVG)", () => {
    // Node env has no document → pure-JS trimmedPath2D builds the visible subpath.
    const moves: number[] = [];
    const hadPath2D = "Path2D" in globalThis;
    (globalThis as any).Path2D = class {
      constructor(_d?: string) {}
      moveTo(x: number, _y: number) {
        moves.push(x);
      }
      lineTo(_x: number, _y: number) {}
    };
    try {
      const m = mockCtx();
      const n = node({
        type: "vector",
        trimStart: 0,
        trimEnd: 0.5,
        shape: {
          kind: "path",
          vw: 100,
          vh: 100,
          paths: [{ d: "M18 52 L42 78 L84 22", fill: null, stroke: "#4ADE80FF", strokeWidth: 9, cap: "round" }],
        },
      });
      expect(() => drawTree(m.ctx, tree([n]), 1)).not.toThrow();
      expect(m.calls.stroke).toBeGreaterThanOrEqual(1);
      // trimmed polyline should start at the path origin
      expect(moves[0]).toBeCloseTo(18, 5);
    } finally {
      if (!hadPath2D) delete (globalThis as any).Path2D;
    }
  });

  it("clips and invokes the shader path when node.shader is set", () => {
    const m = mockCtx();
    const n = node({
      fill: { type: "solid", color: { r: 0, g: 0, b: 0, a: 1 } },
      shader: { kind: "noise" },
    });
    // node env has no document → paintShader early-returns, but the clip path
    // around the shader overlay must still run (save / box / clip / restore).
    expect(() => drawTree(m.ctx, tree([n]), 1)).not.toThrow();
    expect(m.calls.clip).toBeGreaterThanOrEqual(1);
    expect(m.calls.save).toBe(m.calls.restore);
  });

  it("clips to the node box when clip is set", () => {
    const m = mockCtx();
    const n = node({ clip: true, fill: { type: "solid", color: { r: 0, g: 0, b: 0, a: 1 } } });
    drawTree(m.ctx, tree([n]), 1);
    expect(m.calls.clip).toBeGreaterThanOrEqual(1);
  });
});
