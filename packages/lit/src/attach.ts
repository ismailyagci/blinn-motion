/**
 * Framework-agnostic mount helper shared by the Lit adapter surface.
 * Creates a DOM or Canvas player and returns an imperative handle + dispose.
 */
import type { MotionDoc } from "@blinn-motion/core";
import { create as createDom, type DomPlayer } from "@blinn-motion/dom";
import { create as createCanvas, type CanvasPlayer } from "@blinn-motion/canvas";

export type BlinnMotionRenderer = "dom" | "canvas";
export type BlinnMotionPlayer = DomPlayer | CanvasPlayer;

/** Imperative controls comparable to the React adapter handle. */
export interface BlinnMotionHandle {
  play(): void;
  pause(): void;
  stop(): void;
  toggle(): void;
  seek(time: number): void;
  seekFraction(f: number): void;
  /** Drive from an external 0..1 signal (scroll, gesture, scrubber). */
  setProgress(progress: number): void;
  setRate(rate: number): void;
  readonly player: BlinnMotionPlayer | null;
  readonly duration: number;
  readonly time: number;
  readonly isPlaying: boolean;
}

export interface AttachOptions {
  doc: MotionDoc;
  renderer?: BlinnMotionRenderer;
  loop?: boolean;
  /**
   * Start playing on mount (default true). Forced off when `progress` is set —
   * controlled mode is progress-driven, not clock-driven.
   */
  autoplay?: boolean;
  rate?: number;
  /** Controlled progress 0..1. When set, disables autoplay and scrubs to that frame. */
  progress?: number;
  onFrame?: (time: number, fraction: number) => void;
}

export interface AttachedBlinnMotion extends BlinnMotionHandle {
  dispose(): void;
  /** Update controlled progress without remounting. */
  setControlledProgress(progress: number | undefined): void;
  /** Swap onFrame without remounting. */
  setOnFrame(fn: ((time: number, fraction: number) => void) | undefined): void;
}

export function attachBlinnMotion(host: HTMLElement, options: AttachOptions): AttachedBlinnMotion {
  const renderer = options.renderer ?? "dom";
  const loop = options.loop !== false;
  const rate = options.rate ?? 1;
  const controlled = options.progress != null;
  const autoplay = controlled ? false : options.autoplay !== false;

  let onFrame = options.onFrame;
  const player: BlinnMotionPlayer =
    renderer === "canvas"
      ? createCanvas(host, options.doc, {
          loop,
          rate,
          autoplay,
          onframe: (t, f) => onFrame?.(t, f),
        })
      : createDom(host, options.doc, {
          loop,
          rate,
          autoplay,
          onframe: (t, f) => onFrame?.(t, f),
        });

  if (controlled) player.setProgress(options.progress!);

  const handle: AttachedBlinnMotion = {
    play: () => {
      player.play();
    },
    pause: () => {
      player.pause();
    },
    stop: () => {
      player.stop();
    },
    toggle: () => {
      player.toggle();
    },
    seek: (t) => {
      player.seek(t);
    },
    seekFraction: (f) => {
      player.seekFraction(f);
    },
    setProgress: (p) => {
      player.setProgress(p);
    },
    setRate: (r) => {
      player.setRate(r);
    },
    get player() {
      return player;
    },
    get duration() {
      return player.duration;
    },
    get time() {
      return player.time;
    },
    get isPlaying() {
      return player.isPlaying;
    },
    setControlledProgress(progress: number | undefined) {
      if (progress != null) player.setProgress(progress);
    },
    setOnFrame(fn) {
      onFrame = fn;
    },
    dispose() {
      player.pause();
      host.innerHTML = "";
    },
  };

  return handle;
}
