// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import type { MotionDoc } from "@blinn-motion/core";
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

describe("@blinn-motion/canvas player", () => {
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

  it("wraps the canvas in an overflow-hidden stage frame (DOM parity)", () => {
    const host = document.createElement("div");
    const player = create(host, doc, { autoplay: false, dpr: 1 });
    const frame = host.querySelector("[data-blinn-stage='canvas']") as HTMLElement;
    expect(frame).toBeTruthy();
    expect(frame.style.overflow).toBe("hidden");
    expect(frame.style.width).toBe("480px");
    expect(frame.style.height).toBe("320px");
    expect(player.frame).toBe(frame);
    expect(frame.contains(player.canvas)).toBe(true);
  });

  it("paints the initial frame (clear + transform + draws)", () => {
    const host = document.createElement("div");
    create(host, doc, { autoplay: false, dpr: 1 });
    expect(calls.setTransform).toBeGreaterThan(0);
    expect(calls.clearRect).toBeGreaterThanOrEqual(1);
    // showcase has solid + gradient fills → at least one fill, plus noise fillRects
    expect((calls.fill || 0) + (calls.fillRect || 0)).toBeGreaterThanOrEqual(1);
    // save/restore balanced overall (stage clip + per-node pairs)
    expect(calls.save).toBe(calls.restore);
    // stage clip: rect + clip at least once
    expect(calls.clip).toBeGreaterThanOrEqual(1);
    expect(calls.rect).toBeGreaterThanOrEqual(1);
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

  it("accepts an HTMLCanvasElement directly (no host wrapper)", () => {
    const canvas = document.createElement("canvas");
    const player = create(canvas, doc, { autoplay: false, dpr: 1 });
    expect(player.canvas).toBe(canvas);
    expect(player.duration).toBe(doc.duration);
  });

  it("toggle flips isPlaying; seekFraction updates time", () => {
    const host = document.createElement("div");
    const player = create(host, doc, { autoplay: false, dpr: 1 });
    expect(player.isPlaying).toBe(false);
    player.toggle();
    expect(player.isPlaying).toBe(true);
    player.toggle();
    expect(player.isPlaying).toBe(false);

    player.seekFraction(0.5);
    expect(player.time).toBeCloseTo(doc.duration! * 0.5, 5);
    // loop defaults to true when omitted from opts
    expect(player.loop).toBe(true);
    player.loop = false;
    expect(player.loop).toBe(false);
  });

  it("fires onframe on seek and autoplay starts playing", () => {
    const host = document.createElement("div");
    let frames = 0;
    const player = create(host, doc, {
      autoplay: true,
      dpr: 1,
      onframe: () => {
        frames++;
      },
    });
    expect(player.isPlaying).toBe(true);
    const before = frames;
    player.seek(0.25);
    expect(frames).toBeGreaterThan(before);
    player.pause();
  });
});
