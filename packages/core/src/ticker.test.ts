import { describe, it, expect } from "vitest";
import { Ticker, type TickerOptions } from "./ticker.js";

/** Drive a Ticker with a manual clock + manual animation-frame scheduler. */
function harness(opts: Partial<TickerOptions> & { duration: number }) {
  let nowMs = 0;
  let scheduled: ((t: number) => void) | null = null;
  let cafCount = 0;
  const frames: Array<[number, number]> = [];
  const ticker = new Ticker({
    onframe: (t, f) => frames.push([t, f]),
    now: () => nowMs,
    raf: (cb) => {
      scheduled = cb;
      return 1;
    },
    caf: () => {
      cafCount++;
      scheduled = null;
    },
    ...opts,
  });
  return {
    ticker,
    frames,
    get scheduled() {
      return scheduled;
    },
    get cafCount() {
      return cafCount;
    },
    /** Advance the clock by `ms` and fire the pending frame (if any). */
    advance(ms: number) {
      nowMs += ms;
      const cb = scheduled;
      scheduled = null;
      if (cb) cb(nowMs);
    },
  };
}

describe("Ticker basics", () => {
  it("renderAt sets time and reports fraction", () => {
    const h = harness({ duration: 2 });
    h.ticker.renderAt(0.5);
    expect(h.ticker.time).toBe(0.5);
    expect(h.frames.at(-1)).toEqual([0.5, 0.25]);
  });
  it("seek clamps to [0, duration]", () => {
    const h = harness({ duration: 2 });
    h.ticker.seek(-3);
    expect(h.ticker.time).toBe(0);
    h.ticker.seek(99);
    expect(h.ticker.time).toBe(2);
  });
  it("seekFraction maps 0..1 onto the duration", () => {
    const h = harness({ duration: 4 });
    h.ticker.seekFraction(0.25);
    expect(h.ticker.time).toBe(1);
  });
  it("setProgress is progress-driven seek + reports progress", () => {
    const h = harness({ duration: 4 });
    h.ticker.setProgress(0.25);
    expect(h.ticker.time).toBe(1);
    expect(h.ticker.progress).toBeCloseTo(0.25, 5);
    h.ticker.setProgress(2);
    expect(h.ticker.progress).toBe(1);
    h.ticker.setProgress(Number.NaN);
    expect(h.ticker.progress).toBe(0);
  });
  it("duration defaults to 1 when 0/missing", () => {
    expect(new Ticker({ duration: 0, onframe: () => {} }).duration).toBe(1);
  });
});

describe("playback loop", () => {
  it("play schedules frames and advances time", () => {
    const h = harness({ duration: 10 });
    h.ticker.play();
    expect(h.ticker.isPlaying).toBe(true);
    expect(h.scheduled).not.toBeNull();
    h.advance(1000); // 1s elapsed → t = 1
    expect(h.frames.at(-1)![0]).toBeCloseTo(1, 3);
    h.advance(1500); // 2.5s total
    expect(h.frames.at(-1)![0]).toBeCloseTo(2.5, 3);
  });
  it("rate scales elapsed time", () => {
    const h = harness({ duration: 100, rate: 2 });
    h.ticker.play();
    h.advance(1000); // 1s real → 2s playback
    expect(h.frames.at(-1)![0]).toBeCloseTo(2, 3);
  });
  it("loops back to 0 past the end (default loop on)", () => {
    const h = harness({ duration: 1 });
    h.ticker.play();
    h.advance(1200); // past end → wrap
    expect(h.frames.at(-1)![0]).toBe(0);
    expect(h.ticker.isPlaying).toBe(true);
    expect(h.scheduled).not.toBeNull();
  });
  it("stops at the end when loop is off", () => {
    const h = harness({ duration: 1, loop: false });
    h.ticker.play();
    h.advance(1500);
    expect(h.frames.at(-1)).toEqual([1, 1]); // rendered the final frame
    expect(h.ticker.isPlaying).toBe(false);
    expect(h.scheduled).toBeNull();
  });
  it("double play is a no-op", () => {
    const h = harness({ duration: 1 });
    h.ticker.play();
    const first = h.scheduled;
    h.ticker.play();
    expect(h.scheduled).toBe(first);
  });
});

describe("pause / stop / toggle / setRate", () => {
  it("pause cancels the frame", () => {
    const h = harness({ duration: 5 });
    h.ticker.play();
    h.ticker.pause();
    expect(h.ticker.isPlaying).toBe(false);
    expect(h.scheduled).toBeNull();
    expect(h.cafCount).toBeGreaterThan(0);
  });
  it("stop pauses and rewinds to 0", () => {
    const h = harness({ duration: 5 });
    h.ticker.renderAt(3);
    h.ticker.stop();
    expect(h.ticker.isPlaying).toBe(false);
    expect(h.ticker.time).toBe(0);
  });
  it("toggle flips playing state", () => {
    const h = harness({ duration: 5 });
    h.ticker.toggle();
    expect(h.ticker.isPlaying).toBe(true);
    h.ticker.toggle();
    expect(h.ticker.isPlaying).toBe(false);
  });
  it("setRate updates rate and keeps playing", () => {
    const h = harness({ duration: 5 });
    h.ticker.play();
    h.ticker.setRate(3);
    expect(h.ticker.rate).toBe(3);
    expect(h.ticker.isPlaying).toBe(true);
    h.ticker.setRate(0); // falsy → defaults to 1
    expect(h.ticker.rate).toBe(1);
  });
});

describe("default scheduler (no injection)", () => {
  it("plays and pauses without throwing in a plain host", () => {
    const t = new Ticker({ duration: 1, onframe: () => {} });
    t.play();
    expect(t.isPlaying).toBe(true);
    t.pause();
    expect(t.isPlaying).toBe(false);
  });
});
