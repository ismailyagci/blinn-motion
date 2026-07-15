import type { Action } from "svelte/action";
import {
  attachBlinnMotion,
  type AttachOptions,
  type AttachedBlinnMotion,
  type BlinnMotionHandle,
} from "./attach.js";

export type BlinnMotionActionParams = AttachOptions;

/**
 * Svelte action: `use:blinnMotion={{ doc, renderer: 'canvas' }}`.
 * Returns the attached handle via `node.__blinn` for imperative control if needed;
 * prefer binding a handle ref through the update callback pattern in the example.
 */
export const blinnMotion: Action<HTMLElement, BlinnMotionActionParams, { "on:frame": (e: CustomEvent<{ time: number; fraction: number }>) => void }> = (
  node,
  params,
) => {
  let attached: AttachedBlinnMotion | null = null;

  const mount = (options: BlinnMotionActionParams) => {
    attached?.dispose();
    const onFrame = options.onFrame;
    attached = attachBlinnMotion(node, {
      ...options,
      onFrame: (time, fraction) => {
        onFrame?.(time, fraction);
        node.dispatchEvent(new CustomEvent("frame", { detail: { time, fraction } }));
      },
    });
    (node as HTMLElement & { __blinn?: BlinnMotionHandle }).__blinn = attached;
  };

  mount(params);

  return {
    update(next: BlinnMotionActionParams) {
      // Remount when structural options change; progress-only updates stay live.
      const prev = params;
      const structural =
        next.doc !== prev.doc ||
        next.renderer !== prev.renderer ||
        next.loop !== prev.loop ||
        next.rate !== prev.rate ||
        next.autoplay !== prev.autoplay ||
        (next.progress == null) !== (prev.progress == null);
      params = next;
      if (structural) {
        mount(next);
      } else if (next.progress != null) {
        attached?.setControlledProgress(next.progress);
        attached?.setOnFrame(next.onFrame);
      } else {
        attached?.setOnFrame(next.onFrame);
      }
    },
    destroy() {
      attached?.dispose();
      attached = null;
      delete (node as HTMLElement & { __blinn?: BlinnMotionHandle }).__blinn;
    },
  };
};

/** Read the live handle from a node that has `use:blinnMotion`. */
export function getBlinnHandle(node: HTMLElement | null | undefined): BlinnMotionHandle | null {
  if (!node) return null;
  return (node as HTMLElement & { __blinn?: BlinnMotionHandle }).__blinn ?? null;
}
