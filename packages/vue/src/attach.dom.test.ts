// @vitest-environment jsdom
import { describe, it, expect, beforeAll, afterEach } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import type { MotionDoc } from "@blinn-motion/core";
import { attachBlinnMotion } from "./attach.js";
import { BlinnMotion } from "./BlinnMotion.js";
import { createApp, nextTick, ref } from "vue";

const here = dirname(fileURLToPath(import.meta.url));
const doc = JSON.parse(readFileSync(join(here, "../../../fixtures/card.motion.json"), "utf8")) as MotionDoc;

beforeAll(() => {
  (HTMLCanvasElement.prototype as unknown as { getContext: () => unknown }).getContext = () =>
    new Proxy(
      {},
      {
        get(_t, prop: string) {
          if (prop === "canvas") return undefined;
          return (..._a: unknown[]) => {
            if (prop === "createLinearGradient" || prop === "createRadialGradient" || prop === "createConicGradient")
              return { addColorStop() {} };
            return undefined;
          };
        },
        set() {
          return true;
        },
      },
    );
});

afterEach(() => {
  document.body.innerHTML = "";
});

describe("attachBlinnMotion (vue package)", () => {
  it("mounts, seeks, setProgress, and disposes via the shipped entry", () => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const handle = attachBlinnMotion(host, { doc, renderer: "dom", autoplay: false });
    expect(handle.player).not.toBeNull();
    expect(handle.duration).toBeGreaterThan(0);
    handle.seek(0.5);
    handle.setProgress(0.25);
    handle.play();
    handle.pause();
    handle.toggle();
    handle.stop();
    handle.setRate(2);
    handle.seekFraction(1);
    const card = host.querySelector('[data-id="card"]') as HTMLElement;
    expect(card).not.toBeNull();
    expect(card.style.transform).toContain("scale(1,1)");
    handle.dispose();
    expect(host.innerHTML).toBe("");
  });

  it("renderer=canvas mounts a canvas", () => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const handle = attachBlinnMotion(host, { doc, renderer: "canvas", autoplay: false });
    expect(host.querySelector("canvas")).not.toBeNull();
    handle.dispose();
  });

  it("controlled progress disables autoplay and scrubs", () => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const handle = attachBlinnMotion(host, { doc, progress: 0 });
    expect(handle.isPlaying).toBe(false);
    const t0 = (host.querySelector('[data-id="card"]') as HTMLElement).style.transform;
    handle.setControlledProgress(1);
    const t1 = (host.querySelector('[data-id="card"]') as HTMLElement).style.transform;
    expect(t1).not.toBe(t0);
    handle.dispose();
  });
});

describe("<BlinnMotion/> Vue component", () => {
  it("mounts via createApp and exposes imperative handle", async () => {
    const root = document.createElement("div");
    document.body.appendChild(root);
    let exposed: { seekFraction: (f: number) => void; player: unknown } | null = null;
    const app = createApp({
      setup() {
        const motion = ref<typeof exposed>(null);
        return () => {
          // capture expose via ref callback pattern
          return null;
        };
      },
      render() {
        return null;
      },
    });
    // Mount BlinnMotion directly
    const hostApp = createApp(BlinnMotion, {
      doc,
      renderer: "dom",
      autoplay: false,
    });
    const vm = hostApp.mount(root) as unknown as {
      seekFraction: (f: number) => void;
      play: () => void;
      pause: () => void;
      setProgress: (p: number) => void;
      stop: () => void;
      player: unknown;
    };
    await nextTick();
    expect(root.querySelector("[data-id]")).not.toBeNull();
    vm.seekFraction(1);
    vm.play();
    vm.pause();
    vm.setProgress(0.5);
    vm.stop();
    expect(vm.player).not.toBeNull();
    hostApp.unmount();
    expect(document.querySelector("[data-id]")).toBeNull();
    void exposed;
    void app;
  });
});
