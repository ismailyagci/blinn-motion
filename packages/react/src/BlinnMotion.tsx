import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  type CSSProperties,
} from "react";
import type { MotionDoc } from "@blinn-motion/core";
import { create as createDom, type DomPlayer } from "@blinn-motion/dom";
import { create as createCanvas, type CanvasPlayer } from "@blinn-motion/canvas";

export type BlinnMotionRenderer = "dom" | "canvas";

export type BlinnMotionPlayer = DomPlayer | CanvasPlayer;

/** Imperative controls exposed via a ref on `<BlinnMotion/>`. */
export interface BlinnMotionHandle {
  play(): void;
  pause(): void;
  stop(): void;
  toggle(): void;
  seek(time: number): void;
  seekFraction(f: number): void;
  setRate(rate: number): void;
  /** The underlying backend player (or null before mount). */
  readonly player: BlinnMotionPlayer | null;
}

export interface BlinnMotionProps {
  /** The MotionDoc to play. */
  doc: MotionDoc;
  /** Backend: "dom" (full fidelity, default) or "canvas". */
  renderer?: BlinnMotionRenderer;
  loop?: boolean;
  autoplay?: boolean;
  rate?: number;
  onFrame?: (time: number, fraction: number) => void;
  className?: string;
  style?: CSSProperties;
}

/**
 * `<BlinnMotion doc={...} />` — plays a MotionDoc through the DOM or Canvas backend.
 * Both share @blinn-motion/core's render method, so the animation is identical.
 */
export const BlinnMotion = forwardRef<BlinnMotionHandle, BlinnMotionProps>(function BlinnMotion(
  { doc, renderer = "dom", loop = true, autoplay = true, rate = 1, onFrame, className, style },
  ref,
) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<BlinnMotionPlayer | null>(null);
  // keep the latest onFrame without forcing the player to rebuild
  const onFrameRef = useRef(onFrame);
  onFrameRef.current = onFrame;

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const opts = {
      loop,
      rate,
      autoplay,
      onframe: (t: number, f: number) => onFrameRef.current?.(t, f),
    };
    const player = renderer === "canvas" ? createCanvas(host, doc, opts) : createDom(host, doc, opts);
    playerRef.current = player;
    return () => {
      player.pause();
      playerRef.current = null;
      host.innerHTML = "";
    };
  }, [doc, renderer, loop, rate, autoplay]);

  useImperativeHandle(
    ref,
    (): BlinnMotionHandle => ({
      play: () => playerRef.current?.play(),
      pause: () => playerRef.current?.pause(),
      stop: () => playerRef.current?.stop(),
      toggle: () => playerRef.current?.toggle(),
      seek: (t) => playerRef.current?.seek(t),
      seekFraction: (f) => playerRef.current?.seekFraction(f),
      setRate: (r) => playerRef.current?.setRate(r),
      get player() {
        return playerRef.current;
      },
    }),
    [],
  );

  return <div ref={hostRef} className={className} style={style} />;
});
