import { describe, it, expect, vi } from "vitest";
import { drawNoise, drawCaustics, drawShader, type CausticEntry } from "./caustics.js";

/** A tiny fake 2D context: createImageData returns a writable buffer, putImageData is a spy. */
function fakeEntry(kind: "caustics" | "noise" | undefined, w = 8, h = 8) {
  const put = vi.fn();
  const createImageData = vi.fn((W: number, H: number) => ({ data: new Uint8ClampedArray(W * H * 4) }));
  const ctx = { createImageData, putImageData: put } as unknown as CanvasRenderingContext2D;
  const ent: CausticEntry = { canvas: {} as HTMLCanvasElement, ctx, w, h, kind };
  return { ent, put, createImageData };
}

describe("@fottie/dom caustics.drawNoise", () => {
  it("writes RGBA grain (alpha always > 0) and flushes via putImageData", () => {
    const { ent, put } = fakeEntry("noise", 8, 8);
    drawNoise(ent, 0);
    expect(put).toHaveBeenCalledTimes(1);
    const d = ent.img!.data;
    expect(d.length).toBe(8 * 8 * 4);
    let allAlphaPositive = true;
    let allAlphaBelow255 = true;
    for (let i = 3; i < d.length; i += 4) {
      if (d[i]! <= 0) allAlphaPositive = false;
      if (d[i]! === 255) allAlphaBelow255 = false;
    }
    expect(allAlphaPositive).toBe(true); // grain alpha = 80 + n*80 ∈ [80,160]
    expect(allAlphaBelow255).toBe(true); // never fully opaque (distinguishes it from caustics)
  });

  it("is deterministic for a given time (no Math.random)", () => {
    const a = fakeEntry("noise", 6, 6);
    const b = fakeEntry("noise", 6, 6);
    drawNoise(a.ent, 0.3);
    drawNoise(b.ent, 0.3);
    expect(Array.from(a.ent.img!.data)).toEqual(Array.from(b.ent.img!.data));
  });

  it("reuses its cached ImageData across frames", () => {
    const { ent, createImageData } = fakeEntry("noise", 4, 4);
    drawNoise(ent, 0);
    drawNoise(ent, 1);
    expect(createImageData).toHaveBeenCalledTimes(1);
  });
});

describe("@fottie/dom caustics.drawCaustics", () => {
  it("fills fully-opaque blue-ish pixels and flushes via putImageData", () => {
    const { ent, put } = fakeEntry("caustics", 6, 6);
    drawCaustics(ent, 0.5);
    expect(put).toHaveBeenCalledTimes(1);
    const d = ent.img!.data;
    expect(d[3]).toBe(255); // caustics alpha is hard-coded 255
    let nonZero = false;
    for (let i = 0; i < d.length; i++) if (d[i] !== 0) { nonZero = true; break; }
    expect(nonZero).toBe(true);
  });
});

describe("@fottie/dom caustics.drawShader", () => {
  it("dispatches to noise for kind:'noise' (semi-transparent grain)", () => {
    const { ent, put } = fakeEntry("noise", 4, 4);
    drawShader(ent, 0);
    expect(put).toHaveBeenCalledTimes(1);
    let anyOpaque = false;
    for (let i = 3; i < ent.img!.data.length; i += 4) if (ent.img!.data[i] === 255) anyOpaque = true;
    expect(anyOpaque).toBe(false); // noise never hits alpha 255
  });

  it("dispatches to caustics for any other / undefined kind (opaque)", () => {
    const { ent, put } = fakeEntry(undefined, 4, 4);
    drawShader(ent, 0);
    expect(put).toHaveBeenCalledTimes(1);
    expect(ent.img!.data[3]).toBe(255); // caustics path → opaque
  });
});
