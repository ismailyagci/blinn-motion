import { useMemo } from "react";
import {
  progressToTime,
  sample,
  type MotionDoc,
  type RenderTree,
} from "@blinn-motion/core";

/**
 * Resolve a MotionDoc at a 0..1 progress value — no player, no RAF.
 * Use when you already own the progress signal (scroll, drag, spring).
 *
 * ```tsx
 * const tree = useMotionProgress(doc, scrollP);
 * // paint tree yourself, or pass progress into <BlinnMotion progress={scrollP} />
 * ```
 */
export function useMotionProgress(doc: MotionDoc, progress: number): RenderTree {
  return useMemo(
    () => sample(doc, progressToTime(doc.duration || 0, progress)),
    [doc, progress],
  );
}
