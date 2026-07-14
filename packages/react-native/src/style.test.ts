import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { sample, findNode, type MotionDoc, type RenderNode } from "@blinn-motion/core";
import { nodeToTransform } from "./style.js";

const here = dirname(fileURLToPath(import.meta.url));
const doc = JSON.parse(
  readFileSync(join(here, "../../../fixtures/card.motion.json"), "utf8"),
) as MotionDoc;

/** Pull a single transform value (e.g. "translateY") out of the RN transform array. */
function tx(style: Record<string, any>, key: string): unknown {
  const entry = (style.transform as Array<Record<string, unknown>>).find((e) => key in e);
  return entry ? entry[key] : undefined;
}

/** A minimal resolved node with sane defaults for the synthetic-mapping tests. */
function mkNode(overrides: Partial<RenderNode>): RenderNode {
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

describe("@blinn-motion/react-native nodeToTransform", () => {
  it("maps the card node's box + transform at t=0", () => {
    const tree = sample(doc, 0);
    const card = findNode(tree, "card")!;
    const style = nodeToTransform(card);

    expect(style.position).toBe("absolute");
    expect(style.left).toBe(card.x);
    expect(style.top).toBe(card.y);

    // opacity track starts at 0 → fully transparent on the first frame
    expect(style.opacity).toBeCloseTo(0, 5);

    // translateY offsets in from 80; scaleXY starts at 0.7
    expect(tx(style, "translateY")).toBeCloseTo(80, 1);
    expect(tx(style, "scaleX")).toBeCloseTo(0.7, 2);

    // the card's linear-gradient fill falls back to its first stop colour (a string)
    expect(typeof style.backgroundColor).toBe("string");
  });

  it("keeps the translate → rotate → scale order", () => {
    const tree = sample(doc, 0);
    const card = findNode(tree, "card")!;
    const order = (nodeToTransform(card).transform as Array<Record<string, unknown>>).map(
      (e) => Object.keys(e)[0],
    );
    expect(order).toEqual(["translateX", "translateY", "rotate", "scaleX", "scaleY"]);
  });

  it("solid fill → backgroundColor, stroke → borderWidth/borderColor", () => {
    const tree = sample(doc, 0);
    const badge = findNode(tree, "badge")!; // solid-fill ellipse
    expect(typeof nodeToTransform(badge).backgroundColor).toBe("string");

    const withStroke: RenderNode = {
      ...badge,
      stroke: { color: { r: 10, g: 20, b: 30, a: 1 }, weight: 3, sides: null },
    };
    const s = nodeToTransform(withStroke);
    expect(s.borderWidth).toBe(3);
    expect(typeof s.borderColor).toBe("string");
  });
});

describe("@blinn-motion/react-native nodeToTransform — branch coverage", () => {
  it("maps the box to absolute left/top/width/height", () => {
    const s = nodeToTransform(mkNode({ x: 5, y: 6, width: 7, height: 8 }));
    expect(s.position).toBe("absolute");
    expect(s.left).toBe(5);
    expect(s.top).toBe(6);
    expect(s.width).toBe(7);
    expect(s.height).toBe(8);
  });

  it("passes opacity through", () => {
    expect(nodeToTransform(mkNode({ opacity: 0.42 })).opacity).toBe(0.42);
  });

  it("orders transforms translate → rotate → scale with the resolved values", () => {
    const s = nodeToTransform(mkNode({ translateX: 10, translateY: 20, rotation: 45, scaleX: 2, scaleY: 3 }));
    expect(tx(s, "translateX")).toBe(10);
    expect(tx(s, "translateY")).toBe(20);
    expect(tx(s, "rotate")).toBe("45deg");
    expect(tx(s, "scaleX")).toBe(2);
    expect(tx(s, "scaleY")).toBe(3);
    const order = (s.transform as Array<Record<string, unknown>>).map((e) => Object.keys(e)[0]);
    expect(order).toEqual(["translateX", "translateY", "rotate", "scaleX", "scaleY"]);
  });

  it("collapses a uniform cornerRadius to a single borderRadius", () => {
    const s = nodeToTransform(mkNode({ cornerRadius: [12, 12, 12, 12] }));
    expect(s.borderRadius).toBe(12);
    expect(s.borderTopLeftRadius).toBeUndefined();
  });

  it("expands a non-uniform cornerRadius to per-corner radii", () => {
    const s = nodeToTransform(mkNode({ cornerRadius: [1, 2, 3, 4] }));
    expect(s.borderTopLeftRadius).toBe(1);
    expect(s.borderTopRightRadius).toBe(2);
    expect(s.borderBottomRightRadius).toBe(3);
    expect(s.borderBottomLeftRadius).toBe(4);
    expect(s.borderRadius).toBeUndefined();
  });

  it("emits no radius when all corners are zero", () => {
    const s = nodeToTransform(mkNode({ cornerRadius: [0, 0, 0, 0] }));
    expect(s.borderRadius).toBeUndefined();
    expect(s.borderTopLeftRadius).toBeUndefined();
  });

  it("maps a uniform stroke to borderWidth + borderColor", () => {
    const s = nodeToTransform(mkNode({ stroke: { color: { r: 1, g: 2, b: 3, a: 1 }, weight: 4, sides: null } }));
    expect(s.borderWidth).toBe(4);
    expect(s.borderTopWidth).toBeUndefined();
    expect(typeof s.borderColor).toBe("string");
  });

  it("maps per-side stroke weights to four border-side widths", () => {
    const s = nodeToTransform(mkNode({ stroke: { color: { r: 1, g: 2, b: 3, a: 1 }, weight: 0, sides: [5, 6, 7, 8] } }));
    expect(s.borderTopWidth).toBe(5);
    expect(s.borderRightWidth).toBe(6);
    expect(s.borderBottomWidth).toBe(7);
    expect(s.borderLeftWidth).toBe(8);
    expect(s.borderWidth).toBeUndefined();
    expect(typeof s.borderColor).toBe("string");
  });

  it("omits the border entirely for a zero-weight stroke with no sides", () => {
    const s = nodeToTransform(mkNode({ stroke: { color: { r: 1, g: 2, b: 3, a: 1 }, weight: 0, sides: null } }));
    expect(s.borderWidth).toBeUndefined();
    expect(s.borderColor).toBeUndefined();
  });

  it("maps a solid fill to backgroundColor", () => {
    const s = nodeToTransform(mkNode({ fill: { type: "solid", color: { r: 255, g: 0, b: 0, a: 1 } } }));
    expect(s.backgroundColor).toBe("rgba(255,0,0,1)");
  });

  it("falls back a linear gradient to its first stop color", () => {
    const s = nodeToTransform(
      mkNode({
        fill: {
          type: "linear",
          angle: 90,
          center: { x: 0.5, y: 0.5 },
          radius: 0,
          stops: [
            { pos: 0, color: { r: 10, g: 20, b: 30, a: 1 } },
            { pos: 1, color: { r: 0, g: 0, b: 0, a: 1 } },
          ],
        },
      }),
    );
    expect(s.backgroundColor).toBe("rgba(10,20,30,1)");
  });

  it("emits no backgroundColor for an empty-stop linear gradient", () => {
    const s = nodeToTransform(
      mkNode({ fill: { type: "linear", angle: 0, center: { x: 0.5, y: 0.5 }, radius: 0, stops: [] } }),
    );
    expect(s.backgroundColor).toBeUndefined();
  });

  it("falls back radial/angular/diamond gradients to their first stop color", () => {
    const radial = nodeToTransform(
      mkNode({ fill: { type: "radial", angle: 0, center: { x: 0.5, y: 0.5 }, radius: 0.5, stops: [{ pos: 0, color: { r: 10, g: 20, b: 30, a: 1 } }] } }),
    );
    expect(radial.backgroundColor).toBe("rgba(10,20,30,1)");
    const angular = nodeToTransform(
      mkNode({ fill: { type: "angular", angle: 0, center: { x: 0.5, y: 0.5 }, radius: 0.5, stops: [{ pos: 0, color: { r: 1, g: 2, b: 3, a: 1 } }] } }),
    );
    expect(angular.backgroundColor).toBe("rgba(1,2,3,1)");
  });
  it("emits no backgroundColor for an empty-stop gradient", () => {
    expect(nodeToTransform(mkNode({ fill: { type: "radial", angle: 0, center: { x: 0.5, y: 0.5 }, radius: 0.5, stops: [] } })).backgroundColor).toBeUndefined();
  });

  it("emits no backgroundColor for image fills (handled by <Image>) or null fills", () => {
    expect(nodeToTransform(mkNode({ fill: { type: "image", src: "x.png", fit: "cover" } })).backgroundColor).toBeUndefined();
    expect(nodeToTransform(mkNode({ fill: null })).backgroundColor).toBeUndefined();
  });
});
