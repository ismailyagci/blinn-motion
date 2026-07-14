/**
 * Shared playback hook for the React Native adapter. Both <BlinnMotionView/> and
 * useBlinnMotion() build on this.
 *
 * It owns a @blinn-motion/core {@link Ticker} (which uses RN's requestAnimationFrame),
 * samples the doc into a {@link RenderTree} on every frame, stores that tree in
 * React state, and exposes a stable `controls` object. Same render method as the
 * DOM / Canvas / React adapters — only the backend differs.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { sample, Ticker, type MotionDoc, type RenderTree } from "@blinn-motion/core";

/** Imperative playback controls. */
export interface BlinnMotionControls {
  play(): void;
  pause(): void;
  stop(): void;
  toggle(): void;
  seek(time: number): void;
  seekFraction(fraction: number): void;
  /** Drive from an external 0..1 signal (scroll, gesture, scrubber). */
  setProgress(progress: number): void;
  setRate(rate: number): void;
}

/** Options shared by the component and the hook. */
export interface BlinnMotionPlaybackOptions {
  /** Loop at the end of the timeline (default true). */
  loop?: boolean;
  /** Start playing on mount (default true). When `progress` is set, autoplay is forced off. */
  autoplay?: boolean;
  /** Playback rate multiplier (default 1). */
  rate?: number;
  /**
   * Controlled progress 0..1. When provided, the player is scrubbed to that
   * frame each render and does not autoplay.
   */
  progress?: number;
  /** Called every frame with time (s) and fraction (0..1). */
  onFrame?: (time: number, fraction: number) => void;
}

/** What {@link usePlayer} / {@link useBlinnMotion} return. */
export interface BlinnMotionPlayback {
  /** The latest resolved render tree (re-rendered each frame). */
  tree: RenderTree;
  /** Stable play/pause/seek controls. */
  controls: BlinnMotionControls;
}

export function usePlayer(doc: MotionDoc, options: BlinnMotionPlaybackOptions = {}): BlinnMotionPlayback {
  const { loop = true, rate = 1, onFrame, progress } = options;
  const controlled = progress != null;
  const autoplay = controlled ? false : options.autoplay !== false;

  // Seed with the first frame so the very first render already has content.
  const [tree, setTree] = useState<RenderTree>(() => sample(doc, 0));

  // Keep the latest onFrame without rebuilding the ticker.
  const onFrameRef = useRef(onFrame);
  onFrameRef.current = onFrame;

  const tickerRef = useRef<Ticker | null>(null);

  useEffect(() => {
    const ticker = new Ticker({
      duration: doc.duration || 1,
      loop,
      rate,
      onframe: (t, f) => {
        setTree(sample(doc, t));
        onFrameRef.current?.(t, f);
      },
    });
    tickerRef.current = ticker;

    if (autoplay) ticker.play();
    else if (controlled) ticker.setProgress(progress!);
    else ticker.renderAt(0); // paint a static first frame (and refresh on doc change)

    return () => {
      ticker.pause();
      tickerRef.current = null;
    };
  }, [doc, loop, rate, autoplay]);

  // Controlled progress: scrub without rebuilding the ticker.
  useEffect(() => {
    if (progress == null) return;
    tickerRef.current?.setProgress(progress);
  }, [progress]);

  // Stable controls that proxy to whatever ticker is current.
  const controls = useMemo<BlinnMotionControls>(
    () => ({
      play: () => tickerRef.current?.play(),
      pause: () => tickerRef.current?.pause(),
      stop: () => tickerRef.current?.stop(),
      toggle: () => tickerRef.current?.toggle(),
      seek: (t) => tickerRef.current?.seek(t),
      seekFraction: (f) => tickerRef.current?.seekFraction(f),
      setProgress: (p) => tickerRef.current?.setProgress(p),
      setRate: (r) => tickerRef.current?.setRate(r),
    }),
    [],
  );

  return { tree, controls };
}
