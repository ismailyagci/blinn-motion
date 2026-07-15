import {
  defineComponent,
  h,
  ref,
  watch,
  onMounted,
  onBeforeUnmount,
  type PropType,
  type CSSProperties,
} from "vue";
import type { MotionDoc } from "@blinn-motion/core";
import {
  attachBlinnMotion,
  type AttachedBlinnMotion,
  type BlinnMotionHandle,
  type BlinnMotionRenderer,
} from "./attach.js";

export type { BlinnMotionHandle, BlinnMotionRenderer };

/**
 * `<BlinnMotion :doc="doc" />` — plays a MotionDoc through the DOM or Canvas backend.
 * Drive externally with `:progress="0…1"` or control via template ref.
 */
export const BlinnMotion = defineComponent({
  name: "BlinnMotion",
  props: {
    doc: { type: Object as PropType<MotionDoc>, required: true },
    renderer: { type: String as PropType<BlinnMotionRenderer>, default: "dom" },
    loop: { type: Boolean, default: true },
    autoplay: { type: Boolean, default: true },
    rate: { type: Number, default: 1 },
    progress: { type: Number as PropType<number | undefined>, default: undefined },
    onFrame: { type: Function as PropType<(time: number, fraction: number) => void>, default: undefined },
    className: { type: String, default: undefined },
    style: { type: Object as PropType<CSSProperties>, default: undefined },
  },
  setup(props, { expose }) {
    const hostRef = ref<HTMLElement | null>(null);
    let attached: AttachedBlinnMotion | null = null;

    const remount = () => {
      attached?.dispose();
      attached = null;
      const host = hostRef.value;
      if (!host) return;
      attached = attachBlinnMotion(host, {
        doc: props.doc,
        renderer: props.renderer,
        loop: props.loop,
        autoplay: props.autoplay,
        rate: props.rate,
        progress: props.progress,
        onFrame: props.onFrame,
      });
    };

    onMounted(remount);
    onBeforeUnmount(() => {
      attached?.dispose();
      attached = null;
    });

    watch(
      () => [props.doc, props.renderer, props.loop, props.rate, props.autoplay, props.progress == null] as const,
      () => remount(),
    );

    watch(
      () => props.progress,
      (p) => {
        if (p != null) attached?.setControlledProgress(p);
      },
    );

    watch(
      () => props.onFrame,
      (fn) => attached?.setOnFrame(fn),
    );

    const handle: BlinnMotionHandle = {
      play: () => attached?.play(),
      pause: () => attached?.pause(),
      stop: () => attached?.stop(),
      toggle: () => attached?.toggle(),
      seek: (t) => attached?.seek(t),
      seekFraction: (f) => attached?.seekFraction(f),
      setProgress: (p) => attached?.setProgress(p),
      setRate: (r) => attached?.setRate(r),
      get player() {
        return attached?.player ?? null;
      },
      get duration() {
        return attached?.duration ?? 0;
      },
      get time() {
        return attached?.time ?? 0;
      },
      get isPlaying() {
        return attached?.isPlaying ?? false;
      },
    };

    expose(handle);

    return () =>
      h("div", {
        ref: hostRef,
        class: props.className,
        style: props.style,
      });
  },
});
