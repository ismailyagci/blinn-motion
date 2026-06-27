// @vitest-environment jsdom
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import type { MotionDoc } from "@fottie/core";
import { create } from "./index.js";

const here = dirname(fileURLToPath(import.meta.url));
const doc = JSON.parse(readFileSync(join(here, "../../../fixtures/card.motion.json"), "utf8")) as MotionDoc;
const showcase = JSON.parse(
  readFileSync(join(here, "../../../fixtures/showcase.motion.json"), "utf8"),
) as MotionDoc;

describe("@fottie/dom player", () => {
  it("mounts a stage sized to the doc and one node per layer", () => {
    const host = document.createElement("div");
    create(host, doc);
    const stage = host.firstElementChild as HTMLElement;
    expect(stage.style.width).toBe("375px");
    expect(stage.style.height).toBe("600px");
    // card + badge + title = at least 3 [data-id] nodes
    expect(host.querySelectorAll("[data-id]").length).toBeGreaterThanOrEqual(3);
  });

  it("applies the sampled transform to the card at t=0 (translateY 80, scale 0.7)", () => {
    const host = document.createElement("div");
    const player = create(host, doc);
    player.seek(0);
    const card = host.querySelector('[data-id="card"]') as HTMLElement;
    expect(card.style.transform).toContain("translate(0px,80px)");
    expect(card.style.transform).toContain("scale(0.7,0.7)");
    expect(card.style.opacity === "0" || parseFloat(card.style.opacity) < 0.05).toBe(true);
  });

  it("seekFraction(1) lands the card at its resting transform", () => {
    const host = document.createElement("div");
    const player = create(host, doc);
    player.seekFraction(1);
    const card = host.querySelector('[data-id="card"]') as HTMLElement;
    expect(card.style.transform).toContain("translate(0px,0px)");
    expect(card.style.transform).toContain("scale(1,1)");
  });
});

describe("@fottie/dom player — showcase feature reflection", () => {
  const sel = (host: HTMLElement, id: string) => host.querySelector(`[data-id="${id}"]`) as HTMLElement;

  // jsdom has no real 2D context (no `canvas` pkg). Stub a minimal one so the
  // noise-shader canvas paints into a buffer instead of logging "Not implemented".
  let origGetContext: typeof HTMLCanvasElement.prototype.getContext;
  beforeAll(() => {
    origGetContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function () {
      return {
        createImageData: (w: number, h: number) => ({ data: new Uint8ClampedArray(w * h * 4) }),
        putImageData: () => {},
      } as any;
    } as any;
  });
  afterAll(() => {
    HTMLCanvasElement.prototype.getContext = origGetContext;
  });

  it("mounts one [data-id] per layer (incl. nested) without throwing on shaders/trim", () => {
    const host = document.createElement("div");
    // noise canvas getContext + path getTotalLength are unavailable in jsdom; the
    // player try/catches them — building + seeking must not throw.
    let player!: ReturnType<typeof create>;
    expect(() => {
      player = create(host, showcase);
      player.seek(0.5);
    }).not.toThrow();
    // radial, conic, border, pie, trim, shadow, blendA, blendB, noise = 9 nodes
    expect(host.querySelectorAll("[data-id]").length).toBe(9);
  });

  it("reflects a screen blend mode as mixBlendMode", () => {
    const host = document.createElement("div");
    create(host, showcase).seek(0.5);
    expect(sel(host, "blendB").style.mixBlendMode).toBe("screen");
  });

  it("keeps a radial-gradient background on the radial node (animated stop)", () => {
    const host = document.createElement("div");
    create(host, showcase).seek(0.5);
    expect(sel(host, "radial").style.background).toContain("radial-gradient");
  });

  it("keeps a conic-gradient background on the angular node", () => {
    const host = document.createElement("div");
    create(host, showcase).seek(0.5);
    expect(sel(host, "conic").style.background).toContain("conic-gradient");
  });

  it("clips the arc/pie node with a polygon() clip-path", () => {
    const host = document.createElement("div");
    create(host, showcase).seek(0.5);
    expect(sel(host, "pie").style.clipPath).toContain("polygon(");
  });

  it("animates the per-side border so the (thickening) top differs from the right", () => {
    const host = document.createElement("div");
    create(host, showcase).seek(1.0); // borderTopWeight peaks at 22 here; right stays 2
    const border = sel(host, "border");
    expect(border.style.borderTopWidth).toBe("22px");
    expect(border.style.borderRightWidth).toBe("2px");
    expect(border.style.borderTopWidth).not.toBe(border.style.borderRightWidth);
  });

  it("animates the stroke color: border color changes between t=0 and t=0.9", () => {
    const host = document.createElement("div");
    const player = create(host, showcase);
    player.seek(0);
    const c0 = sel(host, "border").style.borderColor;
    player.seek(0.9);
    const c1 = sel(host, "border").style.borderColor;
    expect(c0).not.toBe("");
    expect(c1).not.toBe(c0);
  });
});
