/**
 * Hook variant of the React Native adapter. Plays a MotionDoc and returns the
 * live render tree plus playback controls, so you can render the tree yourself
 * or drive play/pause/seek from your own UI.
 *
 * ```tsx
 * const { tree, controls } = useBlinnMotion(doc, { renderer is implicit });
 * // render `tree` however you like, call controls.toggle(), etc.
 * ```
 */
import type { MotionDoc } from "@blinn-motion/core";
import {
  usePlayer,
  type BlinnMotionPlayback,
  type BlinnMotionPlaybackOptions,
} from "./player.js";

export type UseBlinnMotionOptions = BlinnMotionPlaybackOptions;
export type UseBlinnMotionResult = BlinnMotionPlayback;

export function useBlinnMotion(doc: MotionDoc, options: UseBlinnMotionOptions = {}): UseBlinnMotionResult {
  return usePlayer(doc, options);
}
