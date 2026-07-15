// @vitest-environment jsdom
import { describe, it, expect, beforeAll, afterEach } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import type { MotionDoc } from "@blinn-motion/core";
import { attachBlinnMotion } from "./attach.js";
import { blinnMotion, getBlinnHandle } from "./action.js";

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

describe("attachBlinnMotion (svelte package)", () => {
  it("mount → play → seek → setProgress → dispose", () => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const handle = attachBlinnMotion(host, { doc, autoplay: false });
    handle.play();
    handle.seek(0.4);
    handle.setProgress(0.6);
    handle.seekFraction(1);
    handle.pause();
    handle.stop();
    handle.setRate(1.5);
    expect(host.querySelector('[data-id="card"]')).not.toBeNull();
    handle.dispose();
    expect(host.innerHTML).toBe("");
  });
});

describe("blinnMotion action", () => {
  it("attaches via action API and exposes handle", () => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const action = blinnMotion(host, { doc, renderer: "dom", autoplay: false }) as {
      update?: (p: { doc: MotionDoc; renderer: "dom" | "canvas"; autoplay: boolean }) => void;
      destroy?: () => void;
    };
    const handle = getBlinnHandle(host);
    expect(handle).not.toBeNull();
    handle!.seekFraction(1);
    handle!.setProgress(0.5);
    handle!.play();
    handle!.pause();
    expect(host.querySelector("[data-id]")).not.toBeNull();

    action.update?.({ doc, renderer: "canvas", autoplay: false });
    expect(host.querySelector("canvas")).not.toBeNull();

    action.destroy?.();
    expect(getBlinnHandle(host)).toBeNull();
  });
});
