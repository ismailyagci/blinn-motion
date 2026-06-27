/**
 * Hook variant of the React Native adapter. Plays a MotionDoc and returns the
 * live render tree plus playback controls, so you can render the tree yourself
 * or drive play/pause/seek from your own UI.
 *
 * ```tsx
 * const { tree, controls } = useFottie(doc, { renderer is implicit });
 * // render `tree` however you like, call controls.toggle(), etc.
 * ```
 */
import type { MotionDoc } from "@fottie/core";
import {
  usePlayer,
  type FottiePlayback,
  type FottiePlaybackOptions,
} from "./player.js";

export type UseFottieOptions = FottiePlaybackOptions;
export type UseFottieResult = FottiePlayback;

export function useFottie(doc: MotionDoc, options: UseFottieOptions = {}): UseFottieResult {
  return usePlayer(doc, options);
}
