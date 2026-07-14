import { useEffect, useRef, useState, type RefObject } from "react";
import type { MotionDoc } from "@blinn-motion/core";
import { create as createDom, type DomPlayer } from "@blinn-motion/dom";
import { create as createCanvas, type CanvasPlayer } from "@blinn-motion/canvas";
import type { BlinnMotionPlayer, BlinnMotionRenderer } from "./BlinnMotion.js";

export interface UseBlinnMotionOptions {
  renderer?: BlinnMotionRenderer;
  loop?: boolean;
  autoplay?: boolean;
  rate?: number;
  onFrame?: (time: number, fraction: number) => void;
}

/**
 * Hook variant: attach a BlinnMotion player to your own element ref. Returns the live
 * player (null before mount) so you can drive play/pause/seek yourself.
 *
 * ```tsx
 * const host = useRef<HTMLDivElement>(null);
 * const player = useBlinnMotion(host, doc, { renderer: "canvas" });
 * <div ref={host} />
 * ```
 */
export function useBlinnMotion(
  hostRef: RefObject<HTMLElement | null>,
  doc: MotionDoc,
  options: UseBlinnMotionOptions = {},
): BlinnMotionPlayer | null {
  const { renderer = "dom", loop = true, autoplay = true, rate = 1, onFrame } = options;
  const [player, setPlayer] = useState<BlinnMotionPlayer | null>(null);
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
    const p: DomPlayer | CanvasPlayer =
      renderer === "canvas" ? createCanvas(host, doc, opts) : createDom(host, doc, opts);
    setPlayer(p);
    return () => {
      p.pause();
      setPlayer(null);
      host.innerHTML = "";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc, renderer, loop, rate, autoplay]);

  return player;
}
