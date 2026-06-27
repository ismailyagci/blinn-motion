import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { sample, findNode, type MotionDoc, type RenderNode } from "@fottie/core";
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

describe("@fottie/react-native nodeToTransform", () => {
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
