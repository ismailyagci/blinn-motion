import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { sample, type MotionDoc } from "@fottie/core";
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
        if (prop === "createLinearGradient") return { addColorStop: () => rec("addColorStop") };
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
});
