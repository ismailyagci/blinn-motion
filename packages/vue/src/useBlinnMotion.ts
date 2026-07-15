import { onBeforeUnmount, onMounted, ref, watch, type Ref, type ShallowRef, shallowRef } from "vue";
import type { MotionDoc } from "@blinn-motion/core";
import {
  attachBlinnMotion,
  type AttachOptions,
  type AttachedBlinnMotion,
  type BlinnMotionPlayer,
  type BlinnMotionRenderer,
} from "./attach.js";

export interface UseBlinnMotionOptions {
  renderer?: BlinnMotionRenderer;
  loop?: boolean;
  autoplay?: boolean;
  rate?: number;
  progress?: number;
  onFrame?: (time: number, fraction: number) => void;
}

/**
 * Composable: attach a BlinnMotion player to your own element ref.
 * Returns a shallow ref to the live player (null before mount).
 */
export function useBlinnMotion(
  hostRef: Ref<HTMLElement | null | undefined>,
  doc: Ref<MotionDoc> | MotionDoc,
  options: UseBlinnMotionOptions | Ref<UseBlinnMotionOptions> = {},
): ShallowRef<BlinnMotionPlayer | null> {
  const player = shallowRef<BlinnMotionPlayer | null>(null);
  let attached: AttachedBlinnMotion | null = null;

  const resolveDoc = () => ("value" in (doc as object) ? (doc as Ref<MotionDoc>).value : (doc as MotionDoc));
  const resolveOpts = (): UseBlinnMotionOptions =>
    "value" in (options as object) ? (options as Ref<UseBlinnMotionOptions>).value : (options as UseBlinnMotionOptions);

  const remount = () => {
    attached?.dispose();
    attached = null;
    player.value = null;
    const host = hostRef.value;
    if (!host) return;
    const opts = resolveOpts();
    const mountOpts: AttachOptions = {
      doc: resolveDoc(),
      renderer: opts.renderer,
      loop: opts.loop,
      autoplay: opts.autoplay,
      rate: opts.rate,
      progress: opts.progress,
      onFrame: opts.onFrame,
    };
    attached = attachBlinnMotion(host, mountOpts);
    player.value = attached.player;
  };

  onMounted(remount);
  onBeforeUnmount(() => {
    attached?.dispose();
    attached = null;
    player.value = null;
  });

  watch(hostRef, remount);
  watch(
    () => {
      const opts = resolveOpts();
      return [resolveDoc(), opts.renderer, opts.loop, opts.rate, opts.autoplay, opts.progress == null] as const;
    },
    remount,
  );
  watch(
    () => resolveOpts().progress,
    (p) => {
      if (p != null) attached?.setControlledProgress(p);
    },
  );

  return player;
}
