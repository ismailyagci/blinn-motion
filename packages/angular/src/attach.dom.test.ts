// @vitest-environment jsdom
import { describe, it, expect, beforeAll, afterEach } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import type { MotionDoc } from "@blinn-motion/core";
import { attachBlinnMotion } from "./attach.js";
// Import the component module to ensure the shipped Angular entry compiles/loads
import { BlinnMotionComponent } from "./blinn-motion.component.js";

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

describe("attachBlinnMotion (angular package)", () => {
  it("mount → play → seek → setProgress → dispose on fixture", () => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const handle = attachBlinnMotion(host, { doc, renderer: "dom", autoplay: false });
    expect(handle.duration).toBe(doc.duration);
    handle.play();
    handle.seek(0.5);
    handle.setProgress(0.3);
    handle.toggle();
    handle.pause();
    handle.setRate(2);
    handle.seekFraction(1);
    const card = host.querySelector('[data-id="card"]') as HTMLElement;
    expect(card.style.transform).toContain("scale(1,1)");
    handle.stop();
    handle.dispose();
    expect(host.innerHTML).toBe("");
  });

  it("exports BlinnMotionComponent class as the Angular binding", () => {
    expect(BlinnMotionComponent).toBeTypeOf("function");
    // Decorator metadata leaves ɵcmp on Angular components when compiled with Angular;
    // at minimum the class is constructable for attach-style usage via its public API shape.
    expect(typeof BlinnMotionComponent.prototype.play).toBe("function");
    expect(typeof BlinnMotionComponent.prototype.seek).toBe("function");
    expect(typeof BlinnMotionComponent.prototype.setProgress).toBe("function");
  });

  it("canvas backend mounts canvas element", () => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const handle = attachBlinnMotion(host, { doc, renderer: "canvas", autoplay: false });
    expect(host.querySelector("canvas")).not.toBeNull();
    handle.dispose();
  });
});
