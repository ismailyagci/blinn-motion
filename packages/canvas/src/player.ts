/**
 * The Canvas Player: drives @blinn-motion/core's Ticker, samples the doc each frame
 * and repaints a 2D canvas via {@link drawTree}. Same render method as the DOM
 * adapter, different backend.
 */
import { sample, Ticker, type MotionDoc, type RenderTree } from "@blinn-motion/core";
import { drawTree } from "./draw.js";

export interface CanvasPlayerOptions {
  loop?: boolean;
  rate?: number;
  autoplay?: boolean;
  /** Device pixel ratio for crispness (defaults to window.devicePixelRatio || 1). */
  dpr?: number;
  onframe?: (time: number, fraction: number) => void;
}

function resolveCanvas(target: HTMLCanvasElement | HTMLElement): HTMLCanvasElement {
  if (target instanceof HTMLCanvasElement) return target;
  const cv = document.createElement("canvas");
  target.innerHTML = "";
  target.appendChild(cv);
  return cv;
}

export class CanvasPlayer {
  readonly canvas: HTMLCanvasElement;
  readonly duration: number;
  private ctx: CanvasRenderingContext2D;
  private ticker: Ticker;
  private doc: MotionDoc;
  private dpr: number;

  constructor(target: HTMLCanvasElement | HTMLElement, doc: MotionDoc, opts: CanvasPlayerOptions = {}) {
    this.doc = doc;
    this.duration = doc.duration || 1;
    this.canvas = resolveCanvas(target);
    this.ctx = this.canvas.getContext("2d")!;
    this.dpr = opts.dpr || (typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1);

    const stage = doc.stage || { width: 300, height: 300 };
    this.canvas.width = Math.round(stage.width * this.dpr);
    this.canvas.height = Math.round(stage.height * this.dpr);
    this.canvas.style.width = stage.width + "px";
    this.canvas.style.height = stage.height + "px";

    this.ticker = new Ticker({
      duration: this.duration,
      loop: opts.loop,
      rate: opts.rate,
      onframe: (t, f) => {
        this.paint(t);
        opts.onframe?.(t, f);
      },
    });

    this.paint(0);
    if (opts.autoplay) this.play();
  }

  /** Sample + draw a single time. */
  private paint(t: number): void {
    const tree: RenderTree = sample(this.doc, t);
    drawTree(this.ctx, tree, this.dpr);
  }

  get time(): number {
    return this.ticker.time;
  }
  get isPlaying(): boolean {
    return this.ticker.isPlaying;
  }
  get loop(): boolean {
    return this.ticker.loop;
  }
  set loop(v: boolean) {
    this.ticker.loop = v;
  }
  play(): this {
    this.ticker.play();
    return this;
  }
  pause(): this {
    this.ticker.pause();
    return this;
  }
  stop(): this {
    this.ticker.stop();
    return this;
  }
  toggle(): this {
    this.ticker.toggle();
    return this;
  }
  seek(t: number): this {
    this.ticker.seek(t);
    return this;
  }
  seekFraction(f: number): this {
    this.ticker.seekFraction(f);
    return this;
  }
  /** Drive from an external 0..1 signal (scroll, gesture, scrubber). */
  setProgress(progress: number): this {
    this.ticker.setProgress(progress);
    return this;
  }
  get progress(): number {
    return this.ticker.progress;
  }
  setRate(r: number): this {
    this.ticker.setRate(r);
    return this;
  }
}

/** Create and mount a Canvas player. */
export function create(target: HTMLCanvasElement | HTMLElement, doc: MotionDoc, opts?: CanvasPlayerOptions): CanvasPlayer {
  return new CanvasPlayer(target, doc, opts);
}
