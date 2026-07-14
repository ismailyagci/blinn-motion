import { describe, it, expect } from "vitest";
import {
  clampProgress,
  progressToTime,
  timeToProgress,
  scrollProgress,
  viewportProgress,
} from "./progress.js";

describe("clampProgress", () => {
  it("clamps to 0..1", () => {
    expect(clampProgress(-1)).toBe(0);
    expect(clampProgress(0.4)).toBe(0.4);
    expect(clampProgress(2)).toBe(1);
    expect(clampProgress(Number.NaN)).toBe(0);
  });
});

describe("progressToTime / timeToProgress", () => {
  it("round-trips across a duration", () => {
    expect(progressToTime(2, 0.25)).toBe(0.5);
    expect(timeToProgress(2, 0.5)).toBe(0.25);
  });
  it("handles zero duration", () => {
    expect(progressToTime(0, 0.5)).toBe(0);
    expect(timeToProgress(0, 1)).toBe(0);
  });
  it("clamps out-of-range progress", () => {
    expect(progressToTime(4, -1)).toBe(0);
    expect(progressToTime(4, 2)).toBe(4);
  });
});

describe("scrollProgress", () => {
  it("returns 0 when not scrollable", () => {
    expect(scrollProgress({ scrollTop: 0, scrollHeight: 100, clientHeight: 100 })).toBe(0);
  });
  it("maps scrollTop into 0..1", () => {
    expect(scrollProgress({ scrollTop: 50, scrollHeight: 200, clientHeight: 100 })).toBe(0.5);
    expect(scrollProgress({ scrollTop: 0, scrollHeight: 200, clientHeight: 100 })).toBe(0);
    expect(scrollProgress({ scrollTop: 100, scrollHeight: 200, clientHeight: 100 })).toBe(1);
  });
});

describe("viewportProgress", () => {
  it("returns 0 without a usable viewport height", () => {
    expect(
      viewportProgress({ getBoundingClientRect: () => ({ top: 100, bottom: 200, height: 100 }) }, 0),
    ).toBe(0);
  });
  it("is 0 when element is fully below the viewport", () => {
    // top == vh → just entering
    expect(
      viewportProgress({ getBoundingClientRect: () => ({ top: 800, bottom: 900, height: 100 }) }, 800),
    ).toBe(0);
  });
  it("is 1 when element has fully scrolled past the top", () => {
    // top == -height → fully past
    expect(
      viewportProgress({ getBoundingClientRect: () => ({ top: -100, bottom: 0, height: 100 }) }, 800),
    ).toBe(1);
  });
  it("is mid-range when halfway through the scroll window", () => {
    // start=800, end=-100, range=900; top=350 → (800-350)/900 ≈ 0.5
    const p = viewportProgress(
      { getBoundingClientRect: () => ({ top: 350, bottom: 450, height: 100 }) },
      800,
    );
    expect(p).toBeCloseTo(0.5, 2);
  });
});
