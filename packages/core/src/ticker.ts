/**
 * A backend-agnostic playback clock. It owns time, play/pause/seek/loop and the
 * animation-frame loop; it knows nothing about painting. Every adapter builds
 * its Player on top of this and supplies an `onframe` that samples + draws.
 *
 * `requestAnimationFrame` / `performance.now` are used when present (browser,
 * React Native) but can be injected for tests or other hosts.
 */
export interface TickerOptions {
  /** Timeline length, seconds. */
  duration: number;
  /** Loop when reaching the end (default true). */
  loop?: boolean;
  /** Playback rate multiplier (default 1). */
  rate?: number;
  /** Called every frame with the current time (s) and fraction (0..1). */
  onframe: (time: number, fraction: number) => void;
  now?: () => number;
  raf?: (cb: (t: number) => void) => number;
  caf?: (id: number) => void;
}

function defaultNow(): number {
  return typeof performance !== "undefined" && performance.now ? performance.now() : Date.now();
}

const hasRaf = typeof globalThis !== "undefined" && typeof (globalThis as any).requestAnimationFrame === "function";

export class Ticker {
  duration: number;
  loop: boolean;
  rate: number;
  time = 0;

  private onframe: (time: number, fraction: number) => void;
  private now: () => number;
  private raf: (cb: (t: number) => void) => number;
  private caf: (id: number) => void;
  private rafId: number | null = null;
  private playing = false;

  constructor(opts: TickerOptions) {
    this.duration = opts.duration || 1;
    this.loop = opts.loop !== false;
    this.rate = opts.rate || 1;
    this.onframe = opts.onframe;
    this.now = opts.now || defaultNow;
    this.raf =
      opts.raf ||
      (hasRaf
        ? (cb) => (globalThis as any).requestAnimationFrame(cb)
        : (cb) => setTimeout(() => cb(defaultNow()), 16) as unknown as number);
    this.caf =
      opts.caf ||
      (hasRaf ? (id) => (globalThis as any).cancelAnimationFrame(id) : (id) => clearTimeout(id));
  }

  get isPlaying(): boolean {
    return this.playing;
  }

  /** Render a specific time without changing play state. */
  renderAt(t: number): void {
    this.time = t;
    this.onframe(t, this.duration ? t / this.duration : 0);
  }

  seek(t: number): void {
    this.renderAt(Math.max(0, Math.min(this.duration, t)));
  }

  seekFraction(f: number): void {
    this.seek(f * this.duration);
  }

  /**
   * Drive the timeline from an external 0..1 progress signal (scroll, gesture,
   * scrubber). Alias of {@link seekFraction} with progress semantics — does not
   * start playback; pauses nothing; just samples that frame.
   */
  setProgress(progress: number): void {
    const p = Number.isNaN(progress) ? 0 : Math.max(0, Math.min(1, progress));
    this.seekFraction(p);
  }

  /** Current progress 0..1 (time / duration). */
  get progress(): number {
    return this.duration ? this.time / this.duration : 0;
  }

  play(): void {
    if (this.playing) return;
    this.playing = true;
    let base = this.now() - (this.time / this.rate) * 1000;
    const frame = (now: number) => {
      if (!this.playing) return;
      let t = ((now - base) / 1000) * this.rate;
      if (t >= this.duration) {
        if (this.loop) {
          base = now;
          t = 0;
        } else {
          this.renderAt(this.duration);
          this.playing = false;
          return;
        }
      }
      this.renderAt(t);
      this.rafId = this.raf(frame);
    };
    this.rafId = this.raf(frame);
  }

  pause(): void {
    this.playing = false;
    if (this.rafId != null) this.caf(this.rafId);
    this.rafId = null;
  }

  stop(): void {
    this.pause();
    this.renderAt(0);
  }

  toggle(): void {
    this.playing ? this.pause() : this.play();
  }

  setRate(r: number): void {
    this.rate = r || 1;
    if (this.playing) {
      this.pause();
      this.play();
    }
  }
}
