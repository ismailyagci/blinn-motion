// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import type { MotionDoc } from "@fottie/core";
import { create, CanvasPlayer } from "./index.js";

const here = dirname(fileURLToPath(import.meta.url));
const doc = JSON.parse(
  readFileSync(join(here, "../../../fixtures/showcase.motion.json"), "utf8"),
) as MotionDoc;

/** A 2D-context stand-in that records the operations drawTree issues (mirrors draw.test.ts). */
function mockCtx() {
  const calls: Record<string, number> = {};
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
    set(_t, prop: string, _value) {
      rec("set:" + prop);
      return true;
    },
  };
  const ctx = new Proxy({} as Record<string, unknown>, handler);
  return { ctx: ctx as unknown as CanvasRenderingContext2D, calls };
}

// jsdom's HTMLCanvasElement.getContext returns null (no `canvas` pkg). Stub it so
// CanvasPlayer can paint into the recorder instead of crashing.
let calls: Record<string, number>;
let origGetContext: typeof HTMLCanvasElement.prototype.getContext;

beforeEach(() => {
  const m = mockCtx();
  calls = m.calls;
  origGetContext = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function () {
    return m.ctx as any;
  } as any;
});

afterEach(() => {
  HTMLCanvasElement.prototype.getContext = origGetContext;
});

describe("@fottie/canvas player", () => {
  it("creates a canvas sized to stage * dpr and styled to CSS px", () => {
    const host = document.createElement("div");
    const player = create(host, doc, { autoplay: false, dpr: 2 });
    const canvas = host.querySelector("canvas");
    expect(canvas).toBeTruthy();
    expect(player.canvas.width).toBe(480 * 2); // stage.width 480 * dpr 2
    expect(player.canvas.height).toBe(320 * 2);
    expect(player.canvas.style.width).toBe("480px");
    expect(player.canvas.style.height).toBe("320px");
  });

  it("paints the initial frame (clear + transform + draws)", () => {
    const host = document.createElement("div");
    create(host, doc, { autoplay: false, dpr: 1 });
    expect(calls.setTransform).toBeGreaterThan(0);
    expect(calls.clearRect).toBeGreaterThanOrEqual(1);
    // showcase has solid + gradient fills → at least one fill, plus noise fillRects
    expect((calls.fill || 0) + (calls.fillRect || 0)).toBeGreaterThanOrEqual(1);
    expect(calls.save).toBe(calls.restore); // balanced
  });

  it("repaints on seek without throwing", () => {
    const host = document.createElement("div");
    const player = create(host, doc, { autoplay: false, dpr: 1 });
    const before = calls.clearRect || 0;
    expect(() => player.seek(0.5)).not.toThrow();
    expect((calls.clearRect || 0)).toBeGreaterThan(before);
  });

  it("uses a gradient for the radial + conic fills in the showcase", () => {
    const host = document.createElement("div");
    create(host, doc, { autoplay: false, dpr: 1 });
    expect((calls.createRadialGradient || 0) + (calls.createConicGradient || 0)).toBeGreaterThanOrEqual(1);
  });

  it("play / pause / stop / loop setter / setRate do not throw", () => {
    const host = document.createElement("div");
    const player = create(host, doc, { autoplay: false, dpr: 1 });
    expect(() => {
      player.play();
      player.pause();
      player.loop = true;
      player.loop = false;
      player.setRate(2);
      player.stop();
    }).not.toThrow();
    expect(player.isPlaying).toBe(false);
    expect(player instanceof CanvasPlayer).toBe(true);
  });
});
